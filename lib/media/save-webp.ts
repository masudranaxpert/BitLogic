import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const MEDIA_UPLOAD_DIR = path.join(
  process.cwd(),
  'public',
  'uploads',
  'media',
);

export const MEDIA_PUBLIC_PREFIX = '/uploads/media';

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_EDGE = 2400;

export function slugifyBaseName(name: string): string {
  const base = name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'asset';
}

export function isLocalUploadUrl(url: string): boolean {
  return url.startsWith(`${MEDIA_PUBLIC_PREFIX}/`);
}

export function localUploadPathFromUrl(url: string): string | null {
  if (!isLocalUploadUrl(url)) return null;
  const file = path.basename(url);
  if (!file || file.includes('..')) return null;
  return path.join(MEDIA_UPLOAD_DIR, file);
}

export async function ensureMediaUploadDir() {
  await mkdir(MEDIA_UPLOAD_DIR, { recursive: true });
}

export type SavedWebpAsset = {
  url: string;
  fileName: string;
  mimeType: 'image/webp';
  sizeKB: number;
  dimensions: string;
  width: number;
  height: number;
};

export async function saveImageBufferAsWebp(
  input: Buffer,
  preferredName: string,
): Promise<SavedWebpAsset> {
  if (input.byteLength > MAX_BYTES) {
    throw new Error('File exceeds 8 MB limit.');
  }

  const pipeline = sharp(input, { failOn: 'none' }).rotate();
  const meta = await pipeline.metadata();
  if (!meta.width || !meta.height) {
    throw new Error('Could not read image dimensions.');
  }

  const resized = pipeline.resize({
    width: MAX_EDGE,
    height: MAX_EDGE,
    fit: 'inside',
    withoutEnlargement: true,
  });

  const webpBuffer = await resized.webp({ quality: 82, effort: 4 }).toBuffer();
  const outMeta = await sharp(webpBuffer).metadata();
  const width = outMeta.width || meta.width;
  const height = outMeta.height || meta.height;

  await ensureMediaUploadDir();
  const slug = slugifyBaseName(preferredName);
  const fileName = `${Date.now()}-${slug}.webp`;
  const diskPath = path.join(MEDIA_UPLOAD_DIR, fileName);
  await writeFile(diskPath, webpBuffer);

  return {
    url: `${MEDIA_PUBLIC_PREFIX}/${fileName}`,
    fileName,
    mimeType: 'image/webp',
    sizeKB: Math.max(1, Math.round(webpBuffer.byteLength / 1024)),
    dimensions: `${width}×${height}`,
    width,
    height,
  };
}

export async function deleteLocalUpload(url: string): Promise<boolean> {
  const diskPath = localUploadPathFromUrl(url);
  if (!diskPath) return false;
  try {
    await unlink(diskPath);
    return true;
  } catch {
    return false;
  }
}
