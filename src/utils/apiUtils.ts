/** User-friendly message when backend returns HTML (wrong port, 404, etc.) */
export const API_UNREACHABLE_MSG = 'Backend not reachable. Check NEXT_PUBLIC_API_URL in .env.local and restart.';

/**
 * Safely parse JSON from a fetch response.
 * Handles cases where the API returns HTML (e.g. 404 page) instead of JSON.
 */
export async function safeJson<T = unknown>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  const trimmed = text.trim();

  // If we got HTML (e.g. 404, 502 error page), throw with helpful message
  if (trimmed.startsWith('<')) {
    throw new Error(API_UNREACHABLE_MSG);
  }

  if (!contentType.includes('application/json') && !(trimmed.startsWith('{') || trimmed.startsWith('['))) {
    throw new Error(API_UNREACHABLE_MSG);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(API_UNREACHABLE_MSG);
  }
}

/** Extract message from caught error for display (e.g. in toasts). */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

const BACKEND_URL = 'http://localhost:5001';

export function getApiUrl(): string {
  // Always use same-origin /api proxy in browser – Next.js rewrites to backend.
  // Avoids wrong-port errors when backend runs on different port during testing.
  if (typeof window !== 'undefined') return '/api';
  return process.env.NEXT_PUBLIC_API_URL?.trim() || BACKEND_URL;
}

/** Real backend URL - use for WebSocket (socket.io) which cannot use HTTP proxy */
export function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL?.trim() || BACKEND_URL;
}

/** Fetch and parse JSON safely - use instead of fetch + response.json() */
export async function fetchJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  return safeJson<T>(res);
}
