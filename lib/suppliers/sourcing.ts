export const SOURCING_MODES = [
  'own',
  'own_then_supplier',
  'own_then_supplier_manual',
  'supplier_auto',
  'supplier_manual',
] as const;

export type SourcingMode = (typeof SOURCING_MODES)[number];

export type DispatchTriggerKind = 'verify' | 'manual' | 'sweep' | 'renewal';

export function isValidSourcing(s: string): s is SourcingMode {
  return (SOURCING_MODES as readonly string[]).includes(s);
}

export function isSupplierSourced(s: string): boolean {
  return s !== 'own' && isValidSourcing(s);
}

/** True only when a unit should automatically trigger a supplier API purchase without manual click. */
export function allowsSupplierDispatch(
  sourcing: string,
  trigger: DispatchTriggerKind,
  explicit = false,
): boolean {
  if (explicit && trigger === 'manual') return true;
  if (sourcing === 'supplier_auto' || sourcing === 'own_then_supplier') return true;
  return (sourcing === 'supplier_manual' || sourcing === 'own_then_supplier_manual') && trigger === 'manual';
}

export type SupplierFailureKind = 'review' | 'manual' | 'next';

const REVIEW_ERROR_CODES = new Set(['PRICE_TOO_HIGH', 'IDEMPOTENCY_CONFLICT']);
const MANUAL_HANDOFF_CODES = new Set(['BALANCE', 'AUTH', 'SCOPE', 'PURCHASING_DISABLED', 'LIMIT', 'BUYER_INPUT']);

/**
 * Classifies supplier purchase failures:
 * - 'review': price exceeded guard -> pause auto-buy for price review
 * - 'manual': low balance / auth / limit / disabled / buyer input -> stop auto-retries and hand over for manual delivery
 * - 'next': transient or out-of-stock -> try next linked supplier or background retry
 */
export function classifySupplierFailure(code: string | null | undefined): SupplierFailureKind {
  const c = (code || '').toUpperCase();
  if (REVIEW_ERROR_CODES.has(c)) return 'review';
  if (MANUAL_HANDOFF_CODES.has(c)) return 'manual';
  return 'next';
}
