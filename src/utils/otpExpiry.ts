/** True when the ISO expiry time is strictly before `now` (default: current time). */
export function isRegistrationOtpExpired(otpExpiresAtIso: string, now: Date = new Date()): boolean {
  return new Date(otpExpiresAtIso) < now;
}
