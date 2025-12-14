'use client';

import { useEffect, useRef, useState } from 'react';
import CommentsSection from './CommentsSection';
import PostHeader from './PostHeader';
import PostMedia from './PostMedia';
import PostActions from './PostActions';
import { PostComment, Post } from './types';
import styles from './ViewPostModal.module.css';

interface ViewPostModalProps {
  post: Post;
  userId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded?: () => void;
  onLike?: (postId: string) => void;
  onPostDeleted?: () => void;
}

export default function ViewPostModal({
  post,
  userId,
  isOpen,
  onClose,
  onCommentAdded,
  onLike,
  onPostDeleted
}: ViewPostModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [postData, setPostData] = useState<Post>(post);
  const [comments, setComments] = useState<PostComment[]>(post.comments || []);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isLoadingPost, setIsLoadingPost] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      fetchPostDetails();
      fetchAllComments();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, post.id]);

  // Update post data when post prop changes
  useEffect(() => {
    if (isOpen) {
      setPostData(post);
      setComments(post.comments || []);
    }
  }, [post, isOpen]);

  const fetchPostDetails = async () => {
    setIsLoadingPost(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      let currentUserId = localStorage.getItem('user_id');
      if (!currentUserId) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const userObj = JSON.parse(userStr);
            currentUserId = userObj.id || userObj._id || null;
          } catch (e) {
            console.error('Error parsing user object:', e);
          }
        }
      }

      const url = currentUserId
        ? `${apiUrl}/get-post/${post.id}?user_id=${currentUserId}`
        : `${apiUrl}/get-post/${post.id}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.post) {
        setPostData({
          ...data.post,
          comments: data.post.comments || [],
          recent_likers: data.post.recent_likers || [],
          media_files: data.post.media_files || []
        });
      }
    } catch (error) {
      console.error('Error fetching post details:', error);
    } finally {
      setIsLoadingPost(false);
    }
  };

  const fetchAllComments = async () => {
    setIsLoadingComments(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/get-comments/${post.id}`);
      const data = await response.json();

      if (data.comments && Array.isArray(data.comments)) {
        const formattedComments: PostComment[] = data.comments.map((comment: any) => {
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
    if (onCommentAdded) {
      onCommentAdded();
    }
  };

  const handleDeletePost = async () => {
    if (!userId) return;
    const { confirmDialog } = await import('@/utils/confirmDialog');
    const confirmed = await confirmDialog('Are you sure you want to delete this post?', 'Delete', 'Cancel', 'danger');
    if (!confirmed) return;

    try {
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/delete-post/${postData.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ user_id: userId })
      });

      const data = await response.json();
      if (data.success) {
        onClose();
        if (onPostDeleted) {
          onPostDeleted();
        }
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

  const handleLike = async (postId: string) => {
    if (!userId) return;

    if (onLike) {
      onLike(postId);
    } else {
            try {
              // Use Socket.IO token for API call
              const { getAuthToken } = await import('@/utils/socketAuth');
              const token = getAuthToken();
              
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/toggle-like/${postId}`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ user_id: userId }),
              });

        const data = await response.json();
        if (data.success) {
          setPostData(prev => ({
            ...prev,
            like_count: data.like_count,
            user_liked: data.liked
          }));
        }
      } catch (error) {
        console.error('Error toggling like:', error);
      }
    }
    fetchPostDetails();
  };

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstInput = modalRef.current.querySelector('input, textarea, button') as HTMLElement;
      firstInput?.focus();
    }
  }, [isOpen]);

  if (!isOpen) {
    console.log('ViewPostModal: isOpen is false, not rendering');
    return null;
  }

  console.log('ViewPostModal: Rendering modal for post:', post.id);

  return (
    <div 
      ref={overlayRef}
      className={styles.modalOverlay} 
      onClick={(e) => {
        if (e.target === overlayRef.current) {
          onClose();
        }
      }}
    >
      <div ref={modalRef} className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            View Post
          </h3>
          <div className={styles.headerActions}>
            {userId && postData.user.id === userId && (
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
              onClick={onClose}
              aria-label="Close"
              title="Close (Esc)"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Modal Body - Post Content + Comments */}
        <div className={styles.modalBody}>
          {isLoadingPost ? (
            <div className={styles.loadingState}>
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading post...</p>
            </div>
          ) : (
            <>
              {/* Post Content */}
              <div className={styles.postContentSection}>
                <PostHeader 
                  user={postData.user}
                  createdAt={postData.created_at}
                  circle={postData.circle}
                  showOptions={false}
                />
                
                <p className={styles.postCaption}>{postData.content}</p>

                {postData.media_files && postData.media_files.length > 0 && (
                  <PostMedia 
                    mediaFiles={postData.media_files}
                    postId={postData.id}
                  />
                )}

                <PostActions
                  postId={postData.id}
                  likeCount={postData.like_count}
                  userLiked={postData.user_liked}
                  commentCount={postData.comment_count}
                  recentLikers={postData.recent_likers || []}
                  onLike={() => handleLike(postData.id)}
                  onShowLikers={() => {}}
                  onCommentClick={() => {}}
                />
              </div>

              {/* Comments Section */}
              <div className={styles.commentsWrapper}>
                <CommentsSection
                  postId={postData.id}
                  comments={comments}
                  userId={userId}
                  onCommentAdded={handleCommentAdded}
                  initialShowLimit={50}
                  isInModal={true}
                  isLoading={isLoadingComments}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

