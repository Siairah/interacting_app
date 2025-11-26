"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./reset-password.module.css";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  useEffect(() => {
    if (!email) {
      router.push("/forgot-password");
      return;
    }
  }, [email, router]);

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
      errors: {
        minLength: !minLength ? "At least 8 characters" : "",
        hasUpperCase: !hasUpperCase ? "One uppercase letter" : "",
        hasLowerCase: !hasLowerCase ? "One lowercase letter" : "",
        hasNumbers: !hasNumbers ? "One number" : "",
        hasSpecialChar: !hasSpecialChar ? "One special character" : "",
      }
    };
  };

  const passwordValidation = validatePassword(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    // Validation
    if (!passwordValidation.isValid) {
      setError("Please ensure your password meets all requirements");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage("Password reset successfully! Redirecting to login...");
        setTimeout(() => {
          router.push("/?message=Password reset successfully. Please login with your new password.");
        }, 2000);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("Failed to reset password. Please try again.");
      console.error("Reset password error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className={styles.resetPasswordCenter}>
      <div className={styles.container}>
        <div className={styles.authCard}>
          <div className={styles.authHeader}>
            <div className={styles.iconCircle}>
              <i className="fas fa-lock"></i>
            </div>
            <h3>Set New Password</h3>
            <p>Create a strong password for your account</p>
          </div>

          <div className={styles.authBody}>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.formLabel}>
                  New Password
                </label>
                <div className={styles.inputWrapper}>
                  <i className={`fas fa-lock ${styles.inputIcon}`}></i>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    id="password"
                    className={styles.formControl}
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
              
                {/* Password Requirements */}
                {password && (
                  <div className={styles.passwordRequirements}>
                    <small style={{ color: '#666', fontWeight: 600 }}>Password requirements:</small>
                    <ul className={styles.requirementsList}>
                      <li className={passwordValidation.errors.minLength ? styles.invalid : styles.valid}>
                        <i className={`fas fa-${passwordValidation.errors.minLength ? "times" : "check"}`}></i>
                        At least 8 characters
                      </li>
                      <li className={passwordValidation.errors.hasUpperCase ? styles.invalid : styles.valid}>
                        <i className={`fas fa-${passwordValidation.errors.hasUpperCase ? "times" : "check"}`}></i>
                        One uppercase letter
                      </li>
                      <li className={passwordValidation.errors.hasLowerCase ? styles.invalid : styles.valid}>
                        <i className={`fas fa-${passwordValidation.errors.hasLowerCase ? "times" : "check"}`}></i>
                        One lowercase letter
                      </li>
                      <li className={passwordValidation.errors.hasNumbers ? styles.invalid : styles.valid}>
                        <i className={`fas fa-${passwordValidation.errors.hasNumbers ? "times" : "check"}`}></i>
                        One number
                      </li>
                      <li className={passwordValidation.errors.hasSpecialChar ? styles.invalid : styles.valid}>
                        <i className={`fas fa-${passwordValidation.errors.hasSpecialChar ? "times" : "check"}`}></i>
                        One special character
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword" className={styles.formLabel}>
                  Confirm Password
                </label>
                <div className={styles.inputWrapper}>
                  <i className={`fas fa-lock ${styles.inputIcon}`}></i>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    id="confirmPassword"
                    className={styles.formControl}
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    <i className={`fas ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <small style={{ color: '#dc3545', fontSize: '13px', marginTop: '5px', display: 'block' }}>
                    Passwords do not match
                  </small>
                )}
              </div>

              {error && (
                <div className={`${styles.alert} ${styles.alertDanger}`}>
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </div>
              )}

              {message && (
                <div className={`${styles.alert} ${styles.alertSuccess}`}>
                  <i className="fas fa-check-circle"></i>
                  {message}
                </div>
              )}

              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={loading || !passwordValidation.isValid || password !== confirmPassword}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner}></span>
                    Resetting Password...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle"></i> Reset Password
                  </>
                )}
              </button>

              <div className={styles.divider}>or</div>

              <div className={styles.textCenter}>
                <Link href="/" className={styles.backLink}>
                  <i className="fas fa-arrow-left"></i> Return to Login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
