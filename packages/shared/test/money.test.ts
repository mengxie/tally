import { describe, expect, it } from 'vitest';
import { centsToAmountInput, formatMoney, MAX_AMOUNT_CENTS, parseAmountToCents } from '../src';

describe('parseAmountToCents', () => {
  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['12.05', 1205],
    ['0.10', 10],
    ['$1,234.50', 123450],
    [' 7 ', 700],
  ])('parses %j as %d cents', (input, cents) => {
    expect(parseAmountToCents(input)).toBe(cents);
  });

  it.each(['', 'abc', '1.234', '-5', '1.2.3', '10000000.01'])('rejects %j', (input) => {
    expect(parseAmountToCents(input)).toBeUndefined();
  });

  it('accepts the maximum amount exactly', () => {
    expect(parseAmountToCents('1000000.00')).toBe(MAX_AMOUNT_CENTS);
  });

  it('never suffers from floating point error', () => {
    expect(parseAmountToCents('0.29')).toBe(29);
    expect(parseAmountToCents('1.15')).toBe(115);
  });
});

describe('formatting', () => {
  it('formats cents for display', () => {
    expect(formatMoney(4250, 'NZD')).toBe('$42.50');
    expect(formatMoney(-199, 'NZD')).toBe('-$1.99');
    expect(formatMoney(100, 'USD')).toBe('US$1.00');
  });

  it('round-trips cents through an input string', () => {
    expect(centsToAmountInput(1205)).toBe('12.05');
    expect(parseAmountToCents(centsToAmountInput(987654))).toBe(987654);
  });
});
