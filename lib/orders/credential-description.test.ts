import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPlanDefaultDescriptionMap,
  lookupPlanDefaultDescription,
  resolveCredentialDescription,
} from './credential-description';

test('resolveCredentialDescription prefers per-credential note over plan default', () => {
  assert.equal(
    resolveCredentialDescription('Custom step for this account', 'Default plan step'),
    'Custom step for this account',
  );
});

test('resolveCredentialDescription falls back to plan default when credential note is blank', () => {
  assert.equal(
    resolveCredentialDescription('', 'Default auto-supply guide'),
    'Default auto-supply guide',
  );
  assert.equal(
    resolveCredentialDescription('   \n  ', 'Default auto-supply guide'),
    'Default auto-supply guide',
  );
  assert.equal(resolveCredentialDescription(null, 'Default'), 'Default');
  assert.equal(resolveCredentialDescription(null, '  '), undefined);
});

test('buildPlanDefaultDescriptionMap resolves both product id/slug and plan id/code', () => {
  const map = buildPlanDefaultDescriptionMap([
    {
      id: 'plan_db_1',
      code: 'gemini-plus-6m',
      defaultCredentialDescription: '  Open link and click Redeem.  ',
      product: { id: 'prod_db_1', slug: 'gemini' },
    },
    {
      id: 'plan_db_2',
      code: 'empty-plan',
      defaultCredentialDescription: '   ',
      product: { id: 'prod_db_1', slug: 'gemini' },
    },
  ]);

  assert.equal(
    lookupPlanDefaultDescription(map, 'gemini', 'gemini-plus-6m'),
    'Open link and click Redeem.',
  );
  assert.equal(
    lookupPlanDefaultDescription(map, 'prod_db_1', 'plan_db_1'),
    'Open link and click Redeem.',
  );
  assert.equal(lookupPlanDefaultDescription(map, 'gemini', 'empty-plan'), undefined);
});
