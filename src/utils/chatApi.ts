import { safeJson, getApiUrl, getApiErrorMessage } from './apiUtils';

export interface ChatRoom {
  id: string;
  is_group: boolean;
  name: string;
  circle?: { id: string; name: string } | null;
  members: Array<{ id: string; email: string; full_name?: string; profile_pic?: string }>;
  member_count: number;
  last_message?: {
    content: string;
    sender: { id: string; email: string; full_name?: string; profile_pic?: string };
    timestamp: string;
  } | null;
  unread_count: number;
  created_at: string;
  display_name?: string;
  profile_pic?: string;
  is_online?: boolean;
  created_by?: string;
}

export interface ChatMessage {
  id: string;
  room: string;
  sender: { id: string; email: string; full_name?: string; profile_pic?: string };
  content: string;
  message_type: 'text' | 'media' | 'call_log';
  media?: string | null;
  reply_to?: ChatMessage | null;
  timestamp: string;
  seen_by: string[];
  is_deleted_for_everyone: boolean;
  deleted_by?: string[]; // Users who deleted this message for themselves
  call_status?: 'missed' | 'answered' | 'declined' | 'cancelled' | null;
  call_duration?: number | null;
}

export async function getChatRooms(userId: string, circleId?: string): Promise<ChatRoom[]> {
  try {
    const url = circleId 
      ? `${getApiUrl()}/chat/get-rooms?user_id=${userId}&circle_id=${circleId}`
      : `${getApiUrl()}/chat/get-rooms?user_id=${userId}`;
    
    const res = await fetch(url);
    const data = await safeJson<any>(res);
    
    if (data.success && data.rooms) {
      const rooms = data.rooms.map((room: any) => ({
        ...room,
        created_by: room.created_by || null
      }));
      console.log('📦 Fetched rooms with created_by:', rooms.map((r: ChatRoom) => ({ 
        id: r.id, 
        name: r.name, 
        created_by: r.created_by 
      })));
      return rooms;
    }
    return [];
  } catch {
    return [];
  }
}

export async function getChatMessages(roomId: string, userId: string, limit: number = 50): Promise<ChatMessage[]> {
  try {
    const res = await fetch(`${getApiUrl()}/chat/get-messages?room_id=${roomId}&user_id=${userId}&limit=${limit}`);
    const data = await safeJson<any>(res);
    
    if (data.success && data.messages) {
      // Format messages properly and filter out messages deleted by this user
      return data.messages
        .filter((msg: any) => {
          // Filter out messages deleted by this user (unless deleted for everyone)
          if (msg.deleted_by && Array.isArray(msg.deleted_by) && msg.deleted_by.includes(userId)) {
            return false;
          }
          return true;
        })
        .map((msg: any) => ({
          id: msg.id || msg._id,
          room: msg.room || roomId,
          sender: typeof msg.sender === 'string' ? { id: msg.sender, email: '' } : {
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
        }));
    }
    return [];
  } catch {
    return [];
  }
}

export async function sendMessage(
  roomId: string,
  senderId: string,
  content: string,
  messageType: 'text' | 'media' = 'text',
  media?: File,
  replyTo?: string
): Promise<{ success: boolean; message?: ChatMessage; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('room_id', roomId);
    formData.append('sender_id', senderId);
    formData.append('content', content);
    formData.append('message_type', messageType);
    if (media) {
      formData.append('media', media);
    }
    if (replyTo) {
      formData.append('reply_to', replyTo);
    }

    const res = await fetch(`${getApiUrl()}/chat/send-message`, {
      method: 'POST',
      body: formData,
    });

    const data = await safeJson<any>(res);
    return data;
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error, 'Failed to send message') };
  }
}

export async function deleteMessage(
  messageId: string,
  userId: string,
  deleteForEveryone: boolean = false
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${getApiUrl()}/chat/delete-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_id: messageId,
        user_id: userId,
        delete_for_everyone: deleteForEveryone,
      }),
    });

    const data = await safeJson<any>(res);
    return data;
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error, 'Failed to delete message') };
  }
}

export async function removeGroupMember(
  roomId: string,
  userId: string,
  memberId: string
): Promise<{ success: boolean; room?: ChatRoom; message?: string }> {
  try {
    const res = await fetch(`${getApiUrl()}/chat/remove-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        user_id: userId,
        member_id: memberId,
      }),
    });

    const data = await safeJson<any>(res);
    return data;
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error, 'Failed to remove member') };
  }
}

export async function leaveGroup(
  roomId: string,
  userId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${getApiUrl()}/chat/leave-group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        user_id: userId,
      }),
    });

    const data = await safeJson<any>(res);
    return data;
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error, 'Failed to leave group') };
  }
}

export async function addGroupMembers(
  roomId: string,
  userId: string,
  memberIds: string[]
): Promise<{ success: boolean; room?: ChatRoom; message?: string }> {
  try {
    const res = await fetch(`${getApiUrl()}/chat/add-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        user_id: userId,
        member_ids: memberIds,
      }),
    });

    const data = await safeJson<any>(res);
    return data;
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error, 'Failed to add members') };
  }
}

export async function deleteGroup(
  roomId: string,
  userId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${getApiUrl()}/chat/delete-group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        user_id: userId,
      }),
    });

    const data = await safeJson<any>(res);
    return data;
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error, 'Failed to delete group') };
  }
}

export async function createDM(user1Id: string, user2Id: string): Promise<{ success: boolean; room?: ChatRoom; error?: string }> {
  try {
    const res = await fetch(`${getApiUrl()}/chat/create-dm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user1_id: user1Id,
        user2_id: user2Id,
      }),
    });

    const data = await safeJson<any>(res);
    return data;
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error, 'Failed to create DM') };
  }
}

export async function createGroupInCircle(
  circleId: string,
  name: string,
  createdBy: string,
  memberIds: string[]
): Promise<{ success: boolean; room?: ChatRoom; error?: string; message?: string }> {
  try {
    const res = await fetch(`${getApiUrl()}/chat/create-group-in-circle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        circle_id: circleId,
        name,
        created_by: createdBy,
        member_ids: memberIds,
      }),
    });

    const data = await safeJson<any>(res);
    if (!data.success) {
      return { 
        success: false, 
        error: data.message || 'Failed to create group',
        message: data.message 
      };
    }
    // Ensure room has all required fields
    if (data.room) {
      data.room.created_by = data.room.created_by || createdBy;
    }
    return data;
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error, 'Failed to create group') };
  }
}

export async function getCircleMembers(circleId: string, userId: string): Promise<Array<{ id: string; email: string; full_name: string; profile_pic: string }>> {
  try {
    const { getAuthToken } = await import('@/utils/socketAuth');
    const token = getAuthToken();
    
    const url = `${getApiUrl()}/chat/get-circle-members?circle_id=${circleId}&user_id=${userId}`;
    console.log('Fetching circle members from:', url);
    
    const res = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    if (!res.ok) {
      let errorData: any = {};
      try {
        errorData = await safeJson<any>(res);
      } catch {
        // Response was HTML or invalid JSON
      }
      const errorMessage = errorData.message || `Server error: ${res.status} ${res.statusText}`;
      console.error('Failed to fetch circle members:', res.status, res.statusText, errorMessage);
      throw new Error(errorMessage);
    }
    
    const data = await safeJson<any>(res);
    console.log('Circle members response:', data);
    
    if (data.success && data.members) {
      // Ensure all members have required fields
      const formattedMembers = data.members.map((member: any) => ({
        id: member.id || member._id || '',
        email: member.email || '',
        full_name: member.full_name || member.email || 'Unknown User',
        profile_pic: member.profile_pic || '/images/default_profile.png'
      })).filter((m: any) => m.id && m.email); // Filter out any invalid members
      
      console.log(`Formatted ${formattedMembers.length} members`);
      return formattedMembers;
    }
    
    console.warn('No members returned from API:', data);
    return [];
  } catch (error) {
    console.error('Error fetching circle members:', error);
    // Re-throw the error so the component can handle it
    throw error;
  }
}

export async function markMessagesAsSeen(roomId: string, userId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${getApiUrl()}/chat/mark-messages-seen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        user_id: userId,
      }),
    });

    const data = await safeJson<any>(res);
    return data;
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error, 'Failed to mark messages as seen') };
  }
}

export async function updateGroupAvatar(
  roomId: string,
  userId: string,
  avatarFile: File
): Promise<{ success: boolean; profile_pic?: string; message?: string }> {
  try {
    const formData = new FormData();
    formData.append('room_id', roomId);
    formData.append('user_id', userId);
    formData.append('avatar', avatarFile);

    const res = await fetch(`${getApiUrl()}/chat/update-group-avatar`, {
      method: 'POST',
      body: formData,
    });

    const data = await safeJson<any>(res);
    return data;
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error, 'Failed to update group avatar') };
  }
}

