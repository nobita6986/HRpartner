# T1D — Business Code Standard & Shared Generator

> **Phase**: `CONTRACT_PLANNING` → **đã được T0 duyệt với correction**.
> **Status**: `DECISION_CLOSED_PENDING_TASK_AUTHORING`.
> **Decision state**: Tất cả 5 decision đã đóng (xem §4). Sẵn sàng viết `TASK.md` với `Contract gate: READY_TO_CODE`.
> **Phạm vi đã chốt** (xem §5):
> - 5 entity thay đổi: `ClientCompany.code`, `Project.code`, `Vendor.code`, `Worker.userId` (giữ chính trường này — KHÔNG thêm `Worker.code`), `StaffingOrderSlot.positionCode`.
> - `StaffingOrder.code` đã đúng, KHÔNG refactor.
> - Ngoài scope: `JobPosting.slug`, `User.affCode`, `Contract.contractNo`, `Permission.code`.

## 1. Bối cảnh

Hệ thống đang để người dùng (admin) nhập business code cho 4 entity master data — `ClientCompany`, `Project`, `Vendor`, `Worker.userId` — tại form tạo mới. `StaffingOrder.code` và `StaffingOrderSlot.positionCode` có thêm ngoại lệ cần đưa vào scope (xem DEC-T0-05). Việc để client nhập mã dẫn đến:

1. **Race condition** — hai admin cùng nhập `CC-001` ở hai tab → một được 409 CONFLICT, UX kém.
2. **Format lẫn lộn** — `CC-001` (zero-pad 3, không năm) vs `PRJ-2025-001` (zero-pad 3, có năm) vs `SO-00001` (zero-pad 5, không năm) vs `POS-001` / `WKR-001` (vocabulary enum) — mỗi entity một kiểu.
3. **Outbox/referral** — `outbox event StaffingOrderCreated.payload.code` reference mã từ server-side; các entity còn lại client-supplied → khó audit/replay xuyên suốt.
4. **Tính mở rộng** — với nhiều admin và lượng record tăng nhanh, generator phía server là cần thiết để bảo đảm uniqueness + race-safety.

## 2. Khảo sát — entity, nơi sinh mã, consumer (cập nhật theo T0 corrections)

### 2.1 Bảng tổng hợp (đã sửa theo T0)

| Entity | Trường mã hiện tại | Format hiện tại | Nơi sinh hiện tại | Unique constraint | Immutable? | Có UI/API tạo? | Consumer tham chiếu |
|---|---|---|---|---|---|---|---|
| `ClientCompany` | `code` | `CC-001` (zero-pad 3) | **Client-supplied** `POST /api/clients` (required) | `@unique` (DB) | **Có** (PUT bỏ field) | Có | search theo code/name/taxCode; list display |
| `Project` | `code` | `PRJ-2026-001` (có năm, zero-pad 3, **đếm riêng theo năm**) | **Client-supplied** `POST /api/projects` (required) | `@unique` (DB) | **Có** (PUT bỏ field) | Có | search theo code/name; list display; **KHÔNG** qua JobPosting public projection |
| `StaffingOrder` | `code` | `SO-00001` (zero-pad 5) | **Server-side** `generateOrderCode()` — `pg_advisory_xact_lock` + `MAX(SUBSTRING(code FROM 4)::bigint) + 1` | `@unique` (DB) | Có (status machine) | Có | outbox `StaffingOrderCreated.payload.code`; JobOpening public projection `staffingOrder.code`; search |
| `Vendor` | `code` | `VD-001` (zero-pad 3) | **Client-supplied** `POST /api/vendors` (required) | `@unique` (DB) | **Có** (PUT bỏ field) | Có | search theo code/name; list display |
| `Worker` (HR internal) | **`userId`** (`@unique`, đã immutable) | `USR-EMP-001` (zero-pad 3, KHÔNG năm) | **Client-supplied** (input form) | `@unique` (DB) | **Có** | Có (qua form tạo Worker) | FK từ `WorkerAccount User?`; hiển thị; "Primary UserID" theo schema comment |
| `StaffingOrderSlot.positionCode` | `positionCode` | `POS-001` (zero-pad 3) | **Client-supplied** (form `createStaffingOrder`) | KHÔNG unique ở DB | Có (slot là row con) | Có (cùng POST với StaffingOrder) | search/filter theo `ELECTRICIAN` (vocabulary cũ) — Owner yêu cầu sinh `POS-001` thay vì vocabulary cũ |

**Quan trọng — correction T0**:
- **Worker đã có business code ở `Worker.userId`** (`@unique`, immutable). Tier 1 vòng 1 đã KHẢO SÁT SAI khi nói "Worker chưa có mã". T0 đã xác nhận: dùng chính `userId`, KHÔNG thêm `Worker.code`, KHÔNG migration.
- **Mã legacy** (`GEN`, `ELECTRICIAN`, `USR-001`, các `PRJ-…` do admin nhập trước) **được giữ nguyên** theo DEC-T0-03. Generator sẽ tìm MAX qua regex `^<PREFIX>-\d+$` để tránh đụng vào legacy.

### 2.2 Pattern chuẩn đang chạy ở `StaffingOrder` (reference)

```ts
// src/domains/staffing/order.service.ts:54-66
async function generateOrderCode(tx: Prisma.TransactionClient): Promise<string> {
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('staffing_order_code'))`);
  const rows = await tx.$queryRawUnsafe<Array<{ max_num: bigint | null }>>(
    `SELECT MAX(SUBSTRING(code FROM 4)::bigint) AS max_num FROM staffing_orders WHERE code ~ '^SO-[0-9]+$'`,
  );
  const next = Number(rows[0]?.max_num ?? 0n) + 1;
  return `SO-${String(next).padStart(5, '0')}`;
}
```

Pattern này đã race-safe và đang chạy trong production. Tier 1 sẽ **không refactor** (DEC scope), chỉ tái sử dụng cho các kind khác.

### 2.3 Vấn đề cần sửa

| Entity | Hiện trạng | Sau implement |
|---|---|---|
| `ClientCompany` | Form có input `code` required; server chỉ validate unique | Form KHÔNG có input `code`; server sinh; response trả mã vừa sinh |
| `Project` | Form có input `code` required; server chỉ validate unique | Form KHÔNG có input `code`; server sinh theo **năm** (đếm riêng); nếu năm đổi, sequence reset |
| `Vendor` | Form có input `code` required; server chỉ validate unique | Form KHÔNG có input `code`; server sinh |
| `Worker` (qua `userId`) | Form có input `userId`/mã nhân viên required; server chỉ validate unique | Form KHÔNG có input mã; server sinh `USR-EMP-001`; gán vào `Worker.userId` |
| `StaffingOrderSlot.positionCode` | Form có input `positionCode` (vocabulary enum) | Form KHÔNG có input mã vị trí; server sinh `POS-001` cho mỗi slot trong batch |

### 2.4 Bỏ scope (theo T0)

- `StaffingOrder.code` — đã đúng, không refactor (Tier 1 chỉ tham chiếu pattern, không sửa code).
- `JobPosting.slug` — generator riêng (slug từ title), không phải sequential.
- `User.affCode` — referral system riêng.
- `Contract.contractNo` — chưa có UI/API tạo.
- `Permission.code` — enum seed cố định.

## 3. Quy tắc mã nhất quán (đã chốt)

### 3.1 Format — giữ hiện hành theo DEC-T0-01

| Entity | Prefix | Format | Ví dụ | Quy tắc đếm |
|---|---|---|---|---|
| `ClientCompany.code` | `CC` | `CC-` + zero-pad 3 | `CC-001` | Single sequence; **không giới hạn 999** — mã tiếp theo có thể là `CC-1000` |
| `Project.code` | `PRJ` | `PRJ-` + năm 4 số + `-` + zero-pad 3 | `PRJ-2026-001` | **Đếm riêng theo năm**; sequence reset mỗi năm |
| `StaffingOrder.code` | `SO` | `SO-` + zero-pad 5 | `SO-00001` | Single sequence (giữ nguyên) |
| `Vendor.code` | `VD` | `VD-` + zero-pad 3 | `VD-001` | Single sequence; không giới hạn 999 |
| `Worker.userId` | `USR-EMP` | `USR-EMP-` + zero-pad 3 | `USR-EMP-001` | Single sequence; không giới hạn 999 |
| `StaffingOrderSlot.positionCode` | `POS` | `POS-` + zero-pad 3 | `POS-001` | Single sequence trong bảng `staffing_order_slots`; **không giới hạn 999** |

**Lưu ý quan trọng** (sửa nhận định sai từ vòng 1): zero-pad 3 là **độ rộng tối thiểu**, KHÔNG giới hạn ở 999. Khi vượt 999, generator sẽ sinh `CC-1000`, `CC-1001`, … KHÔNG migration khi vượt 999.

### 3.2 Server-side generator (authority duy nhất)

**Một module shared nhỏ** tại `src/shared/business-code/`. **Không factory, không preview API, không validate() interface, không nhiều wrapper** (theo T0 correction §"Kiến trúc").

```ts
// src/shared/business-code/business-code.ts (NEW)
import type { Prisma } from '@prisma/client';

export type BusinessCodeKind =
  | 'CLIENT'              // CC
  | 'PROJECT'             // PRJ
  | 'VENDOR'              // VD
  | 'WORKER_USER_ID'      // USR-EMP
  | 'STAFFING_ORDER_SLOT_POSITION'; // POS

interface KindConfig {
  prefix: string;
  padWidth: number;
  includeYear: boolean; // true cho PROJECT
  table: string;        // tên bảng thật (raw SQL)
  column: string;       // tên cột mã
  lockKey: string;      // advisory lock key
  numberFrom: number;   // vị trí bắt đầu cắt số (1-indexed)
}

const CONFIG: Record<BusinessCodeKind, KindConfig> = {
  CLIENT: { prefix: 'CC', padWidth: 3, includeYear: false,
    table: 'client_companies', column: 'code', lockKey: 'client_code', numberFrom: 4 },
  PROJECT: { prefix: 'PRJ', padWidth: 3, includeYear: true,
    table: 'outsourcing_projects', column: 'code', lockKey: 'project_code', numberFrom: 5 /* PRJ-2026- */ },
  VENDOR: { prefix: 'VD', padWidth: 3, includeYear: false,
    table: 'vendors', column: 'code', lockKey: 'vendor_code', numberFrom: 4 },
  WORKER_USER_ID: { prefix: 'USR-EMP', padWidth: 3, includeYear: false,
    table: 'workers', column: 'user_id', lockKey: 'worker_user_id', numberFrom: 9 /* USR-EMP- */ },
  STAFFING_ORDER_SLOT_POSITION: { prefix: 'POS', padWidth: 3, includeYear: false,
    table: 'staffing_order_slots', column: 'position_code', lockKey: 'slot_position_code', numberFrom: 5 },
};

/**
 * Cấp 1 mã mới trong transaction, race-safe.
 * Caller PHẢI gọi trong withDbContext/transaction wrapper.
 */
export async function nextBusinessCode(
  tx: Prisma.TransactionClient,
  kind: BusinessCodeKind,
  opts?: { year?: number },  // bắt buộc cho PROJECT
): Promise<string>;

/**
 * Cấp N mã liên tiếp trong CÙNG transaction (cho StaffingOrder tạo nhiều slot).
 * Lấy MAX 1 lần, cấp batch (next+1, next+2, ...).
 * Race-safe: advisory lock serialize toàn bộ request tạo slot cùng kind.
 */
export async function nextBusinessCodeBatch(
  tx: Prisma.TransactionClient,
  kind: BusinessCodeKind,
  count: number,
  opts?: { year?: number },
): Promise<string[]>;
```

**Quy tắc batch** (theo DEC-T0-05): `nextBusinessCodeBatch` cho `STAFFING_ORDER_SLOT_POSITION`:
1. Lấy advisory lock.
2. `SELECT MAX(SUBSTRING(position_code FROM 5)::bigint) FROM staffing_order_slots WHERE position_code ~ '^POS-[0-9]+$'`.
3. Trả `[next+1, next+2, ..., next+count]`.
4. Tất cả 1 SQL roundtrip, dùng cho nested-create n slot trong StaffingOrder.
5. Caller (`createStaffingOrder`) gán `positionCode: codes[i]` cho `slots.create[i]`.

### 3.3 Schema — KHÔNG migration (DEC-T0-03)

Theo DEC-T0-03, **không đổi schema, không thêm index, không backfill dữ liệu cũ**. Các mã legacy (`GEN`, `ELECTRICIAN`, `USR-001`, các `PRJ-…` tự nhập trước) được giữ nguyên. Generator regex `^<PREFIX>-\d+$` sẽ bỏ qua chúng khi tìm MAX.

### 3.4 Backward-compat — strict reject (DEC-T0-04)

API tạo mới trả `400 SERVER_GENERATED_CODE` nếu body chứa:
- `code` (cho Client, Project, Vendor)
- `userId` của Worker (hoặc field tương đương trong form Worker — cần verify tên field)
- `positionCode` (trong mỗi slot)

**Caller flow mới**:
1. UI bỏ input mã khỏi form.
2. POST/PUT không gửi mã.
3. Server sinh mã, gán vào row, response trả mã vừa sinh (200/201 body có mã).
4. UI hiển thị mã sau khi tạo (toast + redirect detail).

**Verify toàn bộ UI/caller trong cùng PR** (theo T0): grep tất cả form/admin/client gọi các route tạo mới → đảm bảo không còn gửi `code/userId/positionCode` trong body.

### 3.5 Bản ghi mới vs cũ vs mã trùng

| Tình huống | Cách xử lý |
|---|---|
| Tạo mới | Server sinh mã; client KHÔNG gửi mã; 400 nếu cố gửi. Response trả mã. |
| Sửa (PUT/PATCH) | Mã immutable; client không gửi; server bỏ qua. |
| Bản ghi cũ (pre-generator) | Mã legacy giữ nguyên. Generator regex `^<PREFIX>-\d+$` bỏ qua khi tìm MAX → cộng tiếp từ max hợp lệ cao nhất. |
| Mã trùng (collision) | Advisory lock serialize → KHÔNG thể xảy ra. Backstop: Prisma `P2002` → 409 → caller retry. |
| Mã đã được tham chiếu (FK, outbox, log) | Mã immutable → KHÔNG bị vỡ. Outbox payload.code chỉ chứa mã tại thời điểm tạo. |

### 3.6 Test surface

- **Unit test** (≥10 case × kind) cho `nextBusinessCode`:
  - 1 client → trả 1 mã đúng format.
  - N client song song (Promise.all) trong cùng tx context → 5 mã khác nhau.
  - Bảng trống → trả mã đầu tiên với seq=1.
  - Có legacy không match regex → vẫn tìm max đúng.
  - Year-bump cho PROJECT: cùng table, year=2026 → seq tiếp tục từ max 2026; năm mới 2027 → seq bắt đầu lại 1.
  - Batch: trả đúng count mã liên tiếp; không trùng trong cùng batch.

- **Integration test** (≥5 case):
  - 2 admin cùng POST `/api/clients` trong cùng tick → 2 mã khác nhau, không P2002.
  - POST `/api/clients` có body `{code: "CC-XYZ"}` → 400 `SERVER_GENERATED_CODE`.
  - POST `/api/projects` có body `{code: "PRJ-2026-001"}` → 400 `SERVER_GENERATED_CODE`.
  - POST `/api/workers` (hoặc route tương đương) có body `{userId: "USR-EMP-001"}` → 400.
  - POST `/api/staffing-orders` với 3 slot → 3 mã `POS-001`, `POS-002`, `POS-003` cho slot[0..2]; không query MAX trước nested-create.

- **UI test** (smoke):
  - Form `/admin/clients` modal tạo mới: KHÔNG có input mã.
  - Form `/admin/projects` modal tạo mới: KHÔNG có input mã.
  - Form `/admin/vendors` modal tạo mới: KHÔNG có input mã.
  - Form Worker tạo mới: KHÔNG có input `userId`/mã nhân viên.
  - Form `/admin/staffing` tạo staffing order: KHÔNG có input `positionCode` cho slot.

- **Update test cũ**: tất cả route test cũ (`/api/clients/route.test.ts`, `projects`, `vendors`, `staffing/order.service.test.ts`) cần cập nhật để không gửi `code` trong body, hoặc expect 400 nếu gửi.

## 4. Decision state (đã đóng)

| ID | Decision | Áp dụng |
|---|---|---|
| **DEC-T0-01** | **A — Giữ format hiện hành, không backfill**. Không giới hạn 999. `CC-nnn`, `PRJ-YYYY-nnn` (đếm riêng theo năm), `SO-00001`, `VD-nnn`, `USR-EMP-nnn`, `POS-nnn`. | §3.1, §3.3 |
| **DEC-T0-02** | **YES — Worker (dùng `Worker.userId`, không thêm `Worker.code`, không migration)**. Tier 1 vòng 1 khảo sát sai khi nói "Worker chưa có mã" — đã sửa theo T0. | §2.1, §2.3, §3.1 |
| **DEC-T0-03** | **NO MIGRATION** — không đổi schema, không index, không backfill. Mã legacy giữ nguyên. | §3.3 |
| **DEC-T0-04** | **STRICT REJECT** — API trả 400 `SERVER_GENERATED_CODE` nếu body chứa `code` (Client/Project/Vendor), `userId` (Worker), hoặc `positionCode` (slot). UI/caller cập nhật trong cùng PR. | §3.4 |
| **DEC-T0-05** | **StaffingOrderSlot.positionCode bắt buộc nằm trong scope**. Server sinh `POS-nnn`; slot hiện hữu giữ nguyên; form không hiển thị input mã; batch sinh N mã trong cùng transaction cho create nhiều slot. | §2.1, §2.3, §3.2 |

## 5. Phạm vi thay đổi (đã chốt)

### 5.1 Entity thuộc scope

- `ClientCompany` (API + UI form tạo)
- `Project` (API + UI form tạo) — năm-aware
- `Vendor` (API + UI form tạo)
- `Worker` (qua `Worker.userId` — API + UI form tạo; KHÔNG thêm `Worker.code`)
- `StaffingOrderSlot.positionCode` (sinh trong `createStaffingOrder` — cùng route với StaffingOrder)

### 5.2 Entity NGOÀI scope

- `StaffingOrder.code` — đã server-side, không refactor (Tier 1 tham chiếu pattern).
- `JobPosting.slug` — generator riêng (slug từ title).
- `User.affCode` — referral system.
- `Contract.contractNo` — chưa có UI/API.
- `Permission.code` — enum seed.

### 5.3 Ranh giới cấu trúc

- Module shared duy nhất: `src/shared/business-code/business-code.ts` (xem §3.2).
- KHÔNG factory, KHÔNG preview API, KHÔNG validate() interface, KHÔNG wrapper phức tạp (theo T0).
- KHÔNG thêm dependency mới.
- KHÔNG touch `StaffingOrder.code` (giữ pattern inline cũ làm reference).

## 6. Kế hoạch implementation (sẽ được pin trong TASK.md)

### 6.1 File delta (dự kiến — sẽ ràng buộc trong TASK.md)

```
src/shared/business-code/
  business-code.ts (NEW)                # nextBusinessCode + nextBusinessCodeBatch + CONFIG

app/api/clients/route.ts (EDIT)         # POST: bỏ code từ body; gọi nextBusinessCode
app/api/clients/[id]/route.ts (NO CHANGE — code immutable)
app/api/projects/route.ts (EDIT)        # POST: bỏ code; gọi nextBusinessCode(kind=PROJECT, year)
app/api/projects/[id]/route.ts (NO CHANGE)
app/api/vendors/route.ts (EDIT)         # POST: bỏ code; gọi nextBusinessCode
app/api/vendors/[id]/route.ts (NO CHANGE)
app/api/workers/route.ts (EDIT or NEW)  # POST: bỏ userId; gọi nextBusinessCode(kind=WORKER_USER_ID)
app/api/admin/staffing/route.ts (EDIT)  # nếu có route riêng tạo StaffingOrder; nếu không, refactor createStaffingOrder trong order.service

app/admin/clients/page.tsx (EDIT)       # Modal tạo: bỏ input "Mã khách hàng"
app/admin/projects/page.tsx (EDIT)      # Modal tạo: bỏ input "Mã dự án"
app/admin/vendors/page.tsx (EDIT)       # Modal tạo: bỏ input "Mã vendor"
app/admin/workers/[id]/page.tsx (EDIT)  # Tạo worker: bỏ input mã User ID
app/admin/staffing/page.tsx (EDIT)      # Tạo staffing order: bỏ input positionCode cho slot

src/domains/staffing/order.service.ts (EDIT)  # createStaffingOrder: dùng nextBusinessCodeBatch cho slot.positionCode
src/domains/workforce/worker.service.ts (EDIT) # createWorker (nếu có): dùng nextBusinessCode(kind=WORKER_USER_ID)

tests/db/ (NEW)                         # integration test race-safety
```

### 6.2 Thứ tự triển khai

1. Implement `src/shared/business-code/business-code.ts` + unit test.
2. Wire `app/api/clients/route.ts` (POST) + integration test.
3. Wire `app/api/projects/route.ts` (POST, year-aware) + integration test.
4. Wire `app/api/vendors/route.ts` (POST) + integration test.
5. Wire `Worker` route (verify tên field) + integration test.
6. Wire `createStaffingOrder` (batch slot.positionCode) + integration test.
7. Update UI forms (5 trang) — bỏ input mã, hiển thị mã sau tạo.
8. Cập nhật route test cũ (nếu có gửi mã trong body) → expect 400 `SERVER_GENERATED_CODE` hoặc bỏ field.
9. Canonical gates: typecheck, lint, unit, integration, encoding verify.
10. Commit, freeze SHA, viết HANDOFF.

## 7. Risk và rollback

- **Risk**: API 400 strict reject có thể break client tích hợp ngoài (nếu có). Mitigation: trong cùng PR, grep toàn bộ caller trong repo → confirm chỉ UI admin gọi. Nếu có caller ngoài, document breaking change trong HANDOFF.
- **Risk**: Project năm-aware: cùng bảng, sequence reset theo năm → nếu admin tạo Project năm 2026 cuối năm rồi đầu 2027, sequence restart từ 1. Confirmed intentional theo DEC-T0-01.
- **Risk**: Worker.userId trước giờ được set bởi caller (form hoặc script seed). Sửa thành server-side có thể ảnh hưởng script seed/migration. Mitigation: grep `userId` writes trong repo; nếu có seed script, document cách inject pre-generated mã (qua generator import) thay vì hardcode.
- **Rollback**: revert PR — schema không đổi, chỉ route behavior. Data đã tạo giữ nguyên (mã immutable).

## 8. Revision Log

| Version | Date | Author | Change |
|---|---|---|---|
| v0.1 DRAFT_FOR_T0_REVIEW | 2026-10-12 | Tier 1 | Initial contract planning — 4 blocking decision. |
| v0.2 DECISION_CLOSED_PENDING_TASK_AUTHORING | 2026-10-12 | Tier 1 (theo T0 review) | T0 chốt 5 decision. Sửa khảo sát Worker (đã có `userId`); thêm DEC-T0-05 StaffingOrderSlot; thu gọn kiến trúc (1 module shared, không factory); strict reject; không migration; project year-aware. |
