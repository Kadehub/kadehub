type InvoiceEmailData = {
  invoice: any;
  tenant?: any;
  profile?: any;
  bank?: any;
  platform?: any;
  payment?: any;
};

function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtMoney(amount: number, currency = 'LKR'): string {
  return `${currency} ${Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildInvoiceEmailHtml(data: InvoiceEmailData): string {
  const { invoice, tenant, profile, platform, payment } = data;
  const currency = invoice.currency || 'LKR';
  const vatRate = Number(platform?.vat_rate ?? 0);
  const isTaxInvoice = vatRate > 0 || Boolean(platform?.vat_number?.trim());
  const title = isTaxInvoice ? 'Tax Invoice' : 'Invoice';
  const isPaid = invoice.status === 'paid';

  const items = invoice.line_items?.length ? invoice.line_items : [{
    description: invoice.description || 'KadeHub Platform Service',
    quantity: 1,
    unit_price: invoice.amount,
    total: invoice.amount,
  }];

  const rows = items.map((item: any) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155">${esc(item.description)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;color:#334155">${item.quantity ?? 1}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#334155">${fmtMoney(Number(item.unit_price ?? item.total), currency)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;color:#0f172a">${fmtMoney(Number(item.total ?? item.unit_price), currency)}</td>
    </tr>
  `).join('');

  const billToName = tenant?.name || invoice.bill_to_name || '—';

  return `
    <div style="font-family:Segoe UI,system-ui,sans-serif;max-width:640px;margin:0 auto;color:#0f172a">
      <div style="background:linear-gradient(135deg,#00796B,#00A884);padding:24px 28px;border-radius:12px 12px 0 0">
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800">${title}</h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px">${esc(invoice.invoice_number)} · ${isPaid ? 'PAID' : 'PAYMENT DUE'}</p>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px 28px;background:#fff">
        <p style="margin:0 0 20px;color:#475569;font-size:14px">Dear ${esc(invoice.bill_to_name || billToName)},</p>
        <p style="margin:0 0 20px;color:#475569;font-size:14px">Please find your ${title.toLowerCase()} from ${esc(platform?.legal_name || 'KadeHub')} below.</p>

        <table style="width:100%;margin-bottom:20px;font-size:13px" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:50%;vertical-align:top;padding-right:12px">
              <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase">Bill From</p>
              <p style="margin:0;font-weight:700">${esc(platform?.legal_name || 'KadeHub')}</p>
              <p style="margin:4px 0 0;color:#64748b">${esc(platform?.email || '')}</p>
            </td>
            <td style="width:50%;vertical-align:top">
              <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase">Bill To</p>
              <p style="margin:0;font-weight:700">${esc(billToName)}</p>
              <p style="margin:4px 0 0;color:#64748b">${esc(invoice.bill_to_email || profile?.email || '')}</p>
            </td>
          </tr>
        </table>

        <table style="width:100%;margin-bottom:8px;font-size:12px;color:#64748b">
          <tr>
            <td><strong>Issue Date:</strong> ${fmtDate(invoice.issued_at || invoice.created_at)}</td>
            <td style="text-align:right"><strong>Due Date:</strong> ${fmtDate(invoice.due_at)}</td>
          </tr>
        </table>

        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">
          <thead>
            <tr style="background:#00796B;color:#fff">
              <th style="padding:10px 12px;text-align:left;font-size:11px">Description</th>
              <th style="padding:10px 12px;text-align:center;font-size:11px">Qty</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px">Unit Price</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px">Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <p style="text-align:right;font-size:18px;font-weight:800;color:#00796B;margin:0 0 20px">
          Total: ${fmtMoney(Number(invoice.amount), currency)}
        </p>

        ${isPaid && payment ? `
          <div style="background:#f0fdf9;border:1px solid #b2dfdb;border-radius:8px;padding:14px 16px;font-size:13px;margin-bottom:16px">
            <strong style="color:#00796B">Payment Received</strong><br/>
            Method: ${esc(payment.gateway)} · Ref: ${esc(payment.gateway_ref || '—')}<br/>
            Date: ${fmtDate(invoice.paid_at || payment.created_at)}
          </div>
        ` : `
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;font-size:13px;margin-bottom:16px">
            <strong style="color:#b45309">Payment Required</strong><br/>
            Please pay ${fmtMoney(Number(invoice.amount), currency)} using reference <strong>${esc(invoice.invoice_number)}</strong>.
          </div>
        `}

        <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6">
          Questions? Contact ${esc(platform?.email || 'official.kadehub@gmail.com')}<br/>
          KadeHub — Smart Shop Management Platform
        </p>
      </div>
    </div>
  `;
}
