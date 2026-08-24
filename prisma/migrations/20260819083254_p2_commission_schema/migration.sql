-- Migration: p2_commission_schema
-- Purpose: P2 Commission STEP-01 (RQ-01) — 3 models cho group policy + ledger + debt.
--
-- ADR-013 (Record khóa bất biến): KHÔNG có @@unique trên ledger để cho phép
-- nhiều dòng CREDIT/REVERSAL cho cùng ctv+worker+month/year (milestones + clawback).
-- ADR-010: Mọi trường tiền BigInt (VND nguyên).
--
-- NOTE: Migration chỉ chứa 3 bảng commission. Các thay đổi schema khác
-- (attendance_events GPS, push_subscriptions) thuộc migration p1_portals_schema.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. commission_policies — chính sách hoa hồng (group + version)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS commission_policies (
  id            TEXT         PRIMARY KEY,
  name          TEXT         NOT NULL,
  calc_type     TEXT         NOT NULL, -- PER_HEAD_MILESTONE | PERCENT_OF_REVENUE
  value         BIGINT       NOT NULL, -- BigInt VND nguyên (ADR-010) — ý nghĩa theo calcType
  conditions    JSONB        NOT NULL DEFAULT '{}', -- milestones, scope, ...
  effective_from DATE        NOT NULL,
  effective_to  DATE,
  version       INTEGER      NOT NULL DEFAULT 1,
  created_by    TEXT,
  created_at    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS commission_policies_effective_from_effective_to_idx
  ON commission_policies(effective_from, effective_to);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. commission_ledger — sổ cái hoa hồng (append-only theo ADR-013)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS commission_ledger (
  id              TEXT         PRIMARY KEY,
  ctv_id          TEXT         NOT NULL,
  worker_id       TEXT, -- null nếu PERCENT_OF_REVENUE không gắn worker
  assignment_id   TEXT,
  policy_id       TEXT         NOT NULL,
  milestone       TEXT         NOT NULL, -- 'RETAINED_30_DAYS' | ...
  amount          BIGINT       NOT NULL, -- BigInt VND nguyên (ADR-010) — luôn dương
  direction       TEXT         NOT NULL, -- CREDIT | REVERSAL
  reversal_of_id  TEXT, -- chỉ REVERSAL
  month           INTEGER      NOT NULL,
  year            INTEGER      NOT NULL,
  status          TEXT         NOT NULL DEFAULT 'PENDING', -- PENDING | APPROVED | PAID | REJECTED
  created_by      TEXT,
  created_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_by     TEXT,
  approved_at     TIMESTAMP(3),
  paid_at         TIMESTAMP(3),
  rejected_by     TEXT,
  rejected_at     TIMESTAMP(3),
  rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS commission_ledger_ctv_id_month_year_idx
  ON commission_ledger(ctv_id, month, year);
CREATE INDEX IF NOT EXISTS commission_ledger_worker_id_month_year_idx
  ON commission_ledger(worker_id, month, year);
CREATE INDEX IF NOT EXISTS commission_ledger_status_idx
  ON commission_ledger(status);
CREATE INDEX IF NOT EXISTS commission_ledger_ctv_id_worker_id_month_year_milestone_idx
  ON commission_ledger(ctv_id, worker_id, month, year, milestone); -- idempotency lookup

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. commission_debts — nợ hoa hồng (V4.13 G21-B14)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS commission_debts (
  id               TEXT         PRIMARY KEY,
  ctv_id           TEXT         NOT NULL,
  origin_ledger_id TEXT, -- REVERSAL sinh ra debt này
  amount_vnd       BIGINT       NOT NULL, -- số tiền nợ ban đầu
  remaining_vnd    BIGINT       NOT NULL, -- số nợ còn lại (giảm khi netting)
  status           TEXT         NOT NULL DEFAULT 'OPEN', -- OPEN | PARTIAL | CLEARED
  reason           TEXT,
  created_at       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cleared_at       TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS commission_debts_ctv_id_status_idx
  ON commission_debts(ctv_id, status);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Foreign keys
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE commission_ledger
  ADD CONSTRAINT commission_ledger_policy_id_fkey
  FOREIGN KEY (policy_id) REFERENCES commission_policies(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE commission_ledger
  ADD CONSTRAINT commission_ledger_reversal_of_id_fkey
  FOREIGN KEY (reversal_of_id) REFERENCES commission_ledger(id)
  ON DELETE SET NULL ON UPDATE CASCADE;
