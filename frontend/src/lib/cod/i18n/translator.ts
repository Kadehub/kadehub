import type { MessageKey } from "./messages/en";
import type { Locale } from "./config";

export type Params = Record<string, string | number>;

/** Keys that come in `<base>.one` / `<base>.other` pairs. */
export type PluralBase<K extends string = MessageKey> = K extends `${infer B}.one` ? B : never;

export interface Translator {
  (key: MessageKey, params?: Params): string;
  locale: Locale;
  /** Whether a (possibly dynamically built) key exists. */
  has(key: string): boolean;
  /** Picks `<base>.one` when count is 1, else `<base>.other`; `{count}` is filled in. */
  n(base: PluralBase, count: number, params?: Params): string;
  /** Translates data-like English values (expense categories, plan features…) by
   *  looking up `<prefix>.<slug>`; falls back to the original text when there is no entry. */
  lookup(prefix: string, english: string): string;
}

/** `Warranty & Repairs` → `warranty_repairs` */
export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

export function createTranslator(locale: Locale, messages: Readonly<Record<string, string>>): Translator {
  const t = ((key: MessageKey, params?: Params) => interpolate(messages[key] ?? key, params)) as Translator;
  t.locale = locale;
  t.has = (key) => key in messages;
  t.n = (base, count, params) =>
    interpolate(messages[`${base}.${count === 1 ? "one" : "other"}`] ?? base, { count, ...params });
  t.lookup = (prefix, english) => {
    const key = `${prefix}.${slug(english)}`;
    return key in messages ? messages[key] : english;
  };
  return t;
}
