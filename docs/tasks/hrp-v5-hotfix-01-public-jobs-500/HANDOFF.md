# HANDOFF: hrp-v5-hotfix-01-public-jobs-500

> **Deploy production là hành động của Owner.** Round này KHÔNG commit, KHÔNG push, KHÔNG deploy
> (`AC-08`, `RISK-07`, `UNIFIED_PLAN` 9.1). Tại thời điểm viết dòng này `/api/jobs` trên
> production VẪN 500, vì bản sửa còn nằm trong worktree. Nó chỉ hết 500 sau khi Owner push.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-hotfix-01-public-jobs-500` |
| Work type | `CODE` |
| Audit mode | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Current audit round | `0` |
| Baseline | `d4928af`. HEAD lúc thực thi là `708506f` nhưng đó là commit docs-only của Tier 1: `git diff --name-only d4928af..HEAD -- src app prisma package.json vitest.unit.config.ts` trả RỖNG ⇒ mã nguồn tại HEAD trùng baseline từng byte |
| Executor | `Tier 2` |
| Status | `READY_FOR_AUDIT` |
| Gate | `verify-task.ps1` exit 0 (`RESULT: PASS. TASK contract is ready for execution.`) |
| Started/updated | 2026-08-31, Asia/Bangkok |

## 1. Outcome Summary

Nguyên nhân của 500 đúng như `EV-02`..`EV-08` mô tả và tôi đã **tái lập được nó ngay trên máy
local, ở lane unit, trước khi sửa một dòng nào** của service: với `clientCompany: null`,
`listPublicJobProjection` ném `TypeError: Cannot read properties of null (reading 'industry')`
tại `public.service.ts:128:67`. Đó là bằng chứng RED mà `AC-03` đòi, và nó là cùng một exception
đang làm route trả 500 body rỗng trên production.

Fix gồm đúng hai thay đổi trong `toDto`, cộng lại 7 dòng diff:

- kiểu tham số `clientCompany` khai nullable (`RQ-02`) — đây là phần khiến `tsc` từ nay bắt được
  lớp lỗi này, không chỉ là phần làm hết crash;
- biểu thức deref thành `project.clientCompany?.industry ?? null` (`RQ-01`, `DEC-03`).

`publicSelect` giữ nguyên join (`DEC-01`), không thêm `try/catch` (`DEC-04`), không một câu SQL
nào, không đổi một field nào của `PublicJobDto`. Vì `getPublicJobProjection` dùng cùng `toDto`
(`EV-13`), một chỗ sửa đóng cả hai endpoint.

Số đo cuối: `npm run typecheck` exit **0**, `npm run test:unit` exit **0** với **1418 test
passed / 92 file** (baseline 1416, không giảm), `npm run lint` exit **0** với **0 error**. Diff
trong phạm vi task đúng **2 file**, 49 thêm / 2 xoá, cả hai dưới `src/domains/job-board/`.

## 2. Execution Trace

### STEP-01 — định vị (không sửa gì)

Đọc `src/domains/job-board/public.service.ts` toàn bộ 210 dòng ở baseline. Ba vị trí liên quan,
số dòng THẬT ở baseline `d4928af`:

| Vai trò | Baseline | Sau sửa | Ghi chú |
|---|---|---|---|
| Kiểu tham số `clientCompany` của `toDto` | `:91` `clientCompany: { industry: string \| null };` | `:94` | đối tượng khai non-null ⇒ `EV-08` |
| Biểu thức deref | `:128` `industry: inferIndustry(searchableText, project.clientCompany.industry),` | `:131` | chỗ ném exception |
| Join trong `publicSelect` | `:142` `clientCompany: { select: { industry: true } },` | `:145` | **KHÔNG chạm** (`DEC-01`, 4.2) |

### STEP-02 — RED trước, đo trên mã service NGUYÊN BẢN

Thêm fixture `publicProjectionTx` (`mp1.contract.test.ts:34-50`) và một case duy nhất
(`:116-128`) rồi chạy lane unit **trước khi** sửa service:

```
npm run test:unit > $env:TEMP\hrp-hotfix01-step02-red.txt
LASTEXITCODE=1
```

Output thật (trích nguyên văn khối Failed Tests):

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/domains/job-board/mp1.contract.test.ts > MP-1 publish and public job contracts >
        projects a public job when the client company relation is hidden by RLS
TypeError: Cannot read properties of null (reading 'industry')
 ❯ toDto src/domains/job-board/public.service.ts:128:67
    128|     industry: inferIndustry(searchableText, project.clientCompany.indu…
       |                                                                   ^
 ❯ Module.listPublicJobProjection src/domains/job-board/public.service.ts:197:6
 ❯ src/domains/job-board/mp1.contract.test.ts:123:20

 Test Files  1 failed | 91 passed (92)
      Tests  1 failed | 1416 passed (1417)
   Start at  12:25:11
```

Hai điều đáng chú ý cho `RISK-04`: cột `:128:67` trỏ đúng ký tự deref mà `EV-02` chỉ ra, và mốc
`Start at 12:25:11` nằm TRƯỚC mốc của lần chạy GREEN (`12:26:15`) và lần chạy gate (`12:27:06`) —
thứ tự thời gian chứng minh test được viết trước bản sửa, không phải sau.

### STEP-03 — sửa `toDto`

Diff nguyên văn của service (`git diff -- src/domains/job-board/public.service.ts`):

```diff
@@ -88,7 +88,10 @@ function toDto(project: {
   siteAddress: string | null;
-  clientCompany: { industry: string | null };
+  // Quan hệ bắt buộc ở mức kiểu Prisma, nhưng dưới FORCE RLS thì principal công khai `MKT`
+  // không đọc được `client_companies` nên Prisma trả `null` lúc runtime. Kiểu phải nói thật,
+  // nếu không `tsc` sẽ tiếp tục xanh trong khi đường đọc công khai ném TypeError.
+  clientCompany: { industry: string | null } | null;
@@ -125,7 +128,7 @@ function toDto(project: {
     location: first.workLocation ?? project.siteAddress,
-    industry: inferIndustry(searchableText, project.clientCompany.industry),
+    industry: inferIndustry(searchableText, project.clientCompany?.industry ?? null),
```

`?? null` là bắt buộc chứ không phải trang trí: `?.` một mình trả `undefined`, còn tham số thứ
hai của `inferIndustry` khai `string | null` (`public.service.ts:73`), nên bỏ `?? null` thì
`tsc` FAIL. Đây đúng là đường `DEC-03` chỉ định và là đường `inferIndustry` đã xử lý sẵn
(`:74` `${text} ${fallback ?? ''}`, `:79` `fallback?.trim() || 'Công nghiệp chế tạo'`).

### STEP-04 — GREEN, hai case

Thêm case nhánh đọc được (`mp1.contract.test.ts:130-140`) rồi chạy lại:

```
npm run test:unit > $env:TEMP\hrp-hotfix01-step04-green.txt
LASTEXITCODE=0
 ✓ src/domains/job-board/mp1.contract.test.ts (6 tests) 8ms
 Test Files  92 passed (92)
      Tests  1418 passed (1418)
```

Hai case và giá trị chúng khẳng định:

| Case | `clientCompany` | `industry` trả về | Ý nghĩa |
|---|---|---|---|
| `...when the client company relation is hidden by RLS` | `null` | `'Công nghiệp chế tạo'` | trạng thái production hôm nay; `typeof === 'string'`, không exception |
| `...when the relation is readable` | `{ industry: 'Điện tử' }` | `'Điện tử'` | mọi principal nội bộ; fix không làm mất ngành khai báo (`DEC-06`) |

Hai case dùng CÙNG fixture `publicProjectionTx`, khác đúng một tham số — nên nếu ai sửa fix theo
kiểu hardcode một chuỗi hằng thì case thứ hai đổ ngay.

### STEP-05 — gate tĩnh, exit code đo KHÔNG qua pipe

Một lệnh PowerShell, hai câu lệnh, `$LASTEXITCODE` đọc ngay sau mỗi câu. Không có `|` ở giữa
lệnh và chỗ đọc exit code (`RISK-06`); `>` là redirect ra file tạm ngoài repo, không phải pipe,
nên `$LASTEXITCODE` vẫn là của `npm`:

```
> hrp@0.1.0 typecheck
> tsc --noEmit

TYPECHECK_LASTEXITCODE=0
...
TESTUNIT_LASTEXITCODE=0
 Test Files  92 passed (92)
      Tests  1418 passed (1418)
   Start at  12:27:06
   Duration  19.43s
```

Lane dùng đúng `npm run test:unit` = `vitest run --config vitest.unit.config.ts`, KHÔNG phải
`npx vitest run` trần (`RISK-05`). Tổng test 1418 ≥ 1416 ⇒ không có file nào bị loại khỏi lane;
chênh +2 đúng bằng hai case mới, `mp1.contract.test.ts` từ 4 lên 6 test.

Bổ sung ngoài yêu cầu, cùng nguyên tắc đo: `npm run lint` → `LINT_LASTEXITCODE=0`, **0 error**
trên toàn repo.

### STEP-06 — phạm vi worktree

```
git diff --stat -- src/domains/job-board/
 src/domains/job-board/mp1.contract.test.ts | 44 ++++++++++++++++++++++++++++++
 src/domains/job-board/public.service.ts    |  7 +++--
 2 files changed, 49 insertions(+), 2 deletions(-)
```

`git status --short` (rút gọn phần `??`, đầy đủ phần `M`):

```
 M docs/tasks/hrp-v5-go-live-02-public-surface-exposure/AUDIT.md
 M docs/tasks/hrp-v5-go-live-04-public-read-rls-closure/AUDIT.md
 M public/index.html
 M src/domains/job-board/mp1.contract.test.ts
 M src/domains/job-board/public.service.ts
?? 30 đường untracked của luồng khác (.claude/, .neon, docs/aff_plan*.md, rls-probe-*.txt,
   scratch/*, scripts/debug-parser.mjs) — không phải của task này, không chạm
```

Ba dòng `M` đầu là file dirty CÓ TRƯỚC khi tôi mở task, đúng tên §4.2 liệt kê dưới "Cấm chạm".
Bằng chứng chúng có trước: `git status --short` tôi chạy ở preflight — TRƯỚC lệnh Edit đầu tiên —
đã in đúng ba dòng đó. Kích thước diff của chúng: `1 0` và `1 0` cho hai `AUDIT.md` (một dòng
trắng cuối file), `97 59` cho `public/index.html` (artifact `copy-static.mjs` của go-live-02).
Theo `RISK-08` và `STEP-06` tôi **không dọn, không stage, không revert** chúng; chỉ báo.

## 3. Acceptance Evidence

| AC | Lệnh / phép đo | Exit / kết quả | Kết luận |
|---|---|---|---|
| `AC-01` | `grep -nF 'project.clientCompany.industry' src/domains/job-board/public.service.ts` | exit `1`, `grep -cF` in `0` | ĐẠT — 0 dòng. Dùng `-F` (literal) để `.` không bị coi là ký tự đại diện khớp oan `?.` |
| `AC-02` | Đọc chữ ký `toDto`, `public.service.ts:94` | `clientCompany: { industry: string \| null } \| null;` | ĐẠT — có cả `industry: string \| null` bên trong và `\| null` ở mức object |
| `AC-03` | Hai lần chạy `npm run test:unit` tách biệt: STEP-02 và STEP-04 | RED `LASTEXITCODE=1`, 1 failed / 1416 passed, đúng tên test `projects a public job when the client company relation is hidden by RLS`; GREEN `LASTEXITCODE=0`, 1418 passed | ĐẠT — RED trước GREEN, mốc `Start at` 12:25:11 < 12:26:15. Tier 3 tái lập: `git stash push -- src/domains/job-board/public.service.ts` → `npm run test:unit` → 1 failed → `git stash pop` |
| `AC-04` | `npm run typecheck` rồi `npm run test:unit`, `$LASTEXITCODE` đọc ngay sau mỗi lệnh, không pipe | `TYPECHECK_LASTEXITCODE=0`; `TESTUNIT_LASTEXITCODE=0`, `Tests 1418 passed (1418)` | ĐẠT — 1418 ≥ 1416 |
| `AC-05` | Assertion trong case `clientCompany: null`: `expect(typeof result.jobs[0].industry).toBe('string')` cộng `expect(result.jobs[0].industry).toBe('Công nghiệp chế tạo')`, và bản thân việc `await` resolve thay vì reject | PASS trong lần chạy GREEN | ĐẠT — trả `industry` là `string` non-null, không ném exception. Xem `LIM-02` về giới hạn của phép đo này so với production |
| `AC-06` | `git diff --stat -- src/domains/job-board/` | 2 file, 49 thêm / 2 xoá | ĐẠT trong phạm vi task. `git diff --stat` không lọc in ra 5 file; 3 file thêm là dirty của luồng khác, có trước task, §4.2 cấm chạm — xem `LIM-01` |
| `AC-07` | `git diff \| grep -cE 'CREATE POLICY\|GRANT\|ALTER TABLE\|set_config'`; và `git diff --name-only -- src/shared/auth app prisma` | `0`; rỗng | ĐẠT — không SQL, không đổi quyền, không chạm `with-public-db.ts`, route, schema hay migration |
| `AC-08` | `git log origin/main..HEAD --oneline`; `git rev-list --count origin/main..HEAD` | rỗng; `0` | ĐẠT — không commit, không push, không deploy. Deploy production là hành động của Owner |

## 4. Changed Deliverables

| File | Thay đổi | Dòng |
|---|---|---|
| `src/domains/job-board/public.service.ts` | Kiểu tham số `clientCompany` của `toDto` thành nullable; deref thành optional-chaining với fallback `null`; 3 dòng comment nêu lý do RLS để không ai hoàn nguyên kiểu | `:91→:94` (kiểu), `:128→:131` (biểu thức). +5 / −2 |
| `src/domains/job-board/mp1.contract.test.ts` | Fixture `publicProjectionTx(clientCompany)` và hai case cho hai trạng thái dữ liệu | `:34-50` fixture, `:116-128` case RLS che, `:130-140` case đọc được. +44 / −0 |

Không tạo file mới, không xoá file, không thêm dependency, không đổi config lane test.

## 5. Deviations / Limitations / Blockers

| ID | Loại | Nội dung |
|---|---|---|
| `DEV-00` | Deviation | **Không có.** Không lệch một điều khoản nào của contract: không `try/catch` (`DEC-04`), không chạm `publicSelect` (`DEC-01`), không migration/GRANT (`DEC-02`), fallback đúng `null` (`DEC-03`), test đúng hai case (`DEC-06`), file test nằm trong lane unit hiện có nên không phải sửa `vitest.unit.config.ts` |
| `LIM-01` | Limitation | `git diff --stat` không lọc in **5** file, không phải 2. `STEP-06` viết "Nếu có file thứ ba thì dừng", nhưng ba file thừa chính là ba file mà §4.2 đã liệt kê đích danh dưới "Cấm chạm" và `RISK-08` cấm dọn — hai điều khoản này không thể cùng đúng theo nghĩa chữ. Tôi chọn cách không phá gì: **không dọn, không stage**, và chứng minh chúng không phải của tôi bằng `git status --short` chạy ở preflight trước lệnh Edit đầu tiên (in đúng ba dòng đó). Phép đo của tôi cho `AC-06` là diff scoped `-- src/domains/job-board/` = đúng 2 file. Tier 3 quyết định cách đọc `AC-06` |
| `LIM-02` | Limitation | Tôi **không chứng minh được production trả 200**, và không thể: bản sửa còn trong worktree, deploy là hành động của Owner (`AC-08`). Vì vậy `DEC-05` ("không có nguyên nhân thứ hai cho 500") vẫn là ASSUMPTION sau round này. Phép đo dứt điểm là: Owner push → `curl -s -o /dev/null -w "%{http_code}" https://www.hrpartner.vn/api/jobs` phải ra `200`, và `/api/jobs/DA-DEMO-001` ra `200`. Nếu còn 500 thì `DEC-05` SAI và cần round mới với log Vercel, không sửa mò tiếp — đúng như `DEC-05` đã dặn |
| `LIM-03` | Limitation | Sau hotfix, `industry` của một dự án mà quan hệ bị che là giá trị **suy ra từ văn bản**. Với fixture của test (không chứa từ khoá ngành nào) nó rơi về mặc định `'Công nghiệp chế tạo'`. Trên production, dự án nào có tên/mô tả không chứa từ khoá cũng sẽ hiện đúng chuỗi mặc định đó — dịch vụ đã khôi phục nhưng facet ngành **không chính xác**. Đây là phạm vi `Q-01`, không phải defect của round này |
| `LIM-04` | Limitation | Fixture mới thêm **một** cảnh báo `@typescript-eslint/no-explicit-any` (`mp1.contract.test.ts:49`), cùng loại với hai cảnh báo đã có sẵn trong chính file đó (`:31` của `publishTx`, `:97` của case projection cũ) — dựng đủ kiểu `Prisma.TransactionClient` cho một mock là không thực tế. `npm run lint` vẫn exit `0`, **0 error** |
| `BLK-00` | Blocker | **Không có.** Không AC nào `ENV_BLOCKED`: task này không cần DB thật, đúng như §9 Tier 1 xác nhận |
| `FUP-01` | Follow-up cho `Q-02` | Tôi đã đo giúp Tier 1 phần dữ liệu của câu hỏi: `grep -rn 'clientCompany\.' src app --include=*.ts --include=*.tsx` (bỏ file test) chỉ ra **4** vị trí, tất cả là `tx.clientCompany.findMany/count/create/update` trong `app/api/clients/route.ts` và `app/api/clients/[id]/route.ts` — đó là accessor model của Prisma client, KHÔNG phải deref quan hệ, và không nằm trên đường đọc công khai. Nghĩa là sau fix này **không còn** trường hợp cùng lớp lỗi đang mở trong repo. Nhưng `EV-08` vẫn đúng: `tsc` không bao giờ bắt được lớp lỗi này, nên join MỚI nào trên `withPublicDb` cũng có thể lặp lại sự cố 31/08. Một gate tự động (test kiến trúc hoặc lint rule) là việc thật, thuộc task khác |

## 6. Evidence Index

| # | Lệnh | Exit | Nơi đọc lại |
|---|---|---|---|
| 1 | `verify-task.ps1 -TaskPath docs\tasks\hrp-v5-hotfix-01-public-jobs-500\TASK.md` | `0` | §0 |
| 2 | `npm run test:unit` (RED, trước STEP-03) | `1` | §2 STEP-02 |
| 3 | `npm run typecheck` | `0` | §2 STEP-05 |
| 4 | `npm run test:unit` (GREEN) | `0` | §2 STEP-04, STEP-05 |
| 5 | `npm run lint` | `0` | §2 STEP-05 |
| 6 | `git diff --stat -- src/domains/job-board/`, `git status --short` | `0` | §2 STEP-06 |
| 7 | `grep -nF`, `git diff \| grep -cE`, `git log origin/main..HEAD` | xem bảng | §3 |

Log đầy đủ của ba lần chạy lane unit nằm ở file tạm ngoài repo (`$env:TEMP\hrp-hotfix01-*.txt`)
để không thêm rác vào worktree; toàn bộ số liệu đã trích nguyên văn vào §2 và §3. Không có
connection string, token, password hay PII trong bất kỳ output nào ở trên.

## 7. Execution Round History

| Round | Spec | Kết | Ghi chú |
|---|---|---|---|
| `1` | `v1.0` | `READY_FOR_AUDIT` | STEP-01..07 chạy đủ, 8/8 AC có evidence thật, 0 deviation, 0 blocker. Chưa commit theo `AC-08` |

STEP-07 là chính tài liệu này. Việc còn lại không thuộc Tier 2: Tier 3 audit độc lập, rồi Owner
quyết định commit và push để deploy.

> Handoff status: READY_FOR_AUDIT
