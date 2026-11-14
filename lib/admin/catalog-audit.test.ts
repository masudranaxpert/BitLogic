import assert from 'node:assert/strict';
import {
  buildProductAuditEvents,
  planToggleAuditEvent,
} from './catalog-audit';

const created = buildProductAuditEvents({
  isNew: true,
  productName: 'ChatGPT',
  productSlug: 'prod-chatgpt',
  beforePlans: [],
  afterPlans: [
    { code: 'p1', label: 'Shared 1M', isActive: true, priceBdt: 350 },
    { code: 'p2', label: 'Private 1M', isActive: false, priceBdt: 2350 },
  ],
  removedPlans: [],
});
assert.equal(created.length, 1);
assert.equal(created[0].action, 'product.create');
assert.match(created[0].summary, /2 plans, 1 active/);

const toggledOff = buildProductAuditEvents({
  isNew: false,
  productName: 'ChatGPT',
  productSlug: 'prod-chatgpt',
  beforePlans: [
    { code: 'p1', label: 'Shared 1M', isActive: true, priceBdt: 350 },
  ],
  afterPlans: [
    { code: 'p1', label: 'Shared 1M', isActive: false, priceBdt: 350 },
  ],
  removedPlans: [],
});
assert.equal(toggledOff.length, 1);
assert.equal(toggledOff[0].action, 'product.plan_off');
assert.equal(
  toggledOff[0].summary,
  'Turned OFF plan "Shared 1M" on "ChatGPT"',
);

const mixed = buildProductAuditEvents({
  isNew: false,
  productName: 'Claude',
  productSlug: 'prod-claude',
  beforePlans: [
    { code: 'p1', label: 'Pro 1M', isActive: false, priceBdt: 1800 },
    { code: 'p2', label: 'Team 1M', isActive: true, priceBdt: 2500 },
  ],
  afterPlans: [
    { code: 'p1', label: 'Pro 1M', isActive: true, priceBdt: 1900 },
    { code: 'p3', label: 'Max 1M', isActive: true, priceBdt: 4500 },
  ],
  removedPlans: [{ code: 'p2', label: 'Team 1M', isActive: true, priceBdt: 2500 }],
});
assert.deepEqual(
  mixed.map((e) => e.action),
  ['product.plan_on', 'product.plan_add', 'product.plan_remove', 'product.save'],
);

const quick = planToggleAuditEvent('Gemini', 'prod-gemini', 'Pro 1M', false);
assert.equal(quick.action, 'product.plan_off');
assert.equal(quick.summary, 'Turned OFF plan "Pro 1M" on "Gemini"');

console.log('catalog-audit: ok');
