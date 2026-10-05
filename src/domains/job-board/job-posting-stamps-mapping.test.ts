/**
 * job-posting-stamps-mapping.test.ts — hrp-p1-a0-1 / RQ-09 / DEC-05.
 *
 * Unit test cho STAMP_RANK ordering guarantee (multi-stamp layout):
 *   - `tuyen-gap` (urgent) phải rank trước `hot` để wrapper render quan trọng nhất ở index 0.
 *
 * Đây là fence tĩnh về STAMP_RANK ordering. Việc test mapping `JobPosting.isHot`/`isUrgent` ra
 * `PublicJobDto.isHot`/`isUrgent` được cover bởi `public-card-truth.test.ts` (đã có DTO
 * allow-list `isHot`, `isUrgent`) + integration test ở lane `tests/db/` (cần synthetic DB,
 * ENV_BLOCKED ở worktree này).
 */
import { describe, expect, it } from 'vitest';

import { STAMP_KEYS, STAMP_RANK, deriveStampsFromFlags } from './components/landing/stamp-defs';

describe('hrp-p1-a0-1 — STAMP_RANK ordering (multi-stamp layout, DEC-06)', () => {
  it('tuyen-gap có rank thấp hơn hot — render trước khi multi-stamp', () => {
    expect(STAMP_RANK['tuyen-gap']).toBeLessThan(STAMP_RANK['hot']);
  });

  it('5 stamp keys đều có rank hợp lệ (số nguyên >= 0, unique)', () => {
    const ranks = Object.values(STAMP_RANK);
    expect(ranks.length).toBe(5);
    for (const r of ranks) {
      expect(Number.isInteger(r)).toBe(true);
      expect(r).toBeGreaterThanOrEqual(0);
    }
    expect(new Set(ranks).size).toBe(5); // unique
  });
});

describe('hrp-ui-v1-public-card-truth-correction (T1A / RQ-09) — deriveStampsFromFlags matrix', () => {
  // 0 flag
  it('0 flag ⇒ mảng rỗng (không có stamp)', () => {
    expect(deriveStampsFromFlags(false, false, false, false)).toEqual([]);
  });

  // 4 flag đơn lẻ
  it('chỉ isHot=true ⇒ 1 stamp "hot"', () => {
    expect(deriveStampsFromFlags(true, false, false, false)).toEqual(['hot']);
  });

  it('chỉ isUrgent=true ⇒ 1 stamp "tuyen-gap"', () => {
    expect(deriveStampsFromFlags(false, true, false, false)).toEqual(['tuyen-gap']);
  });

  it('chỉ isHighReward=true ⇒ 1 stamp "thuong-cao"', () => {
    expect(deriveStampsFromFlags(false, false, true, false)).toEqual(['thuong-cao']);
  });

  it('chỉ isExpiringSoon=true ⇒ 1 stamp "sap-het-han"', () => {
    expect(deriveStampsFromFlags(false, false, false, true)).toEqual(['sap-het-han']);
  });

  // Production-repro T0 §4: "Nhân viên kho" — isHighReward=true + isExpiringSoon=true ⇒ 2 stamp
  // theo canonical rank (`sap-het-han` rank 2 trước `thuong-cao` rank 3).
  it('isHighReward + isExpiringSoon ⇒ 2 stamp [sap-het-han, thuong-cao]', () => {
    expect(deriveStampsFromFlags(false, false, true, true)).toEqual([
      'sap-het-han',
      'thuong-cao',
    ]);
  });

  // 4 flag cùng true
  it('cả 4 flag ⇒ 4 stamp theo canonical rank', () => {
    expect(deriveStampsFromFlags(true, true, true, true)).toEqual([
      'tuyen-gap',   // rank 0
      'hot',         // rank 1
      'sap-het-han', // rank 2
      'thuong-cao',  // rank 3
    ]);
  });

  // Tất cả các permutation 0/1 trên 4 flag phải:
  //  - chỉ sinh stamp từ flag true (no heuristic)
  //  - sort theo STAMP_RANK
  //  - không xuất hiện `moi` (legacy)
  it('permutation: 16 trường hợp, mỗi trường hợp đều đúng tập stamp theo rank', () => {
    for (const isHot of [false, true]) {
      for (const isUrgent of [false, true]) {
        for (const isHighReward of [false, true]) {
          for (const isExpiringSoon of [false, true]) {
            const stamps = deriveStampsFromFlags(isHot, isUrgent, isHighReward, isExpiringSoon);
            const expectedCount =
              (isHot ? 1 : 0) +
              (isUrgent ? 1 : 0) +
              (isHighReward ? 1 : 0) +
              (isExpiringSoon ? 1 : 0);
            expect(stamps.length, `flags=${isHot},${isUrgent},${isHighReward},${isExpiringSoon}`).toBe(expectedCount);
            expect(stamps, 'must not include legacy `moi`').not.toContain('moi');
            for (let i = 1; i < stamps.length; i += 1) {
              expect(STAMP_RANK[stamps[i - 1]], `rank ascending at index ${i}`).toBeLessThanOrEqual(
                STAMP_RANK[stamps[i]],
              );
            }
          }
        }
      }
    }
  });

  it('STAMP_KEYS có đúng 5 phần tử: tuyen-gap, hot, sap-het-han, thuong-cao, moi', () => {
    expect(STAMP_KEYS).toEqual(['tuyen-gap', 'hot', 'sap-het-han', 'thuong-cao', 'moi']);
  });
});
