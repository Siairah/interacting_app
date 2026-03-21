"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import styles from "./events.module.css";

interface DashboardEvent {
  id: string;
  title: string;
  event_date: string;
  location?: string;
  reserve_count: number;
  user_has_reserved: boolean;
  circle_id: string;
  circle_name: string;
}

export default function EventsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [reservingEventId, setReservingEventId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { ensureAuth } = await import("@/utils/socketAuth");
      const { token, userId, userData } = await ensureAuth();
      if (!token || !userId) {
        router.replace("/");
        return;
      }
      if (userData) {
        setUser({ id: userData.id || userData._id });
        fetchEvents(userId);
      }
    };
    load();
  }, [router]);

  async function fetchEvents(userId: string) {
    setLoading(true);
    try {
      const { getApiUrl } = await import("@/utils/apiUtils");
      const { getAuthToken } = await import("@/utils/socketAuth");
      const token = getAuthToken();
      const res = await fetch(`${getApiUrl()}/events/dashboard?user_id=${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const { safeJson } = await import("@/utils/apiUtils");
      const data = await safeJson<{ success: boolean; events?: DashboardEvent[] }>(res);
      if (data.success && data.events) setEvents(data.events);
      else setEvents([]);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleReserve(eventId: string) {
    if (!user?.id) return;
    setReservingEventId(eventId);
    try {
      const { getApiUrl } = await import("@/utils/apiUtils");
      const { getAuthToken } = await import("@/utils/socketAuth");
      const token = getAuthToken();
      const res = await fetch(`${getApiUrl()}/events/${eventId}/reserve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ user_id: user.id }),
      });
      const { safeJson } = await import("@/utils/apiUtils");
      const data = await safeJson<any>(res);
      if (data.success) {
        fetchEvents(user.id);
        const { showToast } = await import("@/components/ToastContainer");
        showToast("Reserved!", "success");
      } else {
        const { sanitizeErrorMessage } = await import("@/utils/errorHandler");
        const { showToast } = await import("@/components/ToastContainer");
        showToast(sanitizeErrorMessage(data.message || "Failed to reserve"), "error");
      }
    } catch (err) {
      const { sanitizeErrorMessage } = await import("@/utils/errorHandler");
      const { showToast } = await import("@/components/ToastContainer");
      showToast("Failed to reserve: " + sanitizeErrorMessage(err), "error");
    } finally {
      setReservingEventId(null);
    }
  }

  function formatEventDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className={styles.pageWrapper}>
      <Navigation />
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>
          <i className="fas fa-calendar-alt"></i> Upcoming Events
        </h1>
        <p className={styles.subtitle}>
          Events from your communities. Join a community to see its events.
        </p>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading events...</p>
          </div>
        ) : events.length > 0 ? (
          <div className={styles.eventsGrid}>
            {events.map((ev) => (
              <div key={ev.id} className={styles.eventCard}>
                <Link href={`/circle/${ev.circle_id}?tab=events`} className={styles.eventCardLink}>
                  <h3 className={styles.eventTitle}>{ev.title}</h3>
                  <p className={styles.eventMeta}>
                    {formatEventDate(ev.event_date)}
                    {ev.location ? ` • ${ev.location}` : ""}
                  </p>
                  <span className={styles.circleName}>{ev.circle_name}</span>
                </Link>
                <div className={styles.eventActions}>
                  <span className={styles.reserveCount}>
                    <i className="fas fa-user-check"></i> {ev.reserve_count} reserved
                  </span>
                  {ev.user_has_reserved ? (
                    <span className={styles.reservedBadge}>
                      <i className="fas fa-check"></i> Reserved
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={styles.btnRsvp}
                      disabled={reservingEventId === ev.id}
                      onClick={() => handleReserve(ev.id)}
                    >
                      {reservingEventId === ev.id ? "..." : "RSVP"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <i className="fas fa-calendar-times"></i>
            <h3>No Upcoming Events</h3>
            <p>Join communities to see and reserve events.</p>
            <Link href="/circles" className={styles.exploreBtn}>
              <i className="fas fa-users"></i> Explore Communities
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
