# F9-B Runtime Reproduction — 16-gate fresh-process evidence

**Date:** 2026-10-03 23:00 ICT (Sat)
**Reconciliation owner:** T0 (Tier 0)
**T0 disposition:** 2026-10-03 22:44 ICT — `CHANGES_REQUIRED / T0_RUNTIME_REPRODUCE` accepted, AC-02 contract clarified to canonical zero-row fail-closed
**Audit-target HEAD (current, not pinned in this doc):** the final commit on this branch at the moment Tier 3 reads this evidence ledger. Per T0 disposition 2026-10-03 23:00 ICT, the audit-target HEAD is recorded in the post-commit chat handback, **not** inside this document.
**Implementation SHA (final semantic SHA for F9-B, Gates 1–15):** `e68ea4a3e4521eeb794e7c051a7bea0c33ec70f5` — every runtime / semantic gate in this ledger ran at exactly this SHA on a fresh process.
**Verify-handoff SHA (the HEAD at Gate 16):** `bdd3446db2433d394587bc61777334e29d14142b` — Gate 16 is the one gate that ran after further docs correction commits, so its HEAD is recorded separately.
**Worktree:** `C:\CodeApp\HrP-worktrees\t1a-f9b-jobposting-write-boundary-hardening`
**Branch:** `codex/t1a-f9b-jobposting-write-boundary-hardening`
**Prisma CLI (canonical, --no-install):** `prisma 5.22.0`
**Synthetic DB target:** `ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech/neondb` (writer `app_user_writer` non-super non-bypassrls; admin `neondb_owner` bypassrls=true)
**Production DB target:** `ep-shy-tree-az32as2c.c-3.ap-southeast-1.aws.neon.tech/neondb` — `NOT_RUN` (counted-and-ignored, never dialed)

---

## SHA identity (full 40-char)

| Pin | Value | HEAD-at-run? |
| --- | --- | --- |
| Implementation SHA (final semantic SHA, Gates 1–15) | `e68ea4a3e4521eeb794e7c051a7bea0c33ec70f5` | YES (Gates 1–15) |
| T0 contract clarification commit (re-pinned Implementation SHA, round 0.5) | `e68ea4a3e4521eeb794e7c051a7bea0c33ec70f5` | no (round 0.5 re-pin) |
| Original Implementation SHA (pre-clarification) | `cd31696601ac9c6ce37c86b2594e9c53dd34791c` | no |
| T0 reconciliation commit | `2f1b75aab5eb8a09e48ab4d166271c370ecc8150` | no |
| T0 prior docs/evidence freeze (predecessor 2x) | `867f8882ead9d892e65c90ae1daf34d8bb8a090c` | no |
| T0 re-pin (round 0.5) | `ea4857460e42ea1bddbc3f9817f51b0908f20666` | no |
| Verify-handoff SHA (Gate 16) | `bdd3446db2433d394587bc61777334e29d14142b` | YES (Gate 16 only) |
| Subsequent docs-only pin (committed after Gate 16 ran) | `a4dfcded74c7fea425ee4e265b94ad85eaef951c` | no |
| Subsequent docs-only pin | `a7962aac7ee9eeebdb8f7ba274059f01a50736da` | no |
| Subsequent docs-only pin | `067b35eb0580790c4d4e5cf6f3c68163f9dbc56a` | no |
| Audit-target HEAD (current, recorded in chat handback) | (chat-only, not pinned in this doc) | no |
| F9 X5 docs/evidence freeze (baseline) | `1b9bbd9f809e2251b501c288bd3d63179fcb4ee7` | no |
| F9 X4 (predecessor impl) | `0d38042f7ccc41fafd12cb11de8e0d1fd3ee5c26` | no |
| F9-B planning/control delta | `e018dd0a0b2df53168f3821b682478c7bb56b432` | no |

Full chronological predecessor chain (T0-verified 2026-10-03 23:00 ICT):

```
6015361b → 5bd1a3ea → ab8845f7 → 590fd35c → 0d38042f → 1b9bbd9f → e018dd0a
  → cd316966 → 867f8882 → 2f1b75aa → e68ea4a3 → ea485746 → bdd3446d
  → a4dfcded → a7962aac → 067b35eb → 9ff3f1d2 (current audit-target HEAD, chat-only)
```

No amend / reset / rebase / force-push on `1b9bbd9f..HEAD`. Semantic surface (source, tests, prisma schema, package/lockfile, configs) between `e68ea4a3` and the current audit-target HEAD is **zero-delta** — `git diff e68ea4a3..HEAD -- app/ src/ prisma/ tests/ scripts/ packages/ 'package.json' 'pnpm-lock.yaml' 'pnpm-workspace.yaml' 'tsconfig*.json' 'vitest*.config.ts'` returns empty.

---

## Live posture probe (synthetic DB, pre-run)

Executed `scripts/probe/f9b-posture-probe.mjs` (one-shot, then removed before freeze to keep working tree clean):

```json
{
  "checks": {
    "no_broad_hr_staff_update": true,
    "function_exists": true,
    "function_search_path": "search_path=pg_catalog, public",
    "public_execute_revoked": true,
    "writer_execute_granted": true
  },
  "migrations_applied": [
    "20261003100000_f9b_slot_opening_binding_primitive",
    "20261003000001_f9_hr_staff_posting_insert_rls",
    "20261003000000_f9_hr_staff_posting_write_rls",
    "20260930090000_p1a05_hr_staff_job_openings_update_rls",
    "20260929020000_p1a04_correction_hr_staff_handling_claim_insert_rls",
    "20260929010000_p1a04_correction_recruiter_candidate_claim",
    "20260928220000_p1a04_scoped_recruiter_authority",
    "20260926120000_p1a01_jobposting_stamps",
    "20260925000000_p1a1_canonical_apply_jobpostings",
    "20260924180000_p1a0_jobposting_content_fields",
    "20260908001_job_opening_posting_split",
    "20260817080000_s1_rls_staffing_order_slots"
  ]
}
```

`hrp_f9_slots_staff_update` policy is gone; `hrp_f9b_bind_slot_to_opening` exists with pinned `search_path=pg_catalog, public`; PUBLIC EXECUTE revoked; `app_user_writer` + `neondb_owner` granted EXECUTE.

---

## Gate 1 — Synthetic DB posture (1 row)

| Field | Value |
| --- | --- |
| Run ID | POSTURE-1 |
| HEAD | `e68ea4a3e4521eeb794e7c051a7bea0c33ec70f5` (Gate 1 itself ran here; Gate 16 ran at `bdd3446db2433d394587bc61777334e29d14142b`) |
| Worktree | `C:\CodeApp\HrP-worktrees\t1a-f9b-jobposting-write-boundary-hardening` |
| Command | `node scripts/ci/assert-test-db-posture.mjs` |
| Exit | 0 |
| Output | `WRITER_POSTURE user=app_user_writer session=app_user_writer super=false bypassrls=false` / `ADMIN_POSTURE user=neondb_owner session=neondb_owner super=false bypassrls=true` / `POSTURE_OK writer_is_writer admin_is_admin same_target` |
| Evidence | `terminals/670371.txt` re-runs at HEAD `e68ea4a3` |
| Classification | CANONICAL_FINAL |

---

## Gate 2 — F9-B synthetic ×3 fresh processes (3 rows)

| Field | Value (run 1/3) | Value (run 2/3) | Value (run 3/3) |
| --- | --- | --- | --- |
| Run ID | F9B-RUN-1 | F9B-RUN-2 | F9B-RUN-3 |
| HEAD | `e68ea4a3...` | `e68ea4a3...` | `e68ea4a3...` |
| Command | `vitest.cmd run -c vitest.integration.config.ts tests/db/p1a06-f9b-jobposting-write-boundary.integration.test.ts` | same | same |
| Exit | 0 | 0 | 0 |
| Counts | 18 passed / 0 failed / 0 skipped | 18 / 0 / 0 | 18 / 0 / 0 |
| Duration | 28.71s | 28.73s | 29.32s |
| Fresh process | YES (independent PIDs) | YES | YES |
| Evidence | `terminals/670375.txt` | `terminals/670376.txt` | `terminals/670377.txt` |
| Subtests (all PASS) | AC-01 happy path; AC-02 precondition; AC-02.a-h; AC-03 race; AC-04.a-e; AC-05.a-b; residue | same | same |
| Classification | CANONICAL_FINAL | CANONICAL_FINAL | CANONICAL_FINAL |

Zero residue confirmed at end of each run via `afterAll` FK-safe reverse teardown. The full 18-test list:

- AC-01 happy path + primitive idempotent replay
- AC-02 precondition: assigned HR_STAFF can SELECT target slot
- AC-02.a HR_STAFF cannot UPDATE position_title
- AC-02.b HR_STAFF cannot UPDATE slots_needed
- AC-02.c HR_STAFF cannot UPDATE staffing_order_id (cross-order)
- AC-02.d HR_STAFF cannot arbitrarily rebind job_opening_id via UPDATE
- AC-02.e PUBLIC cannot EXECUTE hrp_f9b_bind_slot_to_opening
- AC-02.f (cross-slot bind via primitive — covered in the suite, not in the tail output but `18/18` includes it)
- AC-02.g other-recruiter HR_STAFF cannot bind Bob slot
- AC-02.h unassigned HR_STAFF (Eve) cannot bind any slot
- AC-03 two-connection revoke-before-create race → fail closed
- AC-04.a hrp_f9_slots_staff_update policy does NOT exist
- AC-04.b hrp_f9b_bind_slot_to_opening function exists
- AC-04.c PUBLIC has no EXECUTE on hrp_f9b_bind_slot_to_opening
- AC-04.d no HR_STAFF DELETE policy on staffing_order_slots
- AC-04.e no broad StaffingOrder write relaxation
- AC-05.a HR_STAFF cannot INSERT JobOpening with foreign slot
- AC-05.b HR_STAFF cannot INSERT JobOpening with assigned order + foreign slot

---

## Gate 3 — F9 original ×3 fresh processes (3 rows)

| Field | Value (run 1/3) | Value (run 2/3) | Value (run 3/3) |
| --- | --- | --- | --- |
| Run ID | F9-RUN-1 | F9-RUN-2 | F9-RUN-3 |
| HEAD | `e68ea4a3...` | `e68ea4a3...` | `e68ea4a3...` |
| Command | `vitest.cmd run -c vitest.integration.config.ts tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts` | same | same |
| Exit | 0 | 0 | 0 |
| Counts | 12 passed / 0 failed / 0 skipped | 12 / 0 / 0 | 12 / 0 / 0 |
| Duration | 25.55s | 25.14s | 24.36s |
| Fresh process | YES | YES | YES |
| Evidence | inline | inline | inline |
| Classification | CANONICAL_FINAL | CANONICAL_FINAL | CANONICAL_FINAL |

---

## Gate 4 — Predecessor DB regressions at F9-B worktree (1 row, 5 files)

| Field | Value |
| --- | --- |
| Run ID | PRED-1 |
| HEAD | `e68ea4a3...` |
| Worktree | `C:\CodeApp\HrP-worktrees\t1a-f9b-jobposting-write-boundary-hardening` (NOT sibling worktree — T0 reconciliation observation closed) |
| Command | `vitest.cmd run -c vitest.integration.config.ts tests/db/job-posting-authoring.integration.test.ts tests/db/p1a04-canonical-flow.integration.test.ts tests/db/p1a04-scoped-recruiter-authority.integration.test.ts tests/db/p1a04-r3-substantive.integration.test.ts tests/db/p1a05-job-opening-readiness.integration.test.ts` |
| Exit | 0 |
| Counts | 78 passed / 0 failed / 0 skipped (5 files) |
| Duration | 264.39s |
| Evidence | `terminals/670378.txt` |
| Classification | CANONICAL_FINAL |

Note: predecessors ran **in F9-B worktree** at Implementation SHA `e68ea4a3...`, not in the sibling worktree where the original 670361/670364 evidence was collected. This closes the EV-06 mismatch flagged in `T0_RECONCILIATION_REPORT.md` §B.

---

## Gate 5 — Required-relation sweep

| Field | Value |
| --- | --- |
| Run ID | SWEEP-1 |
| HEAD | `e68ea4a3...` |
| Command | `npx vitest run src/shared/security/required-relation-sweep.static.test.ts` |
| Exit | 0 |
| Counts | 11 passed / 0 failed / 0 skipped |
| Duration | 1.55s |
| Classification | CANONICAL_FINAL |

---

## Gate 6 — F9-B primitive static guard

| Field | Value |
| --- | --- |
| Run ID | F9B-STATIC-1 |
| HEAD | `e68ea4a3...` |
| Command | `npx vitest run src/shared/security/f9b-slot-opening-binding-primitive.static.test.ts` |
| Exit | 0 |
| Counts | 10 passed / 0 failed / 0 skipped |
| Duration | 0.42s |
| Classification | CANONICAL_FINAL |

---

## Gate 7 — Authoring unit tests

| Field | Value |
| --- | --- |
| Run ID | AUTHORING-1 |
| HEAD | `e68ea4a3...` |
| Command | `npx vitest run src/domains/staffing/job-posting-authoring.service.test.ts` |
| Exit | 0 |
| Counts | 33 passed / 0 failed / 0 skipped |
| Duration | 0.52s |
| Classification | CANONICAL_FINAL |

---

## Gate 8 — Full unit suite

| Field | Value |
| --- | --- |
| Run ID | UNIT-1 |
| HEAD | `e68ea4a3...` |
| Command | `vitest.cmd run -c vitest.unit.config.ts` |
| Exit | 0 |
| Counts | 219/219 files, 3611 passed / 0 failed / 9 skipped |
| Duration | 59.96s |
| Evidence | `terminals/670374.txt` |
| Classification | CANONICAL_FINAL |

---

## Gate 9 — Typecheck

| Field | Value |
| --- | --- |
| Run ID | TSC-1 |
| HEAD | `e68ea4a3...` |
| Command | `npx tsc --noEmit` |
| Exit | 0 |
| Diagnostics | 0 |
| Classification | CANONICAL_FINAL |

---

## Gate 10 — Lint

| Field | Value |
| --- | --- |
| Run ID | LINT-1 |
| HEAD | `e68ea4a3...` |
| Command | `npm run lint` |
| Exit | 0 |
| Errors | 0 |
| Warnings | 918 (pre-existing; baseline `c0f4dc69` UTF-8/lint baseline) |
| Classification | CANONICAL_FINAL |

---

## Gate 11 — Build

| Field | Value |
| --- | --- |
| Run ID | BUILD-1 |
| HEAD | `e68ea4a3...` |
| Command | `npm run build` |
| Exit | 0 |
| Output | Production build OK (102 kB First Load JS shared, all routes compiled) |
| Evidence | `terminals/670373.txt` |
| Classification | CANONICAL_FINAL |

---

## Gate 12 — Prisma validate (canonical `npx --no-install`)

| Field | Value |
| --- | --- |
| Run ID | PRISMA-1 |
| HEAD | `e68ea4a3...` |
| Command | `npx --no-install prisma -v && npx --no-install prisma validate` |
| Exit | 0 |
| Output | `prisma 5.22.0`; `The schema at prisma\schema.prisma is valid 🚀` |
| Classification | CANONICAL_FINAL |

The 670366 misroute (`npx prisma validate` without `--no-install`) auto-installed `prisma@8.0.0-rc.19` and produced `CLI.UNKNOWN_COMMAND`. The canonical command is `npx --no-install prisma validate` per T0 disposition 2026-10-03 22:44 ICT; bare `npx prisma validate` is FORBIDDEN at the gate level.

---

## Gate 13 — Diff check

| Field | Value |
| --- | --- |
| Run ID | DIFF-1 |
| HEAD | `e68ea4a3...` |
| Command | `git diff --check 1b9bbd9f..HEAD` + `git diff --check HEAD` |
| Exit | 0 |
| Output | No whitespace/line-ending issues |
| Classification | CANONICAL_FINAL |

---

## Gate 14 — Strict encoding

| Field | Value |
| --- | --- |
| Run ID | ENCODING-1 |
| HEAD | `e68ea4a3...` |
| Command | `verify-encoding.ps1` (changed surface) + `node .ai-pipeline/scripts/verify-encoding-range.mjs 1b9bbd9f HEAD` |
| Exit | 0 |
| Output | 15/15 text files in range `1b9bbd9f..HEAD`; 0 BOM, 0 NUL, 0 U+FFFD, 0 CRLF, 0 mojibake streaks |
| Classification | CANONICAL_FINAL |

The bare `verify-encoding-range.mjs 1b9bbd9f..HEAD` invocation fails on Node 24 (git requires `--end-of-options` for revision syntax). The two-arg form `1b9bbd9f HEAD` works; both forms are accepted by the script.

---

## Gate 15 — Verify-task

| Field | Value |
| --- | --- |
| Run ID | VERIFY-TASK-1 |
| HEAD | `e68ea4a3...` |
| Command | `pwsh -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-f9b-jobposting-write-boundary-hardening/TASK.md` |
| Exit | 0 |
| Output | `RESULT: PASS. TASK contract is ready for execution.` |
| Classification | CANONICAL_FINAL |

---

## Gate 16 — Verify-handoff

| Field | Value |
| --- | --- |
| Run ID | VERIFY-HANDOFF-1 |
| HEAD | `bdd3446db2433d394587bc61777334e29d14142b` (HEAD at gate run) |
| Command | `pwsh -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-f9b-jobposting-write-boundary-hardening/TASK.md` |
| Exit | 0 |
| Output | `RESULT: PASS WITH WARNINGS (1 warning(s))` |
| Warning | H-15: TASK.md control field "Next gate" differs from HEAD — **expected** because T0 contract clarification round 0.5 modifies control fields; recorded in HANDOFF §7 round 0.5. |
| Classification | CANONICAL_FINAL |

---

## Zero-residue verification

Each F9-B integration run runs `afterAll` FK-safe reverse teardown (deferred FKs, then reverse teardown order: `staffing_order_recruiter_assignments → job_postings → job_openings → staffing_order_slots → staffing_orders → projects → client_companies → users`). The same run-id-prefixed fixture ids are torn down; no exact-ID residue in the run-namespace. The synthetic DB retains the corrective migration `20261003100000_f9b_slot_opening_binding_primitive` and all F9/P1-A0.4/P1-A0.5/S1 migrations applied.

---

## Correction budget

| Round | Type | Used | Notes |
| --- | --- | --- | --- |
| 0 (T0 reconciliation) | docs reconciliation | not counted | `T0_RECONCILIATION_REPORT.md` only |
| 0.5 (T0 contract clarification) | T0 contract clarification / test correction | 0 of 1 (counted as T0 contract clarification, not F9-B implementation correction) | AC-02 contract pin to canonical zero-row fail-closed; GUC re-read + RLS visibility precondition |
| 1 (runtime reproduction) | n/a (no code change) | 0 of 1 | Runtime / semantic gates 1–15 PASS at Implementation SHA `e68ea4a3e4521eeb794e7c051a7bea0c33ec70f5`; Gate 16 PASS at `bdd3446db2433d394587bc61777334e29d14142b`; no semantic delta exists from `e68ea4a3` to the final audit-target HEAD |

F9-B correction budget = 1 unused (T0 contract clarification is recorded as a clarification per T0 instruction, not an implementation correction). F9 correction budget = 1 remains exhausted (immutable, predecessor).

---

## Final control state (canonical)

| Field | Value |
| --- | --- |
| Status | `READY_FOR_AUDIT` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` (16/16) |
| Audit eligibility | `ELIGIBLE` |
| Audit mode | `LIGHT` |
| Assurance lane | `CRITICAL` |
| Audit target | Implementation SHA `e68ea4a3e4521eeb794e7c051a7bea0c33ec70f5` (the final semantic SHA for F9-B; the current audit-target HEAD is recorded in the post-commit chat handback and is not pinned inside this document). Tier 3 reviews the combined final semantic SHA (X4 + F9-B) at the Implementation SHA above. |
| Next gate | `TIER3_LIGHT_AUDIT` |

---

**STOP. Hand back to T0. Awaiting Tier 3 authorization.** No push / PR / merge / deploy / amend / reset / rebase / force-push.
