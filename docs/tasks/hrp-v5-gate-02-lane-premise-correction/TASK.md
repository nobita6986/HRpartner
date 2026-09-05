# TASK: hrp-v5-gate-02-lane-premise-correction

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-gate-02-lane-premise-correction` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.3` |
| Status | `ACCEPTED` |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — independent auditor |
| Baseline | HEAD `31625c4`. `gate-lib.ps1` và `verify-handoff.ps1` KHÔNG có ở `HEAD`, nên baseline thật của chúng là dấu tay blob ghi ở `EV-06`, không phải một commit |
| Modules | `.ai-pipeline/scripts/gate-lib.ps1`, `.ai-pipeline/scripts/verify-gates.selftest.ps1` |
| ADR references | Nợ `PLN-46` từ resolution của `hrp-v5-rf-06-vitest-default-lane-safety` round 1 |
| Current execution round | `1` |
| Current audit round | `1` |
| Next gate | ĐÓNG. Round 1 ACCEPTED. Commit bộ gate CHỜ gate-01 cũng ACCEPTED rồi `git commit -- pathspec` (KHÔNG `git add -A`), xem `PLN-59` của gate-03 |
| Updated | `2026-09-05 20:20 Asia/Bangkok` |

## 1. Outcome

### User-visible outcome

Một ô bằng chứng nhắc lane `npx vitest run` trần KHÔNG còn bị cổng đánh đỏ chỉ vì thiếu cờ config, khi mà chính repo này đã làm lane trần an toàn. Mã kiểm chuyển từ chỗ đoán tiền đề sang chỗ ĐO tiền đề: nó đỏ khi cấu hình mặc định thật sự để lane trần chạm biến DB thật, và im khi cấu hình đã khoá.

### Non-goals

- Không sửa `vitest.config.ts`. Cấu hình đã đúng từ rf-06; task này chỉ sửa thứ ĐÁNH GIÁ nó.
- Không nới predicate thành luôn trả `false`. Lane trần vẫn phải bị chặn khi cấu hình mặc định không khoá.
- Không sửa `verify-pipeline.ps1` và `verify-task.ps1`. Chúng không gọi predicate này.
- Không xoá hay chỉnh `LIM` mà các task cũ đã khai để đi qua `H-08`. Lịch sử giữ nguyên.
- Không commit, không push. Bàn giao ở trạng thái staged.

## 2. Evidence và Baseline

| ID | Evidence | Source | Note |
|---|---|---|---|
| `EV-01` | `Test-CellUsesNonCanonicalLane` đỏ mọi ô khớp lane trần mà không khớp cờ config, bất kể cấu hình thật | `.ai-pipeline/scripts/gate-lib.ps1` dòng `331` tới `335` | Predicate không đọc tệp cấu hình nào |
| `EV-02` | `H-08` gọi predicate ấy trên ô ghép của từng hàng AC trong HANDOFF và tính là ERROR | `.ai-pipeline/scripts/verify-handoff.ps1` dòng `202` tới `205` | Thông điệp khẳng định lane trần đọc biến DB từ tệp env sản xuất |
| `EV-03` | `S-11` gọi CÙNG predicate ấy trên hàng AC của AUDIT và cũng tính là ERROR | `.ai-pipeline/scripts/verify-audit.ps1` dòng `200` tới `203` | Một sửa ở predicate chữa cả hai mã kiểm |
| `EV-04` | Cấu hình mặc định FORCE biến DB chính về một sentinel không tới được, và làm blank bốn biến DB còn lại | `vitest.config.ts` dòng `25` và dòng `43` tới `49` | Giá trị sentinel KHÔNG được sao vào bất kỳ artifact nào của task này |
| `EV-05` | Phép đo trong resolution rf-06: lane trần exit `0`, canary còn cắm, lane trần và lane canonical thu CÙNG `109` tệp và CÙNG `1669` test | `docs/tasks/hrp-v5-rf-06-vitest-default-lane-safety/TASK.md` mục `9` | Đây là thứ bác tiền đề của `H-08` |
| `EV-06` | Dấu tay blob trước round, `gate-lib.ps1` đo lại sau khi Tier 1 vá token, xem `Q-03`: `gate-lib.ps1` là `43ada847f9bd84494f80114de01f9f0b1b05c816`, `verify-handoff.ps1` là `3997dd4ff896ea9f7cebdf40a247bcb269ab23e5`, `verify-audit.ps1` là `2520a48dd7893f5cf9674357fd6a36e58772bcbd` | `git hash-object` trên ba tệp | Bộ gate thuộc luồng Tier 1 khác; lệch dấu tay nghĩa là dụng cụ đã dịch giữa round |
| `EV-07` | Mốc selftest trước round: `cases: 33 total (3 green, 30 red), failures: 0`, exit `0` | `.ai-pipeline/scripts/verify-gates.selftest.ps1` | Harness ghi fixture dưới thư mục tạm, không ghi gì trong repo |
| `EV-08` | Case sẵn có tên `H-08 HANDOFF dùng lane npx vitest run trần` đang kỳ vọng FAIL, và nó mutate một ô AC thành lane trần | `.ai-pipeline/scripts/verify-gates.selftest.ps1` | Case này PHẢI đổi kỳ vọng theo `DEC-04`, nếu không nó khoá cứng tiền đề cũ |

## 3. Decisions và Assumptions

| ID | Decision/Assumption | Rationale | Impact if wrong |
|---|---|---|---|
| `DEC-01` | Sửa ở `Test-CellUsesNonCanonicalLane` chứ không sửa riêng `H-08` | Cùng một predicate nuôi cả `H-08` và `S-11`; sửa một chỗ chữa hai mã kiểm và không làm hai bên lệch nhau | Sửa hai nơi thì bàn giao xanh ở HANDOFF mà AUDIT vẫn đỏ, đúng loại lỗi bất đối xứng của go-live-18 |
| `DEC-02` | Predicate phải ĐỌC `vitest.config.ts` của repo. Lane trần được tha khi và chỉ khi cấu hình mặc định khoá biến DB; không đọc được tệp thì giữ hành vi đỏ như cũ | Tiền đề của mã kiểm là một mệnh đề về CẤU HÌNH, nên phải đo cấu hình, không đoán | Nếu tha vô điều kiện thì repo khác hoặc một commit tương lai bỏ khoá sẽ lại đọc DB thật mà cổng im |
| `DEC-03` | Fail-closed: tệp cấu hình vắng, không đọc được, hoặc mẫu khoá không khớp thì predicate trả `true` như cũ | An toàn nghiêng về phía chặn | Fail-open làm mã kiểm vô dụng đúng lúc cần nhất |
| `DEC-04` | Case selftest `H-08` hiện có phải đổi kỳ vọng, và phải thêm case mới dựng cấu hình KHÔNG khoá để chứng minh predicate vẫn đỏ được | Một mã kiểm chỉ còn nửa hành vi thì không phải mã kiểm | Giữ case cũ nguyên thì selftest đỏ, và người sau sẽ nới predicate để dập màu đỏ đó |
| `DEC-05` | Thông điệp của `H-08` và `S-11` phải viết lại cho khớp tiền đề mới, và phải nêu tên tệp cấu hình mà predicate đã đọc | Bản audit và bản bàn giao được đọc bởi người; một thông điệp sai tiền đề dạy sai người đọc | Thông điệp cũ tiếp tục lan mệnh đề đã bị bác |
| `DEC-06` | Không sao giá trị sentinel DB vào TASK, HANDOFF, AUDIT hay tệp trong `evidence/` | `H-09` chặn viết sentinel URL vào bàn giao, và luật của sếp cấm log connection string | Bàn giao bị cổng chặn, và một chuỗi giống connection string nằm trong repo |
| `DEC-07` | Nếu dấu tay ở `EV-06` lệch lúc bắt đầu round thì DỪNG và bàn giao `BLOCKED`, không merge và không ghi đè, trừ nguyên nhân A ở `DEC-09` | Bộ gate là tài sản của luồng Tier 1 khác | Hai luồng ghi đè nhau, mất công việc chưa commit của người khác |
| `DEC-08` | Predicate mới KHÔNG được đọc tệp env, không chạy vitest, không mở kết nối DB | Một mã kiểm cổng phải rẻ, tĩnh, chạy được trên máy không có credential | Cổng biến thành thứ cần môi trường, và `ENV_BLOCKED` lan vào mọi task |
| `DEC-09` | Lệch dấu tay có HAI nguyên nhân và chỉ MỘT là điều kiện dừng. Nguyên nhân A là hợp đồng ANH EM trong CÙNG lô giao vừa đóng, tức `hrp-v5-gate-01-audit-row-identity`, mà scope của nó gồm `verify-audit.ps1` và `verify-gates.selftest.ps1`. Nguyên nhân A phải trả giá bằng ba thứ trong CÙNG ô bằng chứng: tệp `HANDOFF.md` của hợp đồng anh em có thật, `git diff` của tệp lệch chỉ chạm vùng thuộc scope hợp đồng ấy, và dấu tay MỚI được ghi lại. Đủ ba thứ thì ghi một hàng `LIM` trong HANDOFF rồi TIẾP TỤC. Nguyên nhân B là mọi lệch khác và nó DỪNG theo `DEC-07`. Lệch vì CHÍNH round này sửa tệp không phải nguyên nhân B | Sếp giao cả ba hợp đồng gate trong MỘT lệnh, và gate-01 cùng gate-02 chạm chung hai tệp, nên hợp đồng chạy sau CHẮC CHẮN thấy lệch; không tách nguyên nhân thì nó bàn giao `BLOCKED` giả | Tier 2 dừng oan và lô giao chỉ xong một phần, hoặc ngược lại Tier 2 coi mọi lệch là vô hại rồi ghi đè công việc chưa commit của luồng Tier 1 khác |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Type | Priority |
|---|---|---|---|
| `RQ-01` | `Test-CellUsesNonCanonicalLane` đọc `vitest.config.ts` ở gốc repo và trả `false` cho ô nhắc lane trần KHI cấu hình mặc định khoá biến DB | Functional | P0 |
| `RQ-02` | Cùng predicate vẫn trả `true` cho ô nhắc lane trần khi cấu hình mặc định KHÔNG khoá biến DB | Functional | P0 |
| `RQ-03` | Tệp cấu hình vắng hoặc không đọc được thì predicate trả `true` | Functional | P0 |
| `RQ-04` | Thông điệp của `H-08` và của `S-11` không còn khẳng định vô điều kiện rằng lane trần đọc biến DB từ tệp env, và có nêu tên tệp cấu hình đã đọc | Functional | P1 |
| `RQ-05` | Selftest có case cho nhánh tha và case cho nhánh chặn, `failures` bằng `0`, và tổng case tăng | Quality | P0 |
| `RQ-06` | Predicate không đọc tệp env, không gọi vitest, không mở kết nối mạng | Safety | P0 |
| `RQ-07` | Dấu tay blob ở `EV-06` được chốt lúc mở round và đo lại lúc đóng round, và mọi lệch được phân loại theo `DEC-09` trước khi kết luận | Process | P0 |
| `RQ-08` | Không tệp nào ngoài `Modules` và thư mục task này bị Tier 2 thay đổi | Scope | P0 |

### 4.2 Scope boundaries

| In scope | Out of scope |
|---|---|
| `.ai-pipeline/scripts/gate-lib.ps1` phần predicate lane và comment tiền đề của nó | `vitest.config.ts` và mọi tệp cấu hình test |
| Chuỗi thông điệp của `H-08` trong `verify-handoff.ps1` và của `S-11` trong `verify-audit.ps1` | Mọi mã kiểm khác trong ba cổng |
| `.ai-pipeline/scripts/verify-gates.selftest.ps1` phần case lane | `.ai-pipeline/scripts/verify-pipeline.ps1` |
| `docs/tasks/hrp-v5-gate-02-lane-premise-correction/**` | `AUDIT.md` và `TASK.md` của mọi slug khác |
| Không có | Mã ứng dụng dưới `src/`, `app/`, `prisma/` |

### 4.3 Data, State, Permission và Interface Rules

| Rule ID | Rule |
|---|---|
| `R-01` | Tier 2 KHÔNG commit và KHÔNG push. Chỉ `git add` path trong scope; cấm `git add -A` và `git add .` |
| `R-02` | Không đọc và không in giá trị của bất kỳ biến môi trường DB nào. Không sao giá trị sentinel ở `vitest.config.ts` dòng `25` vào bất kỳ đâu |
| `R-03` | Không chạy migration, không seed, không chạm DB |
| `R-04` | Gọi script cổng bằng `powershell -NoProfile -File`; cờ hạ execution policy không được phép trong phiên này |
| `R-05` | Thay đổi của luồng khác trong cây làm việc: không reset, không restore, không overwrite, không stage, không commit |
| `R-06` | Hai cổng `verify-task.ps1` và `verify-handoff.ps1` chạy CUỐI CÙNG, sau khi mọi thay đổi đã staged |

## 5. Execution Plan

| STEP ID | Step | Output |
|---|---|---|
| `STEP-01` | Chốt dấu tay ba tệp bằng `git hash-object .ai-pipeline/scripts/gate-lib.ps1 .ai-pipeline/scripts/verify-handoff.ps1 .ai-pipeline/scripts/verify-audit.ps1` rồi so với `EV-06`. Lệch thì phân loại theo `DEC-09`: nguyên nhân A thì ghi dấu tay mới cộng một hàng `LIM` rồi tiếp tục, nguyên nhân B thì DỪNG và bàn giao `BLOCKED` theo `DEC-07` | `evidence/step01-fingerprint.txt` |
| `STEP-02` | Chạy `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-gates.selftest.ps1` để chốt mốc `EV-07` TRƯỚC khi sửa | `evidence/step02-selftest-before.txt` |
| `STEP-03` | Sửa `Test-CellUsesNonCanonicalLane`: giữ nhánh cờ config như cũ, thêm nhánh đọc `vitest.config.ts` ở gốc repo và tha khi thấy dấu hiệu khoá biến DB. Fail-closed theo `DEC-03`. Viết lại comment tiền đề phía trên hàm | `evidence/step03-predicate-diff.txt` |
| `STEP-04` | Viết lại chuỗi thông điệp của `H-08` và của `S-11` theo `DEC-05`, chỉ đổi chuỗi, không đổi mức nặng | `evidence/step04-message-diff.txt` |
| `STEP-05` | Đổi kỳ vọng case `H-08` sẵn có sang PASS, thêm một case mới dựng fixture cấu hình KHÔNG khoá để kỳ vọng FAIL, và một case cho ca tệp cấu hình vắng | `evidence/step05-selftest-cases.txt` |
| `STEP-06` | Chạy lại selftest và so với mốc `EV-07` | `evidence/step06-selftest-after.txt` |
| `STEP-07` | Chạy cổng audit trên bản audit round 1 của rf-06 để xác nhận `S-11` không đỏ oan, và chạy trên hai slug ACCEPTED khác | `evidence/step07-regression.txt` |
| `STEP-08` | Đo lại dấu tay `EV-06`, đo scope, `git add` path trong scope, rồi chạy `verify-task.ps1` và `verify-handoff.ps1` CUỐI CÙNG | `evidence/step08-scope-gates.txt` |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-07` | Bản bàn giao ghi dấu tay thật của ba tệp đo lúc mở round rồi kết luận một trong ba nhánh. Nhánh một: đúng ba giá trị ở `EV-06` thì chạy tiếp. Nhánh hai: lệch dạng nguyên nhân A của `DEC-09` thì ô bằng chứng có đủ ba thứ mà `DEC-09` đòi rồi chạy tiếp, và AC này PASS. Nhánh ba: lệch dạng nguyên nhân B thì bàn giao `BLOCKED` và AC này vẫn PASS vì đã tuân điều kiện dừng | `git hash-object .ai-pipeline/scripts/gate-lib.ps1 .ai-pipeline/scripts/verify-handoff.ps1 .ai-pipeline/scripts/verify-audit.ps1` | `evidence/step01-fingerprint.txt` | Yes |
| `AC-02` | `RQ-01` | Chạy cổng bàn giao trên một HANDOFF có ô AC nhắc lane trần, với `vitest.config.ts` thật của repo, thì KHÔNG in token `H-08` | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-v5-gate-02-lane-premise-correction/TASK.md` trên một fixture bàn giao có ô lane trần | `evidence/ac02-h08-silent.txt` | Yes |
| `AC-03` | `RQ-02` | Với fixture `vitest.config.ts` KHÔNG khoá biến DB, cùng ô lane trần đó khiến cổng in token `H-08` | Case selftest nhánh chặn, đọc dòng của case đó trong output | `evidence/ac03-h08-still-red.txt` | Yes |
| `AC-04` | `RQ-03` | Với fixture KHÔNG có tệp `vitest.config.ts`, cùng ô lane trần đó khiến cổng in token `H-08` | Case selftest nhánh vắng tệp, đọc dòng của case đó | `evidence/ac04-fail-closed.txt` | Yes |
| `AC-05` | `RQ-01` | Không-dương-tính-giả trên nhánh `S-11`: chạy cổng audit trên bản audit round 1 của rf-06 thì KHÔNG in token `S-11`. Ghi rõ đây là phép chứng "không đỏ oan", KHÔNG phải phép chứng "đã tha một ô từng bị cắn": bản audit rf-06 không chứa ô lane trần đủ mạnh cho predicate CŨ cắn (11 lỗi của nó là 9 `S-19` cộng 1 nhóm `S-18` cộng 1 `S-10`, `0` `S-11`). Sự THA trên artifact thật được chứng ở `AC-02` qua predicate DÙNG CHUNG trên nhánh `H-08`. Xem `AUD-201` | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-audit.ps1 -TaskPath docs/tasks/hrp-v5-rf-06-vitest-default-lane-safety/TASK.md` | `evidence/ac05-s11-silent.txt` | Yes |
| `AC-06` | `RQ-04` | Chuỗi thông điệp của `H-08` và của `S-11` sau round không còn khớp mẫu khẳng định vô điều kiện về tệp env, và mỗi chuỗi có nêu tên `vitest.config.ts` | `git diff --cached -- .ai-pipeline/scripts/verify-handoff.ps1 .ai-pipeline/scripts/verify-audit.ps1` rồi trích hai dòng thông điệp | `evidence/ac06-messages.txt` | Yes |
| `AC-07` | `RQ-05` | `cases` lớn hơn hoặc bằng `35`, `failures` bằng `0`, exit code `0`. Mốc trước round là `cases: 33 total (3 green, 30 red), failures: 0` nếu task này chạy đầu lô. Nếu hợp đồng anh em đã đóng trước theo `DEC-09` thì mốc là dòng `cases:` do CHÍNH `STEP-02` đo, và điều kiện là tổng case tăng thêm ít nhất `2` so với mốc ấy | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-gates.selftest.ps1` rồi đọc dòng `cases:` và dòng `RESULT:` | `evidence/step06-selftest-after.txt` | Yes |
| `AC-08` | `RQ-06` | Trong khoảng thân hàm predicate sau round, số lần xuất hiện của chuỗi `.env` bằng `0`, của `Invoke-WebRequest` bằng `0`, của `npx` bằng `0`, và của `npm` bằng `0` | Trích thân hàm rồi `grep -c` từng chuỗi trên chính khoảng đó | `evidence/ac08-no-side-effect.txt` | Yes |
| `AC-09` | `RQ-06` | Không tệp nào trong `evidence/` chứa chuỗi `postgresql://` hoặc `postgres://` | `grep -rn` hai chuỗi đó trên `docs/tasks/hrp-v5-gate-02-lane-premise-correction/evidence/` | `evidence/ac09-no-sentinel.txt` | Yes |
| `AC-10` | `RQ-08` | Hợp của `git status --porcelain` và `git diff --cached --name-only` do Tier 2 gây ra chỉ gồm hai tệp trong `Modules`, hai tệp chuỗi thông điệp ở `4.2`, và path dưới `docs/tasks/hrp-v5-gate-02-lane-premise-correction/**`. Path của luồng khác và của Tier 1 không tính vào AC này | `git status --porcelain` và `git diff --cached --name-only`, đối chiếu dấu tay ở `STEP-01` | `evidence/step08-scope-gates.txt` | Yes |
| `AC-11` | `RQ-05` | Cổng contract và cổng bàn giao chạy CUỐI CÙNG đều ra `RESULT: PASS` với exit `0` | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-gate-02-lane-premise-correction/TASK.md` rồi `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-v5-gate-02-lane-premise-correction/TASK.md` | `evidence/ac11-gates.txt` | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-03` | `AC-02` |
| `RQ-02` | `STEP-05` | `AC-03` |
| `RQ-03` | `STEP-05` | `AC-04` |
| `RQ-04` | `STEP-04` | `AC-06` |
| `RQ-05` | `STEP-06` | `AC-07` |
| `RQ-06` | `STEP-03` | `AC-08` |
| `RQ-07` | `STEP-01` | `AC-01` |
| `RQ-08` | `STEP-08` | `AC-10` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Luồng khác dịch `gate-lib.ps1` giữa round, hai bên ghi đè nhau | Dấu tay ở `STEP-08` lệch dấu tay ở `STEP-01` | `STEP-01` chốt, `STEP-08` đo lại, lệch thì bàn giao `BLOCKED` | Không revert tệp của luồng khác. Ghi `LIM` rồi trả cho Tier 1 phân xử |
| `RISK-02` | Predicate bị nới thành luôn tha, mã kiểm mất hẳn hiệu lực | `AC-03` hoặc `AC-04` không đỏ được | Hai AC nhánh chặn là blocking, và mỗi nhánh có case selftest riêng | Bác bàn giao, mở execution round mới |
| `RISK-03` | Mẫu nhận dạng khoá biến DB quá hẹp nên một cấu hình khoá bằng cách khác vẫn bị chặn | Task sau vẫn phải khai `LIM` cho `H-08` | Ghi thành nợ ở `Q-01`, không nới predicate trong round này | Mở contract riêng để mở rộng mẫu |
| `RISK-04` | Giá trị sentinel bị sao vào evidence khi trích dòng cấu hình | `AC-09` thấy chuỗi giống connection string | `R-02` cấm sao, `AC-09` đo | Xoá tệp evidence đó, ghi lại bằng số dòng thay vì nội dung |
| `RISK-05` | Đọc tệp cấu hình trong predicate làm cổng chậm hoặc phụ thuộc thư mục làm việc | Cổng chạy sai khi gọi từ thư mục khác | Đọc theo gốc repo, không theo thư mục hiện tại; cache trong một lần chạy | Quay về hành vi cũ và ghi nợ, không để cổng phụ thuộc thư mục |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | Mẫu nhận dạng khoá biến DB nên chặt tới đâu? Đọc tĩnh bằng regex thì một cấu hình khoá theo cách khác vẫn bị chặn oan; phân tích cú pháp thật thì cổng nặng lên | Tier 1 | Sau task này | No |
| `Q-02` | Các task cũ đã khai `LIM` cho `H-08` nay không cần nữa. Có nên rà lại và ghi một dòng vào từng resolution, hay để nguyên như dấu vết lịch sử? | Tier 1 | Sau khi bộ gate vào `HEAD` | No |
| `Q-03` | ĐÃ TRẢ LỜI `2026-09-05 00:05`. Danh sách token lệnh ở `.ai-pipeline/scripts/gate-lib.ps1` dòng `276` nhận `git cat-file` nhưng KHÔNG nhận `git hash-object`, nên một ô bằng chứng chốt dấu tay bị `T-05` và `H-06` coi là không có lệnh. Sếp giao Tier 1 tự vá ngay: thêm `hash-object` vào nhánh `git` cùng ba dòng chú thích, `git diff --numstat` cho `4 1`, dấu tay sang `43ada847f9bd84494f80114de01f9f0b1b05c816`, `verify-gates.selftest.ps1` exit `0` giữ nguyên `cases: 33 total (3 green, 30 red), failures: 0`. Round này KHÔNG còn nợ nào ở đây | Tier 1 | Đã đóng | No |
| `Q-04` | Comment tiêu đề nhóm ở `verify-handoff.ps1` dòng `18` vẫn mang tiền đề `.env` đã bị bác (là COMMENT, ngoài phạm vi `RQ-04` vốn chỉ chỉnh chuỗi thông điệp; Tier 2 để nguyên là đúng luật, khai `LIM-11`). Gộp cùng họ `Q-02`: khi rà lời văn `H-08` cũ thì sửa luôn comment này | Tier 1 | Sau khi bộ gate vào `HEAD` | No |

## 9. Planner Resolution

Tier 1 append quyết định sau audit; không sửa lịch sử finding.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| `1` | `AUD-201` (`AC-05`) | `ACCEPT_FIX` (`PLN-62`) | `AC-05` chạy cổng audit trên rf-06 đòi `0` `S-11`; tôi tự đo `0` `S-11` exit `2`, và `11` lỗi còn lại là `9` `S-19` cộng `1` nhóm `S-18` cộng `1` `S-10` — rf-06 không chứa ô lane trần đủ mạnh cho predicate CŨ cắn, nên `AC-05` là phép "không đỏ oan", KHÔNG phải phép chứng "đã tha". Sự THA trên artifact thật đã đo ở `AC-02` (predicate dùng chung, nhánh `H-08`, `HANDOFF.md` gate-02 mang `1` ô lane trần và cổng tha, `0` `H-08`). Lời văn `AC-05` nói mạnh hơn phép đo | Sửa pass-condition `AC-05` sang lời không-dương-tính-giả, trỏ `AC-02` cho phép chứng tha; bump `v1.3` | Đóng ở `v1.3`. KHÔNG mở execution round: bản giao Tier 2 đúng |
| `1` | `AUD-202` (`verify-handoff.ps1:18`) | `DEFER` (`PLN-63`) | Comment tiêu đề nhóm ở `verify-handoff.ps1` dòng `18` vẫn mang tiền đề `.env` đã bị bác. Đây là COMMENT, KHÔNG phải chuỗi thông điệp, nên nằm NGOÀI phạm vi `RQ-04` và mục 4.2; Tier 2 để nguyên là đúng luật và đã khai `LIM-11`. Không phải defect bản giao | Ghi nợ cho một contract sau, gộp cùng họ `Q-02`/`Q-04`; KHÔNG sửa trong round này vì ngoài phạm vi | Đóng bằng DEFER. KHÔNG mở execution round |
| `1` | Tier 1 tự ghi nhận | `NOTE` | Bản audit đo `v1.2`; bump lên `v1.3` để sửa lời văn `AC-05` nên chạy lại `verify-audit.ps1` sau bump sẽ cho `[FAIL] A-02` — đó là ĐÚNG vì audit đo v1.2, KHÔNG sửa `AUDIT.md` để dập. Cổng resolve trước bump `verify-audit.ps1` exit `0` `[OK] A-02 v1.2` `[OK] A-05 CONDITIONAL`, WARN duy nhất `S-16` (325 path index chung). Cổng cuối `verify-task.ps1` không xét A-02: tôi tự chạy exit `0`. Commit bộ gate phải `git commit -- pathspec` neo blob hiện tại, KHÔNG `git add -A`, vì `verify-audit.ps1` và `verify-gates.selftest.ps1` dùng chung với gate-01 | Không đổi contract | Đóng. Doctrine A-02 đỏ sau bump bị đòi |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-09-04` | Contract đầu tiên: predicate lane đọc cấu hình thật thay vì đoán tiền đề, sửa thông điệp `H-08` và `S-11`, thêm ba case selftest | Nợ `PLN-46` từ resolution round 1 của `hrp-v5-rf-06-vitest-default-lane-safety` |
| `v1.1` | `2026-09-05` | Đổi dấu tay `gate-lib.ps1` ở `EV-06` sang `43ada847f9bd84494f80114de01f9f0b1b05c816`; đóng `Q-03` bằng phép đo | Sếp giao Tier 1 tự vá token `git hash-object` ngay trong lúc viết contract, nên dấu tay cũ hết hiệu lực trước khi round mở |
| `v1.2` | `2026-09-05` | Thêm `DEC-09` tách hai nguyên nhân lệch dấu tay; `RQ-07`, `STEP-01` và `AC-01` đi qua phân loại đó thay vì dừng vô điều kiện; `AC-07` bỏ phụ thuộc vào thứ tự trong lô | Sếp giao ba hợp đồng gate trong MỘT lệnh, và hợp đồng chạy sau chắc chắn thấy `verify-audit.ps1` cùng `verify-gates.selftest.ps1` đã dịch |
| `v1.3` | `2026-09-05` | Sửa phép đo `AC-05`: nói rõ đây là phép KHÔNG-DƯƠNG-TÍNH-GIẢ trên nhánh `S-11` (rf-06 có `0` ô lane trần đủ mạnh cho predicate cũ cắn), còn sự THA trên artifact thật được chứng ở `AC-02` nhánh `H-08`. Không đổi một yêu cầu, một bước hay một deliverable nào. Status sang `ACCEPTED` | Audit round `1` `CONDITIONAL`: `11/11` PASS, hai P3 là defect LỜI VĂN/ngoài phạm vi của Tier 1. Xem `PLN-62` và `PLN-63` |
