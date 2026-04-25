import { clearAdminSession, getAdminToken } from "@/admin/auth";
import { API_UNREACHABLE_MSG, getApiUrl } from "@/utils/apiUtils";

/** Thrown when the admin JWT is missing, expired, or rejected (401/403). */
export class AdminAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminAuthError";
  }
}

function getJsonMessage(data: unknown): string {
  if (data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string") {
    return (data as { message: string }).message;
  }
  return "";
}

function mergeHeaders(init?: RequestInit): Record<string, string> {
  const base: Record<string, string> = {};
  const extra = init?.headers;
  if (extra && typeof extra === "object" && !Array.isArray(extra)) {
    Object.assign(base, extra as Record<string, string>);
  }
  return base;
}

/**
 * Authenticated admin JSON fetch: handles 401/403 (clears session), non-JSON / HTML errors,
 * and `{ success: false }` bodies with HTTP 200.
 */
export async function adminJsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAdminToken();
  if (!token) {
    clearAdminSession();
    throw new AdminAuthError("Admin session required. Log in from the home page.");
  }

  const headers = mergeHeaders(init);
  headers.Authorization = `Bearer ${token}`;
  if (init?.body != null && String(init.body).length > 0) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${getApiUrl()}${path}`, { ...init, headers });
  const text = await res.text();
  const trimmed = text.trim();

  let data: unknown;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      data = JSON.parse(trimmed);
    } catch {
      data = undefined;
    }
  }

  if (res.status === 401 || res.status === 403) {
    clearAdminSession();
    const msg = getJsonMessage(data) || (res.status === 401 ? "Session expired. Log in again." : "Access denied.");
    throw new AdminAuthError(msg);
  }

  if (trimmed.startsWith("<")) {
    throw new Error(API_UNREACHABLE_MSG);
  }

  if (!res.ok) {
    const msg = getJsonMessage(data) || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  if (data === undefined && trimmed.length > 0) {
    throw new Error(API_UNREACHABLE_MSG);
  }

  if (data && typeof data === "object" && "success" in data && (data as { success?: boolean }).success === false) {
    throw new Error(getJsonMessage(data) || "Request failed");
  }

  return data as T;
}
