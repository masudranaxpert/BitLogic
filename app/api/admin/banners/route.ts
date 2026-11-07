import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-admin';
import { BannerError, listHomeBanners, saveHomeBanners } from '@/lib/home-banners';

export async function GET() {
  const { error } = await requirePermission('settings');
  if (error) return error;
  return NextResponse.json({ banners: await listHomeBanners() });
}

export async function PUT(request: Request) {
  const { error } = await requirePermission('settings');
  if (error) return error;
  const body = (await request.json().catch(() => null)) as { banners?: unknown } | null;
  try {
    const banners = await saveHomeBanners(body?.banners);
    return NextResponse.json({ ok: true, banners });
  } catch (e) {
    if (e instanceof BannerError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: 'Could not save banners.' }, { status: 500 });
  }
}
