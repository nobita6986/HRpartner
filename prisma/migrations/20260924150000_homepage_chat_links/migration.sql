-- Admin-managed public chat launcher destinations.
-- Existing installations remain disabled until an administrator supplies URLs.
ALTER TABLE "homepage_settings"
  ADD COLUMN "zalo_chat_url" TEXT,
  ADD COLUMN "messenger_chat_url" TEXT;

ALTER TABLE "homepage_settings"
  ADD CONSTRAINT "homepage_settings_zalo_chat_url_check"
    CHECK (
      "zalo_chat_url" IS NULL OR (
        length("zalo_chat_url") <= 2048
        AND "zalo_chat_url" ~* '^https://(zalo\.me|oa\.zalo\.me|chat\.zalo\.me)([/?#]|$)'
      )
    ),
  ADD CONSTRAINT "homepage_settings_messenger_chat_url_check"
    CHECK (
      "messenger_chat_url" IS NULL OR (
        length("messenger_chat_url") <= 2048
        AND "messenger_chat_url" ~* '^https://(m\.me|messenger\.com|www\.messenger\.com)([/?#]|$)'
      )
    );
