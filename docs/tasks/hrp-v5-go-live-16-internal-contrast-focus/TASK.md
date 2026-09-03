# TASK: hrp-v5-go-live-16-internal-contrast-focus

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-16-internal-contrast-focus` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — independent auditor |
| Baseline | `e4d18fe` |
| Modules | `app/worker/page.tsx`, `app/ctv/page.tsx`, `app/login/login-form.tsx`, `src/shared/ui/data-table/data-table.tsx`, `src/shared/ui/entity-card/entity-card.tsx`, `src/shared/ui/internal-contrast.static.test.ts` |
| ADR references | `hrp-v5-go-live-15-public-contrast-aa` `Q-03` và `Q-04` — hai câu hỏi mở mà task này đóng, kèm hai con số của chúng đã được đo lại và bác bỏ ở `EV-10`; `hrp-v5-go-live-08-public-ui-premium` yêu cầu thứ mười ba — nguồn của token `--color-focus-ring` |
| Current execution round | `1` |
| Current audit round | `1` |
| Next gate | Audit round `1` BỊ TRẢ, lý do ở §9. Giao lại `/audit` cho Tier 3 làm round `2`, và đọc `PLN-23` cùng `PLN-24` TRƯỚC khi đo vì hai AC đã có phương pháp thay thế. Tier 2 không có việc |
| Updated | `2026-09-03 17:05 Asia/Bangkok` |

Task này đóng hai câu hỏi mở mà `hrp-v5-go-live-15-public-contrast-aa` cố ý để lại: `Q-03` về chữ trượt ngưỡng ở bề mặt nội bộ, và `Q-04` về mười hai chỗ `outline-none` chưa có vòng focus thay thế.

Cả hai con số trong hai câu hỏi đó **đều sai**, và task này ghi rõ sai ở đâu thay vì chép lại. `Q-03` viết *"khoảng `41` chỗ trượt ngưỡng ở tám trang admin"*. Đo lại trên baseline: **ba** chỗ, và **không** chỗ nào nằm trong `app/admin/`. `Q-04` viết *"mười hai chỗ `outline-none`"*. Đo lại: **năm** chỗ thật sự thiếu chỉ báo focus. Nguyên nhân của cả hai con số phồng lên nằm ở `EV-10`.

## 1. Outcome

### User-visible outcome

1. Ở trang `worker`, hai dòng chữ nhỏ đang gần như vô hình trên thẻ trắng (`2.564:1`) trở nên đọc được, đạt `9.383:1`.
2. Ở trang `ctv`, con số nợ hoa hồng — chữ đậm `18px` trên panel đỏ nhạt — lên từ `4.415:1` thành `5.906:1`.
3. Ở trang đăng nhập, hai ô nhập tên và mật khẩu **có vòng focus thấy được**. Hiện tại chúng không có chỉ báo focus nào: người dùng bàn phím không biết con trỏ đang ở đâu trên chính trang đăng nhập.
4. Hai primitive dùng chung nhận cùng một mẫu vòng focus, nên trang đầu tiên nhập chúng về sau không thừa kế lỗi.
5. Một hàng rào tĩnh mới đo tương phản của ba trang nội bộ trên **nền thật của từng chỗ**, nên nếu ai đó dán lại một hex mờ thì test ĐỎ ngay.

### Non-goals

- Không sửa ba icon thiếu `aria-hidden` ở `GlobalNavbar.tsx`: đã nằm trong `RQ-08` của contract 15.
- Không chạm `app/(portal)/page.tsx`. Chỗ `:1017` đã được contract 15 miễn trừ ở `EV-18` vì icon đó đã có `aria-hidden="true"`.
- Không chạm bề mặt công khai và `GlobalNavbar`: đó là phạm vi của contract 15.
- Không đổi giá trị bất kỳ token nào trong `@theme`. Không thêm token màu mới.
- Không sửa tám chỗ đã ĐẠT ngưỡng. Danh sách kèm số đo ở `EV-06`.
- Không sửa bản `@theme` chưa commit đang nằm trong worktree. Đó là việc của luồng khác, xem `RISK-01`.
- Không dựng trình chạy test trên trình duyệt. Mọi phép đo ở đây là tĩnh.

## 2. Evidence và Baseline

Mọi tỉ số dưới đây đo trên `git show e4d18fe:path`, **không** đo trên worktree. Lý do bắt buộc phải nói rõ điều này nằm ở `RISK-01`. Cả năm tệp mục tiêu đã kiểm là sạch, tức worktree bằng baseline.

| ID | Nguồn | Điều đã đo | Vì sao nó quyết định thiết kế |
|---|---|---|---|
| `EV-01` | `app/worker/page.tsx:341` và `:358` | Cả hai là `style={{ color: '#94a3b8' }}` trên thẻ có nền literal `background: 'white'` đặt ở `:296`. Đo `#94a3b8` trên `#ffffff` được `2.564:1`. Cả hai mang `className="text-xs"`, tức `12px`, là chữ THƯỜNG nên ngưỡng áp là `4.5:1` | Trượt `1.936` — biên độ lớn nhất trong toàn repo. Nền là literal `'white'` chứ không phải token, nên số này không đổi theo bất kỳ thay đổi `@theme` nào |
| `EV-02` | `app/ctv/page.tsx:273`, nền đọc ở `:266` | `style={{ color: '#dc2626' }}` trên `style={{ background: '#fef2f2' }}`. Cả hai là literal. Đo `4.415:1`, dưới `4.5:1`. Chữ là `font-bold text-lg` tức `18px` đậm, vẫn KHÔNG đạt định nghĩa chữ lớn (`18.66px` đậm) nên ngưỡng là `4.5:1` | Trượt đúng `0.085`. Phải ghi bằng ngưỡng `4.5:1`. Ghi nó thành chữ lớn để cho qua là ghi sai ngưỡng và HANDOFF bị trả |
| `EV-03` | `app/login/login-form.tsx:94` và `:116` | Cả hai ô nhập mang `className="block w-full rounded-xl px-4 py-3 text-sm outline-none"` cộng một `style` inline chỉ đặt `border`, `background`, `color`, `borderRadius`. **Không có** `focus:`, không `ring`, không `outline` thay thế, không handler `onFocus` | `outline-none` mà không có gì thay vào là mất trắng chỉ báo focus, vi phạm WCAG `2.4.7`. Đây là trang ĐĂNG NHẬP, tức trang mà người dùng bàn phím gặp đầu tiên |
| `EV-04` | `src/shared/ui/data-table/data-table.tsx:123` | `focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200`. Vòng ring tồn tại nhưng màu `#fed7aa` đo được sàn `1.034:1` trên nền sáng nhất tới tối nhất của hệ; viền `#fb923c` sàn `1.617:1` | Đây là dạng lỗi khó thấy nhất: vòng focus CÓ trong mã, nên grep `outline-none` thấy nó đã được xử lý, mà mắt thì không thấy gì. Ngưỡng thành phần là `3:1` theo WCAG `1.4.11` |
| `EV-05` | `data-table.tsx:334` và `src/shared/ui/entity-card/entity-card.tsx:223` | `:334` chỉ có `focus:border-orange-400 focus:outline-none`, không ring. `entity-card.tsx:223` là `className="block w-full text-left focus:outline-none"`, không có gì thay thế | Hai chỗ này cùng họ với `EV-03`: bỏ outline mặc định mà không bù |
| `EV-06` | `app/worker/page.tsx`, `app/ctv/page.tsx`, `app/vendor/page.tsx` | Tám chỗ ĐẠT, ghi lại để không ai mở lại: `#64748b` trên `#ffffff` = `4.759:1` ở `worker:302,349,353,361,383`; `#dc2626` trên `#ffffff` = `4.829:1` ở `worker:362`; `#dc2626` trên `var(--color-surface-container-lowest)` = `#ffffff` = `4.829:1` ở `vendor:245` | Contract 15 `Q-03` liệt kê `#64748b` là `4.291:1` và `#dc2626` là `4.355:1`, tức TRƯỢT. Cả hai số đó đo trên một nền không phải nền thật của chúng. Trên nền thật cả tám ĐẠT |
| `EV-07` | `app/worker/page.tsx:331` | `style={{ color: 'var(--on-surface-variant, #64748b)' }}`. Token `--on-surface-variant` CÓ tồn tại qua lớp tương thích ở `app/globals.css`, phân giải ra `#594138` và đo `9.383:1`. Nhánh dự phòng `#64748b` **không bao giờ** chạy | Máy quét cũ đếm chỗ này là lỗi vì nó chỉ thấy chuỗi hex trong nguồn. Một `var()` có dự phòng chỉ là lỗi khi token chính KHÔNG được khai báo |
| `EV-08` | `app/globals.css` khối `@theme` trên baseline | Ba token thay thế đã tồn tại, không phải màu tự nghĩ: `--color-on-surface-variant` `#594138` sàn `6.703:1`, `--color-error` `#ba1a1a` sàn `4.615:1`, và `--color-focus-ring` phân giải ra `#a63b00` sàn `4.620:1`. Sàn đo trên BẢY nền thật của hệ, từ `#ffffff` tới `#dadad8` | Một token cho chữ mờ, một cho chữ lỗi, một cho vòng focus — cả ba đạt trên MỌI nền, nên bản sửa không phải chọn màu theo từng chỗ |
| `EV-09` | `app/globals.css` khối `@theme` | `--color-outline` phân giải `#8d7166`, sàn `3.201:1` | Đạt ngưỡng thành phần `3:1` nhưng KHÔNG đạt `4.5:1`. Cấm dùng làm màu CHỮ. Ghi ra đây vì tên token nghe như một màu chữ mờ hợp lý |
| `EV-10` | `scratch/ui-contrast-scan.py` | Máy quét sinh ra hai con số của `Q-03` và `Q-04` có ba khuyết điểm: nó ghim sẵn bốn nền và so mọi màu chữ với nền TỐI NHẤT trong bốn nền đó thay vì đọc nền thật của thẻ bao quanh; nó đếm mọi chuỗi hex kể cả hex nằm trong nhánh dự phòng của `var()`; và nó đếm `outline-none` mà không kiểm xem có `ring` bù hay không | Đây là lý do `41` thành `3` và `12` thành `5`. Máy quét là một cái SÀNG cố ý báo thừa, không phải một phép ĐO. Đọc số của nó như số lỗi là đọc sai công cụ. Hàng rào ở `RQ-08` sinh ra để thay nó |
| `EV-11` | `grep -rn "from '.*shared/ui" app/ src/` | Trả về RỖNG. `src/shared/ui/` không có `index.ts`. Không tệp nào nhập `data-table` hay `entity-card` | Ba trong năm chỗ focus nằm trong mã CHƯA có người dùng. Điều này hạ mức của `RQ-04` xuống `Should`, và lý do giữ nó lại nằm ở `DEC-04` |

## 3. Decisions và Assumptions

| ID | Quyết định | Lý do |
|---|---|---|
| `DEC-01` | Chữ mờ trượt ngưỡng đổi sang `var(--color-on-surface-variant)`, không sang một hex mới | Token đã tồn tại, sàn `6.703:1` trên mọi nền, và nó chính là role màu dành cho chữ phụ trong hệ Material mà repo đang dùng. Xem `EV-08` |
| `DEC-02` | Chữ lỗi trượt ngưỡng đổi sang `var(--color-error)`, không sang `#b91c1c` hay một sắc đỏ tự chọn | Cùng lý do `DEC-01`. `#ba1a1a` cho `5.906:1` trên `#fef2f2`, dư `1.406` |
| `DEC-03` | Vòng focus dùng `var(--color-focus-ring)` cho CẢ năm chỗ, không mỗi chỗ một màu | Token này do yêu cầu thứ mười ba của go-live-08 tạo ra đúng để không ai phải chọn lại màu vòng focus. Sàn `4.620:1`, dư `1.620` so với ngưỡng `3:1`. Repo đã có sẵn `focus:ring-1 focus:ring-primary` ở sáu chỗ trong `app/(portal)/home/page.tsx` — mẫu đó ĐẠT và là mẫu để nhân bản |
| `DEC-04` | Ba chỗ focus trong hai primitive chưa có người nhập vẫn sửa, nhưng ở mức `Should` chứ không `Must` | `EV-11` cho thấy chúng chưa có người dùng, nên không có ai đang chịu lỗi. Nhưng chúng là KHUÔN mà trang đầu tiên nhập chúng sẽ chép — sửa bây giờ tốn ba dòng, sửa sau khi đã nhân bản thì tốn cả một lượt quét. Nếu Tier 2 hết thời gian, bỏ `RQ-04` mà giữ `RQ-01` tới `RQ-03` là một kết cục hợp lệ, phải ghi rõ vào HANDOFF |
| `DEC-05` | CẤM đổi giá trị bất kỳ token nào trong `@theme` | Giống `DEC-03` của contract 15. Đổi một dòng token trông sạch hơn sửa ba điểm dùng, nhưng nó đổi màu ở những trang không ai đo và không test nào bắt |
| `DEC-06` | Hàng rào mới là một tệp test tĩnh trong `src/shared/ui/`, KHÔNG phải bản sửa của `scratch/ui-contrast-scan.py` | Một script trong `scratch/` không chạy trong `npm run test:unit`, nên nó không chặn được gì. Hàng rào phải nằm trong lane test canonical mới có răng. Xem `EV-10` |
| `DEC-07` | Hàng rào mới đọc nền THẬT của thẻ bao quanh, và loại `--color-surface-tint` khỏi tập nền | `--color-surface-tint` bắt đầu bằng `--color-surface` nhưng nó là màu tint cho độ nâng, không phải một nền. Gộp nó vào tập nền kéo sàn của mọi phép đo xuống `1.000` và sinh ra báo động giả hàng loạt. Đây là một bẫy đã xảy ra thật khi Tier 1 đo lần đầu |
| `DEC-08` | Task này KHÔNG mở lại tám chỗ ở `EV-06` dù `Q-03` của contract 15 gọi tên chúng | Trên nền thật cả tám đạt. Sửa chúng là đổi màu ở nơi không có lỗi, và làm HANDOFF chứa một diff không ai giải thích được |
| `ASM-01` | Giả định `text-xs` là `12px` và `text-lg` là `18px` theo mặc định Tailwind, vì `@theme` trên baseline không khai báo bất kỳ khóa `--text-*` nào | Nếu một round sau thêm khóa `--text-*` vào `@theme` thì ngưỡng của `EV-02` phải tính lại: `18.66px` đậm là biên giữa chữ thường và chữ lớn |

## 4. Contract

### 4.1 Requirements

| ID | Yêu cầu | Mức | Nguồn | Dấu hiệu FAIL |
|---|---|---|---|---|
| `RQ-01` | `app/worker/page.tsx:341` và `:358` không còn `#94a3b8`. Màu chữ hai chỗ đó đạt tối thiểu `4.5:1` trên nền `#ffffff` của thẻ | Must | `EV-01`, `DEC-01` | Còn chuỗi `#94a3b8` trong tệp, hoặc màu mới dưới `4.5:1` trên `#ffffff` |
| `RQ-02` | `app/ctv/page.tsx:273` không còn `#dc2626`. Màu chữ đạt tối thiểu `4.5:1` trên nền `#fef2f2` | Must | `EV-02`, `DEC-02` | Màu mới dưới `4.5:1` trên `#fef2f2`, hoặc đổi luôn nền panel — nền không thuộc phạm vi |
| `RQ-03` | Hai ô nhập ở `app/login/login-form.tsx:94` và `:116` có chỉ báo focus thấy được, dày tối thiểu `2px`, màu `var(--color-focus-ring)`, đạt tối thiểu `3:1` trên nền của chính ô nhập | Must | `EV-03`, `DEC-03` | Còn `outline-none` trần mà không có `focus:ring` hoặc `focus-visible` bù. Sửa một ô và bỏ ô kia |
| `RQ-04` | `data-table.tsx:123` đổi màu ring sang `var(--color-focus-ring)`; `:334` và `entity-card.tsx:223` nhận cùng mẫu ring đó | Should | `EV-04`, `EV-05`, `DEC-04` | Ring còn màu `orange-200` hoặc `orange-400`. Bỏ `RQ-04` mà KHÔNG ghi lý do vào HANDOFF |
| `RQ-05` | Tám chỗ ở `EV-06` giữ nguyên từng byte. HANDOFF ghi lại tám tỉ số đó để vòng audit không đo lại | Must | `EV-06`, `DEC-08` | `git diff` cho thấy một trong tám chỗ đó đổi |
| `RQ-06` | Không dòng nào trong khối `@theme` của `app/globals.css` đổi giá trị. Không tên token màu mới ở bất kỳ tệp nào trong `Modules` | Must | `DEC-05` | Một dòng token đổi giá trị là BLOCK toàn task, kể cả khi mọi số đo khác đạt |
| `RQ-07` | Không chạm `app/(portal)/page.tsx`, `app/components/GlobalNavbar.tsx`, và mọi tệp trong `Modules` của contract 15 | Must | §1 Non-goals | Một byte đổi trong phạm vi của 15 làm hai task tranh nhau cùng một dòng |
| `RQ-08` | Thêm `src/shared/ui/internal-contrast.static.test.ts` chạy trong `npm run test:unit`. Nó đo mọi cặp chữ-nền trong `app/worker/page.tsx`, `app/ctv/page.tsx`, `app/login/login-form.tsx` bằng nền THẬT của thẻ bao quanh, và ĐỎ khi một cặp dưới ngưỡng của cỡ chữ đó | Must | `EV-10`, `DEC-06` | Hàng rào chỉ liệt kê ba chỗ mà round này vừa sửa. Đó đúng là điểm mù đã để `Q-03` phồng lên và để nút chính của go-live-08 sống ở `3.153:1` |
| `RQ-09` | Hàng rào lấy tập nền TỪ khối `@theme` chứ không ghim sẵn, loại `--color-surface-tint` khỏi tập nền, và coi `var(--x, hex)` là ĐẠT khi `--x` có khai báo | Must | `EV-07`, `DEC-07` | Ghim sẵn danh sách nền trong tệp test. Báo `worker:331` là lỗi |
| `RQ-10` | Hàng rào có một fixture âm: một cặp màu bịa dưới ngưỡng, và test chứng minh hàng rào ĐỎ với cặp đó | Must | `EV-10` | Không có fixture âm. Một hàng rào không chứng minh được nó biết ĐỎ thì không phân biệt được với một hàng rào luôn xanh |
| `RQ-11` | `npm run test:unit` và `npm run typecheck` cùng exit `0`. HANDOFF dán nguyên văn dòng tổng kết và mã thoát của cả hai | Must | Iron Rule 4 | Dán lại con số cũ. Chạy `npx vitest run` trần thay vì `npm run test:unit` — lane đó đọc `DATABASE_URL` từ `.env` là PRODUCTION và fail oan 24 test |
| `RQ-12` | Không `git commit`, không `git push`, không deploy. Chỉ ghi tệp và ghi HANDOFF | Must | `R-01` | Một commit hoặc một push từ Tier 2 là BLOCK, bất kể mã đúng hay sai |

### 4.2 Scope boundaries

Được sửa, đúng sáu tệp:

- `app/worker/page.tsx` — chỉ hai dòng `:341` và `:358`.
- `app/ctv/page.tsx` — chỉ dòng `:273`.
- `app/login/login-form.tsx` — chỉ hai `className` ở `:94` và `:116`.
- `src/shared/ui/data-table/data-table.tsx` — chỉ hai `className` ở `:123` và `:334`.
- `src/shared/ui/entity-card/entity-card.tsx` — chỉ dòng `:223`.
- `src/shared/ui/internal-contrast.static.test.ts` — tệp MỚI.

Cấm chạm, ngoài phạm vi:

- `app/globals.css` — không một byte. Task này không cần token mới; cả ba token cần dùng đã có.
- `app/(portal)/page.tsx`, `app/components/GlobalNavbar.tsx`, `app/(jobs)/track/page.tsx`, và mọi tệp còn lại trong `Modules` của contract 15.
- `app/vendor/page.tsx` — đã đo, đạt `4.829:1`, không có việc gì làm.
- `app/admin/` — máy quét không tìm thấy một chỗ trượt nào ở đây. `Q-03` của contract 15 nói *"tám trang admin"* là sai địa chỉ.
- `src/domains/job-board/public-ui-premium.static.test.ts` — hàng rào của go-live-08, do contract 15 sửa.
- `new-ui/` — thư mục chưa theo dõi của luồng khác. Xem `RISK-01`.

### 4.3 Data, State, Permission và Interface Rules

- Task này không chạm DB, không chạm API, không chạm RLS, không chạm quyền. Không có bước nào cần `DATABASE_URL`. Nếu một bước nào đó đòi kết nối DB thì bước đó viết sai, không phải môi trường thiếu.
- Không đổi khóa DTO, không đổi chữ ký hàm công khai, không đổi tên props. Ba primitive giữ nguyên bề mặt gọi.
- Không log, không commit secret, token, password, connection string hay PII thật. Trang `worker` và `ctv` hiển thị số tiền và tên người thật khi chạy với dữ liệu live: **không chụp ảnh, không dán giá trị thật vào HANDOFF**. Mô tả bằng lời và bằng tỉ số màu là đủ.
- Cấm `git add -A` và `git add .`. Chỉ stage path trong `§4.2` nếu về sau có lệnh commit từ Tier 1.

## 5. Execution Plan

| ID | Bước | Ra sản phẩm gì |
|---|---|---|
| `STEP-01` | Kiểm `git status --porcelain app/globals.css` phải RỖNG trước khi làm gì. Nếu không rỗng thì DỪNG và ghi `BLOCKED` vào HANDOFF kèm nguyên văn output — đó là `RISK-01`, không phải lỗi của Tier 2 | Một dòng chứng cứ đầu HANDOFF, kèm mã thoát |
| `STEP-02` | Đọc năm tệp mục tiêu ở đúng các dòng `§4.2` gọi tên, xác nhận từng chỗ lỗi còn nguyên trạng như `EV-01` tới `EV-05` mô tả | Năm đoạn nguyên văn trong HANDOFF |
| `STEP-03` | Sửa `app/worker/page.tsx:341` và `:358` theo `RQ-01` | Diff hai dòng |
| `STEP-04` | Sửa `app/ctv/page.tsx:273` theo `RQ-02` | Diff một dòng |
| `STEP-05` | Sửa hai `className` ô nhập ở `app/login/login-form.tsx` theo `RQ-03` | Diff hai dòng |
| `STEP-06` | Sửa ba chỗ ring trong hai primitive theo `RQ-04`. Nếu bỏ bước này thì ghi lý do vào HANDOFF theo `DEC-04` | Diff ba dòng, hoặc một đoạn nêu lý do bỏ |
| `STEP-07` | Viết `src/shared/ui/internal-contrast.static.test.ts` theo `RQ-08`, `RQ-09`, `RQ-10` | Tệp test mới cộng fixture âm |
| `STEP-08` | Chạy `npm run test:unit` rồi `npm run typecheck`. Dán nguyên văn dòng tổng kết và mã thoát của cả hai | Hai khối output kèm hai mã thoát |
| `STEP-09` | Chạy `git diff --stat` trên đúng sáu path `§4.2` và xác nhận không path nào khác đổi, đặc biệt `app/globals.css` | Một khối `--stat` |
| `STEP-10` | Viết `HANDOFF.md`. KHÔNG commit, KHÔNG push | `HANDOFF.md` |

## 6. Acceptance Criteria

| ID | Cách kiểm | Ngưỡng đạt |
|---|---|---|
| `AC-01` | `rg -n "94a3b8" app/worker/page.tsx` rồi đo màu mới trên `#ffffff` | Không dòng nào còn `#94a3b8`. Hai chỗ đạt tối thiểu `4.5:1`. Dùng `var(--color-on-surface-variant)` cho `9.383:1`. Hiện trạng `2.564:1` |
| `AC-02` | Đọc `app/ctv/page.tsx:273` cộng nền ở `:266`, rồi đo | Không dưới `4.5:1` trên `#fef2f2`. Dùng `var(--color-error)` cho `5.906:1`. Hiện trạng `4.415:1`. Nền vẫn là `#fef2f2` |
| `AC-03` | Đọc hai `className` ở `app/login/login-form.tsx:94` và `:116`, rồi đo màu chỉ báo focus trên nền của ô nhập | CẢ HAI có chỉ báo focus dày tối thiểu `2px` đạt tối thiểu `3:1`. `var(--color-focus-ring)` cho `4.620:1` ở sàn. Một ô còn `outline-none` trần là FAIL |
| `AC-04` | Đọc `data-table.tsx:123`, `:334`, `entity-card.tsx:223` | Ba chỗ dùng `var(--color-focus-ring)` và đạt tối thiểu `3:1`. Hiện trạng `1.034:1` và `1.617:1`. Nếu `RQ-04` bị bỏ thì AC này đạt bằng một đoạn lý do trong HANDOFF theo `DEC-04`, không đạt bằng im lặng |
| `AC-05` | `git diff app/worker/page.tsx app/ctv/page.tsx app/vendor/page.tsx` | Tám chỗ ở `EV-06` không xuất hiện trong diff. HANDOFF có bảng tám tỉ số. `app/vendor/page.tsx` không có diff nào |
| `AC-06` | `git diff --stat app/globals.css` | Rỗng. Không một byte. Một dòng token đổi giá trị là BLOCK toàn task |
| `AC-07` | `git diff --stat` toàn cây, lọc theo path | Đúng sáu path của `§4.2` xuất hiện, không hơn. Không path nào thuộc `Modules` của contract 15. `new-ui/` không xuất hiện |
| `AC-08` | Đọc `src/shared/ui/internal-contrast.static.test.ts` | Hàng rào phủ CẢ BA tệp `worker`, `ctv`, `login` theo cặp chữ-nền, không chỉ ba dòng vừa sửa. Nếu nó chỉ liệt kê chỗ vừa sửa thì FAIL, vì đó đúng là điểm mù ở `EV-10` |
| `AC-09` | Đọc cách hàng rào lấy tập nền và cách nó xử `var()` | Tập nền đọc từ `@theme` trong `app/globals.css`, KHÔNG ghim sẵn. `--color-surface-tint` bị loại. `var(--x, hex)` có `--x` khai báo được coi là ĐẠT. Chạy hàng rào phải KHÔNG báo `worker:331` là lỗi |
| `AC-10` | Chạy hàng rào với fixture âm bật lên | Hàng rào ĐỎ với cặp bịa dưới ngưỡng, XANH khi bỏ cặp đó. Không có fixture âm là FAIL |
| `AC-11` | `npm run test:unit` rồi `npm run typecheck` | Cả hai exit `0`. Dòng tổng kết nguyên văn có trong HANDOFF, kèm số test mới của `RQ-08`. Nếu `test:unit` đỏ vì một tệp NGOÀI sáu path này thì ghi `BLOCKED` kèm nguyên văn, đừng sửa tệp ngoài phạm vi |
| `AC-12` | `git log --oneline -1` và `git status --porcelain` sau khi Tier 2 xong | HEAD không đổi so với `e4d18fe`. Sáu path ở trạng thái chưa commit. Một commit hoặc một push là FAIL |

### 6.1 Traceability

| RQ | STEP | AC |
|---|---|---|
| `RQ-01` | `STEP-03` | `AC-01` |
| `RQ-02` | `STEP-04` | `AC-02` |
| `RQ-03` | `STEP-05` | `AC-03` |
| `RQ-04` | `STEP-06` | `AC-04` |
| `RQ-05` | `STEP-02` | `AC-05` |
| `RQ-06` | `STEP-09` | `AC-06` |
| `RQ-07` | `STEP-09` | `AC-07` |
| `RQ-08` | `STEP-07` | `AC-08` |
| `RQ-09` | `STEP-07` | `AC-09` |
| `RQ-10` | `STEP-07` | `AC-10` |
| `RQ-11` | `STEP-08` | `AC-11` |
| `RQ-12` | `STEP-10` | `AC-12` |

## 7. Risk và Rollback

| ID | Rủi ro | Vì sao nó thật | Chặn bằng gì | Cách lùi |
|---|---|---|---|---|
| `RISK-01` | **Worktree đang có một bản sửa `@theme` CHƯA COMMIT của luồng khác, và nó đang làm `npm run test:unit` ĐỎ.** Đo được: `git diff --stat app/globals.css` cho `49 insertions, 112 deletions`; bản sửa đó XÓA `28` token đang được khai báo trên baseline, trong đó có `--color-focus-ring`, `--color-primary-soft`, `--shadow-card`, `--t-fast`, `--ease-out`, năm khóa `--radius-*`, năm khóa `--spacing-*` và bốn khóa `--font-*`. Đếm được `72` tham chiếu `var()` chết còn lại trong `app/globals.css` cộng `34` tham chiếu chết trong `.tsx`, tổng `106`. Chạy thật `npm run test:unit` trên `src/domains/job-board/public-ui-premium.static.test.ts` cho `9 failed, 53 passed`, exit `1` | `var()` trỏ một custom property KHÔNG được khai báo làm cả khai báo đó vô hiệu ở thời điểm tính giá trị — nền trong suốt, viền mất, bóng mất, chuyển động mất. Chính `app/globals.css` có một khối chú thích của go-live-10 giải thích đúng cái bẫy này. Nếu ai commit trạng thái này rồi push `main` thì production nhận một hệ thiết kế chết một phần. Task này KHÔNG được sửa nó: đó là thay đổi chưa commit của luồng khác | `STEP-01` và `AC-06`: Tier 2 phải DỪNG nếu `git status --porcelain app/globals.css` không rỗng. Owner quyết số phận bản sửa đó TRƯỚC khi `/code` được giao | Không lùi gì. Việc của Owner, không phải của task này |
| `RISK-02` | Tier 2 đổi giá trị token trong `@theme` cho gọn thay vì sửa ba điểm dùng | Một dòng, và màu đổi ở những trang không ai đo. Không test nào trong repo bắt được | `RQ-06`, `AC-06` | `git restore app/globals.css`. Một dòng, không mất việc khác |
| `RISK-03` | Hàng rào mới chỉ liệt kê ba chỗ mà round này vừa sửa | Đây đúng là điểm mù đã để nút chính của go-live-08 sống ở `3.153:1` trong khi bộ test của chính nó xanh `100%`. Câu hỏi sàng lọc: hàng rào này liệt kê cái nó BẢO VỆ, hay chỉ liệt kê cái tác giả của nó VỪA THÊM | `RQ-08`, `AC-08` | Bỏ tệp test mới, viết lại. Không ảnh hưởng ba bản sửa màu |
| `RISK-04` | Hàng rào gộp `--color-surface-tint` vào tập nền | Token đó bắt đầu bằng `--color-surface` nhưng là màu tint cho độ nâng. Gộp vào kéo sàn mọi phép đo xuống `1.000` và sinh báo động giả hàng loạt. Đã xảy ra thật với Tier 1 ở lượt đo đầu | `RQ-09`, `AC-09` | Một dòng lọc trong tệp test |
| `RISK-05` | Tier 2 sửa cả tám chỗ ở `EV-06` vì `Q-03` của contract 15 gọi tên chúng | Contract 15 nói chúng trượt. Trên nền thật chúng đạt. Sửa là tạo một diff không ai giải thích được và mở đường cho vòng audit đòi đo lại | `RQ-05`, `AC-05`, `DEC-08` | `git restore` hai tệp |
| `RISK-06` | Tier 2 chạy `npx vitest run` trần thay vì `npm run test:unit` | Lane trần đọc `DATABASE_URL` từ `.env` là PRODUCTION và fail oan `24` test component, làm HANDOFF trông như hồi quy | `RQ-11`, `AC-11` | Chạy lại đúng lane |
| `RISK-07` | `npm run test:unit` đỏ vì `RISK-01` chứ không vì mã của round này, và Tier 2 đi sửa tệp ngoài phạm vi để làm nó xanh | Một HANDOFF xanh đạt được bằng cách sửa việc của luồng khác là một HANDOFF không thể audit | `STEP-01`, `AC-11` — kết cục đúng là `BLOCKED` kèm nguyên văn output | Không có gì để lùi nếu `STEP-01` được tôn trọng |

## 8. Open Questions

| ID | Câu hỏi | Ai trả lời | Trạng thái |
|---|---|---|---|
| `Q-01` | Bản sửa `@theme` chưa commit trong worktree: hoàn thiện nó thành một task riêng, hay bỏ nó đi, hay để nguyên đó | Owner | MỞ — chặn `STEP-01` của task này VÀ chặn việc giao `/code` cho contract 15 |
| `Q-02` | `src/shared/ui/data-table/` và `src/shared/ui/entity-card/` không có tệp nào nhập. Chúng là mã chết, hay là primitive dựng trước cho một lượt refactor chưa tới | Owner hoặc Tier 1 ở một lượt kiểm kê sau | MỞ có chủ ý — không chặn task này. `DEC-04` đã xử bằng cách hạ `RQ-04` xuống `Should` |
| `Q-03` | `scratch/ui-contrast-scan.py` có nên xóa sau khi `RQ-08` có hàng rào thật hay không | Tier 1, sau khi task này ACCEPTED | HOÃN có chủ ý — giữ script làm sàng thăm dò thì vô hại, miễn không ai đọc số của nó thành số lỗi |
| `Q-04` | Mười hai chỗ `outline-none` mà `Q-04` của contract 15 nêu: bảy chỗ còn lại sau khi trừ năm chỗ của task này nằm ở đâu và có thật không | Tier 1, ở một lượt quét sau bằng chính hàng rào của `RQ-08` | HOÃN có chủ ý — con số `12` đến từ cùng cái sàng đã làm `41` phồng lên, xem `EV-10` |

## 9. Planner Resolution

### Round 1 — audit BỊ TRẢ, và hai defect là của CONTRACT chứ không của Tier 2 (03/09/2026)

Tier 2 giao round `1`, `HANDOFF.md` kết `READY_FOR_AUDIT`. Tier 3 ghi `AUDIT.md` `4592` byte, verdict `BLOCKED` vì `AC-11`, và `verify-audit.ps1` trả `PASS WITH WARNINGS` exit `0`. Tier 1 tự chạy lại toàn bộ phép đo và **TRẢ bản audit**, đồng thời tự sửa hai defect của chính contract này.

**`PLN-23` — `AC-11` KHÔNG THỂ THOẢ trên cây này, và đó là lỗi của tôi.** Lời văn của `AC-11` đòi `npm run test:unit` và `npm run typecheck` cả hai exit `0`, rồi mở một cửa `BLOCKED` **chỉ cho `test:unit`** — không mở cho `typecheck`. Nhưng `tsconfig.json` khai `include` là `**/*.ts` cộng `**/*.tsx` và `exclude` chỉ có `node_modules`, nên `tsc` thu cả `new-ui/`, một thư mục **chưa từng được commit** (`git log -- new-ui/` RỖNG, `git ls-tree HEAD -- new-ui` rỗng, `git ls-files new-ui` đếm `0`) thuộc luồng `ui-01` và ghi lúc `2026-09-02 23:19:10`, tức TRƯỚC round này. Vì vậy nửa `typecheck` của `AC-11` đã đỏ ở baseline và không một Tier 2 nào làm nó xanh được mà không phạm `§4.2`. Tệ hơn: chính `AC-07` của tôi gọi tên `new-ui/`, nghĩa là tôi BIẾT thư mục đó tồn tại lúc viết contract mà vẫn không mở cửa cho `typecheck`.

**Phương pháp đo đúng cho `AC-11`, thay cho lời văn cũ:** `npm run test:unit` phải exit `0`; còn `typecheck` PASS khi và chỉ khi **mọi** dòng `error TS` của nó quy được về một đường dẫn chưa được git theo dõi và nằm ngoài `§4.2`. Phép đo phụ bắt buộc: chạy `tsc --noEmit` với một config tạm chỉ thêm `new-ui` vào `exclude`, và nó phải exit `0`.

**`PLN-24` — `AC-05`, `AC-06`, `AC-07` đo bằng một dụng cụ TRẢ RỖNG trên cây này.** Cả ba viết `git diff` TRẦN. Tier 2 ký gửi bản giao trong INDEX suốt cả round, nên `git diff` trần không thấy sáu tệp mã, và một ô Evidence ghi "`6 files changed`" từ `git diff --stat --name-only` là bất khả theo hai lẽ: dụng cụ rỗng, và hai cờ đó cùng lúc không in dòng tổng kết nào. Đây đúng lỗi mà contract 15 đã mắc ở ô phạm vi của nó, và bản `verify-task.ps1` đã siết sau đó có `T-03` bắt được nó. **Phương pháp đo đúng:** `git diff --cached --numstat` cộng `git status --porcelain`, hợp hai danh sách. Đo lại bằng dụng cụ đúng: sáu path, `752` dòng thêm và `8` dòng xoá, `app/globals.css` không xuất hiện.

**`PLN-25` — bản audit round 1 BỊ TRẢ, và lý do nặng nhất là một con số được SAO chứ không được ĐO.** `C-08` cùng `§4` của bản audit ghi `1590` test. Tier 1 tự chạy lane: `Test Files 104 passed (104)`, `Tests 1611 passed (1611)`, exit `0`. `1590` là mốc baseline của `hrp-v5-go-live-15-public-contrast-aa`, và hàng rào mới của round này góp đúng `21` test — phép cộng `1590` cộng `21` bằng `1611` khép kín chuỗi và chứng minh `1590` **không quan sát được** trên cây đã audit. Chính `verify-audit.ps1` chỉ vào đó: `S-10` báo *"only 1 number in this audit are not already in TASK or HANDOFF: 1590"*, tức con số ĐỘC LẬP duy nhất của bản audit là con số sai. Cộng thêm ba ô PASS dựng trên dụng cụ rỗng của `PLN-24`, và `§5 Coverage Gaps` chỉ nêu `AC-11` trong khi bốn ô cần nêu. Một điểm phải nói cho chính xác về nhân quả: sau khi ruling này ghi `1590` vào TASK, `S-10` chuyển từ WARN sang FAIL vì mọi con số của bản audit từ nay đều đã có mặt trong TASK hoặc HANDOFF. Cái FAIL đó là HỆ QUẢ CƠ HỌC của chính ruling này, KHÔNG phải một bằng chứng độc lập thứ hai. Bằng chứng độc lập chỉ có một: con số `1611` do Tier 1 tự đo.

**`PLN-26` — phép đo độc lập của Tier 1, và kết luận về Tier 2.** `npm run test:unit` exit `0`, `104` tệp, `1611` test. `npm run typecheck` đỏ với **đúng một** dòng `error TS`, quy về `new-ui/components/JobCard.tsx`, không dòng nào khác. `tsc --noEmit` với `new-ui` bị loại: exit `0`, `0` lỗi. `git diff --cached --numstat` cho đúng sáu path của `§4.2`. **Bản giao của Tier 2 lành về thực chất**, và việc họ TỪ CHỐI sửa tệp ngoài phạm vi rồi khai thành giới hạn là đúng chính chỉ dẫn của `RISK-07`. Vì mọi phép đo mức mã đều ĐẠT, round tiếp theo chỉ tốn Tier 3: `Status` giữ `READY_FOR_EXECUTION`, `Current execution round` giữ `1`, Tier 2 KHÔNG có việc. Ghi `REVISION_REQUIRED` ở đây sẽ ra lệnh sai cho Tier 2.

Một ghi chú vệ sinh không thuộc lỗi của tier nào: `S-16` báo `9` path staged nằm ngoài thư mục task. Sáu trong số đó là bản giao hợp lệ của Tier 2; ba path còn lại là `gate-lib.ps1`, `verify-handoff.ps1`, `verify-pipeline.ps1` của luồng làm gate. Không tier nào được commit ba path ấy kèm artifact của mình.

**`PLN-27` — `AC-12` bất khả thoả với MỌI bản giao đúng quy trình, và đây là lần thứ NĂM tôi viết đúng lỗi này.** `AC-12` ràng buộc tập file chưa commit là "sáu path", nhưng pipeline **BUỘC** Tier 2 ghi `HANDOFF.md` cộng `evidence/`, và cả hai nằm dưới `docs/tasks/hrp-v5-go-live-16-internal-contrast-focus/`. Một Tier 3 đọc đúng mặt chữ phải BLOCK oan. Đúng lỗi mà contract 15 đã mắc ở ô phạm vi cuối của nó, và bản `verify-task.ps1` đã siết có `T-04` bắt được nó. **Phương pháp đo đúng cho `AC-12`:** `HEAD` không đổi so với `e4d18fe`, không có commit mới, và tập path chưa commit chia đúng HAI nhóm — sáu path của `§4.2`, cộng `docs/tasks/hrp-v5-go-live-16-internal-contrast-focus/**`. Xuất hiện nhóm thứ ba là FAIL.

**`PLN-28` — `AC-10` không gọi tên một phép đo nào.** Nó viết một ngưỡng mà không viết cách đo, nên một người thi hành không sinh ra bằng chứng được. **Phương pháp đo đúng:** đọc `src/shared/ui/internal-contrast.static.test.ts` và khẳng định có ít nhất một `it(` chạy detector trên một cặp màu giả dựng trong chính test rồi khẳng định detector BẮT được nó, cộng output của lần chạy hàng rào.

**Vì sao chính `verify-task.ps1` báo ĐỎ trên contract này, và đó KHÔNG phải lỗi của tier nào.** Bản gate trong cây đã cộng `T-01` tới `T-07` **sau** khi contract này được viết. Ba lỗi nó bắt — `T-03` trên `AC-05`, `AC-06`, `AC-07`; `T-04` trên `AC-12`; `T-05` trên `AC-10` — đều là defect của contract, đều do tôi, và đều đã có phương pháp thay thế ở `PLN-24`, `PLN-27`, `PLN-28`. Theo `PLN-17` của `hrp-v5-go-live-09-public-board-architecture`, defect contract tìm thấy SAU khi một bản audit đã chạy thì ghi thành ruling append-only ở ĐÚNG version cũ và **KHÔNG bump**, vì `verify-audit.ps1` so spec version giữa TASK và AUDIT nên một lần bump sẽ làm gate FAIL oan và đốt thêm một round. Vì vậy lời văn của năm ô `AC` ấy giữ nguyên để còn đọc được cái Tier 3 đã audit; điều CHI PHỐI là phương pháp ở các ruling. Hệ quả kéo theo: `verify-handoff.ps1` báo `H-04` đỏ trên `HANDOFF.md` của round 1 **chỉ vì** gate contract đỏ — Tier 2 khai đúng, và round 2 không phải xử lý điều đó.

## 10. Revision Log

| Version | Ngày | Thay đổi |
|---|---|---|
| `v1.0` | 2026-09-03 | Bản đầu. Đóng `Q-03` và `Q-04` của contract 15, và BÁC hai con số của chúng bằng phép đo lại trên baseline `e4d18fe`: `41` chỗ thành `3`, `12` chỗ thành `5`, và `0` chỗ ở `app/admin/`. Nguyên nhân ghi ở `EV-10`: máy quét là một cái sàng cố ý báo thừa, đo mọi màu chữ với nền tối nhất trong bốn nền ghim sẵn thay vì nền thật. Tám chỗ mà `Q-03` gọi là trượt thì trên nền thật đều đạt, ghi ở `EV-06` để không ai mở lại. Ghi `RISK-01` làm cửa chặn: worktree đang có bản sửa `@theme` chưa commit của luồng khác, xóa `28` token và sinh `106` tham chiếu `var()` chết, làm `npm run test:unit` đỏ `9` test |
