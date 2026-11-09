/** Money maths for supplier-backed options. Pure functions: safe on server and client. */

export type RateMap = Record<string, number>;

export const DEFAULT_RATES: RateMap = { USD: 150, USDT: 150 };

export type PlanPricing = {
  pricingMode: string;
  markupPercent: number;
  markupFlatBdt: number;
  roundToBdt: number;
  minMarginBdt: number;
};

/** Supplier price (decimal string) in taka, rounded up to a whole taka. null = no rate for that currency. */
export function costInBdt(price: string, currency: string, rates: RateMap): number | null {
  const rate = rates[currency.toUpperCase()];
  const p = Number(price);
  if (!rate || !Number.isFinite(p) || p < 0) return null;
  // Work in hundredths to avoid 0.285 * 150 = 42.74999…
  return Math.ceil(Math.round(p * rate * 100) / 100);
}

/** Selling price for auto pricing: cost × (1 + markup%) + flat, never below cost + min margin, rounded up. */
export function autoPrice(costBdt: number, p: PlanPricing): number {
  const step = Math.max(1, Math.round(p.roundToBdt || 1));
  const raw = costBdt * (1 + Math.max(0, p.markupPercent) / 100) + Math.max(0, p.markupFlatBdt);
  const floor = costBdt + Math.max(0, p.minMarginBdt);
  return Math.ceil(Math.max(raw, floor) / step) * step;
}

/** Profit in taka and as % of the selling price. */
export function margin(priceBdt: number, costBdt: number) {
  const bdt = priceBdt - costBdt;
  return { bdt, pct: priceBdt > 0 ? Math.round((bdt / priceBdt) * 1000) / 10 : 0 };
}

/** Highest supplier unit price we accept when buying, so a unit never costs more than allowed. */
export function maxUnitPriceFor(saleBdt: number, rate: number, maxLossPct: number): string {
  const ceilingBdt = saleBdt * (1 + Math.max(0, maxLossPct) / 100);
  return (Math.floor((ceilingBdt / rate) * 10000) / 10000).toFixed(4);
}
