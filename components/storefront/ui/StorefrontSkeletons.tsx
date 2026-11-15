'use client';

import React from 'react';

export function ProductCardSkeleton() {
  return (
    <article className="pcard" aria-hidden="true">
      <div className="pcard-art border border-slate-200/80 dark:border-slate-800 relative overflow-hidden bg-slate-200/70 dark:bg-slate-800/70 shimmer-sweep aspect-4/3 w-full">
        {/* Mirror starting price pill at bottom-right */}
        <div className="absolute right-2.5 bottom-2.5 h-6 w-22 rounded-md bg-slate-300/80 dark:bg-slate-700/80 shimmer-sweep" />
      </div>
      <div className="pcard-body">
        <h3>
          <div className="h-4 w-3/4 rounded bg-slate-200/80 dark:bg-slate-700 shimmer-sweep mt-1 mb-2" />
        </h3>
        <div className="pcard-actions">
          <div className="h-8 flex-1 rounded-md bg-slate-200/70 dark:bg-slate-800 shimmer-sweep" />
          <div className="h-8 flex-1 rounded-md bg-slate-200/70 dark:bg-slate-800 shimmer-sweep" />
        </div>
      </div>
    </article>
  );
}

export function StorefrontHomeSkeleton() {
  return (
    <div className="home" aria-busy="true" aria-label="Loading catalog">
      {/* Exact 1:1 Mirror of Offer Hero */}
      <section className="offer-hero" aria-hidden="true">
        <div className="offer-stage">
          <div className="offer-banner">
            <div className="offer-visual w-full h-full rounded-[10px] bg-slate-200/80 dark:bg-slate-800/80 shimmer-sweep" />
          </div>
          <aside
            className="offer-sides"
            style={{ gridTemplateRows: 'repeat(2, minmax(0, 1fr))' }}
          >
            <div className="offer-side">
              <div className="w-full h-full rounded-[10px] bg-slate-200/70 dark:bg-slate-800/70 shimmer-sweep" />
            </div>
            <div className="offer-side">
              <div className="w-full h-full rounded-[10px] bg-slate-200/70 dark:bg-slate-800/70 shimmer-sweep" />
            </div>
          </aside>
        </div>

        {/* Carousel controls placeholder */}
        <div className="offer-controls" aria-hidden="true">
          <div className="h-6 w-6 rounded-full bg-slate-200/60 dark:bg-slate-800/60 shimmer-sweep" />
          <div className="offer-dots">
            <span className="inline-block h-2 w-5 rounded-full bg-slate-300 dark:bg-slate-700 shimmer-sweep" />
            <span className="inline-block h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-800" />
            <span className="inline-block h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="h-6 w-6 rounded-full bg-slate-200/60 dark:bg-slate-800/60 shimmer-sweep" />
        </div>
      </section>

      {/* Special Offer Rail Section (1:1 Mirror of Image 2) */}
      <section className="rail-section" aria-hidden="true">
        <div className="section-rule">
          <span />
          <h2>Special offer</h2>
          <span />
        </div>
        <div className="rail-wrap">
          <div className="rail-arrow rail-arrow-side opacity-40">
            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="rail overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
          <div className="rail-arrow rail-arrow-side opacity-40">
            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </section>

      {/* Trust Row Section (1:1 Mirror of Image 2) */}
      <section className="trust-row" aria-label="Store notes" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <article key={i}>
            <span className="trust-icon shimmer-sweep" aria-hidden="true">
              <span className="w-5 h-5 rounded-full bg-slate-300/60 dark:bg-slate-700/60" />
            </span>
            <div className="h-3.5 w-20 rounded bg-slate-200/80 dark:bg-slate-700 shimmer-sweep mx-auto" />
          </article>
        ))}
      </section>

      {/* Featured Products Section (1:1 Mirror of Image 2) */}
      <section className="featured-block" aria-hidden="true">
        <div className="section-rule">
          <span />
          <h2>Featured products</h2>
          <span />
        </div>
        <div className="product-grid">
          {Array.from({ length: 7 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
          <article className="pcard more-card opacity-80" aria-hidden="true">
            <div className="p-4 space-y-2">
              <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-800 shimmer-sweep" />
              <div className="h-4 w-28 rounded bg-slate-300 dark:bg-slate-700 shimmer-sweep" />
              <div className="h-7 w-24 rounded-full bg-slate-200 dark:bg-slate-800 shimmer-sweep mt-3" />
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

export function ShopSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6" aria-busy="true" aria-label="Loading shop">
      {/* Toolbar / Header Shimmer */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-5 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-baseline gap-2.5">
          <div className="h-7 w-36 rounded-md bg-slate-200/80 dark:bg-slate-700 shimmer-sweep" />
          <div className="h-4 w-8 rounded bg-slate-200/50 dark:bg-slate-800 shimmer-sweep" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1 p-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-lg">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-7 w-16 rounded bg-slate-200/80 dark:bg-slate-700 shimmer-sweep" />
            ))}
          </div>
          <div className="h-9 w-full sm:w-60 rounded-lg bg-slate-200/70 dark:bg-slate-800 shimmer-sweep" />
        </div>
      </div>

      {/* Product Grid */}
      <div className="product-grid pt-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function StorefrontHeaderSkeleton() {
  return (
    <header className="sticky top-0 z-40 px-3 sm:px-6 pt-3 pb-1" aria-hidden="true">
      <div className="max-w-[1180px] mx-auto h-14 sm:h-16 px-3.5 sm:px-5 rounded-full bg-white/95 border-2 border-slate-200/80 shadow-[0_8px_24px_-6px_rgba(15,23,42,0.08)] flex items-center justify-between gap-2 sm:gap-4">
        <div className="h-7 w-28 rounded-md bg-slate-200/80 dark:bg-slate-700 shimmer-sweep shrink-0" />

        <div className="hidden md:flex items-center gap-6">
          <div className="h-3.5 w-12 rounded bg-slate-200/70 shimmer-sweep" />
          <div className="h-3.5 w-14 rounded bg-slate-200/70 shimmer-sweep" />
          <div className="h-3.5 w-10 rounded bg-slate-200/70 shimmer-sweep" />
          <div className="h-3.5 w-14 rounded bg-slate-200/70 shimmer-sweep" />
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="h-9 w-28 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 shimmer-sweep hidden md:block" />
          <div className="h-9 w-12 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 shimmer-sweep" />
          <div className="h-9 w-20 rounded-full bg-slate-900/80 dark:bg-slate-100/80 shimmer-sweep" />
        </div>
      </div>
    </header>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="storefront-shell min-h-dvh flex flex-col">
      <StorefrontHeaderSkeleton />

      <main
        id="main"
        className="flex-1"
        aria-busy="true"
        aria-label="Loading product details"
      >
        <div className="max-w-[980px] mx-auto px-3.5 sm:px-6 py-4 sm:py-5 space-y-5 sm:space-y-6">
          {/* Compact Breadcrumb */}
          <div className="flex items-center gap-2 py-0.5" aria-hidden="true">
            <div className="h-3 w-10 rounded bg-slate-200/80 shimmer-sweep" />
            <div className="h-2.5 w-2 rounded-xs bg-slate-200/60" />
            <div className="h-3 w-14 rounded bg-slate-200/80 shimmer-sweep" />
            <div className="h-2.5 w-2 rounded-xs bg-slate-200/60" />
            <div className="h-3 w-24 rounded bg-slate-300/70 shimmer-sweep" />
          </div>

          {/* Main Product Card — 1:1 Mirror of ProductDetailView */}
          <div className="bg-white rounded-lg border border-slate-200/90 p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[290px_1fr] gap-5 sm:gap-6 items-start">
              {/* Left: Framed Square Image + Thumbnails */}
              <div className="w-full max-w-[260px] sm:max-w-[290px] mx-auto md:mx-0 space-y-2.5">
                <div className="p-2 rounded-lg bg-slate-50/80 border-2 border-slate-200/90 shadow-2xs">
                  <div className="aspect-square rounded-md bg-slate-200/80 shimmer-sweep border border-slate-200/80" />
                </div>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-12 h-12 rounded-md border border-slate-200 bg-slate-100/90 shimmer-sweep"
                    />
                  ))}
                </div>
              </div>

              {/* Right: Info, Select Option Dropdown, Qty & Actions */}
              <div className="space-y-4 min-w-0">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-16 rounded bg-rose-200/70 shimmer-sweep" />
                    <span className="text-slate-300">·</span>
                    <div className="h-3.5 w-14 rounded bg-emerald-200/60 shimmer-sweep" />
                  </div>
                  <div className="h-7 sm:h-8 w-52 sm:w-64 rounded-md bg-slate-200/90 shimmer-sweep" />
                </div>

                {/* Select Option Dropdown Bar */}
                <div className="space-y-2 pt-2.5 border-t border-slate-100">
                  <div className="h-3.5 w-24 rounded bg-slate-200/80 shimmer-sweep" />
                  <div className="w-full h-[42px] px-3.5 rounded-md border-[1.5px] border-slate-200/90 bg-slate-50/50 flex items-center justify-between gap-2.5">
                    <div className="h-3.5 w-36 rounded bg-slate-200/80 shimmer-sweep" />
                    <div className="h-4 w-4 rounded bg-rose-200/60 shimmer-sweep" />
                  </div>
                </div>

                {/* Quantity + Add to cart + Quick order */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1">
                  <div className="h-10 w-[104px] rounded-md border border-slate-200 bg-slate-100/80 shimmer-sweep shrink-0" />
                  <div className="flex-1 sm:flex-initial sm:w-32 h-10 rounded-md bg-slate-800/80 shimmer-sweep" />
                  <div className="w-full sm:w-32 h-10 rounded-md bg-[#FF5E5B]/25 shimmer-sweep" />
                </div>
              </div>
            </div>
          </div>

          {/* Centered Details Tabs Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5 sm:p-8">
            <div className="flex items-center justify-center gap-6 sm:gap-10 border-b border-slate-200/80 pb-3">
              <div className="h-4 w-24 rounded bg-[#FF5E5B]/25 shimmer-sweep" />
              <div className="h-4 w-24 rounded bg-slate-200/75 shimmer-sweep" />
            </div>
            <div className="max-w-3xl mx-auto pt-6 space-y-3">
              <div className="h-3.5 w-full rounded bg-slate-200/75 shimmer-sweep" />
              <div className="h-3.5 w-11/12 rounded bg-slate-200/70 shimmer-sweep" />
              <div className="h-3.5 w-4/5 rounded bg-slate-200/65 shimmer-sweep" />
              <div className="h-3.5 w-2/3 rounded bg-slate-200/60 shimmer-sweep" />
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-center gap-2">
                <div className="h-4 w-4 rounded-full bg-emerald-200/70 shimmer-sweep shrink-0" />
                <div className="h-3.5 w-64 max-w-full rounded bg-slate-200/70 shimmer-sweep" />
              </div>
            </div>
          </div>

          {/* Related Products Grid */}
          <section className="space-y-3 pt-1" aria-hidden="true">
            <div className="flex items-center justify-between gap-3">
              <div className="h-5 w-36 rounded bg-slate-200/90 shimmer-sweep" />
              <div className="h-3.5 w-16 rounded bg-slate-200/70 shimmer-sweep" />
            </div>
            <div className="product-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export function CartSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8" aria-busy="true" aria-label="Loading shopping cart">
      <div className="h-8 w-40 rounded-md bg-slate-200/80 dark:bg-slate-700 shimmer-sweep mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Cart Items */}
        <div className="lg:col-span-7 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-4"
            >
              <div className="h-16 w-16 rounded-lg bg-slate-200/80 dark:bg-slate-800 shimmer-sweep shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-1/2 rounded bg-slate-200/80 dark:bg-slate-700 shimmer-sweep" />
                <div className="h-3 w-1/4 rounded bg-slate-200/50 dark:bg-slate-800 shimmer-sweep" />
              </div>
              <div className="h-6 w-16 rounded bg-slate-200/70 dark:bg-slate-800 shimmer-sweep shrink-0" />
            </div>
          ))}
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-5">
          <div className="p-5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="h-5 w-32 rounded bg-slate-200/80 dark:bg-slate-700 shimmer-sweep" />
            <div className="space-y-2.5 pt-2">
              <div className="flex justify-between">
                <div className="h-4 w-20 rounded bg-slate-200/60 dark:bg-slate-800 shimmer-sweep" />
                <div className="h-4 w-16 rounded bg-slate-200/60 dark:bg-slate-800 shimmer-sweep" />
              </div>
              <div className="flex justify-between">
                <div className="h-4 w-24 rounded bg-slate-200/60 dark:bg-slate-800 shimmer-sweep" />
                <div className="h-4 w-14 rounded bg-slate-200/60 dark:bg-slate-800 shimmer-sweep" />
              </div>
            </div>
            <div className="h-px bg-slate-200 dark:bg-slate-800 my-3" />
            <div className="h-11 w-full rounded-xl bg-slate-200/90 dark:bg-slate-700 shimmer-sweep" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginSkeleton() {
  return (
    <div className="storefront-shell min-h-dvh flex flex-col">
      <StorefrontHeaderSkeleton />

      {/* Main Login Card matching LoginPageView */}
      <main id="main" className="flex-1 flex items-center justify-center py-8 sm:py-12 px-4" aria-busy="true" aria-label="Loading sign in">
        <div className="max-w-md w-full rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-5 shadow-lg">
          <div className="text-center space-y-2">
            <div className="h-10 w-10 rounded-xl bg-slate-200/80 dark:bg-slate-700 shimmer-sweep mx-auto" />
            <div className="h-6 w-32 rounded bg-slate-200/90 dark:bg-slate-700 shimmer-sweep mx-auto" />
          </div>

          {/* Mode Switcher Pills */}
          <div className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 flex gap-1">
            <div className="h-full flex-1 rounded bg-white dark:bg-slate-700 shimmer-sweep shadow-2xs" />
            <div className="h-full flex-1 rounded bg-transparent" />
          </div>

          {/* Form Fields */}
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <div className="h-3.5 w-16 rounded bg-slate-200/70 dark:bg-slate-700 shimmer-sweep" />
              <div className="h-10 w-full rounded-lg bg-slate-100 dark:bg-slate-800 shimmer-sweep" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3.5 w-20 rounded bg-slate-200/70 dark:bg-slate-700 shimmer-sweep" />
              <div className="h-10 w-full rounded-lg bg-slate-100 dark:bg-slate-800 shimmer-sweep" />
            </div>
            <div className="h-11 w-full rounded-xl bg-slate-900/80 dark:bg-slate-100/80 shimmer-sweep mt-3" />
          </div>
        </div>
      </main>
    </div>
  );
}

export function StorefrontSkeleton() {
  return (
    <div className="storefront-shell min-h-dvh flex flex-col">
      <StorefrontHeaderSkeleton />

      <main id="main" className="flex-1">
        <StorefrontHomeSkeleton />
      </main>
    </div>
  );
}
