'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatRoom, removeGroupMember, leaveGroup, deleteGroup, addGroupMembers, getCircleMembers, updateGroupAvatar } from '@/utils/chatApi';
import { confirmDialog } from '@/utils/confirmDialog';
import { sanitizeErrorMessage } from '@/utils/errorHandler';
import styles from './GroupMenu.module.css';

interface GroupMenuProps {
  room: ChatRoom;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onMemberRemoved?: () => void;
  onGroupLeft?: () => void;
  onGroupDeleted?: () => void;
  onRoomUpdate?: (room: ChatRoom) => void;
  isCircleAdmin?: boolean;
}

export default function GroupMenu({
  room,
  userId,
  isOpen,
  onClose,
  onMemberRemoved,
  onGroupLeft,
  onGroupDeleted,
  onRoomUpdate,
  isCircleAdmin = false
}: GroupMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [showMembers, setShowMembers] = useState(true);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [availableMembers, setAvailableMembers] = useState<Array<{ id: string; email: string; full_name: string; profile_pic: string }>>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom>(room);
  const [isCircleAdminState, setIsCircleAdminState] = useState(false);

  // Update currentRoom when room prop changes
  useEffect(() => {
    setCurrentRoom(room);
  }, [room]);

  useEffect(() => {
    const checkCircleAdmin = async () => {
      if (currentRoom.circle?.id && userId) {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
          const res = await fetch(`${API_URL}/circle-details/${currentRoom.circle.id}?user_id=${userId}`);
          
          if (!res.ok) {
            setIsCircleAdminState(false);
            return;
          }
          
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            setIsCircleAdminState(false);
            return;
          }
          
          const data = await res.json();
          if (data.success && data.circle) {
            setIsCircleAdminState(data.circle.is_admin || false);
          } else {
            setIsCircleAdminState(false);
          }
        } catch (error) {
          setIsCircleAdminState(false);
        }
      } else {
        setIsCircleAdminState(false);
      }
    };
    
    if (isOpen && currentRoom.is_group && currentRoom.circle?.id) {
      checkCircleAdmin();
    } else {
      setIsCircleAdminState(false);
    }
  }, [isOpen, currentRoom.circle?.id, currentRoom.is_group, userId]);

  const roomCreatedBy = currentRoom.created_by || (currentRoom as any).created_by || null;
  const roomCreatedByStr = roomCreatedBy ? String(roomCreatedBy).trim() : '';
  const userIdStr = userId ? String(userId).trim() : '';
  
  const isGroupCreator = Boolean(roomCreatedByStr && userIdStr && roomCreatedByStr === userIdStr);
  const isAdmin = isGroupCreator || isCircleAdmin || isCircleAdminState;

  useEffect(() => {
    if (showAddMemberModal && currentRoom.circle?.id) {
      loadAvailableMembers();
    }
  }, [showAddMemberModal, currentRoom.circle?.id]);

  const loadAvailableMembers = async () => {
    if (!currentRoom.circle?.id) return;
    setLoadingMembers(true);
    try {
      const members = await getCircleMembers(currentRoom.circle.id, userId);
      const currentMemberIds = new Set(currentRoom.members.map(m => m.id));
      const available = members.filter(m => !currentMemberIds.has(m.id));
      setAvailableMembers(available);
    } catch (error) {
      console.error('Error loading members:', error);
      const { showToast } = await import('@/components/ToastContainer');
      showToast(sanitizeErrorMessage(error), 'error');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast('Please select at least one member to add', 'warning');
      return;
    }

    try {
      const result = await addGroupMembers(currentRoom.id, userId, selectedMembers);
      if (result.success) {
        const { showToast } = await import('@/components/ToastContainer');
        showToast(`${selectedMembers.length} member(s) added successfully`, 'success');
        setShowAddMemberModal(false);
        setSelectedMembers([]);
        
        if (result.room && onRoomUpdate) {
          const updatedRoom = {
            ...result.room,
            created_by: result.room.created_by || currentRoom.created_by,
            members: result.room.members || currentRoom.members,
            member_count: result.room.member_count || result.room.members?.length || currentRoom.member_count,
          };
          setCurrentRoom(updatedRoom);
          onRoomUpdate(updatedRoom);
        }
        
        if (currentRoom.circle?.id) {
          await loadAvailableMembers();
        }
        if (onMemberRemoved) {
          onMemberRemoved();
        }
      } else {
        const errorMsg = sanitizeErrorMessage(result.message || 'Failed to add members');
        const { showToast } = await import('@/components/ToastContainer');
        showToast(errorMsg, 'error');
      }
    } catch (error) {
      const errorMsg = sanitizeErrorMessage(error);
      const { showToast } = await import('@/components/ToastContainer');
      showToast(errorMsg, 'error');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast('Please select an image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast('Image size must be less than 5MB', 'error');
      return;
    }

    setUploadingAvatar(true);
    try {
      const result = await updateGroupAvatar(currentRoom.id, userId, file);
      if (result.success && result.profile_pic) {
        const { showToast } = await import('@/components/ToastContainer');
        showToast('Group avatar updated successfully', 'success');
        const updatedRoom = { ...currentRoom, profile_pic: result.profile_pic };
        setCurrentRoom(updatedRoom);
        setShowAvatarModal(false);
        if (onRoomUpdate) {
          onRoomUpdate(updatedRoom);
        }
        if (onMemberRemoved) {
          onMemberRemoved();
        }
      } else {
        const errorMsg = sanitizeErrorMessage(result.message || 'Failed to update avatar');
        const { showToast } = await import('@/components/ToastContainer');
        showToast(errorMsg, 'error');
      }
    } catch (error) {
      const errorMsg = sanitizeErrorMessage(error);
      const { showToast } = await import('@/components/ToastContainer');
      showToast(errorMsg, 'error');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleRemoveMember = async (memberId: string) => {
    const member = currentRoom.members.find(m => m.id === memberId);
    const memberName = member?.full_name || member?.email || 'this member';
    
    const confirmed = await confirmDialog(
      `Are you sure you want to remove ${memberName} from this group?`,
      'Remove',
      'Cancel',
      'danger'
    );

    if (!confirmed) return;

    try {
      const result = await removeGroupMember(currentRoom.id, userId, memberId);
      if (result.success) {
        const { showToast } = await import('@/components/ToastContainer');
        showToast('Member removed successfully', 'success');
        
        if (result.room && onRoomUpdate) {
          const updatedRoom = {
            ...result.room,
            created_by: result.room.created_by || currentRoom.created_by,
            members: result.room.members || [],
            member_count: result.room.member_count || result.room.members?.length || 0,
          };
          setCurrentRoom(updatedRoom);
          onRoomUpdate(updatedRoom);
        } else {
          const updatedMembers = currentRoom.members.filter(m => String(m.id).trim() !== String(memberId).trim());
          const updatedRoom = {
            ...currentRoom,
            members: updatedMembers,
            member_count: updatedMembers.length
          };
          setCurrentRoom(updatedRoom);
          if (onRoomUpdate) {
            onRoomUpdate(updatedRoom);
          }
        }
        
        if (showAddMemberModal && currentRoom.circle?.id) {
          await loadAvailableMembers();
        }
        if (onMemberRemoved) onMemberRemoved();
      } else {
        const { showToast } = await import('@/components/ToastContainer');
        showToast(sanitizeErrorMessage(result.message || 'Failed to remove member'), 'error');
      }
    } catch (error) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast(sanitizeErrorMessage(error), 'error');
    }
  };

  const handleLeaveGroup = async () => {
    const confirmed = await confirmDialog(
      'Are you sure you want to leave this group?',
      'Leave',
      'Cancel',
      'danger'
    );

    if (!confirmed) return;

    try {
      const result = await leaveGroup(currentRoom.id, userId);
      if (result.success) {
        const { showToast } = await import('@/components/ToastContainer');
        showToast('Left group successfully', 'success');
        if (onGroupLeft) onGroupLeft();
        onClose();
      } else {
        const { showToast } = await import('@/components/ToastContainer');
        showToast(sanitizeErrorMessage(result.message || 'Failed to leave group'), 'error');
      }
    } catch (error) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast(sanitizeErrorMessage(error), 'error');
    }
  };

  const handleDeleteGroup = async () => {
    const confirmed = await confirmDialog(
      'Are you sure you want to delete this group? This action cannot be undone.',
      'Delete',
      'Cancel',
      'danger'
    );

    if (!confirmed) return;

    try {
      const result = await deleteGroup(currentRoom.id, userId);
      if (result.success) {
        const { showToast } = await import('@/components/ToastContainer');
        showToast('Group deleted successfully', 'success');
        if (onGroupDeleted) onGroupDeleted();
        onClose();
      } else {
        const { showToast } = await import('@/components/ToastContainer');
        showToast(sanitizeErrorMessage(result.message || 'Failed to delete group'), 'error');
      }
    } catch (error) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast(sanitizeErrorMessage(error), 'error');
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        if (!showAddMemberModal && !showAvatarModal) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, showAddMemberModal, showAvatarModal]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddMemberModal) {
          setShowAddMemberModal(false);
          setSelectedMembers([]);
        } else if (showAvatarModal) {
          setShowAvatarModal(false);
        } else if (isOpen) {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, showAddMemberModal, showAvatarModal, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Main Menu Overlay */}
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.menu} ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <div className={styles.menuHeader}>
            <div className={styles.headerTitle}>
              <h3>{currentRoom.name}</h3>
              <span className={styles.memberCount}>{currentRoom.members.length} member{currentRoom.members.length !== 1 ? 's' : ''}</span>
            </div>
            <button className={styles.closeBtn} onClick={onClose} type="button" aria-label="Close menu">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className={styles.menuContent}>
            {/* Members Section */}
            <div className={styles.membersSection}>
              <div className={styles.sectionHeader} onClick={() => setShowMembers(!showMembers)}>
                <div className={styles.sectionTitle}>
                  <i className="fas fa-users"></i>
                  <span>Members</span>
                </div>
                <i className={`fas fa-chevron-${showMembers ? 'up' : 'down'}`}></i>
              </div>
              
              {showMembers && (
                <div className={styles.membersList}>
                  {currentRoom.members.length === 0 ? (
                    <div className={styles.emptyState}>
                      <i className="fas fa-user-slash"></i>
                      <p>No members yet</p>
                    </div>
                  ) : (
                    currentRoom.members.map((member) => {
                      const memberIdStr = String(member.id || '').trim();
                      const userIdStr = String(userId || '').trim();
                      const isCurrentUser = memberIdStr === userIdStr;
                      const isMemberGroupCreator = roomCreatedByStr && memberIdStr && roomCreatedByStr === memberIdStr;
                      
                      return (
                        <div key={member.id} className={styles.memberItem}>
                          <div className={styles.memberInfo}>
                            <div className={styles.avatarWrapper}>
                              <img
                                src={member.profile_pic || '/images/default_profile.png'}
                                alt={member.full_name || member.email}
                                className={styles.memberAvatar}
                              />
                            </div>
                            <div className={styles.memberDetails}>
                              <div className={styles.memberName}>
                                {member.full_name || member.email}
                              </div>
                              <div className={styles.memberBadges}>
                                {isMemberGroupCreator && <span className={styles.creatorBadge}>Creator</span>}
                                {isCurrentUser && <span className={styles.youBadge}>You</span>}
                              </div>
                            </div>
                          </div>
                          {isAdmin && !isCurrentUser && !isMemberGroupCreator && (
                            <button
                              className={styles.removeBtn}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRemoveMember(member.id);
                              }}
                              title={`Remove ${member.full_name || member.email}`}
                              type="button"
                              aria-label={`Remove ${member.full_name || member.email}`}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Admin Actions */}
            {isAdmin && (
              <div className={styles.adminSection}>
                <div className={styles.adminHeader}>
                  <i className="fas fa-shield-alt"></i>
                  <span>Admin Options</span>
                  {isGroupCreator && <span className={styles.adminTag}>Creator</span>}
                  {isCircleAdminState && <span className={styles.adminTag}>Circle Admin</span>}
                </div>
                
                <div className={styles.actionButtons}>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                  />
                  <button 
                    className={styles.actionBtn}
                    onClick={() => {
                      setShowAvatarModal(true);
                      setTimeout(() => avatarInputRef.current?.click(), 100);
                    }}
                    disabled={uploadingAvatar}
                    type="button"
                  >
                    <i className="fas fa-image"></i>
                    <span>{uploadingAvatar ? 'Uploading...' : 'Change Avatar'}</span>
                  </button>
                  
                  {currentRoom.circle?.id && (
                    <button 
                      className={styles.actionBtn}
                      onClick={() => setShowAddMemberModal(true)}
                      type="button"
                    >
                      <i className="fas fa-user-plus"></i>
                      <span>Add Members</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Regular Actions */}
            <div className={styles.actionsSection}>
              <button 
                className={`${styles.actionBtn} ${styles.leaveBtn}`} 
                onClick={handleLeaveGroup}
                type="button"
              >
                <i className="fas fa-sign-out-alt"></i>
                <span>Leave Group</span>
              </button>
              
              {isGroupCreator && (
                <button 
                  className={`${styles.actionBtn} ${styles.deleteBtn}`} 
                  onClick={handleDeleteGroup}
                  type="button"
                >
                  <i className="fas fa-trash"></i>
                  <span>Delete Group</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Members Modal */}
      {showAddMemberModal && (
        <div 
          className={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddMemberModal(false);
              setSelectedMembers([]);
            }
          }}
        >
          <div className={styles.modal} ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <i className="fas fa-user-plus"></i>
                <h3>Add Members</h3>
              </div>
              <button 
                className={styles.modalCloseBtn} 
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSelectedMembers([]);
                }}
                type="button"
                aria-label="Close"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className={styles.modalBody}>
              {loadingMembers ? (
                <div className={styles.loadingState}>
                  <div className={styles.spinner}></div>
                  <p>Loading members...</p>
                </div>
              ) : availableMembers.length === 0 ? (
                <div className={styles.emptyState}>
                  <i className="fas fa-users-slash"></i>
                  <p>No available members to add</p>
                  <span>All circle members are already in this group</span>
                </div>
              ) : (
                <>
                  <div className={styles.searchSection}>
                    <div className={styles.selectedCount}>
                      {selectedMembers.length > 0 && (
                        <span className={styles.countBadge}>{selectedMembers.length} selected</span>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.membersGrid}>
                    {availableMembers.map((member) => (
                      <div 
                        key={member.id} 
                        className={`${styles.memberCard} ${selectedMembers.includes(member.id) ? styles.selected : ''}`}
                        onClick={() => toggleMemberSelection(member.id)}
                      >
                        <div className={styles.cardCheckbox}>
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(member.id)}
                            onChange={() => toggleMemberSelection(member.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className={styles.cardAvatar}>
                          <img
                            src={member.profile_pic || '/images/default_profile.png'}
                            alt={member.full_name || member.email}
                          />
                        </div>
                        <div className={styles.cardName}>
                          {member.full_name || member.email}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {availableMembers.length > 0 && (
              <div className={styles.modalFooter}>
                <button 
                  className={styles.cancelBtn}
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setSelectedMembers([]);
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button 
                  className={styles.primaryBtn}
                  onClick={handleAddMembers}
                  disabled={selectedMembers.length === 0 || loadingMembers}
                  type="button"
                >
                  {loadingMembers ? (
                    <>
                      <div className={styles.btnSpinner}></div>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i>
                      <span>Add {selectedMembers.length > 0 ? `(${selectedMembers.length})` : ''}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
