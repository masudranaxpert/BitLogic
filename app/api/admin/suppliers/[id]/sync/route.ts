import { supplierRoute } from '@/lib/suppliers/api';
import { syncSupplier } from '@/lib/suppliers/sync';

export const runtime = 'nodejs';
export const maxDuration = 120;

/** Sync now: balance + full catalog + reprice linked options. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return supplierRoute(async () => ({ result: await syncSupplier(id) }));
}
