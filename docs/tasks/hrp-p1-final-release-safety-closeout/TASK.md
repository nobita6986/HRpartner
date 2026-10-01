# TASK — `hrp-p1-final-release-safety-closeout`

> **TIER-1 CONTROL (rev. 4 — T0 pre-audit docs/control integrity correction 2026-10-01)**:
> This TASK.md is restructured to the canonical V1 section schema that
> `verify-task.ps1` and `verify-handoff.ps1` still hard-code. The runtime
> semantic implementation SHA `708e0ce71d258c3a70383330dfb8d5d370dbd974`
> (T0 §A.1) and the E2E ×3 PASS evidence `EV-RUN-{1,2,3}-*` (T0 §A.2) are
> carry-forward — this revision does NOT touch `app/`, `src/`, `prisma/`,
> `tests/`, `scripts/`, `packages/`, `package.json`, or `package-lock.json`
> (T0 §Stop boundary). `AUDIT.md` is owned by Tier 3 and is **not** authored
> by T1; the T1-deletion of `docs/tasks/.../AUDIT.md` is finalized and was
> committed at rev. 4 SHA `218bcbedb65a3f2d9b35cf57bb2f8f4d03151750`.
> Tier 3 will author a fresh `AUDIT.md` after this rev. 5 terminal
> control sync flips the TASK.md status to `READY_FOR_AUDIT` (terminal
> docs-only commit; no semantic delta; runtime ×3 PASS evidence
> carry-forward).
>
> Tier 3 light audit (LIGHT mode) is next per `Next gate`. Tier 0 will hand
> off to Tier 3 only after both gates return exit 0 and `git status --short`
> is empty.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-final-release-safety-closeout` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.4` (×3 fresh runs + baseline gates captured 2026-10-01; rev. 4 schema correction) |
| Work type | `CODE` (closeout / evidence freeze) |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | P1 final release-safety closeout is a release-blocking gate. Production-side remediation is owned by T0 (not in scope). |
| Status | `READY_FOR_AUDIT` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| Next gate | `TIER3_LIGHT_AUDIT` |
| Planner | `Tier 1` (T1C) |
| Baseline | `2f77399309c94732e71dd371175ab0ba4af02f57` |
| Implementation SHA | `708e0ce71d258c3a70383330dfb8d5d370dbd974` |
| Docs/evidence freeze SHA | `ae56072525a60f5e75e196c28b3d4f486b64b3a0` |
| Prior docs/update HEAD | `e09a5e2ba99ca27035461cfaf67c6543a11ad481` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| Correction batches used | `1` |
| Current execution round | `3` |
| Current audit round | `0` (Tier 3 not invoked; T0-owned; this handoff delivers READY_FOR_AUDIT) |
| In-scope roots | `scripts/runtime/**` (db-host-guard, db-posture-preflight, synthetic-fixture, exact-id-teardown, p1-final-runtime-e2e, run-p1-e2e-pipeline, run-p1-e2e.ps1); `src/domains/job-board/components/landing/featured-job-card.tsx` (BLK-02 SSR fix); `docs/tasks/hrp-p1-final-release-safety-closeout/{TASK.md,HANDOFF.md,evidence/}`. See §0.1 for cluster description. |
| Required gates | `verify-task.ps1` (exit 0); `verify-handoff.ps1` (exit 0); `npm run typecheck`; `npm run lint`; `npm run build`; `npm run test:unit`; `npx prisma validate`; `git diff --check HEAD`; `node .ai-pipeline/scripts/verify-encoding.mjs`. See §0.2 for full list and per-gate evidence file. |

### 0.1 In-scope roots

- **A — PRODUCTION-HOST HARD GUARD**: `scripts/runtime/db-host-guard.mjs`, `scripts/runtime/db-host-guard.test.mjs`.
- **A — INTEGRATION POSTURE PROOF**: `scripts/runtime/db-posture-preflight.mjs`.
- **B — SAFE FIXTURE/RESET/TEARDOWN**: `scripts/runtime/synthetic-fixture.mjs`, `scripts/runtime/exact-id-teardown.mjs`.
- **C — CANONICAL P1 RUNTIME UI/HTTP E2E**: `scripts/runtime/p1-final-runtime-e2e.mjs`, `scripts/runtime/run-p1-e2e-pipeline.mjs`, `scripts/runtime/run-p1-e2e.ps1`.
- **D — INCIDENT CLOSEOUT DOCS**: `docs/tasks/hrp-p1-final-release-safety-closeout/{TASK.md,HANDOFF.md,evidence/}`.
- **D' — PUBLIC JOB RELEASE FIX (NEW)**: `src/domains/job-board/components/landing/featured-job-card.tsx` (added `'use client'`).
- **E — DELIVERY**: forward-only commits separating semantic/test from docs/evidence freeze; no push, no PR, no T3, no merge, no deploy.

### 0.2 Required gates

| Gate | Command | Result | Evidence file |
|---|---|---|---|
| Production-host hard guard unit | `pwsh .ai-pipeline/scripts/run.mjs scripts/runtime/db-host-guard.test.mjs` | 19/19 PASS | `evidence/EV-23-guard-unit-tests.log` |
| Integration posture preflight | `node scripts/runtime/db-posture-preflight.mjs` | POSTURE_OK ×3 | `evidence/EV-RUN-{1,2,3}-posture.{stdout,stderr}` |
| Synthetic fixture bootstrap | `node scripts/runtime/synthetic-fixture.mjs` | exit 0 ×3 (exact IDs + ACTIVE recruiter assignment) | `evidence/EV-RUN-{1,2,3}-fixture.{stdout,stderr}` |
| Canonical P1 runtime E2E | `node scripts/runtime/run-p1-e2e-pipeline.mjs` | 20/20 steps PASS ×3 | `evidence/EV-RUN-{1,2,3}-e2e.{stdout,stderr}` |
| Exact-ID zero-residue teardown | `node scripts/runtime/exact-id-teardown.mjs` | residue 0/0/0/0/0 ×3 | `evidence/EV-RUN-{1,2,3}-teardown.{stdout,stderr}` |
| Prisma validate | `npx prisma validate` | exit 0 | `evidence/EV-12-prisma-validate.log` |
| Typecheck | `npm run typecheck` | exit 0 | `evidence/EV-09-typecheck.log` |
| Lint | `npm run lint` | exit 0 | `evidence/EV-10-lint.log` |
| Build | `npm run build` | exit 0 | `evidence/EV-08-build.log` |
| Unit tests | `npm run test:unit` | exit 0 (211/211 files, 3517 tests, 9 skipped, 0 failed) | `evidence/EV-11-unit-tests.log` |
| `git diff --check` | `git diff --check` | exit 0 | `evidence/EV-13-diff-check.log` |
| Strict UTF-8/no-BOM scan | `node .ai-pipeline/scripts/verify-encoding.mjs` | exit 0 (12/12 changed files OK) | `evidence/EV-14-encoding-scan.log` |
| Canonical strict integration gate | `CI_INTEGRATION_STRICT=1 npm run test:integration` | `NOT_REQUIRED` (T0 §B-01 forbids `DATABASE_URL_TEST` env name) | `evidence/EV-15-integration-contract-note.log` |

### 0.3 Forbidden paths

`prisma/schema.prisma`; `package.json`; `package-lock.json`; any historical script outside `scripts/runtime/`; production `.env*` files; production DB/migration/deploy scripts; production `ep-shy-tree-az32as2c` host; PITR forensic branches; Vercel env/deploy mutation; root worktree dirty state (T0 §B-03); `pnpm-lock.yaml`/`pnpm-workspace.yaml`; `verify-encoding.ps1`; `.editorconfig`; `docs/important`; Tier 1 `tier1.md` (out of T1C scope); `p1f1`/`p1a05`/`p1a04`/`p1f0` legacy integration lane files (T0 §B-01 forbids `DATABASE_URL_TEST`); PR #71 / PR #72 source code (T0 §B-04 read-only, no reuse).

## 1. Outcome

### 1.1 What this revision delivers

- **Public SSR blocker fixed**. `featured-job-card.tsx` now declares `'use client'`. `GET /viec-lam/SLUG` (where SLUG is the published job slug) returns HTTP 200 and renders the published job posting with the correct slug and title. Steps 7 + 17 of the canonical 20-step E2E are no longer `INFRASTRUCTURE_DEFECT`; they are PASS.
- **Recruiter-only canonical flow enforced**. Fixture now seeds an ACTIVE `StaffingOrderRecruiterAssignment` for the HR_STAFF user. E2E claim goes through `POST /api/admin/applications/SUBMISSION_ID/claim` (where SUBMISSION_ID is the application submission id) with HR session + UUID-v4 Idempotency-Key (no ADMIN SQL INSERT). Placement goes through `POST /api/admin/recruiter/placements` (no fallback to `/api/admin/placements`). Confirm/effective/cancel go through `/api/admin/recruiter/placements/PLACEMENT_ID/actions/*` (where PLACEMENT_ID is the placement id) with HR session.
- **Runtime safety + cleanup**. `docs/tasks/.tmp/` residue cleaned. `synthetic-fixture.mjs` and `run-p1-e2e-pipeline.mjs` now write into `os.tmpdir()` by default and clean up in `finally`/`process.on('exit')` so PASS and FAIL both leave `git status --short` empty.

### 1.2 Round 3 closure (T0 §F)

T0 §F mandates:

> Chỉ khi toàn bộ điều trên PASS:
> - tạo semantic commit mới;
> - tạo docs/evidence freeze;
> - pin exact SHAs;
> - Status = READY_FOR_AUDIT;
> - Frozen delivery = YES;
> - Audit eligibility = ELIGIBLE;
> - Next gate = TIER3_LIGHT_AUDIT.

This is the closing round of the closeout. Per T0 §E, final E2E ×3 ran on synthetic writer/admin pair with zero `INFRASTRUCTURE_DEFECT` and zero unexpected `EXPECTED_FAIL`. After ×3 PASS, all baseline gates PASS, then the control flipped to `READY_FOR_AUDIT`.

### 1.3 Rev. 4 — T0 pre-audit docs/control integrity correction

T0 §A..§G inspect this revision. The runtime semantic delta is empty
(`git diff --name-only 708e0ce..HEAD -- app src prisma tests scripts packages
package.json package-lock.json` is empty), so the ×3 PASS runtime evidence
remains authoritative. The correction batch is limited to:

- TASK.md / HANDOFF.md / SELF_REVIEW.md structural alignment with the
  V1 canonical schema the verifier scripts still hard-code.
- Correction of stale `Final HEAD` references pinning a previous forward-only
  docs commit (`ebc2c704…`); the corrected docs pin Implementation SHA
  `708e0ce7…` and docs/evidence freeze SHA `ae560725…`, and they refer to
  the **prior** pre-correction docs/update HEAD `e09a5e2b…` rather than to
  the SHA of this same correction commit (T0 §E anti-self-reference rule).
- Commit deletion of `docs/tasks/hrp-p1-final-release-safety-closeout/AUDIT.md`
  (already staged for deletion at pre-correction HEAD; finalized in this batch).
- Working-tree cleanup of `EV-ATTEMPT-1-*` (failure already captured in
  `TIER1_SELF_REVIEW.md` §C; the canonical ×3 evidence is `EV-RUN-{1,2,3}-*`).

### 1.4 Non-goals

- KHÔNG sửa schema, package.json, package-lock.json.
- KHÔNG touch bất kỳ historical script ngoài `scripts/runtime/**` (T0 §B-07).
- KHÔNG dùng shared `seed-*` fixture; controlled synthetic fixture bootstrap only.
- KHÔNG xóa/rebind shared slot/opening/posting; exact-ID reverse-FK teardown only.
- KHÔNG kết nối production `ep-shy-tree-az32as2c`; KHÔNG Vercel env/deploy mutation; KHÔNG PITR forensic access; KHÔNG production evidence cleanup (T0 §Production boundary).
- KHÔNG cung cấp static JWT_SECRET; launcher tự sinh per-run bằng `crypto.randomBytes(48)`, chỉ truyền cho child process env, không ghi disk/evidence.
- KHÔNG sửa baseline root worktree dirty state (T0 §B-03).
- KHÔNG dùng `DATABASE_URL_TEST` env name (T0 §B-01 forbids); canonical integration lane không được gọi tên xung đột với T0 contract.
- KHÔNG tự ý tuyên bố P1 hoàn tất; chỉ flip `READY_FOR_AUDIT` sau khi toàn bộ T0 §E + §F PASS.
- KHÔNG gọi Tier 3; KHÔNG push/PR/merge/deploy.
- KHÔNG re-run E2E/build/unit nếu docs-only correction không tạo semantic delta (T0 §Stop boundary).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `scripts/runtime/db-host-guard.mjs:60-62` — three runtime allowlist constants: `SYNTHETIC_HOST='ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech'`, `SYNTHETIC_DATABASE='neondb'`, `PROD_DENY_PREFIX='ep-shy-tree-az32as2c'`. | T0 §B-01 requires runtime allowlist as constant. |
| `EV-02` | `evidence/EV-23-guard-unit-tests.log` — 19/19 unit tests PASS. | T0 §B-05 requires unit/static proof without credentials. |
| `EV-03` | `evidence/EV-RUN-{1,2,3}-posture.{stdout,stderr}` — `POSTURE_OK` ×3 with writer `super=false bypassrls=false` + admin `super=false bypassrls=true`; same db `db-alias=693fe5919fc2`. | T0 §B-05 requires integration posture proof. |
| `EV-04` | `evidence/EV-RUN-{1,2,3}-fixture.{stdout,stderr}` — exact IDs + redacted phone aliases + ACTIVE `StaffingOrderRecruiterAssignment` row for HR_STAFF (DEC-12). | T0 §B-06 + T0 §C.3 dual-authority requirement. |
| `EV-05` | `evidence/EV-RUN-{1,2,3}-teardown.{stdout,stderr}` — residue `{users:"0", orders:"0", slots:"0", projects:"0", companies:"0"}` per run. | T0 §B-06 cleanup exact-ID. |
| `EV-06` | `evidence/EV-RUN-{1,2,3}-e2e.{stdout,stderr}` — 20-step canonical UI/HTTP E2E: Step 7/17 HTTP 200 (BLK-02 fix), Step 12 canonical claim via `POST /api/admin/applications/SUBMISSION_ID/claim` with UUID-v4 Idempotency-Key (BLK-03 fix), Step 13 placement via `POST /api/admin/recruiter/placements` (no admin fallback), Steps 14-16 confirm/effective/cancel via `/api/admin/recruiter/placements/PLACEMENT_ID/actions/*`, Step 18 workbench MINE check. | T0 §C requires canonical 20-step business proof. |
| `EV-07` | `scripts/runtime/run-p1-e2e-pipeline.mjs` — defaults `evidenceDir` to OS temp; orchestrator `process.on('exit')` cleans up the orchestrator-owned evidence dir; PASS and FAIL both leave `git status --short` empty (BLK-04 fix). | T0 §D.2..§D.3 cleanup. |
| `EV-08` | `src/domains/job-board/components/landing/featured-job-card.tsx` — added `'use client'` directive; SSR no longer fails with "Event handlers cannot be passed to Client Component props". | T0 §B BLK-02 fix. |
| `EV-09` | `evidence/TIER1_SELF_REVIEW.md` (T1 self-review; also captures the `EV-ATTEMPT-1-*` step-15 UUID-v4 first-pass failure history). | T0 §A.3 control truthfulness. |
| `EV-10` | `docs/tasks/hrp-p1-final-release-safety-closeout/{TASK.md,HANDOFF.md}` — Status `READY_FOR_AUDIT`, Frozen `YES`, Canonical `PASS`, Audit `ELIGIBLE`, Next gate `TIER3_LIGHT_AUDIT`. | T0 §A control truthfulness. |
| `EV-11` | `evidence/EV-{08,09,10,11,13,14}-*.log` — baseline gates after ×3 PASS: `npx prisma validate`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:unit`, `git diff --check`, `node .ai-pipeline/scripts/verify-encoding.mjs`. | T0 §E. |
| `EV-12` | `evidence/EV-12-prisma-validate.log` — `The schema at prisma\schema.prisma is valid`. | T0 §E. |
| `EV-13` | `evidence/EV-13-diff-check.log` — `git diff --check` exit 0. | T0 §E. |
| `EV-14` | `evidence/EV-14-encoding-scan.log` — 12/12 changed files UTF-8 without BOM (strict scan). | T0 §E + global-rules §7. |
| `EV-15` | `evidence/EV-15-integration-contract-note.log` — canonical strict integration gate is `NOT_REQUIRED` per T0 §B-01 (forbids `DATABASE_URL_TEST` env name). | T0 §B-01 + DEC-10. |
| `EV-16` | `evidence/EV-16-forward-only-commits.log` — forward-only commits separating semantic/test (`708e0ce7…`) from docs/evidence freeze (`ae560725…`). | T0 §Stop boundary. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Production-host hard guard refuses by construction. | CHOSEN (T0 §B-01) |
| `DEC-02` | Two-tier proof: guard unit tests + posture preflight. | CHOSEN (T0 §B-05) |
| `DEC-03` | Controlled synthetic fixture bootstrap with deterministic IDs + redacted phones + random in-memory passwords. | CHOSEN (T0 §B-06) |
| `DEC-04` | Exact-ID reverse-FK teardown with zero-residue assertion. | CHOSEN (T0 §B-06) |
| `DEC-05` | Canonical 20-step P1 runtime UI/HTTP E2E. | CHOSEN (T0 §C) — revised for §C BLK-03: claim/placement/actions all use canonical recruiter routes; no ADMIN fallback. |
| `DEC-06` | Cold-connect warmup before step 1. | CHOSEN (round-2 debugging) |
| `DEC-07` | Live child server: `NODE_ENV='test'` (NOT production) so the in-memory rate-limit adapter activates. | CHOSEN (T0 §B-09) |
| `DEC-08` | JWT_SECRET = `crypto.randomBytes(48).toString('hex')` per-run, set only in child process env. | CHOSEN (T0 §JWT) |
| `DEC-09` | REMOVED. The public SSR 500 is no longer tolerated as out-of-scope. The root cause (Server Component passing event handlers to Client Component props in `featured-job-card.tsx`) is fixed via `'use client'`. | SUPERSEDED — closed by §C BLK-02 |
| `DEC-10` | Canonical strict integration gate (`CI_INTEGRATION_STRICT=1 npm run test:integration`) is INTENTIONAL NOT RUN — T0 §B-01 forbids `DATABASE_URL_TEST` env name. | CHOSEN (T0 §B-01) |
| `DEC-11` | E2E launcher is `run-p1-e2e-pipeline.mjs` (Node) primary; `run-p1-e2e.ps1` is the PowerShell orchestrator alternative. | CHOSEN |
| `DEC-12` | NEW — Fixture seeds an ACTIVE `StaffingOrderRecruiterAssignment` row for the HR_STAFF user + the relevant `StaffingOrder`, with role=`HR_MANAGER_ASSIGN` and status=`ACTIVE`. This satisfies `assertActiveRecruiterForOrder` dual-authority precondition for canonical claim/placement routes. | CHOSEN (T0 §C.2) |
| `DEC-13` | NEW — Runner writes to OS temp dir by default and cleans up in `finally`/`process.on('exit')`. Existing `docs/tasks/.tmp/` residue is purged. | CHOSEN (T0 §D.2..§D.3) |
| `DEC-14` | NEW — `featured-job-card.tsx` adds `'use client'` directive so event handlers inside the component are serialized cleanly on `/viec-lam/SLUG`. | CHOSEN (T0 §B BLK-02) |
| `DEC-15` | TIER1_SELF_REVIEW.md replaces AUDIT.md; T3 owns `AUDIT.md` after the delivery is genuinely eligible. | CHOSEN (T0 §A.3) |

## 4. Contract

### 4.1 RQ — Requirements

| ID | Requirement | Source |
|---|---|---|
| `RQ-01` | Production-host hard guard refuses by construction. | T0 §B-01 |
| `RQ-02` | Two-tier runtime proof: guard unit tests + posture preflight. | T0 §B-05 |
| `RQ-03` | Controlled synthetic fixture: deterministic exact IDs + redacted phones + ACTIVE recruiter assignment. | T0 §B-06, §C.3 |
| `RQ-04` | Exact-ID reverse-FK teardown with zero-residue assertion. | T0 §B-06 |
| `RQ-05` | Canonical 20-step P1 runtime UI/HTTP E2E with step 7/17 HTTP 200 + step 12 canonical claim + step 13 recruiter placement (no admin fallback) + step 14/15/16 recruiter confirm/effective/cancel. | T0 §C |
| `RQ-06` | Pipeline ×3 PASS on synthetic writer/admin pair (zero `INFRASTRUCTURE_DEFECT`, zero unexpected `EXPECTED_FAIL`). | T0 §C, §F |
| `RQ-07` | Baseline gates PASS after ×3 PASS: prisma validate, typecheck, lint, build, test:unit, `git diff --check`, UTF-8/no-BOM scan. | T0 §E |
| `RQ-08` | Runner writes into OS temp dir + run-scoped cleanup (no `docs/tasks/.tmp/` residue). | T0 §D.2..§D.3 |
| `RQ-09` | Forward-only commits separating semantic/test from docs/evidence freeze. | T0 §Stop boundary |
| `RQ-10` | `featured-job-card.tsx` `'use client'` directive (BLK-02 SSR fix). | T0 §B BLK-02 |
| `RQ-11` | HANDOFF/TASK/SELF_REVIEW structural truthfulness (canonical T0/A after each round). | T0 §A.3 |
| `RQ-12` | Canonical strict integration gate `NOT_REQUIRED` per T0 §B-01 (DEC-10). | T0 §B-01 |

### 4.2 STEP — Execution Plan

| ID | Step |
|---|---|
| `STEP-01` | Worktree from `origin/main @ 2f77399309c94732e71dd371175ab0ba4af02f57`. |
| `STEP-02` | Hard guard. |
| `STEP-03` | Posture preflight. |
| `STEP-04` | Synthetic fixture (with DEC-12 dual-authority row). |
| `STEP-05` | Exact-ID teardown. |
| `STEP-06` | E2E launcher (with DEC-14 SSR fix + DEC-12 recruiter canonical flow). |
| `STEP-07` | Pipeline orchestrator (with DEC-13 OS-temp cleanup). |
| `STEP-08` | Baseline gates. |
| `STEP-09` | Evidence captured to `evidence/` under `docs/tasks/hrp-p1-final-release-safety-closeout/`; per-stage logs into OS temp. |
| `STEP-10` | Author TASK.md (this file) + HANDOFF.md + TIER1_SELF_REVIEW.md. Remove AUDIT.md (T3-owned). |
| `STEP-11` | Forward-only commits separating semantic/test from docs/evidence freeze. |
| `STEP-12` | T0 pre-audit docs/control integrity correction (this rev. 4): schema-align TASK/HANDOFF, fix stale `Final HEAD` pin, delete `EV-ATTEMPT-1-*` untracked artefacts, finalize AUDIT.md staged-deletion. |
| `STEP-13` | Stop boundary: hand back T0 with exact SHAs + counts + zero-residue proof + clean-tree proof. |

### 4.3 RQ → STEP → AC traceability

| RQ | STEP | AC |
|---|---|---|
| `RQ-01` | STEP-02 | AC-01 |
| `RQ-02` | STEP-02, STEP-03 | AC-01, AC-02, AC-03 |
| `RQ-03` | STEP-04 | AC-04 |
| `RQ-04` | STEP-05 | AC-05 |
| `RQ-05` | STEP-06, STEP-07 | AC-06 |
| `RQ-06` | STEP-07, STEP-08 | AC-07 |
| `RQ-07` | STEP-08 | AC-08, AC-09, AC-10, AC-11, AC-12, AC-13, AC-14 |
| `RQ-08` | STEP-07, STEP-09 | AC-06, AC-07 |
| `RQ-09` | STEP-11, STEP-12 | AC-16 |
| `RQ-10` | STEP-06, STEP-08 | AC-10, AC-11 |
| `RQ-11` | STEP-10, STEP-12 | AC-17 |
| `RQ-12` | STEP-08 | AC-15 |

## 5. Execution Plan

Per `## 4.2`. Three runtime E2E suites (`EV-RUN-1`, `EV-RUN-2`, `EV-RUN-3`)
captured 2026-10-01 against the synthetic Neon
`ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech` / `neondb`
confirmed each of:

- **Posture PASS** — writer `app_user_writer` (`rolsuper=false`,
  `rolbypassrls=false`), admin `neondb_owner` (`rolsuper=false`,
  `rolbypassrls=true`), same `current_database` (`db-alias=693fe5919fc2`).
- **Fixture bootstrap PASS** — every run's `synthetic-fixture.mjs` writes
  under `os.tmpdir()` with exact IDs + redacted phone aliases + ACTIVE
  `StaffingOrderRecruiterAssignment` (DEC-12).
- **E2E 20/20 steps PASS** — steps 1–20 per run; step 7 `GET /viec-lam/SLUG` HTTP 200 with run-scoped title/slug marker; step 12 HR_STAFF canonical claim via `POST /api/admin/applications/SUBMISSION_ID/claim` with UUID-v4 Idempotency-Key (no ADMIN SQL); step 13 HR_STAFF placement create via recruiter route (no `/api/admin/placements` fallback); step 14 `confirm` → `status=CONFIRMED`; step 15 `effective` returns fail-closed contract `400 PLACEMENT_VALIDATION_ERROR` per DEC-07 ("HRP-managed Placement KHÔNG thể chuyển EFFECTIVE trong N3 — atomic workforce bridge thuộc N4"); step 16 `cancel` → `status=CANCELLED`; step 17 `GET /viec-lam/SLUG` HTTP 200; step 18 workbench MINE reflects final handling assignments; step 19 residue counts `users=3, orders=1, slots=1, openings=1, postings=1, submissions=1, placements=1, handlingassignments=1` (pre-teardown); step 20 public tracking code + placementId linked.
- **Exact-ID teardown PASS** — residue
  `{"users":"0","orders":"0","slots":"0","projects":"0","companies":"0"}`
  per run. OS temp dir removed. No `docs/tasks/.tmp/`.
- **Zero `INFRASTRUCTURE_DEFECT`**, **zero unexpected `EXPECTED_FAIL`**.
- `git status --short` clean after each run (only matching evidence under
  `docs/tasks/hrp-p1-final-release-safety-closeout/evidence/`).

Baseline gates (`STEP-08`) all PASS — see `## 6. Acceptance` row entries
for measured results and evidence.

## 6. Acceptance

| ID | AC | Method / Evidence | Measured result |
|---|---|---|---|
| `AC-01` | Hard guard exists with T0 constants. | `git show 708e0ce7:scripts/runtime/db-host-guard.mjs`; command `pwsh .ai-pipeline/scripts/run.mjs scripts/runtime/db-host-guard.test.mjs` (output: `evidence/EV-23-guard-unit-tests.log`). | 19/19 PASS; constant pin `SYNTHETIC_HOST='ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech'`. |
| `AC-02` | 19/19 guard unit tests PASS. | `pwsh .ai-pipeline/scripts/run.mjs scripts/runtime/db-host-guard.test.mjs` (output: `evidence/EV-23-guard-unit-tests.log`). | 19/19 PASS; exit 0. |
| `AC-03` | Posture PASS ×3. | `node scripts/runtime/db-posture-preflight.mjs` (output: `evidence/EV-RUN-{1,2,3}-posture.{stdout,stderr}`). | `POSTURE_OK writer_is_writer admin_is_admin same_db=693fe5919fc2 host_alias=a1cd8463c25a` ×3; exit 0 ×3. |
| `AC-04` | Synthetic fixture PASS — exact IDs + ACTIVE recruiter assignment. | `node scripts/runtime/synthetic-fixture.mjs` (output: `evidence/EV-RUN-{1,2,3}-fixture.{stdout,stderr}`). | exit 0 ×3; admin/manager/staffUser IDs + ACTIVE `StaffingOrderRecruiterAssignment` recorded per fixture file. |
| `AC-05` | Exact-ID teardown PASS — zero residue. | `node scripts/runtime/exact-id-teardown.mjs` (output: `evidence/EV-RUN-{1,2,3}-teardown.{stdout,stderr}`). | residue `{users:"0", orders:"0", slots:"0", projects:"0", companies:"0"}` ×3; exit 0 ×3. |
| `AC-06` | E2E PASS — 20/20 steps PASS, zero `INFRASTRUCTURE_DEFECT`, zero unexpected `EXPECTED_FAIL`. | `node scripts/runtime/run-p1-e2e-pipeline.mjs` (output: `evidence/EV-RUN-{1,2,3}-e2e.{stdout,stderr}`). | 20/20 `[step-NN] PASS` lines ×3; step 7/17 `status=200 marker=ok`; step 15 fail-closed contract `400 PLACEMENT_VALIDATION_ERROR`; `[p1-e2e] OK` ×3. |
| `AC-07` | Pipeline ×3 PASS — RUN OK ×3 with zero residue ×3. | `node scripts/runtime/run-p1-e2e-pipeline.mjs` (summary output: `evidence/EV-RUN-{1,2,3}-summary.json`). | `{"posture":0,"fixture":0,"e2e":0,"teardown":0,...}` ×3. |
| `AC-08` | Typecheck PASS. | `npm run typecheck` (output: `evidence/EV-09-typecheck.log`). | exit 0. |
| `AC-09` | Lint PASS. | `npm run lint` (output: `evidence/EV-10-lint.log`). | exit 0 (0 errors; pre-existing warnings). |
| `AC-10` | Build PASS. | `npm run build` (output: `evidence/EV-08-build.log`). | exit 0, Next.js 15.5.23 build OK. |
| `AC-11` | Unit PASS. | `npm run test:unit` (output: `evidence/EV-11-unit-tests.log`). | exit 0 — 211/211 files, 3517 tests passed, 9 skipped, 0 failed. |
| `AC-12` | Prisma validate PASS. | `npx prisma validate` (output: `evidence/EV-12-prisma-validate.log`). | exit 0 — `The schema at prisma\schema.prisma is valid`. |
| `AC-13` | Git diff check PASS. | `git diff --check HEAD` (output: `evidence/EV-13-diff-check.log`). | exit 0 (no whitespace errors). |
| `AC-14` | UTF-8 scan PASS (strict UTF-8 without BOM). | `node .ai-pipeline/scripts/verify-encoding.mjs` (output: `evidence/EV-14-encoding-scan.log`). | exit 0 — 12/12 changed files OK. |
| `AC-15` | Canonical strict integration gate NOT RUN — DEC-10 contract decision. | `pwsh -NoProfile -Command "Write-Output 'integration gate: NOT_REQUIRED (T0 §B-01 forbids DATABASE_URL_TEST env name); DEC-10'; exit 0"` (log: `evidence/EV-15-integration-contract-note.log`). | `NOT_REQUIRED` — T0 §B-01 forbids `DATABASE_URL_TEST` env name. |
| `AC-16` | Forward-only commits + stop boundary. | `git log --oneline 2f773993..708e0ce7`; `git log --oneline 708e0ce7..ae560725` (output: `evidence/EV-16-forward-only-commits.log`). | Implementation SHA `708e0ce7…` then docs/evidence freeze `ae560725…`; no amend, no rebase, no force-push. |
| `AC-17` | TASK.md + HANDOFF.md + `evidence/TIER1_SELF_REVIEW.md` exist; `AUDIT.md` deleted (T3-owned). | `git ls-files docs/tasks/hrp-p1-final-release-safety-closeout/`; `git ls-files docs/tasks/hrp-p1-final-release-safety-closeout/AUDIT.md` (expect absent). | TASK.md + HANDOFF.md + TIER1_SELF_REVIEW.md tracked; AUDIT.md not in tree. |

## 7. Risk

| ID | Risk | Mitigation |
|---|---|---|
| `RISK-01` | Production host connection by mistake. | Hard guard refuses by construction (DEC-01). |
| `RISK-02` | Forbidden env name leak. | Guard rejects with `FORBIDDEN_ENV`. |
| `RISK-03` | Fixture bootstrap mutates shared seeded users. | Controlled synthetic fixture. |
| `RISK-04` | Teardown FK violation on `placement_case → labor_profiles` (RESTRICT). | Reverse-FK order. |
| `RISK-05` | Prisma cold-connect 500 from child `next start` server. | Cold-connect warmup (DEC-06). |
| `RISK-06` | Public `/viec-lam/[slug]` SSR 500. | FIXED via DEC-14 (`'use client'`). |
| `RISK-07` | Canonical strict integration gate misreads closeout as failed. | DEC-10 — NOT_REQUIRED. |
| `RISK-08` | Baseline build fails on clean `origin/main`. | Pre-checked baseline. |
| `RISK-09` | T0 contract says no PR + no T3 call. | Forward-only commits; no push; no PR; no merge/deploy. |
| `RISK-10` | Recruiter route 404 NO_ACTIVE_ASSIGNMENT on first run. | DEC-12 — fixture seeds ACTIVE `StaffingOrderRecruiterAssignment` row. |
| `RISK-11` | E2E runner leaves dirty state on FAIL. | DEC-13 — OS temp + `finally`/`process.on('exit')` cleanup. |
| `RISK-12` | V1 verifier template section-list rejected V2 schema (V1 carry-forward). | Rev. 4 — TASK.md/HANDOFF.md aligned to the V1 canonical schema headings the verifier scripts hard-code (`## 5. Execution Plan`, `## 6. Acceptance`, `## 7. Risk`, `## 8. Open Questions`, `## 9. Planner Resolution`, `## 10. Revision Log`). |

## 8. Open Questions

NONE — all Owner decisions closed. T0 directive §B-01..§B-09 + §C + §Stop
boundary fully locks Đường B; no new Owner decision required; canonical main
architecture is the only authority (DEC-01..DEC-15 close all decisions).

## 9. Planner Resolution

- Round 1 (initial implementation) — 11 scripts in `scripts/runtime/`.
- Round 2 (cold-connect warmup fix) — observed step-1 `INVALID_CREDENTIALS` 401. Fix: `waitForBoot()` requires Prisma 200/404.
- Round 3 (T0 §F closure) — three P1 release blockers (BLK-02, BLK-03, BLK-04) closed. SSR fix, recruiter canonical flow, OS-temp cleanup. Verified by ×3 fresh runs.
- Round 4 (T0 pre-audit docs/control integrity correction) — TASK.md / HANDOFF.md aligned to the V1 canonical schema the verifier scripts still hard-code; stale `Final HEAD` pin replaced with the correct SHA trio (Implementation `708e0ce7…` / docs/evidence freeze `ae560725…` / prior docs/update HEAD `e09a5e2b…`); AUDIT.md deletion staged-deletion finalized; `EV-ATTEMPT-1-*` removed from working tree (failure already captured in TIER1_SELF_REVIEW.md). No semantic delta vs `708e0ce7…`.

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-01` | Initial TASK.md authored. Status `READY_FOR_AUDIT`. | T0 directive §B-01..§B-09 + §C + §Stop boundary locks Đường B. |
| `v1.1` | `2026-10-01` | Status flipped to `BLOCKED`; `AUDIT.md` removed (T3-owned); SSR fix + recruiter canonical flow + OS-temp cleanup applied; DEC-09 SUPERSEDED; DEC-12/13/14 added; BLK-01..BLK-04 enumerated. | T0 §F rejections: 54 PASS + 6 HTTP 500 ≠ 60/60 business PASS; ADMIN fallback after HR_STAFF login forbidden; `docs/tasks/.tmp/` residue forbidden. |
| `v1.2` | `2026-10-01` | Step 15 payload fix: `clientAcknowledgedByUserId` switched from `adminUserId` (fixture ID shape `rt-e2e-TOKEN-ROLE`, not UUID v4) to `randomUUID()`. Server-side `z.string().refine(isUuidV4, …)` at the canonical recruiter effective-action route handler requires UUID v4; service-side `markPlacementEffective` stores it as opaque acknowledgement identifier (no FK to users). After schema pass, HRP_MANAGED still fails closed per DEC-07 → 400 `PLACEMENT_VALIDATION_ERROR`; step 16 cancel unaffected. | T0 §C.5 + Step 15 first-pass failure (see `EV-ATTEMPT-1-e2e.stderr`). |
| `v1.3` | `2026-10-01` | Stale `EV-RUN-1-*` evidence renamed to `EV-ATTEMPT-1-*` and EXCLUDED from final ×3 evidence. | T0 §B (×3 final runs must be PASS runs, not attempt runs). |
| `v1.4` | `2026-10-01` | Fresh `EV-RUN-1/2/3-*` ×3 PASS captured (20/20 steps, posture/fixture/e2e/teardown all `0`, residue `users=0/orders=0/slots=0/projects=0/companies=0` per run). Step 15 fail-closed contract confirmed (400 `PLACEMENT_VALIDATION_ERROR` "HRP-managed Placement KHÔNG thể chuyển EFFECTIVE trong N3 — atomic workforce bridge thuộc N4"). Step 17 HTTP 200 + run-scoped marker. Baseline gates PASS: `npx prisma validate`, `tsc --noEmit`, `eslint .`, `next build`, `vitest run --config vitest.unit.config.ts` (211/211 files, 3517 tests), `git diff --check`, `node verify-encoding.mjs` (12/12 files UTF-8 no BOM). Status flipped to `READY_FOR_AUDIT` after ×3 PASS. Implementation SHA pinned. | T0 §E + §F closure: 3 final runs PASS, all blockers + audit calls. |
| `v1.4` (rev. 5 — terminal control sync) | `2026-10-01 21:57 ICT` | Terminal control sync — TASK.md §0 Status flipped to `READY_FOR_AUDIT` (was `READY_FOR_EXECUTION`); AUDIT.md staged-deletion prose corrected to record that the deletion was committed at rev. 4 SHA `218bcbedb65a3f2d9b35cf57bb2f8f4d03151750`; Tier 3 will author a fresh AUDIT.md after this status flip. Docs-only commit; no semantic delta; runtime ×3 PASS evidence carry-forward from rev. 4. HANDOFF.md, source, tests, scripts, evidence runtime and SHA pins untouched. | T0 terminal control sync directive: TASK.md and HANDOFF.md must both report Status = READY_FOR_AUDIT before Tier 3 is invoked; rev. 5 closes that mismatch without touching HANDOFF.md or runtime evidence. |
| `v1.4` (rev. 4 — docs/control correction) | `2026-10-01 18:30 ICT` | T0 pre-audit docs/control integrity correction: TASK.md / HANDOFF.md aligned to the V1 canonical schema the verifier scripts hard-code; `## 5. Execution Plan`, `## 6. Acceptance`, `## 7. Risk`, `## 8. Open Questions`, `## 9. Planner Resolution`, `## 10. Revision Log` re-introduced; RQ-01..RQ-12 + RQ → STEP → AC traceability added; `In-scope roots` and `Required gates` rows added to `## 0. Control`; `Contract gate` cell reduced to exact `READY_TO_CODE`; stale `Final HEAD` SHA `ebc2c704…` removed; replaced with `Docs/evidence freeze SHA ae560725…` + `Prior docs/update HEAD e09a5e2b…` rows; `AUDIT.md` deletion finalized; `EV-ATTEMPT-1-*` working-tree artefacts removed. Spec version retained as `v1.4` because no semantic delta was introduced — this revision is docs/control-only per T0 §A.1. | T0 §A..§G corrections. Carry-forward from `v1.4` implementation + freeze is authoritative; verifier scripts still hard-code the V1 canonical schema, so docs/evidence must conform. |