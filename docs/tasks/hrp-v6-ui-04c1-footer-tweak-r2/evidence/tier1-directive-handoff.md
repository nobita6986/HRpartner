# Tier 1 directive — 04c1 footer tweak r2 v1.0 thi công

> TIER 1 DIRECTIVE CHO TIER 2. Thi công trong worktree hiện tại tại HEAD `ed3b784` (commit planning v1.0). KHÔNG sửa `TASK.md`, KHÔNG revert/overwrite source production, KHÔNG mở backend, KHÔNG push lên `origin/main`.
> Ngày: 2026-09-10. Cơ sở: `docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/TASK.md` v1.0 `READY_FOR_EXECUTION`; `verify-task.ps1` PASS (0 warning, 0 error).
> 16 Owner decisions đã chốt tại `docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/owner-footer-r2-decisions.md`. Tier 2 đọc file này TRƯỚC KHI bắt đầu.

## 1. Bối cảnh Tier 1 đã đo

- `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/TASK.md`: **PASS** (0 warning, 0 error). TASK contract v1.0 đã hợp lệ, không còn placeholder.
- HEAD hiện tại: `ed3b784` (planning commit). Tier 2 capture baseline tại STEP-01 ngay trước khi sửa.
- `verify-handoff.ps1`: chưa chạy (HANDOFF.md đang ở trạng thái `READY_FOR_REVIEW` skeleton, Tier 2 sẽ đổi sang `READY_FOR_REVIEW` sau khi capture evidence đầy đủ).
- Source production `app/components/GlobalFooter.tsx` + `app/components/ContactForm.tsx` còn ở baseline `04b767e` (composition/footer ACCEPTED). Tier 2 không revert.
- 8 file dirty của R3 (`8c6fd03`) đã commit path-scoped; Tier 2 không revert.

## 2. Tier 2 chỉ được chạm 2 file

```text
app/components/GlobalFooter.tsx
app/components/ContactForm.tsx
```

Mọi file khác thuộc §0 Forbidden paths trong TASK.md. Tier 2 KHÔNG mở `app/globals.css`, KHÔNG thêm package, KHÔNG thêm icon library mới.

## 3. Việc Tier 2 phải làm (theo STEP ID trong TASK.md)

### Bước 1 — Capture baseline (STEP-01)

```powershell
git rev-parse HEAD > docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/exec-head-before.txt
git status --porcelain > docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/working-tree-before.txt
npm run test:unit --reporter=basic 2>&1 | Tee-Object -FilePath docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/expected-failure-set-before.txt
```

`exec-head-before.txt` kỳ vọng `ed3b784...`. `working-tree-before.txt` chỉ có R3 8 file dirty (đã commit trong `8c6fd03`, không còn dirty working tree; nếu có thêm file dirty khác → Tier 2 KHÔNG stage/revert mà ghi nhận trong HANDOFF §4 Deviations). `expected-failure-set-before.txt` ghi baseline test failure set.

### Bước 2 — Skeleton invariant guard (STEP-02)

Tier 2 đọc:

- `docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/owner-footer-r2-decisions.md` (16 lựa chọn Owner)
- TASK.md §1.1 (nguyên tắc giữ) + §1.2 (non-goals) + §0 Forbidden paths + §4 RQ-00

Tier 2 ghi nhận trong HANDOFF.md §1 Outcome rằng đã đọc skeleton invariant và 16 Owner decisions.

### Bước 3 — Thi công layout + panel (STEP-03)

Ánh xạ RQ → diff cụ thể:

- **RQ-01** (peach đậm hơn): đổi `<footer ... className="border-t border-line bg-primary-fixed/20">` → `bg-primary-fixed/35`. Nếu token `/35` chưa có trong palette (verify bằng `rg "primary-fixed/35" app/`), Tier 2 KHÔNG tự ý thêm; escalate Tier 1. Tier 2 có thể dùng mức gần nhất (`/30`) nếu `bg-primary-fixed/35` resolve được, hoặc dùng `bg-primary-fixed/30` (đã có sẵn ở ReferralStrip).
- **RQ-02** (3 cột giữ): giữ `md:grid-cols-3`; nếu Tier 2 muốn chỉnh tỷ lệ để form không chật, dùng `md:grid-cols-[1.1fr_1fr_1.1fr]` hoặc tương đương. KHÔNG đổi thứ tự.
- **RQ-13** (container 1080px, gutter): giữ `mx-auto w-full max-w-[1080px] px-4 md:px-6`.
- **RQ-14** (panel liên hệ cam ấm): wrap `<ContactForm .../>` trong `<div className="rounded-2xl bg-primary-container/40 p-4 md:p-5">` (hoặc tương đương). Token `primary-container/40` đã dùng ở các component khác; nếu chưa có, Tier 2 kiểm tra bằng `rg "primary-container" app/` trước.
- **RQ-15** (heading labels): thay heading cũ `Công ty` / `Dịch vụ` / `Thông tin liên hệ` bằng `CÔNG TY TNHH HRP VIỆT NAM` / `DANH MỤC DỊCH VỤ` / `THÔNG TIN LIÊN HỆ`. Tier 2 giữ `<h3>` semantic.

### Bước 4 — Content giữ + dịch vụ chỉnh typography/icon (STEP-04)

- **RQ-03** (5 dịch vụ): giữ nguyên chuỗi, thay `material-symbols-outlined` icon `circle` bằng Lucide icon phù hợp (DEC-10). Lucide đã có trong dự án — Tier 2 xác nhận bằng `rg "from 'lucide-react'" src/domains/job-board/components/landing/` trước khi thêm import mới vào `GlobalFooter.tsx`. Icon đề xuất: `Briefcase`, `Cpu`, `Users`, `PackageOpen`, `Package` (hoặc tương đương — Tier 2 chọn). Tier 2 KHÔNG thêm package mới.
- **RQ-04** (tel/mailto/website): giữ nguyên chuỗi; chỉ chỉnh typography/icon/spacing nếu cần.
- **RQ-05** (địa chỉ Phú Thọ): giữ nguyên chuỗi `Thuê Khu đất DV Tân Ngọc, Thống Nhất, Bắc Kê, Xã Bình Tuyền, Tỉnh Phú Thọ, Việt Nam`.
- **RQ-10** (routes thật): giữ `Về chúng tôi` → `/ve-chung-toi` và `Cộng tác viên` → `/ctv-portal` (dùng `<Link>` của next).

### Bước 5 — Copyright + semantic disabled (STEP-05)

- **RQ-09** (copyright): thay `&copy; {year} HRP — Hệ sinh thái nhân sự toàn diện.` bằng `&copy; {year} HRP Việt Nam. Connecting for Success.`. Giữ `new Date().getFullYear()` runtime.
- **RQ-11** (semantic disabled): với 3 link `Điều khoản / Chính sách bảo mật / Liên hệ` (hiện đang là `<button aria-disabled="true" tabIndex={-1}>` qua `FooterLinkItem`), Tier 2 thay thành `<span aria-disabled="true" tabIndex={-1} className="...text-on-surface-variant opacity-70">`. KHÔNG dùng `<button>`; KHÔNG `href="#"`; KHÔNG tạo route mới. Tier 2 có thể refactor `FooterLinkItem` thành 2 component (`FooterRouteLink` + `FooterDisabledText`) hoặc giữ 1 component với prop `type: 'route' | 'disabled'` — chọn cách nào gọn, code review Tier 3 duyệt sau.
- **RQ-00** (invariant): KHÔNG phục hồi "Phiên bản 6.0".

### Bước 6 — Mobile responsive + touch target (STEP-06)

- **RQ-12** (touch target ≥ 44px, không horizontal scroll 390px): Tier 2 thêm `min-h-11` (≈ 44px) hoặc `min-h-[44px]` cho tất cả `<a>` (2 hotline, 1 email, 1 website), `<Link>` (2 route), và CTA `<button type="submit">` (nằm trong `ContactForm.tsx`). Verify bằng `rg -n "min-h-\\[44px\\]|min-h-11" app/components/GlobalFooter.tsx app/components/ContactForm.tsx` expect ≥5 match.
- Nếu repo đã có Playwright/CDP cho responsive test, Tier 2 chạy; nếu không, Tier 2 ghi nhận trong HANDOFF §1 rằng đã verify bằng code review (CSS utility đảm bảo min-height; gutter `px-4 md:px-6` không overflow 390px).

### Bước 7 — ContactForm helper text + CTA + input white (STEP-07)

- **RQ-06** (form disabled giữ): giữ `<fieldset disabled={disabled}>` với mọi `disabled={disabled}` trên input/textarea/button. KHÔNG thêm validation mới; KHÔNG gọi API; KHÔNG tạo `handleSubmit` thật.
- **RQ-07** (helper text mới): thay `Tính năng đang được hoàn thiện. Vui lòng gọi hotline hoặc email.` bằng `Vui lòng liên hệ qua hotline hoặc email trong thời gian này.` Helper text chỉ hiện khi `disabled === true`.
- **RQ-08** (CTA giữ): giữ chuỗi `GỬI NGAY`; button thuộc `<fieldset disabled>`; thuộc tính `disabled:opacity-50` hoặc tương đương để hiển thị trạng thái disabled dễ hiểu.
- **RQ-16** (input nền trắng + accessible name): giữ `bg-white` cho input/textarea; giữ `<label htmlFor="contact-...">` + `id="contact-..."` cho a11y. Tier 2 có thể thêm `sr-only` label và dùng placeholder nhìn thấy nếu muốn form gọn hơn, nhưng accessible name phải còn đầy đủ.

### Bước 8 — Reachability & hedge (STEP-08)

- Verify: 0 match `<button` trong `app/components/GlobalFooter.tsx` (`rg -n "<button" app/components/GlobalFooter.tsx`).
- Verify: `target="_blank"` có `rel="noopener noreferrer"` (đã có ở baseline).
- Verify: heading semantic `<h3>` đã có sẵn.
- Tier 2 KHÔNG thêm package icon mới.

### Bước 9 — Regression check + gates (STEP-99)

```powershell
# 1. Source review
git diff --name-only exec-head-before..HEAD | Should -BeIn allowlist: 'app/components/GlobalFooter.tsx','app/components/ContactForm.tsx','docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/**'

# 2. R3 8 file dirty không đổi (file trong 8c6fd03 đã commit, không còn dirty)
git status --porcelain  # expect: không có file ngoài allowlist trên

# 3. Mandatory gates
npm run typecheck                                                       # exit 0
npm run test:unit                                                       # same expected failure set + new failure count = 0
npm run build                                                           # exit 0
powershell -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/TASK.md
powershell -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/TASK.md -HandoffPath docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/HANDOFF.md

# 4. AC files evidence
# Tier 2 chạy từng AC verification command (rg / Select-String) theo §6.1 TASK.md và lưu evidence:
# ac00-invariants.txt, ac01-background.txt, ac02-grid.txt, ac03-services.txt,
# ac04-links-address.txt, ac05-contactform-disabled.txt, ac06-helper-text.txt,
# ac07-copyright.txt, ac08-routes-disabled-semantic.txt, ac09-touch-target.txt,
# ac10-container.txt, ac11-panel.txt, ac12-headings.txt, ac13-input-white.txt
```

`expected-failure-set-before.txt` (Bước 1) là baseline; Tier 2 đối chiếu `npm run test:unit` sau khi sửa và confirm new failure count = 0.

### Bước 10 — Capture evidence gates

```powershell
npm run typecheck > docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/typecheck.txt 2>&1
npm run test:unit --reporter=basic > docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/test-unit.txt 2>&1
npm run build > docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/build.txt 2>&1
```

## 4. Cập nhật HANDOFF.md theo compact canonical

HANDOFF.md hiện đang ở skeleton `READY_FOR_REVIEW`. Tier 2 cập nhật:

### Section 0 — Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-04c1-footer-tweak-r2` |
| Spec version | `v1.0` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` (FAST bypass Tier 3) |
| Execution round | `1` |
| Baseline | `<SHA từ exec-head-before.txt — kỳ vọng ed3b784...>` |
| Status | `READY_FOR_REVIEW` (FAST lane không cần Tier 3 audit; Owner live visual review) |

### Section 1 — Outcome and changed surface

- **Delivered:** bullet ngắn (≤ 10) từng RQ/STEP đã làm
- **Not delivered:** `<None>`
- **Changed:** 2 file allowlist (`GlobalFooter.tsx` + `ContactForm.tsx`)
- **Lane escalation:** `<No>`

### Section 2 — Acceptance evidence

Dòng đầu: `verify-task.ps1 PASS`. Mỗi `AC-01..AC-14` có row riêng; cột Evidence cite `E-xx`; cột Result đo được; cột Limitation `None`. Bảng 4 cột.

### Section 3 — Evidence registry

Bảng 4 cột: `Evidence | Command / method | Exit / measured result | Artifact`. Mỗi `E-xx` map tới file `evidence/acXX-*.txt`.

### Section 4 — Deviations and blockers

Nếu có pre-existing test failures (giống R3: 13 tests trên 5 file): ghi `BLK-01` với description đầy đủ + baseline hash. Nếu không có: `<None>`.

### Section 5 — Final status

Một câu kết luận + `> Handoff status: READY_FOR_REVIEW` (FAST).

## 5. Điều KHÔNG được làm

- KHÔNG sửa `TASK.md` thêm. Tier 1 owns TASK.md; Tier 2 chỉ fill HANDOFF + evidence.
- KHÔNG revert source: 8 file R3 dirty trong `8c6fd03` đã commit; composition/footer `04b767e` đã ACCEPTED. Tier 2 không sửa BestJobs/Areas/Recruiting/Hero/Job Card/ReferralStrip.
- KHÔNG mở `app/globals.css`, không thêm package, không thêm icon library mới.
- KHÔNG tạo route mới (Owner #13).
- KHÔNG tạo `<button>` giả cho 3 link disabled (Owner #14).
- KHÔNG dùng `href="#"` (Owner #14).
- KHÔNG phục hồi "Phiên bản 6.0".
- KHÔNG hardcode màu hex — chỉ dùng semantic token hiện có.
- KHÔNG commit/push. Tier 1 quyết định khi nào commit + push.
- KHÔNG cài tool đo (axe-core, Lighthouse, CDP, pa11y).
- KHÔNG tự phát hành ACCEPTED verdict. Owner live visual review (AC-14) thuộc Owner sau deploy.

## 6. Khi gate PASS

Tier 2 báo lại Tier 1 với:

- Output cuối cùng của `verify-task.ps1` (kỳ vọng `RESULT: PASS`).
- Output cuối cùng của `verify-handoff.ps1` (kỳ vọng `RESULT: PASS` hoặc `PASS WITH WARNINGS`).
- Số file đã stage ở `evidence/` (kỳ vọng ≥ 14 file: 3 baseline + typecheck + test-unit + build + 11 ac files; tùy thuộc AC nào Tier 2 capture).
- Tóm tắt 1 câu: HANDOFF đã chuyển sang compact canonical, 14 AC đều có evidence row, baseline pre-existing đã đối chiếu.

Sau đó Tier 1 commit path-scoped HANDOFF + evidence; Tier 0 / Owner quyết định deploy + live visual review (AC-14). Vì FAST lane không cần Tier 3 audit, sau Owner live visual review = `ACCEPTED` → section-render tự động mở `READY_FOR_EXECUTION`.
