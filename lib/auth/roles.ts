export const ROLES = {
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
  /** Console operator with limited menus (set via Admin → Staff). */
  STAFF: 'STAFF',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function isAdminRole(role: string | null | undefined): boolean {
  return role === ROLES.ADMIN;
}

export function isStaffRole(role: string | null | undefined): boolean {
  return role === ROLES.STAFF;
}

export function isConsoleRole(role: string | null | undefined): boolean {
  return role === ROLES.ADMIN || role === ROLES.STAFF;
}
