import test from 'node:test';
import assert from 'node:assert/strict';
import { cashierBusinessCode, cashierIdentityEmail, normalizeCashierUsername, parseCashierPermissions, validCashierPassword, validCashierUsername } from '../src/lib/cashier-model.js';

test('el código y la identidad interna son deterministas por negocio y usuario', () => {
  const a = cashierBusinessCode('negocio-1');
  const b = cashierBusinessCode('negocio-2');
  assert.match(a, /^[A-F0-9]{12}$/);
  assert.notEqual(a, b);
  assert.equal(cashierIdentityEmail('secreto', a, ' CAMI '), cashierIdentityEmail('secreto', a, 'cami'));
  assert.notEqual(cashierIdentityEmail('secreto', a, 'cami'), cashierIdentityEmail('secreto', b, 'cami'));
});

test('validación de credenciales y permisos operativos', () => {
  assert.equal(normalizeCashierUsername(' Cami.Caja '), 'cami.caja');
  assert.equal(validCashierUsername('cami.caja'), true);
  assert.equal(validCashierUsername('ca'), false);
  assert.equal(validCashierPassword('ClaveSegura123'), true);
  assert.equal(validCashierPassword('sololetras'), false);
  assert.deepEqual(parseCashierPermissions({ sell: true, viewStock: false, manageCash: true }), { sell: true, viewStock: true, manageCash: true, adjustPrices: false, processReturns: false });
});
