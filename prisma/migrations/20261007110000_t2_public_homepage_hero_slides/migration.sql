-- ============================================================================
-- Migration: t2_public_homepage_hero_slides
-- Task:      hrp-t1c-t2-public-site-hero-slides-ctv-layout (TASK.md v1.0)
-- Baseline:  2495239535d4326a36a617ce8d7694c6867f7164 (origin/main)
-- T0 choice: A1 (JSON cột) — chốt qua AskQuestion 2026-10-07
--
-- ADD-ONLY migration: thêm cột `hero_slides` vào `homepage_settings` để
-- Admin → Cài đặt có thể sửa ảnh + title + desc của 5 slide Hero (carousel
-- bên phải trang chủ `RecruitmentHighlight`). JSON array 5 phần tử:
--   { mediaId: string|null, title: string, desc: string }
--
-- Contract:
--   1. Column nullable JSON — singleton row hiện tại (id='default') KHÔNG bị
--      backfill; admin lưu slide lần đầu sẽ insert JSON. NULL → service
--      fallback mảng hardcoded (giữ nguyên v1).
--   2. KHÔNG FK-enforce `mediaId` trong JSON (Media library đã gate admin-only,
--      không RLS-gated; xoá media → JSON giữ nguyên id cũ, service tự detect
--      null khi lookup và fallback URL mặc định).
--   3. KHÔNG đổi schema cũ; KHÔNG đổi RLS của bất kỳ bảng nào; KHÔNG drop
--      constraint hiện hữu; KHÔNG thay đổi các cột HomepageSettings khác.
--   4. KHÔNG thêm policy/grant vì `homepage_settings` đã có singleton CHECK
--      constraint (`id='default'`); việc đọc admin đi qua admin prisma.
-- ============================================================================

ALTER TABLE "homepage_settings"
  ADD COLUMN "hero_slides" JSONB;