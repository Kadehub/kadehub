import { Injectable } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { CursorExpiredError, HistoryPage, InboundMail, MailReader, MailSender, ProviderError } from './provider';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const UPLOAD = 'https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send';
const TIMEOUT_MS = 30_000;

function sanitize(err: any, what: string): ProviderError {
  const status: number | null = err?.response?.status ?? null;
  // Google's short error reason only: axios errors also carry the request, with its Authorization header
  const reason = typeof err?.response?.data?.error?.message === 'string' ? `: ${err.response.data.error.message.slice(0, 200)}`
    : typeof err?.response?.data?.error === 'string' ? `: ${err.response.data.error}` : '';
  const definite = status !== null && status >= 400 && status < 500 && status !== 408 && status !== 429;
  return new ProviderError(`Gmail ${what} failed (${status ?? err?.code ?? 'network'})${reason}`, status, definite);
}

/** One refresh token, exchanged for short-lived access tokens. Each Gmail class has its own and never sees the other. */
class OAuthToken {
  private access: string | null = null;
  private expiresAt = 0;

  constructor(private refreshEnv: string) {}

  isConfigured() {
    return !!(process.env.GMAIL_OAUTH_CLIENT_ID && process.env.GMAIL_OAUTH_CLIENT_SECRET && process.env[this.refreshEnv]);
  }

  async get(): Promise<string> {
    if (this.access && Date.now() < this.expiresAt - 60_000) return this.access;
    try {
      const { data } = await axios.post(TOKEN_URL, new URLSearchParams({
        client_id: process.env.GMAIL_OAUTH_CLIENT_ID,
        client_secret: process.env.GMAIL_OAUTH_CLIENT_SECRET,
        refresh_token: process.env[this.refreshEnv],
        grant_type: 'refresh_token',
      }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: TIMEOUT_MS });
      this.access = data.access_token;
      this.expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
      return this.access;
    } catch (err) {
      throw sanitize(err, 'token refresh');
    }
  }
}

const decode = (data?: string) => (data ? Buffer.from(data, 'base64url').toString('utf8') : '');

function walkParts(part: any, out: { text: string[]; html: string[]; report: string[] }) {
  if (!part) return;
  const type = (part.mimeType || '').toLowerCase();
  const isAttachment = !!part.filename;
  if (type === 'text/plain' && !isAttachment) out.text.push(decode(part.body?.data));
  else if (type === 'text/html' && !isAttachment) out.html.push(decode(part.body?.data));
  else if (type === 'message/delivery-status' || type === 'message/feedback-report') {
    out.report.push(decode(part.body?.data));
    // Gmail exposes the status fields as nested text parts on some bounces
    for (const child of part.parts ?? []) out.report.push(decode(child.body?.data));
    return;
  }
  for (const child of part.parts ?? []) walkParts(child, out);
}

/** Read-only access. Its token has only the gmail.readonly scope, and no method here changes anything in the mailbox. */
@Injectable()
export class GmailReader implements MailReader {
  private token = new OAuthToken('GMAIL_READ_REFRESH_TOKEN');

  isConfigured() { return this.token.isConfigured() && !!this.mailbox(); }
  mailbox() { return (process.env.EMAIL_AGENT_MAILBOX || '').trim().toLowerCase(); }

  private async get<T = any>(path: string, config: AxiosRequestConfig = {}): Promise<T> {
    const access = await this.token.get();
    const { data } = await axios.get(`${API}${path}`, { ...config, headers: { Authorization: `Bearer ${access}` }, timeout: TIMEOUT_MS });
    return data;
  }

  async getProfileHistoryId(): Promise<string> {
    try {
      const data = await this.get('/profile');
      return String(data.historyId);
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      throw sanitize(err, 'profile');
    }
  }

  async listHistory(startHistoryId: string, pageToken?: string): Promise<HistoryPage> {
    try {
      const data = await this.get('/history', {
        params: { startHistoryId, historyTypes: 'messageAdded', labelId: 'INBOX', maxResults: 100, ...(pageToken && { pageToken }) },
      });
      const ids = new Set<string>();
      for (const h of data.history ?? []) for (const m of h.messagesAdded ?? []) if (m.message?.id) ids.add(m.message.id);
      return { messageIds: [...ids], nextPageToken: data.nextPageToken, historyId: data.historyId ? String(data.historyId) : undefined };
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      if (err?.response?.status === 404) throw new CursorExpiredError('History cursor expired');
      throw sanitize(err, 'history');
    }
  }

  async listSince(after: Date, pageToken?: string) {
    try {
      const data = await this.get('/messages', {
        params: { q: `in:inbox after:${Math.floor(after.getTime() / 1000)}`, maxResults: 100, ...(pageToken && { pageToken }) },
      });
      return { messageIds: (data.messages ?? []).map((m: any) => m.id), nextPageToken: data.nextPageToken };
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      throw sanitize(err, 'list');
    }
  }

  async getMessage(id: string): Promise<InboundMail> {
    try {
      const data = await this.get(`/messages/${encodeURIComponent(id)}`, { params: { format: 'full' } });
      const rawHeaders: Array<{ name: string; value: string }> = data.payload?.headers ?? [];
      const headers: Record<string, string> = {};
      for (const h of rawHeaders) {
        const key = h.name.toLowerCase();
        if (!(key in headers)) headers[key] = h.value;
      }
      const parts = { text: [] as string[], html: [] as string[], report: [] as string[] };
      walkParts(data.payload, parts);
      return {
        providerId: data.id,
        threadId: data.threadId ?? null,
        labelIds: data.labelIds ?? [],
        headers,
        rawHeaders,
        text: parts.text.join('\n'),
        html: parts.html.join('\n'),
        reportText: parts.report.join('\n'),
        internalDate: new Date(Number(data.internalDate) || Date.now()),
      };
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      throw sanitize(err, 'get message');
    }
  }

  async findByRfcMessageId(rfcMessageId: string): Promise<string | null> {
    try {
      const data = await this.get('/messages', { params: { q: `rfc822msgid:${rfcMessageId.replace(/[<>]/g, '')}`, maxResults: 1 } });
      return data.messages?.[0]?.id ?? null;
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      throw sanitize(err, 'search');
    }
  }
}

/** Send-only access. Its token has only the gmail.send scope. */
@Injectable()
export class GmailSender implements MailSender {
  private token = new OAuthToken('GMAIL_SEND_REFRESH_TOKEN');

  isConfigured() { return this.token.isConfigured() && !!this.mailbox(); }
  mailbox() { return (process.env.EMAIL_AGENT_MAILBOX || '').trim().toLowerCase(); }

  async send(raw: Buffer, threadId?: string | null) {
    const access = await this.token.get();
    const boundary = 'kh_gmail_upload';
    const metadata = JSON.stringify(threadId ? { threadId } : {});
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: message/rfc822\r\n\r\n`),
      raw,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    try {
      const { data } = await axios.post(UPLOAD, body, {
        params: { uploadType: 'multipart' },
        headers: { Authorization: `Bearer ${access}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
        timeout: 60_000,
        maxBodyLength: 40 * 1024 * 1024,
      });
      return { id: String(data.id), threadId: data.threadId ?? null };
    } catch (err) {
      throw sanitize(err, 'send');
    }
  }
}
