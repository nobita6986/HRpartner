# HANDOFF: hrp-v6-admin-demand-tree

## Status
- **Phase:** Implementation
- **Result:** IMPLEMENTED / AUDIT_REVISION_REQUIRED
- **Exact HEAD:** 
  - Implementation HEAD: `6049cf90be292412a6d4123bedbf312d293f02c6`
  - *(Note: The subsequent HANDOFF-only correction commit will have a different metadata SHA. Do not attempt to make a commit contain its own SHA.)*
- **Base:** `origin/main` at `0d7f8a1099bc9f1a41767aefe5bd3bc149de84d2`

## Implementation Checklist
1. **Scope/PM Logic L1:**
   - Updated `buildProjectScope` in `project.scope.ts` to include `subPmUserId1` and `subPmUserId2`.
   - Updated `project.scope.test.ts` to reflect the changes.
2. **Read Services & Unit Tests:**
   - `client-read.service.ts`: Client logic + service-level guard for PM via visible projects.
   - `project-read.service.ts`: Project logic.
   - `job-opening-read.service.ts`: Job Opening logic with Slot deduplication.
3. **Admin Detail Pages:**
   - `app/admin/clients/[id]/page.tsx`
   - `app/admin/projects/[id]/page.tsx` (Now correctly renders related Job Openings deduplicated from slots).
   - `app/admin/job-openings/[id]/page.tsx` (Fixed EmptyState wording).
   - Linked Breadcrumbs and RelatedObjects properly.
   - Error states bubble up through `notFound()`.
4. **List Pages / W2 Foundations:**
   - Applied `RowLink` in `app/admin/clients/page.tsx` and `app/admin/projects/page.tsx`.
   - Interactive components (buttons) elevated with `relative z-10`.
5. **Integration Testing:**
   - Created `src/domains/admin-demand-tree.integration.test.ts` to verify the RLS Acceptance Matrix.
   - Registered test in `vitest.integration-files.ts`.
   - Uses `DATABASE_URL_TEST` and `DATABASE_URL_ADMIN_TEST`.

## Quality Gates
- **Typecheck (`npx tsc --noEmit`):** SUCCESS (0 errors)
- **Lint (`npm run lint`):** FAIL (Exit code: 1, Problems: 13,927)
- **Unit & Static Tests (`npm run test:unit`):** SUCCESS (142 files, 2257 tests passed in 31s)
- **Integration Test (`npm run test:integration`):** SUCCESS (locally)
- **Build (`npm run build`):** SUCCESS

## Remote Evidence
- **Quality:** PASS (Job 104852646519 - https://github.com/nobita6986/HRpartner/actions/runs/35113414258/job/104852646519)
- **Integration:** FAIL (Job 104852646140 - https://github.com/nobita6986/HRpartner/actions/runs/35113414258/job/104852646140). W3 `admin-demand-tree.integration.test.ts` passed 17/17 in approximately 51.2 seconds. Full Integration failed while multiple workflows shared the same dedicated test DB. Root cause of the remaining placement-lifecycle and matrix-scope failures is UNCONFIRMED pending one repository-serialized isolated run.
- **Browser Smoke:** NOT_RUN / ENV_BLOCKED



## Handoff for Tier 3
- Tier 3 audit HEAD 7daef46...: FAIL.
- Đang chờ Tier 3 delta re-audit trên HEAD mới.
- Reviewer must check the integration test cases against the RLS matrix.
