# HANDOFF — hrp-v5-gate-01-audit-row-identity

## 0. Control

| Field | Value |
| --- | --- |
| Task slug | `hrp-v5-gate-01-audit-row-identity` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.2` |
| Execution round | `1` |
| Current audit round | `0` |
| Executor | `Tier 2 — Engineer` |
| Baseline | `HEAD 31625c4` cộng dấu tay blob `EV-06` của năm tệp gate; đo lại ở `evidence/step01-fingerprint.txt` bằng `git hash-object`, cả năm KHỚP `EV-06` |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-09-05 09:09 → 11:05 (Asia/Bangkok, giờ host)` |

Vòng này chạy đúng spec **`v1.2`** của `TASK.md`, không phải một bản đọc trước đó.

## 1. Outcome Summary

Cổng audit có thêm hai mã kiểm và bộ selftest có thêm bốn ca.

`S-18` đọc từng hàng AC của mục 4 rồi so nguyên hàng sau khi bỏ trang trí: từ ba hàng trùng
trở lên là ERROR và thông báo nêu đủ danh sách mã AC cùng số nhóm; đúng hai hàng trùng chỉ là
WARNING. `S-19` bắt ô Result là một từ verdict thay vì một phép đo, với năm điều kiện giải cứu
(mã thoát, trị đo, đường dẫn artifact, câu khai output rỗng, và ô Limitation có nội dung).

Cả hai mã kiểm được đo RED-trước-GREEN-sau trên một `AUDIT.md` THẬT (`rf-06`) mà tôi không sửa
một byte, và đo không-dương-tính-giả trên bốn slug đã `ACCEPTED`. Khối `S-17` cũ không đổi một
dòng lệnh nào; nó chỉ nhận thêm tám dòng comment ghi lý lẽ `DEC-02`.

Bộ selftest đi từ mốc `cases: 33 total (3 green, 30 red)` lên `cases: 37 total (5 green, 32 red),
failures: 0`, exit `0`, và hai lần chạy liên tiếp cho cùng dòng `cases:` cùng mã thoát.

Tôi KHÔNG commit, KHÔNG push, KHÔNG merge (`R-01`). Tôi KHÔNG ghi §0 của `TASK.md` — lý do và
phép đo ở `DEV-01`.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
| --- | --- | --- | --- | --- |
| `STEP-01` | `RQ-05` | `evidence/step01-fingerprint.txt` | `git hash-object` năm tệp gate, cả năm khớp `EV-06`; nhánh MỘT của `AC-01`, chạy tiếp | None |
| `STEP-02` | `RQ-01` | `verify-audit.ps1` khối `S-18` | ERROR ở ngưỡng ba hàng trùng; thông báo nêu đủ mã AC và số nhóm | None |
| `STEP-03` | `RQ-02` | `verify-audit.ps1` khối `S-19` | ERROR khi ô Result là từ verdict; trích nguyên văn từ bị bắt | None |
| `STEP-04` | `RQ-03` | `verify-audit.ps1` khối `S-17` | 0 dòng lệnh đổi, thêm 8 dòng comment `DEC-02` | None |
| `STEP-05` | `RQ-04` | `verify-gates.selftest.ps1` | thêm bốn ca (hai red, hai green) cộng tham số tuỳ chọn `-WarnToken` | `DEV-02`, `DEV-03`, `DEV-04` |
| `STEP-06` | `RQ-06`, `RQ-07` | `verify-audit.ps1` điều kiện giải cứu thứ năm của `S-19` | siết `S-19`, gỡ ba dương tính giả trên slug đã `ACCEPTED`; ngưỡng không nới | `DEV-05` |
| `STEP-07` | `RQ-08` | `evidence/step07-scope.txt`, `evidence/ac11-gates.txt` | phạm vi đúng hai tệp `Modules` cộng path dưới slug này; hai cổng chạy cuối | `LIM-07` |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
| --- | --- | --- | --- | --- |
| — | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-gate-01-audit-row-identity/TASK.md` | `RESULT: PASS`, exit `0`, 0 warning | `evidence/ac11-gates.txt` | `None` |
| `AC-01` | `git hash-object` trên năm tệp gate, đối chiếu `EV-06`, cộng `git status --porcelain` cùng `git log --oneline -1` | exit `0`; 5/5 dấu tay khớp `EV-06`; `HEAD` = `31625c4`; nhánh MỘT | `evidence/step01-fingerprint.txt` | `None` |
| `AC-02` | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-audit.ps1 -TaskPath docs/tasks/hrp-v5-rf-06-vitest-default-lane-safety/TASK.md` | exit `2`; `RESULT: FAIL (11 error(s), 1 warning(s))`; đúng 1 dòng `S-18` nêu đủ chín mã `AC-01` tới `AC-09` cộng số nhóm | `evidence/ac02-s18-rf06.txt` | `None` |
| `AC-03` | cùng lệnh cổng audit trên `TASK.md` của `rf-06`, cộng `grep -c` số dòng `S-19` | exit `2`; 9 dòng `S-19`; dòng của `AC-01` trích nguyên văn từ verdict `BLOCKED` lấy từ ô Result | `evidence/ac03-s19-rf06.txt` | `None` |
| `AC-04` | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-gates.selftest.ps1 -Verbose2`, ca fixture ở `verify-gates.selftest.ps1:471` | exit `0`; ca báo `ok`; có dòng `[WARN] S-18` và KHÔNG có dòng `[FAIL] S-18` trên cùng fixture | `evidence/ac04-threshold.txt` | `None` |
| `AC-05` | `git cat-file -p` blob `EV-06` `2520a48d` ra bản copy rồi `diff -u` hai lát khối `S-17`, cộng `git diff --cached -- .ai-pipeline/scripts/verify-audit.ps1` | 0 dòng lệnh thêm hoặc bớt; 8 dòng comment thêm; 21/21 dòng lệnh giống nhau và cùng thứ tự; exit `1` là có khác biệt | `evidence/ac05-s17-unchanged.txt` | Con số của phương pháp ghi trong `AC-05` là 21 dòng lệnh, không phải 0; xem `LIM-01` |
| `AC-06` | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-gates.selftest.ps1`, cộng `grep -c "Add-Case -Name"` | exit `0`; `cases: 37 total (5 green, 32 red), failures: 0`; `grep` đếm 37 khớp dòng `cases:` | `evidence/ac06-selftest.txt` | Mốc 33 lấy từ `EV-07` chứ không bóc lại được từ byte; xem `LIM-06` |
| `AC-07` | cùng một chuỗi ký tự lệnh `verify-gates.selftest.ps1` chạy hai lần liên tiếp, rồi `diff` hai bản capture và `wc -l` | exit `0` và exit `0`; cùng dòng `cases: 37 total (5 green, 32 red), failures: 0`; 44/45 dòng giống hệt, dòng khác duy nhất là đường dẫn repo tạm có dấu thời gian | `evidence/ac07-idempotent.txt` | `None` |
| `AC-08` | `git hash-object docs/tasks/hrp-v5-rf-06-vitest-default-lane-safety/AUDIT.md` đo đầu vòng và cuối vòng, cộng `git status --porcelain` trên thư mục ấy | exit `0`; hai lần đều `1212bae740578cd10005e4c508b37d8c37afcdb0`; 18 dòng porcelain đều là `A` và không dòng nào là ` M` | `evidence/ac08-audit-untouched.txt` | `None` |
| `AC-09` | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-audit.ps1 -TaskPath docs/tasks/hrp-v5-go-live-16-internal-contrast-focus/TASK.md` và cùng lệnh với `docs/tasks/hrp-v5-go-live-18-public-surface-hardening/TASK.md` | exit `0` cả hai; 0 dòng `S-19`; `S-18` chỉ ra dòng `[OK]` đọc 12 và 18 hàng AC đều phân biệt | `evidence/ac09-no-false-positive.txt` | Cổng vẫn in một dòng `[OK] S-18`; cách đọc chữ "không in `S-18`" xem `LIM-04` |
| `AC-10` | `git status --porcelain` và `git diff --cached --name-only`, đối chiếu dấu tay `STEP-01` | exit `0`; hợp hai lệnh do Tier 2 gây ra không có path nào ngoài hai tệp `Modules` cộng `docs/tasks/hrp-v5-gate-01-audit-row-identity/**` | `evidence/step07-scope.txt` | Ảnh chụp một thời điểm; xem `LIM-07` |
| `AC-11` | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-gate-01-audit-row-identity/TASK.md` rồi `verify-handoff.ps1` cùng tham số, chạy CUỐI CÙNG | `RESULT: PASS` exit `0` và `RESULT: PASS` exit `0` | `evidence/ac11-gates.txt` | `None` |

## 4. Changed Deliverables

- **Source/artifact changed:** `.ai-pipeline/scripts/verify-audit.ps1` (khối comment `DEC-02` của `S-17`, khối `S-18`, khối `S-19` cùng điều kiện giải cứu thứ năm) — blob cuối `b6854802e329b391a70475eef8920255f0b7d639`, 35864 byte, `git diff --cached --numstat` = `568 95`; `.ai-pipeline/scripts/verify-gates.selftest.ps1` (bốn ca mới, tham số tuỳ chọn `-WarnToken`) — blob cuối `9e1feb05377cc35dbff9793c502234dcbef4f266`, 30752 byte, `numstat` = `627 0`; cộng `docs/tasks/hrp-v5-gate-01-audit-row-identity/HANDOFF.md` và mười tệp dưới `evidence/`.
- **Dependency:** `None`.
- **Schema/migration:** `None`. Không kết nối DB, không đọc `.env`.
- **Environment/config:** `None`.
- **Git diff/commit:** `Not created`. `R-01`: Tier 2 không commit, không push, không merge. Trạng thái giao là index cộng worktree, đo ở `evidence/step07-scope.txt`.

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `DEV-01` | `Deviation` | Chỉ thị đợt giao yêu cầu đặt `Status` của `TASK.md` thành `READY_FOR_AUDIT` và cộng 1 vào số round. Tôi KHÔNG ghi §0 của `TASK.md`. Ba căn cứ: §4.3 của chính hợp đồng viết `Status` chỉ Tier 1 đổi; `Current execution round` đã là `1`, đúng vòng tôi vừa chạy; và tôi đã đo trên một bản COPY ở thư mục tạm với `verify-task.ps1` — lật `Status` thành `READY_FOR_AUDIT` ra `RESULT: DRAFT-VALID (2 warning(s))`, trong đó `A-04` cảnh báo vì chính `Status` ấy, còn bản thật giữ `READY_FOR_EXECUTION` ra `RESULT: PASS` exit `0` | Nếu lật `Status`, `AC-11` mất chữ `RESULT: PASS` và Tier 2 ghi vào trường của Tier 1. Không lật thì `TASK.md` giữ nguyên byte, blob `b13d6cfe29d6688ff38dbbc626d95e340ca9256a` | Tier 1 tự đổi `Status` và số round khi mở vòng audit, hoặc bảo tôi lật và chấp nhận `DRAFT-VALID` |
| `DEV-02` | `Deviation` | `STEP-05` đòi thêm ca vào selftest; tôi thêm BỐN ca (hai đỏ, hai xanh) chứ không phải hai. Đếm ở `evidence/ac06-selftest.txt` phần D | Cộng thêm, không thay ca nào. `failures: 0`, `red` không giảm (30 lên 32) | Không cần. Nếu Tier 1 muốn đúng hai ca thì nói rõ ca nào bỏ |
| `DEV-03` | `Deviation` | `STEP-05` viết fixture "chín hàng giống nhau"; fixture của tôi dùng BỐN hàng giống nhau. Ca chín hàng được đo trên `AUDIT.md` THẬT của `rf-06` ở `evidence/ac02-s18-rf06.txt` | Bốn hàng vẫn trên ngưỡng ba của `DEC-04`, nên vẫn đo đúng nhánh ERROR. Ca chín hàng không mất, nó chuyển sang fixture thật | Không cần |
| `DEV-04` | `Deviation` | Harness nhận thêm một tham số tuỳ chọn tên `-WarnToken`, mặc định chuỗi rỗng, để khẳng định được một mã kiểm CỐ Ý ở mức WARNING. Khối khẳng định nguyên văn ở `verify-gates.selftest.ps1:584-594`, trích trong `evidence/ac04-threshold.txt` phần C | 36 lời gọi `Add-Case` cũ không truyền tham số ấy nên không đổi hành vi. Trước round này harness chỉ khẳng định được token ở mức ERROR | Không cần |
| `DEV-05` | `Deviation` | `STEP-06` cho phép siết điều kiện khi bản audit khác đỏ oan. Tôi siết `S-19` bằng điều kiện giải cứu thứ năm (có lệnh thật VÀ khai output rỗng), gỡ đúng ba dòng oan: `go-live-05` `AC-05` cùng `AC-18` và `go-live-14` `AC-07`. Delta lỗi bằng đúng delta số dòng `S-19` là `-2` và `-1`, đo ở `evidence/ac09-no-false-positive.txt` phần C và D | Ngưỡng KHÔNG bị nới: `S-18` vẫn ba hàng, `S-19` vẫn cần một trong năm điều kiện. Bốn dòng còn đỏ đều có một mã kiểm KHÁC (`S-02`) đỏ trên cùng hàng trong cùng lần chạy | Tier 3 kết luận bốn hàng còn đỏ là dương tính thật hay không |
| `LIM-01` | `Limitation` | Phương pháp ghi trong `AC-05` là `git diff --cached -- .ai-pipeline/scripts/verify-audit.ps1`. Lệnh ấy so index với `HEAD`, mà `HEAD` không có MỘT dòng `S-17` nào (`git diff` đếm 4 dòng `+` chứa `S-17` và 0 dòng `-`), nên nó ra 21 dòng lệnh thêm — 21 dòng ấy là việc của luồng Tier 1 khác, đã nằm trong blob `EV-06` trước khi tôi gõ một chữ. Phép đo cách ly trên blob `EV-06` `2520a48d` ra 0 | Hai con số 21 và 0 đều nằm trong `evidence/ac05-s17-unchanged.txt`, phần A và phần C. Tôi không sửa AC và không sửa hợp đồng | Tier 1 chọn con số nào trả lời mệnh đề của `AC-05`. Trường `Baseline` của chính hợp đồng chỉ vào dấu tay `EV-06`, không vào một commit |
| `LIM-02` | `Limitation` | `git add` hai tệp gate kéo theo cả 568 dòng thêm và 95 dòng bớt của luồng Tier 1 khác VÀO index của cây này. Không tránh được vì git stage nguyên tệp | Tôi không commit nên index chỉ là trạng thái tạm. Ai commit sau này phải dùng `git commit -- <pathspec>` và đọc diffstat của chính commit đó trước khi push | Tier 1 lưu ý khi commit lô gate |
| `LIM-03` | `Limitation` | `S-19` cũng đỏ bên TRONG fixture của ba ca harness cũ là `S-02`, `S-04`, `S-07`, đo ở `evidence/ac06-selftest.txt` phần E: bốn dòng `[FAIL] S-19` trước phép siết và bốn dòng sau, ở đúng cùng số dòng | Ba hàng ấy thật sự không có mã thoát, không trị đo, không đường dẫn artifact và không khai output rỗng, nên là dương tính thật. Ba ca vẫn báo `ok` vì harness khẳng định token riêng của chúng; `failures: 0` | Không cần |
| `LIM-04` | `Limitation` | `AC-09` viết "cổng audit không in `S-18`". Trên hai slug ấy cổng in một dòng `[OK] S-18 12 AC rows are pairwise distinct.` và `[OK] S-18 18 AC rows are pairwise distinct.` — tức có in chuỗi `S-18`, nhưng là dòng XANH, và 0 dòng `S-19` | Tôi đọc `AC-09` là "không in VẾT ĐỎ `S-18`". Nếu đọc theo mặt chữ tuyệt đối thì `AC-09` bất khả thoả với mọi bản audit sạch, vì dòng `[OK]` luôn được in | Tier 3 chốt cách đọc. Tôi không tự audit |
| `LIM-05` | `Limitation` | Harness tự sinh tiến trình cổng con bằng `-ExecutionPolicy Bypass` ở `verify-gates.selftest.ps1:355`; dòng đó có sẵn trong bản trước round, không phải của tôi. Mọi lệnh TÔI gõ tay đều là `powershell -NoProfile -File ...` | Chỉ thị cấm tôi dùng `-ExecutionPolicy Bypass`; tôi không dùng. Sửa dòng `355` sẽ đổi cách harness gọi cổng, ngoài phạm vi `RQ-04` | Tier 1 quyết có mở nợ cho dòng `355` hay không |
| `LIM-06` | `Limitation` | Mốc trước round của selftest là `cases: 33 total (3 green, 30 red), failures: 0` lấy từ `EV-07`. Không bóc lại được từ byte: `evidence/step01-fingerprint.txt` ghi tệp ấy là `??` untracked và `EV-06` không ghi dấu tay blob của nó, nên không có SHA nào để `git cat-file -p` | Bù lại, hai lần chạy giữa round đo được `cases: 36 total (4 green, 32 red)`; trừ ba ca tôi đã thêm tính đến lúc đó ra đúng cả ba con số `33`, `3`, `30`. Xem `evidence/ac06-selftest.txt` phần B | Round sau nên ghi dấu tay blob của selftest vào `EV-06` để mốc đo lại được |
| `LIM-07` | `Limitation` | `evidence/step07-scope.txt` là ảnh chụp một thời điểm. Sau khi ghi nó, còn đúng hai path được `git add` thêm: chính nó và `evidence/ac11-gates.txt`, cả hai đều dưới `docs/tasks/hrp-v5-gate-01-audit-row-identity/**` | Không path nào ra ngoài hai vùng mà `AC-10` cho phép. Hai cổng chạy SAU lần `git add` cuối, kết quả ở `evidence/ac11-gates.txt` | Không cần |

## 6. Evidence Index

| Evidence | Path | Proves |
|---|---|---|
| `EV-A01` | `evidence/step01-fingerprint.txt` | Dấu tay năm tệp gate khớp `EV-06`, `HEAD` `31625c4`, nhánh MỘT của `AC-01` |
| `EV-A02` | `evidence/ac02-s18-rf06.txt` | `S-18` đỏ trên `AUDIT.md` thật của `rf-06`, một dòng nêu đủ chín mã AC cộng số nhóm; RED trước và GREEN sau, bóc bản trước bằng SHA `2520a48d` |
| `EV-A03` | `evidence/ac03-s19-rf06.txt` | `S-19` đỏ trên cùng tệp ấy, trích nguyên văn từ verdict `BLOCKED` lấy từ ô Result |
| `EV-A04` | `evidence/ac04-threshold.txt` | Ngưỡng `DEC-04`: đúng hai hàng trùng ra `[WARN]`, ba hàng trở lên ra `[FAIL]`; khẳng định hai nửa nằm trong harness `584-594`, không nằm trong lời văn của tôi |
| `EV-A05` | `evidence/ac05-s17-unchanged.txt` | Khối `S-17`: 0 dòng lệnh đổi, 8 dòng comment thêm, đo cách ly trên blob `EV-06`; kèm con số 21 của phương pháp ghi trong AC |
| `EV-A06` | `evidence/ac06-selftest.txt` | `cases: 37 total (5 green, 32 red), failures: 0` exit `0`; mốc 33 dựng lại bằng số đo giữa round; bốn ca mới kể tên; vết đỏ `S-19` trong harness |
| `EV-A07` | `evidence/ac07-idempotent.txt` | Hai lần chạy liên tiếp cùng dòng `cases:` cùng exit `0`; `diff` thô chỉ một cặp dòng khác, là đường dẫn repo tạm |
| `EV-A08` | `evidence/ac08-audit-untouched.txt` | `AUDIT.md` của `rf-06` giống byte đầu vòng và cuối vòng, `1212bae7`; 18 dòng porcelain đều `A`, không dòng ` M` |
| `EV-A09` | `evidence/ac09-no-false-positive.txt` | Bốn `AUDIT.md` khác: hai slug của `AC-09` sạch `S-19`; ba dòng oan đã siết mất, bốn dòng còn đỏ trích nguyên văn kèm dòng `S-02` độc lập trên cùng hàng |
| `EV-A10` | `evidence/step07-scope.txt` | Hợp `git status --porcelain` và `git diff --cached --name-only`, tách phần của Tier 2 khỏi phần của luồng khác và của Tier 1 |
| `EV-A11` | `evidence/ac11-gates.txt` | Cổng contract và cổng bàn giao chạy CUỐI CÙNG, sau lần `git add` cuối |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.2` | `READY_FOR_AUDIT` | Thêm `S-18` và `S-19` vào cổng audit, thêm bốn ca cùng tham số `-WarnToken` vào selftest, siết `S-19` để gỡ ba dương tính giả. 11/11 AC có phép đo. Không commit, không push |

> Handoff status: `READY_FOR_AUDIT`
