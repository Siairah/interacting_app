import type { FlaggedPost } from '../types';
import styles from '../manage.module.css';

interface FlaggedTabProps {
  flaggedPosts: FlaggedPost[];
  onViewPost: (postId: string) => void;
  onApprove: (moderationId: string) => void;
  onReject: (moderationId: string) => void;
}

export default function FlaggedTab({ flaggedPosts, onViewPost, onApprove, onReject }: FlaggedTabProps) {
  return (
    <div className={styles.tabContent}>
      <h3 className={styles.sectionTitle}>Flagged Content (NSFW / Inappropriate)</h3>
      {flaggedPosts.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="fas fa-check-circle"></i>
          <p>No flagged content to review</p>
        </div>
      ) : (
        <div className={styles.postList}>
          {flaggedPosts.map((flagged) => (
            <div
              key={flagged.id}
              className={styles.flaggedPostCard}
              onClick={() => onViewPost(flagged.post.id)}
              title="Click to view full post"
            >
              <img
                src={flagged.post.user.profile_pic || '/images/default_profile.png'}
                alt={flagged.post.user.full_name}
                className={styles.userAvatar}
              />
              <div className={styles.postInfo}>
                <h4>{flagged.post.user.full_name}</h4>
                <p className={styles.postContent}>{flagged.post.content}</p>

                {flagged.post.media_files && flagged.post.media_files.length > 0 && (
                  <div className={styles.postMediaGrid}>
                    {flagged.post.media_files.map((media, idx) => (
                      <img
                        key={idx}
                        src={media.file}
                        alt={`Post media ${idx + 1}`}
                        className={styles.postMediaImage}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ))}
                  </div>
                )}

                {flagged.evidence_image && (
                  <div className={styles.evidenceSection}>
                    <strong>Evidence:</strong>
                    <img
                      src={flagged.evidence_image}
                      alt="Evidence"
                      className={styles.evidenceImage}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}

                <p className={styles.flagReason}>
                  <strong>Reason:</strong> {flagged.reason}
                </p>
                <p className={styles.flaggedBy}>
                  <strong>Flagged by:</strong> {flagged.flagged_by.full_name}
                </p>
                <span className={styles.postDate}>
                  {new Date(flagged.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className={styles.postActions} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onApprove(flagged.id)}
                  className={styles.approveBtn}
                  title="Approve - keep the post visible"
                >
                  <i className="fas fa-check"></i>
                </button>
                <button
                  onClick={() => onReject(flagged.id)}
                  className={styles.rejectBtn}
                  title="Reject - delete the post"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

