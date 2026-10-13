# HANDOFF — `hrp-t1a-cta-theme-cascade-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Slug | `hrp-t1a-cta-theme-cascade-hotfix` |
| Status | `READY_FOR_REVIEW` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.0` |
| Audit mode (phải khớp TASK) | `NONE` |
| Assurance lane | `FAST` |
| Baseline | `c0d32c8a29daf2b94325b3c0cef08bb79409f235` (origin/main, post-PR #136) |
| Implementation SHA | `4c84af7e4882b93ec2257653a415313abc7deaf6` |
| Execution round | `1` |
| Current audit round | `0` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `NOT_REQUIRED` |
| Correction batches used | `0` |
| Branch | `codex/t1a-cta-theme-cascade-hotfix` (local, chưa push) |
| Worktree | `D:/CodeApp/HrP-worktrees/t1a-cta-theme-cascade-hotfix` |
| Contract gate | `READY_TO_CODE` (verify-task DRAFT-VALID) |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Next gate | `READY_FOR_REVIEW` |

## 1. Outcome Summary

Tại vòng hotfix trước (`hrp-t1a-theme-apply-cta-hotfix`, đã merge qua PR #136 ở commit `c0d32c8a`), Tier 1 đã thêm alias `--color-apply-cta: var(--color-primary-dark)` ở `:root` để CTA cascade theo theme. Tuy nhiên trong runtime, CTA ở 3 site (FeaturedJobCard trang chủ, JobCard `/viec-lam`, DetailApplyCta `/viec-lam/{slug}`) vẫn hiển thị màu HRP cam ở mọi theme.

**Root cause:** CSS Custom Properties §substitute-a-var pitfall — khi một custom property được khai báo với value là TOÀN BỘ `var()`, tham chiếu bên trong được resolve TẠI THỜI ĐIỂM KHAI BÁO (early resolution) tại scope khai báo (`:root`). Vậy nên `--color-apply-cta` bị "đóng băng" thành giá trị của `--color-primary-dark` tại `:root` (= HRP dark `#a63b00`) và không nhận override từ các `[data-theme=...]` block.

**Fix tại nguồn chung:** `.hrp-btn-apply` bỏ alias trung gian, dùng TRỰC TIẾP `var(--color-primary-dark)` trong property value (default + hover). `var()` reference bên trong property value là LAZY resolution tại scope áp dụng — browser sẽ resolve từ `[data-theme=...]` ancestor. Cả 3 site dùng chung class nên tự đồng bộ theo theme, không cần tạo class riêng.

Kết quả:
- 3 site CTA "Ứng tuyển" hiển thị đúng màu theo theme đang chọn.
- 5/5 palette (HR Partner / Ocean Trust / Emerald Growth / Violet Future / Executive Gold) có contrast white-on-CTA ≥ 4.5:1 (WCAG 2.x AA normal text).
- Hover darker state giữ 4.5:1+ cho cả 5 palette.
- Regression test mới khóa cả 5 scope không được re-introduce alias pitfall.

## 2. Execution Trace

| STEP | Action | Deviation | Result |
|---|---|---|---|
| STEP-01 | Khảo sát 3 site CTA, đọc `app/globals.css`, `src/shared/theme/__tests__/*`, compiled CSS `.next/static/css/3154ad5a4ad92791.css` | None | E-01: 3 files, rule uses var(--color-primary-dark) direct |
| STEP-02 | Diff scope cũ vs mới; tạo worktree từ `origin/main` `c0d32c8a` thành `codex/t1a-cta-theme-cascade-hotfix` | None | git rev-parse HEAD exit 0, branch created |
| STEP-03 | Viết TASK.md v1.0 với A-05 traceability, A-04 status, T-02 9 file:line refs, T-09 V2 draft fields | None | E-08: verify-task.ps1 RESULT DRAFT-VALID |
| STEP-04 | Implement CSS fix tại `.hrp-btn-apply` (default + hover) và cập nhật 4 test files lock contract; thêm regression test `theme-cta-cascade-resolve.test.ts` | None | E-04..E-09 |
| STEP-05 | Chạy typecheck, encoding verify, build, targeted unit tests | None | E-06..E-09 |
| STEP-06 | Chạy full unit suite để check regressions | None | 5382 pass, 28 pre-existing CRLF fail (out of scope) |
| STEP-07 | Viết HANDOFF.md đầy đủ 8 sections theo verify-handoff contract | None | E-10: verify-handoff.ps1 RESULT PASS |
| STEP-08 | Commit implementation 7 files (+373 / -37) tại `4c84af7e4882b93ec2257653a415313abc7deaf6` | None | git rev-parse HEAD exit 0, 7 files changed |
| STEP-09 | Stage HANDOFF.md, re-verify handoff gate, báo cáo Tier 0 | None | E-10 RESULT PASS |

## 3. Acceptance Evidence

| AC | Evidence | Limitation | Result |
| --- | --- | --- | --- |
| — | `powershell -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1a-cta-theme-cascade-hotfix/TASK.md` | None | RESULT: DRAFT-VALID (2 non-blocking warning) |
| AC-01 | `git grep -n 'hrp-btn-apply' app/globals.css` → `background-color: var(--color-primary-dark);` direct ref | None | PASS (E-01) |
| AC-02 | `npx git grep -n 'on-primary'` tại `.hrp-btn-apply` → `color: var(--color-on-primary);` | None | PASS (E-01) |
| AC-03 | WCAG probe `theme-cta-foreground.test.ts`: white on --color-primary-dark 5/5 ≥ 4.5:1 (HRP 6.468 / Ocean 9.647 / Emerald 8.272 / Violet 12.438 / Gold 8.577) | None | PASS (E-02) |
| AC-04 | WCAG probe hover 5/5 ≥ 4.5:1 (HRP 8.503 / Ocean 11.663 / Emerald 10.320 / Violet 14.295 / Gold 10.618) | None | PASS (E-02) |
| AC-05 | WCAG probe focus ring 5/5 ≥ 3:1 (HRP 6.147 / Ocean 9.097 / Emerald 7.806 / Violet 11.360 / Gold 8.132) | None | PASS (E-02) |
| AC-06 | WCAG probe disabled 8.093:1 | None | PASS (E-02) |
| AC-07 | `npx git grep -n 'hrp-btn-apply'` tại 3 source files (FeaturedJobCard, /viec-lam, DetailApplyCta) — tất cả dùng class chung | None | PASS (E-03) |
| AC-08 | `npx node node_modules/vitest/dist/cli.js run --config vitest.unit.config.ts src/shared/theme/__tests__/theme-cta-foreground.test.ts src/shared/theme/__tests__/globals-css-theme-scope.test.ts` → 32 tests pass; regression guard: rule KHÔNG chứa `--color-apply-cta` | None | PASS (E-04) |
| AC-09 | `npx node node_modules/vitest/dist/cli.js run --config vitest.unit.config.ts src/shared/theme/__tests__/globals-css-theme-scope.test.ts` → AC-08/09 alias ở `:root` không override trong theme scope | None | PASS (E-05) |
| AC-10 | `npx node node_modules/vitest/dist/cli.js run --config vitest.unit.config.ts src/shared/theme/__tests__/theme-cta-cascade-resolve.test.ts` → 9 tests pass; 5 theme scope set `--color-primary-dark` đúng hex | None | PASS (E-06) |

## 4. Changed Deliverables

| File | Loại | Change |
|---|---|---|
| `app/globals.css` | M (semantic) | `.hrp-btn-apply` default `var(--color-apply-cta)` → `var(--color-primary-dark)`; hover `var(--color-apply-cta-dark)` → `color-mix(in srgb, var(--color-primary-dark) 82%, #000)`. Comment giải thích pitfall ở `:root` + giữ alias ngược cho backward compat. |
| `src/shared/theme/__tests__/theme-cta-foreground.test.ts` | M (test) | Regex match: `var(--color-apply-cta)` → `var(--color-primary-dark)`; thêm AC-08 regression guard. |
| `src/domains/job-board/components/__tests__/apply-cta-tone-soften.static.test.ts` | M (test) | Regex match cho rule `.hrp-btn-apply` và `:hover` block. |
| `src/domains/job-board/components/landing/featured-job-card.test.ts` | M (test) | AC-23 test CTA dùng `.hrp-btn-apply`. |
| `src/shared/theme/__tests__/globals-css-theme-scope.test.ts` | M (test) | AC-08: rule dùng `var(--color-primary-dark)`; AC-09: alias giữ ở `:root`. |
| `src/shared/theme/__tests__/theme-cta-cascade-resolve.test.ts` | A (test) | Mới: 9 tests regression runtime (rule + 5 theme scope). |
| `docs/tasks/hrp-t1a-cta-theme-cascade-hotfix/TASK.md` | A (doc) | Task contract v1.0. |
| `docs/tasks/hrp-t1a-cta-theme-cascade-hotfix/HANDOFF.md` | A (doc) | File này. |

Implementation SHA `4c84af7e4882b93ec2257653a415313abc7deaf6` commit 7 files: +373 / -37.

## 5. Deviations

Không có deviation so với TASK.

Pre-existing issues ngoài scope (KHÔNG sửa, đã document):

- **PRX-01** (pre-existing, ngoài scope): CRLF line endings trong 17 source `.tsx/.ts` files ở `app/admin/**`, `app/api/staffing/**`, `prisma/migrations/20261004230000_*/migration.test.ts`, `src/domains/staffing/order.service.ts` (khoảng 5,000+ dòng). Gây 28 test fail ở `not.toMatch(/\r\n/)` checks. T1A forbidden paths không bao gồm sửa admin. Owner có thể mở hotfix riêng nếu cần.

## 6. Evidence Index

| ID | Description | Artifact | Command (re-runnable) | Result |
|---|---|---|---|---|
| E-01 | CSS rule source (`.hrp-btn-apply` direct `var(--color-primary-dark)`) | `app/globals.css:556-572` | `git grep -n 'hrp-btn-apply' app/globals.css` | exit 0, 2 lines match |
| E-02 | WCAG contrast probe values (5/5 palette ≥ 4.5:1) | `src/shared/theme/__tests__/theme-cta-foreground.test.ts:computeProbe` | `node node_modules/vitest/dist/cli.js run --config vitest.unit.config.ts src/shared/theme/__tests__/theme-cta-foreground.test.ts` | exit 0, 16 tests pass |
| E-03 | 3 site use class | `featured-job-card.tsx:198`, `app/(jobs)/viec-lam/page.tsx:405`, `detail-apply-cta.tsx:47` | `git grep -n 'hrp-btn-apply' src/domains/job-board/components/landing/featured-job-card.tsx 'app/(jobs)/viec-lam/page.tsx' src/domains/job-board/components/detail-apply-cta.tsx` | exit 0, 3 lines match |
| E-04 | vitest theme-cta-foreground + globals-css-theme-scope | full test output | `node node_modules/vitest/dist/cli.js run --config vitest.unit.config.ts src/shared/theme/__tests__/theme-cta-foreground.test.ts src/shared/theme/__tests__/globals-css-theme-scope.test.ts` | exit 0, 32 tests pass |
| E-05 | vitest globals-css-theme-scope AC-08/09 (alias ở `:root`, no override in theme) | full test output | `node node_modules/vitest/dist/cli.js run --config vitest.unit.config.ts src/shared/theme/__tests__/globals-css-theme-scope.test.ts` | exit 0, all pass |
| E-06 | vitest theme-cta-cascade-resolve (regression runtime, 5 theme scope) | `src/shared/theme/__tests__/theme-cta-cascade-resolve.test.ts` | `node node_modules/vitest/dist/cli.js run --config vitest.unit.config.ts src/shared/theme/__tests__/theme-cta-cascade-resolve.test.ts` | exit 0, 9 tests pass |
| E-07 | tsc --noEmit (typecheck) | terminal output | `node node_modules/typescript/bin/tsc --noEmit` | exit 0, 0 errors |
| E-08 | verify-encoding.mjs (UTF-8 strict) | terminal output | `node .ai-pipeline/scripts/verify-encoding.mjs` | exit 0, PASS, 8 files strict UTF-8 no BOM |
| E-09 | next build (production) | `.next/` artifacts | `node node_modules/next/dist/bin/next build` | exit 0, compiled CSS `.next/static/css/3154ad5a4ad92791.css` contains `.hrp-btn-apply{background-color:var(--color-primary-dark)}` (dynamic ref intact) |
| E-10 | verify-handoff (contract substance gate) | terminal output | `powershell -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-handoff.ps1 -HandoffPath docs/tasks/hrp-t1a-cta-theme-cascade-hotfix/HANDOFF.md -TaskPath docs/tasks/hrp-t1a-cta-theme-cascade-hotfix/TASK.md` | exit 0, RESULT PASS |

## 7. Execution Round History

| Round | Date | Verdict | Notes |
|---|---|---|---|
| 1 | 2026-10-14 | READY_FOR_REVIEW | Implementation PASS; preflight PASS; 28 pre-existing CRLF failures documented but out of scope. |

## 8. Self-review (Audit NONE)

Theo FAST lane matrix, `Audit mode: NONE` chỉ yêu cầu Tier 1 self-review tối đa 3 rủi ro trọng yếu.

1. **R-T1A-01** (Decision: bỏ alias trung gian trong rule) — `DEC-T1A-09`. RISK: có thể vỡ test khác tham chiếu alias. MITIGATION: đã grep toàn repo; chỉ `.hrp-btn-apply` rule + 4 test files reference `--color-apply-cta*`. Đã cập nhật tất cả + thêm regression guard.
2. **R-T1A-02** (Decision: giữ alias ngược ở `:root`) — `DEC-T1A-10`. RISK: dev tương lai dùng alias này tái diễn pitfall. MITIGATION: comment trong source giải thích; test `globals-css-theme-scope.test.ts` AC-08 + `theme-cta-cascade-resolve.test.ts` AC-10 có guard.
3. **R-T1A-03** (Decision: `color-mix()` trực tiếp trong property value) — `DEC-T1A-09` phần 2. RISK: nếu Lightning CSS compile resolve tĩnh `color-mix()` ở compile time, hover vẫn fail cascade. MITIGATION: đã verify build output (E-09) — Lightning CSS giữ dynamic reference trong `var()` substitution. CSS output có cả fallback `#883000` (compile-time resolved) và dynamic `color-mix(in srgb, var(--color-primary-dark) 82%, #000)` (browser resolve runtime).

## 9. Verdict

| Check | Verdict |
|---|---|
| Implementation | PASS (57/57 targeted tests; 0 typecheck errors; 0 encoding errors; build pass) |
| Contract preflight | PASS (verify-task DRAFT-VALID, 2 warning non-blocking) |
| Self-review (3 risks) | PASS (3 risks addressed) |
| Pre-existing failures | Documented (§5 PRX-01); không block |
| Browser test | SKIPPED theo user directive ("Không dùng trình duyệt hoặc tự kiểm soát trình duyệt") |
| Build runtime probe (jsdom) | SKIPPED (jsdom không fully support CSS var lazy cascade; source grep + compiled CSS inspection thay thế) |

**Tier 1 verdict: READY_FOR_REVIEW.** Chưa push, chưa merge vào `main` theo user directive.

## 10. Gates NOT executed (intentional)

| Gate | Reason |
|---|---|
| Browser-side runtime probe | User directive: không dùng browser. Thay bằng source grep + compiled CSS inspection + regression test 5 theme scope. |
| Browser visual verification | User directive + task scope (CSS rule only, không visual). |
| Tier 3 audit | Audit mode NONE theo FAST lane; Tier 1 self-review đã cover 3 risks. |
| Merge / push / deploy | User directive: "không merge, push hoặc deploy". |

---

Handoff status: READY_FOR_REVIEW
