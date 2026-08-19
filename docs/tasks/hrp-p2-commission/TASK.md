# TASK: hrp-p2-commission

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p2-commission` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | Tier 1 — Planner (Product & Architecture Decision Owner) |
| Executor | Tier 2 (agent ngoài — sếp giao qua Cursor: `/code hrp-p2-commission`) |
| Auditor | Tier 3 (independent context) |
| Baseline | `HEAD` của `main` (sau khi hoàn thành `hrp-p1-portals` - Round 4 ACCEPTED) |
| Modules | P2 — Commission (Group policy + individual override + ledger) |
| ADR references | ADR-010 (Tiền BigInt), ADR-013 (Record khóa là bất biến), V4.13 G21-B14 (Nợ hoa hồng & netting) |
| Current execution round | 1 |
| Current audit round | 0 |
| Next gate | `/code hrp-p2-commission` |
| Updated | 2026-08-19 08:25 ICT |

## 1. Outcome

### User-visible outcome

- **Admin/Giám đốc (ROOT/DIRECTOR):** Có giao diện để tạo và cấu hình các chính sách hoa hồng (`commission_policies`) theo các mốc thời gian (vd: RETAINED_30_DAYS), quy định số tiền thưởng cố định (PER_HEAD_MILESTONE), có version và hiệu lực theo thời gian.
- **Hệ thống (Cron/Worker):** Tự động sinh ra các dòng hoa hồng dự kiến (CREDIT - PENDING) vào sổ cái (Ledger) dựa trên chính sách và tình trạng làm việc của người lao động.
- **Kế toán:** Xem sổ cái hoa hồng, duyệt (APPROVED) và chi trả (PAID). Hệ thống hỗ trợ xử lý việc trả hớ bằng dòng đảo (REVERSAL). Nợ hoa hồng tự cấn trừ (netting) vào các kỳ tiếp theo.
- **CTV/Referrer:** Cập nhật Dashboard xem số dư khả dụng, lịch sử hoa hồng (được duyệt, bị thu hồi) và nợ hoa hồng nếu có.

### Non-goals

- Không làm module Tính lương (Payroll/Payslip) - thuộc P3.
- Không tích hợp cổng thanh toán trực tiếp (chỉ ghi nhận trạng thái PAID).
- Không sửa luồng duyệt CandidateSubmission/SourceClaim (đã có ở P1).

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `docs/PHASE_KHOAHOC_V1.md:245-254` | P2 cần Group policy, individual override, ledger reversal chuẩn, permission `CAN_OVERRIDE_INDIVIDUAL_COMMISSION`. | Định hình scope chính cho P2. |
| `EV-02` | `docs/UNIFIED_PLAN_v4.md:1839-1880` | Lược đồ bảng `commission_policies`, `commission_ledger`. Quy định dòng đảo (reversal), clawback nightly cron tự động sinh REVERSAL, và cơ chế cấn trừ nợ hoa hồng (netting). | Thiết kế DB schema và quy tắc state machine. |
| `EV-03` | `docs/UNIFIED_PLAN_v4.md:2300` | Feature flag `COMMISSION_NETTING_ENABLED` = true (V4.13 G21-B14) | Cần cấu hình rule cấn trừ. |
| `EV-04` | `prisma/schema.prisma` | Đã có role `DIRECTOR`, `ACCOUNTANT`, `CTV`, bảng `users`, `workers`, `project_assignments`, `source_claims` | Các bảng liên kết đã sẵn sàng, cần thêm DDL mới cho hoa hồng. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Thêm bảng `commission_policies`, `commission_ledger`, `commission_debts` (để theo dõi nợ rõ ràng theo V4.13 G21-B14) vào `schema.prisma`. | Planner (từ EV-02) | Hiệu lực cả task |
| `DEC-02` | CHOSEN | Dữ liệu tài chính (giá trị hoa hồng, số dư, nợ) bắt buộc dùng kiểu `BigInt` (VND nguyên) theo ADR-010. | Planner | Hiệu lực cả task |
| `DEC-03` | CHOSEN | Sổ cái `commission_ledger` không sử dụng UNIQUE cho (ctv_id, worker_id, month, year) để cho phép nhiều milestone và dòng điều chỉnh (reversal) theo ADR-013. | Planner (từ EV-02) | Hiệu lực cả task |
| `DEC-04` | CHOSEN | Bật `commission: true` trong file config / DB feature flags cho môi trường dev. | Planner | Hiệu lực cả task |
| `DEC-05` | CHOSEN | Clawback Nightly Cron: Không tự trừ tiền (cấm sửa dòng đã PAID), chỉ tự sinh dòng REVERSAL trạng thái PENDING chờ kế toán duyệt. | Planner | Hiệu lực cả task |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Schema cho Commission: `commission_policies` (id, name, calc_type, value, conditions, effective_from, effective_to, version, created_at), `commission_ledger` (id, ctv_id, worker_id, assignment_id, policy_id, milestone, amount, direction, reversal_of, month, year, status, created_by, created_at), `commission_debts` (id, ctv_id, amount_vnd, status, created_at). | Must | EV-02 | Prisma schema validation fail |
| `RQ-02` | API & Logic CRUD cho Policy: Chỉ ROOT / DIRECTOR được tạo/sửa `commission_policies`. Sử dụng versioning khi update. | Must | EV-02 | 403 Forbidden nếu sai role |
| `RQ-03` | API & Logic tính hoa hồng (Milestone Trigger): Endpoint hoặc cron tạo dòng `commission_ledger` (direction=CREDIT, status=PENDING) khi điều kiện milestone đạt. Bọc `Idempotency-Key` / kiểm tra trùng lặp để không tạo đúp. | Must | EV-02 | Tạo đúp / Lỗi logic |
| `RQ-04` | Kế toán duyệt (APPROVED/PAID) và Hủy (REJECTED) dòng Ledger. Có lưu audit log. | Must | EV-02 | State transition error (409) |
| `RQ-05` | Clawback & Netting: Xử lý dòng REVERSAL. Khi duyệt REVERSAL, nếu vượt số dư khả dụng → tạo `commission_debt`. Có hàm cấn trừ (netting) khoản CREDIT mới với `commission_debt` (trừ nợ trước khi APPROVED thành PAID). | Must | EV-02, EV-03 | Quỹ âm ngầm / Lỗi logic cấn trừ |
| `RQ-06` | UI Admin (Next.js): Màn hình danh sách/chi tiết Policy, Màn hình Ledger cho Kế toán (DataTable + Filters). | Must | EV-01 | UI lỗi / Không hiển thị |
| `RQ-07` | UI CTV: Dashboard bổ sung thông tin số dư hoa hồng (đã duyệt), nợ hoa hồng, lịch sử Ledger của chính CTV đó. | Must | EV-01 | UI lỗi / Rò rỉ dữ liệu (RLS) |
| `RQ-08` | Test: Golden tests tích hợp luồng: Tạo policy → Sinh CREDIT → Duyệt → Sinh REVERSAL (vượt số dư) → Sinh Nợ → Sinh CREDIT mới → Tự động cấn trừ Nợ. | Must | Planner | Test fail / Thiếu coverage |

### 4.2 Scope boundaries

**In scope:**
- Schema additions (`schema.prisma` và migration scripts).
- Logic Backend + Background Cron stub (API endpoint) cho Commission Engine.
- UI Admin cho Commission (Policies, Ledger).
- Cập nhật UI CTV Dashboard cho phần hoa hồng.

**Out of scope:**
- Payroll cho Worker (Phase 3).
- Cổng thanh toán (Bank transfer integration).

### 4.3 Data, State, Permission và Interface Rules

- **Data:** Mọi field tiền tệ (`value`, `amount`, `amount_vnd`) là `BigInt` mapping tới `BigInt` TypeScript.
- **State:** Ledger status transition: `PENDING` → `APPROVED` → `PAID`. (REJECTED chỉ từ PENDING). Không quay lui.
- **Permission:** 
  - `commission_policies`: WRITE (ROOT, DIRECTOR), READ (ADMIN, HR_MANAGER, ACCOUNTANT).
  - `commission_ledger`: WRITE/APPROVE (ACCOUNTANT, ADMIN), READ (chỉ đọc của mình đối với CTV).
- **Interface:** Dùng shared components (DataTable, Card, SlideOutDrawer) đã có ở P1.
- **Idempotency:** Bắt buộc áp dụng cho các hành động thay đổi Ledger trạng thái / sinh REVERSAL.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-01` | `prisma/schema.prisma` | Khai báo 3 models: `CommissionPolicy`, `CommissionLedger`, `CommissionDebt`. Generate migration. | Phase 0 DB baseline | `prisma migrate dev` exit 0 | Lỗi Prisma validate |
| `STEP-02` | `RQ-02` | `app/api/admin/commission-policies/` | API CRUD cho Policy với logic versioning. Áp dụng `requirePermission` / `withAuthScope`. | `STEP-01` | Gọi POST trả về 201, PATCH tạo bản ghi version mới |
| `STEP-03` | `RQ-03` | `src/domains/commission/` | Viết service `CommissionEngine` hàm `evaluateMilestones` và `createCredit` an toàn idempotency. | `STEP-01` | Unit/Integration test hàm logic |
| `STEP-04` | `RQ-04, RQ-05` | `src/domains/commission/` | Viết logic duyệt Ledger (Approve, Pay) và logic Clawback (sinh REVERSAL), logic Netting (tạo Debt, cấn trừ). | `STEP-03` | Golden test luồng cấn trừ xanh |
| `STEP-05` | `RQ-06, RQ-07` | `app/(portal)/` | UI Admin (Quản lý Policy, Duyệt Ledger) + UI CTV (Xem số dư, Lịch sử Ledger, Nợ). | Shared UI components | Run UI local kiểm tra render | Build lỗi / Hydration lỗi |
| `STEP-06` | `RQ-08` | `tests/e2e/commission` | Tích hợp E2E E2E (hoặc API Integration) toàn bộ vòng đời hoa hồng. | `STEP-05` | `npx vitest run` exit 0 | Test fail |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | Schema hợp lệ và migrate thành công | `npx prisma migrate dev` | Command exit 0 | Yes |
| `AC-02` | `RQ-02` | Chỉ ROOT/DIRECTOR tạo/sửa Policy được. Sửa tạo version mới (không ghi đè). | Gọi API bằng token HR vs DIRECTOR | Log output check API | Yes |
| `AC-03` | `RQ-03` | Hệ thống sinh đúng dòng CREDIT PENDING khi trigger mốc, chống trùng lặp. | Trigger API logic nhiều lần | DB query check đúng 1 dòng | Yes |
| `AC-04` | `RQ-04` | Kế toán duyệt/trả tiền thành công, trạng thái khóa lại. | API / Test | DB check state | Yes |
| `AC-05` | `RQ-05` | Luồng Netting: Trả REVERSAL vượt số dư -> có dòng Debt. Credit tiếp theo -> bị trừ Debt, Debt về 0 (hoặc giảm). | Integration Golden Test | `vitest` output xanh luồng này | Yes |
| `AC-06` | `RQ-06, RQ-07` | Build UI thành công, không lỗi type, hiển thị đúng role. | `npm run build` | Build exit 0 | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| RQ-01 | STEP-01 | AC-01 |
| RQ-02 | STEP-02 | AC-02 |
| RQ-03 | STEP-03 | AC-03 |
| RQ-04 | STEP-04 | AC-04 |
| RQ-05 | STEP-04 | AC-05 |
| RQ-06 | STEP-05 | AC-06 |
| RQ-07 | STEP-05 | AC-06 |
| RQ-08 | STEP-06 | AC-05, AC-06 |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Tranh chấp dữ liệu (Race condition) khi nhiều REVERSAL và CREDIT cùng cấn trừ Nợ. | Chạy netting đồng thời | Sử dụng transaction Postgres + SELECT FOR UPDATE (Advisory Lock nếu cần) trên số dư nợ của CTV. | Phục hồi lại dữ liệu trước phiên netting |
| `RISK-02` | Lỗi convert BigInt trên UI (JSON.stringify) | UI hiện trắng, lỗi console | Sử dụng helper `BigInt` serializer hoặc truyền chuỗi từ API. | Revert commit, vá helper |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | UI Dashboard CTV hiển thị nợ hoa hồng chi tiết đến mức nào (tổng nợ hay từng dòng cấn trừ)? (Mặc định: Hiển thị tổng nợ và lịch sử trừ). | Sếp | Trước Handoff | No |

## 9. Planner Resolution

Tier 1 append quyết định sau audit; không sửa lịch sử finding.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| (Chưa audit) | | | | | |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | 2026-08-19 | Tạo contract ban đầu cho P2 Commission | Yêu cầu triển khai tiếp roadmap sau khi P1 ACCEPTED |

