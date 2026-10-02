import { TrackSource } from 'livekit-server-sdk';
import { describe, expect, it } from 'vitest';

import { buildRoomGrant } from './livekit-grants';

describe('buildRoomGrant', () => {
  it('lets a normal user publish anything, including the microphone', () => {
    const grant = buildRoomGrant({ roomName: 'room-1', quiet: false });
    expect(grant).toMatchObject({ roomJoin: true, room: 'room-1', canPublish: true, canPublishData: true });
    expect(grant.canPublishSources).toBeUndefined();
  });

  it('refuses the microphone in Quiet mode but keeps camera, screen share and chat', () => {
    const grant = buildRoomGrant({ roomName: 'room-1', quiet: true });
    expect(grant.canPublishSources).toEqual([TrackSource.CAMERA, TrackSource.SCREEN_SHARE]);
    expect(grant.canPublishSources).not.toContain(TrackSource.MICROPHONE);
    expect(grant.canPublishData).toBe(true);
  });
});
