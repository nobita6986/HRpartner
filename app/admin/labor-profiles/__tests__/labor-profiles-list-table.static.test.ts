/**
 * labor-profiles-list-table.static.test.ts — T0 T1B HOTFIX UI NGƯỜI LAO ĐỘNG.
 *
 * Anti-regression fence for the table-HTML fix in
 * `app/admin/labor-profiles/page.tsx`. Previous markup wrapped a <tr> in
 * <RowLink> (which renders an <a>), then put <td> children inside that
 * <a>. The resulting <tbody><a><td>…</td></a></tbody> is invalid HTML —
 * browsers react by hoisting the <a> out of the <tbody> and re-parenting
 * the <td>s, which misaligns columns and clips the last cell.
 *
 * The contract enforced here (parity with `app/admin/clients/page.tsx` and
 * `app/admin/projects/projects-table-client.tsx`):
 *   1. <tbody> only contains <tr> children (no <a> direct child).
 *   2. Each row is a real <tr> with class `relative` (required by
 *      RowLink's `before:absolute before:inset-0` pseudo-link overlay).
 *   3. RowLink is used INSIDE a single <td> per row (typically the
 *      primary identifier cell), not as a row wrapper.
 *   4. The whole row stays clickable — exactly ONE <a> per row, no
 *      nested anchors.
 *   5. Page <h1> uses the canonical title "Hồ sơ tiếp nhận người lao động".
 *   6. The intake CTA reads "+ Tiếp nhận người lao động".
 *   7. No legacy "Nhân sự" / "Hồ sơ NLD" / "NLD" surface strings.
 *
 * Pure static test (no React, no DB, no router).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const PAGE_PATH = join(process.cwd(), 'app/admin/labor-profiles/page.tsx');
const SOURCE = readFileSync(PAGE_PATH, 'utf8');

/**
 * Strip JS/TS line and block comments so a comment that documents an
 * anti-pattern (e.g. "<tbody><a><td>…</td></a></tbody>") does not get
 * scanned as code. The T1B hotfix intentionally cites the old markup
 * verbatim in a comment to explain the fix.
 */
function stripComments(source: string): string {
  // Block comments (greedy, multi-line). Cheap approximation: match
  // /* ... */ even across newlines.
  let out = source.replace(/\/\*[\s\S]*?\*\//g, '');
  // Line comments — to end of line.
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (_m, lead) => lead);
  return out;
}

/**
 * Extract the <tbody>…</tbody> block of the labor-profiles list table.
 * The list table is the only <tbody> in the file (the rest of the page is
 * header + filter chips + wrapper divs), so a single greedy match
 * suffices. Falls back to an empty string when not found so the negative
 * assertions below can still execute.
 */
function extractListTbody(source: string): string {
  const match = source.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
  return match ? match[1]! : '';
}

/**
 * Extract every <tr>…</tr> block from the body. The empty-state row is
 * also a <tr> (with a single <td colSpan>), so the count is the natural
 * surface for the "rows = items or empty-state" invariant.
 */
function extractRowsFromTbody(tbody: string): string[] {
  const rows: string[] = [];
  const rx = /<tr[^>]*>[\s\S]*?<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(tbody)) !== null) {
    rows.push(m[0]);
  }
  return rows;
}

const CODE = stripComments(SOURCE);
const tbody = extractListTbody(CODE);
const rows = extractRowsFromTbody(tbody);

describe('app/admin/labor-profiles/page.tsx — T0 T1B HOTFIX UI NGƯỜI LAO ĐỘNG (table HTML semantics)', () => {
  // Data rows are the rows rendered by the `data.items.map(...)` call —
  // they carry the RowLink and the worker ID anchor. The empty-state row
  // is a separate <tr> with a single <td colSpan={6}> and no relative
  // positioning, so it is excluded from the data-row assertions.
  const emptyStateRow = (tbody.match(/<tr[^>]*>\s*<td[^>]*colSpan[^>]*>[\s\S]*?<\/tr>/) ?? [])[0] ?? '';
  const dataRows = rows.filter((row) => row !== emptyStateRow);

  it('renders a single <tbody> for the list table', () => {
    // The list table is the only table on the page (filter chips are <Link>s,
    // not <table><tbody>), so a single tbody is the expected shape.
    const tbodyCount = (CODE.match(/<tbody[\s>]/g) ?? []).length;
    expect(tbodyCount).toBe(1);
  });

  it('<tbody> contains only <tr> children (no <a> direct child)', () => {
    // The bug: <tbody><a href="..."><td>…</td></a></tbody> — an <a> as a
    // direct child of <tbody> is invalid HTML. After the fix, the only
    // direct children of <tbody> are <tr> elements.
    expect(tbody).not.toMatch(/<a\b/);
  });

  it('each data row is a <tr> with class "relative" (RowLink contract)', () => {
    // RowLink's before:absolute before:inset-0 needs a positioned ancestor.
    // <tr class="relative"> provides that; without it the overlay is
    // mis-anchored and the whole-row click target shrinks to the <a> text.
    // The empty-state row (colSpan) is intentionally NOT required to carry
    // class relative — it has no RowLink and is non-interactive.
    expect(dataRows.length).toBeGreaterThan(0);
    for (const row of dataRows) {
      expect(row, `data row missing relative class: ${row}`).toMatch(
        /<tr[^>]*className="[^"]*\brelative\b/,
      );
    }
  });

  it('every data row contains exactly one RowLink (the row-deep-link inside one of its <td>s)', () => {
    // The whole row stays clickable via the RowLink's before:overlay. The
    // RowLink component renders a single <a> at runtime, so the source-
    // level invariant is "exactly one <RowLink> per data row" (the
    // rendered DOM is verified by end-to-end tests in the deployment
    // gate, not here). The empty-state row has zero RowLinks, so the
    // assertion targets only data rows.
    for (const row of dataRows) {
      const rowLinkCount = (row.match(/<RowLink\b/g) ?? []).length;
      expect(rowLinkCount, `data row RowLink count: ${row}`).toBe(1);
    }
  });

  it('no <a> or <RowLink> is a direct child of <tr> (link is always inside a <td>)', () => {
    // Sanity check on the structural relationship: any <a> or <RowLink> in
    // a row must appear AFTER a <td> open tag, never directly after the
    // <tr> open tag. The anti-pattern to forbid: <tr><a …><td>…</td></a>
    // or <tr><RowLink …><td>…</td></RowLink>.
    for (const row of dataRows) {
      const afterTr = row.replace(/^<tr[^>]*>/, '');
      const opensWithAnchor = /^\s*(<a\b|<RowLink\b)/.test(afterTr);
      expect(opensWithAnchor).toBe(false);
    }
  });

  it('page <h1> is "Hồ sơ tiếp nhận người lao động" (canonical title)', () => {
    // T0 T1B §3: page title must be "Hồ sơ tiếp nhận người lao động".
    expect(CODE).toMatch(/<h1[^>]*>\s*Hồ sơ tiếp nhận người lao động\s*<\/h1>/);
  });

  it('Next.js metadata.title is "Hồ sơ tiếp nhận người lao động - Quản trị"', () => {
    expect(CODE).toContain("title: 'Hồ sơ tiếp nhận người lao động - Quản trị'");
  });

  it('intake CTA reads "+ Tiếp nhận người lao động"', () => {
    // T0 T1B §1.4: keep the action button inside the page (since the
    // dedicated sidebar menu is removed). Button text must use the
    // canonical wording, not the legacy "Tiếp nhận hồ sơ người lao động".
    expect(CODE).toMatch(/\+\s*Tiếp nhận người lao động/);
  });

  it('does not interpolate raw enum values into operator-facing <td> text', () => {
    // The StatusBadge cells render their enum values through the typed
    // dictionary (laborProfileIdentityVerificationLabel /
    // laborProfileCompletenessLabel). No raw enum should appear inside a
    // <td> as plain text.
    for (const row of rows) {
      const enumLeaks = row.match(/>\s*(UNVERIFIED|FULL|MINIMAL|INCOMPLETE|NEVER_WORKED|WORKING|TERMINATED)\s*</);
      expect(enumLeaks, `row leaks raw enum: ${row}`).toBeNull();
    }
  });

  it('does not reintroduce legacy "Nhân sự" / "Hồ sơ NLD" / "NLD" surface strings', () => {
    // Anti-regression fence for the T1B terminology cleanup on the
    // /admin/labor-profiles surface.
    expect(CODE).not.toMatch(/<h1[^>]*>[\s\S]*?Nhân sự/);
    expect(CODE).not.toMatch(/<h1[^>]*>[\s\S]*?Hồ sơ NLD/);
    expect(CODE).not.toMatch(/<h1[^>]*>[\s\S]*?NLD/);
    // No "Tiếp nhận hồ sơ người lao động" (old button wording).
    expect(CODE).not.toContain('Tiếp nhận hồ sơ người lao động');
  });
});

describe('app/admin/labor-profiles/page.tsx — T0 T1B encoding hygiene', () => {
  it('is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(SOURCE).not.toMatch(/\r\n/);
    expect(SOURCE.charCodeAt(0)).not.toBe(0xfeff); // no UTF-8 BOM
  });
});
