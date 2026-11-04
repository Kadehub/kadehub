/** What the rest of the agent needs from a mailbox. Read and send are separate on purpose: they hold separate tokens. */

export interface InboundMail {
  providerId: string;
  threadId: string | null;
  labelIds: string[];
  headers: Record<string, string>;
  /** Every value per lower-cased name, for headers that can repeat. */
  rawHeaders: Array<{ name: string; value: string }>;
  text: string;
  html: string;
  /** Attachments such as a bounce's message/delivery-status part, text only. */
  reportText: string;
  internalDate: Date;
}

export interface HistoryPage { messageIds: string[]; nextPageToken?: string; historyId?: string; }

export interface MailReader {
  isConfigured(): boolean;
  mailbox(): string;
  getProfileHistoryId(): Promise<string>;
  /** Throws CursorExpiredError when the provider no longer has that history. */
  listHistory(startHistoryId: string, pageToken?: string): Promise<HistoryPage>;
  listSince(after: Date, pageToken?: string): Promise<{ messageIds: string[]; nextPageToken?: string }>;
  getMessage(id: string): Promise<InboundMail>;
  /** True if the mailbox holds a message with this RFC Message-ID, used to settle a crashed send without re-sending. */
  findByRfcMessageId(rfcMessageId: string): Promise<string | null>;
}

export interface MailSender {
  isConfigured(): boolean;
  mailbox(): string;
  /** Resolves once the provider accepted the message. */
  send(raw: Buffer, threadId?: string | null): Promise<{ id: string; threadId: string | null }>;
}

export class CursorExpiredError extends Error {}

/**
 * A provider failure with secrets stripped: never includes tokens, headers or request bodies.
 * `definite` means the provider certainly did not accept the message (a 4xx). Anything else (timeout, 5xx, dropped
 * connection) leaves the outcome unknown, and such a send is never retried automatically.
 */
export class ProviderError extends Error {
  constructor(message: string, readonly status: number | null, readonly definite: boolean) {
    super(message);
  }
}

export const MAIL_READER = Symbol('MAIL_READER');
export const MAIL_SENDER = Symbol('MAIL_SENDER');
