import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/ToastContainer';
import type { ManagementData, BannedUser, RestrictedUser, Circle } from '../types';
import { getApiUrl } from '@/utils/apiUtils';

export function useCircleManagement(circleId: string) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [circle, setCircle] = useState<Circle | null>(null);
  const [managementData, setManagementData] = useState<ManagementData | null>(null);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [restrictedUsers, setRestrictedUsers] = useState<RestrictedUser[]>([]);

  const fetchManagementData = useCallback(async (uid: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/circles/manage/${circleId}?user_id=${uid}`);
      
      if (!response.ok) {
        // Don't throw error, handle gracefully
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || 'Failed to load management data' };
        }
        
        // Only redirect if it's an authorization error
        if (response.status === 403 || response.status === 401) {
          const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
          showToast(sanitizeErrorMessage(errorData.message || 'You are not authorized'), 'error');
          router.push(`/circle/${circleId}`);
          return;
        }
        
        // For other errors, just show toast but don't redirect
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        showToast(sanitizeErrorMessage(errorData.message || 'Failed to load management data'), 'error');
        return;
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Expected JSON but got:', contentType, text.substring(0, 200));
        return;
      }
      
      const { safeJson } = await import('@/utils/apiUtils');
      const data: ManagementData = await safeJson<ManagementData>(response);

      if (data.success) {
        setCircle(data.circle);
        setManagementData(data);
      } else {
        const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
        showToast(sanitizeErrorMessage(data.message || 'Failed to load management data'), 'error');
        if (data.message?.includes('authorized') || data.message?.includes('not authorized')) {
          router.push(`/circle/${circleId}`);
        }
      }
    } catch (error) {
      console.error('Error fetching management data:', error);
      const { sanitizeErrorMessage } = await import('@/utils/errorHandler');
      showToast('Failed to load management data: ' + sanitizeErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [circleId, router]);

  const fetchBannedUsers = useCallback(async (uid: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/circles/banned-users/${circleId}?user_id=${uid}`);
      
      if (!response.ok) return;
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return;
      
      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);
      if (data.success) {
        setBannedUsers(data.banned_users || []);
      }
    } catch (error) {
      console.error('Error fetching banned users:', error);
    }
  }, [circleId]);

  const fetchRestrictedUsers = useCallback(async (uid: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/circles/restricted-users/${circleId}?user_id=${uid}`);
      
      if (!response.ok) {
        setRestrictedUsers([]);
        return;
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setRestrictedUsers([]);
        return;
      }
      
      const { safeJson } = await import('@/utils/apiUtils');
      const data = await safeJson<any>(response);
      if (data.success) {
        setRestrictedUsers(data.restricted_users || []);
      } else {
        setRestrictedUsers([]);
      }
    } catch (error) {
      console.error('Error fetching restricted users:', error);
      setRestrictedUsers([]);
    }
  }, [circleId]);

  useEffect(() => {
    const loadUser = async () => {
      const { ensureAuth } = await import('@/utils/socketAuth');
      const { userId } = await ensureAuth();
      
      if (userId) {
        setUserId(userId);
        fetchManagementData(userId);
        fetchBannedUsers(userId);
        fetchRestrictedUsers(userId);
      } else {
        setLoading(false);
        router.replace('/');
      }
    };
    
    loadUser();
  }, [circleId, router, fetchManagementData, fetchBannedUsers, fetchRestrictedUsers]);

  const refreshData = useCallback(() => {
    if (userId) {
      fetchManagementData(userId);
      fetchBannedUsers(userId);
      fetchRestrictedUsers(userId);
    }
  }, [userId, fetchManagementData, fetchBannedUsers, fetchRestrictedUsers]);

  const refreshRestrictedUsers = useCallback(() => {
    if (userId) fetchRestrictedUsers(userId);
  }, [userId, fetchRestrictedUsers]);

  const refreshBannedUsers = useCallback(() => {
    if (userId) fetchBannedUsers(userId);
  }, [userId, fetchBannedUsers]);

  return {
    loading,
    userId,
    circle,
    managementData,
    bannedUsers,
    restrictedUsers,
    refreshData,
    fetchRestrictedUsers: refreshRestrictedUsers,
    fetchBannedUsers: refreshBannedUsers
  };
}

