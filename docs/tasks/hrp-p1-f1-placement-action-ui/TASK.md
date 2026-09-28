# TASK — `hrp-p1-f1-placement-action-ui`

> Implementation SHA: `a5c55568912247459d21919448cb1613455e1268` (Round 3
> zero-residue teardown is the last semantic commit).
> Round-1 correction batch (`713aee9` + `aefb8e6`) and round-2 correction
> batch (`f2fb34f` semantic + `7447994` docs + `48c3974` runtime correction
> + `a5c5556` zero-residue teardown) are all T0-authorized integrity
> continuations inside the single pre-audit correction batch
> (`Correction batches used: 1`).
>
> Current effective status: `ACCEPTED / COMPLETED / PASS`.
> Frozen delivery: `YES`.
> Next gate: `NONE — MERGED_AND_PRODUCTION_VERIFIED`.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-f1-placement-action-ui` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `UI` (thin client island around 5 accepted F0 routes) |
| Build vs adopt | `ADOPT` |
| Build vs automate | `N/A` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | UI mở 5 mutation commands từ production-ready backend; rủi ro chính: stale status, leak raw error, idempotency key mistreatment khi retry, role bypass nếu UI gate lệch server gate, double-click tạo duplicate placement. LIGHT audit đảm bảo tất cả 5 commands có UI test cover create/idempotent retry/409 race/role hide/server-error render, plus placementOptions leakage guard và sessionStorage idempotency isolation. |
| Spec version | `v1.2` |
| Status | `ACCEPTED` — Tier 3 LIGHT `CONDITIONAL` accepted by T0; PR #63 merged; post-merge CI, Vercel and auth-first production smoke PASS |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Open Owner decisions | `0` |
| Blocker | `NONE` (T0_CI_SYNTHETIC_DB_GATE passed ×3 at a5c5556; pre-existing shared-DB residue is historical debt, NOT residue of a5c5556, and is disclosed in HANDOFF.md §4) |
| Test environment | `PASS` (T0_CI_SYNTHETIC_DB_GATE ×3 passed; targeted P1-F1 10/10, targeted P1-F0 20/20; full canonical 35/35 601/2/0) |
| Correction budget | `1` |
| In-scope roots | `app/admin/recruiter-workbench/**`; `src/domains/talent/recruiter-workbench.types.ts` (additive); `src/domains/talent/recruiter-workbench.read-service.ts` (additive); `src/domains/talent/recruiter-workbench.placement-actions.{tsx,states,fetch}`; `src/domains/talent/recruiter-workbench.placement-actions.{test.tsx,states.test.ts,fetch.test.ts}`; `src/shared/ui/sheet/slide-out-drawer.tsx` (narrow U+FFFD scope); `src/shared/ui/sheet/slide-out-drawer.test.tsx`; `app/admin/recruiter-workbench/page.{tsx,test.ts}`; `app/admin/recruiter-workbench/_components/RecruiterWorkbenchTable.tsx`; `tests/db/p1f1-placement-action-ui.integration.test.ts`; `vitest.integration-files.ts` (registration-only); `docs/tasks/hrp-p1-f1-placement-action-ui/**`; `.ai-pipeline/scripts/verify-encoding-range.mjs` (round 2 additive). |
| Required gates | `pwsh .ai-pipeline/scripts/verify-task.ps1`; `pwsh .ai-pipeline/scripts/verify-handoff.ps1`; `node .ai-pipeline/scripts/verify-encoding-range.mjs fabeda29c97720612136909b8f7beccfdf217c25` (range-aware strict UTF-8); `git diff --check`; `git status --porcelain`; `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run test:integration` (env-gated `ENV_BLOCKED` honest report when DB absent). |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `COMPLETED` — 15/17 AC independently PASS; AC-05/AC-11 `ENV_BLOCKED` locally at Tier 3 and authorized from exact-SHA T0 runtime provenance |
| Baseline | `fabeda29c97720612136909b8f7beccfdf217c25` |
| Implementation SHA | `fe36334c5d92836120f5b6ffd2e897912756ff62` (accepted-main integration SHA; PR #63 merge commit) |
| Semantic Implementation SHA | `a5c55568912247459d21919448cb1613455e1268` (frozen F1 semantic delivery; unchanged by audit adoption and closeout) |
| Docs/Evidence SHA | `d05088110b0870be2959d3a2d6fd2c686730e66e` |
| Audit adoption SHA | `912c269e1d2930313eb8cf36d3d262b3bc0ff35a` |
| Production merge SHA | `fe36334c5d92836120f5b6ffd2e897912756ff62` (PR #63) |
| Post-merge CI | GitHub Actions run `36389772726`: Quality + Integration PASS; all 39 migrations applied to clean CI PostgreSQL; no drift |
| Depends on | P1-F0 `ACCEPTED`; P1-E0 `ACCEPTED`; P1-E1 `ACCEPTED` + merged main |
| Current execution round | `7` (T0 accepted production closeout) |
| Current audit round | `1` |
| Next gate | `NONE — MERGED_AND_PRODUCTION_VERIFIED` |
| Production DB/migration | `NOT_REQUIRED / NOT_RUN` — F1 contains no production schema/migration delta; CI migration lane only used clean ephemeral PostgreSQL |

> **Note on Test environment.** The truthful state for the current
> final-freeze commit is `PASS` (T0_CI_SYNTHETIC_DB_GATE ×3 passed at
> `a5c5556`: P1-F1 10/10/10 and P1-F0 predecessor 20/20/20, plus full
> canonical strict 35/35 files / 601 passed / 2 skipped / 0 failed /
> exit 0). Independent global-prefix snapshot before and after the run
> batch did not increase, so current-run residue delta = 0.

> **v1.2 — accepted production closeout.** Tier 3 LIGHT round 1 returned
> `CONDITIONAL`: 15/17 AC independently PASS; AC-05 and AC-11 were
> `ENV_BLOCKED` only because the auditor lacked local synthetic-DB
> credentials. T0 accepted the verdict using runtime provenance pinned to
> semantic SHA `a5c5556` (P1-F1 `10/10 ×3`, predecessor P1-F0 `20/20 ×3`,
> full canonical `35/35` files / `601 passed` / `2 skipped` / `0 failed`,
> posture PASS, current-run residue delta zero). The byte-exact audit was
> adopted at `912c269e`; PR #63 merged as `fe36334c`; main CI run
> `36389772726` and Vercel succeeded. Production smoke returned `307` from
> `/admin/recruiter-workbench` to login and `401` from unauthenticated
> placement create/confirm POSTs. No production migration or data write was
> required. `AUD-001..AUD-007` remain recorded as non-blocking P3 debt.

> **Note on correction budget.** V2_FAST_FREEZE `Correction budget = 1`
> per the per-run contract. T0 normalization decision: `Correction
> batches used = 1`. The full chain of internal iterations (F-01..F-07,
> C2-01..C2-06, F1-DB10 rerun, the round-1 (713aee9 + aefb8e6) and
> round-2 (f2fb34f semantic + 7447994 docs + 48c3974 runtime + a5c5556
> zero-residue teardown) commits are T0-authorized integrity
> continuations inside the single formal pre-audit correction batch,
> NOT separate batches. Each SHA is listed verbatim in §10 Revision
> Log and HANDOFF.md §4 deviations so verifier H-16 and Tier 3 can
> audit the full chain without losing history.

## 1. Outcome

### 1.1 User-visible outcome (delivered — T0 runtime gate PASS at `a5c5556`)

- ADMIN / HR_MANAGER mở `/admin/recruiter-workbench`, thấy row với
  `nextAction = REVIEW_PLACEMENT` và case chưa có placement → action-cell
  có control **Chọn ứng viên** → right-side drawer mở (server-derived
  `placementOptions`, unique theo `jobOpeningId`, deterministic order)
  → user chọn 1 option (preselect nếu chỉ một; phải explicit confirm trước
  khi submit) → submit → `POST /api/admin/placements` với
  `{ placementCaseId, jobOpeningId, sourceCandidateSubmissionId }` và
  `Idempotency-Key` UUID v4 mới (mint từ sessionStorage scoped theo
  `placementCaseId + 'placement.create' + canonical payload hash`) → 201
  `{ placementId, status: 'SELECTED', serviceModelSnapshot, clientCompanyId,
  projectId, replayed }` → `router.refresh()` server component → row
  refreshed với `placement = { id, status: 'SELECTED', jobOpeningId,
  managementMode }` → CONFIRM / FAIL / CANCEL controls xuất hiện (EFFECTIVE
  chỉ khi `managementMode === 'CLIENT_MANAGED'`).
- Recruiter click **Xác nhận** → confirm dialog → `POST
  /api/admin/placements/[id]/actions/confirm` với cùng `Idempotency-Key`
  (nếu payload unchanged / network uncertainty / 5xx retry → reuse key qua
  sessionStorage lookup; nếu payload edit hoặc chọn JobOpening khác → mint
  key mới) → 200 `{ status: 'CONFIRMED', replayed }` → row refresh.
- Recruiter click **Đánh dấu hiệu lực** (chỉ cho Client-managed, drawer
  form yêu cầu `clientAcknowledgedAt` ISO-8601 +
  `clientAcknowledgedByUserId` + `acknowledgementRef`, giữ form state nếu
  cùng Idempotency-Key) → `POST
  /api/admin/placements/[id]/actions/effective` → 200 `{ status: 'EFFECTIVE',
  replayed }` → case auto-closes (`caseStatus = 'CLOSED'`) → row biến mất
  nếu filter đang ở non-CLOSED view.
- Recruiter click **Đánh dấu thất bại** hoặc **Hủy chọn** → confirm dialog
  → POST tương ứng → row refresh → terminal state.
- HRP_MANAGED + CONFIRMED: control **Đánh dấu hiệu lực** bị ẩn hoàn toàn
  (UX). Nếu client state stale và gọi thủ công qua stale render → server
  trả 400 `PLACEMENT_VALIDATION_ERROR` → F1 render inline
  `<p role="alert">` với server `message` (không leak metadata).
- Recruiter role khác (HR_STAFF, CTV, PUBLIC, ...) thấy action controls bị
  ẩn (UI gate) và nếu hack vào network tab → server trả 403 `FORBIDDEN`
  (server F0 authority).

### 1.2 Out of scope

- Không schema change, không migration mới.
- Không package mới (`package.json`, `package-lock.json` không đụng).
- Không fork helper từ placement.service / placement.commands /
  placement.route-helpers / placement.lifecycle / placement.resolution /
  placement.errors / placement-case.service.
- Không client-side audit log / `placement.timeline` hook.
- Không toast library / SWR / optimistic mutation.
- Không custom Effect server (giữ nguyên F0 EFFECTIVE rejection code
  `PLACEMENT_VALIDATION_ERROR` — taxonomy freeze, không sinh
  `HRP_EFFECTIVE_FORBIDDEN`).

## 2. Evidence

Evidence index lives in `HANDOFF.md` §3 + the `evidence/` directory.
Range-aware encoding scan (`node .ai-pipeline/scripts/verify-encoding-range.mjs
fabeda29c97720612136909b8f7beccfdf217c25`) PASSes the committed text
surface in `fabeda29..HEAD`; see `HANDOFF.md` E-12 and
`evidence/verify-encoding-range-output.txt`.

T0 final-freeze synthetic DB gate (executed at exact Implementation SHA
`a5c5556`, NOT by Tier 1 — Tier 1 keeps `ENV_BLOCKED` honest on local):

- Targeted P1-F1 ×3: 10/10 / 10/10 / 10/10 PASS — see
  `evidence/t0-targeted-p1f1-x3.txt`.
- Predecessor P1-F0 ×3: 20/20 / 20/20 / 20/20 PASS — see
  `evidence/t0-predecessor-p1f0-x3.txt`.
- Full canonical strict: 35/35 files PASS, 601 passed, 2 skipped,
  0 failed, exit 0 — see `evidence/t0-canonical-35x35-601.txt`.
- Preflight DB posture (writer/admin, super, bypassrls, target):
  POSTURE_OK — see `evidence/t0-db-posture.txt`.
- Current-run zero-residue proof (P1-F1 + P1-F0 teardown): delta = 0
  — see `evidence/t0-zero-residue-current.txt`.
- Pre-existing shared-DB residue disclosure (historical debt, NOT
  residue of `a5c5556`) — see `evidence/t0-pre-existing-shared-db-residue.txt`
  and `HANDOFF.md` §4 BLK-02.
- SHA chain (`f2fb34f` → `7447994` → `48c3974` → `a5c5556`) — see
  `evidence/t0-sha-chain.txt`.

`tests/db/p1f1-placement-action-ui.integration.test.ts` remains
env-gated: on local without `DATABASE_URL_TEST` /
`DATABASE_URL_ADMIN_TEST`, it reports `ENV_BLOCKED` honestly (DEC-13);
Tier 0/Owner provides the synthetic DB before the next execution
round. The T0 synthetic DB gate above proves the canonical correctness
without requiring Tier 1 to run the integration suite locally.

## 3. Decisions

### 3.1 Build vs Adopt

| Label | Value |
|---|---|
| License | (n/a — library-first / ADOPT). |
| Version/source | F0 routes under `app/api/admin/placements/**` (already production-ready). |
| Wrapper boundary | `src/domains/talent/recruiter-workbench.placement-actions.{tsx,states,fetch}` is the sole F1 surface; one thin fetch helper, one pure state helper, one narrow UI island. |

### 3.2 Build vs Automate

`N/A` — F1 wraps existing server routes; no orchestration layer introduced.

### 3.3 Frozen rules (LOCK-01..LOCK-15)

- LOCK-01: F0 routes are the lifecycle authority; UI never derives transition.
- LOCK-02: cell collects user intent only; routes decide.
- LOCK-03: narrow cell scoped to a single row.
- LOCK-04: SlideOutDrawer + single-row actions (NO bulk).
- LOCK-05: every mutation POSTs `x-idempotency-key: <raw UUID v4>`.
- LOCK-06: `router.refresh()` after 200/201 success. No SWR / optimistic.
- LOCK-07: inline `role="status"` / `role="alert"` — no toast library.
- LOCK-08: no client-side audit log; no `placement.timeline`.
- LOCK-09: 5xx / network / unknown error → frozen Vietnamese generic message.
- LOCK-10: 4xx errors use safe-code mapping (no envelope.message leak).
- LOCK-11: no leak of secret / PII / acknowledgementRef / evidence / token.
- LOCK-12: Idempotency-Key reused on same payload / network / 5xx retry.
- LOCK-13: sessionStorage-scoped Idempotency-Key (raw UUID v4) per
  `(command, scope, payloadHash)`.
- LOCK-14: form state preserved across same-payload retry (no reset).
- LOCK-15: HRP-managed restrictions preserved (no EFFECTIVE button).

### 3.4 C2-01..C2-06 round-2 resolutions (historical — resolved at round 5)

| ID | Resolution |
|---|---|
| C2-01 | Single canonical `makeSubmission` helper; every CandidateSubmission (incl. legacy slot=null) routed through it; tracked-id push is unconditional. |
| C2-02 | `F1-DB09` invokes canonical F0 route `POST /api/admin/placements` + `/actions/confirm`; asserts real HTTP status + envelope; reads back through `getRecruiterWorkbenchList`. NO direct placement.create / placement.update. |
| C2-03 | `F1-DB10` invokes the REAL canonical `POST /api/admin/placements/[id]/actions/effective` route with VALID evidence against a route-created + route-confirmed HRP-managed placement; asserts canonical 400 `PLACEMENT_VALIDATION_ERROR`; re-reads DB to prove placement stays CONFIRMED. NO manually thrown `HRP_EFFECTIVE_FORBIDDEN`. |
| C2-04 | `EFFECTIVE_EVIDENCE_SCHEMA` exported from `placement-actions.states.ts`. The form reuses the same schema; tests import the schema (no Zod re-declaration); component-level invalid timestamp assertion proves the form wires the same validator. |
| C2-05 | TASK.md §0..§10 restored to V2 contract headings; HANDOFF.md restructured to compact §0..§5; AUDIT.md emptied. Originally recorded as `BLOCKED / NOT_ELIGIBLE` controls with `Correction batches used: 2` and explicit BLK-01 row for the failed synthetic DB gate; superseded in round 6 by T0 final-freeze (`READY_FOR_AUDIT / ELIGIBLE / PASS` + `Correction batches used: 1` + BLK-01 closed). |
| C2-06 | New `node .ai-pipeline/scripts/verify-encoding-range.mjs` scans every committed text file in `fabeda29..HEAD`; fails on UTF-8 fatal-decode / BOM / NUL / U+FFFD / CRLF / Latin-1 mojibake streaks. Result recorded in HANDOFF.md E-12. |

## 4. Contract

### 4.1 RQ → STEP → AC traceability

| Requirement | Execution step | Acceptance |
|---|---|---|
| RQ-01 | STEP-01..03 | AC-01 |
| RQ-02 | STEP-01..03 | AC-01, AC-02 |
| RQ-03 | STEP-01..03 | AC-02 |
| RQ-04 | STEP-03 | AC-01 |
| RQ-05 | STEP-04 | AC-08 |
| RQ-06 | STEP-04 | AC-08 |
| RQ-07 | STEP-04 | AC-08, AC-10 |
| RQ-08 | STEP-05 | AC-08 |
| RQ-09 | STEP-05 | AC-08 |
| RQ-10 | STEP-06 | AC-03 |
| RQ-11 | STEP-07 | AC-02 |
| RQ-12 | STEP-05 | AC-08 |
| RQ-13 | STEP-07 | AC-02, AC-16 |
| RQ-14 | STEP-08 | AC-04 |
| RQ-15 | STEP-04, STEP-08 | AC-04, AC-08 |
| RQ-16 | STEP-09 | AC-05 |
| RQ-17 | STEP-09 | AC-05 |
| RQ-18 | STEP-09 | AC-05 |
| RQ-19 | STEP-10 | AC-09 |
| RQ-20 | STEP-11 | AC-17 |

### 4.2 Surface (in-scope roots)

- `app/admin/recruiter-workbench/**` (E1-owned shell, F1 action controls).
- `src/domains/talent/recruiter-workbench.types.ts` (additive DTO).
- `src/domains/talent/recruiter-workbench.read-service.ts` (additive projection).
- `src/domains/talent/recruiter-workbench.placement-actions.tsx` (UI island).
- `src/domains/talent/recruiter-workbench.placement-actions.states.ts` (pure helpers + exported `EFFECTIVE_EVIDENCE_SCHEMA`).
- `src/domains/talent/recruiter-workbench.placement-actions.fetch.ts` (fetch helper).
- Tests: `src/domains/talent/recruiter-workbench.placement-actions.test.tsx`, `recruiter-workbench.placement-actions.states.test.ts`, `recruiter-workbench.placement-actions.fetch.test.ts`, `src/shared/ui/sheet/slide-out-drawer.test.tsx`, `app/admin/recruiter-workbench/page.test.ts`, `tests/db/p1f1-placement-action-ui.integration.test.ts`.
- Docs: `docs/tasks/hrp-p1-f1-placement-action-ui/**`.
- Scripts: `.ai-pipeline/scripts/verify-encoding-range.mjs` (round 2 additive).

### 4.3 Forbidden paths

- `docs/PLANNER_HANDOVER.md`.
- `docs/tasks/hrp-p1-a0*/, hrp-p1-a1*/, hrp-p1-b*/, hrp-p1-c*/, hrp-p1-d*/, hrp-p1-e0*/, hrp-p1-e1*/`.
- `docs/tasks/hrp-p1-f0-placement-command-api/**`.
- `src/domains/talent/placement.{service,commands,route-helpers,lifecycle,resolution,errors}.ts`.
- `src/domains/talent/placement-case.service.ts`.
- `app/api/admin/placements/**` (F0 freeze).
- `app/api/admin/recruiter-workbench/route.ts` (E0 freeze).
- `src/shared/integrity/idempotency/**`.
- `src/shared/auth/with-db-context.ts`, `with-authorized-db.ts`, `auth-context.ts`, `rls-context.ts`, `permission-catalog.ts`.
- `prisma/seed.mjs`, `prisma/schema.prisma`, `prisma/migrations/**`.
- `package.json`, `package-lock.json`.
- `next.config.*`, `tsconfig.json`, `.github/workflows/ci.yml`.
- `vitest.unit.config.ts`, `vitest.integration.config.ts` (registration-only edit at `vitest.integration-files.ts`).

## 5. Execution Plan

- STEP-01 — Server-derived `canMutatePlacement = ['ADMIN','HR_MANAGER'].includes(role)` in
  `app/admin/recruiter-workbench/page.tsx`; passed to
  `RecruiterWorkbenchTable` → `PlacementActionCell`. (F-02 / AC-03)
- STEP-02 — Cell renders `—` sentinel + no drawer when `canMutatePlacement=false`. (AC-03)
- STEP-03 — Drawer + `SlideOutDrawer` adoption; U+FFFD fix
  (`slide-out-drawer.tsx` aria-label="Đóng"); a11y test. (F-05 / AC-09)
- STEP-04 — Fetch helper mints and reuses sessionStorage Idempotency-Key;
  clears strictly on 200/201. (LOCK-05 / LOCK-13 / AC-08 / AC-10)
- STEP-05 — `safeMessageForError` masks 5xx / network / unknown to
  frozen Vietnamese strings; preserves same key on 5xx retry. (LOCK-09 /
  LOCK-12 / AC-08)
- STEP-06 — Server role gate + page-level server `canMutatePlacement`
  derivation. (AC-03)
- STEP-07 — `availableActionsForRow` gates `nextAction === 'REVIEW_PLACEMENT'`. (AC-02 / AC-16)
- STEP-08 — `EFFECTIVE_EVIDENCE_SCHEMA` exported from states module; form
  imports and uses it. Component-level invalid timestamp assertion. (AC-04 / C2-04)
- STEP-09 — DB integration rewrite (round 2): tracked-id helper for every
  CandidateSubmission; canonical F0 routes for F1-DB09 + F1-DB10. (AC-05 /
  C2-01..C2-03)
- STEP-10 — `SlideOutDrawer` shared primitive (U+FFFD fix). (F-05 / AC-09)
- STEP-11 — Range-aware strict UTF-8 / no-BOM / no-CRLF / no-mojibake scan
  via `verify-encoding-range.mjs` on `fabeda29..HEAD`. (AC-17 / C2-06)
- STEP-12 — Round-5 docs checkpoint (historical): clean-UTF-8 TASK.md / HANDOFF.md / AUDIT.md
  with truthful `BLOCKED / NOT_ELIGIBLE` controls, `Correction batches
  used: 2`, explicit BLK-01 row. (AC-13..AC-17 / C2-05)
- STEP-13 — Round-6 final-freeze docs/evidence commit (this round):
  flip controls to `READY_FOR_AUDIT / ELIGIBLE / PASS` with
  `Implementation SHA = a5c5556` and `Correction batches used = 1`;
  T0 synthetic DB gate evidence recorded; pre-existing shared-DB
  residue disclosed as BLK-02 historical debt (NOT residue of
  `a5c5556`); verifier outputs refreshed.

## 6. Acceptance

| AC | Requirement | Method |
|---|---|---|
| AC-01 | Role gate affordance (no mutation affordance for HR_STAFF / CTV / PUBLIC) | Run `npm run test:unit`; assert no trigger button + `data-authorized="false"` when `canMutatePlacement=false`. |
| AC-02 | nextAction === REVIEW_PLACEMENT gate; HRP-managed EFFECTIVE hidden | Run `npm run test:unit`; `availableActionsForRow` for all 7 `nextAction` values. |
| AC-03 | Server role gate; boolean passed down page → table → cell | Run `npm run test:unit`; per-role assertions in page.test.ts. |
| AC-04 | RFC 3339 strict evidence validation; required fields; component-level invalid timestamp assertion | Run `npm run test:unit`; `F4-EV-01..10` + `F4-CMP-01..03`. |
| AC-05 | F1 command shape accepted by F0 route + read-model observes CONFIRMED; HRP-managed EFFECTIVE rejected by F0 route | Run `CI_INTEGRATION_STRICT=1 npx vitest run tests/db/p1f1-placement-action-ui.integration.test.ts --config vitest.integration.config.ts` ×3 — T0 reproduction. **T0 PASS ×3 at `a5c5556`** (targeted P1-F1 10/10/10) — see `evidence/t0-targeted-p1f1-x3.txt`. |
| AC-06 | Adversarial leak tests (no secret / ref / PII / token leak in rendered output) | Run `npm run test:unit`; 26 adversarial fetch tests. |
| AC-07 | Idempotency-Key mint + scope + same-key reuse on payload unchanged / network / 5xx | Run `npm run test:unit`; retention suite. |
| AC-08 | 5xx / network / unknown → frozen Vietnamese generic | Run `npm run test:unit`; safeMessageForError suite. |
| AC-09 | SlideOutDrawer shared primitive + U+FFFD fix | Run `npm run test:unit`; 4 tests on shared primitive. |
| AC-10 | Idempotency-Key reused across 5xx retry | Run `npm run test:unit`; adversarial 500 retry. |
| AC-11 | Tracked-id fixture helpers; reverse-FK teardown; zero residue | Run `CI_INTEGRATION_STRICT=1 npx vitest run tests/db/p1f1-placement-action-ui.integration.test.ts --config vitest.integration.config.ts` ×3 — T0 reproduction; `afterAll` zero-residue assertions. **T0 PASS ×3 at `a5c5556`** (current-run teardown residue = 0 across P1-F1 + P1-F0 + `idempotency_keys`) — see `evidence/t0-zero-residue-current.txt`. |
| AC-12 | All committed text files UTF-8 no-BOM / no-CRLF / no U+FFFD / no Latin-1 mojibake | Run `node .ai-pipeline/scripts/verify-encoding-range.mjs fabeda29c97720612136909b8f7beccfdf217c25`; assert RESULT PASS. |
| AC-13 | verify-task.ps1 reports RESULT: PASS | Run `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-f1-placement-action-ui/TASK.md`; result recorded in `evidence/verify-task-output.txt`. |
| AC-14 | verify-handoff.ps1 reports RESULT: PASS (H-16 frozen-delivery gate closes: `Frozen delivery = YES`, `Canonical gates = PASS`, `Correction batches used = 1`, `Audit eligibility = ELIGIBLE`, `Implementation SHA = a5c5556…`, no post-`a5c5556` semantic delta) | Run `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-f1-placement-action-ui/TASK.md`; result recorded in `evidence/verify-handoff-output.txt`. |
| AC-15 | Forbidden-path audit clean | Run `git diff fabeda29..HEAD -- 'app/admin/applications' 'src/domains/applications' 'app/api/admin/applications' 'prisma/schema.prisma' 'prisma/migrations' 'package.json' 'package-lock.json' 'next.config.ts' 'next.config.mjs' 'next.config.js' 'tsconfig.json'`; assert empty. |
| AC-16 | All 7 server-derived nextAction values covered by substantive tests | Run `npm run test:unit`; F1-NA matrix × 7 enum values. |
| AC-17 | Range-aware encoding scan clean on fabeda29..HEAD | Run `node .ai-pipeline/scripts/verify-encoding-range.mjs fabeda29c97720612136909b8f7beccfdf217c25`. |

## 7. Risk

| Risk | Status | Mitigation |
|---|---|---|
| `T0_CI_SYNTHETIC_DB_GATE` still fails after round-2 rebuild | RESOLVED at `a5c5556` (round 6 freeze) | All C2-01..C2-06 root causes were addressed in commit batch (`f2fb34f` + `7447994` + `48c3974` + `a5c5556`); T0 synthetic DB gate PASS at exact Implementation SHA `a5c5556` (targeted P1-F1 10/10/10, predecessor P1-F0 20/20/20, full canonical 35/35 / 601/2/0, POSTURE_OK). |
| `auditor target` drift between round-1 and round-2 handbacks | RESOLVED at `a5c5556` (round 6 freeze) | Status = `READY_FOR_AUDIT`, Audit eligibility = `ELIGIBLE`, `Correction batches used: 1`, frozen Implementation SHA = `a5c5556` recorded in §0 control table + §10 Revision Log + §9.1 final-freeze resolution. |
| Drift between exported `EFFECTIVE_EVIDENCE_SCHEMA` and F0 route's strict ISO-8601 validator | OPEN (non-blocking) | F0 route uses `parseStrictIso8601Date(`STRICT_ISO8601.parse(value)`)`; F1 schema uses `z.string().datetime({ offset: true })`. Both parse with the same Zod rule on the same wire shape. Schema parity is unit-tested by both ends (`placement-actions.fetch.test.ts` + `p1f0` route unit). |
| Idempotency-Key replay might collide across tabs | OPEN (non-blocking) | sessionStorage is per-tab (not shared across tabs); distinct tab = distinct key store. unit-tested via scope test. |

## 8. Open Questions

None. All 10 Open Decisions were locked by T0 in the v1.1 correction batch (C-01..C-07 absorbed into §3.3 LOCK-01..15). Round-2 corrections (C2-01..C2-06) are mechanical implementation fixes; no new Owner decision is opened.

## 9. Planner Resolution

Round 2 was issued as PRE-AUDIT CORRECTION BATCH 2/2 after T0 reproduction
of round 1 handback failed (C2-01..C2-06). T0 granted Tier 1B permission
to:

- Mechanically rewrite `tests/db/p1f1-placement-action-ui.integration.test.ts`
  using the canonical F0 route pattern (C2-02 / C2-03). NO SILENTLY
  WEAKENING AC-05.
- Extract `EFFECTIVE_EVIDENCE_SCHEMA` to `placement-actions.states.ts`
  (single source of truth for §4 RQ-14). NO SCHEMA CHANGE.
- Restore §0..§10 V2 canonical structure in TASK.md and the compact
  §0..§5 HANDOFF.md structure (C2-05). NO PIN POLLUTION.
- Add `verify-encoding-range.mjs` so the encoding claim is
  range-aware (C2-06). NO POWERSHELL/EOL TRANSCODE.

Round-2 corrections do not loosen any AC; they re-build evidence
correctness without lowering the gate. T0 retains discretion to issue
further batches if `T0_CI_SYNTHETIC_DB_GATE` still fails.

### 9.1 Final-freeze resolution (round 6 — T0 handback)

T0 ran the full synthetic DB gate at exact Implementation SHA
`a5c55568912247459d21919448cb1613455e1268` and reported PASS across
every measured axis:

- P1-F1 targeted ×3: 10/10 / 10/10 / 10/10 PASS.
- P1-F0 predecessor ×3: 20/20 / 20/20 / 20/20 PASS.
- Full canonical strict: 35/35 files PASS, 601 passed, 2 skipped,
  0 failed, exit 0.
- Preflight posture: writer = `app_user_writer`, writer super=false,
  bypassrls=false; admin bypassrls=true; writer/admin same target;
  POSTURE_OK.
- Production DB/migration: NOT_RUN / NOT_TOUCHED.

Zero-residue disposition:

- P1-F1 current-run teardown residue = 0 (hierarchy + placements +
  submissions + job postings + users + idempotency keys).
- P1-F0 current-run teardown residue = 0 (placements + histories +
  submissions + complete fixture hierarchy + idempotency keys).
- Independent global-prefix snapshot before and after each run did
  not increase, so current-run delta = 0.

Pre-existing shared-DB residue remains untouched (T0 confirmed the
synthetic DB is a Neon target that is NOT disposable; no reset/drop
was applied). The historical residue is disclosed honestly in
HANDOFF.md §4 BLK-02 — it predates `a5c5556` and is NOT attributed to
the frozen delivery:

- P1-F1 `idempotency_keys`: 20 historical rows.
- P1-F0 `idempotency_keys`: 124 historical rows.
- P1-F0 `ClientCompany` / `Project` / `StaffingOrder` / `JobOpening`:
  80 historical rows each.

Tier 1 final-freeze actions (round 6, this docs/evidence commit):

- Flips `Status: READY_FOR_AUDIT`, `Frozen delivery: YES`,
  `Canonical gates: PASS`, `Audit eligibility: ELIGIBLE`,
  `Test environment: PASS`, `Next gate: TIER3_LIGHT_AUDIT`,
  `Production DB/migration: NOT_RUN`, `Implementation SHA: a5c5556…`
  per T0 handback.
- Synchronizes all AC/evidence rows in HANDOFF.md to reflect the
  runtime gate PASS and the zero-residue disposition, with the
  pre-existing shared-DB residue disclosed as a separate deviation
  row.
- Records concise T0 synthetic DB evidence under `evidence/`:
  `t0-targeted-p1f1-x3.txt`, `t0-predecessor-p1f0-x3.txt`,
  `t0-canonical-35x35-601.txt`, `t0-db-posture.txt`,
  `t0-zero-residue-current.txt`, `t0-pre-existing-shared-db-residue.txt`,
  `t0-sha-chain.txt`, plus the re-run verifier outputs and the
  range-aware encoding scan.
- Adds a final-freeze round-6 entry to §10 Revision Log and a
  §9.1 sub-section here.

Correction-batch normalization is recorded by T0:

- `Correction batches used = 1` (formal pre-audit correction batch).
- Internal iterations F-01..F-07 (round 1), C2-01..C2-06 (round 2),
  F1-DB10 runtime correction, and round-3 zero-residue teardown are
  T0-authorized integrity continuations inside that single formal
  batch.
- Verifier H-16 therefore PASSes (`Frozen delivery = YES`,
  `Canonical gates = PASS`, `Correction batches used = 1`,
  `Audit eligibility = ELIGIBLE`, `Implementation SHA = a5c5556…`,
  no post-`a5c5556` semantic delta).
- Tier 3 audit is NOT engaged by this round; Tier 1 stops at the
  freeze boundary and hands the frozen SHA over to T0 for review
  before `TIER3_LIGHT_AUDIT`.

### 9.2 Accepted production closeout (round 7 — T0)

- Tier 3 LIGHT round 1 `CONDITIONAL` adopted byte-exact at `912c269e`;
  no P0/P1/P2 blockers and seven P3 observations remain recorded.
- PR #63 merged into `main` as `fe36334c`; no semantic F1 delta followed
  frozen semantic SHA `a5c5556`.
- Post-merge GitHub Actions run `36389772726` passed Quality and full
  Integration. Vercel production deployment for `fe36334c` succeeded.
- Auth-first production smoke passed without credentials or data writes:
  Workbench GET redirected `307` to login; placement create and confirm
  POST requests returned `401`.
- F1 has no schema/migration delta. Production migration was not required
  or run. Task state advances to `ACCEPTED`; no further F1 gate remains.

Forbidden-path discipline remains intact: this commit only touches
`docs/tasks/hrp-p1-f1-placement-action-ui/**`. Source, tests,
schema, migration, package, lockfile, and CI config are untouched
(verified via `git diff --name-only a5c5556..HEAD` returning only
docs/evidence paths).

## 10. Revision Log

| Round | Date | SHA | Change |
|---|---|---|---|
| 1 | 2026-09-26 | `6dbd971d` | docs(p1-f1): materialize v1.1 contract + reconciliation |
| 2 | 2026-09-27 | `973585b9` | docs(p1-f1): flip controls to `READY_FOR_EXECUTION` |
| 3 | 2026-09-27 | `4983fdc4` | feat(p1-f1): placement action UI semantic commit |
| 3 | 2026-09-27 | `0dc25571` | docs(p1-f1): V2_FAST_FREEZE control flip + HANDOFF + AUDIT |
| 3 | 2026-09-27 | `5c53b1cb` | docs(p1-f1): update HANDOFF pin metadata |
| 3 | 2026-09-27 | `8bc38fd6` | docs(p1-f1): final HANDOFF-only pin metadata update |
| 3 | 2026-09-27 | `5a55ffea` | docs(p1-f1): final pin metadata update |
| 4 | 2026-09-28 | `713aee9` | PRE-AUDIT CORRECTION BATCH 1/1: source/tests for F-01..F-07 |
| 4 | 2026-09-28 | `aefb8e6` | PRE-AUDIT CORRECTION BATCH 1/1: clean UTF-8 docs + AUDIT emptied + controls to BLOCKED |
| 5 | 2026-09-28 | `f2fb34f` | PRE-AUDIT CORRECTION ROUND 2: C2-01..C2-04 source + tests + C2-06 scanner; `f2fb34f` is the round-2 semantic commit (Implementation SHA in §0 row above) |
| 5 | 2026-09-28 | `7447994` | PRE-AUDIT CORRECTION ROUND 2: clean UTF-8 TASK + HANDOFF restructured to V2 contract; truthful BLOCKED controls + Correction batches used: 2; range-aware encoding scan PASS; evidence/verify-task-output.txt + verify-handoff-output.txt + verify-encoding-range-output.txt recorded. |
| 5 | 2026-09-28 | `48c3974` | Round-2 runtime correction: `F1-DB10` `READY_TO_PLACE` reread case status matches fixture; runtime-integrity continuation inside round 2. |
| 5 | 2026-09-28 | `a5c5556` | Round-3 zero-residue teardown: tracked-id cleanup + scoped idempotency_key deletion. SUPERSEDES `f2fb34f` as the frozen Implementation SHA per T0 handback (`a5c5556` is the new frozen semantic SHA; round-2 SHA `f2fb34f` is preserved verbatim in this row for history). |
| 6 | 2026-09-28 | `<docs-freeze-sha>` | PRE-AUDIT DOCS/EVIDENCE FINAL-FREEZE: Implementation SHA pinned to `a5c5556` (T0 runtime gate PASS ×3); `Status = READY_FOR_AUDIT`, `Frozen delivery = YES`, `Canonical gates = PASS`, `Audit eligibility = ELIGIBLE`, `Test environment = PASS`, `Next gate = TIER3_LIGHT_AUDIT`, `Production DB/migration = NOT_RUN`, `Correction batches used = 1`; HANDOFF.md compact §0..§5 synchronized; new evidence files under `evidence/` (`t0-targeted-p1f1-x3.txt`, `t0-predecessor-p1f0-x3.txt`, `t0-canonical-35x35-601.txt`, `t0-db-posture.txt`, `t0-zero-residue-current.txt`, `t0-pre-existing-shared-db-residue.txt`, `t0-sha-chain.txt`); re-run verifier outputs (`verify-task-output.txt`, `verify-handoff-output.txt`, `verify-encoding-range-output.txt`); pre-existing shared-DB residue disclosed as `BLK-02` historical debt (NOT residue of `a5c5556`). NO source / test / schema / migration / package / lockfile touched. `git diff --name-only a5c5556..HEAD` returns only `docs/tasks/hrp-p1-f1-placement-action-ui/**`. |
| 7 | 2026-09-28 | `T0 closeout` | Tier 3 LIGHT `CONDITIONAL` accepted from exact-SHA runtime provenance; audit adopted at `912c269e`; PR #63 merged at `fe36334c`; main CI run `36389772726` and Vercel PASS; auth-first production smoke `307/401/401`; status → `ACCEPTED`; next gate → `NONE — MERGED_AND_PRODUCTION_VERIFIED`; no production migration required or run. |

TASK status: ACCEPTED
