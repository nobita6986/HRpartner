-- ============================================================================
-- Migration: hrp-v6-n2-aff-04-conversion-propagation
-- Task:      hrp-v6-n2-aff-04-conversion-propagation
-- Baseline:  9e527a13e74c8361feea77b8edca522c8c37ec08 (origin/main @ 2026-09-23)
-- Origin:    AFF-04 forward-only — Source Resolution Matrix + Assignment propagation
--            (TASK v1.6 @ e73ac9d; contract authority v1.4 @ f3f0a23f2fa6d590f188403687d317da64f4d91e)
--
-- WHY THIS MIGRATION EXISTS
-- -------------------------
-- AFF-04 closes two gaps left by AFF-03/03B/03C and AFF-05A:
--
--   (a) `source_claims.ctv_id` is a plain column with NO named Prisma relation and no FK
--       named-relation back-link on `users`. AFF-04 binds it to a NAMED relation
--       ("SourceClaimLegacyCtv") and adds a NEW nullable column `referrer_user_id` (no
--       DEFAULT — T0 decision b) with FK + named relation ("SourceClaimGenericReferrer").
--       The new column carries the generic referrer identity (CTV referrer post-promotion,
--       AFF Initial handler, Manager-assigned handler). NULL is the sentinel for
--       HRP_DIRECT / VENDOR / unresolved legacy CTV — backfilled forward-only.
--
--   (b) `project_assignments.referrer_id` is a TEXT column without FK constraint and
--       without a named Prisma relation. AFF-04 adds the FK (ON DELETE RESTRICT — we
--       never silently drop provenance), a named relation ("AssignmentReferrer") and a
--       composite index `[referrer_id, status]` for placement-by-referrer audit lookup.
--
-- WHAT THIS MIGRATION DOES
-- -------------------------
-- (1) PREROLL preflight (fail-closed):
--     - Assert NO non-CTV_REFERRAL row has a non-null ctv_id (predicate from TASK §3).
--     - Assert NO accepted CTV_REFERRAL row has ctv_id IS NULL (fail-closed predicate).
--     - Assert NO existing project_assignments.referrer_id points to a missing user
--       (orphan preflight; orphans will block the FK we are about to add).
--
-- (2) FORWARD-ONLY SCHEMA:
--     - ADD COLUMN source_claims.referrer_user_id TEXT (no DEFAULT — T0 decision b).
--     - ADD CONSTRAINT source_claims_referrer_user_id_fkey FK -> users(id) ON DELETE RESTRICT.
--     - CREATE INDEX source_claims_referrer_user_id_accepted_idx ON (referrer_user_id, accepted).
--     - ADD CONSTRAINT project_assignments_referrer_id_fkey FK -> users(id) ON DELETE RESTRICT.
--       (column already exists since mp3_conversion_worker_link; no ADD COLUMN needed).
--     - CREATE INDEX project_assignments_referrer_id_status_idx ON (referrer_id, status).
--
-- (3) BACKFILL (idempotent, forward-only):
--     - For every accepted CTV_REFERRAL row with ctv_id IS NOT NULL AND referrer_user_id IS NULL,
--       set referrer_user_id = ctv_id. The WHERE predicate makes this idempotent: a re-run
--       after a successful backfill matches zero rows.
--
-- (4) POST-CONDITION ASSERTION:
--     - Assert: every accepted CTV_REFERRAL row with ctv_id NOT NULL now has
--               referrer_user_id = ctv_id (no drift).
--     - Assert: zero project_assignments rows have referrer_id pointing to a missing user.
--
-- SCOPE (minimal — DEC-15)
--   - Touched tables: source_claims, project_assignments.
--   - No DELETE, no UPDATE on other tables, no GRANT changes, no role changes,
--     no SECURITY DEFINER RPC rewrites. The forward-only backfill UPDATE is the
--     only DML on existing data.
--   - The two pre-existing partial unique indexes (one_accepted_source,
--     one_accepted_source_per_submission) are PRESERVED verbatim — not dropped, not
--     rebuilt. The new column is nullable so it does not interact with them.
--
-- IDEMPOTENT
--   - Preflight reads only — safe on first run and on re-run.
--   - ADD COLUMN IF NOT EXISTS pattern not used (forward-only); a re-run after a successful
--     apply will fail at the ADD CONSTRAINT step (relation already exists) — that is the
--     desired fail-closed behavior for migrations outside clean-chain (upgrade-path tests
--     start from an empty schema).
--   - Backfill UPDATE is idempotent (WHERE clause filters out already-backfilled rows).
--   - Post-condition assertions re-verify after backfill.
--
-- NOT APPLIED TO PRODUCTION
--   Per Tier 0 brief: "KHONG apply migration len production". Tier 1 ships the migration
--   file; T0/Owner applies to production as a separate gate after the integration suite
--   has PASSed on writable staging / ephemeral DB.
-- ============================================================================

-- ───────────────────────────────────────────────────────────────────────────
-- (1) PREROLL preflight — fail closed on any predicate violation
-- ───────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_bad_non_ctv     bigint := 0;
  v_bad_ctv_null    bigint := 0;
  v_orphan_ref      bigint := 0;
BEGIN
  -- Predicate (TASK §3): Non-CTV claim dù có legacy ctv_id → Không backfill, must be NULL post-cleanup.
  SELECT count(*) INTO v_bad_non_ctv
    FROM source_claims
   WHERE claim_type <> 'CTV_REFERRAL'
     AND ctv_id IS NOT NULL;
  IF v_bad_non_ctv > 0 THEN
    RAISE EXCEPTION 'AFF-04 preflight FAIL: % source_claims row(s) are NOT CTV_REFERRAL but have non-null ctv_id. Reject migration (fail-closed).',
      v_bad_non_ctv
      USING ERRCODE = 'P0001';
  END IF;

  -- Predicate (TASK §3): Accepted CTV_REFERRAL thiếu ctv_id → Fail closed.
  SELECT count(*) INTO v_bad_ctv_null
    FROM source_claims
   WHERE claim_type = 'CTV_REFERRAL'
     AND accepted = true
     AND ctv_id IS NULL;
  IF v_bad_ctv_null > 0 THEN
    RAISE EXCEPTION 'AFF-04 preflight FAIL: % accepted CTV_REFERRAL row(s) have NULL ctv_id. Reject migration (fail-closed).',
      v_bad_ctv_null
      USING ERRCODE = 'P0001';
  END IF;

  -- Predicate (TASK §3): ProjectAssignment.referrerId orphan → Fail closed.
  SELECT count(*) INTO v_orphan_ref
    FROM project_assignments pa
   WHERE pa.referrer_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = pa.referrer_id);
  IF v_orphan_ref > 0 THEN
    RAISE EXCEPTION 'AFF-04 preflight FAIL: % project_assignments row(s) have orphan referrer_id (no matching users.id). Reject migration (fail-closed).',
      v_orphan_ref
      USING ERRCODE = 'P0001';
  END IF;

  RAISE NOTICE 'AFF-04 preflight PASS: 0 non-CTV ctv_id, 0 accepted CTV_REFERRAL with NULL ctv_id, 0 orphan referrer_id';
END
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- (2) FORWARD-ONLY SCHEMA — source_claims
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE "source_claims"
  ADD COLUMN "referrer_user_id" TEXT;

ALTER TABLE "source_claims"
  ADD CONSTRAINT "source_claims_referrer_user_id_fkey"
  FOREIGN KEY ("referrer_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "source_claims_referrer_user_id_accepted_idx"
  ON "source_claims"("referrer_user_id", "accepted");

-- ───────────────────────────────────────────────────────────────────────────
-- (3) FORWARD-ONLY SCHEMA — project_assignments
-- (column referrer_id already exists since migration 20260824143000_mp3_conversion_worker_link)
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE "project_assignments"
  ADD CONSTRAINT "project_assignments_referrer_id_fkey"
  FOREIGN KEY ("referrer_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "project_assignments_referrer_id_status_idx"
  ON "project_assignments"("referrer_id", "status");

-- ───────────────────────────────────────────────────────────────────────────
-- (4) BACKFILL (idempotent, forward-only)
--   Only accepted CTV_REFERRAL rows with non-null ctv_id are migrated.
--   After a successful apply, the WHERE clause matches zero rows on re-run.
-- ───────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_affected integer := 0;
BEGIN
  UPDATE source_claims sc
     SET referrer_user_id = sc.ctv_id
   WHERE sc.claim_type = 'CTV_REFERRAL'
     AND sc.accepted = true
     AND sc.ctv_id IS NOT NULL
     AND sc.referrer_user_id IS NULL;

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  RAISE NOTICE 'AFF-04 backfill: % source_claims row(s) promoted from ctv_id -> referrer_user_id (CTV_REFERRAL accepted only).',
    v_affected;
END
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- (5) POST-CONDITION ASSERTION — re-verify invariants after backfill
-- ───────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_drift_ctv     bigint := 0;
  v_orphan_after  bigint := 0;
  v_dupes         bigint := 0;
BEGIN
  -- Every accepted CTV_REFERRAL with ctv_id NOT NULL now has referrer_user_id = ctv_id.
  SELECT count(*) INTO v_drift_ctv
    FROM source_claims
   WHERE claim_type = 'CTV_REFERRAL'
     AND accepted = true
     AND ctv_id IS NOT NULL
     AND (referrer_user_id IS NULL OR referrer_user_id <> ctv_id);
  IF v_drift_ctv > 0 THEN
    RAISE EXCEPTION 'AFF-04 post-condition FAIL: % accepted CTV_REFERRAL row(s) drift between ctv_id and referrer_user_id. Reject.',
      v_drift_ctv
      USING ERRCODE = 'P0001';
  END IF;

  -- No orphan referrer_id on project_assignments.
  SELECT count(*) INTO v_orphan_after
    FROM project_assignments pa
   WHERE pa.referrer_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = pa.referrer_id);
  IF v_orphan_after > 0 THEN
    RAISE EXCEPTION 'AFF-04 post-condition FAIL: % project_assignments orphan referrer_id rows after FK add. Reject.',
      v_orphan_after
      USING ERRCODE = 'P0001';
  END IF;

  -- The two pre-existing partial unique indexes must still be present (defense in depth).
  SELECT count(*) INTO v_dupes
    FROM pg_indexes
   WHERE schemaname = 'public'
     AND tablename = 'source_claims'
     AND indexname IN ('one_accepted_source', 'one_accepted_source_per_submission');
  IF v_dupes < 2 THEN
    RAISE EXCEPTION 'AFF-04 post-condition FAIL: source_claims partial unique indexes missing (count=%, expected 2). Reject.',
      v_dupes
      USING ERRCODE = 'P0001';
  END IF;

  RAISE NOTICE 'AFF-04 post-condition PASS: 0 drift, 0 orphan, 2/2 partial unique indexes preserved';
END
$$;
