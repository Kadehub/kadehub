/** Data behind an invoice. The document itself is drawn by `invoice-render.ts`
 *  and turned into a PDF by `canvasesToPdf` in `canvas-doc.ts`. */
export interface InvoicePdfData {
  business: {
    name: string;
    phone: string;
    address: string;
    /** Optional branding — omitted fields fall back to the plain look. */
    tagline?: string;
    footer?: string;
    brand_color?: string;
  };
  invoice_number: string;
  created_at: string;
  /** Order status key: pending | ongoing | delivered | cancelled. */
  status: string;
  customer: { name: string; phone: string; address: string; city: string };
  lines: { name: string; quantity: number; unit_price: number; line_total: number }[];
  subtotal: number;
  delivery_charge: number;
  discount: number;
  total_amount: number;
  notes: string | null;
}

export function invoiceFileName(invoiceNumber: string): string {
  return `${invoiceNumber.replace(/[^\w-]/g, "_")}.pdf`;
}
