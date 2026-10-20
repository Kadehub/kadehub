import { describe, expect, it } from 'vitest';
import { isValidPhone } from './order-share';

describe('isValidPhone (mirrors the backend rule)', () => {
  it.each([
    ['0771234567', true], ['077 123 4567', true], ['077-123-4567', true], ['(011) 234 5678', true],
    ['771234567', true], ['94771234567', true], ['+94 77 123 4567', true], ['+44 20 7946 0958', true], ['0094771234567', true],
    ['077123456', false], ['07712345678', false], ['12345', false], ['abc0771234567', false], ['077+1234567', false],
    ['+12345', false], ['', false], ['9477123456', false],
  ])('%s → %s', (input, ok) => {
    expect(isValidPhone(input)).toBe(ok);
  });
});
