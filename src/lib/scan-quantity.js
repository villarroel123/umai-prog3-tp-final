export const MAX_SCAN_QUANTITY = 10000;

export function parseInlineScan(input) {
  const text = String(input || '').trim();
  const match = text.match(/^(\d+)\s*[x*]\s*(\S.*)$/i);
  if (!match) return null;
  const quantity = Number(match[1]);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_SCAN_QUANTITY) return { error: `Ingresá una cantidad entera entre 1 y ${MAX_SCAN_QUANTITY}.` };
  return { quantity, term: match[2].trim() };
}

export function parseQuantityCommand(input) {
  const text = String(input || '').trim();
  if (!/^[+-]?(?:\d+(?:[.,]\d+)?)\s*x$/i.test(text)) return null;
  const numeric = text.slice(0, -1).trim();
  const number = Number(numeric);
  if (!/^\d+$/.test(numeric) || !Number.isSafeInteger(number) || number < 1 || number > MAX_SCAN_QUANTITY) {
    return { error: `Ingresá una cantidad entera entre 1 y ${MAX_SCAN_QUANTITY}.` };
  }
  return { quantity: number };
}

export function nextScannedQuantity(current, requested, stock) {
  if (!Number.isSafeInteger(requested) || requested < 1 || requested > MAX_SCAN_QUANTITY) return null;
  if (!Number.isFinite(stock) || stock < current + requested) return null;
  return current + requested;
}
