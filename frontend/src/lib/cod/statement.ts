/** Reads a courier's statement (CSV or Excel, already turned into rows of text) into lines the API can check. */

export interface StatementMapping { tracking: string; collected: string; fee: string }
export interface StatementTable { headers: string[]; rows: string[][] }
export interface StatementRow { tracking_number: string; collected: number; fee: number }

const TRACKING = /way\s*-?bill|tracking|track\s*(no|id|#)|awb|consign|parcel\s*(no|id)/i;
const FEE = /fee|charge|commission|deduct/i;
const COLLECTED = /cod|collect|amount|value|cash/i;

export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = [',', ';', '\t'].reduce((best, d) => (firstLine.split(d).length > firstLine.split(best).length ? d : best), ',');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) { row.push(cell.trim()); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && clean[i + 1] === '\n') i++;
      row.push(cell.trim()); cell = '';
      rows.push(row); row = [];
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows.filter(r => r.some(Boolean));
}

/** Statements often open with a title or the courier's address, so the headings are found rather than assumed. */
export function toTable(rows: string[][]): StatementTable | null {
  if (!rows.length) return null;
  const search = rows.slice(0, 15);
  const index = search.findIndex(r => r.filter(Boolean).length >= 2 && r.some(c => TRACKING.test(c)));
  const headerAt = index >= 0 ? index : search.findIndex(r => r.filter(Boolean).length >= 2);
  if (headerAt < 0) return null;
  const headers = rows[headerAt].map((h, i) => h || `Column ${i + 1}`);
  return { headers, rows: rows.slice(headerAt + 1) };
}

/** A saved mapping wins while its headings still exist; otherwise guess from the wording. */
export function guessMapping(headers: string[], saved?: Partial<StatementMapping> | null): StatementMapping {
  if (saved?.tracking && saved.collected && headers.includes(saved.tracking) && headers.includes(saved.collected)) {
    return { tracking: saved.tracking, collected: saved.collected, fee: saved.fee && headers.includes(saved.fee) ? saved.fee : '' };
  }
  const tracking = headers.find(h => TRACKING.test(h)) ?? '';
  const collected = headers.find(h => h !== tracking && COLLECTED.test(h) && !FEE.test(h)) ?? '';
  const fee = headers.find(h => h !== tracking && h !== collected && FEE.test(h)) ?? '';
  return { tracking, collected, fee };
}

/** "Rs. 1,250.00" → 1250. A blank means 0. Null when it isn't a usable amount, which is reported and not guessed at. */
export function parseAmount(value: string | undefined): number | null {
  const text = (value ?? '').replace(/rs\.?|lkr|,|\s/gi, '');
  if (!text || text === '-') return 0;
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  return Math.round(Number(text) * 100) / 100;
}

/** Lines without a waybill (blanks, totals) are skipped; lines with a bad amount are listed so nothing vanishes quietly. */
export function statementRows(table: StatementTable, mapping: StatementMapping): { rows: StatementRow[]; unreadable: string[] } {
  const col = (name: string) => table.headers.indexOf(name);
  const tracking = col(mapping.tracking);
  const collected = col(mapping.collected);
  const fee = mapping.fee ? col(mapping.fee) : -1;
  const rows: StatementRow[] = [];
  const unreadable: string[] = [];
  for (const r of table.rows) {
    const number = (r[tracking] ?? '').trim();
    if (!number || /total/i.test(number)) continue;
    const cash = parseAmount(r[collected]);
    const charge = fee >= 0 ? parseAmount(r[fee]) : 0;
    if (cash === null || charge === null || number.length > 100) unreadable.push(number.slice(0, 40));
    else rows.push({ tracking_number: number, collected: cash, fee: charge });
  }
  return { rows, unreadable };
}

export async function readStatementFile(file: File): Promise<string[][]> {
  if (/\.xlsx$/i.test(file.name)) {
    const { default: readXlsx } = await import('read-excel-file');
    const rows = await readXlsx(file);
    return rows
      .map(r => r.map(c => (c === null || c === undefined ? '' : c instanceof Date ? c.toISOString().slice(0, 10) : String(c)).trim()))
      .filter(r => r.some(Boolean));
  }
  return parseCsv(await file.text());
}

/** Splits a total fee across orders to the cent, for a payment entered by hand. */
export function splitFee(total: number, count: number): number[] {
  if (count <= 0) return [];
  const cents = Math.round(total * 100);
  const each = Math.floor(cents / count);
  return Array.from({ length: count }, (_, i) => (each + (i === 0 ? cents - each * count : 0)) / 100);
}
