import type {
  CredentialFieldDef,
  CredentialFieldKey,
  CredentialScheme,
  CredentialType,
} from '@/lib/admin/types';

export const CREDENTIAL_FIELD_CATALOG: Array<{
  key: CredentialFieldKey;
  defaultLabel: string;
}> = [
  { key: 'email', defaultLabel: 'Email' },
  { key: 'password', defaultLabel: 'Password' },
  { key: 'username', defaultLabel: 'Username' },
  { key: 'pin', defaultLabel: 'PIN' },
  { key: 'phone', defaultLabel: 'Phone' },
  { key: 'recovery_email', defaultLabel: 'Recovery Email' },
  { key: 'totp', defaultLabel: '2FA / OTP Secret' },
  { key: 'profile_name', defaultLabel: 'Profile Name' },
  { key: 'activation_code', defaultLabel: 'Activation Code' },
  { key: 'token', defaultLabel: 'Token' },
  { key: 'link', defaultLabel: 'Invite URL' },
];

/** Fields that usually stay vault-only (not on the option card). */
export const DEFAULT_VAULT_ONLY_FIELDS: CredentialFieldKey[] = [
  'pin',
  'phone',
  'recovery_email',
  'totp',
];

export function findCredentialScheme(
  schemes: CredentialScheme[],
  id: string | undefined,
): CredentialScheme | undefined {
  if (!id) return undefined;
  return schemes.find((s) => s.id === id);
}

/** Prefer the variant’s scheme id; else first scheme that matches its credential type. */
export function resolveSchemeForVariant(
  schemes: CredentialScheme[],
  opts: { credentialSchemeId?: string; credentialType?: CredentialType },
): CredentialScheme | undefined {
  const byId = findCredentialScheme(schemes, opts.credentialSchemeId);
  if (byId) return byId;
  if (!opts.credentialType) return undefined;
  return schemes.find((s) => credentialTypeFromScheme(s) === opts.credentialType);
}

/** Fields the Manual Add / vault form should collect for this option. */
export function fieldsForVaultEntry(
  scheme: CredentialScheme | undefined,
  credentialType: CredentialType,
): CredentialFieldDef[] {
  if (scheme?.fields.length) {
    if (credentialType === 'email_login') return scheme.fields;
    // Token / license / invite: never surface email-login extras (PIN, etc.).
    const allowed = new Set<CredentialFieldKey>(
      credentialType === 'invite_link'
        ? ['link']
        : credentialType === 'license_key'
          ? ['activation_code', 'token']
          : ['token', 'activation_code'],
    );
    const matched = scheme.fields.filter((f) => allowed.has(f.key));
    if (matched.length) return matched;
  }

  if (credentialType === 'email_login') {
    return [
      { key: 'email', label: 'Email', required: true, planVisible: true },
      { key: 'password', label: 'Password', required: true, planVisible: true },
    ];
  }
  if (credentialType === 'invite_link') {
    return [
      { key: 'link', label: 'Invite URL', required: true, planVisible: true },
    ];
  }
  if (credentialType === 'license_key') {
    return [
      {
        key: 'activation_code',
        label: 'License Key',
        required: true,
        planVisible: true,
      },
    ];
  }
  return [{ key: 'token', label: 'Token', required: true, planVisible: true }];
}

/** Map taxonomy fields → legacy vault CredentialType. */
export function credentialTypeFromScheme(
  scheme: CredentialScheme | undefined,
): CredentialType {
  if (!scheme?.fields.length) return 'email_login';
  const keys = new Set(scheme.fields.map((f) => f.key));
  if (
    keys.has('email') ||
    keys.has('password') ||
    keys.has('username') ||
    keys.has('recovery_email')
  ) {
    return 'email_login';
  }
  if (keys.has('link')) return 'invite_link';
  if (keys.has('token') || keys.has('activation_code')) {
    const tokenField = scheme.fields.find((f) => f.key === 'token');
    if (tokenField && /license/i.test(tokenField.label)) return 'license_key';
    if (/license/i.test(scheme.name)) return 'license_key';
    return 'token';
  }
  return 'email_login';
}

export function schemeDisplayName(
  schemes: CredentialScheme[],
  schemeId: string | undefined,
  fallbackType?: CredentialType,
): string {
  const scheme = findCredentialScheme(schemes, schemeId);
  if (scheme) return scheme.name;
  if (fallbackType === 'token') return 'Token';
  if (fallbackType === 'license_key') return 'License Key';
  if (fallbackType === 'invite_link') return 'Invite Link';
  if (fallbackType === 'email_login') return 'Email Login';
  return '—';
}

export function planVisibleFields(scheme: CredentialScheme): CredentialFieldDef[] {
  return scheme.fields.filter((f) => f.planVisible);
}

export function vaultExtraFields(scheme: CredentialScheme): CredentialFieldDef[] {
  return scheme.fields.filter((f) => !f.planVisible);
}
