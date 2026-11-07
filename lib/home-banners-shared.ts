/** Homepage hero banners: types and size guidance, safe to import from client components. */

export type BannerSlot = 'main' | 'side';
export type BannerLinkType = 'none' | 'product' | 'category' | 'url';

export type HomeBannerItem = {
  id: string;
  slot: BannerSlot;
  imageUrl: string;
  width: number;
  height: number;
  alt: string;
  linkType: BannerLinkType;
  /** product slug · category code · URL or /path */
  linkValue: string;
  isActive: boolean;
};

export const MAIN_MAX = 5;
export const SIDE_MAX = 2;

export const CATEGORY_LINKS: Array<{ code: 'AI' | 'STREAM' | 'WORK' | 'CREATE'; label: string }> = [
  { code: 'AI', label: 'AI tools' },
  { code: 'STREAM', label: 'Streaming' },
  { code: 'WORK', label: 'Work & security' },
  { code: 'CREATE', label: 'Creative & design' },
];

/**
 * Sizes are worked out from how the homepage lays the images out (1180 px wide store,
 * main 6 : side 4, 420 px tall on desktop) at 2x for sharp screens. Images are cropped
 * to fit with `object-fit: cover`, so the shape matters more than the exact pixels.
 */
export const BANNER_SPECS: Record<
  BannerSlot,
  { label: string; width: number; height: number; minWidth: number; ratioLabel: string; max: number }
> = {
  main: { label: 'Main slider', width: 1400, height: 825, minWidth: 1000, ratioLabel: '17:10', max: MAIN_MAX },
  side: { label: 'Side banners', width: 960, height: 400, minWidth: 640, ratioLabel: '12:5', max: SIDE_MAX },
};

/** How an uploaded image fits its slot. */
export function judgeBannerImage(slot: BannerSlot, width: number, height: number) {
  const spec = BANNER_SPECS[slot];
  if (!width || !height) return { level: 'unknown' as const, message: '' };
  const ratio = width / height;
  const want = spec.width / spec.height;
  const off = Math.abs(ratio - want) / want;
  if (width < spec.minWidth) {
    return {
      level: 'low' as const,
      message: `Only ${width} px wide: it will look soft on large screens. Use at least ${spec.minWidth} px (best ${spec.width}×${spec.height}).`,
    };
  }
  if (off > 0.15) {
    return {
      level: 'shape' as const,
      message: `Different shape from ${spec.ratioLabel}: the edges will be cropped to fit. Keep the important part in the middle.`,
    };
  }
  return { level: 'good' as const, message: 'Good size.' };
}

/** Empty string when the click target is fine, otherwise what is wrong. */
export function bannerLinkProblem(type: BannerLinkType, value: string): string {
  if (type === 'none') return '';
  const v = value.trim();
  if (!v) return type === 'product' ? 'Choose a product.' : type === 'category' ? 'Choose a category.' : 'Enter a link.';
  if (type === 'url' && !(/^https?:\/\/\S+$/i.test(v) || /^\/(?!\/)\S*$/.test(v))) {
    return 'Use a full link (https://…) or a path on this site (/shop).';
  }
  return '';
}
