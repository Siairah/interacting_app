'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { ChatRoom, ChatMessage, getChatMessages, sendMessage, deleteMessage, markMessagesAsSeen } from '@/utils/chatApi';
import type { CallLogEvent, WebRTCSignal } from '@/types/webrtc';
import { useChatSocket } from '@/hooks/useChatSocket';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import MediaViewer from './MediaViewer';
import GroupMenu from './GroupMenu';
import CallOverlay from './CallOverlay';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';
import styles from './ChatWindow.module.css';

interface ChatWindowProps {
  room: ChatRoom | null;
  userId: string;
  userData: any;
  onRoomUpdate?: (room: ChatRoom) => void;
  pendingOffer?: WebRTCSignal | null;
  onPendingOfferConsumed?: () => void;
}

export default function ChatWindow({
  room,
  userId,
  userData: _userData,
  onRoomUpdate,
  pendingOffer,
  onPendingOfferConsumed,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const isLoadingOlderRef = useRef(false);

  const { messages: socketMessages, setMessages: setSocketMessages, markAsRead } = useChatSocket(room?.id || null, userId);

  const peerUserId =
    room && !room.is_group
      ? (() => {
          for (const m of room.members) {
            const raw = m as { id?: string } | string;
            const mid = typeof raw === 'string' ? raw : raw?.id;
            if (mid && String(mid) !== String(userId)) return String(mid);
          }
          return null;
        })()
      : null;
  const canCall = Boolean(room && !room.is_group && peerUserId);

  const handleCallLog = useCallback(
    async (event: CallLogEvent) => {
      if (!room || !peerUserId) return;
      const label = event.media === 'video' ? 'Video' : 'Voice';
      let content = '';
      let call_status: NonNullable<ChatMessage['call_status']>;
      let call_duration: number | undefined;

      switch (event.kind) {
        case 'cancelled':
          content = `${label} call — no answer`;
          call_status = 'cancelled';
          break;
        case 'declined':
          content = `${label} call declined`;
          call_status = 'declined';
          break;
        case 'answered':
          content = `${label} call`;
          call_status = 'answered';
          call_duration = event.durationSec;
          break;
        default:
          return;
      }

      await sendMessage(
        room.id,
        event.senderId,
        content,
        'call_log',
        undefined,
        undefined,
        { call_status, call_duration }
      );
    },
    [room, peerUserId]
  );

  const {
    uiState: callUiState,
    incomingMedia,
    localStream,
    remoteStream,
    error: callError,
    startAudioCall,
    startVideoCall,
    acceptIncoming,
    rejectIncoming,
    cancelOutgoing,
    endCall,
    isMuted,
    isVideoOff,
    toggleMute,
    toggleVideo,
  } = useWebRTCCall(room?.id ?? null, userId, peerUserId, canCall, {
    onCallLog: handleCallLog,
    pendingOffer,
    onPendingOfferConsumed,
  });

  useEffect(() => {
    if (room) {
      loadMessages();
      // Don't mark as read immediately - wait until messages are loaded and visible
    } else {
      setMessages([]);
    }
  }, [room?.id]);

  useEffect(() => {
    if (room) {
      setMessages((prev) => {
        const messageMap = new Map<string, ChatMessage>();
        
        // Filter out messages deleted by this user (but keep messages deleted for everyone)
        const filteredPrev = prev.filter((msg) => {
          if (msg.room !== room.id && msg.room?.toString() !== room.id) return false;
          // Keep messages deleted for everyone - they should still be visible
          if (msg.is_deleted_for_everyone) {
            return true;
          }
          // Don't show messages deleted by this user
          if (msg.deleted_by && Array.isArray(msg.deleted_by) && msg.deleted_by.includes(userId)) {
            return false;
          }
          return true;
        });
        
        filteredPrev.forEach((msg) => {
          messageMap.set(msg.id, msg);
        });
        
        // Filter socket messages too
        const filteredSocket = socketMessages.filter((msg) => {
          if (msg.room !== room.id && msg.room?.toString() !== room.id) return false;
          // Keep messages deleted for everyone
          if (msg.is_deleted_for_everyone) {
            return true;
          }
          if (msg.deleted_by && Array.isArray(msg.deleted_by) && msg.deleted_by.includes(userId)) {
            return false;
          }
          return true;
        });
        
        // Merge socket messages, preferring socket messages if they exist (they're more recent)
        filteredSocket.forEach((msg) => {
          messageMap.set(msg.id, msg);
        });
        
        return Array.from(messageMap.values()).sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
    }
  }, [socketMessages, room, userId]);

  const hasMarkedAsSeenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    scrollToBottom();
    
    // Mark messages as seen when they are loaded and visible (only once per room)
    if (room && messages.length > 0 && !loading && !hasMarkedAsSeenRef.current.has(room.id)) {
      // Small delay to ensure messages are rendered and user has viewed them
      const timer = setTimeout(() => {
        markMessagesAsSeen(room.id, userId).then((result) => {
          if (result.success) {
            console.log('✅ Messages marked as seen for room:', room.id);
            hasMarkedAsSeenRef.current.add(room.id);
            // Also emit socket event for real-time update
            markAsRead();
          }
        }).catch((error) => {
          console.error('Error marking messages as seen:', error);
        });
      }, 1000); // Wait 1 second after messages are loaded to ensure user has viewed them
      
      return () => clearTimeout(timer);
    }
  }, [messages, room, loading, userId, markAsRead]);

  // Reset marked as seen when room changes
  useEffect(() => {
    if (room) {
      hasMarkedAsSeenRef.current.clear();
    }
  }, [room?.id]);

  const loadMessages = async () => {
    if (!room) return;
    setLoading(true);
    try {
      const msgs = await getChatMessages(room.id, userId, 50);
      // Filter out messages deleted by this user (already filtered in API, but double-check)
      const filteredMsgs = msgs.filter((msg) => {
        if (msg.deleted_by && Array.isArray(msg.deleted_by) && msg.deleted_by.includes(userId)) {
          return false;
        }
        return true;
      });
      // Deduplicate messages by ID before setting
      const uniqueMsgs = Array.from(
        new Map(filteredMsgs.map((msg) => [msg.id, msg])).values()
      ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setMessages(uniqueMsgs);
      setSocketMessages(uniqueMsgs);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOlderMessages = async () => {
    if (!room || isLoadingOlderRef.current) return;
    isLoadingOlderRef.current = true;
    setLoadingOlder(true);

    try {
      const firstMsg = messages[0];
      if (!firstMsg) return;

      // Load older messages (API should support before parameter, but for now we'll deduplicate)
      const olderMsgs = await getChatMessages(room.id, userId, 50);
      if (olderMsgs.length > 0) {
        const oldHeight = chatBoxRef.current?.scrollHeight || 0;
        setMessages((prev) => {
          // Create a Map for efficient deduplication
          const messageMap = new Map<string, ChatMessage>();
          
          // Add existing messages to map
          prev.forEach((msg) => {
            messageMap.set(msg.id, msg);
          });
          
          // Add older messages, only if they don't already exist
          olderMsgs.forEach((msg) => {
            if (!messageMap.has(msg.id)) {
              messageMap.set(msg.id, msg);
            }
          });
          
          // Convert back to array and sort
          return Array.from(messageMap.values()).sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });

        // Maintain scroll position
        setTimeout(() => {
          if (chatBoxRef.current) {
            const newHeight = chatBoxRef.current.scrollHeight;
            chatBoxRef.current.scrollTop = newHeight - oldHeight;
          }
        }, 50);
      }
    } catch (error) {
      console.error('Error loading older messages:', error);
    } finally {
      setLoadingOlder(false);
      isLoadingOlderRef.current = false;
    }
  };

  const handleSendMessage = async (content: string, media?: File, replyTo?: string) => {
    if (!room || (!content.trim() && !media)) return;

    try {
      const messageType = media ? 'media' : 'text';
      const result = await sendMessage(room.id, userId, content, messageType, media, replyTo);
      
      // Don't add message manually here - Socket.IO will receive it in real-time
      // This prevents duplicate messages
      if (result.success) {
        markAsRead();
        // Clear input will be handled by MessageInput component
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string, deleteForEveryone: boolean) => {
    try {
      // Optimistically update UI
      if (deleteForEveryone) {
        // Delete for everyone - show deleted message immediately
        setMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, is_deleted_for_everyone: true, content: '', media: null }
              : msg
          );
          return updated;
        });
        setSocketMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, is_deleted_for_everyone: true, content: '', media: null }
              : msg
          );
          return updated;
        });
      } else {
        // Delete for me - remove message from list immediately
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
        setSocketMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      }

      // Then call API
      const result = await deleteMessage(messageId, userId, deleteForEveryone);
      if (!result.success) {
        // If API call failed, reload messages to restore state
        console.error('Failed to delete message:', result.message);
        loadMessages();
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      // Reload messages on error to restore state
      loadMessages();
    }
  };

  const scrollToBottom = () => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  };

  const handleScroll = () => {
    if (!chatBoxRef.current || isLoadingOlderRef.current) return;

    const { scrollTop } = chatBoxRef.current;
    if (scrollTop < 100) {
      loadOlderMessages();
    }
  };

  const getDisplayName = () => {
    if (!room) return '';
    if (room.is_group) return room.name;
    const otherMember = room.members.find((m) => m.id !== userId);
    // Use full_name if available, fallback to email or display_name
    if (otherMember) {
      return otherMember.full_name || otherMember.email || 'Unknown';
    }
    return room.display_name || 'Unknown';
  };

  const getDisplayPic = () => {
    if (!room) return '/images/default_profile.png';
    if (room.is_group && room.profile_pic) return room.profile_pic;
    if (!room.is_group) {
      const otherMember = room.members.find((m) => m.id !== userId);
      if (otherMember && otherMember.profile_pic) {
        return otherMember.profile_pic;
      }
    }
    return '/images/default_profile.png';
  };

  if (!room) {
    return (
      <div className={styles.emptyChatState}>
        <div className={styles.emptyIcon}>
          <i className="fas fa-comments"></i>
        </div>
        <h3>Select a conversation</h3>
        <p>Choose an existing chat or start a new one</p>
      </div>
    );
  }

  return (
    <div className={styles.chatWindow}>
      <div className={styles.chatHeader}>
        <div className={styles.headerLeft}>
          {!room.is_group && (
            <div className={styles.userAvatar}>
              {getDisplayPic() ? (
                <img src={getDisplayPic()} alt={getDisplayName()} />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {getDisplayName().charAt(0).toUpperCase()}
                </div>
              )}
              {room.is_online && <span className={styles.onlineIndicator}></span>}
            </div>
          )}
          <div className={styles.userInfo}>
            <h3>{getDisplayName()}</h3>
            {!room.is_group && (
              <span
                className={room.is_online ? styles.presenceOnline : styles.presenceOffline}
                aria-live="polite"
              >
                {room.is_online ? 'Online' : 'Offline'}
              </span>
            )}
            <p id="typing-indicator"></p>
          </div>
        </div>
        <div className={styles.headerRight}>
          {canCall && (
            <div className={styles.headerCallGroup}>
              <button
                type="button"
                className={styles.headerCallBtn}
                onClick={startAudioCall}
                title="Voice call"
                aria-label="Start voice call"
              >
                <i className="fas fa-phone"></i>
              </button>
              <button
                type="button"
                className={styles.headerCallBtn}
                onClick={startVideoCall}
                title="Video call"
                aria-label="Start video call"
              >
                <i className="fas fa-video"></i>
              </button>
            </div>
          )}
          {room.is_group && (
            <button 
              className={styles.headerActionBtn} 
              onClick={() => setShowGroupMenu(true)}
              title="Group options"
            >
              <i className="fas fa-ellipsis-v"></i>
            </button>
          )}
        </div>
      </div>

      <div className={styles.messagesContainer}>
        <div
          className={styles.messagesScroll}
          id="chat-box"
          ref={chatBoxRef}
          onScroll={handleScroll}
        >
          {loadingOlder && (
            <div className={styles.scrollLoader}>
              <div className={styles.loaderSpinner}></div>
              <span>Loading older messages</span>
            </div>
          )}
          {loading ? (
            <div className={styles.loadingMessages}>Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className={styles.emptyMessages}>No messages yet. Start the conversation!</div>
          ) : (
            messages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                userId={userId}
                isGroup={room.is_group}
                roomMembers={room.members}
                onDelete={handleDeleteMessage}
                onMediaClick={setSelectedMedia}
              />
            ))
          )}
        </div>
      </div>

      <MessageInput onSend={handleSendMessage} />

      {canCall && (
        <CallOverlay
          uiState={callUiState}
          incomingMedia={incomingMedia}
          peerName={getDisplayName()}
          peerPic={getDisplayPic()}
          localStream={localStream}
          remoteStream={remoteStream}
          error={callError}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          onAccept={acceptIncoming}
          onReject={rejectIncoming}
          onCancelOutgoing={cancelOutgoing}
          onEnd={endCall}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
        />
      )}

      {selectedMedia && (
        <MediaViewer
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
        />
      )}

      {room.is_group && (
        <GroupMenu
          room={room}
          userId={userId}
          isOpen={showGroupMenu}
          onClose={() => setShowGroupMenu(false)}
          onMemberRemoved={() => {
            if (onRoomUpdate && room) {
              loadMessages();
              onRoomUpdate({ ...room });
            }
          }}
          onRoomUpdate={(updatedRoom) => {
            if (onRoomUpdate) {
              onRoomUpdate(updatedRoom);
            }
            // Also update local room state
            if (updatedRoom) {
              // Force re-render by updating room reference
              loadMessages();
            }
          }}
          onGroupLeft={() => {
            if (onRoomUpdate) {
              onRoomUpdate({ ...room, members: room.members.filter(m => m.id !== userId) });
            }
            window.location.href = '/chat';
          }}
          onGroupDeleted={() => {
            window.location.href = '/chat';
          }}
        />
      )}
    </div>
  );
}

