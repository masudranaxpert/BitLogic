import type {
  CredentialScheme,
  DigitalProduct,
  ProductVariant,
  WarrantyPlan,
} from '@/lib/admin-data';
import {
  credentialTypeFromScheme,
  findCredentialScheme,
} from '@/lib/admin/credential-schemes';

/** Option draft aligned to storefront `Plan` fields. */
export interface DraftVariant {
  tempId: string;
  name: string;
  priceBDT: number;
  /** Buyer-facing duration, e.g. "1 Month" */
  durationLabel: string;
  durationDays: number;
  /** Selected plan from Product → Warranties */
  warrantyId: string;
  /** Selected template from Product → Credential Types */
  credentialSchemeId: string;
  /** Buyer details — one bullet per line (storefront Plan.details) */
  detailsText: string;
}

export function emptyDraftVariant(
  overrides: Partial<DraftVariant> & { tempId: string },
  defaultWarrantyId = '',
  defaultCredentialSchemeId = '',
): DraftVariant {
  return {
    name: '',
    priceBDT: 0,
    durationLabel: '1 Month',
    durationDays: 30,
    warrantyId: defaultWarrantyId,
    credentialSchemeId: defaultCredentialSchemeId,
    detailsText: '',
    ...overrides,
  };
}

/** New products start with zero options — add via button. */
export function defaultDraftVariants(): DraftVariant[] {
  return [];
}

export function findWarranty(
  warranties: WarrantyPlan[],
  id: string,
): WarrantyPlan | undefined {
  return warranties.find((w) => w.id === id) || warranties[0];
}

export function variantToDraft(
  variant: ProductVariant,
  warranties: WarrantyPlan[],
  schemes: CredentialScheme[] = [],
): DraftVariant {
  const loginOnly =
    !variant.hasWarranty ||
    variant.warrantyDays === 0 ||
    /login only/i.test(variant.warrantyTerms || '');

  const match =
    warranties.find((w) =>
      loginOnly
        ? w.kind === 'login-only'
        : w.kind === 'warranty' && w.days === variant.warrantyDays,
    ) || warranties[0];

  const scheme =
    findCredentialScheme(schemes, variant.credentialSchemeId) ||
    schemes.find((s) => credentialTypeFromScheme(s) === variant.credentialType) ||
    schemes[0];

  return {
    tempId: variant.id,
    name: variant.name,
    priceBDT: variant.priceBDT,
    durationLabel: variant.durationLabel || `${variant.durationDays} Days`,
    durationDays: variant.durationDays,
    warrantyId: match?.id || '',
    credentialSchemeId: scheme?.id || variant.credentialSchemeId || '',
    detailsText: (variant.loginInstructions || []).join('\n'),
  };
}

export function warrantyBadgeFor(
  dv: DraftVariant,
  warranties: WarrantyPlan[],
): string {
  const plan = findWarranty(warranties, dv.warrantyId);
  if (!plan) return 'Warranty';
  return plan.badge;
}

export function warrantyHeadlineFor(
  dv: DraftVariant,
  warranties: WarrantyPlan[],
): string {
  const plan = findWarranty(warranties, dv.warrantyId);
  if (!plan) return 'Warranty';
  return plan.headline;
}

export function initialMediaUrls(
  editingProduct: DigitalProduct | null | undefined,
  fallbackAssetUrl?: string,
): string[] {
  if (editingProduct?.galleryUrls?.length) return [...editingProduct.galleryUrls];
  if (editingProduct?.imageUrl) return [editingProduct.imageUrl];
  if (fallbackAssetUrl) return [fallbackAssetUrl];
  return [];
}

/** Vault delivery defaults — credential type now comes from the selected scheme. */
export const FULFILLMENT_DEFAULTS = {
  deliveryMode: 'auto_vault' as const,
  stockDisplayMode: 'exact_count' as const,
};

/** Best-effort parse of buyer-facing duration labels like "1 Month", "30 Days". */
export function parseDurationDays(label: string, fallback = 30): number {
  const raw = label.trim().toLowerCase();
  if (!raw) return fallback || 30;
  const num = Number.parseInt(raw.replace(/[^\d]/g, ''), 10);
  if (!Number.isFinite(num) || num <= 0) return fallback || 30;
  if (/\bmonth/.test(raw)) return num * 30;
  if (/\byear/.test(raw)) return num * 365;
  if (/\bweek/.test(raw)) return num * 7;
  return num;
}

export function defaultLoginStepsForScheme(
  scheme: CredentialScheme | undefined,
): string[] {
  const type = credentialTypeFromScheme(scheme);
  if (type === 'token') return ['Paste the access token when prompted.'];
  if (type === 'license_key') return ['Enter the license key to activate.'];
  if (type === 'invite_link') return ['Open the invite link and join the workspace.'];
  return ['Log in using the provided email & password.'];
}
