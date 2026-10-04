-- Migration: ui2_public_content_controls
-- Task:      hrp-ui2-public-content-controls-sticky (TASK.md v1.1, Phase B)
-- Baseline:  796e13c69996756d1298bc1a7ec9b50bab935c9f (origin/main after
--            PR #94 + PR #95 merge). Phase A control head was
--            0d4a606ca3c522a606bf69e27a5340db6dc78e18. The forward-merge
--            commit is fb9ae379dcea3c422f3787f30bbe66fd69df0f13.
-- Origin:    T0 disposition 2026-10-04 16:21 ICT `RESUME UI2 PHASE B NOW`
--            after both PR #94 (T1B localization) and PR #95 (T1C PWA hotfix)
--            merged to main. Phase B is the canonical final-delivery surface
--            for UI2.
--
-- WHY THIS MIGRATION EXISTS
-- -------------------------
-- Phase A of UI2 delivered an isolated, hot-path-free module
-- (src/domains/job-board/public-content-controls/**) that materialised the
-- typed contracts, URL safety validator, content-revision hashing, animation
-- envelope, <StickyAnnouncement> component, and <NewsSectionGate> resolver.
-- Phase A deliberately did NOT persist any new state.
--
-- Phase B makes Phase A operational by adding two additive columns to the
-- canonical `homepage_settings` singleton:
--
--   * news_section_enabled  BOOLEAN NOT NULL DEFAULT TRUE
--     Single switch that lets an administrator hide the public
--     "Tin tức & Cẩm nang" section and its matching navbar entry without
--     deleting any article data. Default TRUE preserves the current public
--     rendering surface. Existing rows are forward-migrated in place by
--     Postgres (no backfill script required).
--
--   * sticky_announcement  JSONB
--     Nullable; the admin-managed payload of the bottom-anchored
--     `<StickyAnnouncement>` bar (enabled, message, CTA, animation, etc).
--     The DTO is validated server-side by Zod `StickyAnnouncementSchema`;
--     a NULL or invalid value yields a bar that does not render. A CHECK
--     constraint enforces that the column, when non-null, is a top-level
--     JSON object and is bounded in size (≤ 4 KB).
--
-- Non-goals
--   - NO RLS, GRANT, or role-matrix changes. The existing
--     `homepage_settings` ACL remains in effect.
--   - NO destructive change to existing columns or rows.
--   - NO second migration in this delivery. Phase B is single-migration
--     per T0 brief and per `prisma/migrations/2026*` policy.

ALTER TABLE "homepage_settings"
  ADD COLUMN "news_section_enabled" BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE "homepage_settings"
  ADD COLUMN "sticky_announcement" JSONB;

ALTER TABLE "homepage_settings"
  ADD CONSTRAINT "homepage_settings_sticky_announcement_check"
    CHECK (
      "sticky_announcement" IS NULL
      OR (
        jsonb_typeof("sticky_announcement") = 'object'
        AND octet_length("sticky_announcement"::text) <= 4096
      )
    );
