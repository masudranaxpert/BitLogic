import type { ComponentType } from 'react';
import type { AdminTab } from '@/lib/admin/types';
import type { StaffPermissionKey } from '@/lib/auth/permissions';

export interface NavSubItem {
  id: AdminTab;
  label: string;
}

export interface NavGroupItem {
  id: AdminTab;
  label: string;
  shortLabel: string;
  icon: ComponentType<{ className?: string }>;
  count?: number;
  subItems?: NavSubItem[];
}

export type ConsoleUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  permissions: StaffPermissionKey[];
  isFullAdmin: boolean;
};
