# HANDOFF: hrp-v5-go-live-03-admin-surface-truth

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-03-admin-surface-truth` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | **v1.1** (đọc lại đầu lượt, khớp TASK) |
| Execution round | **1** |
| Current audit round | `0` (chưa audit) |
| Executor | Tier 2 — Engineer |
| Baseline | `776a3c1` (`main`). Actual start state: working tree đã dirty sẵn 3 file ngoài luồng (`docs/PLANNER_HANDOVER.md`, `docs/tasks/hrp-v5-go-live-02-public-surface-exposure/AUDIT.md`, `public/index.html`) + thư mục untracked `docs/tasks/hrp-v5-go-live-04-public-read-rls-closure/` của Tier 1. HEAD lúc nộp vẫn `776a3c1`, **chưa stage, chưa commit** |
| Status | `READY_FOR_AUDIT` (có deviation MUST được sếp uỷ quyền giữa lượt — xem §5) |
| Started/updated | 2026-08-29 → **2026-08-30 10:51 +07:00** |

> Tôi đã Read lại `TASK.md` ngay đầu lượt này và xác nhận vẫn là **v1.1 /
> `READY_FOR_EXECUTION`** (bài học `hrp-reread-task-each-round`: Tier 1 có thể bump
> spec giữa lúc Tier 2 đang code mà git không báo gì).

## 1. Outcome Summary

Tôi đã làm xong toàn bộ STEP-00..STEP-10 của v1.1. Bề mặt `/admin` giờ nói tiếng
nghiệp vụ và **hai ngõ chết chặn việc thật đã mở**:

1. **Bỏ nhãn pipeline khỏi khung admin** — nav không còn badge `M2/M3/M4/M7`,
   header không còn `Nội bộ — Phase 4`, prop `brandSubtitle` bị xoá khỏi toàn repo,
   dead export `ADMIN_NAV` bị xoá (AC-01, AC-10).
2. **`/admin` viết lại theo việc cần làm**, không còn `Phase 4 / DEC-17 / Moment /
   STEP- / AC- / narrative / module` (AC-02).
3. **`/admin/jobs` không còn phá bảng khi publish lỗi** — lỗi hành động hiện thành
   banner `role="alert"` phía trên bảng, bảng vẫn nguyên; chỉ lỗi *tải danh sách*
   mới thay thế các dòng (AC-03, AC-04).
4. **Cột `Slot trống` là slot trống thật**, tính đúng công thức của
   `publish.service.ts`, không phải `project.quota` nữa; không đọc được thì in `—`
   kèm ghi chú, **không bao giờ in `0`** (AC-05, AC-06).
5. **Form dự án có `quota` + `siteAddress`**, kèm cảnh báo để trống nghĩa là 0 và
   quota 0 sẽ chặn lần chuyển ứng viên đầu tiên (AC-07).
6. **Form staffing bỏ ô nhập UUID**, thay bằng select dự án và thêm lương giờ / giờ
   ca / địa điểm / hạn nhận / hạn slot (AC-08).
7. **`/admin/settings` không còn hứa link chết** — không còn `href`, không còn
   `Module M7`, mỗi mục ghi `Chưa khả dụng` (AC-09).

Trên đường đo AC-08 tôi đụng **hai defect P0 có sẵn từ trước lượt này** — chúng làm
`POST /api/staffing/orders` **chưa bao giờ chạy được** kể từ khi file được tạo, và
mọi đơn có lương giờ đều không đọc được chi tiết. Sếp đã cho vá cả hai ngay trong
lượt ("Cho sửa 1 ký tự ngay", "Cho sửa luôn 3 chỗ return"). Vá xong: `SO-00003`
tạo `201`, cả **7/7** đơn đọc chi tiết `200`. Vì hai bản vá này nằm ngoài §4.2,
**AC-11 như chữ viết trong contract FAIL** — chi tiết ở DEV-01/DEV-02 và §5.
Tôi không sửa contract; Tier 1 cần phê chuẩn.

## 2. Execution Trace

Đánh số STEP theo đúng §6 của TASK v1.1 (`RQ-01`→`STEP-01` … `RQ-11`→`STEP-10`).

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-00` | — | `scratch/golive03-seed.mjs` (`inspect`/`verify`/`snapshot`) | `DONE` | Query kiểm của `scratch/seed-hrp-live-demo.sql` phải chạy qua wrapper đặt GUC, xem chú thích dưới bảng |
| `STEP-01` | `RQ-01` | `src/shared/ui/role-guard/role-guard-layout.tsx`, `app/admin/admin-shell.tsx` | `DONE` | None |
| `STEP-02` | `RQ-02` | `app/admin/page.tsx` | `DONE` | None |
| `STEP-03` | `RQ-03`, `RQ-04` | `app/admin/jobs/page.tsx` (`listError`/`actionError`, `publishErrorText`, banner) | `DONE` | Phần render chỉ lập luận từ code — `LIM-01` |
| `STEP-04` | `RQ-05` | `src/domains/staffing/order.service.ts` (`listStaffingOrders`), `app/admin/jobs/page.tsx` (`freeSlotsByProject`, cột `Slot trống`) | `DONE` | Kèm `DEV-01` (1 ký tự `)` cùng file, sếp uỷ quyền) |
| `STEP-05` | `RQ-06` | `app/admin/projects/page.tsx` (modal `quota` + `siteAddress`) | `DONE` | None |
| `STEP-06` | `RQ-07` | `app/admin/staffing/page.tsx` (select dự án + 7 ô mới) | `DONE` | `DEV-03` (2 chuỗi tiêu đề/nút); read-back qua endpoint chi tiết — `LIM-02` |
| `STEP-07` | `RQ-08` | `app/admin/settings/page.tsx` | `DONE` | None |
| `STEP-08` | `RQ-09` | `src/shared/ui/role-guard/role-guard-layout.tsx` (xoá export `ADMIN_NAV`) | `DONE` | `rg` không có trên PATH → grep bằng `Select-String`, xem §3.1 |
| `STEP-09` | `RQ-10` | 4 gate + `git status --short` | `DONE` gate / `FAIL` mệnh đề scope | `DEV-02`: `git status` có 2 file `app/api/staffing/**` (sếp uỷ quyền) ⇒ **AC-11 FAIL as-written**, xem §3.8 |
| `STEP-10` | `RQ-11` | snapshot đóng màn + danh sách mã `DEMO` + SQL dọn | `DONE` | `DEV-05`: mã đơn `SO-000xx` do service tự sinh nên không mang prefix `DEMO` |

Chi tiết từng STEP:

- **STEP-00** — HEAD `776a3c1`. Snapshot `SELECT code, is_public FROM outsourcing_projects
  ORDER BY code` **6 dòng**, `is_public = TRUE` đúng **2** dòng (`DA-DEMO-001`,
  `DA-DEMO-002` — của sếp). Query kiểm trong `scratch/seed-hrp-live-demo.sql` chạy trần
  sẽ trả rỗng vì các bảng bật FORCE RLS; tôi bọc nó trong `prisma.$transaction` có
  `set_config('app.user_id'|'app.role'|'app.vendor_id'|'app.worker_id', …, true)` rồi mới
  đọc — đây là lý do dữ liệu "có sẵn" của `EV-21` vẫn cần wrapper mới thấy. Không cần
  chạy lại phần `INSERT`. 3 file dirty ngoài luồng: **không stage, không restore**.
- **STEP-01** — bỏ field `badge` khỏi `NavItem` và khỏi 4 mục `ADMIN_NAV_PHASE4`, bỏ chỗ
  render badge, bỏ prop `brandSubtitle` và chỗ truyền `"Nội bộ — Phase 4"`.
  `RISK-01`: đã grep `brandSubtitle` toàn `app/ src/ prisma/ scripts/ public/` (444 file)
  → **0 match**, nên không portal nào (vendor/worker/CTV) còn truyền prop ⇒ bỏ hẳn được,
  stop condition (b) không chạm.
- **STEP-02** — `/admin` viết lại theo việc vận hành (đơn tuyển, dự án, ứng viên, chấm
  công); xoá khối "Tiến độ Round 2 / Phase 4" (`EV-06`) và mọi dòng `STEP-`/`AC-`.
- **STEP-03** — 2 state riêng: `listError` (dòng 120) / `actionError` (dòng 122).
  `publishErrorText()` (248-261) dịch 400/403/404/409/`INVALID_STATE` sang tiếng nghiệp
  vụ và **mọi nhánh đều nêu `job.projectCode`** (`RQ-04`). Banner `role="alert"` render ở
  333-348, **trên** `<table>`. Publish thành công → `setActionError('')`. INV-03 giữ
  nguyên: vẫn `POST /api/projects/{id}/publish` với `expectedVersion` + `reason`.
- **STEP-04** — thêm `validTo: true` vào nested select `slots` (`DEC-11`, `EV-16`);
  `freeSlotsByProject()` (47-60) sao đúng công thức `publish.service.ts`; loader phân
  trang 50/trang tối đa 10 trang (`DEC-12`); sửa **cả hai** vế `availableSlots` và
  `totalNeeded` từng cùng gán `project.quota` (`EV-23`); tiêu đề cột `Slot trống`
  (dòng 363, `DEC-08`/`RISK-03`); không đọc được → `freeSlots = null` + ghi chú, in `—`
  chứ **không in `0`**; `blockPublish` chỉ chặn khi `knownFree === 0`, dữ liệu chưa về
  (`undefined`) thì vẫn cho bấm để API quyết (`RQ-05`).
- **STEP-05** — 2 ô `quota` (integer ≥ 0, validate 66-71) + `siteAddress`; gửi omit-empty
  (`if (quotaNumber !== null) body.quota = …`); dòng nhắc `DEC-06`: "Để trống nghĩa là 0.
  Quota 0 sẽ chặn lần chuyển ứng viên đầu tiên vào dự án."
- **STEP-06** — bỏ input UUID (`EV-11`/`EV-15`), thay bằng `<select>` nạp
  `GET /api/projects?take=50` hiển thị `code` + `name`; thêm `positionCode` (mặc định gợi
  ý `GEN`, hết hardcode), `hourlyRateVnd`, `shiftStart`, `shiftEnd`, `workLocation`,
  `deadlineDate`, `validTo`; field trống thì **omit** khỏi body (không gửi chuỗi rỗng).
- **STEP-07** — bỏ toàn bộ `href` (0 match), bỏ `Module M7`, mỗi nhóm gắn `Chưa khả dụng`.
- **STEP-08** — xoá export `ADMIN_NAV`, giữ `ADMIN_NAV_PHASE4`. Bằng chứng không còn ai
  import: grep `ADMIN_NAV\b` trên 444 file `app/ src/ prisma/ scripts/ public/` → **0
  match** (word boundary nên không đếm `ADMIN_NAV_PHASE4`), và nếu còn import sót thì
  `npm run typecheck` + `npm run build` đã đỏ — cả hai đều `EXIT=0`.
- **STEP-09/STEP-10** — §3 và §5.

## 3. Acceptance Evidence

Mọi dòng dưới đây là lệnh thật + exit code thật + output thật, chạy trên máy này,
`main` @ `776a3c1` với working tree đang dirty như §4. Không có evidence mock.

| AC | Command/check | Exit/result | Evidence | Limitation |
|---|---|---|---|---|
| — | `& .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-v5-go-live-03-admin-surface-truth\TASK.md` | `RESULT: PASS`, `EXIT=0` | contract v1.1 hợp lệ | None |
| `AC-01` | `& .\scratch\golive03-greps.ps1` | `PASS` ×3, `EXIT=0` | §3.1 | None |
| `AC-02` | cùng script | `PASS`, `EXIT=0` | §3.1 | None |
| `AC-03` | `node scratch/golive03-ac-drive.mjs` (publish dự án 0 slot) | `400 INVALID_STATE` | §3.2 | Render chỉ lập luận từ code — `LIM-01`; contract ghi `409`, đo được `400` — `DEV-04` |
| `AC-04` | đọc code `handlePublish` + banner | `PASS` (code path) | §3.2 | `LIM-01` |
| `AC-05` | `node scratch/golive03-ac08-remeasure.mjs` | 7 dòng; `DA-DEMO-003` `quota=12` nhưng in `10` | §3.3 | None |
| `AC-06` | `& .\scratch\golive03-greps.ps1` + bảng ở §3.3 | `PASS`, `EXIT=0` | §3.1, §3.3 | None |
| `AC-07` | `node scratch/golive03-ac-drive.mjs` → `POST /api/projects` | `201`, đọc lại `quota=12` | §3.4 | None |
| `AC-08` | `node scratch/golive03-ac08-remeasure.mjs` → `POST /api/staffing/orders` | `201` `SO-00003`, read-back `200` đủ 6 field | §3.5 | Read-back qua endpoint chi tiết — `LIM-02` |
| `AC-09` | `& .\scratch\golive03-greps.ps1` | `PASS` ×3, `EXIT=0` | §3.1 | None |
| `AC-10` | `& .\scratch\golive03-greps.ps1` | `PASS` ×2, `EXIT=0` | §3.1 | None |
| `AC-11` | `npm run typecheck` / `lint` / `test:unit` + `git status --short` + `git diff -- src/domains/` | gate `EXIT=0`; **2 mệnh đề còn lại FAIL** | §3.8 | `DEV-01` + `DEV-02` (sếp uỷ quyền) — cần Tier 1 phê chuẩn |
| `AC-12` | `node scratch/golive03-seed.mjs snapshot` (đầu và cuối round) | 6 dòng → 7 dòng, `is_public=TRUE` vẫn đúng 2 | §3.9 | None |

### 3.0 Gate bắt buộc

| # | Lệnh | Exit | Output |
|---|---|---|---|
| G-00 | `& .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-v5-go-live-03-admin-surface-truth\TASK.md` | **0** | `RESULT: PASS. TASK contract is ready for execution.` |
| G-01 | `npm run typecheck` | **0** | không lỗi |
| G-02 | `npm run lint` | **0** | `✖ 492 problems (0 errors, 492 warnings)` |
| G-03 | `npm run test:unit` | **0** | `Test Files 91 passed (91)` / `Tests 1408 passed (1408)` |
| G-04 | `npm run build` | **0** | build xong, in đủ route table |

`verify-task.ps1` nhận **`-TaskPath`** (đường dẫn file), không phải `-TaskName`; máy
này **không có `pwsh`** trên PATH nên gọi bằng `&` trong PowerShell 5.1.

### 3.1 AC tĩnh — AC-01, AC-02, AC-06, AC-09, AC-10

`rg` **không có trên PATH** máy này (`rg : The term 'rg' is not recognized…`), nên tôi
viết `scratch/golive03-greps.ps1` chạy lại đúng 6 grep của contract bằng
`Get-Content -Encoding UTF8 | Select-String`. Script viết toàn ASCII, dùng `.` cho ký
tự có dấu, nên không phụ thuộc encoding của chính nó (PowerShell 5.1 đọc `.ps1`
UTF-8-không-BOM theo ANSI và đã làm lượt đầu chết với `The string is missing the
terminator`). Script **chỉ đọc**, exit 0 chỉ khi mọi kỳ vọng đúng.

```
& .\scratch\golive03-greps.ps1
source files quet: 444

=== AC-01 (RQ-01) ===
PASS  AC-01 badge trong role-guard-layout.tsx -> 0 match
PASS  AC-01 chuoi "Noi bo - Phase 4" -> 0 match trong app/ src/ prisma/ scripts/ public/
PASS  AC-01 prop brandSubtitle -> 0 match trong app/ src/ prisma/ scripts/ public/

=== AC-02 (RQ-02) ===
PASS  AC-02 jargon trong app/admin/page.tsx -> 0 match
      [pattern: Phase 4|DEC-17|Moment|STEP-|AC-|narrative|module]

=== AC-06 (RQ-05) ===
PASS  AC-06 project.quota trong jobs page -> 0 match
PASS  AC-06 tieu de cot "Slot trong" -> 1 match
        line 363: >Slot trống<

=== AC-09 (RQ-08) ===
PASS  AC-09 href trong settings page -> 0 match
PASS  AC-09 chuoi "Module M7" -> 0 match
PASS  AC-09 nhan "Chua kha dung" -> 3 match
        line 77: Chưa khả dụng

=== AC-10 (RQ-09) ===
PASS  AC-10 dead export ADMIN_NAV (word boundary) -> 0 match
PASS  AC-10 ADMIN_NAV_PHASE4 con nguyen -> 1 match
        line 103: export const ADMIN_NAV_PHASE4: NavItem[] = [

RESULT: ALL GREP EXPECTATIONS PASS
EXIT=0
```

### 3.2 AC-03 / AC-04 — publish lỗi không phá bảng

Repo **không có playwright/puppeteer** (đã kiểm `package.json`), nên trạng thái render
của React không script được. Tôi đo phần đo được (HTTP thật) và lập luận phần còn lại
bằng code — xem LIM-01.

Phần đo thật: gọi `POST /api/projects/{id}/publish` trên dự án còn **0 slot trống**
(`PRJ-INTERNAL`) bằng đúng body UI gửi (`expectedVersion` + `reason`):

```
[AC-03] POST /api/projects/{id}/publish (0 slot trong) -> 400 error=INVALID_STATE
```

Contract ghi ngoặc "kỳ vọng `409`". Route này trả **400** cho `INVALID_STATE` —
`409` được dành cho `expectedVersion` lệch (optimistic concurrency). Đây là sai lệch
**của lời văn contract**, không phải của code, và tôi không sửa route (DEV-04).

Phần lập luận từ code — `app/admin/jobs/page.tsx`:

- hai state tách rời: `listError` (dòng 120) và `actionError` (dòng 122);
- `handlePublish` (263-290) chỉ `setActionError(...)`, **không** touch `jobs`;
- banner render ở 333-348, **trên** `<table>`, có `role="alert"`;
- trong `<tbody>` (368-411) chỉ `listError` mới thay dòng bằng `<td colSpan={5}>`;
- publish thành công → `setActionError('')` rồi reload danh sách.

⇒ Không có đường code nào để `actionError` xoá bảng. Tier 3 xác nhận lại bằng đọc
code hoặc mở `/admin/jobs` bằng session thật.

### 3.3 AC-05 / AC-06 — cột `Slot trống` là số thật

Tôi copy nguyên `freeSlotsByProject` của UI sang script đo và chạy trên **payload API
thật** (không tính lại bằng SQL, để chứng minh đúng cái UI hiển thị):

```
[AC-05/AC-06] cột "Slot trống" của /admin/jobs (trạng thái cuối):
  DA-DEMO-003   Slot trống 10
  DA-DEMO-001   Slot trống 10
  DA-DEMO-002   Slot trống  5
  DA-2026-022   Slot trống  3
  DA-2026-018   Slot trống  5
  PRJ-INTERNAL  Slot trống  —
  PRJ-SV-014    Slot trống  —
```

Ba bằng chứng trong đúng bảng này:

- (a) **không còn là `project.quota`**: `DA-DEMO-003` có `quota = 12` (chính giá trị AC-07
  vừa gửi lên, §3.4) nhưng cột in **10**. Theo `EV-23` của TASK, nếu vẫn dùng `quota` thì
  `DA-DEMO-001`/`DA-DEMO-002` phải in `20 / 20` và `15 / 15`; thực tế in **10** và **5** —
  đúng số slot trống mà `EV-21`/`EV-23` ghi nhận.
- (b) dự án không có đơn publishable in `—`, **không in `0`** (`RQ-05`/`DEC-12`).
- (c) `DA-DEMO-003` cộng đúng 3 đơn con: `SO-00001` 4 + `SO-00002` 2 + `SO-00003` 4 = **10**
  (không đơn nào quá `deadlineDate`, không slot nào quá `validTo` nên không có gì bị trừ).

Đối chiếu bằng đường DB độc lập (`scratch/golive03-seed.mjs verify`, đặt GUC trong
transaction để đọc dưới FORCE RLS): 5 dòng, `DA-DEMO-001 × SO-DEMO-001 = 10`,
`DA-DEMO-002 × SO-DEMO-002 = 5`, `DA-DEMO-003 × SO-00001/2/3 = 4/2/4`. Khớp bảng trên.

`isPublic` của 7 dòng này nằm ở §3.9 (`AC-12`) để không lặp số liệu hai chỗ.

### 3.4 AC-07 — form dự án gửi được `quota` + `siteAddress`

`POST /api/projects` bằng đúng body modal dựng (có `quota: 12` và một địa chỉ DEMO ở
`siteAddress`) → **201**, rồi đọc lại qua `GET /api/projects?search=DA-DEMO-003`:

```
[data] DA-DEMO-003 id <đã mask> quota=12 siteAddress="<địa chỉ DEMO, đọc lại đúng
       giá trị đã gửi>" isPublic=false
```

`quota=12` là số đã gửi (không phải default 0) ⇒ field đi tới DB thật. Body vẫn chỉ
gồm field API đã hỗ trợ, và omit-empty nên bỏ trống 2 ô mới thì payload y như trước
lượt này (INV-01).

### 3.5 AC-08 — form staffing tạo được đơn đủ field

Đo bằng `node scratch/golive03-ac08-remeasure.mjs` (mint JWT ADMIN từ `JWT_SECRET`,
mask id, dữ liệu prefix `DEMO`, **không publish gì** — DEC-10/AC-12):

```
[AC-08] POST /api/staffing/orders -> 201
[AC-08] order code=SO-00003 id=<đã mask>
[AC-08] GET /api/staffing/orders/{id} -> 200; order.deadlineDate=2026-09-28T00:00:00.000Z
{
  "positionCode": "DIEN",          "positionTitle": "Tho dien",
  "slotsNeeded": 4,                "slotsFilled": 0,
  "hourlyRateVnd": 35000,          "shiftStart": "07:00",
  "shiftEnd": "16:00",             "workLocation": "KCN DEMO Yen Phong, Bac Ninh",
  "validFrom": "2026-08-30T00:00:00.000Z", "validTo": "2026-12-31T00:00:00.000Z"
}
```

Cả 6 field mới của form (lương giờ, giờ bắt đầu, giờ kết thúc, địa điểm, hạn nhận đơn,
hạn slot) đọc lại đúng giá trị đã gửi. Read-back phải dùng endpoint **chi tiết** vì
projection của list cố tình hẹp (không có `hourlyRateVnd`/`shiftStart`/`shiftEnd`/
`workLocation`) — LIM-02.

### 3.6 INV-01 + DEC-11 — payload list không mất field, chỉ thêm `validTo`

```
[INV-01/DEC-11] GET /api/staffing/orders?take=50 -> 200, total=7
  mọi dòng đều có: code, status, deadlineDate, projectId,
  slots[]: { slotsNeeded, slotsFilled, validTo }
```

`validTo` là field **duy nhất** được thêm; không field nào mất. Đây cũng là điều kiện
để cột `Slot trống` bỏ được slot hết hạn — trước DEC-11 UI không có dữ liệu để trừ.

### 3.7 Regression của bản vá BigInt (DEV-02)

```
[BigInt] gọi lại chi tiết TỪNG đơn trong list (trước bản vá: mọi đơn có lương giờ 500):
[BigInt] SO-00003     -> 200 hourlyRateVnd=35000
[BigInt] SO-DEMO-001  -> 200 hourlyRateVnd=30000
[BigInt] SO-DEMO-002  -> 200 hourlyRateVnd=28000
[BigInt] … quét hết 7/7 đơn -> 200, không còn dòng nào 500
```

`SO-DEMO-001` / `SO-DEMO-002` là dữ liệu seed của Tier 1 từ lượt trước, **trước bản vá
đều trả 500** — bằng chứng defect có sẵn, không do lượt này sinh ra. (Tôi chỉ dán lại
3 dòng có giá trị lương giờ tôi ghi chắc chắn; toàn bộ 7 dòng nằm trong log của
`scratch/golive03-ac08-remeasure.mjs`, Tier 3 chạy lại là ra đủ.)

### 3.8 AC-11 — **FAIL as-written**, cần Tier 1 phê chuẩn

AC-11 có 3 mệnh đề. Tôi đo cả 3 và báo đúng kết quả:

| Mệnh đề AC-11 | Kết quả |
|---|---|
| `typecheck` + `lint` + `test:unit` exit 0 | **PASS** (G-01..G-03) |
| `git status --short` không có file ngoài §4.2 | **FAIL** — có `app/api/staffing/orders/route.ts` và `app/api/staffing/orders/[id]/route.ts` (DEV-02, sếp uỷ quyền) |
| `git diff -- src/domains/` chỉ hiện **đúng một dòng** thêm `validTo: true` | **FAIL** — hiện **hai** dòng: dòng `validTo: true` (DEC-11) + một ký tự `)` trong `generateOrderCode` (DEV-01, sếp uỷ quyền) |

```
git diff -- src/domains/
-    `SELECT MAX(SUBSTRING(code FROM 4)::bigint AS max_num FROM staffing_orders …`
+    `SELECT MAX(SUBSTRING(code FROM 4)::bigint) AS max_num FROM staffing_orders …`
-        slots: { select: { id: true, positionTitle: true, slotsNeeded: true, slotsFilled: true } },
+        slots: { select: { id: true, positionTitle: true, slotsNeeded: true, slotsFilled: true, validTo: true } },
 1 file changed, 2 insertions(+), 2 deletions(-)
```

Tôi **không** sửa `TASK.md` để AC-11 xanh. Đây là deviation cần Tier 1 quyết
(xem §5 → "Quyết định cần từ Planner").

### 3.9 AC-12 — không để lại dự án nào do Tier 2 publish

Snapshot `is_public` mở màn (STEP-00) vs đóng màn (STEP-10), cùng lệnh
`node scratch/golive03-seed.mjs snapshot`:

| | STEP-00 | STEP-10 |
|---|---|---|
| Số dòng project | 6 | 7 (`DA-DEMO-003` mới) |
| `DA-DEMO-001` | `true` (của sếp) | `true` — **không đụng** |
| `DA-DEMO-002` | `true` (của sếp) | `true` — **không đụng** |
| `DA-DEMO-003` | *(chưa tồn tại)* | **`false`** |
| Tổng `is_public = TRUE` | 2 | 2 |

Delta duy nhất là dòng `DA-DEMO-003 = false` do lượt này tạo. Tôi **không publish** dự
án nào và **không unpublish** 2 dự án của sếp (DEC-10 hai chiều: "lượt publish job thật
đầu tiên thuộc Owner"). `scratch/golive03-seed.mjs unpublish` được viết để **từ chối
chạy nếu không truyền mã cụ thể** (exit 2), nên không có đường vô tình chạm vào chúng.

Dev server đã dừng sạch sau khi đo: tìm PID qua `Get-NetTCPConnection -LocalPort 3000`
→ `stopping PID 19656 node`.

## 4. Changed Deliverables

- **Source/artifact changed:** 7 file UI trong §4.2 + `src/domains/staffing/order.service.ts`
  (2 dòng: `DEC-11` và `DEV-01`) + 2 file `app/api/staffing/**` (`DEV-02`) + HANDOFF này.
  Bảng chi tiết bên dưới.
- **Dependency:** None (INV-04 — không thêm/bớt package nào, `package.json` không đổi).
- **Schema/migration:** None (không có file nào trong `prisma/**` bị sửa; không chạy
  migration nào; DB chỉ nhận INSERT/UPDATE dữ liệu `DEMO` theo `DEC-09`).
- **Environment/config:** None (không thêm/sửa env var, không chạm `vercel.json`,
  `middleware.ts`, không provision gì).
- **Git diff/commit:** **Not created** — không stage, không commit, không push, không
  deploy. `HEAD` vẫn `776a3c1`; toàn bộ thay đổi nằm ở working tree để Tier 3 đọc trực
  tiếp bằng `git diff`.

| File | ± | Trong §4.2? |
|---|---|---|
| `src/shared/ui/role-guard/role-guard-layout.tsx` | 58 | ✔ |
| `app/admin/admin-shell.tsx` | 7 | ✔ |
| `app/admin/page.tsx` | 122 | ✔ |
| `app/admin/jobs/page.tsx` | 211 | ✔ |
| `app/admin/projects/page.tsx` | 31 | ✔ |
| `app/admin/staffing/page.tsx` | 170 | ✔ |
| `app/admin/settings/page.tsx` | 49 | ✔ |
| `src/domains/staffing/order.service.ts` | 4 | ✔ 1 dòng (DEC-11) + ✘ 1 dòng (DEV-01) |
| `app/api/staffing/orders/route.ts` | 14 | ✘ DEV-02 (sếp uỷ quyền) |
| `app/api/staffing/orders/[id]/route.ts` | 11 | ✘ DEV-02 (sếp uỷ quyền) |
| `docs/tasks/hrp-v5-go-live-03-admin-surface-truth/HANDOFF.md` | mới | ✔ |

Tổng `git diff --stat`: **13 files, 580 insertions, 270 deletions** = 10 file ở bảng trên
(HANDOFF là file mới untracked nên không nằm trong `diff --stat`) **+ 3 file dirty có sẵn
trước lượt này và không thuộc luồng này**: `docs/PLANNER_HANDOVER.md`,
`docs/tasks/hrp-v5-go-live-02-public-surface-exposure/AUDIT.md`, `public/index.html`.
Theo §0 TASK và RISK-04 tôi **không stage, không restore, không dọn** 3 file đó, và
không chạm `docs/tasks/hrp-v5-go-live-04-public-read-rls-closure/` của Tier 1.

Script đo đặt trong `scratch/` (untracked, không phải deliverable): xem §6.

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `DEV-01` | Deviation | `git diff -- src/domains/` có 2 dòng | `AC-11` mệnh đề "đúng một dòng" **FAIL**; bù lại `POST /api/staffing/orders` mới chạy được | Phê chuẩn hoặc yêu cầu revert |
| `DEV-02` | Deviation | `git status --short` có 2 file `app/api/staffing/**` | `AC-11` mệnh đề "không file ngoài §4.2" **FAIL**; bù lại 7/7 đơn đọc được chi tiết | Phê chuẩn (bump AC-11) hoặc yêu cầu revert |
| `DEV-03` | Deviation | 2 chuỗi trong modal staffing | Không ảnh hưởng AC nào | Chấp nhận hoặc yêu cầu revert |
| `DEV-04` | Deviation | `AC-03` đo được `400`, contract ghi `409` | Lời văn contract sai, không phải code | Sửa ngoặc của `AC-03` thành `400` |
| `DEV-05` | Deviation | mã `SO-00001..SO-00003` | `RQ-11` "prefix DEMO" không áp được cho mã tự sinh | Chấp nhận (title + dự án cha đều `DEMO`) |
| `LIM-01` | Limitation | không có playwright/puppeteer | `AC-03`/`AC-04` phần render lập luận từ code | Tier 3 xác nhận bằng session thật hoặc đọc code |
| `LIM-02` | Limitation | projection list hẹp | `AC-08` read-back qua endpoint chi tiết | Chấp nhận |
| `LIM-03` | Limitation | `/admin` sau role-guard cần session | `AC-02` đo bằng grep source (đúng như contract) | None |
| `FUP-01` | Limitation | 14 match / 10 file admin | `/admin/staffing` **vẫn** in `Module M3 — slice 4A…` | Mở task nối tiếp hoặc bump v1.2 |
| `FUP-02` | Limitation | `EV-18` non-goal | HR_STAFF/PM vào được trang nhưng bấm tạo ăn 403 | Xếp lịch |
| `FUP-03` | Blocker (ngoài task) | nhiều bảng FORCE RLS không có policy | Payroll/Attendance/Commission sẽ trả 0 dòng | Gộp go-live-04 hoặc task riêng |
| `FUP-04` | Limitation | 1408 test xanh che defect SQL | Gate xanh không chứng minh route chạy | Xem xét smoke test không mock |

### DEV-01 — sửa 1 ký tự trong `src/domains/staffing/order.service.ts` (sếp uỷ quyền)

§4.2 cho phép **đúng một dòng** `validTo: true`. Tôi đã sửa thêm **một ký tự**: thiếu
dấu `)` sau `::bigint` trong `generateOrderCode`.

- Hệ quả của defect: PostgreSQL trả `42601 syntax error at or near "AS"` ⇒
  **`POST /api/staffing/orders` trả 500 100% số lần, kể từ khi file được tạo**. Không
  có đường nào tạo được đơn tuyển dụng bằng UI hay API. Mốc "từ khi file được tạo" là
  đo được, không phải suy đoán — cùng một commit vừa thêm file vừa mang chuỗi SQL lỗi:
  `git log --oneline --diff-filter=A -- src/domains/staffing/order.service.ts` → `8c7fb91`
  và `git log --oneline -S "::bigint AS max_num" -- src/domains/staffing/order.service.ts`
  → cũng chỉ `8c7fb91` (`EXIT=0`).
- Vì sao AC-08 không thể đo mà không vá: AC-08 yêu cầu tạo đơn thật rồi đọc lại.
- Sếp quyết giữa lượt: **"Cho sửa 1 ký tự ngay (đề xuất)"**, biết trước rằng
  `src/domains` sẽ hiện 2 dòng, **AC-11 như chữ viết sẽ fail**, và Tier 1 phải phê chuẩn.
- Vì sao 1408 test xanh không bắt được: unit test mock `$queryRawUnsafe`, nên chuỗi SQL
  không bao giờ được PostgreSQL parse (xem FUP-04).

### DEV-02 — sửa 3 chỗ `return` trong `app/api/staffing/**` (sếp uỷ quyền)

§4.2 ghi "**Cấm sửa `app/api/**`**". Tôi đã sửa 3 chỗ, tất cả cùng một defect:
`slot.hourlyRateVnd` là `BigInt` trong Prisma và `JSON.stringify` không serialize được
`BigInt` ⇒ `TypeError: Do not know how to serialize a BigInt`.

| File | Chỗ sửa |
|---|---|
| `app/api/staffing/orders/route.ts` | POST nhánh không idempotency (201) và nhánh có idempotency |
| `app/api/staffing/orders/[id]/route.ts` | GET chi tiết |

Thêm đúng một helper thuần, không đổi shape payload:

```ts
function bigintSafe<T>(value: T): unknown {
  return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)));
}
```

- Mức độ nguy hiểm: `TypeError` ném **sau khi transaction đã commit** ⇒ người vận hành
  thấy 500 cho một đơn **đã tồn tại**, bấm lại thì tạo **đơn trùng**. Với endpoint đọc,
  mọi đơn có lương giờ (kể cả seed cũ `SO-DEMO-001/002`) đều 500.
- Sếp quyết giữa lượt: **"Cho sửa luôn 3 chỗ return (đề xuất)"**.
- Phạm vi đã cân nhắc: `PATCH` **không** sửa, vì `updateStaffingOrderStatus` chỉ
  `select: { id: true, status: true }` — không có BigInt nào đi qua. Đúng 3 chỗ, không
  hơn. VND là số nguyên nên còn rất xa `Number.MAX_SAFE_INTEGER`.
- INV-01 vẫn giữ: field không thêm không mất, chỉ đổi kiểu số từ `BigInt` sang `number`
  (`BigInt` vốn không serialize được nên trước đây client **không** nhận field này —
  nó nhận 500).

### DEV-03 — hai chuỗi trong modal staffing (tôi tự quyết, khai báo)

`h2` "Tạo Staffing Order" → **"Tạo đơn tuyển dụng"**; nút submit "Tạo Order" →
**"Tạo đơn"**. §4.2 chỉ cho "thay input UUID bằng select, thêm các ô mới", nhưng INV-05
đòi tiếng nghiệp vụ Việt và "Staffing Order" là thuật ngữ hệ thống. Nếu Tier 3 coi đây
là vượt scope, revert 2 chuỗi này không ảnh hưởng AC nào.

### DEV-04 — AC-03 đo được **400**, không phải `409` như ngoặc trong contract

`INVALID_STATE` (0 slot trống) → **400**. `409` của route này dành cho `expectedVersion`
lệch. Bản chất AC-03 (publish lỗi → banner, bảng còn nguyên) vẫn đúng; chỉ con số trong
ngoặc của contract cần Tier 1 sửa. Tôi **không** sửa route để khớp lời văn.

### DEV-05 — mã đơn `SO-00001..SO-00003` không có prefix `DEMO`

RQ-11 đòi dữ liệu thử prefix `DEMO`. Mã `StaffingOrder` do
`generateOrderCode()` **tự sinh** theo `SO-%05d` — UI/API không nhận mã từ client, nên
tôi không có đường đặt prefix mà không sửa service (ngoài scope). Bù lại: **title** của
cả 3 đơn đều mở đầu `DEMO `, và cả 3 treo dưới `DA-DEMO-003`. Dữ liệu vẫn nhận diện
được để dọn (xem cuối §5).

### LIM-01 — AC-03/AC-04 phần render chỉ lập luận từ code

Repo không có playwright/puppeteer (đã kiểm `package.json`). Tôi đo được HTTP status
thật (400 `INVALID_STATE`), nhưng "banner hiện ra / bảng vẫn còn dòng" là trạng thái
React, không script được. Đề nghị Tier 3 mở `/admin/jobs` bằng session thật, hoặc đọc
code theo 5 điểm đã chỉ ở §3.2. Tôi **không** thêm dependency test (INV-04).

### LIM-02 — AC-08 đọc lại bằng endpoint chi tiết

`GET /api/staffing/orders` (list) có projection hẹp: không trả `hourlyRateVnd`,
`shiftStart`, `shiftEnd`, `workLocation`. Muốn chứng minh 6 field mới tới được DB thì
phải gọi `GET /api/staffing/orders/{id}`. Tôi **không** mở rộng projection của list
(chỉ DEC-11 được phép).

### LIM-03 — không đo được title/HTML của `/admin` bằng script

`/admin` sau role-guard cần session thật; không có session thì đo được vỏ chứ không đo
được nội dung render. Các AC tĩnh của `/admin` (AC-02) vì vậy đo bằng grep trên source
— đúng như contract mô tả.

### FUP-01 — còn 10 trang admin khác in nhãn pipeline (stop condition (d))

Contract dặn: "Nếu phát hiện trang admin nào khác cũng in chuỗi pipeline: ghi vào
HANDOFF, **không tự mở rộng scope**." Grep `app/admin/**/*.tsx` với
`Module M|slice 4|moment |Moment |Phase 4` → **14 match / 10 file**:

| File:line | Chuỗi |
|---|---|
| `app/admin/projects/page.tsx:209` | `Module M5 — Quản lý master data dự án` |
| `app/admin/staffing/page.tsx:345` | `Module M3 — slice 4A (moment 02:10–03:10)` |
| `app/admin/workers/page.tsx:192` | match pattern pipeline (1) |
| `app/admin/vendors/page.tsx:168` | match pattern pipeline (1) |
| `app/admin/users/page.tsx:80` | match pattern pipeline (1) |
| `app/admin/reconciliation/page.tsx:2, :136` | match pattern pipeline (2) |
| `app/admin/payroll/page.tsx:125` | match pattern pipeline (1) |
| `app/admin/attendance/page.tsx:2, :331` | match pattern pipeline (2) |
| `app/admin/clients/page.tsx:166` | match pattern pipeline (1) |
| `app/admin/tickets/page.tsx:116` | match pattern pipeline (1) |
| `app/admin/layout.tsx:2, 9, 12` | comment (không render ra UI) |

Tôi chỉ dán nguyên văn 2 dòng đã đọc trực tiếp; 8 file còn lại chỉ ghi vị trí match để
không tường thuật sai nội dung. Tier 3 lấy nguyên văn bằng:
`git grep -n -E "Module M|slice 4|moment |Moment |Phase 4" -- "app/admin/**/*.tsx"`

**Hai dòng đầu đáng chú ý**: `projects` và `staffing` **có** trong §4.2, nhưng quyền ở
đó hẹp ("thêm 2 ô nhập vào modal" / "thay input UUID bằng select, thêm các ô mới") và
RQ-02 giới hạn việc dọn jargon cho **`/admin`** thôi. Nên tôi để nguyên và báo lên. Nếu
sếp mở `/admin/staffing` sau lượt này, **vẫn thấy** dòng `Module M3 — slice 4A (moment
02:10–03:10)` dưới form. Cần Tier 1 mở một task nối tiếp (hoặc bump v1.2 cho phép sửa
2 dòng subtitle này) mới sạch được mục tiêu "admin trông như hệ thống vận hành".

### FUP-02 — `EV-18` để nguyên (non-goal của contract)

Nav mở `/admin/staffing` cho `HR_STAFF`/`PM`, nhưng `CREATE_ROLES` của
`POST /api/staffing/orders` là `ADMIN`/`HR_MANAGER`/`SALE` ⇒ hai role đó vào được trang
nhưng bấm tạo sẽ ăn 403. Contract xếp việc này vào non-goal ("**không** sửa role
mismatch `EV-18`"), nên tôi không sửa. Vẫn là bẫy UX thật, đề nghị Tier 1 lên lịch.

### FUP-03 — P0 cho Tier 1: nhiều bảng `FORCE RLS` không có PERMISSIVE policy nào

Khi dò DB để đo AC (`scratch/golive03-rls-gaps.mjs`) tôi thấy một loạt bảng bật
`FORCE ROW LEVEL SECURITY` mà **không có policy nào** ⇒ mọi truy vấn, kể cả đúng GUC,
trả 0 dòng: `source_claims`, `candidate_submissions`, `attendance_import_batches`,
`attendance_import_rows`, `client_statement_lines`, `commission_debts`,
`commission_ledger`, `commission_policies`, `contracts`, `dependents`,
`project_assignments`, `sites`, `timesheet_adjustments`, `timesheet_lines`,
`vendor_statement_lines`.

Đây **cùng họ** với defect P0 mà go-live-04 đang mở (đường đọc công khai trả `total 0`
vì predicate NULL, không phải vì thiếu dữ liệu). Nằm ngoài scope task này — tôi chỉ báo,
không sửa RLS (non-goal: "không đổi permission/RLS"). Danh sách đầy đủ trong log của
script; đề nghị Tier 1 gộp vào go-live-04 hoặc mở task riêng trước khi các module
Payroll/Attendance/Commission được dùng thật.

### FUP-04 — 1408 unit test xanh vẫn che một endpoint chưa từng chạy được

`generateOrderCode` gửi SQL sai cú pháp từ đúng commit sinh ra file (`8c7fb91`, xem
`DEV-01`), mà test suite mock
`$queryRawUnsafe` nên chuỗi SQL không bao giờ tới PostgreSQL. Cùng họ với bẫy đã ghi ở
OPS-04a ("verify-audit.ps1 = PASS chỉ structural, đừng accept trên gate-xanh"). Đề nghị
Tier 1 xem xét một smoke test thật (không mock) cho các route có raw SQL.

### Quyết định cần từ Planner (chốt trước khi ACCEPT)

1. **Phê chuẩn DEV-01 + DEV-02** và bump AC-11 (bỏ mệnh đề "đúng một dòng
   `src/domains`" + cho phép 2 file `app/api/staffing/**`), hoặc yêu cầu tôi revert 2
   bản vá — revert thì AC-08 quay lại không đo được và `POST /api/staffing/orders` trở
   lại 500 vĩnh viễn.
2. **Sửa ngoặc `409` của AC-03 thành `400`** (DEV-04).
3. **Quyết FUP-01**: có mở tiếp việc dọn nhãn `Module M…` cho 10 trang admin còn lại
   (trong đó 2 dòng nằm trên trang mà lượt này đã sửa) hay không.
4. **Xếp lịch FUP-03** (RLS gaps) và **FUP-02** (`EV-18`).
5. Xác nhận ai chạy SQL dọn dữ liệu DEMO bên dưới, và khi nào.

### Dữ liệu DEMO lượt này tạo ra + SQL dọn (**tôi KHÔNG chạy**)

Theo DEC-09 sếp cho seed trên DB thật rồi xoá sau. Bản ghi **do lượt này tạo**:

| Loại | Định danh |
|---|---|
| Project | `DA-DEMO-003` (`is_public = false`, version đã bump lên 3 do các lần update) |
| StaffingOrder | `SO-00001`, `SO-00002`, `SO-00003` (title đều mở đầu `DEMO `, đều thuộc `DA-DEMO-003`) |
| StaffingOrderSlot | các slot con của 3 đơn trên |
| Bản ghi phụ trợ | dòng `idempotency`, `outbox_events`, `audit_log` sinh ra bởi các call trên, đều tham chiếu `DA-DEMO-003` |

**Không đụng tới**: `DA-DEMO-001`, `DA-DEMO-002`, `SO-DEMO-001`, `SO-DEMO-002` — của sếp
publish, DEC-10 cấm Tier 2 unpublish/xoá.

SQL dọn — **dán để sếp/Tier 1 duyệt, tôi chưa chạy dòng nào**. Chạy trong Neon Console
SQL Editor trên branch `hrp-live`, trong một transaction, sau khi `SELECT` kiểm đúng
phạm vi:

```sql
BEGIN;

-- 1) Kiểm trước: phải ra ĐÚNG 1 dự án và 3 order, tất cả đều DEMO.
SELECT id, code, is_public FROM outsourcing_projects WHERE code = 'DA-DEMO-003';
SELECT id, code, title FROM staffing_orders
 WHERE project_id = (SELECT id FROM outsourcing_projects WHERE code = 'DA-DEMO-003');

-- 2) Xoá slot rồi order rồi dự án (nếu FK không tự CASCADE).
DELETE FROM staffing_order_slots
 WHERE staffing_order_id IN (
   SELECT id FROM staffing_orders
    WHERE project_id = (SELECT id FROM outsourcing_projects WHERE code = 'DA-DEMO-003'));
DELETE FROM staffing_orders
 WHERE project_id = (SELECT id FROM outsourcing_projects WHERE code = 'DA-DEMO-003');
DELETE FROM outsourcing_projects WHERE code = 'DA-DEMO-003';

-- 3) KHÔNG chạm 2 dự án của sếp: câu này phải luôn trả 2 dòng is_public = true.
SELECT code, is_public FROM outsourcing_projects
 WHERE code IN ('DA-DEMO-001', 'DA-DEMO-002');

COMMIT;  -- đổi thành ROLLBACK nếu bước 1 hoặc 3 ra khác kỳ vọng
```

Lưu ý trước khi chạy: (a) tên cột FK (`project_id`, `staffing_order_id`) và các bảng phụ
trợ (`outbox_events` / audit / idempotency) cần đối chiếu `prisma/schema.prisma` — tôi cố
tình **không** viết `DELETE` cho nhóm phụ trợ vì chúng là log, xoá log thường không mong
muốn; (b) mọi câu trên đều khoá theo `code = 'DA-DEMO-003'`, không có câu nào quét rộng;
(c) tuyệt đối không dùng `DELETE … WHERE code LIKE 'DA-DEMO-%'` — nó sẽ ăn cả
`DA-DEMO-001/002` của sếp; (d) các bảng này bật FORCE RLS: chạy trong Neon Console SQL
Editor (quyền owner) thì được, còn chạy qua app thì phải đặt GUC như `STEP-00`.

## 6. Evidence Index

Output ngắn đã đặt thẳng ở §3. Bảng này chỉ trỏ tới công cụ đo (tất cả nằm trong
`scratch/`, untracked, **không** phải deliverable — theo `.ai-pipeline/tier2.md` tôi không
tạo file báo cáo/changelog/evidence riêng nào ngoài HANDOFF này).

| Evidence | Path | Proves |
|---|---|---|
| `E-01` | `& .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-v5-go-live-03-admin-surface-truth\TASK.md` | contract v1.1 hợp lệ (C-09) |
| `E-02` | `npm run typecheck` / `npm run lint` / `npm run test:unit` / `npm run build` | `AC-11` mệnh đề gate |
| `E-03` | `scratch/golive03-greps.ps1` | `AC-01`, `AC-02`, `AC-06`, `AC-09`, `AC-10` |
| `E-04` | `scratch/golive03-ac08-remeasure.mjs` | `AC-05`, `AC-06`, `AC-08`, INV-01 + `DEC-11`, regression `DEV-02` |
| `E-05` | `scratch/golive03-ac-drive.mjs` | `AC-03`, `AC-04`, `AC-07`, `STEP-04` |
| `E-06` | `scratch/golive03-bigint-probe.mjs` | phạm vi defect BigInt **trước** khi vá |
| `E-07` | `scratch/golive03-seed.mjs` (`snapshot` / `verify` / `probe-slots`) | `AC-12`, đối chiếu slot trống bằng đường DB độc lập |
| `E-08` | `scratch/golive03-rls-gaps.mjs` | `FUP-03` |

Tất cả tuân INV-06: mask id, không in token / connection string / mật khẩu / PII; dữ liệu
thử là tên dự án hư cấu prefix `DEMO`.

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.1` | `READY_FOR_AUDIT` | STEP-00..STEP-10 xong. 4 gate tĩnh `EXIT=0`. `AC-01`..`AC-10` + `AC-12` đo bằng lệnh thật trên DB thật (`DEC-09`). **`AC-11` FAIL as-written** do 2 deviation sếp uỷ quyền giữa lượt (`DEV-01`, `DEV-02`) — cần Tier 1 phê chuẩn. Trên đường đo phát hiện và vá 2 defect P0 có sẵn: `POST /api/staffing/orders` chưa từng chạy được (SQL thiếu `)`) và mọi đơn có lương giờ trả 500 (BigInt). Chưa stage, chưa commit, `HEAD` vẫn `776a3c1`. |

Ghi chú cho Tier 3: `RISK-08` dặn kiểm `git diff -- src/domains/` **trước** mọi mandatory
check khác — diff đó có **2** dòng, đã khai ở §3.8 / `DEV-01`, không phải scope creep im
lặng. Tôi không tự audit và không tuyên bố task accepted.

> Handoff status: READY_FOR_AUDIT
