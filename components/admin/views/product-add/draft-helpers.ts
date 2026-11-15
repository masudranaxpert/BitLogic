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
import { formatDurationDays, parseDurationDays } from '@/lib/warranty';
export { parseDurationDays } from '@/lib/warranty';
import type { SourcingValue } from '@/components/admin/ui/SourcingSelect';

export interface DraftSupplierLink {
  id: string;
  name: string;
  variantName?: string;
  supplierName: string;
  price: string;
  currency: string;
  costBdt: number | null;
  stock: number | null;
  status: string;
}

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
  /** Sent to buyer when delivered credential (e.g. auto-supply) has no description */
  defaultCredentialDescription: string;
  /** Plan On/Off visibility toggle on storefront */
  isActive: boolean;
  sourcing: SourcingValue;
  supplierLinks: DraftSupplierLink[];
  renewable: boolean;
  /** current = today's price; locked = the price they first paid */
  renewalPricing: 'current' | 'locked';
  allowOrderWhenOutOfStock: boolean;
  availableFrom: string;
  availableUntil: string;
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
    defaultCredentialDescription: '',
    isActive: true,
    sourcing: 'own',
    supplierLinks: [],
    renewable: true,
    renewalPricing: 'current',
    allowOrderWhenOutOfStock: false,
    availableFrom: '',
    availableUntil: '',
    ...overrides,
  };
}

/** New products start with zero options — add via button. */
export function defaultDraftVariants(): DraftVariant[] {
  return [];
}

export const NO_WARRANTY_ID = '__no_warranty__';
export const LOGIN_WARRANTY_ID = '__login_warranty__';

export const BUILTIN_WARRANTIES: WarrantyPlan[] = [
  {
    id: NO_WARRANTY_ID,
    name: 'No Warranty',
    badge: 'No Warranty',
    headline: 'No Warranty',
    kind: 'login-only',
    days: 0,
    unit: 'days',
  },
  {
    id: LOGIN_WARRANTY_ID,
    name: 'Login Warranty',
    badge: 'Login Warranty',
    headline: 'Login Warranty Only',
    kind: 'login-only',
    days: 0,
    unit: 'days',
  },
];

export function allWarranties(warranties: WarrantyPlan[]): WarrantyPlan[] {
  return [...BUILTIN_WARRANTIES, ...warranties];
}

export function findWarranty(
  warranties: WarrantyPlan[],
  id: string,
): WarrantyPlan | undefined {
  const pool = allWarranties(warranties);
  return pool.find((w) => w.id === id) || pool[0];
}

export function variantToDraft(
  variant: ProductVariant,
  warranties: WarrantyPlan[],
  schemes: CredentialScheme[] = [],
): DraftVariant {
  const noWarranty =
    !variant.hasWarranty &&
    /no warranty/i.test(variant.importantNote || variant.warrantyTerms || '');
  const loginOnly =
    !variant.hasWarranty ||
    variant.warrantyDays === 0 ||
    /login/i.test(variant.importantNote || variant.warrantyTerms || '');

  const match = noWarranty
    ? BUILTIN_WARRANTIES[0]
    : loginOnly
      ? warranties.find((w) => w.kind === 'login-only') || BUILTIN_WARRANTIES[1]
      : warranties.find(
          (w) =>
            w.kind === 'warranty' &&
            w.days === variant.warrantyDays &&
            (w.badge === variant.importantNote || w.headline === variant.warrantyTerms),
        ) ||
        warranties.find(
          (w) => w.kind === 'warranty' && w.days === variant.warrantyDays,
        ) ||
        warranties[0] ||
        BUILTIN_WARRANTIES[0];

  const scheme =
    findCredentialScheme(schemes, variant.credentialSchemeId) ||
    schemes.find((s) => credentialTypeFromScheme(s) === variant.credentialType) ||
    schemes[0];

  return {
    tempId: variant.id,
    name: variant.name,
    priceBDT: variant.priceBDT,
    durationLabel:
      variant.durationDays <= 0 &&
      (!variant.durationLabel || parseDurationDays(variant.durationLabel) === 0)
        ? ''
        : variant.durationLabel || formatDurationDays(variant.durationDays),
    durationDays: variant.durationDays,
    warrantyId: match?.id || '',
    credentialSchemeId: scheme?.id || variant.credentialSchemeId || '',
    detailsText: (variant.loginInstructions || []).join('\n'),
    defaultCredentialDescription: variant.defaultCredentialDescription || '',
    isActive: variant.isActive !== false,
    sourcing: (variant.sourcing as any) || 'own',
    supplierLinks: [],
    renewable: variant.renewable !== false,
    renewalPricing: variant.renewalPricing === 'locked' ? 'locked' : 'current',
    allowOrderWhenOutOfStock: Boolean(variant.allowOrderWhenOutOfStock),
    availableFrom: variant.availableFrom || '',
    availableUntil: variant.availableUntil || '',
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

export function defaultLoginStepsForScheme(
  scheme: CredentialScheme | undefined,
): string[] {
  const type = credentialTypeFromScheme(scheme);
  if (type === 'token') return ['Paste the access token when prompted.'];
  if (type === 'license_key') return ['Enter the license key to activate.'];
  if (type === 'invite_link') return ['Open the invite link and join the workspace.'];
  return ['Log in using the provided email & password.'];
}
