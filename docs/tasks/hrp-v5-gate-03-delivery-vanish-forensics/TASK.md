# TASK: hrp-v5-gate-03-delivery-vanish-forensics

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-gate-03-delivery-vanish-forensics` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.3` |
| Status | `ACCEPTED` |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — independent auditor |
| Baseline | HEAD `31625c4`. Bằng chứng chính nằm NGOÀI repo nên baseline của nó là bản chụp Tier 1 đã lấy: bốn tệp `evidence/logfreeze-01-manifest.txt` tới `evidence/logfreeze-04-finding.txt`, dấu tay từng tệp log ghi trong tệp thứ nhất |
| Modules | `.ai-pipeline/scripts/verify-delivery-presence.ps1` (tệp MỚI) |
| ADR references | Nợ `PLN-47` từ resolution của `hrp-v5-rf-06-vitest-default-lane-safety` round 1 |
| Current execution round | `1` |
| Current audit round | `1` |
| Next gate | Contract ĐÓNG ở `v1.3`. Nhưng bản giao CODE `verify-delivery-presence.ps1` CHƯA commit được: tái lập gate-PASS từ HEAD đòi commit cả `verify-audit.ps1` và `gate-lib.ps1`, mà hai tệp ấy là bản giao CHƯA AUDIT của gate-01 và gate-02. Commit bộ gate chỉ mở sau khi gate-01 và gate-02 được audit rồi ACCEPTED, rồi commit CẢ suite một lượt bằng `git commit -- pathspec`. Xem `PLN-59` |
| Updated | `2026-09-05 16:46 Asia/Bangkok` |

## 1. Outcome

### User-visible outcome

Một mã kiểm mới đọc `Deliverables` của một contract rồi báo động khi một path bản giao vắng mặt hoặc còn `0` byte, để lần sau chuyện này bị bắt trong vài giây thay vì vài vòng audit.

Nửa điều tra của contract này ĐÃ ĐÓNG trước khi round mở, do Tier 1 tự đo theo lệnh sếp. Kết cục là KHÔNG XÁC LẬP ĐƯỢC, và nó đóng vì lý do mạnh hơn thiếu bằng chứng: chính cơ chất đã bị VS Code dọn. Kho log giờ chỉ còn `9832973` byte tính từ phiên `20260904T080100`, trong khi hôm `2026-09-04` nó còn `28634384` byte tính từ phiên `20260831T173707`; thư mục phiên `20260903T174307` còn tên nhưng RỖNG, `0` tệp. Khoảng thời gian bản giao rf-05 biến mất nằm trong phần đã bị dọn. Trong phần còn sống, số sự kiện `deleteFile` cộng `willDelete` cộng `didDelete` cộng `renameFile` là `0`, và cả `4` lần chuỗi `Workspace Edit` xuất hiện đều là nguyên văn lệnh hoặc tin nhắn của chính người điều tra. Executor KHÔNG được phái đi tìm cơ chế trong kho này nữa; xem `EV-09` tới `EV-11`.

### Non-goals

- Không phục hồi bản giao của rf-05. Đó là việc của contract rf-05, không phải của task này.
- Không điều tra lại kho log. Nửa đó đã đóng bằng phép đo ở `EV-09` tới `EV-11`; chạy lại phép tìm chỉ bơm thêm từ khoá vào cơ chất.
- Không sửa năm tệp gate của luồng Tier 1 khác. Mã kiểm mới là một tệp MỚI.
- Không quy trách nhiệm cho một luồng, một agent hay một extension nếu chưa có phép đo trỏ vào nó.
- Không dọn dấu vết: không `git gc`, không `git reflog expire`, không `git stash drop`.
- Không commit, không push. Bàn giao ở trạng thái staged.

## 2. Evidence và Baseline

| ID | Evidence | Source | Note |
|---|---|---|---|
| `EV-01` | Blob bản giao của rf-05 còn sống và có kiểu `blob`: `git cat-file -t 53cc484886ddf4164f0741739af42e75ad913528` trả `blob` | Đo lúc mở contract này | Không commit nào chạm tới nó, nên nó chỉ sống nhờ chưa bị prune |
| `EV-02` | HẾT HIỆU LỰC, đo lại `2026-09-05 08:16`. Kho log còn `10` thư mục phiên, từ `20260903T174307` tới `20260905T075944`, và `5` trong số đó RỖNG gồm cả `20260903T174307`. Thư mục có nội dung sớm nhất là `20260904T080100` | Đếm bằng `Get-ChildItem` trên kho log, ghi ở `evidence/logfreeze-04-finding.txt` | Điều ngược lại điều `v1.0` khẳng định: kho KHÔNG còn bao khoảng thời gian bản giao biến mất |
| `EV-03` | HẾT HIỆU LỰC, đo lại `2026-09-05 08:16`. Còn `12` tệp tên `Claude VSCode.log`, không phải `16`, ở đường dẫn dạng thư mục phiên rồi `window` cộng số hiệu rồi `exthost/Anthropic.claude-code/Claude VSCode.log` | `Get-ChildItem -Recurse` trên kho log, bản kê ở `evidence/logfreeze-01-manifest.txt` | Cơ chất thi hành được đã co lại; `40` path trong bản kê nhưng chỉ `24` tệp có nội dung |
| `EV-04` | HẾT HIỆU LỰC. Tệp được dẫn thuộc phiên `20260901T112329`, và phiên ấy KHÔNG còn trong kho. Mệnh đề gốc vẫn đúng về cơ chế: log ghi nguyên văn lệnh Bash qua sự kiện `new action being classified` | Đối chiếu bản kê `evidence/logfreeze-01-manifest.txt` với tên phiên đã dẫn | Cơ chế còn đúng, nhưng chính tệp làm chứng đã mất; đó là cách nợ `PLN-47` chết |
| `EV-05` | HẾT HIỆU LỰC, đo lại `2026-09-05 08:26`. Còn `3` tệp chứa chuỗi `tsconfig`, không phải `6`: hai ở phiên `20260904T080100` và `20260904T184723` | Cột `has tsconfig` của `evidence/logfreeze-03-index.txt` | Tập ứng viên co từ `6` xuống `3`, và cả ba nằm SAU thời điểm bản giao biến mất |
| `EV-06` | Kho log TỰ NHIỄM, đã lượng hoá. Cả `4` lần chuỗi `Workspace Edit` xuất hiện đều là nguyên văn lệnh hoặc tin nhắn của chính người điều tra: `20260904T184723/window4` dòng `9680` và `9871` là lệnh `grep` trỏ vào kho log, dòng `13735` và `16168` là tin nhắn hội thoại trích lại chuỗi ấy | `Select-String` trên `evidence/logfreeze-02-slices.txt` | Chuỗi này chỉ tồn tại trong kho vì có người đi tìm nó. Bẫy phương pháp, xử bằng `DEC-02` cộng `DEC-04` |
| `EV-07` | Cơ chế đã biết của lớp sự cố cắt tệp: extension ghi `source: "Workspace Edit"` rồi một buffer editor RỖNG đè lên bản trên đĩa; đã xảy ra `8` lần với `AUDIT.md` | Ghi nhận vận hành trong `docs/PLANNER_HANDOVER.md` và các resolution trước | Là GIẢ THUYẾT ứng viên, chưa phải kết luận cho ca `tsconfig.json` |
| `EV-08` | Tên tệp mã kiểm mới chưa tồn tại: `git ls-files .ai-pipeline/scripts/verify-delivery-presence.ps1` rỗng và tệp không có trên đĩa | Đo tại `STEP-01` | Nếu tên đã bị luồng khác chiếm thì dùng tên dự phòng ở `DEC-06` |
| `EV-09` | Bản chụp bảo tồn do Tier 1 lấy `2026-09-05 08:16` tới `08:28`, bốn tệp dưới `evidence/`: bản kê `40` path với `9832973` byte tổng, bản trích `1509` dòng giữ cộng `1` dòng bị che dưới nhãn `NEON_PW`, bản chỉ mục theo tệp, và bản kết luận | `Get-Content` bốn tệp `logfreeze-01` tới `logfreeze-04` | Đây là baseline của nửa điều tra. Kích cỡ byte trong bản kê CHÍNH LÀ lát cắt: mọi phép trích chỉ đọc `N` byte đầu |
| `EV-10` | Kho log đã bị VS Code tự dọn: `9832973` byte hôm nay so với `28634384` byte đo hôm `2026-09-04` trong cùng phiên làm việc; thư mục `20260903T174307` còn tên mà `0` tệp; tệp `4573340` byte ở `20260903T173805` window `2`, một trong sáu tệp từng chứa `tsconfig`, không còn tồn tại | Đối chiếu `evidence/logfreeze-01-manifest.txt` với số đo cũ ghi trong `evidence/logfreeze-04-finding.txt` | Cơ chất của `RQ-03` đã mất. Không phương pháp nào áp lên phần còn lại lấy lại được nó |
| `EV-13` | Bản giao `tsconfig.json` của rf-05 đã TRỞ LẠI, đo `2026-09-05`: `git hash-object tsconfig.json` trả `53cc484886ddf4164f0741739af42e75ad913528`, `git diff --cached --numstat -- tsconfig.json` trả `12 2`, `git status --porcelain` xếp path ấy vào nhóm đã staged, và hai hàng rào `tsc-program-boundary.static.test.ts` cùng `vitest-default-lane.static.test.ts` đều đang staged | `git hash-object`, `git diff --cached --numstat`, `git status --porcelain` | `BLK-02` ĐÓNG. Hệ quả cho contract này: KHÔNG còn ca vắng mặt SỐNG nào trong repo để chạy detector lên, nên nhánh vắng mặt phải dựng bằng fixture; xem `RQ-06`, `AC-07`, `AC-08` và `DEC-05` |
| `EV-12` | Bản chụp đã được quét secret và SẠCH, đo `2026-09-05 08:40` trên cả bốn tệp: `postgres` `0`, `npg_` `0`, `password` `0`, `secret` `0`, `eyJ` `0`, `AKIA` `0`, `bearer ` `0`; tám từ khoá gán gồm `token`, `password`, `passwd`, `pwd`, `secret`, `api_key`, `apikey` và `credential` đều trả `0` ở dạng gán. Chuỗi `token` có `381` lần, tất cả là số đếm token của log, không phải credential | `Select-String` từng pattern trên bốn tệp `logfreeze-*` | Đây là phép đo cho phép commit bản chụp vào repo theo `DEC-03` và `R-03`; `AC-03` chạy lại chính phép đo này |
| `EV-11` | Trong phần còn sống, đếm trên `24` tệp có nội dung dưới lát cắt byte: `deleteFile` là `0`, `willDelete` là `0`, `didDelete` là `0`, `renameFile` là `0`, `Workspace Edit` là `4` và cả bốn là tự nhiễm theo `EV-06` | `Select-String` trên `evidence/logfreeze-02-slices.txt`, số đếm ghi ở `evidence/logfreeze-04-finding.txt` | Không một sự kiện thao tác tệp nào tồn tại để quy kết. Đây là phép đo đưa `RQ-04` tới kết cục KHÔNG XÁC LẬP ĐƯỢC |

## 3. Decisions và Assumptions

| ID | Decision/Assumption | Rationale | Impact if wrong |
|---|---|---|---|
| `DEC-01` | Kết cục KHÔNG XÁC LẬP ĐƯỢC là một kết cục PASS, miễn là bản giao liệt kê đủ những gì đã tìm và những gì kho log không thể trả lời | Bắt buộc phải có kết luận thì sẽ sinh ra một kết luận bịa, và người sau sẽ đi sửa một quy trình không có lỗi | Một suy đoán được đóng khung thành sự thật rồi thành cơ sở cho contract sau |
| `DEC-02` | Chụp kho log TRƯỚC khi tìm kiếm rồi chỉ tìm trên bản chụp. ĐÃ THI HÀNH bởi Tier 1, kết quả là bốn tệp ở `EV-09` | Log ghi nguyên văn lệnh của người điều tra, nên mỗi lệnh grep tự bơm từ khoá vào cơ chất đang tìm; `EV-06` là ca thật, đo được `4` lần | Mọi phép đếm sau đó lẫn dấu vết của chính mình, và kết luận không phân biệt được nguồn |
| `DEC-03` | Trước khi copy, lọc bỏ dòng chứa chuỗi giống connection string, token, password hay secret. Nếu một dòng cần giữ để làm bằng chứng thì thay giá trị bằng nhãn và ghi rõ đã thay | Luật của sếp cấm log secret; kho log ngoài repo có thể chứa giá trị thật | Secret rơi vào repo và đi theo mọi bản clone sau đó |
| `DEC-04` | Tiêu chí tách là LÁT CẮT BYTE, không phải mốc thời gian: ghi kích cỡ từng tệp TRƯỚC khi chạy phép tìm nào, rồi mọi phép trích chỉ đọc `N` byte đầu của tệp đó. Không phân tích timestamp ở bất kỳ đâu | Byte offset là chính xác, timestamp trong log thì không; và thứ chính phép trích sinh ra luôn nằm SAU lát cắt nên không thể lọt vào kết quả | Kết luận dựa trên dấu vết của chính mình |
| `DEC-10` | Lát cắt byte KHÔNG làm sạch phần đã có sẵn: dòng do những phép tìm chạy sớm hơn trong CÙNG phiên làm việc, trước lúc chụp, nằm trong lát cắt và không phân biệt được bằng từ khoá. Nên một lần trúng từ khoá KHÔNG tự nó là bằng chứng, phải đọc chính dòng đó | Một dòng dạng `new action being classified` là tiếng vọng của lệnh, không phải sự kiện editor; `EV-06` là bốn ca như vậy | Đếm từ khoá bị đọc thành đếm sự kiện, và kết luận quy kết cho chính người điều tra |
| `DEC-05` | Mã kiểm mới đọc cột `Deliverables` hoặc `Output` của contract rồi kiểm từng path ở HAI nơi: cây làm việc và index. Vắng một trong hai là báo động | Ca rf-05 đã trở lại nên KHÔNG còn ca vắng mặt sống nào trong repo, xem `EV-13`; do đó cả hai nhánh phải chứng minh bằng fixture, và nhánh index là nhánh dễ mất nhất vì một tệp untracked vẫn nằm nguyên trong cây làm việc nên mắt thường không thấy gì bất thường | Lớp sự cố này vẫn đi qua cổng |
| `DEC-06` | Nếu tên `verify-delivery-presence.ps1` đã bị luồng khác chiếm thì dùng `verify-delivery-inventory.ps1` và ghi vào HANDOFF là đã đổi tên | Bộ gate thuộc luồng khác và đang dịch | Hai luồng ghi đè nhau trên cùng một tệp mới |
| `DEC-07` | Mã kiểm mới CHƯA được nối vào `verify-pipeline.ps1` trong round này | Nối vào là sửa tệp của luồng khác | Xung đột với luồng Tier 1 khác, và một cổng đỏ mới xuất hiện giữa vòng của người ta |
| `DEC-08` | Cấm `git gc`, `git gc --prune`, `git reflog expire` và `git stash drop` trong suốt round | Blob `53cc484` không có commit nào chạm tới, và `stash@{0}` mang công việc chưa lưu | Mất vĩnh viễn bản giao rf-05 và nội dung stash |
| `DEC-09` | Không dùng `git fsck --lost-found` nếu nó ghi vào `.git/lost-found`; chỉ dùng ở dạng chỉ đọc | Ghi vào thư mục git của repo là thay đổi ngoài scope | Rác trong repo và một thay đổi Tier 2 không khai được |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Type | Priority |
|---|---|---|---|
| `RQ-01` | Kho log được chụp sang `evidence/` với danh sách tệp cộng dấu tay từng tệp, sau khi đã lọc secret | Process | P0 |
| `RQ-02` | Dòng log do chính round này sinh ra được tách khỏi dòng có trước, và bản giao nêu rõ tiêu chí tách | Process | P0 |
| `RQ-03` | ĐÃ ĐÓNG bởi Tier 1. Bốn câu về cơ chế biến mất KHÔNG trả lời được vì cơ chất đã bị dọn theo `EV-10`, nên nhánh hợp lệ là `RQ-04`. Executor không đo lại | Functional | P0 |
| `RQ-04` | ĐÃ ĐÓNG bởi Tier 1: `evidence/logfreeze-04-finding.txt` ghi KHÔNG XÁC LẬP ĐƯỢC kèm hai lý do độc lập, danh sách nguồn đã tìm và giới hạn của phương pháp. Executor chỉ xác nhận tệp nói đúng những điều đó | Functional | P0 |
| `RQ-05` | Có một script mới kiểm sự hiện diện của path bản giao ở cả cây làm việc và index, phát hiện cả tệp `0` byte | Functional | P0 |
| `RQ-06` | Script mới chạy trên contract rf-05 THẬT mà không báo động oan, và chứng minh nhánh vắng mặt bằng fixture dưới thư mục tạm chứ không bằng một ca vắng mặt sống | Functional | P0 |
| `RQ-07` | Blob `53cc484886ddf4164f0741739af42e75ad913528` vẫn còn kiểu `blob` lúc đóng round | Safety | P0 |
| `RQ-08` | Không tệp nào ngoài `Modules` và thư mục task này bị Tier 2 thay đổi | Scope | P0 |

### 4.2 Scope boundaries

| In scope | Out of scope |
|---|---|
| `.ai-pipeline/scripts/verify-delivery-presence.ps1` là tệp MỚI | Năm tệp gate hiện có của luồng Tier 1 khác |
| `docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/**` | `docs/tasks/hrp-v5-rf-05-tsc-program-boundary/**` |
| Bốn tệp `evidence/logfreeze-01-manifest.txt` tới `evidence/logfreeze-04-finding.txt`: chỉ ĐỌC để xác nhận, Tier 2 không ghi lại | Kho log gốc ngoài repo: chỉ đọc, không sửa, không xoá, và không chạy thêm phép tìm nào lên nó |
| Không có | `tsconfig.json` và mọi tệp cấu hình của repo |
| Không có | Mã ứng dụng dưới `src/`, `app/`, `prisma/` |

### 4.3 Data, State, Permission và Interface Rules

| Rule ID | Rule |
|---|---|
| `R-01` | Tier 2 KHÔNG commit và KHÔNG push. Chỉ `git add` path trong scope; cấm `git add -A` và `git add .` |
| `R-02` | Cấm `git gc`, `git reflog expire`, `git stash drop` và mọi lệnh prune theo `DEC-08` |
| `R-03` | Không copy dòng log chứa giá trị giống connection string, token, password hay secret theo `DEC-03` |
| `R-04` | Gọi script bằng `powershell -NoProfile -File`; cờ hạ execution policy không được phép trong phiên này |
| `R-05` | Thay đổi của luồng khác trong cây làm việc: không reset, không restore, không overwrite, không stage, không commit |
| `R-06` | Không chạm DB, không migration, không seed |
| `R-07` | Hai cổng `verify-task.ps1` và `verify-handoff.ps1` chạy CUỐI CÙNG, sau khi mọi thay đổi đã staged |

## 5. Execution Plan

| STEP ID | Step | Output |
|---|---|---|
| `STEP-01` | Đo blob còn sống bằng `git cat-file -t 53cc484886ddf4164f0741739af42e75ad913528`, và đo tên tệp mã kiểm mới còn trống theo `EV-08`. Ghi mốc thời gian mở round | `evidence/step01-preflight.txt` |
| `STEP-02` | ĐÃ XONG bởi Tier 1 `2026-09-05 08:16`. Executor chỉ mở bản kê rồi xác nhận số path, tổng byte và cột dấu tay; KHÔNG chụp lại kho log | `evidence/logfreeze-01-manifest.txt` |
| `STEP-03` | ĐÃ XONG bởi Tier 1 `2026-09-05 08:26`. Executor chỉ xác nhận lát cắt byte của `DEC-04` được khai trong phần đầu bản trích và khớp bản kê; KHÔNG chạy lại phép tìm | `evidence/logfreeze-02-slices.txt` cộng `evidence/logfreeze-03-index.txt` |
| `STEP-04` | ĐÃ XONG bởi Tier 1 `2026-09-05 08:28`, kết cục KHÔNG XÁC LẬP ĐƯỢC. Executor chỉ xác nhận bản kết luận nêu đủ hai lý do, nguồn đã tìm và giới hạn phương pháp | `evidence/logfreeze-04-finding.txt` |
| `STEP-05` | Viết `.ai-pipeline/scripts/verify-delivery-presence.ps1`: đọc path bản giao từ contract, kiểm cây làm việc và index, báo động cả ca `0` byte | `evidence/step05-detector-src.txt` |
| `STEP-06` | Chạy script mới trên contract rf-05 và trên contract của task này | `evidence/step06-detector-run.txt` |
| `STEP-07` | Đo lại blob còn sống, đo scope, `git add` path trong scope | `evidence/step07-scope.txt` |
| `STEP-08` | Chạy `verify-task.ps1` rồi `verify-handoff.ps1` CUỐI CÙNG | `evidence/step08-gates.txt` |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-07` | Lệnh trả đúng chuỗi `blob` ở cả `STEP-01` và `STEP-07` | `git cat-file -t 53cc484886ddf4164f0741739af42e75ad913528` chạy hai lần | `evidence/step01-preflight.txt` | Yes |
| `AC-02` | `RQ-01` | Bản kê liệt kê đúng `40` path, mỗi path một dòng có cột byte và một dấu tay `40` ký tự hex, và dòng tổng ghi `9832973` byte | `Select-String -Pattern "[0-9a-f]{40}" docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/evidence/logfreeze-01-manifest.txt` cộng `Measure-Object -Line`, rồi `Select-String -Pattern "9832973" docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/evidence/logfreeze-01-manifest.txt` | `evidence/logfreeze-01-manifest.txt` | Yes |
| `AC-03` | `RQ-01` | Trên bốn tệp `logfreeze-*`: `postgres` trả `0`, `npg_` trả `0`, `password` trả `0`, `secret` trả `0`. Chuỗi `token` trả `381` nhưng KHÔNG lần nào ở dạng gán, pattern `token[ ]*[:=][ ]*[^ ]{8,}` trả `0`. Đúng `1` dòng mang nhãn `[REDACTED: NEON_PW]` và bản chỉ mục khai `total lines redacted: 1` | `Select-String` bốn chuỗi trên `docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/evidence/logfreeze-0*.txt`, rồi `Select-String -Pattern "token[ ]*[:=][ ]*[^ ]{8,}"`, `Select-String -Pattern "\[REDACTED: NEON_PW\]"` và `Select-String -Pattern "total lines redacted"` trên cùng bốn tệp | `evidence/ac03-secret-scan.txt` | Yes |
| `AC-04` | `RQ-02` | Tiêu chí tách là LÁT CẮT BYTE theo `DEC-04`, không phải mốc thời gian: chuỗi `byte cut` trả `5` trên bản trích và cả `5` đều là tiêu đề tệp, tiêu đề của `20260904T184723` window `4` ghi `byte cut 2082393` trùng cột byte của chính path ấy trong bản kê, phép khớp `No\s+timestamp\s+parsing` trên TOÀN VĂN đọc `-Raw` trả `True` (cụm từ bị ngắt dòng nên phép đo phải chịu được xuống dòng, xem `PLN-55`), và bản kết luận nêu giới hạn của lát cắt theo `DEC-10` với chuỗi `limit of the method` trả `1` | `Select-String -Pattern "byte cut"` trên `docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/evidence/logfreeze-02-slices.txt`, và `(Get-Content -Raw docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/evidence/logfreeze-02-slices.txt) -match "No\s+timestamp\s+parsing"` trả `True`, `Select-String -Pattern "2082393"` trên `docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/evidence/logfreeze-01-manifest.txt`, rồi `Select-String -Pattern "limit of the method"` trên `docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/evidence/logfreeze-04-finding.txt` | `evidence/logfreeze-02-slices.txt` cộng `evidence/logfreeze-01-manifest.txt` | Yes |
| `AC-05` | `RQ-03` | Bản kết luận chứa chuỗi `ANSWER: NO` cộng `KHONG XAC LAP DUOC` và nêu HAI lý do độc lập, mỗi lý do có số đo: lý do một mang `9,832,973` cùng `28,634,384` (bản kết luận viết số có dấu phẩy nghìn, xem `PLN-56`), lý do hai mang bốn số `0` cho `deleteFile`, `willDelete`, `didDelete` và `renameFile`. Bốn số `0` ấy tái lập được vì bốn từ khoá đó KHÔNG xuất hiện trong bản trích. AC PASS trên nhánh này và KHÔNG đòi một cơ chế | `Select-String` các chuỗi (số dùng dạng có dấu phẩy `9,832,973` và `28,634,384`) trên `docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/evidence/logfreeze-04-finding.txt`, rồi `Select-String` bốn từ khoá trên `docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/evidence/logfreeze-02-slices.txt` | `evidence/logfreeze-04-finding.txt` | Yes |
| `AC-06` | `RQ-04` | Bản kết luận liệt kê nguồn đã tìm và giới hạn của từng nguồn: có mục `FILES IN THIS SNAPSHOT` kê đủ bốn tệp, có mục nói về giới hạn của phương pháp, và có câu cấm phái executor đi tìm cơ chế trong kho này. AC PASS ở cả hai kết cục, miễn là ghi đúng dạng | `Select-String -Pattern "FILES IN THIS SNAPSHOT"`, `Select-String -Pattern "limit of the method"` và `Select-String -Pattern "must not be sent"` trên `docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/evidence/logfreeze-04-finding.txt` | `evidence/logfreeze-04-finding.txt` | Yes |
| `AC-07` | `RQ-05` | Script mới tồn tại, chạy với exit code `0` trên một contract mà mọi path bản giao đều đủ, và exit code khác `0` trên một contract fixture dưới thư mục tạm khai một path bản giao không tồn tại ở đâu cả | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-delivery-presence.ps1 -TaskPath docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/TASK.md` rồi cùng lệnh với đường dẫn contract fixture dưới thư mục tạm | `evidence/step06-detector-run.txt` | Yes |
| `AC-08` | `RQ-06` | Bản in phân biệt được BA trạng thái và chứng minh bằng ba dòng in ra. Một: chạy trên contract rf-05 THẬT thì `tsconfig.json` đọc là ĐỦ ở cả hai nơi và exit code là `0`, tức không báo động oan sau khi bản giao trở lại theo `EV-13`. Hai: một path không tồn tại ở đâu cả đọc là vắng ở CẢ hai nơi. Ba: một path có trong cây làm việc nhưng chưa vào index đọc là vắng Ở INDEX, và nhãn của ca ba KHÁC nhãn của ca hai theo mặt chữ | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-delivery-presence.ps1 -TaskPath docs/tasks/hrp-v5-rf-05-tsc-program-boundary/TASK.md` cho ca một, rồi cùng lệnh trên contract fixture dưới thư mục tạm cho ca hai và ca ba | `evidence/ac08-three-states.txt` | Yes |
| `AC-09` | `RQ-05` | Script mới báo động cho một tệp tracked dài `0` byte. Chứng minh bằng một fixture dưới thư mục tạm, KHÔNG bằng cách tạo tệp rỗng trong repo | Dựng fixture dưới thư mục tạm bằng `mkdir` cộng một tệp dài `0` byte, rồi `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-delivery-presence.ps1 -TaskPath` cộng đường dẫn contract fixture đó | `evidence/ac09-zero-byte.txt` | Yes |
| `AC-10` | `RQ-08` | Hợp của `git status --porcelain` và `git diff --cached --name-only` do Tier 2 gây ra chỉ gồm tệp script mới và path dưới `docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/**`. Path của luồng khác và của Tier 1 không tính vào AC này | `git status --porcelain` và `git diff --cached --name-only` | `evidence/step07-scope.txt` | Yes |
| `AC-11` | `RQ-08` | Cổng contract và cổng bàn giao chạy CUỐI CÙNG đều ra `RESULT: PASS` với exit `0` | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/TASK.md` rồi `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/TASK.md` | `evidence/step08-gates.txt` | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-02` | `AC-02` |
| `RQ-02` | `STEP-03` | `AC-04` |
| `RQ-03` | `STEP-04` | `AC-05` |
| `RQ-04` | `STEP-04` | `AC-06` |
| `RQ-05` | `STEP-05` | `AC-07` |
| `RQ-06` | `STEP-06` | `AC-08` |
| `RQ-07` | `STEP-01` | `AC-01` |
| `RQ-08` | `STEP-07` | `AC-10` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Blob `53cc484` bị prune trong lúc điều tra và bản giao rf-05 mất vĩnh viễn | Một lệnh gc hoặc reflog expire chạy | `R-02` cấm tuyệt đối, `AC-01` đo hai lần | Không có đường về. Đó là lý do AC đo cả trước và sau |
| `RISK-02` | Kho log tự nhiễm nên kết luận dựa trên dấu vết của chính người điều tra | Từ khoá tìm kiếm xuất hiện trong log sau khi bắt đầu tìm | `DEC-02` chụp trước rồi tìm trên bản chụp, `DEC-04` tách theo mốc thời gian | Chụp lại từ đầu, ghi rõ lần chụp nào là lần dùng để kết luận |
| `RISK-03` | Secret trong log gốc rơi vào repo qua bản chụp | `AC-03` thấy giá trị giống secret | `DEC-03` lọc trước khi copy, `AC-03` đo sau khi copy | Xoá tệp chụp đó khỏi cây và khỏi index rồi chụp lại bằng bộ lọc chặt hơn |
| `RISK-04` | Ép ra một kết luận không có bằng chứng vì cảm giác phải kết luận | `AC-05` có câu trả lời mà không dẫn được tệp cộng số dòng | `DEC-01` cho phép KHÔNG XÁC LẬP ĐƯỢC, `AC-06` bảo hộ kết cục đó | Bác bàn giao, mở execution round mới với yêu cầu hạ kết luận thành giả thuyết |
| `RISK-05` | Tên tệp script mới xung đột với luồng Tier 1 khác | `EV-08` thấy tên đã bị chiếm | `DEC-06` có tên dự phòng | Đổi tên theo `DEC-06` rồi khai trong HANDOFF |
| `RISK-06` | ĐÃ XẢY RA, không còn là rủi ro mà là dữ kiện. Kho log bị VS Code dọn và khoảng thời gian cần điều tra không còn | `EV-10`: `9832973` byte còn lại so với `28634384` byte đo hôm trước, phiên `20260903T174307` còn tên mà `0` tệp | Không mitigate được. Đã chụp phần còn sống ở `EV-09` để cố định những gì còn đo được | Đã ghi giới hạn theo `RQ-04`, kết luận KHÔNG XÁC LẬP ĐƯỢC ở `evidence/logfreeze-04-finding.txt` |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | Sau khi có script mới, nên nối nó vào `verify-pipeline.ps1` ở round nào, và ai nối, xét việc bộ gate đang thuộc luồng Tier 1 khác? | Tier 1 | Sau khi bộ gate vào `HEAD` | No |
| `Q-02` | ĐÃ TRẢ LỜI `2026-09-05 08:28`, theo nhánh phủ định: cơ chế KHÔNG xác lập được từ kho log, nên không có căn cứ nào để đổi luật vận hành ở round này. Luật `git add` ngay cho `AUDIT.md` giữ nguyên, và thay thế cho một luật dựa trên suy đoán là mã kiểm ở `RQ-05` | Tier 1 | Đã đóng | No |

## 9. Planner Resolution

Tier 1 append quyết định sau audit; không sửa lịch sử finding.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| `1` | `AUD-001` (`AC-04`) | `ACCEPT_FIX` (`PLN-55`) | Phép đo cũ `Select-String "No timestamp parsing"` trả `0` vì cụm từ bị ngắt qua dòng 4-5 trong artifact `logfreeze-02` của CHÍNH Tier 1. Tôi tự đọc `-Raw` và khớp `No\s+timestamp\s+parsing` ra `1`. Nội dung ĐÚNG, chỉ mặt chữ phép đo hỏng; Tier 2 đã tự khai `LIM-01` thay vì lặng lẽ PASS | `AC-04` đổi sang khớp regex trên `-Raw`; bump `v1.3` | Đóng ở `v1.3`. KHÔNG mở execution round: sửa artifact của Tier 1 là việc Iron Rule cấm Tier 2 |
| `1` | `AUD-002` (`AC-05`) | `ACCEPT_FIX` (`PLN-56`) | `9832973` và `28634384` trả `0` vì bản kết luận viết `9,832,973` và `28,634,384` có dấu phẩy nghìn; cả hai dạng có phẩy tôi tự chạy đều trả `1`. Nội dung ĐÚNG, mặt chữ phép đo hỏng; Tier 2 khai `LIM-02` | `AC-05` ngưỡng dùng dạng số có dấu phẩy; bump `v1.3` | Đóng ở `v1.3`. KHÔNG mở execution round |
| `1` | `AUD-003` | `DEFER` (`PLN-57`) | Tôi tự đo lại: `grep -c verify-delivery-presence` trên `verify-pipeline.ps1` bằng `0` và trên `verify-gates.selftest.ps1` cũng `0`; tệp detector có thật, `332` dòng. Là chủ ý `DEC-07` nên KHÔNG hạ AC, nhưng một hàng rào không ai gọi và không selftest thì bằng không có — đúng loại điểm mù đã SINH ra chính task này | Không đổi contract round này | Owner: luồng gate Tier 1. Trigger: task MỚI nối `verify-delivery-presence` vào `verify-pipeline.ps1` cộng một ca `verify-gates.selftest.ps1`. Hậu quả nếu bỏ: bộ máy bắt delivery-vanish tự nó không chạy |
| `1` | `AUD-004` | `DEFER` (`PLN-58`) | Tôi tự đo: `git diff --cached --name-only` cho `321` path; `5` path có kích thước index `0` byte và cả `5` nằm dưới `evidence/` của rf-05. `D-03` chỉ soi path bản giao ĐÃ KHAI nên không thấy chúng — ĐÚNG theo contract, không hạ `AC-09` | Không đổi contract round này | Owner: luồng gate Tier 1. Trigger: task riêng mở `D-03` sang toàn tập path staged của task đang audit. KHÔNG nhét vào round này |
| `1` | Tier 1 tự phát hiện | `DEFER` (`PLN-59`) | Cổng xanh round này KHÔNG tái lập từ HEAD: `verify-audit.ps1` worktree `e1edaeba` cộng `gate-lib.ps1` `6daa689a` cho PASS, nhưng bản ĐÃ PHÁT HÀNH ở HEAD `b5390297` cho FAIL `21` lỗi trên chính `AUDIT.md` `5` cột đúng template `502b7e54` này (bản HEAD CŨ hơn template). `verify-audit.ps1` là bản giao của gate-01, `gate-lib.ps1` của gate-02; CẢ HAI chưa có `AUDIT.md` | Không đổi contract | COMMIT BỊ CHẶN: commit bộ gate để tái lập gate-PASS sẽ ship code CHƯA AUDIT của gate-01 cộng gate-02. Owner: luồng gate Tier 1 cộng Tier 3. Trigger: gate-01 và gate-02 audit rồi resolve ACCEPTED, rồi commit CẢ suite một lượt |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-09-04` | Contract đầu tiên: điều tra kho log VS Code trên bản chụp đã lọc secret, cho phép kết cục KHÔNG XÁC LẬP ĐƯỢC, và giao một script mới kiểm sự hiện diện của path bản giao | Nợ `PLN-47` từ resolution round 1 của `hrp-v5-rf-06-vitest-default-lane-safety` |
| `v1.1` | `2026-09-05` | Tier 1 tự đo theo lệnh sếp rồi hạ contract về đúng phép đo: `EV-02` tới `EV-05` HẾT HIỆU LỰC vì kho log đã bị dọn, `EV-06` lên mức đã lượng hoá, thêm `EV-09` tới `EV-11` và `DEC-10`, `DEC-04` đổi từ mốc thời gian sang LÁT CẮT BYTE, `RQ-03` cùng `RQ-04` đóng theo nhánh KHÔNG XÁC LẬP ĐƯỢC, `STEP-02` tới `STEP-04` chuyển sang xác nhận thay vì điều tra, `AC-02` tới `AC-06` viết lại theo bốn tệp `logfreeze-*` với số đo đã tự chạy lại, thêm `EV-12` cho phép quét secret, `RISK-06` thành dữ kiện, `Q-02` đóng | Phép đo `2026-09-05 08:16` tới `08:28` ở `evidence/logfreeze-01-manifest.txt` tới `evidence/logfreeze-04-finding.txt` |
| `v1.2` | `2026-09-05` | Bản giao `tsconfig.json` của rf-05 đã trở lại nên tiền đề vắng mặt CHẾT: thêm `EV-13`, `RQ-06` chuyển từ ca vắng mặt sống sang fixture, `AC-07` nêu rõ nhánh vắng là fixture tạm, `AC-08` viết lại thành ba trạng thái với ca rf-05 giờ là ca KHÔNG báo động oan, `DEC-05` đổi lý lẽ sang nhánh index | Đo `2026-09-05`: `git hash-object tsconfig.json` trả `53cc484886ddf4164f0741739af42e75ad913528` và `git diff --cached --numstat` trả `12 2`, tức `BLK-02` đã đóng trước khi round mở |
| `v1.3` | 2026-09-05 | Sửa phép đo HAI AC — `AC-04` sang khớp `No\s+timestamp\s+parsing` trên `-Raw`, `AC-05` sang số có dấu phẩy `9,832,973` và `28,634,384` — vì phép đo cũ trả `0` do artifact của CHÍNH Tier 1 ngắt dòng và viết số có phẩy. KHÔNG đổi một yêu cầu, một bước hay một deliverable nào | Audit round `1` `CONDITIONAL`: `9/11` PASS, `AC-04` cộng `AC-05` PARTIAL do defect LỜI VĂN của Tier 1. Xem `PLN-55` tới `PLN-59` |
