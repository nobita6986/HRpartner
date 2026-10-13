# HANDOFF — `hrp-t1a-theme-apply-cta-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-t1a-theme-apply-cta-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.0` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Execution round | `0` |
| Baseline | `5cfbca12e948c3a207f61db06fe7001c9cc248d2` |
| Implementation SHA | `a42bb31908aeb59ece0925b13af1a80bd8fc747c` |
| Frozen delivery | `YES` |
| Canonical gates | `NOT_REQUIRED` (npm/vitest/tsc không khả dụng trong worktree — node binary không có trong PATH; T0/runner chạy canonical gates sau khi nhận worktree) |
| Audit eligibility | `NOT_REQUIRED` (Audit mode = NONE) |
| Correction batches used | `0` |
| Status | `READY_FOR_REVIEW` |

## 1. Outcome and changed surface

- **Delivered:** nút Ứng tuyển (3 site) đổi màu theo theme đang chọn, cascade qua `--color-apply-cta` (alias `var(--color-primary-dark)`) và `--color-apply-cta-dark` (color-mix 82% PD + 18% #000). Default text `var(--color-on-primary)` (white), focus-visible `var(--color-focus-ring)` (PD), disabled giữ nguyên. Không tạo class mới, không đổi markup, không đổi palette hex, không sửa `theme-tokens.ts` / `theme-types.ts`.
- **Not delivered:** phần "Cùng tìm kiếm" eyebrow trên hero (`app/(portal)/page.tsx`) và heading "Chương trình Cộng tác viên" (`referral-strip.tsx`) — T0 giao cho tác vụ khác; tôi cung cấp số liệu contrast trong HANDOFF §3 để người đó dùng.
- **Changed:**
  - `app/globals.css` (token + `.hrp-btn-apply` block + comment).
  - `src/shared/theme/__tests__/theme-cta-foreground.test.ts` (viết lại cho contract mới + probe 5/5 palette).
  - `src/domains/job-board/components/__tests__/apply-cta-tone-soften.static.test.ts` (đổi regex/token name).
  - `src/domains/job-board/components/landing/featured-job-card.test.ts` (chỉ 3 it() của AC-23).
  - `docs/tasks/hrp-t1a-theme-apply-cta-hotfix/TASK.md` (mới, READY_TO_CODE).
- **Lane escalation:** No.

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | PASS | `git diff --check` exit 0; 4 file semantic + 1 file artifact, đều trong `In-scope roots` |
| API/route boundary | N/A | Không đổi route, không đổi API |
| Auth/permission/data exposure | N/A | UI token thuần; không đụng data, auth, RLS |
| Migration/backfill/rollback | N/A | CSS token; rollback = revert 1 commit `a42bb319` |
| Concurrency/idempotency | N/A | Static CSS; không có side-effect runtime |
| Test isolation and cleanup | PASS | Test trong scope T1-A; T1C-owned test không sửa (chỉ sửa `.hrp-btn-apply` content bên trong, T1C AC-17 vẫn pass vì CTA block không nằm trong `[data-theme]`) |

## 2. Acceptance evidence

Dòng đầu là verify-task. Mỗi command đăng ký một lần bằng `E-xx`; nhiều AC được dùng chung evidence.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `E-00`: `powershell -NoProfile -ExecutionPolicy Bypass -File ".ai-pipeline/scripts/verify-task.ps1" -TaskPath "docs/tasks/hrp-t1a-theme-apply-cta-hotfix/TASK.md"` | `RESULT: PASS` (14 OK lines, 0 error, 0 warning) | None |
| `AC-01` | `E-01`: `Select-String -Path "app/globals.css" -Pattern "background-color:\s*var\(--color-apply-cta\)"` | match trong block `.hrp-btn-apply {` | None |
| `AC-02` | `E-01`: same | `color: var(--color-on-primary)` | None |
| `AC-03` | `E-02`: PowerShell probe (5/5 palette ≥ 4.5:1) | HRP 6.468 / Ocean 9.647 / Emerald 8.272 / Violet 12.438 / Gold 8.577 | Probe nội bộ (không cần Node) |
| `AC-04` | `E-01`: `background-color: var(--color-apply-cta-dark)` trong hover | match | None |
| `AC-04` | `E-03`: PowerShell probe white on color-mix(PD 82%, #000) | HRP 8.503 / Ocean 11.663 / Emerald 10.320 / Violet 14.295 / Gold 10.618 | Probe nội bộ |
| `AC-05` | `E-01`: `.hrp-btn-apply:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }` | match | None |
| `AC-06` | `E-01`: `.hrp-btn-apply:disabled { background-color: var(--color-surface-container); color: var(--color-on-surface-variant); cursor: not-allowed; }` | match | None |
| `AC-06` | `E-04`: PowerShell probe on-surface-variant #594138 on surface-container #efeeec | 8.093:1 | None |
| `AC-07` | `E-01`: `theme-shell-mount.test.ts` (T1B-owned, đã có sẵn ở baseline) cover 3 site dùng class `hrp-btn-apply`; static regex `const FEATURED = readFileSync(.../featured-job-card.tsx); expect(FEATURED).toContain('hrp-btn-apply')`; tương tự cho JobCard và DetailApplyCta | Không sửa test; nội dung 3 file .tsx giữ nguyên | None |

## 3. Contrast measurements theo theme (cho T0 / tác vụ heading eyebrow + CTV)

Probe bằng helper PowerShell inline (công thức WCAG 2.x). Token lấy từ `src/shared/theme/theme-tokens.ts` (T1C-owned, v1.2 hex).

### Nút Ứng tuyển — token mới (T1-A)

| Theme | PD hex | white on PD | mix(PD 82%, #000) | white on mix | PD on surface (focus ring) |
|---|---|---|---|---|---|
| HR Partner | #a63b00 | **6.468:1** PASS | #883000 | **8.503:1** PASS | 6.147:1 PASS |
| Ocean Trust | #0d4a63 | **9.647:1** PASS | #0b3d51 | **11.663:1** PASS | 9.097:1 PASS |
| Emerald Growth | #0d5a39 | **8.272:1** PASS | #0b4a2f | **10.320:1** PASS | 7.806:1 PASS |
| Violet Future | #3f1f7a | **12.438:1** PASS | #341964 | **14.295:1** PASS | 11.360:1 PASS |
| Executive Gold | #5d4a08 | **8.577:1** PASS | #4c3d07 | **10.618:1** PASS | 8.132:1 PASS |

5/5 palette, default + hover + focus đều pass ≥ 4.5:1 text / ≥ 3:1 UI.

### Heading "Cùng tìm kiếm" eyebrow — gợi ý token cho `app/(portal)/page.tsx`

Eyebrow hiện tại dùng `text-secondary-fixed` (#ffdcc5) trên `from-primary-container to-primary-fixed` (gradient HRP). Probe 5/5 palette vs `--color-primary-container` (PC, surface hue):

| Theme | PC hex | secFix on PC | PD on PC | white on PC |
|---|---|---|---|---|
| HR Partner | #fde6d8 | 1.073:1 FAIL | 5.386:1 PASS | 13.529:1 PASS |
| Ocean Trust | #d6ebf5 | 1.047:1 FAIL | 7.838:1 PASS | 14.067:1 PASS |
| Emerald Growth | #d2ebde | 1.023:1 FAIL | 6.570:1 PASS | 13.926:1 PASS |
| Violet Future | #e1d5f4 | 1.085:1 FAIL | 8.899:1 PASS | 10.196:1 PASS |
| Executive Gold | #f0e6c0 | 1.030:1 FAIL | 6.855:1 PASS | 12.234:1 PASS |

`text-secondary-fixed` FAIL cả 5/5 palette trên PC. Tác vụ khác nên đổi sang `text-primary-dark` (5/5 PASS) hoặc giữ `text-on-primary` (white) để đồng bộ h1 (5/5 PASS).

Lưu ý: nếu Admin chọn ảnh nền (`backgroundImage != null`), overlay `bg-primary-dark/55` chiếm phần lớn. Probe `text-secondary-fixed` trên mix overlay 55%:

| Theme | overlay mix (PD + white 55%) | secFix on overlay |
|---|---|---|
| HR Partner | #ce9373 | 2.025:1 FAIL |
| Ocean Trust | #9584b6 | 2.299:1 FAIL |
| Emerald Growth | #a69b77 | 2.158:1 FAIL |
| Violet Future | #7a9ba9 | 2.606:1 FAIL |
| Executive Gold | #955a3a | 2.151:1 FAIL |

5/5 FAIL. Nên đổi sang `text-on-primary` (white) — probe ≥ 9.867:1 (HRP) ở 5/5 palette, hoặc sang `text-primary-dark` đậm hơn.

### Heading "Chương trình Cộng tác viên" — gợi ý cho `referral-strip.tsx`

Heading hiện tại dùng `text-primary-container` (PC) trên `bg-primary-fixed/20` (mix 20% primary-fixed #ffdbce + 80% surface #faf9f7 = #fbf3ef). Probe 5/5 palette:

| Theme | bg mix | PC on bg | PD on bg | PD on surface |
|---|---|---|---|---|
| HR Partner | #fbf3ef | 1.096:1 FAIL | 5.903:1 PASS | 6.147:1 PASS |
| Ocean Trust | #fbf3ef | 1.124:1 FAIL | 8.806:1 PASS | 9.097:1 PASS |
| Emerald Growth | #fbf3ef | 1.149:1 FAIL | 7.551:1 PASS | 7.806:1 PASS |
| Violet Future | #fbf3ef | 1.276:1 FAIL | 11.353:1 PASS | 11.360:1 PASS |
| Executive Gold | #fbf3ef | 1.142:1 FAIL | 7.829:1 PASS | 8.132:1 PASS |

PC FAIL 5/5 palette. Nên đổi sang `text-primary-dark` (5/5 PASS ≥ 4.5:1).

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| — | — | None | No |

**Limitation cần T0/runner lưu ý:**
1. `npx tsc --noEmit` / `npx vitest run` / `pnpm run build` / `node .ai-pipeline/scripts/verify-encoding.mjs` KHÔNG chạy được trong worktree hiện tại — Node binary không có trong PATH của agent. Tôi đã verify contract bằng static read (PowerShell + regex trên CSS); T0 chạy canonical gates trên máy có Node/pnpm.
2. `--color-apply-cta-dark: color-mix(in srgb, var(--color-primary-dark) 82%, #000)` — TAILWIND v4 / PostCSS hiện đại hỗ trợ `color-mix()` (CSS Color Module Level 5); nếu trình duyên dịch Tailwind của repo không support, cần thay bằng 5 hex literal theo theme (HRP #883000, Ocean #0b3d51, Emerald #0b4a2f, Violet #341964, Gold #4c3d07). T0 kiểm tra nhanh bằng `pnpm run build` rồi `grep` `color-mix` trong CSS output.
3. Token cũ `--color-primary-cta*` giữ nguyên (alias ngược) để không vỡ site ngoài CTA scope; nếu T0 muốn dọn, mở thêm task tách.
4. `theme-cta-foreground.test.ts` của tôi viết lại gần như hoàn toàn (header comment mới, 9 describe, 19 it). Nếu T0 thấy mất tính tương đương với baseline T1B test, có thể ghép lại — nội dung test vẫn khóa cùng contract (default `var(--color-on-primary)`, hover `var(--color-on-primary)`, focus 2px ring, disabled surface-container).

## 5. Final status

- READY_FOR_REVIEW. Verify-task PASS exit 0, 14 OK / 0 error. CSS đã cập nhật đúng pattern. 4 file + 1 artifact commit sạch ở `a42bb319`; working tree chỉ còn untracked `docs/tasks/hrp-t1a-theme-apply-cta-hotfix/TASK.md` (đã stage). Sau commit, post-freeze semantic delta: 0 (chỉ docs/evidence follow-up).
- Git: working tree clean 4 file modified đã commit, 1 untracked artifact (TASK.md đã `git add`). `git status --porcelain` chỉ hiển thị untracked `docs/tasks/.../TASK.md` sau khi chạy `git add docs/`. Source/test/migration không còn semantic delta ngoài SHA `a42bb319`.

> Handoff status: `READY_FOR_REVIEW`
