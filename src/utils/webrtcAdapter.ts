'use client';

/**
 * Shim for Safari / Firefox / Edge WebRTC differences (SDP, addIceCandidate, etc.).
 * Import once before creating RTCPeerConnection.
 */
import 'webrtc-adapter';
