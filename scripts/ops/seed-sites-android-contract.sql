-- ============================================================================
-- seed-sites-android-contract.sql — T1A Android backend mobile contract (STEP-05)
-- Task:    hrp-t1a-android-backend-mobile-contract (TASK.md v1.0, DEC-11 / RQ-10)
-- Baseline 51195c3bb3410b49f49531f6cc841a2a2832ada1
--
-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  KHÔNG TỰ CHẠY. KHÔNG gắn vào prisma migrations. KHÔNG seed tự động.     ║
-- ║  Artifact này chỉ là hand-off cho T0/operator: review, điền tọa độ còn   ║
-- ║  thiếu, xác nhận target DB, rồi áp thủ công qua psql có audit.           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- CÁCH ÁP DỤNG (cho T0/operator — sau khi TASK v1.0 đã ACCEPTED):
--   1) Xác nhận TARGET DB production/staging TRƯỚC (không dùng DATABASE_URL dev):
--        psql "<target-db-url>" -c "SELECT id, code, name, status FROM outsourcing_projects
--                                     WHERE id IN ('prj-sams-01','prj-fox-01','prj-pega-01','prj-vin-01');"
--      YÊU CẦU: đủ 4 row. Thiếu bất kỳ ID nào ⇒ DỪNG, không áp file này.
--   2) Điền tọa độ Pega/VinFast còn thiếu (2 khối marked [ĐIỀN TRƯỚC]).
--      Nguồn tọa độ hiện có (bàn giao T1A + client Android LocationHelper.kt):
--        Samsung SEVT  (Cổng B, Phổ Yên, Thái Nguyên): 21.4925 / 105.8239
--        Foxconn Quang Châu (Bắc Giang):               21.2468 / 106.1432
--        Pega Hải Phòng: CHƯA CÓ — [ĐIỀN TRƯỚC]
--        VinFast Hải Phòng: CHƯA CÓ — [ĐIỀN TRƯỚC]
--   3) Chạy trong 1 transaction có audit (ghi log giờ + người áp):
--        psql "<target-db-url>" -1 -f scripts/ops/seed-sites-android-contract.sql
--   4) Verify sau áp:
--        SELECT s.id, p.code, s.name, s.latitude, s.longitude, s.radius_meters
--        FROM sites s JOIN outsourcing_projects p ON p.id = s.project_id
--        WHERE p.code IN ('prj-sams-01','prj-fox-01','prj-pega-01','prj-vin-01');
--      Expect 4 rows.
--
-- IDEMPOTENT: mỗi site là một DO-block độc lập; preflight project ID FAIL-CLOSED
-- (thiếu project ⇒ RAISE EXCEPTION, block đó rollback — KHÔNG ghi dữ liệu);
-- insert chỉ khi chưa có (project_id, name); chạy lại nhiều lần an toàn.
--
-- TỌA ĐỘ: KHÔNG BAO GIỜ bỏ qua check NULL — site thiếu tọa độ sẽ phá geofence
-- (haversine checkin route). Nếu thiếu ⇒ exception, block không ghi.
-- RADIUS: mặc định 800m theo client Android (LocationHelper.GEOFENCE_RADIUS_
-- METERS = 800f). Schema default 200; operator có thể đổi v_radius per-site —
-- đó là quyết định nghiệp vụ của T0 (đã ghi gap trong HANDOFF BLK-04).
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- (1/4) SAMSUNG SEVT — prj-sams-01 — Cổng B, Phổ Yên, Thái Nguyên
-- Tọa độ: 21.4925 / 105.8239 (bàn giao + LocationHelper.kt SEVT_LAT/LNG)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_project_id text;
  v_site_name  text           := 'Samsung SEVT - Cổng B (Phổ Yên, Thái Nguyên)';
  v_lat        numeric(10, 7) := 21.4925;
  v_lng        numeric(10, 7) := 105.8239;
  v_radius     int            := 800;
BEGIN
  -- PREFLIGHT 1: project ID bắt buộc tồn tại (fail closed).
  SELECT id INTO v_project_id FROM outsourcing_projects WHERE id = 'prj-sams-01';
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'seed-sites preflight FAILED: project prj-sams-01 KHÔNG tồn tại trên DB đích. Block Samsung rollback — KHÔNG ghi site.';
  END IF;

  -- PREFLIGHT 2: tọa độ phải non-null (fail closed — geofence haversine).
  IF v_lat IS NULL OR v_lng IS NULL THEN
    RAISE EXCEPTION 'seed-sites preflight FAILED: tọa độ Samsung site NULL. Block rollback.';
  END IF;

  INSERT INTO sites (id, project_id, name, address, latitude, longitude, radius_meters, created_at)
  SELECT 'seed-site-sams-01-gate-b', v_project_id, v_site_name,
         'KCN Yên Bình, Phổ Yên, Thái Nguyên (Cổng B)', v_lat, v_lng, v_radius, NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM sites WHERE project_id = v_project_id AND name = v_site_name
  );
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- (2/4) FOXCONN QUANG CHÂU — prj-fox-01 — Bắc Giang
-- Tọa độ: 21.2468 / 106.1432 (bàn giao + LocationHelper.kt FOXCONN_LAT/LNG)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_project_id text;
  v_site_name  text           := 'Foxconn Quang Châu (Bắc Giang)';
  v_lat        numeric(10, 7) := 21.2468;
  v_lng        numeric(10, 7) := 106.1432;
  v_radius     int            := 800;
BEGIN
  SELECT id INTO v_project_id FROM outsourcing_projects WHERE id = 'prj-fox-01';
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'seed-sites preflight FAILED: project prj-fox-01 KHÔNG tồn tại trên DB đích. Block Foxconn rollback — KHÔNG ghi site.';
  END IF;

  IF v_lat IS NULL OR v_lng IS NULL THEN
    RAISE EXCEPTION 'seed-sites preflight FAILED: tọa độ Foxconn site NULL. Block rollback.';
  END IF;

  INSERT INTO sites (id, project_id, name, address, latitude, longitude, radius_meters, created_at)
  SELECT 'seed-site-fox-01-qc', v_project_id, v_site_name,
         'KCN Quang Châu, Bắc Giang', v_lat, v_lng, v_radius, NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM sites WHERE project_id = v_project_id AND name = v_site_name
  );
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- (3/4) PEGA (Pegatron) — prj-pega-01 — Hải Phòng
-- Tọa độ: [ĐIỀN TRƯỚC KHI ÁP] — bàn giao T1A KHÔNG có tọa độ site này.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_project_id text;
  v_site_name  text           := 'Pegatron Hải Phòng';
  v_lat        numeric(10, 7) := NULL; -- [ĐIỀN TRƯỚC] ví dụ: 20.8449000
  v_lng        numeric(10, 7) := NULL; -- [ĐIỀN TRƯỚC] ví dụ: 106.6880000
  v_radius     int            := 800;
BEGIN
  SELECT id INTO v_project_id FROM outsourcing_projects WHERE id = 'prj-pega-01';
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'seed-sites preflight FAILED: project prj-pega-01 KHÔNG tồn tại trên DB đích. Block Pega rollback — KHÔNG ghi site.';
  END IF;

  IF v_lat IS NULL OR v_lng IS NULL THEN
    RAISE EXCEPTION 'seed-sites preflight FAILED: tọa độ Pega site CHƯA được điền (NULL). Operator phải điền v_lat/v_lng trong block này trước khi áp. Block rollback — KHÔNG ghi site.';
  END IF;

  INSERT INTO sites (id, project_id, name, address, latitude, longitude, radius_meters, created_at)
  SELECT 'seed-site-pega-01-hp', v_project_id, v_site_name,
         'Hải Phòng', v_lat, v_lng, v_radius, NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM sites WHERE project_id = v_project_id AND name = v_site_name
  );
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- (4/4) VINFAST — prj-vin-01 — Hải Phòng
-- Tọa độ: [ĐIỀN TRƯỚC KHI ÁP] — bàn giao T1A KHÔNG có tọa độ site này.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_project_id text;
  v_site_name  text           := 'VinFast Cảng Cái Mép (Hải Phòng)';
  v_lat        numeric(10, 7) := NULL; -- [ĐIỀN TRƯỚC]
  v_lng        numeric(10, 7) := NULL; -- [ĐIỀN TRƯỚC]
  v_radius     int            := 800;
BEGIN
  SELECT id INTO v_project_id FROM outsourcing_projects WHERE id = 'prj-vin-01';
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'seed-sites preflight FAILED: project prj-vin-01 KHÔNG tồn tại trên DB đích. Block VinFast rollback — KHÔNG ghi site.';
  END IF;

  IF v_lat IS NULL OR v_lng IS NULL THEN
    RAISE EXCEPTION 'seed-sites preflight FAILED: tọa độ VinFast site CHƯA được điền (NULL). Operator phải điền v_lat/v_lng trong block này trước khi áp. Block rollback — KHÔNG ghi site.';
  END IF;

  INSERT INTO sites (id, project_id, name, address, latitude, longitude, radius_meters, created_at)
  SELECT 'seed-site-vin-01-hp', v_project_id, v_site_name,
         'Hải Phòng', v_lat, v_lng, v_radius, NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM sites WHERE project_id = v_project_id AND name = v_site_name
  );
END $$;

-- ============================================================================
-- KẾT: verify 4 rows như hướng dẫn ở header. File này KHÔNG chạy trong CI,
-- KHÔNG nằm trong migration chain, KHÔNG đụng credential/.env.
-- ============================================================================
