import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-admin';
import { deleteLocalUpload, isLocalUploadUrl } from '@/lib/media/save-webp';
import { recordActivity, requestIp } from '@/lib/audit/record';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { session, error } = await requirePermission('media');
  if (error) return error;

  try {
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim();
    if (!url) {
      return NextResponse.json({ error: 'URL required.' }, { status: 400 });
    }
    if (!isLocalUploadUrl(url)) {
      return NextResponse.json({ ok: true, deleted: false });
    }
    const deleted = await deleteLocalUpload(url);
    if (deleted) {
      await recordActivity({
        userId: session.id,
        action: 'media.delete',
        entityType: 'media',
        summary: 'Deleted an uploaded image',
        ip: requestIp(request),
      });
    }
    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
