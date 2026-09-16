# HANDOFF: hrp-v6-admin-demand-tree

## Status
- **Phase:** Implementation
- **Result:** IMPLEMENTED / AUDIT_REVISION_REQUIRED
- **Exact HEAD:** (TBD - the exact final remote HEAD of this commit)
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
(Commands will be run locally on the final delta)
- **Typecheck (`npx tsc --noEmit`):** SUCCESS (0 errors)
- **Lint (`npm run lint`):** SUCCESS (13927 problems - pre-existing baseline, delta clean)
- **Unit & Static Tests (`npm run test:unit`):** SUCCESS (142 files, 2257 tests passed in 31s)
- **Integration Test (`npm run test:integration`):** ENV_BLOCKED (Test logic provided and registered in integration lane, but dedicated test database is absent locally).
- **Build (`npm run build`):** SUCCESS
- **Quality CI (GitHub Actions):** CI của HEAD cũ đã PASS nhưng HEAD mới phải chờ CI mới.

## Browser Smoke
- **Browser Smoke:** NOT_RUN / ENV_BLOCKED (Requires authenticated session).

## Handoff for Tier 3
- Tier 3 audit HEAD 7daef46...: FAIL.
- Đang chờ Tier 3 delta re-audit trên HEAD mới.
- Reviewer must check the integration test cases against the RLS matrix.
