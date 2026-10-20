export type OrderStatus = "pending" | "confirmed" | "ongoing" | "delivered" | "returned" | "cancelled";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "ongoing",
  "delivered",
  "returned",
  "cancelled",
];

export const COST_CURRENCIES = ["LKR", "USD", "CNY"] as const;
export type CostCurrency = (typeof COST_CURRENCIES)[number];

export interface Business {
  id: number;
  name: string;
  phone: string;
  address: string;
  logo_url: string | null;
  business_type: string;
  city: string;
  tagline: string;
  brand_color: string;
  invoice_footer: string;
  /** Show currency / exchange-rate / customs fields on items. */
  imports_goods: boolean;
  created_at: string;
  updated_at: string;
}

/** COD business profile as returned by GET /api/cod/me (one per KadeHub tenant). */
export interface Profile {
  id: number;
  tenant_id: number;
  full_name: string;
  role: string;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  monthly_price_lkr: number;
  max_items: number | null;
  max_orders_per_month: number | null;
  features: string[];
  sort_order: number;
}

export interface Subscription {
  id: number;
  tenant_id: number;
  plan_id: string;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
  gateway: string | null;
  gateway_customer_id: string | null;
  gateway_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: number;
  tenant_id: number;
  name: string;
  sku: string;
  category: string;
  image_url: string | null;
  cost_currency: CostCurrency;
  buying_price: number;
  exchange_rate: number;
  shipping_cost: number;
  customs_price: number;
  other_cost: number;
  selling_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  landed_cost: number;
  profit_per_unit: number;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  tenant_id: number;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  notes: string | null;
  created_at: string;
}

export interface OrderItem {
  id: number;
  tenant_id: number;
  order_id: number;
  /** Null once the item was deleted (the line keeps its name/price snapshot). */
  item_id: number | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Order {
  id: number;
  tenant_id: number;
  invoice_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  city: string;
  status: OrderStatus;
  subtotal: number;
  delivery_charge: number;
  discount: number;
  total_amount: number;
  notes: string | null;
  stock_deducted: boolean;
  payment_type: PaymentType;
  customer_type: CustomerType;
  customer_email: string | null;
  po_number: string | null;
  tracking_number: string | null;
  confirmation_sent_at: string | null;
  created_by: number | null;
  reordered_from_order_id: number | null;
  credit_period_days: number | null;
  payment_due_date: string | null;
  credit_note: string | null;
  returned_at: string | null;
  created_at: string;
  updated_at: string;
  /** Sum of credit payments (list endpoint) */
  paid?: number;
  order_items?: OrderItem[];
}

export type PaymentType = "cod" | "pay_now" | "credit";
export const PAYMENT_TYPES: PaymentType[] = ["cod", "pay_now", "credit"];
export type CustomerType = "retail" | "wholesale";
export type PaymentMethod = "cash" | "bank" | "card" | "cheque" | "other";
export const PAYMENT_METHODS: PaymentMethod[] = ["cash", "bank", "card", "cheque", "other"];
export type CreditStatus = "paid" | "partial" | "unpaid";
export type DueBucket = "overdue" | "due" | "upcoming" | "none";

export interface CreditPayment {
  id: number;
  order_id: number;
  amount: number;
  payment_date: string;
  method: PaymentMethod;
  notes: string | null;
  created_at: string;
}

/** GET /api/cod/orders/:id */
export interface OrderDetail extends Order {
  order_items: OrderItem[];
  payments: CreditPayment[];
  credit: { total: number; paid: number; outstanding: number; status: CreditStatus; bucket: DueBucket };
  trust: { delivered: number; returned: number } | null;
  /** Set on create when the order couldn't be marked delivered for lack of stock */
  warning?: string;
}

/** One credit invoice row (GET /api/cod/credit/customers/:key). */
export interface CreditInvoice {
  order_id: number;
  invoice_number: string;
  customer_name: string;
  customer_phone: string;
  status: OrderStatus;
  created_at: string;
  payment_due_date: string | null;
  total: number;
  paid: number;
  outstanding: number;
  credit_status: CreditStatus;
  bucket: DueBucket;
  customer_key: string;
}

/** One customer on the credit page (GET /api/cod/credit). */
export interface CreditCustomer {
  key: string;
  name: string;
  phone: string;
  invoices: number;
  open_invoices: number;
  billed: number;
  collected: number;
  outstanding: number;
  overdue: number;
  next_due: string | null;
  bucket: DueBucket;
  open: { order_id: number; invoice_number: string; outstanding: number; payment_due_date: string | null }[];
}
