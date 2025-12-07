'use client';

import { useEffect, useRef, useState } from 'react';
import CommentsSection from './CommentsSection';
import PostHeader from './PostHeader';
import PostMedia from './PostMedia';
import { PostComment, Post } from './types';
import styles from './CommentModal.module.css';

interface CommentModalProps {
  post: Post;
  comments: PostComment[];
  userId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded?: () => void;
}

export default function CommentModal({
  post,
  comments: initialComments,
  userId,
  isOpen,
  onClose,
  onCommentAdded
}: CommentModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [comments, setComments] = useState<PostComment[]>(initialComments || []);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Fetch all comments when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAllComments();
    } else {
      // Reset comments when modal closes
      setComments(initialComments || []);
    }
  }, [isOpen, post.id]);

  // Update comments when initialComments change
  useEffect(() => {
    if (!isOpen) {
      setComments(initialComments || []);
    }
  }, [initialComments, isOpen]);

  const fetchAllComments = async () => {
    setIsLoadingComments(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      // Use Socket.IO token for API call
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      
      const response = await fetch(`${apiUrl}/get-comments/${post.id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await response.json();

      if (data.comments && Array.isArray(data.comments)) {
        // Transform backend comments to match PostComment type
        // Backend /get-comments returns: { id, user (string name), profile_pic, content, created_at }
        // Backend /get-post returns: { id, user: { id, email, full_name, profile_pic }, content, created_at }
        const formattedComments: PostComment[] = data.comments.map((comment: any) => {
          // Handle both response formats
          if (typeof comment.user === 'string') {
            // Format from /get-comments endpoint
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
            // Format from /get-post endpoint (already correct)
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
      } else if (data.success && data.post?.comments) {
        // Fallback: use comments from post data if available
        setComments(data.post.comments);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      // Fallback to initial comments if fetch fails
      setComments(initialComments || []);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleCommentAdded = () => {
    // Refresh comments after adding a new one
    fetchAllComments();
    if (onCommentAdded) {
      onCommentAdded();
    }
  };

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstInput = modalRef.current.querySelector('input, textarea, button') as HTMLElement;
      firstInput?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
        {/* Modal Header - Only Close Button */}
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            Comments {comments.length > 0 && <span className={styles.commentCountBadge}>({comments.length})</span>}
          </h3>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close comments"
            title="Close (Esc)"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Modal Body - Post Content + Comments */}
        <div className={styles.modalBody}>
          {/* Post Content */}
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
          </div>

          {/* Comments Section */}
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
  );
}

