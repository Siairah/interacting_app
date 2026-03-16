import type { ReportedPost } from '../types';
import styles from '../manage.module.css';

interface ReportsTabProps {
  reportedPosts: ReportedPost[];
  onViewPost: (postId: string) => void;
  onApprove: (postId: string) => void;
  onReject: (postId: string) => void;
}

export default function ReportsTab({ reportedPosts, onViewPost, onApprove, onReject }: ReportsTabProps) {
  return (
    <div className={styles.tabContent}>
      <h3 className={styles.sectionTitle}>User Reports</h3>
      {reportedPosts.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="fas fa-inbox"></i>
          <p>No reported posts</p>
        </div>
      ) : (
        <div className={styles.postList}>
          {reportedPosts.map((report) => (
            <div
              key={report.id}
              className={styles.reportedPostCard}
              onClick={() => onViewPost(report.post.id)}
              title="Click to view full post"
            >
              <img
                src={report.post.user.profile_pic || '/images/default_profile.png'}
                alt={report.post.user.full_name}
                className={styles.userAvatar}
              />
              <div className={styles.postInfo}>
                <h4>{report.post.user.full_name}</h4>
                <p className={styles.postContent}>{report.post.content}</p>

                {report.post.media_files && report.post.media_files.length > 0 && (
                  <div className={styles.postMediaGrid}>
                    {report.post.media_files.map((media, idx) => (
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

                {report.evidence_image && (
                  <div className={styles.evidenceSection}>
                    <strong>Evidence:</strong>
                    <img
                      src={report.evidence_image}
                      alt="Evidence"
                      className={styles.evidenceImage}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}

                <p className={styles.reportReason}>
                  <strong>Report:</strong> {report.reason}
                </p>
                <p className={styles.reportedBy}>
                  <strong>Reported by:</strong> {report.reported_by.full_name}
                </p>
                <span className={styles.postDate}>
                  {new Date(report.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className={styles.postActions} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onApprove(report.post.id)}
                  className={styles.approveBtn}
                  title="Approve - keep the post"
                >
                  <i className="fas fa-check"></i>
                </button>
                <button
                  onClick={() => onReject(report.post.id)}
                  className={styles.rejectBtn}
                  title="Remove - delete the post"
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

