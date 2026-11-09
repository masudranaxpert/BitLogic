import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-admin';
import {
  replaceCategories,
  replaceCredentialSchemes,
  replaceWarranties,
} from '@/lib/admin/catalog-repo';
import type {
  CredentialScheme,
  ProductCategory,
  WarrantyPlan,
} from '@/lib/admin/types';
import { recordActivity, requestIp } from '@/lib/audit/record';

type TaxonomyBody = {
  productCategories?: ProductCategory[];
  warranties?: WarrantyPlan[];
  credentialSchemes?: CredentialScheme[];
};

export async function PUT(request: Request) {
  const { session, error } = await requirePermission('products');
  if (error) return error;

  try {
    const body = (await request.json()) as TaxonomyBody;
    if (body.productCategories) {
      await replaceCategories(body.productCategories);
    }
    if (body.warranties) {
      await replaceWarranties(body.warranties);
    }
    if (body.credentialSchemes) {
      await replaceCredentialSchemes(body.credentialSchemes);
    }
    const parts = [
      body.productCategories ? 'categories' : '',
      body.warranties ? 'warranties' : '',
      body.credentialSchemes ? 'credential types' : '',
    ].filter(Boolean);
    await recordActivity({
      userId: session.id,
      action: 'catalog.taxonomy',
      entityType: 'catalog',
      summary: `Updated ${parts.join(', ') || 'catalog lists'}`,
      ip: requestIp(request),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/catalog/taxonomies PUT]', err);
    return NextResponse.json(
      { error: 'Failed to save taxonomies' },
      { status: 500 },
    );
  }
}
