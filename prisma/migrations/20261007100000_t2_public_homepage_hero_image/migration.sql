-- ============================================================================
-- Migration: t2_public_homepage_hero_image
-- Task:      hrp-t2-public-site-hotfix (TASK.md v1.0)
-- Baseline:  8f93178a81c9f35c6f9be1e016bc4377928db185 (origin/main)
--
-- ADD-ONLY migration: thêm cột `hero_image_media_id` vào `homepage_settings`
-- để Admin → Cài đặt có thể chọn ảnh nền (Hero) trang chủ từ Media Library.
--
-- Contract:
--   1. Column nullable — singleton row hiện tại (id='default') KHÔNG bị backfill;
--      Admin chọn ảnh lần đầu sẽ insert id. NULL = Hero render gradient-only
--      (giữ nguyên hành vi public hiện tại).
--   2. FK tới `media(id) ON DELETE SET NULL` — nếu media row bị xoá, cột tự
--      set NULL và Hero fallback gradient; KHÔNG cascade xoá HomepageSettings.
--      Media là admin-only table, không RLS-gated; FK vẫn cho phép HRP_SELF/
--      public connections đọc join ngay khi admin set image.
--   3. KHÔNG đổi schema cũ; KHÔNG đổi RLS của bất kỳ bảng nào; KHÔNG drop
--      constraint hiện hữu; KHÔNG thay đổi các cột HomepageSettings khác.
--   4. KHÔNG thêm policy/grant vì `homepage_settings` đã có singleton CHECK
--       constraint (`id='default'`); việc đọc admin đi qua admin prisma (no RLS).
-- ============================================================================

ALTER TABLE "homepage_settings"
  ADD COLUMN "hero_image_media_id" TEXT;

ALTER TABLE "homepage_settings"
  ADD CONSTRAINT "homepage_settings_hero_image_media_id_fkey"
  FOREIGN KEY ("hero_image_media_id")
  REFERENCES "media" ("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;