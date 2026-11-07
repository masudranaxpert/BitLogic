export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_NOTIFICATIONS_SHOWN = 7;
export const ORDERS_PER_PAGE = 10;
export const TICKETS_PER_PAGE = 10;
export const CLAIMS_PER_PAGE = 10;

export const ISSUE_TYPES = [
  'Login / Password',
  'Deactivated Early',
  'Profile PIN',
  '2FA / OTP Code',
  'Other',
] as const;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
