/**
 * Safely validate and sanitize a redirect target URL.
 * - Prevents open redirect attacks (//, /\, absolute URLs, javascript:, etc.)
 * - Strictly enforces role boundaries: customers can NEVER be redirected to /admin.
 */
export function getSafeRedirectUrl(
  rawNext: string | null | undefined,
  role: string | undefined,
): string {
  const isAdminOrStaff = role === 'ADMIN' || role === 'STAFF';

  if (!rawNext || typeof rawNext !== 'string') {
    return isAdminOrStaff ? '/admin' : '/account';
  }

  const trimmed = rawNext.trim();

  // Must begin with a single slash, not protocol-relative (//) or backslash (/\)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return isAdminOrStaff ? '/admin' : '/account';
  }

  // Reject URL encodings of slashes, backslashes, or control characters
  if (/%2f|%5c|%00/i.test(trimmed)) {
    return isAdminOrStaff ? '/admin' : '/account';
  }

  // Never redirect back to login or logout loops
  if (trimmed.startsWith('/login') || trimmed.startsWith('/api/auth')) {
    return isAdminOrStaff ? '/admin' : '/account';
  }

  // Strict role enforcement: Non-admins can NEVER go to /admin
  if (trimmed.startsWith('/admin')) {
    if (!isAdminOrStaff) {
      return '/account';
    }
    return trimmed;
  }

  // For customers, allow safe customer routes (e.g. /cart, /account, /shop)
  return trimmed;
}
