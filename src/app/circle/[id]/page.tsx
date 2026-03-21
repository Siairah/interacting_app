"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import PostCard from "@/components/PostCard";
import ReportPostModal from "@/components/ReportPostModal";
import ViewPostModal from "@/components/ViewPostModal";
import WarningsBanner from "@/components/WarningsBanner";
import { Post } from "@/components/types";
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

// Local post type from backend (before conversion)
interface BackendPost {
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
  created_by?: User;
  members?: User[];
  posts?: BackendPost[];
  pending_posts_count?: number;
  reported_posts_count?: number;
  flagged_posts_count?: number;
  pending_members_count?: number;
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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showViewPostModal, setShowViewPostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [hiddenPosts, setHiddenPosts] = useState<Set<string>>(new Set());
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editMedia, setEditMedia] = useState<File[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Hide-on-scroll navbar state
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const lastScrollTopRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const lastToggleTsRef = useRef<number>(0);

  useEffect(() => {
    const loadUser = async () => {
      // Use Socket.IO first, then fallback
      const { ensureAuth } = await import('@/utils/socketAuth');
      const { token, userId, userData } = await ensureAuth();
      
      if (!token || !userId) {
        router.replace('/');
        return;
      }
      
      // Use user data (from Socket.IO or fallback)
      if (userData) {
        const userWithProfile = {
          ...userData,
          profilePic: userData.profilePic || userData.profile_pic || "/images/default_profile.png",
          fullName: userData.fullName || userData.full_name || "User"
        };
        setCurrentUser(userWithProfile);
      } else {
        router.replace('/');
        return;
      }
      
      fetchCircleDetails();
    };
    
    loadUser();
  }, [id, router]);

  // Hide navbar on scroll down (after threshold), show on scroll up (small delta), with debounce
  useEffect(() => {
    const HIDE_THRESHOLD = 64;
    const SHOW_DELTA = 3;
    const MIN_TOGGLE_INTERVAL = 180;
    const SCROLL_TO_TOP_THRESHOLD = 300;

    const onScroll = () => {
      if (rafIdRef.current) return;
      rafIdRef.current = requestAnimationFrame(() => {
        const now = performance.now();
        if (now - lastToggleTsRef.current < MIN_TOGGLE_INTERVAL) {
          rafIdRef.current = null;
          return;
        }

        const current = window.scrollY || document.documentElement.scrollTop;
        const last = lastScrollTopRef.current;

        setShowScrollToTop(current > SCROLL_TO_TOP_THRESHOLD);

        if (current <= 0) {
          if (isNavHidden) {
            setIsNavHidden(false);
            lastToggleTsRef.current = now;
          }
        } else if (current > last + SHOW_DELTA && current > HIDE_THRESHOLD) {
          if (!isNavHidden) {
            setIsNavHidden(true);
            lastToggleTsRef.current = now;
          }
        } else if (current < last - SHOW_DELTA) {
          if (isNavHidden) {
            setIsNavHidden(false);
            lastToggleTsRef.current = now;
          }
        }

        lastScrollTopRef.current = current;
        rafIdRef.current = null;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [isNavHidden]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (showPostMenu && !target.closest('[class*="postOptionsDropdown"]')) {
        setShowPostMenu(null);
      }
    }

    if (showPostMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showPostMenu]);

  const fetchCircleDetails = async () => {
    try {
      console.log("🔍 Fetching circle details for ID:", id);
      
      // Use Socket.IO for getting user ID and token
      const { getUserId, getAuthToken } = await import('@/utils/socketAuth');
      const user_id = getUserId();
      const token = getAuthToken();
      
      console.log("👤 User ID:", user_id);
      
      const { getApiUrl } = await import('@/utils/apiUtils');
      const apiUrl = getApiUrl();
      const url = `${apiUrl}/circle-details/${id}?user_id=${user_id || ''}`;
      console.log("🌐 API URL:", url);
      
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      console.log("📡 Response status:", response.status);
      
      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);
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
      // Use Socket.IO token for API call
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      
      const { getApiUrl } = await import('@/utils/apiUtils');
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/circles/join`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          circle_id: id
        })
      });

      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);
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
      // Use Socket.IO token for API call
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      
      const { getApiUrl } = await import('@/utils/apiUtils');
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/circles/leave`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          circle_id: id
        })
      });

      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);
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
      const { getApiUrl } = await import('@/utils/apiUtils');
      const apiUrl = getApiUrl();
      // Use Socket.IO token for API call
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      
      const response = await fetch(`${apiUrl}/toggle-like/${postId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          user_id: currentUser.id
        })
      });

      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);
      if (data.success && circle && circle.posts) {
        setCircle({
          ...circle,
          posts: circle.posts.map((post: BackendPost) =>
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

  const handleCommentAdded = () => {
    fetchCircleDetails();
  };

  // Convert circle post to PostCard format
  const convertToPostCardFormat = (post: BackendPost): Post => {
    if (!circle) {
      throw new Error('Circle is not loaded');
    }
    return {
      id: post.id,
      content: post.content,
      created_at: post.created_at,
      user: {
        id: post.user.id,
        email: post.user.email || '',
        full_name: post.user.fullName || post.user.full_name || 'User',
        profile_pic: post.user.profilePic || post.user.profile_pic || '/images/default_profile.png'
      },
      circle: {
        id: circle.id,
        name: circle.name,
        cover_image: circle.cover_image
      },
      media_files: post.media_files || [],
      like_count: post.like_count || 0,
      user_liked: post.user_liked || false,
      comment_count: post.comment_count || 0,
      recent_likers: [],
      comments: []
    };
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    // Allow posts with just media or just content
    if (!postContent.trim() && (!postMedia || postMedia.length === 0)) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast('Please add content or media to your post', 'error');
      return;
    }

    setCreating(true);
    try {
      // Use Socket.IO token for API call
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      
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

      const { getApiUrl } = await import('@/utils/apiUtils');
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/create-post`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        const { showToast } = await import('@/components/ToastContainer');
        showToast(`Server error: ${response.status} ${response.statusText}`, 'error');
        return;
      }

      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);
      if (data.success) {
        const { showToast } = await import('@/components/ToastContainer');
        
        // Show toast first so it's visible before modal closes
        if (data.flagged) {
          showToast('Post flagged. Awaiting admin review.', 'warning', 5000);
        } else if (!data.is_approved) {
          showToast('Post submitted for review. It will be visible after admin approval.', 'warning');
        } else {
          showToast('Post created successfully', 'success');
        }
        
        setPostContent('');
        setPostMedia([]);
        setShowCreatePost(false);
        fetchCircleDetails(); // Refresh posts
      } else {
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        const { showToast } = await import('@/components/ToastContainer');
        showToast(sanitizeErrorMessage(data.message || 'Failed to create post'), 'error');
      }
    } catch (error) {
      console.error("Error creating post:", error);
      const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
      const { showToast } = await import('@/components/ToastContainer');
      showToast('Failed to create post: ' + sanitizeErrorMessage(error), 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setEditContent(post.content);
    setEditMedia([]);
    setShowPostMenu(null);
  };

  const handleSaveEdit = async () => {
    // Allow saving with text only, media only, or both
    if (!editingPost || !currentUser) return;
    if (!editContent.trim() && (!editMedia || editMedia.length === 0)) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast('Add content or media to your post', 'error');
      return;
    }

    setIsEditing(true);
    try {
      // Use Socket.IO token for API call
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      
      const { getApiUrl } = await import('@/utils/apiUtils');
      const apiUrl = getApiUrl();
      const formData = new FormData();
      formData.append('user_id', currentUser.id);
      formData.append('content', editContent);
      
      // Add media files if any
      editMedia.forEach((file) => {
        formData.append('media', file);
      });

      const response = await fetch(`${apiUrl}/edit-post/${editingPost.id}`, {
        method: 'PUT',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);
      if (data.success) {
        setEditingPost(null);
        setEditContent("");
        setEditMedia([]);
        fetchCircleDetails(); // Refresh posts
      } else {
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        const { showToast } = await import('@/components/ToastContainer');
        showToast(sanitizeErrorMessage(data.message || 'Failed to edit post'), 'error');
      }
    } catch (error) {
      console.error("Error editing post:", error);
      const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
      const { showToast } = await import('@/components/ToastContainer');
      showToast('Failed to edit post: ' + sanitizeErrorMessage(error), 'error');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!currentUser) return;
    const { confirmDialog } = await import('@/utils/confirmDialog');
    const confirmed = await confirmDialog('Are you sure you want to delete this post?', 'Delete', 'Cancel', 'danger');
    if (!confirmed) return;

    try {
      // Use Socket.IO token for API call
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      
      const { getApiUrl } = await import('@/utils/apiUtils');
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/delete-post/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ user_id: currentUser.id })
      });

      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);
      if (data.success) {
        setShowPostMenu(null);
        fetchCircleDetails(); // Refresh posts
      } else {
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        const { showToast } = await import('@/components/ToastContainer');
        showToast(sanitizeErrorMessage(data.message || 'Failed to delete post'), 'error');
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
      const { showToast } = await import('@/components/ToastContainer');
      showToast('Failed to delete post: ' + sanitizeErrorMessage(error), 'error');
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
    <div className={styles.pageWrapper}>
      {/* Navigation Component */}
      <Navigation isHidden={isNavHidden} />

      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <button 
          onClick={scrollToTop}
          className={styles.scrollToTopBtn}
          title="Scroll to top"
        >
          <i className="fas fa-chevron-up"></i>
        </button>
      )}

      {/* Main Content Container */}
      <div className={styles.container}>

      {/* Circle Hero Section */}
      {circle && (
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
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid - Django Two Column Layout */}
      {circle && (
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

              {/* Admin Only: Manage Circle Button */}
              {circle.is_admin && (
                <Link href={`/circle/${id}/manage`} className={styles.actionBtn + ' ' + styles.btnManage}>
                  <i className="fas fa-cog"></i> Manage Circle
                </Link>
              )}

              <Link href={`/circle/${id}/moderation`} className={styles.moderationBtn}>
                <i className="fas fa-shield-alt"></i> View Moderation History
              </Link>
            </div>
          </div>

          {/* Right Main Content - Posts */}
          <div className={`${styles.circleMainContent} ${isNavHidden ? styles.compactTop : ''}`}>
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

            {/* Warnings Banner */}
            {currentUser && circle.is_member && (
              <WarningsBanner circleId={id} userId={currentUser.id} />
            )}

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
                circle.posts.map((post: BackendPost) => {
                  const postCardData = convertToPostCardFormat(post);
                  return (
                  <PostCard
                    key={post.id}
                    post={postCardData}
                    userId={currentUser?.id}
                    showComments={false}
                    onLike={handleLike}
                    onCommentAdded={handleCommentAdded}
                    customOptionsMenu={
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
                                setSelectedPost(postCardData);
                                setShowViewPostModal(true);
                              }}
                            >
                              <i className="fas fa-eye"></i> View Post
                            </button>
                            {currentUser?.id === post.user.id && (
                              <>
                                <button 
                                  className={styles.dropdownItem}
                                  onClick={() => handleEditPost(postCardData)}
                                >
                                  <i className="fas fa-edit"></i> Edit Post
                                </button>
                                <button 
                                  className={`${styles.dropdownItem} ${styles.textDanger}`}
                                  onClick={() => {
                                    setShowPostMenu(null);
                                    handleDeletePost(post.id);
                                  }}
                                >
                                  <i className="fas fa-trash"></i> Delete Post
                                </button>
                              </>
                            )}
                            {currentUser?.id !== post.user.id && (
                              <button
                                className={styles.dropdownItem}
                                onClick={() => {
                                  setShowPostMenu(null);
                                  setSelectedPost(postCardData);
                                  setShowReportModal(true);
                                }}
                              >
                                <i className="fas fa-flag"></i> Report
                              </button>
                            )}
                            <button
                              className={styles.dropdownItem}
                              onClick={() => {
                                setShowPostMenu(null);
                                setHiddenPosts(prev => new Set(prev).add(post.id));
                              }}
                            >
                              <i className="fas fa-eye-slash"></i> Hide Post
                            </button>
                          </div>
                        )}
                      </div>
                    }
                  />
                );
              })
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
      )}

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
                placeholder="What&apos;s on your mind? (Optional)"
                className={styles.postTextarea}
              />
              
              {/* Media Preview */}
              {postMedia.length > 0 && (
                <div className={styles.mediaPreviewGrid}>
                  {postMedia.map((file, index) => (
                    <div key={index} className={styles.mediaPreviewItem}>
                      {file.type.startsWith('video/') ? (
                        <video 
                          src={URL.createObjectURL(file)} 
                          controls
                          className={styles.previewImage}
                          style={{ maxHeight: '200px', width: '100%', objectFit: 'cover' }}
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
                    const mediaFiles = Array.from(e.target.files).filter(file => 
                      file.type.startsWith('image/') || file.type.startsWith('video/')
                    );
                    setPostMedia([...postMedia, ...mediaFiles]);
                  }
                }}
              />
              
              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setShowCreatePost(false)} className={styles.btnCancel}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnPost} disabled={creating}>
                  {creating ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {editingPost && (
        <div className={styles.modalOverlay} onClick={() => setEditingPost(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Edit Post</h3>
              <button onClick={() => setEditingPost(null)} className={styles.btnClose}>×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className={styles.modalBody}>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="What&apos;s on your mind?"
                className={styles.postTextarea}
                required
              />
              
              {/* Existing Media Preview */}
              {editingPost.media_files && editingPost.media_files.length > 0 && (
                <div className={styles.mediaPreviewGrid}>
                  {editingPost.media_files.map((media, index) => (
                    <div key={`existing-${index}`} className={styles.mediaPreviewItem}>
                      {media.type === 'video' ? (
                        <div className={styles.videoPlaceholder}>
                          <i className="fas fa-video"></i>
                          <span>Video (not supported for editing)</span>
                        </div>
                      ) : (
                        <img 
                          src={media.file} 
                          alt={`Media ${index + 1}`}
                          className={styles.previewImage}
                        />
                      )}
                      <span className={styles.existingMediaLabel}>Existing</span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* New Media Preview */}
              {editMedia.length > 0 && (
                <div className={styles.mediaPreviewGrid}>
                  {editMedia.map((file, index) => (
                    <div key={`new-${index}`} className={styles.mediaPreviewItem}>
                      {file.type.startsWith('video/') ? (
                        <video 
                          src={URL.createObjectURL(file)} 
                          controls
                          className={styles.previewImage}
                          style={{ maxHeight: '200px', width: '100%', objectFit: 'cover' }}
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
                        onClick={() => setEditMedia(editMedia.filter((_, i) => i !== index))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <label htmlFor="editMediaInput" className={styles.mediaLabel}>
                <i className="fas fa-camera"></i> Add Photos/Videos {editMedia.length > 0 && `(${editMedia.length})`}
              </label>
              
              <input
                type="file"
                id="editMediaInput"
                className={styles.hiddenInput}
                accept="image/*,video/*"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    const mediaFiles = Array.from(e.target.files).filter(file => 
                      file.type.startsWith('image/') || file.type.startsWith('video/')
                    );
                    setEditMedia([...editMedia, ...mediaFiles]);
                  }
                }}
              />
              
              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setEditingPost(null)} className={styles.btnCancel}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnPost} disabled={isEditing}>
                  {isEditing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReportModal && selectedPost && (
        <ReportPostModal
          post={selectedPost}
          userId={currentUser?.id || null}
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setSelectedPost(null);
          }}
          onReportSubmitted={() => {
            fetchCircleDetails();
          }}
        />
      )}

      {showViewPostModal && selectedPost && (
        <ViewPostModal
          post={selectedPost}
          userId={currentUser?.id || null}
          isOpen={showViewPostModal}
          onClose={() => {
            setShowViewPostModal(false);
            setSelectedPost(null);
          }}
          onLike={handleLike}
          onCommentAdded={handleCommentAdded}
          onPostDeleted={() => {
            fetchCircleDetails();
          }}
        />
      )}
      </div>
    </div>
  );
}
