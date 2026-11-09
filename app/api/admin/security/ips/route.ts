import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { ROLES } from '@/lib/auth/roles';
import { updateIpCacheMemory, removeIpFromCacheMemory } from '@/lib/security/ip-rules';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== ROLES.ADMIN && session.role !== ROLES.STAFF)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim();
  const status = searchParams.get('status')?.trim();

  const where: any = {};
  if (status && status !== 'all') {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { ip: { contains: search } },
      { reason: { contains: search } },
      { notes: { contains: search } },
    ];
  }

  const rules = await db.ipRule.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({ rules });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== ROLES.ADMIN && session.role !== ROLES.STAFF)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    ip?: string;
    status?: string;
    reason?: string;
    notes?: string;
    expiresInHours?: number;
  } | null;

  const ip = body?.ip?.trim();
  if (!ip) {
    return NextResponse.json({ error: 'IP address is required.' }, { status: 400 });
  }

  const status = body?.status === 'whitelisted' ? 'whitelisted' : 'blocked';
  const reason = body?.reason?.trim() || 'Manual admin action';
  const notes = body?.notes?.trim() || null;
  const expiresAt = body?.expiresInHours ? new Date(Date.now() + body.expiresInHours * 3600 * 1000) : null;

  const rule = await db.ipRule.upsert({
    where: { ip },
    create: {
      ip,
      status,
      reason,
      notes,
      expiresAt,
      hitCount: 1,
    },
    update: {
      status,
      reason,
      notes,
      expiresAt,
    },
  });

  updateIpCacheMemory(ip, status, expiresAt ? expiresAt.getTime() : null);

  return NextResponse.json({ success: true, rule });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== ROLES.ADMIN && session.role !== ROLES.STAFF)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    status?: 'blocked' | 'flagged' | 'whitelisted';
    notes?: string;
  } | null;

  if (!body?.id || !body?.status) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 });
  }

  const updated = await db.ipRule.update({
    where: { id: body.id },
    data: {
      status: body.status,
      notes: body.notes !== undefined ? body.notes : undefined,
    },
  });

  updateIpCacheMemory(
    updated.ip,
    updated.status as any,
    updated.expiresAt ? updated.expiresAt.getTime() : null,
  );

  return NextResponse.json({ success: true, rule: updated });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== ROLES.ADMIN && session.role !== ROLES.STAFF)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  const existing = await db.ipRule.findUnique({ where: { id } });
  if (existing) {
    await db.ipRule.delete({ where: { id } });
    removeIpFromCacheMemory(existing.ip);
  }

  return NextResponse.json({ success: true });
}
