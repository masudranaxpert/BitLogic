'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Minus,
  Plus,
  Zap,
  ShoppingCart,
  Star,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  AlertCircle,
  Check,
  X,
} from 'lucide-react';
import { formatPrice, getProduct, products } from '@/lib/products';
import { useCart } from '@/context/CartContext';
import { useQuickOrder } from '@/context/QuickOrderContext';
import { ProductCard } from './ProductCard';
import { DurationBadge, PlanWarrantyCard, WarrantyBadge } from './ui';
import { useStoreNav } from './StoreNavContext';

type TabId = 'description' | 'specification' | 'review';

type ReviewItem = {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
};

const INITIAL_REVIEWS: ReviewItem[] = [];

export function ProductDetailView({ productId }: { productId: string }) {
  const product = getProduct(productId) || products[0];
  const { add } = useCart();
  const { openQuickOrder } = useQuickOrder();
  const { navigateTo } = useStoreNav();
  const tabsSectionRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initially nothing is selected for any product
  const [selectedPlanMap, setSelectedPlanMap] = useState<Record<string, string>>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectPromptError, setSelectPromptError] = useState(false);

  const [selectedImageMap, setSelectedImageMap] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<TabId>('description');
  const [addedNote, setAddedNote] = useState(false);

  const [reviews, setReviews] = useState<ReviewItem[]>(INITIAL_REVIEWS);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const currentPlanId = selectedPlanMap[product.id] ?? '';
  const selectedPlan = product.plans.find((p) => p.id === currentPlanId) ?? null;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const galleryImages = Array.from(
    new Set([product.image, ...(product.gallery || [])]),
  );

  const activeImage = selectedImageMap[product.id] || product.image;

  const handleSelectPlan = (id: string) => {
    setSelectedPlanMap((prev) => ({ ...prev, [product.id]: id }));
    setDropdownOpen(false);
    setSelectPromptError(false);
  };

  const handleClearPlan = () => {
    setSelectedPlanMap((prev) => ({ ...prev, [product.id]: '' }));
    setSelectPromptError(false);
  };

  const handleSelectImage = (img: string) => {
    setSelectedImageMap((prev) => ({ ...prev, [product.id]: img }));
  };

  const handleJumpToReviews = () => {
    setActiveTab('review');
    tabsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleAddToCart = () => {
    if (!selectedPlan) {
      setSelectPromptError(true);
      setDropdownOpen(true);
      return;
    }
    add(product, selectedPlan, qty);
    setAddedNote(true);
    setTimeout(() => setAddedNote(false), 2000);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim() || !reviewText.trim()) return;
    setReviews((prev) => [
      {
        id: `r-${prev.length + 1}`,
        author: reviewerName.trim(),
        rating: reviewRating,
        date: 'Just now',
        comment: reviewText.trim(),
      },
      ...prev,
    ]);
    setReviewerName('');
    setReviewText('');
  };

  const related = products
    .filter((p) => p.id !== product.id && p.code === product.code)
    .slice(0, 4);

  const recommendations =
    related.length >= 4
      ? related
      : [
          ...related,
          ...products.filter(
            (p) => p.id !== product.id && !related.some((r) => r.id === p.id),
          ),
        ].slice(0, 4);

  const isLoginOnly = selectedPlan?.warrantyType === 'login-only';
  const warrantyBadgeText = selectedPlan?.warrantyBadge || '25D Warranty';
  const warrantyHeadline =
    selectedPlan?.warrantyHeadline ||
    (isLoginOnly
      ? 'No Warranty — Login Warranty Only'
      : '25 Days Replacement Warranty');
  const planDetails = selectedPlan?.details || [
    'Ready-made account with login credentials provided.',
    'Log in using the provided email & password.',
    'Change the password after your first login.',
  ];

  return (
    <div className="max-w-[980px] mx-auto px-3.5 sm:px-6 py-4 sm:py-5 space-y-5 sm:space-y-6">
      {/* Compact Breadcrumb */}
      <nav
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 overflow-x-auto whitespace-nowrap"
        aria-label="Breadcrumb"
      >
        <button
          type="button"
          onClick={() => navigateTo('home', { code: 'ALL' })}
          className="hover:text-[#0F172A] transition-colors cursor-pointer border-0 bg-transparent p-0 shrink-0"
        >
          Home
        </button>
        <ChevronRight size={13} className="text-slate-400 shrink-0" />
        <button
          type="button"
          onClick={() => navigateTo('shop', { code: product.code })}
          className="hover:text-[#0F172A] transition-colors cursor-pointer border-0 bg-transparent p-0 shrink-0"
        >
          {product.platform}
        </button>
        <ChevronRight size={13} className="text-slate-400 shrink-0" />
        <span className="text-[#0F172A] font-bold truncate">{product.name}</span>
      </nav>

      {/* Main Product Section */}
      <div className="bg-white rounded-lg border border-slate-200/90 p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[290px_1fr] gap-5 sm:gap-6 items-start">
          {/* Left: Product Image with Crisp Framed Border */}
          <div className="w-full max-w-[260px] sm:max-w-[290px] mx-auto md:mx-0 space-y-2.5">
            <div className="p-2 rounded-lg bg-slate-50/80 border-2 border-slate-200/90 shadow-2xs">
              <div className="relative aspect-square rounded-md overflow-hidden bg-white border border-slate-200/90">
                {(product.sale || product.badge) && (
                  <span className="absolute top-2.5 left-2.5 z-10 bg-[#FF5E5B] text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded shadow-xs">
                    {product.sale ? 'Sale' : product.badge}
                  </span>
                )}
                <img
                  src={activeImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {galleryImages.length > 1 && (
              <div className="flex items-center justify-center md:justify-start gap-2">
                {galleryImages.map((imgUrl, idx) => {
                  const isCurrent = activeImage === imgUrl;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectImage(imgUrl)}
                      className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-all cursor-pointer p-0.5 bg-white ${
                        isCurrent
                          ? 'border-[#FF5E5B] shadow-2xs'
                          : 'border-slate-200 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt=""
                        className="w-full h-full object-cover rounded-xs"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Clean Product Configuration */}
          <div className="space-y-4 min-w-0">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#FF5E5B]">
                <span>{product.platform}</span>
                <span className="text-slate-300">·</span>
                <span className="text-emerald-600">In stock</span>
              </div>

              <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight mt-0.5">
                {product.name}
              </h1>

              {/* Default 5 Star (0 Reviews) clickable to scroll to Reviews (No tagline text) */}
              <div className="mt-1.5">
                <button
                  type="button"
                  onClick={handleJumpToReviews}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#FF5E5B] transition-colors cursor-pointer bg-transparent border-0 p-0"
                >
                  <span className="inline-flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={13} fill="currentColor" />
                    ))}
                  </span>
                  <span className="underline underline-offset-2 decoration-slate-300 hover:decoration-[#FF5E5B]">
                    ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                  </span>
                </button>
              </div>
            </div>

            {/* Select Option Dropdown (Full Text Priority + Highlighted Duration Tag + Red Clear Button) */}
            <div className="space-y-2 pt-2.5 border-t border-slate-100" ref={dropdownRef}>
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-extrabold text-[#0F172A]">
                  Select option
                </label>
                {selectedPlan && (
                  <button
                    type="button"
                    onClick={handleClearPlan}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FFF1F0] text-[#FF5E5B] hover:bg-[#FF5E5B] hover:text-white text-xs font-extrabold transition-colors cursor-pointer border border-[#FF5E5B]/25"
                  >
                    <X size={12} strokeWidth={2.6} />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((o) => !o)}
                  className={`w-full min-h-[42px] px-3.5 py-2 rounded-md border-[1.5px] bg-white flex items-center justify-between gap-2.5 text-left transition-all cursor-pointer ${
                    dropdownOpen
                      ? 'border-[#FF5E5B] ring-2 ring-[#FF5E5B]/15'
                      : selectPromptError
                        ? 'border-[#FF5E5B] bg-[#FFF1F0]/35 ring-2 ring-[#FF5E5B]/15'
                        : 'border-[#FF5E5B]/80 hover:border-[#FF5E5B]'
                  }`}
                >
                  {selectedPlan ? (
                    <div className="flex flex-wrap items-center gap-2 min-w-0 pr-1">
                      <span className="text-xs sm:text-[13px] font-extrabold text-[#0F172A] leading-snug break-words">
                        {selectedPlan.label}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#FFF1F0] text-[#FF5E5B] border border-[#FF5E5B]/25 text-[11px] font-extrabold tracking-tight shrink-0">
                        {selectedPlan.duration}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500">
                      Choose an option...
                    </span>
                  )}

                  <ChevronDown
                    size={16}
                    className={`text-[#FF5E5B] shrink-0 transition-transform duration-150 ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {selectPromptError && !selectedPlan && (
                  <p className="text-[11px] font-bold text-[#FF5E5B] m-0 mt-1">
                    Please select an option first.
                  </p>
                )}

                {dropdownOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 bg-white rounded-md border border-slate-200 shadow-xl shadow-slate-900/10 py-1 overflow-hidden divide-y divide-slate-100">
                    {product.plans.map((p) => {
                      const isSelected = p.id === selectedPlan?.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectPlan(p.id)}
                          className={`w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer border-0 ${
                            isSelected
                              ? 'bg-[#0F172A] text-white'
                              : 'bg-white hover:bg-slate-50 text-[#0F172A]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span
                              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                                isSelected
                                  ? 'border-[#FF5E5B] bg-[#FF5E5B] text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check size={10} strokeWidth={3} />}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                              <span className="text-xs sm:text-[13px] font-bold leading-snug break-words">
                                {p.label}
                              </span>
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-tight shrink-0 ${
                                  isSelected
                                    ? 'bg-[#FF5E5B] text-white'
                                    : 'bg-[#FFF1F0] text-[#FF5E5B] border border-[#FF5E5B]/20'
                                }`}
                              >
                                {p.duration}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`font-mono text-xs font-extrabold tabular-nums shrink-0 ${
                              isSelected ? 'text-white' : 'text-slate-500'
                            }`}
                          >
                            {formatPrice(p.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Option Details: 1) Price + Duration (1 Month / 2 Months), 2) Low-Radius Warranty & Instructions Card */}
            {selectedPlan && (
              <div className="space-y-3 pt-0.5">
                {/* 1. Price Display Immediately After Select Option */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-md bg-slate-50 border border-slate-200/80">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-2xl sm:text-[26px] font-extrabold text-[#0F172A] tabular-nums leading-none">
                      {formatPrice(selectedPlan.price)}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-extrabold text-[#0F172A]">
                      {selectedPlan.duration}
                    </span>
                  </div>

                  <WarrantyBadge
                    label={warrantyBadgeText}
                    isLoginOnly={isLoginOnly}
                    solid
                  />
                </div>

                {/* 2. Clean, Low-Radius Warranty & Instructions Card */}
                <PlanWarrantyCard
                  headline={warrantyHeadline}
                  details={planDetails}
                  isLoginOnly={isLoginOnly}
                />
              </div>
            )}

            {/* Mobile-Responsive Quantity + Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1">
              <div className="inline-flex items-center border border-slate-200 rounded-md bg-slate-50 p-0.5 h-10 shrink-0">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-8 h-full rounded bg-white text-[#0F172A] flex items-center justify-center hover:bg-slate-100 cursor-pointer border-0"
                  aria-label="Decrease quantity"
                >
                  <Minus size={13} strokeWidth={2.4} />
                </button>
                <span className="w-8 text-center font-mono font-extrabold text-xs text-[#0F172A] tabular-nums">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(20, q + 1))}
                  className="w-8 h-full rounded bg-white text-[#0F172A] flex items-center justify-center hover:bg-slate-100 cursor-pointer border-0"
                  aria-label="Increase quantity"
                >
                  <Plus size={13} strokeWidth={2.4} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 sm:flex-initial h-10 px-4 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-extrabold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-0"
              >
                <ShoppingCart size={14} strokeWidth={2.3} />
                <span>{addedNote ? 'Added ✓' : 'Add to cart'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  openQuickOrder(product, {
                    planId: selectedPlan?.id ?? '',
                    qty,
                  })
                }
                className="w-full sm:w-auto h-10 px-4 rounded-md bg-[#FF5E5B] hover:bg-[#e04845] text-white font-extrabold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-0"
              >
                <Zap size={14} strokeWidth={2.3} />
                <span>Quick order</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Centered Details Tabs */}
      <div
        ref={tabsSectionRef}
        className="bg-white rounded-lg border border-slate-200/90 p-4 sm:p-6 scroll-mt-24"
      >
        <div className="flex items-center justify-center gap-5 sm:gap-8 border-b border-slate-200/80">
          {(
            [
              { id: 'description', label: 'Description' },
              { id: 'specification', label: 'Specification' },
              { id: 'review', label: `Reviews (${reviews.length})` },
            ] as const
          ).map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`pb-2.5 text-xs sm:text-sm font-extrabold transition-colors cursor-pointer border-0 bg-transparent border-b-2 whitespace-nowrap ${
                  active
                    ? 'border-[#FF5E5B] text-[#FF5E5B]'
                    : 'border-transparent text-slate-500 hover:text-[#0F172A]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="pt-5 text-xs text-slate-600 leading-relaxed">
          {activeTab === 'description' && (
            <div className="max-w-2xl mx-auto text-center space-y-2.5">
              <p className="m-0">{product.description}</p>
              <p className="m-0 text-slate-500">
                অর্ডার সম্পন্ন করার সাথে সাথে আপনার অ্যাকাউন্ট ভল্ট এবং ইমেইলে অ্যাক্সেস ডিটেইলস পৌঁছে যাবে।
              </p>
            </div>
          )}

          {activeTab === 'specification' && (
            <div className="max-w-md mx-auto divide-y divide-slate-100">
              <div className="py-2 flex justify-between gap-4">
                <span className="text-slate-500 shrink-0">Platform</span>
                <span className="font-bold text-[#0F172A] text-right">{product.platform}</span>
              </div>
              <div className="py-2 flex justify-between gap-4">
                <span className="text-slate-500 shrink-0">Selected option</span>
                <span className="font-bold text-[#0F172A] text-right">
                  {selectedPlan
                    ? `${selectedPlan.label} (${selectedPlan.duration})`
                    : 'Not selected yet'}
                </span>
              </div>
              <div className="py-2 flex justify-between gap-4">
                <span className="text-slate-500 shrink-0">Warranty</span>
                <span className="font-bold text-[#0F172A] text-right">
                  {selectedPlan ? warrantyBadgeText : 'Select an option'}
                </span>
              </div>
              <div className="py-2 flex justify-between gap-4">
                <span className="text-slate-500 shrink-0">Delivery</span>
                <span className="font-bold text-[#0F172A] text-right">Email</span>
              </div>
              <div className="py-2 flex justify-between gap-4">
                <span className="text-slate-500 shrink-0">Payment</span>
                <span className="font-bold text-[#0F172A] text-right">bKash, Nagad</span>
              </div>
            </div>
          )}

          {activeTab === 'review' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start max-w-3xl mx-auto">
              <div className="divide-y divide-slate-100">
                {reviews.length === 0 ? (
                  <div className="py-6 text-center bg-slate-50/70 rounded-md border border-dashed border-slate-200">
                    <div className="inline-flex items-center gap-0.5 text-amber-400 mb-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={14} fill="currentColor" />
                      ))}
                    </div>
                    <p className="m-0 text-xs font-bold text-[#0F172A]">
                      No reviews yet (0 reviews)
                    </p>
                    <p className="m-0 text-[11px] text-slate-400 mt-0.5">
                      Be the first to share your experience with {product.name}.
                    </p>
                  </div>
                ) : (
                  reviews.map((rev) => (
                    <div key={rev.id} className="py-2.5 first:pt-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#0F172A]">{rev.author}</span>
                        <span className="text-[11px] text-slate-400">{rev.date}</span>
                      </div>
                      <div className="flex text-amber-400 mb-1">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} size={11} fill="currentColor" />
                        ))}
                      </div>
                      <p className="m-0 text-slate-600">{rev.comment}</p>
                    </div>
                  ))
                )}
              </div>

              <form
                onSubmit={handleReviewSubmit}
                className="space-y-2.5 bg-slate-50 p-3.5 rounded-md border border-slate-200/70"
              >
                <div className="font-bold text-[#0F172A]">Write a review</div>
                <input
                  type="text"
                  required
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="Your name"
                  className="w-full h-8 px-2.5 rounded bg-white border border-slate-200 text-xs text-[#0F172A] focus:outline-none focus:border-[#FF5E5B]"
                />
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={`p-1 rounded border-0 bg-transparent cursor-pointer ${
                        star <= reviewRating ? 'text-amber-400' : 'text-slate-300'
                      }`}
                    >
                      <Star size={14} fill="currentColor" />
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  required
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Your comment..."
                  className="w-full p-2.5 rounded bg-white border border-slate-200 text-xs text-[#0F172A] focus:outline-none focus:border-[#FF5E5B]"
                />
                <button
                  type="submit"
                  className="h-8 px-3.5 rounded bg-[#FF5E5B] hover:bg-[#e04845] text-white font-bold text-xs cursor-pointer border-0"
                >
                  Post review
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Related Products Section */}
      <section className="space-y-3 pt-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base sm:text-lg font-extrabold text-[#0F172A] m-0">
            Related products
          </h2>

          <button
            type="button"
            onClick={() => navigateTo('shop', { code: 'ALL' })}
            className="text-xs font-extrabold text-slate-600 hover:text-[#FF5E5B] inline-flex items-center gap-1 transition-colors cursor-pointer border-0 bg-transparent p-0 shrink-0"
          >
            <span>View all</span>
            <ChevronRight size={14} strokeWidth={2.4} />
          </button>
        </div>

        <div className="product-grid">
          {recommendations.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
