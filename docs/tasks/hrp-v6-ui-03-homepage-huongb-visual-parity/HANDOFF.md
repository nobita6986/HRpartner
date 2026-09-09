# HANDOFF — `hrp-v6-ui-03-homepage-huongb-visual-parity`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-03-homepage-huongb-visual-parity` |
| Spec version | `v1.5` |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` |
| Execution round | `2` (correction round theo Owner override `evidence/owner-visual-gate-override-r1.md`) |
| Implementation baseline | `ca13a62` (Tier 2 round 1 implementation đã xong, không revert) |
| Implementation HEAD | `ce903f8` (Owner override + Tier 1 bump v1.5) |
| Status | `BLOCKED` (Tier 2 sửa BLK-03 theo DEC-11 + DEC-12; BLK-01 + BLK-02 đóng theo Owner override) |
| Operational marker | `AWAITING_OWNER_LIVE_VISUAL_REVIEW` (sẽ bật sau push khi technical audit pass) |

## 1. Outcome and changed surface

- **Round 1 (commit `ca13a62`, Tier 2):**
  - Implementation đầy đủ 7 section landing + nav + footer theo RQ-02..RQ-08 (13 files, 758 insertions, 673 deletions):
    - `app/(portal)/page.tsx` (rewritten, 809 lines)
    - `app/components/GlobalFooter.tsx`, `GlobalNavbar.tsx`
    - `src/domains/job-board/components/landing/{hero,best-jobs-section,areas-section,recruiting-projects-section,referral-strip,search-section,recruitment-highlight,area-image-card,featured-job-card,hr-monogram}.tsx`
  - 6 PowerShell CDP scripts dưới `evidence/scripts/**` (đặt tên theo runtime flow Tier 2 tự đặt; theo DEC-11 scripts hiện KHÔNG còn là deliverables — Tier 2 có quyền xóa trong round 2 nếu không còn ích cho Tier 3 audit).
  - Baseline capture: `baseline-commit.txt` = `7f83053`, `baseline-manifest.txt` (1930 files), `post-status-snapshot.txt`.
  - Gates measurable đã chạy: `typecheck-r1.log` exit 0, `build-r1.log` exit 0, `test-public-card-truth-r1.log` 23/23 PASS.
  - **Tier 1 đo baseline unit-test tại `7f83053`** trong worktree tạm (Tier 2 không ghi `ac09-unit-test-baseline.txt` round 1) → 1 failed (chỉ `design-tokens.static.test.ts` từ task khác, không thuộc UI-03 scope).
  - **Kết quả unit-test round 1 tại `ca13a62`**: 7 failed test files / 37 failed tests / 1710 passed → **36 new failing tests** so với baseline `7f83053` → **P0-05 v1.3 violation**.
- **Owner override (commit `ce903f8`, Tier 1):**
  - Ban hành `evidence/owner-visual-gate-override-r1.md` (09/09 23:50 ICT):
    - **BLK-01** (Owner visual sign-off trước audit) — **đóng**. Visual approval chuyển sang Owner live review trên deployed homepage sau push.
    - **BLK-02** (Edge/CDP/20 PNG/overlay/bbox/`getComputedStyle`/`scrollWidth` measurement) — **đóng**. Không còn yêu cầu Agent tạo screenshot, scripts stub + empty `evidence/screenshots/` không còn deliverables.
    - **BLK-03** (36 new failing tests) — **vẫn blocking**. Tier 2 phải fix regression trước push.
  - Tier 1 bump TASK v1.5 với `DEC-11` (Owner override chính sách) + `DEC-12` (mở rộng allowlist §11 OBR-02 thêm 3 fence test); đóng `BLK-01`/`BLK-02` trong scope + AC, đánh dấu `AC-02/04/08 → AWAITING_OWNER_LIVE_VISUAL_REVIEW`, bỏ STEP-10 (visual capture) + STEP-12 (Owner visual sign-off), simplify RQ-11/12 + AC-10 theo override.
- **Round 2 (this HANDOFF):**
  - Tier 2 sửa 36 new failing tests theo phân loại:
    - **27 fence test DEC-10** (đã có sẵn trong allowlist §11 OBR-02): `public-ui-premium.static.test.ts` (26) + `public-ui-token-parity.static.test.ts` (1) — Tier 2 update fence theo composition mới với comment giải thích lý do.
    - **3 `marketplace-inventory.static.test.ts`** (DEC-10 mở rộng) — Tier 2 verify UI apply canonical invariant còn giữ, update nếu composition đổi.
    - **3 `public-detail.static.test.ts`** (DEC-12 — mới mở) — RQ-10/RISK-05 card navigation. Tier 2 thay đổi card `/` từ anchor element sang Next Link với route thật `/viec-lam/{slug}` đúng RQ-08; test cũ mong anchor `#`. Update test theo behavior mới với comment.
    - **1 `public-listing.static.test.ts`** (DEC-12 — mới mở) — RQ-12 nhãn listing. Tier 2 update test theo label mới.
    - **2 `tsc-program-boundary.static.test.ts`** (DEC-12 — mới mở) — do `.claude/worktrees/agent-a9d2e1dcf5aa53ca2/.next/types/` chứa 3 `.ts` files (`cache-life.d.ts`, `routes.d.ts`, `validator.ts`) — Tier 1 verify baseline `7f83053` KHÔNG có failure này → 2 failing mới do cleanup repo của agent khác để lại worktree artifacts (chứ không phải regression Tier 2 gây ra), nhưng Tier 2 phải xử lý để BLK-03 pass. Cách xử lý: thêm `.claude` vào `SKIP_DIRS` của test (giống `node_modules` + `.git`) HOẶC dùng `git clean -fdx .claude/worktrees/agent-*` để xóa worktree artifacts + thêm `.claude/worktrees/` vào `.gitignore`.
  - Tier 2 đo baseline unit-test mới tại `ce903f8` (HEAD hiện tại — baseline `7f83053` đã lệch sau khi `d415672` + `ce903f8` thêm evidence/override files). Baseline mới ghi `evidence/ac09-unit-test-baseline.txt` (Tier 2 sẽ ghi đè file hiện có của Tier 1 round 1).
  - Tier 2 KHÔNG cần tạo `evidence/screenshots/**` PNG; có thể xóa `evidence/scripts/**` stub scripts nếu không còn ích cho Tier 3 audit.
- **Changed surface (round 2):**
  - Tier 2 sửa code trong `app/(portal)/page.tsx` + 8 landing components (nếu cần rollback/regression fix); sửa 7 fence test files theo DEC-10 + DEC-12 allowlist; có thể xóa `evidence/scripts/**` (optional); KHÔNG tạo `evidence/screenshots/**`.
  - **Out of scope (DEC-12 + DEC-11)**: KHÔNG sửa schema/database/auth/apply modal/admin jobs/landing pages ngoài `/`; KHÔNG thay đổi route `/viec-lam/{code}`; KHÔNG thay đổi `prisma/**`, `src/lib/auth/**`, `src/lib/db/**`, `src/domains/job-board/public.service.ts`, `src/domains/job-board/apply-modal/**`, `src/domains/job-board/success-modal/**`.
- **Lane escalation:** No.

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| -- | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/TASK.md` | `RESULT: PASS` (v1.5 contract hợp lệ) | None |
| AC-01 | 7 section cấp cao theo đúng thứ tự code.html (Navbar → Hero → BestJobs → Areas → Recruiting → CTV → Footer); `data-section="nav\|hero\|bestjobs\|areas\|recruiting\|ctv\|footer"` gắn trên MỖI khối. | **PASS round 1** — implementation đã gắn `data-section` (verify qua source review Tier 2 round 1; Tier 3 audit source review round 2) | None |
| AC-02 | **AWAITING_OWNER_LIVE_VISUAL_REVIEW** (post-push, DEC-11, Owner override §1 + §3.5). Tier 2 KHÔNG cần Edge CDP `Page.captureScreenshot` / 20 PNG / bbox / `getComputedStyle` markers / overlay / scrollWidth measurement. Code-side parity đã verify qua AC-01..AC-07 + AC-10 source review. | **pending post-push** | Owner live review gate; nếu Owner FAIL → correction round nhỏ nhất |
| AC-03 | Hành vi thật giữ nguyên: `fetch('/api/jobs')` thành công, facets (keyword + city + salary — KHÔNG có `shift` control ở hero), phân trang/load-more, mở chi tiết, ứng tuyển. ApplyModal/SuccessModal không bị sửa. | **PASS round 1** (Tier 2 commit `ca13a62` — code review Tier 3 audit round 2 verify) | Tier 3 audit source review |
| AC-04 | **AWAITING_OWNER_LIVE_VISUAL_REVIEW** (post-push, DEC-11). Tier 2 verify mobile 390×844 không horizontal overflow qua source review. | **PASS round 1 source review** (Tier 2 commit `ca13a62`; E-04 source review registry); **pending post-push** | None |
| AC-05 | Asset ảnh chỉ từ `public/images/homepage-huongb/**`; KHÔNG có URL Google tạm; KHÔNG có logo doanh nghiệp hardcode. | **PASS round 1** (Tier 2 implementation dùng `public/images/homepage-huongb/industrial-location-0{1..4}.webp` + `referral-team.webp` + `HrMonogram` shared component) | Tier 3 audit `rg "lh3\.googleusercontent\|companyName"` round 2 |
| AC-06 | Dữ liệu biến thiên (số job, lương, deadline, tỉnh/thành, badge, slot) từ `PublicJobDto`/`PublicJobOverview`; KHÔNG hardcode `17.800`, `13.000.000đ`, `+10.000.000đ`, `+50.000.000đ`. | **PASS round 1** (Tier 2 implementation bind `PublicJobOverview.newest`/`topPaid`, không hardcode); DEC-06 đã xóa floating green badges `+10.000.000đ`/`+50.000.000đ`. | Tier 3 audit `rg "17\.800\|13\.000\.000\|\+10\.000\.000\|\+50\.000\.000\|10\.000\.000 VNĐ\|50\.000\.000 VNĐ"` round 2 |
| AC-07 | Section "Dự án đang tuyển" render đúng DEC-04 + RQ-05: heading `Dự án đang tuyển`; tối đa 4 card từ `PublicJobOverview.newest` (fallback `topPaid`); mỗi card `job.id` key + `job.title` + `job.availableSlots`; KHÔNG "Top công ty"/"Đối tác chính thức"/logo công ty; KHÔNG group theo `recruiter`; ẩn section nếu cả 2 list rỗng. | **PASS round 1** (Tier 2 commit `ca13a62` đã implement `RecruitingProjectsSection` + `HrMonogram`) | Tier 3 audit source review round 2 xác nhận invariant còn giữ |
| AC-08 | **AWAITING_OWNER_LIVE_VISUAL_REVIEW** (post-push, DEC-11). Tier 2 KHÔNG cần chụp 20 PNG qua Edge CDP. `evidence/screenshots/` KHÔNG còn là acceptance deliverables — Tier 2 KHÔNG tạo directory này, scripts stub trong `evidence/scripts/**` có thể xóa. | **PASS round 1 source review** (Tier 2 implementation đầy đủ 7 section); **pending post-push** | Owner live review gate |
| AC-09 | Mandatory gates (DEC-11, Owner override §3.3): `npm run typecheck` exit 0; `npm run test:unit -- public-card-truth` exit 0; `npm run test:unit` cuối round cùng expected failure set với baseline đầu round + new failure count = 0 (P0-05 v1.3 — KHÔNG hardcode exit 1); `npm run build` exit 0; `verify-handoff.ps1` RESULT: PASS. Baseline mới đo tại `ce903f8`. | **partial — BLK-03** (typecheck PASS, public-card-truth 23/23 PASS, build PASS; baseline `ce903f8` chưa đo round 2; final round 1 tại `ca13a62` = 37 failed → Tier 2 round 2 phải giảm về = baseline) | Tier 2 round 2 đo baseline mới + fix 36 new failing |
| AC-10 | **Accessibility** (DEC-11, Owner override): Tier 2 KHÔNG dùng `npx lighthouse`/`npx pa11y`/`npx axe-core`/`npx playwright` auto-install. (a) grep utility `hrp-focus` (đã có trong repo): `rg "hrp-focus" src/domains/job-board/components/landing/ src/domains/job-board/components/hr-monogram.tsx app/components/Global*.tsx` (≥ 1 match per interactive component) ghi `evidence/ac10-hrp-focus.txt`. (b) Source review: Navbar/Footer/Hero controls không có fixed width gây mobile horizontal overflow, không có focusable element bị ẩn bởi `display:none`/`visibility:hidden`. (c) Contrast: token table trong `app/globals.css` ≥ 4.5:1 body, ≥ 3:1 large text. | **pending round 2** — Tier 2 grep + source review + ghi `evidence/ac10-hrp-focus.txt` | Tier 3 audit source review round 2 |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-00` | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/TASK.md` | `RESULT: PASS` (v1.5 contract hợp lệ) | `evidence/verify-task.txt` |
| `E-01` | `rg "data-section" src/domains/job-board/components/landing/ app/(portal)/page.tsx app/components/GlobalNavbar.tsx app/components/GlobalFooter.tsx` (AC-01 source review) | **PASS round 1** — Tier 2 đã gắn `data-section="nav\|hero\|bestjobs\|areas\|recruiting\|ctv\|footer"` | `evidence/ac01-section-order.txt` (Tier 2 ghi round 2) |
| `E-02` | **AWAITING_OWNER_LIVE_VISUAL_REVIEW** — post-push, không có Agent evidence | (post-push) Owner live review | (post-push) |
| `E-03` | Source review: `rg "shift" src/domains/job-board/components/landing/hero.tsx` → 0 match; grep `fetch('/api/jobs')` ở landing components + verify facets `keyword/area/salary` không có `shift`; ApplyModal/SuccessModal KHÔNG bị sửa (scope Out). | **PASS round 1** | `evidence/ac03-real-behavior.txt` (Tier 2 ghi round 2) |
| `E-04` | Source review: `rg "w-\[\d+px\]" app/(portal)/page.tsx src/domains/job-board/components/landing/ app/components/GlobalNavbar.tsx app/components/GlobalFooter.tsx` (expect 0 match hoặc match ≤ 390 px); `rg "min-w-\[\d+px\]"` (expect 0 match). **AWAITING_OWNER_LIVE_VISUAL_REVIEW** post-push. | **PASS round 1 source review**; **pending post-push** | `evidence/ac04-cdp-measure.txt` (Tier 2 ghi round 2 placeholder pending) |
| `E-05` | `rg -n "lh3\.googleusercontent\|companyName" src/ app/ docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/evidence/ac05-scope-diff.txt` (ghi output từ `rg` vào file; expect 0 match ngoài allowlist) | **PASS round 1**; Tier 2 ghi round 2 | `evidence/ac05-scope-diff.txt` (Tier 2 ghi round 2) |
| `E-06` | `rg -n "17\.800\|13\.000\.000\|\+10\.000\.000\|\+50\.000\.000\|10\.000\.000 VNĐ\|50\.000\.000 VNĐ" src/domains/job-board/components/landing/ "app/(portal)/page.tsx"` (expect 0 match) | **PASS round 1**; Tier 2 ghi round 2 | `evidence/ac06-truth-fence.txt` (Tier 2 ghi round 2) |
| `E-07` | Source review: `rg "Top công ty|Đối tác chính thức" src/domains/job-board/components/landing/` → 0 match; `rg "recruiter" src/domains/job-board/components/landing/recruiting-projects-section.tsx` → 0 match; HrMonogram 64×64 px qua `grep "w-16 h-16" src/domains/job-board/components/landing/hr-monogram.tsx`. | **PASS round 1** | `evidence/ac07-recruiting-check.txt` (Tier 2 ghi round 2) |
| `E-08` | **AWAITING_OWNER_LIVE_VISUAL_REVIEW** — post-push, không có Agent evidence; `evidence/screenshots/` KHÔNG còn là acceptance deliverables (DEC-11). Tier 2 có thể xóa `evidence/scripts/**` stub scripts. | (post-push) Owner live review | (post-push) |
| `E-09` | **BLK-03 gate** (mandatory): `npm run typecheck` exit 0; `npm run test:unit -- public-card-truth` exit 0; `npm run test:unit` đo **baseline mới tại `ce903f8`** (Tier 2 chạy ngay đầu round 2 → ghi `evidence/ac09-unit-test-baseline.txt` đè lên file round 1 của Tier 1) + cuối round (`evidence/ac09-unit-test.txt`); kết quả cuối round cùng expected failure set với baseline mới + new failure count = 0 (P0-05 v1.3 — KHÔNG hardcode exit 1); `npm run build` exit 0; `verify-handoff.ps1` RESULT: PASS. | **partial** — typecheck + public-card-truth + build PASS round 1; baseline mới chưa đo round 2; final round 2 phải giảm về = baseline | `evidence/typecheck-r1.log` + `evidence/test-public-card-truth-r1.log` + `evidence/build-r1.log` (round 1) + `evidence/ac09-unit-test-baseline.txt` (round 2) + `evidence/ac09-unit-test.txt` (round 2) + `evidence/verify-handoff.txt` (round 2) |
| `E-10` | Source review + grep: `rg "hrp-focus" src/domains/job-board/components/landing/ src/domains/job-board/components/hr-monogram.tsx app/components/Global*.tsx` (≥ 1 match per interactive component); `rg "display:none\|visibility:hidden" src/domains/job-board/components/landing/` (expect 0 match trên focusable element); contrast token table source review. | **pending round 2** | `evidence/ac10-hrp-focus.txt` (Tier 2 ghi round 2) |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `BLK-01` | **CLOSED** (Owner override) | Owner visual sign-off pre-push — đã đóng theo Owner override `evidence/owner-visual-gate-override-r1.md` §1 + §2. Visual approval chuyển sang Owner live review trên deployed homepage sau push. | None — closed by Owner policy. |
| `BLK-02` | **CLOSED** (Owner override) | Edge/CDP/20 PNG/overlay/bbox/`getComputedStyle`/`scrollWidth` — đã đóng theo Owner override §1 + §2. `evidence/screenshots/` KHÔNG còn là deliverables; `evidence/scripts/**` stub scripts có thể xóa. Tier 2 KHÔNG tự ý tạo ảnh hay chạy CDP capture. | None — closed by Owner policy. |
| `BLK-03` | **BLOCKING** (technical regression gate) | P0-05 v1.3 violation — 36 new failing tests so với baseline. Baseline Tier 1 đo round 1 tại `7f83053`: 1 failed (design-tokens, không thuộc UI-03 scope). Cuối round 1 tại `ca13a62`: 37 failed (`evidence/test-unit-r1.log`). 36 new failing phân bổ theo DEC-10 + DEC-12: 27 fence test (`public-ui-premium` 26 + `public-ui-token-parity` 1) + 3 `marketplace-inventory` (DEC-10) + 3 `public-detail` (DEC-12 mới) + 1 `public-listing` (DEC-12 mới) + 2 `tsc-program-boundary` (DEC-12 mới, do `.claude/worktrees/agent-a9d2e1dcf5aa53ca2/.next/types/` chứa 3 `.ts` files từ worktree cũ của agent khác). | Tier 2 round 2 sửa theo phân loại ở §1 Outcome; Tier 3 audit verify lý do sửa từng test (composition đổi thật vs có thật sự cần thiết); Tier 1 đo baseline mới tại `ce903f8` đầu round 2. |
| `DEV-01` | DEVIATION (closed) | Scripts CDP sai tên contract (Owner verdict MC-03 v1.4 yêu cầu `section-bbox-cdp.ps1`, `section-screenshots-cdp.ps1`, `cdp-measure-mobile.ps1`, `cdp-interaction-smoke.ps1`, `cdp-recruiting-check.ps1`; Tier 2 dùng `capture-desktop.ps1`, `capture-hero-desktop.ps1`, `capture-mobile.ps1`, `interaction-smoke.ps1`, `overlay.ps1`, `section-bbox.ps1`) — đã đóng theo DEC-11 vì scripts không còn deliverables. | None — closed by Owner override. |
| `DEV-02` | DEVIATION (kept) | `post-status-snapshot.txt` không thuộc contract evidence — Tier 1 giữ nguyên (file ghi working tree state trước/sau round, có giá trị audit). | None. |
| `DEV-03` | DEVIATION (new) | TASK.md đã bị **mojibake từ UTF-8 sang single-byte encoding** từ các commit trước (kể từ `f64ccb1` v1.3 hoặc sớm hơn). Tier 1 đọc được nhưng format cũ; round 2 Tier 1 chấp nhận state hiện tại, KHÔNG cố re-encode toàn file (ngoài scope, sẽ làm vỡ verify-task signature hiện có). | None — pre-existing repo encoding issue, ngoài scope task này. |
| `RISK-07` | RISK (DEC-12) | Mở rộng allowlist §11 OBR-02 (DEC-12) thêm 3 test (`public-detail`, `public-listing`, `tsc-program-boundary`) — Tier 2 có quyền sửa test ngoài DEC-10. Nguy cơ: Tier 2 lợi dụng allowlist mở rộng để sửa test invariant quan trọng, gây regression ẩn. | Tier 3 audit đối chiếu lý do sửa từng test; Tier 2 PHẢI ghi comment trong test file giải thích lý do update. |
| `RISK-08` | RISK (post-push) | Sau khi technical audit pass → push → Owner live visual review trên deployed site. Nếu Owner FAIL live UI → mở correction round nhỏ nhất, KHÔNG rollback rộng. | Owner live review là gate visual duy nhất; Tier 3 KHÔNG được tự ký visual PASS. |

## 5. Final status

**BLOCKED on BLK-03** (correction round 2 theo Owner override `evidence/owner-visual-gate-override-r1.md` — DEC-11).

Round 1 (commit `ca13a62`) đã hoàn thành implementation 7 section + nav + footer + HrMonogram. Round 2 mở để giải quyết BLK-03 (36 new failing tests) theo phân loại DEC-10 + DEC-12. BLK-01 + BLK-02 đóng bởi Owner override.

**Operational marker:** `AWAITING_OWNER_LIVE_VISUAL_REVIEW` — sẽ được bật sau khi technical audit pass + push. Marker này chỉ ra visual parity chưa được Owner duyệt live trên deployed site; cho đến khi Owner live review pass, sản phẩm KHÔNG có visual parity guarantee.

Tier 2 round 2 deliverables:
1. `evidence/ac09-unit-test-baseline.txt` (đo baseline mới tại `ce903f8`, đè file round 1) + `evidence/ac09-unit-test.txt` (cuối round, cùng expected failure set + new failure count = 0).
2. Source code regression fix (nếu có) trong `app/(portal)/page.tsx` + 8 landing components.
3. Fence test updates theo DEC-10 (4 file) + DEC-12 (3 file) với comment giải thích lý do từng update.
4. Source review evidence: `evidence/ac01-section-order.txt`, `evidence/ac03-real-behavior.txt`, `evidence/ac05-scope-diff.txt`, `evidence/ac06-truth-fence.txt`, `evidence/ac07-recruiting-check.txt`, `evidence/ac10-hrp-focus.txt` (ghi output thật từ `rg`).
5. Cleanup optional: xóa `evidence/scripts/**` stub scripts (nếu Tier 2 thấy không còn ích); KHÔNG tạo `evidence/screenshots/**`.

Tier 1 round 2 follow-ups:
1. Nếu Tier 2 round 2 đạt gates → Tier 1 trình Tier 3 focused audit (source/test/route/a11y/regression).
2. Tier 3 audit verify lý do sửa từng fence test (composition đổi thật vs có thật sự cần thiết) — Tier 3 KHÔNG fail vì thiếu screenshot.
3. Sau audit pass → push → Owner live visual review trên deployed homepage.
4. Nếu Owner FAIL live → mở correction round nhỏ nhất theo Owner chỉ định, KHÔNG rollback rộng.

> Handoff status: BLOCKED on BLK-03 (round 2 awaiting Tier 2 regression fix)
