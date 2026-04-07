'use client';

import { useEffect, useRef } from 'react';
import type { CallMedia } from '@/types/webrtc';
import type { CallUiState } from '@/hooks/useWebRTCCall';
import { useCallRingtone } from '@/hooks/useCallRingtone';
import styles from './CallOverlay.module.css';

interface CallOverlayProps {
  uiState: CallUiState;
  incomingMedia: CallMedia | null;
  peerName: string;
  peerPic?: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  error: string | null;
  isMuted: boolean;
  isVideoOff: boolean;
  onAccept: () => void;
  onReject: () => void;
  onCancelOutgoing: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

function statusLabel(uiState: CallUiState, isVideoCall: boolean): string {
  switch (uiState) {
    case 'incoming':
      return 'Incoming call';
    case 'outgoing':
      return 'Calling…';
    case 'connecting':
      return 'Connecting…';
    case 'active':
      return isVideoCall ? 'Video' : 'Voice call';
    default:
      return '';
  }
}

export default function CallOverlay({
  uiState,
  incomingMedia,
  peerName,
  peerPic,
  localStream,
  remoteStream,
  error,
  isMuted,
  isVideoOff,
  onAccept,
  onReject,
  onCancelOutgoing,
  onEnd,
  onToggleMute,
  onToggleVideo,
}: CallOverlayProps) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const ringMode =
    uiState === 'incoming' ? 'incoming' : uiState === 'outgoing' ? 'outgoing' : 'off';
  useCallRingtone(ringMode);

  useEffect(() => {
    const v = remoteVideoRef.current;
    const a = remoteAudioRef.current;
    if (!remoteStream) {
      if (v) v.srcObject = null;
      if (a) a.srcObject = null;
      return;
    }
    const vTracks = remoteStream.getVideoTracks();
    const aTracks = remoteStream.getAudioTracks();
    const unmuteHandlers: Array<{ t: MediaStreamTrack; fn: () => void }> = [];

    if (v) {
      // Bind full stream so audio+video stay in sync; muted on <video> avoids echo (audio uses <audio> below).
      v.srcObject = remoteStream && vTracks.length ? remoteStream : null;
      void v.play().catch(() => {});
      const replay = () => void v.play().catch(() => {});
      vTracks.forEach((t) => {
        t.addEventListener('unmute', replay);
        unmuteHandlers.push({ t, fn: replay });
      });
    }
    if (a) {
      a.srcObject = aTracks.length ? new MediaStream(aTracks) : null;
      void a.play().catch(() => {});
    }

    return () => {
      unmuteHandlers.forEach(({ t, fn }) => t.removeEventListener('unmute', fn));
    };
  }, [remoteStream]);

  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    el.srcObject = localStream;
    if (localStream) void el.play().catch(() => {});
  }, [localStream]);

  if (uiState === 'idle' || uiState === 'ended') return null;

  const isVideoCall =
    incomingMedia === 'video' ||
    (uiState === 'outgoing' && (localStream?.getVideoTracks().length ?? 0) > 0) ||
    (uiState === 'active' &&
      ((localStream?.getVideoTracks().length ?? 0) > 0 || (remoteStream?.getVideoTracks().length ?? 0) > 0));

  const showVideo = isVideoCall && (uiState === 'active' || uiState === 'connecting' || uiState === 'outgoing');

  const hasLocalVideoTrack = (localStream?.getVideoTracks().length ?? 0) > 0;
  const remoteVideoTracks = remoteStream?.getVideoTracks() ?? [];
  // Show main video as soon as a remote video track exists; don't require `enabled` (can flicker before first frame).
  const remoteHasRenderableVideo = remoteVideoTracks.some((t) => t.readyState !== 'ended');
  const remotePlaceholderText = !remoteStream ? 'Connecting…' : 'Camera is off';

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Call">
      <audio ref={remoteAudioRef} className={styles.remoteAudio} autoPlay playsInline />

      <div className={styles.shell}>
        <header className={styles.topBar}>
          <div className={styles.topBarInner}>
            <div className={styles.peerBadge}>
              {peerPic ? (
                <img src={peerPic} alt="" className={styles.peerThumb} />
              ) : (
                <span className={styles.peerThumbPlaceholder}>{peerName.charAt(0).toUpperCase()}</span>
              )}
              <div className={styles.peerText}>
                <h1 className={styles.peerTitle}>{peerName}</h1>
                <p className={styles.statusLine}>
                  <span
                    className={
                      uiState === 'active' ? styles.statusDot : `${styles.statusDot} ${styles.statusDotPulse}`
                    }
                    aria-hidden
                  />
                  {statusLabel(uiState, isVideoCall)}
                </p>
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div className={styles.errorBanner} role="alert">
            {error}
          </div>
        )}

        <div className={styles.mainArea}>
          {showVideo ? (
            <div className={styles.videoStage}>
              <div className={styles.remoteWrap}>
                <video
                  ref={remoteVideoRef}
                  className={styles.remoteVideo}
                  playsInline
                  autoPlay
                  muted
                />
                {!remoteHasRenderableVideo && (
                  <div className={styles.remotePlaceholder}>
                    <div className={styles.remotePlaceholderInner}>
                      {peerPic ? (
                        <img src={peerPic} alt="" className={styles.remotePhAvatar} />
                      ) : (
                        <span className={styles.remotePhLetter}>{peerName.charAt(0).toUpperCase()}</span>
                      )}
                      <span className={styles.remotePhHint}>{remotePlaceholderText}</span>
                    </div>
                  </div>
                )}
              </div>

              {hasLocalVideoTrack && (
                <div className={styles.localPip}>
                  <div className={styles.localPipInner}>
                    <video ref={localVideoRef} className={styles.localVideo} playsInline autoPlay muted />
                    {isVideoOff && (
                      <div className={styles.cameraOffPip}>
                        <i className="fas fa-video-slash" aria-hidden />
                        <span>Camera off</span>
                      </div>
                    )}
                  </div>
                  <span className={styles.pipLabel}>You</span>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.audioStage}>
              <div className={styles.audioGlow} aria-hidden />
              <div className={styles.avatarRing}>
                {peerPic ? <img src={peerPic} alt="" /> : peerName.charAt(0).toUpperCase()}
              </div>
              <p className={styles.audioHint}>{statusLabel(uiState, false)}</p>
            </div>
          )}
        </div>

        {uiState === 'incoming' && (
          <div className={styles.actionDock}>
            <button type="button" className={`${styles.roundAction} ${styles.roundDecline}`} onClick={onReject}>
              <i className="fas fa-phone-slash" />
              <span>Decline</span>
            </button>
            <button type="button" className={`${styles.roundAction} ${styles.roundAccept}`} onClick={onAccept}>
              <i className="fas fa-phone" />
              <span>Accept</span>
            </button>
          </div>
        )}

        {uiState === 'outgoing' && (
          <div className={styles.actionDock}>
            <button type="button" className={`${styles.roundAction} ${styles.roundDecline}`} onClick={onCancelOutgoing}>
              <i className="fas fa-phone-slash" />
              <span>Cancel</span>
            </button>
          </div>
        )}

        {(uiState === 'active' || uiState === 'connecting') && (
          <footer className={styles.controlDock}>
            <div className={styles.controlPill}>
              <button
                type="button"
                className={`${styles.ctrlItem} ${isMuted ? styles.ctrlActive : ''}`}
                onClick={onToggleMute}
                aria-pressed={isMuted}
              >
                <span className={styles.ctrlIcon}>
                  <i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`} />
                </span>
                <span className={styles.ctrlLabel}>{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              {isVideoCall && (
                <button
                  type="button"
                  className={`${styles.ctrlItem} ${isVideoOff ? styles.ctrlActive : ''}`}
                  onClick={onToggleVideo}
                  aria-pressed={isVideoOff}
                >
                  <span className={styles.ctrlIcon}>
                    <i className={`fas ${isVideoOff ? 'fa-video-slash' : 'fa-video'}`} />
                  </span>
                  <span className={styles.ctrlLabel}>{isVideoOff ? 'Video on' : 'Video off'}</span>
                </button>
              )}

              <button type="button" className={`${styles.ctrlItem} ${styles.ctrlEnd}`} onClick={onEnd}>
                <span className={styles.ctrlIcon}>
                  <i className="fas fa-phone-slash" />
                </span>
                <span className={styles.ctrlLabel}>End</span>
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
