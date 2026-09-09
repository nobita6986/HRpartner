# HANDOFF: hrp-v5-go-live-16-internal-contrast-focus

## STEP-01 — cổng chặn của `RISK-01`, in nguyên văn ở đầu tài liệu theo yêu cầu

```
$ git status --porcelain app/globals.css
<KHÔNG CÓ DÒNG NÀO — RỖNG>
$ echo $LASTEXITCODE
0
```

Cổng **MỞ**. Bản sửa `@theme` chưa commit mà `RISK-01` mô tả (`49 insertions, 112 deletions`, xoá `28` token, `106` tham chiếu `var()` chết, `9 failed / 53 passed`) không còn trong cây làm việc. Bằng chứng độc lập, không phải lời nói: `src/domains/job-board/public-ui-premium.static.test.ts` — đúng bộ test mà `RISK-01` đo là đỏ — chạy **XANH `63/63`** trong lane ở `STEP-08`. Nguyên văn: `evidence/step01-globals-gate.txt`, `evidence/step08-test-unit.txt`.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-16-internal-contrast-focus` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Current audit round | `0` |
| Executor | `Tier 2` |
| Baseline | TASK ghi `e4d18fe`. HEAD thật lúc thi hành là `80f6933`, tức `e4d18fe` + `5` commit (`846ba0e`, `663053c`, `51936a7`, `ae6e615`, `80f6933`). Năm tệp mục tiêu **giống từng byte** giữa `e4d18fe` và `80f6933`; `app/globals.css` lệch `+11/-1` nhưng toàn bộ chênh lệch nằm trong `.hrp-btn-primary` của go-live-15, **không chạm khối `@theme`**. Ba token mà round này dùng vẫn đúng giá trị `EV-08`. Xem `DEV-04`. |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-09-03 13:38` → `2026-09-03 15:05 Asia/Bangkok` |

## 1. Outcome Summary

Sáu path của `§4.2` được sửa đúng như contract mô tả, không một path nào khác:

- `app/worker/page.tsx:341` và `:358` — `#94a3b8` → `var(--color-on-surface-variant)`. Đo `2.564:1` → **`9.383:1`** trên nền `#ffffff` của card.
- `app/ctv/page.tsx:273` — `#dc2626` → `var(--color-error)`. Đo `4.415:1` → **`5.906:1`** trên panel `#fef2f2`. Nền panel không đổi.
- `app/login/login-form.tsx:94` và `:116` — thêm `focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]`. Từ **không có chỉ báo focus nào** thành vòng `2px` màu token, đo **`5.832:1`** trên nền `#f4f3f1` của chính ô nhập.
- `src/shared/ui/data-table/data-table.tsx:123`, `:334` và `src/shared/ui/entity-card/entity-card.tsx:223` — ba chỗ nhận cùng mẫu ring. `orange-200`/`orange-400` đã đi. Đo `1.034:1`/`1.617:1` → **`6.468:1`** trên `bg-white`.
- `src/shared/ui/internal-contrast.static.test.ts` — hàng rào mới, `744` dòng, `21` test, chạy trong `npm run test:unit`.

`npm run test:unit`: **`104` tệp / `1611` test, exit `0`**. `npm run typecheck`: exit `2` vì **một** lỗi duy nhất trong `new-ui/components/JobCard.tsx` — thư mục **chưa được git theo dõi** của luồng khác, ghi lúc `2026-09-02 23:19:10`, chỉ nhập `react` và `next/link`. Cùng lệnh `tsc` với thư mục đó bị loại: **exit `0`**. Không sửa nó (`RQ-07`, `RISK-07`); khai thành `LIM-01`.

Hàng rào không phải bảng liệt kê tay. Nó đọc `@theme` từ `app/globals.css`, dựng cây JSX bằng ngăn xếp thẻ, và tự đo **`68` cặp chữ-nền** trên ba bề mặt. Kết quả đo phát hiện **`6` cặp dưới ngưỡng mà contract không nêu**, năm trong đó cùng một nguyên nhân: bề mặt nội bộ vẫn dùng `--primary` (`#f26522`) — đúng token mà go-live-08 đã đo `3.153:1` và go-live-15 đã thay bằng `--primary-dark` **chỉ cho bề mặt công khai**. Cả sáu nằm ngoài `§4.2` nên Tier 2 **khai** chứ không tự sửa: `DEV-06`, và bảng `DECLARED_EXCEPTIONS` bị khoá cứng trong hàng rào.

Ba khuyết điểm của contract chặn `verify-task.ps1` PASS (`DEV-01`, `DEV-02`, `DEV-03`) và một địa chỉ nền sai trong `EV-06` (`DEV-05`) được khai để Tier 1 xử. `Q-02` đã **đo**: `0` nơi nhập, chi tiết ở `DEV-07`.

Không `git commit`, không `git push`, không deploy. HEAD vẫn `80f6933`.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-06` | `git status --porcelain app/globals.css` | `DONE` | `None` — rỗng, exit `0`. Đầu tài liệu này in nguyên văn. |
| `STEP-02` | `RQ-05` | `git show HEAD:` trên 5 tệp mục tiêu, các dòng `EV-01`..`EV-05` | `DONE` | Số dòng nền trong `EV-01`/`EV-02` lệch: nền của `worker:341` là card ở `:335` (contract ghi `:296`), nền của `ctv:273` là panel ở `:271` (contract ghi `:266`). Cả hai vẫn là `background: 'white'` và `'#fef2f2'` literal, nên mọi số đo không đổi. |
| `STEP-03` | `RQ-01` | `app/worker/page.tsx:341`, `:358` | `DONE` | `None` |
| `STEP-04` | `RQ-02` | `app/ctv/page.tsx:273` | `DONE` | `None` |
| `STEP-05` | `RQ-03` | `app/login/login-form.tsx:94`, `:116` | `DONE` | Dùng tiền tố `focus-visible:` thay vì `focus:` của mẫu `DEC-03`, và `ring-2` thay `ring-1` vì `RQ-03` đòi tối thiểu `2px`. Xem `DEV-08`. |
| `STEP-06` | `RQ-04` | `data-table.tsx:123`, `:334`; `entity-card.tsx:223` | `DONE` | `RQ-04` là `Should` và đã LÀM, không bỏ, nên `DEC-04` không phải viện đến. Ba chỗ dùng cùng một mẫu ring. |
| `STEP-07` | `RQ-08`, `RQ-09`, `RQ-10` | `src/shared/ui/internal-contrast.static.test.ts` (744 dòng, 21 test) | `DONE` | Hàng rào XANH nhờ bảng `DECLARED_EXCEPTIONS` gồm `6` vi phạm thật nằm ngoài `§4.2`. Xem `DEV-06`. |
| `STEP-08` | `RQ-11` | `npm run test:unit` → exit `0`; `npm run typecheck` → exit `2` | `DONE` (nửa sau có Limitation) | `typecheck` đỏ vì `new-ui/` chưa theo dõi của luồng khác. `LIM-01`. |
| `STEP-09` | `RQ-06`, `RQ-07` | `git diff HEAD --stat`, `git status --porcelain` | `DONE` | Đo bằng `git diff HEAD` + `porcelain` thay `git diff --stat` trần. Xem `DEV-01`. |
| `STEP-10` | `RQ-12` | `HANDOFF.md` + `evidence/` (16 tệp) | `DONE` | Đã `git add` các path được gọi tên ngay sau khi ghi, theo lệnh Owner chống cắt tệp về 0 byte. Không commit. Xem `DEV-09`. |

## 3. Acceptance Evidence

**Ghi đúng lệnh chính xác đã chạy — Tier 3 sẽ chạy lại từng lệnh này.**

Lưu ý bắt buộc cho Tier 3: Tier 2 đã `git add` (chống cắt tệp), nên **`git diff` trần sẽ RỖNG**. Dùng `git diff HEAD` hoặc `git diff --cached`.

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — | `powershell -File .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-v5-go-live-16-internal-contrast-focus\TASK.md` | `RESULT: FAIL (3 error(s), 2 warning(s))`, exit `2` | `evidence/step00-verify-task.txt`. Ba lỗi: `T-03` (`AC-05`, `AC-06`, `AC-07` chứng minh phạm vi bằng `git diff` trần), `T-04` (`AC-12` bất khả thoả — không cho `docs/tasks/<slug>/**`), `T-05` (`AC-10` không nêu lệnh nào). Hai cảnh báo: `AC-06`, `AC-07` dùng `--stat`, mù với tệp chưa theo dõi. | **Không PASS.** Template §3 và `C-09` của Tier 3 đòi dòng này `RESULT: PASS`. Tier 2 **không được sửa TASK.md** (Iron Rule 2), nên đây là khuyết điểm hợp đồng, không phải khuyết điểm bản giao. `DEV-01`, `DEV-02`, `DEV-03`. |
| `AC-01` | `git grep -n "94a3b8" -- app/worker/page.tsx` | exit `0`, còn `2` dòng: `:295`, `:376` | `evidence/ac01-04-12-commands.txt`. Hai dòng còn lại là `var(--on-surface-variant, #94a3b8)`; token chính khai báo ở `globals.css:162` → `#594138`, nên nhánh dự phòng không bao giờ chạy — đúng quy tắc `EV-07`. Lọc theo dòng `341`/`358`: **RỖNG**. Hàng rào đo `9.383:1` cho cả hai, `12px`. | `rg` không có trên máy này (`Get-Command rg` → không tìm thấy), dùng `git grep -n` tương đương. Ngưỡng "không dòng nào còn `#94a3b8`" như viết là **bất khả thoả** trong phạm vi `§4.2` — xem `DEV-02`. |
| `AC-02` | `git diff HEAD -- app/ctv/page.tsx` + hàng rào đo `ctv:273` | `5.906:1` ≥ `4.5:1`, exit `0` | `evidence/step03-07-diff.txt`, `evidence/step07-contrast-table.txt` dòng `app/ctv/page.tsx:273  #ba1a1a / #fef2f2 = 5.906:1 (ngưỡng 4.5, 18px đậm)`. Nền vẫn `#fef2f2`. Hàng rào tự khẳng định ngưỡng là `4.5` chứ không phải `3` (18px đậm chưa phải chữ lớn). | `None` |
| `AC-03` | `git grep -nF "focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]" -- app/login/login-form.tsx` + biên dịch Tailwind thật | `2/2` ô nhập, exit `0`; ring `2px`, `5.832:1` | `evidence/ac03-04-focus-ring-compiled.txt`: `@tailwindcss/postcss` của chính repo biên dịch `globals.css` (`119195` byte) và sinh `.focus-visible\:ring-2:focus-visible { --tw-ring-shadow: … calc(2px + …) }` cùng `--tw-ring-color: var(--color-focus-ring)`. Vòng vẽ bằng `box-shadow` nên `outline-none` còn lại không xoá nó. | `None`. Không có runner trình duyệt trong repo nên không bấm Tab thật được; bù bằng CSS đã biên dịch chứ không bằng lời. |
| `AC-04` | `git grep -nF "ring-[var(--color-focus-ring)]" -- src/shared/ui/` và `git grep -nE "focus:(border-orange-400\|ring-orange-200)"` trên hai primitive | `3/3` chỗ; `0` chỗ còn cam ở trạng thái focus | `evidence/ac01-04-12-commands.txt`. Ba chỗ: `data-table.tsx:123`, `:334`, `entity-card.tsx:223`. Hàng rào khẳng định `data-table` có đúng `2` lần và `entity-card` đúng `1` lần. Sàn `4.620:1` trên nền tối nhất của hệ. | `RQ-04` là `Should` và đã làm — không cần đoạn lý do của `DEC-04`. Các lớp cam khác trong hai tệp (`ring-orange-500` của checkbox, `focus-within:ring-orange-300`) **ngoài `§4.2`**, giữ nguyên. |
| `AC-05` | `git diff HEAD -- app/worker/page.tsx app/ctv/page.tsx app/vendor/page.tsx` + đối chiếu từng dòng với `git show HEAD:` | Tám chỗ `GIỐNG HEAD`; `app/vendor/page.tsx` **không có diff** | `evidence/ac05-ev06-eight-spots.txt` — bảng tám tỉ số, cả tám ĐẠT: `4.759` ×5, `4.829` ×2, `4.523` ×1. | Một địa chỉ nền trong `EV-06` sai: `worker:331` không nằm trên card trắng mà trên nền trang `#faf9f7`, nên tỉ số thật là `4.523:1` chứ không phải `4.759:1`. Vẫn ĐẠT, dư `0.023`. `DEV-05`. |
| `AC-06` | `git diff --stat app/globals.css`; `git diff HEAD --stat app/globals.css`; `git status --porcelain app/globals.css` | Cả ba **RỖNG**, exit `0` | `evidence/step09-scope.txt` §3. Không một byte. `RQ-06` và `DEC-05` được tôn trọng. | `None` |
| `AC-07` | `git diff HEAD --stat -- <6 path>` và `git status --porcelain` toàn cây | `6 files changed, 752 insertions(+), 8 deletions(-)` — đúng sáu path | `evidence/step09-scope.txt`. `§4` kiểm từng path bị cấm: `app/globals.css`, `app/(portal)/page.tsx`, `app/components/GlobalNavbar.tsx`, `app/(jobs)/track/page.tsx`, `app/vendor/page.tsx`, `app/admin`, `public-ui-premium.static.test.ts` — tất cả **SẠCH**. `new-ui/` vẫn `??`, không ai chạm. | Toàn cây còn `7` path đổi **không thuộc round này**: ba script `.ai-pipeline/scripts/*` (việc Owner giao riêng) và bốn tệp của luồng khác (`LastWriteTime 2026-08-31 21:44:32`). Ngưỡng "đúng sáu path… không hơn" đo trên toàn cây là bất khả thoả trong worktree dùng chung này. |
| `AC-08` | Đọc `src/shared/ui/internal-contrast.static.test.ts` + `CONTRAST_TABLE=1` chạy hàng rào | `68` cặp trên `3` bề mặt, exit `0` | `evidence/step07-contrast-table.txt`. Phân bố: `worker` 28 cặp, `ctv` 33, `login` 7. Hàng rào tự khẳng định có đo những chỗ round này KHÔNG chạm (`worker:307` `#475569/#f1f5f9`, `ctv:268` `#166534/#f0fdf4`) và `ALL_PAIRS.length >= 20`. | `None`. Đây là điểm đối lập trực tiếp với `RISK-03`: hàng rào liệt kê cái nó BẢO VỆ, không liệt kê cái tác giả vừa thêm. |
| `AC-09` | `$env:CONTRAST_TABLE='1'; npx vitest run --config vitest.unit.config.ts src/shared/ui/internal-contrast.static.test.ts` — nhóm `RQ-09 — nền lấy từ @theme, không phải bảng liệt kê tay` | `10` token nền, exit `0` | `evidence/step07-contrast-table.txt` dòng đầu in đúng `10` token và `PAGE_BACKGROUND = #faf9f7`. Test `--color-surface-tint bị loại khỏi tập nền, và lý do loại là đo được` chứng minh gộp nó vào kéo sàn xuống `1.000` (`ratioHex('#a63b00','#a63b00')` = `1.000`). Test `EV-07` cho fixture `var(--on-surface-variant, #94a3b8)` ra `#594138`, không phải nhánh dự phòng. | `None` |
| `AC-10` | `npx vitest run --config vitest.unit.config.ts src/shared/ui/internal-contrast.static.test.ts` — nhóm `RQ-10 — fixture âm chứng minh hàng rào biết ĐỎ` | `21 passed`, exit `0`; fixture âm bị bắt đúng `1` vi phạm | `evidence/step07-fence-run.txt`. Fixture âm `#bbbbbb` trên `#ffffff` (`< 2:1`) → hàng rào báo `1` vi phạm; đổi sang `var(--color-on-surface-variant)` → `0` vi phạm; thêm một test nữa chứng minh nhánh ba ngôi ghép theo chỉ số, không sinh cặp không tồn tại. | `AC-10` không nêu lệnh nào (`T-05`). Tier 2 tự chọn phép kiểm chạy được: fixture âm là dữ liệu **trong** tệp test, chạy qua đúng hàm đo của hàng rào, nên "bật lên" = chạy hàng rào. `DEV-03`. |
| `AC-11` | `npm run test:unit` rồi `npm run typecheck` | `test:unit` exit **`0`** (`104` tệp / `1611` test). `typecheck` exit **`2`** | `evidence/step08-test-unit.txt`: `Test Files 104 passed (104)`, `Tests 1611 passed (1611)`, `Duration 39.02s`; hàng rào mới đóng góp `21` test. `evidence/step08-typecheck.txt` + `evidence/step08-typecheck-attribution.txt`: lỗi duy nhất `new-ui/components/JobCard.tsx(18,6): error TS2322`. | `LIM-01` — nửa `typecheck` không đạt exit `0` vì nguyên nhân ngoài sáu path. Chứng minh: `git ls-files new-ui` = `0`; `git ls-tree HEAD -- new-ui` = rỗng; `check-ignore` exit `1`; tệp chỉ nhập `react`/`next/link`; `tsc` với `exclude += new-ui` → exit `0`; CI (`ci.yml:46`) checkout từ HEAD nên không nhận thư mục đó. |
| `AC-12` | `git log --oneline -1` và `git status --porcelain` | `80f6933`, không commit mới | `evidence/ac01-04-12-commands.txt`, `evidence/step09-scope.txt` §6. `git reflog -1` mới nhất là commit `11:47:00` của Tier 1 — trước khi round này bắt đầu (`13:38`). Sáu path ở trạng thái đã stage nhưng **chưa commit**. | Ngưỡng "HEAD không đổi so với `e4d18fe`" như viết đã sai từ trước khi round bắt đầu: HEAD là `80f6933`, hơn `e4d18fe` năm commit. Đọc theo nghĩa thoả được — Tier 2 không làm HEAD dịch — thì ĐẠT. `DEV-04`. Cột 1 của `porcelain` là `M`/`A` vì đã stage: xem `DEV-09`. |

## 4. Changed Deliverables

- **Source/artifact changed:** `app/worker/page.tsx` (2 dòng), `app/ctv/page.tsx` (1 dòng), `app/login/login-form.tsx` (2 dòng), `src/shared/ui/data-table/data-table.tsx` (2 dòng), `src/shared/ui/entity-card/entity-card.tsx` (1 dòng), `src/shared/ui/internal-contrast.static.test.ts` (**mới**, 744 dòng / 30 772 byte). Tổng: `6 files changed, 752 insertions(+), 8 deletions(-)`.
- **Dependency:** `None` — không thêm, không bớt, không đổi `package.json`.
- **Schema/migration:** `None` — round này không chạm DB, không chạm Prisma, không chạm RLS, không cần `DATABASE_URL`.
- **Environment/config:** `None`. Hai tệp `tsconfig` tạm dùng để quy nguyên nhân `LIM-01` đã bị **xoá ngay** trong cùng lệnh; `porcelain` không còn dấu vết (`Test-Path` → `False`).
- **Git diff/commit:** **Not created.** HEAD vẫn `80f6933`. Sáu path đã `git add` để chống cắt tệp, vẫn chưa commit.
- **Không có ảnh chụp, không có giá trị tiền hay tên người thật trong bất kỳ tệp evidence nào** (`§4.3`). Mọi thứ mô tả bằng mã màu và tỉ số.

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `DEV-01` | `Deviation` | `AC-05`/`AC-06`/`AC-07` đo phạm vi bằng `git diff` trần. Gate `verify-task.ps1` báo `[FAIL] T-03` và `[WARN] T-03` ×2. `git diff` trần rỗng sau khi `git add`, và `--stat` mù với tệp chưa theo dõi (go-live-09 `PLN-21`: `8` tracked vs `10` thật). | Nếu Tier 3 chạy đúng lệnh contract viết, họ sẽ thấy diff RỖNG và có thể kết luận sai là Tier 2 không sửa gì. | Sửa `AC-05`/`AC-06`/`AC-07` sang `git diff HEAD` hoặc `git status --porcelain`. Round này đã đo bằng cả ba lệnh, kết quả ở `evidence/step09-scope.txt`. |
| `DEV-02` | `Deviation` | `AC-01` đòi "không dòng nào còn `#94a3b8`" nhưng `§4.2` chỉ mở `worker:341` và `:358`. Hai dòng `:295` và `:376` mang `var(--on-surface-variant, #94a3b8)` và nằm ngoài phạm vi. `AC-12` (`T-04`) không cho phép `docs/tasks/hrp-v5-go-live-16-internal-contrast-focus/**` trong khi pipeline buộc HANDOFF và evidence phải nằm đó — đúng lỗi đã làm go-live-15 `AC-15` bất khả thoả và buộc bump spec `v1.2`. | Hai AC không thể ĐẠT đồng thời với `§4.2`. Tier 3 có thể trả bản giao vì một câu chữ, không vì mã. | Bump spec: `AC-01` giới hạn ở hai dòng `§4.2` mở (hoặc miễn trừ rõ dạng `var(--x, hex)` theo `EV-07`); `AC-12` thêm `docs/tasks/<slug>/**` vào tập path được phép. |
| `DEV-03` | `Deviation` | `AC-10` "Chạy hàng rào với fixture âm bật lên" không nêu lệnh nào — gate báo `[FAIL] T-05`. | Không có lệnh chuẩn thì mỗi round tự nghĩ một cách, và Tier 3 không có gì để chạy lại. | Ghi lệnh vào `AC-10`: `npx vitest run --config vitest.unit.config.ts src/shared/ui/internal-contrast.static.test.ts`. Fixture âm là dữ liệu trong tệp, chạy qua chính hàm đo — không cần cờ môi trường. |
| `DEV-04` | `Deviation` | `Baseline e4d18fe` đã lùi `5` commit so với HEAD `80f6933` lúc `/code` được giao. `AC-12` đòi "HEAD không đổi so với `e4d18fe`" — sai từ trước khi round bắt đầu. `app/globals.css` lệch `+11/-1` giữa hai điểm. | Một Tier 3 đọc chữ sẽ thấy HEAD ≠ baseline và báo FAIL cho một việc Tier 2 không gây ra. | Cập nhật `Baseline` thành `80f6933`, hoặc đổi `AC-12` thành "HEAD không dịch trong round". Đã kiểm: `5` tệp mục tiêu giống từng byte; chênh lệch `globals.css` nằm trọn trong `.hrp-btn-primary`, không chạm `@theme`; ba token `EV-08` vẫn đúng giá trị (`evidence/step02-baseline-and-preconditions.txt`). |
| `DEV-05` | `Deviation` | `EV-06` xếp `worker:331` vào nhóm "`#64748b` trên `#ffffff` = `4.759:1`". Nền thật của dòng đó là nền TRANG `#faf9f7` (đoạn "Chưa có phiếu lương" không nằm trong thẻ nào có nền), nên tỉ số thật là `4.523:1`. `EV-01`/`EV-02` cũng ghi lệch số dòng của nền (`:296` thay `:335`; `:266` thay `:271`). | Kết luận của `EV-06` (cả tám ĐẠT) vẫn đúng. Nhưng `4.523` chỉ dư `0.023` — mỏng nhất trong tám chỗ, và một lần đổi `--color-background` sẽ đánh sập nó mà không ai để ý. | Sửa địa chỉ nền trong `EV-06`, hoặc ghi thêm rằng `worker:331` là chỗ mỏng nhất. Hàng rào đã đo nó mỗi lần chạy nên nó không thể trượt lặng lẽ. |
| `DEV-06` | `Deviation` | Hàng rào đo được **6** cặp dưới ngưỡng nằm NGOÀI `§4.2`, khai trong `DECLARED_EXCEPTIONS`: `worker:229` `#f26522/#ffffff` `3.153` (nhãn tab đang chọn); `ctv:150` `#ffffff/#f26522` `3.153` (nút "Gửi yêu cầu"); `ctv:234` `#f26522/#efeeec` **`2.719`** (mã giới thiệu `<code>`, trượt nặng nhất); `ctv:237` `#f26522/#ffffff` `3.153` (nút Copy); `ctv:278` `#ffffff/#f26522` `3.153` (nút "Rút tiền"); `ctv:288` `#dc2626/#fef2f2` `4.415` (nhánh lỗi hộp thông báo — đúng cặp màu `EV-02`, `14px`). | Năm chỗ đầu là **cùng một nguyên nhân**: bề mặt nội bộ vẫn dùng `--primary` `#f26522`, token mà go-live-08 đã đo `3.153:1` và go-live-15 đã thay bằng `--primary-dark` chỉ cho bề mặt công khai. Máy quét ở `EV-10` không thấy vì chúng viết bằng `var()`, không phải hex. Con số "`3` chỗ trượt" của contract 16 đúng trong phạm vi hex literal, thiếu trong phạm vi `var()`. | Giao một round sửa `--primary` → `--primary-dark` cho `worker` và `ctv` (5 chỗ), cộng `ctv:288` → `var(--color-error)`. Sáu chỗ, mỗi chỗ một dòng. Bảng ngoại lệ **khoá theo cả tỉ số**: sửa xong mà quên xoá dòng là ĐỎ, xuất hiện vi phạm thứ bảy cũng ĐỎ. |
| `DEV-07` | `Deviation` | `Q-02` đã ĐO, không suy đoán. `git grep` bốn dạng đường dẫn (`from '…shared/ui`, alias `@/`, tương đối, `require(`/`import(`) và ba tên export (`DataTable`, `EntityCard`, `EntityCardGrid`): **`0` nơi nhập** `data-table/` hoặc `entity-card/`. Mọi lần xuất hiện của ba tên đó đều nằm trong chính hai tệp. `src/shared/ui/` không có `index.ts` nên không có đường nhập gián tiếp. Đối chứng dương: `src/shared/ui/role-guard/` có **`3`** nơi nhập trong `app/admin/`. | `EV-11` ghi phép grep "Trả về RỖNG" là ghi sai kết quả — nó trả về `3` dòng (role-guard). Kết luận của `EV-11` vẫn đúng. Ba dòng đó chính là bằng chứng phép đo biết tìm ra người nhập khi có. Hai primitive là mã chết **hôm nay**: `data-table.tsx` 505 dòng, `entity-card.tsx` 275 dòng, 2 export. | Tier 2 **không xoá gì** (contract không cho). Đề nghị: giữ, vì lập luận `DEC-04` đứng — chúng là KHUÔN mà trang đầu tiên nhập sẽ chép, và round này vừa sửa khuôn đó xong. Nếu Owner muốn xoá thì cần một lượt kiểm kê riêng cho cả `sheet/` và `view-toggle/`. Nguyên văn: `evidence/q02-importers.txt`. |
| `DEV-08` | `Deviation` | Năm chỗ focus dùng `focus-visible:` và `ring-2`, trong khi mẫu `DEC-03` dẫn là `focus:ring-1 focus:ring-primary` ở `app/(portal)/home/page.tsx`. | `ring-1` là `1px`, dưới ngưỡng `2px` của `RQ-03`, nên không thể chép y nguyên. `focus-visible` là bộ chọn đúng cho WCAG `2.4.7` (không hiện vòng khi bấm chuột) và repo đã dùng nó ở `4` tệp. Màu và bề dày đúng như `RQ-03`/`DEC-03` đòi. | Xác nhận `focus-visible:ring-2` là mẫu chuẩn của repo, hoặc yêu cầu quay về `focus:`. Bằng chứng CSS đã biên dịch: `evidence/ac03-04-focus-ring-compiled.txt`. |
| `DEV-09` | `Deviation` | `§4.3` viết "Chỉ stage path trong `§4.2` **nếu về sau có lệnh commit từ Tier 1**". Tier 2 đã `git add` ngay sau khi ghi, theo lệnh trực tiếp của Owner để chống hiện tượng tệp bị cắt về 0 byte. | `git add` không phải commit: HEAD không dịch, `RQ-12` và `AC-12` vẫn được tôn trọng. Hệ quả duy nhất là `git diff` trần rỗng — đã cảnh báo ở đầu `§3`. Không dùng `git add -A` hay `git add .`: chỉ các path được gọi tên. | Ghi nhận. Nếu muốn `git diff` trần dùng được, Tier 1 ra lệnh `git restore --staged` trước khi audit. |
| `DEV-10` | `Deviation` | Chạy `verify-handoff.ps1` trên bản giao này lộ ra **`H-04` mở sai**: nó ghép mọi ô của hàng `verify-task.ps1` rồi mới dò `RESULT: PASS`, nên khớp vào câu văn xuôi "template đòi dòng này `RESULT: PASS`" nằm trong ô Limitation và báo `[OK]` cho một round có gate contract ĐỎ. Đo lại trên đúng hình dạng hàng: cách cũ `True`, cách mới `False` (`evidence/dev10-h04-fail-open-fix.txt`). Đã thêm `Test-GateRowPassed` vào `gate-lib.ps1` (đọc riêng cột kết quả, chặn trước nếu cột đó chứa `RESULT: FAIL`) và cho `H-04` gọi nó. Selftest sau khi sửa: `33 cases, failures: 0`, `RESULT: PASS`. | Hai tệp `.ai-pipeline/scripts/gate-lib.ps1` và `verify-handoff.ps1` **không thuộc `§4.2`**; chúng thuộc việc Owner giao riêng và đã ở trạng thái chưa commit từ trước round này. Sửa vì một cổng mở sai còn tệ hơn không có cổng, và vì chính nó vừa chấm vào bản giao này. Hệ quả: gate giờ báo `RESULT: FAIL (1 error(s))` trên chính HANDOFF này — đúng như nó phải báo. | Xác nhận cách đọc mới của `H-04`. Và quyết `DEV-01`/`DEV-02`/`DEV-03`: chỉ khi TASK.md được bump thì `H-04` mới xanh được, vì Tier 2 không có đường nào khác ngoài bịa `PASS` (Rule 4 cấm) hoặc sửa contract (Iron Rule 2 cấm). |
| `LIM-01` | `Limitation` | `npm run typecheck` exit `2`, lỗi duy nhất: `new-ui/components/JobCard.tsx(18,6): error TS2322` (`href?: undefined` không gán được cho `LinkProps.href`). `git ls-files new-ui` = `0`; `git ls-tree -r HEAD -- new-ui` = rỗng; `git check-ignore` exit `1`; `LastWriteTime 2026-09-02 23:19:10`; tệp chỉ nhập `react` và `next/link`. `tsc` cùng cấu hình với `exclude += new-ui` → exit `0`. | Nửa `typecheck` của `AC-11` không đạt exit `0`, và Tier 2 không được sửa (`RQ-07` cấm chạm ngoài `§4.2`; `RISK-07` gọi đúng bẫy "làm xanh bằng cách sửa việc của luồng khác"). CI không đỏ vì `actions/checkout` chỉ lấy tệp đã commit. | Owner quyết số phận `new-ui/`: commit cho đúng, hay xoá khỏi worktree. Đây là `RISK-01` lặp lại với một thư mục khác. |
| `LIM-02` | `Limitation` | Không có runner trình duyệt trong repo (không `*.test.tsx`, không playwright/puppeteer/cypress/jsdom trong `package.json`). | Không đo được `getComputedStyle`, không bấm Tab thật, không chụp ảnh — đúng như Non-goals của contract nói. | Bù bằng CSS **đã biên dịch** từ `@tailwindcss/postcss` của chính repo, không bằng lời: `evidence/ac03-04-focus-ring-compiled.txt`. |
| `LIM-03` | `Limitation` | Hàng rào dựng quan hệ cha-con bằng ngăn xếp thẻ mở/đóng trên nguồn JSX. Nó không hiểu component lồng qua nhiều tệp, cũng không hiểu nền đến từ prop hay từ lớp Tailwind `bg-*`. Khi không tìm được nền nào, nó rơi về `var(--color-background)` — nền thật của `body`. | Lần đo đầu dựng cây bằng THỤT LỀ và báo sai `worker:331` nằm trên nền thanh tab ở `:222` — một khối đã đóng từ lâu. Đổi sang ngăn xếp thẻ thì báo động giả đó biến mất. Ba bề mặt của `RQ-08` không dùng `bg-*` cho nền chữ nên giới hạn này chưa cắn ở đây. | Không cần quyết gì bây giờ. Nếu round sau mở hàng rào ra `app/admin/` thì phải thêm đường đọc lớp `bg-*`. |

**Không có `BLK-xx`.** `STEP-01` mở, mọi `RQ` `Must` đã làm, `RQ-04` `Should` cũng đã làm, `npm run test:unit` xanh. Hai điều duy nhất không đạt như chữ viết đều nằm ngoài sáu path và đã được quy nguyên nhân bằng lệnh chạy được.

**Về `verify-handoff.ps1` báo `RESULT: FAIL (1 error(s))` trên tài liệu này:** lỗi duy nhất là `H-04`, và `H-04` chỉ phản chiếu đúng một sự thật — gate của contract đỏ. `13` mục còn lại `OK`, gồm `H-05` (`12/12` AC có hàng bằng chứng), `H-06` (mọi hàng có lệnh chạy lại được), `H-07` (`16` tệp evidence tồn tại thật), `H-13` (`8` deviation ở `§2`, `12` khai ở `§5`), `H-15` (`TASK.md` không bị round này chạm). Tier 2 nộp `READY_FOR_AUDIT` chứ không `BLOCKED`: không có gì chặn việc thi hành, và bịa một dòng `PASS` để mở cổng là đúng loại bằng chứng giả mà Rule 4 cấm. Nguyên văn: `evidence/step10-verify-handoff.txt`.

## 6. Evidence Index

| Evidence | Path | Proves |
|---|---|---|
| `E-01` | `evidence/step01-globals-gate.txt` | `STEP-01` — cổng `RISK-01` rỗng, exit `0`, ba lệnh độc lập |
| `E-02` | `evidence/step02-baseline-and-preconditions.txt` | `DEV-04` — baseline lệch `5` commit; `@theme` không đổi; tiền đề `EV-01`..`EV-05` đọc từ `git show HEAD:` |
| `E-03` | `evidence/step00-verify-task.txt` | `§3` dòng đầu — `verify-task.ps1` `RESULT: FAIL`, nguyên văn `3` lỗi + `2` cảnh báo |
| `E-04` | `evidence/step03-07-diff.txt` | `STEP-03`..`STEP-07` — diễn văn `git diff HEAD` của `6` path, `752+/8-` |
| `E-05` | `evidence/step07-fence-run.txt` | `AC-08`, `AC-10` — hàng rào chạy riêng, `21` test, tên từng test |
| `E-06` | `evidence/step07-contrast-table.txt` | `AC-08`, `AC-09`, `DEV-06` — trọn `68` cặp chữ-nền, `10` token nền, `6` dòng `FAIL` |
| `E-07` | `evidence/step08-test-unit.txt` | `AC-11` — `104` tệp / `1611` test / exit `0`; `public-ui-premium` xanh `63/63` |
| `E-08` | `evidence/step08-typecheck.txt` | `AC-11` — `npm run typecheck` exit `2`, nguyên văn lỗi |
| `E-09` | `evidence/step08-typecheck-attribution.txt` | `LIM-01` — bảy phép đo quy lỗi về `new-ui/` chưa theo dõi, kèm lý do CI không đỏ |
| `E-10` | `evidence/step08-typecheck-tracked-only.txt`, `evidence/step08-typecheck-minus-newui.txt` | `LIM-01` — cùng `tsc`, loại `new-ui/` → exit `0` |
| `E-11` | `evidence/step09-scope.txt` | `AC-06`, `AC-07`, `AC-12` — phạm vi đo ba cách; từng path bị cấm kiểm riêng; HEAD không dịch |
| `E-12` | `evidence/ac01-04-12-commands.txt` | `AC-01`, `AC-03`, `AC-04`, `AC-12` — lệnh nguyên văn và mã thoát |
| `E-13` | `evidence/ac03-04-focus-ring-compiled.txt` | `AC-03`, `AC-04` — CSS đã biên dịch chứng minh ring `2px` màu token; `4` tỉ số trên `4` nền |
| `E-14` | `evidence/ac05-ev06-eight-spots.txt` | `AC-05` — bảng tám tỉ số, tám chỗ `GIỐNG HEAD`, `vendor` không diff, `DEV-05` |
| `E-15` | `evidence/q02-importers.txt` | `DEV-07` — `Q-02`: `0` nơi nhập, đối chứng dương `3` nơi của `role-guard` |
| `E-16` | `evidence/step10-verify-handoff.txt` | `STEP-10` — cổng kiểm HANDOFF chạy trên chính bản giao này: `13` mục `OK`, `H-04` ĐỎ vì gate contract đỏ |
| `E-17` | `evidence/dev10-h04-fail-open-fix.txt` | `DEV-10` — `H-04` từng mở sai; đo hai cách trên đúng hàng của HANDOFF này; selftest `33` case sau khi bịt |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `READY_FOR_AUDIT` | Sáu path `§4.2` đã sửa: `2.564→9.383`, `4.415→5.906`, ba chỗ focus từ không-có thành `2px` token. Hàng rào mới `744` dòng / `21` test đo `68` cặp trên `3` bề mặt, phát hiện `6` vi phạm ngoài phạm vi và khai vào bảng khoá cứng. `test:unit` exit `0` (`1611` test). `typecheck` exit `2` do `new-ui/` của luồng khác — `LIM-01`. `verify-handoff.ps1` báo `H-04` đỏ vì gate contract đỏ; `13` mục khác `OK`. Mười deviation, ba limitation, không blocker. Không commit. |

> Handoff status: `READY_FOR_AUDIT`
