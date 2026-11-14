import assert from 'node:assert/strict';
import type { DigitalProduct, ProductVariant } from '@/lib/admin/types';
import { groupProductRows } from './products-grouping';

function makeProduct(overrides: Partial<DigitalProduct> = {}): DigitalProduct {
  return {
    id: 'p-1',
    name: 'ChatGPT',
    category: 'AI & LLM Tools',
    sku: 'AI-CGPT',
    status: 'active',
    shortDescription: '',
    variants: [],
    ...overrides,
  };
}

function makeVariant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: 'v-1',
    productId: 'p-1',
    name: 'Go',
    isDefault: false,
    isActive: true,
    durationDays: 30,
    durationLabel: '1 Month',
    priceBDT: 950,
    priceUSD: 8,
    credentialType: 'email_login',
    deliveryMode: 'auto_vault',
    stockDisplayMode: 'exact_count',
    vpnRequired: false,
    vpnRegionNote: '',
    hasWarranty: true,
    warrantyDays: 30,
    warrantyTerms: '',
    deviceLimit: '',
    loginInstructions: [],
    importantNote: '',
    specifications: [],
    ...overrides,
  };
}

const p1 = makeProduct({ id: 'p-1', name: 'ChatGPT', status: 'active' });
const p2 = makeProduct({ id: 'p-2', name: 'CapCut', status: 'draft' });

const groups = groupProductRows([
  {
    product: p1,
    variant: makeVariant({ id: 'v-go', name: 'GO', priceBDT: 950, isDefault: true }),
    isPlaceholder: false,
    stockCount: 0,
    supply: {
      inStock: true,
      canOrder: true,
      backorder: false,
      manual: false,
      sourcing: 'supplier_auto',
      suppliers: ['Jaha Digital'],
      links: [
        {
          supplierName: 'Jaha Digital',
          name: 'ChatGPT GO 1M',
          stock: 49,
          status: 'available',
          supplierOn: true,
        },
      ],
    },
  },
  {
    product: p1,
    variant: makeVariant({ id: 'v-plus', name: 'Plus', priceBDT: 2350 }),
    isPlaceholder: false,
    stockCount: 3,
  },
  {
    product: p2,
    variant: makeVariant({ id: '__no-plan__:p-2', productId: 'p-2', name: 'No plans yet', priceBDT: 0 }),
    isPlaceholder: true,
    stockCount: 0,
  },
]);

assert.equal(groups.length, 2);
assert.equal(groups[0].planRows.length, 2);
assert.equal(groups[0].minPriceBDT, 950);
assert.equal(groups[0].maxPriceBDT, 2350);
assert.equal(groups[0].totalOwnStock, 3);
assert.equal(groups[0].uniqueSuppliers.length, 1);
assert.equal(groups[0].uniqueSuppliers[0].live, true);
assert.equal(groups[0].sellStatus.label, 'In stock');
assert.equal(groups[0].defaultOrFirstVariantId, 'v-go');

assert.equal(groups[1].planRows.length, 0);
assert.equal(groups[1].minPriceBDT, null);
assert.equal(groups[1].sellStatus.label, 'Hidden');

console.log('products-grouping: ok');
