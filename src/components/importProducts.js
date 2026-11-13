// Lee un Excel/CSV en el navegador y lo convierte al formato de producto de la app.
import * as XLSX from 'xlsx';

const norm = s =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');

const num = v => {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').trim();
  if (!s) return 0;
  // soporta "1.234,56" y "1234.56"
  const clean = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
};

const yes = v => ['si', 's', 'true', '1', 'yes', 'y'].includes(norm(v));

const UNITS = { un: 'unidad', u: 'unidad', unidad: 'unidad', kg: 'kg', lt: 'litro', l: 'litro' };

// Alias aceptados para cada columna
const ALIAS = {
  code: ['codigo', 'cod', 'sku'],
  barcode: ['codigo_barras', 'codigo_de_barras', 'barcode', 'ean'],
  name: ['descripcion', 'nombre', 'producto'],
  category: ['rubro', 'categoria'],
  unit: ['unidad'],
  netPrice: ['precio_neto', 'neto'],
  vatRate: ['alicuota_iva', 'iva'],
  salePrice: ['precio_final', 'precio_venta', 'precio'],
  stock: ['stock', 'cantidad'],
  isDairy: ['es_lacteo', 'lacteo'],
  isActive: ['activo'],
};

export async function parseProductsFile(file) {
  const isCsv = /\.csv$/i.test(file.name);
  const wb = isCsv
    ? XLSX.read(await file.text(), { type: 'string' }) // respeta tildes/UTF-8
    : XLSX.read(await file.arrayBuffer(), { type: 'array' });

  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });

  const products = [];
  const errors = [];

  rows.forEach((raw, i) => {
    const row = {};
    Object.keys(raw).forEach(k => (row[norm(k)] = raw[k]));
    const get = field => {
      for (const a of ALIAS[field]) if (row[a] !== undefined && row[a] !== '') return row[a];
      return '';
    };

    const name = String(get('name')).trim();
    if (!name) {
      errors.push(`Fila ${i + 2}: falta la descripción.`);
      return;
    }

    const netPrice = num(get('netPrice'));
    const vatRate = num(get('vatRate'));
    const salePrice = num(get('salePrice')) || +(netPrice * (1 + vatRate / 100)).toFixed(2);
    const activeRaw = get('isActive');

    products.push({
      code: String(get('code')).trim(),
      barcode: String(get('barcode')).trim(),
      name,
      category: String(get('category')).trim() || 'Otros',
      unit: UNITS[norm(get('unit'))] || 'unidad',
      netPrice,
      vatRate,
      salePrice,
      stock: num(get('stock')),
      isDairy: yes(get('isDairy')),
      isActive: activeRaw === '' ? true : yes(activeRaw),
    });
  });

  return { products, errors };
}