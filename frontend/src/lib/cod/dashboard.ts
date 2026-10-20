/** Shape of GET /api/cod/dashboard → model. Computed server-side (backend/src/modules/cod/cod-analytics.ts)
 *  so locked (non-Premium) sections never carry real figures. */
import type { Item, Order } from "@/lib/cod/types";

export interface DashboardModel {
  revenue: number;
  cogs: number;
  expensesTotal: number;
  netProfit: number;
  codPipelineValue: number;
  codPipelineCount: number;
  inventoryValue: number;
  lowStockCount: number;
  ordersByStatus: { status: string; count: number }[];
  monthly: { key: string; label: string; revenue: number; expenses: number }[];
  topItems: { name: string; qty: number; revenue: number }[];
  recentOrders: Order[];
  lowStockItems: Item[];
}

/** GET /api/cod/reports → report */
export interface ReportModel {
  revenue: number;
  cogs: number;
  grossProfit: number;
  expensesTotal: number;
  netProfit: number;
  statusCounts: { status: string; count: number }[];
  expenseByCategory: { category: string; amount: number }[];
  monthly: { key: string; label: string; revenue: number; expenses: number; net: number }[];
}
