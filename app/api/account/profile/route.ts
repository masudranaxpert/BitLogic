import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';

const BD_PHONE = /^(?:\+?88)?01[3-9]\d{8}$/;

/** Signed-in user's own profile (name, phone). Email is the login and can't be changed here. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const user = await db.user.findUnique({ where: { id: session.id }, select: { name: true, email: true, phone: true } });
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { name?: string; phone?: string };
  const name = String(body.name ?? '').trim().slice(0, 80);
  const phone = String(body.phone ?? '').replace(/[-\s]/g, '');
  if (name.length < 3) return NextResponse.json({ error: 'Name needs at least 3 characters.' }, { status: 400 });
  if (phone && !BD_PHONE.test(phone)) {
    return NextResponse.json({ error: 'Enter a valid BD phone number (01XXXXXXXXX).' }, { status: 400 });
  }
  const user = await db.user.update({
    where: { id: session.id },
    data: { name, phone: phone || null },
    select: { name: true, email: true, phone: true },
  });
  // Keep the admin customer record in step.
  await db.adminSubscriber.updateMany({ where: { email: user.email }, data: { name, phone } });
  return NextResponse.json({ user });
}
