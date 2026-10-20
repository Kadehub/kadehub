import type { Locale } from "./config";

/** Short month names per language.
 *
 *  Kept here instead of asking `Intl` because the server (Node) and the visitor's
 *  browser ship different CLDR data for Sinhala/Tamil — the same date rendered
 *  differently on each side and caused React hydration mismatches. */
export const MONTHS_SHORT: Record<Locale, readonly string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  si: ["ජන", "පෙබ", "මාර්", "අප්‍රේ", "මැයි", "ජූනි", "ජූලි", "අගෝ", "සැප්", "ඔක්", "නොවැ", "දෙසැ"],
  ta: ["ஜன.", "பிப்.", "மார்.", "ஏப்.", "மே", "ஜூன்", "ஜூலை", "ஆக.", "செப்.", "அக்.", "நவ.", "டிச."],
};

/** The platform's home time zone (Sri Lanka, UTC+5:30, no daylight saving). Dates are shown in it
 *  regardless of where the server or browser runs, so both sides always agree on the day. */
const COLOMBO_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function colomboParts(date: Date): { year: number; month: number; day: number } {
  const shifted = new Date(date.getTime() + COLOMBO_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

/** `Sep 19, 2026` · `2026 සැප් 19` · `19 செப்., 2026` */
export function formatShortDate(date: Date, locale: Locale): string {
  const { year, month, day } = colomboParts(date);
  const m = MONTHS_SHORT[locale][month - 1];
  if (locale === "si") return `${year} ${m} ${day}`;
  if (locale === "ta") return `${day} ${m}, ${year}`;
  return `${m} ${day}, ${year}`;
}
