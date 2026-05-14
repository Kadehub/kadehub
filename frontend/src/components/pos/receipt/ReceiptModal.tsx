'use client';
import { useRef } from 'react';
import { LKR } from '../../../lib/format';
import { Printer, Download, X, ShoppingBag, Store, FileText, MessageCircle } from 'lucide-react';

export interface ReceiptData {
  id: number;
  created_at: string;
  payment_method: string;
  total_amount: number;
  discount: number;
  items: { product: { name: string; category?: string }; quantity: number; price: number }[];
  user?: { name: string };
  customer?: { name: string; phone?: string; loyalty_points?: number };
  company?: {
    name: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    logo_url?: string;
    tax_number?: string;
  };
}

type ReceiptType = 'buyer' | 'seller' | 'order';

interface Props {
  data: ReceiptData;
  onClose: () => void;
}

export default function ReceiptModal({ data, onClose }: Props) {
  const buyerRef  = useRef<HTMLDivElement>(null);
  const sellerRef = useRef<HTMLDivElement>(null);
  const orderRef  = useRef<HTMLDivElement>(null);

  const subtotal = data.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const date = new Date(data.created_at);
  const dateStr = date.toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });

  const print = (ref: React.RefObject<HTMLDivElement>, title: string) => {
    const content = ref.current?.innerHTML;
    if (!content) return;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:420px;height:700px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head>
      <title>${title} — Sale #${data.id}</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>* { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: 'Poppins', sans-serif; background: white; color: #0F172A; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }</style>
    </head><body>${content}</body></html>`);
    doc.close();
    iframe.onload = () => {
      iframe.contentWindow!.focus();
      iframe.contentWindow!.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    };
  };

  const download = (ref: React.RefObject<HTMLDivElement>, filename: string) => {
    const content = ref.current?.innerHTML;
    if (!content) return;
    const blob = new Blob([`
      <!DOCTYPE html><html>
      <head>
        <meta charset="utf-8">
        <title>${filename}</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>* { box-sizing: border-box; } body { font-family: 'Poppins', sans-serif; background: white; color: #0F172A; }</style>
      </head>
      <body>${content}</body></html>
    `], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.html`;
    a.click();
  };

  const company = data.company || { name: 'KadeHub Shop' };

  const shareWhatsApp = () => {
    const subtotal = data.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const lines = [
      `🧾 *Receipt #${data.id}* — ${company.name}`,
      `📅 ${dateStr} at ${timeStr}`,
      ``,
      ...data.items.map(i => `• ${i.product.name}  ×${i.quantity}  ${LKR(i.price * i.quantity)}`),
      ``,
      data.discount > 0 ? `Discount: -${LKR(data.discount)}` : null,
      `*Total: ${LKR(data.total_amount)}*`,
      `Payment: ${data.payment_method}`,
      data.customer ? `Customer: ${data.customer.name}` : null,
      ``,
      `_Powered by KadeHub_`,
    ].filter(Boolean).join('\n');
    const phone = data.customer?.phone?.replace(/\D/g, '') || '';
    window.open(`https://wa.me/${phone ? `94${phone.slice(-9)}` : ''}?text=${encodeURIComponent(lines)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-modal overflow-hidden animate-slide-up flex flex-col"
        style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#E0F2F1' }}>
              <FileText size={18} style={{ color: '#00A884' }} />
            </div>
            <div>
              <h2 className="font-bold text-ink-900">Sale #{data.id} — Bills & Receipts</h2>
              <p className="text-xs text-ink-400">{dateStr} at {timeStr}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ink-100 text-ink-400 hover:text-ink-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* 3 receipt panels */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* 1 — Buyer Receipt */}
            <ReceiptPanel
              title="Customer Receipt"
              subtitle="Give to buyer"
              icon={ShoppingBag}
              color="#00A884"
              onPrint={() => print(buyerRef, 'Customer Receipt')}
              onDownload={() => download(buyerRef, `receipt-buyer-${data.id}`)}>
              <BuyerReceipt ref={buyerRef} data={data} company={company} subtotal={subtotal} dateStr={dateStr} timeStr={timeStr} />
            </ReceiptPanel>

            {/* 2 — Seller Copy */}
            <ReceiptPanel
              title="Seller Copy"
              subtitle="Keep for records"
              icon={Store}
              color="#FF7A00"
              onPrint={() => print(sellerRef, 'Seller Copy')}
              onDownload={() => download(sellerRef, `receipt-seller-${data.id}`)}>
              <SellerReceipt ref={sellerRef} data={data} company={company} subtotal={subtotal} dateStr={dateStr} timeStr={timeStr} />
            </ReceiptPanel>

            {/* 3 — Purchase Order */}
            <ReceiptPanel
              title="Purchase Order"
              subtitle="For restocking / supplier"
              icon={FileText}
              color="#2563EB"
              onPrint={() => print(orderRef, 'Purchase Order')}
              onDownload={() => download(orderRef, `purchase-order-${data.id}`)}>
              <PurchaseOrder ref={orderRef} data={data} company={company} subtotal={subtotal} dateStr={dateStr} timeStr={timeStr} />
            </ReceiptPanel>

          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-ink-100 flex items-center justify-between bg-ink-50">
          <div className="flex items-center gap-2">
            <p className="text-xs text-ink-400">Sale completed · {data.payment_method} · {LKR(data.total_amount)}</p>
            <button onClick={shareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: '#E7F9EF', color: '#25D366' }}
              title="Share via WhatsApp">
              <MessageCircle size={13} />
              WhatsApp
            </button>
          </div>
          <button onClick={onClose} className="kh-btn-primary px-5 py-2 rounded-xl text-sm">Done</button>
        </div>
      </div>
    </div>
  );
}

// ── Panel wrapper ──
function ReceiptPanel({ title, subtitle, icon: Icon, color, onPrint, onDownload, children }: {
  title: string; subtitle: string; icon: any; color: string;
  onPrint: () => void; onDownload: () => void; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-ink-200 overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100"
        style={{ background: color + '10' }}>
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color }} />
          <div>
            <p className="text-sm font-bold text-ink-800">{title}</p>
            <p className="text-2xs text-ink-400">{subtitle}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={onPrint} title="Print"
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-ink-200 bg-white hover:bg-ink-50 transition-colors">
            <Printer size={13} style={{ color }} />
          </button>
          <button onClick={onDownload} title="Download"
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-ink-200 bg-white hover:bg-ink-50 transition-colors">
            <Download size={13} style={{ color }} />
          </button>
        </div>
      </div>
      {/* Receipt preview */}
      <div className="flex-1 overflow-y-auto bg-white p-1" style={{ maxHeight: '480px' }}>
        {children}
      </div>
    </div>
  );
}

// ── Shared receipt styles (inline for print compatibility) ──
const S = {
  page:      { fontFamily: "'Poppins', sans-serif", padding: '20px', maxWidth: '320px', margin: '0 auto', color: '#0F172A', fontSize: '12px' },
  logo:      { textAlign: 'center' as const, marginBottom: '12px' },
  shopName:  { fontSize: '16px', fontWeight: '700', color: '#00A884', textAlign: 'center' as const },
  address:   { fontSize: '10px', color: '#64748B', textAlign: 'center' as const, marginTop: '2px' },
  divider:   { borderTop: '1px dashed #CBD5E1', margin: '10px 0' },
  dividerSolid: { borderTop: '2px solid #0F172A', margin: '10px 0' },
  row:       { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
  label:     { color: '#64748B', fontSize: '11px' },
  value:     { fontWeight: '600', fontSize: '11px' },
  itemName:  { fontWeight: '600', fontSize: '11px', marginBottom: '2px' },
  itemSub:   { color: '#64748B', fontSize: '10px' },
  total:     { display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '14px', marginTop: '8px' },
  totalAmt:  { color: '#00A884', fontSize: '16px', fontWeight: '800' },
  badge:     { display: 'inline-block', padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: '700', background: '#E0F2F1', color: '#00796B' },
  footer:    { textAlign: 'center' as const, fontSize: '10px', color: '#94A3B8', marginTop: '16px' },
  title:     { fontSize: '13px', fontWeight: '700', textAlign: 'center' as const, marginBottom: '8px', textTransform: 'uppercase' as const, letterSpacing: '1px' },
};

// ── 1. Buyer Receipt ──
import { forwardRef } from 'react';

const BuyerReceipt = forwardRef<HTMLDivElement, { data: ReceiptData; company: any; subtotal: number; dateStr: string; timeStr: string }>(
  ({ data, company, subtotal, dateStr, timeStr }, ref) => (
    <div ref={ref} style={S.page}>
      {/* Header */}
      <div style={S.logo}>
        {company.logo_url && <img src={company.logo_url} alt="logo" style={{ height: '40px', margin: '0 auto 6px', display: 'block' }} />}
        <div style={S.shopName}>{company.name}</div>
        {company.address && <div style={S.address}>{company.address}{company.city ? `, ${company.city}` : ''}</div>}
        {company.phone && <div style={S.address}>Tel: {company.phone}</div>}
        {company.tax_number && <div style={S.address}>VAT: {company.tax_number}</div>}
      </div>

      <div style={S.dividerSolid} />
      <div style={S.title}>Customer Receipt</div>

      {/* Sale info */}
      <div style={{ marginBottom: '8px' }}>
        <div style={S.row}><span style={S.label}>Receipt #</span><span style={S.value}>{data.id}</span></div>
        <div style={S.row}><span style={S.label}>Date</span><span style={S.value}>{dateStr}</span></div>
        <div style={S.row}><span style={S.label}>Time</span><span style={S.value}>{timeStr}</span></div>
        <div style={S.row}><span style={S.label}>Cashier</span><span style={S.value}>{data.user?.name || '—'}</span></div>
        {data.customer && <div style={S.row}><span style={S.label}>Customer</span><span style={S.value}>{data.customer.name}</span></div>}
      </div>

      <div style={S.divider} />

      {/* Items */}
      {data.items.map((item, i) => (
        <div key={i} style={{ marginBottom: '6px' }}>
          <div style={S.itemName}>{item.product.name}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={S.itemSub}>{item.quantity} × {LKR(item.price)}</span>
            <span style={S.value}>{LKR(item.price * item.quantity)}</span>
          </div>
        </div>
      ))}

      <div style={S.divider} />

      {/* Totals */}
      <div style={S.row}><span style={S.label}>Subtotal</span><span style={S.value}>{LKR(subtotal)}</span></div>
      {data.discount > 0 && <div style={S.row}><span style={S.label}>Discount</span><span style={{ ...S.value, color: '#FF6B6B' }}>-{LKR(data.discount)}</span></div>}
      <div style={S.total}><span>TOTAL</span><span style={S.totalAmt}>{LKR(data.total_amount)}</span></div>

      <div style={{ ...S.row, marginTop: '8px' }}>
        <span style={S.label}>Payment</span>
        <span style={S.badge}>{data.payment_method}</span>
      </div>

      {data.customer?.loyalty_points !== undefined && (
        <div style={{ ...S.row, marginTop: '4px' }}>
          <span style={S.label}>Loyalty Points</span>
          <span style={{ ...S.value, color: '#FF7A00' }}>★ {data.customer.loyalty_points}</span>
        </div>
      )}

      <div style={S.divider} />
      <div style={S.footer}>
        <div>Thank you for shopping with us!</div>
        <div style={{ marginTop: '4px' }}>Powered by KadeHub</div>
      </div>
    </div>
  )
);
BuyerReceipt.displayName = 'BuyerReceipt';

// ── 2. Seller Copy ──
const SellerReceipt = forwardRef<HTMLDivElement, { data: ReceiptData; company: any; subtotal: number; dateStr: string; timeStr: string }>(
  ({ data, company, subtotal, dateStr, timeStr }, ref) => (
    <div ref={ref} style={S.page}>
      <div style={S.logo}>
        <div style={S.shopName}>{company.name}</div>
        {company.address && <div style={S.address}>{company.address}</div>}
      </div>

      <div style={S.dividerSolid} />
      <div style={{ ...S.title, color: '#FF7A00' }}>Seller Copy — Internal Record</div>

      <div style={{ marginBottom: '8px' }}>
        <div style={S.row}><span style={S.label}>Sale ID</span><span style={S.value}>#{data.id}</span></div>
        <div style={S.row}><span style={S.label}>Date & Time</span><span style={S.value}>{dateStr} {timeStr}</span></div>
        <div style={S.row}><span style={S.label}>Cashier</span><span style={S.value}>{data.user?.name || '—'}</span></div>
        <div style={S.row}><span style={S.label}>Customer</span><span style={S.value}>{data.customer?.name || 'Walk-in'}</span></div>
        <div style={S.row}><span style={S.label}>Payment</span><span style={S.value}>{data.payment_method}</span></div>
      </div>

      <div style={S.divider} />

      {/* Items with cost margin info */}
      <div style={{ ...S.label, marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase' as const }}>Items Sold</div>
      {data.items.map((item, i) => (
        <div key={i} style={{ marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={S.itemName}>{item.product.name}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={S.itemSub}>Qty: {item.quantity} × {LKR(item.price)}</span>
            <span style={S.value}>{LKR(item.price * item.quantity)}</span>
          </div>
          {item.product.category && <div style={{ ...S.itemSub, marginTop: '1px' }}>Category: {item.product.category}</div>}
        </div>
      ))}

      <div style={S.divider} />

      <div style={S.row}><span style={S.label}>Subtotal</span><span style={S.value}>{LKR(subtotal)}</span></div>
      {data.discount > 0 && <div style={S.row}><span style={S.label}>Discount Applied</span><span style={{ ...S.value, color: '#FF6B6B' }}>-{LKR(data.discount)}</span></div>}
      <div style={S.total}><span>NET TOTAL</span><span style={S.totalAmt}>{LKR(data.total_amount)}</span></div>

      <div style={S.divider} />
      <div style={{ ...S.footer, color: '#94A3B8' }}>
        <div>SELLER COPY — NOT FOR CUSTOMER</div>
        <div>KadeHub POS System</div>
      </div>
    </div>
  )
);
SellerReceipt.displayName = 'SellerReceipt';

// ── 3. Purchase / Restock Order ──
const PurchaseOrder = forwardRef<HTMLDivElement, { data: ReceiptData; company: any; subtotal: number; dateStr: string; timeStr: string }>(
  ({ data, company, subtotal, dateStr, timeStr }, ref) => (
    <div ref={ref} style={{ ...S.page, maxWidth: '360px' }}>
      <div style={S.logo}>
        <div style={S.shopName}>{company.name}</div>
        {company.address && <div style={S.address}>{company.address}{company.city ? `, ${company.city}` : ''}</div>}
        {company.phone && <div style={S.address}>Tel: {company.phone}</div>}
      </div>

      <div style={S.dividerSolid} />
      <div style={{ ...S.title, color: '#2563EB' }}>Restock / Purchase Order</div>
      <div style={{ ...S.address, marginBottom: '8px' }}>Based on Sale #{data.id} — {dateStr}</div>

      {/* Order details */}
      <div style={{ marginBottom: '8px' }}>
        <div style={S.row}><span style={S.label}>Order Date</span><span style={S.value}>{dateStr}</span></div>
        <div style={S.row}><span style={S.label}>Prepared By</span><span style={S.value}>{data.user?.name || '—'}</span></div>
        <div style={S.row}><span style={S.label}>Reference Sale</span><span style={S.value}>#{data.id}</span></div>
      </div>

      <div style={S.divider} />

      {/* Items to reorder */}
      <div style={{ ...S.label, marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase' as const }}>
        Items to Reorder
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #CBD5E1' }}>
            <th style={{ textAlign: 'left', padding: '4px 2px', color: '#64748B', fontWeight: '600' }}>Product</th>
            <th style={{ textAlign: 'center', padding: '4px 2px', color: '#64748B', fontWeight: '600' }}>Sold</th>
            <th style={{ textAlign: 'center', padding: '4px 2px', color: '#64748B', fontWeight: '600' }}>Order Qty</th>
            <th style={{ textAlign: 'right', padding: '4px 2px', color: '#64748B', fontWeight: '600' }}>Unit Price</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
              <td style={{ padding: '5px 2px', fontWeight: '600' }}>{item.product.name}</td>
              <td style={{ padding: '5px 2px', textAlign: 'center', color: '#64748B' }}>{item.quantity}</td>
              <td style={{ padding: '5px 2px', textAlign: 'center' }}>
                <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                  {item.quantity * 2}
                </span>
              </td>
              <td style={{ padding: '5px 2px', textAlign: 'right', fontWeight: '600' }}>{LKR(item.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={S.divider} />

      <div style={S.row}>
        <span style={S.label}>Estimated Restock Cost</span>
        <span style={{ ...S.value, color: '#2563EB' }}>{LKR(subtotal * 0.75)}</span>
      </div>
      <div style={{ ...S.address, marginTop: '4px' }}>*Estimated at 75% of selling price</div>

      <div style={S.divider} />

      {/* Signature lines */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        {['Prepared By', 'Approved By', 'Supplier Sign'].map(label => (
          <div key={label} style={{ textAlign: 'center' as const, flex: 1 }}>
            <div style={{ borderTop: '1px solid #CBD5E1', paddingTop: '4px', fontSize: '9px', color: '#94A3B8' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ ...S.footer, marginTop: '16px' }}>
        <div>KadeHub Smart Shop Platform</div>
        <div>Generated: {dateStr} {timeStr}</div>
      </div>
    </div>
  )
);
PurchaseOrder.displayName = 'PurchaseOrder';
