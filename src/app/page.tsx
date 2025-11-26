"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const message = searchParams.get("message");
    if (message) {
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log("API response:", data);

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Login failed");
      }

      // Save JWT token + user info
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.loginContainer}>
        {/* Left Side - Login Form */}
        <div className={styles.loginForm}>
          {/* Logo */}
          <div className={styles.logo}>
            <img
              src="/images/logo.png"
              alt="Chautari"
              className={styles.logoImage}
            />
          </div>

          <h1 className={styles.formTitle}>Welcome Back</h1>
          <p className={styles.formSubtitle}>
            Sign in to continue your journey
          </p>

          {/* Success Message */}
          {successMessage && (
            <div className={styles.successMessage}>
              <i className="fas fa-check-circle"></i>
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className={styles.errorMessage}>
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.formLabel}>
                Email Address
              </label>
              <div className={styles.inputWrapper}>
                <i className={`fas fa-envelope ${styles.inputIcon}`}></i>
                <input
                  id="email"
                  type="email"
                  className={styles.formInput}
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.formLabel}>
                Password
              </label>
              <div className={styles.inputWrapper}>
                <i className={`fas fa-lock ${styles.inputIcon}`}></i>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={styles.formInput}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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
            </div>

            {/* Forgot Password */}
            <div className={styles.forgotPassword}>
              <Link href="/forgot-password" className={styles.forgotPasswordLink}>
                Forgot your password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Signing in...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt"></i> Sign In
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className={styles.divider}>or</div>

          {/* Sign Up Link */}
          <div className={styles.signupPrompt}>
            Don't have an account?{" "}
            <Link href="/signup" className={styles.signupLink}>
              Create Account
            </Link>
          </div>
        </div>

        {/* Right Side - Welcome Section */}
        <div className={styles.loginImage}>
          <div className={styles.welcomeIcon}>
            <i className="fas fa-users"></i>
          </div>
          
          <h2 className={styles.welcomeTitle}>Welcome Back!</h2>
          <p className={styles.welcomeSubtitle}>
            Connect, share, and explore with your community
          </p>

          {/* Features */}
          <div className={styles.features}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <i className="fas fa-check"></i>
              </div>
              <span>Share your moments</span>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <i className="fas fa-check"></i>
              </div>
              <span>Connect with friends</span>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <i className="fas fa-check"></i>
              </div>
              <span>Join communities</span>
            </div>
          </div>

          <div className={styles.signupCta}>
            New to Chautari?{" "}
            <Link href="/signup" className={styles.signupCtaLink}>
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
