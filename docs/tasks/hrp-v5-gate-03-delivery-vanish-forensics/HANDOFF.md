# HANDOFF — hrp-v5-gate-03-delivery-vanish-forensics

## 0. Control

| Field | Value |
| --- | --- |
| Task slug | `hrp-v5-gate-03-delivery-vanish-forensics` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.2` |
| Execution round | `1` |
| Current audit round | `0` |
| Executor | `Tier 2 — Engineer` |
| Baseline | `HEAD 31625c4`, cộng bốn tệp `evidence/logfreeze-01-manifest.txt` tới `evidence/logfreeze-04-finding.txt` do Tier 1 chụp. Đo lại dấu tay cả bốn ở `evidence/step07-scope.txt` phần C bằng `git hash-object` và `git rev-parse :path`: cả bốn cặp BẰNG NHAU, tức bốn tệp ấy còn nguyên byte |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-09-05 13:50 → 14:35 (Asia/Bangkok, giờ host)` |

Vòng này chạy đúng spec **`v1.2`** của `TASK.md`, không phải một bản đọc trước đó. Tôi đọc lại `TASK.md` ngay trước khi mở round, và đọc lại `§5` cùng `§6` một lần nữa trước khi viết bản này.

## 1. Outcome Summary

Có một mã kiểm mới, `.ai-pipeline/scripts/verify-delivery-presence.ps1`, đọc mục `Deliverables` hoặc `Output` của một contract rồi báo động khi một path bản giao vắng ở cây làm việc, vắng ở index, vắng ở cả hai, hoặc còn `0` byte. Bốn nhãn phân biệt được theo mặt chữ: `PRESENT`, `MISSING_WORKTREE`, `MISSING_INDEX`, `MISSING_BOTH`, cộng nhãn `EMPTY` của mã `D-03`.

Cả bốn nhánh được đo THẬT, không nhánh nào bằng lời văn. Ca quan trọng nhất là ca `rf-05`: chạy detector trên chính `TASK.md` của `hrp-v5-rf-05-tsc-program-boundary` ra `[OK] D-02 tsconfig.json PRESENT in worktree AND index (worktree 1108 B, index 1052 B)` với exit `0`. Con số `1052` của detector BẰNG `git cat-file -s 53cc484886ddf4164f0741739af42e75ad913528`, tức detector đọc đúng blob mà `EV-13` ghim, không phải một bản copy nào khác. Báo VẮNG ở ca này sẽ là detector sai; nó không báo vắng.

Ba ca báo động còn lại được dựng bằng một repo git ĐỘC LẬP dưới thư mục tạm, nên không byte nào của repo thật bị đổi để lấy bằng chứng. `AC-09` đòi đúng điều đó và tôi đo lại bằng hai lệnh `find … -size 0` trên repo thật, cả hai trả `0`.

Nửa điều tra của contract đã đóng trước khi round mở, kết cục `KHONG XAC LAP DUOC`. Tôi XÁC NHẬN bốn tệp của Tier 1 bằng chính dụng cụ mà `AC-02` tới `AC-06` chỉ định, và KHÔNG mở lại kho log VS Code. Hai chỗ số đo lệch so với con số contract viết, cả hai là lệch của DỤNG CỤ so với cách viết của tệp, không phải lệch của sự thật được khẳng định; khai ở `LIM-01` và `LIM-02` kèm phép đo tương đương.

Tôi KHÔNG commit, KHÔNG push, KHÔNG merge (`R-01`). Tôi KHÔNG chạm một path nào của `rf-05` ngoài việc ĐỌC `TASK.md` của nó, và dấu tay `362195b96737f81f676a81fa68e72233c6621c13` giống nhau ở đầu vòng và cuối vòng.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
| --- | --- | --- | --- | --- |
| `STEP-01` | `RQ-07` | `evidence/step01-preflight.txt` | `git cat-file -t 53cc484…` trả `blob`, `-s` trả `1052`; tên tệp mã kiểm mới còn trống, đo bằng ba lệnh thay thế đều trả `0` dòng | `LIM-04` |
| `STEP-02` | `RQ-01` | `evidence/logfreeze-01-manifest.txt`, xác nhận ở `evidence/ac02-ac06-confirm.txt` phần A | `40` dấu tay hex, `Measure-Object -Line` trả `52`, dòng tổng `9832973` ở dòng `54` | `DEV-03`, `LIM-03` |
| `STEP-03` | `RQ-02` | `evidence/logfreeze-02-slices.txt`, `evidence/logfreeze-03-index.txt`, xác nhận ở `evidence/ac02-ac06-confirm.txt` phần B | `byte cut` trả `5`, cả năm là tiêu đề tệp; `2082393` khớp cột byte của chính path ấy trong bản kê | `DEV-03`, `LIM-01` |
| `STEP-04` | `RQ-03`, `RQ-04` | `evidence/logfreeze-04-finding.txt`, xác nhận ở `evidence/ac02-ac06-confirm.txt` phần C và D | `ANSWER: NO` trả `1`, `KHONG XAC LAP DUOC` trả `2`, bốn từ khoá xoá/đổi tên đều trả `0`; ba mục của `AC-06` đều trả `1` | `DEV-03`, `LIM-02` |
| `STEP-05` | `RQ-05` | `.ai-pipeline/scripts/verify-delivery-presence.ps1`, `evidence/step05-detector-src.txt` | `332` dòng, `13916` byte, `0` lỗi parse, `0` CR, mười hàm, ba mã kiểm `D-01` tới `D-03` | `DEV-01`, `DEV-02` |
| `STEP-06` | `RQ-06` | `evidence/step06-detector-run.txt`, `evidence/ac08-three-states.txt`, `evidence/ac09-zero-byte.txt` | contract của task này exit `0`; contract `rf-05` exit `0` báo ĐỦ; fixture exit `2` với ba nhãn khác nhau | `LIM-05` |
| `STEP-07` | `RQ-08` | `evidence/step07-scope.txt` | `git cat-file -t` lần hai trả `blob`; phạm vi đúng `13` path; `0` path có worktree lệch index | `LIM-06` |
| `STEP-08` | `RQ-08` | `evidence/step08-gates.txt` | `verify-task.ps1` `RESULT: PASS` exit `0`, rồi `verify-handoff.ps1` `RESULT: PASS` exit `0` | `LIM-07` |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
| --- | --- | --- | --- | --- |
| — | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/TASK.md` | `RESULT: PASS`, exit `0`, 0 warning | `evidence/step08-gates.txt` | `None` |
| `AC-01` | `git cat-file -t 53cc484886ddf4164f0741739af42e75ad913528` chạy hai lần, một ở `STEP-01` và một ở `STEP-07`, cộng `git cat-file -s` cùng SHA | exit `0` cả hai lần; cả hai trả đúng chuỗi `blob`; `-s` trả `1052` ở cả hai lần | `evidence/step01-preflight.txt` phần A, `evidence/step07-scope.txt` phần A | `None` |
| `AC-02` | `Select-String -Pattern "[0-9a-f]{40}"` trên `evidence/logfreeze-01-manifest.txt`, cộng `Get-Content` dẫn sang `Measure-Object -Line` trên cùng tệp, rồi `Select-String -Pattern "9832973"` trên cùng tệp | exit `0`; `40` dòng dấu tay; `Measure-Object -Line` trả `52`; `9832973` trả `1` ở dòng `54` | `evidence/ac02-ac06-confirm.txt` phần A | `Measure-Object -Line` trả `52` chứ không phải `54` vì nó đếm dòng CÓ CHỮ; xem `LIM-03` |
| `AC-03` | `Select-String` bốn chuỗi `postgres`, `npg_`, `password`, `secret` trên `evidence/logfreeze-0*.txt`, rồi `Select-String -Pattern "token[ ]*[:=][ ]*[^ ]{8,}"`, rồi hai lần `Select-String` cho nhãn đã che và cho `total lines redacted` | exit `0`; bốn chuỗi trả `0`, `0`, `0`, `0`; chuỗi `token` trả `381` nhưng dạng gán trả `0`; nhãn đã che trả `1`; `total lines redacted` trả `1` | `evidence/ac03-secret-scan.txt` | `None` |
| `AC-04` | `Select-String -Pattern "byte cut"` và `Select-String -Pattern "No timestamp parsing"` trên `evidence/logfreeze-02-slices.txt`, `Select-String -Pattern "2082393"` trên `evidence/logfreeze-01-manifest.txt`, rồi `Select-String -Pattern "limit of the method"` trên `evidence/logfreeze-04-finding.txt` | exit `0`; `byte cut` trả `5` và cả `5` đều là dòng tiêu đề `=====`; `2082393` trả `1` ở dòng `35`; `limit of the method` trả `1`; `No timestamp parsing` trả `0` | `evidence/ac02-ac06-confirm.txt` phần B | Con số `0` của `No timestamp parsing` là giới hạn của `Select-String`, cụm từ bị ngắt dòng; regex toàn văn trả `1`; xem `LIM-01` |
| `AC-05` | `Select-String` các chuỗi `ANSWER: NO`, `KHONG XAC LAP DUOC`, `9832973`, `28634384` trên `evidence/logfreeze-04-finding.txt`, rồi `Select-String` bốn từ khoá `deleteFile`, `willDelete`, `didDelete`, `renameFile` trên `evidence/logfreeze-02-slices.txt` | exit `0`; `ANSWER: NO` trả `1`; `KHONG XAC LAP DUOC` trả `2`; bốn từ khoá trả `0`, `0`, `0`, `0`; hai trị đo trả `0` và `0` | `evidence/ac02-ac06-confirm.txt` phần C | Hai trị đo được viết có dấu phẩy nghìn nên bản không-dấu-phẩy trả `0`; dạng có dấu phẩy trả `1` và `1`; xem `LIM-02` |
| `AC-06` | `Select-String -Pattern "FILES IN THIS SNAPSHOT"`, `Select-String -Pattern "limit of the method"` và `Select-String -Pattern "must not be sent"` trên `evidence/logfreeze-04-finding.txt`, cộng `Select-String -Pattern "logfreeze-0"` để đếm bốn tệp được kê | exit `0`; ba chuỗi trả `1`, `1`, `1`; `logfreeze-0` trả `7`, trong đó bốn dòng `73` tới `76` kê đủ bốn tệp | `evidence/ac02-ac06-confirm.txt` phần D | `None` |
| `AC-07` | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-delivery-presence.ps1 -TaskPath docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/TASK.md` rồi cùng lệnh với đường dẫn contract fixture dưới thư mục tạm | exit `0` trên contract của task này, `RESULT: PASS`; exit `2` trên contract fixture, `RESULT: FAIL (2 error(s))` | `evidence/step06-detector-run.txt` phần A và C | `None` |
| `AC-08` | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-delivery-presence.ps1 -TaskPath docs/tasks/hrp-v5-rf-05-tsc-program-boundary/TASK.md` cho ca một, rồi cùng lệnh trên contract fixture cho ca hai và ca ba, cộng `git cat-file -s 53cc484886ddf4164f0741739af42e75ad913528` để đối chiếu số của detector | exit `0` ca một, in `D-02 tsconfig.json PRESENT in worktree AND index (worktree 1108 B, index 1052 B)`; exit `2` ca hai in `MISSING_BOTH`, ca ba in `MISSING_INDEX`; hai nhãn dài `12` và `13` ký tự, so bằng nhau trả `False` | `evidence/ac08-three-states.txt` | Ca ba lần đầu đo trên một path THẬT của repo trước khi `git add`; sau khi staged thì lần chạy ấy không tái lập được, nên ca ba được đo LẠI trên fixture; xem `LIM-05` |
| `AC-09` | `mkdir` cộng một tệp dài `0` byte trong một repo git độc lập dưới thư mục tạm, `git add` tệp ấy trong repo tạm, rồi `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-delivery-presence.ps1 -TaskPath` cộng đường dẫn contract fixture; cộng hai lệnh `find … -size 0` trên repo thật | exit `2`; in `D-03 zero-byte-deliverable.ts is EMPTY (0 B on disk, 0 B in index)`; hai lệnh `find` trên repo thật trả `0` và `0` | `evidence/ac09-zero-byte.txt` | `None` |
| `AC-10` | `git status --porcelain` và `git diff --cached --name-only`, lọc bằng một biểu thức, cộng `git hash-object` để quy thuộc từng path `.ai-pipeline` | exit `0`; hợp hai lệnh do vòng này gây ra là `13` path, gồm `1` tệp script mới cộng `12` path dưới `docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/**`; `0` path có cột thứ hai là `M` | `evidence/step07-scope.txt` phần B, D và E | Ảnh chụp một thời điểm; sau đó còn ba lần `git add` trong phạm vi cho phép; xem `LIM-06` |
| `AC-11` | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/TASK.md` rồi `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/TASK.md`, chạy CUỐI CÙNG | `RESULT: PASS` exit `0` và `RESULT: PASS` exit `0` | `evidence/step08-gates.txt` | `None` |

## 4. Changed Deliverables

- **Source/artifact changed:** `.ai-pipeline/scripts/verify-delivery-presence.ps1` — tệp MỚI, `332` dòng, `13916` byte, UTF-8 có BOM, `0` CR, `0` lỗi parse; blob cuối `aaab5c2c63a641eee2bcf7ce3f692dd304d7da68`, và `git rev-parse` trên path ấy trong index trả ĐÚNG SHA đó, tức bản trên đĩa và bản staged là cùng byte; `git diff --cached --numstat` = `332 0`. Cộng `docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/HANDOFF.md` và tám tệp mới dưới `evidence/`. Bốn tệp `logfreeze-*` của Tier 1 KHÔNG bị sửa, chứng minh bằng bốn cặp dấu tay bằng nhau ở `evidence/step07-scope.txt` phần C.
- **Dependency:** `None`. Script mới không dot-source tệp nào, đo bằng `grep -n '^\s*\.\s'` trả `0` dòng; xem `DEV-01`.
- **Schema/migration:** `None`. Không kết nối DB, không đọc `.env`, không in giá trị biến môi trường nào (`R-03`, `R-06`).
- **Environment/config:** `None`. `verify-pipeline.ps1` KHÔNG được mắc thêm mã kiểm mới, theo `DEC-07`; đo bằng `grep -c 'verify-delivery-presence' .ai-pipeline/scripts/verify-pipeline.ps1` trả `0`. Con số `numstat` `12 2` của tệp ấy là của luồng Tier 1 khác, nằm trong blob `1348bffe` khớp mốc `EV-06`.
- **Git diff/commit:** `Not created`. `R-01`: Tier 2 không commit, không push, không merge. Trạng thái giao là index cộng worktree, đo ở `evidence/step07-scope.txt`.

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `DEV-01` | `Deviation` | Mã kiểm mới TỰ CHỨA, không dot-source `gate-lib.ps1`, trong khi năm tệp gate còn lại đều dot-source nó. Ba lý do độc lập, ghi ở `evidence/step05-detector-src.txt` phần C: một, `Get-RepoRoot` của thư viện suy ra gốc repo bằng `Split-Path` hai lần từ `$PSScriptRoot`, đúng cho `<repo>/.ai-pipeline/scripts` nhưng SAI cho một repo fixture dưới thư mục tạm, mà `AC-07` tới `AC-09` bắt buộc chạy trên fixture; hai, `gate-lib.ps1` đang là `A ` trong index của một luồng khác nên nó còn dịch, và một mã kiểm phụ thuộc tệp đang dịch thì phép đo hôm nay không tái lập được ngày mai; ba, `DEC-07` đã cấm mắc vào `verify-pipeline.ps1`, tức mã kiểm này được thiết kế để chạy độc lập | Không tệp gate nào bị sửa, nên `RISK` va chạm với luồng khác bằng `0`. Giá phải trả là mười hàm ngắn viết lại trong tệp, `152` trong `332` dòng | Tier 1 quyết sau này có gộp mã kiểm này vào thư viện chung hay không. Nếu gộp thì phải sửa `Get-RepoRoot` trước |
| `DEV-02` | `Deviation` | Script nhận thêm hai tham số mà contract không nêu: `-RepoRoot`, mặc định suy ra từ `$PSScriptRoot`, và `-IncludeStepOutputs`, mặc định TẮT. Khai ở `evidence/step05-detector-src.txt` phần D | `-RepoRoot` là cách duy nhất chạy được ba ca báo động mà KHÔNG đổi một byte nào của repo thật, tức là cách duy nhất thoả `AC-09`. `-IncludeStepOutputs` tắt mặc định nên hành vi của lệnh mà `AC-07` ghi không đổi | Không cần |
| `DEV-03` | `Deviation` | `STEP-02` tới `STEP-04` ghi Output là bốn tệp `logfreeze-*` của Tier 1. Tôi KHÔNG ghi vào bốn tệp ấy; tôi thêm MỘT tệp mới `evidence/ac02-ac06-confirm.txt` để đặt phép đo xác nhận | Cộng thêm, không thay thế. Bốn tệp gốc còn nguyên byte, chứng minh bằng dấu tay ở `evidence/step07-scope.txt` phần C. Bốn path evidence mà contract đòi vẫn còn đúng chỗ | Không cần. Nếu Tier 1 muốn phép đo nằm trong chính bốn tệp ấy thì phải nói rõ, vì việc đó ghi lên bản chụp của Tier 1 |
| `LIM-01` | `Limitation` | `AC-04` chỉ định `Select-String -Pattern "No timestamp parsing"` trên bản trích, và đòi trả `1`. Lệnh ấy trả `0`. Nguyên nhân đã đo: cụm từ bị NGẮT DÒNG giữa dòng `4` và dòng `5` của bản trích (`… cannot appear below. No timestamp` rồi `parsing is used anywhere - byte …`), và `Select-String` là dụng cụ theo DÒNG nên không thấy cụm bắc qua dấu xuống dòng | Phép đo bù trên CÙNG tệp: regex `No timestamp\s+parsing` đọc toàn văn trả `1`. Trên `logfreeze-04-finding.txt` cụm ấy liền mạch và `Select-String` trả `1`. Nên mệnh đề nội dung của `AC-04` được thoả; con số `0` là giới hạn của dụng cụ. Cả hai số nằm ở `evidence/ac02-ac06-confirm.txt` phần B | Tier 1 chọn: nhận phép đo bù, hoặc bump spec để `AC-04` chỉ định dụng cụ đọc toàn văn. Tôi không sửa `AC-04` và không sửa tệp của Tier 1 |
| `LIM-02` | `Limitation` | `AC-05` đòi bản kết luận mang `9832973` và `28634384`. `Select-String` hai chuỗi ấy trả `0` và `0`, vì bản kết luận viết chúng có DẤU PHẨY nghìn | `Select-String` dạng có dấu phẩy trả `1` và `1`. Bản không-dấu-phẩy của `9832973` có thật ở `logfreeze-01-manifest.txt` dòng `54`, tức hai tệp khớp nhau về TRỊ ĐO. Số liệu ở `evidence/ac02-ac06-confirm.txt` phần C | Tier 1 chọn cách đọc, giống `LIM-01`. Tôi không sửa `AC-05` và không sửa tệp của Tier 1 |
| `LIM-03` | `Limitation` | `AC-02` chỉ định `Measure-Object -Line` và ngầm hiểu con số ấy là số dòng của tệp. Nó trả `52`, còn tệp dài `54` dòng | Đo bằng Python đọc `'rb'`: tổng dòng `54`, dòng trống `2`, dòng có chữ `52`. `Measure-Object -Line` đếm dòng CÓ CHỮ. Ba con số `40`, `52`, `54` đếm ba thứ khác nhau và không xung đột; ai đọc `52` rồi kết luận "không phải `40` path" là đếm sai cột | Không cần. Ghi ở đây để Tier 3 không mất một vòng cho con số này |
| `LIM-04` | `Limitation` | `EV-08` định nghĩa "tên tệp còn trống" bằng hai nửa: `git ls-files` rỗng VÀ tệp không có trên đĩa. Nửa thứ hai KHÔNG thể sống qua `STEP-05`, vì `STEP-05` bắt tôi tạo đúng tệp ấy | Nửa thứ nhất được đo bằng ba lệnh thay thế, cả ba tái lập được sau này: `git ls-tree HEAD`, `git ls-tree 31625c4` và `git log --all` trên path ấy, cả ba trả `0` dòng. Cộng phép đo tên dự phòng `verify-delivery-inventory.ps1` của `DEC-06` cũng còn trống. Số liệu ở `evidence/step01-preflight.txt` phần B | Không cần. `RISK-05` không kích hoạt và tên dự phòng của `DEC-06` KHÔNG cần dùng |
| `LIM-05` | `Limitation` | `AC-08` ca ba (path có trên đĩa, chưa vào index) lần đầu được đo trên một path THẬT của repo, là `evidence/step05-detector-src.txt` khi nó còn `??`. Sau `git add` của `STEP-07` thì lần chạy ấy không tái lập được nữa | Ca ba được đo LẠI trên fixture dưới thư mục tạm, bằng ĐÚNG chuỗi ký tự lệnh mà `AC-07` ghi, không thêm tham số nào; cả `MISSING_BOTH` và `MISSING_INDEX` xuất hiện trong cùng một lần chạy exit `2`. Bản ghi lần chạy không-tái-lập-được vẫn giữ ở `evidence/step06-detector-run.txt` phần E, để Tier 3 thấy tôi không xoá dấu vết | Không cần. Nếu Tier 3 muốn tự dựng lại ca ba thì fixture nằm ở `evidence/ac08-three-states.txt` phần C, dựng bằng ba lệnh |
| `LIM-06` | `Limitation` | `evidence/step07-scope.txt` là ảnh chụp một thời điểm. Sau khi ghi nó còn đúng BA path được `git add` thêm: chính nó, `evidence/step08-gates.txt` và `HANDOFF.md` | Cả ba đều dưới `docs/tasks/hrp-v5-gate-03-delivery-vanish-forensics/**`, tức trong vùng `AC-10` cho phép. Khác `gate-01`: ở đó `git add` một tệp gate kéo theo `568 95` dòng của luồng khác vào index; ở đây tệp script là tệp MỚI nên `numstat` `332 0` không kéo theo dòng nào của ai | Không cần |
| `LIM-07` | `Limitation` | Nội dung của `evidence/step08-gates.txt` được ghi SAU khi hai cổng chạy: không thể vừa chạy cổng vừa ghi kết quả của nó vào tệp mà cổng đã đọc | Vết để kiểm: không mã kiểm nào ĐỌC nội dung tệp evidence. `H-07b` chỉ kiểm SỰ TỒN TẠI của mỗi đường dẫn `evidence/*` được nhắc trong `HANDOFF`, và tệp ấy đã tồn tại cộng đã staged TRƯỚC hai lần chạy. Sau khi ghi còn đúng một lần `git add` cho chính nó. Ai muốn đo lại chỉ cần chạy lại đúng hai chuỗi ký tự lệnh ở `AC-11` | Không cần |
| `LIM-08` | `Limitation` | Detector kiểm `0` byte ở CẢ hai phía, nhưng KHÔNG so hai con số byte với nhau. Lý do: `core.autocrlf` đang bật, nên một tệp có CR có kích thước khác nhau ở hai phía — `tsconfig.json` là `1108` trên đĩa và `1052` trong index, đúng `56` byte lệch bằng `56` dòng CRLF | Nếu detector đòi hai số BẰNG NHAU thì nó sẽ báo động oan cho mọi tệp CRLF trong repo này, gồm cả chính `tsconfig.json` mà `AC-08` ca một cấm báo oan. Nên điều kiện là KHÁC `0` ở cả hai phía. Ghi ở `evidence/step05-detector-src.txt` phần E và `evidence/ac08-three-states.txt` phần A | Không cần |
| `LIM-09` | `Limitation` | Tôi ĐỌC `docs/tasks/hrp-v5-rf-05-tsc-program-boundary/TASK.md`, vì `AC-08` ca một chỉ định chạy detector trên chính contract ấy. Chỉ thị đợt giao cấm CHẠM path của `rf-05` | Đọc không đổi byte, và đây là phép đo: `git hash-object` trên tệp ấy trả `362195b96737f81f676a81fa68e72233c6621c13` ở đầu vòng và ở cuối vòng. `193` dòng porcelain của `rf-05` có `0` dòng mang `M` ở cột thứ hai. `tsconfig.json` giữ đúng ba con số của `EV-13`: `53cc484886ddf4164f0741739af42e75ad913528`, `12 2`, và `M ` ở cột đầu. Tôi không restore, không stage, không xoá, không sửa | Không cần |

## 6. Evidence Index

| Evidence | Path | Proves |
|---|---|---|
| `EV-A01` | `evidence/step01-preflight.txt` | Nửa MỘT của `AC-01`: `git cat-file -t 53cc484…` trả `blob`, `-s` trả `1052`. Cộng `EV-08` đo bằng ba lệnh tái lập được, cả ba trả `0` dòng, và tên dự phòng của `DEC-06` cũng còn trống |
| `EV-A02` | `evidence/ac02-ac06-confirm.txt` | Xác nhận bốn AC của Tier 1 bằng đúng dụng cụ contract ghi: `40` dấu tay, `52`, `9832973`, `byte cut` `5`, `2082393`, `ANSWER: NO`, `KHONG XAC LAP DUOC` `2`, bốn số `0`, ba mục của `AC-06`. Kèm hai chỗ lệch của dụng cụ và phép đo bù |
| `EV-A03` | `evidence/ac03-secret-scan.txt` | Mười con số của `AC-03` khớp đủ: bốn chuỗi trả `0`, `token` trả `381` mà dạng gán trả `0`, một dòng đã che, `total lines redacted: 1`. Kèm phân loại `381` lần thành bốn nhóm |
| `EV-A04` | `evidence/step05-detector-src.txt` | Dấu tay, kiểm parse, mười hàm, ba lý do không dot-source `gate-lib.ps1`, bốn nhãn, hai tham số, ba mã thoát |
| `EV-A05` | `evidence/step06-detector-run.txt` | `AC-07` hai nửa: contract của task này exit `0`, contract fixture exit `2` bằng ĐÚNG chuỗi ký tự lệnh contract ghi. Kèm phần E ghi lần chạy `MISSING_INDEX` trên path thật, không tái lập được sau `git add` |
| `EV-A06` | `evidence/ac08-three-states.txt` | Ba trạng thái, ba nhãn khác nhau theo mặt chữ. Ca một là `rf-05`: `PRESENT` ở cả hai nơi, exit `0`, và số `1052` của detector bằng `git cat-file -s 53cc484…` |
| `EV-A07` | `evidence/ac09-zero-byte.txt` | `D-03 EMPTY` trên một tệp tracked dài `0` byte trong repo fixture dưới thư mục tạm, exit `2`; cộng hai lệnh `find … -size 0` trên repo thật đều trả `0` |
| `EV-A08` | `evidence/step07-scope.txt` | Nửa HAI của `AC-01`, cộng `AC-10`: `13` path của vòng này, `0` path lệch giữa worktree và index, quy thuộc `5` tệp `.ai-pipeline` khác và `304` path cached còn lại bằng dấu tay |
| `EV-A09` | `evidence/step08-gates.txt` | Cổng contract và cổng bàn giao chạy CUỐI CÙNG, sau lần `git add` cuối |
| `EV-A10` | `evidence/logfreeze-01-manifest.txt` tới `evidence/logfreeze-04-finding.txt` | Bốn tệp của Tier 1, giữ nguyên byte. Đây là bằng chứng gốc mà `AC-02` tới `AC-06` chỉ vào; `evidence/ac02-ac06-confirm.txt` là bản xác nhận của Tier 2, không phải bản thay thế |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.2` | `READY_FOR_AUDIT` | Viết `verify-delivery-presence.ps1`, `332` dòng, tệp MỚI, tự chứa. Bốn nhãn cộng mã `D-03` đo thật trên bốn nhánh; ca `rf-05` báo ĐỦ và exit `0`. Xác nhận bốn tệp `logfreeze-*` bằng đúng dụng cụ contract ghi, hai chỗ lệch dụng cụ khai ở `LIM-01` và `LIM-02`. 11/11 AC có phép đo. Không commit, không push |

> Handoff status: `READY_FOR_AUDIT`



