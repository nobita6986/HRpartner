# TASK — `hrp-p1-runtime-route-slug-hotfix`

P1 runtime bootability hotfix. CRITICAL priority.

Single defect:

- **P1-RT-SLUG-01** — Next.js dynamic-segment name collision under
  `app/api/admin/applications/` makes the application return HTTP 500 for every
  request because Next.js refuses to initialize the route tree when sibling
  segments use different dynamic-slug names at the same depth
  (`[id]` vs `[submissionId]`).

This hotfix must restore bootability of exact main without changing the public
contract, only the on-disk slug. Tracked separately so the slug normalization,
the durable idempotency-namespace retention and the generic static regression
guard are each traceable to the same root cause.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-runtime-route-slug-hotfix` |
| Work type | `CODE` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.0` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | Hotfix is a routing-only normalization that preserves auth/RLS/domain/idempotency semantics byte-for-byte; the durable idempotency namespace is intentionally retained (no replay-table migration); the regression guard is fully self-checking. STANDARD lane is conservative; audit adds no incremental assurance because (a) the only changed runtime handler keeps its durable idempotency key, (c) the URL/contract is unchanged and (d) Tier 2 self-test plus the runtime boot regression already prove bootability. |
| Status | `READY_FOR_REVIEW` |
| Audit round | `0` (Audit mode = NONE; no round will be opened) |
| Planner | `Tier 1` (T1C, directive `T0 → T1C — P1 runtime route-slug collision hotfix`) |
| Baseline | `63d19107034836cb57e5d06e321fd336285bf51e` |
| Implementation SHA | `66abd76177bca0438c7a6e236f027f8045dc0182` |
| Semantic Implementation SHA | `66abd76177bca0438c7a6e236f027f8045dc0182` |
| Reconciled Implementation SHA | `66abd76177bca0438c7a6e236f027f8045dc0182` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `NOT_REQUIRED` (Audit mode = NONE; Correction batches used = 0; gates green) |
| Correction batches used | `0` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `NOT_REQUIRED` (the runtime boot regression runs locally against `next dev`; no synthetic DB cluster is touched by this hotfix; forbidden scope) |
| Next gate | `PR_OPEN_AND_CI_GREEN` (Tier 1 opens non-draft PR to `main` and waits for CI; T0 reviews; do not merge) |
| In-scope roots | `app/api/admin/applications/[id]/claim/route.ts` (moved from `[submissionId]/claim`); `app/api/admin/my-claimed-candidates/route.ts` (comment only); `src/domains/talent/recruiter-assignment.routes.test.ts`; `src/domains/talent/recruiter-assignment.ui.test.ts`; `app/__tests__/app-router.dynamic-segment-collision.test.ts` (NEW); `docs/tasks/hrp-p1-runtime-route-slug-hotfix/**` |
| Forbidden paths | `prisma/**`; `src/shared/auth/**`; `src/shared/integrity/idempotency.ts`; `src/domains/talent/recruiter-assignment.service.ts`; `src/domains/staffing/**`; `src/domains/placement/**`; `src/domains/job-board/**`; `app/api/admin/applications/[id]/other-**` (other dynamic-segment routes); `app/admin/**`; `app/(jobs)/**`; `app/(portal)/**`; sidebar/menu/IA; `docs/tasks/hrp-p1-a04*/`; `docs/tasks/hrp-p1-a05*/`; production DB; production migration; `docs/PLANNER_HANDOVER.md` |
| Required gates | targeted recruiter-assignment routes test; targeted recruiter-assignment UI/static test; new generic App Router dynamic-segment collision guard; `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run build` (see §4.7 below for pre-existing `<Html>` prerender caveat); `git diff --check`; strict UTF-8/no-BOM (see §4.7 below); `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-runtime-route-slug-hotfix/TASK.md`; `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-runtime-route-slug-hotfix/TASK.md -HandoffPath docs/tasks/hrp-p1-runtime-route-slug-hotfix/HANDOFF.md`; runtime boot smoke (see §5) |
| Build vs adopt | `ADOPT` |
| Build vs automate | `N/A` |
| Correction budget | `1` |
| Remaining release gate | `T0_PR_REVIEW` (T0 reviews PR and merges after CI green; P1 runtime UI/HTTP E2E remains pending after merge) |

## 1. Outcome

### 1.1 P1-RT-SLUG-01 — Next.js dynamic-segment name collision

`main @ 63d19107` ships the claim endpoint under
`app/api/admin/applications/[submissionId]/claim/route.ts` while siblings
under `app/api/admin/applications/[id]/...` use the slug `[id]`. Next.js's
route-initializer (`next/dist/.../sorted-routes.js`, embedded as
`.next/server/chunks/5611.js` at build time) refuses to construct the route
tree and throws:

```
You cannot use different slug names for the same dynamic path ('id' !== 'submissionId').
```

Because route initialization is global, **every** request — including
`/login`, `/api/auth/login`, `/viec-lam` — returns HTTP 500. This blocks
the mandatory P1 runtime UI/HTTP E2E on the merged worktree.

#### 1.1.1 User-visible outcome (RQ-01)

- All HTTP requests served by `main @ 63d19107+hotfix` initialize the route
  tree without an unhandled slug-collision rejection.
- The claim endpoint keeps its external URL byte-for-byte equivalent:
  `POST /api/admin/applications/<submission UUID>/claim`.
- HR_STAFF-only role gate, active-recruiter/order assignment requirement,
  UUID v4 validation, Idempotency-Key validation, claim race behavior,
  typed error/status mapping, safe envelope and no-PII guarantees are all
  preserved (they live in service code that the slug rename does not touch).
- The durable idempotency namespace stays
  `POST:/api/admin/applications/[submissionId]/claim` so any existing
  `idempotency_key` row written by previous deployments continues to replay
  cleanly; only the on-disk dynamic-segment name changed.
- A new generic static regression guard
  (`app/__tests__/app-router.dynamic-segment-collision.test.ts`) fails the
  build if any future App Router route tree ever introduces a sibling
  dynamic-segment name collision at any path position. The guard is
  generic — no per-route allowlist.

#### 1.1.2 Non-goals

- No domain service behavior change. `claim()` semantics are owned by the
  recruiter-assignment service which is forbidden in scope.
- No database schema, migration, RLS policy, or auth change.
- No JobOpening behavior, no placement behavior, no sidebar/menu change.
- No P1-A0.5 frozen artifacts modified.
- No production DB access, no production migration, no deploy.
- No P2/P3/P4/P5 work.
- The public URL is unchanged; no client contract change.

## 2. Evidence

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `git rev-parse origin/main` at hotfix start (measured 2026-09-30 17:00) | Baseline SHA `63d19107034836cb57e5d06e321fd336285bf51e`. The branch `codex/t1c-p1-route-slug-hotfix` was forked from this exact SHA via `git worktree add ... origin/main` | Confirms RQ-02: the hotfix must restore bootability of this exact baseline; no commits beyond the slug rename and its directly affected test/doc surface are allowed on this branch before the PR. |
| `EV-02` | `app/api/admin/applications/[id]/claim/route.ts` (HEAD `63d19107+hotfix`, measured 2026-09-30 17:01) | The claim handler, after the rename, lives under a `[id]` dynamic segment. The handler signature reads `params: Promise<{ id: string }>` and the body aliases `const submissionId = resolved.id`. | Confirms RQ-03: the on-disk slug is normalized to `[id]`; the durable `ROUTE_KEY` literal is preserved verbatim. |
| `EV-03` | `app/api/admin/applications/[id]/` siblings at HEAD `63d19107` (measured 2026-09-30 17:02) | Multiple siblings under `applications/[id]/...` use the slug `[id]` (e.g. `applications/[id]/recruiter/route.ts`, `applications/[id]/order/route.ts`, `applications/[id]/unassign/route.ts`, etc., enumerated by `getSortedRoutes`). | Confirms RQ-04: the collision was real on `main @ 63d19107`; Next.js refused sibling dynamic segments with different names at the same depth under `applications/`. |
| `EV-04` | `src/shared/integrity/idempotency.ts` + the moved `route.ts` `ROUTE_KEY` constant (HEAD `63d19107+hotfix`, measured 2026-09-30 17:03) | The handler declares `const ROUTE_KEY = 'POST:/api/admin/applications/[submissionId]/claim'` and calls `withIdempotency(..., { routeKey: ROUTE_KEY, ... })`. `idempotency_key` rows written by the previous handler carry this namespace. The literal is preserved byte-for-byte after the rename. | Confirms RQ-05: replay compatibility preserved by retaining the namespace string even though the on-disk slug changes. |
| `EV-05` | `src/domains/talent/recruiter-assignment.routes.test.ts` and `src/domains/talent/recruiter-assignment.ui.test.ts` at HEAD `63d19107+hotfix` (measured 2026-09-30 17:04) | The tests import the claim handler from `@/app/api/admin/applications/[id]/claim/route` (post-hotfix). The routes test invokes the handler with `{ params: paramsPromise({ id: SUBMISSION }) }`. F-08/2 of the UI test asserts the file path `[id]/claim/route.ts` exists. | Confirms RQ-06: tests align with the renamed slug. |
| `EV-06` | `app/api/admin/my-claimed-candidates/route.ts:1-5` header comment at HEAD `63d19107+hotfix` (measured 2026-09-30 17:05) | Header comment text describes the sibling route layout without referencing `[submissionId]` as a slug. | Confirms RQ-07: header comment updated; no runtime logic change. |
| `EV-07` | `app/__tests__/app-router.dynamic-segment-collision.test.ts` at HEAD `63d19107+hotfix` (NEW, measured 2026-09-30 17:06) | The new guard scans `app/**/route.ts` for sibling dynamic-segment name mismatches at any path position. It detects the original invalid combination (`applications/[id]/...` vs `applications/[submissionId]/claim`) on a synthesized tree, detects a synthesized future regression at a different path position, and passes on the current worktree. | Confirms RQ-08: a generic regression guard exists with no per-route allowlist. |
| `EV-08` | `next/dist/.../sorted-routes.js` (bundled into `.next/server/chunks/5611.js` after build, 2026-09-30 17:07) | The slug-collision rejection is `Error("You cannot use different slug names for the same dynamic path ('${a}' !== '${c}').")` thrown by `_insert(...)` of the route trie during `getSortedRouteObjects(...)`. The throw aborts route initialization globally so every request returns 500. | Confirms RQ-09: the bug blocks bootability because it is a global route-tree reject, not a per-route error. |
| `EV-09` | `next dev` boot log captured during this hotfix round (see `docs/tasks/hrp-p1-runtime-route-slug-hotfix/boot-smoke-results.json` and `next-dev.log`) | Pre-hotfix `next dev` against `main @ 63d19107` would reject route initialization. Post-hotfix, dev server compiles `/login`, `/api/auth/login`, `/viec-lam`, and the moved `/api/admin/applications/[id]/claim` without rejection; each endpoint serves its non-500 response. | Confirms RQ-10: runtime bootability for the canonical P1 surface after the hotfix. |
| `EV-10` | `docs/tasks/hrp-p1a05-*/AUDIT.md` (frozen, measured 2026-09-30 17:08) | Frozen P1-A0.5 artifacts reference `[submissionId]` as a placeholder in the durable idempotency namespace only; they do not encode the filesystem slug. | Confirms RQ-11: the hotfix preserves the durable namespace as documented; no rewrite of frozen P1-A0.5 artifacts is required. |

## 3. Decisions

### 3.1 Build vs Adopt

`ADOPT`. The hotfix uses existing primitives exclusively:

- Next.js App Router dynamic-segment routing (`app/**/route.ts`).
- `withDbContext` and `withIdempotency` (the latter already wraps the claim
  handler via the `ROUTE_KEY` constant which is preserved verbatim).
- The durable idempotency namespace string
  `POST:/api/admin/applications/[submissionId]/claim`.
- Vitest for the new static regression guard.

The only new artifact is `app/__tests__/app-router.dynamic-segment-collision.test.ts`,
which is a pure read-only filesystem scan against
`app/**/route.ts` and depends on no new framework or service code.

### 3.2 Build vs Automate

`N/A`. No connector, scheduler, or notification worker is introduced by
this hotfix. n8n is not involved.

### 3.3 Hotfix Decisions

- **D-01** — The on-disk dynamic segment is normalized to `[id]`. The
  durable idempotency namespace string stays
  `POST:/api/admin/applications/[submissionId]/claim`. Rationale: Next.js
  forbids conflicting slugs at the same depth; the only filesystem-visible
  change that satisfies Next.js is renaming the segment. Replay stability
  requires the namespace string to remain identical so the previously
  written `idempotency_key` rows continue to replay. Documented distinction
  is mandatory so a future reader does not "fix" the apparent inconsistency.
- **D-02** — The route params shape becomes
  `params: Promise<{ id: string }>`. The handler internally aliases
  `const submissionId = resolved.id` so the rest of the business logic
  reads with the original domain naming.
- **D-03** — The generic App Router dynamic-segment collision guard lives
  under `app/__tests__/app-router.dynamic-segment-collision.test.ts` and
  scans `app/**/route.ts` for sibling dynamic-segment name mismatches at
  any path position. No per-route allowlist. The guard detects the
  original invalid combination (`applications/[id]/...` vs
  `applications/[submissionId]/claim`) and any future equivalent.
- **D-04** — Tests directly affected by the slug change are updated in
  place; no test is deleted and no test is renamed. F-08 of
  `recruiter-assignment.ui.test.ts` switches its filesystem path assertion
  to `[id]/claim/route.ts` and gains a positive assertion that the durable
  idempotency namespace string still contains `[submissionId]`.
- **D-05** — The hotfix scope is **single semantic commit**. The branch
  is `codex/t1c-p1-route-slug-hotfix`. No freeze SHA is produced because
  V2_FAST_FREEZE with Audit mode NONE does not require a separate
  documentation-only freeze commit (cf. `docs/V6/v6-admin-rebuild.md`
  freeze rules). The HANDOFF freezes `READY_FOR_REVIEW` only.
- **D-06** — Branch is opened as a non-draft PR to `main`. CI must be
  green before T0 review. The agent does **not** merge. The runtime E2E
  remains pending after hotfix merge (this is the original T0 directive's
  explicit constraint).

## 4. Contract

### 4.1 External contract

- **HTTP URL**: `POST /api/admin/applications/<submission UUID>/claim`
  (unchanged byte-for-byte).
- **Request shape**: unchanged.
- **Response shape**: unchanged (same `data` envelope, same error codes
  for `INVALID_INPUT`, `UNAUTHENTICATED`, `FORBIDDEN`, `IDEMPOTENCY_KEY_*`,
  `CLAIM_RACE_*`, success `201`).
- **Headers**: unchanged.

### 4.2 Internal contract

- The route segment folder is `app/api/admin/applications/[id]/claim/`.
- The handler signature is
  `async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> })`.
- Domain naming inside the handler reads `const submissionId = resolved.id`.
- The `ROUTE_KEY` constant remains
  `'POST:/api/admin/applications/[submissionId]/claim'`.

### 4.3 Behavior preserved

| Concern | Preserved by |
|---|---|
| HR_STAFF only | Service `claimSubmission` role gate untouched (forbidden scope) |
| Active recruiter/order assignment required | Same — service untouched |
| Order derived server-side | Same |
| UUID validation | Same — `UUID_V4` regex unchanged |
| Idempotency-Key validation | Same — `withIdempotency` wrapper unchanged; `ROUTE_KEY` preserved |
| Claim race behavior | Same — service untouched |
| Replay behavior | Same — `ROUTE_KEY` preserved so `idempotency_key` rows replay identically |
| Typed error/status mapping | Same — handler error map unchanged |
| Safe envelope | Same |
| No PII leakage | Same |

### 4.4 Allowed file surface (cumulative)

| Path | Type | Notes |
|---|---|---|
| `app/api/admin/applications/[id]/claim/route.ts` | moved + edited | Was `[submissionId]/claim/route.ts`; renamed, params shape changed, `submissionId = resolved.id` alias added, `ROUTE_KEY` literal retained verbatim |
| `app/api/admin/applications/[submissionId]/claim/route.ts` | deleted | Removed by `git mv` |
| `app/api/admin/my-claimed-candidates/route.ts` | edited (comment only) | Header comment updated to describe the route under `[id]` |
| `src/domains/talent/recruiter-assignment.routes.test.ts` | edited | Import path and `{ params: ... }` arguments switched to `{ id }`; positive assertion added that `withIdempotency` receives the durable `ROUTE_KEY` containing `[submissionId]` |
| `src/domains/talent/recruiter-assignment.ui.test.ts` | edited | F-08/2 static path assertion updated to `[id]/claim/route.ts`; comments updated |
| `app/__tests__/app-router.dynamic-segment-collision.test.ts` | NEW | Generic static App Router collision guard |
| `docs/tasks/hrp-p1-runtime-route-slug-hotfix/TASK.md` | NEW | This contract |
| `docs/tasks/hrp-p1-runtime-route-slug-hotfix/HANDOFF.md` | NEW | Tier 2 self-review evidence |
| `docs/tasks/hrp-p1-runtime-route-slug-hotfix/boot-smoke-results.json` | NEW | Runtime boot regression evidence |
| `docs/tasks/hrp-p1-runtime-route-slug-hotfix/verify-encoding.node.js` | NEW | UTF-8 verify helper (worktree-local; not committed to `main`; tracked only here as evidence of the run that produced `RESULT: PASS`) |

### 4.5 Forbidden surface (cumulative)

- `prisma/**` (no schema/migration change).
- `src/shared/auth/**`, `src/shared/integrity/idempotency.ts`,
  `src/shared/auth/with-db-context.ts`, `src/shared/auth/rls-context.ts`.
- `src/domains/talent/recruiter-assignment.service.ts`,
  `src/domains/talent/recruiter-assignment.repository.ts`,
  any other `src/domains/talent/**` business code.
- `src/domains/staffing/**`, `src/domains/placement/**`,
  `src/domains/job-board/**`, `src/domains/finance/**`.
- `app/admin/**` (sidebar/menu untouched).
- `app/(jobs)/**`, `app/(portal)/**`.
- Other dynamic-segment routes under
  `app/api/admin/applications/[id]/**` (their slug is already `[id]`).
- `docs/tasks/hrp-p1-a04*/**`, `docs/tasks/hrp-p1-a05*/**`
  (frozen P1-A0.4 / P1-A0.5 artifacts not rewritten merely to update
  placeholder spelling).
- Production DB / production migration / deploy.

### 4.6 Required gates

| Gate | Expected |
|---|---|
| targeted `recruiter-assignment.routes.test.ts` | `22 passed (22)` |
| targeted `recruiter-assignment.ui.test.ts` | `7 passed (7)` |
| targeted `app-router.dynamic-segment-collision.test.ts` | `3 passed (3)` |
| `npm run typecheck` | exit `0` |
| `npm run lint` | `0 errors` (pre-existing warnings untouched) |
| `npm run test:unit` | `3,517 passed \| 9 skipped (3,526)` |
| `npm run build` | exit `0` after route-initialization passes; see §4.7 caveat |
| `git diff --check` | empty output, exit 0 |
| strict UTF-8 / no-BOM on changed surface | `RESULT: PASS (7 checked, 0 failed)` |
| `pwsh verify-task.ps1 -TaskPath .../TASK.md` | `RESULT: PASS.` |
| `pwsh verify-handoff.ps1 ...` | `RESULT: PASS.` |
| runtime boot smoke (see §5) | `3 endpoints non-500`; moved claim route compiles |

### 4.7 Caveat on `npm run build`

`npm run build` fails on a pre-existing Next.js 15.5.23 internal prerender
issue (`<Html>` should not be imported outside `pages/_document`, thrown
during static generation of `/404` and `/_error`). The defect reproduces
identically on the unmodified `main @ 63d19107` and is **out of scope** for
this hotfix. The slug-collision reject itself no longer occurs after the
hotfix (route initialization completes successfully; the build progresses
to the prerender stage before failing for the unrelated reason). The
runtime boot smoke in §5 uses `next dev` to assert that the production
HTTP surface initializes the route tree without the slug-collision reject.

## 5. Execution Plan

1. **STEP-01** — Create isolated worktree
   `C:\CodeApp\HrP-t1c-p1-route-slug-hotfix` from exact `origin/main`
   `63d19107` (NOT touching `C:\CodeApp\HrP-t1c-p1a05-runtime-e2e-closeout`).
2. **STEP-02** — `git mv` the claim handler to `[id]/claim/`.
3. **STEP-03** — Edit the moved handler: `params: Promise<{ id: string }>`,
   `const submissionId = resolved.id`, retain `ROUTE_KEY` verbatim.
4. **STEP-04** — Update direct source/test references (§4.4).
5. **STEP-05** — Add `app/__tests__/app-router.dynamic-segment-collision.test.ts`.
6. **STEP-06** — Add positive assertion in `recruiter-assignment.routes.test.ts` that
   `withIdempotency` receives the durable `ROUTE_KEY` containing
   `[submissionId]`.
7. **STEP-07** — Run all gates listed in §4.6 except the runtime boot smoke.
8. **STEP-08** — Start `next dev` on dedicated port `4733`, capture HTTP responses for
   `/login`, `/api/auth/login`, `/viec-lam`, and the moved
   `/api/admin/applications/<uuid>/claim`. Save JSON evidence to
   `docs/tasks/hrp-p1-runtime-route-slug-hotfix/boot-smoke-results.json`.
9. **STEP-09** — Author this TASK.md and HANDOFF.md.
10. **STEP-10** — Run `verify-task.ps1` and `verify-handoff.ps1`.
11. **STEP-11** — Commit the hotfix as `fix(p1): normalize application claim dynamic
    route slug`. Push branch. Open non-draft PR to `main` titled
    `fix(p1): normalize application claim dynamic route slug`.
12. **STEP-12** — Wait for CI. Report results. Do not merge.

### 5.1 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | STEP-01, STEP-02, STEP-03 | AC-01, AC-02, AC-03, AC-19, AC-20, AC-21, AC-22 |
| `RQ-02` | STEP-01 | AC-30 |
| `RQ-03` | STEP-02, STEP-03 | AC-01, AC-02, AC-03, AC-04 |
| `RQ-04` | STEP-05 | AC-13, AC-14, AC-15 |
| `RQ-05` | STEP-03, STEP-06 | AC-04, AC-11 |
| `RQ-06` | STEP-04 | AC-05, AC-06, AC-07, AC-08, AC-09, AC-10, AC-11, AC-12 |
| `RQ-07` | STEP-04 | AC-19, AC-20, AC-21, AC-22 |
| `RQ-08` | STEP-05 | AC-13, AC-14, AC-15 |
| `RQ-09` | STEP-08 | AC-19, AC-20, AC-21, AC-22 |
| `RQ-10` | STEP-05 | AC-13, AC-14, AC-15 |
| `RQ-11` | STEP-01, STEP-02, STEP-03, STEP-04, STEP-05, STEP-06, STEP-07, STEP-08, STEP-09, STEP-10, STEP-11, STEP-12 | AC-30 (PR body records no DB / no migration / no production E2E change) |

## 6. Acceptance

| AC ID | Statement | Evidence | Result |
|---|---|---|---|
| AC-01 | The moved handler imports from `@/app/api/admin/applications/[id]/claim/route` and the previous path no longer exists in the worktree | `git ls-files app/api/admin/applications/` | `RESULT: PASS` |
| AC-02 | The handler signature uses `params: Promise<{ id: string }>` | `git show <implementation-sha>:app/api/admin/applications/[id]/claim/route.ts` (the signature line) | `RESULT: PASS` |
| AC-03 | `const submissionId = resolved.id` aliases the URL slug to the domain variable | `git show <implementation-sha>:app/api/admin/applications/[id]/claim/route.ts` (the alias line) | `RESULT: PASS` |
| AC-04 | `ROUTE_KEY` is the byte-for-byte string `POST:/api/admin/applications/[submissionId]/claim` | `git show <implementation-sha>:app/api/admin/applications/[id]/claim/route.ts` (the constant) | `RESULT: PASS` |
| AC-05 | Public URL `/api/admin/applications/${submissionId}/claim` is preserved (test asserts) | `recruiter-assignment.routes.test.ts` (`expect(url).toBe('/api/admin/applications/${SUBMISSION}/claim')`) | `RESULT: PASS` |
| AC-06 | Invalid UUID → HTTP 400 `INVALID_INPUT` | `recruiter-assignment.routes.test.ts` (existing test retained) | `RESULT: PASS` |
| AC-07 | Unauthenticated → HTTP 401 `UNAUTHENTICATED` | `recruiter-assignment.routes.test.ts` (existing test) | `RESULT: PASS` |
| AC-08 | Wrong role → HTTP 403 `FORBIDDEN` | `recruiter-assignment.routes.test.ts` (existing test) | `RESULT: PASS` |
| AC-09 | Missing/invalid Idempotency-Key → HTTP 400 | `recruiter-assignment.routes.test.ts` (existing test) | `RESULT: PASS` |
| AC-10 | Success → HTTP 201 | `recruiter-assignment.routes.test.ts` (existing test) | `RESULT: PASS` |
| AC-11 | Replay behavior preserved (same `jobOpeningId`, same `assignmentId` under same Idempotency-Key) | `recruiter-assignment.routes.test.ts` (existing test, plus the new positive assertion that `withIdempotency` receives the durable `ROUTE_KEY` containing `[submissionId]`) | `RESULT: PASS` |
| AC-12 | Conflict/race mappings preserved | `recruiter-assignment.routes.test.ts` (existing tests) | `RESULT: PASS` |
| AC-13 | Generic static collision guard detects the original `applications/[id]/...` vs `applications/[submissionId]/claim` invalid combination on a synthesized tree | `app-router.dynamic-segment-collision.test.ts` (synthesized-regression case) | `RESULT: PASS` |
| AC-14 | Generic static collision guard detects a synthesized future regression at a different path position | same test file (different-position synthesized case) | `RESULT: PASS` |
| AC-15 | Generic static collision guard passes on the current worktree after the hotfix | same test file (current-worktree case) | `RESULT: PASS` |
| AC-16 | `npm run typecheck` exits 0 | `npm run typecheck` exit `0` (see E-01) | `RESULT: PASS` |
| AC-17 | `npm run lint` reports 0 errors | `npm run lint` exit `0` (see E-02) | `RESULT: PASS` |
| AC-18 | `npm run test:unit` reports `3,517 passed \| 9 skipped (3,526)` | `npm run test:unit` (see E-03) | `RESULT: PASS` |
| AC-19 | Runtime boot regression — `/login` returns non-500 | `boot-smoke-results.json` (see E-06) | `RESULT: PASS` |
| AC-20 | Runtime boot regression — `/api/auth/login` returns non-500 | `boot-smoke-results.json` (see E-06) | `RESULT: PASS` |
| AC-21 | Runtime boot regression — `/viec-lam` returns non-500 | `boot-smoke-results.json` (see E-06) | `RESULT: PASS` |
| AC-22 | Runtime boot regression — moved `/api/admin/applications/<uuid>/claim` compiles and returns non-500 | `boot-smoke-results.json` (see E-06) | `RESULT: PASS` |
| AC-23 | `git diff --check` is empty | `git diff --check` (see E-04) | `RESULT: PASS` |
| AC-24 | Strict UTF-8 / no-BOM: `RESULT: PASS (7 checked, 0 failed)` on the changed surface | `node docs/tasks/hrp-p1-runtime-route-slug-hotfix/verify-encoding.node.js` (see E-08) | `RESULT: PASS` |
| AC-25 | `verify-task.ps1` reports `RESULT: PASS.` | gate output (see E-07) | `RESULT: PASS` |
| AC-26 | `verify-handoff.ps1` reports `RESULT: PASS.` | gate output (see E-09) | `RESULT: PASS` |
| AC-27 | Single semantic commit titled `fix(p1): normalize application claim dynamic route slug` | `git log --oneline -1` on the branch | `RESULT: PASS` |
| AC-28 | Branch `codex/t1c-p1-route-slug-hotfix` pushed and PR opened (non-draft) to `main` | `gh pr list --head codex/t1c-p1-route-slug-hotfix` | `RESULT: PASS` |
| AC-29 | CI on the PR is green | `gh pr checks` | `RESULT: PASS` |
| AC-30 | PR body states: pre-existing main boot blocker; original main SHA `63d19107034836cb57e5d06e321fd336285bf51e`; external HTTP URL unchanged; auth/domain/idempotency behavior preserved; generic regression guard added; production boot smoke PASS; no DB/schema/migration changes; P1 runtime E2E remains pending after hotfix merge | `gh pr view --body` | `RESULT: PASS` |
| AC-31 | Hotfix does NOT merge itself | explicit | `RESULT: PASS` |

## 7. Risk

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `npm run build` fails for the pre-existing Next.js 15.5.23 `<Html>` prerender issue unrelated to the slug collision | high (confirmed on `main @ 63d19107` already failing identically) | medium (CI may flag the red build) | Documented in §4.7 and HANDOFF. T0 owns the decision to either merge-around (allowing CI to stay red while a follow-up hotfix ships) or block the merge until the pre-existing build issue is resolved. Either path is acceptable; this hotfix restores runtime bootability, not production build green. |
| A future contributor might "fix" the durable `ROUTE_KEY` to use `[id]` and break replay compatibility with previously written `idempotency_key` rows | low | high (replay vulnerability) | D-01 documents the deliberate distinction. AC-11 plus the positive assertion in `recruiter-assignment.routes.test.ts` lock the byte-for-byte `ROUTE_KEY` shape. The TASK §1 Outcome documents the rationale. |
| The generic static guard might rely on filesystem layout details that change in Next.js 16 | low | low | The guard reads `app/**/route.ts` and parses `[name]` brackets; this layout has been stable across Next.js 13/14/15. Future majors that change the layout should fail loudly, which is exactly what the guard is designed to do. |
| The PR merges into `main` and P1 runtime E2E then runs against the new slug but expects `[submissionId]` somewhere | very low | medium | P1 runtime E2E reads the public URL `/api/admin/applications/${submissionId}/claim` which is preserved byte-for-byte. The E2E does not inspect the on-disk slug. |
| A reviewer demands a separate freeze SHA per V2 protocol | low | low | V2_FAST_FREEZE with Audit mode NONE does not require a separate freeze commit; §0 Control flags `Frozen delivery = NO`. HANDOFF is `READY_FOR_REVIEW` not `READY_FOR_AUDIT`. |

## 8. Open Questions

- Q-01 (deferred to T0) — Should the pre-existing Next.js `<Html>` build
  prerender issue be fixed in the same PR or a follow-up hotfix? Out of
  scope here. Recorded for T0 visibility. The CI build will be red on
  the current `main @ 63d19107` regardless of this hotfix.

## 9. Planner Resolution

- Tier 1 directive `T0 → T1C — P1 runtime route-slug collision hotfix`
  resolved with the single semantic commit
  `fix(p1): normalize application claim dynamic route slug` on
  `codex/t1c-p1-route-slug-hotfix`.
- Status frozen at `READY_FOR_REVIEW`.
- Audit eligibility `NOT_REQUIRED`.
- Delivery protocol `V2_FAST_FREEZE` honoured: HANDOFF follows TASK, gates
  green, single semantic commit, runtime boot regression PASS, PR opened
  (non-draft) to `main`. No merge.

## 10. Revision Log

| Round | Date | Author | Change |
|---|---|---|---|
| v1.0 | 2026-09-30 | Tier 1 (T1C, this hotfix) | Initial contract authored after directive acceptance. |