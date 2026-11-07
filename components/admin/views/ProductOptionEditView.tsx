'use client';

import React, { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { DigitalProduct, ProductVariant } from '@/lib/admin/types';
import { Card } from '@/components/admin/ui/Card';
import { ProductOptionForm } from '@/components/admin/views/product-option/ProductOptionForm';
import {
  buildVariantFromOptionForm,
  defaultOptionFormValues,
  optionFormValuesFromVariant,
  type ProductOptionFormValues,
} from '@/components/admin/views/product-option/option-form-values';

interface ProductOptionEditViewProps {
  products: DigitalProduct[];
  productId: string | null;
  variantId: string | null;
  onAddVariant: (productId: string, variant: ProductVariant) => void;
  onUpdateVariant: (productId: string, variant: ProductVariant) => void;
  onCancel: () => void;
}

export default function ProductOptionEditView({
  products,
  productId,
  variantId,
  onAddVariant,
  onUpdateVariant,
  onCancel,
}: ProductOptionEditViewProps) {
  const editing = useMemo(() => {
    if (!productId || !variantId) return null;
    const product = products.find((p) => p.id === productId);
    const variant = product?.variants.find((v) => v.id === variantId);
    if (!product || !variant) return null;
    return { product, variant };
  }, [products, productId, variantId]);

  const mode = editing ? 'edit' : 'add';

  const [targetProductId, setTargetProductId] = useState(
    productId || products[0]?.id || '',
  );
  const [values, setValues] = useState<ProductOptionFormValues>(() =>
    editing
      ? optionFormValuesFromVariant(editing.variant)
      : defaultOptionFormValues(),
  );

  const patchValue = <K extends keyof ProductOptionFormValues>(
    key: K,
    value: ProductOptionFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editing) {
      onUpdateVariant(
        editing.product.id,
        buildVariantFromOptionForm(values, {
          productId: editing.product.id,
          existing: editing.variant,
        }),
      );
      return;
    }

    const targetId = targetProductId || products[0]?.id;
    if (!targetId) return;
    onAddVariant(
      targetId,
      buildVariantFromOptionForm(values, { productId: targetId }),
    );
  };

  if (variantId && productId && !editing) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 cursor-pointer border-0 bg-transparent p-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Products
        </button>
        <Card className="p-6">
          <p className="m-0 text-sm font-semibold text-slate-800 dark:text-slate-100">
            Option not found
          </p>
          <p className="mt-1 mb-0 text-xs text-slate-500">
            This product option may have been removed.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 cursor-pointer border-0 bg-transparent p-0 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Products
        </button>
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 m-0">
          {mode === 'edit' ? 'Edit Option' : 'Add Option'}
        </h1>
        <p className="mt-1 mb-0 text-xs text-slate-500 dark:text-slate-400">
          {mode === 'edit'
            ? `${editing?.product.name} · ${editing?.variant.name}`
            : ''}
        </p>
      </div>

      <Card className="p-5 sm:p-6">
        <ProductOptionForm
          mode={mode}
          values={values}
          onChange={patchValue}
          products={products}
          productId={targetProductId}
          onProductIdChange={setTargetProductId}
          onCancel={onCancel}
          onSubmit={handleSubmit}
        />
      </Card>
    </div>
  );
}
