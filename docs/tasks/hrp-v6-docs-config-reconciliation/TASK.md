# TASK — `hrp-v6-docs-config-reconciliation`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-docs-config-reconciliation` |
| Work type | `DOCS+CONFIG` |
| Assurance lane | `LOW` (docs-only + test typing; no production behavior change) |
| Audit mode | `NONE` (per T0: docs/config chỉ LIGHT nếu đổi logic ngoài test typing) |
| Spec version | `v0.2 COMPLETE` |
| Status | `COMPLETE` |
| Planner | `Tier 1` |
| Baseline | `68e184e` (origin/main HEAD) |
| Worktree | `C:\CodeApp\HrP-worktrees\tier1-n-closeout-docs-config` (branch `tier1/n-closeout-docs-config`) |
| Tier 0 directive | Lệnh T0 ngày 15/09: closeout N3 + N1 về trạng thái thật; chuẩn hóa cursor/docs; lane npm test hygiene; evidence root consolidation. Tier 1 KHÔNG tự merge main; KHÔNG apply prod migration; KHÔNG đụng forbidden paths. |
| In-scope roots | `prisma/**`, `src/domains/talent/placement*.ts`, `tests/db/placement-lifecycle-integration.test.ts` + `intake-writer-integration.test.ts`, `vitest.integration-files.ts`, `docs/tasks/hrp-v6-n3-service-model-placement/**`, `docs/tasks/hrp-v6-n1-intake-writer/**` (docs-only), `docs/**`, `.gitignore`, `package.json` (scripts test only), `evidence/` (root consolidation only), `.cursor/`. |
| Forbidden paths | `app/admin/**`, `src/shared/ui/role-guard/**`, `docs/V6/V6_OUTSTANDING_WORK_PLAN.md`, `.ai-pipeline-bak/`. |
| Hygiene branches | Ghi hygiene branch N3 (`hrp_n3_v3`/`hrp_n3_v5`) bằng văn bản trong closeout; KHÔNG tự xóa branch. |
| Required gates | `npx tsc --noEmit` (0 new errors); `npx vitest run --config vitest.unit.config.ts` (no regression); lane `test:integration` chạy ENV_BLOCKED honest report nếu thiếu DB secret. |

> Tier 0 outcome: closeout N3 + N1 về trạng thái thật, xanh Quality CI, chuẩn hóa cursor/docs. N3 chỉ closeout tài liệu (không merge). N1 closeout phần Vercel, giữ smoke ADMIN-authenticated ở OPEN tới khi T0 đưa evidence.

> Tier 0 priority: worktree sạch + verify baseline trước; rồi mở TASK slug này. Closeout N3/N1 trước, W0.3-W0.8 sau, cursor sync cuối.

> Tier 0 risk authority: được push branch riêng `tier1/n-closeout-docs-config`. T0 quyết merge, ưu tiên merge S1 trước.

## 1. Outcome

### 1.1 N3 closeout (docs-only, no code merge)

- `docs/tasks/hrp-v6-n3-service-model-placement/{TASK.md,HANDOFF.md,AUDIT.md}` đã viết đúng trạng thái thật tại `b98e470` (round-4 fix) + `1a1eba4` (audit round 5 verdict PASS).
- Tier 3 audit round 5 PASS đã ghi rõ: 16/16 DB integration PASS trên `hrp_n3_v5` (nhánh mới từ baseline `hrp-live`); branch `tier1/n3-service-model-placement` HEAD `1a1eba4` (pushed → origin).
- `docs/PLANNER_HANDOVER.md` phản ánh: N3 chờ Tier 0/Owner merge `tier1/n3-service-model-placement` → main + apply migration `20260914212136_n3_service_model_placement` lên `hrp-live` (Tier 1 KHÔNG tự làm).
- Hygiene branches N3: ghi rõ `hrp_n3_v3` (round-3 test, Neon branch br-billowing-meadow-azqpi3oo) + `hrp_n3_v5` (round-4 test, Neon branch br-bold-term-az0ej1zd) vẫn còn trong Neon console. Tier 1 KHÔNG tự xóa.

### 1.2 N1 closeout (Vercel part; ADMIN-smoke giữ OPEN)

- `docs/tasks/hrp-v6-n1-intake-writer/{TASK.md,HANDOFF.md,AUDIT.md}` phản ánh:
  - Production rebuild trên Vercel: completed (1 commit `b62f4f1` rebuild thành công).
  - Admin intake smoke flow (ADMIN-authenticated): OPEN, KHÔNG đạt PASS. Không dùng 401 để kết luận PASS.
  - Tier 1 KHÔNG tự cung cấp credential/secret/PII. T0 sẽ đưa evidence cho smoke ADMIN.
- Fix 9 TypeScript errors trong `tests/db/intake-writer-integration.test.ts` (test-only typing, KHÔNG đổi behavior production).

### 1.3 W0.3-W0.8 hygiene

- **W0.3 Status**: PLANNER_HANDOVER.md update status khớp với state thật (N3 + N1 closeout).
- **W0.4 YAML dup key**: rà `*.yml` / `*.yaml` / `package.json` — không tìm thấy duplicate key. PASS.
- **W0.5 -bak**: không có `.bak` ngoài `evidence/**` (chỉ 1 file `docs/tasks/hrp-v5-go-live-18-public-surface-hardening/evidence/s07-page-current.bak` — đã trong evidence, không xóa). PASS.
- **W0.6 roadmap**: docs/V6/V6_OUTSTANDING_WORK_PLAN.md là forbidden; chỉ verify roadmap files khác đều tracked, không có file orphan.
- **W0.7 gitignore**: thêm entry `tsc-*.txt` để tránh tsc output rơi vào repo.
- **W0.8 lane npm test**: xác nhận scripts `test:unit` / `test:integration` / `test:connection` đã phân tách rõ; cập nhật doc về cách chạy đúng lane.

### 1.4 Cursor sync

- `.cursor/rules/hrp.mdc` trỏ đúng `.ai-pipeline/` (đã có sẵn).
- Tier 1 KHÔNG đụng `.ai-pipeline-bak/` (forbidden).

## 2. In-scope / Out-of-scope

### In-scope (được sửa)

| Path | Loại |
|---|---|
| `docs/tasks/hrp-v6-n3-service-model-placement/HANDOFF.md` | closeout status v0.7 — code in main, migration APPLIED_REPORTED, DO_NOT_REAPPLY |
| `docs/tasks/hrp-v6-n1-intake-writer/{TASK.md,HANDOFF.md,AUDIT.md}` | closeout Vercel part; ADMIN smoke OPEN |
| `tests/db/intake-writer-integration.test.ts` | fix 9 TS errors (typing only, no behavior change) |
| `.gitignore` | thêm `tsc-*.txt` |
| `evidence/` (root) | consolidate về `docs/tasks/hrp-v6-n3-service-model-placement/evidence/` |
| `docs/PLANNER_HANDOVER.md` | update status |
| `.cursor/` rules | verify sync với `.ai-pipeline/` |

### Out-of-scope (cấm)

- KHÔNG sửa `app/admin/**`, `src/shared/ui/role-guard/**`, `docs/V6/V6_OUTSTANDING_WORK_PLAN.md`.
- KHÔNG apply/re-apply migration `20260914212136_n3_service_model_placement` lên `hrp-live` (đã GO và applied thì chỉ ghi trạng thái).
- KHÔNG mở TASK migration N2.
- KHÔNG rotate credential, KHÔNG dùng credential/secret/PII vào repo, TASK, evidence, log (chỉ ghi `[REDACTED]`).
- KHÔNG `git add -A` / `git add .`. KHÔNG push main, KHÔNG merge main.
- KHÔNG đụng `.ai-pipeline-bak/`.
- KHÔNG dùng 401 để kết luận smoke ADMIN PASS.

## 3. Plan

### S1 — Closeout N3 + N1 (docs-only)

1. Verify origin/main = `68e184e` (✅ done).
2. Tạo worktree clean từ origin/main (✅ done).
3. Update `docs/PLANNER_HANDOVER.md`: N3 code in main (`68e184e`), migration APPLIED_REPORTED, DO_NOT_REAPPLY; gate `N3_CODE_IN_MAIN_MIGRATION_APPLIED_REPORTED_DO_NOT_REAPPLY`.
4. Update `docs/tasks/hrp-v6-n3-service-model-placement/HANDOFF.md` v0.7 CLOSEOUT:
   - N3 code in main; migration DECIDED/APPLIED_REPORTED; DO_NOT_REAPPLY.
   - Hygiene branches ghi rõ trong văn bản.
   - Bỏ mọi dòng "chờ merge" / "chờ Owner apply migration".
5. Update `docs/tasks/hrp-v6-n1-intake-writer/HANDOFF.md` v0.7 CLOSEOUT:
   - Vercel rebuild PASS tại `68e184e` (GitHub status SUCCESS), không dùng `b62f4f1`.
   - Admin intake smoke OPEN, không dùng 401 kết luận PASS.

### S2 — Fix 9 TS errors + W0.3-W0.8 hygiene

1. Fix `tests/db/intake-writer-integration.test.ts`: cast `first.body` / `second.body` với type assertion cho 9 vị trí (test typing only, không đổi runtime).
2. Verify `npx tsc --noEmit` → 0 errors.
3. W0.7: thêm `tsc-*.txt` vào `.gitignore`.
4. W0.6: verify docs/V6/V6_OUTSTANDING_WORK_PLAN.md tồn tại (forbidden — KHÔNG sửa).
5. Consolidate `evidence/` root: nếu có file orphan, di chuyển về `docs/tasks/hrp-v6-n3-service-model-placement/evidence/`.
6. Run unit gate (`vitest.unit.config.ts`); nếu ENV_BLOCKED thì ghi honest report.

### S3 — Cursor sync + commit + push

1. Verify `.cursor/rules/hrp.mdc` trỏ đúng `.ai-pipeline/`.
2. Commit theo từng nhóm logical (closeout docs; ts-error fix; gitignore; evidence).
3. Push branch `tier1/n-closeout-docs-config` → origin.
4. KHÔNG merge main, KHÔNG apply prod.

## 4. Required gates & how to verify

| Gate | Lệnh | Pass criteria |
|---|---|---|
| typecheck | `npx tsc --noEmit` | 0 errors |
| unit | `npx vitest run --config vitest.unit.config.ts` | no regression |
| integration (optional) | `npx vitest run --config vitest.integration.config.ts` | ENV_BLOCKED honest report nếu thiếu DB secret |
| forbidden paths | `git diff origin/main -- 'app/admin/**' 'src/shared/ui/role-guard/**' 'docs/V6/V6_OUTSTANDING_WORK_PLAN.md' '.ai-pipeline-bak/'` | empty diff |
| hygiene | `grep -r "\.bak$" --include="*.bak"` ngoài `docs/tasks/**/evidence/**` | empty |
| hygiene | `git status` | không `tsc-*.txt` |

## 5. Definition of done

- Branch `tier1/n-closeout-docs-config` push thành công → origin.
- 9 TS errors trong `intake-writer-integration.test.ts` resolved (test-typing only, không đổi behavior).
- `.gitignore` có `tsc-*.txt`.
- N3 + N1 docs phản ánh trạng thái thật:
  - N3: code in main (`68e184e`), migration DECIDED/APPLIED_REPORTED, DO_NOT_REAPPLY.
  - N1: Vercel rebuild PASS (`68e184e`), ADMIN smoke OPEN.
- Hygiene branches `hrp_n3_v3`/`hrp_n3_v5` ghi rõ trong closeout; KHÔNG tự xóa.
- HANDOFF.md v1.0 COMPLETE (audit NONE per T0).
