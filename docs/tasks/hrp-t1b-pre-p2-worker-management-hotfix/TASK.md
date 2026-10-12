# TASK — `hrp-t1b-pre-p2-worker-management-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1b-pre-p2-worker-management-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `ADOPT` |
| Build vs automate | `N/A` |
| Assurance lane | `CRITICAL` |
| Audit mode | `NONE` |
| Audit reason | T0 directive: `Audit mode: NONE — Owner chấp nhận Tier 1 self-review`. Worker authority không mở rộng: chỉ thêm UI/API surface dùng allowlist projection + L1+L2 RLS đã có. |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `0626ba28cf3723b37c05c5d5f32a490cca6ae87f` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `app/admin/workers/**`, `app/api/workers/**`, `src/domains/workforce/**`, `src/domains/admin/workers-route.test.ts`, `docs/tasks/hrp-t1b-pre-p2-worker-management-hotfix/**` |
| Forbidden paths | `prisma/schema.prisma`, `prisma/migrations/**`, `prisma/seed.mjs`, `package.json`, `scripts/ci/**`, `vitest.*.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `app/api/workers/me/**`, `app/admin/recruiter-workbench/**`, `app/admin/applications/**`, `src/domains/applications/conversion.service.ts`, `src/domains/talent/conversion*.ts`, `src/domains/talent/labor-profile.service.ts`, `src/shared/auth/with-db-context.ts`, `src/shared/auth/with-auth-scope.ts`, `src/shared/auth/rls-context.ts`, `src/shared/projection/manifest.ts`, `.env*`, `pnpm-lock.yaml` |
| Required gates | `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`, `npx prisma validate`, `node .ai-pipeline/scripts/verify-encoding.mjs`, `git diff --check` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `NONE: /deliver → /resolve` (T0 directive: DỪNG TRƯỚC MERGE; không deploy) |

> CRITICAL + NONE được T0 chấp nhận tường minh. Worker authority không mở rộng; chỉ thêm UI/API surface dùng allowlist projection + L1+L2 RLS đã có. `linkLaborProfileWorker` CAS (PR #107) và `LaborProfile.workerId` ownership (PR #82) giữ nguyên.

## 1. Outcome

### 1.1 User-visible outcome

- `/admin/workers` là bề mặt quản trị Người lao động có đủ 4 đường: list, detail, edit, status/delete an toàn.
- CTA trên list: `+ Tiếp nhận người lao động` dẫn tới `/admin/labor-profiles/new` (KHÔNG POST thẳng `/api/workers`).
- Bảng gọn: mã, họ tên, điện thoại, trạng thái làm việc, dự án/vị trí hiện tại nếu relation hỗ trợ, ngày tạo, thao tác (Xem chi tiết). Row dẫn sang `/admin/workers/[id]`.
- `/admin/workers/[id]` hiển thị 7 section từ schema hiện có (Nhận diện, Liên hệ, Giấy tờ, Việc làm, Ngân hàng, Liên kết & phân công, Audit cơ bản) với `projectWorker` (mask theo permission). Sensitive field chỉ hiện khi caller có `CAN_VIEW_WORKER_SENSITIVE`; CCCD issued metadata chỉ hiện khi `canSeeSensitive`; `cccdChipData` LUÔN omit.
- Form edit (client) ở detail: dirty tracking chỉ gửi field user thực sửa; tuyệt đối không submit chuỗi mask `***`; sensitive field ẩn hoàn toàn khi không có `CAN_VIEW_WORKER_SENSITIVE`; ADMIN + HR_MANAGER mới có writer authority; HR_STAFF chỉ xem.
- "Đã nghỉ" (TERMINATED) là cách kết thúc chính thức; "Xóa vĩnh viễn" chỉ ADMIN và chỉ dành cho Worker orphan (không còn LaborProfile link, ProjectAssignment, Ticket, attendance, payroll, history, submission, placement, dependents, source claim, episode, handled profile).
- API: GET `/api/workers/[id]` (mới — projected DTO), PATCH `/api/workers/[id]` (sửa field edit với Zod strict allowlist, không nhận `workerId`/`userId`/`accountUserId`/`ownerId`/`assignedToId`/`managerId` từ client), DELETE `/api/workers/[id]` (ADMIN-only với idempotency key, typed 409 nếu còn dependency).
- `POST /api/workers` hiện hữu vẫn giữ theo compatibility (manifest đã khai báo `WORKER_MUTATE` surface) nhưng KHÔNG còn được gọi từ admin UI. T0 directive: "Nếu có compatibility consumer thực tế, giữ API nhưng ghi debt và tuyệt đối không dùng từ admin UI."

### 1.2 Non-goals

- KHÔNG tạo Worker mới từ `/admin/workers` (CTA đi về intake).
- KHÔNG sửa `linkLaborProfileWorker` / conversion service / `LaborProfile.workerId` (PR #107, PR #82).
- KHÔNG sửa role-guard / sidebar.
- KHÔNG thêm schema / migration / seed data.
- KHÔNG cho phép sửa `userId`, `accountUserId`, `ownerId`, `assignedToId`, `managerId`, `workerId` từ API.
- KHÔNG mở rộng role matrix ngoài `ADMIN` + `HR_MANAGER` writer.
- KHÔNG cascade / set-null / xóa lịch sử.
- KHÔNG spread raw Prisma row; mọi response phải qua `projectWorker`.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `app/admin/workers/page.tsx:173-176` chứa `+ Thêm người lao động`; Modal `submit()` line 36-49 POST `/api/workers` | Vi phạm decision bắt buộc: người chưa chuyển đổi phải qua LaborProfile, không tạo Worker rời rạc |
| `EV-02` | `prisma/schema.prisma:247-313` định nghĩa `Worker` với 13 relation: dependents, tickets, assignments, sourceClaims, submissions, mergedSubmissions, laborProfile, episodes, owner/assignedTo/account/manager | Toàn bộ FK phải được quét khi DELETE |
| `EV-03` | `prisma/schema.prisma` các model có FK ngược về `workers.id`: Dependent (316), CandidateSubmission.workerId (658), SourceClaim.workerId (726), ProjectAssignment.workerId (764), WorkerDeduction.workerId (884), AttendanceEvent.workerId (900), TimesheetLine.workerId (943), TimesheetAdjustment.workerId (968), VendorStatementLine.workerId (1076), ClientStatementLine.workerId (1110), Ticket.workerId (1176), CommissionLedger.workerId (1365), LaborProfile.workerId (1528), EmploymentEpisode.workerId (1571) | 14 dependency table + 1 merged = 15 sweep khi DELETE |
| `EV-04` | `src/shared/auth/worker-projection.ts:98-145` `projectWorker` đã implement allowlist + mask theo permission | Tận dụng làm DTO cho GET / PATCH / DELETE response |
| `EV-05` | `src/domains/staffing/order.service.ts:618-730` `deleteStaffingOrder` là canonical pattern: role guard, advisory lock `pg_advisory_xact_lock`, snapshot → re-read dưới lock, dependency check, delete | Pattern để mirror cho `deleteWorker` |
| `EV-06` | `app/api/staffing/orders/[id]/route.ts:325-394` DELETE dùng `withIdempotency` với `x-idempotency-key` | Pattern idempotency áp dụng cho DELETE Worker |
| `EV-07` | `app/api/admin/labor-profiles/[id]/route.ts:78-150` PATCH + 4-layer masked defense: dirty tracking + sensitive UI gate + API permission gate + service reject `*` | Worker edit copy cùng pattern |
| `EV-08` | `src/shared/projection/manifest.ts:99-112` đã khai `WORKER_LIST` + `WORKER_MUTATE` + `WORKER_SELF`; task dùng `WORKER_MUTATE` cho PATCH; GET detail reuse cùng allowedRoles/gating | Không cần mở rộng manifest |
| `EV-09` | `src/domains/workforce/worker-ui.ts:5-9` `WORKER_STATUS_LABELS` (NONE: 'Chưa rõ', ACTIVE: 'Đang làm', SUSPENDED: 'Tạm ngưng', TERMINATED: 'Đã nghỉ') + `workerStatusLabel/Tone` | Tận dụng cho UI |
| `EV-10` | `app/api/workers/route.ts:96-163` POST hiện có; admin UI list không còn gọi nó sau thay đổi; directive: "giữ API nhưng ghi debt" | Debt: legacy POST giữ, không tác động UI |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-W1` | CTA list: đổi label `+ Thêm người lao động` → `+ Tiếp nhận người lao động`; onClick → `router.push('/admin/labor-profiles/new')`; KHÔNG render Modal POST. | `CHOSEN` |
| `DEC-W2` | List columns: mã (userId), họ tên, điện thoại, trạng thái, dự án/vị trí hiện tại (text "—" nếu relation trống), ngày tạo, thao tác. | `CHOSEN` |
| `DEC-W3` | Row action: nút `Xem` dẫn sang `/admin/workers/[id]` (replace Modal Edit flow). Modal POST/PUT của page cũ giữ nhưng KHÔNG hiện từ list. | `CHOSEN` |
| `DEC-W4` | `/admin/workers/[id]`: Server Component, render 7 section grid. Section "Liên kết & phân công" lấy `data.assignments[]` (ProjectAssignment) nếu có, kèm trạng thái. Section "Audit cơ bản": createdAt, updatedAt, owner/assignedTo/manager display. | `CHOSEN` |
| `DEC-W5` | Edit form (client component) inline trong detail: mặc định ẩn, bật nút "Sửa thông tin" → chuyển sang edit mode. Field nhạy cảm (CCCD, CCCD issued, bank 3 field) ẩn hoàn toàn nếu !canSeeSensitive. Submit gọi PATCH. | `CHOSEN` |
| `DEC-W6` | Form dirty tracking: so sánh giá trị hiện tại với initial snapshot; chỉ gửi field thay đổi. Mask character `*` ở CCCD/phone/bank là KHÔNG hợp lệ — chặn ngay client. | `CHOSEN` |
| `DEC-W7` | API PATCH `/api/workers/[id]`: zod `.strict()` chỉ chấp nhận field edit: `fullName, phone, cccdNumber, cccdImageUrl, selfieImageUrl, dateOfBirth, gender, maritalStatus, permanentAddress, currentAddress, hometown, ethnicGroup, religion, nationality, cccdIssuedDate, cccdIssuedPlace, cccdExpiryDate, taxCode, insuranceCode, bankAccount, bankName, bankBranch, profileStatus, employmentStatus, riskStatus, ownerId, assignedToId, managerId`. Mỗi field optional + có ràng buộc riêng. REJECT `userId, accountUserId, workerId` qua `.strict()`. Sensitive (masked + issued) chỉ ghi khi caller có `CAN_VIEW_WORKER_SENSITIVE`. | `CHOSEN` |
| `DEC-W8` | PATCH 403 nếu cố sửa ownership (`ownerId/assignedToId/managerId`) mà caller không phải ADMIN. | `CHOSEN` |
| `DEC-W9` | DELETE `/api/workers/[id]`: ADMIN-only, idempotent qua `x-idempotency-key` + `withIdempotency`. Service `deleteWorker` chạy trong `withDbContext` transaction: advisory lock `pg_advisory_xact_lock((hashtext('hrp:worker:'||id)::bigint) & 9223372036854775807::bigint)`; snapshot Worker; sweep 14 dependency + 1 merged; nếu còn bất kỳ → 409 `WORKER_NOT_DELETABLE` + danh sách `blockingFacts`; nếu sạch → `tx.worker.delete({where:{id}})` + audit log `WORKER_PERMANENT_DELETE`. | `CHOSEN` |
| `DEC-W10` | Dependency sweep: `LaborProfile.workerId`, `EmploymentEpisode.workerId`, `ProjectAssignment.workerId`, `Ticket.workerId`, `Dependent.workerId`, `AttendanceEvent.workerId`, `TimesheetLine.workerId`, `TimesheetAdjustment.workerId`, `WorkerDeduction.workerId`, `VendorStatementLine.workerId`, `ClientStatementLine.workerId`, `CommissionLedger.workerId`, `SourceClaim.workerId`, `CandidateSubmission.workerId` + `CandidateSubmission.mergedWorkerId`. Không cascade, không set-null. | `CHOSEN` |
| `DEC-W11` | POST `/api/workers` legacy: giữ nguyên. Admin UI list/detail KHÔNG bao giờ gọi. Ghi debt trong HANDOFF §`Open Debts`. | `CHOSEN` |
| `DEC-W12` | GET `/api/workers/[id]`: ADMIN + HR_MANAGER + HR_STAFF + PM + ACCOUNTANT + SALE + DIRECTOR (giống LIST). Trả `{ worker: projectWorker(row, { hasSensitivePermission, action: 'DETAIL' }) }`. 404 fail-closed nếu ngoài row scope. | `CHOSEN` |
| `DEC-W13` | Sensitive permission check ở 3 layer: UI ẩn field khi !canSeeSensitive, route 403 khi writer thiếu, service guard reject input chứa `*`. | `CHOSEN` |
| `DEC-W14` | Tests: tối thiểu 4 file mới — (a) `app/admin/workers/__tests__/workers-list-cta.test.tsx`; (b) `app/admin/workers/__tests__/worker-detail-sections.static.test.ts`; (c) `app/api/workers/__tests__/route-get-patch-delete.test.ts`; (d) `src/domains/workforce/worker.service.test.ts`. | `CHOSEN` |
| `DEC-W15` | Status update qua PATCH (cùng route, field `employmentStatus`): chỉ chấp nhận 4 giá trị enum hiện có `NONE | ACTIVE | SUSPENDED | TERMINATED`; HR_MANAGER + ADMIN; HR_STAFF 403. TERMINATED ghi lịch sử (audit log + giữ nguyên row — không cascade). | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Worker detail DTO | `projectWorker` (allowlist, manifest) | `ADOPT` | in-repo | `src/shared/auth/worker-projection.ts` at baseline `0626ba28` | route layer truyền `action: 'DETAIL'`; giữ nguyên helper | DEC-04/DEC-05 đã cover; reuse tránh leak |
| Idempotency | `withIdempotency` + `getIdempotencyKey` | `ADOPT` | in-repo | `src/shared/integrity/idempotency.ts` | DELETE Worker bọc `withIdempotency` y hệt DELETE StaffingOrder | DEC-W9; tránh tự xây idempotency |
| Status label | `WORKER_STATUS_LABELS` | `ADOPT` | in-repo | `src/domains/workforce/worker-ui.ts` | tái sử dụng | DEC-09; tiếng Việt canonical |
| Advisory lock | `pg_advisory_xact_lock` pattern | `ADOPT` | in-repo | `src/domains/staffing/order.service.ts` at baseline | mirror key shape `hrp:worker:<id>` (không collide `p1a04:order:`) | DEC-W9; canonical primitive |
| Zod strict allowlist | `zod` (in deps) | `ADOPT` | in deps | `zod@^3.24.1` | schema mới, không thêm dep | DEC-W7 |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| Worker delete (atomic with deps sweep) | `withDbContext` transaction | `N/A` | in-transaction business logic | Authority là `Worker` row + audit log; không giao nền tảng ngoài | `withIdempotency` ở route layer | AuditLog `WORKER_PERMANENT_DELETE` + outbox (reuse `enqueueOutbox`) | DEC-W9; locality tại DB transaction là bắt buộc để chống race |

- `N/A` reason: task không tạo/thay connector, scheduler, notification worker hay multi-system workflow. Delete Worker là mutation đơn-aggregate trong DB transaction; idempotency đã có ở route.

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `/admin/workers` list render Worker rows; CTA `+ Tiếp nhận người lao động` dẫn tới `/admin/labor-profiles/new`; không có nút POST Worker trực tiếp. |
| `RQ-02` | Bảng 6 cột: mã, họ tên, điện thoại, trạng thái làm việc (StatusBadge + workerStatusLabel), dự án/vị trí hiện tại (text "—" nếu relation trống), ngày tạo, thao tác. |
| `RQ-03` | Row action "Xem" mở `/admin/workers/[id]`; row dùng RowLink contract (anchor overlay, focusable). |
| `RQ-04` | `/admin/workers/[id]` Server Component; render đủ 7 section: Nhận diện, Liên hệ, Giấy tờ, Việc làm, Ngân hàng, Liên kết & phân công, Audit cơ bản. |
| `RQ-05` | Section "Liên kết & phân công" list các `ProjectAssignment` active (nếu có) kèm `project.code` hoặc "—"; list `LaborProfile` liên kết (nếu có) với link `/admin/labor-profiles/[id]`. |
| `RQ-06` | Edit mode (client component) chỉ mount khi `canEdit = isAdmin || isHRManager`; sensitive field (CCCD/bank) ẩn hoàn toàn nếu `!canSeeSensitive`. |
| `RQ-07` | Form dirty tracking: chỉ gửi field user thay đổi; mask `*` reject client-side trước khi gửi. |
| `RQ-08` | API GET `/api/workers/[id]` trả `{ worker: projectWorker(row, { action: 'DETAIL' }) }`; 401/403/404 theo chuẩn. |
| `RQ-09` | API PATCH `/api/workers/[id]` zod strict; reject `userId, accountUserId, workerId`; HR_STAFF 403; thiếu `CAN_VIEW_WORKER_SENSITIVE` 403; masked input 400 `INVALID_INPUT`; 409 fail-closed nếu cố sửa ownership non-ADMIN; response `{ worker }` (projected). |
| `RQ-10` | API DELETE `/api/workers/[id]` ADMIN-only, yêu cầu `x-idempotency-key`; 404 ngoài row scope; 409 `WORKER_NOT_DELETABLE` nếu còn dep; 200 `{ worker: { id, deleted: true } }` khi xóa thành công; idempotent replay với cùng key → 200 cùng body. |
| `RQ-11` | Worker delete service: advisory lock `pg_advisory_xact_lock` cho `hrp:worker:<id>`; sweep 15 dependency; không cascade / set-null; chỉ delete Worker row + audit log + outbox. |
| `RQ-12` | Status update qua PATCH field `employmentStatus`; chỉ chấp nhận 4 giá trị enum; HR_MANAGER + ADMIN; HR_STAFF 403. |
| `RQ-13` | Regression tests: tối thiểu 4 file mới (xem DEC-W14). |
| `RQ-14` | Copy tiếng Việt canonical: "Người lao động" (không "Nhân viên"); "Đã nghỉ" (TERMINATED); "Xóa vĩnh viễn" (permanent delete); "Xem" (Xem chi tiết); "Sửa thông tin" (Edit). |
| `RQ-15` | Encoding UTF-8 no-BOM, không churn file ngoài allowlist. |

### 4.2 Scope boundaries

- **In:** xem Decision §3 / Execution Plan §5.
- **Out:** `prisma/schema.prisma`, `prisma/migrations/**`, `prisma/seed.mjs`, `package.json` (no dep bump), `src/domains/applications/conversion.service.ts` (PR #107 authority), `src/domains/talent/labor-profile.service.ts` (PR #82), `src/domains/talent/conversion*.ts`, `src/shared/auth/with-db-context.ts`, `with-authorized-db.ts`, `with-auth-scope.ts`, `rls-context.ts`, `src/shared/projection/manifest.ts`, `scripts/ci/**`, `vitest.*.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `app/api/workers/me/**` (self-profile scope), `app/api/workers/route.ts` (giữ nguyên, không refactor), `app/admin/recruiter-workbench/**`, `app/admin/applications/**`, `.env*`, `pnpm-lock.yaml`, `.gitignore`, `docs/tasks/hrp-t1b-pre-p2-intake-worker-separation/**` (PR #82).
- **Allowed task artifacts:** `docs/tasks/hrp-t1b-pre-p2-worker-management-hotfix/**` (gồm `TASK.md` + `HANDOFF.md`).

### 4.3 Domain boundaries

- **Data/state:** Worker là row canonical; LaborProfile là intake; LaborProfile.workerId = Worker.id (0..1) đã pin từ PR #82. Không thay đổi ownership invariant. Status 5-field (profileStatus/employmentStatus/riskStatus) giữ schema. Sensitive 6-field (SIX) + 3 issued fields giữ manifest mask.
- **Permission/security:** Role matrix writer = `ADMIN | HR_MANAGER`; delete = `ADMIN` only; sensitive view = `CAN_VIEW_WORKER_SENSITIVE`; 4-layer mask defense. L1+L2 RLS giữ nguyên (HR_STAFF scope `assignedToId === ctx.userId`; PM scope qua `assignments`).
- **Interface/API:**
  - GET `/api/workers/[id]` (NEW)
  - PATCH `/api/workers/[id]` (replaces PUT semantics; PUT alias backward-compat)
  - DELETE `/api/workers/[id]` (NEW; ADMIN-only, idempotency required)
  - POST `/api/workers` (untouched; debt log; không gọi từ UI)
- **Migration/rollback:** Không migration. Rollback = revert single commit. Schema không đổi; không cần backfill. Audit log giữ lịch sử.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `src/domains/workforce/worker.types.ts` (NEW) + `src/domains/workforce/worker.service.ts` (NEW) | Tạo `WorkerServiceError` codes; `getWorkerDetail(tx, ctx, id)`; `updateWorkerProfile(tx, ctx, id, patch)`; `deleteWorker(tx, ctx, id)`; helper `acquireWorkerAdvisoryLock`; dependency sweep trả 15 `blockingFacts`. | `npm run test:unit -- worker.service` | — |
| `STEP-02` | `app/api/workers/[id]/route.ts` | Thêm GET, PATCH, DELETE; PUT alias backward-compat. Map `WorkerServiceError` → 400/401/403/404/409; idempotency cho DELETE. | `npm run test:unit -- route-get-patch-delete` | — |
| `STEP-03` | `app/admin/workers/[id]/page.tsx` (NEW Server) + `worker-edit-form.tsx` (NEW Client) + `worker-status-form.tsx` (NEW Client) + `worker-delete-button.tsx` (NEW Client) | Detail 7 sections; edit form dirty tracking; status form; delete button. | `npm run test:unit -- worker-detail-sections.static` | — |
| `STEP-04` | `app/admin/workers/page.tsx` | List render WorkerRow với 6 cột; CTA `+ Tiếp nhận người lao động` → `/admin/labor-profiles/new`; row dùng RowLink; bỏ Modal POST/PUT. | `npm run test:unit -- workers-list-cta` | — |
| `STEP-05` | Tests (4 file mới) | Regression fence theo DEC-W14. | `npm run test:unit` (full lane) | — |
| `STEP-06` | Gates: typecheck + lint + build + prisma validate + verify-encoding + diff-check. Tất cả PASS. | `npm run typecheck && npm run lint && npm run build && npx prisma validate && node .ai-pipeline/scripts/verify-encoding.mjs && git diff --check` | All exit 0 | — |
| `STEP-07` | Commit (forward-only, single commit); push branch. HANDOFF 40–60 dòng. | `git log` show 1 commit ahead of `origin/main`; HANDOFF pin SHA. | — | — |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `/admin/workers` KHÔNG chứa `+ Thêm người lao động` text cũ; CTA đổi thành `+ Tiếp nhận người lao động` và onClick gọi `router.push('/admin/labor-profiles/new')` (không `setShowCreate(true)`). | `grep -c "Thêm người lao động" app/admin/workers/page.tsx` returns 0; `grep -c "Tiếp nhận người lao động" app/admin/workers/page.tsx` returns ≥1. |
| `AC-02` | List page KHÔNG gọi `POST /api/workers`; không còn `setShowCreate`. | `grep -n "POST /api/workers" app/admin/workers/page.tsx` returns empty; `grep -n "setShowCreate" app/admin/workers/page.tsx` returns empty. |
| `AC-03` | List 6 cột đúng thứ tự: mã (userId), họ tên, điện thoại, trạng thái, dự án/vị trí hiện tại (text "—"), ngày tạo, thao tác. | `grep -n "Mã người dùng" app/admin/workers/page.tsx`; `grep -n "Dự án" app/admin/workers/page.tsx`; assert `['Mã người dùng','Họ tên','Điện thoại','Trạng thái','Dự án / Vị trí hiện tại','Ngày tạo','Thao tác']`. |
| `AC-04` | `/admin/workers/[id]` render đủ 7 section với title Tiếng Việt: Nhận diện, Liên hệ, Giấy tờ, Việc làm, Ngân hàng, Liên kết & phân công, Audit cơ bản. | `grep -c "Nhận diện" app/admin/workers/[id]/page.tsx` ≥ 1; `grep -c "Liên hệ" app/admin/workers/[id]/page.tsx` ≥ 1; `grep -c "Giấy tờ" app/admin/workers/[id]/page.tsx` ≥ 1; `grep -c "Việc làm" app/admin/workers/[id]/page.tsx` ≥ 1; `grep -c "Ngân hàng" app/admin/workers/[id]/page.tsx` ≥ 1; `grep -c "Liên kết" app/admin/workers/[id]/page.tsx` ≥ 1; `grep -c "Audit cơ bản" app/admin/workers/[id]/page.tsx` ≥ 1. |
| `AC-05` | Detail page KHÔNG hiển thị `cccdChipData`. | `grep -n "cccdChipData" app/admin/workers/[id]/page.tsx` returns empty. |
| `AC-06` | `getWorkerDetail` trả row đã project; ADMIN thấy CCCD; HR_STAFF (no sensitive perm) thấy `'***'`. | `npm run test:unit -- route-get-patch-delete` — `it('projects CCCD for ADMIN with sensitive perm', ...)`; `it('masks CCCD for HR_STAFF without sensitive perm', ...)`. |
| `AC-07` | PATCH 403 với HR_STAFF. | `npm run test:unit -- route-get-patch-delete` — `it('PATCH returns 403 for HR_STAFF', ...)`. |
| `AC-08` | PATCH 403 với writer (HR_MANAGER) thiếu `CAN_VIEW_WORKER_SENSITIVE`. | `npm run test:unit -- route-get-patch-delete` — `it('PATCH returns 403 when writer lacks CAN_VIEW_WORKER_SENSITIVE', ...)`. |
| `AC-09` | PATCH 400 `INVALID_INPUT` khi body chứa `userId`, `accountUserId`, `workerId`. | `npm run test:unit -- route-get-patch-delete` — `it('PATCH rejects userId/accountUserId/workerId in body (zod strict)', ...)`. |
| `AC-10` | PATCH 400 `INVALID_INPUT` khi cccdNumber chứa ký tự `*`. | `npm run test:unit -- route-get-patch-delete` — `it('PATCH rejects masked-shape cccdNumber containing "*"', ...)`. |
| `AC-11` | PATCH 200 với ADMIN + sensitive perm + chỉ gửi 1 field dirty; response trả `{ worker }` projected (no raw spread). | `npm run test:unit -- route-get-patch-delete` — `it('PATCH success: dirty partial update returns projected DTO', ...)`. |
| `AC-12` | DELETE 403 với HR_MANAGER (chỉ ADMIN). | `npm run test:unit -- route-get-patch-delete` — `it('DELETE returns 403 for HR_MANAGER', ...)`. |
| `AC-13` | DELETE 400 `VALIDATION_ERROR` khi thiếu `x-idempotency-key`. | `npm run test:unit -- route-get-patch-delete` — `it('DELETE returns 400 when x-idempotency-key missing', ...)`. |
| `AC-14` | DELETE 409 `WORKER_NOT_DELETABLE` với từng dependency chính (LaborProfile link, ProjectAssignment, Ticket, SourceClaim, EmploymentEpisode, Dependents, AttendanceEvent, TimesheetLine, WorkerDeduction, VendorStatementLine, ClientStatementLine, CommissionLedger, CandidateSubmission, CandidateSubmission.mergedWorkerId). | `npm run test:unit -- worker.service` — 14 `it('deleteWorker throws WORKER_NOT_DELETABLE when <dependency> exists', ...)`. |
| `AC-15` | DELETE 200 với Worker orphan (15 sweep đều 0). | `npm run test:unit -- worker.service` — `it('deleteWorker succeeds on orphan worker', ...)`. |
| `AC-16` | DELETE 404 khi worker ngoài row scope (HR_STAFF không phải assignedTo). | `npm run test:unit -- worker.service` — `it('deleteWorker throws NOT_FOUND when worker out of HR_STAFF row scope', ...)`. |
| `AC-17` | DELETE idempotent: cùng `x-idempotency-key` → cùng response 200 (replay); khác body → 409 IDEMPOTENCY_CONFLICT. | `npm run test:unit -- route-get-patch-delete` — `it('DELETE replays same body with same idempotency key')`; `it('DELETE returns 409 IDEMPOTENCY_CONFLICT when key reused with different body', ...)`. |
| `AC-18` | Race: dependency tạo concurrent giữa snapshot và re-read → vẫn 409 (re-read dưới lock). | `npm run test:unit -- worker.service` — `it('deleteWorker detects new dependency created between snapshot and re-read (fail-closed)', ...)`. |
| `AC-19` | Audit log `WORKER_PERMANENT_DELETE` được tạo với actorUserId, before=null, after={id, fullName}, reason. | `npm run test:unit -- worker.service` — `it('deleteWorker writes WORKER_PERMANENT_DELETE audit log with actor and reason', ...)`. |
| `AC-20` | Status update: PATCH employmentStatus=TERMINATED → 200; row employmentStatus vẫn 'TERMINATED' (giữ lịch sử); không cascade. | `npm run test:unit -- route-get-patch-delete` — `it('PATCH employmentStatus=TERMINATED persists without cascade', ...)`. |
| `AC-21` | Conversion CAS flow (PR #107) không bị ảnh hưởng: `linkLaborProfileWorker` không bị sửa. | `git diff --name-only HEAD -- src/domains/applications/conversion.service.ts` returns empty. |
| `AC-22` | `LaborProfile.workerId` ownership (PR #82) không bị ảnh hưởng: `labor-profile.service.ts` không bị sửa. | `git diff --name-only HEAD -- src/domains/talent/labor-profile.service.ts` returns empty. |
| `AC-23` | Manifest `WORKER_LIST` / `WORKER_MUTATE` / `WORKER_SELF` không bị sửa. | `git diff --name-only HEAD -- src/shared/projection/manifest.ts` returns empty. |
| `AC-24` | `projectWorker` không bị sửa (ta chỉ tái sử dụng; không đụng allowlist). | `git diff --name-only HEAD -- src/shared/auth/worker-projection.ts` returns empty. |
| `AC-25` | `npm run typecheck` exit 0. | `npm run typecheck` shell command exit 0. |
| `AC-26` | `npm run lint` exit 0 (warning OK). | `npm run lint` shell command exit 0. |
| `AC-27` | `npm run test:unit` exit 0 (existing + ≥ 4 file test mới). | `npm run test:unit` shell command exit 0. |
| `AC-28` | `npm run build` exit 0. | `npm run build` shell command exit 0. |
| `AC-29` | `npx prisma validate` exit 0. | `npx prisma validate` shell command exit 0. |
| `AC-30` | `node .ai-pipeline/scripts/verify-encoding.mjs` PASS (no BOM, valid UTF-8). | `node .ai-pipeline/scripts/verify-encoding.mjs` shell command RESULT: PASS. |
| `AC-31` | `git diff --check HEAD` exit 0. | `git diff --check HEAD` shell command exit 0. |
| `AC-32` | Stage đúng allowlist: `git status --porcelain` chỉ liệt kê file trong `app/admin/workers/**`, `app/api/workers/**`, `src/domains/workforce/**`, `src/domains/admin/workers-route.test.ts`, `docs/tasks/hrp-t1b-pre-p2-worker-management-hotfix/**`. | `git status --porcelain` review manual. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-04` | `AC-01`, `AC-02` |
| `RQ-02` | `STEP-04` | `AC-03` |
| `RQ-03` | `STEP-04` | `AC-03` |
| `RQ-04` | `STEP-03` | `AC-04`, `AC-05` |
| `RQ-05` | `STEP-03` | `AC-04` |
| `RQ-06` | `STEP-03` | `AC-07`, `AC-08` |
| `RQ-07` | `STEP-03`, `STEP-02` | `AC-10`, `AC-11` |
| `RQ-08` | `STEP-02` | `AC-06` |
| `RQ-09` | `STEP-02` | `AC-09`, `AC-10`, `AC-11` |
| `RQ-10` | `STEP-02`, `STEP-01` | `AC-12`, `AC-13`, `AC-15`, `AC-17` |
| `RQ-11` | `STEP-01` | `AC-14`, `AC-15`, `AC-16`, `AC-18`, `AC-19` |
| `RQ-12` | `STEP-02` | `AC-20` |
| `RQ-13` | `STEP-05` | `AC-25`, `AC-27` |
| `RQ-14` | `STEP-03`, `STEP-04` | `AC-04`, `AC-25`, `AC-27` |
| `RQ-15` | `STEP-06` | `AC-30` |
| — (guard) | guards | `AC-21`, `AC-22`, `AC-23`, `AC-24` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | DELETE Worker có thể chạm row ngoài row scope → L2 RLS `WITH CHECK` chặn non-allowed; service `deleteWorker` dùng `withDbContext` (L2-only, không qua L1). | Sticky manual test AC-16; nếu fail thêm pre-check `tx.worker.findFirst({where: {id, ...buildWorkerScope(ctx)}})` ở service. |
| `RISK-02` | Idempotency key reuse cross-request: TTL 24h; cùng actor+route+key → replay. | Pattern đã dùng ở DELETE StaffingOrder; AC-17 cover. |
| `RISK-03` | 15 dependency table: thiếu 1 → xóa nhầm. | DEC-W10 enumerate đầy đủ; AC-14 test 14 trường hợp. |
| `RISK-04` | 4-layer mask defense mỗi layer có thể leak. | 3 layer enforce: UI ẩn + form chặn `*` + API 400 + service 400. AC-10 + AC-11 cover. |
| `RISK-05` | `prisma.validate` không đụng migration nhưng schema vẫn phải khớp Prisma client đã generate. | `npm run build` gọi `prisma generate` qua Next.js build. |
| `RISK-06` | Existing test cũ (`workers-route.test.ts`) cover POST/PUT; task mở rộng PATCH. PUT giữ nguyên. | Run full lane sau step 02; nếu fail → fix test cũ hoặc route nhỏ nhất. |
| `RISK-07` | Vitest tinypool flake (PR #110 đã gặp): chạy lại 1 lần nếu exit non-zero với `Worker exited unexpectedly` nhưng test pass. | Retry 1 lần. |
| `RISK-08` | Conflict với task khác đang chạy parallel: directive rõ ràng file ownership. | `git worktree list` confirm; `origin/main` SHA pin. |

## 8. Open Questions

- None. T0 directive đã chốt toàn bộ business rule; kỹ thuật Tier 1 tự quyết trong pattern hiện hữu.

## 9. Planner Resolution

Tier 1 append sau review/audit. Audit NONE resolve trực tiếp từ HANDOFF; LIGHT resolve từ AUDIT.

| Round | Decision | Reason |
|---|---|---|
| 0 | Tier 1 execute per STEP-01..07 | Plan đã READY_TO_CODE; T0 chỉ định self-review |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-06 | Initial contract | T0 directive `T0 → T1B — PRE-P2 HOTFIX: HOÀN THIỆN QUẢN TRỊ NGƯỜI LAO ĐỘNG` |
