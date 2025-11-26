"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./signup.module.css";

type SignupStep = "register" | "verify-otp" | "profile";

export default function Signup() {
  const router = useRouter();
  const [step, setStep] = useState<SignupStep>("register");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });
  const [otp, setOtp] = useState("");
  const [verifiedOtp, setVerifiedOtp] = useState("");
  const [profileData, setProfileData] = useState({
    fullName: "",
    username: "",
    bio: "",
    interests: ""
  });
  const [otpTimer, setOtpTimer] = useState(300);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(
    null
  );

  // Auto-hide toast after 4s
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value || ""
    }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
      setToast({ type: "error", message: "All fields are required" });
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setToast({ type: "error", message: "Passwords do not match" });
      return false;
    }
    
    if (formData.password.length < 6) {
      setToast({ type: "error", message: "Password must be at least 6 characters long" });
      return false;
    }
    
    return true;
  };

  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendOTPEmail = async (email: string, otp: string) => {
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/send-otp`;
      console.log('Sending OTP to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          otp: otp,
          purpose: 'registration'
        }),
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        console.error('Response not ok:', response.status, response.statusText);
        const text = await response.text();
        console.error('Response text:', text);
        return false;
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      return data.success;
    } catch (error) {
      console.error('Send OTP error:', error);
      return false;
    }
  };

  const checkEmailExists = async (email: string) => {
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/check-email`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      return data.exists;
    } catch (error) {
      console.error('Check email error:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setToast(null);
    
    try {
      // First, check if email already exists
      const emailExists = await checkEmailExists(formData.email);
      
      if (emailExists) {
        setToast({ 
          type: "error", 
          message: "This email is already registered. Please login or use a different email." 
        });
        setLoading(false);
        return;
      }
      
      // Generate OTP
      const otp = generateOTP();
      const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
      
      // Save ALL user data to localStorage (NO database save yet)
      const userData = {
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        otp: otp,
        otpExpiresAt: otpExpiresAt.toISOString(),
        signupTimestamp: new Date().toISOString()
      };
      
      localStorage.setItem('pendingUserData', JSON.stringify(userData));
      
      console.log('User data saved to localStorage (not in database yet)');
      
      // Send OTP email
      const emailSent = await sendOTPEmail(formData.email, otp);
      
      if (emailSent) {
        setToast({ 
          type: "success", 
          message: "Verification code sent to your email. Please check your inbox." 
        });
        
        // Navigate to verify OTP page with email
        setTimeout(() => {
          router.push(`/verify-otp?email=${encodeURIComponent(formData.email)}`);
        }, 2000);
      } else {
        // Remove data from localStorage if email failed
        localStorage.removeItem('pendingUserData');
        setToast({ 
          type: "error", 
          message: "Failed to send verification email. Please try again." 
        });
      }
    } catch (error) {
      console.error('Signup error:', error);
      localStorage.removeItem('pendingUserData');
      setToast({ type: "error", message: "Failed to process signup. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.signupWrapper}>
      {/* Toast messages */}
      {toast && (
        <div className={styles.toastContainer}>
          <div className={`${styles.toast} ${styles[toast.type]}`}>
            <span className={styles.toastIcon}>
              {toast.type === "success"
                ? "✅"
                : toast.type === "error"
                ? "❌"
                : toast.type === "info"
                ? "ℹ️"
                : "⚠️"}
            </span>
            <span className={styles.toastMessage}>{toast.message}</span>
          </div>
        </div>
      )}

      <div className={styles.signupContainer}>
        {/* Left Side - Signup Form */}
        <div className={styles.signupForm}>
          {/* Logo */}
          <div className={styles.logo}>
            <img
              src="/images/logo.png"
              alt="Chautari"
              className={styles.logoImage}
            />
          </div>

          <h1 className={styles.formTitle}>Create Account</h1>
          <p className={styles.formSubtitle}>
            Join Chautari and start connecting
          </p>

            <form
              className={styles.registerForm}
              onSubmit={handleSubmit}
            >
              <div className={styles.formGroup}>
                <label>Email</label>
                <input 
                  type="email" 
                  name="email"
                  placeholder="Enter email" 
                  value={formData.email || ""}
                  onChange={handleInputChange}
                  required 
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Phone</label>
                <input 
                  type="text" 
                  name="phone"
                  placeholder="Enter phone number" 
                  value={formData.phone || ""}
                  onChange={handleInputChange}
                  required 
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Password</label>
                <input
                  type={showPasswords ? "text" : "password"}
                  name="password"
                  placeholder="Enter password"
                  value={formData.password || ""}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Confirm Password</label>
                <input
                  type={showPasswords ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword || ""}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className={styles.showPassword}>
                <input
                  type="checkbox"
                  id="show-passwords"
                  checked={showPasswords}
                  onChange={() => setShowPasswords(!showPasswords)}
                  disabled={loading}
                />
                <label htmlFor="show-passwords">Show Passwords</label>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? "Creating Account..." : "Next"}
              </button>
            </form>

            {/* Progress Bar */}
            <div className={styles.progressBar}>
              <div className={`${styles.progressStep} ${styles.active}`}>
                <div className={styles.circle}></div>
                <div className={styles.label}>Register</div>
              </div>
              <div className={styles.progressLine} />
              <div className={styles.progressStep}>
                <div className={styles.circle}></div>
                <div className={styles.label}>Verify OTP</div>
              </div>
              <div className={styles.progressLine} />
              <div className={styles.progressStep}>
                <div className={styles.circle}></div>
                <div className={styles.label}>Profile</div>
              </div>
            </div>

          </div>

        {/* Right Side - Welcome Section */}
        <div className={styles.signupImage}>
          <div className={styles.welcomeIcon}>
            <i className="fas fa-user-plus"></i>
          </div>
          
          <div className={styles.welcomeText}>Welcome!</div>
          <div className={styles.welcomeSlogan}>
            Let the journey of connection begin
          </div>
          
          <div className={styles.signinLink}>
            Already have an account? <a href="/">Sign In</a>
          </div>
        </div>
      </div>
    </div>
  );
}
