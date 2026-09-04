# AUDIT — hrp-v5-go-live-18-public-surface-hardening — audit round 1

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-18-public-surface-hardening` |
| Work type / Audit mode | `CODE` / `CODE_AUDIT` |
| Spec version | `v1.4` |
| Execution round | `1` |
| Audit round | `1` |
| Baseline ghi ở contract | `80f6933` |
| HEAD lúc audit | `e58a6c0` |
| Auditor | Tier 3, phiên độc lập, KHÔNG phải tác giả bản giao |
| Audit time | `2026-09-04` 02:15 UTC |
| Artifact của vòng này | 28 tệp tiền tố `a1-` dưới `evidence/`, đánh số liên tục từ `00` tới `27`, do chính vòng này sinh |
| Independence | Mọi con số trong tài liệu này do tôi tự chạy. Không một ô nào sao lại từ `HANDOFF.md`. Chỗ số của tôi LỆCH số của Tier 2 thì tôi ghi cả hai và giải thích chênh lệch, xem `AUD-006` và mục 4 |
| Nguồn của mọi phép đo | worktree tại thời điểm audit, không phải tệp evidence của Tier 2 |

### 0.1 Dấu tay dụng cụ đo, ba lần đọc trong cùng một vòng

Constraint của Owner: bộ gate đang bị một Agent khác của Owner sửa, nên hash lệch giữa hai lần đọc
nghĩa là DỤNG CỤ đã dịch, không phải bản giao sai.

| Gate script | Hash trước vòng | Hash giữa vòng | Hash sau vòng | Ở `HEAD` |
|---|---|---|---|---|
| `.ai-pipeline/scripts/gate-lib.ps1` | `4caa5fd5` | `4caa5fd5` | `4caa5fd5` | ABSENT — chưa từng được commit |
| `.ai-pipeline/scripts/verify-task.ps1` | `e36b83df` | `e36b83df` | `e36b83df` | `f9014b7f`, tức worktree đã dịch khỏi `HEAD` |
| `.ai-pipeline/scripts/verify-handoff.ps1` | `3997dd4f` | `3997dd4f` | `3997dd4f` | ABSENT — chưa từng được commit |
| `.ai-pipeline/scripts/verify-audit.ps1` | `2520a48d` | `2520a48d` | `2520a48d` | `b5390297`, tức worktree đã dịch khỏi `HEAD` |

Kết luận về dụng cụ: **không một tệp gate nào dịch trong vòng này**, nên mọi kết quả cổng dưới đây
so sánh được với nhau. Nhưng hai trong bốn dụng cụ KHÔNG tồn tại ở `HEAD` và hai cái còn lại đã lệch
khỏi bản đã commit: tôi đang phán xét bằng một bộ dụng cụ CHƯA PHÁT HÀNH. Tôi ghi ra chứ không che.
Evidence: `evidence/a1-00-fingerprint-pre.txt`, `evidence/a1-23-fingerprint-post.txt`,
`evidence/a1-27-final-state.txt` mục 5.

### 0.2 Contract đã DỊCH giữa lúc vòng audit này đang đo

Đây là dữ kiện quan trọng nhất của vòng và phải đọc trước mọi ruling khác. Bản giao của Tier 2 được
thi hành trên `v1.2`. Trong lúc tôi đang đo, Tier 1 bump contract lên `v1.3` và stage nó. Bằng chứng
cơ học: `powershell -NoProfile -File .ai-pipeline/scripts/verify-handoff.ps1` chạy lúc 02:0x cảnh báo
`H-15` chỉ về `Next gate` và KHÔNG kể `Spec version`, tức worktree lúc ấy vẫn là bản cũ
(`evidence/a1-24-gates-task-handoff.txt` dòng 32); cùng một lệnh chạy lúc 02:15 báo
`H-03 spec version mismatch: TASK=v1.3 vs HANDOFF=v1.2` và `VH_EXIT=2`
(`evidence/a1-26-gates-rerun.txt`). `git diff --cached --numstat` trên contract đếm `3 2`, tức bản
bump chỉ đổi ba dòng: trường `Spec version`, một câu NỚI nhóm bốn của mục phạm vi, và một hàng
revision log (`evidence/a1-27-final-state.txt`).

Tôi audit bản giao theo `v1.3` vì cổng đòi `Spec version` của AUDIT phải bằng của TASK, và vì phép
so ba dòng ấy cho thấy `v1.3` chỉ NỚI đúng một chỗ, KHÔNG thêm bớt một yêu cầu, một bước hay một
tiêu chí nào. Nói cách khác: mọi phép đo tôi chạy dưới câu chữ `v1.2` vẫn còn giá trị, và chỗ duy
nhất bị ảnh hưởng là `AC-15`, nơi `v1.3` dễ thoả hơn `v1.2` chứ không khó hơn. Hệ quả xấu duy nhất
nằm ở `AUD-001`.

Rồi contract dịch LẦN THỨ HAI, khi tôi đã viết gần xong tài liệu này. Cổng audit chạy lúc 02:31 còn
báo `A-02 spec version v1.3 matches TASK`; cùng lệnh ấy chạy lúc 02:37 báo
`[FAIL] A-02 spec version mismatch: TASK=v1.4 vs AUDIT=v1.3`. `git diff --cached --numstat` trên
contract nhảy từ `3 2` lên `5 3`, và `git diff -- <TASK.md>` in RỖNG, nghĩa là bản `v1.4` đã nằm sẵn
trong index chứ không phải mới sửa ngoài worktree (`evidence/a1-31-contract-bump-v14.txt`).

Lần này bump KHÔNG vô hại như lần trước: nó sửa CHÍNH mệnh đề mà tôi đang buộc tội ở `AUD-003`. Câu
"`HEAD` bằng baseline" bị thay bằng "`git log --oneline -1` ở cuối task bằng đúng giá trị mà `STEP-01`
đã ghi", cộng một câu nói rõ phép so với field `Baseline` KHÔNG dùng ở đây. Vì thế tôi ĐO LẠI `AC-15`
dưới câu chữ mới thay vì giữ ruling cũ, và viết lại `AUD-003` thành một finding khác hẳn. Ba mệnh đề
còn lại của `AC-15`, cùng toàn bộ `17` AC kia, không bị câu chữ nào của `v1.4` chạm tới, nên mọi phép
đo khác của tôi giữ nguyên giá trị.

### 0.3 Dấu tay bộ gate sau vòng, và một giới hạn của chính dụng cụ

Ba lần đọc `git hash-object` nữa — lần thứ TƯ ngay sau lượt cổng đầu, lần thứ NĂM khi soát vùng Owner cấm chạm, lần thứ SÁU lúc đóng vòng — đều cho đúng bốn giá trị của ba lần trước: `4caa5fd5`, `e36b83df`, `3997dd4f`, `2520a48d`. Mọi lần đọc trong vòng, `0` lần lệch, kể cả lần đọc sau khi cổng đã xanh — ghi ở `evidence/a1-40-closing-hygiene.txt`. Dụng cụ KHÔNG dịch trong suốt vòng này, nên mọi phán quyết ở dưới đứng trên cùng một bộ mã kiểm từ đầu tới cuối. Hai tệp vẫn ABSENT ở `HEAD` và hai tệp còn lại vẫn lệch blob `HEAD` — tôi phán xét bằng dụng cụ CHƯA PHÁT HÀNH, và ghi rõ điều đó thay vì im lặng.

Cổng audit phải chạy nhiều lượt trong vòng này, và tôi ghi cả bốn lượt đầu chứ chỉ dẫn lượt xanh cuối thì là che. Lượt `1` và `2` cho `VA_EXIT=0` với `RESULT: PASS WITH WARNINGS`. Lượt `3` cho `VA_EXIT=2` với `A-02` đỏ vì contract đã lặng lẽ dịch lên `v1.4` trong lúc tôi viết. Lượt `4` cho `VA_EXIT=2` với `S-02` đỏ vì hàng `EV-14` của CHÍNH TÔI kết luận bằng lời văn mà không nêu lệnh chạy được — đúng cái lỗi bộ gate sinh ra để bắt, và nó bắt được tôi. Tôi sửa hàng ấy thành `git diff --cached --name-only` cộng `grep -c` cộng `git status --porcelain`, tức lệnh thật đã chạy ghi trong `evidence/a1-33-reclassify-under-v14.txt`, chứ không hạ tiêu chuẩn. Từ lượt sau bản sửa ấy, mọi lượt chạy lại đều cho `VA_EXIT=0` với đúng một cảnh báo `S-16`, kể cả lượt cuối cùng chạy sau khi tôi thêm hàng `EV-19`. Tôi KHÔNG chỉ sửa field phiên bản cho nó xanh lại: tôi diff contract, thấy `AC-15` bị viết lại, rồi đo lại `AC-15` cùng `AUD-003` theo câu chữ mới. Ghi lại đây vì bài học là một bản audit có thể phán bằng văn bản đã hết hiệu lực mà không hay biết. Lượt cuối cùng, cả hai tham số, còn đúng một cảnh báo `S-16` về `64` path staged ngoài thư mục task. Tôi quy chủ hết: `3` tệp gate của Agent khác, `46` path dưới `docs/` của lane `17`, của `test-01` và của Tier 1, `10` path mã và test trong đó `6` là chính bản giao tôi đang audit và `4` là bản giao của lane `17`, cộng `5` path gốc cây gồm `.gitignore`, hai tệp package, cấu hình playwright và một spec browser. Không một path nào trong `64` ấy do Tier 3 stage. Soát ve sinh cuối cùng cũng ở `evidence/a1-40-closing-hygiene.txt`: `HEAD` vẫn là commit tôi nhận việc, nhánh vẫn `ahead 1` như lúc bắt đầu, `sha256sum` trang chi tiết vẫn khớp hằng số nên Tier 3 KHÔNG sửa một byte mã nào, và `0` dòng trạng thái cho cả hai tệp probe tôi từng thả rồi xoá. Cả `63` path ấy không của tôi: chúng là tài sản Tier 1 và của Agent khác đang sửa bộ gate, đã quy chủ từng path ở `AUD-006`. Tier 3 vòng này không stage một tệp mã hay tệp test nào.

Một việc tự sửa của chính Tier 3, ghi ra vì luật chống cắt tệp đòi: khi soát lần cuối tôi thấy `26` tệp evidence do vòng này sinh vẫn ở trạng thái untracked. Untracked mà bị cắt về `0` byte thì MẤT HẲN, chỉ bản đã vào index mới cứu được bằng `git restore`. Tôi đã `git add` toàn bộ thư mục `evidence/` của task này, sau đó `git status --porcelain` trên thư mục task in `0` dòng untracked. Lúc đóng vòng, `78` path dưới thư mục task đang ở index: `39` tệp `a1-` của Tier 3, `36` tệp `s` của Tier 2, cộng ba tài liệu `TASK.md`, `HANDOFF.md`, `AUDIT.md`. Chỉ tệp `a1-` và `AUDIT.md` là của tôi. Ngoài `AUDIT.md` và `evidence/` của task này, Tier 3 không stage thêm gì.

Một giới hạn phải ghi ra: bản `verify-audit.ps1` trong cây làm việc KHÔNG hề khẳng định bảng checklist. Output của nó in `0` lần chuỗi `A-04` và `0` lần chuỗi `C-01`, nghĩa là mục 2.1 dưới đây đi qua cổng mà không bị kiểm. Nên tôi tự kiểm cấu trúc nó: `10` hàng, cả `10` hàng đúng `6` trường khi cắt theo dấu ống, `6` hàng DONE và `4` hàng SKIP, không hàng nào FAIL. Ai đọc bản audit này đừng suy ra rằng cổng xanh đã chứng cho mục 2.1. Bằng chứng ở `evidence/a1-29-gate-and-fingerprint-post.txt` cộng `evidence/a1-38-final-fingerprint-and-citations.txt`.

## 1. Findings

Không có `P0`. Không một finding nào dưới đây là defect của MÃ do Tier 2 viết: bốn cái nặng nhất là
defect của CÂU CHỮ contract hoặc của môi trường dùng chung, và chúng chặn verdict `PASS` theo đúng
luật của tier3 chứ không hạ giá bản giao.

### AUD-001 — `P1` — Contract dịch giữa vòng làm cổng HANDOFF từ xanh thành ĐỎ

`verify-handoff.ps1` trước bump: `RESULT: PASS` với đúng một cảnh báo, `VH_EXIT=0`. Sau bump:
`[FAIL] H-03 spec version mismatch: TASK=v1.3 vs HANDOFF=v1.2`, và `VH_EXIT=2`. Sau bump lần hai, cùng mã kiểm ấy đọc `TASK=v1.4` trên cùng một `HANDOFF` khai `v1.2`, nên khoảng lệch RỘNG thêm chứ không tự đóng. Câu chữ của chính mã
kiểm ấy là "A round executed against a stale contract cannot be audited". Bản giao KHÔNG đổi một byte
nào giữa hai lần chạy, chỉ contract đổi.

Quy trách: KHÔNG phải của Tier 2. `HANDOFF.md` khai `v1.2` vì đó là contract đang có hiệu lực lúc thi
hành, và Tier 2 bị cấm sửa contract. Đây là hệ quả của việc bump một contract đang chờ audit. Hai
cách đóng, cả hai thuộc Tier 1: (a) ghi vào Planner Resolution rằng câu NỚI của bản mới là VÔ HẠI với
bản giao — tôi đã tự kiểm bằng `git diff --cached --numstat`, đếm `3 2` ở bản trước và `5 3` ở bản hiện hành — rồi chấp nhận cặp lệch cho
vòng này; hoặc (b) yêu cầu Tier 2 sửa đúng MỘT trường `Spec version` trong `HANDOFF.md` rồi chạy lại
cổng. Cách (b) rẻ hơn nhưng mở một round thi hành mới cho đúng một trường.
Evidence: `evidence/a1-24-gates-task-handoff.txt`, `evidence/a1-26-gates-rerun.txt`.

### AUD-002 — `P2` — `AC-14` BẤT KHẢ THOẢ theo đúng câu chữ Tier 1 viết, và hạng lỗi thứ BA không có tên

`AC-14` đòi "Cả hai exit `0`" rồi thêm luật phân loại mọi dòng đỏ thành hồi quy hay test cũ chưa đảo,
cộng luật quy trách nếu dòng đỏ nằm ở path đã khai của một contract cùng lô. Tôi tự đo:

- `npm run test:unit` lấy mã thoát bằng redirect: `UNIT_EXIT=0`, `107 passed (107)` tệp, `1642` test.
- `npm run typecheck` lấy mã thoát bằng redirect: `TSC_EXIT=1`, ĐÚNG một dòng đỏ,
  `new-ui/components/JobCard.tsx` lỗi `TS2322`, và `0` dòng đỏ ngoài cây `new-ui`.
- `git ls-files new-ui` đếm `0`. `git log --all -- new-ui/` in `0` dòng. Không bị `.gitignore` chặn.
  Cây ấy có `14` tệp untracked, `11` tệp `.tsx`.
- `grep -c new-ui` trên `TASK.md` của cả hai contract cùng lô: `0` và `0`.
- `npx tsc --noEmit -p tsconfig.a1probe.json`, một config tạm chỉ THÊM `new-ui` vào `exclude`:
  `TSC_PROBE_EXIT=0`, không một chẩn đoán nào. Config tạm đã xoá, cây sạch.

Vậy dòng đỏ ấy không phải hồi quy (không có lịch sử để mà hồi), không phải test cũ chưa đảo (không
phải test), không phải path của contract cùng lô (hai contract kia không hề nhắc cây đó). Nó thuộc
hạng thứ BA mà `AC-14` không đặt tên: **một artifact chỉ tồn tại trong cây làm việc, chưa từng được
commit trên bất kỳ ref nào, bị một glob của `tsconfig` toàn repo hút vào chương trình biên dịch, và
không thuộc phạm vi của một contract nào**. Lỗ hổng nằm trong CÂU CHỮ `AC-14` do Tier 1 viết, không
nằm ở bản giao: với cây ấy còn trong worktree thì ngưỡng "cả hai exit `0`" là không thể đạt bởi bất kỳ
Tier 2 nào, dù mã viết hoàn hảo.

Tình tiết tăng nặng, do chính Tier 1 tự ghi: `PLN-23` của `go-live-16` đã chẩn đoán đúng hiện tượng
này và đã kê đúng phương thuốc probe-exclude, rồi giao nợ cho luồng `ui-01` qua `PLN-34` — nhưng
`go-live-18` không mang luật ấy theo. Evidence: `evidence/a1-01-newui-class.txt`,
`evidence/a1-02-newui-origin.txt`, `evidence/a1-05-tsc.txt`, `evidence/a1-06-tsc-exclude-newui.txt`.

### AUD-003 — `P3` — Bản `v1.4` đã tự sửa mệnh đề tôi định buộc tội, nhưng thay bằng một mốc `STEP-01` chưa từng ghi

Vòng này ban đầu định ghi một finding `P2`: `AC-15` chốt bằng "`HEAD` bằng baseline", trong khi
`git rev-list --count 80f6933..HEAD` trả `9` và cả `9` commit ấy đều của Tier 1, còn Tier 2 tạo `0`
commit. Trước khi tôi đóng tài liệu, Tier 1 bump `v1.4` và tự thay mệnh đề ấy. Nên tôi ghi lại
finding theo trạng thái MỚI thay vì giữ bản cũ đã hết đối tượng.

Mệnh đề mới đo được, và đo ra ĐÚNG: `git log --oneline -1` cho `e58a6c0`;
`git show -s --format='%h %ad'` cho thấy `e58a6c0` là chính commit PHÁT HÀNH ba contract, tạo lúc
`23:30:28`; `ls -l --time-style=full-iso` trên tệp evidence sớm nhất của `STEP-01` cho `23:44:11`,
tức muộn hơn; và `git rev-list --count e58a6c0..HEAD` trả `0`. Ba số ấy cùng nói một điều: HEAD lúc
`STEP-01` chạy đã là `e58a6c0`, và không một commit nào sinh ra trong suốt task.

Điều còn lại, hạ xuống `P3`: `STEP-01` KHÔNG hề ghi giá trị ấy. `grep` chuỗi `git log` trên cả ba tệp
`evidence/s01-*` cho `S01_GITLOG_HITS=0`, và không tệp nào chứa một sha bảy ký tự nào. Nên mệnh đề mới
chỉ thoả được bằng SUY DẪN từ dấu thời gian, không bằng phép so hai giá trị đã ghi như câu chữ đòi.
Đây là lần thứ hai trong cùng một AC mà Tier 1 viết một mốc mà không ai ghi lại: `v1.4` chữa được cái
bất khả thoả, nhưng vẫn để mốc so sánh nằm ở chỗ không có dữ liệu. Cách đóng rẻ nhất là buộc `STEP-01`
in `git log --oneline -1` vào evidence của nó ở mọi contract sau.
Evidence: `evidence/a1-32-ac15-under-v14.txt`, `evidence/a1-31-contract-bump-v14.txt`.

### AUD-004 — `P2` — Sau cả hai lần nới, vẫn còn bốn path ngoài mọi nhóm, một trong đó là TASK.md của chính task

Câu NỚI của bản mới xếp `TASK.md` của một slug KHÁC vào nhóm bốn, nên nó dọn được
`docs/tasks/hrp-v5-rf-05-tsc-program-boundary/TASK.md`. Tôi phân loại lại toàn bộ index dưới câu chữ
mới: lúc 02:15 `INDEX_TOTAL=100` với `OUTSIDE_TOTAL=5`; đo lại lúc 02:42 sau khi bản `v1.4` vào cây
thì `INDEX_TOTAL=134` và tập ngoài nhóm còn `GX_FINAL_TOTAL=4`, vì câu chữ mới hút `AUDIT.md` của lane
`17` vào nhóm bốn. Phần index phình ra là của CHÍNH tôi: `31` tệp `a1-` vừa vào index theo luật chống
cắt tệp, và cả `31` rơi vào nhóm ba. Bốn path còn lại:

| Path ngoài mọi nhóm | Chủ |
|---|---|
| `.ai-pipeline/scripts/gate-lib.ps1` | Agent khác của Owner, ABSENT ở `HEAD` |
| `.ai-pipeline/scripts/verify-handoff.ps1` | Agent khác của Owner, ABSENT ở `HEAD` |
| `.ai-pipeline/scripts/verify-pipeline.ps1` | Agent khác của Owner, commit `781335e` |
| `docs/tasks/hrp-v5-go-live-18-public-surface-hardening/TASK.md` | Tier 1, chính bản bump đã stage nó |

Path thứ tư là điểm đáng ghi nhất: bản bump viết ra để CHẶN một FAIL oan lại tự đặt thêm một path
ngoài nhóm, vì mục phạm vi chỉ kể `HANDOFF.md` cộng `evidence/` là artifact của task, còn câu mới chỉ
phủ `TASK.md` của slug KHÁC. Và tập cần đo là một tập KHÔNG DỪNG: Tier 2 tự đo lúc 01:01 thấy
`CACHED_COUNT=9`, tôi đo lúc 01:46 thấy `98`, lúc 02:15 thấy `100`, lúc 02:42 thấy `134`, trong khi
Tier 2 không sửa một byte nào trong khoảng đó. Một AC ràng buộc tập path staged của một index DÙNG CHUNG thì luôn có thể đỏ
vì việc của người khác. Evidence: `evidence/a1-25-scope-resolution.txt`,
`evidence/a1-27-final-state.txt` mục 2, `evidence/a1-33-reclassify-under-v14.txt`, `evidence/a1-34-gx-attribution.txt`, cộng `evidence/s10-scope-groups.txt` của Tier 2.

### AUD-005 — `P3` — `H-15` cảnh báo SAI về `Next gate`, và cơ chế là lỗi giải mã của dụng cụ chưa phát hành

`H-15` báo "TASK.md control field(s) differ from HEAD: Next gate". Tôi đo ngược:

- Hàng `Next gate` trích từ worktree và trích từ `HEAD` có `md5` GIỐNG NHAU, `244` byte cả hai, và
  `cmp` trả `CMP_EXIT=0`.
- Chạy lại đúng hai đường đọc của cổng: worktree qua `Get-Content -Raw -Encoding UTF8`
  (`verify-handoff.ps1:66`), còn `HEAD` qua `Invoke-GitLines` gọi `git show` KHÔNG ghim encoding
  (`gate-lib.ps1:119-124`). Kết quả: `Next gate` giải mã ra `187` ký tự ở bên worktree và `223` ký tự
  ở bên `HEAD`. Ba trường control còn lại thuần ASCII đều so ra SAME.

Vậy `H-15` sẽ cảnh báo sai cho MỌI trường control có dấu tiếng Việt, vì hai bên được giải mã bằng hai
đường khác nhau. Trong lần chạy sau bump, `H-15` kể hai trường: `Spec version` là thật, `Next gate` là
ảo. Defect thuộc dụng cụ của Agent khác, không thuộc bản giao và cũng không thuộc contract.
Evidence: `evidence/a1-26-gates-rerun.txt` mục 1 và mục 2.

### AUD-006 — `P3` — `HANDOFF` dùng một số `0` VÔ NGHĨA làm bằng chứng cho `AC-01`

`HANDOFF.md` viết rằng ký hiệu `consumeRateLimit(` đếm `0` lần trong thân `enforceRateLimits`. Tôi
`grep` chuỗi ấy trên toàn repo: `0` lần, vì ký hiệu đó KHÔNG tồn tại ở đâu cả. Một phép đếm bằng `0`
trên một cái tên không tồn tại thì bịa tên nào cũng ra `0`, nên nó không loại trừ được gì. Mệnh đề
thực chất — `enforceRateLimits` chỉ là lớp bọc `5` dòng, uỷ quyền cho `evaluateRateLimits` và không tự
dựng `NextResponse` — là ĐÚNG, và tôi đã tự đo lại bằng cách đọc thân hàm. Chỗ sai là HÌNH THỨC bằng
chứng, không phải kết luận. Evidence: `evidence/a1-12-guard.txt`.

### AUD-007 — `P3` — Hai tệp evidence `0` byte còn nằm trong bộ artifact

`evidence/s01-gate18.txt` và `evidence/s09-forbidden.txt` đều `0` byte. Tier 2 đã TỰ khai cả hai ở mục
ghi chú artifact và đã đo lại phần chất bằng tệp khác, đó là cách xử đúng. Tôi ghi finding này để bộ
artifact không bị người đọc sau hiểu thành hỏng ngầm: một tệp `0` byte không phân biệt được "không có
gì để in" với "lệnh chưa từng chạy" — đúng chữ ký đã sinh ra một mã thoát BỊA ở `go-live-09`. Tôi đã
đo lại độc lập cả hai phần chất: cổng ở `evidence/a1-26-gates-rerun.txt`, danh sách cấm chạm ở
`evidence/a1-27-final-state.txt` mục 3 với `FORBID_TOTAL=0`.

### AUD-008 — `P3` — Câu `DEV-01` của Tier 2 khai một mốc git không đo được

`DEV-01` viết rằng dòng đỏ typecheck "đã có trên baseline `80f6933`". Với một path UNTRACKED thì mệnh
đề "có trên baseline" không đo được bằng git: `git ls-files new-ui` trả `0` và `git log --all` trên cây
ấy in `0` dòng, nên nó không có mặt ở `80f6933` theo bất kỳ nghĩa git nào. Câu đúng phải là "đã đỏ
trong CÂY LÀM VIỆC từ trước, và vắng mặt ở mọi ref". Kết luận của `DEV-01` vẫn đúng về thực chất; chỉ
mốc là sai loại. Evidence: `evidence/a1-02-newui-origin.txt`.

## 2. Acceptance Verification

Mọi ô dưới đây là phép đo của Tier 3, chạy trên worktree lúc audit. Không ô nào sao lại từ `HANDOFF.md`.

| AC | Kết quả | Phép đo độc lập của Tier 3 | Evidence |
|---|---|---|---|
| `AC-01` | PASS | `git diff --cached -- src/shared/security/rate-limit-guard.ts` cộng đọc thân hàm bằng `sed -n`: `evaluateRateLimits` ở `:119` trả `Promise<RateLimitOutcome>` và KHÔNG dựng `NextResponse` nào; hai `catch` fail-closed ở `:126` và `:139` cùng trả `unavailable`; `enforceRateLimits` ở `:164` giữ nguyên chữ ký cũ, thân `:165` tới `:169` đúng `5` dòng, chỉ uỷ quyền | `evidence/a1-12-guard.txt` |
| `AC-02` | PASS | `git status --porcelain` chạy RIÊNG trên từng path của ba route đó: mỗi lần `0` dòng, tổng `0` | `evidence/a1-17-forbidden-sweep.txt` |
| `AC-03` | PASS | Không tin artifact: tôi tự suy lại. `git show 80f6933` trên tệp test của trang chi tiết cho `PD_BASE_LIMITER_HITS=0`, và `grep -c` chuỗi `no-store` trên toàn bộ `120` tệp test của baseline chỉ ra `10` chỗ, mọi chỗ neo vào nhánh `200`, vào route browse, vào đáp ứng chặn hoặc vào một chuỗi tuỳ chọn fetch, KHÔNG chỗ nào neo vào nhánh tracking. Vậy không một test baseline nào bị hai bản sửa che, nên lane xanh ở bước ấy là tính chất của riêng bản refactor | `evidence/a1-19-ac03-derivation.txt` |
| `AC-04` | PASS | `grep -n` trên trang: limiter ở `:92`, `withPublicDb` ở `:102`, nhánh từ chối `return` ở `:100`. Giữa `:92` và `:100` đếm `0` lệnh gọi `withPublicDb`, nên không đường nào chạm DB trước quyết định chặn | `evidence/a1-08-page-order.txt` |
| `AC-05` | PASS | `grep -n "JOB_BROWSE"` trả `RATE_LIMIT_RULES.JOB_BROWSE` ở `:94`, tức dùng ngân sách đã có. `git status --porcelain src/shared/security/rate-limit-port.ts` in `0` dòng, không rule mới, không ngân sách nào bị nới | `evidence/a1-11-ac-measure.txt` |
| `AC-06` | PASS | Đọc nhánh từ chối bằng `sed -n '92,112p'`: `0` lần in slug, `0` lần in IP, `0` lần in giá trị bucket. `grep -n "notFound()"` trên trang chỉ ra MỘT vị trí duy nhất `:184`, thuộc nhánh `404` thật, không thuộc nhánh từ chối | `evidence/a1-11-ac-measure.txt` |
| `AC-07` | PASS | `grep -n` trên `HANDOFF.md`: có dòng ghi rõ trang trả mã thành công vì Server Component không đặt được status, và điều được bảo đảm là ZERO truy vấn DB. Chuỗi ba chữ số của mã từ chối đếm `0` lần, đúng ràng buộc của contract | `evidence/a1-11-ac-measure.txt` |
| `AC-08` | PASS | `npx vitest run --config vitest.unit.config.ts src/shared/security/public-surface-limiter.static.test.ts` do tôi tự chạy: `GREEN1_EXIT=0`, `9 passed`. Tệp có `187` dòng | `evidence/a1-09-red-probe.txt` |
| `AC-09` | PASS | `grep -c "viec-lam"` trên tệp hàng rào trả `0`, dưới ngưỡng. Đọc mã: tập consumer TỰ SUY bằng `readdirSync` đệ quy trên hai gốc `src` và `app`, `0` mảng literal đường dẫn | `evidence/a1-22-fence-detectors.txt` |
| `AC-10` | PASS | Không đếm `it(` — đó chính là điểm mù của `go-live-08`. Tôi kiểm bằng thân hàm: detector `consumersMissingLimiter` khai ở `:87`, dùng ở `:125` cho cây THẬT và ở `:161`, `:169`, `:177`, `:185` cho `5` fixture âm, tức fixture chạy qua CÙNG một hàm với cây thật. Rồi tôi tự bắt hàng rào ĐỎ: `git show 80f6933` hoàn nguyên trang, `npx vitest run --config vitest.unit.config.ts` trên tệp hàng rào cho `RED1_EXIT=1`, `1 failed` cộng `8 passed`; phục hồi trang, `sha256` trùng khớp, chạy lại cho `GREEN1_EXIT=0` | `evidence/a1-09-red-probe.txt` |
| `AC-11` | PASS | `git diff --cached --numstat` trên route tracking đếm đúng `1 1`; `git diff --cached` cho thấy dòng thêm chỉ gắn `Cache-Control` giá trị `no-store` vào đáp ứng `404`. `git show 80f6933` trên dòng `42` của baseline chứng minh dòng cũ KHÔNG có headers, nên đây là bổ sung chứ không phải đổi ngữ nghĩa | `evidence/a1-21-nostore-lines.txt` |
| `AC-12` | PASS | `git diff --cached` trên tệp kho hàng đếm `7 0`, trong đó `2` assertion phủ định mới neo vào `result.phone` và `result.cccd` bằng lookahead loại trừ hậu tố masked. `npm run test:unit` cho tệp ấy `25 passed` | `evidence/a1-13-diffs.txt` |
| `AC-13` | PASS | `git status --porcelain` chạy RIÊNG từng path trên `16` đường dẫn cấm chạm, kể cả `prisma/` và mọi cấu hình vitest: từng path in `<EMPTY>`, tổng `FORBID_TOTAL=0` | `evidence/a1-27-final-state.txt` |
| `AC-14` | PARTIAL | Nửa test ĐẠT, nửa typecheck KHÔNG THỂ đạt theo câu chữ. `npm run test:unit` lấy mã thoát bằng redirect: `UNIT_EXIT=0`, `107` tệp, `1642` test, trên mốc sàn `1611`. `npm run typecheck` cùng cách: `TSC_EXIT=1` với ĐÚNG `1` dòng đỏ ở `new-ui/components/JobCard.tsx`, và `0` dòng đỏ ngoài cây đó. Dòng ấy KHÔNG thuộc hai hạng mà AC đặt tên: `git ls-files new-ui` đếm `0` và `git log --all` trên cây ấy in `0` dòng, nên nó vắng mặt ở mọi ref kể cả `80f6933`; `grep -c` tên cây ấy trên `TASK.md` của hai contract cùng lô trả `0` và `0`. `npx tsc --noEmit -p tsconfig.a1probe.json` chỉ thêm cây ấy vào `exclude` cho `TSC_PROBE_EXIT=0`, không một chẩn đoán. Xem `AUD-002` | `evidence/a1-05-tsc.txt` |
| `AC-15` | PARTIAL | Ba mệnh đề, đo lại dưới câu chữ mới. MỘT: `git diff --cached --name-only` lúc 02:42 đếm `INDEX_TOTAL=134`, phân nhóm cho `2` cộng `1` tệp mã ở nhóm một, `3` tệp hàng rào ở nhóm hai, `67` artifact của chính task ở nhóm ba, phần lớn còn lại ở nhóm bốn, và `GX_FINAL_TOTAL=4` path không thuộc nhóm nào — cả `4` của Tier 1 hoặc Agent khác, `0` của Tier 2. Mệnh đề này vẫn KHÔNG đạt mặt chữ, xem `AUD-004`. HAI: phân hoạch sạch, `OVERLAP_HITS=0` trên cả sáu path riêng, và danh sách cấm sửa cho `FORBID_TOTAL=0` qua `16` lần `git status --porcelain` chạy riêng. BA, mệnh đề vừa được viết lại: `git log --oneline -1` cho `e58a6c0`, `git rev-list --count e58a6c0..HEAD` trả `0`, và `git show -s --format` cho thấy `e58a6c0` tạo lúc `23:30:28` còn evidence sớm nhất của mốc đầu tiên là `23:44:11`, nên HEAD lúc ấy đã là `e58a6c0` và task tạo `0` commit — ĐẠT, dù chỉ bằng suy dẫn vì mốc ấy chưa từng được ghi, xem `AUD-003` | `evidence/a1-32-ac15-under-v14.txt` cộng `evidence/a1-35-modules-numstat-and-gx-final.txt` |
| `AC-16` | PASS | `npx vitest run --config vitest.unit.config.ts src/domains/applications/tracking-pii-containment.static.test.ts` do tôi tự chạy: `GREEN2_EXIT=0`, `11 passed`. Tệp tồn tại theo `ls` | `evidence/a1-10-red-probe-pii.txt` |
| `AC-17` | PASS | `grep -c "application.service"` trên hàng rào mới trả `1`. Đọc mã: cả ba mệnh đề có mặt — đúng `1` tệp không-phải-test tham chiếu hàm SQL, mỗi khoá thô xuất hiện `1` lần và nằm TRONG masker của nó, thân DTO có `0` khoá thô. Đối chiếu nguồn: `sed -n` trên service cho `phoneMasked` ở `:233` và `cccdMasked` ở `:234`, DTO có `11` khoá | `evidence/a1-20-ac03-masking.txt` |
| `AC-18` | PASS | Đọc mã: assertion phủ định neo vào `row.phone` và `row.cccd_number`; detector `rawPiiEscapes` khai ở `:102`, dùng ở `:148` cho cây thật và ở `7` vị trí fixture, cùng một hàm. Tôi tự bắt hàng rào ĐỎ bằng một tệp probe untracked mô phỏng rò rỉ: `RED2_EXIT=1`, đỏ đúng mệnh đề MỘT với thông điệp "to have a length of 1 but got 2"; xoá probe, `git status --porcelain` in `0` dòng dư, chạy lại cho `GREEN2_EXIT=0` | `evidence/a1-10-red-probe-pii.txt` |

### 2.1 Deep Audit Checklist C-01..C-10

| Check | Nội dung | Status | Evidence của Tier 3 |
|---|---|---|---|
| `C-01` | Regression test | DONE | `npm run test:unit` tự chạy, mã thoát lấy bằng redirect: `UNIT_EXIT=0`, `107 passed (107)` tệp, `1642` test. Số của tôi LỆCH số Tier 2 (`106` tệp, `1631` test) và chênh lệch đã quy được: tệp hàng rào của lane `17` đã vào cây sau đó, `1` tệp cộng `11` test, tức `106` cộng `1` và `1631` cộng `11`. `evidence/a1-03-unit.txt` cộng `evidence/a1-04-lane-delta.txt` |
| `C-02` | Build | SKIP(không một AC nào đòi bản build production, và `node scripts/copy-static.mjs` trong đường build sẽ làm bẩn `public/index.html` là path Owner cấm chạm ở vòng này) | Thay bằng phép đo cùng lớp rủi ro: `npm run typecheck` cho `TSC_EXIT=1` với đúng `1` dòng đỏ đã phân loại ở `AUD-002`, và `0` dòng đỏ trong `src` hoặc `app`. `evidence/a1-05-tsc.txt` |
| `C-03` | Route handlers | DONE | Đọc từng dòng cả ba tệp mã bị sửa. `rate-limit-guard.ts`: `evaluateRateLimits` ở `:119` trả một giá trị quyết định và dựng `0` `NextResponse`, hai catch fail-closed ở `:126` và `:139`, `enforceRateLimits` ở `:164` nguyên chữ ký với thân đúng `4` câu lệnh uỷ quyền, nên `3` route gọi khác giữ CLEAN. Trang chi tiết: limiter `:92` trước `withPublicDb` `:102`, nhánh từ chối `return` ở `:100`, fail-closed nằm trong `evaluateRateLimits` với `2` catch. Route tracking: `git diff --cached --numstat` đếm `1 1`, chỉ thêm header `no-store`, danh tính và guard không đổi. `evidence/a1-08-page-order.txt` cộng `evidence/a1-21-nostore-lines.txt` |
| `C-04` | Prisma queries | SKIP(bản giao không thêm hay sửa một truy vấn Prisma nào) | `git diff --cached --name-only -- prisma/` in `0` dòng và `git status --porcelain -- prisma` in `0` dòng; đường đọc vẫn là `withPublicDb` cộng `getPublicJobDetail` đã có từ baseline. `evidence/a1-27-final-state.txt` |
| `C-05` | Idempotency/outbox | SKIP(không một route `POST` hoặc `PATCH` mới nào trong bản giao) | Cả `2` tệp route trong diff đều là đường ĐỌC; `git diff --cached --name-only` trên tập route cho đúng `1` tệp tracking `GET`. `evidence/a1-13-diffs.txt` |
| `C-06` | Migration/RLS | SKIP(không migration, không policy nào bị chạm) | `git status --porcelain -- prisma` in `0` dòng, và `prisma/` nằm trong `16` path của danh sách cấm sửa nên `FORBID_TOTAL=0` phủ cả nó. `evidence/a1-27-final-state.txt` |
| `C-07` | Git hygiene | DONE | `git diff --cached --name-only` đếm `INDEX_TOTAL=100`, phân nhóm hết, `OUTSIDE_TOTAL=5` và cả `5` thuộc Tier 1 hoặc Agent khác. `git status --porcelain` từng path trong danh sách cấm sửa của contract cho `FORBID_TOTAL=0`; danh sách cấm chạm riêng của Owner đo tách ở `EV-11` và cũng `0` dòng thuộc Tier 3. Không dấu vết `git add -A` của Tier 2: `0` commit do Tier 2 tạo. Toàn bộ artifact vòng này đã vào index nên `0` tệp untracked dưới thư mục task. `evidence/a1-25-scope-resolution.txt` cộng `evidence/a1-30-owner-notouch-sweep.txt` |
| `C-08` | Test coverage | DONE | Mỗi tệp mã sửa có test tương ứng, và tôi tự BẮT ĐỎ cả hai hàng rào mới thay vì đếm `it(`: `RED1_EXIT=1` sau khi `git show 80f6933` hoàn nguyên trang, `RED2_EXIT=1` sau khi thả một probe rò rỉ PII, rồi `GREEN1_EXIT=0` và `GREEN2_EXIT=0` sau khi phục hồi. Số test không giảm: `1642` so với sàn `1611`. `evidence/a1-09-red-probe.txt` cộng `evidence/a1-10-red-probe-pii.txt` |
| `C-09` | Contract validity | DONE | `powershell -NoProfile -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-go-live-18-public-surface-hardening/TASK.md` chạy trên contract HIỆN HÀNH: `RESULT: PASS`, `VT_EXIT=0`, `A-01` đủ `11` mục, `T-05` đọc được cả `18` AC, `T-07` xác nhận đổi `Spec version` có kèm hàng revision. `evidence/a1-26-gates-rerun.txt` |
| `C-10` | Diff scope | DONE | `git diff --name-only 80f6933..HEAD` trên cả sáu path `Modules` in `0` dòng, `DRIFT_LINES=0`, nên không một tệp bản giao nào bị commit ngoài scope; `git rev-list --count` cho `9` commit đều của Tier 1. `evidence/a1-27-final-state.txt` |

## 3. Scope và Impact

Bản giao chạm đúng `3` tệp mã và `3` tệp test. Cả `6` path đều nằm trong danh sách `Modules` của contract, và cả `6` đều `0` dòng khác biệt giữa `80f6933` và `e58a6c0`, nên không path nào của bản giao bị commit sớm ngoài lượt audit này. Tôi tự sửa một con số của chính mình ở đây: bản nháp trước ghi `2` tệp mã và `28 3` cho trang chi tiết. Đo lại bằng `git diff --cached --numstat`, `git diff HEAD --numstat` và `git diff 80f6933 --numstat` — cả ba đều trả `91 5` — cộng `git show :<path> | wc -l` cho `272` dòng so với `186` dòng ở `HEAD`. Số đúng là `91 5`, và `HANDOFF.md` cũng khai `91 5`. Bằng chứng ở `evidence/a1-36-page-numstat-recheck.txt`.

| Vùng | Path | Thay đổi | Bán kính ảnh hưởng |
|---|---|---|---|
| Đường đọc công khai | `app/(jobs)/viec-lam/[slug]/page.tsx` | `git diff --cached --numstat` đếm `91 5` | Trang chi tiết tin tuyển dụng, thành phần server. Rủi ro thật là THỨ TỰ: nếu limiter chạy sau khi mở kết nối thì mỗi lượt bị chặn vẫn tốn một round-trip DB. Tôi đọc `:92` trước `:102` nên rủi ro ấy đóng. |
| Đường đọc công khai | `app/api/public/applications/[trackingCode]/route.ts` | `git diff --cached --numstat` đếm `1 1` | Chỉ thêm `no-store` vào header trả về. Không đổi danh tính principal, không đổi guard, không đổi hình dạng JSON, nên không consumer nào phải sửa. |
| Hạ tầng rate-limit | `src/shared/security/rate-limit-guard.ts` | `git diff --cached --numstat` đếm `38 9` | Tách một điểm vào chỉ-trả-quyết-định; `enforceRateLimits` giữ nguyên chữ ký và thân co lại còn `4` câu lệnh uỷ quyền. `grep -rln` tìm được `4` route gọi nó; `git status --porcelain` riêng từng route cho `3` route CLEAN và route thứ tư đúng là `[trackingCode]/route.ts` của bản giao với `1 1`. Không consumer nào ngoài bản giao phải sửa. |
| Hàng rào | `3` tệp test dưới `src`, numstat `7 0` cộng `187 0` cộng `196 0` | Tier 2 đo `20` test mới trên mốc `1611`; tôi đo lane tổng `1642` vì lane `17` đã thêm `11` test sau đó | Chỉ chạy trong lane test, `0` ảnh hưởng runtime production. |
| Ngoài bản giao | `128` path còn lại của index `134` path lúc 09:48, và `136` path còn lại của index `142` path lúc đóng vòng — toàn bộ phần tăng là `8` tệp evidence `a1-31` tới `a1-38` do CHÍNH tôi stage, còn phần ngoài thư mục task giữ nguyên `64` | Của Tier 1, của Tier 3, và của một Agent khác | Không thuộc phạm vi mã của vòng này, đã quy chủ từng path ở `AUD-004`. |

Không có tác dụng phụ nào lên schema, lên RLS, lên migration hay lên biến môi trường: `git status --porcelain -- prisma` in `0` dòng và không tệp `.env` nào trong index.

## 4. Independent Evidence

Mọi hàng dưới đây là lệnh TÔI chạy trong vòng này, mã thoát lấy bằng câu lệnh riêng sau redirect chứ không đứng sau một ống. Không hàng nào đọc lại tệp evidence của Tier 2 làm căn cứ.

| # | Lệnh của Tier 3 | Kết quả đo được | Artifact |
|---|---|---|---|
| EV-01 | `npm run test:unit` | `UNIT_EXIT=0`, `107` tệp test, `1642` test xanh, `0` test đỏ, `0` test bị bỏ | `evidence/a1-03-unit.txt` |
| EV-02 | `npm run typecheck` với mã thoát đọc riêng | `TSC_EXIT=1`, đúng `1` dòng đỏ, toàn bộ nằm dưới `new-ui`, và `0` dòng đỏ khi lọc theo `src` hoặc `app` | `evidence/a1-05-tsc.txt` |
| EV-03 | `git ls-files new-ui` cộng `git log --all -- new-ui/` | Cả hai in `0` dòng, `14` tệp untracked trong đó `11` là `.tsx`; probe `npm run typecheck` với thư mục ấy bị loại cho `TSC_PROBE_EXIT=0` | `evidence/a1-01-newui-class.txt` cộng `evidence/a1-06-tsc-exclude-newui.txt` |
| EV-04 | `git show 80f6933` hoàn nguyên trang rồi `npm run test:unit -- --config` trên tệp hàng rào | `RED1_EXIT=1` với `1 failed` cộng `8 passed`, phục hồi cho sha256 khớp nguyên vẹn, `GREEN1_EXIT=0` với `9 passed` | `evidence/a1-09-red-probe.txt` |
| EV-05 | Thả một tệp probe untracked mô phỏng rò rỉ rồi `npm run test:unit -- --config` trên hàng rào PII | `RED2_EXIT=1` đỏ đúng mệnh đề MỘT, xoá probe cho `git status --porcelain` in `0` dòng dư, `GREEN2_EXIT=0` với `11 passed` | `evidence/a1-10-red-probe-pii.txt` |
| EV-06 | `powershell -NoProfile -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath` trên contract hiện hành | `VT_EXIT=0`, `RESULT: PASS`, đọc đủ `18` AC và `11` mục bắt buộc | `evidence/a1-26-gates-rerun.txt` |
| EV-07 | `powershell -NoProfile -File .ai-pipeline/scripts/verify-handoff.ps1` sau khi contract dịch | `VH_EXIT=2` với `H-03` đỏ vì `TASK` đọc một số phiên bản mà `HANDOFF` đọc số thấp hơn; TRƯỚC lúc dịch chính lệnh ấy cho `VH_EXIT=0` | `evidence/a1-26-gates-rerun.txt` |
| EV-08 | `git hash-object` bốn tệp gate, đo `3` lần trong vòng, cộng `git cat-file -e` từng blob ở `HEAD` | `4` hash bất biến qua cả `3` lần đọc, và hai lần đọc sau đó ghi ở mục 0.3 cho đúng bốn giá trị ấy; `2` tệp KHÔNG tồn tại ở `HEAD`, `2` tệp còn lại lệch blob `HEAD` | `evidence/a1-27-final-state.txt` |
| EV-09 | `md5sum` cộng `cmp` trên hàng `Next gate` trích từ worktree và từ blob, rồi `python` dot-source `gate-lib.ps1` in độ dài chuỗi hai đường đọc | Hai bản byte y hệt, `cmp` cho exit `0`, `244` byte; nhưng hai đường đọc của cổng cho `187` so với `223` ký tự, tức cảnh báo `H-15` là lỗi giải mã | `evidence/a1-26-gates-rerun.txt` |
| EV-10 | `git diff --cached --name-only` cộng `git status --porcelain` trên `16` path trong danh sách cấm sửa CỦA CONTRACT | Lúc 02:15 `INDEX_TOTAL=100`, `OUTSIDE_TOTAL=5`, `OVERLAP_HITS=0` trên cả `6` path của bản giao, `FORBID_TOTAL=0`. Đọc lại lúc 09:48 cho `134`, và toàn bộ phần tăng là artifact của CHÍNH Tier 3 rơi vào nhóm ba | `evidence/a1-25-scope-resolution.txt` |
| EV-11 | `git status --porcelain` cộng `git diff --cached --numstat` trên `10` vùng Owner cấm Tier 3 chạm, tách hẳn khỏi danh sách của contract | Các vùng ấy KHÔNG rỗng: `204` dòng trạng thái, trong đó `434` cộng `341` dòng thêm là của Agent khác trên hai tệp gate. Nhưng `0` dòng nào của Tier 3: `sha256sum` trang chi tiết vẫn khớp hằng số kỳ vọng và `git hash-object` bốn tệp gate bất biến qua `5` lần đọc | `evidence/a1-30-owner-notouch-sweep.txt` |
| EV-12 | `git status --porcelain` cộng `git diff --cached --numstat` cộng `git diff` trần trên `TASK.md`, chạy khi cổng audit bất ngờ đỏ | Contract dịch LẦN THỨ HAI lúc 02:37:32Z: numstat nhảy từ `3 2` lên `5 3`, `git diff` trần in `0` dòng nên worktree khớp index, tức bản mới đã vào index chứ không phải nháp | `evidence/a1-31-contract-bump-v14.txt` |
| EV-13 | `grep -nE` trên từng tệp `evidence/s01-*` cộng `git rev-list --count` hai chiều cộng `git show -s --date=iso` | `S01_GITLOG_HITS=0` nên `STEP-01` chưa từng ghi giá trị mà `v1.4` đòi; `e58a6c0..HEAD` cho `0` và `80f6933..HEAD` cho `9`; commit `23:30:28` đứng TRƯỚC mốc evidence sớm nhất `23:44:11` | `evidence/a1-32-ac15-under-v14.txt` |
| EV-14 | `git diff --cached --name-only` rồi phân loại lại TOÀN BỘ index theo bốn nhóm của mục `4.2` bản `v1.4`, mỗi nhóm một phép đếm `grep -c` riêng, cộng `git status --porcelain` trên `16` path cấm sửa | `INDEX_TOTAL=134` với `SUM_CHECK=134`, tức không path nào rơi ngoài phép chia; `FORBID_TOTAL=0` và `OVERLAP_HITS=0` | `evidence/a1-33-reclassify-under-v14.txt` |
| EV-15 | Quy chủ từng path còn ngoài nhóm bằng `git diff --cached --numstat` cộng đối chiếu dòng `Modules` của chính contract | `GX_FINAL_TOTAL=4`; tôi tự bác một kết quả nháp của mình vì nó đẩy `rate-limit-guard.ts` ra ngoài, trong khi path ấy nằm trong `Modules` và là đối tượng của `RQ-01` | `evidence/a1-34-gx-attribution.txt` cộng `evidence/a1-35-modules-numstat-and-gx-final.txt` |
| EV-16 | Bốn phép đo độc lập trên trang chi tiết: numstat theo index, theo `HEAD`, theo baseline, cộng `git show` một path rồi đếm dòng bằng `wc -l` | Cả bốn đồng thuận `91 5` và `272` dòng so với `186` dòng, nên con số `28 3` trong bản nháp mục 3 của tôi là SAI và đã sửa | `evidence/a1-36-page-numstat-recheck.txt` |
| EV-17 | `git diff --cached --numstat` trên `4` path còn lại của bản giao, `grep -rln` tìm consumer, `git status --porcelain` riêng từng consumer | `38 9` cho tệp hạ tầng, `7 0` cộng `187 0` cộng `196 0` cho ba tệp test; `4` consumer gọi `enforceRateLimits` và `3` trong số đó CLEAN | `evidence/a1-37-section3-numbers.txt` |
| EV-18 | `git hash-object` lần thứ SÁU trên bốn tệp gate, `git rev-parse HEAD:<path>` từng tệp, cộng một lượt quét sự tồn tại của MỌI path artifact mà tài liệu này trích dẫn | Bốn hash y hệt năm lần trước, `2` tệp cho exit `128` tức ABSENT ở `HEAD`; `42` path artifact được trích và `MISSING_TOTAL=0`; `TASK.md` vẫn `v1.4` với numstat `5 3`, `HEAD` vẫn là commit cũ và nhánh vẫn `ahead 1` như lúc tôi nhận việc | `evidence/a1-38-final-fingerprint-and-citations.txt` |
| EV-19 | `git diff --cached --name-only` lúc đóng vòng, rồi `grep -c` quy chủ từng nhóm trong và ngoài thư mục task | `142` path trong index: `78` dưới thư mục task với `39` tệp của Tier 3 cộng `36` tệp của Tier 2 cộng `3` tài liệu, và `64` ngoài đó gồm `3` tệp gate, `46` path `docs`, `10` path mã hoặc test, `5` path gốc cây. Delta so với lần đọc trước đúng bằng `8` tệp evidence của chính tôi | `evidence/a1-39-final-index-attribution.txt` |

## 5. Coverage Gaps

Vòng này KHÔNG sạch gap. Có hai AC ở mức PARTIAL và bốn khoảng trống dưới đây, cộng một khoảng trống của quy trình mà tôi tự phát hiện muộn, ghi ra để Tier 1 quyết chứ không để Tier 3 tự đóng.

1. `AC-14` — PARTIAL. Lane typecheck đỏ đúng như AC mô tả, nhưng dòng đỏ ấy thuộc một hạng mà chính câu chữ AC không đặt tên: nó không phải hồi quy do bản giao gây, không phải test cũ chưa đảo, cũng không phải path của contract cùng lô. Nó là mã nháp CHƯA TỪNG VÀO GIT. Tier 3 không có quyền sửa câu chữ AC, nên hạng ấy để ngỏ. Chi tiết ở `AUD-002`.
2. `AC-15` — PARTIAL, và lý do đã ĐỔI giữa vòng. Bản `v1.3` đòi "HEAD bằng baseline", điều sai mặt chữ ngay lúc audit vì có `9` commit của Tier 1 nằm giữa; bản `v1.4` tự bỏ mệnh đề ấy và thay bằng "bằng ĐÚNG giá trị mà `STEP-01` đã ghi". Đo lại theo câu chữ mới: `STEP-01` KHÔNG ghi giá trị nào để so, `S01_GITLOG_HITS=0`. Tôi suy ra được sự bất biến bằng đường khác — `git rev-list --count` từ commit phát hành contract tới `HEAD` cho `0`, và mốc giờ của commit ấy đứng trước mốc evidence sớm nhất — nhưng suy ra KHÁC với đọc một giá trị đã ghi. Mệnh đề MỘT của cùng AC cũng còn hở: `4` path vẫn ngoài cả bốn nhóm và một trong đó là `TASK.md` của chính task này. Chi tiết ở `AUD-003` cộng `AUD-004`.
3. Đường build production KHÔNG được kiểm trong vòng này, vì lệnh build làm bẩn một path Owner cấm chạm. Rủi ro compile đã che bằng lane typecheck, nhưng rủi ro riêng của bước gom static thì chưa ai đo.
4. Cổng `HANDOFF` hiện ĐỎ do contract dịch giữa vòng, không do bản giao. Không một phép đo nào của Tier 3 hạ được vết đỏ ấy: nó chỉ tắt khi Tier 1 chọn một trong hai lối ở `AUD-001`.
5. Contract dịch HAI lần trong lúc vòng này đang đo, và lần thứ hai chỉ lộ ra vì cổng audit bật `A-02` đỏ ở lượt chạy thứ `3`. Không phép đo nào của tôi tự phát hiện được nó: `git status` trên contract vẫn y nguyên một chữ `M` trước và sau. Đây là khoảng trống của QUY TRÌNH, không của bản giao — một bản audit đọc contract lúc bắt đầu rồi phán lúc kết thúc thì đang phán bằng một văn bản có thể đã khác. Cách tôi bù là chạy cổng CUỐI CÙNG rồi đo lại mọi AC bị câu chữ mới chạm, chứ không chỉ sửa field phiên bản cho cổng xanh.
6. Cảnh báo `H-15` trên hàng `Next gate` là lỗi giải mã trong chính dụng cụ, không phải sai lệch dữ liệu. Nó sẽ còn cảnh báo ở mọi vòng sau cho tới khi Agent đang sửa bộ gate ghim encoding cho đường đọc blob. Chi tiết ở `AUD-005`.

## 6. Verdict và Planner Questions

**Verdict:** CONDITIONAL

Căn cứ: `16` trong `18` AC PASS bằng phép đo của tôi, `2` AC PARTIAL, `10` trong `10` mục checklist không mục nào FAIL, cổng contract `VT_EXIT=0`. Theo luật verdict, còn AC chưa PASS trọn thì mức cao nhất được phép là CONDITIONAL, nên tôi không ghi PASS dù không tìm ra defect nào trong mã bản giao.

Điều kiện để lên PASS ở vòng sau, cả ba đều là việc của Tier 1 chứ không phải việc của Tier 2:

1. Đóng lệch phiên bản ở `AUD-001` bằng một trong hai lối đã nêu. Đây là chặn duy nhất mức P1.
2. Sửa câu chữ `AC-14` để nó đặt tên cho hạng thứ ba, hoặc chuyển ngưỡng sang một phép đo loại được thư mục chưa vào git. Bản giao KHÔNG cần chạy lại.
3. Chốt cách đóng `AC-15`. Bản `v1.4` đã tự sửa mệnh đề baseline, nên phần còn hở chỉ là hai chỗ: nhóm bốn của mục `4.2` cần nói rõ nó CHỨA `TASK.md` của chính task đang audit, và mệnh đề ba cần chấp nhận một phép suy ra tương đương khi `STEP-01` không ghi giá trị git nào. Cả hai đều là câu chữ, KHÔNG cần Tier 2 chạy lại.

Câu hỏi gửi Tier 1:

1. Lệch phiên bản giữa hai tài liệu: chấp nhận cặp trễ và ghi nhận nó vô hại bằng `numstat` của chính bản bump, hay yêu cầu Tier 2 bump đúng một field trong `HANDOFF.md`? Tôi không tự chọn vì cả hai đều nằm ngoài quyền Tier 3.
2. Hai AC PARTIAL trên đều là lỗ hổng câu chữ do Tier 1 viết, không phải defect. Xác nhận rằng cách đóng là bump spec, KHÔNG mở execution round mới?
3. Mã nháp `new-ui` làm lane typecheck đỏ vĩnh viễn cho MỌI task sau. Nó có nên rời khỏi cây làm việc, hay bị loại khỏi cấu hình typecheck bằng một task riêng?
4. Bước gom static chưa được kiểm ở vòng này. Có cần một lượt kiểm build riêng, chạy bởi người được phép chạm path ấy?
5. Contract của task này dịch HAI lần khi vòng audit đang chạy, lần sau chỉ lộ ra nhờ `A-02`. Tier 1 có muốn đặt luật đóng băng contract từ lúc `Status` thành `READY_FOR_AUDIT` cho tới khi có verdict, hay giữ quyền bump và chấp nhận rằng Tier 3 phải đo lại từ đầu mỗi lần?

## 7. Re-audit Trace

Đây là vòng audit thứ nhất của task này, nên không có vòng trước để đối chiếu. Ghi lại đây những gì vòng 1 đã tự làm, để vòng sau (nếu có) không lặp lại phép đo cũ mà tưởng là mới.

| Audit round | Điều đã đo | Kết cục |
|---|---|---|
| 1 | Toàn bộ `18` AC, `10` mục checklist, hai hàng rào bị chính Tier 3 bắt ĐỎ rồi phục hồi, ba lần đọc dấu tay bộ gate | CONDITIONAL, `2` AC PARTIAL, `8` finding, chặn duy nhất mức P1 là lệch phiên bản giữa contract và bản giao |

Cảnh báo cho vòng 2, nếu Tier 1 mở: mục 4 của vòng này phải được thay bằng lệnh CHẠY LẠI, không phải sao lại. Nếu mục Independent Evidence của vòng 2 giống vòng 1 tới từng byte thì không lệnh mới nào đã chạy, và bản audit ấy phải bị trả.

Hết AUDIT.md cho Tier 1.
