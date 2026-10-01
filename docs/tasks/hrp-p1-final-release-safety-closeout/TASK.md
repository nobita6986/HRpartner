# TASK — `hrp-p1-final-release-safety-closeout`

> **TIER-1 CONTROL (rev. 2 — T0 §F rejections 2026-10-01)**: this delivery is
> `BLOCKED` because the previous handoff claimed `READY_FOR_AUDIT` while the
> canonical gates were `FAIL` (P1 release blockers, see §1.2). The new
> evidence is in `evidence/TIER1_SELF_REVIEW.md`. `AUDIT.md` is **NOT**
> authored by T1; Tier 3 owns the canonical audit verdict after the
> delivery is genuinely eligible.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-final-release-safety-closeout` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.4` (×3 fresh runs + baseline gates captured 2026-10-01) |
| Work type | `CODE` (closeout / evidence freeze) |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | P1 final release-safety closeout is a release-blocking gate. Production-side remediation is owned by T0 (not in scope). |
| Status | **`READY_FOR_AUDIT`** |
| Frozen delivery | **`YES`** |
| Canonical gates | **`PASS`** |
| Audit eligibility | `ELIGIBLE` |
| Next gate | `TIER3_LIGHT_AUDIT` |
| Planner | `Tier 1` (T1C) |
| Baseline | `origin/main @ 2f77399309c94732e71dd371175ab0ba4af02f57` |
| Implementation SHA | `708e0ce71d258c3a70383330dfb8d5d370dbd974` |
| Contract gate | `READY_TO_CODE` (round-3 blockers closed) |
| Decision state | `CLOSED` (T0 directive §B-01..§B-09 fully locks Đường B; no new Owner decision; canonical main architecture is the only authority) |
| Test environment | `READY` (synthetic Neon `ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech` / `neondb` provisioned by T0; canonical strict gate is intentionally not invoked because T0 §B-01 forbids `DATABASE_URL_TEST` env name — see HANDOFF §3 contract note) |
| Correction budget | `1` |
| Correction batches used | `1` (round-2 cold-connect; round-3 closed by T0 §F) |
| Current execution round | `3` |
| Current audit round | `0` (Tier 3 not invoked; T0-owned; this handoff delivers READY_FOR_AUDIT) |

### 0.1 In-scope roots

**A — PRODUCTION-HOST HARD GUARD**: `scripts/runtime/db-host-guard.mjs`, `scripts/runtime/db-host-guard.test.mjs`. **A — INTEGRATION POSTURE PROOF**: `scripts/runtime/db-posture-preflight.mjs`. **B — SAFE FIXTURE/RESET/TEARDOWN**: `scripts/runtime/synthetic-fixture.mjs`, `scripts/runtime/exact-id-teardown.mjs`. **C — CANONICAL P1 RUNTIME UI/HTTP E2E**: `scripts/runtime/p1-final-runtime-e2e.mjs`, `scripts/runtime/run-p1-e2e-pipeline.mjs`, `scripts/runtime/run-p1-e2e.ps1`. **D — INCIDENT CLOSEOUT DOCS**: `docs/tasks/hrp-p1-final-release-safety-closeout/{TASK.md,HANDOFF.md,evidence/}` (`AUDIT.md` removed — T3-owned). **D' — PUBLIC JOB RELEASE FIX (NEW)**: `src/domains/job-board/components/landing/featured-job-card.tsx` (added `'use client'`). **E — DELIVERY**: forward-only commits separating semantic/test from docs/evidence freeze; no push, no PR, no T3, no merge, no deploy.

### 0.2 Forbidden paths

`prisma/schema.prisma`; `package.json`; `package-lock.json`; any historical script outside `scripts/runtime/`; production `.env*` files; production DB/migration/deploy scripts; production `ep-shy-tree-az32as2c` host; PITR forensic branches; Vercel env/deploy mutation; root worktree dirty state (T0 §B-03); `pnpm-lock.yaml`/`pnpm-workspace.yaml`; `verify-encoding.ps1`; `.editorconfig`; `docs/important`; Tier 1 `tier1.md` (out of T1C scope); `p1f1`/`p1a05`/`p1a04`/`p1f0` legacy integration lane files (T0 §B-01 forbids `DATABASE_URL_TEST`); PR #71 / PR #72 source code (T0 §B-04 read-only, no reuse).

## 1. Outcome

### 1.1 What this revision delivers

- **Public SSR blocker fixed**. `featured-job-card.tsx` now declares `'use client'`. `GET /viec-lam/<published-slug>` returns HTTP 200 and renders the published job posting with the correct slug and title. Steps 7 + 17 of the canonical 20-step E2E are no longer `INFRASTRUCTURE_DEFECT`; they are PASS.
- **Recruiter-only canonical flow enforced**. Fixture now seeds an ACTIVE `StaffingOrderRecruiterAssignment` for the HR_STAFF user. E2E claim goes through `POST /api/admin/applications/<submissionId>/claim` with HR session + UUID-v4 Idempotency-Key (no ADMIN SQL INSERT). Placement goes through `POST /api/admin/recruiter/placements` (no fallback to `/api/admin/placements`). Confirm/effective/cancel go through `/api/admin/recruiter/placements/<id>/actions/*` with HR session.
- **Runtime safety + cleanup**. `docs/tasks/.tmp/` residue cleaned. `synthetic-fixture.mjs` and `run-p1-e2e-pipeline.mjs` now write into `os.tmpdir()` by default and clean up in `finally`/`process.on('exit')` so PASS and FAIL both leave `git status --short` empty.

### 1.2 What is still blocking (T0 §F findings)

| ID | Class | Blocker |
|---|---|---|
| `BLK-01` | Control | Previous handoff claimed `READY_FOR_AUDIT` while gates were FAIL → Status reset to `BLOCKED` |
| `BLK-02` | Public job | `GET /viec-lam/<slug>` returned HTTP 500 → fixed (see §1.1) — REPRODUCE ×3 |
| `BLK-03` | Recruiter flow | HR_STAFF used ADMIN SQL/API fallback after login → fixed (see §1.1) — REPRODUCE ×3 |
| `BLK-04` | Cleanup | E2E runner dirtied `docs/tasks/.tmp/` → fixed (see §1.1) — VERIFY ×3 |

### 1.3 Round 3 closure (T0 §F)

T0 §F mandates:

> Chỉ khi toàn bộ điều trên PASS:
> - tạo semantic commit mới;
> - tạo docs/evidence freeze;
> - pin exact SHAs;
> - Status = READY_FOR_AUDIT;
> - Frozen delivery = YES;
> - Audit eligibility = ELIGIBLE;
> - Next gate = TIER3_LIGHT_AUDIT.

This is the closing round of the closeout. Per T0 §E, final E2E ×3 must run
on synthetic writer/admin pair with zero `INFRASTRUCTURE_DEFECT` and zero
unexpected `EXPECTED_FAIL`. After ×3 PASS, all baseline gates must PASS,
then the control flips to `READY_FOR_AUDIT`.

### 1.4 Non-goals

- KHÔNG sửa schema, package.json, package-lock.json.
- KHÔNG touch bất kỳ historical script nào ngoài `scripts/runtime/**` (T0 §B-07).
- KHÔNG dùng shared `seed-*` fixture; controlled synthetic fixture bootstrap only.
- KHÔNG xóa/rebind shared slot/opening/posting; exact-ID reverse-FK teardown only.
- KHÔNG kết nối production `ep-shy-tree-az32as2c`; KHÔNG Vercel env/deploy mutation; KHÔNG PITR forensic access; KHÔNG production evidence cleanup (T0 §Production boundary).
- KHÔNG cung cấp static JWT_SECRET; launcher tự sinh per-run bằng `crypto.randomBytes(48)`, chỉ truyền cho child process env, không ghi disk/evidence.
- KHÔNG sửa baseline root worktree dirty state (T0 §B-03).
- KHÔNG dùng `DATABASE_URL_TEST` env name (T0 §B-01 forbids); canonical integration lane không được gọi tên xung đột với T0 contract.
- KHÔNG tự ý tuyên bố P1 hoàn tất; chỉ flip `READY_FOR_AUDIT` sau khi toàn bộ T0 §E + §F PASS.
- KHÔNG gọi Tier 3; KHÔNG push/PR/merge/deploy.

## 2. Evidence (revised)

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `scripts/runtime/db-host-guard.mjs:60-62` — three runtime allowlist constants: `SYNTHETIC_HOST='ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech'`, `SYNTHETIC_DATABASE='neondb'`, `PROD_DENY_PREFIX='ep-shy-tree-az32as2c'`. | T0 §B-01 requires runtime allowlist as constant. |
| `EV-02` | `scripts/runtime/db-host-guard.test.mjs` — 19/19 unit tests PASS. | T0 §B-05 requires unit/static proof without credentials. |
| `EV-03` | `scripts/runtime/db-posture-preflight.mjs` — `POSTURE_OK` ×3 with writer `super=false bypassrls=false` + admin `super=false bypassrls=true`; same db. | T0 §B-05 requires integration posture proof. |
| `EV-04` | `scripts/runtime/synthetic-fixture.mjs` writes fixture JSON under `os.tmpdir()` with exact IDs + redacted phone aliases + ACTIVE `StaffingOrderRecruiterAssignment` row for HR_STAFF (DEC-12). | T0 §B-06 + T0 §C.3 dual-authority requirement. |
| `EV-05` | `scripts/runtime/exact-id-teardown.mjs` — reverse-FK order, zero-residue assertion. | T0 §B-06 cleanup exact-ID. |
| `EV-06` | `scripts/runtime/p1-final-runtime-e2e.mjs` — 20-step canonical UI/HTTP E2E with: Step 7/17 HTTP 200 (BLK-02 fix), Step 12 canonical claim via `POST /api/admin/applications/<id>/claim` + UUID-v4 Idempotency-Key (BLK-03 fix), Step 13 placement via `POST /api/admin/recruiter/placements` (no admin fallback), Steps 14-16 confirm/effective/cancel via `/api/admin/recruiter/placements/<id>/actions/*`, Step 18 workbench MINE check. | T0 §C requires canonical 20-step business proof. |
| `EV-07` | `scripts/runtime/run-p1-e2e-pipeline.mjs` — defaults `evidenceDir` to OS temp; orchestrator `process.on('exit')` cleans up the orchestrator-owned evidence dir; PASS and FAIL both leave `git status --short` empty (BLK-04 fix). | T0 §D.2..§D.3 cleanup. |
| `EV-08` | `src/domains/job-board/components/landing/featured-job-card.tsx` — added `'use client'` directive; SSR no longer fails with "Event handlers cannot be passed to Client Component props". | T0 §B BLK-02 fix. |
| `EV-09` | `docs/tasks/hrp-p1-final-release-safety-closeout/evidence/TIER1_SELF_REVIEW.md` (T1 self-review of the change; `AUDIT.md` removed — T3-owned). | T0 §A.3 control truthfulness. |
| `EV-10` | `docs/tasks/hrp-p1-final-release-safety-closeout/{TASK.md,HANDOFF.md}` — Status `BLOCKED / Frozen=NO / Canonical=FAIL / Audit=NOT_ELIGIBLE / Next=T0_RUNTIME_REPRODUCE`. | T0 §A control truthfulness. |
| `EV-11` | Baseline gates after ×3 PASS: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:unit`, `npx prisma validate`, `git diff --check`, `node .ai-pipeline/scripts/verify-encoding.mjs scripts/runtime`. | T0 §E. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Production-host hard guard refuses by construction. | CHOSEN (T0 §B-01) |
| `DEC-02` | Two-tier proof: guard unit tests + posture preflight. | CHOSEN (T0 §B-05) |
| `DEC-03` | Controlled synthetic fixture bootstrap with deterministic IDs + redacted phones + random in-memory passwords. | CHOSEN (T0 §B-06) |
| `DEC-04` | Exact-ID reverse-FK teardown with zero-residue assertion. | CHOSEN (T0 §B-06) |
| `DEC-05` | Canonical 20-step P1 runtime UI/HTTP E2E. | CHOSEN (T0 §C) — **revised for §C BLK-03**: claim/placement/actions all use canonical recruiter routes; no ADMIN fallback |
| `DEC-06` | Cold-connect warmup before step 1. | CHOSEN (round-2 debugging) |
| `DEC-07` | Live child server: `NODE_ENV='test'` (NOT production) so the in-memory rate-limit adapter activates. | CHOSEN (T0 §B-09) |
| `DEC-08` | JWT_SECRET = `crypto.randomBytes(48).toString('hex')` per-run, set only in child process env. | CHOSEN (T0 §JWT) |
| `DEC-09` | **REMOVED**. The public SSR 500 is no longer tolerated as out-of-scope. The root cause (Server Component passing event handlers to Client Component props in `featured-job-card.tsx`) is fixed via `'use client'`. | **SUPERSEDED — closed by §C BLK-02** |
| `DEC-10` | Canonical strict integration gate (`CI_INTEGRATION_STRICT=1 npm run test:integration`) is INTENTIONAL NOT RUN — T0 §B-01 forbids `DATABASE_URL_TEST` env name. | CHOSEN (T0 §B-01) |
| `DEC-11` | E2E launcher is `run-p1-e2e-pipeline.mjs` (Node) primary; `run-p1-e2e.ps1` is the PowerShell orchestrator alternative. | CHOSEN |
| `DEC-12` | **NEW** Fixture seeds an ACTIVE `StaffingOrderRecruiterAssignment` row for the HR_STAFF user + the relevant `StaffingOrder`, with role=`HR_MANAGER_ASSIGN` and status=`ACTIVE`. This satisfies `assertActiveRecruiterForOrder` dual-authority precondition for canonical claim/placement routes. | CHOSEN (T0 §C.2) |
| `DEC-13` | **NEW** Runner writes to OS temp dir by default and cleans up in `finally`/`process.on('exit')`. Existing `docs/tasks/.tmp/` residue is purged. | CHOSEN (T0 §D.2..§D.3) |
| `DEC-14` | **NEW** `featured-job-card.tsx` adds `'use client'` directive so event handlers inside the component are serialized cleanly on `/viec-lam/[slug]`. | CHOSEN (T0 §B BLK-02) |

## 4. Contract

### 4.1 STEP

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
| `STEP-10` | Author TASK.md (this file) + HEADOFF.md + TIER1_SELF_REVIEW.md. Remove AUDIT.md (T3-owned). |
| `STEP-11` | Forward-only commits separating semantic/test from docs/evidence freeze. |
| `STEP-12` | Stop boundary: hand back T0 with exact SHAs + counts + zero-residue proof + clean-tree proof. |

### 4.2 AC — Acceptance Criteria

| ID | AC |
|---|---|
| `AC-01` | Hard guard exists with T0 constants. |
| `AC-02` | 19/19 guard unit tests PASS. |
| `AC-03` | Posture PASS. |
| `AC-04` | Synthetic fixture PASS — exact IDs + ACTIVE recruiter assignment. |
| `AC-05` | Exact-ID teardown PASS — zero residue. |
| `AC-06` | E2E PASS — 20/20 steps PASS, **zero `INFRASTRUCTURE_DEFECT`**, **zero unexpected `EXPECTED_FAIL`**. |
| `AC-07` | Pipeline ×3 PASS — RUN OK ×3 with zero residue ×3. |
| `AC-08` | Typecheck PASS. |
| `AC-09` | Lint PASS. |
| `AC-10` | Build PASS. |
| `AC-11` | Unit PASS. |
| `AC-12` | Prisma validate PASS. |
| `AC-13` | Git diff check PASS. |
| `AC-14` | UTF-8 scan PASS (strict UTF-8 without BOM). |
| `AC-15` | Canonical strict integration gate NOT RUN — DEC-10 contract decision. |
| `AC-16` | Forward-only commits + stop boundary. |
| `AC-17` | TASK.md + HANDOFF.md + `evidence/TIER1_SELF_REVIEW.md` exist. **AUDIT.md removed** (T3-owned). |

## 5. Risk

| ID | Risk | Mitigation |
|---|---|---|
| `RISK-01` | Production host connection by mistake. | Hard guard refuses by construction (DEC-01). |
| `RISK-02` | Forbidden env name leak. | Guard rejects with `FORBIDDEN_ENV`. |
| `RISK-03` | Fixture bootstrap mutates shared seeded users. | Controlled synthetic fixture. |
| `RISK-04` | Teardown FK violation on `placement_case → labor_profiles` (RESTRICT). | Reverse-FK order. |
| `RISK-05` | Prisma cold-connect 500 from child `next start` server. | Cold-connect warmup (DEC-06). |
| `RISK-06` | Public `/viec-lam/[slug]` SSR 500. | **FIXED** via DEC-14 (`'use client'`). |
| `RISK-07` | Canonical strict integration gate misreads closeout as failed. | DEC-10 — NOT_RUN. |
| `RISK-08` | Baseline build fails on clean `origin/main`. | Pre-checked baseline. |
| `RISK-09` | T0 contract says no PR + no T3 call. | Forward-only commits; no push; no PR; no merge/deploy. |
| `RISK-10` | Recruiter route 404 NO_ACTIVE_ASSIGNMENT on first run. | DEC-12 — fixture seeds ACTIVE `StaffingOrderRecruiterAssignment` row. |
| `RISK-11` | E2E runner leaves dirty state on FAIL. | DEC-13 — OS temp + `finally`/`process.on('exit')` cleanup. |

## 6. Planner Resolution

- Round 1 (initial implementation) — 11 scripts in `scripts/runtime/`.
- Round 2 (cold-connect warmup fix) — observed step-1 `INVALID_CREDENTIALS` 401. Fix: `waitForBoot()` requires Prisma 200/404.
- Round 3 (T0 §F closure) — three P1 release blockers (BLK-02, BLK-03, BLK-04) closed. SSR fix, recruiter canonical flow, OS-temp cleanup. Ready for ×3 verification.

## 7. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-01` | Initial TASK.md authored. Status `READY_FOR_AUDIT`. | T0 directive §B-01..§B-09 + §C + §Stop boundary locks Đường B. |
| `v1.1` | `2026-10-01` | Status flipped to `BLOCKED`; `AUDIT.md` removed (T3-owned); SSR fix, recruiter canonical flow, OS-temp cleanup applied; DEC-09 SUPERSEDED; DEC-12/13/14 added; BLK-01..BLK-04 enumerated. | T0 §F rejections: 54 PASS + 6 HTTP 500 ≠ 60/60 business PASS; ADMIN fallback after HR_STAFF login forbidden; `docs/tasks/.tmp/` residue forbidden. |
| `v1.2` | `2026-10-01` | Step 15 payload fix: `clientAcknowledgedByUserId` switched from `adminUserId` (fixture ID shape `rt-e2e-<token>-<role>`, not UUID v4) to `randomUUID()`. Server-side `z.string().refine(isUuidV4, …)` at `app/api/admin/recruiter/placements/[id]/actions/effective/route.ts:43` requires UUID v4; service-side `markPlacementEffective` stores it as opaque acknowledgement identifier (no FK to users). After schema pass, HRP_MANAGED still fails closed per DEC-07 → 400 `PLACEMENT_VALIDATION_ERROR`; step 16 cancel unaffected. | T0 §C.5 + Step 15 first-pass failure (see `EV-ATTEMPT-1-e2e.stderr`). |
| `v1.3` | `2026-10-01` | Stale `EV-RUN-1-*` evidence renamed to `EV-ATTEMPT-1-*` and EXCLUDED from final ×3 evidence. | T0 §B (×3 final runs must be PASS runs, not attempt runs). |
| `v1.4` | `2026-10-01` | Fresh `EV-RUN-1/2/3-*` ×3 PASS captured (20/20 steps, posture/fixture/e2e/teardown all `0`, residue `users=0/orders=0/slots=0/projects=0/companies=0` per run). Step 15 fail-closed contract confirmed (400 `PLACEMENT_VALIDATION_ERROR` "HRP-managed Placement KHÔNG thể chuyển EFFECTIVE trong N3 — atomic workforce bridge thuộc N4"). Step 17 HTTP 200 + run-scoped marker. Baseline gates PASS: `npx prisma validate`, `tsc --noEmit`, `eslint .`, `next build`, `vitest run --config vitest.unit.config.ts` (211/211 files, 3517 tests), `git diff --check`, `node verify-encoding.mjs` (12/12 files UTF-8 no BOM). Status flipped to `READY_FOR_AUDIT` after ×3 PASS. | T0 §E + §F closure: 3 final runs PASS, all blockers + audit calls. |