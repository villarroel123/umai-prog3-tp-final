import { NextResponse } from 'next/server';
export const json = (data, status = 200) => NextResponse.json(data, { status });
export const fail = (message, status = 400) => json({ error: message }, status);
export function safeError(error) {
  console.error(error);
  return fail('Ocurrió un error. Intentá nuevamente.', 500);
}
