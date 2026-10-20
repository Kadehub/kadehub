import {
  Truck, Ship, Landmark, Megaphone, Users, Home, Package, Zap, Plane, Shapes, MoreHorizontal,
  User, TrendingUp, Wine, Dumbbell, PartyPopper, Car, Fuel, Wallet, type LucideIcon,
} from 'lucide-react';

/** One icon per business category (Business Tour = plane). Unknown/older categories fall back to a wallet. */
export const BUSINESS_ICONS: Record<string, LucideIcon> = {
  Supplier: Truck, Shipping: Ship, Customs: Landmark, Advertising: Megaphone, Salary: Users, Rent: Home,
  Packaging: Package, Utilities: Zap, 'Business Tour': Plane, Misc: Shapes, Other: MoreHorizontal,
};

export const PERSONAL_ICONS: Record<string, LucideIcon> = {
  Personal: User, Investment: TrendingUp, Alcohol: Wine, Sports: Dumbbell, Outings: PartyPopper,
  PickMe: Car, Fuel: Fuel, Other: Shapes,
};

export function categoryIcon(kind: 'business' | 'personal', category: string): LucideIcon {
  return (kind === 'business' ? BUSINESS_ICONS : PERSONAL_ICONS)[category] ?? Wallet;
}
