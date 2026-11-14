import assert from 'node:assert/strict';
import { applyBulletLines, splitBBCodeSegments } from './bbcode-segments';

const sample = `[b]ChatGPT[/b]
একটা ইমেইল কীভাবে শুরু করবেন ভাবছেন?

[b]ChatGPT দিয়ে কী কী করা যায়?[/b]
• [b]লেখালেখি ও অনুবাদ[/b] — ইমেইল, সিভি
• [b]কোডিং[/b] — Python, JavaScript`;

const segs = splitBBCodeSegments(sample);
assert.deepEqual(segs, [
  { kind: 'heading', text: 'ChatGPT' },
  { kind: 'paragraph', text: 'একটা ইমেইল কীভাবে শুরু করবেন ভাবছেন?' },
  { kind: 'heading', text: 'ChatGPT দিয়ে কী কী করা যায়?' },
  {
    kind: 'list',
    items: [
      '[b]লেখালেখি ও অনুবাদ[/b] — ইমেইল, সিভি',
      '[b]কোডিং[/b] — Python, JavaScript',
    ],
  },
]);

// Supports dash, BBCode [*] / [list], and asterisk bullets (usable inside [quote] too).
assert.deepEqual(
  splitBBCodeSegments(`Intro line\n- Alpha\n[*] Beta\n[list][*] Gamma [*] Delta[/list]`),
  [
    { kind: 'paragraph', text: 'Intro line' },
    { kind: 'list', items: ['Alpha', 'Beta', 'Gamma', 'Delta'] },
  ]
);

// Selection bullet formatting prefixes non-empty lines inside [quote]...[/quote] without double prefixing.
const quoted = '[quote]\nLine one\n- Line two\n[/quote]';
const formatted = applyBulletLines(quoted, 8, quoted.indexOf('\n[/quote]'));
assert.equal(formatted, '[quote]\n- Line one\n- Line two\n[/quote]');

console.log('bbcode-segments: ok');
