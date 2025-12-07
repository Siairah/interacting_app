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
}

export default function CommentsSection({
  postId,
  comments,
  userId,
  onCommentAdded,
  initialShowLimit = 10,
  isLoading = false,
  isInModal = false
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
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/add-comment/${postId}`, {
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

      const data = await response.json();
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
        alert('Failed to add comment: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const scrollToCommentInput = () => {
    commentInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    commentInputRef.current?.focus();
  };

  return (
    <div className={styles.commentsSection}>
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
          <div className={styles.commentList}>
            {visibleComments.map(comment => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
            <div ref={commentsEndRef} />
          </div>

          {hasMoreComments && !showMoreComments && (
            <div className={styles.moreCommentsContainer}>
              <button 
                className={styles.moreCommentsBtn}
                onClick={() => setShowMoreComments(true)}
              >
                <i className="fas fa-chevron-down"></i> View {safeComments.length - initialShowLimit} More Comments
              </button>
            </div>
          )}
        </>
      )}

      {userId ? (
        <div className={styles.commentForm} id="comment-form">
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

