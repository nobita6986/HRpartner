# TASK: hrp-v5-go-live-08-public-ui-premium

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-08-public-ui-premium` |
| Work type | `CODE` — presentation layer, không chạm dữ liệu |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.3` |
| Status | `READY_FOR_EXECUTION` — sẵn sàng nhận `/code` round 1. GO-LIVE-05 đã **ĐÓNG** (`ACCEPTED`, push `e0c14ca` + `c6256e7`) nên điều kiện xếp hàng của `DEC-08` đã hết vai trò |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — independent context |
| Baseline | **Baseline mã = `c6256e7`** — mọi số đo của contract do Tier 1 đọc trực tiếp tại đúng SHA này. **HEAD lúc giao = `e7c1037`** (`origin/main` cũng `e7c1037`): hai commit `ed9c8f7` và `e7c1037` nằm sau `c6256e7` là **docs-only**, `git diff --name-only c6256e7..HEAD` trả đúng hai đường `docs/PLANNER_HANDOVER.md` và `docs/tasks/hrp-v5-go-live-08-public-ui-premium/TASK.md` ⇒ **0 dòng mã** thay đổi nên mọi số đo tại `c6256e7` vẫn còn hiệu lực, xem `DEC-20`. Anchor cũ `d4928af` của `v1.1` cách `c6256e7` **39 commit**, trong đó **bảy** commit chạm mã bề mặt công khai và đã deploy production (`e0a70f7`, `0248948`, `691be38`, `9a9ed28`, `474f3dc`, `1af4eff`, `c6256e7`) ⇒ xem `DEC-16` |
| Modules | Public marketplace presentation — landing `/`, navbar công khai, token layer |
| ADR references | `app/globals.css` header G27 chốt 15/08/2026; `stitch/warm_professionalism/DESIGN.md` |
| Design standard | Skill `ui-ux-pro-max` — `C:\Users\Admin\.agents\skills\ui-ux-pro-max\.claude\skills\ui-ux-pro-max\SKILL.md`; runtime nạp skill báo base dir `C:\Users\Admin\.claude\skills\ui-ux-pro-max`. Rule ID của skill là ngôn ngữ acceptance của task này, xem `DEC-07` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `/code hrp-v5-go-live-08-public-ui-premium` — **mở ngay**: GO-LIVE-05 đã đóng nên điều kiện chờ đã hết. Lệnh giao kèm `R-01`: KHÔNG commit, KHÔNG push |
| Updated | `2026-09-02 00:40 +07` |

Task này nâng chất lượng trình bày của bề mặt công khai lên mức Modern/Clean/Premium bằng **chính hệ token đã chốt**, không đổi một dòng dữ liệu nào. Nó cũng đóng một lỗi tiếp cận thật: bề mặt công khai hiện không có trạng thái focus nhìn thấy được.

## 1. Outcome

### User-visible outcome

- Card việc làm ở trạng thái nghỉ có viền nhạt và bóng ấm của design system; khi hover thì nâng lên nhẹ, bóng lan rộng hơn và viền chuyển sang màu cam chủ đạo. Ba thay đổi này chạy cùng nhau, tổng thời lượng tối đa 250ms.
- Pill địa điểm và pill ca làm khác nhau về nền để phân cấp thông tin: địa điểm dùng nền cam rất nhạt, ca làm giữ nền trung tính.
- Tên việc làm to và đậm hơn hiện tại; tên đơn vị và địa điểm dùng màu xám dịu của token nên không tranh chấp sự chú ý.
- Card thở hơn: padding bằng đúng token 24px của design system thay vì 16px.
- Panel bộ lọc tách hẳn khỏi danh sách nhờ nền xám rất nhạt, không còn cùng màu trắng với card.
- Mọi control tương tác trên bề mặt công khai có vòng focus màu cam nhìn thấy được khi dùng bàn phím: ô tìm kiếm, hai phần tử select, checkbox và mọi nút.
- Checkbox được custom: bo góc nhẹ, nền cam khi chọn, dấu check hiện ra mượt thay vì nhảy.
- Nút Ứng tuyển và Tìm kiếm đậm lên kèm scale rất nhẹ khi hover và lún nhẹ khi nhấn. Nút Đăng nhập dạng outline được fill nền khi hover.
- Người bật giảm chuyển động của hệ điều hành không thấy transform hay animation nào; họ vẫn thấy đổi màu.

### Non-goals

- Không sửa `enrichJob`, không sửa fetch, không sửa state bộ lọc, không sửa DTO hay route. Toàn bộ trục dữ liệu thuộc GO-LIVE-05.
- Không sửa nhãn đơn vị tuyển dụng và không sửa bốn danh sách filter đang hardcode; đó là nợ của GO-LIVE-05, task này chỉ tạo hình cho chúng.
- Không sửa khối CSS đã chết của bề mặt công khai trong `app/globals.css`; dọn khối đó là task riêng.
- Không đổi giá trị của bất kỳ token màu, radius, spacing hay font nào đang có.
- Không thêm thư viện animation, không thêm dependency, không thêm framework CSS.
- Không chạm trang admin, RLS, migration, apply flow, affiliate, middleware, cấu hình domain.
- Không deploy production và không chạy launch drill.

## 2. Evidence và Baseline

Mọi dòng dưới đây do Tier 1 đọc trực tiếp tại `d4928af`, không nhận qua lời kể.

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `app/globals.css:98` | Chỉ tồn tại **một** token bóng đổ `--shadow-card` gồm hai lớp | Không có bậc elevation thứ hai nên "bóng lan rộng khi hover" hiện không diễn tả được bằng token |
| `EV-02` | `app/(portal)/page.tsx:422` | Card dùng `shadow-sm hover:shadow-md transition-shadow`, tức bóng **mặc định xám của Tailwind**; token `--shadow-card` không được dùng ở card live | Bóng trên site không phải bóng ấm đã thiết kế; `transition-shadow` không phủ transform và border-color nên dù thêm hai hiệu ứng đó cũng không có chuyển động |
| `EV-03` | `app/(portal)/page.tsx:422` so với `app/globals.css:86` | Card padding `p-4` = 16px trong khi token `--spacing-card-padding` = 24px | Khiếu nại thiếu khoảng trắng là đo được, không phải cảm tính |
| `EV-04` | `app/(portal)/page.tsx:440` | Tên việc làm cỡ `text-base` = 16px, `font-bold` | Nhỏ hơn cả cỡ 17px của chính mockup canonical; đúng nhận xét cần to và đậm hơn |
| `EV-05` | `app/(portal)/page.tsx:467-482` | Địa điểm và ca làm **đã** được bọc pill `rounded-full`, nền `--color-surface-container` = `#efeeec` | Yêu cầu "bọc pill" đã có sẵn tại HEAD. Vấn đề thật là hai pill trùng nền nhau và nền quá gần màu card nên không đọc ra phân cấp |
| `EV-06` | `app/(portal)/page.tsx:488-495` | Nút Ứng tuyển đặt màu bằng inline `style`, có `transition-colors` nhưng không có bất kỳ biến thể hover nào | Inline style **không** biểu đạt được hover/focus/media query. Đây là nguyên nhân gốc của cảm giác phẳng, không phải thiếu class |
| `EV-07` | `app/(portal)/page.tsx:626` | Panel bộ lọc dùng `bg-surface` = `#ffffff`, y hệt nền card | Panel không tách khỏi danh sách; đúng khiếu nại |
| `EV-08` | `app/(portal)/page.tsx:642-654`, `:664-669`, `:688-692` | Ô tìm kiếm và hai phần tử select chỉ có `transition-colors`, không có một class focus nào. Hai select **đã có** `appearance-none`, `cursor-pointer` và `aria-label` | Focus không nhìn thấy trên bề mặt công khai = vi phạm WCAG 2.2 tiêu chí 2.4.7 và rule `focus-states` mức High của skill. Phần appearance của select đã đạt, không được ghi lại thành việc mới |
| `EV-09` | `app/(portal)/page.tsx:714-718,738-742` | Checkbox là input native chỉ gắn `w-5 h-5 rounded border-outline-variant`; **không** có `appearance-none` | Khi chưa tắt appearance thì border và radius bị trình duyệt bỏ qua và dấu check giữ màu mặc định của trình duyệt. Checkbox cam bo góc hiện chưa tồn tại dù class trông như đã có |
| `EV-10` | `app/globals.css` toàn file, 297 dòng | 0 `:focus-visible`, 0 `prefers-reduced-motion`. Khối `@media` duy nhất của file nằm ở dòng 288, tức bên trong khối CSS đã chết | Thêm chuyển động mà không có guard giảm chuyển động là tạo regression tiếp cận mới. Cũng nghĩa là lớp token hiện chưa có một điểm neo responsive nào còn sống |
| `EV-11` | `app/components/GlobalNavbar.tsx:191-199` và `:290-294` | Nút Đăng nhập dạng outline đặt viền và màu chữ bằng inline style, không có hover | Nút này **không** nằm trong `app/(portal)/page.tsx`; scope phải gọi tên file navbar, và bán kính ảnh hưởng là mọi trang dùng navbar chung |
| `EV-12` | `app/globals.css:140-297` | Toàn bộ lớp thủ công của bề mặt công khai chỉ xuất hiện trong `app/globals.css` và hai file mockup HTML; **không một file tsx nào** dùng chúng | BẪY FALSE-PASS: sửa khối CSS này không đổi một pixel nào trên site live trong khi mọi gate vẫn xanh. Contract phải cấm sửa khối đó |
| `EV-13` | `app/globals.css:107-108` | Có `--ease-out` và `--t-fast` = 150ms | Chuẩn "dưới 300ms" đạt được bằng token có sẵn, không cần số ad-hoc |
| `EV-14` | `stitch/warm_professionalism/DESIGN.md` | Design source canonical **không** định nghĩa elevation, focus hay motion | Thêm ba nhóm token này là lấp lỗ chưa từng có, không phải đảo quyết định G27 đã chốt |
| `EV-15` | Skill `ui-ux-pro-max` | Skill **tồn tại và chạy được**: `SKILL.md` cộng `references/` cộng `scripts/search.py` nằm tại đường dẫn ghi ở §0. Tier 1 đã chạy bước bắt buộc `--design-system` và ba truy vấn `--domain ux` của chính skill | Chuẩn acceptance của task lấy trực tiếp từ rule ID của skill thay vì diễn giải lại, xem `DEC-07`. Ghi nhận sửa lỗi: v1.0 kết luận skill không tồn tại vì chỉ tìm trong repo, không tìm ở đường dẫn skill mức người dùng |
| `EV-16` | `app/(portal)/page.tsx:73` và `:86-97` | Nhãn đơn vị còn hardcode một tên duy nhất; bốn danh sách filter địa điểm/ngành/ca/loại hình còn hardcode trong UI | Đây là phần việc của GO-LIVE-05 và là lý do task 08 xếp sau, xem `DEC-08` |
| `EV-17` | Skill, output `--design-system` cho truy vấn job board/staffing | Pattern trả về là **Marketplace / Directory**, kèm chỉ dẫn "Search bar is the CTA. Reduce friction to search." và hai anti-pattern đích danh: "Outdated forms", "Hidden filters" | Nhận toàn bộ: ô tìm kiếm phải là phần tử nổi bật nhất của panel, và panel bộ lọc không được thu gọn mặc định trên desktop |
| `EV-18` | Skill, cùng output đó | Cùng lệnh đề xuất palette xanh lạnh, cặp font EB Garamond cộng Lato ghi rõ "Best For: Law firms, legal services", và style "Exaggerated Minimalism" ghi rõ "Best For: Fashion, architecture, portfolios, luxury brands, editorial" | Ba nhóm này xung đột với G27 đã chốt và nhắm sai đối tượng người dùng; bị từ chối có lý do trong `DEC-12` |
| `EV-19` | Skill, `--domain ux` | Rule `touch-target-size` mức **High**: tối thiểu 44x44px, ví dụ sai được nêu là nút cỡ `w-6 h-6`. Rule `touch-spacing` mức Medium: khoảng cách tối thiểu 8px | Đo tại HEAD: nút lưu việc `w-9 h-9` = 36px; checkbox `w-5 h-5` = 20px; nút Ứng tuyển chỉ có `py-2` nên chiều cao dưới 44px khi không có min-height. Contract v1.0 **không** đo nhóm này |
| `EV-20` | Skill, `--domain ux`; grep `app/**` | Rule `skip-links` mức Medium tồn tại; grep toàn bộ `app/**` cho `sr-only` và skip link trả về 0 kết quả | Bề mặt công khai có navbar dính đầu trang, người dùng bàn phím phải đi hết navbar mới tới danh sách việc |
| `EV-21` | Skill, `--domain ux` | Rule `excessive-motion` mức **High**: tối đa 1-2 phần tử động mỗi khung nhìn. Rule `transform-performance`: chỉ transform và opacity. Rule `exit-faster-than-enter`: thời lượng ra ngắn hơn vào | Đặt **trần** cho choreography hover, chống hiểu "premium" thành động khắp nơi. v1.0 chỉ có sàn về thời lượng, không có trần về số lượng |
| `EV-22` | `app/(portal)/page.tsx:620` so với `app/components/GlobalNavbar.tsx:85` | Container trang dùng `max-w-[1600px] px-6 md:px-[5%]`; container navbar dùng `max-w-7xl` = 1280px | Rule `container-width` của skill gọi tên đúng lỗi này: trên màn hình rộng mép trái nội dung không thẳng với mép trái navbar. Đây là lỗi bố cục đo được, không phải cảm tính |
| `EV-23` | `app/(portal)/page.tsx:434`, `:472`, `:479`, `:639`, `:660`, `:675` | Icon Material Symbols là ligature dạng chữ và không có `aria-hidden` | Công nghệ trợ giúp đọc thành chuỗi "location_on", "schedule", "expand_more", "search" chen vào giữa nội dung thật |
| `EV-24` | `app/(portal)/page.tsx:642-654` | Ô từ khóa chỉ có `placeholder` cộng `aria-label`, không có nhãn nhìn thấy được; thuộc tính type là `text` | Rule `input-labels` mức High cấm dùng placeholder làm nhãn; rule `input-types` yêu cầu type ngữ nghĩa cho bàn phím di động |
| `EV-25` | `app/(portal)/page.tsx:500`, `:754-769`, `:808-823` | Nút lưu việc **đã có** `aria-label`; nút Tìm kiếm **đã có** `aria-busy`, spinner và `disabled:cursor-wait`; danh sách **đã có** skeleton `animate-pulse` 6 ô | Ba rule `aria-labels`, `submit-feedback` và `loading-states` của skill **đã đạt** tại HEAD. Cấm ghi lại thành việc mới; nếu HANDOFF kể đây là thành tựu của round này thì đó là bằng chứng thổi phồng |
| `EV-26` | `app/globals.css` | File dài đúng 297 dòng và khối CSS đã chết chạy từ dòng 140 tới **hết file** | Không tồn tại chỗ "cuối file" nằm ngoài khối chết. Lớp CSS mới phải đặt sau dòng 297, và phép đo bảo toàn khối chết phải là **so nguyên văn**, không phải đếm dòng diff, xem `AC-12` |
| `EV-27` | `app/(portal)/page.tsx:170`, `:227`, `:240`, `:633` | **Bốn** khai báo `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2` đã có sẵn tại `c6256e7`: link tên việc, nút Ứng tuyển, nút Lưu việc, nút trong `ApplyModal`. `grep -c "outline-none"` = `0` | `v1.1` khai **hai** khai báo ở `:347` và `:374`; cả số lượng lẫn vị trí đều đã lạc vì file co từ 901 xuống 659 dòng. `AC-07` không còn đo được bằng ngưỡng "before = 0" |
| `EV-28` | `app/globals.css:341` | Khối `:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px }` **toàn cục** đã tồn tại, do `474f3dc` thêm. Tại `d4928af` phép đếm `:focus-visible` trong file này là `0` | Vòng focus toàn cục đã có sẵn ⇒ `RQ-07` chuyển từ "tạo mới" sang "bảo toàn + phủ đủ + không bị `outline-none` che" |
| `EV-29` | `app/globals.css:346` | Khối `@media (prefers-reduced-motion: reduce)` phủ selector `*` với `animation-duration`, `animation-iteration-count`, `transition-duration`, `scroll-behavior`, cộng `.nav-item-lift:hover { transform: none }`. Tại `d4928af` phép đếm là `0` | `RQ-10` "tồn tại đúng một guard" đã được thoả **trước khi** Tier 2 chạm file ⇒ đổi thành nghĩa vụ bảo toàn, không phải nghĩa vụ tạo |
| `EV-30` | `.next/static/css/a9a58959799ae4eb.css` (89.489 B, build `2026-09-01_14:53`) | Cả hai chuỗi `:focus-visible` và `prefers-reduced-motion` **có mặt trong bundle đã minify**, và vẫn còn sau khi bóc toàn bộ comment `/* */` khỏi nguồn | Phép đo chống lại bẫy `474f3dc` — khối CSS từng bị dán vào giữa comment nên nguồn có mà bundle rỗng. Hai khối này **thật sự sống**, không phải comment |
| `EV-31` | `app/(portal)/page.tsx` | `grep -c 'type="checkbox"'` = **`0`**. GO-LIVE-05 đã rút bộ lọc ngành nghề theo `DEC-13` của contract 05; control còn lại là `select` tại `:287`, đã mang sẵn `appearance-none` | `RQ-08`/`AC-08` của `v1.1` đòi custom checkbox cho một phần tử **không còn tồn tại** ⇒ bẫy "AC bất khả đo". Repoint sang `select`, **không** tách nó thành hai mã con bằng hậu tố chữ (`DEC-18`) |
| `EV-32` | `app/globals.css`, 360 dòng | Khối lớp thủ công đã chết đã dịch chỗ: `.pub-header` `:189`, `.filter-panel` `:242`, `.job-card` `:280`, `.pub-foot` `:323`. `v1.1` trích vùng `140`–`297` | `AC-12` trích sai vùng dòng ⇒ Tier 2 sẽ "bảo toàn" đúng ý nhưng sai địa chỉ. Sửa thành vùng `189`–`360` và neo bằng bốn selector thay vì số dòng tuyệt đối |
| `EV-33` | `app/(portal)/page.tsx:139`, `:150`, `:169`, `:7`, `:646` | `const detailHref = publicJobDetailPath(job.slug)` tại `:139` cùng **hai** lần dùng `href={detailHref}` tại `:150` và `:169`; `ApplyModal` import ở `:7` và dùng ở `:646` | Điều hướng card của GO-LIVE-12 và modal đã tách của GO-LIVE-05 là hai bất biến **chưa có AC nào bảo vệ** trong `v1.1` ⇒ thêm `RQ-24` và `RQ-25` |
| `EV-34` | `app/(portal)/page.tsx`, 659 dòng | `grep -c 'style={{'` = `39`. Control đếm được: 5 `button`, 2 `Link`, 1 `input`, 1 `select` = **9**. Nút Lưu việc `:240` = `w-9 h-9` (36px), nút Ứng tuyển `:227` = `px-6 py-2`, `select` `:287` = `py-2.5 pl-4 pr-10` | `RQ-17` còn **hai** đích thật; đích "nhãn checkbox 20px" chết cùng `EV-31`. Số control `9` là ngưỡng đếm của `AC-07`. 39 inline style vẫn là nguyên nhân gốc của "phẳng" (`EV-13`) |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | `CHOSEN` | **Không tiêm màu lạnh vào palette ấm.** Yêu cầu nền `#f9fafb` được thực hiện bằng token có sẵn `--color-surface-container-low` = `#f4f3f1`; yêu cầu chữ xám slate-500 được thực hiện bằng `--color-on-surface-variant`. Lý do: hệ màu canonical là Warm Professionalism; trộn xám lạnh làm vỡ palette đã chốt và tạo hai hệ xám cạnh nhau | Tier 1 / G27 | Final |
| `DEC-02` | `CHOSEN` | Token mới chỉ được **thêm** vào khối theme, không đổi giá trị token nào đang có. Ba nhóm: một bậc bóng hover, một token vòng focus, một token thời lượng thứ hai tối đa 250ms | Tier 1 | Final |
| `DEC-03` | `CHOSEN` | **Trục refactor thật là chuyển màu của control tương tác từ inline style sang class dùng token**, vì inline style không biểu đạt được hover/focus/media query (`EV-06`). Không được giả lập bằng state React theo sự kiện chuột | Tier 1 | Final |
| `DEC-04` | `CHOSEN` | Pill địa điểm dùng `--color-primary-soft` = `#fdf1ec`, đúng ý "nền cam rất nhạt" và đã có token; pill ca làm giữ nền trung tính hiện tại. Hai nền khác nhau chính là phân cấp thông tin | Tier 1 | Final |
| `DEC-05` | `CHOSEN` | Card hover dùng dịch chuyển dọc lên 2px cộng bóng bậc hai cộng viền cam. **Không** dùng scale trên card vì scale làm chữ mờ trên màn hình không HiDPI. Scale rất nhẹ chỉ áp cho nút | Tier 1 | Final |
| `DEC-06` | `CHOSEN` | Mọi chuyển động dùng `--ease-out` và thời lượng token; giá trị số viết trực tiếp trong class bị coi là vi phạm. Toàn bộ transform và animation phải nằm dưới guard giảm chuyển động | Tier 1 / WCAG 2.3.3 | Final |
| `DEC-07` | `CHOSEN` | **Chuẩn acceptance của task là skill `ui-ux-pro-max`** (`EV-15`), dùng đúng rule ID của skill làm ngôn ngữ đo: `focus-states`, `keyboard-nav`, `color-contrast`, `contrast-readability`, `reduced-motion`, `skip-links`, `touch-target-size`, `touch-spacing`, `cursor-pointer`, `duration-timing`, `easing`, `exit-faster-than-enter`, `transform-performance`, `excessive-motion`, `state-clarity`, `disabled-states`, `elevation-consistent`, `visual-hierarchy`, `whitespace-balance`, `input-labels`, `input-types`, `container-width`. **Thứ tự ưu tiên lấy từ bảng của skill**: nhóm Accessibility và nhóm Touch/Interaction là CRITICAL nên đứng trước mọi hạng mục thẩm mỹ; nếu một yêu cầu thẩm mỹ xung đột với một rule CRITICAL thì rule thắng. WCAG 2.2 mức AA (2.4.7, 1.4.3, 2.3.3) vẫn được giữ vì chính skill viện dẫn WCAG làm nguồn cho các rule đó | Tier 1 / skill | Final |
| `DEC-08` | `CHOSEN` | **Task 08 xếp sau GO-LIVE-05.** Lý do product: làm card đẹp hơn khi nhãn đơn vị còn là một tên hardcode cho mọi việc làm chỉ khiến dữ liệu chưa đúng trở nên thuyết phục hơn. Lý do kỹ thuật: GO-LIVE-05 rewire chính các phần tử mà task 08 tạo hình cho, nên làm ngược thứ tự sẽ phải tạo hình hai lần | Tier 1 | Final |
| `DEC-09` | `CHOSEN` | Checkbox vẫn là input native cộng `appearance-none`, **không** thay bằng thẻ div giả. Lý do: giữ tiêu điểm bàn phím, phím cách, trạng thái cho công nghệ trợ giúp và nhãn liên kết sẵn có | Tier 1 / a11y | Final |
| `DEC-10` | `CHOSEN` | Không sửa khối CSS đã chết của bề mặt công khai (`EV-12`). Nếu Tier 2 thấy nên dọn thì ghi thành follow-up trong HANDOFF, không tự dọn trong task này | Tier 1 | Final |
| `DEC-11` | `ASSUMPTION` | Không có snapshot test hoặc visual regression test nào đang khóa markup của trang landing. Nếu Tier 2 phát hiện có, thì cập nhật snapshot là việc trong scope nhưng phải liệt kê từng file trong HANDOFF | Tier 1 | Tới khi Tier 2 chạy full unit |
| `DEC-12` | `CHOSEN` | **Từ chối có lý do ba đề xuất của skill** (`EV-18`): palette xanh lạnh, cặp font EB Garamond cộng Lato, và style Exaggerated Minimalism. Lý do: G27 Warm Professionalism là quyết định đã chốt 15/08 và task này là task trình bày chứ không phải task đảo ADR; thêm nữa ba đề xuất đó tự khai nhắm vào hãng luật, thời trang và thương hiệu xa xỉ, còn người dùng của bề mặt này là lao động phổ thông tìm việc nhà máy. Cái **được nhận** từ cùng output đó là Pattern Marketplace/Directory và hai anti-pattern "Outdated forms", "Hidden filters" (`EV-17`). Skill được dùng làm chuẩn về hành vi, tiếp cận và chuyển động, không làm chuẩn về bản sắc thương hiệu | Tier 1 / G27 | Final |
| `DEC-13` | `CHOSEN` | **Loại trừ các bảng rule chỉ dành cho ứng dụng native của skill** — safe area, ripple, haptic, Dynamic Type, ngưỡng 48dp — theo đúng ghi chú phạm vi của chính skill, vốn nói phần đó áp cho native app và chỉ sang tài liệu tham chiếu khác cho web/desktop. Ngưỡng chạm dùng con số 44x44px, không dùng 48dp | Tier 1 / skill | Final |
| `DEC-14` | `CHOSEN` | Checklist của skill đòi thiết kế song song sáng và tối. Hệ token G27 hiện **không** có biến thể tối, và thêm chế độ tối là một task riêng có ảnh hưởng tới toàn bộ admin. Task này khai báo chế độ tối **ngoài phạm vi** và cấm làm nửa vời: không thêm khai báo `prefers-color-scheme`, không thêm biến thể token tối | Tier 1 | Final |
| `DEC-15` | `CHOSEN` | Ngưỡng 44x44px áp cho **cả** bề mặt web trên desktop, không chỉ di động, vì đây là bề mặt chính cho người dùng cuối và phần lớn họ vào bằng điện thoại; rule `touch-target-size` mức High của skill không miễn cho web. Được phép đạt ngưỡng bằng padding hoặc mở rộng vùng chạm, **không** bắt buộc phóng to icon | Tier 1 / skill | Final |
| `DEC-16` | `CHOSEN` | **Relock baseline `d4928af` → `c6256e7`.** Giữa hai điểm có `39` commit, trong đó bảy commit chạm mã bề mặt công khai và **đã deploy production**. Mọi số "before" của `v1.1` phải được đọc lại tại `c6256e7`; số nào `v1.2` không tự đo lại thì **không** được dùng làm ngưỡng PASS | Tier 1, `EV-27`..`EV-34` | `ACTIVE` |
| `DEC-17` | `CHOSEN` | **Từ vựng verdict của AUDIT.** `verify-audit.ps1:97` chỉ nhận `PASS` \| `FAIL` \| `PARTIAL` \| `BLOCKED` \| `N/A`. `ENV_BLOCKED` **không** phải token verdict (`grep -rn 'ENV_BLOCKED' .ai-pipeline/` trả rỗng) và `BLK-01` là **mã blocker** của `HANDOFF.template.md:49`. AC bị chặn bởi môi trường: cột verdict ghi `BLOCKED`, còn `ENV_BLOCKED` cùng `BLK-01` cùng lý do môi trường ghi trong **ô evidence** | Tier 1, kế thừa GO-LIVE-05 | `ACTIVE` — áp cho cả 08, 09, 07 |
| `DEC-18` | `CHOSEN` | **Repoint, không tách mã.** `RQ-08`/`AC-08` đổi đích từ checkbox (không còn tồn tại) sang `select` bộ lọc; nửa checkbox của `RQ-17`/`AC-17` bị rút. **Cấm** tách `AC-08` thành hai mã con bằng hậu tố chữ: `verify-audit.ps1` sẽ đòi AUDIT phủ cả hai nửa, trong đó một nửa không thể đo | Tier 1, `EV-31` | `ACTIVE` |
| `DEC-19` | `CHOSEN` | **Hai khối a11y toàn cục là tài sản có sẵn, không phải công việc của task này.** `:focus-visible` `:341` và `prefers-reduced-motion` `:346` do `474f3dc` thêm và đã sống trong bundle. Tier 2 **không** được kể lại chúng như thành quả (`RISK-12`), nhưng **phải** bảo toàn: xoá, sửa hoặc làm suy yếu chúng là FAIL | Tier 1, `EV-28`..`EV-30` | `ACTIVE` |
| `DEC-20` | `CHOSEN` | **Baseline mã và HEAD là hai thứ khác nhau; commit docs-only không làm hỏng baseline.** `v1.2` viết `STEP-12` đòi `git rev-parse HEAD` phải bằng `c6256e7`, nhưng chính việc push contract (`ed9c8f7`) và cursor (`e7c1037`) đã đẩy HEAD lên `e7c1037` **trước khi** lệnh `/code` được giao ⇒ đọc đúng mặt chữ thì Tier 2 phải STOP ngay câu lệnh đầu tiên vì một thay đổi **0 dòng mã**. Luật thay thế: phép đo neo vào **baseline mã** `c6256e7`, và điều kiện hợp lệ là `git diff --name-only c6256e7..HEAD` **không** trả đường nào ngoài `docs/`. Điều kiện này mạnh hơn so SHA vì nó chặn đúng thứ cần chặn — commit mã chen vào — mà không chặn ghi chép | Tier 1, tự đo tại `e7c1037` | `ACTIVE` |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Khối theme được thêm đúng ba nhóm token: một bậc bóng hover, một vòng focus, một thời lượng thứ hai. Không một token cũ nào bị đổi giá trị | Must | `EV-01/13/14`, `DEC-02` | Đổi giá trị token cũ → FAIL |
| `RQ-02` | Card ở trạng thái nghỉ dùng bóng token của design system thay cho bóng mặc định của framework | Must | `EV-02` | Còn dùng bóng mặc định → FAIL |
| `RQ-03` | Card hover có đồng thời ba hiệu ứng: nâng lên 2px, bóng bậc hai, viền chuyển màu cam chủ đạo; khai báo transition phủ đủ cả ba thuộc tính và thời lượng tối đa 250ms | Must | `EV-02`, `DEC-05/06` | Thiếu một trong ba, hoặc transition không phủ thuộc tính tương ứng → FAIL |
| `RQ-04` | Card padding bằng token 24px; tên việc làm tăng cấp cỡ và giữ đậm; tên đơn vị và địa điểm dùng màu xám dịu của token | Must | `EV-03/04`, `DEC-01` | Padding hoặc cỡ chữ không đổi → FAIL |
| `RQ-05` | Pill địa điểm dùng nền cam rất nhạt bằng token, pill ca làm giữ nền trung tính; cả hai giữ bo tròn hết cạnh và giữ icon | Must | `EV-05`, `DEC-04` | Hai pill vẫn trùng nền → FAIL |
| `RQ-06` | Panel bộ lọc tách khỏi danh sách bằng nền xám rất nhạt của token; giá trị nền panel phải khác giá trị nền card | Must | `EV-07`, `DEC-01` | Panel còn cùng màu với card → FAIL |
| `RQ-07` | Vòng focus **toàn cục** ở `app/globals.css:341` được bảo toàn nguyên vẹn và **phủ đủ**: cả 9 control tương tác của bề mặt công khai (`EV-34`) hiện vòng focus nhìn thấy được khi điều hướng bằng bàn phím; phép đếm `outline-none` trên trang landing giữ nguyên giá trị `0`; vòng focus đạt tương phản 3:1 với nền kề nó | Must | `EV-27`, `EV-28`, `EV-30`, `EV-34`, `DEC-19` | Một control còn không có vòng focus, hoặc xuất hiện `outline-none` → P0 tiếp cận |
| `RQ-08` | `select` bộ lọc tại `app/(portal)/page.tsx:287` giữ `appearance-none` và vẫn là element **native**; có chevron chỉ hướng vẽ bằng CSS hoặc icon; hover và focus phân biệt được bằng class dùng token; vòng focus của nó không bị nền panel làm mờ. **Checkbox đã không còn tồn tại trên bề mặt này** (`EV-31`) nên không phải đích của `RQ` này nữa | Must | `EV-31`, `DEC-18` | Thay `select` bằng widget tự vẽ, hoặc mất `appearance-none` → FAIL |
| `RQ-09` | Nút Ứng tuyển và Tìm kiếm có hover đậm lên cộng scale rất nhẹ và có trạng thái nhấn; nút Đăng nhập outline được fill nền khi hover. Tất cả biểu đạt bằng class dùng token, không bằng inline style | Must | `EV-06/11`, `DEC-03` | Còn đặt màu tương tác bằng inline style → FAIL |
| `RQ-10` | Guard giảm chuyển động ở `app/globals.css:346` được **bảo toàn nguyên vẹn** và phủ **mọi** transform/animation mới của task này; người bật giảm chuyển động vẫn thấy đổi màu. Không thêm khối `prefers-reduced-motion` thứ hai — sau task này số khối phải vẫn là `1` | Must | `EV-29`, `EV-30`, `DEC-19` | Sửa hoặc xoá guard, hoặc thêm chuyển động guard không phủ → FAIL |
| `RQ-11` | Diff trên trang landing chỉ chạm thuộc tính trình bày. Không một dòng nào chạm hàm làm giàu dữ liệu, fetch, state bộ lọc, nhãn đơn vị hay bốn danh sách filter | Must | `EV-16`, `DEC-08` | Chạm trục dữ liệu → P0 chồng scope |
| `RQ-12` | Khối CSS đã chết của bề mặt công khai — vùng `189`–`360` của `app/globals.css` theo `EV-32`, **không** phải vùng `140`–`297` mà `v1.1` trích — không bị sửa một dòng nào | Must | `EV-32`, `DEC-10` | Có dòng diff trong vùng đó → FAIL |
| `RQ-13` | Mọi cặp màu chữ trên nền mới đạt tương phản 4.5:1, mọi thành phần giao diện mới đạt 3:1; báo bằng số thực đo | Must | `DEC-07` | Thiếu số đo hoặc dưới ngưỡng → FAIL |
| `RQ-14` | Test tĩnh mới khóa từng bất biến của task: bóng token trên card, ba hiệu ứng hover, `appearance-none` trên `select` bộ lọc, tồn tại vòng focus cho mọi control, tồn tại guard giảm chuyển động, khối CSS chết không bị chạm, và **ba bất biến kế thừa** của `RQ-24`, `RQ-25`, `RQ-26` | Must | Toàn bộ decision, `DEC-18` | Không có test khóa → BLOCK |
| `RQ-15` | Gates bắt buộc exit 0: typecheck, lint, full unit, build, diff-check | Must | Pipeline | Gate đỏ → BLOCK |
| `RQ-16` | HANDOFF nộp bằng chứng trực quan thật cho từng trạng thái, kèm giá trị computed đọc từ trình duyệt. Lời văn mô tả không được tính là bằng chứng | Must | Iron Rule 4 | Evidence bằng lời văn → BLOCK |
| `RQ-17` | Mọi phần tử tương tác của bề mặt công khai có vùng chạm tối thiểu 44x44px và cách phần tử tương tác liền kề tối thiểu 8px. Ở baseline `c6256e7` còn **hai** đích thật phải nâng: nút Lưu việc `:240` (`w-9 h-9` = 36px) và nút Ứng tuyển `:227` (`px-6 py-2`). Đích thứ ba của `v1.1` — "nhãn checkbox từ 20px" — đã bị rút theo `DEC-18` vì phần tử đó không còn tồn tại | Must | `EV-34`, `DEC-15`, `DEC-18`, rule `touch-target-size` mức High | Còn một phần tử dưới 44px → FAIL |
| `RQ-18` | Tồn tại đúng một skip link tới nội dung chính, ẩn khi không có tiêu điểm và hiện rõ khi nhận tiêu điểm bàn phím; đích của nó là vùng nội dung chính của trang | Must | `EV-20`, rule `skip-links` | Không có skip link, hoặc skip link luôn ẩn cả khi có tiêu điểm → FAIL |
| `RQ-19` | Không mở chế độ tối trong task này: 0 khai báo `prefers-color-scheme` mới, 0 biến thể token tối | Must | `DEC-14` | Thêm chế độ tối nửa vời → FAIL |
| `RQ-20` | Container của trang và container của navbar cho ra cùng một mép trái ở mọi breakpoint đo được | Must | `EV-22`, rule `container-width` | Hai mép trái còn lệch → FAIL |
| `RQ-21` | Icon ligature mang tính trang trí được ẩn khỏi công nghệ trợ giúp; icon mang nghĩa phải có nhãn văn bản đi kèm | Must | `EV-23`, rule `aria-labels` | Trình đọc màn hình còn đọc tên ligature → FAIL |
| `RQ-22` | Ô từ khóa có nhãn nhìn thấy được cộng type ngữ nghĩa, và là phần tử nổi bật nhất của panel; panel bộ lọc luôn hiện trên desktop, không thu gọn mặc định | Must | `EV-17`, `EV-24`, rule `input-labels` mức High, rule `input-types`, anti-pattern "Hidden filters" | Placeholder còn làm nhãn, hoặc panel thu gọn mặc định trên desktop → FAIL |
| `RQ-23` | Trần chuyển động: mỗi khung nhìn có tối đa hai nhóm phần tử động; mọi transition mới chỉ liệt kê `transform`, `opacity`, `box-shadow`, `border-color`, `background-color`; thời lượng ra tối đa 70% thời lượng vào; không transition thuộc tính gây reflow | Must | `EV-21`, rule `excessive-motion` mức High, rule `transform-performance`, rule `exit-faster-than-enter` | Transition chạm chiều rộng/chiều cao/vị trí tuyệt đối, hoặc quá hai nhóm động → FAIL |
| `RQ-24` | Điều hướng card của GO-LIVE-12 được bảo toàn nguyên vẹn: `detailHref` vẫn được dựng từ `publicJobDetailPath(job.slug)` và vẫn có **đúng hai** phần tử dùng `href={detailHref}`. Task này chỉ được đổi trình bày của chúng, không đổi đích, không bọc thêm lớp chặn sự kiện | Must | `EV-33` | Số phần tử dùng `detailHref` khác `2`, hoặc đích đổi → P0 hồi quy GO-LIVE-12 |
| `RQ-25` | `ApplyModal` giữ nguyên dạng component đã tách ở `src/domains/job-board/components/apply-modal.tsx`: vẫn import ở `app/(portal)/page.tsx:7` và vẫn được render. **Không** inline ngược vào trang, **không** đổi props | Must | `EV-33` | Modal bị inline ngược hoặc đổi props → P0 hồi quy GO-LIVE-05 |
| `RQ-26` | Sự thật dữ liệu của GO-LIVE-05 được bảo toàn: `git diff` của `src/domains/job-board/public.service.ts` có **0** dòng, và trên trang landing số dòng diff chạm DTO, facet, phân trang hay nhãn đơn vị bằng `0`. Task này là task trình bày | Must | `EV-33`, `DEC-08` | Có dòng diff trong `public.service.ts`, hoặc chạm trục dữ liệu → P0 chồng scope |

### 4.1b Ánh xạ rule của skill sang requirement

Bảng này để Tier 3 kiểm rằng chuẩn được viện dẫn thật sự thành phép đo, không phải trích dẫn trang trí.

| Rule ID của skill | Mức | Requirement mang rule đó |
|---|---|---|
| `focus-states`, `keyboard-nav` | High | `RQ-07` |
| `color-contrast`, `contrast-readability` | High | `RQ-13` |
| `reduced-motion` | High | `RQ-10` |
| `excessive-motion`, `transform-performance`, `exit-faster-than-enter` | High/Medium | `RQ-23` |
| `duration-timing`, `easing` | Medium | `RQ-03` |
| `touch-target-size`, `touch-spacing` | High/Medium | `RQ-17` |
| `skip-links` | Medium | `RQ-18` |
| `input-labels`, `input-types` | High/Medium | `RQ-22` |
| `container-width` | High | `RQ-20` |
| `elevation-consistent`, `state-clarity`, `disabled-states` | High/Medium | `RQ-02`, `RQ-03`, `RQ-09` |
| `visual-hierarchy`, `whitespace-balance` | High/Medium | `RQ-04`, `RQ-05`, `RQ-06` |
| `cursor-pointer` | Medium | `RQ-17` |
| Anti-pattern "Hidden filters", "Outdated forms" | — | `RQ-22`, `RQ-08` |
| Pattern Marketplace/Directory | — | `RQ-22` |

### 4.2 Scope boundaries

**In scope:**

- `app/globals.css` — chỉ hai vùng: thêm token bên trong khối theme, và thêm lớp trình bày mới cho bề mặt công khai **sau dòng 297**, tức sau khối lớp thủ công đã chết. Bản thân khối đã chết bị cấm sửa; theo `EV-26` thì "cuối file" hiện nằm ngay sau khối đó nên phải nói rõ vị trí chèn thay vì nói "cuối file".
- `app/(portal)/page.tsx` — chỉ thuộc tính `className` và `style` của phần trình bày, cộng thuộc tính tiếp cận (`aria-hidden` cho icon trang trí, nhãn nhìn thấy cho ô từ khóa, thuộc tính type, id của vùng nội dung chính làm đích cho skip link).
- `app/components/GlobalNavbar.tsx` — hai nút xác thực, cộng skip link đặt làm phần tử nhận tiêu điểm đầu tiên, cộng đồng bộ container theo `RQ-20`.
- `src/domains/job-board/public-ui-premium.static.test.ts` — mới.
- `docs/tasks/hrp-v5-go-live-08-public-ui-premium/HANDOFF.md`.

**Out of scope:**

- Hàm làm giàu dữ liệu, fetch, state bộ lọc, bốn danh sách filter, nhãn đơn vị tuyển dụng.
- `src/domains/job-board/public.service.ts`, `app/api/jobs/route.ts`, mọi DTO và projection.
- Khối lớp thủ công đã chết trong `app/globals.css` và hai file mockup HTML.
- Mọi giá trị token đang có; `prisma/**`; RLS, policy, migration.
- Trang admin, apply flow, affiliate, middleware, cấu hình domain, `GlobalFooter`.
- Thêm dependency, thêm thư viện animation, đổi framework CSS.
- Chế độ tối và biến thể token tối (`DEC-14`); các bảng rule chỉ dành cho ứng dụng native của skill (`DEC-13`); palette, cặp font và style mà skill đề xuất (`DEC-12`).

### 4.3 Data, State, Permission và Interface Rules

- **Data:** task này không đọc, không ghi, không chuyển hóa dữ liệu. Nếu một RQ có vẻ cần dữ liệu mới thì đó là dấu hiệu lấn scope GO-LIVE-05, phải dừng.
- **State:** không thêm state React cho mục đích trình bày. Hover, focus và active phải là trạng thái CSS. Đây là hệ quả trực tiếp của `DEC-03`.
- **Permission:** không đổi điều kiện hiển thị theo vai trò; không thêm hay bớt phần tử theo quyền.
- **Interface:** không đổi props của thành phần card ngoài những gì cần cho trình bày; không đổi thứ tự DOM ngoài mức cần thiết, vì đổi thứ tự DOM là đổi thứ tự tiêu điểm bàn phím.
- **Accessibility:** vòng focus phải dùng `:focus-visible` để không hiện vòng khi bấm chuột; guard giảm chuyển động là bắt buộc; tương phản đo bằng số.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-15` | Repo | Khóa baseline SHA thật, chạy verify-task, chạy các phép đo RED trước khi sửa và lưu output | Git/pipeline | SHA cộng output RED | GO-LIVE-05 chưa đóng → dừng |
| `STEP-02` | `RQ-01`, `RQ-19` | `app/globals.css` khối theme | Thêm ba nhóm token, giữ nguyên mọi giá trị cũ, không thêm biến thể token tối | Tailwind v4 theme | Diff chỉ có dòng thêm | Phải đổi token cũ mới đạt hiệu ứng → dừng và báo |
| `STEP-03` | `RQ-02/03/04/05` | Card việc làm | Chuyển bóng sang token, thêm ba hiệu ứng hover, sửa padding và cấp chữ, phân hóa hai pill | React/CSS | Đo computed ở nghỉ và hover | Cần đổi markup dữ liệu → dừng |
| `STEP-04` | `RQ-06` | Panel bộ lọc | Đổi nền panel sang token xám rất nhạt, giữ viền | CSS | Hai giá trị nền khác nhau | Panel và card vẫn trùng → chưa đạt |
| `STEP-05` | `RQ-07`, `RQ-08`, `RQ-17`, `RQ-22` | Control bộ lọc | Thêm vòng focus cho ô tìm kiếm, hai select và mọi nút; custom checkbox bằng `appearance-none`; đưa nhãn checkbox và các nút lên vùng chạm 44px với khoảng cách 8px; thêm nhãn nhìn thấy cộng type ngữ nghĩa cho ô từ khóa | CSS/a11y | Điều hướng bàn phím cộng computed cộng đo vùng chạm | Phải thay input native bằng thẻ giả → dừng |
| `STEP-06` | `RQ-09`, `RQ-17` | Nút | Chuyển màu tương tác của ba nút từ inline style sang class token, thêm hover và active, đưa cả ba nút lên vùng chạm 44px | React/CSS | Computed ở ba trạng thái cộng chiều cao đo được | Còn buộc phải dùng inline style → báo lý do |
| `STEP-07` | `RQ-10/13` | `app/globals.css` | Thêm guard giảm chuyển động; đo tương phản mọi cặp màu mới | WCAG | Số đo tương phản | Cặp nào dưới ngưỡng → chọn token khác, không hạ ngưỡng |
| `STEP-08` | `RQ-11/12/14` | Test tĩnh | Viết test khóa từng bất biến, gồm cả bất biến khối CSS chết không bị chạm | Vitest | Focused PASS | Test chỉ grep chuỗi mà không khóa bất biến → bổ sung |
| `STEP-09` | `RQ-15` | Full repo | typecheck, lint, full unit, build, diff-check | Pipeline | Exit codes | Gate đỏ → BLOCK |
| `STEP-10` | `RQ-16` | HANDOFF | Ghi diff chính xác, ảnh từng trạng thái, giá trị computed, số tương phản, deviation và residual | Template | Tự kiểm trước khi bàn giao | Không đủ bằng chứng → không chuyển audit |
| `STEP-11` | `RQ-18`, `RQ-20`, `RQ-21`, `RQ-23` | Navbar cộng vùng nội dung chính | Thêm skip link làm phần tử nhận tiêu điểm đầu tiên và gắn đích của nó vào vùng nội dung chính; ẩn icon ligature trang trí khỏi công nghệ trợ giúp; đồng bộ container trang với container navbar; kiểm trần chuyển động và danh sách thuộc tính được transition | a11y/layout | Điều hướng bàn phím từ đầu trang, đo mép trái ở bốn breakpoint, đếm nhóm phần tử động | Phải đổi cấu trúc DOM ngoài mức tối thiểu → dừng và báo, vì đổi thứ tự DOM là đổi thứ tự tiêu điểm |
| `STEP-12` | `RQ-24`, `RQ-25`, `RQ-26` | `app/(portal)/page.tsx`, `src/domains/job-board/public.service.ts` | **Chốt baseline rồi bảo toàn ba bất biến kế thừa.** Trước khi sửa dòng đầu tiên, ghi vào HANDOFF bốn phép đo: (a) `git rev-parse HEAD` — ghi nguyên SHA, **không** đòi bằng `c6256e7`; kèm `git diff --name-only c6256e7..HEAD` để chứng minh mọi đường đều nằm dưới `docs/` theo `DEC-20`; (b) số phần tử dùng `href={detailHref}`; (c) dòng import `ApplyModal`; (d) `git diff --numstat -- src/domains/job-board/public.service.ts` (phải rỗng). Sau khi sửa xong: đo lại cả bốn, ghi cặp trước/sau | Không phụ thuộc STEP nào — chạy **đầu tiên** và **cuối cùng** | `git rev-parse`, `git diff --name-only`, `grep -c`, `git diff --numstat` | Có **bất kỳ** đường ngoài `docs/` trong khoảng `c6256e7..HEAD` → STOP, báo blocker: tức là có commit mã chen vào và số đo của contract đã hết hiệu lực. Số (b) (c) (d) trước khác sau → STOP, báo blocker, không tự sửa |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | Diff khối theme chỉ có dòng thêm; ba nhóm token mới tồn tại; mọi token cũ giữ nguyên giá trị | Static diff cộng grep | Diff khối theme cộng grep giá trị token cũ | Yes |
| `AC-02` | `RQ-02` | Card ở trạng thái nghỉ có bóng bằng token của design system, không phải bóng mặc định của framework | Computed style | Giá trị computed đọc từ trình duyệt | Yes |
| `AC-03` | `RQ-03` | Hover card thay đổi đồng thời vị trí dọc, bóng và màu viền; transition liệt kê đủ ba thuộc tính; thời lượng tối đa 250ms | Computed style ở hai trạng thái | Hai bộ computed cộng ảnh nghỉ và ảnh hover | Yes |
| `AC-04` | `RQ-04` | Padding card bằng 24px; cỡ tên việc làm lớn hơn giá trị baseline; màu tên đơn vị và địa điểm là token xám dịu | Computed style | Ba giá trị computed trước và sau | Yes |
| `AC-05` | `RQ-05` | Nền pill địa điểm khác nền pill ca làm; nền pill địa điểm là token cam rất nhạt; cả hai vẫn bo tròn hết cạnh và vẫn có icon | Computed style | Hai giá trị nền cộng ảnh | Yes |
| `AC-06` | `RQ-06` | Giá trị nền panel bộ lọc khác giá trị nền card, và bằng token xám rất nhạt | Computed style | Hai giá trị nền cạnh nhau | Yes |
| `AC-07` | `RQ-07` | Điều hướng bàn phím qua toàn bộ bề mặt công khai: **cả 9** control hiện vòng focus nhìn thấy được. Số control đếm được bằng số vòng focus quan sát được; `grep -c "outline-none"` trên `app/(portal)/page.tsx` trả `0` **sau** khi sửa (baseline cũng `0` — đây là phép đo **bảo toàn**, không phải "before = 0 sau = N"); khối `:focus-visible` toàn cục còn nguyên trong `app/globals.css` **và** trong bundle đã minify | Điều hướng bàn phím cộng grep cộng grep bundle | Bảng liệt kê 9 control kèm ảnh focus, output grep nguồn, output grep bundle | Yes |
| `AC-08` | `RQ-08` | `select` bộ lọc còn `appearance-none`, còn là element native, có chevron nhìn thấy được, và hover/focus cho hai giá trị computed khác nhau; bàn phím vẫn mở và chọn được option. **Không** đo checkbox: phép đếm `type="checkbox"` trên trang landing là `0` ở cả trước và sau (`EV-31`) | Computed cộng bàn phím cộng grep | Hai bộ computed, ảnh hai trạng thái, ghi chú bàn phím, và output `grep -c` bằng `0` | Yes |
| `AC-09` | `RQ-09` | Ba nút có hover và active đo được; không còn đặt màu tương tác bằng inline style trên ba nút đó | Computed cộng diff | Computed ba trạng thái mỗi nút cộng diff | Yes |
| `AC-10` | `RQ-10` | Bật giảm chuyển động thì không còn transform hay animation nào trên bề mặt công khai, nhưng đổi màu vẫn còn. Đồng thời: số khối `prefers-reduced-motion` trong `app/globals.css` vẫn đúng bằng `1`, nguyên văn khối ở `:346` không đổi, và chuỗi `prefers-reduced-motion` vẫn có mặt trong bundle đã minify | Computed dưới media query cộng `grep -c` cộng grep bundle | Computed ở hai chế độ, phép đếm bằng `1`, diff của khối bằng rỗng, output grep bundle | Yes |
| `AC-11` | `RQ-11` | Diff trang landing không có dòng nào ngoài thuộc tính trình bày; số dòng chạm hàm làm giàu dữ liệu, fetch, state bộ lọc, nhãn đơn vị và bốn danh sách filter đều bằng 0 | Diff review cộng grep | Diff đầy đủ cộng năm phép đếm | Yes |
| `AC-12` | `RQ-12` | Nguyên văn khối lớp thủ công đã chết của bản baseline — vùng `189`–`360` theo `EV-32` — xuất hiện **nguyên vẹn và liền mạch** trong file sau khi sửa; đồng thời `git diff` của `app/globals.css` có 0 dòng bị xóa hoặc bị đổi thuộc vùng đó. Phép đo là so nguyên văn cộng băm, **không** phải đếm dòng diff theo dải, vì thêm token vào khối theme sẽ đẩy số dòng của vùng này xuống (`EV-26`). Neo bằng bốn selector `.pub-header` `:189`, `.filter-panel` `:242`, `.job-card` `:280`, `.pub-foot` `:323` chứ không bằng số dòng tuyệt đối | Trích khối baseline, băm, so chuỗi con; cộng `git diff` | Băm trước và sau cộng output so chuỗi cộng diff | Yes |
| `AC-13` | `RQ-13` | Mọi cặp chữ trên nền mới đạt ít nhất 4.5:1; mọi thành phần giao diện mới đạt ít nhất 3:1 | Contrast measurement | Bảng cặp màu kèm tỉ số thực đo | Yes |
| `AC-14` | `RQ-14` | Test tĩnh mới PASS và mỗi bất biến của task có ít nhất một assertion tương ứng | Focused Vitest | Danh sách test cộng output PASS | Yes |
| `AC-15` | `RQ-15` | typecheck, lint, full unit, build, diff-check đều exit 0; không tăng số lỗi lint | Mandatory gates | Command cộng exit code cộng đuôi output | Yes |
| `AC-16` | `RQ-16` | HANDOFF có đủ bằng chứng trực quan và số cho mọi AC ở trên; không có ô nào chỉ ghi lời văn | Document review | Mục tương ứng trong HANDOFF | Yes |
| `AC-17` | `RQ-17` | Mọi phần tử tương tác của bề mặt công khai có chiều rộng và chiều cao đo được tối thiểu 44px, khoảng cách tới phần tử tương tác liền kề tối thiểu 8px. **Hai** giá trị baseline phải đổi: nút Lưu việc `:240` từ 36px, nút Ứng tuyển `:227` từ dưới ngưỡng. `select` `:287` (`py-2.5`) báo số đo **trước và sau** để chứng minh không bị hạ xuống dưới ngưỡng. Mọi phần tử bấm được có con trỏ dạng bàn tay | Đo hộp giới hạn từ trình duyệt cộng grep | Bảng liệt kê từng phần tử kèm hai số đo trước và sau | Yes |
| `AC-18` | `RQ-18` | Nhấn phím tab lần đầu từ đầu trang làm skip link hiện ra và nhìn thấy rõ; kích hoạt nó đưa tiêu điểm tới vùng nội dung chính; khi không có tiêu điểm thì skip link không chiếm chỗ trong bố cục | Điều hướng bàn phím | Ảnh trạng thái hiện cộng ghi chú vị trí tiêu điểm sau khi kích hoạt | Yes |
| `AC-19` | `RQ-19` | Số khai báo `prefers-color-scheme` mới bằng 0 và số biến thể token tối mới bằng 0 | Grep trên diff | Hai phép đếm | Yes |
| `AC-20` | `RQ-20` | Mép trái của nội dung trang và mép trái của nội dung navbar trùng nhau ở bốn breakpoint 375, 768, 1024 và 1440, sai lệch tối đa 1px | Đo toạ độ từ trình duyệt | Tám số đo cộng ảnh ở breakpoint rộng nhất | Yes |
| `AC-21` | `RQ-21` | Không còn icon ligature trang trí nào lộ ra với công nghệ trợ giúp; số icon trang trí có `aria-hidden` bằng đúng số icon trang trí đếm được ở baseline | Grep cộng kiểm cây tiếp cận | Hai phép đếm cộng ảnh cây tiếp cận của một card | Yes |
| `AC-22` | `RQ-22` | Ô từ khóa có nhãn nhìn thấy được và thuộc tính type ngữ nghĩa; panel bộ lọc hiện đầy đủ ở 1024 và 1440 mà không cần mở gì; ô từ khóa là control đầu tiên trong panel | Kiểm trực quan cộng diff | Ảnh panel ở hai breakpoint cộng diff của ô từ khóa | Yes |
| `AC-23` | `RQ-23` | Mỗi khung nhìn có tối đa hai nhóm phần tử động; mọi khai báo transition mới chỉ nêu các thuộc tính được phép; không một transition nào chạm chiều rộng, chiều cao, `top` hay `left`; thời lượng ra tối đa 70% thời lượng vào | Grep khai báo transition cộng computed | Danh sách toàn bộ khai báo transition mới cộng bảng thời lượng vào và ra | Yes |
| `AC-24` | `RQ-24` | Phép đếm `href={detailHref}` trên `app/(portal)/page.tsx` bằng **`2`** ở cả trước và sau; `publicJobDetailPath(job.slug)` vẫn là nguồn duy nhất dựng `detailHref`; bấm vào card vẫn tới `/viec-lam/{slug}` | `grep -c` cộng một lần bấm thật | Hai phép đếm cộng URL quan sát được sau khi bấm | Yes |
| `AC-25` | `RQ-25` | `ApplyModal` vẫn được import từ `src/domains/job-board/components/apply-modal.tsx` và vẫn render được: mở modal từ nút Ứng tuyển cho ra đúng modal đó. Số dòng diff của file modal bằng `0`, hoặc nếu khác `0` thì mọi dòng chỉ chạm thuộc tính trình bày | `grep -n` cộng `git diff --numstat` cộng một lần mở modal | Dòng import, numstat, ảnh modal đang mở | Yes |
| `AC-26` | `RQ-26` | `git diff --numstat -- src/domains/job-board/public.service.ts` trả **rỗng**; trên `app/(portal)/page.tsx` số dòng diff chạm DTO, facet, phân trang, nhãn đơn vị đều bằng `0` | `git diff --numstat` cộng bốn phép đếm trên diff | Output numstat rỗng cộng bốn phép đếm | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-02` | `AC-01` |
| `RQ-02` | `STEP-03` | `AC-02` |
| `RQ-03` | `STEP-03` | `AC-03` |
| `RQ-04` | `STEP-03` | `AC-04` |
| `RQ-05` | `STEP-03` | `AC-05` |
| `RQ-06` | `STEP-04` | `AC-06` |
| `RQ-07` | `STEP-05` | `AC-07` |
| `RQ-08` | `STEP-05` | `AC-08` |
| `RQ-09` | `STEP-06` | `AC-09` |
| `RQ-10` | `STEP-07` | `AC-10` |
| `RQ-11` | `STEP-03`, `STEP-08` | `AC-11` |
| `RQ-12` | `STEP-08` | `AC-12` |
| `RQ-13` | `STEP-07` | `AC-13` |
| `RQ-14` | `STEP-08` | `AC-14` |
| `RQ-15` | `STEP-01`, `STEP-09` | `AC-15` |
| `RQ-16` | `STEP-10` | `AC-16` |
| `RQ-17` | `STEP-05`, `STEP-06` | `AC-17` |
| `RQ-18` | `STEP-11` | `AC-18` |
| `RQ-19` | `STEP-02` | `AC-19` |
| `RQ-20` | `STEP-11` | `AC-20` |
| `RQ-21` | `STEP-11` | `AC-21` |
| `RQ-22` | `STEP-05`, `STEP-11` | `AC-22` |
| `RQ-23` | `STEP-03`, `STEP-07`, `STEP-11` | `AC-23` |
| `RQ-24` | `STEP-12` | `AC-24` |
| `RQ-25` | `STEP-12` | `AC-25` |
| `RQ-26` | `STEP-08`, `STEP-12` | `AC-26` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Sửa khối CSS đã chết rồi báo hoàn thành, gate vẫn xanh mà site không đổi một pixel | Tier 2 đọc `app/globals.css` từ trên xuống và gặp khối cũ trước | Ghi bẫy này thành `EV-12`, cấm bằng `RQ-12`, khóa bằng test tĩnh và đo bằng `AC-12` | Revert diff trong dải dòng đó |
| `RISK-02` | Lấn scope GO-LIVE-05 khi sửa vùng bộ lọc | Cùng file, cùng phần tử | `RQ-11` và `AC-11` đếm 0 dòng cho năm vùng dữ liệu | Revert riêng các dòng chạm dữ liệu |
| `RISK-03` | Thêm chuyển động gây khó chịu hoặc gây triệu chứng cho người nhạy cảm chuyển động | Transform không có guard | `RQ-10` bắt buộc guard, `AC-10` đo ở hai chế độ | Bỏ transform, giữ đổi màu |
| `RISK-04` | Tăng độ tương phản theo cảm tính rồi phá palette ấm đã chốt | Dùng xám lạnh hoặc màu ngoài token | `DEC-01` cấm màu ngoài token, `AC-13` đo bằng số | Trả về token cũ |
| `RISK-05` | Hover trên thiết bị cảm ứng bị kẹt trạng thái | Chỉ dùng hover không kèm điều kiện thiết bị | Yêu cầu hover đi kèm điều kiện con trỏ thật khi cần; kiểm trên một lần đo cảm ứng | Bỏ transform hover trên cảm ứng |
| `RISK-06` | Vòng focus bị tắt trở lại bởi một reset CSS khác | Có khai báo tắt outline ở nơi khác | `AC-07` grep toàn bộ khai báo tắt outline | Thêm lại vòng focus tại chỗ bị tắt |
| `RISK-07` | Bóng hai lớp trên nhiều card làm giảm hiệu năng cuộn | Danh sách dài, bóng lớn | Giữ bóng ở hai bậc, không dùng blur quá lớn; đo cuộn một lần | Hạ bậc bóng hover |
| `RISK-08` | Tier 3 audit bằng lời văn như các round trước của lane này | Thói quen của lane | `RQ-16` và mọi AC đều yêu cầu ảnh hoặc số; `AC-16` chặn HANDOFF thiếu bằng chứng | Trả round, không nhận verdict |
| `RISK-09` | Viện dẫn tên rule của skill làm trang trí rồi không đo gì | HANDOFF chép tên rule vào văn bản mà không có số | Bảng ánh xạ §4.1b buộc mỗi rule được viện dẫn phải trỏ tới một requirement có AC đo được; Tier 3 kiểm theo bảng đó | Trả round với directive nêu đúng rule chưa được đo |
| `RISK-10` | Tier 2 tự chạy skill, nhận nguyên đề xuất palette xanh lạnh cộng cặp font cộng style rồi phá G27 | Chính output `--design-system` của skill đề xuất như vậy (`EV-18`) | `DEC-12` từ chối đích danh ba nhóm đó; `AC-13` đo tương phản trên token; thêm phép đếm mã màu viết trực tiếp ngoài token phải bằng 0 | Revert về token G27; không đàm phán lại ADR trong task trình bày |
| `RISK-11` | Áp phần rule chỉ dành cho ứng dụng native của skill vào web: ngưỡng 48dp, ripple, safe area, haptic | Skill có bảng rule native rất chi tiết và dễ bị đọc là bắt buộc | `DEC-13` loại trừ theo đúng ghi chú phạm vi của chính skill; ngưỡng chạm chốt ở 44x44px | Bỏ phần native, giữ 44px |
| `RISK-12` | Kể lại những thứ **đã đạt sẵn** ở baseline như thành tựu của round này: nhãn cho nút lưu việc, phản hồi khi bấm Tìm kiếm, skeleton khi tải | `EV-25` cho thấy ba nhóm đó đã có tại HEAD | `EV-25` ghi rõ đã đạt; Tier 3 đối chiếu HANDOFF với `EV-25`, phần nào trùng thì không tính là công việc mới | Yêu cầu HANDOFF sửa lại phần kể công |
| `RISK-13` | Tier 2 đo theo các con số của `v1.1` thay vì `v1.2`, rồi kết luận "before = 0" cho vòng focus và guard giảm chuyển động — hai thứ **đã tồn tại** — nên báo PASS cho công việc chưa làm | Đọc contract ở bản cũ, hoặc chép số từ HANDOFF của task khác | `DEC-16` buộc mọi số "before" phải đọc lại tại `c6256e7`; `STEP-12` buộc ghi `git rev-parse HEAD` vào HANDOFF **trước** khi sửa; `AC-07` và `AC-10` đổi sang phép đo **bảo toàn** nên "before = 0" không còn là đường PASS | Không có rollback — phát hiện ở audit thì mở execution round mới; Tier 1 tự đo lại bốn phép đếm của `STEP-12` trước khi resolve |

## 8. Open Questions

Không còn câu hỏi chặn execution. Ba điểm đã được quyết trong `DEC-01`, `DEC-07` và `DEC-08`: dùng token ấm thay cho màu lạnh được nêu trong yêu cầu, lấy skill `ui-ux-pro-max` làm chuẩn acceptance với đúng phần rule áp được cho web (`DEC-12` và `DEC-13` ghi rõ phần nào bị từ chối và lý do), và xếp task này sau GO-LIVE-05.

Một điểm chờ Owner nhưng **không** chặn: nếu Owner muốn nhìn thấy thay đổi trực quan trước khi GO-LIVE-05 xong, có thể tách phần không chồng lấn của task này thành một round riêng, gồm token, navbar, nút, card, chữ và khoảng trắng; phần bộ lọc vẫn phải đợi. Quyết định đó thuộc Owner vì nó đánh đổi giữa tốc độ thấy kết quả và số lần chỉnh cùng một chỗ.

## 9. Planner Resolution

Tier 1 append quyết định sau audit; không sửa lịch sử finding.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-08-31` | Contract ban đầu cho trục trình bày của bề mặt công khai: token elevation/focus/motion additive, card hover ba hiệu ứng, phân hóa pill, tách panel bộ lọc, vòng focus cho mọi control, checkbox custom, hover và active cho ba nút, guard giảm chuyển động, cùng ràng buộc không lấn trục dữ liệu của GO-LIVE-05 | Owner yêu cầu nâng cấp UI/UX ngày 31/08; Tier 1 khảo sát read-only tại `d4928af` |
| `v1.1` | `2026-08-31` | Viết lại theo skill `ui-ux-pro-max` sau khi Owner chỉ đúng đường dẫn skill mức người dùng: `EV-15` sửa kết luận sai của v1.0; thêm `EV-17`..`EV-27`; `DEC-07` đổi từ chuẩn thay thế sang chính skill làm ngôn ngữ acceptance với thứ tự ưu tiên CRITICAL trước thẩm mỹ; thêm `DEC-12`..`DEC-15` ghi phần skill bị từ chối và lý do; thêm `RQ-17`..`RQ-23`, `STEP-11`, `AC-17`..`AC-23`, bảng ánh xạ §4.1b và `RISK-09`..`RISK-12`. Đồng thời sửa hai lỗi tự thân của v1.0: điểm chèn CSS chốt lại thành sau dòng 297 vì khối đã chết chạy tới cuối file, và `AC-12` đổi từ đếm dòng diff sang so byte cùng băm vì thêm token trong khối theme làm dịch số dòng | Owner 31/08 chỉ đường dẫn skill; Tier 1 đo lại toàn bộ baseline tại `d4928af` và phát hiện ba giả định của v1.0 đã đạt sẵn cùng bốn defect mới đo được |
| `v1.2` | `2026-09-01` | **Relock baseline `d4928af` → `c6256e7` và rút những AC đo một trạng thái không còn tồn tại.** Rewrite: 5 ô Control (`Spec version`, `Status`, `Baseline`, `Current execution round`, `Updated`), `EV-27`, `RQ-07`/`08`/`10`/`12`/`14`/`17`, `AC-07`/`08`/`10`/`12`/`17`. Thêm: `EV-28`..`EV-34`, `DEC-16`..`DEC-19`, `RQ-24`..`RQ-26`, `STEP-12`, `AC-24`..`AC-26`, `RISK-13`, ba dòng traceability. **Không** xoá mã ID nào và **không** tạo mã phái sinh bằng hậu tố chữ | Ba nguyên nhân, tất cả do Tier 1 tự đo tại `c6256e7`: (1) `474f3dc` đã thêm `:focus-visible` và `prefers-reduced-motion` toàn cục ⇒ mọi AC dạng "before = 0" của 08 đã chết; (2) GO-LIVE-05 rút bộ lọc ngành nghề ⇒ `type="checkbox"` = `0` nên `AC-08` đòi việc trên phần tử không tồn tại — bẫy "AC bất khả đo"; (3) `page.tsx` co 901 → 659 dòng và khối CSS chết dịch từ `140`–`297` sang `189`–`360` ⇒ mọi trích dẫn dòng của `v1.1` đều lạc. Bằng chứng round trước: **không có** — `v1.1` chưa từng được thực thi, `Current execution round` vẫn là `1` |
| `v1.3` | `2026-09-02` | **Tách baseline mã khỏi HEAD.** Rewrite 4 ô: `Spec version`, `Baseline`, `Updated`, `STEP-12`. Thêm `DEC-20`. Không thêm hay xoá `RQ`, `AC`, `EV`, `RISK`, traceability nào; **không** tạo mã phái sinh | Lỗi tự thân của `v1.2`, Tier 1 tự phát hiện khi chuẩn bị giao: hai commit docs-only mà chính Tier 1 push (`ed9c8f7` contract, `e7c1037` cursor) đẩy HEAD khỏi `c6256e7`, làm điều kiện dừng của `STEP-12` bắn ngay lệnh đầu tiên cho một thay đổi 0 dòng mã. Bằng chứng round trước: **không có** — `v1.2` chưa từng được thực thi, `Current execution round` vẫn là `1`, `Current audit round` vẫn là `0` |






