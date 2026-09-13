# N1 Stage 3 — evidence vận hành của Tier0

Trạng thái tại 19:14 ngày 13/09/2026 (UTC+7): baseline B/C đã được đo lại và STEP 1.5 PASS; **chưa chạy probe thật, chưa có Stage 3 PASS**. Stage 4 (N1 production) và Stage 5 (intake writer) chưa mở.

## Đối chiếu rev 2.30

Commit `3ded03e` có ở local khi bắt đầu kiểm tra. `git ls-remote origin refs/heads/main` lúc đó trả `4e49a3aad82725f251dffcb5efa2b62248852c63`. Bộ evidence này được bổ sung sau báo cáo cross-check, không sửa nội dung báo cáo lịch sử.

Báo cáo đúng ở điểm chưa có evidence vận hành trong Git và chưa có probe Stage 3. Tuy nhiên, từ “NOT FOUND trong Git” không thể suy ra “chưa apply/chưa restore trên Neon”. Các phép đo mới dưới đây xác nhận trạng thái bên ngoài Git.

## Bằng chứng đã lưu

- [Baseline PostgreSQL và metadata Neon](baseline-readonly-20260913T121238Z.json): đo trực tiếp lúc `2026-09-13T12:12:38.108Z`, trên `hrp-live` và `hrp_mp2_test`. Query DB chạy trong `BEGIN READ ONLY` / `ROLLBACK`. Chỉ thu metadata schema, migration, quyền và số đếm; không lấy dữ liệu cá nhân.
- [STEP 1.5](step15-20260913.json): chạy nguyên script `stage3-self-test/neon_branch_gate.ps1` với hai URL mới lấy từ Neon CLI. Bearer của phiên Neon CLI đã đăng nhập được nạp vào process, không ghi vào artifact. API dùng endpoint chính thức, không mock.
- [Prisma migrate status](step2-migrate-status-20260913.json): exit 1 vì có đúng hai migration pending; không phải migration failure. Raw tracking xác nhận 0 unfinished.

## Trạng thái tám bước yêu cầu

| Bước | Kết quả được chứng minh |
|---|---|
| 1. Apply AV4 | Phiên Tier0 trước đã chạy SQL trong transaction và nhận `AV4_DDL_COMMIT=PASS`. Lượt này đo lại: có `media`, `media_assignment`, enum `MediaStatus`, FK `media_created_by_id_fkey`; cột `created_by_id` và `users.id` cùng TEXT. |
| 2. Ghi tracking AV4 | Hai DB cùng có tracking `20260912001_av4_media_library`, started/finished `2026-09-13T07:00:42.502Z`, không rolled-back. Checksum bằng SHA-256 bytes file worktree hiện tại. `applied_steps_count=0` phù hợp thao tác `resolve --applied` sau raw SQL. |
| 3. Push evidence AV4 | Bộ evidence này ghi lại trạng thái đã đo, được commit/push trước khi chạy migration N1 trong lượt này. Không chạy lại AV4. |
| 4. Fingerprint B | Schema, cột, seed AV1, denorm, RLS/policies và membership khớp contract migration; xem đính chính dưới đây. |
| 5. Re-clone | Neon ghi parent `hrp-live / br-icy-dew-azbrgthw`, parent timestamp `2026-09-13T07:04:20Z`, `last_reset_at=2026-09-13T07:04:41Z` cho test branch `br-misty-cell-az3nx5l3`. Backup `pre-n1-stage3-reclone-20260913 / br-old-lab-azk2j9xd` vẫn tồn tại (archived). Không restore lại. |
| 6. Post-check C | Test có 35 completed, 5 rolled-back lịch sử, 0 unfinished; chỉ hai N1 pending; `placement_case` và cột `placement_case_id` chưa tồn tại. Hai kết nối admin/writer được map bởi API về đúng test branch. |
| 7. STEP 1.5 | PASS, exit 0; hai endpoint cùng `hrp_mp2_test`, không primary. |
| 8. NDJSON/stderr probe thật | Chưa chạy tại thời điểm baseline; không có artifact giả hoặc sao chép self-test. Kết quả chạy sau được ghi riêng. |

Các thao tác apply/resolve/restore trước đó có tool output trong hội thoại, nhưng chưa lưu log gốc thành file lúc chạy. Artifact hiện tại là **phép đo lại**, không giả nhận là log transaction gốc. Tracking timestamp và metadata reset do hệ thống trả về; chúng không chứng minh mọi chi tiết nội bộ của transaction trước đó.

## Đính chính fingerprint và quyết định Tier0

Fingerprint v1.1 không thể chạy nguyên trạng để cho PASS: danh sách “7 RPC” không có trong migration được viện dẫn; `has_function_privilege('PUBLIC', ...)` gọi PUBLIC như tên role; policy episode cũng ghi sai tên. Đây là lỗi tiêu chí tài liệu.

Tier0 thay tiêu chí B.7/C.4 bằng contract thực của `20260831160000_public_rpc_residual_grant_revoke`: membership của `hrp_public_rpc` còn đúng bản ghi quản trị `neondb_owner ← cloud_admin`, admin=true, inherit=false, set=false; residual self-grant=0. Không thu hồi quyền của helper để làm xanh danh sách sai. Kiểm tra ACL bổ sung dùng `aclexplode(coalesce(proacl, acldefault('f', proowner)))`, grantee=0, privilege_type=EXECUTE, không lọc theo grantability; ba hàm thực `hrp_public_apply_submission`, `hrp_public_tracking_profile`, `hrp_public_tracking_projection` đều PUBLIC execute=false.

Policy thứ ba đúng là `hrp_employment_episode_scope` trên `employment_episodes`. Hai policy còn lại là `hrp_labor_profile_scope` và `hrp_labor_profile_intake_scope`; cả ba bảng ENABLE/FORCE RLS=true. Kỳ vọng 34 completed cũ được thay bằng tập migration thực: 37 file, 35 completed sau AV4, hai N1 pending.

Checksum AV4 trong DB bằng `67529c2d244d1af7bf73422570df7ac1a36ddbbd2f68c697e66838c1809440ab` (file CRLF trên Windows). Hash khi chuẩn hóa LF là `23907a7985036567699fbef23f9bf1d153eb4cc3d4363b92644cc56ec73a9450`; hai giá trị được lưu riêng, không đánh đồng byte representation với thay đổi SQL.

Tier0 cho phép Operator Tier0 tiếp tục đúng STEP 2→5 trên `hrp_mp2_test` sau baseline/STEP 1.5 này và chỉ khi pending vẫn đúng hai N1. T1 tiếp tục HOLD thao tác ghi theo yêu cầu hiện tại. Đây là quyền chạy kiểm chứng; **không phải tuyên bố Stage 3 PASS hay quyền deploy N1 production/mở Stage 5**.

T1 dùng các artifact để cập nhật cursor và sửa fingerprint của mình; không suy ra schema sai chỉ từ một số đếm hard-code.
