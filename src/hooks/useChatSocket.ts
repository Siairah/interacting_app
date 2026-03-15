import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '@/utils/socketAuth';
import { ChatMessage } from '@/utils/chatApi';

export function useChatSocket(roomId: string | null, userId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string>('');
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const socket = getSocket();
    if (!socket) {
      console.warn('Socket not available');
      return;
    }

    socketRef.current = socket;

    // Join the room
    socket.emit('join_room', roomId);
    console.log('✅ Joined chat room:', roomId);
                                                            
    // Listen for new messages
    const handleNewMessage = (msg: any) => {
      if (msg.room === roomId || msg.room?.toString() === roomId) {
        // Format message to match ChatMessage interface
        const formattedMessage: ChatMessage = {
          id: msg.id || msg._id,
          room: msg.room || roomId,
          sender: typeof msg.sender === 'string' 
            ? { id: msg.sender, email: '' }
            : {
                id: msg.sender?.id || msg.sender?._id || '',
                email: msg.sender?.email || '',
                full_name: msg.sender?.full_name,
                profile_pic: msg.sender?.profile_pic,
              },
          content: msg.content || '',
          message_type: msg.message_type || 'text',
          media: msg.media || null,
          reply_to: msg.reply_to || null,
          timestamp: msg.timestamp || new Date().toISOString(),
          seen_by: msg.seen_by || [],
          is_deleted_for_everyone: msg.is_deleted_for_everyone || false,
          deleted_by: msg.deleted_by || [],
          call_status: msg.call_status || null,
          call_duration: msg.call_duration || null,
        };

        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === formattedMessage.id)) {
            return prev;
          }
          return [...prev, formattedMessage];
        });
      }
    };

    // Listen for deleted messages (delete for everyone)
    const handleDeletedMessage = (data: { message_id: string; room_id: string }) => {
      if (data.room_id === roomId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.message_id
              ? { ...msg, is_deleted_for_everyone: true, content: 'This message was deleted' }
              : msg
          )
        );
      }
    };

    // Listen for delete for me
    const handleDeletedForUser = (data: { message_id: string; user_id: string; room_id: string }) => {
      if (data.room_id === roomId && userId && data.user_id === userId) {
        // Remove message from list for this user
        setMessages((prev) => prev.filter((msg) => msg.id !== data.message_id));
      }
    };

    // Listen for seen updates
    const handleSeenUpdate = (data: { room_id: string; user_id: string }) => {
      if (data.room_id === roomId) {
        // Update seen_by for messages in this room
        setMessages((prev) =>
          prev.map((msg) =>
            !msg.seen_by.includes(data.user_id)
              ? { ...msg, seen_by: [...msg.seen_by, data.user_id] }
              : msg
          )
        );
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('deleted_message', handleDeletedMessage);
    socket.on('message_deleted_for_user', handleDeletedForUser);
    socket.on('seen_update', handleSeenUpdate);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('deleted_message', handleDeletedMessage);
      socket.off('message_deleted_for_user', handleDeletedForUser);
      socket.off('seen_update', handleSeenUpdate);
      if (roomId) {
        socket.emit('leave_room', roomId);
        console.log('👋 Left chat room:', roomId);
      }
    };
  }, [roomId, userId]);

  const sendMessage = useCallback((message: ChatMessage) => {
    if (socketRef.current && roomId) {
      const { room, ...messageWithoutRoom } = message;
      socketRef.current.emit('send_message', {
        room: roomId,
        ...messageWithoutRoom,
      });
    }
  }, [roomId]);

  const markAsRead = useCallback(() => {
    if (socketRef.current && roomId) {
      socketRef.current.emit('message_seen', {
        room_id: roomId,
      });
    }
  }, [roomId]);

  return {
    messages,
    isTyping,
    typingUser,
    sendMessage,
    markAsRead,
    setMessages,
  };
}

