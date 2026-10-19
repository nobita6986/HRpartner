-- ============================================================================
-- Migration: site_gps_confirmation
-- Task:      hrp-t1a-android-gps-project-site-config (TASK.md v1.0)
-- Baseline:  51195c3bb3410b49f49531f6cc841a2a2832ada1 (origin/main)
-- Origin:    T0 directive T1A — cấu hình GPS cho Project/Site hiện hữu;
--            metadata tối thiểu ghi nhận lần cấu hình GPS được Admin xác nhận.
--
-- SEMANTIC (T0 directive §5):
--   - ADDITIVE ONLY: 2 cột nullable trên `sites` + FK users ON DELETE SET NULL.
--     KHÔNG backfill; KHÔNG coi radius_meters mặc định 200 là confirmed —
--     marker chỉ được set qua save của Admin/BoD từ API (site-gps.service).
--   - Check-in chấm công chỉ chấp nhận site có lat+lng không null VÀ
--     geo_confirmed_at không null (fail-closed SITE_GEOFENCE_NOT_CONFIGURED).
--   - Forward-only: KHÔNG chỉnh migration trước (pattern 20261018120000).
--   - Idempotent: DO-block guard từng cột + FK; final assertion introspection
--     ⇒ RAISE EXCEPTION rollback nếu thiếu; chạy lại an toàn.
--
-- NOT APPLIED TO PRODUCTION: ship-only. T0/operator preflight + apply qua
-- psql có audit riêng. KHÔNG chạy lệnh nào lên DB từ task này.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- SECTION 1 — ADD COLUMN idempotent: geo_confirmed_at (nullable timestamp) +
-- geo_confirmed_by_id (nullable FK users SET NULL) theo Prisma mapping.
-- Prisma sẽ sinh: "sites_geo_confirmed_by_id_fkey" FOREIGN KEY (geo_confirmed_
-- by_id) REFERENCES "users"(id) ON DELETE SET NULL ON UPDATE CASCADE.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sites'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sites'
        AND column_name = 'geo_confirmed_at'
    ) THEN
      ALTER TABLE sites ADD COLUMN geo_confirmed_at TIMESTAMP(3);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sites'
        AND column_name = 'geo_confirmed_by_id'
    ) THEN
      ALTER TABLE sites ADD COLUMN geo_confirmed_by_id TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' AND t.relname = 'sites'
        AND c.conname = 'sites_geo_confirmed_by_id_fkey'
        AND c.contype = 'f'
        AND c.confrelid = 'users'::regclass
    ) THEN
      ALTER TABLE sites
        ADD CONSTRAINT sites_geo_confirmed_by_id_fkey
        FOREIGN KEY (geo_confirmed_by_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- SECTION 2 — Final assertion: cả 2 cột + FK SET NULL phải tồn tại; fail =>
-- RAISE EXCEPTION => rollback.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_col_at   int := 0;
  v_col_by   int := 0;
  v_fk_setnull int := 0;
BEGIN
  SELECT count(*) INTO v_col_at
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sites'
      AND column_name = 'geo_confirmed_at';
  SELECT count(*) INTO v_col_by
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sites'
      AND column_name = 'geo_confirmed_by_id';
  IF v_col_at <> 1 OR v_col_by <> 1 THEN
    RAISE EXCEPTION 'site_gps_confirmation assertion failed: geo_confirmed_at/geo_confirmed_by_id missing (at=%, by=%). Migration rolled back.', v_col_at, v_col_by;
  END IF;

  SELECT count(*) INTO v_fk_setnull
    FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'sites'
      AND c.conname = 'sites_geo_confirmed_by_id_fkey'
      AND c.contype = 'f'
      AND c.confrelid = 'users'::regclass
      AND ('(' || pg_get_constraintdef(c.oid, true) || ')') LIKE '%ON DELETE SET NULL%';
  IF v_fk_setnull <> 1 THEN
    RAISE EXCEPTION 'site_gps_confirmation assertion failed: FK geo_confirmed_by_id -> users ON DELETE SET NULL missing (count=%). Migration rolled back.', v_fk_setnull;
  END IF;
END
$$;
