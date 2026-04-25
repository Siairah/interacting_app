import { adminJsonFetch } from "@/admin/adminFetch";

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return adminJsonFetch<T>(path, init);
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
      /** Profile full name when set — helps spot users on small screens. */
      displayName?: string;
      isBanned?: boolean;
      bannedUntil?: string | null;
      banReason?: string;
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

export async function adminBanUser(
  id: string,
  body: { banned: boolean; reason?: string; hours?: number; until?: string }
) {
  return adminFetch<{ success: boolean; isBanned?: boolean; bannedUntil?: string | null; banReason?: string }>(
    `/admin/users/${id}/ban`,
    { method: "PATCH", body: JSON.stringify(body) }
  );
}

export async function adminSendUserWarning(id: string, message: string) {
  return adminFetch<{ success: boolean }>(`/admin/users/${id}/warning`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function adminDeleteUserAccount(id: string) {
  return adminFetch<{ success: boolean }>(`/admin/users/${id}`, { method: "DELETE" });
}

export async function adminListPosts(params: {
  page?: number;
  search?: string;
  circle_id?: string;
  has_media?: string;
  date_from?: string;
  /** Only posts in moderation queue (unreviewed). Ignored if needs_attention is set. */
  flagged_only?: boolean;
  /** Posts with at least one unresolved user report. Ignored if needs_attention is set. */
  reported_only?: boolean;
  /** Union of auto-flagged queue + unresolved reports — use so nothing slips through. */
  needs_attention?: boolean;
  /** Filter by approval: pending = not approved, approved = approved, omit = all. */
  approval?: "pending" | "approved";
}) {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.search) q.set("search", params.search);
  if (params.circle_id) q.set("circle_id", params.circle_id);
  if (params.has_media) q.set("has_media", params.has_media);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.flagged_only) q.set("flagged_only", "true");
  if (params.reported_only) q.set("reported_only", "true");
  if (params.needs_attention) q.set("needs_attention", "true");
  if (params.approval) q.set("approval", params.approval);
  return adminFetch<{
    success: boolean;
    items: {
      id: string;
      content: string;
      is_public: boolean;
      is_approved?: boolean;
      createdAt: string;
      authorEmail: string;
      circleName: string;
      circleId?: string;
      mediaCount: number;
      commentsCount: number;
      likesCount: number;
      flagged_pending?: boolean;
      moderation_reason?: string | null;
      open_reports?: number;
    }[];
    pagination: Pagination;
    stats: { total_posts: number; posts_today: number; total_comments: number; total_likes: number };
  }>(`/admin/posts?${q}`);
}

export type AdminPostDetail = {
  id: string;
  content: string;
  is_public: boolean;
  is_approved: boolean;
  createdAt: string;
  authorEmail?: string;
  circle: { id: string; name: string } | null;
  media: { id: string; file: string; type: string }[];
  commentsCount: number;
  likesCount: number;
  open_reports_count: number;
  comments: {
    id: string;
    content: string;
    createdAt: string;
    is_deleted: boolean;
    authorEmail: string;
  }[];
  reports: {
    id: string;
    reason: string;
    resolved: boolean;
    createdAt: string;
    reporterEmail: string;
  }[];
  moderation: {
    id: string;
    reason: string;
    text: string;
    reviewed_by_admin: boolean;
    createdAt: string;
  } | null;
};

export async function adminGetPostDetail(id: string) {
  return adminFetch<{ success: boolean; post: AdminPostDetail }>(`/admin/posts/${id}`);
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
      postCircleName?: string;
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
      pending_reports?: number;
      flagged_posts?: number;
      health_score?: number;
      suspended?: boolean;
      suspendedUntil?: string | null;
    }[];
    pagination: Pagination;
    stats: { total_circles: number; circles_today: number; total_memberships: number };
  }>(`/admin/circles?${q}`);
}

/** Paginates circle names for post filters (superadmin). */
export async function adminLoadCircleFilterOptions(maxPages = 30): Promise<{ id: string; name: string }[]> {
  const out: { id: string; name: string }[] = [];
  let page = 1;
  let pages = 1;
  do {
    const r = await adminListCircles({ page });
    for (const c of r.items) out.push({ id: c.id, name: c.name });
    pages = r.pagination.pages;
    page += 1;
  } while (page <= pages && page <= maxPages);
  return out;
}

/** In-app notifications to circle admins or all members (backend: POST /admin/circles/:id/notice). */
export async function adminPostCircleNotice(
  circleId: string,
  body: { message: string; audience: "all_members" | "admins_only" }
) {
  return adminFetch<{ success: boolean; delivered?: number }>(`/admin/circles/${circleId}/notice`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Suspend or restore a circle; optional timed suspension via `hours` or ISO `until`. */
export async function adminSetCircleSuspended(
  circleId: string,
  body: { suspended: boolean; hours?: number; until?: string }
) {
  return adminFetch<{ success: boolean; suspended?: boolean; suspendedUntil?: string | null }>(
    `/admin/circles/${circleId}/suspension`,
    { method: "PATCH", body: JSON.stringify(body) }
  );
}

export async function adminPostCircleWarning(
  circleId: string,
  body: { message: string; audience?: "all_members" | "admins_only" }
) {
  return adminFetch<{ success: boolean; delivered?: number }>(`/admin/circles/${circleId}/warning`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type AdminCircleDetail = {
  id: string;
  name: string;
  description: string;
  rules: string;
  visibility: string;
  createdAt: string;
  creatorEmail?: string;
  suspended: boolean;
  suspendedUntil: string | null;
  memberCount: number;
  moderation: { pending_reports: number; flagged_posts: number; health_score: number };
  members: { userId: string; email?: string; is_admin: boolean; joined_at: string }[];
  posts: {
    id: string;
    content: string;
    is_public: boolean;
    is_approved: boolean;
    createdAt: string;
    authorEmail: string;
    commentsCount: number;
    likesCount: number;
    mediaCount: number;
    open_reports: number;
    flagged_pending: boolean;
    moderation_reason: string | null;
    health_score: number;
  }[];
  posts_pagination: Pagination;
};

export async function adminGetCircleDetail(id: string, params?: { posts_page?: number; posts_limit?: number }) {
  const q = new URLSearchParams();
  if (params?.posts_page) q.set("posts_page", String(params.posts_page));
  if (params?.posts_limit) q.set("posts_limit", String(params.posts_limit));
  const qs = q.toString();
  return adminFetch<{ success: boolean; circle: AdminCircleDetail }>(`/admin/circles/${id}${qs ? `?${qs}` : ""}`);
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
      circleName?: string;
      open_reports?: number;
      /** Combined SightEngine + open-report pressure (0–100, higher is healthier). */
      risk_score?: number;
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
