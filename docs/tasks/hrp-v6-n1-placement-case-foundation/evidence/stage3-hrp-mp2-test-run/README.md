# N1 Stage 3 — evidence vận hành của Tier0

**Kết quả: Stage 3 PASS trên `hrp_mp2_test`, Operator Tier0, ngày 13/09/2026.** Hai migration N1 được deploy lúc 19:17 (UTC+7); probe thật đạt 28/28, `stage3_real_pass=true`, exit 0; đọc lại DB lúc 19:19 xác nhận không còn ID fixture. N1 trên production (Stage 4) và intake writer (Stage 5) chưa được authorize.

Baseline B/C và STEP 1.5 đã được push ở `d70cb1a` trước khi chạy N1. Trước lượt thực thi này, Tier0 **chưa chạy probe**; các thông báo cũ chỉ đủ chứng minh chuẩn bị baseline, không phải Stage 3 PASS.

## Kết quả chạy thật và quyết định

- [STEP 1.5 chạy lại ngay trước deploy + STEP 3](step3-deploy-20260913.json): gate exit 0; pending allowlist đúng hai N1; deploy exit 0; tracking có checksum, started_at, finished_at; 0 unfinished.
- [Thông tin process probe](probe-20260913.process.json), [stdout gốc](probe-20260913.stdout.ndjson), [NDJSON qua helper](probe-20260913.clean.ndjson), [stderr gốc](probe-20260913.stderr.txt), [trace qua helper](probe-20260913.trace.txt).
- [STEP 5](step5-verification-20260913.json), [log hai helper](step5b-sanitizers-20260913.json): 30 JSON lines = boot + 28 assertions + summary; real flag và boolean true được kiểm tra; 6 created / 6 deleted; hai helper exit 0.
- [Kiểm tra DB sau probe](postrun-cleanup-and-live-20260913.json): `SELECT ... WHERE id = ANY(...)` cho đúng sáu ID fixture và ID second-case đã thử; không còn ID nào trên ba bảng. Test có 37 completed, 5 rolled-back lịch sử, 0 unfinished. Live vẫn 35 completed, hai N1 chưa apply, `placement_case` chưa tồn tại.

Tier0 ký **Stage 3 PASS** theo các artifact trên. T1 được kiểm tra evidence, cập nhật cursor và chuẩn bị đề xuất Stage 4 với phạm vi/rủi ro cụ thể. T1 chưa được chạy migration/probe/resolve hoặc ghi `hrp-live`; Cursor không mở Stage 5, N1 intake writer hay AV6 từ kết quả này. Không yêu cầu chạy lại các bước đã chứng minh chỉ vì revision log cũ còn HOLD.

Proof concurrency của probe đo B chưa hoàn tất sau cửa sổ 800 ms khi A còn mở, rồi B nhận `23505`; không có snapshot lock server trong probe hiện tại. Claim giới hạn theo thiết kế probe được duyệt. Cleanup được kiểm tra cho đúng ID của lượt này, không tuyên bố toàn bộ dữ liệu test trở về trạng thái ban đầu.

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
| 8. NDJSON/stderr probe thật | Đã chạy sau push baseline `d70cb1a`: 28/28, real=true, exit 0, 0 ID còn lại; stdout/stderr, post-check và helper output lưu riêng trong thư mục này. |

Các thao tác apply/resolve/restore trước đó có tool output trong hội thoại, nhưng chưa lưu log gốc thành file lúc chạy. Artifact hiện tại là **phép đo lại**, không giả nhận là log transaction gốc. Tracking timestamp và metadata reset do hệ thống trả về; chúng không chứng minh mọi chi tiết nội bộ của transaction trước đó.

## Đính chính fingerprint và quyết định Tier0

Fingerprint v1.1 không thể chạy nguyên trạng để cho PASS: danh sách “7 RPC” không có trong migration được viện dẫn; `has_function_privilege('PUBLIC', ...)` gọi PUBLIC như tên role; policy episode cũng ghi sai tên. Đây là lỗi tiêu chí tài liệu.

Tier0 thay tiêu chí B.7/C.4 bằng contract thực của `20260831160000_public_rpc_residual_grant_revoke`: membership của `hrp_public_rpc` còn đúng bản ghi quản trị `neondb_owner ← cloud_admin`, admin=true, inherit=false, set=false; residual self-grant=0. Không thu hồi quyền của helper để làm xanh danh sách sai. Kiểm tra ACL bổ sung dùng `aclexplode(coalesce(proacl, acldefault('f', proowner)))`, grantee=0, privilege_type=EXECUTE, không lọc theo grantability; ba hàm thực `hrp_public_apply_submission`, `hrp_public_tracking_profile`, `hrp_public_tracking_projection` đều PUBLIC execute=false.

Policy thứ ba đúng là `hrp_employment_episode_scope` trên `employment_episodes`. Hai policy còn lại là `hrp_labor_profile_scope` và `hrp_labor_profile_intake_scope`; cả ba bảng ENABLE/FORCE RLS=true. Kỳ vọng 34 completed cũ được thay bằng tập migration thực: 37 file, 35 completed sau AV4, hai N1 pending.

Checksum AV4 trong DB bằng `67529c2d244d1af7bf73422570df7ac1a36ddbbd2f68c697e66838c1809440ab` (file CRLF trên Windows). Hash khi chuẩn hóa LF là `23907a7985036567699fbef23f9bf1d153eb4cc3d4363b92644cc56ec73a9450`; hai giá trị được lưu riêng, không đánh đồng byte representation với thay đổi SQL.

Tại thời điểm baseline, Tier0 cho phép Operator Tier0 tiếp tục đúng STEP 2→5 trên `hrp_mp2_test` và chỉ khi pending vẫn đúng hai N1. Quyền chạy này đã được thực hiện trong lượt ghi ở trên. T1 tiếp tục HOLD thao tác ghi; Stage 3 PASS không cấp quyền deploy N1 production hoặc mở Stage 5.

T1 dùng các artifact để cập nhật cursor và sửa fingerprint của mình; không suy ra schema sai chỉ từ một số đếm hard-code.
