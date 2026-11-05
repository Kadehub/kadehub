import { describe, expect, it } from 'vitest';
import { guessMapping, parseAmount, parseCsv, splitFee, statementRows, toTable } from './statement';

describe('reading CSV', () => {
  it('handles quotes, commas inside them, CRLF and a byte order mark', () => {
    expect(parseCsv('﻿Waybill,Name\r\n"A1","Perera, K"\r\n')).toEqual([['Waybill', 'Name'], ['A1', 'Perera, K']]);
  });

  it('handles escaped quotes and no final newline', () => {
    expect(parseCsv('a,b\n"x ""y""",z')).toEqual([['a', 'b'], ['x "y"', 'z']]);
  });

  it('detects semicolons and tabs', () => {
    expect(parseCsv('a;b\n1;2')[1]).toEqual(['1', '2']);
    expect(parseCsv('a\tb\n1\t2')[1]).toEqual(['1', '2']);
  });
});

describe('finding the headings', () => {
  it('skips a title above the table', () => {
    const table = toTable([['Payment statement'], ['For October', ''], ['Waybill No', 'COD Amount', 'Delivery Fee'], ['A1', '1000', '300']]);
    expect(table?.headers).toEqual(['Waybill No', 'COD Amount', 'Delivery Fee']);
    expect(table?.rows).toEqual([['A1', '1000', '300']]);
  });

  it('falls back to the first real row, and to nothing for an empty file', () => {
    expect(toTable([['Ref', 'Paid'], ['A1', '10']])?.headers).toEqual(['Ref', 'Paid']);
    expect(toTable([])).toBeNull();
    expect(toTable([['just one cell']])).toBeNull();
  });
});

describe('matching columns', () => {
  it('guesses from the wording and does not take a fee for the cash', () => {
    expect(guessMapping(['Delivery Charge', 'Way Bill', 'COD Value', 'Name'])).toEqual({ tracking: 'Way Bill', collected: 'COD Value', fee: 'Delivery Charge' });
  });

  it('leaves blank what it cannot tell', () => {
    expect(guessMapping(['A', 'B'])).toEqual({ tracking: '', collected: '', fee: '' });
  });

  it('prefers the saved mapping while its columns exist', () => {
    const saved = { tracking: 'Ref', collected: 'Paid', fee: 'Gone' };
    expect(guessMapping(['Ref', 'Paid', 'Waybill'], saved)).toEqual({ tracking: 'Ref', collected: 'Paid', fee: '' });
    expect(guessMapping(['Waybill', 'COD'], saved)).toEqual({ tracking: 'Waybill', collected: 'COD', fee: '' });
  });
});

describe('amounts', () => {
  it('reads what statements write', () => {
    expect(parseAmount('Rs. 1,250.50')).toBe(1250.5);
    expect(parseAmount('LKR 900')).toBe(900);
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('-')).toBe(0);
    expect(parseAmount(undefined)).toBe(0);
  });

  it('refuses to guess at anything else', () => {
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('-500')).toBeNull();
    expect(parseAmount('(500)')).toBeNull();
    expect(parseAmount('1.2.3')).toBeNull();
  });
});

describe('statement lines', () => {
  const table = { headers: ['WB', 'COD', 'Fee'], rows: [['A1', '1,000', '300'], ['', '', ''], ['Total', '1000', '300'], ['A2', 'oops', '0'], ['A3', '500']] };

  it('skips blanks and totals, and reports what it cannot read', () => {
    const { rows, unreadable } = statementRows(table, { tracking: 'WB', collected: 'COD', fee: 'Fee' });
    expect(rows).toEqual([{ tracking_number: 'A1', collected: 1000, fee: 300 }, { tracking_number: 'A3', collected: 500, fee: 0 }]);
    expect(unreadable).toEqual(['A2']);
  });

  it('treats fees as zero without a fee column', () => {
    expect(statementRows(table, { tracking: 'WB', collected: 'COD', fee: '' }).rows[0].fee).toBe(0);
  });
});

describe('splitting a fee', () => {
  it('adds up exactly', () => {
    const parts = splitFee(100, 3);
    expect(parts).toEqual([33.34, 33.33, 33.33]);
    expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
  });

  it('handles nothing to split', () => {
    expect(splitFee(100, 0)).toEqual([]);
    expect(splitFee(0, 2)).toEqual([0, 0]);
  });
});
