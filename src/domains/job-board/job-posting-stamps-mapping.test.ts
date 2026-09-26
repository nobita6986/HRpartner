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

import { STAMP_RANK } from './components/landing/stamp-defs';

describe('hrp-p1-a0-1 — STAMP_RANK ordering (multi-stamp layout, DEC-06)', () => {
  it('tuyen-gap có rank thấp hơn hot — render trước khi multi-stamp', () => {
    expect(STAMP_RANK['tuyen-gap']).toBeLessThan(STAMP_RANK['hot']);
  });

  it('4 stamp keys đều có rank hợp lệ (số nguyên >= 0, unique)', () => {
    const ranks = Object.values(STAMP_RANK);
    expect(ranks.length).toBe(4);
    for (const r of ranks) {
      expect(Number.isInteger(r)).toBe(true);
      expect(r).toBeGreaterThanOrEqual(0);
    }
    expect(new Set(ranks).size).toBe(4); // unique
  });
});
