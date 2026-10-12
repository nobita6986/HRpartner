-- hrp-ui-v1-job-card-stamps-brand (T1B) — forward-only ADD 2 BOOLEAN NOT NULL DEFAULT false.
--
-- Per T0 §B: migration timestamp `20261004120000_ui_v1_jobposting_stamp_flags` is strictly
-- greater than the latest migration `20260930090000_p1a05_hr_staff_job_openings_update_rls`
-- and is safe relative to the production-bound `20261004000000_f9b_r2_slot_scope_read_restore`
-- the T0 directive referenced.
--
-- Additive contract:
--   - `is_high_reward` (THƯỞNG CAO) + `is_expiring_soon` (SẮP HẾT HẠN) author-selected flags
--     on `job_postings`. NO heuristic backfill — existing rows keep `false` via NOT NULL DEFAULT.
--   - NO DROP / RENAME / CREATE FUNCTION / data mutation. Existing JobPosting rows giữ
--     nguyên ý nghĩa (cả 2 stamp mặc định false → author phải bật tay nếu muốn).
--   - Production migration = NOT_RUN per T0 §B.
ALTER TABLE "job_postings"
  ADD COLUMN "is_high_reward"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "is_expiring_soon" BOOLEAN NOT NULL DEFAULT false;
