# TASK — `hrp-t1c-intake-worker-link`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1c-intake-worker-link` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | Fix bug trong transaction convert hiện hữu, blast radius hữu hạn (1 service + 1 integration test). Không đụng schema/migration/RLS. Tier 1 self-review. |
| Spec version | `v1.0` |
| Status | `READY_TO_CODE` |
| Planner | `Tier 1` |
| Baseline | `ea8f81a47c23e33a836a4f57a834a91b994b6665` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` (unit) + `READY` (synthetic-DB optional; chạy khi Owner cấp) |
| Correction budget | `1` |
| In-scope roots | `src/domains/applications/conversion.service.ts`; `src/domains/applications/conversion.service.test.ts`; `tests/db/intake-convert-worker-link.integration.test.ts` (new) |
| Forbidden paths | `prisma/**`, `src/domains/applications/aff04-*`, route layer ngoài scope, `app/admin/labor-profiles/**`, mọi production DB touch |
| Required gates | `npx vitest run --config vitest.unit.config.ts src/domains/applications/conversion.service.test.ts`; `npx vitest run --config vitest.integration.config.ts tests/db/intake-convert-worker-link.integration.test.ts`; `npm run typecheck`; `npm run lint`; `npm run build`; `npx prisma validate`; `npx prisma generate`; `git diff --check`; `node .ai-pipeline/scripts/verify-encoding.mjs` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `/deliver` → resolve |

> Lane `STANDARD` + Audit `NONE`: Tier 1 tự review, không gọi Tier 3. Correctness boundary bám transaction hiện hữu (`withDbContext` của route `POST /api/admin/applications/[id]/actions/convert`).

## 1. Outcome

### 1.1 User-visible outcome

- Một đơn QUALIFIED có `CandidateSubmission.laborProfileId` được convert thành CONVERTED sẽ đồng thời cập nhật `LaborProfile.workerId` = Worker vừa tạo/qua dedup. Trang `/admin/labor-profiles` hiển thị **"Đã liên kết"** thay vì "Chưa liên kết".
- Replay idempotent cho đơn đã CONVERTED có `laborProfileId` nhưng `LaborProfile.workerId` đang NULL (do code cũ chưa link): liên kết được khôi phục, không tạo Worker/SourceClaim mới.
- Conversion fail-closed với mã lỗi ổn định nếu: Worker khác đã thuộc LaborProfile, hoặc LaborProfile.workerId trỏ sang Worker khác với Worker vừa resolve.

### 1.2 Non-goals

- KHÔNG thay đổi schema/migration/RLS.
- KHÔNG sửa route tạo Worker trực tiếp (`app/api/admin/workers/...`) — ghi nhận deferred.
- KHÔNG thêm endpoint POST mới; chỉ sửa logic trong `convertApplication`.
- KHÔNG thêm backfill/migration dữ liệu cũ — đề xuất chỉ Tier 0 quyết.
- KHÔNG truy cập production DB.
- KHÔNG đổi role, auth/RLS, trạng thái đơn, SourceClaim semantics ngoài phần link `LaborProfile.workerId`.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/applications/conversion.service.ts:223-296` (transaction body) | Hiện tại set `candidateSubmission.workerId` nhưng KHÔNG set `LaborProfile.workerId` → root cause của "Chưa liên kết". |
| `EV-02` | `prisma/schema.prisma:1503-1526` (model `LaborProfile.workerId String? @unique`) | LaborProfile có `workerId` unique 0..1; transaction đã có sẵn FK để bind. |
| `EV-03` | `app/admin/labor-profiles/page.tsx:133-136` | UI check `profile.workerId ? "Đã liên kết" : "Chưa liên kết"` — xác nhận symptom. |
| `EV-04` | `app/api/admin/applications/[id]/actions/convert/route.ts:39-46` (withDbContext + convertApplication) | Route đã wrap transaction; thay đổi domain service nằm gọn trong transaction. |
| `EV-05` | `src/domains/applications/conversion.service.test.ts:1-340` (existing tests) | 11 case đã cover happy path + dedup + REPLAY + CTV resolution. Mở rộng thêm case link LaborProfile. |
| `EV-06` | `tests/db/intake-writer-integration.test.ts:39-58` (template DB-touching test) | Pattern tham chiếu cho integration test mới (env gate, cleanup, GUC RLS). |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Fix thuộc `convertApplication` trong transaction hiện hữu. Không tạo helper mới; không tách command. | `CHOSEN` |
| `DEC-02` | Khi `current.laborProfileId` null: KHÔNG thay đổi flow (legacy/public submission). | `CHOSEN` |
| `DEC-03` | Trong transaction sau khi resolve `workerId`, gọi `tx.laborProfile.update` để set `workerId` nếu đang NULL, fail-closed nếu khác worker. | `CHOSEN` |
| `DEC-04` | Replay idempotent path: nếu submission `CONVERTED` mà LaborProfile chưa link, gọi lại update idempotent. | `CHOSEN` |
| `DEC-05` | Thêm error code ổn định: `LABOR_PROFILE_WORKER_CONFLICT` (409) cho cả 2 trường hợp xung đột. | `CHOSEN` |
| `DEC-06` | Không touch AFF-04 source resolution; không sửa `LaborProfile.referralAttribution`; không sửa SourceClaim. | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| `N/A` | Không tạo/thay dependency hay shared framework. | `N/A` | `N/A` | `N/A` | `N/A` | Bug fix trong service hiện hữu, không thêm khả năng kỹ thuật mới. |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| `N/A` | Không tạo connector/scheduler/worker/workflow. | `N/A` | `N/A` | `N/A` | `N/A` | `N/A` | Fix logic trong cùng transaction. |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Khi convert QUALIFIED submission có `laborProfileId`, trong cùng transaction: nếu `LaborProfile.workerId` NULL thì set = workerId vừa resolve. |
| `RQ-02` | Nếu `LaborProfile.workerId` cùng giá trị workerId vừa resolve: idempotent no-op. |
| `RQ-03` | Nếu `LaborProfile.workerId` khác workerId vừa resolve: fail-closed với code `LABOR_PROFILE_WORKER_CONFLICT` (409), rollback toàn transaction (kể cả status update, audit, history). |
| `RQ-04` | Nếu `LaborProfile` chưa có `workerId` NHƯNG `Worker` vừa resolve đã thuộc LaborProfile khác (qua back-relation `Worker.laborProfile`): fail-closed với code `LABOR_PROFILE_WORKER_CONFLICT` (409). |
| `RQ-05` | Replay submission đã CONVERTED: nếu `current.laborProfileId` set, kiểm tra/khôi phục `LaborProfile.workerId` idempotent. Nếu link đã đúng → replay no-op. Nếu link khác → fail-closed. |
| `RQ-06` | Submission không có `laborProfileId` (public/legacy): flow hiện tại chạy y nguyên, không tự tạo LaborProfile. |
| `RQ-07` | Audit diff payload bổ sung `laborProfileLink: { before: null \| workerId, after: workerId \| 'IDEMPOTENT' }` cho submission có `laborProfileId`. |

### 4.2 Scope boundaries

- **In:**
  - `src/domains/applications/conversion.service.ts` (logic + error code + audit diff).
  - `src/domains/applications/conversion.service.test.ts` (unit tests cho RQ-01..RQ-06).
  - `tests/db/intake-convert-worker-link.integration.test.ts` (mới; self-skip khi env DB thiếu).
  - `vitest.integration-files.ts` (đăng ký file mới).
- **Out:**
  - `prisma/**`, `app/api/admin/**` ngoài `convert/route.ts` (route layer giữ nguyên).
  - `app/admin/labor-profiles/**` (UI đã đọc `workerId` đúng; không sửa).
  - SourceClaim/AFF-04.
  - Endpoint tạo Worker trực tiếp.
  - Backfill cũ / production DB.

### 4.3 Domain boundaries

- **Data/state:** Một LaborProfile có tối đa một Worker (`workerId String? @unique`). Transaction thuộc domain application, không phải LaborProfile domain; bind nằm trong cùng transaction convert.
- **Permission/security:** Route `POST /api/admin/applications/[id]/actions/convert` đã gate role ADMIN/HR_MANAGER; không đổi.
- **Interface/API:** Không đổi. Body `{ reason, expectedVersion?, existingWorkerId? }`; response DTO giữ nguyên (chỉ thêm field trong `auditLog.diff`, không trả client).
- **Migration/rollback:** Không có migration mới. Nếu cần rollback code: revert commit implementation; không có schema delta.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `conversion.service.ts` | Thêm helper `linkLaborProfileWorker(tx, laborProfileId, workerId, audit)` thuần (không gọi DB ngoài `tx.laborProfile.findUnique`/`update`). Trả về `{ before, after }`. Throw `ConversionError('LABOR_PROFILE_WORKER_CONFLICT', 409, ..., { laborProfileId, expected, actual })` khi mismatch. | `npm run typecheck` PASS | Lint/type fail. |
| `STEP-02` | `conversion.service.ts` | Trong flow convert QUALIFIED, sau khi `workerId` resolved (create hoặc chọn qua dedup) và trước `tx.candidateSubmission.update({ workerId })`: nếu `current.laborProfileId` set → gọi `linkLaborProfileWorker`. Truyền diff vào `tx.auditLog.create`. | unit test AC-01, AC-02, AC-03 PASS | Lint/type fail hoặc happy-path test cũ fail. |
| `STEP-03` | `conversion.service.ts` | Trong REPLAY path (status `CONVERTED` sớm): nếu `current.laborProfileId` set → gọi `linkLaborProfileWorker` idempotent. Nếu mismatch → throw `LABOR_PROFILE_WORKER_CONFLICT`. | unit test AC-04 PASS | REPLAY test cũ fail. |
| `STEP-04` | `conversion.service.ts` | Mở rộng `ConversionError.code` union với `'LABOR_PROFILE_WORKER_CONFLICT'`; thêm type-safe ở interface. | `npm run typecheck` PASS | type error. |
| `STEP-05` | `conversion.service.test.ts` | Bổ sung 6 unit test: (a) QUALIFIED + laborProfileId + Worker mới → LaborProfile.workerId set, audit diff có `laborProfileLink`; (b) QUALIFIED + laborProfileId + Worker dedup → LaborProfile.workerId set; (c) QUALIFIED + laborProfileId nhưng LaborProfile.workerId khác → fail `LABOR_PROFILE_WORKER_CONFLICT`; (d) QUALIFIED + Worker đã thuộc LaborProfile khác → fail; (e) REPLAY với LaborProfile.workerId NULL → khôi phục; (f) Submission không laborProfileId → flow cũ, LaborProfile KHÔNG bị touch. Cập nhật `txFor` helper mock thêm `laborProfile.findUnique`/`update`. | `npx vitest run --config vitest.unit.config.ts src/domains/applications/conversion.service.test.ts` toàn bộ PASS (mới + cũ) | Bất kỳ test nào fail. |
| `STEP-06` | `tests/db/intake-convert-worker-link.integration.test.ts` (new) | Synthetic DB integration test covering happy-path link, conflict fail-closed, replay idempotent, legacy non-regression, and zero-residue teardown. Self-skip nếu `DATABASE_URL_TEST`/`DATABASE_URL_ADMIN_TEST` không có. | `npx vitest run --config vitest.integration.config.ts tests/db/intake-convert-worker-link.integration.test.ts` PASS khi env có, `skip` (exit 0) khi env thiếu | Env block test thật mà owner chưa cấp → ghi BLOCKED. |
| `STEP-07` | `vitest.integration-files.ts` | Đăng ký file mới (sau dòng `tests/db/intake-writer-integration.test.ts` để giữ locality với intake integration tests). | `node -e "require('fs').readFileSync('vitest.integration-files.ts','utf8')" > /dev/null` (parse OK) | Parse fail. |
| `STEP-08` | `npm run typecheck`; `npm run lint`; `npx prisma validate`; `npx prisma generate`; `npm run build` | Canonical gates. | exit 0 cho tất cả | Bất kỳ gate fail. |
| `STEP-09` | `git diff --check`; `node .ai-pipeline/scripts/verify-encoding.mjs` | Diff hygiene + encoding. | exit 0, no trailing whitespace, no BOM | Diff dirty. |
| `STEP-10` | Commit forward-only + push + mở PR non-draft | Sau khi tất cả gate PASS; một commit implementation + một commit docs/evidence (TASK/HANDOFF/evidence). | `git log --oneline -1` trả SHA mới; `gh pr create --draft=false` | Network/PR fail. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | QUALIFIED + laborProfileId + Worker mới được tạo → `LaborProfile.workerId` = workerId; `tx.auditLog.create` payload có `diff.after.laborProfileLink.after === workerId`. | unit test `conversion.service.test.ts` |
| `AC-02` | QUALIFIED + laborProfileId + chọn Worker qua dedup (existingWorkerId) → `LaborProfile.workerId` = selected. | `vitest exit 0 + assertion of tx.laborProfile.findUnique/update calls` |
| `AC-03` | QUALIFIED + laborProfileId + LaborProfile.workerId ≠ workerId resolve → throw `ConversionError('LABOR_PROFILE_WORKER_CONFLICT', 409, ...)`; rollback (không có audit row, không có history row, không có submission update ngoài status lock; lock release). | `vitest exit 0 + assert tx.auditLog.create và tx.applicationStatusHistory.create không được gọi` |
| `AC-04` | REPLAY CONVERTED + laborProfileId + LaborProfile.workerId NULL → `LaborProfile.workerId` được set; no-op các bước khác; trả `{ changed: false }`. | `vitest exit 0 + assert tx.sourceClaim.create chưa được gọi` |
| `AC-05` | REPLAY CONVERTED + laborProfileId + LaborProfile.workerId ≠ submission.workerId → throw `LABOR_PROFILE_WORKER_CONFLICT`. | `vitest exit 0 + assert error code` |
| `AC-06` | QUALIFIED không có laborProfileId → flow hiện tại không touch `tx.laborProfile.*`. | `vitest exit 0 + assert tx.laborProfile.findUnique chưa từng được gọi` |
| `AC-07` | `npm run typecheck`; `npm run lint`; `npx prisma validate`; `npx prisma generate`; `npm run build` đều exit 0. | `npm run *` + `npx prisma *` |
| `AC-08` | `npx vitest run --config vitest.unit.config.ts src/domains/applications/conversion.service.test.ts` PASS toàn bộ (existing + 6 mới). | vitest exit 0 |
| `AC-09` | Integration test trên synthetic DB (khi env có) PASS cho happy path, replay idempotent, conflict fail-closed, legacy non-regression, zero-residue. | `npx vitest run --config vitest.integration.config.ts tests/db/intake-convert-worker-link.integration.test.ts` |
| `AC-10` | `git diff --check HEAD` PASS; `node .ai-pipeline/scripts/verify-encoding.mjs` PASS; `git status --porcelain` không có entry ngoài `docs/tasks/hrp-t1c-intake-worker-link/**`. | shell commands |
| `AC-11` | Commit implementation SHA đã pin trong HANDOFF; tạo PR non-draft; `gh pr checks` cuối cùng = 4/4 GREEN hoặc chờ owner review. | `gh CLI + vitest exit 0` |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01`, `STEP-02` | `AC-01`, `AC-02` |
| `RQ-02` | `STEP-02` | `AC-01`, `AC-04` (idempotent) |
| `RQ-03` | `STEP-01`, `STEP-02` | `AC-03`, `AC-05` |
| `RQ-04` | `STEP-01`, `STEP-02` | `AC-03` (subset) |
| `RQ-05` | `STEP-03` | `AC-04`, `AC-05` |
| `RQ-06` | `STEP-02` | `AC-06` |
| `RQ-07` | `STEP-02` | `AC-01` (audit diff) |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Thay đổi transaction hiện hữu vô tình phá 11 unit test cũ. | Re-run full test file `conversion.service.test.ts` ở STEP-05; nếu fail phải điều chỉnh helper không đổi contract cũ. |
| `RISK-02` | `LaborProfile.workerId` unique bị violate bởi 2 transaction đồng thời (race) → trả về Prisma `P2002` không rõ ràng. | Catch `P2002` riêng và map sang `LABOR_PROFILE_WORKER_CONFLICT` (409) trong `linkLaborProfileWorker`; unit test AC-03 cover. |
| `RISK-03` | Production DB có LaborProfile.workerId NULL cho đơn cũ → code mới replay idempotent fix được, nhưng có thể khoá lock race với admin khác. | Hotfix chỉ trong transaction convert; không thêm migration hay backfill. Đề xuất T0 quyết backfill sau khi chứng minh quy tắc deterministic. |
| `RISK-04` | Audit log diff payload lớn hơn → log noise. | Diff chỉ thêm 1 field `laborProfileLink` chỉ khi `current.laborProfileId` set; payload path khác giữ nguyên. |
| `RISK-05` | Owner chưa cấp synthetic Neon DB → integration test self-skip → không proof DB. | Self-skip an toàn; tài liệu rõ ràng trong HANDOFF + đề xuất owner run trước merge. |

## 8. Open Questions

- None.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 0 | Implementation commit + open PR. | Standard lane NONE; tự review. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-05 | Initial contract | Initial |
