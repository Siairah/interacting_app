'use client';

import { useState } from 'react';
import { ChatRoom } from '@/utils/chatApi';
import styles from './ChatList.module.css';

interface ChatListProps {
  rooms: ChatRoom[];
  selectedRoom: ChatRoom | null;
  onRoomSelect: (room: ChatRoom) => void;
  onCreateGroup: () => void;
  userId: string;
  userData: any;
}

export default function ChatList({
  rooms,
  selectedRoom,
  onRoomSelect,
  onCreateGroup,
  userId,
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRooms = rooms.filter((room) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      room.display_name?.toLowerCase().includes(query) ||
      room.name?.toLowerCase().includes(query) ||
      room.last_message?.content.toLowerCase().includes(query)
    );
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getDisplayName = (room: ChatRoom) => {
    if (room.is_group) {
      return room.name;
    }
    // For DM, find the other user - use full_name if available, fallback to email
    const otherMember = room.members.find((m) => m.id !== userId);
    if (otherMember) {
      return otherMember.full_name || otherMember.email || 'Unknown';
    }
    return room.display_name || 'Unknown';
  };

  const getDisplayPic = (room: ChatRoom) => {
    if (room.profile_pic) {
      return room.profile_pic;
    }
    return '/images/default_profile.png';
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h2>Messages</h2>
        <button className={styles.composeBtn} onClick={onCreateGroup}>
          <i className="fas fa-edit"></i>
        </button>
      </div>

      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search messages..."
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <i className={`fas fa-search ${styles.searchIcon}`}></i>
      </div>

      <div className={styles.chatListContainer}>
        <ul className={styles.chatList}>
          {filteredRooms.length === 0 ? (
            <li className={styles.emptyState}>
              <i className="fas fa-comments"></i>
              <p>No conversations yet</p>
            </li>
          ) : (
            filteredRooms.map((room) => {
              const displayName = getDisplayName(room);
              const displayPic = getDisplayPic(room);
              const isActive = selectedRoom?.id === room.id;
              const unreadCount = room.unread_count || 0;
              const lastMessage = room.last_message;

              return (
                <li
                  key={room.id}
                  className={`${styles.chatItem} ${isActive ? styles.active : ''}`}
                  onClick={() => onRoomSelect(room)}
                >
                  <div className={styles.chatItemAvatar}>
                    {displayPic ? (
                      <img src={displayPic} alt={displayName} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {room.is_online && (
                      <span className={styles.onlineIndicator}></span>
                    )}
                  </div>
                  <div className={styles.chatItemContent}>
                    <div className={styles.chatItemHeader}>
                      <strong>{displayName}</strong>
                      {lastMessage && (
                        <span className={styles.chatTime}>
                          {formatTime(lastMessage.timestamp)}
                        </span>
                      )}
                    </div>
                    {lastMessage && (
                      <p className={styles.chatPreview}>
                        {room.is_group && lastMessage.sender.id !== userId && lastMessage.sender.full_name ? (
                          <span className={styles.senderNamePreview}>
                            {lastMessage.sender.full_name}:{' '}
                          </span>
                        ) : null}
                        {lastMessage.content.length > 30
                          ? `${lastMessage.content.substring(0, 30)}...`
                          : lastMessage.content}
                      </p>
                    )}
                  </div>
                  {unreadCount > 0 &&
                    lastMessage?.sender.id !== userId && (
                      <span className={styles.unreadBadge} id={`badge-${room.id}`}>
                        {unreadCount}
                      </span>
                    )}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}

