'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Home,
  LayoutGrid,
  Search,
  ShoppingBag,
  User,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { heroSlides, products } from '@/lib/products';
import { useCart } from '@/context/CartContext';
import { useCustomerSession } from '@/lib/customerSession';
import { useStoreNav } from './StoreNavContext';
import { ProductCard } from './ProductCard';
import { ShopPageView } from './ShopPageView';
import { ProductDetailView } from './ProductDetailView';
import { CartPageView } from './CartPageView';
import { HowPageView } from './HowPageView';
import { FaqPageView } from './FaqPageView';
import { ContactPageView } from './ContactPageView';
import { LoginPageView } from './LoginPageView';
import { AccountPageView } from './AccountPageView';
import { StoreFooter } from './StoreFooter';
import { SearchCommandModal } from './SearchCommandModal';

const sideCards = [
  {
    id: 'stream',
    code: 'STREAM' as const,
    image: '/products/hero-side-stream.jpeg',
    label: 'Top streaming tools',
  },
  {
    id: 'ai',
    code: 'AI' as const,
    image: '/products/hero-side-ai.jpeg',
    label: 'Top AI tools',
  },
];

const trusts = [
  { title: 'Listed products', Icon: BadgeCheck },
  { title: 'Fast delivery', Icon: Zap },
  { title: 'Support ready', Icon: Headphones },
  { title: 'Cart checkout', Icon: ShoppingBag },
];

function ClassicHomeView() {
  const [index, setIndex] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const { navigateTo } = useStoreNav();

  const slide = heroSlides[index];
  const offers = products.filter((p) => p.sale || p.featured);
  const featured = products.slice(0, 7);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % heroSlides.length);
    }, 6500);
    return () => window.clearInterval(id);
  }, []);

  const move = (dir: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.85, 280), behavior: 'smooth' });
  };

  return (
    <div className="home">
      <section className="offer-hero" aria-roledescription="carousel" aria-label="Offers">
        <div className="offer-stage">
          <button
            type="button"
            onClick={() => navigateTo('product', { productId: slide.productId })}
            className="offer-banner border-0 p-0 bg-transparent cursor-pointer block w-full text-left"
          >
            <div className="offer-visual">
              <img key={slide.image} src={slide.image} alt="" />
            </div>
          </button>

          <aside className="offer-sides" aria-label="Category highlights">
            {sideCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => navigateTo('shop', { code: card.code })}
                className="offer-side border-0 p-0 bg-transparent cursor-pointer block"
                aria-label={card.label}
              >
                <img src={card.image} alt="" />
              </button>
            ))}
          </aside>
        </div>

        <div className="offer-controls">
          <button
            type="button"
            aria-label="Previous offer"
            onClick={() => setIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length)}
          >
            <ChevronLeft size={22} strokeWidth={2.4} />
          </button>
          <div className="offer-dots" role="tablist">
            {heroSlides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={s.title}
                className={i === index ? 'is-on' : ''}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next offer"
            onClick={() => setIndex((i) => (i + 1) % heroSlides.length)}
          >
            <ChevronRight size={22} strokeWidth={2.4} />
          </button>
        </div>
      </section>

      <section className="rail-section">
        <div className="section-rule">
          <span />
          <h2>Special offer</h2>
          <span />
        </div>
        <div className="rail-wrap">
          <button
            type="button"
            className="rail-arrow rail-arrow-side"
            aria-label="Previous products"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={22} strokeWidth={2.4} />
          </button>
          <div className="rail" ref={scroller}>
            {offers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <button
            type="button"
            className="rail-arrow rail-arrow-side"
            aria-label="Next products"
            onClick={() => move(1)}
          >
            <ChevronRight size={22} strokeWidth={2.4} />
          </button>
        </div>
      </section>

      <section className="trust-row" aria-label="Store notes">
        {trusts.map(({ title, Icon }) => (
          <article key={title}>
            <span className="trust-icon" aria-hidden="true">
              <Icon size={20} strokeWidth={2.2} />
            </span>
            <h3>{title}</h3>
          </article>
        ))}
      </section>

      <section className="featured-block">
        <div className="section-rule">
          <span />
          <h2>Featured products</h2>
          <span />
        </div>

        <div className="product-grid">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
          <article className="pcard more-card">
            <button
              type="button"
              onClick={() => navigateTo('shop', { code: 'ALL' })}
              className="more-card-link border-0 bg-transparent cursor-pointer text-left w-full"
            >
              <span className="more-card-kicker">Full catalog</span>
              <strong className="more-card-title">See more products</strong>
              <span className="more-card-btn">
                Browse shop
                <ArrowRight size={16} strokeWidth={2.4} aria-hidden="true" />
              </span>
            </button>
          </article>
        </div>
      </section>
    </div>
  );
}

export function ClassicStorefrontView() {
  const { count } = useCart();
  const { view, selectedProductId, navigateTo } = useStoreNav();
  const session = useCustomerSession();
  const [searchOpen, setSearchOpen] = useState(false);

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

  if (view === 'account') {
    return <AccountPageView />;
  }

  return (
    <div className="app-shell pb-16 md:pb-0">
      {/* Clean Rounded Header (Mobile-Responsive, Search on Desktop, Modern Cart Counter Badge) */}
      <header className="sticky top-0 z-40 px-3 sm:px-6 pt-3 pb-1">
        <div className="max-w-[1180px] mx-auto h-14 sm:h-16 px-3.5 sm:px-5 rounded-full bg-white/95 backdrop-blur-md border-2 border-slate-200/80 shadow-[0_8px_24px_-6px_rgba(15,23,42,0.08)] flex items-center justify-between gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => navigateTo('home', { code: 'ALL' })}
            className="flex items-center gap-2 cursor-pointer border-0 bg-transparent p-0 shrink-0"
            aria-label="Bitlogic home"
          >
            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-[#FF5E5B] text-white font-extrabold text-sm sm:text-base flex items-center justify-center shadow-md shadow-[#FF5E5B]/25 rotate-[-4deg] shrink-0">
              B
            </span>
            <span className="font-display font-extrabold text-lg sm:text-xl tracking-tight text-[#0F172A] whitespace-nowrap">
              Bit<span className="text-[#FF5E5B]">logic</span>
            </span>
          </button>

          <nav
            className="hidden md:flex items-center gap-6 text-xs font-extrabold text-slate-700"
            aria-label="Primary"
          >
            <button
              type="button"
              onClick={() => navigateTo('home', { code: 'ALL' })}
              className={`border-0 bg-transparent cursor-pointer transition-colors hover:text-[#FF5E5B] ${
                view === 'home' ? 'text-[#FF5E5B]' : 'text-slate-700'
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => navigateTo('shop', { code: 'AI' })}
              className={`border-0 bg-transparent cursor-pointer transition-colors hover:text-[#FF5E5B] ${
                view === 'shop' ? 'text-[#FF5E5B]' : 'text-slate-700'
              }`}
            >
              AI tools
            </button>
            <button
              type="button"
              onClick={() => navigateTo('faq')}
              className={`border-0 bg-transparent cursor-pointer transition-colors hover:text-[#FF5E5B] ${
                view === 'faq' ? 'text-[#FF5E5B]' : 'text-slate-700'
              }`}
            >
              FAQ
            </button>
            <button
              type="button"
              onClick={() => navigateTo('contact')}
              className={`border-0 bg-transparent cursor-pointer transition-colors hover:text-[#FF5E5B] ${
                view === 'contact' ? 'text-[#FF5E5B]' : 'text-slate-700'
              }`}
            >
              Contact
            </button>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {/* Search Trigger Button — Desktop/Tablet only (Mobile uses bottom bar Search) */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden md:inline-flex h-10 px-3.5 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200/90 text-[#0F172A] font-extrabold text-xs items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
              aria-label="Search products"
              title="Search products (⌘K)"
            >
              <Search size={14} strokeWidth={2.4} className="text-[#FF5E5B] shrink-0" />
              <span className="text-slate-500 font-semibold">Search...</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] text-slate-400">
                ⌘K
              </kbd>
            </button>

            {/* Modern Cart Button with Number Badge Inside (No "Cart" text) */}
            <button
              type="button"
              onClick={() => navigateTo('cart')}
              className="relative h-9 sm:h-10 px-3 rounded-full bg-[#FFF1F0] hover:bg-[#FFE4E2] border border-[#FECDD3] text-[#FF5E5B] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              aria-label={`Cart (${count} items)`}
            >
              <ShoppingBag size={16} strokeWidth={2.2} className="shrink-0" aria-hidden="true" />
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF5E5B] text-white font-mono text-[11px] font-extrabold inline-flex items-center justify-center leading-none tabular-nums">
                {count}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo(session ? 'account' : 'login')}
              className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-full bg-[#0F172A] hover:bg-[#FF5E5B] text-white font-extrabold text-xs whitespace-nowrap transition-colors cursor-pointer border-0 shrink-0 flex items-center gap-1.5"
            >
              <User size={14} strokeWidth={2.4} />
              <span>{session ? (session.name ? session.name.split(' ')[0] : 'Account') : 'Sign in'}</span>
            </button>
          </div>
        </div>
      </header>

      <SearchCommandModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      <main id="main">
        {view === 'home' && <ClassicHomeView />}
        {view === 'shop' && <ShopPageView />}
        {view === 'product' && (
          <ProductDetailView productId={selectedProductId || 'chatgpt-plus'} />
        )}
        {view === 'cart' && <CartPageView />}
        {view === 'how' && <HowPageView />}
        {view === 'faq' && <FaqPageView />}
        {view === 'contact' && <ContactPageView />}
        {view === 'login' && <LoginPageView />}
      </main>

      <StoreFooter />

      {/* Clean Mobile Bottom Navigation Bar (Home, Shop, Search, Account/Sign In) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around py-2 px-2 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]"
        aria-label="Mobile"
      >
        <button
          type="button"
          onClick={() => navigateTo('home', { code: 'ALL' })}
          className={`flex flex-col items-center gap-0.5 text-[11px] font-bold bg-transparent border-0 p-1 cursor-pointer ${
            view === 'home' ? 'text-[#FF5E5B]' : 'text-slate-500'
          }`}
        >
          <Home size={18} strokeWidth={2.2} />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('shop', { code: 'ALL' })}
          className={`flex flex-col items-center gap-0.5 text-[11px] font-bold bg-transparent border-0 p-1 cursor-pointer ${
            view === 'shop' ? 'text-[#FF5E5B]' : 'text-slate-500'
          }`}
        >
          <LayoutGrid size={18} strokeWidth={2.2} />
          <span>Shop</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className={`flex flex-col items-center gap-0.5 text-[11px] font-bold bg-transparent border-0 p-1 cursor-pointer ${
            searchOpen ? 'text-[#FF5E5B]' : 'text-slate-500 hover:text-[#FF5E5B]'
          }`}
        >
          <Search size={18} strokeWidth={2.2} />
          <span>Search</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo(session ? 'account' : 'login')}
          className={`flex flex-col items-center gap-0.5 text-[11px] font-bold bg-transparent border-0 p-1 cursor-pointer ${
            view === 'login' ? 'text-[#FF5E5B]' : 'text-slate-500'
          }`}
        >
          <User size={18} strokeWidth={2.2} />
          <span>{session ? 'Account' : 'Sign in'}</span>
        </button>
      </nav>
    </div>
  );
}
