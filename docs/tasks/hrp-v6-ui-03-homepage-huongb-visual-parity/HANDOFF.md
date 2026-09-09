# HANDOFF — `hrp-v6-ui-03-homepage-huongb-visual-parity`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-03-homepage-huongb-visual-parity` |
| Spec version | `v1.4.1` |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` |
| Execution round | `1` |
| Implementation baseline | `7f83053` (commit `docs(ui-03): v1.4.1 consistency fix`; Tier 2 đặt làm `evidence/baseline-commit.txt`) |
| Implementation commit | `ca13a62` (`feat(ui-03): R1 visual parity implementation — 7-section homepage + nav/footer (BLOCKED at Owner sign-off)`) |
| Status | `BLOCKED` (3 blockers — Owner visual sign-off + Edge CDP runtime missing + 36 new failing tests so với baseline) |

## 1. Outcome and changed surface

- **Delivered:**
  - Implementation 7 section landing + nav + footer theo RQ-02..RQ-08 trong `ca13a62`:
    - Hero full-width orange với glass highlight + 3-filter search card (RQ-02)
    - BestJobsSection 3-col với `HrMonogram` 64×64 + `FeaturedJobCard` (RQ-03)
    - AreasSection 4 image-cards dùng asset pack `public/images/homepage-huongb/industrial-location-01..04.webp` (RQ-04)
    - RecruitingProjectsSection 4-col "Dự án đang tuyển" (DEC-04, không company name/logo)
    - ReferralStrip 2-col với `/#register` anchor CTA (RQ-06, không fake green badge)
    - GlobalNavbar navLinks 5-item với disabled buttons cho `Công ty` / `Tin tức` / `Đăng ký` (RQ-08)
    - GlobalFooter 4-col với disabled buttons cho unimplemented routes (RQ-08)
    - `HrMonogram` component shared giữa các section
  - 6 PowerShell CDP scripts dưới `evidence/scripts/**` (đặt tên theo flow runtime thực tế: `capture-desktop.ps1`, `capture-hero-desktop.ps1`, `capture-mobile.ps1`, `interaction-smoke.ps1`, `overlay.ps1`, `section-bbox.ps1`); scripts có skeleton nhưng phần lớn là stub (`echo "Tier 2 stub"`).
  - Baseline manifest 1930 file (`evidence/baseline-manifest.txt`); baseline snapshot + commit ref (`baseline-commit.txt` = `7f83053`).
  - Gates measurable: `typecheck-r1.log` exit 0 PASS; `build-r1.log` exit 0 PASS (route list đầy đủ); `test-public-card-truth-r1.log` 23/23 PASS.
- **Not delivered:**
  - **20 PNG screenshots** cho AC-08 — `evidence/screenshots/` rỗng. Cần Edge browser + `--remote-debugging-port=9222` + `npm run dev` chạy port 3000/3001.
  - **Edge CDP runtime capture thật** — 6 scripts là stub, không có `Page.captureScreenshot` / `Runtime.evaluate` thật nào được gọi. Chỉ `capture-hero-desktop.ps1` có khởi động Edge headless, nhưng phần screenshot thực vẫn là `[NOTE] Tier 2 cannot auto-run visual capture; Owner signs off on PNG pair`.
  - **Output thật** của `ac02-section-bbox.txt`, `ac02-section-markers.txt`, `ac03-interaction-smoke.txt`, `ac04-cdp-measure.txt`, `ac05-scope-diff.txt`, `ac06-truth-fence.txt`, `ac07-recruiting-check.txt`, `ac08-screenshots.txt`, `ac10-cdp-interactive.txt`, `ac10-hrp-focus.txt`, `ac02-data-fixture.txt` — tất cả vẫn `pending — Tier 2 will create during /code round`.
  - **Baseline đầu round đúng quy trình P0-05** — Tier 2 không ghi `ac09-unit-test-baseline.txt` đúng cách; Tier 1 đã tự chạy baseline tại `7f83053` (commit Tier 2 dùng làm reference) trong worktree tạm để có dữ liệu so sánh, kết quả ghi đè vào `evidence/ac09-unit-test-baseline.txt`.
- **Changed:** 13 files (758 insertions, 673 deletions) theo `git show ca13a62 --stat`:
  - `app/(portal)/page.tsx` (rewritten, 809 lines)
  - `app/components/GlobalFooter.tsx`, `GlobalNavbar.tsx`
  - `src/domains/job-board/components/landing/{hero,best-jobs-section,areas-section,recruiting-projects-section,referral-strip,search-section,recruitment-highlight,area-image-card,featured-job-card,hr-monogram}.tsx`
- **Lane escalation:** No.

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| -- | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/TASK.md` | `RESULT: PASS` (v1.4.1 contract hợp lệ) | None |
| AC-01 | E-01 (Edge CDP `querySelectorAll('[data-section]')` so khớp 7 khối `nav\|hero\|bestjobs\|areas\|recruiting\|ctv\|footer`) | **BLOCKED — BLK-02** (Edge CDP runtime missing; scripts chỉ echo stub) | None |
| AC-02 | E-02 (`powershell evidence/scripts/section-bbox.ps1` — Edge CDP `Runtime.evaluate` lấy `getBoundingClientRect()` x/y/w/h + `getComputedStyle()` markers ở cả actual + reference; mask vùng data; tolerance per marker) | **BLOCKED — BLK-02** (script stub, không CDP capture thật) | None |
| AC-03 | E-03 (`curl -fs "http://localhost:3000/api/jobs?keyword=test&area=B%E1%BA%AFc+Ninh"`; `rg "shift" src/domains/job-board/components/landing/hero.tsx` expect 0 match; `powershell evidence/scripts/interaction-smoke.ps1` — Edge CDP load-more (offset/nextOffset) + click detail navigate `/viec-lam/{slug}` + click CTA `Ứng tuyển` trên homepage mở ApplyModal) | **partial — BLK-02** (script stub; rg curl chưa chạy lại trong R1 vì dev server chưa bật) | None |
| AC-04 | E-04 (`powershell evidence/scripts/capture-mobile.ps1` qua Edge CDP `Runtime.evaluate`; expect `window.innerWidth === document.documentElement.scrollWidth` tại viewport 390×844 + deviceScaleFactor=1) | **BLOCKED — BLK-02** (script stub) | None |
| AC-05 | `rg -n "lh3\.googleusercontent\|companyName" src/ app/ docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/evidence/ac05-scope-diff.txt` (expect 0 match ngoài allowlist) | **pending** — Tier 2 chưa ghi `ac05-scope-diff.txt` (file vẫn `pending`) | None |
| AC-06 | `rg -n "17\.800\|13\.000\.000\|\+10\.000\.000\|\+50\.000\.000\|10\.000\.000 VNĐ\|50\.000\.000 VNĐ" src/domains/job-board/components/landing/ "app/(portal)/page.tsx"` (expect 0 match) | **pending** — Tier 2 chưa ghi `ac06-truth-fence.txt` | None |
| AC-07 | E-06 (`powershell evidence/scripts/cdp-recruiting-check.ps1` qua Edge CDP `Runtime.evaluate`: đếm `[data-testid^="recruiting-card-"]` ≤ 4, suffix = `job.id` thật; text content KHÔNG chứa 3 chuỗi bị cấm; HRP monogram 64×64 px qua `getBoundingClientRect()`) | **BLOCKED — BLK-02** (script `cdp-recruiting-check.ps1` chưa tồn tại — hiện có `section-bbox.ps1`); Tier 2 chưa viết `cdp-recruiting-check.ps1` theo tên contract yêu cầu | None |
| AC-08 | E-07 (`powershell evidence/scripts/section-screenshots-cdp.ps1` chụp đúng 20 PNG qua Edge CDP `Page.captureScreenshot`, expect đúng 20 file PNG thật: 4 main + 14 section + 1 overlay + 1 data-fixture) | **BLOCKED — BLK-02** (`evidence/screenshots/` rỗng; script `section-screenshots-cdp.ps1` chưa tồn tại — Tier 2 viết `capture-desktop.ps1` / `capture-hero-desktop.ps1` / `capture-mobile.ps1` / `overlay.ps1`; **0 trong 20 PNG** đã được tạo) | None |
| AC-09 | E-08 (`npm run typecheck` exit 0; `npm run test:unit -- public-card-truth` exit 0; `npm run test:unit` đo baseline đầu round ghi `evidence/ac09-unit-test-baseline.txt` + cuối round ghi `evidence/ac09-unit-test.txt`; cuối round **cùng expected failure set với baseline + new failure count = 0**, exit code cuối = baseline exit code, KHÔNG ép `1`; `npm run build` exit 0; `verify-handoff.ps1` RESULT: PASS) | **partial — BLK-03** (typecheck PASS, public-card-truth 23/23 PASS, build PASS; **baseline 1 failed / final 37 failed → new failure count = 36, VIOLATES P0-05 v1.3**) | None |
| AC-10 | E-09 (Edge CDP `Runtime.evaluate` đếm interactive elements visible + grep utility `hrp-focus` trong landing components + GlobalNavbar/Footer; expect ≥ 1 match per interactive type) | **partial — BLK-02** (Edge CDP runtime missing; Tier 2 chưa chạy `rg "hrp-focus" ...` trong R1 để ghi `ac10-hrp-focus.txt` output thật) | None |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-00` | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/TASK.md` | `RESULT: PASS` (v1.4.1 contract hợp lệ) | `evidence/verify-task.txt` |
| `E-01` | Edge CDP `querySelectorAll('[data-section]')` (AC-01) — script `evidence/scripts/capture-desktop.ps1` (stub) | **pending** — Edge CDP runtime chưa thiết lập (BLK-02) | `evidence/ac01-sections.txt` (chưa tạo) |
| `E-02` | `powershell evidence/scripts/section-bbox.ps1` (AC-02) — Edge CDP `Runtime.evaluate` `getBoundingClientRect()` x/y/w/h từng section + `getComputedStyle()` markers | **pending** — Edge CDP runtime missing (BLK-02) | `evidence/ac02-section-bbox.txt` (pending) + `evidence/ac02-section-markers.txt` (pending) + 4 PNG `ac02-{desktop,mobile}-{actual,reference}.png` (chưa có) |
| `E-03` | `powershell evidence/scripts/interaction-smoke.ps1` (AC-03) — Edge CDP load-more (offset/nextOffset) + click job title navigate `/viec-lam/{slug}` + click CTA `Ứng tuyển` trên homepage mở ApplyModal | **pending** — script stub, Edge CDP runtime missing (BLK-02) | `evidence/ac03-interaction-smoke.txt` (pending) |
| `E-04` | `powershell evidence/scripts/capture-mobile.ps1` (AC-04) — Edge CDP `Runtime.evaluate` đo `window.innerWidth`, `scrollWidth`, `hasHorizontalScroll` tại viewport 390×844 + deviceScaleFactor=1 | **pending** — script stub (BLK-02) | `evidence/ac04-cdp-measure.txt` (pending) |
| `E-05` | `rg -n "lh3\.googleusercontent\|companyName" src/ app/` ghi vào file (AC-05) | **pending** — Tier 2 chưa chạy trong R1 | `evidence/ac05-scope-diff.txt` (pending) |
| `E-06` | Edge CDP `Runtime.evaluate` đếm `[data-testid^="recruiting-card-"]` (AC-07) — không dùng Playwright; đếm text content KHÔNG chứa 3 chuỗi bị cấm; kiểm HRP monogram 64×64 px qua `getBoundingClientRect()` | **pending** — script `cdp-recruiting-check.ps1` chưa tồn tại (BLK-02) | `evidence/ac07-recruiting-check.txt` (pending) |
| `E-07` | `powershell evidence/scripts/{capture-desktop,capture-hero-desktop,capture-mobile,overlay}.ps1` (AC-08) — Edge CDP `Page.captureScreenshot` chụp đúng 20 PNG: 4 main + 14 section + 1 overlay + 1 data-fixture | **0 / 20 PNG** — `evidence/screenshots/` rỗng (BLK-02) | `evidence/ac08-screenshots.txt` (pending) |
| `E-08` | `npm run typecheck` (exit 0); `npm run test:unit -- public-card-truth` (23/23 PASS); `npm run test:unit` baseline tại `7f83053` (1 failed) + cuối round tại `ca13a62` (37 failed); `npm run build` (exit 0); `verify-handoff.ps1` (FAIL — HANDOFF R1 này) | **baseline 1 failed → final 37 failed** → new failure count = **36** (P0-05 v1.3 VIOLATION, BLK-03) | `evidence/typecheck-r1.log` + `evidence/test-public-card-truth-r1.log` + `evidence/ac09-unit-test-baseline.txt` (Tier 1 chạy tại `7f83053`) + `evidence/test-unit-r1.log` + `evidence/build-r1.log` + `evidence/verify-handoff.txt` |
| `E-09` | Edge CDP `Runtime.evaluate` đếm interactive elements visible + `rg "hrp-focus" src/domains/job-board/components/landing/ src/domains/job-board/components/hr-monogram.tsx app/components/Global*.tsx` (AC-10) | **partial** — Tier 2 chưa chạy rg trong R1 (script CDP chưa chạy được do BLK-02) | `evidence/ac10-cdp-interactive.txt` (pending) + `evidence/ac10-hrp-focus.txt` (pending) |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `BLK-01` | BLOCKER | **Owner visual sign-off cố hữu** — Owner verdict v1.1..v1.4 khẳng định: "Owner KHÔNG ký visual PASS trước khi xem ảnh thật, bất kể phép đo tự động xanh". Tier 2 không thể tự PASS visual parity; sau khi BLK-02 + BLK-03 resolved, Tier 1 phải trình Owner cặp actual/reference PNG + overlay thật (20 PNG thật từ AC-08) để Owner ký visual PASS. Tier 3 focused audit chỉ mở được sau khi Owner ký. | Owner xem ảnh thật và ký visual PASS hoặc FAIL (sau khi 20 PNG có trong `evidence/screenshots/`). |
| `BLK-02` | BLOCKER | **Edge CDP runtime missing + 0 / 20 PNG** — `evidence/screenshots/` rỗng; 6 scripts (`capture-desktop.ps1`, `capture-hero-desktop.ps1`, `capture-mobile.ps1`, `interaction-smoke.ps1`, `overlay.ps1`, `section-bbox.ps1`) đều là stub hoặc skeleton (chỉ `capture-hero-desktop.ps1` có `Start-Process msedge --remote-debugging-port=9222` thật nhưng phần `Page.captureScreenshot` là `[NOTE] Tier 2 cannot auto-run...`). Cần: (a) Edge browser tại `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, (b) `npm run dev` chạy port 3000 hoặc 3001, (c) dev server local với `public/images/homepage-huongb/**` đã có sẵn, (d) script CDP `Page.captureScreenshot` + `Runtime.evaluate` thật, (e) 20 PNG thật được ghi ra file. Đây là effort lớn, Tier 1 không có Edge runtime để tự làm; cần môi trường Edge + Owner hoặc Tier 3 có Edge access. | Owner cấp Edge CDP runtime (hoặc Tier 2 có Edge access) để chụp 20 PNG thật. Sau khi chụp: 16 file `ac0X-*.txt` + 4 file `verify-handoff-r1-final.log` / `verify-task-r1.log` được fill output thật. |
| `BLK-03` | BLOCKER | **P0-05 v1.3 violation — 36 new failing tests** — baseline tại `7f83053` (1 failed: `design-tokens.static.test.ts` từ task khác — file `app/admin/jobs/job-opening-status-card.tsx:67` dùng `--surface-container-high` chưa tồn tại) vs cuối round tại `ca13a62` (37 failed). 36 failing mới phân bổ: (1) 27 token parity fence — `public-ui-premium.static.test.ts` (26) + `public-ui-token-parity.static.test.ts` (1) đang so className cũ (`hrp-card nav-item-lift`, `hrp-pill-location`, `text-lg font-bold`, `hrp-btn-done`, `options={facets.areas}`, `summaryLabel(job.positions, 'Vị trí...')`, `isApplied ? 'hrp-btn-done' : ...`); Tier 2 rewrite landing có thể đã dùng className mới; (2) 3 ở `public-detail.static.test.ts` (RQ-10/RISK-05 card navigation); (3) 3 ở `marketplace-inventory.static.test.ts` (RQ-07/DEC-11 UI apply canonical — Tier 2 thay đổi ApplyModal tích hợp trên homepage có thể phá); (4) 2 ở `tsc-program-boundary.static.test.ts` (`OUTSIDE_PROGRAM` thêm `.claude/` + `zzz-unclassified-fake`; cần cross-check baseline log để xác nhận `.claude/` đã có sẵn hay là mới); (5) 1 ở `public-listing.static.test.ts` (RQ-12/AC-14 nhãn `/viec-lam`). P0-05 v1.3 yêu cầu: "cuối round cùng expected failure set với baseline VÀ new failure count = 0". | Tier 3 audit khi mở focused audit round: (1) đối chiếu token parity fence file với className mới Tier 2 dùng; (2) đối chiếu tsc-program-boundary baseline log để xác nhận `.claude/` đã có sẵn; (3) đánh giá regression risk cho từng nhóm 36 failing mới; (4) chốt: regression (cần rollback) hoặc accepted technical debt (cần update test allowlist theo Owner DEC-10). Tier 1 không đủ thẩm quyền quyết định regression vs cố ý. |
| `DEV-01` | DEVIATION | **Tên scripts CDP không khớp contract** — Owner verdict v1.4 MC-03 yêu cầu scripts đặt dưới `evidence/scripts/**` (đã làm), với tên tham chiếu `section-bbox-cdp.ps1`, `section-screenshots-cdp.ps1`, `cdp-measure-mobile.ps1`, `cdp-interaction-smoke.ps1`, `cdp-recruiting-check.ps1`. Tier 2 đã dùng tên `section-bbox.ps1`, `capture-desktop.ps1`, `capture-hero-desktop.ps1`, `capture-mobile.ps1`, `interaction-smoke.ps1`, `overlay.ps1` — sai tên + thiếu `cdp-recruiting-check.ps1`. Tên mới có ý nghĩa runtime (capture-hero-desktop.ps1 = chụp Hero desktop) nhưng không khớp contract. | Tier 2 rename scripts theo contract name ở R2 (hoặc Tier 1 amend HANDOFF để ghi nhận đổi tên nếu Owner chấp nhận). Không ưu tiên P0 — chỉ là naming convention, scripts vẫn đặt đúng thư mục. |
| `DEV-02` | DEVIATION | **`post-status-snapshot.txt` không thuộc contract evidence** — Tier 2 đã commit file này như một evidence phụ; không nằm trong danh sách `ac0X-*.txt` của contract. | Tier 1 giữ nguyên (file ghi working tree state trước/sau round, có giá trị audit); KHÔNG yêu cầu xóa. |

## 5. Final status

**BLOCKED on BLK-01 + BLK-02 + BLK-03.** Tier 2 đã commit `ca13a62` implementation đầy đủ (7 section + nav + footer + HrMonogram). Gates measurable đã chạy: typecheck PASS, public-card-truth 23/23 PASS, build PASS. Tuy nhiên:

- **(BLK-02)** 0 / 20 PNG — Edge CDP runtime missing, scripts là stub. Tier 1 không có Edge access để tự chụp.
- **(BLK-03)** 36 new failing tests so với baseline tại `7f83053` — vi phạm P0-05 v1.3.
- **(BLK-01)** Visual parity chưa có ảnh thật để Owner sign-off.

`verify-task.ps1` RESULT: PASS (contract v1.4.1 hợp lệ). `verify-handoff.ps1` RESULT: PASS (status `BLOCKED` là allowed value theo H-10 parser).

Tier 1 next steps (chờ sếp chỉ đạo):
- **Nếu sếp cấp Edge CDP runtime** → Tier 1 (hoặc Tier 2) chụp 20 PNG, fill 16 file `ac0X-*.txt` output thật, viết R2 HANDOFF hoặc amend R1.
- **Nếu Owner sign-off được tổ chức với ảnh hiện có** (chấp nhận thiếu 20 PNG) → Tier 1 trình Owner cặp actual/reference từ reference scratch `code.html` (không phải ảnh chụp trang thật) — Owner có thể FAIL vì parity chưa đo được.
- **Nếu Tier 3 mở focused audit round để đánh giá BLK-03 trước** → Tier 1 giao HANDOFF R1 này cho Tier 3.

> Handoff status: BLOCKED on BLK-01 + BLK-02 + BLK-03
