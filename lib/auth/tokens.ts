import { createHash, randomBytes } from 'node:crypto';
import { db } from '@/lib/db';

export type AuthTokenType = 'verify_email' | 'reset_password';

const TTL_MS: Record<AuthTokenType, number> = {
  verify_email: 24 * 60 * 60 * 1000,
  reset_password: 60 * 60 * 1000,
};

const hash = (raw: string) => createHash('sha256').update(raw).digest('hex');

/** Issues a fresh single-use token; older unused tokens of the same type are revoked. */
export async function issueAuthToken(userId: string, type: AuthTokenType): Promise<string> {
  const raw = randomBytes(32).toString('base64url');
  await db.$transaction([
    db.authToken.deleteMany({ where: { userId, type, usedAt: null } }),
    db.authToken.create({
      data: { userId, type, tokenHash: hash(raw), expiresAt: new Date(Date.now() + TTL_MS[type]) },
    }),
  ]);
  return raw;
}

/** Returns the userId and marks the token used, or null if invalid/expired/used. */
export async function consumeAuthToken(raw: string, type: AuthTokenType): Promise<string | null> {
  if (!raw || raw.length > 200) return null;
  const row = await db.authToken.findUnique({ where: { tokenHash: hash(raw) } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt < new Date()) return null;
  const done = await db.authToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  return done.count === 1 ? row.userId : null;
}

/** Same check without using it up (to show the reset form only for valid links). */
export async function peekAuthToken(raw: string, type: AuthTokenType): Promise<boolean> {
  if (!raw || raw.length > 200) return false;
  const row = await db.authToken.findUnique({ where: { tokenHash: hash(raw) } });
  return Boolean(row && row.type === type && !row.usedAt && row.expiresAt > new Date());
}

export function appUrl(request: Request): string {
  const env = process.env.APP_URL?.replace(/\/$/, '');
  if (env) return env;
  const u = new URL(request.url);
  return `${u.protocol}//${u.host}`;
}

/** Owner of a token even if it was already used (never for granting access). */
export async function findAuthTokenUser(raw: string, type: AuthTokenType): Promise<string | null> {
  if (!raw || raw.length > 200) return null;
  const row = await db.authToken.findUnique({ where: { tokenHash: hash(raw) } });
  return row && row.type === type ? row.userId : null;
}
