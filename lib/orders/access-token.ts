import { randomBytes, timingSafeEqual } from 'node:crypto';

/** Unguessable guest proof for an order (returned once at checkout). */
export function generateOrderAccessToken(): string {
  return randomBytes(24).toString('base64url');
}

export function accessTokensMatch(
  stored: string | null | undefined,
  provided: string | null | undefined,
): boolean {
  if (!stored || !provided) return false;
  const a = Buffer.from(stored);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
