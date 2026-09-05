// src/utils/validation.ts

export interface PasswordValidationResult {
  isValid: boolean;
  error?: string;
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    hasNoSpaces: boolean;
  };
}

/**
 * Validates password strength against robust production standards:
 * - At least 8 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one digit (0-9)
 * - At least one special character (!@#$%^&*()_+-=[]{};':"|,.<>/?)
 * - No whitespace characters
 */
export function validatePassword(password: string): PasswordValidationResult {
  if (typeof password !== 'string') {
    return {
      isValid: false,
      error: 'Password must be a valid string.',
      checks: {
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecialChar: false,
        hasNoSpaces: false,
      },
    };
  }

  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    hasNoSpaces: !/\s/.test(password),
  };

  const missingRules: string[] = [];
  if (!checks.minLength) missingRules.push('at least 8 characters');
  if (!checks.hasUppercase) missingRules.push('one uppercase letter (A-Z)');
  if (!checks.hasLowercase) missingRules.push('one lowercase letter (a-z)');
  if (!checks.hasNumber) missingRules.push('one number (0-9)');
  if (!checks.hasSpecialChar) missingRules.push('one special character (e.g. !@#$%^&*)');
  if (!checks.hasNoSpaces) missingRules.push('no spaces allowed');

  const isValid = missingRules.length === 0;

  return {
    isValid,
    error: isValid ? undefined : `Password must contain ${missingRules.join(', ')}.`,
    checks,
  };
}
