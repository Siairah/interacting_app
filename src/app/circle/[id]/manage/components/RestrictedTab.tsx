import type { RestrictedUser } from '../types';
import styles from '../manage.module.css';

interface RestrictedTabProps {
  restrictedUsers: RestrictedUser[];
  onUnrestrict: (restrictedUserId: string, userName: string) => void;
}

export default function RestrictedTab({ restrictedUsers, onUnrestrict }: RestrictedTabProps) {
  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>
          <i className="fas fa-user-clock"></i> Restricted Users
        </h3>
        <p className={styles.sectionDescription}>
          Users temporarily restricted from this circle. You can remove restrictions early to restore access.
        </p>
      </div>
      {restrictedUsers.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <i className="fas fa-user-check"></i>
          </div>
          <h4>No Restricted Users</h4>
          <p className={styles.emptyText}>All users have full access to this circle.</p>
        </div>
      ) : (
        <div className={styles.restrictedUsersList}>
          {restrictedUsers.map((restrictedUser) => {
            const restrictedUntil = new Date(restrictedUser.restricted_until);
            const now = new Date();
            const daysRemaining = Math.ceil((restrictedUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const hoursRemaining = Math.ceil((restrictedUntil.getTime() - now.getTime()) / (1000 * 60 * 60));
            const isExpired = daysRemaining <= 0;

            return (
              <div key={restrictedUser.id} className={styles.restrictedUserCard}>
                <div className={styles.restrictedUserHeader}>
                  <div className={styles.restrictedUserAvatar}>
                    <img
                      src={restrictedUser.user.profile_pic || '/images/default_profile.png'}
                      alt={restrictedUser.user.full_name}
                    />
                    <div className={styles.restrictedBadge}>
                      <i className="fas fa-lock"></i>
                    </div>
                  </div>
                  <div className={styles.restrictedUserInfo}>
                    <h4>{restrictedUser.user.full_name}</h4>
                    <p className={styles.restrictedUserEmail}>{restrictedUser.user.email}</p>
                  </div>
                  <div className={styles.restrictedUserActions}>
                    <button
                      className={styles.removeRestrictionBtn}
                      onClick={() => onUnrestrict(restrictedUser.user.id, restrictedUser.user.full_name)}
                      title="Remove restriction and restore access"
                    >
                      <i className="fas fa-unlock-alt"></i>
                      <span>Remove Restriction</span>
                    </button>
                  </div>
                </div>

                <div className={styles.restrictedUserDetails}>
                  {restrictedUser.reason && (
                    <div className={styles.restrictionReason}>
                      <i className="fas fa-info-circle"></i>
                      <span><strong>Reason:</strong> {restrictedUser.reason}</span>
                    </div>
                  )}

                  <div className={styles.restrictionTimeline}>
                    <div className={styles.timelineItem}>
                      <i className="fas fa-calendar-check"></i>
                      <div>
                        <span className={styles.timelineLabel}>Restricted Until</span>
                        <span className={styles.timelineValue}>
                          {restrictedUntil.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })} at {restrictedUntil.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    <div className={styles.timelineItem}>
                      <i className={`fas ${isExpired ? 'fa-check-circle' : 'fa-hourglass-half'}`}></i>
                      <div>
                        <span className={styles.timelineLabel}>Time Remaining</span>
                        <span className={`${styles.timelineValue} ${isExpired ? styles.expired : styles.active}`}>
                          {isExpired
                            ? 'Expired - Ready to remove'
                            : daysRemaining >= 1
                              ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`
                              : `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

