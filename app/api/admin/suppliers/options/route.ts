import {
  SupplierInputError,
  linkPlan,
  linkedOptions,
  moveLink,
  suggestLinks,
  unlinkPlan,
  updatePlanSourcing,
} from '@/lib/suppliers/admin';
import { readJson, supplierRoute } from '@/lib/suppliers/api';
import { recordActivity, requestIp } from '@/lib/audit/record';

export const runtime = 'nodejs';

/** Our options with sourcing, links, cost and margin. ?productId= narrows to one product. */
export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get('productId') || undefined;
  // Product editors can read this panel too.
  return supplierRoute(async () => ({ products: await linkedOptions({ productId }) }), productId ? 'products' : 'suppliers');
}

/** Change an option's sourcing / pricing / renewal / back-order settings. */
export async function PATCH(request: Request) {
  const body = await readJson<{ planId?: string } & Record<string, unknown>>(request);
  return supplierRoute(async (actor) => {
    if (!body.planId) throw new SupplierInputError('planId required.');
    await updatePlanSourcing(String(body.planId), body as Parameters<typeof updatePlanSourcing>[1], actor);
    return { products: await linkedOptions() };
  });
}

/** { action: link|unlink|up|down|suggest, planId?, supplierProductId?, linkId? } */
export async function POST(request: Request) {
  const b = await readJson<{ action?: string; planId?: string; supplierProductId?: string; linkId?: string }>(request);
  return supplierRoute(async (_actor, session) => {
    const ip = requestIp(request);
    switch (b.action) {
      case 'link':
        if (!b.planId || !b.supplierProductId) throw new SupplierInputError('Choose an option and a supplier item.');
        await linkPlan(b.planId, b.supplierProductId);
        await recordActivity({
          userId: session.id,
          action: 'plan.link',
          entityType: 'plan',
          entityId: b.planId,
          summary: `Linked a supplier item to a plan`,
          ip,
        });
        return {};
      case 'unlink':
        if (!b.linkId) throw new SupplierInputError('linkId required.');
        await unlinkPlan(b.linkId);
        await recordActivity({
          userId: session.id,
          action: 'plan.unlink',
          entityType: 'plan',
          entityId: b.linkId,
          summary: `Unlinked a supplier item`,
          ip,
        });
        return {};
      case 'up':
      case 'down':
        if (!b.linkId) throw new SupplierInputError('linkId required.');
        await moveLink(b.linkId, b.action === 'up' ? -1 : 1);
        return {};
      case 'suggest':
        if (!b.planId) throw new SupplierInputError('planId required.');
        return { suggestions: await suggestLinks(b.planId) };
      default:
        throw new SupplierInputError('Unknown action.');
    }
  });
}
