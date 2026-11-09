'use client';

import React from 'react';
import { PackageX, ShoppingCart, Zap } from 'lucide-react';
import { startingAmount, startingPrice, type Product } from '@/lib/products';
import { useQuickOrder } from '@/context/QuickOrderContext';
import { useStoreNav } from '@/context/StoreNavContext';
import { listingWindow } from '@/lib/catalog/schedule';
import { SaleChip, useProductWindow } from '@/components/storefront/ui/SaleCountdown';

export function ProductCard({ product }: { product: Product }) {
  const { openQuickOrder } = useQuickOrder();
  const { navigateTo } = useStoreNav();
  const soldOut = product.availability === 'out_of_stock';
  const canOrderWhileOos = Boolean(product.acceptOrdersWhenOutOfStock);
  const listed = listingWindow(product.plans);
  const windowFields = {
    availableFrom: listed.availableFrom || undefined,
    availableUntil: listed.availableUntil || undefined,
  };
  const win = useProductWindow(windowFields);
  const stockBlocked = soldOut && !canOrderWhileOos;
  const blocked = stockBlocked || !win.canOrder;
  const blockedText = stockBlocked
    ? 'Sold out — back soon'
    : win.state === 'upcoming'
      ? 'Not on sale yet'
      : 'Offer ended';

  return (
    <article className={`pcard${blocked ? ' is-soldout' : ''}`}>
      <button
        type="button"
        onClick={() => navigateTo('product', { productId: product.id })}
        className="pcard-art border border-slate-200/90 p-0 m-0 bg-transparent text-left cursor-pointer w-full block"
        aria-label={`${product.name}, ${blocked ? blockedText : startingPrice(product)}`}
      >
        {!win.canOrder ? (
          <span className="soldout-flag">
            {win.state === 'upcoming' ? 'Coming soon' : 'Ended'}
          </span>
        ) : soldOut ? (
          <span className="soldout-flag">
            {canOrderWhileOos ? 'Pending delivery' : 'Out of stock'}
          </span>
        ) : (product.sale || product.badge) && (
          <span className="sale-flag" aria-hidden="true">
            {product.sale ? 'Sale' : product.badge}
          </span>
        )}
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          decoding="async"
          width={640}
          height={480}
        />
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
        <SaleChip product={{ ...product, ...windowFields }} />
        {blocked ? (
          <div className="pcard-actions">
            <div className="pcard-soldout" role="status">
              <PackageX size={15} strokeWidth={2.2} className="shrink-0" aria-hidden />
              <span>{blockedText}</span>
            </div>
            <button
              type="button"
              className="pcard-details-link"
              onClick={() => navigateTo('product', { productId: product.id })}
            >
              View details
            </button>
          </div>
        ) : (
        <div className="pcard-actions">
          <button
            type="button"
            className="btn btn-cart cursor-pointer whitespace-nowrap"
            onClick={() => navigateTo('product', { productId: product.id })}
          >
            <ShoppingCart size={14} strokeWidth={2.4} className="shrink-0" />
            <span>Select plan</span>
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
        )}
      </div>
    </article>
  );
}
