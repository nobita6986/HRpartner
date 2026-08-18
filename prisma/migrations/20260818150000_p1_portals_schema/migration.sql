-- Migration: p1_portals_schema
-- Purpose: P1 Portals STEP-01 (RQ-04, RQ-05) — GPS evidence + push subscriptions.
--
-- DEC-03: GPS columns on attendance_events (nullable):
--   gpsLatitude  DECIMAL(10,7)  -- degrees
--   gpsLongitude DECIMAL(10,7)  -- degrees
--   gpsAccuracyMeters INT       -- meters
--   geofenceResult VARCHAR     -- INSIDE | OUTSIDE | NONE
--
-- DEC-05: push_subscriptions table for Web Push API.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. GPS columns on attendance_events
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_events') THEN
    -- Add columns only if they don't exist (idempotent)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'attendance_events' AND column_name = 'gps_latitude'
    ) THEN
      ALTER TABLE attendance_events
        ADD COLUMN gps_latitude DECIMAL(10, 7),
        ADD COLUMN gps_longitude DECIMAL(10, 7),
        ADD COLUMN gps_accuracy_meters INT,
        ADD COLUMN geofence_result VARCHAR(20);
    END IF;
  END IF;
END$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. push_subscriptions table
--    scope: userId (worker or employee), per device (endpoint)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar(36),
  user_id     VARCHAR(36) NOT NULL,
  endpoint    TEXT        NOT NULL,
  p256dh      TEXT        NOT NULL,
  auth        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
