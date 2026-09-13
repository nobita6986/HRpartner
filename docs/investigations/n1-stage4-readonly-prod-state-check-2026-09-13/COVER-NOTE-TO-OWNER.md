# T1 → Owner: Cover note cho Stage 4 dossier

**Date:** 2026-09-13 19:58 (UTC+7)
**From:** Tier 1 — Agent
**To:** Owner
**Subject:** Hồ sơ quyết định Stage 4 N1 PlacementCase (READ-ONLY, chưa mở lệnh ghi)

---

Anh,

Em (Tier 1) đã chuẩn bị xong hồ sơ quyết định Stage 4 tại `docs/investigations/n1-stage4-readonly-prod-state-check-2026-09-13/DOSSIER.md`. Hồ sơ này trả lời đúng 4 yêu cầu của anh:

1. **Kiểm tra chỉ đọc trạng thái migration production ngay trước lúc triển khai** → §4, với 3 query SQL READ-ONLY (`_prisma_migrations` + `pg_indexes` + `pg_constraint` + `pg_class` + `pg_policy`) — Tier 0 chạy, Tier 1 không có quyền `psql` tới `hrp-live`.

2. **Xác nhận chỉ còn đúng hai migration N1** → §4.3 với kỳ vọng rõ:
   - `_prisma_migrations` NGOÀI N1: 34 completed + 5 rolled-back.
   - `_prisma_migrations` N1: 0 rows trên `hrp_mp2_test` (chưa apply).
   - Sau Stage 4 trên `hrp-live`: 36 completed + 5 rolled-back + 2 N1 mới = 43 rows total.

3. **Đánh giá tác động khoá bảng `candidate_submissions`** → §2, với phân tích chi tiết:
   - `ALTER TABLE ... ADD COLUMN TEXT NULL` (không default) → catalog-only, **dưới 1 giây**, ACCESS EXCLUSIVE chỉ trên bảng `candidate_submissions`.
   - FK mới `placement_case_id` (nullable, ON DELETE RESTRICT, ON UPDATE CASCADE) → rủi ro thực tế = 0 vì ứng dụng KHÔNG xoá case và KHÔNG update PK.
   - RLS migration → ACCESS EXCLUSIVE trên bảng mới `placement_case` (0 traffic), không ảnh hưởng runtime.
   - Partial unique index → SHARE lock trên bảng mới (0 rows), không ảnh hưởng runtime.

4. **Xác minh đích là branch `hrp-live` theo danh tính branch/endpoint — KHÔNG suy từ cờ `primary`** → §3, với 4 bước xác minh:
   - Bước 1: Neon API lấy `branch.name == "hrp-live"` (case-sensitive chính xác).
   - Bước 2: Neon API lấy `endpoint.id` của branch đó.
   - Bước 3: Cross-check endpoint-id từ `DATABASE_URL` với endpoint-id từ Neon API (qua `endpointIdOf()` helper).
   - Bước 4: SQL `current_database()` + `inet_server_addr()` như defense-in-depth.
   - **Cấm**: dùng `branch.primary == true` để chọn branch, tạo branch mới qua API, echo `DATABASE_URL`.

## Hành động em đã làm

- ✅ Đọc 2 file migration (`20260912140411_n1_placement_case_foundation` + `20260912140412_n1_placement_case_rls`) từ commit `f7f85bb`.
- ✅ Đọc `schema.prisma` để verify model `PlacementCase` + `CandidateSubmission.placementCaseId`.
- ✅ Đọc `TASK.md` N1 để hiểu AC-05, AC-06, RISK-03 (partial unique index concurrency chỉ static verify).
- ✅ Đọc `HANDOFF.md` N1 round 2 để lấy AE-01..AE-10 measured values + audit findings CLOSED.
- ✅ Đọc `hrp-live-fingerprint.md` v1.1 (commit `0611b5d`) để biết Tier 0 verify scripts đã có.
- ✅ Cross-check git state 13/09 19:58: HEAD `4e49a3a`, chỉ 2 branch trên origin.

## Hành động em KHÔNG làm (và sẽ không làm)

- ⛔ KHÔNG `psql` đến `hrp-live` (Tier 1 không có credentials).
- ⛔ KHÔNG `prisma migrate deploy` (Tier 1 không có quyền apply lên prod).
- ⛔ KHÔNG mở Stage 5 (N1 intake writer) — gated bởi Stage 3 + Stage 4.
- ⛔ KHÔNG mở AV6 (HomepageSection CMS) — defer theo queue_authority.
- ⛔ KHÔNG echo `DATABASE_URL` ở bất kỳ đâu.

## Stage 5 / AV6

Vẫn **CHƯA MỞ** như anh yêu cầu. Tier 1 chỉ chuẩn bị dossier Stage 4. Việc apply + Stage 5 + AV6 đều gated bởi Owner phê duyệt.

## Đề xuất hướng đi (cập nhật 20:08)

Stage 3 đã PASS thật (theo Tier 0 commit `233fab1` 19:54). Phương án B của em trước đó đã hoàn tất. Bây giờ dossier này là **bước tiếp theo tự nhiên**:

**Phương án C — Áp dụng dossier Stage 4 (khuyến nghị hiện tại):**
1. Anh (Owner) duyệt dossier này (chỉ cần "OK" hoặc comment chỉnh sửa).
2. Tier 0 dùng checklist §5.1 (P-01..P-05) để apply 2 migration N1 lên `hrp-live`. Hầu hết P-01..P-04 đã được Tier 0 verify trong `233fab1` evidence — chỉ cần apply 2 migration thật.
3. Sau Stage 4 PASS, Tier 1 viết `verify-task.ps1` + `verify-handoff.ps1` cho Stage 4 round 1, Tier 3 LIGHT audit.
4. Stage 5 mở sau khi Stage 4 audit PASS.

**Lưu ý quan trọng:**
- T1 đã verify Tier 0 evidence Tier 0 publish trong commit `233fab1` — đầy đủ 7 artifact (probe NDJSON stdout, NDJSON qua helper, stderr, trace, process, step5 sanitizers, postrun cleanup).
- Tier 0 cũng đã verify fingerprint có chỗ sai (B.7 RPC list + policy episode tên) và đã publish đính chính trong cùng README. Tier 1 không cần sửa fingerprint trong dossier này; vấn đề đó thuộc commit `4e49a3a` (fingerprint v1.1) và sẽ được xử lý khi Tier 1 viết verify scripts cho Stage 4.
- Tier 0 evidence dùng định danh `parent: hrp-live / br-icy-dew-azbrgthw, parent_timestamp: 2026-09-13T07:04:20Z` cho test branch `br-misty-cell-az3nx5l3`. Branch id này được Neon trả qua API — Tier 1 không thẩm tra được nhưng dựa trên contract `neon_branch_gate.ps1` đã verify exit 0 trong step15 evidence.

## Trạng thái

- Dossier: READY_FOR_OWNER_REVIEW.
- Stage 3: vẫn `AWAITING_TIER0_REAPPLY` (rev 2.30).
- Stage 4: CHƯA MỞ — chờ Owner duyệt dossier + Tier 0 hoàn tất chuỗi AV4 + Stage 3.
- Stage 5: CHƯA MỞ.
- AV6: CHƯA MỞ (defer).

Anh duyệt dossier + chọn phương án A/B nhé. Nếu cần em chỉnh sửa gì trong dossier, em sẵn sàng sửa ngay.

— Tier 1 Agent, 13/09/2026 19:58 UTC+7
