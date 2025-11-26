"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./circle.module.css";

interface User {
  id: string;
  email: string;
  fullName: string;
  profilePic: string;
  full_name?: string; // backend variant
  profile_pic?: string; // backend variant
  is_admin?: boolean;
}

interface MediaFile {
  file: string;
  type: string;
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  user: User;
  media_files: MediaFile[];
  like_count: number;
  user_liked: boolean;
  comment_count: number;
}

interface Circle {
  id: string;
  name: string;
  description: string;
  rules: string;
  cover_image: string;
  visibility: string;
  member_count: number;
  is_member: boolean;
  is_admin: boolean;
  is_restricted: boolean;
  is_banned: boolean;
  restricted_until?: string;
  created_by: User;
  members: User[];
  posts: Post[];
  pending_posts_count?: number;
  reported_posts_count?: number;
  flagged_posts_count?: number;
  pending_users_count?: number;
  total_pending?: number;
}

export default function CircleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [circle, setCircle] = useState<Circle | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postMedia, setPostMedia] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const [showPostMenu, setShowPostMenu] = useState<string | null>(null);
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      console.log("👤 Circle page - User data:", userData);
      console.log("🖼️ Circle page - Profile pic:", userData.profilePic);
      
      // Ensure correct data structure
      const userWithProfile = {
        ...userData,
        profilePic: userData.profilePic || userData.profile_pic || "/images/default_profile.png",
        fullName: userData.fullName || userData.full_name || "User"
      };
      
      console.log("✅ Circle page - Final user:", userWithProfile);
      setCurrentUser(userWithProfile);
    }
    fetchCircleDetails();
  }, [id]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (showAdminDropdown && !target.closest('[class*="circleActions"]')) {
        setShowAdminDropdown(false);
      }
      if (showPostMenu && !target.closest('[class*="postOptionsDropdown"]')) {
        setShowPostMenu(null);
      }
      if (showUserMenu && !target.closest('[class*="userMenu"]')) {
        setShowUserMenu(false);
      }
    }

    if (showAdminDropdown || showPostMenu || showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showAdminDropdown, showPostMenu, showUserMenu]);

  const fetchCircleDetails = async () => {
    try {
      console.log("🔍 Fetching circle details for ID:", id);
      const userStr = localStorage.getItem("user");
      let user_id = null;
      if (userStr) {
        const userData = JSON.parse(userStr);
        user_id = userData.id || userData._id;
        console.log("👤 User ID:", user_id);
      }
      
      const url = `http://localhost:5000/circle-details/${id}?user_id=${user_id || ''}`;
      console.log("🌐 API URL:", url);
      
      const response = await fetch(url);
      console.log("📡 Response status:", response.status);
      
      const data = await response.json();
      console.log("📦 Response data:", data);

      if (data.success) {
        console.log("✅ Circle found:", data.circle);
        setCircle(data.circle);
      } else {
        console.error("❌ Failed to fetch circle:", data.message);
        // Don't set circle to null, keep loading state
      }
    } catch (error) {
      console.error("💥 Error fetching circle:", error);
      // Don't set circle to null, keep loading state
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCircle = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch('http://localhost:5000/circles/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          circle_id: id
        })
      });

      const data = await response.json();
      if (data.success) {
        fetchCircleDetails(); // Refresh circle data
      }
    } catch (error) {
      console.error("Error joining circle:", error);
    }
  };

  const handleLeaveCircle = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch('http://localhost:5000/circles/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          circle_id: id
        })
      });

      const data = await response.json();
      if (data.success) {
        fetchCircleDetails(); // Refresh circle data
      }
    } catch (error) {
      console.error("Error leaving circle:", error);
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;

    try {
      const response = await fetch('http://localhost:5000/toggle-like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          user_id: currentUser.id
        })
      });

      const data = await response.json();
      if (data.success && circle) {
        setCircle({
          ...circle,
          posts: circle.posts.map(post =>
            post.id === postId
              ? { ...post, user_liked: data.liked, like_count: data.like_count }
              : post
          )
        });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !postContent.trim()) return;

    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('content', postContent.trim());
      formData.append('user_id', currentUser.id);
      formData.append('circle_id', id);
      
      // Append multiple media files
      if (postMedia && postMedia.length > 0) {
        postMedia.forEach((file) => {
          formData.append('media', file);
        });
      }

      const response = await fetch('http://localhost:5000/create-post', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message); // Show approval status message
        setPostContent('');
        setPostMedia([]);
        setShowCreatePost(false);
        fetchCircleDetails(); // Refresh posts
      } else {
        alert(data.message || 'Failed to create post');
      }
    } catch (error) {
      console.error("Error creating post:", error);
      alert('Failed to create post');
    } finally {
      setCreating(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading circle...</p>
      </div>
    );
  }

  if (!loading && !circle) {
    return (
      <div className={styles.errorContainer}>
        <h2>Circle not found</h2>
        <p>The circle you&apos;re looking for doesn&apos;t exist.</p>
        <p>Circle ID: {id}</p>
        <Link href="/circles" className={styles.backBtn}>
          Back to Circles
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Top Navigation */}
      <nav className={styles.topNav}>
        <div className={styles.navContainer}>
          <Link href="/dashboard" className={styles.navBrand}>
            <img src="/images/logo.png" alt="Chautari" className={styles.logoImg} />
          </Link>
          
          <div className={styles.navCenter}>
            <div className={styles.searchBar}>
              <i className="fas fa-search"></i>
              <input type="text" placeholder="Search circles..." />
            </div>
          </div>

          <div className={styles.navRight}>
            <Link href="/dashboard" className={styles.navIconBtn} title="Home">
              <i className="fas fa-home"></i>
            </Link>
            
            <div className={styles.userMenu}>
              <button 
                className={styles.userMenuBtn}
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {currentUser?.profilePic && currentUser.profilePic !== "/images/default_profile.png" ? (
                  <img
                    src={currentUser.profilePic}
                    alt="Profile"
                    className={styles.userAvatar}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      console.log("❌ Failed to load profile pic:", currentUser?.profilePic);
                      target.src = "/images/default_profile.png";
                    }}
                  />
                ) : (
                  <div className={styles.userAvatarPlaceholder}>
                    {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                <span className={styles.userName}>{currentUser?.fullName || "User"}</span>
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
                  <Link href="/circles" className={styles.dropdownItem}>
                    <i className="fas fa-circle"></i> Circles
                  </Link>
                  <hr className={styles.dropdownDivider} />
                  <button onClick={() => {
                    localStorage.removeItem("user");
                    localStorage.removeItem("auth_token");
                    router.replace("/");
                  }} className={`${styles.dropdownItem} ${styles.logoutBtn}`}>
                    <i className="fas fa-sign-out-alt"></i> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Circle Hero Section */}
      <div className={styles.circleHero}>
        <div 
          className={styles.circleCover}
          style={{ backgroundImage: `url(${circle.cover_image || '/images/banner.png'})` }}
        >
          <div className={styles.coverOverlay}>
            <div className={styles.circleHeaderContent}>
              <div className={styles.circleTitleContainer}>
                <h1 className={styles.circleTitle}>{circle.name}</h1>
                <Link href="/circles" className={styles.backToCirclesBtn}>
                  <i className="fas fa-arrow-left"></i> Back to Circles
                </Link>
              </div>
              <p className={styles.circleSubtitle}>
                <i className="fas fa-users"></i>
                {circle.member_count} members
              </p>
              <span className={`${styles.visibilityBadge} ${styles[circle.visibility]}`}>
                <i className={`fas fa-${circle.visibility === 'public' ? 'globe' : 'lock'}`}></i>
                {circle.visibility === 'public' ? 'Public' : 'Private'}
              </span>
            </div>
          </div>
          
          {/* Admin Actions Dropdown */}
          {circle.is_admin && (
            <div className={styles.circleActions}>
              <button 
                className={styles.adminDropdownBtn}
                onClick={() => setShowAdminDropdown(!showAdminDropdown)}
              >
                <i className="fas fa-ellipsis-h"></i>
                {circle.total_pending && circle.total_pending > 0 && (
                  <span className={styles.notificationBadge}></span>
                )}
              </button>
              
              {showAdminDropdown && (
                <div className={styles.adminDropdownMenu}>
                  <Link href={`/circle/${id}/manage`} className={styles.dropdownItem}>
                    <i className="fas fa-users-cog"></i> Manage Circle
                  </Link>
                  <div className={styles.dropdownDivider}></div>
                  <Link href={`/circle/${id}/pending`} className={styles.dropdownItem}>
                    <span className={styles.dropdownLabel}>
                      <i className="fas fa-hourglass-half"></i> Pending Posts
                    </span>
                    {circle.pending_posts_count && circle.pending_posts_count > 0 && (
                      <span className={styles.badge}>{circle.pending_posts_count}</span>
                    )}
                  </Link>
                  <Link href={`/circle/${id}/reported`} className={styles.dropdownItem}>
                    <span className={styles.dropdownLabel}>
                      <i className="fas fa-flag"></i> Reported Posts
                    </span>
                    {circle.reported_posts_count && circle.reported_posts_count > 0 && (
                      <span className={styles.badge + ' ' + styles.warning}>{circle.reported_posts_count}</span>
                    )}
                  </Link>
                  <Link href={`/circle/${id}/flagged`} className={styles.dropdownItem}>
                    <span className={styles.dropdownLabel}>
                      <i className="fas fa-exclamation-triangle"></i> Flagged Content
                    </span>
                    {circle.flagged_posts_count && circle.flagged_posts_count > 0 && (
                      <span className={styles.badge + ' ' + styles.danger}>{circle.flagged_posts_count}</span>
                    )}
                  </Link>
                  <Link href={`/circle/${id}/pending-members`} className={styles.dropdownItem}>
                    <span className={styles.dropdownLabel}>
                      <i className="fas fa-user-clock"></i> Pending Users
                    </span>
                    {circle.pending_users_count && circle.pending_users_count > 0 && (
                      <span className={styles.badge + ' ' + styles.primary}>{circle.pending_users_count}</span>
                    )}
                  </Link>
                  <div className={styles.dropdownDivider}></div>
                  <Link href={`/circle/${id}/members`} className={styles.dropdownItem}>
                    <i className="fas fa-user-friends"></i> Manage Members
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid - Django Two Column Layout */}
      <div className={styles.circleInfoSection}>
        {/* Left Sidebar - Circle Info (Django Structure) */}
        <div className={styles.circleSidebar}>
          <div className={styles.circleDescription}>
            <p>{circle.description}</p>
          </div>

          {circle.rules && (
            <div className={styles.circleRules}>
              <strong>Community Guidelines</strong>
              <ul>
                {circle.rules.split('\n').map((line, index) => (
                  line.trim() && (
                    <li key={index}>{line}</li>
                  )
                ))}
              </ul>
            </div>
          )}

          <div className={styles.actionButtons}>
            {circle.is_member ? (
              <button 
                onClick={handleLeaveCircle}
                className={styles.actionBtn + ' ' + styles.btnLeave}
              >
                <i className="fas fa-sign-out-alt"></i> Leave Circle
              </button>
            ) : (
              <button 
                onClick={handleJoinCircle}
                className={styles.actionBtn + ' ' + styles.btnJoin}
              >
                <i className="fas fa-sign-in-alt"></i> Join Circle
              </button>
            )}

            {circle.is_admin && (
              <Link href={`/circle/${id}/manage`} className={styles.actionBtn + ' ' + styles.btnManage}>
                <i className="fas fa-cog"></i> Manage Circle
              </Link>
            )}
            
            {/* Moderation History Button */}
            <Link href={`/circle/${id}/moderation`} className={styles.moderationBtn}>
              <i className="fas fa-shield-alt"></i> View Moderation History
            </Link>
          </div>
        </div>

        {/* Right Main Content - Posts */}
        <div className={styles.circleMainContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Community Posts</h2>
            {(circle.is_member || circle.visibility !== 'private') && !circle.is_restricted && !circle.is_banned && (
              <button 
                onClick={() => setShowCreatePost(true)} 
                className={styles.createPostBtn}
              >
                <i className="fas fa-plus"></i> Create Post
              </button>
            )}
          </div>

          <div className={styles.postsGrid}>
            {/* Django Logic: Handle restricted/banned users */}
            {circle.is_restricted ? (
              <div className={styles.joinPrompt}>
                <div className={styles.joinPromptIcon}>
                  <i className="fas fa-user-lock"></i>
                </div>
                <h3 className={styles.joinPromptTitle}>Access Restricted</h3>
                <p className={styles.joinPromptText}>
                  You are restricted from this circle until <strong>{circle.restricted_until}</strong>.
                </p>
              </div>
            ) : circle.is_banned ? (
              <div className={styles.joinPrompt}>
                <div className={styles.joinPromptIcon}>
                  <i className="fas fa-ban"></i>
                </div>
                <h3 className={styles.joinPromptTitle}>Banned</h3>
                <p className={styles.joinPromptText}>
                  You have been banned from this circle and cannot access its contents.
                </p>
              </div>
            ) : (circle.is_member || circle.visibility !== 'private') && circle.posts && circle.posts.length > 0 ? (
              circle.posts.map(post => (
                <div key={post.id} className={styles.postCard}>
                  <div className={styles.postHeader}>
                    <div className={styles.postUser}>
                      <button 
                        type="button"
                        className={styles.postUserAvatarButton}
                        onClick={() => router.push(`/profile/${post.user.id}`)}
                      >
                        <img 
                          src={(post.user.profilePic || post.user.profile_pic) || '/images/default_profile.png'} 
                          alt={(post.user.fullName || post.user.full_name) || 'User'}
                          className={styles.postUserAvatar}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/default_profile.png';
                          }}
                        />
                      </button>
                      <div className={styles.postUserInfo}>
                        <button 
                          type="button"
                          className={styles.postUserNameButton}
                          onClick={() => router.push(`/profile/${post.user.id}`)}
                        >
                          <span className={styles.postUserName}>{post.user.fullName || post.user.full_name || 'User'}</span>
                        </button>
                        <span className={styles.postTime}>{getTimeAgo(post.created_at)} ago</span>
                      </div>
                    </div>
                    <div className={styles.postOptionsDropdown}>
                      <button 
                        className={styles.postOptions}
                        onClick={() => setShowPostMenu(showPostMenu === post.id ? null : post.id)}
                      >
                        <i className="fas fa-ellipsis-v"></i>
                      </button>
                      {showPostMenu === post.id && (
                        <div className={styles.postDropdownMenu}>
                          <button 
                            className={styles.dropdownItem}
                            onClick={() => {
                              setShowPostMenu(null);
                              router.push(`/post/${post.id}`);
                            }}
                          >
                            <i className="fas fa-eye"></i> View Post
                          </button>
                          {currentUser?.id === post.user.id && (
                            <>
                              <button className={styles.dropdownItem}>
                                <i className="fas fa-edit"></i> Edit Post
                              </button>
                              <button className={`${styles.dropdownItem} ${styles.textDanger}`}>
                                <i className="fas fa-trash"></i> Delete Post
                              </button>
                            </>
                          )}
                          {currentUser?.id !== post.user.id && (
                            <button className={styles.dropdownItem}>
                              <i className="fas fa-flag"></i> Report
                            </button>
                          )}
                          <button className={styles.dropdownItem}>
                            <i className="fas fa-eye-slash"></i> Hide Post
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.postContent}>
                    <p>{post.content}</p>
                  </div>

                  {post.media_files.length > 0 && (
                    <div className={styles.postMedia}>
                      {post.media_files.length === 1 ? (
                        // Single media
                        post.media_files[0].type === 'video' ? (
                          <video controls className={styles.singleMedia}>
                            <source src={post.media_files[0].file} type="video/mp4" />
                          </video>
                        ) : (
                          <img src={post.media_files[0].file} alt="Post media" className={styles.singleMedia} />
                        )
                      ) : (
                        // Multiple media - grid layout
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
                    <button onClick={() => handleLike(post.id)} className={styles.likeBtn}>
                      <i className={post.user_liked ? "fas fa-heart" : "far fa-heart"} style={{ color: post.user_liked ? '#e3342f' : '#6c757d' }}></i>
                      <span className={styles.likeCount}>{post.like_count}</span>
                    </button>
                    <Link href={`/post/${post.id}`} className={styles.commentBtn}>
                      <i className="far fa-comment"></i>
                      <span className={styles.commentCount}>{post.comment_count}</span>
                    </Link>
                  </div>
                </div>
              ))
            ) : (circle.is_member || circle.visibility !== 'private') ? (
              <div className={styles.emptyState}>
                <i className="fas fa-comment-slash"></i>
                <h3>No Posts Yet</h3>
                <p>Be the first to share something with this community!</p>
                {(circle.is_member || circle.visibility !== 'private') && !circle.is_restricted && !circle.is_banned && (
                  <button onClick={() => setShowCreatePost(true)} className={styles.createPostBtn}>
                    <i className="fas fa-plus"></i> Create Post
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.joinPrompt}>
                <div className={styles.joinPromptIcon}>
                  <i className="fas fa-lock"></i>
                </div>
                <h3 className={styles.joinPromptTitle}>Join to View Posts</h3>
                <p className={styles.joinPromptText}>
                  This is a private circle. Join to see posts and participate in discussions.
                </p>
                <button onClick={handleJoinCircle} className={styles.joinPromptBtn}>
                  <i className="fas fa-sign-in-alt"></i> Join Circle
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className={styles.modalOverlay} onClick={() => setShowCreatePost(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Create Post</h3>
              <button onClick={() => setShowCreatePost(false)} className={styles.btnClose}>×</button>
            </div>
            <form onSubmit={handleCreatePost} className={styles.modalBody}>
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="What&apos;s on your mind?"
                className={styles.postTextarea}
                required
              />
              
              {/* Media Preview */}
              {postMedia.length > 0 && (
                <div className={styles.mediaPreviewGrid}>
                  {postMedia.map((file, index) => (
                    <div key={index} className={styles.mediaPreviewItem}>
                      {file.type.startsWith('video/') ? (
                        <video 
                          src={URL.createObjectURL(file)} 
                          className={styles.previewImage}
                          controls
                        />
                      ) : (
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt={`Preview ${index + 1}`}
                          className={styles.previewImage}
                        />
                      )}
                      <button
                        type="button"
                        className={styles.removeMediaBtn}
                        onClick={() => setPostMedia(postMedia.filter((_, i) => i !== index))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <label htmlFor="mediaInput" className={styles.mediaLabel}>
                <i className="fas fa-camera"></i> Add Photos/Videos {postMedia.length > 0 && `(${postMedia.length})`}
              </label>
              
              <input
                type="file"
                id="mediaInput"
                className={styles.hiddenInput}
                accept="image/*,video/*"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    setPostMedia([...postMedia, ...Array.from(e.target.files)]);
                  }
                }}
              />
              
              <div className={styles.modalFooter}>
                <button type="submit" className={styles.btnPost} disabled={creating}>
                  {creating ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
