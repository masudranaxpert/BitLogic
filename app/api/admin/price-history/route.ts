import { priceHistory, SupplierInputError } from '@/lib/suppliers/admin';
import { supplierRoute } from '@/lib/suppliers/api';

export const runtime = 'nodejs';

/** Every price change of a product's options, newest first. ?productId=<slug> */
export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get('productId') || '';
  return supplierRoute(async () => {
    if (!productId) throw new SupplierInputError('productId required.');
    return { history: await priceHistory(productId) };
  }, 'products');
}
