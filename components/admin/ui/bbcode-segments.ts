export type BBCodeSegment =
  | { kind: 'heading'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'paragraph'; text: string };

const BULLET_LINE_RE = /^\s*[•\-]\s+([\s\S]+)$/;
const STANDALONE_BOLD_RE = /^\[b\]([\s\S]+?)\[\/b\]$/i;

/** Splits a plain BBCode text block into headings, bullet lists, and paragraphs for cleaner reading rhythm. */
export function splitBBCodeSegments(block: string): BBCodeSegment[] {
  const lines = block.split(/\r?\n/);
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
    const line = rawLine.trim();
    if (!line) {
      flushList();
      flushPara();
      continue;
    }

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
