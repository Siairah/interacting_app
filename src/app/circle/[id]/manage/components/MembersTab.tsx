import { useState, useEffect, useRef } from 'react';
import type { Member } from '../types';
import styles from '../manage.module.css';

interface MembersTabProps {
  members: Member[];
  adminCount: number;
  /** Creator: others can't demote them via UI; they can still remove their own admin. */
  circleCreatorUserId?: string | null;
  currentUserId?: string | null;
  onPromoteAdmin: (userId: string) => void;
  onRemoveAdmin: (userId: string) => void;
  onRestrictUser: (userId: string, memberName: string) => void;
  onBanUser: (userId: string, memberName: string) => void;
  onRemoveMember: (userId: string) => void;
}

export default function MembersTab({
  members,
  adminCount: _adminCount,
  circleCreatorUserId,
  currentUserId,
  onPromoteAdmin,
  onRemoveAdmin,
  onRestrictUser,
  onBanUser,
  onRemoveMember
}: MembersTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (openDropdown && !target.closest(`[data-dropdown="${openDropdown}"]`)) {
        setOpenDropdown(null);
      }
    }

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdown]);

  const filteredMembers = members.filter(member =>
    member.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
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
      {filteredMembers.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="fas fa-users-slash"></i>
          <p>No members found</p>
        </div>
      ) : (
        <div className={styles.memberList}>
          {filteredMembers.map((member) => (
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
              <div className={styles.memberActions} data-dropdown={member.id}>
                <button 
                  className={styles.actionBtn} 
                  title="More actions"
                  onClick={() => setOpenDropdown(openDropdown === member.id ? null : member.id)}
                  type="button"
                >
                  <i className="fas fa-ellipsis-v"></i>
                </button>
                {openDropdown === member.id && (
                  <div 
                    className={`${styles.dropdown} ${styles.show}`}
                    ref={(el) => { dropdownRefs.current[member.id] = el; }}
                  >
                    {!member.is_admin && (
                      <button 
                        onClick={() => {
                          setOpenDropdown(null);
                          onPromoteAdmin(member.user.id);
                        }}
                        type="button"
                      >
                        <i className="fas fa-user-shield"></i> Make Admin
                      </button>
                    )}
                    {member.is_admin &&
                      (!circleCreatorUserId ||
                        member.user.id !== circleCreatorUserId ||
                        (currentUserId != null && member.user.id === currentUserId)) && (
                      <button 
                        onClick={() => {
                          setOpenDropdown(null);
                          onRemoveAdmin(member.user.id);
                        }}
                        type="button"
                      >
                        <i className="fas fa-user-minus"></i> Remove Admin
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setOpenDropdown(null);
                        onRestrictUser(member.user.id, member.user.full_name);
                      }}
                      type="button"
                    >
                      <i className="fas fa-user-clock"></i> Restrict (7 days)
                    </button>
                    <button 
                      onClick={() => {
                        setOpenDropdown(null);
                        onBanUser(member.user.id, member.user.full_name);
                      }}
                      type="button"
                    >
                      <i className="fas fa-ban"></i> Ban User
                    </button>
                    <button 
                      onClick={() => {
                        setOpenDropdown(null);
                        onRemoveMember(member.user.id);
                      }}
                      type="button"
                    >
                      <i className="fas fa-user-times"></i> Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

