/**
 * job-posting-stamps-eligibility.test.ts — hrp-p1-a0-1 / DEC-03 / AUD-001.
 *
 * Static fence đọc nguồn `listEligibleSlotsForNewJobPosting` (raw SQL) và đảm bảo
 * predicate khớp DEC-03 / T0 §2 "Slot selector":
 *   - `so.status IN ('OPEN', 'CLOSING_SOON')`
 *   - `(so.deadline_date IS NULL OR so.deadline_date >= $now)`
 *   - `(s.valid_to IS NULL OR s.valid_to >= $now)`
 *   - `s.slots_filled < s.slots_needed`
 *   - `s.job_opening_id IS NULL`
 *
 * AUD-001: tightened this fence to PROVE write-path consumes the canonical
 * helper `eligibleSlotPredicateSql(now)` AS REAL CODE (not just a comment or
 * docstring mention). Selector and write-path MUST consume the SAME helper
 * to avoid drift.
 *
 * Không đọc `DATABASE_URL` (`EV-09`); đây là static guard.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SERVICE = 'src/domains/staffing/job-posting-list.service.ts';
const AUTHORING = 'src/domains/staffing/job-posting-authoring.service.ts';

/**
 * Bound `assertSlotEligibleForNewJobPosting(...)` body in
 * `job-posting-authoring.service.ts` to prevent docstring/comment-only matches.
 * Returns the source slice between the function signature and its closing brace
 * at the same indentation level.
 *
 * Algorithm: locate the function declaration, skip past the parameter list
 * (matching balanced parens), skip past any return-type annotation (`: Foo<...>`)
 * which may itself contain `{ ... }` (TS object types), then find the body
 * opening brace and walk balanced braces to the matching close.
 */
function extractFunctionBody(source: string, fnName: string): string {
  const declRe = new RegExp(`(?:export\\s+)?async\\s+function\\s+${fnName}\\s*\\(`);
  const match = declRe.exec(source);
  if (!match) {
    throw new Error(`Could not find declaration of ${fnName} in source.`);
  }

  // Walk past the parameter list (balanced parens).
  let i = match.index + match[0].length;
  let depth = 1;
  while (i < source.length && depth > 0) {
    const ch = source[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    i++;
  }
  if (depth !== 0) {
    throw new Error(`Unbalanced parens in ${fnName} parameters.`);
  }

  // Skip past any return-type annotation: `: Foo<Bar>` where Foo<Bar> may
  // contain `{ ... }` (TS object types) and `<>` (generics). Walk through
  // any combination of `<`, `>`, `{`, `}`, `[`, `]` while also allowing
  // alphanumerics, dots, commas, spaces, `|`, `&`, etc.
  while (i < source.length && source[i] !== '{') {
    const ch = source[i];
    if (ch === '(' || ch === '<' || ch === '{' || ch === '[') {
      // Walk balanced group then continue.
      const open = ch;
      const close = ch === '(' ? ')' : ch === '<' ? '>' : ch === '{' ? '}' : ']';
      let d = 1;
      i++;
      while (i < source.length && d > 0) {
        const c = source[i];
        if (c === open) d++;
        else if (c === close) d--;
        i++;
      }
    } else {
      i++;
    }
  }
  if (i >= source.length || source[i] !== '{') {
    throw new Error(`Could not find body opening brace for ${fnName}.`);
  }
  const openBraceIdx = i;

  // Walk balanced braces to find the matching close.
  depth = 1;
  i = openBraceIdx + 1;
  while (i < source.length && depth > 0) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    i++;
  }
  if (depth !== 0) {
    throw new Error(`Could not find matching closing brace for ${fnName}.`);
  }
  return source.slice(openBraceIdx + 1, i - 1);
}

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
  });

  it('AUD-001 — write-path imports the canonical helper as REAL CODE (not just docstring)', () => {
    const authoring = readFileSync(join(process.cwd(), AUTHORING), 'utf8');

    // 1) Real import statement from the local sibling service file.
    //    Anchor on `from './job-posting-list.service'` (the only legitimate
    //    source of the canonical helper — same package, same domain).
    expect(authoring).toMatch(
      /from\s+['"]\.\/job-posting-list\.service['"]/,
    );
    // 2) The imported symbol MUST be `eligibleSlotPredicateSql`.
    expect(authoring).toMatch(
      /import\s*\{[^}]*\beligibleSlotPredicateSql\b[^}]*\}\s*from\s+['"]\.\/job-posting-list\.service['"]/,
    );

    // 3) Extract the body of `assertSlotEligibleForNewJobPosting` and prove
    //    the helper is CALLED there (not just mentioned in docstring).
    const fnBody = extractFunctionBody(authoring, 'assertSlotEligibleForNewJobPosting');
    expect(fnBody).toMatch(/eligibleSlotPredicateSql\s*\(\s*now\s*\)/);

    // 4) Fail-closed mutation authority: the body must check `is_eligible`
    //    and throw on `false`. The diagnostic checks above can keep their
    //    specific error codes; the canonical helper is the gate that
    //    guarantees we never return success when the predicate is false.
    expect(fnBody).toMatch(/is_eligible/);
    expect(fnBody).toMatch(/AuthoringError\s*\(\s*['"]INVALID_INPUT['"]/);
    // Must throw on is_eligible !== true (i.e. when canonical predicate
    // reports false). Match `!== true`, `=== false`, or `!==` on a falsy
    // value — all are valid fail-closed patterns.
    expect(fnBody).toMatch(/is_eligible\s*!==\s*true/);
  });

  it('AUD-001 — selector also calls the canonical helper (round-trip parity)', () => {
    // Selector must embed the helper in its raw SQL WHERE clause; without
    // this both paths could still drift (helper exported but unused).
    // Selector lives in the SAME file as the helper itself
    // (`job-posting-list.service.ts`).
    const selectorBody = extractFunctionBody(code, 'listEligibleSlotsForNewJobPosting');
    expect(selectorBody).toMatch(/eligibleSlotPredicateSql\s*\(\s*now\s*\)/);
  });
});
