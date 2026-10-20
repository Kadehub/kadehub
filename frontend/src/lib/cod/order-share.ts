import { formatDate, formatLKR } from "@/lib/cod/format";
import type { InvoicePdfData } from "@/lib/cod/invoice-pdf";
import type { MessageKey } from "@/lib/cod/i18n/messages/en";
import type { Translator } from "@/lib/cod/i18n/translator";

/** Sri Lanka. Local numbers written as 07XXXXXXXX get this prefix for WhatsApp. */
export const DEFAULT_DIAL_CODE = "94";

/** Turns a phone number as people type it into the digits-only international
 *  form wa.me expects (`0771234567` → `94771234567`). Returns null when it
 *  doesn't look like a dialable number. */
export function normalizePhone(raw: string | null | undefined, dialCode = DEFAULT_DIAL_CODE): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (trimmed.startsWith("+")) {
    // Already international: "+94 77 123 4567", "+94 (0)77…" — drop a stray trunk 0.
    if (digits.startsWith(dialCode + "0")) digits = dialCode + digits.slice(dialCode.length + 1);
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = dialCode + digits.slice(1);
  } else if (digits.length <= 9) {
    // "771234567" — national number typed without the leading 0.
    digits = dialCode + digits;
  }

  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

/** wa.me deep link. With no usable phone it opens WhatsApp's contact picker. */
export function whatsappUrl(phone: string | null | undefined, text: string): string {
  const number = normalizePhone(phone);
  return `https://wa.me/${number ?? ""}?text=${encodeURIComponent(text)}`;
}

/** Plain-text order summary in the active language, formatted with WhatsApp's
 *  *bold* markers (other apps just show the asterisks, which is harmless). */
export function buildOrderMessage(d: InvoicePdfData, t: Translator): string {
  const status = `msg.status.${d.status}`;
  const out: string[] = [];
  out.push(`*${d.invoice_number}* · ${d.business.name}`);
  out.push(`${formatDate(d.created_at, t.locale)} · ${t.has(status) ? t(status as MessageKey) : d.status}`);
  out.push("");
  out.push(d.customer.name ? t("msg.hi", { name: d.customer.name }) : t("msg.thanks"));
  out.push("");
  out.push(`*${t("msg.details")}*`);
  d.lines.forEach((l, i) => {
    out.push(`${i + 1}. ${l.name} × ${l.quantity} — ${formatLKR(l.line_total)}`);
  });
  out.push("");
  out.push(t("msg.subtotal", { value: formatLKR(d.subtotal) }));
  out.push(t("msg.delivery", { value: formatLKR(d.delivery_charge) }));
  if (d.discount > 0) out.push(t("msg.discount", { value: formatLKR(d.discount) }));
  out.push(`*${t("msg.total", { value: formatLKR(d.total_amount) })}*`);

  const deliverTo = [d.customer.address, d.customer.city].filter(Boolean).join(", ");
  if (deliverTo) {
    out.push("");
    out.push(t("msg.deliveringTo", { value: deliverTo }));
  }
  if (d.notes) out.push(`📝 ${d.notes}`);

  if (d.business.phone) {
    out.push("");
    out.push(t("msg.questions", { business: d.business.name, phone: d.business.phone }));
  }
  return out.join("\n");
}

/**
 * Phone format check (same rule as backend cod-orders-calc.ts isValidPhone):
 * local 0XXXXXXXXX (10 digits) or XXXXXXXXX (9), 94XXXXXXXXX (11), or international +/00 with 10–15 digits.
 * Only digits, spaces and + - ( ) . are allowed.
 */
export function isValidPhone(raw: string | null | undefined): boolean {
  const s = (raw ?? "").trim();
  if (!s || /[^\d\s()+\-.]/.test(s) || s.indexOf("+") > 0) return false;
  const digits = s.replace(/\D/g, "");
  if (s.startsWith("+")) return digits.length >= 10 && digits.length <= 15;
  if (digits.startsWith("00")) return digits.length - 2 >= 10 && digits.length - 2 <= 15;
  if (digits.startsWith("0")) return digits.length === 10;
  if (digits.startsWith("94")) return digits.length === 11;
  return digits.length === 9;
}
