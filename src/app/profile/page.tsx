"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRef, useState, useEffect, useMemo } from 'react';
import Navigation from '@/components/Navigation';
import styles from './profile.module.css';

interface UserProfile {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  profilePic?: string;
  bio?: string;
  dob?: string;
  gender?: string;
  hasProfile?: boolean;
}

interface MediaFile {
  file: string;
  type: string;
}

interface Post {
  circle: any;
  id: string;
  content: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  media_files: MediaFile[];
  user: {
    id: string;
    email: string;
    fullName: string;
    profilePic: string;
  };
}

interface GalleryItem {
  id: string;
  file: string;
  type: string;
  post_id: string;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'gallery' | 'about'>('posts');
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{url: string, type: string} | null>(null);
  const [viewedUserId, setViewedUserId] = useState<string | null>(null);
  
  // Check if viewing own profile
  // If no viewedUserId in URL path, it's own profile (/profile)
  // If viewedUserId exists (/profile/[id]), compare with currentUserId
  // IMPORTANT: Only compare viewedUserId with currentUserId, NOT with user.id
  // because user.id is the profile being viewed (could be someone else!)
  const isOwnProfile = useMemo(() => {
    // If no viewedUserId in URL, it's own profile
    if (!viewedUserId) return true;
    
    // If we have both IDs, compare them
    if (currentUserId && viewedUserId) {
      return currentUserId.toString() === viewedUserId.toString();
    }
    
    // If we don't have currentUserId yet, assume it's not own profile (safer)
    return false;
  }, [viewedUserId, currentUserId]);
  
  // Edit form states
  const [editFullName, setEditFullName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editGender, setEditGender] = useState('');
  const [preview, setPreview] = useState<string>('');
  const [newProfilePic, setNewProfilePic] = useState<File | null>(null);
  const [removeProfilePic, setRemoveProfilePic] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const profilePicInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Add class to body/html for background styling
    if (typeof window !== 'undefined') {
      document.body.classList.add('profile-page');
      document.documentElement.classList.add('profile-page');
    }
    
    // Get current user ID for comparison
    const loadCurrentUser = async () => {
      const { getUserId } = await import('@/utils/socketAuth');
      const userId = getUserId();
      setCurrentUserId(userId);
    };
    loadCurrentUser();
    
    fetchUserProfile();
    
    // Cleanup: remove class on unmount
    return () => {
      if (typeof window !== 'undefined') {
        document.body.classList.remove('profile-page');
        document.documentElement.classList.remove('profile-page');
      }
    };
  }, []);

  useEffect(() => {
    // Fetch posts based on profile type
    if (user?.id && activeTab === 'posts') {
      if (isOwnProfile) {
        fetchUserPosts();
      } else if (currentUserId && viewedUserId) {
        fetchSharedCirclePosts();
      }
    } else if (isOwnProfile && user?.id && activeTab === 'gallery') {
      fetchUserGallery();
    }
  }, [activeTab, user?.id, isOwnProfile, currentUserId, viewedUserId]);


  async function fetchUserProfile() {
    try {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        const matches = path.match(/\/profile\/(.+)$/);
        const idFromPath = matches ? matches[1] : null;
        setViewedUserId(idFromPath);

        if (idFromPath) {
          // Public viewer mode: fetch by user id
          // First, ensure we have currentUserId for comparison
          const { getUserId } = await import('@/utils/socketAuth');
          const currentId = getUserId();
          if (currentId) {
            setCurrentUserId(currentId);
          }
          
          // Double-check: if viewing own profile, redirect to /profile (no ID in URL)
          if (currentId && idFromPath === currentId) {
            router.replace('/profile');
            return;
          }
          
          const { getApiUrl } = await import('@/utils/apiUtils');
          const res = await fetch(`${getApiUrl()}/get-user-profile/by-id/${idFromPath}`);
          const { safeJson } = await import('@/utils/apiUtils');
          const data = await safeJson<any>(res);
          if (data.success && data.user) {
            setUser(data.user);
            setViewedUserId(idFromPath);
          } else {
            router.replace('/dashboard');
          }
          setLoading(false);
          return;
        }

        // Self profile mode (requires token)
        // Use Socket.IO first, then fallback
        const { ensureAuth, getAuthToken } = await import('@/utils/socketAuth');
        const { token, userData } = await ensureAuth();
        
        if (!token) {
          router.replace('/');
          return;
        }

        // Try to get user from Socket.IO first
        if (userData) {
          setUser(userData);
        }

        // Fetch fresh user data from backend using Socket.IO token
        const authToken = getAuthToken();
        const { getApiUrl } = await import('@/utils/apiUtils');
        const res = await fetch(`${getApiUrl()}/get-user-profile`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${authToken}` },
        });
        const { safeJson } = await import('@/utils/apiUtils');
        const data = await safeJson<any>(res);
        if (data.success && data.user) {
          setUser(data.user);
          // Always set currentUserId when fetching own profile
          if (data.user.id) {
            setCurrentUserId(data.user.id);
          }
          // Update tab-specific storage
          const tabId = sessionStorage.getItem('socket_tab_id');
          if (tabId) {
            sessionStorage.setItem(`tab_user_data_${tabId}`, JSON.stringify(data.user));
            const { registerTabAuth } = await import('@/utils/socketAuth');
            registerTabAuth(data.user.id, authToken || '', data.user).catch(() => {});
          }
        }
      }
    } catch (err) {
      const { getApiErrorMessage } = await import('@/utils/apiUtils');
      setError(getApiErrorMessage(err, 'Unable to load profile. Make sure the backend is running.'));
    } finally {
      setLoading(false);
    }
  }

  function openEditModal() {
    if (!user || !isOwnProfile) {
      console.warn('Cannot edit profile: Not own profile');
      return;
    }
    
    // Initialize edit form with current values
    setEditFullName(user.fullName || '');
    setEditBio(user.bio || '');
    setEditDob(user.dob?.split('T')[0] || '');
    setEditGender(user.gender || '');
    setPreview(user.profilePic || '/images/default_profile.png');
    setNewProfilePic(null);
    setRemoveProfilePic(false);
    setError(null);
    setSuccess(null);
    setShowEditModal(true);
  }

  function closeEditModal() {
    setShowEditModal(false);
    setNewProfilePic(null);
    setRemoveProfilePic(false);
    setError(null);
    setSuccess(null);
  }

  async function handleRemovePhoto() {
    const { confirmDialog } = await import('@/utils/confirmDialog');
    const confirmed = await confirmDialog('Are you sure you want to remove your profile picture?', 'Remove', 'Cancel');
    if (confirmed) {
      setPreview('/images/default_profile.png');
      setNewProfilePic(null);
      setRemoveProfilePic(true);
      console.log('🗑️ Profile picture marked for removal');
    }
  }

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOwnProfile) {
      console.warn('Cannot change profile picture: Not own profile');
      return;
    }
    
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast('Please select an image file', 'error');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast('Image size should be less than 5MB', 'error');
      return;
    }
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('email', user?.email || '');
      formData.append('full_name', user?.fullName || '');
      formData.append('bio', user?.bio || '');
      formData.append('dob', user?.dob || '');
      formData.append('gender', user?.gender || '');
      formData.append('profile_pic', file);

      const { getApiUrl } = await import('@/utils/apiUtils');
      const res = await fetch(`${getApiUrl()}/profile-setup`, {
        method: 'POST',
        body: formData
      });

      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(res);
      
      if (data.success && data.profile) {
        const updatedUser = {
          ...user!,
          profilePic: data.profile.profile_pic
        };
        setUser(updatedUser);
        const tid = sessionStorage.getItem('socket_tab_id');
        if (tid) {
          sessionStorage.setItem(`tab_user_data_${tid}`, JSON.stringify(updatedUser));
        }
        const { showToast } = await import('@/components/ToastContainer');
        showToast('Profile picture updated successfully!', 'success');
      } else {
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        const { showToast } = await import('@/components/ToastContainer');
        showToast(sanitizeErrorMessage(data.message || 'Failed to upload profile picture'), 'error');
      }
    } catch (error) {
      console.error('Profile picture upload error:', error);
      const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
      const { showToast } = await import('@/components/ToastContainer');
      showToast('Failed to upload profile picture: ' + sanitizeErrorMessage(error), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }
    
    setNewProfilePic(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
    setRemoveProfilePic(false); // Reset remove flag if user selects new photo
    setError(null);
  };

  async function handleSaveProfile() {
    if (!isOwnProfile) {
      console.warn('Cannot save profile: Not own profile');
      return;
    }
    
    setError(null);
    setSuccess(null);
    
    if (!editFullName.trim()) {
      setError('Full name is required');
      return;
    }
    
    setSaving(true);
    
    try {
      console.log('💾 Saving profile with data:', {
        email: user?.email,
        full_name: editFullName,
        bio: editBio.substring(0, 30) + '...',
        dob: editDob,
        gender: editGender,
        hasNewPhoto: !!newProfilePic,
        currentProfilePic: user?.profilePic
      });

      const formData = new FormData();
      formData.append('email', user?.email || '');
      formData.append('full_name', editFullName);
      formData.append('bio', editBio);
      
      // Always send existing values if not changed
      formData.append('dob', editDob || user?.dob || '');
      formData.append('gender', editGender || user?.gender || '');
      
      // Handle profile picture
      if (removeProfilePic) {
        console.log('🗑️ Removing profile picture - setting to default');
        formData.append('remove_profile_pic', 'true');
      } else if (newProfilePic) {
        console.log('📸 Including new profile picture in upload');
        formData.append('profile_pic', newProfilePic);
      } else {
        console.log('ℹ️ No new profile picture, keeping existing:', user?.profilePic);
      }

      const { getApiUrl } = await import('@/utils/apiUtils');
      const res = await fetch(`${getApiUrl()}/profile-setup`, {
        method: 'POST',
        body: formData
      });

      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(res);
      console.log('📥 Profile update response:', data);
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update profile');
      }

      if (data.profile) {
        console.log('✅ Profile data received from backend:', data.profile);
        const profilePicToUse = removeProfilePic 
          ? '/images/default_profile.png'
          : data.profile.profile_pic || user?.profilePic || '/images/default_profile.png';
        
        const updatedUser = {
          ...user!,
          fullName: data.profile.full_name || user!.fullName,
          bio: data.profile.bio !== undefined ? data.profile.bio : user!.bio,
          dob: data.profile.dob || user!.dob,
          gender: data.profile.gender || user!.gender,
          profilePic: profilePicToUse,
          hasProfile: true
        };
        
        setUser(updatedUser);
        const tid = sessionStorage.getItem('socket_tab_id');
        if (tid) {
          sessionStorage.setItem(`tab_user_data_${tid}`, JSON.stringify(updatedUser));
        }
      }

      setSuccess('Profile updated successfully!');
      
      setTimeout(() => {
        closeEditModal();
      }, 1500);
      
    } catch (err: any) {
      console.error('❌ Profile update error:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function fetchUserPosts() {
    if (!user?.id) return;
    
    try {
      setLoadingPosts(true);
      const { getApiUrl } = await import('@/utils/apiUtils');
      const response = await fetch(`${getApiUrl()}/user-posts/${user.id}`);
      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);
      
      if (data.success) {
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error("Error fetching user posts:", error);
    } finally {
      setLoadingPosts(false);
    }
  }

  async function fetchSharedCirclePosts() {
    if (!user?.id || !currentUserId) return;
    
    try {
      setLoadingPosts(true);
      const { getApiUrl } = await import('@/utils/apiUtils');
      const response = await fetch(
        `${getApiUrl()}/posts/shared-circle-posts?viewer_id=${currentUserId}&profile_user_id=${user.id}`
      );
      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);
      
      if (data.success) {
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error("Error fetching shared circle posts:", error);
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }

  async function fetchUserGallery() {
    if (!user?.id) return;
    
    try {
      setLoadingGallery(true);
      const { getApiUrl } = await import('@/utils/apiUtils');
      const response = await fetch(`${getApiUrl()}/user-gallery/${user.id}`);
      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);
      
      if (data.success) {
        setGallery(data.gallery || []);
      }
    } catch (error) {
      console.error("Error fetching user gallery:", error);
    } finally {
      setLoadingGallery(false);
    }
  }

  function getTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return `${Math.floor(seconds / 604800)}w`;
  }


  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.errorContainer}>
        <i className="fas fa-exclamation-circle"></i>
        <h2>Unable to load profile</h2>
        <p>{error ? error : <>Please <Link href="/">login</Link> to continue.</>}</p>
      </div>
    );
  }

  return (
    <div className={styles.profileWrapper}>
      {/* Navigation Component */}
      <Navigation />

      <div className={styles.container}>
        {error && (
          <div className={styles.errorBanner}>
            <i className="fas fa-exclamation-triangle"></i>
            {error}
          </div>
        )}
        {/* Profile Header */}
        <div className={styles.profileHeader}>
          <div className={styles.profilePicWrapper}>
            {isOwnProfile ? (
              <>
                <label htmlFor="profilePicInput" className={styles.profilePicLabel}>
                  <img
                    src={user.profilePic || "/images/default_profile.png"}
                    alt="Profile Picture"
                    className={styles.profileAvatar}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/images/default_profile.png";
                    }}
                  />
                  {uploading && <div className={styles.uploadingOverlay}>Uploading...</div>}
                </label>
                <input
                  ref={profilePicInputRef}
                  type="file"
                  id="profilePicInput"
                  accept="image/*"
                  onChange={handleProfilePicChange}
                  style={{ display: 'none' }}
                />
              </>
            ) : (
              <div className={styles.profilePicLabel}>
                <img
                  src={user.profilePic || "/images/default_profile.png"}
                  alt="Profile Picture"
                  className={styles.profileAvatar}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/default_profile.png";
                  }}
                />
              </div>
            )}
          </div>

          <h2 className={styles.profileName}>{user.fullName}</h2>

          <div className={styles.profileBio}>
            {user.bio || 'No bio yet'}
          </div>

          <div className={styles.profileActions}>
            {!isOwnProfile ? (
              <button 
                onClick={() => router.push(`/chat?user=${user.id || viewedUserId}`)}
                className={styles.messageBtn}
              >
                <i className="fas fa-paper-plane"></i> Message
              </button>
            ) : (
              <button onClick={openEditModal} className={styles.editBtn}>
                <i className="fas fa-edit"></i> Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Tabs Navigation - Only show if viewing own profile */}
        {isOwnProfile ? (
          <ul className={styles.navTabs}>
            <li className={styles.navItem}>
              <button
                className={`${styles.navLink} ${activeTab === 'posts' ? styles.active : ''}`}
                onClick={() => setActiveTab('posts')}
              >
                <i className="fas fa-stream"></i> Posts
              </button>
            </li>
            <li className={styles.navItem}>
              <button
                className={`${styles.navLink} ${activeTab === 'gallery' ? styles.active : ''}`}
                onClick={() => setActiveTab('gallery')}
              >
                <i className="fas fa-images"></i> Gallery
              </button>
            </li>
            <li className={styles.navItem}>
              <button
                className={`${styles.navLink} ${activeTab === 'about' ? styles.active : ''}`}
                onClick={() => setActiveTab('about')}
              >
                <i className="fas fa-info-circle"></i> About
              </button>
            </li>
          </ul>
        ) : (
          <div className={styles.sharedPostsHeader}>
            <h3><i className="fas fa-users"></i> Posts in Shared Circles</h3>
          </div>
        )}

        {/* Tab Content - Only show if viewing own profile */}
        {isOwnProfile ? (
          <div className={styles.tabContent}>
            {/* Posts Tab */}
            {activeTab === 'posts' && (
            <div className={styles.tabPane}>
              {loadingPosts ? (
                <div className={styles.loadingState}>
                  <div className={styles.loadingSpinner}></div>
                  <p>Loading posts...</p>
                </div>
              ) : posts.length > 0 ? (
                <div className={styles.postsContainer}>
                  {posts.map(post => (
                    <div key={post.id} className={styles.postCard}>
                      <div className={styles.postHeader}>
                        <div className={styles.postUser}>
                          <img 
                            src={post.user.profilePic || '/images/default_profile.png'} 
                            alt={post.user.fullName}
                            className={styles.postUserAvatar}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/images/default_profile.png';
                            }}
                          />
                          <div className={styles.postUserInfo}>
                            <span className={styles.postUserName}>{post.user.fullName}</span>
                            <span className={styles.postTime}>{getTimeAgo(post.created_at)} ago</span>
                          </div>
                        </div>
                      </div>

                      {post.content && (
                        <div className={styles.postContent}>
                          <p>{post.content}</p>
                        </div>
                      )}

                      {post.media_files.length > 0 && (
                        <div className={styles.postMedia}>
                          {post.media_files.length === 1 ? (
                            post.media_files[0].type === 'video' ? (
                              <video 
                                src={post.media_files[0].file} 
                                controls 
                                className={styles.singleMedia}
                                preload="metadata"
                                playsInline
                                style={{ 
                                  width: '100%', 
                                  maxHeight: '600px', 
                                  height: 'auto', 
                                  objectFit: 'contain', 
                                  borderRadius: '8px',
                                  backgroundColor: '#000'
                                }}
                              >
                                <source src={post.media_files[0].file} type="video/mp4" />
                                <source src={post.media_files[0].file} type="video/webm" />
                                Your browser does not support the video tag.
                              </video>
                            ) : (
                              <img src={post.media_files[0].file} alt="Post media" className={styles.singleMedia} />
                            )
                          ) : (
                            <div className={styles.mediaGrid}>
                              {post.media_files.map((media, index) => (
                                <div key={index} className={styles.mediaItem}>
                                  {media.type === 'video' ? (
                                    <video 
                                      src={media.file} 
                                      controls 
                                      className={styles.mediaFile}
                                      style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px' }}
                                    >
                                      Your browser does not support the video tag.
                                    </video>
                                  ) : (
                                    <img src={media.file} alt={`Post media ${index + 1}`} className={styles.mediaFile} />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className={styles.postActions}>
                        <button className={styles.actionBtn}>
                          <i className="far fa-heart"></i>
                          <span>{post.like_count}</span>
                        </button>
                        <button className={styles.actionBtn}>
                          <i className="far fa-comment"></i>
                          <span>{post.comment_count}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <i className="fas fa-stream"></i>
                  <h3>No posts yet</h3>
                  <p>Share your first post with your friends</p>
                  <Link href="/dashboard" className={styles.createPostBtn}>
                    Create Post
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Gallery Tab */}
          {activeTab === 'gallery' && (
            <div className={styles.tabPane}>
              {loadingGallery ? (
                <div className={styles.loadingState}>
                  <div className={styles.loadingSpinner}></div>
                  <p>Loading gallery...</p>
                </div>
              ) : gallery.length > 0 ? (
                <div className={styles.galleryGrid}>
                  {gallery.map(item => (
                    <div key={item.id} className={styles.galleryItem} onClick={() => setSelectedMedia({url: item.file, type: item.type})}>
                      {item.type === 'video' ? (
                        <video 
                          src={item.file} 
                          controls 
                          className={styles.galleryImg}
                          style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px' }}
                        >
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <img src={item.file} className={styles.galleryImg} alt="Gallery item" />
                      )}
                      <div className={styles.galleryOverlay}>
                        <i className="fas fa-eye"></i>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <i className="fas fa-images"></i>
                  <h3>No photos yet</h3>
                  <p>Upload your first photo</p>
                  <Link href="/dashboard" className={styles.createPostBtn}>
                    Upload Photo
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* About Tab */}
          {activeTab === 'about' && (
            <div className={styles.tabPane}>
              <div className={styles.aboutSection}>
                <h5 className={styles.aboutTitle}>
                  <i className="fas fa-info-circle"></i> About
                </h5>

                <div className={styles.aboutItem}>
                  <i className="fas fa-birthday-cake"></i>
                  <div className={styles.aboutItemContent}>
                    <small>Birthday</small>
                    <p>{user.dob ? new Date(user.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not specified'}</p>
                  </div>
                </div>

                <div className={styles.aboutItem}>
                  <i className="fas fa-venus-mars"></i>
                  <div className={styles.aboutItemContent}>
                    <small>Gender</small>
                    <p>{user.gender === 'M' ? 'Male' : user.gender === 'F' ? 'Female' : user.gender === 'O' ? 'Other' : 'Not specified'}</p>
                  </div>
                </div>

                <div className={styles.aboutItem}>
                  <i className="fas fa-envelope"></i>
                  <div className={styles.aboutItemContent}>
                    <small>Email</small>
                    <p>{user.email}</p>
                  </div>
                </div>

                {user.phone && (
                  <div className={styles.aboutItem}>
                    <i className="fas fa-phone"></i>
                    <div className={styles.aboutItemContent}>
                      <small>Phone</small>
                      <p>{user.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
        ) : (
          <div className={styles.tabContent}>
            {/* Show shared circle posts when viewing another user */}
            {activeTab === 'posts' && (
              <div className={styles.tabPane}>
                {loadingPosts ? (
                  <div className={styles.loadingState}>
                    <div className={styles.loadingSpinner}></div>
                    <p>Loading posts...</p>
                  </div>
                ) : posts.length > 0 ? (
                  <div className={styles.postsContainer}>
                    {posts.map(post => (
                      <div key={post.id} className={styles.postCard}>
                        <div className={styles.postHeader}>
                          <div className={styles.postUser}>
                            <img 
                              src={post.user.profilePic || '/images/default_profile.png'} 
                              alt={post.user.fullName}
                              className={styles.postUserAvatar}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/images/default_profile.png';
                              }}
                            />
                            <div className={styles.postUserInfo}>
                              <span className={styles.postUserName}>{post.user.fullName}</span>
                              <span className={styles.postTime}>{getTimeAgo(post.created_at)} ago</span>
                              {post.circle && (
                                <span className={styles.postCircle}>
                                  <i className="fas fa-users"></i> {post.circle.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {post.content && (
                          <div className={styles.postContent}>
                            <p>{post.content}</p>
                          </div>
                        )}

                        {post.media_files && post.media_files.length > 0 && (
                          <div className={styles.postMedia}>
                            {post.media_files.length === 1 ? (
                              post.media_files[0].type === 'video' ? (
                                <video 
                                  src={post.media_files[0].file} 
                                  controls 
                                  className={styles.singleMedia}
                                  preload="metadata"
                                  playsInline
                                  style={{ 
                                    width: '100%', 
                                    maxHeight: '600px', 
                                    height: 'auto', 
                                    objectFit: 'contain',
                                    borderRadius: '8px',
                                    backgroundColor: '#000'
                                  }}
                                >
                                  <source src={post.media_files[0].file} type="video/mp4" />
                                  <source src={post.media_files[0].file} type="video/webm" />
                                  Your browser does not support the video tag.
                                </video>
                              ) : (
                                <img src={post.media_files[0].file} alt="Post media" className={styles.singleMedia} />
                              )
                            ) : (
                              <div className={styles.mediaGrid}>
                                {post.media_files.map((media: MediaFile, index: number) => (
                                  <div key={index} className={styles.mediaItem}>
                                    {media.type === 'video' ? (
                                      <video 
                                        src={media.file} 
                                        controls 
                                        className={styles.mediaFile}
                                        preload="metadata"
                                        playsInline
                                        style={{ 
                                          width: '100%', 
                                          height: '150px', 
                                          objectFit: 'contain',
                                          borderRadius: '8px',
                                          backgroundColor: '#000'
                                        }}
                                      >
                                        <source src={media.file} type="video/mp4" />
                                        <source src={media.file} type="video/webm" />
                                        Your browser does not support the video tag.
                                      </video>
                                    ) : (
                                      <img src={media.file} alt={`Post media ${index + 1}`} className={styles.mediaFile} />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className={styles.postActions}>
                          <button className={styles.actionBtn}>
                            <i className="far fa-heart"></i>
                            <span>{post.like_count || 0}</span>
                          </button>
                          <button className={styles.actionBtn}>
                            <i className="far fa-comment"></i>
                            <span>{post.comment_count || 0}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <i className="fas fa-stream"></i>
                    <h3>No shared posts</h3>
                    <p>This user hasn't posted in any circles you both belong to.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Profile Modal - Only show for own profile */}
      {showEditModal && isOwnProfile && (
        <div className={styles.modalOverlay} onClick={closeEditModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Edit Profile</h3>
              <button className={styles.closeBtn} onClick={closeEditModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className={styles.modalBody}>
              {error && (
                <div className={styles.errorMessage}>
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </div>
              )}
              
              {success && (
                <div className={styles.successMessage}>
                  <i className="fas fa-check-circle"></i>
                  {success}
                </div>
              )}

              {/* Profile Picture */}
              <div className={styles.editPhotoSection}>
                <div className={styles.editPhotoPreview}>
                  <img
                    src={preview}
                    alt="Profile Preview"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/images/default_profile.png";
                    }}
                  />
                </div>
                <div className={styles.photoButtonGroup}>
                  <button
                    type="button"
                    className={styles.changePhotoBtn}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <i className="fas fa-camera"></i> Change Photo
                  </button>
                  {preview !== '/images/default_profile.png' && !removeProfilePic && (
                    <button
                      type="button"
                      className={styles.removePhotoBtn}
                      onClick={handleRemovePhoto}
                    >
                      <i className="fas fa-trash"></i> Remove Photo
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleEditPhotoChange}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Full Name */}
              <div className={styles.formGroup}>
                <label htmlFor="editFullName">
                  <i className="fas fa-user"></i> Full Name
                </label>
                <input
                  id="editFullName"
                  type="text"
                  className={styles.formInput}
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* Bio */}
              <div className={styles.formGroup}>
                <label htmlFor="editBio">
                  <i className="fas fa-comment"></i> Bio
                </label>
                <textarea
                  id="editBio"
                  className={styles.formTextarea}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  maxLength={500}
                />
                <small className={styles.charCount}>{editBio.length}/500 characters</small>
              </div>

              {/* Date of Birth */}
              <div className={styles.formGroup}>
                <label htmlFor="editDob">
                  <i className="fas fa-birthday-cake"></i> Date of Birth
                </label>
                <input
                  id="editDob"
                  type="date"
                  className={styles.formInput}
                  value={editDob}
                  onChange={(e) => setEditDob(e.target.value)}
                />
              </div>

              {/* Gender */}
              <div className={styles.formGroup}>
                <label htmlFor="editGender">
                  <i className="fas fa-venus-mars"></i> Gender
                </label>
                <select
                  id="editGender"
                  className={styles.formInput}
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                >
                  <option value="">Select Gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>

              {/* Email (Read Only) */}
              <div className={styles.formGroup}>
                <label>
                  <i className="fas fa-envelope"></i> Email
                </label>
                <input
                  type="email"
                  className={styles.formInput}
                  value={user.email}
                  disabled
                />
                <small className={styles.helpText}>Email cannot be changed</small>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={closeEditModal}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Preview Modal */}
      {selectedMedia && (
        <div className={styles.mediaModal} onClick={() => setSelectedMedia(null)}>
          <span className={styles.closeMediaBtn} onClick={() => setSelectedMedia(null)}>&times;</span>
          <div className={styles.mediaModalContent} onClick={(e) => e.stopPropagation()}>
            {selectedMedia.type === 'video' ? (
              <video controls autoPlay className={styles.modalMedia}>
                <source src={selectedMedia.url} type="video/mp4" />
              </video>
            ) : (
              <img src={selectedMedia.url} alt="Preview" className={styles.modalMedia} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
