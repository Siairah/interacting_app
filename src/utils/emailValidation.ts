/** Pragmatic check for a typical user@domain.tld address (use with input type="email" for UX). */
export function isValidEmailFormat(email: string): boolean {
  const t = email.trim();
  if (!t) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}
