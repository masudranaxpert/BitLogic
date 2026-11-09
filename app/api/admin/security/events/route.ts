import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { ROLES } from '@/lib/auth/roles';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== ROLES.ADMIN && session.role !== ROLES.STAFF)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const search = searchParams.get('search')?.trim();
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

  const where: any = {};
  if (action && action !== 'all') {
    where.action = action;
  }
  if (search) {
    where.OR = [
      { ip: { contains: search } },
      { endpoint: { contains: search } },
      { details: { contains: search } },
    ];
  }

  const events = await db.securityEvent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json({ events });
}
