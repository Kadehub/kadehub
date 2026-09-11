type InvoicePrintData = {
  invoice: any;
  tenant?: any;
  profile?: any;
  bank?: any;
  platform?: any;
  payment?: any;
};

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtMoney(amount: number, currency = 'LKR'): string {
  return `${currency} ${Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    paid: 'PAID',
    pending: 'PAYMENT DUE',
    cancelled: 'CANCELLED',
    overdue: 'OVERDUE',
  };
  return map[status] || status.toUpperCase();
}

function gatewayLabel(gateway?: string): string {
  const map: Record<string, string> = {
    bank_transfer: 'Bank Transfer',
    onepay: 'OnePay',
    card: 'Card',
    paypal: 'PayPal',
    bank: 'Bank',
  };
  return map[gateway || ''] || gateway || '—';
}

export function printInvoice(data: InvoicePrintData) {
  const { invoice, tenant, profile, bank, platform, payment } = data;
  const currency = invoice.currency || 'LKR';
  const vatRate = Number(platform?.vat_rate ?? 0);

  const items = invoice.line_items?.length ? invoice.line_items : [{
    description: invoice.description || 'KadeHub Platform Service',
    quantity: 1,
    unit_price: invoice.amount,
    total: invoice.amount,
  }];

  const subtotal = items.reduce(
    (sum: number, i: any) => sum + Number(i.total ?? (i.quantity ?? 1) * i.unit_price),
    0,
  );
  const taxAmount = vatRate > 0 ? Math.round(subtotal * vatRate) / 100 : 0;
  const grandTotal = invoice.amount ?? subtotal + taxAmount;

  const logoUrl = platform?.logo_url
    || (typeof window !== 'undefined' ? `${window.location.origin}/logo-primary.png` : '');

  const billToName = tenant?.name || invoice.bill_to_name || '—';
  const contactName = invoice.bill_to_name && tenant?.name && invoice.bill_to_name !== tenant.name
    ? invoice.bill_to_name
    : null;

  const rows = items.map((item: any) => `
    <tr>
      <td class="col-desc">
        <span class="item-title">${esc(item.description)}</span>
        ${invoice.type === 'registration_fee' ? '<span class="item-sub">Includes 14-day trial · all modules</span>' : ''}
      </td>
      <td class="col-qty">${item.quantity ?? 1}</td>
      <td class="col-price">${fmtMoney(Number(item.unit_price ?? item.total), currency)}</td>
      <td class="col-total">${fmtMoney(Number(item.total ?? item.unit_price), currency)}</td>
    </tr>
  `).join('');

  const isPaid = invoice.status === 'paid';
  const typeLabel = String(invoice.type || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  const isTaxInvoice = vatRate > 0 || Boolean(platform?.vat_number?.trim());
  const documentTitle = isTaxInvoice ? 'TAX INVOICE' : 'INVOICE';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${esc(invoice.invoice_number)}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      color: #0F172A;
      background: #fff;
      font-size: 10px;
      line-height: 1.35;
    }
    .page {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      margin-bottom: 10px;
      border-bottom: 2px solid #00796B;
    }
    .header-left { display: flex; align-items: center; gap: 10px; }
    .header-left img { height: 32px; width: auto; object-fit: contain; }
    .header-co { font-size: 9px; color: #64748B; line-height: 1.4; }
    .header-co strong { color: #00796B; font-size: 10px; display: block; }
    .header-right { text-align: right; }
    .invoice-title { font-size: 20px; font-weight: 800; color: #00796B; line-height: 1.1; }
    .invoice-number { font-size: 10px; color: #64748B; font-family: Consolas, monospace; margin-top: 2px; }
    .status-badge {
      display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 10px;
      font-size: 9px; font-weight: 700; letter-spacing: 0.05em;
      background: ${isPaid ? '#E0F2F1' : '#FEF3C7'}; color: ${isPaid ? '#00796B' : '#B45309'};
      border: 1px solid ${isPaid ? '#B2DFDB' : '#FDE68A'};
    }
    .parties {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;
    }
    .party-box {
      border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; background: #FAFBFC;
    }
    .party-box.from { border-left: 3px solid #00796B; }
    .party-box.to { border-left: 3px solid #00A884; }
    .party-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94A3B8; margin-bottom: 4px; }
    .party-name { font-size: 11px; font-weight: 700; color: #0F172A; margin-bottom: 2px; }
    .party-line { color: #475569; font-size: 9px; margin-bottom: 1px; }
    .meta-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
      margin-bottom: 10px; padding: 6px 10px; background: #F8FAFC;
      border-radius: 6px; border: 1px solid #E2E8F0;
    }
    .meta-item label { display: block; font-size: 7px; font-weight: 700; text-transform: uppercase; color: #94A3B8; margin-bottom: 1px; }
    .meta-item span { font-size: 9px; font-weight: 600; color: #1E293B; }
    .items-section { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 8px; }
    .items-section table { flex: 1; }
    table.items { width: 100%; border-collapse: collapse; }
    table.items thead th {
      background: #00796B; color: #fff; font-size: 8px; font-weight: 700;
      text-transform: uppercase; padding: 5px 8px; text-align: left;
    }
    table.items thead th.col-qty, table.items thead th.col-price, table.items thead th.col-total { text-align: right; }
    table.items tbody td { padding: 6px 8px; border-bottom: 1px solid #E2E8F0; vertical-align: top; font-size: 9px; }
    .col-desc { width: 48%; }
    .col-qty, .col-price, .col-total { text-align: right; white-space: nowrap; }
    .item-title { font-weight: 600; color: #1E293B; }
    .item-sub { font-size: 8px; color: #94A3B8; display: block; }
    .totals {
      width: 155px; flex-shrink: 0; border: 1px solid #E2E8F0; border-radius: 6px; overflow: hidden;
    }
    .totals-row {
      display: flex; justify-content: space-between; padding: 4px 8px;
      font-size: 9px; border-bottom: 1px solid #F1F5F9;
    }
    .totals-row.grand {
      background: #00796B; color: #fff; font-size: 11px; font-weight: 800;
      border-bottom: none; padding: 6px 8px;
    }
    .payment-box {
      margin-bottom: 8px; padding: 7px 10px; border-radius: 6px;
      border: 1px solid ${isPaid ? '#B2DFDB' : '#FDE68A'};
      background: ${isPaid ? '#F0FDF9' : '#FFFBEB'};
    }
    .payment-box h4 {
      font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
      color: ${isPaid ? '#00796B' : '#B45309'}; margin-bottom: 5px;
    }
    .payment-inline {
      display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 9px;
    }
    .payment-inline span { color: #64748B; }
    .payment-inline strong { color: #1E293B; }
    .terms {
      font-size: 8px; color: #94A3B8; line-height: 1.45;
      padding-top: 6px; border-top: 1px solid #E2E8F0; margin-bottom: 6px;
    }
    .footer {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 8px; color: #64748B; padding-top: 4px;
    }
    .footer strong { color: #00796B; }
    @media print {
      html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { max-width: none; page-break-after: avoid; page-break-inside: avoid; }
      .header, .parties, .meta-row, .items-section, .payment-box, .terms, .footer {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-left">
        ${logoUrl ? `<img src="${esc(logoUrl)}" alt="KadeHub" onerror="this.style.display='none'"/>` : ''}
        <div class="header-co">
          <strong>${esc(platform?.legal_name || platform?.trading_name || 'KadeHub')}</strong>
          ${esc(platform?.address || '')}${platform?.city ? `, ${esc(platform.city)}` : ''}, ${esc(platform?.country || 'Sri Lanka')}
        </div>
      </div>
      <div class="header-right">
        <div class="invoice-title">${documentTitle}</div>
        <div class="invoice-number">${esc(invoice.invoice_number)}</div>
        <div class="status-badge">${statusLabel(invoice.status)}</div>
      </div>
    </div>

    <div class="parties">
      <div class="party-box from">
        <div class="party-label">Bill From</div>
        <div class="party-name">${esc(platform?.legal_name || 'KadeHub (Pvt) Ltd')}</div>
        <div class="party-line">${esc(platform?.address || '')}, ${esc(platform?.city || '')}</div>
        ${platform?.phone ? `<div class="party-line">Tel: ${esc(platform.phone)}</div>` : ''}
        ${platform?.email ? `<div class="party-line">${esc(platform.email)}</div>` : ''}
        ${platform?.vat_number ? `<div class="party-line"><strong>VAT:</strong> ${esc(platform.vat_number)}</div>` : ''}
        ${platform?.registration_number ? `<div class="party-line"><strong>Reg:</strong> ${esc(platform.registration_number)}</div>` : ''}
      </div>
      <div class="party-box to">
        <div class="party-label">Bill To</div>
        <div class="party-name">${esc(billToName)}</div>
        ${contactName ? `<div class="party-line">Attn: ${esc(contactName)}</div>` : ''}
        ${profile?.address ? `<div class="party-line">${esc(profile.address)}${profile?.city ? `, ${esc(profile.city)}` : ''}</div>` : ''}
        <div class="party-line">${esc(invoice.bill_to_email || profile?.email || '')}</div>
        ${profile?.phone ? `<div class="party-line">Tel: ${esc(profile.phone)}</div>` : ''}
        ${tenant?.subdomain ? `<div class="party-line">${esc(tenant.subdomain)}.kadehub.com</div>` : ''}
      </div>
    </div>

    <div class="meta-row">
      <div class="meta-item"><label>Issue Date</label><span>${fmtDate(invoice.issued_at || invoice.created_at)}</span></div>
      <div class="meta-item"><label>Due Date</label><span>${fmtDate(invoice.due_at)}</span></div>
      <div class="meta-item"><label>${isPaid ? 'Paid Date' : 'Status'}</label><span>${isPaid ? fmtDate(invoice.paid_at) : statusLabel(invoice.status)}</span></div>
      <div class="meta-item"><label>Type</label><span>${esc(typeLabel)}</span></div>
    </div>

    <div class="items-section">
      <table class="items">
        <thead>
          <tr>
            <th class="col-desc">Description</th>
            <th class="col-qty">Qty</th>
            <th class="col-price">Unit Price</th>
            <th class="col-total">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totals">
        <div class="totals-row"><span>Subtotal</span><span>${fmtMoney(subtotal, currency)}</span></div>
        <div class="totals-row"><span>${vatRate > 0 ? `VAT (${vatRate}%)` : 'Tax'}</span><span>${fmtMoney(vatRate > 0 ? taxAmount : 0, currency)}</span></div>
        <div class="totals-row grand"><span>Total</span><span>${fmtMoney(grandTotal, currency)}</span></div>
      </div>
    </div>

    <div class="payment-box">
      <h4>${isPaid ? 'Payment Confirmation' : 'Payment Instructions'}</h4>
      ${isPaid && payment ? `
        <div class="payment-inline">
          <div><span>Method: </span><strong>${esc(gatewayLabel(payment.gateway))}</strong></div>
          <div><span>Ref: </span><strong>${esc(payment.gateway_ref || '—')}</strong></div>
          <div><span>Amount: </span><strong>${fmtMoney(Number(payment.amount), payment.currency || currency)}</strong></div>
          <div><span>Date: </span><strong>${fmtDate(invoice.paid_at || payment.created_at)}</strong></div>
        </div>
      ` : bank ? `
        <div class="payment-inline">
          <div><span>Bank: </span><strong>${esc(bank.bank_name)}</strong></div>
          <div><span>Acc: </span><strong>${esc(bank.account_number)}</strong></div>
          <div><span>Name: </span><strong>${esc(bank.account_name)}</strong></div>
          <div><span>Ref: </span><strong>${esc(invoice.invoice_number)}</strong></div>
        </div>
      ` : `<div class="payment-inline">Contact ${esc(platform?.email || 'official.kadehub@gmail.com')}</div>`}
    </div>

    ${invoice.notes ? `<div style="font-size:8px;color:#64748B;margin-bottom:6px"><strong>Notes:</strong> ${esc(invoice.notes)}</div>` : ''}

    <div class="terms">
      Computer-generated ${isTaxInvoice ? 'tax invoice' : 'invoice'} · valid without signature ·
      Payment due by due date · Amounts in ${esc(currency)} ·
      Enquiries: ${esc(platform?.email || 'official.kadehub@gmail.com')}
    </div>

    <div class="footer">
      <div><strong>KadeHub</strong> — Smart Shop Management · Thank you for your business.</div>
      <div>${esc(invoice.invoice_number)} · ${fmtDate(new Date())}</div>
    </div>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }
}
