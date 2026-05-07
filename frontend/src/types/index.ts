export interface User { id: number; name: string; role: string; tenant_id: number; }
export interface AuthState { user: User | null; token: string | null; }

export interface Product {
  id: number; name: string; barcode?: string;
  price: number; cost: number; category?: string;
  image_url?: string;
  inventory?: { quantity: number; reorder_level: number };
}

export interface CartItem { product: Product; quantity: number; }

export interface Customer { id: number; name: string; phone?: string; loyalty_points: number; created_at: string; }

export interface Sale {
  id: number; total_amount: number; discount: number;
  payment_method: string; status: string; created_at: string;
  items: { product: Product; quantity: number; price: number }[];
  customer?: Customer;
}

export interface DailySummary {
  total_sales: number; revenue: number; avg_sale: number;
  cash_count: number; card_count: number; qr_count: number;
}

export interface Supplier {
  id: number; name: string; contact_person?: string;
  phone?: string; email?: string; address?: string;
  notes?: string; is_active: boolean; created_at: string;
}

export interface PurchaseOrderItem {
  id: number; product_id: number; quantity: number;
  cost: number; received_qty: number;
  product?: Product;
}

export interface PurchaseOrder {
  id: number; supplier_id: number; status: string;
  total_amount: number; notes?: string;
  created_at: string; received_at?: string;
  supplier?: Supplier;
  items: PurchaseOrderItem[];
}

export interface Expense {
  id: number; category: string; description: string;
  amount: number; expense_date: string; created_at: string;
  u_name?: string;
}

export interface Discount {
  id: number; name: string; type: 'percentage' | 'fixed';
  value: number; min_purchase: number; is_active: boolean;
  valid_from?: string; valid_to?: string; created_at: string;
}

export interface CreditPayment {
  id: number; amount: number; payment_method: string; paid_at: string;
}

export interface CreditSale {
  id: number; sale_id: number; customer_id: number;
  amount_due: number; amount_paid: number;
  due_date?: string; status: 'outstanding' | 'partial' | 'paid';
  created_at: string;
  customer?: Customer;
  sale?: Sale;
  payments?: CreditPayment[];
}

export interface Batch {
  id: number; product_id: number; batch_number: string;
  quantity: number; cost: number;
  manufactured_date?: string; expiry_date?: string;
  created_at: string;
  product?: Product;
}

export interface Shift {
  id: number; user_id: number; opened_at: string;
  closed_at?: string; opening_cash: number;
  closing_cash?: number; notes?: string;
  user?: User;
}

export interface AuditLog {
  id: number; action: string; entity: string;
  entity_id?: number; details?: any;
  created_at: string; user_name?: string;
}
