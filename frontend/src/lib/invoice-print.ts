export function printInvoice(data: {
  invoice: any;
  tenant?: any;
  profile?: any;
  bank?: any;
}) {
  const { invoice, tenant, profile, bank } = data;
  const items = invoice.line_items?.length ? invoice.line_items : [{
    description: invoice.description || 'KadeHub Service',
    quantity: 1,
    unit_price: invoice.amount,
    total: invoice.amount,
  }];

  const rows = items.map((item: any) => `
    <tr>
      <td>${item.description}</td>
      <td style="text-align:center">${item.quantity ?? 1}</td>
      <td style="text-align:right">${invoice.currency} ${Number(item.unit_price ?? item.total).toLocaleString()}</td>
      <td style="text-align:right">${invoice.currency} ${Number(item.total ?? item.unit_price).toLocaleString()}</td>
    </tr>
  `).join('');

  const html = `
    <html><head><title>${invoice.invoice_number}</title><style>
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
        background:${invoice.status === 'paid' ? '#E0F2F1' : '#FFF8E1'};
        color:${invoice.status === 'paid' ? '#00796B' : '#B45309'}}
      .bank{margin-top:24px;padding:16px;background:#f0fdf9;border-radius:8px;font-size:12px}
    </style></head><body>
      <h1>KadeHub Invoice</h1>
      <p class="meta">${invoice.invoice_number} · <span class="status">${invoice.status}</span></p>
      <div class="grid">
        <div class="box">
          <h3>Bill To</h3>
          <p><strong>${invoice.bill_to_name || tenant?.name || '—'}</strong></p>
          <p>${invoice.bill_to_email || profile?.email || ''}</p>
          ${profile?.address ? `<p>${profile.address}${profile.city ? `, ${profile.city}` : ''}</p>` : ''}
        </div>
        <div class="box">
          <h3>Invoice Details</h3>
          <p><strong>Issue Date:</strong> ${invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString() : '—'}</p>
          <p><strong>Due Date:</strong> ${invoice.due_at ? new Date(invoice.due_at).toLocaleDateString() : '—'}</p>
          ${invoice.paid_at ? `<p><strong>Paid:</strong> ${new Date(invoice.paid_at).toLocaleDateString()}</p>` : ''}
          <p><strong>Type:</strong> ${String(invoice.type).replace(/_/g, ' ')}</p>
        </div>
      </div>
      <table>
        <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
        ${rows}
      </table>
      <p class="total">Total: ${invoice.currency} ${Number(invoice.amount).toLocaleString()}</p>
      ${invoice.status === 'pending' && bank ? `
        <div class="bank">
          <strong>Payment Instructions</strong><br/>
          Bank: ${bank.bank_name || '—'} · Account: ${bank.account_number || '—'}<br/>
          Name: ${bank.account_name || 'KadeHub'} · Reference: ${invoice.invoice_number}
        </div>
      ` : ''}
      <p style="margin-top:40px;font-size:11px;color:#94a3b8">KadeHub — Smart Shop Management Platform</p>
    </body></html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); win.print(); }
}
