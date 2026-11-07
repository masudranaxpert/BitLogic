/** One password rule for signup, reset, profile change and admin-set passwords. */
const COMMON = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890', 'qwerty123',
  'iloveyou', '11111111', '00000000', 'abc12345', 'admin123', 'bitlogic', 'letmein1', 'welcome1',
]);

export function passwordProblem(pw: string, email?: string): string | null {
  if (typeof pw !== 'string' || pw.length < 8) return 'Use at least 8 characters.';
  // bcrypt only reads the first 72 bytes; refuse longer so nothing is silently ignored.
  if (Buffer.byteLength(pw, 'utf8') > 72) return 'Use at most 72 characters.';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Mix letters and numbers.';
  if (COMMON.has(pw.toLowerCase())) return 'That password is too common.';
  if (email && pw.toLowerCase().includes(email.split('@')[0].toLowerCase()) && email.split('@')[0].length >= 4) {
    return "Don't use your email name in the password.";
  }
  return null;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
