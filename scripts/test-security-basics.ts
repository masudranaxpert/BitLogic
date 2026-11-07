/**
 * Smoke checks for non-payment security fixes.
 * Run: npx tsx scripts/test-security-basics.ts
 */
import assert from 'node:assert/strict';
import {
  accessTokensMatch,
  generateOrderAccessToken,
} from '../lib/orders/access-token';
import { decryptSecret, encryptSecret } from '../lib/crypto/secrets';

process.env.AUTH_SECRET =
  process.env.AUTH_SECRET || 'test-secret-at-least-16-chars';

const a = generateOrderAccessToken();
const b = generateOrderAccessToken();
assert.notEqual(a, b);
assert.equal(accessTokensMatch(a, a), true);
assert.equal(accessTokensMatch(a, b), false);
assert.equal(accessTokensMatch(a, ''), false);
assert.equal(accessTokensMatch(null, a), false);

const plain = 'user:pass-secret';
const enc = encryptSecret(plain);
assert.notEqual(enc, plain);
assert.ok(enc.startsWith('enc:v1:'));
assert.equal(decryptSecret(enc), plain);
assert.equal(decryptSecret(plain), plain); // legacy plaintext
assert.equal(encryptSecret(enc), enc); // idempotent

console.log('ok — access tokens + secret encryption');
