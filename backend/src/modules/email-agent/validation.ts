import { isValidAddress } from './mail/mime';

/** Server-side checks run on every draft. The model's own assurances count for nothing here. */

export interface ValidationContext {
  recipient: string;
  recipientSuppressed: boolean;
  /** Every number that appeared in a tool result during this draft. */
  knownAmounts: Set<string>;
  /** Product and plan names from the catalogue. Lower-case. */
  knownNames: Set<string>;
  allowedDomains: string[];
  approvedClaims: string[];
}

export interface ValidationIssue { code: string; message: string; }

/** Everything below this line in a body was added by the server. */
export const FOOTER_MARKER = '\n-- \n';

export const PLACEHOLDER_RE = /\[(?:[A-Z][A-Za-z _-]{1,30})\]|\{\{[^}]*\}\}|<(?:your|first|last|company|name)[ _-]?[a-z ]*>|\b(?:TBD|TODO|XXX+|lorem ipsum|insert (?:name|price|date|link))\b/;

const CURRENCY = String.raw`(?:LKR|Rs\.?|රු\.?|ரூ\.?|USD|US\$|\$)`;
const AMOUNT_RE = new RegExp(String.raw`${CURRENCY}\s*(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s*(?:LKR|rupees)\b`, 'gi');

const normalizeAmount = (raw: string) => {
  const n = parseFloat(raw.replace(/,/g, ''));
  return Number.isFinite(n) ? String(n) : raw;
};

export function collectAmounts(text: string, into: Set<string>) {
  for (const m of (text || '').matchAll(/\d[\d,]*(?:\.\d+)?/g)) into.add(normalizeAmount(m[0]));
}

export function findAmounts(text: string): string[] {
  return [...(text || '').matchAll(AMOUNT_RE)].map(m => m[1] || m[2]).filter(Boolean);
}

const URL_RE = /\bhttps?:\/\/[^\s<>()"']+|\bwww\.[^\s<>()"']+/gi;
const BARE_DOMAIN_RE = /(?<![@\w.-])((?:[a-z0-9-]+\.)+(?:com|net|org|io|co|lk|info|biz|app|dev|xyz|me|ly|gl))(?![\w@-])/gi;

export function linkHosts(text: string): string[] {
  const hosts = new Set<string>();
  for (const m of (text || '').matchAll(URL_RE)) {
    const raw = m[0].replace(/[.,;:!?]+$/, '');
    try {
      hosts.add(new URL(raw.startsWith('http') ? raw : `https://${raw}`).hostname.toLowerCase());
    } catch {
      hosts.add(raw.toLowerCase());
    }
  }
  const withoutUrls = (text || '').replace(URL_RE, ' ');
  for (const m of withoutUrls.matchAll(BARE_DOMAIN_RE)) hosts.add(m[1].toLowerCase());
  return [...hosts];
}

export const hostAllowed = (host: string, allowed: string[]) =>
  allowed.some(d => host === d.toLowerCase() || host.endsWith(`.${d.toLowerCase()}`));

const CLAIM_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: 'a guarantee', re: /\b(guarantee[ds]?|money[- ]back|warrant(y|ies|ed))\b/i },
  { label: 'a certification', re: /\b(certified|certification|accredited|ISO\s?\d+|PCI[- ]?DSS|SOC\s?2|HIPAA|GDPR[- ]compliant)\b/i },
  { label: 'a delivery or timing promise', re: /\b(within|in)\s+\d+\s+(minutes?|hours?|days?|weeks?)\b|\b(same[- ]day|next[- ]day|by (monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow))\b/i },
  { label: 'an absolute claim', re: /\b(100\s?%|never fails?|always available|zero downtime|no\.?\s?1|number one|best in|cheapest|lowest price)\b/i },
  { label: 'an uptime claim', re: /\b\d{2}(\.\d+)?\s?%\s*(uptime|availability)\b/i },
  { label: 'a discount or free offer', re: /\b(\d+\s?%\s*(off|discount)|free (forever|for life)|lifetime (deal|free))\b/i },
];

export function findUnapprovedClaims(text: string, approved: string[]): string[] {
  const lower = (text || '').toLowerCase();
  const issues: string[] = [];
  for (const { label, re } of CLAIM_PATTERNS) {
    const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`;
    for (const m of (text || '').matchAll(new RegExp(re.source, flags))) {
      const phrase = m[0];
      const start = lower.indexOf(phrase.toLowerCase());
      // An approved phrase wins only where it covers this exact wording in the text
      const covered = approved.some(a => {
        const claim = a.trim().toLowerCase();
        if (!claim) return false;
        for (let at = lower.indexOf(claim); at !== -1; at = lower.indexOf(claim, at + 1)) {
          if (at <= start && at + claim.length >= start + phrase.length) return true;
        }
        return false;
      });
      if (!covered) issues.push(`"${phrase}" looks like ${label} and is not on the approved claims list`);
    }
  }
  return issues;
}

const NOT_PRODUCT_WORDS = new Set(['team', 'support', 'platform', 'account', 'customer', 'customers', 'sales', 'help', 'admin']);

/** "KadeHub Foo" or "the Foo plan" with no such thing in the catalogue. */
export function findUnknownProducts(text: string, known: Set<string>): string[] {
  const out = new Set<string>();
  // Same line only: a subject ending in "KadeHub" must not read the first word of the body as a product
  for (const m of (text || '').matchAll(/\bKadeHub[ \t]+([A-Z][\w-]*)/g)) {
    const word = m[1].toLowerCase();
    if (NOT_PRODUCT_WORDS.has(word)) continue;
    if (!known.has(`kadehub ${word}`) && !known.has(word)) out.add(m[0]);
  }
  for (const m of (text || '').matchAll(/\b(?:[Tt]he[ \t]+)([A-Z][\w-]*)[ \t]+(?:plan|package)\b/g)) {
    if (!known.has(m[1].toLowerCase())) out.add(`${m[1]} plan`);
  }
  return [...out];
}

export function validateDraft(subject: string, fullBody: string, ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (code: string, message: string) => issues.push({ code, message });
  // The server's own footer holds a link and the source of the address, neither of which came from the model
  const cut = fullBody.indexOf(FOOTER_MARKER);
  const body = cut === -1 ? fullBody : fullBody.slice(0, cut);
  const text = `${subject}\n${body}`;

  if (!isValidAddress(ctx.recipient)) add('recipient_invalid', `"${ctx.recipient}" is not a valid email address`);
  if (ctx.recipientSuppressed) add('recipient_suppressed', `${ctx.recipient} is on the suppression list`);
  if (!subject.trim()) add('subject_empty', 'Subject is empty');
  if (!body.trim()) add('body_empty', 'Body is empty');

  const placeholder = text.match(PLACEHOLDER_RE);
  if (placeholder) add('placeholder', `Contains a placeholder: ${placeholder[0]}`);

  for (const raw of findAmounts(text)) {
    if (!ctx.knownAmounts.has(normalizeAmount(raw))) add('price_unverified', `The amount ${raw} did not come from any tool result`);
  }
  for (const name of findUnknownProducts(text, ctx.knownNames)) add('product_unknown', `"${name}" is not in the product catalogue`);
  for (const msg of findUnapprovedClaims(text, ctx.approvedClaims)) add('claim_unapproved', msg);
  for (const host of linkHosts(text)) {
    if (!hostAllowed(host, ctx.allowedDomains)) add('link_not_allowed', `Link to ${host} is outside the allowed domains`);
  }
  return issues;
}

/** Only these stop an approval outright. Everything else can be accepted by a person who has read the warning. */
export const BLOCKING_ISSUES = new Set(['recipient_invalid', 'recipient_suppressed', 'subject_empty', 'body_empty', 'placeholder']);
