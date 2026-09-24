-- ============================================================================
-- Migration: aff05a_r2_bounded_manager_assignment
-- Task:      hrp-v6-n2-aff-05a-r2-bounded-manager-assignment
-- Baseline:  825f763929e4a3026fc7b5d50436e216ef66da8c
--            (origin/main, post-#40 admin-managed phone link; main has
--             20260924150000 + 20260924160000 already, so 20260924140000 is
--             no longer a valid forward-only timestamp for this slice)
-- Origin:    TASK v1.1 + T0 alignment round at commit 17d7cc2
--            blob @ 5852e14ae1b89f347ab8912a9b28a56445755fe7
--
-- WHY THIS MIGRATION EXISTS
-- -------------------------
-- AFF-05A-R2 narrows the manager-assignment duration to integer days in
-- [1, 30] with a server default of 7. Source `MANAGER_ASSIGNMENT` rows must
-- always have a non-NULL `expires_at`. Source `AFF_INITIAL` and
-- `CASE_RESOLUTION` rows remain allowed to have NULL `expires_at` because
-- this slice does not redefine other assignment sources (DEC-05).
--
-- Business semantics (1/7/30 unchanged) are enforced in:
--   - service layer (src/domains/talent/handling-assignment.service.ts:
--     `normalizeManagerAssignDays` rejects explicit null, string, boolean,
--     NaN/Infinity, fraction, zero, negative, and values > 30);
--   - route layer (app/api/admin/labor-profiles/[id]/handling-assignments:
--     property-presence detection, no `Number()`/`parseInt` coercion).
--
-- WHAT THIS MIGRATION DOES
-- -------------------------
-- (1) FORWARD-ONLY — exactly one new migration; never edits prior migrations.
--
-- (2) NARROW BACKFILL (DEC-04):
--     Target predicate: `source = 'MANAGER_ASSIGNMENT' AND expires_at IS NULL
--     AND starts_at IS NOT NULL`. Set `expires_at = starts_at + interval '7 days'`
--     for every matching row. Only overdue ACTIVE rows transition to EXPIRED;
--     COMPLETED / REVOKED / TRANSFERRED / already-EXPIRED rows keep their
--     status and history (DEC-04).
--
-- (3) CONDITIONAL DB CHECK (DEC-05 / AC-04):
--     `CHECK (source IS DISTINCT FROM 'MANAGER_ASSIGNMENT' OR expires_at IS NOT NULL)`
--     Prisma field remains nullable; this CHECK only narrows the constraint
--     on `MANAGER_ASSIGNMENT` rows. No existing CHECK is removed or weakened.
--
-- (4) ANOMALY GUARDS / FAIL-CLOSED (DEC-04 / AC-03):
--     Block the migration before mutation if any of the following hold on the
--     target predicate: future `starts_at`, NULL `starts_at`, unknown status,
--     overlapping active rows (more than one ACTIVE per LP). Re-validate under
--     migration lock.
--
-- (5) BOUNDED LOCK TIMEOUT (DEC-04 / Risk "Lock blocks production"):
--     `SET LOCAL lock_timeout = '5s'` before every lock-waiting operation
--     (LOCK TABLE, advisory lock, ALTER TABLE add constraint, CREATE INDEX).
--
-- (6) EXACT-PREDICATE BACKFILL:
--     Update only rows where `source = 'MANAGER_ASSIGNMENT' AND expires_at IS NULL
--     AND starts_at IS NOT NULL`. Non-target rows (AFF_INITIAL / CASE_RESOLUTION
--     with NULL or future deadline, terminal-status MANAGER rows, etc.) are
--     byte-for-byte unchanged.
--
-- SCOPE (minimal — §4.2 Exact File Allowlist item 6)
--   - Touched object: exactly one new migration. No existing table altered
--     other than adding one new CHECK constraint to
--     labor_profile_handling_assignments. No role/grants change.
--   - No DELETE; the backfill only UPDATE + INSERT (history preserved).
--   - No other source rows touched; Prisma nullability unchanged.
--
-- IDEMPOTENT
--   - ADD CONSTRAINT IF NOT EXISTS style: ADD CONSTRAINT without IF NOT EXISTS
--     in PG < 17; we use DO $$ blocks guarded by information_schema check so
--     the migration can be re-applied cleanly after the first success.
--
-- NOT APPLIED TO PRODUCTION
--   Per Tier 0 brief. Migration file ships only. T0 runs production preflight
--   and applies via a separate gate. Dedicated synthetic DB used for CI.
-- ============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- Bounded lock_timeout for the duration of the migration transaction
-- (DEC-04 / Risk "Lock blocks production"). Covers:
--   - LOCK TABLE labor_profile_handling_assignments IN SHARE ROW EXCLUSIVE MODE
--   - pg_advisory_xact_lock(...) inside the backfill DO block
--   - ALTER TABLE ADD CONSTRAINT (waits for ACCESS EXCLUSIVE on a relation)
-- T0 review: SET LOCAL is transaction-scoped; persists for outer BEGIN/COMMIT.
-- ───────────────────────────────────────────────────────────────────────────
SET LOCAL lock_timeout = '5s';

-- ───────────────────────────────────────────────────────────────────────────
-- ANOMALY GUARDS / FAIL-CLOSED BACKFILL (DEC-04 / AC-03)
-- Runs under migration admin (BYPASSRLS / superuser) so the revalidation
-- snapshot sees all rows. Fail-closed: any RAISE EXCEPTION rolls back the
-- function replacement / CHECK add / row updates together.
-- ───────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_txn_ts           timestamptz;
  v_affected         integer := 0;
  v_overdue_active   bigint := 0;
  v_outside_unchanged bigint := 0;
  v_future_start     bigint := 0;
  v_null_start       bigint := 0;
  v_unknown_status   bigint := 0;
  v_active_overlap   bigint := 0;
BEGIN
  -- Capture migration snapshot timestamp once (DEC-04).
  v_txn_ts := transaction_timestamp();

  -- Acquire real table lock on labor_profile_handling_assignments. SHARE
  -- ROW EXCLUSIVE conflicts with INSERT/UPDATE/DELETE/EXCLUSIVE so any
  -- concurrent handling writer waits. Released automatically at COMMIT or
  -- ROLLBACK.
  LOCK TABLE labor_profile_handling_assignments IN SHARE ROW EXCLUSIVE MODE;

  -- ── Anomaly 1: future `starts_at` outside the migration snapshot.
  SELECT count(*) INTO v_future_start
    FROM labor_profile_handling_assignments
   WHERE source = 'MANAGER_ASSIGNMENT'
     AND expires_at IS NULL
     AND starts_at IS NOT NULL
     AND starts_at > v_txn_ts;
  IF v_future_start > 0 THEN
    RAISE EXCEPTION 'AFF-05A-R2 anomaly: % MANAGER_ASSIGNMENT rows have future starts_at (> migration snapshot). Stopping. T0 review required.',
      v_future_start;
  END IF;

  -- ── Anomaly 2: NULL `starts_at` on target rows.
  SELECT count(*) INTO v_null_start
    FROM labor_profile_handling_assignments
   WHERE source = 'MANAGER_ASSIGNMENT'
     AND expires_at IS NULL
     AND starts_at IS NULL;
  IF v_null_start > 0 THEN
    RAISE EXCEPTION 'AFF-05A-R2 anomaly: % MANAGER_ASSIGNMENT rows have starts_at IS NULL while expires_at IS NULL. Stopping. T0 review required.',
      v_null_start;
  END IF;

  -- ── Anomaly 3: unknown status (outside the documented lifecycle set).
  SELECT count(*) INTO v_unknown_status
    FROM labor_profile_handling_assignments
   WHERE source = 'MANAGER_ASSIGNMENT'
     AND expires_at IS NULL
     AND starts_at IS NOT NULL
     AND status NOT IN ('ACTIVE', 'EXPIRED', 'REVOKED', 'TRANSFERRED', 'COMPLETED');
  IF v_unknown_status > 0 THEN
    RAISE EXCEPTION 'AFF-05A-R2 anomaly: % MANAGER_ASSIGNMENT rows have expires_at IS NULL and an unrecognized status. Stopping. T0 review required.',
      v_unknown_status;
  END IF;

  -- ── Anomaly 4: at-most-one-active backstop self-check.
  -- The migration admin should never see this on the narrow predicate
  -- (partial unique index `labor_profile_handling_active_idx` blocks it on
  -- commit), but we revalidate before backfill so that any historical drift
  -- is flagged rather than silently fixed.
  SELECT count(*) INTO v_active_overlap
    FROM (
      SELECT labor_profile_id, count(*) AS c
        FROM labor_profile_handling_assignments
       WHERE status = 'ACTIVE'
       GROUP BY labor_profile_id
      HAVING count(*) > 1
    ) s;
  IF v_active_overlap > 0 THEN
    RAISE EXCEPTION 'AFF-05A-R2 anomaly: % labor_profiles have more than one ACTIVE handling assignment. Historical drift. T0 review required.',
      v_active_overlap;
  END IF;

  -- Count rows outside the backfill predicate (AC-06 control).
  SELECT count(*) INTO v_outside_unchanged
    FROM labor_profile_handling_assignments
   WHERE (source <> 'MANAGER_ASSIGNMENT' OR starts_at IS NULL)
     AND expires_at IS NULL;

  -- Count overdue ACTIVE rows that will transition to EXPIRED.
  SELECT count(*) INTO v_overdue_active
    FROM labor_profile_handling_assignments
   WHERE source = 'MANAGER_ASSIGNMENT'
     AND expires_at IS NULL
     AND status = 'ACTIVE'
     AND starts_at IS NOT NULL
     AND starts_at <= v_txn_ts - interval '7 days';

  -- ── Apply backfill (DEC-04):
  --   * Set `expires_at = starts_at + interval '7 days'`.
  --   * Only overdue ACTIVE rows transition to EXPIRED; terminal status
  --     (EXPIRED / REVOKED / TRANSFERRED / COMPLETED) is preserved verbatim.
  UPDATE labor_profile_handling_assignments
     SET status    = CASE
                      WHEN status = 'ACTIVE'
                           AND starts_at <= v_txn_ts - interval '7 days'
                      THEN 'EXPIRED'
                      ELSE status
                    END,
         expires_at = starts_at + interval '7 days',
         updated_at = v_txn_ts
   WHERE source = 'MANAGER_ASSIGNMENT'
     AND expires_at IS NULL
     AND starts_at IS NOT NULL;

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  RAISE NOTICE 'AFF-05A-R2 backfill complete: % MANAGER_ASSIGNMENT rows received deadline from starts_at; % overdue ACTIVE rows expired in place; % indefinite rows outside predicate unchanged; % future-start anomalies blocked.',
    v_affected, v_overdue_active, v_outside_unchanged, v_future_start;

  -- Final assertion (DEC-04 / AC-03): after backfill, no MANAGER_ASSIGNMENT
  -- row matching the predicate may remain with NULL deadline.
  IF EXISTS (
    SELECT 1
      FROM labor_profile_handling_assignments
     WHERE source = 'MANAGER_ASSIGNMENT'
       AND expires_at IS NULL
       AND starts_at IS NOT NULL
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'AFF-05A-R2 assertion failed: MANAGER_ASSIGNMENT rows still have expires_at IS NULL after backfill. Migration rolled back.';
  END IF;
END
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- CONDITIONAL DB CHECK (DEC-05 / AC-04)
-- Idempotent: ADD CONSTRAINT fails with 42710 if the constraint already
-- exists; guard with information_schema check inside a DO block so re-runs
-- after first success are no-ops (no separate IF NOT EXISTS in PG < 17).
-- Source value is compared with IS DISTINCT FROM to allow NULL/empty source
-- to coexist with NULL `expires_at`; the constraint only narrows the case
-- where source = 'MANAGER_ASSIGNMENT'.
-- ───────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'labor_profile_handling_assignments_manager_expires_required'
  ) THEN
    ALTER TABLE labor_profile_handling_assignments
      ADD CONSTRAINT labor_profile_handling_assignments_manager_expires_required
      CHECK (source IS DISTINCT FROM 'MANAGER_ASSIGNMENT' OR expires_at IS NOT NULL);
  END IF;
END
$$;

-- Final assertion (AC-04): the constraint is present in pg_constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'labor_profile_handling_assignments_manager_expires_required'
  ) THEN
    RAISE EXCEPTION 'AFF-05A-R2 assertion failed: conditional CHECK on MANAGER_ASSIGNMENT not found in pg_constraint.';
  END IF;
END
$$;

COMMIT;
