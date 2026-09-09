# HANDOFF: hrp-phase4-vertical-slices — Round 7 (Slice 4D)

## Control

| Field | Value |
|---|---|
| Task | `hrp-phase4-vertical-slices` |
| Round | 7 (Slice 4D — Job Board polish) |
| Executor | Tier 2 (Cursor) |
| Baseline | `c86b624` (fix(defectfix): 8 defect code review) |
| Completion | 2026-08-18 ICT |
| Spec | v1.9 |

## Evidence (Iron Rule 4)

### STEP-18: RQ-16/17 — submission.service.ts

**Deliverables:**
- `src/domains/staffing/submission.service.ts`: 6 functions
  - `listPublicJobs(tx)` — queries `isPublic=true` projects + staffing slots
  - `applyForJob(tx, ctx, input)` — creates `CandidateSubmission` + `SourceClaim` (HRP_DIRECT)
  - `listSubmissions(tx, ctx, opts)` — ADMIN/HR/VENDOR list; WORKER → FORBIDDEN
  - `listClaims(tx, ctx, opts)` — same role check
  - `acceptSourceClaim(tx, ctx, claimId)` — DEC-10: unique 1 accepted/worker; updates submission → SCREENING
  - `rejectSourceClaim(tx, ctx, claimId)` — updates submission → REJECTED
- `src/domains/staffing/submission.service.test.ts`: 16 tests (in-memory Prisma mock)

**Evidence:**
```
npx vitest run src/domains/staffing/submission.service.test.ts
✓ 16 tests passed
```

### STEP-19: RQ-16/17 — UI + API routes

**Deliverables:**
- `app/api/jobs/route.ts`: GET (public jobs) + POST (apply via `/api/jobs/apply`)
- `app/api/jobs/apply/route.ts`: POST apply (public, no auth)
- `app/(jobs)/page.tsx`: Public job board with mock data, Apply modal, success dialog
- `app/admin/jobs/page.tsx`: Admin UI — 3 tabs (Jobs / Submissions / Claims) with mock data
- `src/domains/staffing/4role-jobboard.integration.test.ts`: 9 tests

**Evidence:**
```
npx vitest run src/domains/staffing/4role-jobboard.integration.test.ts
✓ 9 tests passed
```

**Build route table:**
```
├ ƒ /admin/jobs
├ ƒ /api/jobs
├ ƒ /api/jobs/apply
```

## Regression (STEP-20)

```powershell
npx vitest run
# Test Files  31 passed (31)
#      Tests  437 passed (437)

npx next build
# ✓ Compiled successfully
```

## Scope Changes

### In scope (4D):
- `src/domains/staffing/submission.service.ts` — NEW
- `src/domains/staffing/submission.service.test.ts` — NEW
- `src/domains/staffing/4role-jobboard.integration.test.ts` — NEW
- `app/api/jobs/route.ts` — NEW
- `app/api/jobs/apply/route.ts` — NEW
- `app/(jobs)/page.tsx` — NEW
- `app/admin/jobs/page.tsx` — UPDATED (skeleton → actual UI)

### Non-goals (MVP):
- Vendor chain (claimType always HRP_DIRECT — Phase 5+)
- Real DB integration in public apply (uses `getPrisma()` at route level)
- Full demo data seeding

## Staged Files

```
A  app/(jobs)/page.tsx
A  app/admin/jobs/page.tsx
A  app/api/jobs/apply/route.ts
A  app/api/jobs/route.ts
A  src/domains/staffing/4role-jobboard.integration.test.ts
A  src/domains/staffing/submission.service.test.ts
A  src/domains/staffing/submission.service.ts
```

## Phase 4 Status

| Slice | Rounds | Status |
|---|---|---|
| 4A — Staffing Fill | 1, 2, 2b, 2c, 3 | ACCEPTED |
| 4B — Attendance Lock | 4, 5, 5.1 | ACCEPTED |
| 4C — Reconciliation | 6 | ACCEPTED |
| **4D — Job Board** | **7 (this)** | **Ready for Tier 3** |

## Next

→ Tier 3 audit → TASK acceptance (Phase 4 ACCEPTED)
