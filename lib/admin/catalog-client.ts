import type {
  CredentialScheme,
  DigitalProduct,
  ProductCategory,
  WarrantyPlan,
} from '@/lib/admin/types';

export type AdminCatalogPayload = {
  products: DigitalProduct[];
  productCategories: ProductCategory[];
  warranties: WarrantyPlan[];
  credentialSchemes: CredentialScheme[];
};

export async function fetchAdminCatalog(): Promise<AdminCatalogPayload | null> {
  const res = await fetch('/api/admin/catalog', { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()) as AdminCatalogPayload;
}

export async function persistAdminProduct(
  product: DigitalProduct,
): Promise<boolean> {
  const res = await fetch('/api/admin/catalog/products', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product }),
  });
  return res.ok;
}

export async function persistPlanActive(
  productId: string,
  planCode: string,
  isActive: boolean,
): Promise<boolean> {
  const res = await fetch('/api/admin/catalog/plans/toggle', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, planCode, isActive }),
  });
  return res.ok;
}

export async function persistProductActive(
  productId: string,
  isActive: boolean,
): Promise<boolean> {
  const res = await fetch('/api/admin/catalog/products/toggle', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, isActive }),
  });
  return res.ok;
}

export async function persistAdminTaxonomies(patch: {
  productCategories?: ProductCategory[];
  warranties?: WarrantyPlan[];
  credentialSchemes?: CredentialScheme[];
}): Promise<boolean> {
  const res = await fetch('/api/admin/catalog/taxonomies', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return res.ok;
}
