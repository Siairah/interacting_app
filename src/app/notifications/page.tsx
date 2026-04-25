"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { formatNotificationTime, getNotificationIcon } from "@/utils/notificationHelpers";
import styles from "./notifications.module.css";

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

export default function NotificationsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async (uid: string) => {
    try {
      const { getApiUrl } = await import("@/utils/apiUtils");
      const { getAuthToken } = await import("@/utils/socketAuth");
      const token = getAuthToken();
      const response = await fetch(`${getApiUrl()}/notifications?user_id=${uid}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) return;
      const { safeJson } = await import("@/utils/apiUtils");
      const data = await safeJson<{ success?: boolean; notifications?: Notification[] }>(response);
      if (data.success && data.notifications) {
        setNotifications(data.notifications);
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const { ensureAuth } = await import("@/utils/socketAuth");
      const { token, userId: uid, userData } = await ensureAuth();
      if (!token || !uid) {
        router.replace("/");
        return;
      }
      const id = userData?.id || userData?._id || uid;
      setUserId(typeof id === "string" ? id : String(id));
      await fetchNotifications(typeof id === "string" ? id : String(id));
    };
    load();
  }, [router, fetchNotifications]);

  const markAllAsRead = async () => {
    if (!userId) return;
    try {
      const { getApiUrl } = await import("@/utils/apiUtils");
      const { getAuthToken } = await import("@/utils/socketAuth");
      const token = getAuthToken();
      await fetch(`${getApiUrl()}/notifications/mark-all-read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ user_id: userId }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      /* ignore */
    }
  };

  const handleItemClick = async (notification: Notification) => {
    if (!notification.is_read && userId) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      try {
        const { getApiUrl } = await import("@/utils/apiUtils");
        const { getAuthToken } = await import("@/utils/socketAuth");
        const token = getAuthToken();
        await fetch(`${getApiUrl()}/notifications/mark-read/${notification.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ user_id: userId }),
        });
      } catch {
        /* ignore */
      }
    }

    if (notification.target_url) {
      router.push(notification.target_url);
    } else if (notification.post_id) {
      router.push(`/post/${notification.post_id}`);
    } else if (notification.circle_id) {
      router.push(`/circle/${notification.circle_id}`);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <Navigation />
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading notifications…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <Navigation />
      <main className={styles.container}>
        <h1 className={styles.pageTitle}>
          <i className="fas fa-bell" aria-hidden />
          Notifications
        </h1>
        <p className={styles.subtitle}>
          {notifications.length === 0
            ? "No activity yet."
            : `${notifications.length} notification${notifications.length === 1 ? "" : "s"}${
                unreadCount > 0 ? ` · ${unreadCount} unread` : ""
              }`}
        </p>

        {notifications.length > 0 && (
          <div className={styles.toolbar}>
            <button
              type="button"
              className={styles.markAllBtn}
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark all as read
            </button>
          </div>
        )}

        {notifications.length === 0 ? (
          <div className={styles.empty}>
            <i className="fas fa-bell-slash" aria-hidden />
            <p>No notifications</p>
          </div>
        ) : (
          <div className={styles.list}>
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`${styles.item} ${!n.is_read ? styles.itemUnread : ""}`}
                onClick={() => handleItemClick(n)}
              >
                <div className={styles.iconWrap}>
                  <i className={getNotificationIcon(n.notification_type)} aria-hidden />
                </div>
                <div className={styles.body}>
                  <p className={styles.message}>{n.message}</p>
                  <span className={styles.time}>{formatNotificationTime(n.created_at)}</span>
                </div>
                {!n.is_read && <span className={styles.dot} aria-hidden />}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
