-- Migration: hrp-t1c-jobposting-media-youtube (RQ-01, DEC-01)
-- Plan: docs/tasks/hrp-t1c-jobposting-media-youtube/TASK.md v1.0
-- ADD-only migration: thêm 1 cột nullable, không sửa schema cũ, không RLS change,
-- không backfill. Pre-P2 gate giữa JobPosting editor (AV2) và P2 rich-text media.
--
-- Cột `youtube_video_id` lưu raw 11-char video ID đã được server-side extract từ
-- URL `youtube.com` / `youtu.be` qua helper `extractYouTubeVideoId`. KHÔNG lưu URL
-- gốc để chặn drift (URL params, /shorts/ → /watch/ chuyển dạng, v.v.).
--
-- Public render dùng `https://www.youtube-nocookie.com/embed/{videoId}?rel=0`
-- ở `app/(jobs)/viec-lam/[slug]/page.tsx` (đã freeze bởi P1-A1).

ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS youtube_video_id TEXT;