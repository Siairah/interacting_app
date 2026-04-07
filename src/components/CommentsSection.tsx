'use client';

import { useState, useRef, useEffect } from 'react';
import { PostComment } from './types';
import CommentItem from './CommentItem';
import styles from './CommentsSection.module.css';

interface CommentsSectionProps {
  postId: string;
  comments: PostComment[];
  userId?: string | null;
  onCommentAdded?: () => void;
  initialShowLimit?: number;
  isLoading?: boolean;
  isInModal?: boolean;
  /** When false, modal does not render the extra "Comments" row (e.g. CommentModal already has a title). */
  showCommentsHeadingInModal?: boolean;
}

export default function CommentsSection({
  postId,
  comments,
  userId,
  onCommentAdded,
  initialShowLimit = 10,
  isLoading = false,
  isInModal = false,
  showCommentsHeadingInModal = true,
}: CommentsSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showMoreComments, setShowMoreComments] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Debug: Log userId to help troubleshoot
  useEffect(() => {
    if (userId) {
      console.log('✅ CommentsSection received userId:', userId);
    } else {
      console.log('⚠️ CommentsSection: No userId provided');
    }
  }, [userId]);

  // Ensure comments array exists
  const safeComments = comments || [];
  const visibleComments = showMoreComments ? safeComments : safeComments.slice(0, initialShowLimit);
  const hasMoreComments = safeComments.length > initialShowLimit;

  // Scroll to bottom when new comment is added
  useEffect(() => {
    if (commentsEndRef.current && safeComments.length > 0) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [safeComments.length]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !userId || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      // Use Socket.IO token for API call
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      const { getApiUrl } = await import('@/utils/apiUtils');
      const response = await fetch(`${getApiUrl()}/add-comment/${postId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          user_id: userId,
          content: newComment.trim()
        })
      });

      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);
      if (data.status === 'success') {
        setNewComment('');
        // Focus back on input after successful comment
        setTimeout(() => {
          commentInputRef.current?.focus();
        }, 100);
        // Refresh comments from backend
        if (onCommentAdded) {
          onCommentAdded();
        }
      } else {
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        const { showToast } = await import('@/components/ToastContainer');
        showToast('Failed to add comment: ' + sanitizeErrorMessage(data.message || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
      const { showToast } = await import('@/components/ToastContainer');
      showToast('Failed to add comment: ' + sanitizeErrorMessage(error), 'error');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const scrollToCommentInput = () => {
    commentInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    commentInputRef.current?.focus();
  };

  const commentsMiddle = (
    <>
      {isLoading ? (
        <div className={styles.loadingComments}>
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading comments...</p>
        </div>
      ) : safeComments.length === 0 ? (
        <div className={styles.emptyComments}>
          <i className="fas fa-comment-slash"></i>
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <>
          <div
            className={isInModal ? styles.commentListModal : styles.commentList}
          >
            {visibleComments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
            <div ref={commentsEndRef} />
          </div>

          {hasMoreComments && !showMoreComments && (
            <div className={styles.moreCommentsContainer}>
              <button
                type="button"
                className={styles.moreCommentsBtn}
                onClick={() => setShowMoreComments(true)}
              >
                <i className="fas fa-chevron-down"></i> View {safeComments.length - initialShowLimit}{' '}
                More Comments
              </button>
            </div>
          )}
        </>
      )}
    </>
  );

  return (
    <div
      className={`${styles.commentsSection} ${isInModal ? styles.commentsSectionModal : ''} ${
        isInModal && !showCommentsHeadingInModal ? styles.commentsSectionModalCompact : ''
      }`}
    >
      {isInModal && showCommentsHeadingInModal && (
        <div className={styles.commentsHeaderModal}>
          <h5>
            <i className="fas fa-comments"></i>
            Comments{' '}
            {safeComments.length > 0 && (
              <span className={styles.commentCount}>({safeComments.length})</span>
            )}
          </h5>
        </div>
      )}
      {!isInModal && (
        <div className={styles.commentsHeader}>
          <h5>
            <i className="fas fa-comments"></i>
            Comments {safeComments.length > 0 && <span className={styles.commentCount}>({safeComments.length})</span>}
          </h5>
          {userId && (
            <button 
              className={styles.scrollToInputBtn}
              onClick={scrollToCommentInput}
              title="Scroll to comment input"
            >
              <i className="fas fa-arrow-down"></i>
            </button>
          )}
        </div>
      )}

      {isInModal ? (
        <div className={styles.commentsMainArea}>{commentsMiddle}</div>
      ) : (
        commentsMiddle
      )}

      {userId ? (
        <div
          className={isInModal ? styles.commentFormModal : styles.commentForm}
          id="comment-form"
        >
          <div className={styles.commentInputWrapper}>
            <input 
              type="text"
              ref={commentInputRef}
              className={styles.commentInput}
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
              id="comment-input"
              disabled={isSubmittingComment}
            />
            <button 
              type="button"
              className={styles.submitComment}
              onClick={handleAddComment}
              disabled={isSubmittingComment || !newComment.trim()}
              title="Post comment"
            >
              {isSubmittingComment ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fa fa-paper-plane"></i>
              )}
            </button>
          </div>
          {newComment.trim() && (
            <div className={styles.commentHint}>
              Press Enter to post, Shift+Enter for new line
            </div>
          )}
        </div>
      ) : (
        <div className={styles.loginPrompt}>
          <p>Please <a href="/">login</a> to comment</p>
        </div>
      )}
    </div>
  );
}

