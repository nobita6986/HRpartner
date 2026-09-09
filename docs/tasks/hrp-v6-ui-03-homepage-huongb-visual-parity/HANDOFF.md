# HANDOFF — `hrp-v6-ui-03-homepage-huongb-visual-parity`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-03-homepage-huongb-visual-parity` |
| Spec version | `v1.4` |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` |
| Execution round | `0` (Tier 2 chưa khởi động; Owner verdict MC-01 v1.4: KHÔNG chạy verify-handoff cho HANDOFF tiền thực thi nếu parser không hỗ trợ round 0) |
| Baseline | `eda2602` (commit chứa Owner mandate); execution baseline commit = `d3f3503` (commit `docs(ui-03): TASK v1.4 + HANDOFF READY_FOR_EXECUTION (Owner MC closeout)` — commit cuối cùng chứa trạng thái `READY_FOR_EXECUTION`, theo Owner Authorization §2 v1.4) |
| Status | `READY_FOR_EXECUTION` (Owner verdict MC-01 v1.4 — Tier 1 mechanical closeout; giao Tier 2 ngay, không trình Owner contract lần nữa) |

## 1. Outcome and changed surface

- **Delivered:** TASK.md v1.3 — contract đầy đủ cho 7 section theo code.html, 13 RQ, 12 STEP, 10 AC. Đã sửa theo Owner verdict 09/09 22:50 ICT (correction round 3, 6 P0/Precision fix): P0-01 Outcome 5 sửa theo DEC-04/RQ-05 (bỏ `recruiter`/`positionCount`); xóa RISK-01 + `top-companies-section.tsx` khỏi OBR-02. P0-02 route thật `/login`, `/ve-chung-toi`, `/ctv-portal` là anchor element link thật; chỉ `Công ty`, `Tin tức`, CTA `Đăng ký` (và 3 mục Footer) mới button disabled; Tier 1 chốt `Cộng tác viên` = `/ctv-portal` (KHÔNG scroll section). P0-03 bỏ Playwright khỏi RQ-11/AC-07/HANDOFF/E-06/E-07, chỉ Edge CDP. P0-04 AC-02/RQ-11 mở rộng (bbox phụ + cặp actual/ref + overlay + CDP `getComputedStyle` markers + Owner visual sign-off bắt buộc). P0-05 KHÔNG ép `exit 1` — so baseline đầu/cuối round. Precision #1 RQ-03 logo Job Card = `HrMonogram` (PublicJobDto không có logo). Precision #2 AC-03 + CDP interaction smoke load-more/detail/apply. Precision #3 chuẩn hóa evidence `ac02-`/`ac08-`.
- **Not delivered:** Thi công Tier 2, visual capture, gates, audit — chưa bắt đầu (Execution round = 0).
- **Changed:** N/A — đang ở giai đoạn hợp đồng sau correction round 3.
- **Lane escalation:** No.

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| -- | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/TASK.md` | `RESULT: PASS` | None |
| AC-01 | E-01 (Edge CDP `querySelectorAll('[data-section]')` so khớp 7 khối `nav|hero|bestjobs|areas|recruiting|ctv|footer`) | `pending — Tier 2` | None |
| AC-02 | E-02 (`powershell evidence/scripts/section-bbox-cdp.ps1` — Edge CDP `Runtime.evaluate` lấy `getBoundingClientRect()` x/y/w/h + `getComputedStyle()` markers ở cả actual + reference; mask vùng data; tolerance per marker — bbox chỉ là bằng chứng phụ, phép đo chính là `getComputedStyle` + Owner visual sign-off) | `pending — Tier 2` | None |
| AC-03 | E-03 (`curl -fs "http://localhost:3000/api/jobs?keyword=test&area=B%E1%BA%AFc+Ninh"`; `rg "shift" src/domains/job-board/components/landing/hero.tsx` expect 0 match; `powershell evidence/scripts/cdp-interaction-smoke.ps1` — Edge CDP load-more (offset/nextOffset) + click detail navigate `/viec-lam/{slug}` + click CTA `Ứng tuyển` trên homepage mở ApplyModal) | `pending — Tier 2` | None |
| AC-04 | E-04 (`powershell evidence/scripts/cdp-measure-mobile.ps1` qua Edge CDP Runtime.evaluate; expect `window.innerWidth === document.documentElement.scrollWidth` tại viewport 390×844 + deviceScaleFactor=1) | `pending — Tier 2` | None |
| AC-05 | `rg -n "lh3\.googleusercontent\|companyName" src/ app/ docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/evidence/ac05-scope-diff.txt` (expect 0 match ngoài allowlist) | `pending — Tier 2` | None |
| AC-06 | `rg -n "17\.800\|13\.000\.000\|\+10\.000\.000\|\+50\.000\.000\|10\.000\.000 VNĐ\|50\.000\.000 VNĐ" src/domains/job-board/components/landing/ "app/(portal)/page.tsx"` (expect 0 match) | `pending — Tier 2` | None |
| AC-07 | E-06 (`powershell evidence/scripts/cdp-recruiting-check.ps1` qua Edge CDP Runtime.evaluate: đếm `[data-testid^="recruiting-card-"]` ≤ 4, suffix = `job.id` thật; text content KHÔNG chứa 3 chuỗi bị cấm; HRP monogram 64×64 px qua `getBoundingClientRect()`) | `pending — Tier 2` | None |
| AC-08 | E-07 (`powershell evidence/scripts/section-screenshots-cdp.ps1` chụp đúng 20 PNG qua Edge CDP `Page.captureScreenshot`, expect đúng 20 file PNG thật: 4 main + 14 section + 1 overlay + 1 data-fixture) | `pending — Tier 2` | None |
| AC-09 | E-08 (`npm run typecheck` exit 0; `npm run test:unit -- public-card-truth` exit 0; `npm run test:unit` đo baseline đầu round ghi `evidence/ac09-unit-test-baseline.txt` + cuối round ghi `evidence/ac09-unit-test.txt`; cuối round **cùng expected failure set với baseline + new failure count = 0**, exit code cuối = baseline exit code, KHÔNG ép `1`; `npm run build` exit 0; `verify-handoff.ps1` RESULT: PASS) | `pending — Tier 2` | None |
| AC-10 | E-09 (Edge CDP Runtime.evaluate đếm interactive elements visible + grep utility `hrp-focus` trong landing components + GlobalNavbar/Footer; expect ≥ 1 match per interactive type) | `pending — Tier 2` | None |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/TASK.md` | `RESULT: PASS` | `evidence/verify-task.txt` |
| `E-02` | `powershell evidence/scripts/section-bbox-cdp.ps1` (AC-02) — Edge CDP Runtime.evaluate `getBoundingClientRect()` x/y/width/height từng section ở cả actual + reference + `getComputedStyle()` markers (background-color, font-family, font-size, font-weight, line-height, border-radius, box-shadow, color, padding, gap); bbox là phụ, phép đo chính là `getComputedStyle` + Owner visual sign-off | width/height ±4 px, font-size ±2 px, border-radius ±2 px, color/background-color exact RGB | `evidence/ac02-section-bbox.txt` + `evidence/ac02-section-markers.txt` + 4 PNG `ac02-{desktop,mobile}-{actual,reference}.png` (4 trong 20 PNG ở AC-08) |
| `E-03` | `powershell evidence/scripts/cdp-interaction-smoke.ps1` (AC-03) — Edge CDP load-more (offset/nextOffset) + click job title navigate `/viec-lam/{slug}` + click CTA `Ứng tuyển` trên homepage mở ApplyModal | load-more trả row mới khi `nextOffset` khác null, URL = `/viec-lam/{slug}` sau click, ApplyModal render | `evidence/ac03-interaction-smoke.txt` |
| `E-04` | `powershell evidence/scripts/cdp-measure-mobile.ps1` (AC-04) — Edge CDP Runtime.evaluate đo `window.innerWidth`, `documentElement.scrollWidth`, `hasHorizontalScroll` tại viewport 390×844 + deviceScaleFactor=1 | `scrollWidth === innerWidth === 390` | `evidence/ac04-cdp-measure.txt` |
| `E-05` | `rg -n "lh3\.googleusercontent\|companyName" src/ app/` ghi vào file (AC-05) | 0 match ngoài allowlist | `evidence/ac05-scope-diff.txt` |
| `E-06` | Edge CDP `Runtime.evaluate` đếm `[data-testid^="recruiting-card-"]` (AC-07) — không dùng Playwright; đếm text content KHÔNG chứa 3 chuỗi bị cấm; kiểm HRP monogram 64×64 px qua `getBoundingClientRect()` | ≤ 4 card, không text bị cấm | `evidence/ac07-recruiting-check.txt` |
| `E-07` | `powershell evidence/scripts/section-screenshots-cdp.ps1` (AC-08) — Edge CDP `Page.captureScreenshot` chụp đúng 20 PNG: 4 main + 14 section + 1 overlay + 1 data-fixture | đúng 20 file PNG đặt tên `ac08-*.png` (magic bytes, đúng viewport, non-zero size); số file chỉ là integrity gate, Owner visual sign-off vẫn là quyết định parity cuối cùng | `evidence/ac08-screenshots.txt` |
| `E-08` | `npm run typecheck`; `npm run test:unit -- public-card-truth`; `npm run test:unit` (baseline đầu round; final cuối round); `npm run build`; `verify-handoff.ps1` (AC-09) — baseline đo ngay đầu execution round, KHÔNG dùng `git checkout eda2602`; cuối round cùng expected failure set + new failure count = 0 | exit codes theo baseline, KHÔNG ép `1` | `evidence/ac09-{typecheck,build,unit-test-baseline,unit-test,verify-handoff}.txt` |
| `E-09` | Edge CDP Runtime.evaluate đếm interactive elements visible + `rg "hrp-focus" src/domains/job-board/components/landing/ src/domains/job-board/components/hr-monogram.tsx app/components/Global*.tsx` (AC-10) | ≥ 1 match per interactive type | `evidence/ac10-cdp-interactive.txt` + `evidence/ac10-hrp-focus.txt` |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `BLK-01` | RESOLVED | **Owner verdict v1.2 → REVISION_REQUIRED** (09/09 22:50 ICT, correction round 3); Tier 1 sửa trong TASK.md v1.3; Owner verdict v1.3 mechanical closeout (09/09 22:55 ICT) — Tier 1 đã áp dụng MC-01 đến MC-06, bump `v1.4`, status `READY_FOR_EXECUTION`. | None — đã mechanical closeout, giao Tier 2. |

## 5. Final status

**READY_FOR_EXECUTION** (Owner verdict 09/09 22:55 ICT mechanical closeout v1.4 — Tier 1 áp dụng MC-01 đến MC-06, bump `v1.4`, đổi status thành `READY_FOR_EXECUTION`, giao Tier 2 ngay, KHÔNG trình Owner contract lần nữa). `verify-task.ps1` RESULT: PASS (TASK contract v1.4 hợp lệ). Sau khi Tier 2 thi công xong, Tier 1 vẫn phải trình Owner cặp actual/reference PNG + overlay thật trước khi Tier 3 focused audit (Owner vẫn giữ visual PASS).

> Handoff status: READY_FOR_EXECUTION

**Note về `verify-handoff.ps1` v1.4:** `verify-handoff.ps1` exit 2 với 3 lỗi cố ý — đúng theo Owner verdict MC-01 v1.4: parser `verify-handoff.ps1` không hỗ trợ `Execution round = 0` (H-03) và không nằm trong allowed list `[READY_FOR_REVIEW|READY_FOR_AUDIT|BLOCKED|IN_PROGRESS]` (H-10). Owner rõ ràng: "Không chạy verify-handoff.ps1 cho một HANDOFF tiền thực thi nếu parser không hỗ trợ round 0; tuyệt đối không khai sai trạng thái để làm gate xanh". Tier 2 sẽ đổi status sang allowed value và bump `Execution round` ≥ 1 khi thật sự khởi động execution round; evidence `evidence/verify-handoff.txt` ghi FAIL đầy đủ với lý do (xem dòng "RESULT: FAIL (3 error(s), 1 warning(s))"). Đây là intentional FAIL, không phải contract defect.
