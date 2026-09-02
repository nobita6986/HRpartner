# TASK: hrp-v5-go-live-15-public-contrast-aa

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-15-public-contrast-aa` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — independent auditor |
| Baseline | `397b026` |
| Modules | `app/globals.css`, `app/components/GlobalNavbar.tsx`, `app/(jobs)/track/page.tsx`, `app/(jobs)/viec-lam/[slug]/page.tsx`, `app/(portal)/ve-chung-toi/page.tsx`, `src/domains/job-board/components/apply-modal.tsx`, `src/domains/job-board/components/success-modal.tsx`, `src/domains/job-board/public-ui-premium.static.test.ts` |
| ADR references | `hrp-v5-go-live-08-public-ui-premium` `RQ-09`/`RQ-13` — bảng cặp màu của 08 và lý do nó bỏ sót cặp nền nút; `docs/PLANNER_HANDOVER.md` §0 `next_command` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | Giao `/code hrp-v5-go-live-15-public-contrast-aa`. Không có cửa chặn nào phía trước. Task này phải land TRƯỚC drill của `hrp-v5-go-live-07-marketplace-launch-proof`, vì 07 chứng nhận đúng những bề mặt mà task này sửa |
| Updated | `2026-09-02 22:45 Asia/Bangkok` |

Task này sửa một lỗi tiếp cận đang in cho khách vô danh trên production: chữ trên nút chính và một số nhãn màu cam không đạt ngưỡng tương phản WCAG AA. Nó không thêm tính năng, không thêm token màu, không đổi bất kỳ khoá DTO hay đường dữ liệu nào.

Lỗi này không phải sơ suất của một người viết một nút. `hrp-v5-go-live-08-public-ui-premium` đã dựng đúng hệ token, đúng lớp `.hrp-btn-primary`, và đúng một bộ test đo tương phản tự động — nhưng bảng đo của 08 chỉ liệt kê những cặp màu mà CHÍNH 08 sinh ra. Cặp nền nút chính có từ trước 08, nên nó không có dòng nào trong bảng, nên nó chưa từng được đo. Bộ test của 08 xanh 100% suốt trong khi nút chính ở trạng thái nghỉ đạt `3.153:1` trên ngưỡng `4.5:1`. Vì vậy `RQ-11` của task này buộc thêm chính cặp đó vào bảng, để cùng một lỗ không mở lại được.

## 1. Outcome

### User-visible outcome

Khách vô danh đọc được mọi nhãn và mọi nút trên bề mặt công khai ở mức WCAG 2.1 AA.

Cụ thể sau task này:

1. Nút chính trên bề mặt công khai có chữ trắng trên nền `#a63b00` đạt `6.468:1`, thay cho nền `#f26522` chỉ đạt `3.153:1`. Áp cho cả nút dùng lớp dùng chung và nút đang tự đặt màu inline.
2. Không còn chữ màu `#f26522` trên nền sáng ở bất kỳ đâu trên bề mặt công khai và trên thanh điều hướng toàn cục. Mọi chỗ đó chuyển sang `#a63b00`, thấp nhất đạt `5.578:1`.
3. Vòng focus của trang tra cứu dùng đúng token `--color-focus-ring` của hệ thống thay cho một màu inline yếu hơn ngưỡng thành phần `3:1`.
4. Ba icon trang trí trong thanh điều hướng được ẩn khỏi trình đọc màn hình.
5. Thanh điều hướng đánh dấu trang đang mở bằng `aria-current` cộng một tín hiệu KHÔNG phải màu, nên trình đọc màn hình và người không phân biệt được màu đều nhận ra vị trí hiện tại.
6. Bảng đo tương phản tự động của go-live-08 được bổ sung đúng cặp màu đã bị bỏ sót, nên nếu ai đó trả nền nút về `#f26522` thì test ĐỎ ngay chứ không im lặng.
7. Token `--color-primary` vẫn tồn tại, vẫn giữ nguyên giá trị `#f26522`, và vẫn được dùng làm mảng màu trang trí. Không một pixel nào ngoài phạm vi đổi màu.

### Non-goals

- Không sửa 8 trang admin, `app/ctv`, `app/vendor`, `app/worker`. Số đo cho biết còn khoảng 41 chỗ chữ trượt ngưỡng ở đó; đó là một contract riêng, xếp sau task này. Owner đã chọn phạm vi hẹp để task này land trước drill 07.
- Không đổi GIÁ TRỊ của bất kỳ token nào trong `@theme`. Xem `DEC-03` và `RISK-02` — sửa token là cách rẻ nhất và cũng là cách sai duy nhất, vì nó đổi cả 41 chỗ ngoài phạm vi trong im lặng.
- Không thêm token màu mới. `#a63b00` đã tồn tại sẵn ở `app/globals.css:11`.
- Không sửa 12 chỗ dùng `outline-none`. Mỗi chỗ cần một quyết định vòng focus riêng; gộp vào đây biến một task 8 file thành một đợt quét.
- Không đổi kích thước chữ, không đổi khoảng cách, không đổi bố cục, không thêm chuyển động.
- Không sửa `app/(portal)/page.tsx:1017`. Xem `EV-18`: phần tử đó là icon trang trí đã có `aria-hidden`, WCAG miễn trừ nội dung trang trí, nên "sửa" nó là làm việc không có người thụ hưởng.
- Không commit, không push, không deploy.

## 2. Evidence và Baseline

Mọi tỉ số trong bảng này do Tier 1 tự tính bằng công thức tương phản WCAG trên giá trị hex đã giải `var()`, không phải số nhớ lại. Ngưỡng áp dụng: chữ thường `4.5:1`; chữ lớn `3:1` với chữ lớn nghĩa là từ `24px` trở lên, hoặc từ `18.66px` trở lên nếu đậm; thành phần giao diện và chỉ báo trạng thái `3:1`.

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `app/globals.css:308-310` | `.hrp-btn-primary` ở trạng thái NGHỈ đặt nền `var(--color-primary)` `#f26522` và chữ `var(--color-on-primary)` `#ffffff` — đo được `3.153:1`, dưới ngưỡng `4.5:1` | Lỗi nằm ở lớp dùng chung, nên MỘT lần sửa phủ mọi chỗ dùng lớp |
| `EV-02` | `app/globals.css:316-321` và `:324-328` | Cả `:hover:not(:disabled)` và `:active:not(:disabled)` đã đổi nền sang `var(--color-primary-dark)` `#a63b00` = `6.468:1` | Nút ĐẠT khi hover và khi nhấn, TRƯỢT đúng ở trạng thái nghỉ. Màu đúng đã có sẵn trong chính lớp đó |
| `EV-03` | `app/(portal)/page.tsx:327`, `:469`, `:822`, `:928`, `:981`; `app/components/GlobalNavbar.tsx:206`, `:297` | Đúng 7 chỗ dùng `.hrp-btn-primary` trong `app` và `src` | 7 chỗ được sửa bởi `EV-01` mà không chạm file `.tsx` nào |
| `EV-04` | `app/(jobs)/track/page.tsx:95`; `src/domains/job-board/components/apply-modal.tsx:184`; `src/domains/job-board/components/success-modal.tsx:88` và `:138`; `app/components/GlobalNavbar.tsx:31` | 5 nút công khai KHÔNG dùng lớp dùng chung mà tự đặt cùng cặp màu bằng `style` inline, cùng đo `3.153:1` | Sửa lớp là không đủ. Phải xử lý cả 5 chỗ inline này |
| `EV-05` | `app/components/GlobalNavbar.tsx:26-36` | `Avatar` là chữ `14px` đậm trắng trên `#f26522`. `14px` đậm KHÔNG đạt định nghĩa chữ lớn nên ngưỡng áp là `4.5:1`, không phải `3:1` | Không được viện chữ lớn để bỏ qua chỗ này |
| `EV-06` | `app/components/GlobalNavbar.tsx:161` và `:264` | Pill vai trò: chữ `12px` màu `var(--color-primary)` trên nền `var(--color-primary-soft)` `#fdf1ec` = `2.848:1`. Hai chỗ là bản desktop và bản mobile của cùng một pill | Phải sửa cả hai, sửa một là để lại lỗi trên nửa số thiết bị |
| `EV-07` | `app/components/GlobalNavbar.tsx:112` | Hover của nav link đặt `color` sang `var(--color-primary)` bằng handler JS. Trên nền header sáng đo được `3.153:1` | Trạng thái hover của điều hướng là chữ thật, ngưỡng `4.5:1` |
| `EV-08` | `app/(jobs)/viec-lam/[slug]/page.tsx:102-108` | Link "Quay lại danh sách việc làm", chữ `14px` medium, màu `var(--color-primary)` | Link công khai trên trang chi tiết — đúng trang mà drill 07 mở |
| `EV-09` | `src/domains/job-board/components/success-modal.tsx:104-108` và `:112-118` | Link tra cứu `14px` và chữ nút "Sao chép link" `12px`, cả hai màu `var(--color-primary)`. Riêng VIỀN của nút đó cùng màu, đo `3.153:1`, đạt ngưỡng thành phần `3:1` | Chỉ chữ trượt. Không được ghi viền thành lỗi |
| `EV-10` | `app/(portal)/ve-chung-toi/page.tsx:57-66`, nền lấy từ `:42` | Phần tử `em` trong `h1` cỡ `text-4xl md:text-5xl` extrabold, tức `36px`/`48px`, màu `var(--color-primary)` trên nền `var(--color-background)` `#faf9f7`. Đây là CHỮ LỚN nên ngưỡng là `3:1`, và đo được `2.997:1` | Trượt đúng `0.003`. Vẫn là lỗi, nhưng phải ghi bằng ngưỡng `3:1`, không được ghi bằng `4.5:1` |
| `EV-11` | `app/(jobs)/track/page.tsx:88` và `:95` | Cả ô nhập và nút đặt `outlineColor` inline bằng `var(--color-primary)`, đo `2.997:1` trên nền body, dưới ngưỡng thành phần `3:1`. Trong khi hệ thống đã có `--color-focus-ring: var(--color-primary-dark)` ở `app/globals.css:115` và lớp `.hrp-focus` ở `:302-305` | Trang này tự dựng vòng focus và ghi đè đúng token mà 08 tạo ra để tránh lỗi này |
| `EV-12` | Tự tính từ `app/globals.css:11` | `#a63b00` làm CHỮ đạt `6.468:1` trên `#ffffff`, `6.147:1` trên `#faf9f7`, `5.832:1` trên `#f4f3f1`, `5.578:1` trên `#efeeec`, `5.842:1` trên `#fdf1ec`. Làm NỀN với chữ trắng đạt `6.468:1` | Một màu duy nhất đủ cho MỌI chỗ trong phạm vi, ở cả hai vai chữ và nền |
| `EV-13` | `app/globals.css`, khối `@theme` | `--color-primary-container: #a63b00` và `--color-on-primary-container: #ffffff` đã tồn tại | Cặp nền-chữ của bản sửa đã là một role màu chuẩn của hệ thống, không phải màu tự nghĩ |
| `EV-14` | `src/domains/job-board/public-ui-premium.static.test.ts:425-437` | Bảng `TEXT_PAIRS` có dòng `.hrp-btn-primary:hover` nhưng KHÔNG có dòng nào cho trạng thái NGHỈ của cùng nút đó | Đây là nguyên nhân gốc: bộ test đo tương phản của 08 xanh trong khi nút thật trượt |
| `EV-15` | `src/domains/job-board/public-ui-premium.static.test.ts:455` | Bảng `UI_PAIRS` có dòng ghim nền `.hrp-btn-primary` là `--color-primary`. Bảng này liệt kê TÊN TOKEN chứ không đọc CSS, nên sau khi sửa CSS nó vẫn XANH trong khi mô tả một trạng thái không còn tồn tại | Khẳng định sẽ thành CŨ mà không ĐỎ. Phải sửa cùng commit, nếu không bảng đo nói dối về chính hệ thống |
| `EV-16` | `src/domains/job-board/public-ui-premium.static.test.ts:604-612` | `expect(movers).toEqual` ghim đúng hai selector được mang `transform` | Hàng rào thật và còn giá trị. Phải giữ NGUYÊN và giữ XANH |
| `EV-17` | `src/domains/job-board/public-ui-premium.static.test.ts:302-308` | Ba phép đếm trên nguồn navbar: `onMouseEnter` bằng `3`, `currentTarget.style.backgroundColor` bằng `4`, `transition-colors` bằng `4`. Chú thích trong test nói rõ bốn cái còn lại nằm trên nav link và menu người dùng, 08 cố ý không chạm | Đổi GIÁ TRỊ màu trong handler giữ các phép đếm nguyên vẹn; đổi CƠ CHẾ sẽ làm ba phép đếm này đỏ |
| `EV-18` | `app/(portal)/page.tsx:1016-1018` | Công cụ đo báo `var(--color-outline)` `#8d7166` đạt `4.041:1`, nhưng phần tử đó là `span` icon `work_off` đã có `aria-hidden` và là trang trí thuần | KHÔNG phải lỗi. WCAG miễn trừ nội dung trang trí. Ghi vào đây để một bản audit về sau không dựng lại nó thành khoảng trống |
| `EV-19` | `grep -rn "aria-current" app src` cho `0` dòng; `app/components/GlobalNavbar.tsx` không import `usePathname` | Không một phần tử điều hướng nào trong repo đánh dấu trang đang mở, và navbar cũng không có trạng thái active nào kể cả bằng màu | Đây là thêm MỚI một trạng thái, không phải sửa một trạng thái sai. Xem `DEC-06` |
| `EV-20` | `app/components/GlobalNavbar.tsx:143`, `:179`, `:189` | Ba icon `material-symbols-outlined`, `0` trong `3` có `aria-hidden` | Trình đọc màn hình đọc ra tên ligature như chữ rác cạnh nhãn thật |
| `EV-21` | `scratch/ui-contrast-scan.py`, output `scratch/ui-contrast-out.txt` | Công cụ Tier 1 dùng để quét: `88` cặp tự chứa, `21` cặp dưới `4.5:1`, cộng khoảng `41` chỗ chỉ-có-màu-chữ trượt ngưỡng. Công cụ này KHÔNG đọc cỡ chữ và KHÔNG đọc `aria-hidden`, nên nó BÁO THỪA ở chữ lớn và ở phần tử trang trí | Số của công cụ là điểm khởi đầu, không phải kết luận. `EV-10` và `EV-18` là hai chỗ Tier 1 đã tự bác lại công cụ |

## 3. Decisions và Assumptions

| ID | Decision | Rationale |
|---|---|---|
| `DEC-01` | Nút chính đổi NỀN sang `var(--color-primary-dark)` `#a63b00` và GIỮ chữ trắng. Owner quyết ngày `2026-09-02` sau khi Tier 1 trình ba phương án kèm số đo | Đạt `6.468:1`, không thêm token, và đúng bằng màu mà `:hover` của chính lớp đó đã dùng nên không có hồi quy nào ở trạng thái hover. Phương án giữ nền cam sáng và đổi chữ sang gần-đen đạt `5.431:1` nhưng buộc thêm một token cam-sáng-hơn cho hover, vì gần-đen trên `#a63b00` chỉ đạt `2.649:1` |
| `DEC-02` | Sau `DEC-01`, nền nghỉ và nền hover trùng nhau, nên hover PHẢI phân biệt bằng thứ khác. Cách được phép: lớp trạng thái trắng mờ từ `8%` đến `12%` phủ lên nền. Tier 2 phải ĐO hex kết quả và ghi số tương phản với chữ trắng vào HANDOFF | Tier 1 đã tính trước: phủ trắng `8%` cho `#ad4b14` đạt `5.536:1`, `10%` cho `#af4f1a` đạt `5.308:1`, `12%` cho `#b1531f` đạt `5.089:1` — cả ba đều trên `4.5:1`, nên khoảng này an toàn. Nút vẫn còn `transform: scale(1.02)` và bóng ở hover nên vẫn có hai tín hiệu khác ngoài màu |
| `DEC-03` | CẤM đổi GIÁ TRỊ của `--color-primary` hoặc bất kỳ token nào khác trong `@theme`. Bản sửa phải nằm ở ĐIỂM DÙNG | Đổi token là một dòng và trông như cách sạch nhất, nhưng nó đổi luôn khoảng `41` chỗ ngoài phạm vi trên 8 trang admin cộng `ctv`, `vendor`, `worker` — không ai đo, không ai xem, không ai chịu trách nhiệm. Bán kính nổ của một dòng đó lớn hơn toàn bộ task này |
| `DEC-04` | Mọi chỗ dùng `--color-primary` làm MÀU CHỮ trong phạm vi đổi sang `--color-primary-dark` | Một màu phủ hết: thấp nhất `5.578:1` trên nền đậm nhất trong bốn nền của bề mặt, cao nhất `6.468:1` trên nền trắng. Xem `EV-12` |
| `DEC-05` | Vòng focus của `app/(jobs)/track/page.tsx` chuyển sang lớp `.hrp-focus`, hoặc giữ cách hiện tại nhưng đổi màu sang `var(--color-focus-ring)`. Bỏ hai khai báo `outlineColor` inline | `--color-focus-ring` đã bằng `var(--color-primary-dark)` từ go-live-08, chính là để không ai phải chọn màu vòng focus lần nữa. Hai dòng inline hiện tại đang ghi đè đúng cái token đó bằng một màu yếu hơn ngưỡng |
| `DEC-06` | `aria-current` là thêm MỚI, không phải sửa cái sai — vì hiện không có trạng thái active nào kể cả bằng màu. Trạng thái active phải có ít nhất một tín hiệu KHÔNG phải màu | Nếu chỉ tô màu link đang mở thì vi phạm nguyên tắc không truyền thông tin bằng riêng màu. Một tín hiệu chữ đậm hơn hoặc một gạch chân là đủ, và `aria-current="page"` lo phần trình đọc màn hình |
| `DEC-07` | `Avatar` ở `app/components/GlobalNavbar.tsx:26-36` chỉ được ĐỔI MÀU NỀN, KHÔNG được gán lớp `.hrp-btn-primary` | Avatar không phải nút. Ngoài ra `src/domains/job-board/public-ui-premium.static.test.ts:617-627` bắt buộc MỌI chỗ mang chuỗi `hrp-btn-primary` trong hai file `app/(portal)/page.tsx` và `app/components/GlobalNavbar.tsx` phải mang kèm `nav-item-lift`. Gán lớp cho Avatar sẽ làm test đó ĐỎ, hoặc tệ hơn là kéo một chuyển động vào một phần tử không tương tác |
| `DEC-08` | KHÔNG được đổi cỡ chữ hay độ đậm để hạ ngưỡng | Phương án phóng nhãn lên `18.66px` đậm để hưởng ngưỡng `3:1` đã bị Owner loại: biên an toàn chỉ còn `0.153` nên một lần chỉnh màu nhỏ là trượt lại, và nút `text-xs` như "Sao chép mã" không phóng được mà không phá bố cục |
| `DEC-09` | Với 4 nút inline ngoài `Avatar`, Tier 2 được TỰ CHỌN giữa hai đường: chuyển sang lớp `.hrp-btn-primary`, hoặc đổi màu tại chỗ. Cả hai đều hợp lệ nếu số đo đạt | Bốn nút đó nằm trong `app/(jobs)/track/page.tsx` và hai file `src/domains/job-board/components/*`, ngoài tầm phép đếm `nav-item-lift` của `EV-17` nên không có rào cơ học. Chuyển sang lớp là đường sạch hơn về lâu dài vì được hover, active và con trỏ miễn phí, nhưng nó đổi nhiều dòng hơn — đó là đánh đổi của Tier 2, không phải của Tier 1 |

## 4. Contract

### 4.1 Requirements

| ID | Requirement | Priority | Links | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | `.hrp-btn-primary` ở trạng thái nghỉ dùng nền `var(--color-primary-dark)` và giữ chữ `var(--color-on-primary)` | Must | `EV-01`, `EV-02`, `DEC-01` | Còn `background-color: var(--color-primary);` trong khối `.hrp-btn-primary {` → `AC-01` FAIL |
| `RQ-02` | Trạng thái hover của nút chính vẫn phân biệt được với trạng thái nghỉ, KHÔNG thêm token mới và KHÔNG thêm khối CSS mới nào mang `transform`. Nếu dùng lớp trạng thái trắng mờ thì phải nằm trong khoảng `8%` đến `12%` | Must | `DEC-02`, `EV-16` | Hover không còn dấu hiệu nào khác trạng thái nghỉ → `AC-02` FAIL. Thêm token mới → BLOCK |
| `RQ-03` | Bốn nút inline `app/(jobs)/track/page.tsx:95`, `src/domains/job-board/components/apply-modal.tsx:184`, `src/domains/job-board/components/success-modal.tsx:88` và `:138`, cộng `Avatar` ở `app/components/GlobalNavbar.tsx:26-36`, đều đạt tối thiểu `4.5:1` giữa chữ và nền | Must | `EV-04`, `EV-05`, `DEC-07`, `DEC-09` | Bất kỳ chỗ nào còn dưới `4.5:1` → `AC-03` FAIL |
| `RQ-04` | Pill vai trò ở `app/components/GlobalNavbar.tsx:161` VÀ `:264` đạt tối thiểu `4.5:1`. Phải sửa cả hai | Must | `EV-06`, `DEC-04` | Sửa một trong hai → `AC-04` FAIL, vì bản mobile là bản đa số người dùng thấy |
| `RQ-05` | Màu chữ khi hover nav link ở `app/components/GlobalNavbar.tsx:112` đạt tối thiểu `4.5:1` trên nền header | Must | `EV-07`, `EV-17` | Dưới `4.5:1` → `AC-05` FAIL |
| `RQ-06` | Bốn chỗ dùng `--color-primary` làm màu chữ đạt ngưỡng ĐÚNG theo cỡ chữ của chúng: `app/(jobs)/viec-lam/[slug]/page.tsx:107` và `src/domains/job-board/components/success-modal.tsx:107` và `:115` theo ngưỡng `4.5:1`; `app/(portal)/ve-chung-toi/page.tsx:62` theo ngưỡng `3:1` vì là chữ lớn | Must | `EV-08`, `EV-09`, `EV-10`, `DEC-04` | Chỗ nào dưới ngưỡng của chính nó → `AC-06` FAIL. Ghi `ve-chung-toi` bằng ngưỡng `4.5:1` là ghi sai ngưỡng, HANDOFF bị trả |
| `RQ-07` | Hai khai báo `outlineColor` inline ở `app/(jobs)/track/page.tsx:88` và `:95` không còn dùng `var(--color-primary)`. Vòng focus của hai control đó đạt tối thiểu `3:1` trên nền của chúng | Must | `EV-11`, `DEC-05` | Còn `outlineColor` trỏ `--color-primary` → `AC-07` FAIL |
| `RQ-08` | Ba icon `material-symbols-outlined` ở `app/components/GlobalNavbar.tsx:143`, `:179`, `:189` có `aria-hidden="true"` | Must | `EV-20` | Còn icon nào thiếu → `AC-08` FAIL |
| `RQ-09` | Thanh điều hướng đánh dấu trang đang mở bằng `aria-current="page"` trên đúng một link, ở CẢ bản desktop và bản mobile, kèm ít nhất một tín hiệu thị giác KHÔNG phải màu | Must | `EV-19`, `DEC-06` | Không có `aria-current` → `AC-09` FAIL. Chỉ đổi màu mà không có tín hiệu khác → `AC-09` FAIL |
| `RQ-10` | KHÔNG đổi giá trị của bất kỳ token nào trong khối `@theme` của `app/globals.css`, và KHÔNG thêm token màu mới ở bất kỳ đâu | Must | `DEC-03`, `EV-13` | Một dòng token đổi giá trị → BLOCK toàn task, kể cả khi mọi số đo khác đạt |
| `RQ-11` | Bổ sung vào `src/domains/job-board/public-ui-premium.static.test.ts` một dòng `TEXT_PAIRS` cho trạng thái NGHỈ của nút chính, và sửa dòng `UI_PAIRS` đang ghim nền nút là `--color-primary` thành token mới. Cả hai bảng phải mô tả đúng CSS sau khi sửa | Must | `EV-14`, `EV-15` | Thiếu dòng trạng thái nghỉ → `AC-11` FAIL, vì đó chính là lỗ đã để lỗi này sống qua go-live-08. Để nguyên dòng `UI_PAIRS` cũ → `AC-11` FAIL dù test vẫn xanh |
| `RQ-12` | Khẳng định `expect(movers).toEqual` ở `src/domains/job-board/public-ui-premium.static.test.ts:611` giữ NGUYÊN VĂN và giữ XANH. Ba phép đếm trên nguồn navbar ở `:302-308` cũng phải xanh; nếu Tier 2 đổi CƠ CHẾ hover thì phải cập nhật đúng ba con số đó trong cùng commit và giải thích trong HANDOFF | Must | `EV-16`, `EV-17` | Sửa `movers` để test xanh → BLOCK. Ba phép đếm đỏ mà không giải thích → `AC-12` FAIL |
| `RQ-13` | Chạy `npm run test:unit` và dán nguyên văn dòng tổng kết cùng exit code vào HANDOFF | Must | — | Dùng `npx vitest run` trần → bằng chứng bị loại, vì lane đó đọc `DATABASE_URL` từ `.env` và fail oan các test component |
| `RQ-14` | HANDOFF mang một BẢNG số đo trước và sau cho từng chỗ sửa, mỗi dòng ghi rõ tệp, dòng, hex nền, hex chữ, tỉ số cũ, tỉ số mới, và NGƯỠNG ÁP DỤNG kèm lý do cỡ chữ | Must | `EV-21`, `RQ-06` | Chỉ ghi "đã sửa" hoặc chỉ ghi tỉ số mới mà không ghi ngưỡng áp dụng → `AC-14` FAIL |
| `RQ-15` | KHÔNG commit, KHÔNG push, KHÔNG deploy. Không chạm file nào ngoài danh sách §4.2 | Must | — | Một commit hoặc một push từ Tier 2 → BLOCK, và Tier 1 phải ghi vào handover |

### 4.2 Scope boundaries

Trong phạm vi — đúng 8 tệp, không hơn:

1. `app/globals.css` — CHỈ khối `.hrp-btn-primary` và các khối trạng thái của nó.
2. `app/components/GlobalNavbar.tsx`
3. `app/(jobs)/track/page.tsx`
4. `app/(jobs)/viec-lam/[slug]/page.tsx`
5. `app/(portal)/ve-chung-toi/page.tsx`
6. `src/domains/job-board/components/apply-modal.tsx`
7. `src/domains/job-board/components/success-modal.tsx`
8. `src/domains/job-board/public-ui-premium.static.test.ts`

Ngoài phạm vi:

- `app/(portal)/page.tsx` — KHÔNG sửa một byte. Năm nút chính của trang chủ nhận bản sửa qua lớp dùng chung. Đây chính là chỗ task này rẻ: một tệp hơn một nghìn dòng, bị nhiều test ghim mặt chữ, được sửa mà không mở ra.
- Tám trang admin, `app/ctv`, `app/vendor`, `app/worker`. Khoảng `41` chỗ trượt ngưỡng ở đó là contract kế tiếp.
- Mười hai chỗ dùng `outline-none`.
- `app/(portal)/page.tsx:1017` — xem `EV-18`, không phải lỗi.
- `prisma/**`, `middleware.ts`, `vercel.json`, mọi route API, mọi service, mọi test khác ngoài tệp số 8.
- Các lớp `.hrp-btn-outline`, `.hrp-btn-ghost`, `.hrp-btn-muted`, `.hrp-btn-done`, `.hrp-card`, `.hrp-pill-location`, `.hrp-field`, `.hrp-skip`, `.hrp-panel` — đều đã có dòng trong bảng đo của go-live-08 và đều đạt. Không chạm.
- Ba tệp `AUDIT.md` đang dirty của lane khác, và `public/index.html`. Không stage, không sửa, không restore.

### 4.3 Data, State, Permission và Interface Rules

- Task này KHÔNG chạm tầng dữ liệu. Không đổi khoá DTO, không đổi truy vấn, không đổi schema, không thêm state phía server, không đổi quyền. Mọi thay đổi là giá trị thuộc tính trình bày cộng thuộc tính hỗ trợ tiếp cận.
- `aria-current` cần `usePathname` từ `next/navigation`. `app/components/GlobalNavbar.tsx` đã là client component vì đã dùng `useState`, nên không phát sinh biên client mới. CẤM biến bất kỳ tệp nào khác thành client component để phục vụ task này.
- Task này không cần credential nào, không đọc `.env`, không nối DB. Nếu Tier 2 thấy mình cần `DATABASE_URL` để hoàn thành việc này thì đó là dấu hiệu đã đi sai đường, không phải dấu hiệu thiếu môi trường.
- Bí mật: không in connection string, token, password hay PII vào log hoặc HANDOFF.
- Chỉ stage đúng path trong §4.2 khi được yêu cầu. Cấm `git add -A` và `git add .`.

## 5. Execution Plan

| Step | Hành động | Ràng buộc |
|---|---|---|
| `STEP-01` | Đọc lại TASK.md này ngay trước khi viết HANDOFF. Tier 1 có thể đã bump spec trong lúc Tier 2 đang code, và git không báo gì | Ghi `Spec version` đã đọc vào HANDOFF |
| `STEP-02` | Sửa `app/globals.css`: nền nghỉ của `.hrp-btn-primary`, cộng cách phân biệt hover theo `DEC-02`. Không thêm khối mang `transform` | `RQ-01`, `RQ-02`, `RQ-10` |
| `STEP-03` | Sửa `app/components/GlobalNavbar.tsx`: nền `Avatar`, hai pill vai trò, màu hover nav link, ba `aria-hidden`, cộng `aria-current` với tín hiệu không phải màu ở cả hai bản desktop và mobile | `RQ-03`, `RQ-04`, `RQ-05`, `RQ-08`, `RQ-09`, `DEC-07` |
| `STEP-04` | Sửa bốn tệp bề mặt công khai: nút và vòng focus của trang tra cứu, nút gửi đơn, hai nút cộng hai chỗ chữ của modal thành công, link quay lại của trang chi tiết, phần tử `em` của trang giới thiệu | `RQ-03`, `RQ-06`, `RQ-07`, `DEC-09` |
| `STEP-05` | Sửa bảng đo trong `src/domains/job-board/public-ui-premium.static.test.ts`: thêm dòng trạng thái nghỉ vào `TEXT_PAIRS`, sửa dòng nền nút trong `UI_PAIRS`. Không chạm `movers` | `RQ-11`, `RQ-12` |
| `STEP-06` | Tự đo lại từng chỗ đã sửa và lập bảng trước-sau. Ngưỡng của mỗi dòng phải suy từ cỡ chữ THẬT của phần tử đó, không phải từ một ngưỡng mặc định | `RQ-14`, `RQ-06` |
| `STEP-07` | Chạy `npm run test:unit`, dán nguyên văn dòng tổng kết và exit code. Nếu đỏ thì sửa cho xanh rồi chạy lại, và ghi cả lần đỏ vào HANDOFF | `RQ-13` |
| `STEP-08` | Viết `HANDOFF.md` trong cùng thư mục task. KHÔNG commit, KHÔNG push | `RQ-15` |

## 6. Acceptance Criteria

Số tham chiếu dùng chung cho mọi AC bên dưới, đã đo bằng `scratch/gl15-numbers.py`, exit code `0`:

- Chữ trắng `#ffffff` trên nền `#a63b00`: `6.468:1`.
- Chữ `#a63b00` trên năm nền sáng của bề mặt công khai: `6.468` trên `#ffffff`, `6.147` trên `#faf9f7`, `5.842` trên `#fdf1ec`, `5.832` trên `#f4f3f1`, `5.578` trên `#efeeec`. Sàn của cả năm là `5.578:1`.
- Lớp trạng thái trắng phủ trên `#a63b00`: `8%` cho `5.536`, `10%` cho `5.308`, `12%` cho `5.089`. Cả ba đều trên `4.5:1`.

| ID | Cách kiểm | Kết quả PASS |
|---|---|---|
| `AC-01` | Đọc khối `.hrp-btn-primary {` trong `app/globals.css` | Khối chứa `background-color: var(--color-primary-dark);` và KHÔNG còn `background-color: var(--color-primary);`. Cặp chữ nền của trạng thái nghỉ đo được `6.468:1`, không dưới `4.5:1` |
| `AC-02` | Đọc ba khối nghỉ, hover, active của nút chính, cộng `git diff app/globals.css` | Hover khác trạng thái nghỉ bằng ít nhất một thuộc tính đo được. Nếu dùng lớp trắng mờ thì alpha nằm trong khoảng `0.08` tới `0.12` và tỉ số chữ trên nền kết quả không dưới `5.089:1`. Diff KHÔNG thêm khối mới nào chứa `transform`, KHÔNG thêm tên token mới nào |
| `AC-03` | Đo năm chỗ: `app/(jobs)/track/page.tsx:95`, `apply-modal.tsx:184`, `success-modal.tsx:88`, `success-modal.tsx:138`, `GlobalNavbar.tsx:26-36` | Cả năm không dưới `4.5:1`. Với hướng sửa của `DEC-01` thì cả năm đo `6.468:1`. Hiện trạng của cả năm là `3.153:1` nên một dòng còn `3.153` là dòng chưa sửa |
| `AC-04` | Đo pill vai trò ở `GlobalNavbar.tsx:161` VÀ `:264` | CẢ HAI không dưới `4.5:1`. Đổi chữ sang `--color-primary-dark` trên nền `--color-primary-soft` cho `5.842:1`. Một trong hai còn `2.848:1` là FAIL |
| `AC-05` | Đọc handler hover ở `GlobalNavbar.tsx:112` rồi đo màu chữ hover trên nền thật của header | Không dưới `4.5:1`. Nếu nền header là `#ffffff` thì `--color-primary-dark` cho `6.468:1`. Hiện trạng `3.153:1` |
| `AC-06` | Đo bốn chỗ chữ, mỗi chỗ theo ngưỡng của chính nó | `viec-lam/[slug]/page.tsx:107`, `success-modal.tsx:107`, `success-modal.tsx:115` không dưới `4.5:1`. `ve-chung-toi/page.tsx:62` không dưới `3:1` VÀ HANDOFF ghi rõ ngưỡng `3:1` kèm lý do cỡ chữ lớn. Ghi chỗ này bằng ngưỡng `4.5:1` là FAIL ngay cả khi số đo đạt |
| `AC-07` | `rg -n "outlineColor" app/(jobs)/track/page.tsx` rồi đo vòng focus của hai control | Không dòng nào còn `var(--color-primary)`. Vòng focus của cả hai không dưới `3:1`; `--color-primary-dark` cho `6.468:1` trên `#ffffff` và `6.147:1` trên `#faf9f7`. Hiện trạng `2.997:1` |
| `AC-08` | `rg -n "material-symbols-outlined" app/components/GlobalNavbar.tsx` rồi đọc ba phần tử ở `:143`, `:179`, `:189` | Cả ba mang `aria-hidden="true"`. Hiện trạng là `0` trên `3` |
| `AC-09` | `rg -n "aria-current" app/components/GlobalNavbar.tsx` rồi đọc cả nhánh desktop và nhánh mobile | `aria-current="page"` đặt trên đúng một link ở MỖI nhánh, suy từ đường dẫn hiện tại chứ không hard-code. Kèm ít nhất một tín hiệu thị giác KHÔNG phải màu, ví dụ gạch chân hoặc đổi độ đậm hoặc thanh chỉ dấu. Chỉ đổi màu là FAIL |
| `AC-10` | `git diff app/globals.css` cộng `rg -n -- "--color-primary:" app/globals.css` | Không dòng nào trong khối `@theme` đổi giá trị. `--color-primary` vẫn là `#f26522`. Không có tên token màu mới ở bất kỳ tệp nào trong §4.2. Một dòng token đổi giá trị là BLOCK toàn task |
| `AC-11` | Đọc `TEXT_PAIRS` và `UI_PAIRS` trong `src/domains/job-board/public-ui-premium.static.test.ts` | `TEXT_PAIRS` có một dòng MỚI cho trạng thái NGHỈ của nút chính. Dòng `UI_PAIRS` đang ghim nền nút là `--color-primary` đã đổi sang token thật sau khi sửa. Cả hai bảng mô tả đúng CSS hiện hành |
| `AC-12` | Đọc `src/domains/job-board/public-ui-premium.static.test.ts:611` cộng ba phép đếm ở `:302-308`, rồi chạy lane test | Mảng của `expect(movers).toEqual` giữ nguyên hai phần tử cũ, nguyên văn. Ba phép đếm trên nguồn navbar xanh. Nếu Tier 2 đổi cơ chế hover thì ba con số được cập nhật trong cùng commit VÀ HANDOFF giải thích vì sao. Sửa `movers` để test xanh là BLOCK |
| `AC-13` | `npm run test:unit` | Exit code `0`, và HANDOFF dán nguyên văn dòng tổng kết. Bằng chứng từ `npx vitest run` trần bị loại |
| `AC-14` | Đọc bảng trước-sau trong HANDOFF | Bảng có đủ bảy cột: tệp, dòng, hex nền, hex chữ, tỉ số cũ, tỉ số mới, ngưỡng áp dụng kèm lý do cỡ chữ. Thiếu cột ngưỡng là FAIL |
| `AC-15` | `git status --porcelain` và `git log --oneline -1` | Không có commit mới của Tier 2. Danh sách file thay đổi là tập con của §4.2. Ba tệp `AUDIT.md` của lane khác và `public/index.html` KHÔNG bị stage, không bị sửa, không bị restore |

### 6.1 Traceability

| RQ | STEP | AC | EV |
|---|---|---|---|
| `RQ-01` | `STEP-02` | `AC-01` | `EV-01`, `EV-02`, `EV-03` |
| `RQ-02` | `STEP-02` | `AC-02` | `EV-16` |
| `RQ-03` | `STEP-03`, `STEP-04` | `AC-03` | `EV-04`, `EV-05` |
| `RQ-04` | `STEP-03` | `AC-04` | `EV-06` |
| `RQ-05` | `STEP-03` | `AC-05` | `EV-07`, `EV-17` |
| `RQ-06` | `STEP-04`, `STEP-06` | `AC-06` | `EV-08`, `EV-09`, `EV-10` |
| `RQ-07` | `STEP-04` | `AC-07` | `EV-11`, `EV-12` |
| `RQ-08` | `STEP-03` | `AC-08` | `EV-20` |
| `RQ-09` | `STEP-03` | `AC-09` | `EV-19` |
| `RQ-10` | `STEP-02` | `AC-10` | `EV-13` |
| `RQ-11` | `STEP-05` | `AC-11` | `EV-14`, `EV-15` |
| `RQ-12` | `STEP-05`, `STEP-07` | `AC-12` | `EV-16`, `EV-17` |
| `RQ-13` | `STEP-07` | `AC-13` | — |
| `RQ-14` | `STEP-06` | `AC-14` | `EV-21` |
| `RQ-15` | `STEP-08` | `AC-15` | — |

## 7. Risk và Rollback

| ID | Rủi ro | Vì sao nó nguy hiểm | Chặn bằng | Rollback |
|---|---|---|---|---|
| `RISK-01` | Sửa GIÁ TRỊ của `--color-primary` trong `@theme` thay vì sửa tại điểm dùng | Một dòng, và khoảng `41` chỗ ngoài phạm vi ở tám trang admin cộng `ctv`, `vendor`, `worker` đổi màu trong im lặng. Không một test nào trong repo bắt được, vì không test nào đọc màu của các trang đó | `RQ-10`, `AC-10` — một dòng token đổi giá trị là BLOCK toàn task, kể cả khi mọi số đo khác đạt | `git restore` đúng `app/globals.css`. Một dòng, không mất việc khác |
| `RISK-02` | Sửa CSS mà để nguyên dòng `UI_PAIRS` ở `:455` | Khẳng định đó liệt kê TÊN TOKEN chứ không đọc CSS, nên nó vẫn XANH khi mô tả một trạng thái đã chết. Bảng đo trở thành thứ nói dối về hệ thống, và đúng lỗ này là cách lỗi hiện tại sống sót qua go-live-08 | `RQ-11`, `AC-11` — Tier 3 đọc bảng, không chỉ đọc màu của lane test | Sửa một dòng trong tệp test |
| `RISK-03` | Gán lớp `hrp-btn-primary` cho `Avatar` để tận dụng bản sửa | `public-ui-premium.static.test.ts:617-627` buộc MỌI lần xuất hiện của lớp đó trong `app/(portal)/page.tsx` và `app/components/GlobalNavbar.tsx` phải kèm `nav-item-lift`. Kèm vào thì avatar nhảy khi hover; không kèm thì lane đỏ. Tier 2 dễ kết luận sai là bản sửa hỏng rồi revert đúng phần đang đúng | `DEC-07` — `Avatar` sửa bằng `style` inline tại chỗ, KHÔNG nhận lớp dùng chung | Bỏ lớp vừa gán, quay về `style` inline |
| `RISK-04` | Trạng thái nghỉ và hover thành cùng một màu | Sau bản sửa, nền nghỉ bằng đúng nền hover cũ. Nếu không thêm dấu hiệu nào thì nút mất phản hồi hover, tức sửa xong tiếp cận thì làm hỏng tương tác | `RQ-02`, `AC-02` — cộng biên `8%` tới `12%` đã đo sẵn để Tier 2 không phải tự đoán | Thêm lại một thuộc tính phân biệt; không ảnh hưởng số đo tương phản |
| `RISK-05` | Ghi `ve-chung-toi/page.tsx:62` bằng ngưỡng `4.5:1` | Nó là chữ `36px`/`48px` extrabold, ngưỡng thật là `3:1`, và nó trượt đúng `0.003`. Ghi sai ngưỡng dạy sai luật cho mọi bản audit về sau, và làm một lỗi `0.003` trông như lỗi nghiêm trọng | `RQ-06`, `AC-06` — ghi sai ngưỡng là FAIL ngay cả khi số đo đạt | Sửa một dòng trong HANDOFF |
| `RISK-06` | Đánh dấu trang đang mở CHỈ bằng màu | Vi phạm đúng nguyên tắc mà task này đang sửa. Người không phân biệt được màu mất thông tin điều hướng | `RQ-09`, `AC-09` — bắt buộc ít nhất một tín hiệu không phải màu | Thêm gạch chân hoặc độ đậm hoặc thanh chỉ dấu |
| `RISK-07` | Chạy `npx vitest run` trần thay vì lane canonical | Lane trần đọc `DATABASE_URL` từ `.env`, tức PRODUCTION, và fail oan `24` test component. Tier 2 sẽ tưởng mình làm hỏng rồi đi sửa mã đang lành | `RQ-13`, `AC-13` — bằng chứng từ lane trần bị loại thẳng | Chạy lại `npm run test:unit`, không có thiệt hại mã |
| `RISK-08` | Tier 2 commit hoặc push | Push `main` là deploy production qua Vercel Git integration, kể cả push chỉ có docs. Contract `hrp-v5-go-live-07-marketplace-launch-proof` ghim một SHA deployment ở `RQ-01`, nên một push giữa lúc drill 07 chạy làm vô hiệu bằng chứng của 07 | `RQ-15`, `AC-15` — và Tier 1 phải ghi vi phạm vào handover | Không rollback được sau khi Vercel build. Đây là lý do rào này là Must |
| `RISK-09` | Đổi CƠ CHẾ hover của navbar thay vì đổi giá trị màu | Ba phép đếm trên nguồn navbar ở `:302-308` sẽ đỏ. Chúng là hàng rào cố ý của go-live-08, không phải rác | `RQ-12`, `AC-12` — nếu buộc phải đổi cơ chế thì cập nhật đúng ba con số trong cùng commit và giải thích | Quay về đổi giá trị màu trong handler |
| `RISK-10` | Tin số của `scratch/ui-contrast-scan.py` như kết luận | Công cụ không đọc cỡ chữ và không đọc `aria-hidden` nên báo THỪA. Tier 2 dễ mở rộng sang `41` chỗ ngoài phạm vi, hoặc sửa một icon trang trí mà WCAG miễn trừ | `EV-18`, `EV-21`, `§4.2` — hai chỗ Tier 1 đã tự bác lại công cụ được ghi thẳng vào contract | Thu lại các thay đổi ngoài §4.2 trước khi viết HANDOFF |

Rollback tổng: mọi thay đổi của task này là thuộc tính trình bày cộng thuộc tính hỗ trợ tiếp cận, trên tám tệp đã liệt kê. Không có migration, không có seed, không có thay đổi lược đồ, không có thay đổi khoá DTO. `git restore` đúng path trong §4.2 là đủ để về nguyên trạng, và không có bước nào của task này để lại tác dụng ngoài repo.

## 8. Open Questions

Không câu nào chặn thực thi.

| ID | Câu hỏi | Ai trả lời | Trạng thái |
|---|---|---|---|
| `Q-01` | Dùng cơ chế nào để phân biệt hover sau khi nghỉ và hover cùng màu: lớp trắng mờ trong biên `8%` tới `12%`, hay đổi `box-shadow`, hay cả hai | Tier 2 chọn trong biên của `DEC-02` | MỞ, không chặn. `AC-02` đo kết quả chứ không ghim cơ chế |
| `Q-02` | Nền THẬT của header navbar ở trạng thái cuộn và chưa cuộn là hex nào | Tier 2 đo tại `STEP-03` | MỞ, không chặn. `AC-05` buộc đo trên nền thật thay vì giả định `#ffffff` |
| `Q-03` | Khoảng `41` chỗ trượt ngưỡng ở tám trang admin cộng `ctv`, `vendor`, `worker`, kèm các hex viết cứng `#94a3b8` `2.312:1`, `#64748b` `4.291:1`, `#dc2626` `4.355:1` | Tier 1, ở contract kế tiếp | MỞ có chủ ý. Owner đã cắt phạm vi task này còn bề mặt công khai cộng navbar |
| `Q-04` | Mười hai chỗ dùng `outline-none` có cần vòng focus thay thế hay không | Tier 1, ở contract kế tiếp | HOÃN có chủ ý, đã ghi ở Non-goals |

## 9. Planner Resolution

Chưa có. Task ở `Current execution round: 0`, chưa có HANDOFF và chưa có AUDIT. Mục này do Tier 1 ghi sau khi đọc AUDIT.md thật của Tier 3, không phải sau khi nghe relay.

## 10. Revision Log

| Version | Ngày | Thay đổi |
|---|---|---|
| `v1.0` | 2026-09-02 | Bản đầu. Sinh ra từ một lượt quét tương phản do Tier 1 tự chạy trên `app` và `src`, cộng hai quyết định của Owner: hướng sửa nút chính là nền `#a63b00` chữ trắng, và phạm vi cắt còn bề mặt công khai cộng `GlobalNavbar`. Ghi nguyên nhân gốc ở `EV-14`: bảng đo tương phản của go-live-08 chỉ chứa các cặp mà chính 08 tạo ra, nên cặp ở trạng thái nghỉ của nút chính chưa bao giờ được đo |
