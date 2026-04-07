/**
 * Frontend-only admin gate (hardcoded). Replace with real auth + API when backend is ready.
 */
export const ADMIN_EMAIL = "admin12@gmail.com";
export const ADMIN_PASSWORD = "Itachi@123";

export const ADMIN_SESSION_KEY = "chautari_admin_session";
export const ADMIN_TOKEN_KEY = "chautari_admin_token";

export function isAdminEmailPassword(email: string, password: string): boolean {
  const e = email.trim().toLowerCase();
  return e === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD;
}

/** Call after POST /admin/login returns `token`. */
export function setAdminSession(token?: string | null): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
  if (token) sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}
