import assert from 'node:assert/strict';
import type { Product } from '@/lib/products';
import { fuzzySearchProducts } from './fuzzy-search';

function makeProduct(
  id: string,
  name: string,
  platform: string,
  code: Product['code'] = 'AI',
  planLabels: string[] = ['1 Month'],
): Product {
  return {
    id,
    name,
    platform,
    code,
    tagline: `${name} subscription`,
    description: '',
    image: '',
    gallery: [],
    features: [],
    plans: planLabels.map((label, idx) => ({
      id: `${id}-p${idx}`,
      label,
      duration: '1 Month',
      price: 500,
      currency: 'BDT',
    })),
  };
}

const catalog: Product[] = [
  makeProduct('canva', 'Canva', 'Canva', 'CREATE', ['Canva Pro 1 Year']),
  makeProduct('capcut', 'CapCut', 'ByteDance', 'CREATE', ['CapCut Pro 1 Month']),
  makeProduct('chatgpt', 'ChatGPT', 'OpenAI', 'AI', ['ChatGPT GO', 'ChatGPT Plus Shared']),
  makeProduct('claude', 'Claude', 'Anthropic', 'AI', ['Claude Pro 1 Month']),
  makeProduct('elevenlabs', 'ElevenLabs', 'ElevenLabs', 'AI', ['Creator 1 Month']),
  makeProduct('gemini', 'Gemini', 'Google', 'AI', ['Google AI Pro']),
  makeProduct('youtube-premium', 'YouTube Premium', 'Google', 'STREAM', ['Family Plan']),
];

// Empty query preserves original catalog order.
assert.deepEqual(
  fuzzySearchProducts(catalog, '   ').map((p) => p.id),
  catalog.map((p) => p.id),
);

// Exact & prefix ranking.
assert.equal(fuzzySearchProducts(catalog, 'chatgpt')[0]?.id, 'chatgpt');
assert.equal(fuzzySearchProducts(catalog, 'gpt')[0]?.id, 'chatgpt');
assert.equal(fuzzySearchProducts(catalog, 'anthropic')[0]?.id, 'claude');

// Transpositions, omissions, and phonetic substitutions.
assert.equal(fuzzySearchProducts(catalog, 'chatpgt')[0]?.id, 'chatgpt');
assert.equal(fuzzySearchProducts(catalog, 'gtp')[0]?.id, 'chatgpt');
assert.equal(fuzzySearchProducts(catalog, 'gmini')[0]?.id, 'gemini');
assert.equal(fuzzySearchProducts(catalog, 'claud')[0]?.id, 'claude');
assert.equal(fuzzySearchProducts(catalog, 'cnava')[0]?.id, 'canva');
assert.equal(fuzzySearchProducts(catalog, 'canba')[0]?.id, 'canva');
assert.equal(fuzzySearchProducts(catalog, 'kapcut')[0]?.id, 'capcut');
assert.equal(fuzzySearchProducts(catalog, 'youtub')[0]?.id, 'youtube-premium');

// Space mismatches and camelCase initials.
assert.equal(fuzzySearchProducts(catalog, 'chat gpt')[0]?.id, 'chatgpt');
assert.equal(fuzzySearchProducts(catalog, 'cap cut')[0]?.id, 'capcut');
assert.equal(fuzzySearchProducts(catalog, 'ytp')[0]?.id, 'youtube-premium');

// Multi-token & plan label matching ranks exact multi-token hits first.
assert.equal(fuzzySearchProducts(catalog, 'gpt go')[0]?.id, 'chatgpt');
assert.equal(fuzzySearchProducts(catalog, 'google ai')[0]?.id, 'gemini');

// Unmatched gibberish returns no false positives.
assert.deepEqual(fuzzySearchProducts(catalog, 'zzzzqwerty'), []);
assert.deepEqual(fuzzySearchProducts(catalog, 'xyzk123'), []);

console.log('fuzzy-search.test.ts: ALL PASSED');
