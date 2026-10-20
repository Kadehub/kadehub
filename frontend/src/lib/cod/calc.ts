/** Cost / profit calculations — single source of truth shared by the
 *  live cost calculator (client) and any server-side computations. */

export interface CostInputs {
  buying_price: number;
  exchange_rate: number;
  shipping_cost: number;
  customs_price: number;
  other_cost: number;
  selling_price: number;
}

export interface CostBreakdown {
  buyingInLKR: number;
  landedCost: number;
  profitPerUnit: number;
  marginPercent: number;
}

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/** Landed cost = (buying × rate) + shipping + customs + other (all per unit, LKR). */
export function computeCosts(input: Partial<CostInputs>): CostBreakdown {
  const buyingInLKR = n(input.buying_price) * n(input.exchange_rate);
  const landedCost =
    buyingInLKR +
    n(input.shipping_cost) +
    n(input.customs_price) +
    n(input.other_cost);
  const profitPerUnit = n(input.selling_price) - landedCost;
  const marginPercent =
    n(input.selling_price) > 0 ? (profitPerUnit / n(input.selling_price)) * 100 : 0;

  return {
    buyingInLKR: round2(buyingInLKR),
    landedCost: round2(landedCost),
    profitPerUnit: round2(profitPerUnit),
    marginPercent: Math.round(marginPercent * 10) / 10,
  };
}

/** Margin % from an item's already-computed landed cost. */
export function marginPercent(sellingPrice: number, landedCost: number): number {
  const sp = n(sellingPrice);
  if (sp <= 0) return 0;
  return Math.round(((sp - n(landedCost)) / sp) * 1000) / 10;
}

export function round2(v: number): number {
  return Math.round((n(v) + Number.EPSILON) * 100) / 100;
}
