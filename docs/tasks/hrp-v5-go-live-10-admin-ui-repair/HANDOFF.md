# HANDOFF: hrp-v5-go-live-10-admin-ui-repair

> **Deploy là hành động của Owner.** Task này KHÔNG commit, KHÔNG push, KHÔNG deploy (`RQ-14`, `AC-19`). Deploy production = push `main` qua Vercel Git integration; chỉ Owner quyết định thời điểm.
>
> **Lớp alias là biến toàn cục nên nó đổi hiển thị NGOÀI `app/admin` (`RISK-08`).** Mọi trang đang gọi tên không tiền tố đều bị ảnh hưởng: `app/bod/`, `app/vendor/`, `app/ctv/`, `app/worker/`, `app/login/` + `app/login/login-form.tsx`, và panel xếp việc `src/domains/applications/placement-panel.tsx`. Trước sửa các chỗ đó render bằng giá trị fallback hoặc `initial`; sau sửa chúng render bằng token G27. Đây là hệ quả không tránh được của cách sửa tại nguồn, không phải scope creep — chi tiết đo ở §3 `AC-15` và §5.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-10-admin-ui-repair` |
| Work type | `CODE` |
| Audit mode | `CODE_AUDIT` |
| Spec version đã thực thi | `v1.0` |
| Current execution round | `1` |
| Current audit round | `0` |
| Executor | `Tier 2` |
| Baseline theo TASK | `708506f` |
| HEAD lúc viết HANDOFF | `9a9ed28`. `708506f` vẫn là ancestor (`git merge-base --is-ancestor 708506f HEAD` → `708506f_IS_ANCESTOR=yes`). `691be38` (go-live-12) và `9a9ed28` (go-live-13) là commit của luồng khác đổ vào giữa phiên; tôi không commit dòng nào. |
| Status | `READY_FOR_AUDIT` |
| Started / updated | `2026-08-31` |

## 1. Outcome Summary

Nguyên nhân gốc đã xác nhận bằng đo, không phải suy đoán. `app/globals.css` chỉ khai token ở dạng **có** tiền tố họ trong khối `@theme` của Tailwind v4 (`--color-surface`), trong khi các file `.tsx` gọi tên **không** tiền tố (`var(--surface)`). Theo chuẩn CSS, `var()` trỏ vào custom property chưa định nghĩa làm **cả khai báo** trở thành invalid-at-computed-value-time: `background-color` rơi về `initial` (trong suốt) và shorthand `border-bottom` sụp thành `none` (mất vạch kẻ). Một nguyên nhân duy nhất giải thích đủ ba triệu chứng Owner chụp: popup trong suốt, bảng phẳng không kẻ, nút publish trắng-trên-trắng.

Cách sửa: một lớp tương thích `:root` gồm 22 alias đặt **sau** `@theme`, mỗi giá trị là `var(--color-…)` — không copy hex, nên vẫn chỉ có MỘT bảng màu (`DEC-02`, `DEC-03`). Cộng thêm: vòng focus toàn cục, rào `prefers-reduced-motion`, sidebar active/hover, hover hàng bảng thay `hover:opacity-90`, shadow panel chi tiết, vùng chạm 44×44 px, và xoá một dòng scaffolding.

Bằng chứng RED trước GREEN có exit code thật: trước khi thêm alias, test tĩnh mới FAIL với **905 lượt tham chiếu không phân giải được** (`RED_EXIT=1`); sau khi thêm alias — thay đổi DUY NHẤT giữa hai lần chạy — `GREEN_EXIT=0`. Gate cuối: `typecheck` exit `0`; `test:unit` exit `0` với **1472 test / 98 file**; `build` exit `0`, `✓ Compiled successfully in 11.7s`. Diff nằm trọn trong allowlist mục 4.2: 13 file (12 tracked + 1 file test mới untracked), 101 insertions / 22 deletions.

Hai điểm tôi **không** làm và ghi ra để Tier 3 không phải tìm: hàng sidebar đang active **không** đổi nền khi hover (trắng trên `--color-primary` chỉ đạt 3.15:1, fail AA — §5 `D-02`), và pill ở `app/bod/page.tsx:129` **tụt tương phản** từ 3.00:1 xuống 2.05:1 vì nó nằm ngoài allowlist nên tôi không sửa (§5 `D-03`).

Không tự ghi audit verdict. Verdict thuộc Tier 3.

## 2. Execution Trace

| STEP | RQ | File / artifact / symbol | Result | Deviation |
|---|---|---|---|---|
| `STEP-01` | RQ-01, RQ-04 | quét `var(--tên)` trên mọi `.tsx` dưới `app/` + `src/`, đối chiếu tập tên khai trong `app/globals.css` | **905** lượt không phân giải được trên **22** tên = 879 lượt không fallback + 26 lượt có fallback. Con số 879 của contract là **tập con không-fallback**, khớp chính xác. Không có drift ⇒ không dừng. | CÓ — `D-01`: tập tên "đã định nghĩa" phải đọc từ HAI nguồn |
| `STEP-02` | RQ-04 | **TẠO** `src/shared/ui/design-tokens.static.test.ts` (152 dòng) | Chạy `npm run test:unit` TRƯỚC khi sửa CSS: `RED_EXIT=1`, `Test Files 1 failed \| 97 passed (98)`, `Tests 3 failed \| 1466 passed (1469)`, `AssertionError: expected [ …(905) ] to deeply equal []` | — |
| `STEP-03` | RQ-05 | cùng file test, describe `RQ-05/AC-04` | Negative fixture `var(--surface-khong-ton-tai)` bị phát hiện; positive control `var(--color-surface)` không bị phát hiện. Gate có răng. | — |
| `STEP-04` | RQ-01, RQ-02, RQ-03 | `app/globals.css` khối `:root` tại **dòng 126**, 22 khai báo | `GREEN_EXIT=0`, `Test Files 98 passed (98)`, `Tests 1469 passed (1469)`. Thay đổi duy nhất giữa RED và GREEN là khối alias. | — |
| `STEP-05` | — | bảng đối chiếu 26 chỗ có fallback | `FALLBACK_SITES_TOTAL=27`, `ROWS_ON_ALIAS_NAMES=26`, `ROWS_ON_COLOR_NAMES=1`. Bảng đầy đủ ở §3 `AC-15`. Không đổi một giá trị token nào để bù màu. | — |
| `STEP-06` | RQ-11, RQ-12 | `app/globals.css`: `:focus-visible` **dòng 190**, `@media (prefers-reduced-motion: reduce)` **dòng 204**, `.nav-item-lift:hover` **dòng 213** | Trước task: `focus-visible` = 0 hit, `prefers-reduced-motion` = 0 hit trên `git show HEAD:app/globals.css`. Khối giảm chuyển động (204) nằm SAU alias (126), SAU focus (190) và sau mọi utility ở điểm gọi. | — |
| `STEP-07` | RQ-08, RQ-13 | `src/shared/ui/role-guard/role-guard-layout.tsx` — 4 hunk, 14 dòng đổi | Active = `bg-[var(--color-primary-container)]` + vạch nhấn `shadow-[inset_3px_0_0_var(--color-primary)]`; hover = đổi nền + `hover:[transform:translateY(-1px)]`; `min-h-10` = 40 px; nút đăng xuất `h-11 w-11` = 44×44 px; `aria-label="Đăng xuất"` giữ nguyên (`:285`). Đồng thời các class palette **hardcode** ở HEAD (`bg-orange-50`, `text-orange-800`, `text-slate-700`, `hover:bg-slate-100`, `text-slate-500`) được thay bằng token — nên sidebar đổi màu trên **mọi** portal dùng shell này (admin, bod, vendor, ctv, worker), thuộc `RISK-08`. | CÓ — `D-02`: hàng active không đổi nền khi hover |
| `STEP-08` | RQ-09, RQ-10 | 8 file xoá `hover:opacity-90` + thêm hover cho bảng ở `app/admin/jobs/page.tsx` (3 bảng) và `app/admin/applications/page.tsx` | `grep -rn "hover:opacity-90" app/admin` = **0**. Mọi hàng dùng `transition-colors duration-150 ease-out hover:bg-[var(--color-surface-container)]`. Không `transform` trên hàng (`DEC-07`). | — |
| `STEP-09` | RQ-07, RQ-13, RQ-14 | `app/admin/applications/page.tsx:405` `shadow-2xl`; `:408` nút đóng `h-11 w-11`; `app/admin/staffing/page.tsx` xoá dòng scaffolding | `grep -c 'slice 4A' app/admin/staffing/page.tsx` = **0**. Panel dùng `shadow-2xl` của Tailwind thay vì literal rgba ⇒ không mã màu nào vào diff. | CÓ — `D-04`: shadow bằng utility, không bằng literal |
| `STEP-10` | RQ-15 | `npm run typecheck`, `npm run test:unit` — chạy KHÔNG qua pipe | `TSC_EXIT=0`; `UNIT_EXIT=0`, `Tests 1472 passed (1472)`, `Test Files 98 passed (98)`. 1464 sẵn có + 8 case mới = 1472 ≥ 1416 + 8. | — |
| `STEP-11` | RQ-15 | `npm run build` | `BUILD_EXIT=0`, `✓ Compiled successfully in 11.7s`. Warning `@import rules must precede all rules` là **có trước**: `@import` ở `globals.css:2`, byte-identical trong `git show HEAD:app/globals.css`; 78 dòng tôi thêm đều nằm sau dòng 109. Không `ENV_BLOCKED`. | — |
| `STEP-12` | RQ-15 | `git status --short`, `git diff --stat` | Phần của tôi: **12 file tracked + 1 untracked**, `101 insertions(+), 22 deletions(-)`. 5 entry bẩn của luồng khác có mặt trong cây — tôi KHÔNG chạm, KHÔNG stage, KHÔNG dọn (`RISK-13`). Liệt kê ở §3 `AC-17`. | — |
| `STEP-13` | — | file này | Không commit, không push, không deploy. | — |

## 3. Acceptance Evidence

Mọi lệnh dưới đây tôi chạy thật trong `c:\CodeApp\HrP`. Lệnh `git`/`grep` chạy trong Bash (Git for Windows); `npm` và `verify-task.ps1` chạy trong PowerShell. Exit code của lane test/typecheck/build lấy **không qua pipe** (`RISK-12`): output redirect vào file tạm bằng `cmd /c "… > <file> 2>&1"` rồi đọc `$LASTEXITCODE` — nên biến exit code là của `npm`, không phải của `tail`.

| AC | Command / check | Exit / result | Evidence summary | Limitation |
|---|---|---|---|---|
| **gate** | `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-v5-go-live-10-admin-ui-repair\TASK.md` | `RESULT: PASS`, `VERIFY_TASK_EXIT=0` | `TASK CONTRACT CHECK … RESULT: PASS. TASK contract is ready for execution.` | — |
| `AC-01` | `sed -n '126,148p' app/globals.css \| grep -c '^  --'` rồi `sed -n '126,148p' app/globals.css \| grep -c '#'` | `22` và `0` | Khối `:root` mở tại `app/globals.css:126`, đúng 22 khai báo, mỗi dòng khớp `/^--[a-z0-9-]+:\s*var\(--color-[a-z0-9-]+\);$/`, không ký tự `#` nào. Test tĩnh cũng khẳng định lại cả ba điều này lẫn vị trí (sau `@theme` ở `:8`, trước `.material-symbols-outlined`). | — |
| `AC-02` | `git diff --numstat -- app/globals.css` | `78	0	app/globals.css` | Cột deletions = **0** ⇒ không phá dòng nào trong `globals.css`. | — |
| `AC-03` | `cmd /c "npm run test:unit > %TEMP%\hrp-g10-red.txt 2>&1"` (trước STEP-04) rồi `cmd /c "npm run test:unit > %TEMP%\hrp-g10-green.txt 2>&1"` (sau STEP-04) | RED `1` → GREEN `0` | RED: `Tests 3 failed \| 1466 passed (1469)`, `AssertionError: expected [ …(905) ] to deeply equal []` tại `design-tokens.static.test.ts:86`, cộng hai lần `expected [] to have a length of 1 but got +0` (khối `:root` chưa tồn tại). GREEN: `Test Files 98 passed (98)`, `Tests 1469 passed (1469)`. Thay đổi duy nhất giữa hai lần chạy là khối alias ⇒ Tier 3 tái lập được bằng cách xoá riêng khối 126–147. | Lúc RED file test có **5** case (describe a/b/c); 3 case của describe d thêm ở STEP-06, nên tổng 1469 → 1472. Con số RED không so trực tiếp với con số cuối. |
| `AC-04` | đọc `src/shared/ui/design-tokens.static.test.ts`, describe `RQ-05/AC-04` | 2 case pass | Case dương: chuỗi `var(--surface-khong-ton-tai)` PHẢI bị `findUnresolvedVarRefs` trả về. Case đối chứng: `var(--color-surface)` PHẢI không bị trả về. Nếu hàm phát hiện bị làm cho vô hại thì case dương đổ. | — |
| `AC-05` | `git diff -- <10 file overlay> \| grep -c '^+.*\(#ffffff\|#fff\b\|bg-white\)'` và `\| grep -c '^-.*rgba(0,0,0,0.4)'` | `0` và `0` | Không dòng thêm nào hardcode màu trắng; không dòng xoá nào chạm scrim `rgba(0,0,0,0.4)`. Popup sáng lên vì token đã phân giải, không vì tôi tô trắng. | — |
| `AC-06` | `git diff -- <10 file overlay> \| grep -c '^+.*opacity'` | `0` | Không thêm `opacity` ở bất kỳ đâu trong 10 file. | — |
| `AC-07` | `grep -n 'translateY\|transform' <10 file bảng> \| wc -l` | `0` | **Zero** hit trên toàn bộ 10 file ⇒ không cần chỉ ra hit nào thuộc phần tử nào, vì không có hit nào. Hàng bảng chỉ đổi `background-color` (`DEC-07`: `transform` trên `display: table-row` đánh nhau với `border-collapse` và sticky header). | — |
| `AC-08` | `grep -rn 'hover:opacity-90' app/admin \| wc -l` | `0` | Sạch hoàn toàn trong `app/admin`. Toàn repo còn **1** hit ở `app/vendor/page.tsx:196` — NGOÀI allowlist mục 4.2 nên tôi không sửa; ghi ở §5 `D-05`. | — |
| `AC-09` | `grep -n 'translateY(-1px)' src/shared/ui/role-guard/role-guard-layout.tsx` | 1 hit tại `:170` | Literal `hover:[transform:translateY(-1px)]` (không dùng `hover:-translate-y-px` vì AC đòi đúng chuỗi này). Vạch nhấn active: `shadow-[inset_3px_0_0_var(--color-primary)]`. **Duration thật = `duration-150` = `.15s` = 150 ms ≤ 200 ms** — đọc từ bundle đã biên dịch, không phải suy từ tên class; `ease-out` biên dịch thành `var(--ease-out)`. | — |
| `AC-10` | `grep -n 'focus-visible' app/globals.css`; `git show HEAD:app/globals.css \| grep -c 'focus-visible'`; `git diff \| grep -c 'outline: none'` | `190::focus-visible {` (3 hit, 2 là comment); trước = `0`; diff = `0` | `:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }` — 2 px dày, 2 px cách, dùng `var(--color-primary)`. Trước task này toàn file có **0** quy tắc focus. Không dòng nào thêm `outline: none`. | Trong `globals.css` có sẵn `outline: 0` ở `:230`, nằm trong vùng dead-CSS (từ `:219` tới EOF) mà `RISK-07` cấm chạm — không phải do tôi, và test tĩnh scope phép kiểm `outline: none|0` về đúng vùng tôi sở hữu (0 → `:219`). |
| `AC-11` | `grep -n 'prefers-reduced-motion' app/globals.css`; `git show HEAD:app/globals.css \| grep -c 'prefers-reduced-motion'` | `204:@media (prefers-reduced-motion: reduce) {`; trước = `0` | **Hai số AC đòi:** khối giảm chuyển động ở **dòng 204**, override `.nav-item-lift:hover { transform: none !important; }` ở **dòng 213**; quy tắc transition mà nó ghi đè là utility Tailwind ở điểm gọi `role-guard-layout.tsx:169–170` (`transition-[…] duration-150` + `hover:[transform:translateY(-1px)]`), và trong bundle CSS đã biên dịch khối `@media` được phát ra SAU các utility đó nên cùng độ đặc hiệu thì nó thắng. Alias ở 126 và focus ở 190 cũng đều nằm trước 204. | Không dùng `transform: none` cho `*`: nhiều overlay căn giữa bằng `translate`, reset trắng sẽ làm hộp thoại lệch tâm. Chỉ huỷ đúng cú nhấc 1 px. |
| `AC-12` | `grep -n 'aria-label' src/shared/ui/role-guard/role-guard-layout.tsx app/admin/applications/page.tsx`; `git diff -- <13 file> \| grep -c '^-.*aria-label'` | 8 hit còn nguyên; `1` dòng xoá | **Phép tính px từ bundle**, không suy từ tên class: bundle có `--spacing:.25rem` ⇒ `min-h-10` = 10 × .25rem = 2.5rem = **40 px** (hàng sidebar, `role-guard-layout.tsx:169`); `h-11 w-11` = 11 × .25rem = 2.75rem = **44 px** cho nút đăng xuất (`:286`) và nút đóng panel (`applications/page.tsx:408`). `DEC-11`: 24×24 là AA, 44×44 là AAA/Apple. Dòng `aria-label` bị xoá duy nhất là chính nút đóng được thay, và bản thay mang **nguyên** `aria-label='Đóng'` ⇒ không nhãn nào mất. `aria-label="Đăng xuất"` (`:285`), `aria-label="Menu chính"` (`:158`, `:203`) còn nguyên. | — |
| `AC-13` | `git diff -- <13 file> \| grep -c '^[+-].*fetch('`; rồi lọc mọi dòng thay đổi có dấu tiếng Việt, bỏ comment CSS | `0`; còn đúng **2** dòng | Không một lời gọi `fetch(` nào bị thêm/xoá ⇒ không đổi đường dẫn API, không đổi hành vi. Hai dòng có chữ tiếng Việt: (1) `- <button onClick={onClose} aria-label='Đóng' className='p-1 rounded hover:bg-black/10' …>` — dòng bị thay, chuỗi hiển thị `Đóng` được giữ y nguyên ở dòng thêm; (2) `- Module M3 — slice 4A (moment 02:10–03:10)` — **dòng scaffolding duy nhất bị xoá**, đúng ngoại lệ RQ-14 cho phép. | Phép đo phải scope về 13 file của tôi: `git diff` không lọc path còn kéo theo `public/index.html` và 4 file `docs/tasks/**` của luồng khác. |
| `AC-14` | `grep -c 'slice 4A' app/admin/staffing/page.tsx` | `0` (grep exit 1 = no match) | Chuỗi scaffolding đã biến mất; cả thẻ `<p>` bọc nó cũng xoá để không để lại wrapper rỗng. | — |
| `AC-16` | `cmd /c "npm run typecheck > %TEMP%\hrp-g10-tsc.txt 2>&1"`; `cmd /c "npm run test:unit > %TEMP%\hrp-g10-final.txt 2>&1"` | `TSC_EXIT=0`; `UNIT_EXIT=0` | `tsc --noEmit` không phát một lỗi nào. `Test Files 98 passed (98)`, `Tests 1472 passed (1472)` = 1464 sẵn có + 8 case mới ≥ ngưỡng `1416 + 8`. Số **file** pass ở cả RED và final đều là 98 ⇒ không file test nào bị loại khỏi lane. Lane canonical là `npm run test:unit`, KHÔNG phải `npx vitest run` (`RISK-11`: lane trần đọc `DATABASE_URL` từ `.env`). | — |
| `AC-18` | `git diff \| grep -c 'CREATE POLICY\|GRANT\|ALTER TABLE\|set_config'`; `git diff --stat` | `0`; không path nào bắt đầu bằng `prisma/` hay `app/api/` | Không SQL, không đổi quyền, không chạm schema hay route. | — |
| `AC-19` | `git rev-parse --short HEAD`; `git rev-parse --short origin/main`; `git rev-list --count origin/main..HEAD` | `9a9ed28`; `9a9ed28`; `0` | `origin/main..HEAD` rỗng ⇒ không commit, không push. Deploy thuộc Owner. | **Đính chính phép đo:** lần đầu tôi chạy `git rev-parse --short HEAD origin/main` (sai — `--short` nhận một revision) và `git log origin/main..HEAD --oneline \| wc -l` in `0` vì pipe che lỗi — đúng bẫy `RISK-12`. Số `0` cuối cùng lấy từ `git rev-list --count`, không qua pipe. |

### 3.1 `AC-15` — bảng đối chiếu 26 chỗ dùng `var(--tên, fallback)`

Đo bằng script throwaway đặt **ngoài repo** (`%TEMP%\hrp-g10-fallback.mjs`, chạy `node <script> c:/CodeApp/HrP`) để không làm bẩn worktree. Script phân giải chuỗi alias trong `app/globals.css` (`--surface` → `var(--color-surface)` → hex) rồi so với fallback đang hiển thị. Header đo được: `FALLBACK_SITES_TOTAL=27`, `ROWS_ON_ALIAS_NAMES=26`, `ROWS_ON_COLOR_NAMES=1` ⇒ **26 dòng khớp đúng con số STEP-01** (879 + 26 = 905), dòng thứ 27 là `app/(jobs)/track/page.tsx:102` gọi `--color-error` — tên **đã** định nghĩa từ trước, không thuộc defect này.

| # | Điểm gọi | Biến | Fallback đang hiển thị | Token sau khi phân giải | Khác? |
|---|---|---|---|---|---|
| 1 | `app/admin/applications/page.tsx:186` | `--on-primary` | `white` | `#ffffff` | cùng màu, khác cách viết |
| 2 | `app/admin/applications/page.tsx:193` | `--error` | `#dc2626` | `#ba1a1a` | KHÁC |
| 3 | `app/admin/applications/page.tsx:506` | `--error` | `#dc2626` | `#ba1a1a` | KHÁC |
| 4 | `app/admin/commission/ledger/page.tsx:215` | `--on-primary` | `white` | `#ffffff` | cùng màu, khác cách viết |
| 5 | `app/admin/commission/policies/page.tsx:131` | `--on-primary` | `white` | `#ffffff` | cùng màu, khác cách viết |
| 6 | `app/admin/commission/policies/page.tsx:275` | `--on-primary` | `white` | `#ffffff` | cùng màu, khác cách viết |
| 7 | `app/admin/jobs/page.tsx:307` | `--on-primary` | `white` | `#ffffff` | cùng màu, khác cách viết |
| 8 | `app/bod/page.tsx:129` | `--primary-container` | `transparent` | `#a63b00` | **KHÁC — hồi quy tương phản, xem `D-03`** |
| 9 | `app/worker/page.tsx:217` | `--on-surface` | `#1e293b` | `#1a1c1b` | KHÁC |
| 10 | `app/worker/page.tsx:218` | `--on-surface-variant` | `#64748b` | `#594138` | KHÁC |
| 11 | `app/worker/page.tsx:222` | `--surface-container` | `#f1f5f9` | `#efeeec` | KHÁC |
| 12 | `app/worker/page.tsx:235` | `--primary` | `#2563eb` | `#f26522` | KHÁC |
| 13 | `app/worker/page.tsx:235` | `--on-surface-variant` | `#64748b` | `#594138` | KHÁC |
| 14 | `app/worker/page.tsx:276` | `--primary` | `#2563eb` | `#f26522` | KHÁC |
| 15 | `app/worker/page.tsx:281` | `--primary` | `#2563eb` | `#f26522` | KHÁC |
| 16 | `app/worker/page.tsx:286` | `--on-surface-variant` | `#64748b` | `#594138` | KHÁC |
| 17 | `app/worker/page.tsx:295` | `--on-surface-variant` | `#94a3b8` | `#594138` | KHÁC |
| 18 | `app/worker/page.tsx:326` | `--on-surface-variant` | `#64748b` | `#594138` | KHÁC |
| 19 | `app/worker/page.tsx:376` | `--on-surface-variant` | `#94a3b8` | `#594138` | KHÁC |
| 20 | `src/domains/applications/placement-panel.tsx:104` | `--on-primary` | `white` | `#ffffff` | cùng màu, khác cách viết |
| 21 | `src/domains/applications/placement-panel.tsx:127` | `--error` | `#dc2626` | `#ba1a1a` | KHÁC |
| 22 | `src/domains/applications/placement-panel.tsx:168` | `--error` | `#dc2626` | `#ba1a1a` | KHÁC |
| 23 | `src/domains/applications/placement-panel.tsx:192` | `--error` | `#dc2626` | `#ba1a1a` | KHÁC |
| 24 | `src/domains/applications/placement-panel.tsx:354` | `--on-primary` | `white` | `#ffffff` | cùng màu, khác cách viết |
| 25 | `src/domains/applications/placement-panel.tsx:364` | `--error` | `#dc2626` | `#ba1a1a` | KHÁC |
| 26 | `src/domains/applications/placement-panel.tsx:415` | `--on-primary` | `white` | `#ffffff` | cùng màu, khác cách viết |

Đọc bảng: script so **chuỗi**, nên 9 dòng `white` → `#ffffff` bị đánh KHÁC dù là **cùng một màu**; tôi đổi cột đó thành "cùng màu, khác cách viết" cho khỏi đọc sai. Ba nhóm lệch thật: `--error` từ đỏ Tailwind `#dc2626` sang đỏ G27 `#ba1a1a` (7 chỗ, cùng sắc, đúng hướng thống nhất bảng màu); 9 chỗ ở `app/worker/page.tsx` chuyển từ xám-lạnh/xanh Tailwind (`#1e293b`, `#64748b`, `#94a3b8`, `#f1f5f9`, `#2563eb`) sang bảng ấm G27 — đúng hướng mong muốn, đây chính là lý do task tồn tại; và dòng 8 là hồi quy thật, ghi ở §5. **Tôi không đổi một giá trị token nào để bù màu**, đúng lệnh STEP-05.

### 3.2 `AC-17` — phạm vi diff

`git diff --stat` **giới hạn về 13 file của tôi**: `12 files changed, 101 insertions(+), 22 deletions(-)` (file thứ 13 là test mới, untracked nên không vào `--stat`).

| File | +/− | Thuộc allowlist 4.2 |
|---|---|---|
| `app/globals.css` | `78 +` | có |
| `src/shared/ui/role-guard/role-guard-layout.tsx` | `14 ±` | có |
| `app/admin/applications/page.tsx` | `6 ±` | có |
| `app/admin/jobs/page.tsx` | `6 ±` | có |
| `app/admin/staffing/page.tsx` | `5 ±` | có |
| `app/admin/{workers,clients,vendors,projects,users,payroll,tickets}/page.tsx` | `2 ±` mỗi file | có |
| `src/shared/ui/design-tokens.static.test.ts` | mới, 152 dòng, `??` | có |

`git status --short` lúc viết HANDOFF: **17 dòng tracked-modified + 33 dòng untracked**. Của tôi là 12 trong 17 dòng tracked, cộng đúng 1 trong 33 dòng untracked (`?? src/shared/ui/design-tokens.static.test.ts`).

**5 entry bẩn KHÔNG phải của tôi**, có trong cây từ trước hoặc do luồng khác ghi giữa phiên — tôi không chạm, không stage, không dọn (`RISK-13`): `docs/tasks/hrp-v5-go-live-02-public-surface-exposure/AUDIT.md`, `docs/tasks/hrp-v5-go-live-04-public-read-rls-closure/AUDIT.md`, `docs/tasks/hrp-v5-go-live-12-public-job-detail-page/TASK.md` (Tier 1 bump v1.1 giữa phiên), `docs/tasks/hrp-v5-go-live-13-tracking-pii-mask/AUDIT.md`, `public/index.html`. 32 dòng untracked còn lại là `scratch/**`, `docs/aff_plan*.md`, `.neon`, `fix.patch`, `rls-probe-*.txt`, `scripts/debug-parser.mjs` — đã có trước khi tôi bắt đầu, không phải sản phẩm của task này.

File đối chứng `app/admin/commission/policies/page.tsx` (có bảng, **ngoài** allowlist) không bị chạm — xác nhận tôi không sửa quét đại. Nothing staged: `git status --short` không có dòng nào ở dạng `M ` (cột đầu), toàn bộ đều là ` M` (working tree).

Artifact thứ 14 là chính file này, `docs/tasks/hrp-v5-go-live-10-admin-ui-repair/HANDOFF.md` — untracked, do `STEP-13` yêu cầu. Mục 4.2 không liệt kê nó vì nó là sản phẩm bắt buộc của quy trình, không phải mã.

## 4. Changed Deliverables

| Loại | Nội dung |
|---|---|
| Source | 13 file: `app/globals.css` (+78/−0); `src/shared/ui/role-guard/role-guard-layout.tsx` (14 dòng, 4 hunk); `app/admin/applications/page.tsx`, `app/admin/jobs/page.tsx`, `app/admin/staffing/page.tsx`, `app/admin/workers/page.tsx`, `app/admin/clients/page.tsx`, `app/admin/vendors/page.tsx`, `app/admin/projects/page.tsx`, `app/admin/users/page.tsx`, `app/admin/payroll/page.tsx`, `app/admin/tickets/page.tsx`; **mới**: `src/shared/ui/design-tokens.static.test.ts` (152 dòng). |
| Dependency | Không. Không thêm/xoá/nâng package nào; `package.json` và lockfile không bị chạm. |
| Schema / migration | Không. `AC-18` = 0 hit SQL, không path `prisma/`. |
| Environment / config | Không. Không sửa `.env*`, không provision Vercel/Upstash/DNS, không đọc hay in giá trị bí mật nào. |
| Git diff / commit | **Chưa tạo commit.** `git rev-list --count origin/main..HEAD` = `0`; `HEAD` = `origin/main` = `9a9ed28`. Không commit, không push, không deploy — deploy là hành động của Owner. |

## 5. Deviations / Limitations / Blockers

| ID | Loại | Nội dung | Vì sao | Ai quyết |
|---|---|---|---|---|
| `D-01` | Deviation (đã được phê chuẩn giữa phiên — ruling "A") | Tập tên "đã định nghĩa" của gate tĩnh đọc từ **hai** nguồn: khai báo trong `app/globals.css` **∪** tên xuất hiện ở `variable: '--…'` trong source. | `--font-bvp` và `--font-inter` do `next/font` bơm vào lúc runtime qua `variable: '--font-bvp'`, nên chúng **đúng** là vắng mặt trong `globals.css` — mà `globals.css` lại *tham chiếu* chúng trong `--font-head/body/label`, nên khai lại sẽ thành vòng lặp. Cả hai nguồn đều đọc bằng máy từ source, không có allowlist viết tay ⇒ gate không bị làm mềm. Nếu chỉ đọc một nguồn thì gate FAIL vĩnh viễn vì một lượt hợp lệ. | Đã có ruling "A" giữa phiên; ghi lại để Tier 3 kiểm chính hàm `collectFontVariableNames` chứ không tin lời văn. |
| `D-02` | Deviation có lý do | Hàng sidebar **đang active** không đổi nền khi hover; nó chỉ giữ vạch nhấn + cú nhấc 1 px. Hàng không active mới đổi nền. | Tính tay tương phản: trắng trên `--color-primary` `#f26522` = **3.15:1**, fail AA cho chữ nhỏ; token đậm hơn duy nhất là `#a63b00` — chính là màu nền active hiện tại nên hover sẽ **không nhìn thấy khác biệt**. Chọn giữ đọc được thay vì thêm một hiệu ứng vô hình. Trắng trên `#a63b00` = 6.46:1, pass AA — nên nền active giữ nguyên là an toàn. | Tier 1 / Owner nếu muốn ưu tiên hiệu ứng hơn tương phản. |
| `D-03` | **Hồi quy đã bộc lộ, ngoài allowlist — tôi KHÔNG sửa** | `app/bod/page.tsx:129`: pill dùng `background: var(--primary-container, transparent)` cùng `color: var(--primary)`. Trước sửa nền là `transparent` ⇒ `#f26522` trên nền trang, ~**3.00:1**. Sau alias nền thành `#a63b00` ⇒ `#f26522` trên `#a63b00` = **2.05:1**, chữ 12 px. Tệ hơn trước. | `app/bod/page.tsx` **không** nằm trong allowlist mục 4.2, và `RISK-08` bắt bộc lộ chứ không bắt sửa. Sửa lén = scope creep. | **Tier 1 / Owner**: cần một task nhỏ đổi `color` của pill đó sang `--on-primary-container`, hoặc bỏ `primary-container` khỏi nền. |
| `D-04` | Deviation nhỏ | Panel chi tiết ở `app/admin/applications/page.tsx:405` dùng `shadow-2xl` của Tailwind thay vì `box-shadow` rgba tự viết. | `RQ-06` cấm mã màu literal trong dòng thêm. `shadow-2xl` do Tailwind cấp nên không có literal nào vào diff, và đo được: `git diff` grep literal màu trên dòng thêm (bỏ comment) = **0**. | — |
| `D-05` | Limitation ngoài phạm vi | Còn **1** `hover:opacity-90` sống ở `app/vendor/page.tsx:196`. | Ngoài allowlist. `AC-08` chỉ đòi sạch trong `app/admin` và điều đó đạt (0 hit). | Tier 1 nếu muốn mở scope. |
| `D-06` | Side effect a11y, đã bộc lộ | Vòng focus toàn cục **không nằm trong layer** của Tailwind nên nó **thắng cả** những nơi đang đặt `outline-none` có sẵn. Đo bằng `grep -rn 'outline-none' app src`: `app/(portal)/home/page.tsx` **6**, `app/login/login-form.tsx` **2**, `src/shared/ui/data-table/data-table.tsx` **2**, `src/shared/ui/entity-card/entity-card.tsx` **2** — tổng **12 chỗ / 4 file**. Các ô nhập và ô bảng ở đó giờ có vòng focus. | Đây là cải thiện a11y thật (WCAG 2.4.7), nhưng nó đổi hình ảnh của trang đăng nhập, trang chủ portal và mọi bảng dùng `data-table`/`entity-card` — không được che. Tôi **không** sửa 12 chỗ đó: chúng ngoài allowlist, và xoá `outline-none` ở điểm gọi là việc của một task dọn riêng. | Owner xác nhận về mặt thẩm mỹ nếu muốn. |
| `D-07` | Risk đã bộc lộ, không sửa | Vùng chạm to lên: hàng sidebar **36 → 40 px** (HEAD là `px-2.5 py-2 text-sm` = 20 px line-height + 16 px padding = 36 px; giờ `min-h-10` = 40 px), nút đăng xuất **28 → 44 px** (HEAD là `p-1.5` + icon `h-4 w-4` = 6+16+6 = 28 px; giờ `h-11 w-11` = 44 px). Footer là `absolute bottom-0` trên một `<nav>` không cuộn ⇒ trên viewport rất thấp có nguy cơ footer chồng lên mục cuối. | Class của `<nav>`/`<aside>` (chỗ phải thêm `overflow-y-auto` hoặc đổi sang flex column) **ngoài** allowlist. | **Tier 1**: nên mở follow-up cho khung `<nav>`/`<aside>`, không phải cho các mục bên trong. |
| `L-01` | Limitation về bản chất bằng chứng | Mọi bằng chứng của task này là **tĩnh** (đọc file, đọc bundle CSS đã biên dịch, exit code). Tôi **không** chứng minh được bằng máy rằng trình duyệt vẽ đúng — repo có 0 file `*.test.tsx` và không có lane DOM/e2e. | Đây cũng là bài học đã ghi của go-live-12: đừng viết AC đòi thao tác trình duyệt trong repo không có lane. | **Owner**: bước OP cuối là mở `/admin/applications`, `/admin/jobs`, `/admin/staffing` và xác nhận popup không còn trong suốt, bảng có kẻ, nút publish đọc được. |
| `L-02` | Limitation về đo | Warning `@import rules must precede all rules` lúc build là **có trước**, không do tôi: `@import` ở `globals.css:2` byte-identical với `git show HEAD:app/globals.css`, còn 78 dòng tôi thêm đều sau dòng 109. | — | — |
| — | **Blocker** | Không có. | — | — |

## 6. Evidence Index

| Artifact | Nội dung |
|---|---|
| `%TEMP%\hrp-g10-red.txt` (1069 dòng) | `npm run test:unit` **trước** khi thêm alias — `RED_EXIT=1`, 3 fail, `expected [ …(905) ] to deeply equal []` |
| `%TEMP%\hrp-g10-green.txt` | ngay **sau** khi thêm alias — `GREEN_EXIT=0`, `Tests 1469 passed (1469)` |
| `%TEMP%\hrp-g10-tsc.txt` | `npm run typecheck` — `TSC_EXIT=0` |
| `%TEMP%\hrp-g10-final.txt` | `npm run test:unit` cuối — `UNIT_EXIT=0`, `Tests 1472 passed (1472)`, `Test Files 98 passed (98)` |
| `%TEMP%\hrp-g10-build.txt` | `npm run build` — `BUILD_EXIT=0`, `✓ Compiled successfully in 11.7s` |
| `%TEMP%\hrp-g10-fallback.mjs` | script dựng bảng `AC-15`; đặt ngoài repo để không làm bẩn worktree. Chạy lại: `node "%TEMP%\hrp-g10-fallback.mjs" c:/CodeApp/HrP` |
| `%TEMP%\hrp-g10-dirty-before.txt`, `…-dirty-after.txt` | `git status --short` trước/sau, dùng để cô lập delta của tôi khỏi file bẩn luồng khác |
| `src/shared/ui/design-tokens.static.test.ts` | gate sống trong repo — 8 case / 4 describe; chạy trong lane `npm run test:unit`, nên defect này không thể tái phát im lặng |

Bằng chứng nằm ở `%TEMP%` là log chạy, cố ý **không** đưa vào repo (`RQ-14`/`.ai-pipeline`: không tạo tài liệu evidence riêng trong repo). Mọi lệnh trong §3 đều chạy lại được từ cây làm việc hiện tại và cho cùng con số.

## 7. Execution Round History

| Round | Spec | Kết quả | Ghi chú |
|---|---|---|---|
| 1 | `v1.0` | `READY_FOR_AUDIT` | STEP-01..STEP-13 xong. RED→GREEN có exit code thật. Gate cuối: typecheck `0`, test `0` (1472), build `0`. Không commit. 7 deviation/side-effect + 2 limitation đã bộc lộ ở §5; `D-03` là hồi quy tương phản ngoài allowlist cần Tier 1 xử. |

> Handoff status: READY_FOR_AUDIT
