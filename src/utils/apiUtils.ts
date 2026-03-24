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

/** True for typical LAN IPs used when opening the app as http://192.168.x.x:3000 from another device. */
function isPrivateLanHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return false;
  return (
    /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.test(hostname) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname)
  );
}

export function getApiUrl(): string {
  // Always use same-origin /api proxy in browser – Next.js rewrites to backend.
  // Avoids wrong-port errors when backend runs on different port during testing.
  if (typeof window !== 'undefined') return '/api';
  return process.env.NEXT_PUBLIC_API_URL?.trim() || BACKEND_URL;
}

/**
 * Socket.IO must connect directly to the Node server (Next `/api` rewrites do not apply).
 * If you open the app from another PC/phone via http://192.168.x.x:3000, using
 * NEXT_PUBLIC_API_URL=http://localhost:5001 would make that device try *its own* localhost — calls never arrive.
 * For LAN testing we default the socket host to the same hostname as the page + backend port.
 */
export function getBackendUrl(): string {
  const env = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (isPrivateLanHostname(host)) {
      const port = process.env.NEXT_PUBLIC_SOCKET_PORT?.trim() || '5001';
      return `http://${host}:${port}`;
    }
  }
  return env || BACKEND_URL;
}

/** Fetch and parse JSON safely - use instead of fetch + response.json() */
export async function fetchJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  return safeJson<T>(res);
}
