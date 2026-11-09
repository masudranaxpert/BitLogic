import { jahaAdapter } from './jaha';
import { pandoraAdapter } from './pandora';
import type { SupplierAdapter } from './types';

/** Every supported reseller API. Add a new one here after writing its adapter. */
export const ADAPTERS: Record<string, SupplierAdapter> = {
  [pandoraAdapter.kind]: pandoraAdapter,
  [jahaAdapter.kind]: jahaAdapter,
};

export function getAdapter(kind: string): SupplierAdapter | null {
  return ADAPTERS[kind] || null;
}

/** For the "Add supplier" picker (safe for the browser: no functions). */
export const SUPPLIER_KINDS = Object.values(ADAPTERS).map((a) => ({
  kind: a.kind,
  label: a.label,
  defaultBaseUrl: a.defaultBaseUrl,
  currency: a.currency,
  docsUrl: a.docsUrl,
  supportsWebhooks: a.supportsWebhooks,
}));
