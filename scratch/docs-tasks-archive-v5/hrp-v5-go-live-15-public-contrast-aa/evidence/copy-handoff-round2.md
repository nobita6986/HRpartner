# HANDOFF — `hrp-v5-go-live-15-public-contrast-aa`

## 0. Control

| Trường | Giá trị |
|---|---|
| Task | `hrp-v5-go-live-15-public-contrast-aa` |
| Spec version đã thực thi | `v1.1` (round `1` chạy trên `v1.0`; contract bump ở `663053c`) |
| TASK status khi nhận | `READY_FOR_EXECUTION` |
| Execution round | `2` |
| Baseline của contract | `397b026` |
| `HEAD` lúc bàn giao | `663053c` (bản bump `v1.1` của chính Tier 1; tiến lên không do tôi — xem `DEV-10`) |
| Tier | 2 — Engineer |
| Commit mới do Tier 2 tạo | `0` |
| Push | `0` |
| Deploy | `0` |
| Handoff status | `READY_FOR_AUDIT` |

Ba điều KHÔNG, theo `R-01`: **không commit, không push, không deploy**. `git log --oneline -1` vẫn là commit của người khác.

Một điều Tier 3 phải biết trước khi đo bất cứ thứ gì: **mọi thứ tôi giao đều đang ở trạng thái STAGED** (chỉ `git add`, không `commit`) theo luật chống-cắt-file, sau khi hai tệp trong phạm vi bị một luồng khác ghi đè về nội dung `HEAD` lúc `00:39:16` và xoá sạch phần tôi sửa. Hệ quả cơ học: **`git diff` trần sẽ ra RỖNG**. Muốn thấy bản tôi giao phải dùng `git diff HEAD` hoặc `git diff --cached`.

`git diff --cached HEAD --name-only` ra `42` path, chia đúng ba nhóm và không có nhóm thứ tư:

| Nhóm | Số path | Là gì |
|---|---|---|
| A — mã sản phẩm và test trong phạm vi | `8` | Đúng danh sách §4.2, không hơn một path |
| A2 — **một tệp ngoài §4.2 do `DEC-21` mở** | `1` | `src/domains/applications/marketplace-inventory.static.test.ts`, đúng `1` dòng (`+1 / -1`) — việc của round `2` |
| B — văn bản của chính task này | `33` | `HANDOFF.md` cộng `32` artifact dưới `evidence/`, tức thứ mà `STEP-08` buộc tôi tạo |

Bằng chứng phân loại: `evidence/r2-step10-scope-final.txt` (bản cuối của round `2`), `evidence/step08-ac15-scope-final.txt` (bản của round `1`, khi tổng còn `30`). Chi tiết ở `DEV-02` và `DEV-09`.

Tôi đã đọc lại `TASK.md` ngay trước khi làm việc của round `2` và một lần nữa trước khi viết văn bản này. **Có bump**: `v1.0` → `v1.1` ở commit `663053c`, và tôi đã đọc nguyên văn `git diff 846ba0e 663053c -- TASK.md` (`9` dòng thêm, `6` dòng xoá) chứ không đọc lại mô tả của người khác. Năm chỗ đổi: `DEC-21` là điều khoản MỚI, `EV-09` được viết lại, §4.2 thêm một ngoại lệ, `AC-10` chuyển sang đo trên INDEX, `AC-13` và `AC-15` được nới đúng bằng một tệp.

Hai thứ KHÔNG đổi trong bump ấy, và tôi ghi ra để Tier 3 không phải tự kiểm: `Baseline` vẫn `397b026`, và `Current execution round` vẫn ghi `0` trong khi round thực tế đã là `2` — đó là trường của Tier 1, tôi không sửa văn bản contract. `git status --porcelain -- TASK.md` ra `0` dòng, tức tôi không chạm vào nó.

## 1. Outcome Summary

Task này sửa một lớp lỗi tương phản trên bề mặt công khai, mà gốc của nó là điểm mù của go-live-08: bảng `TEXT_PAIRS` của 08 chỉ liệt kê những cặp màu do CHÍNH 08 sinh ra, nên cặp màu ở trạng thái NGHỈ của `.hrp-btn-primary` — vốn có trước 08 — chưa từng bị đo. Suite xanh `100%` trong khi cái nút chính của cả sản phẩm nằm ở `3.153:1`, tức trượt AA cho chữ thường.

**`15` trên `15` AC có bằng chứng ĐẠT sau round `2`.** Round `1` đóng ở `14 / 15` với `AC-13` KHÔNG đạt: lane canonical dừng ở `LANE_EXIT=1`, còn đúng `1` test đỏ trên `1590`. Test đỏ đó nằm **ngoài** §4.2 (`src/domains/applications/marketplace-inventory.static.test.ts:350`) và nó đỏ **vì chính `RQ-03`**: nó ghim mặt chữ `backgroundColor: 'var(--color-primary)'` ở đúng cái nút mà `RQ-03` buộc tôi đổi. §4.2 xếp "mọi test khác ngoài tệp số 8" vào cột Cấm chạm, nên `AC-13` là bất khả đạt cùng lúc với `AC-15` — tôi giao đủ `RQ-03`, để test ngoài phạm vi đỏ, KHÔNG ghi PASS cho `AC-13`, và trình phương án sửa một dòng cho Tier 1 quyết ở `DEV-01`.

Tier 1 đã đọc, nhận cả `DEV-01` lẫn `DEV-03`, và bump contract lên `v1.1` (`663053c`) với `DEC-21` mở đúng một dòng ngoài §4.2. Round `2` làm đúng một dòng đó và không gì khác: `src/domains/applications/marketplace-inventory.static.test.ts:350`, `+1 / -1`, `0` test thêm / xoá / đổi tên. Lane canonical lượt `4` đóng ở `Test Files  103 passed (103)`, `Tests  1590 passed (1590)`, `LANE_EXIT=0`. Tổng test `1590` = `1590` giữa lượt `3` và lượt `4`, nên con số xanh ấy không mua được bằng cách bỏ test nào.

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
| `R2-00` | Round `2`. Đọc lại `TASK.md` `v1.1` và đọc nguyên văn `git diff 846ba0e 663053c -- TASK.md` thay vì tin mô tả; rồi tự kiểm tiền đề của lệnh round `2` về `app/globals.css` | Bump có thật, `9` thêm / `6` xoá, năm chỗ đổi. Tiền đề về bảng token lạ KHÔNG còn đúng lúc đo — `evidence/r2-step00-globals-premise.txt`, `DEV-11` |
| `R2-01` | Bắt biến tệp `DEC-21` mở, xác nhận `var(--color-primary)` xuất hiện đúng `1` lần trong cả tệp nên phép thay là không nhập nhằng, rồi sửa đúng dòng `350` bằng `sed -i "350s/.../.../"` | `numstat` `1  1`; `393` → `393` dòng; `it(` `26` → `26`; `describe(` `5` → `5` — `evidence/r2-step01-dec21-oneline.txt` |
| `R2-02` | Đo lại `AC-10` bằng đúng ba lệnh mà `v1.1` chỉ định, và kiểm luôn cái bẫy nó cảnh báo | `git diff --cached` == `git diff HEAD` (`37` dòng), `git diff` trần `0` dòng — `evidence/r2-step02-ac10-index.txt` |
| `R2-03` | `HEAD` đã tiến lên lần hai. Đo blob ba tệp trên bốn commit để biết phép đo "so với `HEAD`" còn đúng với `Baseline` không | `Baseline == HEAD` từng byte; phát hiện một câu của round `1` về `f911cd3` là SAI và tự sửa — `evidence/r2-step03-head-moved-again.txt`, `DEV-10` |
| `R2-04` | Chạy lane lượt `4`, kẹp `git hash-object` `9` tệp trước và sau, lấy exit bằng redirect rồi `echo $?` | `Tests  1590 passed (1590)`, `LANE_EXIT=0`; hash hai đầu giống nhau — `evidence/r2-step07-lane-run4.txt`, `-run4-integrity.txt` |
| `R2-05` | Chạy lại gate cấu trúc contract trên `v1.1` cho `C-09` của Tier 3, cập nhật văn bản này, `git add` ngay cộng bản copy | `VERIFY_TASK_EXIT=0` — `evidence/r2-step08-verify-task-v11.txt` |

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
| `AC-10` | Đúng ba lệnh mà `v1.1` chỉ định: `git diff --cached app/globals.css`, `git diff HEAD -- app/globals.css`, `rg -n -- "--color-primary:" app/globals.css`. Cộng phép so khối `@theme` ba bên (`HEAD` / INDEX / WORKTREE) bằng số ký tự, số token và giá trị từng token, cộng phép đếm dòng thêm khai báo `--ten:` trên cả tám tệp | **INDEX giống `HEAD` từng byte**: `4133` ký tự, `76` token, `0` token thêm, `0` token mất, `--color-primary` vẫn `#f26522`, `--color-background` vẫn `#faf9f7`. Dòng THÊM khai báo tên token mới trên cả tám tệp `= 0` | `evidence/r2-step02-ac10-index.txt` (đo lại bằng đúng ba lệnh của `v1.1`), `evidence/step08-delivered-vs-head.txt`, `evidence/step08-ac02-ac10-battery.txt` | **Phải đo trên INDEX, không phải trên worktree**, và cái bẫy `v1.1` cảnh báo đã xảy ra đúng như dự báo: `git diff -- app/globals.css` TRẦN ra `0` dòng, vì mọi thứ tôi giao đang staged. Ở round `2`, `git diff HEAD` và `git diff --cached` ra output GIỐNG NHAU từng dòng (`37` dòng), tức worktree đang trùng bản tôi giao và **không còn bảng token của luồng khác** — xem `DEV-11`. Bản của luồng khác từng xuất hiện tối `02/09` (`2176` ký tự, `56` token, `29` token bị xoá) đã được rút đi — xem `DEV-07` |
| `AC-11` | Đọc hai bảng trong tệp test, rồi chạy lại chính các khẳng định đó trên giá trị token của `HEAD` | `TEXT_PAIRS` có dòng MỚI `['.hrp-btn-primary nghỉ', '--color-on-primary', '--color-primary-dark']` (`6.468` ≥ `4.5`) cộng dòng hover được đổi nhãn cho đúng. `UI_PAIRS`: dòng nút chuyển sang `--color-primary-dark` so với `--color-surface` (`6.468`) và thêm dòng so với `--color-background` (`6.147`), cả hai ≥ `3`. Cặp cũ thành phép đếm `count(newCssCode, 'var(--color-primary)') === 0` | `evidence/step07-my-assertions-under-head-tokens.txt` — `16 / 16` PASS, `SO KHANG DINH FAIL = 0`, `MY_ASSERT_EXIT=0` | Không |
| `AC-12` | `grep -n "expect(movers).toEqual"` và so ba phép đếm navbar với blob `HEAD` | `movers` vẫn ở **dòng `611`**, KHÔNG bị tôi sửa. Ba phép đếm navbar ở `:302-308` giống `HEAD` từng byte. Toàn bộ tệp test số `8` xanh ở lượt lane thứ `3`, nghĩa là cả `movers` lẫn ba phép đếm ấy tự xanh trên mã mới chứ không cần nới | `evidence/step07-lane-run3.txt`, `evidence/step07-my-assertions-under-head-tokens.txt` mục `movers` (đúng hai phần tử `.hrp-card:hover` và `.hrp-btn-primary:hover:not(:disabled)`) | Không |
| `AC-13` | `npm run test:unit > evidence/r2-step07-lane-run4.txt 2>&1; echo "LANE_EXIT=$?"` | **ĐẠT.** Nguyên văn hai dòng tổng kết: `Test Files  103 passed (103)` và `Tests  1590 passed (1590)`, cộng `LANE_EXIT=0`. Dòng tổng kết của vitest KHÔNG có đoạn `failed` khi không còn test đỏ — tôi dán đúng mặt chữ nó in ra chứ không tự dựng lại thành `0 failed` | `evidence/r2-step07-lane-run4.txt` (kẹp bằng `git hash-object` trước và sau), `evidence/r2-step07b-lane-run4-integrity.txt`, `evidence/r2-step01-dec21-oneline.txt` | Ba điều kiện đo mà `AC-13` bản `v1.1` đặt ra, kiểm từng cái: (a) exit lấy bằng REDIRECT rồi `echo $?` NGAY sau lệnh, không qua pipe, nên không bị `\| tail` ăn mất; (b) đạt exit `0` bằng ĐÚNG một dòng mà `DEC-21` mở, không bằng cách nào khác — `git diff --cached HEAD --numstat` trên tệp ấy ra `1  1`, số `it(` `26` → `26`, số `describe(` `5` → `5`, tổng test `1590` = `1590` giữa lượt `3` và lượt `4`; (c) hash trước và sau lượt chạy giống nhau từng dòng trên cả `9` tệp, nên không tệp nào bị luồng khác ghi giữa lúc đo. Số học bốn lượt ở bảng `STEP-07` dưới đây |
| `AC-14` | Bảng `7` cột, ngưỡng suy từ cỡ chữ thật của từng phần tử | `21` dòng. Trước khi sửa: `17` dòng TRƯỢT ngưỡng của chính nó. Sau khi sửa: `0` dòng trượt | Bảng đầy đủ ngay dưới đây; nguồn `evidence/step06-contrast-table.txt` | Không |
| `AC-15` | `git status --porcelain`, `git log --oneline -1`, `git diff --cached HEAD --name-only` rồi phân loại từng path | `0` commit mới do Tier 2 (`git log --oneline -1` vẫn là `663053c` của Tier 1). `42` path trong INDEX, phân loại: `8` path mã = đúng danh sách §4.2 không hơn một path, `1` path mã NGOÀI §4.2 = đúng tệp mà `DEC-21` mở và đúng `1` dòng trong tệp đó, `33` path văn bản của chính task này. Nhóm thứ tư `0` path. Đây đúng là tập `v1.1` cho phép: "§4.2 CỘNG đúng một tệp mà `DEC-21` mở". Ba `AUDIT.md` của luồng khác và `public/index.html` in ra ` M` (dấu cách rồi `M`) — đã sửa nhưng CHƯA stage, tức KHÔNG bị tôi stage, sửa hay `restore`, đúng nguyên trạng lúc tôi nhận việc | `evidence/r2-step10-scope-final.txt` (bản cuối của round `2`), `evidence/r2-step01-dec21-oneline.txt` (chứng minh tệp `DEC-21` chỉ đổi `1` dòng), `evidence/step08-ac15-scope-final.txt`, `evidence/step08-ac15-scope.txt`, `evidence/step08-antitruncation-stage.txt` | Mọi thứ tôi giao đang STAGED chứ không phải dirty thuần — cố ý, xem `DEV-09` |

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

### `STEP-07` — bốn lượt lane, cả lượt đỏ

Lane dùng đúng lệnh canonical `npm run test:unit` (`vitest run --config vitest.unit.config.ts`). Không lượt nào dùng `npx vitest run` trần.

| Lượt | Dòng tổng kết nguyên văn | Exit | Ghi chú |
|---|---|---|---|
| baseline (trước khi chạm mã) | `Tests  10 failed \| 1579 passed (1589)` | `1` | `10` test đã đỏ TRƯỚC khi task này chạm bất cứ gì — `evidence/step00b-preexisting-lane-full.txt` |
| `1` | `Test Files  3 failed \| 100 passed (103)` / `Tests  11 failed \| 1579 passed (1590)` / `Duration 21.78s` | `1` | `evidence/step07-lane-run1.txt` |
| `2` | `Tests  11 failed \| 1579 passed (1590)` | `1` | **Lượt này VÔ GIÁ TRỊ như một phép đo bản tôi giao**: nó đo một `app/globals.css` mà luồng khác đã ghi lại lúc `00:46:29`. Giữ lại để Tier 3 thấy vết, không xoá — `evidence/step07-lane-run2.txt` |
| `3` | `Test Files  1 failed \| 102 passed (103)` / `Tests  1 failed \| 1589 passed (1590)` | `1` | Cuối round `1`. Được kẹp bằng `git hash-object` trước và sau, nên nêu được đích danh nội dung đã bị đo — `evidence/step07-lane-run3.txt` |
| **`4`** | `Test Files  103 passed (103)` / `Tests  1590 passed (1590)` / `Duration 23.69s` | **`0`** | Round `2`, sau khi áp `DEC-21`. Cũng được kẹp `git hash-object` trước và sau, và lần này hash hai đầu GIỐNG NHAU trên cả `9` tệp — `evidence/r2-step07-lane-run4.txt` |

Số học bốn lượt, đọc theo chiều dọc: baseline `10` đỏ + `1579` xanh = `1589` test. Lượt `1` là `11` đỏ + `1579` xanh = `1590`, tức `9` trong `10` test đỏ có sẵn đã tự xanh nhờ bản sửa, `1` test mới của tôi thêm vào tổng, và `2` test còn đỏ. Lượt `3` xuống `1` đỏ + `1589` xanh = `1590`. Lượt `4` là `103 / 103` tệp và `1590 / 1590` test, `LANE_EXIT=0`.

Tổng test **`1590` = `1590`** giữa lượt `3` và lượt `4` là con số đáng đọc nhất ở đây: nó chứng minh `DEC-21` không thêm test, không xoá test và không đổi tên test — chỉ một chuỗi mong đợi trong một `it(` sẵn có được đổi. Test đỏ cuối cùng của round `1` là `src/domains/applications/marketplace-inventory.static.test.ts:350`; nay xanh. Xem `DEV-01`.

## 4. Changed Deliverables

`git diff --cached HEAD --shortstat` trên đúng tám path §4.2 → `8 files changed, 166 insertions(+), 55 deletions(-)`, không đổi so với round `1`. Round `2` KHÔNG chạm lại tám tệp đó: nó chỉ thêm một path mã thứ chín, là tệp mà `DEC-21` mở, và `--shortstat` riêng cho tệp ấy ra `1 file changed, 1 insertion(+), 1 deletion(-)`. (Ngoài chín path mã này, INDEX còn `33` path văn bản của chính task — `HANDOFF.md` và `32` artifact `evidence/` — xem nhóm B ở §0 và `DEV-09`.)

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
| **`src/domains/applications/marketplace-inventory.static.test.ts`** | `1` | `1` | **Ngoài §4.2, do `DEC-21` mở, việc của round `2`.** Dòng `350`: chuỗi mong đợi `backgroundColor: 'var(--color-primary)'` → `backgroundColor: 'var(--color-primary-dark)'`. Không dòng nào khác trong tệp đổi; `0` test thêm, `0` test xoá, `0` test đổi tên |

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

`git log --oneline -1` → `663053c docs(go-live-15): bump v1.1 — sửa ba lỗi contract do Tier 1 tự đo lại phát hiện`. Đây là commit của Tier 1, không phải của tôi; lúc bàn giao round `1` dòng này là `846ba0e`, xem `DEV-10`. Số commit do Tier 2 tạo = `0`.

## 5. Deviations and Ambiguities

| ID | Loại | Bằng chứng | Ảnh hưởng | Quyết định cần từ Planner |
|---|---|---|---|---|
| `DEV-01` | **ĐÃ ĐƯỢC GIẢI QUYẾT ở `v1.1` — xung đột contract thật, `AC-13` bất khả đạt cùng lúc với `AC-15`** | `src/domains/applications/marketplace-inventory.static.test.ts:348-355` ghim `expect(code).toContain("backgroundColor: 'var(--color-primary)'")` trên `app/(jobs)/track/page.tsx` — đúng cái nút mà `RQ-03` buộc đổi sang `--color-primary-dark`. Đây là test đỏ DUY NHẤT còn lại ở lượt lane thứ `3` | `AC-13` đòi exit `0`. §4.2 xếp "mọi test khác ngoài tệp số 8" vào cột Cấm chạm, và `AC-15` đòi tệp đổi ⊆ §4.2. Thoả `AC-13` thì vi phạm `AC-15`, và ngược lại. Tôi chọn giao đủ `RQ-03`, để test ngoài phạm vi đỏ, và KHÔNG ghi PASS cho `AC-13` | **Không còn cần quyết định gì.** Tier 1 đã chọn đúng phương án tôi đề xuất và viết nó thành `DEC-21` của `v1.1`, cộng ba lần nới kèm theo (§4.2 thêm một ngoại lệ, `AC-13` cho phép đạt exit `0` bằng đúng dòng ấy, `AC-15` cho phép §4.2 cộng đúng một tệp). Round `2` thực thi đúng phạm vi đó: `1` dòng, `+1 / -1`, `0` test thêm / xoá / đổi tên, lane đóng ở `LANE_EXIT=0`. Bằng chứng `evidence/r2-step01-dec21-oneline.txt` và `evidence/r2-step07-lane-run4.txt` |
| `DEV-02` | **Một luồng khác ghi vào `app/globals.css` trong lúc tôi đang làm, hai lần, một lần xoá sạch phần tôi sửa** | Ba mốc đo được: lúc `00:39:16` cả `app/globals.css` và `public-ui-premium.static.test.ts` bị ghi về đúng nội dung `HEAD`, phần tôi sửa mất hết — tôi phát hiện vì `grep -n "expect(movers).toEqual"` trả `611` trong khi vài phút trước nó ở `663`. Lúc `00:46:29` một bảng màu khác được ghi ĐÈ lên bản tôi vừa dựng lại (`--color-primary: #a63b00`, nền `#fff8f6` / `#fff1ec` / `#ffe9e2`, `29` token bị xoá). Đến `00:51:17` nó lại được rút đi. Cùng bảng màu ấy xuất hiện trong `scratch/gl16-scan.txt` (mtime `09-02 23:45`) và `scratch/gl16-remeasure.py` (`23:51`) | Mọi phép đo đọc worktree của hai tệp này trong khoảng `00:39`–`00:51` đều vô giá trị — lượt lane thứ `2` là một nạn nhân, tôi giữ nó lại làm vết. Tôi KHÔNG dọn dẹp gì của luồng khác, KHÔNG `restore`, KHÔNG sửa file nào của họ | Tôi không đề nghị gì về luồng kia — đó là việc của Tier 1. Nhưng xin lưu ý: `Modules` của contract go-live-16 KHÔNG liệt kê `app/globals.css`, nên những lần ghi đó nằm ngoài contract của chính luồng ấy. Nếu Tier 1 muốn xác nhận, hai artifact `scratch/gl16-scan.txt` và `scratch/gl16-remeasure.py` còn nguyên |
| `DEV-03` | **ĐÃ ĐƯỢC GIẢI QUYẾT ở `v1.1` — `EV-09` của contract đo trên nền SAI, và kết luận ngược** | `EV-09` viết viền "Sao chép link" là `3.153:1` và dặn không được ghi nó thành lỗi. Nhưng `success-modal.tsx:72-74` cho thấy nút ấy nằm TRONG một hộp `--color-surface-variant` `#e3e2e0`, không phải trên `#ffffff` của panel ngoài. Đo trên nền thật: `--color-primary` trên `#e3e2e0` = **`2.436:1`**, tức viền ĐÃ trượt ngưỡng `3:1` của thành phần giao diện | Không ảnh hưởng việc phải làm: sau khi sửa, con số là `4.996:1`, đạt cả `3:1` lẫn `4.5:1`, đo trên nền nào cũng đạt. Nhưng nó đảo chiều một mệnh đề của contract, nên tôi ghi ra thay vì im lặng đi theo | **Không còn cần quyết định gì.** `v1.1` đã viết lại `EV-09`: nó dẫn `success-modal.tsx:104-108` và `:112-118` cộng hộp bao quanh ở `:73`, ghi rõ hộp ấy dùng `--color-surface-variant` tức `#e3e2e0` chứ KHÔNG phải `#ffffff` của panel ngoài ở `:55`, nên viền đo `2.436:1` và ĐÃ trượt ngưỡng `3:1`; sau khi sửa đạt `4.996:1`. Cột ảnh hưởng của `EV-09` cũng được sửa thành "cả chữ lẫn viền đều trượt". Con số `2.436` và `4.996` trong bảng `AC-14` của tôi và con số trong `v1.1` khớp nhau |
| `DEV-04` | **Ba chỗ tôi tự quyết là trong phạm vi, dù không `RQ` nào gọi tên** | `viec-lam/[slug]/page.tsx:124` (pill trạng thái, `2.848:1`), `viec-lam/[slug]/page.tsx:170` (số còn tuyển, `2.843:1`), `ve-chung-toi/page.tsx:82` (nền CTA, `3.153:1`) | Cả ba nằm trong tệp §4.2 cho phép chạm, cùng đúng một lớp lỗi, và không mệnh đề nào của §4.2 loại chúng ra. Bỏ chúng lại thì cùng một trang có chỗ đạt chỗ trượt. Tổng ảnh hưởng: `3` trên `21` dòng của bảng `AC-14` | Xác nhận ba chỗ này thuộc phạm vi. Nếu Tier 1 muốn giữ chúng nguyên, tôi hoàn nguyên được bằng ba dòng, không đụng gì khác |
| `DEV-05` | **Cùng lỗi, ngoài phạm vi, không ai đang cầm** | `src/domains/job-board/components/detail-apply-cta.tsx:50` đặt `backgroundColor: 'var(--color-primary)'` cho một nút chữ trắng ⇒ `3.153:1`. Tệp này KHÔNG nằm trong `8` path §4.2, và cũng KHÔNG nằm trong `Modules` của go-live-16 | Bề mặt công khai vẫn còn một nút trượt AA sau khi task này đóng. Tôi KHÔNG chạm | Mở một contract nhỏ, hoặc thêm tệp này vào §4.2 của round sau. Sửa nó là một dòng |
| `DEV-06` | Số dòng contract dẫn đã dịch | Contract dẫn số dòng theo baseline. Tôi thêm helper `activeNavHref` và markup `aria-current`, nên `GlobalNavbar.tsx` dịch xuống. Bản đồ: avatar `26-36` → `35-48`; hover handler `112` → `143`; pill desktop `161` → `197`; pill mobile `264` → `313`; ba icon `143` / `179` / `189` → `176` / `215` / `225` | Nếu Tier 3 mở đúng số dòng contract viết thì sẽ thấy code khác và tưởng chưa sửa | Không cần quyết định. Bản đồ đầy đủ ở `evidence/step08-linemap.txt`. Hai số contract dẫn KHÔNG dịch, cố ý: `movers` vẫn ở `:611` và ba phép đếm navbar vẫn ở `:302-308` của tệp test |
| `DEV-07` | **Cách phân định hunk của tôi khỏi hunk của luồng khác, cho `AC-01` / `AC-02` / `AC-10`** | `evidence/step08-delivered-vs-head.txt` so khối `@theme` ba bên: `HEAD` = `4133` ký tự / `76` token; INDEX (bản tôi giao) = `4133` ký tự / `76` token, `0` thêm `0` mất, `--color-primary` `#f26522`, `--color-background` `#faf9f7`; bản của luồng khác lúc `00:46:29` = `2176` ký tự / `56` token, `29` token bị xoá, hai giá trị trên đều bị đổi | `RQ-10` nói một dòng token đổi giá trị là BLOCK toàn task. Nếu Tier 3 đo worktree ở thời điểm sai, task này bị BLOCK vì việc của người khác | Không cần quyết định, chỉ cần phương pháp: **đo `AC-10` trên `git diff --cached HEAD -- app/globals.css`**, không đo worktree. Hiện tại `git hash-object app/globals.css` = `7857401…` = đúng hash trong index, nên worktree đang trùng bản tôi giao — nhưng điều đó có thể đổi bất cứ lúc nào |
| `DEV-08` | Đánh đổi có chủ ý: `background-image` không nằm trong allowlist chuyển động của go-live-08 | `RQ-23` của go-live-08 liệt kê `transform, box-shadow, background-color, border-color` trong `transition-property`. Tôi thêm lớp trạng thái bằng `background-image`, mà thuộc tính này không có trong danh sách đó | Lớp trạng thái hover xuất hiện tức thời trong khi `transform` và `box-shadow` vẫn chuyển mượt. Về mắt thường gần như không thấy vì lớp phủ chỉ `10%` | Tôi cố ý KHÔNG thêm `background-image` vào `transition-property`, vì đó là sửa một dòng mà go-live-08 đang ghim và sẽ làm đỏ test chuyển động của 08. Nếu Tier 1 muốn mượt hoàn toàn thì cần một contract cho phép chạm dòng ấy |
| `DEV-09` | **Lệch khỏi nếp thường: mọi thứ tôi giao đang ở trạng thái STAGED** | `evidence/step08-ac15-scope-final.txt` và `evidence/step08-antitruncation-stage.txt`. Lý do là `DEV-02`: sau khi mất trắng phần sửa một lần lúc `00:39:16`, tôi áp luật chống-cắt-file (vốn chỉ viết cho `AUDIT.md`) sang cả mã sản phẩm. INDEX gồm `8` path mã §4.2, `1` path mã ngoài §4.2 do `DEC-21` mở, cộng `33` path văn bản của chính task (`HANDOFF.md`, `32` artifact `evidence/`), trong đó có năm bản copy từng byte: `copy-globals-css-round1.css`, `copy-public-ui-premium-static-test-round1.ts`, `copy-handoff-round1.md`, `copy-marketplace-inventory-line350-round2.ts`, `copy-handoff-round2.md` | `git diff` trần ra RỖNG. Đây là cái bẫy đo lớn nhất của bản giao này. Không path nào ngoài hai nhóm trên bị `add`: `git add -A` và `git add .` KHÔNG được dùng lần nào | Xác nhận rằng `git add` (không `commit`) là cách xử đúng trong tình huống bị ghi đè, hoặc chỉ cho tôi cách khác. Không có commit nào được tạo: `git log --oneline -1` vẫn là `663053c` của Tier 1 (lúc bàn giao round `1` là `846ba0e`) |
| `DEV-10` | `HEAD` đã tiến lên hai lần trong lúc tôi làm, **và một câu tôi viết ở round `1` là SAI** | Contract ghi `Baseline 397b026`. `HEAD` khi bàn giao round `1` là `846ba0e`, bây giờ là `663053c`. Đo lại cả ba tệp trên bốn commit: `app/globals.css` = `9b9d63f8…` ở cả bốn; `public-ui-premium.static.test.ts` = `10b7dea9…` ở `397b026` / `846ba0e` / `663053c` nhưng là `98eadf43…` ở `f911cd3`; `marketplace-inventory.static.test.ts` = `a0e5c43f…` ở ba commit đầu và `84b7019a…` ở `f911cd3`. `663053c` chỉ sửa `TASK.md` của chính task này, `0` path mã | **Câu ở round `1` overreach**: tôi viết blob giống nhau qua cả `f911cd3`, nhưng `f911cd3` là commit `2026-09-02 11:19`, tức TRƯỚC `Baseline` (`21:56` cùng ngày) — nó là tổ tiên của Baseline, không nằm trên đường `Baseline → HEAD`, và giữa hai mốc ấy có task khác sửa tệp test. Mệnh đề THỰC SỰ cần cho HANDOFF là `Baseline == HEAD`, và mệnh đề ấy đúng: `397b026 == 846ba0e == 663053c` từng byte trên cả ba tệp | Không cần quyết định. Tôi sửa lại câu của mình thay vì để nguyên, vì `DEV-10` chính là thứ Tier 3 sẽ dựa vào để khỏi phải tự chứng minh lại. Số đo đầy đủ bốn commit: `evidence/r2-step03-head-moved-again.txt` |
| `DEV-11` | **Tiền đề của lệnh round `2` về `app/globals.css` không còn đúng ở thời điểm tôi đo — và lệch về phía thuận lợi** | Lệnh round `2` dặn "worktree đang có bảng token của lane khác: không chạm, không restore, không stage". Đo lúc bắt đầu round `2`: `git hash-object app/globals.css` = `7857401624944e0bc801f69843ce45778c6f50b7` = ĐÚNG hash trong INDEX; `--color-primary` là `#f26522` ở worktree, INDEX và `HEAD` như nhau; `76` token `@theme` ở cả ba bên; `0` dòng khớp bảng màu lạ `#fff8f6` / `#fff1ec` / `#ffe9e2`; `git diff -- app/globals.css` trần ra `0` dòng | Tôi vẫn làm đúng phần "không chạm, không restore, không stage lại" — `app/globals.css` không xuất hiện trong bất kỳ lệnh nào của round `2`. Nhưng hệ quả cho `AC-13` phải được đọc đúng: lượt lane thứ `4` đọc bản CỦA TÔI, nên kết quả `LANE_EXIT=0` quy thuộc được cho bản tôi giao, và **không cần dùng đến cửa thoát "ghi nhận, không tính vào task này" mà `AC-10` của `v1.1` mở ra** | Không cần quyết định. Ghi ra vì nó đổi cách đọc bằng chứng: nếu Tier 3 tin tiền đề kia thì sẽ tưởng lượt `4` đo trên mã của lane khác và trừ điểm oan. Bằng chứng `evidence/r2-step00-globals-premise.txt` và `evidence/r2-step02-ac10-index.txt`. Nếu bảng màu ấy quay lại sau thời điểm này thì phép đo của tôi không nói gì về lúc đó — mốc thời gian ghi trong chính artifact |

Hai điều nữa, không phải deviation, chỉ là xác nhận ba cảnh báo §7 mà Owner dặn:

- **Lane**: cả bốn lượt đều là `npm run test:unit`. Không lượt nào là `npx vitest run` trần. Không có bằng chứng nào trong văn bản này lấy từ lane trần.
- **Avatar không được nhận `.hrp-btn-primary`**: số lần chuỗi `hrp-btn-primary` trong `GlobalNavbar.tsx` là `2` ở `HEAD` và vẫn `2` ở bản tôi giao; trong khối avatar (`:35-52`) chuỗi ấy xuất hiện `0` lần. Tôi chỉ đổi giá trị `backgroundColor` inline. Cặp `hrp-btn-primary hrp-focus nav-item-lift` mà test `:617-627` ghim vẫn xuất hiện `2` lần, nguyên vẹn — `evidence/step08-ac02-ac10-battery.txt`.
- **`@theme`**: `0` dòng token đổi giá trị, `0` token thêm, `0` token mất, trong bản tôi giao. Xem `DEV-07` cho cách đo đúng.

## 6. Evidence Index

`ls evidence/` ra `32` file: `21` của round `1`, `11` của round `2` (tất cả tên round `2` bắt đầu bằng `r2-`, cộng hai bản copy). Bảng dưới liệt kê từng file một, không lược.

Ba file trong số đó KHÔNG phải bằng chứng của AC nào, nói rõ để Tier 3 không đi tìm:

- `evidence/copy-handoff-round1.md` — bản sao từng byte của văn bản này **ở thời điểm cuối round `1`**. Sau khi round `2` sửa lại HANDOFF, bản này KHÔNG còn bằng bản sống nữa, và đó là chủ ý: nó là ảnh chụp lịch sử. Bản copy hiện hành là `copy-handoff-round2.md`.
- `evidence/step08-ac15-scope-final.txt` — ảnh chụp phạm vi INDEX cuối round `1`, khi tổng còn `30` path. Bản hiện hành là `r2-step10-scope-final.txt`.
- `evidence/copy-marketplace-inventory-line350-round2.ts` — bản sao từng byte của tệp mà `DEC-21` mở, theo luật chống-cắt-file.

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
| Dấu vết chống cắt file | `evidence/step08-antitruncation-stage.txt` | `DEV-09`: ở round `1`, đúng `8` path MÃ được `git add`, không có path mã thứ `9`. Round `2` thêm đúng `1` path mã nữa, là tệp `DEC-21` mở — xem `r2-step10-scope-final.txt` |
| **`@theme` ba bên** | `evidence/step08-delivered-vs-head.txt` | `AC-10` và `DEV-07`: `HEAD` `4133` / `76` == INDEX `4133` / `76`, so với bản của luồng khác `2176` / `56` với `29` token bị xoá |
| Diff `globals.css` nguyên văn | `evidence/step08-globals-diff-verbatim.txt` | `AC-01` và `AC-02`: cả ba hunk, `+11 / -1`, cùng ba phép đếm `0` |
| Bản đồ số dòng | `evidence/step08-linemap.txt` | `DEV-06`: từng số dòng contract dẫn → số dòng hiện tại |
| Gate contract trên `v1.0` | `evidence/step08-verify-task.txt` | `C-09` của Tier 3, chạy ở round `1`: `RESULT: PASS. TASK contract is ready for execution.`, exit `0` |
| Bản sao chống cắt: CSS | `evidence/copy-globals-css-round1.css` | Bản sao từng byte của `app/globals.css` tôi giao — cứu được nếu worktree bị ghi đè lần nữa |
| Bản sao chống cắt: test | `evidence/copy-public-ui-premium-static-test-round1.ts` | Bản sao từng byte của tệp test tôi giao |
| **Tiền đề `globals.css` của lệnh round `2`** | `evidence/r2-step00-globals-premise.txt` | `DEV-11`: worktree hash `7857401…` == INDEX hash, `--color-primary` `#f26522` ở cả ba bên, `76` token `@theme` ở cả ba bên, `0` dòng khớp bảng màu lạ. Tức bảng token của lane khác KHÔNG có mặt lúc round `2` đo |
| **Một dòng của `DEC-21`** | `evidence/r2-step01-dec21-oneline.txt` | `AC-13` và `AC-15`: `numstat` `1  1`, diff nguyên văn đúng một hunk một dòng, `it(` `26` → `26`, `describe(` `5` → `5`, `393` → `393` dòng, `var(--color-primary)` trần còn `0` lần |
| **`AC-10` đo bằng ba lệnh của `v1.1`** | `evidence/r2-step02-ac10-index.txt` | `AC-10`: `git diff --cached` và `git diff HEAD` ra `37` dòng GIỐNG NHAU, `git diff` trần ra `0` dòng (đúng cái bẫy `v1.1` cảnh báo), `rg` cho `--color-primary: #f26522` giống nhau ở worktree / INDEX / `HEAD` |
| **`HEAD` tiến lên lần hai** | `evidence/r2-step03-head-moved-again.txt` | `DEV-10`: blob ba tệp trên bốn commit `397b026` / `f911cd3` / `846ba0e` / `663053c`, cộng phần tự sửa câu sai của round `1`. `663053c` chỉ sửa `TASK.md`, `0` path mã |
| **Lane lượt `4`** | `evidence/r2-step07-lane-run4.txt` | `AC-13`: `Test Files 103 passed (103)`, `Tests 1590 passed (1590)`, `LANE_EXIT=0`. Kẹp `git hash-object` `9` tệp trước và sau lượt chạy |
| Tính toàn vẹn của lượt `4` | `evidence/r2-step07b-lane-run4-integrity.txt` | Hash hai đầu giống nhau từng dòng; worktree == INDEX trên cả `9` tệp; dòng tổng kết đã bóc mã màu ANSI; số học bốn lượt |
| Gate contract trên `v1.1` | `evidence/r2-step08-verify-task-v11.txt` | `C-09` của Tier 3, chạy lại sau bump: `RESULT: PASS. TASK contract is ready for execution.`, `VERIFY_TASK_EXIT=0` |
| Kiểm cột bảng của HANDOFF | `evidence/r2-step09-table-check.txt` | Mọi bảng markdown trong văn bản này có số cột khớp header, `SO LOI BANG = 0` — dấu ống trần trong ô là lỗi câm mà gate không bắt |
| **Phạm vi INDEX, bản cuối round `2`** | `evidence/r2-step10-scope-final.txt` | `AC-15`: `42` path, phân loại `8` + `1` + `33`, nhóm thứ tư `0`; bốn tệp của luồng khác vẫn ` M` chưa stage |
| Bản sao chống cắt: tệp `DEC-21` | `evidence/copy-marketplace-inventory-line350-round2.ts` | Bản sao từng byte của tệp mà `DEC-21` mở |
| Bản sao chống cắt: HANDOFF round `2` | `evidence/copy-handoff-round2.md` | Bản sao từng byte của chính văn bản này ở dạng cuối round `2` |

## 7. Execution Round History

| Round | Spec version | Status | Tóm tắt |
|---|---|---|---|
| 1 | `v1.0` | `SUPERSEDED` (Tier 1 đọc, nhận `DEV-01` và `DEV-03`, bump `v1.1`) | Sửa `21` chỗ tương phản trên `7` tệp mã cộng `1` tệp test, `17` chỗ trượt ngưỡng trước khi sửa còn `0` sau khi sửa. Cách sửa nằm ở điểm dùng, khối `@theme` giống `HEAD` từng byte. Hàng rào được siết đúng điểm mù của go-live-08. `14 / 15` AC có bằng chứng đạt; `AC-13` KHÔNG đạt vì `1` test NGOÀI §4.2 ghim tên token cũ ở đúng chỗ `RQ-03` buộc đổi — trình phương án sửa một dòng ở `DEV-01`. Hai tệp trong phạm vi từng bị luồng khác ghi đè mất một lần, đã dựng lại và `git add` theo luật chống cắt file. Không commit, không push, không deploy |
| **2** | `v1.1` | `READY_FOR_AUDIT` | Thực thi đúng `DEC-21` và không gì khác: một dòng ở `marketplace-inventory.static.test.ts:350`, `+1 / -1`. `0` tệp trong §4.2 bị chạm lại — tám path mã của round `1` vẫn `166 / 55` không đổi. Lane lượt `4`: `Test Files  103 passed (103)`, `Tests  1590 passed (1590)`, `LANE_EXIT=0`, nên `AC-13` chuyển từ KHÔNG ĐẠT sang ĐẠT và bộ AC thành `15 / 15`. Ba việc đo thêm không ai yêu cầu: tự kiểm tiền đề `app/globals.css` của lệnh round `2` và thấy nó không còn đúng (`DEV-11`), đo lại `AC-10` bằng đúng ba lệnh mới của `v1.1`, và tự phát hiện một câu sai trong `DEV-10` của chính round `1` rồi sửa. Không commit, không push, không deploy |

> Handoff status: READY_FOR_AUDIT
