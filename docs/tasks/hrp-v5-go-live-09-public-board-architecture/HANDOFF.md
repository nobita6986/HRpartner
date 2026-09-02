# HANDOFF: hrp-v5-go-live-09-public-board-architecture

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-09-public-board-architecture` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version thực thi | `v1.2` — đọc lại TASK.md ngay trước khi viết tài liệu này; `git status --short -- TASK.md` trả **0 dòng**, tức contract không bị bump giữa lúc thực thi |
| Execution round | `1` |
| Executor | `Tier 2` |
| Baseline | `8ca2ee1` (contract) — HEAD lúc thực thi và lúc viết HANDOFF là `da72493`, **không có commit nào được tạo trong task này** |
| Cây làm việc | DIRTY từ trước khi task bắt đầu, do các luồng khác. Không file nào của luồng khác bị stage, bị sửa hay bị dọn — xem `DEV-07` ở §4 |
| Status | `READY_FOR_AUDIT` |
| Bắt đầu / cập nhật | `2026-09-02` |

**Ba điều Tier 2 KHÔNG làm, theo `R-01` và `AC-20`:** không `git commit`, không `git push`, không deploy. `git log origin/main..HEAD` trả rỗng; `git rev-parse HEAD` và `git rev-parse origin/main` cho cùng một SHA `da724931adb8ff6fdd67bd26982044044a41193f`. Deploy production là hành động của Owner (push `main` kích hoạt Vercel Git integration), không nằm trong task này.

## 1. Outcome Summary

### 1.1 Đã làm

1. **`public.service.ts`** — `publicSelect` thêm đúng hai field (`slots.hourlyRateVnd`, `staffingOrders.createdAt`), không thêm quan hệ nào; `PublicJobDto` 14 → 18 khoá với `salaryMinVnd`, `salaryMaxVnd`, `urgency`, `postedAt`; `PublicJobListResult` 4 → 5 khoá với `overview` THUẦN CỘNG; `jobHeadline` là ĐÚNG MỘT chỗ sinh bốn field đó cho cả `toDto` và `toDetailDto`; `overview` tính cạnh `facets`, trên tập `eligible`, TRƯỚC chuỗi `.filter` và TRƯỚC phép cắt trang.
2. **`app/(portal)/page.tsx`** — Hero hai nửa với ba ô có nhãn nhìn thấy được cộng nút `Tìm việc`; card nổi bật đọc từ `overview`; card việc làm nâng cấp (khung logo, khối lương, badge pill); ba dải nội dung cộng dải số liệu tin cậy, **mọi con số đọc từ `overview`**, không thêm một request nào và không đếm lại ở client; lọc lương phía client theo `RQ-07` với nhãn nói thật rằng nó cắt trên phần đã tải.
3. **Bằng chứng RED trước GREEN có thật, hai lần chạy tách biệt** (`AC-14`): lane unit ĐỎ khi `public.service.ts` là blob baseline, XANH sau khi sửa; cộng một phép ĐỎ nhắm đúng hai file test mới để Tier 3 tái lập trong dưới một giây.
4. **Bốn test đã ACCEPTED chỉ bị SIẾT**: tổng `expect(` 400 → 412, không file nào giảm; ba phép đếm bằng 0 của `EV-24` và dòng băm `sha256` không xuất hiện ở bất kỳ dòng nào của diff.
5. **`app/globals.css` KHÔNG bị chạm một byte** — cách chứng minh mạnh nhất có thể cho `EV-25`: `git diff --stat 8ca2ee1 -- app/globals.css` trả rỗng và file không có mặt trong `git status`.

### 1.2 Chưa hoàn thành

1. **Nửa LIVE của `AC-04`, `AC-11`, `AC-12` là `ENV_BLOCKED`**, không phải PASS: `DATABASE_URL_TEST` không có trong môi trường này nên lane integration không chạy được. Nửa còn lại của ba AC đó đã đo được trên **response THẬT của route** bằng một file test mới, không dùng DB — xem §3.1 và `LIM-01` ở §5.
2. **`AC-08` có xung đột contract** giữa mặt chữ của AC và `RQ-05`/`RQ-07`: số khai báo `useState` đi từ 16 lên 18. Tier 2 KHÔNG tự phán quyết, ghi cả hai cách đọc kèm số đo ở `DEV-02`.
3. **`AC-08` và `AC-23` có một literal bất khả đo như viết**: `fetch('/api/jobs'` (nháy đơn) đếm được **0** vị trí ở CẢ baseline lẫn HEAD, vì mã dùng template literal. Phép đo hợp nghĩa duy nhất là hợp mọi dạng nháy, và nó trả đúng 1 — xem `DEV-01`.

## 2. Execution Trace

| STEP | RQ | File / symbol | Kết quả | Deviation |
|---|---|---|---|---|
| `STEP-01` | `DEC-15` | `public.service.ts`, `page.tsx`, `globals.css` (blob `8ca2ee1`) | ĐO XONG, năm phép, output thật ở §3 `AC-01` | không |
| `STEP-02` | `RQ-20` | lane unit trên baseline | `Tests 1567 passed (1567)`, `Test Files 101 passed (101)`, exit `0` | không |
| `STEP-03` | `RQ-18`, `RQ-21`, `RQ-24` | `public-board-architecture.test.ts` (MỚI), `public-board-route-json.test.ts` (MỚI) | ĐỎ THẬT: `Tests 17 failed \| 1567 passed (1584)`, exit `1` | thêm file thứ hai đo ở tầng route — `DEV-08` |
| `STEP-04` | `RQ-01`..`RQ-04`, `RQ-21`, `RQ-22`, `RQ-24` | `public.service.ts` (+201/−5), bốn test ACCEPTED | XONG, lane unit XANH | hai file fixture phụ — `DEV-04` |
| `STEP-05` | `RQ-05`, `RQ-06`, `RQ-07` | `page.tsx` Hero + `visibleJobs` | XONG | `useState` 16 → 18 — `DEV-02`; `FacetSelect` đổi sang `label htmlFor` — `DEV-03` |
| `STEP-06` | `RQ-08`, `DEC-14` | `page.tsx` `featuredSource` | XONG, nguồn là `overview.topPaid[0] ?? overview.newest[0]`, nhánh rỗng không render | không |
| `STEP-07` | `RQ-09`, `RQ-10`, `RQ-11`, `DEC-05` | `page.tsx` card | XONG, đo lại khổ 375px bằng số học từ nguồn | mô tả thay vì ảnh — `AC-09` cho phép "Chụp **hoặc mô tả**" |
| `STEP-08` | `RQ-12`, `RQ-13`, `RQ-14` | `page.tsx` ba dải | XONG, cả ba đọc `overview`, `sort(` = 0 | không |
| `STEP-09` | `RQ-15` | `page.tsx` dải tin cậy | XONG ở nửa đo được; nửa LIVE `ENV_BLOCKED` | `LIM-01` |
| `STEP-10` | `RQ-16`, `RQ-17`, `RQ-22` | `page.tsx`, `public-ui-premium.static.test.ts` | XONG, 0 literal màu trên 1414 dòng thêm, ba số đếm nâng 8→12, 6→10, 2→4 | không |
| `STEP-11` | `RQ-20` | gate tĩnh | `typecheck` = 0, `lint` = 0, `test:unit` = 0 với `1589 passed` | không |
| `STEP-12` | — | `git status`, `git diff --stat` | XONG, 12 file tracked, không file lạ bị chạm | ba `AUDIT.md` và `public/index.html` là dirty của luồng khác, ĐÃ BÁO, KHÔNG dọn |
| `STEP-13` | — | tài liệu này | XONG | không |


## 3. Acceptance Evidence

Mọi lệnh dưới đây là lệnh THẬT đã chạy trong cây làm việc này, ở HEAD `da72493`. Exit code của bốn
gate tĩnh lấy bằng REDIRECT rồi `echo $?` (không lấy sau pipe, theo `AC-18`); các phép grep/đếm không
lấy exit code làm bằng chứng mà lấy CON SỐ, và mỗi phép đếm bằng 0 đều có một đối chứng DƯƠNG đi kèm
để chứng minh phép đo không mù.

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — | `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-v5-go-live-09-public-board-architecture\TASK.md` | `RESULT: PASS`, exit `0` | `evidence/step13-verify-task.txt` | None |
| `AC-01` | python đọc blob `8ca2ee1` cho năm phép đo trạng thái đầu vào | exit `0` | `evidence/step01-baseline-state.txt`: DTO baseline `14` khoá, không có `industry`; `publicSelect` có `hourlyRateVnd = 0` và `createdAt = 0`; `PublicJobListResult` `4` khoá và `areaHaystack` còn `siteAddress` = True; `PAGE_SIZE = 12`, hợp mọi dạng nháy của lời gọi `/api/jobs` = `1`; `.pub-header` ở dòng `452` của `624`, vùng khoá kết thúc đúng EOF = True | None |
| `AC-02` | `git diff --unified=0 -- src/domains/job-board/public.service.ts` rồi grep trên dòng THÊM | đếm: `hourlyRateVnd` trong `slots.select` = `1`, `createdAt: true` = `1`, `clientCompany` = `0` | `evidence/step13-ac-battery-1.txt`: dòng thêm `146 createdAt: true` và `147 select: ... hourlyRateVnd: true`; không dòng thêm nào chứa `clientCompany` | Exit code sau pipe KHÔNG dùng làm bằng chứng (`AC-18`); bằng chứng là ba con số đếm |
| `AC-03` | đọc khối `PublicJobDto` và `PublicJobDetailDto` tại HEAD | bốn field đúng tên, đúng kiểu | `evidence/step13-ac-battery-5.txt`: `50 salaryMinVnd: number \| null`, `51 salaryMaxVnd: number \| null`, `57 urgency: 'NONE' \| 'CLOSING' \| 'URGENT'`, `59 postedAt: string \| null`; `158 export interface PublicJobDetailDto extends PublicJobDto` ⇒ bốn field lan sang DTO chi tiết bằng KIỂU, không bằng sao chép | None |
| `AC-04` | `npm run test:unit -- src/domains/job-board/public-board-architecture.test.ts src/domains/job-board/public-board-route-json.test.ts` | exit `0` | §3.1 dán response: `HTTP 200`; `typeof body.jobs[0].salaryMinVnd = number` giá trị `45000`; `JSON.stringify(job)` không ném VÀ chuỗi có `45000`; payload không chứa `hourlyRateVnd` | Nửa đo trên DB THẬT là `ENV_BLOCKED` (`LIM-01`). Chữ "local" ở đây nghĩa là handler THẬT chạy trong process, KHÔNG phải một server có DB |
| `AC-05` | `grep -n "availableSlots" src/domains/job-board/public.service.ts` cộng `sed -n "345,410p"` rồi đếm trong đúng thân `orderUrgency` và `jobHeadline` | `0` và `0`; đối chứng DƯƠNG toàn file = `12` | `evidence/step13-ac-battery-2.txt` in nguyên văn dòng 345-410; test `đơn OPEN chỉ còn 1 chỗ ⇒ NONE, statusLabel vẫn là Đang tuyển` PASS | Phép đo CŨ trong `evidence/step13-ac-battery-1.txt` bị `sed` lỗi cú pháp nên VÔ GIÁ TRỊ — xem `DEV-06`; số hợp lệ nằm ở battery-2 |
| `AC-06` | `grep -rnE "availableSlots\s*.=\s*5" app/ src/` | `0` dòng (grep exit 1) | `evidence/step13-ac-battery-1.txt` `AC06_HITS=0`; đối chứng: cùng định danh đó đếm được `12` lần ở phép của `AC-05` ⇒ grep không mù | None |
| `AC-07` | đọc thanh tìm ở Hero và thân `FacetSelect` tại HEAD | ba control, mỗi control một nhãn NHÌN THẤY nối bằng `htmlFor`, cộng một nút | `evidence/step13-ac-battery-5.txt`: `777-778 <label htmlFor="hrp-hero-keyword">`; `FacetSelect` `383 const selectId = useId()` → `389 <label htmlFor={selectId}>` → `395 id={selectId}`; nút `type="submit"` chữ `Tìm việc` in ở `evidence/step13-ac-battery-4.txt`; không control nào chỉ có `placeholder` | `FacetSelect` đổi từ `<h3>` cộng `aria-label` sang `<label htmlFor>` cộng `useId()` — `DEV-03` |
| `AC-08` | `grep -c "useState"` ở baseline và HEAD; đọc `JobSearchFilters` và `buildQuery`; đếm lời gọi fetch theo từng dạng nháy | `useState` `16 → 18`; `JobSearchFilters` GIỐNG từng byte hai bên; `buildQuery` vẫn chỉ gửi `limit/offset/q/area/shift`; dạng NHÁY ĐƠN của lời gọi `/api/jobs` = `0` ở CẢ baseline và HEAD, hợp mọi dạng nháy = `1` ở cả hai | `evidence/step13-ac-battery-4.txt` liệt kê từng khai báo state hai bên; `evidence/step01-baseline-state.txt` PHÉP 4 | Nửa "không tăng số state" KHÔNG thoả mặt chữ: `DEV-02`. Nửa đếm chuỗi nháy đơn bất khả đo vì mã dùng backtick: `DEV-01` |
| `AC-09` | `grep -rn "Lương thương lượng" app/ src/`; đọc khối lương trên card | `5` dòng (AC đòi ≥ 1) | §3.3 mô tả hai card; `evidence/step13-ac-battery-5.txt` cho thấy `salaryLabel(salaryMinVnd, salaryMaxVnd)` được gọi ở ba chỗ hiển thị (`293`, `450`, `554`) và `102 if (min === null) return 'Lương thương lượng'` | Mô tả bằng chữ, không ảnh chụp — AC cho phép "chụp HOẶC mô tả" |
| `AC-10` | bốn grep của AC, đường dẫn ĐẶT TRONG NGOẶC KÉP | `tốt nhất` = `0`, `Đã tuyển đủ` = `0`, `Top công ty` = `0`, hai nhãn `Người lao động` / `Doanh nghiệp đồng hành` = `0` | `evidence/step13-ac-battery-2.txt`; đối chứng DƯƠNG cùng lệnh cùng file: `CONTROL[Đang tuyển] = 1` ⇒ grep đọc được UTF-8 tiếng Việt | None |
| `AC-11` | cặp response: gọi `/api/jobs` không lọc, đọc `count` của một mục `overview.areaCounts`, gọi lại `/api/jobs?area=` đúng khu vực đó, đọc `total` | bộ 3 dòng: `2 == 2`; bộ 14 dòng: `7 == 7`; danh sách mục có `count = 0`: rỗng ở cả hai bộ | §3.1 và `evidence/step13-ac04-ac11-ac12-response-pair.txt` | Tag "0 việc" không thể có trong DOM là do CẤU TẠO chứ không do một phép đếm DOM: `TagStrip` render `entries` NGUYÊN VĂN (page `863-864`) và service đã lọc `count > 0` (service `632`) |
| `AC-12` | `GET /api/jobs` không lọc; rồi MỘT lần chạy có `14` việc hợp lệ, gọi `?limit=12&offset=0` và `?limit=12&offset=12` | `overview.totals.jobs = 14` bằng `total = 14`; ba con số và `areaCounts` GIỐNG NHAU giữa hai trang; `typeof` cả ba = `number`; có dấu `+` = `false` | §3.1; phép tính ở service: `639 jobs: eligible.length`, `640 slots: eligible.reduce(... job.availableSlots ...)`, `641 areas: areaCounts.length` | None |
| `AC-13` | `grep -rn "clientCompany\|client_companies" "app/(portal)/" src/domains/job-board/` | `19` dòng, phân loại: trong `app/(portal)/` = `0`; trong `*.test.ts` = `15`; dòng MÃ THẬT trong `public.service.ts` = `0` (bốn dòng còn lại là comment); `publicSelect` chứa `clientCompany` = `0` | `evidence/step13-ac-battery-1.txt` liệt kê cả 19 dòng, `evidence/step13-ac-battery-2.txt` phân loại | None |
| `AC-14` | hai lần chạy TÁCH BIỆT: (a) ghi blob `8ca2ee1` của `public.service.ts` lên chính file đó rồi `npm run test:unit -- <hai file test mới>`; (b) phục hồi bản HEAD rồi chạy lại đúng hai file | `RED_EXIT=1` với `22` case đỏ có tên; `GREEN_EXIT=0`; `SHA_BEFORE == SHA_AFTER` = True | `evidence/step13-ac14-red-repro.txt` (tái lập trong ~1.4s, có tên từng case đỏ); lần RED toàn lane trước `STEP-04`: `evidence/step03-red-test-unit-baseline-service.txt` `Tests 17 failed \| 1567 passed (1584)` | Lần RED toàn lane chạy ở checkout tạm `C:/CodeApp/HrP-gl09-baseline` nay đã bị xoá — `LIM-03`. Bản tái lập ở trên KHÔNG cần checkout đó |
| `AC-15` | đếm dòng mở element THẬT (bỏ dòng comment) trong `app/(portal)/page.tsx`, đọc `app/globals.css:609` | `11` phần tử tương tác; thiếu vùng chạm 44px = `0`; thiếu `hrp-focus` = `0`; `prefers-reduced-motion` trong globals.css = `1` | §3.3 liệt kê từng phần tử; `evidence/step13-ac15-controls.txt` | Bản đếm thô cũ `evidence/step10-controls.txt` báo "1 thiếu" do đếm chuỗi thẻ select nằm trong VĂN comment dòng 356 — `DEV-05` |
| `AC-16` | quét literal màu trên các dòng THÊM của các file trong scope | `1414` dòng thêm được quét, literal màu = `0` | `evidence/step10-color-literals.txt`; đối chứng DƯƠNG `3 / 3` ⇒ regex bắt được literal thật | None |
| `AC-17` | grep bốn chuỗi SQL trên dòng THÊM; `git status --short` lọc `prisma/` | `CREATE POLICY` = `0`, `GRANT` = `0`, `ALTER TABLE` = `0`, `set_config` = `0`; `PRISMA_FILES_IN_STATUS = 0` | `evidence/step13-ac-battery-3.txt`; đối chứng DƯƠNG: tổng dòng bắt đầu bằng dấu cộng của toàn diff = `981` (= `969` dòng thêm cộng `12` dòng tiêu đề) ⇒ phép quét CÓ nhìn thấy diff | None |
| `AC-18` | bốn lệnh, exit lấy bằng REDIRECT rồi `echo $?`: `npm run typecheck`, `npm run lint`, `npm run test:unit`, và script khoá `node evidence/gl09-locks.mjs` | `TYPECHECK_EXIT=0`; `LINT_EXIT=0` (`496 problems (0 errors, 496 warnings)`); `TEST_UNIT_EXIT=0` (`103 passed`, `1589 passed`, `22.75s`); `LOCKS_EXIT=0` | `evidence/step13-gate-typecheck.txt`, `evidence/step13-gate-lint.txt`, `evidence/step13-gate-test-unit.txt`, `evidence/step13-gate-locks.txt` | Mốc baseline là `1567` test (`evidence/step02-baseline-test-unit-8ca2ee1.txt`) ⇒ `1589` không nhỏ hơn mốc |
| `AC-19` | `git diff --stat`, `git diff --numstat`, `git status --short` | `12 files changed, 969 insertions(+), 145 deletions(-)` | §4 và `evidence/step12-scope.txt` | Bốn file dirty của luồng KHÁC có trong `--stat` nhưng KHÔNG do task này chạm (`DEV-07`); hai file test mới còn untracked |
| `AC-20` | `git log origin/main..HEAD --oneline`; `git rev-parse HEAD origin/main` | `0` commit đứng trước origin; hai SHA bằng nhau `da724931adb8ff6fdd67bd26982044044a41193f` | `evidence/step13-ac-battery-3.txt` | Deploy production = push `main` qua Vercel Git integration và là hành động của OWNER, không phải của Tier 2 (`R-01`) |
| `AC-21` | đọc `PublicJobOverview` tại HEAD; đối chiếu vị trí tính `overview` với chuỗi `.filter` và phép `.slice`; chạy bốn test `RQ-21` | năm khoá đúng tên; `overview` sinh ở `637-661`, chuỗi filter ở `667-673`, `slice` ở `678` ⇒ TRƯỚC cả lọc và cắt trang, cùng chỗ với `facets` (`631`); bốn test PASS | `evidence/step13-ac-battery-3.txt` in nguyên văn thân hàm; §3.1 dán phép đối chiếu `areaCounts` với `total` | None |
| `AC-22` | `git diff` bốn file test cộng bảy phép kiểm cơ học trên phần diff | `expect(` tổng `400 → 412`, không file nào GIẢM; dòng BỎ có `toEqual` = `0`; dòng THÊM có `toBeGreaterThan` = `0`; `.skip` thêm và bỏ đều `0`; ba phép đếm 0 của `EV-24` và chuỗi `sha256` không xuất hiện ở cả dòng thêm lẫn dòng bỏ | §3.4 bảng số cũ → số mới; `evidence/step13-ac22-tighten.txt` | Task còn siết THÊM hai file test ngoài bốn file của `RQ-22` — `DEV-04` |
| `AC-23` | `grep -n "overview\."` trên `app/(portal)/page.tsx`; đếm `sort(`, `reduce(`, `Đã tuyển đủ`, và số vị trí fetch | bốn dải đọc từ `overview` (`842-844`, `863`, `864`, `1097`, `1102`); `sort(` = `0`; `reduce(` = `0`; `Đã tuyển đủ` = `0`; vị trí fetch = `1` | `evidence/step13-ac-battery-5.txt`, `evidence/step13-gate-locks.txt` | Còn `8` hit `jobs.length` và cả tám đã được phân loại tại chỗ: guard skeleton/rỗng và câu chữ CÓ phạm vi rõ ("đã tải"), không câu nào khẳng định con số TỔNG — con số tổng lấy từ `total` và `overview.totals` |
| `AC-24` | `npm run test:unit -- src/domains/job-board/public-board-architecture.test.ts`; `find app -path "*viec-lam*"`; `git status --short -- "app/(jobs)/viec-lam/"` | test `RQ-24` PASS; `4` đường dẫn CÓ THẬT; `0` dòng dirty | `evidence/step13-ac-battery-3.txt`: `app/(jobs)/viec-lam`, `layout.tsx`, `[slug]`, `[slug]/page.tsx`; dirty dưới `app/(jobs)/` = `0`, dưới `app/api/jobs/` = `0` | None |

### 3.1 `AC-04` / `AC-11` / `AC-12` — cặp response dán nguyên văn

Nguồn: `evidence/step13-ac04-ac11-ac12-response-pair.txt`. Handler `GET /api/jobs` là handler THẬT
(`app/api/jobs/route.ts` được import, không mô phỏng), service là THẬT; chỉ ranh giới DB bị thay bằng
một `tx` giả trả đúng hình dạng dòng của `publicSelect`. Vì vậy khối này đo được đúng thứ mà một test
mock-service không đo được: bẫy `BigInt` sống ở `NextResponse.json`, tức Ở SAU service.

`AC-04` — lương ra JSON là số, không phải `BigInt`, và không mang tên cột nội bộ:

```
$ GET /api/jobs        -> HTTP 200
--- body.total = 3
--- typeof body.jobs[0].salaryMinVnd = number  gia tri = 45000
--- MOT job day du trong response:
{
  "id": "prj-c",  "slug": "DA-C",  "title": "Kiem hang",  "position": "Nhan vien QC",
  "shift": "07:00-16:00",  "location": "KCN Thang Long",
  "shiftType": "ca_ngay",  "jobType": "toan_thoi_gian",
  "availableSlots": 4,  "deadline": null,  "statusLabel": "Đang tuyển",
  "salaryMinVnd": 70000,  "salaryMaxVnd": 70000,
  "urgency": "NONE",  "postedAt": "2026-01-15T00:00:00.000Z",
  "positionTitles": ["Nhan vien QC"],  "locations": ["KCN Thang Long"],  "shifts": ["07:00-16:00"]
}
```

`AC-11` — số trên tag bằng đúng số việc mà cú bấm sẽ thấy. Đo hai lần, ở hai cỡ tập dữ liệu, và lần
thứ hai KHÔNG ghim tên khu vực bằng tay (lấy mục đầu của `areaCounts`) để phép đo không phụ thuộc
fixture:

```
$ doc so tren tag: overview.areaCounts["Bac Ninh"].count = 2
$ GET /api/jobs?area=Bac%20Ninh -> HTTP 200   body.total = 2
  BANG NHAU? true   (AC-11: so tren tag = so viec cu bam se thay)
  jobs[].id cua lan goi co loc = ["prj-a","prj-b"]
  co muc nao count = 0 khong? []

$ AC-11 tren tap 14: lay MUC DAU cua areaCounts (khong ghim ten tay) -> {"value":"KCN Thang Long","count":7}
$ GET /api/jobs?limit=12&offset=0&area=KCN%20Thang%20Long -> HTTP 200  total = 7
  BANG count tren tag? true
  jobs tra ve (trang dau) = 7 card, nextOffset = null
  muc nao co count = 0? []
```

Vì sao `2` chứ không phải `1`: `prj-b` KHÔNG có `Bac Ninh` trong `locations` (nó có `KCN VSIP 1`),
nhưng vị từ lọc `area` khớp nó qua `siteAddress` trong `areaHaystack`. Một bản cài đặt đếm giá trị
khác nhau của `job.locations` — thứ duy nhất client thấy — sẽ ra `1` và trượt đúng bất biến này.

`AC-12` — dạng CHỮ của AC ("một lần chạy có nhiều hơn 12 việc hợp lệ, ba con số vẫn không đổi khi bấm
tải thêm") đo trên `14` việc hợp lệ, `PAGE_SIZE = 12`, và cú gọi thứ hai dùng ĐÚNG `nextOffset` mà
response đầu trả về, tức đúng cú bấm "Tải thêm":

```
$ GET /api/jobs?limit=12&offset=0 -> HTTP 200
  jobs.length = 12   total = 14   nextOffset = 12
  overview.totals = {"jobs":14,"slots":56,"areas":2}
  areaCounts = [{"value":"KCN Thang Long","count":7},{"value":"KCN VSIP 1","count":7}]
$ GET /api/jobs?limit=12&offset=12  (dung dung nextOffset o tren = cu bam "Tai them")
  jobs.length = 2   total = 14   nextOffset = null
  overview.totals = {"jobs":14,"slots":56,"areas":2}
  areaCounts = [{"value":"KCN Thang Long","count":7},{"value":"KCN VSIP 1","count":7}]
  --- BA CON SO KHONG DOI? true
  --- areaCounts KHONG DOI? true
  --- overview.totals.jobs (14) == total (14)? true
  --- so card THAY tren trang 1 = 12 , NHO HON con so tin cay 14
  --- newest do dai = 6 (<= 6), topPaid do dai = 6 (<= 6)
  --- topPaid[].salaryMaxVnd = [43000,42000,41000,40000,39000,38000]  (phai giam dan)
  --- kieu ba con so = number, number, number ; co dau "+"? false
```

Dòng `so card THAY tren trang 1 = 12 , NHO HON con so tin cay 14` là lý do phép đo bản `v1.0` (đếm
card trong DOM rồi so với con số trên strip) bất khả thi: hai con số ĐÚNG RA phải khác nhau. `v1.2`
đổi phép đo sang "ba con số không đổi giữa hai trang", và đó chính là thứ đo được ở trên.

### 3.2 `AC-14` — hai lần chạy tách biệt: RED rồi GREEN

Nguồn: `evidence/step13-ac14-red-repro.txt`. Chỉ MỘT file bị đổi về blob baseline (`public.service.ts`),
nên phép này cô lập đúng phần cài đặt của task; hai file test mới giữ nguyên bản HEAD.

```
$ SHA_BEFORE (sha256 16 ky tu dau, file worktree) = 3a9b59056fb25ad5
$ git show 8ca2ee1:src/domains/job-board/public.service.ts > src/domains/job-board/public.service.ts   (exit 0, 26282 bytes)
$ npm run test:unit -- src/domains/job-board/public-board-architecture.test.ts src/domains/job-board/public-board-route-json.test.ts
RED_EXIT=1   (khac 0 = DO thuc su)
   Test Files  2 failed (2)
$ SHA_AFTER = 3a9b59056fb25ad5   ;  SHA_BEFORE == SHA_AFTER -> True
$ chay lai CUNG hai file tren ban HEAD:
GREEN_EXIT=0
   Test Files  2 passed (2)
```

`22` case đỏ, trích năm dòng tiêu biểu (bản đầy đủ trong artifact):

```
 × RQ-18 ... > mọi slot không có lương ⇒ salaryMinVnd và salaryMaxVnd đều null, không phải 0
   → expected undefined to be null
 × RQ-18 ... > JSON.stringify trên DTO có lương không ném — đúng bẫy BigInt của NextResponse.json
   → expected '{"id":"prj-1","slug":"DA-2026-001","t…' to contain '45000'
 × RQ-03, RQ-04, RQ-18 ... > CLOSING_SOON cộng hạn còn 3 ngày ⇒ URGENT và statusLabel đổi theo
   → expected undefined to be 'URGENT' // Object.is equality
 × RQ-21, DEC-18 ... > bốn khoá cũ của PublicJobListResult không đổi, overview là khoá thứ năm THUẦN CỘNG
   → expected [ Array(4) ] to deeply equal [ Array(5) ]
 × AC-04 — response THẬT của GET /api/jobs mang lương là number > 200 và salaryMinVnd trong JSON là number
   → expected 'undefined' to be 'number' // Object.is equality
```

Chi tiết đáng chú ý cho Tier 3: case `JSON.stringify ... không ném` đỏ ở baseline KHÔNG phải vì nó ném,
mà vì `toContain('45000')` — nửa dưới của cùng một khẳng định. Nếu file test chỉ có `not.toThrow()` thì
nó XANH cả trên baseline (baseline không có `BigInt` nào trong DTO vì không có field lương nào cả), tức
sẽ là một AC đúng mặt chữ mà không khoá gì.

### 3.3 `AC-09` và `AC-15` — mô tả hai card, và từng phần tử tương tác mới

`AC-09` cho phép "chụp HOẶC mô tả"; đây là bản MÔ TẢ, kèm số dòng để Tier 3 mở đúng chỗ mà đối chiếu.
Cả hai nhánh dùng CÙNG một hàm `salaryLabel` ở `app/(portal)/page.tsx:101-105`, nên không có đường nào
để hai nhánh lệch nhau về vị trí hay cỡ chữ:

```
101  function salaryLabel(min: number | null, max: number | null): string {
102    if (min === null) return 'Lương thương lượng';
103    const from = VND_FORMAT.format(min);
104    if (max !== null && max !== min) return `${from} – ${VND_FORMAT.format(max)} đ/giờ`;
105    return `${from} đ/giờ`;
106  }
```

- **Card CÓ lương** (job có ít nhất một slot mang `hourlyRateVnd`): khối lương đứng NGAY sau tiêu đề
  việc, dòng `293` trong `<p className="text-lg font-bold">` màu `var(--color-primary-dark)`. Chữ
  `18px` bold, so với `text-xs` (`12px`) của mọi dòng phụ trong cùng card ⇒ đúng "nổi bật nhất sau
  tiêu đề". Nội dung hiển thị: `45.000 – 70.000 đ/giờ` khi min khác max, `70.000 đ/giờ` khi bằng nhau
  (`Intl.NumberFormat('vi-VN')` nên dấu phân cách là dấu chấm).
- **Card KHÔNG có lương** (mọi slot `hourlyRateVnd = null`): CÙNG dòng `293`, CÙNG thẻ, CÙNG cỡ chữ,
  CÙNG màu — chỉ đổi nội dung thành `Lương thương lượng`. Không thu nhỏ, không ẩn, và tuyệt đối không
  in `0`; nhánh `0` bị chặn ở service (`salaryMinVnd` là `null` chứ không phải `0`) và có test riêng
  `mọi slot không có lương ⇒ salaryMinVnd và salaryMaxVnd đều null, không phải 0`.
- Cùng một hàm đó còn chạy cho card nổi bật (`450`, `text-xl`) và card của hai dải overview (`554`,
  `text-sm`), nên ba cỡ card nói CÙNG một câu về tiền.

`AC-15` — `11` phần tử tương tác THẬT ở HEAD (đếm dòng mở element, đã loại dòng comment). Không phần
tử nào thiếu vùng chạm `>= 44px`, không phần tử nào thiếu `hrp-focus`:

| Dòng | Phần tử | Vai trò |
|---|---|---|
| `322` | `<button onClick={() => onApply(job)}>` | Ứng tuyển trên card danh sách |
| `332` | `<button aria-label="Lưu việc">` | Lưu việc, chỉ có icon nên `aria-label` là ĐÚNG chỗ dùng (`w-11 h-11` = 44px) |
| `394` | `<select id={selectId}>` | Ô lọc của `FacetSelect`, nối với nhãn nhìn thấy bằng `htmlFor={selectId}` |
| `463` | `<button onClick={() => onApply(featured)}>` | Ứng tuyển trên card nổi bật |
| `502` | `<button onClick={() => onPick(entry.value)}>` | Một tag trong `TagStrip` (khu vực / ca) |
| `784` | `<input id="hrp-hero-keyword" type="search">` | Ô từ khoá ở Hero |
| `818` | `<button type="submit" aria-busy={searching}>` | Nút `Tìm việc` của Hero |
| `893` | `<input id="hrp-keyword" type="search">` | Ô từ khoá trong panel lọc |
| `924` | `<button type="submit" aria-busy={searching}>` | Nút tìm trong panel lọc |
| `976` | `<button onClick={...runQuery(lastAttemptRef.current)}>` | Thử lại khi lỗi mạng |
| `1078` | `<button type="button" onClick={loadMore}>` | `Tải thêm` |

Khoảng cách tối thiểu `8px` giữa các control mới: container của ba ô lọc là dòng `840`
`grid grid-cols-1 sm:grid-cols-3 gap-4` (`gap-4` = 16px), panel lọc dùng `gap-6` (dòng `944`, `990`) và
`gap-2` (dòng `947`, `885`) — mức nhỏ nhất trong số đó là `8px`.

Chuyển động: trang KHÔNG tự khai `@media (prefers-reduced-motion)` (đếm `= 0`) vì nó không cần — mọi
chuyển động mới đi qua ba class có sẵn (`nav-item-lift` 7 dòng, `hrp-card` 2 dòng, `hrp-btn-primary`
5 dòng) và `app/globals.css:609` đã có đúng một khối `@media (prefers-reduced-motion: reduce)` hạ mọi
`animation-duration` / `transition-duration` về `0.01ms` cộng huỷ riêng cú nhấc của `.nav-item-lift:hover`.
File CSS đó KHÔNG bị task này sửa (`EV-25`), nên hàng rào này là hàng rào đã ACCEPTED trước đó, không
phải hàng rào mới do task tự dựng cho mình.

### 3.4 `AC-22` — bốn file test đã ACCEPTED: chỉ SIẾT, không NỚI

Nguồn: `evidence/step13-ac22-tighten.txt`. Bốn phép kiểm cơ học mà `AC-22` đòi, cộng một đối chứng
DƯƠNG chứng minh phép quét diff có nhìn thấy chữ:

| File | `expect(` baseline | `expect(` HEAD | Delta | Kết luận |
|---|---|---|---|---|
| `public-card-truth.test.ts` | `81` | `83` | `+2` | không giảm |
| `public-card-truth.integration.test.ts` | `67` | `75` | `+8` | không giảm |
| `public-ui-premium.static.test.ts` | `196` | `198` | `+2` | không giảm |
| `marketplace-browse.routes.test.ts` | `56` | `56` | `+0` | không giảm |
| **TỔNG** | `400` | `412` | `+12` | không giảm |

```
so dong BO   co toEqual            = 0     <- khong co toEqual nao bi ha xuong toContain
so dong THEM co toBeGreaterThan    = 0     <- khong co toBe nao bi ha xuong toBeGreaterThan
so dong THEM co .skip              = 0
so dong BO   co .skip              = 0
outline-none         dong BO=0  dong THEM=0  -> OK (khong xuat hien)
transition-colors    dong BO=0  dong THEM=0  -> OK (khong xuat hien)
type="checkbox"      dong BO=0  dong THEM=0  -> OK (khong xuat hien)
sha256               dong BO=0  dong THEM=0  -> OK (khong xuat hien)
--- doi chung DUONG: so dong THEM trong diff bon file = 120 ; dong BO = 17
```

Ba dòng BỎ có `toBe(` và cả ba đều là SIẾT một con số đếm lên, không phải nới phép so:

```
-expect(count(page, 'hrp-focus')).toBe(8);      ->  +expect(count(page, 'hrp-focus')).toBe(12);
-expect(count(page, '<FacetSelect')).toBe(2);   ->  +expect(count(page, '<FacetSelect')).toBe(4);
-expect(count(page, 'min-h-11')).toBe(6);       ->  +expect(count(page, 'min-h-11')).toBe(10);
```

## 4. Changed Deliverables

- **Source/artifact changed** — `12` file tracked trong `git diff --stat`: `12 files changed,
  969 insertions(+), 145 deletions(-)`. Trong đó **8 file là của task này** (`869` thêm / `86` bỏ):
  - `app/(portal)/page.tsx` — `537 / 61` (644 → 1120 dòng): tiêu thụ `overview`, `salaryLabel`, nhãn
    `<label htmlFor>` cho ba control, hai dải `newest` / `topPaid`, `TagStrip` cho khu vực và ca.
  - `src/domains/job-board/public.service.ts` — `201 / 5`: bốn field mới của DTO, `orderUrgency`,
    `jobHeadline`, hai dòng thêm vào `publicSelect` (`createdAt`, `hourlyRateVnd`), khối `overview`.
  - `src/domains/applications/marketplace-browse.routes.test.ts` — `24 / 0`.
  - `src/domains/job-board/public-card-truth.integration.test.ts` — `44 / 4`.
  - `src/domains/job-board/public-card-truth.test.ts` — `16 / 3`.
  - `src/domains/job-board/public-ui-premium.static.test.ts` — `36 / 10`.
  - `src/domains/job-board/mp1.contract.test.ts` — `9 / 2` (fixture, xem `DEV-04`).
  - `src/domains/job-board/public-detail.service.test.ts` — `2 / 1` (fixture, xem `DEV-04`).
- **File MỚI (còn untracked, chưa `git add` vì `R-01` chỉ cho phép add HANDOFF và evidence)**:
  - `src/domains/job-board/public-board-architecture.test.ts` — `371` dòng, đo ở tầng service.
  - `src/domains/job-board/public-board-route-json.test.ts` — `174` dòng, đo trên RESPONSE của route
    thật (xem `DEV-08`).
  - Ngoài hai file test trên, `9` script phụ trợ untracked dưới `scratch/` do Tier 2 tạo để ghép
    văn HANDOFF (heredoc chết trên literal có nháy đơn lẻ) — xem `NOTE-03`. Không script nào chạm
    mã sản phẩm và không script nào được stage.
- **File của LUỒNG KHÁC nằm trong cùng `--stat` nhưng KHÔNG do task này chạm** (`100` thêm / `59` bỏ):
  ba `AUDIT.md` của `go-live-02`, `go-live-04`, `go-live-13` (`1 / 0` mỗi file) và `public/index.html`
  (`97 / 59`, dấu vết của `copy-static.mjs`). Xem `DEV-07`.
- **Dependency** — None. `package.json` và `package-lock.json` không xuất hiện trong `git status`.
- **Schema/migration** — None. `PRISMA_FILES_IN_STATUS = 0`; bốn chuỗi `CREATE POLICY` / `GRANT` /
  `ALTER TABLE` / `set_config` đếm `0` trên toàn bộ dòng thêm (`AC-17`).
- **Environment/config** — None. Không sửa `vitest.config.*`, `next.config.*`, `tailwind.config.*`,
  `.env*`. Không biến môi trường nào được thêm hay đổi. `app/globals.css` KHÔNG bị sửa: sha256 của
  vùng khoá từ `.pub-header` (dòng `452`) đến EOF giống nhau ở baseline và HEAD (`EV-25`).
- **Git diff/commit** — **Không tạo commit nào.** `git log origin/main..HEAD --oneline` rỗng;
  `git rev-parse HEAD` = `git rev-parse origin/main` = `da724931adb8ff6fdd67bd26982044044a41193f`.
  Không push, không deploy (`R-01`). Toàn bộ thay đổi đang ở worktree để Tier 3 đọc bằng `git diff`.

## 5. Deviations and Ambiguities

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `DEV-01` | AC bất khả đo theo mặt chữ | `AC-08` và `AC-23` đòi đếm literal có NHÁY ĐƠN của lời gọi `/api/jobs`. Con số đó là `0` ở baseline VÀ `0` ở HEAD, vì mã dùng backtick (`evidence/step01-baseline-state.txt` PHÉP 4, `evidence/step13-gate-locks.txt`). Hợp mọi dạng nháy = `1` ở cả hai bên | Phép đo đúng mặt chữ nhưng VÔ GIÁ TRỊ: `0 == 0` xanh vì lý do sai. Một bản cài đặt xoá sạch fetch cũng thoả nó | Xác nhận đọc phép đo "hợp mọi dạng nháy = 1" thay cho literal nháy đơn, hoặc sửa văn AC ở round sau |
| `DEV-02` | Lệch contract, CÓ Ý THỨC | `AC-08` đòi "không tăng số `useState`". Thực tế `16 → 18` (`evidence/step13-ac-battery-4.txt`) | Hai state mới là `minSalary` (`RQ-05`/`RQ-07` đòi bộ lọc lương) và `overview` (dữ liệu server, không thể suy ra từ `jobs` của trang đang tải). Cả hai KHÔNG vào `JobSearchFilters` (giống từng byte) và KHÔNG vào `buildQuery` ⇒ không đổi hình dạng request | Tier 3 phán: nhận hai state này như hệ quả bắt buộc của `RQ-05`/`RQ-21`, hay đòi cài đặt khác |
| `DEV-03` | Đổi thiết kế đã ACCEPTED | `FacetSelect` chuyển từ `<h3>` cộng `aria-label` sang `<label htmlFor={selectId}>` cộng `useId()` (page `383`, `389`, `395`) | `AC-07` đòi nhãn NHÌN THẤY nối với control; `<h3>` không nối gì cả và `aria-label` là nhãn cho máy đọc, không phải nhãn nhìn thấy. Số `aria-label` trong file còn `1`, ở nút chỉ-có-icon dòng `332` — đúng chỗ nó nên tồn tại | Xác nhận đây là SIẾT chứ không phải hồi quy so với `EV-24` của go-live-08 |
| `DEV-04` | File ngoài danh sách AC | Sửa thêm `mp1.contract.test.ts` (`9 / 2`) và `public-detail.service.test.ts` (`2 / 1`) | Hai file này nằm trong mệnh đề chung của §4.2 của TASK (test lane unit dưới `src/domains/job-board/`) nhưng NGOÀI bốn file mà `AC-22` gọi tên. Lý do sửa: `publicSelect` nay select thêm hai field, nên fixture cũ không còn là hình dạng dòng THẬT | Xác nhận hai file này trong allowlist |
| `DEV-05` | Phép đo sai, đã sửa trong cùng round | `evidence/step10-controls.txt` báo "1 control thiếu vùng chạm". Sai: nó đếm cả chuỗi thẻ select nằm trong VĂN comment dòng `356` | Bản đúng ở `evidence/step13-ac15-controls.txt`: `11` element thật, `0` thiếu vùng chạm, `0` thiếu `hrp-focus` | Không cần quyết định; ghi để Tier 3 đừng trích artifact cũ |
| `DEV-06` | Phép đo vô giá trị, đã thay | Trong `evidence/step13-ac-battery-1.txt`, phép `AC-05` chạy qua một `sed` lỗi cú pháp (`unknown command: ','`) nên con số `0` của nó KHÔNG chứng minh gì | Bản hợp lệ ở `evidence/step13-ac-battery-2.txt`: in nguyên văn dòng `345-410` cộng đối chứng dương `12` | Tier 3 phải trích battery-2 cho `AC-05`, không trích battery-1 |
| `DEV-07` | File dirty của luồng khác | `STEP-12` yêu cầu DỪNG và BÁO, không tự dọn. Bốn file tracked (`3` × `AUDIT.md`, `public/index.html`) cộng nhóm `scratch/relock-gl09-*.py`, `scratch/commit-gl09-relock.txt`, `scratch/fix-gl09-detail-path.py`. mtime của nhóm scratch là `14:34–15:21`, TRƯỚC HEAD `da72493` (`16:05`), còn artifact của tôi từ `19:15` | Chúng làm `git diff --stat` của `AC-19` phồng lên `12` file. Không file nào bị tôi chạm, stage hay xoá | Xác nhận nhóm này thuộc luồng relock của Tier 1; nếu không phải thì cần điều tra riêng |
| `DEV-08` | Thêm file ngoài STEP list | `src/domains/job-board/public-board-route-json.test.ts` (`174` dòng) không có trong danh sách file mà `STEP-03` gọi tên | Bắt buộc phải có: `AC-04`/`AC-11`/`AC-12` đo trên RESPONSE của `GET /api/jobs`, còn `public-board-architecture.test.ts` chỉ đo giá trị trả về của service. Khoảng cách giữa hai chỗ đó là `NextResponse.json` — đúng nơi bẫy `BigInt` sống | Xác nhận file thứ hai này nằm trong scope |
| `OBS-01` | Khẳng định bị BỎ trong file đã ACCEPTED | `public-card-truth.integration.test.ts` bỏ hai literal `'45000'` và `'salary'` khỏi vòng cấm, và bỏ dòng `expect(JSON.stringify(detail)).not.toContain('45000')` (`evidence/step13-ac22-tighten.txt` mục (e)) | Bắt buộc theo `RQ-18`/`DEC-19`: lương giờ nay LÀ dữ liệu công khai, nên khẳng định cũ mâu thuẫn trực tiếp với spec mới. Bù lại cùng lượt: hai `toContain('45000')` DƯƠNG, sáu `toBe` mới, và vòng cấm được mở rộng thêm `rateCard`, `price`, `billing`, `margin`. `expect(` của file `67 → 75` | Tier 3 phán: đây là SIẾT theo `DEC-19` (như tôi hiểu), hay là vi phạm `AC-22` "chỉ siết, không nới" |
| `LIM-01` | `ENV_BLOCKED` — KHÔNG phải PASS | Nửa LIVE của `AC-04`, `AC-11`, `AC-12` chưa đo được: `DATABASE_URL_TEST` không có trong môi trường (`evidence/step09-integration-env-blocked.txt`) | Ba AC đó chỉ có nửa in-process. Không RLS nào được khẳng định trong round này | Cách đóng cho Tier 3: đặt `DATABASE_URL_TEST` và `DATABASE_URL_ADMIN_TEST` trỏ branch `hrp_mp2_test` (`br-misty-cell-az3nx5l3`, `Expires At = never`) rồi chạy lại lane integration. Tuyệt đối KHÔNG trỏ `hrp-live`, không fallback, không mock-pass |
| `LIM-02` | Bằng chứng dạng mô tả | `AC-09` và `AC-15` được đo bằng mô tả cộng số dòng, không bằng ảnh chụp | Cả hai AC cho phép "chụp HOẶC mô tả"; §3.3 ghi rõ đã đo ở khổ nào và bằng cách nào | Không cần quyết định |
| `LIM-03` | Artifact tạm đã bị xoá | Lần RED TOÀN LANE (`17 failed \| 1567 passed`) chạy ở checkout tạm `C:/CodeApp/HrP-gl09-baseline`, nay không còn | Không chặn `AC-14`: bản tái lập ở `evidence/step13-ac14-red-repro.txt` chỉ đổi MỘT file trong cây hiện tại, chạy ~1.4s, và phục hồi đúng từng byte (`SHA_BEFORE == SHA_AFTER`) | Không cần quyết định |
| `NOTE-01` | Rác tạm đã dọn | Ba spec in-bằng-chứng tạm được tạo dưới `src/` rồi xoá ngay sau khi chạy | `git status` không còn dấu vết nào của chúng; không file nào lọt vào `--stat` | Không cần quyết định |
| `NOTE-02` | Nhiễu vô hại | `git diff` in `warning: LF will be replaced by CRLF` do `core.autocrlf` | Không ảnh hưởng nội dung diff hay phép đếm; `CRLF` trong `page.tsx` đếm `0` | Không cần quyết định |
| `NOTE-03` | Script phụ trợ do Tier 2 tự tạo | `9` file untracked dưới `scratch/`: `gl09-handoff-count.py`, `gl09-handoff-fixrefs.py`, `gl09-handoff-note03.py`, `gl09-handoff-s3.py`, `gl09-handoff-s31.py`, `gl09-handoff-s33.py`, `gl09-handoff-s45.py`, `gl09-handoff-s67.py`, `gl09-handoff-s6note.py` (mtime `19:39`–`19:56`, SAU HEAD `da72493`) — chỉ dùng để ghép văn HANDOFF, vì heredoc của shell chết trên literal `fetch('/api/jobs'` | Không script nào được stage (`git status --short -- scratch/` chỉ có dòng `??`), không script nào vào `git diff --stat` của `AC-19`, không script nào chạm mã sản phẩm. Khác hẳn nhóm `relock-gl09-*` của luồng khác ở `DEV-07` (mtime `14:34`–`15:21`). Ảnh chụp `git status` trong `evidence/step12-scope.txt` (`98` dòng `??`) được lấy TRƯỚC khi 9 script này tồn tại | TASK §4.2 xếp `scratch/*` vào cột Cấm chạm, dưới mệnh đề "Mọi file dirty của luồng khác". Tier 3 phán: `9` file MỚI này có nằm ngoài mệnh đề đó hay không. Xoá chúng không đổi bất kỳ phép đo nào trong HANDOFF |

## 6. Evidence Index

`31` artifact, tất cả dưới `docs/tasks/hrp-v5-go-live-09-public-board-architecture/evidence/`. `ls` thư mục đó ra `32` file: file thứ `32` là `evidence/handoff-copy-round1-v12.md`, bản sao từng byte của chính HANDOFF này theo luật chống-cắt-file (`git add` ngay khi ghi, cộng một bản copy) — nó KHÔNG phải bằng chứng của AC nào.

| Evidence | Path | Proves |
|---|---|---|
| Trạng thái đầu vào | `evidence/step01-baseline-state.txt` | `AC-01`: năm phép đo trên blob `8ca2ee1` — DTO `14` khoá không có lương, `publicSelect` thiếu hai field, `PublicJobListResult` `4` khoá, `PAGE_SIZE = 12`, vùng khoá CSS bắt đầu ở dòng `452` của `624` và kết thúc đúng EOF |
| Lane unit ở baseline | `evidence/step02-baseline-test-unit-8ca2ee1.txt` | Mốc so sánh của `AC-18`: `101` file, `1567` test PASS trước khi task chạm mã |
| RED toàn lane | `evidence/step03-red-test-unit-baseline-service.txt` | `AC-14` nửa RED ở cỡ toàn lane: `Tests 17 failed \| 1567 passed (1584)` |
| RED nhắm đích | `evidence/step03b-red-targeted-baseline-service.txt` | Cùng phép trên đúng hai file test mới, tách khỏi nhiễu của lane |
| ENV_BLOCKED | `evidence/step09-integration-env-blocked.txt` | `LIM-01`: `DATABASE_URL_TEST` không có ⇒ nửa LIVE của `AC-04`/`AC-11`/`AC-12` chưa đo được, và KHÔNG được ghi PASS |
| Literal màu | `evidence/step10-color-literals.txt` | `AC-16`: `1414` dòng thêm, `0` literal màu, kèm đối chứng dương `3 / 3` |
| Đếm control (bản thô) | `evidence/step10-controls.txt` | Ghi lại phép đo SAI của `DEV-05` — giữ nguyên để Tier 3 thấy vết, không xoá |
| Khoá CSS | `evidence/step10-globals-css-lock.txt` | `EV-25`: sha256 vùng `.pub-header` → EOF giống nhau hai bên ⇒ `app/globals.css` không bị sửa |
| Delta các số khoá | `evidence/step10-lock-deltas.txt` | `AC-22`: mọi con số đếm trong test tĩnh đổi theo hướng TĂNG |
| Control mới | `evidence/step10-new-controls.txt` | `AC-15`: danh sách phần tử tương tác mới cùng class vùng chạm và focus |
| GREEN toàn lane (STEP-11) | `evidence/step11-green-test-unit.txt` | Lượt xanh đầu tiên sau khi cài đặt xong |
| Lint (STEP-11) | `evidence/step11-lint.txt` | Lượt lint đầu tiên; thiếu dấu exit nên đã chạy lại ở `step13-gate-lint.txt` |
| Locks (STEP-11) | `evidence/step11-locks.txt` | Lượt đếm khoá đầu tiên |
| Typecheck (STEP-11) | `evidence/step11-typecheck.txt` | Lượt typecheck đầu tiên |
| Phạm vi thay đổi | `evidence/step12-scope.txt` | `AC-19`: `git diff --stat` / `--numstat` / `git status --short`, và phân định file của luồng khác (`DEV-07`) |
| Battery 1 | `evidence/step13-ac-battery-1.txt` | `AC-02` (hai dòng thêm vào `publicSelect`, `0` `clientCompany`), `AC-06` (`0` hit ngưỡng `= 5`), `AC-13` (`19` dòng liệt kê đầy đủ) |
| Battery 2 | `evidence/step13-ac-battery-2.txt` | `AC-05` bản HỢP LỆ (in nguyên văn `345-410`, đối chứng dương `12`), `AC-10` (bốn chuỗi `0`, đối chứng `Đang tuyển = 1`), `AC-13` phân loại |
| Battery 3 | `evidence/step13-ac-battery-3.txt` | `AC-17` (bốn chuỗi SQL `0`, đối chứng `981`), `AC-20` (`0` commit, hai SHA bằng nhau), `AC-21` (`overview` sinh trước lọc và trước `slice`), `AC-24` (bốn đường dẫn `viec-lam` còn nguyên, `0` dirty) |
| Battery 4 | `evidence/step13-ac-battery-4.txt` | `AC-07` (nút `type="submit"` chữ `Tìm việc`), `AC-08` (từng khai báo `useState` hai bên, `JobSearchFilters` giống từng byte, `buildQuery` không đổi hình dạng request) |
| Battery 5 | `evidence/step13-ac-battery-5.txt` | `AC-03` (bốn field ở dòng `50`/`51`/`57`/`59` cộng `extends` ở `158`), `AC-07` (`useId` → `htmlFor` → `id`), `AC-09` (`salaryLabel` và ba chỗ gọi), `AC-12` (phép tính ba con số ở `639-641`), `AC-23` (`16` chỗ đọc `overview.`, `sort(` = `0`, `reduce(` = `0`, phân loại `8` hit `jobs.length`) |
| Cặp response | `evidence/step13-ac04-ac11-ac12-response-pair.txt` | `AC-04`, `AC-11`, `AC-12` trên RESPONSE thật: `HTTP 200`, lương là `number`, tag `2 == 2` và `7 == 7`, ba con số không đổi giữa trang `1` và trang `2` của tập `14` việc |
| Tái lập RED | `evidence/step13-ac14-red-repro.txt` | `AC-14`: `RED_EXIT=1` với `22` case đỏ có tên, `GREEN_EXIT=0`, `SHA_BEFORE == SHA_AFTER` |
| Control (bản đúng) | `evidence/step13-ac15-controls.txt` | `AC-15`: `11` element thật, `0` thiếu vùng chạm, `0` thiếu `hrp-focus`, `globals.css:609` có `prefers-reduced-motion` |
| Siết test | `evidence/step13-ac22-tighten.txt` | `AC-22`: `expect(` `400 → 412` không file nào giảm, `0` `toEqual` bị bỏ, `0` `toBeGreaterThan` thêm, `0` `.skip`, ba phép đếm 0 của `EV-24` và `sha256` không xuất hiện trong diff |
| Gate lint | `evidence/step13-gate-lint.txt` | `AC-18`: `LINT_EXIT=0`, `496 problems (0 errors, 496 warnings)` |
| Gate locks | `evidence/step13-gate-locks.txt` | `AC-18`/`AC-23`: `LOCKS_EXIT=0` và mọi con số khoá đúng kỳ vọng |
| Gate lane unit | `evidence/step13-gate-test-unit.txt` | `AC-18`: `TEST_UNIT_EXIT=0`, `103 passed` file, `1589 passed` test, `22.75s` |
| Gate typecheck | `evidence/step13-gate-typecheck.txt` | `AC-18`: `TYPECHECK_EXIT=0` |
| Gate contract | `evidence/step13-verify-task.txt` | `C-09` của Tier 3: `RESULT: PASS. TASK contract is ready for execution.`, exit `0` |
| Script đếm khoá | `evidence/gl09-locks.mjs` | Bản chạy được của mọi phép đếm khoá — Tier 3 chạy lại bằng `node` mà không cần dựng lại lệnh |
| Gate bảng HANDOFF | `evidence/step14-handoff-table-gate.txt` | Bản thân HANDOFF này hợp lệ về cấu trúc: `MALFORMED ROWS: 0`, `AC rows=24 gaps=none`, `STEP rows=13 gaps=none`, `GATE_EXIT=0` — không ô bảng nào thiếu cột nên Tier 3 không đọc lệch cột |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| 1 | `v1.2` | `READY_FOR_AUDIT` | Cài đặt đủ `RQ-01`…`RQ-24` trên `public.service.ts` và `app/(portal)/page.tsx`; hai file test mới (`545` dòng) khoá bất biến mới ở cả tầng service lẫn tầng RESPONSE; bốn gate xanh với exit code lấy bằng redirect; `24` AC có bằng chứng thật, trong đó `AC-04`/`AC-11`/`AC-12` chỉ có nửa in-process vì `DATABASE_URL_TEST` chưa có (`LIM-01`, KHÔNG ghi PASS). Không commit, không push, không deploy |

> Handoff status: READY_FOR_AUDIT
