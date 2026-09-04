# HANDOFF: hrp-v5-go-live-17-rls-required-relation-sweep

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-17-rls-required-relation-sweep` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.4` |
| Execution round | `2` |
| Current audit round | `1` |
| Executor | Tier 2 — Engineer |
| Baseline | `80f6933` theo TASK. Cây thực thi thật là `e58a6c0`. Chín commit nằm giữa hai điểm ấy, KHÔNG commit nào của tôi, và một trong chín (`d017d61`) chính là commit TẠO ra TASK.md này — đo ở `LIM-01` |
| Status | `READY_FOR_AUDIT` |
| Started/updated | Round `1`: 2026-09-04 01:17 → 02:30. Round `2`: 2026-09-04 11:40 → 12:31 Asia/Bangkok |

## 1. Outcome Summary

`F-05` của `hrp-v5-hotfix-02` đóng bằng một phép phân loại có bằng chứng, không bằng một lượt sửa hàng loạt. Mười hai vị trí đã đo lại, chia **tám AN TOÀN** và **bốn RỦI RO**, và tôi sửa đúng bốn.

1. **Hàng rào mới** [src/shared/security/required-relation-sweep.static.test.ts](src/shared/security/required-relation-sweep.static.test.ts) — `328` dòng, `11` test, exit `0`. Nó TỰ SUY tập nguy hiểm lúc chạy: `34` bảng RLS đọc từ `prisma/migrations/**`, `21` trường quan hệ bắt buộc trên `20` model đọc từ `prisma/schema.prisma`, rồi quét `212` tệp nguồn dưới `src/` cộng `app/`. Không một danh sách bảng nào bị ghim thành mảng literal, và một fixture âm bắn thẳng vào cả ba detector.
2. **Bốn vị trí RỦI RO đã sửa** theo đúng mẫu `DEC-05`: bỏ select quan hệ, đọc khóa ngoại vô hướng, tra tên bằng một truy vấn thứ hai, tên thiếu thì `null`. Không một quan hệ nào bị đổi thành nullable, không một `try/catch` nào nuốt lỗi, không một khoá response nào mất tên hay đổi kiểu.
3. **Tám vị trí AN TOÀN không bị chạm một byte** — `git status --porcelain` chạy riêng trên cả năm tệp chứa chúng đều trả `0 dòng`.
4. **Một `500` THẬT đã bịt.** Vị trí `12` ở [src/domains/staffing/submission.service.ts](src/domains/staffing/submission.service.ts) có người gọi thật, và là nhánh MẶC ĐỊNH của `GET /api/jobs/submissions` khi thiếu tham số `tab`. Ba vị trí `6`, `7`, `8` nằm trong ba hàm chưa có người gọi, nên chúng là `500` TIỀM ẨN — tôi vẫn sửa, vì `DEC-03` không lấy khả năng với tay làm điều kiện phân loại.
5. **Hàng rào cũ** [src/domains/job-board/public-select.static.test.ts](src/domains/job-board/public-select.static.test.ts) không đổi một byte: blob của `HEAD` và `git hash-object` của tệp trên đĩa đều là `a8cda720ac6737e4f1869f6be36faa8160dc8428`.

Lane canonical `npm run test:unit` đi từ `106` tệp `1631` test lên `107` tệp `1642` test, exit `0` — đúng bằng một tệp hàng rào mới với `11` test, và không một test cũ nào đổi màu. Cổng hợp đồng `RESULT: PASS`, `GATE17_EXIT = 0`.

**Hai giới hạn CÓ TÊN, cả hai đều không phải defect của bản giao:** `npm run typecheck` exit `1` vì đúng một dòng đỏ ở `new-ui/components/JobCard.tsx`, một thư mục UNTRACKED của luồng khác (`LIM-02`); và `AC-12` còn một mệnh đề đòi `HEAD` bằng baseline, thứ bất khả thoả vì baseline có TRƯỚC chính contract (`LIM-01`). Ba lệch của lời văn contract nằm ở `FND-01` tới `FND-03`, một bẫy ngủ nằm ở `FND-04`, một defect của chính artifact của tôi ở `FND-05`, và một định dạng giả của dụng cụ cổng ở `FND-06`.

### Round `2` — MỎNG, không một dòng mã nào đổi

Round `2` mở theo `Next gate`, sau khi `hrp-v5-rf-05-tsc-program-boundary` đóng biên chương trình của `tsc`. Nó KHÔNG sửa một dòng mã nào, và bản giao MÃ của nó là tập RỖNG: mọi tệp dưới `app/` cùng `src/` trong index giữ đúng nội dung mà round `1` đã stage. Ba AC được đo lại, cả ba ĐẠT, và ba giới hạn có tên của round `1` đều ĐÓNG.

1. **`AC-11` ĐẠT — `LIM-02` và `LIM-03` ĐÓNG.** `npm run test:unit` cho `R2_UNIT_EXIT = 0` với `Test Files 108 passed (108)` và `Tests 1654 passed (1654)`; `npm run typecheck` cho `R2_TSC_EXIT = 0` và `0` dòng `error TS`. Dòng đỏ `new-ui/components/JobCard.tsx(18,6)` biến mất KHÔNG phải vì ai sửa nó, mà vì `rf-05` hạ `"include"` của `tsconfig.json` từ `**/*.ts` xuống một allow-list, nên `new-ui/` không còn nằm trong chương trình `tsc`. Chênh so với mốc `STEP-01` là `+2` tệp và `+23` test, quy đủ: `11` test của hàng rào task này cộng `12` test của hàng rào `rf-05`. Đo ở `evidence/r2-ac11-lane.txt`.
2. **`AC-04` ĐẠT.** Hàng rào chạy lại cho `11 passed (11)`, exit `0`. `EXPECTED_HITS` đếm `8`, chia `3` dòng `app/api/` cộng `5` dòng `src/`; dòng `261` của tệp hàng rào đòi ĐÚNG `3` cho nhánh `app/api/`, và `grep -c 'toHaveLength(4)'` trên tệp ấy trả `0` — không còn dấu vết nào của con số `4` mà `FND-01` đã bác. Round `2` thêm một phép trừ tập: `12` vị trí của `DEC-04` trừ `4` vị trí đã sửa bằng đúng `8` vị trí còn lại, `comm -13` trả `0`, và cả `4` vị trí bị bỏ đều là quan hệ `worker` còn cả `8` vị trí giữ lại đều KHÔNG phải `worker`. Đo ở `evidence/r2-ac04-hitset.txt`.
3. **`AC-12` ĐẠT — `LIM-01` ĐÓNG.** Hợp đồng đã bump lên `v1.4` trong lúc round này chạy; dòng changelog `v1.4` ở §10 của TASK.md ghi lý do và ghi rõ nó KHÔNG đổi một yêu cầu, một bước, một tiêu chí hay một con số nào. Phép đo trên bản `v1.4`: hợp của hai danh sách cho `420` path, `214` path thuộc bốn nhóm của `4.2`, `206` path thuộc hạng tài sản của luồng khác, và `0` path KHÔNG phân được. Con số `0` ấy là điều `AC-12` đòi; ở bản `v1.3` nó là `2`, và hai path ấy là `TASK.md` cùng `AUDIT.md` của CHÍNH slug này — hai tệp mà luật sắt `CLAUDE.md` cấm Tier 2 chạm. `0` path thuộc hai nhóm, `0` path nhóm bốn giao nhóm một hay hai, `12` đường dẫn cấm chạm đều trả `0` dòng, và `git rev-list --count e58a6c0..HEAD` bằng `0` nên round này không tạo thêm một commit nào. Kết luận không phụ thuộc cờ `--untracked-files`: bản `-uall` cho `U=636` mà `TRONG BON NHOM` vẫn `214` và `KHONG PHAN DUOC` vẫn `0`. Đo ở `evidence/r2-ac12-scope-final.txt` cộng `evidence/r2-ac12-scope-final-uall.txt`.

Chín AC còn lại KHÔNG đo lại, theo đúng câu chữ của `Next gate`. Bảng §3 giữ nguyên các ô của round `1` làm bản ghi của round ấy; ba ô đo lại nằm ở §3.2 và §3.2 là bản ĐANG có hiệu lực cho `AC-04`, `AC-11`, `AC-12`.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | mốc | `verify-task.ps1` cộng `npm run test:unit` cộng `npm run typecheck` trên cây chưa sửa | Cổng `RESULT: PASS`, `GATE17_EXIT = 0`. Lane `106` tệp `1631` test, `S01_UNIT_EXIT = 0`. Typecheck `1` dòng đỏ ở `new-ui/components/JobCard.tsx(18,6)` | `LIM-02` — dòng đỏ có TRƯỚC khi tôi sửa gì. Cộng `DEV-01`: TASK viết `pwsh`, máy này chỉ có `powershell` |
| `STEP-02` | `RQ-03` | Đo lại `EV-01` tới `EV-03` bằng chính ba script của Tier 1 dưới `scratch/f05/` | `34` bảng RLS, `21` trường trên `20` model, `12` vị trí trên `8` tệp, quét `212` tệp nguồn. KHỚP con số contract ghi | None |
| `STEP-03` | `RQ-01`, `RQ-02`, `RQ-04`, `RQ-05` | [src/shared/security/required-relation-sweep.static.test.ts](src/shared/security/required-relation-sweep.static.test.ts) — `328` dòng, ba detector cộng sáu test fixture âm | Lane con `11 tests`. Ba detector nhận nguồn qua tham số nên cùng MỘT logic chấm cả migration thật lẫn chuỗi bịa | None |
| `STEP-04` | `RQ-03` | `npx vitest run --config vitest.unit.config.ts src/shared/security/required-relation-sweep.static.test.ts` | Lượt đầu `S04_EXIT = 1`, `2 failed 9 passed`: assertion `app/api/` = `4` theo lời văn `AC-04` ĐỎ vì số đo thật là `3`. Sửa assertion về `3`, lượt sau `11 passed`, exit `0`, tập vị trí khớp CHÍNH XÁC `12` dòng của `DEC-04` | `FND-01` — lời văn `AC-04` đòi `4` dòng `app/api/`, `DEC-04` chỉ liệt kê `3` |
| `STEP-05` | `RQ-06` | Phân loại tĩnh `12` vị trí: `schema.prisma` cho tính bắt buộc, `prisma/migrations/**` cho policy cha và policy con | `8` AN TOÀN (`1,2,3,4,5,9,10,11`) cộng `4` RỦI RO (`6,7,8,12`). Không một lệnh nào đọc `DATABASE_URL` | None |
| `STEP-06` | `RQ-07` | [src/domains/reconciliation/margin.service.ts](src/domains/reconciliation/margin.service.ts), [src/domains/reconciliation/statement.service.ts](src/domains/reconciliation/statement.service.ts), [src/domains/staffing/submission.service.ts](src/domains/staffing/submission.service.ts) | Diff `25 4` cộng `30 8` cộng `23 2`. Đúng `4` vị trí, đúng `3` tệp. Script có chốt đếm số lần khớp, sai một lần là `sys.exit(1)` | None |
| `STEP-07` | `RQ-07` | Cập nhật hàng rào theo tập vị trí MỚI | ĐỎ trước: `EXIT=1`, `2 failed 9 passed`, diff tự liệt kê đúng `4` dòng đã mất và in `expected [ …(5) ] to have a length of 9 but got 5`. XANH sau: `11 passed`, `EXIT=0` | None |
| `STEP-08` | `RQ-08` | [src/domains/job-board/public-select.static.test.ts](src/domains/job-board/public-select.static.test.ts) | `git status --porcelain` RỖNG, `git diff` và `git diff --cached` RỖNG. Blob `HEAD` và `git hash-object` cùng là `a8cda720ac6737e4f1869f6be36faa8160dc8428`. Ba `it(` của `go-live-14` liệt kê theo dòng `53`, `57`, `63` | None |
| `STEP-09` | `RQ-09` | `npm run test:unit` rồi `npm run typecheck`, mã thoát lấy bằng redirect | Lane `107` tệp `1642` test, `S09_UNIT_EXIT=0`. Typecheck `S09_TSC_EXIT = 1` với tập nhận dạng lỗi GIỐNG mốc `STEP-01` và đếm `0` dòng đỏ nào nêu tên một tệp của task này | `LIM-02` cộng `LIM-03` |
| `STEP-10` | `RQ-09` | Kiểm phạm vi bằng `git status --porcelain` cộng `git diff --cached --numstat`, rồi ghi `HANDOFF.md` cộng `evidence/`, `git add` ngay sau khi ghi | `4` tệp mã nguồn bị ghi trong cửa sổ làm việc, đúng bằng nhóm 1 cộng nhóm 2. Mọi đường dẫn cấm chạm trả `0 dòng`. KHÔNG commit, KHÔNG push, KHÔNG deploy | `LIM-01` |

### 2.2. Round `2` — hai bước, không bước nào ghi vào `app/` hay `src/`

| Bước | AC | Lệnh/artifact | Result | Deviation từ TASK |
|---|---|---|---|---|
| `R2-01` | `AC-11` | `npm run test:unit > /tmp/r2-unit.txt 2>&1; echo "R2_UNIT_EXIT = $?"` rồi `npm run typecheck > /tmp/r2-tsc.txt 2>&1; echo "R2_TSC_EXIT = $?"` — mã thoát lấy bằng redirect, KHÔNG sau ống | Cả hai `= 0`. `Test Files 108 passed (108)`, `Tests 1654 passed (1654)`, `0` dòng `error TS`. Lượt hai của `typecheck` cũng `0`, nên kết luận không đứng trên cache ấm | None. `LIM-02` và `LIM-03` ĐÓNG |
| `R2-02` | `AC-04` | `npx vitest run --config vitest.unit.config.ts src/shared/security/required-relation-sweep.static.test.ts`, cộng `grep -n 'toHaveLength' <tệp hàng rào>`, cộng phép trừ tập giữa `12` vị trí `DEC-04` và `EXPECTED_HITS` | `11 passed (11)`, exit `0`. `EXPECTED_HITS` `8` = `3` + `5`; dòng `261` đòi `3`; `toHaveLength(4)` đếm `0`. `comm -12` `8`, `comm -23` `4`, `comm -13` `0` | None. `FND-01` ĐÓNG |
| `R2-03` | `AC-12` | `git status --porcelain` hợp `git diff --cached --name-only` rồi phân nhóm theo `4.2` bản `v1.4`; cộng `git status --porcelain` chạy riêng trên từng đường dẫn cấm chạm; cộng `git log --oneline -1` và `git rev-list --count e58a6c0..HEAD` | `U=420 ING=214 FA=206 UN=0 DUPE=0 OV=0 G2X=0`. `12`/`12` đường dẫn cấm chạm trả `0` dòng. `HEAD` `e58a6c0` bằng giá trị `STEP-01` đã ghi, `rev-list --count` bằng `0`. Bản `-uall`: `U=636`, `ING=214`, `UN=0` | None. `LIM-01` ĐÓNG ở bản `v1.4` |
| `R2-04` | — | Ghi §1, §2.2, §3.2, §5.1, §6, §7 của bản giao này rồi `git add` ngay, sau đó chạy `verify-handoff.ps1` CUỐI CÙNG | Xem §3.2 dòng cổng bản giao | `DEV-04` — TASK.md field `Current execution round` vẫn đếm `1` |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — | Cổng hợp đồng: `powershell -NoProfile -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-go-live-17-rls-required-relation-sweep/TASK.md` | `RESULT: PASS. TASK contract is ready for execution.` — `GATE17_EXIT = 0` | `evidence/s01-gate17.txt` — mười mã kiểm `[OK]`, gồm `T-05 all 12 AC row(s) name a measurable method` | `DEV-01`: TASK viết `pwsh`, máy này chỉ có Windows PowerShell 5.1 nên tôi chạy `powershell` |
| `AC-01` | `npx vitest run --config vitest.unit.config.ts src/shared/security/required-relation-sweep.static.test.ts` | `1 passed (1)` tệp, `11 passed (11)` test, `EXIT=0` | `evidence/s07-barrier-green.txt` — tệp [required-relation-sweep.static.test.ts](src/shared/security/required-relation-sweep.static.test.ts) tồn tại, `328` dòng | None |
| `AC-02` | `grep -c "<tên bảng>" src/shared/security/required-relation-sweep.static.test.ts` chạy lần lượt cho bảy bảng RLS thật, cộng `grep -n -e MIGRATIONS_DIR -e SCHEMA_PATH -e readdirSync -e readFileSync` trên cùng tệp | Cả bảy tên bảng đếm `0` — thấp hơn trần `1` mà AC cho phép. `readdirSync` cộng `readFileSync` từ `node:fs` (dòng `29`) đọc `prisma/migrations` (dòng `34`, `108`, `180`) và `prisma/schema.prisma` (dòng `35`, `221`) | `evidence/s02-barrier-structure.txt` mục (A) và (B), kèm `sha256` của tệp lúc đo. Không một tên bảng RLS thật nào là chuỗi literal trong tệp test; fixture âm chỉ dùng tên BỊA `fake_vault`, `fake_audit`, `fake_children` (mục D) | None |
| `AC-03` | `npx vitest run --config vitest.unit.config.ts src/shared/security/required-relation-sweep.static.test.ts` — hai `it(` mệnh đề MỘT và mệnh đề HAI | Xanh với sàn `MIN_RLS_TABLES = 34`, `MIN_DANGER_FIELDS = 21`, `MIN_DANGER_MODELS = 20`. Số ĐO thật: `34` bảng, `21` trường, `20` model | `evidence/s04-green.txt` cộng `evidence/s02-remeasure.txt`. Hai con số do `rlsTablesFrom` và `requiredRelationFields` tự suy tại thời điểm chạy, không có mảng literal nào | None |
| `AC-04` | `npx vitest run --config vitest.unit.config.ts src/shared/security/required-relation-sweep.static.test.ts` — mệnh đề BA, đối chiếu `sweep()` với `EXPECTED_HITS` | Ở `STEP-04` (trước khi sửa mã): tập vị trí KHỚP CHÍNH XÁC `12` dòng của `DEC-04`, cả đường dẫn và số dòng — `11 passed`, exit `0`. Nhánh `app/api/` đo được `3`, nhánh `src/` đo được `9` | `evidence/s04-green.txt`. Sau `STEP-06` tập ấy còn `8` dòng và hàng rào được cập nhật ở `STEP-07`: `evidence/s07-barrier-green.txt` | `FND-01` — lời văn `AC-04` đòi "bốn dòng thuộc `app/api/`", `DEC-04` chỉ liệt kê `3`, và `scratch/f05/usage.py` của Tier 1 đo lại cũng ra `3` |
| `AC-05` | `grep -n "describe('fixture âm" src/shared/security/required-relation-sweep.static.test.ts` cộng chính lượt chạy runner | `describe('fixture âm: ba detector phải BẮT được nguồn giả'` ở dòng `271`. Sáu `it(` bên trong nó chạy ba detector trên chuỗi nguồn BỊA và khẳng định detector BẮT được | `evidence/s07-barrier-green.txt` — trong `11 passed`, sáu test là fixture âm và năm test là mệnh đề thật. Số `6` lấy từ danh sách test của runner, KHÔNG lấy từ `grep -c "it("`: lệnh ấy đếm DÒNG và trả `14`, đối chiếu ở `evidence/s02-barrier-structure.txt` mục (E) | None |
| `AC-06` | `grep -n -e 'function stripComments' -e 'function stripSqlComments' -e 'stripComments(' -e 'stripSqlComments(' src/shared/security/required-relation-sweep.static.test.ts` | `stripComments` ở dòng `100`, bỏ cả `/* … */` và `// …`, được gọi ở dòng `147`, `202`. Cộng `stripSqlComments` ở dòng `125` cho comment `--` của SQL, gọi ở dòng `138` | `evidence/s02-barrier-structure.txt` mục (C), cộng `evidence/s07-barrier-green.txt` cho lượt chạy xanh. Khác một điểm CÓ Ý so với [public-select.static.test.ts:23](src/domains/job-board/public-select.static.test.ts#L23): chỗ bị bỏ thay bằng khoảng trắng GIỮ số dòng, vì kết luận của tệp này là một SỐ DÒNG | None |
| `AC-07` | Bảng phân loại `12` dòng ở `§3.1` dưới đây, mỗi dòng kèm một khối quote nguyên văn cùng số thứ tự | `12/12` dòng có nhánh A hay B, policy bảng cha quote nguyên văn kèm tệp migration và số dòng, policy bảng con quote nguyên văn ở mọi dòng nhánh B, và kết luận AN TOÀN hay RỦI RO. Tổng: `8` AN TOÀN cộng `4` RỦI RO | `evidence/s05-policy-classification.txt`, `307` dòng — nguồn của mọi quote | `DEV-02`: ô bảng markdown không chứa được SQL nhiều dòng, nên mỗi quote nằm trong một khối fenced có KHOÁ SỐ ngay dưới bảng |
| `AC-08` | `git diff --cached --numstat` cộng đọc từng hunk, đối chiếu với tập RỦI RO của `AC-07`; cộng `git status --porcelain` chạy riêng trên năm tệp giữ tám vị trí AN TOÀN | Tập đã sửa: `margin.service.ts:167`, `statement.service.ts:403`, `statement.service.ts:434`, `submission.service.ts:248` — TRÙNG KHÍT tập RỦI RO `{6, 7, 8, 12}`. Năm tệp giữ vị trí AN TOÀN đều trả `0 dòng` | `evidence/s10-scope.txt` mục (B) và (C). numstat: `25 4`, `30 8`, `23 2` | None |
| `AC-09` | `git status --porcelain src/domains/job-board/public-select.static.test.ts` | `0 dòng`. `git diff` và `git diff --cached` cùng `0 dòng`. Blob `HEAD` và `git hash-object` cây làm việc trùng nhau ở `a8cda720ac6737e4f1869f6be36faa8160dc8428` | `evidence/s08-untouched.txt` — ba `it(` của `go-live-14` còn nguyên ở dòng `53`, `57`, `63` | None |
| `AC-10` | `git status --porcelain prisma/` cộng `git diff --cached --name-only -- prisma/` | Cả hai `0 dòng` | `evidence/s10-scope.txt` mục (E) — `prisma/schema.prisma` và `prisma/migrations` đều trả ngoặc vuông RỖNG | None |
| `AC-11` | `npm run test:unit > s09-unit.txt 2>&1; echo "S09_UNIT_EXIT = $?"` rồi `npm run typecheck > s09-typecheck.txt 2>&1; echo "S09_TSC_EXIT = $?"` — mã thoát lấy bằng redirect, KHÔNG sau ống | Lane unit: `107` tệp `1642 passed`, `S09_UNIT_EXIT = 0`, không nhỏ hơn mốc `STEP-01` (`106` tệp `1631` test). Typecheck: `S09_TSC_EXIT = 1`, ĐÚNG MỘT dòng đỏ, ở `new-ui/components/JobCard.tsx(18,6)` | `evidence/s09-unit.txt`, `evidence/s09-typecheck.txt`, `evidence/s01-tsc.txt`, `evidence/s10-newui-attribution.txt` | `LIM-02` — dòng đỏ ấy KHÔNG đạt `exit 0` như AC đòi, nên ô này KHÔNG khai PASS. Dòng ấy **đã đỏ từ trước** bản sửa của tôi: cùng một định danh có mặt trong `evidence/s01-tsc.txt`, ảnh chụp mốc chạy ở cây `e58a6c0` TRƯỚC `STEP-06`. Nó thuộc `new-ui/`, thư mục chưa từng được commit bởi bất kỳ ai — `git log --oneline --all -- new-ui/` trả `0 dòng` — nên không quy được cho task này; cộng `LIM-03` về mã thoát tsc |
| `AC-12` | `git status --porcelain` cộng `git diff --cached --name-only` hợp lại rồi phân nhóm theo `4.2`; cộng `git status --porcelain` chạy riêng trên từng đường dẫn cấm chạm; cộng `git log --oneline -1` | Phân nhóm: nhóm 1 `1` tệp, nhóm 2 `3` tệp, nhóm 3 `15` tệp, nhóm 4 phần giao contract 18 staged từ trước. Nhóm 4 KHÔNG chứa tệp nào của nhóm 1 hay 2. Mười lăm đường dẫn cấm chạm đều `0 dòng`. `git log --oneline -1` → `e58a6c0`, KHÁC baseline `80f6933` | `evidence/s10-scope.txt` mục (A) tới (F), cộng `evidence/s10-baseline.txt` | `LIM-01` — mệnh đề cuối "`HEAD` bằng baseline" BẤT KHẢ THOẢ: `git rev-list --count 80f6933..HEAD` → `9`, và `git log --oneline --diff-filter=A -- …/TASK.md` → `d017d61`, tức baseline `80f6933` có TRƯỚC commit TẠO ra hợp đồng này |

### 3.1. Bảng phân loại `RQ-06`/`AC-07` — mười hai vị trí, mười hai kết luận

Ba câu hỏi của `DEC-03` áp theo ĐÚNG thứ tự này cho mỗi dòng: **(i)** quan hệ BẮT BUỘC hay NULLABLE — nullable thì invariant của `EV-07` KHÔNG THỂ nổ; **(ii)** policy bảng CHA là danh sách vai trò thuần (nhánh A) hay có predicate theo hàng (nhánh B); **(iii)** nhánh A — mọi vai trò tới được đường mã có nằm trong danh sách ấy không, nhánh B — policy bảng CON có dùng ĐÚNG predicate ấy trên ĐÚNG khoá ngoại ấy không.

Cột `Quote cha` và `Quote con` trỏ tới khoá của khối fenced ngay dưới bảng. `DEV-02`: ô bảng markdown không chứa được SQL nhiều dòng — một dấu ống trần phá số cột và `\|` vẫn cắt — nên quote nằm trong khối có khoá, KHÔNG nằm trong ô.

| # | Vị trí | Quan hệ | Bảng đang đọc → bảng CHA | (i) | (ii) | Quote cha | Quote con | (iii) | Kết luận |
|---|---|---|---|---|---|---|---|---|---|
| 1 | [app/api/projects/route.ts:65](app/api/projects/route.ts#L65) | `clientCompany` | `outsourcing_projects` → `client_companies` | BẮT BUỘC, `prisma/schema.prisma:365` | **A** — danh sách bảy vai trò thuần | `Q-C1` — `m1_07b_rls_runtime_posture_closure/migration.sql:133` | nhánh A không đòi | Cửa chặn của route có sáu vai trò `ADMIN`, `HR_MANAGER`, `HR_STAFF`, `PM`, `ACCOUNTANT`, `DIRECTOR`; cả sáu nằm trong bảy vai trò của `Q-C1` (danh sách còn thừa `SALE`) | **AN TOÀN** |
| 2 | [app/api/vendor/orders/route.ts:44](app/api/vendor/orders/route.ts#L44) | `project` | `staffing_orders` → `outsourcing_projects` | BẮT BUỘC, `prisma/schema.prisma:391` | **B** — `USING (hrp_project_visible_for(id))` | `Q-C2` — `m13_restore_rls_matrix/migration.sql:33` | `Q-C4` — `m13_restore_rls_matrix/migration.sql:38` | `Q-C4` dùng ĐÚNG predicate ấy trên ĐÚNG khoá ngoại: `hrp_project_visible_for(project_id)`. Hàng con đọc được ⇔ hàng cha đọc được, không còn khoảng trống nào (`EV-12`) | **AN TOÀN** |
| 3 | [app/api/vendor/submissions/route.ts:62](app/api/vendor/submissions/route.ts#L62) | `project` | `candidate_submissions` → `outsourcing_projects` | **NULLABLE**, `prisma/schema.prisma:499` — `project Project? @relation(...)` | **B** — `USING (hrp_project_visible_for(id))` | `Q-C2` — `m13_restore_rls_matrix/migration.sql:33` | `Q-C7` — `m14_rls_matrix_repair/migration.sql:126` | Câu (i) đã đóng dòng này: quan hệ nullable thì Prisma trả `null` chứ không ném. Câu (iii) vẫn đo vì câu trả lời ĐỔI nếu ai đó bỏ dấu hỏi: `Q-C7` KHÔNG dùng `hrp_project_visible_for(project_id)`, nó mở hàng cho `ACCOUNTANT` mà `Q-B1` không có | **AN TOÀN**, và lý do là SCHEMA chứ không phải policy — xem `FND-04` |
| 4 | [src/domains/applications/application-queue.service.ts:178](src/domains/applications/application-queue.service.ts#L178) | `project` | `candidate_submissions` → `outsourcing_projects` | **NULLABLE**, `prisma/schema.prisma:499` | **B** | `Q-C2` — `m13_restore_rls_matrix/migration.sql:33` | `Q-C7` — `m14_rls_matrix_repair/migration.sql:126` | Như dòng `3`, cùng bảng cha và cùng bảng con | **AN TOÀN** (SCHEMA) — xem `FND-04` |
| 5 | [src/domains/applications/application-queue.service.ts:211](src/domains/applications/application-queue.service.ts#L211) | `project` | `candidate_submissions` → `outsourcing_projects` | **NULLABLE**, `prisma/schema.prisma:499` | **B** | `Q-C2` — `m13_restore_rls_matrix/migration.sql:33` | `Q-C7` — `m14_rls_matrix_repair/migration.sql:126` | Như dòng `3` | **AN TOÀN** (SCHEMA) — xem `FND-04` |
| 6 | [src/domains/reconciliation/margin.service.ts:167](src/domains/reconciliation/margin.service.ts#L167) | `worker` | `project_assignments` → `workers` | BẮT BUỘC, `prisma/schema.prisma:588` | **B** — `USING (hrp_worker_visible_for(id))` | `Q-C3` — `m13_restore_rls_matrix/migration.sql:28` | `Q-C6` — `m14_rls_matrix_repair/migration.sql:62` | `Q-C6` KHÔNG hề gọi `hrp_worker_visible_for(worker_id)` — đếm được `0` lần. Khoảng trống CỤ THỂ: `Q-C6` cho `PM` thấy assignment thuộc dự án mình quản lý mà KHÔNG lọc `status`, còn `Q-B2` chỉ cho `PM` thấy worker qua một assignment có `a.status='ACTIVE'`. Một assignment đã kết thúc: hàng con đọc được, hàng cha không | **RỦI RO** — đã sửa theo `DEC-05` |
| 7 | [src/domains/reconciliation/statement.service.ts:403](src/domains/reconciliation/statement.service.ts#L403) | `worker` | `project_assignments` → `workers` | BẮT BUỘC, `prisma/schema.prisma:588` | **B** | `Q-C3` — `m13_restore_rls_matrix/migration.sql:28` | `Q-C6` — `m14_rls_matrix_repair/migration.sql:62` | Cùng khoảng trống của dòng `6`, cùng bảng cha và cùng bảng con | **RỦI RO** — đã sửa theo `DEC-05` |
| 8 | [src/domains/reconciliation/statement.service.ts:434](src/domains/reconciliation/statement.service.ts#L434) | `worker` | `project_assignments` → `workers` | BẮT BUỘC, `prisma/schema.prisma:588` | **B** | `Q-C3` — `m13_restore_rls_matrix/migration.sql:28` | `Q-C6` — `m14_rls_matrix_repair/migration.sql:62` | Cùng khoảng trống của dòng `6` | **RỦI RO** — đã sửa theo `DEC-05` |
| 9 | [src/domains/staffing/order.service.ts:153](src/domains/staffing/order.service.ts#L153) | `project` | `staffing_orders` → `outsourcing_projects` | BẮT BUỘC, `prisma/schema.prisma:391` | **B** | `Q-C2` — `m13_restore_rls_matrix/migration.sql:33` | `Q-C4` — `m13_restore_rls_matrix/migration.sql:38` | Như dòng `2`: cùng predicate, cùng khoá ngoại | **AN TOÀN** |
| 10 | [src/domains/staffing/order.service.ts:179](src/domains/staffing/order.service.ts#L179) | `project` | `staffing_orders` → `outsourcing_projects` | BẮT BUỘC, `prisma/schema.prisma:391` | **B** | `Q-C2` — `m13_restore_rls_matrix/migration.sql:33` | `Q-C4` — `m13_restore_rls_matrix/migration.sql:38` | Như dòng `2` | **AN TOÀN** |
| 11 | [src/domains/staffing/submission.service.ts:204](src/domains/staffing/submission.service.ts#L204) | `project` | `candidate_submissions` → `outsourcing_projects` | **NULLABLE**, `prisma/schema.prisma:499` | **B** | `Q-C2` — `m13_restore_rls_matrix/migration.sql:33` | `Q-C7` — `m14_rls_matrix_repair/migration.sql:126` | Như dòng `3` | **AN TOÀN** (SCHEMA) — xem `FND-04` |
| 12 | [src/domains/staffing/submission.service.ts:248](src/domains/staffing/submission.service.ts#L248) | `worker` | `source_claims` → `workers` | BẮT BUỘC, `prisma/schema.prisma:548` | **B** — `USING (hrp_worker_visible_for(id))` | `Q-C3` — `m13_restore_rls_matrix/migration.sql:28` | `Q-C5` — `m14_rls_matrix_repair/migration.sql:45` | `Q-C5` CÓ nhắc `hrp_worker_visible_for(worker_id)` — đếm được `1` lần — nhưng là một mệnh đề HOẶC thứ tư, không phải điều kiện duy nhất: hai mệnh đề trước nó mở hàng theo `vendor_id` và `ctv_id` mà KHÔNG đòi `accepted`, còn `Q-B2` đòi đúng `s.accepted` cho ba vai trò ấy. Một claim chưa `accepted` của chính vendor mình: hàng con đọc được, hàng cha không | **RỦI RO** — `500` THẬT, có người gọi, đã sửa theo `DEC-05` |

Tổng: **`8` AN TOÀN** (`1`, `2`, `3`, `4`, `5`, `9`, `10`, `11`) cộng **`4` RỦI RO** (`6`, `7`, `8`, `12`) — khớp `git diff --cached` ở `AC-08`.

#### Quote nguyên văn — mọi khối dưới đây trích bằng `sed -n` từ chính tệp migration, không gõ lại

Hai predicate được quote ở bản **CÓ HIỆU LỰC**, tức bản CUỐI CÙNG. `grep -rn 'FUNCTION hrp_project_visible_for' prisma/migrations` trả hai dòng (`s1_rls_project:11` và `m13:6`) và `grep -c 'CREATE OR REPLACE FUNCTION'` trên `m14` trả `0`, nên bản cuối của CẢ HAI nằm ở `m13`.

**`Q-B1` — predicate `hrp_project_visible_for`, bản CÓ HIỆU LỰC**

`$ sed -n '6,13p' prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql`

```sql
CREATE OR REPLACE FUNCTION hrp_project_visible_for(pid text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
 SELECT hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR','SALE')
 OR (hrp_session_role()='PM' AND EXISTS (SELECT 1 FROM outsourcing_projects p WHERE p.id=pid AND (p.pm_user_id=hrp_session_user_id() OR p.sub_pm_user_id_1=hrp_session_user_id() OR p.sub_pm_user_id_2=hrp_session_user_id())))
 OR (hrp_session_role()='WORKER' AND EXISTS (SELECT 1 FROM outsourcing_projects p WHERE p.id=pid AND (p.is_public OR EXISTS (SELECT 1 FROM project_assignments a JOIN workers w ON w.id=a.worker_id WHERE a.project_id=p.id AND a.status='ACTIVE' AND w.account_user_id=hrp_session_user_id()))))
 OR (hrp_session_role()='MKT' AND EXISTS (SELECT 1 FROM outsourcing_projects p WHERE p.id=pid AND p.is_public))
 OR (hrp_session_role() IN ('VENDOR_ADMIN','VENDOR_STAFF') AND hrp_session_vendor_id()<>'' AND EXISTS (SELECT 1 FROM outsourcing_projects p WHERE p.id=pid AND (p.is_public OR EXISTS (SELECT 1 FROM candidate_submissions s WHERE s.project_id=p.id AND s.vendor_id=hrp_session_vendor_id()))))
 OR (hrp_session_role()='CTV' AND EXISTS (SELECT 1 FROM outsourcing_projects p WHERE p.id=pid AND p.is_public));
$$;
```

Dòng thứ hai chỉ có `ADMIN`, `HR_MANAGER`, `DIRECTOR`, `SALE` — KHÔNG có `ACCOUNTANT`. Đó là cơ sở của `FND-04`.

**`Q-B2` — predicate `hrp_worker_visible_for`, bản CÓ HIỆU LỰC**

`$ sed -n '15,23p' prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql`

```sql
CREATE OR REPLACE FUNCTION hrp_worker_visible_for(wid text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
 SELECT hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR')
 OR (hrp_session_role()='HR_STAFF' AND EXISTS (SELECT 1 FROM workers w WHERE w.id=wid AND w.assigned_to_id=hrp_session_user_id()))
 OR (hrp_session_role()='SALE' AND EXISTS (SELECT 1 FROM workers w WHERE w.id=wid AND (w.owner_id=hrp_session_user_id() OR w.assigned_to_id=hrp_session_user_id())))
 OR (hrp_session_role()='PM' AND EXISTS (SELECT 1 FROM project_assignments a JOIN outsourcing_projects p ON p.id=a.project_id WHERE a.worker_id=wid AND a.status='ACTIVE' AND (p.pm_user_id=hrp_session_user_id() OR p.sub_pm_user_id_1=hrp_session_user_id() OR p.sub_pm_user_id_2=hrp_session_user_id())))
 OR (hrp_session_role() IN ('VENDOR_ADMIN','VENDOR_STAFF') AND EXISTS (SELECT 1 FROM source_claims s WHERE s.worker_id=wid AND s.accepted AND s.vendor_id=hrp_session_vendor_id()))
 OR (hrp_session_role()='CTV' AND EXISTS (SELECT 1 FROM source_claims s WHERE s.worker_id=wid AND s.accepted AND s.ctv_id=hrp_session_user_id()))
 OR (hrp_session_role()='WORKER' AND EXISTS (SELECT 1 FROM workers w WHERE w.id=wid AND w.account_user_id=hrp_session_user_id()));
$$;
```

Nhánh `PM` đòi `a.status='ACTIVE'`; ba nhánh `VENDOR_ADMIN`, `VENDOR_STAFF`, `CTV` đòi `s.accepted`. Hai điều kiện ấy là hai khoảng trống của dòng `6`-`8` và dòng `12`.

**`Q-C1` — policy CHA của dòng `1` — bảng `client_companies`**

`$ sed -n '133,135p' prisma/migrations/20260827160000_m1_07b_rls_runtime_posture_closure/migration.sql`

```sql
CREATE POLICY hrp_client_company_select ON client_companies
  AS PERMISSIVE FOR SELECT TO app_user_writer, app_user
  USING (hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR','ACCOUNTANT','SALE','HR_STAFF','PM'));
```

Nhánh **A**: một danh sách vai trò thuần, không một predicate theo hàng nào.

**`Q-C2` — policy CHA của dòng `2`, `3`, `4`, `5`, `9`, `10`, `11` — bảng `outsourcing_projects`**

`$ sed -n '33,33p' prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql`

```sql
  CREATE POLICY hrp_project_scope ON outsourcing_projects AS PERMISSIVE FOR ALL TO app_user_writer,app_user USING (hrp_project_visible_for(id)) WITH CHECK (hrp_project_writable(id));
```

**`Q-C3` — policy CHA của dòng `6`, `7`, `8`, `12` — bảng `workers`**

`$ sed -n '28,28p' prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql`

```sql
  CREATE POLICY hrp_worker_scope ON workers AS PERMISSIVE FOR ALL TO app_user_writer,app_user USING (hrp_worker_visible_for(id)) WITH CHECK (hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR') OR (hrp_session_role()='SALE' AND owner_id=hrp_session_user_id()) OR (hrp_session_role()='WORKER' AND account_user_id=hrp_session_user_id()));
```

**`Q-C4` — policy CON của dòng `2`, `9`, `10` — bảng `staffing_orders`**

`$ sed -n '38,38p' prisma/migrations/20260821103500_m13_restore_rls_matrix/migration.sql`

```sql
  CREATE POLICY hrp_staffing_order_scope ON staffing_orders AS PERMISSIVE FOR ALL TO app_user_writer,app_user USING (hrp_project_visible_for(project_id)) WITH CHECK (hrp_project_writable(project_id));
```

Dùng ĐÚNG `hrp_project_visible_for` trên ĐÚNG khoá ngoại `project_id` ⇒ không khoảng trống.

**`Q-C5` — policy CON của dòng `12` — bảng `source_claims`**

`$ sed -n '45,58p' prisma/migrations/20260830214139_m14_rls_matrix_repair/migration.sql`

```sql
CREATE POLICY hrp_source_claim_scope ON source_claims
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND vendor_id = hrp_session_vendor_id())
    OR (hrp_session_role() = 'CTV' AND ctv_id = hrp_session_user_id())
    OR hrp_worker_visible_for(worker_id)
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND vendor_id = hrp_session_vendor_id())
    OR (hrp_session_role() = 'CTV' AND ctv_id = hrp_session_user_id())
  );
```

`hrp_worker_visible_for(worker_id)` là mệnh đề HOẶC **thứ tư**; hai mệnh đề trước nó mở hàng theo `vendor_id` và `ctv_id` mà không đòi `accepted`.

**`Q-C6` — policy CON của dòng `6`, `7`, `8` — bảng `project_assignments`**

`$ sed -n '62,88p' prisma/migrations/20260830214139_m14_rls_matrix_repair/migration.sql`

```sql
CREATE POLICY hrp_project_assignment_scope ON project_assignments
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    -- PM: thấy assignment thuộc dự án mình quản lý (G14: cả ACTIVE + lịch sử)
    OR (hrp_session_role() = 'PM' AND EXISTS (
      SELECT 1 FROM outsourcing_projects p
      WHERE p.id = project_assignments.project_id AND p.pm_user_id = hrp_session_user_id()
    ))
    -- Worker thấy assignment của mình
    OR (hrp_session_role() = 'WORKER' AND EXISTS (
      SELECT 1 FROM workers w WHERE w.id = project_assignments.worker_id
      AND w.account_user_id = hrp_session_user_id()
    ))
    -- HR_STAFF/SALE: qua worker ownership
    OR EXISTS (
      SELECT 1 FROM workers w WHERE w.id = project_assignments.worker_id
      AND (
        (hrp_session_role() = 'HR_STAFF' AND w.assigned_to_id = hrp_session_user_id())
        OR (hrp_session_role() = 'SALE' AND (w.owner_id = hrp_session_user_id() OR w.assigned_to_id = hrp_session_user_id()))
      )
    )
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
  );
```

Không một lần nào gọi `hrp_worker_visible_for`. Phép đếm: `sed -n '61,88p' $M14 | grep -c hrp_worker_visible_for` → `0`; cùng phép đếm ấy trên `Q-C5` (`sed -n '44,58p'`) → `1`.

**`Q-C7` — policy CON của dòng `3`, `4`, `5`, `11` — bảng `candidate_submissions`**

`$ sed -n '126,143p' prisma/migrations/20260830214139_m14_rls_matrix_repair/migration.sql`

```sql
CREATE POLICY hrp_candidate_submission_scope ON candidate_submissions
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'SALE')
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND vendor_id = hrp_session_vendor_id())
    OR (hrp_session_role() = 'CTV' AND ctv_id = hrp_session_user_id())
    -- PM: submissions cho project mình quản lý
    OR (hrp_session_role() = 'PM' AND EXISTS (
      SELECT 1 FROM outsourcing_projects p
      WHERE p.id = candidate_submissions.project_id AND p.pm_user_id = hrp_session_user_id()
    ))
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR', 'ACCOUNTANT', 'SALE')
    OR (hrp_session_role() IN ('VENDOR_ADMIN', 'VENDOR_STAFF') AND vendor_id = hrp_session_vendor_id())
    OR (hrp_session_role() = 'CTV' AND ctv_id = hrp_session_user_id())
  );
```

Mở hàng cho `ACCOUNTANT` trong khi `Q-B1` không có `ACCOUNTANT` ⇒ bẫy ngủ nếu quan hệ ở `prisma/schema.prisma:499` bị đổi thành BẮT BUỘC (`FND-04`).

### 3.2. Round `2` — ba ô ĐANG CÓ HIỆU LỰC cho `AC-04`, `AC-11`, `AC-12`

Ba ô dưới đây THAY cho ba ô cùng mã ở bảng §3, vốn là bản ghi của round `1`. Chín AC còn lại không có dòng ở đây vì `Next gate` cấm đo lại chúng.

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — | Cổng hợp đồng chạy lại trên bản `v1.4`: `powershell -NoProfile -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-go-live-17-rls-required-relation-sweep/TASK.md` | `RESULT: DRAFT-VALID (1 warning(s))`, `EXIT = 0`. Mười một mã kiểm, mười `[OK]` cộng một `[WARN] A-04` | `evidence/r2-ac12-scope-final.txt` mục (12) ghi ngày đo; output cổng dẫn nguyên văn ở §5.1 dòng `DEV-05` | `DEV-05` — chuỗi `RESULT: PASS` chỉ in khi `Status` là `READY_FOR_EXECUTION`; với `READY_FOR_AUDIT` cổng hạ hai mã kiểm xuống không-chặn và in `DRAFT-VALID`. Dòng cổng `RESULT: PASS` mà `H-04` đòi là dòng của round `1` ở bảng §3 |
| `AC-04` | `npx vitest run --config vitest.unit.config.ts src/shared/security/required-relation-sweep.static.test.ts`; cộng `grep -n 'toHaveLength' src/shared/security/required-relation-sweep.static.test.ts`; cộng phép trừ tập `comm` giữa `12` vị trí `DEC-04` và `EXPECTED_HITS` | `1 passed (1)` tệp, `11 passed (11)` test, `EXIT=0`. `EXPECTED_HITS` = `8` = `3` `app/api/` + `5` `src/`. Dòng `261` đòi `3`; `toHaveLength(4)` đếm `0`. `comm -12` = `8`, `comm -23` = `4`, `comm -13` = `0`, `8 + 4 = 12` khớp `12` | `evidence/r2-ac04-hitset.txt` — `162` dòng, tám mục. Mục (7) là phép trừ tập, mục (8) là phổ trường quan hệ: `4/4` vị trí bị bỏ là `worker`, `0/8` vị trí giữ lại là `worker` | None — `FND-01` ĐÓNG. Lời văn `AC-04` vẫn nói "bốn dòng `app/api/`"; số ĐO là `3` và `DEC-04` cũng chỉ liệt kê `3`, nên hàng rào khẳng định số ĐO |
| `AC-11` | `npm run test:unit > /tmp/r2-unit.txt 2>&1; echo "R2_UNIT_EXIT = $?"` rồi `npm run typecheck > /tmp/r2-tsc.txt 2>&1; echo "R2_TSC_EXIT = $?"`, mã thoát lấy bằng redirect | `R2_UNIT_EXIT = 0` với `Test Files 108 passed (108)` và `Tests 1654 passed (1654)`; `R2_TSC_EXIT = 0` với `0` dòng `error TS`. Lượt hai của `typecheck` cũng `0` | `evidence/r2-ac11-lane.txt` — `51` dòng. Chênh `+2` tệp `+23` test so với mốc `STEP-01` (`106`/`1631`) quy đủ cho hai hàng rào: `11` test của task này cộng `12` của `rf-05` | None — `LIM-02` và `LIM-03` ĐÓNG. Nguyên nhân dòng đỏ mất là `rf-05` hạ `"include"` của `tsconfig.json` xuống allow-list, không phải ai sửa `new-ui/` |
| `AC-12` | `git status --porcelain` hợp `git diff --cached --name-only` rồi phân nhóm theo `4.2` bản `v1.4`; `git status --porcelain` chạy riêng trên `12` đường dẫn cấm chạm; `git log --oneline -1` cộng `git rev-list --count e58a6c0..HEAD` | `U=420`, `ING=214`, `FA=206`, `UN=0`, `DUPE=0`, `OV=0`, `G2X=0`. `12`/`12` đường dẫn cấm chạm `0` dòng. `HEAD` = `e58a6c0` = giá trị `STEP-01`, `rev-list --count` = `0`. Bản `-uall`: `U=636`, `ING=214`, `UN=0` | `evidence/r2-ac12-scope-final.txt` — `472` dòng, mười bốn mục, đo SAU khi mọi thứ đã stage; `evidence/r2-ac12-scope-final-uall.txt` cho bản `-uall`; `evidence/r2-ac12-scope.txt` cùng `evidence/r2-ac12-scope-uall.txt` là ảnh đo lúc MỞ round, nơi `UN` còn `2` | None — `LIM-01` ĐÓNG. Mục (7) tính DELTA `211` → `214` bằng `comm`, ba path thêm vào đều là artifact của chính task này; mục (8) chứng minh tập path đã đóng bằng một bản dựng lại độc lập chạy hai lượt cho cùng `sha1` |

## 4. Changed Deliverables

Phân nhóm theo đúng bốn nhóm của điều `4.2`, số dòng lấy từ `git diff --cached --numstat`. Đo đầy đủ trong `evidence/s10-scope.txt` mục (B) và (C).

| Path | Nhóm `4.2` | `+` / `−` | Vai trò trong bản giao |
|---|---|---|---|
| [src/shared/security/required-relation-sweep.static.test.ts](src/shared/security/required-relation-sweep.static.test.ts) | `1` | `328` / `0` | Hàng rào MỚI. Ba detector tự suy tập nguy hiểm lúc chạy, cộng fixture âm. Đúng MỘT tệp, bằng trần của nhóm `1` |
| [src/domains/reconciliation/margin.service.ts](src/domains/reconciliation/margin.service.ts) | `2` | `25` / `4` | Vị trí `6` (dòng `167` cũ). Bỏ `include: { worker }`, đọc `workerId`, tra tên bằng truy vấn thứ hai, tên thiếu thì `null` |
| [src/domains/reconciliation/statement.service.ts](src/domains/reconciliation/statement.service.ts) | `2` | `30` / `8` | Vị trí `7` và `8` (dòng `403`, `434` cũ). Hai khối giống nhau từng byte, sửa cùng một mẫu; hàng `assignment` giữ đủ trường vô hướng nên hình dạng response không đổi |
| [src/domains/staffing/submission.service.ts](src/domains/staffing/submission.service.ts) | `2` | `23` / `2` | Vị trí `12` (dòng `248` cũ) — `500` THẬT, nhánh MẶC ĐỊNH của `GET /api/jobs/submissions`. Dùng `findUnique` chứ không `findMany` vì fake của tệp test bất khả xâm phạm chỉ phơi `findUnique` (`FND-03`) |
| [docs/tasks/hrp-v5-go-live-17-rls-required-relation-sweep/HANDOFF.md](docs/tasks/hrp-v5-go-live-17-rls-required-relation-sweep/HANDOFF.md) | `3` | tệp này | Bản giao. `git add` ngay sau khi ghi, theo `STEP-10` |
| `docs/tasks/hrp-v5-go-live-17-rls-required-relation-sweep/evidence/` — `19` tệp | `3` | xem §6 | Bằng chứng của mười bước. Liệt kê từng tệp ở §6 |

**Nhóm `2` đúng `3` tệp, không phải `8`.** Trần của điều `4.2` là tám tệp `Modules`, nhưng nó chỉ cho chạm *"CHỈ những tệp có vị trí phân loại RỦI RO"*. Bốn vị trí RỦI RO nằm trong ba tệp, nên năm tệp `Modules` còn lại phải RỖNG — và chúng rỗng: `git status --porcelain` chạy riêng trên từng tệp trả `0 dòng` cho cả năm ([app/api/projects/route.ts](app/api/projects/route.ts), [app/api/vendor/orders/route.ts](app/api/vendor/orders/route.ts), [app/api/vendor/submissions/route.ts](app/api/vendor/submissions/route.ts), [src/domains/applications/application-queue.service.ts](src/domains/applications/application-queue.service.ts), [src/domains/staffing/order.service.ts](src/domains/staffing/order.service.ts)).

**Nhóm `4` có mặt trong cây, và KHÔNG phải công của task này.** `43` path thuộc [hrp-v5-go-live-18-public-surface-hardening](docs/tasks/hrp-v5-go-live-18-public-surface-hardening/HANDOFF.md) đang nằm trong index — đo bằng `git diff --cached --name-only` chạy trên vùng của contract ấy: một `HANDOFF.md`, `36` tệp `evidence/`, hai tệp dưới `app/` và bốn tệp dưới `src/`. Điều `4.2` khai chúng trước vì Owner giao ba contract trong MỘT lượt; §4 này không kể chúng là công của mình. `hrp-v5-test-01-browser-lane` chưa có path nào trong cây.

**Phần KHÔNG thuộc bốn nhóm, không do tôi tạo và không bị tôi chạm** (đo ở `evidence/s10-scope.txt` mục (D)): năm tệp gate dưới `.ai-pipeline/scripts/` — ba trong số đó đã STAGED SẴN trong index dùng chung trước khi lô này bắt đầu, `mtime` `2026-09-03 15:12:15`, Owner xác nhận `03/09` là *"ba tệp gate do anh sai thằng Agent khác sửa"*; ba `AUDIT.md` của lane khác đang ` M`; [public/index.html](public/index.html) đang ` M` do `copy-static.mjs`; và các path untracked có sẵn (`175` đường dẫn `scratch/*`, `new-ui/`, `.claude/`, `fix.patch`, …). Tôi không ghi, không unstage, không commit một path nào trong số đó.

**Round `2` giao ĐÚNG BA tệp, cả ba thuộc nhóm `3`, và bản giao MÃ là TẬP RỖNG.** Ba tệp là `evidence/r2-ac04-hitset.txt`, `evidence/r2-ac11-lane.txt` cùng bộ bốn tệp `r2-ac12-scope*.txt`, và chính tệp `HANDOFF.md` này — đã nằm trong index từ round `1` nên nó không làm tập path lớn thêm. Đo ở `evidence/r2-ac12-scope-final.txt` mục (7): `comm -13` giữa ảnh MỞ round (`211` path) và ảnh ĐÓNG round (`214` path) in đúng ba dòng, cả ba là artifact nhóm `3` của task này; `comm -23` in `RỖNG`, tức không path nào rời khỏi tập.

Bốn tệp mã của round `1` KHÔNG bị round `2` chạm một byte, và đây là phép đo chứ không phải lời khai — mục (13) của cùng tệp: `git diff --cached --numstat` trên bốn path trả `328/0`, `25/4`, `30/8`, `23/2`, so bằng `cmp` với đúng bốn con số §4 đã ghi ở round `1` cho `NUMSTAT_IDENTICAL = YES`; `git diff --numstat` (worktree so với index) trên bốn path trả `0` dòng, nên không có bản sửa nào đang nằm ngoài index; `git status --porcelain` trên bốn path trả `M `, `M `, `M `, `A ` — cột thứ hai TRỐNG ở cả bốn. Kết luận in ra là `BAN_GIAO_MA_ROUND_2 = TAP RONG`.

Vì vậy bảng §4 ở trên KHÔNG đổi một dòng nào: nó vẫn là bản kê đúng của round `1`, và round `2` chỉ làm số tệp `evidence/` tăng từ `19` lên `27` — `6` tệp đo lại ba AC, cộng `2` tệp giữ output của hai chu kỳ cổng. Dòng `evidence/` ở bảng §4 giữ con số `19` vì nó là bản kê của round `1`; con số đang đúng cho cả hai round là `27` ở §6, và `ls | wc -l` trên thư mục ấy trả `27`.

## 5. Deviations

| ID | Loại | Nội dung, kèm phép đo | Ảnh hưởng tới bản giao | Quyết định Tier 1 cần ra |
|---|---|---|---|---|
| `LIM-01` | Giới hạn — `AC-12` | Mệnh đề cuối của `AC-12` đòi *"`HEAD` bằng baseline, tức không có commit mới nào so với baseline"*. Baseline của contract là `80f6933`; `HEAD` là `e58a6c0`; `git rev-list --count 80f6933..HEAD` trả `9`. Trong chín commit ấy KHÔNG một commit nào của Tier 2 (`git log 80f6933..HEAD --author='Tier 2'` → `0`, và `git log 80f6933..HEAD` trên từng tệp trong bốn tệp của task này cũng → `0 commit`), và một trong chín — `d017d61`, đo bằng `git log --oneline --diff-filter=A -- <TASK.md>` — chính là commit TẠO ra TASK.md của task này. `git ls-tree -r --name-only 80f6933 -- <thư mục task>` trả `0 dòng` | Mệnh đề ấy bất khả thoả: thoả nó nghĩa là lùi cây về một trạng thái KHÔNG có chính hợp đồng này. Mọi mệnh đề khác của `AC-12` đo được và ĐẠT. Đo đầy đủ ở `evidence/s10-baseline.txt` | Sửa lời văn `AC-12` thành "không commit MỚI nào do Tier 2 tạo", hoặc bump `Baseline` lên `d017d61` trở lên. Đây là lệch của contract, không phải defect của bản giao |
| `LIM-02` | Giới hạn — `AC-11` | `npm run typecheck` exit `1` vì ĐÚNG MỘT dòng đỏ: `new-ui/components/JobCard.tsx(18,6): error TS2322`. Dòng ấy **đã đỏ từ trước** bản sửa của tôi — cùng định danh có mặt trong `evidence/s01-tsc.txt`, ảnh chụp mốc ở cây `e58a6c0` TRƯỚC `STEP-06`. `git log --oneline --all -- new-ui/` trả `0 dòng`, nên thư mục ấy chưa từng được commit bởi bất kỳ ai và không nằm trong cây baseline `80f6933`. `"exclude"` của `tsconfig.json` chỉ có `node_modules` | `AC-11` đòi cả hai lệnh exit `0`; ô `AC-11` ở §3 KHÔNG khai PASS. Bốn tệp của task này không mang một dòng `error TS` nào. `new-ui/` không thuộc bốn nhóm của `4.2` và cũng không thuộc path đã khai của hai contract cùng lô, nên `AC-11` không quy được nó cho contract nào trong lô | Ra quyết định về `new-ui/`: hoặc thêm nó vào `"exclude"` của `tsconfig.json` bằng một contract riêng, hoặc `AC-11` phải loại trừ path untracked của luồng khác. Đo ở `evidence/s10-newui-attribution.txt` |
| `LIM-03` | Giới hạn — dụng cụ | Mã thoát của `tsc` KHÔNG ổn định giữa hai lượt chạy liền nhau khi `"incremental": true`: lượt sau đọc `.tsbuildinfo` và có thể trả `0` dù dòng đỏ còn nguyên. Vì vậy `S09_TSC_EXIT` được lấy bằng redirect (`> tệp 2>&1; echo $?`), không sau ống, và kết luận về màu đỏ được rút từ TẬP ĐỊNH DANH lỗi trong output chứ không từ mã thoát | Không ảnh hưởng bản giao. Nó ảnh hưởng CÁCH đọc `AC-11`: mã thoát một mình không phân biệt được "đã sạch" với "cache còn ấm" | Ghi vào `CROSS-COMPAT.md`: mọi AC đòi `typecheck` exit `0` phải kèm cách đọc tập định danh lỗi, không chỉ mã thoát |
| `DEV-01` | Lệch cách chạy | `pwsh` KHÔNG có trên PATH của môi trường này. Mọi lệnh cổng chạy bằng `powershell -NoProfile -File …` thay cho `pwsh -File …` | Không ảnh hưởng kết luận: cổng hợp đồng vẫn `RESULT: PASS`, `GATE17_EXIT = 0`, ghi ở `evidence/s01-gate17.txt` | Không cần quyết định. Ghi để round sau không tưởng lệnh bị đổi ngầm (`FND-02`) |
| `DEV-02` | Lệch định dạng — `AC-07` | `AC-07` đòi mỗi dòng phân loại *"quote nguyên văn"* policy. Ô bảng markdown không chứa được SQL nhiều dòng: một dấu ống TRẦN phá số cột, và dạng có gạch chéo ngược đứng trước vẫn bị `Split-MdRow` của cổng cắt. Vì vậy cột `Quote cha`/`Quote con` của §3.1 mang KHOÁ, và quote nằm trong `9` khối fenced ngay dưới bảng, mỗi khối mở đầu bằng chính lệnh `sed -n '<dải>p' <tệp migration>` đã sinh ra nó | Không giảm mức bằng chứng — tăng: mỗi khối được ĐỔ TRỰC TIẾP từ `sed` vào tệp, nên nó verbatim theo cấu tạo, không phải do gõ lại. Cấu trúc bảng của `AC-07` giữ nguyên `12` dòng | Chấp nhận định dạng này, hoặc sửa `AC-07` để nói rõ quote được phép nằm dưới bảng theo khoá |
| `FND-01` | Finding — lời văn contract | `AC-04` đòi phép quét *"chứng minh bằng chính sự có mặt của **bốn** dòng thuộc `app/api/`"*. Số ĐO là `3`: `app/api/projects/route.ts:65`, `app/api/vendor/orders/route.ts:44`, `app/api/vendor/submissions/route.ts:62`. Chính danh sách `DEC-04` của contract cũng chỉ có ba dòng `app/api/`, và `scratch/f05/usage.py` của Tier 1 chạy lại cũng ra ba | Assertion trong hàng rào khẳng định số ĐO (`3`), không khẳng định con số của lời văn. Nếu để `4` theo lời văn thì test ĐỎ — đã xảy ra thật ở `STEP-04`, `S04_EXIT = 1`, `2 failed`, ghi ở `evidence/s04-green.txt` | Sửa `AC-04` từ "bốn dòng" thành "ba dòng". Đây là lệch số học của contract |
| `FND-02` | Finding — môi trường | Không có `pwsh` trên PATH; chỉ có `powershell` (Windows PowerShell `5.1`). Mọi TASK sau nên viết lệnh cổng bằng `powershell -NoProfile -File` để Tier 3 chạy lại được nguyên văn | Không ảnh hưởng bản giao (`DEV-01`) | Cập nhật mẫu lệnh cổng trong `.ai-pipeline` |
| `FND-03` | Finding — dư nợ do rào cản | Vị trí `12` phải tra tên worker bằng `tx.worker.findUnique` gọi trong một vòng `Promise.all`, KHÔNG bằng một `findMany({ where: { id: { in: [...] } } })`. Lý do: fake `tx.worker` của `src/domains/staffing/submission.service.test.ts:114` chỉ phơi `findUnique`, và điều `4.2` xếp mọi test khác ngoài tệp hàng rào mới vào cột CẤM CHẠM, nên tôi không được sửa fake ấy | Đúng về hành vi, kém về số lượt truy vấn: trang admin này có `take` tối đa `50` nên số lượt bị chặn trên ở `50`. Không phải N+1 không giới hạn | Một task nhỏ: mở fake ở `submission.service.test.ts` cho `findMany`, rồi đổi vòng `findUnique` thành một `findMany` duy nhất. Ước lượng: một tệp test, một hàm |
| `FND-04` | Finding — bẫy NGỦ | Policy của `candidate_submissions` (`m14_rls_matrix_repair:126-143`, quote `Q-C7`) mở hàng cho `ACCOUNTANT`, trong khi `hrp_project_visible_for` (`m13:6-13`, quote `Q-B1`) KHÔNG có `ACCOUNTANT`. Bốn vị trí `3`, `4`, `5`, `11` hiện AN TOÀN chỉ vì `prisma/schema.prisma:499` khai `project Project?` — NULLABLE | Không phải defect hôm nay. Nhưng đổi một dấu hỏi ở `schema.prisma:499` thành quan hệ bắt buộc sẽ bật `Inconsistent query result` cho `ACCOUNTANT` ở bốn vị trí cùng lúc, và không một test nào hiện có bắt được | Ghi vào rủi ro của schema: dòng `499` không được đổi thành BẮT BUỘC mà không sửa `hrp_project_visible_for` trước. Điều `4.3` cấm nới quyền nên tôi KHÔNG thêm `ACCOUNTANT` vào hàm ấy |
| `FND-05` | Finding — defect của chính artifact của tôi | `evidence/s01-tsc.txt` chứa BA dòng "so dong 'error TS'" mâu thuẫn (`1`, rồi `2`, rồi `1`) vì `grep -c 'error TS'` chạy trên một tệp ĐANG TỰ TRÍCH chính nó thì đếm cả dòng trích. Tôi tự khai, và mọi kết luận về màu đỏ trong bản giao này đọc TẬP ĐỊNH DANH lỗi chứ không đọc con số đó | Không ảnh hưởng kết luận: tập định danh của `s01` và `s09` bằng nhau, đúng một phần tử `new-ui/components/JobCard.tsx(18,6) error TS2322` | Không cần quyết định. Ghi để Tier 3 không dùng ba con số ấy làm số đo |
| `FND-06` | Finding — dụng cụ cổng | Cổng handoff báo `[WARN] H-15 TASK.md control field(s) differ from HEAD: Next gate`. Tôi KHÔNG chạm field ấy: `git status --porcelain` và `git diff HEAD` trên TASK.md của task này đều trả `0 dòng`, và dòng `20` đọc từ worktree giống dòng `20` đọc từ `git show HEAD:`. Nguyên nhân đo được: `verify-handoff.ps1:323` so CHUỖI ĐÃ GIẢI MÃ giữa một lượt `Get-Content -Raw` (nhánh worktree) và một lượt `git show` (`gate-lib.ps1:119`). Chạy trực tiếp hai hàm ấy cho ba field thuần ASCII `EQUAL=True`, còn field tiếng Việt `EQUAL=False` với độ dài BẰNG NHAU `204` — không ký tự nào thêm hay mất, chỉ phép giải mã lệch, vì Windows PowerShell `5.1` đọc mặc định theo codepage ANSI/OEM chứ không UTF-8 | Không ảnh hưởng bản giao: `H-15` là WARN, không phải error, và `RESULT` của cổng không đổi vì nó. Nhưng vết ấy sẽ lặp lại với BẤT KỲ task nào có dấu tiếng Việt trong bốn field `Status`, `Current audit round`, `Next gate`, `Spec version` — tức gần như mọi task của repo này, và Tier 3 sẽ đọc nó thành "Tier 2 ghi vào field của Tier 1" | Sửa `gate-lib.ps1`/`verify-handoff.ps1` để đọc worktree bằng `-Encoding UTF8`, hoặc so bằng `git hash-object` thay cho so chuỗi. Tôi KHÔNG tự sửa: hai tệp ấy thuộc luồng Agent khác và điều `4.3` cấm chạm. Đo ở `evidence/s10-gate-h15-artifact.txt` |

### 5.1. Round `2` — ba giới hạn của round `1` ĐÓNG, bốn lệch mới của dụng cụ

Ba mục `LIM-01`, `LIM-02`, `LIM-03` ở bảng trên là bản ghi của round `1`. Ba mục ấy ĐÓNG ở round `2`, và không mục nào đóng bằng lời văn — mỗi mục đóng bằng một phép đo:

| ID round `1` | Trạng thái sau round `2` | Phép đo đã đóng nó |
|---|---|---|
| `LIM-01` | ĐÓNG | Bản `v1.2` của contract đổi mệnh đề cuối `AC-12` từ *"`HEAD` bằng baseline"* sang phép so `git log --oneline -1` với giá trị `STEP-01` đã ghi. Đo lại: `HEAD` = `e58a6c0`, `evidence/s10-baseline.txt` dòng `5` ghi `HEAD : e58a6c0`, và `git rev-list --count e58a6c0..HEAD` = `0`. Mệnh đề không còn bất khả thoả và nó ĐẠT (`evidence/r2-ac12-scope-final.txt` mục (10)) |
| `LIM-02` | ĐÓNG | `npm run typecheck` trả `R2_TSC_EXIT = 0` với `0` dòng `error TS`. Nguyên nhân KHÔNG phải ai sửa `new-ui/`: `hrp-v5-rf-05-tsc-program-boundary` hạ `"include"` của `tsconfig.json` từ `**/*.ts` xuống allow-list, nên `new-ui/` rời khỏi chương trình `tsc`. Tôi không chạm một byte nào dưới `new-ui/` (`evidence/r2-ac11-lane.txt`) |
| `LIM-03` | ĐÓNG cho round này | Mã thoát vẫn lấy bằng redirect chứ không sau ống, và `typecheck` chạy LƯỢT HAI cũng trả `0`. Vì tập định danh lỗi rỗng ở cả hai lượt, kết luận không tựa vào cache còn ấm. `LIM-03` vẫn đúng như một tính chất của dụng cụ và vẫn nên vào `CROSS-COMPAT.md` |

Bốn lệch MỚI, tất cả thuộc dụng cụ hoặc thuộc field của Tier 1, không một cái nào là bản sửa mã:

| ID | Loại | Nội dung, kèm phép đo | Ảnh hưởng tới bản giao | Quyết định Tier 1 cần ra |
|---|---|---|---|---|
| `DEV-03` | Lệch dụng cụ — `H-15` | `[WARN] H-15` của cổng handoff lần này là LỆCH THẬT, không phải định dạng giả như `FND-06`: cả bốn field mà `verify-handoff.ps1:323` so đều khác `HEAD` — `Status` `READY_FOR_AUDIT` so với `READY_FOR_EXECUTION`, `Current audit round` `1` so với `0`, `Spec version` `v1.4` so với `v1.1`, và `Next gate` đổi hẳn nội dung. Người ghi là Tier 1, và điều đó ĐO ĐƯỢC chứ không phải tôi khai: cùng một diff staged trên TASK.md mang THÊM ba dòng changelog `v1.2`, `v1.3`, `v1.4` và KHÔNG xoá dòng changelog nào (`3` thêm, `0` xoá). Vết tồn tại vì ràng buộc **KHÔNG commit** của Owner: bản `v1.4` nằm trong index mà chưa vào `HEAD`, nên mọi phép so với `HEAD` tất yếu lệch | Không ảnh hưởng: `H-15` là WARN. Nhưng Tier 3 sẽ đọc nó thành *"Tier 2 ghi vào field của Tier 1"* nếu chỉ đọc dòng cảnh báo | Không cần quyết định về bản giao. Khi commit lô này thì vết tự tắt. Đo ở `evidence/r2-ac12-scope-final.txt` mục (14) |
| `DEV-04` | Lệch field — `Current execution round` | `TASK.md` khai `Current execution round` = `1`, còn `HANDOFF.md` này khai `Execution round` = `2`. Tôi KHÔNG sửa field ấy: `CLAUDE.md` điều `1` và `2` cho Tier 1 độc quyền `TASK.md`, và điều `4.2` xếp `docs/tasks/**/TASK.md` vào hạng tài sản của luồng khác. Cổng KHÔNG báo lỗi vì `H-03` không so hai field ấy với nhau; nó chỉ đòi `Execution round` của HANDOFF là số dương | Không ảnh hưởng phép đo nào. Nó ảnh hưởng cách đọc: ai so hai tệp sẽ thấy lệch `1` | Tier 1 nâng `Current execution round` lên `2` khi ra lệnh audit round `2`. Đây là việc của Tier 1, không phải defect của bản giao |
| `DEV-05` | Lệch từ vựng cổng | Cổng hợp đồng in `RESULT: DRAFT-VALID (1 warning(s))`, `TASK_GATE_EXIT = 0`, chứ KHÔNG in `RESULT: PASS`. Nguyên nhân đo được ở output: `[WARN] A-04 status is 'READY_FOR_AUDIT' - placeholder and dry-run checks are non-blocking`. Mười một mã kiểm, `10` `[OK]` cộng `1` `[WARN]` | Không ảnh hưởng: mức nặng của `A-04` phụ thuộc `Status`, và `Status` là field của Tier 1. Dòng `RESULT: PASS` mà `H-04` quét là dòng của round `1` ở bảng §3, vẫn còn nguyên | Không cần quyết định. Ghi để round sau không tưởng cổng bị hạ cấp. Output đầy đủ ở `evidence/r2-gate-handoff.txt` |
| `DEV-06` | Lệch cấu tạo — artifact của cổng | Hai path nhóm `3` BẮT BUỘC sinh SAU bản kiểm kê path, vì một lần chạy cổng không thể vừa nằm trong tài liệu nó kiểm vừa kiểm đúng những byte cuối của tài liệu ấy: `evidence/r2-gate-handoff.txt` (chu kỳ `1`) và `evidence/r2-gate-final.txt` (chu kỳ `2`, chạy trên đúng byte cuối). Cả hai được TIỀN ĐĂNG KÝ ở mục (14e) và (14h) của bản kiểm kê, với con số dự đoán `U` = `420 + 2` = `422` | Không ảnh hưởng `AC-12`: cả hai là nhóm `3` của chính task này, và `4.2` cho nhóm `3` không có trần số tệp | Không cần quyết định. Tier 3 đo lại sẽ thấy `422` chứ không `420`, và con số ấy đã được dự đoán TRƯỚC khi hai tệp tồn tại |
| `FND-07` | Finding — dụng cụ mất khả năng phát hiện | `H-15` bây giờ KHÔNG còn phân biệt được hai thứ khác nhau về bản chất: một lệch THẬT do ai đó ghi vào field của Tier 1, và một lệch GIẢ do `gate-lib.ps1:119` giải mã UTF-8 theo codepage ANSI (`FND-06`, đo ở `evidence/s10-gate-h15-artifact.txt`: field tiếng Việt `EQUAL=False` ở độ dài BẰNG NHAU `204`). Với mọi task có dấu tiếng Việt trong bốn field ấy, `H-15` cảnh báo ở CẢ HAI trường hợp, nên một cảnh báo `H-15` không còn là bằng chứng của tampering | Không ảnh hưởng bản giao này vì tôi đã đo riêng ai ghi (`DEV-03`). Ảnh hưởng mọi round sau: `H-15` là mã kiểm duy nhất canh việc tầng dưới ghi vào field của tầng trên, và nó đang mù | Sửa nguồn: đọc worktree bằng `-Encoding UTF8` hoặc so bằng `git hash-object`. Tôi KHÔNG tự sửa — hai tệp gate ấy thuộc luồng Agent khác và `4.3` cấm chạm. Đây là finding gộp `FND-06` lên một mức: `FND-06` là một dương tính giả, `FND-07` là hệ quả rằng mã kiểm ấy không còn dùng được |

## 6. Evidence Index

`27` tệp, tất cả nằm dưới `docs/tasks/hrp-v5-go-live-17-rls-required-relation-sweep/evidence/`: `19` tệp của round `1` (tiền tố `s01`..`s10`) cộng `8` tệp của round `2` (tiền tố `r2-`). Cột `Dòng` là số đo bằng `wc -l` lúc ghi §6 này; nó có ở đây để Tier 3 phát hiện được một tệp bị cắt về `0` byte — bẫy đã xảy ra bảy lần trong repo này.

**Hai hàng cuối ghi "xem ghi chú" ở cột `Dòng`, và đó là phép ghi ĐÚNG chứ không phải chỗ trống.** Hai tệp ấy là output của chính hai lần chạy cổng, mà một lần chạy cổng chỉ xảy ra SAU khi §6 này đã khoá — ghi một con số vào đây sẽ là ghi con số của một tệp chưa tồn tại đủ. Phép kiểm cắt-về-`0` vẫn dùng được nguyên vẹn: `wc -l` trên hai tệp ấy khác `0` là tệp còn nguyên.

| Tệp | Dòng | STEP | Nó CHỨNG MINH điều gì |
|---|---|---|---|
| `s01-gate17.txt` | `22` | `STEP-01` | Cổng hợp đồng trên TASK.md của task này: `RESULT: PASS`, `GATE17_EXIT = 0`. Chạy bằng `powershell -NoProfile -File` (`DEV-01`) |
| `s01-tsc.txt` | `38` | `STEP-01` | Mốc TRƯỚC mọi bản sửa: `npm run typecheck` đã đỏ sẵn ĐÚNG MỘT định danh `new-ui/components/JobCard.tsx(18,6): error TS2322`. Nền của `LIM-02`. Ba con số "so dong" trong tệp này là defect tôi tự khai ở `FND-05` |
| `s01-unit.txt` | `143` | `STEP-01` | Mốc TRƯỚC: `npm run test:unit` xanh trên lane canonical, kèm tổng số tệp và số test để đối chiếu với `s09-unit.txt` |
| `s02-barrier-structure.txt` | `51` | `STEP-02` | Số đo cấu trúc của hàng rào MỚI, cho `AC-02` (A), `AC-05` (B) và `AC-06` (C, D): bảy tên bảng RLS THẬT mỗi tên `grep -c` → `0`; các vị trí đọc `node:fs`; `stripComments` ở `100` và `stripSqlComments` ở `125` với ba chỗ gọi; bảy tên bảng BỊA của fixture âm. Mục (E) ghi lệch `grep -c 'it('` → `14` so với runner → `11 passed` |
| `s02-remeasure.txt` | `90` | `STEP-02` | Chạy LẠI bốn script của Tier 1 trên cây hiện tại: `34` bảng RLS, `21` trường trên `20` model, `12` điểm trên `8` tệp, và sha256 của bốn tệp JSON GIỐNG trước/sau ⇒ không finding nào ở `STEP-02` |
| `s04-green.txt` | `114` | `STEP-04` | Lượt ĐỎ có chủ ý rồi lượt XANH của hàng rào. Đây là tệp chứng minh `FND-01`: bản `4` dòng `app/api/` theo lời văn `AC-04` cho `S04_EXIT = 1` với `2 failed`; bản `3` dòng theo số ĐO cho `0` |
| `s05-policy-classification.txt` | `307` | `STEP-05` | Phép phân loại hai nhánh của `DEC-03` trên `12` vị trí: kết luận `8` AN TOÀN, `4` RỦI RO, kèm quote policy cha và policy con cho từng dòng. Nguồn của §3.1 và của `9` khối quote |
| `s06-fix.py` | `168` | `STEP-06` | Script đã sửa `4` vị trí RỦI RO theo mẫu `DEC-05`. Nó khớp chuỗi CHÍNH XÁC và `sys.exit(1)` khi số lần khớp lệch, nên nó không thể sửa mờ |
| `s07-barrier-green.txt` | `12` | `STEP-07` | Hàng rào XANH sau khi tập kỳ vọng hạ từ `12` xuống `8`: `11 passed` |
| `s07-barrier-red.txt` | `68` | `STEP-07` | Hàng rào tự LIỆT KÊ đúng bốn dòng đã mất khi tập kỳ vọng còn `12`. Đây là nơi con số `8` được ĐO, không phải nơi nó được trừ trên giấy |
| `s07-barrier.py` | `122` | `STEP-07` | Script cập nhật hàng rào: bốn khối, mỗi khối một lần khớp |
| `s08-untouched.txt` | `18` | `STEP-08` | `git status --porcelain` trên từng path trong cột CẤM CHẠM của `4.2` → `0 dòng` cho tất cả, kể cả `prisma/schema.prisma`, `public-select.static.test.ts` và sáu tệp của contract `16` |
| `s09-typecheck.txt` | `47` | `STEP-09` | `npm run typecheck` SAU bản sửa: cùng đúng một định danh đỏ của `new-ui/`, không thêm một dòng nào từ bốn tệp của task này |
| `s09-unit.txt` | `140` | `STEP-09` | `npm run test:unit` SAU bản sửa: xanh, và tổng số test tăng đúng phần của tệp hàng rào mới |
| `s10-gate-h15-artifact.txt` | `103` | `STEP-10` | Nền của `FND-06`: `[WARN] H-15` của cổng handoff là một định dạng giả của dụng cụ. Mục (A) `git status --porcelain` cùng `git diff HEAD` trên TASK.md → `0 dòng`; mục (C) loại bỏ giả thuyết CRLF; mục (D) chạy chính `Get-ControlField` và `Get-GitFileAtHead` → ba field ASCII `EQUAL=True`, riêng field tiếng Việt `EQUAL=False` với độ dài BẰNG NHAU `204` |
| `s10-baseline.txt` | `39` | `STEP-10` | Nền của `LIM-01`: `git rev-list --count 80f6933..HEAD` → `9`; không commit nào của Tier 2 chạm bốn tệp; `d017d61` là commit TẠO TASK.md; `git ls-tree` của baseline trên thư mục task → `0 dòng` |
| `s10-newui-attribution.txt` | `53` | `STEP-10` | Nền của `LIM-02`: cùng một dòng đỏ ở CẢ `s01` và `s09`; `git log --oneline --all -- new-ui/` → `0 dòng`; `git ls-tree` của `80f6933` và của `e58a6c0` trên `new-ui/` → `0`; đọc verbatim `tsconfig.json:36-48` và `grep -c 'new-ui' tsconfig.json` → `0` |
| `s10-scope.txt` | `300` | `STEP-10` | Phạm vi: `git status --porcelain` cộng `git diff --cached --numstat`, phân đúng bốn nhóm của `4.2`, cộng mục (D) quy thuộc từng path NGOÀI bốn nhóm cho luồng khác |
| `s10-handoff-gate.txt` | `30` | `STEP-10` | Cổng bản giao chạy trên chính tệp này: `RESULT: PASS WITH WARNINGS`, `HANDOFF_GATE_EXIT = 0`. Hai `[WARN]` còn lại là `H-01` (chưa stage — `git add` chạy ngay sau lệnh ấy) và `H-15` (định dạng giả, giải ở `FND-06`) |
| `r2-ac04-hitset.txt` | `162` | `R2-02` | `AC-04` round `2`: `11 passed (11)`, `EXIT=0`; `EXPECTED_HITS` = `8` = `3` `app/api/` + `5` `src/`; dòng `261` đòi `3`; `toHaveLength(4)` đếm `0`. Mục (7) là phép trừ tập bằng `comm` (`8` giữ, `4` bỏ, `0` sót); mục (8) là phổ trường quan hệ: `4/4` vị trí bị bỏ là `worker`, `0/8` vị trí giữ lại là `worker` |
| `r2-ac11-lane.txt` | `51` | `R2-01` | `AC-11` round `2`: `R2_UNIT_EXIT = 0` với `Test Files 108 passed (108)` và `Tests 1654 passed (1654)`; `R2_TSC_EXIT = 0` với `0` dòng `error TS`, lượt hai cũng `0`. Chênh `+2` tệp `+23` test so với mốc `STEP-01` quy đủ cho `11` test của task này cộng `12` của `rf-05` |
| `r2-ac12-scope.txt` | `362` | `R2-03` | Ảnh kiểm kê path lúc MỞ round `2`, khi `UN` còn `2`. Giữ lại để Tier 3 thấy `LIM-01` được đóng bằng bản `v1.4` của `4.2` chứ không bằng cách xoá một path nào |
| `r2-ac12-scope-uall.txt` | `290` | `R2-03` | Cùng phép đo dưới `--untracked-files=all` lúc mở round |
| `r2-ac12-scope-final.txt` | `472` | `R2-03` | Bản kiểm kê ĐANG CÓ HIỆU LỰC, mười bốn mục, đo SAU khi mọi thứ đã stage: `U=420 ING=214 FA=206 UN=0 DUPE=0 OV=0 G2X=0`. Mục (7) DELTA `211`→`214` bằng `comm`; mục (8) dựng lại tập path bằng một bản độc lập chạy HAI lượt cho cùng `420` và cùng `sha1=042e9efc3a0aef57`, `cmp` giống từng byte; mục (9) `12`/`12` đường dẫn cấm chạm `0` dòng; mục (10) `HEAD = e58a6c0` với `rev-list --count` = `0`; mục (13) `NUMSTAT_IDENTICAL = YES` cùng `UNSTAGED_LINES = 0`; mục (14) nền của `DEV-03` và tiền đăng ký hai tệp cổng |
| `r2-ac12-scope-final-uall.txt` | `286` | `R2-03` | Bản `-uall` của cùng phép đo cuối: `U=636 ING=214 FA=422 UN=0`. `ING` bằng đúng bản thường, nên `216` path untracked thêm vào đều rơi vào hạng tài sản của luồng khác |
| `r2-gate-handoff.txt` | xem ghi chú | `R2-04` | Chu kỳ `1` của cổng: output THẬT của `verify-task.ps1` trên bản `v1.4` (`RESULT: DRAFT-VALID (1 warning(s))`, `TASK_GATE_EXIT = 0`, `10` `[OK]` + `1` `[WARN] A-04`) rồi `verify-handoff.ps1` trên bản HANDOFF vừa khoá §5.1/§6/§7, cho `RESULT: PASS WITH WARNINGS (1 warning(s))` và `HANDOFF_GATE_EXIT = 0`: mười ba `[OK]` cộng đúng một `[WARN] H-15` liệt kê bốn field `Status`, `Current audit round`, `Next gate`, `Spec version` — giải ở `DEV-03` và `FND-07`. Nền của `DEV-05` |
| `r2-gate-final.txt` | xem ghi chú | `R2-04` | Chu kỳ `2` của cổng, chạy trên ĐÚNG những byte cuối cùng của tệp này, cộng phép kiểm lại con số `U` = `422` đã tiền đăng ký ở mục (14h). Nền của `DEV-06` |

## 7. Execution Round History

| Round | Ngày | Điều gì đã chạy | Kết cục |
|---|---|---|---|
| 1 | 2026-09-04 | Mười bước `STEP-01`..`STEP-10` chạy liền một lượt: cổng hợp đồng, đo lại bốn script của Tier 1, viết hàng rào tự-suy `3` detector cộng fixture âm, đỏ-trước-xanh, phân loại `12` vị trí theo `DEC-03`, sửa `4` vị trí RỦI RO theo `DEC-05`, hạ tập kỳ vọng `12` → `8`, kiểm cột CẤM CHẠM, chạy lại `typecheck` cùng `test:unit`, rồi ghi bản giao này | `READY_FOR_AUDIT`. `11/12` AC đo được và ĐẠT; `AC-11` không khai PASS vì `LIM-02`; `AC-12` đạt mọi mệnh đề trừ mệnh đề bất khả thoả ở `LIM-01`. Sáu finding `FND-01`..`FND-06`, trong đó `FND-06` giải thích vết `[WARN] H-15` của chính cổng handoff |
| 2 | 2026-09-04 | Round MỎNG theo `Next gate`: KHÔNG một dòng mã nào đổi. Bốn bước `R2-01`..`R2-04` chỉ đo lại ba AC mà round `1` không khép được, sau khi `hrp-v5-rf-05-tsc-program-boundary` đã thi hành. `R2-01` chạy lại `test:unit` cùng `typecheck`; `R2-02` chạy lại tệp hàng rào và tính lại phép trừ tập `12` → `8`; `R2-03` kiểm kê lại toàn bộ path theo `4.2` bản `v1.4` rồi chứng minh tập path đã đóng; `R2-04` ghi §3.2, §5.1 và tám hàng §6 của bản giao này | `READY_FOR_AUDIT`. Ba AC đều ĐẠT: `AC-04` `11 passed`, `AC-11` hai lệnh cùng exit `0` với `0` dòng `error TS`, `AC-12` `UN=0` với `12`/`12` đường dẫn cấm chạm rỗng và `rev-list --count` `0`. `LIM-01`, `LIM-02`, `LIM-03` ĐÓNG; bốn lệch mới `DEV-03`, `DEV-04`, `DEV-05`, `DEV-06` cộng finding `FND-07` đều thuộc dụng cụ hoặc field của Tier 1, không một cái nào là bản sửa mã. Chín AC còn lại KHÔNG đo lại, theo đúng `Next gate` |

Handoff status: READY_FOR_AUDIT
