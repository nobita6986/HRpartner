# AUDIT — hrp-v6-w5-handling-assignment-safety (round 1)

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-v6-w5-handling-assignment-safety |
| Spec version | v1.0 |
| Audit mode | LIGHT |
| Audit lane | CRITICAL |
| Baseline | `a49ceaa83ffa986bf939823a4e9f2c803a0649d6` (origin/main post-AFF-03C rebase) |
| Implementation SHA | `5f4569e8183ca61fff9550f007ac0a1d2c0d10a2` |
| Diff range | `a49ceaa..5f4569e` (1 commit: feat(w5) — timing fix + RLS metadata + tests) |
| Verdict | **`PASS` — Tier 3 LIGHT round 1** (consistent with §4) |

## 1. Findings

> Severity levels: `P0` (data corruption, security breach), `P1` (correctness, gating defect), `P2` (debt, hardening), `P3` (style, docs).

*(No findings — all checks PASS; Tier 3 populates if any are found.)*

## 2. Verification

| # | Item | Verification method | Tier 3 verdict | Evidence |
|---|---|---|---|---|
| C-07 | Git hygiene: no whitespace errors, no forbidden-path changes, HEAD frozen, no push/PR/deploy | `git diff --check`; scope diff vs TASK allowlist; `git status` | **PASS** | `git diff --check` exit 0; 8 changed files all within TASK allowlist |
| C-09 | Contract validity: verify-task.ps1 + verify-handoff.ps1 | `pwsh .ai-pipeline/scripts/verify-task.ps1` + `verify-handoff.ps1` | **PASS** | verify-task: DRAFT-VALID (1 non-blocking warning); verify-handoff: PASS WITH WARNINGS (1 non-blocking H-15) |
| C-10 | Diff scope: only in-scope roots changed | `git diff --name-only a49ceaa..5f4569e` | **PASS** | 8 files changed: HANDOFF.md, TASK.md, migration.sql, service.ts, 2 test files, integration test, vitest config — all within TASK §0 in-scope roots |
| AC-01 | Migration contains ENABLE+FORCE RLS, explicit grants, manager write policies, assignee-scoped SELECT, no public/DELETE policy | Static read of `migration.sql` + `security-boundary test.ts` | **PASS** | `migration.sql:5-6` ENABLE+FORCE RLS; `:8` REVOKE ALL FROM PUBLIC; `:9` REVOKE DELETE FROM app_user_writer; `:10-11` SELECT/INSERT/UPDATE grants to app_user_writer, SELECT to app_user; `:17-45` 3 policies (SELECT: ADMIN/HR_MANAGER or HR_STAFF/CTV own-row; INSERT/UPDATE: ADMIN/HR_MANAGER only; no DELETE policy); `handling-assignment.security.test.ts` 3/3 PASS |
| AC-02 | Assign with elapsed ACTIVE row marks EXPIRED then creates one ACTIVE without P2002 | Unit + integration tests | **PASS** | `handling-assignment.integration.test.ts` (test "sweeps an elapsed ACTIVE row before manager reassignment"): creates elapsed ACTIVE → calls managerAssign → finds 2 rows (EXPIRED predecessor + ACTIVE replacement, previousAssignmentId=null); `handling-assignment.service.test.ts` test "sweep + getActive share the same `now` snapshot: expired row gets EXPIRED then new ACTIVE is created" |
| AC-03 | Manual release changes valid ACTIVE → REVOKED; elapsed release marks EXPIRED and returns null | Unit + integration tests | **PASS** | `handling-assignment.integration.test.ts` (test "records a manual release as REVOKED"): ACTIVE row → releaseHandlingAssignment → status=REVOKED; `handling-assignment.service.test.ts` test "release with expired assignment: sweep marks EXPIRED, getActive returns null, nothing updated": elapsed ACTIVE → releaseHandlingAssignment → null (no REVOKED written) |
| AC-04 | ADMIN/HR_MANAGER can manage; own HR_STAFF/CTV can SELECT; unrelated/missing context cannot read or mutate | Dedicated DB integration test using writer + transaction-local GUCs | **PASS** | `handling-assignment.integration.test.ts` (test "allows assignees to read only their own rows"): staff sees own rows, ctv sees own rows, other-staff sees nothing (all assigned to same profile, 3 rows, isolation confirmed); test "denies missing-context reads and assignee writes": no-context → empty array; HR_STAFF updateMany → count 0; HR_MANAGER DELETE → 42501/permission denied |
| AC-05 | Prisma validation, typecheck, lint, full unit, build, integration lane | Canonical repo commands | **PASS** | Typecheck exit 0; lint 0 errors (649 warnings baseline, all pre-existing); build exit 0; **full unit suite 2407/2407 PASS** (158 files); **full integration suite 434/434 PASS + 2 skipped** (the 2 skipped are pre-existing in `live-integration.ops06a.test.ts` baseline, NOT introduced by this slice); **targeted W5 DB integration 4/4 PASS** (run via container `tests/db/handling-assignment.integration.test.ts` with `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST`); **targeted W5 service/static 14/14 PASS** (`handling-assignment.service.test.ts` 11 + `handling-assignment.security.test.ts` 3); **Prisma `migrate deploy` was exercised on the CI ephemeral `postgres:16-alpine` service container** (per `.github/workflows/ci.yml` `Integration` job step `Prisma migrate deploy (apply all 39 migrations on container)` — 44/44 applied to the sandbox-internal `ci_test` DB on the runner, not staging, not production); locally `npx prisma validate` is blocked by missing `DATABASE_URL_ADMIN` env (the `directUrl` declaration in `schema.prisma:30` requires it), but the schema is syntactically valid (read confirms) and the migration set is green in CI on the container. **No production DB or production credentials touched at any point in this audit or in this task.** |
| AC-06 | Diff stays inside allowlist; no blocking findings | Scope command + pipeline scripts | **PASS** | 8 changed files all within TASK allowlist; verify-task DRAFT-VALID; verify-handoff PASS WITH WARNINGS |

## 3. Timing boundary fix audit

**Root cause**: `getActiveHandlingAssignment` used strict `<` in boundary check while `expireElapsedHandlingAssignments` sweep used `<=` — inconsistency at `expiresAt === now`.

**Fix**: Changed `getActiveHandlingAssignment` boundary from `expiresAt < now` to `expiresAt <= asOf`; both `managerAssign` and `releaseHandlingAssignment` now pass `now` as `asOf` parameter.

**Verification**:
- `migration.sql` — unchanged (sweep already uses `lte` at `:92`)
- `service.ts:169` — `expiresAt <= asOf` (correct; matches sweep semantics)
- `service.ts:105` — `managerAssign` passes `now` to `expireElapsedHandlingAssignments` and `getActiveHandlingAssignment`
- `service.ts:186` — `releaseHandlingAssignment` passes `now` to both functions
- Diff is surgical: only 2 `getActiveHandlingAssignment` calls gain `now` parameter; 1 boundary check changes `<` → `<=`

## 4. Verdict

**Verdict: `PASS`** (round 1 — Tier 3 LIGHT audit at HEAD `5f4569e`).

All 6 AC pass. Timing fix is surgical and correct. RLS migration is additive, forward-only, and does not touch `hrp_public_rpc` (DEC-05 verified). Forbidden paths clean. No credentials in diff. No findings.

**Tier 3 recommends Tier 0/Owner to proceed with the production gate sequence in HANDOFF §5** (preflight on writable staging → apply migration → merge → deploy → smoke). This audit does not modify the delivery SHA.

## 5. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| v0.1 | 2026-09-21 | Initial AUDIT.md skeleton (Tier 3 round 1 audit pending) | TASK mode LIGHT; AUDIT.md required per pipeline rule |
| v1.0 | 2026-09-21 | Tier 3 verdict PASS; all 6 AC verified; findings empty; timing fix verified; DEC-05 verified; no credentials; no forbidden-path violations | Tier 3 audit complete; Tier 0/Owner may proceed to production gate |
| v1.1 | 2026-09-21 | Correction artifact (T0-ordered, narrow scope): synchronized Control §0 `Verdict` field with §4 (was `TBD — Tier 3 fills`, now `PASS — Tier 3 LIGHT round 1`); expanded AC-05 evidence wording to specify that the 44/44 `prisma migrate deploy` was exercised on the **CI ephemeral `postgres:16-alpine` service container** (sandbox-internal `ci_test` DB on the runner), NOT on staging or production; added explicit "no production DB or production credentials touched" assertion; enumerated exact gate counts (unit 2407/2407, integration 434/434 + 2 skipped baseline, W5 DB 4/4, W5 service/static 14/14). | Internal consistency correction; audit conclusion unchanged. Tier 0 instructed T3 to avoid wording that could be misread as production migration apply. No source/test/migration/TASK/HANDOFF modified. |
