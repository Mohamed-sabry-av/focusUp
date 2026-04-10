---
name: focusup-livekit
description: "FocusUp LiveKit video integration — room config, token generation, React SDK components, screen share. Use when building video rooms, configuring LiveKit, handling audio/video, or managing participant connections."
---

# FocusUp LiveKit Integration

## Environment Variables
```env
LIVEKIT_API_KEY=your_api_key         # Server-only
LIVEKIT_API_SECRET=your_api_secret   # Server-only
LIVEKIT_WS_URL=wss://your-project.livekit.cloud  # Client-safe (NEXT_PUBLIC_)
```

Add to `packages/env/src/server.ts`:
```typescript
LIVEKIT_API_KEY: z.string().min(1),
LIVEKIT_API_SECRET: z.string().min(1),
```
Add to `packages/env/src/web.ts`:
```typescript
NEXT_PUBLIC_LIVEKIT_URL: z.string().url(),
```

## Room Configuration (NEVER Modify)
```typescript
import { VideoPresets, type RoomOptions } from "livekit-client";

export const roomConfig: RoomOptions = {
  adaptiveStream: true,           // REQUIRED — never disable
  dynacast: true,                 // REQUIRED — never disable
  videoCaptureDefaults: {
    resolution: VideoPresets.h540.resolution,
  },
  publishDefaults: {
    videoEncoding: VideoPresets.h540.encoding,
    videoCodec: "vp9",
    dtx: true,                    // Discontinuous transmission for audio
  },
};
```

## Token Generation (Server-Side ONLY)

```typescript
// packages/api/src/services/livekit.ts
import { AccessToken } from "livekit-server-sdk";
import { env } from "@focusUp/env/server";

export function generateLiveKitToken(
  sessionId: string,
  userId: string,
  userName: string
): string {
  const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: userId,
    name: userName,
    ttl: 7200, // 2 hours (session length + buffer)
  });
  token.addGrant({
    roomJoin: true,
    room: sessionId,          // Room name = session.id (UUID)
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return token.toJwt();
}
```

### oRPC Token Endpoint
```typescript
// packages/api/src/routers/sessions.ts
getToken: protectedProcedure
  .input(z.object({ sessionId: z.string() }))
  .handler(async ({ input, context }) => {
    const session = await prisma.session.findUniqueOrThrow({
      where: { id: input.sessionId },
    });
    // Verify user is a participant
    if (session.user1Id !== context.user.sub && session.user2Id !== context.user.sub) {
      throw new ORPCError("FORBIDDEN", { message: "Not a participant" });
    }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: context.user.sub } });
    return { token: generateLiveKitToken(session.id, user.id, user.displayName) };
  }),
```

## Frontend Integration (Next.js)

### Session Room Component
```tsx
"use client";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { roomConfig } from "@/lib/livekit-config";

export function SessionRoom({ sessionId }: { sessionId: string }) {
  const { data: tokenData } = useQuery(
    orpc.sessions.getToken.queryOptions({ sessionId })
  );

  if (!tokenData) return <SessionLoader />;

  return (
    <LiveKitRoom
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      token={tokenData.token}
      options={roomConfig}
      onDisconnected={handleDisconnect}
    >
      <SessionUI sessionId={sessionId} />
    </LiveKitRoom>
  );
}
```

### Custom Session UI Layout
```tsx
"use client";
import {
  useParticipants,
  useTracks,
  useTrackToggle,
  TrackToggle,
  DisconnectButton,
} from "@livekit/components-react";
import { Track } from "livekit-client";

function SessionUI({ sessionId }: { sessionId: string }) {
  return (
    <div className="session-layout">
      {/* Partner video — main tile */}
      <div className="partner-video">
        <RemoteParticipantTile />
      </div>

      {/* Self video — bottom-right pip */}
      <div className="self-video">
        <LocalParticipantTile />
      </div>

      {/* Controls bar */}
      <div className="controls">
        <TrackToggle source={Track.Source.Microphone} />
        <TrackToggle source={Track.Source.Camera} />
        <ScreenShareButton />      {/* Opt-in only */}
        <SessionTimer duration={session.durationMin} />
        <ReportButton sessionId={sessionId} />
        <DisconnectButton />
      </div>
    </div>
  );
}
```

### Screen Share (Always Opt-In)
```typescript
// NEVER auto-start screen share
const startScreenShare = async () => {
  await localParticipant.setScreenShareEnabled(true, {
    audio: true,
    selfBrowserSurface: "exclude",
  });
};
```

## Reconnection Logic
```typescript
function handleDisconnect() {
  // Attempt reconnect ONCE before marking session ended
  if (!hasAttemptedReconnect) {
    setHasAttemptedReconnect(true);
    // LiveKit handles auto-reconnect internally
    // If reconnect fails within 2 min, mark session ended
    setTimeout(() => {
      if (!isConnected) {
        endSession();
      }
    }, 2 * 60 * 1000);
  } else {
    endSession();
  }
}
```

## Hard Rules
- NEVER generate tokens on the client — always server-side
- NEVER store tokens in localStorage — in-memory only
- Room name = `session.id` (UUID) — NEVER user IDs
- Token TTL: 2 hours (session + buffer)
- `adaptiveStream: true` and `dynacast: true` — NEVER disable
- Screen share: ALWAYS opt-in per session, NEVER auto-start
- Reconnect once before marking ended — 2-min grace period
- Wrap LiveKit components in `"use client"` boundary
- Use `dynamic(() => import(...), { ssr: false })` for LiveKit components in Next.js
