"use client";

import Head from 'next/head';
import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './profile-setup.module.css';

export default function ProfileSetup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('O'); // Default to 'Other'
  const [bio, setBio] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>('/images/default_profile.png');
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Get email from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pendingUserData = localStorage.getItem('pendingUserData');
      if (pendingUserData) {
        try {
          const userData = JSON.parse(pendingUserData);
          setEmail(userData.email);
          console.log('Retrieved email from localStorage:', userData.email);
        } catch (error) {
          console.error('Error parsing pending user data:', error);
          router.push('/signup');
        }
      } else {
        // No pending user data, redirect to signup
        console.warn('No pending user data found');
        router.push('/signup');
      }
    }
  }, [router]);

  // Clean up camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setCapturedPhoto(null); // Clear any captured photo
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user' 
        } 
      });
      setCameraStream(stream);
      setShowCamera(true);
      
      // Wait for video element to be available
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Unable to access camera. Please check permissions or use file upload.');
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob then to file
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `profile-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setCapturedPhoto(file);
          
          // Update preview
          const url = URL.createObjectURL(blob);
          setPreview(url);
          
          console.log('✅ Photo captured:', file.name, file.size, 'bytes');
          
          // Close camera
          closeCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validation
    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (!dob) {
      setError('Date of birth is required');
      return;
    }
    if (!gender) {
      setError('Please select a gender');
      return;
    }
    
    setSubmitting(true);
    try {
      // Get complete user data from localStorage
      const pendingUserData = localStorage.getItem('pendingUserData');
      if (!pendingUserData) {
        setError('Session expired. Please sign up again.');
        return;
      }
      
      const userData = JSON.parse(pendingUserData);
      
      const form = new FormData();
      
      // Check if file is selected (from file upload or camera capture)
      const file = capturedPhoto || fileRef.current?.files?.[0];
      if (file) {
        console.log('📤 File selected:', {
          name: file.name,
          size: file.size,
          type: file.type,
          source: capturedPhoto ? 'camera' : 'file upload'
        });
        form.append('profile_pic', file);
      } else {
        console.log('ℹ️ No file selected, will use default profile picture');
      }
      
      // User data from signup
      form.append('email', userData.email);
      form.append('phone', userData.phone);
      form.append('password', userData.password);
      
      // Profile data from this form
      form.append('full_name', fullName);
      form.append('dob', dob);
      form.append('gender', gender);
      form.append('bio', bio);

      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/complete-registration`;
      console.log('Completing registration (creating user + profile):', apiUrl);
      console.log('Form data being sent:', {
        hasFile: !!file,
        email: userData.email,
        full_name: fullName,
        dob: dob,
        gender: gender
      });
      
      const res = await fetch(apiUrl, { 
        method: 'POST', 
        body: form 
      });
      
      const data = await res.json();
      console.log('Profile setup response:', data);
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to save profile');
      }
      
      setSuccess('Profile created successfully! Logging you in...');
      
      // Automatically log the user in after successful registration
      try {
        const loginRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: userData.email, 
            password: userData.password 
          }),
        });

        const loginData = await loginRes.json();
        console.log("Auto-login response:", loginData);

        if (loginData.success) {
          // Save JWT token + user info with profile data
          localStorage.setItem("auth_token", loginData.token);
          localStorage.setItem("user", JSON.stringify(loginData.user));
          
          // Clear pending user data
          localStorage.removeItem('pendingUserData');
          
          setTimeout(() => {
            router.push('/dashboard');
          }, 1500);
        } else {
          // If auto-login fails, redirect to login page
          localStorage.removeItem('pendingUserData');
          setTimeout(() => {
            router.push('/?message=Registration successful! Please login.');
          }, 1500);
        }
      } catch (loginError) {
        console.error('Auto-login error:', loginError);
        // If auto-login fails, redirect to login page
        localStorage.removeItem('pendingUserData');
        setTimeout(() => {
          router.push('/?message=Registration successful! Please login.');
        }, 1500);
      }
    } catch (err: any) {
      console.error('Profile setup error:', err);
      setError(err.message || 'Failed to save profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Profile Setup</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <div className={styles['profile-page']}>
        <div className={styles['profile-card']}>
          <div className={styles['welcome-message']}>
            <h1>Complete Your Profile</h1>
            <p>Add your details to finish setting up your account</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Profile Picture Upload */}
            <div className={styles['profile-picture']}>
              <input 
                ref={fileRef} 
                onChange={handleFileChange} 
                type="file" 
                accept="image/*" 
                id="profile_pic"
                style={{ display: 'none' }}
              />
              <label htmlFor="profile_pic" className={styles['profile-picture-label']}>
                <img 
                  src={preview} 
                  alt="Profile Picture" 
                  className={styles['profile-pic']}
                />
                <div className={styles['overlay']}>
                  <img src="/images/camera.png" alt="Camera Icon" className={styles['camera-icon']} />
                </div>
              </label>
            </div>
            
            {/* Camera and Upload Options */}
            <div className={styles['upload-options']}>
              <button 
                type="button" 
                className={styles['option-btn']}
                onClick={openCamera}
              >
                <i className="fas fa-camera"></i> Take Photo
              </button>
              <button 
                type="button" 
                className={styles['option-btn']}
                onClick={() => fileRef.current?.click()}
              >
                <i className="fas fa-upload"></i> Upload Photo
              </button>
            </div>
            
            <h3 className={styles['form-title']} style={{ fontSize: '19px' }}>Profile picture</h3>

            {/* Full Name */}
            <div className={styles['form-group']}>
              <label htmlFor="full_name">Full Name</label>
              <input 
                type="text"
                id="full_name"
                className={styles['form-control']} 
                value={fullName} 
                onChange={e => setFullName(e.target.value)} 
                placeholder="Enter your full name"
                required
              />
            </div>

            {/* Date of Birth */}
            <div className={styles['form-group']}>
              <label htmlFor="dob">Date of Birth</label>
              <input 
                type="date"
                id="dob"
                className={styles['form-control']} 
                value={dob} 
                onChange={e => setDob(e.target.value)}
                required
              />
            </div>

            {/* Gender Selection */}
            <div className={styles['form-group']}>
              <label>Gender</label>
              <div className={styles['gender-options']}>
                <label>
                  <input 
                    type="radio" 
                    name="gender" 
                    value="M" 
                    checked={gender === 'M'}
                    onChange={e => setGender(e.target.value)}
                  />
                  <span className={styles['custom-radio']}></span>
                  Male
                </label>
                <label>
                  <input 
                    type="radio" 
                    name="gender" 
                    value="F" 
                    checked={gender === 'F'}
                    onChange={e => setGender(e.target.value)}
                  />
                  <span className={styles['custom-radio']}></span>
                  Female
                </label>
                <label>
                  <input 
                    type="radio" 
                    name="gender" 
                    value="O" 
                    checked={gender === 'O'}
                    onChange={e => setGender(e.target.value)}
                  />
                  <span className={styles['custom-radio']}></span>
                  Other
                </label>
              </div>
            </div>

            {/* Bio (Optional) */}
            <div className={styles['form-group']}>
              <label htmlFor="bio">Bio (Optional)</label>
              <textarea 
                id="bio"
                className={styles['form-control']} 
                value={bio} 
                onChange={e => setBio(e.target.value)} 
                placeholder="Tell us about yourself..."
                rows={3}
                maxLength={500}
              />
              <small className={styles['char-count']}>{bio.length}/500 characters</small>
            </div>

            {error && <div className={styles['error-message']}>{error}</div>}
            {success && <div className={styles['success-message']}>{success}</div>}

            {/* Submit Button */}
            <button type="submit" className={styles['submit-btn']} disabled={submitting}>
              {submitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className={styles['progress-bar']}>
            <div className={styles['progress-step'] + ' ' + styles.completed}>
              <div className={styles.circle}></div>
              <div className={styles.label}>Register</div>
            </div>
            <div className={styles['progress-line'] + ' ' + styles.completed}></div>
            <div className={styles['progress-step'] + ' ' + styles.completed}>
              <div className={styles.circle}></div>
              <div className={styles.label}>Verify OTP</div>
            </div>
            <div className={styles['progress-line'] + ' ' + styles.completed}></div>
            <div className={styles['progress-step'] + ' ' + styles.active}>
              <div className={styles.circle}></div>
              <div className={styles.label}>Profile</div>
            </div>
          </div>
        </div>

        {/* Camera Modal */}
        {showCamera && (
          <div className={styles['camera-modal']}>
            <div className={styles['camera-container']}>
              <div className={styles['camera-header']}>
                <h3>Take a Photo</h3>
                <button 
                  type="button" 
                  className={styles['close-btn']}
                  onClick={closeCamera}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className={styles['camera-view']}>
                <video 
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className={styles['camera-video']}
                />
              </div>
              
              <div className={styles['camera-controls']}>
                <button 
                  type="button"
                  className={styles['capture-btn']}
                  onClick={capturePhoto}
                >
                  <i className="fas fa-camera"></i> Capture
                </button>
                <button 
                  type="button"
                  className={styles['cancel-btn']}
                  onClick={closeCamera}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </>
  );
}


