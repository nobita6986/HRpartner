# TASK: hrp-v5-go-live-10-admin-ui-repair

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-10-admin-ui-repair` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `ACCEPTED` — round 1 và round 2 đều đã audit và đã resolve; Tier 1 quyết round 2 ngày 2026-09-01 sau khi tự chạy gate exit 0 và tự đo lại sáu điểm ở §9.5, trong đó có phép đo trên bundle CSS đang chạy production. Mã đã DEPLOY tại `1af4eff` và xác nhận SỐNG |
| Planner | `Tier 1` |
| Executor | `Tier 2` |
| Auditor | `Tier 3 independent context` |
| Baseline | `708506f` |
| Modules | `Admin portal UI, shared role-guard shell, design token layer` |
| ADR references | `G27 Warm Professionalism token set — app/globals.css khối @theme, chốt 15/08/2026` |
| Current execution round | `2` |
| Current audit round | `2` |
| Next gate | `CLOSED` — còn đúng một bước OP của Owner ở `R-06`: mở ba trang admin xác nhận bằng mắt. Bốn điểm ngoài allowlist ở `R-04` và phần đơn điệu ở `R-05` thuộc contract giao diện kế tiếp |
| Updated | `2026-09-01 01:05 +07` |

## 1. Outcome

### User-visible outcome

Popup "Thêm/Sửa" của Admin trở lại nền trắng đục hoàn toàn, chữ đọc được, có chiều sâu. Nhưng nguyên nhân thật KHÔNG nằm ở popup: toàn bộ Admin đang gọi một họ biến CSS **không hề được định nghĩa ở đâu cả**. `app/globals.css` định nghĩa `--color-surface`, `--color-on-surface`, `--color-primary`; còn 21 file `.tsx` lại gọi `var(--surface)`, `var(--on-surface)`, `var(--primary)` — thiếu đúng tiền tố `color-`. Theo chuẩn CSS, một biến không tồn tại làm cả khai báo trở thành invalid-at-computed-value-time: thuộc tính không kế thừa như `background-color` rơi về `initial`, tức **trong suốt**. Popup trong suốt chỉ là biểu hiện dễ thấy nhất của lỗi đó.

Sau task này, 879 tham chiếu biến trong 21 file phân giải đúng token G27, nên cùng một lần sửa sẽ khôi phục: nền popup ở 10 trên 11 overlay của Admin, vạch kẻ và nền header của mọi bảng dữ liệu, nút "Quản lý trạng thái publish" đang trắng-trên-trắng, và màu badge trạng thái. Kèm theo đó là phần tương tác sếp yêu cầu: sidebar có hover và active rõ ràng, hàng bảng có hover mượt, mọi thành phần tương tác có vòng focus nhìn thấy được khi dùng bàn phím, và người bật "giảm chuyển động" trong hệ điều hành không bị animation.

Vì lớp token là dùng chung, phần khôi phục này chạm cả `bod`, `vendor`, `ctv`, `login` và panel xếp việc. Đó là chủ ý, không phải tác dụng phụ: các trang đó cũng đang mất nền và mất viền vì cùng một lỗi.

### Non-goals

- Không sửa lỗi chức năng "Không đọc được đơn tuyển dụng để tính slot trống: Failed to list orders" ở `/admin/jobs`. Đó là defect service/quyền, cần task riêng, không phải lỗi hiển thị.
- Không đổi khối `@theme` hiện có: không thêm, xoá hay sửa một dòng token G27 nào.
- Không tạo component Modal dùng chung, không thêm focus trap, không thêm phím Escape, không thêm `role="dialog"`. Ba thứ này là task a11y riêng cho overlay.
- Không đổi hành vi: không sửa fetch, state machine, payload, quyền, không đổi nội dung chữ trừ đúng một dòng scaffolding nêu ở mục 4.
- Không chạm bề mặt công khai `app/(portal)/**` và `src/domains/job-board/**`.
- Không migration, không SQL, không seed, không sửa quyền.
- Không tự commit lên nhánh khác, không tự push, không tự deploy.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `app/globals.css:1-109` | Toàn bộ token nằm trong một khối `@theme` duy nhất; mọi tên đều có tiền tố họ: `--color-*`, `--spacing-*`, `--radius-*`, `--shadow-*`, `--font-*`, `--ease-out`, `--t-fast`. Dòng 133-137 `body` gọi ĐÚNG `var(--color-on-surface)` và `var(--color-background)` | Tập token hợp lệ là tập đóng và đã biết; mọi tên không tiền tố là không tồn tại |
| `EV-02` | `grep ":root" app/globals.css` trả 0 dòng; hai file khớp `:root` là `public/mockup/_assets/hrp.css` và `docs/tasks/hrp-v4-bod-mockup/mockup/_assets/hrp.css` | Không có khối alias nào định nghĩa tên không tiền tố; hai file có `:root` là mockup tĩnh, app không nạp | Đóng giả thuyết "alias tồn tại ở chỗ khác" |
| `EV-03` | Quét `var(--tên)` trên mọi `.tsx` dưới `app/` và `src/` | 1093 lượt gọi, 49 tên khác nhau. Trong đó 879 lượt thuộc 22 tên KHÔNG được định nghĩa | Đây là quy mô thật của defect, không phải một popup |
| `EV-04` | Cùng phép quét, tách theo họ | 21 tên không tiền tố có đúng một token `--color-*` tương ứng 1:1. Tên thứ 22 là `--info` (2 lượt) và `--color-info` KHÔNG tồn tại trong `@theme` | 21 tên sửa được bằng ánh xạ máy móc; `--info` cần Tier 1 quyết giá trị |
| `EV-05` | `grep "var(--color-" app/admin` trả 0 kết quả trên 16 file | Admin dùng 100% họ tên sai, không lẫn lộn | Sửa ở lớp token là đủ cho Admin; không cần sửa 488 call site của Admin |
| `EV-06` | `app/admin/jobs/page.tsx:307` | `style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary, white)' }}` | Bằng chứng cơ chế đẹp nhất: nền không có fallback nên thành trong suốt, chữ CÓ fallback nên thành trắng ⇒ nút "Quản lý trạng thái publish" trắng-trên-trắng, vô hình. Nếu `--primary` tồn tại thì nút phải màu cam |
| `EV-07` | Kiểm kê overlay `fixed inset-0` trong `app/admin` | 11 overlay ở 10 file. 10 overlay khai nền panel bằng `var(--surface)` hoặc `var(--surface-container-lowest)` ⇒ trong suốt. Đúng 1 overlay là `app/admin/commission/policies/page.tsx:201` dùng `className="bg-white"` ⇒ **hiển thị đúng ngay hôm nay** | Ca đối chứng nằm trong chính repo: popup duy nhất không dùng họ tên sai là popup duy nhất không lỗi. Sửa lớp token là sửa cả 10 cái còn lại |
| `EV-08` | `app/admin/workers/page.tsx:89-90`, `app/admin/staffing/page.tsx:145-151` | Lớp mờ là `rgba(0,0,0,0.4)` hằng số nên hoạt động; panel bên trong là `background: var(--surface-container-lowest)` nên biến mất. Panel có sẵn `rounded-lg border p-6 shadow-xl` | Chiều sâu và bo góc đã có; thiếu duy nhất cái nền. Sếp yêu cầu `#ffffff` và `--color-surface-container-lowest` đúng bằng `#ffffff` |
| `EV-09` | `app/admin/applications/page.tsx:404-405` | Panel chi tiết: `backgroundColor: 'var(--surface)'`, và là overlay DUY NHẤT không có class shadow nào | Giải thích ảnh chụp số 1: chữ panel lẫn vào bảng phía dưới. Cần thêm shadow cho riêng chỗ này |
| `EV-10` | `src/shared/ui/role-guard/role-guard-layout.tsx` (289 dòng, file duy nhất trong thư mục) | Sidebar dùng Tailwind slate/orange thô: active là `bg-orange-50 text-orange-800` phẳng, non-active là `text-slate-700 hover:bg-slate-100`, có `transition-colors` nhưng không có transform. `app/admin/admin-shell.tsx` cho thấy mọi trang Admin thừa hưởng shell này, và shell dùng chung cho cả `worker` và `vendor` | Chỗ sếp muốn cải thiện hover/active nằm ở đúng một file; sửa một lần ăn cả ba portal. Đây cũng là lý do phải công bố ảnh hưởng ngoài Admin |
| `EV-11` | `grep "focus-visible\|prefers-reduced-motion"` trên `.tsx` và `.css` | 0 kết quả trong `app/admin/**` và 0 trong `app/globals.css`. Chỉ 2 trang công khai và 2 file mockup có | Không một thành phần Admin nào có vòng focus bàn phím, và không có rào giảm chuyển động. Đây là lỗi WCAG thật, khớp yêu cầu thứ ba của sếp |
| `EV-12` | `grep "hover:opacity-90" app/admin` | 8 lượt ở 8 file, đều trên hàng `tr` | Hover hiện tại làm mờ 10% CẢ hàng kể cả chữ, và `transition-colors` không animate được `opacity` nên nó nhảy tức thì. Đây chính là cảm giác "không có hover tinh tế" |
| `EV-13` | Header bảng, ví dụ `app/admin/workers/page.tsx:231` | `style={{ background: 'var(--surface-container)', borderBottom: '1px solid var(--outline-variant)' }}` | Nền header mất, và shorthand `border-bottom` chứa biến không tồn tại rơi về `initial` là `none` ⇒ mất luôn vạch kẻ. Bảng phẳng là do đây, không do thiếu style |
| `EV-14` | Quét `var(--tên, fallback)` trên `.tsx` | 26 lượt ở 8 file, riêng `app/worker/page.tsx` có 10 lượt và 0 lượt không fallback | Worker portal viết phòng thủ nên không lỗi. Sau khi có alias, các fallback này sẽ nhường cho token thật ⇒ màu có thể dịch nhẹ; phải liệt kê và đối chiếu, không được bỏ qua |
| `EV-15` | `src/shared/auth/api-boundary.static.test.ts:1-42` | Tiền lệ gate kiến trúc tĩnh chạy thật không cần DB, và bắt buộc có NEGATIVE FIXTURE với lời văn "gate có RĂNG, không phải luôn xanh" | Khuôn mẫu đo cho task này; gate token phải chứng minh mình bắt được lỗi, không chỉ xanh |
| `EV-16` | `app/globals.css:140` đến hết file 297 | Khối `.pub-*`, `.job-card`, `.filter-panel` chỉ được globals.css và hai file mockup HTML dùng, không một `.tsx` nào | Bẫy false-PASS đã biết: sửa khối này thì 0 pixel đổi trên mọi trang thật mà mọi gate vẫn xanh. Cấm chạm |
| `EV-17` | `app/admin/staffing/page.tsx:345` | UI production in nguyên văn `Module M3 — slice 4A (moment 02:10–03:10)` | Chuỗi scaffolding nội bộ lọt ra bề mặt người dùng; xoá một dòng, rủi ro bằng không |
| `EV-18` | `app/admin/jobs/page.tsx:207-208` | Banner lỗi thật `Không đọc được đơn tuyển dụng để tính slot trống: ${error.message}` và cột "Slot trống" toàn dấu gạch | Defect CHỨC NĂNG, không phải hiển thị; nằm ngoài scope task này và cần task riêng |
| `EV-19` | `git log --oneline -1`, `git status --short --branch` | `HEAD = 708506f`, `main` ngang `origin/main`, cây làm việc còn nhiều file bẩn của luồng khác | Baseline chốt tại `708506f`; file bẩn không được dọn hộ |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | `CHOSEN` | Sửa ở LỚP TOKEN bằng một khối `:root` alias đặt ngay sau khối `@theme`, KHÔNG sửa 879 call site. Lý do: một khối 22 dòng CSS khôi phục 21 file trong một lần, hoàn tác bằng cách xoá đúng khối đó, và không sinh diff khổng lồ trong 21 file nghiệp vụ mà Tier 3 không thể đọc hết. Viết lại 879 call site sang `var(--color-...)` là hướng đúng về lâu dài nhưng là refactor riêng, không nhồi vào task sửa lỗi hiển thị | Tier 1, `EV-03`/`EV-05` | CHOSEN 2026-08-31 |
| `DEC-02` | `CHOSEN` | Alias đặt trong khối `:root` THƯỜNG, không đặt vào `@theme`. Lý do: `@theme` là API sinh utility class của Tailwind v4 và là tập token G27 đã chốt 15/08 — thêm tên không tiền tố vào đó vừa làm Tailwind sinh class rác vừa sửa một tập đã được audit. `:root` sau `@theme` chỉ định nghĩa biến, không sinh class, và không ghi đè tên nào đang có | Tier 1, `EV-01` | CHOSEN 2026-08-31 |
| `DEC-03` | `CHOSEN` | Giá trị alias là `var(--color-...)` chứ KHÔNG phải sao chép mã màu. Lý do: sao chép hex tạo hai nguồn sự thật, lần đổi brand sau sẽ lệch màu âm thầm giữa Admin và bề mặt công khai | Tier 1 | CHOSEN 2026-08-31 |
| `DEC-04` | `CHOSEN` | `--info` ánh xạ sang `var(--color-secondary)` là `#815432`. Lý do: G27 không có màu info và Tier 1 KHÔNG mở rộng bảng màu đã chốt trong một task sửa lỗi hiển thị. Hai chỗ dùng là màu chữ badge `PREVIEWED` và `REVIEWED` ở `/admin/attendance`; `#815432` trên nền `#efeeec` cho tỷ lệ tương phản khoảng 5.5:1, vượt ngưỡng AA 4.5:1. Nếu sếp muốn một màu info riêng thì đó là quyết định bảng màu, mục 8 | Tier 1, `EV-04` | CHOSEN 2026-08-31 |
| `DEC-05` | `CHOSEN` | Popup KHÔNG được hardcode `#ffffff` tại call site. Lý do: `--color-surface-container-lowest` đúng bằng `#ffffff` nên sau alias, pixel hiển thị y hệt điều sếp yêu cầu; nhưng hardcode ở một chỗ sẽ che defect ở 9 popup còn lại và làm Tier 3 tưởng đã xong. Yêu cầu của sếp được thoả về mặt hiển thị, chỉ khác đường đi | Tier 1, `EV-07`/`EV-08` | CHOSEN 2026-08-31 |
| `DEC-06` | `CHOSEN` | Lớp mờ `rgba(0,0,0,0.4)` giữ nguyên. Lý do: nó đang hoạt động đúng và là thứ tạo tương phản cho panel trắng; sếp phàn nàn panel trong suốt, không phàn nàn lớp mờ | Tier 1 | CHOSEN 2026-08-31 |
| `DEC-07` | `DEVIATION` | Hàng bảng KHÔNG dùng `transform: translateY`, dù sếp nêu tên hiệu ứng đó cho cả sidebar và hàng bảng. Lý do kỹ thuật: `tr` là `display: table-row`; transform trên nó tạo containing block mới nên xung đột với `border-collapse` và với header dính, và một hàng nhấc 1px giữa các hàng liền kề tạo khe sáng nhấp nháy khi rê chuột dọc bảng. Thay bằng đổi nền cộng một vạch nhấn bên trái cộng shadow nhẹ — vẫn là phản hồi "nổi" nhưng không phá layout bảng. `translateY(-1px)` áp cho card và nút, đúng như sếp muốn, ở nơi nó an toàn | Tier 1 | CHOSEN 2026-08-31, công bố ở mục 8 để sếp phủ quyết nếu muốn |
| `DEC-08` | `CHOSEN` | Bỏ toàn bộ 8 chỗ `hover:opacity-90`. Lý do: nó làm mờ cả chữ chứ không chỉ nền, và `transition-colors` không animate `opacity` nên hiệu ứng nhảy tức thì — đúng hai điều sếp muốn khắc phục. Không giữ lại song song với hover mới | Tier 1, `EV-12` | CHOSEN 2026-08-31 |
| `DEC-09` | `CHOSEN` | Vòng focus và rào giảm chuyển động viết MỘT LẦN ở `app/globals.css`, không rải theo component. Lý do: 0 chỗ có sẵn nên không có gì phải hoà giải, và định nghĩa toàn cục bảo vệ luôn những trang task này không mở ra | Tier 1, `EV-11` | CHOSEN 2026-08-31 |
| `DEC-10` | `CHOSEN` | Task này SỞ HỮU hai khối toàn cục `:focus-visible` và `prefers-reduced-motion` trong `app/globals.css`. Contract `hrp-v5-go-live-08-public-ui-premium` cũng dự kiến thêm hai khối tương đương cho bề mặt công khai; Tier 1 sẽ rebase contract đó để nó dùng lại khối đã có thay vì nhân bản. Tier 2 của task này không cần biết task kia | Tier 1 | CHOSEN 2026-08-31 |
| `DEC-11` | `CHOSEN` | Kích thước vùng chạm: nút chỉ có icon mà task này chạm phải đạt 44 nhân 44 px; hàng sidebar phải đạt tối thiểu 40 px chiều cao. Lý do chọn 40 chứ không 44 cho sidebar: ngưỡng chuẩn mực WCAG 2.2 AA cho Target Size là 24 nhân 24 px, còn 44 nhân 44 là mức AAA và khuyến nghị của Apple cho màn cảm ứng; Admin là bề mặt desktop có 12 mục điều hướng, nâng tất cả lên 44 làm đổi mật độ toàn sidebar — điều sếp không yêu cầu. 40 px vẫn vượt xa ngưỡng AA. Nút icon thì khác: `p-1` hiện tại chỉ khoảng 24 px, quá nhỏ theo mọi chuẩn | Tier 1 | CHOSEN 2026-08-31 |
| `DEC-12` | `CHOSEN` | Không tạo component Modal dùng chung trong task này. Lý do: alias đã sửa nền cho cả 10 popup nên không còn động lực gấp; gộp thêm refactor 11 chỗ ở 10 file vào cùng một task với lớp token và lớp tương tác sẽ tạo diff không thể audit. A11y của overlay là task kế tiếp, mục 8 | Tier 1, `EV-07` | CHOSEN 2026-08-31 |
| `DEC-13` | `CHOSEN` | Không sửa banner lỗi "Failed to list orders" và cột slot trống ở `/admin/jobs`. Lý do: đó là lỗi tầng service hoặc quyền, sửa nó đòi đo API và có thể đòi DB thật; nhét vào task hiển thị sẽ làm Tier 2 đoán mò. Task riêng | Tier 1, `EV-18` | CHOSEN 2026-08-31 |
| `DEC-14` | `CHOSEN` | Xoá đúng một dòng chữ scaffolding `Module M3 — slice 4A` ở `app/admin/staffing/page.tsx`. Đây là ngoại lệ duy nhất của lệnh "không đổi nội dung chữ". Lý do: chuỗi debug nội bộ hiện trên bề mặt người dùng là lỗi trải nghiệm theo đúng nghĩa yêu cầu thứ ba của sếp, và xoá nó không có rủi ro | Tier 1, `EV-17` | CHOSEN 2026-08-31 |
| `DEC-15` | `ASSUMPTION` | Alias không làm hồi quy bề mặt công khai. Cơ sở: `app/(portal)/page.tsx`, `app/components/GlobalNavbar.tsx` và `app/(jobs)/track/page.tsx` dùng 100% họ `--color-*` (`EV-03`), nên thêm tên MỚI vào `:root` không ghi đè bất cứ tên nào chúng đọc. Phép đo biến giả định này thành sự thật nằm ở mục 5 và mục 6: liệt kê 26 chỗ có fallback và đối chiếu từng fallback với token nó sẽ nhường cho | Tier 1, `EV-14` | ASSUMPTION, hết hiệu lực khi bước liệt kê fallback chạy |
| `DEC-16` | `CHOSEN` | Thời lượng chuyển động tối đa 200 ms, dùng lại `--t-fast` là 150 ms và `--ease-out` đã có trong `@theme`. Không thêm token motion mới. Lý do: khoảng 150 đến 300 ms là chuẩn micro-interaction; token đã sẵn nên không có cớ mở rộng bảng token | Tier 1, `EV-01` | CHOSEN 2026-08-31 |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Thêm vào `app/globals.css` một khối `:root` đặt SAU khối `@theme` và TRƯỚC khối `.material-symbols-outlined`, định nghĩa đúng 21 tên không tiền tố đang được dùng, mỗi tên bằng `var(--color-` cộng chính tên đó: `--primary`, `--primary-dark`, `--primary-container`, `--on-primary`, `--on-primary-container`, `--secondary-container`, `--on-secondary-container`, `--background`, `--surface`, `--surface-container`, `--surface-container-lowest`, `--surface-container-highest`, `--on-surface`, `--on-surface-variant`, `--outline`, `--outline-variant`, `--error`, `--error-container`, `--on-error-container`, `--success`, `--warning`. Khối phải có comment nêu rõ đây là lớp tương thích cho họ tên thiếu tiền tố và hướng dọn dẹp lâu dài là viết lại call site. |
| `RQ-02` | Trong cùng khối đó, định nghĩa `--info: var(--color-secondary)`. Không thêm `--color-info` vào `@theme`. |
| `RQ-03` | Không một dòng nào trong khối `@theme` của `app/globals.css` bị thêm, xoá hay sửa. Không một dòng nào từ comment khối public job board đến hết file bị thay đổi. |
| `RQ-04` | Sau khi sửa, mọi `var(--tên)` xuất hiện trong bất kỳ `.tsx` dưới `app/` và `src/` phải trỏ tới một custom property có định nghĩa trong `app/globals.css`. Bằng chứng là một test tĩnh mới, chạy thật không cần DB, quét file thay vì tin lời văn. |
| `RQ-05` | Test tĩnh ở trên phải có NEGATIVE FIXTURE: một chuỗi giả lập gọi biến không tồn tại phải làm hàm phát hiện trả về vi phạm. Gate không chứng minh được mình có răng thì không tính là đạt. |
| `RQ-06` | Panel của 10 overlay khai nền qua họ tên thiếu tiền tố phải hiển thị nền trắng đục hoàn toàn sau sửa, đạt được bằng lớp alias. Cấm hardcode mã màu tại call site, cấm hạ độ đậm hoặc xoá lớp mờ `rgba(0,0,0,0.4)`, cấm thêm `opacity` cho panel hoặc cho bất kỳ phần tử con nào của panel. |
| `RQ-07` | `app/admin/applications/page.tsx` panel chi tiết phải có shadow tạo chiều sâu ngang với các overlay khác. Đây là overlay duy nhất hiện không có shadow; ngoài shadow và các thay đổi do yêu cầu khác của contract này, markup của panel không đổi. |
| `RQ-08` | Sidebar trong `src/shared/ui/role-guard/role-guard-layout.tsx`: trạng thái active phải mạnh hơn một nền phẳng — tối thiểu gồm một vạch nhấn dọc bên trái và nền đậm hơn hiện tại; trạng thái hover của mục không active phải đổi nền VÀ nhấc `translateY(-1px)`; cả hai dùng transition tối đa 200 ms. Không đổi `href`, thứ tự, nhãn hay icon của bất kỳ mục điều hướng nào. |
| `RQ-09` | Hàng dữ liệu của bảng ở `app/admin/applications/page.tsx`, `app/admin/staffing/page.tsx`, `app/admin/jobs/page.tsx`, `app/admin/workers/page.tsx`, `app/admin/vendors/page.tsx`, `app/admin/clients/page.tsx`, `app/admin/projects/page.tsx`, `app/admin/users/page.tsx`, `app/admin/tickets/page.tsx`, `app/admin/payroll/page.tsx` phải có hover đổi nền mượt trong tối đa 200 ms. Hàng KHÔNG được dùng `transform`. |
| `RQ-10` | Xoá sạch `hover:opacity-90` khỏi `app/admin`; sau sửa số lần khớp phải bằng 0. Không được thay bằng một biến thể `opacity` khác trên hàng bảng. |
| `RQ-11` | Thêm vào `app/globals.css` một quy tắc `:focus-visible` toàn cục cho phần tử tương tác, dày 2 px, màu `var(--color-primary)`, cách phần tử 2 px. Không được xoá hay giảm outline sẵn có của bất kỳ phần tử nào. Không được dùng `outline: none` ở bất kỳ đâu trong diff. |
| `RQ-12` | Thêm vào `app/globals.css` một khối `@media (prefers-reduced-motion: reduce)` vô hiệu hoá transition và transform mà task này thêm vào. Khối này phải nằm sau các quy tắc nó ghi đè. |
| `RQ-13` | Nút chỉ có icon mà task này chạm — nút đóng overlay và nút đăng xuất ở footer sidebar — phải đạt vùng chạm tối thiểu 44 nhân 44 px và giữ nguyên `aria-label` đang có. Hàng sidebar đạt tối thiểu 40 px chiều cao. |
| `RQ-14` | Task chỉ đổi cách hiển thị và tương tác. Không đổi lời gọi fetch, đường dẫn API, payload, state machine, quyền, không thêm hay bớt phần tử dữ liệu, không đổi nội dung chữ — ngoại lệ duy nhất là xoá dòng scaffolding `Module M3 — slice 4A` ở `app/admin/staffing/page.tsx`. |
| `RQ-15` | Gate tĩnh phải sạch với exit code THẬT, đo không qua pipe: `npm run typecheck` bằng 0, `npm run test:unit` bằng 0 với tổng số test không nhỏ hơn 1416 cộng số case của test tĩnh mới, và không file test nào có từ baseline bị giảm số case. |

### 4.2 Scope boundaries

| Được phép sửa | Cấm chạm |
|---|---|
| `app/globals.css` — CHỈ thêm khối `:root` alias, khối `:focus-visible`, khối `prefers-reduced-motion` | Khối `@theme` của `app/globals.css` và mọi dòng từ comment public job board đến hết file |
| `src/shared/ui/role-guard/role-guard-layout.tsx` — chỉ class và style của mục điều hướng, nút đăng xuất | `app/(portal)/**`, `app/components/GlobalNavbar.tsx`, `app/(jobs)/**` |
| `app/admin/applications/page.tsx`, `app/admin/staffing/page.tsx`, `app/admin/jobs/page.tsx` | `src/domains/job-board/**` — đang thuộc task hotfix `/api/jobs` |
| `app/admin/workers/page.tsx`, `app/admin/vendors/page.tsx`, `app/admin/clients/page.tsx`, `app/admin/projects/page.tsx`, `app/admin/users/page.tsx`, `app/admin/tickets/page.tsx`, `app/admin/payroll/page.tsx` — chỉ phần hover hàng bảng và nút icon | Mọi `route.ts`, mọi thứ dưới `app/api/**` |
| Một file test tĩnh mới, đặt tại `src/shared/ui/design-tokens.static.test.ts` | `prisma/**` toàn bộ, kể cả `schema.prisma`, `migrations/`, `seed.mjs` |
| — | `src/shared/auth/**`, `src/shared/ui/role-guard/` ngoài file đã nêu |
| — | `vitest.unit.config.ts`, `vitest.config.ts`, `tailwind` config nếu có, `package.json` |
| — | `app/admin/commission/policies/page.tsx` — popup này đang ĐÚNG, là ca đối chứng của audit |
| — | Mọi file đang bẩn của luồng khác: `public/index.html`, `docs/tasks/hrp-v5-go-live-02-*/AUDIT.md`, `docs/tasks/hrp-v5-go-live-04-*/AUDIT.md`, `.neon`, `rls-probe-*.txt`, `scratch/*`, `scripts/debug-parser.mjs`, `docs/aff_plan*.md` |

### 4.3 Data, State, Permission và Interface Rules

- **Permission:** task không đổi một bit nào về quyền, ở cả tầng app và tầng DB. Không chạm `withAuthorizedDb`, không chạm RLS, không chạm middleware.
- **Data:** không đổi truy vấn, không đổi projection, không thêm hay bớt trường nào được render. Panel chi tiết ứng viên vẫn in đúng các trường nó đang in.
- **State:** không migration, không seed, không ghi DB.
- **Interface:** không đường API nào đổi. Hợp đồng JSON không đổi vì task không chạm route nào.
- **Phạm vi hiển thị ngoài Admin:** lớp alias làm `app/bod/page.tsx`, `app/vendor/page.tsx`, `app/ctv/page.tsx`, `app/worker/page.tsx`, `app/login/page.tsx`, `app/login/login-form.tsx` và `src/domains/applications/placement-panel.tsx` hiển thị lại đúng ý đồ G27. Đây là kết quả mong muốn và phải được nêu trong HANDOFF, không được che.
- **Bí mật:** không in connection string, token, password, PII thật vào log hay HANDOFF. Panel chi tiết có CCCD và số điện thoại — không chụp, không dán giá trị thật vào bất kỳ artifact nào.

## 5. Execution Plan

| ID | Step |
|---|---|
| `STEP-01` | Tự đo lại quy mô defect trước khi sửa: quét `var(--tên)` trên mọi `.tsx` dưới `app/` và `src/`, đối chiếu với danh sách custom property định nghĩa trong `app/globals.css`, ghi vào HANDOFF số lượt tham chiếu KHÔNG phân giải được và danh sách tên. Nếu con số lệch khỏi 879 lượt trên 22 tên thì DỪNG và báo — nghĩa là baseline đã đổi, không sửa mò. |
| `STEP-02` | Viết test tĩnh RED trước ở `src/shared/ui/design-tokens.static.test.ts`: đọc `app/globals.css` lấy tập tên đã định nghĩa, quét `.tsx`, khẳng định tập tên chưa định nghĩa là rỗng. Chạy `npm run test:unit` TRƯỚC khi sửa CSS; ghi output FAIL kèm exit code thật. Không có bằng chứng RED thì gate này không tính. |
| `STEP-03` | Thêm negative fixture vào cùng file test: một chuỗi giả lập chứa lời gọi biến không tồn tại phải làm hàm phát hiện trả về vi phạm. Chứng minh gate có răng. |
| `STEP-04` | Thêm khối `:root` alias vào `app/globals.css` đúng vị trí quy định, 21 tên ánh xạ 1:1 cộng `--info`. Chạy lại `npm run test:unit`: test tĩnh chuyển GREEN. Ghi cả hai lần chạy vào HANDOFF. |
| `STEP-05` | Liệt kê 26 chỗ dùng `var(--tên, fallback)`, lập bảng: file, dòng, giá trị fallback, token mà nó sẽ nhường cho sau alias, và cột "khác nhau hay không". Nếu có chỗ nào lệch màu đáng kể thì ghi vào HANDOFF như quan sát, KHÔNG tự đổi giá trị token để bù. |
| `STEP-06` | Thêm khối `:focus-visible` toàn cục và khối `prefers-reduced-motion` vào `app/globals.css`. Đọc lại file để chắc khối giảm chuyển động nằm SAU các quy tắc nó ghi đè; ghi số dòng thật vào HANDOFF. |
| `STEP-07` | Sửa sidebar trong `src/shared/ui/role-guard/role-guard-layout.tsx`: vạch nhấn bên trái và nền đậm hơn cho active, hover đổi nền cộng `translateY(-1px)`, transition tối đa 200 ms, chiều cao hàng tối thiểu 40 px. Nút đăng xuất lên 44 nhân 44 px, giữ nguyên `aria-label`. Ghi phép tính chiều cao vào HANDOFF. |
| `STEP-08` | Xoá 8 chỗ `hover:opacity-90` và thay bằng hover đổi nền. Thêm hover cho các bảng đang hoàn toàn không có hover, gồm bảng ở `app/admin/jobs/page.tsx` và `app/admin/applications/page.tsx`. Không dùng `transform` trên hàng. |
| `STEP-09` | Thêm shadow cho panel chi tiết ở `app/admin/applications/page.tsx`, nâng nút đóng của các overlay lên 44 nhân 44 px, và xoá dòng scaffolding `Module M3 — slice 4A` ở `app/admin/staffing/page.tsx`. |
| `STEP-10` | Chạy `npm run typecheck` và `npm run test:unit` KHÔNG qua pipe, ghi `$LASTEXITCODE` ngay sau mỗi lệnh. Nếu tổng số test nhỏ hơn 1416 cộng số case mới thì dừng và báo — dấu hiệu file test bị loại khỏi lane. |
| `STEP-11` | Thử `npm run build` và ghi lại exit code cùng output. Nếu build thất bại vì lý do môi trường như thiếu biến kết nối lúc prerender thì ghi `ENV_BLOCKED` kèm nguyên văn lỗi; điều đó KHÔNG chặn task vì tính hợp lệ của CSS đã được test tĩnh phủ. Nếu build thất bại vì chính CSS vừa thêm thì phải sửa. |
| `STEP-12` | Chạy `git status --short` và `git diff --stat`, dán vào HANDOFF. Diff phải nằm trọn trong allowlist mục 4.2. Nếu xuất hiện file ngoài danh sách thì DỪNG, không tự dọn, không tự stage. |
| `STEP-13` | Viết HANDOFF.md với evidence THẬT cho từng acceptance criterion: lệnh, exit code, output. Không commit, không push, không deploy. Ghi rõ ở đầu HANDOFF rằng deploy là hành động của Owner, và ghi rõ lớp alias làm đổi hiển thị của cả `bod`, `vendor`, `ctv`, `worker`, `login` và panel xếp việc. |

## 6. Acceptance

| ID | Acceptance criterion | Cách đo |
|---|---|---|
| `AC-01` | Khối alias tồn tại và đầy đủ: `app/globals.css` có một khối `:root` chứa đúng 22 định nghĩa, mỗi giá trị đều ở dạng `var(--color-...)`, không có mã màu literal nào | Đọc khối; đếm số dòng khai báo bằng 22; `grep` trong khối tìm ký tự `#` trả 0 dòng |
| `AC-02` | Không phá gì trong `app/globals.css`: diff của file này KHÔNG có dòng xoá nào | `git diff -- app/globals.css`; số dòng bắt đầu bằng một dấu trừ, không tính dòng header ba dấu trừ, bằng 0 |
| `AC-03` | Mọi biến phân giải được: test tĩnh mới báo tập tên chưa định nghĩa là rỗng, và có bằng chứng RED trước GREEN | HANDOFF chứa hai lần chạy `npm run test:unit`: lần trước bước thêm alias FAIL đúng tên test mới kèm exit code khác 0; lần sau PASS kèm exit code 0. Tier 3 tái lập được bằng cách `git stash` riêng khối alias |
| `AC-04` | Gate có răng: negative fixture làm hàm phát hiện trả về vi phạm | Đọc test; có case khẳng định một chuỗi chứa biến không tồn tại bị phát hiện |
| `AC-05` | Popup không bị hardcode màu: trong diff của 10 file overlay, không dòng THÊM nào chứa `#ffffff`, `#fff` hay `bg-white`, và không dòng nào giảm hoặc xoá `rgba(0,0,0,0.4)` | `git diff` trên 10 file, grep ba chuỗi trên trong các dòng thêm trả 0; grep `rgba(0,0,0,0.4)` trong dòng xoá trả 0 |
| `AC-06` | Không thêm độ mờ cho nội dung popup: diff không thêm `opacity` nào trong phạm vi panel của overlay | `git diff` grep `opacity` trong dòng thêm của 10 file overlay trả 0, trừ trường hợp thuộc hover hàng bảng đã bị cấm ở tiêu chí riêng |
| `AC-07` | Hàng bảng không dùng transform: 10 file có bảng không xuất hiện `translateY` hay `transform` trên phần tử hàng | `grep -n "translateY\|transform" ` trên 10 file bảng; mọi kết quả phải nằm ngoài phần tử hàng, và HANDOFF chỉ rõ từng kết quả thuộc phần tử nào |
| `AC-08` | Hover hàng bảng đã đổi bản chất: `hover:opacity-90` biến mất hoàn toàn khỏi `app/admin` | `grep -rn "hover:opacity-90" app/admin` trả 0 dòng |
| `AC-09` | Sidebar active và hover đạt yêu cầu: file `role-guard-layout.tsx` có vạch nhấn bên trái cho active, và có `translateY(-1px)` cho hover, transition tối đa 200 ms | Đọc file; grep `translateY(-1px)` trả ít nhất 1 dòng; HANDOFF nêu giá trị duration thật |
| `AC-10` | Vòng focus tồn tại lần đầu tiên: `app/globals.css` có quy tắc `:focus-visible` dùng `var(--color-primary)`, dày 2 px, cách 2 px; và diff không chứa `outline: none` | `grep -n "focus-visible" app/globals.css` trả ít nhất 1 dòng, trước đó là 0; `git diff` grep `outline: none` trả 0 |
| `AC-11` | Rào giảm chuyển động tồn tại lần đầu tiên và đặt đúng chỗ | `grep -n "prefers-reduced-motion" app/globals.css` trả ít nhất 1 dòng, trước đó là 0; số dòng của khối này lớn hơn số dòng của quy tắc transition mà nó ghi đè, HANDOFF ghi cả hai số |
| `AC-12` | Vùng chạm đạt chuẩn đã chốt: nút chỉ có icon mà task chạm đạt 44 nhân 44 px, hàng sidebar đạt tối thiểu 40 px, `aria-label` cũ còn nguyên | HANDOFF ghi class thật cùng phép tính px cho từng nút và cho hàng sidebar; `grep "aria-label"` trên các file đã sửa cho thấy không nhãn nào bị xoá |
| `AC-13` | Không đổi hành vi: diff không thêm hay xoá lời gọi `fetch(`, không đổi đường dẫn API, không đổi chuỗi hiển thị nào ngoài dòng scaffolding | `git diff` grep `fetch(` trả 0 dòng thay đổi; HANDOFF liệt kê mọi dòng thay đổi có chứa chữ tiếng Việt và chứng minh chỉ có một dòng bị xoá |
| `AC-14` | Chuỗi scaffolding đã biến mất | `grep -rn "slice 4A" app/admin/staffing/page.tsx` trả 0 dòng |
| `AC-15` | Bảng đối chiếu fallback tồn tại: 26 chỗ dùng biến có fallback được liệt kê kèm token mới và kết luận lệch hay không lệch | HANDOFF chứa bảng 26 dòng; số dòng khớp với số lượt đo lại ở bước đầu |
| `AC-16` | Gate tĩnh sạch, exit code thật: `npm run typecheck` bằng 0; `npm run test:unit` bằng 0 với tổng số test không nhỏ hơn 1416 cộng số case mới | Chạy lại từng lệnh không pipe, đọc `$LASTEXITCODE`. Exit code lấy sau pipe là bằng chứng KHÔNG hợp lệ |
| `AC-17` | Diff đúng phạm vi: mọi file thay đổi đều thuộc allowlist mục 4.2; không file bẩn nào của luồng khác bị stage, sửa hay xoá | `git status --short` và `git diff --stat` trong HANDOFF; đối chiếu từng dòng với allowlist |
| `AC-18` | Không SQL, không đổi quyền: diff không chứa `CREATE POLICY`, `GRANT`, `ALTER TABLE`, `set_config`, và không chạm `prisma/` hay `app/api/` | `git diff` grep bốn từ khoá trả 0 dòng; `git diff --stat` không có path nào bắt đầu bằng `prisma/` hay `app/api/` |
| `AC-19` | Không commit, không push, không deploy trong task này | `git log origin/main..HEAD` trả rỗng tại thời điểm viết HANDOFF; HANDOFF nói rõ deploy thuộc Owner |

### Traceability

| RQ | Steps | ACs |
|---|---|---|
| `RQ-01` | STEP-01, STEP-04 | AC-01, AC-02, AC-03 |
| `RQ-02` | STEP-04 | AC-01 |
| `RQ-03` | STEP-04, STEP-06 | AC-02 |
| `RQ-04` | STEP-01, STEP-02, STEP-04 | AC-03 |
| `RQ-05` | STEP-03 | AC-04 |
| `RQ-06` | STEP-04 | AC-05, AC-06 |
| `RQ-07` | STEP-09 | AC-17 |
| `RQ-08` | STEP-07 | AC-09, AC-12 |
| `RQ-09` | STEP-08 | AC-07, AC-08 |
| `RQ-10` | STEP-08 | AC-08 |
| `RQ-11` | STEP-06 | AC-10 |
| `RQ-12` | STEP-06 | AC-11 |
| `RQ-13` | STEP-07, STEP-09 | AC-12 |
| `RQ-14` | STEP-09, STEP-12 | AC-13, AC-14, AC-18 |
| `RQ-15` | STEP-10, STEP-11, STEP-12 | AC-16, AC-19 |
| — | STEP-05 | AC-15 |

## 7. Risk và Rollback

| ID | Risk | Countermeasure |
|---|---|---|
| `RISK-01` | Tier 2 làm đúng theo lời văn của sếp: hardcode `#ffffff` vào popup. Kết quả là sửa 1 trong 11 overlay, để lại 879 lượt tham chiếu chết ở 21 file, và lần sau sếp mở trang khác lại thấy đúng lỗi cũ | `DEC-01` chốt nguyên nhân là tầng token chứ không phải popup; `AC-05` biến việc hardcode thành FAIL đo được. Pixel sếp yêu cầu vẫn đạt vì `--color-surface-container-lowest` chính là `#ffffff` |
| `RISK-02` | Tier 2 sửa bằng cách thêm tên còn thiếu vào khối `@theme`. Tailwind v4 sinh utility class từ mọi tên `--color-*` trong `@theme`, nên cách đó tạo ra một họ class mới không ai dùng, làm phình CSS và mở đường cho hai bộ token cạnh tranh | `DEC-02` chốt alias nằm ở `:root` THƯỜNG đặt sau `@theme`; `AC-02` đo diff của `globals.css` không có dòng xoá, `AC-01` đo mọi giá trị đều là `var(--color-...)` |
| `RISK-03` | Tier 2 chọn đường dài: đổi 879 lượt gọi ở 21 file sang `var(--color-...)`. Diff sẽ vượt một nghìn dòng, không ai audit nổi, và rollback là không thể | `DEC-03` cấm; `AC-17` giới hạn diff trong allowlist mục 4.2, mọi file ngoài danh sách là FAIL. Việc di trú call site là task riêng ở `Q-03` |
| `RISK-04` | Hiệu ứng nổi trên hàng bảng: `transform` trên phần tử hàng tạo containing block, đánh nhau với `border-collapse` và header dính, sinh khe sáng nhấp nháy giữa hai hàng kề nhau. Đây là lý do tôi lệch khỏi đúng một câu trong yêu cầu của sếp | `DEC-08` công bố deviation và bù bằng nền cộng vạch nhấn cộng shadow; `AC-07` đo không có `transform` trên hàng. `translateY(-1px)` vẫn có, nhưng ở sidebar, card và nút, đúng nơi nó an toàn |
| `RISK-05` | Bằng chứng RED bị bịa: viết test SAU khi thêm alias rồi khai là RED trước. Đây chính là lỗ đã để lọt P0 ngày 31/08 ở đường đọc công khai | `AC-03` đòi hai lần chạy tách biệt kèm exit code thật, và Tier 3 tái lập được bằng `git stash` riêng khối alias. Không có RED thì `AC-03` không đạt, bất kể GREEN đẹp thế nào |
| `RISK-06` | Test tĩnh viết lỏng thành luôn xanh: quét bằng một regex bắt cả `var(--color-...)` rồi kết luận không có tên nào thiếu | `AC-04` bắt buộc negative fixture; hàm phát hiện phải trả về vi phạm cho một chuỗi cố tình sai. Đây là khuôn mẫu đã dùng ở `src/shared/auth/api-boundary.static.test.ts` |
| `RISK-07` | Sửa vào khối CSS chết: `app/globals.css` từ comment public job board tới hết file chỉ được hai file mockup HTML dùng, không một `.tsx` nào. Sửa ở đó là 0 pixel đổi trên live mà mọi gate vẫn xanh | `RQ-03` cấm chạm vùng đó; `AC-02` đo diff không có dòng xoá và HANDOFF phải nêu số dòng khối alias để Tier 3 biết nó nằm trước vùng chết |
| `RISK-08` | Lớp alias làm đổi hiển thị ngoài `admin`: `bod`, `vendor`, `ctv`, `worker`, `login` và panel xếp việc cũng gọi các tên không tiền tố. Nhiều chỗ sẽ ĐỔI từ trong suốt sang có màu — đó là sửa lỗi, nhưng nếu không khai báo thì Tier 3 sẽ đọc thành regression ngoài scope | `DEC-05` công bố trước; `STEP-13` bắt buộc HANDOFF ghi rõ danh sách bề mặt bị ảnh hưởng. Che chuyện này đi là vi phạm evidence |
| `RISK-09` | 26 chỗ đang có fallback sẽ đổi màu khi biến bắt đầu phân giải được, vì fallback do người viết đoán có thể khác token thật | `STEP-05` và `AC-15` buộc lập bảng 26 dòng đối chiếu fallback với token mới. Nếu lệch tới mức đổi ý nghĩa, ghi vào HANDOFF chứ không tự đổi token trong `@theme` |
| `RISK-10` | Tier 2 nhân tiện sửa banner `Không đọc được đơn tuyển dụng để tính slot trống` ở `/admin/jobs`. Đó là defect chức năng hoặc quyền, không phải hiển thị, và sửa mò trong task UI sẽ trộn hai loại rủi ro vào một diff | `DEC-13` đặt ra ngoài scope; `AC-13` đo diff không đổi lời gọi `fetch(`, `AC-18` đo diff không chạm `app/api/`. Task riêng nằm ở `Q-01` |
| `RISK-11` | Chạy `npx vitest run` trần thay vì lane unit: config mặc định ĐỌC `DATABASE_URL` từ `.env` (production) và thiếu `esbuild jsx automatic` nên đổ 24 test component oan | `RQ-15` và `AC-16` chốt đúng `npm run test:unit`; 24 fail ở lane mặc định là artifact cấu hình, không phải regression |
| `RISK-12` | Lấy exit code sau pipe nên đọc exit code của lệnh cuối đường ống, in `EXIT=0` ngay dưới dòng `failed` | `STEP-10` và `AC-16` bắt buộc đo không pipe và đọc `$LASTEXITCODE` |
| `RISK-13` | Tier 2 dọn hộ các file bẩn của luồng khác trong lúc kiểm diff | Mục 4.2 liệt kê đích danh; `STEP-12` yêu cầu DỪNG và báo, không tự dọn. `AC-17` đo bằng `git status --short` |
| `RISK-14` | Tier 2 tự push để sếp xem kết quả cho nhanh. Push vào `main` là deploy production qua Vercel Git integration | `AC-19` đo `git log origin/main..HEAD` rỗng; deploy production là hành động của Owner theo `UNIFIED_PLAN` 9.1 |
| `RISK-15` | Xung đột hàng đợi: Owner đã chốt 27/08 rằng chỉ duy trì MỘT Tier 2 tại một thời điểm, và hiện có một hotfix P0 chưa giao khiến `/api/jobs` trả 500 trên production | Task này KHÔNG được giao song song với hotfix. Tier 1 nêu thứ tự ở mục 9 và để Owner quyết; nếu Owner chọn chạy task này trước, hotfix vẫn giữ nguyên contract, không huỷ |

**Rollback:** ba mức, độc lập nhau.

1. Tầng token: xoá đúng một khối `:root` trong `app/globals.css`. Mọi bề mặt trở về trạng thái hôm nay, kể cả các trang ngoài `admin`.
2. Tầng tương tác: mỗi file UI là một hunk độc lập, không file nào phụ thuộc file khác, nên hoàn tác được từng file bằng `git checkout -- ` trên đúng path.
3. Toàn task: một commit duy nhất, không migration, không đổi hợp đồng API, không đổi schema. Hoàn tác bằng `git revert` trên chính commit của task.

Không có bước nào cần chạm DB, nên không có rollback dữ liệu.

## 8. Open Questions

| ID | Question | Owner | Ảnh hưởng nếu chưa trả lời |
|---|---|---|---|
| `Q-01` | Banner `Không đọc được đơn tuyển dụng để tính slot trống` ở `/admin/jobs` cùng cột `Slot trống` toàn dấu gạch là defect chức năng hay quyền? Cần task riêng để tìm nguyên nhân lời gọi liệt kê đơn thất bại | Owner | Không chặn task này. Sau task này banner vẫn còn nhưng ĐỌC ĐƯỢC, vì hiện tại nó cũng đang bị tầng token làm mờ |
| `Q-02` | Panel chi tiết đơn ở `/admin/applications` in số điện thoại, số CCCD và một UUID thô của worker. Có cần mask CCCD và ẩn UUID trên bề mặt admin không? Trang tra cứu công khai cũng in CCCD không mask | Owner | Không chặn task này vì đây là quyết định dữ liệu, không phải hiển thị. Nếu bỏ qua thì PII vẫn hiện nguyên dạng cho mọi người có session admin |
| `Q-03` | Có di trú 879 lượt gọi ở 21 file sang `var(--color-...)` để xoá lớp alias không, hay giữ alias làm hợp đồng lâu dài? Giữ alias thì rẻ và revert được bằng một khối; di trú thì sạch một nguồn tên nhưng là diff hơn một nghìn dòng | Owner | Không chặn. Sau task này hệ thống có hai lối gọi cùng trỏ một giá trị; đó là nợ kỹ thuật đã khai báo, không phải lỗi |
| `Q-04` | Có cần một gate tự động cấm biến CSS không định nghĩa trên mọi bề mặt, chạy trong lane lint chứ không chỉ lane test? Test tĩnh của task này đã đủ răng nhưng chỉ chạy khi ai đó chạy test | Owner | Không chặn. Nếu bỏ qua thì lần thêm token mới vẫn có thể tái lập đúng sự cố hôm nay, chỉ là bị bắt muộn hơn |

## 9. Planner Resolution

### Audit round 1 — `ACCEPTED`

Tier 1 quyết ngày 2026-09-01. Cơ sở: tự chạy gate, tự đọc toàn văn `AUDIT.md`, và **tự đo lại độc lập từng khẳng định mà Tier 3 chỉ viết bằng lời văn**.

Gate do Tier 1 chạy, không lấy lại kết quả của ai: `verify-audit.ps1 -TaskPath ... -AuditPath ...` in `[OK] Verdict: PASS` rồi `RESULT: PASS`, exit `0`. `AUDIT.md` đo được `6964` byte cả trước và sau khi commit, verdict `PASS`, 91 dòng.

#### 9.1 Phép đo độc lập của Tier 1

| ID | Điều cần chứng minh | Lệnh hoặc phép đo của Tier 1 | Kết quả |
|---|---|---|---|
| `SC-01` | Ba gate của `RQ-15` | `npx tsc --noEmit`; `npm run test:unit`; `npm run build`, đọc `LASTEXITCODE` ngay, không qua pipe | exit `0` / exit `0` với `99` file và **`1476`** test / exit `0` với `Compiled successfully in 21.1s` |
| `SC-02` | Vị trí và kích thước lớp alias theo `RQ-01`, `RQ-02` | Đánh số dòng `app/globals.css`: `@theme` mở tại `8`, `:root` mở tại `113`, `--info` tại `135`, `.material-symbols-outlined` tại `138`; đếm dòng chứa `var(--color-` trong khoảng `113..136` | Alias nằm đúng sau `@theme` và trước `.material-symbols-outlined`; **đếm được đúng `22`** |
| `SC-03` | Một bảng màu duy nhất theo `RQ-01` | Quét mọi mã màu dạng thập lục trong `app/globals.css` | **Zero** mã màu trong khoảng alias `113..136`; toàn bộ nằm trong `@theme` từ dòng `10` tới `80` ⇒ không copy màu, đúng một nguồn |
| `SC-04` | Vòng focus và giảm chuyển động theo `RQ-11`, `RQ-12` | In nguyên văn hai khối | `:focus-visible` tại `322` với `outline: 2px solid var(--color-primary)` và `outline-offset: 2px`; `@media (prefers-reduced-motion: reduce)` tại `327`, tức **sau** các quy tắc nó phủ định |
| `SC-05` | Không dịch chuyển hàng bảng theo `RQ-09` | Lọc mọi dòng THÊM chứa `translateY` trong `app/admin` và `src/shared/ui/role-guard` | Đúng **một** match duy nhất, nằm trên mục sidebar; **zero** match trên thẻ hàng bảng |
| `SC-06` | Hover hàng bảng đủ mười bảng theo `RQ-09` | Đếm dòng THÊM chứa `hover:bg-` theo từng file | **10 trên 10** file trang admin đều có, không sót file nào |
| `SC-07` | Vùng chạm theo `RQ-13` | Lọc dòng THÊM chứa `h-11 w-11` và `min-h-10` | `h-11 w-11` tức 44 px trên nút đóng panel và nút đăng xuất; `min-h-10` tức 40 px trên hàng sidebar |
| `SC-08` | Gate mới có RĂNG theo `RQ-05` | Đọc `src/shared/ui/design-tokens.static.test.ts` | Có **8** case, trong đó một case tên `NEGATIVE FIXTURE` khẳng định chuỗi biến giả PHẢI bị phát hiện, cộng một đối chứng dương. Test còn tự khoá lại đúng `22` alias, vị trí khối, vòng focus, và thứ tự khối reduced-motion ⇒ bản sửa tự chống hồi quy |
| `SC-09` | Ranh giới quy trình theo `RQ-14` và `R-01` | `git rev-list --count origin/main..HEAD`; thời điểm sửa cuối của `TASK.md`; `git diff --name-only` trên scope | `0` ⇒ không tier nào commit hay push; `TASK.md` không bị Tier 3 ghi vào; đúng 12 file cộng một test mới, tất cả trong allowlist §4.2 |

Kết luận: **mọi khẳng định lời văn của Tier 3 mà tôi kiểm được đều ĐÚNG.** Vì vậy verdict `PASS` đứng vững và tôi accept, thay vì mở round 2 — theo đúng luật phân biệt của chính pipeline này: lời văn che một khẳng định SAI thì mở round mới, lời văn đúng sự thật mà Tier 1 tự đo lại được thì accept kèm finding mức quy trình.


Điều kiện tiên quyết Tier 1 xác nhận: task này KHÔNG cần DB thật, KHÔNG cần migration, KHÔNG cần credential live, KHÔNG cần trình duyệt để đạt bất kỳ acceptance criterion nào. Mọi tiêu chí đều đo được bằng đọc file, `grep`, `git diff`, `npm run typecheck` và `npm run test:unit`. Vì vậy `ENV_BLOCKED` không phải kết cục hợp lệ cho bất kỳ tiêu chí nào ở đây.

#### 9.2 Findings — đều `ACCEPT_FIX`, không finding nào chặn

| ID | Mức | Nội dung | Xử lý |
|---|---|---|---|
| `F-01` | P2 | Chín tiêu chí trong `AUDIT.md` mang lời văn thay vì lệnh cộng exit code: kiểm chứng hàm dò, thay thế fallback cũ, hover sidebar, vùng chạm nút đăng xuất, hover hai bảng, xoá dịch chuyển hàng, shadow panel, kiểm tra scope, và khẳng định không rò dữ liệu. Riêng ô "thay thế fallback cũ" còn ghi thẳng là dựa vào diff mà HANDOFF cung cấp, tức dựa vào Tier 2 chứ không độc lập | `ACCEPT_FIX`. Tôi đã tự đo lại toàn bộ ở §9.1 và tất cả đều đúng, nên verdict đứng vững. Nhưng `AUDIT.md` ở dạng đã viết thì **tự nó không đủ** để resolve; lần sau mỗi ô phải có lệnh và exit code |
| `F-02` | P2 | Ba ô trích `1472 passed (1472)`, **trùng khít con số của HANDOFF**. Tier 1 tự chạy lane canonical ra `99` file và `1476` test | `ACCEPT_FIX`. Ngưỡng `RQ-15` là không thấp hơn `1416` nên cả hai số đều đạt và không có gì đổ vỡ. Bài học: một con số trùng khít con số của người thi công **không phải bằng chứng độc lập** — nó chỉ chứng minh đã đọc HANDOFF |
| `F-03` | P3 | Ô build không ghi exit code, chỉ ghi rằng prerender không rớt | `ACCEPT_FIX`. Tier 1 đo được exit `0` và `Compiled successfully in 21.1s` |
| `F-04` | P1 | `AUDIT.md` và `HANDOFF.md` bị để **untracked** khoảng ba tiếng, trong đúng repo mà một tác nhân chưa xác định đã cắt file tên `AUDIT.md` về 0 byte **năm lần trong hai ngày**; file untracked bị cắt là mất hẳn, không `git restore` được | `ACCEPT_FIX`. Tier 1 đã commit cả hai ở `92e1fd7` **trước khi** viết resolution này. Luật mới ghi ở `R-02` |
| `F-05` | P2 | Cách tái lập RED là **xoá khối `:root` khỏi working tree rồi khôi phục**. Đúng tinh thần và cho bằng chứng thật, nhưng Tier 3 bị cấm sửa mã, lại làm trên cây dùng chung đang bẩn của nhiều luồng, không có bản lưu | `ACCEPT_FIX`. Lần sau tái lập RED bằng bản sao tạm hoặc bằng chuỗi fixture trong test, không sửa file thật. Rủi ro tồn dư: nếu quá trình đó bị ngắt giữa lượt thì lớp alias biến mất trong im lặng — hiện `SC-02` xác nhận nó đã về đúng chỗ với đúng 22 dòng |
| `F-06` | P3 | Khối reduced-motion vô hiệu `animation-duration` và `transition-duration` nhưng không chạm `transform`, nên cú nhấc mục sidebar trở thành tức thời chứ không mất đi | Không phải vi phạm: `RQ-12` chỉ đòi khối đó đứng sau các quy tắc nó phủ định, không đòi xoá transform. Ghi lại để task giao diện kế tiếp quyết |
| `F-07` | **P1** | **Cây mã bị hụt 41 dòng so với bản Tier 2 giao, phát hiện lúc chuẩn bị deploy.** `git diff --stat` trên scope ra `60` insertions, trong khi HANDOFF và phép đo đầu của Tier 1 đều là `101`; toàn bộ chênh lệch nằm trong `app/globals.css` (`78` dòng thêm rơi xuống `37`). Mất hai thứ: comment tài liệu của lớp alias mà `RQ-01` đòi, và quy tắc `.nav-item-lift:hover { transform: none !important; }` — thứ làm cho `prefers-reduced-motion` thật sự **huỷ** cú nhấc 1 px thay vì chỉ làm nó tức thời. `git grep` cho thấy `nav-item-lift` chỉ còn trong HANDOFF và trong `role-guard-layout.tsx`, **không có dòng CSS nào định nghĩa** ⇒ class chết trong mã đã deploy. Hai số của `AC-11` trong HANDOFF (khối ở dòng 204, override ở 213) không tái lập được: khối hiện ở 327. Nguyên nhân khả dĩ nhất là `F-05` — Tier 3 xoá khối `:root` rồi khôi phục bằng bản dựng lại chứ không phải bản gốc | Mở **execution round 2** ở §11. **Kéo theo một đính chính về §9.1:** `SC-02` và `SC-04` của tôi chạy trên chính bản đã hụt mà tôi chưa biết, nên hai dòng đó đúng về con số nhưng **không** chứng minh bản giao còn nguyên; `RQ-01` phần comment và `RQ-12` phần huỷ transform hiện KHÔNG đạt. Ba gate và các phép đo còn lại không bị ảnh hưởng vì chúng chạy trên đúng cây đã deploy |

#### 9.3 Đính chính của Tier 1 với một điều Tier 2 tự khai sai

Tier 2 tự báo hàng sidebar đang active "trắng trên `--color-primary` chỉ đạt 3.15:1, fail AA" và đề nghị mở task nhỏ. **Sai, và Tier 3 đúng khi không FAIL nó.** Nền của hàng active là `--color-primary-container` bằng `#a63b00`; trắng trên nền đó khoảng **6.5:1**, đạt AA cho chữ thường và AAA cho chữ lớn. Con số 3.15:1 chỉ ứng với trắng trên `--color-primary` bằng `#f26522`, mà chỗ duy nhất dùng màu đó là vạch nhấn 3 px **không mang chữ**, và thành phần phi văn bản chỉ cần 3:1. Bỏ điểm này khỏi hàng đợi task nhỏ.


Hai điểm Tier 1 công bố thẳng, không giấu trong evidence:

1. Tôi lệch khỏi đúng một câu trong yêu cầu của sếp. Sếp yêu cầu `transform: translateY` cho cả mục sidebar VÀ hàng bảng. Tôi giữ nguyên cho sidebar và từ chối cho hàng bảng, lý do ghi ở `DEC-08` và `RISK-04`. Hàng bảng nhận nền, vạch nhấn và shadow thay cho dịch chuyển.
2. Sếp đọc lỗi là "popup trong suốt". Chẩn đoán đúng rộng hơn: 10 trong 11 overlay trong suốt, cộng bảng mất vạch kẻ, cộng nút trắng trên trắng, tất cả từ MỘT nguyên nhân ở tầng token. Bằng chứng đối chứng ngay trong repo: overlay duy nhất dùng `bg-white` là overlay duy nhất hiện đúng hôm nay.

#### 9.4 Còn lại sau khi ACCEPTED

`R-01` — **Mã của round này CHƯA lên production và việc đưa lên là quyết định của Owner.** Tại thời điểm resolution, cả 12 file cộng một test vẫn nằm trong working tree, `git rev-list --count origin/main..HEAD` bằng `0`. Trong repo này push nhánh chính CHÍNH LÀ deploy production, nên không tier nào, kể cả Tier 1, được push mã này mà không có một câu cho phép của Owner. Ba gate và chín phép đo ở §9.1 làm cho việc deploy là an toàn về kỹ thuật, nhưng an toàn kỹ thuật không thay thế được uỷ quyền.

`R-02` — **Luật mới cho mọi Tier 3 từ nay:** ngay sau khi ghi `AUDIT.md`, phải tự đọc số byte, tự chạy `verify-audit.ps1` đòi exit `0`, rồi **báo ngay cho Tier 1 để commit file đó**. Lý do ở `F-04`: một `AUDIT.md` đã commit thì cứu được bằng `git restore`, một `AUDIT.md` untracked bị cắt thì mất hẳn, và hiện tượng cắt file đã xảy ra năm lần trong hai ngày.

`R-03` — Sếp còn một bước mắt thường không ai thay được vì repo không có lane DOM: sau khi deploy, mở `/admin/applications`, `/admin/jobs`, `/admin/staffing` và xác nhận panel đã đục, bảng đã có vạch kẻ, nút phát hành đã đọc được. Cấm chụp và cấm dán giá trị SĐT hoặc CCCD thật vào bất kỳ artifact nào, theo §4.3.

`R-04` — Bốn điểm ngoài allowlist của task này, Tier 2 đúng khi không chạm, Tier 1 gom thành một task nhỏ kế tiếp: pill ở `app/bod/page.tsx` tụt tương phản trên chữ 12 px — lưu ý nó ĐÃ fail AA từ trước nên là fail thành nặng hơn, mức P2 không phải P0; một lượt `hover:opacity-90` còn sót ở `app/vendor/page.tsx`; **chín trang admin còn in chuỗi pipeline nội bộ** dạng tên module và tên slice, đây là follow-up đã biết của go-live-03; và một defect Tier 1 tự tìm thấy khi đọc ảnh của sếp — vị từ nhận diện mục active dùng `startsWith` nên mục Tổng quan sáng trên MỌI trang con của `/admin`, tức luôn có hai hàng cùng báo active.

`R-05` — Phần "đơn điệu" mà sếp nêu **không** thuộc task này và không phải defect của round này: `RQ-14` giới hạn task ở hiển thị và tương tác. Đo được: 49 chỗ mã màu thập lục cứng trên 11 trang admin, thuộc bảng màu lạnh, và trước khi có lớp alias thì đó là thứ DUY NHẤT hiện được, nên bảng màu ấm của thương hiệu không lên một pixel nào. Sau deploy mới đánh giá được phần dư, rồi mới viết contract giao diện kế tiếp.

### Audit round 2 — `ACCEPTED`

Tier 1 quyết ngày 2026-09-01. Gate do Tier 1 chạy: `verify-audit.ps1` với cả hai tham số ⇒ `[OK] Verdict: PASS`, exit `0`, trên file `9089` byte. Ranh giới đo trước khi đọc nội dung: `TASK.md` **byte-identical** với HEAD nên Tier 3 không ghi vào ô của Planner, và `git rev-list --count origin/main..HEAD` = `0` nên Tier 3 không commit không push. `AUDIT.md` đã commit ở `5d11c49` **trước khi** resolution này được viết, theo `R-02`.

#### 9.5 Phép đo độc lập của Tier 1 cho round 2 — lần này đo trên bản BIÊN DỊCH

| ID | Điều cần chứng minh | Phép đo | Kết quả |
|---|---|---|---|
| `SC-10` | Lớp alias thật sự SỐNG, không phải chỉ có mặt trong file nguồn | Bóc mọi comment CSS khỏi `app/globals.css` bằng regex rồi mới đếm | alias sống `22`; khối `:root` sống `1`; `transform: none !important` sống `1`. Ở round 1 phép đo tương đương cho ra **`0` khối `:root`** |
| `SC-11` | Lớp alias tới được **production**, không chỉ tới được `.next` trên máy | `curl` bundle CSS đang được serve trước và sau khi deploy | Trước, `d3f6d0d25f5c04fc.css` `69242` byte: `--surface:var(--color-surface)` = `0`, `nav-item-lift` = `0`. Sau, `71260eaaf56163fe.css` `70265` byte: alias sống `27` lượt, `transform:none !important` `1`, `nav-item-lift` `1` |
| `SC-12` | Bằng chứng không thể bị comment qua mặt | Đếm chuỗi comment `Material Symbols Outlined` trong bundle live | `0` — minifier bóc sạch comment. Vì vậy việc alias **có mặt** trong bundle là bằng chứng máy rằng nó là CSS SỐNG. Đây là phép đo duy nhất trong cả task mà lỗi comment không thể lọt qua |
| `SC-13` | `RQ-12` thật sự đạt sau round 2 | Vị trí khối reduced-motion trong nguồn đã bóc comment | Khối ở ký tự `13378` trên tổng `13680` ⇒ đúng là khối cuối, nên nó đè được các quy tắc phía trên |
| `SC-14` | Allowlist `R2-07` | `git show --stat 1af4eff` | Đúng ba đường: `app/globals.css`, `src/shared/ui/design-tokens.static.test.ts`, và `HANDOFF.md` là artifact bắt buộc chứ không phải mã. `role-guard-layout.tsx` KHÔNG bị chạm |
| `SC-15` | Gate của `R2-05` | `npx tsc --noEmit`; `npm run test:unit`; `npm run build` sau khi xoá `.next` | exit `0` / exit `0` với `99` file và `1480` test / exit `0` với `Compiled successfully in 16.8s` |

Mọi số trong `§4 Independent Evidence` của `AUDIT.md` **khớp khít** với phép đo của tôi, gồm cả chuỗi RED quyết định `expected [] to have a length of 1 but got +0`. Verdict `PASS` đứng vững.

#### 9.6 Findings round 2 — đều `ACCEPT_FIX`, không finding nào chặn

| ID | Mức | Nội dung | Xử lý |
|---|---|---|---|
| `F-08` | P1 | **Tier 3 đo `R2-01` và `R2-02` bằng cách "Đọc `globals.css`"** — đúng phương pháp đã thất bại ở round 1, vì đọc nguồn thô không phân biệt được khai báo sống với khai báo bị comment | `ACCEPT_FIX`, không mở round 3. Lý do: phép bóc comment giờ **nằm trong chính bộ test**, và Tier 3 đã chạy nó thấy RED rồi GREEN, nên máy đã làm phép đo đó thay cho mắt người. Luật từ nay: với defect tầng CSS hoặc asset, bằng chứng chỉ hợp lệ nếu (a) bóc comment rồi mới đếm trên nguồn, hoặc (b) đếm trên artifact đã biên dịch. "Đọc file" không phải bằng chứng |
| `F-09` | P2 | `AC-16` ghi build "ra file tĩnh với kích thước lớn hơn rõ rệt (89512 bytes)" — **đúng con số trong HANDOFF của người thi công**, và **không có exit code** | `ACCEPT_FIX`. Cùng lớp với `F-02` của round 1. Tier 1 tự chạy build sạch cache ra exit `0`, và đi xa hơn HANDOFF một bước bằng `SC-11`: đo bundle **trên production**, thứ mà không gate nào trong repo phủ |
| `F-10` | P2 | `§7 Re-audit Trace` ghi round 1 là `FAIL` và ghi "Tier 2 tạo Round 2". **Cả hai đều sai.** Verdict audit round 1 là `PASS` và Tier 1 đã `ACCEPTED` nó; round 2 do **Tier 1 mở**, không phải Tier 2 | `ACCEPT_FIX` nhưng phải đính chính trong biên bản, vì đây là khác biệt giữa "hàng rào đã bắt được lỗi" và "hàng rào đã bỏ lọt lỗi". Sự thật là **bỏ lọt**: một verdict `PASS` đã bao trùm một bản no-op, và đó chính là lý do bốn case mới tồn tại |
| `F-11` | P2 | **Tính độc lập của round 2 chỉ là một phần.** Owner chỉ định phiên Tier 1 kiêm luôn vai Tier 2, nên Tier 3 đang audit mã do Tier 1 viết | `ACCEPT_FIX`. Ghi thẳng ở đây để sau này không ai dẫn round này ra làm bằng chứng rằng ba tầng vẫn tách. Điều giữ được giá trị là: người viết mã **không** viết verdict, và người viết mã tự công bố hạn chế này trong HANDOFF trước khi audit chạy |

#### 9.7 Còn lại

`R-06` — **Bản sửa đã SỐNG trên production**, xác nhận bằng `SC-11` và `SC-12`. Bước cuối không ai thay được vì repo không có lane DOM: Owner mở `/admin/applications`, `/admin/jobs`, `/admin/staffing` và xác nhận bốn thứ — panel chi tiết đục, header bảng có nền phân tầng, nút thêm mới là nút đặc chứ không phải chữ trơn, và pill đang được chọn sáng lên khác hẳn pill không chọn. Nếu ba trong bốn đúng mà một sai, đó là điểm còn lại thật, không còn là lỗi tầng token. Cấm chụp hoặc dán giá trị SĐT, CCCD thật vào bất kỳ artifact nào theo §4.3.

`R-07` — Task này **ĐÓNG**. Bốn điểm ngoài allowlist ở `R-04` và phần "đơn điệu" ở `R-05` thuộc contract giao diện kế tiếp, viết sau khi Owner xem bản đang chạy.




## 10. Revision Log

| Version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-08-31 | Lập contract sửa hiển thị và tương tác cho Admin portal. 19 evidence, 16 decision, 15 requirement, 13 step, 19 acceptance criterion, 15 risk, 4 open question. Nguyên nhân chốt: `app/globals.css` định nghĩa token CHỈ dưới dạng có tiền tố họ trong khối `@theme` của Tailwind v4, trong khi 21 file `.tsx` gọi cùng những tên đó KHÔNG có tiền tố; các tên không tiền tố không được định nghĩa ở đâu cả, nên mỗi khai báo dùng chúng trở thành không hợp lệ tại thời điểm tính giá trị và rơi về giá trị khởi tạo. Với `background-color` giá trị khởi tạo là trong suốt, nên popup mất nền; với `border-bottom` dạng viết gộp thì cả quy tắc biến mất, nên bảng mất vạch kẻ. Phép sửa nhỏ nhất là một khối `:root` gồm 22 alias, không xoá dòng nào, revert bằng cách xoá đúng một khối | Sếp gửi ba ảnh chụp Admin panel ngày 31/08 và yêu cầu sửa popup trong suốt cộng tăng cường hover/active. Điều tra tĩnh cho thấy popup chỉ là một trong nhiều triệu chứng của cùng một nguyên nhân, nên contract sửa nguyên nhân trước rồi mới làm phần tương tác được yêu cầu |
| `v1.0` | 2026-09-01 | Planner Resolution cho audit round 1: `ACCEPTED`, sáu finding `F-01..F-06` đều `ACCEPT_FIX`, chín phép đo độc lập của Tier 1 ghi ở §9.1, năm ràng buộc còn lại ghi ở §9.4. **Không bump spec** — resolution không phải contract change, và `verify-audit.ps1` so spec version giữa TASK và AUDIT nên bump sau audit sẽ làm FAIL gate | Tier 3 giao `AUDIT.md` verdict `PASS` nhưng chín tiêu chí chỉ có lời văn; Tier 1 tự đo lại toàn bộ, thấy mọi khẳng định đều đúng, nên accept verdict và hạ phần lời văn thành finding mức quy trình thay vì đốt một round |
| `v1.0` | 2026-09-01 | Mở execution round 2 ở §11 và thêm `F-07`. **Không bump spec** — round 2 KHÔNG thêm yêu cầu mới, nó chỉ dựng lại phần nội dung mà `RQ-01` và `RQ-12` đã đặc tả sẵn nhưng đã biến mất khỏi cây sau khi audit chạy; bump sẽ làm `verify-audit.ps1` so lệch spec với AUDIT round 1 rồi in FAIL, nhìn giống "chưa từng audit" | Phát hiện lúc chuẩn bị deploy: scope còn 60 insertions thay vì 101, `app/globals.css` còn 37 dòng thêm thay vì 78, và `.nav-item-lift` không còn định nghĩa CSS nào |
| `v1.0` | 2026-09-01 | Planner Resolution cho audit round 2: `ACCEPTED`, task `CLOSED`. Bốn finding `F-08..F-11` đều `ACCEPT_FIX`, sáu phép đo `SC-10..SC-15` ở §9.5, hai ràng buộc còn lại ở §9.7. **Không bump spec.** `F-07` được chốt lại đúng bản chất: không phải "mất 41 dòng" mà lớp alias bị dán lệch một dòng vào giữa comment nên cả 22 alias là comment CSS và bản deploy `474f3dc` là no-op hoàn toàn | Bằng chứng mạnh nhất của cả task nằm ở `SC-11` và `SC-12`: bundle CSS đang serve trước deploy có `0` lượt alias, sau deploy có `27`, và chuỗi comment trong bundle bằng `0` vì minifier bóc sạch comment — nên alias có mặt trong bundle là bằng chứng máy rằng nó là CSS sống |

## 11. Execution Round 2 — dựng lại phần bị mất

Phạm vi hẹp, một file. **KHÔNG mở yêu cầu mới, KHÔNG sửa gì khác, KHÔNG chạm 12 file còn lại của round 1.**

| ID | Nội dung |
|---|---|
| `R2-01` | Trong `app/globals.css`, thêm lại comment tài liệu ngay TRƯỚC khối `:root` alias, theo `RQ-01`: nêu đây là lớp tương thích của go-live-10, nêu nguyên nhân gốc là `var()` trỏ tới custom property không tồn tại làm cả khai báo trở thành invalid-at-computed-value-time, và nêu hướng dọn dài hạn là chuyển các điểm gọi sang tên có tiền tố rồi xoá lớp này |
| `R2-02` | Thêm lại quy tắc huỷ chuyển động đúng mục tiêu, BÊN TRONG khối `@media (prefers-reduced-motion: reduce)` đang có: một selector chỉ nhắm cú nhấc của mục điều hướng và đặt `transform: none !important`. **Cấm** dùng `transform: none` cho `*` — nhiều overlay căn giữa bằng `translate`, reset trắng sẽ làm hộp thoại lệch tâm; chính HANDOFF round 1 đã ghi rõ lý do này |
| `R2-03` | Class `nav-item-lift` hiện được `role-guard-layout.tsx` gắn nhưng không có định nghĩa CSS nào. Chọn MỘT trong hai và ghi rõ lựa chọn vào HANDOFF: (a) định nghĩa lại quy tắc cho class đó trong `app/globals.css`, hoặc (b) bỏ class khỏi `role-guard-layout.tsx` nếu cú nhấc đã do utility Tailwind ở cùng điểm gọi đảm nhiệm — nhưng nếu chọn (b) thì `R2-02` phải nhắm đúng selector còn lại, không được để `prefers-reduced-motion` mất tác dụng |
| `R2-04` | Bổ sung case vào `src/shared/ui/design-tokens.static.test.ts` để lần sau mất là gate bắt được: khẳng định khối alias có comment đi kèm, và khẳng định khối `prefers-reduced-motion` có chứa một quy tắc `transform: none` nhắm selector cụ thể chứ không phải `*`. Chạy RED trước GREEN, dán cả hai output |
| `R2-05` | Gate: `npx tsc --noEmit` exit 0; `npm run test:unit` exit 0 với tổng không thấp hơn `1476`. Đọc `LASTEXITCODE` ngay sau mỗi lệnh, KHÔNG qua pipe |
| `R2-06` | KHÔNG commit, KHÔNG push, KHÔNG deploy. Round 1 đã lên production; round 2 lên sau khi có audit và resolution, hoặc khi Owner cho phép rõ ràng như lần này |
| `R2-07` | Allowlist tuyệt đối: `app/globals.css` và `src/shared/ui/design-tokens.static.test.ts`. Nếu chọn phương án (b) của `R2-03` thì thêm `src/shared/ui/role-guard/role-guard-layout.tsx`, chỉ ở chuỗi class của mục điều hướng. Mọi file khác là vi phạm |
| `R2-08` | Trước khi bắt đầu, chạy `git diff --numstat -- app/globals.css` và dán kết quả vào HANDOFF làm mốc. Sau khi xong, chạy lại và dán. Hai con số đó là bằng chứng chống lại chính lỗi đã gây ra round này |
