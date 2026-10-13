# CURRENT CI COST REPORT

Dựa trên [`docs/HRP_EXECUTION_REALIGNMENT_PLAN.md`](../../../docs/HRP_EXECUTION_REALIGNMENT_PLAN.md) §52 (CI Cost Audit) và §22 (P0-E).

**Refreshed baseline SHA:** `a87784229e8f06369082cfcd0e36ec63352dadb7` (origin/main HEAD verified 2026-10-13).
**Supersede baseline cũ:** `1059f6669482efac5b7956ef25d43996ca59d515` (2026-09-21).

Báo cáo READ-ONLY. Mỗi claim phải có exact log/source evidence hoặc ghi `INSUFFICIENT_EVIDENCE`.

## 1. Cấu trúc Workflow & Trigger

- **Workflows ở [`../../.github/workflows/`](../../../.github/workflows/):**
  - `ci.yml` (12 393 bytes) — 2 jobs chạy song song:
    1. `Quality`: schema validate, typecheck, lint, test:unit, next build.
    2. `Integration`: DB tests fail-closed (ephemeral PostgreSQL service container, RLS role, prisma migrate deploy, test:integration).
  - `deploy-vps.yml` (4 177 bytes) — workflow name `Deploy HRP to VPS`.
  - `migrate-vps.yml` (2 229 bytes) — workflow name `Migrate VPS`.
- **Trigger (chỉ xác nhận từ `gh run list`):**
  - `ci.yml`: chạy trên `pull_request` (verified qua các run `38352361334`, `38368283035`, `38372053221`) và `push` vào `main` (verified qua các run `38255822673`, `38279052656`, `38372807924`).
  - `deploy-vps.yml`: kích hoạt bởi `workflow_run` event sau main push (verified qua các run `38256227331`, `38279395808`, `38373171674` đều có event `workflow_run`).
  - `migrate-vps.yml`: trigger chi tiết `INSUFFICIENT_EVIDENCE` (chưa có run observed trong `gh run list` được lấy mẫu; cần xem workflow file trực tiếp).
- **Path filter (short-circuit):** theo baseline cũ, Integration job có bước lọc `path-filter` tự động SKIP nếu thay đổi chỉ giới hạn trong `docs/*`, `*.md`, `scratch/*`, v.v. Verification exact path-filter config: `INSUFFICIENT_EVIDENCE` (cần xem `ci.yml` chi tiết).

## 2. Dữ liệu run đã xác minh (verified 2026-10-13 từ `gh run list`)

Các run dưới đây là mẫu được verify trực tiếp; không ngoại suy thành "60+ merge PASS".

### Main CI runs (sau PR merge vào main)

| Run ID | Workflow | Event | Status | Wall time | Ngày (UTC) |
|---|---|---|---|---|---|
| `38372807924` | CI | push (main) | success | 3m0s | 2026-10-13T08:56:58Z |
| `38279052656` | CI | push (main) | success | 2m58s | 2026-10-12T16:40:31Z |
| `38255822673` | CI | push (main) | success | 3m32s | 2026-10-12T13:27:28Z |

### VPS Deploy runs (sau main push)

| Run ID | Workflow | Event | Status | Wall time | Ngày (UTC) |
|---|---|---|---|---|---|
| `38373171674` | Deploy HRP to VPS | workflow_run | success | 4m9s | 2026-10-13T09:00:00Z |
| `38279395808` | Deploy HRP to VPS | workflow_run | success | 3m46s | 2026-10-12T16:43:31Z |
| `38256227331` | Deploy HRP to VPS | workflow_run | success | 3m57s | 2026-10-12T13:31:03Z |

### PR runs (chỉ CI)

| Run ID | Workflow | Event | Status | Wall time | Ngày (UTC) |
|---|---|---|---|---|---|
| `38372053221` | CI | pull_request | success | 2m48s | 2026-10-13T08:50:33Z |
| `38368283035` | CI | pull_request | success | 3m39s | 2026-10-13T08:17:46Z |
| `38352361334` | CI | pull_request | success | 3m43s | 2026-10-13T05:37:46Z |

### Main CI `38372807924` chi tiết (sau PR #134)

- **Quality (schema · typecheck · lint · unit · build):** ✓ 2m57s (job ID 115213715737).
- **Integration (DB tests · fail-closed):** ✓ 1m42s (job ID 115213716064).
- **Annotations chỉ ghi nhận (deprecation + lint warnings, không fail):** xem §5.

## 3. Thời lượng & chi phí (chỉ trên run đã xác minh)

- **Wall-clock duration CI (Quality + Integration chạy song song):**
  - `38372807924`: 3m0s wall.
  - `38279052656`: 2m58s wall.
  - `38255822673`: 3m32s wall.
  - `38372053221`: 2m48s wall (PR).
- **Runner consumption (tổng thời gian job trên runner):**
  - `38372807924`: Quality 2m57s + Integration 1m42s = 4m39s runner-minutes (2 jobs chạy song song).
- **Wall-clock duration VPS Deploy:**
  - `38373171674`: 4m9s.
  - `38279395808`: 3m46s.
  - `38256227331`: 3m57s.

Wall-clock ≠ runner consumption. "Cost" đầy đủ cần cộng runner-minutes theo pricing plan GitHub Actions; discovery này không tính pricing.

## 4. Các điểm tối ưu & trùng lặp (chỉ phần đã verify)

- **Trùng lặp `pnpm install` + `prisma generate` ở 2 job:** cần verify exact bằng đọc [`../../.github/workflows/ci.yml`](../../../.github/workflows/ci.yml) chi tiết. Hiện tại chưa verify exact diff.

## 5. Annotations từ `gh run view 38372807924` (xác minh trực tiếp)

- **Node 20 deprecation** trên `actions/checkout@v4`, `actions/setup-node@v4` — thông báo deprecation; không fail CI. **Run mới có thể đã chuyển sang Node 24; verification exact runtime của run sau này: `INSUFFICIENT_EVIDENCE`.**
- **Ubuntu-latest sẽ migrate Ubuntu 26 từ 19/10/2026** — thông báo; không fail CI.
- **Lint warnings (chỉ ghi nhận trong `38372807924`):** 7 warning — claim này dựa trên output `gh run view` xem tại thời điểm verify 2026-10-13. Có thể đã thay đổi ở run sau.

## 6. Các bước bắt buộc (theo baseline cũ §22)

- **RLS/Database Boundary:** Job Integration hiện cấp quyền RLS (8 role, bao gồm `app_user_writer`) rồi chạy `prisma migrate deploy` và `test:integration`. Verification exact RLS role count và role names: `INSUFFICIENT_EVIDENCE` trong scope discovery này (chưa đọc chi tiết `ci.yml`).
- Việc hạ cấp xuống chỉ mock test (unit test) không đảm bảo tính an toàn cho hạ tầng V7/V8. Phải giữ Integration Fail-Closed.
- **VPS Deploy tự động** (theo `gh run list`): mỗi main push → deploy. Trigger cụ thể của `deploy-vps.yml` (workflow_run vs workflow_dispatch) đã xác minh qua event field = `workflow_run`. **Claim "deploy bao gồm migration": `INSUFFICIENT_EVIDENCE`** — chưa đọc chi tiết nội dung `deploy-vps.yml`; cần verify trước khi khẳng định.

## 7. Đề xuất rút gọn

CI wall-clock ~3 phút mỗi run, VPS deploy ~4 phút mỗi run (chỉ trên 6 run đã verify). **Không khuyến nghị thay đổi hay rút gọn thêm** tại thời điểm này để tránh vô ý phá vỡ an toàn RLS/Integration Gates.

Cần theo dõi:
- Node 24 runtime exact cho run mới (verification pending).
- Ubuntu 26 migration exact (verification pending).

## 8. Delta so với baseline cũ

| Hạng mục | Baseline cũ (2026-09-21) | Refreshed (2026-10-13) |
|---|---|---|
| Số workflows | 1 (`ci.yml`) | 3 (`ci.yml`, `deploy-vps.yml`, `migrate-vps.yml`) |
| Integration job wall time | 47s | 1m42s (trong `38372807924`) |
| Quality job wall time | 2m 12s | 2m57s (trong `38372807924`) |
| VPS Deploy wall time | không đo | 4m9s (trong `38373171674`) |
| Path filter cho docs | có (chưa verify exact config) | chưa verify exact config ở main hiện tại |

## Kết luận

- 6 run được lấy mẫu đều PASS (CI Quality + Integration + VPS Deploy).
- CI wall-clock ~3 phút; VPS deploy wall-clock ~4 phút; chấp nhận được.
- Nhiều claim (lint warning count, Node 20 deprecation, Ubuntu 26, deploy includes migration, migrate-vps.yml trigger) đã được ghi rõ là `INSUFFICIENT_EVIDENCE` cho đến khi verify exact từ workflow files.
- **Mở rộng P2+ sẽ tăng cost**; cần monitor.
- **P0-E02** = `ACCEPTED_IMPLEMENTATION_VERIFIED` (xem [`./EXECUTION_REALIGNMENT_DISCOVERY.md`](./EXECUTION_REALIGNMENT_DISCOVERY.md) §1 P0-E).
- **P0-E03** = `PARTIAL_IMPLEMENTATION_VERIFIED` — có lane FAST/STANDARD/CRITICAL + NONE/LIGHT + TASK template + critical-path guard T-08 + gate self-tests; chưa có ma trận đầy đủ theo mọi work type trong §22.

## Liên kết

- Realignment Plan: [`docs/HRP_EXECUTION_REALIGNMENT_PLAN.md`](../../../docs/HRP_EXECUTION_REALIGNMENT_PLAN.md) §52 (CI Cost Audit), §22 (P0-E)
- Workflows:
  - [`../../.github/workflows/ci.yml`](../../../.github/workflows/ci.yml)
  - [`../../.github/workflows/deploy-vps.yml`](../../../.github/workflows/deploy-vps.yml)
  - [`../../.github/workflows/migrate-vps.yml`](../../../.github/workflows/migrate-vps.yml)
- Source evidence:
  - `gh run list` (verified 2026-10-13, 9 run IDs ở §2)
  - `gh run view 38372807924` (PR #134 CI chi tiết)
- Discovery đồng hành: [`./EXECUTION_REALIGNMENT_DISCOVERY.md`](./EXECUTION_REALIGNMENT_DISCOVERY.md), [`./BLOCKER_REGISTER.md`](./BLOCKER_REGISTER.md)
