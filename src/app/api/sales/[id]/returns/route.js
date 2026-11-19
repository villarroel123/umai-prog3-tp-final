import { POST as registerReturn } from '@/app/api/sale-returns/route';

// Both return entry points use the same transactional implementation.
export async function POST(request, { params }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const forwarded = new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      saleId: id,
      returnId: body.returnId || body.creditId,
      reason: body.reason,
      method: body.method || body.refundMethod,
      items: body.items,
    }),
  });
  return registerReturn(forwarded);
}
