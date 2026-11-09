import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decryptSecret } from '@/lib/crypto/secrets';
import { loadSupplier } from '@/lib/suppliers/core';
import { handleState } from '@/lib/suppliers/dispatch';

export const runtime = 'nodejs';

/**
 * Signed order events from a supplier (Pandora format):
 * HMAC-SHA256 over "<timestamp>.<raw body>", header Webhook-Signature: v1=<hex>[,v1=<hex>]
 * Events never carry credentials, so we always re-read the order through the API.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await request.text(); // exact bytes, before any JSON parsing
  const supplier = await db.supplier.findUnique({ where: { id } });
  if (!supplier?.webhookSecretEnc) return NextResponse.json({ error: 'unknown' }, { status: 404 });

  const ts = request.headers.get('webhook-timestamp') || '';
  const sigHeader = request.headers.get('webhook-signature') || '';
  const eventId = request.headers.get('webhook-id') || '';
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!ts || !Number.isFinite(age) || age > 300) return NextResponse.json({ error: 'stale' }, { status: 400 });

  const secret = decryptSecret(supplier.webhookSecretEnc);
  const expected = Buffer.from('v1=' + createHmac('sha256', secret).update(`${ts}.`).update(raw).digest('hex'));
  const valid = sigHeader.split(',').some((c) => {
    const b = Buffer.from(c.trim());
    return b.length === expected.length && timingSafeEqual(b, expected);
  });
  if (!valid) return NextResponse.json({ error: 'bad signature' }, { status: 401 });

  // Replay protection: each event id is accepted once.
  if (eventId) {
    try {
      await db.supplierWebhookEvent.create({ data: { id: `${id}:${eventId}`.slice(0, 190) } });
    } catch {
      return NextResponse.json({ ok: true, duplicate: true });
    }
  }

  let externalId = '';
  try {
    const body = JSON.parse(raw) as { data?: { order_id?: string; id?: string }; order_id?: string; order?: { id?: string } };
    externalId = body.data?.order_id || body.data?.id || body.order_id || body.order?.id || '';
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  if (!externalId) return NextResponse.json({ ok: true, ignored: true });

  const so = await db.supplierOrder.findFirst({ where: { supplierId: id, externalOrderId: externalId } });
  if (!so) return NextResponse.json({ ok: true, ignored: true });
  try {
    const { adapter, ctx } = await loadSupplier(id);
    await handleState(so.id, await adapter.getOrder(ctx, externalId));
  } catch {
    // Accepted; polling will pick it up. Never make the supplier retry for our own failure loop.
    await db.supplierOrder.update({ where: { id: so.id }, data: { nextPollAt: new Date() } });
  }
  return NextResponse.json({ ok: true });
}
