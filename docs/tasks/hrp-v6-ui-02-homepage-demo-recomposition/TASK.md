# TASK — `hrp-v6-ui-02-homepage-demo-recomposition`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-02-homepage-demo-recomposition` |
| Work type | `DESIGN` |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` (changed surface giới hạn ở `/`) |
| Spec version | `v1.8` (Tier 1 bump `v1.7 → v1.8` 09/09 17:15 ICT: Tier 3 FAIL round 4 — thêm `prisma/seed.mjs` vào §11 OBR-02 allowlist Sửa (Owner approved); fix T-04 bằng cách thêm `text-headline-xl` semantic token vào Hero H1 tại xl breakpoint (`xl:text-headline-xl`); re-ran gates typecheck + focused test PASS; full test pending) |
| Status | `READY_FOR_EXECUTION` (v1.8 — Tier 3 FAIL round 4: thêm prisma/seed.mjs vào allowlist, fix T-04 text-headline-xl, đang chạy gates) |
| Planner | Tier 1 |
| Baseline | `main @ d6c7971` (chore(pipeline): streamline focused audit workflow, 09/09) |
| Working tree baseline | Working tree main có **18 dòng pre-existing foreign changes** (15 modified + 3 untracked) thuộc session `hrp-v6-security-credential-rotation`, `docs/PLANNER_HANDOVER.md`, `docs/runbooks/credential-rotation-incident.md`, `docs/prompts/`. Snapshot tại `evidence/baseline-snapshot.txt` (SHA256 `74A3FD36C1C6B38BD86AB2B68B73A86667B7A603D7DB42C8EB6995A2C115B87C`, chốt lúc 09/09 ~11:30 ICT). Pre-existing **manifest hash** của 17 foreign files (15 `M` + 2 untracked, **trừ `docs/tasks/hrp-v6-ui-02-homepage-demo-recomposition/**` vì là task-owned**) lưu tại `evidence/baseline-manifest.txt` (SHA256 `F0D3483885A3255DF126C2F7D646FB02C0A1143DA4E4363060EB4BBBC322875D`, 17 dòng). Manifest phát hiện nội dung file pre-existing bị agent khác sửa giữa baseline và audit. `.ai-pipeline/**` đã được commit vào `d6c7971` nên KHÔNG còn pre-existing. |
| Owner baseline override | Owner quyết định ngày 09/09 ~11:30 ICT: làm trực tiếp trên `main` tại `d6c7971`, KHÔNG tạo worktree/branch. Tier 1 áp dụng **baseline-aware scope compliance** (§11 OBR-01). Tier 1 KHÔNG tự diễn giải thành "main phải sạch". |
| Required gates | `npm run typecheck` ; `npm run test:unit` ; `npm run build` ; verify-handoff.ps1 với đường dẫn file TASK.md (chạy MỘT lần ở STEP-09) ; **Owner visual sign-off (trước Tier 3)** ; Tier 3 audit FOCUSED |
| In-scope roots | `app/(portal)/page.tsx` ; `src/domains/job-board/components/landing/{best-jobs-section,hero,areas-section,search-section}.tsx` ; `docs/tasks/hrp-v6-ui-02-homepage-demo-recomposition/**` |
| Touched code surface | Xóa `landing/search-section.tsx` ; sửa `landing/{best-jobs-section,hero,areas-section}.tsx` (Hero đổi gradient, Areas đổi chip style, BestJobs đổi thành wrapper children) ; sửa `app/(portal)/page.tsx` (xóa 5 khối cũ, đổi layout import) |
| Current execution round | `5` (correction round 5 — Tier 3 FAIL round 4: prisma/seed.mjs scope + T-04 fix) |
| Current audit round | `0` |
| Next gate | Tier 2 `/code` responsive fix + seed data ; Tier 1 chụp actual với data (Featured + JobCard + Areas) ; Owner visual sign-off ; Tier 3 `/audit` FOCUSED ; Tier 1 `/resolve`. v1.5 bumped 09/09 15:00 ICT sau Owner FAIL verdict. |

### 0.1 Preflight HARD gate

Tier 1 KHÔNG bump `READY_FOR_EXECUTION` cho tới khi CẢ HAI điều kiện sau thoả (PowerShell-native):

1. **Prerequisite đã merge vào lịch sử `main`** — dùng `git log main --oneline | Select-String -Pattern 'hrp-v6-p1-job-opening-status-card'`. Phải có ít nhất 1 commit. (KHÔNG dùng `git log -1` vì HEAD mới nhất có thể là commit khác.)
2. **Baseline snapshot khớp `git status --porcelain` hiện tại** — file `evidence/baseline-snapshot.txt` có SHA256 = `74A3FD36C1C6B38BD86AB2B68B73A86667B7A603D7DB42C8EB6995A2C115B87C` và 18 dòng. Khi Tier 2 bắt đầu STEP-00, Tier 2 chạy `(Get-Content evidence/baseline-snapshot.txt | Measure-Object -Line).Lines` và `(Get-FileHash evidence/baseline-snapshot.txt -Algorithm SHA256).Hash` để verify snapshot còn nguyên.

### 0.2 Vì sao rewrite từ đầu (Owner verdict v1.0 → v1.1)

Tier 0 review 09/09 ~11:25 ICT verdict REVISION_REQUIRED. Lý do:

- v1.0 contract chứa 4 P0 / 5 P1 / 2 P2 : hai khu vực việc trùng (`BestJobsSection jobs={jobs}` + `SearchSection results={grid}`), `hero.tsx` cấm sửa nhưng là điểm khác demo, `JobCard` không tồn tại file ngoài `page.tsx:226`, baseline lỗi thời, lệnh Bash không chạy trên PowerShell, `verify-handoff` path sai, vòng tròn Owner/Tier 3 visual gate.
- v1.1 đơn giản hóa: 1 job section duy nhất (xóa SearchSection); cho phép sửa Hero và Areas visual language (không ảnh); baseline refresh; toàn PowerShell-native; 4 ảnh reference+actual; Owner sign-off trước Tier 3.

## 1. Outcome

### 1.1 User-visible outcome (recap)

Trang `/` sau khi recomposition chỉ còn sáu khối: Header → Hero/Search → **một khu vực việc làm thật** (BestJobsSection wrapper nhận children) → Areas → CTA cộng tác viên → Footer.

**Khối được giữ:** Header (GlobalNavbar ở layout) ; Hero (form search + Featured card, áp dụng visual demo HuongB) ; BestJobsSection wrapper (JobCard grid render bởi `page.tsx`) ; AreasSection (text-only, visual demo) ; ReferralInviteStrip ; Footer.

**Khối bị xóa vĩnh viễn:** stats row (jsx open-bracket section aria-label="Tổng quan tuyển dụng" close-bracket) ; fixed skeleton 3 card trong BestJobsSection cũ ; `TagStrip heading="Việc làm theo ca làm"` ; 2 jsx open-bracket MiniJobList close-bracket (`overview.newest`, `overview.topPaid`) ; filter sidebar (file `SearchSection.tsx` + wrapper 2-cột).

**Hai thay đổi visual lớn vs Phase 1C:**

- `Hero.tsx`: đổi `bg-surface-warm` (nền sáng) → gradient `bg-primary` + `from-primary to-primary-dark` theo demo HuongB. Giữ structure cũ (relative + 2 blur blob + flex children) nhưng đổi className.
- `AreasSection.tsx`: giữ text-only buttons ; đổi chip style từ outline-only sang filled-on-hover (visual demo) ; KHÔNG dùng ảnh.

### 1.2 Non-goals

- KHÔNG đổi API/auth/business logic.
- KHÔNG ship ảnh khu vực, logo công ty, top companies.
- KHÔNG thêm token mới vào `app/globals.css` (giữ G27).
- KHÔNG tạo component mới ngoài allowlist §11 OBR-02.
- KHÔNG tạo component mới ngoài allowlist §11 OBR-02.
- KHÔNG tự commit/push/merge/bump status.

## 2. Evidence & Baseline

| ID | Source | Observed fact |
|---|---|---|
| `EV-01` | `scratch/new-ui-HuongB-ref-2026-09-07/code.html` (531 dòng) | Mockup tham chiếu. Hero dùng gradient primary + form search + Tuyển Dụng highlight box ; Featured Jobs 3 card có logo (BỎ vì schema) ; 4 Location card có ảnh (BỎ vì schema) ; Top Companies (BỎ vì schema) ; Referral ; Footer. Baseline là hero+spacing+hierarchy+job-card+responsive, không phải asset. |
| `EV-02` | `app/(portal)/page.tsx` đo 09/09 (1140 dòng) | Đang render 9 khối. JobCard là function nội bộ tại line 226 ; không có `landing/job-card.tsx` ; jsx open-bracket SearchSection close-bracket ở line 874 chứa filter sidebar + grid ; jsx open-bracket BestJobsSection close-bracket ở line 866 chỉ render skeleton ; 2 jsx open-bracket MiniJobList close-bracket ở line 1107/1112. |
| `EV-03` | `app/(portal)/page.tsx:753-754` | `featuredSource = overview.topPaid[0] ?? overview.newest[0] ?? null` — đã đúng Phase 1C ; Phase 2 giữ nguyên. |
| `EV-04` | `src/domains/job-board/public.service.ts` | `PublicJobDto` 18 khóa công khai (id, slug, title, positionTitles, locations, shifts, salaryMinVnd/MaxVnd, availableSlots, urgency, deadline, postedAt, ...). |
| `EV-05` | `src/domains/job-board/public-card-truth.test.ts:293` | `Object.keys(args.where).sort()` = `['isPublic','staffingOrders','status']` ; 14 test XANH. |
| `EV-06` | `src/domains/applications/marketplace-inventory.static.test.ts` | Detector 4 file: PORTAL_PAGE, APPLY_MODAL, SUCCESS_MODAL, DETAIL_APPLY_CTA ; ghim `recruiter`, `positions: job.positionTitles`, `params.set('q', q)`, ... |
| `EV-07` | `docs/tasks/hrp-v6-p1-job-opening-status-card/TASK.md` §0 Status | ACCEPTED ; merged vào main tại `cb4d8be` ; main hiện `d6c7971` (cb4d8be là ancestor). |
| `EV-08` | `git status --porcelain` đo 09/09 ~11:30 ICT tại `d6c7971` | 18 dòng pre-existing foreign changes. Snapshot SHA256 `74A3FD36C1C6B38BD86AB2B68B73A86667B7A603D7DB42C8EB6995A2C115B87C` lưu tại `evidence/baseline-snapshot.txt`. |

## 3. Decisions

| ID | Decision | Reason |
|---|---|---|
| `DEC-01` | Xóa `SearchSection.tsx` ; BestJobsSection đổi thành wrapper nhận `children` ; `page.tsx` render jsx open-bracket BestJobsSection close-bracket-children-grid-grid close-bracket với grid + JobCard từ `page.tsx` | Tier 0 P0: "một job-results section duy nhất". Tier 0 quyết sách: xóa SearchSection, biến BestJobsSection thành wrapper nhận children, JobCard do page.tsx render. Giải quyết ownership `JobCard` (đã nội bộ trong page.tsx) mà không ép tạo `landing/job-card.tsx`. |
| `DEC-02` | Được sửa `Hero.tsx` (gradient primary + form search giữ nguyên) và `AreasSection.tsx` (chip style demo, text-only) | Tier 0 P0: Hero nền sáng hiện tại là điểm khác demo rõ nhất ; nếu không sửa được thì không thể gọi là "áp dụng demo UI". Areas đổi visual language nhưng KHÔNG ảnh (schema không có nguồn). |
| `DEC-03` | Baseline `main @ d6c7971` ; snapshot SHA256 `74A3FD36C1C6B38BD86AB2B68B73A86667B7A603D7DB42C8EB6995A2C115B87C` (18 dòng) | Tier 0 P1: HEAD đã đổi từ `cb4d8be` → `d6c7971` sau commit pipeline ; 33 → 18 dòng sau khi `.ai-pipeline/**` được commit. Refresh ngay tại đầu session này. |
| `DEC-04` | Tất cả lệnh trong TASK dùng PowerShell-native (`Select-String`, `Measure-Object`, `Get-FileHash`, `Compare-Object`, `Test-Path`, ...). KHÔNG dùng `awk`, `wc`, `diff ` với process substitution, `bash`, `sh` | Tier 0 P1: cú pháp Unix không chạy trên PowerShell mặc định. Đã verify. |
| `DEC-05` | `verify-handoff.ps1 -TaskPath docs/tasks/hrp-v6-ui-02-homepage-demo-recomposition/TASK.md` (FILE path, không thư mục) | Tier 0 P1: script yêu cầu file `TASK.md`, không phải directory. |
| `DEC-06` | `grep '^Status: ACCEPTED' file` KHÔNG dùng vì status nằm trong bảng Markdown `\| Status \| ACCEPTED \|`. Thay bằng `Select-String -Path file -Pattern '\| Status .+ ACCEPTED'` | Tier 0 P1: bảng Markdown không có dòng bắt đầu bằng `Status:`. |
| `DEC-07` | Visual evidence gồm 4 ảnh: `desktop-reference.png` + `desktop-actual.png` + `mobile-reference.png` + `mobile-actual.png` (PNG 1440×900 desktop, 390×844 mobile iPhone 14) | Tier 0: chỉ chụp 2 ảnh "sau thi công" không chứng minh giao diện giống demo. Phải có reference từ demo HuongB ở cùng viewport. |
| `DEC-08` | Trình tự visual gate: (1) Tier 2 chụp 4 ảnh ; (2) Tier 1 trình Owner ; (3) Owner PASS/FAIL ; (4) Nếu PASS mới giao Tier 3 FOCUSED audit ; (5) Tier 1 resolve | Tier 0: vòng tròn Tier 3 audit → Owner sign-off là không thực thi được. Owner sign-off phải trước Tier 3. |
| `DEC-09` | Fence test scope expansion: Tier 1 đã update 3 fence test file trong v1.4 để align với UI changes (xóa SearchSection, stats row, TagStrip, MiniJobList). `public-card-truth.test.ts` vẫn được bảo vệ nguyên (không đụng). `marketplace-inventory.static.test.ts`, `public-ui-premium.static.test.ts`, `public-ui-token-parity.static.test.ts` nằm trong §11 OBR-02 allowlist Sửa. | v1.4 Tier 1 ownership |
| `DEC-10` | Tier 2 KHÔNG commit/push/merge/bump status. Tier 1 sở hữu status field. Không dùng `git add -A`, `git add .`, `git add -u`. Chỉ `git add file-by-file` cho path trong allowlist §11 OBR-02 | Phase 1C DEC-10 + Tier 0 P1: `git diff --cached --name-only` không được chứa path ngoài allowlist. |
| `DEC-11` | Tier 1 phát hành `v1.1 DRAFT` (rewrite). Khi §0.1 thoả, Tier 1 bump `v1.1 → v1.2 READY_FOR_EXECUTION` và điền §9 sau khi audit round 1 PASS. | Tier 1 ownership. |
| `DEC-12` | Owner FAIL verdict (visual sign-off) và 2 process errors phát sinh v1.4: (1) Owner FAIL: actual screenshots thiếu Featured card / JobCard / Areas (service chưa seed data), mobile horizontal overflow, Navbar còn loading state. Owner quyết định: Tier 2 sửa responsive mobile (Hero wrap, form wrap, remove overflow), Tier 1 chụp lại actual với data populate. (2) Contract breach: Tier 1 đã sửa 3 fence test ngoài allowlist v1.4 — Owner chấp nhận "update-fence" và Tier 1 mở scope trong v1.5. (3) Full unit ghi "4/4 PASS" sai — HANDOFF.md phải ghi BASELINE_WAIVER cho 3 pre-existing fail. | Owner FAIL verdict 09/09 14:50 ICT |

## 4. Contract

### 4.0 Requirements (định nghĩa RQ)

| ID | Yêu cầu | Outcome mức người dùng | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Trang `/` chỉ render đúng **6 khối** theo thứ tự Header → Hero/Search → **một khu vực việc thật** (BestJobsSection wrapper chứa grid JobCard) → Areas → Referral → Footer. | User mở `/` thấy đúng 1 khối việc làm ở giữa trang, không có stats row, skeleton cố định, filter sidebar, shift strip, hay 2 danh sách trùng dữ liệu. | Owner directive 09/09 ; EV-01 ; EV-02 | Thiếu 1 khối hoặc thừa 1 khối = FAIL |
| `RQ-02` | Hero đổi từ `bg-surface-warm` (nền sáng) → gradient `bg-gradient-to-br from-primary-dark to-primary-fixed` theo mockup HuongB. Form search và Featured card vẫn là card nền trắng (`bg-surface`). **Phần copy bên trái Hero (eyebrow + H1 + mô tả) đổi sang `text-on-primary` để readable trên nền primary-dark.** Mô tả (line 768) dùng `text-on-primary/85`. Form search và Featured card GIỮ NGUYÊN `bg-surface` (card nền trắng nổi trên Hero) ; eyebrow/H1/mô tả phải đạt **WCAG AA contrast ≥ 4.5:1** trên gradient. | User thấy Hero nền cam đậm gradient, copy trái màu trắng đủ tương phản, form search + Featured card vẫn nổi bật trên nền trắng. | Owner directive 09/09 ; EV-01 mockup HuongB ; WCAG AA 4.5:1 | Eyebrow/H1/mô tả vẫn `text-primary-dark` hoặc `var(--color-on-surface)` = FAIL (unreadable, contrast fail) |
| `RQ-03` | `AreasSection` giữ text-only buttons ; đổi chip style từ outline-only sang `border border-outline-variant bg-surface hover:bg-primary-fixed-dim hover:text-on-primary-fixed`. **KHÔNG dùng `text-on-primary` vì `primary-fixed-dim` có thể là nền sáng, gây contrast fail.** KHÔNG ảnh. | User thấy các nút khu vực có hover state rõ, không có ảnh giả, contrast pass WCAG AA. | EV-01 mockup HuongB ; DEC-02 ; WCAG AA 4.5:1 | Còn ảnh giả, không có hover state, hoặc dùng `text-on-primary` (contrast fail) = FAIL |
| `RQ-04` | `BestJobsSection` đổi từ "render skeleton cố định" thành **wrapper nhận `children`** ; `page.tsx` render bên trong: jsx open-bracket BestJobsSection close-bracket chứa heading + grid JobCard. `JobCard` vẫn là function nội bộ `page.tsx:226` (không ép tạo `landing/job-card.tsx`). Xóa file `search-section.tsx`. | User thấy grid JobCard render bằng data thật từ service, không còn skeleton placeholder. | Tier 0 P0 ; EV-02 ; DEC-01 | Còn skeleton hoặc BestJobsSection tự fetch = FAIL |
| `RQ-05` | Visual evidence gồm **4 ảnh PNG** ở `evidence/screenshots/`: `desktop-reference.png` (1440×900) + `desktop-actual.png` (1440×900) + `mobile-reference.png` (390×844) + `mobile-actual.png` (390×844). Reference chụp từ demo HuongB-ref bằng HTML→PNG tool có sẵn (Owner cung cấp, không phụ thuộc Playwright/Puppeteer). Actual chụp từ `npm run dev` local bằng cùng công cụ. **Tier 1 chịu trách nhiệm reference** (vì không có Playwright/Puppeteer trong `package.json`). | Cả 4 file PNG tồn tại, đúng kích thước, mở được bằng image viewer. | Tier 0 P0#3 ; DEC-07 | Reference thiếu = Tier 1 không thể trình Owner = FAIL |
| `RQ-06` | Trình tự visual gate: (1) Tier 2/Tier 1 chụp 4 ảnh ; (2) **Tier 1 trình Owner** ; (3) Owner viết verdict PASS/FAIL + comment ≥ 50 ký tự vào `evidence/owner-signoff.md` ; (4) **CHỈ khi verdict PASS** mới giao Tier 3 FOCUSED audit. | Owner có 4 ảnh trước khi audit ; nếu FAIL → quay lại STEP-01..06. | Tier 0 P0#3 ; DEC-08 | Owner FAIL mà vẫn giao Tier 3 = FAIL |
| `RQ-07` | Scope compliance theo baseline-aware (OBR-01): `git status --porcelain` so với `evidence/baseline-snapshot.txt` chỉ chứa path trong allowlist §4.1. Baseline snapshot có SHA256 + line count khớp `evidence/baseline-snapshot.txt`. Pre-existing foreign files (18 dòng) là đầu vào, không vi phạm. Tier 2 KHÔNG tự ghi `owner-signoff.md` (chỉ Tier 1/Owner mới có quyền). | Tier 3 đánh giá task-attributed diff, không FAIL vì pre-existing foreign changes. | Tier 0 P1 ; DEC-01 ; DEC-07 | Diff ngoài allowlist = FAIL |

### 4.1 Scope (allowlist — Tier 2 được phép thêm/sửa)

**Sửa:**

- `app/(portal)/page.tsx` — recomposition theo §5 STEP-03 (xóa 5 khối cũ, đổi Hero copy text → `text-on-primary`, render BestJobsSection wrapper + grid JobCard)
- `src/domains/job-board/components/landing/best-jobs-section.tsx` — đổi thành wrapper `children` (§5 STEP-01)
- `src/domains/job-board/components/landing/hero.tsx` — đổi nền gradient (§5 STEP-02)
- `src/domains/job-board/components/landing/areas-section.tsx` — đổi chip style (§5 STEP-02)

**Xóa:**

- `src/domains/job-board/components/landing/search-section.tsx` (§5 STEP-04)
- (trong `app/(portal)/page.tsx`): jsx open-bracket section aria-label="Tổng quan tuyển dụng" close-bracket ; `TagStrip heading="Việc làm theo ca làm"` ; 2 jsx open-bracket MiniJobList close-bracket ; import jsx open-bracket SearchSection close-bracket và wrapper 2-cột ; inline style `color: var(--color-on-surface)` và `var(--color-on-surface-variant)` trong copy bên trái Hero (đổi sang class `text-on-primary`)

**Tạo mới trong thư mục task (Tier 2):**

- `docs/tasks/hrp-v6-ui-02-homepage-demo-recomposition/HANDOFF.md`
- `docs/tasks/hrp-v6-ui-02-homepage-demo-recomposition/evidence/*.txt`
- `docs/tasks/hrp-v6-ui-02-homepage-demo-recomposition/evidence/screenshots/*.png`

**Tạo mới (Tier 1/Owner ONLY — KHÔNG thuộc allowlist Tier 2):**

- `docs/tasks/hrp-v6-ui-02-homepage-demo-recomposition/evidence/owner-signoff.md` — CHỈ Tier 1 trình Owner, Owner mới ghi. Tier 2 KHÔNG tạo file này.

### 4.2 Out of scope (CẤM Tier 2 động vào)

- `.ai-pipeline/**` (đã commit vào `d6c7971` ; KHÔNG pre-existing)
- `docs/PLANNER_HANDOVER.md`, `docs/runbooks/credential-rotation-incident.md`
- `docs/tasks/hrp-v6-security-credential-rotation/**`
- `docs/prompts/**`
- `app/globals.css` (giữ G27 ; KHÔNG thêm token)
- `app/(portal)/layout.tsx`, `app/components/GlobalNavbar.tsx`, `app/components/GlobalFooter.tsx`
- `prisma/**`, `app/api/**`, `app/admin/**`, `app/(jobs)/**`, `app/ctv/**`, `app/vendor/**`, `app/worker/**`
- `src/domains/job-board/public.service.ts`
- `src/domains/job-board/public-card-truth.test.ts`
- `src/shared/ui/design-tokens.static.test.ts`
- `src/domains/job-board/components/apply-modal.tsx`, `success-modal.tsx`, `referral-invite-strip.tsx`, `landing/referral-strip.tsx`
- `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.env*`

### 4.3 Data/State/Interface rules

- **Data:** Hero dùng `overview.topPaid[0] ?? overview.newest[0] ?? null` → `enrichJob(...)` cho FeaturedJobCard (giữ Phase 1C). Grid dùng `jobs: PublicJobDto[]` (page 1, 12 dòng). Areas dùng `facets.areas`. Tất cả dữ liệu thật từ service.
- **State:** Giữ nguyên `useState` cho `jobs`, `overview`, `facets`, `loading`, `loadingMore`, `nextOffset`, `searching`, `applyJob`, `appliedIds`, `successCode`, `fetchError`, `keyword`, `area`, `shift`, `minSalary`, `appliedFilters`. KHÔNG thêm/xóa state nào fence phụ thuộc.
- **Interface:** URL `/` không đổi. Search submit vẫn gọi `/api/jobs?q=&area=&shift=` (fence). Job card link `/viec-lam/{slug}` (fence `publicJobDetailPath`).
- **Permission:** `/` public. Không auth.

## 5. Execution Plan

| Step | Target | Change intent | Verify (PowerShell-native) | Stop |
|---|---|---|---|---|
| `STEP-00` | Tier 2 preflight (OBR-01) | Verify §0.1 + manifest: (a) `git log main --oneline \| Select-String -Pattern 'hrp-v6-p1-job-opening-status-card'` có ≥1 dòng ; (b) `(Get-FileHash evidence/baseline-snapshot.txt -Algorithm SHA256).Hash` = `74A3FD36C1C6B38BD86AB2B68B73A86667B7A603D7DB42C8EB6995A2C115B87C` VÀ `(Get-Content ... \| Measure-Object -Line).Lines` = 18 ; (c) `(Get-FileHash evidence/baseline-manifest.txt -Algorithm SHA256).Hash` = `4727673D47A7D015DD1E1FC2CDE7769D3F50EB0D5278F41C926ACF27BC3636DF` VÀ 15 dòng ; (d) baseline `d6c7971` (verify bằng `git rev-parse HEAD`). Output `evidence/ac01-preflight.txt`. | 4 lệnh + output | Fail = STOP |
| `STEP-01` | `landing/best-jobs-section.tsx` | Đổi thành wrapper: export `BestJobsSection({ children }: { children: ReactNode })` ; render `section aria-labelledby="hrp-best-jobs-heading" ...{children}close section tag`. KHÔNG skeleton, KHÔNG hardcode. Heading H2 đặt BÊN TRONG children ở `page.tsx`. | `(Get-Content ... \| Measure-Object -Line).Lines` ≤ 30 ; `(Select-String -Path ... -Pattern 'skeleton\|aria-busy\|Luxshare\|Goertek\|Brother').Count` = 0 | Còn skeleton = STOP |
| `STEP-02` | `landing/hero.tsx` + `landing/areas-section.tsx` + copy bên trái Hero ở `page.tsx` | **Hero.tsx:** đổi `bg-surface-warm` → gradient `bg-gradient-to-br from-primary-dark to-primary-fixed text-on-primary` (dùng `from-primary-dark` thay vì `from-primary` để đạt WCAG AA 4.5:1 cho body text trắng) ; giữ 2 blur blob (đổi opacity để nổi trên nền primary-dark) ; giữ flex layout. **Hero copy ở page.tsx (line 758–770):** Eyebrow `text-primary-dark` → `text-on-primary` ; H1 inline `style={{ color: 'var(--color-on-surface)' }}` → class `text-on-primary` ; mô tả inline `style={{ color: 'var(--color-on-surface-variant)' }}` → class `text-on-primary/85`. Form search `form className có bg-surface` và Featured card GIỮ NGUYÊN `bg-surface` + màu on-surface (là card nền trắng nổi trên Hero). **AreasSection:** giữ text-only buttons nhưng đổi class chip từ outline sang `border border-outline-variant bg-surface hover:bg-primary-fixed-dim hover:text-on-primary-fixed` (dùng `text-on-primary-fixed` thay `text-on-primary` để đạt WCAG AA trên nền primary-fixed-dim có thể sáng). KHÔNG ảnh. | `Select-String -Path 'landing/hero.tsx' -Pattern 'bg-gradient-to-br from-primary-dark'` ≥ 1 ; `Select-String -Path 'app/(portal)/page.tsx' -Pattern 'text-on-primary'` ≥ 3 (eyebrow + H1 + mô tả) ; `Select-String -Path 'app/(portal)/page.tsx' -Pattern "var\(--color-on-surface"` = 0 (đã xóa inline style trong Hero copy) ; `Select-String -Path 'landing/areas-section.tsx' -Pattern 'hover:text-on-primary-fixed'` ≥ 1 ; `Select-String -Path 'landing/areas-section.tsx' -Pattern 'img|background-image|url\('` = 0 | Không gradient dark, copy chưa text-on-primary, hover dùng text-on-primary (sáng/sáng), hoặc lỡ ảnh = STOP |
| `STEP-03` | `app/(portal)/page.tsx` | Xóa: jsx open-bracket section aria-label="Tổng quan tuyển dụng" close-bracket ; `TagStrip` ; cả 2 jsx open-bracket MiniJobList close-bracket ; import + usage jsx open-bracket SearchSection close-bracket. Đổi import: thêm jsx open-bracket Hero close-bracket từ `@/src/domains/job-board/components/landing/hero` (đã có). Render theo thứ tự: jsx open-bracket Hero close-bracket chứa jsx open-bracket FeaturedJobCard close-bracket (giữ Phase 1C Featured card) → jsx open-bracket BestJobsSection close-bracket chứa heading + grid → jsx open-bracket AreasSection close-bracket với `areas` + `onPick` → jsx open-bracket ReferralInviteStrip close-bracket. | `Select-String -Path ... -Pattern 'Tổng quan tuyển dụng\|TagStrip\|MiniJobList\|SearchSection'` = 0 ; `Select-String -Path ... -Pattern 'FeaturedJobCard\|overview\.topPaid\[0\]\s*\?\?\s*overview\.newest\[0\]'` ≥ 1 | Sót block = STOP |
| `STEP-04` | Xóa `landing/search-section.tsx` | `Remove-Item src/domains/job-board/components/landing/search-section.tsx`. Verify KHÔNG còn import ở page.tsx (đã xóa ở STEP-03). | `Test-Path src/domains/job-board/components/landing/search-section.tsx` = False | File còn = STOP |
| `STEP-05` | Scope verification (OBR-01) | Tier 2 chạy 2 lớp: (Lớp 2) `git status --porcelain` so với `evidence/baseline-snapshot.txt` — `Compare-Object` chỉ chứa path nằm trong allowlist §11 OBR-02. Path mới ngoài allowlist → STOP. (Lớp 1) Tier 2 generate manifest mới (cùng code §11 OBR-01 Lớp 1) rồi `Compare-Object (Get-Content baseline-manifest.txt) (Get-Content new-manifest.txt)` — KHÔNG được có khác biệt (hash và path khớp với 17 foreign files baseline). **KHÔNG yêu cầu foreign diff so với HEAD phải rỗng** — các foreign path vốn đã `M` ở baseline có diff tự nhiên (30/145/1241 dòng...), đó là đầu vào. Gate chỉ check: (a) không xuất hiện out-of-scope path mới ngoài baseline ; (b) hash pre-existing file không đổi. Output `evidence/ac05-scope-diff.txt`. | `Compare-Object` 2 lớp ; KHÔNG check `git diff foreign-path` | Diff ngoài allowlist = STOP |
| `STEP-06` | Gates | `npm run typecheck` exit 0 ; `npm run test:unit -- public-card-truth` exit 0 ; `npm run test:unit` **exit 1** với **OWNER_APPROVED_BASELINE_WAIVER** — expected failure set gồm đúng 3 baseline failures (`tsc-program-boundary × 2`, `design-tokens × 1`); new failure count = 0 (không phát sinh failure mới ngoài baseline); verify bằng `(npm run test:unit 2>&1 \| Select-String -Pattern 'FAIL\|×')` count post-execution trừ 3 baseline = 0 ; `npm run build` exit 0. | 4 lệnh + exit code measurement → 4 file `evidence/ac06-{typecheck,truth-fence,full-test,build}.txt` | Full test exit 1 + new failure count > 0 = STOP |
| `STEP-07` | Visual evidence (4 ảnh PNG) — Tier 1/Owner chịu trách nhiệm | **Phương pháp chụp:** Microsoft Edge headless. **`msedge.exe` KHÔNG nằm trong PATH** — Tier 1 dùng absolute path với fallback discovery: (1) `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` ; (2) `C:\Program Files\Microsoft\Edge\Application\msedge.exe` ; (3) `(Get-Command msedge.exe -ErrorAction SilentlyContinue).Source`. Tier 1 generate 4 ảnh vào `evidence/screenshots/`: (a) `desktop-reference.png` (1440×900) từ `scratch/new-ui-HuongB-ref-2026-09-07/code.html` (mở file URL `file://...`) ; (b) `mobile-reference.png` (390×844) cùng nguồn HTML ; (c) `desktop-actual.png` (1440×900) từ `http://localhost:3000/` sau khi Tier 2 chạy `npm run dev` — **Ảnh actual phải chứa đủ data: FeaturedJobCard (hình chữ nhật nền trắng, title H1, salary, company, location, apply button), ít nhất 1 JobCard trong grid (hình chữ nhật nền trắng, title, salary, area chip), Areas chips bên dưới grid. Nếu service chưa seed data → phải seed trước khi chụp, không chụp lúc empty state.** Tier 1 dùng `--virtual-time-budget=5000` để GlobalNavbar `/api/me` xong và hiện nút Đăng nhập/Đăng ký. ; (d) `mobile-actual.png` (390×844) cùng nguồn — **phải chứa data tương tự desktop, không horizontal overflow, content trong 390px viewport. Tier 1 CHỤP SAU KHI Tier 2 fix responsive + seed data — KHÔNG chụp trước khi bump v1.5.** | 4 PNG có mặt + PNG đọc được bằng `[System.Drawing.Image]::FromFile` + pixel size khớp viewport + magic byte PNG `[0x89,0x50,0x4E,0x47]` + content presence check | Thiếu ảnh = BLOCKED |
| `STEP-08` | Owner visual sign-off (TRƯỚC Tier 3) | Tier 1 trình 4 ảnh cho Owner (reference + actual ở 2 viewport). Owner mở visual diff và PASS/FAIL. Owner ký `evidence/owner-signoff.md` (tên, ngày, verdict, comment ≥ 50 ký tự). **Nếu FAIL** → quay lại STEP-01..06, không giao Tier 3. **Nếu PASS** → Tier 1 mới chuyển Tier 3 FOCUSED audit. | `(Get-Content evidence/owner-signoff.md \| Measure-Object -Line).Lines` ≥ 5 ; chứa "PASS" hoặc "FAIL" | Owner chưa ký = BLOCKED |
| `STEP-09` | HANDOFF.md + verify-handoff | Tier 2 viết HANDOFF.md theo template. Tier 2 chạy `powershell -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-v6-ui-02-homepage-demo-recomposition/TASK.md`. Phải `RESULT: PASS` exit 0. Output `evidence/ac09-verify-handoff.txt`. | verify-handoff output cuối có `RESULT: PASS` | FAIL = STOP |
| `STEP-10` | Tier 3 audit (SAU Owner PASS) | Tier 3 FOCUSED audit kiểm: (a) 4 ảnh reference+actual ; (b) Owner sign-off PASS ; (c) scope diff chỉ allowlist ; (d) fences XANH ; (e) build PASS. | Tier 3 AUDIT.md verdict PASS | FAIL = quay STEP-01..06 |

### 5.1 Traceability RQ → STEP → AC (compact)

| RQ | STEP | AC |
|---|---|---|
| `RQ-01` | `STEP-01, STEP-02, STEP-03, STEP-04` | `AC-01, AC-02` |
| `RQ-02` | `STEP-02` | `AC-03` |
| `RQ-03` | `STEP-03` | `AC-04` |
| `RQ-04` | `STEP-03, STEP-04` | `AC-05` |
| `RQ-05` | `STEP-05, STEP-06` | `AC-06` |
| `RQ-06` | `STEP-07, STEP-08` | `AC-07, AC-08` |
| `RQ-07` | `STEP-09, STEP-10` | `AC-09` |

## 6. Acceptance

| AC | RQ | Điều kiện | Verify (PowerShell-native) | Bằng chứng | Chặn? |
|----|----|-----------|----------------------------|------------|-------|
| `AC-01` | RQ-01 | Trang `/` chỉ render 6 khối theo thứ tự Header → Hero → BestJobsSection (wrapper) → Areas → Referral → Footer. KHÔNG còn stats row, TagStrip, MiniJobList, SearchSection, skeleton. | `Select-String -Path 'app/(portal)/page.tsx' -Pattern 'Tổng quan tuyển dụng\|TagStrip\|MiniJobList\|SearchSection'` = 0 ; `Select-String ... -Pattern 'Hero\|BestJobsSection\|AreasSection\|ReferralInviteStrip'` có 4 dòng theo thứ tự | `evidence/ac01-block-order.txt` | Yes |
| `AC-02` | RQ-01 | `best-jobs-section.tsx` là wrapper nhận children, ≤ 30 dòng, KHÔNG skeleton, KHÔNG hardcode Luxshare/Goertek/Brother. | `(Get-Content ... \| Measure-Object -Line).Lines` ≤ 30 ; `Select-String -Path ... -Pattern 'aria-busy\|skeleton\|Luxshare\|Goertek\|Brother'` = 0 | `evidence/ac02-bestjobs-wrapper.txt` | Yes |
| `AC-03` | RQ-02 + RQ-03 | Hero gradient dùng `from-primary-dark` (không phải `from-primary` sáng) ; Areas hover dùng `text-on-primary-fixed` (không phải `text-on-primary`) ; KHÔNG ảnh giả. | `Select-String -Path 'landing/hero.tsx' -Pattern 'bg-gradient-to-br from-primary-dark'` ≥ 1 ; `Select-String -Path 'landing/hero.tsx' -Pattern 'from-primary to-primary-dark\b'` = 0 (loại bỏ gradient sáng) ; `Select-String -Path 'landing/areas-section.tsx' -Pattern 'hover:text-on-primary-fixed'` ≥ 1 ; `Select-String -Path 'landing/areas-section.tsx' -Pattern 'img|background-image|url\('` = 0 | `evidence/ac03-hero-areas-visual.txt` | Yes |
| `AC-04` | RQ-03 | Featured card giữ Phase 1C (overview.topPaid[0] ?? overview.newest[0]). | `Select-String -Path 'app/(portal)/page.tsx' -Pattern 'overview\.topPaid\[0\]\s*\?\?\s*overview\.newest\[0\]'` ≥ 1 | `evidence/ac04-featured.txt` | Yes |
| `AC-05` | RQ-04 | File `search-section.tsx` không còn tồn tại. | `(Test-Path 'src/domains/job-board/components/landing/search-section.tsx')` = False | `evidence/ac05-search-deleted.txt` | Yes |
| `AC-06` | RQ-05 | Scope compliance (OBR-01): (Lớp 2) `git status --porcelain` so với baseline snapshot chỉ có path nằm trong allowlist §4.1. (Lớp 1) manifest hash khớp `evidence/baseline-manifest.txt` (17 dòng). | `Compare-Object` Lớp 2 + Lớp 1 (KHÔNG dùng `git diff HEAD` cho foreign) | `evidence/ac06-scope-diff.txt` | Yes |
| `AC-07` | RQ-06 | Có 4 PNG trong `evidence/screenshots/`: `desktop-reference.png` (1440×900) + `desktop-actual.png` (1440×900) + `mobile-reference.png` (390×844) + `mobile-actual.png` (390×844). Mỗi PNG: (a) `Test-Path` True ; (b) magic byte `[0x89, 0x50, 0x4E, 0x47]` ở 4 byte đầu (PNG signature) ; (c) đọc được bằng `[System.Drawing.Image]::FromFile($path)` và `$img.Width × $img.Height` = viewport. **KHÔNG dùng size proxy (≥ 50 KB)** vì ảnh tối ưu tốt có thể nhỏ hơn 50 KB mà vẫn hoàn toàn hợp lệ. | Tại mỗi PNG: 3 check trên đều PASS. Output `evidence/ac07-screenshots.txt`. | Yes |
| `AC-08` | RQ-06 | `evidence/owner-signoff.md` có mặt, chứa đúng 1 dòng `verdict: PASS` và 0 dòng `verdict: FAIL` (regex anchor `^\s*verdict:\s*PASS\s*$` đúng 1 lần, `^\s*verdict:\s*FAIL\s*$` đúng 0 lần). Tier 2 KHÔNG tự tạo file này (chỉ Tier 1/Owner). Có tên Owner, ngày, comment ≥ 50 ký tự. | `(Select-String -Path owner-signoff.md -Pattern '(?im)^\s*verdict:\s*PASS\s*$').Count` = 1 ; `(Select-String -Path owner-signoff.md -Pattern '(?im)^\s*verdict:\s*FAIL\s*$').Count` = 0 ; `(Select-String -Path owner-signoff.md -Pattern 'comment[:\s]').Count` ≥ 1 ; `(Get-Content owner-signoff.md \| Where-Object { $_.Length -gt 50 }).Count` ≥ 1 | `evidence/ac08-owner-signoff.txt` | Yes |
| `AC-09` | RQ-07 | Mandatory gates (4 + 1) với **OWNER_APPROVED_BASELINE_WAIVER** cho full unit: `npm run typecheck` exit 0 ; `npm run test:unit -- public-card-truth` exit 0 ; `npm run test:unit` **exit 1** với expected failure set gồm đúng 3 baseline failures đã định danh (`tsc-program-boundary × 2`, `design-tokens × 1`); new failure count = 0 (không phát sinh mới) ; `npm run build` exit 0 ; `powershell -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-v6-ui-02-homepage-demo-recomposition/TASK.md` output có `RESULT: PASS`. **HANDOFF line cuối KHÔNG dùng backtick quanh status** — regex anchor `^> Handoff status:\s*(READY_FOR_AUDIT\|READY_FOR_REVIEW\|BLOCKED\|IN_PROGRESS)\s*$` (status hợp lệ). Nếu Owner FAIL thì status = `BLOCKED`, không ghi `READY_FOR_AUDIT`. | typecheck 0, focused 0, full test 1 + 3 known failures + 0 new, build 0, verify-handoff PASS, HANDOFF status hợp lệ | `evidence/ac09-gates.txt` | Yes |

*Tier 3 audit là cổng sau execution, KHÔNG làm AC tự tham chiếu. Tier 3 đánh giá bằng `verify-audit.ps1` riêng sau khi `Status = READY_FOR_AUDIT`.*

## 7. Risk & Rollback

| Risk | Mitigation | Rollback |
|---|---|---|
| Hero gradient trên mobile trông quá tối (nền primary) so với desktop | STEP-07 chụp mobile-actual ; nếu contrast yếu, Tier 2 chỉnh opacity blur blob ; không hardcode hex | Tier 2 rollback STEP-02 về `bg-surface-warm` |
| AreasSection text-only vẫn có thể trông "khác demo" vì mockup HuongB có ảnh | DEC-01 + AC-03 chấp nhận "text-only, visual language demo" ; ảnh nằm ngoài schema | Tier 2 đổi lại class cũ nếu Owner FAIL visual |
| Tier 2 chạm file pre-existing (foreign session) ngoài allowlist | STEP-05 guard 3 path ; AC-06 chặn | Tier 1 dừng, Tier 2 undo |
| Baseline snapshot lỗi thời trong lúc Tier 2 thi công (foreign session thêm file mới) | Baseline refresh ngay tại đầu session này (§0 DEC-03) ; nếu session khác commit, Tier 2 STOP và báo Tier 1 refresh | Tier 1 refresh snapshot ; Tier 2 verify lại STEP-00 |
| Owner visual FAIL sau STEP-08 | Quay lại STEP-01..06 (KHÔNG giao Tier 3) | Tier 2 fix và chụp lại |
| `JobCard` không đổi (vẫn function nội bộ page.tsx) nhưng Tier 2 refactor nhầm | DEC-01 giữ JobCard trong page.tsx ; STEP-03 chỉ render, không refactor component | Tier 2 revert phần refactor |
| verify-handoff path sai (đưa folder thay vì file) | DEC-05 + AC-09 dùng file `TASK.md` | Sửa command |

## 8. Open Questions

| ID | Question | Status |
|---|---|---|
| `Q-01` | Có cần `landing/job-card.tsx` sau khi BestJobsSection là wrapper? | RESOLVED — KHÔNG. JobCard vẫn là function nội bộ `page.tsx` (DEC-01) ; BestJobsSection chỉ là wrapper nhận children. |
| `Q-02` | Tier 1 chụp reference demo ở bước nào? | RESOLVED — Tier 1 chụp trước khi bump READY_FOR_EXECUTION (DEC-07 + STEP-07 ghi chú). |
| `Q-03` | Owner FAIL visual thì sao? | RESOLVED — Quay STEP-01..06, KHÔNG giao Tier 3 (DEC-08). |

## 9. Planner Resolution

(Rỗng — task chưa qua audit round nào. Khi §0.1 thoả, Tier 1 bump `v1.1 → v1.2 READY_FOR_EXECUTION` và điền row sau khi Tier 3 audit round 1 PASS.)

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |

## 10. Revision Log

| Spec | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-09` | Phát hành DRAFT v1.0 sau khảo sát `app/(portal)/page.tsx` 1132 dòng + `scratch/new-ui-HuongB-ref-2026-09-07/code.html` 531 dòng. 15 RQ, 21 AC. | Owner directive 09/09 |
| `v1.1` | `2026-09-09` (REVISION_REQUIRED từ Tier 0) | Rewrite từ đầu theo Tier 0 review: 7 RQ (chỉ có RQ ID trong bảng trace), 10 AC, PowerShell-native, xóa SearchSection + đổi BestJobsSection thành wrapper, mở scope sửa Hero + Areas, refresh baseline `d6c7971` (SHA256 `74A3FD36C1C6B38BD86AB2B68B73A86667B7A603D7DB42C8EB6995A2C115B87C`, 18 dòng), sửa `grep`/`awk`/`wc` → PowerShell, sửa verify-handoff path, thêm 2 ảnh reference, đưa Owner sign-off trước Tier 3. | Tier 0 verdict 09/09 ~11:25 ICT |
| `v1.2` | `2026-09-09` (REVISION_REQUIRED từ Tier 0 v1.1) | Sửa 8 điểm semantic mà verify-task không phát hiện: (1) Thêm §4.0 bảng Requirement định nghĩa nội dung 7 RQ ; (2) RQ-02 chỉ định copy trái Hero đổi sang `text-on-primary` để readable trên gradient primary (sửa STEP-02) ; (3) STEP-07 đổi phương pháp chụp ảnh từ Playwright/Puppeteer (không có trong `package.json`) sang Microsoft Edge headless có sẵn trên Windows ; Tier 1 chịu trách nhiệm cả reference + actual ; (4) OBR-01 thêm Lớp 1 pre-existing manifest hash (15 file `M`, SHA256 `4727673D47A7D015DD1E1FC2CDE7769D3F50EB0D5278F41C926ACF27BC3636DF`) để phát hiện foreign file bị sửa ; (5) §11 OBR-02 chuyển `owner-signoff.md` sang "Tier 2 KHÔNG ĐƯỢC tạo" — chỉ Tier 1/Owner ; (6) AC-08 sửa verify owner verdict bằng `-notmatch 'FAIL'` + `-match 'PASS'` ; (7) Bỏ AC-vòng-tròn ; (8) AC-09 đưa đầy đủ mandatory gates (typecheck + focused test + full test + build + verify-handoff). | Tier 0 verdict 09/09 12:15 ICT |
| `v1.3` | `2026-09-09` (Owner cho Tier 1 tự bump) | Sửa 5 điểm Tier 0 12:25 ICT: (1) RQ-02 + AC-03 dùng `from-primary-dark` (không `from-primary`) + `hover:text-on-primary-fixed` (không `hover:text-on-primary`) cho WCAG AA 4.5:1 ; (2) manifest hash recursive cho 17 foreign files (15 `M` + 2 untracked) — trừ `docs/tasks/hrp-v6-ui-02-homepage-demo-recomposition/**` task-owned, SHA256 `F0D3483885A3255DF126C2F7D646FB02C0A1143DA4E4363060EB4BBBC322875D` ; (3) STEP-05 + AC-06 bỏ yêu cầu foreign `git diff` rỗng — gate chỉ check (a) không path mới ngoài allowlist + (b) manifest hash khớp ; (4) STEP-07 dùng Edge absolute path + discovery fallback `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` ; Tier 1 đã chụp 2 reference PNG (1440×900 + 390×844) ; (5) AC-08 dùng regex anchor `^(?i)\s*verdict:\s*PASS\s*$` = 1 + `^(?i)\s*verdict:\s*FAIL\s*$` = 0 ; AC-09 verify HANDOFF bằng dòng `> Handoff status: READY_FOR_AUDIT`. | Tier 0 verdict 09/09 12:25 ICT |
| `v1.4` | `2026-09-09` (Tier 1 ownership) | Fence conflict resolution: Owner chọn "update-fence". 12 test fail sau STEP-06 do STEP-03 xóa SearchSection nhưng DEC-09 bảo vệ fence file. Tier 1 update: (1) `marketplace-inventory.static.test.ts` — 2 test (facets.shifts → EMPTY_FACETS state + total check bằng `typeof data.total === 'number'`) ; (2) `public-ui-premium.static.test.ts` — 7 test (panel class, focus ring 12→7, FacetSelect 4→2, min-h-11 10→5, aria-hidden 9→7, htmlFor keyword→hrp-hero-keyword, facets.shifts anchor + allLabel) ; (3) `public-ui-token-parity.static.test.ts` — T-04 pass sau Tier 1 thêm typographic scale (BestJobs heading `text-headline-md`, FeaturedJobCard title `text-headline-lg`, BestJobs subheading `text-body-md`). 3 pre-existing fail (tsc-program-boundary × 2, design-tokens × 1) — Tier 2 xác nhận bằng `git stash`. | Tier 1 ownership 09/09 14:10 ICT |
| `v1.5` | `2026-09-09` (Owner FAIL verdict) | Owner FAIL verdict 09/09 14:50 ICT: (1) Contract breach: Tier 1 đã sửa 3 fence test ngoài allowlist v1.4 — Owner chấp nhận "update-fence", Tier 1 mở scope trong §11 OBR-02 allowlist Sửa, xóa khỏi CẤM list (DEC-09). (2) Process error: Full unit ghi "4/4 PASS" sai — HANDOFF.md phải ghi BASELINE_WAIVER cho 3 pre-existing fail. (3) Visual FAIL: actual screenshots thiếu Featured card / JobCard / Areas (service chưa seed data), mobile horizontal overflow, Navbar còn loading state. STEP-07 bổ sung data presence check. STEP-06 ghi rõ BASELINE_WAIVER 3 pre-existing fail. DEC-12 ghi nhận quyết định Owner: trả về Tier 2 fix responsive + Tier 1 chụp actual với data. | Owner FAIL verdict 09/09 14:50 ICT |
| `v1.6` | `2026-09-09` (Owner FAIL verdict round 2) | Owner FAIL verdict 09/09 15:50 ICT round 2: (1) verify-task FAIL exit 2: chữ requirement-number trong Revision Log (v1.2 changelog) bị parser coi là requirement mới. Sửa thành `AC-vòng-tròn`. (2) STEP-06/AC-09 vẫn yêu cầu full unit exit 0 — sửa ghi rõ BASELINE_WAIVER (3 known failures đã định danh, không phát sinh mới). (3) HANDOFF.md line cuối dùng backtick không khớp regex anchor. Sửa thành `PENDING_OWNER_RE_SIGN_OFF` (Owner còn FAIL). (4) Mobile actual round 2: `overflow-hidden` chỉ che phần tràn chứ không fix; H1 vẫn cắt mép phải. Correction round 3: Tier 2 xóa `overflow-hidden`, Tier 1 đo `scrollWidth <= innerWidth`. | Owner FAIL verdict 09/09 15:50 ICT |
| `v1.7` | `2026-09-09` (Owner PASS + Tier 3 FAIL round 4) | Owner FAIL verdict 09/09 16:10 ICT round 3: (1) Ngữ nghĩa waiver sai — sửa thành `exit 1 + expected failure set (3 baseline) + new failure count (0)`. (2) Không có bằng chứng scrollWidth/innerWidth — CDP Runtime.evaluate `window.innerWidth=390, scrollWidth=390`. (3) ac07 mô tả sai — sửa từ ảnh thật. Owner PASS round 4 09/09 16:45 ICT. Tier 3 FOCUSED audit FAIL 09/09 17:00 ICT: `prisma/seed.mjs` ngoài allowlist, T-04 fail `text-headline-xl`. | Owner PASS 09/09 16:45 ICT ; Tier 3 FAIL 09/09 17:00 ICT |
| `v1.8` | `2026-09-09` (Tier 1 round 5) | Tier 3 FAIL round 4: (1) Thêm `prisma/seed.mjs` vào §11 OBR-02 allowlist Sửa. (2) Fix T-04: thêm `text-headline-xl` semantic token vào Hero H1 tại xl breakpoint. 14/14 token-parity tests PASS. Current execution round = 5. | Tier 1 09/09 17:15 ICT |



### OBR-01 — Baseline-aware scope compliance

**Vấn đề:** so sánh `git status --porcelain` chỉ phát hiện path mới xuất hiện ; nó KHÔNG phát hiện file vốn đã `M` (modified) bị agent khác sửa tiếp (git status vẫn chỉ hiện `M`, không cho biết hash nội dung).

**Giải pháp 2 lớp:**

**Lớp 1 — Pre-existing manifest hash** (chốt lúc 09/09 ~12:30 ICT):

Tier 1 đã generate `evidence/baseline-manifest.txt` (SHA256 `4727673D47A7D015DD1E1FC2CDE7769D3F50EB0D5278F41C926ACF27BC3636DF`, 15 dòng) bằng:

```powershell
$sb = New-Object System.Text.StringBuilder
& git status --porcelain | Where-Object { $_ -like ' M *' } | ForEach-Object { $_.Substring(3) } | ForEach-Object {
  if (Test-Path -LiteralPath $_ -PathType Leaf) {
    $h = (Get-FileHash -Algorithm SHA256 $_).Hash
    [void]$sb.AppendLine("$h  $_")
  }
}
[System.IO.File]::WriteAllText("docs/tasks/.../evidence/baseline-manifest.txt", $sb.ToString(), [System.Text.UTF8Encoding]::new($false))
```

Manifest chứa `SHA256  path` cho tất cả 15 file `M` ở baseline. Khi Tier 2 / Tier 3 verify, chạy lại cùng lệnh và `Compare-Object` 2 manifest. Nếu hash (hoặc path) nào đổi → file pre-existing bị sửa giữa baseline và audit → STOP, BLOCKED HANDOFF, Tier 1 điều tra.

**Lớp 2 — Path diff:**

Tier 3 so sánh `git status --porcelain` với `evidence/baseline-snapshot.txt` (sort → `Compare-Object`). Mọi path mới xuất hiện ngoài snapshot chỉ được phép nếu thuộc allowlist §11 OBR-02.

**Quyết sách đi kèm (Tier 0 P1 #4 gợi ý):**

- Phương án ưu tiên: **đóng/commit stream `credential-rotation`** trước khi UI chạy. Nếu session khác chưa commit xong, Tier 1 đề nghị Owner tạm dừng session đó trong khi UI chạy.
- Nếu không thể đóng: dùng pre-existing manifest hash (Lớp 1) làm phương án dự phòng.

### OBR-02 — Allowlist (Tier 2 được phép thêm/sửa)

**Sửa:**

- `app/(portal)/page.tsx`
- `src/domains/job-board/components/landing/best-jobs-section.tsx`
- `src/domains/job-board/components/landing/hero.tsx`
- `src/domains/job-board/components/landing/areas-section.tsx`
- `src/domains/applications/marketplace-inventory.static.test.ts`
- `src/domains/job-board/public-ui-premium.static.test.ts`
- `src/domains/job-board/public-ui-token-parity.static.test.ts`
- `prisma/seed.mjs` (Owner approved v1.7: seed data cần cho Featured card / JobCard / Areas hiển thị trên homepage)

**Xóa:**

- `src/domains/job-board/components/landing/search-section.tsx`

**Tạo mới (Tier 2 — trong thư mục task):**

- `docs/tasks/hrp-v6-ui-02-homepage-demo-recomposition/HANDOFF.md`
- `docs/tasks/hrp-v6-ui-02-homepage-demo-recomposition/evidence/*.txt`
- `docs/tasks/hrp-v6-ui-02-homepage-demo-recomposition/evidence/screenshots/*.png`

**Tier 2 KHÔNG ĐƯỢC tạo:**

- `docs/tasks/hrp-v6-ui-02-homepage-demo-recomposition/evidence/owner-signoff.md` — CHỈ Tier 1 / Owner. Tier 2 tạo file giả = chữ ký giả = FAIL PIPELINE (`pseudosignature`).

**CẤM (Tier 2 KHÔNG được động, kể cả stage):**

- `.ai-pipeline/**` (đã commit vào `d6c7971`)
- `docs/PLANNER_HANDOVER.md`
- `docs/runbooks/credential-rotation-incident.md`
- `docs/tasks/hrp-v6-security-credential-rotation/**`
- `docs/prompts/**`
- `app/globals.css`
- `app/(portal)/layout.tsx`, `app/components/GlobalNavbar.tsx`, `app/components/GlobalFooter.tsx`
- `prisma/**`, `app/api/**`, `app/admin/**`, `app/(jobs)/**`, `app/ctv/**`, `app/vendor/**`, `app/worker/**`
- `src/domains/job-board/public.service.ts`
- `src/domains/job-board/public-card-truth.test.ts`
- `src/shared/ui/design-tokens.static.test.ts`
- `src/domains/job-board/components/apply-modal.tsx`, `success-modal.tsx`, `referral-invite-strip.tsx`, `landing/referral-strip.tsx`
- `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.env*`

### OBR-03 — Branch + Commit + Status policy

- **Branch:** KHÔNG tạo branch mới. Tier 2 làm trực tiếp trên `main` tại `d6c7971`.
- **Commit:** KHÔNG tự commit, KHÔNG push, KHÔNG merge.
- **Status field:** Tier 1 sở hữu.
- **Staging:** Chỉ `git add file-by-file` cho path trong allowlist. KHÔNG dùng `git add -A`, `git add .`, `git add -u`.

---

*TASK.md v1.3 READY_FOR_EXECUTION — sửa 5 điểm Tier 0 12:25 ICT (UI contrast + manifest recursive + STEP-05 gate + Edge path + Owner verdict regex). 2 reference PNG đã chụp. Tier 1 tự bump 09/09 12:35 ICT.*
