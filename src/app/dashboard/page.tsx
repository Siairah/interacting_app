"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import PostCard from "@/components/PostCard";
import ReportPostModal from "@/components/ReportPostModal";
import ViewPostModal from "@/components/ViewPostModal";
import { Post } from "@/components/types";
import styles from "./dashboard.module.css";

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  bio?: string;
  profilePic?: string;
  hasProfile?: boolean;
}

interface Circle {
  id: string;
  name: string;
  description?: string;
  cover_image?: string;
  member_count: number;
  is_member?: boolean;
  is_admin?: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [suggestedCircles, setSuggestedCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postMedia, setPostMedia] = useState<File[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null);
  const [showPostMenu, setShowPostMenu] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showViewPostModal, setShowViewPostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [hiddenPosts, setHiddenPosts] = useState<Set<string>>(new Set());
  const [reservingEventId, setReservingEventId] = useState<string | null>(null);
  const [dashboardEvents, setDashboardEvents] = useState<Array<{
    id: string;
    title: string;
    event_date: string;
    location?: string;
    reserve_count: number;
    user_has_reserved: boolean;
    circle_id: string;
    circle_name: string;
  }>>([]);

  // Hide-on-scroll navbar state
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const lastToggleTsRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const loadUser = async () => {
        // Use Socket.IO first, then fallback
        const { ensureAuth } = await import('@/utils/socketAuth');
        const { token, userId, userData } = await ensureAuth();
        
        if (!token || !userId) {
          // No authentication - redirect to login
          router.replace('/');
          return;
        }
        
        // Use user data (from Socket.IO or fallback)
        if (userData) {
          setUser(userData);
          fetchPosts(userId);
          fetchCircles(userId);
          fetchDashboardEvents(userId);
        } else {
          router.replace('/');
        }
      };
      
      loadUser();
    }
  }, [router]);


  // Hide navbar on scroll down (after threshold), show on scroll up (small delta), with debounce
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;

    const HIDE_THRESHOLD = 64; // px scrolled before we allow hiding
    const SHOW_DELTA = 3; // minimal delta to consider upward motion
    const MIN_TOGGLE_INTERVAL = 180; // ms to prevent rapid toggling
    const SCROLL_TO_TOP_THRESHOLD = 300; // px to show scroll-to-top button

    const onScroll = () => {
      if (rafIdRef.current) return; // throttle to next frame
      rafIdRef.current = requestAnimationFrame(() => {
        const now = performance.now();
        if (now - lastToggleTsRef.current < MIN_TOGGLE_INTERVAL) {
          rafIdRef.current = null;
          return;
        }

        const current = el.scrollTop;
        const last = lastScrollTopRef.current;

        // Show/hide scroll-to-top button
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

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll as EventListener);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [isNavHidden]);

  const scrollToTop = () => {
    // Scroll both the feed container and window to top
    if (feedRef.current) {
      feedRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
    // Also scroll the window to top for complete reset
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  async function fetchPosts(userId: string) {
    setLoading(true);
    try {
      const { getSocket } = await import('@/utils/socketAuth');
      const socket = getSocket();
      const socketId = socket?.id;
      
      const { getApiUrl } = await import('@/utils/apiUtils');
      const url = `${getApiUrl()}/get-posts?user_id=${userId}${socketId ? `&socket_id=${socketId}` : ''}`;
      const res = await fetch(url);
      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<{ success: boolean; posts?: Post[] }>(res);
      if (data.success && data.posts) {
        setPosts(data.posts);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCircles(userId: string) {
    try {
      const { getApiUrl } = await import('@/utils/apiUtils');
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/circles/list?user_id=${userId}`);
      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<{ success: boolean; circles?: Circle[] }>(res);
      if (data.success && data.circles) {
        // When user_id is provided, /list returns joined circles
        setCircles(data.circles);
        
        // For suggested circles, we need to fetch public circles without user_id
        const suggestedRes = await fetch(`${apiUrl}/circles/list`);
        const suggestedData = await safeJson<{ success: boolean; circles?: Circle[] }>(suggestedRes);
        if (suggestedData.success && suggestedData.circles) {
          // Filter out circles user is already in
          const joinedCircleIds = data.circles.map((c) => c.id);
          setSuggestedCircles(suggestedData.circles.filter((c) => !joinedCircleIds.includes(c.id)).slice(0, 3));
        }
      }
    } catch (error) {
      console.error("Error fetching circles:", error);
    }
  }

  async function fetchDashboardEvents(userId: string) {
    try {
      const { getApiUrl } = await import('@/utils/apiUtils');
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      const res = await fetch(`${getApiUrl()}/events/dashboard?user_id=${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<{ success: boolean; events?: typeof dashboardEvents }>(res);
      if (data.success && data.events) setDashboardEvents(data.events);
      else setDashboardEvents([]);
    } catch {
      setDashboardEvents([]);
    }
  }

  async function handleReserveFromDashboard(eventId: string, userId: string) {
    setReservingEventId(eventId);
    try {
      const { getApiUrl } = await import('@/utils/apiUtils');
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      const res = await fetch(`${getApiUrl()}/events/${eventId}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ user_id: userId })
      });
      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(res);
      if (data.success) {
        if (user?.id) fetchDashboardEvents(user.id);
        const { showToast } = await import('@/components/ToastContainer');
        showToast('Reserved!', 'success');
      } else {
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        const { showToast } = await import('@/components/ToastContainer');
        showToast(sanitizeErrorMessage(data.message || 'Failed to reserve'), 'error');
      }
    } catch (err) {
      const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
      const { showToast } = await import('@/components/ToastContainer');
      showToast('Failed to reserve: ' + sanitizeErrorMessage(err), 'error');
    } finally {
      setReservingEventId(null);
    }
  }

  async function handleCreatePost() {
    if (!user) return;
    
    // Allow posts with just media or just content
    if (!postContent.trim() && (!postMedia || postMedia.length === 0)) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast('Please add content or media to your post', 'error');
      return;
    }
    
    try {
      // Use Socket.IO token for API call
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      
      // Use FormData to support media files
      const formData = new FormData();
      formData.append('content', postContent.trim());
      formData.append('user_id', user.id);
      if (selectedCircle) {
        formData.append('circle_id', selectedCircle);
      }
      
      // Append multiple media files
      if (postMedia && postMedia.length > 0) {
        postMedia.forEach((file) => {
          formData.append('media', file);
        });
      }
      
      const { getApiUrl } = await import('@/utils/apiUtils');
      const res = await fetch(`${getApiUrl()}/create-post`, {
        method: "POST",
        headers: { 
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: formData
      });
      
      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(res);
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
        
        setPostContent("");
        setPostMedia([]);
        setSelectedCircle(null);
        setShowCreatePost(false);
        fetchPosts(user.id);
      } else {
        const { showToast } = await import('@/components/ToastContainer');
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        showToast(sanitizeErrorMessage(data.message || 'Failed to create post'), 'error');
      }
    } catch (error) {
      console.error("Error creating post:", error);
      const { showToast } = await import('@/components/ToastContainer');
      const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
      showToast('Failed to create post: ' + sanitizeErrorMessage(error), 'error');
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    const { confirmDialog } = await import('@/utils/confirmDialog');
    const confirmed = await confirmDialog('Are you sure you want to delete this post?', 'Delete', 'Cancel', 'danger');
    if (!confirmed) return;

    try {
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      
      const { getApiUrl } = await import('@/utils/apiUtils');
      const response = await fetch(`${getApiUrl()}/delete-post/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ user_id: user.id })
      });

      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);
      if (data.success) {
        setShowPostMenu(null);
        fetchPosts(user.id);
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

  async function handleLike(postId: string) {
    if (!user) return;
    
    try {
      const { getApiUrl } = await import('@/utils/apiUtils');
      const res = await fetch(`${getApiUrl()}/toggle-like/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id })
      });
      
      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(res);
      if (data.success) {
        setPosts(posts.map(post => 
          post.id === postId 
            ? { ...post, user_liked: data.liked, like_count: data.like_count } 
            : post
        ));
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  }

  function handleCommentAdded() {
    if (user) {
      fetchPosts(user.id);
    }
  }

  return (
    <div className={styles.dashboardWrapper}>
      {/* Navbar */}
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

      {/* Main Content */}
      <section className={`${styles.feedSection} ${isNavHidden ? styles.compactTop : ''}`}>
        {/* Left Sidebar */}
        <aside className={styles.sidebarLeft}>
          <div className={styles.sidebarWidget}>
            <h3 className={styles.widgetTitle}>
              <i className="fas fa-bolt"></i> Shortcuts
            </h3>
            <ul className={styles.listUnstyled}>
              <li className={styles.trendingItem}>
                <i className="fas fa-users me-2 text-primary"></i>
                <span>Groups</span>
              </li>
              <li className={styles.trendingItem}>
                <i className="fas fa-calendar-alt me-2 text-success"></i>
                <span>Events</span>
              </li>
              <li className={styles.trendingItem}>
                <i className="fas fa-bookmark me-2 text-warning"></i>
                <span>Saved Posts</span>
              </li>
            </ul>
          </div>

          <div className={styles.sidebarWidget}>
            <h3 className={styles.widgetTitle}>
              <i className="fas fa-calendar-check"></i> Upcoming Events
            </h3>
            {dashboardEvents.length > 0 ? (
              dashboardEvents.slice(0, 5).map((ev) => (
                <div key={ev.id} className={styles.eventItem}>
                  <Link href={`/circle/${ev.circle_id}?tab=events`} className={styles.eventTitleLink}>
                    <div className={styles.eventTitle}>{ev.title}</div>
                    <small className={styles.eventDate}>
                      {new Date(ev.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      {ev.location ? ` • ${ev.location}` : ''}
                    </small>
                  </Link>
                  <div className={styles.eventMeta}>
                    <span className={styles.reserveCount}><i className="fas fa-user-check"></i> {ev.reserve_count}</span>
                    {ev.user_has_reserved ? (
                      <span className={styles.reservedBadge}><i className="fas fa-check"></i> Reserved</span>
                    ) : (
                      <button
                        type="button"
                        className={styles.btnRsvp}
                        disabled={reservingEventId === ev.id}
                        onClick={() => user?.id && handleReserveFromDashboard(ev.id, user.id)}
                      >
                        {reservingEventId === ev.id ? '...' : 'RSVP'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.eventEmpty}>
                <small>No upcoming events. Join circles to see events.</small>
              </div>
            )}
          </div>
        </aside>

        {/* Main Feed */}
        <div ref={feedRef} className={styles.feedContainer}>
          {/* Create Post Trigger */}
          <div className={styles.createPostTrigger} onClick={() => setShowCreatePost(true)}>
            <img 
              src={user?.profilePic || '/images/default_profile.png'} 
              alt="Profile" 
              className={styles.profilePic}
            />
            <div className={styles.createPostInput}>
              What&apos;s on your mind, {user?.fullName}?
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
                <form onSubmit={(e) => { e.preventDefault(); handleCreatePost(); }} className={styles.modalBody}>
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
                  
                  <select 
                    value={selectedCircle || ""} 
                    onChange={(e) => setSelectedCircle(e.target.value || null)}
                    className={styles.circleSelect}
                  >
                    <option value="">Post to your feed</option>
                    {circles.map(circle => (
                      <option key={circle.id} value={circle.id}>{circle.name}</option>
                    ))}
                  </select>
                  
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
                </form>
                <div className={styles.modalFooter}>
                  <button onClick={() => setShowCreatePost(false)} className={styles.btnCancel}>
                    Cancel
                  </button>
                  <button onClick={handleCreatePost} className={styles.btnPost}>Post</button>
                </div>
              </div>
            </div>
          )}

          {/* Posts Feed */}
          {loading ? (
            <div className={styles.loadingMessage}>Loading posts...</div>
          ) : posts.filter(post => !hiddenPosts.has(post.id)).length > 0 ? (
            posts.filter(post => !hiddenPosts.has(post.id)).map((post) => {
              // Convert dashboard post to PostCard format
              const postCardData: Post = {
                ...post,
                circle: post.circle || null,
                recent_likers: [],
                comments: []
              };

              return (
                <PostCard
                  key={post.id}
                  post={postCardData}
                  userId={user?.id}
                  showComments={false}
                  onLike={handleLike}
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
                              setSelectedPost(post);
                              setShowViewPostModal(true);
                            }}
                          >
                            <i className="fas fa-eye"></i> View Post
                          </button>
                          {post.user.id === user?.id && (
                            <button 
                              className={`${styles.dropdownItem} ${styles.textDanger}`}
                              onClick={() => {
                                setShowPostMenu(null);
                                handleDeletePost(post.id);
                              }}
                            >
                              <i className="fas fa-trash"></i> Delete Post
                            </button>
                          )}
                          {post.user.id !== user?.id && (
                            <button
                              className={styles.dropdownItem}
                              onClick={() => {
                                setShowPostMenu(null);
                                setSelectedPost(post);
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
          ) : (
            <div className={styles.emptyFeed}>
              <div className={styles.emptyFeedIcon}>
                <i className="fas fa-users-slash"></i>
              </div>
              <h4>No posts to show</h4>
              <p>You haven&apos;t joined any circles yet. To see posts, join a circle.</p>
              <Link href="/circles" className={styles.exploreLink}>
                Explore Circles <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
          )}
        </div>

             {showReportModal && selectedPost && (
               <ReportPostModal
                 post={selectedPost}
                 userId={user?.id || null}
                 isOpen={showReportModal}
                 onClose={() => {
                   setShowReportModal(false);
                   setSelectedPost(null);
                 }}
                 onReportSubmitted={() => {
                   if (user) {
                     fetchPosts(user.id);
                   }
                 }}
               />
             )}

             {/* Right Sidebar */}
        <aside className={styles.sidebarRight}>
          {/* My Circles */}
          <div className={styles.sidebarWidget}>
            <h3 className={styles.widgetTitle}>
              <i className="fas fa-users"></i> My Chautari Circles
            </h3>
            <ul className={styles.listUnstyled}>
              {circles.length > 0 ? (
                circles.slice(0, 3).map((circle) => (
                  <Link key={circle.id} href={`/circle/${circle.id}`} className={styles.communityLink}>
                    <li className={styles.communityItem}>
                      <img 
                        src={circle.cover_image || '/images/default_profile.png'} 
                        alt={circle.name}
                        className={styles.communityAvatar}
                      />
                      <div className={styles.communityInfo}>
                        <span className={styles.communityName}>{circle.name}</span>
                        <span className={styles.communityMembers}>{circle.member_count} members</span>
                      </div>
                      <i className="fas fa-ellipsis-h"></i>
                    </li>
                  </Link>
                ))
              ) : (
                <p className={styles.textMuted}>You&apos;re not part of any Circle yet.</p>
              )}
            </ul>
            <Link href="/circles" className={styles.seeAllLink}>
              See all your Chautari Circles
            </Link>
          </div>

          {/* Suggested Circles */}
          <div className={styles.sidebarWidget}>
            <h3 className={styles.widgetTitle}>
              <i className="fas fa-compass"></i> Suggested for You
            </h3>
            <ul className={styles.listUnstyled}>
              {suggestedCircles.length > 0 ? (
                suggestedCircles.map((circle) => (
                  <li key={circle.id} className={styles.communityItem}>
                    <img 
                      src={circle.cover_image || '/images/default_profile.png'} 
                      alt={circle.name}
                      className={styles.communityAvatar}
                    />
                    <div className={styles.communityInfo}>
                      <span className={styles.communityName}>{circle.name}</span>
                      <span className={styles.communityMembers}>{circle.member_count} members</span>
                    </div>
                    <Link href={`/circle/${circle.id}`} className={styles.btnJoin}>
                      View
                    </Link>
                  </li>
                ))
              ) : (
                <p className={styles.textMuted}>No circles to suggest right now.</p>
              )}
            </ul>
            <Link href="/circles" className={styles.seeAllLink}>
              Discover more communities
            </Link>
          </div>
        </aside>
      </section>

      {showReportModal && selectedPost && (
        <ReportPostModal
          post={selectedPost}
          userId={user?.id || null}
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setSelectedPost(null);
          }}
          onReportSubmitted={() => {
            if (user) {
              fetchPosts(user.id);
            }
          }}
        />
      )}

      {showViewPostModal && selectedPost && (
        <ViewPostModal
          post={selectedPost}
          userId={user?.id || null}
          isOpen={showViewPostModal}
          onClose={() => {
            setShowViewPostModal(false);
            setSelectedPost(null);
          }}
          onLike={handleLike}
          onCommentAdded={handleCommentAdded}
          onPostDeleted={() => {
            fetchPosts(user?.id || '');
          }}
        />
      )}
    </div>
  );
}

