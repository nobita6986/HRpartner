# Affiliate Conversion & Propagation Contract (AFF-04)

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-n2-aff-04-conversion-propagation` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Conversion and placement propagation are security and data-integrity boundaries. Incorrect attribution leads to financial credit theft or fraud. |
| Work type | `FEATURE_EXPANSION` |
| Spec version | `v1.2` |
| Status | `PROPOSED_ONLY` |
| Planner | `Tier 1A` |
| Baseline | `0fdc616b61de731ded8b9fa7337002dc0bb00721` |
| Authority | `docs/V6/aff_plan.md` §10 và §14 (AFF-04); `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §15.1 |
| In-scope roots | `src/domains/applications/`, `src/domains/staffing/`, `prisma/` |
| Forbidden paths | Mọi file commission production, authentication, global RLS policy, `PLANNER_HANDOVER.md` |
| Required gates | `T0_CONTRACT_APPROVAL`, `TIER3_LIGHT_AUDIT`, `VERIFY_TASK`, `VERIFY_HANDOFF` |
| Next gate | `T0_CONTRACT_APPROVAL` |

## 1. Outcome

AFF-04 mở rộng capability hiện có của quá trình conversion. Hiện tại, CandidateSubmission chuyển từ `QUALIFIED` → `CONVERTED` đã tạo một accepted legacy SourceClaim. Tuy nhiên, placement chưa tự động ghi nhận referrer vào dự án, và quá trình transfer hiện tạo assignment mới với `referrerId: null`.

Slice AFF-04 sẽ đảm bảo:
- Thêm `referrerUserId` (nullable) vào `SourceClaim` qua additive SQL migration, backfill từ `ctvId`.
- Propagate tự động generic referrer (nullable) từ `SourceClaim` cấp Worker sang `ProjectAssignment.referrerId` khi Placement kích hoạt (activate).
- Propagate tiếp referrer khi thực hiện Guided Transfer.
- API Client bị cấm chèn đè `referrerId` hay các trường malicious.
- Đảm bảo `self-referral` vẫn giữ lại provenance nhưng không bao giờ sinh ledger credit trong AFF-04.

## 2. Evidence

- **Nguồn hiện tại (Source Evidence)**:
  - `src/domains/applications/conversion.service.ts`: Chứa logic tạo accepted SourceClaim hiện hành và xử lý conflict.
  - `src/domains/staffing/assignment-placement.service.ts`: Logic tra cứu claim và insert assignment (hiện đang thiếu `referrerId`).
  - `src/domains/staffing/transfer.service.ts`: Logic transfer hiện tại ghi hard-code `referrerId: null`.
  - `prisma/schema.prisma`: Schema `SourceClaim` và `ProjectAssignment.referrerId` (hiện đã có cột nhưng thiếu relation).
  - Migrations: Chứa 2 partial unique index `one_accepted_source` và `one_accepted_source_per_submission`.
  - `src/domains/applications/intake-writer.service.ts`: Attribution được bind vào LaborProfile và trạng thái chuyển `CONSUMED`.
- **Evidence bắt buộc sinh (Executor Evidence)**:
  - Kết quả migration clean-chain, preflight test fail-closed nếu dữ liệu hỏng/orphan.
  - Các targeted unit/integration tests mới cho conversion concurrency, payload stripping, và self-referral classification.
  - DB concurrency test chứng minh không steal source khi nhiều connection chuyển đổi cùng lúc.

## 3. Decisions

- **AFF-OQ-04A: APPROVED** - Migration scope:
  - `SourceClaim`: thêm nullable `referrerUserId`, named Prisma relation tới User, FK ON DELETE RESTRICT, index.
  - `ProjectAssignment.referrerId` đã tồn tại; chỉ thêm named relation, FK ON DELETE RESTRICT, index.
  - Preflight mọi `project_assignments.referrer_id IS NOT NULL` phải tham chiếu `User` hợp lệ; fail closed nếu orphan.
  - Backfill `SourceClaim.referrerUserId = ctvId` khi `ctvId IS NOT NULL`.
  - Không backfill lịch sử `ProjectAssignment.referrerId`. Không sửa/tạo lại `one_accepted_source` và `one_accepted_source_per_submission`.
- **AFF-OQ-04B: APPROVED** - Self-referral provenance:
  - Chỉ classify `SELF_REFERRAL` khi `Worker.accountUserId` non-null và bằng `referrerUserId`.
  - Nếu chưa có canonical account link: `UNKNOWN_NOT_PROVEN` (không suy luận phone/name/userId).
  - Giữ accepted `SourceClaim` và `ProjectAssignment.referrerId` làm provenance. `accepted` không đồng nghĩa đủ điều kiện nhận commission.
  - Tuyệt đối không sinh CommissionLedger trong mọi path của AFF-04. Không thêm `ineligibleForCommission` vào `SourceClaim`. AFF-05B sẽ deny credit.

## 4. Contract

- **Quyền Hạn và RLS:** Các nghiệp vụ bắt buộc chạy trong transaction `withDbContext` dưới RLS hiện hành; không nới policy ngoài migration delta được audit.
- **Source Resolution Matrix (Conversion):**
  - Có `ReferralAttribution` gắn canonical `LaborProfile` và status `CONSUMED`: dùng `referrerUserId`.
  - Nếu snapshot `ctvId` có và khác generic source: `SOURCE_PROVENANCE_CONFLICT`.
  - Attribution tồn tại nhưng state không hợp lệ: fail typed, không silently downgrade.
  - Không có attribution + có `ctvId`: legacy fallback.
  - Vendor/HRP_DIRECT: generic referrer `null`.
- **Existing-Worker Behavior (Conversion):**
  - Accepted claim cùng `referrerUserId`: reuse claim.
  - Accepted claim khác source: conflict, không steal/overwrite.
- **Placement & Transfer Constraints:**
  - Placement: Initial assignment ghi nullable `referrerId` từ worker-level accepted claim (tìm theo `workerId`, không phụ thuộc submission hiện tại).
  - Transfer: Re-read accepted claim dưới worker lock. Nếu assignment cũ có non-null referrer khác accepted claim: fail typed conflict. Nếu direct/vendor không có generic referrer: assignment mới giữ `null`. Bỏ toàn bộ yêu cầu "referrerId not null".
- **Replay & Idempotency:**
  - Request placement lần hai trả typed `ASSIGNMENT_EXISTS`. Không tạo assignment/counter/audit/outbox mới.
- **API Boundary:**
  - Extra keys (`referrerId`, `referrerUserId`, `ctvId`, `vendorId`, `beneficiaryUserId`, `assigneeUserId`) không được flow vào service, không ảnh hưởng kết quả. Route tiếp tục dùng allowlist hiện hành, không cần generic framework chỉ để reject unknown fields.
- **Audit/Outbox:**
  - Conversion: ghi `sourceClaimId`, `referrerUserId`, `resolution mode`; không PII.
  - Placement: ghi `sourceClaimId`, `nullable referrerId`.
  - Transfer: ghi `nullable referrerId` và `source resolution`; không PII.
  - Replay không tạo duplicate audit.

## 5. Execution Plan

| Step | Component | Description |
|---|---|---|
| `STEP-01` | `prisma/schema.prisma` và `migrations/` | Thêm FK, index, relation cho `SourceClaim.referrerUserId` và `ProjectAssignment.referrerId`. Viết script backfill `referrerUserId = ctvId`. Chạy DB preflight fail-closed nếu có orphan. |
| `STEP-02` | `conversion.service.ts` | Áp dụng Source Resolution Matrix, rule Existing-Worker Behavior và Self-Referral Classification. Ghi audit reason/mode không PII. Bảo vệ concurrency (sử dụng 2 DB partial unique index). |
| `STEP-03` | `assignment-placement.service.ts` | Lookup accepted claim của `Worker`, ghi `referrerId` (nullable) vào `ProjectAssignment`. Replay trả `ASSIGNMENT_EXISTS` và chặn duplicate audit. |
| `STEP-04` | `transfer.service.ts` | Re-read accepted claim dưới lock, inherit `referrerId` hoặc conflict fail typed, sinh audit không PII. |
| `STEP-05` | API Routes | Đảm bảo các route/controller construct service input đúng allowlist, loại bỏ malicious payload keys. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Schema valid và migration chain sạch sẽ. | `npx prisma validate` |
| `AC-02` | Các migration chạy thông qua chuỗi hợp lệ, không lỗi. | `node scripts/ci/migration-chain.mjs` (hoặc lệnh tương đương) |
| `AC-03` | Dữ liệu preflight/backfill upgrade fail-closed nếu gặp orphan `referrerId`. | `node scripts/ci/db-upgrade-path.mjs` |
| `AC-04` | Concurrency: nhiều conversion cùng lúc không leak exception hoặc steal source (Existing-Worker rules). | `vitest run src/domains/applications/conversion.concurrent.test.ts` (test kết nối 2 connection thật) |
| `AC-05` | Route input filter, payload reject/stripping, và rules Self-Referral/Transfer/Placement replay trả đúng. | `vitest run src/domains/staffing/assignment-placement.service.test.ts` (cùng các targeted route tests khác) |
| `AC-06` | Toàn bộ Quality, Lint, Typecheck, Build, Unit, Canonical Integration pass (không regression, RLS an toàn). | `npm run typecheck && npm run lint && vitest run --config vitest.unit.config.ts && vitest run --config vitest.integration.config.ts && npm run build` |
| `AC-07` | Lệnh kiểm định TASK/HANDOFF hợp lệ, diff không vượt quá scope file. | `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath docs/tasks/hrp-v6-n2-aff-04-conversion-propagation/TASK.md`, `verify-handoff.ps1`, `git diff --check origin/main..HEAD` |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-02`, `AC-03`, `AC-06`, `AC-07` |
| `RQ-02` | `STEP-02` | `AC-04`, `AC-05`, `AC-06`, `AC-07` |
| `RQ-03` | `STEP-03`, `STEP-04` | `AC-05`, `AC-06`, `AC-07` |
| `RQ-04` | `STEP-05` | `AC-05`, `AC-06`, `AC-07` |

## 7. Risk

- Nếu preflight migration không phát hiện orphan `referrerId`, có thể xảy ra foreign-key constraint violation khi apply production. (Mitigation: strict upgrade-path fixture).
- Quên read lock trong Transfer có thể gây race condition (Mitigation: Integration concurrency test).

## 8. Open Questions

- None

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | `REVISION_REQUIRED` | T0 feedback: pin baseline, fix QUALIFIED->CONVERTED state, bỏ SECURITY_DEFINER, sửa file path. |
| 2 | `REVISION_REQUIRED` | T0 feedback: update migration strict bounds, source resolution matrix, lock behaviour (transfer/placement/conversion), api allowlist rules. |
| 3 | `PENDING T0` | Cập nhật cấu trúc TASK v1.2. Thêm evidence section, AC chi tiết theo manual command, khóa behaviour. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-22` | Initial draft | Proposal slice AFF-04 |
| `v1.1` | `2026-09-22` | Revision following T0 (r2) | Added template structure, fixed states and path scopes, applied T0 decisions. |
| `v1.2` | `2026-09-22` | Revision following T0 (r3) | Fixed migration bounds, source resolution matrix, exact file bounds, test commands. |
