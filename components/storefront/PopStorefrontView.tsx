'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ShoppingBag,
  ShoppingCart,
  Zap,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Tv,
  Palette,
  Briefcase,
  LayoutGrid,
  BadgeCheck,
  Headphones,
  ArrowRight,
  X,
  Home,
  User,
} from 'lucide-react';
import {
  products,
  heroSlides,
  startingAmount,
  startingPrice,
  type Category,
  type Product,
} from '@/lib/products';
import { useCart } from '@/context/CartContext';
import { useQuickOrder } from '@/context/QuickOrderContext';
import { readCustomer } from '@/lib/customerSession';
import { useStoreNav } from './StoreNavContext';
import { ProductDetailView } from './ProductDetailView';
import { CartPageView } from './CartPageView';
import { HowPageView } from './HowPageView';
import { FaqPageView } from './FaqPageView';
import { ContactPageView } from './ContactPageView';
import { LoginPageView } from './LoginPageView';
import { AccountPageView } from './AccountPageView';
import { StoreFooter } from './StoreFooter';
import { SearchCommandModal } from './SearchCommandModal';

const SIDE_POSTERS = [
  {
    id: 'stream',
    code: 'STREAM' as Category,
    image: '/products/hero-side-stream.jpeg',
    label: 'Top streaming tools',
  },
  {
    id: 'ai',
    code: 'AI' as Category,
    image: '/products/hero-side-ai.jpeg',
    label: 'Top AI tools',
  },
] as const;

const POP_CATS: Array<{
  code: Category | 'ALL';
  label: string;
  color: string;
  Icon: typeof LayoutGrid;
}> = [
  { code: 'ALL', label: 'All Passes', color: 'bg-[#6366F1] text-white', Icon: LayoutGrid },
  { code: 'AI', label: 'AI Tools', color: 'bg-[#FF5E5B] text-white', Icon: Sparkles },
  { code: 'STREAM', label: 'Streaming', color: 'bg-[#10B981] text-white', Icon: Tv },
  { code: 'CREATE', label: 'Creative', color: 'bg-[#F59E0B] text-slate-950', Icon: Palette },
  { code: 'WORK', label: 'Workspace', color: 'bg-[#8B5CF6] text-white', Icon: Briefcase },
];

const TRUST_NOTES = [
  { title: 'Listed products', Icon: BadgeCheck },
  { title: 'Fast delivery', Icon: Zap },
  { title: 'Support ready', Icon: Headphones },
  { title: 'Cart checkout', Icon: ShoppingBag },
];

function PopProductCard({ product }: { product: Product }) {
  const { openQuickOrder } = useQuickOrder();
  const { navigateTo } = useStoreNav();

  const handleOpenProduct = () => {
    navigateTo('product', { productId: product.id });
  };

  return (
    <article className="group rounded-xl bg-white border border-indigo-100 hover:border-[#6366F1] p-3 shadow-[0_4px_14px_-4px_rgba(99,102,241,0.08)] hover:shadow-[0_10px_25px_-6px_rgba(99,102,241,0.16)] flex flex-col justify-between transition-all">
      <div>
        {/* Product Artwork with Price Badge */}
        <button
          type="button"
          onClick={handleOpenProduct}
          className="relative w-full aspect-4/3 rounded-lg overflow-hidden bg-indigo-50/50 border border-indigo-100/80 p-0 m-0 block text-left cursor-pointer"
          aria-label={`${product.name}, ${startingPrice(product)}`}
        >
          {(product.sale || product.badge) && (
            <span className="absolute top-2 left-2 z-10 bg-[#FF5E5B] text-white font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs">
              {product.sale ? 'Sale' : product.badge}
            </span>
          )}

          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 ease-out"
          />

          <span
            className="absolute bottom-2 left-2 bg-[#1E1B4B]/90 backdrop-blur-md text-white px-2.5 py-1 rounded-md flex items-baseline gap-1 shadow-xs"
            lang="bn"
          >
            <span className="font-mono text-xs font-extrabold text-[#FACC15]">
              ৳{startingAmount(product)}
            </span>
            <span className="text-[10px] text-indigo-200 font-semibold">
              থেকে শুরু
            </span>
          </span>
        </button>

        {/* Clean Title & Platform */}
        <div className="pt-3 px-0.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#6366F1]">
            <span>{product.platform}</span>
            <span className="text-slate-400 font-medium">
              {product.plans.length} options
            </span>
          </div>

          <h3 className="mt-0.5">
            <button
              type="button"
              onClick={handleOpenProduct}
              className="text-[15px] font-extrabold text-[#1E1B4B] group-hover:text-[#FF5E5B] transition-colors text-left border-0 bg-transparent p-0 cursor-pointer truncate block w-full"
            >
              {product.name}
            </button>
          </h3>
        </div>
      </div>

      {/* Crisp Action Buttons (Moderate Radius rounded-lg) */}
      <div className="grid grid-cols-2 gap-2 mt-3.5 pt-2.5 border-t border-indigo-50">
        <button
          type="button"
          onClick={handleOpenProduct}
          className="h-9 px-2 rounded-lg bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4338CA] font-extrabold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
        >
          <ShoppingCart size={13} strokeWidth={2.3} className="shrink-0" />
          <span>Select option</span>
        </button>

        <button
          type="button"
          onClick={() => openQuickOrder(product)}
          className="h-9 px-2 rounded-lg bg-[#FF5E5B] hover:bg-[#ff4743] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap shadow-2xs transition-colors cursor-pointer"
        >
          <Zap size={13} strokeWidth={2.3} className="shrink-0" />
          <span>Quick order</span>
        </button>
      </div>
    </article>
  );
}

export function PopStorefrontView() {
  const { count } = useCart();
  const { view, categoryCode, selectedProductId, navigateTo } = useStoreNav();
  const session = useMemo(() => readCustomer(), []);

  const [slideIndex, setSlideIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const offerScroller = useRef<HTMLDivElement>(null);

  const activeSlide = heroSlides[slideIndex];
  const specialOffers = products.filter((p) => p.sale || p.featured);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const id = window.setInterval(() => {
      setSlideIndex((i) => (i + 1) % heroSlides.length);
    }, 6500);
    return () => window.clearInterval(id);
  }, []);

  const prevSlide = () =>
    setSlideIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length);
  const nextSlide = () =>
    setSlideIndex((i) => (i + 1) % heroSlides.length);

  const scrollOffers = (dir: number) => {
    const el = offerScroller.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.min(el.clientWidth * 0.85, 290),
      behavior: 'smooth',
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const catOk = categoryCode === 'ALL' || p.code === categoryCode;
      const qOk =
        !q || `${p.name} ${p.platform} ${p.code} ${p.tagline}`.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [categoryCode, search]);

  return (
    <div className="min-h-dvh flex flex-col bg-[#F5F3FF] text-[#1E1B4B] font-display selection:bg-[#FF5E5B] selection:text-white pb-16 md:pb-0">
      {/* Tactile Pop Header (1st Rounded Pill Style) */}
      <header className="sticky top-11 z-40 px-3 sm:px-6 pt-3">
        <div className="max-w-7xl mx-auto h-14 sm:h-16 px-3.5 sm:px-5 rounded-full bg-white/95 backdrop-blur-md border-2 border-indigo-100 shadow-[0_8px_24px_-6px_rgba(99,102,241,0.12)] flex items-center justify-between gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => navigateTo('home', { code: 'ALL' })}
            className="flex items-center gap-2 cursor-pointer border-0 bg-transparent p-0 shrink-0"
          >
            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-[#FF5E5B] text-white font-extrabold text-sm sm:text-base flex items-center justify-center shadow-md shadow-[#FF5E5B]/25 rotate-[-4deg] shrink-0">
              B
            </span>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#1E1B4B] whitespace-nowrap">
              Bit<span className="text-[#FF5E5B]">logic</span>
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-6 text-xs font-extrabold text-[#4338CA]">
            <button
              type="button"
              onClick={() => navigateTo('home', { code: 'ALL' })}
              className={`hover:text-[#FF5E5B] cursor-pointer ${
                view === 'home' ? 'text-[#FF5E5B]' : ''
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => navigateTo('shop', { code: 'AI' })}
              className={`hover:text-[#FF5E5B] cursor-pointer ${
                view === 'shop' ? 'text-[#FF5E5B]' : ''
              }`}
            >
              AI tools
            </button>
            <button
              type="button"
              onClick={() => navigateTo('faq')}
              className={`hover:text-[#FF5E5B] cursor-pointer ${
                view === 'faq' ? 'text-[#FF5E5B]' : ''
              }`}
            >
              FAQ
            </button>
            <button
              type="button"
              onClick={() => navigateTo('contact')}
              className={`hover:text-[#FF5E5B] cursor-pointer ${
                view === 'contact' ? 'text-[#FF5E5B]' : ''
              }`}
            >
              Contact
            </button>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="h-9 sm:h-10 w-9 sm:w-auto sm:px-3.5 rounded-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-[#1E1B4B] font-extrabold text-xs inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
              aria-label="Search products"
              title="Search products (⌘K)"
            >
              <Search size={14} strokeWidth={2.4} className="text-[#FF5E5B] shrink-0" />
              <span className="hidden lg:inline text-slate-500 font-semibold">Search...</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 rounded bg-white border border-indigo-200 font-mono text-[10px] text-indigo-400">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('cart')}
              className="h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4338CA] font-extrabold text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              <ShoppingBag size={14} className="shrink-0" />
              <span>Cart ({count})</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo(session ? 'account' : 'login')}
              className="h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-[#1E1B4B] hover:bg-[#FF5E5B] text-white font-extrabold text-xs whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              {session ? 'Account' : 'Sign in'}
            </button>
          </div>
        </div>
      </header>

      <SearchCommandModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      {view === 'home' || view === 'shop' ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
          {/* 1. Hero Slider + 2 Side Posters (Inside Vibrant Tactile Frame) */}
          <section
            className="rounded-2xl bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#EC4899] p-3 sm:p-4 shadow-[0_12px_30px_-8px_rgba(99,102,241,0.28)]"
            aria-label="Offers and Category Posters"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
              {/* Left 8 Cols: Main Hero Slider */}
              <div className="lg:col-span-8 relative rounded-xl overflow-hidden bg-[#1E1B4B] shadow-md group">
                <button
                  type="button"
                  onClick={() =>
                    navigateTo('product', { productId: activeSlide.productId })
                  }
                  className="w-full h-full block p-0 border-0 bg-transparent cursor-pointer aspect-16/9 sm:aspect-16/8"
                  aria-label={`${activeSlide.title} — view product`}
                >
                  <img
                    key={activeSlide.image}
                    src={activeSlide.image}
                    alt={activeSlide.title}
                    className="w-full h-full object-cover group-hover:scale-[1.015] transition-transform duration-500"
                  />
                </button>

                {/* Slider Controls */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#1E1B4B]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/15">
                  <button
                    type="button"
                    aria-label="Previous offer"
                    onClick={prevSlide}
                    className="text-white/80 hover:text-white cursor-pointer"
                  >
                    <ChevronLeft size={16} strokeWidth={2.5} />
                  </button>
                  <div className="flex items-center gap-1.5" role="tablist">
                    {heroSlides.map((s, i) => (
                      <button
                        key={s.id}
                        type="button"
                        role="tab"
                        aria-selected={i === slideIndex}
                        aria-label={s.title}
                        onClick={() => setSlideIndex(i)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          i === slideIndex
                            ? 'w-5 bg-[#FACC15]'
                            : 'w-1.5 bg-white/40 hover:bg-white/70'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    aria-label="Next offer"
                    onClick={nextSlide}
                    className="text-white/80 hover:text-white cursor-pointer"
                  >
                    <ChevronRight size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* Right 4 Cols: The Two Side Posters */}
              <aside
                className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-3.5"
                aria-label="Category highlights"
              >
                {SIDE_POSTERS.map((poster) => (
                  <button
                    key={poster.id}
                    type="button"
                    onClick={() => navigateTo('home', { code: poster.code })}
                    className="relative rounded-xl overflow-hidden bg-[#1E1B4B] border-0 p-0 cursor-pointer shadow-md group aspect-16/10 lg:aspect-auto lg:h-full block"
                    aria-label={poster.label}
                  >
                    <img
                      src={poster.image}
                      alt={poster.label}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                  </button>
                ))}
              </aside>
            </div>

            {/* 2. Search Bar & Category Filter Strip right below the Slider/Posters */}
            <div className="mt-3.5 pt-3 border-t border-white/20 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Category Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                {POP_CATS.map(({ code, label, Icon }) => {
                  const active = categoryCode === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => navigateTo('home', { code })}
                      className={`px-3.5 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-white text-[#1E1B4B] shadow-sm'
                          : 'bg-white/15 text-white hover:bg-white/25'
                      }`}
                    >
                      <Icon size={13} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Clean Search Box */}
              <div className="relative w-full md:w-80 bg-white rounded-lg shadow-sm flex items-center">
                <Search
                  size={15}
                  className="text-indigo-400 ml-3 shrink-0"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ChatGPT, Netflix, Canva..."
                  className="w-full h-9 pl-2.5 pr-8 bg-transparent text-xs font-bold text-[#1E1B4B] placeholder:text-indigo-300 focus:outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* 3. Special Offer Rail */}
          {!search && categoryCode === 'ALL' && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-[#1E1B4B]">
                  Special offer
                </h2>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => scrollOffers(-1)}
                    aria-label="Previous products"
                    className="w-8 h-8 rounded-lg bg-white border border-indigo-100 hover:border-[#6366F1] text-[#1E1B4B] flex items-center justify-center shadow-2xs cursor-pointer"
                  >
                    <ChevronLeft size={16} strokeWidth={2.4} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollOffers(1)}
                    aria-label="Next products"
                    className="w-8 h-8 rounded-lg bg-white border border-indigo-100 hover:border-[#6366F1] text-[#1E1B4B] flex items-center justify-center shadow-2xs cursor-pointer"
                  >
                    <ChevronRight size={16} strokeWidth={2.4} />
                  </button>
                </div>
              </div>

              <div
                ref={offerScroller}
                className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none"
              >
                {specialOffers.map((p) => (
                  <div
                    key={p.id}
                    className="w-[240px] sm:w-[260px] shrink-0 snap-start"
                  >
                    <PopProductCard product={p} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 4. Trust Strip */}
          <section
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
            aria-label="Store notes"
          >
            {TRUST_NOTES.map(({ title, Icon }) => (
              <div
                key={title}
                className="bg-white rounded-xl border border-indigo-100 px-4 py-3 flex items-center gap-3 shadow-2xs"
              >
                <span className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#6366F1] flex items-center justify-center shrink-0">
                  <Icon size={16} strokeWidth={2.3} />
                </span>
                <span className="font-extrabold text-xs text-[#1E1B4B]">
                  {title}
                </span>
              </div>
            ))}
          </section>

          {/* 5. Featured Products Grid */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#1E1B4B]">
                {categoryCode === 'ALL'
                  ? 'Featured products'
                  : POP_CATS.find((c) => c.code === categoryCode)?.label}
              </h2>
              <span className="text-xs font-bold text-indigo-400">
                {filtered.length} products
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((product) => (
                <PopProductCard key={product.id} product={product} />
              ))}

              {categoryCode === 'ALL' && !search && (
                <article className="rounded-xl bg-gradient-to-br from-[#1E1B4B] to-[#312E81] text-white p-5 flex flex-col justify-between shadow-md">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF5E5B]">
                      Full catalog
                    </span>
                    <h3 className="text-xl font-extrabold leading-snug">
                      See more products
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigateTo('shop', { code: 'ALL' })}
                    className="mt-6 h-9 px-4 rounded-lg bg-[#FF5E5B] hover:bg-[#ff4743] text-white font-extrabold text-xs flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>Browse shop</span>
                    <ArrowRight size={14} strokeWidth={2.4} />
                  </button>
                </article>
              )}
            </div>
          </section>
        </main>
      ) : (
        <div className="flex-1 bg-white">
          {view === 'product' && (
            <ProductDetailView productId={selectedProductId || 'chatgpt-plus'} />
          )}
          {view === 'cart' && <CartPageView />}
          {view === 'how' && <HowPageView />}
          {view === 'faq' && <FaqPageView />}
          {view === 'contact' && <ContactPageView />}
          {view === 'login' && <LoginPageView />}
          {view === 'account' && <AccountPageView />}
        </div>
      )}

      <StoreFooter />

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-indigo-100 flex justify-around py-2 px-2">
        <button
          type="button"
          onClick={() => navigateTo('home', { code: 'ALL' })}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold ${
            view === 'home' ? 'text-[#FF5E5B]' : 'text-slate-500'
          }`}
        >
          <Home size={18} />
          <span>Home</span>
        </button>
        <button
          type="button"
          onClick={() => navigateTo('shop', { code: 'ALL' })}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold ${
            view === 'shop' ? 'text-[#FF5E5B]' : 'text-slate-500'
          }`}
        >
          <LayoutGrid size={18} />
          <span>Shop</span>
        </button>
        <button
          type="button"
          onClick={() => navigateTo('cart')}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold ${
            view === 'cart' ? 'text-[#FF5E5B]' : 'text-slate-500'
          }`}
        >
          <ShoppingBag size={18} />
          <span>Cart ({count})</span>
        </button>
        <button
          type="button"
          onClick={() => navigateTo(session ? 'account' : 'login')}
          className="flex flex-col items-center gap-1 text-[11px] font-bold text-slate-500"
        >
          <User size={18} />
          <span>Account</span>
        </button>
      </nav>
    </div>
  );
}
