import test from 'node:test';
import assert from 'node:assert/strict';
import { nextScannedQuantity, parseInlineScan, parseQuantityCommand } from '../src/lib/scan-quantity.js';

test('3x y 10x preparan una cantidad para el siguiente escaneo', () => {
  assert.deepEqual(parseQuantityCommand('3x'), { quantity: 3 });
  assert.deepEqual(parseQuantityCommand('10X'), { quantity: 10 });
  assert.equal(parseQuantityCommand('7791234567890'), null);
  assert.equal(parseQuantityCommand('caja'), null);
});

test('rechaza multiplicadores inválidos y no agrega cantidades parciales', () => {
  for (const input of ['0x', '-3x', '2.5x', '3.0x', '10001x']) assert.match(parseQuantityCommand(input).error, /cantidad entera/);
  assert.equal(nextScannedQuantity(2, 3, 5), 5);
  assert.equal(nextScannedQuantity(2, 3, 4), null);
  assert.equal(nextScannedQuantity(0, 10, 9), null);
});

test('acepta cantidad y código en una sola lectura', () => {
  assert.deepEqual(parseInlineScan('3x7790010000012'), { quantity: 3, term: '7790010000012' });
  assert.deepEqual(parseInlineScan('2*ALM001'), { quantity: 2, term: 'ALM001' });
  assert.match(parseInlineScan('0x7790010000012').error, /cantidad entera/);
  assert.equal(parseInlineScan('7790010000012'), null);
});
