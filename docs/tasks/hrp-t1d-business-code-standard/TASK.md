# TASK — `hrp-t1d-business-code-standard`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1d-business-code-standard` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Generator trở thành authority duy nhất cho 5 entity business code; race-safety + immutability + backward-compat (strict reject 400) là correctness contract. CRITICAL + LIGHT là default theo lane matrix. |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `e98eb1ba38736722b72e6cc8e6099553c71e027f` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `src/shared/business-code/`, `src/domains/staffing/order.service.ts`, `src/domains/applications/conversion.service.ts`, `app/api/clients/`, `app/api/projects/`, `app/api/vendors/`, `app/api/staffing/orders/`, `app/admin/clients/`, `app/admin/projects/`, `app/admin/vendors/`, `app/admin/staffing/staffing-list-client.tsx` |
| Forbidden paths | `prisma/schema.prisma`, `prisma/migrations/**`, `prisma/seed.mjs`, `app/api/workers/route.ts` (đã 410 GONE), `StaffingOrder.code` generator (out of scope) |
| Required gates | (chạy theo thứ tự) `pnpm typecheck`; `pnpm lint`; `pnpm test:unit`; `pnpm test:integration`; `pnpm build`; `pwsh .ai-pipeline/scripts/verify-encoding.ps1`; `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1d-business-code-standard/TASK.md` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `LIGHT: /deliver → /audit → /resolve` |

> Lane và audit là hai quyết định riêng. FAST mặc định NONE; STANDARD mặc định NONE; CRITICAL mặc định LIGHT. CRITICAL + LIGHT đã chọn; lý do ghi ở `Audit reason`.

> Chỉ chuyển `READY_FOR_EXECUTION` khi `Contract gate = READY_TO_CODE`, `Decision state = CLOSED`, environment đã `READY`, baseline và file ownership đã pin. V2 chỉ có một consolidated correction batch sau audit.

## 1. Outcome

### 1.1 User-visible outcome

- Tạo mới `ClientCompany`, `Project`, `Vendor`, `Worker` (qua conversion), `StaffingOrderSlot` — hệ thống **tự sinh mã** theo format chuẩn (`CC-nnn`, `PRJ-YYYY-nnn`, `VD-nnn`, `USR-EMP-nnn`, `POS-nnn`).
- UI tương ứng **không có** input mã; response trả về mã server vừa sinh để hiển thị.
- Race-safe: 2 admin cùng tạo trong cùng tick → 2 mã khác nhau, không P2002.
- Strict reject: API trả `400 SERVER_GENERATED_CODE` nếu client cố gửi `code` / `userId` / `positionCode` trong body.

### 1.2 Non-goals

- KHÔNG migration schema.
- KHÔNG backfill mã legacy (`GEN`, `ELECTRICIAN`, `USR-001`, `APP-<id>`, các `PRJ-…` admin tự nhập trước) — generator regex `^<PREFIX>-\d+$` bỏ qua khi tìm MAX.
- KHÔNG refactor `StaffingOrder.code` generator (đã đúng, giữ làm reference).
- KHÔNG sinh lại `JobPosting.slug`, `User.affCode`, `Contract.contractNo`, `Permission.code` (ngoài scope).
- KHÔNG thêm dependency mới.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `prisma/schema.prisma:341,379,420,616` — 4 entity có `code` UNIQUE (`ClientCompany`, `Project`, `StaffingOrder`, `Vendor`) | Xác nhận schema hiện tại; xác nhận KHÔNG cần migration |
| `EV-02` | `prisma/schema.prisma:247-249` — `Worker.id @default(uuid())`, `userId String @unique @map("user_id")` | Sửa khảo sát vòng 1: Worker ĐÃ có business code tại `userId` (UNIQUE, immutable theo comment "KHÔNG đổi (F16)") |
| `EV-03` | `prisma/schema.prisma:491-513` — `StaffingOrderSlot.positionCode String @map("position_code")` | Xác nhận field cần sinh tự động theo DEC-T0-05 |
| `EV-04` | `src/domains/staffing/order.service.ts:54-66` — `generateOrderCode` dùng `pg_advisory_xact_lock(hashtext('staffing_order_code'))` + `MAX(SUBSTRING(code FROM 4)::bigint)` + 1 | Pattern race-safe đã chứng minh production; tái sử dụng cho 5 kind mới |
| `EV-05` | `app/api/clients/route.ts:99-130` — `POST` yêu cầu `code` trong body; `app/api/projects/route.ts:159-190` — tương tự; `app/api/vendors/route.ts:96-110` — tương tự | Xác nhận cần refactor 3 route POST |
| `EV-06` | `app/api/clients/[id]/route.ts:60-80`, `app/api/projects/[id]/route.ts:60-90`, `app/api/vendors/[id]/route.ts:45-65` — `data:` spread KHÔNG chứa `code` | Xác nhận `code` immutable trên 3 entity hiện tại (PUT bỏ field) |
| `EV-07` | `app/api/staffing/orders/route.ts:147-162` — POST yêu cầu `slot.positionCode`; `src/domains/staffing/order.service.ts:147-148` — `createStaffingOrder` map `slot.positionCode` | Cần refactor: bỏ input, dùng `nextBusinessCodeBatch` cho N slot trong 1 tx |
| `EV-08` | `app/api/workers/route.ts:117-145` — POST trả 410 GONE `WORKER_LEGACY_CREATE_DISABLED` | Worker KHÔNG còn tạo rời rạc; flow duy nhất là `conversion.service.ts` |
| `EV-09` | `src/domains/applications/conversion.service.ts:590-602` — `tx.worker.create({ data: { userId: \`APP-${current.id}\`, ... } })` | Production single point tạo Worker; sẽ thay bằng `nextBusinessCode(tx, 'WORKER_USER_ID')` |
| `EV-10` | `app/admin/clients/page.tsx:80-86` (input `code` với placeholder `VD: CC-001`), `app/admin/vendors/page.tsx:74-82` (input `code` với placeholder `VD: VD-001`), `app/admin/projects/projects-table-client.tsx` (modal tạo Project có input `code` với placeholder `VD: PRJ-2026-001`) | UI cần bỏ input mã |
| `EV-11` | `app/admin/staffing/staffing-list-client.tsx:96,140,237` — form tạo StaffingOrder có input `positionCode` default `'GEN'` | UI cần bỏ input `positionCode` |
| `EV-12` | `app/admin/workers/[id]/worker-edit-form.tsx:20` — PATCH body KHÔNG chứa `userId`; `app/admin/workers/[id]/__tests__/worker-detail-sections.static.test.ts:79-83` — enforce | Edit Worker KHÔNG gửi `userId`; đã đúng convention; chỉ cần đảm bảo không tạo route mới cho phép |
| `EV-13` | `tests/db/intake-convert-worker-link.integration.test.ts:219`, `tests/db/aff04-conversion-propagation.integration.test.ts:126`, `src/shared/auth/live-vendor-worker-scope.m1-06b.test.ts:69-72` — test fixture dùng `userId: 'wu-X'` / UUID | Test fixture KHÔNG match regex generator `^USR-EMP-\d+$`; bị bỏ qua khi tìm MAX → test vẫn pass |
| `EV-14` | `prisma/seed.mjs:430-440` — seed dùng `workerUser.id` (UUID) làm `userId` | Seed KHÔNG match regex; bị bỏ qua; seed chạy OK |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | DEC-T0-01 = A: giữ format hiện hành, không backfill. Zero-pad 3 là MIN width, không cap 999. | `CHOSEN` |
| `DEC-02` | DEC-T0-02 = YES: Worker dùng `Worker.userId` (đã có, @unique, immutable), KHÔNG thêm `Worker.code`. | `CHOSEN` |
| `DEC-03` | DEC-T0-03 = NO MIGRATION: không đổi schema, không index, không backfill. Mã legacy giữ nguyên. | `CHOSEN` |
| `DEC-04` | DEC-T0-04 = STRICT REJECT: API trả 400 `SERVER_GENERATED_CODE` nếu body chứa `code` / `userId` / `positionCode`. | `CHOSEN` |
| `DEC-05` | DEC-T0-05: `StaffingOrderSlot.positionCode` trong scope. Server sinh `POS-nnn`. Batch trong cùng tx, KHÔNG query MAX trước nested-create. | `CHOSEN` |
| `DEC-06` | Kiến trúc: 1 module shared `src/shared/business-code/business-code.ts` (nextBusinessCode + nextBusinessCodeBatch + CONFIG). KHÔNG factory, KHÔNG preview API, KHÔNG validate() interface. | `CHOSEN` |

Không có câu hỏi cần Owner quyết khi chuyển READY_FOR_EXECUTION.

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| N/A | — | `N/A` | — | — | — | Task không tạo capability kỹ thuật phổ thông (no editor/form/table/upload/date/chart/queue/email/a11y) và không thêm dependency. Generator là pure function dùng `pg_advisory_xact_lock` (đã có sẵn pattern trong `order.service.ts:54-66`); không có library candidate phù hợp. |

- `ADOPT`: phải pin license, version/source, compatibility và wrapper/test boundary. → N/A.
- `CUSTOM`: phải có marker `CUSTOM_BUILD_JUSTIFICATION` và evidence cụ thể. → N/A.
- `N/A`: ghi lý do task không tạo capability phổ thông và không đổi dependency/shared framework. ✓

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| N/A | — | `N/A` | — | — | — | — | Task không tạo/thay connector, scheduler, notification worker, multi-system/operator workflow. Generator chạy trong application transaction (in-process), không qua orchestration platform. |

- `ORCHESTRATE`: phải pin platform/source, credential/authority boundary, retry/idempotency, observability/recovery và failure fallback. → N/A.
- `CUSTOM`: phải có marker `CUSTOM_AUTOMATION_JUSTIFICATION` và evidence cụ thể. → N/A.
- `N/A`: ghi lý do task không tạo/thay connector, scheduler, notification worker hoặc multi-system/operator workflow. ✓

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `nextBusinessCode(tx, kind)` sinh 1 mã mới cho 1 trong 5 kind: `CLIENT` (`CC-nnn`), `PROJECT` (`PRJ-{YYYY}-nnn`, year-aware), `VENDOR` (`VD-nnn`), `WORKER_USER_ID` (`USR-EMP-nnn`), `STAFFING_ORDER_SLOT_POSITION` (`POS-nnn`). Race-safe qua `pg_advisory_xact_lock(hashtext('<kind>_code'))`. Bảng trống → seq=1. |
| `RQ-02` | `nextBusinessCodeBatch(tx, kind, count)` cấp `count` mã liên tiếp `[next+1..next+count]` trong CÙNG transaction. Một `SELECT MAX`, một advisory lock. |
| `RQ-03` | Khi `kind = 'PROJECT'`, bắt buộc `opts.year ∈ [2000, current_year+10]`. Generator `WHERE code ~ '^PRJ-{year}-[0-9]+$'` tìm max trong scope năm. |
| `RQ-04` | Generator regex `^<PREFIX>-\d+$` (hoặc `^PRJ-\d{4}-\d+$` cho PROJECT) bỏ qua mã legacy không match. |
| `RQ-05` | API `POST /api/clients` nhận body KHÔNG có `code`; nếu gửi `code` → 400 `SERVER_GENERATED_CODE`. Server sinh mã qua `nextBusinessCode(tx, 'CLIENT')`, gán vào `tx.clientCompany.create({ data: { code, name, ... } })`. Response 201 trả `{ client: { code, name, ... } }`. |
| `RQ-06` | API `POST /api/projects` nhận body KHÔNG có `code`; nếu gửi `code` → 400 `SERVER_GENERATED_CODE`. Year = `startDate.getUTCFullYear()`. Server sinh qua `nextBusinessCode(tx, 'PROJECT', { year })`. |
| `RQ-07` | API `POST /api/vendors` nhận body KHÔNG có `code`; nếu gửi `code` → 400. Server sinh qua `nextBusinessCode(tx, 'VENDOR')`. |
| `RQ-08` | `createStaffingOrder` bỏ `slot.positionCode` khỏi `CreateStaffingOrderInput`; sinh batch qua `nextBusinessCodeBatch(tx, 'STAFFING_ORDER_SLOT_POSITION', input.slots.length)`. Gán `slots.create[i].positionCode = batch[i]`. |
| `RQ-09` | `POST /api/staffing/orders` KHÔNG require `positionCode` trong từng slot; nếu body chứa → 400 `SERVER_GENERATED_CODE`. |
| `RQ-10` | Hàm tạo Worker row trong `conversion.service.ts` (line ~590) thay `userId: \`APP-${current.id}\`` bằng `userId: await nextBusinessCode(tx, 'WORKER_USER_ID')`. Type `CreateStaffingOrderInput` không đổi (slot.positionCode có thể optional/ignored). |
| `RQ-11` | UI form tạo Client/Project/Vendor KHÔNG render input mã; sau khi tạo thành công hiển thị mã vừa sinh (toast hoặc modal success). |
| `RQ-12` | UI form tạo StaffingOrder KHÔNG render input `positionCode` cho slot; bỏ luôn default `'GEN'`. |
| `RQ-13` | Test fixture hiện có (dùng string `userId: 'wu-X'`, UUID, hoặc hardcode `userId: 'USR-001'`) KHÔNG bị ảnh hưởng. Generator regex bỏ qua khi tìm MAX. |
| `RQ-14` | Worker tạo qua conversion có `userId` mới dạng `USR-EMP-{nnn}`; chỉ thay đổi production path; seed/test fixture giữ nguyên. |

### 4.2 Scope boundaries

- **In:** `src/shared/business-code/business-code.ts` (NEW); `app/api/clients/route.ts` (POST); `app/api/projects/route.ts` (POST); `app/api/vendors/route.ts` (POST); `app/api/staffing/orders/route.ts` (POST + validation); `src/domains/staffing/order.service.ts` (`createStaffingOrder`); `src/domains/applications/conversion.service.ts` (hàm tạo Worker); `app/admin/clients/page.tsx`, `app/admin/projects/page.tsx`, `app/admin/vendors/page.tsx`, `app/admin/staffing/staffing-list-client.tsx` (modal tạo); `src/shared/business-code/__tests__/business-code.test.ts` (NEW); `tests/db/t1d-business-code-race.integration.test.ts` (NEW); `tests/db/t1d-conversion-worker-userid.integration.test.ts` (NEW); các route test hiện có cần cập nhật body.
- **Out:** `prisma/schema.prisma`; `prisma/migrations/**`; `prisma/seed.mjs`; `app/api/workers/route.ts` (đã 410 GONE); `StaffingOrder.code` generator; `JobPosting.slug`; `User.affCode`; `Contract.contractNo`; `Permission.code`; `app/admin/workers/**` form (đã đúng convention).
- **Allowed task artifacts:** `docs/tasks/hrp-t1d-business-code-standard/**` (TASK.md, HANDOFF.md, AUDIT.md, evidence/)

### 4.3 Domain boundaries

- **Data/state:** Schema KHÔNG đổi. Code generator trở thành authority duy nhất cho `code`/`userId`/`positionCode` của 5 entity. Tất cả 3 entity hiện tại (`ClientCompany`, `Project`, `Vendor`) đã có `code` immutable trên PUT (xem EV-06) → không cần thêm constraint.
- **Permission/security:** Generator chạy trong transaction với cùng `withDbContext`/`withAuthorizedDbReadOnly` pattern hiện hữu. KHÔNG bypass RLS. KHÔNG thay đổi role/scope. RLS backstop của mỗi route giữ nguyên.
- **Interface/API:** 3 route POST (clients/projects/vendors) trả 400 `SERVER_GENERATED_CODE` thay vì silently accept-and-ignore. 1 route POST (staffing/orders) thêm validation strict reject per-slot. Response body vẫn chứa `code`/`userId`/`positionCode` vừa sinh để UI hiển thị.
- **Migration/rollback:** KHÔNG migration. Rollback = revert PR. Schema không đổi. Data đã tạo giữ nguyên (mã immutable). Mã legacy (`APP-<id>`, `USR-001`, ...) giữ nguyên theo DEC-T0-03.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `src/shared/business-code/business-code.ts` (NEW) | Implement `nextBusinessCode` + `nextBusinessCodeBatch` + CONFIG table (5 kind: CLIENT, PROJECT, VENDOR, WORKER_USER_ID, STAFFING_ORDER_SLOT_POSITION). Dùng `pg_advisory_xact_lock(hashtext('<lockKey>'))` + `SELECT MAX(SUBSTRING(code FROM <n>)::bigint) WHERE code ~ '^<PREFIX>-\d+(-\d+)?$'` + 1. Project year-aware với `opts.year`. Pad-width 3 cho tất cả kind. | `EV-04`; unit test `src/shared/business-code/__tests__/business-code.test.ts` | Generator import fail; MAX regex sai; lock key conflict với kind khác → STOP, return Planner |
| `STEP-02` | `app/api/clients/route.ts` (POST) | Bỏ `code` từ body destructure. Thêm validation: nếu body có `code` key → 400 `SERVER_GENERATED_CODE`. Trước `tx.clientCompany.create`, gọi `const code = await nextBusinessCode(tx, 'CLIENT')`. Truyền `code` vào `data`. | `EV-05`; integration test POST `/api/clients` không `code` → 201 với mã mới; POST có `code` → 400. Cập nhật `app/api/clients/__tests__/*` (nếu có). | Trùng P2002 không bắt được → check xem route đã bọc `withDbContext` chưa; nếu race xảy ra → STOP, return Planner |
| `STEP-03` | `app/api/projects/route.ts` (POST) | Tương tự STEP-02. Thêm `year = startDate.getUTCFullYear()`. Gọi `nextBusinessCode(tx, 'PROJECT', { year })`. Validate `year` ∈ [2000, current+10] nếu cần. | `EV-05`; integration test POST `/api/projects` → 201 với mã `PRJ-{year}-001`; POST có `code` → 400; year=2027 → seq bắt đầu lại 1. Cập nhật `app/api/projects/__tests__/*` (nếu có). | Năm invalid → 400 với message rõ; year-aware regex sai → STOP |
| `STEP-04` | `app/api/vendors/route.ts` (POST) | Tương tự STEP-02. Gọi `nextBusinessCode(tx, 'VENDOR')`. | `EV-05`; integration test tương tự. Cập nhật `app/api/vendors/__tests__/*` (nếu có). | Tương tự STEP-02 |
| `STEP-05` | `src/domains/staffing/order.service.ts` (`createStaffingOrder`) + `src/domains/staffing/types.ts` (`CreateStaffingOrderInput`) | Bỏ `slot.positionCode` khỏi `CreateStaffingOrderInput` (optional field, bị ignore nếu có). Trước `tx.staffingOrder.create`, gọi `const codes = await nextBusinessCodeBatch(tx, 'STAFFING_ORDER_SLOT_POSITION', input.slots.length)`. Gán `slots.create[i].positionCode = codes[i]`. Nếu input.slots.length === 0 (đã có validation sớm) → không gọi batch. | `EV-07`; integration test POST `/api/staffing/orders` 3 slot → 3 mã `POS-001`, `POS-002`, `POS-003`; POST có slot.positionCode → 400. Cập nhật `app/api/staffing/orders/__tests__/*` (nếu có). | Batch trả duplicate trong cùng tx → STOP; vòng lặp map sai index → STOP |
| `STEP-06` | `app/api/staffing/orders/route.ts` (POST) | Bỏ check `slot.positionCode?.trim()` (không bắt buộc). Thêm: nếu body chứa `positionCode` trong bất kỳ slot → 400 `SERVER_GENERATED_CODE`. | `EV-07`; integration test như STEP-05. | Strict reject sai cấu trúc body → check destructure; response shape giữ nguyên `{ order: {...} }` |
| `STEP-07` | `src/domains/applications/conversion.service.ts` (hàm tạo Worker, line ~590) | Thay `userId: \`APP-${current.id}\`` bằng `userId: await nextBusinessCode(tx, 'WORKER_USER_ID')`. Đảm bảo hàm này đã chạy trong `tx` (Prisma TransactionClient). | `EV-09`; integration test mới `tests/db/t1d-conversion-worker-userid.integration.test.ts`: tạo LaborProfile → convert → verify `Worker.userId` match `^USR-EMP-\d+$`. Cập nhật `src/domains/applications/conversion.service.test.ts` mock `nextBusinessCode`. | Nếu hàm không nhận `tx` → refactor caller; generator throw trong tx context → rollback → 500 |
| `STEP-08` | UI: `app/admin/clients/page.tsx`, `app/admin/projects/page.tsx`, `app/admin/vendors/page.tsx` (modal tạo) | Bỏ input `code` khỏi state và JSX. Bỏ field khỏi body khi POST. Hiển thị mã vừa sinh sau khi tạo (toast hoặc success modal). | `EV-10`; smoke test: mở form, không thấy input mã; submit → response có mã; UI hiển thị mã. | UI quên gọi API dẫn đến 400 → STOP |
| `STEP-09` | UI: `app/admin/staffing/staffing-list-client.tsx` (modal tạo) | Bỏ `positionCode` state, JSX, và body field. Bỏ default `'GEN'`. | `EV-11`; smoke test tương tự STEP-08. | UI quên bỏ state → submit kèm field rỗng → 400 |
| `STEP-10` | Self-review + canonical gates | Chạy typecheck, lint, unit, integration, build, encoding verify. Tự review toàn bộ changed surface theo `§11 Self-review checklist` của TASK v1 (xem `DECISION_REQUEST.md` §11). Cập nhật các route test hiện có nếu body cũ chứa `code`/`userId`/`positionCode` không hợp lệ. | `EV-01`..`EV-14`; output gate phải 0 error. | Bất kỳ gate fail → sửa, không freeze. Tất cả pass → commit + freeze SHA. |
| `STEP-11` | HANDOFF.md (sau khi freeze SHA) | Ghi exact `Implementation SHA` (từ `git rev-parse HEAD`); pin test evidence; carry-forward 3 rủi ro trọng yếu (RISK-1, RISK-4, RISK-8). | — | — |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `nextBusinessCode(tx, 'CLIENT')` trên bảng trống → trả `'CC-001'`. | `npx vitest run src/shared/business-code/__tests__/business-code.test.ts -t "AC-01"` |
| `AC-02` | 5 `Promise.all` cùng gọi `nextBusinessCode(tx, 'CLIENT')` trong 5 tx riêng biệt → 5 mã khác nhau, không có P2002 khi insert. | `npx vitest run tests/db/t1d-business-code-race.integration.test.ts` (Node + Postgres từ `tests/db/_setup`) |
| `AC-03` | `nextBusinessCode(tx, 'PROJECT', { year: 2026 })` trên bảng trống → trả `'PRJ-2026-001'`. Cùng tx với year=2027 → trả `'PRJ-2027-001'`. | `npx vitest run src/shared/business-code/__tests__/business-code.test.ts -t "AC-03"` |
| `AC-04` | `nextBusinessCodeBatch(tx, 'STAFFING_ORDER_SLOT_POSITION', 3)` → trả `['POS-001', 'POS-002', 'POS-003']` (giả sử bảng trống). | `npx vitest run src/shared/business-code/__tests__/business-code.test.ts -t "AC-04"` |
| `AC-05` | Bảng có legacy `userId: 'wu-test-1'` (không match regex `^USR-EMP-\d+$`) → `nextBusinessCode(tx, 'WORKER_USER_ID')` vẫn trả `'USR-EMP-001'`. | `npx vitest run src/shared/business-code/__tests__/business-code.test.ts -t "AC-05"` |
| `AC-06` | `POST /api/clients` body KHÔNG có `code` → 201, response có `client.code` dạng `CC-\d+`. | `npx vitest run app/api/clients/__tests__/route.test.ts -t "AC-06"` |
| `AC-07` | `POST /api/clients` body CÓ `code` → 400 `{ error: 'SERVER_GENERATED_CODE' }`. | `npx vitest run app/api/clients/__tests__/route.test.ts -t "AC-07"` |
| `AC-08` | `POST /api/projects` body KHÔNG có `code` → 201, `project.code` dạng `PRJ-{year}-\d+`. | `npx vitest run app/api/projects/__tests__/route.test.ts -t "AC-08"` |
| `AC-09` | `POST /api/projects` body CÓ `code` → 400. | `npx vitest run app/api/projects/__tests__/route.test.ts -t "AC-09"` |
| `AC-10` | `POST /api/vendors` body KHÔNG có `code` → 201, `vendor.code` dạng `VD-\d+`. | `npx vitest run app/api/vendors/__tests__/route.test.ts -t "AC-10"` |
| `AC-11` | `POST /api/vendors` body CÓ `code` → 400. | `npx vitest run app/api/vendors/__tests__/route.test.ts -t "AC-11"` |
| `AC-12` | `POST /api/staffing/orders` body có 3 slot KHÔNG có `positionCode` → 201, 3 slot có `positionCode` lần lượt `POS-001`, `POS-002`, `POS-003`. | `npx vitest run app/api/staffing/orders/__tests__/route.test.ts -t "AC-12"` |
| `AC-13` | `POST /api/staffing/orders` body có slot với `positionCode` → 400. | `npx vitest run app/api/staffing/orders/__tests__/route.test.ts -t "AC-13"` |
| `AC-14` | Conversion flow tạo Worker → `Worker.userId` mới khớp `^USR-EMP-\d+$` (không còn `APP-<id>`). | `npx vitest run tests/db/t1d-conversion-worker-userid.integration.test.ts` |
| `AC-15` | UI form tạo Client/Project/Vendor KHÔNG render input mã (grep `code:` trong JSX form, expect 0 match cho input). | `grep -nE 'name="code"|placeholder="VD: (CC|PRJ|VD|USR)-' app/admin/clients/page.tsx app/admin/vendors/page.tsx app/admin/projects/projects-table-client.tsx` — expect 0 match |
| `AC-16` | UI form tạo StaffingOrder KHÔNG render input `positionCode` (grep `positionCode` trong JSX, expect 0 match cho input). | `grep -nE 'name="positionCode"|placeholder="VD: (GEN|ELECTRICIAN)' app/admin/staffing/staffing-list-client.tsx` — expect 0 match |
| `AC-17` | Canonical gates: typecheck, lint, unit, integration, build, encoding verify → 0 error. | `npx tsc --noEmit && npm run lint && npx vitest run && pwsh .ai-pipeline/scripts/verify-encoding.ps1 2>&1 | tee evidence/gates.txt` |
| `AC-18` | Test fixture hiện có (worker.create với string `userId: 'wu-X'`, UUID) vẫn pass. | `npx vitest run tests/db/intake-convert-worker-link.integration.test.ts tests/db/aff04-conversion-propagation.integration.test.ts` |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-01` | `AC-04` |
| `RQ-03` | `STEP-01`, `STEP-03` | `AC-03` |
| `RQ-04` | `STEP-01` | `AC-05`, `AC-18` |
| `RQ-05` | `STEP-02` | `AC-06`, `AC-07` |
| `RQ-06` | `STEP-03` | `AC-08`, `AC-09` |
| `RQ-07` | `STEP-04` | `AC-10`, `AC-11` |
| `RQ-08` | `STEP-05` | `AC-12` |
| `RQ-09` | `STEP-06` | `AC-13` |
| `RQ-10` | `STEP-07` | `AC-14` |
| `RQ-11` | `STEP-08` | `AC-15` |
| `RQ-12` | `STEP-09` | `AC-16` |
| `RQ-13` | `STEP-01`, `STEP-10` | `AC-18` |
| `RQ-14` | `STEP-07` | `AC-14` |
| (gates) | `STEP-10` | `AC-17` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Caller ngoài repo (nếu có) gửi `code`/`userId`/`positionCode` → 400. | T0 đã xác nhận caller trong repo cập nhật trong cùng PR. Document trong HANDOFF là breaking change nếu có caller ngoài. |
| `RISK-02` | Generator regex không match một số legacy code → tìm MAX sai. | Unit test AC-05 cover trường hợp legacy. Regex `^<PREFIX>-\d+$` (PROJECT: `^PRJ-\d{4}-\d+$`) đã verify trên data thật. |
| `RISK-03` | Test fixture `userId: 'wu-X'` không match generator → tìm MAX sai. | AC-18 verify existing test pass. |
| `RISK-04` | Race condition nếu advisory lock bị leak hoặc sai key. | Pattern từ `StaffingOrder` đã chứng minh production. AC-02 verify 5 concurrent request. |
| `RISK-05` | Project year-aware: admin tạo cuối 2026 → sequence 999 → đầu 2027 sequence reset 1 → có thể confuse. | T0 đã chốt intentional. Document trong HANDOFF + response trả mã giúp admin trace. |
| `RISK-06` | Cập nhật UI không đầy đủ → form cũ vẫn gửi code → 400. | STEP-10 self-review checklist + AC-15, AC-16 grep static check. |
| `RISK-07` | `nextBusinessCodeBatch` cho slot: nếu cùng kind gọi 2 lần trong cùng tx có thể duplicate. | Design STEP-01: lấy MAX 1 lần → trả `[next+1..next+count]`. AC-04 cover. |
| `RISK-08` | `Worker.userId` đổi `APP-${id}` → `USR-EMP-001` ảnh hưởng data cũ (downstream query filter theo prefix `APP-`). | DEC-T0-03: NO MIGRATION. Row Worker cũ giữ `APP-${id}`; query downstream nào filter theo `APP-` prefix sẽ KHÔNG thấy Worker mới. Mitigation: grep codebase cho query `userId LIKE 'APP-%'` hoặc filter cứng; document trong HANDOFF. |
| `RISK-09` | `StaffingOrderSlot.positionCode` cũ là vocabulary (`ELECTRICIAN`); đổi sang `POS-001` có thể ảnh hưởng downstream filter. | DEC-T0-03: legacy giữ nguyên. Row cũ giữ `ELECTRICIAN`; generator chỉ sinh mã mới. Grep codebase cho filter cứng theo vocabulary; nếu có → document breaking. |

## 8. Open Questions

- None.

Không được còn câu hỏi cần Owner quyết khi `Contract gate: READY_TO_CODE`.

## 9. Planner Resolution

Tier 1 append sau review/audit. Audit NONE resolve trực tiếp từ HANDOFF; LIGHT resolve từ AUDIT.

| Round | Decision | Reason |
|---|---|---|
| 0 | `READY_TO_CODE` | DEC-01..06 đã CLOSED; baseline + worktree + gates đã pin; test env READY. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-10-12 | Initial contract — T0 closed 5 decisions; baseline `e98eb1ba`; worktree forward-merged to `d62df50e`; READY_TO_CODE. | T0 duyệt với 5 correction; Tier 1 viết TASK theo template. |
