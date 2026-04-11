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
import { Track } from 'livekit-client';
import '@livekit/components-styles';

import { SessionTimer } from '@/components/session/SessionTimer';
import { ReflectionModal } from '@/components/session/ReflectionModal';
import { cn } from '@focusUp/ui/lib/utils';
import { Mic, MicOff, Video, VideoOff, Settings, X, HelpCircle, LogOut, Grid, Maximize, MessageSquare, MonitorUp, Star } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

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
    } catch {}
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <h2 className="mb-2 text-xl font-bold text-slate-800">
          What&apos;s your focus goal for this session?
        </h2>
        <p className="mb-5 text-sm font-medium text-slate-500">
          Setting a goal helps you stay focused and accountable.
        </p>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value.slice(0, 200))}
          placeholder="e.g., Finish the API endpoints for user sessions..."
          className="w-full resize-none rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#4A55C8] focus:bg-white"
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
          <span className="text-xs font-semibold text-slate-400">{goal.length}/200</span>
          <span className="tabular-nums text-xs font-bold text-slate-400">
            Auto-dismiss in {countdown}s
          </span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!goal.trim() || submitting}
          className="mt-6 w-full rounded-xl bg-[#4A55C8] px-4 py-3.5 text-sm font-bold tracking-wide text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Setting...' : 'Set Goal'}
        </button>
      </div>
    </div>
  );
}

// ── Session UI ───────────────────────────────────────────────────

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

  useEffect(() => {
    fetch(`${API_URL}/api/v1/sessions/join/${sessionId}`, {
      method: 'PATCH',
      credentials: 'include',
    }).catch(console.error);
  }, [sessionId]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/sessions/status/${sessionId}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const { data } = await res.json();
          setSessionData(data.session);
        }
      } catch {}
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0b1219] text-white selection:bg-[#0245a3] font-sans">
      {/* Notice Banner */}
      {myGoal || partnerGoal ? (
        <div className="relative z-50 flex items-center justify-center gap-2 bg-[#414199] px-4 py-1.5 text-center text-xs font-medium text-white shadow-sm">
          {myGoal && <span>🎯 Your goal: {myGoal}</span>}
          {myGoal && partnerGoal && <span className="mx-2 opacity-50">|</span>}
          {partnerGoal && <span>🤝 Partner: {partnerGoal}</span>}
        </div>
      ) : null}

      <div className="relative flex flex-1 overflow-hidden lg:grid lg:grid-cols-[240px_1fr_240px] xl:grid-cols-[280px_1fr_280px]">
        {/* ── Left Column (Self View & Info) ── */}
        <aside className="z-20 hidden flex-col gap-6 bg-[#0b1219] p-4 lg:flex border-r border-white/5">
          {/* Partner Info Box */}
          <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-lg">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-200">
              <img src="https://i.pravatar.cc/150?u=partner" alt="Partner" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="truncate text-sm font-bold text-slate-900">Partner</span>
                <Star className="h-4 w-4 text-slate-300" />
              </div>
              <p className="text-[11px] font-semibold text-slate-500">CoFocus Session</p>
            </div>
          </div>
          
          {/* Status */}
          <div className="flex items-center gap-2 px-1 text-white/80">
            <Settings className="h-[18px] w-[18px]" />
            <span className="text-xs font-semibold">{remoteParticipants.length + 1} people in call</span>
          </div>

          {/* Self View (PIP) */}
          <div className="group relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black/50 shadow-md">
            {localCameraTrack?.publication?.track ? (
              <VideoTrack trackRef={localCameraTrack} className="h-full w-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-xs font-medium text-zinc-500">
                Camera off
              </div>
            )}
            <button className="absolute left-1.5 top-1.5 rounded-md bg-black/40 p-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Maximize className="h-3.5 w-3.5 text-white" />
            </button>
            <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
              {isMicOn ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3 text-red-400" />}
              <span>You</span>
            </div>
          </div>
        </aside>

        {/* ── Middle Column (Partner View) ── */}
        <main className="flex flex-1 items-center justify-center bg-[#0b1219] p-4">
          <div className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-[20px] bg-black shadow-2xl ring-1 ring-white/5">
            {remoteCameraTracks.length > 0 ? (
              <VideoTrack trackRef={remoteCameraTracks[0]} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-zinc-900 text-zinc-500">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800 shadow-inner">
                  <VideoOff className="h-8 w-8 text-zinc-600" />
                </div>
                <p className="text-sm font-semibold tracking-wide text-zinc-400">
                  {remoteParticipants.length === 0 ? 'Waiting for partner...' : "Partner's camera is off"}
                </p>
              </div>
            )}
            
            {/* Mobile overlays when columns are hidden */}
            <div className="absolute bottom-4 right-4 lg:hidden">
               <div className="aspect-video w-24 overflow-hidden rounded-lg border-2 border-white/20 bg-black/50 shadow-lg">
                  {localCameraTrack?.publication?.track ? <VideoTrack trackRef={localCameraTrack} className="h-full w-full object-cover" style={{ transform: 'scaleX(-1)' }} /> : null}
               </div>
            </div>
            {sessionData && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-4 py-1.5 font-mono text-sm font-bold tracking-widest text-white backdrop-blur-md lg:hidden">
                 <SessionTimer durationMin={sessionData.durationMin} startedAt={sessionData.startedAt} onTimeUp={completeSession} />
              </div>
            )}
          </div>
        </main>

        {/* ── Right Column (Timer & Chat) ── */}
        <aside className="z-20 hidden flex-col bg-[#0b1219] lg:flex border-l border-white/5">
          {/* Header Controls */}
          <div className="flex flex-col gap-4 p-4">
            <div className="flex h-16 items-stretch overflow-hidden rounded-xl bg-white shadow-lg">
              <div className="flex flex-1 flex-col items-center justify-center border-r border-slate-100 bg-slate-50 px-2 text-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Time Left</span>
                {sessionData ? (
                  <div className="text-xl font-black tabular-nums tracking-tight">
                    <SessionTimer durationMin={sessionData.durationMin} startedAt={sessionData.startedAt} onTimeUp={completeSession} />
                  </div>
                ) : (
                  <span className="text-xl font-black tabular-nums tracking-tight text-slate-300">--:--</span>
                )}
              </div>
              <button className="group flex flex-col items-center justify-center px-4 transition-colors hover:bg-slate-50">
                <HelpCircle className="mb-0.5 h-5 w-5 text-[#4A55C8] transition-transform group-hover:scale-110" />
                <span className="text-[10px] font-bold text-[#4A55C8]">Help</span>
              </button>
              <button onClick={leaveSession} className="group flex flex-col items-center justify-center border-l border-slate-100 px-4 transition-colors hover:bg-red-50">
                <LogOut className="mb-0.5 h-5 w-5 text-red-500 transition-transform group-hover:scale-110" />
                <span className="text-[10px] font-bold text-red-500">Leave</span>
              </button>
            </div>
            
            <div className="flex items-center justify-end gap-3 text-white/60 mt-1">
              <span className="text-[10px] font-bold uppercase tracking-widest">Speaker View</span>
              <div className="flex rounded-lg bg-white/10 p-1">
                <button className="rounded bg-[#4A55C8] p-1.5 text-white shadow-sm"><MaximizedIcon /></button>
                <button className="p-1.5 transition-colors hover:text-white"><Grid className="h-[14px] w-[14px]" /></button>
              </div>
            </div>
          </div>

          {/* Chat Section */}
          <div className="mx-4 mb-4 flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-between border-b border-white/10 p-4 bg-white/5">
              <span className="text-xs font-bold text-white tracking-widest uppercase">Chat</span>
              <ChevronDownIcon className="h-4 w-4 text-white/40" />
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4 custom-scrollbar">
               {/* Empty state for realism */}
               <div className="flex h-full flex-col items-center justify-center opacity-40">
                  <MessageSquare className="h-8 w-8 mb-2" />
                  <span className="text-xs font-semibold">No messages yet</span>
               </div>
            </div>
            <div className="p-3 border-t border-white/5 bg-white/5">
              <div className="flex items-center rounded-xl bg-black/40 px-3 py-2 border border-white/10 focus-within:border-[#4A55C8] transition-colors">
                <input type="text" placeholder="Type a message..." className="w-full bg-transparent p-0 text-xs font-medium text-white placeholder-white/40 outline-none border-none focus:ring-0" />
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Bottom Navigation Bar ── */}
      <nav className="relative z-50 flex h-[88px] shrink-0 items-center justify-center border-t border-white/5 bg-[#0b1219]">
        <div className="flex items-center gap-8 md:gap-12">
          {/* Vid */}
          <button onClick={toggleCam} className="group flex flex-col items-center transition-transform hover:scale-105 active:scale-95">
            <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl transition-all shadow-sm", isCamOn ? "bg-zinc-800 text-white group-hover:bg-zinc-700" : "bg-red-500 text-white group-hover:bg-red-400")}>
              {isCamOn ? <Video className="h-[22px] w-[22px]" /> : <VideoOff className="h-[22px] w-[22px]" /> }
            </div>
            <span className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-white/60 group-hover:text-white">
              {isCamOn ? 'Turn off' : 'Turn on'}
            </span>
          </button>
          
          {/* Mic */}
          <button onClick={toggleMic} className="group flex flex-col items-center transition-transform hover:scale-105 active:scale-95">
            <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl transition-all shadow-sm", isMicOn ? "bg-zinc-800 text-white group-hover:bg-zinc-700" : "bg-red-500 text-white group-hover:bg-red-400")}>
               {isMicOn ? <Mic className="h-[22px] w-[22px]" /> : <MicOff className="h-[22px] w-[22px]" /> }
            </div>
            <span className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-white/60 group-hover:text-white">
              {isMicOn ? 'Mute' : 'Unmute'}
            </span>
          </button>
          
          {/* Chat (Mobile only toggle) - just visual */}
          <button className="group flex flex-col items-center transition-transform lg:hidden hover:scale-105 active:scale-95">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-white transition-colors group-hover:bg-zinc-700 shadow-sm">
               <MessageSquare className="h-[20px] w-[20px]" />
            </div>
            <span className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-white">Chat</span>
          </button>

          {/* Share */}
          <button className="group flex flex-col items-center transition-transform hover:scale-105 active:scale-95">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-white/70 transition-colors group-hover:bg-zinc-700 group-hover:text-white shadow-sm">
               <MonitorUp className="h-[20px] w-[20px]" />
            </div>
            <span className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-white/60 group-hover:text-white">Share</span>
          </button>
          
          {/* Leave (Mobile only) */}
          <button onClick={leaveSession} className="group flex flex-col items-center transition-transform lg:hidden hover:scale-105 active:scale-95">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500 text-white transition-colors group-hover:bg-red-600 shadow-sm">
               <LogOut className="h-[20px] w-[20px]" />
            </div>
            <span className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-red-500">Leave</span>
          </button>
        </div>
        
        {/* Right Nav */}
        <div className="absolute right-8 hidden items-center md:flex">
          <button className="rounded-xl p-3 text-white/60 transition-colors hover:bg-white/10 hover:text-white">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Audio & Modals */}
      <RoomAudioRenderer />
      {showGoalModal && !showReflection && (
        <GoalModal sessionId={sessionId} onGoalSet={(g) => { setMyGoal(g); setShowGoalModal(false); }} onDismiss={() => setShowGoalModal(false)} />
      )}
      {showReflection && (
        <ReflectionModal sessionId={sessionId} onSaveConfig={saveReflection} onSkip={() => router.push('/dashboard')} onSaveSuccess={() => router.push('/dashboard')} />
      )}
      
      {/* Scrollbar style */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}

function SessionRoom({ sessionId }: { sessionId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/sessions/token/${sessionId}`, { credentials: 'include' });
        if (!res.ok) {
          const data = await res.json();
          if (res.status === 401) return router.push('/login');
          setError(data.error || 'Failed to join session');
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

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-5 bg-[#0b1219] text-white">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20 shadow-lg shadow-red-500/10">
          <X className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">{error}</h2>
        <button onClick={() => router.push('/dashboard')} className="mt-2 rounded-xl bg-white px-6 py-3 font-bold text-slate-900 transition-all hover:bg-slate-200 active:scale-95">
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-5 bg-[#0b1219] text-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-[#4A55C8] shadow-lg shadow-[#4A55C8]/20" />
        <p className="font-semibold text-white/60 tracking-wider uppercase text-sm">Connecting...</p>
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
      {isReconnecting && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-[#0b1219]/90 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-[#4A55C8]" />
            <p className="font-bold text-white tracking-widest uppercase">Reconnecting...</p>
          </div>
        </div>
      )}
    </LiveKitRoom>
  );
}

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string;
  return (
    <div className="h-svh w-full overflow-hidden bg-[#0b1219] animate-in fade-in duration-500">
      <SessionRoom sessionId={sessionId} />
    </div>
  );
}

// Helpers for icons
const MaximizedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
);
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
);
