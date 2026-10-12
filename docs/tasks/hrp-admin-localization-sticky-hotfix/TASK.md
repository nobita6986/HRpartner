# TASK — hrp-admin-localization-sticky-hotfix

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-admin-localization-sticky-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `MIXED` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | `Owner yêu cầu chỉ review nhẹ, không audit.` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `583a181f5ab9a65f42ad87630ed39a71b2cbd39c` |
| Implementation SHA | `277b3b33fd5301ef2b98292984613ff6cc5ec0b6` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `NOT_REQUIRED` |
| In-scope roots | `app/admin/**; app/api/admin/homepage-settings/**; src/domains/job-board/public-content-controls/**; src/domains/job-board/public-settings.service.ts; src/domains/job-board/public-types.ts; directly related tests; this task artifact` |
| Forbidden paths | `Prisma schema/migrations; auth/RLS; API payload names, enum values, IDs, domain invariants; production DB; unrelated admin UI` |
| Required gates | `targeted Vitest; npm run test:unit; npm run typecheck; npm run lint; npm run build; npx --no-install prisma validate; encoding verification; git diff --check; desktop/mobile browser verification` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `PUSH_PR_CI_MERGE_DEPLOY_SMOKE` |

## 1. Outcome

### 1.1 User-visible outcome

- Admin operator copy uses Vietnamese glossary terms and human-readable status/reason labels, without exposing schema/editor/RPC/internal implementation details.
- The public sticky announcement marquee visibly loops, honors reduced motion, has a shorter safe-area-aware background, supports persisted 0–100% background opacity without fading text or controls, and keeps its dismiss button reachable away from the Messenger launcher.

### 1.2 Non-goals

- No translation of code identifiers, request/response keys, enum values, IDs, or domain invariants.
- No schema/migration, authorization, RLS, lifecycle, or business-rule changes.
- No production DB access or unrelated Admin localization.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/job-board/public-content-controls/animation.ts` returns literal class names while the component uses CSS Modules | Likely animation-class scoping failure; verify against rendered browser behavior |
| `EV-02` | `types.ts`, `dto-projection.ts`, `public-settings.service.ts`, Admin patch/form and API route all share the existing sticky JSON contract | Add a backwards-compatible defaulted opacity field without schema changes |
| `EV-03` | Existing Admin screens render raw JobPosting/JobOpening/StaffingOrder terms, enum values, and implementation guidance in operator-facing copy | Replace visible copy using existing glossary and domain dictionaries; leave identifiers intact |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Keep `backgroundOpacity` in the existing `stickyAnnouncement` JSON object; missing legacy values resolve to `100`, and validation accepts integers 0–100 | `CHOSEN` |
| `DEC-02` | Reuse existing glossary and domain status dictionaries; translate only rendered/operator-facing text | `CHOSEN` |
| `DEC-03` | Put dismiss control first on the left, with accessible target and safe-area-aware compact bar layout; keep foreground opacity independent from background | `CHOSEN` |
| `DEC-04` | No Prisma migration or production database access; stop if implementation would require either | `CHOSEN` |

`Build vs adopt N/A`: reuse existing React, CSS Modules, and Zod; no dependency or shared framework is added.
`Build vs automate N/A`: no connector, scheduler, worker, or multi-system workflow is introduced.

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| UI controls and marquee | Existing React, CSS Modules, Zod | `N/A` | `N/A` | Existing repository dependencies | Existing sticky DTO/component | No new generic capability or dependency |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| None | `N/A` | `N/A` | `N/A` | `N/A` | `N/A` | `N/A` | No workflow automation |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Rendered Admin copy uses “Tin tuyển dụng”, “Vị trí cần tuyển”, “Đợt tuyển dụng”, “Ứng viên”, and “Người lao động”; statuses and public-application history reasons are presented in Vietnamese; technical implementation prose is absent from operator UI. |
| `RQ-02` | MARQUEE class names resolve through the CSS Module and animate a genuinely continuous track; reduced-motion users see a stationary message. |
| `RQ-03` | Existing sticky JSON/DTO/API/service flow supports `backgroundOpacity` as an integer 0–100, defaults absent legacy values to 100, and persists edits without a migration. |
| `RQ-04` | Sticky bar is compact and safe-area-aware; only its background is translucent; dismiss control is visible, operable, and positioned on the left away from chat launcher. |

### 4.2 Scope boundaries

- **In:** relevant visible surfaces under `app/admin/**`; existing sticky types/schema/default/projection, settings patch/form/page, Admin API and service, public component/CSS, and directly related tests.
- **Out:** schema/migrations, auth/RLS, canonical identifiers/payload names, lifecycle/business rules, other settings, production DB, push/deploy changes beyond normal PR workflow.
- **Allowed task artifacts:** `docs/tasks/hrp-admin-localization-sticky-hotfix/**`

### 4.3 Domain boundaries

- **Data/state:** keep opacity within the current sticky JSON field; legacy missing value is 100; no migration.
- **Permission/security:** preserve existing ADMIN boundary, CTA URL validation, dismiss/revision semantics, and safe text rendering.
- **Interface/API:** add only `backgroundOpacity` to the existing sticky DTO/JSON shape; preserve all canonical keys and enums.
- **Migration/rollback:** `N/A — no relational schema change`.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | Admin job, opening, staffing, application, and posting screens | Replace technical/raw operator copy with existing Vietnamese glossary/dictionary labels | Static/regression tests and targeted UI tests | Would require changing domain semantics or auth |
| `STEP-02` | Existing sticky DTO, settings UI/patch, API/service, public component/CSS | Persist defaulted opacity and repair class-scoped continuous marquee; compact layout and relocate dismiss control | DTO/API/service/component tests plus desktop/mobile browser checks | Any Prisma migration or data-contract ambiguity |
| `STEP-03` | Changed surface | Run canonical quality gates, review diff, commit and handoff | All required gates and clean worktree | Any blocker remains |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Relevant Admin screens display Vietnamese glossary labels and mapped statuses/reasons; no specified raw technical terms remain in operator copy | `npm run test:unit -- app/admin/__tests__/operator-terminology.static.test.ts` |
| `AC-02` | MARQUEE track has matching hashed CSS Module classes and measurable animation movement; reduced-motion disables movement | Targeted Vitest plus desktop/mobile browser computed-style and position checks |
| `AC-03` | 0 and 100 opacity values validate/persist/read correctly; absent legacy field resolves to 100; foreground remains fully opaque | Targeted Vitest for DTO/projection/patch/API/service and desktop/mobile browser check |
| `AC-04` | Bar height is reduced, bottom safe area is respected, and left dismiss control is visible/clickable at desktop and mobile widths | Browser verification at 1440px desktop and 390px mobile viewport |
| `AC-05` | No migration/schema, auth/RLS, canonical API/enum/ID, or business-rule changes; requested quality gates pass | `npx --no-install prisma validate`, `npm run test:unit`, `npm run typecheck`, `npm run lint`, `npm run build`, encoding gate, and final change review |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-02` | `AC-03`, `AC-05` |
| `RQ-04` | `STEP-02` | `AC-04` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Existing sticky JSON lacks opacity, and class-scoped animation may be inert | Default legacy payloads to 100; test CSS class wiring and rendered movement; revert only this forward branch if blocked |

## 8. Open Questions

- None.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| `1` | `Keep the approved contract execution-ready; local test and browser checks are available` | `This presentation-focused task requires no database; no database was accessed.` |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-05` | Initial contract; implementation frozen at `277b3b33fd5301ef2b98292984613ff6cc5ec0b6` with local gates passing | Owner hotfix directive; PR delivery, CI, merge, and production smoke pending |
| `v1.0` | `2026-10-05` | Recorded the local test environment as ready; no database was required or accessed | Keep contract readiness distinct from the pending review and delivery stages |
