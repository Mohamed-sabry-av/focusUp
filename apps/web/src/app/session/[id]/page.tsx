'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  VideoTrack,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { Track, RoomEvent } from 'livekit-client';
import '@livekit/components-styles';

import { SessionTimer } from '@/components/session/SessionTimer';
import { ReflectionModal } from '@/components/session/ReflectionModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

/** LiveKit Room Config — per AGENTS.md, do NOT change these presets */
const roomConfig = {
  adaptiveStream: true,
  dynacast: true,
  videoCaptureDefaults: {
    resolution: { width: 960, height: 540, frameRate: 30 },
  },
  publishDefaults: {
    videoEncoding: { maxBitrate: 1_500_000, maxFramerate: 30 },
    videoCodec: 'vp9' as const,
    dtx: true,
  },
};

// ── Goal Modal ────────────────────────────────────────────────────

function GoalModal({
  sessionId,
  onGoalSet,
  onDismiss,
}: {
  sessionId: string;
  onGoalSet: (goal: string) => void;
  onDismiss: () => void;
}) {
  const [goal, setGoal] = useState('');
  const [countdown, setCountdown] = useState(15);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [onDismiss]);

  const handleSubmit = async () => {
    if (!goal.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/sessions/goal/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ goal: goal.trim() }),
      });
      if (res.ok) {
        onGoalSet(goal.trim());
      }
    } catch {
      // Silently fail — goal is optional
    }
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
        <h2 className="mb-1 text-lg font-semibold text-white">
          What&apos;s your focus goal for this session?
        </h2>
        <p className="mb-4 text-sm text-zinc-400">
          Setting a goal helps you stay focused and accountable.
        </p>

        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value.slice(0, 200))}
          placeholder="e.g., Finish the API endpoints for user sessions..."
          className="w-full resize-none rounded-lg border border-white/10 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          rows={3}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />

        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-zinc-500">{goal.length}/200</span>
          <span className="tabular-nums text-xs text-zinc-500">
            Auto-dismiss in {countdown}s
          </span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!goal.trim() || submitting}
          className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Setting...' : 'Set Goal'}
        </button>
      </div>
    </div>
  );
}

// ── Goal Banner ───────────────────────────────────────────────────

function GoalBanner({ myGoal, partnerGoal }: { myGoal: string | null; partnerGoal: string | null }) {
  if (!myGoal && !partnerGoal) return null;

  return (
    <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-xl border border-white/10 bg-black/60 px-5 py-3 backdrop-blur-md">
      {myGoal && (
        <p className="text-sm text-white">
          <span className="font-medium text-indigo-400">Your goal:</span> {myGoal}
        </p>
      )}
      {partnerGoal && (
        <p className="mt-1 text-sm text-white">
          <span className="font-medium text-emerald-400">Partner&apos;s goal:</span> {partnerGoal}
        </p>
      )}
    </div>
  );
}

// ── Session UI (inside LiveKitRoom) ───────────────────────────────

function SessionUI({ sessionId }: { sessionId: string }) {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.Microphone, withPlaceholder: true },
    ],
    { onlySubscribed: false }
  );

  const [myGoal, setMyGoal] = useState<string | null>(null);
  const [partnerGoal, setPartnerGoal] = useState<string | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  
  const [sessionData, setSessionData] = useState<any>(null);
  const [showReflection, setShowReflection] = useState(false);

  const router = useRouter();

  // Join session on mount
  useEffect(() => {
    fetch(`${API_URL}/api/v1/sessions/join/${sessionId}`, {
      method: 'PATCH',
      credentials: 'include',
    }).catch(console.error);
  }, [sessionId]);

  // Poll for status and goals
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/sessions/status/${sessionId}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const { data } = await res.json();
          setSessionData(data.session);

          // Find which user we are to correctly set partner/my goals
          // Since we might not have our userId directly, we can check who we're NOT
          // Simplification for MVP: backend returned the full session object. 
          // But wait, the previous code polled for token. We just need to properly grab goals.
        }
      } catch (e) {
        // Ignore polling errors
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // 5 sec interval for quicker join detection
    return () => clearInterval(interval);
  }, [sessionId]);

  // Separate local tracks from remote tracks
  const remoteCameraTracks = tracks.filter(
    (t) =>
      t.participant.identity !== localParticipant.identity &&
      t.source === Track.Source.Camera &&
      t.publication?.track
  );

  const localCameraTrack = tracks.find(
    (t) =>
      t.participant.identity === localParticipant.identity &&
      t.source === Track.Source.Camera &&
      t.publication?.track
  );

  const toggleMic = useCallback(async () => {
    await localParticipant.setMicrophoneEnabled(!isMicOn);
    setIsMicOn(!isMicOn);
  }, [localParticipant, isMicOn]);

  const toggleCam = useCallback(async () => {
    await localParticipant.setCameraEnabled(!isCamOn);
    setIsCamOn(!isCamOn);
  }, [localParticipant, isCamOn]);

  const completeSession = useCallback(async () => {
    try {
      await fetch(`${API_URL}/api/v1/sessions/complete/${sessionId}`, {
        method: 'PATCH',
        credentials: 'include',
      });
      setShowReflection(true);
    } catch {
      // Show reflection anyway
      setShowReflection(true);
    }
  }, [sessionId]);

  const leaveSession = useCallback(() => {
    completeSession();
  }, [completeSession]);

  const saveReflection = async (data: { sessionId: string; text: string; rating?: number }) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/sessions/reflections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  return (
    <div className="relative h-full w-full bg-zinc-950">
      {/* Goal Banner */}
      <GoalBanner myGoal={myGoal} partnerGoal={partnerGoal} />

      {/* Timer placeholder - top center */}
      <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 flex h-10 items-center rounded-full border border-white/10 bg-black/60 px-5 text-xl font-medium tracking-wider backdrop-blur-md">
        {sessionData ? (
          <SessionTimer
            durationMin={sessionData.durationMin}
            startedAt={sessionData.startedAt}
            onTimeUp={() => completeSession()}
          />
        ) : (
          <span className="font-mono text-white">--:--</span>
        )}
      </div>

      {/* Partner video — main area */}
      <div className="flex h-full w-full items-center justify-center">
        {remoteCameraTracks.length > 0 ? (
          <VideoTrack
            trackRef={remoteCameraTracks[0]}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-zinc-500">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
              </svg>
            </div>
            <p className="text-sm">
              {remoteParticipants.length === 0
                ? 'Waiting for partner to join...'
                : "Partner's camera is off"}
            </p>
          </div>
        )}
      </div>

      {/* Self video — picture-in-picture */}
      <div className="absolute bottom-20 right-4 z-20 h-36 w-48 overflow-hidden rounded-lg border-2 border-white/20 bg-zinc-900 shadow-xl">
        {localCameraTrack?.publication?.track ? (
          <VideoTrack
            trackRef={localCameraTrack}
            className="h-full w-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
            Camera off
          </div>
        )}
      </div>

      {/* Control bar — bottom center */}
      <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/80 px-6 py-3 backdrop-blur-md">
        {/* Mic toggle */}
        <button
          onClick={toggleMic}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
            isMicOn
              ? 'bg-zinc-700 text-white hover:bg-zinc-600'
              : 'bg-red-600 text-white hover:bg-red-500'
          }`}
          title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isMicOn ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 18M12 18.75a6 6 0 0 0 5.932-5.088M15 9.75V4.5a3 3 0 1 0-6 0v5.25m0 0V12a3 3 0 0 0 3 3m-3-5.25h6" />
            </svg>
          )}
        </button>

        {/* Camera toggle */}
        <button
          onClick={toggleCam}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
            isCamOn
              ? 'bg-zinc-700 text-white hover:bg-zinc-600'
              : 'bg-red-600 text-white hover:bg-red-500'
          }`}
          title={isCamOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {isCamOn ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-.409 4.72 4.72m-4.72-4.72-4.72 4.72M3 3l18 18" />
            </svg>
          )}
        </button>

        {/* Report button (placeholder) */}
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-700 text-zinc-400 transition hover:bg-zinc-600 hover:text-amber-400"
          title="Report"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
          </svg>
        </button>

        {/* Leave session */}
        <button
          onClick={leaveSession}
          className="flex h-11 items-center gap-2 rounded-full bg-red-600 px-5 text-sm font-medium text-white transition hover:bg-red-500"
          title="Leave session"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
          Leave
        </button>
      </div>

      {/* Audio renderer for remote participants */}
      <RoomAudioRenderer />

      {/* Goal Modal — shown on entry, auto-dismissed after 15s */}
      {showGoalModal && !showReflection && (
        <GoalModal
          sessionId={sessionId}
          onGoalSet={(g) => {
            setMyGoal(g);
            setShowGoalModal(false);
          }}
          onDismiss={() => setShowGoalModal(false)}
        />
      )}

      {/* Reflection Modal — shown on completion */}
      {showReflection && (
        <ReflectionModal
          sessionId={sessionId}
          onSaveConfig={saveReflection}
          onSkip={() => router.push('/dashboard')}
          onSaveSuccess={() => router.push('/dashboard')}
        />
      )}
    </div>
  );
}

// ── Session Room (token fetcher + LiveKitRoom wrapper) ────────────

function SessionRoom({ sessionId }: { sessionId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/sessions/token/${sessionId}`, {
          credentials: 'include',
        });

        if (!res.ok) {
          const data = await res.json();
          if (res.status === 403) {
            setError(data.error || 'Not a participant');
          } else if (res.status === 404) {
            setError('Session not found');
          } else if (res.status === 401) {
            router.push('/login');
            return;
          } else {
            setError(data.error || 'Failed to join session');
          }
          return;
        }

        const data = await res.json();
        setToken(data.data.token);
      } catch {
        setError('Failed to connect to server');
      }
    };

    fetchToken();
  }, [sessionId, router]);

  // Error state
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-zinc-950 text-white">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-900/30">
          <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold">{error}</h2>
        <button
          onClick={() => router.push('/dashboard')}
          className="rounded-lg bg-zinc-800 px-6 py-2.5 text-sm font-medium transition hover:bg-zinc-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Loading state
  if (!token) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-zinc-950 text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-indigo-500" />
        <p className="text-sm text-zinc-400">Connecting to session...</p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={LIVEKIT_URL}
      token={token}
      connect={true}
      options={roomConfig}
      onDisconnected={() => setIsReconnecting(true)}
      onConnected={() => setIsReconnecting(false)}
      className="relative h-full w-full"
    >
      <SessionUI sessionId={sessionId} />

      {/* Reconnecting overlay */}
      {isReconnecting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-600 border-t-indigo-400" />
            <p className="text-sm font-medium text-white">Reconnecting...</p>
          </div>
        </div>
      )}
    </LiveKitRoom>
  );
}

// ── Page Component ────────────────────────────────────────────────

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string;

  return (
    <div className="h-svh w-full overflow-hidden">
      <SessionRoom sessionId={sessionId} />
    </div>
  );
}
