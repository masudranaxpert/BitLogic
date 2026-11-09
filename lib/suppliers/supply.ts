import { db } from '@/lib/db';
import { getStoreSettings } from '@/lib/store-settings';

/**
 * Per-option availability = own stock + usable supplier items. One place for the storefront,
 * checkout and renewals so they always agree.
 */
export type PlanSupply = {
  /** Something can be delivered now (own stock, manual dispatch, or a usable supplier item). */
  inStock: boolean;
  /** Units we know we can deliver; null = not limited / unknown. */
  stock: number | null;
  /** Orders accepted even when not in stock (queued as pending). */
  backorder: boolean;
  canOrder: boolean;
  /** Short reason when it cannot be ordered (for messages). */
  reason: string;
  /** Own vault credentials ready to send. */
  own: number;
  /** Units the usable supplier items can still sell (null = supplier does not say); 0 when none usable. */
  supplier: number | null;
  /** Names of suppliers that can deliver right now, in fallback order. */
  suppliers: string[];
  /** Manual dispatch option: sent by hand, never counted. */
  manual: boolean;
};

type PlanRow = {
  id: string;
  code: string;
  deliveryMode: string;
  sourcing: string;
  pricingAlert: string;
  allowBackorder: boolean | null;
};
type ProductRow = { id: string; slug: string; plans: PlanRow[] };

const isSupplierSourced = (s: string) => s === 'supplier_auto' || s === 'supplier_manual' || s === 'own_then_supplier';

export async function planSupplyMap(products: ProductRow[]): Promise<Map<string, PlanSupply>> {
  const out = new Map<string, PlanSupply>();
  if (products.length === 0) return out;
  const settings = await getStoreSettings();
  const slugs = products.flatMap((p) => [p.slug, p.id]);
  const vault = await db.vaultCredential.findMany({
    where: { status: 'available', productId: { in: slugs } },
    select: { productId: true, variantId: true },
  });
  const supplierPlanIds = products.flatMap((p) => p.plans.filter((pl) => isSupplierSourced(pl.sourcing)).map((pl) => pl.id));
  const links = supplierPlanIds.length
    ? await db.planSupplierLink.findMany({
        where: { planId: { in: supplierPlanIds }, isActive: true },
        include: { supplierProduct: { include: { supplier: true } } },
      })
    : [];

  for (const p of products) {
    for (const plan of p.plans) {
      const own = vault.filter(
        (v) => (v.productId === p.slug || v.productId === p.id) && (v.variantId === plan.code || v.variantId === plan.id),
      ).length;
      const manualOwn = plan.deliveryMode === 'manual_dispatch';
      const usable = links.filter(
        (l) =>
          l.planId === plan.id &&
          l.supplierProduct.status === 'available' &&
          l.supplierProduct.supplier.isEnabled &&
          l.supplierProduct.supplier.purchasingEnabled &&
          !l.supplierProduct.supplier.lastSyncError.startsWith('AUTH') &&
          !l.supplierProduct.needsBuyerInput &&
          l.supplierProduct.minQty <= 1 &&
          (l.supplierProduct.stock === null || l.supplierProduct.stock > 0),
      );
      const supplierStock = usable.length
        ? usable.some((l) => l.supplierProduct.stock === null)
          ? null
          : usable.reduce((n, l) => n + (l.supplierProduct.stock || 0), 0)
        : 0;
      const alerts = plan.pricingAlert ? plan.pricingAlert.split(',').map((a) => a.split(':')[0]) : [];
      const priceBlocked =
        settings.supplierStopOnLoss && (alerts.includes('loss') || alerts.includes('jump') || alerts.includes('no_rate'));
      const supplierOk = usable.length > 0 && !priceBlocked;

      let inStock: boolean;
      let stock: number | null;
      let reason = '';
      switch (plan.sourcing) {
        case 'supplier_auto':
        case 'supplier_manual':
          inStock = supplierOk;
          stock = supplierOk ? supplierStock : 0;
          if (!inStock) reason = priceBlocked && usable.length ? 'Temporarily unavailable' : 'Out of stock';
          break;
        case 'own_then_supplier':
          inStock = own > 0 || manualOwn || supplierOk;
          stock = manualOwn ? null : supplierOk ? (supplierStock === null ? null : own + supplierStock) : own;
          if (!inStock) reason = 'Out of stock';
          break;
        default:
          inStock = manualOwn || own > 0;
          stock = manualOwn ? null : own;
          if (!inStock) reason = 'Out of stock';
      }
      const backorder = plan.allowBackorder === true;
      out.set(plan.id, {
        inStock,
        stock,
        backorder,
        canOrder: inStock || backorder,
        reason,
        own,
        supplier: supplierOk ? supplierStock : 0,
        suppliers: supplierOk ? [...new Set(usable.sort((a, b) => a.priority - b.priority).map((l) => l.supplierProduct.supplier.name))] : [],
        manual: manualOwn,
      });
    }
  }
  return out;
}

/** Message for a checkout line, or '' when this quantity can be ordered. */
export function supplyProblem(s: PlanSupply | undefined, qty: number, label: string): string {
  if (!s) return '';
  if (s.backorder) return '';
  if (!s.inStock) return `${label} is ${s.reason.toLowerCase() || 'out of stock'}.`;
  if (s.stock !== null && qty > s.stock) return `Only ${s.stock} of ${label} left.`;
  return '';
}
