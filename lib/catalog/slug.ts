/** Clean URL slug helpers for digital products. */
export function slugifyProductName(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normalizes auto-generated slugs so new products never inherit `prod-` or
 * raw `prod-<timestamp>` IDs, falling back to a slugified product name.
 */
export function resolveNewProductSlug(
  incomingSlug: string | undefined,
  name: string,
): string {
  const cleanedIncoming = (incomingSlug ?? '').trim().replace(/^prod-/i, '');
  if (!cleanedIncoming || /^\d{10,}$/.test(cleanedIncoming)) {
    return slugifyProductName(name) || `item-${Date.now()}`;
  }
  return (
    slugifyProductName(cleanedIncoming) ||
    slugifyProductName(name) ||
    `item-${Date.now()}`
  );
}
