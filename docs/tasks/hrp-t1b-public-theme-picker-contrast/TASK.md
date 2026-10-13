# TASK — `hrp-t1b-public-theme-picker-contrast`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-t1b-public-theme-picker-contrast` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Theme picker là surface công khai, mount ở 2 public shell, đụng 6 theme-sensitive sites + CTA foreground contract. CRITICAL + LIGHT theo lane matrix (đối xứng T1C). |
| Spec version | `v1.0` |
| Status | `ACCEPTED` |
| Planner | `Tier 1` |
| Baseline | `2b07d9de1310fdf08f85c996eeed1df659a5f91f` |
| Baseline note | origin/main @ PR #133 — T1C (theme foundation) |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `src/shared/theme/theme-storage.ts`, `src/shared/theme/theme-picker.tsx`, `src/shared/theme/theme-scope.tsx`, `app/(portal)/layout.tsx`, `app/(jobs)/viec-lam/layout.tsx`, `app/components/GlobalNavbar.tsx`, `app/login/login-form.tsx`, `app/(portal)/ve-chung-toi/page.tsx`, `app/globals.css`, `src/shared/theme/__tests__/*` |
| Forbidden paths | `src/shared/theme/theme-types.ts`, `src/shared/theme/theme-tokens.ts` (T1C-owned, READ-ONLY), `app/admin/**`, `prisma/schema.prisma`, `vercel.json`, `middleware.ts`, `Dockerfile`, status color tokens, dark mode |
| Required gates | `pnpm exec tsc --noEmit`; `pnpm exec eslint` trên surface thay đổi; `npx vitest run` (targeted + full unit); `pnpm run build`; `node .ai-pipeline/scripts/verify-encoding.mjs`; `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1b-public-theme-picker-contrast/TASK.md`; `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -HandoffPath docs/tasks/hrp-t1b-public-theme-picker-contrast/HANDOFF.md`; `git diff --check` |
| Current execution round | `0` |
| Current audit round | `1` |
| Audit verdict | `PASS — accepted by T0` (25/25 AC PASS; 0 blocking findings; canonical audit gate exit 0 with one documented LIGHT-audit SKIP warning) |
| Next gate | `MERGE_PR_134` |

## 1. Outcome

### 1.1 User-visible outcome

- Theme picker xuất hiện **sau nút Đăng ký** trên navbar desktop (`GlobalNavbar.tsx`) và **ở vị trí tương ứng** trong mobile menu. Trigger nhỏ gọn, nền sáng/viền nhẹ, hiển thị **ba chấm màu** (3 swatch đại diện 3 brand token của theme hiện tại). Mở menu → 5 dòng, mỗi dòng có: 3 swatch, tên theme, dấu chọn theme hiện tại.
- 5 theme đúng thứ tự T1C DECISION_REQUEST §3.3: HR Partner, Ocean Trust, Emerald Growth, Violet Future, Executive Gold.
- Chọn theme → lưu `hrp.theme` vào localStorage, áp dụng `data-theme="<key>"` lên wrapper root của `app/(portal)/layout.tsx` và `app/(jobs)/viec-lam/layout.tsx`. Cả hai shell cùng đọc key → chuyển trang giữ theme.
- Mặc định `hrp`. Invalid/stale value hoặc storage unavailable → fallback `hrp`, không crash.
- Theme **KHÔNG ảnh hưởng** `/admin`, `<html>`, status colors, dark mode.
- 6 site theme-sensitive (GlobalNavbar desktop+mobile Đăng ký, login-form Đăng nhập, ve-chung-toi Xem việc làm, `.apply-btn`, `.pub-btn-primary`) chuyển từ `--color-primary` sang `--color-primary-dark` → white-on-PD ≥ 4.5:1 ở 5/5 palette.
- CTA `.hrp-btn-apply` (3 site: landing FeaturedJobCard, /viec-lam JobCard, /viec-lam/{slug} DetailApplyCta): default text `var(--color-on-surface)` trên `--color-primary-cta: #f07f1a`; hover text `var(--color-on-primary)` trên `--color-primary-cta-dark: #c2520a`. Cả 2 state probe ≥ 4.5:1.

### 1.2 Non-goals

- KHÔNG thay đổi `theme-types.ts` / `theme-tokens.ts` (T1C-owned, READ-ONLY).
- KHÔNG override `--color-primary-cta*` token; chỉ dùng lại.
- KHÔNG đổi hex của 5 palette.
- KHÔNG theme hóa status/success/error/warning.
- KHÔNG dark mode.
- KHÔNG inline script, cookie, CSP change.
- KHÔNG gắn `data-theme` lên `<html>` hay admin.
- KHÔNG sửa schema, migration, API, dependency.

### 1.3 Traceability matrix (RQ → STEP → AC)

| RQ | STEP | AC |
|---|---|---|
| RQ-01 | STEP-01, STEP-02 | AC-01, AC-02 |
| RQ-02 | STEP-03 | AC-03, AC-04, AC-05, AC-06, AC-07 |
| RQ-03 | STEP-02 | AC-08, AC-09, AC-10, AC-11, AC-12, AC-13 |
| RQ-04 | STEP-04 | AC-14, AC-15 |
| RQ-05 | STEP-05 | AC-16, AC-17, AC-18 |
| RQ-06 | STEP-06 | AC-19, AC-20 |
| RQ-07 | STEP-07, STEP-08, STEP-09, STEP-10, STEP-11, STEP-12 | AC-21, AC-22, AC-23, AC-24 |
| RQ-09 | STEP-13 (out-of-scope guard) | AC-25 |

## 2. Evidence

| ID | Source | Status |
|---|---|---|
| E-01 | Targeted `npx vitest run --config vitest.unit.config.ts 'src/shared/theme'` | 132/132 pass |
| E-02 | `pnpm exec tsc --noEmit` | 0 errors |
| E-03 | `pnpm exec eslint` trên 16 file surface | 0 errors, 2 warnings pre-existing (GlobalNavbar `mobileOpen` unused) |
| E-04 | Full `npx vitest run --config vitest.unit.config.ts` | 5366/5366 pass, 9 skipped, 0 fail |
| E-05 | `pnpm run build` | exit 0, route list đầy đủ |
| E-06 | `node .ai-pipeline/scripts/verify-encoding.mjs` | PASS 17/17 file UTF-8 no-BOM |
| E-07 | `pwsh .ai-pipeline/scripts/verify-task.ps1` | PASS |
| E-08 | `pwsh .ai-pipeline/scripts/verify-handoff.ps1` | PASS (sau khi viết HANDOFF.md) |
| E-09 | `git diff --check` | exit 0 |
| E-10 | Contrast probe (HRP 6.468 / Ocean 9.647 / Emerald 8.272 / Violet 12.438 / Executive 8.577) | 5/5 ≥ 4.5:1 |
| E-11 | CTA foreground probe (default 7.4:1, hover 7.0:1) | 2/2 ≥ 4.5:1 |

## 3. Decisions

| ID | Quyết định | Nguồn |
|---|---|---|
| DEC-T1B-01 | CTA default = `var(--color-on-surface)`; hover = `var(--color-on-primary)` trên `--color-primary-cta-dark` | User chọn A, 2026-10-12 |
| DEC-T1B-02 | Worktree cũ giữ nguyên; tạo `HrP-t1b-public-theme-picker-contrast` từ `origin/main @ 2b07d9de` | User chọn C, 2026-10-12 |
| DEC-T1B-03 | Đọc T1C foundation trực tiếp từ repo (không đính snapshot) | User chọn B, 2026-10-12 |
| DEC-T1B-04 | ThemeScope mount ở 2 public shell root `<div>`, KHÔNG ở `<html>`, KHÔNG ở admin | T1C DEC-04, RQ-02 |
| DEC-T1B-05 | 6 site theme-sensitive migrate từ `--color-primary` → `--color-primary-dark` | RQ-04 |
| DEC-T1B-06 | CTA `.hrp-btn-apply` default = `var(--color-on-surface)`, hover = `var(--color-on-primary)`, focus = ring, disabled = surface-variant | RQ-05 |
| DEC-T1B-07 | T1C guard AC-09 cập nhật: `.apply-btn` + `.pub-btn-primary` dùng `var(--color-primary-dark)` | RQ-06 (T1C documented "T1B sẽ migrate") |
| DEC-T1B-08 | T1C guard `PROTECTED_SHA` cập nhật: `b000fb06...` → `5e32595f...` (chỉ comment mở rộng trong vùng protected) | RQ-04, RQ-05 |

## 4. Contract

| Field | Value |
|---|---|
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| Open questions | NONE — all 3 user selections A/C/B closed 2026-10-12 |

## 5. Execution Plan

Thực hiện theo thứ tự gates (1→9). Mỗi gate chạy tuần tự; gate sau chỉ chạy nếu gate trước PASS.

| # | Gate | Lệnh | Mục đích | Thời gian dự kiến |
|---|---|---|---|---|
| 1 | Targeted tests | `npx vitest run --config vitest.unit.config.ts 'src/shared/theme'` | Verify T1C + T1B theme tests pass | ~5s |
| 2 | Typecheck | `pnpm exec tsc --noEmit` | 0 type errors | ~30s |
| 3 | Lint (changed surface) | `pnpm exec eslint` (16 file) | 0 errors (warnings OK nếu pre-existing) | ~10s |
| 4 | Full unit suite | `npx vitest run --config vitest.unit.config.ts` | 0 fail ở 5366 tests | ~130s |
| 5 | Build | `pnpm run build` | Next.js build OK, route list đầy đủ | ~90s |
| 6 | Encoding | `node .ai-pipeline/scripts/verify-encoding.mjs` | UTF-8 NO BOM cho 17 file mới | ~5s |
| 7 | Task contract | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1b-public-theme-picker-contrast/TASK.md` | Tier 1 preflight PASS | ~5s |
| 8 | Handoff contract | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -HandoffPath docs/tasks/hrp-t1b-public-theme-picker-contrast/HANDOFF.md` | Tier 1 closeout PASS (sau khi viết HANDOFF.md) | ~5s |
| 9 | Whitespace | `git diff --check` | 0 whitespace warnings | ~3s |

**Rollback**: Nếu gate 4 (full unit) fail do PR #132 còn sót, sửa guard tương ứng, KHÔNG revert code đã pass gate 1-3.

## 6. Acceptance

Định nghĩa DONE khi:

- [x] Gate 1: 132/132 theme tests pass (74 T1C + 58 T1B mới)
- [x] Gate 2: TypeScript `--noEmit` 0 errors
- [x] Gate 3: ESLint 0 errors trên 16 file surface (2 warnings pre-existing ở GlobalNavbar)
- [x] Gate 4: Full unit suite 5366/5366 pass, 9 skipped, 0 fail
- [x] Gate 5: `pnpm run build` exit 0
- [x] Gate 6: Encoding PASS 17/17 file
- [x] Gate 7: `verify-task.ps1` RESULT: PASS
- [x] Gate 8: `verify-handoff.ps1` RESULT: PASS
- [x] Gate 9: `git diff --check` exit 0
- [x] Contrast probe: 5/5 palette white-on-PD ≥ 4.5:1 (HRP 6.468, Ocean 9.647, Emerald 8.272, Violet 12.438, Executive 8.577)
- [x] CTA foreground probe: default `#f07f1a` + `var(--color-on-surface)` ≥ 4.5:1; hover `#c2520a` + `var(--color-on-primary)` ≥ 4.5:1
- [x] ThemeScope mount ở (portal) + (jobs)/viec-lam; KHÔNG mount ở admin; KHÔNG trên `<html>`
- [x] ThemePicker render 2× trong GlobalNavbar (desktop + mobile)

## 7. Risk

| Risk | Impact | Mitigation |
|---|---|---|
| T1B code đụng 6 site theme-sensitive — nhưng contract của T1C `globals-css-theme-scope.test.ts` AC-09 lock `--color-primary` | T1C guard fail khi T1B migrate. | T1B cập nhật AC-09 (đã làm, RQ-06) — đây là dependency T1C đã document "T1B sẽ migrate" trong test comment |
| `.hrp-btn-apply` test cũ (PR #132) lock contract sai (white-on-CTA chỉ ~3:1) | Full unit fail | T1B sửa contract: default `var(--color-on-surface)`, hover `var(--color-on-primary)`. Test cập nhật. Documented trong HANDOFF |
| `public-ui-premium.static.test.ts` SHA-256 hash vùng 189-360 baseline thay đổi do T1B thêm comment | Test fail | T1B cập nhật hash expected (`b000fb06...` → `5e32595f...`). Documented trong HANDOFF. Không thay đổi content thực, chỉ comment mở rộng |
| ThemePicker SSR không tương thích với hydration nếu storage khác default | Layout shift / flash | ThemeScope default ở SSR = `hrp`, sau mount mới đọc localStorage. Flash 1 lần chấp nhận theo T1C DEC-06 |
| Worktree tách riêng nhưng chưa có `.codegraph/` | Codegraph không query được | Tôi dùng `Glob/Grep/Read` thay thế (read-first investigation đã đủ) |

## 8. Open Questions

- **None** — 0 open questions. Tất cả DEC-T1B-01/02/03 đã được user chốt ngày 2026-10-12 (A/C/B).
- **No gap** — không có câu hỏi nào chưa được giải quyết.
- **Không có** open question nào trong TASK này.

Bảng decision log chi tiết:

| ID | Câu hỏi | Quyết định | Ngày | Trạng thái |
|---|---|---|---|---|
| DEC-T1B-01 | CTA default foreground | **A**: `var(--color-on-surface)` trên `--color-primary-cta`; hover `var(--color-on-primary)` trên `--color-primary-cta-dark`. Probe cả 2 ≥ 4.5:1 | 2026-10-12 | **CLOSED** |
| DEC-T1B-02 | Worktree cũ (HrP-t1b-baseline, HrP-t2-apply-cta-tone) | **C**: giữ nguyên, tạo worktree mới từ `origin/main @ 2b07d9de` | 2026-10-12 | **CLOSED** |
| DEC-T1B-03 | Đính snapshot T1C foundation | **B**: không đính snapshot, đọc trực tiếp T1C TASK/HANDOFF từ repo | 2026-10-12 | **CLOSED** |

## 9. Planner Resolution

- **Planner**: Tier 1 (Tier 1 chỉ thực hiện, không yêu cầu Tier 2 plan review vì scope thuộc critical lane đã được T1C foundation lock).
- **Self-resolution đã làm**:
  - Q1 (CTA foreground): probe ≥ 4.5:1 ở 2 state (DEC-T1B-01).
  - Q2 (worktree): tạo mới từ `2b07d9de` (DEC-T1B-02).
  - Q3 (snapshot): đọc canonical source từ repo (DEC-T1B-03).
- **Audit round 1 resolution**: T0 chấp nhận verdict `PASS` tại audit target `9e969450b785fc917d0a5cacaa7d2552f95a5be5`; 25/25 AC PASS, không có P0/P1/P2, F-1/F-2 đã đóng bằng docs-only correction và F-3 là informational đã được ghi nhận. Không mở correction batch.
- **Open issues**: KHÔNG.

## 10. Revision Log

| Round | Ngày | Tier | Action | Result |
|---|---|---|---|---|
| 0 | 2026-10-13 | T1 | Author TASK.md v1.0 | READY_FOR_EXECUTION |
| 0 | 2026-10-13 | T1 | Implementation: theme-storage, theme-scope, theme-picker, 6 site migrate, .hrp-btn-apply fix, 6 T1B test mới, update 2 T1C guard | 132/132 theme tests + 5366/5366 full unit pass |
| 0 | 2026-10-13 | T1 | Gates 1-9 all pass (encoding, typecheck, lint, build, unit, task contract) | Awaiting HANDOFF + push + PR |
| 1 | 2026-10-13 | T0/T1 | Adopt Tier 3 LIGHT audit artifact; ghi Planner Resolution, audit round 1 và verdict PASS | ACCEPTED — ready to merge PR #134 |
