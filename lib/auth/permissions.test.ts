import assert from 'node:assert/strict';
import {
  canChangeOwnEmail,
  parsePermissionsJson,
} from './permissions';
import { ROLES } from './roles';

assert.equal(canChangeOwnEmail(ROLES.ADMIN, []), true);
assert.equal(canChangeOwnEmail(ROLES.STAFF, ['orders', 'tickets']), false);
assert.equal(
  canChangeOwnEmail(ROLES.STAFF, ['orders', 'profile_email']),
  true,
);
assert.equal(canChangeOwnEmail(ROLES.CUSTOMER, ['profile_email']), false);

assert.deepEqual(
  parsePermissionsJson('["orders","profile_email","unknown_key"]'),
  ['orders', 'profile_email'],
);

console.log('permissions: ok');
