"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/utils/socketAuth";
import styles from "./NotificationBell.module.css";

interface Notification {
  id: string;
  notification_type: string;
  message: string;
  sender: {
    id: string;
    full_name: string;
    profile_pic: string;
  } | null;
  post_id?: string;
  circle_id?: string;
  target_url?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  userId: string | null;
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;

    // Fetch existing notifications
    const fetchNotifications = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const { getAuthToken } = await import('@/utils/socketAuth');
        const token = getAuthToken();
        
        const response = await fetch(`${apiUrl}/notifications?user_id=${userId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setNotifications(data.notifications || []);
            setUnreadCount(data.notifications.filter((n: Notification) => !n.is_read).length);
            console.log(`✅ Loaded ${data.notifications.length} notifications`);
          }
        } else {
          console.error(`❌ Failed to fetch notifications: ${response.status} ${response.statusText}`);
          const errorText = await response.text();
          console.error('Error response:', errorText);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();

    // Initialize socket and setup listener
    const initializeSocketAndListener = async (): Promise<(() => void) | undefined> => {
      const { initSocketAuth, getSocket, ensureAuth } = await import('@/utils/socketAuth');
      
      // Ensure socket is initialized
      initSocketAuth();
      
      // Wait for socket to be ready
      const waitForSocket = (attempts = 0): Promise<any> => {
        return new Promise((resolve) => {
          const socket = getSocket();
          if (socket && socket.connected) {
            resolve(socket);
          } else if (attempts < 10) {
            setTimeout(() => resolve(waitForSocket(attempts + 1)), 200);
          } else {
            // Even if not connected, setup listener for when it connects
            const currentSocket = getSocket();
            if (currentSocket) {
              resolve(currentSocket);
            } else {
              resolve(null);
            }
          }
        });
      };

      const socket = await waitForSocket();
      
      if (!socket) {
        console.warn('⚠️ Socket not available for notifications');
        return;
      }

      // Setup notification listener - use a named function so we can remove it properly
      const handleNotification = (notification: Notification) => {
        console.log('🔔 New notification received:', notification);
        setNotifications(prev => {
          // Check if notification already exists (avoid duplicates)
          const exists = prev.some(n => n.id === notification.id);
          if (exists) {
            console.log('⚠️ Duplicate notification ignored:', notification.id);
            return prev;
          }
          console.log('✅ Adding new notification to list');
          return [notification, ...prev];
        });
        setUnreadCount(prev => prev + 1);
        
        // Show browser notification if permission granted
        if ('Notification' in window && window.Notification.permission === 'granted') {
          new window.Notification(notification.message, {
            icon: notification.sender?.profile_pic || '/images/default_profile.png',
            badge: '/images/logo.png'
          });
        }
      };

      // Remove any existing listeners first
      socket.off('notification', handleNotification);
      
      // Setup listener
      socket.on('notification', handleNotification);
      console.log('✅ Notification listener setup for socket:', socket.id, 'Connected:', socket.connected, 'User:', userId);

      // Also listen for connect event to re-setup listener
      const handleConnect = () => {
        console.log('✅ Socket connected, re-setting up notification listener');
        socket.off('notification', handleNotification);
        socket.on('notification', handleNotification);
      };

      socket.on('connect', handleConnect);

      // If already connected, ensure listener is set
      if (socket.connected) {
        socket.off('notification', handleNotification);
        socket.on('notification', handleNotification);
        console.log('✅ Socket already connected, listener active');
      }
      
      // Store cleanup function
      return () => {
        socket.off('notification', handleNotification);
        socket.off('connect', handleConnect);
      };
    };

    let cleanup: (() => void) | undefined;
    
    initializeSocketAndListener().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    // Request notification permission
    if ('Notification' in window && window.Notification.permission === 'default') {
      window.Notification.requestPermission();
    }

    // Cleanup
    return () => {
      if (cleanup) {
        cleanup();
      }
      const socket = getSocket();
      if (socket) {
        socket.off('notification');
        socket.off('connect');
      }
    };
  }, [userId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read && userId) {
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Call API to mark as read
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const { getAuthToken } = await import('@/utils/socketAuth');
        const token = getAuthToken();
        
        await fetch(`${apiUrl}/notifications/mark-read/${notification.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ user_id: userId })
        });
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Close dropdown first
    setShowDropdown(false);

    // Navigate to post page if post_id exists (with blurred background like dashboard)
    if (notification.post_id) {
      router.push(`/post/${notification.post_id}`);
    } else if (notification.target_url) {
      // Fallback to target_url if no post_id
      router.push(notification.target_url);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      
      await fetch(`${apiUrl}/notifications/mark-all-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId })
      });

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return 'fas fa-heart';
      case 'comment':
        return 'fas fa-comment';
      case 'ban':
        return 'fas fa-ban';
      case 'restriction':
        return 'fas fa-user-lock';
      case 'approval':
        return 'fas fa-check-circle';
      case 'rejection':
        return 'fas fa-times-circle';
      case 'post_approved':
        return 'fas fa-check';
      case 'post_removed':
        return 'fas fa-trash';
      case 'post_reported':
        return 'fas fa-flag';
      case 'unban':
        return 'fas fa-unlock';
      default:
        return 'fas fa-bell';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
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

  if (!userId) return null;

  return (
    <div className={styles.notificationContainer} ref={dropdownRef}>
      <button
        className={styles.bellButton}
        onClick={() => setShowDropdown(!showDropdown)}
        aria-label="Notifications"
      >
        <i className="fas fa-bell"></i>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className={styles.markAllRead}>
                Mark all as read
              </button>
            )}
          </div>

          <div className={styles.notificationsList}>
            {notifications.length === 0 ? (
              <div className={styles.emptyState}>
                <i className="fas fa-bell-slash"></i>
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`${styles.notificationItem} ${!notification.is_read ? styles.unread : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className={styles.notificationIcon}>
                    <i className={getNotificationIcon(notification.notification_type)}></i>
                  </div>
                  <div className={styles.notificationContent}>
                    <p className={styles.notificationMessage}>{notification.message}</p>
                    <span className={styles.notificationTime}>
                      {formatTime(notification.created_at)}
                    </span>
                  </div>
                  {!notification.is_read && <div className={styles.unreadDot}></div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

