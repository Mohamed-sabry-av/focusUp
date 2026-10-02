import { TrackSource, type VideoGrant } from 'livekit-server-sdk';

/** Chat goes over the data channel, so everyone may publish data. */
export function buildRoomGrant(params: { roomName: string; quiet: boolean }): VideoGrant {
  const grant: VideoGrant = {
    roomJoin: true,
    room: params.roomName,
    canSubscribe: true,
    canPublish: true,
    canPublishData: true,
  };

  // Quiet mode means no talking: the server refuses the microphone, whatever the browser does.
  if (params.quiet) {
    grant.canPublishSources = [TrackSource.CAMERA, TrackSource.SCREEN_SHARE];
  }
  return grant;
}
