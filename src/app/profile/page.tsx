"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'gallery' | 'about'>('posts');
  const [showUserMenu, setShowUserMenu] = useState(false);
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
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (user?.id && activeTab === 'posts') {
      fetchUserPosts();
    } else if (user?.id && activeTab === 'gallery') {
      fetchUserGallery();
    }
  }, [activeTab, user?.id]);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (showUserMenu && !target.closest('[class*="userMenu"]')) {
        setShowUserMenu(false);
      }
    }

    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

  async function fetchUserProfile() {
    try {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("auth_token");
        const path = window.location.pathname;
        const matches = path.match(/\/profile\/(.+)$/);
        const idFromPath = matches ? matches[1] : null;
        setViewedUserId(idFromPath);

        if (idFromPath) {
          // Public viewer mode: fetch by user id
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/get-user-profile/by-id/${idFromPath}`);
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
          } else {
            router.replace('/dashboard');
          }
          setLoading(false);
          return;
        }

        // Self profile mode (requires token)
        if (!token) {
          router.replace('/');
          return;
        }

        const userStr = localStorage.getItem("user");
        if (userStr) {
          const userData = JSON.parse(userStr);
          setUser(userData);
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/get-user-profile`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);
    }
  }

  function openEditModal() {
    if (!user) return;
    
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

  function handleRemovePhoto() {
    if (confirm('Are you sure you want to remove your profile picture?')) {
      setPreview('/images/default_profile.png');
      setNewProfilePic(null);
      setRemoveProfilePic(true);
      console.log('🗑️ Profile picture marked for removal');
    }
  }

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
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

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/profile-setup`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      
      if (data.success && data.profile) {
        const updatedUser = {
          ...user!,
          profilePic: data.profile.profile_pic
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        alert('Profile picture updated successfully!');
      } else {
        alert('Failed to upload profile picture');
      }
    } catch (error) {
      console.error('Profile picture upload error:', error);
      alert('Failed to upload profile picture');
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

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/profile-setup`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
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
        localStorage.setItem('user', JSON.stringify(updatedUser));
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/user-posts/${user.id}`);
      const data = await response.json();
      
      if (data.success) {
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error("Error fetching user posts:", error);
    } finally {
      setLoadingPosts(false);
    }
  }

  async function fetchUserGallery() {
    if (!user?.id) return;
    
    try {
      setLoadingGallery(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/user-gallery/${user.id}`);
      const data = await response.json();
      
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

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      localStorage.removeItem("auth_token");
    }
    router.replace("/");
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
        <p>Please <Link href="/">login</Link> to continue.</p>
      </div>
    );
  }

  return (
    <div className={styles.profileWrapper}>
      {/* Top Navigation */}
      <nav className={styles.topNav}>
        <div className={styles.navContainer}>
          <Link href="/dashboard" className={styles.navBrand}>
            <img src="/images/logo.png" alt="Chautari" className={styles.logoImg} />
          </Link>
          
          <div className={styles.navCenter}>
            <div className={styles.searchBar}>
              <i className="fas fa-search"></i>
              <input type="text" placeholder="Search Chautari..." />
            </div>
          </div>

          <div className={styles.navRight}>
            <Link href="/dashboard" className={styles.navIconBtn} title="Home">
              <i className="fas fa-home"></i>
            </Link>
            <button className={styles.navIconBtn} title="Notifications">
              <i className="fas fa-bell"></i>
              <span className={styles.notificationBadge}>0</span>
            </button>
            <Link href="/messenger" className={styles.navIconBtn} title="Messages">
              <i className="fas fa-envelope"></i>
            </Link>
            
            <div className={styles.userMenu}>
              <button 
                className={styles.userMenuBtn}
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <img
                  src={user.profilePic || "/images/default_profile.png"}
                  alt="Profile"
                  className={styles.userAvatar}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/default_profile.png";
                  }}
                />
                <span className={styles.userName}>{user.fullName || "User"}</span>
                <i className="fas fa-chevron-down"></i>
              </button>
              {showUserMenu && (
                <div className={styles.dropdownMenu}>
                  <Link href="/profile" className={styles.dropdownItem}>
                    <i className="fas fa-user"></i> My Profile
                  </Link>
                  <Link href="/dashboard" className={styles.dropdownItem}>
                    <i className="fas fa-home"></i> Dashboard
                  </Link>
                  <hr className={styles.dropdownDivider} />
                  <button onClick={handleLogout} className={`${styles.dropdownItem} ${styles.logoutBtn}`}>
                    <i className="fas fa-sign-out-alt"></i> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className={styles.container}>
        {/* Profile Header */}
        <div className={styles.profileHeader}>
          <div className={styles.profilePicWrapper}>
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
          </div>

          <h2 className={styles.profileName}>{user.fullName}</h2>

          <div className={styles.profileBio}>
            {user.bio || 'No bio yet'}
          </div>

          <div className={styles.profileActions}>
            {viewedUserId ? (
              <>
                <Link href={`/messenger?to=${user.id || viewedUserId}`} className={styles.messageBtn}>
                  <i className="fas fa-paper-plane"></i> Message
                </Link>
              </>
            ) : (
              <button onClick={openEditModal} className={styles.editBtn}>
                <i className="fas fa-edit"></i> Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Tabs Navigation */}
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

        {/* Tab Content */}
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
                              <video controls className={styles.singleMedia}>
                                <source src={post.media_files[0].file} type="video/mp4" />
                              </video>
                            ) : (
                              <img src={post.media_files[0].file} alt="Post media" className={styles.singleMedia} />
                            )
                          ) : (
                            <div className={styles.mediaGrid}>
                              {post.media_files.map((media, index) => (
                                <div key={index} className={styles.mediaItem}>
                                  {media.type === 'video' ? (
                                    <video controls className={styles.mediaFile}>
                                      <source src={media.file} type="video/mp4" />
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
                        <video className={styles.galleryImg} muted>
                          <source src={item.file} type="video/mp4" />
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
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
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
