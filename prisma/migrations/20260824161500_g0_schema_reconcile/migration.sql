-- G0-01: reconcile the historical migration chain with schema.prisma.
-- Forward-only and deterministic on both a clean database and an upgraded database.

ALTER TABLE "attendance_events"
  ALTER COLUMN "geofence_result" SET DATA TYPE TEXT;

ALTER TABLE "push_subscriptions" DROP CONSTRAINT "push_subscriptions_pkey";
ALTER TABLE "push_subscriptions"
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "id" SET DATA TYPE TEXT,
  ALTER COLUMN "user_id" SET DATA TYPE TEXT,
  ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3)
    USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "push_subscriptions"
  ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");
ALTER INDEX "idx_push_subscriptions_user_id"
  RENAME TO "push_subscriptions_user_id_idx";

CREATE TABLE "ctv_withdrawal_requests" (
  "id" TEXT NOT NULL,
  "ctv_id" TEXT NOT NULL,
  "amount_vnd" BIGINT NOT NULL,
  "bank_account" TEXT NOT NULL,
  "bank_name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ctv_withdrawal_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ctv_withdrawal_requests_ctv_id_status_idx"
  ON "ctv_withdrawal_requests"("ctv_id", "status");
CREATE INDEX "ctv_withdrawal_requests_status_created_at_idx"
  ON "ctv_withdrawal_requests"("status", "created_at");

-- Runtime grants are conditional because clean CI databases may provision roles
-- after schema deployment. The role bootstrap script repeats these idempotently.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user_writer') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA public TO app_user_writer';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user_writer';
    EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user_writer';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user_writer';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user_writer';
  END IF;
END
$$;