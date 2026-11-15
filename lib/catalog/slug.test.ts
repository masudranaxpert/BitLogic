import assert from 'node:assert/strict';
import { resolveNewProductSlug, slugifyProductName } from './slug';

assert.equal(slugifyProductName('Gemini AI'), 'gemini-ai');
assert.equal(slugifyProductName('  ChatGPT Plus (Pro)! '), 'chatgpt-plus-pro');
assert.equal(slugifyProductName('Café Studio'), 'cafe-studio');

assert.equal(resolveNewProductSlug('prod-1794646257113', 'ChatGPT'), 'chatgpt');
assert.equal(resolveNewProductSlug('prod-gemini-ai', 'Gemini'), 'gemini-ai');
assert.equal(resolveNewProductSlug('', 'Claude Pro'), 'claude-pro');
assert.equal(resolveNewProductSlug('canva-pro', 'Canva'), 'canva-pro');

console.log('slug: ok');
