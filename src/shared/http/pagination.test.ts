/**
 * pagination.test.ts — cover clampPositiveInt + parsePaginationFromUrl.
 *
 * Bảng case:
 *  - undefined / null / NaN / Infinity / chuỗi rỗng -> default
 *  - Số 0 / số âm -> default
 *  - Số > max -> max
 *  - Số dương hợp lệ -> trunc
 *  - parseInt edge cases (?take=abc, ?take=-5, ?take=99999)
 */
import { describe, it, expect } from 'vitest';
import { clampPositiveInt, parsePaginationFromUrl } from './pagination';

describe('clampPositiveInt', () => {
  const opts = { default: 20, max: 100 };

  it('undefined -> default', () => {
    expect(clampPositiveInt(undefined, opts)).toBe(20);
  });
  it('NaN -> default', () => {
    expect(clampPositiveInt(NaN, opts)).toBe(20);
  });
  it('Infinity -> default', () => {
    expect(clampPositiveInt(Infinity, opts)).toBe(20);
  });
  it('-Infinity -> default', () => {
    expect(clampPositiveInt(-Infinity, opts)).toBe(20);
  });
  it('0 -> default', () => {
    expect(clampPositiveInt(0, opts)).toBe(20);
  });
  it('-5 -> default', () => {
    expect(clampPositiveInt(-5, opts)).toBe(20);
  });
  it('99999 > max -> max', () => {
    expect(clampPositiveInt(99999, opts)).toBe(100);
  });
  it('20 -> 20', () => {
    expect(clampPositiveInt(20, opts)).toBe(20);
  });
  it('1 -> 1', () => {
    expect(clampPositiveInt(1, opts)).toBe(1);
  });
  it('1.7 -> 1 (trunc)', () => {
    expect(clampPositiveInt(1.7, opts)).toBe(1);
  });
  it('100 -> 100 (boundary)', () => {
    expect(clampPositiveInt(100, opts)).toBe(100);
  });
  it('101 -> 100 (cap)', () => {
    expect(clampPositiveInt(101, opts)).toBe(100);
  });
});

describe('parsePaginationFromUrl — ?take edge cases', () => {
  const defaults = { defaultTake: 20, maxTake: 100 };

  it('không có ?take -> default 20', () => {
    const { take } = parsePaginationFromUrl(new URLSearchParams(), defaults);
    expect(take).toBe(20);
  });
  it('?take=abc -> Number("abc")=NaN -> default 20', () => {
    const { take } = parsePaginationFromUrl(new URLSearchParams('take=abc'), defaults);
    expect(take).toBe(20);
  });
  it('?take= -> Number("")=0 -> default 20', () => {
    const { take } = parsePaginationFromUrl(new URLSearchParams('take='), defaults);
    expect(take).toBe(20);
  });
  it('?take=-5 -> default 20', () => {
    const { take } = parsePaginationFromUrl(new URLSearchParams('take=-5'), defaults);
    expect(take).toBe(20);
  });
  it('?take=0 -> default 20', () => {
    const { take } = parsePaginationFromUrl(new URLSearchParams('take=0'), defaults);
    expect(take).toBe(20);
  });
  it('?take=99999 -> max 100', () => {
    const { take } = parsePaginationFromUrl(new URLSearchParams('take=99999'), defaults);
    expect(take).toBe(100);
  });
  it('?take=50 -> 50', () => {
    const { take } = parsePaginationFromUrl(new URLSearchParams('take=50'), defaults);
    expect(take).toBe(50);
  });
  it('?take=1.7 -> 1 (trunc)', () => {
    const { take } = parsePaginationFromUrl(new URLSearchParams('take=1.7'), defaults);
    expect(take).toBe(1);
  });
});

describe('parsePaginationFromUrl — ?skip edge cases', () => {
  const defaults = { defaultTake: 20, maxTake: 100, defaultSkip: 0, maxSkip: 1_000_000 };

  it('không có ?skip -> 0', () => {
    const { skip } = parsePaginationFromUrl(new URLSearchParams(), defaults);
    expect(skip).toBe(0);
  });
  it('?skip=-5 -> 0', () => {
    const { skip } = parsePaginationFromUrl(new URLSearchParams('skip=-5'), defaults);
    expect(skip).toBe(0);
  });
  it('?skip=abc -> 0', () => {
    const { skip } = parsePaginationFromUrl(new URLSearchParams('skip=abc'), defaults);
    expect(skip).toBe(0);
  });
  it('?skip=40 -> 40', () => {
    const { skip } = parsePaginationFromUrl(new URLSearchParams('skip=40'), defaults);
    expect(skip).toBe(40);
  });
  it('?skip=9999999999 -> cap maxSkip', () => {
    const { skip } = parsePaginationFromUrl(new URLSearchParams('skip=9999999999'), defaults);
    expect(skip).toBe(1_000_000);
  });
});

describe('parsePaginationFromUrl — combined', () => {
  it('?status=OPEN&page=3 (chỉ take/skip chứ không có page param) → vẫn fallback take=20, skip=0', () => {
    const { take, skip } = parsePaginationFromUrl(
      new URLSearchParams('status=OPEN&page=3'),
      { defaultTake: 20, maxTake: 100 },
    );
    expect(take).toBe(20);
    expect(skip).toBe(0);
  });
});
