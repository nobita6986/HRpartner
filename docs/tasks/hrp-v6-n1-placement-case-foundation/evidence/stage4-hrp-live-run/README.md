# N1 Stage 4 — `hrp-live` production migration

**Ngày:** 13/09/2026 (Asia/Bangkok)

**Trạng thái:** Đã áp dụng, xác minh và theo dõi 5 phút sau triển khai.

**Git baseline:** `5b5767b`.
**Ủy quyền:** Owner nói “tiếp tục đi” sau khi Tier 0 báo preflight GO và nói rõ migration production chưa chạy.

Không ghi connection string, mật khẩu, API key hoặc project ID vào evidence này.

## Trước khi áp dụng

- Production gate `neon_branch_gate_prod.ps1` chạy với Neon API thật, không `-TestMode` hay mock API: **exit 0**; cả URL runtime và URL admin được xác nhận thuộc branch `hrp-live`. Kết quả đã lọc secret ở [gate-result.json](gate-result.json).
- `npx prisma migrate status`: 37 migration trong repo; chỉ `20260912140411_n1_placement_case_foundation` và `20260912140412_n1_placement_case_rls` đang pending. Exit 1 là trạng thái pending dự kiến.
- `_prisma_migrations`: 35 completed, 5 rolled-back lịch sử, 0 unfinished, 0 N1. Bảng `placement_case` và cột `candidate_submissions.placement_case_id` chưa tồn tại.
- `candidate_submissions`: ước lượng 5 hàng, tổng kích thước 176 kB. Snapshot `pg_stat_activity`: 0 phiên chờ lock, 0 giao dịch dài hơn 30 giây. Đây là snapshot trước triển khai, không phải phép đo thời gian lock thực tế.

## Áp dụng

Chạy `npx prisma migrate deploy` trên `main` với URL admin direct, role `neondb_owner`: **exit 0**. Prisma báo áp dụng thành công đúng hai migration N1, không áp migration khác.

Theo `_prisma_migrations`:

| Migration | Bắt đầu UTC | Kết thúc UTC | Thời gian migration |
| --- | --- | --- | ---: |
| `20260912140411_n1_placement_case_foundation` | 2026-09-13 15:28:02.978 | 15:28:03.328 | 0.350 s |
| `20260912140412_n1_placement_case_rls` | 2026-09-13 15:28:03.432 | 15:28:03.696 | 0.263 s |

Thời gian migration không đồng nghĩa với thời gian giữ lock của từng câu SQL.

## Sau khi áp dụng

- `npx prisma migrate status`: **exit 0**, “Database schema is up to date!”
- Truy vấn catalog đọc-only: **8/8 PASS** — 37 completed / 2 N1 / 0 unfinished; partial unique index; index trên `candidate_submissions.placement_case_id`; hai FK hợp lệ với `ON DELETE RESTRICT`, `ON UPDATE CASCADE`; RLS enable + force; policy `hrp_placement_case_scope` cho `app_user` và `app_user_writer`; cột mới kiểu `text`, nullable.
- Public HTTP GET `/` và `/viec-lam`: **200 / 200** ngay sau triển khai.
- Không sửa migration SQL, không dùng `migrate resolve`, không rollback.

## Theo dõi sau triển khai

Sáu snapshot từ 15:30:35 đến 15:35:38 UTC (5 phút): `xact_rollback` giữ nguyên ở 2176; `deadlocks=0`, `conflicts=0`, `waiting_lock=0`, `long_xact=0` ở mọi snapshot. GET `/` và `/viec-lam` vẫn trả **200 / 200** ở cuối khoảng theo dõi.

Đây là kiểm tra theo mẫu mỗi phút và hai route public; không thay thế log lỗi ứng dụng hoặc chứng minh không có lock thoáng qua giữa các mẫu. Không phát hiện tín hiệu bất thường trong phạm vi đã đo.
