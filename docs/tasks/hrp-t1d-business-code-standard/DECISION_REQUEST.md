# T1D — Business Code Standard & Shared Generator

> **Phase**: `CONTRACT_PLANNING` — chờ T0 duyệt định dạng mã và phạm vi generator.
> **Status**: `DRAFT_FOR_T0_REVIEW`.
> **Outcome chưa đóng** — Tier 1 chỉ khảo sát và đề xuất; **chưa** viết TASK.md `READY_TO_CODE` vì còn 4 blocking decision từ T0 (xem §4).

## 1. Bối cảnh

Hệ thống đang để người dùng (admin) nhập business code cho 4 entity master data — `ClientCompany`, `Project`, `Vendor`, và (sắp tới) `Worker` — tại form tạo mới. Một entity (`StaffingOrder`) đã có server-side generator từ trước. Việc để client nhập mã dẫn đến:

1. **Race condition** — hai admin cùng nhập `CC-001` ở hai tab → một được 409 CONFLICT, UX kém.
2. **Không nhất quán format** — Project có dạng `PRJ-2025-001` (có năm), các entity còn lại `CC-001`, `SO-001`, `VD-001` (không có năm, zero-pad 3 số).
3. **Outbox/referral** — một số surface (outbox event `StaffingOrderCreated`, public projection của JobPosting) reference `code` mà tới giờ do client-supplied → khó audit/replay.
4. **Tính mở rộng** — Worker (sắp thêm) cũng sẽ cần mã; không có pattern chuẩn.

## 2. Khảo sát — entity, nơi sinh mã, consumer

### 2.1 Bảng tổng hợp

| Entity | Trường mã hiện tại | Format hiện tại | Nơi sinh hiện tại | Unique constraint | Có UI/API tạo? | Consumer tham chiếu `code` |
|---|---|---|---|---|---|---|
| `ClientCompany` | `code` | `CC-001` (zero-pad 3) | **Client-supplied** tại form `/admin/clients` (modal) → `POST /api/clients` (required) | `@unique` (DB) | Có | search theo code/name/taxCode; hiển thị trong list; export sau này |
| `Project` | `code` | `PRJ-2025-001` (có năm, zero-pad 3) | **Client-supplied** tại form `/admin/projects` → `POST /api/projects` (required) | `@unique` (DB) | Có | search theo code/name; hiển thị trong list; JobPosting public projection lấy qua `staffingOrder.code` (KHÔNG qua project.code) |
| `StaffingOrder` | `code` | `SO-00001` (zero-pad 5) | **Server-side** tại `src/domains/staffing/order.service.ts:54-66` `generateOrderCode()` — `pg_advisory_xact_lock` + `MAX(SUBSTRING(code FROM 4)::bigint) + 1` | `@unique` (DB) | Có | outbox event `StaffingOrderCreated` (payload.code); JobOpening public projection `staffingOrder.code`; search |
| `Vendor` | `code` | `VD-001` (zero-pad 3) | **Client-supplied** tại form `/admin/vendors` → `POST /api/vendors` (required) | `@unique` (DB) | Có | search theo code/name; hiển thị trong list |
| `Worker` (HR internal) | — | (chưa có) | (n/a) | — | Có (qua LaborProfile intake) | (n/a) |
| `Contract` | `contractNo` | (free-form, KHÔNG có `@unique` ở DB) | (n/a — chưa có UI/API tạo) | KHÔNG có unique constraint | **Không có** | (n/a — chưa sử dụng) |
| `JobPosting` | `slug` | canonical slug từ title (vd `cong-nhan-co-khi-ha-noi`) | **Server-side** tại `src/domains/job-board/.../generateCanonicalSlug` | `@unique` (DB) | Có (qua JobOpening) | public URL `/viec-lam/[slug]` |
| `User.affCode` | `affCode` | (cần xác minh — chưa khảo sát sâu) | (chưa khảo sát) | `@unique` (DB) | Có (qua referral) | referral link `/r/[affCode]` |

### 2.2 Bằng chứng — code paths (read-only)

#### 2.2.1 Server-side generator hiện có — pattern tham chiếu (`StaffingOrder`)

```ts
// src/domains/staffing/order.service.ts:54-66
/** Lay ma SO tiep theo: "SO-" + zero-padded sequential integer.
 *  DEC-02: pg_advisory_xact_lock chong race giua 2 request dong thoi.
 *  Advisory lock key = hashtext('staffing_order_code') (EV-12).
 */
async function generateOrderCode(tx: Prisma.TransactionClient): Promise<string> {
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('staffing_order_code'))`);
  const rows = await tx.$queryRawUnsafe<Array<{ max_num: bigint | null }>>(
    `SELECT MAX(SUBSTRING(code FROM 4)::bigint) AS max_num FROM staffing_orders WHERE code ~ '^SO-[0-9]+$'`,
  );
  const next = Number(rows[0]?.max_num ?? 0n) + 1;
  return `SO-${String(next).padStart(5, '0')}`;
}
```

Pattern này **đã chứng minh race-safe** trong production. Hai request đồng thời cùng lấy lock `staffing_order_code` → serialize → không trùng.

#### 2.2.2 Client-supplied hiện tại — `POST /api/clients`

```ts
// app/api/clients/route.ts:99-130
const { code, name, taxCode, industry, companySize, status } = body;
if (!code || !name) {
  return NextResponse.json(
    { error: 'VALIDATION', message: 'code va name la bat buoc.' },
    { status: 400 },
  );
// ...
const client = await withDbContext(prisma, ctx, (tx) =>
  tx.clientCompany.create({
    data: { code, name, ... },  // ← code từ body
  }),
);
```

UI form:
```tsx
// app/admin/clients/page.tsx:80-86
<input value={code} onChange={e => setCode(e.target.value)} placeholder="VD: CC-001"
  className="w-full rounded border px-3 py-2 text-sm font-mono" required />
```

`Project` (`POST /api/projects/route.ts:159-160`) và `Vendor` (`POST /api/vendors/route.ts:96-97`) cùng pattern.

#### 2.2.3 Immutable `code` sau tạo

Cả 3 entity đều **không cho phép PUT/PATCH `code`**:
- `PUT /api/clients/[id]/route.ts`: data spread chỉ chứa `name/taxCode/industry/companySize/status` — không có `code`.
- `PUT /api/projects/[id]/route.ts`: data spread chỉ chứa `name/clientCompanyId/pmUserId/siteAddress/startDate/endDate/status/quota` — không có `code`.
- `PUT /api/vendors/[id]/route.ts`: data spread chỉ chứa `name/taxCode/phone/email/area/status` — không có `code`.

Đây là điều kiện thuận lợi: **code sinh một lần, immutable**. Backfill hiện tại không cần.

### 2.3 Worker — phân tích bổ sung

Worker hiện tại (`prisma/schema.prisma:247-312`) chỉ có `id uuid` + `phone` + `cccdNumber` + `taxCode` (optional). Không có business code. Theo khảo sát sơ bộ (chưa sâu):
- Worker được tạo tự động từ LaborProfile intake (`src/domains/talent/intake-writer.service.ts`).
- Form admin cho worker có thể tạo thủ công từ `/admin/workers` — cần xác minh thêm (chưa có API route thấy trong `app/api/admin/workers/`).
- User cần thêm `code` cho Worker để nhất quán với 4 entity kia. Format đề xuất: `WKR-001` (zero-pad 3, theo pattern CC/VD).

### 2.4 Contract — không có UI tạo

- `Contract.contractNo` có trong schema nhưng KHÔNG có API route nào (`app/api/contracts/**` không tồn tại).
- KHÔNG có admin UI tạo/sửa Contract trong khảo sát ban đầu.
- Đề xuất: **không đưa Contract vào scope task này** (sẽ được xử lý khi có UI/API).

### 2.5 `User.affCode` — ngoài scope

- `affCode` thuộc referral system (CTV/Sale), là business code riêng của referral flow — khác với master data code.
- Đề xuất: **không đưa vào scope task này** (sẽ được xử lý trong task referral riêng nếu cần).

## 3. Đề xuất — quy tắc mã nhất quán

### 3.1 Format chuẩn hoá

| Entity | Format đề xuất | Ví dụ | So với hiện tại |
|---|---|---|---|
| `ClientCompany` | `CC-` + zero-pad 5 số | `CC-00001` | Hiện `CC-001` (zero-pad 3) |
| `Project` | `PRJ-` + năm 4 số + `-` + zero-pad 5 số | `PRJ-2026-00001` | Hiện `PRJ-2025-001` (zero-pad 3, có thể tràn 999) |
| `StaffingOrder` | `SO-` + zero-pad 5 số | `SO-00001` | **Giữ nguyên** (đã chuẩn) |
| `Vendor` | `VD-` + zero-pad 5 số | `VD-00001` | Hiện `VD-001` (zero-pad 3) |
| `Worker` (NEW) | `WKR-` + zero-pad 5 số | `WKR-00001` | Chưa có |

**Lý do zero-pad 5 số**: tương thích với StaffingOrder hiện tại, hỗ trợ tới 99.999 records/entity trước khi cần migration mở rộng. Project có thêm năm vì thực tế nghiệp vụ (mỗi năm reset counter cho dễ tra cứu).

### 3.2 Server-side generator (authority duy nhất)

Mỗi entity có **một** generator pure function, deterministic, race-safe:

```ts
// src/shared/business-code/business-code.ts (NEW)
export type BusinessCodeKind = 'CLIENT' | 'PROJECT' | 'STAFFING_ORDER' | 'VENDOR' | 'WORKER';

export interface BusinessCodeConfig {
  readonly kind: BusinessCodeKind;
  readonly prefix: string;            // 'CC', 'PRJ', 'SO', 'VD', 'WKR'
  readonly padWidth: number;          // 5
  readonly includeYear?: boolean;     // true cho PROJECT
  readonly yearDigits?: 2 | 4;        // 4 cho PROJECT
}

export interface BusinessCodeGenerator {
  next(input: { projectYear?: number }): string;  // preview
  nextOrThrow(tx: Prisma.TransactionClient, input?: { projectYear?: number }): Promise<string>;
  validate(code: string): boolean;
}
```

Mỗi generator cài đặt `nextOrThrow` theo pattern đã chứng minh race-safe ở StaffingOrder:
1. `pg_advisory_xact_lock(hashtext('${kind}_code'))` — serialize.
2. `SELECT MAX(SUBSTRING(code FROM ${prefix.length+1})::bigint) WHERE code ~ '^<PREFIX>-\d+(-(\d+))?$'` — lấy max.
3. `+ 1`, format, return.
4. Khi commit, lock tự giải phóng.

### 3.3 Schema — KHÔNG cần migration (nếu giữ format cũ)

Nếu T0 chốt **giữ format cũ** (`CC-001`, `VD-001`, zero-pad 3, KHÔNG có năm cho Project nếu có thể):
- Chỉ thay đổi route: từ "client-supplied required" → "server generate, client không gửi field này".
- KHÔNG đụng `prisma/schema.prisma`.
- KHÔNG migration.
- KHÔNG backfill.
- Risk: thấp. Chỉ cần regression test để chắc chắn UX tạo mới vẫn chạy.

Nếu T0 chốt **chuẩn hoá format** (zero-pad 5, Project có năm):
- Cần backfill `UPDATE` cho 3 entity cũ: `CC-001` → `CC-00001`, `PRJ-2025-001` → `PRJ-2025-00001`, `VD-001` → `VD-00001`.
- Cần migration file mới.
- Cần smoke test trên data thật (sandbox/staging trước).
- Consumer: phải verify search/list vẫn match, outbox event payload.code vẫn đúng.
- Risk: trung bình. Backfill có thể chạm row rất nhiều.

### 3.4 Bản ghi mới vs bản ghi cũ vs mã trùng

| Tình huống | Cách xử lý |
|---|---|
| Tạo mới (POST) | Server sinh mã; client KHÔNG gửi `code` trong body. UI bỏ field `code` (vẫn hiển thị readonly ở detail view sau khi tạo). |
| Sửa (PUT/PATCH) | `code` immutable. Client không gửi; server bỏ qua. Schema không cho update. |
| Bản ghi cũ (pre-server-generator) | Mã do client-supplied cũ giữ nguyên — không backfill (nếu giữ format) hoặc backfill (nếu chuẩn hoá). Mã cũ vẫn match regex `^<PREFIX>-\d+`, generator vẫn tìm được max → cộng tiếp từ max hiện có. |
| Mã trùng (collision từ 2 request) | Generator dùng advisory lock → KHÔNG thể xảy ra. Backstop: nếu vì lý do gì vẫn trùng, Prisma sẽ throw `P2002` → 409 CONFLICT → UI retry 1 lần. |
| Mã đã được tham chiếu (FK, outbox, log) | Mã immutable → KHÔNG có nguy cơ reference bị vỡ. Outbox event payload.code chỉ chứa mã tại thời điểm tạo — không bị ảnh hưởng. |

### 3.5 UI changes

- Form tạo mới (`/admin/clients`, `/admin/projects`, `/admin/vendors`): **bỏ field input `code`**. Server sinh tự động, hiển thị readonly sau khi tạo thành công.
- Validation message: "Mã khách hàng sẽ được hệ thống tự sinh khi tạo." (placeholder cho UX).
- Toast/redirect sau tạo: hiển thị mã vừa sinh (e.g. "Đã tạo khách hàng CC-00042").
- Worker (nếu trong scope): tương tự.

### 3.6 Test surface

- 5 unit test mới cho từng generator (helper): race-safety, format, max-or-zero, year-bump, immutable prefix.
- 4 integration test mới cho từng route POST: 2 request đồng thời tạo cùng kind → 2 mã khác nhau, không P2002.
- Update test UI: bỏ testid input `code`; bỏ test "validation yêu cầu code".
- Update 4 route test hiện có (clients/projects/vendors) — verify POST không cần `code` trong body.

## 4. Blocking decision — cần T0 chốt trước khi viết TASK.md

### DEC-T0-01 — Format mã: chuẩn hoá hay giữ nguyên?

- **(A) Giữ format cũ** (`CC-001` zero-pad 3, Project giữ `PRJ-2025-001`):
  - Ưu: KHÔNG migration, KHÔNG backfill, blast radius = 4 route + 4 UI + 1 generator file.
  - Nhược: zero-pad 3 chỉ chịu tới 999 records → tới lúc đó sẽ phải migration anyway.
  - Worker (nếu trong scope) bắt đầu với `WKR-001` (zero-pad 3 cho nhất quán phase này).
- **(B) Chuẩn hoá** (zero-pad 5, Project giữ năm):
  - Ưu: scale tới 99.999, đồng nhất với StaffingOrder hiện tại.
  - Nhược: CẦN migration backfill (`UPDATE`), phải test kỹ trên data thật, blast radius = schema + migration + 4 route + 4 UI + 1 generator file + 1 backfill script.
- **Tier 1 khuyến nghị**: **(A) Giữ format cũ** cho lần này. Mở rộng zero-pad sẽ là task riêng khi gần tới 999.

### DEC-T0-02 — Worker có trong scope không?

- Theo câu trả lời của Owner: **Có, sinh thêm `WKR-001` cho Worker**.
- Cần xác nhận: API route nào tạo Worker? (`POST /api/admin/workers`? `POST /api/workers`? qua LaborProfile intake?)
- Tier 1 cần verify trước khi viết TASK — sẽ làm trong giai đoạn 1 implementation.

### DEC-T0-03 — Có cần migration/index mới không?

- Nếu DEC-T0-01 = A: **KHÔNG cần migration** (giữ nguyên schema, chỉ thay đổi nơi sinh).
- Nếu DEC-T0-01 = B: CẦN migration mới (backfill + có thể CHECK constraint mới).
- Index mới: `@@index([code])` đã có sẵn cho cả 3 entity (qua `@unique`). KHÔNG cần thêm.

### DEC-T0-04 — Backward-compat cho client vẫn gửi `code`?

- Đề xuất: server **accept-and-ignore** nếu client vẫn gửi `code` trong body. Nếu client gửi mã đã tồn tại → 409 CONFLICT (giữ hành vi cũ). Nếu client gửi mã mới hợp lệ (chưa tồn tại) → 400 BAD_REQUEST với message "Mã phải do hệ thống tự sinh.".
- Tier 1 cần T0 xác nhận: strict reject (chỉ accept body không có `code`) hay accept-and-ignore?

## 5. Đề xuất kiến trúc implementation (khi T0 duyệt)

### 5.1 File tree delta (dự kiến — chỉ tham khảo, không phải TASK.md)

```
src/shared/business-code/
  business-code.ts (NEW)            # BusinessCodeConfig, BusinessCodeGenerator types
  generators.ts (NEW)               # createGenerator(config) factory
  generators.test.ts (NEW)          # 5 unit test × 4 entity (20 cases)
  advisory-lock.ts (NEW)            # pg_advisory_xact_lock wrapper (refactor từ order.service)

src/domains/staffing/
  order.service.ts (EDIT)           # Refactor: dùng createGenerator thay vì inline SQL

app/api/clients/route.ts (EDIT)     # Bỏ code từ body; gọi generator
app/api/clients/[id]/route.ts (NO CHANGE — code immutable đã đúng)
app/api/projects/route.ts (EDIT)    # Bỏ code từ body; gọi generator
app/api/projects/[id]/route.ts (NO CHANGE)
app/api/vendors/route.ts (EDIT)     # Bỏ code từ body; gọi generator
app/api/vendors/[id]/route.ts (NO CHANGE)
app/api/workers/route.ts (NEW hoặc EDIT — tùy route hiện có)

app/admin/clients/page.tsx (EDIT)   # Bỏ input "Mã khách hàng" trong modal tạo
app/admin/projects/page.tsx (EDIT)
app/admin/vendors/page.tsx (EDIT)
app/admin/workers/page.tsx (EDIT)   # Nếu trong scope

src/domains/crm/__tests__/... (NEW/UPDATE)  # Race-safety integration test
```

### 5.2 Khi nào KHÔNG dùng generator

- `JobPosting.slug` — đã có logic riêng (slug từ title, không phải sequential). KHÔNG nằm trong task này.
- `User.affCode` — referral system, KHÔNG nằm trong task này.
- `Permission.code` — enum seed, KHÔNG nằm trong task này.
- `StaffingOrderSlot.positionCode` — vocabulary (ELECTRICIAN, ...), KHÔNG nằm trong task này.

## 6. Proposal gửi T0 — chờ quyết

Tier 1 đề xuất T0 chốt **4 decision** ở §4 để có thể viết TASK.md `READY_TO_CODE`. Khi T0 duyệt:
- Tier 1 sẽ viết TASK.md đầy đủ (decision state CLOSED, contract gate READY_TO_CODE).
- Tạo worktree riêng, pin baseline, implement theo file tree §5.1.
- Tự review, chạy canonical gates, freeze SHA, viết HANDOFF.
- Mở PR, dừng trước merge/deploy (STOP rule giữ nguyên).

**Lưu ý cho T0**:
- (A) Giữ format cũ (đề xuất) → blast radius thấp, 1 worktree, 1 PR.
- (B) Chuẩn hoá format → blast radius cao hơn, CẦN audit LIGHT (CRITICAL task vì chạm schema), 1 correction budget.
- Worker (DEC-T0-02): nếu có thêm, scope tăng 1 route + 1 UI + 1 generator kind.
- DEC-T0-04 (backward-compat): strict reject hay accept-and-ignore sẽ ảnh hưởng UX của client cũ nếu có integration ngoài.

## 7. Revision Log

| Version | Date | Author | Change |
|---|---|---|---|
| v0.1 DRAFT_FOR_T0_REVIEW | 2026-10-12 | Tier 1 | Initial contract planning — chỉ khảo sát + đề xuất, chờ T0 chốt 4 DEC. |
