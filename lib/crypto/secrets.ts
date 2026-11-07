import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const PREFIX = 'enc:v1:';

function keyBytes(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET || '';
  if (!raw || raw.length < 16) {
    throw new Error('ENCRYPTION_KEY or AUTH_SECRET (min 16 chars) required for secret storage');
  }
  return createHash('sha256').update(raw).digest();
}

/** AES-256-GCM. Legacy plaintext (no prefix) is returned unchanged on decrypt. */
export function encryptSecret(plain: string): string {
  if (!plain) return plain;
  if (plain.startsWith(PREFIX)) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBytes(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

export function decryptSecret(stored: string): string {
  if (!stored || !stored.startsWith(PREFIX)) return stored;
  const body = stored.slice(PREFIX.length);
  const [ivB64, tagB64, dataB64] = body.split('.');
  if (!ivB64 || !tagB64 || !dataB64) return stored;
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      keyBytes(),
      Buffer.from(ivB64, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return stored;
  }
}
