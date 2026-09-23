# Affiliate Conversion & Propagation Contract (AFF-04)

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-n2-aff-04-conversion-propagation` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Conversion and placement propagation are security and data-integrity boundaries. Incorrect attribution leads to financial credit theft or fraud. |
| Work type | `FEATURE_EXPANSION` |
| Spec version | `v1.6` |
| Status | `READY_FOR_AUDIT` |
| Planner | `Tier 1B` |
| Baseline | `9e527a13e74c8361feea77b8edca522c8c37ec08` (origin/main @ 2026-09-23; includes ER-002 #32 and AFF-05A R1 #33). Contract Survey baseline `0fdc616b` retained only as historical reference. |
| Authority | `docs/V6/aff_plan.md` §10 và §14 (AFF-04); `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §15.1 |
| In-scope roots | Theo Exact File Allowlist |
| Forbidden paths | Bất kỳ file nào ngoài Exact File Allowlist; đặc biệt cấm: commission production, authentication, global RLS, `PLANNER_HANDOVER.md` |
| Required gates | `T0_CONTRACT_APPROVAL`, `TIER3_LIGHT_AUDIT`, `VERIFY_TASK`, `VERIFY_HANDOFF` |
| Next gate | `TIER3_LIGHT_AUDIT` |
| Current execution round | `1` |
| Current audit round | `0` |
| Frozen implementation SHA | `f01ee3513d2c1ce6a57f0e1e25860bf238ec1374` (HEAD = `f01ee35`) |

## 1. Outcome

AFF-04 mở rộng capability hiện hành của quá trình conversion. Sự kiện CandidateSubmission chuyển từ `QUALIFIED` → `CONVERTED` đã tạo accepted legacy `SourceClaim`. Placement chưa tự động ghi referrer vào dự án, và transfer đang tạo assignment mới với `referrerId: null`.

Slice AFF-04 sẽ hoàn thiện chuỗi traceability bằng cách:
- Cập nhật schema `SourceClaim` và `ProjectAssignment` (tạo explicit named relations tới `User`).
- Backfill generic referrer có chọn lọc (CHỈ áp dụng cho legacy claim `CTV_REFERRAL` có `ctvId`).
- Xử lý các luồng Source Resolution Matrix khi conversion.
- Propagate nullable referrer qua các Placement và Transfer, kết hợp snapshot beneficiary ứng viên từ `LaborProfileHandlingAssignment`.
- Áp dụng nghiêm ngặt API input boundary (cấm extra keys) qua exact allowlist constructor trên route.

## 2. Evidence

- **Nguồn hiện tại (Source Evidence)**:
  - `src/domains/applications/aff03-public-intake.service.ts`: Nguồn lookup và consume `ReferralAttribution`.
  - `src/domains/applications/conversion.service.ts`: Tạo accepted `SourceClaim` hiện hành và xử lý conflict.
  - `src/domains/applications/application-queue.service.ts`: Projection queue của worker.
  - `src/domains/staffing/assignment-placement.service.ts`: Lookup claim và insert assignment.
  - `src/domains/staffing/transfer.service.ts`: Ghi hard-code `referrerId: null`.
  - `app/api/staffing/transfers/route.ts`: Cast raw JSON thành `TransferWorkerInput` truyền nguyên body.
  - `prisma/schema.prisma`: Chứa cột `SourceClaim.ctvId` và `ProjectAssignment.referrerId` nhưng thiếu named relations rõ ràng.
  - Migrations chứa 2 partial unique index `one_accepted_source` và `one_accepted_source_per_submission`.
- **Evidence bắt buộc sinh (Executor Evidence)**:
  - GitHub Integration Job `prisma migrate deploy` trên DB ephemeral.
  - File DB test mới `tests/db/aff04-conversion-propagation.integration.test.ts`.

## 3. Decisions

- **AFF-OQ-04A: APPROVED** - Khóa exact Prisma relations:
  - `SourceClaim.ctvId`: `@relation("SourceClaimLegacyCtv")` (Legacy CTV)
  - `SourceClaim.referrerUserId`: `@relation("SourceClaimGenericReferrer")` (Generic Referrer)
  - `ProjectAssignment.referrerId`: `@relation("AssignmentReferrer")` (Project Referrer)
  - Các back-relations ở bảng `User` phải được đặt tên đồng bộ (như `legacyCtvSourceClaims`, `genericReferrerSourceClaims`, `referredProjectAssignments`).
  - Toàn bộ dùng `FK ON DELETE RESTRICT` và có indexes tương ứng. Không đổi semantic của legacy `ctvId`.
  - Hai partial unique indexes giữ nguyên.
- **AFF-OQ-04A: APPROVED** - Migration / Backfill Predicates:
  - Accepted `CTV_REFERRAL` có `ctvId` hợp lệ → Backfill `referrerUserId`.
  - Accepted `CTV_REFERRAL` thiếu `ctvId` → Fail closed.
  - Non-CTV claim dù có legacy `ctvId` → Không backfill generic referrer.
  - `ProjectAssignment.referrerId` orphan → Fail closed.
- **AFF-OQ-04B: APPROVED** - Self-referral provenance:
  - Classify `SELF_REFERRAL` khi `Worker.accountUserId` non-null và bằng `referrerUserId`.
  - Nếu chưa có canonical account link: `UNKNOWN_NOT_PROVEN` (không suy luận name/phone/userId).
  - Không tạo CommissionLedger ở mọi AFF-04 path.

## 4. Contract

- **Quyền Hạn và RLS:** Mọi luồng phải chạy trong transaction `withDbContext` dưới RLS hiện hành; không nới policy.
- **Source Resolution Matrix (Conversion):**
  - Có `ReferralAttribution` gắn canonical `LaborProfile` và status `CONSUMED`: dùng `referrerUserId`.
  - Có snapshot `ctvId` khác với generic source: `SOURCE_PROVENANCE_CONFLICT`.
  - Attribution tồn tại nhưng state không hợp lệ: fail typed (không silently downgrade).
  - Không có attribution + có `ctvId`: legacy fallback.
  - Vendor/HRP_DIRECT: generic referrer `null`.
- **Existing Worker & Conversion Replay:**
  - Bắt buộc lookup canonical accepted claim theo `workerId`, không bó buộc vào submission hiện tại.
  - Accepted claim cùng `referrerUserId`: reuse claim, CONVERTED replay của submission mới trả đúng `sourceClaimId`, không báo `CONVERSION_INVARIANT_BROKEN`. `application-queue.service.ts` phải đọc được worker-level canonical claim.
  - Accepted claim khác source: typed conflict, không steal/overwrite.
- **Idempotency vs Duplicate Request:**
  - Cùng idempotency key + cùng payload: route wrap sẽ trả stored success với `replayed=true`, không tạo counter/audit/outbox/assignment mới. Mọi thứ giữ nguyên.
  - Key mới/không replay khi assignment của submission đã tồn tại: service layer sẽ trả typed `ASSIGNMENT_EXISTS`, không sinh side effect.
- **Transfer Compatibility Matrix:**
  - Sau worker lock, re-read canonical accepted worker-level claim.
  - Có generic referrer: assignment mới inherit referrer.
  - Direct/vendor (accepted claim có referrer null): assignment mới `null`.
  - Legacy worker không có accepted claim: tiếp tục transfer, `referrerId: null`, audit `resolutionMode=LEGACY_NO_ACCEPTED_CLAIM`.
  - Nhiều accepted claim hoặc old assignment có non-null referrer khác canonical claim: typed conflict. Không suy luận qua phone/request body.
- **Placement Invariant (§10.2):**
  - Trong placement transaction, phải đọc `LaborProfileHandlingAssignment` `ACTIVE`, chưa hết hạn, và assignee user `ACTIVE`.
  - Ghi **audit + outbox** các ID: `sourceClaimId`, `referrerUserId` (nullable), `handlingAssignmentId` (nullable), `beneficiaryCandidateUserId` (nullable), `resolutionMode`, `selfReferralClassification`.
  - Trạng thái `Company Pool` / no active assignment → candidate `null`, ghi mode. Inactive assignee → candidate `null`, mode `INACTIVE_REQUIRES_CASE_RESOLUTION`. `ProjectAssignment.referrerId` vẫn giữ provenance.
- **API Boundary:**
  - Bắt buộc construct object allowlist thủ công cho từng single/bulk item trước khi: (1) gọi service, và (2) tính idempotency fingerprint.
  - Các keys như `referrerId`, `referrerUserId`, `ctvId`, `vendorId`, `beneficiaryUserId`, `assigneeUserId` và mọi unknown fields không được flow vào service, không vào fingerprint. Chống dùng generic framework. Convert/placement hiện đã construct allowlist, ghi chú verify-only nếu không thay đổi.

## 5. Execution Plan

| Step | Component | Description |
|---|---|---|
| `STEP-01` | `prisma/` & DB Integration | Áp dụng exact named relations. Viết migration & backfill theo đúng Predicates ở Mục 3. Viết Canonical DB Integration test cho preflight orphan, race condition và clean backfill. Cập nhật `vitest.integration-files.ts`. |
| `STEP-02` | `conversion.service.ts` & `application-queue.service.ts` | Triển khai lookup canonical claim theo workerId, reuse khi cùng source (replay), conflict khác source, self-referral classification. Update projection queue. Audit/outbox đúng chuẩn. |
| `STEP-03` | `assignment-placement.service.ts` & routes | Xử lý Service Duplicate Request trả `ASSIGNMENT_EXISTS`. Viết Route filter wrap idempotency replay. Đọc beneficiary theo §10.2 Placement Invariant. Ghi **audit + outbox**. |
| `STEP-04` | `transfer.service.ts` & routes | Xử lý Transfer Matrix (kế thừa source hoặc null hoặc legacy fallback). Constructor explicit route object allowlist để chặn mọi extra/malicious keys ảnh hưởng tới service & fingerprint. |

## 6. Acceptance

### 6.1 Requirements List

| RQ | Description |
|---|---|
| `RQ-01` | Migration Exact Scope & Integration Evidence |
| `RQ-02` | Source Resolution, Concurrency & Canonical Lookups |
| `RQ-03` | Placement Idempotency/Duplicate rules & Beneficiary Snapshot |
| `RQ-04` | Transfer Compatibility & Route-level API Strict Boundaries |
| `RQ-05` | Exact File Allowlist & Pipeline Gate |

### 6.2 Acceptance Criteria & Verification

| AC | Requirement | Pass condition | Verification method |
|---|---|---|---|
| `AC-01` | `RQ-01` | Schema valid, Migration clean-chain qua job CI thật. Không có test ảo. | GitHub Integration job cho `prisma migrate deploy` trên DB PostgreSQL ephemeral. |
| `AC-02` | `RQ-01` | Preflight orphan và backfill CHỈ áp dụng đúng điều kiện (CTV_REFERRAL có ID), race-condition qua 2 connection, và source không bị steal được phủ sóng hoàn toàn. | `npm run test:integration` (với `tests/db/aff04-conversion-propagation.integration.test.ts` đã thêm vào `vitest.integration-files.ts`). |
| `AC-03` | `RQ-02` | Source resolution matrix, first conversion, replay/reuse claim theo workerId, conflict handling, update application queue đều test pass. | `npm run test:unit` chạy qua `conversion.service.test.ts` và `application-queue.service.test.ts`. |
| `AC-04` | `RQ-03` | Service layer trả ASSIGNMENT_EXISTS. Beneficiary resolution đúng trạng thái ACTIVE/CompanyPool/Inactive. Ghi audit + outbox an toàn ID-only, có mode/classification. | `npm run test:unit` chạy qua `assignment-placement.service.test.ts`. |
| `AC-05` | `RQ-03` | Idempotency replay của route wrap trả success mà không tạo side-effect mới. | `npm run test:unit` chạy qua `assignment-placement.routes.test.ts`. |
| `AC-06` | `RQ-04` | Xử lý đúng inheritance/fallback qua transfer service, API construct object loại sạch mọi unknown/malicious keys. | `npm run test:unit` chạy qua `transfer.service.test.ts` VÀ `transfer.routes.test.ts`. |
| `AC-07` | `RQ-05` | Lint, typecheck, build, unit và integration gate PASS không block. | Canonical commands: `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:integration` (không ENV_BLOCKED), `npm run build`. |
| `AC-08` | `RQ-05` | Diff scope tuân thủ Exact File Allowlist, file valid. | `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath docs/tasks/hrp-v6-n2-aff-04-conversion-propagation/TASK.md`, `verify-handoff.ps1`, và `git diff --check 0fdc616b61de731ded8b9fa7337002dc0bb00721..HEAD`. |

### 6.3 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-02`, `AC-07`, `AC-08` |
| `RQ-02` | `STEP-02` | `AC-03`, `AC-07`, `AC-08` |
| `RQ-03` | `STEP-03` | `AC-04`, `AC-05`, `AC-07`, `AC-08` |
| `RQ-04` | `STEP-04` | `AC-06`, `AC-07`, `AC-08` |
| `RQ-05` | `STEP-01`, `STEP-02`, `STEP-03`, `STEP-04` | `AC-07`, `AC-08` |

### 6.4 Exact Implementation File Allowlist

1. `prisma/schema.prisma`
2. Đúng một AFF-04 migration mới trong thư mục DB.
3. `src/domains/applications/conversion.service.ts`
4. `src/domains/applications/conversion.service.test.ts`
5. `src/domains/applications/application-queue.service.ts`
6. `src/domains/applications/application-queue.service.test.ts`
7. `src/domains/staffing/assignment-placement.service.ts`
8. `src/domains/staffing/assignment-placement.service.test.ts`
9. `src/domains/staffing/assignment-placement.routes.test.ts`
10. `src/domains/staffing/transfer.service.ts`
11. `src/domains/staffing/transfer.service.test.ts`
12. `app/api/staffing/transfers/route.ts`
13. `src/domains/staffing/transfer.routes.test.ts` (mới)
14. `tests/db/aff04-conversion-propagation.integration.test.ts` (mới)
15. `vitest.integration-files.ts`
16. Task-local TASK / HANDOFF / AUDIT / Evidence markdown files.

Mọi source khác ngoài bảng trên đều là forbidden (trừ khi T0 duyệt delta explicit). Cấm global policy, commission ledger, RBAC, và `PLANNER_HANDOVER.md`.

## 7. Risk

- Sai sót khi backfill provenance gây credit sai người (đã mitigation qua `aff04-conversion-propagation.integration.test.ts`).
- Missing read-lock (PostgreSQL `FOR SHARE/UPDATE`) trong concurrency (đã mitigation qua test 2 connection song song).

## 8. Open Questions

- None

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1-3 | `REVISION_REQUIRED` | T0 feedback: pin baseline, fix QUALIFIED->CONVERTED, lock exact behaviors & boundaries. |
| 4 | `PENDING T0` | Semantic correction v1.4: Update strict canonical integration path, API manual construction, full-gate command, exact Prisma relations & File Allowlist. |
| 5 | `READY_FOR_EXECUTION` | T0 execution authorization (2026-09-23) cho phep AFF-04 v1.4 implementation tren baseline 9e527a13 (KHONG PHAI Tier 3 audit verdict); semantic contract giu nguyen; v1.5 chi cap nhat execution baseline, spec version, status, planner, next gate, round counters. Baseline moi `9e527a13` (origin/main sau ER-002 #32 + AFF-05A R1 #33). Implementation se chay tren worktree `codex/t1b-aff04-conversion-propagation`. Tier 1B = Delivery Lead (gop Planner + Engineer). |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` - `v1.2` | `2026-09-22` | Drafts | Proposal slice AFF-04 và refinement |
| `v1.3` | `2026-09-22` | Semantic correction v1.3 | Fixed backfill condition, relations, ID-only audit logic |
| `v1.4` | `2026-09-22` | Semantic correction v1.4 | Exact implementation file allowlist, Route-level manual allowlist constructor, Canonical integration test, Prisma strict bounds. |
| `v1.5` | `2026-09-23` | Authority wording fix (follow-up) | Phan biet 4 authority tier theo T0 directive 2026-09-23: (1) Contract authority = TASK v1.4 @ f3f0a23f2fa6d590f188403687d317da64f4d91e (semantic khong doi); (2) Execution contract hien hanh = TASK v1.5 @ 80479e03b9cff41e913aa52c33a67a23643427f9 (commit trong branch nay); (3) T0 execution authorization = 2026-09-23 chi chap thuan AFF-04 implementation (KHONG PHAI Tier 3 audit verdict); (4) Tier 3 implementation verdict = PENDING, chi co sau implementation freeze + Tier 3 LIGHT audit. Sua wording, KHONG sua semantic contract. T0 cu cam goi T0 directive la Tier 3 audit verdict authority. The previous v1.5 row (Execution metadata alignment) is preserved in Revision Log entries history but no longer the canonical v1.5 entry; this row supersedes it for wording accuracy.
| `v1.6` | `2026-09-23` | Spec version bump + wording authority fix committed | Follow-up commit (khong amend) theo T0 directive 2026-09-23: (1) Spec version v1.5 -> v1.6; (2) Â§9 round 5 sua 'chot APPROVED_FOR_EXECUTION' thanh 'T0 execution authorization (KHONG PHAI Tier 3 audit verdict)'; (3) Â§10 v1.5 row rewrite thanh 'Authority wording fix' voi 4-tier authority classification (Contract authority v1.4 @ f3f0a23f, Execution contract v1.5 @ 80479e0, T0 execution authorization 2026-09-23, Tier 3 implementation verdict PENDING). Semantic contract Â§1-Â§8 khong doi. T0 cu KHONG cho phep goi T0 directive la Tier 3 audit verdict authority.
| `v1.7` | `2026-09-23` | Implementation freeze + Status `READY_FOR_AUDIT` + Frozen SHA recorded | Tier 1B delivered STEP-01..STEP-04 implementation on `codex/t1b-aff04-conversion-propagation` @ `f01ee3513d2c1ce6a57f0e1e25860bf238ec1374`. All 6 gates PASS on local ephemeral synthetic DB (no production/staging credentials, no access to `C:\cre_hrp.txt`): typecheck, lint (`--max-warnings=0`), unit (2501 tests), integration (455 tests), `next build`, migration clean-chain + upgrade-path. Tier 3 implementation verdict PENDING - delivered for T0 to call Tier 3 LIGHT audit. HANDOFF.md accompanies this commit. Semantic contract §1-§8 unchanged. |
