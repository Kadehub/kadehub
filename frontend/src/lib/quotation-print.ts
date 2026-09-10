export function printQuotation(data: { quote: any; bank?: any }) {
  const { quote, bank } = data;
  const items = quote.line_items?.length ? quote.line_items : [{
    description: quote.description || quote.package?.name || 'KadeHub Platform Services',
    quantity: 1,
    unit_price: quote.quoted_amount,
    total: quote.quoted_amount,
  }];

  const rows = items.map((item: any) => `
    <tr>
      <td>${item.description}</td>
      <td style="text-align:center">${item.quantity ?? 1}</td>
      <td style="text-align:right">LKR ${Number(item.unit_price).toLocaleString()}</td>
      <td style="text-align:right">LKR ${Number(item.total ?? item.unit_price).toLocaleString()}</td>
    </tr>
  `).join('');

  const total = quote.quoted_amount ?? items.reduce((s: number, i: any) => s + Number(i.total ?? i.unit_price), 0);

  const html = `
    <html><head><title>${quote.quote_number}</title><style>
      body{font-family:sans-serif;padding:40px;color:#0F172A;max-width:800px;margin:0 auto}
      h1{color:#00796B;margin:0 0 4px} .meta{color:#64748B;font-size:13px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:24px 0}
      .box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px}
      .box h3{margin:0 0 8px;font-size:12px;text-transform:uppercase;color:#64748B}
      table{width:100%;border-collapse:collapse;margin-top:20px}
      td,th{padding:10px;border:1px solid #e2e8f0;text-align:left;font-size:13px}
      th{background:#f1f5f9;font-size:11px;text-transform:uppercase}
      .total{font-size:20px;font-weight:bold;color:#00796B;margin-top:16px;text-align:right}
      .status{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;
        background:#E0F2F1;color:#00796B}
      .terms{margin-top:24px;padding:16px;background:#f8fafc;border-radius:8px;font-size:12px;color:#64748B}
    </style></head><body>
      <h1>KadeHub Quotation</h1>
      <p class="meta">${quote.quote_number} · <span class="status">${quote.status}</span></p>
      <div class="grid">
        <div class="box">
          <h3>Prepared For</h3>
          <p><strong>${quote.contact_name}</strong></p>
          <p>${quote.email}</p>
          ${quote.business_type ? `<p>${quote.business_type}</p>` : ''}
          ${quote.country ? `<p>${quote.country}</p>` : ''}
        </div>
        <div class="box">
          <h3>Quote Details</h3>
          <p><strong>Date:</strong> ${new Date(quote.created_at).toLocaleDateString()}</p>
          <p><strong>Valid Until:</strong> ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : '30 days'}</p>
          ${quote.package ? `<p><strong>Plan:</strong> ${quote.package.name} (${quote.billing_cycle || 'monthly'})</p>` : ''}
        </div>
      </div>
      ${quote.description ? `<p style="margin:16px 0;font-size:13px;color:#475569"><strong>Scope:</strong> ${quote.description}</p>` : ''}
      <table>
        <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
        ${rows}
      </table>
      <p class="total">Total: LKR ${Number(total).toLocaleString()}</p>
      ${quote.notes ? `<div class="terms"><strong>Notes:</strong><br/>${quote.notes.replace(/\n/g, '<br/>')}</div>` : ''}
      <div class="terms">
        <strong>Terms & Conditions</strong><br/>
        • Quotation valid until the date shown above.<br/>
        • Registration fee is a one-time payment. Subscription billed ${quote.billing_cycle || 'monthly'}.<br/>
        ${bank ? `• Payment: ${bank.bank_name || ''} — ${bank.account_number || ''} (${bank.account_name || 'KadeHub'})` : ''}
      </div>
      <p style="margin-top:40px;font-size:11px;color:#94a3b8">KadeHub — Smart Shop Management Platform · official.kadehub@gmail.com</p>
    </body></html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); win.print(); }
}
