import { getAdminToken } from "@/admin/auth";
import { getApiUrl, safeJson } from "@/utils/apiUtils";

function buildHeaders(init?: RequestInit): HeadersInit {
  const token = getAdminToken();
  if (!token) throw new Error("Admin session required");
  const h: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (init?.body != null && String(init.body).length > 0) {
    h["Content-Type"] = "application/json";
  }
  return h;
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers: { ...buildHeaders(init), ...(init?.headers as Record<string, string>) },
  });
  return safeJson<T>(res);
}

export type Pagination = { page: number; limit: number; total: number; pages: number };

export async function adminListUsers(params: {
  page?: number;
  search?: string;
  status?: string;
  date_from?: string;
}) {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.search) q.set("search", params.search);
  if (params.status) q.set("status", params.status);
  if (params.date_from) q.set("date_from", params.date_from);
  return adminFetch<{
    success: boolean;
    items: {
      id: string;
      email: string;
      phone: string;
      isActive: boolean;
      createdAt: string;
    }[];
    pagination: Pagination;
    stats: { total_users: number; active_users: number; new_users_30d: number; online_users: number };
  }>(`/admin/users?${q}`);
}

export async function adminToggleUser(id: string) {
  return adminFetch<{ success: boolean; isActive: boolean }>(`/admin/users/${id}/toggle-active`, {
    method: "PATCH",
  });
}

export async function adminUsersBulk(ids: string[], action: "activate" | "deactivate") {
  return adminFetch<{ success: boolean; modified: number }>(`/admin/users/bulk`, {
    method: "POST",
    body: JSON.stringify({ ids, action }),
  });
}

export async function adminListPosts(params: {
  page?: number;
  search?: string;
  circle_id?: string;
  has_media?: string;
  date_from?: string;
}) {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.search) q.set("search", params.search);
  if (params.circle_id) q.set("circle_id", params.circle_id);
  if (params.has_media) q.set("has_media", params.has_media);
  if (params.date_from) q.set("date_from", params.date_from);
  return adminFetch<{
    success: boolean;
    items: {
      id: string;
      content: string;
      is_public: boolean;
      createdAt: string;
      authorEmail: string;
      circleName: string;
      mediaCount: number;
      commentsCount: number;
      likesCount: number;
    }[];
    pagination: Pagination;
    stats: { total_posts: number; posts_today: number; total_comments: number; total_likes: number };
  }>(`/admin/posts?${q}`);
}

export async function adminDeletePost(id: string) {
  return adminFetch<{ success: boolean }>(`/admin/posts/${id}`, { method: "DELETE" });
}

export async function adminPostsBulk(ids: string[], action: "delete" | "hide" | "show") {
  return adminFetch<{ success: boolean; deleted?: number; modified?: number }>(`/admin/posts/bulk`, {
    method: "POST",
    body: JSON.stringify({ ids, action }),
  });
}

export async function adminListComments(params: {
  page?: number;
  search?: string;
  post_id?: string;
  include_deleted?: boolean;
}) {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.search) q.set("search", params.search);
  if (params.post_id) q.set("post_id", params.post_id);
  if (params.include_deleted) q.set("include_deleted", "true");
  return adminFetch<{
    success: boolean;
    items: {
      id: string;
      content: string;
      is_deleted?: boolean;
      createdAt: string;
      authorEmail: string;
      postId: string;
      postPreview: string;
    }[];
    pagination: Pagination;
  }>(`/admin/comments?${q}`);
}

export async function adminDeleteComment(id: string) {
  return adminFetch<{ success: boolean }>(`/admin/comments/${id}`, { method: "DELETE" });
}

export async function adminCommentsBulk(ids: string[], action: "soft_delete" | "restore") {
  return adminFetch<{ success: boolean; modified: number }>(`/admin/comments/bulk`, {
    method: "POST",
    body: JSON.stringify({ ids, action }),
  });
}

export async function adminListCircles(params: { page?: number; search?: string; date_from?: string }) {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.search) q.set("search", params.search);
  if (params.date_from) q.set("date_from", params.date_from);
  return adminFetch<{
    success: boolean;
    items: {
      id: string;
      name: string;
      description: string;
      visibility: string;
      createdAt: string;
      creatorEmail: string;
      memberCount: number;
    }[];
    pagination: Pagination;
    stats: { total_circles: number; circles_today: number; total_memberships: number };
  }>(`/admin/circles?${q}`);
}

export async function adminDeleteCircle(id: string) {
  return adminFetch<{ success: boolean }>(`/admin/circles/${id}`, { method: "DELETE" });
}

export async function adminCirclesBulk(ids: string[], action: "delete") {
  return adminFetch<{ success: boolean; deleted: number }>(`/admin/circles/bulk`, {
    method: "POST",
    body: JSON.stringify({ ids, action }),
  });
}

export async function adminListReports(params: {
  page?: number;
  search?: string;
  status?: string;
  date_from?: string;
}) {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.search) q.set("search", params.search);
  if (params.status) q.set("status", params.status);
  if (params.date_from) q.set("date_from", params.date_from);
  return adminFetch<{
    success: boolean;
    items: {
      id: string;
      reason: string;
      resolved: boolean;
      createdAt: string;
      reporterEmail: string;
      postId: string;
      postPreview: string;
    }[];
    pagination: Pagination;
    stats: {
      total_reports: number;
      pending_reports: number;
      resolved_reports: number;
      reports_today: number;
    };
  }>(`/admin/reports?${q}`);
}

export async function adminResolveReport(id: string) {
  return adminFetch<{ success: boolean }>(`/admin/reports/${id}/resolve`, { method: "POST", body: "{}" });
}

export async function adminReportsBulk(ids: string[], action: "resolve" | "delete_posts") {
  return adminFetch<{ success: boolean; modified?: number; deletedPosts?: number }>(`/admin/reports/bulk`, {
    method: "POST",
    body: JSON.stringify({ ids, action }),
  });
}

export async function adminListFlagged(params: { page?: number; pending?: boolean }) {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.pending === false) q.set("pending", "false");
  return adminFetch<{
    success: boolean;
    items: {
      id: string;
      reason: string;
      text: string;
      reviewed_by_admin: boolean;
      createdAt: string;
      postId: string;
      postPreview: string;
      postAuthorEmail?: string;
    }[];
    pagination: Pagination;
  }>(`/admin/flagged-posts?${q}`);
}

export async function adminReviewFlagged(id: string, action: "approve" | "delete") {
  return adminFetch<{ success: boolean }>(`/admin/flagged-posts/${id}/review`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

export async function adminFlaggedBulk(ids: string[], action: "approve" | "delete") {
  return adminFetch<{ success: boolean; modified?: number; processed?: number }>(`/admin/flagged-posts/bulk`, {
    method: "POST",
    body: JSON.stringify({ ids, action }),
  });
}

export async function adminAnalytics() {
  return adminFetch<{
    success: boolean;
    summary: { circles: number; memberships: number; pending_reports: number; flagged_pending: number };
    trend_30d: { dates: string[]; newUsers: number[]; newPosts: number[]; engagement: number[] };
  }>(`/admin/analytics`);
}
