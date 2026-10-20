export const LOCALES = ["en", "si", "ta"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "cod_locale";

/** Each language written in itself, for the language picker. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  si: "සිංහල",
  ta: "தமிழ்",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
