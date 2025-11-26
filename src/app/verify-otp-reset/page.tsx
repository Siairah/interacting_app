"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./verify-otp-reset.module.css";

export default function VerifyOtpResetPage() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      router.push("/forgot-password");
      return;
    }

    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [email, router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Prevent multiple characters

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join("");
    
    if (otpString.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/forgot-password/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp: otpString }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to reset password page
        router.push(`/reset-password?email=${encodeURIComponent(email!)}`);
      } else {
        setError(data.message);
        // Clear OTP on error
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      setError("Failed to verify code. Please try again.");
      console.error("Verify OTP error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || !email) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setTimeLeft(300);
        setCanResend(false);
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("Failed to resend code. Please try again.");
      console.error("Resend OTP error:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!email) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className={styles.verifyOtpCenter}>
      <div className={styles.container}>
        <div className={styles.authCard}>
          <div className={styles.authHeader}>
            <div className={styles.iconCircle}>
              <i className="fas fa-shield-alt"></i>
            </div>
            <h3>Verify OTP</h3>
            <p>Enter the 6-digit code sent to your email</p>
          </div>

        <div className={styles.authBody}>
          <form onSubmit={handleSubmit}>
            <div className={styles.otpContainer}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  maxLength={1}
                  className={styles.otpBox}
                  pattern="\d*"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  required
                  disabled={loading}
                />
              ))}
            </div>

            {error && (
              <div className={`${styles.alert} ${styles.alertDanger} ${styles.textCenter} ${styles.mb3}`}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className={`${styles.btnPrimary} ${styles.mb3}`}
              disabled={loading || otp.join("").length !== 6}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin me-2"></i> Verifying...
                </>
              ) : (
                <>
                  <i className="fas fa-check-circle me-2"></i> Verify Code
                </>
              )}
            </button>

            <div className={styles.textCenter}>
              {canResend ? (
                <button
                  type="button"
                  className={styles.resendLink}
                  onClick={handleResendOtp}
                  disabled={loading}
                >
                  <i className="fas fa-redo me-1"></i> Resend OTP
                </button>
              ) : (
                <span className={styles.countdown}>
                  Resend code in {formatTime(timeLeft)}
                </span>
              )}
            </div>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
}
