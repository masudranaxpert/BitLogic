import assert from 'node:assert/strict';
import {
  calculateDays,
  formatDurationDays,
  unitFromDays,
  warrantyWindow,
} from './warranty';

// 0 stays in the chosen unit instead of snapping back to days
assert.deepEqual(unitFromDays(0, 'hours'), { value: 0, unit: 'hours' });
assert.deepEqual(unitFromDays(0, 'months'), { value: 0, unit: 'months' });

// Sub-day hours round-trip accurately with or without preferred unit
const halfDay = calculateDays(12, 'hours');
assert.equal(halfDay, 0.5);
assert.deepEqual(unitFromDays(halfDay, 'hours'), { value: 12, unit: 'hours' });
assert.deepEqual(unitFromDays(halfDay), { value: 12, unit: 'hours' });

// >= 24 hours stay in hours when preferredUnit === 'hours'
assert.deepEqual(unitFromDays(calculateDays(24, 'hours'), 'hours'), { value: 24, unit: 'hours' });
assert.deepEqual(unitFromDays(calculateDays(25, 'hours'), 'hours'), { value: 25, unit: 'hours' });
assert.deepEqual(unitFromDays(calculateDays(48, 'hours'), 'hours'), { value: 48, unit: 'hours' });

// Months stay in months
assert.deepEqual(unitFromDays(calculateDays(1, 'months'), 'months'), { value: 1, unit: 'months' });
assert.equal(formatDurationDays(calculateDays(12, 'hours'), 'hours'), '12 Hours');
assert.equal(formatDurationDays(calculateDays(24, 'hours'), 'hours'), '24 Hours');
assert.equal(formatDurationDays(30, 'months'), '1 Month');

// Warranty window computes exact 12h range for 0.5 days
const start = new Date(2026, 10, 14, 10, 0, 0);
const win = warrantyWindow(start, 0.5);
assert.equal(win.startsAt, '2026-11-14 10:00');
assert.equal(win.endsAt, '2026-11-14 22:00');

console.log('warranty: ok');
