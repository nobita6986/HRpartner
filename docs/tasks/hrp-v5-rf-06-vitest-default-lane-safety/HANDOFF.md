# HANDOFF: hrp-v5-rf-06-vitest-default-lane-safety

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-rf-06-vitest-default-lane-safety` |
| Work type | `CODE` |
| Audit mode | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `BLOCKED` |
| Execution round | `1` |
| Executor | Tier 2 — Engineer |
| Baseline field của TASK | `e58a6c0` |
| HEAD thật lúc bắt đầu | `31625c4bb4ced393661684c2c8cb96f1e42bf054` — xem `DEV-02` |
| Ngày chạy | `2026-09-04 16:14 → 16:35 Asia/Bangkok` |
| Gate hợp đồng | `verify-task.ps1` RESULT: PASS, exit `0`, ghi ở `evidence/s01-gate-task.txt` |
| Không commit, không push | Đúng. `git log --oneline -1` vẫn là `31625c4`; RF-06 chỉ stage |

## 1. Outcome Summary

Lane mặc định `npx vitest run` từ nay chạy cùng JSX runtime với ứng dụng và không còn
một đường nào chạm database từ shell hay từ `.env`. Hai bằng chứng mạnh nhất:

1. **Khiếm khuyết `AUD-001` của RF-05 đã hết ở mức bản chất.** Chạy bare lane với một DB
   canary GIẢ cắm sẵn trong process cộng ba cờ LIVE `=1`: chuỗi `React is not defined`
   xuất hiện `0` lần, lỗi kết nối `0` lần, chuỗi canary `0` lần trong output, và `0` trong
   `17` tệp của `INTEGRATION_TEST_FILES` được thu. Đo riêng đúng tệp mà `AUD-001` tố:
   `26 passed (26)`, exit `0`.
2. **Hai lane bây giờ thu CÙNG MỘT TẬP.** Bare lane và `npm run test:unit` cùng báo
   `Test Files (109)`, `Tests (1669)`, `5 failed`, `1664 passed`. Một lệnh thứ hai độc lập,
   `npx vitest list --filesOnly`, xác nhận `COLLECTED_FILES=109`.

**Nhưng hai AC chặn KHÔNG đạt được đúng mặt chữ, và tôi khai chúng chứ không che.**
`AC-07` đòi bare lane exit `0`; nó exit `1`. `AC-08` đòi `test:unit` và `typecheck` exit `0`;
cả hai đỏ. Nguyên nhân DUY NHẤT là một luồng khác: hàng rào `tsc-program-boundary.static.test.ts`
của RF-05 đang staged trong cây dùng chung và đỏ `5` test, vì bản giao `tsconfig.json` của RF-05
đã biến mất khỏi cả worktree lẫn index. `tsconfig.json` nằm trong cột CẤM của RF-06, nên tôi
không được phép sửa để làm hai AC ấy xanh. Xem `BLK-01`, `BLK-02`.

Phép đo trung thực của "không hồi quy" ở đây là ĐẲNG THỨC TẬP HỢP, không phải mã thoát:
cùng đúng `1` tệp đỏ, cùng đúng `5` tên test, `error TS` `1` dòng trước và `1` dòng sau,
còn số pass tăng đúng `15` — bằng số test của hàng rào mới.

## 2. Execution Trace

| STEP | RQ | Đã làm | Lệnh / phép đo | Kết quả | Sai lệch so với TASK |
|---|---|---|---|---|---|
| `STEP-01` | `RQ-01..08` | Chạy gate hợp đồng, ghi HEAD và toàn bộ `git status`, đọc ba config cùng finding RF-05. KHÔNG chạy bare lane trước khi đóng đường DB | `verify-task.ps1`; `git status --porcelain --untracked-files=all`; `git rev-parse`; `npm run test:unit`; `npm run typecheck` | RESULT: PASS exit `0`. Baseline `568` dirty path. `UNIT_BEFORE EXIT=1`, `TSC_BEFORE EXIT=1` — hai số ĐỎ này đo TRƯỚC mọi thay đổi | `DEV-02` (Baseline field vs HEAD thật) |
| `STEP-02` | `RQ-01..05` | Viết lại `vitest.config.ts`: thêm automatic JSX, thay toàn bộ đường `.env`/ambient bằng một sentinel hardcoded, import nguồn exclusion dùng chung, đồng bộ ba include glob | `git hash-object vitest.config.ts`; `git diff --numstat`; `grep -n -c -E` bốn mẫu cấm | `1cc6c71b` → `d6ca408c`, numstat `48 31`. Forbidden count `0` trên cả bốn mẫu | Không |
| `STEP-03` | `RQ-06` | Tạo hàng rào tĩnh `424` dòng: đọc CẢ HAI config, import inventory dùng chung, có khối phép âm trên config BỊA, và có assertion `process.env` lúc chạy | `npx vitest run --config vitest.unit.config.ts src/shared/toolchain/vitest-default-lane.static.test.ts` | exit `0`, `15 passed (15)`. Hash hàng rào `6834c109` | `DEV-01` (một tầng escape bị mất khi ghi tệp, buộc đổi cách hiện thực) |
| `STEP-04` | `RQ-06` | Hai mutation THẬT trên đĩa, mỗi cái một hunk: xoá dòng JSX, rồi xoá đoạn spread inventory. Hoàn nguyên từ bản sao ngoài repo sau mỗi lần | Cùng một lệnh hàng rào ba lượt, không đổi một ký tự; `git hash-object` sau từng bước | `GREEN_TRUOC=0`, `RED_A=1`, `RED_B=1`, `GREEN_SAU=0`. Hash `d6ca408c` → `1dbb74c9` → `d6ca408c` → `763fd5fc` → `d6ca408c` | Không |
| `STEP-05` | `RQ-07` | Cắm DB canary GIẢ vào process cộng ba cờ LIVE `=1`, rồi chạy bare lane. Không một giá trị thật nào được ghi hay in | `npx vitest run` (bare, có canary); `npx vitest list --filesOnly`; `npx vitest run src/domains/applications/placement-panel.test.ts` | `BARE_EXIT=1`. Bốn số của AC-07 đều `0`. `COLLECTED_FILES=109`, `LIST_EXIT=0`. Panel: `26 passed (26)` exit `0` | `BLK-01` (mã thoát `1` thay vì `0`) |
| `STEP-06` | `RQ-07`, `RQ-08` | Chạy lane canonical và typecheck, so từng con số với ảnh chụp STEP-01 và với bare lane | `npm run test:unit`; `npm run typecheck` (ba lượt); `cmp -s`; `grep -c "error TS"` | `UNIT_AFTER_EXIT=1`, `TSC_AFTER_EXIT=2` rồi `1` rồi `1`. Tập chẩn đoán KHÔNG đổi: `1` tệp đỏ, `5` tên test, `error TS` `1` dòng. Pass `1649` → `1664` | `BLK-02` (mã thoát không phải `0`) cộng `LIM-03` (bẫy `incremental`) |
| `STEP-07` | `RQ-08` | Đo lại cột cấm, phân loại chủ cho từng dirty path, lấy hiệu tập hợp so với baseline, viết bàn giao rồi stage đúng ba pathspec | `git hash-object` × `9`; `git status --porcelain --untracked-files=all`; `comm -13`; `comm -23`; `git diff --cached --name-only` | `9/9` cột cấm hash không đổi. `594` path phủ kín `9` nhóm, unknown `0`. RF-06 tạo đúng `15` path mới. `0` path luồng khác biến mất | Không |

## 3. Acceptance Evidence

| AC | RQ | Lệnh đã chạy (nguyên văn) | Kết quả đo | Evidence | Hạn chế |
|---|---|---|---|---|---|
| — | — | `powershell -NoProfile -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-rf-06-vitest-default-lane-safety/TASK.md` | RESULT: PASS, `GATE_TASK_EXIT=0`, `8/8` check OK | `evidence/s01-gate-task.txt` | Không |
| `AC-01` | `RQ-01` | `grep -n -E "jsx" vitest.config.ts vitest.unit.config.ts` cộng `npx vitest run --config vitest.unit.config.ts src/shared/toolchain/vitest-default-lane.static.test.ts` | `vitest.config.ts:36` khai `esbuild` với `jsx` automatic và `jsxImportSource` react; hàng rào so THẲNG với `vitest.unit.config.ts:20-24` và bằng nhau. Hàng rào exit `0`, `15 passed (15)` | `evidence/s02-config-diff.txt:22` cộng `evidence/s03-guard-green.txt:25` | Không |
| `AC-02` | `RQ-02` | `grep -n -c -E -e "process\.env\.DATABASE_URL" -e readFileSync -e "node:fs" -e "require\(" -e "'\.env'" -e '"\.env"' vitest.config.ts` cộng hàng rào so sentinel từng byte giữa hai config | Forbidden count `0` trên cả bốn mẫu. Sentinel ở `vitest.config.ts:25` giống TỪNG BYTE sentinel ở `vitest.unit.config.ts:15` (giá trị nguyên văn ở dòng evidence, không nhắc lại ở đây). Hàng rào exit `0` | `evidence/s02-config-diff.txt:131-136` cộng `evidence/s03-guard-green.txt:25` | Không |
| `AC-03` | `RQ-03` | `npx vitest run --config vitest.unit.config.ts src/shared/toolchain/vitest-default-lane.static.test.ts` | Hiệu tập hợp HAI CHIỀU giữa tập khoá blank của default và của unit đều RỖNG; `12` khoá admin/test/LIVE đều là chuỗi rỗng, và không một khoá `env` nào ngoài `DATABASE_URL` có giá trị khác rỗng. Lane nhắm exit `0`, `15 passed (15)` | `evidence/s03-guard-green.txt:25-30` | Không |
| `AC-04` | `RQ-04` | `grep -n -E -e INTEGRATION_TEST_FILES -e configDefaults vitest.config.ts` cộng `npx vitest run --config vitest.unit.config.ts src/shared/toolchain/vitest-default-lane.static.test.ts` | `vitest.config.ts:22` import inventory, `:41` spread nó CÙNG `configDefaults.exclude`. Hàng rào đếm số literal đường dẫn test bị chép tay trong `exclude`: `0`. Sàn inventory `17` mục và mọi mục tồn tại trên đĩa. exit `0` | `evidence/s02-config-diff.txt:138-143` cộng `evidence/s03-guard-green.txt:25` | Không |
| `AC-05` | `RQ-05` | `npx vitest run --config vitest.unit.config.ts src/shared/toolchain/vitest-default-lane.static.test.ts` | `include` của default đúng ba glob `src/**`, `packages/**`, `prisma/**`; hiệu tập hợp hai chiều với `include` của unit lane RỖNG. exit `0` | `evidence/s02-config-diff.txt:24` cộng `evidence/s03-guard-green.txt:25` | Không |
| `AC-06` | `RQ-06` | Ba lượt `npx vitest run --config vitest.unit.config.ts src/shared/toolchain/vitest-default-lane.static.test.ts` quanh hai mutation trên đĩa, kèm `git hash-object vitest.config.ts` sau từng bước | `GREEN_TRUOC=0`, `RED_A=1` (`2 failed / 13 passed`), `RED_B=1` (`2 failed / 13 passed`), `GREEN_SAU=0` (`15 passed`). Hash: `d6ca408c` → `1dbb74c9` → `d6ca408c` → `763fd5fc` → `d6ca408c`. Cộng `6` phép âm trên một config BỊA nằm sẵn trong hàng rào | `evidence/s04-mutation.txt:12-24` | Không |
| `AC-07` | `RQ-07` | Đặt canary DB giả vào biến môi trường của process rồi chạy `npx vitest run` TRẦN, redirect cả stdout lẫn stderr; đối chiếu số thu được với lane canonical `npx vitest run --config vitest.unit.config.ts` chạy CÙNG lượt; cộng `npx vitest list --filesOnly` để đếm file độc lập | Bốn phép đếm của `RQ-07` đều `0`: `REACT_NOT_DEFINED_COUNT=0`, `CONNECTION_ERROR_COUNT=0`, `CANARY_STRING_IN_OUTPUT=0`, `INTEGRATION_FILES_COLLECTED=0`. Số pass KHÔNG thấp hơn lane canonical: hai lane thu cùng `109` file và `1669` test, cùng `1664 passed`. `placement-panel.test.ts` chạy trong lane trần cho `26 passed (26)` exit `0`. NHƯNG mã thoát của cả lượt là `BARE_EXIT=1`, KHÔNG phải `0`: đúng `1` file đỏ với đúng `5` test, và `FAILING_FILES_THUOC_RF06=0`. Vết đỏ ấy ĐÃ ĐỎ TỪ TRƯỚC lượt này, đo tại `31625c4` bằng `npm run test:unit`: `evidence/s01-unit-before.meta.txt` ghi `EXIT=1` với cùng `5 failed`, trong khi rf-06 chưa sửa gì. Xem `BLK-01` | `evidence/s05-bare-lane.txt` cộng `evidence/s01-unit-before.meta.txt` | `BLK-01` — mã thoát `1` do hàng rào staged của RF-05 `tsc-program-boundary.static.test.ts`, đỏ vì bản giao `tsconfig.json` của RF-05 đã biến mất khỏi worktree VÀ index; `tsconfig.json` nằm trong cột CẤM của rf-06 |
| `AC-08` | `RQ-08` | `npm run test:unit` rồi `npm run typecheck`, lấy mã thoát TRỰC TIẾP từ `$LASTEXITCODE` chứ không qua pipe | Số unit pass KHÔNG giảm mà TĂNG đúng `15`: trước `108` file / `1654` test / `5 failed` / `1649 passed`, sau `109` file / `1669` test / `5 failed` / `1664 passed`, và `15` là đúng số test của hàng rào mới. Tập test đỏ GIỐNG NHAU cả năm tên, tất cả nằm trong một file duy nhất không thuộc rf-06. `typecheck` phát đúng `1` dòng `error TS` trước và sau, cùng một lỗi `new-ui/components/JobCard.tsx(18,6)`. Cả hai script vẫn exit khác `0`, nên AC này KHÔNG đạt mặt chữ. Vết đỏ ĐÃ ĐỎ TỪ TRƯỚC, ghim tại `31625c4` và tái lập bằng `npm run test:unit` trước khi rf-06 sửa dòng nào: `evidence/s01-unit-before.meta.txt` `EXIT=1`, `evidence/s01-typecheck-before.meta.txt` `EXIT=1`. Xem `BLK-02` và `LIM-03` | `evidence/s06-regression.txt` cộng `evidence/s01-typecheck-before.meta.txt` | `BLK-02` — cả hai script đã đỏ tại baseline vì lý do NGOÀI rf-06; `LIM-03` — `tsc` dưới `incremental` cho `2` ở lượt ghi lại `tsconfig.tsbuildinfo` rồi `1` ở các lượt sau, nên phép đo trung thực là TẬP diagnostic chứ không phải mã thoát |
| `AC-09` | `RQ-08` | `git status --porcelain --untracked-files=all` cộng `git hash-object` từng path cột cấm, cộng `comm -13` và `comm -23` giữa ảnh chụp baseline và ảnh chụp hiện tại, cộng `git diff --cached --name-only` | `9/9` path cột cấm KHÔNG đổi hash; ba path đang `[M ]` thì đã `[M ]` với ĐÚNG hash đó ngay tại STEP-01. Toàn bộ `594` dòng dirty được chia hết cho `9` nhóm chủ, `UNKNOWN=0`. rf-06 tạo đúng `15` path mới: `2` deliverable cộng `13` evidence; `11` path mới còn lại thuộc luồng Tier 3 đang audit TEST-01 round `2`, chỉ đọc để quy chủ. `SO_LUONG_BIEN_MAT=0`, nên không path nào của luồng khác bị reset hay stash. Về INDEX: nó là tài sản CHUNG và đã có `128` path staged NGAY TỪ ĐẦU vòng bởi các luồng khác, nên phép đo đúng là hiệu tập hợp chứ không phải tổng `146`. Hiệu ấy cho `19` path staged mới, quy chủ trọn vẹn: `18` của rf-06 qua `4` pathspec tường minh, `1` là `AUDIT.md` của TEST-01 do Tier 3 stage. `SO_STAGED_BIENMAT=0` | `evidence/s07-scope.txt` | Không |

## 4. Changed Deliverables

| Path | Loại | Phép đo | Vai trò trong contract |
|---|---|---|---|
| `vitest.config.ts` | Sửa | `git hash-object` `1cc6c71b2e003b3745bbdbd6862978af594babf1` tại HEAD → `d6ca408c5c6f89c15faf296ae2fd8a010d157caf` ở worktree; `git diff --numstat` cho `48 31` | Deliverable duy nhất của `RQ-01..05`: automatic JSX, sentinel loopback hardcoded, blank mọi biến LIVE, import inventory exclusion, đồng bộ `include` |
| `src/shared/toolchain/vitest-default-lane.static.test.ts` | Tạo mới | `424` dòng, `21627` byte, `git hash-object` `6834c1094a5d6bcc2cba646a2c4d02dd26d251fa`; `15` test trong `4` describe, `15 passed (15)` | Hàng rào tĩnh của `RQ-06`: đọc CẢ hai config dưới dạng văn bản cộng inventory, so từng invariant, và có `6` phép âm trên config bịa |
| `docs/tasks/hrp-v5-rf-06-vitest-default-lane-safety/HANDOFF.md` | Tạo mới | Tệp này | Bàn giao round `1` |
| `docs/tasks/hrp-v5-rf-06-vitest-default-lane-safety/evidence/` | Tạo mới | `15` tệp, tổng `2078` dòng, liệt kê từng tệp ở `§6` | Bằng chứng thô cho `9` AC |

Không có path nào khác do rf-06 tạo hoặc sửa. Cột cấm `§4.2` được đo lại từng path ở `evidence/s07-scope.txt` mục A và A-bis.

## 5. Deviations

| ID | Loại | Nội dung | Bằng chứng | Tier 1 cần quyết gì |
|---|---|---|---|---|
| `BLK-01` | Blocker | `AC-07` đòi lane trần exit `0`. Nó exit `1`. Bốn phép đếm thực chất của `RQ-07` đều `0` và số pass không giảm, nhưng mã thoát vẫn `1` vì đúng `1` file đỏ với `5` test, và file ấy là hàng rào STAGED của RF-05 `src/shared/toolchain/tsc-program-boundary.static.test.ts`. Nó đỏ vì bản giao `tsconfig.json` của RF-05 đã biến mất khỏi CẢ worktree lẫn index; `tsconfig.json` nằm trong cột CẤM của rf-06 nên tôi không được phục hồi. `FAILING_FILES_THUOC_RF06=0` | `evidence/s05-bare-lane.txt`, `evidence/s06-regression.txt` | Chấp nhận `AC-07` theo THỰC CHẤT (bốn count `0`, pass không giảm) và hoãn mặt chữ tới khi bản giao RF-05 được phục hồi bởi luồng có quyền, hay giữ rf-06 ở `BLOCKED` cho tới khi ấy |
| `BLK-02` | Blocker | `AC-08` đòi `npm run test:unit` và `npm run typecheck` exit `0`. Cả hai đỏ, và đỏ vì lý do NGOÀI rf-06: cùng một file hàng rào RF-05 cho `5 failed`, còn `typecheck` cho đúng `1` dòng `error TS` ở `new-ui/components/JobCard.tsx(18,6)` — `new-ui/` là cây chưa track của luồng khác. Số unit pass TĂNG `15`, đúng bằng số test hàng rào mới | `evidence/s06-regression.txt`, `evidence/s01-unit-before.meta.txt`, `evidence/s01-typecheck-before.meta.txt` | Xác nhận rằng phép đo hồi quy đúng cho task này là TẬP test đỏ và TẬP diagnostic, chứ không phải mã thoát tuyệt đối |
| `DEV-01` | Lệch cách làm | `STEP-03` không nói phải parse config bằng cách nào. Tôi định dùng `new RegExp` dựng chuỗi, nhưng backslash bị gộp một tầng khi đi qua shell heredoc nên mẫu sai âm thầm. Đổi sang bộ quét ký tự viết tay trong hàng rào, không dựng regex từ chuỗi | `src/shared/toolchain/vitest-default-lane.static.test.ts` | Chỉ ghi nhận. Kết quả đo không đổi, và `6` phép âm chứng minh bộ quét có răng |
| `DEV-02` | Lệch baseline | Field `Baseline` của TASK ghi `e58a6c0`, còn HEAD thật lúc tôi bắt đầu là `31625c4bb4ced393661684c2c8cb96f1e42bf054`. Đã chứng minh vô hại bằng hai phép đo: `git merge-base --is-ancestor` cho thấy `e58a6c0` là tổ tiên của `31625c4`, và blob `vitest.config.ts` GIỐNG NHAU ở cả `e58a6c0`, ở HEAD và ở worktree trước khi tôi sửa | `evidence/s01-baseline-vs-head.txt` | Chỉ ghi nhận, hoặc cập nhật field `Baseline` nếu Tier 1 muốn khớp thực tế |
| `LIM-01` | Hạn chế đã biết | Hàng rào đọc hai config như VĂN BẢN, không `import` chúng. Nó chứng minh SOURCE khai đúng, không chứng minh Vitest thực thi đúng. Khoảng trống ấy được bịt bởi phép đo runtime của `AC-07`: bốn count `0` và `26 passed (26)` cho panel test trong lane trần | `evidence/s05-bare-lane.txt` | Chỉ ghi nhận |
| `LIM-02` | Xung đột với dụng cụ | Chính cổng bàn giao mã hoá tiền đề mà rf-06 vừa BÁC. `gate-lib.ps1:328-330` viết rằng lane `npx vitest run` trần đọc `DATABASE_URL` từ `.env` sản xuất, nên `H-08` báo lỗi mọi ô nhắc lane ấy mà không kèm `--config`. Sau rf-06 tiền đề đó SAI cho config này: `vitest.config.ts:25` hardcode sentinel loopback bất khả kết nối và đếm nguồn cấm ra `0`. Ô `AC-07` của tôi có nhắc `--config` nhưng KHÔNG để lách: `RQ-07` tự đòi so với lane canonical, mà `package.json:12` định nghĩa lane ấy là `vitest run --config vitest.unit.config.ts`, nên chuỗi ấy là một phép đo thật | `evidence/s02-config-diff.txt:131-136`, `.ai-pipeline/scripts/gate-lib.ps1:328-335` | Quyết xem có giao một task riêng để cập nhật `H-08` sau khi rf-06 được ACCEPT. rf-06 KHÔNG tự sửa cổng vì `.ai-pipeline/` ngoài scope |
| `LIM-03` | Hạn chế phép đo | `tsc` chạy dưới `"incremental": true` cho mã thoát `2` ở lượt ghi lại `tsconfig.tsbuildinfo` rồi `1` ở các lượt sau, với OUTPUT giống nhau từng byte theo `cmp -s`. Nên mã thoát của `typecheck` không phải hàm của riêng tập diagnostic, và phép đo trung thực là số dòng `error TS`: `1` trước, `1` sau | `evidence/s06-regression.txt` | Chỉ ghi nhận |
| `LIM-04` | Ghi chú bảo mật | Sentinel DB của cả hai lane có HÌNH DẠNG một connection string đủ bộ, vì Vitest cần một URL Prisma parse được. Đó là chuỗi loopback tới cổng không mở, không phải credential; nó CỐ Ý giống từng byte với `vitest.unit.config.ts:15`. Canary của `STEP-05` cũng là chuỗi bịa. Tôi không viết giá trị nào vào tệp này; hai giá trị nằm ở `evidence/s02-config-diff.txt:25` và `evidence/s05-bare-lane.txt:9` | `vitest.config.ts:25` | Chỉ ghi nhận |

## 6. Evidence Index

| Tệp | Dòng | Chứng minh gì |
|---|---|---|
| `evidence/s01-gate-task.txt` | `14` | Cổng hợp đồng: `8` check `[OK]`, `RESULT: PASS`, `GATE_TASK_EXIT=0`. Round `1` chạy trên một contract đã tự qua cổng của nó |
| `evidence/s01-baseline.txt` | `589` | Ảnh chụp `git status --porcelain --untracked-files=all` lúc mở vòng, cộng hash từng path cột cấm. Đây là nền cho phép hiệu tập hợp của `AC-09` |
| `evidence/s01-baseline-vs-head.txt` | `28` | `DEV-02`: `e58a6c0` là tổ tiên của `31625c4`, và blob `vitest.config.ts` giống nhau ở `e58a6c0`, ở HEAD, ở worktree trước khi sửa |
| `evidence/s01-unit-before.meta.txt` | `3` | Lane canonical ĐÃ đỏ trước khi rf-06 sửa dòng nào: `EXIT=1`, `108` file, `1654` test, `5 failed`. Ghim cho `H-11` cùng `BLK-01` và `BLK-02` |
| `evidence/s01-unit-before.raw.txt` | `262` | Output thô của lượt trên, để Tier 3 đối chiếu từng tên test đỏ chứ chỉ đọc con số |
| `evidence/s01-typecheck-before.meta.txt` | `2` | `npm run typecheck` đã đỏ trước rf-06: `EXIT=1` |
| `evidence/s01-typecheck-before.raw.txt` | `8` | Output thô: đúng `1` dòng `error TS`, ở `new-ui/components/JobCard.tsx(18,6)` |
| `evidence/s02-config-diff.txt` | `143` | `AC-01`, `AC-02`, `AC-04`, `AC-05`: hash trước sau, `48 31`, forbidden count `0` ở CẢ hai dạng lệnh, các dòng khai `jsx`, sentinel, inventory, `include`, và diff đầy đủ từng hunk |
| `evidence/s03-guard-green.txt` | `30` | `AC-01..AC-05`: hàng rào `15 passed (15)`, `GUARD_EXIT=0`, kèm hash config và hash hàng rào lúc đo, cùng các hiệu tập hợp hai chiều đều RỖNG |
| `evidence/s03-guard-green.raw.txt` | `12` | Output thô của lượt hàng rào xanh |
| `evidence/s04-mutation.txt` | `62` | `AC-06`: bốn lượt chạy quanh hai mutation THẬT trên đĩa, `GREEN_TRUOC=0`, `RED_A=1`, `RED_B=1`, `GREEN_SAU=0`, cộng chuỗi `5` hash chứng minh worktree về đúng trạng thái ban đầu |
| `evidence/s05-bare-lane.txt` | `316` | `AC-07`: lane trần với canary DB giả. `BARE_EXIT=1` kèm bốn count `0`, `COLLECTED_FILES=109` đo độc lập bằng `vitest list --filesOnly`, panel test `26 passed (26)` exit `0`, `FAILING_FILES_THUOC_RF06=0`, và lời từ chối tái khẳng định con số `24` của `AUD-001` vì lượt này không đo lại nó |
| `evidence/s06-regression.txt` | `339` | `AC-08`: trước sau của lane canonical, bảng đồng nhất hai lane, `5` tên test đỏ nguyên văn, `TSC_AFTER_EXIT` `2` rồi `1` rồi `1` với `cmp -s` giống nhau, `ERROR_TS_LINES_TRUOC=1` và `_SAU=1` |
| `evidence/s07-gate-handoff.txt` | `20` | Cổng bàn giao chạy CUỐI CÙNG trên chính tệp này: `13` check `[OK]`, `RESULT: PASS`, `GATE_HANDOFF_EXIT=0`. `H-08` KHÔNG nổ vì ô `AC-07` có nhắc lane canonical `--config` đúng như `RQ-07` đòi, và `H-11` KHÔNG nổ vì `AC-07` cùng `AC-08` đều ghim `31625c4` cộng lệnh tái lập trong CÙNG ô |
| `evidence/s07-scope.txt` | `250` | `AC-09`: hash từng path cột cấm `9/9`, so với HEAD cho path clean, phân loại toàn bộ `594` dòng dirty thành `9` nhóm chủ với `UNKNOWN=0`, hiệu tập hợp hai chiều cho `15` path mới của rf-06 và `0` path biến mất, cùng mục H đo tập staged bằng `git diff --cached --name-only` với hai chiều `comm` |

## 7. Execution Round History

| Round | Ngày | Kết cục | Vì sao |
|---|---|---|---|
| 1 | `2026-09-04` | `BLOCKED` | Bảy STEP chạy đủ, `7/9` AC PASS. `AC-07` và `AC-08` không đạt MẶT CHỮ vì mã thoát `1`, do hàng rào staged của RF-05 đỏ sau khi bản giao `tsconfig.json` của RF-05 biến mất khỏi worktree và index — `tsconfig.json` nằm trong cột cấm nên rf-06 không được chạm. Thực chất của `AUD-001` đã đóng: `React is not defined` `0` lần, connection error `0`, canary `0`, `0` trong `17` file integration bị thu, panel test `26 passed (26)`. Xem `BLK-01` và `BLK-02` |

Handoff status: BLOCKED
