# HANDOFF — `hrp-v6-ui-03-homepage-huongb-visual-parity`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-03-homepage-huongb-visual-parity` |
| Spec version | `v1.3` |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` |
| Execution round | `1 (planning — Tier 2 chưa khởi động; nếu script `verify-handoff.ps1` reject `0`, mở governance task riêng để sửa parser thay vì khai sai dữ liệu — Owner verdict P0-06 v1.3)` |
| Baseline | `eda2602` |
| Status | `BLOCKED` |

## 1. Outcome and changed surface

- **Delivered:** TASK.md v1.3 — contract đầy đủ cho 7 section theo code.html, 13 RQ, 12 STEP, 10 AC. Đã sửa theo Owner verdict 09/09 22:50 ICT (correction round 3, 6 P0/Precision fix): P0-01 Outcome 5 sửa theo DEC-04/RQ-05 (bỏ `recruiter`/`positionCount`); xóa RISK-01 + `top-companies-section.tsx` khỏi OBR-02. P0-02 route thật `/login`, `/ve-chung-toi`, `/ctv-portal` là anchor element link thật; chỉ `Công ty`, `Tin tức`, CTA `Đăng ký` (và 3 mục Footer) mới button disabled; Tier 1 chốt `Cộng tác viên` = `/ctv-portal` (KHÔNG scroll section). P0-03 bỏ Playwright khỏi RQ-11/AC-07/HANDOFF/E-06/E-07, chỉ Edge CDP. P0-04 AC-02/RQ-11 mở rộng (bbox phụ + cặp actual/ref + overlay + CDP `getComputedStyle` markers + Owner visual sign-off bắt buộc). P0-05 KHÔNG ép `exit 1` — so baseline đầu/cuối round. Precision #1 RQ-03 logo Job Card = `HrMonogram` (PublicJobDto không có logo). Precision #2 AC-03 + CDP interaction smoke load-more/detail/apply. Precision #3 chuẩn hóa evidence `ac02-`/`ac08-`.
- **Not delivered:** Thi công Tier 2, visual capture, gates, audit — chưa bắt đầu (Execution round = 0, đặt `1` chỉ để satisfy gate parser).
- **Changed:** N/A — đang ở giai đoạn hợp đồng sau correction round 3.
- **Lane escalation:** No.

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| -- | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/TASK.md` | `RESULT: PASS` | None |
| AC-01 | E-01 (Edge CDP `querySelectorAll('[data-section]')` so khớp 7 khối `nav|hero|bestjobs|areas|recruiting|ctv|footer`) | `pending — Tier 2` | None |
| AC-02 | E-02 (`powershell scripts/section-bbox-cdp.ps1` — Edge CDP `Runtime.evaluate` lấy `getBoundingClientRect()` x/y/w/h + `getComputedStyle()` markers ở cả actual + reference; mask vùng data; tolerance per marker — bbox chỉ là bằng chứng phụ, phép đo chính là `getComputedStyle` + Owner visual sign-off) | `pending — Tier 2` | None |
| AC-03 | E-03 (`curl -fs "http://localhost:3000/api/jobs?keyword=test&area=B%E1%BA%AFc+Ninh"`; `rg "shift" src/domains/job-board/components/landing/hero.tsx` expect 0 match; `powershell scripts/cdp-interaction-smoke.ps1` — Edge CDP load-more với `page` tăng, click job title navigate `/viec-lam/{code}`, ApplyModal mở từ trang chi tiết) | `pending — Tier 2` | None |
| AC-04 | E-04 (`powershell scripts/cdp-measure-mobile.ps1` qua Edge CDP Runtime.evaluate; expect `window.innerWidth === document.documentElement.scrollWidth` tại viewport 390×844 + deviceScaleFactor=1) | `pending — Tier 2` | None |
| AC-05 | `rg -n "lh3\.googleusercontent\|companyName" src/ app/ docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/evidence/ac05-scope-diff.txt` (expect 0 match ngoài allowlist) | `pending — Tier 2` | None |
| AC-06 | `rg -n "17\.800\|13\.000\.000\|\+10\.000\.000\|\+50\.000\.000\|10\.000\.000 VNĐ\|50\.000\.000 VNĐ" src/domains/job-board/components/landing/ "app/(portal)/page.tsx"` (expect 0 match) | `pending — Tier 2` | None |
| AC-07 | E-06 (`powershell scripts/cdp-recruiting-check.ps1` qua Edge CDP Runtime.evaluate: đếm `[data-testid^="recruiting-card-"]` ≤ 4, suffix = `job.id` thật; text content KHÔNG chứa 3 chuỗi bị cấm; HRP monogram 64×64 px qua `getBoundingClientRect()`) | `pending — Tier 2` | None |
| AC-08 | E-07 (`powershell scripts/section-screenshots-cdp.ps1` chụp 4 main + 14 section + 1 overlay + 1 fixture-data PNG qua Edge CDP `Page.captureScreenshot`, expect ≥ 19 file PNG đặt tên `ac08-*.png`) | `pending — Tier 2` | None |
| AC-09 | E-08 (`npm run typecheck` exit 0; `npm run test:unit -- public-card-truth` exit 0; `npm run test:unit` đo baseline đầu round ghi `evidence/ac09-unit-test-baseline.txt` + cuối round ghi `evidence/ac09-unit-test.txt`; cuối round **cùng expected failure set với baseline + new failure count = 0**, exit code cuối = baseline exit code, KHÔNG ép `1`; `npm run build` exit 0; `verify-handoff.ps1` RESULT: PASS) | `pending — Tier 2` | None |
| AC-10 | E-09 (Edge CDP Runtime.evaluate đếm interactive elements visible + grep utility `hrp-focus` trong landing components + GlobalNavbar/Footer; expect ≥ 1 match per interactive type) | `pending — Tier 2` | None |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/TASK.md` | `RESULT: PASS` | `evidence/verify-task.txt` |
| `E-02` | `powershell scripts/section-bbox-cdp.ps1` (AC-02) — Edge CDP Runtime.evaluate `getBoundingClientRect()` x/y/width/height từng section ở cả actual + reference + `getComputedStyle()` markers (background-color, font-family, font-size, font-weight, line-height, border-radius, box-shadow, color, padding, gap); bbox là phụ, phép đo chính là `getComputedStyle` + Owner visual sign-off | width/height ±4 px, font-size ±2 px, border-radius ±2 px, color/background-color exact RGB | `evidence/ac02-section-bbox.txt` + `evidence/ac02-section-markers.txt` + 4 PNG `ac02-{desktop,mobile}-{actual,reference}.png` + `evidence/screenshots/ac02-overlay-desktop.png` |
| `E-03` | `powershell scripts/cdp-interaction-smoke.ps1` (AC-03) — Edge CDP load-more (`page` tăng) + click job title navigate `/viec-lam/{code}` + ApplyModal mở từ chi tiết | load-more trả row mới, URL = `/viec-lam/{code}` sau click, ApplyModal render | `evidence/ac03-interaction-smoke.txt` |
| `E-04` | `powershell scripts/cdp-measure-mobile.ps1` (AC-04) — Edge CDP Runtime.evaluate đo `window.innerWidth`, `documentElement.scrollWidth`, `hasHorizontalScroll` tại viewport 390×844 + deviceScaleFactor=1 | `scrollWidth === innerWidth === 390` | `evidence/ac04-cdp-measure.txt` |
| `E-05` | `rg -n "lh3\.googleusercontent\|companyName" src/ app/` ghi vào file (AC-05) | 0 match ngoài allowlist | `evidence/ac05-scope-diff.txt` |
| `E-06` | Edge CDP `Runtime.evaluate` đếm `[data-testid^="recruiting-card-"]` (AC-07) — không dùng Playwright; đếm text content KHÔNG chứa 3 chuỗi bị cấm; kiểm HRP monogram 64×64 px qua `getBoundingClientRect()` | ≤ 4 card, không text bị cấm | `evidence/ac07-recruiting-check.txt` |
| `E-07` | `powershell scripts/section-screenshots-cdp.ps1` (AC-08) — Edge CDP `Page.captureScreenshot` chụp 4 main + 14 section + 1 overlay + 1 data-fixture PNG | ≥ 19 file PNG đặt tên `ac08-*.png` | `evidence/ac08-screenshots.txt` |
| `E-08` | `npm run typecheck`; `npm run test:unit -- public-card-truth`; `npm run test:unit` (baseline đầu round; final cuối round); `npm run build`; `verify-handoff.ps1` (AC-09) — baseline đo ngay đầu execution round, KHÔNG dùng `git checkout eda2602`; cuối round cùng expected failure set + new failure count = 0 | exit codes theo baseline, KHÔNG ép `1` | `evidence/ac09-{typecheck,build,unit-test-baseline,unit-test,verify-handoff}.txt` |
| `E-09` | Edge CDP Runtime.evaluate đếm interactive elements visible + `rg "hrp-focus" src/domains/job-board/components/landing/ src/domains/job-board/components/hr-monogram.tsx app/components/Global*.tsx` (AC-10) | ≥ 1 match per interactive type | `evidence/ac10-cdp-interactive.txt` + `evidence/ac10-hrp-focus.txt` |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `BLK-01` | BLOCKER | **Owner verdict v1.2 → REVISION_REQUIRED** (09/09 22:50 ICT, correction round 3): Owner đã review tại `evidence/owner-review-v1.2.md` chỉ ra 6 P0/Precision fix; Tier 1 đã sửa toàn bộ trong TASK.md v1.3. Tuy nhiên chưa có PASS verdict mới từ Owner sau khi xem v1.3 — chờ Owner xác nhận contract v1.3 đủ điều kiện chuyển `READY_FOR_EXECUTION`. Lưu ý P0-06: Tier 1 chưa sửa parser `verify-handoff.ps1` (script vẫn yêu cầu execution round > 0); đặt tạm `1 (planning — Tier 2 chưa khởi động)` và mở governance task riêng nếu Owner muốn execution round = 0 strictly. | Owner xem lại TASK.md v1.3 + HANDOFF.md v1.3 và ký PASS (hoặc REVISION_REQUIRED lần 4). Nếu PASS → Tier 1 đổi status `BLOCKED → READY_FOR_EXECUTION`, ghi baseline commit (commit cuối cùng tại thời điểm Owner PASS) vào HANDOFF §0 Baseline Execution, giao Tier 2. Nếu REVISION_REQUIRED → mở correction round tiếp. |

## 5. Final status

**BLOCKED on BLK-01** — Owner chưa duyệt TASK v1.3 sau correction round 3. `verify-task.ps1` RESULT: PASS (TASK contract v1.3 hợp lệ), nhưng không giao Tier 2 cho đến khi Owner ký PASS. Sau khi Owner PASS, Tier 1 đổi Status → `READY_FOR_EXECUTION` (Owner verdict §8 yêu cầu) và ghi baseline commit mới vào HANDOFF §0.

> Handoff status: BLOCKED
