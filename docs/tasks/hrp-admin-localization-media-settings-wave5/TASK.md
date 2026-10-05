# TASK — `hrp-admin-localization-media-settings-wave5`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-admin-localization-media-settings-wave5` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | Presentation-only localization followed by owner-authorized visual verification; no API, auth, schema, permission, or business-logic changes. T0 requests light review and explicitly excludes Tier 3/AUDIT. |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `cec69ac591459cd8f75ae4035d0a57a7f11d748f` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `app/admin/media/**`; `app/admin/settings/**`; `src/domains/media/media-ui.ts`; corresponding static terminology tests; `docs/tasks/hrp-admin-localization-media-settings-wave5/**`; `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_WALKTHROUGH.md` |
| Forbidden paths | APIs; Prisma/schema/migrations; auth/RLS/permissions; other admin routes; P2.1; unrelated milestones; production data or credentials; paths outside in-scope roots |
| Required gates | Targeted Media/Settings tests; `npm run test:unit`; `npm run typecheck`; `npm run lint`; `npm run build`; `npx --no-install prisma validate`; `node .ai-pipeline/scripts/verify-encoding.mjs`; `git diff --check`; PR CI 4/4; main CI/deploy; production Media/Settings smoke |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `NONE: /deliver → /resolve` |

## 1. Outcome

### 1.1 User-visible outcome

Present the Admin Media Library and Settings pages in clear Vietnamese, including user-facing status/style choices, while retaining canonical values and behavior. After production deployment, complete the requested desktop/mobile walkthrough of the scoped pages and key Wave 1–4 routes, then record findings in the designated walkthrough document.

### 1.2 Non-goals

- No API, enum value, auth/RLS, schema, permission, persistence, validation, or business-logic changes.
- No Mốc 3 feature work, P2.1, or unrelated milestone work.
- No Tier 3 audit, `AUDIT.md`, or production DB operation.
- No credentials, tokens, PII, or authenticated screenshots in source, logs, or artifacts.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_EXECUTION_PLAN.md` §3.2.9 and §5.3 | Binding media status terminology and Media/Settings ownership gate |
| `EV-02` | `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_AUDIT.md` L-090..L-096 | Known Media/Settings terminology findings |
| `EV-03` | `src/shared/i18n/glossary.ts`, `form-dictionary.ts`, and `action-dictionary.ts` | Reuse existing Wave 1–4 terminology instead of duplicating shared labels |
| `EV-04` | `docs/tasks/hrp-v6-admin-v4-media-library/TASK.md` status `ACCEPTED v1.0`, and baseline `cec69ac591459cd8f75ae4035d0a57a7f11d748f` | Confirms Mốc 3 AV4 Media Library has landed before this follow-up wave |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Change display copy only; keep request fields, route paths, status values, and UI state behavior unchanged. | `CHOSEN` |
| `DEC-02` | Reuse Wave 1 common form/action dictionaries; use only a Media-owned dictionary for its domain-specific folder/status display values. | `CHOSEN` |
| `DEC-03` | Retain technical acronyms and code identifiers only where needed as hints; translate all operator-facing labels and enum option text. | `CHOSEN` |
| `DEC-04` | Wave 5 visual review is performed only after successful main deployment with an Owner-provided ADMIN session; no credentials are recorded. | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Vietnamese display labels | Existing repository dictionaries | `N/A` | `N/A` | `N/A` | Existing dictionary pattern | No capability or dependency is introduced. |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| Localization and visual verification | Manual UI review after deployment | `N/A` | `N/A` | No automated production mutation | `N/A` | Findings recorded without credentials or PII | No connector, scheduler, or automated workflow is introduced. |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Localize all operator-facing Media and Settings labels, helper text, empty/error/confirmation messages, folder labels, and enum display values into clear Vietnamese. |
| `RQ-02` | Preserve canonical status/style values, request paths and payloads, authorization, schema, and all existing form/media behavior. |
| `RQ-03` | Add targeted static terminology tests for Media and Settings and ensure Media's domain labels are exhaustively mapped. |
| `RQ-04` | After deploy, visually inspect desktop and mobile for key Wave 1–4 routes plus Media/Settings using an Owner-provided ADMIN session; fix only presentation/copy issues in one follow-up PR. |
| `RQ-05` | Record routes/devices checked, findings/fixes, and remaining debt in `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_WALKTHROUGH.md`. |

### 4.2 Scope boundaries

- **In:** Media Library UI, Settings UI, Media display-label dictionary if required, static terminology tests, task/handoff, and the requested visual walkthrough record.
- **Out:** API/service behavior, authorization/RLS, schema/persistence, other routes except read-only Wave 1–4 visual inspection, and all unrelated milestones.
- **Allowed task artifacts:** `docs/tasks/hrp-admin-localization-media-settings-wave5/**`

### 4.3 Domain boundaries

- **Data/state:** Canonical enum keys and input values remain unchanged; only visible labels change.
- **Permission/security:** Existing MEDIA and Settings authorization remains unchanged. Never record or expose Owner session credentials.
- **Interface/API:** Request URLs, methods, query keys, payload keys, and response handling remain unchanged.
- **Migration/rollback:** `N/A` — no schema or persistence change.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `app/admin/media/**`, `app/admin/settings/**`, optional `src/domains/media/media-ui.ts`, targeted static tests | Localize Media/Settings copy and display enum values while preserving canonical behavior | Targeted tests, unit/type/lint/build/Prisma/encoding gates, diff review | Stop if a fix requires API/auth/schema/business behavior changes |
| `STEP-02` | PR and production | Commit/push/open PR; merge only after CI 4/4 GREEN and `MERGEABLE/CLEAN`; wait for main CI/deploy and smoke Media/Settings | GitHub PR/workflow evidence and unauthenticated route smoke | Stop on any failed check/deploy/smoke |
| `STEP-03` | Key Wave 1–4 routes, Media and Settings | Visual walkthrough on desktop and mobile with Owner-provided ADMIN session; address only small UI/copy issues in one follow-up PR; document results | Route/device checklist and follow-up CI/deploy/smoke if a fix is needed | Stop and report to T0 if business logic/auth/schema changes are required |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Media/Settings terminology guards pass; no raw `PUBLIC`/`INTERNAL` status text or known untranslated display copy remains. | `npx --no-install vitest run --config vitest.unit.config.ts app/admin/media/__tests__/media-terminology.static.test.ts app/admin/settings/__tests__/settings-terminology.static.test.ts src/domains/media/media-ui.test.ts` |
| `AC-02` | Canonical enum values, URLs, payloads, auth, schema, and business behavior are unchanged. | Review exact scoped diff; confirm changes are presentation/test/task-only. |
| `AC-03` | Targeted and full unit, typecheck, lint, build, Prisma validate, encoding, and whitespace gates pass. | Commands listed in Control; record exit/results in HANDOFF. |
| `AC-04` | PR CI is 4/4 GREEN and `MERGEABLE/CLEAN`; true merge; main CI and deploy pass; Media/Settings production routes resolve correctly. | GitHub PR/workflow evidence and production route smoke. |
| `AC-05` | Wave 1–4 key routes and Media/Settings are checked at desktop and mobile widths; outcomes and any copy-only follow-up are recorded; no unapproved auth/schema/business work remains. | `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_WALKTHROUGH.md` and Owner-provided signed-in visual review. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-05` |
| `RQ-02` | `STEP-01` | `AC-02` |
| `RQ-03` | `STEP-01` | `AC-01`, `AC-03` |
| `RQ-04` | `STEP-02`, `STEP-03` | `AC-04`, `AC-05` |
| `RQ-05` | `STEP-03` | `AC-05` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | A translated enum label could accidentally replace its canonical value. | Keep option `value`, state values, query parameters, and payloads canonical; test exact keys and inspect diff. |
| `RISK-02` | ADMIN session evidence could disclose credentials or PII. | Use only Owner-provided authenticated browser session; do not capture secrets/PII or include authenticated screenshots/logs in artifacts. |

## 8. Open Questions

- None for the presentation-only implementation. Owner ADMIN session access is required before `STEP-03`.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| `1` | Contract ready | Exact latest-main baseline pinned; Mốc 3 Media Library is accepted on main; source ownership and allowed surfaces are bounded. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-05` | Initial Wave 5 Media/Settings and visual walkthrough contract | T0 directive |
