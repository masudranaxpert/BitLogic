import assert from 'node:assert/strict';
import {
  calculateDays,
  computeOrderExpiresAt,
  formatDurationChipLabel,
  formatDurationDays,
  parseDurationDays,
  planWarrantyDisplay,
  unitFromDays,
  warrantyWindow,
} from './warranty';

// 0 stays in the chosen unit instead of snapping back to days
assert.deepEqual(unitFromDays(0, 'hours'), { value: 0, unit: 'hours' });
assert.deepEqual(unitFromDays(0, 'months'), { value: 0, unit: 'months' });
assert.deepEqual(unitFromDays(0, 'years'), { value: 0, unit: 'years' });
assert.equal(formatDurationDays(0), '');

// Sub-day hours round-trip accurately with or without preferred unit
const halfDay = calculateDays(12, 'hours');
assert.equal(halfDay, 0.5);
assert.deepEqual(unitFromDays(halfDay, 'hours'), { value: 12, unit: 'hours' });
assert.deepEqual(unitFromDays(halfDay), { value: 12, unit: 'hours' });

// >= 24 hours stay in hours when preferredUnit === 'hours'
assert.deepEqual(unitFromDays(calculateDays(24, 'hours'), 'hours'), { value: 24, unit: 'hours' });
assert.deepEqual(unitFromDays(calculateDays(25, 'hours'), 'hours'), { value: 25, unit: 'hours' });
assert.deepEqual(unitFromDays(calculateDays(48, 'hours'), 'hours'), { value: 48, unit: 'hours' });

// Months and Years stay in their units
assert.deepEqual(unitFromDays(calculateDays(1, 'months'), 'months'), { value: 1, unit: 'months' });
assert.equal(calculateDays(1, 'years'), 365);
assert.equal(calculateDays(2, 'years'), 730);
assert.deepEqual(unitFromDays(365), { value: 1, unit: 'years' });
assert.deepEqual(unitFromDays(730), { value: 2, unit: 'years' });
assert.equal(formatDurationDays(calculateDays(12, 'hours'), 'hours'), '12 Hours');
assert.equal(formatDurationDays(calculateDays(24, 'hours'), 'hours'), '24 Hours');
assert.equal(formatDurationDays(30, 'months'), '1 Month');
assert.equal(formatDurationDays(365), '1 Year');
assert.equal(formatDurationDays(730, 'years'), '2 Years');

// parseDurationDays handles empty / 0 / None and Year inputs cleanly
assert.equal(parseDurationDays(''), 0);
assert.equal(parseDurationDays('0'), 0);
assert.equal(parseDurationDays('0 Days'), 0);
assert.equal(parseDurationDays('No duration'), 0);
assert.equal(parseDurationDays('1 Year'), 365);
assert.equal(parseDurationDays('2 Years'), 730);
assert.equal(parseDurationDays('1 Month'), 30);
assert.equal(parseDurationDays('12 Hours'), 0.5);
assert.equal(formatDurationChipLabel(1, 'years'), '1 Year');
assert.equal(formatDurationChipLabel(2, 'years'), '2 Years');
assert.equal(formatDurationChipLabel(1, 'none'), '');

// computeOrderExpiresAt returns null for 0/negative duration and YYYY-MM-DD for positive
const baseDate = new Date(2026, 10, 15, 10, 0, 0);
assert.equal(computeOrderExpiresAt(0, baseDate), null);
assert.equal(computeOrderExpiresAt(365, baseDate), '2027-11-15');
assert.equal(computeOrderExpiresAt(0.5, baseDate), '2026-11-15 22:00');

// Warranty window computes exact 12h range for 0.5 days
const start = new Date(2026, 10, 14, 10, 0, 0);
const win = warrantyWindow(start, 0.5);
assert.equal(win.startsAt, '2026-11-14 10:00');
assert.equal(win.endsAt, '2026-11-14 22:00');

// Storefront fallback avoids hardcoded '25D Warranty'
assert.deepEqual(planWarrantyDisplay(null), {
  isLoginOnly: false,
  badgeText: 'No Warranty',
  headline: 'No Warranty',
});
assert.deepEqual(planWarrantyDisplay({ warrantyType: 'login-only' }), {
  isLoginOnly: true,
  badgeText: 'Login Warranty',
  headline: 'Login Warranty Only',
});
assert.deepEqual(
  planWarrantyDisplay({
    warrantyType: 'warranty',
    warrantyBadge: '12H Warranty',
    warrantyHeadline: '12 Hours Replacement Warranty',
  }),
  {
    isLoginOnly: false,
    badgeText: '12H Warranty',
    headline: '12 Hours Replacement Warranty',
  },
);

console.log('warranty: ok');
