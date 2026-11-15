import type { Product } from '@/lib/products';

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compact(value: string): string {
  return value.replace(/\s+/g, '');
}

/** Split camelCase / PascalCase and whitespace into lowercase words + original boundary flags. */
function extractWords(raw: string): string[] {
  return normalize(raw.replace(/([a-z0-9])([A-Z])/g, '$1 $2'))
    .split(' ')
    .filter(Boolean);
}

/**
 * Optimal String Alignment (restricted Damerau-Levenshtein) distance with early exit.
 * Treats adjacent transpositions (e.g. `chatpgt` <-> `chatgpt`) as distance 1.
 */
function osaDistance(a: string, b: string, maxDist: number): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > maxDist) return maxDist + 1;
  if (a === b) return 0;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;

  for (let i = 1; i <= m; i += 1) {
    let rowMin = maxDist + 1;
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let val = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        val = Math.min(val, dp[i - 2][j - 2] + 1);
      }
      dp[i][j] = val;
      if (val < rowMin) rowMin = val;
    }
    if (rowMin > maxDist) return maxDist + 1;
  }

  return dp[m][n];
}

function allowedEdits(len: number): number {
  if (len <= 2) return 0;
  if (len <= 4) return 1;
  if (len <= 7) return 2;
  return Math.min(3, Math.floor(len / 3));
}

function subsequenceScore(query: string, rawTarget: string, normTarget: string): number {
  if (query.length < 2 || normTarget.length < query.length) return 0;

  // Build camelCase / word-start flags aligned with alphanumeric chars.
  const strippedRaw = rawTarget.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const targetChars: string[] = [];
  const isBoundary: boolean[] = [];
  let prevWasSpaceOrPunct = true;
  let prevWasLowerOrDigit = false;

  for (let i = 0; i < strippedRaw.length; i += 1) {
    const ch = strippedRaw[i];
    if (/[a-zA-Z0-9]/.test(ch)) {
      const isUpper = ch >= 'A' && ch <= 'Z';
      targetChars.push(ch.toLowerCase());
      isBoundary.push(prevWasSpaceOrPunct || (isUpper && prevWasLowerOrDigit));
      prevWasSpaceOrPunct = false;
      prevWasLowerOrDigit = !isUpper;
    } else {
      prevWasSpaceOrPunct = true;
      prevWasLowerOrDigit = false;
    }
  }

  let qi = 0;
  let firstMatch = -1;
  let lastMatch = -1;
  let consecutive = 0;
  let maxConsecutive = 0;
  let boundaryHits = 0;
  let prevMatch = -2;

  for (let ti = 0; ti < targetChars.length && qi < query.length; ti += 1) {
    if (targetChars[ti] === query[qi]) {
      if (firstMatch === -1) firstMatch = ti;
      lastMatch = ti;
      if (ti === prevMatch + 1) {
        consecutive += 1;
      } else {
        consecutive = 1;
      }
      if (consecutive > maxConsecutive) maxConsecutive = consecutive;
      if (isBoundary[ti]) boundaryHits += 1;
      prevMatch = ti;
      qi += 1;
    }
  }

  if (qi < query.length) return 0;

  const span = lastMatch - firstMatch + 1;
  const density = query.length / span;
  const boundaryRatio = boundaryHits / query.length;

  // Reject sparse accidental subsequences unless mostly word/camelCase initials.
  if (density < 0.42 && boundaryRatio < 0.65) return 0;

  return Math.round(
    34 + density * 16 + boundaryRatio * 14 + Math.min(maxConsecutive, 4) * 2.5,
  );
}

/** Score a single normalized query token against a raw text field (0..100). */
export function scoreField(rawTarget: string, token: string): number {
  const norm = normalize(rawTarget);
  if (!norm || !token) return 0;

  if (norm === token) return 100;
  if (norm.startsWith(token)) return 90 - Math.min(6, (norm.length - token.length) * 0.25);

  const compTarget = compact(norm);
  const compToken = compact(token);
  if (compToken && compTarget === compToken) return 94;
  if (compToken && compTarget.startsWith(compToken)) return 86;

  const words = extractWords(rawTarget);
  const fullWords = norm.split(' ').filter(Boolean);
  const candidateWords = Array.from(new Set([...fullWords, ...words]));

  for (let i = 0; i < candidateWords.length; i += 1) {
    const w = candidateWords[i];
    if (w === token) return i === 0 ? 92 : 84;
    if (w.startsWith(token)) return i === 0 ? 85 : 78;
  }

  const subIdx = norm.indexOf(token);
  if (subIdx !== -1) {
    return Math.max(66, 77 - Math.min(10, subIdx * 0.5));
  }

  if (compToken && compToken.length >= 3) {
    const compIdx = compTarget.indexOf(compToken);
    if (compIdx !== -1) {
      return Math.max(64, 74 - Math.min(8, compIdx * 0.5));
    }
  }

  // Typo match against words and word prefixes.
  let bestTypo = 0;
  const maxD = allowedEdits(token.length);
  if (maxD > 0) {
    const probes = new Set<string>(candidateWords);
    if (compTarget && compTarget.length >= token.length - 1) {
      probes.add(compTarget.slice(0, token.length));
      probes.add(compTarget.slice(0, token.length + 1));
    }
    for (const w of candidateWords) {
      if (w.length > token.length + 1) {
        probes.add(w.slice(0, token.length));
        probes.add(w.slice(0, token.length + 1));
      }
    }

    for (const probe of probes) {
      if (!probe) continue;
      if (token.length === 3 && probe[0] !== token[0]) continue;
      const d = osaDistance(token, probe, maxD);
      if (d <= maxD) {
        const sim = 1 - d / Math.max(token.length, probe.length);
        if (sim >= 0.58) {
          const score = 48 + sim * 22 - d * 5;
          if (score > bestTypo) bestTypo = score;
        }
      }
    }
  }

  const subseq = compToken ? subsequenceScore(compToken, rawTarget, norm) : 0;
  return Math.max(bestTypo, subseq);
}

type WeightedField = { text: string; weight: number };

function scoreFields(fields: WeightedField[], query: string): number {
  const normQuery = normalize(query);
  if (!normQuery) return 1;

  // Whole-query direct bonus helps exact multi-word names rank at the top.
  let wholeBest = 0;
  for (const f of fields) {
    if (!f.text) continue;
    const s = scoreField(f.text, normQuery) * f.weight;
    if (s > wholeBest) wholeBest = s;
  }

  const tokens = normQuery.split(' ').filter(Boolean);
  if (tokens.length <= 1) {
    return wholeBest >= 34 ? wholeBest : 0;
  }

  let matchedCount = 0;
  let tokenSum = 0;
  for (const tok of tokens) {
    let bestForToken = 0;
    for (const f of fields) {
      if (!f.text) continue;
      const s = scoreField(f.text, tok) * f.weight;
      if (s > bestForToken) bestForToken = s;
    }
    if (bestForToken >= 34) {
      matchedCount += 1;
      tokenSum += bestForToken;
    }
  }

  const minRequired = Math.ceil(tokens.length * 0.6);
  if (matchedCount < minRequired) {
    return wholeBest >= 38 ? wholeBest : 0;
  }

  const coverage = matchedCount / tokens.length;
  const combined = (tokenSum / tokens.length) * (0.65 + 0.35 * coverage);
  return Math.max(wholeBest, combined);
}

/** Score a product against a storefront search query (0 = no match). */
export function scoreProductMatch(product: Product, query: string): number {
  const planText = product.plans
    .map((pl) => `${pl.label} ${pl.duration || ''}`)
    .join(' ');

  return scoreFields(
    [
      { text: product.name, weight: 1.0 },
      { text: product.platform, weight: 0.78 },
      { text: product.tagline, weight: 0.66 },
      { text: product.code, weight: 0.58 },
      { text: planText, weight: 0.56 },
    ],
    query,
  );
}

/**
 * Filter and rank storefront products using fuzzy matching.
 * Empty queries return the original list unchanged.
 */
export function fuzzySearchProducts(products: Product[], query: string): Product[] {
  if (!query.trim()) return products;

  return products
    .map((product, index) => ({
      product,
      index,
      score: scoreProductMatch(product, query),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.product);
}
