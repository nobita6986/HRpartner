# AUDIT: hrp-v5-go-live-08-public-ui-premium

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-08-public-ui-premium` |
| Work/Audit type | `CODE/CODE_AUDIT` |
| Spec version | `v1.3` |
| Execution round | `1` |
| Audit round | `1` |
| Round opened by | HANDOFF round 1 `READY_FOR_AUDIT`, 520 dòng / 96.655 byte |
| Round closes when | verdict `PASS` cộng Planner Resolution `ACCEPTED` |
| Auditor/context | Tier 3 trong phiên `kiro-cli` trên máy sếp, Windows 11, cây làm việc `c:\CodeApp\HrP` |
| Baseline/diff/artifacts | Baseline mã `c6256e7`; `HEAD` = `origin/main` = `5c9b88f`; diff đo bằng `git diff` trên cây làm việc chưa commit; bản baseline của `app/globals.css` xuất ra `scratch/g-base-audit.css` bằng `git show c6256e7:app/globals.css` |
| Independence | **CÓ GIỚI HẠN, phải đọc trước mọi kết luận.** Chính tôi viết `TASK.md` này với vai Tier 1 trong các phiên trước, nên tôi không độc lập với contract theo nghĩa của pipeline. Sếp giao vai Tier 3 tường minh nên tôi nhận, và bù lại bằng ba việc: (a) không chép một con số nào từ HANDOFF, mọi ô trong §2 và §4 là lệnh tôi tự chạy lại; (b) ba finding có gốc là lỗi contract do chính tôi gây được ghi rõ là lỗi của Tier 1, không đẩy sang Tier 2; (c) tôi độc lập với **mã** của round này, không viết một dòng nào trong năm deliverable. Sếp nên đọc `AUD-001` như một quyết định sản phẩm chứ không như một phán quyết trọng tài |
| Audit time | `2026-09-02 02:10 +07` |

## 1. Findings

### AUD-001 — Nút hành động chính mang cặp màu chữ 3.153:1, dưới ngưỡng 4.5:1 của `AC-13`, và contract tự khoá đường sửa

- **Severity:** `P2`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-13` / `AC-13`, đụng `§4.2` (mọi giá trị token đang có nằm ngoài scope)
- **Evidence:** `app/globals.css:308`–`:310` là quy tắc **mới** `.hrp-btn-primary` khai `background-color: var(--color-primary)` cộng `color: var(--color-on-primary)`. Tôi tự đo cặp này: `#ffffff` trên `#f26522` = **3.153:1**. Cặp thứ hai `--color-success` `#2e7d32` trên `--color-success-soft` `#eaf5ea` = **4.435:1**, thiếu `0.065`. Năm phần tử mang class này: `app/(portal)/page.tsx:220`, `:488`, `:535` và `app/components/GlobalNavbar.tsx:206`, `:297`. Tại baseline `c6256e7` cùng hai token đó được sơn bằng inline style trên chính nút Ứng tuyển, nên **pixel không đổi và đây không phải hồi quy** — nhưng nền giờ do một class MỚI sơn, tức nằm trong phạm vi chữ nghĩa "nền mới" của `AC-13`. HANDOFF khai đúng và không che, ở `LIM-01`
- **Impact:** nút quan trọng nhất của bề mặt công khai không đạt WCAG AA cho chữ thường. Đường sửa **nằm trong scope** và đã được chính Tier 2 dùng cho 8 khai báo khác: `--color-primary-dark` `#a63b00` tôi đo được `6.147:1` trên nền body, `6.468:1` trên nền card, `5.842:1` trên nền panel. Đổi nền nút chính sang token đó là đổi diện mạo thương hiệu, nên nó là quyết định của sếp và Planner, không phải của Tier 2 hay Tier 3
- **Decision needed from Planner:** chọn một trong ba — (a) thu hẹp `AC-13` về "cặp màu **mới sinh** trong round này", để cặp thừa hưởng nằm ngoài; (b) cho phép nền nút chính dùng `--color-primary-dark` trong một round sau, ghi thành RQ riêng; (c) nhận rủi ro có văn bản với bốn trường waiver. Tôi không đề xuất patch

### AUD-002 — `§4.2` chỉ sai vị trí chèn: tuân thủ đúng mặt chữ sẽ phá `AC-12`, và Tier 2 không khai deviation này

- **Severity:** `P3`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-12` / `AC-12`, `§4.2`
- **Evidence:** `§4.2` buộc khối class trình bày mới nằm "sau dòng 297" của `app/globals.css`. Nhưng khối class thủ công đã chết chạy `189`–`360` theo `EV-32`, nên "sau 297" rơi vào **giữa** khối. Tier 2 chèn ở baseline dòng `182`, tức **trước** khối: hai hunk thuần thêm `@@ -108,0 +109,19 @@` và `@@ -182,0 +202,244 @@`, tổng `263` dòng, numstat `263 0`. Tôi tự đo hệ quả cascade: 22 selector mới đều tiền tố `hrp-`, đối chiếu với 60 selector của khối chết cho **0 trùng selector và 0 trùng tên class**, nên thứ tự không quyết định gì và sai lệch là vô hại. `AC-12` đạt: 0 dòng bị xoá, và vùng baseline `189`–`360` dài `9.261` ký tự, sha256 mở đầu `ee75a96491e0`, xuất hiện nguyên vẹn liền mạch tại dòng `452` của bản sau khi sửa
- **Impact:** không có tác động chạy máy. Tác động quy trình thì có hai chiều: số dòng `297` là số tồn đọng từ thời `v1.1` khi khối chết kết ở `297` — **lỗi của Tier 1**, tức của tôi; còn việc đi lệch một ràng buộc tường minh của `§4.2` mà HANDOFF `§5` không có mục nào khai báo là **phần của Tier 2**
- **Decision needed from Planner:** sửa `§4.2` thành "ngoài vùng `189`–`360`" thay vì "sau dòng `297`", và quyết có chấp nhận hồi tố deviation không khai báo này hay đòi Tier 2 bổ sung một mục `DEV` cho nó

### AUD-003 — `RQ-15`/`AC-15` đòi `npm run diff-check`, script không tồn tại trong `package.json`

- **Severity:** `P3`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-15` / `AC-15`
- **Evidence:** tôi đọc toàn bộ danh sách script của `package.json`: **không có** `diff-check`. Tier 2 khai ở `DEV-04` và thay bằng ba lệnh git — `git status --porcelain` toàn cây, `git diff --numstat`, `git diff --cached --numstat`. Tôi tự chạy lại cả ba, kết quả khớp với HANDOFF
- **Impact:** một trong năm lệnh mà `AC-15` gọi tên là bất khả thi, nên `AC-15` không thể `PASS` đúng mặt chữ dù bốn gate thật đều exit `0`. Gốc là **lỗi của Tier 1**
- **Decision needed from Planner:** hoặc viết lại `AC-15` bằng ba lệnh git đó, hoặc thêm script vào `package.json` ở một task sau — lưu ý `package.json` đang nằm ngoài scope của 08 nên Tier 2 không có quyền tự thêm

### AUD-004 — `AC-21` phủ cả navbar nhưng `§4.2` không cho sửa icon navbar

- **Severity:** `P3`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-21` / `AC-21`, `§4.2`
- **Evidence:** `AC-21` mệnh đề một: không còn icon ligature trang trí nào lộ ra với công nghệ trợ giúp. Tôi đếm hai file: `app/(portal)/page.tsx` có `material-symbols-outlined` `9` trước và `9` sau, `aria-hidden` `1` trước và `10` sau — trang landing đã phủ kín. `app/components/GlobalNavbar.tsx` có `3` icon ligature cộng `2` thẻ svg, `aria-hidden` `0` trước và **`0` sau**. Nhưng `§4.2` chỉ mở navbar cho đúng ba thứ: hai nút đăng nhập, skip link, và đồng bộ container theo `RQ-20` — icon navbar chưa bao giờ trong scope
- **Impact:** đọc đúng mặt chữ thì `AC-21` không đạt trên navbar; đọc theo `§4.2` thì Tier 2 không được phép chạm vào đó. Hai điều khoản của cùng contract chỏi nhau, và **gốc là lỗi của Tier 1**. Tác động người dùng thật: trình đọc màn hình vẫn đọc `3` ligature trang trí trên navbar, nhưng đó là tình trạng thừa hưởng từ trước `c6256e7`, không phải round này gây ra
- **Decision needed from Planner:** thu hẹp `AC-21` về riêng trang landing, và mở một task sau cho icon navbar; hoặc mở rộng `§4.2` rồi trả 08 về execution round 2 chỉ cho ba thuộc tính đó

### AUD-005 — Ba con số HANDOFF khai thấp hơn hoặc cao hơn thực tế

- **Severity:** `P3`
- **Status:** `OPEN`
- **RQ/AC:** `RQ-16` / `AC-16`
- **Evidence:** ba chỗ tôi đo khác HANDOFF. Một, `DEV-05` khai `nav-item-lift` đi từ `0` lên `2` ở navbar `:206` và `:297`; tôi đếm được **`6`**, vì `app/(portal)/page.tsx` cũng nhận `4` chỗ ở `:143`, `:220`, `:488`, `:535`, cả hai file baseline đều `0`. Hai, `§3.8` khai file test phủ "24 trên 26 RQ"; tôi đếm **`23`** mã RQ phân biệt, vắng `RQ-15`, `RQ-16`, `RQ-19`. Ba, lời relay kèm lệnh giao việc mô tả `ee75a964` là hash của bản cắt SAI và `b000fb06` là bản đúng; HANDOFF `DEV-02` lại dẫn `ee75a964` là hash **khớp**, và bản cắt độc lập của tôi trên vùng baseline `189`–`360` cũng cho `ee75a964`
- **Impact:** không có tác động tính đúng đắn. Chỗ khai thiếu của `DEV-05` thực ra là khai **thấp hơn** công việc đã làm: tôi kiểm từng phần tử và cả `6` chỗ đều đúng chỗ, phủ **6 trên 6** phần tử có thể nhận transform, `0` phần tử hở. Chỗ `23` so với `24` là khai cao hơn một đơn vị. Chỗ hash chỉ sai trong lời văn relay, không sai trong artifact
- **Decision needed from Planner:** quyết có đòi Tier 2 sửa ba con số trong HANDOFF hay `ACCEPT_FIX` mức báo cáo. Tôi nghiêng về ghi nhận và bỏ qua, vì cả ba đều không chống đỡ một kết luận nào

### AUD-006 — `BLK-01` là `ENV_BLOCKED` hợp lệ, nhưng nó là hệ quả của cách Tier 1 viết AC

- **Severity:** `P3`
- **Status:** `OPEN`
- **RQ/AC:** `AC-02`, `AC-03`, `AC-04`, `AC-05`, `AC-08`, `AC-09`, `AC-17`, `AC-18`, `AC-20`, `AC-22`, cộng nửa "bấm" của `AC-24` và `AC-25`
- **Evidence:** tôi tự đếm lại trong cây: `0` file `*.test.tsx`, và `0` match cho playwright, puppeteer, cypress, jsdom. Không có runner nào chạy được `getComputedStyle`, ảnh chụp, hộp giới hạn hay một lần tab hoặc click thật. Mười AC trở lên có phương pháp mà chính contract ghi là "Computed style" hoặc "đo tọa độ từ trình duyệt"
- **Impact:** khoảng một nửa ma trận AC chỉ đo được nửa tĩnh trong lane này. Đây đúng là bẫy "AC bất khả đo" mà chính tôi đã ghi lại sau go-live-12, và nó tái diễn ở 08. Theo `DEC-17`, từ vựng verdict không có `ENV_BLOCKED`, nên các ô đó ghi `PARTIAL` hoặc `BLOCKED` và mã `BLK-01` nằm ở ô evidence
- **Decision needed from Planner:** hoặc waiver `OWNER_PENDING` cho các nửa AC đó với đủ bốn trường và một danh sách bước mắt thường cho sếp, hoặc mở một task hạ tầng test trình duyệt trước khi đóng 08. Không được để verdict `PASS` khi nửa đó chưa ai đo

## 2. Acceptance Verification

Mọi ô `Result` dưới đây là lệnh **tôi tự chạy lại**, không chép HANDOFF. Quy ước: `PASS` là đo được và đạt; `PARTIAL` là nửa tĩnh đạt còn nửa cần trình duyệt chưa đo được vì `BLK-01`; `BLOCKED` là toàn bộ phương pháp của contract nằm trong trình duyệt.

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | diff vùng theme cộng đếm khai báo token | PASS | Hunk `@@ -108,0 +109,19 @@` thuần thêm; khai báo token `94` lên `97`; đúng ba token mới `--color-focus-ring`, `--shadow-card-hover`, `--t-medium`; `0` giá trị cũ bị đổi, `0` khai báo lặp | `None` |
| `AC-02` | đọc quy tắc `.hrp-card` tại `globals.css:253`–`:258` | PARTIAL | Nền `var(--color-surface)`, padding `var(--spacing-card-padding)`, bóng `var(--shadow-card)` — đều token của design system, không giá trị framework. Giá trị computed lúc chạy chưa đo được, `BLK-01` | `AUD-006` |
| `AC-03` | đọc `.hrp-card` và `.hrp-card:hover` cộng giá trị `--t-medium` | PARTIAL | `:265` liệt kê đúng ba thuộc tính `transform, box-shadow, border-color`; `:272`–`:277` đổi đồng thời `translateY(-2px)`, `--shadow-card-hover`, `border-color`; `--t-medium` = `220ms` nhỏ hơn `250ms`. Hai bộ computed chưa đo được, `BLK-01` | `AUD-006` |
| `AC-04` | tra giá trị token padding cộng đọc class tên việc làm | PARTIAL | `--spacing-card-padding: 24px` tại `:86`, `.hrp-card` dùng nó tại `:254` nên `24px` là hằng khai báo; nửa "tên việc làm lớn hơn baseline" và màu tên đơn vị chỉ đọc được ở computed, `BLK-01` | `AUD-006` |
| `AC-05` | đọc `.hrp-pill` và `.hrp-pill-location` | PARTIAL | `:279` và `:283` là hai quy tắc riêng với hai token nền khác nhau, cả hai giữ bo tròn và vẫn có icon. Giá trị nền computed chưa đo được, `BLK-01` | `AUD-006` |
| `AC-06` | so giá trị hex của token nền panel với token nền card | PASS | `.hrp-panel` tại `:294` dùng `--color-surface-container-low` = `#f4f3f1`; card dùng `--color-surface` = `#ffffff`. Khác nhau, và `#f4f3f1` đúng là xám rất nhạt; `--color-surface-variant` `#e3e2e0` vẫn là bậc thứ ba phân biệt | `None` |
| `AC-07` | `grep -c "outline-none"` cộng đếm phần tử mang `hrp-focus` | PARTIAL | `outline-none` trên `app/(portal)/page.tsx` = `0` trước và `0` sau, đúng ngưỡng. `hrp-focus` xuất hiện `12` lần, phủ `8` trên `8` phần tử focus được của trang và `4` trên `13` của navbar. Nửa "cả 9 control hiện vòng focus nhìn thấy được" cần bàn phím thật, `BLK-01` | `AUD-006` |
| `AC-08` | đếm `type="checkbox"` cộng đọc thuộc tính của `select` | PARTIAL | `type="checkbox"` = `0` ở cả hai đầu, khớp `DEC-18` và `DEV-01`; `select` vẫn là element native và giữ `appearance-none`. Hai giá trị computed hover và focus, cùng việc mở chọn option bằng bàn phím, chưa đo được, `BLK-01` | `AUD-006` |
| `AC-09` | đọc ba nhóm quy tắc nút cộng đếm inline style | PARTIAL | `.hrp-btn-primary` `:308` có `:hover` `:316` và `:active` `:324`; `.hrp-btn-outline` `:330` có `:hover` `:339` và `:active` `:344`; `.hrp-btn-ghost` `:349` tương tự. Nút Ứng tuyển tại `:215`–`:224` **không còn thuộc tính `style` nào**, màu tương tác đã rời sang class; inline `style={{` toàn trang `39` xuống `32`. Ba trạng thái computed chưa đo, `BLK-01` | `AUD-006` |
| `AC-10` | đếm khối `prefers-reduced-motion` cộng kiểm phủ của hàng rào thứ hai | PARTIAL | Số khối `prefers-reduced-motion` = `1`, khối thừa hưởng nằm nguyên tại `:609`–`:623` và giống từng byte bản baseline `:346`–`:360`. Cơ chế thật sự khử transform là gán `nav-item-lift` để quy tắc `!important` bên trong khối đó phủ lên: tôi kiểm từng phần tử, `6` trên `6` phần tử có thể nhận transform đều mang class, `0` phần tử hở. Khối `@media (hover: none), (pointer: coarse)` tại `:439` là hàng rào cảm ứng riêng nên phép đếm vẫn bằng `1`. Nửa bật giảm chuyển động thật trên trình duyệt chưa đo, `BLK-01` | `AUD-006` |
| `AC-11` | numstat trang landing cộng năm phép đếm trên diff | PASS | numstat `38 53`; trên diff: chạm DTO `0`, facet `0`, phân trang `0`, nhãn đơn vị `0`, và `git diff --numstat` của `src/domains/job-board/public.service.ts` trả rỗng. Không dòng nào ngoài thuộc tính trình bày | `None` |
| `AC-12` | cắt vùng baseline `189`–`360` rồi so byte với bản sau khi sửa | PASS | Vùng dài `9.261` ký tự, sha256 mở đầu `ee75a96491e0`, có mặt **nguyên vẹn liền mạch** tại dòng `452`; `git diff` của `app/globals.css` = `263 0`, tức `0` dòng bị xoá hoặc bị đổi. Cảnh báo phương pháp: lần đo đầu của tôi báo vùng bị cắt — sai, do blob baseline có `0` CRLF còn cây làm việc có `623`; phải chuẩn hoá xuống dòng trước khi so | `AUD-002` |
| `AC-13` | tự tính tỉ số tương phản từ giá trị hex của token | PARTIAL | Mệnh đề thành phần giao diện **đạt**: `--color-primary-dark` `#a63b00` đo `6.147:1`, `6.468:1`, `5.842:1` trên ba nền, và `--color-focus-ring` thừa hưởng `6.468:1`. Mệnh đề chữ **không đạt**: `--color-on-primary` trên `--color-primary` = `3.153:1` và `--color-success` trên `--color-success-soft` = `4.435:1`. Bảng 30 dòng của HANDOFF được tôi thử lại bốn ô rẻ nhất, khớp tới ba chữ số thập phân `2.997`, `2.843`, `3.153`, `4.435` | `AUD-001` |
| `AC-14` | chạy riêng file test mới cộng đếm mã RQ được tham chiếu | PARTIAL | `19 describe`, `62 it`, chạy riêng `62 passed` exit `0`. Nhưng chỉ `23` mã RQ phân biệt được tham chiếu; `RQ-19` là bất biến đo được mà **không có** assertion, `RQ-15` và `RQ-16` thì thuộc loại gate và tài liệu nên không assert được | `AUD-005` |
| `AC-15` | tự chạy lại bốn gate cộng tra danh sách script | PARTIAL | `npm run typecheck` exit `0`, `npm run lint` exit `0`, `npm run test:unit` exit `0` với `101` file và `1.567` test, `npm run build` exit `0`. Số lỗi lint không tăng. Lệnh thứ năm `npm run diff-check` **không tồn tại** | `AUD-003` |
| `AC-16` | đọc HANDOFF `§3` đối chiếu từng AC | PARTIAL | Mọi AC đo được đều có số thật kèm lệnh; nhưng các nửa cần trình duyệt chỉ có lập luận cộng khai báo `BLK-01`, không có số. Đó là giới hạn của lane, không phải né tránh — HANDOFF khai thẳng | `AUD-006` |
| `AC-17` | đếm class kích thước trước và sau | PARTIAL | Hai giá trị baseline đã đổi: `w-9 h-9` `1` xuống `0` và `w-11 h-11` `0` lên `1`, tức `36px` lên `44px`; `px-6 py-2` `1` xuống `0`; `h-11` `0` lên `7`. Khoảng cách `8px` tới phần tử liền kề chỉ đo được bằng hộp giới hạn, `BLK-01` | `AUD-006` |
| `AC-18` | đọc skip link, đích của nó, và quy tắc hiện ra | PARTIAL | `GlobalNavbar.tsx:89` có `a` class `hrp-skip` trỏ `#hrp-main`; `.hrp-skip` tại `:414` đặt `left: -9999px` nên không chiếm chỗ trong bố cục; `.hrp-skip:focus` tại `:430` kéo về `top: 16px; left: 16px`; đích `id="hrp-main" tabIndex={-1}` tại `page.tsx:424`. Lần nhấn tab thật chưa ai làm, `BLK-01` | `AUD-006` |
| `AC-19` | hai phép đếm trên diff | PASS | Khai báo `prefers-color-scheme` mới = `0`; biến thể token tối = `0` | `None` |
| `AC-20` | so chuỗi class container của hai file | PARTIAL | Hai chuỗi **giống hệt nhau**: `w-full max-w-[1600px] mx-auto px-6 md:px-[5%]` tại `GlobalNavbar.tsx:94` và `page.tsx:424`, nên mép trái trùng nhau do cấu tạo. Số đo thật ở bốn breakpoint với sai lệch `1px` cần trình duyệt, `BLK-01` | `AUD-006` |
| `AC-21` | đếm icon và `aria-hidden` trên cả hai file | PARTIAL | Trang landing: `material-symbols-outlined` `9` trước và `9` sau, `aria-hidden` `1` lên `10` — phủ kín. Navbar: `3` ligature cộng `2` svg, `aria-hidden` `0` trước và `0` sau — chưa phủ, nhưng icon navbar nằm ngoài `§4.2` | `AUD-004` |
| `AC-22` | đọc khối nhãn và ô từ khoá | PARTIAL | `page.tsx:443`–`:455`: `label` có `htmlFor="hrp-keyword"` nhìn thấy được, `input` có `id="hrp-keyword"` và `type="search"` ngữ nghĩa, và nó là control đầu tiên trong panel. Panel hiện đầy đủ ở `1024` và `1440` mà không cần mở gì thì cần trình duyệt, `BLK-01` | `AUD-006` |
| `AC-23` | liệt kê mọi khai báo transform và transition mới | PASS | Đúng **hai** nhóm phần tử động: `.hrp-card:hover` `translateY(-2px)` tại `:273` và `.hrp-btn-primary:hover` `scale(1.02)` tại `:318`; `.hrp-btn-primary:active` `:326` đặt `transform: none` nên không sinh nhóm thứ ba. Mọi khai báo transition chỉ nêu `transform`, `box-shadow`, `background-color`, `border-color`; `0` transition chạm `width`, `height`, `top`, `left`. Thời lượng ra `--t-fast` `150ms` trên thời lượng vào `--t-medium` `220ms` = `68,2%`, dưới `70%` | `None` |
| `AC-24` | `grep -c` cộng đọc nguồn của `detailHref` | PARTIAL | `href={detailHref}` = `2` trước và `2` sau; `publicJobDetailPath(job.slug)` vẫn là nguồn duy nhất. Lần bấm thật vào card chưa ai làm, `BLK-01` | `AUD-006` |
| `AC-25` | đọc import và render cộng numstat file modal | PARTIAL | `ApplyModal` import tại `page.tsx:7`, render tại `:631`; `git diff --numstat` của `src/domains/job-board/components/apply-modal.tsx` trả **rỗng**. Lần mở modal thật chưa ai làm, `BLK-01` | `AUD-006` |
| `AC-26` | numstat file service cộng bốn phép đếm trên diff | PASS | `git diff --numstat -- src/domains/job-board/public.service.ts` trả rỗng; trên diff trang landing: DTO `0`, facet `0`, phân trang `0`, nhãn đơn vị `0` | `None` |

### Mandatory Checks (Deep Audit — C-01..C-10)

Bốn check `SKIP` đều cùng một lý do gốc: round này thuần trình bày. Tôi tự kiểm tiền đề đó chứ không nhận từ HANDOFF — `git status --porcelain` trên `prisma/` trả rỗng, trên `app/api/` trả rỗng, `git diff --numstat` trên `package.json` và `package-lock.json` trả rỗng, và trên `src/domains/job-board/public.service.ts` trả rỗng.

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| `C-01` | DONE | `npm run test:unit` exit `0`, output `Test Files 101 passed (101)` và `Tests 1567 passed (1567)`, thời lượng `26,72s`. Không giảm so với các round trước; file test mới của round này góp `62` test |
| `C-02` | DONE | `npm run build` exit `0`. Kèm `npm run typecheck` exit `0` và `npm run lint` exit `0`. Tôi grep bản đã biên dịch `.next/static/css/*.css` sau khi tự build và thấy các quy tắc mới có mặt, tức chúng sống qua minify chứ không chỉ tồn tại trong nguồn |
| `C-03` | SKIP | Không route handler nào bị chạm. `git status --porcelain -- app/api/` trả rỗng, exit `0`. Round này không thêm hay sửa một đường API nào |
| `C-04` | SKIP | Không truy vấn Prisma nào bị chạm. `git status --porcelain -- prisma/` trả rỗng và `git diff --numstat -- src/domains/job-board/public.service.ts` trả rỗng, exit `0`. Không có gì để đối chiếu với schema |
| `C-05` | SKIP | Không có `POST` hay `PATCH` mới. Cùng bằng chứng như `C-03`; năm deliverable là CSS, TSX thuộc tính trình bày, một file test tĩnh và HANDOFF |
| `C-06` | SKIP | Không migration, không policy. `git status --porcelain -- prisma/` trả rỗng, exit `0`; `0` file `.sql` trong diff. Bề mặt dữ liệu và quyền không đổi một byte |
| `C-07` | DONE | `git rev-parse HEAD` và `git rev-parse origin/main` cùng trả `5c9b88fe2c142ad1666ba6a5af5edc0feac71ef7`; `git log origin/main..HEAD --oneline` rỗng; `git diff --cached --numstat` rỗng. Tier 2 **không** commit, **không** stage, **không** push — `R-01` được tôn trọng. Diff nằm nguyên trong cây làm việc |
| `C-08` | DONE | File test mới `src/domains/job-board/public-ui-premium.static.test.ts` tồn tại, `777` dòng, `19 describe`, `62 it`. Chạy riêng exit `0` với `62 passed`. Ba deliverable mã đều có assertion tương ứng; `RQ-19` là bất biến đo được duy nhất không có assertion, tôi tự đo bù ở `AC-19` |
| `C-09` | DONE | `.ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-go-live-08-public-ui-premium/TASK.md` exit `0`, dòng `RESULT: PASS. TASK contract is ready for execution.` |
| `C-10` | DONE | `git diff --name-only` cộng `git status --porcelain` cho đúng năm đường của task: `app/globals.css`, `app/(portal)/page.tsx`, `app/components/GlobalNavbar.tsx`, file test mới, và `HANDOFF.md`. Tất cả nằm trong `§4.2`. Bất biến `DEC-20`: `git diff --name-only c6256e7..HEAD` trả đúng hai đường dưới `docs/`, `0` đường ngoài, nên số đo của contract tại `c6256e7` vẫn còn hiệu lực |

## 3. Scope và Impact

- **Deliverables in scope:** đủ năm, không thiếu, không thừa. `app/globals.css` `263 0`, `app/(portal)/page.tsx` `38 53`, `app/components/GlobalNavbar.tsx` `14 16`, một file test tĩnh mới, và HANDOFF `520` dòng.
- **Out-of-scope changes:** `None` thuộc task này. Cây làm việc có ba thứ của luồng khác mà tôi **không chạm**: `public/index.html` `97 59`, và ba file `AUDIT.md` của task 02, 04, 13 mỗi file `1 0`. Chữ ký `1 0` là dấu vết của lỗi hạ tầng cắt file, tôi để nguyên theo đúng quy tắc không dọn dấu vết.
- **Blast radius/callers/affected flows:** chỉ lớp trình bày của bề mặt công khai. Ba bất biến kế thừa đều đứng: điều hướng `detailHref` `2` bằng `2`, `ApplyModal` còn nguyên với file modal `0` dòng đổi, `public.service.ts` numstat rỗng. Khối class thủ công đã chết còn nguyên `9.261` ký tự — nhưng cần ghi rõ một điều mà HANDOFF không nói: round này **kéo một quy tắc trong khối đó vào đời**, cụ thể `.nav-item-lift:hover` tại `:620`, bằng cách gán class từ TSX cho `6` phần tử. Khối vẫn không bị sửa nên `AC-12` đạt, nhưng từ nay nó không còn hoàn toàn chết.
- **Data/security/migration/operations:** `N/A`, và tôi tự kiểm tiền đề chứ không nhận lời văn — `0` đường dưới `prisma/`, `0` đường dưới `app/api/`, `0` file `.sql`, `package.json` và `package-lock.json` numstat rỗng, `public.service.ts` numstat rỗng. Không dependency mới. Không giá trị bí mật nào xuất hiện trong năm deliverable.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npm run test:unit` | `0` | `Test Files 101 passed (101)`, `Tests 1567 passed (1567)` | Lane canonical `vitest.unit.config.ts`; `npx vitest run` trần đọc `DATABASE_URL` từ `.env` nên không dùng |
| `npm run typecheck` | `0` | stdout rỗng | Không chứng minh được gì về khoá DTO, xem bài học `tsc` không phải hàng rào |
| `npm run lint` | `0` | Số lỗi không tăng | Đo bằng exit code, không đo bằng số dòng cảnh báo |
| `npm run build` | `0` | Build xong, quy tắc mới có mặt trong `.next/static/css/*.css` | Bản build **local** của tôi, không chứng minh production đang phục vụ nó — `LIM-03` |
| `.ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v5-go-live-08-public-ui-premium/TASK.md` | `0` | `RESULT: PASS. TASK contract is ready for execution.` | Đây là `C-09` |
| `git rev-parse HEAD` và `git rev-parse origin/main` | `0` | Cùng `5c9b88f`, `git log origin/main..HEAD` rỗng, `git diff --cached` rỗng | `R-01` được tôn trọng, không commit không push |
| `git diff --numstat` toàn cây không lọc đường | `0` | Ba file mã của task cộng `public/index.html` `97 59` cộng ba `AUDIT.md` `1 0` | Chạy không lọc đường là cách duy nhất thấy lỗi cắt file `AUDIT.md` |
| `git diff --name-only c6256e7..HEAD` | `0` | Đúng hai đường, cả hai dưới `docs/` | Bất biến `DEC-20` còn đứng, số đo baseline còn hiệu lực |
| Tự tính tương phản từ hex token | `0` | `2.997`, `2.843`, `3.153`, `4.435` khớp HANDOFF tới ba chữ số thập phân; `--color-primary-dark` cho `6.147`, `6.468`, `5.842` | Bốn ô rẻ nhất của bảng `30` dòng, dùng làm phép thử độ tin cậy cho `26` ô còn lại |
| Cắt vùng baseline `189`–`360` rồi so byte | `0` | `9.261` ký tự, sha256 mở đầu `ee75a96491e0`, liền mạch tại dòng `452` | Phải chuẩn hoá CRLF trước khi so, nếu không sẽ ra kết luận sai |
| Đếm phủ `nav-item-lift` theo từng phần tử | `0` | `6` trên `6` phần tử mang transform đều có class, `0` phần tử hở | Đây là cơ chế thật sự đứng sau `AC-10`, không phải khối `prefers-reduced-motion` |
| `grep` runner trình duyệt trong cây | `1` | `0` file `*.test.tsx`, `0` match playwright, puppeteer, cypress, jsdom | Cơ sở để tôi xác nhận `BLK-01` là `ENV_BLOCKED` thật, không phải cái cớ |

Kết quả `verify-audit.ps1` dán ở đây, chạy sau lần ghi cuối, exit `0`:

```
AUDIT CONTRACT CHECK: docs/tasks/hrp-v5-go-live-08-public-ui-premium/AUDIT.md
  against TASK       : docs/tasks/hrp-v5-go-live-08-public-ui-premium/TASK.md

  [OK] Verdict: CONDITIONAL

RESULT: PASS. AUDIT.md has enough evidence for Tier 1 to resolve (no full re-audit needed).
```

## 5. Coverage Gaps

- **Nửa trình duyệt của mười hai AC.** Không có runner nào trong cây chạy được `getComputedStyle`, ảnh chụp, hộp giới hạn, một lần tab hay một lần click thật. Tôi xác nhận `BLK-01` bằng phép đếm của mình chứ không tin lời khai. Hệ quả trực tiếp tới verdict: `PASS` không hợp lệ trong round này, xem `AUD-006`.
- **Bản đã biên dịch là bản local của tôi.** Tôi grep `.next/static/css/*.css` sau khi tự build, nên tôi chứng minh được quy tắc mới sống qua minify, **không** chứng minh được production đang phục vụ chúng. Round này không push nên điều đó là đúng thiết kế, nhưng nó vẫn là một lỗ trong phạm vi kiểm — trùng với `LIM-03` của HANDOFF.
- **Diện mạo thị giác.** Tôi không thấy trang bằng mắt. Mọi phát biểu của tôi về "cao cấp hơn" hay "không còn phẳng" sẽ là bịa, nên tôi không phát biểu. Cái tôi đo được là cơ chế: bóng, hover, focus, transition, tương phản, kích thước chạm — tất cả đã rời khỏi inline style và có mặt trong CSS thật, `style={{` giảm từ `39` xuống `32`.
- **Độc lập.** Tôi viết contract này với vai Tier 1. Xem lại ô `Independence` ở `§0` trước khi đọc `AUD-002`, `AUD-003`, `AUD-004` — cả ba là lỗi của tôi ở tầng 1, và một người khác có thể đánh giá nặng hơn tôi.
- **Ngoài phạm vi task, cần sếp biết.** Ba file `AUDIT.md` của task 02, 04, 13 vẫn mang chữ ký `1 0`. Đây là lần thứ bảy dấu vết của lỗi cắt file xuất hiện. Tôi không chạm vào chúng.

## 6. Verdict và Planner Questions

- **Verdict:** `CONDITIONAL`
- **Reason:** không có finding `P0` hay `P1`, và mọi thứ đo được trong lane này đều lành: bốn gate exit `0` với `1.567` test, `263 0` trên `app/globals.css` nghĩa là `0` dòng bị xoá, khối class chết còn nguyên từng byte, ba bất biến kế thừa đứng vững, `R-01` được tôn trọng, và bảng tương phản `30` dòng của Tier 2 vượt phép thử độ tin cậy tới ba chữ số thập phân. Nhưng `PASS` đòi cả ba điều mà round này không có: mọi AC bắt buộc `PASS` — thực tế `12` AC chỉ đạt nửa tĩnh vì `BLK-01`; không finding `P2` mở — thực tế `AUD-001` đang mở; và mọi check `DONE` — thực tế bốn check `SKIP`, tuy cả bốn có lý do tôi tự kiểm được. Riêng `AC-13` phải nói thẳng: mệnh đề chữ **không đạt**, không phải "đạt một phần cho vui".
- **Planner decisions required:** `AUD-001` là quyết định sản phẩm và là thứ duy nhất tôi xin sếp đọc kỹ — giữ cam thương hiệu `#f26522` làm nền nút chính ở `3.153:1`, hay đổi sang `#a63b00` ở `6.468:1`. `AUD-002`, `AUD-003`, `AUD-004` là ba lỗi contract của Tier 1 cần sửa văn bản, không cần Tier 2 làm lại mã. `AUD-005` là ba con số HANDOFF khai lệch, tôi nghiêng về ghi nhận rồi bỏ qua. `AUD-006` cần chọn giữa waiver `OWNER_PENDING` với bốn trường đầy đủ, hay một task hạ tầng test trình duyệt.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `AUD-001` | `N/A` mới mở | `OPEN` | Chờ Planner chọn một trong ba đường ở `§1` |
| `1` | `AUD-002` | `N/A` mới mở | `OPEN` | Chờ Tier 1 sửa `§4.2`; hệ quả cascade đã đo là `0` trùng selector và `0` trùng tên class |
| `1` | `AUD-003` | `N/A` mới mở | `OPEN` | Chờ Tier 1 sửa `AC-15` hoặc thêm script ở task sau |
| `1` | `AUD-004` | `N/A` mới mở | `OPEN` | Chờ Tier 1 thu hẹp `AC-21` hoặc mở rộng `§4.2` |
| `1` | `AUD-005` | `N/A` mới mở | `OPEN` | Chờ Planner quyết đòi sửa số hay `ACCEPT_FIX` mức báo cáo |
| `1` | `AUD-006` | `N/A` mới mở | `OPEN` | Chờ Planner chọn waiver hay task hạ tầng test |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
