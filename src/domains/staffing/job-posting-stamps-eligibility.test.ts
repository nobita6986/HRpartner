/**
 * job-posting-stamps-eligibility.test.ts — hrp-p1-a0-1 / DEC-03.
 *
 * Static fence đọc nguồn `listEligibleSlotsForNewJobPosting` (raw SQL) và đảm bảo
 * predicate khớp DEC-03 / T0 §2 "Slot selector":
 *   - `so.status IN ('OPEN', 'CLOSING_SOON')`
 *   - `(so.deadline_date IS NULL OR so.deadline_date >= $now)`
 *   - `(s.valid_to IS NULL OR s.valid_to >= $now)`
 *   - `s.slots_filled < s.slots_needed`
 *   - `s.job_opening_id IS NULL`
 *
 * Không đọc `DATABASE_URL` (`EV-09`); đây là static guard.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SERVICE = 'src/domains/staffing/job-posting-list.service.ts';

describe('hrp-p1-a0-1 — eligible-slot predicate (DEC-03)', () => {
  const code = readFileSync(join(process.cwd(), SERVICE), 'utf8');

  it('predicate chứa đủ năm mệnh đề theo DEC-03', () => {
    // Mệnh đề 1: status ∈ {OPEN, CLOSING_SOON}
    expect(code).toMatch(/so\.status\s+IN\s*\(\s*'OPEN'\s*,\s*'CLOSING_SOON'\s*\)/i);
    // Mệnh đề 2: deadlineDate null hoặc >= now
    expect(code).toMatch(/so\.deadline_date\s+IS\s+NULL\s+OR\s+so\.deadline_date\s+>=\s*\$\{now\}/i);
    // Mệnh đề 3: validTo null hoặc >= now
    expect(code).toMatch(/s\.valid_to\s+IS\s+NULL\s+OR\s+s\.valid_to\s+>=\s*\$\{now\}/i);
    // Mệnh đề 4: slotsFilled < slotsNeeded
    expect(code).toMatch(/s\.slots_filled\s+<\s*s\.slots_needed/);
    // Mệnh đề 5: jobOpeningId IS NULL
    expect(code).toMatch(/s\.job_opening_id\s+IS\s+NULL/);
  });

  it('KHÔNG yêu cầu validFrom <= hôm nay (HR được prep draft trước ngày bắt đầu tuyển)', () => {
    // T0 §2: "Không yêu cầu validFrom <= hôm nay".
    // Predicate phải KHÔNG có mệnh đề validFrom.
    expect(code).not.toMatch(/s\.valid_from\s+<=/);
    expect(code).not.toMatch(/valid_from\s+IS\s+NULL\s+OR\s+valid_from\s+<=/);
  });

  it('raw SQL có LIMIT để cap scan (default 100, max 500)', () => {
    expect(code).toMatch(/LIMIT\s+\$\{limit\}/i);
  });
});
