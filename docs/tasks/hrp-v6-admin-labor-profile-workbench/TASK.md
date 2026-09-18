# TASK — `hrp-v6-admin-labor-profile-workbench`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-admin-labor-profile-workbench` |
| Work type | `CODE` |
| Assurance lane | `STANDARD` |
| Audit mode | `LIGHT` |
| Audit reason | Read services touching user data, RLS and identity dedup requires LIGHT audit. |
| Spec version | `v1.0` |
| Status | `REVISION_REQUIRED` |
| Planner | `Tier 1` |
| Planner authority | `docs/V6/V6_OUTSTANDING_WORK_PLAN.md §8` |
| Baseline | `e798af80fd4111b5c41688abc1b9b9362b3b7727` |
| In-scope roots | `src/domains/talent/**`, `app/api/admin/labor-profiles/**`, `app/admin/labor-profiles/**` |
| Forbidden paths | `prisma/schema.prisma` |
| Required gates | `npm run test:unit`, `npm run build` |
| Current execution round | `4` |
| Current audit round | `3` |
| Next gate | `LIGHT: /deliver -> /audit -> /resolve` |

## 1. Outcome

### 1.1 User-visible outcome

- Provides an admin list view at `/admin/labor-profiles` to track all labor profiles and their current statuses.
- Provides a progressive disclosure intake form at `/admin/labor-profiles/new` allowing staff to record new labor profiles and perform safe deduplication.
- Provides a comprehensive 360-degree detail view at `/admin/labor-profiles/{id}` showing 8-block data (identity, relationship status, source, handler, commission rights, applications, employment history, and action buttons).

### 1.2 Non-goals

- No schema or database migration changes.
- No new business authority (use existing `createOrMatchLaborProfile`).
- No secondary identity/dedup algorithms.
- No N2-4 HandlingAssignment implementation (leave placeholder "Chưa có dữ liệu").
- No N2-5 BeneficiaryDecision implementation (leave placeholder "Chưa đủ điều kiện").
- No CRM, chat, or customer service (CSKH) features.
- No "Convert" button if the LaborProfile is already a Worker.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `docs/V6/v6-admin-rebuild.md:360-382` | W4 definitions, requirements and strict exclusions. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Use `createOrMatchLaborProfile` for intake deduplication. | `CHOSEN` |
| `DEC-02` | Use placeholder text for N2-4 and N2-5 UI blocks. | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Create a read service for LaborProfile listing and 360-degree detail retrieval. |
| `RQ-02` | Build `/admin/labor-profiles` list with functional row deep-links. |
| `RQ-03` | Build `/admin/labor-profiles/new` as a 3-layer progressive disclosure form utilizing `createOrMatchLaborProfile`. |
| `RQ-04` | Build `/admin/labor-profiles/{id}` showing the 8-block detail structure. |

### 4.2 Scope boundaries

- **In:** `src/domains/talent/**`, `app/api/admin/labor-profiles/**`, `app/admin/labor-profiles/**`
- **Out:** Any changes to `prisma/schema.prisma` or existing migrations. CRM and chat. HandlingAssignment or BeneficiaryDecision logic.
- **Allowed task artifacts:** `docs/tasks/hrp-v6-admin-labor-profile-workbench/**`

### 4.3 Domain boundaries

- **Data/state:** Must strictly use existing database schema and canonical domain models.
- **Permission/security:** Read service must enforce RLS and check visibility via `withDbContext`.
- **Interface/API:** Backend API endpoints must wrap read/write domain commands and queries.
- **Migration/rollback:** N/A — No migrations.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `src/domains/talent/labor-profile.read-service.ts` | Create read service for list & detail 360 queries, enforcing RLS. | `npm run test:unit` | If read service conflicts with existing `Worker` logic. |
| `STEP-02` | `app/api/admin/labor-profiles/route.ts` & `[id]/route.ts` | Create backend APIs for list, detail and new profile creation. | `npm run test:unit` | If API requires schema changes. |
| `STEP-03` | `app/admin/labor-profiles/page.tsx` | Create UI list page with deep linking to detail. | `npm run build` | If UI component exceeds 300 lines (need splitting). |
| `STEP-04` | `app/admin/labor-profiles/new/page.tsx` | Create progressive disclosure intake form. | `npm run build` | If custom dedup algorithm is needed. |
| `STEP-05` | `app/admin/labor-profiles/[id]/page.tsx` | Create 360 detail page with 8 blocks (and hardcoded placeholders for N2-4/N2-5). | `npm run build` | If implementation drift occurs. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Read service correctly retrieves profiles list and details enforcing RLS. | `npm run test:unit` |
| `AC-02` | Admin UI list renders without errors and links point to details. | `npm run build` |
| `AC-03` | Intake form calls `createOrMatchLaborProfile` and handles dedup. | `npm run test:unit` |
| `AC-04` | Detail page renders 8 blocks, strictly showing placeholders for handler and commission. | `npm run build` |
| `AC-05` | PII Masking & Permissions (CCCD visibility relies on CAN_VIEW_WORKER_SENSITIVE). | `npm run test:unit` |
| `AC-06` | Real list filters (chưa hoàn thiện, cần đối chiếu trùng, chưa từng đi làm, đang làm, đã nghỉ). | `npm run build` |
| `AC-07` | Đang làm/Đã nghỉ reconciliation computed from canonical EmploymentEpisode. | `npm run test:unit` |
| `AC-08` | Complete 3-tier intake form with deduplication preview and consent/channel. | `npm run build` |
| `AC-09` | Convert to Worker action disabled/hidden when already a Worker or placeholder. | `npm run build` |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-03` | `AC-02` |
| `RQ-03` | `STEP-04` | `AC-03` |
| `RQ-04` | `STEP-05` | `AC-04` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Exposing PII via read service. | Use `withDbContext` and RLS strictly in service layer. |

## 8. Open Questions

- None.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| `2` | REVISION_REQUIRED | Masking, filter missing |
| `3` | REVISION_REQUIRED | Dedup mismatch, Channel wrong, PII oracle |
| `4` | READY_FOR_AUDIT | Resolved P1 blockers |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-18` | Initial contract | Initial |
| `v1.0` | `2026-09-18` | Round 4 fixes | Canonical matching, dedup, PII |
