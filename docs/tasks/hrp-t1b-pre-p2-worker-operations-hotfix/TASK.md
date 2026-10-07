# TASK — `hrp-t1b-pre-p2-worker-operations-hotfix`

> **Trạng thái:** `READY_FOR_EXECUTION` — `Contract gate: READY_TO_CODE`, `Decision state: CLOSED`. T0 đã chốt Q1–Q4 xem §11 và `T0-DECISIONS.md`. Tier 1 bắt đầu `STEP-02` ngay.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1b-pre-p2-worker-operations-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | Read surface cho Admin audit_log + copy/UI tweak + read-side enrichment. Không chạm auth/RLS/PII/schema. |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `8f93178a81c9f35c6f9be1e016bc4377928db185` (origin/main @ 2026-10-07) |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Correction budget | `1` |
| In-scope roots | `app/admin/workers/**`, `app/admin/labor-profiles/**`, `app/api/workers/**`, `src/domains/workforce/**`, `src/domains/talent/**` (read-service only) |
| Forbidden paths | `prisma/schema.prisma`, `prisma/migrations/**`; `src/shared/auth/auth-context.ts`, `src/shared/auth/permission-resolver.ts`, `src/shared/auth/with-db-context.ts`, `src/shared/auth/with-authorized-db.ts`, `src/shared/auth/worker-projection.ts` (read-only) |
| Required gates | `npm run typecheck`, `npm run test:unit`, `npm run build`, `pwsh .ai-pipeline/scripts/verify-encoding.ps1` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `NONE: T0 answer → /deliver → /resolve` |

## 1. Outcome

### 1.1 User-visible outcome (Vietnamese)

1. **Sau khi xóa Worker thành công** (`DELETE /api/workers/[id]` trả 200): hiện banner xác nhận rõ ràng "Đã xóa vĩnh viễn người lao động …" + nút "Về danh sách" + nút "Tiếp tục xem chi tiết" (navigate lại detail — sẽ 404 vì worker đã xóa, route layer đã show). KHÔNG tự redirect ngay lập tức; cho operator 1 lý xác nhận.
2. **Audit log viewer** mới tại `/admin/audit-logs` (chỉ ADMIN), lọc theo `entityType` (mặc định `Worker`), `action`, `actorId`, `fromDate/toDate`, `entityId`. Phân trang skip/take. KHÔNG hiển thị CCCD/phone/bankAccount trong payload diff; chỉ trả metadata an toàn.
3. **Bảng Người lao động** (`/admin/workers`) thêm các cột: Dự án đang làm, Ngày làm đầu tiên, Quản lý dự án, Người phụ trách (handler), Người giới thiệu, Người hưởng hoa hồng. Bỏ cột "Ngày tạo" và nút "Xem" riêng (giữ click hàng mở detail).
4. **Mô tả bảng**: thay bằng "Quản lý thông tin và trạng thái người lao động." — bỏ mã phân hệ nội bộ.
5. **Bảng Hồ sơ tiếp nhận** (`/admin/labor-profiles`) thêm: Job/đơn ứng tuyển gần nhất, Số đơn, Người phụ trách, Nguồn tiếp nhận (channel), Trạng thái hiện hữu, Ngày tiếp nhận. Không nhân bản row; không thêm CCCD; giữ nguyên quy tắc phân quyền/che dữ liệu.

### 1.2 Non-goals

- Không đổi auth, RLS, PII projection rules, role matrix.
- Không schema/migration (read-only trên `prisma/schema.prisma`).
- Không thêm route mới ngoài `/api/admin/audit-logs` (giới hạn audit viewer scope).
- Không thêm dependency mới.
- Không thay đổi Worker DELETE/PATCH/GET service authority.
- Không phát minh data mới — chỉ dùng canonical relations: `EmploymentEpisode.startedAt`, `ProjectAssignment WHERE status=ACTIVE`, `Worker.assignedToId/managerId`, `SourceClaim WHERE accepted AND claimType=CTV_REFERRAL`, `CandidateSubmission` (theo `workerId|mergedWorkerId|laborProfileId`).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/workforce/worker.service.ts:701-714` | `deleteWorker` ghi `AuditLog.action='WORKER_PERMANENT_DELETE'` trong transaction — đã có sẵn; chỉ thiếu viewer surface. |
| `EV-02` | `prisma/schema.prisma:247-312` (Worker model) | Đã có `ownerId/assignedToId/managerId`; thêm cột tính toán từ relations. |
| `EV-03` | `prisma/schema.prisma:1568-1585` (EmploymentEpisode) | `startedAt` = canonical "Ngày làm đầu tiên". Schema đã ổn định. |
| `EV-04` | `prisma/schema.prisma:762-810` (ProjectAssignment) | `status IN ('ACTIVE','PAUSED','PLANNED')` là assignment "đang làm"; `projectId` → `Project.pmUserId`. |
| `EV-05` | `prisma/schema.prisma:724-749` (SourceClaim) | `claimType='CTV_REFERRAL' AND accepted=true` → `ctvId` = người hưởng hoa hồng. |
| `EV-06` | `prisma/schema.prisma:643-680` (CandidateSubmission) | `workerId`/`mergedWorkerId` + `projectId` cho Job gần nhất + count. |
| `EV-07` | `app/api/workers/[id]/route.ts:269-285` | DELETE hiện redirect về list sau khi 200; thiếu banner xác nhận. |
| `EV-08` | `app/admin/workers/page.tsx:30-37` | Description hiện tại: "Phân hệ M5 — Quản lý hồ sơ người lao động (đã chuyển đổi từ Hồ sơ tiếp nhận)." → cần đổi. |
| `EV-09` | `app/admin/labor-profiles/page.tsx:110-115` | Hiện tại có 5 cột (Họ tên, SĐT, Xác minh, Hoàn thiện, Ngày tạo). Thiếu Job, Handler, Source, Status, Intake date. |
| `EV-10` | `src/domains/talent/labor-profile.read-service.ts:191-270` | Đã có `getLaborProfileDetail` với handler/intakes/submissions/episodes/placementCases. Cần viết list variant enrich các fields. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Worker DELETE confirmation: sau 200 trả `{ ok, id, deletedAt, auditId }` rồi UI hiển thị banner xác nhận (component mới `WorkerDeleteConfirmation`). Không tự `window.location.href` ngay. | `CHOSEN` (T0 confirmed) |
| `DEC-02` | Audit log viewer: route `GET /api/admin/audit-logs` + page `/admin/audit-logs`. ADMIN-only. Default filter `entityType=Worker`. Lọc theo `entityId`, `actorId`, `action`, `fromDate`, `toDate`. Phân trang `skip/take`. | `CHOSEN` (T0 Q1 confirmed) |
| `DEC-03` | Worker table: bổ sung 6 cột — Dự án, Ngày làm đầu tiên, Quản lý dự án, Người phụ trách, Người giới thiệu, Người hưởng hoa hồng. Bỏ cột "Ngày tạo" và nút "Xem". Click hàng → detail. | `CHOSEN` (T0 Q3 confirmed) |
| `DEC-04` | "Ngày làm đầu tiên" = `EmploymentEpisode.startedAt` (MIN) — KHÔNG dùng `Worker.createdAt`. | `CHOSEN` (T0 Q2 confirmed) |
| `DEC-05` | "Dự án đang làm" = `ProjectAssignment` where `workerId=X AND status IN ('ACTIVE','PAUSED')` — order by `validFrom` desc, take 1; project name/code từ `Project` (INCLUDE name, code). | `CHOSEN` |
| `DEC-06` | "Quản lý dự án" = `Project.pmUserId` (User.name), fallback `Project.subPmUserId1/subPmUserId2` chỉ khi `pmUserId` null. | `CHOSEN` |
| `DEC-07` | "Người phụ trách" = `Worker.assignedToId` (User.name) — KHÁC với người hưởng. | `CHOSEN` |
| `DEC-08` | "Người giới thiệu" = `ProjectAssignment.referrerId` (User.name), nếu không có thì `SourceClaim.referrerUserId` (User.name), KHÔNG trộn lẫn với handler/PM. | `CHOSEN` |
| `DEC-09` | "Người hưởng hoa hồng" = `SourceClaim` where `workerId=X AND accepted=true AND claimType='CTV_REFERRAL'` — `ctvId` (User.name). Nếu nhiều claim accepted, lấy mới nhất theo `createdAt` desc. | `CHOSEN` (T0 Q3 confirmed) |
| `DEC-10` | LaborProfile table: 6 cột bổ sung — Job gần nhất (CandidateSubmission.projectName hoặc Project.code), Số đơn (CandidateSubmission count), Người phụ trách (HandlingAssignment.assigneeUserId), Nguồn (intake channel.label), Trạng thái hiện hữu (identityVerification + completeness), Ngày tiếp nhận (LaborProfile.createdAt). | `CHOSEN` (T0 Q4 confirmed) |
| `DEC-11` | Description Worker table: "Quản lý thông tin và trạng thái người lao động." — bỏ "Phân hệ M5" và "(đã chuyển đổi từ Hồ sơ tiếp nhận)". | `CHOSEN` |
| `DEC-12` | Audit log diff masking: redact CCCD/phone/bankAccount/taxCode/insuranceCode/selfieImageUrl/cccdImageUrl từ `diff.before/after`. Mask character `***`. KHÔNG trả metadata `actor.ipAddress/userAgent` cho viewer (chỉ actor.name/role). |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Worker DELETE confirm UI | `WorkerDeleteButton` (đã có modal) | `N/A` | `N/A` | `N/A` | Tự xây component mới dùng primitives hiện hữu | Tận dụng Button/Card sẵn có. |
| Audit log API + viewer | Repo-internal pattern (đã có ở `audit-logs` service trên vendor statements) | `N/A` | `N/A` | `N/A` | Tự xây theo convention repo — không thêm capability mới | Không thêm vendor lib. |
| Worker table enrichment read service | Repo-internal (đã có `getWorkerDetail`) | `N/A` | `N/A` | `N/A` | Thêm variant `getWorkerListEnriched` | Không thêm dep. |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| `N/A` | — | `N/A` | — | — | — | — | Task không tạo connector, scheduler, worker hay workflow lặp. |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Sau khi `DELETE /api/workers/[id]` trả 200, UI hiển thị banner xác nhận (worker name, audit id, link "Về danh sách"). KHÔNG tự redirect ngay. |
| `RQ-02` | Tạo route `GET /api/admin/audit-logs` (ADMIN-only). Query: `entityType?` (default `Worker`), `entityId?`, `actorId?`, `action?`, `fromDate?`, `toDate?`, `skip?`, `take?` (default 50, max 200). Response: `{ items: [{ id, actorId, actorRole, action, entityType, entityId, reason, createdAt, diffSafe }], total, skip, take }`. |
| `RQ-03` | Tạo page `/admin/audit-logs` (server component). ADMIN-only. Filter UI + bảng items + pagination. |
| `RQ-04` | Worker table enrichment: mở rộng `GET /api/workers` response thêm `currentProject` (code/name), `currentProjectManager` (name), `firstWorkDate` (ISO), `handler` (name), `referrer` (name), `commissionBeneficiary` (name). Mỗi field null nếu không có. |
| `RQ-05` | Worker table UI (`app/admin/workers/page.tsx`): render 6 cột mới, bỏ "Ngày tạo", bỏ nút "Xem" (giữ row click → detail). Description = "Quản lý thông tin và trạng thái người lao động." |
| `RQ-06` | LaborProfile table enrichment: mở rộng `getLaborProfilesList` response thêm `latestJobId` (id), `latestJobName` (code/name), `applicationCount`, `handler` (name), `intakeSource` (channel.label), `currentStatus` ({ identityVerification, completeness }), `intakeDate` (ISO). |
| `RQ-07` | LaborProfile table UI (`app/admin/labor-profiles/page.tsx`): thêm 6 cột mới vào table. |
| `RQ-08` | Diff masking: redact CCCD/phone/bank/taxCode/insuranceCode/selfieImageUrl/cccdImageUrl keys với `***` trong `diff.before/after`. |
| `RQ-09` | Tests: service-level unit tests cho (1) Worker list enriched DTO, (2) LaborProfile list enriched DTO, (3) audit log query masking. UI snapshot/dom tests cho 3 page. Static terminology fence cho audit log labels. |
| `RQ-10` | Quyền/auth: route layer RẠNG BUỘC (a) `/api/admin/audit-logs` ADMIN-only (403 non-ADMIN), (b) viewer page admin-only. KHÔNG đổi role matrix của Worker/LaborProfile list/detail. |

### 4.2 Scope boundaries

- **In:**
  - `src/domains/workforce/worker.service.ts` (mở rộng — thêm `listWorkersForAdmin` enriched; DO NOT touch delete/update/detail)
  - `src/domains/workforce/worker-types.ts` (mở rộng — thêm WorkerListEnrichedRow)
  - `src/domains/workforce/worker-ui.ts` (mở rộng — thêm helper labels)
  - `app/api/workers/route.ts` (mở rộng — dùng enriched read service)
  - `app/admin/workers/page.tsx` (UI)
  - `app/admin/workers/[id]/worker-delete-button.tsx` (UI confirm banner)
  - `app/admin/workers/[id]/worker-delete-confirmation.tsx` (mới)
  - `src/domains/audit/audit-logs.read-service.ts` (mới)
  - `src/domains/audit/audit-logs.read-service.test.ts` (mới)
  - `app/api/admin/audit-logs/route.ts` (mới)
  - `app/admin/audit-logs/page.tsx` (mới)
  - `src/domains/talent/labor-profile.read-service.ts` (mở rộng — enrich list DTO)
  - `src/domains/talent/labor-profile.read-service.test.ts` (mở rộng — test cho list enrichment)
  - `app/admin/labor-profiles/page.tsx` (UI)
  - `docs/tasks/hrp-t1b-pre-p2-worker-operations-hotfix/TASK.md` (file này)
  - `docs/tasks/hrp-t1b-pre-p2-worker-operations-hotfix/T0-DECISIONS.md` (mới)
  - `docs/tasks/hrp-t1b-pre-p2-worker-operations-hotfix/HANDOFF.md` (mới)
  - `docs/tasks/hrp-t1b-pre-p2-worker-operations-hotfix/evidence/*`
- **Out:**
  - `prisma/schema.prisma` (read-only).
  - `src/shared/auth/**` (read-only).
  - `src/domains/workforce/worker-delete-error-labels.ts` (read-only).
  - Tự ý thêm dependency mới.
  - Đổi existing DELETE/PATCH/GET logic cho Worker.
  - Đổi role matrix ở các route khác.
  - Đổi audit log write path (`writeAuditLog`).

### 4.3 Domain boundaries

- **Data/state:** Tất cả mở rộng dùng relations đã có. Không migration. Không backfill.
- **Permission/security:** Read-only. KHÔNG đổi existing role check. Route layer enforce ADMIN-only cho audit log.
- **Interface/API:** Mở response DTO; query DTO mở rộng (optional fields).
- **Migration/rollback:** N/A — không migration. Rollback = revert commit.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `T0-DECISIONS.md` | Ghi Q1-Q4 theo AskQuestion response (đã chốt) | `T0 approval` | Nếu T0 đổi ý → cập nhật file. |
| `STEP-02` | `src/domains/workforce/worker.service.ts` + types | Thêm `listWorkersForAdmin` enriched (6 fields mới) | `npm run test:unit` (worker.service.test.ts) | Nếu relation query fail. |
| `STEP-03` | `src/domains/talent/labor-profile.read-service.ts` | Thêm `enrichLaborProfileListItem` (6 fields mới cho list DTO) | `npm run test:unit` (labor-profile.read-service.test.ts) | Nếu relation query fail. |
| `STEP-04` | `src/domains/audit/audit-logs.read-service.ts` | Mới: `listAuditLogs(ctx, filter)` trả items với diff masking | `npm run test:unit` (audit-logs.read-service.test.ts) | Nếu service phức tạp. |
| `STEP-05` | `app/api/admin/audit-logs/route.ts` | Mới: GET handler với ADMIN guard + Zod query | `npm run test:unit` | — |
| `STEP-06` | `app/api/workers/route.ts` (GET) | Dùng enriched read service | `npm run test:unit` | — |
| `STEP-07` | `app/admin/audit-logs/page.tsx` | Mới: server component với filter form + table + pagination | `npm run build` | — |
| `STEP-08` | `app/admin/workers/page.tsx` | Mở rộng bảng 6 cột, bỏ "Xem" + "Ngày tạo", description mới | `npm run build` | — |
| `STEP-09` | `app/admin/workers/[id]/worker-delete-confirmation.tsx` + edit `worker-delete-button.tsx` | Banner confirm + KHÔNG redirect | `npm run test:unit` (worker-delete-button.static.test.ts) | — |
| `STEP-10` | `app/admin/labor-profiles/page.tsx` | Mở rộng bảng 6 cột | `npm run build` | — |
| `STEP-11` | Tests toàn diện | 6 service fence + 3 UI fence + 1 static terminology fence | `npm run test:unit` (full) | Nếu fail → fix; không bypass. |
| `STEP-12` | `HANDOFF.md` + `evidence/*` | Compact-V2 40-60 dòng, evidence inline | `verify-task.ps1` + `verify-handoff.ps1` | Nếu gate fail → fix. |
| `STEP-13` | Single forward-only commit + push + open PR | Conventional message, CI xanh | `gh pr checks --watch` | Nếu CI fail → fix; CI xanh → dừng trước merge. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `verify-task.ps1` PASS sau khi T0 chốt Q1-Q4. | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1b-pre-p2-worker-operations-hotfix/TASK.md` |
| `AC-02` | `listWorkersForAdmin` enriched test pass — 6 fields per row + null fallback. | `npm run test:unit -- src/domains/workforce` |
| `AC-03` | LaborProfile list enrich test pass — 6 fields per row + null fallback. | `npm run test:unit -- src/domains/talent/labor-profile.read-service` |
| `AC-04` | Audit log read service test pass — masking CCCD/phone/bank; ADMIN-only; pagination. | `npm run test:unit -- src/domains/audit` |
| `AC-05` | Route tests pass — 401, 403 (non-ADMIN), 200 (ADMIN), pagination. | `npm run test:unit -- app/api/admin/audit-logs` |
| `AC-06` | UI build pass cho 3 page (workers, labor-profiles, audit-logs). | `npm run build` |
| `AC-07` | UI test fence pass cho 3 page (snapshot/dom) + worker-delete-button static (banner không redirect). | `npm run test:unit` |
| `AC-08` | `npm run typecheck` 0 errors. | `npm run typecheck` |
| `AC-09` | `npm run build` 0 errors. | `npm run build` |
| `AC-10` | `pwsh .ai-pipeline/scripts/verify-encoding.ps1` PASS cho changed surface. | inline |
| `AC-11` | CI 4/4 GREEN (typecheck, unit, build, audit-mirror) trên PR. | `gh pr checks --watch` |
| `AC-12` | `HANDOFF.md` ≤ 60 dòng, `Implementation SHA` pin 40 char. | `wc -l` + manual |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-09` | `AC-07` |
| `RQ-02` | `STEP-05` | `AC-05` |
| `RQ-03` | `STEP-07` | `AC-06` |
| `RQ-04` | `STEP-02`, `STEP-06` | `AC-02`, `AC-06` |
| `RQ-05` | `STEP-08` | `AC-06` |
| `RQ-06` | `STEP-03`, `STEP-10` | `AC-03`, `AC-06` |
| `RQ-07` | `STEP-10` | `AC-06` |
| `RQ-08` | `STEP-04`, `STEP-05` | `AC-04`, `AC-05` |
| `RQ-09` | `STEP-11` | `AC-02`, `AC-03`, `AC-04`, `AC-07` |
| `RQ-10` | `STEP-05`, `STEP-07` | `AC-05`, `AC-06` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Worker list query N+1 nếu enrich 6 fields per row. | `Promise.all` batch trong 1 transaction; `findMany` với `include` các relation; không loop. |
| `RISK-02` | Audit log diff leak CCCD/phone. | Masking ở service layer (defense-in-depth), KHÔNG tin tưởng caller. |
| `RISK-03` | ProjectAssignment có nhiều ACTIVE rows. | Order by `validFrom desc`, take 1. Deterministic. |
| `RISK-04` | `SourceClaim` có thể có nhiều `accepted=true` (legacy data). | Partial unique index chỉ ENFORCE ở runtime; query filter `take=1` order by `createdAt desc`. |
| `RISK-05` | Đổi description Worker table có thể làm E2E test fail (nếu có). | Grep trước; nếu có test tham chiếu literal "Phân hệ M5", update test đồng thời. |
| `RISK-06` | Worker DELETE confirm banner — UX kém nếu redirect fail. | Cung cấp fallback button "Về danh sách" explicit + giữ URL detail (sẽ 404). |

## 8. Open Questions

- None. T0 đã chốt Q1-Q4. Contract `READY_TO_CODE`.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| `1` | `READY_FOR_EXECUTION` | Khảo sát xong, T0 chốt Q1-Q4 theo recommendation. Contract gate `READY_TO_CODE`, Decision state `CLOSED`. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-07` | Initial contract (READY_FOR_EXECUTION) | T0 chốt Q1-Q4 (xem `T0-DECISIONS.md`). Baseline = origin/main @ `8f93178a`. |

---

## 11. T0 Decisions

> Xem chi tiết trade-off + phân tích ở `T0-DECISIONS.md` cùng thư mục.

### §A — Audit viewer scope (DEC-02, Q1)

T0 chọn **Q1**: chỉ ADMIN, mọi entityType (default filter `entityType=Worker`).

### §B — First work day (DEC-04, Q2)

T0 chọn **Q2**: `EmploymentEpisode.startedAt` (MIN).

### §C — Worker table columns (DEC-03, Q3)

T0 chọn **Q3**: bổ sung đủ — Dự án đang làm, Quản lý dự án, Handler + Referrer, Commission beneficiary.

### §D — LaborProfile table columns (DEC-10, Q4)

T0 chọn **Q4**: bổ sung đủ 6 cột.