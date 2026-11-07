import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth/require-admin';
import { isFullAdmin } from '@/lib/auth/permissions';
import type { SessionUser } from '@/lib/auth/session';

/** A note can be edited or deleted only for this long after creation. */
const NOTE_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_LEN = 2000;

function canEditNote(session: SessionUser, authorName: string) {
  if (isFullAdmin(session.role)) return true;
  const me = (session.name || session.email || '').trim();
  return Boolean(me) && me === authorName.trim();
}

function serialize(n: {
  id: string;
  orderId: string;
  deliveryId: string | null;
  text: string;
  authorName: string;
  kind: string;
  createdAt: Date;
  editedAt: Date | null;
}) {
  const expiresAt = n.createdAt.getTime() + NOTE_EDIT_WINDOW_MS;
  return {
    id: n.id,
    orderId: n.orderId,
    deliveryId: n.deliveryId,
    text: n.text,
    authorName: n.authorName,
    kind: n.kind,
    createdAt: n.createdAt.toISOString(),
    editedAt: n.editedAt ? n.editedAt.toISOString() : null,
    editableUntil: new Date(expiresAt).toISOString(),
    editable: Date.now() < expiresAt,
  };
}

export async function GET(request: Request) {
  const { error } = await requirePermission('orders');
  if (error) return error;
  const orderId = new URL(request.url).searchParams.get('orderId')?.trim();
  if (!orderId) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  }
  const notes = await db.orderNote.findMany({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ notes: notes.map(serialize) });
}

export async function POST(request: Request) {
  const { session, error } = await requirePermission('orders');
  if (error) return error;
  const body = (await request.json().catch(() => null)) as {
    orderId?: string;
    deliveryId?: string;
    text?: string;
  } | null;
  const orderId = body?.orderId?.trim();
  const text = body?.text?.trim();
  if (!orderId || !text) {
    return NextResponse.json({ error: 'Order and note text are required.' }, { status: 400 });
  }
  if (text.length > MAX_LEN) {
    return NextResponse.json({ error: `Note is too long (max ${MAX_LEN}).` }, { status: 400 });
  }
  const hasOrder =
    (await db.order.count({ where: { id: orderId } })) > 0 ||
    (await db.digitalDelivery.count({ where: { orderId } })) > 0;
  if (!hasOrder) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }
  const note = await db.orderNote.create({
    data: {
      orderId,
      deliveryId: body?.deliveryId?.trim() || null,
      text,
      authorName: session?.name || session?.email || 'Admin',
    },
  });
  return NextResponse.json({ ok: true, note: serialize(note) });
}

export async function PATCH(request: Request) {
  const { session, error } = await requirePermission('orders');
  if (error) return error;
  const body = (await request.json().catch(() => null)) as {
    id?: string;
    text?: string;
  } | null;
  const id = body?.id?.trim();
  const text = body?.text?.trim();
  if (!id || !text) {
    return NextResponse.json({ error: 'Note id and text are required.' }, { status: 400 });
  }
  if (text.length > MAX_LEN) {
    return NextResponse.json({ error: `Note is too long (max ${MAX_LEN}).` }, { status: 400 });
  }
  const existing = await db.orderNote.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Note not found.' }, { status: 404 });
  }
  if (Date.now() - existing.createdAt.getTime() >= NOTE_EDIT_WINDOW_MS) {
    return NextResponse.json(
      { error: 'This note is older than 24 hours and is locked. Add a new note instead.' },
      { status: 403 },
    );
  }
  if (!canEditNote(session, existing.authorName)) {
    return NextResponse.json(
      { error: 'You can only edit your own notes.' },
      { status: 403 },
    );
  }
  const note = await db.orderNote.update({
    where: { id },
    data: { text, editedAt: new Date() },
  });
  return NextResponse.json({ ok: true, note: serialize(note) });
}

export async function DELETE(request: Request) {
  const { session, error } = await requirePermission('orders');
  if (error) return error;
  const id = new URL(request.url).searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Note id required.' }, { status: 400 });
  }
  const existing = await db.orderNote.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Note not found.' }, { status: 404 });
  }
  if (Date.now() - existing.createdAt.getTime() >= NOTE_EDIT_WINDOW_MS) {
    return NextResponse.json(
      { error: 'This note is older than 24 hours and cannot be deleted.' },
      { status: 403 },
    );
  }
  if (!canEditNote(session, existing.authorName)) {
    return NextResponse.json(
      { error: 'You can only delete your own notes.' },
      { status: 403 },
    );
  }
  await db.orderNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
