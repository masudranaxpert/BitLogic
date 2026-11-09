import { db } from '@/lib/db';
import { SupplierInputError, supplierOrders } from '@/lib/suppliers/admin';
import { readJson, supplierRoute } from '@/lib/suppliers/api';
import { dispatchOrder, pollSupplierOrders, supplierOrderResult } from '@/lib/suppliers/dispatch';
import { recordActivity, requestIp } from '@/lib/audit/record';

export const runtime = 'nodejs';
export const maxDuration = 120;

/** ?status=&orderId= */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const orderId = sp.get('orderId') || undefined;
  return supplierRoute(
    async () => ({ orders: await supplierOrders({ status: sp.get('status') || undefined, orderId }) }),
    orderId ? 'products' : 'suppliers',
  );
}

/**
 * { action: 'dispatch', orderId, deliveryIds? }   buy pending supplier units now (after payment verify)
 * { action: 'retry', deliveryId }                  try again after a failure
 * { action: 'buy_anyway', deliveryId }             accept a higher supplier price (held for review)
 * { action: 'refresh', id }                        re-check one processing purchase now
 * { action: 'reveal', id }                         show what the supplier delivered (admin only)
 */
export async function POST(request: Request) {
  const b = await readJson<{
    action?: string;
    orderId?: string;
    deliveryId?: string;
    deliveryIds?: string[];
    id?: string;
    supplierProductId?: string;
    allowLoss?: boolean;
  }>(request);
  return supplierRoute(async (actor, session) => {
    const ip = requestIp(request);
    switch (b.action) {
      case 'dispatch': {
        if (!b.orderId) throw new SupplierInputError('orderId required.');
        // Give the browser's own save (payment + vault picks) a moment to land first.
        await new Promise((r) => setTimeout(r, 1500));
        const results = await dispatchOrder(b.orderId, { trigger: 'verify', deliveryIds: b.deliveryIds, actor });
        await recordActivity({
          userId: session.id,
          action: 'order.buy',
          entityType: 'order',
          entityId: b.orderId,
          summary: `Bought supplier stock for ${b.orderId}`,
          ip,
        });
        return { results };
      }
      case 'retry':
      case 'buy_anyway': {
        const unit = b.deliveryId ? await db.digitalDelivery.findUnique({ where: { id: b.deliveryId } }) : null;
        if (!unit) throw new SupplierInputError('Unit not found.');
        if (unit.supplierState === 'processing') throw new SupplierInputError('A purchase for this unit is already running.');
        const results = await dispatchOrder(unit.orderId, {
          trigger: 'manual',
          deliveryIds: [unit.id],
          actor,
          buyAnyway: b.action === 'buy_anyway',
        });
        await recordActivity({
          userId: session.id,
          action: 'order.buy',
          entityType: 'order',
          entityId: unit.orderId,
          summary: b.action === 'buy_anyway' ? `Bought ${unit.orderId} anyway` : `Retried the supplier buy for ${unit.orderId}`,
          ip,
        });
        return { results };
      }
      // From "Send credentials": buy this unit from the supplier item the admin picked.
      case 'buy_unit': {
        const unit = b.deliveryId ? await db.digitalDelivery.findUnique({ where: { id: b.deliveryId } }) : null;
        if (!unit) throw new SupplierInputError('Unit not found.');
        if (!b.supplierProductId) throw new SupplierInputError('Choose a supplier item.');
        if (unit.supplierState === 'processing') throw new SupplierInputError('A purchase for this unit is already running.');
        const results = await dispatchOrder(unit.orderId, {
          trigger: 'manual',
          deliveryIds: [unit.id],
          actor,
          supplierProductId: b.supplierProductId,
          buyAnyway: Boolean(b.allowLoss),
        });
        await recordActivity({
          userId: session.id,
          action: 'order.buy',
          entityType: 'order',
          entityId: unit.orderId,
          summary: `Bought a supplier item for ${unit.orderId}`,
          ip,
        });
        return { results };
      }
      case 'refresh': {
        if (!b.id) throw new SupplierInputError('id required.');
        await db.supplierOrder.update({ where: { id: b.id }, data: { nextPollAt: new Date(0) } });
        await pollSupplierOrders(5);
        return {};
      }
      case 'reveal': {
        if (!b.id) throw new SupplierInputError('id required.');
        return { result: await supplierOrderResult(b.id) };
      }
      default:
        throw new SupplierInputError('Unknown action.');
    }
  });
}
