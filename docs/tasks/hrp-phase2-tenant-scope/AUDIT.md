# AUDIT: hrp-phase2-tenant-scope

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-phase2-tenant-scope` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.4` (matches TASK.md) |
| Execution round | `2` (Remediation) |
| Audit round | `2` |
| Round opened by | `HANDOFF round 2` (`READY_FOR_AUDIT`) |
| Round closes when | `verdict PASS + Planner Resolution ACCEPTED` |
| Auditor/context | `Tier 3 — Independent Auditor` |
| Baseline/diff/artifacts | `dc3e772` (identity-core ACCEPTED); HEAD `e99f11f` |
| Independence | `Confirmed` — độc lập verify lệnh test, build và chạy rollback dry-run. |
| Audit time | `2026-08-16 22:20 ICT` |

## 1. Findings

Không có finding mới ở vòng 2. Các finding từ vòng 1 đã được khắc phục hoàn toàn. Giải pháp L2 RLS kết hợp với L1 Scope Builder chạy ổn định và an toàn thông qua transaction context. 

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01..09` | Lệnh `npm run test` và `npm run build` | `PASS` | Vượt qua 303/303 unit & integration tests, bao gồm 59 case của ma trận phân quyền L2 RLS. Next.js build thành công không lỗi (11 routes). | None |
| `AC-10` | Đọc Handoff và chạy thử Dry-run Rollback | `PASS` | Tier 2 đã bổ sung Runbook Production chi tiết tại `HANDOFF.md` §7.7 và nhật ký chạy dry-run tại §7.8. Lệnh `node scripts/_t3-dryrun-rollback.mjs` chạy thành công đúng như báo cáo, liệt kê chuẩn 15 policies và 7 helpers sẽ bị drop khi rollback. | Đã resolve `AUD-002` |

## 3. Scope và Impact

- **Deliverables in scope:** Hệ thống RLS (3 migrations), Scope Builders (L1), Projection masks cho Worker, và 2 API routes (`/api/workers*`). Runbook Production hoàn chỉnh.
- **Out-of-scope changes:** Forbidden zones giữ nguyên không bị xâm phạm. Các dirty file khác của sếp trong thư mục `appBCC/*` được Tier 2 giữ ranh giới không đụng tới (đạt yêu cầu tách bạch task).
- **Blast radius/callers/affected flows:** Các endpoint fetch Worker data phải đi qua 15 RLS policies bảo vệ ở tầng DB và 4 Scope builders bảo vệ ở tầng Node.js. Quyền truy cập API được thắt chặt.
- **Data/security/migration/operations:** Dữ liệu an toàn. Production database (Neon main) hiện tại không bị ảnh hưởng, sẽ đợi Planner / Sếp chạy Runbook vào maintenance window trước Phase 4.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npm run test` | `0` | Pass 303 tests bao gồm ma trận 59 case scope L2 | Local check |
| `npm run build` | `0` | Toàn bộ app build thành công | Local check |
| `node scripts/_t3-dryrun-rollback.mjs` | `0` | Xác nhận chính xác 15 bảng, 15 policies và 7 functions bị drop nếu rollback (Read-only) | Local check |
| `git diff` | `N/A` | `appBCC/app.py:227` đã được cập nhật sang `APPBCC_DATABASE_URL` với fallback chuẩn theo phương án A của DEC-09. | Code check |

## 5. Coverage Gaps

- Việc apply migration trên production DB sẽ được thực hiện trước Phase 4 (theo DEC-08). Không có gap trong phạm vi Phase 2.

## 6. Verdict và Planner Questions

- **Verdict:** `PASS`.
- **Reason:** Cả 10 Acceptance Criteria đều đã thỏa mãn. Lỗi tài liệu (AUD-001) và thiếu Runbook (AUD-002) từ vòng 1 đã được sửa đầy đủ. Việc phân tách role DB (Q3 - `APPBCC_DATABASE_URL`) đã hoàn thiện an toàn.
- **Planner decisions required:**
  - Không có. Tuy nhiên Tier 1 / Sếp lưu ý tự gom (stage) và commit phần thay đổi của `appBCC/app.py` và `HANDOFF.md` cùng với script `_t3-dryrun-rollback.mjs` theo đúng kế hoạch của Tier 2 trước khi chạy resolve.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| 2 | AUD-001 | OPEN | RESOLVED | Tên bảng sai trong `HANDOFF.md` §5.2 đã được gỡ bỏ, để lại danh sách chuẩn. |
| 2 | AUD-002 | OPEN | RESOLVED | Runbook Production đã có mặt. Chạy thử dry run script thành công (Read-only). |
| 2 | Q3 (appBCC) | OPEN | RESOLVED | Dòng env DB trong `app.py` đã đổi thành `APPBCC_DATABASE_URL`, các dirty hunk khác của sếp không bị Tier 2 đụng chạm (Đạt yêu cầu giữ ranh giới code). |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
