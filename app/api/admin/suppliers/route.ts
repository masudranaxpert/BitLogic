import { createSupplier, supplierOverview } from '@/lib/suppliers/admin';
import { readJson, supplierRoute } from '@/lib/suppliers/api';
import { recordActivity, requestIp } from '@/lib/audit/record';

export const runtime = 'nodejs';

export async function GET() {
  return supplierRoute(() => supplierOverview());
}

/** Add a supplier: { kind, name?, apiKey, baseUrl? }. The key is checked before saving. */
export async function POST(request: Request) {
  return supplierRoute(async (_actor, session) => {
    const supplier = await createSupplier(await readJson(request));
    await recordActivity({
      userId: session.id,
      action: 'supplier.create',
      entityType: 'supplier',
      entityId: supplier?.id || '',
      summary: `Added supplier ${supplier?.name || ''}`.trim(),
      ip: requestIp(request),
    });
    return { supplier };
  });
}
