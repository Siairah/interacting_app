"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSocket } from "@/utils/socketAuth";
import { formatNotificationTime, getNotificationIcon } from "@/utils/notificationHelpers";
import styles from "./NotificationBell.module.css";

const MOBILE_NAV_MQ = "(max-width: 768px)";

function useMobileBottomNav(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_NAV_MQ);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}

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
  const pathname = usePathname();
  const isMobileNav = useMobileBottomNav();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMobileNav) setShowDropdown(false);
  }, [isMobileNav]);

  useEffect(() => {
    if (!userId) return;

    // Fetch existing notifications
    const fetchNotifications = async () => {
      try {
        const { getApiUrl } = await import('@/utils/apiUtils');
        const { getAuthToken } = await import('@/utils/socketAuth');
        const token = getAuthToken();
        
        const response = await fetch(`${getApiUrl()}/notifications?user_id=${userId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (response.ok) {
          const { safeJson } = await import('@/utils/apiUtils');
          const data = await safeJson<any>(response);
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
      const { initSocketAuth, getSocket } = await import('@/utils/socketAuth');
      
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
          const exists = prev.some(n => n.id === notification.id);
          if (exists) {
            console.log('⚠️ Duplicate notification ignored:', notification.id);
            return prev;
          }
          return [notification, ...prev];
        });
        setUnreadCount(prev => prev + 1);

        // Show toast notification (always visible in-app)
        import('@/components/ToastContainer').then(({ showToast }) => {
          const type = notification.notification_type === 'warning' ? 'warning' : 'info';
          showToast(notification.message, type, 5000);
        });

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
        const { getApiUrl } = await import('@/utils/apiUtils');
        const { getAuthToken } = await import('@/utils/socketAuth');
        const token = getAuthToken();
        
        await fetch(`${getApiUrl()}/notifications/mark-read/${notification.id}`, {
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

    // Navigate based on notification type and available URLs
    if (notification.target_url) {
      // Use target_url if available (for flagged posts, it goes to manage page)
      router.push(notification.target_url);
    } else if (notification.post_id) {
      // Navigate to post page if post_id exists
      router.push(`/post/${notification.post_id}`);
    } else if (notification.circle_id) {
      // Fallback to circle page if circle_id exists
      router.push(`/circle/${notification.circle_id}`);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    
    try {
      const { getApiUrl } = await import('@/utils/apiUtils');
      const { getAuthToken } = await import('@/utils/socketAuth');
      const token = getAuthToken();
      
      await fetch(`${getApiUrl()}/notifications/mark-all-read`, {
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

  if (!userId) return null;

  const openNotifications = () => {
    if (isMobileNav) {
      if (pathname !== "/notifications") {
        router.push("/notifications");
      }
      return;
    }
    setShowDropdown((v) => !v);
  };

  return (
    <div className={styles.notificationContainer} ref={dropdownRef}>
      <button
        type="button"
        className={styles.bellButton}
        onClick={openNotifications}
        aria-label="Notifications"
        aria-expanded={isMobileNav ? undefined : showDropdown}
      >
        <i className="fas fa-bell"></i>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {showDropdown && !isMobileNav && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <div className={styles.dropdownHeaderRow}>
              <h3>Notifications</h3>
              <Link
                href="/notifications"
                className={styles.viewAllLink}
                onClick={() => setShowDropdown(false)}
              >
                View all
              </Link>
            </div>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllAsRead} className={styles.markAllRead}>
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
                      {formatNotificationTime(notification.created_at)}
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

