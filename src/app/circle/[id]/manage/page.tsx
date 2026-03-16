'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import ToastContainer from '@/components/ToastContainer';
import ViewPostModal from '@/components/ViewPostModal';
import { useCircleManagement } from './hooks/useCircleManagement';
import { useCircleHandlers } from './hooks/useCircleHandlers';
import { usePostViewer } from './hooks/usePostViewer';
import TabNavigation from './components/TabNavigation';
import OverviewTab from './components/OverviewTab';
import RequestsTab from './components/RequestsTab';
import MembersTab from './components/MembersTab';
import PostsTab from './components/PostsTab';
import FlaggedTab from './components/FlaggedTab';
import ReportsTab from './components/ReportsTab';
import RestrictedTab from './components/RestrictedTab';
import BannedTab from './components/BannedTab';
import styles from './manage.module.css';

type TabType = 'overview' | 'requests' | 'members' | 'posts' | 'flagged' | 'reports' | 'restricted' | 'banned';

export default function ManageCirclePage() {
  const params = useParams();
  const router = useRouter();
  const circleId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [overlayText, setOverlayText] = useState<string | null>(null);
  
  // Hide-on-scroll navbar state
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const lastToggleTsRef = useRef<number>(0);

  const {
    loading,
    userId,
    circle,
    managementData,
    bannedUsers,
    restrictedUsers,
    refreshData,
    fetchRestrictedUsers,
    fetchBannedUsers
  } = useCircleManagement(circleId);

  const handlers = useCircleHandlers(circleId, userId, refreshData, setOverlayText);
  const { selectedPost, showPostModal, handleViewPost, closeModal } = usePostViewer(userId);

  // Refetch restricted users when the restricted tab is clicked
  useEffect(() => {
    if (activeTab === 'restricted' && userId) {
      fetchRestrictedUsers();
    }
  }, [activeTab, userId, fetchRestrictedUsers]);

  // Hide navbar on scroll down (after threshold), show on scroll up (small delta), with debounce
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const HIDE_THRESHOLD = 64;
    const SHOW_DELTA = 3;
    const MIN_TOGGLE_INTERVAL = 180;
    const SCROLL_TO_TOP_THRESHOLD = 300;

    const onScroll = () => {
      if (rafIdRef.current) return;
      rafIdRef.current = requestAnimationFrame(() => {
        const now = performance.now();
        if (now - lastToggleTsRef.current < MIN_TOGGLE_INTERVAL) {
          rafIdRef.current = null;
          return;
        }

        const current = el.scrollTop;
        const last = lastScrollTopRef.current;

        setShowScrollToTop(current > SCROLL_TO_TOP_THRESHOLD);

        if (current <= 0) {
          if (isNavHidden) {
            setIsNavHidden(false);
            lastToggleTsRef.current = now;
          }
        } else if (current > last + SHOW_DELTA && current > HIDE_THRESHOLD) {
          if (!isNavHidden) {
            setIsNavHidden(true);
            lastToggleTsRef.current = now;
          }
        } else if (current < last - SHOW_DELTA) {
          if (isNavHidden) {
            setIsNavHidden(false);
            lastToggleTsRef.current = now;
          }
        }

        lastScrollTopRef.current = current;
        rafIdRef.current = null;
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll as EventListener);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [isNavHidden]);

  const scrollToTop = () => {
    if (contentRef.current) {
      contentRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };


  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading management dashboard...</p>
      </div>
    );
  }

  if (!circle || !managementData) {
    return (
      <div className={styles.errorContainer}>
        <h2>Circle Not Found</h2>
        <Link href={`/circle/${circleId}`} className={styles.backBtn}>
          Back to Circle
        </Link>
      </div>
    );
  }

  const {
    members,
    pending_requests,
    pending_posts,
    flagged_posts,
    reported_posts,
    admin_count,
    pending_posts_count,
    flagged_posts_count
  } = managementData;

  return (
    <div className={styles.container}>
      <Navigation isHidden={isNavHidden} />

      {showScrollToTop && (
        <button
          onClick={scrollToTop}
          className={styles.scrollToTopBtn}
          title="Scroll to top"
        >
          <i className="fas fa-chevron-up"></i>
        </button>
      )}

      <div ref={contentRef} className={`${styles.content} ${isNavHidden ? styles.compactTop : ''}`}>
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>
              <i className="fas fa-users-cog"></i>
              {circle.name} Management
            </h1>
            <div className={styles.circleMeta}>
              <span className={styles.metaBadge}>
                <i className="fas fa-users"></i> {members.length} Members
              </span>
              <span className={styles.metaBadge}>
                <i className="fas fa-user-shield"></i> {admin_count} Admins
              </span>
              <span className={styles.metaBadge}>
                <i className="fas fa-clock"></i> {pending_requests.length} Pending
              </span>
              <span className={styles.metaBadge}>
                <i className="fas fa-flag"></i> {flagged_posts_count} Flagged
              </span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button
              onClick={() => {
                const newVisibility = circle.visibility === 'public' ? 'private' : 'public';
                handlers.handleUpdateCircle({ visibility: newVisibility });
              }}
              className={styles.visibilityBtn}
              title={`Change to ${circle.visibility === 'public' ? 'Private' : 'Public'}`}
            >
              <i className={`fas fa-${circle.visibility === 'public' ? 'lock' : 'globe'}`}></i>
              Make {circle.visibility === 'public' ? 'Private' : 'Public'}
            </button>
            <Link href={`/circle/${circleId}`} className={styles.backLink}>
              <i className="fas fa-arrow-left"></i> Back to Circle
            </Link>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{members.length}</div>
            <div className={styles.statLabel}>
              <i className="fas fa-users"></i> Members
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{pending_requests.length}</div>
            <div className={styles.statLabel}>
              <i className="fas fa-user-plus"></i> Pending Requests
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{pending_posts_count}</div>
            <div className={styles.statLabel}>
              <i className="fas fa-file-upload"></i> Posts to Review
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{flagged_posts_count}</div>
            <div className={styles.statLabel}>
              <i className="fas fa-flag"></i> Flagged Items
            </div>
          </div>
        </div>

        <TabNavigation
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingRequests={pending_requests}
          members={members}
          pendingPostsCount={pending_posts_count}
          flaggedPostsCount={flagged_posts_count}
          reportedPosts={reported_posts}
          restrictedUsers={restrictedUsers}
          bannedUsers={bannedUsers}
        />

        {activeTab === 'overview' && (
          <OverviewTab
            pendingRequests={pending_requests}
            pendingPostsCount={pending_posts_count}
            flaggedPostsCount={flagged_posts_count}
            adminCount={admin_count}
            circle={circle}
            onUpdateCircle={handlers.handleUpdateCircle}
          />
        )}

        {activeTab === 'requests' && (
          <RequestsTab
            pendingRequests={pending_requests}
            onApprove={handlers.handleApproveRequest}
            onReject={handlers.handleRejectRequest}
          />
        )}

        {activeTab === 'members' && (
          <MembersTab
            members={members}
            adminCount={admin_count}
            onPromoteAdmin={(userId) => handlers.handlePromoteAdmin(userId, admin_count)}
            onRemoveAdmin={handlers.handleRemoveAdmin}
            onRestrictUser={handlers.handleRestrictUser}
            onBanUser={handlers.handleBanUser}
            onRemoveMember={handlers.handleRemoveMember}
          />
        )}

        {activeTab === 'posts' && (
          <PostsTab
            pendingPosts={pending_posts}
            onApprove={handlers.handleApprovePost}
            onReject={handlers.handleRejectPost}
          />
        )}

        {activeTab === 'flagged' && (
          <FlaggedTab
            flaggedPosts={flagged_posts}
            onViewPost={handleViewPost}
            onApprove={handlers.handleApproveFlaggedPost}
            onReject={handlers.handleRejectFlaggedPost}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsTab
            reportedPosts={reported_posts}
            onViewPost={handleViewPost}
            onApprove={handlers.handleApprovePost}
            onReject={handlers.handleRejectPost}
          />
        )}

        {activeTab === 'restricted' && (
          <RestrictedTab
            restrictedUsers={restrictedUsers}
            onUnrestrict={(restrictedUserId, userName) =>
              handlers.handleUnrestrictUser(restrictedUserId, userName, fetchRestrictedUsers)
            }
          />
        )}

        {activeTab === 'banned' && (
          <BannedTab
            bannedUsers={bannedUsers}
            onUnban={(userId) =>
              handlers.handleUnbanUser(userId, fetchBannedUsers, fetchRestrictedUsers)
            }
          />
        )}
      </div>

      {overlayText && (
        <div className={styles.overlayLoader}>
          <div className={styles.overlayBox}>
            <img src="/images/waiting.gif" alt="Loading" className={styles.overlayGif} />
            <div className={styles.overlayText}>{overlayText}</div>
          </div>
        </div>
      )}

      <ToastContainer />

      {showPostModal && selectedPost && (
        <ViewPostModal
          post={selectedPost}
          userId={userId || undefined}
          isOpen={showPostModal}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
