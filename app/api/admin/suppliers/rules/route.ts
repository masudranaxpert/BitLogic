import { saveRatesAndRules, supplierOverview } from '@/lib/suppliers/admin';
import { readJson, supplierRoute } from '@/lib/suppliers/api';

export const runtime = 'nodejs';

/** { rates?: { USD: 150, USDT: 150 }, rules?: { supplierAutoDispatch, supplierPriceGuardPct, supplierStopOnLoss, supplierMaxLossPct } } */
export async function PUT(request: Request) {
  const body = await readJson<{ rates?: Record<string, number>; rules?: Record<string, number | boolean> }>(request);
  return supplierRoute(async (actor) => {
    await saveRatesAndRules(body, actor);
    const o = await supplierOverview();
    return { rates: o.rates, rules: o.rules };
  });
}
