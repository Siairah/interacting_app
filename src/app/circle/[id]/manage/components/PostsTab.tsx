import type { PendingPost } from '../types';
import styles from '../manage.module.css';

interface PostsTabProps {
  pendingPosts: PendingPost[];
  onApprove: (postId: string) => void;
  onReject: (postId: string) => void;
}

export default function PostsTab({ pendingPosts, onApprove, onReject }: PostsTabProps) {
  return (
    <div className={styles.tabContent}>
      <h3 className={styles.sectionTitle}>Pending Posts for Approval</h3>
      {pendingPosts.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="fas fa-check-circle"></i>
          <p>No pending posts to review</p>
        </div>
      ) : (
        <div className={styles.postList}>
          {pendingPosts.map((post) => (
            <div key={post.id} className={styles.postCard}>
              <img
                src={post.user.profile_pic || '/images/default_profile.png'}
                alt={post.user.full_name}
                className={styles.userAvatar}
              />
              <div className={styles.postInfo}>
                <h4>{post.user.full_name}</h4>
                <p className={styles.postContent}>{post.content}</p>
                <span className={styles.postDate}>
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className={styles.postActions}>
                <button
                  onClick={() => onApprove(post.id)}
                  className={styles.approveBtn}
                  title="Approve this post"
                >
                  <i className="fas fa-check"></i>
                </button>
                <button
                  onClick={() => onReject(post.id)}
                  className={styles.rejectBtn}
                  title="Reject this post"
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

