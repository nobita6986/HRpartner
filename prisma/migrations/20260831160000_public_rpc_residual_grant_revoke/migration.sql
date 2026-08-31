-- 20260831160000_public_rpc_residual_grant_revoke — go-live-11 / spec v1.1 / RQ-01..RQ-05.
--
-- MỤC ĐÍCH: thu hồi ĐÚNG MỘT self-grant tồn dư trên role NOLOGIN `hrp_public_rpc`,
-- và giữ nguyên membership quản trị do Neon cấp.
--
-- HAI RECORD CÙNG MEMBER NHƯNG KHÁC grantor — hình dạng đo được trên `hrp-live`
-- ngày 31/08 (PostgreSQL 18.6, xem `PLN-01` ở §9 của TASK):
--
--   [1] grantor = cloud_admin,  member = neondb_owner
--       admin_option = true, inherit_option = false, set_option = false
--       -> membership quản trị Neon tự cấp cho chủ branch. PHẢI GIỮ NGUYÊN: đây là
--          đường quản trị role, đường lùi `DEC-10`, và đường chuyển quyền sở hữu cho
--          migration tương lai. Vì inherit_option = false, record này KHÔNG kéo theo
--          một đặc quyền nào của `hrp_public_rpc`.
--
--   [2] grantor = neondb_owner, member = neondb_owner
--       admin_option = false, inherit_option = true, set_option = false
--       -> self-grant do idiom nâng-rồi-hạ membership của hai migration MP-2 để lại.
--          Idiom đó hạ bằng `WITH SET FALSE`, mà `WITH SET FALSE` chỉ tắt khả năng
--          `SET ROLE` — nó KHÔNG xoá membership. Vì inherit_option = true, record này
--          kéo theo TOÀN BỘ đặc quyền của `hrp_public_rpc`: quyền đọc/ghi trên
--          `candidate_submissions` (bảng chứa PII ứng viên) và
--          `application_status_history`, quyền đọc ba bảng marketplace, cộng USAGE
--          trên schema public. ĐÂY là quyền tồn dư duy nhất mà file này thu hồi.
--
-- ĐÍNH CHÍNH BẢN ROUND 1: luận điểm "tập thành viên đúng của `hrp_public_rpc` là tập
-- rỗng" là SAI và đã bị loại khỏi contract ở spec v1.1. Thu hồi mọi membership sẽ lấy
-- luôn record [1], tức lấy luôn ADMIN OPTION hợp lệ của chủ branch và tự khoá đường lùi
-- `DEC-10`. Bản này thu hồi theo HÌNH DẠNG record, không theo số đếm.
--
-- NGUỒN LỖI — hai migration MP-2, KHÔNG được sửa (`DEC-02`, lịch sử append-only):
--   * prisma/migrations/20260823101500_mp2_apply_tracking/migration.sql:241 và :248
--   * prisma/migrations/20260831103000_marketplace_search_tracking_profile/migration.sql:49 và :55
--
-- BÁN KÍNH (`DEC-03`): đúng một khái niệm — membership. Không câu lệnh nào chạm thân hàm,
--   policy, trạng thái RLS, bảng, cột, index hay dữ liệu.
-- IDEMPOTENT (`DEC-04`): lần chạy thứ hai không tìm thấy self-grant dư nào, không raise,
--   và bảng cuối vẫn là total=1, residual_self_grant=0, inheritable=0, safe_admin=1.
-- FAIL-CLOSED (`RQ-03`, `RISK-05`): dừng bằng exception và KHÔNG thu hồi gì nếu có hơn một
--   self-grant dư, hoặc nếu tồn tại record mang inherit_option = true không khớp hình dạng
--   [2] đã đo. Hình dạng lạ là dữ kiện mới của contract, không phải cớ để thu hồi mù.
-- PHIÊN BẢN: `pg_auth_members.inherit_option` và `.set_option` có từ PostgreSQL 16;
--   `hrp-live` đo được 18.6. Trên PostgreSQL 15 trở xuống file này lỗi cột ngay — đúng
--   hành vi fail-closed mong muốn, không im lặng bỏ qua.
-- QUYỀN CẦN CÓ KHI ÁP: session phải giữ ADMIN OPTION trên `hrp_public_rpc`; trên `hrp-live`
--   đó là `neondb_owner`, đúng role mà Neon Console SQL Editor dùng. Thiếu quyền thì câu
--   thu hồi lỗi và không có gì được ghi.
-- CÁCH ÁP (`DEC-07`/`DEC-08`): Neon Console SQL Editor, branch `hrp-live`, dán nguyên văn
--   toàn bộ file. KHÔNG dùng `prisma migrate deploy`.

DO $$
DECLARE
  v_total       integer;
  v_residual    integer;
  v_inheritable integer;
  v_safe_admin  integer;
  v_unexpected  integer;
  v_rec         record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hrp_public_rpc') THEN

    RAISE NOTICE 'hrp_public_rpc: session = "%"', current_user;

    -- Kiểm kê TRƯỚC khi tác động. In từng record kèm grantor để người vận hành đối chiếu
    -- được với hình dạng [1]/[2] ở header trước khi có bất kỳ thay đổi nào.
    FOR v_rec IN
      SELECT r_member.rolname  AS member,
             r_grantor.rolname AS grantor,
             m.admin_option,
             m.inherit_option,
             m.set_option
        FROM pg_auth_members m
        JOIN pg_roles r_role    ON r_role.oid    = m.roleid
        JOIN pg_roles r_member  ON r_member.oid  = m.member
        JOIN pg_roles r_grantor ON r_grantor.oid = m.grantor
       WHERE r_role.rolname = 'hrp_public_rpc'
       ORDER BY r_member.rolname, r_grantor.rolname
    LOOP
      RAISE NOTICE 'TRUOC | member=% | grantor=% | admin_option=% | inherit_option=% | set_option=%',
        v_rec.member, v_rec.grantor, v_rec.admin_option, v_rec.inherit_option, v_rec.set_option;
    END LOOP;

    -- Đếm theo hình dạng, không đếm thô. `v_unexpected` là số record thừa hưởng đặc quyền
    -- mà KHÔNG phải self-grant dư — đúng lớp trường hợp `RISK-05` phải chặn.
    SELECT
      count(*),
      count(*) FILTER (
        WHERE r_grantor.rolname = r_member.rolname
          AND m.inherit_option
          AND NOT m.admin_option
          AND NOT m.set_option
      ),
      count(*) FILTER (WHERE m.inherit_option),
      count(*) FILTER (
        WHERE m.admin_option
          AND NOT m.inherit_option
          AND NOT m.set_option
      ),
      count(*) FILTER (
        WHERE m.inherit_option
          AND NOT (
            r_grantor.rolname = r_member.rolname
            AND NOT m.admin_option
            AND NOT m.set_option
          )
      )
      INTO v_total, v_residual, v_inheritable, v_safe_admin, v_unexpected
      FROM pg_auth_members m
      JOIN pg_roles r_role    ON r_role.oid    = m.roleid
      JOIN pg_roles r_member  ON r_member.oid  = m.member
      JOIN pg_roles r_grantor ON r_grantor.oid = m.grantor
     WHERE r_role.rolname = 'hrp_public_rpc';

    RAISE NOTICE 'TRUOC | total=% | residual_self_grant=% | inheritable=% | safe_admin=%',
      v_total, v_residual, v_inheritable, v_safe_admin;

    IF v_unexpected > 0 THEN
      RAISE EXCEPTION 'hrp_public_rpc: % record mang inherit_option = true nhung KHONG khop hinh dang self-grant du (grantor = member, admin_option = false, set_option = false). RQ-03 fail-closed: khong thu hoi gi. Gui cac dong NOTICE TRUOC o tren cho Tier 1 va cho contract quyet.', v_unexpected;
    END IF;

    IF v_residual > 1 THEN
      RAISE EXCEPTION 'hrp_public_rpc: % self-grant du, nhieu hon mot record da do. RQ-03 fail-closed: khong thu hoi gi. Gui cac dong NOTICE TRUOC o tren cho Tier 1 va cho contract quyet.', v_residual;
    END IF;

    -- Thu hồi đúng record hình dạng [2]. Điều kiện `r_grantor.rolname = r_member.rolname`
    -- là thứ bảo toàn record [1] của `cloud_admin`. `%I` trích dẫn định danh nên tên role
    -- lạ không thể chèn thêm câu lệnh.
    FOR v_rec IN
      SELECT r_member.rolname  AS member,
             r_grantor.rolname AS grantor
        FROM pg_auth_members m
        JOIN pg_roles r_role    ON r_role.oid    = m.roleid
        JOIN pg_roles r_member  ON r_member.oid  = m.member
        JOIN pg_roles r_grantor ON r_grantor.oid = m.grantor
       WHERE r_role.rolname = 'hrp_public_rpc'
         AND r_grantor.rolname = r_member.rolname
         AND m.inherit_option
         AND NOT m.admin_option
         AND NOT m.set_option
       ORDER BY r_member.rolname
    LOOP
      RAISE NOTICE 'THU HOI | member=% | grantor=%', v_rec.member, v_rec.grantor;
      EXECUTE format('REVOKE hrp_public_rpc FROM %I GRANTED BY %I', v_rec.member, v_rec.grantor);
    END LOOP;

    -- Kiểm kê SAU khi tác động.
    FOR v_rec IN
      SELECT r_member.rolname  AS member,
             r_grantor.rolname AS grantor,
             m.admin_option,
             m.inherit_option,
             m.set_option
        FROM pg_auth_members m
        JOIN pg_roles r_role    ON r_role.oid    = m.roleid
        JOIN pg_roles r_member  ON r_member.oid  = m.member
        JOIN pg_roles r_grantor ON r_grantor.oid = m.grantor
       WHERE r_role.rolname = 'hrp_public_rpc'
       ORDER BY r_member.rolname, r_grantor.rolname
    LOOP
      RAISE NOTICE 'SAU   | member=% | grantor=% | admin_option=% | inherit_option=% | set_option=%',
        v_rec.member, v_rec.grantor, v_rec.admin_option, v_rec.inherit_option, v_rec.set_option;
    END LOOP;

  ELSE
    RAISE NOTICE 'hrp_public_rpc: role khong ton tai tren moi truong nay, khong co gi de thu hoi';
  END IF;
END
$$;

-- RQ-05 / AC-05 — kiểm kê từng record còn lại. Trên `hrp-live` sau khi áp, đúng một dòng:
-- member=neondb_owner, grantor=cloud_admin, admin_option=t, inherit_option=f, set_option=f.
SELECT r_member.rolname  AS member,
       r_grantor.rolname AS grantor,
       m.admin_option,
       m.inherit_option,
       m.set_option
  FROM pg_auth_members m
  JOIN pg_roles r_role    ON r_role.oid    = m.roleid
  JOIN pg_roles r_member  ON r_member.oid  = m.member
  JOIN pg_roles r_grantor ON r_grantor.oid = m.grantor
 WHERE r_role.rolname = 'hrp_public_rpc'
 ORDER BY r_member.rolname, r_grantor.rolname;

-- RQ-05 / AC-03 / AC-05 — bảng tổng hợp bốn số, là câu cuối cùng của file.
-- Ngưỡng sau khi áp trên `hrp-live`: total=1, residual_self_grant=0, inheritable=0, safe_admin=1.
SELECT
  count(*) AS total,
  count(*) FILTER (
    WHERE r_grantor.rolname = r_member.rolname
      AND m.inherit_option
      AND NOT m.admin_option
      AND NOT m.set_option
  ) AS residual_self_grant,
  count(*) FILTER (WHERE m.inherit_option) AS inheritable,
  count(*) FILTER (
    WHERE m.admin_option
      AND NOT m.inherit_option
      AND NOT m.set_option
  ) AS safe_admin
  FROM pg_auth_members m
  JOIN pg_roles r_role    ON r_role.oid    = m.roleid
  JOIN pg_roles r_member  ON r_member.oid  = m.member
  JOIN pg_roles r_grantor ON r_grantor.oid = m.grantor
 WHERE r_role.rolname = 'hrp_public_rpc';
