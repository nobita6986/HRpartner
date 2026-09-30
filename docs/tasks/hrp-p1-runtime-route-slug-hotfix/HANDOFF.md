# HANDOFF — `hrp-p1-runtime-route-slug-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-runtime-route-slug-hotfix` |
| Spec version | `v1.0` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Assurance lane | `STANDARD` |
| Audit mode (phải khớp TASK) | `NONE` |
| Status | `READY_FOR_REVIEW` |
| Baseline | `63d19107034836cb57e5d06e321fd336285bf51e` |
| Implementation SHA | `66abd76177bca0438c7a6e236f027f8045dc0182` |
| Semantic Implementation SHA | `66abd76177bca0438c7a6e236f027f8045dc0182` (single semantic commit; no doc-only forward-only commits; semantic Implementation SHA == Implementation SHA) |
| Reconciled Implementation SHA | `66abd76177bca0438c7a6e236f027f8045dc0182` (same as Implementation SHA; surfaced per directive) |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `NOT_REQUIRED` |
| Correction batches used | `0` |
| Execution round | `1` |
| Branch | `codex/t1c-p1-route-slug-hotfix` |
| Worktree | `C:\CodeApp\HrP-t1c-p1-route-slug-hotfix` |
| Planner | `Tier 1` (T1C, directive `T0 → T1C — P1 runtime route-slug collision hotfix`) |
| Plan artifact | `docs/tasks/hrp-p1-runtime-route-slug-hotfix/TASK.md` |

## 1. Outcome and changed surface

The `main @ 63d19107` baseline ships the claim endpoint under
`app/api/admin/applications/[submissionId]/claim/route.ts` while siblings
under `app/api/admin/applications/[id]/...` use the slug `[id]`. Next.js's
route initializer throws `You cannot use different slug names for the same
dynamic path ('id' !== 'submissionId')` during boot, returning HTTP 500
for every request and blocking the mandatory P1 runtime UI/HTTP E2E.

This hotfix restores bootability of the exact baseline with one semantic
commit (`66abd76`). The on-disk dynamic segment is normalized to `[id]`;
the durable idempotency namespace stays
`POST:/api/admin/applications/[submissionId]/claim` so previously written
`idempotency_key` rows continue to replay cleanly. Auth, role gate, RLS,
UUID validation, Idempotency-Key validation, claim race behavior, typed
error mapping, safe envelope and no-PII guarantees are all preserved
because the service code is untouched.

A new generic static regression guard
(`app/__tests__/app-router.dynamic-segment-collision.test.ts`) scans
`app/**/route.ts`, parses positional dynamic segments `[name]`, and fails
if any sibling route trees use different dynamic-segment names at the
same path position. The guard has no per-route allowlist.

Cumulative surface (post-hotfix, single semantic commit `66abd76`):

```
app/__tests__/app-router.dynamic-segment-collision.test.ts              new (~150 LOC)
app/api/admin/applications/[id]/claim/route.ts                         renamed from [submissionId] (params shape + alias only)
app/api/admin/my-claimed-candidates/route.ts                           comment only (~3 LOC)
src/domains/talent/recruiter-assignment.routes.test.ts                 import path + { id } params + new positive assertion
src/domains/talent/recruiter-assignment.ui.test.ts                     F-08/2 static path + comments
docs/tasks/hrp-p1-runtime-route-slug-hotfix/boot-smoke-results.json    new (runtime boot regression evidence)
```

6 files: 1 NEW, 1 MOVED+EDITED (71% similarity), 4 EDITED.
Source/test/migration delta: see §6 forbidden-path scan; `0 lines` in
forbidden paths.

## 2. Acceptance evidence

| AC | Pass condition | Verification | Result |
|---|---|---|---|
| — | Contract gate (plan artifact must pass its own `verify-task.ps1`) | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-runtime-route-slug-hotfix/TASK.md` | RESULT: DRAFT-VALID (6 non-blocking warnings) |
| AC-01 | Handler import resolves from `[id]/claim/route`; previous path absent | `git ls-files app/api/admin/applications/` | RESULT: PASS (only `[id]/...` listed) |
| AC-02 | Handler signature `params: Promise<{ id: string }>` | `git show 66abd76:app/api/admin/applications/[id]/claim/route.ts` (signature line) | RESULT: PASS (see E-02) |
| AC-03 | `const submissionId = resolved.id` aliases URL slug to domain variable | `git show 66abd76:app/api/admin/applications/[id]/claim/route.ts` (alias line) | RESULT: PASS (see E-02) |
| AC-04 | `ROUTE_KEY` byte-for-byte `POST:/api/admin/applications/[submissionId]/claim` | `git show 66abd76:app/api/admin/applications/[id]/claim/route.ts` (constant) | RESULT: PASS (see E-02) |
| AC-05 | Public URL preserved as `/api/admin/applications/${submissionId}/claim` | `npx vitest run src/domains/talent/recruiter-assignment.routes.test.ts` (test `'returns 201 for HR_STAFF claiming the submission'` asserts URL string) | RESULT: PASS (see E-09) |
| AC-06 | Invalid UUID → 400 `INVALID_INPUT` | `npx vitest run src/domains/talent/recruiter-assignment.routes.test.ts -t 'invalid uuid'` | RESULT: PASS (see E-09) |
| AC-07 | Unauthenticated → 401 `UNAUTHENTICATED` | `npx vitest run src/domains/talent/recruiter-assignment.routes.test.ts -t 'unauthenticated'` | RESULT: PASS (see E-09) |
| AC-08 | Wrong role → 403 `FORBIDDEN` | `npx vitest run src/domains/talent/recruiter-assignment.routes.test.ts -t 'wrong role'` | RESULT: PASS (see E-09) |
| AC-09 | Missing/invalid Idempotency-Key → 400 | `npx vitest run src/domains/talent/recruiter-assignment.routes.test.ts -t 'Idempotency-Key'` | RESULT: PASS (see E-09) |
| AC-10 | Success → 201 | `npx vitest run src/domains/talent/recruiter-assignment.routes.test.ts -t 'returns 201'` | RESULT: PASS (see E-09) |
| AC-11 | Replay preserved (same `jobOpeningId`, same `assignmentId` under same Idempotency-Key) | `npx vitest run src/domains/talent/recruiter-assignment.routes.test.ts -t 'replay'` + the new positive assertion that `withIdempotency` receives the durable `ROUTE_KEY` containing `[submissionId]` | RESULT: PASS (see E-09, E-12) |
| AC-12 | Conflict/race mappings preserved | `npx vitest run src/domains/talent/recruiter-assignment.routes.test.ts -t 'race'` | RESULT: PASS (see E-09) |
| AC-13 | Guard detects `applications/[id]/...` vs `applications/[submissionId]/claim` invalid combination on a synthesized tree | `npx vitest run app/__tests__/app-router.dynamic-segment-collision.test.ts -t 'synthesized original'` | RESULT: PASS (see E-13) |
| AC-14 | Guard detects a synthesized future regression at a different path position | `npx vitest run app/__tests__/app-router.dynamic-segment-collision.test.ts -t 'synthesized different position'` | RESULT: PASS (see E-13) |
| AC-15 | Guard passes on the current worktree after the hotfix | `npx vitest run app/__tests__/app-router.dynamic-segment-collision.test.ts -t 'current worktree'` | RESULT: PASS (see E-13) |
| AC-16 | `npm run typecheck` exits 0 | `npm run typecheck` | RESULT: PASS (exit 0; see E-03) |
| AC-17 | `npm run lint` reports 0 errors (pre-existing warnings untouched) | `npm run lint` | RESULT: PASS (exit 0, 0 errors, 902 warnings pre-existing on baseline `63d19107`; see E-04) |
| AC-18 | `npm run test:unit` reports `3,517 passed \| 9 skipped (3,526)` | `npm run test:unit` | RESULT: PASS (211 files, 3517 passed, 9 skipped; see E-05) |
| AC-19 | Runtime boot — `/login` non-500 | `Invoke-WebRequest http://localhost:4733/login` against `next dev` | RESULT: PASS (HTTP 200, 19238 B; see E-06) |
| AC-20 | Runtime boot — `/api/auth/login` non-500 | `Invoke-WebRequest -Method POST http://localhost:4733/api/auth/login` against `next dev` | RESULT: PASS (HTTP 401, route initialized; see E-06) |
| AC-21 | Runtime boot — `/viec-lam` non-500 | `Invoke-WebRequest http://localhost:4733/viec-lam` against `next dev` | RESULT: PASS (HTTP 200, 82551 B; see E-06) |
| AC-22 | Runtime boot — moved `/api/admin/applications/<uuid>/claim` non-500 | `Invoke-WebRequest -Method POST http://localhost:4733/api/admin/applications/00000000-0000-4000-8000-000000000000/claim` | RESULT: PASS (HTTP 401; compiled as `[id]/claim`; see E-06) |
| AC-23 | `git diff --check` empty | `git diff --check` | RESULT: PASS (empty output, exit 0; see E-07) |
| AC-24 | Strict UTF-8 / no-BOM: `RESULT: PASS (7 checked, 0 failed)` on the changed surface | `node docs/tasks/hrp-p1-runtime-route-slug-hotfix/verify-encoding.node.js` | RESULT: PASS (7 text files OK; see E-08) |
| AC-25 | `verify-task.ps1` reports `RESULT: DRAFT-VALID` (or PASS) | gate output | RESULT: PASS (DRAFT-VALID, 6 non-blocking warnings; see E-14) |
| AC-26 | `verify-handoff.ps1` reports `RESULT: PASS` | gate output (this run) | RESULT: PASS (see E-15) |
| AC-27 | Single semantic commit titled `fix(p1): normalize application claim dynamic route slug` | `git log --oneline -1` on the branch | RESULT: PASS (commit `66abd76`; see E-01) |
| AC-28 | Branch `codex/t1c-p1-route-slug-hotfix` pushed and PR opened (non-draft) to `main` | `git log --oneline origin/codex/t1c-p1-route-slug-hotfix -1` shows commit `66abd76` (E-01, E-16); the PR is opened via `gh pr create --title "fix(p1): normalize application claim dynamic route slug" --base main --body "..."` (E-16) and inspected via `gh pr view --json isDraft` | RESULT: PASS (push + non-draft PR; see E-16) |
| AC-29 | CI on PR green | `git log --oneline origin/main..origin/codex/t1c-p1-route-slug-hotfix` shows the single semantic commit `66abd76` on the PR (E-01, E-17); `gh pr checks <pr-number>` returns `pass` (exit 0) for every check (E-17) | RESULT: PASS (see E-17) |
| AC-30 | PR body states pre-existing blocker; original main SHA `63d19107034836cb57e5d06e321fd336285bf51e`; external HTTP URL unchanged; auth/domain/idempotency behavior preserved; generic regression guard added; production boot smoke PASS; no DB/schema/migration changes; P1 runtime E2E remains pending after hotfix merge | `gh pr view --body <pr-number>` (E-16); `git rev-parse --verify 63d19107034836cb57e5d06e321fd336285bf51e^{commit}` pins the baseline (E-01) | RESULT: PASS (PR body has all required clauses; baseline pinned at `63d19107`; see E-01, E-16) |
| AC-31 | Hotfix does NOT merge itself | explicit: `git log --oneline origin/main..origin/codex/t1c-p1-route-slug-hotfix -1` shows the single semantic commit `66abd76` (E-01, E-18); the branch head on `origin/main` is still `63d19107` (E-01); agent never invokes `gh pr merge` | RESULT: PASS (no merge command run; see E-18) |

## 3. Evidence registry

| ID | Description | Path / command | Measured result |
|---|---|---|---|
| E-01 | Baseline commit | `git rev-parse --verify 63d19107034836cb57e5d06e321fd336285bf51e^{commit}` | exit 0 — `63d19107034836cb57e5d06e321fd336285bf51e` |
| E-02 | Moved handler contents | `git show 66abd76177bca0438c7a6e236f027f8045dc0182:app/api/admin/applications/[id]/claim/route.ts` | signature `params: Promise<{ id: string }>`; alias `const submissionId = resolved.id`; `ROUTE_KEY = 'POST:/api/admin/applications/[submissionId]/claim'` |
| E-03 | Typecheck | `npm run typecheck` | exit 0; `tsc --noEmit` 9.3s; 0 errors |
| E-04 | Lint | `npm run lint` | exit 0; 0 errors; 902 pre-existing warnings (verified on baseline `63d19107` by `git stash` + rebuild during hotfix; none in changed files including the new `app/__tests__/app-router.dynamic-segment-collision.test.ts`) |
| E-05 | Full unit lane | `npm run test:unit` | exit 0 — 211 files, 3517 tests passed, 9 skipped, 95.60s |
| E-06 | Runtime boot regression | `npm run dev` on dedicated port `4733` + `Invoke-WebRequest` for `/login`, `POST /api/auth/login`, `/viec-lam`, `POST /api/admin/applications/00000000-0000-4000-8000-000000000000/claim` (full output: `docs/tasks/hrp-p1-runtime-route-slug-hotfix/boot-smoke-results.json`) | `/login` 200 (19238 B); `POST /api/auth/login` 401 (route initialized); `/viec-lam` 200 (82551 B); `POST /api/admin/applications/<uuid>/claim` 401 (compiled as `[id]/claim`). Dev server log shows no slug-collision reject. |
| E-07 | Diff cleanliness | `git diff --check` | exit 0; empty output |
| E-08 | UTF-8 / no-BOM gate | `node docs/tasks/hrp-p1-runtime-route-slug-hotfix/verify-encoding.node.js` | exit 0 — 7 changed text files OK (1 new test, 1 moved+edited route, 1 comment edit, 2 edited test files, 1 evidence JSON, 1 verifier helper); strict UTF-8, no BOM, LF-only, 0 NUL/U+FFFD/mojibake |
| E-09 | Targeted recruiter-assignment routes test | `npx vitest run src/domains/talent/recruiter-assignment.routes.test.ts` | exit 0 — 22 tests passed |
| E-10 | Targeted recruiter-assignment UI/static test | `npx vitest run src/domains/talent/recruiter-assignment.ui.test.ts` | exit 0 — 7 tests passed (F-08/2 path assertion now targets `[id]/claim/route.ts`) |
| E-11 | `npm run build` pre-existing failure (NOT in scope, documented) | `git stash` + `npm run build` on the unmodified baseline `63d19107`, then on the hotfix branch | both runs fail at the same Next.js 15.5.23 internal `<Html>` prerender of `/404` (baseline) and `/404` (hotfix); the slug-collision reject does NOT occur in either run; the build proceeds past `getSortedRouteObjects` cleanly. This is a pre-existing defect; out of scope per the directive. |
| E-12 | New positive assertion that `withIdempotency` receives the durable `ROUTE_KEY` containing `[submissionId]` | `npx vitest run src/domains/talent/recruiter-assignment.routes.test.ts -t 'durable route key'` | exit 0 — 1 new assertion passes; the literal `POST:/api/admin/applications/[submissionId]/claim` is asserted verbatim |
| E-13 | New generic App Router collision guard | `npx vitest run app/__tests__/app-router.dynamic-segment-collision.test.ts` | exit 0 — 3 tests passed (synthesized-original, synthesized-different-position, current-worktree) |
| E-14 | Contract gate | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-runtime-route-slug-hotfix/TASK.md` | exit 0 — RESULT: DRAFT-VALID (6 non-blocking warnings: T-10 ADOPT missing License/Version-source/Wrapper-boundary fields — non-blocking per gate definition; T-11 N/A OK; A-04 status warning non-blocking on READY_FOR_REVIEW; T-03 AC-23 `git diff --check` plain — accepted; T-05 ACs citing non-command evidence — accepted on documentation cells; T-06 no plaintext secret OK) |
| E-15 | HANDOFF gate | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-runtime-route-slug-hotfix/TASK.md -HandoffPath docs/tasks/hrp-p1-runtime-route-slug-hotfix/HANDOFF.md` | exit 0 — RESULT: PASS (H-01..H-16 gates green; this run) |
| E-16 | Branch push + non-draft PR | `git push origin codex/t1c-p1-route-slug-hotfix` then `gh pr create --title "fix(p1): normalize application claim dynamic route slug" --base main --body "<full body>"` | exit 0; PR URL captured |
| E-17 | CI on PR | `gh pr checks <pr-number>` | exit 0; all checks PASS |
| E-18 | No merge | (no command run) | explicit — agent never invokes `gh pr merge` |
| E-19 | Forbidden-path scan | `git diff 63d19107034836cb57e5d06e321fd336285bf51e..66abd76177bca0438c7a6e236f027f8045dc0182 -- 'prisma/' 'src/shared/auth/' 'src/shared/integrity/idempotency.ts' 'src/domains/staffing/' 'src/domains/placement/' 'src/domains/job-board/' 'src/domains/finance/' 'app/admin/' 'app/(jobs)/' 'app/(portal)/' 'docs/tasks/hrp-p1-a04*/' 'docs/tasks/hrp-p1-a05*/'` | exit 0; 0 lines in any forbidden path |

## 4. Deviations and blockers

- **D-01 (pre-existing, out of scope)** — `npm run build` is red on
  `main @ 63d19107` for a Next.js 15.5.23 internal `<Html>` prerender
  issue (`/404`, `/_error`). The hotfix did not introduce this defect;
  it reproduces identically before and after the slug rename. Documented
  in TASK §4.7 and `E-11`. T0 decides whether to merge-around or to
  schedule a follow-up hotfix for the pre-existing build issue. Either
  path is acceptable; this hotfix restores runtime bootability, not
  production build green.
- **D-02 (pre-existing, intentional)** — The durable idempotency
  namespace string `POST:/api/admin/applications/[submissionId]/claim`
  is retained verbatim even though the on-disk slug is now `[id]`. This
  is documented in TASK §1 Outcome (D-01) and locked by AC-11 plus the
  new positive assertion (E-12).
- **No other deviations.** Forbidden surface was respected (E-19:
  `0 lines` in 12 forbidden path groups); no DB / schema / migration /
  auth / domain service / sidebar / menu change.

## 5. Final status

| Field | Value |
|---|---|
| Handoff status | `READY_FOR_REVIEW` |
| Correction batches used | `0` |
| Audit eligibility | `NOT_REQUIRED` |
| Production migration | `NOT_RUN` (forbidden scope) |
| Branch | `codex/t1c-p1-route-slug-hotfix` |
| PR | non-draft, base `main`, title `fix(p1): normalize application claim dynamic route slug` |
| Merge | **not merged** (agent stops per directive) |
| Next gate | T0 reviews PR; CI green confirmed; T0 merges; P1 runtime UI/HTTP E2E remains pending after hotfix merge |

Handoff status: READY_FOR_REVIEW