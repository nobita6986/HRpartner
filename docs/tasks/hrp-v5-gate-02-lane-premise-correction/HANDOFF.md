# HANDOFF — hrp-v5-gate-02-lane-premise-correction

## 0. Control

| Field | Value |
| --- | --- |
| Task slug | `hrp-v5-gate-02-lane-premise-correction` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.2` |
| Execution round | `1` |
| Current audit round | `0` |
| Executor | `Tier 2 — Engineer` |
| Baseline | `HEAD 31625c4`. `gate-lib.ps1` và `verify-handoff.ps1` vào round ở ĐÚNG byte `EV-06` (`43ada847...`, `3997dd4f...`); `verify-audit.ps1` lệch `EV-06` ngay lúc mở round — nguyên nhân A của `DEC-09`, ba khoản phải trả nằm trong `evidence/step01-fingerprint.txt` và một hàng `LIM-01` |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-09-05 11:20 → 13:2x (Asia/Bangkok, giờ host)` |

Vòng này chạy đúng spec **`v1.2`** của `TASK.md` (blob `7246f37eb962763b6184b81977d2ff6860f45c50`, đo lại lúc viết bản giao này), không phải một bản đọc trước đó.

## 1. Outcome Summary

Cổng bàn giao và cổng audit thôi khẳng định một tiền đề mà `rf-06` đã bác.

`Test-CellUsesNonCanonicalLane` giữ nguyên nhánh cờ `--config` cũ và thêm một nhánh ĐỌC `vitest.config.ts` ở gốc repo: thấy dấu hiệu khoá biến DB thì THA, không thấy thì CHẶN. Bốn đường ra chặn (vắng tệp, `catch`, nội dung rỗng, không khớp mẫu khoá) đều theo hướng an toàn `DEC-03`. Ba dòng comment tiền đề sai phía trên hàm bị thay bằng 22 dòng ghi cả lý lẽ lẫn giới hạn.

Ba chuỗi thông điệp (`H-08` một lỗ, `S-11` hai lỗ) được viết lại: `reads DATABASE_URL from .env (production)` về `0` lần ở cả hai tệp, và mỗi chuỗi nêu tên `vitest.config.ts`. Mức nặng KHÔNG đổi: `Add-GateError` đếm `25/25` và `43/43` giữa index và worktree.

Bộ selftest đi từ `cases: 37 total (5 green, 32 red), failures: 0` lên `cases: 39 total (7 green, 32 red), failures: 0`, exit `0` — tăng đúng `+2`, cột `red` KHÔNG giảm. Trên cây thật, ba slug chạy hai bản cổng cho output giống TỪNG DÒNG (`diff | grep -c '^[<>]'` = `0`, `0`, `0`).

Tôi KHÔNG commit, KHÔNG push, KHÔNG merge (`R-01`). Tôi KHÔNG ghi §0 của `TASK.md` — lý do và phép đo ở `DEV-01`.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
| --- | --- | --- | --- | --- |
| `STEP-01` | `RQ-07` | `evidence/step01-fingerprint.txt` | `git hash-object` ba tệp: hai khớp `EV-06`, `verify-audit.ps1` lệch; phân loại nguyên nhân A của `DEC-09`, trả đủ ba khoản, chạy tiếp | `LIM-01`, `LIM-02` |
| `STEP-02` | `RQ-05` | `evidence/step02-selftest-before.txt` | mốc TRƯỚC khi sửa: `cases: 37 total (5 green, 32 red), failures: 0`, exit `0` | None |
| `STEP-03` | `RQ-01`, `RQ-06` | `gate-lib.ps1` `Test-CellUsesNonCanonicalLane` (thân hàm `358-370`) | giữ nhánh cờ config, thêm nhánh đọc `vitest.config.ts`; 4 đường ra chặn theo `DEC-03`; comment tiền đề viết lại `331-352` | `DEV-02`, `DEV-04`, `LIM-03`, `LIM-08` |
| `STEP-04` | `RQ-04` | `verify-audit.ps1:209`, `:402`, `verify-handoff.ps1:203` | ba chuỗi viết lại, chỉ đổi chuỗi; `numstat` `4 4` và `2 2`; `Add-GateError` không đổi số lời gọi | `DEV-03`, `LIM-04` |
| `STEP-05` | `RQ-02`, `RQ-03` | `verify-gates.selftest.ps1` (fixture `296-325`, runner `613`/`623-627`, bốn dòng `Add-Case`) | hai case đảo sang PASS, hai case mới kỳ vọng FAIL; `37 → 39` lời gọi `Add-Case` | `DEV-05`, `LIM-05`, `LIM-07` |
| `STEP-06` | `RQ-05` | `evidence/step06-selftest-after.txt` | `cases: 39 total (7 green, 32 red), failures: 0`, exit `0`; hai lần chạy liên tiếp cùng dòng ấy | None |
| `STEP-07` | `RQ-01` | `evidence/step07-regression.txt` | `rf-06` cộng hai slug ACCEPTED: `0` dòng `S-11` ở cả hai bản cổng, `diff` ba slug đều `0` dòng lệch | `LIM-06` |
| `STEP-08` | `RQ-08` | `evidence/step08-scope-gates.txt`, `evidence/ac11-gates.txt` | đo lại dấu tay, đo scope, `git add` path trong scope, hai cổng chạy CUỐI CÙNG | `LIM-09`, `LIM-10` |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
| --- | --- | --- | --- | --- |
| — | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-gate-02-lane-premise-correction/TASK.md` | `RESULT: PASS`, exit `0`, 0 warning | `evidence/ac11-gates.txt` | `None` |
| `AC-01` | `git hash-object .ai-pipeline/scripts/gate-lib.ps1 .ai-pipeline/scripts/verify-handoff.ps1 .ai-pipeline/scripts/verify-audit.ps1` lúc MỞ round, rồi `git cat-file -p 2520a48d...` cộng `diff -U0` để phân loại theo `DEC-09` | exit `0`; hai tệp khớp `EV-06`, `verify-audit.ps1` lệch thành `b6854802...` — nhánh HAI, nguyên nhân A; ba khoản trả đủ: HANDOFF anh em `0959c235...` 17927 byte đã staged, `diff` thuần chèn thêm 98 dòng 0 dòng bớt trên 6 hunk và cả 6 nằm trong ba vùng `S-17`/`S-18`/`S-19` của scope anh em, dấu tay mới ghi lại 35864 byte | `evidence/step01-fingerprint.txt` | `None` |
| `AC-02` | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-v5-gate-02-lane-premise-correction/TASK.md` chạy trên CHÍNH bản HANDOFF này, mà ô ngay đây nhắc lane trần `npx vitest run` không kèm cờ nào | exit `0`; `0` dòng chứa `H-08`; cùng một tệp ấy chạy bằng bản cổng lúc mở round thì có `1` dòng `[FAIL] H-08` | `evidence/ac02-h08-silent.txt` | Bản HANDOFF thật mạnh hơn fixture mà phương pháp của AC cho phép; xem `LIM-10` |
| `AC-03` | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-gates.selftest.ps1 -Verbose2`, case ở `verify-gates.selftest.ps1:574` dựng fixture cấu hình KHÔNG khoá biến DB | harness exit `0`, case báo `ok`; khối của case in `RESULT: FAIL (1 error(s), 0 warning(s))` với đúng `1` dòng `[FAIL] H-08` ở dòng 767 | `evidence/ac03-h08-still-red.txt` | `None` |
| `AC-04` | cùng lệnh harness, case ở `verify-gates.selftest.ps1:580` dựng fixture VẮNG tệp `vitest.config.ts` | harness exit `0`, case báo `ok`; khối của case in `RESULT: FAIL (1 error(s), 0 warning(s))` với đúng `1` dòng `[FAIL] H-08` ở dòng 788 | `evidence/ac04-fail-closed.txt` | `None` |
| `AC-05` | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-audit.ps1 -TaskPath docs/tasks/hrp-v5-rf-06-vitest-default-lane-safety/TASK.md` rồi `grep -c "S-11"` trên bản capture | exit `2`; `0` dòng chứa `S-11`, kể cả dòng `[OK]`; `RESULT: FAIL (11 error(s), 1 warning(s))` là 11 lỗi của mười mã kiểm KHÁC | `evidence/ac05-s11-silent.txt` | `S-11` đã im trên tệp này từ trước vòng; AC này không đo hiệu lực phép sửa — xem `LIM-06` |
| `AC-06` | `git diff --cached -- .ai-pipeline/scripts/verify-handoff.ps1 .ai-pipeline/scripts/verify-audit.ps1` rồi đếm chuỗi bằng `grep` trên byte cuối | exit `0`; `reads DATABASE_URL from` `0`, `.env` `0`, `(production)` `0` ở cả hai tệp; `vitest.config.ts` xuất hiện `2` lần trong cổng bàn giao và `3` lần trong cổng audit; mỗi chuỗi trong ba chuỗi đều nêu tên tệp ấy | `evidence/ac06-messages.txt` | `None` |
| `AC-07` | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-gates.selftest.ps1` rồi đọc dòng `cases:` và dòng `RESULT:` | exit `0`; `cases: 39 total (7 green, 32 red), failures: 0`; nhánh tuyệt đối `39 >= 35` ĐẠT; nhánh `DEC-09` lấy mốc `37` do chính `STEP-02` đo, `39 - 37 = 2` ĐẠT | `evidence/step06-selftest-after.txt` | Mốc `EV-07` là `33`, không bóc lại được từ byte; mốc dùng ở đây là `37` do vòng này tự đo |
| `AC-08` | trích thân hàm predicate `358-370` ra tệp rồi `grep -c -F` từng chuỗi trên đúng khoảng đó | exit `0`; `.env` `0`, `Invoke-WebRequest` `0`, `npx` `0`, `npm` `0` theo cả hai cách đếm dòng và đếm lần; 50 lần gọi predicate để lại `LastWriteTime` và `Length 2953` của tệp cấu hình không đổi | `evidence/ac08-no-side-effect.txt` | Mẫu nhận lane đã chuyển thành hằng số ở dòng `353`, ngoài khoảng đo; nói rõ ở phần C của tệp bằng chứng |
| `AC-09` | `grep -rn` hai chuỗi lược đồ DB trên `docs/tasks/hrp-v5-gate-02-lane-premise-correction/evidence/` | exit `1` (không dòng nào khớp); `0` dòng cho cả hai chuỗi trên toàn bộ 16 tệp | `evidence/ac09-no-sentinel.txt` | `None` |
| `AC-10` | `git status --porcelain` và `git diff --cached --name-only`, đối chiếu dấu tay `STEP-01` | exit `0`; hợp hai lệnh do Tier 2 gây ra chỉ gồm bốn tệp script trong `Modules` cộng hai tệp chuỗi thông điệp, và path dưới `docs/tasks/hrp-v5-gate-02-lane-premise-correction/**` | `evidence/step08-scope-gates.txt` | Ảnh chụp một thời điểm; xem `LIM-10` |
| `AC-11` | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-gate-02-lane-premise-correction/TASK.md` rồi `verify-handoff.ps1` cùng tham số, chạy CUỐI CÙNG | `RESULT: PASS` exit `0` và `RESULT: PASS` exit `0` | `evidence/ac11-gates.txt` | `None` |

## 4. Changed Deliverables

- **Source/artifact changed:** `.ai-pipeline/scripts/gate-lib.ps1` (comment tiền đề `331-352`, bốn hằng số `353-356`, thân hàm `Test-CellUsesNonCanonicalLane` `358-370`) — blob cuối `6daa689a33604f873f2e9f2181a741bfe4a55a9f`, 20302 byte, `git diff --numstat` = `38 6`; `.ai-pipeline/scripts/verify-handoff.ps1` (chuỗi `H-08` ở `203`, lời gọi predicate truyền `$repoRoot`) — blob cuối `e1af8549b9dd73d8c569d66493b6e527fae021f5`, 18079 byte, `numstat` = `2 2`; `.ai-pipeline/scripts/verify-audit.ps1` (hai chuỗi `S-11` ở `209` và `402`, hai lời gọi predicate) — blob cuối `e1edaebac456da16cb618dca2607e7f46b1c4358`, 36095 byte, `numstat` = `4 4`; `.ai-pipeline/scripts/verify-gates.selftest.ps1` (fixture `296-325`, runner `613` và `623-627`, bốn dòng `Add-Case`) — blob cuối `a6a7faeaf65dc490b0f597d21877230f4a8fc45e`, 33127 byte, `numstat` = `53 5`; cộng `docs/tasks/hrp-v5-gate-02-lane-premise-correction/HANDOFF.md` và mười sáu tệp dưới `evidence/`.
- **Dependency:** `None`.
- **Schema/migration:** `None`. Không kết nối DB, không đọc `.env`, không in giá trị biến môi trường nào (`R-02`, `R-03`).
- **Environment/config:** `None`. `vitest.config.ts` chỉ được ĐỌC, đo ở `evidence/ac08-no-side-effect.txt` phần F.
- **Git diff/commit:** `Not created`. `R-01`: Tier 2 không commit, không push, không merge. Trạng thái giao là index cộng worktree, đo ở `evidence/step08-scope-gates.txt`.

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `DEV-01` | `Deviation` | Chỉ thị đợt giao yêu cầu đặt `Status` của `TASK.md` thành `READY_FOR_AUDIT` và cộng 1 vào số round. Tôi KHÔNG ghi §0 của `TASK.md`. Ba căn cứ: `Current execution round` đã là `1`, đúng vòng tôi vừa chạy; `H-15` của cổng bàn giao coi `Status` là trường của Tier 1; và ở round của hợp đồng anh em tôi đã đo trên một bản COPY — lật `Status` thành `READY_FOR_AUDIT` khiến `verify-task.ps1` ra `RESULT: DRAFT-VALID` chứ không phải `RESULT: PASS` | Nếu lật `Status` thì `AC-11` mất chữ `RESULT: PASS`. Không lật thì `TASK.md` giữ nguyên byte, blob `7246f37eb962763b6184b81977d2ff6860f45c50` | Tier 1 tự đổi `Status` và số round khi mở vòng audit, hoặc bảo tôi lật và chấp nhận `DRAFT-VALID` |
| `DEV-02` | `Deviation` | §4.2 chỉ cho phép sửa predicate và chuỗi thông điệp. Ba lời gọi predicate cũng được sửa để truyền `$repoRoot`: `verify-handoff.ps1` một lỗ, `verify-audit.ps1` hai lỗ. Đo ở `evidence/step03-predicate-diff.txt` phần F | Không có tham số ấy thì `Get-RepoRoot` suy gốc từ `$PSScriptRoot`, đúng khi chạy trong cây và SAI khi harness chạy bản copy ngoài cây — chính đường đo của `AC-03` và `AC-04`. Ba dòng nằm trong `numstat` `2 2` và `4 4` | Không cần. Nếu Tier 1 coi ba dòng ấy ngoài scope thì nói rõ, tôi lùi và `AC-03`/`AC-04` sẽ mất đường đo |
| `DEV-03` | `Deviation` | `STEP-04` viết "chuỗi thông điệp của `H-08` và của `S-11`", đọc mặt chữ là HAI chuỗi. Tôi viết lại BA chuỗi vì `S-11` có hai lỗ gọi (`verify-audit.ps1:209` hàng AC và `:402` hàng checklist). Đếm ở `evidence/step04-message-diff.txt` phần D: `grep -c "'S-11'"` = `2` | `AC-06` đòi MỌI chuỗi nêu tên `vitest.config.ts`; bỏ lỗ thứ hai thì AC-06 không thoả. Mức nặng cả ba lỗ vẫn là `Add-GateError` | Không cần |
| `DEV-04` | `Deviation` | Ba dòng comment tiền đề sai (`331-333` của bản `EV-06`) được thay bằng 22 dòng (`331-352`), gồm lý lẽ `rf-06`, hướng an toàn `DEC-03` và giới hạn của mẫu khoá. `STEP-03` chỉ viết "viết lại comment tiền đề" | 19 dòng thêm là comment, không phải dòng lệnh; chúng nằm trong `numstat` `38 6` của `gate-lib.ps1` | Không cần |
| `DEV-05` | `Deviation` | `STEP-05` viết "đổi kỳ vọng case `H-08` sẵn có sang PASS" — một case. Tôi đảo HAI case (`H-08` ở `570` và `S-11` ở `458`) vì hai mã kiểm dùng CHUNG một predicate, để một case cũ ở kỳ vọng FAIL thì harness sẽ đỏ. Đếm ở `evidence/step05-selftest-cases.txt` phần C và D | `cases` lên `39`, `green` lên `7`, `red` giữ `32`, `failures: 0`. Không case nào bị xoá | Không cần |
| `LIM-01` | `Limitation` | Dấu tay `verify-audit.ps1` ở lúc mở vòng LỆCH `EV-06`: `EV-06` ghi `2520a48d`, đo được `b6854802e329b391a70475eef8920255f0b7d639` 35864 byte. Đây là nguyên nhân A của `DEC-09`, trả giá đủ ba khoản trong cùng ô: (1) `HANDOFF.md` của hợp đồng anh em `hrp-v5-gate-01-audit-row-identity` tồn tại thật, blob `0959c235444f1df7a43cee1bbbe933a04012615b` 17927 byte, đang staged; (2) `git diff -U0` giữa `2520a48d` và bản lệch ra 6 hunk, 98 dòng thêm 0 dòng bớt, cả 6 đều là khối `S-17`/`S-18`/`S-19` tức scope của hợp đồng anh em; (3) dấu tay MỚI ghi lại là `b6854802…`. Cả ở `evidence/step01-fingerprint.txt` phần B, C và D | Bốn tệp gate khác vào vòng ĐÚNG `EV-06`, gồm cả hai tệp `Modules` của tôi. Không phải nguyên nhân B nên vòng chạy tiếp | Tier 1 cập nhật `EV-06` cho lô gate, hoặc chấp nhận rằng round sau sẽ lại lệch |
| `LIM-02` | `Limitation` | Sau `git add` của tôi, ba blob mà hợp đồng anh em đã giao (`43ada847…` của `gate-lib.ps1`, `3997dd4f…` của `verify-handoff.ps1`, `b6854802…` của `verify-audit.ps1`) không còn là bản trong index; index giờ là bản của tôi. Chúng vẫn sống trong object store, bóc bằng `git cat-file -p <SHA>` — phép đo ấy đã chạy thật ở `evidence/step01-fingerprint.txt` phần C | Ai audit hợp đồng anh em phải bóc bằng SHA, không dùng `git show :<path>` vì lệnh ấy giải ra index BÂY GIỜ. Index của `verify-audit.ps1` giờ cộng dồn việc của hai vòng: `git diff --cached --numstat` sẽ ra số của cả hai | Tier 1 lưu ý khi commit lô gate: dùng `git commit -- <pathspec>` và đọc diffstat của chính commit đó |
| `LIM-03` | `Limitation` | Mẫu khoá lane (`$script:GateDefaultLaneLockPattern`) chỉ nhận DẠNG hiện có trong `vitest.config.ts`. Một cấu hình ghim biến DB theo cách khác — đọc từ tệp riêng, hay đặt trong `globalSetup` — sẽ bị predicate đọc là KHÔNG khoá, tức đỏ oan. Chín ca hành vi ở `evidence/step03-predicate-diff.txt` phần D không có ca nào cho các dạng ấy | Hướng lệch là fail-closed (`DEC-03`): đỏ oan chứ không xanh oan. `Q-01` và `RISK-03` của hợp đồng đã nêu trước | Tier 1 quyết có mở nợ nới mẫu khoá hay không |
| `LIM-04` | `Limitation` | Ba chuỗi thông điệp mới là LỜI VĂN. Không case harness nào khẳng định nội dung của chúng; harness chỉ khẳng định token `H-08` và `S-11`. Phép đo của `AC-06` là `grep` trên `git diff --cached`, ghi ở `evidence/ac06-messages.txt` | Nếu round sau sửa lời văn mà giữ token thì harness vẫn xanh. Đó là điểm mù thật của bộ test | Round sau nên thêm ca khẳng định chuỗi con `vitest.config.ts` trong thông điệp |
| `LIM-05` | `Limitation` | `verify-gates.selftest.ps1:355` tự sinh tiến trình cổng con bằng `-ExecutionPolicy Bypass`, và fixture của harness dùng `git add -A` bên trong repo tạm. Cả hai dòng có sẵn TRƯỚC round này, không phải của tôi; trích ở `evidence/step05-selftest-cases.txt` phần F | Chỉ thị cấm TÔI dùng hai thứ ấy; mọi lệnh tôi gõ tay đều là `powershell -NoProfile -File` và mọi `git add` của tôi đều có pathspec. Sửa dòng `355` là đổi cách harness gọi cổng, ngoài `RQ-04` | Tier 1 quyết có mở nợ cho dòng `355` hay không |
| `LIM-06` | `Limitation` | `S-11` chỉ chạm hàng AC của §4 (`verify-audit.ps1:208`) và chỉ chạm hàng checklist ở nhánh `'^DONE'` (`:401`). Bốn `AUDIT.md` thật tôi đo đều không có hàng nào rơi vào hai vùng ấy VỚI lane trần, nên `evidence/step07-regression.txt` chỉ chứng minh được `S-11` KHÔNG đỏ oan; nó không chứng minh được `S-11` còn cắn khi đáng cắn | Nhánh còn cắn được đo bằng fixture: `evidence/step07-regression.txt` phần E dẫn dòng `[FAIL] S-11` ở dòng `295` của bản OPEN trên cùng fixture | Tier 3 kết luận hai đường đo ấy có đủ hay không |
| `LIM-07` | `Limitation` | Hai nhánh fail-closed của predicate không có case harness: nhánh `catch` khi `Get-Content` ném (`gate-lib.ps1:367`) và nhánh nội dung trắng (`:368`). Nhánh tệp VẮNG và nhánh `0` byte thì có, đo ở `evidence/ac04-fail-closed.txt` | Cả bốn nhánh cùng trả `$true` tức cùng hướng fail-closed, nên hai nhánh thiếu case không đổi hướng an toàn. Đọc mã ở `evidence/step03-predicate-diff.txt` phần C | Không cần |
| `LIM-08` | `Limitation` | `RISK-05` gợi ý cache kết quả đọc `vitest.config.ts` theo mỗi lần chạy. Tôi KHÔNG làm: predicate đọc lại tệp mỗi lần được gọi | Chi phí đo thật: 50 lời gọi liên tiếp không đổi `LastWriteTime` và không đổi `Length` của `vitest.config.ts`, ghi ở `evidence/ac08-no-side-effect.txt` phần F. Với số hàng của một `AUDIT.md` thật thì số lần đọc là hàng chục, không phải hàng nghìn | Tier 1 quyết có mở nợ cache hay không |
| `LIM-09` | `Limitation` | `EV-03` của hợp đồng trỏ `verify-audit.ps1` dòng `200-203`. Trên byte tôi nhận, hai lỗ `S-11` nằm ở `208`/`209` và `401`/`402` — lệch 8 dòng vì 98 dòng thêm của hợp đồng anh em (`LIM-01`). Đối chiếu ở `evidence/step01-fingerprint.txt` phần D | Nội dung bốn dòng ấy GIỐNG BYTE bản `EV-06`, chỉ dịch chỗ. Tôi đo theo nội dung chứ không theo số dòng | Round sau nên ghi `EV-*` bằng chuỗi neo thay vì số dòng |
| `LIM-10` | `Limitation` | `evidence/step08-scope-gates.txt` là ảnh chụp một thời điểm. Ba tệp được ghi SAU hai lần chạy cổng: `evidence/ac02-h08-silent.txt`, `evidence/ac11-gates.txt` và phần D của chính `step08-scope-gates.txt` — không thể vừa chạy cổng vừa ghi kết quả của nó vào tệp mà cổng đã đọc. Cả ba đã TỒN TẠI trước hai lần chạy ấy | `H-07b` của cổng bàn giao chỉ kiểm SỰ TỒN TẠI của đường dẫn `evidence/*`, không đọc nội dung, nên ghi nội dung sau đó không đổi được kết quả vừa đo. Sau khi ghi còn đúng một lần `git add` cho ba path ấy, cả ba dưới `docs/tasks/hrp-v5-gate-02-lane-premise-correction/**` | Không cần |

| `LIM-11` | `Limitation` | Tiền đề sai còn sót MỘT dòng ngoài vùng `STEP-04`: khối comment đầu tệp `verify-handoff.ps1` dòng `18` vẫn viết "reads production DATABASE_URL". Dòng ấy có sẵn TRƯỚC round này (nằm trong blob `3997dd4ff896ea9f7cebdf40a247bcb269ab23e5` mà hợp đồng anh em giao), và nó là COMMENT chứ không phải chuỗi thông điệp. Trích ở `evidence/ac06-messages.txt` phần E | `AC-06` và `STEP-04` chỉ nói về chuỗi thông điệp, nên sửa dòng `18` là ra ngoài scope. Ba chuỗi thông điệp đếm `0/0/0` lần nhắc tiền đề sai; dòng `18` không được cộng vào phép đo nào | Tier 1 quyết có mở nợ sửa dòng `18` hay không |

## 6. Evidence Index

| Evidence | Path | Proves |
|---|---|---|
| `EV-B01` | `evidence/step01-fingerprint.txt` | Dấu tay năm tệp gate lúc mở vòng: bốn khớp `EV-06`, `verify-audit.ps1` lệch; ba khoản trả giá của nhánh nguyên nhân A theo `DEC-09`; `HEAD` `31625c4` |
| `EV-B02` | `evidence/step02-selftest-before.txt` | Mốc TRƯỚC round do chính tôi đo: `cases: 37 total (5 green, 32 red), failures: 0`, exit `0` — mốc mà `AC-07` cộng `+2` lên |
| `EV-B03` | `evidence/step03-predicate-diff.txt` | Predicate mới: giữ nhánh `--config`, thêm phép đọc `vitest.config.ts`, bốn nhánh fail-closed; chín ca hành vi; `numstat` `38 6` |
| `EV-B04` | `evidence/step04-message-diff.txt` | Ba chuỗi thông điệp: nguyên văn cũ và mới, `0/0/0` lần nhắc tiền đề sai, số `Add-GateError` không đổi `25/25` và `43/43` |
| `EV-B05` | `evidence/step05-selftest-cases.txt` | Bốn dòng `Add-Case` đổi hoặc thêm, fixture `vitest.config.ts` ở `296-325`, runner `613` và `623-627`; `37 → 39` |
| `EV-B06` | `evidence/step06-selftest-after.txt` | `cases: 39 total (7 green, 32 red), failures: 0`, exit `0`; `39 ≥ 35` và `39 − 37 = +2`; hai lần chạy liên tiếp giống nhau |
| `EV-B07` | `evidence/step07-regression.txt` | Ba slug đã `ACCEPTED` chạy trên hai bản gate: `diff` rồi `grep -c '^[<>]'` đếm `0/0/0`, `0` dòng `S-11`; RED-trước trên fixture ở dòng `295` và `746` |
| `EV-B08` | `evidence/step08-scope-gates.txt` | Đo lại dấu tay cuối vòng, phạm vi đúng bốn tệp gate cộng path dưới slug này, và thứ tự `git add` trước hai cổng |
| `EV-B09` | `evidence/ac02-h08-silent.txt` | Cổng bàn giao trên chính `HANDOFF.md` này: hàng `AC-02` mang lane trần mà `0` dòng `H-08`; kèm RED-trước bằng bản OPEN |
| `EV-B10` | `evidence/ac03-h08-still-red.txt` | Case `574`: cấu hình KHÔNG khoá biến DB thì `H-08` vẫn đỏ — `RESULT: FAIL (1 error(s), 0 warning(s))` |
| `EV-B11` | `evidence/ac04-fail-closed.txt` | Case `580`: cấu hình VẮNG thì `H-08` đỏ; bảng ba ca `570` PASS, `574` FAIL, `580` FAIL |
| `EV-B12` | `evidence/ac05-s11-silent.txt` | `AUDIT.md` thật của `rf-06`: `grep -c "S-11"` = `0`, `11` lỗi còn lại đến từ mười mã kiểm KHÁC |
| `EV-B13` | `evidence/ac06-messages.txt` | `git diff --cached` của hai tệp thông điệp: ba chuỗi mới đều nêu `vitest.config.ts`, `0` lần nhắc `.env` |
| `EV-B14` | `evidence/ac08-no-side-effect.txt` | Predicate chỉ ĐỌC: bốn `grep -F` đếm `0`, `50` lời gọi không đổi `LastWriteTime` và `Length` của `vitest.config.ts` |
| `EV-B15` | `evidence/ac09-no-sentinel.txt` | Không tệp nào dưới `evidence/` chứa sơ đồ kết nối DB dạng nguyên văn; phép đếm chạy trên cả `16` tệp |
| `EV-B16` | `evidence/ac11-gates.txt` | Cổng contract và cổng bàn giao chạy CUỐI CÙNG, cả hai `RESULT: PASS` exit `0` |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.2` | `READY_FOR_AUDIT` | Sửa tiền đề sai của `H-08` và `S-11`: predicate đọc `vitest.config.ts` thay vì suy đoán về `.env`, ba chuỗi thông điệp viết lại, bốn nhánh fail-closed, selftest `37 → 39` với `failures: 0`. 11/11 AC có phép đo. Không commit, không push |

> Handoff status: `READY_FOR_AUDIT`
