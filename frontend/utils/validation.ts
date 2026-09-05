// frontend/utils/validation.ts

export interface PasswordRule {
  id: string;
  label: string;
  passed: boolean;
}

export interface PasswordValidationState {
  isValid: boolean;
  rules: PasswordRule[];
  errorMessage?: string;
}

/**
 * Validates password on frontend and provides granular rule feedback for UI checklists.
 */
export function getPasswordValidationState(password: string): PasswordValidationState {
  const pwd = password || '';

  const rules: PasswordRule[] = [
    {
      id: 'length',
      label: 'At least 8 characters',
      passed: pwd.length >= 8,
    },
    {
      id: 'uppercase',
      label: 'At least one uppercase letter (A-Z)',
      passed: /[A-Z]/.test(pwd),
    },
    {
      id: 'lowercase',
      label: 'At least one lowercase letter (a-z)',
      passed: /[a-z]/.test(pwd),
    },
    {
      id: 'number',
      label: 'At least one number (0-9)',
      passed: /[0-9]/.test(pwd),
    },
    {
      id: 'special',
      label: 'At least one special character (!@#$%^&*)',
      passed: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    },
    {
      id: 'nospaces',
      label: 'No spaces allowed',
      passed: !/\s/.test(pwd) && pwd.length > 0,
    },
  ];

  const failedRules = rules.filter((r) => !r.passed);
  const isValid = failedRules.length === 0;

  return {
    isValid,
    rules,
    errorMessage: isValid
      ? undefined
      : `Password must satisfy all requirements: ${failedRules.map((r) => r.label).join(', ')}`,
  };
}
