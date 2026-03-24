export type CallMedia = 'audio' | 'video';

export type WebRTCSignal =
  | {
      type: 'offer';
      callId: string;
      from: string;
      to: string;
      chatRoomId: string;
      media: CallMedia;
      sdp: { type: RTCSdpType; sdp: string };
    }
  | {
      type: 'answer';
      callId: string;
      from: string;
      to: string;
      sdp: { type: RTCSdpType; sdp: string };
    }
  | {
      type: 'ice';
      callId: string;
      from: string;
      to: string;
      candidate: RTCIceCandidateInit;
    }
  | {
      type: 'reject';
      callId: string;
      from: string;
      to: string;
    }
  | {
      type: 'end';
      callId: string;
      from: string;
      to: string;
    };

/** Persisted to chat as call_log (senderId is Mongo user id string). */
export type CallLogEvent =
  | { kind: 'cancelled'; senderId: string; media: CallMedia }
  | { kind: 'declined'; senderId: string; media: CallMedia }
  | { kind: 'answered'; senderId: string; media: CallMedia; durationSec: number };
