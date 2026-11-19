export const IMPRESORA = Object.freeze({
  interfaz: process.env.IMPRESORA_INTERFACE || '//localhost/TICKETS',
  tipo: String(process.env.IMPRESORA_TIPO || 'epson').toLowerCase(),
  columnas: 48,
  cajon: process.env.IMPRESORA_ABRIR_CAJON !== 'false',
  timeoutMs: Number(process.env.IMPRESORA_TIMEOUT_MS || 5000),
});
