import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/** Encrypts merchants' courier API keys at rest with AES-256-GCM. Set COD_COURIER_SECRET (32+ characters). */

const MIN_SECRET = 32;

export class CourierSecretMissing extends Error {}

function key(): Buffer {
  const secret = process.env.COD_COURIER_SECRET ?? '';
  if (secret.length < MIN_SECRET) throw new CourierSecretMissing('COD_COURIER_SECRET is not set');
  return createHash('sha256').update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join('.');
}

export function decryptSecret(stored: string): string {
  const [version, iv, tag, data] = stored.split('.');
  if (version !== 'v1' || !iv || !tag || data === undefined) throw new Error('Unreadable courier key');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}
