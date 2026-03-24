'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PostHeader from '@/components/PostHeader';
import PostMedia from '@/components/PostMedia';
import PostActions from '@/components/PostActions';
import CommentsSection from '@/components/CommentsSection';
import { Post } from '@/components/types';
import styles from './post-detail.module.css';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Prevent body scroll and ensure background is visible
    document.body.style.overflow = 'hidden';
    document.body.style.background = 'transparent';
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.background = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
    // Add class to body and html for styling
    document.body.classList.add('post-detail-page');
    document.documentElement.classList.add('post-detail-page');
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.background = '';
      document.body.style.backgroundColor = '';
      document.documentElement.style.background = '';
      document.documentElement.style.backgroundColor = '';
      document.body.classList.remove('post-detail-page');
      document.documentElement.classList.remove('post-detail-page');
    };
  }, []);

  useEffect(() => {
    // Resolve user from tab session (socketAuth)
    const loadUser = async () => {
      // Use Socket.IO first, then fallback
      const { ensureAuth } = await import('@/utils/socketAuth');
      const { token, userId } = await ensureAuth();
      
      if (token && userId) {
        setUserId(userId);
        console.log('✅ User ID found:', userId);
      } else {
        setUserId(null);
        console.log('⚠️ No auth token found - user not logged in');
      }
      
      fetchPostDetails();
    };
    
    loadUser();
  }, [postId]);

  const handleDeletePost = async () => {
    if (!userId || !post) return;
    const { confirmDialog } = await import('@/utils/confirmDialog');
    const confirmed = await confirmDialog('Are you sure you want to delete this post?', 'Delete', 'Cancel', 'danger');
    if (!confirmed) return;

    try {
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      const { getApiUrl } = await import('@/utils/apiUtils');
      const response = await fetch(`${getApiUrl()}/delete-post/${post.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ user_id: userId })
      });

      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);
      if (data.success) {
        router.back();
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

  const fetchPostDetails = async () => {
    try {
      setLoading(true);
      
      // Get user ID - check both 'user_id' and 'user' object
      // Get user ID (Socket.IO first, then fallback)
      const { getUserId } = await import('@/utils/socketAuth');
      let user_id = getUserId();
      
      // Use Socket.IO token for API call
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      const { getApiUrl } = await import('@/utils/apiUtils');
      const url = user_id 
        ? `${getApiUrl()}/get-post/${postId}?user_id=${user_id}`
        : `${getApiUrl()}/get-post/${postId}`;
      
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);

      if (data.success && data.post) {
        const postData: Post = {
          ...data.post,
          comments: data.post.comments || [],
          recent_likers: data.post.recent_likers || [],
          media_files: data.post.media_files || []
        };
        setPost(postData);
        setComments(data.post.comments || []);
        fetchAllComments();
      } else {
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        setError(sanitizeErrorMessage(data.message || 'Failed to load post'));
      }
    } catch (error) {
      const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
      setError('Failed to load post: ' + sanitizeErrorMessage(error));
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  };


  const fetchAllComments = async () => {
    setIsLoadingComments(true);
    try {
      // Use Socket.IO token for API call
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      const { getApiUrl } = await import('@/utils/apiUtils');
      const response = await fetch(`${getApiUrl()}/get-comments/${postId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);

      if (data.comments && Array.isArray(data.comments)) {
        const formattedComments = data.comments.map((comment: any) => {
          if (typeof comment.user === 'string') {
            return {
              id: comment.id,
              content: comment.content,
              created_at: comment.created_at,
              user: {
                id: comment.user_id || '',
                email: '',
                full_name: comment.user,
                profile_pic: comment.profile_pic || '/images/default_profile.png'
              }
            };
          } else {
            return {
              id: comment.id,
              content: comment.content,
              created_at: comment.created_at,
              user: {
                id: comment.user?.id || '',
                email: comment.user?.email || '',
                full_name: comment.user?.full_name || 'User',
                profile_pic: comment.user?.profile_pic || '/images/default_profile.png'
              }
            };
          }
        });
        setComments(formattedComments);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleCommentAdded = () => {
    fetchAllComments();
    fetchPostDetails();
  };

  const handleLike = async (postId: string) => {
    if (!userId) return;

    try {
      // Use Socket.IO token for API call
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      
      const { getApiUrl } = await import('@/utils/apiUtils');
      const response = await fetch(`${getApiUrl()}/toggle-like/${postId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ user_id: userId }),
      });

      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);
      if (data.success && post) {
        setPost({
          ...post,
          like_count: data.like_count,
          user_liked: data.liked
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.back();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [router]);

  if (loading) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading post...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.errorContainer}>
          <h2>Post Not Found</h2>
          <p>{error || 'The post you\'re looking for doesn\'t exist.'}</p>
          <button onClick={() => router.back()} className={styles.backButton}>
            <i className="fas fa-arrow-left"></i> Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div 
        ref={overlayRef}
        className={styles.modalOverlay}
        onClick={(e) => {
          if (e.target === overlayRef.current) {
            router.back();
          }
        }}
      >
        <div ref={modalRef} className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            View Post
          </h3>
          <div className={styles.headerActions}>
            {userId && post.user.id === userId && (
              <button 
                className={styles.deleteButton}
                onClick={handleDeletePost}
                aria-label="Delete Post"
                title="Delete Post"
              >
                <i className="fas fa-trash"></i>
              </button>
            )}
            <button 
              className={styles.closeButton}
              onClick={() => router.back()}
              aria-label="Close"
              title="Close (Esc)"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.postContentSection}>
            <PostHeader 
              user={post.user}
              createdAt={post.created_at}
              circle={post.circle}
              showOptions={false}
            />
            
            <p className={styles.postCaption}>{post.content}</p>

            {post.media_files && post.media_files.length > 0 && (
              <PostMedia 
                mediaFiles={post.media_files}
                postId={post.id}
              />
            )}

            <PostActions
              postId={post.id}
              likeCount={post.like_count}
              userLiked={post.user_liked}
              commentCount={post.comment_count}
              recentLikers={post.recent_likers || []}
              onLike={() => handleLike(post.id)}
              onShowLikers={() => {}}
              onCommentClick={() => {}}
            />
          </div>

          <div className={styles.commentsWrapper}>
            <CommentsSection
              postId={post.id}
              comments={comments}
              userId={userId}
              onCommentAdded={handleCommentAdded}
              initialShowLimit={50}
              isInModal={true}
              isLoading={isLoadingComments}
            />
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}