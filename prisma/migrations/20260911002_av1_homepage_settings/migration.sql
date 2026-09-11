-- Migration: AV1 — Homepage Settings singleton
-- Plan UI B integration: bestJobsPageSize (3|6|9|12) + listingPageSize (6..50)
-- Singleton: chỉ row id='default' tồn tại. CHECK constraint ngăn INSERT khác id.
-- ADD-only: tạo bảng mới, không chạm schema cũ.

CREATE TABLE IF NOT EXISTS homepage_settings (
  id                  TEXT        PRIMARY KEY DEFAULT 'default',
  best_jobs_page_size INTEGER     NOT NULL    DEFAULT 9   CHECK (best_jobs_page_size IN (3, 6, 9, 12)),
  listing_page_size   INTEGER     NOT NULL    DEFAULT 12  CHECK (listing_page_size BETWEEN 6 AND 50),
  created_at          TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  -- users.id is Prisma String / PostgreSQL TEXT (UUID values are stored as text).
  -- Keep the FK column identical to the referenced physical type.
  updated_by_id       TEXT
);

CREATE INDEX IF NOT EXISTS idx_homepage_settings_updated_at
  ON homepage_settings(updated_at DESC);

-- Singleton invariant: DB-level ngăn insert row khác id.
-- Dùng function-based CHECK để tránh issue với literal DEFAULT trên PostgreSQL khi row không có id.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'homepage_settings_singleton'
  ) THEN
    ALTER TABLE homepage_settings
      ADD CONSTRAINT homepage_settings_singleton CHECK (id = 'default');
  END IF;
END $$;

-- Idempotent INSERT default row (chỉ insert nếu chưa có).
INSERT INTO homepage_settings (id, best_jobs_page_size, listing_page_size)
SELECT 'default', 9, 12
WHERE NOT EXISTS (SELECT 1 FROM homepage_settings WHERE id = 'default');

-- FK updated_by_id → users(id) — nullable, không cascade (audit: giữ row khi user bị xóa).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'homepage_settings_updated_by_id_fkey'
  ) THEN
    ALTER TABLE homepage_settings
      ADD CONSTRAINT homepage_settings_updated_by_id_fkey
      FOREIGN KEY (updated_by_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;
