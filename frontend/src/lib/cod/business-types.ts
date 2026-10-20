import type { MessageKey } from "@/lib/cod/i18n/messages/en";
import type { Translator } from "@/lib/cod/i18n/translator";

/** Business-type presets. A business picks one at registration (changeable in
 *  Settings) and the app adapts: what it calls its stock, which categories it
 *  suggests, which expense categories it offers, and whether it needs the
 *  import-cost fields (currency / exchange rate / customs). */

export interface BusinessTypePreset {
  key: string;
  label: string;
  blurb: string;
  /** Default accent colour for the app, invoices and catalogs. */
  color: string;
  itemSingular: string;
  itemPlural: string;
  /** Default title of a generated catalog. */
  catalogTitle: string;
  /** Whether businesses of this type typically import stock. */
  importsGoods: boolean;
  itemCategories: readonly string[];
  /** Extra expense categories on top of the common ones. */
  expenseExtras: readonly string[];
}

export const BUSINESS_TYPES = [
  {
    key: "fashion",
    label: "Fashion & Clothing",
    blurb: "Clothes, shoes, bags",
    color: "#be123c",
    itemSingular: "Product",
    itemPlural: "Products",
    catalogTitle: "Product Catalog",
    importsGoods: true,
    itemCategories: ["Men", "Women", "Kids", "Shoes", "Bags", "Accessories"],
    expenseExtras: ["Tailoring", "Photography"],
  },
  {
    key: "electronics",
    label: "Electronics & Gadgets",
    blurb: "Phones, accessories, appliances",
    color: "#1d4ed8",
    itemSingular: "Product",
    itemPlural: "Products",
    catalogTitle: "Product Catalog",
    importsGoods: true,
    itemCategories: ["Phones", "Chargers & Cables", "Audio", "Smart Watches", "Computer Accessories", "Appliances"],
    expenseExtras: ["Warranty & Repairs"],
  },
  {
    key: "beauty",
    label: "Beauty & Cosmetics",
    blurb: "Skincare, makeup, hair care",
    color: "#7e22ce",
    itemSingular: "Product",
    itemPlural: "Products",
    catalogTitle: "Beauty Catalog",
    importsGoods: true,
    itemCategories: ["Skincare", "Makeup", "Hair Care", "Fragrance", "Body Care", "Tools"],
    expenseExtras: ["Samples", "Photography"],
  },
  {
    key: "food",
    label: "Food & Bakery",
    blurb: "Cakes, meals, snacks",
    color: "#c2410c",
    itemSingular: "Menu item",
    itemPlural: "Menu items",
    catalogTitle: "Menu",
    importsGoods: false,
    itemCategories: ["Cakes", "Cupcakes", "Meals", "Snacks", "Beverages", "Desserts"],
    expenseExtras: ["Ingredients", "Gas & Fuel"],
  },
  {
    key: "grocery",
    label: "Grocery & Essentials",
    blurb: "Everyday goods, spices, produce",
    color: "#15803d",
    itemSingular: "Product",
    itemPlural: "Products",
    catalogTitle: "Price List",
    importsGoods: false,
    itemCategories: ["Vegetables", "Fruits", "Spices", "Dry Rations", "Dairy", "Household"],
    expenseExtras: ["Wastage"],
  },
  {
    key: "home",
    label: "Home & Kitchen",
    blurb: "Homeware, decor, kitchen tools",
    color: "#0e7490",
    itemSingular: "Product",
    itemPlural: "Products",
    catalogTitle: "Product Catalog",
    importsGoods: true,
    itemCategories: ["Kitchen", "Decor", "Storage", "Bedding", "Cleaning", "Furniture"],
    expenseExtras: ["Breakage"],
  },
  {
    key: "kids",
    label: "Toys & Baby",
    blurb: "Toys, baby care, school items",
    color: "#b45309",
    itemSingular: "Product",
    itemPlural: "Products",
    catalogTitle: "Product Catalog",
    importsGoods: true,
    itemCategories: ["Toys", "Baby Care", "Clothing", "School Supplies", "Games", "Gifts"],
    expenseExtras: [],
  },
  {
    key: "jewellery",
    label: "Jewellery & Accessories",
    blurb: "Rings, watches, fashion jewellery",
    color: "#0f172a",
    itemSingular: "Piece",
    itemPlural: "Pieces",
    catalogTitle: "Collection",
    importsGoods: true,
    itemCategories: ["Rings", "Necklaces", "Bracelets", "Earrings", "Watches", "Sets"],
    expenseExtras: ["Photography", "Gift Boxes"],
  },
  {
    key: "health",
    label: "Health & Wellness",
    blurb: "Supplements, personal care",
    color: "#15803d",
    itemSingular: "Product",
    itemPlural: "Products",
    catalogTitle: "Product Catalog",
    importsGoods: true,
    itemCategories: ["Supplements", "Personal Care", "Herbal", "Fitness", "Medical Supplies"],
    expenseExtras: ["Licences"],
  },
  {
    key: "books",
    label: "Books & Stationery",
    blurb: "Books, art supplies, office items",
    color: "#1d4ed8",
    itemSingular: "Product",
    itemPlural: "Products",
    catalogTitle: "Catalog",
    importsGoods: true,
    itemCategories: ["Books", "Notebooks", "Pens & Pencils", "Art Supplies", "Office"],
    expenseExtras: [],
  },
  {
    key: "auto",
    label: "Auto Parts & Accessories",
    blurb: "Spares, car & bike accessories",
    color: "#0f172a",
    itemSingular: "Part",
    itemPlural: "Parts",
    catalogTitle: "Parts Catalog",
    importsGoods: true,
    itemCategories: ["Car Accessories", "Bike Accessories", "Spare Parts", "Oils & Care", "Tools"],
    expenseExtras: ["Warranty & Repairs"],
  },
  {
    key: "general",
    label: "Something else",
    blurb: "Any other COD business",
    color: "#0f172a",
    itemSingular: "Item",
    itemPlural: "Items",
    catalogTitle: "Product Catalog",
    importsGoods: true,
    itemCategories: [],
    expenseExtras: [],
  },
] as const satisfies readonly BusinessTypePreset[];

export type BusinessTypeKey = (typeof BUSINESS_TYPES)[number]["key"];

const BY_KEY = new Map<string, BusinessTypePreset>(BUSINESS_TYPES.map((t) => [t.key, t]));
const GENERAL = BY_KEY.get("general")!;

export function isBusinessTypeKey(value: unknown): value is BusinessTypeKey {
  return typeof value === "string" && BY_KEY.has(value);
}

/** Looks up a preset; unknown/empty keys fall back to the general preset. */
export function getBusinessType(key: string | null | undefined): BusinessTypePreset {
  return (key && BY_KEY.get(key)) || GENERAL;
}

export interface ItemLabels {
  singular: string;
  plural: string;
  singularLower: string;
  pluralLower: string;
}

/** What this kind of business calls its stock ("Products", "Menu items"…), in the active language. */
export function itemLabelsFor(key: string | null | undefined, t: Translator): ItemLabels {
  const preset = getBusinessType(key);
  const singular = t.lookup("noun", preset.itemSingular);
  const plural = t.lookup("noun", preset.itemPlural);
  return {
    singular,
    plural,
    singularLower: singular.toLowerCase(),
    pluralLower: plural.toLowerCase(),
  };
}

/** Business-type name / one-line description in the active language. */
export function businessTypeLabel(t: Translator, key: string): string {
  const k = `bt.${key}.label`;
  return t.has(k) ? t(k as MessageKey) : getBusinessType(key).label;
}

export function businessTypeBlurb(t: Translator, key: string): string {
  const k = `bt.${key}.blurb`;
  return t.has(k) ? t(k as MessageKey) : getBusinessType(key).blurb;
}

/** Default catalog title for a business type, in the active language. */
export function catalogTitleFor(key: string | null | undefined, t: Translator): string {
  return t.lookup("ctitle", getBusinessType(key).catalogTitle);
}

/** Expense categories are stored in English; this shows one in the active language. */
export function expenseCategoryLabel(t: Translator, category: string): string {
  return t.lookup("expCat", category);
}

const COMMON_EXPENSES = ["Shipping", "Advertising", "Packaging", "Rent", "Salary", "Utilities"];

/** Expense categories offered for a business: common ones + import costs (if it
 *  imports) + type-specific extras, always ending with "Misc". */
export function expenseCategoriesFor(key: string | null | undefined, importsGoods: boolean): string[] {
  const t = getBusinessType(key);
  const list = [
    ...COMMON_EXPENSES.slice(0, 1),
    ...(importsGoods ? ["Customs"] : []),
    ...COMMON_EXPENSES.slice(1),
    ...t.expenseExtras,
    "Misc",
  ];
  return Array.from(new Set(list));
}

/** Category suggestions for the item form: categories the business already uses
 *  first (their own naming wins), then the type's presets that aren't duplicates. */
export function itemCategorySuggestions(key: string | null | undefined, existing: string[] = []): string[] {
  const used = existing.filter((c) => c && c !== "Uncategorized");
  const seen = new Set(used.map((c) => c.toLowerCase()));
  const presets = getBusinessType(key).itemCategories.filter((c) => !seen.has(c.toLowerCase()));
  return [...used, ...presets];
}
