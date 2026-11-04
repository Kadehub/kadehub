import { createHmac, timingSafeEqual } from 'crypto';
import { normalizeAddress } from './ea-db';

const secret = () => process.env.EMAIL_AGENT_UNSUBSCRIBE_SECRET || '';

export const unsubscribeConfigured = () => secret().length >= 24;

export const publicApiUrl = () => (process.env.EMAIL_AGENT_PUBLIC_API_URL || 'https://api.kadehub.com/api').replace(/\/$/, '');

function sign(address: string) {
  return createHmac('sha256', secret()).update(`unsubscribe:${address}`).digest('base64url');
}

/** A link that identifies one address and can't be forged for another. */
export function unsubscribeToken(address: string): string {
  const addr = normalizeAddress(address);
  return `${Buffer.from(addr, 'utf8').toString('base64url')}.${sign(addr)}`;
}

/** The token goes in the query string: the API logger records paths, never query strings. */
export const unsubscribeUrl = (address: string) => `${publicApiUrl()}/email-agent/unsubscribe?t=${unsubscribeToken(address)}`;

export function verifyUnsubscribeToken(token: string | undefined): string | null {
  if (!token || !unsubscribeConfigured()) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  const address = normalizeAddress(Buffer.from(encoded, 'base64url').toString('utf8'));
  const expected = Buffer.from(sign(address));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return address;
}
