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
    const msg = `API returned HTML instead of JSON (status ${response.status}). Ensure your backend is running on port 5000 and all routes are mounted.`;
    console.error(msg);
    throw new Error('Server returned an invalid response. Please check your connection.');
  }

  // Try to parse - some APIs return JSON with wrong content-type
  if (!contentType.includes('application/json') && !(trimmed.startsWith('{') || trimmed.startsWith('['))) {
    console.error('API returned non-JSON. Ensure your backend is running and the requested route exists.');
    throw new Error('Server returned an invalid response. Please check your connection.');
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Invalid response from server.');
  }
}

const BACKEND_URL = 'http://localhost:5000';

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
