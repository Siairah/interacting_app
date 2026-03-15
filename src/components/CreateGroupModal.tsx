'use client';

import { useState, useEffect } from 'react';
import { createGroupInCircle, getCircleMembers, createDM } from '@/utils/chatApi';
import { ChatRoom } from '@/utils/chatApi';
import { showToast } from './ToastContainer';
import styles from './CreateGroupModal.module.css';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (room: ChatRoom) => void;
  userId: string;
  circleId?: string | null;
}

interface Circle {
  id: string;
  name: string;
  is_admin: boolean;
}

export default function CreateGroupModal({
  isOpen,
  onClose,
  onGroupCreated,
  userId,
  circleId: initialCircleId,
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(initialCircleId || null);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [members, setMembers] = useState<Array<{ id: string; email: string; full_name: string; profile_pic: string }>>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCircles, setLoadingCircles] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setGroupName('');
      setSelectedMembers([]);
      setSearchQuery('');
      setError('');
      
      if (initialCircleId) {
        setSelectedCircleId(initialCircleId);
        loadCircleMembers(initialCircleId);
      } else {
        loadAdminCircles();
      }
    } else {
      // Reset state when modal closes
      setMembers([]);
      setSelectedMembers([]);
      setSearchQuery('');
      setError('');
    }
  }, [isOpen, initialCircleId]);

  // Reload members when selectedCircleId changes
  useEffect(() => {
    if (isOpen && selectedCircleId && selectedCircleId !== initialCircleId) {
      loadCircleMembers(selectedCircleId);
    }
  }, [selectedCircleId]);

  const loadAdminCircles = async () => {
    setLoadingCircles(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      
      const response = await fetch(`${API_URL}/circles/list?user_id=${userId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await response.json();
      
      if (data.success) {
        const adminCircles = (data.circles || []).filter((c: Circle) => c.is_admin);
        setCircles(adminCircles);
        
        if (adminCircles.length === 0) {
          showToast('You need to be an admin of a circle to create groups', 'info');
        }
      } else {
        const errorMsg = data.message || 'Failed to load circles';
        setError(errorMsg);
        showToast(errorMsg, 'error');
      }
    } catch (error) {
      const errorMsg = 'Failed to load circles. Please try again.';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      console.error('Error loading circles:', error);
    } finally {
      setLoadingCircles(false);
    }
  };

  const loadCircleMembers = async (circleId: string) => {
    if (!circleId) {
      setMembers([]);
      return;
    }
    
    setLoadingMembers(true);
    setError('');
    
    try {
      console.log('Loading circle members for circle:', circleId, 'user:', userId);
      const circleMembers = await getCircleMembers(circleId, userId);
      console.log('Fetched circle members:', circleMembers);
      
      if (!circleMembers || circleMembers.length === 0) {
        setMembers([]);
        setError('No members found in this circle');
        showToast('No members available in this circle', 'info');
        setLoadingMembers(false);
        return;
      }
      
      // Filter out the current user
      const filtered = circleMembers.filter((m) => m && m.id && m.id !== userId);
      console.log('Filtered members (excluding current user):', filtered);
      
      setMembers(filtered);
      setError('');
      
      if (filtered.length === 0) {
        showToast('No other members available in this circle', 'info');
      } else {
        console.log(`Loaded ${filtered.length} members for group creation`);
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to load circle members. Please try again.';
      setError(errorMsg);
      setMembers([]);
      showToast(errorMsg, 'error');
      console.error('Error loading circle members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleCircleChange = async (circleId: string) => {
    setSelectedCircleId(circleId);
    setSelectedMembers([]);
    setSearchQuery('');
    setError('');
    if (circleId) {
      await loadCircleMembers(circleId);
    } else {
      setMembers([]);
    }
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!selectedCircleId) {
        if (selectedMembers.length === 1) {
          const result = await createDM(userId, selectedMembers[0]);
          if (result.success && result.room) {
            showToast('Direct message created successfully', 'success');
            onGroupCreated(result.room);
            // Small delay to show toast before closing
            setTimeout(() => {
              handleClose();
            }, 300);
          } else {
            const errorMsg = result.error || 'Failed to create direct message';
            setError(errorMsg);
            showToast(errorMsg, 'error');
          }
        } else {
          const errorMsg = 'Select a circle to create group or select one person for direct message';
          setError(errorMsg);
          showToast(errorMsg, 'warning');
        }
      } else {
        // Validate group name
        if (!groupName.trim()) {
          const errorMsg = 'Group name is required';
          setError(errorMsg);
          showToast(errorMsg, 'warning');
          setLoading(false);
          return;
        }

        // Validate group name length
        if (groupName.trim().length < 3) {
          const errorMsg = 'Group name must be at least 3 characters';
          setError(errorMsg);
          showToast(errorMsg, 'warning');
          setLoading(false);
          return;
        }

        // Validate members
        if (selectedMembers.length === 0) {
          const errorMsg = 'Please select at least one member to add to the group';
          setError(errorMsg);
          showToast(errorMsg, 'warning');
          setLoading(false);
          return;
        }

        const uniqueMembers = [...new Set(selectedMembers)];
        const result = await createGroupInCircle(selectedCircleId, groupName.trim(), userId, uniqueMembers);
        
        if (result.success && result.room) {
          // Ensure room has all required fields
          const roomWithDefaults = {
            ...result.room,
            created_by: result.room.created_by || userId,
            is_group: true,
            unread_count: result.room.unread_count || 0,
            member_count: result.room.member_count || result.room.members?.length || 0,
          };
          
          showToast(`Group "${groupName.trim()}" created successfully`, 'success');
          onGroupCreated(roomWithDefaults);
          
          // Small delay to show toast before closing
          setTimeout(() => {
            handleClose();
          }, 300);
        } else {
          const errorMsg = result.error || result.message || 'Failed to create group';
          setError(errorMsg);
          showToast(errorMsg, 'error');
          console.error('Group creation failed:', result);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create group. Please try again.';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      console.error('Group creation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Prevent closing while loading
    if (loading) return;
    
    setGroupName('');
    setSelectedCircleId(initialCircleId || null);
    setSelectedMembers([]);
    setSearchQuery('');
    setError('');
    setMembers([]);
    onClose();
  };

  const filteredMembers = members.filter((member) =>
    (member.full_name || member.email).toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div 
      className={styles.modalContainer} 
      onClick={loading ? undefined : handleClose}
      style={{ cursor: loading ? 'wait' : 'pointer' }}
    >
      <div 
        className={styles.modalContent} 
        onClick={(e) => e.stopPropagation()}
        style={{ cursor: 'default', pointerEvents: loading ? 'none' : 'auto', opacity: loading ? 0.8 : 1 }}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {selectedCircleId ? 'Create Group Chat' : initialCircleId ? 'Create Group Chat' : 'New Message'}
          </h3>
          <button 
            className={styles.modalCloseBtn} 
            onClick={handleClose}
            disabled={loading}
            style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {!initialCircleId && (
            <div className={styles.formGroup}>
              <label htmlFor="gc-circle-select" className={styles.formLabel}>
                Select Circle (Admin Only)
              </label>
              {loadingCircles ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px' }}>
                  <i className="fas fa-spinner fa-spin" style={{ color: '#6a14eb' }}></i>
                  <span>Loading circles...</span>
                </div>
              ) : (
                <select
                  id="gc-circle-select"
                  className={styles.formInput}
                  value={selectedCircleId || ''}
                  onChange={(e) => handleCircleChange(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select a circle...</option>
                  {circles.map((circle) => (
                    <option key={circle.id} value={circle.id}>
                      {circle.name}
                    </option>
                  ))}
                </select>
              )}
              {circles.length === 0 && !loadingCircles && (
                <p className={styles.hintText}>You need to be an admin of a circle to create groups</p>
              )}
            </div>
          )}

          {selectedCircleId && (
            <div className={styles.formGroup}>
              <label htmlFor="gc-group-name" className={styles.formLabel}>
                Group Name
              </label>
              <input
                type="text"
                id="gc-group-name"
                className={styles.formInput}
                placeholder="Enter group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                disabled={loading}
                required
                minLength={3}
                maxLength={50}
              />
            </div>
          )}

          {selectedCircleId && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="gc-user-search" className={styles.formLabel}>
                  Add Members
                </label>
                <input
                  type="text"
                  id="gc-user-search"
                  className={styles.formInput}
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className={styles.userSelectContainer}>
                {loadingMembers ? (
                  <div className={styles.emptyState}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px', color: '#6a14eb' }}></i>
                    <p>Loading members...</p>
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>{members.length === 0 ? 'No members found in this circle' : 'No members match your search'}</p>
                    {members.length > 0 && (
                      <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>
                        Try a different search term
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '8px', fontSize: '0.85rem', color: '#666' }}>
                      Showing {filteredMembers.length} of {members.length} members
                    </div>
                    {filteredMembers.map((member) => (
                      <div key={member.id} className={styles.userOption}>
                        <label>
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(member.id)}
                            onChange={() => handleMemberToggle(member.id)}
                            disabled={loading}
                          />
                          <div className={styles.userOptionContent}>
                            {member.profile_pic && member.profile_pic !== '/images/default_profile.png' ? (
                              <img src={member.profile_pic} alt={member.full_name || member.email} />
                            ) : (
                              <div className={styles.avatarPlaceholder}>
                                {(member.full_name || member.email || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span>{member.full_name || member.email || 'Unknown User'}</span>
                          </div>
                        </label>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </>
          )}

          {!selectedCircleId && !initialCircleId && (
            <div className={styles.userSelectContainer}>
              <div className={styles.emptyState}>
                <p>Select a circle first to create a group chat</p>
              </div>
            </div>
          )}

          {selectedMembers.length > 0 && (
            <div className={styles.selectedUsersContainer}>
              {selectedMembers.map((memberId) => {
                const member = members.find((m) => m.id === memberId);
                return member ? (
                  <div key={memberId} className={styles.selectedUserTag}>
                    {member.full_name || member.email}
                    <button
                      type="button"
                      className={styles.removeUserBtn}
                      onClick={() => handleMemberToggle(memberId)}
                      disabled={loading}
                    >
                      &times;
                    </button>
                  </div>
                ) : null;
              })}
            </div>
          )}

          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={loading || !selectedCircleId}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                  Creating...
                </>
              ) : selectedCircleId ? (
                'Create Group'
              ) : (
                'Start Chat'
              )}
            </button>
          </div>
        </form>
        
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px',
            zIndex: 10
          }}>
            <div style={{ textAlign: 'center' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#6a14eb', marginBottom: '10px' }}></i>
              <p style={{ margin: 0, color: '#2b2d42', fontWeight: 500 }}>Creating group...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

