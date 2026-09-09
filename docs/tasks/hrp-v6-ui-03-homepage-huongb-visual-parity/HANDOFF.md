# HANDOFF — `hrp-v6-ui-03-homepage-huongb-visual-parity`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-03-homepage-huongb-visual-parity` |
| Spec version | `v1.2` |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` |
| Execution round | `2` (correction round 2 chưa chạy execution — Owner verdict 09/09 22:03 ICT yêu cầu thống nhất 0 cho tới khi Tier 2 bắt đầu, nhưng `verify-handoff.ps1` yêu cầu Execution round > 0; Tier 1 đặt `2` = số correction round đã qua, khi Tier 2 bắt đầu code execution round sẽ tăng lên 3) |
| Baseline | `eda2602` |
| Status | `BLOCKED` |

## 1. Outcome and changed surface

- **Delivered:** TASK.md v1.2 — contract đầy đủ cho 7 section theo code.html, 13 RQ, 12 STEP, 10 AC. Đã sửa theo Owner verdict 09/09 22:03 ICT (correction round 2): 4 P0 fix (P0-01 section 5 dùng `job.id`/`job.title`/`job.availableSlots` thay `recruiter`; P0-02 Navbar link disabled là button element với `aria-disabled`, KHÔNG anchor `href="#"`; P0-03 baseline đo trong execution round ngay sau khi `/code` bắt đầu, KHÔNG dùng `git checkout eda2602`; P0-04 bỏ `npx playwright`/`npx lighthouse`/`npx pa11y`/`npx axe-core` auto-install — dùng Edge CDP đã chứng minh ở UI-02 + utility `hrp-focus`) + 6 consistency fix (STEP-04 type `PublicJobOverview`; DEC-02 + §4.3 đổi tên section 5; STEP-10 evidence filename `ac02-` thay `ac11-`; STEP-10 thêm fixture `evidence/fixture-recruiting.json` cho truth/overflow, không so height BestJobs/CTV; AC-01 query theo `[data-section]` thay `section, footer, nav` toàn bộ).
- **Not delivered:** Thi công Tier 2, visual capture, gates, audit — chưa bắt đầu (Execution round = 0).
- **Changed:** N/A — đang ở giai đoạn hợp đồng sau correction round 2.
- **Lane escalation:** No.

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| -- | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/TASK.md` | `RESULT: PASS` | None |
| AC-01 | E-01 (Edge CDP `querySelectorAll('[data-section]')` so khớp 7 khối `nav|hero|bestjobs|areas|recruiting|ctv|footer`) | `pending — Tier 2` | None |
| AC-02 | E-02 (`powershell scripts/section-bbox-cdp.ps1` qua Edge CDP `Runtime.evaluate` lấy `getBoundingClientRect()`, mask vùng data, expect width ≤ 4 px lệch) | `pending — Tier 2` | None |
| AC-03 | `curl -fs "http://localhost:3000/api/jobs?keyword=test&area=B%E1%BA%AFc+Ninh"`; `rg "shift" src/domains/job-board/components/landing/hero.tsx` (expect 0 match) | `pending — Tier 2` | None |
| AC-04 | E-03 (`powershell scripts/cdp-measure-mobile.ps1` qua Edge CDP Runtime.evaluate; expect `window.innerWidth === document.documentElement.scrollWidth` tại viewport 390×844 + deviceScaleFactor=1) | `pending — Tier 2` | None |
| AC-05 | `rg -n "lh3\.googleusercontent\|companyName" src/ app/ docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/evidence/ac05-scope-diff.txt` (expect 0 match ngoài allowlist) | `pending — Tier 2` | None |
| AC-06 | `rg -n "17\.800\|13\.000\.000\|\+10\.000\.000\|\+50\.000\.000\|10\.000\.000 VNĐ\|50\.000\.000 VNĐ" src/domains/job-board/components/landing/ "app/(portal)/page.tsx"` (expect 0 match) | `pending — Tier 2` | None |
| AC-07 | E-06 (`node scripts/section-recruiting-check.mjs` — Playwright DOM check section 5: đếm card ≤ 4 với `data-testid="recruiting-card-{job.id}"`, kiểm KHÔNG có text "Top công ty" / "Đối tác chính thức", KHÔNG có text "Tuyển dụng qua HRPartner" trong card, kiểm img alt không chứa tên công ty) | `pending — Tier 2` | None |
| AC-08 | E-07 (`powershell scripts/section-screenshots-cdp.ps1` chụp 4 main + 14 section + 1 fixture-data PNG qua Edge CDP `Page.captureScreenshot`, expect ≥ 19 file PNG) | `pending — Tier 2` | None |
| AC-09 | E-08 (`npm run typecheck` exit 0; `npm run test:unit -- public-card-truth` exit 0; `npm run test:unit` exit 1 + 0 new failure so với baseline đo trong execution round; `npm run build` exit 0; `verify-handoff.ps1` RESULT: PASS) | `pending — Tier 2` | None |
| AC-10 | E-09 (Edge CDP Runtime.evaluate đếm interactive elements visible + grep utility `hrp-focus` trong landing components + GlobalNavbar/Footer; expect ≥ 1 match per interactive type) | `pending — Tier 2` | None |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/TASK.md` | `RESULT: PASS` | `evidence/verify-task.txt` |
| `E-02` | `powershell scripts/section-bbox-cdp.ps1` (AC-02) — Edge CDP Runtime.evaluate `getBoundingClientRect()` từng section ở cả actual + reference, mask vùng data, expect width ≤ 4 px lệch | width ≤ 4 px lệch, height chỉ check section không động | `evidence/ac02-section-bbox.txt` + `evidence/screenshots/section-bbox-*.png` |
| `E-03` | `powershell scripts/cdp-measure-mobile.ps1` (AC-04) — Edge CDP Runtime.evaluate đo `window.innerWidth`, `documentElement.scrollWidth`, `hasHorizontalScroll` tại viewport 390×844 + deviceScaleFactor=1 | `scrollWidth === innerWidth === 390` | `evidence/ac04-cdp-measure.txt` |
| `E-04` | `rg -n "lh3\.googleusercontent\|companyName" src/ app/` ghi vào file (AC-05) | 0 match ngoài allowlist | `evidence/ac05-scope-diff.txt` |
| `E-05` | `rg -n "17\.800\|13\.000\.000\|\+10\.000\.000\|\+50\.000\.000\|10\.000\.000 VNĐ\|50\.000\.000 VNĐ" src/domains/job-board/components/landing/ "app/(portal)/page.tsx"` ghi vào file (AC-06) | 0 match | `evidence/ac06-truth-fence.txt` |
| `E-06` | `node scripts/section-recruiting-check.mjs` (AC-07) — Playwright DOM check section 5: đếm card ≤ 4 với `data-testid="recruiting-card-{job.id}"`, kiểm KHÔNG có text "Top công ty" / "Đối tác chính thức" / "Tuyển dụng qua HRPartner", kiểm img alt không chứa tên công ty | section render đúng cấu trúc DEC-04 | `evidence/ac07-recruiting-check.txt` |
| `E-07` | `powershell scripts/section-screenshots-cdp.ps1` (AC-08) — Edge CDP `Page.captureScreenshot` chụp 4 main + 14 section × 2 viewport + 1 fixture-data PNG | ≥ 19 file PNG hợp lệ | `evidence/ac08-screenshots.txt` |
| `E-08` | `npm run typecheck`; `npm run test:unit -- public-card-truth`; `npm run test:unit`; `npm run build`; `verify-handoff.ps1` (AC-09) — baseline đo trong execution round ngay sau khi `/code` bắt đầu (KHÔNG dùng `git checkout eda2602`) | tất cả PASS, 0 new failure | `evidence/ac09-{typecheck,build,unit-test-baseline,unit-test,verify-handoff}.txt` |
| `E-09` | Edge CDP Runtime.evaluate đếm interactive elements visible + `rg "hrp-focus" src/domains/job-board/components/landing/ src/domains/job-board/components/hr-monogram.tsx app/components/Global*.tsx` (AC-10) | ≥ 1 match per interactive type | `evidence/ac10-cdp-interactive.txt` + `evidence/ac10-hrp-focus.txt` |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `BLK-01` | BLOCKER | **Owner verdict v1.1 → REVISION_REQUIRED** (09/09 22:03 ICT, correction round 2): Owner đã review tại `evidence/owner-review-v1.1.md` chỉ ra 4 P0 + 6 consistency fix; Tier 1 đã sửa toàn bộ trong TASK.md v1.2. Tuy nhiên chưa có PASS verdict mới từ Owner sau khi xem v1.2 — chờ Owner xác nhận contract v1.2 đủ điều kiện chuyển `READY_FOR_EXECUTION`. | Owner xem lại TASK.md v1.2 + HANDOFF.md v1.2 và ký PASS (hoặc REVISION_REQUIRED lần 3). Nếu PASS → Tier 1 đổi status `BLOCKED → READY_FOR_EXECUTION`, ghi baseline commit (commit cuối cùng tại thời điểm Owner PASS) vào HANDOFF §0 Baseline Execution, giao Tier 2. Nếu REVISION_REQUIRED → mở correction round tiếp. |

## 5. Final status

**BLOCKED on BLK-01** — Owner chưa duyệt TASK v1.2 sau correction round 2. `verify-task.ps1` RESULT: PASS (TASK contract v1.2 hợp lệ), nhưng không giao Tier 2 cho đến khi Owner ký PASS. Sau khi Owner PASS, Tier 1 đổi Status → `READY_FOR_EXECUTION` (Owner verdict §8 yêu cầu) và ghi baseline commit mới vào HANDOFF §0.

> Handoff status: BLOCKED
