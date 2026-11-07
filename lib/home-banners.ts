import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { deleteLocalUpload, isLocalUploadUrl } from '@/lib/media/save-webp';
import {
  CATEGORY_LINKS,
  MAIN_MAX,
  SIDE_MAX,
  bannerLinkProblem,
  type BannerLinkType,
  type BannerSlot,
  type HomeBannerItem,
} from '@/lib/home-banners-shared';

function toItem(r: {
  id: string;
  slot: string;
  imageUrl: string;
  width: number;
  height: number;
  alt: string;
  linkType: string;
  linkValue: string;
  isActive: boolean;
}): HomeBannerItem {
  return {
    id: r.id,
    slot: r.slot === 'side' ? 'side' : 'main',
    imageUrl: r.imageUrl,
    width: r.width,
    height: r.height,
    alt: r.alt,
    linkType: (['product', 'category', 'url'].includes(r.linkType) ? r.linkType : 'none') as BannerLinkType,
    linkValue: r.linkValue,
    isActive: r.isActive,
  };
}

/** Banners in display order. `onlyActive` is what the storefront shows. */
export async function listHomeBanners(opts: { onlyActive?: boolean } = {}): Promise<HomeBannerItem[]> {
  try {
    const rows = await db.homeBanner.findMany({
      where: opts.onlyActive ? { isActive: true } : undefined,
      orderBy: [{ slot: 'asc' }, { position: 'asc' }],
    });
    return rows.map(toItem);
  } catch {
    return [];
  }
}

export class BannerError extends Error {}

/** Replace all banners with the given list (the admin edits the whole set at once). */
export async function saveHomeBanners(input: unknown): Promise<HomeBannerItem[]> {
  if (!Array.isArray(input)) throw new BannerError('Invalid banner list.');
  const cleaned: HomeBannerItem[] = [];
  const count: Record<BannerSlot, number> = { main: 0, side: 0 };
  const slugs = new Set((await db.product.findMany({ select: { slug: true } })).map((p) => p.slug));

  for (const raw of input as Array<Partial<HomeBannerItem>>) {
    const slot: BannerSlot = raw.slot === 'side' ? 'side' : 'main';
    const imageUrl = String(raw.imageUrl ?? '').trim();
    if (!imageUrl) throw new BannerError('Every banner needs an image.');
    if (!(isLocalUploadUrl(imageUrl) || /^https?:\/\//i.test(imageUrl))) {
      throw new BannerError('Banner image must be an uploaded file or an https link.');
    }
    count[slot] += 1;
    if (count[slot] > (slot === 'main' ? MAIN_MAX : SIDE_MAX)) {
      throw new BannerError(slot === 'main' ? `At most ${MAIN_MAX} main slides.` : `At most ${SIDE_MAX} side banners.`);
    }
    const linkType = (['product', 'category', 'url'].includes(String(raw.linkType)) ? raw.linkType : 'none') as BannerLinkType;
    const linkValue = linkType === 'none' ? '' : String(raw.linkValue ?? '').trim().slice(0, 500);
    const problem = bannerLinkProblem(linkType, linkValue);
    if (problem) throw new BannerError(problem);
    if (linkType === 'product' && !slugs.has(linkValue)) throw new BannerError('That product no longer exists.');
    if (linkType === 'category' && !CATEGORY_LINKS.some((c) => c.code === linkValue)) {
      throw new BannerError('Unknown category.');
    }
    cleaned.push({
      id: typeof raw.id === 'string' && raw.id ? raw.id : randomUUID(),
      slot,
      imageUrl,
      width: Math.max(0, Math.round(Number(raw.width) || 0)),
      height: Math.max(0, Math.round(Number(raw.height) || 0)),
      alt: String(raw.alt ?? '').trim().slice(0, 140),
      linkType,
      linkValue,
      isActive: raw.isActive !== false,
    });
  }

  const before = await db.homeBanner.findMany({ select: { imageUrl: true } });
  const pos: Record<BannerSlot, number> = { main: 0, side: 0 };
  await db.$transaction([
    db.homeBanner.deleteMany(),
    ...cleaned.map((b) => db.homeBanner.create({ data: { ...b, position: pos[b.slot]++ } })),
  ]);

  // Remove uploaded files that no banner uses any more.
  const keep = new Set(cleaned.map((b) => b.imageUrl));
  for (const r of before) {
    if (!keep.has(r.imageUrl)) await deleteLocalUpload(r.imageUrl);
  }
  return listHomeBanners();
}
