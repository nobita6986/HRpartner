# TASK — hrp-p0-a04-er003-evidence-record-metadata

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p0-a04-er003-evidence-record-metadata` |
| Work type | `FEATURE_EXPANSION` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Neon schema migration for sensitive metadata boundary and authorization base. |
| Spec version | `v1.0` |
| Status | `PROPOSED_ONLY` |
| Planner | `Tier 1A` |
| Baseline | `e4d21807f0d972de447e710066b40c77a661fb17` |
| Authority | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §17 (P0-A04) |
| In-scope roots | Theo Exact File Allowlist |
| Forbidden paths | Bất kỳ file nào ngoài Exact File Allowlist; đặc biệt cấm: `docs/PLANNER_HANDOVER.md`, sửa đổi runtime/wiring adapter thực, hoặc các feature slices khác (AFF, CRM, v.v.). |
| Required gates | `T0_CONTRACT_APPROVAL`, `VERIFY_TASK`, `VERIFY_HANDOFF` |
| Next gate | `T0_CONTRACT_REVIEW` |

## 1. Outcome

Thiết lập metadata model cho Evidence Storage trên DB Neon theo chuẩn P0-A04, đảm bảo:
- Lưu metadata tách biệt hoàn toàn khỏi blob storage.
- Gắn kết authorization/canonical ownership rõ ràng để chuẩn bị cho RLS ở các task sau.
- Không lộ URL public, path vật lý hay token/PII trong metadata hoặc audit.
- Sẵn sàng tích hợp với `EvidenceStorage` port qua chuỗi `storageKey` được map an toàn, không tạo runtime wiring thật vào app lúc này (vì đây là slice data model).

## 2. Evidence

- `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §17 xác định Model `EvidenceRecord` phải gồm: `ownerType`, `ownerId`, `evidenceType`, `storageKey`, `originalFilename`, `mimeType`, `sizeBytes`, `checksum`, `status`, `createdAt`, `createdBy`, `deletedAt?`.
- ER-001/ER-002 đã tạo `EvidenceStorage` port và `LocalVpsEvidenceStorageAdapter`, nhưng chưa hề có DB model. Cần model này để ánh xạ metadata `storageKey` tới adapter.

## 3. Decisions

- **ER003-DEC-01: APPROVED** - Tạo table `evidence_records` (map `EvidenceRecord`) với cấu trúc additive-only, forward-only migration.
- **ER003-DEC-02: APPROVED** - Phân quyền/Ownership qua index trên `ownerType` và `ownerId`. 
- **ER003-DEC-03: APPROVED** - Validation ở Prisma level: `storageKey` không được chứa tuyệt đối path (e.g. `/`, `C:\`, `..`).
- **ER003-DEC-04: OWNER_DECISION_REQUIRED** - Retention policy (Bao lâu thì xóa soft-delete / hard-delete metadata).
- **ER003-DEC-05: OWNER_DECISION_REQUIRED** - Access-audit policy (Lưu log access evidence ở table riêng hay push event log).
- **ER003-DEC-06: OWNER_DECISION_REQUIRED** - Phân loại evidence (Bổ sung các enum `evidenceType` nào khác ngoài `CCCD_FRONT`, `CCCD_BACK`, `PORTRAIT`, `CONTRACT`, `CERTIFICATE`, `OTHER`).
- **ER003-DEC-07: OWNER_DECISION_REQUIRED** - Real-evidence rollout (Quyết định thời điểm nào chính thức bật cờ `REAL_EVIDENCE_STORAGE_ENABLED=true` trên production).

## 4. Contract

- **Data Model:** `EvidenceRecord` chỉ chứa metadata. `storageKey` là cầu nối duy nhất tới LocalVpsAdapter.
- **Security / Privacy:** Table `evidence_records` không chứa nội dung file. Tên gốc `originalFilename` được lưu nhưng route trả về không expose raw file system path. Metadata được bảo vệ bởi Row-Level Security (nếu áp dụng chung) hoặc App-Level authorization theo `ownerId`.
- **Migration:**
  - Migration phải là forward-only (không sửa đổi schema cũ, chỉ Additive).
  - Khóa Rollback: Chỉ tạo file rollback compensating-migration nếu cần thiết khi production có issue, không revert nhánh trừ khi chưa apply.
- **Wiring:** KHÔNG wire model này vào runtime upload ở slice này (tránh phình scope), chỉ kiểm chứng logic tạo metadata.

## 5. Execution Plan

| Step | Component | Description |
|---|---|---|
| `STEP-01` | `prisma/schema.prisma` | Định nghĩa model `EvidenceRecord` và các enums liên quan (`EvidenceType`, `EvidenceStatus`). |
| `STEP-02` | `prisma/migrations/` | Tạo file migration additive-only. |
| `STEP-03` | `tests/db/` | Viết DB integration test để kiểm chứng CRUD cho EvidenceRecord, RLS impact (nếu có), và constraints (unique, nullability). |
| `STEP-04` | Task artifacts | Chạy verify-task, verify-handoff và hoàn thiện AUDIT/HANDOFF sau khi implementation hoàn tất. |

## 6. Acceptance

### 6.1 Requirements List

| RQ | Description |
|---|---|
| `RQ-01` | Schema Prisma chuẩn hóa model EvidenceRecord |
| `RQ-02` | DB Migration an toàn (forward-only, clean-chain) |
| `RQ-03` | Không lộ PII / URL public trong định nghĩa model |
| `RQ-04` | Scope file tuân thủ Exact File Allowlist |

### 6.2 Acceptance Criteria & Verification

| AC | Requirement | Pass condition | Verification method |
|---|---|---|---|
| `AC-01` | `RQ-01` | Model compile và generate Prisma Client thành công | `npx prisma validate` và `npx prisma generate` |
| `AC-02` | `RQ-02` | Migration apply không lỗi trên DB trắng | `npm run test:integration` (Preflight setup DB) |
| `AC-03` | `RQ-01`, `RQ-03` | Create/Read record không bắt lưu raw filesystem path hay public URL | DB Integration Test assert fields |
| `AC-04` | `RQ-04` | Chỉ đổi các file trong allowlist | `git diff --name-only origin/main..HEAD` |

### 6.3 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-03` |
| `RQ-02` | `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-01`, `STEP-03` | `AC-03` |
| `RQ-04` | `STEP-01`, `STEP-02`, `STEP-03`, `STEP-04` | `AC-04` |

### 6.4 Exact Implementation File Allowlist

1. `prisma/schema.prisma`
2. Đúng một file migration mới trong `prisma/migrations/`
3. `tests/db/er003-evidence-record-metadata.integration.test.ts` (mới)
4. `vitest.integration-files.ts` (để include file test mới)
5. Task-local TASK / HANDOFF / AUDIT / Evidence markdown files (`docs/tasks/hrp-p0-a04-er003-evidence-record-metadata/**`)

## 7. Risk

- Sai lệch kiểu dữ liệu hoặc config enum (Mitigation: Integration test CRUD trên ephemeral DB).
- Missing constraints gây orphan data (Mitigation: FK tới `User` qua `ownerId` nếu `ownerType` = USER, tuy nhiên do đa hình `ownerType` nên sẽ xử lý constraints ở tầng logic hoặc check constraints DB).

## 8. Open Questions

- Việc áp dụng RLS cho `evidence_records` sẽ diễn ra ngay ở task này (thêm policy) hay để dành tới lúc wire runtime adapter? (Tạm thời `OWNER_DECISION_REQUIRED`).

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | `PROPOSED_ONLY` | Contract mới đề xuất, chờ T0/Owner duyệt scope trước khi implementation. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-22` | Initial contract draft | Lên bản draft đầu tiên theo chỉ thị P0-A04. |
