# Affiliate Conversion & Propagation Contract (AFF-04)

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-n2-aff-04-conversion-propagation` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Conversion and placement propagation are security and data-integrity boundaries. Incorrect attribution leads to financial credit theft or fraud. |
| Spec version | `v1.0` |
| Status | `PROPOSED_ONLY` |
| Planner | `Tier 1A` |
| Baseline | `origin/main` |
| Authority | `docs/V6/aff_plan.md` §10 và §14 (AFF-04); `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §15.1 |
| Next gate | `T0_CONTRACT_APPROVAL` |

## 1. Outcome and changed surface

This slice (AFF-04) ensures that when a candidate converts and is placed into a project, the original valid referrer is immutably preserved as an accepted generic `SourceClaim` and propagated to `ProjectAssignment.referrerId`. It bridges the gap between attribution (AFF-02/03) and the commission ledger (AFF-05).

**Changed surface:**
- **Conversion Service:** Updates conversion logic to read `ReferralAttribution`/submission snapshot and create an accepted `SourceClaim` linked to a generic `User` (not just legacy `ctvId`).
- **Placement/Assignment Propagation:** When a `Placement` becomes `EFFECTIVE` (or when `ProjectAssignment` is created), `ProjectAssignment.referrerId` is populated **server-side** by reading the unique accepted `SourceClaim` of the worker.
- **Client/API boundary:** Removes any ability for clients to pass `referrerId` or `ctvId` in placement/assignment creation payloads.

## 2. Requirements and Acceptance Criteria (AC)

### Propagation Semantics (S-01)
- **AC-01**: Khi LaborProfile chuyển sang CONVERTED (tạo Worker), hệ thống phải đọc snapshot nguồn từ submission hợp lệ và tự động tạo một `SourceClaim` với trạng thái `accepted = true`.
- **AC-02**: Quá trình tạo `SourceClaim` phải idempotent, nằm trong cùng transaction với việc tạo `Worker`. Nếu Worker đã có nguồn accepted khác, transaction phải giữ nguồn cũ (không silently steal source) và ghi audit log.
- **AC-03**: Self-referral (người dùng tự click link của chính mình rồi xin việc) vẫn tạo `SourceClaim` để giữ lịch sử, nhưng phải bị đánh dấu ineligible ở cấp độ policy (chặn ở AFF-05) hoặc chặn propagate. Trong scope AFF-04, `SourceClaim` vẫn được tạo nhưng đánh dấu rõ provenance.

### Server-Derived Authority (S-02)
- **AC-04**: Việc tạo `ProjectAssignment` phải tự động resolve `referrerId` từ `SourceClaim` accepted duy nhất của Worker. API payload không được phép chứa `referrerId` hoặc `ctvId`. Bất kỳ request nào truyền field này từ client sẽ bị loại bỏ (stripped) hoặc reject.
- **AC-05**: Khi NLD chuyển dự án (transfer), `ProjectAssignment` mới tiếp tục thừa kế cùng `referrerId` từ `SourceClaim` gốc. Cấm ghi đè nguồn theo dự án đích.

### RLS and Authorization Boundary (S-03)
- **AC-06**: Quá trình conversion và placement chỉ được thực hiện bởi HR/Admin role theo RLS hiện hữu. Quá trình đọc/tạo `SourceClaim` và gán `referrerId` diễn ra dưới quyền server (SECURITY DEFINER hoặc bypassing service layer), applicant/referrer không có quyền can thiệp.

## 3. Data model and Migration (M)

- **Migration**: Schema `SourceClaim` cần hỗ trợ liên kết generic với `User` (hiện tại chỉ có `ctvId` và `vendorId`). Cần tạo field mới `referrerUserId` (nullable) và ánh xạ backfill nếu cần. Tuy nhiên, nếu Schema hiện tại không cho phép, cần một Additive Migration an toàn để không làm hỏng dữ liệu CTV/Vendor cũ.
- **Data integrity**: Ràng buộc duy nhất: Một `Worker` chỉ có tối đa một `SourceClaim` với `accepted = true`.

## 4. Integration and Upgrade Path

- Legacy CTV/Vendor flow phải tiếp tục hoạt động trong thời gian tương thích.
- Không drop cột `ctvId` trong foundation này.

## 5. Security and Abuse Model

| Risk | Control |
|---|---|
| Client override referrer | API DTO chặn/strip input; Server luôn resolve từ `SourceClaim`. |
| Concurrent conversion race | Giao dịch nguyên tử; constraint `(workerId, accepted)` duy nhất. |
| Self-referral fraud | Record provenance accurately; commission policy (AFF-05) will deny payout based on identical User identities. |

## 6. Implementation Constraints (C)

- **C-01**: Cấm thay đổi cơ chế đăng nhập (JWT/Auth).
- **C-02**: Không sửa file PLANNER_HANDOVER.md.
- **C-03**: Phải dùng transaction bảo vệ conversion, không tạo partial data.

## 7. Open Decisions / OWNER_DECISION_REQUIRED

| Issue | Status | Note |
|---|---|---|
| `AFF-OQ-04A`: Ràng buộc Schema của `SourceClaim` | `OWNER_DECISION_REQUIRED` | Hiện tại schema `SourceClaim` đang dùng `ctvId` và `vendorId`. Việc add `referrerUserId` (FK to `User`) có cần migration SQL riêng ở scope AFF-04 không? |
| `AFF-OQ-04B`: Self-referral behavior | `OPEN` | `SourceClaim` cho tự giới thiệu được đánh dấu `accepted = true` nhưng có field `ineligibleForCommission` không, hay để AFF-05 ledger tự lọc? Đề xuất: Để ledger (AFF-05) quyết định payout, AFF-04 chỉ giữ nguyên lịch sử khách quan. |

## 8. File Allowlist

- `src/domains/conversion/conversion.service.ts`
- `src/domains/assignment/assignment-placement.service.ts`
- `src/domains/assignment/assignment-api.schema.ts` (để chặn input referrer từ client)
- DTOs và Integration tests liên quan đến Conversion & Placement.
*(Không bao gồm schema/migration trừ khi T0 quyết định OQ-04A)*

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | PENDING T0 | Vừa draft AFF-04 thin-slice contract. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-22` | Initial draft | AFF-04 proposal based on `aff_plan.md` §10. |
