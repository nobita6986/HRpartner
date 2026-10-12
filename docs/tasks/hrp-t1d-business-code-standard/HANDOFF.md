# hrp-t1d-business-code-standard — HANDOFF

## Outcome

T1D — Business Code Standard & Shared Generator. Mọi business code master
data giờ do **server sinh tự động** (ClientCompany.code, Project.code,
Vendor.code, Worker.userId, StaffingOrderSlot.positionCode). Client không
gửi code trong body — strict reject `400 SERVER_GENERATED_CODE`.

## Implementation SHA

`951d87e8e9dd1b727346559622e59d5e32ba3845`

## Baseline

`e98eb1ba38736722b72e6cc8e6099553c71e027f` (TASK.md v1.0 contract gate READY_TO_CODE).

## Contract decisions (DEC-T0-01..05)

- **DEC-T0-01**: format giữ nguyên. Zero-pad 3 là **MIN width** — vượt 999 vẫn
  sinh đúng (`CC-1000`, `PRJ-2026-1000`). Không cap.
- **DEC-T0-02**: Worker dùng `Worker.userId` (đã có sẵn, `UNIQUE`). KHÔNG
  thêm `Worker.code` mới.
- **DEC-T0-03**: NO MIGRATION. Schema cũ giữ nguyên. Legacy code (`APP-${id}`,
  `GEN`, `ELECTRICIAN`, `USR-001`, `VD-1`, `CC-1`, `PRJ-2024-001` chứa year
  cũ) bị regex `^<PREFIX>-\d+$` (year-aware cho PROJECT) bỏ qua khi tìm MAX.
- **DEC-T0-04**: strict server authority. Route POST nào có generator đều
  reject `400 SERVER_GENERATED_CODE` nếu body chứa `code` (hoặc `userId` /
  `positionCode`).
- **DEC-T0-05**: StaffingOrderSlot.positionCode trong scope. Cấp N mã qua
  `nextBusinessCodeBatch` trong CÙNG transaction; không query MAX riêng rẽ
  trước nested-create. `updateStaffingOrder` (append slot mới) cấp 1 mã qua
  `nextBusinessCode` (cùng lock key, sequence monotonic).

## Tệp thay đổi

### Mới (2 tệp)

- `src/shared/business-code/business-code.ts` — module generator
  (`nextBusinessCode` + `nextBusinessCodeBatch` + `BusinessCodeError`).
  - 5 kind: CLIENT, PROJECT (year-aware), VENDOR, WORKER_USER_ID,
    STAFFING_ORDER_SLOT_POSITION.
  - Advisory lock: `pg_advisory_xact_lock(hashtext('business_code:<lockKey>'))`.
  - Regex filter: `^<PREFIX>-\d+$` (PROJECT: `^PRJ-${year}-[0-9]+$`).
  - `SUBSTRING(<col> FROM <numberFrom>)::bigint` lấy phần số.
  - Cap batch 1000 (DoS chống).

- `src/shared/business-code/__tests__/business-code.test.ts` — 29 unit tests
  (mock `$executeRawUnsafe` + `$queryRawUnsafe`):
  - Format cơ bản CC-001, PRJ-{YYYY}-001, VD-001, USR-EMP-001, POS-001.
  - Min-width: max=999 → CC-1000; max=12345 → CC-12346 (không cap).
  - Year-aware: max=999 năm 2026 → PRJ-2026-1000; year=2027 → reset PRJ-2027-001.
  - Batch 1, 3, 5, 10 (kiểm tra strictly increasing, không trùng).
  - Error: thiếu `opts.year` cho PROJECT, count<=0, year ngoài range, count>1000.
  - Legacy regex skip: bảng có `"wu-test-1"` không match `^USR-EMP-\d+$` bị bỏ qua.
  - Snapshot `__INTERNAL_CONFIG__` (5 kind, prefix đúng DEC-T0-01, chỉ PROJECT có `includeYear`).

### Routes (4 tệp)

- `app/api/clients/route.ts` — POST: strict reject `code` ∈ body; gọi
  `nextBusinessCode(tx, 'CLIENT')`. Trả `400 SERVER_GENERATED_CODE` với
  message VN.
- `app/api/projects/route.ts` — POST: strict reject `code` ∈ body; derive
  `year = new Date(startDate).getUTCFullYear()`; gọi
  `nextBusinessCode(tx, 'PROJECT', { year })`. Tương thích: nếu thiếu
  `startDate` thì 400 VALIDATION (giữ contract cũ).
- `app/api/vendors/route.ts` — POST: strict reject `code`; gọi
  `nextBusinessCode(tx, 'VENDOR')`.
- `app/api/staffing/orders/route.ts` — POST: strict reject nếu bất kỳ
  `slot.positionCode` nào ∈ body; bỏ validation `positionCode?.trim()` cũ.

### Service (2 tệp)

- `src/domains/staffing/order.service.ts`:
  - `createStaffingOrder` (line 130+): thêm `nextBusinessCodeBatch` trước
    nested-create. Map `positionCodes[idx]` thay vì `slot.positionCode`.
  - `updateStaffingOrder` (append slot mới, line 580+): thêm
    `nextBusinessCode(tx, 'STAFFING_ORDER_SLOT_POSITION')` trước
    `tx.staffingOrderSlot.create`.
- `src/domains/applications/conversion.service.ts`:
  - Import `nextBusinessCode`.
  - `createWorkerFromApplication` (line 590+): thay `userId: \`APP-${id}\``
    bằng `userId: await nextBusinessCode(tx, 'WORKER_USER_ID')`.
- `src/domains/staffing/types.ts`:
  - `CreateSlotInput.positionCode` và `UpdateSlotInput.positionCode`: từ
    `string` bắt buộc → `string` optional. Comment chỉ rõ field chỉ tồn
    tại để route strict-reject.

### Admin UI (4 tệp)

- `app/admin/clients/page.tsx`: bỏ input `code`; sau khi tạo thành công
  hiển thị `Mã khách hàng: <code>` trong panel info và nút "Đóng".
- `app/admin/vendors/page.tsx`: tương tự cho Vendor.
- `app/admin/projects/projects-table-client.tsx`: tương tự cho Project.
- `app/admin/staffing/staffing-list-client.tsx`: bỏ input `positionCode`;
  hiển thị "Hệ thống tự sinh (POS-001, POS-002, …)" thay thế; sau khi tạo
  thành công hiển thị danh sách mã server sinh (`Mã vị trí: <list>`).

### Test update (5 tệp)

- `src/shared/auth/clients-master.route.test.ts`: thêm mocks
  `$executeRawUnsafe` + `$queryRawUnsafe`; thêm test
  `POST: body chứa 'code' → 400 SERVER_GENERATED_CODE`; cập nhật test
  `POST → 201` bỏ `code` trong body, assert `code: 'CC-001'`.
- `src/shared/auth/projects-master.route.test.ts`: tương tự cho Project;
  thêm test SERVER_GENERATED_CODE; assert `code: 'PRJ-2026-001'`.
- `src/shared/auth/vendors-master.route.test.ts`: tương tự cho Vendor; thêm
  test SERVER_GENERATED_CODE; assert `code: 'VD-001'`.
- `src/domains/applications/conversion.service.test.ts`: thêm mocks
  `$executeRawUnsafe` + `$queryRawUnsafe`; cập nhật assertion
  `userId: 'USR-EMP-001'`.
- `src/domains/staffing/order.service.test.ts`: cập nhật test "gọi 2 lần →
  2 mã khác nhau" — mỗi create giờ chạy 2 queryRaw (1 cho `SO-` + 1 cho
  `POS-`); assert đúng line numbers.
- `src/shared/security/required-relation-sweep.static.test.ts`: shift
  line numbers trong `EXPECTED_HITS` cho 9 dòng (do thêm import +
  comment vào `conversion.service.ts` và `order.service.ts`):
  - `app/api/projects/route.ts:55 → 56` (clientCompany)
  - `src/domains/applications/conversion.service.ts:130 → 131` (laborProfile)
  - `src/domains/staffing/order.service.ts` 6 dòng: 207→218, 233→244,
    346→357, 351→362, 443→454, 474→485.

## Tệp KHÔNG thay đổi (chủ ý)

- `prisma/schema.prisma` — DEC-T0-03: NO MIGRATION.
- `prisma/migrations/**` — không có migration mới.
- Tất cả GET routes (read master) — chỉ POST thay đổi để sinh code.

## Gates

| Gate | Lệnh | Kết quả |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | PASS (0 errors) |
| Lint | `npm run lint` | 0 errors, 1009 warnings (pre-existing) |
| Unit tests | `npm run test:unit` | 5188/5188 pass (325 files, 9 skipped) |
| Build | `npm run build` | PASS |
| UTF-8 no-BOM | `node .ai-pipeline/scripts/verify-encoding.mjs` | PASS (19/19) |
| Encoding script | `verify-encoding.mjs` (worktree dùng .mjs, .ps1 chưa có) | PASS |

## Integration test (DB) — chưa chạy

`test:integration` cần DB connection (TEST_DATABASE_URL). Worktree chưa có
DB. Tier 0 nói "không tự chạy", nên Owner chạy CI gate sau khi push.

## Pattern cho tham chiếu

Pattern lock + MAX query trong `order.service.ts:108-122`
(`generateOrderCode`) dùng `pg_advisory_xact_lock(hashtext('staffing_order_code'))`
— T1D generator theo CÙNG pattern (theo yêu cầu DEC-01..06). Lock key
T1D format: `business_code:<lockKey>` (vd `business_code:client_code`).

## Push & PR

Đẩy branch `codex/t1d-business-code-standard` lên `origin`. Mở PR từ
branch vào `main`. Reviewer cần check:
1. Test diff: 4 file test master route + conversion test + order test +
   required-relation-sweep test đều phản ánh contract mới (line shifts là
   shift logic, không phải logic thay đổi).
2. Regression: `Worker.userId` không còn `APP-${id}` cho worker mới
   (chỉ worker convert qua `conversion.service` từ candidate submission).
   Row cũ giữ `APP-...` vẫn OK vì regex skip.
3. UI: 4 form tạo mới không còn input code; admin vẫn thấy mã server sinh
   sau khi lưu thành công.

## Hand-off notes

- Worker cũ với `userId = "APP-..."` vẫn hoạt động (regex `^USR-EMP-\d+$` skip).
- Nếu cần regenerate toàn bộ `Worker.userId` sang format mới, đó là 1 task
  T+1 riêng (script migration offline + audit log).
- Year-aware PROJECT: regex scope theo năm, nên `PRJ-2024-001` không ảnh
  hưởng `PRJ-2026-N`. Sequence PROJECT reset mỗi năm (mặc định contract).
- Batch cap 1000: nếu nghiệp vụ staffing cần > 1000 slot/transaction, lift
  cap lên (constant trong `business-code.ts:204`).
