import type {
  CredentialType,
  DeliveryMode,
  ProductVariant,
  StockDisplayMode,
} from '@/lib/admin/types';
import { getCredentialTypeLabel } from '@/components/admin/ui/format';
import { formatDurationDays } from '@/lib/warranty';

export type ProductOptionFormValues = {
  name: string;
  isDefault: boolean;
  durationDays: number;
  priceBDT: number;
  credentialType: CredentialType;
  deliveryMode: DeliveryMode;
  stockDisplayMode: StockDisplayMode;
  vpnRequired: boolean;
  vpnRegionNote: string;
  hasWarranty: boolean;
  warrantyDays: number;
  warrantyTerms: string;
  deviceLimit: string;
  loginStepsText: string;
  optionDescription: string;
  warningNote: string;
  sourcing: 'own' | 'own_then_supplier' | 'supplier_auto' | 'supplier_manual';
  renewable: boolean;
  allowOrderWhenOutOfStock: boolean;
  availableFrom: string;
  availableUntil: string;
};

export function defaultOptionFormValues(): ProductOptionFormValues {
  return {
    name: '1M Access Token',
    isDefault: false,
    durationDays: 30,
    priceBDT: 490,
    credentialType: 'token',
    deliveryMode: 'auto_vault',
    stockDisplayMode: 'exact_count',
    vpnRequired: false,
    vpnRegionNote: 'Direct login without VPN.',
    hasWarranty: true,
    warrantyDays: 30,
    warrantyTerms: '30-day replacement guarantee.',
    deviceLimit: '1 Device',
    loginStepsText:
      'Open the service login page.\nEnter or inject your delivered credential.\nKeep your Order ID for warranty support.',
    optionDescription:
      'Instant pre-authenticated session delivered immediately from Vault.',
    warningNote:
      '[warning]Close the browser tab instead of clicking Log Out on shared token sessions.[/warning]',
    sourcing: 'own',
    renewable: true,
    allowOrderWhenOutOfStock: false,
    availableFrom: '',
    availableUntil: '',
  };
}

export function optionFormValuesFromVariant(
  variant: ProductVariant,
): ProductOptionFormValues {
  return {
    name: variant.name,
    isDefault: Boolean(variant.isDefault),
    durationDays: variant.durationDays,
    priceBDT: variant.priceBDT,
    credentialType: variant.credentialType,
    deliveryMode: variant.deliveryMode,
    stockDisplayMode: variant.stockDisplayMode,
    vpnRequired: variant.vpnRequired,
    vpnRegionNote: variant.vpnRegionNote,
    hasWarranty: variant.hasWarranty,
    warrantyDays: variant.warrantyDays,
    warrantyTerms: variant.warrantyTerms,
    deviceLimit: variant.deviceLimit,
    loginStepsText: variant.loginInstructions.join('\n'),
    optionDescription: variant.optionDescription || '',
    warningNote: variant.warningNote || variant.importantNote || '',
    sourcing: (variant.sourcing as any) || 'own',
    renewable: variant.renewable !== false,
    allowOrderWhenOutOfStock: Boolean(variant.allowOrderWhenOutOfStock),
    availableFrom: variant.availableFrom || '',
    availableUntil: variant.availableUntil || '',
  };
}

function loginSteps(values: ProductOptionFormValues): string[] {
  return values.loginStepsText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildVariantFromOptionForm(
  values: ProductOptionFormValues,
  opts: {
    productId: string;
    existing?: ProductVariant;
  },
): ProductVariant {
  const steps = loginSteps(values);
  const base = opts.existing;

  return {
    ...base,
    id: base?.id ?? `var-${Date.now()}`,
    productId: opts.productId,
    name: values.name,
    isDefault: values.isDefault,
    durationDays: values.durationDays,
    durationLabel: formatDurationDays(values.durationDays),
    priceBDT: values.priceBDT,
    priceUSD: Number((values.priceBDT / 115).toFixed(2)),
    credentialType: values.credentialType,
    deliveryMode: values.deliveryMode,
    stockDisplayMode: values.stockDisplayMode,
    vpnRequired: values.vpnRequired,
    vpnRegionNote: values.vpnRegionNote,
    hasWarranty: values.hasWarranty,
    warrantyDays: values.hasWarranty ? values.warrantyDays : 0,
    warrantyTerms: values.hasWarranty ? values.warrantyTerms : 'No Warranty',
    deviceLimit: values.deviceLimit,
    loginInstructions: steps,
    importantNote: values.warningNote,
    warningNote: values.warningNote,
    optionDescription: values.optionDescription,
    sourcing: values.sourcing,
    renewable: values.renewable,
    allowOrderWhenOutOfStock: values.allowOrderWhenOutOfStock,
    availableFrom: values.availableFrom || undefined,
    availableUntil: values.availableUntil || undefined,
    specifications: base?.specifications ?? [
      {
        label: 'Delivery Type',
        value: getCredentialTypeLabel(values.credentialType),
      },
      { label: 'Device Limit', value: values.deviceLimit },
      {
        label: 'VPN Requirement',
        value: values.vpnRequired ? 'VPN Required' : 'Direct Login',
      },
      {
        label: 'Warranty',
        value: values.hasWarranty
          ? formatDurationDays(values.warrantyDays)
          : 'No Warranty',
      },
    ],
  };
}
