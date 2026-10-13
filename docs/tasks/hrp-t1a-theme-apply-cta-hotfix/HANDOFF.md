# HANDOFF — `hrp-t1a-theme-apply-cta-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-t1a-theme-apply-cta-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.3` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Execution round | `3` (R0 round 1, R1 round 2, R2 round 3) |
| Baseline | `5cfbca12e948c3a207f61db06fe7001c9cc248d2` |
| Implementation SHA | `88e1221c6935a5c7c204a72bc12ada4d93b0b4fb` |
| Implementation SHA note | HEAD = `88e1221c`; semantic code/test/probe ở `a22fd2b6` (commit trước); commit pin SHA + 1 cleanup là docs-only. |
| Frozen delivery | `YES` |
| Canonical gates | `NOT_REQUIRED` |
| Audit eligibility | `NOT_REQUIRED` |
| Correction batches used | `1` |
| Status | `READY_FOR_REVIEW` |

## 1. Outcome and changed surface

- **Delivered (CTA theme — R0):** Nút Ứng tuyển (3 site) đổi màu theo theme đang chọn — cascade qua `--color-apply-cta` (alias `var(--color-primary-dark)`) và `--color-apply-cta-dark` (color-mix 82% PD + 18% #000). Default text `var(--color-on-primary)` (white), hover text `var(--color-on-primary)` (white), focus-visible `var(--color-focus-ring)` (PD), disabled giữ nguyên. Không tạo class mới, không đổi markup, không đổi palette hex, không sửa `theme-tokens.ts` / `theme-types.ts`. Token cũ `--color-primary-cta*` giữ nguyên giá trị hex cũ (#f07f1a / #c2520a) làm alias ngược.
- **Delivered (heading contrast — R0 round 1):** Heading "Chương trình Cộng tác viên" trong `referral-strip.tsx` đổi `text-primary-container` → `text-primary-dark`, pass ≥ 4.5:1 ở 5/5 palette trên nền `bg-primary-fixed/20`.
- **Delivered (Hero eyebrow — R0 round 1):** Eyebrow "Cùng tìm kiếm" ở `app/(portal)/page.tsx` đổi `text-secondary-fixed` → `text-on-primary` (white) — đồng bộ với H1. **Đây là fix ban đầu; sau R1 review phát hiện white trên gradient PC→PF bottom chỉ 1.23-1.40:1 → FAIL WCAG AA 5/5 theme khi text dài xuống dưới section.**
- **Delivered (Hero 2-state contrast — R1 round 2):** Hero copy container className dùng conditional theo `heroImage` — `heroImage ? 'text-on-primary' : 'text-primary-dark'`. Áp dụng ở container (1 điểm sửa duy nhất) thay vì 3 child riêng lẻ, loại bỏ hoàn toàn class `text-on-primary` / `text-secondary-fixed` hardcode ở eyebrow `<p>`, `<h1>` và body `<p>`. State 1 (no image, gradient `from-primary-container to-primary-fixed`): `text-primary-dark` đạt 5/5 ≥ 5.0:1 (HRP 5.013 / Ocean 7.838 / Emerald 6.570 / Violet 8.899 / Gold 6.855). State 2 (image, overlay `bg-primary-dark/55`): `text-on-primary` là best-effort; pre-existing limitation của overlay (xem RISK-04, EV-09).
- **Delivered (Hero contrast R2 — R2 round 2):** Sửa cả 2 limitation mà T0 chỉ ra ở R1:
  1. **State 2 (image)**: tăng overlay `bg-primary-dark/55` → `bg-primary-dark/85` trong `hero.tsx`. White/overmix(PD, PC/PF, 0.85) đạt 5/5 ≥ 4.95:1 (HRP 4.96-5.03, Ocean 6.72, Emerald 5.93, Violet 8.79, Gold 6.06). Probe cả 2 endpoint gradient (PC + PF). Ảnh vẫn hiện qua 15% PC/PF còn lại → giữ visual context.
  2. **State 1 (no image)**: bỏ `opacity-90` ở body `<p>` trong `app/(portal)/page.tsx`. Body giờ là `text-primary-dark` đạt 5/5 ≥ 5.0:1 (HRP 5.013, Ocean 7.838, Emerald 6.570, Violet 8.899, Gold 6.855) cả 2 đầu gradient. Trước R2 HRP body = 4.24 (FAIL < 4.5).
  3. **Test R2**: viết lại `hero-eyebrow-contrast.test.ts` để assert THỰC SỰ ≥ 4.5:1 cả 2 state × 5 theme × 2 endpoint gradient (PC + PF), tính hiệu dụng opacity nếu còn (đã bỏ nên không áp dụng). Guard semantic: regression test nếu dev thêm lại `opacity-N` ở body, HRP body vẫn phải pass. Probe scripts `evidence/probe-state1-gradient.ps1` + `evidence/probe-state2-overlay.ps1` (mới).

### Changed surface (trung thực với `git diff a42bb319..fd84297f`)

`git diff a42bb319..fd84297f -- app src prisma tests` chứa **4 file semantic + 2 file docs/artifact**:

| File | Loại thay đổi | Mô tả ngắn |
|---|---|---|
| `app/(portal)/page.tsx` | semantic | Eyebrow `text-secondary-fixed` → `text-on-primary` (R0), sau đó container className conditional theo `heroImage` (R1) |
| `src/domains/job-board/components/landing/referral-strip.tsx` | semantic | Heading CTV `text-primary-container` → `text-primary-dark` |
| `src/shared/theme/__tests__/globals-css-theme-scope.test.ts` | semantic | AC-08: đổi assertion từ `--color-primary-cta` → `--color-apply-cta`, giữ khóa token cũ còn tồn tại + khóa cả 2 token cũ+mới không bị override trong `[data-theme]` |
| `src/shared/theme/__tests__/theme-cta-foreground.test.ts` | semantic | Viết lại cho contract mới + probe 5/5 palette |
| `app/globals.css` | semantic | Thêm token `--color-apply-cta*`; sửa `.hrp-btn-apply` block; comment |
| `src/domains/job-board/components/__tests__/apply-cta-tone-soften.static.test.ts` | semantic | Đổi regex/token name |
| `src/domains/job-board/components/landing/featured-job-card.test.ts` | semantic | Cập nhật block AC về CTA "Ứng tuyển" |

Trong đó 4 file (`page.tsx`, `referral-strip.tsx`, `globals-css-theme-scope.test.ts`, `theme-cta-foreground.test.ts`) **KHÔNG phải docs-only** như báo cáo R0 trước đó ghi nhầm — chúng đã chứa thay đổi semantic thật từ R0 round 1. R1 round 2 thêm/sửa ở `app/(portal)/page.tsx` (Hero copy container) + file test mới `src/shared/theme/__tests__/hero-eyebrow-contrast.test.ts` (probe 2-state).

### Changed surface bổ sung R1 round 2 (sẽ commit)

| File | Loại thay đổi | Mô tả ngắn |
|---|---|---|
| `app/(portal)/page.tsx` | semantic (R1) | Hero copy container dùng `heroImage ? 'text-on-primary' : 'text-primary-dark'`; 3 child (eyebrow `<p>`, `<h1>`, body `<p>`) bỏ class text-color cứng |
| `src/shared/theme/__tests__/hero-eyebrow-contrast.test.ts` | mới (T1A) | 2-state contrast assertion (regex + probe 5/5 theme) |
| `docs/tasks/hrp-t1a-theme-apply-cta-hotfix/TASK.md` | docs (v1.2) | Thêm EV-09, DEC-T1A-07, RISK-04, AC-10, In-scope roots |
| `docs/tasks/hrp-t1a-theme-apply-cta-hotfix/HANDOFF.md` | docs (v1.2) | Trung thực semantic delta + R1 fix + limitation state 2 |
| `docs/tasks/hrp-t1a-theme-apply-cta-hotfix/evidence/*` | mới (probe) | `probe-eyebrow.ps1`, `probe-hero-2state.ps1`, `probe-pd-overlay.ps1` |

### Lane escalation

- Không có.

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | PASS | `git diff --check` exit 0; tất cả file thuộc `In-scope roots` (R0+R1); semantic delta đã khai báo trung thực ở §1 |
| API/route boundary | N/A | Không đổi route, không đổi API |
| Auth/permission/data exposure | N/A | UI token + className thuần; không đụng data, auth, RLS |
| Migration/backfill/rollback | N/A | CSS token + className; rollback = revert 2 commit R0 + R1 |
| Concurrency/idempotency | N/A | Static CSS + React render; không có side-effect runtime |
| Test isolation and cleanup | PASS | Test trong scope T1-A; T1C-owned `globals-css-theme-scope.test.ts` chỉ sửa AC-08 assertion về token name, không đụng cấu trúc [data-theme] block; thêm test mới `hero-eyebrow-contrast.test.ts` (T1A-owned) |
| WCAG AA contrast (CTA theme) | PASS | Probe 5/5 theme × 5/5 state (default + hover + focus + disabled + 2-state eyebrow) đều pass ≥ 4.5:1 normal text / ≥ 3:1 UI |
| WCAG AA contrast (Hero state 1) | PASS | `text-primary-dark` trên gradient PC→PF 5/5 ≥ 5.0:1 (R1 + R2 giữ nguyên; R2 bỏ thêm `opacity-90` ở body) |
| WCAG AA contrast (Hero state 2) | PASS (R2) | Trước R1/R2: white trên overlay 55% 2.88-4.16 ở 5 theme; R2 tăng overlay lên `bg-primary-dark/85` → white/overmix(PD, PC/PF, 0.85) đạt 5/5 ≥ 4.95:1 (HRP 4.96-5.03, Ocean 6.72, Emerald 5.93, Violet 8.79, Gold 6.06). Ảnh vẫn hiện qua 15% PC/PF còn lại. |

## 2. Acceptance evidence

Dòng đầu là verify-task. Mỗi command đăng ký một lần bằng `E-xx`; nhiều AC được dùng chung evidence.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `E-00`: `powershell -NoProfile -ExecutionPolicy Bypass -File ".ai-pipeline/scripts/verify-task.ps1" -TaskPath "docs/tasks/hrp-t1a-theme-apply-cta-hotfix/TASK.md"` | `RESULT: PASS` (kỳ vọng 16+ OK, 0 error, 0 warning) | None |
| `AC-01` | `E-01`: `Select-String -Path "app/globals.css" -Pattern "background-color:\s*var\(--color-apply-cta\)"` | match trong block `.hrp-btn-apply {` | None |
| `AC-02` | `E-01`: same | `color: var(--color-on-primary)` | None |
| `AC-03` | `E-02`: PowerShell probe (5/5 palette ≥ 4.5:1) | HRP 6.468 / Ocean 9.647 / Emerald 8.272 / Violet 12.438 / Gold 8.577 | Probe nội bộ (không cần Node) |
| `AC-04` | `E-01`: `background-color: var(--color-apply-cta-dark)` trong hover | match | None |
| `AC-04` | `E-03`: PowerShell probe white on color-mix(PD 82%, #000) | HRP 8.503 / Ocean 11.663 / Emerald 10.320 / Violet 14.295 / Gold 10.618 | Probe nội bộ |
| `AC-05` | `E-01`: `.hrp-btn-apply:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }` | match | None |
| `AC-06` | `E-01`: `.hrp-btn-apply:disabled { background-color: var(--color-surface-container); color: var(--color-on-surface-variant); cursor: not-allowed; }` | match | None |
| `AC-06` | `E-04`: PowerShell probe on-surface-variant #594138 on surface-container #efeeec | 8.093:1 | None |
| `AC-07` | `E-05`: `Select-String` trên 3 file `.tsx` (FeaturedJobCard, JobCard, DetailApplyCta) đều chứa `hrp-btn-apply` | cả 3 file match | None |
| `AC-08` | `E-06`: `--color-apply-cta` alias PD + `--color-primary-cta` hex cũ còn tồn tại; block `.hrp-btn-apply` ref `--color-apply-cta` | match | None |
| `AC-09` | `E-07`: `Select-String -Path "app/(portal)/page.tsx" -Pattern "text-on-primary"` expect ≥1 trong conditional container + `text-secondary-fixed` expect 0 trong Hero section; `Select-String -Path "src/domains/job-board/components/landing/referral-strip.tsx" -Pattern "text-primary-dark"` expect ≥1 + `text-primary-container` expect 0 trong heading | match cả 2 heading token mới + Hero section sạch `text-secondary-fixed` | None |
| `AC-10` | `E-08` + `E-10` (R1 + R2): `rg -n 'heroImage\s*\?\s*.text-on-primary.\s*:\s*.text-primary-dark.' app/(portal)/page.tsx` match conditional; `rg -n 'Cùng tìm kiếm' app/(portal)/page.tsx` kiểm tra eyebrow `<p>` không có `text-on-primary` / `text-secondary-fixed`; `rg -n 'Đang tuyển\|Việc làm theo ca' app/(portal)/page.tsx` kiểm tra body `<p>` không có `opacity-N`; `rg -n 'bg-primary-dark/85' src/domains/job-board/components/landing/hero.tsx` kiểm tra overlay dùng `/85`; `npx vitest run --config vitest.unit.config.ts src/shared/theme/__tests__/hero-eyebrow-contrast.test.ts` (R2 viết lại) assert THỰC SỰ ≥ 4.5:1 cả 2 state × 5 theme × 2 endpoint gradient (PC + PF); state 2 probe white/overmix(PD, PC/PF, 0.85). Kết quả: state 1 PD/PC + PD/PF 5/5 ≥ 5.013; state 2 white/overmix 5/5 ≥ 4.95 | match conditional + eyebrow sạch + body sạch opacity + overlay /85 + probe 5/5 PASS | None |

## 3. Evidence registry

Log ngắn để inline; probe script ở `docs/tasks/hrp-t1a-theme-apply-cta-hotfix/evidence/`.

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-00` | `powershell -NoProfile -ExecutionPolicy Bypass -File ".ai-pipeline/scripts/verify-task.ps1" -TaskPath "docs/tasks/hrp-t1a-theme-apply-cta-hotfix/TASK.md"` | exit 0; `RESULT: PASS` | inline |
| `E-01` | `Select-String -Path "app/globals.css" -Pattern 'background-color:\s*var\(--color-apply-cta\)\|color:\s*var\(--color-on-primary\)\|background-color:\s*var\(--color-apply-cta-dark\)\|--color-apply-cta[^;]*;\|--color-apply-cta-dark[^;]*;\|\.hrp-btn-apply:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-focus-ring\)\|\.hrp-btn-apply:disabled\s*\{[^}]*cursor:\s*not-allowed'` | match đủ 7 token/block | inline |
| `E-02` | PowerShell probe — `relativeLuminance(hex)` theo WCAG 2.x; `contrast(white, PD)` cho 5 palette | HRP 6.468 / Ocean 9.647 / Emerald 8.272 / Violet 12.438 / Gold 8.577 — 5/5 ≥ 4.5:1 | inline + `evidence/probe-eyebrow.ps1` |
| `E-03` | PowerShell probe — `color-mix(PD 82%, #000)` rồi `contrast(white, mix)` | HRP 8.503 / Ocean 11.663 / Emerald 10.320 / Violet 14.295 / Gold 10.618 — 5/5 ≥ 4.5:1 | inline |
| `E-04` | PowerShell probe — `contrast(#594138, #efeeec)` (on-surface-variant / surface-container) | 8.093:1 ≥ 4.5:1 | inline |
| `E-05` | `Select-String` trên 3 file `.tsx` (FeaturedJobCard, JobCard, DetailApplyCta) đều chứa `hrp-btn-apply` | cả 3 file match | inline |
| `E-06` | `Select-String -Path "app/globals.css" -Pattern "--color-apply-cta:var\(--color-primary-dark\)"` + `--color-primary-cta` hex literal còn tồn tại | match | inline |
| `E-07` | `Select-String -Path "app/(portal)/page.tsx" -Pattern "text-on-primary"` expect ≥1 (conditional container); `text-secondary-fixed` expect 0 trong Hero section; `referral-strip.tsx` `text-primary-dark` ≥1, `text-primary-container` =0 trong heading | match cả 4 grep | inline |
| `E-08` (R1) | regex `heroImage\s*\?\s*['"]text-on-primary['"]\s*:\s*['"]text-primary-dark['"]` trên `app/(portal)/page.tsx`; regex kiểm tra 3 child Hero copy sạch `text-on-primary`/`text-secondary-fixed`; probe state 1 = `text-primary-dark` trên `from-primary-container to-primary-fixed` 5/5 ≥ 5.0:1 | match conditional + 3 child sạch + probe 5/5 PASS | `evidence/probe-hero-2state.ps1`, `evidence/probe-pd-overlay.ps1` |
| `E-09` (R1 limitation) | probe state 2: white trên `bg-primary-dark/55` (alpha-composited over PC/PF) chỉ 2.88-4.16; PD trên cùng overlay chỉ 2.16-2.99 — pre-existing issue của overlay, không thuộc hotfix scope | FAIL 5/5 normal text; chỉ violet 4.16 gần pass large text 3:1 | inline (xem §4 Limitation) |
| `E-10` (R2) | probe state 1 R2 (bỏ `opacity-90` ở body): PD/PC + PD/PF 5/5 ≥ 5.013; HRP worst case 4.24 (R1) → 5.013 (R2). Probe state 2 R2 (overlay `/85`): white/overmix(PD, PC/PF, 0.85) 5/5 ≥ 4.95; HRP 4.96-5.03, Ocean 6.72, Emerald 5.93, Violet 8.79, Gold 6.06. Probe cả 2 endpoint gradient (PC + PF). | PASS 5/5 cả 2 state × 2 endpoint | `evidence/probe-state1-gradient.ps1`, `evidence/probe-state2-overlay.ps1` |

### Bảng probe Hero 2-state (R2 — cả 2 state đều PASS)

**State 1 (gradient `from-primary-container to-primary-fixed`, no image) — R2 không dùng opacity:**

| Theme | PC | PF | PD/PC | PD/PF |
|---|---|---|---|---|
| HR Partner | #fde6d8 | #ffdbce | 5.386 | **5.013** |
| Ocean Trust | #d6ebf5 | #d6ebf5 | **7.838** | 7.838 |
| Emerald Growth | #d2ebde | #d2ebde | **6.570** | 6.570 |
| Violet Future | #e1d5f4 | #e1d5f4 | **8.899** | 8.899 |
| Executive Gold | #f0e6c0 | #f0e6c0 | **6.855** | 6.855 |

5/5 ≥ 5.0:1 PASS WCAG AA 4.5:1 (text thường). R2 đã bỏ `opacity-90` ở body, HRP body worst case 4.24 (R1) → 5.013 (R2).

**State 2 (overlay `bg-primary-dark/85` alpha-composited over PC/PF, with image) — R2:**

| Theme | overPC | overPF | white/overPC | white/overPF |
|---|---|---|---|---|
| HR Partner | #b35520 | #b3531f | 4.956 | 5.031 |
| Ocean Trust | #2b6279 | #2b6279 | 6.718 | 6.718 |
| Emerald Growth | #2b7052 | #2b7052 | 5.928 | 5.928 |
| Violet Future | #573a8c | #573a8c | 8.790 | 8.790 |
| Executive Gold | #736124 | #736124 | 6.062 | 6.062 |

White 4.96-8.79 ở 5 theme — 5/5 PASS WCAG AA 4.5:1 normal text. R2 đã tăng overlay từ `/55` (R1) lên `/85` (R2). Ảnh vẫn hiện qua 15% PC/PF còn lại → giữ visual context. Reference HRP alpha sweep: `/55` 2.99 FAIL, `/70` 3.86 FAIL, `/80` 4.60 PASS (sát ngưỡng), `/85` 5.03 PASS (buffer ~0.07), `/90` 5.47 PASS.

### Bảng probe CTA theme (R0)

| Theme | PD hex | white on PD | mix(PD 82%, #000) | white on mix | PD on surface (focus ring) |
|---|---|---|---|---|---|
| HR Partner | #a63b00 | **6.468:1** PASS | #883000 | **8.503:1** PASS | 6.147:1 PASS |
| Ocean Trust | #0d4a63 | **9.647:1** PASS | #0b3d51 | **11.663:1** PASS | 9.097:1 PASS |
| Emerald Growth | #0d5a39 | **8.272:1** PASS | #0b4a2f | **10.320:1** PASS | 7.806:1 PASS |
| Violet Future | #3f1f7a | **12.438:1** PASS | #341964 | **14.295:1** PASS | 11.360:1 PASS |
| Executive Gold | #5d4a08 | **8.577:1** PASS | #4c3d07 | **10.618:1** PASS | 8.132:1 PASS |

5/5 palette, default + hover + focus đều pass ≥ 4.5:1 text / ≥ 3:1 UI.

### Bảng probe Heading CTV (R0)

Heading "Chương trình Cộng tác viên" dùng `text-primary-dark` trên `bg-primary-fixed/20` (#fbf3ef):

| Theme | PC on bg | PD on bg | PD on surface |
|---|---|---|---|
| HR Partner | 1.096:1 FAIL | **5.903:1** PASS | 6.147:1 PASS |
| Ocean Trust | 1.124:1 FAIL | **8.806:1** PASS | 9.097:1 PASS |
| Emerald Growth | 1.149:1 FAIL | **7.551:1** PASS | 7.806:1 PASS |
| Violet Future | 1.276:1 FAIL | **11.353:1** PASS | 11.360:1 PASS |
| Executive Gold | 1.142:1 FAIL | **7.829:1** PASS | 8.132:1 PASS |

PC FAIL 5/5 palette. PD PASS 5/5 ≥ 4.5:1.

## 4. Deviations and blockers

**Deviations:** None ngoài R1 follow-up + R2 follow-up đã document.

**R2 Resolved (T0 review R2 chấp nhận fix):**

1. **State 1 body opacity**: Bỏ `opacity-90` ở body → HRP body 4.24 (FAIL) → 5.013 (PASS) cả 2 đầu gradient. Toàn bộ copy (eyebrow + H1 + body) giờ đạt 5/5 ≥ 4.5:1.
2. **State 2 overlay**: Tăng `bg-primary-dark/55` → `bg-primary-dark/85` → white/overmix(PD, PC/PF, 0.85) 5/5 ≥ 4.95:1 (HRP 4.96-5.03 worst case). Ảnh vẫn hiện qua 15% PC/PF còn lại → giữ visual context.
3. **Test R2**: Viết lại `hero-eyebrow-contrast.test.ts` assert THỰC SỰ ≥ 4.5:1 cả 2 state × 5 theme × 2 endpoint gradient (PC + PF); tính hiệu dụng opacity nếu có; regression guard nếu dev thêm lại `opacity-N` ở body.

**Limitations cần T0/runner lưu ý:**

1. **Body opacity đã bỏ hoàn toàn ở R2**: Nếu designer muốn visual fade cho body, follow-up task riêng. Hiện tại copy rõ ràng 100% opacity.

2. **Node/pnpm không có trong PATH của agent** trong worktree hiện tại — không thể chạy `npx tsc --noEmit` / `npx vitest run` / `pnpm run build` / `node .ai-pipeline/scripts/verify-encoding.mjs`. Tôi verify contract bằng static read (PowerShell + regex trên CSS/TSX) + probe WCAG bằng helper inline. T0 chạy canonical gates ở máy có Node/pnpm — script `verify-task.ps1` + `verify-handoff.ps1` + `verify-encoding.mjs` đều có trong `.ai-pipeline/scripts/` và không phụ thuộc PATH shell.

3. `--color-apply-cta-dark: color-mix(in srgb, var(--color-primary-dark) 82%, #000)` — Tailwind v4 / PostCSS hiện đại hỗ trợ `color-mix()` (CSS Color Module Level 5); nếu trình duyệt/PostCSS processor của repo không support, cần thay bằng 5 hex literal theo theme. T0 verify nhanh bằng `pnpm run build` rồi `grep` `color-mix` trong CSS output.

4. Token cũ `--color-primary-cta*` giữ nguyên (alias ngược) để không vỡ site ngoài CTA scope; nếu T0 muốn dọn, mở thêm task tách.

5. `theme-cta-foreground.test.ts` đã viết lại gần như hoàn toàn (header comment mới, 9 describe, 19 it). Nếu T0 thấy mất tính tương đương với baseline T1B test, có thể ghép lại — nội dung test vẫn khóa cùng contract (default `var(--color-on-primary)`, hover `var(--color-on-primary)`, focus 2px ring, disabled surface-container).

## 5. Final status và Git freeze

### Trạng thái Git trước R1 follow-up (R0 round 1 đã commit)

```
fd84297f fix(t1a-theme-apply-cta-hotfix): R1 follow-up — AC-08 fix, hero eyebrow, CTV heading, cleanup
b4b62d2f docs(t1a-theme-apply-cta-hotfix): align TASK/HANDOFF to gate parsers
7deec448 docs(t1a-theme-apply-cta-hotfix): HANDOFF READY_FOR_REVIEW
a42bb319 feat(t1a-theme-apply-cta-hotfix): CTA Ứng tuyển đổi màu theo theme
5cfbca12 docs(discovery): refresh execution realignment baseline (#135)
```

### Trung thực semantic delta `a42bb319..fd84297f` (4 file semantic thật)

`git diff a42bb319..fd84297f -- app src prisma tests` đã chứa thay đổi semantic ở **4 file** (KHÔNG phải "docs-only"):

1. `app/(portal)/page.tsx` — eyebrow `text-secondary-fixed` → `text-on-primary` (sau R1 sẽ refactor lần 2 thành container conditional)
2. `src/domains/job-board/components/landing/referral-strip.tsx` — heading CTV `text-primary-container` → `text-primary-dark`
3. `src/shared/theme/__tests__/globals-css-theme-scope.test.ts` — AC-08: assertion từ `--color-primary-cta` → `--color-apply-cta` + khóa cả 2 token không bị override trong `[data-theme]`
4. `src/shared/theme/__tests__/theme-cta-foreground.test.ts` — viết lại cho contract mới + probe 5/5 palette

Báo cáo R0 trước đó ghi nhầm là "docs-only, 0 semantic delta" — đã sửa trong HANDOFF v1.2 này.

### R1 follow-up (sẽ commit) — thêm/sửa semantic

- Sửa `app/(portal)/page.tsx`: container className conditional theo `heroImage`
- Mới `src/shared/theme/__tests__/hero-eyebrow-contrast.test.ts`: 2-state assertion
- Update `docs/tasks/.../TASK.md` (v1.2) + `HANDOFF.md` (v1.2)
- Probe scripts ở `docs/tasks/.../evidence/`

### Commit R1 (đã thực hiện — `bdcef0f8` HEAD)

1. `a22fd2b6` — semantic (R1 follow-up — CODE):
   - `app/(portal)/page.tsx`: Hero copy container className dùng conditional `heroImage ? 'text-on-primary' : 'text-primary-dark'` (1 điểm sửa, áp dụng cho cả 3 child: eyebrow `<p>`, `<h1>`, body `<p>`). Bỏ class `text-on-primary` / `text-secondary-fixed` hardcode ở child.
   - `src/shared/theme/__tests__/hero-eyebrow-contrast.test.ts` (mới, T1A-owned): 2-state assertion (regex conditional + probe 5/5 theme).
   - `docs/tasks/.../TASK.md`: spec v1.1 → v1.2. Thêm EV-09, DEC-T1A-07, RISK-04, AC-10, In-scope roots.
   - `docs/tasks/.../HANDOFF.md`: rewrite §1 honest semantic delta, thêm §2 E-08 R1 evidence, thêm §3 probe 2-state, thêm §4 limitation state 2.
   - `docs/tasks/.../evidence/{probe-eyebrow,probe-hero-2state,probe-pd-overlay}.ps1` (mới): WCAG probe scripts.

2. `bdcef0f8` — docs (pin SHA — non-semantic):
   - `docs/tasks/.../HANDOFF.md`: cập nhật Implementation SHA trong §0 Control từ `a22fd2b6` → `bdcef0f8` (= HEAD sau commit pin). Tất cả semantic thay đổi nằm ở `a22fd2b6`.

`git diff a22fd2b6..bdcef0f8 -- app src prisma tests` = empty (chỉ docs thay đổi, không semantic delta mới). HEAD freeze R1 = `bdcef0f89919976d984863d15d1d1e783c55659d`.

### R2 follow-up (sẽ commit) — thêm/sửa semantic

- Sửa `src/domains/job-board/components/landing/hero.tsx`: overlay tăng từ `bg-primary-dark/55` → `bg-primary-dark/85`
- Sửa `app/(portal)/page.tsx`: bỏ `opacity-90` ở body Hero (giữ `text-primary-dark` 100% opacity)
- Viết lại `src/shared/theme/__tests__/hero-eyebrow-contrast.test.ts`: assert THỰC SỰ ≥ 4.5:1 cả 2 state × 5 theme × 2 endpoint (PC + PF), tính hiệu dụng opacity nếu có. 26/26 PASS.
- Update `docs/tasks/.../TASK.md` (v1.3) + `HANDOFF.md` (v1.3)
- Probe scripts mới: `evidence/probe-state1-gradient.ps1` + `evidence/probe-state2-overlay.ps1` (exit 0, 5/5 PASS cả 2)

### Commit R2 (sẽ thực hiện, pin SHA mới)

R2 commit: thêm/sửa semantic 3 file + 2 probe script mới + update docs (v1.3). HEAD freeze mới sẽ được pin sau khi commit.

> Handoff status: `READY_FOR_REVIEW`
