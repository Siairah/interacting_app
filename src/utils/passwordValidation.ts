/** Password rules aligned with reset-password (AMS-5.2). */
export type PasswordRuleErrors = {
  minLength: string;
  hasUpperCase: string;
  hasLowerCase: string;
  hasNumbers: string;
  hasSpecialChar: string;
};

export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: PasswordRuleErrors;
} {
  const minLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return {
    isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
    errors: {
      minLength: !minLength ? "At least 8 characters" : "",
      hasUpperCase: !hasUpperCase ? "One uppercase letter" : "",
      hasLowerCase: !hasLowerCase ? "One lowercase letter" : "",
      hasNumbers: !hasNumbers ? "One number" : "",
      hasSpecialChar: !hasSpecialChar ? "One special character" : "",
    },
  };
}
