'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket, initSocketAuth } from '@/utils/socketAuth';
import type { CallMedia, CallLogEvent, WebRTCSignal } from '@/types/webrtc';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export type CallUiState =
  | 'idle'
  | 'outgoing'
  | 'incoming'
  | 'connecting'
  | 'active'
  | 'ended';

function normId(id: string | null | undefined): string {
  if (id == null) return '';
  return String(id).trim();
}

function newCallId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `call_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function useWebRTCCall(
  chatRoomId: string | null,
  selfUserId: string,
  peerUserId: string | null,
  enabled: boolean,
  options?: {
    onCallLog?: (event: CallLogEvent) => void | Promise<void>;
    /** When callee had another chat open, parent queues the offer here after switching rooms. */
    pendingOffer?: WebRTCSignal | null;
    onPendingOfferConsumed?: () => void;
  }
) {
  const [uiState, setUiState] = useState<CallUiState>('idle');
  const [incomingMedia, setIncomingMedia] = useState<CallMedia | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callIdRef = useRef<string | null>(null);
  const roleRef = useRef<'caller' | 'callee' | null>(null);
  const pendingOfferRef = useRef<WebRTCSignal | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const uiStateRef = useRef<CallUiState>(uiState);
  const callConnectedAtRef = useRef<number | null>(null);
  const callerUserIdRef = useRef<string | null>(null);
  const lastCallMediaRef = useRef<CallMedia | null>(null);
  const onCallLogRef = useRef(options?.onCallLog);

  useEffect(() => {
    uiStateRef.current = uiState;
  }, [uiState]);

  useEffect(() => {
    onCallLogRef.current = options?.onCallLog;
  }, [options?.onCallLog]);

  const pendingOfferConsumedRef = useRef<string | null>(null);

  const emitSignal = useCallback((payload: WebRTCSignal) => {
    let socket = getSocket();
    if (!socket) {
      socket = initSocketAuth();
    }
    if (!socket) return;
    const fire = () => {
      socket?.emit('webrtc_signal', payload);
    };
    if (socket.connected) {
      fire();
    } else {
      socket.once('connect', fire);
    }
  }, []);

  const cleanupMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    pendingIceRef.current = [];
    pendingOfferRef.current = null;
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    callIdRef.current = null;
    roleRef.current = null;
    callerUserIdRef.current = null;
    lastCallMediaRef.current = null;
    callConnectedAtRef.current = null;
    pendingOfferConsumedRef.current = null;
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  const endCall = useCallback(
    (notifyPeer: boolean) => {
      const id = callIdRef.current;
      const peer = peerUserId;
      const wasActive = uiStateRef.current === 'active';
      const wasOutgoing = uiStateRef.current === 'outgoing';

      let durationSec = 0;
      if (wasActive && callConnectedAtRef.current) {
        durationSec = Math.max(0, Math.round((Date.now() - callConnectedAtRef.current) / 1000));
      }

      if (notifyPeer && id && peer && selfUserId) {
        emitSignal({ type: 'end', callId: id, from: selfUserId, to: peer });
      }

      const log = onCallLogRef.current;
      if (log) {
        const media = lastCallMediaRef.current || 'audio';
        const callerId = callerUserIdRef.current || selfUserId;
        if (wasActive) {
          void log({ kind: 'answered', durationSec, senderId: callerId, media });
        } else if (wasOutgoing) {
          void log({ kind: 'cancelled', senderId: selfUserId, media });
        }
      }

      cleanupMedia();
      setUiState('ended');
      setIncomingMedia(null);
      setTimeout(() => setUiState('idle'), 400);
    },
    [cleanupMedia, emitSignal, peerUserId, selfUserId]
  );

  const flushPendingIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;
    while (pendingIceRef.current.length) {
      const c = pendingIceRef.current.shift();
      if (!c) break;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const onIceCandidate = useCallback(
    (e: RTCPeerConnectionIceEvent) => {
      if (!e.candidate || !callIdRef.current || !peerUserId) return;
      emitSignal({
        type: 'ice',
        callId: callIdRef.current,
        from: selfUserId,
        to: peerUserId,
        candidate: e.candidate.toJSON(),
      });
    },
    [emitSignal, peerUserId, selfUserId]
  );

  const bindRemoteTracks = useCallback((pc: RTCPeerConnection) => {
    pc.ontrack = (ev) => {
      // Some browsers fire ontrack with ev.streams[0] empty.
      let incoming: MediaStream | null = ev.streams[0] ?? null;
      if (!incoming && ev.track) {
        incoming = new MediaStream();
        incoming.addTrack(ev.track);
      }
      if (!incoming) return;
      const mergeIn = () => {
        setRemoteStream((prev) => {
          if (!prev) return incoming as MediaStream;
          const merged = new MediaStream();
          const byKind = new Map<string, MediaStreamTrack>();
          for (const t of [...prev.getTracks(), ...incoming!.getTracks()]) {
            byKind.set(t.kind, t);
          }
          byKind.forEach((t) => merged.addTrack(t));
          return merged;
        });
      };
      mergeIn();
      ev.track.addEventListener('unmute', mergeIn);
    };
  }, []);

  /** Caller: add local tracks, then createOffer. */
  const attachPeerCaller = useCallback(
    (stream: MediaStream) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      bindRemoteTracks(pc);
      pc.onicecandidate = onIceCandidate;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    },
    [bindRemoteTracks, onIceCandidate]
  );

  const startCall = useCallback(
    async (media: CallMedia) => {
      if (!enabled || !chatRoomId || !peerUserId) return;
      setError(null);
      lastCallMediaRef.current = media;
      callerUserIdRef.current = selfUserId;
      try {
        const sock = getSocket() ?? initSocketAuth();
        if (sock && !sock.connected) {
          await new Promise<void>((resolve) => {
            sock.once('connect', () => resolve());
          });
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: media === 'video',
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        const callId = newCallId();
        callIdRef.current = callId;
        roleRef.current = 'caller';
        attachPeerCaller(stream);
        const pc = pcRef.current!;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        setUiState('outgoing');
        emitSignal({
          type: 'offer',
          callId,
          from: selfUserId,
          to: peerUserId,
          chatRoomId,
          media,
          sdp: { type: offer.type!, sdp: offer.sdp! },
        });
      } catch (e) {
        console.error(e);
        setError('Could not access camera/microphone.');
        cleanupMedia();
        setUiState('idle');
      }
    },
    [attachPeerCaller, chatRoomId, cleanupMedia, emitSignal, enabled, peerUserId, selfUserId]
  );

  const acceptIncoming = useCallback(async () => {
    const offer = pendingOfferRef.current;
    if (!offer || offer.type !== 'offer' || !peerUserId || !chatRoomId) return;
    setError(null);
    const sockAccept = getSocket() ?? initSocketAuth();
    if (sockAccept && !sockAccept.connected) {
      await new Promise<void>((resolve) => {
        sockAccept.once('connect', () => resolve());
      });
    }
    try {
      const media = offer.media;
      lastCallMediaRef.current = media;
      callerUserIdRef.current = offer.from;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: media === 'video',
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      callIdRef.current = offer.callId;
      roleRef.current = 'callee';

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      bindRemoteTracks(pc);
      pc.onicecandidate = onIceCandidate;

      await pc.setRemoteDescription(new RTCSessionDescription(offer.sdp));
      await flushPendingIce();

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await flushPendingIce();

      setUiState('connecting');
      emitSignal({
        type: 'answer',
        callId: offer.callId,
        from: selfUserId,
        to: peerUserId,
        sdp: { type: answer.type!, sdp: answer.sdp! },
      });
      callConnectedAtRef.current = Date.now();
      setUiState('active');
      pendingOfferRef.current = null;
      setIncomingMedia(null);
    } catch (e) {
      console.error(e);
      setError('Could not answer the call.');
      endCall(true);
    }
  }, [
    bindRemoteTracks,
    chatRoomId,
    emitSignal,
    endCall,
    flushPendingIce,
    onIceCandidate,
    peerUserId,
    selfUserId,
  ]);

  const rejectIncoming = useCallback(() => {
    const offer = pendingOfferRef.current;
    if (offer?.type === 'offer' && peerUserId) {
      emitSignal({
        type: 'reject',
        callId: offer.callId,
        from: selfUserId,
        to: peerUserId,
      });
      const log = onCallLogRef.current;
      if (log) {
        void log({
          kind: 'declined',
          senderId: selfUserId,
          media: offer.media || 'audio',
        });
      }
    }
    pendingOfferRef.current = null;
    callIdRef.current = null;
    setIncomingMedia(null);
    setUiState('idle');
  }, [emitSignal, peerUserId, selfUserId]);

  const cancelOutgoing = useCallback(() => {
    endCall(true);
  }, [endCall]);

  const handleRemoteSignal = useCallback(
    async (sig: WebRTCSignal) => {
      if (!peerUserId || normId(sig.from) !== normId(peerUserId)) return;
      if (sig.type === 'offer') {
        if (pcRef.current) return;
        callIdRef.current = sig.callId;
        lastCallMediaRef.current = sig.media;
        callerUserIdRef.current = sig.from;
        pendingOfferRef.current = sig;
        setIncomingMedia(sig.media);
        setUiState('incoming');
        return;
      }
      if (sig.type === 'answer' && callIdRef.current === sig.callId && roleRef.current === 'caller') {
        const pc = pcRef.current;
        if (!pc) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp));
          await flushPendingIce();
          callConnectedAtRef.current = Date.now();
          setUiState('active');
        } catch (e) {
          console.error(e);
          cleanupMedia();
          setUiState('idle');
        }
        return;
      }
      if (sig.type === 'ice') {
        if (callIdRef.current != null && sig.callId !== callIdRef.current) return;
        const pc = pcRef.current;
        if (!pc) {
          pendingIceRef.current.push(sig.candidate);
          return;
        }
        if (!pc.remoteDescription) {
          pendingIceRef.current.push(sig.candidate);
          return;
        }
        try {
          await pc.addIceCandidate(new RTCIceCandidate(sig.candidate));
        } catch {
          /* ignore */
        }
        return;
      }
      if (sig.type === 'reject' && sig.callId === callIdRef.current) {
        cleanupMedia();
        setUiState('idle');
        return;
      }
      if (sig.type === 'end' && sig.callId === callIdRef.current) {
        cleanupMedia();
        setUiState('idle');
      }
    },
    [cleanupMedia, flushPendingIce, peerUserId]
  );

  useEffect(() => {
    if (!enabled || !selfUserId) return;
    try {
      const socket = getSocket() ?? initSocketAuth();
      if (!socket) return;

      const handler = (data: WebRTCSignal) => {
        handleRemoteSignal(data);
      };
      socket.on('webrtc_signal', handler);
      return () => {
        socket.off('webrtc_signal', handler);
      };
    } catch {
      return undefined;
    }
  }, [enabled, handleRemoteSignal, selfUserId]);

  useEffect(() => {
    const po = options?.pendingOffer;
    if (!po || po.type !== 'offer') return;
    if (!enabled || !chatRoomId || !peerUserId) return;
    if (normId(po.chatRoomId) !== normId(chatRoomId)) return;
    if (normId(po.from) !== normId(peerUserId)) return;
    if (pcRef.current) {
      options?.onPendingOfferConsumed?.();
      return;
    }
    if (pendingOfferConsumedRef.current === po.callId) return;
    pendingOfferConsumedRef.current = po.callId;
    void handleRemoteSignal(po);
    options?.onPendingOfferConsumed?.();
  }, [
    options?.pendingOffer,
    options?.onPendingOfferConsumed,
    enabled,
    chatRoomId,
    peerUserId,
    handleRemoteSignal,
  ]);

  useEffect(() => {
    return () => {
      cleanupMedia();
    };
  }, [cleanupMedia]);

  const toggleMute = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    const audio = s.getAudioTracks()[0];
    if (audio) {
      audio.enabled = !audio.enabled;
      setIsMuted(!audio.enabled);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    const video = s.getVideoTracks()[0];
    if (video) {
      video.enabled = !video.enabled;
      setIsVideoOff(!video.enabled);
    }
  }, []);

  return {
    uiState,
    incomingMedia,
    localStream,
    remoteStream,
    error,
    startAudioCall: () => startCall('audio'),
    startVideoCall: () => startCall('video'),
    acceptIncoming,
    rejectIncoming,
    cancelOutgoing,
    endCall: () => endCall(true),
    isMuted,
    isVideoOff,
    toggleMute,
    toggleVideo,
  };
}
