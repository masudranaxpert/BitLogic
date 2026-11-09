import { supplierCatalog } from '@/lib/suppliers/admin';
import { supplierRoute } from '@/lib/suppliers/api';

export const runtime = 'nodejs';

/** ?id=&supplierId=&q=&status=available|out_of_stock|removed&linked=yes|no */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  return supplierRoute(async () => ({
    items: await supplierCatalog({
      id: sp.get('id') || undefined,
      supplierId: sp.get('supplierId') || undefined,
      q: sp.get('q') || undefined,
      status: sp.get('status') || undefined,
      linked: sp.get('linked') || undefined,
    }),
  }));
}
