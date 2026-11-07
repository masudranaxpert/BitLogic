'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { Card, StatusIndicator, SwitchToggle } from '@/components/admin/ui/primitives';
import type { DigitalProduct } from '@/lib/admin-data';
import { DEFAULT_STORE_SETTINGS } from '@/lib/store-settings';
import {
  BANNER_SPECS,
  CATEGORY_LINKS,
  bannerLinkProblem,
  judgeBannerImage,
  type BannerLinkType,
  type BannerSlot,
  type HomeBannerItem,
} from '@/lib/home-banners-shared';

type Identity = { siteTitle: string; siteDescription: string };

const field =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 focus:outline-none focus:border-emerald-600';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const SLOT_NAMES: Record<BannerSlot, string[]> = {
  main: ['Slide 1', 'Slide 2', 'Slide 3', 'Slide 4', 'Slide 5'],
  side: ['Top banner', 'Bottom banner'],
};

async function uploadImage(file: File): Promise<{ url: string; width: number; height: number }> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    throw new Error('Use a PNG, JPG or WEBP image.');
  }
  if (file.size > MAX_FILE_BYTES) throw new Error('That file is over 8 MB.');
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/admin/banners/upload', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed.');
  return data;
}

function BannerCard({
  item,
  index,
  total,
  products,
  busy,
  onChange,
  onMove,
  onRemove,
  onReplace,
}: {
  item: HomeBannerItem;
  index: number;
  total: number;
  products: DigitalProduct[];
  busy: boolean;
  onChange: (patch: Partial<HomeBannerItem>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onReplace: (file: File) => void;
}) {
  const spec = BANNER_SPECS[item.slot];
  const fit = judgeBannerImage(item.slot, item.width, item.height);
  const problem = bannerLinkProblem(item.linkType, item.linkValue);
  const fileRef = useRef<HTMLInputElement>(null);
  const name = SLOT_NAMES[item.slot][index] || `Banner ${index + 1}`;

  return (
    <li className={`rounded-lg border border-slate-200 p-4 dark:border-slate-800 ${item.isActive ? '' : 'bg-slate-50/70 dark:bg-slate-900/40'}`}>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="w-full shrink-0 sm:w-64">
          <div
            className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
            style={{ aspectRatio: `${spec.width} / ${spec.height}` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt={item.alt || name}
              className={`h-full w-full object-cover ${item.isActive ? '' : 'opacity-50 grayscale'}`}
            />
            {busy ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-950/70">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" aria-hidden />
              </div>
            ) : null}
            {item.width ? (
              <span className="absolute bottom-1.5 left-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
                {item.width}×{item.height}
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-medium hover:border-emerald-600 disabled:opacity-50 dark:border-slate-700 cursor-pointer"
            >
              <ImagePlus className="h-3.5 w-3.5" aria-hidden /> Replace image
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onReplace(f);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="m-0 text-sm font-semibold text-slate-900 dark:text-slate-100">{name}</h3>
              {!item.isActive ? <StatusIndicator tone="zinc" label="Hidden" /> : null}
            </div>
            <div className="flex items-center gap-1">
              <SwitchToggle checked={item.isActive} onChange={(v) => onChange({ isActive: v })} label="Show" />
              {total > 1 ? (
                <>
                  <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move ${name} up`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800 cursor-pointer">
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  </button>
                  <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} aria-label={`Move ${name} down`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800 cursor-pointer">
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  </button>
                </>
              ) : null}
              <button type="button" onClick={onRemove} aria-label={`Remove ${name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 cursor-pointer">
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          {fit.level !== 'unknown' && fit.level !== 'good' ? (
            <p className="m-0 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">{fit.message}</p>
          ) : fit.level === 'good' ? (
            <p className="m-0 text-xs text-emerald-700 dark:text-emerald-400">Good size for this slot.</p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)]">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">When clicked</span>
              <select
                value={item.linkType}
                onChange={(e) => onChange({ linkType: e.target.value as BannerLinkType, linkValue: '' })}
                className={`${field} h-10`}
              >
                <option value="none">Nothing (not a link)</option>
                <option value="product">Open a product</option>
                <option value="category">Open a category</option>
                <option value="url">Open a link</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {item.linkType === 'product' ? 'Product' : item.linkType === 'category' ? 'Category' : item.linkType === 'url' ? 'Link' : 'Target'}
              </span>
              {item.linkType === 'product' ? (
                <select value={item.linkValue} onChange={(e) => onChange({ linkValue: e.target.value })} className={`${field} h-10`}>
                  <option value="">Choose a product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.status === 'draft' ? ' (not available)' : ''}
                    </option>
                  ))}
                </select>
              ) : item.linkType === 'category' ? (
                <select value={item.linkValue} onChange={(e) => onChange({ linkValue: e.target.value })} className={`${field} h-10`}>
                  <option value="">Choose a category…</option>
                  {CATEGORY_LINKS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              ) : item.linkType === 'url' ? (
                <input
                  value={item.linkValue}
                  onChange={(e) => onChange({ linkValue: e.target.value })}
                  placeholder="https://… or /shop"
                  className={`${field} h-10`}
                />
              ) : (
                <input disabled value="" placeholder="The image is shown but does nothing when clicked" className={`${field} h-10 opacity-60`} />
              )}
            </label>
          </div>
          {problem ? <p role="alert" className="m-0 text-xs font-medium text-rose-600">{problem}</p> : null}

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Image description <span className="font-normal text-slate-400">(optional, for screen readers and search)</span>
            </span>
            <input value={item.alt} onChange={(e) => onChange({ alt: e.target.value.slice(0, 140) })} placeholder="e.g. ChatGPT Plus, 30% off this week" className={`${field} h-10`} />
          </label>
        </div>
      </div>
    </li>
  );
}

export default function StorefrontView({ products }: { products: DigitalProduct[] }) {
  const [savedId, setSavedId] = useState<Identity | null>(null);
  const [draftId, setDraftId] = useState<Identity | null>(null);
  const [savedBanners, setSavedBanners] = useState<HomeBannerItem[] | null>(null);
  const [banners, setBanners] = useState<HomeBannerItem[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const addRef = useRef<{ slot: BannerSlot } | null>(null);
  const addInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/admin/banners', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([s, b]) => {
        if (!s?.settings || !b?.banners) return setLoadError(true);
        const id = {
          siteTitle: s.settings.siteTitle ?? DEFAULT_STORE_SETTINGS.siteTitle,
          siteDescription: s.settings.siteDescription ?? DEFAULT_STORE_SETTINGS.siteDescription,
        };
        setSavedId(id);
        setDraftId(id);
        setSavedBanners(b.banners);
        setBanners(b.banners);
      })
      .catch(() => setLoadError(true));
  }, []);

  const idDirty = Boolean(savedId && draftId && JSON.stringify(savedId) !== JSON.stringify(draftId));
  const bannersDirty = Boolean(savedBanners && JSON.stringify(savedBanners) !== JSON.stringify(banners));
  const dirty = idDirty || bannersDirty;

  const bySlot = useMemo(
    () => ({ main: banners.filter((b) => b.slot === 'main'), side: banners.filter((b) => b.slot === 'side') }),
    [banners],
  );

  const patch = (id: string, p: Partial<HomeBannerItem>) => {
    setBanners((list) => list.map((b) => (b.id === id ? { ...b, ...p } : b)));
    setMessage(null);
  };
  const remove = (id: string) => {
    setBanners((list) => list.filter((b) => b.id !== id));
    setMessage(null);
  };
  const move = (slot: BannerSlot, id: string, dir: -1 | 1) => {
    setBanners((list) => {
      const mine = list.filter((b) => b.slot === slot);
      const i = mine.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= mine.length) return list;
      [mine[i], mine[j]] = [mine[j], mine[i]];
      let k = 0;
      return list.map((b) => (b.slot === slot ? mine[k++] : b));
    });
    setMessage(null);
  };

  const upload = async (file: File, onDone: (r: { url: string; width: number; height: number }) => void, key: string) => {
    setUploading(key);
    setMessage(null);
    try {
      onDone(await uploadImage(file));
    } catch (e) {
      setMessage({ tone: 'error', text: e instanceof Error ? e.message : 'Upload failed.' });
    } finally {
      setUploading(null);
    }
  };

  const addBanner = (slot: BannerSlot, file: File) =>
    upload(
      file,
      (r) =>
        setBanners((list) => [
          ...list,
          { id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, slot, imageUrl: r.url, width: r.width, height: r.height, alt: '', linkType: 'none', linkValue: '', isActive: true },
        ]),
      `add-${slot}`,
    );

  const save = async () => {
    const bad = banners.find((b) => bannerLinkProblem(b.linkType, b.linkValue));
    if (bad) {
      const list = bySlot[bad.slot];
      setMessage({ tone: 'error', text: `${SLOT_NAMES[bad.slot][list.indexOf(bad)] || 'A banner'}: ${bannerLinkProblem(bad.linkType, bad.linkValue)}` });
      return;
    }
    if (draftId && !draftId.siteTitle.trim()) {
      setMessage({ tone: 'error', text: 'Site title cannot be empty.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (idDirty && draftId) {
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteTitle: draftId.siteTitle.trim(), siteDescription: draftId.siteDescription.trim() }),
        });
        if (!res.ok) throw new Error('Could not save the site title.');
        setSavedId({ siteTitle: draftId.siteTitle.trim(), siteDescription: draftId.siteDescription.trim() });
        setDraftId({ siteTitle: draftId.siteTitle.trim(), siteDescription: draftId.siteDescription.trim() });
      }
      if (bannersDirty) {
        const res = await fetch('/api/admin/banners', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ banners }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not save the banners.');
        setSavedBanners(data.banners);
        setBanners(data.banners);
      }
      setMessage({ tone: 'ok', text: 'Saved. The store shows the new content right away.' });
    } catch (e) {
      setMessage({ tone: 'error', text: e instanceof Error ? e.message : 'Could not save.' });
    } finally {
      setBusy(false);
    }
  };

  const discard = () => {
    setDraftId(savedId);
    setBanners(savedBanners ?? []);
    setMessage(null);
  };

  const origin = typeof window !== 'undefined' ? window.location.host : 'yourstore.com';
  const firstMain = bySlot.main.find((b) => b.isActive);
  const sides = bySlot.side.filter((b) => b.isActive);

  const section = (slot: BannerSlot, title: string, help: string) => {
    const spec = BANNER_SPECS[slot];
    const list = bySlot[slot];
    return (
      <Card className="overflow-hidden">
        <div className="space-y-2 border-b border-slate-200/80 px-5 py-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold">{title}</h2>
            <span className="text-sm tabular-nums text-slate-500">
              {list.length} of {spec.max}
            </span>
          </div>
          <p className="m-0 text-sm text-slate-500">{help}</p>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="rounded bg-emerald-50 px-2 py-1 font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              Best size {spec.width} × {spec.height} px
            </span>
            <span className="rounded bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Shape {spec.ratioLabel}</span>
            <span className="rounded bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Minimum {spec.minWidth} px wide</span>
            <span className="rounded bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">PNG, JPG or WEBP · up to 8 MB</span>
          </div>
        </div>
        <div className="space-y-3 p-5">
          {list.length > 0 ? (
            <ul className="m-0 list-none space-y-3 p-0">
              {list.map((b, i) => (
                <BannerCard
                  key={b.id}
                  item={b}
                  index={i}
                  total={list.length}
                  products={products}
                  busy={uploading === b.id}
                  onChange={(p) => patch(b.id, p)}
                  onMove={(d) => move(slot, b.id, d)}
                  onRemove={() => remove(b.id)}
                  onReplace={(file) =>
                    upload(file, (r) => patch(b.id, { imageUrl: r.url, width: r.width, height: r.height }), b.id)
                  }
                />
              ))}
            </ul>
          ) : (
            <p className="m-0 text-sm text-slate-500">
              {slot === 'side' && bySlot.main.length > 0
                ? 'None added: the main slider will use the full width of the page (a little more of its top and bottom gets cropped).'
                : 'Nothing added yet.'}
            </p>
          )}
          {list.length < spec.max ? (
            <button
              type="button"
              disabled={uploading === `add-${slot}`}
              onClick={() => {
                addRef.current = { slot };
                addInput.current?.click();
              }}
              className="flex h-20 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 text-sm font-medium text-slate-600 hover:border-emerald-600 hover:text-emerald-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
            >
              {uploading === `add-${slot}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
              {uploading === `add-${slot}` ? 'Uploading…' : slot === 'main' ? 'Add a slide' : 'Add a side banner'}
            </button>
          ) : null}
        </div>
      </Card>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-24">
      <header>
        <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-50">Storefront</h1>
        <p className="mt-1 text-sm text-slate-500">Your site title and description, and the images at the top of the homepage.</p>
      </header>

      <input
        ref={addInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          const target = addRef.current;
          if (f && target) void addBanner(target.slot, f);
          e.target.value = '';
        }}
      />

      {!draftId ? (
        <Card className="p-5 text-sm text-slate-500">{loadError ? 'Could not load the storefront settings.' : 'Loading…'}</Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200/80 px-5 py-3.5 dark:border-slate-800">
              <h2 className="font-display text-base font-semibold">Website</h2>
              <p className="mt-0.5 text-sm text-slate-500">Shown in browser tabs and in search results.</p>
            </div>
            <div className="grid gap-4 px-5 py-4">
              <label className="space-y-1.5">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Site title</span>
                  <span className="text-xs tabular-nums text-slate-400">{draftId.siteTitle.length}/80</span>
                </span>
                <input
                  value={draftId.siteTitle}
                  onChange={(e) => setDraftId({ ...draftId, siteTitle: e.target.value.slice(0, 80) })}
                  placeholder="BitLogic | Digital Subscriptions"
                  className={`${field} h-10 font-medium`}
                />
              </label>
              <label className="space-y-1.5">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Description</span>
                  <span className="text-xs tabular-nums text-slate-400">{draftId.siteDescription.length}/320</span>
                </span>
                <textarea
                  rows={3}
                  value={draftId.siteDescription}
                  onChange={(e) => setDraftId({ ...draftId, siteDescription: e.target.value.slice(0, 320) })}
                  placeholder="What the store sells, in one or two sentences."
                  className={field}
                />
              </label>
              <div className="rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-900/60">
                <p className="m-0 text-[11px] font-medium uppercase tracking-wide text-slate-400">How it can look in Google</p>
                <p className="m-0 mt-1 truncate text-[13px] text-slate-500">{origin}</p>
                <p className="m-0 truncate text-lg text-[#1a0dab] dark:text-sky-400">{draftId.siteTitle.trim() || DEFAULT_STORE_SETTINGS.siteTitle}</p>
                <p className="m-0 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{draftId.siteDescription.trim() || DEFAULT_STORE_SETTINGS.siteDescription}</p>
              </div>
            </div>
          </Card>

          {section('main', 'Main slider', 'The big banner at the top of the homepage. It slides automatically through every visible image.')}
          {section('side', 'Side banners', 'Two smaller banners next to the slider. They show on tablets and computers, not on phones.')}

          <Card className="overflow-hidden">
            <div className="border-b border-slate-200/80 px-5 py-3.5 dark:border-slate-800">
              <h2 className="font-display text-base font-semibold">Preview</h2>
              <p className="mt-0.5 text-sm text-slate-500">Roughly how the top of the homepage looks on a computer.</p>
            </div>
            <div className="p-5">
              {banners.length === 0 ? (
                <p className="m-0 text-sm text-slate-500">
                  No banners yet. The homepage shows its default offers until you add one.
                </p>
              ) : (
                <div className="grid gap-2" style={{ gridTemplateColumns: sides.length ? '6fr 4fr' : '1fr', aspectRatio: sides.length ? '1180 / 420' : '1180 / 420' }}>
                  <div className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
                    {firstMain ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={firstMain.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-400">No visible slide</div>
                    )}
                    {bySlot.main.filter((b) => b.isActive).length > 1 ? (
                      <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
                        {bySlot.main.filter((b) => b.isActive).map((b, i) => (
                          <span key={b.id} className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/50'}`} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {sides.length ? (
                    <div className="grid gap-2" style={{ gridTemplateRows: `repeat(${sides.length}, 1fr)` }}>
                      {sides.map((b) => (
                        <div key={b.id} className="overflow-hidden rounded-md border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={b.imageUrl} alt="" className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {draftId && (dirty || message) ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:left-60">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
            <p className={`m-0 text-sm font-medium ${message?.tone === 'error' ? 'text-rose-600' : message?.tone === 'ok' ? 'text-emerald-700' : 'text-slate-600 dark:text-slate-300'}`} role={message?.tone === 'error' ? 'alert' : 'status'}>
              {message ? message.text : 'You have unsaved changes.'}
            </p>
            {dirty ? (
              <div className="flex gap-2">
                <button type="button" onClick={discard} disabled={busy} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:border-slate-400 disabled:opacity-50 dark:border-slate-700 cursor-pointer">
                  Discard
                </button>
                <button type="button" onClick={() => void save()} disabled={busy || uploading !== null} className="h-10 rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">
                  {busy ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
