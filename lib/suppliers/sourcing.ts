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
