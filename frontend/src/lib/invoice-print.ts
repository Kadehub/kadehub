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
  return new Date(d).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' });
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
    onepay: 'OnePay (Card / Online)',
    card: 'Credit / Debit Card',
    paypal: 'PayPal',
    bank: 'Bank Deposit',
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

  const rows = items.map((item: any, idx: number) => `
    <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
      <td class="col-desc">
        <span class="item-title">${esc(item.description)}</span>
        ${invoice.type === 'registration_fee' && idx === 0 ? '<span class="item-sub">Includes 14-day trial access to all modules</span>' : ''}
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
  <title>${esc(invoice.invoice_number)} — KadeHub Invoice</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #0F172A;
      background: #fff;
      font-size: 13px;
      line-height: 1.5;
    }
    .page {
      max-width: 820px;
      margin: 0 auto;
      padding: 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 32px 40px 28px;
      border-bottom: 3px solid #00796B;
      background: linear-gradient(135deg, #f8fffe 0%, #ffffff 100%);
    }
    .header-left img {
      height: 44px;
      width: auto;
      object-fit: contain;
    }
    .header-right { text-align: right; }
    .invoice-title {
      font-size: 28px;
      font-weight: 800;
      color: #00796B;
      letter-spacing: -0.02em;
    }
    .invoice-number {
      font-size: 13px;
      color: #64748B;
      margin-top: 4px;
      font-family: 'Consolas', monospace;
    }
    .status-badge {
      display: inline-block;
      margin-top: 10px;
      padding: 5px 14px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      background: ${isPaid ? '#E0F2F1' : '#FEF3C7'};
      color: ${isPaid ? '#00796B' : '#B45309'};
      border: 1px solid ${isPaid ? '#B2DFDB' : '#FDE68A'};
    }
    .body { padding: 32px 40px 40px; }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 28px;
    }
    .party-box {
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 18px 20px;
      background: #FAFBFC;
    }
    .party-box.from { border-left: 4px solid #00796B; }
    .party-box.to { border-left: 4px solid #00A884; }
    .party-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #94A3B8;
      margin-bottom: 10px;
    }
    .party-name {
      font-size: 15px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 6px;
    }
    .party-line { color: #475569; font-size: 12.5px; margin-bottom: 3px; }
    .meta-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 28px;
      padding: 16px 20px;
      background: #F8FAFC;
      border-radius: 10px;
      border: 1px solid #E2E8F0;
    }
    .meta-item label {
      display: block;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94A3B8;
      margin-bottom: 4px;
    }
    .meta-item span { font-size: 12.5px; font-weight: 600; color: #1E293B; }
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
    }
    table.items thead th {
      background: #00796B;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 11px 14px;
      text-align: left;
    }
    table.items thead th.col-qty,
    table.items thead th.col-price,
    table.items thead th.col-total { text-align: right; }
    table.items tbody td {
      padding: 14px;
      border-bottom: 1px solid #E2E8F0;
      vertical-align: top;
    }
    .row-even { background: #fff; }
    .row-odd { background: #FAFBFC; }
    .col-desc { width: 50%; }
    .col-qty, .col-price, .col-total { text-align: right; white-space: nowrap; }
    .item-title { font-weight: 600; color: #1E293B; display: block; }
    .item-sub { font-size: 11px; color: #94A3B8; display: block; margin-top: 3px; }
    .totals-wrap {
      display: flex;
      justify-content: flex-end;
      margin-top: 0;
    }
    .totals {
      width: 280px;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      overflow: hidden;
      margin-top: -1px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 16px;
      font-size: 13px;
      border-bottom: 1px solid #F1F5F9;
    }
    .totals-row.grand {
      background: #00796B;
      color: #fff;
      font-size: 16px;
      font-weight: 800;
      border-bottom: none;
      padding: 14px 16px;
    }
    .payment-box {
      margin-top: 28px;
      padding: 18px 20px;
      border-radius: 10px;
      border: 1px solid ${isPaid ? '#B2DFDB' : '#FDE68A'};
      background: ${isPaid ? '#F0FDF9' : '#FFFBEB'};
    }
    .payment-box h4 {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${isPaid ? '#00796B' : '#B45309'};
      margin-bottom: 10px;
    }
    .payment-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
      font-size: 12.5px;
    }
    .payment-grid .lbl { color: #64748B; }
    .payment-grid .val { font-weight: 600; color: #1E293B; }
    .terms {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid #E2E8F0;
      font-size: 11px;
      color: #94A3B8;
      line-height: 1.7;
    }
    .footer {
      margin-top: 24px;
      padding: 20px 40px;
      background: #F8FAFC;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #64748B;
    }
    .footer strong { color: #00796B; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-left">
        ${logoUrl ? `<img src="${esc(logoUrl)}" alt="KadeHub" onerror="this.style.display='none'"/>` : ''}
        <div style="margin-top:10px;font-size:11px;color:#64748B;line-height:1.6">
          <strong style="color:#00796B;font-size:12px">${esc(platform?.legal_name || platform?.trading_name || 'KadeHub')}</strong><br/>
          ${esc(platform?.address || '')}${platform?.city ? `, ${esc(platform.city)}` : ''}<br/>
          ${esc(platform?.country || 'Sri Lanka')}
        </div>
      </div>
      <div class="header-right">
        <div class="invoice-title">${documentTitle}</div>
        <div class="invoice-number">${esc(invoice.invoice_number)}</div>
        <div class="status-badge">${statusLabel(invoice.status)}</div>
      </div>
    </div>

    <div class="body">
      <div class="parties">
        <div class="party-box from">
          <div class="party-label">Bill From</div>
          <div class="party-name">${esc(platform?.legal_name || 'KadeHub (Pvt) Ltd')}</div>
          <div class="party-line">${esc(platform?.address || '')}</div>
          <div class="party-line">${esc(platform?.city || '')}${platform?.country ? `, ${esc(platform.country)}` : ''}</div>
          ${platform?.phone ? `<div class="party-line">Tel: ${esc(platform.phone)}</div>` : ''}
          ${platform?.email ? `<div class="party-line">${esc(platform.email)}</div>` : ''}
          ${platform?.website ? `<div class="party-line">${esc(platform.website)}</div>` : ''}
          ${platform?.vat_number ? `<div class="party-line" style="margin-top:8px"><strong>VAT No:</strong> ${esc(platform.vat_number)}</div>` : ''}
          ${platform?.registration_number ? `<div class="party-line"><strong>Reg No:</strong> ${esc(platform.registration_number)}</div>` : ''}
        </div>
        <div class="party-box to">
          <div class="party-label">Bill To</div>
          <div class="party-name">${esc(billToName)}</div>
          ${contactName ? `<div class="party-line">Attn: ${esc(contactName)}</div>` : ''}
          ${profile?.address ? `<div class="party-line">${esc(profile.address)}</div>` : ''}
          ${profile?.city || profile?.country ? `<div class="party-line">${esc([profile?.city, profile?.country].filter(Boolean).join(', '))}</div>` : ''}
          <div class="party-line">${esc(invoice.bill_to_email || profile?.email || '')}</div>
          ${profile?.phone ? `<div class="party-line">Tel: ${esc(profile.phone)}</div>` : ''}
          ${profile?.tax_number ? `<div class="party-line" style="margin-top:8px"><strong>Tax / VAT No:</strong> ${esc(profile.tax_number)}</div>` : ''}
          ${tenant?.subdomain ? `<div class="party-line"><strong>Subdomain:</strong> ${esc(tenant.subdomain)}.kadehub.com</div>` : ''}
        </div>
      </div>

      <div class="meta-row">
        <div class="meta-item"><label>Issue Date</label><span>${fmtDate(invoice.issued_at || invoice.created_at)}</span></div>
        <div class="meta-item"><label>Due Date</label><span>${fmtDate(invoice.due_at)}</span></div>
        <div class="meta-item"><label>${isPaid ? 'Paid Date' : 'Payment Status'}</label><span>${isPaid ? fmtDate(invoice.paid_at) : statusLabel(invoice.status)}</span></div>
        <div class="meta-item"><label>Invoice Type</label><span>${esc(typeLabel)}</span></div>
      </div>

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

      <div class="totals-wrap">
        <div class="totals">
          <div class="totals-row"><span>Subtotal</span><span>${fmtMoney(subtotal, currency)}</span></div>
          ${vatRate > 0
            ? `<div class="totals-row"><span>VAT (${vatRate}%)</span><span>${fmtMoney(taxAmount, currency)}</span></div>`
            : `<div class="totals-row"><span>Tax</span><span>${fmtMoney(0, currency)}</span></div>`
          }
          <div class="totals-row grand"><span>Total Due</span><span>${fmtMoney(grandTotal, currency)}</span></div>
        </div>
      </div>

      <div class="payment-box">
        <h4>${isPaid ? 'Payment Confirmation' : 'Payment Instructions'}</h4>
        ${isPaid && payment ? `
          <div class="payment-grid">
            <div><span class="lbl">Payment Method</span><br/><span class="val">${esc(gatewayLabel(payment.gateway))}</span></div>
            <div><span class="lbl">Transaction Reference</span><br/><span class="val">${esc(payment.gateway_ref || '—')}</span></div>
            <div><span class="lbl">Amount Received</span><br/><span class="val">${fmtMoney(Number(payment.amount), payment.currency || currency)}</span></div>
            <div><span class="lbl">Payment Date</span><br/><span class="val">${fmtDate(invoice.paid_at || payment.created_at)}</span></div>
          </div>
        ` : bank ? `
          <div class="payment-grid">
            <div><span class="lbl">Bank</span><br/><span class="val">${esc(bank.bank_name)}</span></div>
            <div><span class="lbl">Branch</span><br/><span class="val">${esc(bank.branch || '—')}</span></div>
            <div><span class="lbl">Account Name</span><br/><span class="val">${esc(bank.account_name)}</span></div>
            <div><span class="lbl">Account Number</span><br/><span class="val">${esc(bank.account_number)}</span></div>
          </div>
          <p style="margin-top:12px;font-size:12px;color:#475569">
            Please transfer <strong>${fmtMoney(grandTotal, currency)}</strong> and use invoice number
            <strong>${esc(invoice.invoice_number)}</strong> as your payment reference.
            ${bank.instructions ? `<br/>${esc(bank.instructions)}` : ''}
          </p>
        ` : `<p style="font-size:12.5px;color:#475569">Contact ${esc(platform?.email || 'billing@kadehub.lk')} for payment options.</p>`}
      </div>

      ${invoice.notes ? `
        <div style="margin-top:20px;padding:14px 16px;background:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0;font-size:12px;color:#475569">
          <strong>Notes:</strong> ${esc(invoice.notes)}
        </div>
      ` : ''}

      <div class="terms">
        <strong>Terms &amp; Conditions</strong><br/>
        • This is a computer-generated ${isTaxInvoice ? 'tax invoice' : 'invoice'} and is valid without a signature.<br/>
        • Payment is due by the due date shown above. Late payments may result in service suspension.<br/>
        • All amounts are quoted in ${esc(currency)} unless otherwise stated.<br/>
        • For billing enquiries contact ${esc(platform?.email || 'official.kadehub@gmail.com')}.
      </div>
    </div>

    <div class="footer">
      <div>
        <strong>KadeHub</strong> — Smart Shop Management Platform<br/>
        Thank you for your business.
      </div>
      <div style="text-align:right">
        ${esc(invoice.invoice_number)}<br/>
        Generated ${fmtDate(new Date())}
      </div>
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
