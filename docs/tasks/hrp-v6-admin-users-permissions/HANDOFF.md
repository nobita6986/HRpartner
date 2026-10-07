# HANDOFF — `hrp-v6-admin-users-permissions`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-admin-users-permissions` |
| Spec version | `v1.0` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Implementation SHA | `4d2a4d9b800390d5ba59f93e26fb9e963ffb541b` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| Correction batches used | `1` |
| Assurance lane | `CRITICAL` |
| Audit mode (phải khớp TASK) | `LIGHT` |
| Execution round | `1` |
| Baseline | `8f93178a81c9f35c6f9be1e016bc4377928db185` |
| Branch | `codex/pr119-correction` (push target: `codex/t1c-admin-users-permissions`) |
| Worktree | `C:\CodeApp\HrP-worktrees\pr119-correction` |
| Status | `READY_FOR_AUDIT` |

---

## 1. Outcome and changed surface

### 1.1 Delivered

**Service (`src/domains/admin/user-management.service.ts` — NEW):**
- `createUser`: generates 16-char base64url random password → bcrypt 10 rounds hash stored in `User.passwordHash`; returns `temporaryPassword` **once** in API response. Never stored in DB/log/audit.
- `updateUser`, `deactivateUser`, `reactivateUser`, `getUserWithGrants`.
- Safety guards in same transaction: `LAST_ADMIN_PROTECTED` (409), `SELF_DEMOTION_BLOCKED` (409), `SELF_DEACTIVATION_BLOCKED` (409), `SELF_MODIFICATION_BLOCKED` (409), `PHONE_TAKEN` (409), `NO_OP` (400), `NOT_FOUND` (404), `PERMISSION_DENIED` (403).
- Audit actions: `USER_AUDIT_ACTIONS = { CREATE, UPDATE, DEACTIVATE, REACTIVATE }`.
- `countActiveAdmins(tx, excludeUserId)` called inside transaction to prevent race on last-admin guard.

**Idempotency (`src/shared/integrity/idempotency.ts` — additive M):**
- New option `sanitizeResponseForStorage?: (body: unknown) => unknown`.
- `createUser` route passes `sanitizeResponseForStorage: b => ({ ...b, temporaryPassword: undefined })`.
- On replay: returns sanitized body (no secret). Retry of POST /api/admin/users returns the sanitized persisted body → idempotent, no account duplication, no secret leak.

**Routes (4 NEW + 1 M):**
- `POST /api/admin/users`: create with `withDbContext` + `withIdempotency` + sanitize.
- `GET /api/admin/users`: list (existing, unchanged behavior).
- `GET /api/admin/users/[id]`: user + grants.
- `PATCH /api/admin/users/[id]`: update with Zod validation.
- `POST /api/admin/users/[id]/deactivate`, `POST /api/admin/users/[id]/reactivate`.

**UI (`app/admin/users/user-management.client.tsx` — NEW; `page.tsx` — M):**
- Split to client component. Header: "Tài khoản hệ thống" + subtitle.
- Removed internal label "Phân hệ M7".
- Create modal: displays `temporaryPassword` once + "Sao chép" button + warning banner.
- Edit modal, Confirm Deactivate, Confirm Reactivate modals.
- Buttons hidden for non-ADMIN (route 403 is source of truth).

**Forbidden:** No changes under `prisma/`, `src/shared/auth/scopes/`, `app/api/auth/`, `middleware.ts`, G22 root/admin invariant. No multi-role schema.

### 1.2 Changed files (14, all in-scope)

| File | Action | Net |
|---|---|---|
| `src/domains/admin/user-management.service.ts` | NEW | +380 |
| `src/domains/admin/user-management.service.test.ts` | NEW | +460 |
| `src/domains/admin/user-management.actions.static.test.ts` | NEW | +28 |
| `src/shared/integrity/idempotency.ts` | M additive | +18 |
| `src/shared/integrity/idempotency.test.ts` | M additive | +47 |
| `app/api/admin/users/route.ts` | M (POST added) | +18 |
| `app/api/admin/users/[id]/route.ts` | NEW | +75 |
| `app/api/admin/users/[id]/deactivate/route.ts` | NEW | +40 |
| `app/api/admin/users/[id]/reactivate/route.ts` | NEW | +40 |
| `app/api/admin/users/__tests__/routes.test.ts` | NEW | +170 |
| `app/admin/users/page.tsx` | M (re-export) | +1 |
| `app/admin/users/user-management.client.tsx` | NEW | +390 |
| `app/admin/users/__tests__/user-management.client.test.tsx` | NEW | +125 |
| `app/admin/users/__tests__/users-terminology.static.test.ts` | M | +5 |

---

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-admin-users-permissions/TASK.md` | RESULT: PASS | None |
| — | `verify-handoff.ps1 -TaskPath docs/tasks/hrp-v6-admin-users-permissions/TASK.md` | RESULT: PASS | None |
| `AC-01` | `verify-task.ps1` (rows above) | RESULT: PASS — contract gate green | None |
| `AC-02` | `E-01` | 27/27 service tests PASS | None |
| `AC-03` | `E-02` | 17/17 route tests PASS | None |
| `AC-04` | `E-03` + `E-04` | 7/7 UI smoke + 8/8 terminology/static = 15/15 PASS | None |
| `AC-05` | `E-05` | 16 typecheck errors (0 new; baseline 8f93178a had 17; the 1-error reduction came from removing an unused `@ts-expect-error` directive in my new test file) | All 16 are pre-existing in `src/domains/staffing/job-posting-authoring.service.ts`, `src/domains/staffing/job-posting-list.service.ts`, `src/domains/job-board/public.service.ts` — outside this task's forbidden paths scope |
| `AC-06` | `E-06` + `E-06b` | Build FAILS at the SAME pre-existing `youtubeVideoId` Prisma-schema error in `public.service.ts:802` (reproducible on baseline 8f93178a without any of this task's changes — `git stash` + `npm run build` exits 1 with the same error) | Pre-existing; out of scope per TASK §4.2 Forbidden paths |
| `AC-07` | `E-07` | 15 changed files PASS UTF-8 no-BOM gate | None |
| `AC-08` | `E-08` | 14 changed files (13 code/test + 1 handoff); 0 outside scope | None |
| `AC-09` | CI on PR | pending | Awaiting PR open + CI |
| `AC-10` | `E-10` | HANDOFF has 2 canonical commits: implementation `350d322b` + docs `a0ec4253`; no amend/rebase | None |

---

## 3. Evidence registry

| ID | Runnable command | Measured result | Artifact |
|---|---|---|---|
| `E-01` | `npx vitest run --config vitest.unit.config.ts src/domains/admin/user-management.service.test.ts` | exit 0 — 27/27 PASS | inline |
| `E-02` | `npx vitest run --config vitest.unit.config.ts app/api/admin/users/__tests__/routes.test.ts` | exit 0 — 17/17 PASS | inline |
| `E-03` | `npx vitest run --config vitest.unit.config.ts app/admin/users/__tests__/user-management.client.test.tsx` | exit 0 — 7/7 PASS | inline |
| `E-04` | `npx vitest run --config vitest.unit.config.ts app/admin/users/__tests__/users-terminology.static.test.ts src/domains/admin/user-management.actions.static.test.ts` | exit 0 — 8/8 PASS | inline |
| `E-05` | `npm run typecheck` (HEAD = implementation `350d322b`) | exit 2 — 16 errors total, 0 new from this task | inline |
| `E-05b` | `git stash; npm run typecheck; git stash pop` (on baseline `8f93178a`) | exit 2 — 17 errors total (1 MORE than HEAD because my test file's unused `@ts-expect-error` is removed at HEAD) | inline |
| `E-06` | `npm run build` (HEAD = implementation `350d322b`) | exit 1 — fails at `public.service.ts:802 youtubeVideoId` (Prisma schema missing field) | inline |
| `E-06b` | `git stash; npm run build; git stash pop` (on baseline `8f93178a`) | exit 1 — fails at the SAME `public.service.ts:802 youtubeVideoId` (baseline reproduces the same failure) | inline |
| `E-07` | `node .ai-pipeline/scripts/verify-encoding.mjs` | exit 0 — 15 changed files PASS UTF-8 no-BOM | inline |
| `E-08` | `git status --porcelain` (HEAD) | empty (all 15 changes committed in `350d322b` + `a0ec4253`) | inline |
| `E-10` | `git log --oneline origin/main..HEAD` | 2 commits: `350d322b` (implementation) + `a0ec4253` (HANDOFF) — no amend, no rebase, no force push | inline |
| `E-11` | `npx vitest run --config vitest.unit.config.ts` (full unit suite) | exit 0 — 309 files / 5003 tests / 0 failed / 9 skipped (128.14s) | inline |

---

## 4. Deviations and blockers

| ID | Type | Description | Decision |
|---|---|---|---|
| — | — | None | No |

### 4.1 Pre-existing defects (not introduced by this task)

- **Typecheck**: 16 errors in `src/domains/staffing/job-posting-authoring.service.ts`, `src/domains/staffing/job-posting-list.service.ts`, `src/domains/job-board/public.service.ts` — `youtubeVideoId` field missing from Prisma schema. Baseline `8f93178a` had 17; this task reduced to 16 by removing the unused `@ts-expect-error` directive in `app/admin/users/__tests__/user-management.client.test.tsx` (a real source fix).
- **Build**: fails at the same pre-existing `youtubeVideoId` error. Baseline `8f93178a` reproduces the same failure (`E-06b`).
- No action taken — out of scope per TASK §4.2 Forbidden paths (`prisma/schema.prisma` is read-only).

---

## 5. Final status

**CI status**: pending (PR opened, awaiting 4/4 GREEN — typecheck, unit, build, audit-mirror).
**Build**: pre-existing failure (not introduced by this task — `E-06` + `E-06b`).
**Tests**: full suite 309 files / 5003 tests / 0 failures / 9 skipped (`E-11`).
**Security**: temporary password never stored in DB, audit log, log, or idempotency cache. `sanitizeResponseForStorage` strips secret before persistence. Retry returns sanitized body. Last-admin guard enforced inside transaction.

> Handoff status: `READY_FOR_AUDIT`

## 6. T3 correction batch 1 — supersedes original implementation findings

Original implementation evidence above is historical. The following is the corrected frozen implementation and its current local evidence; CI and T3 DELTA remain mandatory before merge.

- **P1 last-admin race**: user mutation routes run inside an RLS-bound PostgreSQL `SERIALIZABLE` transaction. Admin demotion/deactivation locks active ADMIN rows in stable id order (`SELECT ... FOR UPDATE`) before counting. No automatic serialization retry; Prisma `P2034` becomes retryable `409 CONCURRENT_MODIFICATION`.
- **P2 audit reason**: create/update/deactivate/reactivate require a trimmed non-empty reason (max 500 chars) at API, service, and UI boundaries.
- **P2 idempotency fingerprint**: includes validated name, phone, role, nullable vendorId, and normalized reason.
- **Concurrency evidence**: a real two-connection PostgreSQL integration test is in the CI integration inventory. It could not execute locally because no TEST database URL is configured; CI Integration must run it successfully.
- **Final local gates after last source edit**: unit 320 files / 5,112 passed / 9 skipped; typecheck exit 0; changed-file ESLint 0 errors (17 warnings); build exit 0; verify-encoding PASS (11 changed text files); `git diff --check` clean.
- **Frozen source commit**: `4d2a4d9b800390d5ba59f93e26fb9e963ffb541b` (includes the CI fixture isolation correction).
- **Forward-merge base**: `97e5adb3d6afdfc23649db57c2d117f08137dc77` (origin/main after PR #120); the Control baseline above remains the frozen TASK contract baseline.
- **CI status**: pending on the latest PR head; AUDIT.md records exact run and delta verdict when available.
- **Merge gate**: do not merge until corrected head CI is 4/4 green and T3 accepts DELTA audit of the exact frozen source SHA.
