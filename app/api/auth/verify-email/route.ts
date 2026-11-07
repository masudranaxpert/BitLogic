import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { consumeAuthToken, findAuthTokenUser } from '@/lib/auth/tokens';

/** Link target from the verification email. Redirects to the sign-in page with a result. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  // Relative to the host the link was opened on.
  const to = (result: '1' | 'invalid') => NextResponse.redirect(new URL(`/login?verified=${result}`, request.url));

  const userId = await consumeAuthToken(token, 'verify_email');
  if (userId) {
    await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
    return to('1');
  }
  // Mail scanners often open links first; a used link for an already verified account is still a success.
  const owner = await findAuthTokenUser(token, 'verify_email');
  if (owner) {
    const user = await db.user.findUnique({ where: { id: owner }, select: { emailVerifiedAt: true } });
    if (user?.emailVerifiedAt) return to('1');
  }
  return to('invalid');
}
