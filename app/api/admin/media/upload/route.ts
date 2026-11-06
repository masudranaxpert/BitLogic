import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { saveImageBufferAsWebp } from '@/lib/media/save-webp';

export const runtime = 'nodejs';

const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const contentType = request.headers.get('content-type') || '';
    let buffer: Buffer;
    let preferredName = 'asset';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
      }
      if (!ALLOWED.has(file.type) && !file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Only image files are allowed.' },
          { status: 400 },
        );
      }
      if (file.type === 'image/svg+xml') {
        return NextResponse.json(
          { error: 'SVG is not supported — use PNG, JPG, or WEBP.' },
          { status: 400 },
        );
      }
      preferredName = file.name || preferredName;
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      const body = (await request.json()) as { url?: string; name?: string };
      const remoteUrl = body.url?.trim();
      if (!remoteUrl || !/^https?:\/\//i.test(remoteUrl)) {
        return NextResponse.json(
          { error: 'Valid image URL required.' },
          { status: 400 },
        );
      }
      const res = await fetch(remoteUrl, {
        headers: { Accept: 'image/*,*/*' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: 'Could not download that image URL.' },
          { status: 400 },
        );
      }
      const remoteType = res.headers.get('content-type') || '';
      if (remoteType.includes('svg')) {
        return NextResponse.json(
          { error: 'SVG is not supported — use PNG, JPG, or WEBP.' },
          { status: 400 },
        );
      }
      preferredName = body.name?.trim() || pathNameFromUrl(remoteUrl) || preferredName;
      buffer = Buffer.from(await res.arrayBuffer());
    }

    const saved = await saveImageBufferAsWebp(buffer, preferredName);
    return NextResponse.json(saved);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Upload failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function pathNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const base = u.pathname.split('/').pop() || '';
    return decodeURIComponent(base) || 'remote';
  } catch {
    return 'remote';
  }
}
