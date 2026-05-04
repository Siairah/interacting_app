/** Minimum age to register / keep on profile (years). */
export const MIN_REGISTRATION_AGE = 16;

function parseLocalDateYmd(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function startOfTodayLocal(ref: Date = new Date()): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
}

function subtractYearsLocal(d: Date, years: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setFullYear(r.getFullYear() - years);
  return r;
}

/** Latest birth date (inclusive) so the person is at least `minAge` on `refDay`. */
export function maxBirthDateForMinAge(minAge: number, refDay: Date = new Date()): string {
  return toYmdLocal(subtractYearsLocal(startOfTodayLocal(refDay), minAge));
}

/** Earliest selectable birth date (reasonable lower bound). */
export function minBirthDateSelectable(refDay: Date = new Date()): string {
  return toYmdLocal(subtractYearsLocal(startOfTodayLocal(refDay), 120));
}

/** `min` / `max` for `<input type="date">`: cannot be future, must allow only ages >= minAge. */
export function birthDateInputBounds(minAge: number = MIN_REGISTRATION_AGE, refDay: Date = new Date()): {
  min: string;
  max: string;
} {
  return {
    min: minBirthDateSelectable(refDay),
    max: maxBirthDateForMinAge(minAge, refDay),
  };
}

export function ageFromBirthDate(birth: Date, ref: Date = new Date()): number {
  let age = ref.getFullYear() - birth.getFullYear();
  const md = ref.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && ref.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

export function validateBirthDate(
  ymd: string,
  options: { minAge?: number; refDay?: Date } = {}
): { ok: true } | { ok: false; message: string } {
  const minAge = options.minAge ?? MIN_REGISTRATION_AGE;
  const refDay = options.refDay ?? new Date();
  const birth = parseLocalDateYmd(ymd);
  if (!birth) {
    return { ok: false, message: 'Please enter a valid date of birth.' };
  }
  const todayStart = startOfTodayLocal(refDay);
  if (birth > todayStart) {
    return { ok: false, message: 'Date of birth cannot be in the future.' };
  }
  const age = ageFromBirthDate(birth, refDay);
  if (age < minAge) {
    return {
      ok: false,
      message: `You must be at least ${minAge} years old.`,
    };
  }
  return { ok: true };
}
