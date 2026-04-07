import { getAdminToken } from "@/admin/auth";
import { getApiUrl, safeJson } from "@/utils/apiUtils";

export type AdminUserStats = {
  total_users: number;
  new_users_today: number;
  active_users: number;
  online_users: number;
};

export type AdminPostStats = {
  total_posts: number;
  posts_today: number;
  posts_yesterday: number;
  posts_with_media: number;
};

export type AdminEngagementStats = {
  total_likes: number;
  likes_today: number;
  total_comments: number;
  comments_today: number;
};

export type AdminModerationStats = {
  flagged_posts: number;
  pending_reports: number;
  reports_today: number;
};

export type AdminRecentPost = {
  id: string;
  content: string;
  createdAt: string;
  authorLabel: string;
};

export type AdminRecentReport = {
  id: string;
  reason: string;
  createdAt: string;
  reporterLabel: string;
};

export type AdminDashboardPayload = {
  user_stats: AdminUserStats;
  post_stats: AdminPostStats;
  engagement_stats: AdminEngagementStats;
  moderation_stats: AdminModerationStats;
  recent_activity: {
    latest_posts: AdminRecentPost[];
    latest_reports: AdminRecentReport[];
  };
  trend_data: {
    dates: string[];
    user_trend: number[];
    post_trend: number[];
    engagement_trend: number[];
  };
  growth_rates: {
    users: number;
    posts: number;
    engagement: number;
  };
};

type DashboardResponse =
  | ({ success: true } & AdminDashboardPayload)
  | { success: false; message?: string };

export async function fetchAdminDashboard(): Promise<AdminDashboardPayload> {
  const token = getAdminToken();
  if (!token) {
    throw new Error("Admin session expired. Log in again from the home page.");
  }

  const res = await fetch(`${getApiUrl()}/admin/dashboard-stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await safeJson(res)) as DashboardResponse;
  if (res.status === 401) {
    throw new Error("message" in data && data.message ? data.message : "Session expired. Log in again.");
  }
  if (!res.ok || !data.success) {
    const msg =
      typeof data === "object" && data && "message" in data ? String((data as { message?: string }).message) : "";
    throw new Error(msg || "Could not load dashboard stats");
  }
  return data as AdminDashboardPayload;
}
