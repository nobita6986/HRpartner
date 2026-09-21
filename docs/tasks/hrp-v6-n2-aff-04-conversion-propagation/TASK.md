# Affiliate Conversion & Propagation Contract (AFF-04)

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-n2-aff-04-conversion-propagation` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Conversion and placement propagation are security and data-integrity boundaries. Incorrect attribution leads to financial credit theft or fraud. |
| Work type | `FEATURE_EXPANSION` |
| Spec version | `v1.1` |
| Status | `PROPOSED_ONLY` |
| Planner | `Tier 1A` |
| Baseline | `0fdc616b61de731ded8b9fa7337002dc0bb00721` |
| Authority | `docs/V6/aff_plan.md` §10 và §14 (AFF-04); `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §15.1 |
| In-scope roots | `src/domains/applications/`, `src/domains/staffing/`, `prisma/` |
| Forbidden paths | Tái cấu trúc RLS policy hiện hữu; Sửa cơ chế xác thực JWT; Nới policy ngoài phạm vi schema update; `PLANNER_HANDOVER.md` |
| Required gates | `T0_CONTRACT_APPROVAL`, `TIER3_LIGHT_AUDIT`, `VERIFY_TASK`, `VERIFY_HANDOFF` |
| Next gate | `T0_CONTRACT_APPROVAL` |

## 1. Outcome

**AFF-04** mở rộng capability hiện có của quá trình ứng viên đi làm. Hiện tại, quá trình conversion (`CandidateSubmission` chuyển `QUALIFIED` → `CONVERTED`) đã tạo một `SourceClaim` dạng legacy (`ctvId`). Việc placement cũng đã kiểm tra claim hợp lệ nhưng chưa ghi vào dự án, và quá trình transfer hiện đang tạo assignment mới với `referrerId: null`.

Slice AFF-04 sẽ đảm bảo:
- Thêm quan hệ generic `referrerUserId` vào `SourceClaim` qua additive SQL migration, backfill từ `ctvId` (nếu có, không bịa cho vendor/HRP_DIRECT), và giữ legacy ID trong thời gian tương thích.
- Tự động propagate (kế thừa) generic referrer từ `SourceClaim` sang `ProjectAssignment.referrerId` khi Placement được activate.
- Tự động propagate tiếp referrer khi thực hiện Guided Transfer (chuyển NLD sang dự án mới).
- Mọi payload từ API client sẽ hoàn toàn không được truyền (hay bị lờ đi/bỏ qua) các field độc hại như `referrerId/ctvId`.
- Tất cả xử lý chuyển nguồn bắt buộc phải chạy dưới RLS hiện hành thông qua `withDbContext`, không sử dụng `SECURITY DEFINER` hoặc bypass.

## 2. Evidence

- Lịch sử mã nguồn (branch) sẽ gồm các integration, upgrade-path, preflight, orphan, clean-chain và security test (fail closed).
- Audit logic của claim sẽ lưu trữ trong outbox hoặc logs không chứa PII không cần thiết.

## 3. Decisions

- **AFF-OQ-04A: APPROVED** - Thực hiện additive SQL migration. Cụ thể: thêm `SourceClaim.referrerUserId` (FK to `User`, nullable); backfill từ `ctvId`; giữ `ctvId/vendorId` trong compatibility window; dual-write CTV path cho cả hai cột; thêm FK/relation/index cho `ProjectAssignment.referrerId`; không thay/tạo lại hai partial unique index hiện hành; migration có test clean-chain và fail closed nếu dữ liệu hỏng.
- **AFF-OQ-04B: APPROVED** - Self-referral vẫn giữ `SourceClaim` và `ProjectAssignment.referrerId` làm provenance. Việc có accepted source không tự nhiên đủ điều kiện để tính commission; không thêm field eligibility vào SourceClaim. AFF-04 tuyệt đối không tạo CommissionLedger credit. Commission sẽ để cho AFF-05B deny (fail closed). Ghi audit reason `SELF_REFERRAL` khi trùng khớp canonical identity (không suy đoán qua phone).

## 4. Contract

- **Nguồn (Provenance):** Generic AFF source lấy duy nhất từ `ReferralAttribution.referrerUserId` gắn liền canonical `LaborProfile`. Mọi snapshot trên `CandidateSubmission` đóng vai trò là evidence kiểm tra chéo (cross-check). Cột legacy `ctvId` chỉ là fallback. Vendor/HRP_DIRECT không được tự gắn thành generic referrer.
- **Quyền Hạn và RLS:** Không áp dụng phương pháp bypass RLS hoặc `SECURITY DEFINER`. `conversion.service.ts`, `assignment-placement.service.ts` và `transfer.service.ts` bắt buộc chạy trong transaction `withDbContext` thuộc context RLS hiện tại.
- **Database Index:** Tái sử dụng `one_accepted_source` và `one_accepted_source_per_submission` để ngăn chặn duplicate claim (concurrent conversion).

## 5. Execution Plan

| Step | Component | Description |
|---|---|---|
| `STEP-01` | `prisma/schema.prisma` | Additive schema migration: Add `SourceClaim.referrerUserId`, add `ProjectAssignment.referrerId` and relations/indices. |
| `STEP-02` | Migration scripts | Data backfill & validation: backfill `referrerUserId` từ `ctvId`, test upgrade/clean-chain, fail-closed for orphans. |
| `STEP-03` | `src/domains/applications/conversion.service.ts` | Update conversion: Dual-write `ctvId` và `referrerUserId`. Resolve source from `ReferralAttribution` tied to `LaborProfile` and cross-check `CandidateSubmission`. Detect `SELF_REFERRAL` by canonical identity and audit it. Prevent stealing source from existing worker. Support concurrency safely. |
| `STEP-04` | `src/domains/staffing/assignment-placement.service.ts` | Propagate placement: When activating placement, read the `SourceClaim.referrerUserId` and copy to `ProjectAssignment.referrerId`. Ensure idempotent replay keeps the same referrer. |
| `STEP-05` | `src/domains/staffing/transfer.service.ts` | Propagate transfer: Guided transfer creates new assignment but inherits `referrerId` from previous assignment (not null). |
| `STEP-06` | API Boundary & Payload | Ensure malicious payloads do not override `referrerId` / source. All processes run under `withDbContext` without expanding RLS. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Migration adds `referrerUserId` to `SourceClaim`, `referrerId` to `ProjectAssignment` and relations/indices. Upgrades/backfills fail-closed on invalid data. | Prisma schema migration script + preflight/upgrade-path test. |
| `AC-02` | Mapping generic user correctly keeps legacy `ctvId` as fallback but strictly prevents creating generic referrers for `Vendor` or `HRP_DIRECT`. | Unit tests for conversion mapping logic. |
| `AC-03` | Concurrent conversion is correctly handled by partial unique indices without failure exceptions leaking. | DB concurrency test with mock submissions. |
| `AC-04` | Conversion handles conflict with existing-worker and does not steal source. | Negative test: attempt conversion for worker that already has an accepted source. |
| `AC-05` | Direct, vendor, CTV, generic-user mappings are correctly applied. | Unit/integration tests over conversion mapping combinations. |
| `AC-06` | Self-referral produces accepted source without ledger credit, logs audit reason `SELF_REFERRAL` based on canonical identity. Audit/outbox only contains canonical IDs, no PII. | Acceptance tests on self-referral submissions. |
| `AC-07` | Placement replay is idempotent and keeps the exact same referrer; gán `referrerId` server-side. | Placement activate test with multiple invocations and verify payload strip. |
| `AC-08` | Guided transfer preserves and inherits `referrerId` from previous assignment (not null). | Transfer test flow to assert `referrerId` remains identical. |
| `AC-09` | Payload does not override source; RLS is respected via `withDbContext`, not widened. | Security tests attempting to inject `referrerId` payload and verify policy blocks. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01`, `STEP-02` | `AC-01`, `AC-02` |
| `RQ-02` | `STEP-03` | `AC-03`, `AC-04`, `AC-05` |
| `RQ-03` | `STEP-03` | `AC-06` |
| `RQ-04` | `STEP-04`, `STEP-05` | `AC-07`, `AC-08` |
| `RQ-05` | `STEP-03`, `STEP-04`, `STEP-05`, `STEP-06` | `AC-09` |

## 7. Risk

- Sai sót trong data backfill hoặc partial index có thể gây đứt quãng quá trình CandidateSubmission `QUALIFIED` → `CONVERTED`.
- Rò rỉ bảo mật RLS nếu developer bypass service layer thay vì tuân thủ `withDbContext`.

## 8. Open Questions

- None

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | `REVISION_REQUIRED` | T0 feedback: pin baseline, fix QUALIFIED->CONVERTED state, bỏ SECURITY_DEFINER, sửa file path (transfer.service.ts). |
| 2 | `PENDING T0` | Cập nhật cấu trúc TASK v1.1. Thêm STEP và AC coverage đầy đủ. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-22` | Initial draft | Proposal slice AFF-04 |
| `v1.1` | `2026-09-22` | Revision following T0 | Added template structure, fixed states and path scopes, applied T0 decisions. |
