'use client';

import type { CredentialType } from '@/lib/admin/types';

export function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString('en-IN')}`;
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
