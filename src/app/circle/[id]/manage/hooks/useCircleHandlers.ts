// Toast notifications are imported dynamically in each handler to avoid circular dependencies
import type { Circle } from '../types';
import { getApiUrl } from '@/utils/apiUtils';

export function useCircleHandlers(
  circleId: string,
  userId: string | null,
  refreshData: () => void,
  setOverlayText: (text: string | null) => void
) {
  const withOverlay = async (text: string, fn: () => Promise<void>) => {
    setOverlayText(text);
    try {
      await fn();
    } finally {
      setOverlayText(null);
    }
  };

  const handleUpdateCircle = async (updates: { name?: string; description?: string; rules?: string; visibility?: string; cover_image?: File | null; remove_cover_image?: boolean }): Promise<void> => {
    if (!userId) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast('User not authenticated', 'error');
      return;
    }

    return withOverlay('Updating circle...', async () => {
      try {
        const formData = new FormData();
        formData.append('user_id', userId);
        if (updates.name) formData.append('name', updates.name);
        if (updates.description !== undefined) formData.append('description', updates.description);
        if (updates.rules !== undefined) formData.append('rules', updates.rules);
        if (updates.visibility) formData.append('visibility', updates.visibility);
        
        // Handle cover image upload
        if (updates.cover_image) {
          formData.append('cover_image', updates.cover_image);
        }
        
        // Handle cover image removal
        if (updates.remove_cover_image) {
          formData.append('remove_cover_image', 'true');
        }

        const { getAuthToken } = await import('@/utils/socketAuth');
        const token = getAuthToken();

        const response = await fetch(`${getApiUrl()}/circles/update/${circleId}`, {
          method: 'PUT',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formData
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const { safeJson } = await import('@/utils/apiUtils');
        const data = await safeJson<any>(response);
        if (data.success) {
          const { showToast } = await import('@/components/ToastContainer');
          const message = updates.remove_cover_image 
            ? 'Banner removed successfully' 
            : updates.cover_image 
              ? 'Banner uploaded successfully' 
              : 'Circle updated successfully';
          showToast(message, 'success');
          refreshData();
        } else {
          const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
          const { showToast } = await import('@/components/ToastContainer');
          showToast(sanitizeErrorMessage(data.message || 'Failed to update circle'), 'error');
          throw new Error(data.message || 'Failed to update circle');
        }
      } catch (error) {
        console.error('Error updating circle:', error);
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        const { showToast } = await import('@/components/ToastContainer');
        const errorMsg = error instanceof Error ? error.message : 'Failed to update circle';
        showToast('Failed to update circle: ' + sanitizeErrorMessage(errorMsg), 'error');
        throw error; // Re-throw to allow component to handle it
      }
    });
  };

  const handleApproveRequest = async (requestId: string) => {
    if (!userId) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast('User not authenticated', 'error');
      return;
    }

    await withOverlay('Approving request...', async () => {
      try {
        const { getAuthToken } = await import('@/utils/socketAuth');
        const token = getAuthToken();

        const response = await fetch(`${getApiUrl()}/circles/approve-request/${requestId}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ user_id: userId })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const { safeJson } = await import('@/utils/apiUtils');
        const data = await safeJson<any>(response);
        if (data.success) {
          const { showToast } = await import('@/components/ToastContainer');
          showToast('Join request approved successfully', 'success');
          refreshData();
        } else {
          const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
          const { showToast } = await import('@/components/ToastContainer');
          showToast(sanitizeErrorMessage(data.message || 'Failed to approve request'), 'error');
        }
      } catch (error) {
        console.error('Error approving request:', error);
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        const { showToast } = await import('@/components/ToastContainer');
        showToast('Failed to approve request: ' + sanitizeErrorMessage(error), 'error');
      }
    });
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!userId) return;

    await withOverlay('Rejecting request...', async () => {
      try {
        const response = await fetch(`${getApiUrl()}/circles/reject-request/${requestId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId })
        });

        const { safeJson } = await import('@/utils/apiUtils');
        const data = await safeJson<any>(response);
        if (data.success) {
          refreshData();
        } else {
          const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
          const { showToast } = await import('@/components/ToastContainer');
          showToast(sanitizeErrorMessage(data.message || 'Failed to reject request'), 'error');
        }
      } catch (error) {
        console.error('Error rejecting request:', error);
      }
    });
  };

  const handlePromoteAdmin = async (userIdToPromote: string, adminCount: number) => {
    if (!userId) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast('User not authenticated', 'error');
      return;
    }

    if (adminCount >= 3) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast('Maximum 3 admins allowed per circle', 'warning');
      return;
    }

    await withOverlay('Promoting to admin...', async () => {
      try {
        const { getAuthToken } = await import('@/utils/socketAuth');
        const token = getAuthToken();

        const response = await fetch(`${getApiUrl()}/circles/promote-admin`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            user_id: userId,
            circle_id: circleId,
            member_id: userIdToPromote
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const { safeJson } = await import('@/utils/apiUtils');
        const data = await safeJson<any>(response);
        if (data.success) {
          const { showToast } = await import('@/components/ToastContainer');
          showToast('Member promoted to admin successfully', 'success');
          refreshData();
        } else {
          const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
          const { showToast } = await import('@/components/ToastContainer');
          showToast(sanitizeErrorMessage(data.message || 'Failed to promote member'), 'error');
        }
      } catch (error) {
        console.error('Error promoting member:', error);
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        const { showToast } = await import('@/components/ToastContainer');
        showToast('Failed to promote member: ' + sanitizeErrorMessage(error), 'error');
      }
    });
  };

  const handleRemoveAdmin = async (userIdToRemoveAdmin: string) => {
    if (!userId) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast('User not authenticated', 'error');
      return;
    }

    const { confirmDialog } = await import('@/utils/confirmDialog');
    const confirmed = await confirmDialog('Are you sure you want to remove admin privileges from this user?', 'Remove Admin', 'Cancel');
    if (!confirmed) return;

    await withOverlay('Removing admin...', async () => {
      try {
        const { getAuthToken } = await import('@/utils/socketAuth');
        const token = getAuthToken();

        const response = await fetch(`${getApiUrl()}/circles/remove-admin`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            user_id: userId,
            circle_id: circleId,
            member_id: userIdToRemoveAdmin
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData: { message?: string };
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText || 'Failed to remove admin' };
          }
          const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
          const { showToast } = await import('@/components/ToastContainer');
          showToast(sanitizeErrorMessage(errorData.message || 'Failed to remove admin'), 'error');
          return;
        }

        const { safeJson } = await import('@/utils/apiUtils');
        const data = await safeJson<any>(response);
        if (data.success) {
          const { showToast } = await import('@/components/ToastContainer');
          showToast('Admin privileges removed successfully', 'success');
          refreshData();
        } else {
          const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
          const { showToast } = await import('@/components/ToastContainer');
          showToast(sanitizeErrorMessage(data.message || 'Failed to remove admin'), 'error');
        }
      } catch (error) {
        console.error('Error removing admin:', error);
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        const { showToast } = await import('@/components/ToastContainer');
        showToast('Failed to remove admin: ' + sanitizeErrorMessage(error), 'error');
      }
    });
  };

  const handleRemoveMember = async (userIdToRemove: string) => {
    if (!userId) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast('User not authenticated', 'error');
      return;
    }

    const { confirmDialog } = await import('@/utils/confirmDialog');
    const confirmed = await confirmDialog('Are you sure you want to remove this member from the circle?', 'Remove', 'Cancel', 'danger');
    if (!confirmed) return;

    await withOverlay('Removing member...', async () => {
      try {
        const { getAuthToken } = await import('@/utils/socketAuth');
        const token = getAuthToken();

        const response = await fetch(`${getApiUrl()}/circles/remove-member`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            user_id: userId,
            circle_id: circleId,
            member_id: userIdToRemove
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const { safeJson } = await import('@/utils/apiUtils');
        const data = await safeJson<any>(response);
        if (data.success) {
          const { showToast } = await import('@/components/ToastContainer');
          showToast('Member removed successfully', 'success');
          refreshData();
        } else {
          const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
          const { showToast } = await import('@/components/ToastContainer');
          showToast(sanitizeErrorMessage(data.message || 'Failed to remove member'), 'error');
        }
      } catch (error) {
        console.error('Error removing member:', error);
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        const { showToast } = await import('@/components/ToastContainer');
        showToast('Failed to remove member: ' + sanitizeErrorMessage(error), 'error');
      }
    });
  };

  const handleRestrictUser = async (userIdToRestrict: string, memberName: string) => {
    if (!userId) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast('User not authenticated', 'error');
      return;
    }
    
    const { confirmDialog } = await import('@/utils/confirmDialog');
    const confirmed = await confirmDialog(
      `Restrict ${memberName || 'this user'} for 7 days?`,
      'Restrict',
      'Cancel'
    );
    if (!confirmed) return;

    await withOverlay('Restricting user...', async () => {
      try {
        const { getAuthToken } = await import('@/utils/socketAuth');
        const token = getAuthToken();

        const response = await fetch(`${getApiUrl()}/circles/restrict-user`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            user_id: userId,
            circle_id: circleId,
            target_user_id: userIdToRestrict,
            days: 7,
            reason: 'Violated community guidelines'
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText || 'Failed to restrict user' };
          }
          const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
          const { showToast } = await import('@/components/ToastContainer');
          showToast(sanitizeErrorMessage(errorData.message || 'Failed to restrict user'), 'error');
          return;
        }

        const { safeJson } = await import('@/utils/apiUtils');
        const data = await safeJson<any>(response);
        if (data.success) {
          const { showToast } = await import('@/components/ToastContainer');
          showToast('User restricted for 7 days', 'success');
          refreshData();
        } else {
          const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
          const { showToast } = await import('@/components/ToastContainer');
          showToast(sanitizeErrorMessage(data.message || 'Failed to restrict user'), 'error');
        }
      } catch (error) {
        console.error('Error restricting user:', error);
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        const { showToast } = await import('@/components/ToastContainer');
        showToast('Failed to restrict user: ' + sanitizeErrorMessage(error), 'error');
      }
    });
  };

  const handleBanUser = async (userIdToBan: string, memberName: string) => {
    if (!userId) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast('User not authenticated', 'error');
      return;
    }
    
    const { confirmDialog } = await import('@/utils/confirmDialog');
    const confirmed = await confirmDialog(
      `Permanently ban ${memberName || 'this user'} from the circle?`,
      'Ban',
      'Cancel',
      'danger'
    );
    if (!confirmed) return;

    await withOverlay('Banning user...', async () => {
      try {
        const { getAuthToken } = await import('@/utils/socketAuth');
        const token = getAuthToken();

        const response = await fetch(`${getApiUrl()}/circles/ban-user`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            user_id: userId,
            circle_id: circleId,
            target_user_id: userIdToBan,
            reason: 'Violated community guidelines'
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText || 'Failed to ban user' };
          }
          const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
          const { showToast } = await import('@/components/ToastContainer');
          showToast(sanitizeErrorMessage(errorData.message || 'Failed to ban user'), 'error');
          return;
        }

        const { safeJson } = await import('@/utils/apiUtils');
        const data = await safeJson<any>(response);
        if (data.success) {
          const { showToast } = await import('@/components/ToastContainer');
          showToast('User banned successfully', 'success');
          // Refresh data after a short delay to ensure backend has processed
          setTimeout(() => {
            refreshData();
          }, 500);
        } else {
          const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
          const { showToast } = await import('@/components/ToastContainer');
          showToast(sanitizeErrorMessage(data.message || 'Failed to ban user'), 'error');
        }
      } catch (error) {
        console.error('Error banning user:', error);
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        const { showToast } = await import('@/components/ToastContainer');
        showToast('Failed to ban user: ' + sanitizeErrorMessage(error), 'error');
      }
    });
  };

  const handleUnrestrictUser = async (restrictedUserId: string, userName: string, fetchRestrictedUsers: () => void) => {
    if (!userId) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast('User not authenticated', 'error');
      return;
    }

    const { confirmDialog } = await import('@/utils/confirmDialog');
    const confirmed = await confirmDialog(
      `Remove restriction for ${userName}? They will regain access to this circle immediately.`,
      'Remove Restriction',
      'Cancel'
    );
    if (!confirmed) return;

    await withOverlay('Removing restriction...', async () => {
      try {
        const { getAuthToken } = await import('@/utils/socketAuth');
        const token = getAuthToken();

        const response = await fetch(`${getApiUrl()}/circles/unrestrict-user`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            user_id: userId,
            circle_id: circleId,
            target_user_id: restrictedUserId
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText || 'Failed to remove restriction' };
          }
          
          // If restriction not found (404), it might have already expired - refresh and show success
          if (response.status === 404) {
            const { showToast } = await import('@/components/ToastContainer');
            showToast(`Restriction for ${userName} has already been removed or expired.`, 'success');
            fetchRestrictedUsers();
            refreshData();
            return;
          }
          
          const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
          const { showToast } = await import('@/components/ToastContainer');
          showToast(sanitizeErrorMessage(errorData.message || 'Failed to remove restriction'), 'error');
          return;
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 200)}`);
        }

        const { safeJson } = await import('@/utils/apiUtils');
        const data = await safeJson<any>(response);
        if (data.success) {
          const { showToast } = await import('@/components/ToastContainer');
          showToast(`${userName}'s restriction has been removed. They can now access the circle.`, 'success');
          fetchRestrictedUsers();
          refreshData();
        } else {
          const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
          const { showToast } = await import('@/components/ToastContainer');
          showToast(sanitizeErrorMessage(data.message || 'Failed to remove restriction'), 'error');
        }
      } catch (error) {
        console.error('Error removing restriction:', error);
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        const { showToast } = await import('@/components/ToastContainer');
        showToast('Failed to remove restriction: ' + sanitizeErrorMessage(error), 'error');
      }
    });
  };

  const handleUnbanUser = async (targetUserId: string, fetchBannedUsers?: () => void, fetchRestrictedUsers?: () => void) => {
    if (!userId) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast('User not authenticated', 'error');
      return;
    }

    const { confirmDialog } = await import('@/utils/confirmDialog');
    const confirmed = await confirmDialog('Are you sure you want to unban this user?', 'Unban', 'Cancel');
    if (!confirmed) return;

    await withOverlay('Unbanning user...', async () => {
      try {
        const { getAuthToken } = await import('@/utils/socketAuth');
        const token = getAuthToken();

        const response = await fetch(`${getApiUrl()}/circles/unban-user`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            user_id: userId,
            circle_id: circleId,
            target_user_id: targetUserId
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText || 'Failed to unban user' };
          }
          const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
          const { showToast } = await import('@/components/ToastContainer');
          showToast(sanitizeErrorMessage(errorData.message || 'Failed to unban user'), 'error');
          return;
        }

        const { safeJson } = await import('@/utils/apiUtils');
        const data = await safeJson<any>(response);
        if (data.success) {
          const { showToast } = await import('@/components/ToastContainer');
          showToast('User unbanned successfully', 'success');
          if (fetchBannedUsers) fetchBannedUsers();
          if (fetchRestrictedUsers) fetchRestrictedUsers();
          // Refresh data after a short delay to ensure backend has processed
          setTimeout(() => {
            refreshData();
          }, 500);
        } else {
          const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
          const { showToast } = await import('@/components/ToastContainer');
          showToast(sanitizeErrorMessage(data.message || 'Failed to unban user'), 'error');
        }
      } catch (error) {
        console.error('Error unbanning user:', error);
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        const { showToast } = await import('@/components/ToastContainer');
        showToast('Failed to unban user: ' + sanitizeErrorMessage(error), 'error');
      }
    });
  };

  const handleApprovePost = async (postId: string) => {
    if (!userId) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast('User not authenticated', 'error');
      return;
    }

    await withOverlay('Approving post...', async () => {
      try {
        const { getAuthToken } = await import('@/utils/socketAuth');
        const token = getAuthToken();

        const response = await fetch(`${getApiUrl()}/circles/approve-post/${postId}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ user_id: userId })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const { safeJson } = await import('@/utils/apiUtils');
        const data = await safeJson<any>(response);
        if (data.success) {
          const { showToast } = await import('@/components/ToastContainer');
          showToast('Post approved successfully', 'success');
          refreshData();
        } else {
          const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
          const { showToast } = await import('@/components/ToastContainer');
          showToast(sanitizeErrorMessage(data.message || 'Failed to approve post'), 'error');
        }
      } catch (error) {
        console.error('Error approving post:', error);
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        const { showToast } = await import('@/components/ToastContainer');
        showToast('Failed to approve post: ' + sanitizeErrorMessage(error), 'error');
      }
    });
  };

  const handleRejectPost = async (postId: string) => {
    if (!userId) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast('User not authenticated', 'error');
      return;
    }

    const { confirmDialog } = await import('@/utils/confirmDialog');
    const confirmed = await confirmDialog('Are you sure you want to reject this post?', 'Reject', 'Cancel', 'danger');
    if (!confirmed) return;

    await withOverlay('Rejecting post...', async () => {
      try {
        const { getAuthToken } = await import('@/utils/socketAuth');
        const token = getAuthToken();

        const response = await fetch(`${getApiUrl()}/circles/reject-post/${postId}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ user_id: userId })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const { safeJson } = await import('@/utils/apiUtils');
        const data = await safeJson<any>(response);
        if (data.success) {
          const { showToast } = await import('@/components/ToastContainer');
          showToast('Post rejected successfully', 'success');
          refreshData();
        } else {
          const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
          const { showToast } = await import('@/components/ToastContainer');
          showToast(sanitizeErrorMessage(data.message || 'Failed to reject post'), 'error');
        }
      } catch (error) {
        console.error('Error rejecting post:', error);
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        const { showToast } = await import('@/components/ToastContainer');
        showToast('Failed to reject post: ' + sanitizeErrorMessage(error), 'error');
      }
    });
  };

  const handleApproveFlaggedPost = async (moderationId: string) => {
    if (!userId) {
      const { showToast } = await import('@/components/ToastContainer');
      showToast('User not authenticated', 'error');
      return;
    }

    await withOverlay('Approving flagged post...', async () => {
      try {
        const { getAuthToken } = await import('@/utils/socketAuth');
        const token = getAuthToken();

        const response = await fetch(`${getApiUrl()}/circles/approve-flagged/${moderationId}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ user_id: userId })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const { safeJson } = await import('@/utils/apiUtils');
        const data = await safeJson<any>(response);
        if (data.success) {
          const { showToast } = await import('@/components/ToastContainer');
          showToast('Flagged post approved successfully', 'success');
          refreshData();
        } else {
          const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
          const { showToast } = await import('@/components/ToastContainer');
          showToast(sanitizeErrorMessage(data.message || 'Failed to approve flagged post'), 'error');
        }
      } catch (error) {
        console.error('Error approving flagged post:', error);
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        const { showToast } = await import('@/components/ToastContainer');
        showToast('Failed to approve flagged post: ' + sanitizeErrorMessage(error), 'error');
      }
    });
  };

  const handleRejectFlaggedPost = async (moderationId: string) => {
    if (!userId) return;

    const { confirmDialog } = await import('@/utils/confirmDialog');
    const confirmed = await confirmDialog('Are you sure you want to reject this flagged post? It will be deleted.', 'Reject', 'Cancel', 'danger');
    if (!confirmed) return;

    await withOverlay('Rejecting flagged post...', async () => {
      try {
        const response = await fetch(`${getApiUrl()}/circles/reject-flagged/${moderationId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId })
        });

        const { safeJson } = await import('@/utils/apiUtils');
        const data = await safeJson<any>(response);
        if (data.success) {
          const { showToast } = await import('@/components/ToastContainer');
          showToast('Flagged post rejected and deleted', 'success');
          refreshData();
        } else {
          const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
          const { showToast } = await import('@/components/ToastContainer');
          showToast(sanitizeErrorMessage(data.message || 'Failed to reject flagged post'), 'error');
        }
      } catch (error) {
        console.error('Error rejecting flagged post:', error);
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        const { showToast } = await import('@/components/ToastContainer');
        showToast('Failed to reject flagged post: ' + sanitizeErrorMessage(error), 'error');
      }
    });
  };

  return {
    handleUpdateCircle,
    handleApproveRequest,
    handleRejectRequest,
    handlePromoteAdmin,
    handleRemoveAdmin,
    handleRemoveMember,
    handleRestrictUser,
    handleBanUser,
    handleUnrestrictUser,
    handleUnbanUser,
    handleApprovePost,
    handleRejectPost,
    handleApproveFlaggedPost,
    handleRejectFlaggedPost
  };
}

