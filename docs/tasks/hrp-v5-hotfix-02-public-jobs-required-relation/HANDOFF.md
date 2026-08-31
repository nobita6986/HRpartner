# HANDOFF: hrp-v5-hotfix-02-public-jobs-required-relation

> Task này push và deploy production theo uỷ quyền `DEC-10` của Owner (31/08 14:18 +07), bound
> bởi bốn điều kiện `RQ-11`. Toàn bộ bằng chứng gate tĩnh dưới đây được viết vào file này
> **TRƯỚC** khi commit, đúng thứ tự mà `AC-12` đòi.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-hotfix-02-public-jobs-required-relation` |
| Work type | `CODE` |
| Audit mode | `CODE_AUDIT` |
| Spec version | `v1.1` (đọc lại lúc bắt đầu; contract đã bump từ `v1.0` sau khi Owner đóng `Q-01`) |
| Execution round | `1` |
| Current audit round | `0` |
| Baseline | `e0a70f7`. HEAD lúc bắt đầu là `9383003` nhưng đó là commit docs-only: `git diff --name-only e0a70f7..HEAD -- src app prisma package.json vitest.unit.config.ts` trả RỖNG ⇒ mã nguồn tại HEAD trùng baseline từng byte |
| Executor | `Tier 2` |
| Status | `READY_FOR_AUDIT` |
| Gate | `verify-task.ps1` exit 0 (`RESULT: PASS. TASK contract is ready for execution.`) |
| Started/updated | 2026-08-31, Asia/Bangkok |

## 1. Outcome Summary

`/api/jobs` và `/api/jobs/{slug}` trên production **đã trả 200** sau khi bản sửa này lên. Đó là
tiêu chí đóng task theo `DEC-07`, không phải gate xanh — và lần này tôi đo được nó thật vì Owner
đã uỷ quyền push tại `DEC-10`.

Nguyên nhân đúng như `EV-01`: `publicSelect` kéo quan hệ **bắt buộc** `clientCompany` vào truy
vấn, principal công khai `MKT` không đọc được `client_companies` dưới FORCE RLS, nên query engine
của Prisma ném `Inconsistent query result` **trước khi** `toDto` chạy. Vì thế optional-chaining
mà hotfix-01 thêm vào không bao giờ có cơ hội chạy. Fix là bỏ quan hệ khỏi `select` (`DEC-01`),
đúng một khoá.

Ba thay đổi mã, tất cả trong `src/domains/job-board/`:

- `publicSelect` bỏ khoá `clientCompany` (`RQ-01`), thêm 4 dòng comment nêu lý do engine để không
  ai select lại quan hệ bắt buộc trên bảng bị che;
- kiểu tham số `toDto` bỏ hẳn field đó cùng ba dòng comment nullable của hotfix-01 (`DEC-04`),
  điểm gọi thành `inferIndustry(searchableText, null)` (`DEC-03`);
- một file test tĩnh mới `public-select.static.test.ts` đọc chính mã nguồn làm hàng rào hồi quy
  (`RQ-03`), vì mock `findMany` không tái lập được lớp lỗi này (`DEC-06`).

Số đo cuối: `npm run typecheck` exit **0**; `npm run test:unit` exit **0** với **1421 test passed
/ 93 file** (baseline 1418/92, +3 đúng bằng test tĩnh mới); `npm run lint` exit **0** với **0
error**; diff đúng **3 file**, tất cả dưới `src/domains/job-board/`; **0** câu SQL, **0** file
dưới `prisma/`.

## 2. Execution Trace

Bảng ánh xạ `STEP` → `RQ` → kết quả, theo `HANDOFF.template.md`. Chi tiết và output nguyên văn nằm
ngay dưới bảng.

| STEP | RQ | File/artifact | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-00` | — | `verify-task.ps1`; 3 URL production | `DONE` | None — đọc lại `TASK.md` và phát hiện contract đã bump `v1.0` → `v1.1`, thi hành theo `v1.1` |
| `STEP-01` | `RQ-01` | `public.service.ts` → `publicSelect` | `DONE` | None |
| `STEP-02` | `RQ-02` | `public.service.ts` → kiểu `toDto` + điểm gọi `inferIndustry` | `DONE` | None |
| `STEP-03` | `RQ-03` | `public-select.static.test.ts` (mới) | `DONE` | None — RED chạy TRƯỚC `STEP-01`/`STEP-02`, không phải tái lập bằng `git stash` |
| `STEP-04` | `RQ-04` | `mp1.contract.test.ts` | `DONE` | `DEV-01` — bỏ thêm field quan hệ chết ở fixture inline của case cũ, trong cùng file `RQ-10` cho phép |
| `STEP-05` | `RQ-05`, `RQ-06` | `npm run typecheck`, `npm run test:unit`, `npm run lint`, grep cấm | `DONE` | None |
| `STEP-06` | `RQ-10` | phạm vi diff | `DONE` | None |
| `STEP-07` | `RQ-11` | commit `0248948`, push `e0a70f7..0248948`, deploy production | `DONE` | None — bốn bound (a)…(d) đều thoả, xem §4 |
| `STEP-08` | `RQ-09` | `vercel logs` trên deployment mới | `DONE` | None |
| `STEP-09` | — | limitation | `DONE` | None — ba mục `STEP-09` đòi nằm ở `LIM-01`, `LIM-03`, `LIM-04` (§9) |

`RQ-07` và `RQ-08` (200 live cho `/api/jobs` và `/api/jobs/{slug}`) không thuộc `STEP` nào riêng —
chúng được đo ở phần live của `STEP-07`, bằng chứng ở §5, chấm điểm ở §7 dưới `AC-08`/`AC-09`.

### STEP-00 — preflight và phép đo live TRƯỚC khi sửa

```
verify-task.ps1 -TaskPath docs\tasks\hrp-v5-hotfix-02-public-jobs-required-relation\TASK.md
RESULT: PASS. TASK contract is ready for execution.
EXIT=0
```

Tôi đọc lại `TASK.md` ở bước này và phát hiện contract đã lên **`v1.1`**: `Q-01` ĐÓNG, thêm
`DEC-10`, `RQ-11`, `AC-12` viết lại, `STEP-07` đổi từ "không tự push" thành "gate tĩnh trước,
rồi push". Nếu tôi làm theo bản `v1.0` đã đọc ở lượt trước thì đã bàn giao thiếu ba AC live.

Đo live trên production **trước** khi sửa một dòng nào, để phần "sau deploy" ở §4 có mốc so sánh
thật chứ không phải lời kể:

```
https://www.hrpartner.vn/api/jobs            -> http=500 bytes=0
https://www.hrpartner.vn/api/jobs?limit=1    -> http=500 bytes=0
https://www.hrpartner.vn/api/jobs/DA-DEMO-001 -> http=500 bytes=0
CURL_EXIT=0
measured_at_utc=2026-08-31T07:22:55Z   (14:22:55 +07)
```

Ba endpoint đều 500 với body rỗng ở baseline `e0a70f7`, tức đúng trạng thái `EV-03` mô tả, sau
hotfix-01 đã deploy.

### STEP-03 — RED trước, chạy trên mã service NGUYÊN BẢN

Tạo `src/domains/job-board/public-select.static.test.ts`: `readFileSync` chính
`public.service.ts`, bỏ comment, cắt khối `publicSelect` từ `const publicSelect` tới declaration
top-level kế tiếp, rồi ba assertion — khối không chứa `clientCompany`; tập khoá mức ngoài cùng
đúng bằng allowlist `code, id, name, siteAddress, staffingOrders`; toàn file không còn
`clientCompany` và có `inferIndustry(searchableText, null)`.

Chạy **trước** `STEP-01`/`STEP-02`:

```
npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-select.static.test.ts
STEP03_RED_LASTEXITCODE=1
```

Output thật (trích, giữ nguyên văn phần kết luận):

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  src/domains/job-board/public-select.static.test.ts > ... > khối publicSelect không chứa khoá quan hệ clientCompany
AssertionError: expected 'const publicSelect = Prisma.validator…' not to contain 'clientCompany'
+   clientCompany: { select: { industry: true } },
 FAIL  ... > publicSelect chỉ gồm scalar của Project cộng đúng một quan hệ staffingOrders
AssertionError: expected [ 'clientCompany', 'code', 'id', …(3) ] to deeply equal [ 'code', 'id', 'name', …(2) ]
 FAIL  ... > toDto không deref quan hệ khách hàng, industry suy từ text với fallback null
AssertionError: expected 'import { Prisma } from \'@prisma/clie…' not to contain 'clientCompany'

 Test Files  1 failed (1)
      Tests  3 failed (3)
   Start at  14:24:47
```

Đây là RED mà `DEC-06` đòi: **không mock `findMany`**. Bằng chứng detector đọc file thật là chính
output — vitest in ra nguyên khối `publicSelect` của baseline kèm dòng
`clientCompany: { select: { industry: true } }`.

### STEP-01 và STEP-02 — bỏ quan hệ, sửa kiểu và điểm gọi

Diff nguyên văn `git diff -- src/domains/job-board/public.service.ts`:

```diff
@@ -88,10 +88,6 @@ function toDto(project: {
   siteAddress: string | null;
-  // Quan hệ bắt buộc ở mức kiểu Prisma, nhưng dưới FORCE RLS thì principal công khai `MKT`
-  // không đọc được `client_companies` nên Prisma trả `null` lúc runtime. Kiểu phải nói thật,
-  // nếu không `tsc` sẽ tiếp tục xanh trong khi đường đọc công khai ném TypeError.
-  clientCompany: { industry: string | null } | null;
   staffingOrders: Array<{
@@ -128,7 +124,7 @@ function toDto(project: {
-    industry: inferIndustry(searchableText, project.clientCompany?.industry ?? null),
+    industry: inferIndustry(searchableText, null),
@@ -137,12 +133,15 @@ function toDto(project: {
+// Chỉ scalar của `Project` cộng nhánh `staffingOrders`. CẤM select quan hệ bắt buộc trên bảng
+// mà principal công khai `MKT` không đọc được (`client_companies`): query engine của Prisma phải
+// materialize dòng liên quan cho mọi dòng trả về, không thấy thì ném `Inconsistent query result`
+// trước khi `toDto` chạy, và mock `findMany` không tái lập được. Hàng rào: `public-select.static.test.ts`.
 const publicSelect = Prisma.validator<Prisma.ProjectSelect>()({
   siteAddress: true,
-  clientCompany: { select: { industry: true } },
   staffingOrders: {
```

Ba dòng comment nullable của hotfix-01 bị xoá đúng theo `DEC-04`. Bốn dòng comment mới **không
chứa** literal `clientCompany` (dùng tên bảng `client_companies`), nên `AC-01` vẫn đếm 0 trên toàn
file — tôi kiểm điều này bằng phép đo, không bằng suy luận (§3 `AC-01`).

`inferIndustry(searchableText, null)` là đường đã có sẵn và đã có test: `:73-79` fold text rồi
`fallback?.trim() || 'Công nghiệp chế tạo'`. Không truyền `undefined`, không truyền chuỗi rỗng
(`DEC-03`).

### STEP-04 — cập nhật hai case hotfix-01

Fixture `publicProjectionTx` đổi tham số từ `clientCompany` sang `projectName`, và dòng mock bỏ
field quan hệ. Hai case giữ **nguyên tên**, **nguyên assertion**:

| Case | Tham số fixture | `industry` khẳng định | Cơ chế sau hotfix-02 |
|---|---|---|---|
| `...when the client company relation is hidden by RLS` | `'Lap rap bang mach'` | `'Công nghiệp chế tạo'` | không keyword nào khớp ⇒ nhánh fallback của `inferIndustry` |
| `...when the relation is readable` | `'Lap rap bang mach dien tu'` | `'Điện tử'` | keyword `dien` trong text dự án |

Hai case vẫn dùng **cùng một** fixture và khác đúng một tham số, nên fix kiểu hardcode một chuỗi
hằng vẫn làm đổ một trong hai. Assertion `typeof ... === 'string'` và giá trị
`'Công nghiệp chế tạo'` không bị nới một chữ. Tên case thứ hai giờ nói về một cơ chế không còn —
tôi giữ vì `STEP-04` cấm đổi tên, và ghi thành `LIM-02`.

Tôi cũng bỏ field `clientCompany: { industry: null }` khỏi fixture inline của case cũ
`projects only public open jobs and excludes internal fields` (`:92` baseline). Đó chính là blind
spot mà `EV-10` của hotfix-01 chỉ ra: một mock mô tả hình dạng mà truy vấn thật không còn trả về
nữa. Case đó vẫn PASS vì `industry: 'Kho vận'` đến từ keyword `warehouse` trong text. Đây là dọn
mã chết trong đúng file mà `RQ-10` cho phép, không phải mở scope — ghi rõ ở `DEV-01`.

```
npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-select.static.test.ts
STEP03_GREEN_LASTEXITCODE=0
 ✓ src/domains/job-board/public-select.static.test.ts (3 tests) 4ms
   Start at  14:27:18

npx vitest run --config vitest.unit.config.ts src/domains/job-board/mp1.contract.test.ts
STEP04_GREEN_LASTEXITCODE=0
 ✓ src/domains/job-board/mp1.contract.test.ts (6 tests) 12ms
   Start at  14:27:20
```

Thứ tự thời gian là bằng chứng RED-trước-GREEN: `14:24:47` (exit 1, 3 failed) → `14:27:18`
(exit 0, 3 passed). Cùng một file test, cùng một lệnh, chỉ khác mã service ở giữa.

### STEP-05 — gate tĩnh và gate cấm

`$LASTEXITCODE` đọc ngay sau mỗi lệnh, không có `|` ở giữa. `>` là redirect ra file tạm ngoài
repo nên exit code vẫn là của `npm`:

```
TYPECHECK_LASTEXITCODE=0
> hrp@0.1.0 typecheck
> tsc --noEmit
(không một dòng lỗi nào)

TESTUNIT_LASTEXITCODE=0
 Test Files  93 passed (93)
      Tests  1421 passed (1421)
   Start at  14:28:10
   Duration  36.75s

LINT_LASTEXITCODE=0
✖ 494 problems (0 errors, 494 warnings)
```

Lane đúng `npm run test:unit` = `vitest run --config vitest.unit.config.ts`, không phải
`npx vitest run` trần. **1421 ≥ 1418** ⇒ không file nào bị loại khỏi lane; chênh +3 đúng bằng ba
case của file test tĩnh mới, `mp1.contract.test.ts` giữ nguyên 6 test.

`npm run lint` exit 0, **0 error**. File test tĩnh mới **không sinh warning nào** — trong output
lint, dòng duy nhất thuộc `job-board` là `mp1.contract.test.ts` (các warning `no-explicit-any` có
sẵn từ trước).

Gate cấm, đo trên diff so với `e0a70f7`:

| Phép đo | Kết quả |
|---|---|
| `git diff e0a70f7 -- src/domains/job-board/ \| grep -cE 'CREATE POLICY\|GRANT\|REVOKE\|ALTER TABLE\|set_config'` | `0` |
| cùng grep trên file test tĩnh mới (untracked, chưa vào diff) | `0` |
| `git diff --name-only e0a70f7 -- prisma` | rỗng |
| `try` / `catch` / `.catch(` trên 4 file `RQ-06`, baseline vs worktree | `app/api/jobs/route.ts` 0→0; `app/api/jobs/[slug]/route.ts` 0→0; `src/shared/auth/with-public-db.ts` 2→2; `src/domains/job-board/public.service.ts` 0→0 |

Đo cùng grep **không scoped** (`git diff e0a70f7 -- .`) ra **12**, và tôi truy nguyên từng hit để
không ai phải đoán: cả 12 nằm trong văn bản `.md`, không một hit nào trong mã.

```
2  docs/PLANNER_HANDOVER.md
1  docs/tasks/hrp-v5-go-live-10-admin-ui-repair/TASK.md
1  docs/tasks/hrp-v5-hotfix-01-public-jobs-500/AUDIT.md
2  docs/tasks/hrp-v5-hotfix-01-public-jobs-500/HANDOFF.md
1  docs/tasks/hrp-v5-hotfix-01-public-jobs-500/TASK.md
5  docs/tasks/hrp-v5-hotfix-02-public-jobs-required-relation/TASK.md
0  src/domains/job-board/mp1.contract.test.ts
0  src/domains/job-board/public.service.ts
0  public/index.html
```

Năm hit lớn nhất nằm trong chính `TASK.md` của task này, vì `RQ-05` liệt kê đúng những từ khoá
đó. Các file `docs/**` xuất hiện ở đây là do diff tính từ `e0a70f7` trong khi HEAD là `9383003`
(commit docs của Tier 1) cộng ba file bẩn có trước.

### STEP-06 — phạm vi diff

```
git diff --stat e0a70f7 -- src/domains/job-board/
 src/domains/job-board/mp1.contract.test.ts | 29 +++++++++++++++--------------
 src/domains/job-board/public.service.ts    | 11 +++++------
 2 files changed, 20 insertions(+), 20 deletions(-)

git status --short -- src/domains/job-board/
 M src/domains/job-board/mp1.contract.test.ts
 M src/domains/job-board/public.service.ts
?? src/domains/job-board/public-select.static.test.ts
```

Ba file, tất cả dưới `src/domains/job-board/`, đúng ngưỡng `AC-07`. File thứ ba là test tĩnh mới
nên chưa xuất hiện trong `git diff` (untracked cho tới khi commit).

Các file bẩn khác trong worktree là của luồng khác, có trước khi tôi mở task: hai `AUDIT.md`,
`public/index.html`, và untracked `scratch/*`, `prisma/migrations/20260830214139_m14_rls_matrix_repair/`,
`scratch/seed-hrp-live-demo.sql`. Tôi **không dọn, không stage, không revert** chúng. `git add`
liệt kê tường minh từng path; không dùng `git add -A`, không dùng `git add .`.

## 3. Acceptance Evidence — phần tĩnh (viết TRƯỚC khi commit, theo `RQ-11`(a) và `AC-12`)

| AC | Lệnh / phép đo | Exit / kết quả | Kết luận |
|---|---|---|---|
| — | `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-v5-hotfix-02-public-jobs-required-relation\TASK.md` | `RESULT: PASS. TASK contract is ready for execution.` / `EXIT=0` | ĐẠT — dòng bắt buộc đầu bảng theo `HANDOFF.template.md` và `C-09` của Tier 3; contract `v1.1` hợp lệ |
| `AC-01` | `grep -cF 'clientCompany' src/domains/job-board/public.service.ts` | in `0`, `grep_exit=1` | ĐẠT — 0 trên **toàn file**, kể cả 4 dòng comment mới (chúng dùng `client_companies`, không phải literal `clientCompany`). Dùng `-F` để `.` không khớp oan |
| `AC-02` | `grep -nE 'inferIndustry\(searchableText' src/domains/job-board/public.service.ts` | `127:    industry: inferIndustry(searchableText, null),`; `count=1` | ĐẠT — đúng một dòng, đối số thứ hai là literal `null` |
| `AC-03` | Cùng một lệnh chạy hai lần quanh `STEP-01`/`STEP-02`: `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-select.static.test.ts` | RED `LASTEXITCODE=1`, `Tests 3 failed (3)`, `Start at 14:24:47`, kèm tên ba test fail; GREEN `LASTEXITCODE=0`, `Tests 3 passed (3)`, `Start at 14:27:18` | ĐẠT — cả hai output nguyên văn ở §2, không mock `findMany` (`DEC-06`). Tier 3 tái lập: `git stash push -- src/domains/job-board/public.service.ts` rồi chạy lại ⇒ phải ra 3 failed, `git stash pop` |
| `AC-04` | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/mp1.contract.test.ts`; rồi `grep -c 'Công nghiệp chế tạo'` và `grep -c "typeof result.jobs\[0\].industry"` trên file đó | exit `0`, `Tests 6 passed (6)`; chuỗi `Công nghiệp chế tạo` còn nguyên, hai assertion `typeof` còn nguyên | ĐẠT — không xoá case, không đổi tên case, không nới assertion |
| `AC-05` | `git diff e0a70f7 -- src/domains/job-board/ \| grep -cE 'CREATE POLICY\|GRANT\|REVOKE\|ALTER TABLE\|set_config'`; cùng grep trên file test mới; `git diff --name-only e0a70f7 -- prisma` | `0`; `0`; rỗng | ĐẠT — 0 câu SQL, 0 file dưới `prisma/` bị thêm hay sửa. Bản không scoped ra 12 hit và cả 12 nằm trong văn `.md` của luồng khác (bảng truy nguyên ở §2 STEP-05) |
| `AC-06` | `git show e0a70f7:<file>` vs worktree, `grep -oE '\btry\b\|\bcatch\b\|\.catch\('` rồi `wc -l`, trên 4 file `RQ-06` | 0→0, 0→0, 2→2, 0→0 | ĐẠT — không tăng ở file nào. `with-public-db.ts` và hai route **không bị chạm một byte** |
| `AC-07` | `git diff --stat e0a70f7 -- src/domains/job-board/` cộng `git status --short -- src/domains/job-board/` | 2 file M (20+/20−) cộng 1 file untracked mới = **3 file**, tất cả dưới `src/domains/job-board/` | ĐẠT — đúng ngưỡng "tối đa 3 file" |
| `AC-11` | `npm run typecheck` rồi `npm run test:unit`, `$LASTEXITCODE` đọc ngay sau mỗi lệnh, không pipe | `TYPECHECK_LASTEXITCODE=0`; `TESTUNIT_LASTEXITCODE=0`, `Tests 1421 passed (1421)`, `Test Files 93 passed (93)` | ĐẠT — cả hai exit 0, 1421 ≥ 1418 |

Bổ sung ngoài yêu cầu, cùng nguyên tắc đo: `npm run lint` → `LINT_LASTEXITCODE=0`, **0 error**
trên toàn repo.

Tám AC tĩnh đều ĐẠT ⇒ điều kiện `RQ-11`(a) và stop condition "bất kỳ AC tĩnh nào FAIL thì KHÔNG
được push" đã thoả. Phần dưới đây được viết SAU khi bảng trên đã nằm trong file.

## 4. STEP-07 — commit và push theo `RQ-11` (viết SAU bảng tĩnh ở §3)

Tôi chỉ mở bước này sau khi bảng `AC-01`…`AC-07` và `AC-11` ở §3 đã nằm trong file, đúng thứ tự
mà `AC-12` đòi. Tám AC tĩnh ĐẠT ⇒ `RQ-11`(a) thoả ⇒ được phép commit.

Stage tường minh ba path, không `git add -A`, không `git add .`:

```
git add src/domains/job-board/public.service.ts
git add src/domains/job-board/mp1.contract.test.ts
git add src/domains/job-board/public-select.static.test.ts

git diff --cached --name-only
 src/domains/job-board/mp1.contract.test.ts
 src/domains/job-board/public-select.static.test.ts
 src/domains/job-board/public.service.ts
```

Ba path staged **đúng bằng** tập ba file của `AC-07`, không thêm một path nào. Các file bẩn của
luồng khác vẫn nguyên trong worktree: không stage, không revert, không dọn.

Một commit duy nhất:

```
git log -1 --format='%H %ad %s' --date=iso HEAD
02489489ec705674c7457353cc2bab5c9d9b76fc 2026-08-31 14:51:48 +0700 fix(marketplace): stop public read from selecting a hidden required relation

git show --stat HEAD
 src/domains/job-board/mp1.contract.test.ts         | 29 +++++-----
 src/domains/job-board/public-select.static.test.ts | 67 ++++++++++++++++++++++
 src/domains/job-board/public.service.ts            | 11 ++--
 3 files changed, 87 insertions(+), 20 deletions(-)
```

Một push duy nhất, đúng nhánh `main`, không force, không rebase, không amend:

```
git push origin main
   2c7c158..0248948  main -> main

git log origin/main..HEAD --oneline
(rỗng)
git rev-list --count origin/main..HEAD
0
```

Reflog chứng minh không có thao tác lịch sử nào ngoài hai chữ `commit:` — không `amend`, không
`rebase`, không `reset` sau baseline:

```
git reflog -5
0248948 HEAD@{0}: commit: fix(marketplace): stop public read from selecting a hidden required relation
2c7c158 HEAD@{1}: commit: docs(planner): record Owner deploy authorization for hotfix-02 (v1.1)
9383003 HEAD@{2}: commit: docs(planner): open hotfix-02 for the real public-read P0
e0a70f7 HEAD@{3}: commit: fix(marketplace): stop public read from dereferencing a hidden relation
708506f HEAD@{4}: reset: moving to HEAD
```

Dải push theo dạng `RQ-11`(d) đòi: **`e0a70f7..0248948`**, gồm đúng ba commit —
`9383003` và `2c7c158` là docs của Tier 1 (đã có trên remote trước khi tôi push), `0248948` là
commit mã duy nhất của tôi. Dải mà lệnh push thật in ra là `2c7c158..0248948` vì đó là tip của
`origin/main` lúc push.

### Deployment đã đo

Push `main` là deploy production (Vercel Git integration, không có bước migration trong
`buildCommand`). Deployment trẻ nhất `Ready` sau khi push:

| Field | Value |
|---|---|
| Deployment id | `dpl_5u9vHWAv3dX4v9NLG5uMbHqkdJ8W` |
| URL | `https://hrpartner-luv1vc9fo-thuans-projects-0b7f4d74.vercel.app` |
| Status | `● Ready` |
| Target | `production` |
| Created | `Mon Aug 31 2026 14:54:11 GMT+0700` |
| Alias | `https://www.hrpartner.vn` |

Commit lúc `14:51:48 +07`, deployment tạo lúc `14:54:11 +07`, cách nhau 2 phút 23 giây và là
deployment production duy nhất sinh ra trong cửa sổ đó. Tôi quy nó cho push của mình bằng tương
quan thời gian; `vercel inspect` **không phơi field commit SHA** nào nên đây là mức chắc chắn cao
nhất tôi đo được, và tôi ghi rõ giới hạn đó thay vì tuyên bố mạnh hơn dữ liệu.

## 5. Phép đo live SAU deploy — cùng ba URL đã đo ở STEP-00

Cùng lệnh, cùng URL, khác đúng một điều: mã production. Baseline đo lúc `07:22:55Z` ở STEP-00 là
`http=500 bytes=0` cả ba đường.

```
=== AC-08: /api/jobs ===              http=200 bytes=1785
HTTP/1.1 200 OK
Content-Type: application/json
X-Vercel-Cache: MISS
{"jobs":[{"id":"c22a0e43-fa05-4e04-8450-28436697fb04","slug":"DA-DEMO-003","title":"DEMO Lắp đặt
điện Yên Phong 3","position":"Thợ điện","shift":"07:00-16:00","location":"KCN Yên Phong, …

=== AC-08b: /api/jobs?limit=1 ===     http=200 bytes=403
=== AC-09: /api/jobs/DA-DEMO-001 ===  http=200 bytes=372
{"job":{"id":"demo-prj-kb-001","slug":"DA-DEMO-001", … ,"industry":"Điện tử",
"shiftType":"ca_ngay","jobType":"toan_thoi_gian","availableSlots": …

CURL_EXIT=0
measured_at_utc=2026-08-31T08:05:56Z   (15:05:56 +07)
```

`X-Vercel-Cache: MISS` là bằng chứng 200 đến từ hàm chạy thật, không từ edge cache còn sót.

Phần `total` của `AC-08` đòi kiểu số, nên tôi parse thân JSON chứ không mắt thường:

```
curl -s https://www.hrpartner.vn/api/jobs | node -e "…JSON.parse(stdin)…"
typeof total = number | total = 5 | nextOffset = null | jobs.length = 5
slugs = DA-DEMO-003, DA-DEMO-001, DA-DEMO-002, DA-2026-022, DA-2026-018
industry = Điện tử | Điện tử | Kho vận | Kho vận | Điện tử
JSON_PARSE_EXIT=0
```

`total = 5` (kiểu `number`), không phải `0` ⇒ `RISK-06` **không** áp dụng, và cũng chứng minh
`hrp_project_visible_for` đang trả dòng cho principal `MKT` sau go-live-04.

Trường `industry` trên dữ liệu thật khớp đúng cơ chế mới: `Điện tử` cho ba dự án có `dien` trong
text, `Kho vận` cho hai dự án kho. Không dòng nào rơi vào fallback `Công nghiệp chế tạo`, tức
đường suy từ text đủ dùng trên dữ liệu hiện có — không phải suy đoán, mà là năm giá trị đo được.

**Quan sát cho Tier 1, không phải việc của task này:** trong 5 slug công khai có hai slug
**không** mang tiền tố DEMO — `DA-2026-022` và `DA-2026-018`. Task này không được sửa dữ liệu
(`is_public`) nên tôi chỉ ghi lại; đây là dữ kiện cho quyết định công bố link của Owner.

## 6. STEP-08 — log runtime của deployment, `AC-10`

Trước khi dán bất cứ dòng log nào vào file này, tôi chạy đúng phép lọc secret mà `STEP-08` bắt
buộc, trên chính file log đã fetch:

```
pattern='postgres://' count=0
pattern='token'       count=0
pattern='password'    count=0
pattern='secret'      count=0
```

Bốn pattern đều 0 ⇒ log không chứa connection string, token, password hay secret nào, nên phần
trích dưới đây an toàn để lưu. Tôi vẫn tự che project id thành `prj_<redacted>` vì nó là định danh
nội bộ và không phải bằng chứng của AC nào.

Sinh traffic thật vào đúng đường công khai, có tham số phá cache để không bị edge trả lại:

```
call#1 /api/jobs?limit=3&_cb=step08-1 -> http=200
call#2 /api/jobs?limit=3&_cb=step08-2 -> http=200
call#3 /api/jobs?limit=3&_cb=step08-3 -> http=200
call#4 /api/jobs/DA-DEMO-001?_cb=step08 -> http=200
CURL_EXIT=0
traffic_at_utc=2026-08-31T08:12:21Z   (15:12:21 +07)
```

Rồi fetch log của deployment và đếm:

```
vercel logs https://hrpartner-luv1vc9fo-thuans-projects-0b7f4d74.vercel.app
VERCEL_LOGS2_LASTEXITCODE=0

Vercel CLI 59.10.0 (Node.js 24.19.0)
Resolving deployment "hrpartner-luv1vc9fo-thuans-projects-0b7f4d74.vercel.app"
Fetching project "prj_<redacted>"
Fetching logs...
TIME         HOST                 LEVEL
15:12:15.91  www.hrpartner.vn     info   ε GET /api/jobs/DA-DEMO-001
15:12:13.02  www.hrpartner.vn     info   ε GET /api/jobs
15:12:10.11  www.hrpartner.vn     info   ε GET /api/jobs
15:12:04.07  www.hrpartner.vn     info   ε GET /api/jobs
15:08:16.68  www.hrpartner.vn     info   λ GET /api/jobs
15:05:50.48  www.hrpartner.vn     info   ε GET /api/jobs/DA-DEMO-001
15:05:47.54  www.hrpartner.vn     info   λ GET /api/jobs
15:05:40.10  www.hrpartner.vn     info   ε GET /api/jobs
14:56:43.48  www.hrpartner.vn     info   ε GET /api/jobs
Fetched 18 logs for thuans-projects-0b7f4d74/hrpartner-vn
```

Trích ở trên đã bỏ 9 dòng không thuộc đường job (`/`, `/login`, `/worker`, `/api/me`,
`/ve-chung-toi`, `/ctv-portal`, `/api/public/applications/…`); cả 9 dòng đó cũng `LEVEL info`.
Cửa sổ log là `14:56:03` → `15:12:15 +07`, tức phủ **cả** ba phép đo `AC-08`/`AC-09` lúc `15:05`
và bốn call phá cache lúc `15:12`, cộng lần gọi đầu tiên ngay sau deploy lúc `14:56:43`.

Đếm trên toàn file log, không chỉ phần trích:

| Chuỗi đếm | Số lần |
|---|---|
| `Inconsistent query result` | **0** |
| `PrismaClientUnknownRequestError` | 0 |
| `is required to return data` | 0 |
| `clientCompany` | 0 |
| `error` / `ERROR` | 0 / 0 |
| `500` | 0 |

`grep -cF 'Inconsistent query result'` in `0` và `grep_exit=1` (grep exit 1 = không tìm thấy, đúng
kết quả mong đợi). Mọi dòng trong 18 log đều `LEVEL info`; không một dòng `error` nào.

## 7. Acceptance Evidence — phần live (`AC-08` tới `AC-10`, `AC-12`)

| AC | Lệnh / phép đo | Exit / kết quả | Kết luận |
|---|---|---|---|
| `AC-08` | `curl -s -o body -w '%{http_code} %{size_download}'` trên `/api/jobs` và `/api/jobs?limit=1`; rồi parse thân JSON bằng `node` đọc stdin | `http=200 bytes=1785` và `http=200 bytes=403`; `typeof total = number`, `total = 5`, `jobs.length = 5`; `X-Vercel-Cache: MISS` | ĐẠT — 200 trên cả hai, `total` kiểu số. `total = 5 ≠ 0` nên `RISK-06` không áp dụng |
| `AC-09` | cùng lệnh trên `/api/jobs/DA-DEMO-001` | `http=200 bytes=372`, thân có `"slug":"DA-DEMO-001"`, `"industry":"Điện tử"` | ĐẠT — 200 nằm trong tập {200, 404} mà AC cho phép, và là nhánh tốt hơn: bản ghi đọc được thật |
| `AC-10` | `vercel logs <deployment-url>` sau khi sinh 4 request phá cache, rồi `grep -cF 'Inconsistent query result'` | `VERCEL_LOGS2_LASTEXITCODE=0`; đếm `0`; 18/18 dòng `LEVEL info` | ĐẠT — **0** lần xuất hiện, cửa sổ log phủ đúng các request vừa gọi |
| `AC-12` | `git diff --cached --name-only` trước commit; `git show --stat HEAD`; `git log origin/main..HEAD`; `git rev-list --count origin/main..HEAD`; `git reflog -5`; thứ tự viết file | tập staged ≡ 3 file của `AC-07`; commit `0248948` 3 file 87+/20−; `git log origin/main..HEAD` rỗng, count `0`; reflog chỉ có `commit:`; bảng tĩnh §3 nằm TRƯỚC §4 trong cùng file | ĐẠT — một commit, một push, không force/amend/rebase, và không AC tĩnh nào FAIL trước lúc push |

Bốn AC live ĐẠT. Cộng tám AC tĩnh ở §3 ⇒ **12/12 AC ĐẠT**. Tôi không tuyên bố verdict; đó là việc
của Tier 3.

Stop condition số 1 của `TASK.md` ("nếu sau deploy vẫn 500 thì `DEC-01` sai") **không** kích hoạt:
ba đường đo được 200. Không stop condition nào khác kích hoạt — không cần schema/migration/GRANT/
RLS, không có exception khác trên cùng đường, không có test nào fail ngoài `src/domains/job-board/`,
và không cần push lần hai.

## 8. Changed Deliverables

| # | File | Loại | Nội dung |
|---|---|---|---|
| 1 | `src/domains/job-board/public.service.ts` | M | Bỏ khoá `clientCompany` khỏi `publicSelect` (`RQ-01`); bỏ field đó khỏi kiểu tham số `toDto` cùng ba dòng comment nullable của hotfix-01 (`DEC-04`); điểm gọi thành `inferIndustry(searchableText, null)` (`DEC-03`); thêm 4 dòng comment nêu lý do tầng engine. Net 11 dòng đổi |
| 2 | `src/domains/job-board/mp1.contract.test.ts` | M | Fixture `publicProjectionTx` nhận `projectName` thay vì `clientCompany`, mock bỏ field quan hệ; hai case hotfix-01 giữ **nguyên tên và nguyên assertion**; bỏ field quan hệ chết khỏi fixture inline của case cũ (`DEV-01`) |
| 3 | `src/domains/job-board/public-select.static.test.ts` | A | Hàng rào hồi quy tĩnh `RQ-03`: đọc chính cây nguồn, allowlist khoá mức ngoài cùng của `publicSelect`, chặn mọi lần select lại quan hệ bắt buộc trên bảng bị RLS che |

Ngoài ba file trên: **0** file dưới `prisma/`, **0** câu SQL, **0** dependency mới, **0** biến môi
trường, **0** byte thay đổi ở `src/shared/auth/with-public-db.ts` và hai route handler.

## 9. Deviations & Limitations

Bảng tổng theo `HANDOFF.template.md`; diễn giải đầy đủ ngay dưới. **Không có `BLK`** — không blocker
nào phát sinh, task không dừng ở đâu.

| ID | Type | Evidence | Impact | Cần Planner quyết |
|---|---|---|---|---|
| `DEV-01` | Deviation | `mp1.contract.test.ts` case `projects only public open jobs…` bỏ field `clientCompany: { industry: null }`; case vẫn PASS, `industry: 'Kho vận'` từ keyword `warehouse` | Xoá mock mô tả hình dạng dòng không còn tồn tại (blind spot `EV-10`) | Không — nằm trong file `RQ-10` cho phép, 0 assertion bị đổi |
| `LIM-01` | Limitation | `industry` chỉ còn suy từ text, fallback `Công nghiệp chế tạo`; 5/5 dòng live khớp keyword (§5) | Nhãn ngành không phải ngành thật của khách hàng | Có — nếu cần ngành theo hồ sơ khách thì mở task RPC hoặc scalar phi quan hệ |
| `LIM-02` | Limitation | Tên case `still uses the client company industry when the relation is readable` nói về cơ chế đã biến mất | Tên gây hiểu sai cho người đọc test sau này | Có — đổi tên trong task dọn dẹp; `STEP-04` cấm tôi đổi |
| `LIM-03` | Limitation | `buildCommand` không chạy migration; task không có quyền chạm DB | Ba migration chờ trong repo vẫn chưa áp trên `hrp-live` | Có — đúng `RISK-05`, thuộc task khác |
| `LIM-04` | Limitation | Hàng rào tĩnh chỉ đọc `public.service.ts` | Các `select` khác còn có thể kéo quan hệ bắt buộc trên bảng bị RLS che | Có — chính là `Q-02` còn MỞ và `RISK-02` |
| `LIM-05` | Limitation | `vercel inspect` không phơi commit SHA; quy deployment bằng tương quan 2 phút 23 giây (§4) | Liên kết commit ⇄ deployment là suy luận thời gian, không phải liên kết cứng | Không — chấp nhận được, đã ghi rõ mức chắc chắn |

**`DEV-01` — dọn field quan hệ chết trong fixture inline của case cũ.** `STEP-04` chỉ nói tới hai
case của hotfix-01, nhưng case `projects only public open jobs and excludes internal fields` cũng
mock `clientCompany: { industry: null }`, tức mô tả một hình dạng dòng mà `publicSelect` sau
hotfix-02 không còn trả. Đây đúng là blind spot `EV-10` đã chỉ ra. Tôi bỏ field đó; case vẫn PASS
vì `industry: 'Kho vận'` đến từ keyword `warehouse` trong text. Nằm trong file mà `RQ-10` cho phép
sửa, không mở scope. Bound: 0 assertion bị đổi, 0 case bị xoá hay đổi tên.

**`LIM-01` — `industry` giờ chỉ suy từ text, theo `DEC-09`.** Trước hotfix-02, ngành có thể lấy từ
`client_companies.industry` khi principal đọc được bảng đó; nay nguồn duy nhất là keyword trong
text dự án, fallback `'Công nghiệp chế tạo'`. Trên dữ liệu production hiện tại, cả 5 dòng đều khớp
keyword nên không dòng nào rơi vào fallback (§5). Nếu Owner muốn ngành đúng theo hồ sơ khách hàng
thì cần đường khác — RPC `SECURITY DEFINER` hoặc một scalar phi quan hệ trên `Project` — và đó là
task mới, không phải hotfix này.

**`LIM-02` — tên case thứ hai nói về một cơ chế không còn.** `still uses the client company
industry when the relation is readable` giờ khẳng định `'Điện tử'` đến từ keyword, không từ bảng
khách hàng. `STEP-04` cấm đổi tên case nên tôi giữ nguyên và ghi lại đây. Đề xuất cho Tier 1: đổi
tên trong một task dọn dẹp riêng.

**`LIM-03` — ba migration đang chờ trong repo KHÔNG được áp.** Đúng `RISK-05`: `buildCommand` của
Vercel không chạy migration, và task này không có quyền chạm DB. Push của tôi vì thế không đổi một
byte schema nào trên `hrp-live`.

**`LIM-04` — hàng rào tĩnh chỉ canh `public.service.ts`.** Nó không quét các `select` khác trong
repo còn kéo quan hệ bắt buộc trên bảng bị RLS che. Đó chính là `Q-02` còn MỞ và `RISK-02`; cần một
task sweep riêng.

**`LIM-05` — quy deployment cho commit bằng tương quan thời gian.** `vercel inspect` không phơi
commit SHA nên tôi không có liên kết cứng commit ⇄ deployment; bằng chứng là khoảng cách 2 phút 23
giây và tính duy nhất của deployment production trong cửa sổ đó (§4).

## 10. Evidence Index — đường tái lập cho Tier 3

| Bằng chứng | Ở đâu | Cách Tier 3 chạy lại độc lập |
|---|---|---|
| Gate contract | §0 | `verify-task.ps1 -TaskPath docs\tasks\hrp-v5-hotfix-02-public-jobs-required-relation\TASK.md` ⇒ exit 0 |
| 500 ở baseline | §2 STEP-00 | Không tái lập được nữa (production đã sửa). Đường thay thế: `git stash` bản fix rồi chạy trên local với DB có RLS, hoặc đối chiếu `EV-03` của hotfix-01 |
| RED không mock | §2 STEP-03, `AC-03` | `git stash push -- src/domains/job-board/public.service.ts`; `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-select.static.test.ts` ⇒ phải ra `Tests 3 failed (3)`, exit 1; `git stash pop` |
| GREEN | §2 STEP-04 | cùng lệnh trên cây hiện tại ⇒ `Tests 3 passed (3)`, exit 0 |
| Gate tĩnh | §2 STEP-05, `AC-11` | `npm run typecheck`; `npm run test:unit` (đọc `$LASTEXITCODE` ngay sau, không pipe) ⇒ 0 và 0, `Tests 1421 passed (1421)` |
| Gate cấm SQL | §2 STEP-05, `AC-05` | `git diff e0a70f7 -- src/domains/job-board/ \| grep -cE 'CREATE POLICY\|GRANT\|REVOKE\|ALTER TABLE\|set_config'` ⇒ `0`; `git diff --name-only e0a70f7 -- prisma` ⇒ rỗng |
| Không thêm try/catch | §2 STEP-05, `AC-06` | `git show e0a70f7:<file>` vs worktree trên 4 file `RQ-06`, đếm `\btry\b|\bcatch\b|\.catch\(` ⇒ 0→0, 0→0, 2→2, 0→0 |
| Phạm vi diff | §2 STEP-06, `AC-07` | `git show --stat 0248948` ⇒ đúng 3 file, tất cả dưới `src/domains/job-board/` |
| Commit + push | §4, `AC-12` | `git show --stat 0248948`; `git rev-list --count origin/main..0248948` ⇒ `0`; `git reflog` ⇒ chỉ `commit:` |
| 200 live | §5, `AC-08`/`AC-09` | `curl -s -o /dev/null -w '%{http_code}' https://www.hrpartner.vn/api/jobs` (và `?limit=1`, và `/api/jobs/DA-DEMO-001`) ⇒ 200; parse `total` bằng `node` đọc stdin ⇒ `number` |
| Log sạch | §6, `AC-10` | `vercel logs https://hrpartner-luv1vc9fo-thuans-projects-0b7f4d74.vercel.app` rồi `grep -cF 'Inconsistent query result'` ⇒ `0` |

Hai file log đã fetch nằm ngoài repo (`%TEMP%\hrp-hotfix02-vercel-logs.txt` và `…-logs-2.txt`) nên
worktree không bẩn thêm; nội dung đã lọc 4 pattern secret, cả 4 đếm 0.

## 11. Round History

| Round | Loại | Kết quả |
|---|---|---|
| Execution 1 | `CODE` | Hoàn tất `STEP-00` → `STEP-08`. Contract đọc lại ở `STEP-00` và phát hiện đã bump `v1.0` → `v1.1` (thêm `DEC-10`, `RQ-11`, `AC-12`), nên tôi thi hành theo `v1.1`. 12/12 AC ĐẠT theo phép đo của tôi. Một commit `0248948`, một push `e0a70f7..0248948`, deploy production đo được 200 |
| Audit 0 | — | Chưa có. Bàn giao cho Tier 3 |

Việc còn để lại cho Tier 1 quyết định, tôi **không** tự làm: `Q-02` (sweep các `select` khác còn
kéo quan hệ bắt buộc trên bảng bị RLS che — `LIM-04`), đổi tên case ở `LIM-02`, hai slug công khai
không mang tiền tố DEMO ở §5, và nguồn `industry` dài hạn ở `LIM-01`.

> Handoff status: READY_FOR_AUDIT
