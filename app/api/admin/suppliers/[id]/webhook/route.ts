import { connectWebhook } from '@/lib/suppliers/admin';
import { supplierRoute } from '@/lib/suppliers/api';

export const runtime = 'nodejs';

/** Registers https://<APP_URL>/api/webhooks/suppliers/<id> with the supplier. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return supplierRoute(() => connectWebhook(id, process.env.APP_URL || ''));
}
