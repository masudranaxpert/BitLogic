import { validateCustomerEmail, isDisposableEmail } from '@/lib/email/validate-email';

/** Expanded list of common leaked/cracked passwords from SecLists / RockYou */
const COMMON = new Set([
  'password', 'password1', 'password12', 'password123', 'password1234',
  '12345678', '123456789', '1234567890', 'qwerty123', 'qwertyuiop',
  'iloveyou', '11111111', '00000000', '123123123', 'abc12345',
  'admin123', 'bitlogic', 'bitlogic123', 'letmein1', 'welcome1',
  'bangladesh', 'bangladesh123', 'dhaka123', 'secret123', 'changeme',
  'trustno1', 'football', 'monkey123', 'pass1234', 'asdfghjk', 'zxcvbnm1'
]);

export type PasswordContext = {
  email?: string;
  name?: string | null;
  phone?: string | null;
};

/**
 * Smart, lightweight password validator (Ponytail Zero-Dependency style).
 * Checks length, bcrypt byte limit, common passwords, repetitions, and ensures
 * the user does not reuse their email address, name, or phone number.
 */
export function passwordProblem(
  pw: string,
  context?: PasswordContext | string,
): string | null {
  if (typeof pw !== 'string' || pw.length < 8) return 'Use at least 8 characters.';
  // bcrypt only reads the first 72 bytes; refuse longer so nothing is silently ignored.
  if (Buffer.byteLength(pw, 'utf8') > 72) return 'Use at most 72 characters.';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Mix both letters and numbers.';

  const cleanPw = pw.toLowerCase();

  // 1. Direct weak/common password check
  if (COMMON.has(cleanPw)) {
    return 'That password is too common and easily guessed.';
  }

  // 2. Parse context (backward-compatible: string or object)
  const email = typeof context === 'string' ? context : context?.email;
  const name = typeof context === 'object' ? context?.name : undefined;
  const phone = typeof context === 'object' ? context?.phone : undefined;

  // 3. Email checks
  if (email) {
    const cleanEmail = email.toLowerCase().trim();
    // Reusing exact email address as password
    if (cleanPw === cleanEmail) {
      return 'Do not use your email address as your password.';
    }
    // Reusing username prefix (e.g. "rahim" from "rahim@gmail.com")
    const emailUser = cleanEmail.split('@')[0];
    if (emailUser && emailUser.length >= 3 && cleanPw.includes(emailUser)) {
      return "Do not include your email name in the password.";
    }
  }

  // 4. Name check (e.g. user's first/last name)
  if (name && typeof name === 'string') {
    const parts = name.toLowerCase().split(/\s+/).filter((p) => p.length >= 3);
    for (const part of parts) {
      if (cleanPw.includes(part)) {
        return "Do not include your personal name in the password.";
      }
    }
  }

  // 5. Phone check (e.g. mobile phone last 6 digits)
  if (phone && typeof phone === 'string') {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 6 && cleanPw.includes(digits.slice(-6))) {
      return "Do not include your phone number in the password.";
    }
  }

  // 6. Character repetition check (e.g. 11111111, aaaaaaaa)
  if (/^(.)\1+$/.test(pw)) {
    return 'Do not repeat the same character repeatedly.';
  }

  return null;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export { validateCustomerEmail, isDisposableEmail };
