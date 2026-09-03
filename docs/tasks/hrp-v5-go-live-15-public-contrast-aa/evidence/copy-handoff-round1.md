# HANDOFF — `hrp-v5-go-live-15-public-contrast-aa`

## 0. Control

| Trường | Giá trị |
|---|---|
| Task | `hrp-v5-go-live-15-public-contrast-aa` |
| Spec version đã thực thi | `v1.0` |
| TASK status khi nhận | `READY_FOR_EXECUTION` |
| Execution round | `1` |
| Baseline của contract | `397b026` |
| `HEAD` lúc bàn giao | `846ba0e` (tiến lên do luồng khác, không do tôi — xem `DEV-10`) |
| Tier | 2 — Engineer |
| Commit mới do Tier 2 tạo | `0` |
| Push | `0` |
| Deploy | `0` |
| Handoff status | `READY_FOR_AUDIT` |

Ba điều KHÔNG, theo `R-01`: **không commit, không push, không deploy**. `git log --oneline -1` vẫn là commit của người khác.

Một điều Tier 3 phải biết trước khi đo bất cứ thứ gì: **mọi thứ tôi giao đều đang ở trạng thái STAGED** (chỉ `git add`, không `commit`) theo luật chống-cắt-file, sau khi hai tệp trong phạm vi bị một luồng khác ghi đè về nội dung `HEAD` lúc `00:39:16` và xoá sạch phần tôi sửa. Hệ quả cơ học: **`git diff` trần sẽ ra RỖNG**. Muốn thấy bản tôi giao phải dùng `git diff HEAD` hoặc `git diff --cached`.

`git diff --cached HEAD --name-only` ra `30` path, chia đúng hai nhóm và không có nhóm thứ ba:

| Nhóm | Số path | Là gì |
|---|---|---|
| A — mã sản phẩm và test | `8` | Đúng danh sách §4.2, không hơn một path |
| B — văn bản của chính task này | `22` | `HANDOFF.md` cộng `21` artifact dưới `evidence/`, tức thứ mà `STEP-08` buộc tôi tạo |

Bằng chứng phân loại: `evidence/step08-ac15-scope-final.txt`. Chi tiết ở `DEV-02` và `DEV-09`.

Tôi đã đọc lại `TASK.md` ngay trước khi viết văn bản này. Không có bump: vẫn `v1.0`, vẫn `Baseline 397b026`, vẫn `Current execution round 0`, `git status --short -- TASK.md` ra `0` dòng.

## 1. Outcome Summary

Task này sửa một lớp lỗi tương phản trên bề mặt công khai, mà gốc của nó là điểm mù của go-live-08: bảng `TEXT_PAIRS` của 08 chỉ liệt kê những cặp màu do CHÍNH 08 sinh ra, nên cặp màu ở trạng thái NGHỈ của `.hrp-btn-primary` — vốn có trước 08 — chưa từng bị đo. Suite xanh `100%` trong khi cái nút chính của cả sản phẩm nằm ở `3.153:1`, tức trượt AA cho chữ thường.

`14` trên `15` AC có bằng chứng ĐẠT. **`AC-13` KHÔNG đạt**: lane canonical đóng ở `LANE_EXIT=1`, còn đúng `1` test đỏ trên `1590`. Test đỏ đó nằm **ngoài** §4.2 (`src/domains/applications/marketplace-inventory.static.test.ts:350`) và nó đỏ **vì chính `RQ-03`**: nó ghim mặt chữ `backgroundColor: 'var(--color-primary)'` ở đúng cái nút mà `RQ-03` buộc tôi đổi. §4.2 xếp "mọi test khác ngoài tệp số 8" vào cột Cấm chạm, nên `AC-13` là bất khả đạt cùng lúc với `AC-15` — tôi giao đủ `RQ-03`, để test ngoài phạm vi đỏ, KHÔNG ghi PASS cho `AC-13`, và trình phương án sửa một dòng cho Tier 1 quyết ở `DEV-01`.

Nội dung đã giao:

- `21` chỗ đo, `17` chỗ trước khi sửa TRƯỢT ngưỡng của chính nó, sau khi sửa còn `0` chỗ trượt.
- Cách sửa nằm ở **điểm dùng**, không nằm trong khối `@theme`. Khối `@theme` của bản tôi giao giống `HEAD` **từng byte** (`4133` ký tự, `76` token). Đây là điều kiện BLOCK của `RQ-10`, và nó là chỗ dễ bị quy oan nhất tối nay, vì một luồng khác đã hai lần ghi một bảng màu khác vào đúng tệp ấy — xem `DEV-07`.
- Trạng thái hover không còn dựa vào việc đổi nền, vì nền nghỉ đã là `--color-primary-dark`. Nó dùng một lớp trạng thái trắng `10%` hợp thành ra `#af4f1a`, cho `5.308:1`, trên sàn `5.089:1` mà `AC-02` ấn định.
- Hàng rào được siết đúng chỗ đã hở: `TEXT_PAIRS` có thêm dòng NGHỈ, `UI_PAIRS` chuyển sang token thật, và cặp cũ `3.153:1` được đổi thành phép đếm `0`.

## 2. Execution Trace

| Step | Việc đã làm | Kết quả / artifact |
|---|---|---|
| `STEP-01` | Đọc `TASK.md` `v1.0`, dựng lại `11` tỉ số ở §6 bằng công thức WCAG của riêng tôi thay vì tin số có sẵn | `11 / 11` khớp, lệch lớn nhất `0.0000` — `evidence/step06-contrast-table.txt` mục `0` |
| `STEP-00` (thêm) | Đo lane TRƯỚC khi chạm mã, vì `AC-13` đòi exit `0` mà tôi cần biết cái gì đỏ từ trước | `10` test đỏ có sẵn ở baseline — `evidence/step00-preexisting-red-probe.txt`, `step00b-preexisting-lane-full.txt` |
| `STEP-02` | Sửa ba khối `.hrp-btn-primary` trong `app/globals.css`: nghỉ đổi sang `--color-primary-dark`, hover thêm lớp trạng thái trắng `10%`, `:active` bỏ lớp đó | `+11 / -1`, `0` dòng thêm nằm ngoài ba khối — `evidence/step08-globals-diff-verbatim.txt` |
| `STEP-03` | Sửa các chỗ dùng trong `GlobalNavbar.tsx`, `track/page.tsx`, `apply-modal.tsx`, `success-modal.tsx`; thêm `aria-hidden` cho ba icon; thêm trạng thái ĐANG Ở bằng `usePathname` cộng dấu hiệu không-màu | `evidence/step08-ac0709-battery.txt`, `evidence/step08-linemap.txt` |
| `STEP-04` | Sửa `viec-lam/[slug]/page.tsx`, `ve-chung-toi/page.tsx`; bỏ mọi dòng `outlineColor` trỏ `--color-primary` và chuyển sang `.hrp-focus` | `outlineColor` còn `0` dòng — `evidence/step08-ac0709-battery.txt` |
| `STEP-05` | Siết `public-ui-premium.static.test.ts`: thêm `ratioHex` và `composite`, thêm dòng NGHỈ vào `TEXT_PAIRS`, chuyển dòng nút của `UI_PAIRS` sang token thật, đổi cặp cũ thành phép đếm `0`, thêm một `it` đo nền hover hợp thành | `+63 / -11` |
| `STEP-06` | Tự đo lại từng chỗ đã sửa. Ngưỡng của mỗi dòng suy từ cỡ chữ THẬT của phần tử đó | `21` dòng, `7` cột — `evidence/step06-contrast-table.txt`, bảng đầy đủ ở §3 dưới `AC-14` |
| `STEP-07` | Chạy `npm run test:unit` ba lượt. Lượt `3` được kẹp bằng `git hash-object` trước và sau để nêu đích danh nội dung nào đã bị đo | `evidence/step07-lane-run1.txt`, `-run2.txt`, `-run3.txt` |
| `STEP-08` | Viết `HANDOFF.md`, `git add` ngay, cộng một bản copy trong `evidence/` | Văn bản này |

Ngoài chín bước trên, tôi làm thêm hai việc không có trong §5 của contract, cả hai đều là đo, không phải sửa:

- Dựng `scratch/gl15-mytests-head-tokens.mjs` để chạy lại đúng các khẳng định mới của tôi trên **giá trị token lấy từ `git show HEAD:app/globals.css`**, chứ không lấy từ worktree. Lý do: worktree của tệp đó đang bị luồng khác ghi vào, nên một lượt xanh đọc worktree không chứng minh được gì. Kết quả `16 / 16` PASS, `MY_ASSERT_EXIT=0` — `evidence/step07-my-assertions-under-head-tokens.txt`.
- Dựng `scratch/gl15-delivered-vs-head.py` để so khối `@theme` giữa `HEAD`, INDEX và WORKTREE. Đây là artifact quyết định của `AC-10` — `evidence/step08-delivered-vs-head.txt`.

## 3. Acceptance Evidence

| AC | Lệnh / phép kiểm | Exit / kết quả | Bằng chứng | Giới hạn |
|---|---|---|---|---|
| — | `& ".ai-pipeline/scripts/verify-task.ps1" -TaskPath "docs/tasks/hrp-v5-go-live-15-public-contrast-aa/TASK.md"` | `RESULT: PASS. TASK contract is ready for execution.`, exit `0` | `evidence/step08-verify-task.txt` | Đây là kiểm CẤU TRÚC contract cho `C-09` của Tier 3, không phải kiểm nội dung việc |
| `AC-01` | `git diff --cached HEAD -- app/globals.css` in nguyên văn, cộng `grep` trong khối `.hrp-btn-primary` | Khối nghỉ CÓ `background-color: var(--color-primary-dark);` và `0` lần `background-color: var(--color-primary);`. Trắng trên `#a63b00` = `6.468:1` ≥ `4.5` | `evidence/step08-globals-diff-verbatim.txt`, `evidence/step06-contrast-table.txt` dòng `globals.css:245` | Không |
| `AC-02` | Đọc alpha ra khỏi dòng `linear-gradient`, hợp thành trên `#a63b00`, rồi đo trắng trên kết quả. Cộng ba phép đếm trên dòng THÊM | alpha `0.10` nằm trong dải `0.08`–`0.12`. Hợp thành `#af4f1a`, trắng trên đó `5.308:1` ≥ `5.089`. Dòng thêm khai báo token mới `= 0`, dòng thêm chứa chữ `transform` `= 0`, dòng thêm mở selector mới `= 0` | `evidence/step08-ac02-ac10-battery.txt`, `evidence/step08-globals-diff-verbatim.txt`, `evidence/step07-my-assertions-under-head-tokens.txt` | Số hợp thành là phép tính trên hex, không phải ảnh chụp pixel từ trình duyệt. Công thức đã được đối chứng: nó dựng lại đúng cả ba số `5.536` / `5.308` / `5.089` mà §6 của contract tự ghi, lệch `0.000` |
| `AC-03` | Năm chỗ contract nêu, đo trên nền THẬT của từng chỗ | Cả năm ra `6.468:1` ≥ `4.5`. Không còn dòng nào ở `3.153` | `evidence/step06-contrast-table.txt` các dòng `globals.css:245`, `GlobalNavbar:48`, `track:95`, `apply-modal:184`, `success-modal:88` và `:138` | Số dòng đã dịch so với contract vì tôi thêm helper và markup `aria-current`; bản đồ dòng ở `DEV-06` |
| `AC-04` | Hai pill vai trò, desktop và mobile | Cả hai `5.842:1` ≥ `4.5`, không còn cái nào ở `2.848:1` | `evidence/step06-contrast-table.txt` dòng `GlobalNavbar:197` và `:313` | Không |
| `AC-05` | Đọc handler hover và xác định nền THẬT của header trước khi đo | Handler đổi sang `var(--color-primary-dark)`; nền header thật là `--color-surface` `#ffffff` ⇒ `6.468:1` ≥ `4.5` | `evidence/step06-contrast-table.txt` dòng `GlobalNavbar:143`; `evidence/step08-linemap.txt` | Không |
| `AC-06` | Ba chỗ chữ thường ở ngưỡng `4.5`, một chỗ chữ LỚN ở ngưỡng `3` | `viec-lam:107` = `6.147:1`; `success-modal:107` = `4.996:1`; `success-modal:115` = `4.996:1`; **`ve-chung-toi:62` = `6.147:1` đo ở ngưỡng `3:1`** vì `<em>` này là chữ `36px` trên mobile / `48px` trên desktop, `font-extrabold`, tức chữ LỚN theo WCAG (`≥18.66px` và bold) | `evidence/step06-contrast-table.txt` bốn dòng tương ứng | Hai dòng `success-modal:107` và `:115` được đo trên `#e3e2e0`, KHÔNG phải `#ffffff` — đây là điểm §6 của contract ghi sai, xem `DEV-03` |
| `AC-07` | `grep -n "outlineColor"` trên hai tệp, cộng đọc token của `.hrp-focus:focus-visible` | `outlineColor` còn `0` dòng. `2` control mang `.hrp-focus`. Vòng focus vẽ bằng `--color-focus-ring`, mà `HEAD` định nghĩa `--color-focus-ring: var(--color-primary-dark)` ⇒ `6.468:1` trên `#ffffff` và `6.147:1` trên `#faf9f7`, cả hai ≥ `3` | `evidence/step08-ac0709-battery.txt` | Không |
| `AC-08` | Đếm từng thẻ icon một, rồi đếm số thẻ THIẾU thuộc tính | `3` icon ở `:176` / `:215` / `:225`, cả `3` có `aria-hidden="true"`, `SO ICON THIEU aria-hidden = 0`. Hiện trạng cũ là `0` trên `3` | `evidence/step08-ac0709-battery.txt` | Không |
| `AC-09` | Đọc chuỗi `usePathname` → `activeNavHref` → `aria-current`, rồi tìm dấu hiệu KHÔNG dùng màu | `usePathname` ở `:4`, `activeNavHref(pathname)` ở `:33`, `activeHref` ở `:57`, `aria-current={isActive ? 'page' : undefined}` ở `:136` (desktop) và `:282` (mobile) — đúng một link mỗi nhánh vì helper trả về đúng một href. Dấu hiệu không-màu: `font-semibold underline underline-offset-8 decoration-2` ở `:139` và `font-semibold underline underline-offset-4 decoration-2` ở `:285` | `evidence/step08-ac0709-battery.txt` | Không |
| `AC-10` | So khối `@theme` giữa `HEAD`, INDEX (bản tôi giao) và WORKTREE, bằng số ký tự, số token và giá trị từng token. Cộng phép đếm dòng thêm khai báo `--ten:` trên cả tám tệp | **INDEX giống `HEAD` từng byte**: `4133` ký tự, `76` token, `0` token thêm, `0` token mất, `--color-primary` vẫn `#f26522`, `--color-background` vẫn `#faf9f7`. Dòng THÊM khai báo tên token mới trên cả tám tệp `= 0` | `evidence/step08-delivered-vs-head.txt`, `evidence/step08-ac02-ac10-battery.txt` | **Phải đo trên INDEX, không phải trên worktree.** Cùng buổi tối, worktree của tệp này bị luồng khác ghi một bảng màu khác (`2176` ký tự, `56` token, `29` token bị xoá, `--color-primary` đổi thành `#a63b00`). Đó là điều kiện BLOCK của `RQ-10` nhưng KHÔNG do tôi gây và KHÔNG nằm trong bản tôi giao — xem `DEV-07` |
| `AC-11` | Đọc hai bảng trong tệp test, rồi chạy lại chính các khẳng định đó trên giá trị token của `HEAD` | `TEXT_PAIRS` có dòng MỚI `['.hrp-btn-primary nghỉ', '--color-on-primary', '--color-primary-dark']` (`6.468` ≥ `4.5`) cộng dòng hover được đổi nhãn cho đúng. `UI_PAIRS`: dòng nút chuyển sang `--color-primary-dark` so với `--color-surface` (`6.468`) và thêm dòng so với `--color-background` (`6.147`), cả hai ≥ `3`. Cặp cũ thành phép đếm `count(newCssCode, 'var(--color-primary)') === 0` | `evidence/step07-my-assertions-under-head-tokens.txt` — `16 / 16` PASS, `SO KHANG DINH FAIL = 0`, `MY_ASSERT_EXIT=0` | Không |
| `AC-12` | `grep -n "expect(movers).toEqual"` và so ba phép đếm navbar với blob `HEAD` | `movers` vẫn ở **dòng `611`**, KHÔNG bị tôi sửa. Ba phép đếm navbar ở `:302-308` giống `HEAD` từng byte. Toàn bộ tệp test số `8` xanh ở lượt lane thứ `3`, nghĩa là cả `movers` lẫn ba phép đếm ấy tự xanh trên mã mới chứ không cần nới | `evidence/step07-lane-run3.txt`, `evidence/step07-my-assertions-under-head-tokens.txt` mục `movers` (đúng hai phần tử `.hrp-card:hover` và `.hrp-btn-primary:hover:not(:disabled)`) | Không |
| `AC-13` | `npm run test:unit > evidence/step07-lane-run3.txt 2>&1; echo "LANE_EXIT=$?"` | **KHÔNG ĐẠT.** Nguyên văn: `Test Files  1 failed \| 102 passed (103)` và `Tests  1 failed \| 1589 passed (1590)`, `LANE_EXIT=1` | `evidence/step07-lane-run3.txt` (kẹp bằng `git hash-object` trước và sau để nêu đích danh nội dung đã bị đo), `evidence/step07-lane-run1.txt`, `-run2.txt` | Đúng `1` test đỏ, nằm NGOÀI §4.2, và nó đỏ vì chính `RQ-03`. Số học của lane: baseline `10` đỏ + `1579` xanh = `1589`; lượt `3` là `1` đỏ + `1589` xanh = `1590`, tức `9` test đỏ có sẵn đã tự xanh và `1` test của tôi thêm vào cũng xanh. Xem `DEV-01` |
| `AC-14` | Bảng `7` cột, ngưỡng suy từ cỡ chữ thật của từng phần tử | `21` dòng. Trước khi sửa: `17` dòng TRƯỢT ngưỡng của chính nó. Sau khi sửa: `0` dòng trượt | Bảng đầy đủ ngay dưới đây; nguồn `evidence/step06-contrast-table.txt` | Không |
| `AC-15` | `git status --porcelain`, `git log --oneline -1`, `git diff --cached HEAD --name-only` rồi phân loại từng path | `0` commit mới do Tier 2 (`git log --oneline -1` vẫn là `846ba0e` của Tier 1). `30` path trong INDEX, phân loại: `8` path mã = đúng danh sách §4.2 không hơn một path, `22` path văn bản của chính task này. Nhóm thứ ba `0` path. Ba `AUDIT.md` của luồng khác và `public/index.html` in ra ` M` (dấu cách rồi `M`) — đã sửa nhưng CHƯA stage, tức KHÔNG bị tôi stage, sửa hay `restore`, đúng nguyên trạng lúc tôi nhận việc | `evidence/step08-ac15-scope-final.txt` (bản cuối, đã phân loại), `evidence/step08-ac15-scope.txt`, `evidence/step08-antitruncation-stage.txt` | Mọi thứ tôi giao đang STAGED chứ không phải dirty thuần — cố ý, xem `DEV-09` |

### `AC-14` — bảng bảy cột, trước và sau

| Tệp | Dòng | Hex nền | Hex chữ | Tỉ số CŨ | Tỉ số MỚI | Ngưỡng áp dụng và lý do cỡ chữ |
|---|---|---|---|---|---|---|
| `app/globals.css` | `245` `.hrp-btn-primary` nghỉ | `#f26522` → `#a63b00` | `#ffffff` | `3.153:1` | `6.468:1` | `4.5:1` — nền nút, chữ `--color-on-primary`; class không đặt `font-size` nên là chữ THƯỜNG |
| `app/globals.css` | `253` `:hover` | `#a63b00` → `#af4f1a` | `#ffffff` | `6.468:1` | `5.308:1` | `5.089:1` — nền HỢP THÀNH; sàn này do chính `AC-02` ấn định (biên `12%` của `DEC-02`) |
| `app/globals.css` | `268` `:active` | `#a63b00` | `#ffffff` | `6.468:1` | `6.468:1` | `4.5:1` — lớp trạng thái bị bỏ nên nền đặc trở lại; chữ thường |
| `app/components/GlobalNavbar.tsx` | `48` avatar chữ cái | `#f26522` → `#a63b00` | `#ffffff` | `3.153:1` | `6.468:1` | `4.5:1` — `14px` BOLD `< 18.66px` nên KHÔNG phải chữ lớn (`EV-05`) |
| `app/components/GlobalNavbar.tsx` | `143` hover link desktop | `#ffffff` | `#f26522` → `#a63b00` | `3.153:1` | `6.468:1` | `4.5:1` — chữ `14px` thường trên nền header THẬT `--color-surface` |
| `app/components/GlobalNavbar.tsx` | `130` + `290` link ĐANG Ở | `#ffffff` | `#594138` → `#a63b00` | `9.383:1` | `6.468:1` | `4.5:1` — chữ `14px` semibold; trước đây chưa có trạng thái active nên cột CŨ là màu nghỉ |
| `app/components/GlobalNavbar.tsx` | `197` pill vai trò desktop | `#fdf1ec` | `#f26522` → `#a63b00` | `2.848:1` | `5.842:1` | `4.5:1` — chữ `12px` thường trên `--color-primary-soft` |
| `app/components/GlobalNavbar.tsx` | `313` pill vai trò mobile | `#fdf1ec` | `#f26522` → `#a63b00` | `2.848:1` | `5.842:1` | `4.5:1` — chữ `12px` thường trên `--color-primary-soft` |
| `app/(jobs)/track/page.tsx` | `95` nền nút Tra cứu | `#f26522` → `#a63b00` | `#ffffff` | `3.153:1` | `6.468:1` | `4.5:1` — nền nút, chữ trắng `16px` semibold |
| `app/(jobs)/track/page.tsx` | `88` vòng focus ô nhập | `#ffffff` | `#f26522` → `#a63b00` | `3.153:1` | `6.468:1` | `3:1` — vòng focus là THÀNH PHẦN giao diện, không phải chữ; kề nền `--color-surface` |
| `app/(jobs)/viec-lam/[slug]/page.tsx` | `107` link Quay lại | `#faf9f7` | `#f26522` → `#a63b00` | `2.997:1` | `6.147:1` | `4.5:1` — chữ `14px` thường trên nền body `--color-background` |
| `app/(jobs)/viec-lam/[slug]/page.tsx` | `124` pill trạng thái | `#fdf1ec` | `#f26522` → `#a63b00` | `2.848:1` | `5.842:1` | `4.5:1` — chữ `12px` semibold trên `--color-primary-soft` |
| `app/(jobs)/viec-lam/[slug]/page.tsx` | `170` số còn tuyển | `#f4f3f1` | `#f26522` → `#a63b00` | `2.843:1` | `5.832:1` | `4.5:1` — chữ `14px` semibold trên `--color-surface-container-low` |
| `app/(portal)/ve-chung-toi/page.tsx` | `62` `<em>` trong tiêu đề | `#faf9f7` | `#f26522` → `#a63b00` | `2.997:1` | `6.147:1` | **`3:1`** — `36px` / `48px` `font-extrabold` ⇒ CHỮ LỚN (`≥18.66px` và bold), nên ngưỡng là `3:1`, KHÔNG phải `4.5:1` |
| `app/(portal)/ve-chung-toi/page.tsx` | `82` nền CTA | `#f26522` → `#a63b00` | `#ffffff` | `3.153:1` | `6.468:1` | `4.5:1` — nền nút, chữ trắng `16px` semibold |
| `src/domains/job-board/components/apply-modal.tsx` | `184` nền nút Gửi | `#f26522` → `#a63b00` | `#ffffff` | `3.153:1` | `6.468:1` | `4.5:1` — nền nút, chữ trắng trên panel `--color-surface` |
| `src/domains/job-board/components/success-modal.tsx` | `88` nền nút Sao chép mã | `#f26522` → `#a63b00` | `#ffffff` | `3.153:1` | `6.468:1` | `4.5:1` — nền nút, chữ trắng `12px` semibold, nằm trong hộp `#e3e2e0` |
| `src/domains/job-board/components/success-modal.tsx` | `107` link `TRACKING_URL` | `#e3e2e0` | `#f26522` → `#a63b00` | `2.436:1` | `4.996:1` | `4.5:1` — chữ `14px` mono trên HỘP TRONG `--color-surface-variant`, KHÔNG phải `#ffffff` |
| `src/domains/job-board/components/success-modal.tsx` | `115` chữ Sao chép link | `#e3e2e0` | `#f26522` → `#a63b00` | `2.436:1` | `4.996:1` | `4.5:1` — chữ `12px` semibold trên `--color-surface-variant` |
| `src/domains/job-board/components/success-modal.tsx` | `115` VIỀN Sao chép link | `#e3e2e0` | `#f26522` → `#a63b00` | `2.436:1` | `4.996:1` | `3:1` — viền là thành phần giao diện. Đo trên nền THẬT: `EV-09` ghi `3.153:1` vì tính trên `#ffffff` của panel NGOÀI, nhưng nút này nằm trong hộp `#e3e2e0` ⇒ `2.436:1`, tức viền ĐÃ trượt `3:1`. Xem `DEV-03` |
| `src/domains/job-board/components/success-modal.tsx` | `138` nền nút Đóng | `#f26522` → `#a63b00` | `#ffffff` | `3.153:1` | `6.468:1` | `4.5:1` — nền nút, chữ trắng trên panel `--color-surface` |

Tổng: `21` dòng. Trượt trước khi sửa `17`. Đã đạt từ trước và chỉ đổi cho đồng bộ `4`. **Còn trượt sau khi sửa `0`.**

### `STEP-07` — ba lượt lane, cả lượt đỏ

Lane dùng đúng lệnh canonical `npm run test:unit` (`vitest run --config vitest.unit.config.ts`). Không lượt nào dùng `npx vitest run` trần.

| Lượt | Dòng tổng kết nguyên văn | Exit | Ghi chú |
|---|---|---|---|
| baseline (trước khi chạm mã) | `Tests  10 failed \| 1579 passed (1589)` | `1` | `10` test đã đỏ TRƯỚC khi task này chạm bất cứ gì — `evidence/step00b-preexisting-lane-full.txt` |
| `1` | `Test Files  3 failed \| 100 passed (103)` / `Tests  11 failed \| 1579 passed (1590)` / `Duration 21.78s` | `1` | `evidence/step07-lane-run1.txt` |
| `2` | `Tests  11 failed \| 1579 passed (1590)` | `1` | **Lượt này VÔ GIÁ TRỊ như một phép đo bản tôi giao**: nó đo một `app/globals.css` mà luồng khác đã ghi lại lúc `00:46:29`. Giữ lại để Tier 3 thấy vết, không xoá — `evidence/step07-lane-run2.txt` |
| `3` | `Test Files  1 failed \| 102 passed (103)` / `Tests  1 failed \| 1589 passed (1590)` | `1` | Lượt duy nhất được kẹp bằng `git hash-object` trước và sau, nên nêu được đích danh nội dung đã bị đo — `evidence/step07-lane-run3.txt` |

Test đỏ duy nhất còn lại: `src/domains/applications/marketplace-inventory.static.test.ts:350`, ngoài §4.2. Xem `DEV-01`.

## 4. Changed Deliverables

`git diff --cached HEAD --shortstat` trên đúng tám path §4.2 → `8 files changed, 166 insertions(+), 55 deletions(-)`. Đúng `8` path mã, không có path mã thứ `9`. (Ngoài tám path này, INDEX còn `22` path văn bản của chính task — `HANDOFF.md` và `21` artifact `evidence/` — xem nhóm B ở §0 và `DEV-09`.)

| Tệp | `+` | `-` | Đã làm gì |
|---|---|---|---|
| `app/globals.css` | `11` | `1` | Chỉ ba khối `.hrp-btn-primary` (nghỉ, `:hover:not(:disabled)`, `:active:not(:disabled)`). `0` dòng thêm nằm ngoài ba khối đó, `0` dòng chạm `@theme` |
| `app/components/GlobalNavbar.tsx` | `78` | `29` | Avatar, hover handler, hai pill vai trò, ba `aria-hidden`, cộng helper `activeNavHref` và trạng thái ĐANG Ở với dấu hiệu không-màu |
| `app/(jobs)/track/page.tsx` | `4` | `4` | Nền nút Tra cứu; bỏ `outlineColor`, chuyển sang `.hrp-focus` |
| `app/(jobs)/viec-lam/[slug]/page.tsx` | `3` | `3` | Link Quay lại `:107`, pill trạng thái `:124`, số còn tuyển `:170` |
| `app/(portal)/ve-chung-toi/page.tsx` | `2` | `2` | `<em>` tiêu đề `:62`, nền CTA `:82` |
| `src/domains/job-board/components/apply-modal.tsx` | `1` | `1` | Nền nút Gửi `:184` |
| `src/domains/job-board/components/success-modal.tsx` | `4` | `4` | `:88`, `:107`, `:115`, `:138` |
| `src/domains/job-board/public-ui-premium.static.test.ts` | `63` | `11` | Siết hàng rào: hai helper mới, dòng NGHỉ trong `TEXT_PAIRS`, `UI_PAIRS` chuyển sang token thật, cặp cũ thành phép đếm `0`, một `it` mới đo nền hover hợp thành |

Nguyên văn diff của `app/globals.css` — chỗ mà `RQ-10` biến thành điều kiện BLOCK, nên tôi dán cả hunk header để Tier 3 không phải dựng lại lệnh:

```
@@ -306,7 +306,7 @@   .hrp-btn-primary {
-  background-color: var(--color-primary);
+  background-color: var(--color-primary-dark);
@@ -315,6 +315,13 @@   .hrp-btn-primary:hover:not(:disabled) {
+  (6 dòng chú thích)
+  background-image: linear-gradient(rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.1));
@@ -323,6 +330,9 @@   .hrp-btn-primary:active:not(:disabled) {
+  (2 dòng chú thích)
+  background-image: none;
```

Bản đầy đủ, không lược: `evidence/step08-globals-diff-verbatim.txt`.

Bốn tệp của luồng khác — `git status --porcelain` in ` M` (dấu cách rồi `M`), tức đã sửa nhưng CHƯA stage, đúng nguyên trạng lúc tôi nhận việc:

```
 M docs/tasks/hrp-v5-go-live-02-public-surface-exposure/AUDIT.md
 M docs/tasks/hrp-v5-go-live-04-public-read-rls-closure/AUDIT.md
 M docs/tasks/hrp-v5-go-live-13-tracking-pii-mask/AUDIT.md
 M public/index.html
```

`git log --oneline -1` → `846ba0e docs(go-live-16): contract tương phản và vòng focus cho bề mặt nội bộ`. Đây là commit của Tier 1, không phải của tôi.

## 5. Deviations and Ambiguities

| ID | Loại | Bằng chứng | Ảnh hưởng | Quyết định cần từ Planner |
|---|---|---|---|---|
| `DEV-01` | **Xung đột contract thật — `AC-13` bất khả đạt cùng lúc với `AC-15`** | `src/domains/applications/marketplace-inventory.static.test.ts:348-355` ghim `expect(code).toContain("backgroundColor: 'var(--color-primary)'")` trên `app/(jobs)/track/page.tsx` — đúng cái nút mà `RQ-03` buộc đổi sang `--color-primary-dark`. Đây là test đỏ DUY NHẤT còn lại ở lượt lane thứ `3` | `AC-13` đòi exit `0`. §4.2 xếp "mọi test khác ngoài tệp số 8" vào cột Cấm chạm, và `AC-15` đòi tệp đổi ⊆ §4.2. Thoả `AC-13` thì vi phạm `AC-15`, và ngược lại. Tôi chọn giao đủ `RQ-03`, để test ngoài phạm vi đỏ, và KHÔNG ghi PASS cho `AC-13` | Cho phép sửa đúng MỘT dòng `:350` thành `expect(code).toContain("backgroundColor: 'var(--color-primary-dark)'")`. Ý định của test ấy là "nút có nền đặc, nhìn thấy được", còn tên token chỉ là proxy đã cũ — nên sửa dòng đó KHÔNG làm yếu hàng rào. Hai lựa chọn khác: mở rộng §4.2 thêm tệp này, hoặc chấp nhận `AC-13` là `PARTIAL` với ghi chú |
| `DEV-02` | **Một luồng khác ghi vào `app/globals.css` trong lúc tôi đang làm, hai lần, một lần xoá sạch phần tôi sửa** | Ba mốc đo được: lúc `00:39:16` cả `app/globals.css` và `public-ui-premium.static.test.ts` bị ghi về đúng nội dung `HEAD`, phần tôi sửa mất hết — tôi phát hiện vì `grep -n "expect(movers).toEqual"` trả `611` trong khi vài phút trước nó ở `663`. Lúc `00:46:29` một bảng màu khác được ghi ĐÈ lên bản tôi vừa dựng lại (`--color-primary: #a63b00`, nền `#fff8f6` / `#fff1ec` / `#ffe9e2`, `29` token bị xoá). Đến `00:51:17` nó lại được rút đi. Cùng bảng màu ấy xuất hiện trong `scratch/gl16-scan.txt` (mtime `09-02 23:45`) và `scratch/gl16-remeasure.py` (`23:51`) | Mọi phép đo đọc worktree của hai tệp này trong khoảng `00:39`–`00:51` đều vô giá trị — lượt lane thứ `2` là một nạn nhân, tôi giữ nó lại làm vết. Tôi KHÔNG dọn dẹp gì của luồng khác, KHÔNG `restore`, KHÔNG sửa file nào của họ | Tôi không đề nghị gì về luồng kia — đó là việc của Tier 1. Nhưng xin lưu ý: `Modules` của contract go-live-16 KHÔNG liệt kê `app/globals.css`, nên những lần ghi đó nằm ngoài contract của chính luồng ấy. Nếu Tier 1 muốn xác nhận, hai artifact `scratch/gl16-scan.txt` và `scratch/gl16-remeasure.py` còn nguyên |
| `DEV-03` | **`EV-09` của contract đo trên nền SAI, và kết luận ngược** | `EV-09` viết viền "Sao chép link" là `3.153:1` và dặn không được ghi nó thành lỗi. Nhưng `success-modal.tsx:72-74` cho thấy nút ấy nằm TRONG một hộp `--color-surface-variant` `#e3e2e0`, không phải trên `#ffffff` của panel ngoài. Đo trên nền thật: `--color-primary` trên `#e3e2e0` = **`2.436:1`**, tức viền ĐÃ trượt ngưỡng `3:1` của thành phần giao diện | Không ảnh hưởng việc phải làm: sau khi sửa, con số là `4.996:1`, đạt cả `3:1` lẫn `4.5:1`, đo trên nền nào cũng đạt. Nhưng nó đảo chiều một mệnh đề của contract, nên tôi ghi ra thay vì im lặng đi theo | Xác nhận rằng `EV-09` sai ở phần premise (nền `#ffffff`), và ghi nhận `2.436:1` là số đúng cho hiện trạng. Không cần đổi việc |
| `DEV-04` | **Ba chỗ tôi tự quyết là trong phạm vi, dù không `RQ` nào gọi tên** | `viec-lam/[slug]/page.tsx:124` (pill trạng thái, `2.848:1`), `viec-lam/[slug]/page.tsx:170` (số còn tuyển, `2.843:1`), `ve-chung-toi/page.tsx:82` (nền CTA, `3.153:1`) | Cả ba nằm trong tệp §4.2 cho phép chạm, cùng đúng một lớp lỗi, và không mệnh đề nào của §4.2 loại chúng ra. Bỏ chúng lại thì cùng một trang có chỗ đạt chỗ trượt. Tổng ảnh hưởng: `3` trên `21` dòng của bảng `AC-14` | Xác nhận ba chỗ này thuộc phạm vi. Nếu Tier 1 muốn giữ chúng nguyên, tôi hoàn nguyên được bằng ba dòng, không đụng gì khác |
| `DEV-05` | **Cùng lỗi, ngoài phạm vi, không ai đang cầm** | `src/domains/job-board/components/detail-apply-cta.tsx:50` đặt `backgroundColor: 'var(--color-primary)'` cho một nút chữ trắng ⇒ `3.153:1`. Tệp này KHÔNG nằm trong `8` path §4.2, và cũng KHÔNG nằm trong `Modules` của go-live-16 | Bề mặt công khai vẫn còn một nút trượt AA sau khi task này đóng. Tôi KHÔNG chạm | Mở một contract nhỏ, hoặc thêm tệp này vào §4.2 của round sau. Sửa nó là một dòng |
| `DEV-06` | Số dòng contract dẫn đã dịch | Contract dẫn số dòng theo baseline. Tôi thêm helper `activeNavHref` và markup `aria-current`, nên `GlobalNavbar.tsx` dịch xuống. Bản đồ: avatar `26-36` → `35-48`; hover handler `112` → `143`; pill desktop `161` → `197`; pill mobile `264` → `313`; ba icon `143` / `179` / `189` → `176` / `215` / `225` | Nếu Tier 3 mở đúng số dòng contract viết thì sẽ thấy code khác và tưởng chưa sửa | Không cần quyết định. Bản đồ đầy đủ ở `evidence/step08-linemap.txt`. Hai số contract dẫn KHÔNG dịch, cố ý: `movers` vẫn ở `:611` và ba phép đếm navbar vẫn ở `:302-308` của tệp test |
| `DEV-07` | **Cách phân định hunk của tôi khỏi hunk của luồng khác, cho `AC-01` / `AC-02` / `AC-10`** | `evidence/step08-delivered-vs-head.txt` so khối `@theme` ba bên: `HEAD` = `4133` ký tự / `76` token; INDEX (bản tôi giao) = `4133` ký tự / `76` token, `0` thêm `0` mất, `--color-primary` `#f26522`, `--color-background` `#faf9f7`; bản của luồng khác lúc `00:46:29` = `2176` ký tự / `56` token, `29` token bị xoá, hai giá trị trên đều bị đổi | `RQ-10` nói một dòng token đổi giá trị là BLOCK toàn task. Nếu Tier 3 đo worktree ở thời điểm sai, task này bị BLOCK vì việc của người khác | Không cần quyết định, chỉ cần phương pháp: **đo `AC-10` trên `git diff --cached HEAD -- app/globals.css`**, không đo worktree. Hiện tại `git hash-object app/globals.css` = `7857401…` = đúng hash trong index, nên worktree đang trùng bản tôi giao — nhưng điều đó có thể đổi bất cứ lúc nào |
| `DEV-08` | Đánh đổi có chủ ý: `background-image` không nằm trong allowlist chuyển động của go-live-08 | `RQ-23` của go-live-08 liệt kê `transform, box-shadow, background-color, border-color` trong `transition-property`. Tôi thêm lớp trạng thái bằng `background-image`, mà thuộc tính này không có trong danh sách đó | Lớp trạng thái hover xuất hiện tức thời trong khi `transform` và `box-shadow` vẫn chuyển mượt. Về mắt thường gần như không thấy vì lớp phủ chỉ `10%` | Tôi cố ý KHÔNG thêm `background-image` vào `transition-property`, vì đó là sửa một dòng mà go-live-08 đang ghim và sẽ làm đỏ test chuyển động của 08. Nếu Tier 1 muốn mượt hoàn toàn thì cần một contract cho phép chạm dòng ấy |
| `DEV-09` | **Lệch khỏi nếp thường: mọi thứ tôi giao đang ở trạng thái STAGED** | `evidence/step08-ac15-scope-final.txt` và `evidence/step08-antitruncation-stage.txt`. Lý do là `DEV-02`: sau khi mất trắng phần sửa một lần lúc `00:39:16`, tôi áp luật chống-cắt-file (vốn chỉ viết cho `AUDIT.md`) sang cả mã sản phẩm. INDEX gồm `8` path mã §4.2, cộng `22` path văn bản của chính task (`HANDOFF.md`, `21` artifact `evidence/`), trong đó có ba bản copy từng byte: `copy-globals-css-round1.css`, `copy-public-ui-premium-static-test-round1.ts`, `copy-handoff-round1.md` | `git diff` trần ra RỖNG. Đây là cái bẫy đo lớn nhất của bản giao này. Không path nào ngoài hai nhóm trên bị `add`: `git add -A` và `git add .` KHÔNG được dùng lần nào | Xác nhận rằng `git add` (không `commit`) là cách xử đúng trong tình huống bị ghi đè, hoặc chỉ cho tôi cách khác. Không có commit nào được tạo: `git log --oneline -1` vẫn là `846ba0e` của Tier 1 |
| `DEV-10` | `HEAD` đã tiến lên trong lúc tôi làm | Contract ghi `Baseline 397b026`. `HEAD` hiện tại là `846ba0e` (`docs(go-live-16)`). Tôi đã kiểm: blob của cả hai tệp tôi đo theo `HEAD` giống **từng byte** qua cả `397b026`, `f911cd3` và `846ba0e` (`app/globals.css` = `9b9d63f8…`, tệp test = `10b7dea9…`) | Mọi phép đo "so với `HEAD`" trong văn bản này vẫn đúng khi đối chiếu với `Baseline` của contract | Không cần quyết định. Ghi ra để Tier 3 không phải tự chứng minh lại điều này |

Hai điều nữa, không phải deviation, chỉ là xác nhận ba cảnh báo §7 mà Owner dặn:

- **Lane**: cả ba lượt đều là `npm run test:unit`. Không lượt nào là `npx vitest run` trần. Không có bằng chứng nào trong văn bản này lấy từ lane trần.
- **Avatar không được nhận `.hrp-btn-primary`**: số lần chuỗi `hrp-btn-primary` trong `GlobalNavbar.tsx` là `2` ở `HEAD` và vẫn `2` ở bản tôi giao; trong khối avatar (`:35-52`) chuỗi ấy xuất hiện `0` lần. Tôi chỉ đổi giá trị `backgroundColor` inline. Cặp `hrp-btn-primary hrp-focus nav-item-lift` mà test `:617-627` ghim vẫn xuất hiện `2` lần, nguyên vẹn — `evidence/step08-ac02-ac10-battery.txt`.
- **`@theme`**: `0` dòng token đổi giá trị, `0` token thêm, `0` token mất, trong bản tôi giao. Xem `DEV-07` cho cách đo đúng.

## 6. Evidence Index

`ls evidence/` ra `21` file. `19` trong số đó là bằng chứng của AC, liệt kê trong bảng dưới. Hai file còn lại KHÔNG phải bằng chứng của AC nào:

- `evidence/copy-handoff-round1.md` — bản sao từng byte của chính văn bản này theo luật chống-cắt-file (`git hash-object` hai bên bằng nhau, `5dffb43c…` lúc ghi lần đầu).
- `evidence/step08-ac15-scope-final.txt` — ảnh chụp phạm vi INDEX sau khi mọi thứ đã `git add`, tức bằng chứng của `AC-15` ở dạng CUỐI. Nó sinh ra sau bảng dưới đây nên tự nó cũng có mặt trong phép đếm `21`.

| Bằng chứng | Path | Chứng minh |
|---|---|---|
| Đỏ có sẵn ở baseline | `evidence/step00-preexisting-red-probe.txt` | `10` test đã đỏ TRƯỚC khi task chạm mã — mốc để trừ ra khi đọc `AC-13` |
| Lane baseline đầy đủ | `evidence/step00b-preexisting-lane-full.txt` | `Tests 10 failed \| 1579 passed (1589)` trên mã chưa chạm |
| Biến CSS chết | `evidence/step00c-dead-vars.txt` | Nhóm token không `.tsx` nào dùng — dùng để tránh sửa vào chỗ `0` pixel đổi |
| Biến chết, liệt kê từng cái | `evidence/step07-deadvars-enumerated.txt` | Bản liệt kê chi tiết của cùng phép trên, sau khi sửa |
| **Bảng tương phản `21` dòng** | `evidence/step06-contrast-table.txt` | `AC-14`, và cả phần đối chứng công thức: `11 / 11` số của §6 contract được dựng lại, lệch lớn nhất `0.0000` |
| Lane lượt `1` | `evidence/step07-lane-run1.txt` | Lượt đỏ đầu: `Tests 11 failed \| 1579 passed (1590)`, `LANE_EXIT=1` |
| Lane lượt `2` | `evidence/step07-lane-run2.txt` | Lượt đỏ thứ hai — giữ nguyên làm VẾT: nó đo một `globals.css` mà luồng khác đã ghi lại, xem `DEV-02` |
| **Lane lượt `3`** | `evidence/step07-lane-run3.txt` | `AC-13`: `Test Files 1 failed \| 102 passed (103)`, `Tests 1 failed \| 1589 passed (1590)`, `LANE_EXIT=1`. Được kẹp bằng `git hash-object` trước và sau nên nêu đích danh nội dung đã bị đo |
| Khẳng định của tôi trên token của `HEAD` | `evidence/step07-my-assertions-under-head-tokens.txt` | `AC-11` và `AC-12`: `16 / 16` PASS, `SO KHANG DINH FAIL = 0`, `MY_ASSERT_EXIT=0`; `movers` ra đúng hai phần tử; `hexOf('--color-primary')` vẫn `#f26522` |
| Battery `AC-02` / `AC-10` | `evidence/step08-ac02-ac10-battery.txt` | `0` dòng thêm khai báo token mới, `0` dòng thêm chứa `transform`, `0` dòng thêm mở selector mới; `hrp-btn-primary` trong navbar `2` ở cả hai bên, `0` lần trong khối avatar |
| Battery `AC-07` / `AC-08` / `AC-09` | `evidence/step08-ac0709-battery.txt` | `outlineColor` `0` dòng, `2` control `.hrp-focus`, `3 / 3` icon `aria-hidden`, `SO ICON THIEU = 0`, `aria-current` ở `:136` và `:282`, dấu hiệu không-màu ở `:139` và `:285` |
| Phạm vi `AC-15` | `evidence/step08-ac15-scope.txt` | `0` commit mới, tệp đổi ⊆ §4.2, bốn tệp của luồng khác vẫn ` M` chưa stage |
| Dấu vết chống cắt file | `evidence/step08-antitruncation-stage.txt` | `DEV-09`: đúng `8` path được `git add`, không có path thứ `9` |
| **`@theme` ba bên** | `evidence/step08-delivered-vs-head.txt` | `AC-10` và `DEV-07`: `HEAD` `4133` / `76` == INDEX `4133` / `76`, so với bản của luồng khác `2176` / `56` với `29` token bị xoá |
| Diff `globals.css` nguyên văn | `evidence/step08-globals-diff-verbatim.txt` | `AC-01` và `AC-02`: cả ba hunk, `+11 / -1`, cùng ba phép đếm `0` |
| Bản đồ số dòng | `evidence/step08-linemap.txt` | `DEV-06`: từng số dòng contract dẫn → số dòng hiện tại |
| Gate contract | `evidence/step08-verify-task.txt` | `C-09` của Tier 3: `RESULT: PASS. TASK contract is ready for execution.`, exit `0` |
| Bản sao chống cắt: CSS | `evidence/copy-globals-css-round1.css` | Bản sao từng byte của `app/globals.css` tôi giao — cứu được nếu worktree bị ghi đè lần nữa |
| Bản sao chống cắt: test | `evidence/copy-public-ui-premium-static-test-round1.ts` | Bản sao từng byte của tệp test tôi giao |

## 7. Execution Round History

| Round | Spec version | Status | Tóm tắt |
|---|---|---|---|
| 1 | `v1.0` | `READY_FOR_AUDIT` | Sửa `21` chỗ tương phản trên `7` tệp mã cộng `1` tệp test, `17` chỗ trượt ngưỡng trước khi sửa còn `0` sau khi sửa. Cách sửa nằm ở điểm dùng, khối `@theme` giống `HEAD` từng byte. Hàng rào được siết đúng điểm mù của go-live-08. `14 / 15` AC có bằng chứng đạt; `AC-13` KHÔNG đạt vì `1` test NGOÀI §4.2 ghim tên token cũ ở đúng chỗ `RQ-03` buộc đổi — trình phương án sửa một dòng ở `DEV-01`. Hai tệp trong phạm vi từng bị luồng khác ghi đè mất một lần, đã dựng lại và `git add` theo luật chống cắt file. Không commit, không push, không deploy |

> Handoff status: READY_FOR_AUDIT
