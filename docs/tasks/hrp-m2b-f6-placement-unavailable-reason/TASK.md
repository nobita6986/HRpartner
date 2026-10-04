# TASK — `hrp-m2b-f6-placement-unavailable-reason`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-m2b-f6-placement-unavailable-reason` |
| Work type | `CODE` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.0` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | Bounded UI copy-only change on the placement action cell of the recruiter workbench. No server contract change, no schema/migration/auth/RLS/role-matrix change, no `availableActionsForRow` / `canPerformPlacementAction` semantic change, no Placement mutation contract change. Per `tier1.md` STANDARD lane may use `NONE` when no public-contract or shared-foundation expansion is detected (the only DTO field optionally added — `placementUnavailableReason` — is an OPTIONAL addition with a safe Vietnamese label, no UUID/raw server text/PII, and is computed by an existing pure resolver; it is also pure presentation and does not enter server authorization). T1 self-reviews the 4 risks in §7 below. |
| Status | `RESOLVED_PENDING_MAIN_MERGE` |
| Contract gate | `RESOLVED` |
| Decision state | `CLOSED` |
| Implementation SHA | `a558568a0cdf8e99ae981fffc18d979fd361345f` (`a558568a`) |
| Test environment | `READY` (Vitest unit lane — 240/240 green post-implementation: 78 pure resolver unit tests in `recruiter-workbench.placement-actions.unavailable.test.ts` + 67 placement-action render tests in `recruiter-workbench.placement-actions.test.tsx` + 95 workbench tests; no DB required for this scope; no integration test added) |
| Baseline | `8382bbc70b74f2fc21471c532b98bd20ab8a1fac` (origin/main HEAD at task start; merge commit of PR #90 — T1A M2A operational UX debt) |
| Correction budget | `1` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| In-scope roots | `src/domains/talent/recruiter-workbench.placement-actions.states.ts`; `src/domains/talent/recruiter-workbench.placement-actions.tsx`; `src/domains/talent/recruiter-workbench.placement-actions.unavailable.ts` (NEW); `src/domains/talent/recruiter-workbench.placement-actions.unavailable.test.ts` (NEW); `src/domains/talent/recruiter-workbench.types.ts`; `src/domains/talent/recruiter-workbench.placement-actions.states.test.ts`; `src/domains/talent/recruiter-workbench.placement-actions.test.tsx`; `app/admin/recruiter-workbench/_components/RecruiterWorkbenchTable.tsx` (no logic edit; only forward the new optional DTO field through); `docs/tasks/hrp-m2b-f6-placement-unavailable-reason/{TASK.md,HANDOFF.md}` |
| Forbidden paths | `prisma/**`; `migrations/**`; `src/domains/talent/placement.lifecycle.ts`; `src/domains/talent/placement.service.ts`; `src/domains/talent/recruiter-workbench.read-service.ts` (DTO shape is unchanged — the `placementUnavailableReason` field is OPTIONAL on `RecruiterWorkbenchRow` so the read service is forward-compatible without an edit; if the read service is later updated to populate the field, the value MUST remain a server-derived safe Vietnamese label produced by the resolver added in this round); `app/api/admin/placements/**`; `app/api/admin/recruiter/placements/**`; `app/api/admin/recruiter-workbench/**`; `app/admin/jobs/job-postings/[id]/editor-shell.tsx` (T1B-owned per M2A HANDOFF §6 / audit §G.A.1); `app/admin/jobs/job-postings/**`; `app/(jobs)/**`; `app/(portal)/**`; `app/layout.tsx`; `src/shared/auth/**`; `src/shared/security/**`; `package.json`; `package-lock.json`; `pnpm-lock.yaml`; `pnpm-workspace.yaml`; `docs/PLANNER_HANDOVER.md`; `docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_AUDIT.md`; `docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_EXECUTION_DECISION.md` |
| Required gates | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.unavailable.test.ts`; `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.states.test.ts`; `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.test.tsx`; `npm run typecheck`; `npx eslint <changed files>`; `npm run build`; `git diff --check`; `node .ai-pipeline/scripts/verify-encoding.mjs` (Node variant, no-BOM, valid UTF-8); `node .ai-pipeline/scripts/verify-encoding-range.mjs 8382bbc70b74f2fc21471c532b98bd20ab8a1fac HEAD` (range-aware scanner for the committed range — no CRLF, no U+FFFD, no mojibake streaks); `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-m2b-f6-placement-unavailable-reason/TASK.md`; `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-m2b-f6-placement-unavailable-reason/TASK.md` |
| Correction batches used | `0` |
| Next gate | `T0_PR_REVIEW_MERGE` (T0 coordinates with UI V1, reviews PR, merges after CI 4/4 — T1A does NOT merge) |

## 1. Outcome

### 1.1 User-visible outcome

- The `PlacementActionCell` on `/admin/recruiter-workbench` no longer renders a bare `—` sentinel when the row is unavailable for mutation. Instead, the cell surfaces a concise, safe, actionable Vietnamese reason that helps the operator understand **why** the action is not available right now. Specifically:
  1. **No permission / out of scope** (server-derived `canMutatePlacement === false` for the row) → "Không thuộc quyền của bạn." No mutation affordance is rendered. Existing F-02 / AC-03 behavior preserved byte-exact (no trigger, no drawer for `HR_STAFF` outside MINE, no drawer for `CTV` / `PUBLIC` / unauthenticated).
  2. **Stale snapshot** (server-derived `isStalePlacementSnapshot === true`) → the existing F-03 / LOCK-15 amber alert "Dữ liệu đã cũ. Vui lòng tải lại trang." is preserved byte-exact and is NOT overridden by a generic reason.
  3. **No eligible placement option** (no `Placement` row AND `placementOptions` is empty/null AND `caseStatus === READY_TO_PLACE`) → "Chưa có JobOpening phù hợp — cần JobOpening ở trạng thái OPEN và slot còn chỗ." No mutation affordance is rendered.
  4. **Case not ready** (no `Placement` row AND `caseStatus !== READY_TO_PLACE` AND there ARE placement options in `placementOptions`) → "Case chưa sẵn sàng — cần chuyển sang 'Sẵn sàng bố trí'." No mutation affordance is rendered.
  5. **Terminal placement** (`placement.status ∈ {EFFECTIVE, FAILED, CANCELLED}`) → "Bố trí đã ở trạng thái kết thúc — không còn thao tác." No mutation affordance is rendered.
  6. **No workflow gate** (`canMutatePlacement === true` but `nextAction !== REVIEW_PLACEMENT`) → "Case chưa đến bước bố trí." No mutation affordance is rendered. The `—` is replaced by the reason; the cell does NOT escalate the reason to a CTA (this is a UX step-down by design — the next-step CTA is rendered in the `NextActionBadge` column; the placement column's job is to explain the unavailability, not to act).
  7. **Generic safe fallback** (any combination not covered above) → "Chưa có thao tác bố trí phù hợp cho case này." No mutation affordance is rendered.
- The `Mở bố trí` button + drawer + confirm dialog continue to work for rows with at least one available action (regression on the existing F-06 / LOCK-03 / LOCK-04 / LOCK-15 / F-05 path is byte-exact).
- Reason rendering is **presentation only**: a small line of text below the `—` (or as a single line replacing the `—` when there is no stale snapshot) with `data-testid="placement-unavailable-reason"`. The text is a real, visible string — NOT `aria-hidden`, NOT behind a tooltip-only affordance. Tooltip is OPTIONAL (only if a stable, repo-owned tooltip primitive already exists at the time of implementation) and is purely additive; the inline text is the source of truth.
- The reason is **stable across renders** (deterministic from the same row + canMutatePlacement inputs), and NEVER contains a UUID, `CandidateSubmission.id`, `Placement.id`, raw server message, SQL/stack trace, or PII. The reason text is short (≤ 140 chars Vietnamese), responsive (does not widen the table on desktop, wraps to ≤ 2 lines on mobile), and uses the existing emerald/amber/rose system-tone vocabulary already in use by the F1 stale-alert and the lockup alert.
- No fetch is performed when the row is unavailable. No server request is initiated. No `router.refresh()` is triggered. The "Mở bố trí" button is NOT rendered, so the drawer cannot be opened by a path that the resolver says should have no action.

### 1.2 Non-goals

- No schema/migration/backfill change. No Prisma field added/changed. No DB connection in any of the unit tests.
- No auth/RLS/role-matrix widening. `canMutatePlacement` semantics preserved byte-exact; the cell only reads what the page already provides.
- No server contract change. The Placement mutation routes (`/api/admin/placements/**`, `/api/admin/recruiter/placements/**`) are not touched. The `placementRouteFamily` discriminator is preserved byte-exact. `availableActionsForRow` / `canPerformPlacementAction` / `isStalePlacementSnapshot` semantics are NOT edited; this round is purely additive.
- No new `package.json` dependency. No `pnpm-lock.yaml` change. No `pnpm-workspace.yaml` change.
- No new `docs/important/**` audit/decision document. This batch operates entirely inside the authority already recorded in `docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_EXECUTION_DECISION.md` §D (Priority 3) and §F (mandatory implementation pattern: server authority → capability → reason → UI).
- No editor-shell edit. `app/admin/jobs/job-postings/[id]/editor-shell.tsx` is T1B-owned per M2A HANDOFF §6 and the audit decision §G.A.1.
- No F8 forward-merge work. T1B owns that wiring; the shared safe error mapper module `src/domains/staffing/job-posting-error-map.ts` (shipped in M2A) is NOT modified or consumed by this round — F8 stays `PENDING_T1B_UI_V1_INTEGRATION`.
- No F9 reproduction. The audit decision §D Priority 1 is owned by a separate round (T1A F9).
- No opening of F1, F5, F7, F11. Those are `RESOLVED` (per M2A HANDOFF §0 and audit `§19.1`); this round does not re-implement them.
- No opening of F4 / F10 / F12 / F14. Those are `DEFERRED` / `CLOSED_NO_ISSUE` per audit decision §E.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_EXECUTION_DECISION.md` §D Priority 3 ("F6 — Placement unavailable reason") + §F (mandatory implementation pattern: server authority → capability → reason → UI) authorizes this round in a bounded UI/DTO presentation task. | Binding execution decision. |
| `EV-02` | `docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_AUDIT.md` §8.6 (F6 — recruiter-workbench placement action cell context copy, P2) defines the contract: server-derived `placementUnavailableReason`; render in the cell; pure DTO + presentational change; regression test must cover `canMutatePlacement = true/false` and various placement states. | Source-of-truth ledger for F6. |
| `EV-03` | `docs/tasks/hrp-m2a-operational-ux-debt/HANDOFF.md` §0 (post-merge state: F2/F3/F7/F11 `RESOLVED`; F8 `REMEDIATION_READY`; F6 still `NOT_OPENED` before this round opens it). | Establishes that F6 is the next authorized Priority 3 batch after M2A. |
| `EV-04` | `src/domains/talent/recruiter-workbench.placement-actions.states.ts:186-289` — `availableActionsForRow` and `canPerformPlacementAction` are the canonical pure resolvers. The five empty-action branches are: (a) `caseStatus === 'CLOSED'` (terminal case), (b) `nextAction !== 'REVIEW_PLACEMENT'`, (c) `placement === null && placementOptions.length === 0` (no eligible option), (d) `placement === null && caseStatus !== 'READY_TO_PLACE'` (case not ready), (e) `placement.status ∈ {EFFECTIVE, FAILED, CANCELLED}` (terminal placement) — plus the stale-snapshot lock via `isStalePlacementSnapshot`. | The resolver layers the cell will mirror: each empty branch maps 1:1 to a stable reason code. |
| `EV-05` | `src/domains/talent/recruiter-workbench.placement-actions.states.ts:479-497` — `isStalePlacementSnapshot` is the canonical stale detector. The M2A HANDOFF §0 already established that the stale-snapshot path is rendered with the amber alert at `placement-actions.tsx:140-167`. | Stale-snapshot path is OUT of scope for the new resolver (preserve byte-exact). |
| `EV-06` | `src/domains/talent/recruiter-workbench.placement-actions.tsx:128-185` — current `PlacementActionCell` renders bare `—` in three branches: unauthorized, stale (renders alert + `—`), and `!hasActions` (no reason). | Exact source location of the `—` to replace. |
| `EV-07` | `src/domains/talent/recruiter-workbench.types.ts:184-207` — `RecruiterWorkbenchRow.placement` and `.placementOptions` are already on the DTO; this round adds an OPTIONAL `placementUnavailableReason?: string` field that the cell reads. The field is OPTIONAL so the read service is forward-compatible without an edit. | DTO surface area. |
| `EV-08` | `app/admin/recruiter-workbench/_components/RecruiterWorkbenchTable.tsx:217-232` — `PlacementActionCell` is mounted with `placementRouteFamily` and `canMutatePlacement` threaded from the page. The table does not need to forward the new optional DTO field because the cell reads it directly from the row prop. | No change needed in the table beyond a forward (if `row.placementUnavailableReason` is in the row object, it is read). |
| `EV-09` | `app/admin/recruiter-workbench/page.tsx:200-230` — `placementRouteFamily` and `canMutatePlacement` are derived server-side from the authenticated role + view. The page never derives permission itself; the cell only mirrors the server flag. | Authority chain: page → table → cell. The new resolver lives in the cell, so it does NOT introduce a new server-side derivation. |
| `EV-10` | `src/domains/applications/placement-ui.ts:78-103` — existing precedent: `CONFLICT_LABELS` table + `conflictLabel(code)` mapper for placement-UI. The new resolver mirrors this pattern (readonly table + pure function + unknown-code fallback). | Library-first: re-uses an established pattern; no need to ADOPT an external library. |
| `EV-11` | `src/domains/staffing/job-posting-error-map.ts` (NEW in M2A) — repo-owned module pattern: pure, no I/O, no React, no Prisma; `safe Vietnamese label` returned for known codes; generic safe Vietnamese fallback returned for unknown codes. NEVER echoes raw developer / DB / API / PII text. | Established pattern to mirror for the new resolver. |
| `EV-12` | `src/domains/talent/recruiter-workbench.placement-actions.states.test.ts:39-66` — `baseRow()` helper shape (Pick of `caseStatus, placement, placementOptions, nextAction`) is the existing test surface. The new resolver test file follows the same builder pattern. | Test pattern. |
| `EV-13` | `src/domains/talent/recruiter-workbench.placement-actions.test.tsx:81-104` — `makeRowInput()` test builder for the cell render. The render tests for the new branch follow the same shape; only `row` and `canMutatePlacement` change. | Render-test pattern. |
| `EV-14` | `node .ai-pipeline/scripts/verify-encoding.mjs` exists in this worktree; the Node variant returns exit 0 on no-BOM + valid UTF-8. Range scanner `node .ai-pipeline/scripts/verify-encoding-range.mjs <from> <to>` exists and detects CRLF / U+FFFD / mojibake streaks. The PowerShell `verify-encoding.ps1` is NOT present in this worktree (matches M2A TASK §0). | Encoding gates match the M2A precedent. |
| `EV-15` | `docs/tasks/hrp-m2a-operational-ux-debt/HANDOFF.md` §6 (T1B integration contract) and `app/admin/jobs/job-postings/[id]/editor-shell.tsx:83-90` — the editor shell is T1B-owned. This round does NOT consume `summarizeJobPostingApiError` and does NOT touch the editor shell. | Boundary confirmation. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Add a new repo-owned module `src/domains/talent/recruiter-workbench.placement-actions.unavailable.ts` exporting a readonly `PLACEMENT_UNAVAILABLE_REASON_CODES: Readonly<Record<PlacementUnavailableReasonCode, string>>` table (8 codes — see `DEC-02`) and a pure `resolvePlacementUnavailableReason({ canMutatePlacement, row, isStale })` function. The function takes a derived `isStale` flag (caller computes it via the existing `isStalePlacementSnapshot`) so the resolver stays pure and the test surface is stable. | `CHOSEN` |
| `DEC-02` | Reason code vocabulary (closed enum): `NO_AUTHORITY` (no `canMutatePlacement`); `STALE` (already rendered by the existing alert — preserved byte-exact, the resolver still returns it so any downstream test can assert the contract); `NO_ELIGIBLE_OPTION` (no placement + no options + READY_TO_PLACE); `CASE_NOT_READY` (no placement + caseStatus !== READY_TO_PLACE + has options); `TERMINAL_PLACEMENT` (placement.status ∈ {EFFECTIVE, FAILED, CANCELLED}); `WORKFLOW_GATE` (no `nextAction === REVIEW_PLACEMENT`); `GENERIC_FALLBACK` (safe catch-all). 7 codes total (STALE is internally reserved for caller compatibility but the cell uses the existing F-03 amber alert path, not the resolver's STALE label — so 6 codes that drive user-visible text + 1 reserved STALE code). | `CHOSEN` |
| `DEC-03` | Add an OPTIONAL field `placementUnavailableReason?: PlacementUnavailableReasonCode | null` to `RecruiterWorkbenchRow`. The field is OPTIONAL so the read service is forward-compatible without a contract edit in this round. The cell falls back to its own resolver when the field is absent, undefined, or unrecognized. This keeps the F6 surface as a pure presentation change even if the read service is not updated by the time this round ships. | `CHOSEN` |
| `DEC-04` | `PlacementActionCell` consults the resolver in the `!hasActions` branch (line 175 in the current source). The `!authorized` branch (line 128) keeps its bare `—` (no reason text — the existing F-02 path is byte-exact per `EV-06` and the audit decision §F mandates the cell MUST NOT render any mutation affordance for unauthorized callers; rendering a reason here would be inconsistent with the bare-`—` rule and would also leak no-information that the unauthorized caller does not already know). The stale branch (line 140) keeps its existing amber alert; the resolver is NOT called for stale rows. | `CHOSEN` |
| `DEC-05` | Reason text is rendered as a small `<p data-testid="placement-unavailable-reason" className="text-[11px] text-slate-500 text-right max-w-[180px]">` element. The `—` sentinel is removed in the `!hasActions` branch; the reason paragraph takes its place (single-line on desktop, ≤ 2 lines on mobile). Tailwind classes follow the existing F-03 stale-alert / F-01 status badge pattern; no new utility, no new color, no new icon. | `CHOSEN` |
| `DEC-06` | No new dependency. No new component. No new icon. The resolver is a pure TypeScript function in a new file; the cell only edits a single JSX branch. | `CHOSEN` |
| `DEC-07` | The resolver NEVER echoes raw `body.message`, `envelope.error`, server text, UUID, SQL, stack trace, PII, or `CandidateSubmission.id` / `Placement.id` / `caseId`. Reason codes are stable and the labels are short Vietnamese phrases curated in this TASK. The fallback phrase is a generic safe Vietnamese sentence that does not mention the case id. | `CHOSEN` |
| `DEC-08` | The resolver is exported as a named function so it can be unit-tested independently of the cell. The cell passes a derived `isStale` flag (computed by the existing `isStalePlacementSnapshot` from the same row) so the cell stays the single caller of both the stale detector and the new resolver. The resolver itself is pure (no I/O, no DOM, no React). | `CHOSEN` |
| `DEC-09` | The new test file `src/domains/talent/recruiter-workbench.placement-actions.unavailable.test.ts` covers every code path: `NO_AUTHORITY`, `NO_ELIGIBLE_OPTION`, `CASE_NOT_READY`, `TERMINAL_PLACEMENT` (3 sub-cases: EFFECTIVE / FAILED / CANCELLED), `WORKFLOW_GATE` (6 non-REVIEW nextAction values), `GENERIC_FALLBACK`, and STALE-reserved compatibility. It also asserts that no reason label contains a UUID substring, the literal text `body.message`, the literal text `case-`, or PII keywords (phone/CCCD/email). | `CHOSEN` |
| `DEC-10` | The render tests in `src/domains/talent/recruiter-workbench.placement-actions.test.tsx` are extended with 8 new cases that drive the `!hasActions` branch: (1) `NO_AUTHORITY` is rendered ONLY when `canMutatePlacement === false` (regression on F-02); (2) `STALE` is NOT overridden by the resolver; (3) `NO_ELIGIBLE_OPTION` renders its label; (4) `CASE_NOT_READY` renders its label; (5) `TERMINAL_PLACEMENT` renders its label for each of the 3 terminal states; (6) `WORKFLOW_GATE` renders its label for the 6 non-REVIEW nextAction values; (7) `GENERIC_FALLBACK` renders its label; (8) `Mở bố trí` STILL renders for the eligible row (regression on F-06). All 52 existing render tests are kept green. | `CHOSEN` |
| `DEC-11` | `git diff --check` + `node .ai-pipeline/scripts/verify-encoding.mjs` + `node .ai-pipeline/scripts/verify-encoding-range.mjs 8382bbc70b74f2fc21471c532b98bd20ab8a1fac HEAD` are all required gates. The PowerShell `verify-encoding.ps1` is absent in this worktree (matches M2A TASK §0); the Node variant is the canonical gate here. | `CHOSEN` |
| `DEC-12` | The DTO change is OPTIONAL: `placementUnavailableReason?: PlacementUnavailableReasonCode | null`. The cell does NOT depend on the read service populating the field in this round — when the field is absent, the cell computes the reason from the row + `canMutatePlacement` (which the page already provides). A follow-up round may populate the field in the read service; that round is out of scope here. | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Safe Vietnamese reason table + pure function | (a) the existing `src/domains/applications/placement-ui.ts:78-103` `CONFLICT_LABELS` + `conflictLabel` pattern; (b) external i18n library (e.g. `react-intl`, `i18next`); (c) custom | `N/A` | N/A | N/A | N/A | This task does not create a general-purpose capability. It mirrors the existing in-repo `CONFLICT_LABELS` pattern; no new dependency, no framework. The reason table is presentation-only and the cell is the only consumer. No library is adopted. |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| N/A | N/A | `N/A` | N/A | N/A | N/A | N/A | This task creates no connector, scheduler, notification worker, or multi-system workflow. It is a pure presentation change. |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `src/domains/talent/recruiter-workbench.placement-actions.unavailable.ts` (NEW) exports `PLACEMENT_UNAVAILABLE_REASON_CODES: Readonly<Record<PlacementUnavailableReasonCode, string>>` with 6 user-visible codes (`NO_AUTHORITY`, `NO_ELIGIBLE_OPTION`, `CASE_NOT_READY`, `TERMINAL_PLACEMENT`, `WORKFLOW_GATE`, `GENERIC_FALLBACK`) plus 1 reserved `STALE` code for caller compatibility. Each label is a short, safe Vietnamese phrase (≤ 140 chars), never echoes a UUID, raw server text, PII keyword, or `case-` substring. |
| `RQ-02` | The same module exports `resolvePlacementUnavailableReason({ canMutatePlacement, row, isStale }): { code: PlacementUnavailableReasonCode; label: string }`. Pure function. Decision order: (1) `canMutatePlacement === false` → `NO_AUTHORITY`; (2) `isStale === true` → `STALE` (caller renders the existing F-03 amber alert — the resolver still returns the code/label for testability); (3) `placement == null && (placementOptions ?? []).length === 0` → `NO_ELIGIBLE_OPTION`; (4) `placement == null && caseStatus !== 'READY_TO_PLACE'` → `CASE_NOT_READY`; (5) `placement != null && placement.status ∈ {EFFECTIVE, FAILED, CANCELLED}` → `TERMINAL_PLACEMENT`; (6) `nextAction !== 'REVIEW_PLACEMENT'` → `WORKFLOW_GATE`; (7) otherwise → `GENERIC_FALLBACK`. |
| `RQ-03` | The resolver NEVER reads from the network, filesystem, `Date.now()`, or any non-deterministic source. It is a pure function of its arguments. Two calls with the same arguments produce the same `{ code, label }`. |
| `RQ-04` | `src/domains/talent/recruiter-workbench.types.ts` adds an OPTIONAL `placementUnavailableReason?: PlacementUnavailableReasonCode | null` field to `RecruiterWorkbenchRow`. The field is OPTIONAL so the read service is forward-compatible without a contract edit in this round. A new exported type `PlacementUnavailableReasonCode` is added as a union of the 7 string literals. |
| `RQ-05` | `src/domains/talent/recruiter-workbench.placement-actions.tsx:175-185` (the `!hasActions` branch) is replaced so the cell renders a `<p data-testid="placement-unavailable-reason" className="text-[11px] text-slate-500 text-right max-w-[180px]">` paragraph with the resolver's `label` text. The bare `—` is removed in this branch. The branch's outer wrapper (`<div className="flex justify-end" data-testid="placement-action-cell" data-case-id={row.caseId} data-authorized={authorized} data-route-family={placementRouteFamily}>`) is preserved byte-exact, AND a new `data-unavailable-reason={code}` attribute is added so tests can assert the chosen code without parsing the rendered text. |
| `RQ-06` | The `!authorized` branch (line 128) and the `stale` branch (line 140) are NOT modified beyond adding the new `data-unavailable-reason={code}` attribute. The `!authorized` branch keeps its bare `—` (F-02 byte-exact); the `stale` branch keeps its existing amber alert. |
| `RQ-07` | The `hasActions === true` branch (line 187) is NOT modified. The `Mở bố trí` button + drawer + confirm dialog continue to render and operate exactly as they do on `8382bbc7`. |
| `RQ-08` | `app/admin/recruiter-workbench/_components/RecruiterWorkbenchTable.tsx` is NOT modified. The cell reads the new optional DTO field directly from the row prop; no table-side forwarding is required. If a future round updates the read service to populate the field, the cell picks it up automatically; until then the cell's local resolver is authoritative. |
| `RQ-09` | `src/domains/talent/recruiter-workbench.placement-actions.unavailable.test.ts` (NEW) covers every code path: (a) `NO_AUTHORITY` (1 case); (b) `STALE` (1 case for caller compatibility); (c) `NO_ELIGIBLE_OPTION` (1 case: no placement + no options + READY_TO_PLACE); (d) `CASE_NOT_READY` (1 case: no placement + non-READY + has options); (e) `TERMINAL_PLACEMENT` (3 cases: EFFECTIVE / FAILED / CANCELLED on READY_TO_PLACE); (f) `WORKFLOW_GATE` (6 cases: one per non-REVIEW nextAction value, with options present); (g) `GENERIC_FALLBACK` (1 case: placement === SELECTED + READY_TO_PLACE + REVIEW_PLACEMENT → STILL has actions and the resolver is not called, so this case asserts the resolver's NO_FALLBACK for the has-actions path is not reached; the actual GENERIC_FALLBACK is asserted separately by a 1-case scenario where the resolver is called for a synthetic row that has hasActions === false in the cell but the resolver itself returns GENERIC_FALLBACK only when the cell would render the unavailable branch — a contradiction, so this case is re-framed as a defensive assertion that the resolver's fallback for an unrecognized state is `GENERIC_FALLBACK`); (h) determinism (2 calls same args same output); (i) purity (no `Date.now()`, no `Math.random()`, no fetch); (j) safe-text assertion: no returned label contains a UUID substring (`/^[0-9a-f]{8}-[0-9a-f]{4}-/i`), the literal text `body.message`, the literal text `case-`, the literal text `submission`, or PII keywords (`sdt`, `cccd`, `email`, `phone`). Total ≥ 17 cases. |
| `RQ-10` | `src/domains/talent/recruiter-workbench.placement-actions.test.tsx` is extended with 8 new render cases: (1) `canMutatePlacement === false` → bare `—`, no reason paragraph (F-02 regression); (2) stale row → existing amber alert, reason paragraph NOT present (F-03 regression); (3) `NO_ELIGIBLE_OPTION` row → reason paragraph present with the `NO_ELIGIBLE_OPTION` label and `data-unavailable-reason="NO_ELIGIBLE_OPTION"`; (4) `CASE_NOT_READY` row → reason paragraph present with the `CASE_NOT_READY` label; (5a/5b/5c) `TERMINAL_PLACEMENT` row (EFFECTIVE / FAILED / CANCELLED) → reason paragraph present with the `TERMINAL_PLACEMENT` label; (6) `WORKFLOW_GATE` row (each of 6 non-REVIEW nextAction values) → reason paragraph present with the `WORKFLOW_GATE` label; (7) synthetic row that produces `GENERIC_FALLBACK` (placement SELECTED + READY_TO_PLACE + has no actions but the cell would still render the unavailable branch) — re-framed as: placement `EFFECTIVE` (terminal) + READY_TO_PLACE is the same as case 5a; the real `GENERIC_FALLBACK` is asserted by direct unit test on the resolver only (RQ-09). (8) eligible row (placement null + READY_TO_PLACE + options + REVIEW_PLACEMENT + `canMutatePlacement === true`) → `Mở bố trí` button still present (F-06 regression). All 52 existing render tests are kept green. |
| `RQ-11` | `src/domains/talent/recruiter-workbench.placement-actions.states.test.ts` is NOT modified. The 59 existing tests must remain green (regression on the F1 matrix). |
| `RQ-12` | No forbidden path appears in `git diff --stat origin/main..HEAD` after the implementation commit. The full set of forbidden paths is enumerated in `§0 Control > Forbidden paths`. The check is `git diff --stat origin/main..HEAD -- <forbidden path list>` reports 0 lines on every forbidden path. |
| `RQ-13` | All gates in `§0 Required gates` PASS. Specifically: (a) new unit test file passes; (b) existing states test passes; (c) extended render test passes; (d) `npm run typecheck` exit 0; (e) `npx eslint <changed files>` exit 0; (f) `npm run build` exit 0; (g) `git diff --check` exit 0; (h) `node .ai-pipeline/scripts/verify-encoding.mjs` exit 0 on the working-tree changed surface; (i) `node .ai-pipeline/scripts/verify-encoding-range.mjs 8382bbc70b74f2fc21471c532b98bd20ab8a1fac HEAD` exit 0 on the committed range. |
| `RQ-14` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-m2b-f6-placement-unavailable-reason/TASK.md` and `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-m2b-f6-placement-unavailable-reason/TASK.md` both exit 0. |
| `RQ-15` | `docs/tasks/hrp-m2b-f6-placement-unavailable-reason/{TASK.md,HANDOFF.md}` are created in this round and contain the V2_FAST_FREEZE contract. The HANDOFF pins the exact `Implementation SHA` and reports all gates. |
| `RQ-16` | No mutation request is initiated for any row the resolver says should be unavailable. The cell only renders the `Mở bố trí` button when `hasActions === true`; in every other branch the button is absent. The drawer is not opened. No POST to `/api/admin/placements/**` or `/api/admin/recruiter/placements/**` is reachable from the unavailable row. |
| `RQ-17` | ADMIN / HR_MANAGER (route family `admin`) and HR_STAFF + view=MINE (route family `recruiter`) rows do not regress: the existing F-02 / F-04 / B-08 chain is preserved byte-exact. The new resolver does NOT depend on `placementRouteFamily`. |
| `RQ-18` | Reason label is responsive: on a narrow viewport (≤ 360px) it wraps to ≤ 2 lines; on a wide viewport it occupies a single line with `max-w-[180px]`. No horizontal table scroll is introduced by the reason text. The reason paragraph does not widen the column beyond the existing F-01 `Mở bố trí` button width. |

### 4.2 Scope boundaries

- **In:** 5 in-scope roots (4 production code paths + 1 new test file + 2 docs files). Specifically:
  - `src/domains/talent/recruiter-workbench.placement-actions.states.ts` — no semantic edit; the file is in-scope only to add an OPTIONAL type re-export for the new `PlacementUnavailableReasonCode` if the cell needs to import it (otherwise NOT edited at all).
  - `src/domains/talent/recruiter-workbench.placement-actions.tsx` — edit ONLY the `!hasActions` branch (line 175-185) and add the `data-unavailable-reason` attribute to the existing wrapper divs in the `!authorized` and `stale` branches.
  - `src/domains/talent/recruiter-workbench.placement-actions.unavailable.ts` (NEW) — pure resolver module.
  - `src/domains/talent/recruiter-workbench.placement-actions.unavailable.test.ts` (NEW) — pure resolver unit tests.
  - `src/domains/talent/recruiter-workbench.types.ts` — add OPTIONAL `placementUnavailableReason` field to `RecruiterWorkbenchRow` and the new `PlacementUnavailableReasonCode` type.
  - `src/domains/talent/recruiter-workbench.placement-actions.test.tsx` — extend with 8 new render cases.
  - `docs/tasks/hrp-m2b-f6-placement-unavailable-reason/{TASK.md,HANDOFF.md}` (NEW).
- **Out:** all forbidden paths in `§0 Control > Forbidden paths`. The Placement read service is forward-compatible without an edit; a future round may populate the OPTIONAL DTO field but is NOT in this round.
- **Allowed task artifacts:** `docs/tasks/hrp-m2b-f6-placement-unavailable-reason/**`.

### 4.3 Domain boundaries

- **Data/state:** ZERO DB writes; ZERO Prisma imports new in scope; no model field added/changed. The OPTIONAL DTO field is presentation only.
- **Permission/security:** `canMutatePlacement` semantics preserved byte-exact; the cell only reads what the page already provides. The new resolver does NOT change authorization.
- **Interface/API:** No route file touched. No DTO change (the OPTIONAL field is forward-compatible). No service contract change. The resolver is a pure presentation module (no DOM, no I/O).
- **Migration/rollback:** N/A. Rollback = revert branch commit.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `src/domains/talent/recruiter-workbench.placement-actions.unavailable.ts` (NEW) | Pure resolver: `PLACEMENT_UNAVAILABLE_REASON_CODES` table + `PlacementUnavailableReasonCode` type + `resolvePlacementUnavailableReason({ canMutatePlacement, row, isStale })` function; mirrors `placement-ui.ts:78-103` pattern | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.unavailable.test.ts` PASS | Static analyzer flags an unsafe code path (echoes UUID, raw server text, etc.) → stop, report T0 |
| `STEP-02` | `src/domains/talent/recruiter-workbench.placement-actions.unavailable.test.ts` (NEW) | Pure unit tests for every documented code path; determinism; purity; safe-text assertion (no UUID, no `body.message`, no PII keywords) | `npx vitest run` PASS | Test fails unexpectedly → stop, report T0 |
| `STEP-03` | `src/domains/talent/recruiter-workbench.types.ts` | Add OPTIONAL `placementUnavailableReason?: PlacementUnavailableReasonCode | null` to `RecruiterWorkbenchRow`; export the new `PlacementUnavailableReasonCode` union type | `npm run typecheck` exit 0; `git diff --check` PASS | TypeScript error on existing consumers → stop |
| `STEP-04` | `src/domains/talent/recruiter-workbench.placement-actions.tsx` — replace the `!hasActions` branch + add `data-unavailable-reason` attribute to the other branches' wrapper divs | F6 reason rendering + test hook | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.test.tsx` PASS (52 existing + 8 new = 60 cases) | Any existing test fails → stop, report T0 |
| `STEP-05` | `src/domains/talent/recruiter-workbench.placement-actions.test.tsx` | Add 8 new render cases (NO_AUTHORITY / STALE / NO_ELIGIBLE_OPTION / CASE_NOT_READY / TERMINAL_PLACEMENT × 3 / WORKFLOW_GATE × 6 → consolidated into 1 it.each / eligible row regression) | `npx vitest run` PASS | Test fails → stop |
| `STEP-06` | `src/domains/talent/recruiter-workbench.placement-actions.states.test.ts` (no edit, regression baseline) | Confirm 59 existing F1 matrix tests are unaffected | `npx vitest run` PASS | Any existing test fails → stop, report T0 |
| `STEP-07` | `docs/tasks/hrp-m2b-f6-placement-unavailable-reason/{TASK.md,HANDOFF.md}` | Track execution per V2_FAST_FREEZE | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-m2b-f6-placement-unavailable-reason/TASK.md` PASS; `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-m2b-f6-placement-unavailable-reason/TASK.md` PASS | n/a |
| `STEP-08` | Run all gates from §0 Required gates | Canonical gates per `tier1.md` | All PASS | Any FAIL → diagnose, fix within-budget, re-run |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | The new resolver file `src/domains/talent/recruiter-workbench.placement-actions.unavailable.ts` exists; exports `PLACEMENT_UNAVAILABLE_REASON_CODES` with 7 entries, `resolvePlacementUnavailableReason` function, `PlacementUnavailableReasonCode` type union | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.unavailable.test.ts` (≥ 17 cases) |
| `AC-02` | `resolvePlacementUnavailableReason` returns the canonical code per the decision order in `RQ-02` for every documented scenario | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.unavailable.test.ts -t "code path"` (≥ 6 scenario cases) |
| `AC-03` | The resolver NEVER returns a label containing a UUID substring, the literal text `body.message`, the literal text `case-`, the literal text `submission`, or PII keywords | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.unavailable.test.ts -t "safe text"` (1 safe-text assertion) |
| `AC-04` | The resolver is pure: two calls with the same arguments produce the same `{ code, label }`; no `Date.now()`, no `Math.random()`, no fetch | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.unavailable.test.ts -t "pure"` (determinism + purity cases) |
| `AC-05` | `RecruiterWorkbenchRow` carries the OPTIONAL `placementUnavailableReason?: PlacementUnavailableReasonCode | null` field; existing consumers do not need to update | `npm run typecheck` exit 0 |
| `AC-06` | `PlacementActionCell` renders the reason paragraph with the correct `data-testid` and `data-unavailable-reason` for each of the 6 user-visible codes | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.test.tsx` (8 new render cases) |
| `AC-07` | The `!authorized` branch and the `stale` branch are NOT overridden by the resolver (F-02 + F-03 byte-exact) | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.test.tsx -t "no override"` (2 regression cases) |
| `AC-08` | The `Mở bố trí` button still renders for the eligible row (F-06 byte-exact) | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.test.tsx -t "eligible regression"` (1 regression case) |
| `AC-09` | The 59 existing states tests + the 52 existing render tests remain green (full regression on the F1 matrix) | `npx vitest run --config vitest.unit.config.ts src/domains/talent/recruiter-workbench.placement-actions.states.test.ts src/domains/talent/recruiter-workbench.placement-actions.test.tsx` |
| `AC-10` | `npm run typecheck` exit 0 | manual run |
| `AC-11` | `npx eslint <changed files>` exit 0 | manual run |
| `AC-12` | `npm run build` exit 0 | manual run |
| `AC-13` | `git diff --check origin/main..HEAD` exit 0 (no whitespace errors) | manual run |
| `AC-14` | `git diff --stat origin/main..HEAD -- <forbidden path list>` reports 0 lines on every forbidden path | manual run |
| `AC-15` | `node .ai-pipeline/scripts/verify-encoding.mjs` exit 0 on the working-tree changed surface (no BOM, no invalid UTF-8) | manual run |
| `AC-16` | `node .ai-pipeline/scripts/verify-encoding-range.mjs 8382bbc70b74f2fc21471c532b98bd20ab8a1fac HEAD` exit 0 on the committed range (no CRLF, no U+FFFD, no mojibake streaks) | manual run |
| `AC-17` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-m2b-f6-placement-unavailable-reason/TASK.md` exit 0 | manual run |
| `AC-18` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-m2b-f6-placement-unavailable-reason/TASK.md` exit 0 | manual run |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-01` | `AC-01, AC-02` |
| `RQ-03` | `STEP-01` | `AC-04` |
| `RQ-04` | `STEP-03` | `AC-05` |
| `RQ-05` | `STEP-04` | `AC-06` |
| `RQ-06` | `STEP-04` | `AC-07` |
| `RQ-07` | `STEP-04` | `AC-08` |
| `RQ-08` | `STEP-04` | `AC-09` (regression) |
| `RQ-09` | `STEP-02` | `AC-01, AC-02, AC-03, AC-04` |
| `RQ-10` | `STEP-05` | `AC-06, AC-07, AC-08` |
| `RQ-11` | `STEP-06` | `AC-09` |
| `RQ-12` | `STEP-08` | `AC-14` |
| `RQ-13` | `STEP-08` | `AC-10, AC-11, AC-12, AC-13, AC-15, AC-16, AC-17, AC-18` |
| `RQ-14` | `STEP-08` | `AC-17, AC-18` |
| `RQ-15` | `STEP-07` | `AC-17, AC-18` |
| `RQ-16` | `STEP-04` | `AC-06, AC-07, AC-08` (no trigger button in the unavailable branch) |
| `RQ-17` | `STEP-04` | `AC-09` (regression on the 52 existing render tests, which cover ADMIN/HR_MANAGER + HR_STAFF × MINE/ALL/UNASSIGNED combinations) |
| `RQ-18` | `STEP-04` | `AC-06` (`max-w-[180px]` class is asserted by string match on the markup; the rendered HTML is the verification method) |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | A future PR removes the reason paragraph and the cell reverts to bare `—` | Static guard test in `placement-actions.test.tsx` AC-06/AC-07/AC-08 enforces exact `data-testid` and `data-unavailable-reason`; rollback = revert commit |
| `RISK-02` | The resolver accidentally echoes a raw server message or PII because a future addition to the `PLACEMENT_UNAVAILABLE_REASON_CODES` table includes a templated string | Safe-text assertion in `placement-actions.unavailable.test.ts` AC-03 asserts the 6 forbidden substrings across all 7 labels; rollback = revert commit |
| `RISK-03` | The new `data-unavailable-reason` attribute collides with a future layout test that uses the same attribute on a different element | The attribute is namespaced under `data-unavailable-reason` (no other element in the workbench uses this attribute per `grep`); rollback = rename + revert |
| `RISK-04` | The DTO change (`placementUnavailableReason` on `RecruiterWorkbenchRow`) breaks an existing consumer that does `.exact()` on the row shape | The field is OPTIONAL with a `| null` union; existing consumers that do not consume the field are unaffected. `npm run typecheck` confirms this. Rollback = revert commit |
| `RISK-05` | The F-02 / F-03 byte-exact paths regress because the cell now also calls the resolver for the `!authorized` and `stale` branches | `DEC-06` keeps the resolver out of those branches; AC-07 asserts the regression. Rollback = revert commit |
| `RISK-06` | A CRLF or BOM sneaks in via PowerShell 5.1 `Set-Content` | `node .ai-pipeline/scripts/verify-encoding.mjs` (no-BOM) and `node .ai-pipeline/scripts/verify-encoding-range.mjs` (CRLF + U+FFFD + mojibake) are both required gates. Rollback = re-save the file via the first-class Write tool |
| `RISK-07` | A new test file path `__tests__/…` collides with the existing convention `*.test.{ts,tsx}` colocated in `src/domains/talent/` | The new file is `placement-actions.unavailable.test.ts` colocated with the resolver module (matches the existing F1 convention `placement-actions.states.test.ts`); vitest unit config glob covers it. Rollback = rename + revert |
| `RISK-08` | The 6 non-REVIEW nextAction values yield 6 separate render cases in AC-06 — if the F-06 workflow gate is later refactored, the test count changes | Each non-REVIEW value is asserted individually; the test file uses `it.each` for the 6 values so the test is self-documenting. The state space is closed by `SERVER_DERIVED_NEXT_ACTION_VALUES` and the F-06 tests already pin the count. Rollback = revert commit |

## 8. Open Questions

| ID | Question | Blocks | Status |
|---|---|---|---|
| — | All decisions are closed in §3. `Build vs adopt: N/A` and `Build vs automate: N/A` are explicit. | n/a | NONE |

## 9. Planner Resolution

| ID | Source | Decision | Status |
|---|---|---|---|
| `PR-01` | T0 directive (user task) | Scope = F6 only; F2/F3/F7/F8/F11 stay `RESOLVED` / `REMEDIATION_READY`; F1 / F5 / F7 / F11 / F9 not re-opened; F4 / F10 / F12 / F14 not re-opened; no schema/migration/auth/RLS/role-matrix change; no `editor-shell.tsx` edit; UI reason only explains state, does not grant authority. | `ACCEPTED` — `DEC-01..DEC-12` implement exactly this scope. |
| `PR-02` | Execution decision §D Priority 3 | Bounded UI/DTO presentation task; pure resolver; OPTIONAL DTO field; F-02 / F-03 / F-06 byte-exact; no `availableActionsForRow` / `canPerformPlacementAction` semantic change. | `ACCEPTED` — `RQ-01..RQ-18` mirror this. |
| `PR-03` | Execution decision §F (mandatory implementation pattern) | Server authority → capability → reason → UI. The cell MUST NOT infer permission on its own; the resolver is a presentation-only mapper of server-derived flags. | `ACCEPTED` — `DEC-01` (pure resolver) + `DEC-04` (cell only reads server-derived flags) implement this. |
| `PR-04` | M2A HANDOFF §0 | F8 stays `PENDING_T1B_UI_V1_INTEGRATION`; this round does NOT consume `summarizeJobPostingApiError`; the editor shell is NOT touched. | `ACCEPTED` — `§0 Forbidden paths` + `§1.2 Non-goals` enforce this. |
| `PR-05` | Audit `§8.6` F6 correction boundary | "add a server-derived `placementUnavailableReason` to the row DTO; render it in the cell. Pure DTO + presentational change." | `ACCEPTED` — `DEC-03` (OPTIONAL DTO field) + `DEC-04` (cell render) implement this. The OPTIONAL is forward-compatible per the T0 directive's "if needed" clause (`§3.1.1` in the T0 directive: "Nếu current row không đủ dữ liệu để phân biệt lý do một cách đúng nghĩa, được phép bổ sung một optional server-derived safe reason code vào read DTO"). The cell's local resolver handles the case when the read service does not yet populate the field; a follow-up round may populate the field. |

## 10. Revision Log

| Rev | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-04 | Initial TASK. Lane `STANDARD`, Audit `NONE`, baseline `8382bbc7` (origin/main HEAD; merge commit of PR #90 — T1A M2A). Implementation SHA = `TBD` (set in HANDOFF after freeze). Canonical gates proven by M2A PR #90 CI run `37173116377` (Quality + Integration + Vercel 4/4 SUCCESS, 2026-10-04T03:09Z) — same code graph at baseline. | T0 directive 2026-10-04 chốt outcome/boundary/lane/audit. |
| `v1.1` | 2026-10-04 | Implementation frozen. SHA `a558568a0cdf8e99ae981fffc18d979fd361345f` (commit `a558568a`). Status `RESOLVED_PENDING_MAIN_MERGE`. All gates PASS (240 placement+workbench tests green; typecheck exit 0; build `✓ Compiled successfully in 8.3s` + 30/30 static pages; ESLint 0 errors on touched files; `git diff --check` exit 0; encoding range scanner `6/6 PASS`; encoding surface scanner `10/10 PASS`). Forward-only commit on branch `codex/t1a-m2b-f6-placement-unavailable-reason`; PR open pending T0 review + merge coordination with UI V1. Forbidden paths clean (`git diff --stat origin/main..HEAD -- <forbidden list>` reports 0 lines on every forbidden path). | Self-review PASS; implementation SHA frozen. |
