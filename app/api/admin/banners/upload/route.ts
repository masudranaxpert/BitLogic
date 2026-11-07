import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-admin';
import { saveImageBufferAsWebp } from '@/lib/media/save-webp';

export const runtime = 'nodejs';

/** Upload one banner image (converted to WebP). Needs the Settings permission, not Media. */
export async function POST(request: Request) {
  const { error } = await requirePermission('settings');
  if (error) return error;
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      return NextResponse.json({ error: 'Use a PNG, JPG or WEBP image.' }, { status: 400 });
    }
    const saved = await saveImageBufferAsWebp(Buffer.from(await file.arrayBuffer()), file.name || 'banner');
    return NextResponse.json({ url: saved.url, width: saved.width, height: saved.height, sizeKB: saved.sizeKB });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload failed.' }, { status: 400 });
  }
}
