import 'server-only';
import { execFile as execFileCallback } from 'node:child_process';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { rm, writeFile } from 'node:fs/promises';
import { IMPRESORA } from './impresora.js';
import { money, receiptCode } from './models.js';

const require = createRequire(import.meta.url);
const thermal = require('node-thermal-printer');
const types = thermal.PrinterTypes || thermal.types;
const characterSets = thermal.CharacterSet || thermal.characterSet;
const execFile = promisify(execFileCallback);

async function printWindowsShared(buffer, printerName) {
  const payloadPath = join(tmpdir(), `zeta-ticket-${randomUUID()}.raw`);
  const helperPath = resolve(process.cwd(), 'scripts', 'print-raw-windows.ps1');
  try {
    await writeFile(payloadPath, buffer);
    await execFile('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', helperPath,
      '-PrinterName', printerName, '-PayloadPath', payloadPath,
    ], { windowsHide: true, timeout: 30000, maxBuffer: 2000 });
  } finally {
    await rm(payloadPath, { force: true });
  }
}

function printer() {
  let interfaceName = IMPRESORA.interfaz.trim();
  const isWindowsShare = interfaceName.startsWith('//') || interfaceName.startsWith('\\\\');
  if (interfaceName.startsWith('//')) interfaceName = `\\\\${interfaceName.slice(2).replaceAll('/', '\\')}`;
  const type = types[String(IMPRESORA.tipo).toUpperCase()] || types.EPSON;
  return new thermal.ThermalPrinter({
    type,
    interface: isWindowsShare
      ? { execute: buffer => printWindowsShared(buffer, interfaceName) }
      : interfaceName,
    width: IMPRESORA.columnas,
    characterSet: characterSets.WPC1252,
    removeSpecialCharacters: false,
    lineCharacter: '-',
    options: { timeout: IMPRESORA.timeoutMs },
  });
}

function header(device, title, date) {
  device.alignCenter();
  device.bold(true);
  device.println(title);
  device.bold(false);
  device.println(date);
  device.drawLine();
  device.alignLeft();
}

export async function imprimirTicket(sale) {
  const device = printer();
  header(device, sale.businessName || 'COMERCIO', `${sale.registerName || 'Caja'} · ${new Date(sale.createdAt).toLocaleString('es-AR')}`);
  device.alignCenter();
  device.println(`COMPROBANTE NO FISCAL ${receiptCode(sale.receiptNumber)}`);
  device.alignLeft();
  device.println(`Cajero: ${sale.cashierName || '—'}`);
  device.println(`Cliente: ${sale.buyerName || 'Consumidor final'}`);
  device.drawLine();
  for (const item of sale.items || []) {
    device.println(`${item.quantity} x ${item.name}`);
    device.leftRight(`${money(item.unitPrice)} c/u`, money(item.lineTotal));
  }
  device.drawLine();
  if (sale.saleAdjustmentAmount) device.leftRight('Ajustes de la cuenta', money(sale.saleAdjustmentAmount));
  device.bold(true);
  device.leftRight('TOTAL', money(sale.total));
  device.bold(false);
  for (const payment of sale.payments || [{ method: sale.paymentMethod, amount: sale.total }]) {
    device.leftRight(`Pagado · ${payment.method}`, money(payment.amount));
  }
  if (sale.amountReceived > 0) device.leftRight('Efectivo recibido', money(sale.amountReceived));
  if (sale.change > 0) device.leftRight('Vuelto', money(sale.change));
  device.newLine();
  device.alignCenter();
  device.println('Gracias por su compra');
  device.newLine();
  if (IMPRESORA.cajon) device.openCashDrawer();
  device.cut();
  return device.execute();
}

export async function imprimirCierreZ(session) {
  const device = printer();
  const report = session.zReport || session;
  header(device, session.businessName || 'COMERCIO', `${session.registerName || 'Caja'} · CIERRE Z`);
  device.println(`Nro. Z: ${session.zNumber || session.id}`);
  if (report.businessDay) device.println('Dia comercial: ' + report.businessDay);
  device.println(`Desde: ${new Date(session.openedAt).toLocaleString('es-AR')}`);
  device.println(`Hasta: ${new Date(session.closedAt).toLocaleString('es-AR')}`);
  device.drawLine();
  device.leftRight('Ventas', String(report.salesCount || 0));
  device.leftRight('Anulaciones', String(report.voidCount || 0));
  device.leftRight('Anulado', money(report.voidedTotal || 0));
  device.leftRight('Efectivo inicial', money(session.openingAmount));
  device.leftRight('Efectivo vendido', money(report.paymentTotals?.cash || 0));
  device.leftRight('Tarjeta', money(report.paymentTotals?.card || 0));
  device.leftRight('Transferencia', money(report.paymentTotals?.transfer || 0));
  device.leftRight('Notas de crÃ©dito', money(report.creditTotal || 0));
  device.drawLine();
  device.bold(true);
  device.leftRight('VENTA NETA', money(report.netTotal ?? session.grossTotal));
  device.leftRight('EFECTIVO ESPERADO', money(session.expectedClosingAmount));
  device.leftRight('EFECTIVO CONTADO', money(session.closingAmount));
  device.leftRight('DIFERENCIA', money(session.difference));
  device.bold(false);
  device.newLine();
  return device.execute();
}

export async function imprimirPrueba() {
  const device = printer();
  header(device, 'PRUEBA DE IMPRESORA ZETA', new Date().toLocaleString('es-AR'));
  device.println('ConexiÃ³n ESC/POS correcta.');
  device.println(`Papel configurado: ${IMPRESORA.columnas} columnas / 80 mm.`);
  device.newLine();
  device.cut();
  return device.execute();
}

