import assert from 'node:assert/strict';
import { allowsSupplierDispatch, classifySupplierFailure, isSupplierSourced, isValidSourcing } from './sourcing';

assert.equal(isValidSourcing('own_then_supplier_manual'), true);
assert.equal(isSupplierSourced('own_then_supplier_manual'), true);
assert.equal(isSupplierSourced('own'), false);

// Auto modes buy on payment verify, sweep, and manual retry.
assert.equal(allowsSupplierDispatch('own_then_supplier', 'verify'), true);
assert.equal(allowsSupplierDispatch('own_then_supplier', 'sweep'), true);
assert.equal(allowsSupplierDispatch('supplier_auto', 'verify'), true);

// Vault-first manual supplier fallback must NOT auto-buy on verify or background sweep.
assert.equal(allowsSupplierDispatch('own_then_supplier_manual', 'verify'), false);
assert.equal(allowsSupplierDispatch('own_then_supplier_manual', 'sweep'), false);
assert.equal(allowsSupplierDispatch('own_then_supplier_manual', 'renewal'), false);
// Only buys when admin explicitly clicks Buy (manual trigger).
assert.equal(allowsSupplierDispatch('own_then_supplier_manual', 'manual'), true);

// Pure supplier manual behaves identically on triggers.
assert.equal(allowsSupplierDispatch('supplier_manual', 'verify'), false);
assert.equal(allowsSupplierDispatch('supplier_manual', 'manual'), true);

// Vault-only never dispatches unless admin picks explicit supplier item manually.
assert.equal(allowsSupplierDispatch('own', 'verify'), false);
assert.equal(allowsSupplierDispatch('own', 'manual', false), false);
assert.equal(allowsSupplierDispatch('own', 'manual', true), true);

// Failure classification: low balance & account blockers hand over to manual delivery instead of retry loops.
assert.equal(classifySupplierFailure('BALANCE'), 'manual');
assert.equal(classifySupplierFailure('AUTH'), 'manual');
assert.equal(classifySupplierFailure('LIMIT'), 'manual');
assert.equal(classifySupplierFailure('PRICE_TOO_HIGH'), 'review');
assert.equal(classifySupplierFailure('OUT_OF_STOCK'), 'next');

console.log('sourcing: ok');
