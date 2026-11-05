'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { heroSlides, type Category } from '@/lib/products';
import { useStoreNav } from './StoreNavContext';

const sideCards = [
  {
    id: 'stream',
    code: 'STREAM' as Category,
    image: '/products/hero-side-stream.jpeg',
    kicker: 'Streaming',
    title: 'Netflix 4K & Spotify',
  },
  {
    id: 'ai',
    code: 'AI' as Category,
    image: '/products/hero-side-ai.jpeg',
    kicker: 'AI Workspace',
    title: 'ChatGPT Plus & Claude',
  },
] as const;

export function HeroSlider() {
  const [index, setIndex] = useState(0);
  const { navigateTo } = useStoreNav();
  const slide = heroSlides[index];

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % heroSlides.length);
    }, 6500);
    return () => window.clearInterval(id);
  }, []);

  const prev = () => setIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length);
  const next = () => setIndex((i) => (i + 1) % heroSlides.length);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-3" aria-label="Featured">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Main Banner */}
        <div className="lg:col-span-8 relative group rounded-xl overflow-hidden bg-slate-900 shadow-[0_0_0_1px_rgba(15,23,42,0.08),0_4px_12px_rgba(15,23,42,0.05)]">
          <button
            type="button"
            onClick={() => navigateTo('product', { productId: slide.productId })}
            className="w-full h-full block text-left p-0 border-0 bg-transparent cursor-pointer relative aspect-16/9 sm:aspect-16/8"
            aria-label={slide.title}
          >
            <img
              key={slide.image}
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover group-hover:scale-[1.015] transition-transform duration-500 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 flex items-end justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                  Featured
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
                  {slide.title}
                </h2>
              </div>
              <span className="h-9 px-3.5 rounded-lg bg-white text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5 shrink-0 shadow-xs group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <span>View Plan</span>
                <ArrowUpRight size={14} strokeWidth={2.2} />
              </span>
            </div>
          </button>

          {/* Controls */}
          <div className="absolute top-3.5 right-3.5 flex items-center gap-1 bg-slate-950/60 backdrop-blur-md p-1 rounded-lg border border-white/10">
            <button
              type="button"
              aria-label="Previous"
              onClick={prev}
              className="w-6 h-6 rounded-md text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} strokeWidth={2.2} />
            </button>
            <div className="flex items-center gap-1 px-1" role="tablist">
              {heroSlides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={s.title}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next"
              onClick={next}
              className="w-6 h-6 rounded-md text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight size={14} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* Side Category Highlights */}
        <aside className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-3.5">
          {sideCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => navigateTo('shop', { code: card.code })}
              className="group relative rounded-xl overflow-hidden bg-slate-900 border-0 p-0 text-left cursor-pointer shadow-[0_0_0_1px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.04)] aspect-16/10 lg:aspect-auto lg:h-full"
            >
              <img
                src={card.image}
                alt={card.title}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between gap-2">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                    {card.kicker}
                  </div>
                  <div className="font-display text-sm font-bold text-white leading-snug mt-0.5">
                    {card.title}
                  </div>
                </div>
                <span className="w-7 h-7 rounded-lg bg-white/15 backdrop-blur-xs text-white flex items-center justify-center shrink-0 group-hover:bg-emerald-600 transition-colors">
                  <ArrowUpRight size={14} strokeWidth={2.2} />
                </span>
              </div>
            </button>
          ))}
        </aside>
      </div>
    </section>
  );
}
