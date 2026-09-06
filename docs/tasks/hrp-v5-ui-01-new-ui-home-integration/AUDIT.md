# AUDIT — hrp-v5-ui-01-new-ui-home-integration

## 0. Audit Control

| Field | Value |
| --- | --- |
| Task slug | `hrp-v5-ui-01-new-ui-home-integration` |
| Spec version | `v1.1` |
| Execution round | `2` |
| Audit round | `1` |
| Auditor | Tier 3 (độc lập, không sửa mã / test / contract) |
| Audit time | `2026-09-06 03:40 +07:00` |
| Baseline SHA | `b68d25b051d45cbe2497a7cf45c8b0deabb60ba2` |
| HEAD lúc audit | `b68d25b051d45cbe2497a7cf45c8b0deabb60ba2` (không đổi) |
| Nguồn đọc | `TASK.md` v1.1, `HANDOFF.md` round 2, cây làm việc và index |
| Lane đo | `npm run test:unit` (lane canonical, không dùng lane trần) |
| Verdict | `CONDITIONAL` |

Nguyên tắc của vòng này: mọi con số dưới đây do Tier 3 tự chạy lại, không chép từ
`HANDOFF.md`. Chỗ nào số của tôi khác bản giao thì được ghi thành finding. Artifact
của riêng Tier 3 nằm ở `docs/tasks/hrp-v5-ui-01-new-ui-home-integration/evidence/`
với tiền tố `audit-round1-`.

## 1. Findings

### AUD-001 — AC-13 hụt nửa mã thoát, quy trách KHÔNG thuộc ui-01 (P2, OPEN)

- Hiện tượng: `npm run test:unit` cho `2 failed` và `1681 passed` trên `1683`,
  `1 failed` và `109 passed` trên `110` tệp, `LANE_EXIT=1`
  (`evidence/audit-round1-lane.txt`).
- Cả hai test đỏ nằm trong một tệp duy nhất
  `src/shared/toolchain/tsc-program-boundary.static.test.ts`, thông điệp
  `expected [ '.claude' ] to deeply equal []`.
- Quy trách bằng bốn phép đo (`evidence/audit-round1-ac13-attribution.txt`):
  1. `git cat-file -e b68d25b:src/shared/toolchain/tsc-program-boundary.static.test.ts`
     → exit `128`, thông điệp "exists on disk, but not in 'b68d25b'": tệp đỏ
     KHÔNG tồn tại ở baseline mà AC-13 lấy làm mốc.
  2. `git log --oneline -- <tệp đó>` → `0` dòng: chưa từng được commit.
  3. `git status --porcelain -- <tệp đó>` → `A `: đang stage bởi luồng khác.
  4. `docs/tasks/hrp-v5-rf-05-tsc-program-boundary/TASK.md` dòng `16` khai đúng
     tệp ấy là Module của task rf-05, không phải của ui-01.
- Phản chứng đo được, không phải suy diễn: dựng lại thuật toán phân loại theo
  kiểu chỉ-đọc cho ra `UNCLASSIFIED_H1_AS_SHIPPED=[".claude"]` và
  `UNCLASSIFIED_H2_WITH_CLAUDE_CLASSIFIED=[]`; toàn bộ tệp của ui-01 đều được
  phân loại, `UI01_ROOTS_ALL_IN_PROGRAM_ROOTS=True` (ui-01 chỉ sống dưới `app`
  và `src`). Kiểm kê `.claude`: `3715` tệp `.ts/.tsx`, cả `3715` nằm trong
  `.claude/worktrees/`, `0` tệp ngoài đó.
- Số học của lane khớp với kết luận trên: `107` tệp test có ở baseline, cộng `2`
  tệp hàng rào toolchain của luồng khác thành `109` (mốc `STEP-02` xanh, exit
  `0`), cộng `1` hàng rào mới của ui-01 thành `110` như hiện nay.
- Ảnh hưởng: AC-13 là AC blocking nên không thể tuyên PASS toàn phần, nhưng
  không có defect nào nằm trong năm Module của ui-01.
- Cần Planner quyết (Tier 3 không tự chọn, cũng không tự bump contract): (a) waive
  nửa mã thoát dựa trên chính phép quy trách này và neo AC-13 vào ĐỒNG NHẤT TẬP
  test đỏ sau khi loại tệp của luồng khác; hoặc (b) Owner dọn worktree phụ rồi
  Tier 2 đo lại lane, không sửa một dòng nào của ui-01; hoặc (c) mở contract cho
  luồng rf-05 để phân loại thư mục `.claude`.

### AUD-002 — Tiền đề "worktree KHOÁ" của contract không đúng (P3, OPEN)

- `git worktree list --porcelain` cho hai worktree, cả hai ở `b68d25b`, và bản
  ghi cho worktree phụ KHÔNG có dòng `locked` nào
  (`evidence/audit-round1-ac13-attribution.txt`).
- `TASK.md` AC-14 và `HANDOFF.md` LIM-01 đều mô tả nó là worktree đã khoá. Sai
  tiền đề này làm phương án (b) của AUD-001 bị đánh giá đắt hơn thực tế.
- Tier 3 tuân R-05 nên chỉ đọc metadata của registry, không chạm vào cây đó.

### AUD-003 — AC-01 gọi số DÒNG là "token riêng biệt" (P3, OPEN)

- Lệnh mà AC-01 chỉ định trả `82` và tôi đo lại đúng `82`, nên AC-01 PASS. Nhưng
  `82` là số DÒNG khai báo, không phải số tên riêng biệt: đếm lần khai được `90`,
  tên riêng biệt được `89` (`--color-primary` khai hai lần), baseline `75` dòng.
- Bảy dòng mới sinh `14` khoá vì cú pháp size-với-line-height của DEC-13, đúng
  như ASM-01 sau DEC-14 ghim. Đây là nợ từ vựng của contract, không phải defect
  của bản giao.

### AUD-004 — Index đang chở `288` path, `272` path ngoài phạm vi task (P2, OPEN)

- `git diff --cached --name-only` cho `288` dòng; ngoài `docs/tasks/<slug>/` còn
  `272` path, gồm `256` path thuộc thư mục task khác, `5` path Module của ui-01
  và `11` path nguồn/cấu hình của luồng khác (hai hàng rào toolchain,
  `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, một spec browser,
  `package.json`, `package-lock.json`, `.gitignore`, `docs/V6`,
  `docs/PLANNER_HANDOVER.md`).
- Không phải lỗi phạm vi của Tier 2: AC-16 chỉ ràng buộc phần Tier 2 chạm, và
  phần đó đúng. Nhưng nếu Tier 1 commit không kèm pathspec thì commit sẽ nuốt cả
  `272` path kia. Khuyến nghị `git commit -- <pathspec>` và đọc diffstat trước
  khi push.

### AUD-005 — `TASK.md` trong index vẫn là `v1.0` (P3, OPEN)

- `git status --porcelain` cho `AM` trên `TASK.md`; bản trong index khai
  `Spec version` là `v1.0`, bản trong cây khai `v1.1`
  (`evidence/audit-round1-gates.txt`). Nếu Tier 1 commit mà không stage lại thì
  lịch sử ghi contract cũ bên cạnh bản giao mới.

### AUD-006 — FND-01 của bản giao được xác nhận độc lập (P3, OPEN)

- `app/(portal)/ctv-portal/page.tsx` chứa đúng `1` ký tự U+FFFD, ở dòng `21`,
  trong nhãn đáng lẽ đọc là "Bước 4". Tệp này nằm NGOÀI `Modules` của ui-01 nên
  Tier 2 đúng khi không sửa; việc định tuyến sang task khác thuộc Tier 1.

### AUD-007 — Điểm mù `.claude` là nợ hệ thống, sẽ đỏ lại ở mọi vòng sau (P2, OPEN)

- `git check-ignore -v .claude` exit `1` (không bị ignore) trong khi
  `git status --porcelain -- .claude` chỉ gộp thành `?? .claude/`; danh sách
  `OUTSIDE_PROGRAM` của hàng rào toolchain chỉ liệt kê `new-ui`, `scratch`,
  `docs`.
- Cùng điểm mù ấy khiến lane lint toàn cục quét vào worktree phụ, nên AC-14 v1.1
  đã phải loại trừ bằng lời văn thay vì bằng cấu hình. Còn worktree nào tồn tại
  thì mọi vòng sau còn gặp lại đúng hai test đỏ này.

## 2. Acceptance Verification

| AC | Phép đo độc lập của Tier 3 | Kết quả | Bằng chứng | Finding |
| --- | --- | --- | --- | --- |
| AC-01 | `grep -cE` mẫu `^\s*--text-` trên `app/globals.css` → `7`; cắt khối `@theme` bằng `sed -n` rồi `grep -coE` mẫu neo hai gạch → `82`; đối chiếu baseline bằng `git show b68d25b:app/globals.css` → `75` dòng khai | PASS | `evidence/audit-round1-counts.txt` | AUD-003 (P3, chỉ là từ vựng của contract) |
| AC-02 | `grep -rhoF` lần lượt bảy tên lớp chữ mà DEC-13 cấm, trên năm tệp Module → bảy số `0`, tổng `0` | PASS | `evidence/audit-round1-counts.txt` | Không |
| AC-03 | `grep -rhoF 'text-on-background'` trên năm tệp Module → `0`; `grep -rhoF 'bg-surface-warm'` → `0` | PASS | `evidence/audit-round1-counts.txt` | Không |
| AC-04 | `npm run test:unit -- src/domains/job-board/public-ui-premium.static.test.ts` → `63 passed`, exit `0`; `git diff --cached -U0 -- app/globals.css` chỉ một hunk `@@ -105,0 +106,14 @@` nên dòng đích `106` nằm trước lát bị đóng băng, `--numstat` cho `14 0` | PASS | `evidence/audit-round1-hangars.txt` | Không |
| AC-05 | `grep -c` ba chuỗi mà DEC-11 chặn trên `app/globals.css` → `0`, `0`, và `1` lần duy nhất cho chuỗi được phép | PASS | `evidence/audit-round1-counts.txt` | Không |
| AC-06 | `npm run test:unit --` ba tệp hàng rào công khai cũ → `Test Files 3 passed`, `Tests 111 passed`, exit `0` | PASS | `evidence/audit-round1-hangars.txt` | Không |
| AC-07 | `grep -cE 'https?://'` từng tệp Module ở cây rồi ở `git show b68d25b:` cùng tệp → năm hiệu số đều `0`, tổng hiệu `0`; dòng `@import` của `app/globals.css` đếm `1` ở cả hai phía | PASS | `evidence/audit-round1-counts.txt` | Không |
| AC-08 | `grep -rhoE` bảy mẫu neo họ màu Tailwind thô trên năm tệp Module → bảy số `0` | PASS | `evidence/audit-round1-counts.txt` | Không |
| AC-09 | `grep -c 'Lương thương lượng'` trên tệp thẻ việc → `3`, vượt mốc tối thiểu; hai chuỗi cấm đo ở cây rồi ở `git show b68d25b:` cho `0` và `0`, rồi `2` và `2`, hiệu `0` | PASS | `evidence/audit-round1-counts.txt` | Không |
| AC-10 | `grep -rhoF` hai mốc lương giả trên năm tệp Module → `0` và `0`; `grep -rhoF '/ctv-portal'` → `5` lần, `grep -c` dạng thuộc tính liên kết → `1` liên kết thật | PASS | `evidence/audit-round1-counts.txt` | Không |
| AC-11 | `grep -c` trên `app/(portal)/page.tsx` → `ApplyModal` `2`, `SuccessModal` `3`, đường dẫn API việc làm `1`; `npm run test:unit --` hàng rào tồn kho marketplace → `25 passed`, exit `0` | PASS | `evidence/audit-round1-hangars.txt` | Không |
| AC-12 | Nửa XANH: `npm run test:unit -- src/domains/job-board/public-ui-token-parity.static.test.ts` → `14 passed`, exit `0`. Nửa ĐỎ dựng lại chỉ-đọc: `git show b68d25b:app/globals.css` rồi `grep -cE` mẫu `^\s*--text-` cho `0` trong khi hàng rào khẳng định bảy khoá ở dòng `282` và `289`, nên assertion không thể xanh ở baseline; artifact `evidence/step03-hangar-red.txt` ghi `4 failed` cùng `10 passed` và exit `1` | PASS | `evidence/audit-round1-hangars.txt` | Không |
| AC-13 | `npm run test:unit` → `2 failed` cùng `1681 passed` trên `1683` test, `1 failed` cùng `109 passed` trên `110` tệp, `LANE_EXIT=1`. Nửa ĐẾM đạt: mốc `1669` của `evidence/step02-tests-before.txt` cộng `14` test hàng rào mới bằng đúng `1683`. Nửa MÃ THOÁT không đạt; quy trách bằng bốn phép đo ở AUD-001 cho thấy tệp đỏ không có ở baseline, chưa từng commit, đang stage bởi luồng khác và được khai là Module của rf-05 | PARTIAL | `evidence/audit-round1-lane.txt` | AUD-001 (P2) |
| AC-14 | `npm run typecheck` → exit `0`, không diagnostic; `npx eslint app src` → `472 problems (0 errors, 472 warnings)`, exit `0` | PASS | `evidence/audit-round1-ac18-ac14.txt` | AUD-007 (P2, nợ cấu hình lint toàn cục) |
| AC-15 | `git status --porcelain -- new-ui` → đúng `1` dòng ở dạng chưa theo dõi; `git diff --cached --name-only -- new-ui` → `0` dòng, nên không byte nào của thư mục mẫu vào index | PASS | `evidence/audit-round1-counts.txt` | Không |
| AC-16 | `git status --porcelain` cho đúng năm path Module của ui-01 ở trạng thái đã stage, và `22` dòng dưới thư mục task, trong đó `6` là artifact do chính Tier 3 sinh nên `16` dòng thuộc Tier 2; trong `app/` và `src/` chỉ còn `3` path bẩn của luồng khác | PASS | `evidence/audit-round1-counts.txt` | AUD-004 (P2, về index chung, không về phạm vi Tier 2) |
| AC-17 | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-task.ps1` → `RESULT: PASS`, exit `0`; `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-handoff.ps1` → `RESULT: PASS`, exit `0`, với `H-05` đọc đủ `18` hàng AC | PASS | `evidence/audit-round1-gates.txt` | AUD-005 (P3, bản `TASK.md` trong index còn cũ) |
| AC-18 | `npm run test:unit -- src/shared/ui/internal-contrast.static.test.ts` → `21 passed`, exit `0`; `git diff HEAD -U0` trên tệp ấy chỉ một hunk `@@ -574,2 +574,16 @@`, `--numstat` cho `16 2`; đếm khai báo test bằng mẫu NEO (ký tự trước không phải chữ, số, gạch dưới, dấu chấm hay đô la) được `21` ở cây và `21` ở `git show b68d25b:` cùng tệp | PASS | `evidence/audit-round1-ac18-ac14.txt` | Không |

Tổng hợp: `17` AC PASS, `1` AC PARTIAL (AC-13), `0` AC FAIL, `0` AC BLOCKED.

### Deep Audit Checklist

| Check | Status | Evidence (command + exit + output) |
| --- | --- | --- |
| C-01 Regression toàn lane | DONE | `npm run test:unit` → `2 failed` cùng `1681 passed` trên `1683`, `LANE_EXIT=1`. Không một test nào của năm Module ui-01 đỏ: bốn hàng rào liên quan cho `63`, `111`, `25`, `14` và `21` test xanh. Vết đỏ duy nhất được quy trách sang tệp của luồng rf-05 ở AUD-001, nên đây là finding chứ không phải hồi quy của vòng này (`evidence/audit-round1-lane.txt`) |
| C-02 Build sản phẩm | SKIP | Lý do đo được: lệnh build của repo chạy `copy-static.mjs` làm bẩn `public/index.html`, phá chính phép đo phạm vi của AC-16, và bước prerender có thể mở kết nối tới cơ sở dữ liệu thật trong `.env`. Thay thế cùng mức biên dịch: `npm run typecheck` exit `0`, không diagnostic (`evidence/audit-round1-ac18-ac14.txt`) |
| C-03 Route handler | SKIP | Vòng này không thêm hay sửa route nào: `git status --porcelain -- app/api` trả `0` dòng (`evidence/audit-round1-counts.txt`) |
| C-04 Prisma và truy vấn | SKIP | Không có thay đổi lược đồ hay truy vấn: `git status --porcelain -- prisma` trả `0` dòng (`evidence/audit-round1-counts.txt`) |
| C-05 Tính bất biến POST và PATCH | SKIP | Không có endpoint ghi nào trong phạm vi, theo cùng phép đo `git status --porcelain -- app/api` bằng `0` ở C-03 |
| C-06 Migration và RLS | SKIP | `git status --porcelain -- prisma/migrations` trả `0` dòng, nên không có migration nào để kiểm và bề mặt RLS không bị chạm (`evidence/audit-round1-counts.txt`) |
| C-07 Vệ sinh git | DONE | `git rev-parse HEAD` → `b68d25b051d45cbe2497a7cf45c8b0deabb60ba2`, đúng baseline; `git diff --cached --name-only` → `288` path, trong đó `272` path ngoài thư mục task, ghi thành AUD-004. Tier 3 không commit, không push, không dùng cờ thêm-tất-cả (`evidence/audit-round1-counts.txt`) |
| C-08 Phủ test | DONE | Lane tăng từ mốc `1669` lên `1683` test, đúng `14` test của hàng rào mới; `git status --porcelain` cho tệp `public-ui-token-parity.static.test.ts` ở trạng thái thêm mới đã stage (`evidence/audit-round1-lane.txt`) |
| C-09 Cổng contract | DONE | `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-task.ps1` → `RESULT: PASS`, exit `0`; cổng bàn giao cũng `RESULT: PASS`, exit `0` (`evidence/audit-round1-gates.txt`) |
| C-10 Phạm vi diff so với baseline | DONE | `git diff --cached --numstat -- app/globals.css` → `14 0`; `git diff HEAD --numstat` trên hàng rào tương phản nội bộ → `16 2`; cả năm path thay đổi đều nằm trong danh sách `Modules` của contract (`evidence/audit-round1-hangars.txt`) |

## 3. Scope

- Phạm vi Tier 2 chạm đúng năm path Module: `app/globals.css`,
  `app/(portal)/page.tsx`, hai tệp thành phần dưới `src/domains/job-board/`, và
  `src/shared/ui/internal-contrast.static.test.ts`, cộng một tệp hàng rào mới.
  Không có path nào ngoài `Modules` bị thay đổi bởi vòng này.
- Không chạm bề mặt runtime nào: `0` path dưới `app/api`, `0` path dưới `prisma`.
  Rủi ro dữ liệu và rủi ro production của vòng này bằng không.
- Thay đổi là hình thức: bảy dòng token chữ thêm vào cuối khối `@theme` (dòng
  đích `106`, trước lát bị đóng băng bằng băm), cộng hai hàng ghim trong hàng rào
  tương phản nội bộ.
- Thư mục mẫu `new-ui` vẫn nằm ngoài git (`0` path vào index), đúng ý DEC-05.
- Vết bẩn còn lại trong cây thuộc luồng khác: `3` path dưới `app/` và `src/`,
  cộng `272` path ngoài thư mục task đang nằm sẵn trong index (AUD-004).

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
| --- | --- | --- | --- |
| `npm run test:unit` (lane canonical, chạy lại độc lập) | exit `1` | `2 failed` cùng `1681 passed` trên `1683` test, `1 failed` cùng `109 passed` trên `110` tệp; đúng mốc đếm `1683` mà AC-13 đòi | `evidence/audit-round1-lane.txt` |
| `npm run test:unit --` năm tệp hàng rào trong phạm vi | exit `0` cả năm | `63`, `111`, `25`, `14` và `21` test xanh; không một hàng rào nào của ui-01 đỏ | `evidence/audit-round1-hangars.txt` |
| `git cat-file -e b68d25b:src/shared/toolchain/tsc-program-boundary.static.test.ts` | exit `128` | Tệp mang hai test đỏ KHÔNG tồn tại ở baseline của ui-01; `git log --oneline` trên nó trả `0` dòng và `git status --porcelain` trả trạng thái thêm-mới-đã-stage của luồng khác | `evidence/audit-round1-ac13-attribution.txt` |
| Dựng lại chỉ-đọc thuật toán phân loại của hàng rào toolchain, cộng `git status --porcelain -- .claude`, `git check-ignore -v .claude` và `sed -n` trên `tsconfig.json` | exit `1` cho check-ignore | Danh sách chưa-phân-loại đúng bằng một phần tử là thư mục worktree; thêm phần tử ấy vào tập đã-phân-loại thì danh sách rỗng; `3715` tệp `.ts/.tsx` của `.claude` đều nằm trong `.claude/worktrees/`, `0` tệp ngoài | `evidence/audit-round1-ac13-attribution.txt`; giới hạn: chỉ đọc metadata, không mở và không sửa cây worktree theo R-05 |
| `npm run typecheck` rồi `npx eslint app src` | exit `0` và exit `0` | Không diagnostic biên dịch; lint cho `472 problems (0 errors, 472 warnings)`, tức không lỗi chặn | `evidence/audit-round1-ac18-ac14.txt` |
| `grep -cE` và `git show b68d25b:` đối chiếu từng tệp Module cho các AC đếm | exit `0` | Bảy dòng token chữ mới, `82` dòng khai trong `@theme` so với `75` ở baseline; toàn bộ mẫu bị cấm đều `0`; hiệu URL và hiệu chuỗi giá cấm đều `0` | `evidence/audit-round1-counts.txt` |
| `git diff --cached -U0 -- app/globals.css` và `git diff HEAD -U0` trên hàng rào tương phản | exit `0` | Mỗi tệp đúng một hunk, `14 0` và `16 2`; dòng đích `106` nằm trước lát bị băm đóng băng nên không phá hàng rào cũ | `evidence/audit-round1-hangars.txt` |
| `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-task.ps1` và `verify-handoff.ps1` | `RESULT: PASS`, exit `0` cả hai | Cổng contract và cổng bàn giao đều xanh; cổng bàn giao đọc đủ `18` hàng AC | `evidence/audit-round1-gates.txt` |
| `git worktree list --porcelain` và `git status --porcelain` trên `TASK.md` | exit `0` | Bản ghi worktree phụ không có dòng `locked`, trái tiền đề của contract (AUD-002); `TASK.md` ở trạng thái thêm-rồi-sửa với bản index còn khai phiên bản cũ (AUD-005) | `evidence/audit-round1-gates.txt` |
| `powershell -NoProfile -File ./.ai-pipeline/scripts/verify-audit.ps1` trên chính bản `AUDIT.md` đã stage | `RESULT: PASS WITH WARNINGS`, exit `0`, `1` cảnh báo | Cảnh báo duy nhất là `S-16`: index chở `272` path ngoài thư mục task, do luồng khác đặt vào từ trước; Tier 3 không được phép unstage nên vết vàng này được khai ở đây thay vì bị dập | `evidence/verify-audit-round1.txt` |

## 5. Coverage Gaps

- Nửa mã thoát của AC-13 không đo được thành XANH trong điều kiện hiện tại: lane
  vẫn trả `1` khi còn một worktree phụ trong cây. Tôi chỉ chứng minh được nguyên
  nhân nằm ngoài ui-01, không chứng minh được lane sẽ xanh, vì làm thế đòi dọn
  worktree của luồng khác.
- Nửa ĐỎ của AC-12 được dựng lại bằng phép đo trên baseline chứ không bằng cách
  tái tạo trạng thái đỏ: tôi không revert token để chạy lại hàng rào, nên bằng
  chứng RED-trước-GREEN của tôi là suy ra từ số `0` dòng token ở baseline cộng
  artifact `evidence/step03-hangar-red.txt` của Tier 2.
- Build sản phẩm không chạy (C-02), nên lớp lỗi chỉ xuất hiện lúc prerender chưa
  được loại trừ; chỗ thay thế là typecheck exit `0`.
- Không có phép đo trực quan nào: lane browser không thuộc phạm vi vòng này và
  spec browser trong cây là của luồng khác. Việc trang trông đúng như mẫu vẫn cần
  một lần nhìn mắt của Owner.
- Bề mặt `.claude/worktrees/` không được kiểm nội dung, chỉ đọc metadata, theo
  R-05.

## 6. Verdict

**Verdict:** CONDITIONAL

Lý do: `17` trên `18` AC đạt bằng phép đo độc lập, `0` AC FAIL, không có finding
P0 hay P1 nào. AC-13 chỉ hụt nửa mã thoát, và bốn phép đo quy trách cho thấy hai
test đỏ thuộc tệp của luồng rf-05, không có ở baseline, chưa từng commit, và
không liên quan tới bất kỳ path nào trong `Modules` của ui-01.

Điều kiện để Tier 1 chuyển sang ACCEPTED, cần Planner quyết chứ không phải Tier 3:

1. AUD-001: chọn một trong ba hướng đã nêu cho nửa mã thoát của AC-13. Tier 3
   không tự bump contract và không tự waive.
2. AUD-004 và AUD-005: commit bằng pathspec tường minh, đọc diffstat trước khi
   push, và stage lại `TASK.md` để lịch sử không ghi contract cũ.
3. AUD-002, AUD-006, AUD-007: ba nợ nhỏ cần định tuyến, một sang lời văn của
   contract, một sang task sửa ký tự hỏng, một sang cấu hình toolchain.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
| --- | --- | --- | --- | --- |
| 1 | AUD-001 | Mới mở ở vòng này | OPEN | Cần Planner Resolution; phép đo quy trách ở `evidence/audit-round1-ac13-attribution.txt` |
| 1 | AUD-002 | Mới mở ở vòng này | OPEN | `git worktree list --porcelain` không có dòng `locked`, ghi ở `evidence/audit-round1-gates.txt` |
| 1 | AUD-003 | Mới mở ở vòng này | OPEN | `89` tên riêng biệt so với `82` dòng khai, ghi ở `evidence/audit-round1-counts.txt` |
| 1 | AUD-004 | Mới mở ở vòng này | OPEN | `288` path trong index, `272` path ngoài thư mục task, ghi ở `evidence/audit-round1-counts.txt` |
| 1 | AUD-005 | Mới mở ở vòng này | OPEN | `git show` bản `TASK.md` trong index khai phiên bản cũ, ghi ở `evidence/audit-round1-gates.txt` |
| 1 | AUD-006 | Tier 2 khai FND-01 | OPEN | `grep` đếm đúng `1` ký tự U+FFFD ở dòng `21`, ghi ở `evidence/audit-round1-counts.txt` |
| 1 | AUD-007 | Mới mở ở vòng này | OPEN | `git check-ignore -v .claude` exit `1` và kiểm kê `3715` tệp, ghi ở `evidence/audit-round1-ac13-attribution.txt` |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.



