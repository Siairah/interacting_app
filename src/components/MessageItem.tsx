'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/utils/chatApi';
import styles from './MessageItem.module.css';

interface MessageItemProps {
  message: ChatMessage;
  userId: string;
  isGroup: boolean;
  roomMembers?: Array<{ id: string }>; // For group chats to check if all have seen
  onDelete: (messageId: string, deleteForEveryone: boolean) => void;
  onMediaClick: (media: { url: string; type: 'image' | 'video' }) => void;
}

export default function MessageItem({
  message,
  userId,
  isGroup,
  roomMembers = [],
  onDelete,
  onMediaClick,
}: MessageItemProps) {
  const [showActions, setShowActions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const isSent = message.sender.id === userId;
  const isDeleted = message.is_deleted_for_everyone;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    };

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActions]);

  // Calculate if message is seen
  const getSeenStatus = () => {
    if (!isSent) return { isSeen: false, showDouble: false };
    
    // Filter out sender from seen_by array (sender shouldn't be in their own seen_by)
    const seenByRecipients = message.seen_by.filter(id => id !== userId && id !== message.sender.id);
    
    // For DM (1-on-1): Show double check when recipient has seen it
    if (!isGroup) {
      const isSeen = seenByRecipients.length >= 1;
      return { isSeen, showDouble: isSeen };
    }
    
    // For group: Show double check when all members (except sender) have seen it
    if (isGroup && roomMembers.length > 0) {
      // Exclude sender from members count
      const recipientCount = roomMembers.filter(m => m.id !== userId && m.id !== message.sender.id).length;
      const isSeen = seenByRecipients.length >= recipientCount && recipientCount > 0;
      return { isSeen, showDouble: isSeen };
    }
    
    // Fallback: if we don't have room members info, use simple check
    return { isSeen: seenByRecipients.length > 0, showDouble: seenByRecipients.length > 0 };
  };

  const { isSeen: _isSeen, showDouble } = getSeenStatus();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleDeleteForMe = () => {
    onDelete(message.id, false);
    setShowActions(false);
  };

  const handleDeleteForEveryone = () => {
    onDelete(message.id, true);
    setShowActions(false);
  };

  const getMediaType = (mediaUrl: string): 'image' | 'video' => {
    if (!mediaUrl) return 'image';
    const url = mediaUrl.toLowerCase();
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    
    const hasVideoExt = videoExtensions.some(ext => url.includes(ext));
    const hasImageExt = imageExtensions.some(ext => url.includes(ext));
    
    if (hasVideoExt) return 'video';
    if (hasImageExt) return 'image';
    
    if (url.includes('video') || url.includes('mp4')) return 'video';
    
    return 'image';
  };

  const handleMediaClick = () => {
    if (message.media) {
      const mediaType = getMediaType(message.media);
      onMediaClick({
        url: message.media,
        type: mediaType,
      });
    }
  };

  if (message.message_type === 'call_log') {
    let callText = '';
    if (message.call_status === 'answered' && message.call_duration != null) {
      const duration = message.call_duration;
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      callText = `Call ended – ${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else if (message.content?.trim()) {
      callText = message.content.trim();
    } else {
      switch (message.call_status) {
        case 'missed':
          callText = 'Missed call';
          break;
        case 'answered':
          callText = 'Call ended';
          break;
        case 'declined':
          callText = 'Call declined';
          break;
        case 'cancelled':
          callText = 'Call canceled before pickup';
          break;
        default:
          callText = 'Call';
      }
    }

    return (
      <div className={`${styles.message} ${isSent ? styles.sent : styles.received} ${styles.callLog}`}>
        <div className={styles.messageContent}>
          <div className={styles.callLogContent}>
            <i className="fas fa-phone-alt"></i>
            <span className={message.call_status === 'missed' ? styles.missedCall : ''}>
              {callText}
            </span>
          </div>
          <div className={styles.messageTime}>{formatTime(message.timestamp)}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={messageRef}
      className={`${styles.message} ${isSent ? styles.sent : styles.received} ${isGroup && !isSent ? styles.groupMessage : ''} ${isDeleted ? styles.deleted : ''}`}
      data-msg-id={message.id}
    >
      {!isSent && isGroup && (
        <div className={styles.messageSenderInfo}>
          <span className={styles.senderName}>
            {message.sender.full_name || message.sender.email}
          </span>
        </div>
      )}

      <div className={styles.messageContent}>
        {isDeleted ? (
          <div className={styles.deletedMessageWrapper}>
            <em className={styles.deletedPlaceholder}>This message was deleted</em>
            <span className={styles.messageTime} style={{ fontSize: '0.65rem', opacity: 0.5 }}>{formatTime(message.timestamp)}</span>
          </div>
        ) : message.message_type === 'media' && message.media ? (
          <div className={styles.mediaMsg}>
            {getMediaType(message.media) === 'video' ? (
              <video 
                src={message.media}
                controls
                preload="metadata"
                playsInline
                className={`${styles.chatMedia} ${styles.chatVideo}`}
                style={{ 
                  width: '100%', 
                  maxHeight: '300px', 
                  height: 'auto',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  backgroundColor: '#000',
                  cursor: 'pointer'
                }}
                onClick={handleMediaClick}
                onError={(e) => {
                  console.error('Video load error in MessageItem:', e);
                }}
              >
                <source src={message.media} type="video/mp4" />
                <source src={message.media} type="video/webm" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <img
                src={message.media}
                alt="Shared media"
                className={`${styles.chatMedia} ${styles.chatImage}`}
                onClick={handleMediaClick}
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/default_profile.png';
                }}
              />
            )}
            {message.content && (
              <span className={styles.chatText}>{message.content}</span>
            )}
          </div>
        ) : (
          <span className={styles.chatText}>{message.content}</span>
        )}

        <div className={styles.messageMeta}>
          <span className={styles.messageTime}>{formatTime(message.timestamp)}</span>
          {isSent && !isDeleted && (
            <div className={styles.msgActions} ref={dropdownRef}>
              <i
                className={`fas fa-ellipsis-v ${styles.actionToggle}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowActions(!showActions);
                }}
              ></i>
              {showActions && (
                <div 
                  ref={dropdownRef}
                  className={styles.dropdownMenu} 
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={styles.actionItem} onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteForMe();
                  }}>
                    Delete for Me
                  </div>
                  <div className={styles.actionItem} onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteForEveryone();
                  }}>
                    Delete for Everyone
                  </div>
                </div>
              )}
            </div>
          )}
          {isSent && (
            <span className={styles.messageStatus}>
              <i className={`fas fa-check${showDouble ? '-double' : ''} ${showDouble ? styles.read : ''}`}></i>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

