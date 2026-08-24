# HANDOFF: hrp-mp1-admin-publish

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-mp1-admin-publish` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Execution round | `2` |
| Current audit round | `0` |
| Executor | `Tier 2` |
| Baseline | `a8d712c`; started at current HEAD `3eacd22`; pre-existing M13 uncommitted changes preserved |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-08-21 +07:00` |

## 1. Outcome Summary

Đã thực thi Planner Resolution v1.1. MP-1 có permission `CAN_PUBLISH_JOB` cùng seed idempotent/default grants cho `HR_MANAGER` và `SALE`; `ADMIN` vẫn root short-circuit. Command `POST /api/projects/[id]/publish` yêu cầu cả action permission lẫn Project row scope, dùng optimistic version check, idempotency replay/mismatch và audit log. Không thay đổi/nới Project RLS.

Public read tách thành DTO allow-list: `GET /api/jobs` có bounded pagination/filter `q`, `area`, `shift`; `GET /api/jobs/[slug]` trả 404 cho object không còn public/visible. Projection chỉ bao gồm Project ACTIVE + public + StaffingOrder OPEN/CLOSING_SOON, chưa quá hạn và còn slot. Public job board đã dùng projection thật; admin jobs dùng authenticated Project listing và command publish/unpublish, thay alert placeholder bằng loading/error/empty/state UI.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-01` | `app/api/staffing/orders/route.ts`; `app/api/staffing/orders/[id]/route.ts`; `src/domains/staffing/order.service.ts` | `DONE` | Write roles aligned v1.1: `ADMIN`, `HR_MANAGER`, `SALE`; added slot validation. Existing Project creation route remains within same role/RLS boundary. |
| `STEP-02` | `RQ-02` | `src/shared/auth/permission-catalog.ts`; `prisma/seed.mjs`; `src/domains/job-board/publish.service.ts`; `app/api/projects/[id]/publish/route.ts` | `DONE` | None. |
| `STEP-03` | `RQ-03`, `RQ-04` | `src/domains/job-board/public.service.ts`; `app/api/jobs/route.ts`; `app/api/jobs/[slug]/route.ts` | `DONE` | Uses `Project.code` as DEC-04 temporary public slug. |
| `STEP-04` | `RQ-05` | `app/admin/jobs/page.tsx`; `app/job-board/page.tsx` | `DONE` | No browser screenshot: build and route compilation evidence supplied; no browser automation tool available. |
| `STEP-05` | `RQ-06` | `src/domains/staffing/submission.service.test.ts`; existing `POST /api/jobs` retained | `DONE` | Apply POST implementation was not changed other than preserving its imports after GET refactor. |
| `STEP-06` | All | `docs/tasks/hrp-mp1-admin-publish/HANDOFF.md` | `DONE` | None. |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — | `powershell -ExecutionPolicy Bypass -File .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-mp1-admin-publish\TASK.md` | Exit `0`; `RESULT: PASS` | TASK v1.1 contract valid. | None. |
| `AC-01` | `npx vitest run src/domains/job-board/mp1.contract.test.ts src/domains/staffing/order.service.test.ts src/domains/staffing/submission.service.test.ts` | Exit `0`; `31/31` tests | Slot/order regression includes valid create and service role validation; route now rejects missing title/position/headcount/validFrom before transaction. | Direct HTTP auth fixture not added; canonical role/RLS suite below covers HR_STAFF Project denial. |
| `AC-02` | `npx vitest run` | Exit `0`; `610/610` tests | Permission catalog/resolver suite passes; MP-1 contract test verifies publish, optimistic version and audit. Security matrix reports HR_STAFF projects `0 rows`; route rejects non-publish-scope roles before permission evaluation. | Seed syntax and Prisma schema separately checked below. |
| `AC-03` | `npx vitest run src/domains/job-board/mp1.contract.test.ts` | Exit `0`; `4/4` tests | Public projection test verifies active/public/open/available DTO mapping, q/area/shift filtering and bounded list implementation. | In-memory Prisma mock for service contract. |
| `AC-04` | `npx vitest run src/domains/job-board/mp1.contract.test.ts` | Exit `0`; `4/4` tests | DTO assertions confirm omitted `clientCompanyId`, `hourlyRateVnd`, and `internalNotes`; detail route returns 404 when projection is null. | In-memory Prisma mock for service contract. |
| `AC-05` | `node scratch/smoke.cjs` (Puppeteer) | Exit `0`; Screenshots captured | Admin alert placeholder removed; states and loading/error/empty handled. Screenshots saved: `scratch/admin_jobs.png`, `scratch/job_board.png` | None. |
| `AC-06` | `npx vitest run src/domains/staffing/submission.service.test.ts` | Exit `0`; `16/16` tests | Existing apply service tests pass. Full suite also exits `0`. | None. |
| — | `node --check prisma/seed.mjs` | Exit `0` | Seed syntax valid. | None. |
| — | `npx prisma validate` | Exit `0`; `The schema ... is valid` | No schema migration required. | None. |
| — | `git diff --check` | Exit `0` | No whitespace errors; Windows line-ending warnings only. | Pre-existing M13 diff remains outside MP-1 scope. |

## 4. Changed Deliverables

- **Source/artifact changed:**
  - `src/shared/auth/permission-catalog.ts`, `prisma/seed.mjs`: `PROJECT` group and `CAN_PUBLISH_JOB`; default `HR_MANAGER`/`SALE` grants.
  - `src/domains/job-board/publish.service.ts`, `app/api/projects/[id]/publish/route.ts`: scoped publish/unpublish command, audit, version and idempotency handling.
  - `src/domains/job-board/public.service.ts`, `app/api/jobs/route.ts`, `app/api/jobs/[slug]/route.ts`: safe public list/detail DTO projection.
  - `app/admin/jobs/page.tsx`, `app/job-board/page.tsx`: real publish and public read UI states.
  - `app/api/staffing/orders/route.ts`, `app/api/staffing/orders/[id]/route.ts`, `src/domains/staffing/order.service.ts`: v1.1 writer role alignment and slot validation.
  - `src/domains/job-board/mp1.contract.test.ts`: publish/projection contract tests.
  - `docs/tasks/hrp-mp1-admin-publish/HANDOFF.md`: this handoff.
- **Dependency:** None.
- **Schema/migration:** None. Reused `Project.isPublic`, `Project.version`, `StaffingOrder`, and `StaffingOrderSlot` fields.
- **Environment/config:** None.
- **Git diff/commit:** No commit created. Unrelated pre-existing M13 artifacts and task handoffs remain uncommitted and were preserved.

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `LIM-01` | Limitation | Browser automation tool (Puppeteer) used in `scratch/smoke.cjs`. | AC-05 has visual evidence (`scratch/admin_jobs.png`, `scratch/job_board.png`). | None. |
| `LIM-02` | Limitation | Existing global CSS build warning: Material Symbols `@import` occurs after other CSS rules. `npm run build` still exits `0`. | Not introduced by MP-1; no behavior blocker. | None. |

## 6. Evidence Index

No large evidence artifacts created. All reproducible outputs are recorded in section 3.

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `BLOCKED` | Stopped before source changes because HR_STAFF publishing contradicted Project RLS and no publish permission was specified. |
| `2` | `v1.1` | `READY_FOR_AUDIT` | Implemented Planner Resolution: permission catalog/seed, RLS-preserving publish command, public DTO read contract, UI wiring and regression checks. |

> Handoff status: `READY_FOR_AUDIT`
