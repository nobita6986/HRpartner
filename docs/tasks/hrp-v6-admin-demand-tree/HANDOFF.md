# HANDOFF: hrp-v6-admin-demand-tree

## Status
- **Phase:** Implementation
- **Result:** SUCCESS
- **Exact HEAD:** (TBD - the commit you will see upon pushing)
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
- **Typecheck:** SUCCESS
- **Lint:** SUCCESS
- **Unit & Static Tests:** SUCCESS
- **Integration Test:** ENV_BLOCKED (Test logic provided and registered in integration lane, but dedicated test database is absent locally).
- **Build:** SUCCESS

## Browser Smoke
- **Browser Smoke:** NOT_RUN / ENV_BLOCKED (Requires authenticated session).

## Handoff for Tier 3
- Required `LIGHT` Audit from Tier 3.
- Need independent Tier 3 validation against exact HEAD.
- Reviewer must check the integration test cases against the RLS matrix.
