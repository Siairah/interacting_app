'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './post-detail.module.css';

interface Post {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    profile_pic: string;
  };
  circle: {
    id: string;
    name: string;
    cover_image: string;
  } | null;
  media_files: Array<{ file: string; type: string }>;
  like_count: number;
  user_liked: boolean;
  comment_count: number;
  recent_likers: Array<{
    id: string;
    email: string;
    full_name: string;
    profile_pic: string;
  }>;
  comments: Array<{
    id: string;
    content: string;
    created_at: string;
    user: {
      id: string;
      email: string;
      full_name: string;
      profile_pic: string;
    };
  }>;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showMoreComments, setShowMoreComments] = useState(false);

  // Hide-on-scroll navbar
  const [isNavHidden, setIsNavHidden] = useState(false);
  const lastScrollTopRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });

    const HIDE_THRESHOLD = 80; // px scrolled before allowing hide
    const SHOW_DELTA = 4; // minimal upward delta to show quickly

    const onScroll = () => {
      if (rafIdRef.current) return;
      rafIdRef.current = requestAnimationFrame(() => {
        const current = window.scrollY || document.documentElement.scrollTop || 0;
        const last = lastScrollTopRef.current;

        if (current <= 0) {
          setIsNavHidden(false);
        } else if (current > last + SHOW_DELTA && current > HIDE_THRESHOLD) {
          // scrolling down past threshold -> hide
          setIsNavHidden(true);
        } else if (current < last - SHOW_DELTA) {
          // small upward motion -> show promptly
          setIsNavHidden(false);
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
  }, []);

  useEffect(() => {
    // Get user ID from localStorage
    const storedUserId = localStorage.getItem('user_id');
    setUserId(storedUserId);
    fetchPostDetails();
  }, [postId]);

  const fetchPostDetails = async () => {
    try {
      const user_id = localStorage.getItem('user_id');
      const url = user_id 
        ? `http://localhost:5000/get-post/${postId}?user_id=${user_id}`
        : `http://localhost:5000/get-post/${postId}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setPost(data.post);
      } else {
        setError(data.message || 'Failed to load post');
      }
    } catch (error) {
      setError('Failed to load post');
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!post || !userId) return;

    try {
      const response = await fetch(`http://localhost:5000/toggle-like/${post.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      const data = await response.json();
      if (data.success) {
        setPost(prev => prev ? {
          ...prev,
          like_count: data.like_count,
          user_liked: data.liked
        } : null);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleAddComment = async () => {
    if (!post || !newComment.trim() || !userId || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const response = await fetch(`http://localhost:5000/add-comment/${post.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          content: newComment.trim()
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setNewComment('');
        fetchPostDetails();
      } else {
        alert('Failed to add comment: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const scrollToComment = () => {
    const commentInput = document.getElementById('comment-input');
    if (commentInput) {
      commentInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (commentInput as HTMLInputElement).focus();
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading post...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={styles.errorContainer}>
        <h2>Post Not Found</h2>
        <p>{error || 'The post you\'re looking for doesn\'t exist.'}</p>
        <button onClick={() => router.back()} className={styles.backButton}>
          <i className="fas fa-arrow-left"></i> Go Back
        </button>
      </div>
    );
  }

  // Show first 10 comments, rest are hidden
  const visibleComments = showMoreComments ? post.comments : post.comments.slice(0, 10);
  const hasMoreComments = post.comments.length > 10;

  return (
    <div className={`${styles.container} ${isNavHidden ? styles.compactTop : ''}`}>
      {/* Modern Navbar */}
      <nav className={`${styles.navbar} ${isNavHidden ? styles.navbarHidden : ''}`}>
        <div className={styles.navContainer}>
          <button 
            onClick={() => router.back()} 
            className={styles.backButton}
          >
            <i className="fas fa-arrow-left"></i> Back
          </button>
          <h2 className={styles.pageTitle}>Post Details</h2>
          <button 
            onClick={() => router.push('/dashboard')} 
            className={styles.homeButton}
          >
            <i className="fas fa-home"></i>
          </button>
        </div>
      </nav>

      {/* Post Card - Django Style */}
      <div className={styles.postCard}>
        {/* Post Header */}
        <div className={styles.postHeader}>
          <div className={styles.userInfo}>
            <button 
              type="button"
              className={styles.profilePicButton}
              onClick={() => router.push(`/profile/${post.user.id}`)}
            >
              <img 
                src={post.user.profile_pic} 
                alt="Profile" 
                className={styles.profilePic}
              />
            </button>
            <div>
              <button 
                type="button"
                className={styles.userNameButton}
                onClick={() => router.push(`/profile/${post.user.id}`)}
              >
                <h5 className={styles.userName}>{post.user.full_name}</h5>
              </button>
              <p className={styles.postDate}>{formatTimeAgo(post.created_at)} ago</p>
              {post.circle && (
                <span className={styles.postCircle}>
                  <button 
                    onClick={() => router.push(`/circle/${post.circle!.id}`)}
                    className={styles.circleLink}
                  >
                    <i className="fas fa-users"></i> {post.circle!.name}
                  </button>
                </span>
              )}
            </div>
          </div>
          <div className={styles.postOptions}>
            <i className="fas fa-ellipsis-h"></i>
          </div>
        </div>

        {/* Post Content */}
        <p className={styles.postCaption}>{post.content}</p>

        {/* Media Carousel */}
        {post.media_files.length > 0 && (
          <div className={styles.mediaContainer}>
            <div className={styles.postMediaCarousel} id={`carousel-${post.id}`}>
              {post.media_files.map((media, index) => (
                <div 
                  key={index} 
                  className={`${styles.carouselItem} ${index === 0 ? styles.active : ''}`}
                >
                  {media.type === 'video' ? (
                    <video 
                      controls 
                      className={styles.postMedia}
                      style={{ width: '100%', maxHeight: '400px', height: 'auto', objectFit: 'contain', borderRadius: '12px' }}
                    >
                      <source src={media.file} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <img src={media.file} alt="Post Media" className={styles.postMedia} />
                  )}
                </div>
              ))}
            </div>

            {post.media_files.length > 1 && (
              <div className={styles.carouselControls}>
                <button 
                  className={styles.carouselPrev}
                  onClick={() => {
                    // Carousel navigation logic
                    const carousel = document.getElementById(`carousel-${post.id}`);
                    if (carousel) {
                      const items = carousel.querySelectorAll(`.${styles.carouselItem}`);
                      const indicators = carousel.querySelectorAll(`.${styles.indicator}`);
                      let activeIndex = 0;
                      
                      items.forEach((item, index) => {
                        if (item.classList.contains(styles.active)) {
                          activeIndex = index;
                          item.classList.remove(styles.active);
                          indicators[index]?.classList.remove(styles.active);
                        }
                      });
                      
                      const newIndex = (activeIndex - 1 + items.length) % items.length;
                      items[newIndex]?.classList.add(styles.active);
                      indicators[newIndex]?.classList.add(styles.active);
                    }
                  }}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <button 
                  className={styles.carouselNext}
                  onClick={() => {
                    // Carousel navigation logic
                    const carousel = document.getElementById(`carousel-${post.id}`);
                    if (carousel) {
                      const items = carousel.querySelectorAll(`.${styles.carouselItem}`);
                      const indicators = carousel.querySelectorAll(`.${styles.indicator}`);
                      let activeIndex = 0;
                      
                      items.forEach((item, index) => {
                        if (item.classList.contains(styles.active)) {
                          activeIndex = index;
                          item.classList.remove(styles.active);
                          indicators[index]?.classList.remove(styles.active);
                        }
                      });
                      
                      const newIndex = (activeIndex + 1) % items.length;
                      items[newIndex]?.classList.add(styles.active);
                      indicators[newIndex]?.classList.add(styles.active);
                    }
                  }}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
                <div className={styles.carouselIndicators}>
                  {post.media_files.map((_, index) => (
                    <span 
                      key={index}
                      className={`${styles.indicator} ${index === 0 ? styles.active : ''}`}
                      onClick={() => {
                        const carousel = document.getElementById(`carousel-${post.id}`);
                        if (carousel) {
                          const items = carousel.querySelectorAll(`.${styles.carouselItem}`);
                          const indicators = carousel.querySelectorAll(`.${styles.indicator}`);
                          
                          items.forEach(item => item.classList.remove(styles.active));
                          indicators.forEach(indicator => indicator.classList.remove(styles.active));
                          
                          items[index]?.classList.add(styles.active);
                          indicators[index]?.classList.add(styles.active);
                        }
                      }}
                    ></span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Post Actions */}
        <div className={styles.postActions}>
          <button 
            className={styles.likeBtn} 
            onClick={handleLike}
          >
            {post.user_liked ? (
              <i className="fas fa-heart" style={{ color: '#dc3545' }}></i>
            ) : (
              <i className="far fa-heart"></i>
            )}
            <span className={styles.likeCount}>{post.like_count}</span>
          </button>
          <button 
            className={styles.commentBtn} 
            onClick={scrollToComment}
          >
            <i className="far fa-comment"></i>
            <span className={styles.commentCount}>{post.comment_count}</span>
          </button>
        </div>

        {/* Likers Names */}
        {post.recent_likers.length > 0 && (
          <button 
            className={styles.likerNames}
            onClick={() => setShowLikersModal(true)}
          >
            {post.recent_likers.slice(0, 3).map((liker, index) => (
              <span key={liker.id}>
                {liker.full_name}
                {index < Math.min(post.recent_likers.length, 3) - 1 && ', '}
              </span>
            ))}
            {post.like_count > 3 && ` and ${post.like_count - 3} others`}
          </button>
        )}

        {/* Comments Section - Django Style */}
        <div className={styles.commentsSection}>
          <h5>Comments</h5>
          <div className={styles.commentList}>
            {visibleComments.map(comment => (
              <div key={comment.id} className={styles.comment}>
                <button 
                  className={styles.commentPicContainer}
                  onClick={() => router.push(`/profile/${comment.user.id}`)}
                >
                  <img 
                    src={comment.user.profile_pic} 
                    alt="Profile" 
                    className={styles.commentPic}
                  />
                </button>
                <div className={styles.commentBody}>
                  <button 
                    className={styles.commentUsername}
                    onClick={() => router.push(`/profile/${comment.user.id}`)}
                  >
                    {comment.user.full_name}
                  </button>
                  <p className={styles.commentText}>{comment.content}</p>
                  <p className={styles.commentTime}>{formatTimeAgo(comment.created_at)} ago</p>
                </div>
              </div>
            ))}
          </div>

          {/* View More Comments Button */}
          {hasMoreComments && !showMoreComments && (
            <div className={styles.moreCommentsContainer}>
              <button 
                className={styles.moreCommentsBtn}
                onClick={() => setShowMoreComments(true)}
              >
                View More Comments
              </button>
            </div>
          )}

          {/* Comment Input */}
          <div className={styles.commentForm} id="comment-form">
            <input 
              type="text"
              className={styles.commentInput}
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
              id="comment-input"
            />
            <button 
              type="button"
              className={styles.submitComment}
              onClick={handleAddComment}
              disabled={isSubmittingComment || !newComment.trim()}
            >
              <i className="fa fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Likers Modal */}
      {showLikersModal && (
        <div className={styles.modalOverlay} onClick={() => setShowLikersModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h5 className={styles.modalTitle}>People who liked this post</h5>
              <button 
                className={styles.modalClose}
                onClick={() => setShowLikersModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <ul className={styles.likerList}>
                {post.recent_likers.map(liker => (
                  <li key={liker.id} className={styles.likerItem}>
                    <img 
                      src={liker.profile_pic} 
                      alt="Profile" 
                      className={styles.likerPic}
                    />
                    <span>{liker.full_name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}