'use client';

import React from 'react';
import {
  BadgeCheck,
  Headphones,
  ShoppingBag,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { HeroSlider } from './HeroSlider';
import { OfferRail } from './OfferRail';
import { MoreProductsCard } from './MoreProductsCard';
import { ProductCard } from './ProductCard';
import { products } from '@/lib/products';
import { useStoreNav } from './StoreNavContext';

const trusts = [
  { title: 'Verified Passes', Icon: BadgeCheck },
  { title: 'Instant Vault', Icon: Zap },
  { title: '30-Day Warranty', Icon: Headphones },
  { title: 'Local Checkout', Icon: ShoppingBag },
];

export function HomePageView() {
  const { navigateTo } = useStoreNav();
  const offers = products.filter((p) => p.sale || p.featured);
  const featured = products.slice(0, 7);

  return (
    <div className="space-y-3">
      <HeroSlider />

      {/* Minimal 4-Column Trust Strip — Zero Slop */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-2" aria-label="Highlights">
        <div className="bg-white rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100 shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.02)]">
          {trusts.map(({ title, Icon }) => (
            <div key={title} className="px-4 py-3 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Icon size={15} strokeWidth={2.2} />
              </div>
              <span className="font-display text-xs font-semibold text-slate-800">
                {title}
              </span>
            </div>
          ))}
        </div>
      </section>

      <OfferRail title="Special Offers" products={offers} />

      {/* Featured Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Featured Products
          </h2>
          <button
            type="button"
            onClick={() => navigateTo('shop', { code: 'ALL' })}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>All Products ({products.length})</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
          <MoreProductsCard />
        </div>
      </section>
    </div>
  );
}
