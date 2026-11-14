import type { DigitalProduct } from '@/lib/admin-data';
import type { RowSupply, VariantRow } from './ProductsList';

export type ProductGroup = {
  product: DigitalProduct;
  planRows: VariantRow[];
  selectableVariantIds: string[];
  defaultOrFirstVariantId: string;
  totalOwnStock: number;
  allManual: boolean;
  hasSingleAutoVaultPlan: boolean;
  minPriceBDT: number | null;
  maxPriceBDT: number | null;
  uniqueSuppliers: Array<{ name: string; live: boolean; supply?: RowSupply }>;
  sellStatus: {
    tone: 'emerald' | 'amber' | 'red' | 'zinc';
    label: string;
  };
};

export function groupProductRows(rows: VariantRow[]): ProductGroup[] {
  const buckets = new Map<
    string,
    { product: DigitalProduct; rawRows: VariantRow[] }
  >();

  for (const row of rows) {
    let bucket = buckets.get(row.product.id);
    if (!bucket) {
      bucket = { product: row.product, rawRows: [] };
      buckets.set(row.product.id, bucket);
    }
    bucket.rawRows.push(row);
  }

  const groups: ProductGroup[] = [];
  for (const { product, rawRows } of buckets.values()) {
    const planRows = rawRows.filter((r) => !r.isPlaceholder);
    const selectableVariantIds = planRows.map((r) => r.variant.id);
    const defaultOrFirst =
      planRows.find((r) => r.variant.isDefault) || planRows[0];

    const prices = planRows.map((r) => r.variant.priceBDT);
    const minPriceBDT = prices.length ? Math.min(...prices) : null;
    const maxPriceBDT = prices.length ? Math.max(...prices) : null;

    const totalOwnStock = planRows.reduce((sum, r) => sum + r.stockCount, 0);
    const allManual =
      planRows.length > 0 &&
      planRows.every((r) => r.variant.deliveryMode === 'manual_dispatch');
    const hasSingleAutoVaultPlan =
      planRows.length === 1 && planRows[0].variant.deliveryMode === 'auto_vault';

    const supplierMap = new Map<
      string,
      { name: string; live: boolean; supply?: RowSupply }
    >();
    for (const r of planRows) {
      const first = r.supply?.links?.[0];
      if (!first) continue;
      const existing = supplierMap.get(first.supplierName);
      const isLive =
        first.supplierOn && first.status === 'available' && first.stock !== 0;
      if (!existing) {
        supplierMap.set(first.supplierName, {
          name: first.supplierName,
          live: isLive,
          supply: r.supply,
        });
      } else if (isLive && !existing.live) {
        existing.live = true;
      }
    }

    let sellStatus: ProductGroup['sellStatus'];
    if (product.status !== 'active') {
      sellStatus = { tone: 'zinc', label: 'Hidden' };
    } else if (planRows.length === 0) {
      sellStatus = { tone: 'zinc', label: 'No plans' };
    } else {
      const activePlans = planRows.filter((r) => r.variant.isActive !== false);
      if (activePlans.length === 0) {
        sellStatus = { tone: 'zinc', label: 'Plans off' };
      } else {
        const hasInStock = activePlans.some((r) =>
          r.supply ? r.supply.inStock : r.stockCount > 0,
        );
        const hasBackorder = activePlans.some((r) => r.supply?.backorder);
        if (hasInStock) {
          sellStatus = { tone: 'emerald', label: 'In stock' };
        } else if (hasBackorder) {
          sellStatus = { tone: 'amber', label: 'Back-order' };
        } else if (
          activePlans.every((r) => r.variant.deliveryMode === 'manual_dispatch')
        ) {
          sellStatus = { tone: 'emerald', label: 'Manual' };
        } else {
          sellStatus = { tone: 'red', label: 'Out of stock' };
        }
      }
    }

    groups.push({
      product,
      planRows,
      selectableVariantIds,
      defaultOrFirstVariantId: defaultOrFirst?.variant.id || '',
      totalOwnStock,
      allManual,
      hasSingleAutoVaultPlan,
      minPriceBDT,
      maxPriceBDT,
      uniqueSuppliers: Array.from(supplierMap.values()),
      sellStatus,
    });
  }

  return groups;
}
