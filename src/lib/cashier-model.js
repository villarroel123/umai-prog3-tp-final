import { createHash, createHmac } from 'node:crypto';

export const CASHIER_PERMISSIONS = Object.freeze({ sell: true, viewStock: true, manageCash: false, adjustPrices: false, processReturns: false });

export function normalizeCashierUsername(value) {
  return String(value || '').trim().toLowerCase();
}

export function validCashierUsername(value) {
  return /^[a-z0-9][a-z0-9._-]{2,23}$/.test(normalizeCashierUsername(value));
}

export function validCashierPassword(value) {
  return typeof value === 'string' && value.length >= 10 && value.length <= 128 && /[a-zA-Z]/.test(value) && /\d/.test(value);
}

export function cashierBusinessCode(businessId) {
  return createHash('sha256').update(`caja-business:${businessId}`).digest('hex').slice(0, 12).toUpperCase();
}

export function cashierIdentityEmail(secret, code, username) {
  const normalized = normalizeCashierUsername(username);
  const digest = createHmac('sha256', secret).update(`${String(code).toUpperCase()}:${normalized}`).digest('hex');
  return `c${digest.slice(0, 48)}@cashiers.example.com`;
}

export function parseCashierPermissions(value) {
  const sell = value?.sell === true;
  const manageCash = value?.manageCash === true;
  return { sell, viewStock: sell || value?.viewStock === true, manageCash, adjustPrices: value?.adjustPrices === true, processReturns: value?.processReturns === true };
}
