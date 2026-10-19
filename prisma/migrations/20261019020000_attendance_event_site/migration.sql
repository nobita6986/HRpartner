-- Keep the exact confirmed Site used for Android GPS check-ins on the event.
ALTER TABLE "attendance_events"
  ADD COLUMN IF NOT EXISTS "site_id" TEXT;
ALTER TABLE "attendance_events"
  ADD COLUMN IF NOT EXISTS "mobile_action" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_events_site_id_fkey'
      AND conrelid = 'attendance_events'::regclass
  ) THEN
    ALTER TABLE "attendance_events"
      ADD CONSTRAINT "attendance_events_site_id_fkey"
      FOREIGN KEY ("site_id") REFERENCES "sites"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "attendance_events_site_id_idx"
  ON "attendance_events"("site_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_events_worker_day_mobile_action_key'
      AND conrelid = 'attendance_events'::regclass
  ) THEN
    ALTER TABLE "attendance_events"
      ADD CONSTRAINT "attendance_events_worker_day_mobile_action_key"
      UNIQUE ("worker_id", "work_date", "mobile_action");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'attendance_events'
      AND column_name = 'site_id'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_events_site_id_fkey'
      AND conrelid = 'attendance_events'::regclass
      AND contype = 'f'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_events_worker_day_mobile_action_key'
      AND conrelid = 'attendance_events'::regclass
      AND contype = 'u'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'attendance_events'
      AND column_name = 'mobile_action'
  ) THEN
    RAISE EXCEPTION 'attendance_events.site_id forward migration assertion failed';
  END IF;
END $$;
