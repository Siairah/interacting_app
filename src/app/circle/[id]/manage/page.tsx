'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './manage.module.css';

interface User {
  id: string;
  email: string;
  full_name: string;
  profile_pic: string | null;
}

interface Member {
  id: string;
  user: User;
  is_admin: boolean;
  joined_at: string;
}

interface PendingRequest {
  id: string;
  user: User;
  message: string;
  requested_at: string;
}

interface PendingPost {
  id: string;
  user: User;
  content: string;
  created_at: string;
  media?: string[];
}

interface FlaggedPost {
  id: string;
  post: {
    id: string;
    content: string;
    user: User;
  };
  reason: string;
  flagged_by: User;
  created_at: string;
}

interface ReportedPost {
  id: string;
  post: {
    id: string;
    content: string;
    user: User;
  };
  reason: string;
  reported_by: User;
  created_at: string;
}

interface Circle {
  id: string;
  name: string;
  description: string;
  cover_image: string | null;
  visibility: string;
}

interface ManagementData {
  success: boolean;
  message?: string;
  circle: Circle;
  members: Member[];
  pending_requests: PendingRequest[];
  pending_posts: PendingPost[];
  flagged_posts: FlaggedPost[];
  reported_posts: ReportedPost[];
  admin_count: number;
  pending_posts_count: number;
  flagged_posts_count: number;
  reported_posts_count: number;
  total_pending: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ManageCirclePage() {
  const params = useParams();
  const router = useRouter();
  const circleId = params.id as string;

  const [circle, setCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [flaggedPosts, setFlaggedPosts] = useState<FlaggedPost[]>([]);
  const [reportedPosts, setReportedPosts] = useState<ReportedPost[]>([]);
  const [adminCount, setAdminCount] = useState(0);
  const [pendingPostsCount, setPendingPostsCount] = useState(0);
  const [flaggedPostsCount, setFlaggedPostsCount] = useState(0);
  const [reportedPostsCount, setReportedPostsCount] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'members' | 'posts' | 'flagged' | 'reports'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [overlayText, setOverlayText] = useState<string | null>(null);

  useEffect(() => {
    // Prefer explicit user_id, fallback to parsed 'user' object
    let storedUserId = localStorage.getItem('user_id');
    if (!storedUserId) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          storedUserId = userObj.id || userObj._id || null;
        } catch (_e) {
          // ignore parse errors
        }
      }
    }

    if (storedUserId) {
      setUserId(storedUserId);
      fetchManagementData(storedUserId);
    } else {
      setLoading(false);
      router.replace('/');
    }
  }, [circleId, router]);

  const fetchManagementData = async (uid: string) => {
    try {
      const response = await fetch(`${API_BASE}/circles/manage/${circleId}?user_id=${uid}`);
      const data: ManagementData = await response.json();

      if (data.success) {
        setCircle(data.circle);
        setMembers(data.members || []);
        setPendingRequests(data.pending_requests || []);
        setPendingPosts(data.pending_posts || []);
        setFlaggedPosts(data.flagged_posts || []);
        setReportedPosts(data.reported_posts || []);
        setAdminCount(data.admin_count || 0);
        setPendingPostsCount(data.pending_posts_count || 0);
        setFlaggedPostsCount(data.flagged_posts_count || 0);
        setReportedPostsCount(data.reported_posts_count || 0);
        setTotalPending(data.total_pending || 0);
      } else {
        alert(data.message || 'Failed to load management data');
        router.push(`/circle/${circleId}`);
      }
    } catch (error) {
      console.error('Error fetching management data:', error);
      alert('Failed to load management data');
    } finally {
      setLoading(false);
    }
  };

  const withOverlay = async (text: string, fn: () => Promise<void>) => {
    setOverlayText(text);
    try {
      await fn();
    } finally {
      setOverlayText(null);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    if (!userId) return;

    await withOverlay('Approving request...', async () => {
      try {
        const response = await fetch(`${API_BASE}/circles/approve-request/${requestId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId })
        });

        const data = await response.json();
        if (data.success) {
          fetchManagementData(userId);
        } else {
          alert(data.message || 'Failed to approve request');
        }
      } catch (error) {
        console.error('Error approving request:', error);
      }
    });
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!userId) return;

    await withOverlay('Rejecting request...', async () => {
      try {
        const response = await fetch(`${API_BASE}/circles/reject-request/${requestId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId })
        });

        const data = await response.json();
        if (data.success) {
          fetchManagementData(userId);
        } else {
          alert(data.message || 'Failed to reject request');
        }
      } catch (error) {
        console.error('Error rejecting request:', error);
      }
    });
  };

  const handlePromoteAdmin = async (memberId: string) => {
    if (!userId) return;

    if (adminCount >= 3) {
      alert('Maximum 3 admins allowed per circle');
      return;
    }

    await withOverlay('Promoting to admin...', async () => {
      try {
        const response = await fetch(`${API_BASE}/circles/promote-admin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            circle_id: circleId,
            member_id: memberId
          })
        });

        const data = await response.json();
        if (data.success) {
          fetchManagementData(userId);
        } else {
          alert(data.message || 'Failed to promote member');
        }
      } catch (error) {
        console.error('Error promoting member:', error);
      }
    });
  };

  const handleRemoveAdmin = async (memberId: string) => {
    if (!userId) return;

    await withOverlay('Removing admin...', async () => {
      try {
        const response = await fetch(`${API_BASE}/circles/remove-admin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            circle_id: circleId,
            member_id: memberId
          })
        });

        const data = await response.json();
        if (data.success) {
          fetchManagementData(userId);
        } else {
          alert(data.message || 'Failed to remove admin');
        }
      } catch (error) {
        console.error('Error removing admin:', error);
      }
    });
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!userId) return;

    if (!confirm('Are you sure you want to remove this member?')) return;

    await withOverlay('Removing member...', async () => {
      try {
        const response = await fetch(`${API_BASE}/circles/remove-member`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            circle_id: circleId,
            member_id: memberId
          })
        });

        const data = await response.json();
        if (data.success) {
          fetchManagementData(userId);
        } else {
          alert(data.message || 'Failed to remove member');
        }
      } catch (error) {
        console.error('Error removing member:', error);
      }
    });
  };

  const handleRestrictUser = async (memberId: string) => {
    if (!userId) return;

    if (!confirm('Restrict this user for 7 days?')) return;

    await withOverlay('Restricting user...', async () => {
      try {
        const response = await fetch(`${API_BASE}/circles/restrict-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            circle_id: circleId,
            target_user_id: memberId,
            days: 7
          })
        });

        const data = await response.json();
        if (data.success) {
          alert('User restricted for 7 days');
          fetchManagementData(userId);
        } else {
          alert(data.message || 'Failed to restrict user');
        }
      } catch (error) {
        console.error('Error restricting user:', error);
      }
    });
  };

  const handleBanUser = async (memberId: string) => {
    if (!userId) return;

    if (!confirm('Are you sure you want to permanently ban this user from the circle?')) return;

    await withOverlay('Banning user...', async () => {
      try {
        const response = await fetch(`${API_BASE}/circles/ban-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            circle_id: circleId,
            target_user_id: memberId,
            reason: 'Banned by admin'
          })
        });

        const data = await response.json();
        if (data.success) {
          alert('User has been banned');
          fetchManagementData(userId);
        } else {
          alert(data.message || 'Failed to ban user');
        }
      } catch (error) {
        console.error('Error banning user:', error);
      }
    });
  };

  const handleApprovePost = async (postId: string) => {
    if (!userId) return;

    await withOverlay('Approving post...', async () => {
      try {
        const response = await fetch(`${API_BASE}/circles/approve-post/${postId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId })
        });

        const data = await response.json();
        if (data.success) {
          fetchManagementData(userId);
        } else {
          alert(data.message || 'Failed to approve post');
        }
      } catch (error) {
        console.error('Error approving post:', error);
      }
    });
  };

  const handleRejectPost = async (postId: string) => {
    if (!userId) return;

    if (!confirm('Are you sure you want to reject this post?')) return;

    await withOverlay('Rejecting post...', async () => {
      try {
        const response = await fetch(`${API_BASE}/circles/reject-post/${postId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId })
        });

        const data = await response.json();
        if (data.success) {
          fetchManagementData(userId);
        } else {
          alert(data.message || 'Failed to reject post');
        }
      } catch (error) {
        console.error('Error rejecting post:', error);
      }
    });
  };

  const handleApproveFlaggedPost = async (postId: string) => {
    if (!userId) return;

    await withOverlay('Approving flagged post...', async () => {
      try {
        const response = await fetch(`${API_BASE}/circles/approve-flagged/${postId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId })
        });

        const data = await response.json();
        if (data.success) {
          fetchManagementData(userId);
        } else {
          alert(data.message || 'Failed to approve flagged post');
        }
      } catch (error) {
        console.error('Error approving flagged post:', error);
      }
    });
  };

  const handleRejectFlaggedPost = async (postId: string) => {
    if (!userId) return;

    if (!confirm('Are you sure you want to reject this flagged post?')) return;

    await withOverlay('Rejecting flagged post...', async () => {
      try {
        const response = await fetch(`${API_BASE}/circles/reject-flagged/${postId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId })
        });

        const data = await response.json();
        if (data.success) {
          fetchManagementData(userId);
        } else {
          alert(data.message || 'Failed to reject flagged post');
        }
      } catch (error) {
        console.error('Error rejecting flagged post:', error);
      }
    });
  };

  const filteredMembers = members.filter(member =>
    member.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading management dashboard...</p>
      </div>
    );
  }

  if (!circle) {
    return (
      <div className={styles.errorContainer}>
        <h2>Circle Not Found</h2>
        <Link href={`/circle/${circleId}`} className={styles.backBtn}>
          Back to Circle
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href={`/circle/${circleId}`} className={styles.backButton}>
            <i className="fas fa-arrow-left"></i> Back to Circle
          </Link>
          <h2 className={styles.pageTitle}>Manage {circle?.name}</h2>
          <Link href="/dashboard" className={styles.homeButton}>
            <i className="fas fa-home"></i>
          </Link>
        </div>
      </nav>

      {/* Management Content */}
      <div className={styles.content}>
        {/* Dashboard Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{members.length}</div>
            <div className={styles.statLabel}>
              <i className="fas fa-users"></i> Members
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{pendingRequests.length}</div>
            <div className={styles.statLabel}>
              <i className="fas fa-user-plus"></i> Pending Requests
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{pendingPostsCount}</div>
            <div className={styles.statLabel}>
              <i className="fas fa-file-upload"></i> Posts to Review
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{flaggedPostsCount}</div>
            <div className={styles.statLabel}>
              <i className="fas fa-flag"></i> Flagged Items
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
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
            {reportedPostsCount > 0 && (
              <span className={styles.badge}>{reportedPostsCount}</span>
            )}
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className={styles.tabContent}>
            <h3 className={styles.sectionTitle}>Dashboard Overview</h3>
            <div className={styles.gridLayout}>
              <div className={styles.gridCard}>
                <h4 className={styles.cardTitle}>
                  <i className="fas fa-user-plus"></i> Recent Join Requests
                </h4>
                {pendingRequests.length === 0 ? (
                  <p className={styles.emptyText}>No pending requests</p>
                ) : (
                  <div className={styles.miniList}>
                    {pendingRequests.slice(0, 3).map((req) => (
                      <div key={req.id} className={styles.miniItem}>
                        <img src={req.user.profile_pic || '/images/default_profile.png'} alt={req.user.full_name} />
                        <div className={styles.miniItemText}>
                          <p className={styles.userName}>{req.user.full_name}</p>
                          <p className={styles.miniMeta}>{new Date(req.requested_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.gridCard}>
                <h4 className={styles.cardTitle}>
                  <i className="fas fa-file-upload"></i> Pending Posts
                </h4>
                {pendingPostsCount === 0 ? (
                  <p className={styles.emptyText}>No pending posts</p>
                ) : (
                  <p className={styles.highlightedCount}>{pendingPostsCount} posts waiting for approval</p>
                )}
              </div>

              <div className={styles.gridCard}>
                <h4 className={styles.cardTitle}>
                  <i className="fas fa-flag"></i> Flagged Content
                </h4>
                {flaggedPostsCount === 0 ? (
                  <p className={styles.emptyText}>No flagged content</p>
                ) : (
                  <p className={styles.highlightedCount}>{flaggedPostsCount} items need review</p>
                )}
              </div>

              <div className={styles.gridCard}>
                <h4 className={styles.cardTitle}>
                  <i className="fas fa-shield-alt"></i> Admin Team
                </h4>
                <p className={styles.adminCount}>{adminCount} / 3 Admins</p>
              </div>
            </div>
          </div>
        )}

        {/* Join Requests Tab */}
        {activeTab === 'requests' && (
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
                        onClick={() => handleApproveRequest(request.id)}
                        className={styles.approveBtn}
                      >
                        <i className="fas fa-check"></i> Approve
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
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
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Circle Members</h3>
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            {members.filter(m => m.user.full_name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <div className={styles.emptyState}>
                <i className="fas fa-users-slash"></i>
                <p>No members found</p>
              </div>
            ) : (
              <div className={styles.memberList}>
                {members.filter(m => m.user.full_name.toLowerCase().includes(searchQuery.toLowerCase())).map((member) => (
                  <div key={member.id} className={styles.memberCard}>
                    <img
                      src={member.user.profile_pic || '/images/default_profile.png'}
                      alt={member.user.full_name}
                      className={styles.userAvatar}
                    />
                    <div className={styles.memberInfo}>
                      <h4>
                        {member.user.full_name}
                        {member.is_admin && (
                          <span className={styles.adminBadge}>Admin</span>
                        )}
                      </h4>
                      <p className={styles.userEmail}>{member.user.email}</p>
                      <span className={styles.joinedDate}>
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className={styles.memberActions}>
                      <button className={styles.actionBtn} title="More actions">
                        <i className="fas fa-ellipsis-v"></i>
                      </button>
                      <div className={styles.dropdown}>
                        {!member.is_admin && (
                          <button onClick={() => handlePromoteAdmin(member.user.id)}>
                            <i className="fas fa-user-shield"></i> Make Admin
                          </button>
                        )}
                        {member.is_admin && (
                          <button onClick={() => handleRemoveAdmin(member.user.id)}>
                            <i className="fas fa-user-minus"></i> Remove Admin
                          </button>
                        )}
                        <button onClick={() => handleRestrictUser(member.user.id)}>
                          <i className="fas fa-user-clock"></i> Restrict (7 days)
                        </button>
                        <button onClick={() => handleBanUser(member.user.id)}>
                          <i className="fas fa-ban"></i> Ban User
                        </button>
                        <button onClick={() => handleRemoveMember(member.user.id)}>
                          <i className="fas fa-user-times"></i> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Posts Tab */}
        {activeTab === 'posts' && (
          <div className={styles.tabContent}>
            <h3 className={styles.sectionTitle}>Pending Posts for Approval</h3>
            {pendingPostsCount === 0 ? (
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
                        onClick={() => handleApprovePost(post.id)}
                        className={styles.approveBtn}
                        title="Approve this post"
                      >
                        <i className="fas fa-check"></i>
                      </button>
                      <button
                        onClick={() => handleRejectPost(post.id)}
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
        )}

        {/* Flagged Posts Tab */}
        {activeTab === 'flagged' && (
          <div className={styles.tabContent}>
            <h3 className={styles.sectionTitle}>Flagged Content (NSFW / Inappropriate)</h3>
            {flaggedPostsCount === 0 ? (
              <div className={styles.emptyState}>
                <i className="fas fa-check-circle"></i>
                <p>No flagged content to review</p>
              </div>
            ) : (
              <div className={styles.postList}>
                {flaggedPosts.map((flagged) => (
                  <div key={flagged.id} className={styles.flaggedPostCard}>
                    <div className={styles.flagBadge}>
                      <i className="fas fa-flag"></i> Flagged
                    </div>
                    <img
                      src={flagged.post.user.profile_pic || '/images/default_profile.png'}
                      alt={flagged.post.user.full_name}
                      className={styles.userAvatar}
                    />
                    <div className={styles.postInfo}>
                      <h4>{flagged.post.user.full_name}</h4>
                      <p className={styles.postContent}>{flagged.post.content}</p>
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
                    <div className={styles.postActions}>
                      <button
                        onClick={() => handleApproveFlaggedPost(flagged.post.id)}
                        className={styles.approveBtn}
                        title="Approve - keep the post visible"
                      >
                        <i className="fas fa-check"></i>
                      </button>
                      <button
                        onClick={() => handleRejectFlaggedPost(flagged.post.id)}
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
        )}

        {/* Reported Posts Tab */}
        {activeTab === 'reports' && (
          <div className={styles.tabContent}>
            <h3 className={styles.sectionTitle}>User Reports</h3>
            {reportedPostsCount === 0 ? (
              <div className={styles.emptyState}>
                <i className="fas fa-inbox"></i>
                <p>No reported posts</p>
              </div>
            ) : (
              <div className={styles.postList}>
                {reportedPosts.map((report) => (
                  <div key={report.id} className={styles.reportedPostCard}>
                    <div className={styles.reportBadge}>
                      <i className="fas fa-exclamation-circle"></i> Reported
                    </div>
                    <img
                      src={report.post.user.profile_pic || '/images/default_profile.png'}
                      alt={report.post.user.full_name}
                      className={styles.userAvatar}
                    />
                    <div className={styles.postInfo}>
                      <h4>{report.post.user.full_name}</h4>
                      <p className={styles.postContent}>{report.post.content}</p>
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
                    <div className={styles.postActions}>
                      <button
                        onClick={() => handleApprovePost(report.post.id)}
                        className={styles.approveBtn}
                        title="Approve - keep the post"
                      >
                        <i className="fas fa-check"></i>
                      </button>
                      <button
                        onClick={() => handleRejectPost(report.post.id)}
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
        )}
      </div>

      {/* Overlay Loader */}
      {overlayText && (
        <div className={styles.overlayLoader}>
          <div className={styles.overlayBox}>
            <img src="/images/waiting.gif" alt="Loading" className={styles.overlayGif} />
            <div className={styles.overlayText}>{overlayText}</div>
          </div>
        </div>
      )}
    </div>
  );
}

