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
    // Mệnh đề 5 (C-02 correction batch 1/1): exclude only slots whose
    // JobOpening already has a canonical JobPosting. The predicate uses
    // NOT EXISTS joining job_postings ← job_openings, NOT a literal
    // `s.job_opening_id IS NULL` — a slot with a JobOpening but no
    // JobPosting stays ELIGIBLE because POST reuses the JobOpening and
    // creates the missing posting.
    expect(code).toMatch(/NOT\s+EXISTS/i);
    expect(code).toMatch(/FROM\s+job_postings\s+jp/i);
    expect(code).toMatch(/INNER\s+JOIN\s+job_openings\s+jo/i);
    expect(code).toMatch(/jo\.staffing_order_slot_id\s*=\s*s\.id/i);
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

  it('canonical predicate SQL helper covers all four legs (C-02 single source)', () => {
    // C-02: BOTH selector and POST re-read path consume `eligibleSlotPredicateSql(now)`
    // so they cannot drift. The helper must exist + be exported + be used by
    // `listEligibleSlotsForNewJobPosting` selector AND the write-path
    // `assertSlotEligibleForNewJobPosting` (defined in
    // `job-posting-authoring.service.ts`).
    expect(code).toMatch(/export\s+function\s+eligibleSlotPredicateSql/);
    expect(code).toMatch(/listEligibleSlotsForNewJobPosting[\s\S]{0,2000}eligibleSlotPredicateSql\s*\(/);
    // Import of the helper must also be present in the authoring service so
    // the write-path can re-read eligibility with the same predicate.
    const authoring = readFileSync(
      join(process.cwd(), 'src/domains/staffing/job-posting-authoring.service.ts'),
      'utf8',
    );
    expect(authoring).toMatch(/eligibleSlotPredicateSql/);
    expect(authoring).toMatch(/assertSlotEligibleForNewJobPosting/);
  });
});
