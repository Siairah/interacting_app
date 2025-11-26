"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./forgot-password.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Add animation to form when loaded
    const form = document.querySelector('form');
    if (form) {
      form.style.opacity = '0';
      form.style.transform = 'translateY(20px)';
      form.style.transition = 'all 0.4s ease-out';

      setTimeout(() => {
        form.style.opacity = '1';
        form.style.transform = 'translateY(0)';
      }, 100);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

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
        setMessage(data.message);
        // Redirect to verify OTP page with email
        setTimeout(() => {
          router.push(`/verify-otp-reset?email=${encodeURIComponent(email)}`);
        }, 2000);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("Failed to send verification code. Please try again.");
      console.error("Forgot password error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.forgotPasswordCenter}>
      <div className={styles.container}>
        <div className={styles.authCard}>
          <div className={styles.authHeader}>
            <div className={styles.iconCircle}>
              <i className="fas fa-key"></i>
            </div>
            <h3>Reset Password</h3>
            <p>We'll send you a verification code</p>
          </div>

          <div className={styles.authBody}>
            <form onSubmit={handleSubmit}>
              <div className={styles.mb4}>
                <label htmlFor="email" className={styles.formLabel}>
                  Email Address
                </label>
                <div className={styles.inputGroup}>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    className={styles.formControl}
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <i className={`fas fa-envelope ${styles.inputIcon}`}></i>
                  {error && <span className={`${styles.inputMessage} ${styles.error}`}>{error}</span>}
                  {message && <span className={`${styles.inputMessage} ${styles.success}`}>{message}</span>}
                </div>
              </div>

              {error && (
                <div className={`${styles.alert} ${styles.alertDanger} ${styles.textCenter} ${styles.mb3}`}>
                  {error}
                </div>
              )}

              {message && (
                <div className={`${styles.alert} ${styles.alertSuccess} ${styles.textCenter} ${styles.mb3}`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                className={`${styles.btnPrimary} ${styles.mb3}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin me-2"></i> Sending...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane me-2"></i> Send Verification Code
                  </>
                )}
              </button>

              <div className={styles.divider}>or</div>

              <div className={styles.textCenter}>
                <Link href="/" className={styles.backLink}>
                  <i className="fas fa-arrow-left me-1"></i> Return to Login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
