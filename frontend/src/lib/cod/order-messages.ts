import { formatDate, formatLKR } from "@/lib/cod/format";
import type { Translator } from "@/lib/cod/i18n/translator";
import type { CodMe } from "@/lib/cod/session";
import { apiError } from "@/lib/cod/session";
import type { MessageKey } from "@/lib/cod/i18n/messages/en";
import type { OrderDetail, PaymentType } from "@/lib/cod/types";

export const PAYMENT_TYPE_KEY: Record<PaymentType, MessageKey> = {
  cod: "pay.cod",
  pay_now: "pay.pay_now",
  credit: "pay.credit",
};

/** WhatsApp order confirmation: items, total, payment type and delivery address. */
export function buildConfirmationMessage(o: OrderDetail, businessName: string, t: Translator): string {
  const out: string[] = [];
  out.push(`*${o.invoice_number}* · ${businessName}`);
  out.push(o.customer_name ? t("msg.hi", { name: o.customer_name }) : t("msg.thanks"));
  out.push("");
  out.push(`*${t("msg.details")}*`);
  o.order_items.forEach((l, i) => out.push(`${i + 1}. ${l.item_name} × ${l.quantity} — ${formatLKR(l.line_total)}`));
  out.push("");
  if (Number(o.delivery_charge) > 0) out.push(t("msg.delivery", { value: formatLKR(o.delivery_charge) }));
  if (Number(o.discount) > 0) out.push(t("msg.discount", { value: formatLKR(o.discount) }));
  out.push(`*${t("conf.total", { value: formatLKR(o.total_amount) })}*`);
  out.push(t("conf.payment", { value: t(PAYMENT_TYPE_KEY[o.payment_type ?? "cod"]) }));
  if (o.payment_type === "credit" && o.payment_due_date) out.push(t("conf.due", { date: formatDate(o.payment_due_date, t.locale) }));
  const to = [o.customer_address, o.city].filter(Boolean).join(", ");
  if (to) { out.push(""); out.push(t("msg.deliveringTo", { value: to })); }
  if (o.tracking_number) out.push(t("conf.tracking", { value: o.tracking_number }));
  return out.join("\n");
}

/** WhatsApp payment reminder: total outstanding plus each open invoice with its due date. */
export function buildCreditReminder(
  name: string,
  invoices: { invoice_number: string; outstanding: number; payment_due_date: string | null }[],
  businessName: string,
  t: Translator,
): string {
  const open = invoices.filter(i => i.outstanding > 0);
  const total = open.reduce((s, i) => s + Number(i.outstanding), 0);
  const out: string[] = [];
  out.push(t("remind.hi", { name: name || "" }).trim());
  out.push("");
  out.push(t("remind.intro", { business: businessName, total: formatLKR(total) }));
  out.push("");
  for (const i of open) {
    out.push(`• ${i.invoice_number} — ${formatLKR(i.outstanding)}${i.payment_due_date ? ` (${t("remind.dueOn", { date: formatDate(i.payment_due_date, t.locale) })})` : ""}`);
  }
  out.push("");
  out.push(t("remind.thanks"));
  return out.join("\n");
}

/** Translated message for order / credit API errors (falls back to the shared COD error mapping). */
export function orderError(err: unknown, t: Translator, me?: CodMe | null): string {
  const res = (err as { response?: { status?: number; data?: { code?: string; message?: unknown; item?: string; available?: number; outstanding?: number } } })?.response;
  const data = res?.data;
  if (res?.status === 403) return t("err.noPermission");
  const code = data?.code ?? (typeof data?.message === "string" ? data.message : undefined);
  switch (code) {
    case "INSUFFICIENT_STOCK": return t("err.insufficientStock", { item: data?.item ?? "", available: data?.available ?? 0 });
    case "PAYMENT_TOO_LARGE": return t("err.paymentTooLarge", { outstanding: formatLKR(data?.outstanding ?? 0) });
    case "PAYMENT_AMOUNT": return t("err.paymentAmount");
    case "CREDIT_ONLY": return t("err.creditOnly");
    case "CREDIT_HAS_PAYMENTS": return t("err.creditHasPayments");
    case "TOTAL_BELOW_PAID": return t("err.totalBelowPaid");
    case "NEGATIVE_AMOUNT": return t("err.negativeAmount");
    case "CUSTOM_LINE_NAME": return t("err.customLineName");
    case "DISCOUNT_TOO_LARGE": return t("err.discountTooLarge");
    case "AMOUNT_TOO_LARGE": return t("err.amountTooLarge");
    case "ITEM_NOT_FOUND": return t("err.itemNotFound");
    case "NOTHING_OUTSTANDING": return t("err.nothingOutstanding");
  }
  return apiError(err, t, me);
}
