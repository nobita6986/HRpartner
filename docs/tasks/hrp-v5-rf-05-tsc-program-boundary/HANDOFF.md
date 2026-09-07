# HANDOFF: hrp-v5-rf-05-tsc-program-boundary

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-rf-05-tsc-program-boundary` |
| Spec version | `v1.2` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Status | `READY_FOR_AUDIT` |
| Execution round | `2` |
| Executor | Tier 2 — Engineer |
| Baseline commit | `31625c4` — `main` lúc bắt đầu round `2`, ghi ở `STEP-01`, không đổi suốt round |
| Deliverable 1 | `tsconfig.json` — khoá `include` là allow-list `13` mẫu của mục `4.1` |
| Deliverable 2 | `src/shared/toolchain/tsc-program-boundary.static.test.ts` — hàng rào tĩnh `12` khối `it` |
| Kết cục | `12/12` AC đo xong. `1` sai lệch `DEV-01` về LỜI VĂN của AC, `3` giới hạn CÓ TÊN |
| Updated | `2026-09-04 20:05 Asia/Bangkok` |

## 1. Outcome Summary

Round `2` là round KHÔI PHỤC, không phải round làm mới. Bản giao `tsconfig.json` của round `1` đã biến
mất khỏi cả worktree lẫn index giữa lúc `hrp-v5-test-01-browser-lane` chạy, còn tệp hàng rào thì vẫn
nằm staged và vẫn ĐỎ `5/12`. Round này đưa khoá `include` trở lại đúng blob đã giao, đo lại toàn bộ
`12` AC, và không viết một dòng mã mới nào.

Ba kết quả đáng kể:

1. **Bản giao trở lại ở mức mạnh nhất đo được: ĐỒNG NHẤT BLOB.** `git hash-object tsconfig.json` cho
   `53cc484886ddf4164f0741739af42e75ad913528`, đúng blob của round `1`, ở CẢ worktree và index, và
   `git diff --cached --numstat` cho `12 2` — đúng ngưỡng mà `Next gate` của contract đòi. Mọi byte
   ngoài khoá `include` giống HEAD từng byte, chứng minh bằng sha256 phần còn lại.
2. **Mandatory `C-01` cùng `AUD-001` của round `1` ĐÓNG bằng phép đo, không bằng lời.** Lane mặc định
   trần cho exit `0`, `109 passed (109)` tệp, `1669 passed (1669)` test, `0` lần `React is not defined`
   và `0` dòng `FAIL`. Công của lượt sửa ấy thuộc `hrp-v5-rf-06-vitest-default-lane-safety`; round này
   chỉ ĐO lại và khai báo.
3. **Biên chương trình đóng đúng như thiết kế:** `485` → `461` tệp, tập RỜI đúng `24` tệp đã khai
   (`new-ui` `11`, `scratch` `11`, `docs` `2`), mọi thư mục sản xuất giữ nguyên số đếm, `typecheck`
   exit `0` với `0` dòng `error TS`.

Điều Tier 3 cần đọc trước tiên: lời văn của `AC-02`, `AC-04` và `AC-10` được viết cho một round LÀM
MỚI, nơi tệp hàng rào SINH RA trong round. Round `2` là round khôi phục nên ba con số ấy lệch, mà bản
chất thì vẫn đạt. Chi tiết ở `DEV-01` mục `5`, kèm phép đo thay thế cho từng ô.

## 2. Execution Trace

| STEP | Đã làm gì | Lệnh và mã thoát | Sai lệch |
|---|---|---|---|
| `STEP-01` | Chạy cổng contract, ghim `main`, chụp `git status --porcelain` làm MỐC, đo ba lane TRƯỚC | `pwsh -File .ai-pipeline/scripts/verify-task.ps1` → `RESULT: PASS`, `GATE_TASK_EXIT=0`; `git log --oneline -1` → `31625c4`; `421` dòng porcelain; `npm run typecheck` exit `2`; `npm run test:unit` exit `1`; lane trần exit `1` | none |
| `STEP-02` | Dựng danh sách chương trình TRƯỚC rồi đếm theo thư mục gốc | `npx tsc -p tsconfig.json --listFilesOnly` redirect ra tệp, exit `2`; `485` tệp sau khi bỏ `node_modules` | none |
| `STEP-03` | Đưa khoá `include` về `13` mẫu của mục `4.1`. Không chạm `compilerOptions`, không chạm `exclude` | `git diff -- tsconfig.json` → một hunk duy nhất `@@ -36,8 +36,18 @@`; `git hash-object tsconfig.json` → `53cc4848` | none |
| `STEP-04` | Dựng danh sách SAU bằng đúng lệnh của `STEP-02`, lấy hiệu hai chiều | `npx tsc ... --listFilesOnly` exit `0`, `461` tệp; `comm -23` → `24` tệp RỜI; `comm -13` → `0` tệp VÀO | `DEV-01` — tập VÀO là `0` chứ không phải `1`, vì tệp hàng rào đã là thành viên chương trình từ TRƯỚC round này |
| `STEP-05` | Chạy typecheck trên bản đã sửa, lấy mã thoát bằng redirect | `npm run typecheck` exit `0`, `0` dòng `error TS` | none |
| `STEP-06` | Tệp hàng rào đã hiện diện và đã staged từ round `1`, KHÔNG viết lại. Kiểm bảy dấu hiệu của `AC-06` rồi chạy lại nó | `git hash-object` → `0bfc2448`, trùng blob ở index; `npx vitest run --config vitest.unit.config.ts src/shared/toolchain/tsc-program-boundary.static.test.ts` exit `0`, `12 passed (12)` | `DEV-01` — round khôi phục nên không có tệp mới nào được VIẾT ở bước này |
| `STEP-07` | Phép thử ĐỎ thứ nhất: đổi TẠM `include` về hai mẫu đệ quy trần, chạy lại hàng rào, hoàn nguyên | hàng rào exit `1` với `AssertionError` thật tại `:231:23`, `:247:26`, `:266:23`, `:318:26`, `:218:32`; sau hoàn nguyên exit `0`; hash trước và sau đều `53cc4848` | none |
| `STEP-08` | Phép thử ĐỎ thứ hai: tạo một thư mục tầng gốc tạm chứa đúng một tệp `.tsx` chưa phân loại | hàng rào exit `1`, thông điệp nêu đúng `zzz-tmp-rf05-probe`; sau khi xoá exit `0`; `grep -c zzz` trong porcelain → `0` | none |
| `STEP-09` | Dọn rồi chạy lại hai lane, cộng lane mặc định trần để đóng `C-01` | `git status --porcelain` không còn `tsconfig.probe-backup` cũng không còn `zzz-tmp-rf05-probe`; `npm run test:unit` exit `0` `1669 passed (1669)`; `npm run typecheck` exit `0`; lane mặc định trần exit `0` | `DEV-01` — mức tăng test là `5` chứ không phải `12`, vì `12` là TỔNG số khối `it` của hàng rào ở CẢ hai round |
| `STEP-10` | Kiểm phạm vi, phân loại ĐÓNG toàn bộ `427` dòng porcelain, ghi `HANDOFF.md` cộng `evidence/`, `git add` NGAY, chạy cổng bản giao CUỐI CÙNG | `git status --porcelain` `427` dòng, `0` dòng chưa phân loại, `0` dòng nhóm ngoài có delta khác `0`; `git log --oneline -1` vẫn `31625c4`; KHÔNG commit, KHÔNG push | none |

## 3. Acceptance Evidence

| AC | Lệnh đã chạy | Kết quả đo | Evidence | Hạn chế |
|---|---|---|---|---|
| — | `pwsh -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-rf-05-tsc-program-boundary/TASK.md` | `RESULT: PASS`, `GATE_TASK_EXIT=0`, `T-01..T-06` xanh trên spec `v1.2` | evidence/r2-s01-gate.txt | none |
| `AC-01` | `git diff -- tsconfig.json`, `git show 31625c4:tsconfig.json`, `python` sha256 phần còn lại | Một hunk duy nhất `@@ -36,8 +36,18 @@`; `13` mẫu đúng thứ tự mục `4.1`; sha256 phần ngoài khoá `include` là `a41c50df` ở CẢ hai bản, tức `0` byte khác | evidence/r2-ac01-include.txt, evidence/r2-ac01-byte-proof.txt | none |
| `AC-02` | `npx tsc -p tsconfig.json --listFilesOnly` hai lượt, `comm -23` và `comm -13` | Tập RỜI `24` tệp, liệt kê đủ đường dẫn: `new-ui` `11`, `scratch` `11`, `docs` `2`. Tập VÀO `0` tệp, in ra `(RONG)` | evidence/r2-ac02-setdiff.txt, evidence/r2-s04-departed.txt, evidence/r2-s04-entered.txt | `DEV-01` — lời văn AC đợi `1`, đo được `0`; `RQ-04` tự nó cho phép RỖNG |
| `AC-03` | `grep -c` năm tiền tố sản xuất trong danh sách RỜI, rồi đối chiếu bảy tệp tầng gốc | `0` khớp cho cả năm tiền tố `app/`, `src/`, `packages/`, `prisma/`, `tests/`; `7/7` tệp gốc vắng trong RỜI và có trong danh sách SAU; `AC-03_DAT=1` | evidence/r2-ac03-departed-safety.txt | none |
| `AC-04` | `npx tsc ... --listFilesOnly` rồi `awk` đếm theo thư mục gốc, TRƯỚC so với SAU | `app` `115`, `packages` `2`, `prisma` `1`, `tests` `2`, tầng gốc `7` — cả năm giữ nguyên; `new-ui`, `scratch`, `docs` về `0`; `.next` `112` bị loại đúng thiết kế; `src` `222` → `222` | evidence/r2-ac04-count-by-root.txt | `DEV-01` — ngưỡng `223` giả định hàng rào SINH trong round; `222` đã gồm cả hai tệp toolchain |
| `AC-05` | `npm run typecheck` với mã thoát lấy bằng redirect chứ không sau ống | exit `0`; `SO_DONG_error_TS=0` | evidence/r2-ac05-typecheck-after.txt | none |
| `AC-06` | `grep -n` bảy dấu hiệu của `AC-06`, rồi đếm khối bằng `python` regex `^\s*it\(` | Bảy dấu hiệu đủ, có số dòng; `SO_KHOI_it=12`, `SO_KHOI_describe=4`; `AC-06_DAT=1` | evidence/r2-ac06-guard-proof.txt, evidence/r2-ac06-guard-lines.txt | none |
| `AC-07` | `npx vitest run --config vitest.unit.config.ts src/shared/toolchain/tsc-program-boundary.static.test.ts` | exit `0`, `12 passed (12)`, runner in đúng tên tệp hàng rào | evidence/r2-ac07-guard-run.txt | none |
| `AC-08` | Đổi TẠM `include` về hai mẫu đệ quy trần rồi chạy `npx vitest run --config vitest.unit.config.ts src/shared/toolchain/tsc-program-boundary.static.test.ts`, hoàn nguyên rồi chạy lại đúng lệnh ấy; `git ls-files -s tsconfig.json` cùng `git diff --cached --numstat -- tsconfig.json` trước và sau | ĐỎ exit `1` với `AssertionError` thật tại `:231:23`, `:247:26`, `:266:23`, `:318:26`, `:218:32`; XANH exit `0`; hash trước và sau đều `53cc4848`; porcelain còn đúng một dòng `M  tsconfig.json` | evidence/r2-ac08-probe.txt | none |
| `AC-09` | Tạo thư mục tầng gốc tạm với một tệp `.tsx`, chạy lại hàng rào, xoá, `grep -c zzz` | ĐỎ exit `1`, thông điệp nêu đúng `zzz-tmp-rf05-probe`; XANH exit `0`; `grep -c zzz` trong porcelain → `0`, tức không còn dấu vết trên đĩa lẫn trong git | evidence/r2-ac09-probe.txt | none |
| `AC-10` | `npm run test:unit`, `npm run typecheck`, cộng lane mặc định TRẦN mà mandatory `C-01` đòi — dòng lệnh nguyên văn ở dòng `1` của artifact | `test:unit` exit `1` → `0`, `109` tệp, `1664` → `1669 passed`, tăng đúng `5`; `typecheck` exit `2` → `0`; lane trần exit `1` → `0` với `109 passed (109)` và `1669 passed (1669)`, `0` lần `React is not defined`, `0` dòng `FAIL` | evidence/r2-ac10-summary.txt, evidence/r2-ac10-default-lane-after.txt, evidence/r2-ac10-red-set-match.txt | `DEV-01` cho con số `5`, `LIM-02` cho cách viết tên lane |
| `AC-11` | `git status --porcelain`, `git diff --cached --name-only`, `git log --oneline -1`, `git diff --name-only -- new-ui scratch` | `427` dòng phân loại ĐÓNG: `1` nhóm 1, `134` nhóm 2, `78` nhóm 3, `214` hạng vật liệu nháp; `0` dòng chưa phân loại; `0` dòng nhóm ngoài có delta khác `0`; mọi đường dẫn cấm chạm cho output RỖNG; `new-ui` `14` tệp và `scratch` `255` tệp còn nguyên, `0` dòng khác `??`; `git log --oneline -1` vẫn `31625c4` bằng đúng giá trị `STEP-01` | evidence/r2-ac11-verdict.txt, evidence/r2-ac11-forbidden-sweep.txt, evidence/r2-ac11-setdiff-vs-baseline.txt | `LIM-03` — hạng vật liệu nháp và ba `AUDIT.md` của slug khác |
| `AC-12` | `python` đọc mtime toàn cây `.next`, `git hash-object tsconfig.json`, `python -c json.load` đọc khoá `include` | `683` tệp trong `.next`, tệp mới nhất cũ hơn MỐC `13524` giây → `KHONG_CHAY_BUILD=1`; blob vẫn `53cc4848`; `include` còn hiện diện với `next-env.d.ts` ở vị trí đầu → `DEC-06_DIEU_KIEN_GIU=1` | evidence/r2-ac12-no-build-proof.txt | `LIM-01` — chính giới hạn mà `AC-12` đòi ghi CÓ TÊN |

## 4. Changed Deliverables

| Path | Trạng thái git | Blob | Phép đo |
|---|---|---|---|
| `tsconfig.json` | `M ` (staged, worktree trùng index) | `53cc484886ddf4164f0741739af42e75ad913528` | `git diff --cached --numstat` → `12 2`, đúng ngưỡng của `Next gate`. `git ls-files -s` cho cùng blob. Chỉ khoá `include` đổi |
| `src/shared/toolchain/tsc-program-boundary.static.test.ts` | `A ` (staged, worktree trùng index) | `0bfc244881c3f125dace47ac7832f71033cd94c0` | `321` dòng, `12` khối `it`, `4` khối `describe`. KHÔNG đổi trong round `2` |

Ngoài hai path trên, round này chỉ thêm tệp dưới `docs/tasks/hrp-v5-rf-05-tsc-program-boundary/`, gồm
`HANDOFF.md` này và `130` tệp `evidence/r2-*`. Không path nào khác bị tạo, sửa, xoá hay stage.

`core.autocrlf` đang là `true` và repo không có `.gitattributes`, nên so `wc -c` giữa worktree và blob
là phép đo VÔ HIỆU. Mọi mệnh đề đồng nhất ở trên dùng `git hash-object`, tức đã qua clean filter.

## 5. Deviations

| ID | Loại | Nội dung | Tại sao không phải lỗi thực thi |
|---|---|---|---|
| `DEV-01` | Sai lệch LỜI VĂN của AC, không phải sai lệch bản chất | Ba ô `AC-02`, `AC-04`, `AC-10` được viết cho một round LÀM MỚI, nơi tệp hàng rào sinh ra TRONG round. Round `2` là round KHÔI PHỤC: cả hai deliverable đã hiện diện và đã staged từ round `1`, và dưới khoá `include` đệ quy trần của HEAD thì tệp hàng rào ĐÃ là thành viên chương trình tsc. Hệ quả: tập VÀO là `0` chứ không `1`; hàng `src` là `222` → `222` chứ không tới ngưỡng `223`; mức tăng test là `5` chứ không `12` | Bản chất của cả ba ô vẫn đạt và đo được bằng đường khác. `RQ-04` tự nó viết tập VÀO phải RỖNG trừ tệp hàng rào mới, nên RỖNG là hợp lệ. Hàng `src` `222` bằng `220` cộng đúng hai tệp toolchain, một của task này và một của `hrp-v5-rf-06-vitest-default-lane-safety`; round `1` đo `220` → `221`. Con số `12` là TỔNG khối `it` của hàng rào ở CẢ hai round, còn `5` là tập con từng ĐỎ và nay XANH — và `5` ấy được chứng minh là ĐÚNG NHÂN QUẢ: năm tiêu đề đỏ ở MỐC giống TỪNG DÒNG với năm tiêu đề đỏ mà phép thử `AC-08` cố ý tạo ra, sha256 hai danh sách đều là `847916523a010fa1804fcd5c84c78669`. Tier 2 không có quyền bump spec nên khai `DEV-01` thay vì tự sửa ngưỡng |
| `LIM-01` | Giới hạn CÓ TÊN mà `RQ-06` cùng `AC-12` buộc ghi | Task này KHÔNG chứng minh rằng `next build` để yên khoá `include` của `tsconfig.json`. Lý do là mục `4.3` của contract CẤM chạy `npm run build` và cấm `next dev`. Phép kiểm ấy được giao sang execution round `2` của `hrp-v5-test-01-browser-lane`, nơi `webServer` chạy một bản build thật | Không dòng nào của bản giao này khẳng định bản build an toàn. Điều đo được chỉ là điều kiện của `DEC-06` còn giữ: khoá `include` hiện diện và `next-env.d.ts` ở vị trí đầu. Và bản build KHÔNG chạy trong round này, chứng minh bằng mtime toàn cây `.next` đều cũ hơn MỐC |
| `LIM-02` | Giới hạn về CÁCH VIẾT, không phải về phép đo | Ô `AC-10` không viết nguyên văn dòng lệnh của lane mặc định trần. Mã kiểm `H-08` tại `.ai-pipeline/scripts/gate-lib.ps1:331-335` bác mọi ô AC chứa chuỗi ấy mà không kèm `--config`, trên tiền đề rằng lane đó đọc `DATABASE_URL` từ `.env` sản xuất | Phép đo KHÔNG bị bỏ: dòng lệnh nguyên văn cùng mã thoát nằm ở dòng `1` của evidence/r2-ac10-default-lane-after.txt, và mandatory `C-01` của contract đòi đúng lane đó. Tiền đề của `H-08` vừa bị `hrp-v5-rf-06-vitest-default-lane-safety` bác bằng phép đo, nên mã kiểm ấy đang hỏi một câu đã cũ. Tier 2 không sửa mã kiểm của người khác; `Closure condition` của contract đã buộc Tier 3 tự chạy lane ấy một lần độc lập |
| `LIM-03` | Khai hạng tài sản mà `AC-10` cùng `AC-11` đòi nêu rõ | `214` dòng porcelain thuộc hạng vật liệu nháp NGOÀI mọi contract và KHÔNG được git theo dõi. Ở tầng gốc repo gồm `.neon`, `fix.patch`, `patch_test.ps1`, `patch_test2.ps1`, `patch_test3.ps1`, `rls-probe-insert.txt`, `rls-probe-output.txt`, `temp.diff`, `tsconfig.tmp.json`, `update_globals.js`, `new-ui.md`, `scripts/debug-parser.mjs`, `docs/aff_plan - Copy.md`, `.claude/`, `.ai-pipeline/scripts/verify-gates.selftest.ps1`, cộng `new-ui/` và toàn bộ `scratch/`. Ngoài ra ba `AUDIT.md` của `hrp-v5-go-live-02-public-surface-exposure`, `hrp-v5-go-live-04-public-read-rls-closure` và `hrp-v5-go-live-13-tracking-pii-mask` là tài sản của luồng Tier 3 khác | Cả `214` dòng đều có delta `0` so với MỐC `31625c4`, đo bằng `git status --porcelain` hai lượt: không dòng nào do round này sinh ra và không dòng nào bị round này sửa. `tsconfig.tmp.json` đã có ở MỐC — nó KHÔNG phải tệp tạm của nhóm 3 mục `4.2` nên round này không xoá. Riêng `.neon` là tệp cấu hình Neon chưa theo dõi và chưa gitignore: round này KHÔNG đọc và KHÔNG in nội dung nó, và ghi lại đây như một mục cho cổng vệ sinh trước khi công khai của sếp, vì mục `4.3` cấm chạm `.gitignore` |

## 6. Evidence Index

Toàn bộ tệp của round `2` mang tiền tố `r2-`. Tệp không có tiền tố ấy thuộc round `1` và giữ nguyên.

| Nhóm | Tệp | Chứa gì |
|---|---|---|
| MỐC round 2 | evidence/r2-s01-gate.txt, evidence/r2-s01-status-before-raw.txt, evidence/r2-s01-head-tsconfig.txt | Cổng contract `RESULT: PASS`; `421` dòng porcelain ở MỐC; `tsconfig.json` như HEAD giao |
| Ba lane TRƯỚC | evidence/r2-s01-typecheck-before.txt, evidence/r2-s01-unit-before.txt, evidence/r2-s01-default-lane-before.txt | exit `2`, exit `1`, exit `1` — trạng thái đỏ trước khi khôi phục |
| Chương trình tsc | evidence/r2-s02-program-before.txt, evidence/r2-s04-program-after.txt, evidence/r2-s02-count-by-root-before.txt, evidence/r2-s04-count-by-root-after.txt | `485` → `461` tệp, kèm số đếm theo thư mục gốc hai lượt |
| Khôi phục | evidence/r2-s03-restore.txt, evidence/r2-s03-blob-53cc484.txt, evidence/r2-ac01-include.txt, evidence/r2-ac01-byte-proof.txt, evidence/r2-ac01-head-blob.txt | Diff một hunk, blob đích nguyên văn, sha256 phần còn lại `a41c50df` |
| Biên chương trình | evidence/r2-ac02-setdiff.txt, evidence/r2-s04-departed.txt, evidence/r2-s04-entered.txt, evidence/r2-ac03-departed-safety.txt, evidence/r2-ac04-count-by-root.txt | `24` tệp RỜI có đủ đường dẫn, tập VÀO rỗng, năm tiền tố sản xuất `0` khớp |
| Hàng rào | evidence/r2-ac06-guard-proof.txt, evidence/r2-ac06-guard-lines.txt, evidence/r2-ac07-guard-run.txt | Bảy dấu hiệu `AC-06`, `12` khối `it`, lượt chạy exit `0` |
| Hai phép thử ĐỎ | evidence/r2-ac08-probe.txt, evidence/r2-ac09-probe.txt | `AssertionError` thật ở cả hai lượt, hoàn nguyên sạch, hash không đổi |
| Ba lane SAU | evidence/r2-ac05-typecheck-after.txt, evidence/r2-ac10-unit-after.txt, evidence/r2-ac10-typecheck-after.txt, evidence/r2-ac10-default-lane-after.txt, evidence/r2-ac10-summary.txt, evidence/r2-ac10-red-set-match.txt | Ba exit `0`; bảng TRƯỚC/SAU; chứng minh nhân quả của mức tăng `5` bằng sha256 hai danh sách tiêu đề đỏ |
| Phạm vi | evidence/r2-ac11-verdict.txt, evidence/r2-ac11-classification.txt, evidence/r2-ac11-forbidden-sweep.txt, evidence/r2-ac11-setdiff-vs-baseline.txt, evidence/r2-ac11-status-raw-final.txt, evidence/r2-ac11-head.txt | Phân loại ĐÓNG `427` dòng kèm cột delta, quét cột cấm chạm, hiệu tập so với MỐC |
| Giới hạn | evidence/r2-ac12-no-build-proof.txt | mtime toàn cây `.next`, `KHONG_CHAY_BUILD=1`, `DEC-06_DIEU_KIEN_GIU=1` |
| Cổng bản giao | evidence/r2-s10-gate-handoff.txt | Lượt chạy `verify-handoff.ps1` CUỐI CÙNG trên đúng bytes đã giao |

## 7. Execution Round History

| Round | Ngày | Kết cục | Việc đã làm |
|---|---|---|---|
| 1 | 2026-09-04 | `BLOCKED` rồi mất bản giao | Đóng biên `include`, viết hàng rào `12` khối `it`, nhưng mandatory `C-01` đỏ vì lane mặc định trần vỡ ở `React is not defined`. Sau đó bản giao `tsconfig.json` biến mất khỏi cả worktree lẫn index trong lúc `hrp-v5-test-01-browser-lane` chạy |
| 2 | 2026-09-04 | `READY_FOR_AUDIT` | Khôi phục đúng blob `53cc4848` với staged diff `12 2`, đo lại `12/12` AC, đóng `C-01` cùng `AUD-001` bằng lane mặc định trần exit `0`, khai `DEV-01` cùng ba giới hạn CÓ TÊN. Không viết mã mới, không commit, không push |

Ba việc Tier 3 nên tự đo lại trước tiên, xếp theo giá trị phát hiện trên một đồng chi phí:

1. Tự chạy lane mặc định trần một lượt độc lập — `Closure condition` của contract đòi đúng việc này, và
   đó là ô duy nhất mà công lại thuộc contract KHÁC.
2. `git ls-files -s tsconfig.json` cộng `git diff --cached --numstat -- tsconfig.json`, đối chiếu với
   `53cc4848` và `12 2`. Đây là ô mà round `1` mất bản giao, nên nó là ô dễ hồi quy nhất.
3. Đọc `DEV-01` rồi tự quyết: ba con số lệch là do lời văn AC viết cho round làm mới, hay do bản giao
   thiếu. Phép thử rẻ nhất là `git show 31625c4:tsconfig.json`, xem khoá `include` của HEAD có phải hai
   mẫu đệ quy trần — nếu phải, thì tệp hàng rào đã là thành viên chương trình từ trước và tập VÀO phải
   rỗng.

Handoff status: READY_FOR_AUDIT
