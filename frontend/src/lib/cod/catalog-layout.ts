/** Pure catalog pagination — decides which card goes where on which page.
 *  No canvas or DOM here so it can be unit-tested; catalog-render.ts draws
 *  whatever this returns. All units are logical px on a 1240×1754 (A4 @150dpi) page. */

export const PAGE_W = 1240;
export const PAGE_H = 1754;
export const MARGIN = 60;
export const GAP = 24;

export const FIRST_HEADER_H = 320;
export const NEXT_HEADER_H = 110;
export const FOOTER_H = 90;
export const HEADING_H = 84;

export type Columns = 2 | 3 | 4;

export interface CardStyle {
  /** Image height as a fraction of card width. */
  imageRatio: number;
  /** Space under the image for name / meta / price. */
  textH: number;
  nameFont: number;
  metaFont: number;
  priceFont: number;
  nameLines: number;
}

export const CARD_STYLES: Record<Columns, CardStyle> = {
  2: { imageRatio: 0.72, textH: 194, nameFont: 32, metaFont: 22, priceFont: 34, nameLines: 2 },
  3: { imageRatio: 0.9, textH: 162, nameFont: 26, metaFont: 19, priceFont: 28, nameLines: 2 },
  4: { imageRatio: 0.82, textH: 140, nameFont: 21, metaFont: 16, priceFont: 23, nameLines: 2 },
};

export interface LayoutEntry {
  id: string;
  category: string;
}

export type Placement<E extends LayoutEntry> =
  | { kind: "heading"; text: string; x: number; y: number; w: number; h: number }
  | { kind: "card"; entry: E; x: number; y: number; w: number; h: number; imageH: number };

export interface CatalogPage<E extends LayoutEntry> {
  placements: Placement<E>[];
}

export function cardWidth(columns: Columns): number {
  return (PAGE_W - 2 * MARGIN - GAP * (columns - 1)) / columns;
}

export function cardHeight(columns: Columns): number {
  return Math.round(cardWidth(columns) * CARD_STYLES[columns].imageRatio) + CARD_STYLES[columns].textH;
}

/** Flows entries into pages. Entries keep their given order; with
 *  `groupByCategory` they are grouped under category headings (categories
 *  alphabetical, "Uncategorized" last). A heading is never left stranded at the
 *  bottom of a page without at least one row of cards under it. */
export function layoutCatalog<E extends LayoutEntry>(
  entries: E[],
  opts: { columns: Columns; groupByCategory: boolean },
): CatalogPage<E>[] {
  const { columns, groupByCategory } = opts;
  const w = cardWidth(columns);
  const imageH = Math.round(w * CARD_STYLES[columns].imageRatio);
  const h = imageH + CARD_STYLES[columns].textH;
  const bottom = PAGE_H - FOOTER_H;

  const pages: CatalogPage<E>[] = [{ placements: [] }];
  let y = FIRST_HEADER_H;
  const current = () => pages[pages.length - 1];
  const newPage = () => {
    pages.push({ placements: [] });
    y = NEXT_HEADER_H;
  };

  const groups: { heading: string | null; entries: E[] }[] = groupByCategory
    ? groupEntries(entries)
    : [{ heading: null, entries }];

  for (const group of groups) {
    if (group.entries.length === 0) continue;

    if (group.heading !== null) {
      if (y + HEADING_H + h > bottom) newPage();
      current().placements.push({
        kind: "heading",
        text: group.heading,
        x: MARGIN,
        y,
        w: PAGE_W - 2 * MARGIN,
        h: HEADING_H,
      });
      y += HEADING_H;
    }

    for (let i = 0; i < group.entries.length; i += columns) {
      if (y + h > bottom) newPage();
      group.entries.slice(i, i + columns).forEach((entry, col) => {
        current().placements.push({
          kind: "card",
          entry,
          x: MARGIN + col * (w + GAP),
          y,
          w,
          h,
          imageH,
        });
      });
      y += h + GAP;
    }
  }

  return pages;
}

function groupEntries<E extends LayoutEntry>(entries: E[]): { heading: string; entries: E[] }[] {
  const map = new Map<string, E[]>();
  for (const e of entries) {
    const key = e.category?.trim() || "Uncategorized";
    (map.get(key) ?? map.set(key, []).get(key)!).push(e);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    })
    .map(([heading, list]) => ({ heading, entries: list }));
}
