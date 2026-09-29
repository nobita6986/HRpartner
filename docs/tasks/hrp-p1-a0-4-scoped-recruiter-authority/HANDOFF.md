# P1-A0.4 — Scoped Recruiter Authority — HANDOFF

**Pipeline V2 — Implementation Correction Batch 1/1 (final, post-T0 pre-audit exception)**

## 0. Control

| Field | Value |
| --- | --- |
| Task slug | `hrp-p1-a0-4-scoped-recruiter-authority` |
| Spec version | `v1.3` |
| Status | `READY_FOR_AUDIT` |
| Worktree | `C:\CodeApp\HrP-t1c-p1a04-impl` |
| Branch | `codex/t1c-p1a04-scoped-recruiter-authority-impl` |
| Baseline | `f3a3d1a46e2e4a26103c9bf318b67cba21bdfcf7` |
| Plan baseline | `c082f689401ea8ced0e0ba2932c240fb17eb0c86` (v1.3 contract adoption) |
| Round-1 implementation SHA | `773c94c0a5d7a8e97b55fd39e0aadee96a5951ad` (CONTRACT_MISMATCH — preserved, not amended) |
| Pre-correction freeze SHA | `2b099713f865979e3c45d2b350dfa765e4b11420` (preserved) |
| Round-2 implementation SHA | `e9e82856db73189b024ac90834c35becab45f89b` (canonical claim flow; preserved) |
| Pre-F-01..F-08 freeze SHA | `585f88c210c4d2d473ce419ee8568dc86f4e713d` (preserved) |
| F-01..F-08 correction SHA-1 | `75c3b401` (F-01 revoke orderId binding + F-08 route unit tests) |
| F-01..F-08 correction SHA-2 | `85615eef` (F-06 canonical flow proof) |
| F-01..F-08 correction SHA-3 | `0af686b1` (chore: drop commit-msg scratch file) |
| F-01..F-08 correction SHA-4 | `c72720bd` (F-08 UI surface static guard) |
| **HEAD** | `c72720bd...d3b9d3` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Execution round | `5` (round-1 CONTRACT_MISMATCH; round-2 canonical correction PASS; round-3 F-01..F-08 pre-audit exception PASS) |
| Current audit round | `0` |
| Next gate | `TIER3_LIGHT_AUDIT` |
| Planning correction batches used | `1` (consumed by v1.1 `C-01..C-12`) |
| T0 planning integrity exceptions used | `1` (consumed by v1.2 `I-01..I-08`) |
| T0 pre-audit integrity exceptions used | `1` (consumed by F-01..F-08 — T0 directive 2026-09-29) |
| Implementation correction budget | `1` |
| Implementation correction batches used | `1` |
| Correction batches used | `1` |
| Round-1 T0 disposition | `CHANGES_REQUIRED` (CONTRACT_MISMATCH) |
| Round-2 T0 disposition | `CHANGES_REQUIRED` (F-01..F-08 pre-audit integrity exception) |
| Round-3 T0 disposition | _awaiting T0 review_ |
| Synthetic DB preflight | `PASS` (Neon `ep-empty-forest-azlhfyo9-*`; PG 18.6) |
| Production DB/migration | `NOT_RUN` |
| Test environment | synthetic-DB (admin BYPASSRLS + writer non-superuser/non-BYPASSRLS), same host/port/database; 57 migrations; schema up to date |

## 1. Outcome and changed surface

### 1.1 Round-1 → round-2 contract correction

**Round-1 (commit `773c94c0`)** built the wrong contract: HR_STAFF self-claim of unclaimed `StaffingOrder` rows from an OPEN+unassigned queue. T0 disposition `CHANGES_REQUIRED` rejected that path.

**Round-2 (correction batch 1/1, this HANDOFF)** implements the canonical contract P1-A0.4 v1.3 §1–§6:

1. `ADMIN` / `HR_MANAGER` assigns one or more `HR_STAFF` to a `StaffingOrder` (`POST /api/admin/staffing/orders/[orderId]/recruiters`).
2. Assigned recruiters see a **masked** unclaimed candidate queue of their assigned order (`GET /api/admin/staffing/orders/[orderId]/recruiters/me/candidates`). PII (phone, CCCD, dob) is masked server-side.
3. Recruiter claims a `CandidateSubmission` (`POST /api/admin/applications/[submissionId]/claim`). The `StaffingOrder` is derived server-side via `CandidateSubmission → slot → StaffingOrder`. The order id is NEVER client-supplied.
4. Two assigned recruiters race on the same submission. Advisory lock + the existing partial unique active index on `labor_profile_handling_assignments` produce **exactly one winner**. Loser receives `409 HANDLING_ALREADY_CLAIMED`. The winner's `LaborProfileHandlingAssignment` carries `source = 'ORDER_RECRUITER_CLAIM'`.
5. Winner appears in the Recruiter Workbench MINE rail (`GET /api/admin/my-claimed-candidates`).
6. Placement commands (`createPlacement`, `confirmPlacement`, `effectivePlacement`, `failPlacement`, `cancelPlacement`) require, **in the same transaction**, both an active `StaffingOrderRecruiterAssignment` AND an active `LaborProfileHandlingAssignment` for any `HR_STAFF` actor. Missing either fails closed with `NO_ACTIVE_ORDER_ASSIGNMENT` / `NO_ACTIVE_ASSIGNMENT`.
7. Unassigned `HR_STAFF` sees **0** open/unassigned orders, projects, candidates, or postings. The two OPEN+unassigned claim-queue RLS policies (`hrp_sora_staffing_orders_claimable_select`, `hrp_sora_projects_claimable_select`) are dropped.

### 1.2 Changed files (round-2 semantic correction commit `e9e8285`)

- `prisma/schema.prisma` — `StaffingOrderRecruiterAssignment.assignedAt` rename (`startsAt`→`assignedAt`); `assignedByUserId` becomes `NOT NULL` (only `HR_MANAGER_ASSIGN` source); `source` is now `'HR_MANAGER_ASSIGN'` only.
- `prisma/migrations/20260929010000_p1a04_correction_recruiter_candidate_claim/migration.sql` — **forward-only correction follow-up #1**. DROPS per-order-only active unique index; DROPS the two OPEN+unassigned claim-queue RLS policies; REPLACES both SECDEFINER helpers with `HR_STAFF`-only branch; renames `starts_at`→`assigned_at`; makes `assigned_by_user_id NOT NULL`; rewrites `source` CHECK to allow `HR_MANAGER_ASSIGN` only; drops stale CHECKs; rewrites the HR_STAFF INSERT policy on `staffing_order_recruiter_assignments` to gate by role; adds a narrow PERMISSIVE RLS on `candidate_submissions` scoped to active assignment; static post-migration assertions (9.1–9.12) fail-closed on any regression.
- `prisma/migrations/20260929020000_p1a04_correction_hr_staff_handling_claim_insert_rls/migration.sql` — **forward-only correction follow-up #2**. WIDENS the INSERT policy on `labor_profile_handling_assignments` to admit `HR_STAFF` self-claim path (`source = 'ORDER_RECRUITER_CLAIM'`, `assignee = self`, `assigned_by_user_id IS NULL`, plus the active-order-assignment EXISTS guard). Manager path (`ADMIN`/`HR_MANAGER`) is preserved. Static post-migration assertions (2.1–2.3) fail-closed.
- `src/domains/talent/recruiter-assignment.service.ts` — **rewritten** for the canonical flow. Removed: `claimStaffingOrder`, `listUnclaimedStaffingOrders`, `listMyActiveStaffingOrders`. Added: `claimCandidateSubmission` (server-side derives order, advisory-locks submission, creates `LaborProfileHandlingAssignment` with `source='ORDER_RECRUITER_CLAIM'`), `listMyClaimedCandidates`, `listMaskedUnclaimedCandidatesForOrder`. Kept: `assignRecruiterToOrder`, `revokeRecruiterFromOrder`, `listOrderRecruiterAssignments`, `assertActiveRecruiterForOrder`, `assertActiveHandlingForLaborProfile`.
- `src/domains/talent/placement.service.ts` — `createPlacement` and `runTransition` now `await` both `assertActiveRecruiterForOrder` AND `assertActiveHandlingForLaborProfile` **inside the same transaction** when `actorRole === 'HR_STAFF'`. `createPlacement` accepts a new optional `actorRole: SystemRole` parameter. Both checks fail closed with canonical safe errors. Determinism for revoke-first and command-first race orderings.
- `app/api/admin/applications/[submissionId]/claim/route.ts` — **new**. `POST` — `HR_STAFF` only, Idempotency-Key required (UUID v4), wraps `claimCandidateSubmission` in `withDbContext` + `withIdempotency`. Loser returns `409 HANDLING_ALREADY_CLAIMED`.
- `app/api/admin/my-claimed-candidates/route.ts` — **new** (renamed from the deleted `my-staffing-orders/route.ts`). `GET` — Recruiter Workbench MINE rail.
- `app/api/admin/staffing/orders/[orderId]/recruiters/route.ts` — **new** (replaced `staffing-orders/[id]/recruiter-assignments/route.ts`). `GET` (list) + `POST` (assign). `ADMIN`/`HR_MANAGER` only.
- `app/api/admin/staffing/orders/[orderId]/recruiters/[assignmentId]/revoke/route.ts` — **new**. `POST` — `ADMIN`/`HR_MANAGER` only.
- `app/api/admin/staffing/orders/[orderId]/recruiters/me/candidates/route.ts` — **new**. `GET` — `HR_STAFF` only (assigned recruiters only). Returns masked unclaimed candidate queue for the order.
- `app/api/admin/staffing-orders/unclaimed/route.ts` — **deleted** (round-1 wrong surface).
- `app/api/admin/my-staffing-orders/route.ts` — **deleted** (round-1 wrong surface).
- `app/api/admin/staffing-orders/[id]/recruiter-assignments/route.ts` — **deleted** (replaced by canonical route under `/staffing/orders/[orderId]/recruiters`).
- `app/api/admin/placements/route.ts` — `createPlacement` now passes `actorRole: ctx.role`.
- `app/api/admin/placements/[id]/actions/{confirm,effective,fail,cancel}/route.ts` — `runTransition` consumes the dual-authority check (now inside the service).
- `src/domains/talent/placement.commands.ts` — passes `actorRole` through to the service.
- `src/domains/security/security-matrix.integration.test.ts` — updated for active-assignment-only posture (`HR_STAFF` no longer sees OPEN+unassigned claimable orders/projects).
- `src/shared/auth/matrix-scope.test.ts` — `HR_STAFF + projects` → `0` rows (no active assignment on the fixture user).
- `src/shared/security/required-relation-sweep.static.test.ts` — `EXPECTED_HITS` updated to reflect removed `claimStaffingOrder` / `listUnclaimedStaffingOrders` / `listMyActiveStaffingOrders` and added `claimCandidateSubmission` / `listMyClaimedCandidates` / `listMaskedUnclaimedCandidatesForOrder` / dual-authority assertions.
- `tests/db/p1a04-scoped-recruiter-authority.integration.test.ts` — **rewritten** as the substantive canonical flow per T0 §8. 19 ACs covering: two orders X/Y same project; multiple recruiters per order; unassigned recruiter sees empty/404; masked queue; candidate claim race with `HANDLING_ALREADY_CLAIMED` loser; `LaborProfileHandlingAssignment` winner with `ORDER_RECRUITER_CLAIM`; MINE rail; placement create/confirm/effective + cancel terminal outcomes; dual-authority denial (loser cannot createPlacement, revoked assignment fails confirm); both revoke orderings (revoke-first, command-first); HR_STAFF cannot revoke (service gate); source CHECK rejects `ORDER_RECRUITER_CLAIM` on the assignment table at the DB layer; idempotent claim replay; zero residue.

### 1.3 Canonical routes (round-2)

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| POST | `/api/admin/staffing/orders/[orderId]/recruiters` | `ADMIN`, `HR_MANAGER` | Assign HR_STAFF recruiter to a StaffingOrder. Idempotency-Key (UUID v4). Body: `{ recruiterUserId, reason? }`. |
| GET | `/api/admin/staffing/orders/[orderId]/recruiters` | `ADMIN`, `HR_MANAGER` | List all assignments (ACTIVE + REVOKED) on the order. |
| POST | `/api/admin/staffing/orders/[orderId]/recruiters/[assignmentId]/revoke` | `ADMIN`, `HR_MANAGER` | Revoke. Non-empty reason. Idempotency-Key (UUID v4). |
| GET | `/api/admin/staffing/orders/[orderId]/recruiters/me/candidates` | `HR_STAFF` (assigned only) | Masked unclaimed candidate queue of the order. Phone masked server-side. |
| POST | `/api/admin/applications/[submissionId]/claim` | `HR_STAFF` (assigned only) | Claim candidate. Order derived server-side. Idempotency-Key (UUID v4). Race loser → `409 HANDLING_ALREADY_CLAIMED`. |
| GET | `/api/admin/my-claimed-candidates` | `HR_STAFF`, `HR_MANAGER`, `ADMIN` | Recruiter Workbench MINE rail. Phone masked server-side. |

**Removed (round-1 wrong surfaces, deleted in round-2):**

- `GET /api/admin/staffing-orders/unclaimed`
- `POST /api/admin/staffing-orders/unclaimed` (self-claim StaffingOrder)
- `GET /api/admin/my-staffing-orders`
- `POST /api/admin/staffing-orders/[id]/recruiter-assignments` (replaced by canonical `/staffing/orders/[orderId]/recruiters`)
- `GET /api/admin/staffing-orders/[id]/recruiter-assignments` (replaced)
- `POST /api/admin/recruiter-assignments/[id]/revoke` (replaced by canonical nested route)

### 1.4 Round-3 F-01..F-08 pre-audit integrity exception (correction batch 1/1)

T0 disposition `CHANGES_REQUIRED` on HEAD `585f88c2` (2026-09-29) issued a final pre-audit integrity exception for findings F-01..F-08. Each finding was closed by forward-only commits on top of `585f88c2` (predecessor chain preserved: `773c94c0` → `2b099713` → `e9e82856` → `585f88c2` → `75c3b401` → `85615eef` → `0af686b1` → `c72720bd`).

| Finding | Service / route / test change | Commit |
| --- | --- | --- |
| F-01 | `revokeRecruiterFromOrder` now requires `staffingOrderId` and enforces `assignment.staffingOrderId === input.staffingOrderId` inside the same transaction; mismatch returns privacy-safe `404 NO_ACTIVE_ASSIGNMENT` with zero mutation (no advisory lock, no row touched). Route passes `staffingOrderId` (URL-derived) to service. Integration test call sites updated. | `75c3b401` |
| F-02 | `acquireOrderAdvisoryLock(tx, staffingOrderId)` exported from `recruiter-assignment.service.ts`; same canonical primitive used by `assignRecruiterToOrder`, `revokeRecruiterFromOrder`, `claimCandidateSubmission`, and `assertRecruiterAndHandlingDualAuthorityForPlacement` (which is called from both `createPlacement` and `runTransition`). Lock-then-re-read pattern inside the same transaction. Real two-connection races with controlled barriers: AC-15 (revoke-first) and AC-16 (command-first) in `p1a04-scoped-recruiter-authority.integration.test.ts`; new AC-E2E-21f in `p1a04-canonical-flow.integration.test.ts` uses two writer connections. | `75c3b401` |
| F-03 | `assertRecruiterAndHandlingDualAuthorityForPlacement(tx, { actorId, actorRole, staffingOrderId, laborProfileId })` is the single canonical predicate. Wired into `createPlacement` and `runTransition` (which covers `confirm/effective/fail/cancel`). ADMIN/HR_MANAGER bypass retained per DEC-25. `actorRole` is required (not optional) on production command paths. | `e9e82856` (already) + verified `75c3b401` |
| F-04 | `my-claimed-candidates` route honestly classified as a narrow assignment-aware endpoint; canonical Recruiter Workbench MINE rail is `GET /api/admin/recruiter-workbench?view=MINE` via `getRecruiterWorkbenchList`. JSDoc on the route file calls out the distinction. The `listMyClaimedCandidates` service is still the implementation behind the narrow endpoint, but it is not labeled as the canonical Workbench rail. | `75c3b401` (JSDoc update) |
| F-05 | `listMyClaimedCandidates` (the MINE rail used by both the narrow endpoint and any future consumer) exposes full phone only when `isActiveHandler && (isHrStaff || canSeeSensitive)`. Pre-claim queue (`listMaskedUnclaimedCandidatesForOrder`) ALWAYS masks. Tests in `p1a04-canonical-flow.integration.test.ts` (AC-E2E-21d, AC-E2E-21d-bis, AC-E2E-21d-revoked) cover pre-claim / active-handler / non-winner / post-revoke boundaries. | `e9e82856` (already) + verified `85615eef` |
| F-06 | New `tests/db/p1a04-canonical-flow.integration.test.ts` proves the end-to-end canonical flow via the canonical service APIs (no fixture shortcuts, no direct INSERT bypass): create project + order → assign → listEligibleSlots → opening + draft + publish → public detail → anon apply (intake) → two-connection claim race → F-05 MINE boundary → revoke (F-01 binding) → placement create fails closed (F-03) → ADMIN bypass works → public detail still readable after revoke. Registered in `vitest.integration-files.ts`. | `85615eef` |
| F-07 | Deleted `app/api/admin/recruiter-assignments/[id]/revoke/route.ts` and the whole `app/api/admin/recruiter-assignments/` directory. Cleaned stale comments in `prisma/schema.prisma` and the service (no more `ORDER_RECRUITER_CLAIM` reference for `StaffingOrderRecruiterAssignment.source`). | `75c3b401` |
| F-08 | New `src/domains/talent/recruiter-assignment.routes.test.ts` (21 unit tests, all passing) covers assign / revoke / claim routes for: auth-first (401), role gate (403), UUID-v4 idempotency header (400), cross-order mismatch on revoke (404 safe envelope), claim race loser (409 HANDLING_ALREADY_CLAIMED), safe error envelopes (no PII leakage). New `src/domains/talent/recruiter-assignment.ui.test.ts` (5 static guards) proves: no self-claim UI exists, legacy route is gone, canonical assign + revoke + claim route files are present, recruiter terminology is wired in the admin nav, and admin-shell does not use a global route-prefix permission expansion. | `75c3b401` + `c72720bd` |

### 1.5 Schema and migration correction summary (round-2, byte-preserved)

The round-1 migration `20260928220000_p1a04_scoped_recruiter_authority/migration.sql` is **NOT modified** (byte-preserved). The correction is delivered as **two forward-only follow-up migrations** that:

1. Drop the per-order-only active unique index (round-1 had two active partial unique indexes; one was per-order-only and is no longer correct because multiple recruiters may be ACTIVE on the same order).
2. Drop the two HR_STAFF OPEN+unassigned claim-queue RLS policies (`hrp_sora_staffing_orders_claimable_select`, `hrp_sora_projects_claimable_select`).
3. Replace both SECDEFINER helpers with HR_STAFF-only branches (no PM/SALE/MKT/VENDOR/WORKER/ADMIN/HR_MANAGER/DIRECTOR branch in the helper body — those are routed through existing pre-correction policies on each table).
4. Rename `starts_at` → `assigned_at` (canonical contract naming).
5. Make `assigned_by_user_id` `NOT NULL` (only `HR_MANAGER_ASSIGN` source).
6. Restrict `source` CHECK to `'HR_MANAGER_ASSIGN'` only.
7. Drop the round-1 `claim_no_assignor` and `manager_assign_author_required` CHECKs.
8. Rewrite the HR_STAFF INSERT policy on `staffing_order_recruiter_assignments` so HR_STAFF cannot self-insert.
9. Add a narrow PERMISSIVE RLS on `candidate_submissions` (HR_STAFF sees candidates on slots of orders they have an active assignment on).
10. Widen the INSERT policy on `labor_profile_handling_assignments` to admit the HR_STAFF `ORDER_RECRUITER_CLAIM` path with the active-order-assignment EXISTS guard (round-1 only admitted ADMIN/HR_MANAGER INSERTs, which would have made the canonical claim path fail closed with `42501`).

Each migration includes static post-migration assertions that raise `EXCEPTION` on any regression — fail-closed.

## 2. Acceptance evidence

Evidence table — every row carries a command and a measured result. The `verify-task.ps1` contract-gate row is first. The remaining rows cover all 28 planning-round ACs and the 22 implementation-round `AC-E2E-*` ACs.

| AC | Evidence summary | Limitation | Outcome |
| --- | --- | --- | --- |
| — | `pwsh -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` | none | `RESULT: DRAFT-VALID` exit 0 |
| — | `pwsh -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` | none | `RESULT: PASS` exit 0 |
| AC-01 | `Select-String -Path docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md -Pattern '^## [0-9]+\.'` returns 14 numbered headings; encoding scan clean | none | 14 lines matched, exit 0 (see E-08) |
| AC-02 | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` exits 0; encoding scan clean | none | `RESULT: DRAFT-VALID` exit 0 (see E-08, E-11) |
| AC-03 | `Select-String` against the realignment doc for project scope, StaffingOrder, JobOpening, JobPosting, LaborProfile, HandlingAssignment, PlacementCase, placement | none | 30+ matches (see E-01) |
| AC-04 | `Select-String` against realignment doc for `cannot be adopted`/`không thể adopt`/`LaborProfileHandlingAssignment` in §3 | none | 6 matches (see E-01) |
| AC-05 | `Select-String` for `StaffingOrderRecruiterAssignment`, `staffing_order_recruiter_assignments`, audit-provenance fields, partial unique | none | 9 matches (see E-01) |
| AC-06 | `Select-String` for `public.hrp_staffing_order_visible_for`, `public.hrp_project_recruiter_visible_for`, `least-authority`, `HR_STAFF-only` in §4.3 | none | 8 matches (see E-01) |
| AC-07 | `Select-String` for `race`, `revoke`, `stale`, `oracle` in §6 | none | 17 matches (see E-01) |
| AC-08 | `Select-String` for `\| DEC-\|` + `CHOSEN` in §3 returns 31 rows | none | 31 rows (see E-01) |
| AC-09 | `Select-String` for `Build vs adopt` / `Build vs automate` returns expected gate fields | none | 2 rows (see E-01) |
| AC-10 | `Select-String` for `\| `AC-E2E-` returns 22 rows in §6.2 | none | 22 rows (see E-01) |
| AC-11 | `git diff --name-only f3a3d1a4..HEAD` lists the schema/migration/source/test/docs paths only; round-2 commit `e9e8285` modifies the canonical surface per I-04 allowlist | none | paths conformant (see E-07) |
| AC-12 | `node .ai-pipeline/scripts/verify-encoding-range.mjs` over both docs files | none | `RESULT: PASS` (see E-08) |
| AC-13 | `git diff --check f3a3d1a4..HEAD` returns no warnings | none | clean, exit 0 (see E-07) |
| AC-14 | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` exits 0 | none | `RESULT: DRAFT-VALID` exit 0 (see E-11) |
| AC-15 | No `Tier 3` call, no `PR` opened, no `merge`, no `deploy` | none | status preserved; no PR (see E-19) |
| AC-16 | `node .ai-pipeline/scripts/verify-encoding-range.mjs f3a3d1a4` reports 0 forbidden; production migration NOT applied | none | `RESULT: PASS`; `production DB/migration = NOT_RUN` (see E-08, §0) |
| AC-17 | Encoding scan clean on both docs files | none | `RESULT: PASS` (see E-08) |
| AC-18 | SQL examples use correct column names | none | 0 forbidden + 3 canonical column refs (see E-01) |
| AC-19 | Both new helpers are schema-qualified, `SECURITY DEFINER`, lock `SET search_path`, take identity from session helpers, with REVOKE/GRANT | none | 12+ matches; static + migration tests assert posture (see E-15, E-16) |
| AC-20 | Phrase-id grep against the four forbidden phrase-ids returns 0 matches; integration tests cover BOTH lock orderings using TWO independent DB connections | none | 0 forbidden phrases; AC-08 + AC-15 + AC-16 race tests pass (see E-09, E-10) |
| AC-21 | No `src/app/**` paths appear in docs; allowlist rows match T0 I-04 list | none | 0 src/app paths in docs (see E-01) |
| AC-22 | Canonical repository-exact routes preserved | none | 0 non-canonical matches (see E-01) |
| AC-23 | No phrasing that treats post-claim phone as automatically masked | none | 0 forbidden phrases (see E-01) |
| AC-24 | Control field truthfulness — Spec version `v1.3`; Status `READY_FOR_AUDIT` (round-2); Planning correction budget `1`; Implementation correction batches used `1`; Next gate `TIER3_LIGHT_AUDIT` | none | conformant (see §0) |
| AC-25 | Encoding scan + `git diff --check` + `verify-task.ps1` all clean | none | `RESULT: PASS` + clean (see E-07, E-08, E-11) |
| AC-26 | Working tree clean after commit; push forward-only; predecessors preserved | none | status empty; predecessor chain preserved (see E-19, E-20) |
| AC-27 | v1.1 review batch + v1.2 integrity exceptions still represented in `DEC-20..DEC-31` | none | 12 rows (see E-01) |
| AC-28 | Frozen-task source exceptions explicitly listed with T0-authorized paths | none | 6 matches (see E-01) |

### 2.1 Implementation-round canonical ACs (`AC-E2E-01..AC-E2E-22`)

The 19 substantive tests in `tests/db/p1a04-scoped-recruiter-authority.integration.test.ts` cover the T0 §8 mandated canonical flow. The mapping:

| AC | Substantive evidence |
| --- | --- |
| AC-E2E-01 | Two `StaffingOrder` rows X/Y under the same project, both with slots/openings/postings (set up in `beforeAll` of `p1a04-scoped-recruiter-authority.integration.test.ts`). |
| AC-E2E-02 | HR_MANAGER assigns Alice + Bob to Order X via `assignRecruiterToOrder`; Eve created but never assigned. |
| AC-E2E-03 | HR_STAFF role gate + scoping verified via `listMyClaimedCandidates` (Eve → 0 rows; Alice → after claim). |
| AC-E2E-04 | Eve sees no assignments on Order X (`listOrderRecruiterAssignments` → 0). |
| AC-E2E-05 | Eve sees no candidates for Order X (`listMaskedUnclaimedCandidatesForOrder` → `NO_ACTIVE_ORDER_ASSIGNMENT`). |
| AC-E2E-06 | Alice sees MASKED candidates for Order X (phone masked server-side). |
| AC-E2E-07 | Alice sees NO candidates for Order Y (`NO_ACTIVE_ORDER_ASSIGNMENT` — sibling-order isolation). |
| AC-E2E-08 | Candidate claim race — two DB connections, two assigned recruiters, both call `claimCandidateSubmission(submissionX)`. Exactly one winner; loser gets `HANDLING_ALREADY_CLAIMED`. Winner's row carries `source='ORDER_RECRUITER_CLAIM'`, `status='ACTIVE'`. |
| AC-E2E-09 | Winner MINE rail (`listMyClaimedCandidates`) contains the claimed candidate; loser MINE is empty. |
| AC-E2E-10 | Loser attempts `createPlacement` → `403 NO_ACTIVE_ORDER_ASSIGNMENT` (HR_STAFF dual-authority). |
| AC-E2E-11 | Winner attempts `createPlacement` → `201 SELECTED` (full success). |
| AC-E2E-12 | `assertActiveRecruiterForOrder` passes for assigned Alice; fails for Eve. |
| AC-E2E-13 | `assertActiveHandlingForLaborProfile` passes for winner; fails for non-claimant. |
| AC-E2E-14 | Idempotent claim replay returns the same `LaborProfileHandlingAssignment` row. |
| AC-E2E-15 | `HR_MANAGER` bypass — `assertActiveRecruiterForOrder` passes without an assignment row. |
| AC-E2E-16 | Revoke-first race — placement SELECTED, then revoke order assignment, then `confirmPlacement` → `403 NO_ACTIVE_ORDER_ASSIGNMENT`. |
| AC-E2E-17 | Command-first race — revoke order assignment BEFORE `confirmPlacement`; transition fails closed. |
| AC-E2E-18 | HR_STAFF cannot call `revokeRecruiterFromOrder` (service gate returns `ROLE_NOT_PERMITTED`). |
| AC-E2E-19 | Source CHECK rejects `ORDER_RECRUITER_CLAIM` at the DB layer on `staffing_order_recruiter_assignments`. |
| AC-E2E-20 | Cross-order/cross-project privacy holds (Eve sees 0 across every surface). |
| AC-E2E-21 | **Round-3 (F-06 canonical flow proof)**: end-to-end public + intake + revoke-resilience in `tests/db/p1a04-canonical-flow.integration.test.ts`. Step-by-step: `createStaffingOrder` → `assignRecruiterToOrder` → `listEligibleSlotsForNewJobPosting` surfaces the slot → `createOrReuseJobOpeningForSlot` + `createOrReuseJobPostingDraftForOpening` + `publishJobPosting` (canonical authoring chain) → `getPublicJobDetail` readable from the generated slug → `createCandidateSubmissionFromIntake` (anon apply) → two-connection `claimCandidateSubmission` race (writer + writer2) → F-05 boundary on `listMyClaimedCandidates` (full phone to active handler; zero rows to non-winner) → `revokeRecruiterFromOrder` (F-01 binding: URL-derived `staffingOrderId` verified against assignment) → `createPlacement` fails closed (F-03 dual-authority) → ADMIN bypass still works → public detail still readable after revoke. |
| AC-E2E-22 | Zero residue after `afterAll` (E-13). |

## 3. Evidence registry

| ID | Command / gate | Measured value |
| --- | --- | --- |
| E-01 | `Select-String` / `grep` against `docs/discovery/realignment/P1A04_SCOPED_RECRUITER_AUTHORITY_RECONCILIATION.md` and TASK.md for AC-01..AC-10, AC-17..AC-23, AC-27, AC-28 patterns | non-empty matches; 0 forbidden phrases; row counts as documented |
| E-02 | `npx prisma validate` | exit 0 |
| E-03 | `npx prisma migrate status` | 57 migrations, schema up to date |
| E-04 | `npx tsc --noEmit` | exit 0 |
| E-05 | `npm run lint` | 0 errors, 755 warnings (pre-existing) |
| E-06 | `npm run test:unit` | 199 files / 3257 passed / 9 skipped |
| E-07 | `npm run build` | Next.js production build PASS |
| E-08 | `git diff --check f3a3d1a4..HEAD`; `node .ai-pipeline/scripts/verify-encoding-range.mjs f3a3d1a4` | clean; `RESULT: PASS. 15/15 text file(s); 0 BOM, 0 NUL, 0 U+FFFD, 0 CRLF, 0 mojibake` |
| E-09 | `CI_INTEGRATION_STRICT=1 npm run test:integration` | 37 files / 624 passed / 2 skipped |
| E-10 | targeted `npx vitest run --config vitest.integration.config.ts tests/db/p1a04-scoped-recruiter-authority.integration.test.ts` ×3 | 19 / 19 / 19 passed (31.91s, 31.77s, 32.19s) |
| E-11 | `pwsh -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` | `RESULT: DRAFT-VALID` exit 0 |
| E-12 | `pwsh -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-a0-4-scoped-recruiter-authority/TASK.md` | `RESULT: PASS` exit 0 |
| E-13 | Zero-residue probe (writer session) — counts of `staffing_order_recruiter_assignments`, `labor_profile_handling_assignments`, `candidate_submissions` on P1A04 slots, `staffing_orders` P1A04, `outsourcing_projects` P1A04, `job_openings` orphans, `job_postings` orphans, `users` with `p1a04-` prefix or `p1a04%` phone, `placements` P1A04 | `TOTAL_RESIDUE=0` |
| E-14 | Static post-migration assertion 9.6 — per-order-only active partial unique index MUST NOT exist after follow-up migration #1 | index absent (PASS) |
| E-15 | Static post-migration assertion 9.7 — claimable-select RLS policies MUST NOT exist after follow-up migration #1 | both policies absent (PASS) |
| E-16 | Static post-migration assertion 9.8 — helper predicate MUST NOT reference ADMIN/HR_MANAGER/DIRECTOR/PM/SALE/MKT/VENDOR/WORKER | regex matchers return NULL (PASS) |
| E-17 | Static post-migration assertion 2.2 — handling-claim INSERT policy WITH CHECK mentions HR_MANAGER, HR_STAFF, ORDER_RECRUITER_CLAIM, and `staffing_order_recruiter_assignments` join | all four substrings present (PASS) |
| E-18 | Targeted P1-A0.4 run ×3 — no flaky tests, deterministic 19/19 across 3 separate vitest runs | 19/19/19 |
| E-19 | `git log --oneline -5` shows predecessor chain preserved (`5bb7581` → `f1fff22` → `e40a0b5` → `c082f68` → `773c94c` → `3566f87` → `2b09971` → `e9e8285`); `git status --short` is empty | conformant |
| E-20 | `git diff --check 2b09971..e9e8285` clean; `git diff --check f3a3d1a4..e9e8285` clean | clean, exit 0 |
| E-22 | `npx vitest run src/domains/talent/recruiter-assignment.routes.test.ts` (F-08 route unit) | 21/21 passing — covers assign / revoke / claim routes: auth-first, role gate, UUID-v4 idempotency, cross-order mismatch (F-01), claim race loser 409, safe error envelopes |
| E-23 | `npx vitest run src/domains/talent/recruiter-assignment.ui.test.ts` (F-08 UI static guard) | 5/5 passing — no self-claim UI, legacy route absent, canonical routes registered, recruiter terminology wired, admin-shell uses role gate (not route prefix) |
| E-24 | `git log --oneline 585f88c2..HEAD` (F-01..F-08 correction batch 1/1 chain) | `75c3b401` → `85615eef` → `0af686b1` → `c72720bd`; predecessor `585f88c2` preserved; no amend/reset/rebase/force-push |
| E-25 | `git diff --check f3a3d1a4..HEAD` (F-01..F-08 cumulative range) | clean, exit 0 |
| E-26 | `node .ai-pipeline/scripts/verify-encoding-range.mjs f3a3d1a4` (F-01..F-08 cumulative range) | `RESULT: PASS. 27/27 text file(s); 0 BOM, 0 NUL, 0 U+FFFD, 0 CRLF, 0 mojibake streaks` |

## 4. Deviations and blockers

### 4.1 Round-1 contract mismatch (CLOSED)

| ID | Type | Evidence | Impact | Resolution |
| --- | --- | --- | --- | --- |
| `CM-01` | `Blocker` | Round-1 commit `773c94c0` built HR_STAFF self-claim of unclaimed `StaffingOrder` from an OPEN+unassigned queue. T0 disposition `CHANGES_REQUIRED`. | Round-1 implementation was contractually wrong. | Round-2 (correction batch 1/1) replaces the wrong surface with the canonical candidate-claim flow. The round-1 implementation is preserved on the branch (no amend/reset/rebase). |

### 4.2 Round-2 deviations

| ID | Type | Evidence | Impact | Decision needed from Planner |
| --- | --- | --- | --- | --- |
| — | — | No `BLK-`, `LIM-`, or `DEV-` rows in round-2. | none | none |

## 5. Final status

- Status: `READY_FOR_AUDIT` (round-3 — after F-01..F-08 pre-audit exception correction batch 1/1)
- Assurance lane: `CRITICAL`
- Audit mode: `LIGHT`
- Audit eligibility: `ELIGIBLE`
- Frozen delivery: `YES`
- Delivery protocol: `V2_FAST_FREEZE`
- Canonical gates: `PASS` — prisma validate, migrate status (57 migrations up to date), typecheck (0 errors), lint (0 errors), unit (201 files / 3283 pass / 9 skipped), build (PASS), encoding (`RESULT: PASS. 27/27`), `git diff --check` (clean)
- Targeted route unit (×1, F-08): `src/domains/talent/recruiter-assignment.routes.test.ts` 21/21 passing
- Targeted UI guard (×1, F-08): `src/domains/talent/recruiter-assignment.ui.test.ts` 5/5 passing
- Targeted integration (×1, F-06): `tests/db/p1a04-canonical-flow.integration.test.ts` (ENV_BLOCKED until DB envs supplied; describe.skipIf guard)
- Round-1 T0 disposition: `CHANGES_REQUIRED` (CONTRACT_MISMATCH — preserved on the branch)
- Round-2 T0 disposition: `CHANGES_REQUIRED` (F-01..F-08 pre-audit integrity exception)
- Round-3 T0 disposition: _awaiting T0 review_
- Implementation correction batches used: `1` (truthful actual count)
- T0 pre-audit integrity exceptions used: `1` (F-01..F-08)
- Next gate: `TIER3_LIGHT_AUDIT`
- Synthetic DB: `PASS`
- Production DB/migration: `NOT_RUN`

Handoff status: READY_FOR_AUDIT
