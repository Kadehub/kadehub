import { describe, expect, it } from 'vitest';
import { amountToKeypad, keyFromKeyboard, keypadValue, pushKey, type KeypadKey } from './keypad';

const type = (keys: KeypadKey[], start = '') => keys.reduce(pushKey, start);

describe('pushKey', () => {
  it('replaces a lone leading zero', () => {
    expect(type(['0', '0', '5'])).toBe('5');
    expect(type(['0'])).toBe('0');
  });
  it('allows only one dot and starts "." as "0."', () => {
    expect(type(['.'])).toBe('0.');
    expect(type(['1', '.', '.', '5'])).toBe('1.5');
  });
  it('keeps at most 2 decimals', () => {
    expect(type(['1', '.', '2', '3', '4'])).toBe('1.23');
  });
  it('caps integers at 9 digits', () => {
    expect(type(['1', '2', '3', '4', '5', '6', '7', '8', '9', '9'])).toBe('123456789');
    expect(type(['.', '5'], '123456789')).toBe('123456789.5');
  });
  it('backspace removes one character and clear empties', () => {
    expect(pushKey('12.5', 'back')).toBe('12.');
    expect(pushKey('', 'back')).toBe('');
    expect(pushKey('99', 'clear')).toBe('');
  });
  it('allows zero right after a dot', () => {
    expect(type(['0', '.', '0', '5'])).toBe('0.05');
  });
});

describe('keypad helpers', () => {
  it('reads values', () => {
    expect(keypadValue('')).toBe(0);
    expect(keypadValue('0.')).toBe(0);
    expect(keypadValue('1250.5')).toBe(1250.5);
  });
  it('maps physical keys', () => {
    expect(keyFromKeyboard('7')).toBe('7');
    expect(keyFromKeyboard(',')).toBe('.');
    expect(keyFromKeyboard('Backspace')).toBe('back');
    expect(keyFromKeyboard('a')).toBeNull();
  });
  it('formats existing amounts for editing', () => {
    expect(amountToKeypad(1250)).toBe('1250');
    expect(amountToKeypad(12.5)).toBe('12.5');
    expect(amountToKeypad(12.05)).toBe('12.05');
    expect(amountToKeypad(0)).toBe('');
  });
});
