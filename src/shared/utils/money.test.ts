import { describe, expect, it } from 'vitest';
import { multiplyDecimalByVnd } from './money';

describe('multiplyDecimalByVnd - ADR-010A', () => {
  it('multiplies 7.5 hours without rounding hours to 8', () => {
    expect(multiplyDecimalByVnd('7.5', 50_000n)).toBe(375_000n);
  });

  it('truncates only the sub-VND remainder after multiplication', () => {
    expect(multiplyDecimalByVnd('7.5', 50_001n)).toBe(375_007n);
    expect(multiplyDecimalByVnd('0.25', 50_001n)).toBe(12_500n);
  });

  it('keeps large decimal products in BigInt arithmetic', () => {
    expect(multiplyDecimalByVnd('123456789.25', 80_000n)).toBe(
      9_876_543_140_000n,
    );
  });

  it('rejects negative or scientific-notation quantities', () => {
    expect(() => multiplyDecimalByVnd('-1', 50_000n)).toThrow();
    expect(() => multiplyDecimalByVnd('1e3', 50_000n)).toThrow();
  });
});