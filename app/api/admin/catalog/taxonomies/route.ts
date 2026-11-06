import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
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

type TaxonomyBody = {
  productCategories?: ProductCategory[];
  warranties?: WarrantyPlan[];
  credentialSchemes?: CredentialScheme[];
};

export async function PUT(request: Request) {
  const { error } = await requireAdmin();
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
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/catalog/taxonomies PUT]', err);
    return NextResponse.json(
      { error: 'Failed to save taxonomies' },
      { status: 500 },
    );
  }
}
