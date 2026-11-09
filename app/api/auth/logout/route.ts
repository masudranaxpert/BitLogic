import { NextResponse } from 'next/server';
import { clearSessionCookieOn, getSession } from '@/lib/auth/session';
import { recordActivity, requestIp } from '@/lib/audit/record';

export async function POST(request: Request) {
  const session = await getSession();
  if (session && (session.role === 'ADMIN' || session.role === 'STAFF')) {
    await recordActivity({
      userId: session.id,
      action: 'auth.logout',
      summary: 'Signed out',
      ip: requestIp(request),
    });
  }
  return clearSessionCookieOn(NextResponse.json({ ok: true }));
}
