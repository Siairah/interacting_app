import { useState } from 'react';
import { showToast } from '@/components/ToastContainer';
import { getApiUrl } from '@/utils/apiUtils';

export function usePostViewer(userId: string | null) {
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);

  const handleViewPost = async (postId: string) => {
    if (!userId) {
      showToast('Please log in to view posts', 'error');
      return;
    }

    try {
      const response = await fetch(`${getApiUrl()}/get-post/${postId}?user_id=${userId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);

      if (data.success && data.post) {
        const postForModal: any = {
          id: data.post.id,
          content: data.post.content,
          created_at: data.post.created_at,
          user: {
            id: data.post.user.id,
            email: data.post.user.email,
            full_name: data.post.user.full_name,
            profile_pic: data.post.user.profile_pic || '/images/default_profile.png'
          },
          circle: data.post.circle ? {
            id: data.post.circle.id,
            name: data.post.circle.name,
            cover_image: data.post.circle.cover_image
          } : null,
          media_files: data.post.media_files || [],
          like_count: data.post.like_count || 0,
          user_liked: data.post.user_liked || false,
          comment_count: data.post.comment_count || 0,
          recent_likers: data.post.recent_likers || [],
          comments: data.post.comments || []
        };

        setSelectedPost(postForModal);
        setShowPostModal(true);
      } else {
        showToast('Failed to load post details', 'error');
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      showToast('Failed to load post: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    }
  };

  const closeModal = () => {
    setShowPostModal(false);
    setSelectedPost(null);
  };

  return {
    selectedPost,
    showPostModal,
    handleViewPost,
    closeModal
  };
}

