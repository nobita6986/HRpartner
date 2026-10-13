# THIN SLICE CAPABILITY MATRIX

Theo [`docs/HRP_EXECUTION_REALIGNMENT_PLAN.md`](../../../docs/HRP_EXECUTION_REALIGNMENT_PLAN.md) §49 (Thin Slice Capability Matrix).

**Refreshed baseline SHA:** `a87784229e8f06369082cfcd0e36ec63352dadb7` (origin/main HEAD verified 2026-10-13).
**Supersede baseline cũ:** `1059f6669482efac5b7956ef25d43996ca59d515` (2026-09-21).

Báo cáo READ-ONLY. Status dùng:
- `IMPLEMENTED_CANONICAL` — đầy đủ source + test + closed enum + read model + command gate + workbench presentation.
- `IMPLEMENTED` — code merged + test, không đầy đủ 5 tiêu chí canonical.
- `PARTIAL` — có một phần.
- `NOT_IMPLEMENTED` — chưa có.

## Ma trận hiện tại

| Capability | Status | Evidence (Source/Test) | Blocker | Dependency | Next Action |
|---|---|---|---|---|---|
| **Public JobPosting Projection** | `IMPLEMENTED` | `public-detail.service.ts`, `job-opening-posting-split`; PR #55 + #65 + #67 + #68 + #69 | None | None | Giám sát |
| **Public Apply** | `IMPLEMENTED` | `app/api/public/intake/route.ts` (AFF-03); `tier1/hrp-v6-n2-aff-03-apply-attribution` (21/09); `tier1/hrp-v6-n2-aff-03b-rls-runtime-fix` (21/09, **RLS 42501 fixed**); `tier1/hrp-v6-n2-aff-03c-cs-labor-profile-fix` (21/09) | None | LaborProfile | Giám sát |
| **LaborProfile create-or-match** | `IMPLEMENTED` | `intake-writer.service.ts`; test suite | None | Public Apply | Giám sát |
| **Application** | `IMPLEMENTED` | `application.service.ts`; `candidate_submissions` | None | LaborProfile | Giám sát |
| **PlacementCase** | `IMPLEMENTED` | `placement-case.service.ts`; test suite N3/N1 | None | Application | Giám sát |
| **NextAction** | `IMPLEMENTED_CANONICAL` | canonical 7-value enum tại [`../../src/domains/talent/recruiter-workbench.types.ts`](../../../src/domains/talent/recruiter-workbench.types.ts) (`SERVER_DERIVED_NEXT_ACTION_VALUES`: `OPEN_INTAKE`, `REQUEST_DOCS`, `SCREEN_SUBMISSION`, `SCHEDULE_SCREEN`, `AWAITING_RESULT`, `REVIEW_PLACEMENT`, `NONE`); `deriveNextAction` ở `recruiter-workbench.read-service.ts`; F-06 gate `isPlacementReadyRow` ở `recruiter-workbench.placement-actions.states.ts`; field `nextAction` trong `RecruiterWorkbenchRow` DTO; test `recruiter-workbench.derive.test.ts`; runtime assertion `assertNextActionEnumSize` đảm bảo đúng 7 giá trị | None (server-derived, không lưu DB) | PlacementCase, HandlingAssignment, Application | Giám sát |
| **HandlingAssignment** | `IMPLEMENTED` | `handling-assignment.service.ts`; W5 (`tier1/hrp-v6-w5-handling-assignment-safety`) production-verified RLS + sweep + REVOKED; AFF-05A-R1 (`t1b-aff05a-r1-canonical-initial-handling` 23/09); AFF-05A-R2 (`t1b-aff05a-r2-bounded-manager-assignment` 24/09) | None (RLS fix closed 21/09) | Application | Giám sát (AFF-05A residual Company Pool/dispute vẫn ở AFF track) |
| **Simple Workbench Query** | `IMPLEMENTED` | `labor-profile.read-service.ts`; UI P1-E1 (PR #61) | None | HandlingAssignment data | Giám sát |
| **Placement** | `IMPLEMENTED` | `placement.service.ts`, `placement.lifecycle.ts`; F0/F1 PR #58, #59, #63, #64; P1-Final closeout PR #73; SELECTED/CONFIRMED/EFFECTIVE/FAILED/CANCELLED + CLIENT_MANAGED/HRP_MANAGED | None | PlacementCase | Giám sát |
| **Public Recruiter Profile** | `NOT_IMPLEMENTED` | n/a (route microsite chưa tồn tại) | Chờ P2-B Recruiter Microsite | P2-B (Realignment Plan §35) | Hold — dependent on P2-B |
| **Universal AFF (high-level)** | `PARTIAL` | AFF-01..04 production-verified; AFF-05 PARTIAL; AFF-06/07 NOT_STARTED | AFF-05A residual + AFF-05B + AFF-06 + AFF-07 | Internal AFF contract, dependency domain, migration/security evidence | Tiếp tục theo [`docs/V6/aff_plan.md`](../../V6/aff_plan.md) §15.1 |
| &nbsp;&nbsp;&nbsp;↳ *AFF-05A residual* | `PARTIAL` | R1+R2 ACCEPTED 23-24/09; residual Company Pool/dispute CHƯA | residual scope | W5 production-verified (RLS/sweep/REVOKED) | Tiếp tục theo aff_plan.md §15.1 |
| &nbsp;&nbsp;&nbsp;↳ *AFF-05B commission* | `NOT_STARTED` | n/a | chưa có task | AFF-05A residual + M6 commission policy | Hold |

## AFF high-level denominator

Denominator high-level = **7** (AFF-01..AFF-07). Sub-items AFF-05A/AFF-05B được liệt kê làm subrow nhưng KHÔNG tính độc lập trong tổng high-level.

| High-level | Trạng thái |
|---|---|
| AFF-01 | ACCEPTED_PRODUCTION_VERIFIED |
| AFF-02 | ACCEPTED_PRODUCTION_VERIFIED |
| AFF-03 | ACCEPTED_PRODUCTION_VERIFIED |
| AFF-04 | ACCEPTED_PRODUCTION_VERIFIED |
| AFF-05 | PARTIAL (sub-items 05A/05B chưa hoàn tất) |
| AFF-06 | NOT_STARTED |
| AFF-07 | NOT_STARTED |

Tổng: 4 ACCEPTED + 1 PARTIAL + 2 NOT_STARTED = 7 (denominator).

## Delta so với baseline cũ

| Hàng | Baseline cũ (2026-09-21) | Refreshed (2026-10-13) |
|---|---|---|
| Public Apply | `PARTIAL` (RLS 42501 blocker) | `IMPLEMENTED` (RLS fix closed 21/09) |
| NextAction | `NOT_IMPLEMENTED` (sai — source đã có) | `IMPLEMENTED_CANONICAL` (7-value enum + derive + gate + DTO + test) |
| HandlingAssignment | `IMPLEMENTED` (F-1, F-2 mở) | `IMPLEMENTED` (F-1 closed 21/09, F-2 closed bởi W5) |
| Simple Workbench Query | `PARTIAL` (UI thiếu) | `IMPLEMENTED` (UI P1-E1 closeout PR #61) |
| Universal AFF | `PARTIAL` (RLS blocker) | `PARTIAL` (RLS closed; AFF-05A residual + AFF-05B/06/07) |

## Ghi chú quan trọng

- **NextAction = `IMPLEMENTED_CANONICAL`** là kết luận quan trọng nhất của refresh này. Báo cáo cũ ghi `NOT_IMPLEMENTED` là sai vì source trên main đã có đầy đủ 5 tiêu chí:
  1. Canonical enum (closed 7-value, runtime assertion).
  2. Read model derive (`deriveNextAction` trong `recruiter-workbench.read-service.ts`).
  3. Test coverage (`recruiter-workbench.derive.test.ts`).
  4. Workbench presentation (field `nextAction` trong `RecruiterWorkbenchRow` DTO).
  5. Handler/HandlingAssignment linkage (PlacementCase + HandlingAssignment integration ở F0 routes) + F1 command gate (`isPlacementReadyRow`).

- **AFF-03B RLS blocker closed** 2026-09-21 bởi `tier1/hrp-v6-n2-aff-03b-rls-runtime-fix`. Public Apply và Universal AFF không còn bị RLS chặn.

- **Universal AFF** vẫn `PARTIAL` vì:
  - AFF-05A residual Company Pool/dispute CHƯA (R1+R2 đã ACCEPTED, nhưng scope Company Pool/dispute còn lại chưa production-verified).
  - AFF-05B commission policy NOT_STARTED.
  - AFF-06 analytics NOT_STARTED.
  - AFF-07 rollout NOT_STARTED.

- **Public Recruiter Profile** phụ thuộc P2-B (V8.2 Recruiter Microsite, Realignment Plan §35) — hiện chưa mở.

## Liên kết

- Realignment Plan: [`docs/HRP_EXECUTION_REALIGNMENT_PLAN.md`](../../../docs/HRP_EXECUTION_REALIGNMENT_PLAN.md) §49
- Source evidence:
  - [`../../src/domains/talent/recruiter-workbench.types.ts`](../../../src/domains/talent/recruiter-workbench.types.ts) (SERVER_DERIVED_NEXT_ACTION_VALUES, RecruiterWorkbenchRow.nextAction)
  - [`../../src/domains/talent/recruiter-workbench.read-service.ts`](../../../src/domains/talent/recruiter-workbench.read-service.ts) (deriveNextAction, NextActionInput)
  - [`../../src/domains/talent/recruiter-workbench.placement-actions.states.ts`](../../../src/domains/talent/recruiter-workbench.placement-actions.states.ts) (isPlacementReadyRow F-06)
  - [`../../src/domains/talent/recruiter-workbench.derive.test.ts`](../../../src/domains/talent/recruiter-workbench.derive.test.ts)
  - [`docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/`](../../tasks/hrp-p1-e0-recruiter-workbench-read-model/)
  - [`docs/tasks/hrp-p1-e1-recruiter-workbench-ui/`](../../tasks/hrp-p1-e1-recruiter-workbench-ui/)
  - [`docs/tasks/hrp-p1-f0-placement-command-api/`](../../tasks/hrp-p1-f0-placement-command-api/)
  - [`docs/tasks/hrp-p1-f1-placement-action-ui/`](../../tasks/hrp-p1-f1-placement-action-ui/)
  - [`docs/tasks/hrp-p1-final-release-safety-closeout/`](../../tasks/hrp-p1-final-release-safety-closeout/)
  - [`docs/V6/aff_plan.md`](../../V6/aff_plan.md)
- Discovery đồng hành: [`./EXECUTION_REALIGNMENT_DISCOVERY.md`](./EXECUTION_REALIGNMENT_DISCOVERY.md), [`./BLOCKER_REGISTER.md`](./BLOCKER_REGISTER.md)
