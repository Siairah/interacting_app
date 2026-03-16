'use client';

import { useState, useRef, useEffect } from 'react';
import { Post } from './types';
import styles from './ReportPostModal.module.css';

interface ReportPostModalProps {
  post: Post;
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onReportSubmitted?: () => void;
}

export default function ReportPostModal({
  post,
  userId,
  isOpen,
  onClose,
  onReportSubmitted
}: ReportPostModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [checkingReport, setCheckingReport] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Check if user has already reported this post when modal opens
  useEffect(() => {
    const checkIfAlreadyReported = async () => {
      if (!userId || !post.id) return;
      
      setCheckingReport(true);
      try {
        const { getApiUrl } = await import('@/utils/apiUtils');
        const response = await fetch(`${getApiUrl()}/posts/check-report?post_id=${post.id}&user_id=${userId}`);
        
        if (response.ok) {
          const { safeJson } = await import('@/utils/apiUtils');
          const data = await safeJson<any>(response);
          if (data.hasReported) {
            setHasReported(true);
            const { showToast } = await import('@/components/ToastContainer');
            showToast('You have already reported this post.', 'warning');
          }
        }
      } catch (error) {
        console.error('Error checking report status:', error);
        // Don't show error to user, just allow them to try
      } finally {
        setCheckingReport(false);
      }
    };

    if (isOpen && userId && post.id) {
      checkIfAlreadyReported();
    } else {
      // Reset state when modal closes
      setHasReported(false);
      setReason('');
      setCheckingReport(false);
    }
  }, [isOpen, userId, post.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !reason.trim() || isSubmitting || hasReported) return;

    // Prevent multiple submissions
    if (submitButtonRef.current) {
      submitButtonRef.current.disabled = true;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('post_id', post.id);
      formData.append('reason', reason.trim());

      // Use Socket.IO token for API call
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      const { getApiUrl } = await import('@/utils/apiUtils');
      const response = await fetch(`${getApiUrl()}/posts/report`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        const { showToast } = await import('@/components/ToastContainer');
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        
        // Handle specific error cases
        if (response.status === 400 && errorData.message?.toLowerCase().includes('already reported')) {
          showToast('You have already reported this post.', 'warning');
          setHasReported(true);
          onClose();
          return;
        }
        
        showToast(sanitizeErrorMessage(errorData.message || `Failed to report post (${response.status})`), 'error');
        return;
      }

      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);
      
      if (data.success) {
        const { showToast } = await import('@/components/ToastContainer');
        showToast('Post reported successfully. Circle admins will review it.', 'success');
        setReason('');
        setHasReported(true);
        onClose();
        if (onReportSubmitted) {
          onReportSubmitted();
        }
      } else {
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        const { showToast } = await import('@/components/ToastContainer');
        showToast(sanitizeErrorMessage(data.message || 'Failed to report post'), 'error');
      }
    } catch (error) {
      console.error('Error reporting post:', error);
      const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
      const { showToast } = await import('@/components/ToastContainer');
      showToast(`Failed to report post: ${sanitizeErrorMessage(error)}`, 'error');
    } finally {
      setIsSubmitting(false);
      if (submitButtonRef.current) {
        submitButtonRef.current.disabled = false;
      }
    }
  };

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleEscape);
  }

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
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <i className="fas fa-flag"></i> Report Post
          </h3>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.postPreview}>
            <div className={styles.postPreviewHeader}>
              <img
                src={post.user.profile_pic || '/images/default_profile.png'}
                alt={post.user.full_name}
                className={styles.postPreviewAvatar}
              />
              <div>
                <strong>{post.user.full_name}</strong>
                <span className={styles.postPreviewDate}>
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <p className={styles.postPreviewContent}>{post.content}</p>
          </div>

          {hasReported ? (
            <div className={styles.alreadyReported}>
              <i className="fas fa-info-circle"></i>
              <p>You have already reported this post. Circle admins will review it.</p>
            </div>
          ) : (
            <div className={styles.formGroup}>
              <label htmlFor="reportReason" className={styles.label}>
                <i className="fas fa-comment-alt"></i> Reason for Reporting *
              </label>
              <textarea
                id="reportReason"
                className={styles.textarea}
                placeholder="Please describe why you are reporting this post..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={5}
                disabled={isSubmitting || checkingReport}
              />
            </div>
          )}

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              ref={submitButtonRef}
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting || !reason.trim() || hasReported || checkingReport}
            >
              {checkingReport ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Checking...
                </>
              ) : isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Submitting...
                </>
              ) : hasReported ? (
                <>
                  <i className="fas fa-check"></i> Already Reported
                </>
              ) : (
                <>
                  <i className="fas fa-flag"></i> Submit Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

