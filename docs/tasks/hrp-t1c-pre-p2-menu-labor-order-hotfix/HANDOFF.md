# HANDOFF — `t1c-pre-p2-menu-labor-order-hotfix`

## 0. Resolution

- **Spec**: `TASK.md` v1.0
- **Implementation SHA**: `1eeb5e6e` (13 files: +709 / −142)
- **Baseline**: `7f570412` (origin/main @ PR #115 merge)
- **Branch**: `codex/t1c-pre-p2-menu-labor-order-hotfix`
- **Lane / Audit**: FAST / NONE / V2_FAST_FREEZE — **Correction budget: 0**

## 1. Decisions (DEC-07..24)

| ID | Decision | Status |
|---|---|---|
| DEC-07 | Sidebar `Hồ sơ tiếp nhận` → `Hồ sơ ứng viên` | DONE |
| DEC-08 | Sidebar reorder: `Hồ sơ ứng viên` TRƯỚC `Người lao động` | DONE |
| DEC-09 | Section header `NGƯỜI LAO ĐỘNG` → `QUẢN LÝ LAO ĐỘNG` | DONE |
| DEC-10..18 | Bounded copy sweep 8 surface canonical | DONE |
| DEC-19 | Roles ['ADMIN', 'HR_STAFF', 'HR_MANAGER'] mirror cả 2 entries | DONE |
| DEC-20 | active-nav-helper logic giữ nguyên (PR #112) | DONE |
| DEC-21..24 | Test fence + boundary: 0 schema / 0 rebase | DONE |

## 2. Business boundary (DEC-01..06, KHÔNG mở P1-F)

- `DEC-01`: Worker creation thuộc task nghiệp vụ P1-F completion/correction.
- `DEC-02`: Chỉ tạo/liên kết Worker theo outcome được phê duyệt, đặc biệt `HRP_MANAGED`.
- `DEC-03`: `CLIENT_MANAGED` KHÔNG tự động tạo Worker.
- `DEC-04`: `LaborProfile` là định danh con người lâu dài, KHÔNG bị Worker thay thế.
- `DEC-05`: KHÔNG mở task P1-F trong vòng này.

## 3. Gate evidence

| Gate | Result |
|---|---|
| Targeted vitest | **7 files / 160 tests PASS** |
| Full unit vitest | **305/305 files / 4943/4943 tests PASS** (9 skipped) |
| Typecheck | **0 errors** |
| Lint | **0 errors** (982 pre-existing warnings, none on changed files) |
| Build | **Compiled successfully in 22.1s** (Next.js) |
| verify-encoding | **12/12 files PASS** (UTF-8 NO-BOM, LF-only) |
| git diff --check | **clean** |
| Forbidden paths | **0 touch** (prisma / auth / api-workers / conversion / placement) |

## 4. Acceptance

| AC | Pass |
|---|---|
| AC-01..02 | Sidebar order + section label |
| AC-03..05 | List page h1 + metadata + CTA + empty state |
| AC-06..08 | Detail breadcrumb + metadata + banner body |
| AC-09 | Fake `Chuyển thành người lao động` button REMOVED + static note ADDED |
| AC-10 | No operator-facing `Hồ sơ tiếp nhận` |
| AC-11 | Form error copy `Hồ sơ ứng viên` |
| AC-12..13 | Roles mirror + active-nav per route (PR #112) |
| AC-14..16 | URLs unchanged + 0 rebase + full gates |

## 5. PR / CI

- Push → mở PR → chờ CI 4/4 GREEN → **DỪNG trước merge** (T0 directive).
- Title: `fix(t1c-pre-p2): Hồ sơ ứng viên → Người lao động (menu reorder + bounded copy sweep + remove fake button)`
- Forward-only — không squash, không force-push sau review. Rollback = `git revert 1eeb5e6e`.