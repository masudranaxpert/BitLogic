/**
 * Resolves the buyer-facing credential description / usage instructions:
 * prefers a credential-specific note when present and falls back to the
 * owning plan's default credential description (needed for auto-supply
 * deliveries that carry no note of their own).
 */
export function resolveCredentialDescription(
  vaultNote: string | null | undefined,
  planDefaultNote: string | null | undefined,
): string | undefined {
  const own = vaultNote?.trim();
  if (own) return own;
  const fallback = planDefaultNote?.trim();
  return fallback || undefined;
}

export type PlanDescriptionRow = {
  id: string;
  code: string;
  defaultCredentialDescription?: string | null;
  product: { id: string; slug: string };
};

export function buildPlanDefaultDescriptionMap(
  plans: PlanDescriptionRow[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const plan of plans) {
    const desc = plan.defaultCredentialDescription?.trim();
    if (!desc) continue;
    for (const pKey of [plan.product.slug, plan.product.id]) {
      for (const vKey of [plan.code, plan.id]) {
        if (pKey && vKey) map.set(`${pKey}|${vKey}`, desc);
      }
    }
  }
  return map;
}

export function lookupPlanDefaultDescription(
  map: Map<string, string>,
  productId: string,
  variantId: string,
): string | undefined {
  return map.get(`${productId}|${variantId}`);
}
