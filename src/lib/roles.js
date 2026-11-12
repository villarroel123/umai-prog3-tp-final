export const ROLES = Object.freeze({ ADMIN: 'platform_admin', OWNER: 'business_owner', CASHIER: 'cashier' });

export function normalizedRole(value) {
  if (value === ROLES.ADMIN || value === 'admin') return ROLES.ADMIN;
  if (value === ROLES.OWNER || value === 'owner') return ROLES.OWNER;
  if (value === ROLES.CASHIER) return ROLES.CASHIER;
  return null;
}

export function landingFor(role) {
  if (role === ROLES.ADMIN) return '/admin';
  if (role === ROLES.OWNER) return '/negocio';
  if (role === ROLES.CASHIER) return '/caja';
  return '/crear-negocio';
}

export function canAccess(role, permission) {
  const permissions = {
    platform: [ROLES.ADMIN],
    manage_business: [ROLES.OWNER],
    read_catalog: [ROLES.OWNER, ROLES.CASHIER],
    sell: [ROLES.OWNER, ROLES.CASHIER],
    manage_cash: [ROLES.OWNER, ROLES.CASHIER],
    read_business_sales: [ROLES.OWNER],
  };
  return Boolean(permissions[permission]?.includes(role));
}
