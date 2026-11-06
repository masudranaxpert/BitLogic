'use client';

import type { CredentialType } from '@/lib/admin/types';

export function formatBDT(amount: number): string {
  // Thin space after ৳ so currency + digits don’t crowd at small sizes
  return `৳\u2009${amount.toLocaleString('en-IN')}`;
}

/** Pretty size from kilobytes — auto KB / MB / GB. */
export function formatFileSizeFromKB(sizeKB: number): string {
  if (!Number.isFinite(sizeKB) || sizeKB <= 0) return '0 KB';
  if (sizeKB < 1024) {
    return `${Math.round(sizeKB)} KB`;
  }
  const sizeMB = sizeKB / 1024;
  if (sizeMB < 1024) {
    const rounded = sizeMB >= 10 ? Math.round(sizeMB) : Math.round(sizeMB * 10) / 10;
    return `${rounded} MB`;
  }
  const sizeGB = sizeMB / 1024;
  const rounded = sizeGB >= 10 ? Math.round(sizeGB) : Math.round(sizeGB * 100) / 100;
  return `${rounded} GB`;
}

export function getCredentialTypeLabel(type: CredentialType): string {
  switch (type) {
    case 'token':
      return 'Token';
    case 'license_key':
      return 'License Key';
    case 'email_login':
      return 'Email Login';
    case 'invite_link':
      return 'Team Invite';
  }
}
