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
  id: string;
  owner_id: string;
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

export interface Profile {
  id: string;
  business_id: string;
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
  id: string;
  business_id: string;
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
  id: string;
  business_id: string;
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
  id: string;
  business_id: string;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  notes: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  business_id: string;
  order_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Order {
  id: string;
  business_id: string;
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
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}
