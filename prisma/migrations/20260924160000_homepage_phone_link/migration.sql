-- Admin-managed public phone launcher destination.
-- Existing installations remain disabled until an administrator supplies a number.
ALTER TABLE "homepage_settings"
  ADD COLUMN "phone_call_number" TEXT;

ALTER TABLE "homepage_settings"
  ADD CONSTRAINT "homepage_settings_phone_call_number_check"
    CHECK (
      "phone_call_number" IS NULL
      OR "phone_call_number" ~ '^\+?[0-9]{7,15}$'
    );
