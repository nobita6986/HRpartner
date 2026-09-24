# AUDIT — AFF-04 F-P4 Tier 3 LIGHT delta recheck (narrow on 0f5496f..c600ab3)

## 0. Identity

| Field | Value |
|---|---|
| Task slug | `hrp-v6-n2-aff-04-conversion-propagation` |
| Branch | `codex/t1b-aff04-conversion-propagation` |
| Reviewed HEAD | `c600ab3ac91affc960db9b19578c5ea3089584d9` |
| Prior audited F-P4 SHA | `0f5496fded1b5ce52deefcbb38f941df3a318931` |
| Audit delta | `0f5496f..c600ab3` |
| Pre-docs-freeze test SHA | `71440f2584f2a221b4280a3970cc95a6220e1b11` |
| Audit mode | LIGHT delta recheck (narrow) |
| Assurance lane | CRITICAL |
| Auditor | Tier 3 (F-P4 follow-up) |
| Date | 2026-09-24 |

## 1. Verdict

**PASS** — overall recheck green; correction is strictly test-only, the previously audited F-P4 PASS at `0f5496f` is preserved verbatim, and the docs/evidence freeze between `71440f2` and `c600ab3` introduces zero code drift.

## 2. Audit delta scope proof

`git diff --name-only 0f5496f..c600ab3`:

```
docs/tasks/hrp-v6-n2-aff-04-conversion-propagation/AUDIT-tier3-aff04-fp4-review.md
docs/tasks/hrp-v6-n2-aff-04-conversion-propagation/HANDOFF.md
docs/tasks/hrp-v6-n2-aff-04-conversion-propagation/TASK.md
tests/db/aff04-conversion-propagation-upgrade-path.integration.test.ts
```

### 2.1 Sub-deltas

| Sub-range | Files | Type |
|---|---|---|
| `0f5496f..71440f2` (code candidate) | 1 file: `tests/db/aff04-conversion-propagation-upgrade-path.integration.test.ts` | Test-only |
| `71440f2..c600ab3` (docs/evidence freeze) | 3 docs files (TASK.md, HANDOFF.md, AUDIT-tier3-aff04-fp4-review.md) | Docs-only |

### 2.2 Files explicitly excluded from delta

The following paths had **zero** changes in the entire `0f5496f..c600ab3` range:

- `prisma/**` (no schema, no migration files touched)
- `src/**` (no runtime/API changes)
- `app/**` (no application shell changes)
- `vitest.integration-files.ts` and any lane/selector config
- `prisma/migrations/20260923120000_aff04_conversion_propagation/**` (migration byte-identical to `0f5496f`)

Conclusion: no runtime, schema, API, security boundary, migration, or selector change. Only the test harness for the predecessor upgrade-path scenario was modified, plus a docs/evidence freeze that introduces zero code drift.

## 3. Per-commit scope verification

| SHA | Message | Files |
|---|---|---|
| `47e16d9` | test(aff04): make upgrade path runner portable | 1 test file |
| `1b5b712` | test(aff04): bind upgrade migration admin URL | 1 test file |
| `ec0bd7a` | test(aff04): seed predecessor claim with SQL | 1 test file |
| `5c6e0d9` | test(aff04): align predecessor fixtures to old schema | 1 test file |
| `71440f2` | test(aff04): assert canonical migration identity | 1 test file |
| `c600ab3` | docs(aff04): record F-P4 audit and CI portability evidence | 3 docs files |

Every code-bearing commit touches only `tests/db/aff04-conversion-propagation-upgrade-path.integration.test.ts`. The docs/evidence commit `c600ab3` touches only the three already-expected documentation artifacts.

## 4. Review of test-only correction (8 items from T0 directive)

### 4.1 Platform-specific CLI selection with `PG_PSQL_BIN` override

- `PRISMA_BIN` (lines 63-68): resolves to `node_modules/.bin/prisma.cmd` on `win32`, `prisma` on POSIX.
- `PSQL_BIN` (lines 69-73): `process.env.PG_PSQL_BIN ??` keeps the explicit Windows fallback (`C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe`) on `win32` while defaulting to `psql` on POSIX.
- Override preserved and takes precedence over the platform fallback.

Status: **SATISFIED**.

### 4.2 `DATABASE_URL` and `DATABASE_URL_ADMIN` both bound to ephemeral DB

- `applyAllMigrations` (lines 126-130): `env: { ...process.env, DATABASE_URL: ephUrl, DATABASE_URL_ADMIN: ephUrl }`.
- `applyAff04MigrationFile` (lines 154-158): identical env binding.
- Both env vars point at the same ephemeral URL — Prisma's `url` (`DATABASE_URL`) and `directUrl` (`DATABASE_URL_ADMIN`) share the ephemeral DB.

Status: **SATISFIED**.

### 4.3 Predecessor fixtures use parameterized SQL keyed to old schema

- Three `$executeRawUnsafe` insertions (lines 264-288) write into `source_claims` using only the pre-AFF-04 columns: `id, worker_id, claim_type, ctv_id, accepted, accepted_by, vendor_id, registration_channel`.
- `referrer_user_id` is intentionally NOT inserted (column drops in Step 3 ROLLBACK_AFF04_DDL).
- All inserts use `$1, $2, ...` placeholders — no inline value interpolation.

Status: **SATISFIED**.

### 4.4 No nonexistent `updated_at` column used

- Searched the test file: zero references to `updated_at` in fixtures, queries, or seed code.
- Insert columns are restricted to fields that exist in the predecessor `source_claims` schema (`worker_id, claim_type, ctv_id, accepted, accepted_by, vendor_id, registration_channel`).

Status: **SATISFIED**.

### 4.5 Raw parameters passed as variadic, correct type

- All three `$executeRawUnsafe(sql, p1, p2, ...)` calls pass the parameter list as spread args after the SQL string. Prisma forwards these to `pg` parameter positions `$1, $2, ...` in declaration order.
- No `$queryRaw`/`$executeRaw` template strings; no manual string interpolation of values into SQL.

Status: **SATISFIED**.

### 4.6 Migration identity assertion uses directory + real marker

- `path.basename(AFF04_MIGRATION_DIR) === '20260923120000_aff04_conversion_propagation'` (line 332-334).
- The test reads the migration file and asserts `expect(sql).toContain('Migration: hrp-v6-n2-aff-04-conversion-propagation')` (line 335).
- Also asserts the AFF-04 SQL still carries the narrow fail-closed predicates (`accepted CTV_REFERRAL row(s) have NULL ctv_id`, `orphan referrer_id`) and does NOT carry the removed old predicate (`FAIL: % source_claims row(s) are NOT CTV_REFERRAL`) (lines 338-344).

Status: **SATISFIED**.

### 4.7 Canonical backfill idempotency test uses narrow predicate

- The idempotency test (lines 417-430) re-runs the exact canonical backfill:
  `UPDATE source_claims SET referrer_user_id = ctv_id WHERE claim_type = 'CTV_REFERRAL' AND accepted = true AND ctv_id IS NOT NULL AND referrer_user_id IS NULL RETURNING id`.
- After the first application, returning rows = 0 (proof of idempotency AND proof that non-CTV rows are excluded by the WHERE clause).

Status: **SATISFIED**.

### 4.8 Cleanup restricted to ephemeral DB only

- `afterAll` (lines 291-306):
  - Terminates connections `WHERE datname = '${ephemeralDbName}'` (other DBs untouched).
  - Drops `DROP DATABASE IF EXISTS "${ephemeralDbName}"` against admin URL.
  - Disconnects the Prisma clients (`ephemeral`, `admin`).
- Error in cleanup is logged but never propagates (test report still stands).

Status: **SATISFIED**.

## 5. CI verification at final HEAD

### 5.1 CI provenance (two complementary runs)

| Run ID | HEAD | Job scope | Status | Evidence row |
|---|---|---|---|---|
| `35954635909` | `71440f2584f2a221b4280a3970cc95a6220e1b11` | Code-candidate (test-only correction) | Quality PASS / Integration PASS / Vercel PASS / Preview Comments PASS | HANDOFF §8 evidences test execution |
| `35954988111` | `c600ab3ac91affc960db9b19578c5ea3089584d9` | Final reviewed HEAD (post docs freeze) | Quality PASS / Integration PASS / Vercel PASS / Preview Comments PASS | T0 brief cites this for final HEAD |

Both runs are legitimate and complementary: `35954635909` proves the test-only correction executes; `35954988111` proves the docs/evidence freeze does not break the lane. Since `71440f2..c600ab3` is pure-docs (3 files, 0 code files), both runs exercise byte-identical source/test code.

### 5.2 Final-HEAD integration counts

The HANDOFF §8 evidence-row format cites `35954635909 @ 71440f2` (code candidate). T0's directive cites `35954988111 @ c600ab3` (final HEAD). Numeric data:

- Quality: PASS
- Integration: PASS — 25 files; 462 passed; 2 skipped
- Vercel: PASS
- Preview Comments: PASS

No docs-only short-circuit occurred at `c600ab3` — the full integration suite ran.

## 6. Documentation verification

### 6.1 Spec version and lane consistency

- TASK.md §0 control fields: `Spec version = v1.8`, `Assurance lane = CRITICAL`, `Status = READY_FOR_AUDIT`.
- HANDOFF.md §0: `Spec version = v1.8`, control fields mirror TASK.md.
- TASK.md §10 revision log row for `v1.8` records the F-P4 correction-and-freeze contract.

Both docs are aligned with each other and with the F-P4 audit final-freeze baseline.

### 6.2 Verifier results

- `verify-task.ps1`: `RESULT: DRAFT-VALID (1 warning(s))` — the single warning is informational (status A-04 subtype) and not blocking.
- `verify-handoff.ps1`: `RESULT: PASS` (informational note: the F-P4 metadata delta for HANDOFF §0 control fields is recorded in the revision log, not flagged as a H-15 error).

### 6.3 Artifact integrity

- `AUDIT-tier3-aff04-fp4-review.md`: stored at `docs/tasks/hrp-v6-n2-aff-04-conversion-propagation/`, present in `c600ab3`'s tree, blob hash and bytes match the worktree copy (staged verbatim).
- `AUDIT-tier3-fp3-correction-review.md` (legacy): untracked in the worktree, NOT in `c600ab3`'s tree, NOT in delivery.

### 6.4 Encoding checks

- UTF-8 no BOM: confirmed for TASK.md and HANDOFF.md.
- LF line endings only (no CRLF): confirmed (TASK.md 197 LFs, HANDOFF.md 275 LFs, 0 CRLFs).
- U+FFFD count: 0.
- Mojibake signature characters (Ã, Â, Ä, Å, Æ, Ç, È, É, Ê, Ë): 0.

## 7. Local gate re-run at final HEAD

- `npx tsc --noEmit`: exit 0.
- `npm run lint` (canonical): 0 errors, 696 warnings — IDENTICAL to `0f5496f` baseline (test-only changes do not move the project-wide warning count).
- `npx eslint . --ext .ts --max-warnings=0` (strict): 696 warnings > 0 → exit 1 (BASELINE_EQUIVALENT_NONZERO). Pre-existing strict-lint policy is not satisfied at `0f5496f` either; the F-P4 correction does not regress it.
- `vitest run --config vitest.unit.config.ts` (full unit suite): 2532 passed, 9 skipped (2541 total).
- `vitest run src/domains/staffing/transfer.routes.test.ts`: 31/31 passed.
- `vitest run src/domains/applications/application-detail-mp3.test.ts`: 16/16 passed.
- `git diff --check 0f5496f..c600ab3`: exit 0 (no whitespace/tab issues).
- `git diff --check 71440f2..c600ab3`: exit 0 (docs freeze introduces no whitespace/tab issues).

## 8. Required manual hooks (for T0/Owner only)

The following decisions are explicitly retained by T0/Owner and were NOT performed in this recheck:

- PR #35 status change (Draft → Ready) — only after this artifact reads PASS.
- Read-only aggregate preflight on the production branch gate.
- Merge, deploy, and production verification.

No source edits, no commits, no pushes, no PR/merge/deploy operations performed by Tier 3.

## 9. Findings

None blocking. One previously-noted finding (the apparent mismatch between `35954635909` and `35954988111`) is **resolved**: both runs are correct and complementary. Per T0 follow-up directive 2026-09-24, no follow-up commit is required.

## 10. Sign-off

Reviewed HEAD: `c600ab3ac91affc960db9b19578c5ea3089584d9`.
Audit delta `0f5496f..c600ab3` is acceptable under the LIGHT delta-recheck scope. The previously audited F-P4 PASS at `0f5496f` stands. PR #35 may proceed to Ready for Review pending T0 production-branch gate and read-only aggregate preflight.
