'use client';

import { useEffect, useRef } from 'react';

type RingMode = 'incoming' | 'outgoing' | 'off';

/**
 * Plays repeating ring patterns using Web Audio (no asset files).
 * Browsers may start AudioContext in "suspended" state until a user gesture; we resume on first tap/key.
 */
export function useCallRingtone(mode: RingMode) {
  const ctxRef = useRef<AudioContext | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (mode === 'off') {
      cleanupRef.current?.();
      cleanupRef.current = null;
      return;
    }

    if (typeof window === 'undefined') return;

    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;

    const ctx = new AC();
    ctxRef.current = ctx;

    const resume = () => {
      if (ctx.state === 'suspended') void ctx.resume();
    };
    void resume();
    document.addEventListener('click', resume, { passive: true });
    document.addEventListener('keydown', resume, { passive: true });

    const playTone = (freq: number, durSec: number, volume = 0.14) => {
      resume();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.connect(g);
      g.connect(ctx.destination);
      osc.frequency.value = freq;
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(volume, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + durSec);
      osc.start(t);
      osc.stop(t + durSec + 0.02);
    };

    let intervalId: ReturnType<typeof setInterval> | undefined;
    const timeouts: number[] = [];

    if (mode === 'incoming') {
      const ringOnce = () => {
        playTone(880, 0.22);
        timeouts.push(window.setTimeout(() => playTone(660, 0.28), 230));
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate([100, 80, 100]);
          } catch {
            /* ignore */
          }
        }
      };
      ringOnce();
      intervalId = window.setInterval(ringOnce, 2600);
    } else {
      const pulse = () => playTone(520, 0.1, 0.08);
      pulse();
      intervalId = window.setInterval(pulse, 1600);
    }

    cleanupRef.current = () => {
      document.removeEventListener('click', resume);
      document.removeEventListener('keydown', resume);
      if (intervalId) window.clearInterval(intervalId);
      timeouts.forEach((id) => window.clearTimeout(id));
      void ctx.close().catch(() => {});
    };

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [mode]);
}
