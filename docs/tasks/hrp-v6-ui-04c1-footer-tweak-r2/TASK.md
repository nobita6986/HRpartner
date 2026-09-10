# TASK — `hrp-v6-ui-04c1-footer-tweak-r2`

> **Footer tweak r2** — chỉnh sửa UI footer + ContactForm sau composition/footer `ACCEPTED` tại `04b767e`, dựa trên 16 lựa chọn của Owner lưu tại `docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/owner-footer-r2-decisions.md` (2026-09-10).
> Scope: chỉ chỉnh style/copy/markup trong `app/components/GlobalFooter.tsx` và `app/components/ContactForm.tsx`. KHÔNG mở API contact, persistence, schema, permission, CMS, Admin, route thật mới.
> Plan UI predecessor: `hrp-v6-ui-04c-home-composition-footer` `ACCEPTED` (`04b767e`) + `hrp-v6-ui-04b-urgent-live-ribbon-r3` `ACCEPTED` (`8c6fd03`).
> Plan UI successor: `hrp-v6-ui-04d-section-render` (sau khi 04c1 đóng).

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04c1-footer-tweak-r2` |
| Work type | `TWEAK` (UI footer + ContactForm) |
| Assurance lane | `FAST` |
| Audit mode | `NONE` (FAST bypass Tier 3) |
| Spec version | `v1.0` (Owner đã cung cấp 16 lựa chọn tại `evidence/owner-footer-r2-decisions.md`) |
| Status | `READY_FOR_EXECUTION` (Tier 1 finalize contract v1.0 dựa trên Owner decisions; 2026-09-10) |
| Planner | `Tier 1` |
| Baseline | HEAD thật ngay trước Tier 2 round — `git rev-parse HEAD` tại STEP-01 → `evidence/exec-head-before.txt`. HEAD tại thời điểm finalize: `8c6fd03` (R3 ACCEPTED) + composition/footer baseline `04b767e` đã là predecessor |
| Source reference | composition/footer v1.4 `ACCEPTED` (`04b767e`) + R3 v1.3 `ACCEPTED` (`8c6fd03` — Job Card Minimal SaaS + URGENT live + compact ribbon) |
| Plan UI predecessor | composition/footer `ACCEPTED` (`04b767e`) + R3 `ACCEPTED` (`8c6fd03`) |
| Plan UI successor | section-render (`hrp-v6-ui-04d-section-render` BLOCKED v1.5 — sau khi 04c1 đóng) → D.A detail UI → Plan Admin V6 (AV1 → AV4 → AV2 → AV6 → AV5) |
| In-scope roots | `app/components/GlobalFooter.tsx`, `app/components/ContactForm.tsx`, `docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/**` |
| Forbidden paths | `app/(portal)/page.tsx`, `src/domains/job-board/components/landing/**` (ngoại trừ khi thật sự cần ảnh footer), `src/domains/job-board/public.service.ts`, `app/api/jobs/**`, `app/api/contact/**` (chưa có), `app/admin/**`, `prisma/**`, `src/shared/auth/permission-catalog.ts`, `prisma/seed.mjs`, `app/globals.css` NGOÀI nếu cần thêm token semantic (Tier 1 duyệt trước), `app/(jobs)/viec-lam/page.tsx`, `app/components/GlobalNavbar.tsx`, `app/api/admin/homepage-settings/**`, `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/**`, `docs/tasks/hrp-v6-ui-04a-visual-polish/**`, `docs/tasks/hrp-v6-ui-04b-pagination-admin/**`, `docs/tasks/hrp-v6-ui-04b-vis-correction-r1/**`, `docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/**`, `docs/tasks/hrp-v6-ui-04b-urgent-live-ribbon-r3/**`, `docs/tasks/hrp-v6-ui-04c-home-composition-footer/**`, `docs/tasks/hrp-v6-ui-04d-section-render/**` |
| Required gates | `npm run typecheck` exit 0; `npm run test:unit` cùng expected failure set + new failure count = 0; `npm run build` exit 0; `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/TASK.md` exit 0 PASS; `verify-handoff.ps1` exit 0 PASS; Owner live visual review |
| Visual gate | Owner live review post-deploy. KHÔNG Edge/CDP/PNG/bbox. KHÔNG Lighthouse/axe-core auto-install |
| Current execution round | `1` (v1.0 READY_FOR_EXECUTION) |
| Next gate | Tier 2 thi công (FAST) → Owner live visual review → ACCEPTED → section-render READY_FOR_EXECUTION |

## 1. Outcome

### 1.1 User-visible outcome (từ 16 Owner decisions tại `evidence/owner-footer-r2-decisions.md`)

Tổng thể footer HuongB giữ nền peach sáng nhưng đậm hơn baseline `bg-primary-fixed/20` một bậc (Owner #1). Footer vẫn sáng, thanh thoát; không chuyển sang nâu đậm. Ba cột desktop `Công ty → Dịch vụ → Liên hệ` giữ thứ tự; mobile stack giữ nguyên thứ tự ấy (Owner #2, #3). Cột `Liên hệ` được tách thành panel nổi nhẹ, bo góc, sắc cam ấm đậm hơn nền footer (Owner — visual direction panel). Toàn bộ thông tin công ty, dịch vụ, hotline, email, website, địa chỉ Phú Thọ giữ (Owner #4-8). ContactForm giữ `disabled={true}`; helper text đổi sang `Vui lòng liên hệ qua hotline hoặc email trong thời gian này.` (Owner #9, #10). CTA `GỬI NGAY` giữ nhãn + disabled (Owner #11). Copyright đổi thành `&copy; {năm hiện hành} HRP Việt Nam. Connecting for Success.` (Owner #12). Routes `/ve-chung-toi`, `/ctv-portal` giữ; ba link `Điều khoản / Chính sách bảo mật / Liên hệ` đổi semantic từ `&lt;button&gt;` giả sang text/span `aria-disabled="true"`, bỏ `href="#"` (Owner #13, #14). Mobile spacing chỉnh: touch target tối thiểu 44px; mobile 390px không horizontal scroll (Owner #15). Container `max-w-[1080px] mx-auto`, gutter `px-4 md:px-6` (Owner #16). Heading cột rõ ràng: `CÔNG TY TNHH HRP VIỆT NAM` / `DANH MỤC DỊCH VỤ` / `THÔNG TIN LIÊN HỆ`.

Nguyên tắc giữ:

- Container `max-w-[1080px] mx-auto px-4 md:px-6` (VIS-06 đã chốt tại composition/footer v1.4; Owner #16).
- Mobile stack `Công ty → Dịch vụ → Liên hệ` (Owner #3).
- `tel:02112216999`, `tel:0964984866`, `mailto:nhaluchrp@gmail.com`, `https://hrpvietnam.com/` (external `target="_blank" rel="noopener noreferrer"`) (Owner #5, #6, #7).
- 5 dịch vụ giữ nguyên nội dung (Owner #4); chỉ chỉnh typography/icon/spacing.
- Địa chỉ Phú Thọ: `Thuê Khu đất DV Tân Ngọc, Thống Nhất, Bắc Kê, Xã Bình Tuyền, Tỉnh Phú Thọ, Việt Nam` (Owner #8).
- ContactForm `disabled={true}` (Owner #9).
- Routes thật `/ve-chung-toi`, `/ctv-portal` (Owner #13).
- KHÔNG phục hồi dòng "Phiên bản 6.0" (Owner #12 không ghi nhắc, nhưng nguyên tắc invariant của DEC-07 vẫn áp dụng).

### 1.2 Non-goals (BẤT BUỘC)

- KHÔNG mở API contact mới.
- KHÔNG thêm `CrmLead`, schema, persistence.
- KHÔNG mở Admin editor footer.
- KHÔNG đổi route thật (chỉ giữ nguyên `/ve-chung-toi`, `/ctv-portal`; ba link disabled không có route).
- KHÔNG submit form liên hệ (giữ disabled).
- KHÔNG đổi BestJobs/Areas/Recruiting/Hero/Job Card/ReferralStrip.
- KHÔNG sửa `src/domains/job-board/public.service.ts`.
- KHÔNG revert `04b767e`.
- KHÔNG revert R3 dirty 8 file tại `8c6fd03`.
- KHÔNG phục hồi dòng "Phiên bản 6.0" dù bất kỳ delta nào.
- KHÔNG tạo `&lt;button&gt;` giả cho ba link `Điều khoản / Chính sách / Liên hệ` (Owner #14).
- KHÔNG dùng `href="#"` cho ba link chưa có route (Owner #14).
- KHÔNG cài tool đo (axe-core, Lighthouse, CDP, pa11y).
- KHÔNG hardcode màu hex mới — ưu tiên semantic token hiện có (`bg-primary-fixed/35` hoặc tương đương) (Owner #1; DEC-04).
- KHÔNG thêm package icon mới — dùng Lucide icons đã có trong dự án (visual direction bổ sung).

### 1.3 Plan UI split reminder

| Công việc | Thuộc plan | Trạng thái |
|---|---|---|
| Footer tweak r2 (task này) | Plan UI tweak | **READY_FOR_EXECUTION v1.0** |
| Composition/footer (tiền nhiệm) | Plan UI composition/footer | ACCEPTED v1.4 (`04b767e`) |
| URGENT live + ribbon + Job Card (R3) | Plan UI R3 | ACCEPTED v1.3 (`8c6fd03`) |
| Sections 5 mới | Task D section-render | BLOCKED v1.5 (chờ 04c1 ACCEPTED) |
| Backend (HomepageSettings, permission, write API, Admin) | Plan Admin V6 AV1 | DRAFT |
| JobPosting editor | Plan Admin V6 AV2 | DRAFT |
| CMS homepage content | Plan Admin V6 AV6 | DRAFT |
| Detail page UI | Plan D.A | DRAFT (sau section-render ACCEPTED) |

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `app/components/GlobalFooter.tsx` tại `04b767e` (baseline accepted) | Trạng thái ACCEPTED hiện tại của footer — Tier 2 đối chiếu sau khi sửa |
| `EV-02` | `app/components/ContactForm.tsx` tại `04b767e` (baseline accepted) | Trạng thái ACCEPTED hiện tại của ContactForm — Tier 2 đối chiếu sau khi sửa |
| `EV-03` | `docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/owner-footer-r2-decisions.md` | 16 lựa chọn Owner — Tier 2 đọc đầu round để hiểu delta |
| `EV-04` | `docs/prompts/TIER1_CONTINUATION_UI04_AFTER_R3.md` §4 | Quy tắc Tier 0 đã đặt cho footer tweak r2 (giữ container 1080px, mobile stack, tel/mailto/website thật, form disabled, không "Phiên bản 6.0") |
| `EV-05` | `docs/prompts/TIER0_UI04_R3_CLOSEOUT_VERDICT.md` §3 | Tier 0 chốt lane giữ FAST; Footer r2 không mở backend |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Tier 1 owns TASK.md; Tier 2 owns HANDOFF + evidence + source allowlist. Tier 2 KHÔNG sửa TASK.md, KHÔNG revert R3/composition-footer | `CHOSEN` |
| `DEC-02` | Baseline = HEAD đầu round (Tier 2 đo `git rev-parse HEAD` ngay trước STEP-01 → `evidence/exec-head-before.txt`). Tier 1 dự kiến HEAD = `8c6fd03` | `CHOSEN` |
| `DEC-03` | FAST lane vì phạm vi là tweak style/copy/markup footer + ContactForm. Không nâng lane vì delta của Owner giữ trong UI footer + form disabled, không chạm behavior | `CHOSEN` |
| `DEC-04` | Tier 2 KHÔNG mở bất kỳ file ngoài §0 In-scope roots (kể cả `app/globals.css`). Nếu cần thêm token semantic mới → Tier 2 escalate Tier 1 trước khi commit | `CHOSEN` |
| `DEC-05` | Visual parity = Owner live review post-deploy. KHÔNG Edge/CDP/PNG/bbox. KHÔNG fail vì thiếu screenshot | `CHOSEN` |
| `DEC-06` | OBR-01 cho phép tạo HANDOFF + `evidence/**` + sửa file trong §0 In-scope roots. KHÔNG cấm file mới | `CHOSEN` |
| `DEC-07` | Không phục hồi dòng "Phiên bản 6.0" dù bất kỳ delta nào | `CHOSEN` |
| `DEC-08` | Form liên hệ giữ `disabled={true}` và helper text theo Owner #10. Nếu sau này muốn submit thật → escalate Tier 0 (mở task backend contact riêng) | `CHOSEN` |
| `DEC-09` | Ba link `Điều khoản / Chính sách bảo mật / Liên hệ` không có route thật — render thành text/span có `aria-disabled="true"`; KHÔNG `&lt;button&gt;` giả, KHÔNG `href="#"`, KHÔNG tab stop trừ khi cho phép đọc (Owner #14) | `CHOSEN` |
| `DEC-10` | Tier 2 KHÔNG cài package icon mới; dùng Lucide icons đã có trong dự án cho thông tin công ty/dịch vụ nếu cần (visual direction bổ sung) | `CHOSEN` |
| `DEC-11` | Baseline test failure set được đo ngay trước STEP-01 từ HEAD đầu round (Tier 2 đo). Tier 2 không được reset/fixture lại test để nuốt failure mới | `CHOSEN` |
| `DEC-12` | Tier 2 KHÔNG push lên `origin/main`; push thuộc bước phát hành Git riêng (Tier 0 verdict R3 §1) | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement | Status |
|---|---|---|
| `RQ-00` | **Skeleton invariant guard:** bất kỳ delta nào, Tier 2 phải giữ: container `max-w-[1080px] mx-auto px-4 md:px-6`, mobile stack `Công ty → Dịch vụ → Liên hệ`, 3 cột desktop (thứ tự giữ), `tel:02112216999` + `tel:0964984866` + `mailto:nhaluchrp@gmail.com` + external `https://hrpvietnam.com/` (target=_blank rel=noopener noreferrer), 5 dịch vụ nội dung giữ nguyên, route `/ve-chung-toi` + `/ctv-portal`, ContactForm `disabled={true}` (helper text theo RQ-07), copyright `&copy; {năm hiện hành} HRP Việt Nam. Connecting for Success.`, địa chỉ Phú Thọ giữ nguyên. KHÔNG revert R3 8 file dirty tại `8c6fd03`, KHÔNG revert composition-footer `04b767e`. Tier 2 chỉ sửa trong §0 In-scope roots. | `CHOSEN` |
| `RQ-01` | **Nền peach tăng 1 bậc:** footer background đổi từ `bg-primary-fixed/20` sang `bg-primary-fixed/35` (Owner #1). Footer vẫn sáng, thanh thoát; không sang nâu đậm. Nếu không thể dùng `/35` thì Tier 2 escalate Tier 1 trước khi sửa. | `CHOSEN` |
| `RQ-02` | **3 cột desktop giữ thứ tự `Công ty → Dịch vụ → Liên hệ`** với tỷ lệ cột cho phép chỉnh để cột Công ty và form liên hệ không bị chật (Owner #2). Hiện tại grid `md:grid-cols-3`; Tier 2 có thể chỉnh gap hoặc dùng `md:grid-cols-[1.1fr_1fr_1.1fr]` nếu cần — KHÔNG đổi thứ tự. | `CHOSEN` |
| `RQ-03` | **Dịch vụ 5 mục giữ nguyên nội dung** (Owner #4): `Cung ứng và cho thuê lại lao động thời vụ ngắn hạn, dài hạn` / `Dịch vụ gia công và kiểm tra, phân loại linh kiện điện tử` / `Dịch vụ giới thiệu lao động, việc làm` / `Dịch vụ bốc xếp hàng hóa` / `Dịch vụ đóng gói hàng hoá`. Chỉ chỉnh typography + icon + spacing. Tier 2 thay `material-symbols-outlined` "circle" bằng Lucide icon phù hợp (DEC-10). | `CHOSEN` |
| `RQ-04` | **Hotline/Email/Website giữ nguyên** (Owner #5, #6, #7): `tel:02112216999` (`Hotline: 0211 2216999`), `tel:0964984866` (`Hotline: 0964 984 866`), `mailto:nhaluchrp@gmail.com` (`Email: nhaluchrp@gmail.com`), external `https://hrpvietnam.com/` (`Website: https://hrpvietnam.com/`) với `target="_blank" rel="noopener noreferrer"`. Chỉ chỉnh typography/icon/spacing, KHÔNG đổi chuỗi. | `CHOSEN` |
| `RQ-05` | **Địa chỉ Phú Thọ giữ nguyên nội dung** (Owner #8): `Thuê Khu đất DV Tân Ngọc, Thống Nhất, Bắc Kê, Xã Bình Tuyền, Tỉnh Phú Thọ, Việt Nam`. | `CHOSEN` |
| `RQ-06` | **ContactForm giữ `disabled={true}`** (Owner #9): form vẫn presentational, không submit, không gọi API. Tier 2 KHÔNG thêm logic validation mới, không gọi API, không tạo `handleSubmit` thật. | `CHOSEN` |
| `RQ-07` | **Helper text ContactForm đổi copy** (Owner #10): thay `Tính năng đang được hoàn thiện. Vui lòng gọi hotline hoặc email.` bằng `Vui lòng liên hệ qua hotline hoặc email trong thời gian này.` Bỏ cụm mang tính kỹ thuật. Helper text chỉ hiện khi `disabled={true}`. | `CHOSEN` |
| `RQ-08` | **CTA `GỬI NGAY` giữ nhãn + disabled** (Owner #11): button giữ chuỗi `GỬI NGAY`, thuộc `&lt;fieldset disabled={true}&gt;`; hiển thị trạng thái disabled dễ hiểu (`disabled:opacity-50` hoặc tương đương), không giả vờ submit thành công. KHÔNG thêm loading spinner, KHÔNG thêm success state. | `CHOSEN` |
| `RQ-09` | **Copyright đổi chuỗi** (Owner #12): thay `&copy; {năm hiện hành} HRP — Hệ sinh thái nhân sự toàn diện.` bằng `&copy; {năm hiện hành} HRP Việt Nam. Connecting for Success.` Giữ runtime year `new Date().getFullYear()`. KHÔNG restore "Phiên bản 6.0". | `CHOSEN` |
| `RQ-10` | **Routes thật `/ve-chung-toi`, `/ctv-portal` giữ nguyên** (Owner #13): dùng `next/link` với prop `href` đúng. Label `Về chúng tôi` (route) + `Cộng tác viên` (route) giữ. KHÔNG đổi path. | `CHOSEN` |
| `RQ-11` | **Đổi semantic cho 3 link chưa có route** (Owner #14): `Điều khoản`, `Chính sách bảo mật`, `Liên hệ` — render thành `&lt;span aria-disabled="true"&gt;` (hoặc `&lt;div role="link" aria-disabled="true"&gt;` nếu cần bố cục), KHÔNG dùng `&lt;button&gt;` giả, KHÔNG `href="#"`, KHÔNG tab stop (`tabIndex={-1}`). KHÔNG thêm badge "Đang phát triển" ngoài thuộc tính aria. KHÔNG tạo route mới. | `CHOSEN` |
| `RQ-12` | **Mobile spacing & touch target tối thiểu 44px** (Owner #15): mọi link/action thật (`&lt;a&gt;`, `&lt;Link&gt;`, `&lt;button type="submit"&gt;`) đạt min-height/width 44px trên touch; mobile padding/gap gọn nhưng không dính chữ, không horizontal scroll tại 390px. Tier 2 dùng utility (`min-h-11` ~ 44px) hoặc custom CSS. | `CHOSEN` |
| `RQ-13` | **Container `max-w-[1080px] mx-auto`** với gutter `px-4 md:px-6` (Owner #16; VIS-06): giữ nguyên không đổi. | `CHOSEN` |
| `RQ-14` | **Panel liên hệ cam ấm, nhẹ và thanh thoát** (visual direction bổ sung): cột `Liên hệ` được tách thành panel nổi nhẹ, bo góc, sắc cam ấm đậm hơn nền footer. KHÔNG viền dày, KHÔNG shadow nặng. Tier 2 dùng semantic token hiện có (ví dụ `bg-primary-container/40` + `rounded-2xl` + `p-4`) — nếu cần token mới → escalate Tier 1. | `CHOSEN` |
| `RQ-15` | **Heading labels theo Owner** (visual direction bổ sung): cột 1 dùng `CÔNG TY TNHH HRP VIỆT NAM`; cột 2 dùng `DANH MỤC DỊCH VỤ`; cột 3 dùng `THÔNG TIN LIÊN HỆ`. Tier 2 thay nhãn heading hiện tại (`Công ty` / `Dịch vụ` / `Thông tin liên hệ`) bằng các nhãn này. KHÔNG thêm sub-heading. | `CHOSEN` |
| `RQ-16` | **Input ContactForm giữ nền trắng hoặc gần trắng** (visual direction): input/textarea giữ trắng (`bg-white`); có thể dùng `label sr-only` và placeholder nhìn thấy để form gọn hơn, nhưng accessible name (`htmlFor` + `id` hoặc `aria-label`) phải còn đầy đủ. | `CHOSEN` |

### 4.2 Scope boundaries

- **Container-only edits**: KHÔNG đổi nội dung card nào khác ngoài footer.
- **Data/state**: KHÔNG đổi state/form/Submit. Form vẫn presentational.
- **Permission/security**: N/A.
- **Interface/API**: KHÔNG tạo API mới.
- **Migration/rollback**: N/A.
- **Cache**: N/A.

### 4.3 Scope

- In: §0 In-scope roots.
- Out: §0 Forbidden + §1.2.
- Tier 2 tạo HANDOFF + `evidence/**` tại `docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/`. Tier 2 KHÔNG ghi TASK.md, KHÔNG ghi plan cha, KHÔNG revert R3/composition-footer.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | OBR-01 baseline + execution HEAD | Record: (a) `git rev-parse HEAD` → `evidence/exec-head-before.txt` (dự kiến `8c6fd03`). (b) `git status --porcelain` → `evidence/working-tree-before.txt` (chỉ R3 8 file dirty + maybe composition-footer 1 file đã ở HEAD). (c) Capture unit failure set → `evidence/expected-failure-set-before.txt` (hash + failing test files; Tier 2 không reset/fixture). | `git status --porcelain` không có path ngoài R3 8 file dirty + composition-footer 1 file. expected-failure-set-before.txt có hash | Nếu expected failure set khác baseline pre-existing (13 tests trên 5 file) → verify đo đúng lúc exec-head-before |
| `STEP-02` | Skeleton invariant guard | RQ-00: Tier 2 đọc `evidence/owner-footer-r2-decisions.md` + §1.1 (nguyên tắc giữ) + §1.2 (non-goals) + §0 (Forbidden paths) + §4 RQ-00 trước khi sửa. Nếu delta chạm nguyên tắc giữ → Tier 2 escalate Tier 1, KHÔNG tự ý phá invariant. | Source review: Tier 2 ghi nhận trong HANDOFF.md §1 Outcome rằng đã đọc skeleton invariant | Nếu Tier 2 phá invariant → halt, revert, escalate |
| `STEP-03` | Footer GlobalFooter.tsx layout & panel | RQ-01 (background), RQ-02 (3 cột giữ thứ tự + tỷ lệ), RQ-13 (container), RQ-14 (panel liên hệ cam ấm), RQ-15 (heading labels mới). Tier 2 đổi `bg-primary-fixed/20` → `bg-primary-fixed/35` (hoặc escalate nếu token chưa có). Tier 2 chỉnh grid nếu cần (giữ `md:grid-cols-3` hoặc `md:grid-cols-[1.1fr_1fr_1.1fr]`). Tier 2 thay heading labels cũ (`Công ty` / `Dịch vụ` / `Thông tin liên hệ`) bằng labels RQ-15. Tier 2 wrap ContactForm trong panel cam ấm (`bg-primary-container/40 rounded-2xl p-4` hoặc tương đương). | `rg -n "bg-primary-fixed/35|bg-primary-container/40|CÔNG TY TNHH HRP VIỆT NAM|DANH MỤC DỊCH VỤ|THÔNG TIN LIÊN HỆ" app/components/GlobalFooter.tsx` → expect ≥5 match. Lưu `evidence/ac-step03-footer-layout.txt` | Nếu fail → halt, escalate Tier 1 |
| `STEP-04` | Footer thông tin giữ + dịch vụ | RQ-03 (dịch vụ 5 mục nội dung giữ + chỉnh typography/icon/spacing bằng Lucide), RQ-04 (hotline/email/website links giữ nguyên chuỗi), RQ-05 (địa chỉ Phú Thọ giữ), RQ-10 (routes thật giữ). Tier 2 chỉ chỉnh className/CSS cho typography/icon/spacing, KHÔNG đổi text các link/địa chỉ/dịch vụ. | `rg -n "0211 2216999|0964 984 866|nhaluchrp@gmail.com|hrpvietnam\.com|Thuê Khu đất DV Tân Ngọc" app/components/GlobalFooter.tsx` → expect ≥5 match. `rg -n "Cung ứng và cho thuê lại|Dịch vụ gia công|Dịch vụ giới thiệu lao động|Dịch vụ bốc xếp|Dịch vụ đóng gói" app/components/GlobalFooter.tsx` → expect =5 match. Lưu `evidence/ac-step04-footer-content.txt` | Nếu fail → halt, revert |
| `STEP-05` | Footer copyright & semantic disabled links | RQ-09 (copyright đổi chuỗi), RQ-11 (3 link disabled dùng `&lt;span aria-disabled="true"&gt;`, không `&lt;button&gt;` giả, không `href="#"`), RQ-00 (không "Phiên bản 6.0"). Tier 2 thay copyright text. Tier 2 loại bỏ `FooterLinkItem` button giả và thay bằng `&lt;span aria-disabled="true" tabIndex={-1}&gt;` cho 3 link chưa có route. | `rg -n "Connecting for Success|HRP Việt Nam" app/components/GlobalFooter.tsx` → expect ≥2 match. `rg -n "Phiên bản 6\.0|href=\"#\"" app/components/GlobalFooter.tsx` → expect 0 match. `Select-String -Path app/components/GlobalFooter.tsx -Pattern "aria-disabled=\"true\""` → expect ≥3 match. Lưu `evidence/ac-step05-copyright-disabled.txt` | Nếu fail → halt, revert |
| `STEP-06` | Footer mobile responsive 390px + touch target | RQ-12 (touch target 44px min, không horizontal scroll tại 390px). Tier 2 đảm bảo mọi link/CTA đạt min 44px; test tại breakpoint 390px với `npm run build` không lỗi và `npm run test:unit` không thêm failure mới. Nếu có test responsive 390px hiện có, Tier 2 chạy và bằng chứng; nếu không, Tier 2 dùng Playwright/CDP đã có (nếu đã setup) hoặc ghi nhận trong HANDOFF đã verify thủ công ở mức CSS. | `rg -n "min-h-\\[44px\\]|min-h-11" app/components/GlobalFooter.tsx app/components/ContactForm.tsx` → expect ≥4 match (footer links + CTA + 2 hotline phone). `npm run build` → exit 0. Lưu `evidence/ac-step06-mobile.txt` (Tier 2 ghi breakpoint + verification method) | Nếu build fail → halt; nếu không đạt 44px → tier 2 escalate |
| `STEP-07` | ContactForm helper text + CTA giữ + input white | RQ-06 (form disabled giữ), RQ-07 (helper text đổi sang `Vui lòng liên hệ qua hotline hoặc email trong thời gian này.`), RQ-08 (CTA `GỬI NGAY` disabled giữ), RQ-16 (input giữ nền trắng hoặc gần trắng). Tier 2 giữ `&lt;fieldset disabled&gt;` + `disabled` props trên input/textarea; chỉ đổi helper text; giữ label `htmlFor` + `id` cho a11y. | `rg -n "Vui lòng liên hệ qua hotline hoặc email trong thời gian này" app/components/ContactForm.tsx` → expect ≥1 match. `rg -n "GỬI NGAY" app/components/ContactForm.tsx` → expect ≥1 match. `rg -n "Tính năng đang được hoàn thiện" app/components/ContactForm.tsx` → expect 0 match. `rg -n "bg-white" app/components/ContactForm.tsx` → expect ≥3 match (3 input/textarea). `rg -n "disabled=\\{disabled\\}|disabled=\\{true\\}" app/components/ContactForm.tsx` → expect ≥5 match. Lưu `evidence/ac-step07-contactform.txt` | Nếu fail → halt, revert |
| `STEP-08` | Reachability & hedge: tiêu đề rõ + touch lên button giả trước đây | Tier 2 quét file kết quả để đảm bảo không còn `&lt;button&gt;` trong footer (cả aria-disabled), đảm bảo `target="_blank"` có `rel="noopener noreferrer"`, đảm bảo heading semantic levels hợp lý (`&lt;h3&gt;` đã có). Tier 2 KHÔNG thêm package icon mới. | `rg -n "&lt;button" app/components/GlobalFooter.tsx` → expect 0 match (CTA GỬI NGAY thuộc ContactForm.tsx). `rg -n "noopener noreferrer" app/components/GlobalFooter.tsx` → expect ≥1 match. Lưu `evidence/ac-step08-reachability.txt` | Nếu còn `&lt;button&gt;` trong footer → halt, sửa theo RQ-11 |
| `STEP-99` | Regression check shell + mandatory gates | Source review: KHÔNG có diff ngoài §0 In-scope roots. `git diff --name-only exec-head-before..HEAD` filter allowlist. Tier 2 verify: (a) R3 8 file dirty không đổi; (b) `04b767e` composition-footer không revert; (c) copyright không có "Phiên bản 6.0"; (d) ContactForm `disabled={true}` còn nguyên; (e) mọi AC file evidence tồn tại. `npm run typecheck` exit 0; `npm run test:unit` cùng expected failure set + new failure count = 0; `npm run build` exit 0; `verify-task.ps1` PASS; `verify-handoff.ps1` PASS. | `evidence/ac00-invariants.txt` + `evidence/ac-gates.txt` + `evidence/ac99-touched-files.txt` (list allowed paths from `git diff`) | Nếu gate fail → halt, sửa, KHÔNG ghi READY_FOR_REVIEW |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method | Status |
|---|---|---|---|
| `AC-00` | **Skeleton invariant guard:** Tier 2 chạm file nào trong §0 In-scope roots; (a) R3 8 file dirty còn nguyên (`git status --porcelain` so với `evidence/working-tree-before.txt` — diff chỉ trong §0 In-scope roots của 04c1); (b) `src/domains/job-board/fixtures/best-jobs-urgent-preview.ts` vẫn D; (c) `app/components/GlobalFooter.tsx` còn `max-w-[1080px] mx-auto px-4 md:px-6`; (d) 0 match `Phiên bản 6.0` ở §0 In-scope roots; (e) 0 match `apps.apple.com\|play.google.com\|App Store\|Google Play`; (f) ContactForm `disabled={true}` còn nguyên; (g) hotline/email/website link + địa chỉ Phú Thọ + 5 dịch vụ + routes thật còn nguyên chuỗi; (h) mandatory gates PASS. | Command: `git diff --name-only exec-head-before..HEAD` filter allowlist chỉ `app/components/GlobalFooter.tsx` + `app/components/ContactForm.tsx` + `docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/**`; `rg -n "Phiên bản 6\.0|apps\.apple\.com|play\.google\.com" app/components/GlobalFooter.tsx app/components/ContactForm.tsx` → 0 match; `rg -n "0211 2216999|0964 984 866|nhaluchrp@gmail.com|hrpvietnam\.com|Thuê Khu đất DV Tân Ngọc|/ve-chung-toi|/ctv-portal|max-w-\[1080px\]|px-4 md:px-6" app/components/GlobalFooter.tsx` → ≥8 match; `npm run typecheck` + `npm run test:unit` + `npm run build` exit 0; `npm run test:unit` new failure count = 0 so với `evidence/expected-failure-set-before.txt`. Lưu `evidence/ac00-invariants.txt` | `CHOSEN` |
| `AC-01` | **RQ-01 (nền peach tăng 1 bậc):** footer background `bg-primary-fixed/35`. | Command: `rg -n "bg-primary-fixed/35" app/components/GlobalFooter.tsx` → expect ≥1 match. Lưu `evidence/ac01-background.txt` | `CHOSEN` |
| `AC-02` | **RQ-02 (3 cột desktop giữ thứ tự):** grid desktop vẫn 3 cột giữ thứ tự `Công ty / Dịch vụ / Liên hệ`; cho phép chỉnh tỷ lệ cột (ví dụ `md:grid-cols-[1.1fr_1fr_1.1fr]`). | Command: `Select-String -Path app/components/GlobalFooter.tsx -Pattern "md:grid-cols-3\|md:grid-cols-\[1\.1fr_1fr_1\.1fr\]"` → expect ≥1 match. Lưu `evidence/ac02-grid.txt` | `CHOSEN` |
| `AC-03` | **RQ-03 (5 dịch vụ giữ nội dung):** đủ 5 chuỗi dịch vụ trong `app/components/GlobalFooter.tsx`. | Command: `rg -n "Cung ứng và cho thuê lại lao động thời vụ ngắn hạn, dài hạn\|Dịch vụ gia công và kiểm tra, phân loại linh kiện điện tử\|Dịch vụ giới thiệu lao động, việc làm\|Dịch vụ bốc xếp hàng hóa\|Dịch vụ đóng gói hàng hoá" app/components/GlobalFooter.tsx` → expect =5 match. Lưu `evidence/ac03-services.txt` | `CHOSEN` |
| `AC-04` | **RQ-04 + RQ-05 (hotline/email/website/địa chỉ Phú Thọ giữ):** 4 link `tel:` + `mailto:` + external đúng chuỗi; địa chỉ Phú Thọ còn nguyên. | Command: `rg -n "tel:02112216999|tel:0964984866|mailto:nhaluchrp@gmail.com|target=\"_blank\" rel=\"noopener noreferrer\"|Thuê Khu đất DV Tân Ngọc, Thống Nhất, Bắc Kê, Xã Bình Tuyền, Tỉnh Phú Thọ, Việt Nam" app/components/GlobalFooter.tsx` → expect ≥5 match. Lưu `evidence/ac04-links-address.txt` | `CHOSEN` |
| `AC-05` | **RQ-06 + RQ-08 (ContactForm disabled giữ + CTA `GỬI NGAY` giữ):** form có `&lt;fieldset disabled&gt;` với `disabled={true}`, CTA button `&lt;button type="submit" disabled={disabled}&gt;` giữ chuỗi `GỬI NGAY`, không có logic submit. | Command: `rg -n "fieldset disabled|<button type=\"submit\"|GỬI NGAY|disabled=\{disabled\}" app/components/ContactForm.tsx` → expect ≥4 match. Lưu `evidence/ac05-contactform-disabled.txt` | `CHOSEN` |
| `AC-06` | **RQ-07 (helper text đổi copy):** helper text mới `Vui lòng liên hệ qua hotline hoặc email trong thời gian này.`; chuỗi cũ `Tính năng đang được hoàn thiện` không còn xuất hiện trong `ContactForm.tsx`. | Command: `rg -n "Vui lòng liên hệ qua hotline hoặc email trong thời gian này" app/components/ContactForm.tsx` → expect ≥1 match; `rg -n "Tính năng đang được hoàn thiện" app/components/ContactForm.tsx` → expect 0 match. Lưu `evidence/ac06-helper-text.txt` | `CHOSEN` |
| `AC-07` | **RQ-09 (copyright đổi chuỗi):** chuỗi mới `&copy; {năm} HRP Việt Nam. Connecting for Success.` còn `new Date().getFullYear()`; "Phiên bản 6.0" không xuất hiện. | Command: `rg -n "Connecting for Success|HRP Việt Nam|new Date\(\)\.getFullYear" app/components/GlobalFooter.tsx` → expect ≥3 match; `rg -n "Phiên bản 6\.0" app/components/GlobalFooter.tsx` → expect 0 match. Lưu `evidence/ac07-copyright.txt` | `CHOSEN` |
| `AC-08` | **RQ-10 + RQ-11 (routes thật giữ + 3 link disabled semantic):** routes `/ve-chung-toi` + `/ctv-portal` dùng `&lt;Link&gt;`; 3 link `Điều khoản / Chính sách bảo mật / Liên hệ` dùng `&lt;span aria-disabled="true"&gt;` (KHÔNG `&lt;button&gt;`, KHÔNG `href="#"`). | Command: `rg -n "/ve-chung-toi|/ctv-portal" app/components/GlobalFooter.tsx` → expect ≥2 match; `rg -n "aria-disabled=\"true\"" app/components/GlobalFooter.tsx` → expect ≥3 match; `rg -n "<button\b|href=\"#\"" app/components/GlobalFooter.tsx` → expect 0 match. Lưu `evidence/ac08-routes-disabled-semantic.txt` | `CHOSEN` |
| `AC-09` | **RQ-12 (touch target 44px min, mobile 390px không overflow):** mọi `&lt;a&gt;`, `&lt;Link&gt;`, `&lt;button type="submit"&gt;` đạt min-height 44px (`min-h-11` hoặc `min-h-[44px]`). | Command: `rg -n "min-h-\\[44px\\]\|min-h-11" app/components/GlobalFooter.tsx app/components/ContactForm.tsx` → expect ≥5 match (2 hotline, 1 email, 1 website, 1 CTA). Lưu `evidence/ac09-touch-target.txt` | `CHOSEN` |
| `AC-10` | **RQ-13 (container 1080px, gutter):** inner container có `mx-auto w-full max-w-[1080px] px-4 md:px-6`. | Command: `rg -n "max-w-\[1080px\] mx-auto|px-4 md:px-6" app/components/GlobalFooter.tsx` → expect ≥2 match. Lưu `evidence/ac10-container.txt` | `CHOSEN` |
| `AC-11` | **RQ-14 (panel liên hệ cam ấm):** ContactForm được wrap trong panel sắc cam ấm bo góc (e.g. `bg-primary-container/40 rounded-2xl p-4` hoặc tương đương). | Command: `rg -n "primary-container/40\|primary-container" app/components/GlobalFooter.tsx` → expect ≥1 match (nếu Tier 2 dùng token khác tương đương → Tier 2 ghi nhận trong HANDOFF và Tier 1 duyệt nội dung). Lưu `evidence/ac11-panel.txt` | `CHOSEN` |
| `AC-12` | **RQ-15 (heading labels):** heading labels là `CÔNG TY TNHH HRP VIỆT NAM` / `DANH MỤC DỊCH VỤ` / `THÔNG TIN LIÊN HỆ`. | Command: `rg -n "CÔNG TY TNHH HRP VIỆT NAM|DANH MỤC DỊCH VỤ|THÔNG TIN LIÊN HỆ" app/components/GlobalFooter.tsx` → expect ≥3 match. Lưu `evidence/ac12-headings.txt` | `CHOSEN` |
| `AC-13` | **RQ-16 (input ContactForm nền trắng, accessible name):** input/textarea giữ `bg-white`; mỗi input/textarea có accessible name qua `&lt;label htmlFor&gt;` (hoặc `aria-label`). | Command: `rg -n "bg-white" app/components/ContactForm.tsx` → expect ≥3 match; `rg -n "htmlFor=\"contact-|id=\"contact-" app/components/ContactForm.tsx` → expect ≥6 match (3 cặp label-input). Lưu `evidence/ac13-input-white.txt` | `CHOSEN` |
| `AC-14` | **Owner live visual review:** visual parity theo 16 quyết định Owner tại `evidence/owner-footer-r2-decisions.md`. Tier 1 ghi closeout (DEC-05). KHÔNG fail AC vì thiếu screenshot. | Owner review ghi trong `evidence/owner-live-visual-review-r1.md` (Tier 2 tạo file hoặc Tier 1 ghi sau deploy). Tier 1 KHÔNG audit visual. | `CHOSEN` |

### 6.2 Traceability

| Requirement | Step | Acceptance | Status |
|---|---|---|---|
| `RQ-00` | `STEP-02`, `STEP-99` | `AC-00` | `CHOSEN` |
| `RQ-01` | `STEP-03` | `AC-01` | `CHOSEN` |
| `RQ-02` | `STEP-03` | `AC-02` | `CHOSEN` |
| `RQ-03` | `STEP-04` | `AC-03` | `CHOSEN` |
| `RQ-04` | `STEP-04` | `AC-04` | `CHOSEN` |
| `RQ-05` | `STEP-04` | `AC-04` | `CHOSEN` |
| `RQ-06` | `STEP-07` | `AC-05` | `CHOSEN` |
| `RQ-07` | `STEP-07` | `AC-06` | `CHOSEN` |
| `RQ-08` | `STEP-07` | `AC-05` | `CHOSEN` |
| `RQ-09` | `STEP-05` | `AC-07` | `CHOSEN` |
| `RQ-10` | `STEP-04`, `STEP-08` | `AC-08` | `CHOSEN` |
| `RQ-11` | `STEP-05`, `STEP-08` | `AC-08` | `CHOSEN` |
| `RQ-12` | `STEP-06` | `AC-09` | `CHOSEN` |
| `RQ-13` | `STEP-03` | `AC-10` | `CHOSEN` |
| `RQ-14` | `STEP-03` | `AC-11` | `CHOSEN` |
| `RQ-15` | `STEP-03` | `AC-12` | `CHOSEN` |
| `RQ-16` | `STEP-07` | `AC-13` | `CHOSEN` |
| Owner live visual review | (post-deploy) | `AC-14` | `CHOSEN` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Tier 2 revert R3 8 file dirty khi chạm import chain của GlobalFooter | §0 Forbidden + STEP-99 git diff filter. R3 file không thuộc §0 In-scope roots |
| `RISK-02` | Tier 2 vô tình mở API contact / persistence / schema | §0 Forbidden + §1.2 non-goals + STEP-99 git diff filter |
| `RISK-03` | Tier 2 hardcode màu hex khi Owner yêu cầu đổi tone peach | DEC-04: chỉ dùng semantic token. Nếu cần token mới → Tier 1 duyệt |
| `RISK-04` | Tier 2 phục hồi dòng "Phiên bản 6.0" hoặc copyright sai format | DEC-07 + AC-07 grep `Phiên bản 6.0` expect 0 match + `Connecting for Success` expect ≥1 match |
| `RISK-05` | Tier 2 vẫn giữ `&lt;button&gt;` giả hoặc `href="#"` cho 3 link disabled | RQ-11 + AC-08 grep `&lt;button\|href="#"` trong GlobalFooter.tsx expect 0 match |
| `RISK-06` | Tier 2 thay đổi nội dung dịch vụ/hotline/email/website/địa chỉ khi chỉnh typography | RQ-03..05 + AC-03/04 grep chuỗi gốc expect khớp |
| `RISK-07` | Tier 2 thêm package icon mới | DEC-10 + visual direction bổ sung (Lucide đã có). STEP-04 source review |
| `RISK-08` | Tier 2 mở `app/globals.css` để thêm token semantic mới | DEC-04 + §0 Forbidden (chỉ mở nếu Tier 1 duyệt trước). Nếu thiếu token → Tier 1 duyệt dùng token khác trong palette |
| `RISK-09` | Tier 2 phá invariant `disabled={true}` trên ContactForm | RQ-06 + AC-05 grep. STEP-07 đo |
| `RISK-10` | Tier 2 giảm helper text xuống dưới bề mặt chính làm người dùng bỏ sót | RQ-07: helper text vẫn trong ContactForm, hiện khi `disabled`. AC-06 grep verify. Visual parity Owner đánh giá sau deploy |

## 8. Open Questions (đã đóng)

16 lựa chọn Owner đã được chốt tại `docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/owner-footer-r2-decisions.md` (2026-09-10). Không còn câu hỏi mở. Tier 1 không tự chọn hộ Owner (DEC-03).

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 0 | Tier 1 tạo skeleton TASK.md ở `DRAFT`, gửi 16 câu hỏi §8 cho Owner. Tier 1 KHÔNG tự định nghĩa RQ/AC/STEP vì repo chưa chứa directive Owner cụ thể về delta footer r2. Giữ nguyên tắc: container 1080px, mobile stack, tel/mailto/website thật, form disabled, không "Phiên bản 6.0". | Bám đúng Tier 0: "repo chưa chứa directive mô tả delta hình ảnh cụ thể của footer tweak r2 ngoài tên task và ý định footer tweak. Tier 1 không được tự tưởng tượng yêu cầu." |
| 1 | Tier 1 nhận `evidence/owner-footer-r2-decisions.md` (16 lựa chọn + visual direction bổ sung). Tier 1 finalize contract v1.0: (a) `RQ-00..RQ-16` (RQ-00 invariant + 16 RQ từ decisions); (b) `STEP-03..STEP-08` (5 STEP thi công cụ thể cho layout / content / copyright & disabled / mobile / ContactForm); (c) `AC-01..AC-14` (14 AC dùng `rg` / `Select-String` đo được + AC-00 invariant tổng); (d) Spec bump v0.1 → v1.0, Status DRAFT → READY_FOR_EXECUTION; (e) §0 Control giữ FAST + NONE audit (đúng Tier 0 verdict §3); (f) §1.1 rewrite outcome theo 16 decisions; (g) §1.2 non-goals bổ sung RQ-11/14/15; (h) §8 đóng — không còn câu hỏi. | Owner đã cung cấp đủ 16 lựa chọn + visual direction. Tier 0 verdict §3 cho phép: "Khi Owner cung cấp delta: chuyển skeleton thành contract thật, bỏ toàn bộ placeholder, bump spec v0.1 → v1.0, FAST lane, chạy verify-task.ps1, chỉ chuyển READY_FOR_EXECUTION khi PASS không còn placeholder warning." Tier 1 không cần hỏi lại 16 lựa chọn. |

## 10. Revision Log

- `v0.1` (10/09/2026): Tier 1 tạo skeleton DRAFT sau khi R3 `ACCEPTED`. Source: Tier 0 continuation prompt `docs/prompts/TIER1_CONTINUATION_UI04_AFTER_R3.md` §4 (footer tweak r2 rules) + `app/components/GlobalFooter.tsx` + `app/components/ContactForm.tsx` tại `04b767e`. Status `DRAFT` vì chưa có Owner delta cụ thể. Tier 1 ghi §8 Open Questions cho Owner. Spec bump sẽ thành `v1.0` khi Owner trả lời và Tier 1 finalize contract.
- `v1.0` (10/09/2026): Tier 1 nhận `docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/owner-footer-r2-decisions.md` (16 lựa chọn đã chốt + visual direction bổ sung). Tier 1 rewrite contract v1.0: thay toàn bộ placeholder `RQ-XX` / `STEP-03..N` / `AC-01..N` bằng `RQ-00..RQ-16` + `STEP-03..STEP-08` + `AC-01..AC-14` theo decisions. Spec bump v0.1 → v1.0. Status DRAFT → `READY_FOR_EXECUTION`. Lane FAST giữ nguyên (Tier 0 verdict §3). §1.1 rewrite outcome theo 16 decisions. §1.2 bổ sung non-goals (Owner #14 không button giả + không href="#"). §3 Decisions bổ sung DEC-09..DEC-12. §8 Open Questions đã đóng. Tier 1 đợi `verify-task.ps1` PASS để giữ READY_FOR_EXECUTION.
