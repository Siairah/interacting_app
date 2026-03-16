import type { PendingRequest } from '../types';
import styles from '../manage.module.css';

interface RequestsTabProps {
  pendingRequests: PendingRequest[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export default function RequestsTab({ pendingRequests, onApprove, onReject }: RequestsTabProps) {
  return (
    <div className={styles.tabContent}>
      <h3 className={styles.sectionTitle}>Pending Join Requests</h3>
      {pendingRequests.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="fas fa-inbox"></i>
          <p>No pending join requests</p>
        </div>
      ) : (
        <div className={styles.requestList}>
          {pendingRequests.map((request) => (
            <div key={request.id} className={styles.requestCard}>
              <img
                src={request.user.profile_pic || '/images/default_profile.png'}
                alt={request.user.full_name}
                className={styles.userAvatar}
              />
              <div className={styles.requestInfo}>
                <h4>{request.user.full_name}</h4>
                <p className={styles.userEmail}>{request.user.email}</p>
                {request.message && (
                  <p className={styles.requestMessage}>{request.message}</p>
                )}
                <span className={styles.requestDate}>
                  {new Date(request.requested_at).toLocaleDateString()}
                </span>
              </div>
              <div className={styles.requestActions}>
                <button
                  onClick={() => onApprove(request.id)}
                  className={styles.approveBtn}
                >
                  <i className="fas fa-check"></i> Approve
                </button>
                <button
                  onClick={() => onReject(request.id)}
                  className={styles.rejectBtn}
                >
                  <i className="fas fa-times"></i> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

