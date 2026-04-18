/**
 * ICE servers for WebRTC (voice/video calls).
 *
 * STUN is always included. For calls across strict NATs, different Wi‑Fi networks,
 * or mobile data, set TURN in `.env.local` and restart the dev server:
 *
 * NEXT_PUBLIC_TURN_URLS=turn:YOUR_HOST:3478,turn:YOUR_HOST:3478?transport=tcp
 * NEXT_PUBLIC_TURN_USERNAME=your-turn-user
 * NEXT_PUBLIC_TURN_CREDENTIAL=your-turn-password
 *
 * Use a hosted TURN (e.g. Twilio, Metered, Xirsys) or run coturn on a server with
 * a public IP — `localhost` TURN only helps if all peers can reach that machine.
 */
export function getRtcIceConfiguration(): RTCConfiguration {
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const turnUrlsRaw = process.env.NEXT_PUBLIC_TURN_URLS?.trim();
  const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME?.trim();
  const turnCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL?.trim();

  if (turnUrlsRaw && turnUser && turnCred) {
    const urls = turnUrlsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (urls.length) {
      iceServers.push({
        urls,
        username: turnUser,
        credential: turnCred,
      });
    }
  }

  return { iceServers };
}

/** Full RTCConfiguration for peer connections (bundle/mux help all browsers interop). */
export function getRtcPeerConnectionConfig(): RTCConfiguration {
  return {
    ...getRtcIceConfiguration(),
    iceCandidatePoolSize: 0,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceTransportPolicy: 'all',
  };
}
