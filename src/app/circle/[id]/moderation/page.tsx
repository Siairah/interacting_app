'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import styles from './moderation.module.css';

interface Warning {
  id: string;
  message: string;
  created_at: string;
  acknowledged: boolean;
  admin: {
    id: string;
    full_name: string;
    profile_pic: string | null;
  } | null;
}

interface FlaggedPost {
  id: string;
  post_id: string | null;
  reason: string;
  created_at: string;
}

interface ReportMade {
  id: string;
  post_id: string | null;
  reason: string;
  created_at: string;
  resolved: boolean;
}

interface ReportReceived {
  id: string;
  post_id: string | null;
  reason: string;
  created_at: string;
  reported_by: {
    id: string;
    full_name: string;
    profile_pic: string | null;
  } | null;
}

interface Circle {
  id: string;
  name: string;
}

interface ModerationData {
  warnings: Warning[];
  flagged_posts: FlaggedPost[];
  reports_made: ReportMade[];
  reports_received: ReportReceived[];
  stats: {
    warnings_count: number;
    flagged_posts_count: number;
    reports_made_count: number;
    reports_received_count: number;
  };
}

export default function ModerationHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const circleId = params.id as string;

  const [circle, setCircle] = useState<Circle | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [moderationData, setModerationData] = useState<ModerationData | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const { ensureAuth } = await import('@/utils/socketAuth');
      const { token, userId } = await ensureAuth();
      
      if (!token || !userId) {
        router.replace('/');
        return;
      }
      
      setUserId(userId);
      await fetchCircleInfo(token);
      if (userId) {
        await fetchModerationData(userId as string, token);
      }
    };
    
    loadUser();
  }, [circleId, router]);

  const fetchCircleInfo = async (token?: string) => {
    try {
      const { getAuthToken } = await import('@/utils/socketAuth');
      const authToken = token || getAuthToken();
      
      const { getApiUrl } = await import('@/utils/apiUtils');
      const response = await fetch(`${getApiUrl()}/circle-details/${circleId}`, {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });
      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);

      if (data.success) {
        setCircle({
          id: data.circle.id,
          name: data.circle.name
        });
      } else {
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        console.error('Error fetching circle info:', sanitizeErrorMessage(data.message || 'Failed to fetch circle info'));
      }
    } catch (error) {
      console.error('Error fetching circle info:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModerationData = async (uid: string, token?: string) => {
    try {
      setLoadingData(true);
      const { getAuthToken } = await import('@/utils/socketAuth');
      const authToken = token || getAuthToken();

      const { getApiUrl } = await import('@/utils/apiUtils');
      const response = await fetch(`${getApiUrl()}/user-moderation-status/${circleId}?user_id=${uid}`, {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });
      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);

      if (data.success) {
        setModerationData(data);
      } else {
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        console.error('Error fetching moderation data:', sanitizeErrorMessage(data.message || 'Failed to fetch moderation data'));
      }
    } catch (error) {
      console.error('Error fetching moderation data:', error);
      const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
      const sanitizedError = sanitizeErrorMessage(error);
      if (sanitizedError !== 'An error occurred. Please try again.') {
        const { showToast } = await import('@/components/ToastContainer');
        showToast(sanitizedError, 'error');
      }
    } finally {
      setLoadingData(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  const handleAcknowledgeWarning = async (warningId: string) => {
    if (!userId) return;

    try {
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      const { getApiUrl } = await import('@/utils/apiUtils');
      
      const response = await fetch(`${getApiUrl()}/notifications/acknowledge-warning/${warningId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ user_id: userId || undefined })
      });

      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);
      
      if (data.success) {
        const { showToast } = await import('@/components/ToastContainer');
        showToast('Warning acknowledged', 'success');
        // Refresh moderation data
        if (userId) {
          const currentUserId: string = userId;
          await fetchModerationData(currentUserId, token || undefined);
        }
      } else {
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        const { showToast } = await import('@/components/ToastContainer');
        showToast(sanitizeErrorMessage(data.message || 'Failed to acknowledge warning'), 'error');
      }
    } catch (error) {
      console.error('Error acknowledging warning:', error);
      const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
      const { showToast } = await import('@/components/ToastContainer');
      showToast('Failed to acknowledge warning: ' + sanitizeErrorMessage(error), 'error');
    }
  };

  if (loading || loadingData) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading moderation history...</p>
      </div>
    );
  }

  if (!circle || !moderationData) {
    return (
      <div className={styles.errorContainer}>
        <h2>Circle Not Found</h2>
        <Link href="/circles" className={styles.backBtn}>
          Back to Circles
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Navigation />
      
      <div className={styles.content}>
        <div className={styles.pageHeader}>
          <div>
            <h2 className={styles.pageTitle}>
              <i className="fas fa-shield-alt"></i> Moderation History
            </h2>
            <p className={styles.pageSubtitle}>Your complete moderation record in this circle</p>
          </div>
          <div className={styles.circleBadge}>
            <i className="fas fa-users"></i> {circle.name}
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statContent}>
              <div>
                <h6 className={styles.statLabel}>Warnings</h6>
                <h3 className={styles.statValue}>{moderationData.stats.warnings_count}</h3>
              </div>
              <div className={styles.statIcon}>
                <i className="fas fa-exclamation-triangle"></i>
              </div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statContent}>
              <div>
                <h6 className={styles.statLabel}>Flagged Posts</h6>
                <h3 className={styles.statValue}>{moderationData.stats.flagged_posts_count}</h3>
              </div>
              <div className={styles.statIcon}>
                <i className="fas fa-flag"></i>
              </div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statContent}>
              <div>
                <h6 className={styles.statLabel}>Reports Made</h6>
                <h3 className={styles.statValue}>{moderationData.stats.reports_made_count}</h3>
              </div>
              <div className={styles.statIcon}>
                <i className="fas fa-bullhorn"></i>
              </div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statContent}>
              <div>
                <h6 className={styles.statLabel}>Reports Received</h6>
                <h3 className={styles.statValue}>{moderationData.stats.reports_received_count}</h3>
              </div>
              <div className={styles.statIcon}>
                <i className="fas fa-user-shield"></i>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h5 className={styles.sectionTitle}>
              <i className="fas fa-exclamation-triangle"></i> Warnings
            </h5>
            <span className={styles.sectionBadge}>{moderationData.warnings.length}</span>
          </div>
          <div className={styles.sectionBody}>
            {moderationData.warnings.length === 0 ? (
              <div className={styles.emptySection}>
                <i className="fas fa-check-circle"></i>
                <h5>No warnings received</h5>
                <p>You're following all community guidelines</p>
              </div>
            ) : (
              <div className={styles.listGroup}>
                {moderationData.warnings
                  .filter(warn => !warn.acknowledged)
                  .map((warn, index, filteredWarnings) => (
                  <div key={warn.id} className={styles.listItem}>
                    <div className={styles.listContent}>
                      <p className={styles.listText}>{warn.message}</p>
                      <small className={styles.listDate}>
                        <i className="far fa-clock"></i> {formatDate(warn.created_at)}
                      </small>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button 
                        className={styles.acknowledgeBtn}
                        onClick={() => handleAcknowledgeWarning(warn.id)}
                        title="Acknowledge warning"
                      >
                        <i className="fas fa-check"></i> Acknowledge
                      </button>
                    </div>
                    {index < filteredWarnings.length - 1 && <hr className={styles.listDivider} />}
                  </div>
                ))}
                {moderationData.warnings.filter(warn => warn.acknowledged).length > 0 && (
                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
                    <h6 style={{ marginBottom: '12px', color: '#999', fontSize: '0.85rem' }}>
                      Acknowledged Warnings ({moderationData.warnings.filter(warn => warn.acknowledged).length})
                    </h6>
                    {moderationData.warnings
                      .filter(warn => warn.acknowledged)
                      .map((warn, index, acknowledgedWarnings) => (
                      <div key={warn.id} className={styles.listItem} style={{ opacity: 0.6 }}>
                        <div className={styles.listContent}>
                          <p className={styles.listText}>{warn.message}</p>
                          <small className={styles.listDate}>
                            <i className="far fa-clock"></i> {formatDate(warn.created_at)}
                          </small>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ color: '#4caf50', fontSize: '0.85rem' }}>
                            <i className="fas fa-check-circle"></i> Acknowledged
                          </span>
                        </div>
                        {index < acknowledgedWarnings.length - 1 && <hr className={styles.listDivider} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h5 className={styles.sectionTitle}>
              <i className="fas fa-flag"></i> Flagged Posts
            </h5>
            <span className={styles.sectionBadge}>{moderationData.flagged_posts.length}</span>
          </div>
          <div className={styles.sectionBody}>
            {moderationData.flagged_posts.length === 0 ? (
              <div className={styles.emptySection}>
                <i className="fas fa-check-circle"></i>
                <h5>No flagged posts</h5>
                <p>Your posts comply with community standards</p>
              </div>
            ) : (
              <div className={styles.listGroup}>
                {moderationData.flagged_posts.map((flag, index) => (
                  <div key={flag.id} className={styles.listItem}>
                    <div className={styles.listContent}>
                      <div className={styles.listMeta}>
                        <span className={styles.reasonBadge}>{flag.reason}</span>
                        <small className={styles.listDate}>
                          <i className="far fa-clock"></i> {formatDate(flag.created_at)}
                        </small>
                      </div>
                      <p className={styles.listText}>Post ID: #{flag.post_id}</p>
                    </div>
                    <div className={styles.actionButtons}>
                      <Link href={`/post/${flag.post_id}`} className={styles.viewBtn} title="View post">
                        <i className="fas fa-eye"></i>
                      </Link>
                      <button className={styles.appealBtn} title="Appeal">
                        <i className="fas fa-gavel"></i>
                      </button>
                    </div>
                    {index < moderationData.flagged_posts.length - 1 && <hr className={styles.listDivider} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h5 className={styles.sectionTitle}>
              <i className="fas fa-bullhorn"></i> Reports You Made
            </h5>
            <span className={styles.sectionBadge}>{moderationData.reports_made.length}</span>
          </div>
          <div className={styles.sectionBody}>
            {moderationData.reports_made.length === 0 ? (
              <div className={styles.emptySection}>
                <i className="fas fa-check-circle"></i>
                <h5>No reports made</h5>
                <p>You haven't reported any content in this circle</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Post ID</th>
                      <th>Reason</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moderationData.reports_made.map((report) => (
                      <tr key={report.id}>
                        <td>#{report.post_id}</td>
                        <td>{report.reason}</td>
                        <td>{formatDateShort(report.created_at)}</td>
                        <td>
                          <span className={report.resolved ? styles.statusResolved : styles.statusPending}>
                            {report.resolved ? 'Resolved' : 'Pending'}
                          </span>
                        </td>
                        <td>
                          <Link href={`/post/${report.post_id}`} className={styles.viewBtn} title="View">
                            <i className="fas fa-eye"></i>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h5 className={styles.sectionTitle}>
              <i className="fas fa-user-shield"></i> Reports Against You
            </h5>
            <span className={styles.sectionBadge}>{moderationData.reports_received.length}</span>
          </div>
          <div className={styles.sectionBody}>
            {moderationData.reports_received.length === 0 ? (
              <div className={styles.emptySection}>
                <i className="fas fa-check-circle"></i>
                <h5>No reports against you</h5>
                <p>Your content follows community guidelines</p>
              </div>
            ) : (
              <div className={styles.listGroup}>
                {moderationData.reports_received.map((report, index) => (
                  <div key={report.id} className={styles.listItem}>
                    <div className={styles.listContent}>
                      <div className={styles.listMeta}>
                        <span className={styles.reasonBadge}>{report.reason}</span>
                        <small className={styles.listDate}>
                          <i className="far fa-clock"></i> {formatDate(report.created_at)}
                        </small>
                      </div>
                      {report.reported_by && (
                        <div className={styles.reporterInfo}>
                          <img 
                            src={report.reported_by.profile_pic || '/images/default_profile.png'} 
                            alt={report.reported_by.full_name}
                            className={styles.reporterAvatar}
                          />
                          <small>Reported by {report.reported_by.full_name}</small>
                        </div>
                      )}
                    </div>
                    <div className={styles.actionButtons}>
                      <Link href={`/post/${report.post_id}`} className={styles.viewBtn} title="View post">
                        <i className="fas fa-eye"></i>
                      </Link>
                      <button className={styles.appealBtn} title="Appeal">
                        <i className="fas fa-comment-alt"></i>
                      </button>
                    </div>
                    {index < moderationData.reports_received.length - 1 && <hr className={styles.listDivider} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
