/**
 * job-postings-list-linkage.static.test.ts — hrp-m2a-operational-ux-debt / F7.
 *
 * Static guard for the JobPosting list linkage fix that turns the staffing-
 * order code + `(JobOpening: <status>)` suffix into a `<Link>` to
 * `/admin/job-openings/<jobOpeningId>` whenever the canonical JobOpening ID
 * is present in the row DTO (audit §8.7, execution decision §D Priority 2).
 *
 * The DTO already carries `jobOpeningId` at
 * `src/domains/staffing/job-posting-list.service.ts:71` and `:158`. This
 * guard enforces three rules:
 *
 *  (a) For rows with `openingStaffingOrderCode !== null` AND
 *      `jobOpeningId !== null`, the rendered markup contains an
 *      `<a href="/admin/job-openings/<uuid>">` so an operator can navigate
 *      to the canonical JobOpening activation page in one click.
 *  (b) For orphan rows (`openingStaffingOrderCode === null` OR
 *      `jobOpeningId === null`), the row keeps the existing plain-text
 *      sentinel — NO fabricated link.
 *  (c) The DTO contract surface (`jobOpeningId` on the row) is preserved
 *      — no DTO field removed; no `jobOpeningId` aliased from
 *      `StaffingOrder.code`.
 *
 * Pure static / filesystem test — no DOM rendering, no React, no DB.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const PAGE_PATH = join(process.cwd(), 'app/admin/jobs/job-postings/page.tsx');
const LIST_SERVICE_PATH = join(process.cwd(), 'src/domains/staffing/job-posting-list.service.ts');

const PAGE_SOURCE = readFileSync(PAGE_PATH, 'utf8');
const LIST_SERVICE_SOURCE = readFileSync(LIST_SERVICE_PATH, 'utf8');

/**
 * Returns the row-mapping callback inside the All-Jobs table. We narrow to
 * the second `.map(` after the JobPosting `result.items.map(...)` call which
 * is the actual JSX render.
 */
function extractRowMarkup(source: string): string {
  // Capture the table row's inner JSX by finding the second `result.items.map`
  // call and the `<tr>` block.
  const itemsMapIdx = source.indexOf('result.items.map(');
  if (itemsMapIdx < 0) {
    throw new Error('result.items.map( not found in page.tsx');
  }
  // Slice from the items.map to the closing `))}` of the .map((item: ..., idx) => ( ... ))).
  const tail = source.slice(itemsMapIdx);
  const closingIdx = tail.indexOf('))}\n');
  const fallback = tail.indexOf('))\n}');
  const end = closingIdx >= 0 ? itemsMapIdx + closingIdx + 3 : itemsMapIdx + (fallback >= 0 ? fallback + 3 : tail.length);
  return source.slice(itemsMapIdx, end);
}

const ROW_MARKUP = extractRowMarkup(PAGE_SOURCE);

describe('hrp-m2a-operational-ux-debt / F7 — JobPosting list → JobOpening linkage', () => {
  // RQ-06 / AC-02 — the canonical link markup is present in the row.
  it('row markup renders a <Link> to /admin/job-openings/{jobOpeningId}', () => {
    expect(ROW_MARKUP).toMatch(/href=\{`\/admin\/job-openings\/\$\{item\.jobOpeningId\}`\}/);
  });

  // RQ-06 / AC-02 — orphan branch is preserved (no fabricated link).
  it('row markup preserves the orphan plain-text sentinel when openingStaffingOrderCode is null', () => {
    expect(ROW_MARKUP).toMatch(/\(orphan — JobOpening đã xoá\)/);
    // No `<Link>` wraps the orphan branch.
    expect(ROW_MARKUP).not.toMatch(/<Link[^>]*>\s*<span[^>]*>\s*\(orphan/);
  });

  // RQ-06 / AC-02 — when jobOpeningId is missing but openingStaffingOrderCode is present,
  // the row renders plain text without a fabricated href. The current DTO contract
  // is `jobOpeningId` is REQUIRED (the `opening` field can be null but the top-level
  // `jobOpeningId` FK is non-null on every JobPosting row), so this is a defensive
  // assertion: if a future change starts reading `jobOpeningId` from `StaffingOrder.code`
  // the test catches it because `jobOpeningId` is the only identifier interpolated.
  it('interpolates only item.jobOpeningId — never derives an ID from staffingCode', () => {
    // The href template MUST reference `item.jobOpeningId` and nothing else.
    expect(ROW_MARKUP).toMatch(/href=\{`\/admin\/job-openings\/\$\{item\.jobOpeningId\}`\}/);
    // Defensive: there is no `/admin/job-openings/${item.openingStaffingOrderCode}` (which would
    // be a fabrication) and no `${item.staffingOrderId}` (which would be a wrong-ID leak).
    expect(ROW_MARKUP).not.toMatch(/\$\{item\.openingStaffingOrderCode\}/);
    expect(ROW_MARKUP).not.toMatch(/\$\{item\.staffingOrderId\}/);
    expect(ROW_MARKUP).not.toMatch(/\$\{item\.staffingOrderCode\}/);
  });

  // RQ-06 / AC-02 — link is wrapped with a testid for downstream regression tests.
  it('link carries data-testid="job-opening-link" for downstream regression tests', () => {
    expect(ROW_MARKUP).toMatch(/data-testid="job-opening-link"/);
  });

  // RQ-06 / AC-02 — staffing-order code (font-mono span) and the
  // `(JobOpening: <status>)` suffix are inside the link so a single click
  // navigates to the canonical JobOpening page.
  it('staffing-order code + JobOpening status suffix are wrapped inside the link', () => {
    const linkSlice = ROW_MARKUP.match(/<Link[^>]*data-testid="job-opening-link"[^>]*>([\s\S]*?)<\/Link>/);
    expect(linkSlice).not.toBeNull();
    const inner = linkSlice![1]!;
    expect(inner).toMatch(/item\.openingStaffingOrderCode/);
    expect(inner).toMatch(/JobOpening: \{item\.openingStatus\}/);
  });

  // RQ-06 / AC-02 — the DTO contract preserves `jobOpeningId` so the UI can
  // link without re-fetching. No DTO field is renamed.
  it('JobPostingListItemDto carries jobOpeningId (DTO contract preserved)', () => {
    expect(LIST_SERVICE_SOURCE).toMatch(/interface JobPostingListItemDto[\s\S]*jobOpeningId:\s*string/);
    // Mapper still emits jobOpeningId in the to-dto branch.
    expect(LIST_SERVICE_SOURCE).toMatch(/jobOpeningId:\s*row\.jobOpeningId/);
  });

  // RQ-06 / AC-09 — encoding: LF-only, no UTF-8 BOM.
  it('page.tsx is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(PAGE_SOURCE).not.toMatch(/\r\n/);
    expect(PAGE_SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
});