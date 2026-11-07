import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { MEDIA_UPLOAD_DIR } from '@/lib/media/save-webp';

export const runtime = 'nodejs';

const TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
};

/**
 * Serves files uploaded after the app was built. Next only serves `public/` files that existed at
 * build time, so in production new uploads (product covers, banners) would otherwise 404.
 * File names are timestamped and never change, hence the long cache.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const name = path.basename(file);
  const type = TYPES[path.extname(name).toLowerCase()];
  if (!type || name !== file || !/^[\w.-]+$/.test(name)) {
    return new Response('Not found', { status: 404 });
  }
  try {
    const data = await readFile(path.join(MEDIA_UPLOAD_DIR, name));
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
