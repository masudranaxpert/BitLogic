import disposableDomainsList from './disposable-domains.json';

const DISPOSABLE_DOMAINS = new Set<string>(disposableDomainsList);

/** Legitimate consumer and corporate email providers that must NEVER be flagged as disposable. */
const ALLOWED_PROVIDERS = new Set<string>([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'ymail.com',
  'rocketmail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'aol.com',
  'mail.com',
  'gmx.com',
  'fastmail.com',
]);

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Checks whether an email address belongs to a known temporary/disposable domain.
 * Supports exact domains and wildcard subdomains (e.g. sub.domain.mailinator.com).
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return false;

  let domain = parts[1];
  if (domain.endsWith('.')) domain = domain.slice(0, -1);

  // If root domain or exact domain is in the permanent allowlist, allow immediately
  if (ALLOWED_PROVIDERS.has(domain)) {
    return false;
  }

  // Split subdomains and test progressively down to the root domain
  const segments = domain.split('.');
  for (let i = 0; i < segments.length - 1; i++) {
    const sub = segments.slice(i).join('.');
    if (ALLOWED_PROVIDERS.has(sub)) {
      return false;
    }
    if (DISPOSABLE_DOMAINS.has(sub)) {
      return true;
    }
  }

  return false;
}

export type EmailValidationResult = {
  ok: boolean;
  error?: string;
};

/**
 * Comprehensive customer email validator for checkout and authentication.
 */
export function validateCustomerEmail(email: string): EmailValidationResult {
  const clean = String(email || '').trim().toLowerCase();

  if (!clean || !EMAIL_REGEX.test(clean)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }

  if (clean.length > 120) {
    return { ok: false, error: 'Email address cannot exceed 120 characters.' };
  }

  if (isDisposableEmail(clean)) {
    return {
      ok: false,
      error: 'Please use a valid personal or work email address (e.g. Gmail, Outlook, Yahoo) to receive your account credentials.',
    };
  }

  return { ok: true };
}
