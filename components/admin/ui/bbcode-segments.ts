export type BBCodeSegment =
  | { kind: 'heading'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'paragraph'; text: string };

const BULLET_LINE_RE = /^\s*(?:[•\-]\s+|\*\s+|\[\*\]\s*)([\s\S]+)$/;
const STANDALONE_BOLD_RE = /^\[b\]([\s\S]+?)\[\/b\]$/i;

/** Splits a plain BBCode text block into headings, bullet lists, and paragraphs for cleaner reading rhythm. */
export function splitBBCodeSegments(block: string): BBCodeSegment[] {
  const normalized = block.replace(/([^\r\n])\[\*\]/g, '$1\n[*]');
  const lines = normalized.split(/\r?\n/);
  const out: BBCodeSegment[] = [];
  let listBuf: string[] = [];
  let paraBuf: string[] = [];

  const flushList = () => {
    if (listBuf.length === 0) return;
    out.push({ kind: 'list', items: listBuf });
    listBuf = [];
  };

  const flushPara = () => {
    if (paraBuf.length === 0) return;
    out.push({ kind: 'paragraph', text: paraBuf.join('\n') });
    paraBuf = [];
  };

  for (const rawLine of lines) {
    const trimmedRaw = rawLine.trim();
    if (!trimmedRaw) {
      flushList();
      flushPara();
      continue;
    }

    const line = trimmedRaw.replace(/\[\/?list\]/gi, '').trim();
    if (!line) continue;

    const bulletMatch = line.match(BULLET_LINE_RE);
    if (bulletMatch) {
      flushPara();
      listBuf.push(bulletMatch[1].trim());
      continue;
    }

    flushList();

    const boldMatch = line.match(STANDALONE_BOLD_RE);
    if (boldMatch && !boldMatch[1].includes('[b]') && boldMatch[1].trim().length <= 120) {
      flushPara();
      out.push({ kind: 'heading', text: boldMatch[1].trim() });
      continue;
    }

    paraBuf.push(line);
  }

  flushList();
  flushPara();
  return out;
}

/** Inserts bullet syntax at the cursor or prefixes selected non-empty lines with `- `. */
export function applyBulletLines(value: string, start: number, end: number): string {
  if (start !== end) {
    const selected = value.slice(start, end);
    const formatted = selected
      .split(/\r?\n/)
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;
        return BULLET_LINE_RE.test(trimmed) ? line : `- ${trimmed}`;
      })
      .join('\n');
    return `${value.slice(0, start)}${formatted}${value.slice(end)}`;
  }

  const sample = '- Item 1\n- Item 2';
  if (!value) return sample;
  const needsBreak = start > 0 && value[start - 1] !== '\n';
  return `${value.slice(0, start)}${needsBreak ? '\n' : ''}${sample}${value.slice(end)}`;
}
