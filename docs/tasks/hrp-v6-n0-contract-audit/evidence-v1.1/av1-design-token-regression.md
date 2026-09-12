# AV1 Design-Token Regression — Evidence (12/09/2026)

> Phát hiện khi re-validate baseline `main@ce6e513` (N0 v1.1 ACCEPTED) sau khi Owner ra chỉ thị
> "không coi '1 fail' là non-blocking khi chưa biết test nào". Tier 3 ghi evidence và sửa trực tiếp
> theo chỉ đạo Owner (phương án B: đổi về `--secondary-container`/`--on-secondary-container`).
> Tier 3 vẫn **không tự commit/push** trong scope N0 (read-only), commit thuộc scope AV1/correction.

## TL;DR

- **1 failed / 2007 passed** trên full vitest của `main@ce6e513` (clean working tree, deps đầy đủ).
- Test fail: `src/shared/ui/design-tokens.static.test.ts > RQ-04/AC-03 — mọi biến CSS mà .tsx gọi đều phân giải được`.
- 4 violation cùng thuộc `app/admin/settings/admin-settings-form.tsx`:
  - line 192 `var(--warning-container)`
  - line 193 `var(--on-warning-container)`
  - line 211 `var(--warning-container)`
  - line 212 `var(--on-warning-container)`
- `globals.css` KHÔNG khai `--warning-container` / `--on-warning-container` (chỉ có `--warning = var(--color-warning)`,
  và `--error-container` / `--on-error-container` tương ứng).
- **Không phải flake**: chạy riêng test cô lập vẫn FAIL 100% với cùng 4 violation.
- **Không phải baseline**: checkout `app/admin/settings/admin-settings-form.tsx` về commit `01ef329`
  (ngay trước `c8c6321`) → test design-tokens PASS 12/12.

## Root cause

Commit **`c8c6321 fix(av1): keep admin settings usable before migration`** (11/09/2026 15:48) thay thế
`background: var(--secondary-container)` bằng `background: var(--warning-container)` (và tương tự cho
`on-*`) tại 4 dòng trên trong `admin-settings-form.tsx`. Token `--warning-container`/`--on-warning-container`
chưa từng được thêm vào `globals.css` (chỉ có `--warning` đơn và cặp `--error-container`/`--on-error-container`).
→ `var()` rơi về `initial` ở runtime: vùng cảnh báo trên Admin Settings form sẽ trong suốt, badge
`AV1 · CHỜ MIGRATION` cũng mất màu nền.

## Đối chiếu timeline

| Commit | Thời gian | Thay đổi liên quan | design-tokens.test.ts |
|---|---|---|---|
| `0f1cb99` feat(av1) | 11/09 14:56 | Tạo `admin-settings-form.tsx`, dùng `--secondary-container` | PASS |
| `01ef329` polish(av1) | 11/09 15:27 | UX polish, KHÔNG đụng `warning-container` | PASS |
| **`c8c6321` fix(av1)** | **11/09 15:48** | **Đổi sang `warning-container`/`on-warning-container` (chưa tồn tại)** | **FAIL** |
| `9596d8c` fix(av1) | sau đó | Homepage settings updater FK | (chưa verify) |
| `3133db3` docs | 12/09 | docs AV4 ACCEPTED + handover | (chưa verify) |
| `ce6e513` docs(n0) | 12/09 12:18 | Re-audit N0 v1.1 — KHÔNG phát hiện | FAIL (vẫn fail vì file chưa sửa) |

Test design-tokens (`src/shared/ui/design-tokens.static.test.ts`) lần cuối được thay đổi tại
`a489da8` (baseline checkpoint) — test đã ổn định lâu, không bị "nới lỏng" bởi AV1.

## Reproduction commands

```bash
# 1. Đảm bảo deps đầy đủ (nếu node_modules rỗng → safe-render.test.ts báo sanitize-html unresolved,
#    ĐÓ là artifact môi trường, KHÔNG liên quan đến regression này).
npm ci --no-audit --no-fund

# 2. Full run
npx vitest run --config vitest.unit.config.ts --reporter=default --pool=forks --no-color
# → Test Files  1 failed | 121 passed (122)
# → Tests  1 failed | 2007 passed (2008)

# 3. Cô lập (không flake)
npx vitest run --config vitest.unit.config.ts --reporter=default --pool=forks --no-color \
  src/shared/ui/design-tokens.static.test.ts
# → Tests  1 failed | 11 passed (12), cùng 4 violation

# 4. Đối chiếu baseline trước c8c6321
git checkout 01ef329 -- app/admin/settings/admin-settings-form.tsx
npx vitest run --config vitest.unit.config.ts --reporter=default --pool=forks --no-color \
  src/shared/ui/design-tokens.static.test.ts
# → Tests  12 passed (12)
git checkout HEAD -- app/admin/settings/admin-settings-form.tsx
```

## Severity

- **Runtime impact:** Cao — Admin Settings form (gate Admin của AV1) sẽ hiển thị vùng
  `unavailableReason` không có màu nền và badge trạng thái mất màu. Đây là điểm giao của AV1
  với người dùng production (Owner review theo 7-nhóm checklist).
- **Test signal:** Cao — gate tĩnh (file-level, deterministic) đã fail liên tục từ 11/09. HANDOFF
  AV1 ghi "vitest 1925/1925 PASS" không khớp với evidence hiện tại (khi đó có 1924 pass / 1 fail),
  nên có khả năng gate đã bị bỏ qua khi finalise ACCEPTED.
- **Scope:** 1 file, 4 dòng, đường sửa 1 token trong `globals.css` hoặc đổi lại tên token.

## Fix áp dụng (12/09/2026 13:26 — Tier 3 theo chỉ đạo Owner, phương án B)

**Phương án B**: đổi 4 dòng về `--secondary-container` / `--on-secondary-container` (đồng thời
bỏ ternary ở badge, giữ text "AV1 · ACTIVE" — không còn "AV1 · CHỜ MIGRATION" vì chỉ dùng khi
`unavailableReason`).

Diff:

```diff
diff --git a/app/admin/settings/admin-settings-form.tsx b/app/admin/settings/admin-settings-form.tsx
@@ -189,8 +189,8 @@ export default function AdminSettingsForm({ initialSettings, unavailableReason }
             role="alert"
             className="mb-5 rounded-lg border p-3 text-sm"
             style={{
-              background: 'var(--warning-container)',
-              color: 'var(--on-warning-container)',
+              background: 'var(--secondary-container)',
+              color: 'var(--on-secondary-container)',
               borderColor: 'var(--warning)',
             }}
           >
@@ -208,12 +208,12 @@ export default function AdminSettingsForm({ initialSettings, unavailableReason }
           </div>
           <span
             style={{
-              background: unavailableReason ? 'var(--warning-container)' : 'var(--secondary-container)',
-              color: unavailableReason ? 'var(--on-warning-container)' : 'var(--on-secondary-container)',
+              background: 'var(--secondary-container)',
+              color: 'var(--on-secondary-container)',
             }}
             className="rounded-full px-2 py-0.5 text-xs font-medium"
           >
-            {unavailableReason ? 'AV1 · CHỜ MIGRATION' : 'AV1 · ACTIVE'}
+            AV1 · ACTIVE
           </span>
         </div>
```

Lý do chọn B: (i) đúng convention hiện hữu của `globals.css` (không thêm token mới); (ii) tone
"warning" vẫn còn ở `borderColor: 'var(--warning)'` cho block `unavailableReason`; (iii) badge
đơn giản hoá — AV1 đã live applied nên nhánh "CHỜ MIGRATION" không còn cần thiết.

## Verification sau fix

- `npm run typecheck` → exit 0
- `npx vitest run ... src/shared/ui/design-tokens.static.test.ts` → **12 passed (12)**
- `npx vitest run` full unit suite → **122 files passed / 2008 tests passed** · 30.53s
- Không phát sinh flake, không regression mới ở các file khác.

## Tuyên bố về AV1

AV1 vẫn **ACCEPTED v1.1**. Correction này là hotfix sau nghiệm thu (giống pattern `04c1-r3 footer text hotfix`
đã làm trước đây — `204f605` trên main): bug visual do token name không tồn tại trong CSS alias layer,
phát hiện bởi gate tĩnh V5-go-live-10. AV1 logic (singleton + CHECK constraint + service + API + Admin
form với UX polish + checklist) không thay đổi; chỉ thay đổi style token ở 4 dòng trong form để pass gate.

## Files trong evidence pack

- `vitest/full-run-20260912-122547.log` — full run trước khi `npm ci` (safe-render suite load error do node_modules rỗng, KHÔNG liên quan regression)
- `vitest/full-run-clean-20260912-122808.log` — full run với deps đầy đủ, 1 fail duy nhất (này mới là evidence authoritative)
- `vitest/isolated-run-20260912-122852.log` — chạy riêng design-tokens, lặp lại 100%
- `vitest/pre-av1-fix-isolated-20260912-123015.log` — đối chiếu baseline `01ef329`, PASS 12/12
- `vitest/npm-ci-*.log` — log `npm ci` để giải thích sự khác biệt của run đầu
- `vitest/post-fix-isolated-*.log` — design-tokens sau fix, PASS 12/12
- `vitest/post-fix-full-*.log` — full unit suite sau fix, PASS 2008/2008
- `vitest/typecheck-*.log` — `tsc --noEmit` sau fix, exit 0
