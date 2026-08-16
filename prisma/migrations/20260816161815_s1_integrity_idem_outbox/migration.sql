-- Migration: s1_integrity_idem_outbox
-- Purpose: STEP-01 / RQ-01 — Phase 3 Integrity dev migration.
--   - AuditLog: thêm 3 cột nullable reason / ip_address / user_agent (DEC-03)
--   - IdempotencyKey: bảng mới theo ADR-014 + DEC-02 (UNIQUE (actorId, route, key))
--   - OutboxEvent: bảng mới theo DEC-01 (PENDING/PROCESSED/FAILED + retry)
-- Apply: prisma migrate dev (qua directUrl=DATABASE_URL_ADMIN).
-- Verify:
--   \d+ audit_logs          → có cột reason, ip_address, user_agent (nullable)
--   \d+ idempotency_keys    → UNIQUE (actor_id, route, key)
--   \d+ outbox_events       → index (status, available_at)
--
-- �═══════════════════════════════════════════════════════════════════════
-- 1. AuditLog — bổ sung 3 cột nullable (DEC-03)
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE "audit_logs"
  ADD COLUMN "reason"     TEXT,
  ADD COLUMN "ip_address" TEXT,
  ADD COLUMN "user_agent" TEXT;

-- �═══════════════════════════════════════════════════════════════════════
-- 2. IdempotencyKey — DEC-02 / ADR-014
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE "idempotency_keys" (
    "id"           TEXT NOT NULL,
    "actor_id"     TEXT NOT NULL,
    "route"        TEXT NOT NULL,
    "key"          TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response"     JSONB NOT NULL DEFAULT '{}',
    "status_code"  INTEGER NOT NULL DEFAULT 200,
    "expires_at"   TIMESTAMP(3) NOT NULL,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uq_idempotency_keys_scope" UNIQUE ("actor_id", "route", "key"),

    PRIMARY KEY ("id")
);

CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");

-- ════════════════════════════════════════════════════════════════════════
-- 3. OutboxEvent — DEC-01 / D16 (b) in-process drain + cron daily safety net
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE "outbox_events" (
    "id"           TEXT NOT NULL,
    "event_type"   TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "payload"      JSONB NOT NULL DEFAULT '{}',
    "status"       TEXT NOT NULL DEFAULT 'PENDING',
    "retry_count"  INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error"   TEXT,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    PRIMARY KEY ("id")
);

CREATE INDEX "outbox_events_status_available_at_idx" ON "outbox_events"("status", "available_at");
CREATE INDEX "outbox_events_aggregate_id_idx" ON "outbox_events"("aggregate_id");
