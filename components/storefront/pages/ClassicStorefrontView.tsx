'use client';

import { BrandLogo } from '@/components/brand/BrandLogo';
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
import { heroSlides } from '@/lib/products';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import type { HomeBannerItem } from '@/lib/home-banners-shared';
import { useCart } from '@/context/CartContext';
import { useCustomerSession } from '@/hooks/use-customer-session';
import { useStoreNav } from '@/context/StoreNavContext';
import { useCatalog } from '@/context/CatalogContext';
import { ProductCard } from '@/components/storefront/features/ProductCard';
import { SearchCommandModal } from '@/components/storefront/features/SearchCommandModal';
import { StoreFooter } from '@/components/storefront/chrome/StoreFooter';
import { ShopPageView } from '@/components/storefront/pages/ShopPageView';
import { ProductDetailView } from '@/components/storefront/pages/ProductDetailView';
import { CartPageView } from '@/components/storefront/pages/CartPageView';
import { HowPageView } from '@/components/storefront/pages/HowPageView';
import { FaqPageView } from '@/components/storefront/pages/FaqPageView';
import { ContactPageView } from '@/components/storefront/pages/ContactPageView';
import { LoginPageView } from '@/components/storefront/pages/LoginPageView';
import { AccountPageView } from '@/components/storefront/pages/AccountPageView';

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

/** A hero image with what happens when it is clicked. */
type HeroImage = {
  id: string;
  image: string;
  alt: string;
  /** Internal navigation (product / category). */
  onClick?: () => void;
  /** Plain link (custom URL or path). */
  href?: string;
  external?: boolean;
};

/** One clickable (or plain) hero image frame. */
function HeroFrame({
  item,
  className,
  children,
}: {
  item: HeroImage;
  className: string;
  children: React.ReactNode;
}) {
  if (item.href) {
    return (
      <a
        href={item.href}
        className={`${className} no-underline`}
        {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        aria-label={item.alt || undefined}
      >
        {children}
      </a>
    );
  }
  if (item.onClick) {
    return (
      <button
        type="button"
        onClick={item.onClick}
        className={`${className} border-0 p-0 bg-transparent cursor-pointer text-left`}
        aria-label={item.alt || undefined}
      >
        {children}
      </button>
    );
  }
  // Not a link: shown as a picture only.
  return <div className={className}>{children}</div>;
}

function ClassicHomeView() {
  const [index, setIndex] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const { navigateTo } = useStoreNav();
  const { products } = useCatalog();
  const { homeBanners = [], homeBannersCustom = false } = useStoreSettings();

  /** Turns an admin banner into an image with a safe click action. */
  const resolve = (b: HomeBannerItem): HeroImage => {
    const base = { id: b.id, image: b.imageUrl, alt: b.alt };
    if (b.linkType === 'product' && products.some((p) => p.id === b.linkValue)) {
      return { ...base, onClick: () => navigateTo('product', { productId: b.linkValue }) };
    }
    if (b.linkType === 'category' && ['AI', 'STREAM', 'WORK', 'CREATE'].includes(b.linkValue)) {
      return { ...base, onClick: () => navigateTo('shop', { code: b.linkValue as 'AI' }) };
    }
    if (b.linkType === 'url') {
      if (/^https?:\/\//i.test(b.linkValue)) return { ...base, href: b.linkValue, external: true };
      if (/^\/(?!\/)/.test(b.linkValue)) return { ...base, href: b.linkValue };
    }
    return base;
  };

  const defaultSlides: HeroImage[] =
    heroSlides.length > 0
      ? heroSlides.map((s) => ({
          id: s.id,
          image: s.image,
          alt: s.title,
          onClick: () => navigateTo('product', { productId: s.productId }),
        }))
      : products.slice(0, 3).map((p) => ({
          id: `slide-${p.id}`,
          image: p.image,
          alt: p.name,
          onClick: () => navigateTo('product', { productId: p.id }),
        }));
  const defaultSides: HeroImage[] = sideCards.map((c) => ({
    id: c.id,
    image: c.image,
    alt: c.label,
    onClick: () => navigateTo('shop', { code: c.code }),
  }));

  // Once an admin has set banners up, only those are shown; until then the built-in defaults.
  const slides = homeBannersCustom
    ? homeBanners.filter((b) => b.slot === 'main').map(resolve)
    : defaultSlides;
  const sides = homeBannersCustom
    ? homeBanners.filter((b) => b.slot === 'side').map(resolve)
    : defaultSides;
  const slide = slides[Math.min(index, slides.length - 1)] ?? slides[0];

  const featured = products.slice(0, 7);
  const offers =
    products.filter((p) => p.sale || p.featured).length > 0
      ? products.filter((p) => p.sale || p.featured)
      : products.slice(0, 5);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(id);
  }, [slides.length]);

  const move = (dir: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.85, 280), behavior: 'smooth' });
  };

  const hasHero = Boolean(slide) || sides.length > 0;

  return (
    <div className="home">
      {hasHero ? (
      <section className="offer-hero" aria-roledescription="carousel" aria-label="Offers">
        <div className={`offer-stage${sides.length === 0 ? ' offer-stage--solo' : ''}`}>
          {slide ? (
            <HeroFrame item={slide} className="offer-banner block w-full">
              <div className="offer-visual">
                <img
                  key={slide.image}
                  src={slide.image}
                  alt={slide.alt || 'Featured offer'}
                  fetchPriority="high"
                  decoding="async"
                  width={1200}
                  height={600}
                />
              </div>
            </HeroFrame>
          ) : (
            <div />
          )}

          {sides.length > 0 ? (
          <aside
            className="offer-sides"
            aria-label="Highlights"
            style={{ gridTemplateRows: `repeat(${sides.length}, minmax(0, 1fr))` }}
          >
            {sides.map((card) => (
              <HeroFrame key={card.id} item={card} className="offer-side block">
                <img
                  src={card.image}
                  alt={card.alt || 'Highlight'}
                  loading="lazy"
                  decoding="async"
                  width={400}
                  height={240}
                />
              </HeroFrame>
            ))}
          </aside>
          ) : null}
        </div>

        {slides.length > 1 ? (
        <div className="offer-controls">
          <button
            type="button"
            aria-label="Previous offer"
            onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
          >
            <ChevronLeft size={22} strokeWidth={2.4} />
          </button>
          <div className="offer-dots" role="tablist">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={s.alt || `Slide ${i + 1}`}
                className={i === index ? 'is-on' : ''}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next offer"
            onClick={() => setIndex((i) => (i + 1) % slides.length)}
          >
            <ChevronRight size={22} strokeWidth={2.4} />
          </button>
        </div>
        ) : null}
      </section>
      ) : null}

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
  // Account has its own sidebar + top bar — never wrap it in store chrome.
  const isUserPanel = view === 'account';

  useEffect(() => {
    if (isUserPanel) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isUserPanel]);

  if (isUserPanel) {
    return (
      <div className="app-shell">
        <main id="main">
          <AccountPageView />
        </main>
      </div>
    );
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
            aria-label="Blumartbd home"
          >
            <BrandLogo />
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
