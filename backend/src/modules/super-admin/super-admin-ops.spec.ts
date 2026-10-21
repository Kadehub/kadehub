import { toCsv } from './super-admin-ops.service';

describe('toCsv', () => {
  const body = (csv: string) => csv.replace(/^﻿/, '').split('\r\n');

  it('starts with a BOM so Excel reads Sinhala and Tamil names', () => {
    expect(toCsv(['Name'], [['නිමල්']]).startsWith('﻿')).toBe(true);
    expect(body(toCsv(['Name'], [['නිමල්']]))[1]).toBe('"නිමල්"');
  });

  it('quotes every cell and doubles inner quotes', () => {
    expect(body(toCsv(['A', 'B'], [['Say "hi", ok', 3]]))[1]).toBe('"Say ""hi"", ok","3"');
  });

  it('keeps phone numbers as typed', () => {
    expect(body(toCsv(['Phone'], [['+94 77 123 4567'], ['0771234567']])).slice(1)).toEqual(['"+94 77 123 4567"', '"0771234567"']);
  });

  it('stops spreadsheet formulas from running', () => {
    const rows = body(toCsv(['X'], [['=HYPERLINK("http://x")'], ['@SUM(A1)'], ['+cmd'], ['-2+3'], ['-x']])).slice(1);
    expect(rows).toEqual([`"'=HYPERLINK(""http://x"")"`, `"'@SUM(A1)"`, `"'+cmd"`, '"-2+3"', `"'-x"`]);
  });

  it('writes empty cells for missing values and ISO dates for dates', () => {
    expect(body(toCsv(['A', 'B', 'C'], [[null, undefined, new Date('2026-01-02T03:04:05Z')]]))[1]).toBe('"","","2026-01-02T03:04:05.000Z"');
  });
});
