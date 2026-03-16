import type { PendingRequest, Member, PendingPost, FlaggedPost, ReportedPost, RestrictedUser, BannedUser } from '../types';
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
    <div className={styles.tabNavigation}>
      <button
        className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.active : ''}`}
        onClick={() => setActiveTab('overview')}
      >
        <i className="fas fa-chart-bar"></i> Overview
      </button>
      <button
        className={`${styles.tabBtn} ${activeTab === 'requests' ? styles.active : ''}`}
        onClick={() => setActiveTab('requests')}
      >
        <i className="fas fa-user-plus"></i> Join Requests
        {pendingRequests.length > 0 && (
          <span className={styles.badge}>{pendingRequests.length}</span>
        )}
      </button>
      <button
        className={`${styles.tabBtn} ${activeTab === 'members' ? styles.active : ''}`}
        onClick={() => setActiveTab('members')}
      >
        <i className="fas fa-users"></i> Members ({members.length})
      </button>
      <button
        className={`${styles.tabBtn} ${activeTab === 'posts' ? styles.active : ''}`}
        onClick={() => setActiveTab('posts')}
      >
        <i className="fas fa-file-upload"></i> Pending Posts
        {pendingPostsCount > 0 && (
          <span className={styles.badge}>{pendingPostsCount}</span>
        )}
      </button>
      <button
        className={`${styles.tabBtn} ${activeTab === 'flagged' ? styles.active : ''}`}
        onClick={() => setActiveTab('flagged')}
      >
        <i className="fas fa-flag"></i> Flagged
        {flaggedPostsCount > 0 && (
          <span className={styles.badge}>{flaggedPostsCount}</span>
        )}
      </button>
      <button
        className={`${styles.tabBtn} ${activeTab === 'reports' ? styles.active : ''}`}
        onClick={() => setActiveTab('reports')}
      >
        <i className="fas fa-exclamation-circle"></i> Reports
        {reportedPosts.length > 0 && (
          <span className={styles.badge}>{reportedPosts.length}</span>
        )}
      </button>
      <button
        className={`${styles.tabBtn} ${activeTab === 'restricted' ? styles.active : ''}`}
        onClick={() => setActiveTab('restricted')}
      >
        <i className="fas fa-user-clock"></i> Restricted Users
        {restrictedUsers.length > 0 && (
          <span className={styles.badge}>{restrictedUsers.length}</span>
        )}
      </button>
      <button
        className={`${styles.tabBtn} ${activeTab === 'banned' ? styles.active : ''}`}
        onClick={() => setActiveTab('banned')}
      >
        <i className="fas fa-ban"></i> Banned Users
        {bannedUsers.length > 0 && (
          <span className={styles.badge}>{bannedUsers.length}</span>
        )}
      </button>
    </div>
  );
}

