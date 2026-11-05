import { StoreProviders } from '@/components/storefront';
import { listCatalogProducts } from '@/lib/catalog/queries';

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const products = await listCatalogProducts();

  return <StoreProviders products={products}>{children}</StoreProviders>;
}
