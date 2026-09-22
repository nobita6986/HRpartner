# Affiliate Conversion & Propagation Contract (AFF-04)

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-n2-aff-04-conversion-propagation` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Conversion and placement propagation are security and data-integrity boundaries. Incorrect attribution leads to financial credit theft or fraud. |
| Work type | `FEATURE_EXPANSION` |
| Spec version | `v1.3` |
| Status | `REVISION_REQUIRED` |
| Planner | `Tier 1A` |
| Baseline | `0fdc616b61de731ded8b9fa7337002dc0bb00721` |
| Authority | `docs/V6/aff_plan.md` §10 và §14 (AFF-04); `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §15.1 |
| In-scope roots | `src/domains/applications/`, `src/domains/staffing/`, `app/api/staffing/transfers/`, `prisma/` |
| Forbidden paths | Mọi file commission production, authentication, global RLS policy, `PLANNER_HANDOVER.md` |
| Required gates | `T0_CONTRACT_APPROVAL`, `TIER3_LIGHT_AUDIT`, `VERIFY_TASK`, `VERIFY_HANDOFF` |
| Next gate | `T0_CONTRACT_REVIEW_AFTER_ER002` |

## 1. Outcome

AFF-04 mở rộng capability hiện hành của quá trình conversion. Sự kiện CandidateSubmission chuyển từ `QUALIFIED` → `CONVERTED` đã tạo accepted legacy `SourceClaim`. Placement chưa tự động ghi referrer vào dự án, và transfer đang tạo assignment mới với `referrerId: null`.

Slice AFF-04 sẽ hoàn thiện chuỗi (traceability chain) bằng cách:
- Cập nhật schema `SourceClaim` và `ProjectAssignment` (tạo/kết nối explicit named relations tới `User`).
- Backfill generic referrer có chọn lọc (chỉ cho legacy claim `CTV_REFERRAL`).
- Xử lý các luồng Source Resolution Matrix khi conversion.
- Propagate nullable referrer qua các Placement và Transfer, bao gồm việc snapshot beneficiary ứng viên từ `LaborProfileHandlingAssignment`.
- Áp dụng nghiêm ngặt API input boundary không phụ thuộc vào generic validation framework.

## 2. Evidence

- **Nguồn hiện tại (Source Evidence)**:
  - `src/domains/applications/conversion.service.ts`: Tạo accepted `SourceClaim` hiện hành và xử lý conflict.
  - `src/domains/staffing/assignment-placement.service.ts`: Lookup claim và insert assignment (thiếu `referrerId`).
  - `src/domains/staffing/transfer.service.ts`: Ghi hard-code `referrerId: null`.
  - `app/api/staffing/transfers/route.ts`: Đang cast raw JSON thành `TransferWorkerInput`, body truyền đi bao gồm toàn bộ raw payload.
  - `src/domains/applications/intake-writer.service.ts`: Binds attribution vào LaborProfile và chuyển `CONSUMED`.
  - Migrations hiện có 2 partial unique index `one_accepted_source` và `one_accepted_source_per_submission`.
- **Evidence bắt buộc sinh (Executor Evidence)**:
  - GitHub Integration Job verify clean-chain `prisma migrate deploy` trên PostgreSQL ephemeral.
  - Lệnh test preflight custom `vitest run src/domains/staffing/aff-04-upgrade-path.test.ts` (một harness mới để fail-closed các trường hợp mâu thuẫn migration/provenance orphan).
  - Lệnh chạy concurrent integrations tests chứng minh không steal source và idempotent handling.

## 3. Decisions

- **AFF-OQ-04A: APPROVED** - Migration/Backfill Scope:
  - `SourceClaim`: thêm nullable `referrerUserId`, explicit named Prisma relation (ví dụ `@relation("SourceClaimGenericReferrer", ...)`), `FK ON DELETE RESTRICT`, index. Giữ nguyên relation `ctvId` (ví dụ `@relation("SourceClaimLegacyCtv", ...)`). Cập nhật back-relations tương ứng phía `User`.
  - `ProjectAssignment`: `referrerId` đã tồn tại, chỉ thêm named relation (`@relation("AssignmentReferrer", ...)`), `FK ON DELETE RESTRICT`, index và back-relation bên `User`.
  - Backfill `SourceClaim.referrerUserId = ctvId` CHỈ cho các claim có phân loại `CTV_REFERRAL` và `ctvId IS NOT NULL`.
  - `Vendor`/`HRP_DIRECT` giữ `null` cho `referrerUserId`.
  - Preflight fail-closed cho provenance mâu thuẫn hoặc `project_assignments.referrer_id IS NOT NULL` là orphan. Không sửa/tạo lại 2 partial unique indexes hiện tại.
- **AFF-OQ-04B: APPROVED** - Self-referral provenance:
  - Chỉ classify `SELF_REFERRAL` khi `Worker.accountUserId` non-null và bằng `referrerUserId`. Nếu chưa có link: `UNKNOWN_NOT_PROVEN` (không tự suy luận qua name/phone). Tuyệt đối không sinh CommissionLedger ở mọi AFF-04 path. AFF-05B sẽ xử lý điều kiện hưởng.

## 4. Contract

- **Quyền Hạn và RLS:** Mọi luồng bắt buộc chạy trong transaction `withDbContext` dưới RLS hiện hành; không nới policy ngoài migration delta.
- **Source Resolution Matrix (Conversion):**
  - Có `ReferralAttribution` gắn canonical `LaborProfile` và status `CONSUMED`: dùng `referrerUserId`.
  - Có snapshot `ctvId` khác với generic source: `SOURCE_PROVENANCE_CONFLICT`.
  - Attribution tồn tại nhưng state không hợp lệ: fail typed (không silently downgrade).
  - Không có attribution + có `ctvId`: legacy fallback.
  - Vendor/HRP_DIRECT: generic referrer `null`.
- **Existing Worker & Conversion Replay:**
  - Lookup canonical accepted claim theo `workerId` (không giới hạn trong submission hiện tại).
  - Accepted claim cùng `referrerUserId`: reuse claim (CONVERTED replay của submission mới trả đúng `sourceClaimId`, không báo `CONVERSION_INVARIANT_BROKEN`).
  - Accepted claim khác source: typed conflict, không steal/overwrite.
- **Idempotency vs Duplicate Request:**
  - Cùng idempotency key + cùng payload: trả stored success với `replayed=true`, không tạo assignment/counter/audit/outbox. Existing assignment/referrer không đổi.
  - Key mới/không replay khi assignment của submission đã tồn tại: trả typed `ASSIGNMENT_EXISTS`, không sinh side effect. (Hai flow này đo đạc riêng).
- **Transfer Compatibility Matrix:**
  - Sau worker lock, re-read canonical accepted worker-level claim.
  - Có generic referrer: assignment mới inherit referrer.
  - Direct/vendor (accepted claim có referrer null): assignment mới `null`.
  - Legacy worker không có accepted claim: tiếp tục transfer, `referrerId: null`, audit `resolutionMode=LEGACY_NO_ACCEPTED_CLAIM`.
  - Có claim conflict hoặc old assignment có non-null referrer khác canonical claim: typed conflict. Không suy luận qua phone/request body.
- **Placement Invariant (§10.2):**
  - Trong cùng placement transaction phải đọc `LaborProfileHandlingAssignment` `ACTIVE`, chưa hết hạn (theo server time), và assignee user `ACTIVE`.
  - Ghi audit/outbox: `handlingAssignmentId`, `beneficiaryCandidateUserId` (nullable), và `resolutionMode`.
  - Nếu ở Company Pool / no active assignment → candidate `null`, ghi mode phù hợp.
  - Nếu Inactive assignee → candidate `null`, mode `INACTIVE_REQUIRES_CASE_RESOLUTION` (không tự chuyển). `ProjectAssignment.referrerId` vẫn giữ provenance. Không tạo ledger credit.
- **API Boundary:**
  - `app/api/staffing/transfers/route.ts` và mọi entry point phải construct object allowlist cho từng single/bulk item trước khi tính idempotency fingerprint và gọi service.
  - Các trường như `referrerId`, `referrerUserId`, `ctvId`, `vendorId`, `beneficiaryUserId`, `assigneeUserId` và unknown fields tuyệt đối không flow vào service và không ảnh hưởng fingerprint. Convert/placement đang verify-only. Không dùng generic validation.

## 5. Execution Plan

| Step | Component | Description |
|---|---|---|
| `STEP-01` | `prisma/schema.prisma` và `migrations/` | Tạo explicit named relations cho `referrerUserId`, `ctvId`, `referrerId`. Viết DB migration & backfill CHỈ cho `CTV_REFERRAL`. Tạo AFF-04 upgrade-path test. |
| `STEP-02` | `conversion.service.ts` & `intake-writer.service.ts` (nếu cần) | Áp dụng Source Resolution Matrix, rule Lookup Canonical Claim theo `workerId`. Handle replay vs conflict. Update application-queue project nếu cần thiết. |
| `STEP-03` | `assignment-placement.service.ts` | Ghi nullable `referrerId` cho assignment. Xử lý HandlingAssignment active status để snapshot beneficiary (outbox-only, không credit). Differentiate Idempotency replay vs Duplicate request. |
| `STEP-04` | `transfer.service.ts` & `app/api/staffing/transfers/route.ts` | Áp dụng Transfer Compatibility Matrix (nhận inherit hoặc `null`). Fix strict object allowlist trong route constructor trước khi gọi service/fingerprint. |
| `STEP-05` | Allowlist Evidence Tests | Viết unit/integration cho từng boundary (concurrent conversion, transfer compatibility, idempotency replay, beneficiary snapshot). |

## 6. Acceptance

### 6.1 Requirements List

| RQ | Description |
|---|---|
| `RQ-01` | Migration Schema & Exact Backfill |
| `RQ-02` | Conversion Source Resolution & Existing Worker Rules |
| `RQ-03` | Idempotency vs Duplicate Placement & Placement Invariant |
| `RQ-04` | Transfer Compatibility & API Object Boundary |

### 6.2 Acceptance Criteria & Verification

| AC | Requirement | Pass condition | Verification method |
|---|---|---|---|
| `AC-01` | `RQ-01` | Prisma relations/indexes hợp lệ, không ambiguous, migration clean-chain PASS trên DB ephemeral, orphan preflight fail closed. | `npx prisma validate`, và Github Integration Job cho `prisma migrate deploy` |
| `AC-02` | `RQ-01` | Dữ liệu preflight/backfill upgrade hoạt động chính xác: chỉ backfill `CTV_REFERRAL`, giữ Vendor/Direct null. | `vitest run src/domains/staffing/aff-04-upgrade-path.test.ts` |
| `AC-03` | `RQ-02` | Matrix phân giải nguồn chuẩn xác, re-use canonical claim qua `workerId` khi conversion, conflict trả typed error, không overwrite/steal. | `vitest run src/domains/applications/conversion.service.test.ts` |
| `AC-04` | `RQ-02` | Nhiều conversion cùng lúc (concurrent PostgreSQL test với 2 connection thật) được quản lý qua partial indices không leak lỗi. | `vitest run src/domains/applications/conversion.concurrent.test.ts` |
| `AC-05` | `RQ-03` | Idempotency replay trả stored success `replayed=true`; Duplicate request khác key/không phải replay trả `ASSIGNMENT_EXISTS`. Xử lý beneficiary snapshot đúng. | `vitest run src/domains/staffing/assignment-placement.service.test.ts` |
| `AC-06` | `RQ-04` | Guided transfer xử lý đúng legacy/vendor/inherit/conflict theo compatibility matrix; Transfer route API filter chặn 100% malicious/unknown fields. | `vitest run src/domains/staffing/transfer.service.test.ts` và route API test. |
| `AC-07` | Toàn bộ | Toàn bộ checks: Typecheck, lint, build, integration, và diff scope chỉ giới hạn ở baseline `0fdc616b61de731ded8b9fa7337002dc0bb00721`. | `npm run typecheck && npm run lint && vitest run --config vitest.unit.config.ts && vitest run --config vitest.integration.config.ts && npm run build` và `git diff --check 0fdc616b61de731ded8b9fa7337002dc0bb00721..HEAD` |
| `AC-08` | Toàn bộ | verify-task.ps1 PASS, utf-8 check chuẩn, diff nằm gọn trong allowlist. | `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath docs/tasks/hrp-v6-n2-aff-04-conversion-propagation/TASK.md` và `verify-handoff.ps1` |

### 6.3 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-02`, `AC-07`, `AC-08` |
| `RQ-02` | `STEP-02` | `AC-03`, `AC-04`, `AC-07`, `AC-08` |
| `RQ-03` | `STEP-03` | `AC-05`, `AC-07`, `AC-08` |
| `RQ-04` | `STEP-04`, `STEP-05` | `AC-06`, `AC-07`, `AC-08` |

## 7. Risk

- Sai sót trong migration khi source claim type không đồng bộ có thể dẫn đến backfill nhầm (Mitigation: strict upgrade-path harness kiểm tra điều kiện).
- Transfer compatibility gặp legacy assignment đã bị chèn tay `referrerId` không trùng sẽ fail toàn hệ thống (Mitigation: matrix xử lý legacy conflict rõ ràng).

## 8. Open Questions

- None

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | `REVISION_REQUIRED` | T0 feedback: pin baseline, fix QUALIFIED->CONVERTED state, bỏ SECURITY_DEFINER, sửa file path. |
| 2 | `REVISION_REQUIRED` | T0 feedback: update migration strict bounds, source resolution matrix, lock behaviour, api allowlist rules. |
| 3 | `REVISION_REQUIRED` | T0 feedback (v1.3): Route regression, explicit valid AC commands, selective backfill CTV_REFERRAL, placement invariant beneficiary snapshot, explicit Prisma names. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-22` | Initial draft | Proposal slice AFF-04 |
| `v1.1` | `2026-09-22` | Revision following T0 (r2) | Added template structure, fixed states and path scopes, applied T0 decisions. |
| `v1.2` | `2026-09-22` | Revision following T0 (r3) | Fixed migration bounds, source resolution matrix, exact file bounds, test commands. |
| `v1.3` | `2026-09-22` | Semantic correction (v1.3) | Addressed explicit API bounds, selective legacy backfill, Prisma constraints, replay/placement rules, precise verification harnesses. |
