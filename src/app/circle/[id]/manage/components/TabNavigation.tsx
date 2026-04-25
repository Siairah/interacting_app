import type { PendingRequest, Member, ReportedPost, RestrictedUser, BannedUser } from '../types';
import styles from '../manage.module.css';

type TabType = 'overview' | 'requests' | 'members' | 'posts' | 'flagged' | 'reports' | 'restricted' | 'banned';

interface TabNavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  pendingRequests: PendingRequest[];
  members: Member[];
  pendingPostsCount: number;
  flaggedPostsCount: number;
  reportedPosts: ReportedPost[];
  restrictedUsers: RestrictedUser[];
  bannedUsers: BannedUser[];
}

export default function TabNavigation({
  activeTab,
  setActiveTab,
  pendingRequests,
  members,
  pendingPostsCount,
  flaggedPostsCount,
  reportedPosts,
  restrictedUsers,
  bannedUsers
}: TabNavigationProps) {
  return (
    <div className={styles.tabNavigation} role="tablist" aria-label="Management sections">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'overview'}
        className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.active : ''}`}
        onClick={() => setActiveTab('overview')}
      >
        <i className="fas fa-chart-bar" aria-hidden />
        Overview
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'requests'}
        className={`${styles.tabBtn} ${activeTab === 'requests' ? styles.active : ''}`}
        onClick={() => setActiveTab('requests')}
        aria-label={`Join requests${pendingRequests.length ? `, ${pendingRequests.length} pending` : ''}`}
      >
        <i className="fas fa-user-plus" aria-hidden />
        <span className={styles.tabDesktopOnly}>Join Requests</span>
        <span className={styles.tabMobileOnly}>Requests</span>
        {pendingRequests.length > 0 && (
          <span className={styles.badge}>{pendingRequests.length}</span>
        )}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'members'}
        className={`${styles.tabBtn} ${activeTab === 'members' ? styles.active : ''}`}
        onClick={() => setActiveTab('members')}
        aria-label={`Members, ${members.length} total`}
      >
        <i className="fas fa-users" aria-hidden />
        Members ({members.length})
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'posts'}
        className={`${styles.tabBtn} ${activeTab === 'posts' ? styles.active : ''}`}
        onClick={() => setActiveTab('posts')}
        aria-label={`Pending posts to review${pendingPostsCount ? `, ${pendingPostsCount} pending` : ''}`}
      >
        <i className="fas fa-file-upload" aria-hidden />
        <span className={styles.tabDesktopOnly}>Pending Posts</span>
        <span className={styles.tabMobileOnly}>Posts</span>
        {pendingPostsCount > 0 && (
          <span className={styles.badge}>{pendingPostsCount}</span>
        )}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'flagged'}
        className={`${styles.tabBtn} ${activeTab === 'flagged' ? styles.active : ''}`}
        onClick={() => setActiveTab('flagged')}
        aria-label={`Flagged content${flaggedPostsCount ? `, ${flaggedPostsCount} items` : ''}`}
      >
        <i className="fas fa-flag" aria-hidden />
        Flagged
        {flaggedPostsCount > 0 && (
          <span className={styles.badge}>{flaggedPostsCount}</span>
        )}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'reports'}
        className={`${styles.tabBtn} ${activeTab === 'reports' ? styles.active : ''}`}
        onClick={() => setActiveTab('reports')}
        aria-label={`Reports${reportedPosts.length ? `, ${reportedPosts.length} open` : ''}`}
      >
        <i className="fas fa-exclamation-circle" aria-hidden />
        Reports
        {reportedPosts.length > 0 && (
          <span className={styles.badge}>{reportedPosts.length}</span>
        )}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'restricted'}
        className={`${styles.tabBtn} ${activeTab === 'restricted' ? styles.active : ''}`}
        onClick={() => setActiveTab('restricted')}
        aria-label={`Restricted users${restrictedUsers.length ? `, ${restrictedUsers.length}` : ''}`}
      >
        <i className="fas fa-user-clock" aria-hidden />
        <span className={styles.tabDesktopOnly}>Restricted Users</span>
        <span className={styles.tabMobileOnly}>Restricted</span>
        {restrictedUsers.length > 0 && (
          <span className={styles.badge}>{restrictedUsers.length}</span>
        )}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'banned'}
        className={`${styles.tabBtn} ${activeTab === 'banned' ? styles.active : ''}`}
        onClick={() => setActiveTab('banned')}
        aria-label={`Banned users${bannedUsers.length ? `, ${bannedUsers.length}` : ''}`}
      >
        <i className="fas fa-ban" aria-hidden />
        <span className={styles.tabDesktopOnly}>Banned Users</span>
        <span className={styles.tabMobileOnly}>Banned</span>
        {bannedUsers.length > 0 && (
          <span className={styles.badge}>{bannedUsers.length}</span>
        )}
      </button>
    </div>
  );
}

