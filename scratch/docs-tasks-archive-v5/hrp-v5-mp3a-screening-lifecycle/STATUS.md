# CHECKPOINT — V5 MP-3 execution
> **RESUMED/CLOSED:** Checkpoint này đã được tiếp tục trong cùng ngày. MP-3A đã PASS production build, TASK/AUDIT verifier và được Planner ACCEPTED theo Founder waiver. Xem `TASK.md`, `HANDOFF.md`, `AUDIT.md` cùng thư mục. Các mục “WIP/resume” bên dưới được giữ làm lịch sử tại thời điểm tạm dừng.

## Control

- Paused at: 2026-08-24 (Asia/Bangkok)
- Repository: `C:\CodeApp\HrP`
- Branch: `main`
- HEAD: `d8ba10d` — `fix(commission): derive ctv summary from ledger`
- Push status: no push performed in this work session
- Active scope: `hrp-v5-mp3a-screening-lifecycle`
- State: **WIP — implementation and verification mostly complete, documentation/commit not complete**
- Founder waiver: the user explicitly authorized the primary agent to plan, implement, self-audit and resolve without Tier 2/Tier 3.

## Completed before MP-3A

G0 and Wave 0 are complete and committed locally:

- `1b9ed1d` — Prisma connection discipline
- `516956a` — debug endpoint exposure closed
- `405f913` — Worker field projection by permission
- `a79e041` — Decimal hours/VND rounding fix
- `d8ba10d` — CTV summary derived from CommissionLedger

Earlier accepted Marketplace/G0 commits remain in history, including MP-1, MP-2, CI, fixtures, canonical migrations and deterministic seed. No push was performed by this agent.

## MP-3A implemented (uncommitted)

### Schema and migration

- Added PostgreSQL/Prisma enum `CandidateSubmissionStatus`:
  `NEW`, `NEEDS_INFO`, `SCREENING`, `QUALIFIED`, `REJECTED`, `WITHDRAWN`, `CONVERTED`, `MERGED`.
- Changed `CandidateSubmission.status` from free-form `String` to the enum.
- Added `CandidateSubmission.version Int @default(0)` for optimistic transition locking.
- Added migration `20260824130000_mp3_submission_lifecycle`.
- Migration safely drops/recreates MP-2 partial unique index `uq_candidate_active_slot_phone` around the enum conversion, using enum-typed predicate literals.

### Domain/API

- Kept MP-2 `NEW <-> NEEDS_INFO` compatibility boundary intact.
- Added typed MP-3 transition map:
  - `screen`: `NEW|NEEDS_INFO -> SCREENING`
  - `qualify`: `SCREENING -> QUALIFIED`
  - `reject`: `NEW|NEEDS_INFO|SCREENING|QUALIFIED -> REJECTED`
- Terminal/reopen paths are rejected.
- Same-target replay is an idempotent no-op.
- Added optimistic update via `(id, status, version)` and stable `STALE_VERSION` 409.
- Every successful change writes `ApplicationStatusHistory` and `AuditLog` in the caller's `withDbContext` transaction.
- Role boundary deliberately follows the already-audited MP-2 queue:
  - screen: `ADMIN`, `HR_MANAGER`, `SALE`
  - qualify/reject: `ADMIN`, `HR_MANAGER`
  - `HR_STAFF` was NOT added because MP-2 DEC-06 does not grant that role queue access.
- Added endpoints:
  - `POST /api/admin/applications/:id/actions/screen`
  - `POST /api/admin/applications/:id/actions/qualify`
  - `POST /api/admin/applications/:id/actions/reject`
- Added enum-safe status filters to admin and legacy submission list routes.

## Verification evidence already obtained

- `npx prisma validate`: PASS.
- `npm run typecheck`: PASS.
- MP-3A targeted suite: 4 files / 42 tests PASS after final state-machine additions.
- Full unit suite: 44 files / 507 tests PASS.
- Scoped ESLint: 0 errors; 14 warnings (12 `no-explicit-any` in new mock test, 2 pre-existing in `submission.service.ts`).
- Migration on clean Neon test DB:
  - target host: `ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech`
  - database: `hrp_g0_clean_20260824`
  - first deploy correctly failed because MP-2 partial index had text-cast predicate (`42883`).
  - migration was fixed, failed attempt marked rolled back, redeploy PASS.
  - final `prisma migrate status`: database schema up to date, 21 migrations.
- MP-2 LIVE regression after enum migration: 2 files / 23 tests PASS, including public RPC apply/tracking, idempotency race, RLS and SECURITY DEFINER ownership/grants.
- No production DB and no HRP `dev` DB were modified; only the named temporary Neon test database was migrated.

## Important operational state

- Temporary database `hrp_g0_clean_20260824` still exists and now includes the MP-3A migration.
- Do not drop it without explicit user approval naming that database. A previous cleanup attempt was rejected because destructive external deletion lacked explicit authorization.
- Secrets remain only in `C:\CodeApp\Salary-app\.env.mp2-test.local`; they were not written to this repo or printed in logs.
- `apply_patch` is unusable in this Windows sandbox because of deny-read ACLs. Edits were made with guarded PowerShell exact replacements/full writes and reviewed with Git diff.

## Files in the MP-3A scope

Modified:

- `prisma/schema.prisma`
- `src/domains/applications/status-machine.ts`
- `src/domains/applications/status-machine.test.ts`
- `src/domains/applications/application-queue.service.ts`
- `src/domains/staffing/submission.service.ts`
- `app/api/admin/applications/route.ts`
- `app/api/jobs/submissions/route.ts`

Added:

- `prisma/migrations/20260824130000_mp3_submission_lifecycle/migration.sql`
- `src/domains/applications/screening.service.ts`
- `src/domains/applications/screening.service.test.ts`
- `src/domains/applications/screening.routes.test.ts`
- `app/api/admin/applications/[id]/actions/handler.ts`
- `app/api/admin/applications/[id]/actions/screen/route.ts`
- `app/api/admin/applications/[id]/actions/qualify/route.ts`
- `app/api/admin/applications/[id]/actions/reject/route.ts`
- this `STATUS.md`

## User-owned/unrelated dirty files — preserve

Do not stage, restore or delete unrelated changes, especially:

- all existing `D appBCC/**`
- `docs/V5_READINESS_ASSESSMENT.md`
- `docs/tasks/hrp-m12.1.1-db-grants/AUDIT.md`
- `docs/tasks/hrp-m12.1.1-db-grants/HANDOFF.md`
- `docs/tasks/hrp-portal-m12.1-bod-projects-fix/AUDIT.md`
- `run-test.js`
- `audit_report.md`
- `scratch/write_plan.py`

Use exact-path `git add`; never use `git add -A`.

## Resume steps

1. Read this checkpoint and run `git status --short`.
2. Review only the scoped diff and confirm schema diff remains small (enum + status type + version only).
3. Optionally remove the new test `no-explicit-any` warnings; this is cleanup, not a correctness blocker.
4. Run production `npm run build` (not rerun after MP-3A yet).
5. Create canonical `TASK.md`, `HANDOFF.md`, `AUDIT.md` for `hrp-v5-mp3a-screening-lifecycle`; run task/audit verifiers.
6. Run `git diff --check`, targeted tests, typecheck and scoped lint again.
7. Stage only the MP-3A paths listed above and create one scoped commit; do not push.
8. Continue MP-3B: qualified application conversion, dedup/manual resolution, Worker link and exactly one accepted SourceClaim, including conversion-race integration evidence.
9. Continue MP-3C: assignment-to-slot schema, preview/activate commands, quota and 1-ACTIVE race tests.
10. Run final MP-3 launch-gate regression and document residual frontend/UI work separately.

## Stop point

No further command should be run in this pause. MP-3A is not yet declared ACCEPTED and not yet committed.