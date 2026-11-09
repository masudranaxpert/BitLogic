import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth/require-admin';
import { warrantyWindow } from '@/lib/warranty';
import { recordActivity, requestIp } from '@/lib/audit/record';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/**
 * Mark a unit delivered without handing over a credential
 * (e.g. logged in directly on the buyer's PC). A note is mandatory.
 */
export async function POST(request: Request) {
  const { session, error } = await requirePermission('orders');
  if (error) return error;
  const body = (await request.json().catch(() => null)) as {
    deliveryId?: string;
    note?: string;
  } | null;
  const deliveryId = body?.deliveryId?.trim();
  const note = body?.note?.trim();
  if (!deliveryId) {
    return NextResponse.json({ error: 'deliveryId required' }, { status: 400 });
  }
  if (!note) {
    return NextResponse.json(
      { error: 'A note is required when delivering without a credential.' },
      { status: 400 },
    );
  }
  const d = await db.digitalDelivery.findUnique({ where: { id: deliveryId } });
  if (!d) {
    return NextResponse.json({ error: 'Delivery not found.' }, { status: 404 });
  }
  if (d.status === 'delivered' && d.vaultCredentialId) {
    return NextResponse.json({ error: 'This unit already has a credential.' }, { status: 409 });
  }
  const now = new Date();
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const today = stamp.slice(0, 10);
  const expires = new Date(now);
  expires.setDate(expires.getDate() + (d.credentialValidDays || 30));
  const expiresAt = `${expires.getFullYear()}-${pad(expires.getMonth() + 1)}-${pad(expires.getDate())}`;

  let msgs: unknown[] = [];
  try {
    const v = JSON.parse(d.chatMessagesJson);
    if (Array.isArray(v)) msgs = v;
  } catch {
    msgs = [];
  }
  msgs.push({
    id: `msg-${Date.now()}`,
    sender: 'support',
    senderName: 'Support',
    text: `Your ${d.productName} (${d.variantName}) has been set up for you. No login details are needed. ${note}`,
    time: 'Just now',
  });

  await db.$transaction([
    db.digitalDelivery.update({
      where: { id: d.id },
      data: {
        status: 'delivered',
        deliveredAt: stamp,
        credentialAssignedAt: today,
        ...(!d.warrantyStartsAt && d.hasWarranty && d.warrantyDays
          ? (() => {
              const w = warrantyWindow(now, d.warrantyDays, d.orderExpiresAt || expiresAt);
              return { warrantyStartsAt: w.startsAt, warrantyEndsAt: w.endsAt };
            })()
          : {}),
        credentialExpiresAt: d.credentialExpiresAt || expiresAt,
        chatMessagesJson: JSON.stringify(msgs),
      },
    }),
    db.orderNote.create({
      data: {
        orderId: d.orderId,
        deliveryId: d.id,
        text: note.slice(0, 2000),
        authorName: session?.name || session?.email || 'Admin',
        kind: 'no_credential',
      },
    }),
  ]);
  await recordActivity({
    userId: session.id,
    action: 'order.deliver',
    entityType: 'order',
    entityId: d.orderId,
    summary: `Delivered ${d.orderId} · ${d.productName} to ${d.buyerName || d.buyerEmail || 'the buyer'} without a credential`,
    ip: requestIp(request),
  });
  return NextResponse.json({ ok: true });
}
