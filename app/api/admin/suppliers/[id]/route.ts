import { deleteSupplier, updateSupplier } from '@/lib/suppliers/admin';
import { readJson, supplierRoute } from '@/lib/suppliers/api';

export const runtime = 'nodejs';
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  return supplierRoute(async () => ({ supplier: await updateSupplier(id, await readJson(request)) }));
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  return supplierRoute(() => deleteSupplier(id));
}
