# TASK — `hrp-p1a03-jobposting-create-nav-fix`

P1 go-live defect bundle. CRITICAL priority. Contains two coupled defects:

- **P1-A0.3** — `POST /api/admin/jobs/job-postings` HTTP 500 root-cause + fix.
- **P1-NAV-01** — Admin sidebar double-active on `/admin/jobs` and `/admin/jobs/job-postings`.

Both are required for P1 cutover. Listed separately in this contract so the
fix and the regression tests are traceable per-deficiency.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1a03-jobposting-create-nav-fix` |
| Work type | `CODE` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.0` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | P1-A0.3 fix may touch RLS policies / role authority for JobPosting authoring and must be re-verified by an external auditor against the exact frozen Implementation SHA. P1-NAV-01 is a pure UI helper, but is bundled in the same SHAs so audit reads one batch, not two. Defect bundle contains AUTH/RLS/permission surface; CRITICAL is conservative. |
| Status | `READY_TO_CODE` |
| Planner | `Tier 1` (T1C, directive `T0 → T1C — P1 go-live defect bundle`) |
| Baseline | `2586b9fa2574c978be56f4d8dc259228516fdfbc` |
| Implementation SHA | `PENDING` |
| Frozen delivery | `NO` (still implementing — `READY_TO_CODE` only) |
| Canonical gates | `PENDING` |
| Audit eligibility | `PENDING` |
| In-scope roots | `app/api/admin/jobs/job-postings/**`; `app/admin/jobs/job-postings/**`; `src/domains/staffing/job-posting-*.ts`; `src/shared/integrity/idempotency.ts` (only if root cause demands it); `src/shared/auth/with-db-context.ts` (only if root cause demands it); `src/shared/auth/rls-context.ts` (no semantic change); `src/shared/ui/role-guard/role-guard-layout.tsx`; `tests/db/**`; new migration `prisma/migrations/YYYYMMDD000000_p1a03_*/migration.sql` (only if RLS policy addition required); `docs/tasks/hrp-p1a03-jobposting-create-nav-fix/**` |
| Forbidden paths | `app/(jobs)/**`; `app/api/public/jobs/**`; `app/api/admin/jobs/job-postings/[id]/**` (unrelated; PATCH/publish/unpublish/archive; not in bundle); `prisma/schema.prisma` (no model change); `src/domains/staffing/labor-profile/**`; `src/domains/staffing/candidate-submission/**`; `src/domains/staffing/placement-case/**`; `src/domains/staffing/placement/**`; `src/domains/recruiter/**`; `src/domains/finance/**`; `src/lib/auth/session.ts` (no JWT/session-shape change); `package.json` / `package-lock.json`; sidebar IA/label/order/menu restructure; n8n workflows; `docs/PLANNER_HANDOVER.md` |
| Required gates | `npx prisma validate`; `npm run typecheck`; `npm run lint`; targeted unit + static tests; targeted DB integration tests × 3; `npm run test:unit`; `CI_INTEGRATION_STRICT=1 npm run test:integration`; `npm run build`; `git diff --check`; `node .ai-pipeline/scripts/verify-encoding.mjs` (Node variant, see DEC-09); `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1a03-jobposting-create-nav-fix/TASK.md`; `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1a03-jobposting-create-nav-fix/TASK.md -HandoffPath docs/tasks/hrp-p1a03-jobposting-create-nav-fix/HANDOFF.md` |
| BUILD_VS_ADOPT | `ADOPT` (use existing primitives: `withDbContext`, `withIdempotency`, `JobPosting authoring services`, existing migration framework, existing list-service predicate. Build vs justify: a separate navigation helper because no repo-level helper exists yet for active-route resolution.) |
| BUILD_VS_AUTOMATE | `N/A` (no connector, scheduler, or notification worker in this bundle; n8n not involved) |
| Correction budget | `1` |
| Next gate | T0 review and merge after `READY_FOR_AUDIT` |
| Current execution round | `1` |

## 1. Outcome

### 1.1 P1-A0.3 — `POST /api/admin/jobs/job-postings` HTTP 500

Root-cause analysis is the first deliverable. The defect must be reproducible
on the synthetic DB cluster with the production facts captured below; the fix
must address the actual stage that emits HTTP 500. Speculation is forbidden
— if synthetic reproduction is impossible because the synthetic cluster lacks
something that production has, the bundle stops at `ENV_BLOCKED` with exact
preflight evidence and does not self-declare a root cause.

#### 1.1.1 User-visible outcome

- `POST /api/admin/jobs/job-postings` with a valid slot, valid Idempotency-Key
  and a body `{ "slotId": "<uuid>" }` returns HTTP **200** for an eligible slot
  on the synthetic cluster with `app.role = HR_MANAGER`.
- Returns HTTP **201** if create is the path (reuses strict 200 semantics when
  integration test publisher is in flight — the contract is HTTP 200 + an
  `Idempotency-Key` that replay returns the same response).
- Returns HTTP **4xx** for: missing/invalid Idempotency-Key, invalid body,
  slot not eligible, slot bound to an existing posting, role not allowed,
  Idempotency-Key conflict.
- Idempotent: retries under the same Idempotency-Key return the same
  `jobOpening.id` and `jobPosting.id` without creating duplicates or orphan
  rows. After a successful create, `GET /api/jobs` does not show the posting
  until the caller publishes via `PATCH/POST /api/admin/jobs/job-postings/[id]/...`
  endpoints (out of scope here).

#### 1.1.2 Predeclared production facts (read-only inputs by T0)

- Production cluster: a stable Neon cluster (use the dedicated synthetic
  cluster for integration; do not touch production lines).
- Production DB facts (T0 read-only measurement):
  - `JobPosting.total = 0`
  - `JobPosting.PUBLISHED = 0`
  - Approximately 20 `StaffingOrderSlot` rows are eligible by selector
    (`listEligibleSlotsForNewJobPosting`).
  - All migrations applied; basic writer table privileges present.
  - `GET /api/jobs?limit=9&offset=0` returns 200 with `jobs=[]`, `total=0`.

These facts are inputs to the investigation; they are **not** the root cause.
Investigator must produce its own synthetic reproduction with sanitized
evidence (no production URL, no production secret, no production Idempotency-Key).

#### 1.1.3 Non-goals

- Do not migrate production.
- Do not publish real postings.
- Do not touch `app/(jobs)/viec-lam/**`, `app/api/public/jobs/**`,
  `app/api/admin/jobs/job-postings/[id]/.../*` (PATCH, publish, unpublish,
  archive), `src/domains/staffing/labor-profile/*`, `package.json`,
  `package-lock.json`.
- Do not weaken RLS, do not introduce a privileged bypass, do not bypass
  `withIdempotency`, do not collapse the role matrix.

### 1.2 P1-NAV-01 — sidebar double-active fix

#### 1.2.1 User-visible outcome

| URL | Active sidebar item |
|---|---|
| `/admin/jobs` | only **"Danh sách nhu cầu"** |
| `/admin/jobs/job-postings` | only **"Tin tuyển dụng"** |
| `/admin/jobs/job-postings/{id}` | only **"Tin tuyển dụng"** |
| `/admin` | only **"Tổng quan"** (unchanged) |

No double-active highlight on any path. Mobile/bottom-nav and other nav
surfaces are not regressed by the helper change.

#### 1.2.2 Non-goals

- No sidebar IA/label/role-matrix/order/menu restructure.
- No `navItems` array change, no `roles` change, no icon change.
- No new permissions, no remove of permissions.

### 1.3 Production safety invariants

- `withIdempotency` is preserved on `POST /api/admin/jobs/job-postings`. The
  helper and its P2002 replay path are kept as the canonical integrity gate.
- `withDbContext` is preserved on every mutation of JobPosting-related tables.
- RLS is preserved. If the root cause requires relaxing a policy, it does so
  by *narrowing the writer role set*, not by adding a privileged bypass or
  dropping FORCE ROW LEVEL SECURITY.
- Role matrix for app-level mutations is preserved. If the root cause sits at
  the app/RLS boundary, the alignment goes through `hrp_project_visible_for`
  / `hrp_project_writable` / `hrp_worker_visible_for` SECDEFINER helpers or a
  narrow new policy added in a forward-only migration (the canonical ALTER
  PLAN.md path, byte-exact add-only, no DROP/DISABLE).

## 2. Evidence

This section is populated during investigation. Each `EV-` row is identified
and the row's "Why it matters" maps to one of the eight stages in C-09.

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `git rev-parse --verify HEAD^{commit}` baseline = `2586b9fa2574c978be56f4d8dc259228516fdfbc` | Baseline pre-bundle. Freezes the diff scope. |
| `EV-02` | `git rev-parse --verify HEAD^{commit}` Implementation SHA = `PENDING` | Set when impl commit freezes. |
| `EV-03` | Synthetic DB posture result (writer `app_user_writer`, admin `neondb_owner`/`rolbypassrls=true`, same host+db) | Evidence the integration lane can run against synthetic only (not production) |
| `EV-04` | Reproduction script (sanitized) reproducing HTTP 500 with `app.role = HR_STAFF` (or whichever role triggers the failure) | Root-cause step |
| `EV-05` | `findUnique` RLS negative (e.g., `staffing_order_slots` SELECT from `app_user_writer` returns 0 rows under known `app.role = 'HR_STAFF'`) | RLS-vs-app-matrix boundary |
| `EV-06` | `getAuthContext(req)` trace under synthetic admin route (cookies stripped; account+role suffix printed; raw token omitted) | Stage boundary |
| `EV-07` | Prisma error code (e.g. `P2025`/`P2002`/`P2003`/`42501` Postgres) emitted at the failing stage | Stage + error code |
| `EV-08` | `git diff origin/main..HEAD --stat` after fix | Diff scope frozen |
| `EV-09` | Synthetic integration × 3 logs (zero residue collision) | Idempotency authority |
| `EV-10` | `GET /api/jobs?limit=9&offset=0` after `DRAFT` create vs after canonical `PUBLISHED` (200 vs 200 with `total=N`) | Draft-no-public invariant |
| `EV-11` | Sidebar interaction unit-test log (`/admin/jobs`, `/admin/jobs/job-postings`, `/admin/jobs/job-postings/{id}` → only one item active) | P1-NAV-01 acceptance |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | P1-A0.3 fix is preconditioned on synthetic reproduction. If reproduction fails (see C-09), T0 receives `ENV_BLOCKED` with the exact preflight reason and the bundle stops without pinning an `Implementation SHA`. | `CHOSEN` |
| `DEC-02` | If the root cause is app-vs-RLS role matrix misalignment, the fix is **at the RLS policy layer**: extend `hrp_project_visible_for` to include the app-side allowed role set (per DEC-09 §3.3), or add a narrow policy under a forward-only migration. NOT by adding a privileged bypass or bypassing `withDbContext`. | `CHOSEN` |
| `DEC-03` | If the root cause is in `src/shared/integrity/idempotency.ts` (e.g., a RLS-related SELECT/UPSERT race): the existing helper is the source of truth; it stays the canonical gate. Do not re-author the helper. | `CHOSEN` |
| `DEC-04` | If the root cause is in `src/domains/staffing/job-posting-authoring.service.ts` (e.g., a query that assumes a constant role or contains a typo in a RLS-related subquery): the fix is **at the service layer** with narrow diff. No transaction-shape changes that affect other domains. | `CHOSEN` |
| `DEC-05` | Idempotency contract is preserved: retry with same Idempotency-Key replays the same body & status; same key with different payload → 409 `IDEMPOTENCY_CONFLICT`. The 4xx-resets-key semantics in `create-job-posting-form.tsx` (`isClientError`) is preserved. | `CHOSEN` |
| `DEC-06` | P1-NAV-01 introduces a new pure helper `getMostSpecificActiveHref(pathname, visibleNav)` in `src/shared/ui/role-guard/`. The current short-circuit logic (`pathname === href || pathname.startsWith(href + '/')`) is replaced with the most-specific-match winner, so `pathname='/admin/jobs/job-postings'` matches `/admin/jobs/job-postings` only when no longer href in `visibleNav` is a strict prefix. | `CHOSEN` |
| `DEC-07` | P1-NAV-01 helper is a pure function with no React or DOM dependency. Co-locate with the consuming UI for now. Unit test in same module. No new package, no new framework. | `CHOSEN` |
| `DEC-08` | P1-NAV-01 does not introduce a new `navItems` slice, role array, label, icon, or section reorder. Order of items in `ADMIN_NAV_PHASE4` is byte-exact. | `CHOSEN` |
| `DEC-09` | UTF-8 no-BOM evidence: `node .ai-pipeline/scripts/verify-encoding.mjs` (Node variant, mirrors `DEV-04` carry-forward from `hrp-p1-a0-1-jobposting-authoring-stamps/HANDOFF.md`). The ps1 variant is intentionally absent in this worktree. | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

#### P1-A0.3 requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Reproduction on synthetic DB is produced before any code change is committed. Sanitized evidence (no secrets, no production URL, no production Idempotency-Key) recorded in `evidence/EV-04`. |
| `RQ-02` | The failing stage is one of: (1) auth context, (2) `withDbContext`/GUC, (3) slot eligibility revalidation, (4) idempotency lookup/write, (5) create/reuse `JobOpening`, (6) bind `StaffingOrderSlot`, (7) create/reuse `JobPosting` DRAFT, (8) response serialization. The bundle identifies exactly one and pins the sanitized error code. |
| `RQ-03` | Fix preserves `withIdempotency`, `withDbContext`, role matrix, RLS, and idempotent-retry semantics. |
| `RQ-04` | If a migration is added, it is forward-only. No DROP. No DISABLE RLS. No privileged bypass. Production migration is OWNED by T0 (not applied from this branch). |
| `RQ-05` | Regression tests cover (synthetic DB × 3): eligible slot no opening → exactly 1 JobOpening + 1 JobPosting DRAFT; slot already has opening → reuse opening + 1 new JobPosting DRAFT; same Idempotency-Key replay → no duplicate row; same key + different payload → 409 IDEMPOTENCY_CONFLICT; stale/invalid slot → 4xx + zero mutation; unauthorized role → fail-closed; tx failure → rollback chain (no orphan JobOpening, no orphan binding). |
| `RQ-06` | `GET /api/jobs?limit=9&offset=0` does not include a DRAFT posting; the canonical PUBLISHED path does. |
| `RQ-07` | No forbidden path is touched (auth/session shape, RLS drop, mass-IA, package change). |

#### P1-NAV-01 requirements

| ID | Requirement |
|---|---|
| `RQ-08` | New pure helper `getMostSpecificActiveHref(pathname, visibleNav)` returns the single longest href in `visibleNav` that matches `pathname`. If no item matches, returns `null`. |
| `RQ-09` | A sidebar item is active (`aria-current="page"` or visually-active) when `item.href === activeHref`. No prefix-matching that overlaps a longer href in the same nav. |
| `RQ-10` | `/admin/jobs` → only `/admin/jobs` item active. `/admin/jobs/job-postings` and `/admin/jobs/job-postings/{id}` → only `/admin/jobs/job-postings` item active. |
| `RQ-11` | Trailing slash and uppercase/lowercase ASCII differences are not introduced; only the existing convention (no trailing slash) is preserved. |
| `RQ-12` | WorkerPortal bottom-nav (mobile) is not regressed: it uses the same per-item `pathname === href` check that does not depend on prefix. |
| `RQ-13` | No `ADMIN_NAV_PHASE4` slice change, no label/icon/role/section/order change, no IA-restructure. |
| `RQ-14` | Unit tests assert: parent/child route selection (longest match), sibling route non-overlap, no-match returns `null`, non-admin-portal navs untouched. |

### 4.2 Scope boundaries

**In scope**

- `app/api/admin/jobs/job-postings/route.ts` (POST)
- `app/admin/jobs/job-postings/page.tsx` (list view)
- `app/admin/jobs/job-postings/[id]/page.tsx` (detail view, no semantic change)
- `app/admin/jobs/job-postings/create-job-posting-form.tsx` (form behaviour, no IA change)
- `src/domains/staffing/job-posting-authoring.service.ts`
- `src/domains/staffing/job-posting-list.service.ts` (predicate unchanged)
- `src/shared/integrity/idempotency.ts` (only if root cause lies here)
- `src/shared/auth/with-db-context.ts` (only if root cause lies here)
- `src/shared/ui/role-guard/role-guard-layout.tsx`
- `prisma/migrations/YYYYMMDDHHMMSS_p1a03_*/migration.sql` (forward-only, RLS narrow add) — created ONLY if root cause requires it
- `tests/db/**` — new integration tests
- `app/api/admin/jobs/job-postings/route.test.ts` — route-level test (new)
- `src/shared/ui/role-guard/role-guard-layout.test.tsx` — UI test (new)
- `src/shared/ui/role-guard/active-nav-helper.ts` — new pure helper module
- `src/shared/ui/role-guard/active-nav-helper.test.ts` — helper unit tests (new)
- `docs/tasks/hrp-p1a03-jobposting-create-nav-fix/{TASK.md,HANDOFF.md,evidence/**}`

**Out of scope**

- `app/(jobs)/**`, `app/api/public/jobs/**`, `app/api/admin/jobs/job-postings/[id]/publish/route.ts`,
  `app/api/admin/jobs/job-postings/[id]/unpublish/route.ts`,
  `app/api/admin/jobs/job-postings/[id]/archive/route.ts`,
  `app/api/admin/jobs/job-postings/[id]/route.ts` (PATCH)
- `prisma/schema.prisma` (no model field added/changed)
- `src/domains/staffing/labor-profile/**`, `src/domains/staffing/candidate-submission/**`,
  `src/domains/staffing/placement/**`, `src/domains/staffing/placement-case/**`
- `src/shared/auth/auth-context.ts` (no contract change)
- Sidebar IA/label/order/menu restructure, role matrix change
- `package.json`, `package-lock.json`
- n8n workflow, Connector, scheduler
- Production migration (`prisma migrate deploy` is OWNED by T0)
- Production deploy, secret/log/credential commit

### 4.3 Domain boundaries

- **Data/state:** synthetic DB integration inserts rows in disposable fixture
  ids. Production DB is not mutated.
- **Permission/security:** RLS preserved; if app/RLS role matrix is
  misaligned, fix is at the RLS layer (narrow policy or SECDEFINER helper
  extension), not at the application role guard.
- **Interface/API:** POST contract unchanged (request shape, headers, response
  shape). Sidebar active state changes only at the threshold that broke the
  prefix-match. No API token, no cookie, no JWT shape change.
- **Migration/rollback:** if a migration is added, it is forward-only with a
  strict reverse path documented. Rollback = revert the migration or layer a
  follow-up migration.

## 5. Execution Plan

| Step | Target | Intent | Verify |
|---|---|---|---|
| `STEP-01` | Worktree `C:\CodeApp\HrP-t1a03`, branch `codex/t1c-p1a03-jobposting-create-nav-fix`, baseline `2586b9fa2574c978be56f4d8dc259228516fdfbc` | Establish fresh worktree from origin/main | `git rev-parse HEAD` + `git status --short` clean |
| `STEP-02` | Synthetic DB posture (already done, repeated under integration preflight) | `node scripts/ci/assert-test-db-posture.mjs` exits 0 with `POSTURE_OK` and admin writer on the same synthetic cluster | E-01 / E-02 |
| `STEP-03` | Reproduce HTTP 500 on synthetic cluster (call into `app/api/admin/jobs/job-postings/route.ts` via vitest harness that exercises the real handler on a transaction-rollback synthetic DB) | Pin failing stage + sanitized error code | E-04 / E-07 |
| `STEP-04` | Decide root-cause layer (route, service, idempotency, RLS) and apply narrow fix | Restricted blast radius | E-08 |
| `STEP-05` | Synthetic integration tests × 3: eligible-no-opening, slot-with-opening, idempotency replay, idempotency-key conflict, stale slot, role-denied, tx-failure rollback, draft-no-public, publish-appears | Regression coverage per C-09 | E-09 |
| `STEP-06` | New helper `getMostSpecificActiveHref` + wire into `RoleGuardLayout` | Fix P1-NAV-01 | E-11 |
| `STEP-07` | Unit tests for `getMostSpecificActiveHref` (parent/child/sibling/no-match) | Static guard | E-11 |
| `STEP-08` | `verify-task.ps1`, `verify-handoff.ps1`, `verify-encoding.mjs`, `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`, `git diff --check` | Canonical gates | all green |
| `STEP-09` | Forward-only commit(s) on bundle branch, push, no force-push | Deliver | committed SHAs reported |

## 6. Acceptance

### 6.1 Acceptance criteria

#### P1-A0.3 acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Synthetic DB reproduction produces HTTP 500 (or the bundle reports `ENV_BLOCKED` with exact preflight reason) | `tests/db/job-posting-create-http500.repro.integration.test.ts`, sanitized evidence in `evidence/EV-04` |
| `AC-02` | Failing stage is one of C-09 stages 1..8 and the sanitized error code is recorded in `EV-07` | Same |
| `AC-03` | After fix, POST /api/admin/jobs/job-postings returns 200 for `app.role = HR_MANAGER` with valid slot + Idempotency-Key | integration test `R-A3` |
| `AC-04` | Eligible slot with no opening: exactly 1 JobOpening + 1 JobPosting DRAFT inserted | integration test `R-A3` |
| `AC-05` | Slot already has opening: opening reused, exactly 1 new JobPosting DRAFT inserted; no duplicate opening | integration test `R-A3` |
| `AC-06` | Same Idempotency-Key replay: zero new rows; same `jobOpening.id` and `jobPosting.id` returned | integration test `R-A3` |
| `AC-07` | Same key + different payload: 409 IDEMPOTENCY_CONFLICT | integration test `R-A3` |
| `AC-08` | Stale/invalid slot: 4xx + zero mutation | integration test `R-A3` |
| `AC-09` | Role-denied (e.g., `SALE`): 403 + zero mutation | integration test `R-A3` |
| `AC-10` | DB txn failure simulation: rollback chain (no orphan JobOpening, no orphan slot binding) | integration test `R-A3` |
| `AC-11` | Synthetic integration × 3 runs: zero residue collision, row counts match exactly | integration script wrapper `R-A3` |
| `AC-12` | `GET /api/jobs?limit=9&offset=0` after DRAFT create: still 200 + `total=0`; after canonical PUBLISHED: 200 + `total=N` | integration test `R-A3` + manual capture in evidence |
| `AC-13` | No forbidden path touched (`git diff origin/main..HEAD --stat <forbidden>` returns 0 lines) | `git diff --check` and explicit forbidden-path scan |
| `AC-14` | UTF-8 no-BOM on every changed text file | `node .ai-pipeline/scripts/verify-encoding.mjs` exit 0 |
| `AC-15` | Typecheck, lint, full unit lane, build — all PASS | `npm run typecheck && npm run lint && npm run test:unit && npm run build` |

#### P1-NAV-01 acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-16` | `getMostSpecificActiveHref('/admin/jobs/job-postings', visibleNav)` returns `/admin/jobs/job-postings` (and not `/admin/jobs`) | unit test `R-NAV-01..03` |
| `AC-17` | `getMostSpecificActiveHref('/admin/jobs', visibleNav)` returns `/admin/jobs` only | unit test `R-NAV-04` |
| `AC-18` | `getMostSpecificActiveHref('/admin/jobs/job-postings/{id}', visibleNav)` returns `/admin/jobs/job-postings` | unit test `R-NAV-05` |
| `AC-19` | `getMostSpecificActiveHref('/admin/users', visibleNav)` returns `null` | unit test `R-NAV-06` |
| `AC-20` | The active-item rendering uses `item.href === activeHref`, not `startsWith` | static guard in component test `R-NAV-07` |
| `AC-21` | Worker portal bottom-nav unchanged (still uses `pathname === href`) | `R-NAV-08` snapshot |
| `AC-22` | `ADMIN_NAV_PHASE4` slice has zero diff (label, icon, role, section, order) | `git diff --check` + `git diff origin/main..HEAD -- src/shared/ui/role-guard/role-guard-layout.tsx` — only the active-helper wiring lines change |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | STEP-03 | AC-01 |
| `RQ-02` | STEP-03, STEP-04 | AC-02 |
| `RQ-03` | STEP-04 | AC-03, AC-04, AC-05, AC-06, AC-07, AC-08, AC-09, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15 |
| `RQ-04` | STEP-04 | AC-13 |
| `RQ-05` | STEP-05 | AC-04, AC-05, AC-06, AC-07, AC-08, AC-09, AC-10, AC-11 |
| `RQ-06` | STEP-05 | AC-12 |
| `RQ-07` | STEP-08 | AC-13 |
| `RQ-08` | STEP-06, STEP-07 | AC-16 |
| `RQ-09` | STEP-06 | AC-16, AC-20 |
| `RQ-10` | STEP-06 | AC-16, AC-17, AC-18 |
| `RQ-11` | STEP-06 | AC-20 |
| `RQ-12` | STEP-06 | AC-21 |
| `RQ-13` | STEP-06 | AC-22 |
| `RQ-14` | STEP-07 | AC-16, AC-17, AC-18, AC-19, AC-20 |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Speculating root cause without reproduction could ship a wrong fix. | Reproduction on synthetic DB is a hard precondition (DEC-01). If reproduction fails, bundle stops at `ENV_BLOCKED`. |
| `RISK-02` | Migration introducing a narrow RLS policy could over-broaden visibility. | Migration is forward-only add. Use a narrow predicate (e.g., `hrp_project_visible_for_or_hr_staff_owner`) and lock the visible-for callable behind a SECDEFINER helper. Rollback = revert + revert migration. |
| `RISK-03` | Fixing the navigation by changing `isNavItemActive` could regress the development/details `<summary>` open state. | The `<details open>` logic uses `developmentRouteActive`, which is itself derived from `isNavItemActive(item.href)`. Use a sibling `developmentActiveHref = getMostSpecificActiveHref(pathname, developmentNav)` and call it from the `<details>` summary without changing primary highlight. |
| `RISK-04` | Synthetic cluster might differ from production (posture mismatch) and root cause is production-only. | `assert-test-db-posture.mjs` is mandatory before integration; if it fails the bundle reports ENV_BLOCKED. |
| `RISK-05` | The P1-A0.3 fix may also need to change pre-route resilience (e.g., read-only `withIdempotency.findExistingIdempotency` on the GET detail). | Not in scope for this bundle. Out-of-scope changes require T0 directive to extend. |
| `RISK-06` | Forward-only commit on a single branch with two coupled fixes makes bisect harder. | Document each commit's intent in commit body (P1-A0.3 vs P1-NAV-01). README/HANDOFF §8 lists both SHAs. |

## 8. Open Questions

| ID | Question | Blocks | Status |
|---|---|---|---|
| `OQ-01` | Is there any role currently used to call POST /api/admin/jobs/job-postings that is not in the canonical project_visibility set? | RQ-A3-03 | `OPEN — pending EV-04..EV-07 evidence` |
| `OQ-02` | Is there a separate JIRA / Linear thread with the actual Vercel function log redacted? | RQ-A3-01 | `OPEN — T0 has none; bundle proceeds synthetic-only` |

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | Adopt the in-scope and out-of-scope boundaries as written; SPEC `v1.0`. DEC-01..DEC-09 closed. Correction budget = 1. | T0 directive priority: HTTP 500 first; bundle keeps the navigation fix as the second half but does not delay root-cause identification. |

## 10. Revision Log

| Spec version | Date | Author | Change | Reason |
|---|---|---|---|---|
| `v1.0` | 2026-09-27 | Tier 1 (T1C) | Initial v1.0; baseline `2586b9fa…`; STANDARD + LIGHT audit; in-scope + out-of-scope boundaries per T0 directive | `T0 → T1C — P1 go-live defect bundle: JobPosting create HTTP 500 + sidebar double-active` |
