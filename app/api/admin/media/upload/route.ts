import { lookup } from 'node:dns/promises';
import { isIPv4, isIPv6 } from 'node:net';
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-admin';
import { saveImageBufferAsWebp } from '@/lib/media/save-webp';

export const runtime = 'nodejs';

const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const MAX_REMOTE_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Standard RFC subnet validation:
 * Validates against Loopback (127.0.0.0/8), Private subnets (RFC 1918),
 * Link-local (RFC 3927), and IPv6 local/mapped ranges.
 */
function isPrivateIpAddress(ip: string): boolean {
  if (isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
      return true;
    }
    // 0.0.0.0/8 (Current network)
    if (parts[0] === 0) return true;
    // 10.0.0.0/8 (Private)
    if (parts[0] === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 169.254.0.0/16 (Link-local / Cloud metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 172.16.0.0/12 (Private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    return false;
  }

  if (isIPv6(ip)) {
    const norm = ip.toLowerCase();
    if (norm === '::1' || norm === '::') return true;
    // IPv4-mapped IPv6 (::ffff:127.0.0.1)
    if (norm.startsWith('::ffff:')) {
      return isPrivateIpAddress(norm.replace('::ffff:', ''));
    }
    // Unique local address (fc00::/7) or Link-local (fe80::/10)
    if (
      norm.startsWith('fc') ||
      norm.startsWith('fd') ||
      norm.startsWith('fe8') ||
      norm.startsWith('fe9') ||
      norm.startsWith('fea') ||
      norm.startsWith('feb')
    ) {
      return true;
    }
    return false;
  }

  return true; // Unknown/invalid IP -> treat as unsafe
}

async function isSafePublicUrl(rawUrl: string): Promise<boolean> {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    // Resolves hostname to its actual underlying IP (prevents DNS rebinding, alias bypasses, etc.)
    const { address } = await lookup(parsed.hostname);
    return !isPrivateIpAddress(address);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const { error } = await requirePermission('media');
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
      if (!remoteUrl || !(await isSafePublicUrl(remoteUrl))) {
        return NextResponse.json(
          { error: 'A valid and public image URL (HTTP/HTTPS) is required.' },
          { status: 400 },
        );
      }
      const res = await fetch(remoteUrl, {
        headers: { Accept: 'image/*,*/*' },
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: 'Could not download that image URL.' },
          { status: 400 },
        );
      }
      const contentLength = Number(res.headers.get('content-length') || 0);
      if (contentLength > MAX_REMOTE_BYTES) {
        return NextResponse.json(
          { error: 'Remote image exceeds 8 MB limit.' },
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
      const arrayBuf = await res.arrayBuffer();
      if (arrayBuf.byteLength > MAX_REMOTE_BYTES) {
        return NextResponse.json(
          { error: 'Remote image exceeds 8 MB limit.' },
          { status: 400 },
        );
      }
      buffer = Buffer.from(arrayBuf);
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
