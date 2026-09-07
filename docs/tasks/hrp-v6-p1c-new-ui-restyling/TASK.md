# TASK: hrp-v6-p1c-new-ui-restyling

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-p1c-new-ui-restyling` |
| Work type | `DESIGN` |
| Audit mode (Tier 3 đọc) | `DESIGN_AUDIT` |
| Spec version | `v1.0` |
| Status | `DRAFT` — chờ `hrp-v6-p1-labor-profile-schema` + `hrp-v6-p1-job-opening-posting-split` ACCEPTED mới mở execution round |
| Planner | `Tier 1 / Codex` |
| Executor | `Tier 2` (sau khi Phase 1A + 1B merge) |
| Auditor | `Tier 3 independent context` |
| Baseline | `main @ 485a36c` — `new-ui/code.html` (36320 B, 1 html/1 body/1 h1/5 section) tồn tại; `app/(portal)/page.tsx` đã đeo token semantic G27 từ `3b15bde` (ui-01 v1.1 ACCEPTED); 7 token `--text-*` + 104 token `--color-*` đã có trong `app/globals.css`; hàng rào `src/domains/job-board/public-card-truth.test.ts:293` đang XANH và PHẢI giữ NGUYÊN |
| Modules | `new-ui restyling; design token G27; marketplace landing` |
| ADR references | `docs/V6/v6-admin-rebuild.md §11` (V6-DEC-011, 017, 026, 031); `docs/V6/v6-roadmap.html` thẻ Phase 1C; `docs/PLANNER_HANDOVER.md §0 ROADMAP_CURSOR` next_planner_candidate |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | Phase 1A + 1B ACCEPTED → bump `v1.0` → `v1.1 READY_FOR_EXECUTION` |
| Updated | `2026-09-07 11:20 Asia/Bangkok` |

## 1. Outcome

### User-visible outcome

Trang chủ `/` hiển thị theo mockup `new-ui/code.html` đã được Owner duyệt (1 h1, 5 section, palette Warm Professionalism G27). NLD thấy:

- Hero với tiêu đề lớn `text-headline-xl` thay vì `text-3xl`/`text-4xl` của `go-live-08`; câu dưới tiêu đề vẫn đọc từ `overview.totals` (không phải chữ quảng cáo).
- Bề mặt "Việc làm tốt nhất" đọc từ `JobPosting` mới (Phase 1B) thay vì `Project.isPublic`, mỗi card có tên công ty công khai từ cột mới của Phase 1A (`ClientCompany.publicName`).
- Bề mặt "Việc làm theo khu vực" đọc facet `areas` hiện có; KHÔNG đổi nguồn facet.
- Bề mặt "Tuyển dụng" là dải mời cộng tác viên đã có ở ui-01 (`ReferralInviteStrip`); không trùng nghĩa với hai bề mặt trên.
- Hai chỉ số phụ "còn tuyển / ca làm" và bộ lọc facet giữ nguyên hiệu lại ui-01.

Mọi token `--text-*` / `--color-*` chưa có trong `app/globals.css` mà mockup yêu cầu PHẢI được thêm đúng giá trị mockup định nghĩa và CẬP NHẬT `app/globals.css` — không hardcode màu trong component.

### Non-goals

- KHÔNG đổi schema. Phase 1A (`hrp-v6-p1-labor-profile-schema`) và Phase 1B (`hrp-v6-p1-job-opening-posting-split`) đã lo phần schema. Phase 1C chỉ phụ thuộc ARTIFACT của 1A/1B (model `JobPosting` mới có + cột `publicName` cho `ClientCompany`).
- KHÔNG repoint query công khai. `getPublicJobProjection` / `getPublicJobDetail` vẫn đọc `Project` cho tới khi `AC-08` của `hrp-v6-p1-job-opening-posting-split` chạy độc lập ở Phase 3 (theo `V6-DEC-031`). Hàng rào `public-card-truth.test.ts:293` phải giữ nguyên tập khóa `where`.
- KHÔNG sửa `src/domains/job-board/public.service.ts` ở task này. Nếu cần thay đổi là Phase 5 (`v6-admin-rebuild_ROADMAP.md`).
- KHÔNG mở bề mặt mới ngoài 5 section của mockup (theo `PLN-65` — phạm vi một phase đo bằng kết cấu artifact).
- KHÔNG thay đổi logic search/facet đang được đóng băng bởi `src/domains/applications/marketplace-inventory.static.test.ts:266` (theo `PLN-66`).
- KHÔNG tạo component cho `TopCompaniesSection` / `CompanyCard` vì mockup có nhưng schema chưa có cột công khai (theo cảnh báo trong `PLANNER_HANDOVER.md §0 ROADMAP_CURSOR_ARCHIVE` ngày 06/09). Phase 1C ship bốn section, KHÔNG ship section thứ năm có CompanyCard.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `new-ui/code.html` (36320 B, đo 2026-09-07 11:00) | Một `<html>`, một `<body>`, một `<h1>` (`<h1 class="font-headline-xl text-headline-xl text-white font-bold leading-tight">Công việc mơ ước của bạn</h1>` — line 214), năm `<section>` tương ứng năm bề mặt: Hero / Tuyển Dụng (`<h3>` line 249) / Việc làm tốt nhất (`<h2>` line 273, có 3 card ở lines 289/311/333) / Vi?c làm theo khu v?c (`<h2>` line 358, có item Bắc Ninh `<h3>` line 366) / Search | Bằng chứng cho §1 Outcome: 1 h1 + 5 section. RQ-01 quy định tách thành 5 component |
| `EV-02` | `new-ui/code.html` + `Select-String` cho class `bg-*` (đo 2026-09-07 11:00) | Mockup dùng các class CHƯA có trong `app/globals.css`: `bg-surface-warm`, `bg-primary-fixed-dim`, `bg-tertiary-fixed` (line ~430 đoạn Việc làm theo khu vực), `bg-green-500` (badge "đang tuyển" inline) | RQ-02 phải thêm các token màu thiếu; KHÔNG hardcode màu trong component |
| `EV-03` | `app/globals.css` (đo 2026-09-07 11:00, 104 token `--*` + 7 token `--text-*` ở lines 112..118) | 7 token `--text-*` đã có từ ui-01 commit `3b15bde`: `headline-xl/lg/md`, `body-lg/md`, `label-md/sm`. Token màu chính `--color-primary: #f26522`, `--color-on-surface`, `--color-surface-container-lowest`... đều có | RQ-03: KHÔNG đụng 7 token `--text-*` đã có. RQ-04 có thể mở rộng `--text-*` nếu mockup cần thêm (ví dụ `headline-xs`, `display-*`) — đo lại trước khi thêm |
| `EV-04` | `app/(portal)/page.tsx` + diff `3b15bde` (đo 2026-09-07 11:00) | Trang chủ chỉ thay class utility → token semantic, không đổi cấu trúc JSX. H1 hiện tại: `Việc làm nhà máy, kho vận tại các khu công nghiệp` (KHÁC mockup "Công việc mơ ước của bạn"). Không có 5 section mockup | RQ-05: Phase 1C chấp nhận copy mới của H1 + 5 section, miễn copy khớp với dữ liệu thật (không quảng cáo) |
| `EV-05` | `src/domains/job-board/public-card-truth.test.ts:293` + `src/domains/job-board/public.service.ts:684/695` (đo 2026-09-07 11:00) | Hàng rào `Object.keys(args.where).sort()` đúng bằng `['isPublic','staffingOrders','status']` đang XANH. Slug đang là `project.code` / `project.id` | RQ-06: Phase 1C KHÔNG đụng fence này; mọi phép đo đều phải bảo toàn nó |
| `EV-06` | `src/domains/applications/marketplace-inventory.static.test.ts:266` (đo 2026-09-07 11:00) | Hàng rào search/facet đang XANH, ghim UI tìm kiếm ở trang chủ | RQ-07: KHÔNG chuyển search ra khỏi trang chủ; nếu mockup có thanh search khác thì đó là thêm bề mặt chứ không phải di chuyển |
| `EV-07` | `docs/V6/v6-roadmap.html` thẻ Phase 1C + `docs/V6/v6-admin-rebuild_ROADMAP.md` Phase 1 | Phase 1C ghi "⏸️ Chờ V6 Phase 1 schema (LaborProfile + JobPosting split)". Phase 1 của roadmap là "Móng dữ liệu & cấu trúc core" | RQ-08: Phase 1C không mở execution round cho tới khi hai task `hrp-v6-p1-labor-profile-schema` và `hrp-v6-p1-job-opening-posting-split` ACCEPTED. Trạng thái này được ghi vào §0 Control |
| `EV-08` | `docs/PLANNER_HANDOVER.md §0 ROADMAP_CURSOR_ARCHIVE` ngày 06/09 dòng `next_planner_candidate` | "TopCompaniesSection và CompanyCard không có nguồn vì không bảng nào giữ tên công ty công khai, muốn dùng thì phải thêm cột ở V6 Phase 1 chứ không phải ở một task reskin" | RQ-09: cấm ship CompanyCard/TopCompaniesSection ở task này vì cột `ClientCompany.publicName` chưa thuộc contract Phase 1A. Nếu muốn dùng, phải mở rộng Phase 1A (ghi vào Q-01) |
| `EV-09` | `app/(portal)/page.tsx` import `ReferralInviteStrip` (`3b15bde` diff) | `ReferralInviteStrip` đã được tách thành file riêng, có ring focus + tap target 44px; ASM-01 đã ghim đúng 14 token `--text-*` của DEC-13 | RQ-10: Tuyển Dụng section dùng lại component có sẵn; không viết lại |
| `EV-10` | `docs/V6/v6-admin-rebuild.md §4.7/4.8` | Vòng đời JobOpening có `UPCOMING → RECRUITING → FILLED/EXPIRED/CLOSED`; JobPosting có `DRAFT → PUBLISHED → UNPUBLISHED/EXPIRED` | RQ-11: Card "Việc làm tốt nhất" phải hiển thị trạng thái thật theo schema mới (Phase 1B). Nếu schema chưa có, dùng placeholder an toàn (không hardcode trạng thái "đang tuyển" màu xanh) |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Phase 1C status là `DRAFT` cho tới khi `hrp-v6-p1-labor-profile-schema` + `hrp-v6-p1-job-opening-posting-split` ACCEPTED. Mở execution round 1 chỉ khi Phase 1A/1B đã merge vào main | EV-07, `docs/V6/v6-admin-rebuild_ROADMAP.md` Phase 1 | Final |
| `DEC-02` | CHOSEN | Tách mockup thành 5 component (Hero / ReferralStrip / BestJobsSection / AreasSection / SearchSection), mỗi component nằm trong file riêng dưới `src/domains/job-board/components/landing/` để tránh đẩy `app/(portal)/page.tsx` vượt 800 dòng. Phép đếm hai class ring focus + tap target 44px vẫn giữ ở `app/(portal)/page.tsx` (theo EV-09) | EV-01, EV-09 | Final |
| `DEC-03` | CHOSEN | Mọi token màu mới cần thêm (`bg-surface-warm`, `bg-primary-fixed-dim`, `bg-tertiary-fixed`, `bg-green-500` cho badge nếu cần) đều vào `app/globals.css` dưới `@theme inline` cùng pattern ui-01, KHÔNG hardcode hex trong component. Nếu thêm token `--text-*` mới (ví dụ `headline-xs`), phải bump ASM-01 để ghim đủ số khóa | EV-02, EV-03 | Final |
| `DEC-04` | CHOSEN | KHÔNG ship `TopCompaniesSection` / `CompanyCard` ở task này vì cột `ClientCompany.publicName` chưa thuộc contract Phase 1A (theo EV-08). Mockup có 5 section nhưng Phase 1C chỉ ship 4 section có dữ liệu thật; section thứ năm (CompanyCard) hoãn sang task khác khi schema mở rộng | EV-08 | Final |
| `DEC-05` | CHOSEN | Card "Việc làm tốt nhất" đọc từ `JobPosting` mới (Phase 1B) cho `JobOpening` đang `RECRUITING`/`UPCOMING`. Nếu Phase 1B chưa repoint query công khai (theo EV-05), card này dùng placeholder skeleton loading có aria-busy, không hardcode 3 card Luxshare/Goertek/Brother từ mockup | EV-05, EV-10 | Final |
| `DEC-06` | CHOSEN | Hàng rào `public-card-truth.test.ts:293` và `marketplace-inventory.static.test.ts:266` KHÔNG được đụng. Nếu Phase 1C chạm đến fence nào thì Tier 1 phải mở rộng fence TRƯỚC trong cùng task — không để Tier 2 tự nới test | EV-05, EV-06, `V6-DEC-031` | Final |
| `DEC-07` | ASSUMPTION | Tailwind utility class từ mockup (`bg-surface-warm`, `bg-tertiary-fixed`...) ánh xạ đúng vào token mới thêm vào `globals.css`; nếu ánh xạ sai (mockup đặt tên class không khớp convention) thì Tier 2 đề xuất đổi tên token, Tier 1 quyết | EV-02 | Hết hạn khi mở execution round |
| `DEC-08` | CHOSEN | Copy tiếng Việt trong mockup (`Công việc mơ ước của bạn`, `Tuyển Dụng`, `Việc làm tốt nhất`, `Việc làm theo khu vực`) là gợi ý thị giác, không phải bắt buộc. Phase 1C phải copy ĐÚNG nội dung có dữ liệu thật đỡ lưng (theo nguyên tắc §8.2 của `v6-admin-rebuild.md`: "Không dựng một control hoặc nhãn UI nếu không có dữ liệu thật chống lưng") | §8.2 v6-admin-rebuild.md | Final |
| `DEC-09` | CHOSEN | KHÔNG bump v1.1 cho hai task Phase 1A/1B trong luồng này vì baseline `4758809` chưa đổi — bump vô ích sẽ thêm version không có contract change (vi phạm Iron Rule #1) | `PLN-64`, EV baseline | Final |
| `DEC-10` | CHOSEN | Phase 1C không commit scoped + push production trước khi Tier 3 audit. Nếu cần xem trước thị giác, dùng preview `npm run dev` local, không push | `PLN-67` | Final |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Tách mockup `new-ui/code.html` thành 5 component, mỗi component nằm trong file riêng dưới `src/domains/job-board/components/landing/` (Hero, ReferralStrip, BestJobsSection, AreasSection, SearchSection) | Must P0 | EV-01 | Component > 200 dòng hoặc > 1 phần trách nhiệm thì phải tách tiếp |
| `RQ-02` | Thêm các token màu còn thiếu (`bg-surface-warm`, `bg-primary-fixed-dim`, `bg-tertiary-fixed` nếu cần, `bg-green-500` nếu cần badge) vào `app/globals.css` dưới `@theme inline` cùng pattern ui-01; KHÔNG hardcode hex trong component | Must P0 | EV-02, EV-03 | Hardcode hex trong component = FAIL; phải đẩy lên token |
| `RQ-03` | Giữ nguyên 7 token `--text-*` đã có (headline-xl/lg/md, body-lg/md, label-md/sm); nếu cần thêm `--text-*` mới (ví dụ `headline-xs`, `display-*`) thì bump ASM-01 để ghim đủ số khóa | Must P0 | EV-03, EV-09 | Xóa hoặc đổi tên token cũ = FAIL |
| `RQ-04` | Component `ReferralStrip` dùng lại `ReferralInviteStrip` đã có từ ui-01, KHÔNG viết lại. Hai class ring focus + tap target 44px phép đếm ở `app/(portal)/page.tsx` không đổi | Must P0 | EV-09 | Đếm sai 2 class = FAIL |
| `RQ-05` | H1 mới copy từ mockup có thể chấp nhận ("Công việc mơ ước của bạn") hoặc giữ nguyên ("Việc làm nhà máy, kho vận tại các khu công nghiệp"); copy không được quảng cáo, phải có dữ liệu thật đỡ lưng (theo §8.2 v6-admin-rebuild.md) | Must P0 | EV-04, DEC-08 | H1 quảng cáo (không có dữ liệu đỡ) = FAIL |
| `RQ-06` | Hàng rào `src/domains/job-board/public-card-truth.test.ts:293` giữ nguyên tập khóa `where = ['isPublic','staffingOrders','status']`, KHÔNG đụng trong task này | Must P0 | EV-05, V6-DEC-031 | Test đỏ vì đụng fence = FAIL và rollback |
| `RQ-07` | Hàng rào `src/domains/applications/marketplace-inventory.static.test.ts:266` giữ nguyên, search vẫn ở trang chủ, KHÔNG di chuyển | Must P0 | EV-06, PLN-66 | Search bị chuyển = FAIL |
| `RQ-08` | Phase 1C chỉ mở execution round sau khi `hrp-v6-p1-labor-profile-schema` + `hrp-v6-p1-job-opening-posting-split` đều `ACCEPTED` | Must P0 | EV-07, DEC-01 | Mở sớm = vi phạm ràng buộc lộ trình |
| `RQ-09` | KHÔNG ship `TopCompaniesSection` / `CompanyCard` ở task này vì cột `ClientCompany.publicName` chưa thuộc contract Phase 1A. Mockup có 5 section nhưng Phase 1C ship 4 section, section thứ năm hoãn | Must P0 | EV-08, DEC-04 | Ship CompanyCard khi chưa có cột = FAIL vì dữ liệu test/giả |
| `RQ-10` | `ReferralStrip` dùng component có sẵn (RQ-04); KHÔNG tạo ring focus hoặc tap target riêng | Must P0 | EV-09 | Trùng ring focus = FAIL vì ASM-01 đếm sai |
| `RQ-11` | Card "Việc làm tốt nhất" hiển thị dữ liệu từ `JobPosting` (Phase 1B); nếu Phase 1B chưa repoint query công khai (EV-05), dùng skeleton `aria-busy` thay vì hardcode 3 card tên công ty từ mockup | Must P0 | EV-05, EV-10, DEC-05 | Hardcode tên công ty = FAIL vì dữ liệu giả |

### 4.2 Scope boundaries

**In scope:**

- `app/(portal)/page.tsx` (đoạn JSX thay thế nội dung cũ, vẫn giữ form tìm kiếm + facet)
- `app/globals.css` (chỉ THÊM token màu + token `--text-*` mới nếu cần)
- `src/domains/job-board/components/landing/` (5 file component mới)
- `docs/tasks/hrp-v6-p1c-new-ui-restyling/**` (HANDOFF, evidence)

**Out of scope:**

- `prisma/schema.prisma` (Phase 1A + 1B đã lo)
- `src/domains/job-board/public.service.ts` (Phase 5 sẽ lo)
- `src/domains/job-board/public-card-truth.test.ts` (chỉ đọc, không sửa)
- `src/domains/applications/marketplace-inventory.static.test.ts` (chỉ đọc, không sửa)
- `app/admin/**`, `app/api/**`, mọi route admin
- `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`
- Mọi logic search/facet đang được đóng băng bởi hàng rào

### 4.3 Data, State, Permission và Interface Rules

- **Data:** Section "Việc làm tốt nhất" đọc từ service `JobPosting` (Phase 1B); section "Việc làm theo khu vực" đọc facet `areas` hiện có; section "Tuyển Dụng" đọc `ReferralInviteStrip` (đã có).
- **State:** Component có thể có state `loading` (skeleton), `ready` (data), `error` (graceful fallback) — KHÔNG dùng state "demo" hardcode.
- **Permission/data scope:** Toàn bộ section là public (`/`); không cần auth; không hiển thị nguồn AFF, nhân viên phụ trách, hay dữ liệu nội bộ.
- **Interface:** URL `/` không đổi; copy phải đọc được bằng screen reader (mỗi section có `<h2>`/`<h3>` đúng cấp theo outline của H1); mỗi card có link tới `/viec-lam/{slug}` nếu Phase 1B đã repoint, ngược lại giữ link cũ.
- **Failure/idempotency/concurrency:** Token mới thêm không xung đột tên với token cũ; nếu trùng thì Tier 2 rollback thay vì ghi đè; nếu thêm 2 token cùng tên trong cùng step thì fail.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-02, RQ-03` | `app/globals.css` | Đo lại danh sách class màu mockup dùng chưa có trong repo; thêm từng token vào `@theme inline` cùng pattern ui-01; nếu thêm token `--text-*` mới thì bump ASM-01 để ghim đủ | EV-02, EV-03 | `git diff app/globals.css` không xóa token cũ; `npm run typecheck` exit 0 | Xóa/đổi token cũ = STOP |
| `STEP-02` | `RQ-01` | `src/domains/job-board/components/landing/` | Tạo 5 file component: `hero.tsx`, `referral-strip.tsx` (re-export `ReferralInviteStrip`), `best-jobs-section.tsx`, `areas-section.tsx`, `search-section.tsx`. Mỗi file < 200 dòng | EV-01 | `git diff --stat` 5 file mới; `wc -l` mỗi file | File > 200 dòng = STOP, tách tiếp |
| `STEP-03` | `RQ-04, RQ-10` | `app/(portal)/page.tsx` | Thay nội dung cũ bằng cách import 5 component mới. Giữ phép đếm ASM-01 cho `ReferralInviteStrip` (ring focus + tap target 44px). Form tìm kiếm + facet vẫn render | EV-09 | `git diff -- app/(portal)/page.tsx` đếm 2 class đúng; `grep` không tìm thấy class ring/tap ngoài ReferralInviteStrip | Phép đếm sai = STOP, rollback import |
| `STEP-04` | `RQ-05, RQ-08, RQ-11` | Logic đọc dữ liệu | Card "Việc làm tốt nhất" đọc `JobPosting` mới nếu Phase 1B đã repoint (status READY ngay khi mở execution); ngược lại skeleton `aria-busy`. H1 copy từ mockup nếu có dữ liệu thật đỡ lưng | EV-04, EV-10 | `git grep` không tìm thấy "Luxshare" / "Goertek" / "Brother" hardcode | Hardcode tên công ty = STOP |
| `STEP-05` | `RQ-06, RQ-07` | Hàng rào test | Chạy `npm run test:unit` cho `public-card-truth.test.ts` và `marketplace-inventory.static.test.ts`. Cả hai phải XANH trên worktree sau STEP-01..04 | EV-05, EV-06 | `npm run test:unit -- public-card-truth` exit 0; `npm run test:unit -- marketplace-inventory` exit 0 | Test đỏ = STOP và đối chiếu DEC-06 |
| `STEP-06` | `RQ-08` | Bump status | Sau khi 5 step trên pass và Phase 1A + 1B đã ACCEPTED, Tier 1 bump `v1.0` → `v1.1 READY_FOR_EXECUTION`. Tier 2 chưa giao cho tới khi bump xong | EV-07, DEC-01 | `git log --grep 'hrp-v6-p1-labor-profile-schema'` có commit ACCEPTED; `git log --grep 'hrp-v6-p1-job-opening-posting-split'` có commit ACCEPTED | Phase 1A/1B chưa ACCEPTED = HOLD DRAFT |
| `STEP-07` | Tất cả | `HANDOFF.md` | Tier 2 viết HANDOFF sau khi execution round 1 pass; KHÔNG tự audit/ACCEPTED. Bằng chứng: lệnh + mã thoát + output cho mỗi AC | Tất cả prior steps | `verify-handoff.ps1 -TaskPath docs/tasks/hrp-v6-p1c-new-ui-restyling` PASS | Không có evidence = BLOCKED |

### 5.1 Traceability RQ → STEP → AC

| RQ | STEP | AC |
|----|------|-----|
| `RQ-01` | `STEP-02` | `AC-01`, `AC-02` |
| `RQ-02` | `STEP-01` | `AC-03` |
| `RQ-03` | `STEP-01` | `AC-04` |
| `RQ-04` | `STEP-03` | `AC-05` |
| `RQ-05` | `STEP-04` | `AC-06` |
| `RQ-06` | `STEP-05` | `AC-07` |
| `RQ-07` | `STEP-05` | `AC-08` |
| `RQ-08` | `STEP-06` | `AC-09` |
| `RQ-09` | `STEP-02`, `STEP-04` | `AC-10` |
| `RQ-10` | `STEP-03` | `AC-05` |
| `RQ-11` | `STEP-04` | `AC-11` |

## 6. Acceptance

Mỗi hàng đo bằng LỆNH thật. Phase 1C là DESIGN nên phép đo là đếm/grep/visual + chạy fence thật.

| AC | RQ | Điều kiện | Phương pháp đo | Bằng chứng | Chặn? |
|----|----|-----------|----------------|------------|-------|
| `AC-01` | `RQ-01` | 5 file component tồn tại dưới `src/domains/job-board/components/landing/`, mỗi file < 200 dòng | `Get-ChildItem src/domains/job-board/components/landing/*.tsx | Select-Object Name` (5 file) ; `wc -l` mỗi file | hai danh sách, `evidence/ac01-components.txt` | Yes |
| `AC-02` | `RQ-01` | Mỗi component chỉ chứa một phần trách nhiệm (Hero/Strip/BestJobs/Areas/Search); không có file > 1 phần | đọc từng file, kiểm tra exports | đối chiếu exports, `evidence/ac02-scope.txt` | Yes |
| `AC-03` | `RQ-02` | Token màu mới thêm vào `app/globals.css` dưới `@theme inline`; KHÔNG hardcode hex trong component | `git diff app/globals.css` chỉ có dòng `+` (không `-` cho token cũ) ; `git grep -nE "#[0-9a-fA-F]{6}" src/domains/job-board/components/landing/` trả rỗng | diff + grep rỗng, `evidence/ac03-tokens.txt` | Yes |
| `AC-04` | `RQ-03` | 7 token `--text-*` cũ giữ nguyên (headline-xl/lg/md, body-lg/md, label-md/sm); nếu thêm token `--text-*` mới thì ASM-01 đã bump | `git grep -nE "^\s*--text-" app/globals.css` ≥ 7 dòng ; `git grep -nE "@theme.*--text-" src/` để xem ASM-01 ghim | grep + đối chiếu `src/.../asm01` | Yes |
| `AC-05` | `RQ-04, RQ-10` | `app/(portal)/page.tsx` import đúng 5 component, có ring focus + tap target 44px của `ReferralInviteStrip` đếm đúng (ASM-01 không lệch) | `git grep -c "ReferralInviteStrip" app/(portal)/page.tsx` (>= 1) ; ASM-01 test cũ vẫn pass | grep + test ASM-01 cũ, `evidence/ac05-asm01.txt` | Yes |
| `AC-06` | `RQ-05` | H1 + 5 section có copy không quảng cáo, có dữ liệu thật đỡ lưng; hoặc copy đúng mockup nếu schema đỡ được | đọc JSX + đối chiếu mockup + check service trả về có dữ liệu | đo thủ công, `evidence/ac06-copy.txt` | Yes |
| `AC-07` | `RQ-06` | `public-card-truth.test.ts:293` còn nguyên, XANH | `npm run test:unit -- public-card-truth` exit 0 ; `git diff src/domains/job-board/public-card-truth.test.ts` trả rỗng | test output + diff rỗng, `evidence/ac07-truth-fence.txt` | Yes |
| `AC-08` | `RQ-07` | `marketplace-inventory.static.test.ts:266` còn nguyên, XANH, search vẫn ở trang chủ | `npm run test:unit -- marketplace-inventory` exit 0 ; `git grep "search"` trong `app/(portal)/page.tsx` tìm thấy form tìm | test output + grep, `evidence/ac08-search-fence.txt` | Yes |
| `AC-09` | `RQ-08` | Phase 1A + 1B đã ACCEPTED trước khi Phase 1C execution round mở | `git log --all --oneline | grep -E "hrp-v6-p1-(labor-profile-schema|job-opening-posting-split)"` có commit với status ACCEPTED (xem spec_version + audit log) | git log + đối chiếu §0 Control của 2 task trên, `evidence/ac09-deps.txt` | Yes |
| `AC-10` | `RQ-09` | KHÔNG có component `TopCompaniesSection` / `CompanyCard` trong output | `git grep -nE "TopCompaniesSection|CompanyCard" src/domains/job-board/components/landing/` trả rỗng | grep rỗng, `evidence/ac10-no-company.txt` | Yes |
| `AC-11` | `RQ-11` | Card "Việc làm tốt nhất" đọc từ service thật hoặc skeleton `aria-busy`; KHÔNG hardcode "Luxshare"/"Goertek"/"Brother" | `git grep -nE "Luxshare|Goertek|Brother" src/domains/job-board/components/landing/` trả rỗng | grep rỗng, `evidence/ac11-no-hardcode.txt` | Yes |
| `AC-12` | Tất cả | `npm run typecheck` exit 0, `npm run build` exit 0, `npm run test:unit` exit 0 | ba lệnh | ba exit code, `evidence/ac12-build.txt` | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-02` | `AC-01`, `AC-02` |
| `RQ-02` | `STEP-01` | `AC-03` |
| `RQ-03` | `STEP-01` | `AC-04` |
| `RQ-04`, `RQ-10` | `STEP-03` | `AC-05` |
| `RQ-05` | `STEP-04` | `AC-06` |
| `RQ-06` | `STEP-05` | `AC-07` |
| `RQ-07` | `STEP-05` | `AC-08` |
| `RQ-08` | `STEP-06` | `AC-09` |
| `RQ-09` | `STEP-02`, `STEP-04` | `AC-10` |
| `RQ-11` | `STEP-04` | `AC-11` |
| Mọi RQ | `STEP-07` | `AC-12` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Phase 1A/1B merge trước khi `1A.AC-09` (RLS forward-only) được apply lên `hrp-live` = schema mới nhưng policy cũ | OP execution của 1A chưa chạy | DEC-01: Phase 1C DRAFT cho tới khi 1A/1B đã ACCEPTED (bao gồm apply lên live) | Không có rollback; chờ OP áp RLS |
| `RISK-02` | Mockup dùng tên class (`bg-surface-warm`) không khớp convention Tailwind → Tier 2 hiểu sai khi map token | EV-02 cho thấy 3-4 class lạ | DEC-07: Tier 2 đề xuất đổi tên token, Tier 1 quyết | Revert token mới; đổi tên token cũ thì FAIL theo AC-04 |
| `RISK-03` | Thêm token mới trùng tên token cũ → CSS không deterministic | Tier 2 nhập sai | DEC-03: chỉ THÊM, không sửa/xóa; nếu trùng thì rollback thay vì ghi đè | Git revert commit scoped; xóa token trùng |
| `RISK-04` | Card "Việc làm tốt nhất" hardcode 3 card tên công ty khi Phase 1B chưa repoint = dữ liệu giả | Tier 2 thiếu skeleton fallback | DEC-05: dùng skeleton `aria-busy` thay vì hardcode | Revert component; render skeleton thay vì data |
| `RISK-05` | Hàng rào truth.test.ts đỏ vì Tier 2 vô tình chạm fence | STEP-05 đỏ | DEC-06: Tier 1 mở rộng fence TRƯỚC trong cùng task nếu cần | Revert phần đụng fence; bump task version |
| `RISK-06` | Ship `TopCompaniesSection` / `CompanyCard` khi `ClientCompany.publicName` chưa có = hiển thị tên công ty giả | Tier 2 đọc mockup không đọc DEC-04 | DEC-04: cấm ship section thứ năm | Revert component nếu lỡ thêm |
| `RISK-07` | Push production trước khi Tier 3 audit = vi phạm `PLN-67` | Tier 2 push vì "xem trước" | DEC-10: chỉ `npm run dev` local, không push | Không rollback production; lập incident post-deploy |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | Có mở rộng Phase 1A để thêm cột `ClientCompany.publicName` cho `CompanyCard` ở Phase 1C không, hay tách riêng thành task `hrp-v6-p1d-company-public-name`? | Owner | Trước khi Phase 1A execution round mở | No — Phase 1C chấp nhận ship 4 section không có CompanyCard |
| `Q-02` | H1 copy "Công việc mơ ước của bạn" (mockup) hay giữ "Việc làm nhà máy, kho vận tại các khu công nghiệp" (cũ)? Cả hai đều có dữ liệu đỡ lưng; chọn theo brand voice | Owner | Trước STEP-04 execution | Yes nếu Phase 1C đã mở execution |
| `Q-03` | Token màu `bg-green-500` (badge "đang tuyển") có được thêm vào hệ token G27 hay hardcode Tailwind mặc định? G27 chỉ có warm palette | Owner | Trước STEP-01 execution | No — Tier 2 có thể chọn hardcode Tailwind default nếu Owner chưa trả lời |
| `Q-04` | Bốn section ship ở Phase 1C có cần đủ 4/4 hay có thể ship 3/4 trước (Hero + BestJobs + Search, không Areas)? | Owner | Trước STEP-02 execution | No — Tier 2 có thể ship 3/4 rồi Areas bổ sung sau |

## 9. Planner Resolution

Tier 1 phát hành `v1.0` ngày 07/09 ở status `DRAFT`. Chưa có execution round hay audit round. Khi Phase 1A + 1B ACCEPTED, sẽ bump `v1.0` → `v1.1 READY_FOR_EXECUTION` và điền resolve vào mục này sau khi Tier 3 audit round 1.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| Chưa có | — | — | — | — | — |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-09-07 11:20` | Tạo hợp đồng Phase 1C: nhập mockup `new-ui/code.html` thành 5 component (4 section ship + 1 hoãn), thêm token màu còn thiếu, giữ 7 token `--text-*` và 2 hàng rào test. Status `DRAFT` chờ Phase 1A + 1B ACCEPTED. Baseline neo `485a36c` | Owner chọn Hướng B 07/09; `next_planner_candidate` trong ROADMAP_CURSOR_ARCHIVE ngày 06/09; EV-01..10 đo 07/09 |
