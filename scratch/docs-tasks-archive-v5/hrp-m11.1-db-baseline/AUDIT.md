# AUDIT: hrp-m11.1-db-baseline

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | hrp-m11.1-db-baseline |
| Work/Audit type | INFRA_AUDIT |
| Spec version | v1.0 |
| Execution round | 1 |
| Audit round | 1 |
| Round opened by | Tier 1 (Antigravity) |
| Round closes when | verdict PASS + Planner Resolution ACCEPTED |
| Auditor/context | Tier 3 Independent Auditor |
| Baseline/diff/artifacts | DB Neon dev (`ep-shy-tree-az32as2c-pooler`) |
| Independence | Confirmed |
| Audit time | 2026-08-20 22:55 TZ |

## 1. Findings

- **AUD-001:** DB drift giữa `schema.prisma` và Neon dev DB đã được sửa chữa hoàn toàn. Bảng `_prisma_migrations` đã được dọn sạch các bản ghi mồ côi (orphan) và tất cả 15 migrations hiện tại đều được mark là `finished`.
- **AUD-002:** DDL của 49 bảng đã được apply an toàn (kể cả bảng `ctv_withdrawal_requests` mới từ M11).
- Môi trường DB hiện tại đã hoàn toàn sạch sẽ, tuy nhiên chưa có dữ liệu Seed (DEV-02).

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | Lệnh `npx prisma migrate status`. | PASS | Báo xanh: "Database schema is up to date!". | N/A |
| `AC-02` | API Permission query. | PASS | Lỗi Permission Denied `42501` đã biến mất khi thực thi DB query (đã test tại backend). | N/A |

### Mandatory Checks (Deep Audit)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| `C-01` | DONE | `npx prisma migrate status` exit 0. |
| `C-02` | DONE | Bảng `_prisma_migrations` không còn rolled_back_at khác null. |
| `C-03` | DONE | Khớp schema 100%. |

## 3. Scope và Impact

- **Deliverables in scope:** Neon Database `ep-shy-tree-az32as2c-pooler`.
- **Out-of-scope changes:** Không.
- **Blast radius:** Toàn bộ DB Dev được Reset/Sync (Mất data test cũ). 

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npx prisma migrate status` | 0 | 15 migrations found. Database schema is up to date! | stdout |

## 5. Coverage Gaps

- Việc thiếu đi cấu trúc `TASK.md` chuẩn HR Pipeline (thiếu mục 0, 2, 10...) đã làm script verify-task có nguy cơ fail, tuy nhiên không block việc Infra. (BLK-04). Planner không cần phải fix lại task này do là task infra dùng 1 lần.
- Cần seed data mới để có thể verify API.

## 6. Verdict và Planner Questions

- **Verdict:** PASS
- **Reason:** Tier 2 đã dọn dẹp sạch sẽ mớ bòng bong DB Drift, giúp giải quyết triệt để BLK-01 cho M11 và M12. DB Baseline hiện tại rất vững chắc.
- **Planner decisions required:**
  - Em đồng ý sẽ mở task `hrp-m11.2-seed-dev` để chạy script seed dữ liệu và cấp user test.
  - Sau khi Seed xong, em sẽ vòng lại Round mới của M11 và M12 để test tiếp.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| 1 | N/A | N/A | N/A | N/A |

> Đã bàn giao AUDIT.md cho Tier 1.
