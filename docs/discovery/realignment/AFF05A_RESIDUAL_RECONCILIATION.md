# AFF-05A Residual Reconciliation

**Date:** 2026-09-24
**Baseline:** `origin/main@1e1895d16500b273575599cf88853e0d48f08e23`
**Status:** `T0_REVIEWED — AFF-05A-R2 CONTRACT_DRAFTING_APPROVED`

> **T0 disposition:** Company Pool remains a derived LaborProfile projection; no new pool table is authorized. Attendance/payroll `Ticket` is not the canonical aggregate for handling disputes. Residual AFF-05A must be split into a bounded manager-assignment slice and a later dedicated LaborProfile handling-case slice.

## 1. Mục tiêu
Định vị chính xác capability nào thuộc scope AFF-05A (Handling Assignment) đã hoàn thành qua W5 và AFF-05A-R1, capability nào còn thiếu, và định hình hướng đi cho phần dư (residual) mà không tùy tiện mở rộng sang AFF-05B.

## 2. Capability Matrix (Hiện Trạng)

Sau khi khảo sát bằng CodeGraph và đối chiếu trực tiếp source code hiện hành, dưới đây là các capability thực tế:

| Capability | Trạng thái | Bằng chứng Code / Authority |
| :--- | :--- | :--- |
| **LaborProfileHandlingAssignment Model** | **ĐÃ CÓ** | `src/domains/talent/handling-assignment.service.ts` quản lý state (ACTIVE, EXPIRED, TRANSFERRED, REVOKED). Có 3 source: `AFF_INITIAL`, `MANAGER_ASSIGNMENT`, `CASE_RESOLUTION`. |
| **Initial Assignment (7 ngày)** | **ĐÃ CÓ** | `createInitialAffiliateAssignment` gắn đúng 7 ngày (`startsAt` + 7 days). |
| **Hết hạn & Expired Sweep** | **ĐÃ CÓ** | Hàm `expireElapsedHandlingAssignments` tự động quét và mark `EXPIRED` các assignment có `expiresAt <= now` trước khi thao tác mới. Local read filter (`asOf`) tự xử lý expired. |
| **Company Pool Projection** | **ĐÃ CÓ** | UI `handling-assignment-manager.tsx` hiển thị "Kho chung (Company Pool)" dựa trên derivation `!activeAssignment || isExpired`. API list (`labor-profile.read-service.ts`) hỗ trợ filter `COMPANY_POOL` thông qua câu query `none ACTIVE` hoặc `some ACTIVE expired`. (KHÔNG CẦN BẢNG CỨNG). |
| **Manager Reassignment** | **CÓ NHƯNG CHƯA ĐẠT CONTRACT** | `managerAssign` hỗ trợ chuyển giao profile, đánh dấu assignment cũ là `TRANSFERRED` và tạo history link. Tuy nhiên `days: number | null` vẫn cho phép `expiresAt = null`. |
| **Tranh chấp HandlingAssignment** | **THIẾU / LỖI** | **KHÔNG CÓ model hay API nào cho việc dispute HandlingAssignment.** `src/domains/reconciliation/dispute.service.ts` chỉ dành cho Vendor/Client Statements. Bảng `Ticket` bắt buộc `workerId` (chỉ dùng cho Worker), không thể áp dụng cho `LaborProfile` applicant. |

## 3. Khoảng trống (Gaps) và Vấn đề tồn đọng

1. **Khoảng trống AFF-OQ-12 (Manager Assignment Duration):**
   - `docs/V6/aff_plan.md` yêu cầu: *Lượt giao thủ công sau khi vào Company Pool có biên min/max cấu hình, không cho vô thời hạn*.
   - Hiện tại, `managerAssign` nhận `days: number | null`. Nếu giá trị là `null` hoặc falsy, service gán `expiresAt = null`. Điều này trái `AFF-DEC-012` về lượt giao lại có thời hạn; exact min/default/max vẫn phải được Owner đóng qua `AFF-OQ-12`.

2. **Cơ chế Dispute Tranh Chấp Trống (Missing Dispute Mechanism):**
   - Requirement gốc (AFF-05A) có đề cập việc xử lý tranh chấp khi có conflict trong quá trình xử lý profile. Tuy nhiên, toàn bộ domain Ticket / Resolution hiện nay không thể chứa entity liên kết với `LaborProfileHandlingAssignment`.

## 4. T0 disposition và thứ tự thin slice

### 4.1 AFF-05A-R2 — bounded manager assignment

- Giữ Company Pool là projection của LaborProfile không có assignment còn hiệu lực theo server clock; không tạo table/state pool mới.
- Bắt buộc mọi `MANAGER_ASSIGNMENT` có deadline hữu hạn; route và service cùng fail closed đối với `null`, zero, số âm, số không nguyên hoặc ngoài biên.
- Giữ transfer/history hiện hành và at-most-one-active DB backstop; bổ sung evidence cho concurrent manager assignment và expired-row reassignment.
- Slice này chỉ được chuyển từ `PROPOSED_ONLY` sang executable sau khi Owner đóng `AFF-OQ-12`.

**Owner decision — `RESOLVED` ngày 2026-09-24:** minimum `1` ngày, default `7` ngày, maximum `30` ngày; không auto-coerce và không cho vô thời hạn.

### 4.2 AFF-05A-R3 — dedicated handling case

- T0 chọn một aggregate chuyên biệt, tên contract-level là `LaborProfileHandlingCase`; không mở rộng model `Ticket` hiện tại.
- Lý do: `Ticket` thuộc attendance/payroll, yêu cầu `workerId`, có type/state/notification và worker self-service semantics riêng. Làm nullable `workerId` sẽ mở blast radius sang route, validation, permission, notification và các consumer không thuộc AFF-05A.
- Case mới phải gắn bắt buộc với canonical `LaborProfile`, có thể tham chiếu assignment bị tranh chấp, lưu maker/resolver, state machine và immutable resolution evidence.
- Nếu resolution tạo assignment mới, thao tác phải cùng transaction, dùng `source = CASE_RESOLUTION`, giữ attribution/history và tuân thủ duration policy đã đóng ở R2.
- Exact schema/RBAC/API/tests cần một TASK riêng sau R2; không gộp với bounded-duration migration.

## 5. Gate tiếp theo

1. T1A tạo đúng một contract `AFF-05A-R2` cho bounded manager assignment; trạng thái `PROPOSED_ONLY`, không code.
2. Contract phải pin Owner decision `1/7/30`, fail closed ở route/service và giữ Company Pool là derived projection.
3. `AFF-05A-R3` chỉ mở contract riêng sau khi R2 có contract ổn định; không mở AFF-05B trong hai slice này.
