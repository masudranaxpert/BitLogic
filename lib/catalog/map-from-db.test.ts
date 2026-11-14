import assert from 'node:assert/strict';
import type { CatalogCategory, Product as DbProduct, ProductPlan as DbPlan } from '@prisma/client';
import { mapDbProductToCatalog } from './map-from-db';

const baseProduct: DbProduct & { plans: DbPlan[]; catalogCategory: CatalogCategory | null } = {
  id: 'p1',
  slug: 'chatgpt-plus',
  name: 'ChatGPT',
  description: 'Full description details',
  tagline: 'OpenAI',
  category: 'AI',
  categoryId: null,
  platform: 'OpenAI',
  badge: null,
  sale: false,
  featured: false,
  imageUrl: '/uploads/media/chatgpt.webp',
  galleryJson: '["/uploads/media/chatgpt.webp"]',
  featuresJson: '[]',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  sku: 'BL-PRD-100',
  status: 'active',
  plans: [],
  catalogCategory: null,
};

const mapped = mapDbProductToCatalog(baseProduct);
assert.equal(mapped.availability, 'out_of_stock');
assert.equal(mapped.acceptOrdersWhenOutOfStock, false);
assert.equal(mapped.plans.length, 0);
assert.equal(mapped.description, 'Full description details');

console.log('map-from-db: ok');
