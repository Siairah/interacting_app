'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ensureAuth, getSocket, initSocketAuth } from '@/utils/socketAuth';
import { getChatRooms, ChatRoom, createDM } from '@/utils/chatApi';
import type { WebRTCSignal } from '@/types/webrtc';
import Navigation from '@/components/Navigation';
import ChatList from '@/components/ChatList';
import ChatWindow from '@/components/ChatWindow';
import CreateGroupModal from '@/components/CreateGroupModal';
import styles from './chat.module.css';

function normId(id: string | null | undefined): string {
  if (id == null) return '';
  return String(id).trim();
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [circleId, setCircleId] = useState<string | null>(null);
  const [pendingOffer, setPendingOffer] = useState<WebRTCSignal | null>(null);

  const roomsRef = useRef<ChatRoom[]>([]);
  const selectedRoomRef = useRef<ChatRoom | null>(null);
  roomsRef.current = rooms;
  selectedRoomRef.current = selectedRoom;

  useEffect(() => {
    const circleParam = searchParams?.get('circle');
    if (circleParam) {
      setCircleId(circleParam);
      setShowCreateGroup(true);
    }
  }, [searchParams]);

  useEffect(() => {
    async function checkAuth() {
      const { token, userId: uid, userData: ud } = await ensureAuth();
      if (!uid || !token) {
        router.push('/');
        return;
      }
      setUserId(uid);
      setUserData(ud);
    }
    checkAuth();
  }, [router]);

  const loadRooms = useCallback(async () => {
    if (!userId) return;
    try {
      const roomsData = await getChatRooms(userId, circleId || undefined);
      setRooms(roomsData);
      return roomsData;
    } catch (error) {
      console.error('Error loading rooms:', error);
      return [];
    }
  }, [userId, circleId]);

  useEffect(() => {
    if (!userId) return;

    async function initialLoad() {
      try {
        const roomsData = await loadRooms();
        if (!roomsData) return;
        
        const targetUserId = searchParams?.get('user');
        if (targetUserId && targetUserId !== userId && userId) {
          const existingDM = roomsData.find(
            room => !room.is_group && room.members.some(m => m.id === targetUserId)
          );
          
          if (existingDM) {
            setSelectedRoom(existingDM);
            router.replace('/chat');
          } else {
            const result = await createDM(userId, targetUserId);
            if (result.success && result.room) {
              setRooms((prev) => [result.room!, ...prev]);
              setSelectedRoom(result.room);
              router.replace('/chat');
            }
          }
        }
      } catch (error) {
        console.error('Error loading rooms:', error);
      } finally {
        setLoading(false);
      }
    }

    initialLoad();

    const interval = setInterval(loadRooms, 30000);
    return () => clearInterval(interval);
  }, [userId, circleId, searchParams, router]);

  useEffect(() => {
    if (!userId) return;

    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      if (msg.room && msg.sender?.id !== userId) {
        setRooms((prev) =>
          prev.map((room) => {
            if (room.id === msg.room || room.id === msg.room?.toString()) {
              return {
                ...room,
                unread_count: selectedRoom?.id === room.id ? 0 : (room.unread_count || 0) + 1,
                last_message: {
                  content: msg.content || 'Media',
                  sender: msg.sender,
                  timestamp: msg.timestamp || new Date().toISOString(),
                },
              };
            }
            return room;
          })
        );
      }
    };

    const handleGroupCreated = (data: { room_id: string; name: string; circle_id: string; members: string[] }) => {
      if (data.members.includes(userId)) {
        loadRooms();
      }
    };

    const handleDMCreated = (data: { room_id: string; members: string[] }) => {
      if (data.members.includes(userId)) {
        loadRooms();
      }
    };

    const handleUnreadUpdate = (data: { room_id: string; unread_count: number }) => {
      setRooms((prev) =>
        prev.map((room) =>
          room.id === data.room_id ? { ...room, unread_count: data.unread_count } : room
        )
      );
    };

    const handleGroupUpdated = (data: { room_id: string; action: string }) => {
      if (data.action === 'deleted' || data.action === 'left' || data.action === 'removed') {
        setRooms((prev) => prev.filter((room) => room.id !== data.room_id));
        if (selectedRoom?.id === data.room_id) {
          setSelectedRoom(null);
          router.push('/chat');
        }
      } else {
        loadRooms();
      }
    };

    const handleMemberAdded = (data: { room_id: string; member_ids: string[] }) => {
      if (selectedRoom?.id === data.room_id || rooms.some(r => r.id === data.room_id)) {
        loadRooms().then((updatedRooms) => {
          if (selectedRoom?.id === data.room_id && updatedRooms) {
            const updatedRoom = updatedRooms.find(r => r.id === data.room_id);
            if (updatedRoom) {
              setSelectedRoom(updatedRoom);
            }
          }
        });
      }
    };

    const handleMemberRemoved = (data: { room_id: string; member_id: string }) => {
      if (selectedRoom?.id === data.room_id || rooms.some(r => r.id === data.room_id)) {
        loadRooms().then((updatedRooms) => {
          if (selectedRoom?.id === data.room_id && updatedRooms) {
            const updatedRoom = updatedRooms.find(r => r.id === data.room_id);
            if (updatedRoom) {
              setSelectedRoom(updatedRoom);
            }
          }
        });
      }
    };

    const handleGroupAvatarUpdated = (data: { room_id: string; profile_pic: string }) => {
      setRooms((prev) =>
        prev.map((r) => (r.id === data.room_id ? { ...r, profile_pic: data.profile_pic } : r))
      );
      if (selectedRoom?.id === data.room_id) {
        setSelectedRoom({ ...selectedRoom, profile_pic: data.profile_pic });
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('group_created', handleGroupCreated);
    socket.on('dm_created', handleDMCreated);
    socket.on('unread_update', handleUnreadUpdate);
    socket.on('group_updated', handleGroupUpdated);
    socket.on('member_added', handleMemberAdded);
    socket.on('member_removed', handleMemberRemoved);
    socket.on('group_avatar_updated', handleGroupAvatarUpdated);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('group_created', handleGroupCreated);
      socket.off('dm_created', handleDMCreated);
      socket.off('unread_update', handleUnreadUpdate);
      socket.off('group_updated', handleGroupUpdated);
      socket.off('member_added', handleMemberAdded);
      socket.off('member_removed', handleMemberRemoved);
      socket.off('group_avatar_updated', handleGroupAvatarUpdated);
    };
  }, [userId, selectedRoom]);

  useEffect(() => {
    if (!userId) return;
    const socket = getSocket() ?? initSocketAuth();
    const routeIncomingOffer = (data: WebRTCSignal) => {
      if (!data || data.type !== 'offer') return;
      if (normId(data.to) !== normId(userId)) return;
      const list = roomsRef.current;
      let room = list.find((r) => r.id === data.chatRoomId);
      if (!room) {
        void loadRooms().then((updated) => {
          if (!updated?.length) return;
          const r = updated.find((x) => x.id === data.chatRoomId);
          if (r && selectedRoomRef.current?.id !== data.chatRoomId) {
            setSelectedRoom(r);
            setPendingOffer(data);
          }
        });
        return;
      }
      if (selectedRoomRef.current?.id === data.chatRoomId) {
        return;
      }
      setSelectedRoom(room);
      setPendingOffer(data);
    };
    socket.on('webrtc_signal', routeIncomingOffer);
    return () => {
      socket.off('webrtc_signal', routeIncomingOffer);
    };
  }, [userId, loadRooms]);

  const handleRoomSelect = (room: ChatRoom) => {
    const fullRoom = rooms.find(r => r.id === room.id) || room;
    setSelectedRoom(fullRoom);
    setPendingOffer(null);
    setRooms((prev) =>
      prev.map((r) => (r.id === room.id ? { ...r, unread_count: 0 } : r))
    );
  };

  const handleRoomCreated = (newRoom: ChatRoom) => {
    setRooms((prev) => [newRoom, ...prev]);
    setSelectedRoom(newRoom);
    setShowCreateGroup(false);
  };

  const handleRoomUpdated = (updatedRoom: ChatRoom) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r))
    );
    if (selectedRoom?.id === updatedRoom.id) {
      setSelectedRoom(updatedRoom);
    }
  };

  const handleGroupLeft = () => {
    setSelectedRoom(null);
    loadRooms();
  };

  const handleGroupDeleted = () => {
    setSelectedRoom(null);
    loadRooms();
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className={styles.loadingContainer}>
          <div className={styles.loader}>Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className={styles.messengerApp}>
        <ChatList
        rooms={rooms}
        selectedRoom={selectedRoom}
        onRoomSelect={handleRoomSelect}
        onCreateGroup={() => {
          if (circleId) {
            setShowCreateGroup(true);
          } else {
            setShowCreateGroup(true);
          }
        }}
        userId={userId || ''}
        userData={userData}
      />
      <ChatWindow
        room={selectedRoom}
        userId={userId || ''}
        userData={userData}
        onRoomUpdate={handleRoomUpdated}
        pendingOffer={pendingOffer}
        onPendingOfferConsumed={() => setPendingOffer(null)}
      />
      {showCreateGroup && (
        <CreateGroupModal
          isOpen={showCreateGroup}
          onClose={() => {
            setShowCreateGroup(false);
            if (!searchParams?.get('circle')) {
              setCircleId(null);
            }
          }}
          onGroupCreated={handleRoomCreated}
          userId={userId || ''}
          circleId={circleId}
        />
      )}
      </div>
    </>
  );
}

