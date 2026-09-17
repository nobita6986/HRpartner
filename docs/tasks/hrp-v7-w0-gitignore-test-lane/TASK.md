# TASK — hrp-v7-w0-gitignore-test-lane

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v7-w0-gitignore-test-lane` |
| Work type | `INFRA` |
| Assurance lane | `STANDARD` |
| Audit mode | `LIGHT` |
| Audit reason | Escalated from FAST/NONE per `verify-task.ps1 T-08`: scope touches `package.json` (control-plane surface). Config-only diff itself has blast radius = 0 (zero consumers of bare `npm test` — EV-03), but LIGHT audit is appropriate for any config touching package layout. Mirrors W0.7 / W0.8 from V6 outstanding work plan (D-5), already chốt (ĐÃ CHỐT). T0-approved merge exception ("Integration skipped — config-only, T0 risk accepted") remains the resilience path if Integration DB unavailable. |
| Spec version | `v1.1` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `a7dc626a21a4284ca58f3dbe06f7944fe176a3db` |
| In-scope roots | `.gitignore, package.json` |
| Forbidden paths | `src/**, prisma/**, app/**, .ai-pipeline/**, scripts/**, docs/**, *.test.ts, *.static.test.ts, any other root script, any CI/workflow file` |
| Required gates | `npm run test:unit, npm run lint, npm run typecheck` |
| Current execution round | `1` |
| Current audit round | `1` |
| Next gate | `/deliver -> /audit -> /resolve` |

---

## 1. Outcome

### 1.1 User-visible outcome
- `.gitignore` ignores root-scope scratch files matching `/temp*.txt` và `/orca*.bat` (leading slash = root-only, no glob expansion into subdirs).
- `package.json` đổi `"test"` lane an toàn về `vitest run --config vitest.unit.config.ts` (alias của `test:unit`), và đổi tên lane cũ sang `test:prod-db-unsafe` để tên tự giác (đã được chốt từ W0.8/V6 plan D-5).
- Không consumer nào phụ thuộc giá trị cũ của `npm test` (CI dùng `test:unit` + `test:integration`; gate `verify-audit.ps1` S-11 còn fail nếu evidence dùng `npx vitest run` trần). Blast radius = 0.

### 1.2 Non-goals
- KHÔNG chạm `src/**`, `prisma/**`, `app/**`, `.ai-pipeline/**`, `scripts/**`, `docs/**`.
- KHÔNG sửa bất kỳ `*.test.ts` hoặc `*.static.test.ts` nào.
- KHÔNG sửa CI workflow `.github/workflows/ci.yml`.
- KHÔNG thay đổi rule, schema, hay API.

---

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `.github/workflows/ci.yml:54` runs `npm run test:unit`; `:86` runs `npm run test:integration`. | Xác nhận CI không gọi bare `npm test` — đổi `test` lane an toàn tuyệt đối không ảnh hưởng required checks. |
| `EV-02` | `docs/V6/V6_OUTSTANDING_WORK_PLAN.md:480` & `:569` (D-5 "ĐÃ CHỐT"): "đổi `"test"` → `vitest run --config vitest.unit.config.ts` … và `"test:prod-db-unsafe": "vitest run"`". | T0 đã chốt config change này từ trước; task chỉ thực thi. |
| `EV-03` | Repo-wide grep `npm\s+test\b` trên `.github/workflows/**`, `scripts/**`, `.ai-pipeline/**/*.md`, `docs/**/*.md`: 0 hit trong CI/scripts; hit chỉ trong `docs/.recycle/**` (deprecated review notes, không phải source of authority) và `docs/V6/V6_OUTSTANDING_WORK_PLAN.md` (xác nhận D-5 đã chốt — line 480/569). | Xác nhận zero consumer của bare `npm test`. |
| `EV-04` | `docs/V6/V6_OUTSTANDING_WORK_PLAN.md:220`: "Lane unit canonical là `npm run test:unit`. Không dùng `npm test`". | Khẳng định canonical lane đã là `test:unit`; change này chỉ alias `test` → `test:unit` cho defensive UX. |

---

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Single Tier 1 owns plan + code; no Tier 2. | `CHOSEN` |
| `DEC-02` | Audit NONE: config-only diff with proven blast radius = 0. | `CHOSEN` |
| `DEC-03` | Keep all existing `.gitignore` entries; only append new patterns with leading slash (root-only). | `CHOSEN` |
| `DEC-04` | Merge exception path theo brief T0: "Integration skipped — config-only, T0 risk accepted" nếu Integration không chạy kịp. Owner ghi log. | `CHOSEN` |

---

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `.gitignore` thêm `/temp*.txt` và `/orca*.bat` (root-scope); KHÔNG xóa entry nào. |
| `RQ-02` | `package.json`: `"test"` → `"vitest run --config vitest.unit.config.ts"`; thêm `"test:prod-db-unsafe": "vitest run"`. |
| `RQ-03` | Toàn bộ các gates cục bộ (`npm run test:unit`, `npm run lint`, `npm run typecheck`) phải xanh. |
| `RQ-04` | Không sửa bất kỳ file nào ngoài `.gitignore` và `package.json`. |
| `RQ-05` | PR config-only; description tham chiếu merge exception của T0 nếu cần. |

### 4.2 Scope boundaries

- **In:** `.gitignore`, `package.json`.
- **Out:** mọi file `src/**`, `prisma/**`, `app/**`, `.ai-pipeline/**`, `scripts/**`, `docs/**`; mọi `*.test.ts`/`*.static.test.ts`; CI workflow.
- **Allowed task artifacts:** `docs/tasks/hrp-v7-w0-gitignore-test-lane/**`.

### 4.3 Domain boundaries

- **Data/state:** N/A — config-only.
- **Permission/security:** N/A — không đổi RLS/auth.
- **Interface/API:** N/A — không đổi API/script công khai; `npm test` private convention, không phải API contract.
- **Migration/rollback:** rollback = `git revert <commit>` hoặc `git checkout <baseline> -- .gitignore package.json`.

---

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `.gitignore` | append `/temp*.txt` + `/orca*.bat` (giữ các entry cũ) | `git status --short` không thấy `temp*.txt`/`orca*.bat` dạng untracked khi chạm thử | Diff ngoài `.gitignore` |
| `STEP-02` | `package.json` | đổi `"test"` → lane an toàn; thêm `"test:prod-db-unsafe"` | `git diff --stat` chỉ có 2 file | Diff ngoài `package.json` |
| `STEP-03` | Gates | `npm run test:unit && npm run lint && npm run typecheck` | tất cả exit 0; `test:unit` ≥ 2281 passed | Bất kỳ gate FAIL → STOP |
| `STEP-04` | Delivery | `git diff --check`, write HANDOFF, run verify-task + verify-handoff, commit, push, mở PR | tất cả gates + HANDOFF PASS | Không |

---

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `.gitignore` chứa `/temp*.txt` và `/orca*.bat`, các entry cũ không bị xóa | `git diff a7dc626..HEAD -- .gitignore` |
| `AC-02` | `package.json` `"test"` = `vitest run --config vitest.unit.config.ts`; có `"test:prod-db-unsafe": "vitest run"` | `git diff a7dc626..HEAD -- package.json` |
| `AC-03` | `npm run test:unit` xanh, ≥ 2281 tests passed, 0 failed (static fences included) | `npm run test:unit` |
| `AC-04` | `npm run lint` exit 0 (575 pre-existing warnings trên file ngoài scope; 0 new warning on changed files) | `npm run lint` + `npx eslint .gitignore package.json` |
| `AC-05` | `npm run typecheck` exit 0 | `npm run typecheck` |
| `AC-06` | Diff confined to 2 files in-scope; không có untracked file ngoài `docs/tasks/<this>/**` chưa add; whitespace clean | `git status --porcelain --untracked-files=normal` + `git diff --check a7dc626..HEAD -- .gitignore package.json` | |
| `AC-07` | Repo-wide grep `npm\s+test\b` on `.github/workflows/**, scripts/**, .ai-pipeline/**/*.md` returns 0 hit (canonical callers); V6 outstanding plan hits are themselves the prescription D-5 (valid context, non-consumer) | `Get-ChildItem -Recurse -Include *.yml,*.ps1,*.mjs,*.cjs,*.js,*.ts .\.github,.\scripts,.\.ai-pipeline \| Select-String 'npm\s+test\b' \| measure-object` (expect 0 in canonical paths) |
| `AC-08` | `verify-task.ps1` PASS, `verify-handoff.ps1` PASS | run cả hai gate |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-06` |
| `RQ-02` | `STEP-02` | `AC-02`, `AC-06` |
| `RQ-03` | `STEP-03` | `AC-03`, `AC-04`, `AC-05` |
| `RQ-04` | `STEP-01`, `STEP-02` | `AC-06` |
| `RQ-05` | `STEP-04` | `AC-08` |

---

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Có caller ngoài ý muốn gọi bare `npm test` → giờ chạy unit lane thay vì full suite | Grep EV-03 confirmed zero consumers in CI/scripts/canonical docs. Rollback = revert commit. |
| `RISK-02` | `/temp*.txt` glob vô tình khớp file tracked sẵn | Grep `git ls-files | grep -E '^(temp.*\.txt|orca.*\.bat)$'` — expect empty. (Will verify before commit.) |

---

## 8. Open Questions

- None.

---

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| `1` | Start implementation | Baseline `a7dc626` (origin/main AFTER PR #11 merge) verified; clean worktree `tier1-w0-gitignore-test-lane` at `C:\CodeApp\HrP-worktrees\tier1-w0-gitignore-test-lane`; grep EV-03 confirmed zero consumers for bare `npm test` (CI uses `test:unit`/`test:integration`); `.gitignore` baseline patterns all preserved; both edits are config-only with blast radius = 0. |
| `2` | Escalate lane FAST/NONE → STANDARD/LIGHT (per T0 ratification) | `verify-task.ps1 T-08` hard-fails FAST on `package.json` scope (control-plane surface). T0 ratified STANDARD/LIGHT via AskQuestion. Implementation diff, gates, and audit-request stance unchanged. Audit round bumped to `1` to await Tier 3 LIGHT re-audit. |

---

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-17` | Initial contract | Config-only micro-task `hrp-v7-w0-gitignore-test-lane` (W0.7/W0.8 combined) per T0 brief |
| `v1.1` | `2026-09-17` | Lane FAST/NONE → STANDARD/LIGHT (T0 ratified) | `verify-task.ps1 T-08` requires STANDARD/CRITICAL when scope touches `package.json` (control-plane); escalation keeps implementation unchanged, adds Tier 3 LIGHT re-audit gate |
