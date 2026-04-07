/**
 * Backend base URLs (no trailing slash).
 * Override anytime with `NEXT_PUBLIC_API_URL` in `.env.local`.
 */

/** Local Node backend (default during `next dev` when env is unset). */
export const LOCAL_API_BASE_URL = 'http://localhost:5001';

/** Production backend on Render (default for production builds when env is unset). */
export const DEPLOYED_API_BASE_URL = 'https://backend-host-wgti.onrender.com';

/** @deprecated Use DEPLOYED_API_BASE_URL — kept for existing imports. */
export const DEFAULT_API_BASE_URL = DEPLOYED_API_BASE_URL;

/**
 * When `NEXT_PUBLIC_API_URL` is not set: localhost in development, Render in production.
 */
export function getDefaultApiBaseUrl(): string {
  return process.env.NODE_ENV === 'development'
    ? LOCAL_API_BASE_URL
    : DEPLOYED_API_BASE_URL;
}
