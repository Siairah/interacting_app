import type { CallMedia } from '@/types/webrtc';

function enableAllTracks(stream: MediaStream): MediaStream {
  stream.getTracks().forEach((t) => {
    t.enabled = true;
  });
  return stream;
}

/**
 * getUserMedia with fallbacks so video calls work on strict browsers (desktop Safari,
 * some Android WebViews, Firefox) that reject overly specific constraints.
 */
export async function acquireCallMediaStream(media: CallMedia): Promise<MediaStream> {
  if (media === 'audio') {
    try {
      return enableAllTracks(await navigator.mediaDevices.getUserMedia({ audio: true, video: false }));
    } catch {
      return enableAllTracks(await navigator.mediaDevices.getUserMedia({ audio: true }));
    }
  }

  const attempts: MediaStreamConstraints[] = [
    {
      audio: true,
      video: {
        facingMode: { ideal: 'user' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
    {
      audio: true,
      video: { facingMode: 'user' },
    },
    { audio: true, video: true },
  ];

  let last: unknown;
  for (const constraints of attempts) {
    try {
      return enableAllTracks(await navigator.mediaDevices.getUserMedia(constraints));
    } catch (e) {
      last = e;
    }
  }
  if (last instanceof Error) throw last;
  throw new Error(typeof last === 'string' ? last : 'Could not open camera/microphone');
}
