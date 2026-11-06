import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  applyWorkspacePatch,
  loadAdminWorkspace,
  type WorkspacePatch,
} from '@/lib/admin/workspace-repo';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const workspace = await loadAdminWorkspace();
    return NextResponse.json(workspace);
  } catch (err) {
    console.error('[admin/workspace GET]', err);
    return NextResponse.json(
      { error: 'Failed to load admin workspace' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = (await request.json()) as WorkspacePatch;
    await applyWorkspacePatch(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/workspace PUT]', err);
    return NextResponse.json(
      { error: 'Failed to save admin workspace' },
      { status: 500 },
    );
  }
}
