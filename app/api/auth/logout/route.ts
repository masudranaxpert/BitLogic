import { NextResponse } from 'next/server';
import { clearSessionCookieOn } from '@/lib/auth/session';

export async function POST() {
  return clearSessionCookieOn(NextResponse.json({ ok: true }));
}
