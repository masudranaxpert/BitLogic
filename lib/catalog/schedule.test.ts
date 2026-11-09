import assert from 'node:assert/strict';
import { listingWindow } from './schedule';

const soon = new Date(Date.now() + 86_400_000).toISOString();
const later = new Date(Date.now() + 2 * 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

assert.deepEqual(listingWindow([{ availableUntil: soon }, {}]), {});
assert.equal(listingWindow([{ availableFrom: soon }, { availableFrom: later }]).availableFrom, soon);
assert.equal(listingWindow([{ availableUntil: later }, { availableUntil: soon }]).availableUntil, soon);
assert.equal(listingWindow([{ availableUntil: past }]).availableUntil, past);

console.log('schedule: ok');
