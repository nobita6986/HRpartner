# CURRENT CI COST REPORT

Dựa trên nguyên tắc quy định tại `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §51 (CI/process simplification) và §22 (P0-E).

**Refreshed baseline SHA:** `a87784229e8f06369082cfcd0e36ec63352dadb7` (origin/main HEAD verified 2026-10-13).
**Supersede baseline cũ:** `1059f6669482efac5b7956ef25d43996ca59d515` (2026-09-21, dữ liệu chỉ từ W5 handling assignment UI PR #21).

Báo cáo READ-ONLY. Dữ liệu từ `gh run list` (verified 2026-10-13).

## 1. Cấu trúc Workflow & Trigger (cập nhật)

- **Workflows ở `.github/workflows/`:**
  - `ci.yml` (12 393 bytes) — 2 jobs chạy song song:
    1. `Quality`: schema validate, typecheck, lint, test:unit, next build.
    2. `Integration`: DB tests fail-closed (ephemeral PostgreSQL service container, RLS role, prisma migrate deploy, test:integration).
  - `deploy-vps.yml` (4 177 bytes) — Deploy HRP to VPS.
  - `migrate-vps.yml` (2 229 bytes) — Migrate VPS.
- **Trigger:**
  - `ci.yml`: kích hoạt trên mọi `pull_request` và `push` vào `main`.
  - `deploy-vps.yml`: kích hoạt tự động bởi `workflow_run` từ main push.
  - `migrate-vps.yml`: kích hoạt bởi `workflow_dispatch` hoặc workflow chain (chưa rõ chi tiết).
- **Path filter (short-circuit):** Integration job có bước lọc `path-filter` tự động SKIP (báo success ngay) nếu thay đổi chỉ giới hạn trong `docs/*`, `*.md`, `scratch/*`, v.v. — giảm lãng phí cho PR tài liệu.

## 2. Dữ liệu run hiện tại (verified 2026-10-13 từ `gh run list`)

### Main CI runs (gần đây)

| Run | Workflow | SHA/Trigger | Status | Wall time | Ngày |
|---|---|---|---|---|---|
| `38372807924` | CI (main push) | PR #134 merge → main | success | 3m0s | 2026-10-13T08:56:58Z |
| `38279052656` | CI (main push) | PR #133 merge → main | success | 2m58s | 2026-10-12T16:40:31Z |
| `38255822673` | CI (main push) | PR #132 merge → main | success | 3m32s | 2026-10-12T13:27:28Z |

### VPS Deploy runs (gần đây)

| Run | Workflow | Trigger | Status | Wall time | Ngày |
|---|---|---|---|---|---|
| `38373171674` | Deploy HRP to VPS | main push (PR #134) | success | 4m9s | 2026-10-13T09:00:00Z |
| `38279395808` | Deploy HRP to VPS | main push (PR #133) | success | 3m46s | 2026-10-12T16:43:31Z |
| `38256227331` | Deploy HRP to VPS | main push (PR #132) | success | 3m57s | 2026-10-12T13:31:03Z |

### Main CI `38372807924` chi tiết (sau PR #134)

- **Quality (schema · typecheck · lint · unit · build):** ✓ 2m57s (job ID 115213715737).
- **Integration (DB tests · fail-closed):** ✓ 1m42s (job ID 115213716064).
- **Annotations (deprecation, không fail):**
  - Node.js 20 deprecated trên `actions/checkout@v4`, `actions/setup-node@v4` (đã được force upgrade Node 24). Cần theo dõi.
  - Một số lint warnings (còn 7 warning về unused vars + `any` type) — không block CI.
  - Ubuntu-latest sẽ migrate Ubuntu 26 từ 19/10/2026.

## 3. Thời lượng & Chi phí (cập nhật so với baseline cũ)

| Hạng mục | Baseline cũ (W5 PR #21) | Refreshed (PR #134) |
|---|---|---|
| Integration job | 47s | 1m42s (chậm hơn 2x) |
| Quality job | 2m 12s | 2m57s (chậm hơn 35s) |
| VPS Deploy | (không đo) | 4m9s |
| Total wall time per CI run | ~2.5 phút | 3m0s |

**Quan sát:**
- Integration chậm hơn vì số test tăng (P1 chain có nhiều test hơn) + RLS roles nhiều hơn.
- Quality chậm hơn vì test:unit + build nặng hơn (Next.js build toàn app).
- VPS Deploy 4m9s — chấp nhận được, bao gồm docker pull + prisma migrate + restart service.

## 4. Các điểm tối ưu & Trùng lặp (cập nhật)

- **Bước trùng lặp:** Cả 2 job đều chạy `pnpm install` + `prisma generate`. Đây là trùng lặp bắt buộc để job chạy song song.
- **Lint warnings:** 7 warning chưa sửa:
  - `app/admin/job-openings/[id]/page.test.tsx:32` — `Unexpected any. Specify a different type`
  - `app/admin/job-openings/[id]/job-opening-actions.test.tsx:31` — `capturedFetchInit` unused
  - `.ai-pipeline/scripts/verify-encoding.mjs:4,5` — `relative`, `statSync`, `readdirSync` unused
  - `.ai-pipeline/scripts/verify-encoding-range.mjs:25` — `execFileSync` unused
- **Node 20 deprecation:** cần upgrade actions lên Node 24 (vẫn chạy, không fail).

## 5. Các bước bắt buộc (Không được cắt bỏ)

- **RLS/Database Boundary:** Job Integration hiện cấp quyền RLS (8 role, bao gồm `app_user_writer`) rồi chạy `prisma migrate deploy` và `test:integration`. Đây là chốt chặn duy nhất (Gate) phát hiện lỗi bảo mật RLS (như lỗi `42501` của AFF-03, đã closed 21/09) trước khi merge.
- Việc hạ cấp xuống chỉ mock test (unit test) không đảm bảo tính an toàn cho hạ tầng V7/V8. Phải giữ Integration Fail-Closed.
- **VPS Deploy tự động:** mỗi push main → deploy. Hiện KHÔNG có manual gate; chỉ có CI check trước đó. Production verification phụ thuộc pilot usage chứ không phụ thuộc deploy success.

## 6. Đề xuất rút gọn (cập nhật)

CI hiện ~3 phút mỗi run, VPS deploy ~4 phút. **Không khuyến nghị thay đổi hay rút gọn thêm** tại thời điểm này để tránh vô ý phá vỡ an toàn RLS/Integration Gates.

Tuy nhiên, có thể theo dõi:
- Node 24 deprecation (sau 19/10/2026).
- Ubuntu 26 migration (sau 19/10/2026).
- Lint warnings 7 cái cần sửa nếu Tier 0 muốn CI sạch.

## 7. Delta so với baseline cũ

| Hạng mục | Baseline cũ (2026-09-21) | Refreshed (2026-10-13) |
|---|---|---|
| Số workflows | 1 (`ci.yml`) | 3 (`ci.yml`, `deploy-vps.yml`, `migrate-vps.yml`) |
| Integration job wall time | 47s | 1m42s |
| Quality job wall time | 2m 12s | 2m57s |
| VPS Deploy wall time | không đo | 4m9s |
| Path filter cho docs | có | có (xác nhận) |
| Số PR merge từ baseline | 0 | 60+ |

## Kết luận

- CI hiện tại ổn định, pass 60+ merge liên tiếp.
- VPS deploy tự động chạy thành công; không có lỗi phát hiện.
- Chi phí CI ~3 phút/lần, VPS ~4 phút/lần — chấp nhận được.
- **Mở rộng P2+ sẽ tăng cost**; cần monitor.
- **P0-E02 (Direct Fix class)** và **P0-E03 (Test matrix by task risk)** vẫn INSUFFICIENT_EVIDENCE — chưa có classification rule chính thức.

## Liên kết

- Realignment Plan: [`docs/HRP_EXECUTION_REALIGNMENT_PLAN.md`](../HRP_EXECUTION_REALIGNMENT_PLAN.md) §51, §22 (P0-E)
- Workflows:
  - [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
  - [`.github/workflows/deploy-vps.yml`](../../.github/workflows/deploy-vps.yml)
  - [`.github/workflows/migrate-vps.yml`](../../.github/workflows/migrate-vps.yml)
- Source evidence:
  - `gh run list` (verified 2026-10-13, runs 38xxx series)
  - `gh run view 38372807924` (PR #134 CI)
  - `gh run view 38373171674` (PR #134 VPS deploy — admin rights cần thiết để xem log chi tiết)
- Discovery đồng hành: [`EXECUTION_REALIGNMENT_DISCOVERY.md`](./EXECUTION_REALIGNMENT_DISCOVERY.md), [`BLOCKER_REGISTER.md`](./BLOCKER_REGISTER.md)
