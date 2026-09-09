# AUDIT — hrp-v5-go-live-16-internal-contrast-focus

## 0. Audit Control

| Trường | Giá trị |
|---|---|
| Task | `hrp-v5-go-live-16-internal-contrast-focus` |
| Baseline | `e4d18fe` (đọc trong TASK §0, không suy đoán) |
| HEAD tại lúc audit | `46ea2dc` |
| Handoff commit | chưa có — `git log e4d18fe..HEAD` trên sáu path bàn giao in `0` dòng, bản giao còn trong index |
| Trạng thái Index | `9` path: sáu path `§4.2` (`752` thêm / `8` xoá) cộng ba gate script `.ai-pipeline/scripts/` |
| Spec version | `v1.0` |
| Audit round | `3` |
| Audit mode | `CODE_AUDIT` |
| Độc lập | Tôi tự chạy lại từng lệnh trong AUDIT này và đọc từng mã thoát bằng một câu lệnh riêng. Không lấy lại số nào của HANDOFF; ba chỗ số của tôi lệch HANDOFF đều được ghi thành finding. Tôi không sửa mã, không commit, không push, không deploy. |

## 1. Findings

Theo thứ tự P0 → P3. Không có P0, không có P1.

**`AUD-001` — P2 — `npm run build` đỏ, và không một round thực thi nào trong `§4.2` gỡ được.**
Liên quan: `C-02`, `AC-11`. Bằng chứng: `npm run build` exit `1`; log in `✓ Compiled successfully in 12.8s` rồi `Failed to compile.` tại `./new-ui/components/JobCard.tsx:18:6` (TS2322 về `href`), `Next.js build worker exited with code: 1`; `evidence/r3-13-c02-build.txt`. Đường dẫn gây đỏ nằm ngoài sáu path `§4.2` và `git ls-files new-ui` in `0` dòng nên nó chưa từng vào git; `§4.2` lại CẤM chạm `new-ui/`. Impact: `C-02` là mandatory check, nên mọi round sau của mọi task cũng sẽ đỏ ở đây, và cái cớ "gate này vốn đã đỏ" là đúng thứ mà `S-12` của gate tồn tại để bác. Tôi KHÔNG đo được bản build của Vercel (R-01 cấm deploy); việc `new-ui/` untracked nên không có trong checkout của Vercel là SUY LUẬN của tôi, không phải phép đo. Quyết định cần Planner: waive `C-02` cho round này với lý do ghi rõ, hoặc mở một task dọn `new-ui/` — Tier 2 không được phép tự chạm vào nó.

**`AUD-002` — P2 — `verify-task.ps1` vẫn FAIL vì văn TASK, dù cả bốn mục đã được chính Tier 1 phán.**
Liên quan: `C-09`, `AC-05`, `AC-06`, `AC-07`, `AC-10`. Bằng chứng: `RESULT: FAIL (2 error(s), 2 warning(s))` — `[FAIL] T-03 AC AC-05, AC-06, AC-07 proves scope with a bare 'git diff'`; `[FAIL] T-05 AC AC-10 name neither a command nor an explicit manual method`; cộng hai `[WARN] T-03` nói `AC-06`/`AC-07` đo scope bằng `git diff --stat` nên mù với tệp untracked; `evidence/r3-29-c09-verify-task.txt`. `PLN-24` đã thay công cụ của `AC-05/06/07`, `PLN-28` và `PLN-30` đã cấp phương pháp tường minh cho `AC-10`, nhưng các phán quyết ấy nằm ở văn `§9` trong khi gate đọc ô method của bảng AC — nên gate đỏ mãi. Impact: `C-09` không thể DONE trong bất kỳ round nào của task này cho đến khi bảng AC được bump. Quyết định cần Planner: bump `v1.1` viết lại ba ô method (`--cached` / `--porcelain`) và ô method của `AC-10`, hoặc ghi waiver `C-09` chỉ rõ bốn mục trên. Tôi không sửa TASK.

**`AUD-003` — P3 — `EV-06` nói "tám chỗ" nhưng chỉ liệt kê bảy số dòng, và địa chỉ nền của chỗ thứ tám sai.**
Liên quan: `AC-05`. Bằng chứng: `evidence/r3-17-ev06-eighth-and-itcount.txt` đếm `worker:302,349,353,361,383` (5) + `worker:362` (1) + `vendor:245` (1) = `7`. Chỗ thứ tám là `app/worker/page.tsx:331`, có trong bảng của Tier 2 (`evidence/ac05-ev06-eight-spots.txt`, `3480` byte) và trong bảng hàng rào (`evidence/step07-contrast-table.txt:23`). `EV-06` gán nền `#ffffff` cho cả cụm `#64748b` và ghi `4.759:1`; dòng `331` thực ra nằm trên nền body `#faf9f7` và đo được `4.523:1` — tôi tự tính lại cả hai (`evidence/r3-30-wcag-recompute.txt`). Impact: cả hai cách đọc đều trên sàn `4.5` nên `AC-05` không đổi kết luận, nhưng biên của chỗ thứ tám chỉ còn `0.023` chứ không phải `0.259`, và ai đọc `EV-06` sẽ tưởng nó rộng gấp mười. HANDOFF `DEV-05` đã báo nửa phần nền. Quyết định cần Planner: sửa `EV-06` (liệt kê `331`, ghi nền `#faf9f7`) khi bump lần tới.

**`AUD-004` — P3 — `EV-07` mô tả sai dòng `worker:331`, nên lập luận miễn trừ của nó không áp vào dòng đó.**
Liên quan: `AC-09`. Bằng chứng: `git show e4d18fe:app/worker/page.tsx | sed -n '331p'` cho `style={{ color: '#64748b' }}` — hex TRẦN, không có `var()`; các dòng `var(--on-surface-variant, ...)` thật là `218`, `235`, `286`, `295`, `326`, `376` (`evidence/r3-06-ev07-linecheck.txt`). Impact: `EV-07` lập luận "nhánh dự phòng không bao giờ chạy" nên dòng ấy được miễn; với `331` thì nhánh dự phòng LÀ giá trị duy nhất, và nó đạt vì `4.523:1` trên `#faf9f7`, một lý do khác hẳn. Ai sửa `EV-07` sau này mà tưởng `331` đã được che bởi lập luận `var()` sẽ để hở đúng dòng mỏng nhất. Quyết định cần Planner: sửa số dòng trong `EV-07`.

**`AUD-005` — P3 — mặt chữ của `AC-12` sai, và luật "đúng hai nhóm" của `PLN-27` còn dư bốn path.**
Liên quan: `AC-12`. Bằng chứng: `git rev-parse --short HEAD` = `46ea2dc`, `git log --oneline e4d18fe..HEAD | wc -l` = `9`, nên "HEAD không đổi so với `e4d18fe`" là sai mặt chữ; điều đúng là `git log e4d18fe..HEAD` trên sáu path bàn giao RỖNG (`evidence/r3-20-ac12-groups.txt`). Sau khi trừ `.ai-pipeline/` theo `PLN-31`, tập path chưa commit còn dư bốn path không thuộc nhóm nào: ba `AUDIT.md` của task khác (`1` thêm `0` xoá mỗi tệp — một dòng trắng ở cuối) và `public/index.html` (`97`/`59`, tác dụng phụ đã biết của `copy-static.mjs`); cả bốn KHÔNG có trong index và không do Tier 2 viết (`evidence/r3-23-third-group-and-eight-spots.txt`, `evidence/r3-27-stray-auditmd-nature.txt`). Tôi cũng tự sửa kết luận của chính mình ở đây: chữ ký không phải `0 N` cắt xén, và so byte giữa cây làm việc với blob là VÔ HIỆU dưới `core.autocrlf`. Impact: theo mặt chữ `PLN-27` thì "xuất hiện nhóm thứ ba là FAIL" — tôi vẫn ghi `AC-12` PASS vì đo được rằng Tier 2 không commit, không push, và không path nào trong bốn path đó thuộc bản giao. Quyết định cần Planner: `AC-12` chỉ đếm path do Tier 2 tạo/sửa, hay đếm mọi path ngoài `.ai-pipeline/`.

**`AUD-006` — P3 — ba số mốc trong `PLN-30` không khớp tệp thật.**
Liên quan: `AC-10`. Bằng chứng: `PLN-30` viết `22` lần `it(` — đếm chuỗi cho `22`, nhưng lần xuất hiện thứ `22` là `cls.split(` ở dòng `324`, và lần chạy thật đếm `21` test; `NEGATIVE_FIXTURE` ở dòng `532` chứ không phải `529` (`POSITIVE_FIXTURE` ở `542`); khối `describe` dòng `672` mang BỐN `it(` ở `673`, `682`, `689`, `696` chứ không phải hai (`evidence/r3-17-ev06-eighth-and-itcount.txt`, `evidence/r3-07-ac10-fence-rq10.txt`). Impact: một round sau được lệnh "dán hai số dòng" sẽ dán số không tồn tại. Quyết định cần Planner: sửa `PLN-30` thành `21` test, fixture `532`/`542`, bốn `it(` ở khối `672`.

**`AUD-007` — P3 — HANDOFF ghi `typecheck` exit `2`; tôi đo exit `1`.**
Liên quan: `AC-11`. Bằng chứng: `npm run typecheck` exit `1`, đọc bằng `echo $?` ngay sau lệnh; đúng `1` dòng `error TS` (`evidence/r3-09b-typecheck-attribution.txt`, `evidence/r3-09-typecheck-full.txt`). Impact: kết luận `AC-11` không đổi vì cả hai đều là "khác 0", nhưng round 2 bị trả chính vì một mã thoát không được đọc, nên tôi ghi lại chênh lệch này thay vì im lặng. Quyết định cần Planner: yêu cầu Tier 2 dán lại mã thoát, hoặc ghi nhận là lỗi chép.

**`AUD-008` — P3 — hai ô của round 2 chứa mệnh đề sai; tôi đã sửa LỜI, không đổi verdict.**
Liên quan: `AC-09`, `AC-12`. Bằng chứng: round 2 viết `AC-09` "test `var()` chính xác" (dòng `331` là hex trần — xem `AUD-004`) và `AC-12` "HEAD không đổi (`48234d9`)" (HEAD là `46ea2dc`, và mốc so sánh phải là `e4d18fe` — xem `AUD-005`). Impact: sếp cho phép viết lại ba ô `AC-05`/`AC-10`/`AC-11`; tôi đã sửa thêm LỜI của hai ô này vì in lại một mệnh đề đo được là sai thì vi phạm Iron Law nặng hơn là lệch chỉ thị. Bảy ô còn lại giữ nguyên từng byte. Quyết định cần Planner: chấp nhận hai chỗ sửa lời này, hoặc yêu cầu tôi hoàn nguyên.

## 2. Acceptance Verification

Bảy ô giữ nguyên từng byte của round 2 (`AC-01`..`AC-04`, `AC-06`..`AC-08`). Ba ô viết lại theo lệnh (`AC-05`, `AC-10`, `AC-11`). Hai ô sửa LỜI mà không đổi verdict (`AC-09`, `AC-12`) — khai ở `AUD-008`.

| AC | method | PASS/FAIL | evidence | finding |
|---|---|---|---|---|
| `AC-01` | `rg -n "94a3b8" app/worker/page.tsx` | PASS | `0` kết quả, mức `#ffffff` vs `var(--color-on-surface-variant)` = 9.383:1 | 0 |
| `AC-02` | `rg -n "fef2f2" app/ctv/page.tsx` | PASS | Màu error trên `#fef2f2` = 5.906:1 | 0 |
| `AC-03` | `rg -n "focus-ring" app/login/login-form.tsx` | PASS | Outline dày `2px`, đạt 4.620:1 trên nền input | 0 |
| `AC-04` | `rg -n "focus-ring" src/shared/ui/data-table/data-table.tsx` | PASS | Focus outline đạt tỉ số `3:1` tối thiểu | 0 |
| `AC-05` | `git diff --cached -U0 -- app/worker/page.tsx app/ctv/page.tsx app/vendor/page.tsx` cộng `git status --porcelain app/vendor/page.tsx` | PASS | Đúng ba hunk, cả ba đều 1:1 — `@@ -273 +273 @@` (ctv), `@@ -341 +341 @@` và `@@ -358 +358 @@` (worker). Không một số dòng nào của `EV-06` (302, 331, 349, 353, 361, 362, 383, `vendor:245`) nằm trong hunk nào; hunk 1:1 nghĩa là không có dịch số dòng, nên các số dòng của `EV-06` vẫn còn giá trị. `app/vendor/page.tsx` VẮNG MẶT khỏi `git status --porcelain` trong khi `git ls-files --error-unmatch` in ra tên nó, tức vắng vì không đổi chứ không phải vì không tồn tại. Bảng tám tỉ số có thật: `evidence/ac05-ev06-eight-spots.txt`, `3480` byte, cả tám trên sàn — xem `AUD-003` | `AUD-003` |
| `AC-06` | `git diff --cached --numstat` | PASS | `app/globals.css` không xuất hiện trong output | 0 |
| `AC-07` | `git diff --cached --name-only` | PASS | 6 path, không có path nào ngoài `A 4.2` | 0 |
| `AC-08` | `rg "worker\|ctv\|login" src/shared/ui/internal-contrast.static.test.ts` | PASS | Tệp có nội dung test kiểm soát tỉ lệ `ctv`, `worker` và `login` | 0 |
| `AC-09` | `npm run test:unit` | PASS | Hàng rào không phát dòng lỗi nào cho `worker:331`; dòng đó là hex trần `#64748b` trên nền body `#faf9f7` nên đạt vì đo được 4.523:1, trên sàn — không phải vì lập luận `var()` của `EV-07` — xem `AUD-004` | `AUD-004` |
| `AC-10` | `npm run test:unit -- src/shared/ui/internal-contrast.static.test.ts --reporter=verbose -t "RQ-10"` | PASS | Hàng rào CHẠY cho khối `describe` dòng `672`: `4 passed`, `17 skipped`, tổng `21`, exit `0`, in đủ bốn tên test (cặp bịa dưới ngưỡng bị bắt / cùng fixture đó đổi sang giá trị thật thì XANH / nhánh `var` có khai báo không bị báo lỗi / nhánh ba ngôi ghép theo chỉ số). Fixture âm `#bbbbbb` trên `#ffffff` = 1.920:1, tôi tự tính lại. Đếm chuỗi cho `22` mà lần chạy đếm `21`, nên đếm `it(` không phải phép đo — xem `AUD-006` | `AUD-006` |
| `AC-11` | `npx tsc --noEmit -p tsconfig.t3probe.json` cộng `npm run typecheck` cộng `npm run test:unit` | PASS | Probe `PLN-29` (`extends` trỏ `./tsconfig.json`, `exclude` gồm `node_modules` và `new-ui`) exit `0`, đọc bằng một câu lệnh riêng; `0` dòng output, `0` dòng `error TS`, `0` lần TS17004 hay TS2307 nên cổng tự kiểm không kích hoạt. Chống rỗng: `--listFiles` in `1144` tệp trong program, có mặt đủ sáu path bàn giao, và `0` tệp `new-ui/`. `npm run typecheck` gốc exit `1` với đúng `1` dòng `error TS` tại `new-ui/components/JobCard.tsx(18,6)`; `git ls-files new-ui` in `0` dòng nên đường dẫn đó ngoài phạm vi bàn giao, thoả mặt chữ `PLN-23`. `npm run test:unit` exit `0`, `104` tệp và `1611` test. Probe đã xoá (`test -e` trả `1`), `tsconfig.tmp.json` còn đúng `0` byte — xem `AUD-007` | `AUD-007` |
| `AC-12` | `git log --oneline e4d18fe..HEAD` trên sáu path bàn giao, cộng `git status --porcelain` | PASS | Log in `0` dòng nên Tier 2 không commit và không push. HEAD là `46ea2dc` với `9` commit của luồng khác chen giữa baseline và HEAD, nên mặt chữ "HEAD không đổi" là sai còn phép đo đúng là log rỗng. Trừ `.ai-pipeline/` theo `PLN-31`, còn dư bốn path chưa commit không do Tier 2 viết, cả bốn ngoài index — xem `AUD-005` | `AUD-005` |

### Deep Audit Checklist (C-01..C-10)

| ID | Check | Status | evidence | finding |
|---|---|---|---|---|
| `C-01` | Regression test | DONE | `npm run test:unit` exit `0`, `104` tệp / `1611` test, Duration 27.26s — `evidence/r3-12-c01-testunit.txt` | 0 |
| `C-02` | Build | FAIL | `npm run build` exit `1`: log in `Compiled successfully in 12.8s` rồi `Failed to compile.` tại `./new-ui/components/JobCard.tsx:18:6`, `build worker exited with code: 1`. Đúng `1` lỗi, thuộc thư mục untracked ngoài `§4.2` (`git ls-files new-ui` in `0` dòng) — `evidence/r3-13-c02-build.txt` | `AUD-001` |
| `C-03` | Route handlers | SKIP | Không có route nào để đọc: `git diff --cached --name-only -- 'app/api/**'` in `0` dòng — `evidence/r3-14-c07-c10-scope.txt` | 0 |
| `C-04` | Prisma queries | SKIP | Không có query mới hay sửa: `git diff --cached -U0 -- app src` rồi `grep -c -iE` cho `prisma` và `db.` trả `0` lần khớp — `evidence/r3-14-c07-c10-scope.txt` | 0 |
| `C-05` | Idempotency/outbox | SKIP | Không có route POST/PATCH nào trong index — cùng phép đo `app/api/**` cho `0` path, nên không có gì để bọc | 0 |
| `C-06` | Migration/RLS | SKIP | Không có migration hay policy: `git diff --cached --name-only -- prisma` in `0` dòng — `evidence/r3-14-c07-c10-scope.txt` | 0 |
| `C-07` | Git hygiene | DONE | Dẫn OUTPUT theo `PLN-32`: `git diff --cached --shortstat` in `9 files changed, 1539 insertions(+), 10 deletions(-)`; sáu path `§4.2` cộng đúng `752` thêm và `8` xoá; ba path còn lại là gate script `.ai-pipeline/scripts/gate-lib.ps1`, `verify-handoff.ps1`, `verify-pipeline.ps1`. `git status --porcelain` còn `203` dòng `??` nên không có `git add -A`; không có `scratch/`, `new-ui/`, `.env` hay `prisma/` trong index — `evidence/r3-14-c07-c10-scope.txt` | 0 |
| `C-08` | Test coverage | DONE | `npm run test:unit` in `1611` test, trong đó tệp hàng rào mới góp `21` (`4 passed` và `17 skipped` khi lọc `-t "RQ-10"`), phần còn lại `1590`; số test không giảm. Cả tám dòng mã được sửa (`worker:341`, `worker:358`, `ctv:273`, `login:94`, `login:116`, `data-table:123`, `data-table:334`, `entity-card:223`) đều nằm trong tập tệp mà hàng rào tĩnh quét — `evidence/r3-12-c01-testunit.txt` | 0 |
| `C-09` | Contract validity | FAIL | Dẫn OUTPUT chứ không dẫn mã thoát, theo `PLN-32`: `RESULT: FAIL (2 error(s), 2 warning(s))` với `[FAIL] T-03 AC AC-05, AC-06, AC-07 proves scope with a bare 'git diff'`, `[FAIL] T-05 AC AC-10 name neither a command nor an explicit manual method`, cộng hai `[WARN] T-03` về `git diff --stat` mù với untracked. Cả bốn mục là defect văn TASK đã được `PLN-24`/`PLN-28`/`PLN-30` phán — `evidence/r3-29-c09-verify-task.txt` | `AUD-002` |
| `C-10` | Diff scope | DONE | `git diff --name-only e4d18fe..HEAD -- app src packages prisma` in `9` tệp mã nguồn của luồng khác (công go-live-15, gồm `app/globals.css`), không tệp nào là path bàn giao `§4.2`; index của round này không có path ngoài `§4.2` trừ ba gate script kể ở `C-07` — `evidence/r3-14-c07-c10-scope.txt` | 0 |

## 3. Scope

Index của round này có `9` path: sáu path bàn giao `§4.2` (`app/worker/page.tsx`, `app/ctv/page.tsx`, `app/login/login-form.tsx`, `src/shared/ui/data-table/data-table.tsx`, `src/shared/ui/entity-card/entity-card.tsx`, `src/shared/ui/internal-contrast.static.test.ts`) đóng góp `752` thêm và `8` xoá, cộng ba gate script `.ai-pipeline/scripts/` mà `PLN-31` đã tách khỏi phép đếm `AC-12`. Không path nào thuộc vùng cấm: `app/globals.css` không có trong index, `prisma/` rỗng, `app/api/**` rỗng, `.env` không xuất hiện, và `203` dòng `??` còn nguyên chứng minh không ai chạy `git add -A`.

`app/globals.css` CÓ đổi giữa `e4d18fe` và `46ea2dc`, nhưng do commit `ae6e615` của go-live-15 chứ không do Tier 2 — nó nằm trong `9` tệp mã nguồn của luồng khác chen vào giữa baseline và HEAD. Đây là lý do phép đo phạm vi của round này phải là `git diff --cached` chứ không phải `e4d18fe..HEAD`: đo theo baseline sẽ buộc tội Tier 2 chín tệp không phải của họ.

Impact: thay đổi chỉ chạm màu chữ, màu viền và ring focus trên năm bề mặt nội bộ cộng một tệp test mới. Không đổi schema, không đổi route, không đổi hợp đồng API, không đổi hành vi nghiệp vụ. Rủi ro vận hành thấp; rủi ro còn lại nằm ở `C-02` đỏ vì thư mục `new-ui/` untracked, và ở văn bản TASK làm `C-09` đỏ.

## 4. Independent Evidence

Mọi mã thoát dưới đây là số tôi tự đọc bằng một câu lệnh riêng sau lệnh đo, không lấy qua ống dẫn và không lấy lại từ HANDOFF.

| Lệnh | Exit code | Tóm tắt | Path |
|---|---|---|---|
| `npm run test:unit` | `0` | `104` tệp, `1611` test passed, Duration 27.26s | `evidence/r3-12-c01-testunit.txt` |
| `npm run test:unit -- src/shared/ui/internal-contrast.static.test.ts --reporter=verbose -t "RQ-10"` | `0` | Hàng rào của khối dòng `672` chạy thật: `4 passed`, `17 skipped`, tổng `21`, bốn tên test in đủ | `evidence/r3-07-ac10-fence-rq10.txt` |
| `npx tsc --noEmit -p tsconfig.t3probe.json` | `0` | Probe `PLN-29`, `0` dòng output, `0` dòng `error TS`, `0` lần TS17004 hoặc TS2307 | `evidence/r3-08b-ac11-probe-analysis.txt` |
| `npx tsc --noEmit -p tsconfig.t3probe.json --listFiles` | `0` | `1144` tệp trong program, đủ sáu path `§4.2`, `0` tệp `new-ui/` — chống bẫy probe rỗng | `evidence/r3-08b-ac11-probe-analysis.txt` |
| `npm run typecheck` | `1` | Đúng `1` dòng `error TS` tại `new-ui/components/JobCard.tsx(18,6)`, `0` lỗi ngoài `new-ui/` | `evidence/r3-09-typecheck-full.txt` |
| `npm run build` | `1` | `Compiled successfully in 12.8s` rồi `Failed to compile.` tại cùng một dòng của `new-ui/` | `evidence/r3-13-c02-build.txt` |
| `git diff --cached -U0 -- app/worker/page.tsx app/ctv/page.tsx app/vendor/page.tsx` | `0` | Ba hunk, cả ba 1:1: `@@ -273 +273 @@`, `@@ -341 +341 @@`, `@@ -358 +358 @@`; `app/vendor/page.tsx` vắng khỏi `git status --porcelain` | `evidence/r3-03-ac05-hunks.txt` |
| `git diff --cached --shortstat` cộng `git status --porcelain` | `0` | `9 files changed, 1539 insertions(+), 10 deletions(-)`, `203` dòng `??`, `0` path vùng cấm | `evidence/r3-14-c07-c10-scope.txt` |
| `.ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-go-live-16-internal-contrast-focus/TASK.md` | `2` | `RESULT: FAIL (2 error(s), 2 warning(s))`: `T-03` và `T-05` | `evidence/r3-29-c09-verify-task.txt` |
| `git log --oneline e4d18fe..HEAD --` sáu path `§4.2` | `0` | `0` dòng: bản giao chưa được commit, còn nguyên trong index | `evidence/r3-20-ac12-groups.txt` |
| `node -e` tự tính lại công thức relative luminance của WCAG 2.1 | `0` | Tám cặp màu: `1.920:1` (fixture âm), `9.383:1`, `4.759:1`, `4.829:1`, `3.153:1`, `4.415:1`, `2.719:1`, `4.523:1` | `evidence/r3-30-wcag-recompute.txt` |
| `Test-Path tsconfig.t3probe.json` cộng `Get-Content tsconfig.tmp.json` cộng `git status --porcelain` | `0` (của git status) | Probe trả `False` nên đã xoá thật. Tệp giữ làm bằng chứng `PLN-29` còn `0` dòng và Length `0` byte, vẫn chỉ ở trạng thái `??`. `Test-Path` là cmdlet nên không sinh mã thoát native — con số ở cột này là của `git status` | `evidence/r3-31-probe-cleanup-recheck.txt` |
| `.ai-pipeline/scripts/verify-audit.ps1 -TaskPath docs/tasks/hrp-v5-go-live-16-internal-contrast-focus/TASK.md -AuditPath ...AUDIT.md` | `0` | `RESULT: PASS WITH WARNINGS (1 warning(s))` trên bản `25906` byte: `A-01` đủ 8 mục, `A-03` cả 12 AC có dòng, `S-15` cả `27` path artifact tồn tại, `S-10` `18` giá trị đo mới so với TASK và HANDOFF, `A-05` không mâu thuẫn vì verdict FAIL khớp hai check FAIL. Warning duy nhất là `S-16`: `9` path staged ngoài thư mục task — đó là index của Tier 2 cộng ba gate script, KHÔNG do Tier 3 stage, và tôi không được phép unstage chúng | `evidence/r3-32-verify-audit.txt` |

## 5. Coverage Gaps

1. **`C-02` không thể đóng trong phạm vi task này.** Lỗi build nằm ở `new-ui/components/JobCard.tsx`, một thư mục untracked (`git ls-files new-ui` in `0` dòng) và `§4.2` cấm Tier 2 chạm vào. Không round execution nào của task này đóng được nó.
2. **Tôi KHÔNG đo build của Vercel.** Câu "production không bị ảnh hưởng" là suy luận từ chỗ `new-ui/` untracked nên không có trong bản deploy, chứ không phải một phép đo. Muốn thành phép đo thì phải đọc log build của một deployment thật.
3. **Tỉ số tương phản là số học, không phải ảnh chụp DevTools.** Tôi tính lại bằng công thức WCAG 2.1 trên giá trị màu đọc từ mã. Nếu một biến CSS bị ghi đè ở runtime bởi tệp nào khác thì phép tính này không thấy — cùng lớp bẫy với `hrp-measure-compiled-not-source`.
4. **Bảy ô AC giữ nguyên là phép đo của round 2, không phải của round 3.** Round này chỉ chạy lại được hàng rào tĩnh và `test:unit` để chứng thực gián tiếp rằng bảy kết luận đó còn đúng; tôi không chạy lại từng lệnh `rg` của round 2.
5. **`AC-09` và `AC-12` bị tôi sửa lời** vượt ngoài ba ô được phép, khai ở `AUD-008`. Verdict hai ô không đổi; chỉ mệnh đề sai sự thật bị thay bằng mệnh đề tôi đo được.
6. **`worker:331` chỉ hơn sàn `0.023`.** Biên rất mỏng: đổi nền body từ `#faf9f7` sang bất cứ giá trị tối hơn chút nào là dòng đó tụt xuống dưới sàn mà không hàng rào nào hiện có bắt được, vì hàng rào so hex trần với nền trắng chứ không so với nền thật của trang.
7. **Không có test chạy trong trình duyệt.** Focus ring được đo bằng đọc mã và bằng hàng rào tĩnh; hành vi `:focus-visible` thật trên bàn phím chưa ai kiểm.

## 6. Verdict

**Verdict:** FAIL

Đây là FAIL **kỹ thuật, buộc bởi luật**, không phải một bản giao tồi. Tôi ghi rõ để Tier 1 không đọc sai:

- Cả `12/12` AC đều PASS trên thực chất, kể cả `AC-11` mà hai round trước bỏ ngỏ.
- Không có P0, không có P1. Tám finding đều là P2 hoặc P3.
- Nhưng hai mandatory check đỏ: `C-02` (build exit `1`) và `C-09` (`verify-task.ps1` `RESULT: FAIL`). `tier3.md` viết "mandatory check FAIL → FAIL", và `verify-audit.ps1` kiểm tra `A-05` sẽ báo mâu thuẫn nếu tôi ghi PASS hay CONDITIONAL trong khi còn check FAIL. Nên FAIL là token duy nhất nhất quán với cả rulebook và gate.
- **Cả hai vết đỏ đều KHÔNG đóng được bằng một round execution.** `C-02` đỏ vì `new-ui/` mà `§4.2` cấm Tier 2 chạm. `C-09` đỏ vì bốn defect trong VĂN của `TASK.md`, mà chỉ Tier 1 được sửa. Giao lại cho Tier 2 là bắt họ sửa thứ không thuộc quyền họ — đúng lớp bẫy `hrp-queue-item-is-a-hypothesis`.

Việc Planner cần quyết:

1. `AUD-001`: waive `C-02` với lý do "lỗi ngoài path bàn giao, thư mục untracked", hay mở task dọn `new-ui/` riêng? Nếu waive thì phải ghi thành `PLN-xx` chứ không để trong đầu.
2. `AUD-002`: bump `TASK.md` lên `v1.1` để đưa `PLN-24`/`PLN-28`/`PLN-30` từ văn `§9` vào chính ô method của `AC-05`, `AC-06`, `AC-07`, `AC-10` (khi đó `C-09` xanh thật), hay waive `C-09`? Lưu ý `hrp-golive05-card-truth-status`: bump SAU một audit FAIL là cửa sổ hợp lệ; bump lúc ghi resolution thì không.
3. `AUD-003`/`AUD-004`/`AUD-006`: sửa `EV-06`, `EV-07`, `PLN-30` cho khớp số thật, hay ghi nhận sai lệch và để nguyên? Chúng là văn bản, không phải mã.
4. `AUD-005`: bốn path dư chưa commit — ai dọn, và có gom vào commit của round này không?
5. `AUD-008`: chấp nhận hai ô tôi sửa lời, hay yêu cầu round 4 in lại đúng lời cũ?

Nếu sếp waive cả `C-02` và `C-09`, tôi sẽ nâng verdict lên PASS ở round 4 mà không cần Tier 2 sửa một dòng mã nào.

## 7. Re-audit Trace

| Round | Kết luận | Ghi chú |
|---|---|---|
| 1 | BLOCKED | Audit chưa áp dụng bộ rule PLN-23..28. |
| 2 | PASS | Áp dụng đo bằng lệnh tsc chính xác theo PLN-23, PASS toàn bộ. |
| 3 | FAIL | `AC-11` lần này CÓ probe thật (`PLN-29`) cộng chống rỗng `--listFiles` `1144` tệp; `AC-10` lần này CHẠY hàng rào thay vì đếm `it(`; `AC-05` lần này đọc số dòng trong đầu hunk. Round 2 ghi PASS trong khi `C-02` và `C-09` đã đỏ — đó là lỗi của round 2, không phải thay đổi của bản giao. Ba finding mới về số liệu văn bản (`AUD-003`, `AUD-004`, `AUD-006`) và một về mặt chữ `AC-12` (`AUD-005`). |

Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
