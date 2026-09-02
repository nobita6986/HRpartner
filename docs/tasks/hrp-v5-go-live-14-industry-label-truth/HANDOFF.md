# HANDOFF: hrp-v5-go-live-14-industry-label-truth

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-14-industry-label-truth` |
| Work type | `CODE` — bỏ một khoá khỏi projection công khai và một chip khỏi trang; không chạm dữ liệu, không chạm quyền |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Current audit round | `0` |
| Executor | Tier 2 — Engineer |
| Baseline | **Baseline mã = `be95e7c` = HEAD.** `HEAD` lúc bắt đầu **và** lúc kết thúc = `f911cd36eff7dd726d3c506f4afd5d01b5d70449` (`f911cd3`). `git diff --name-only be95e7c..HEAD` chỉ ra ba file, **toàn bộ dưới `docs/`** (`PLANNER_HANDOVER.md`, HANDOFF của go-live-05, TASK.md của chính task này) ⇒ bốn mốc dòng của `EV-01`/`EV-03`/`EV-02`/`EV-05` đọc trên `be95e7c` **khớp nguyên văn** với cây làm việc trước khi tôi sửa (chứng minh ở §3.8). Cây làm việc **đã bẩn sẵn** do lane khác: `docs/tasks/…-02/AUDIT.md`, `…-04/AUDIT.md`, `…-13/AUDIT.md` (mỗi file `1 0`, chữ ký một dòng trắng cuối file — **để nguyên làm dấu vết**), `public/index.html` (`97 59`), cùng `.claude/`, `.neon`, `docs/aff_plan*.md`, `fix.patch`, `patch_test*.ps1`, `temp.diff`, `rls-probe-*.txt`, nhiều `scratch/**`, `scripts/debug-parser.mjs` untracked. **Không stage, không reset, không commit, không dọn thứ nào trong đó** (`§4.2` cấm chạm) |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-09-02 11:20 +07` → `2026-09-02 12:29 +07`. Contract **không** bump giữa lượt: `sha256(TASK.md)` = `72687b7db632281733dc7a3d2b03b8cc37017ee592d92b17e8158be578b4d235`, `git diff --numstat -- …/TASK.md` **rỗng**, `git log` của TASK.md chỉ có `a49ddd9` ⇒ `v1.0` lúc bắt đầu, `v1.0` lúc viết file này |

## 1. Outcome Summary

`STEP-01`..`STEP-06` **DONE**. Không AC nào `BLOCKED`. **Không commit, không push, không deploy** (`R-01`, `DEC-09`, `RQ-10`) — `git rev-list --count origin/main..HEAD` = `0`, `git diff --cached` rỗng, `git reflog -3` không có commit nào của Tier 2. Chín file đổi trong cây làm việc, để nguyên chưa commit cho Tier 3 đọc.

> ### Dòng dành riêng cho `RISK-05` — Tier 1 relock go-live-09 theo dòng này
>
> **Response của đường đọc công khai đã MẤT khoá `industry`.** Không phải "có nhưng rỗng", không phải "có nhưng null": khoá đó **không còn tồn tại** trong payload. `PublicJobDto` xuống **15 khoá → 14 khoá**, và `PublicJobDetailDto extends PublicJobDto` nên **cả hai** route công khai `GET /api/jobs` và `GET /api/jobs/[slug]` cùng mất khoá. Tập khoá công khai hiện hành, đúng thứ tự chữ cái: `availableSlots`, `deadline`, `id`, `jobType`, `location`, `locations`, `position`, `positionTitles`, `shift`, `shiftType`, `shifts`, `slug`, `statusLabel`, `title`. Mọi contract, mock, fixture hay nội dung nào của go-live-09 dựng trên `job.industry` sẽ đọc `undefined` — không throw, chỉ lặng lẽ trắng. Chuỗi bằng chứng của chính câu này ở §3.7.

Đã làm:

- **`src/domains/job-board/public.service.ts`** (`21 18`; `498` → `501` dòng; `25621` → `26282` byte; LF). Bỏ `industry: string;` khỏi `PublicJobDto`; **xoá hẳn** `inferIndustry` (8 dòng thân + 1 dòng trắng); bỏ **cả hai** dòng `industry: inferIndustry(searchableText, null),` ở `toDto` (`:308`) và `toDetailDto` (`:363`); viết lại ba khối comment đã chết hoặc nói sai (docblock `PublicJobDto`, docblock `PublicJobFacets` từng khẳng định `inferIndustry` đang tồn tại, docblock `searchableTextOf` từng nói text này để suy `industry`). Diff đầy đủ không context ở §3.6.
- **`app/(jobs)/viec-lam/[slug]/page.tsx`** (`0 1`; `187` → `186` dòng; `8969` → `8913` byte; CRLF giữ nguyên 100%). Xoá **đúng một dòng**: `<Chip icon="factory" label={job.industry} />`. Chip loại hình công việc còn **nguyên văn cả icon lẫn nhãn**. Kế toán byte khép kín ở §3.5.
- **Bảy file test của `§4.2`**, không file thứ tám (`RISK-01`) — danh sách và số dòng ở §3.2. Mọi assertion bị bỏ đều **đổi dấu thành phủ định**, không xoá trắng (`DEC-05`); bằng chứng bằng SỐ: tổng số test RED = `9 failed \| 1558 passed (1567)`, tổng số test GREEN = `1567 passed (1567)` — **cùng 1567**, tức không test nào bị xoá, chỉ đổi dấu.
- **Hàng rào chống-đổi-tên** (`RQ-03`, §3.4): bằng chứng là **sự VẮNG MẶT của bảy từ khoá regex và của năm nhãn cứng**, không phải sự vắng mặt của một cái tên — một hàm `inferSector` trả nguyên năm nhãn cũ vẫn FAIL.
- **Hai allow-list khoá DTO** (`RQ-05`, §3.3), ở hai file khác nhau, **cả hai** xuống 14 khoá và **cả hai** có phủ định `not.toHaveProperty('industry')` trên object THẬT do mapper trả về, không chỉ trên hằng số.

Cần Tier 3 đọc kỹ, vì tôi tự thấy dễ đọc lệch:

- **`AC-03` không trả 0 theo mặt chữ, và tôi không sửa cho nó trả 0.** `grep -rn "inferIndustry" src/ app/` còn **2 dòng**, cả hai là **comment tài liệu** trong hai file test đã được uỷ quyền, ghi lại khẳng định cũ đã đổi dấu — tức đúng phần "hoặc có lý do ghi tại chỗ" của `RQ-04` và đúng `DEC-05`. Không còn **mã** nào mang tên đó. Chi tiết, hai dòng nguyên văn, và lệnh trả 0 ở `DEV-01` §5.
- **`AC-01` "còn đúng một chip" là câu dễ đọc thành "xoá ba chip".** Hàng chip đầu trang **`4` → `3`**: chip địa điểm, chip ca, chip loại hình đều là chip hợp lệ và **phải còn**; chỉ chip ngành biến mất. Cả trang `6` → `5` `<Chip `. Tôi đọc `AC-01` là "còn đúng một chip **loại hình công việc**, và **không** còn chip ngành" — khớp `RQ-01` ("chip loại hình công việc còn nguyên vị trí và nguyên nhãn") và khớp `DEC-07`. Nếu Tier 1 có ý khác thì đây là chỗ phải nói. Số đo ở §3.5, `DEV-02` §5.
- **`public-card-truth.integration.test.ts` KHÔNG xuất hiện trong con số của lane unit.** `vitest.unit.config.ts` loại nó qua `INTEGRATION_TEST_FILES`. Nó đã sửa (`22 12`) và đã typecheck, nhưng cả `1567` của RED lẫn `1567` của GREEN **đều không tính nó**. Đừng đọc lane unit như đã phủ file đó. `LIM-01` §5. Ghi chú này cũng đã viết **vào chính file đó** để lần sau không ai đọc lệch.
- **Một assertion của tôi ở `STEP-01` đã SAI và tôi tự sửa trước GREEN.** Tôi viết `expect(page.split('<Chip ').length - 1).toBe(3)` vì tưởng cả trang có 4 chip; `grep -n '<Chip'` cho thấy **6** (4 ở hàng đầu, 2 trong danh sách vị trí ở dưới). Đã sửa thành phép đếm **có phạm vi trên hàng chip** cộng một mốc nguyên văn trên chip loại hình cộng tổng cả trang, rồi **chạy lại RED lần hai** để chắc assertion đã sửa vẫn là hàng rào thật chứ không phải hàng rào giả. Cả hai lần RED có output ở §3.1.

Không làm (đúng `Non-goals`): không mở quyền đọc công khai lên `client_companies`, không thêm cột `industry` mới, không chạm `classifyJobType`/`classifyShift`, không đổi bộ lọc hay facet, không chạm ba file admin của `ClientCompany.industry`, không chạm `prisma/**`, không migration, không env, không `middleware.ts`.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-00` | — | `verify-task.ps1`; kiểm kê TRƯỚC: `sha256` + byte + dòng + EOL của 9 file sẽ chạm và 3 file bị cấm chạm; `git diff --numstat` toàn cây; `git diff --name-only be95e7c..HEAD` | `DONE` | None. Bước tự thêm, không có trong `§5`. Lý do: `AC-07` và `AC-09` đòi so TRƯỚC/SAU, nên phải có bản kiểm kê trước khi chạm dòng đầu tiên |
| `STEP-01` | `RQ-06` | Bảy file test — viết assertion MỚI, **chưa** chạm dòng mã nào | `DONE` | None. `npm run test:unit` **EXIT=1**, `6 failed \| 95 passed (101)` file, `9 failed \| 1558 passed (1567)` test. Cả 9 site đỏ đều là phủ định mới viết (§3.1). `git diff --numstat` trên hai file mã **rỗng** tại thời điểm đo |
| `STEP-02` | `RQ-02/03` | `src/domains/job-board/public.service.ts` — bỏ khoá DTO, xoá `inferIndustry`, bỏ hai dòng gán, dọn ba comment | `DONE` | None. `npm run typecheck` **EXIT=0**. Sau bước này chạy RED lần hai (trang **chưa** sửa): **EXIT=1**, vẫn `9 failed \| 1558 passed (1567)`, site đỏ **di trú** sang các khẳng định DƯƠNG cũ — bằng chứng hai đầu hàng rào đều cắn |
| `STEP-03` | `RQ-01` | `app/(jobs)/viec-lam/[slug]/page.tsx` — xoá đúng chip ngành | `DONE` | None. Hàng chip `4` → `3`, token `industry` trên trang THÔ `1` → `0`, `icon="factory"` `1` → `0`, chip loại hình còn nguyên văn |
| `STEP-04` | `RQ-04/05` | Bảy file test — đổi dấu assertion, sửa hai allow-list, sửa fixture, xử lý test mang tên sai của `EV-11` | `DONE` | None. `npm run test:unit` **EXIT=0**, `1567 passed (1567)`. Test của `EV-11` đổi tên từ `'still uses the client company industry when the relation is readable'` thành phép đo **hai văn bản dự án khác nhau cho cùng một tập khoá** (§3.3) |
| `STEP-05` | `RQ-07/08` | Bốn gate mã + ba file admin | `DONE` | None. `typecheck` **0**, `test:unit` **0**, `lint` **0 error** (496 warning), `build` **0**. `sha256` ba file admin **khớp từng ký tự** với kiểm kê TRƯỚC, `git diff` rỗng (§3.6) |
| `STEP-06` | `RQ-09/10` | `docs/tasks/hrp-v5-go-live-14-industry-label-truth/HANDOFF.md` | `DONE` | None. Chính file này. `git diff --numstat` **TOÀN CÂY không lọc path** ở §3.2; dòng riêng cho `RISK-05` ở §1 và §3.7 |

## 3. Acceptance Evidence

**Mọi lệnh dưới đây là lệnh CHÍNH XÁC đã chạy; Tier 3 chạy lại được từng lệnh.** Lane test canonical là `npm run test:unit` — `npx vitest run` trần đọc `DATABASE_URL` từ `.env`, tức **PRODUCTION**, và fail oan 24 test component; đừng dùng nó để phúc tra. Lệnh `.ps1` viết bằng dấu gạch xuôi (PowerShell nhận cả hai) để tránh sai lệch khi copy.

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — | `./.ai-pipeline/scripts/verify-task.ps1 -TaskPath ./docs/tasks/hrp-v5-go-live-14-industry-label-truth/TASK.md` | `RESULT: PASS`, `EXIT=0` | `TASK CONTRACT CHECK … RESULT: PASS. TASK contract is ready for execution.` | None |
| `AC-01` | `grep -rn "job\.industry" app/` | `EXIT=1`, output **rỗng** | 0 match. Thêm phép quét rộng hơn: `grep -rn "industry" app/ --include=*.tsx --include=*.ts` **trừ** hai thư mục `app/admin/clients/`, `app/api/clients/` cũng `EXIT=1` rỗng. Hàng chip `4`→`3`, `<Chip ` cả trang `6`→`5`, `icon="factory"` `1`→`0` — §3.5 | Câu "còn đúng một chip" của `AC-01` là **một chip loại hình**, không phải một chip tổng cộng: `DEV-02` §5 |
| `AC-02` | `grep -n "industry:" src/domains/job-board/public.service.ts` + `npm run typecheck` | grep `EXIT=1` rỗng; typecheck **`EXIT=0`** | `PublicJobDto` còn **14 khoá**, liệt kê đầy đủ ở §3.7. Ba mention `industry` còn lại trong service đều là **comment tài liệu** (dòng 12, 15, 56), 0 mention trong mã đã bỏ comment — §3.4 | None |
| `AC-03` | `grep -rn "inferIndustry" src/ app/` | `EXIT=0`, **2 dòng** — cả hai là comment | Không còn **mã** nào mang tên đó. Lệnh trả **0**: cùng grep, lọc bỏ dòng comment (§3.4). Hàng rào bền hơn tên hàm: 0 từ khoá regex, 0 nhãn cứng — §3.4 | **Lệch mặt chữ của `AC-03`**: `DEV-01` §5. Tôi **không** xoá hai comment đó, vì `RQ-04` nhận "lý do ghi tại chỗ" và `DEC-05` cấm xoá trắng dấu vết |
| `AC-04` | `git diff --name-only \| grep '\.test\.ts$'` | `7` file, đúng bảy file của `§4.2` | Danh sách đầy đủ kèm `numstat` ở §3.2. Không có file test thứ tám; `git status --porcelain src app` không có file mới untracked nào | None |
| `AC-05` | Đọc hai allow-list + phủ định | Cả hai `14` khoá, cả hai `industry=0` | Trích dẫn nguyên văn **cả hai chỗ** ở §3.3, cộng phủ định chặn tái xuất ở §3.4 | Allow-list `#1` nằm trong file integration — không chạy ở lane unit: `LIM-01` §5 |
| `AC-06` | `npm run test:unit` (a) trên cây **chưa** sửa mã, (b) sau khi sửa | (a) **`EXIT=1`**; (b) **`EXIT=0`** | (a) `6 failed \| 95 passed (101)` file, `9 failed \| 1558 passed (1567)` test, **cả 9 site đỏ là phủ định mới** kèm thông điệp `AssertionError` nguyên văn; (b) `101 passed (101)` file, `1567 passed (1567)` test. Cộng RED lần hai. Tất cả ở §3.1 | RED đo trên bảy file test; file integration không thuộc lane này |
| `AC-07` | `git diff --numstat -- app/admin/clients app/api/clients prisma` + `sha256sum` ba file | diff **rỗng**; ba `sha256` **khớp từng ký tự** | §3.6. Ba file **vẫn còn** cột thật (`5`/`2`/`2` mention `industry`) — không bị dọn lây | None |
| `AC-08` | `npm run typecheck`, `npm run test:unit`, `npm run lint`, `npm run build` | `0`, `0`, `0`, `0` | typecheck không output; `test:unit` `1567 passed (1567)`; lint `✖ 496 problems (0 errors, 496 warnings)`; build `✓ Compiled successfully in 7.0s` + `✓ Generating static pages (29/29)`. Số test TRƯỚC/SAU: `1567` = `1567`, **không giảm** — §3.1 | Ba warning `no-explicit-any` ở `mp1.contract.test.ts` là **có sẵn**: `git show HEAD:… \| grep -c 'as any'` = `3`, hiện tại = `3` |
| `AC-09` | `git diff --numstat` (**toàn cây, không lọc path**) + `wc -c` trên HANDOFF | 13 dòng numstat; HANDOFF = `65167` byte | Bảng numstat đầy đủ ở §3.2, cộng kiểm kê `sha256`/byte/dòng/EOL của cả 9 file | None |
| `AC-10` | `git rev-list --count origin/main..HEAD`; `git diff --cached --numstat`; `git reflog -3` | `0`; **rỗng**; không có commit của Tier 2 | `HEAD` = `origin/main` = `f911cd3`. Cây làm việc còn nguyên 9 file chưa commit + 4 dòng bẩn sẵn của lane khác — §3.2 | None |

### 3.1 `AC-06` / `DEC-08` — RED trước GREEN, đo trên assertion MỚI, hai lần

`DEC-08` không nhận RED trên assertion cũ. Bằng chứng dưới đây là **thông điệp lỗi nguyên văn** của từng site đỏ: mọi dòng đều là một phủ định (`to not include`, `not to have property`, `not to match`) — tức chúng là assertion tôi vừa viết, không phải assertion cũ nào.

**RED lần 1 — bảy file test đã viết phủ định, hai file mã CHƯA chạm.** Trạng thái mã chứng minh tại thời điểm đo: `git diff --numstat -- src/domains/job-board/public.service.ts 'app/(jobs)/viec-lam/[slug]/page.tsx'` → **rỗng**.

```
$ npm run test:unit          # EXIT=1
 ❯ src/domains/applications/marketplace-inventory.static.test.ts (25 tests | 1 failed) 52ms
 ❯ src/domains/job-board/public-card-truth.test.ts (23 tests | 1 failed) 28ms
 ❯ src/domains/applications/marketplace-browse.routes.test.ts (13 tests | 2 failed) 27ms
 ❯ src/domains/job-board/public-detail.static.test.ts (23 tests | 1 failed) 13ms
 ❯ src/domains/job-board/mp1.contract.test.ts (6 tests | 3 failed) 15ms
 ❯ src/domains/job-board/public-select.static.test.ts (3 tests | 1 failed) 10ms

AssertionError: expected [ 'id', 'slug', 'title', …(12) ] to not include 'industry'
 ❯ src/domains/applications/marketplace-browse.routes.test.ts:148:43
AssertionError: expected [ 'id', 'slug', 'title', …(12) ] to not include 'industry'
 ❯ src/domains/applications/marketplace-browse.routes.test.ts:239:39
AssertionError: expected 'import { Prisma } from \'@prisma/clie…' not to match /industry/i
 ❯ src/domains/applications/marketplace-inventory.static.test.ts:329:25
AssertionError: expected { id: 'project-1', …(14) } to not have property "industry"
 ❯ src/domains/job-board/mp1.contract.test.ts:118:32
AssertionError: expected { id: 'project-9', …(14) } to not have property "industry"
 ❯ src/domains/job-board/mp1.contract.test.ts:136:32
AssertionError: expected { id: 'project-9', …(14) } to not have property "industry"
 ❯ src/domains/job-board/mp1.contract.test.ts:158:32
AssertionError: expected [ 'availableSlots', 'deadline', …(13) ] to not include 'industry'
 ❯ src/domains/job-board/public-card-truth.test.ts:418:29
AssertionError: expected '/**\r\n * page.tsx — go-live-12 / RQ-…' not to match /industry/i
 ❯ src/domains/job-board/public-detail.static.test.ts:123:22
AssertionError: expected 'import { Prisma } from \'@prisma/clie…' not to match /industry/i
 ❯ src/domains/job-board/public-select.static.test.ts:70:22

 Test Files  6 failed | 95 passed (101)
      Tests  9 failed | 1558 passed (1567)
```

Ba chi tiết trong khối trên đáng đọc chậm:

- `…(12)` và `…(14)` là **số khoá lúc đó**: `3 + 12 = 15` và `1 + 14 = 15`. Sau `STEP-02` cùng phép đo trả `14`. Đây là con số của `RISK-05`.
- `expected '/**\r\n * page.tsx …' not to match /industry/i` — file `public-detail.static.test.ts` đọc trang **THÔ**, thấy cả `\r\n`, tức nó canh cả comment của trang, không chỉ mã. Hai file static còn lại đọc service **qua `strip`** (bỏ comment), nên comment tài liệu tôi viết trong service không làm chúng xanh oan.
- 9 site nằm ở 6 file; file thứ bảy (`public-card-truth.integration.test.ts`) **không có mặt** vì lane unit loại nó — `LIM-01`.

**RED lần 2 — sau `STEP-02` (service đã sửa), trang chi tiết CHƯA chạm.** Mục đích: chứng minh hàng rào cắn ở **cả hai đầu**, và phúc tra assertion chip mà tôi đã sửa (§1, gạch đầu dòng thứ tư).

```
$ npm run test:unit          # EXIT=1
 Test Files  6 failed | 95 passed (101)
      Tests  9 failed | 1558 passed (1567)
```

Cùng con số, nhưng **site đỏ di trú**: các phủ định mới đã xanh nhờ `STEP-02`, còn các khẳng định DƯƠNG cũ (`toContain('function inferIndustry(')`, `toContain('industry: inferIndustry(searchableText, null)')`, `toContain('job.industry')`, `industry: 'Kho vận'` trong `objectContaining`, allow-list 15 khoá) chuyển sang đỏ. Đó chính là những dòng `STEP-04` đổi dấu.

**GREEN — sau `STEP-03` và `STEP-04`, chạy lại trên đúng bộ `sha256` kiểm kê ở §3.2:**

```
$ npm run typecheck          # EXIT=0   (tsc --noEmit, không output)
$ npm run test:unit          # EXIT=0
 Test Files  101 passed (101)
      Tests  1567 passed (1567)
   Duration  31.85s
```

**Phép đo `DEC-05` — không assertion nào bị xoá trắng.** RED: `9 + 1558 = 1567`. GREEN: `1567 + 0 = 1567`. **Hai tổng bằng nhau**, nên bảy file test không bị co lại: chúng đổi dấu. Nếu tôi xoá trắng thay vì đổi dấu, tổng GREEN sẽ nhỏ hơn 1567 và con số này sẽ tố giác ngay.

### 3.2 `AC-09` / `RQ-09` — `git diff --numstat` TOÀN CÂY, không lọc path

Lệnh chính xác, không có `--` và không có đường dẫn nào phía sau:

```
$ git diff --numstat
0	1	app/(jobs)/viec-lam/[slug]/page.tsx
1	0	docs/tasks/hrp-v5-go-live-02-public-surface-exposure/AUDIT.md
1	0	docs/tasks/hrp-v5-go-live-04-public-read-rls-closure/AUDIT.md
1	0	docs/tasks/hrp-v5-go-live-13-tracking-pii-mask/AUDIT.md
97	59	public/index.html
17	3	src/domains/applications/marketplace-browse.routes.test.ts
10	5	src/domains/applications/marketplace-inventory.static.test.ts
30	15	src/domains/job-board/mp1.contract.test.ts
22	12	src/domains/job-board/public-card-truth.integration.test.ts
8	1	src/domains/job-board/public-card-truth.test.ts
16	2	src/domains/job-board/public-detail.static.test.ts
7	2	src/domains/job-board/public-select.static.test.ts
21	18	src/domains/job-board/public.service.ts
```

Đọc bảng trên thành ba nhóm:

1. **Chín dòng của lane này** — 2 file mã + 7 file test của `§4.2`. Không có dòng thứ mười nào thuộc `src/` hay `app/`.
2. **Bốn dòng bẩn sẵn, KHÔNG phải của tôi** — ba `AUDIT.md` (`1 0`) và `public/index.html` (`97 59`). Bốn con số này **y hệt** lúc `STEP-00`, tức `next build` của `STEP-05` **không** làm bẩn thêm `public/index.html` lần này (`copy-static.mjs` là bẫy đã biết của lane go-live-02). `§4.2` cấm chạm, nên tôi để nguyên.
3. **Không có dòng nào của `prisma/**`, `app/admin/clients`, `app/api/clients`, env, `vercel.json`, `middleware.ts`.**

**Guard chống bẫy AUDIT.md bị cắt về 0 byte.** Quét chữ ký `0 N` trên **toàn cây**: đúng **một** dòng, là `0 1 app/(jobs)/viec-lam/[slug]/page.tsx` — đó là **xoá một dòng có chủ ý** của `STEP-03`, không phải file bị cắt: file còn `8913` byte / `186` dòng (§3.5). Ba `AUDIT.md` mang chữ ký `1 0` và còn `5448` / `5286` / `5543` byte, tức lành.

**Kiểm kê SAU của chín file** (`sha256` 12 ký tự đầu; EOL đo bằng `b.count(b'\r\n')` so với `b.count(b'\n')`, không dùng `grep -c` vì phép đó không đáng tin ở harness này):

| # | File | byte | dòng | EOL | `sha256` (12) |
|---|---|---|---|---|---|
| 1 | `src/domains/job-board/public.service.ts` | `26282` | `501` | LF | `32c6a1fd85fa` |
| 2 | `app/(jobs)/viec-lam/[slug]/page.tsx` | `8913` | `186` | **CRLF** | `3e0bb694d678` |
| 3 | `src/domains/applications/marketplace-inventory.static.test.ts` | `24026` | `393` | LF | `08b9aa3440a5` |
| 4 | `src/domains/job-board/public-select.static.test.ts` | `4004` | `72` | LF | `9dacf91c2a8a` |
| 5 | `src/domains/job-board/public-detail.static.test.ts` | `11547` | `232` | LF | `a5318c3b05bf` |
| 6 | `src/domains/job-board/public-card-truth.test.ts` | `22553` | `463` | LF | `a613f4db80aa` |
| 7 | `src/domains/job-board/mp1.contract.test.ts` | `8290` | `158` | LF | `36062b3d62aa` |
| 8 | `src/domains/applications/marketplace-browse.routes.test.ts` | `15723` | `330` | LF | `aad1de93d808` |
| 9 | `src/domains/job-board/public-card-truth.integration.test.ts` | `24095` | `380` | LF | `624eb01359f1` |

Số dòng SAU khớp `numstat` cộng số dòng TRƯỚC ở cả chín dòng — ví dụ `public-detail.static.test.ts`: `218 + 16 - 2 = 232`; `mp1.contract.test.ts`: `143 + 30 - 15 = 158`; `public.service.ts`: `498 + 21 - 18 = 501`. Không file nào bị cắt hay bị ghi đè mất phần.

**Trạng thái git (`AC-10`):**

```
$ git diff --cached --numstat                     # rỗng — không stage gì
$ git rev-parse HEAD                              # f911cd36eff7dd726d3c506f4afd5d01b5d70449
$ git rev-parse origin/main                        # f911cd36eff7dd726d3c506f4afd5d01b5d70449
$ git rev-list --count origin/main..HEAD           # 0
$ git reflog -3
f911cd3 HEAD@{0}: commit: docs(go-live-05): đưa HANDOFF của Tier 2 vào git
a49ddd9 HEAD@{1}: commit: docs(planner): mở go-live-14 — bỏ nhãn ngành nghề bịa khỏi bề mặt công khai
be95e7c HEAD@{2}: commit: docs(planner): đưa bản thiết kế Affiliate vào git
```

Ba dòng reflog cuối đều là commit **docs của Tier 1**, không có commit nào của Tier 2 (`RISK-06`).

**Chính file HANDOFF này KHÔNG có trong bảng numstat**, và đó là đúng: nó là file **mới, chưa track**, nên `git diff` không thấy nó. Kiểm bằng:

```
$ git ls-files --error-unmatch docs/tasks/hrp-v5-go-live-14-industry-label-truth/HANDOFF.md
error: pathspec '...' did not match any file(s) known to git
$ git status --porcelain docs/tasks/hrp-v5-go-live-14-industry-label-truth/HANDOFF.md
?? docs/tasks/hrp-v5-go-live-14-industry-label-truth/HANDOFF.md
```

Vì nó untracked, nếu file này bị cắt về 0 byte thì `git restore` **không** cứu được — mất hẳn. Số byte ở `AC-09` là mốc để phát hiện chuyện đó.

**Về tám dòng cảnh báo `LF will be replaced by CRLF` mà `git diff --numstat` in ra** — chúng **không** phải dấu hiệu tôi đổi line ending. `core.autocrlf = true` và repo **không** có `.gitattributes`, nên git in cảnh báo đó cho mọi file LF trong cây mà nó đang diff. Bằng chứng LF là chuẩn của cây này, không phải thứ tôi mới đưa vào:

```
$ git cat-file -s HEAD:src/domains/job-board/public.service.ts     # 25621 = đúng số byte TRƯỚC của cây làm việc
                                                                    # ⇒ file đó đã là LF từ trước khi tôi chạm
$ 12 file .ts/.tsx tracked mà round này KHÔNG chạm, lấy mẫu ngẫu nhiên:  LF=12  CRLF=0
```

`page.tsx` là ngoại lệ duy nhất, nó **vốn** CRLF (`8782` byte blob LF + `187` CR = `8969` byte TRƯỚC) và tôi **giữ nguyên** CRLF: `186` cặp CR+LF, `0` LF trần. Đó là lý do cột EOL ở bảng trên ghi CRLF cho đúng một dòng.

### 3.3 `AC-05` / `RQ-05` — HAI allow-list khoá DTO, trích dẫn cả hai chỗ

Sót một bản là hàng rào hở (`RISK-03`). Hai bản nằm ở hai file khác nhau và **cả hai** đã xuống 14 khoá.

**Allow-list `#1` — `src/domains/job-board/public-card-truth.integration.test.ts:243-266`** (đo trên DB thật, **không** chạy ở lane unit — `LIM-01`):

```ts
  it('AC-01/RISK-01/RISK-07 — hourlyRateVnd là BigInt THẬT nhưng DTO chỉ có 14 khóa allow-list', async () => {
    …
    // go-live-14 / RQ-02, RQ-05: 15 khóa xuống 14. Đây là allow-list khóa DTO thứ NHẤT trong hai bản;
    // bản thứ hai ở `public-card-truth.test.ts`. Sót một bản là hàng rào hở.
    expect(Object.keys(job).sort()).toEqual(
      ['availableSlots', 'deadline', 'id', 'jobType', 'location', 'locations', 'position',
        'positionTitles', 'shift', 'shiftType', 'shifts', 'slug', 'statusLabel', 'title'].sort(),
    );
    expect(job).not.toHaveProperty('industry');
```

**Allow-list `#2` — `src/domains/job-board/public-card-truth.test.ts:405-422`** (lane unit, mapper thật + `tx` mock):

```ts
  // go-live-14 / RQ-02, RQ-05 — 15 khóa xuống 14: `industry` đã bị bỏ khỏi allow-list công khai vì
  // nó là khóa duy nhất không truy nguyên được về một cột canonical nào.
  const PUBLIC_KEYS = [
    'availableSlots', 'deadline', 'id', 'jobType', 'location', 'locations',
    'position', 'positionTitles', 'shift', 'shiftType', 'shifts', 'slug', 'statusLabel', 'title',
  ];

  it('card DTO có ĐÚNG tập khóa công khai, không thừa một khóa nào', async () => {
    const job = await onlyJob([row({ staffingOrders: [order([slot(), slot(QC_SLOT)])] })]);

    expect(Object.keys(job).sort()).toEqual(PUBLIC_KEYS);
    // go-live-14 / RQ-05, DEC-05 — đây là allow-list khóa DTO thứ HAI trong hai bản; bản thứ nhất ở
    // `public-card-truth.integration.test.ts`. Sót một bản là hàng rào hở, nên hai dòng dưới canh cả
    // hằng số lẫn object thật: sửa lại `PUBLIC_KEYS` mà quên mapper (hoặc ngược lại) đều FAIL.
    expect(PUBLIC_KEYS).not.toContain('industry');
    expect(job).not.toHaveProperty('industry');
  });
```

Vì sao **hai** phủ định chứ không một: `toEqual` trên mảng đã sort là phép so **hai chiều**, nhưng nếu ai đó thêm lại `industry` vào **cả** mapper **và** `PUBLIC_KEYS` thì `toEqual` vẫn xanh. `expect(PUBLIC_KEYS).not.toContain('industry')` canh hằng số, `expect(job).not.toHaveProperty('industry')` canh object thật — muốn qua cả hai thì phải xoá cả hai dòng phủ định, và đó là hành động **không thể vô tình**.

Kiểm bằng máy trên cả hai file:

```
$ # đếm khoá + tìm 'industry' trong từng allow-list
  src/domains/job-board/public-card-truth.test.ts             -> keys=14  industry=0
  src/domains/job-board/public-card-truth.integration.test.ts -> keys=14  industry=0
$ sed -n '/^export interface PublicJobDto/,/^}/p' src/domains/job-board/public.service.ts | grep -cE '^\s+[a-zA-Z]+.*;'
14
```

Ba con số `14` này là **ba nguồn độc lập** (allow-list `#1`, allow-list `#2`, chính `PublicJobDto`) và chúng khớp nhau.

**`EV-11` — test mang tên nói SAI về defect.** Contract chỉ ra `mp1.contract.test.ts:134` có một test tên `'still uses the client company industry when the relation is readable'`, trong khi `EV-02` chứng minh `inferIndustry(searchableText, null)` **không** deref quan hệ khách hàng nào; test đó chỉ xanh vì fixture chứa chữ khớp regex. Tôi không xoá nó, tôi biến nó thành phép đo **ngược lại điều nó từng nói**:

```ts
  it('gives the same public key set for two different project texts, with no industry label', async () => {
    const tx = publicProjectionTx('Lap rap bang mach dien tu');

    const result = await listPublicJobProjection(tx, {});

    expect(result.total).toBe(1);
    // … bốn dòng comment ghi lại ba khẳng định cũ đã ĐỔI DẤU (typeof là string, và nhãn 'Dien tu'),
    // lược ở đây cho gọn — nguyên văn ở `mp1.contract.test.ts:149-152` …
    const plain = await listPublicJobProjection(publicProjectionTx('Lap rap bang mach'), {});
    expect(Object.keys(result.jobs[0]).sort()).toEqual(Object.keys(plain.jobs[0]).sort());
    expect(result.jobs[0]).not.toHaveProperty('industry');
    expect(plain.jobs[0]).not.toHaveProperty('industry');
  });
```

Hai văn bản dự án khác nhau — một có chữ `dien tu` từng kích nhánh `'Điện tử'`, một không — nay cho **cùng một tập khoá**. Trước `STEP-02`, chính hai văn bản đó cho hai payload khác nhau. Đó là cách đo "nhãn không còn phụ thuộc chữ" mà không cần DB.

### 3.4 `AC-02` / `AC-03` / `RQ-03` — hàng rào chống-đổi-tên, và chỗ tôi lệch mặt chữ

`RQ-03` nói "đổi tên hàm rồi giữ hành vi là FAIL". Nếu hàng rào chỉ đo sự vắng mặt của **cái tên** `inferIndustry` thì một hàm `inferSector` trả nguyên năm nhãn cũ sẽ đi qua trong im lặng. Nên phép đo bền là sự vắng mặt của **bảy từ khoá regex** và của **năm nhãn cứng**. Đo trên nguồn service **đã bỏ comment**, bằng đúng biểu thức `strip` mà hai file test static dùng:

```
  industry (stripped)                        = 0
  infer (stripped)                           = 0
  regex keywords (7 từ)                      = 0      # may mac|thuc pham|van tai|logistic|warehouse|garment|sewing
  5 nhãn ngành                               = 0      # Kho vận|May mặc|Thực phẩm|Điện tử|Công nghiệp chế tạo
  classifyJobType(searchableText, slots)     = 2      # HAI mapper vẫn còn phân loại loại hình — DEC-07
  searchableText (đường ống text còn sống)   = 7
```

Hai dòng cuối là **mốc dương có chủ ý** (`DEC-07`): nếu ai đó "dọn" luôn `searchableText` thì `classifyJobType` chết theo, và bốn phủ định ở trên vẫn xanh. Phủ định một mình không phân biệt được "bỏ nhãn suy diễn" với "bỏ luôn đường text" — hai kết cục rất khác nhau. Nên `public-select.static.test.ts` giữ một khẳng định dương:

```ts
    expect(code).not.toMatch(/industry/i);
    expect(code).toContain('classifyJobType(searchableText, slots)');
```

Hàng rào bốn phủ định đặt **đúng chỗ rào cũ đứng** (`DEC-06`), tức trong test tĩnh đọc nguồn service, `marketplace-inventory.static.test.ts:325-328`:

```ts
    expect(service).not.toMatch(/industry/i);
    expect(service).not.toMatch(/infer/i);
    expect(service).not.toMatch(/may mac|thuc pham|van tai|logistic|warehouse|garment|sewing/);
    expect(service).not.toMatch(/Kho vận|May mặc|Thực phẩm|Điện tử|Công nghiệp chế tạo/);
```

Cùng file đó còn ba phủ định khác đã có sẵn từ go-live-05 và nay được thừa hưởng: `:303` `expect(page).not.toMatch(/industry/i)` trên trang danh sách, `:305` cùng phép đo trên `route.ts`, và `:318` `expect(facetsObject).not.toMatch(/infer/i)` trên payload facets. Cộng bốn dòng mới, trục ngành nghề bị canh ở **bốn** bề mặt: service, route, trang danh sách, payload facets — cộng trang chi tiết ở file static riêng.

**Chỗ tôi lệch mặt chữ của `AC-03`, và tại sao tôi không "sửa cho xanh".** `AC-03` đòi `grep inferIndustry` trong `src` và `app` trả 0. Thực đo:

```
$ grep -rn "inferIndustry" src/ app/          # EXIT=0 — 2 dòng
src/domains/applications/marketplace-inventory.static.test.ts:320:    // `function inferIndustry(` và `industry: inferIndustry(searchableText, null)` VẪN PHẢI CÒN, tức
src/domains/job-board/public-select.static.test.ts:65:    // go-live-14 / RQ-02, DEC-05, DEC-07 — khẳng định cũ `toContain('inferIndustry(searchableText,
```

Cả hai là **comment tài liệu trong hai file test đã được uỷ quyền**, ghi lại chính khẳng định cũ đã đổi dấu — tức phần "hoặc có lý do ghi tại chỗ" của `RQ-04` và tinh thần "không xoá trắng" của `DEC-05`. Xoá hai dòng đó sẽ làm `AC-03` xanh theo mặt chữ **và đồng thời xoá dấu vết vì sao assertion đổi dấu** — tôi cho rằng đó là đổi một AC lấy một `DEC`, nên tôi để nguyên và khai báo. Lệnh trả **0** nếu bỏ dòng comment ra khỏi phép đếm:

```
$ grep -rn "inferIndustry" src/ app/ | grep -vE "^[^:]+:[0-9]+: *(//|\*|/\*)"
                                              # EXIT=1 — rỗng: không còn MÃ nào mang tên đó
```

Quyết định cuối cùng thuộc Tier 3 (`DEV-01` §5).

**Ba mention `industry` còn lại trong service, cả ba là comment:**

```
$ grep -n "industry" src/domains/job-board/public.service.ts
12: * go-live-14 / RQ-02: khoá `industry` ĐÃ BỊ BỎ khỏi allow-list này. Nó là khoá duy nhất không truy
15: * Cột `ClientCompany.industry` có thật và do người nhập, nhưng `client_companies` ở posture FORCE
56: * nào để dựng facet đó lên kể cả khi ai muốn. Cột `ClientCompany.industry` có thật nhưng
```

Ba dòng này **an toàn về mặt phép đo** vì hai file static đọc service **qua `strip`** — bằng chứng: `industry (stripped) = 0` ở đầu mục này. Ngược lại, `public-detail.static.test.ts` đọc trang **THÔ**, nên trên **trang** thì token `industry` phải vắng mặt kể cả trong comment, và nó vắng mặt (§3.5).

**Quét toàn repo — ai còn giữ `industry`:**

```
$ grep -rn "industry" src/ app/ prisma/ --include=*.ts --include=*.tsx --include=*.mjs --include=*.prisma
    trừ: app/admin/clients/, app/api/clients/, prisma/seed.mjs, prisma/schema.prisma,
         *.test.ts (phủ định), public.service.ts dòng 12/15/56 (comment)
    → rỗng
```

Nghĩa là sau task này, mọi lần xuất hiện của chữ `industry` trong repo thuộc đúng ba nhóm: **cột thật `ClientCompany.industry`** của admin (`EV-13`, cấm chạm), **assertion phủ định** trong bảy file test, và **comment tài liệu**. Không còn đường mã nào sinh ra hay in ra một nhãn ngành cho khách ẩn danh. Đây cũng là phép trả lời cho `RISK-02`: không có consumer nào ngoài chín file này đọc khoá đó, nên `tsc` xanh không phải là bằng chứng duy nhất.

### 3.5 `AC-01` / `RQ-01` — kế toán chip trên trang chi tiết, khép kín tới từng byte

Diff của trang là **toàn bộ** những gì tôi chạm ở `app/`:

```diff
$ git diff -- 'app/(jobs)/viec-lam/[slug]/page.tsx'
@@ -135,7 +135,6 @@ export default async function PublicJobDetailPage({ params }: PageProps) {
           <Chip icon="location_on" label={job.location?.trim() || 'Địa điểm đang cập nhật'} />
           <Chip icon="schedule" label={job.shift?.trim() || 'Thời gian đang cập nhật'} />
           <Chip icon="work" label={JOB_TYPE_LABELS[job.jobType]} />
-          <Chip icon="factory" label={job.industry} />
         </div>
```

Một dòng xoá, không dòng thêm. Chip loại hình công việc (`icon="work"`) còn **nguyên văn cả icon lẫn nhãn** — `RQ-01` và `DEC-07`.

**Kế toán byte khép kín** (chứng minh không có gì khác lọt vào cùng lượt sửa):

```
  dòng bị xoá   = 54 ký tự + CRLF = 56 byte
  worktree TRƯỚC = 8969 byte / 187 dòng / 100% CRLF
  worktree SAU   = 8913 byte / 186 dòng / 100% CRLF
  8969 - 8913    = 56          ✓ khớp đúng một dòng, không byte nào khác đổi
  chéo với git   : blob baseline (git chuẩn hoá LF) = 8782 byte / 187 dòng;
                   8782 + 187 CR = 8969 ✓ → EOL của file không bị tôi đổi
```

**Số chip TRƯỚC/SAU, đo bằng máy:**

| Phép đo | TRƯỚC | SAU | Ghi chú |
|---|---|---|---|
| `<Chip ` trong **hàng chip đầu trang** | `4` | **`3`** | địa điểm + ca + loại hình còn lại; chỉ chip ngành mất |
| `<Chip ` **cả trang** | `6` | **`5`** | 4 ở hàng đầu + 2 trong danh sách vị trí ở dưới |
| token `industry` trên nguồn **THÔ** | `1` | **`0`** | file test đọc raw nên comment cũng bị tính |
| `icon="factory"` | `1` | **`0`** | icon riêng của chip ngành |
| `<Chip icon="work" label={JOB_TYPE_LABELS[job.jobType]} />` | `1` | **`1`** | mốc bảo toàn, so nguyên văn |

**Vì sao phép đếm phải có phạm vi.** Tôi viết sai chỗ này ở `STEP-01` và tự bắt được trước GREEN: tôi giả định cả trang có 4 chip nên viết `expect(page.split('<Chip ').length - 1).toBe(3)`; `grep -n '<Chip'` cho **6** (4 ở hàng đầu tại dòng 135-138, 2 trong danh sách vị trí tại dòng 177-178). Một phép đếm toàn file **không phân biệt được** "bỏ chip ngành" với "bỏ một chip của vị trí" — nó sẽ xanh cho cả hai. Hàng rào đã sửa, `public-detail.static.test.ts:128-132`, đo ba thứ cùng lúc:

```ts
    const fromChipRow = page.slice(page.indexOf('<div className="mt-4 flex flex-wrap items-center gap-2">'));
    const chipRow = fromChipRow.slice(0, fromChipRow.indexOf('</div>'));
    expect(chipRow.split('<Chip ').length - 1).toBe(3);
    expect(chipRow).toContain('<Chip icon="work" label={JOB_TYPE_LABELS[job.jobType]} />');
    expect(page.split('<Chip ').length - 1).toBe(5);
```

Sau khi sửa, tôi chạy lại RED (lần 2, §3.1) để chắc assertion **đã sửa** vẫn là hàng rào thật — chứ không phải một hàng rào tôi vừa nới cho vừa với mã.

**Đọc `AC-01` thế nào.** Mặt chữ là "Nguồn trang chi tiết còn đúng một chip". Đọc trần trụi thì nó đòi trang chỉ còn **một** `<Chip `, tức phải xoá cả chip địa điểm, chip ca, và hai chip của danh sách vị trí — điều đó trái `RQ-01` ("chip loại hình công việc còn nguyên vị trí và nguyên nhãn"), trái `DEC-07`, và trái `Non-goals` ("không sửa chip loại hình công việc"). Tôi đọc `AC-01` là **"còn đúng một chip loại hình công việc, và không còn chip ngành"** và thi hành theo đó. Nếu Tier 1 có ý khác thì mục này là chỗ để bác lại — số đo đã đủ để quyết mà không cần chạy lại gì (`DEV-02` §5).

### 3.6 `AC-07` / `RQ-07` — ba file admin không đổi một byte, và diff service đầy đủ

`RISK-04` là bẫy trùng tên: `ClientCompany.industry` là **cột thật**, do người nhập, principal nội bộ đọc. Nó chỉ trùng tên với khoá DTO tôi vừa bỏ.

```
$ git diff --numstat -- app/admin/clients app/api/clients prisma
                                   # rỗng — không dòng nào
$ sha256sum app/admin/clients/page.tsx 'app/api/clients/[id]/route.ts' app/api/clients/route.ts
85f51ff11bd3516fb988a1e78232e0dde78b7b75065722217447c206e07f25de *app/admin/clients/page.tsx
827a5b098b32113d272acd305cf54d8ed2ec6a12897839028542ebd21b68a743 *app/api/clients/[id]/route.ts
8c5e9ee7d3ec34290668c4cd023f75dbb9a2fffc6fca388838b8699baff23171 *app/api/clients/route.ts
```

Ba băm này **khớp từng ký tự** với kiểm kê `STEP-00` chạy trước khi tôi sửa dòng đầu tiên. Thêm một phép đo ngược để chắc tôi không "dọn lây" rồi khôi phục: ba file **vẫn còn** cột thật.

```
$ grep -rc "industry" app/admin/clients/page.tsx 'app/api/clients/[id]/route.ts' app/api/clients/route.ts
app/admin/clients/page.tsx:5
app/api/clients/[id]/route.ts:2
app/api/clients/route.ts:2
```

`prisma/schema.prisma` và `prisma/seed.mjs` cũng còn nguyên `industry` của `ClientCompany` — `numstat` trên `prisma` rỗng, và `§4.2` cấm chạm.

**Diff service, không context, đủ 6 hunk / `21 18`:**

```diff
$ git diff -U0 -- src/domains/job-board/public.service.ts
@@ -10,0 +11,7 @@   + 7 dòng docblock PublicJobDto: ghi vì sao khoá `industry` bị bỏ và vì sao
                    `ClientCompany.industry` KHÔNG phải nguồn của nó (FORCE RLS, `MKT` không có policy đọc)
@@ -19 +25,0 @@     -  industry: string;
@@ -48,5 +54,6 @@   ~ docblock PublicJobFacets: câu cũ nói `inferIndustry` đang tồn tại → nay ghi hàm
                    và khoá đều đã bị bỏ nên không còn giá trị nào để dựng lại facet ngành
@@ -162,9 +168,0 @@  - function inferIndustry(text, fallback) { … }   ← 8 dòng thân + 1 dòng trắng
@@ -257 +255,8 @@   ~ docblock searchableTextOf: một dòng "Text để suy `industry` và `jobType`" → khối
                    ghi rằng text này TỪNG nuôi nhãn ngành và đó là lỗi (`order.description` là văn HR
                    nội bộ — `EV-04`), nay chỉ còn nuôi `classifyJobType`
@@ -308 +312,0 @@   -    industry: inferIndustry(searchableText, null),      ← toDto
@@ -363 +366,0 @@   -    industry: inferIndustry(searchableText, null),      ← toDetailDto
```

Thân hàm bị xoá, nguyên văn từ `git show be95e7c:src/domains/job-board/public.service.ts | sed -n '162,170p'`:

```ts
function inferIndustry(text: string, fallback: string | null): string {
  const folded = foldVietnamese(`${text} ${fallback ?? ''}`);
  if (/kho|van tai|logistic|warehouse/.test(folded)) return 'Kho vận';
  if (/may mac|may cong nghiep|garment|sewing/.test(folded)) return 'May mặc';
  if (/thuc pham|food/.test(folded)) return 'Thực phẩm';
  if (/dien|dien tu|electronic|electric/.test(folded)) return 'Điện tử';
  return fallback?.trim() || 'Công nghiệp chế tạo';
}
```

Hai điều đáng ghi lại về hàm này, vì chúng là lý do `DEC-01` chọn bỏ thay vì cấp nguồn:

- `fallback` luôn được gọi bằng `null` ở **cả hai** mapper (`EV-02`), nên nhánh `fallback?.trim()` **chưa bao giờ** chạy. Mọi việc làm không khớp bốn regex đều nhận `'Công nghiệp chế tạo'` — một nhãn đặt cứng, in cho khách ẩn danh, không có gì phía sau.
- Regex `/dien/` khớp cả `dien` trong `dien tu` lẫn `dien` trong `dien lanh`, `dien nuoc`, và `/kho/` khớp mọi chữ chứa `kho` sau khi gập dấu. Nhãn không chỉ bịa, nó còn bịa theo cách không ổn định trước một lượt sửa mô tả của HR (`EV-04`).

### 3.7 Dòng cho `RISK-05` — chuỗi bằng chứng của câu "response công khai đã MẤT khoá `industry`"

Đây là mục Tier 1 cần để relock go-live-09. Câu ở §1 đứng trên **sáu** phép đo độc lập, xếp từ định nghĩa kiểu xuống tới thân response:

1. **Kiểu của response.** `PublicJobDto` là kiểu trả về của `toDto`, và `PublicJobDetailDto extends PublicJobDto`, nên **cả hai** route công khai cùng chịu. Đếm khoá trên chính interface: `14`. Danh sách đầy đủ, đúng thứ tự trong file:

   ```ts
   id, slug, title, position, shift, location, shiftType, jobType,
   availableSlots, deadline, statusLabel, positionTitles, locations, shifts
   ```

2. **Cả hai mapper.** `grep -n "industry:" src/domains/job-board/public.service.ts` → `EXIT=1`, rỗng. Hai dòng gán đã mất ở `toDto` **và** `toDetailDto` (§3.6). Sửa một mapper mà quên mapper kia là bẫy `RQ-02` nêu tên; ở đây cả hai đã sửa và `numstat` chứng minh chỉ có hai dòng gán bị bỏ.

3. **Object THẬT do mapper trả về, không phải fixture.** `public-card-truth.test.ts` gọi mapper thật qua `onlyJob(...)` với `tx` mock, rồi so `Object.keys(job).sort()` bằng `toEqual` với đúng 14 khoá — `toEqual` trên mảng đã sort là phép so **hai chiều**, nên **không** có khoá thừa nào lọt được. Cộng `expect(job).not.toHaveProperty('industry')`. GREEN.

4. **Service thật, hai văn bản dự án khác nhau.** `mp1.contract.test.ts` gọi `listPublicJobProjection` (mã service thật, `tx` mock) trên hai văn bản — một mang `dien tu`, một không — và nhận **cùng một tập khoá**, cả hai `not.toHaveProperty('industry')` (§3.3). Trước `STEP-02`, cùng phép đo cho hai payload khác nhau.

5. **Thân response của cả hai route.** `marketplace-browse.routes.test.ts` gọi handler thật của `GET /api/jobs` và `GET /api/jobs/[slug]`, đọc `await res.json()` rồi đo trên **thân đã serialize**:

   ```ts
   // GET /api/jobs        (:151-152)
   expect(Object.keys(body.jobs[0])).not.toContain('industry');
   expect(JSON.stringify(body)).not.toContain('industry');
   // GET /api/jobs/[slug] (:242-243)
   expect(Object.keys(body.job)).not.toContain('industry');
   expect(JSON.stringify(body)).not.toContain('industry');
   ```

   Phép thứ hai là phép quét chuỗi trên toàn payload, nên nó bắt cả trường hợp khoá bị nhét vào một object lồng bên trong. GREEN cho cả hai route.

6. **`tsc` chốt lại phía consumer.** Fixture `const PUBLISHED_JOB: PublicJobDto = { … }` là **object literal có kiểu**, nên excess-property check của TypeScript biến một khoá `industry` còn sót thành **lỗi biên dịch**. Đây là một trong rất ít chỗ `tsc` thật sự chặn được việc bỏ một khoá DTO công khai — thường thì consumer tự khai interface cục bộ rồi cast `res.json()` và typecheck vẫn xanh (bài học đã biết của dự án). `npm run typecheck` **EXIT=0** nghĩa là không còn chỗ nào trong repo gán hay đọc khoá đó qua kiểu công khai.

**Giới hạn của chuỗi trên, nói rõ để Tier 3 không phải đoán:** không có phép đo nào ở đây chạy trên DB production hay trên URL đang sống. Task này `§4.3` ghi "Không cần DB để đo task này", và tôi không chạm DB. Phép đo gần "thật" nhất là `public-card-truth.integration.test.ts` (DB thật, branch test) — file đó **đã sửa và đã typecheck**, nhưng **không** chạy ở lane unit nên không có mặt trong `1567` (`LIM-01`). Vì vậy câu đúng là: *mã của cả hai route công khai không còn sinh ra khoá đó, và điều này được đo trên mapper thật, service thật và handler thật với `tx` mock* — không phải *tôi đã gọi vào production và thấy khoá biến mất*.

### 3.8 Bốn mốc `EV` của contract, đối chiếu trên đúng baseline

Contract neo bốn mốc vào `be95e7c`. Tôi đọc chúng bằng `git show` chứ không bằng cây làm việc, để chắc mình sửa đúng thứ contract mô tả:

| `EV` | Mốc contract | Đọc trên `be95e7c` | Khớp? |
|---|---|---|---|
| `EV-03` | `public.service.ts:19` là khoá `industry` của projection | `  industry: string;` | ✓ |
| `EV-01` | `public.service.ts:162` là `inferIndustry` | `function inferIndustry(text: string, fallback: string \| null): string {` | ✓ |
| `EV-02` | `:308` và `:363` cùng gọi `inferIndustry(searchableText, null)` | cả hai dòng là `    industry: inferIndustry(searchableText, null),` | ✓ |
| `EV-05` | Trang chi tiết dòng 138 là chỗ render duy nhất | `          <Chip icon="factory" label={job.industry} />` | ✓ |

Và `git diff --name-only be95e7c..HEAD` chỉ có ba file, **toàn bộ dưới `docs/`**, nên baseline mã của contract **bằng** `HEAD` mà tôi làm việc trên đó:

```
docs/PLANNER_HANDOVER.md
docs/tasks/hrp-v5-go-live-05-public-card-truth/HANDOFF.md
docs/tasks/hrp-v5-go-live-14-industry-label-truth/TASK.md
```

---

## 4. Changed Deliverables

Chín file, **không** file nào được tạo mới, **không** file nào bị xoá. Cột `sha256` là 12 ký tự đầu của trạng thái SAU; bản đầy đủ ở §3.2.

### 4.1 Hai file mã (`§4.2` của contract cho phép)

| File | Thay đổi | Tại sao cần | Neo |
|---|---|---|---|
| [public.service.ts](src/domains/job-board/public.service.ts) — `21 18`, 501 dòng, 26282 byte, `32c6a1fd85fa` | Bỏ khoá `industry` khỏi `PublicJobDto`; **xoá hẳn** hàm `inferIndustry`; bỏ hai lời gọi trong `toDto` và `toDetailDto`; viết lại ba docblock cho khớp thực tế mới | Đây là nơi nhãn được **bịa ra** và là nơi nó **vào payload**. Bỏ ở tầng DTO nên cả hai route công khai cùng mất khoá một lượt | §3.6 (diff đủ 6 hunk + thân hàm đã xoá, verbatim) |
| [page.tsx](app/(jobs)/viec-lam/[slug]/page.tsx) — `0 1`, 186 dòng, 8913 byte, `3e0bb694d678` | Bỏ đúng một dòng: chip `icon="factory"` render `job.industry` | Đây là nơi **mắt khách** nhìn thấy nhãn bịa. Không bỏ thì `tsc` sẽ đỏ, mà bỏ muộn thì trang vẫn in nhãn | §3.5 (kế toán chip + kế toán byte đã khép: 54 + CRLF = 56 = 8969 − 8913) |

Trang danh sách **không** nằm trong danh sách này vì nó chưa bao giờ render nhãn — đã kiểm và ghi ở §3.5.

### 4.2 Bảy file test (uỷ quyền tường minh, `RISK-01`)

| File | Vai trò trong hàng rào | Thay đổi | Neo |
|---|---|---|---|
| [public-card-truth.test.ts](src/domains/job-board/public-card-truth.test.ts) — `8 1`, 463 dòng, `a613f4db80aa` | **Allow-list khoá #2** — mapper thật, lane unit | 14 khoá trong `PUBLIC_KEYS`; thêm `not.toContain` trên chính allow-list và `not.toHaveProperty` trên DTO | §3.3 |
| [public-card-truth.integration.test.ts](src/domains/job-board/public-card-truth.integration.test.ts) — `22 12`, 380 dòng, `624eb01359f1` | **Allow-list khoá #1** — DB thật, ngoài lane unit | Mảng inline hạ xuống 14 khoá; thêm `not.toHaveProperty`; đổi tiêu đề `it` sang '14 khóa' | §3.3, `LIM-01` |
| [marketplace-inventory.static.test.ts](src/domains/applications/marketplace-inventory.static.test.ts) — `10 5`, 393 dòng, `08b9aa3440a5` | Hàng rào **chống đổi tên** trên service (đọc qua `strip`) | Bốn phủ định: tên khoá, tiền tố `infer`, bảy từ khoá regex, năm nhãn cứng | §3.4 |
| [public-select.static.test.ts](src/domains/job-board/public-select.static.test.ts) — `7 2`, 72 dòng, `9dacf91c2a8a` | Phân biệt "bỏ nhãn" với "bỏ luôn đường ống text" | Một phủ định `industry` + một **giữ dương** `classifyJobType(searchableText, slots)` | §3.4, `DEC-07` |
| [public-detail.static.test.ts](src/domains/job-board/public-detail.static.test.ts) — `16 2`, 232 dòng, `a5318c3b05bf` | Hàng rào trên **trang đọc RAW** (kể cả trong comment) | Phủ định `industry` và `icon="factory"`; đếm chip **theo hàng** thay vì theo cả trang | §3.5, `DEV-02` |
| [mp1.contract.test.ts](src/domains/job-board/mp1.contract.test.ts) — `30 15`, 158 dòng, `36062b3d62aa` | Test **từng nói dối** (`EV-11`) | Đổi tên và **đảo dấu**: hai văn bản dự án khác nhau phải cho **cùng** tập khoá, và cả hai không có `industry` | §3.3 |
| [marketplace-browse.routes.test.ts](src/domains/applications/marketplace-browse.routes.test.ts) — `17 3`, 330 dòng, `aad1de93d808` | Hàng rào trên **response thật của handler** | Phủ định trên `Object.keys` và trên `JSON.stringify` của **cả hai** route công khai | §3.7 |

File test **thứ tám** không bị chạm: numstat toàn cây ở §3.2 liệt kê đúng chín file, và bảy dòng test trong đó trùng khít bảy đường dẫn `§4.2` cho phép.

---

## 5. Deviations, Limitations và Blockers

**Blockers: không có.** Sáu `STEP` đều `DONE`, bốn cổng đều xanh trên đúng trạng thái byte cuối. Hai deviation dưới đây là **lệch mặt chữ của AC**, không lệch hành vi; tôi khai ra thay vì lặng lẽ làm cho chữ xanh.

### `DEV-01` — `AC-03` đọc theo mặt chữ trả **2**, không phải 0

`AC-03` viết: "grep `inferIndustry` trong `src` và `app` trả 0". Đo thật:

```
$ git grep -n "inferIndustry" -- src app
src/domains/applications/marketplace-inventory.static.test.ts:320:    // `function inferIndustry(` và `industry: inferIndustry(searchableText, null)` VẪN PHẢI CÒN, tức
src/domains/job-board/public-select.static.test.ts:65:    // go-live-14 / RQ-02, DEC-05, DEC-07 — khẳng định cũ `toContain('inferIndustry(searchableText,
count=2
```

**Cả hai hit đều là comment `//`**, trong hai file test được `§4.2` uỷ quyền, và cả hai chỉ **ghi lại khẳng định cũ mà tôi đã đảo dấu**. Đó chính là thứ `DEC-05` đòi: khẳng định bị bỏ phải được thay bằng khẳng định phủ định, kèm dấu vết đọc được — chứ không xoá trắng.

Tôi **cố ý giữ** hai comment đó. Xoá chúng thì `AC-03` xanh đúng mặt chữ nhưng mất dấu vết `RQ-04`/`DEC-05`, tức là đổi một hàng rào thật lấy một chữ xanh. Phép đo tương đương, bỏ dòng comment:

```
$ git grep -n "inferIndustry" -- src app | grep -vE ':[0-9]+: *(//|\*)'
$ echo count_noncomment=$(git grep -n "inferIndustry" -- src app | grep -vcE ':[0-9]+: *(//|\*)')
count_noncomment=0
```

Và hàng rào **bền** mà `RQ-03` thực sự cần không phải là vắng một tên hàm, mà là vắng bảy từ khoá regex cùng năm nhãn cứng — đã đo ở §3.4 và trả 0 trên **mã đã strip comment**. Một `inferSector` trả về đúng năm nhãn cũ vẫn FAIL, đó mới là chỗ đáng khoá.

Tier 3 quyết `AC-03` là PASS-với-deviation hay FAIL: dữ kiện đầy đủ ở trên, tôi không tự phán.

### `DEV-02` — "còn đúng một chip" ở `AC-01`/`STEP-03` đọc theo `RQ-01`

Mặt chữ `AC-01` là "Nguồn trang chi tiết còn đúng một chip". Hàng chip sau khi sửa còn **ba** chip, cả trang còn **năm**. Tôi đọc câu đó theo `RQ-01` — câu duy nhất nói rõ ý định: "Chip ngành nghề bị bỏ khỏi trang chi tiết việc làm; chip loại hình công việc còn nguyên vị trí và nguyên nhãn". Tức "còn đúng một chip" là **cặp (ngành nghề, loại hình) rút về một**, không phải cả trang còn một chip.

Đo hai đầu:

| Phép đếm | `be95e7c` | Sau khi sửa |
|---|---|---|
| `<Chip ` trong hàng chip | 4 | 3 |
| `<Chip ` cả trang | 6 | 5 |
| Chip của cặp (ngành nghề, loại hình) | 2 | **1** |

Chip `icon="work" label={JOB_TYPE_LABELS[job.jobType]}` còn **nguyên vị trí thứ ba và nguyên nhãn** — kiểm bằng khẳng định `toContain` nguyên văn cả dòng ở §3.5, không phải bằng đếm suông. Nếu Tier 1 thật sự muốn cả trang còn một chip thì đó là một task khác hẳn (bỏ cả địa điểm, thời gian, loại hình), trái `RQ-01` và trái `DEC-07`.

### `LIM-01` — allow-list #1 không thể xuất hiện trong số đếm lane unit

[public-card-truth.integration.test.ts](src/domains/job-board/public-card-truth.integration.test.ts) nằm trong `INTEGRATION_TEST_FILES` mà `vitest.unit.config.ts` **exclude**, nên 14 khoá và `not.toHaveProperty` của nó **không** đóng góp vào `1567 passed` ở §3.1. Nó vẫn được `tsc` kiểm (typecheck EXIT=0 quét cả file này), và tôi đã dán nguyên văn vùng `:243-266` ở §3.3 để Tier 3 đọc mắt. Muốn chạy thật thì phải cấp DB test `hrp_mp2_test` — ngoài phạm vi round này.

### `LIM-02` — "mất khoá" đo trên handler và mapper, **không** đo trên deploy

Dòng `RISK-05` ở §1 dựa vào sáu phép đo ở §3.7: response của handler thật, tập khoá của mapper thật, allow-list, và `tsc`. Tôi **không** có quyền deploy (`R-01`, `RQ-10`), nên **chưa** có phép đo HTTP trên production. Nếu go-live-09 cần bằng chứng live thì đó là một bước OP của Owner sau khi `main` được push, không phải thứ round này khép được.

### Tự sửa trong round, ghi lại cho đủ

Khẳng định chip ở `STEP-01` ban đầu tôi viết là đếm `<Chip ` **cả trang** rồi `toBe(3)`. Sai: cả trang có 6 chip ở baseline nên khẳng định đó RED vì lý do bịa, và sau khi sửa mã nó vẫn RED. Tôi đổi sang **đếm theo hàng chip** (slice từ `<div className="mt-4 flex flex-wrap items-center gap-2">` tới `</div>` gần nhất) cộng một phép đếm cả trang `toBe(5)` làm chốt, rồi **chạy lại RED** trên cây chưa sửa mã trước khi sang GREEN. Cả hai lần RED có ở §3.1.

---

## 6. Evidence Index

Log của round này nằm trong `%TEMP%/gl14`, là thư mục **ephemeral** — Tier 3 không nên trỏ vào đó. Nên index dưới đây ghi **lệnh chạy lại được** trên đúng cây làm việc hiện tại, kèm kết quả tôi đã thu và mục đã dán nguyên văn.

### 6.1 Bốn cổng, chạy lại được nguyên trạng

| `EVI` | Lệnh | Kết quả đã thu | Dán ở |
|---|---|---|---|
| `EVI-01` | `& .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-v5-go-live-14-industry-label-truth\TASK.md` | `RESULT: PASS`, `EXIT_VERIFY_TASK=0` | §3 dòng đầu bảng AC |
| `EVI-02` | `npm run typecheck` | `EXIT=0`, không output lỗi | §3 (`AC-05`), §3.7 |
| `EVI-03` | `npm run test:unit` | `EXIT=0` — `101 passed (101)` file, `1567 passed (1567)` test, 31.85s | §3.1 (GREEN) |
| `EVI-04` | `npm run lint` | `✖ 496 problems (0 errors, 496 warnings)` — bằng HEAD, không thêm error | §3 (`AC-06`) |
| `EVI-05` | `npm run build` | `✓ Compiled successfully in 7.0s`, `✓ Generating static pages (29/29)` | §3 (`AC-06`) |

`EVI-03` là lane **canonical**. `npx vitest run` trần đọc `DATABASE_URL` từ `.env` (= PRODUCTION) và fail oan 24 test component — đừng dùng nó để phản biện số đếm ở §3.1.

### 6.2 Phép đo, chạy lại được

Nhóm RED/GREEN — `DEC-08`, số đếm ở §3.1:

```
git stash push -- src/domains/job-board/public.service.ts "app/(jobs)/viec-lam/[slug]/page.tsx"
npm run test:unit          # RED: 9 failed + 1558 passed = 1567
git stash pop
npm run test:unit          # GREEN: 0 failed + 1567 passed = 1567
```

Tổng **1567 = 1567** ở hai đầu là phép chứng cho `DEC-05`: khẳng định **đổi dấu**, không bị xoá.

Nhóm hàng rào chống đổi tên — `RQ-03`, §3.4. **Đọc kỹ cột kết quả**: hai lệnh đầu trả khác 0, và đó là đúng như §3.4 mô tả — hit còn lại là comment tài liệu, không phải mã:

```
$ git grep -n "inferIndustry" -- src app
  -> 2  — cả hai là comment `//` trong file test được uỷ quyền (DEV-01)
$ git grep -nE "Kho vận|May mặc|Thực phẩm|Điện tử|Công nghiệp chế tạo" -- src/domains/job-board/public.service.ts
  -> 1  — public.service.ts:14, comment mô tả cái vừa bị bỏ
$ git grep -nE "may mac|thuc pham|van tai|logistic|warehouse|garment|sewing" -- src/domains/job-board/public.service.ts
  -> 0
$ git grep -n "job.industry" -- app
  -> 0  (AC-01)
```

Phép đo mà §3.4 **thật sự** khẳng định là đo trên nguồn **đã bỏ comment**, và nó không cần chạy tay: chính `marketplace-inventory.static.test.ts:325-328` áp `strip` rồi assert, nên `EVI-03` là chỗ nó được thi hành. Muốn thấy số bằng mắt thì tái lập trực tiếp:

```
node -e "const fs=require('fs');const s=fs.readFileSync('src/domains/job-board/public.service.ts','utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*\$/gm,'');const c=(re)=>(s.match(re)||[]).length;console.log('industry',c(/industry/gi),'infer',c(/infer/gi),'kw',c(/may mac|thuc pham|van tai|logistic|warehouse|garment|sewing/g),'labels',c(/Kho vận|May mặc|Thực phẩm|Điện tử|Công nghiệp chế tạo/g),'classify',c(/classifyJobType\(searchableText, slots\)/g),'searchableText',c(/searchableText/g));"
```

```
industry 0 infer 0 kw 0 labels 0 classify 2 searchableText 7
```

Nhóm khoá công khai — `RISK-05`, §3.7:

```
grep -nE "not.toContain\('industry'\)|not.toHaveProperty\('industry'\)" src/domains/applications/marketplace-browse.routes.test.ts src/domains/job-board/public-card-truth.test.ts
sed -n '19,44p' src/domains/job-board/public.service.ts        # PublicJobDto — đếm được 14 khoá
sed -n '405,422p' src/domains/job-board/public-card-truth.test.ts
sed -n '243,266p' src/domains/job-board/public-card-truth.integration.test.ts
```

Nhóm biên phạm vi — `AC-07`, §3.6:

```
git diff --numstat -- app/admin/clients app/api/clients prisma      # rỗng
sha256sum app/admin/clients/page.tsx "app/api/clients/[id]/route.ts" app/api/clients/route.ts
git grep -c "industry" -- app/admin/clients app/api/clients        # 5 / 2 / 2 — cột THẬT còn nguyên
```

Nhóm baseline — §3.8:

```
git show be95e7c:src/domains/job-board/public.service.ts | sed -n '19p;162p;308p;363p'
git show "be95e7c:app/(jobs)/viec-lam/[slug]/page.tsx" | sed -n '138p'
git diff --name-only be95e7c..HEAD
```

### 6.3 Trạng thái git, chạy lại được

```
git rev-parse HEAD                    # f911cd36eff7dd726d3c506f4afd5d01b5d70449
git rev-parse origin/main             # f911cd36eff7dd726d3c506f4afd5d01b5d70449
git rev-list --count origin/main..HEAD   # 0  — chưa commit gì
git diff --cached --numstat            # rỗng — chưa stage gì
git diff --numstat                     # 13 dòng, bảng đầy đủ ở §3.2
```

---

## 7. Execution Round History

| Round | Spec | Baseline | Kết cục | Ghi chú |
|---|---|---|---|---|
| 1 | `v1.0` | `be95e7c` | `READY_FOR_AUDIT` | Round đầu và duy nhất. Sáu `STEP` `DONE`, bốn cổng xanh, hai deviation mặt chữ khai ở §5. Không có round trước, không có `REVISION_REQUIRED` nào để đóng |

**Kiểm spec có bị bump giữa round hay không** (luật đọc-lại-TASK): tôi đọc lại `TASK.md` sau khi sửa xong mã, trước khi viết HANDOFF:

```
sha256  72687b7db632281733dc7a3d2b03b8cc37017ee592d92b17e8158be578b4d235
dòng    204
byte    19087
git log --oneline -- .../TASK.md   -> chỉ a49ddd9
git diff --numstat -- .../TASK.md  -> rỗng
```

Tức spec vẫn là `v1.0`, **không có bump giữa round**, và mọi `AC` tôi đối chiếu ở §3 là `AC` của đúng bản contract mà Tier 1 giao.

**Những gì round này KHÔNG làm**, để Tier 3 không phải đi tìm:

- Không commit, không stage, không push, không deploy — `AC-10`, `R-01`, `DEC-09`, `RQ-10`. `git rev-list --count origin/main..HEAD` = `0`.
- Không chạm `app/admin/clients`, `app/api/clients`, `prisma/**` — `AC-07`, ba `sha256` khớp từng ký tự.
- Không chạm file test thứ tám — `AC-04`, numstat toàn cây đúng chín file.
- Không chạm `.env`, `vercel.json`, `middleware.ts`, và không chạm bốn file bẩn sẵn của lane khác (ba `AUDIT.md` + `public/index.html`) — chúng giữ nguyên numstat `1 0` / `97 59` như lúc tôi nhận cây.
- Không áp migration nào, không chạm DB nào — round này thuần mã và test tĩnh.

---

> **Handoff status: READY_FOR_AUDIT**
>
> Tier 3 đọc `TASK.md` `v1.0` + văn bản này rồi audit độc lập. Hai điểm tôi đề nghị soi trước: `DEV-01` (`AC-03` mặt chữ trả 2, cả hai là comment — PASS-với-deviation hay FAIL là quyết định của Tier 3, không phải của tôi) và `DEV-02` (cách đọc "còn đúng một chip" theo `RQ-01`). Cây làm việc để **nguyên** trạng chưa commit theo yêu cầu.
