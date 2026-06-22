import crypto from 'node:crypto';
import { config } from '../config.js';

// Derive a stable 32-byte key from the app secret. Rotating JWT_SECRET will
// invalidate previously stored ciphertexts (they'd need re-entry) — acceptable
// for API keys, which users can simply re-add.
const KEY = crypto.createHash('sha256').update(config.auth.jwtSecret).digest();

/** Encrypt a secret (e.g. an API key) → "iv:tag:ciphertext" (base64 parts). */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

/** Decrypt a value produced by encryptSecret. Returns '' if it can't be read. */
export function decryptSecret(blob: string): string {
  try {
    const [ivB64, tagB64, dataB64] = blob.split(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      KEY,
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return '';
  }
}

/** Last-4 mask for display, e.g. "sk-…a1b2". */
export function maskSecret(plain: string): string {
  if (!plain) return '';
  return plain.length <= 4 ? '••••' : `••••${plain.slice(-4)}`;
}
