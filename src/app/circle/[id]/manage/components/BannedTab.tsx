import type { BannedUser } from '../types';
import styles from '../manage.module.css';

interface BannedTabProps {
  bannedUsers: BannedUser[];
  onUnban: (userId: string) => void;
}

export default function BannedTab({ bannedUsers, onUnban }: BannedTabProps) {
  return (
    <div className={styles.tabContent}>
      <h3 className={styles.sectionTitle}>Banned Users</h3>
      {bannedUsers.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="fas fa-ban"></i>
          <p>No banned users</p>
        </div>
      ) : (
        <div className={styles.memberList}>
          {bannedUsers.map((bannedUser) => (
            <div key={bannedUser.id} className={styles.memberCard}>
              <img
                src={bannedUser.user.profile_pic || '/images/default_profile.png'}
                alt={bannedUser.user.full_name}
                className={styles.userAvatar}
              />
              <div className={styles.memberInfo}>
                <h4>{bannedUser.user.full_name}</h4>
                <p className={styles.userEmail}>{bannedUser.user.email}</p>
              </div>
              <div className={styles.memberActions}>
                <button
                  className={styles.unbanBtn}
                  onClick={() => onUnban(bannedUser.user.id)}
                  title="Unban user"
                >
                  <i className="fas fa-unlock"></i> Unban
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

