# TASK — `hrp-admin-localization-wave4`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-admin-localization-wave4` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | Presentation-only Vietnamese localization; no state, calculation, API, authorization, or persistence changes. T0 explicitly forbids Tier 3/AUDIT. |
| Spec version | `v1.0` |
| Status | `IN_PROGRESS` |
| Planner | `Tier 1` |
| Baseline | `8a27860fc5e2d77206192fa716d36c04573b110d` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `app/admin/attendance/page.tsx`; `app/admin/reconciliation/page.tsx`; `app/admin/tickets/page.tsx`; `app/admin/payroll/page.tsx`; `app/admin/commission/policies/page.tsx`; `app/admin/commission/ledger/page.tsx`; `src/shared/i18n/attendance-labels.ts`; `src/shared/i18n/reconciliation-labels.ts`; static tests for attendance, reconciliation, tickets, payroll, and commission; `docs/tasks/hrp-admin-localization-wave4/**` |
| Forbidden paths | `app/api/**`; `prisma/**`; auth/RLS/permission; P2.1; Media/Settings; other Mốc deliverables; all paths outside the in-scope roots |
| Required gates | Targeted Wave 4 Vitest tests; `npm run test:unit`; `npm run typecheck`; `npm run lint`; `npm run build`; `npx --no-install prisma validate`; `npx --no-install prisma generate`; `node .ai-pipeline/scripts/verify-encoding.mjs`; `git diff --check`; PR CI 4/4; main CI/deploy and production route smoke |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `NONE: /deliver → /resolve` |

## 1. Outcome

### 1.1 User-visible outcome

Localize operator-facing copy in the Wave 4 Admin routes, including attendance and reconciliation enum labels, while preserving canonical values and all existing workflow behavior.

### 1.2 Non-goals

- No enum, API, auth, RLS, schema, data, calculation, or business-rule changes.
- No Media/Settings, P2.1, or other milestone work.
- No Tier 3 audit or `AUDIT.md`.
- No new dependencies.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_EXECUTION_PLAN.md` §3.3, §3.5, §5.4 | Binding labels, file ownership, and static test requirements |
| `EV-02` | `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_AUDIT.md` L-049..L-085, L-103 | Current attendance, reconciliation, and ticket copy findings |
| `EV-03` | `src/shared/i18n/glossary.ts`, `form-dictionary.ts`, `action-dictionary.ts` | Reuse Wave 1 shared terms and actions |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Keep all canonical enum and filter values unchanged; translate only displayed labels. | `CHOSEN` |
| `DEC-02` | Reuse Wave 1 glossary/form/action dictionaries; add only the two requested domain label modules. | `CHOSEN` |
| `DEC-03` | Keep disabled commission routes on the existing Vietnamese `UnderDevelopment` placeholder. | `CHOSEN` |
| `DEC-04` | Audit mode is NONE as explicitly directed by T0. | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| UI label dictionaries | Existing repository dictionaries | `N/A` | `N/A` | `N/A` | `N/A` | No technical capability or dependency is introduced. |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| Workflow automation | `N/A` | `N/A` | `N/A` | `N/A` | `N/A` | `N/A` | No connector, scheduler, worker, or multi-system workflow is introduced. |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Translate visible copy and diacritic-missing Vietnamese on the scoped routes using binding Wave 4 terms. |
| `RQ-02` | Translate attendance and reconciliation status/kind values for display without changing their canonical values. |
| `RQ-03` | Add route terminology guards and exhaustiveness tests for the two new dictionaries. |
| `RQ-04` | Preserve API requests, filters, authorization, schema, lifecycle, calculations, and disabled commission behavior. |

### 4.2 Scope boundaries

- **In:** The exact source and test paths listed in Control; reuse shared Wave 1–3 label helpers.
- **Out:** APIs, persistence, authorization, schema, business logic, Media/Settings, P2.1, other milestones.
- **Allowed task artifacts:** `docs/tasks/hrp-admin-localization-wave4/**`

### 4.3 Domain boundaries

- **Data/state:** Canonical status/kind/source codes and workflow conditions remain byte-for-byte unchanged.
- **Permission/security:** `N/A` — no permission behavior changes.
- **Interface/API:** Request paths, query/body keys, and response shapes remain unchanged.
- **Migration/rollback:** `N/A` — no schema or data changes.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | Attendance and reconciliation pages plus the two shared label modules | Localize visible copy, labels, and status/kind displays; preserve canonical values | Targeted tests and API/filter diff review | Stop if a label requires changing domain meaning or workflow behavior |
| `STEP-02` | Tickets, payroll, commission routes and five route terminology tests | Close scoped remaining visible copy and add static guards | Targeted tests; route and disabled-placeholder review | Stop if commission route behavior is no longer the disabled placeholder |
| `STEP-03` | Entire changed surface | Run canonical gates, self-review, commit, PR, merge, and production smoke | AC-01..AC-04 | Stop on any failed gate, semantic conflict, or production failure |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Scoped routes render Vietnamese copy, with no listed diacritic-missing strings or raw attendance/reconciliation status labels. | `npx --no-install vitest run --config vitest.unit.config.ts app/admin/attendance/__tests__/attendance-terminology.static.test.ts app/admin/reconciliation/__tests__/reconciliation-terminology.static.test.ts app/admin/tickets/__tests__/tickets-terminology.static.test.ts app/admin/payroll/__tests__/payroll-terminology.static.test.ts app/admin/commission/__tests__/commission-terminology.static.test.ts src/shared/i18n/__tests__/attendance-labels.test.ts src/shared/i18n/__tests__/reconciliation-labels.test.ts` |
| `AC-02` | Canonical values, filters, payloads, auth, schema, and business logic are unchanged. | Reviewed diff is limited to display labels, dictionaries, tests, and task artifacts |
| `AC-03` | Targeted and full repository test/build/type/lint/Prisma/encoding/whitespace gates pass. | Commands in Control and PR CI |
| `AC-04` | True-merge occurs only after PR CI 4/4 GREEN and `MERGEABLE/CLEAN`; production main CI/deploy and all scoped route smokes pass. | GitHub PR/workflow evidence and unauthenticated production smoke |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01`, `STEP-02` | `AC-01` |
| `RQ-02` | `STEP-01` | `AC-01`, `AC-02` |
| `RQ-03` | `STEP-01`, `STEP-02` | `AC-01`, `AC-03` |
| `RQ-04` | `STEP-01`, `STEP-02`, `STEP-03` | `AC-02`, `AC-04` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | A presentation label could be mistaken for a changed workflow value. | Keep all code paths, comparisons, request values, and payloads canonical; static tests assert key source behavior. |

## 8. Open Questions

- None.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-05` | Initial contract | T0 Wave 4 directive |
