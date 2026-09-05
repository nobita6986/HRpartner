# TASK: hrp-v5-gate-01-audit-row-identity

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-gate-01-audit-row-identity` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.3` |
| Status | `ACCEPTED` |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — independent auditor |
| Baseline | HEAD `31625c4`. Năm tệp gate đều LỆCH `HEAD` và hai tệp KHÔNG có ở `HEAD`, nên baseline thật của chúng là dấu tay blob ghi ở `EV-06`, không phải một commit |
| Modules | `.ai-pipeline/scripts/verify-audit.ps1`, `.ai-pipeline/scripts/verify-gates.selftest.ps1` |
| ADR references | Nợ `PLN-45` từ resolution của `hrp-v5-rf-06-vitest-default-lane-safety` round 1 |
| Current execution round | `1` |
| Current audit round | `1` |
| Next gate | ĐÓNG. Round 1 ACCEPTED. Commit bộ gate CHỜ gate-02 cũng ACCEPTED, rồi `git commit -- pathspec` (KHÔNG `git add -A`), xem `PLN-59` của gate-03 |
| Updated | `2026-09-05 20:05 Asia/Bangkok` |

## 1. Outcome

### User-visible outcome

Cổng audit từ chối một `AUDIT.md` mà bảng §2 có ba hàng AC trở lên GIỐNG NHAU từng ô, và từ chối một hàng AC lấy từ vựng verdict làm kết quả đo. Bản audit round 1 của rf-06 là ca thật đã lọt: chín hàng `AC-01` tới `AC-09` giống nhau từng ô, ô Result là `BLOCKED`, ô Evidence là `1 status read`, và cổng vẫn in `S-17 no measured value is reused across three or more AC`. Sau task này, chạy cổng lại trên chính tệp ấy phải đỏ.

### Non-goals

- Không sửa bất kỳ `AUDIT.md` đang tồn tại để làm mã kiểm mới xanh. Bản audit của rf-06 là tang chứng, giữ nguyên byte.
- Không mở lại `hrp-v5-rf-06-vitest-default-lane-safety`. Nó `ACCEPTED` và resolution của nó KHÔNG đứng trên bản audit ấy.
- Không nới `S-17` sang số nguyên. Xem `DEC-02`.
- Không sửa `verify-task.ps1`, `verify-handoff.ps1`, `verify-pipeline.ps1`.
- Không đổi `Test-CellHasNumber` dùng chung. Xem `DEC-03`.

## 2. Evidence và Baseline

Chỉ ghi evidence cần để ra quyết định; dùng link/file:line thay vì chép tài liệu.

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `.ai-pipeline/scripts/verify-audit.ps1` dòng `213` tới `237` | `S-17` trích số bằng regex `\d+[\.,]\d+`, tức CHỈ số thập phân. Một giá trị nguyên tái dùng ở chín hàng AC không bao giờ vào được `$valueRows` | `S-17` không thể là chỗ sửa; cần mã kiểm mới nhìn vào HÀNG, không nhìn vào giá trị |
| `EV-02` | `.ai-pipeline/scripts/gate-lib.ps1` dòng `291` tới `294` | `Test-CellHasNumber` là `[regex]::IsMatch($Cell, '\d')`, bất kỳ một chữ số ở bất kỳ đâu | Ô Evidence `1 status read` thoả `S-02` chỉ nhờ chữ số `1`. Đây là lỗ thật, nhưng vá tại đây thì đụng mọi mã kiểm dùng chung |
| `EV-03` | `.ai-pipeline/scripts/verify-audit.ps1` dòng `427` tới `441` | `S-09` chỉ so §4 với bản ĐÃ COMMIT của round TRƯỚC | Round 1 không có round trước nên `S-09` bị bỏ qua hoàn toàn. Điểm mù của rf-06 nằm đúng ở round 1 |
| `EV-04` | Đo tay `2026-09-04 21:24`, nạp `gate-lib.ps1` rồi gọi trực tiếp | `Test-CellHasResult 'BLOCKED'` trả `False`; `Test-CellHasResult 'PASS'` trả `False`; `Test-CellHasNumber '1 status read'` trả `True` | Từ vựng verdict KHÔNG được nhận là kết quả. Hàng của rf-06 sống nhờ nhánh OR: có chữ số nên khỏi cần mã thoát |
| `EV-05` | `docs/tasks/hrp-v5-rf-06-vitest-default-lane-safety/AUDIT.md`, bảng §2 | Chín hàng `AC-01` tới `AC-09` giống nhau ở cả bốn ô sau ô ID; cổng audit round 1 vẫn ra `PASS WITH WARNINGS` | Đây là fixture hồi quy có thật, không cần bịa. `AC-08` của task này buộc chạy cổng trên chính tệp đó |
| `EV-06` | `git hash-object` năm tệp gate, đo lại `2026-09-05 00:05` | `gate-lib.ps1` là `43ada847f9bd84494f80114de01f9f0b1b05c816` trạng thái `A `; `verify-audit.ps1` là `2520a48dd7893f5cf9674357fd6a36e58772bcbd` trạng thái ` M`; `verify-handoff.ps1` là `3997dd4ff896ea9f7cebdf40a247bcb269ab23e5` trạng thái `A `; `verify-task.ps1` là `e36b83dfbf7c860e320d5409535b82001cab574e` trạng thái ` M`; `verify-pipeline.ps1` là `1348bffe2adf3a5c247ecc1f3ed2525233b41db9` trạng thái `M ` | Bộ gate đang do một luồng khác sửa. `STEP-01` phải ghi lại dấu tay và DỪNG nếu lệch. Dấu tay `gate-lib.ps1` ở đây là bản SAU khi CHÍNH Tier 1 vá theo lệnh sếp, xem `EV-09` |
| `EV-07` | Chạy `verify-gates.selftest.ps1`, `2026-09-04 21:33`, exit `0` | `cases: 33 total (3 green, 30 red), failures: 0` | Đây là mốc hồi quy. Sau task này phải có thêm case, số green không được giảm, `failures` phải là `0` |
| `EV-08` | Đếm ID mã kiểm trong `.ai-pipeline/scripts/*.ps1` | Trần hiện tại: `S-17`, `H-15`, `A-07`, `T-07`, `C-10` | ID mới an toàn là `S-18` và `S-19`; không đụng ID đang dùng |
| `EV-09` | Tier 1 tự vá `.ai-pipeline/scripts/gate-lib.ps1` dòng `276` theo lệnh sếp `2026-09-05 00:05`, rồi `git hash-object` và `git diff --numstat` và chạy `verify-gates.selftest.ps1` | Dấu tay đi từ `4caa5fd5` sang `43ada847f9bd84494f80114de01f9f0b1b05c816`, numstat `4 1`, selftest exit `0` với `cases: 33 total (3 green, 30 red), failures: 0` | Vá là MỞ RỘNG danh sách token, không đổi hành vi: tổng selftest giống baseline từng chữ. Executor phải hiểu dấu tay lệch lần này do Tier 1, không do luồng kia |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | `CHOSEN` | Thêm HAI mã kiểm mới `S-18` và `S-19` vào `verify-audit.ps1`. Không sửa hành vi mã kiểm nào đang có | Tier 1, từ `EV-01` và `EV-08` | Chốt cho `v1.0` |
| `DEC-02` | `CHOSEN` | KHÔNG nới `S-17` sang số nguyên. Lý do đo được: mã thoát `0` và `1` xuất hiện ở gần như mọi hàng AC của mọi bản audit, nên nới sang số nguyên sẽ báo `0` tái dùng ở toàn bộ bảng. Đó là bão dương tính giả, và một cổng kêu ở mọi hàng thì không ai đọc nữa | Tier 1 | Chốt. Ai muốn đảo phải đưa phép đo trên ít nhất ba bản audit thật |
| `DEC-03` | `CHOSEN` | KHÔNG đổi `Test-CellHasNumber` ở `gate-lib.ps1`. Nó là hàm dùng chung của cả ba cổng; siết nó sẽ đổi hành vi `S-02`, `H-06` và các mã kiểm khác trong cùng một lượt, không đo tách được nguyên nhân nào gây đỏ | Tier 1, từ `EV-02` | Chốt cho `v1.0`. Nợ này ghi lại ở §7 `RISK-03` |
| `DEC-04` | `CHOSEN` | `S-18` đỏ khi có BA hàng AC trở lên giống nhau, và chỉ cảnh báo khi đúng HAI. Lý do: hai AC cùng đo bằng một lệnh và cùng trỏ một artifact là hợp lệ và có thật; ba hàng trở lên thì không còn là trùng hợp | Tier 1, đối xứng với ngưỡng của `S-17` | Chốt cho `v1.0` |
| `DEC-05` | `CHOSEN` | `S-19` chỉ đỏ khi ô Result CHỈ chứa từ vựng verdict và cả hàng không có mã thoát nào. Có số đo hoặc có mã thoát thì không đỏ | Tier 1, từ `EV-04` | Chốt cho `v1.0` |
| `DEC-06` | `ASSUMPTION` | Luồng Tier 1 thứ hai đang sửa bộ gate và có thể dịch `verify-audit.ps1` trong lúc task này chạy. Tier 2 KHÔNG merge, KHÔNG revert, KHÔNG overwrite. Lệch dấu tay là điều kiện DỪNG, không phải việc cần xử lý, TRỪ nguyên nhân A ở `DEC-08` | Owner đã xác nhận có Agent khác sửa ba tệp gate | Hết hiệu lực khi bộ gate vào `HEAD` |
| `DEC-07` | `CHOSEN` | Mọi mã kiểm mới phải có case trong `verify-gates.selftest.ps1`. Một mã kiểm không có case đỏ thì không chứng minh được nó bắt được gì | Tier 1, từ `EV-07` | Chốt cho `v1.0` |
| `DEC-08` | `CHOSEN` | Lệch dấu tay có HAI nguyên nhân và chỉ MỘT là điều kiện dừng. Nguyên nhân A là hợp đồng ANH EM trong CÙNG lô giao vừa đóng, tức `hrp-v5-gate-02-lane-premise-correction`, mà scope của nó cũng chạm `verify-audit.ps1` và `verify-gates.selftest.ps1`. Nguyên nhân A phải trả giá bằng ba thứ trong CÙNG ô bằng chứng: tệp `HANDOFF.md` của hợp đồng anh em có thật, `git diff` của tệp lệch chỉ chạm vùng thuộc scope hợp đồng ấy, và dấu tay MỚI được ghi lại. Đủ ba thứ thì ghi một hàng `LIM` trong HANDOFF rồi TIẾP TỤC, không dừng. Nguyên nhân B là mọi lệch khác, gồm lệch không kèm được bản bàn giao anh em, và nó DỪNG theo `DEC-06`. Dấu tay lệch vì CHÍNH round này sửa tệp là hiển nhiên, không phải nguyên nhân B | Tier 1 `2026-09-05`, khi sếp giao ba hợp đồng gate trong một lệnh | Hết hiệu lực khi bộ gate vào `HEAD` |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | `S-18` phát hiện hàng AC trùng lặp TRONG CÙNG một round: chuẩn hoá mọi ô sau ô ID của mỗi hàng §2, nhóm các hàng có chuỗi chuẩn hoá giống nhau, ba hàng trở lên trong một nhóm thì `Add-GateError`, đúng hai hàng thì `Add-GateWarn` | Must | `EV-01`, `EV-05`, `DEC-04` | Thông báo phải nêu ĐỦ danh sách AC ID trong nhóm và số lượng nhóm |
| `RQ-02` | `S-19` từ chối hàng AC mà ô Result sau khi bỏ trang trí markdown CHỈ khớp từ vựng verdict `PASS`, `FAIL`, `BLOCKED`, `CONDITIONAL`, `OK`, `SKIP`, `N/A`, `PARTIAL` và cả hàng không thoả `Test-CellHasResult` | Must | `EV-04`, `DEC-05` | Thông báo nêu AC ID và chuỗi thật trong ô Result |
| `RQ-03` | `S-17` giữ nguyên hành vi từng byte về mặt kết quả, và có thêm comment giải thích vì sao KHÔNG nới sang số nguyên, dẫn `DEC-02` | Must | `DEC-02` | Đổi hành vi `S-17` là vi phạm phạm vi |
| `RQ-04` | Mỗi mã kiểm mới có đúng một case ĐỎ trong `verify-gates.selftest.ps1` tái dựng khuyết điểm thật, và bộ case xanh đang có không bị đỏ thêm | Must | `DEC-07`, `EV-07` | `failures` khác `0` là dừng, không được nới mã kiểm cho case xanh |
| `RQ-05` | Trước khi sửa, Tier 2 ghi dấu tay năm tệp gate và so với `EV-06`. Lệch ở `verify-audit.ps1` hoặc `gate-lib.ps1` thì phân loại theo `DEC-08`: nguyên nhân B thì DỪNG và bàn giao `BLOCKED`, nguyên nhân A thì ghi `LIM` rồi tiếp tục | Must | `DEC-06`, `DEC-08` | Không merge, không revert, không overwrite tệp của luồng khác |
| `RQ-06` | Chạy cổng audit trên `AUDIT.md` round 1 của rf-06 phải ĐỎ với token `S-18`, và tệp ấy không được đổi một byte | Must | `EV-05` | Sửa `AUDIT.md` để cổng xanh là vi phạm nặng, bàn giao bị bác |
| `RQ-07` | Chạy cổng audit trên ít nhất hai `AUDIT.md` KHÁC đang có trong repo, không được xuất hiện `S-18` hay `S-19` mới mà bản thân bản audit ấy không thật sự trùng hàng | Must | Chống dương tính giả | Có dương tính giả thì siết lại điều kiện, không nới ngưỡng |
| `RQ-08` | Không tệp nào ngoài `Modules` và `docs/tasks/hrp-v5-gate-01-audit-row-identity/**` bị Tier 2 sửa hoặc stage | Must | Luật vùng cấm | Chạm tệp ngoài phạm vi là bàn giao bị bác |

### 4.2 Scope boundaries

**In scope:**

- `.ai-pipeline/scripts/verify-audit.ps1` — thêm `S-18` và `S-19`, thêm comment cho `S-17`
- `.ai-pipeline/scripts/verify-gates.selftest.ps1` — thêm case đỏ cho `S-18` và `S-19`
- `docs/tasks/hrp-v5-gate-01-audit-row-identity/**` — HANDOFF và evidence của chính task này

**Out of scope:**

- `.ai-pipeline/scripts/gate-lib.ps1` và ba tệp verify còn lại
- Mọi `AUDIT.md`, `HANDOFF.md`, `TASK.md` của slug khác. Đọc thì được, sửa thì không
- `package.json`, `package-lock.json`, `.gitignore`, mọi tệp cấu hình vitest, `prisma/`, `app/`, `src/`, `new-ui/`, `scratch/`, mọi `.env`
- `.ai-pipeline/templates/AUDIT.template.md`. Nếu mã kiểm mới đòi đổi template thì đó là task khác

### 4.3 Data, State, Permission và Interface Rules

- **Data:** không kết nối database, không đọc `.env`, không in giá trị biến môi trường. Fixture của selftest nằm dưới `$env:TEMP` như hiện tại, không ghi gì vào cây repo.
- **State:** `Status` của contract này chỉ Tier 1 đổi. Tier 2 không đổi `Spec version`.
- **Permission/data scope:** Tier 2 KHÔNG commit, KHÔNG push, KHÔNG tự audit. Tier 3 không sửa mã, không đổi contract.
- **Interface:** ID mã kiểm mới là `S-18` và `S-19`, không được dùng lại ID đang có. Thông báo phải theo dạng đang dùng: `Add-GateError $ctx 'S-18' "..."`. Mọi thông báo mới phải nêu AC ID cụ thể.
- **Failure/idempotency/concurrency:** chạy selftest hai lần liên tiếp phải ra cùng con số. Cổng phải chạy CUỐI CÙNG, sau lần sửa tệp cuối, để `RESULT` mô tả đúng byte cuối. Không `npm install`, không thêm package.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-05` | Năm tệp gate | In `git log --oneline -1`, `git status --porcelain -- .ai-pipeline/scripts/` và `git hash-object` từng tệp; so với `EV-06`; ghi vào `evidence/step01-fingerprint.txt` | git | Dấu tay của `verify-audit.ps1` và `gate-lib.ps1` trùng `EV-06`, HOẶC lệch mà phân loại được là nguyên nhân A của `DEC-08` với đủ ba bằng chứng | Lệch dạng nguyên nhân B thì DỪNG, viết HANDOFF `BLOCKED`, không sửa gì. Nguyên nhân A thì ghi dấu tay mới cộng một hàng `LIM` rồi tiếp tục |
| `STEP-02` | `RQ-01` | `.ai-pipeline/scripts/verify-audit.ps1` | Thêm khối `S-18` ngay sau khối `S-17`, dùng `Clear-MdDecoration` cho từng ô sau ô ID rồi nối bằng một ký tự phân cách không xuất hiện trong ô; nhóm bằng hashtable; ngưỡng theo `DEC-04` | PowerShell | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-audit.ps1` chạy được, không lỗi cú pháp | Nếu phải sửa `gate-lib.ps1` mới làm được thì DỪNG và hỏi Tier 1 |
| `STEP-03` | `RQ-02` | `.ai-pipeline/scripts/verify-audit.ps1` | Thêm khối `S-19` trong cùng vòng lặp hàng AC đang có; xác định cột Result theo cách khối `S-02` đang xác định cột Evidence | PowerShell | Cổng chạy trên bản audit của rf-06 in ra `S-19` | Không xác định được cột Result thì ghi `LIM` và chuyển `S-19` sang xét mọi ô, không bỏ RQ |
| `STEP-04` | `RQ-03` | `.ai-pipeline/scripts/verify-audit.ps1` dòng `213` | Thêm comment trên khối `S-17` nói rõ regex chỉ bắt thập phân là CÓ CHỦ Ý, dẫn `DEC-02` và lý do bão dương tính giả | Không | Khối lệnh của `S-17` không đổi, chỉ thêm dòng comment | Sửa regex của `S-17` là vi phạm |
| `STEP-05` | `RQ-04` | `.ai-pipeline/scripts/verify-gates.selftest.ps1` | Thêm hai `Add-Case` kiểu `-Gate audit -Expect FAIL -Token 'S-18'` và `-Token 'S-19'`, `-Mutate` tái dựng chín hàng giống nhau và một ô Result là `BLOCKED` | PowerShell | `cases` tăng lên ít nhất `35`, green không giảm dưới `3`, `failures` là `0` | `failures` khác `0` thì sửa case hoặc sửa mã kiểm, KHÔNG hạ ngưỡng để né |
| `STEP-06` | `RQ-06`, `RQ-07` | Bốn `AUDIT.md` có thật | Chạy cổng audit trên bản audit rf-06 và ít nhất hai bản audit khác; lưu output vào `evidence/`; ghi `git hash-object` của từng `AUDIT.md` TRƯỚC và SAU để chứng minh không đổi byte | git, PowerShell | rf-06 đỏ `S-18`; hai bản kia không có `S-18` hay `S-19` oan | Bản audit khác đỏ oan thì siết điều kiện, không nới ngưỡng |
| `STEP-07` | `RQ-08` | Toàn cây | Chạy `git status --porcelain` và `git diff --cached --name-only`, ghi vào `evidence/step07-scope.txt`; chạy LẠI cổng contract và cổng bàn giao CUỐI CÙNG | git | Tập path Tier 2 chạm nằm trong `Modules` cộng `docs/tasks/hrp-v5-gate-01-audit-row-identity/**` | Có path ngoài phạm vi do chính Tier 2 tạo thì phải hoàn nguyên path ấy trước khi bàn giao |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-05` | Bản bàn giao ghi dấu tay thật của `verify-audit.ps1` và `gate-lib.ps1` đo lúc bắt đầu round, rồi kết luận một trong ba nhánh. Nhánh một: hai giá trị bằng `2520a48dd7893f5cf9674357fd6a36e58772bcbd` và `43ada847f9bd84494f80114de01f9f0b1b05c816` thì chạy tiếp. Nhánh hai: lệch dạng nguyên nhân A của `DEC-08` thì ô bằng chứng phải có đủ ba thứ mà `DEC-08` đòi rồi chạy tiếp, và AC này PASS. Nhánh ba: lệch dạng nguyên nhân B thì bàn giao `BLOCKED` và AC này vẫn PASS vì đã tuân điều kiện dừng | `git hash-object .ai-pipeline/scripts/verify-audit.ps1` và `git hash-object .ai-pipeline/scripts/gate-lib.ps1` | `evidence/step01-fingerprint.txt` | Yes |
| `AC-02` | `RQ-01` | Chạy cổng audit trên bản audit round 1 của rf-06 in ra một dòng chứa token `S-18` và nêu ĐỦ chín ID từ `AC-01` tới `AC-09` | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-audit.ps1 -TaskPath docs/tasks/hrp-v5-rf-06-vitest-default-lane-safety/TASK.md` | `evidence/ac02-s18-rf06.txt` | Yes |
| `AC-03` | `RQ-02` | Cùng lệnh của `AC-02` in ra một dòng chứa token `S-19` và nêu chuỗi `BLOCKED` là nội dung ô Result | Cùng lệnh `AC-02`, đọc dòng có `S-19` | `evidence/ac03-s19-rf06.txt` | Yes |
| `AC-04` | `RQ-01` | Với đúng HAI hàng AC giống nhau, cổng ra WARN chứ không ra ERROR. Chứng minh bằng một case fixture trong selftest, không bằng lời văn | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-gates.selftest.ps1` rồi đọc dòng của case ngưỡng | `evidence/ac04-threshold.txt` | Yes |
| AC-05 | RQ-03 | Đo trên Baseline `EV-06`, KHÔNG so với HEAD `31625c4` (HEAD ấy có TRƯỚC bộ gate nên quy sai cả khối `S-17` thành dòng mới, cho `569`): so blob `2520a48d` với blob Tier 2 giao `b6854802` cho `98 0`, tức `0` dòng xoá nên không câu lệnh `S-17` nào đổi, và số dòng comment `DEC-02` thêm lớn hơn `0`. Xem `AUD-101` | `git diff --numstat 2520a48dd7893f5cf9674357fd6a36e58772bcbd b6854802e329b391a70475eef8920255f0b7d639` rồi đọc cột thêm và cột bớt | `evidence/ac05-s17-unchanged.txt` | Yes |
| `AC-06` | `RQ-04` | `cases` lớn hơn hoặc bằng `35`, số green lớn hơn hoặc bằng `3`, `failures` bằng `0`, exit code `0`. Mốc trước round là `cases: 33 total (3 green, 30 red), failures: 0` nếu task này chạy đầu lô. Nếu hợp đồng anh em đã đóng trước theo `DEC-08` thì mốc là dòng `cases:` do CHÍNH `STEP-01` đo, và điều kiện là tổng case tăng thêm ít nhất `2` so với mốc ấy | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-gates.selftest.ps1` rồi đọc dòng `cases:` và dòng `RESULT:` | `evidence/ac06-selftest.txt` | Yes |
| `AC-07` | `RQ-04` | Chạy selftest hai lần liên tiếp ra cùng một dòng `cases:` và cùng exit code | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-gates.selftest.ps1` chạy lần một, rồi chạy lại đúng chuỗi ký tự đó lần hai, rồi so hai output | `evidence/ac07-idempotent.txt` | Yes |
| `AC-08` | `RQ-06` | `git hash-object` của bản audit rf-06 lúc đầu và lúc cuối round bằng nhau, và bằng `1212bae740578cd10005e4c508b37d8c37afcdb0` | `git hash-object docs/tasks/hrp-v5-rf-06-vitest-default-lane-safety/AUDIT.md` chạy hai lần | `evidence/ac08-audit-untouched.txt` | Yes |
| AC-09 | RQ-07 | Trên ít nhất HAI slug khác đã ACCEPTED, cổng audit không in `[FAIL] S-18` và không in `[FAIL] S-19`. Cổng CÓ in `[OK] S-18 N AC rows` là bình thường vì mọi bản audit sạch đều chạy mã kiểm này (xem `AUD-102`); nếu có `[FAIL]` thì phải trích ra chính các hàng trùng để chứng minh không oan | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-audit.ps1 -TaskPath docs/tasks/hrp-v5-go-live-16-internal-contrast-focus/TASK.md` và `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-audit.ps1 -TaskPath docs/tasks/hrp-v5-go-live-18-public-surface-hardening/TASK.md` | `evidence/ac09-no-false-positive.txt` | Yes |
| `AC-10` | `RQ-08` | Hợp của `git status --porcelain` và `git diff --cached --name-only` do Tier 2 gây ra chỉ gồm hai tệp trong `Modules` cộng path dưới `docs/tasks/hrp-v5-gate-01-audit-row-identity/**`. Path của luồng khác và của Tier 1 không tính vào AC này | `git status --porcelain` và `git diff --cached --name-only`, đối chiếu với dấu tay ở `STEP-01` | `evidence/step07-scope.txt` | Yes |
| `AC-11` | `RQ-04` | Cổng contract và cổng bàn giao chạy CUỐI CÙNG đều ra `RESULT: PASS` với exit `0` | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-gate-01-audit-row-identity/TASK.md` rồi `verify-handoff.ps1` với cùng tham số | `evidence/ac11-gates.txt` | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-02` | `AC-02` |
| `RQ-02` | `STEP-03` | `AC-03` |
| `RQ-03` | `STEP-04` | `AC-05` |
| `RQ-04` | `STEP-05` | `AC-06` |
| `RQ-05` | `STEP-01` | `AC-01` |
| `RQ-06` | `STEP-06` | `AC-08` |
| `RQ-07` | `STEP-06` | `AC-09` |
| `RQ-08` | `STEP-07` | `AC-10` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Luồng khác dịch `verify-audit.ps1` giữa round, hai bên ghi đè nhau | Dấu tay ở `STEP-07` lệch dấu tay ở `STEP-01` | `STEP-01` chốt dấu tay, `STEP-07` đo lại, lệch thì bàn giao `BLOCKED` | Không revert tệp của luồng khác. Ghi `LIM` rồi trả cho Tier 1 phân xử |
| `RISK-02` | `S-18` đỏ oan trên bản audit hợp lệ có hai AC cùng lệnh cùng artifact | `AC-09` thấy `S-18` trên slug khác | Ngưỡng ba hàng theo `DEC-04`, hai hàng chỉ cảnh báo | Siết cách chuẩn hoá ô, KHÔNG hạ ngưỡng. Vẫn oan thì hạ `S-18` xuống WARN và ghi nợ mới |
| `RISK-03` | `Test-CellHasNumber` vẫn là bất kỳ chữ số nên một hàng bịa vẫn thoả `S-02` bằng một chữ số vô nghĩa | Sau task này vẫn còn bản audit lọt bằng đường khác | Ghi thành nợ, không vá trong round này theo `DEC-03` | Nợ ghi ở §8 `Q-01`, mở contract riêng |
| `RISK-04` | Có người sửa bản audit của rf-06 để cổng xanh | `AC-08` thấy dấu tay lệch | `AC-08` chốt dấu tay `1212bae740578cd10005e4c508b37d8c37afcdb0` | `git restore --staged --worktree` chỉ path đó, và khai trong HANDOFF là đã xảy ra |
| `RISK-05` | Selftest bị làm xanh bằng cách nới mã kiểm chứ không bằng cách sửa case | `cases` tăng mà `AC-02` không đỏ được trên artifact thật | `AC-02` đo trên bản audit THẬT, không đo trên fixture | Bác bàn giao, mở execution round mới |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | `Test-CellHasNumber` là bất kỳ chữ số nên một chữ số vô nghĩa cũng thoả `S-02` và `H-06`. Siết nó cần đo blast radius trên cả ba cổng. Mở contract riêng hay gộp vào bộ gate của luồng khác? | Tier 1 | Sau khi bộ gate của luồng khác vào `HEAD` | No |
| `Q-02` | `S-09` chỉ so §4 với round trước đã commit nên round 1 không được bảo vệ. `S-18` vá ca trùng hàng nhưng không vá ca một round duy nhất bịa toàn bộ §4. Có cần mã kiểm riêng cho round 1? | Tier 1 | Sau task này | No |

## 9. Planner Resolution

Tier 1 append quyết định sau audit; không sửa lịch sử finding.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| `1` | `AUD-101` (`AC-05`) | `ACCEPT_FIX` (`PLN-60`) | Phương pháp cũ `git diff --cached` so index với HEAD `31625c4`, mà HEAD ấy có TRƯỚC bộ gate nên quy cả khối `S-17` thành dòng mới và trả `569`. Tôi tự đo trên Baseline `EV-06`: `git diff --numstat 2520a48d b6854802` = `98 0`, `0` dòng xoá nên `0` câu lệnh `S-17` đổi, comment `DEC-02` từ `0` lên `1`. Nội dung ĐÚNG, mặt chữ phương pháp hỏng; Tier 2 khai `LIM` thay vì lặng lẽ PASS | Sửa phương pháp và pass-condition `AC-05` sang đo trên blob Baseline; bump `v1.3` | Đóng ở `v1.3`. KHÔNG mở execution round: sửa phép đo của Tier 1 |
| `1` | `AUD-102` (`AC-09`) | `ACCEPT_FIX` (`PLN-61`) | Lời `AC-09` "không in S-18" sai: cổng in `[OK] S-18 12 AC rows` trên go-live-16 và `[OK] S-18 18 AC rows` trên go-live-18. Mệnh đề đo được đúng là "không in `[FAIL]` S-18/S-19", tôi tự chạy ra `0` và `0` trên cả hai slug. `AC-09` vẫn PASS | Sửa pass-condition `AC-09` sang `[FAIL]` S-18/S-19, ghi rõ `[OK] S-18` là bình thường; bump `v1.3` | Đóng ở `v1.3`. KHÔNG mở execution round |
| `1` | Tier 1 tự ghi nhận | `NOTE` | Bản audit đo `v1.2`; bump lên `v1.3` để sửa hai lời văn AC nên chạy lại `verify-audit.ps1` sau bump sẽ cho `[FAIL] A-02` — đó là ĐÚNG vì audit đo v1.2, KHÔNG sửa `AUDIT.md` để dập. Cổng resolve trước bump `verify-audit.ps1` exit `0` `[OK] A-02 v1.2` `[OK] A-05 CONDITIONAL`, WARN duy nhất `S-16` index chung. Cổng cuối `verify-task.ps1` không xét A-02: tôi tự chạy exit `0` `RESULT: DRAFT-VALID (1 warning)`, WARN duy nhất là `T-03` trên `AC-05` — phương pháp đúng mà `AUD-101` đòi là so hai blob bằng `git diff --numstat`, còn `T-03` chỉ nhận `--cached`/`HEAD`, hai cái ấy BẤT KHẢ ở đây vì HEAD `31625c4` có TRƯỚC tệp. Exit `0` là tín hiệu qua; WARN không dập, cùng lớp `S-16` | Không đổi contract | Đóng. Doctrine A-02 đỏ sau bump bị đòi; `T-03` là false-positive heuristic trên AC nội-dung |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-09-04` | Contract đầu tiên: thêm `S-18` trùng hàng AC và `S-19` từ vựng verdict làm kết quả, cộng hai case selftest | Nợ `PLN-45` từ resolution round 1 của `hrp-v5-rf-06-vitest-default-lane-safety` |
| `v1.1` | `2026-09-05` | Đổi dấu tay `gate-lib.ps1` ở `EV-06` và `AC-01` sang `43ada847f9bd84494f80114de01f9f0b1b05c816`; dịch trích dòng `EV-02` sang `291` tới `294`; thêm `EV-09` | Tier 1 tự vá danh sách token lệnh của `gate-lib.ps1` theo lệnh sếp, nên dấu tay cũ hết hiệu lực trước khi round mở |
| `v1.2` | `2026-09-05` | Thêm `DEC-08` tách hai nguyên nhân lệch dấu tay; `RQ-05`, `STEP-01` và `AC-01` đi qua phân loại đó thay vì dừng vô điều kiện; `AC-06` bỏ phụ thuộc vào thứ tự trong lô | Sếp giao ba hợp đồng gate trong MỘT lệnh. gate-01 và gate-02 cùng chạm `verify-audit.ps1` và `verify-gates.selftest.ps1`, nên hợp đồng chạy sau chắc chắn thấy lệch và sẽ trả `BLOCKED` giả nếu không tách nguyên nhân |
| `v1.3` | `2026-09-05` | Sửa phép đo HAI AC — `AC-05` từ `git diff --cached` so HEAD trước-gate sang `git diff --numstat` trên blob Baseline `EV-06` (`2520a48d` so `b6854802`), và `AC-09` từ "không in S-18" sang "không in `[FAIL]` S-18/S-19". Không đổi một yêu cầu, một bước hay một deliverable nào. Status sang `ACCEPTED` | Audit round `1` `CONDITIONAL`: `10/11` PASS, `AC-05` PARTIAL do defect LỜI VĂN của Tier 1. Xem `PLN-60` và `PLN-61` |
