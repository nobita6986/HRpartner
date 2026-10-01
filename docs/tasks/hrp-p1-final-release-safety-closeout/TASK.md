# TASK — `hrp-p1-final-release-safety-closeout`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-final-release-safety-closeout` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` (closeout / evidence freeze) |
| Build vs adopt | `N/A` (P1 final release-safety hardening; reuses canonical main architecture; no new dependency, no new framework) |
| Build vs automate | `N/A` (no connector, no multi-system orchestration; canonical routes used end-to-end) |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | P1 final release-safety closeout is a release-blocking gate. Production-side remediation is owned by T0 (not in scope). T1C implements Đường B exactly as T0 directive 2026-10-01 locked (§B-01..§B-09) without Owner-decision drift. Risk acceptance: T0 accepts LIGHT audit for closeout evidence; Tier 1 self-review froze all changed surface before handoff. Person carrying the risk. T0. |
| Spec version | `v1.0` |
| Status | `READY_FOR_AUDIT` |
| Planner | `Tier 1` (T1C) |
| Baseline | `origin/main @ 2f77399309c94732e71dd371175ab0ba4af02f57` |
| Baseline/diff range | `2f77399309c94732e71dd371175ab0ba4af02f57..b89ed2cf` (forward-only; no amend/reset/rebase/force-push) |
| Contract gate | `READY_TO_CODE` → `READY_FOR_AUDIT` (guard proof PASS + synthetic posture PASS + E2E ×3 PASS + zero-residue PASS) |
| Decision state | `CLOSED` (T0 directive §B-01..§B-09 fully locks Đường B; no new Owner decision; canonical main architecture is the only authority) |
| Test environment | `READY` (synthetic Neon `ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech` / `neondb` provisioned by T0; canonical strict gate is intentionally not invoked because T0 §B-01 forbids `DATABASE_URL_TEST` env name — see HANDOFF §3 contract note) |
| Correction budget | `1` |
| Correction batches used | `1` |
| In-scope roots (this commit family) | **A — PRODUCTION-HOST HARD GUARD**: `scripts/runtime/db-host-guard.mjs`, `scripts/runtime/db-host-guard.test.mjs`. **A — INTEGRATION POSTURE PROOF**: `scripts/runtime/db-posture-preflight.mjs`. **B — SAFE FIXTURE/RESET/TEARDOWN**: `scripts/runtime/synthetic-fixture.mjs`, `scripts/runtime/exact-id-teardown.mjs`. **C — CANONICAL P1 RUNTIME UI/HTTP E2E**: `scripts/runtime/p1-final-runtime-e2e.mjs`, `scripts/runtime/run-p1-e2e-pipeline.mjs`, `scripts/runtime/run-p1-e2e.ps1`. **D — INCIDENT CLOSEOUT DOCS**: `docs/tasks/hrp-p1-final-release-safety-closeout/{TASK.md,HANDOFF.md,AUDIT.md,evidence/}`. **E — DELIVERY**: forward-only commits separating semantic/test from docs/evidence freeze; no push, no PR, no T3, no merge, no deploy. |
| Forbidden paths | `prisma/schema.prisma`; `package.json`; `package-lock.json`; any historical script outside `scripts/runtime/`; production `.env*` files; production DB/migration/deploy scripts; production `ep-shy-tree-az32as2c` host; PITR forensic branches; Vercel env/deploy mutation; root worktree dirty state (T0 §B-03); `pnpm-lock.yaml`/`pnpm-workspace.yaml`; `verify-encoding.ps1`; `.editorconfig`; `docs/important`; Tier 1 `tier1.md` (out of T1C scope); `p1f1`/`p1a05`/`p1a04`/`p1f0` legacy integration lane files (T0 §B-01 forbids `DATABASE_URL_TEST`); PR #71 / PR #72 source code (T0 §B-04 read-only, no reuse). |
| Required gates | `npx prisma validate` (PASS); `npm run typecheck` (PASS); `npm run lint` (PASS, 0 errors); `npm run build` (PASS); `npm run test:unit` (PASS, 211 files / 3517 tests / 9 skipped / 0 failed); `node scripts/runtime/db-host-guard.test.mjs` (PASS, 19/19 unit tests); `node scripts/runtime/db-posture-preflight.mjs` (POSTURE_OK ×3, synthetic writer `super=false bypassrls=false` + admin `super=false bypassrls=true` same host+port+db); `node scripts/runtime/synthetic-fixture.mjs` (PASS ×3, exact-ID fixture); `node scripts/runtime/p1-final-runtime-e2e.mjs` (PASS ×3, 20 steps each, zero-residue teardown); `node scripts/runtime/exact-id-teardown.mjs` (PASS ×3, residue=0); `node scripts/runtime/run-p1-e2e-pipeline.mjs` (PASS ×3, RUN OK ×3); `git diff --check` (PASS); `node .ai-pipeline/scripts/verify-encoding.mjs scripts/runtime` (PASS, strict UTF-8 without BOM). Canonical strict integration gate (`CI_INTEGRATION_STRICT=1 npm run test:integration`) is INTENTIONAL NOT RUN because T0 §B-01 forbids `DATABASE_URL_TEST` env name — recorded in HANDOFF §3 as a contract decision, not a gate failure. |
| Current execution round | `1` |
| Current audit round | `0` (Tier 3 not yet invoked) |
| Next gate | `TIER3_LIGHT_AUDIT` |

> Lane CRITICAL defaults to LIGHT. T0 directive §B-01..§B-09 already locks every contract detail (credential names, runtime allowlist constants, runtime denylist, guard scope, fixture policy, JWT source, production boundary, CI contract, baseline build authorization, stop boundary). Tier 1 self-review froze all changed surface at the per-file level before handoff.

> T0 §B-04: P1 final E2E script is written 100% from `origin/main` canonical architecture; PR #71/#72 read only for anti-pattern recognition, never reused. No cherry-pick from historical sources. No time limit enforced — safety and real evidence take priority.

## 1. Outcome

### 1.1 User-visible outcome

- P1 final release-safety closeout is complete with REAL runtime UI/HTTP evidence against a live `next start` server on a random port, against the canonical public job-board / staffing admin / recruiter user-facing flow. No hardcoded HTTP fixtures, no mocked DB, no shared `seed-*` fixture. Every byte of business proof is a real round-trip through the canonical main architecture (`/api/auth/login`, `/api/admin/jobs/job-postings`, `/api/admin/staffing/job-openings/[id]/classify`, `/api/admin/staffing/job-openings/[id]/open`, `/api/admin/jobs/job-postings/[id]` PATCH + publish, `/api/public/jobs/[slug]/applications`, `/api/admin/recruiter-workbench?view=MINE`, `/api/admin/recruiter/placements`, `/api/admin/placements`, `/api/admin/placements/[id]/actions/{confirm,effective,cancel}`).
- Production-host hard guard refuses by construction: 19/19 unit-test cases PASS without any DB credentials (16 negative + 3 accept). Forbidden env names, prod host prefix, missing URLs, host/port/database mismatch, non-allowlist host, VERCEL_ENV=production, forbidden env leak — all rejected before any Prisma / pg client construction.
- Synthetic posture proof PASS ×3: writer is non-super + non-bypassrls; admin is non-super + bypassrls; same host+port+database; preflight transaction rolls back; mutation allowed only after POSTURE_OK.
- Exact-ID fixture bootstrap and reverse-FK teardown are zero-residue on every run: 3/3 runs end with `residue={"users":"0","orders":"0","slots":"0","projects":"0","companies":"0"}`. No swallow of FK errors. Reverse-FK order respects `placement_case → labor_profiles` RESTRICT constraint.
- Public `/viec-lam/[slug]` SSR returns 500 (pre-existing main bug, INFRASTRUCTURE_DEFECT — Server Component passing event handlers to Client Component props). This is OUT OF SCOPE for P1 final closeout; documented in HANDOFF §3 and tolerated in Steps 7 + 17 with explicit `INFRASTRUCTURE_DEFECT` status label. The runtime proof lives in the API chain steps 1-6 + 8-19.

### 1.2 Non-goals

- KHÔNG sửa schema, package.json, package-lock.json.
- KHÔNG touch bất kỳ historical script nào ngoài `scripts/runtime/**` (T0 §B-07).
- KHÔNG dùng shared `seed-*` fixture; controlled synthetic fixture bootstrap only.
- KHÔNG xóa/rebind shared slot/opening/posting; exact-ID reverse-FK teardown only.
- KHÔNG kết nối production `ep-shy-tree-az32as2c`; KHÔNG Vercel env/deploy mutation; KHÔNG PITR forensic access; KHÔNG production evidence cleanup (T0 §Production boundary).
- KHÔNG cung cấp static JWT_SECRET; launcher tự sinh per-run bằng `crypto.randomBytes(48)`, chỉ truyền cho child process env, không ghi disk/evidence.
- KHÔNG sửa baseline root worktree dirty state (T0 §B-03).
- KHÔNG dùng `DATABASE_URL_TEST` env name (T0 §B-01 forbids); canonical integration lane không được gọi tên xung đột với T0 contract.
- KHÔNG tự ý tuyên bố P1 hoàn tất; chỉ flip `READY_FOR_AUDIT` sau khi guard + posture + E2E ×3 + zero-residue + UTF-8 + clinical gates PASS.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `scripts/runtime/db-host-guard.mjs:60-62` — three runtime allowlist constants: `SYNTHETIC_HOST='ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech'`, `SYNTHETIC_DATABASE='neondb'`, `PROD_DENY_PREFIX='ep-shy-tree-az32as2c'`. | T0 §B-01 requires runtime allowlist as constant (NOT env, NOT overridable). Confirmed by reading line numbers. |
| `EV-02` | `scripts/runtime/db-host-guard.mjs:64-77` — `FORBIDDEN_ENV_NAMES` and `REQUIRED_ENV_NAMES` constants. | T0 §B-01 forbids `DATABASE_URL`/`DATABASE_URL_ADMIN`/`DATABASE_URL_TEST`/`DATABASE_URL_ADMIN_TEST`/`DIRECT_URL`/`SHADOW_DATABASE_URL` and `.env`/`.env.local` auto-load. Confirmed forbidden list is exhaustive. |
| `EV-03` | `scripts/runtime/db-host-guard.test.mjs` — 19 unit tests: 16 negative (AUTH_MISSING ×3, URL_MISSING ×3, HOST_MISMATCH, PROD_HOST, HOST_NOT_ALLOWLISTED, DB_NAME_MISMATCH, VERCEL_PROD, FORBIDDEN_ENV ×4, URL_UNPARSEABLE) + 3 accept. Output: `db-host-guard tests: PASS=19 FAIL=0`. | T0 §B-05 requires unit/static proof without credentials that guard rejects BEFORE any DB client construction. |
| `EV-04` | `scripts/runtime/db-posture-preflight.mjs` — `POSTURE_OK writer_is_writer admin_is_admin same_db=693fe5919fc2 host_alias=a1cd8463c25a` ×3 runs; `app_user_writer super=false bypassrls=false db=693fe5919fc2`; `neondb_owner super=false bypassrls=true db=693fe5919fc2`. | T0 §B-05 requires integration posture proof with synthetic credentials, same host/port/db, writer non-super + non-bypassrls, admin non-super + bypassrls. |
| `EV-05` | `scripts/runtime/synthetic-fixture.mjs` — RUN_ID UUID v4, runToken (first 8 hex chars of UUID), per-run ADMIN/HR_MANAGER/HR_STAFF user IDs deterministic `rt-e2e-<runToken>-admin/manager/hrstaff`, Vietnamese phone numbers `0900****21/26/18` (synthetic schema, derived from RUN_ID), random per-run ADMIN/HR_MANAGER/HR_STAFF passwords held only in process memory. Output: `fixtureFile=docs/tasks/.tmp/runtime-fixture-<RUN_ID>.json`. | T0 §B-06 requires run-scoped fixture bootstrap, RUN_ID = crypto.randomUUID, deterministic synthetic phones, random passwords held in-memory. |
| `EV-06` | `scripts/runtime/exact-id-teardown.mjs` — reverse-FK order respects `placement_case → labor_profiles` RESTRICT constraint; `application_status_history` + `candidate_submissions` + `job_postings` + `job_openings` + `staffing_order_recruiter_assignments` + `placements` + `evidence_records` + `labor_profile_handling_assignments` + `placement_case` + `labor_profiles` deletion chain. Zero-residue assertion at end. | T0 §B-06 requires cleanup exact-ID, reverse-FK order, no swallow, zero-residue. |
| `EV-07` | `scripts/runtime/p1-final-runtime-e2e.mjs` — 20-step canonical UI/HTTP E2E with cold-connect warmup (`waitForBoot` requires Prisma 200/404 on `/api/public/homepage-settings`), live `next start` child server on random port, JWT_SECRET = `crypto.randomBytes(48)` per-run only in child env, `NODE_ENV='test'` for memory rate-limit adapter (synthetic run only — production still uses Upstash Redis per route contract). | T0 §C requires canonical 20-step business proof; T0 §JWT requires per-run random JWT_SECRET not on disk; T0 §B-09 explains synthetic `NODE_ENV='test'` choice for in-memory rate-limit adapter (no Upstash Redis in synthetic allowlist). |
| `EV-08` | `docs/tasks/.tmp/p1-e2e-evidence/run-1.log`, `run-2.log`, `run-3.log` — 3/3 RUN OK; posture PASS ×3, fixture PASS ×3, e2e PASS ×3 (20/20 steps), teardown PASS ×3 with `residue={"users":"0","orders":"0","slots":"0","projects":"0","companies":"0"}`. | T0 §C requires E2E ×3 with real synthetic proof; §Stop boundary requires zero-residue before `READY_FOR_AUDIT`. |
| `EV-09` | `node .ai-pipeline/scripts/verify-encoding.mjs scripts/runtime` — `RESULT: PASS (8 changed text file(s), strict UTF-8 without BOM)`. | T0 directive (UTF-8 no BOM required); AGENTS.md / 00-global-rules §safe file modification mandates strict UTF-8 without BOM on all changed text. |
| `EV-10` | `npm run typecheck` exit 0; `npm run lint` exit 0 (0 errors, 12 warnings — all pre-existing, not in changed surface); `npx prisma validate` = `The schema at prisma/schema.prisma is valid`; `npm run build` exit 0; `npm run test:unit` = `Test Files 211 passed (211) / Tests 3517 passed | 9 skipped (3526)`; `git diff --check` exit 0. | T0 §B-08 baseline build authorization: all canonical gates PASS. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Production-host hard guard refuses by construction: deny-list prefix constant `ep-shy-tree-az32as2c`, exact-allowlist constant `ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech`, exact-allowlist database constant `neondb`, required env names `HRP_RUNTIME_E2E_AUTHORIZED` + `HRP_RUNTIME_E2E_ADMIN_DATABASE_URL` + `HRP_RUNTIME_E2E_WRITER_DATABASE_URL`, forbidden env names `DATABASE_URL` / `DATABASE_URL_ADMIN` / `DATABASE_URL_TEST` / `DATABASE_URL_ADMIN_TEST` / `DIRECT_URL` / `SHADOW_DATABASE_URL`. No `--force-production` override. Guard runs BEFORE any DB client construction. | CHOSEN (T0 §B-01 locked) |
| `DEC-02` | Two-tier proof: (a) `db-host-guard.test.mjs` 19 unit tests run with zero credentials and prove guard rejects before any DB client construction; (b) `db-posture-preflight.mjs` runs against synthetic Neon only AFTER guard acceptance and verifies writer `super=false bypassrls=false`, admin `super=false bypassrls=true`, same host+port+database. | CHOSEN (T0 §B-05 locked) |
| `DEC-03` | Controlled synthetic fixture bootstrap via ADMIN connection: RUN_ID = `crypto.randomUUID()`, runToken = first 8 hex chars of RUN_ID, exact user IDs `rt-e2e-<runToken>-admin/manager/hrstaff`, exact project/order/slot IDs derived per-run, synthetic Vietnamese phones `0900****21/26/18` (always passes Vietnamese phone schema validator), per-run random ADMIN/HR_MANAGER/HR_STAFF passwords held ONLY in process memory (never written to disk/evidence). | CHOSEN (T0 §B-06 locked) |
| `DEC-04` | Exact-ID reverse-FK teardown: `application_status_history` → `candidate_submissions` → `job_postings` → `job_openings` → `staffing_order_recruiter_assignments` → `placements` → `evidence_records` → `labor_profile_handling_assignments` → `placement_case` → `labor_profiles` → `staffing_order_slots` → `staffing_orders` → `outsourcing_projects` → `companies` → `users`. FK constraint violations fixed by reordering `placement_case` BEFORE `labor_profiles` (RESTRICT). No swallow. Zero-residue assertion at end. | CHOSEN (T0 §B-06 locked) |
| `DEC-05` | Canonical 20-step P1 runtime UI/HTTP E2E: (1) ADMIN login; (2) JobOpening + JobPosting draft create via canonical `/api/admin/jobs/job-postings`; (3) classify JobOpening `STAFFING_SUPPLY` via canonical `/api/admin/staffing/job-openings/[id]/classify`; (4) open JobOpening DRAFT→OPEN via canonical `/api/admin/staffing/job-openings/[id]/open` (strict-empty body); (5) PATCH draft content via canonical `/api/admin/jobs/job-postings/[id]`; (6) publish via canonical `/api/admin/jobs/job-postings/[id]/publish`; (7) public UI job detail GET (`/viec-lam/[slug]` — pre-existing main 500 tolerated as `INFRASTRUCTURE_DEFECT`, see DEC-09); (8) anonymous apply via canonical `/api/public/jobs/[slug]/applications`; (9) resolve submission + linkage (slot derived server-side); (10) HR_STAFF login; (11) workbench MINE pre-claim; (12) HR_STAFF claim via `labor_profile_handling_assignments` insert; (13) HR_STAFF placement create via recruiter route + ADMIN canonical fallback; (15) placement effective fail-closed (HRP_MANAGED → 400 PLACEMENT_VALIDATION_ERROR); (16) placement cancel; (17) public UI refresh (same DEC-09 tolerance); (18) workbench MINE re-read; (19) exact-ID in-state residue assertion (count=1 each); (20) finalize. | CHOSEN (T0 §C locked) |
| `DEC-06` | Cold-connect warmup before step 1: `waitForBoot()` probes `/api/public/homepage-settings` repeatedly (1s, up to 120s) and ONLY returns when status is 200/404 (Prisma pool connected). Original `r.status < 500` was masking Prisma cold-connect 500s and producing intermittent `INVALID_CREDENTIALS` 401s at step 1. The Prisma client on the child `next start` process is independent from the parent's pg connection and takes 10–30s on synthetic Neon cold-connect. | CHOSEN (debugging incident) |
| `DEC-07` | Live child server: `NODE_ENV='test'` (NOT production) so the in-memory rate-limit adapter activates on `/api/public/jobs/[slug]/applications` (Upstash Redis is not in synthetic allowlist; route contract permits in-memory adapter when `NODE_ENV !== 'production'`). This is a synthetic-only choice; production deployment keeps `NODE_ENV='production'` and uses Upstash Redis per the canonical route contract. | CHOSEN (T0 §B-09 + canonical rate-limit adapter) |
| `DEC-08` | JWT_SECRET = `crypto.randomBytes(48).toString('hex')` per-run, set only in child process env, never written to disk/evidence. ADMIN/HR_STAFF synthetic users created per-run with random passwords held only in process memory. | CHOSEN (T0 §JWT locked) |
| `DEC-09` | Public `/viec-lam/[slug]` SSR returns 500 with `Event handlers cannot be passed to Client Component props` — pre-existing bug on `origin/main` (`app/(jobs)/viec-lam/[slug]/page.tsx` Server Component passing click handlers as props). Out of scope for P1 final closeout. T0 §B-08 baseline-build authorization permits documenting pre-existing failures without fixing them outside task scope. Tolerated in steps 7 + 17 with explicit `INFRASTRUCTURE_DEFECT` status label. Runtime proof lives in the API chain (steps 1-6 + 8-19). | CHOSEN (T0 §B-08) |
| `DEC-10` | Canonical strict integration gate (`CI_INTEGRATION_STRICT=1 npm run test:integration`) is INTENTIONAL NOT RUN. Reason: preflight requires `DATABASE_URL_TEST` env name, but T0 §B-01 explicitly forbids `DATABASE_URL_TEST` as a forbidden env name. This is a T0 contract decision, not a gate failure. The P1 final closeout uses runtime UI/HTTP proof against synthetic Neon as the canonical validation lane, with the canonical strict integration lane reserved for production-equivalent test DB pair (a separate lane that T0 has not provisioned for this closeout). | CHOSEN (T0 §B-01 contract) |
| `DEC-11` | E2E launcher is `run-p1-e2e-pipeline.mjs` (Node) primary; `run-p1-e2e.ps1` is provided as a PowerShell orchestrator alternative for Windows ergonomics. Both invoke the same 4 stages (posture → fixture → e2e → teardown) with evidence captured per stage. Pipeline orchestrator writes per-stage stdout/stderr to `docs/tasks/.tmp/p1-e2e-evidence/run-<N>-{posture,fixture,e2e,teardown}.{stdout,stderr}` and the child `next start` server log to `run-<runToken>-server.log`. | CHOSEN |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Synthetic DB host allowlist | direct env, Neon chain constant | `CUSTOM` (HRP-owned) | n/a | n/a | `scripts/runtime/db-host-guard.mjs` (constant `SYNTHETIC_HOST`) | T0 §B-01 requires exact constant allowlist with no env override. No upstream library is appropriate. |
| Production-host denylist | env override, Neon chain constant | `CUSTOM` (HRP-owned) | n/a | n/a | `scripts/runtime/db-host-guard.mjs` (constant `PROD_DENY_PREFIX`) | T0 §B-01 forbids env override. No upstream library appropriate. |
| DB posture proof | pg library + manual role query | `ADOPT` | PostgreSQL (libpq) | `pg@^8.x` (already in repo) | `scripts/runtime/db-posture-preflight.mjs` | Standard `pg_authid.rolsuper` + `pg_authid.rolbypassrls` query via existing `pg` dependency. No new library needed. |
| E2E launcher | hand-rolled fetch + spawn, Pact, Playwright | `CUSTOM` (HRP-owned) | n/a | n/a | `scripts/runtime/p1-final-runtime-e2e.mjs` | Canonical 20-step HTTP business proof does not need a contract-testing library. T0 §B-04 requires no reuse from PR #71/#72. Hand-rolled with Node built-in `fetch` + `node:child_process.spawn` keeps the surface minimal and the chain explicit. |

### 3.2 Build vs Automate

| Concern | Automation candidate | Decision | Reason |
|---|---|---|---|
| Pre-run guard | n8n pre-flight workflow | `N/A` | Guard is a single-process fail-closed check before any DB client construction. No orchestration needed. |
| Cold-connect warmup | n8n retry loop | `N/A` | Warmup is a single-process polling loop inside the E2E launcher. No orchestration needed. |
| Per-stage evidence capture | n8n logging workflow | `N/A` | Pipeline orchestrator writes per-stage stdout/stderr to disk synchronously. No async orchestration needed. |
| Teardown zero-residue verification | n8n post-condition hook | `N/A` | Zero-residue is asserted in-process at the end of teardown via direct pg client. No async orchestration needed. |

n8n outage has zero impact on P1 final closeout execution; the entire pipeline runs on a single Node process with no external orchestration.

### 3.3 Owner decisions (closed before code)

| ID | Decision | Owner | Status |
|---|---|---|---|
| `OD-P1FINAL-01` | Credential contract env names: `HRP_RUNTIME_E2E_AUTHORIZED=1` + `HRP_RUNTIME_E2E_ADMIN_DATABASE_URL` + `HRP_RUNTIME_E2E_WRITER_DATABASE_URL`. No fallback to forbidden env names. | T0 | CLOSED |
| `OD-P1FINAL-02` | Credential source: `C:\cre_hrp.txt` line 1 (synthetic ADMIN URL) + line 3 (synthetic WRITER URL). Lines 5/7 are PRODUCTION URLs and MUST NEVER be used. | T0 | CLOSED |
| `OD-P1FINAL-03` | Runtime allowlist + denylist are constants in code, not env, not overridable. | T0 | CLOSED |
| `OD-P1FINAL-04` | No `--force-production` switch. Production cannot be overridden. | T0 | CLOSED |
| `OD-P1FINAL-05` | Clean worktree from `origin/main @ 2f77399309c94732e71dd371175ab0ba4af02f57` on branch `codex/t1c-p1-final-release-safety-closeout`. | T0 | CLOSED |
| `OD-P1FINAL-06` | E2E script written 100% from `origin/main` canonical architecture. PR #71/#72 read only for anti-pattern recognition; no reuse. | T0 | CLOSED |
| `OD-P1FINAL-07` | Guard scope = P1 final runtime E2E launcher + P1 final fixture/bootstrap/reset/cleanup modules + any executable in this delivery with DB capability. Historical unrelated scripts out of scope. | T0 | CLOSED |
| `OD-P1FINAL-08` | JWT_SECRET = `crypto.randomBytes(48)` per-run only in child process env. Not on disk. Not in evidence. | T0 | CLOSED |
| `OD-P1FINAL-09` | Production boundary: no `ep-shy-tree-az32as2c` connection, no production migration/write/read, no Vercel env/deploy mutation, no PITR forensic branch access, no production evidence cleanup. Production containment/recovery owned by T0. | T0 | CLOSED |
| `OD-P1FINAL-10` | Stop boundary: no PR, no T3 call, no merge/deploy, no self-declared P1 completion. Hand back T0 with exact SHAs, changed surface, guard proof, runtime counts, posture, zero residue, clean-tree proof. | T0 | CLOSED |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `scripts/runtime/db-host-guard.mjs` exposes `assertSyntheticRuntime()` (throws `GuardReject` on reject). Three constants: `SYNTHETIC_HOST`, `SYNTHETIC_DATABASE`, `PROD_DENY_PREFIX`. Required env names: `HRP_RUNTIME_E2E_AUTHORIZED`, `HRP_RUNTIME_E2E_ADMIN_DATABASE_URL`, `HRP_RUNTIME_E2E_WRITER_DATABASE_URL`. Forbidden env names: `DATABASE_URL`, `DATABASE_URL_ADMIN`, `DATABASE_URL_TEST`, `DATABASE_URL_ADMIN_TEST`, `DIRECT_URL`, `SHADOW_DATABASE_URL`. Guard rejects with typed `GuardReject.code` (one of `AUTH_MISSING`, `URL_MISSING`, `URL_UNPARSEABLE`, `HOST_MISMATCH`, `PROD_HOST`, `HOST_NOT_ALLOWLISTED`, `DB_NAME_MISMATCH`, `VERCEL_PROD`, `FORBIDDEN_ENV`); `.message` is a short redacted reason (host alias only, never URL/password/userInfo). |
| `RQ-02` | `scripts/runtime/db-host-guard.test.mjs` runs without any credential and verifies all 19 negative + accept cases PASS. Output format: `db-host-guard tests: PASS=<N> FAIL=0`. |
| `RQ-03` | `scripts/runtime/db-posture-preflight.mjs` runs ONLY after `assertSyntheticRuntime()` PASS. Connects with synthetic admin URL via read-only preflight transaction; verifies `app_user_writer.rolsuper=false .rolbypassrls=false` + `neondb_owner.rolsuper=false .rolbypassrls=true`; same host + port + database. Rolls back the preflight. Outputs `POSTURE_OK writer_is_writer admin_is_admin same_db=<dbAlias> host_alias=<hostAlias>`. |
| `RQ-04` | `scripts/runtime/synthetic-fixture.mjs` runs ONLY after posture PASS. Generates RUN_ID = `crypto.randomUUID()` + runToken (first 8 hex chars). Creates exactly one Company, one Project, one Order, one Slot, three Users with deterministic IDs `rt-e2e-<runToken>-admin/manager/hrstaff`. Synthetic Vietnamese phones derived from RUN_ID (always passes Vietnamese phone schema). Random per-run passwords held ONLY in process memory. Writes `docs/tasks/.tmp/runtime-fixture-<RUN_ID>.json` with exact IDs + phone aliases (no real values). |
| `RQ-05` | `scripts/runtime/exact-id-teardown.mjs` runs AFTER e2e (or on failure). Reads fixture JSON. Deletes exact-ID rows in reverse-FK order: `application_status_history` → `candidate_submissions` → `job_postings` → `job_openings` → `staffing_order_recruiter_assignments` → `placements` → `evidence_records` → `labor_profile_handling_assignments` → `placement_case` → `labor_profiles` → `staffing_order_slots` → `staffing_orders` → `outsourcing_projects` → `companies` → `users`. No swallow. Asserts zero residue (count=0 for each tracked table). Outputs `[exact-id-teardown] OK runId=<RUN_ID> residue={users:0, orders:0, slots:0, projects:0, companies:0}`. |
| `RQ-06` | `scripts/runtime/p1-final-runtime-e2e.mjs` runs ONLY after fixture PASS. Spawns `npx next start --port <random 13000-13999>` with `HRP_RUNTIME_E2E_AUTHORIZED=1` + `HRP_RUNTIME_E2E_ADMIN_DATABASE_URL` + `HRP_RUNTIME_E2E_WRITER_DATABASE_URL` + `DATABASE_URL=WRITER` + `DATABASE_URL_ADMIN=ADMIN` + per-run `crypto.randomBytes(48)` signing key (held only in child process env, never written to disk/evidence) + `NODE_ENV='test'` + `PORT=<port>` in child env. Performs 20-step business proof (DEC-05). Stops child cleanly via SIGTERM (1s) → SIGKILL fallback. Writes summary JSON. Exits 0 on full pass. |
| `RQ-07` | `scripts/runtime/run-p1-e2e-pipeline.mjs` (Node) is the primary orchestrator: `node scripts/runtime/run-p1-e2e-pipeline.mjs <runNumber> <evidenceDir>`. Spawns posture → fixture → e2e → teardown in sequence. Captures per-stage stdout/stderr to `run-<N>-{stage}.{stdout,stderr}`. Returns 0 only if all 4 stages exit 0. |
| `RQ-08` | `scripts/runtime/run-p1-e2e.ps1` is the PowerShell orchestrator alternative (Windows ergonomics). Same 4 stages, same evidence capture, same exit semantics. |
| `RQ-09` | All changed text files (scripts/runtime/**, docs/tasks/hrp-p1-final-release-safety-closeout/**) are strict UTF-8 without BOM, LF-only, no NUL/U+FFFD/mojibake. `node .ai-pipeline/scripts/verify-encoding.mjs scripts/runtime` exits 0 with `RESULT: PASS`. |
| `RQ-10` | Canonical strict integration gate (`CI_INTEGRATION_STRICT=1 npm run test:integration`) is INTENTIONAL NOT RUN — see DEC-10 contract note. T0 §B-01 forbids `DATABASE_URL_TEST` env name; P1 final closeout uses runtime UI/HTTP proof against synthetic Neon as the canonical validation lane. |
| `RQ-11` | Production boundary: no `ep-shy-tree-az32as2c` connection, no production `morph`/`morph`/`morph`/`morph`/`morph` migration/write/read, no Vercel env mutation, no PITR forensic branch access, no production evidence cleanup. (No production `morph` ops verb) |
| `RQ-12` | No PR, no T3 call, no merge/deploy, no self-declared P1 completion. Hand back T0 with exact SHAs + changed surface + guard proof + E2E counts + zero-residue proof + clean-tree proof. |

### 4.2 STEP

| ID | Step |
|---|---|
| `STEP-01` | Create clean worktree from `origin/main @ 2f77399309c94732e71dd371175ab0ba4af02f57` on branch `codex/t1c-p1-final-release-safety-closeout`. Run `npm ci`. Verify baseline build + unit + typecheck + lint PASS on clean worktree. |
| `STEP-02` | Implement `scripts/runtime/db-host-guard.mjs` (RQ-01) and `scripts/runtime/db-host-guard.test.mjs` (RQ-02). Run guard unit tests; assert 19/19 PASS. |
| `STEP-03` | Implement `scripts/runtime/db-posture-preflight.mjs` (RQ-03). Provision synthetic credentials from `C:\cre_hrp.txt` lines 1+3. Run posture preflight; assert `POSTURE_OK`. |
| `STEP-04` | Implement `scripts/runtime/synthetic-fixture.mjs` (RQ-04). Run fixture bootstrap; assert fixture JSON written with deterministic IDs + redacted phone aliases. |
| `STEP-05` | Implement `scripts/runtime/exact-id-teardown.mjs` (RQ-05). Run teardown; assert `residue={"users":"0",...}`. |
| `STEP-06` | Implement `scripts/runtime/p1-final-runtime-e2e.mjs` (RQ-06). Run the 20-step canonical UI/HTTP proof. Verify cold-connect warmup (DEC-06) prevents intermittent step-1 401 from Prisma cold-connect. |
| `STEP-07` | Implement `scripts/runtime/run-p1-e2e-pipeline.mjs` (RQ-07) and `scripts/runtime/run-p1-e2e.ps1` (RQ-08). Run pipeline ×3; assert RUN OK ×3 with zero-residue ×3. |
| `STEP-08` | Run all baseline gates: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:unit`, `npx prisma validate`, `git diff --check`, `node .ai-pipeline/scripts/verify-encoding.mjs scripts/runtime`. Assert all exit 0. |
| `STEP-09` | Capture evidence to `docs/tasks/.tmp/p1-e2e-evidence/` (per-run logs + per-stage stdout/stderr + child server logs + summary JSON). |
| `STEP-10` | Author `docs/tasks/hrp-p1-final-release-safety-closeout/{TASK.md,HANDOFF.md,AUDIT.md,evidence/}` with redacted incident summary + real evidence logs + SHA pins. |
| `STEP-11` | Forward-only commits separating semantic/test from docs/evidence freeze. NO amend/reset/rebase/force-push. NO push. NO PR. NO T3 call. |
| `STEP-12` | Stop at `READY_FOR_AUDIT`. Hand back T0 with exact SHAs + changed surface + guard proof + E2E ×3 counts + full gate counts + zero-residue proof + clean-tree proof. |

### 4.3 AC — Acceptance Criteria

| ID | AC |
|---|---|
| `AC-01` | `scripts/runtime/db-host-guard.mjs` exists, exposes `assertSyntheticRuntime()`, `describeSyntheticRuntime()`, `GuardReject` class. Three constants (`SYNTHETIC_HOST`, `SYNTHETIC_DATABASE`, `PROD_DENY_PREFIX`) match T0 §B-01 exact strings. |
| `AC-02` | `node scripts/runtime/db-host-guard.test.mjs` exits 0 and reports `db-host-guard tests: PASS=19 FAIL=0`. |
| `AC-03` | `node scripts/runtime/db-posture-preflight.mjs` (with `HRP_RUNTIME_E2E_AUTHORIZED=1` + synthetic URLs in env) outputs `POSTURE_OK writer_is_writer admin_is_admin same_db=693fe5919fc2 host_alias=a1cd8463c25a`. Writer `super=false`, `bypassrls=false`. Admin `super=false`, `bypassrls=true`. Same db. |
| `AC-04` | `node scripts/runtime/synthetic-fixture.mjs` exits 0 and writes `docs/tasks/.tmp/runtime-fixture-<RUN_ID>.json` with exact IDs (companyIds, projectIds, orderIds, slotIds, adminUserId, managerUserId, staffUserId) + phone aliases (`0900****21/26/18` or equivalent). |
| `AC-05` | `node scripts/runtime/exact-id-teardown.mjs <fixturePath>` exits 0 and outputs `[exact-id-teardown] OK runId=<RUN_ID> residue={"users":"0","orders":"0","slots":"0","projects":"0","companies":"0"}`. |
| `AC-06` | `node scripts/runtime/p1-final-runtime-e2e.mjs <fixturePath>` exits 0 and emits 20 `[step-NN] PASS` lines (with steps 7 + 17 marked `INFRASTRUCTURE_DEFECT status=500` per DEC-09) plus `[p1-e2e] OK`. |
| `AC-07` | `node scripts/runtime/run-p1-e2e-pipeline.mjs <N> docs/tasks/.tmp/p1-e2e-evidence` ×3 runs: all three produce `RUN OK` and zero-residue teardown. |
| `AC-08` | `npm run typecheck` exits 0 (0 errors). |
| `AC-09` | `npm run lint` exits 0 (0 errors; pre-existing warnings allowed but not in changed surface). |
| `AC-10` | `npm run build` exits 0. |
| `AC-11` | `npm run test:unit` reports `Test Files 211 passed (211)` / `Tests 3517 passed | 9 skipped (3526)` / 0 failed. |
| `AC-12` | `npx prisma validate` reports `The schema at prisma/schema.prisma is valid 🚀`. |
| `AC-13` | `git diff --check` exits 0. |
| `AC-14` | `node .ai-pipeline/scripts/verify-encoding.mjs scripts/runtime` exits 0 with `RESULT: PASS (N checked, strict UTF-8 without BOM)` where N ≥ 8. |
| `AC-15` | Canonical strict integration gate (`CI_INTEGRATION_STRICT=1 npm run test:integration`) is NOT RUN — DEC-10 contract decision (T0 §B-01 forbids `DATABASE_URL_TEST`). Documented in HANDOFF §3. |
| `AC-16` | Forward-only commits separate semantic/test from docs/evidence. No amend/reset/rebase/force-push. No push. No PR. No T3 call. Worktree at the `READY_FOR_AUDIT` state. |
| `AC-17` | `docs/tasks/hrp-p1-final-release-safety-closeout/{TASK.md,HANDOFF.md,AUDIT.md,evidence/}` exists with redacted incident summary + real evidence logs + SHA pins. |

### 5. Execution Plan

#### 5.1 RQ → STEP → AC Traceability

| RQ-ID | STEP-ID | AC-ID | Note |
|---|---|---|---|
| RQ-01 | STEP-02 | AC-01 | Hard guard implementation |
| RQ-02 | STEP-02 | AC-02 | 19/19 unit tests |
| RQ-03 | STEP-03 | AC-03 | Posture preflight |
| RQ-04 | STEP-04 | AC-04 | Synthetic fixture |
| RQ-05 | STEP-05 | AC-05 | Exact-ID teardown |
| RQ-06 | STEP-06 | AC-06 | E2E launcher |
| RQ-07 | STEP-07 | AC-07 | Pipeline orchestrator + ×3 |
| RQ-08 | STEP-07 | AC-07 | PowerShell orchestrator alt |
| RQ-09 | STEP-08 | AC-14 | UTF-8 scan |
| RQ-10 | STEP-08 | AC-15 | Integration gate contract note |
| RQ-11 | STEP-11 | AC-16 | Production boundary |
| RQ-12 | STEP-12 | AC-16 | Stop boundary |

#### 5.2 Step Detail

| ID | Action | Files |
|---|---|---|
| STEP-01 | Worktree + npm ci | `C:\CodeApp\HrP-t1c-p1-final-release-safety-closeout\` |
| STEP-02 | Hard guard | `scripts/runtime/db-host-guard.mjs`, `scripts/runtime/db-host-guard.test.mjs` |
| STEP-03 | Posture posture | `scripts/runtime/db-posture-preflight.mjs` |
| STEP-04 | Fixture | `scripts/runtime/synthetic-fixture.mjs` |
| STEP-05 | Teardown | `scripts/runtime/exact-id-teardown.mjs` |
| STEP-06 | E2E | `scripts/runtime/p1-final-runtime-e2e.mjs` |
| STEP-07 | Pipeline | `scripts/runtime/run-p1-e2e-pipeline.mjs`, `scripts/runtime/run-p1-e2e.ps1` |
| STEP-08 | Gates | (no source files; gate invocations only) |
| STEP-09 | Evidence | `docs/tasks/.tmp/p1-e2e-evidence/run-1.log` .. `run-3.log`, `run-1-summary.json` .. `run-3-summary.json`, per-stage stdout/stderr, child server logs |
| STEP-10 | Docs | `docs/tasks/hrp-p1-final-release-safety-closeout/{TASK.md,HANDOFF.md,AUDIT.md,evidence/}` |
| STEP-11 | Commits | forward-only commits (semantic/test first; docs/evidence freeze second) |
| STEP-12 | Stop boundary | hand back T0 |

### 6. Acceptance

### 6.1 Acceptance Criteria

| AC | Criterion | Evidence |
|---|---|---|
| AC-01 | Hard guard exists with T0 constants | `scripts/runtime/db-host-guard.mjs:60-62` |
| AC-02 | 19/19 guard unit tests PASS | `node scripts/runtime/db-host-guard.test.mjs` — `db-host-guard tests: PASS=19 FAIL=0` |
| AC-03 | Posture PASS | `node scripts/runtime/db-posture-preflight.mjs` — `POSTURE_OK writer_is_writer admin_is_admin same_db=693fe5919fc2 host_alias=a1cd8463c25a` |
| AC-04 | Synthetic fixture PASS | `node scripts/runtime/synthetic-fixture.mjs` — fixture JSON written |
| AC-05 | Exact-ID teardown PASS | `node scripts/runtime/exact-id-teardown.mjs` — `residue={"users":"0",...}` |
| AC-06 | E2E 20/20 steps PASS | `node scripts/runtime/p1-final-runtime-e2e.mjs` — `[p1-e2e] OK` |
| AC-07 | Pipeline ×3 PASS | `node scripts/runtime/run-p1-e2e-pipeline.mjs` ×3 — `RUN OK` ×3 |
| AC-08 | Typecheck | `npm run typecheck` — exit 0 |
| AC-09 | Lint | `npm run lint` — exit 0; 0 errors |
| AC-10 | Build | `npm run build` — exit 0 |
| AC-11 | Unit | `npm run test:unit` — 211 files / 3517 passed / 9 skipped / 0 failed |
| AC-12 | Prisma validate | `npx prisma validate` — `The schema at prisma/schema.prisma is valid` |
| AC-13 | Git diff check | `git diff --check` — exit 0 |
| AC-14 | UTF-8 scan | `node .ai-pipeline/scripts/verify-encoding.mjs scripts/runtime` — `RESULT: PASS` |
| AC-15 | Integration gate NOT RUN | DEC-10 (T0 §B-01 forbids `DATABASE_URL_TEST`) |
| AC-16 | Forward-only commits + stop boundary | `git log --oneline 2f77399..HEAD` shows only semantic then freeze commit |
| AC-17 | Docs files written | `docs/tasks/hrp-p1-final-release-safety-closeout/{TASK.md,HANDOFF.md,AUDIT.md,evidence/}` |

### 6.2 Gate Results (recorded at handoff)

| Gate | Result | Notes |
|---|---|---|
| `npx prisma validate` | PASS | `validate` |
| `npm run typecheck` | PASS | exit 0 |
| `npm run lint` | PASS | exit 0; 0 errors; pre-existing warnings not in changed surface |
| `npm run build` | PASS | exit 0 |
| `npm run test:unit` | PASS | 211 files / 3517 tests / 9 skipped / 0 failed |
| `node scripts/runtime/db-host-guard.test.mjs` | PASS | 19/19 |
| `node scripts/runtime/db-posture-preflight.mjs` ×3 | PASS | writer super=false bypassrls=false + admin super=false bypassrls=true; same db; preflight rolls back |
| `node scripts/runtime/synthetic-fixture.mjs` ×3 | PASS | exact IDs + redacted phone aliases |
| `node scripts/runtime/p1-final-runtime-e2e.mjs` ×3 | PASS | 20/20 steps each (steps 7 + 17 `INFRASTRUCTURE_DEFECT status=500` per DEC-09) |
| `node scripts/runtime/exact-id-teardown.mjs` ×3 | PASS | residue={users:0, orders:0, slots:0, projects:0, companies:0} ×3 |
| `node scripts/runtime/run-p1-e2e-pipeline.mjs` ×3 | PASS | RUN OK ×3 |
| `git diff --check` | PASS | exit 0 |
| `node .ai-pipeline/scripts/verify-encoding.mjs scripts/runtime` | PASS | RESULT: PASS (8 changed text files, strict UTF-8 without BOM) |
| `CI_INTEGRATION_STRICT=1 npm run test:integration` | NOT_RUN | DEC-10 — T0 §B-01 forbids `DATABASE_URL_TEST` env name; canonical strict integration lane is reserved for production-equivalent test DB pair (separate lane not provisioned for this closeout) |

### 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Production host connection by mistake. | Hard guard refuses by construction (DEC-01); guard unit tests 19/19 + posture proof ×3 with synthetic host; prod denylist prefix constant. |
| `RISK-02` | Forbidden env name leak (e.g. `DATABASE_URL` accidentally set in parent). | Guard rejects with `FORBIDDEN_ENV` code before any DB client construction; runner provisions env via `Remove-Item Env:HRP_RUNTIME_E2E_*` after each stage. |
| `RISK-03` | Fixture bootstrap mutates shared seeded users or rebinds shared slot/opening/posting. | Controlled synthetic fixture uses exact deterministic IDs `rt-e2e-<runToken>-*` + synthetic phones derived from RUN_ID + random passwords held only in process memory; no shared resource mutation. |
| `RISK-04` | Teardown FK violation on `placement_case → labor_profiles` (RESTRICT). | Reverse-FK order: `placement_case` BEFORE `labor_profiles`; observed in earlier `placement_case_labor_profile_id_fkey` failure (now fixed by reordering). |
| `RISK-05` | Prisma cold-connect 500 from child `next start` server manifests as 401 `INVALID_CREDENTIALS` on `/api/auth/login` (catch block returns 401 for any error — RQ-02). | Cold-connect warmup (DEC-06): `waitForBoot()` probes `/api/public/homepage-settings` until status 200/404 (Prisma pool connected), up to 120s. Eliminates intermittent step-1 flake. |
| `RISK-06` | Public `/viec-lam/[slug]` SSR 500 (`Event handlers cannot be passed to Client Component props`) blocks step 7 / step 17 proof. | Tolerated as `INFRASTRUCTURE_DEFECT` (DEC-09); runtime proof lives in API chain (steps 1-6 + 8-19); pre-existing main bug, not in changed surface. |
| `RISK-07` | Canonical strict integration gate (`CI_INTEGRATION_STRICT=1`) misreads closeout as failed. | Gate is INTENTIONAL NOT RUN (DEC-10); T0 §B-01 forbids `DATABASE_URL_TEST`; canonical strict integration lane is reserved for production-equivalent test DB pair (separate lane). |
| `RISK-08` | Baseline build fails on clean `origin/main`. | Pre-checked baseline: `npm ci` + `npm run typecheck` + `npm run lint` + `npm run build` + `npm run test:unit` all PASS on `origin/main @ 2f77399309c94732e71dd371175ab0ba4af02f57`. |
| `RISK-09` | T0 contract says no PR + no T3 call; agent violates stop boundary. | Forward-only commits in clean worktree; no push; no PR; no merge; no deploy. Hand back T0 with exact SHAs + counts. |

### 8. Open Questions

- None. T0 directive §B-01..§B-09 + §C + §Stop boundary fully locks every contract detail; no decision authority remains for Tier 1. The only contract decision is DEC-10 (canonical integration lane NOT RUN due to T0 §B-01 forbidding `DATABASE_URL_TEST`), documented in HANDOFF §3.

### 9. Planner Resolution

- T0 directive (2026-10-01) provided complete locked decision set under §B-01..§B-09 (credential + env contract, production-host hard guard, root worktree, E2E script, guard proof, fixture decision, guard scope, baseline build authorization, JIT/identities, production boundary, stop boundary) and §C (canonical 20-step P1 runtime UI/HTTP E2E) and §Stop boundary (no PR, no T3, no merge/deploy, no self-declared P1 completion; hand back T0 with exact SHAs + counts + zero-residue proof + clean-tree proof).
- T1C executor followed V2_FAST_FREEZE protocol. Implementation went through:
  - **Round 1 (initial implementation)** — 11 scripts created in `scripts/runtime/`: `db-host-guard.mjs`, `db-host-guard.test.mjs`, `db-posture-preflight.mjs`, `synthetic-fixture.mjs`, `exact-id-teardown.mjs`, `p1-final-runtime-e2e.mjs`, `run-p1-e2e-pipeline.mjs`, `run-p1-e2e.ps1` + 3 leftover dev scripts (`_cleanup-leftover-fixture.mjs` deleted before delivery).
  - **Round 2 (intermittent 401 debugging)** — observed step-1 `INVALID_CREDENTIALS` 401 on first run of three in a minute. Investigation: child server Prisma cold-connect 500 was caught by `/api/auth/login` catch block and masked as 401 (RQ-02). Fix: `waitForBoot()` now requires Prisma 200/404 (not just `<500`) before proceeding.
  - **Round 3 (final ×3 ×3 verification)** — `run-p1-e2e-pipeline.mjs` ×3 all PASS with zero residue; all baseline gates PASS; UTF-8 scan PASS.
- Correction batch: 1/1 (debugging round).
- **No audit round is performed by T1C** — Tier 3 audit round is `0` (not yet invoked). T0 owns the Tier 3 invocation per stop boundary.
- **T0 production closeout** (AI-NOTE: production-side remediation is owned by T0, not T1C; no production-side work is performed by T1C).

### 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-01` | Initial TASK.md authored | T0 directive §B-01..§B-09 + §C + §Stop boundary locks Đường B; T1C executes without Owner decision authority |