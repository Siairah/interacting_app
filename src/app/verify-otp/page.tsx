"use client";

import Head from 'next/head';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './verify-otp.module.css';

export default function VerifyOtp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = useMemo(() => (searchParams?.get('email') || '').toLowerCase().trim(), [searchParams]);

  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const handleInput = (index: number, value: string) => {
    setError(null);
    const sanitized = value.replace(/[^0-9]/g, '').slice(0, 1);
    setOtpValues(prev => {
      const next = [...prev];
      next[index] = sanitized;
      return next;
    });
    if (sanitized && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    const next = Array(6).fill('');
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setOtpValues(next);
    const focusIndex = Math.min(text.length, 5);
    inputsRef.current[focusIndex]?.focus();
  };

  // No need to activate user - we'll create them after profile setup

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email) {
      setError('Missing email. Return to signup.');
      return;
    }
    
    const otp = otpValues.join('');
    if (otp.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Get user data from localStorage
      const pendingUserData = localStorage.getItem('pendingUserData');
      
      if (!pendingUserData) {
        setError('No pending registration found. Please sign up again.');
        return;
      }
      
      const userData = JSON.parse(pendingUserData);
      
      // Check if OTP matches
      if (userData.otp !== otp) {
        setError('Invalid OTP. Please try again.');
        return;
      }
      
      // Check if OTP is not expired
      const otpExpiresAt = new Date(userData.otpExpiresAt);
      if (otpExpiresAt < new Date()) {
        setError('OTP expired. Please sign up again.');
        localStorage.removeItem('pendingUserData');
        return;
      }
      
      // OTP verified! Keep data in localStorage and proceed to profile setup
      // User will be created in database AFTER profile setup
      console.log('OTP verified successfully. Proceeding to profile setup...');
      router.push('/profile-setup');
      
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>OTP Verification</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&family=Playfair+Display:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <div className={styles['otp-page']}>
        <div className={styles['otp-card']} onPaste={handlePaste}>
          <div className={styles.logo}>
            <img src="/images/logo.png" alt="Chautari" />
          </div>

          <h2 className={styles['otp-title']}>Verify OTP</h2>
          <p className={styles['otp-subtitle']}>
            Enter the 6-digit code sent to {email || 'your email'}
          </p>

          <form className={styles['otp-form']} onSubmit={handleSubmit}>
            <div className={styles['otp-boxes']}>
              {otpValues.map((val, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputsRef.current[idx] = el; }}
                  className={styles['otp-box']}
                  maxLength={1}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={val}
                  onChange={(e) => handleInput(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                />
              ))}
            </div>

            {error && <div className={styles['otp-error']}>{error}</div>}

            <button type="submit" className={styles['otp-submit']} disabled={submitting}>
              {submitting ? 'Verifying…' : 'Verify OTP'}
            </button>
          </form>

          <a href="/login" className={styles['otp-back']}>Back to Login</a>

          <div className={styles['otp-progress']}>
            <div className={styles['progress-step'] + ' ' + styles.completed}>
              <div className={styles.circle}></div>
              <div className={styles.label}>Register</div>
            </div>
            <div className={styles['progress-line'] + ' ' + styles.completed}></div>
            <div className={styles['progress-step'] + ' ' + styles.active}>
              <div className={styles.circle}></div>
              <div className={styles.label}>Verify OTP</div>
            </div>
            <div className={styles['progress-line']}></div>
            <div className={styles['progress-step']}>
              <div className={styles.circle}></div>
              <div className={styles.label}>Profile</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


