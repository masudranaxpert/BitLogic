import assert from 'node:assert/strict';
import { splitBBCodeSegments } from './bbcode-segments';

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

console.log('bbcode-segments: ok');
