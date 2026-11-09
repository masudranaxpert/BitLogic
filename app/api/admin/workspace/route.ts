import { NextResponse } from 'next/server';
import { requireConsoleAccess } from '@/lib/auth/require-admin';
import {
  applyWorkspacePatch,
  loadAdminWorkspace,
  type WorkspacePatch,
} from '@/lib/admin/workspace-repo';
import { runServerCredentialLifecycle } from '@/lib/admin/run-lifecycle-server';
import {
  canAccessPermission,
  permissionForWorkspacePatchKey,
} from '@/lib/auth/permissions';
import { ROLES } from '@/lib/auth/roles';
import { auditWorkspacePatch } from '@/lib/audit/workspace';
import { requestIp } from '@/lib/audit/record';

export async function GET() {
  const { session, error } = await requireConsoleAccess();
  if (error) return error;

  try {
    try {
      await runServerCredentialLifecycle();
    } catch (e) {
      console.error('[admin/workspace GET] lifecycle', e);
    }
    const workspace = await loadAdminWorkspace();
    // Staff only receives slices they can open — vault secrets never leak via overview-only access.
    if (session.role === ROLES.STAFF) {
      const allow = (key: string) => {
        const needed = permissionForWorkspacePatchKey(key);
        if (!needed) {
          // Catalog blobs map to products
          if (
            key === 'products' ||
            key === 'productCategories' ||
            key === 'warranties' ||
            key === 'credentialSchemes'
          ) {
            return canAccessPermission(
              session.role,
              session.permissions,
              'products',
            );
          }
          return true;
        }
        return canAccessPermission(session.role, session.permissions, needed);
      };
      const out = { ...workspace } as Record<string, unknown>;
      for (const key of Object.keys(out)) {
        if (!allow(key)) {
          out[key] = Array.isArray(out[key]) ? [] : out[key];
        }
      }
      // Security defense-in-depth: Never expose decrypted vault passwords/secrets to staff lacking vault permission
      if (!canAccessPermission(session.role, session.permissions, 'vault') && Array.isArray(out.deliveries)) {
        out.deliveries = (out.deliveries as any[]).map((d) => ({
          ...d,
          credentialPayload: undefined,
          credentialAudit: undefined,
        }));
      }
      return NextResponse.json(out);
    }
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
  const { session, error } = await requireConsoleAccess();
  if (error) return error;

  try {
    const body = (await request.json()) as WorkspacePatch;

    if (session.role === ROLES.STAFF) {
      for (const key of Object.keys(body) as (keyof WorkspacePatch)[]) {
        if (body[key] === undefined) continue;
        const needed = permissionForWorkspacePatchKey(String(key));
        if (
          needed &&
          !canAccessPermission(session.role, session.permissions, needed)
        ) {
          return NextResponse.json(
            { error: `Forbidden: missing ${needed} access` },
            { status: 403 },
          );
        }
      }
    }

    await auditWorkspacePatch(session.id, requestIp(request), body);
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
