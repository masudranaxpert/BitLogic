'use client';

import React from 'react';
import { ShoppingCart, Zap } from 'lucide-react';
import { startingAmount, startingPrice, type Product } from '@/lib/products';
import { useQuickOrder } from '@/context/QuickOrderContext';
import { useStoreNav } from '@/context/StoreNavContext';

export function ProductCard({ product }: { product: Product }) {
  const { openQuickOrder } = useQuickOrder();
  const { navigateTo } = useStoreNav();

  return (
    <article className="pcard">
      <button
        type="button"
        onClick={() => navigateTo('product', { productId: product.id })}
        className="pcard-art border border-slate-200/90 p-0 m-0 bg-transparent text-left cursor-pointer w-full block"
        aria-label={`${product.name}, ${startingPrice(product)}`}
      >
        {(product.sale || product.badge) && (
          <span className="sale-flag" aria-hidden="true">
            {product.sale ? 'Sale' : product.badge}
          </span>
        )}
        <img src={product.image} alt="" loading="lazy" />
        <span className="pcard-price" aria-hidden="true" lang="bn">
          <span className="price-amount">
            <span className="price-taka">৳</span>
            {startingAmount(product)}
          </span>
          <span className="price-suffix">থেকে শুরু</span>
        </span>
      </button>

      <div className="pcard-body">
        <h3>
          <button
            type="button"
            onClick={() => navigateTo('product', { productId: product.id })}
            className="border-0 bg-transparent p-0 font-bold text-left cursor-pointer"
          >
            {product.name}
          </button>
        </h3>
        <div className="pcard-actions">
          <button
            type="button"
            className="btn btn-cart cursor-pointer whitespace-nowrap"
            onClick={() => navigateTo('product', { productId: product.id })}
          >
            <ShoppingCart size={14} strokeWidth={2.4} className="shrink-0" />
            <span>Select option</span>
          </button>
          <button
            type="button"
            className="btn btn-quick cursor-pointer whitespace-nowrap"
            onClick={() => openQuickOrder(product)}
          >
            <Zap size={14} strokeWidth={2.4} className="shrink-0" />
            <span>Quick order</span>
          </button>
        </div>
      </div>
    </article>
  );
}
