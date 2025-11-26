"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import styles from './circles.module.css';

interface UserProfile {
  id?: string;
  fullName: string;
  email: string;
  profilePic?: string;
}

interface Circle {
  id: string;
  name: string;
  description?: string;
  cover_image?: string;
  member_count: number;
  is_admin?: boolean;
  is_member?: boolean;
  visibility?: string;
  circle_type?: string;
}

export default function CirclesPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [allCircles, setAllCircles] = useState<Circle[]>([]); // All circles from backend
  const [filteredCircles, setFilteredCircles] = useState<Circle[]>([]); // After search/sort
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Create circle form
  const [circleName, setCircleName] = useState('');
  const [circleDescription, setCircleDescription] = useState('');
  const [circleRules, setCircleRules] = useState('');
  const [circleVisibility, setCircleVisibility] = useState('public');
  const [circleCover, setCircleCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      const token = localStorage.getItem("auth_token");
      
      if (!token) {
        router.replace('/');
        return;
      }
      
      if (userStr) {
        const userData = JSON.parse(userStr);
        console.log("👤 User data loaded:", userData);
        console.log("🖼️ Profile pic URL:", userData.profilePic);
        console.log("📧 User email:", userData.email);
        console.log("👤 Full name:", userData.fullName);
        
        // Ensure we have the correct data structure
        const userWithProfile = {
          ...userData,
          profilePic: userData.profilePic || userData.profile_pic || "/images/default_profile.png",
          fullName: userData.fullName || userData.full_name || "User"
        };
        
        console.log("✅ Final user object:", userWithProfile);
        setUser(userWithProfile);
        fetchAllCircles(userData.id);
      }
    }
  }, [router]);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (showUserMenu && !target.closest('[class*="userMenu"]')) {
        setShowUserMenu(false);
      }
    }

    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

  async function fetchAllCircles(userId: string) {
    try {
      setLoading(true);
      console.log("🔍 Fetching circles for user:", userId);
      
      // Fetch ALL circles with membership status (updated API)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/circles/list?user_id=${userId}`);
      const data = await response.json();
      
      console.log("📦 Circles API response:", data);
      
      if (data.success) {
        const circles = data.circles || [];
        console.log("✅ Circles loaded:", circles.length);
        
        setAllCircles(circles);
        setFilteredCircles(circles);
      } else {
        console.error("❌ Failed to fetch circles:", data.message);
        setError(data.message || "Failed to load circles");
      }
    } catch (error) {
      console.error("💥 Error fetching circles:", error);
      setError("Failed to load circles");
    } finally {
      setLoading(false);
    }
  }

  // Filter and sort circles (Django logic)
  useEffect(() => {
    let result = [...allCircles];
    
    // Search filter
    if (searchQuery.trim()) {
      result = result.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Sort
    if (sortBy === 'popular') {
      result.sort((a, b) => (b.member_count || 0) - (a.member_count || 0));
    } else {
      // Newest first (default)
      result.reverse(); // Assuming backend returns oldest first
    }
    
    setFilteredCircles(result);
  }, [searchQuery, sortBy, allCircles]);

  function openCreateModal() {
    setShowCreateModal(true);
    setError(null);
    setSuccess(null);
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    setCircleName('');
    setCircleDescription('');
    setCircleRules('');
    setCircleVisibility('public');
    setCircleCover(null);
    setCoverPreview('');
    setError(null);
    setSuccess(null);
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    setCircleCover(file);
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
    setError(null);
  };

  async function handleCreateCircle() {
    setError(null);
    setSuccess(null);
    
    if (!circleName.trim()) {
      setError('Circle name is required');
      return;
    }
    
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }
    
    setCreating(true);
    
    try {
      const formData = new FormData();
      formData.append('name', circleName);
      formData.append('description', circleDescription);
      formData.append('rules', circleRules);
      formData.append('visibility', circleVisibility);
      formData.append('created_by', user.id);
      
      if (circleCover) {
        formData.append('cover_image', circleCover);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/circles/create`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create circle');
      }

      setSuccess('Circle created successfully!');
      
      setTimeout(() => {
        closeCreateModal();
        fetchAllCircles(user.id!);
      }, 1500);
      
    } catch (err: any) {
      console.error('Create circle error:', err);
      setError(err.message || 'Failed to create circle');
    } finally {
      setCreating(false);
    }
  }

  async function handleJoinCircle(circleId: string) {
    if (!user?.id) return;
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/circles/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          circle_id: circleId
        })
      });

      const data = await res.json();
      
      if (data.success) {
        alert(data.message);
        fetchAllCircles(user.id);
      } else {
        alert(data.message || 'Failed to join circle');
      }
    } catch (error) {
      console.error('Join circle error:', error);
      alert('Failed to join circle');
    }
  }

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      localStorage.removeItem("auth_token");
    }
    router.replace("/");
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading circles...</p>
      </div>
    );
  }

  return (
    <div className={styles.circlesWrapper}>
      {/* Top Navigation */}
      <nav className={styles.topNav}>
        <div className={styles.navContainer}>
          <Link href="/dashboard" className={styles.navBrand}>
            <img src="/images/logo.png" alt="Chautari" className={styles.logoImg} />
            <span>Chautari</span>
          </Link>
          
          <div className={styles.navCenter}>
            <div className={styles.searchBar}>
              <i className="fas fa-search"></i>
              <input type="text" placeholder="Search circles..." />
            </div>
          </div>

          <div className={styles.navRight}>
            <Link href="/dashboard" className={styles.navIconBtn} title="Home">
              <i className="fas fa-home"></i>
            </Link>
            
            <div className={styles.userMenu}>
              <button 
                className={styles.userMenuBtn}
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {user?.profilePic && user.profilePic !== "/images/default_profile.png" ? (
                  <img
                    src={user.profilePic}
                    alt="Profile"
                    className={styles.userAvatar}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      console.log("❌ Failed to load profile pic:", user?.profilePic);
                      target.src = "/images/default_profile.png";
                    }}
                  />
                ) : (
                  <div className={styles.userAvatarPlaceholder}>
                    {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                <span className={styles.userName}>{user?.fullName || "User"}</span>
                <i className="fas fa-chevron-down"></i>
              </button>
              {showUserMenu && (
                <div className={styles.dropdownMenu}>
                  <Link href="/profile" className={styles.dropdownItem}>
                    <i className="fas fa-user"></i> My Profile
                  </Link>
                  <Link href="/dashboard" className={styles.dropdownItem}>
                    <i className="fas fa-home"></i> Dashboard
                  </Link>
                  <hr className={styles.dropdownDivider} />
                  <button onClick={handleLogout} className={`${styles.dropdownItem} ${styles.logoutBtn}`}>
                    <i className="fas fa-sign-out-alt"></i> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className={styles.container}>
        {/* Breadcrumb */}
        <div className={styles.breadcrumb}>
          <Link href="/dashboard">Dashboard</Link>
          <span>/</span>
          <span>Communities</span>
        </div>

        {/* Django-style Header */}
        <div className={styles.exploreHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.headerText}>
              <h1 className={styles.exploreTitle}>Explore Communities</h1>
              <p className={styles.exploreSubtitle}>Discover, join, and create circles that match your interests.</p>
            </div>
            <button className={styles.createCircleBtn} onClick={openCreateModal}>
              <i className="fas fa-plus"></i> Create Circle
            </button>
          </div>
          
          {/* View Toggle */}
          <div className={styles.viewToggle}>
            <button 
              className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.active : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <i className="fas fa-th-large"></i> Grid
            </button>
            <button 
              className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => setViewMode('list')}
            >
              <i className="fas fa-list"></i> List
            </button>
          </div>
          
          {/* Search and Filter */}
          <div className={styles.searchFilterContainer}>
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search circles..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select 
              className={styles.sortSelect}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'popular')}
            >
              <option value="newest">Newest</option>
              <option value="popular">Most Popular</option>
            </select>
            <button className={styles.filterBtn}>
              <i className="fas fa-filter"></i> Filter
            </button>
          </div>
        </div>

        {/* Circles Display */}
        <div className={styles.section}>
          {filteredCircles.length > 0 ? (
            <>
              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className={styles.circlesGrid}>
              {filteredCircles.map((circle) => (
                <div key={circle.id} className={styles.circleCard}>
                  <div className={styles.circleCardHeader}>
                    <img
                      src={circle.cover_image || '/images/banner.png'}
                      alt={circle.name}
                      className={styles.circleCover}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/banner.png';
                      }}
                    />
                    {circle.is_member && (
                      <div className={styles.joinedBadge}>
                        <i className="fas fa-check-circle"></i> Joined
                      </div>
                    )}
                  </div>
                  <div className={styles.circleCardBody}>
                    <h3 className={styles.circleName}>{circle.name}</h3>
                    <p className={styles.circleDescription}>
                      {circle.description ? (
                        circle.description.length > 100 
                          ? circle.description.substring(0, 100) + '...' 
                          : circle.description
                      ) : 'No description'}
                    </p>
                    <div className={styles.circleMeta}>
                      <span>
                        <i className="fas fa-users"></i> {circle.member_count} members
                      </span>
                      {circle.is_admin && (
                        <span className={styles.adminBadge}>
                          <i className="fas fa-crown"></i> Admin
                        </span>
                      )}
                    </div>
                    
                    <div className={styles.cardActions}>
                      <Link 
                        href={`/circle/${circle.id}`} 
                        className={styles.viewCircleBtn}
                      >
                        <i className="fas fa-eye"></i> View Circle
                      </Link>
                      {!circle.is_member && (
                        <button 
                          className={styles.joinCircleBtn}
                          onClick={() => handleJoinCircle(circle.id)}
                        >
                          <i className="fas fa-user-plus"></i> Join Circle
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
                </div>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <div className={styles.circlesList}>
                  {filteredCircles.map((circle) => (
                    <div key={circle.id} className={styles.circleListItem}>
                      <img
                        src={circle.cover_image || '/images/banner.png'}
                        alt={circle.name}
                        className={styles.listImage}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/banner.png';
                        }}
                      />
                      <div className={styles.listContent}>
                        <h3 className={styles.listName}>{circle.name}</h3>
                        <div className={styles.listMembers}>
                          <i className="fas fa-users"></i>
                          <span>{circle.member_count} members</span>
                        </div>
                        <p className={styles.listDescription}>
                          {circle.description ? (
                            circle.description.length > 150 
                              ? circle.description.substring(0, 150) + '...' 
                              : circle.description
                          ) : 'No description'}
                        </p>
                        {circle.is_admin && (
                          <span className={styles.listAdminBadge}>
                            <i className="fas fa-crown"></i> Admin
                          </span>
                        )}
                      </div>
                      <div className={styles.listActions}>
                        <Link 
                          href={`/circle/${circle.id}`} 
                          className={styles.listViewBtn}
                        >
                          <i className="fas fa-eye"></i> View
                        </Link>
                        {!circle.is_member && (
                          <button 
                            className={styles.listJoinBtn}
                            onClick={() => handleJoinCircle(circle.id)}
                          >
                            <i className="fas fa-user-plus"></i> Join
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={styles.emptyState}>
              <i className="fas fa-search"></i>
              <h3>No communities found</h3>
              <p>
                {searchQuery ? 'Try adjusting your search' : 'There are no communities available at the moment'}
              </p>
              {!searchQuery && (
                <button className={styles.createCircleBtn} onClick={openCreateModal} style={{marginTop: '1.5rem'}}>
                  <i className="fas fa-plus"></i> Create Your First Circle
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Circle Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={closeCreateModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Create New Circle</h3>
              <button className={styles.closeBtn} onClick={closeCreateModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className={styles.modalBody}>
              {error && (
                <div className={styles.errorMessage}>
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </div>
              )}
              
              {success && (
                <div className={styles.successMessage}>
                  <i className="fas fa-check-circle"></i>
                  {success}
                </div>
              )}

              {/* Cover Image */}
              <div className={styles.coverSection}>
                <div className={styles.coverPreview}>
                  {coverPreview ? (
                    <img src={coverPreview} alt="Cover" />
                  ) : (
                    <div className={styles.coverPlaceholder}>
                      <i className="fas fa-image"></i>
                      <p>Circle Cover Image</p>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className={styles.uploadCoverBtn}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="fas fa-camera"></i> {coverPreview ? 'Change' : 'Upload'} Cover
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Circle Name */}
              <div className={styles.formGroup}>
                <label htmlFor="circleName">
                  <i className="fas fa-circle"></i> Circle Name *
                </label>
                <input
                  id="circleName"
                  type="text"
                  className={styles.formInput}
                  value={circleName}
                  onChange={(e) => setCircleName(e.target.value)}
                  placeholder="Enter circle name"
                  maxLength={100}
                  required
                />
              </div>

              {/* Description */}
              <div className={styles.formGroup}>
                <label htmlFor="circleDescription">
                  <i className="fas fa-align-left"></i> Description
                </label>
                <textarea
                  id="circleDescription"
                  className={styles.formTextarea}
                  value={circleDescription}
                  onChange={(e) => setCircleDescription(e.target.value)}
                  placeholder="Brief description of your circle"
                  rows={3}
                  maxLength={100}
                />
                <small className={styles.charCount}>{circleDescription.length}/100</small>
              </div>

              {/* Rules */}
              <div className={styles.formGroup}>
                <label htmlFor="circleRules">
                  <i className="fas fa-gavel"></i> Community Rules (Optional)
                </label>
                <textarea
                  id="circleRules"
                  className={styles.formTextarea}
                  value={circleRules}
                  onChange={(e) => setCircleRules(e.target.value)}
                  placeholder="Community guidelines and rules"
                  rows={4}
                  maxLength={500}
                />
                <small className={styles.charCount}>{circleRules.length}/500</small>
              </div>

              {/* Visibility */}
              <div className={styles.formGroup}>
                <label>
                  <i className="fas fa-eye"></i> Visibility
                </label>
                <select
                  className={styles.formInput}
                  value={circleVisibility}
                  onChange={(e) => setCircleVisibility(e.target.value)}
                >
                  <option value="public">Public - Anyone can join</option>
                  <option value="private">Private - Approval required</option>
                </select>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={closeCreateModal}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleCreateCircle}
                disabled={creating || !circleName.trim()}
              >
                {creating ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Creating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus-circle"></i> Create Circle
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

