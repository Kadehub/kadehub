import { createHash, randomBytes } from 'crypto';

/** Every message we send carries this header. Inbound mail with it is stored only, so alerts can never cause a loop. */
export const AGENT_HEADER = 'X-KadeHub-Agent';

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_TOTAL_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 5;
export const ALLOWED_ATTACHMENT_TYPES = new Set([
  'application/pdf', 'image/png', 'image/jpeg', 'text/plain', 'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export interface MimeAttachment { filename: string; contentType: string; content: Buffer; }

export interface MimeInput {
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  body: string;
  messageId: string;
  inReplyTo?: string | null;
  references?: string | null;
  listUnsubscribe?: { url?: string; mailto?: string } | null;
  attachments?: MimeAttachment[];
  date?: Date;
}

export class HeaderInjectionError extends Error {}

const EMAIL_RE = /^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

export function isValidAddress(addr: string): boolean {
  return typeof addr === 'string' && addr.length <= 190 && EMAIL_RE.test(addr) && !/[\r\n\s<>,;"]/.test(addr);
}

/** Header values may never carry line breaks or other control characters: that is how injection works. */
export function assertSafeHeader(value: string, name: string) {
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0a-\x1f\x7f\u0085\u2028\u2029]/.test(value)) throw new HeaderInjectionError(`Illegal character in ${name} header`);
}

/** RFC 2047 encoded-words for non-ASCII text, split on character boundaries so multibyte letters never get cut. */
export function encodeHeaderText(value: string): string {
  assertSafeHeader(value, 'text');
  // eslint-disable-next-line no-control-regex
  if (/^[\x20-\x7e]*$/.test(value)) return value;
  const words: string[] = [];
  let current = '';
  for (const ch of Array.from(value)) {
    if (Buffer.byteLength(current + ch, 'utf8') > 42) {
      words.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) words.push(current);
  return words.map(w => `=?UTF-8?B?${Buffer.from(w, 'utf8').toString('base64')}?=`).join('\r\n ');
}

/** A display name, quoted or encoded, in front of the address. */
function formatAddress(address: string, name?: string): string {
  if (!isValidAddress(address)) throw new HeaderInjectionError('Invalid address');
  if (!name) return address;
  assertSafeHeader(name, 'name');
  // eslint-disable-next-line no-control-regex
  const safe = /^[\x20-\x7e]*$/.test(name)
    ? `"${name.replace(/(["\\])/g, '\\$1')}"`
    : encodeHeaderText(name);
  return `${safe} <${address}>`;
}

/** Strips path parts, control and quoting characters, and keeps a sensible length and extension. */
export function safeFilename(raw: string): string {
  const base = (raw || '').normalize('NFC').split(/[\\/]/).pop() || '';
  // eslint-disable-next-line no-control-regex
  let clean = base.replace(/[\x00-\x1f\x7f"<>:|?*;]/g, '').replace(/^\.+/, '').trim();
  if (!clean) clean = 'attachment';
  if (clean.length > 150) {
    const dot = clean.lastIndexOf('.');
    const ext = dot > 0 && clean.length - dot <= 10 ? clean.slice(dot) : '';
    clean = clean.slice(0, 150 - ext.length) + ext;
  }
  return clean;
}

function filenameParam(name: string, param: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x20-\x7e]*$/.test(name)) return `${param}="${name.replace(/(["\\])/g, '\\$1')}"`;
  const encoded = encodeURIComponent(name).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${param}*=UTF-8''${encoded}`;
}

const base64Lines = (data: Buffer) => data.toString('base64').replace(/(.{76})/g, '$1\r\n').trimEnd();

export function newMessageId(domain: string): string {
  return `<${Date.now().toString(36)}.${randomBytes(12).toString('hex')}@${domain}>`;
}

export function buildRfc822(input: MimeInput): Buffer {
  for (const [name, value] of Object.entries({
    subject: input.subject, 'message-id': input.messageId, 'in-reply-to': input.inReplyTo ?? '', references: input.references ?? '',
    'list-unsubscribe-url': input.listUnsubscribe?.url ?? '', 'list-unsubscribe-mailto': input.listUnsubscribe?.mailto ?? '',
  })) assertSafeHeader(value, name);

  const attachments = input.attachments ?? [];
  const headers: string[] = [
    `From: ${formatAddress(input.from, input.fromName)}`,
    `To: ${formatAddress(input.to)}`,
    `Subject: ${encodeHeaderText(input.subject)}`,
    `Message-ID: ${input.messageId}`,
    `Date: ${(input.date ?? new Date()).toUTCString().replace('GMT', '+0000')}`,
    'MIME-Version: 1.0',
    `${AGENT_HEADER}: outbound`,
  ];
  if (input.inReplyTo) headers.push(`In-Reply-To: ${input.inReplyTo}`);
  if (input.references) headers.push(`References: ${input.references}`);
  if (input.listUnsubscribe?.url || input.listUnsubscribe?.mailto) {
    const parts = [
      input.listUnsubscribe.url ? `<${input.listUnsubscribe.url}>` : '',
      input.listUnsubscribe.mailto ? `<mailto:${input.listUnsubscribe.mailto}?subject=unsubscribe>` : '',
    ].filter(Boolean);
    headers.push(`List-Unsubscribe: ${parts.join(', ')}`);
    if (input.listUnsubscribe.url) headers.push('List-Unsubscribe-Post: List-Unsubscribe=One-Click');
  }

  const bodyBytes = Buffer.from(input.body.replace(/\r?\n/g, '\r\n'), 'utf8');
  const textPart = [
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Lines(bodyBytes),
  ].join('\r\n');

  if (!attachments.length) {
    return Buffer.from(`${headers.join('\r\n')}\r\n${textPart}\r\n`, 'utf8');
  }

  const boundary = `=_kh_${randomBytes(16).toString('hex')}`;
  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  const parts = [textPart];
  for (const att of attachments) {
    if (!ALLOWED_ATTACHMENT_TYPES.has(att.contentType)) throw new Error('Attachment type not allowed');
    const filename = safeFilename(att.filename);
    parts.push([
      `Content-Type: ${att.contentType}; ${filenameParam(filename, 'name')}`,
      `Content-Disposition: attachment; ${filenameParam(filename, 'filename')}`,
      'Content-Transfer-Encoding: base64',
      '',
      base64Lines(att.content),
    ].join('\r\n'));
  }
  const body = parts.map(p => `--${boundary}\r\n${p}\r\n`).join('') + `--${boundary}--\r\n`;
  return Buffer.from(`${headers.join('\r\n')}\r\n\r\n${body}`, 'utf8');
}

export const sha256Hex = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');

/** Same canonical form as the database's ea_content_hash(), so the app can check a row before claiming it. */
export function contentHash(recipient: string, subject: string, body: string, attachmentHashes: string): string {
  const field = (s: string) => `${Array.from(s).length}:${s}`;
  return sha256Hex(Buffer.from(`v1|${field(recipient)}|${field(subject)}|${field(body)}|${field(attachmentHashes)}`, 'utf8'));
}
