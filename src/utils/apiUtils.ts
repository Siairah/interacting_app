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
    const msg = `API returned HTML (status ${response.status}). Backend may be on wrong port. Set NEXT_PUBLIC_API_URL=http://localhost:5001 in .env.local and restart Next.js.`;
    console.error(msg);
    throw new Error('Server returned an invalid response. Check backend port and .env.local.');
  }

  if (!contentType.includes('application/json') && !(trimmed.startsWith('{') || trimmed.startsWith('['))) {
    console.error('API returned non-JSON. Set NEXT_PUBLIC_API_URL=http://localhost:5001 in .env.local, restart Next.js and backend.');
    throw new Error('Invalid response. Check backend is running on port 5001.');
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Invalid response from server.');
  }
}

const BACKEND_URL = 'http://localhost:5001';

export function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (url) return url;
  // Use same-origin proxy in browser to avoid CORS and wrong URLs
  if (typeof window !== 'undefined') return '/api';
  return BACKEND_URL;
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
