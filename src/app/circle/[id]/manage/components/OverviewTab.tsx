import { useState, useRef, useEffect } from 'react';
import type { PendingRequest } from '../types';
import type { Circle } from '../types';
import styles from '../manage.module.css';
import { showToast } from '@/components/ToastContainer';

interface OverviewTabProps {
  pendingRequests: PendingRequest[];
  pendingPostsCount: number;
  flaggedPostsCount: number;
  adminCount: number;
  circle?: Circle;
  onUpdateCircle?: (updates: { cover_image?: File | null; remove_cover_image?: boolean }) => Promise<void>;
}

export default function OverviewTab({
  pendingRequests,
  pendingPostsCount,
  flaggedPostsCount,
  adminCount,
  circle,
  onUpdateCircle
}: OverviewTabProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear preview after successful upload/remove (when circle data updates)
  useEffect(() => {
    // This effect runs when circle data changes after a successful update
    // The preview will be cleared in handleUpload/handleRemove after success
    // This is just a safety check
  }, [circle?.cover_image]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image size should be less than 10MB', 'error');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !onUpdateCircle) {
      showToast('Please select an image file', 'error');
      return;
    }

    setUploading(true);
    try {
      await onUpdateCircle({ cover_image: file });
      // Success toast is shown in handleUpdateCircle
      // Clear preview and reset file input after successful upload
      // Wait a bit for the data to refresh
      setTimeout(() => {
        setPreviewImage(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 500);
    } catch (error) {
      console.error('Error uploading banner:', error);
      // Error toast is shown in handleUpdateCircle
      // Keep preview so user can try again
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!onUpdateCircle) return;

    const { confirmDialog } = await import('@/utils/confirmDialog');
    const confirmed = await confirmDialog(
      'Are you sure you want to remove the banner?',
      'Remove',
      'Cancel',
      'danger'
    );
    
    if (!confirmed) return;

    setUploading(true);
    try {
      await onUpdateCircle({ remove_cover_image: true });
      // Success toast is shown in handleUpdateCircle
      // Clear preview and reset file input after successful removal
      // Wait a bit for the data to refresh
      setTimeout(() => {
        setPreviewImage(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 500);
    } catch (error) {
      console.error('Error removing banner:', error);
      // Error toast is shown in handleUpdateCircle
    } finally {
      setUploading(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.tabContent}>
      <h3 className={styles.sectionTitle}>Dashboard Overview</h3>
      
      {/* Banner Upload Section */}
      {onUpdateCircle && (
        <div className={styles.settingsCard}>
          <h4 className={styles.cardTitle}>
            <i className="fas fa-image"></i> Circle Banner
          </h4>
          <div className={styles.bannerSection}>
            <div className={styles.bannerPreview}>
              <img 
                src={previewImage || circle?.cover_image || '/images/banner.png'} 
                alt="Circle banner"
                className={styles.bannerImage}
              />
            </div>
            <div className={styles.bannerActions}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className={styles.hiddenInput}
                id="banner-upload"
                disabled={uploading}
              />
              <label 
                htmlFor="banner-upload" 
                className={styles.uploadBtn} 
                style={{ 
                  opacity: uploading ? 0.6 : 1,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  pointerEvents: uploading ? 'none' : 'auto'
                }}
              >
                <i className="fas fa-upload"></i> {previewImage ? 'Change Banner' : circle?.cover_image ? 'Change Banner' : 'Upload Banner'}
              </label>
              {previewImage && (
                <>
                  <button
                    onClick={handleUpload}
                    className={styles.saveBtn}
                    disabled={uploading}
                    type="button"
                  >
                    {uploading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i> Uploading...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check"></i> Save
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelPreview}
                    className={styles.cancelBtn}
                    disabled={uploading}
                    type="button"
                  >
                    <i className="fas fa-times"></i> Cancel
                  </button>
                </>
              )}
              {circle?.cover_image && !previewImage && !uploading && (
                <button
                  onClick={handleRemove}
                  className={styles.removeBtn}
                  disabled={uploading}
                  type="button"
                >
                  <i className="fas fa-trash"></i> Remove Banner
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={styles.gridLayout}>
        <div className={styles.gridCard}>
          <h4 className={styles.cardTitle}>
            <i className="fas fa-user-plus"></i> Recent Join Requests
          </h4>
          {pendingRequests.length === 0 ? (
            <p className={styles.emptyText}>No pending requests</p>
          ) : (
            <div className={styles.miniList}>
              {pendingRequests.slice(0, 3).map((req) => (
                <div key={req.id} className={styles.miniItem}>
                  <img src={req.user.profile_pic || '/images/default_profile.png'} alt={req.user.full_name} />
                  <div className={styles.miniItemText}>
                    <p className={styles.userName}>{req.user.full_name}</p>
                    <p className={styles.miniMeta}>{new Date(req.requested_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.gridCard}>
          <h4 className={styles.cardTitle}>
            <i className="fas fa-file-upload"></i> Pending Posts
          </h4>
          {pendingPostsCount === 0 ? (
            <p className={styles.emptyText}>No pending posts</p>
          ) : (
            <p className={styles.highlightedCount}>{pendingPostsCount} posts waiting for approval</p>
          )}
        </div>

        <div className={styles.gridCard}>
          <h4 className={styles.cardTitle}>
            <i className="fas fa-flag"></i> Flagged Content
          </h4>
          {flaggedPostsCount === 0 ? (
            <p className={styles.emptyText}>No flagged content</p>
          ) : (
            <p className={styles.highlightedCount}>{flaggedPostsCount} items need review</p>
          )}
        </div>

        <div className={styles.gridCard}>
          <h4 className={styles.cardTitle}>
            <i className="fas fa-shield-alt"></i> Admin Team
          </h4>
          <p className={styles.adminCount}>{adminCount} / 3 Admins</p>
        </div>
      </div>
    </div>
  );
}

