-- ============================================================================
-- Migration: er003_evidence_record_metadata
-- Task:      hrp-p0-a04-er003-evidence-record-metadata
-- Baseline:  1e1895d16500b273575599cf88853e0d48f08e23
--            (origin/main, post-AFF-04 production-verified #36)
-- Origin:    ER-003 forward-only — EvidenceRecord metadata boundary
--            (TASK v1.2 @ this worktree; contract authority v1.1
--             blob 4ec7160732a4c106d991f596d570708c1b6717a8
--             @ 5852e14ae1b89f347ab8912a9b28a56445755fe7)
--
-- WHY THIS MIGRATION EXISTS
-- -------------------------
-- ER-003 establishes a Neon `evidence_records` metadata boundary for one
-- canonical owner kind in this first slice: `LABOR_PROFILE`. The table
-- stores METADATA ONLY — never file bytes, public URLs, absolute filesystem
-- paths, provider roots, credentials, request payloads, or `bytea`.
--
-- Application authorization is NOT introduced in this slice. The table
-- ships fail-closed: RLS is enabled and forced; `PUBLIC`, `app_user`,
-- and `app_user_writer` receive no privilege and no policy. A separately
-- reviewed runtime slice (ER-005 / ER-006) must introduce grants and
-- policies together with canonical authorization — they are explicitly
-- deferred by ER003-DEC-07 and ER003-DEC-09.
--
-- WHAT THIS MIGRATION DOES
-- -------------------------
-- (1) FORWARD-ONLY SCHEMA:
--     - CREATE TABLE evidence_records
--     - FK evidence_records_owner_id_fkey        → labor_profiles(id) RESTRICT
--       (no orphan owner record; DEC-02)
--     - FK evidence_records_created_by_user_id_fkey → users(id) RESTRICT
--       (nullable column; DEC-08)
--     - UNIQUE INDEX evidence_records_storage_key_key ON (storage_key)
--     - INDEX evidence_records_owner_listing_idx ON (owner_type, owner_id, created_at)
--     - INDEX evidence_records_created_by_user_id_idx ON (created_by_user_id)
--
-- (2) STRUCTURAL CHECK CONSTRAINTS — DB-enforced invariants:
--     - evidence_records_owner_type_check   = 'LABOR_PROFILE'
--       (DB-locked; future owner kinds require a new migration/contract)
--     - evidence_records_evidence_type_check ∈ plan's six values
--     - evidence_records_status_check ∈ plan's four lifecycle values
--     - evidence_records_checksum_check    = lowercase 64-char SHA-256 hex
--     - evidence_records_size_bytes_check   >= 0
--     - evidence_records_storage_key_check NOT URL-shaped and NOT absolute path
--     - evidence_records_original_filename_check basename only (no '/' or '\\')
--     - evidence_records_deleted_at_invariant
--         deleted_at IS NOT NULL ⇔ status = 'DELETED'  (DEC-06)
--
-- (3) ROW LEVEL SECURITY — fail-closed:
--     ALTER TABLE evidence_records ENABLE ROW LEVEL SECURITY;
--     ALTER TABLE evidence_records FORCE  ROW LEVEL SECURITY;
--
-- (4) EXPLICIT REVOKE — no privilege, no policy:
--     REVOKE ALL ON evidence_records FROM PUBLIC;
--     REVOKE ALL ON evidence_records FROM app_user;
--     REVOKE ALL ON evidence_records FROM app_user_writer;
--     -- no CREATE POLICY for any role; ER003-DEC-07 + §4.2 forbids it.
--
-- SCOPE (minimal — §4.2 / §4.4)
--   - Touched object: exactly one new table `evidence_records` and its
--     FK / index / CHECK objects. No existing table is altered.
--   - No DELETE, no UPDATE on existing data, no GRANT changes, no role
--     changes, no SECURITY DEFINER RPC rewrites, no default-privilege
--     alterations, no blanket grant, no RLS change to existing tables.
--   - The two pre-existing partial unique indexes on `source_claims`
--     and every other existing-table invariant are preserved verbatim.
--
-- IDEMPOTENT
--   - This is a forward-only migration applied on a clean schema. CREATE
--     TABLE IF NOT EXISTS is not used (forward-only). A re-apply on a
--     schema that already has the table will fail at CREATE TABLE — that
--     is the desired fail-closed behavior. Clean-chain CI applies from
--     an empty DB, so a successful first run leaves the schema ready.
--
-- NOT APPLIED TO PRODUCTION
--   Per Tier 0 brief: ER-003 ships this migration as code + CI evidence
--   only. Tier 0/Owner applies to production as a separate gate after
--   the integration suite has PASSed on synthetic ephemeral DB.
-- ============================================================================

-- ───────────────────────────────────────────────────────────────────────────
-- (1) FORWARD-ONLY SCHEMA
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE "evidence_records" (
  "id"                 TEXT PRIMARY KEY,
  -- owner_type is locked to LABOR_PROFILE; the CHECK below rejects any
  -- other value at the DB layer (DEC-02).
  "owner_type"         TEXT NOT NULL,
  -- owner_id is a real FK to labor_profiles(id) with RESTRICT — orphan
  -- owner records are impossible (DEC-02, §4.1).
  "owner_id"           TEXT NOT NULL,
  "evidence_type"      TEXT NOT NULL,
  -- Storage key is globally unique, nonblank, non-URL-shaped, non-path-
  -- shaped at the DB CHECK below. Migrated future writers must still
  -- call asStorageKey before insert (the DB CHECK is the safety net,
  -- not the validator — see port evidence EV-03).
  "storage_key"        TEXT NOT NULL,
  -- Sensitive basename metadata; CHECK rejects any path separator.
  "original_filename"  TEXT NOT NULL,
  -- Declared mimeType; NOT proof of content safety.
  "mime_type"          TEXT NOT NULL,
  -- Non-negative BIGINT.
  "size_bytes"         BIGINT NOT NULL,
  -- Lowercase 64-char SHA-256 hex.
  "checksum"           TEXT NOT NULL,
  -- Lifecycle: PENDING | AVAILABLE | QUARANTINED | DELETED.
  "status"             TEXT NOT NULL,
  "created_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Nullable FK; nullable because ER-003 does not invent a system
  -- identity. Future runtime insert must define the actor first (DEC-08).
  "created_by_user_id" TEXT,
  -- Soft-delete tombstone; non-null exactly for DELETED.
  "deleted_at"         TIMESTAMPTZ,

  CONSTRAINT "evidence_records_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES "labor_profiles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "evidence_records_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "evidence_records_storage_key_key"
  ON "evidence_records"("storage_key");

CREATE INDEX "evidence_records_owner_listing_idx"
  ON "evidence_records"("owner_type", "owner_id", "created_at");

CREATE INDEX "evidence_records_created_by_user_id_idx"
  ON "evidence_records"("created_by_user_id");

-- ───────────────────────────────────────────────────────────────────────────
-- (2) STRUCTURAL CHECK CONSTRAINTS
-- ───────────────────────────────────────────────────────────────────────────

-- Lock owner_type to LABOR_PROFILE (DEC-02). Any other value is a hard reject.
ALTER TABLE "evidence_records"
  ADD CONSTRAINT "evidence_records_owner_type_check"
  CHECK ("owner_type" = 'LABOR_PROFILE');

-- Allowlisted evidence types (DEC-05).
ALTER TABLE "evidence_records"
  ADD CONSTRAINT "evidence_records_evidence_type_check"
  CHECK ("evidence_type" IN (
    'CCCD_FRONT',
    'CCCD_BACK',
    'PORTRAIT',
    'CONTRACT',
    'CERTIFICATE',
    'OTHER'
  ));

-- Lifecycle values (DEC-06).
ALTER TABLE "evidence_records"
  ADD CONSTRAINT "evidence_records_status_check"
  CHECK ("status" IN (
    'PENDING',
    'AVAILABLE',
    'QUARANTINED',
    'DELETED'
  ));

-- Lowercase 64-char SHA-256 hex (DEC-04). The class is exactly [0-9a-f]{64}.
ALTER TABLE "evidence_records"
  ADD CONSTRAINT "evidence_records_checksum_check"
  CHECK ("checksum" ~ '^[0-9a-f]{64}$');

-- Non-negative size (DEC-04).
ALTER TABLE "evidence_records"
  ADD CONSTRAINT "evidence_records_size_bytes_check"
  CHECK ("size_bytes" >= 0);

-- storage_key MUST be:
--   - nonblank
--   - non-URL-shaped (no http(s)://, ftp://, file://, blob:, data:)
--   - non-absolute-path-shaped (no leading '/', no Windows drive C:\, no UNC \\)
-- The CHECK uses regex. Defense in depth: later writers must still call
-- asStorageKey before insert — the DB CHECK is the safety net only.
ALTER TABLE "evidence_records"
  ADD CONSTRAINT "evidence_records_storage_key_check"
  CHECK (
    length("storage_key") > 0
    AND "storage_key" !~ '^(https?|ftp|file|blob|data):'
    AND "storage_key" !~ '^[a-zA-Z]:[\\/]'
    AND "storage_key" !~ '^[/\\]'
  );

-- original_filename is basename metadata only (DEC-03 / §4.1):
-- no '/' and no '\\'. Embedded NULs are also rejected.
ALTER TABLE "evidence_records"
  ADD CONSTRAINT "evidence_records_original_filename_check"
  CHECK (
    length("original_filename") > 0
    AND position('/'  in "original_filename") = 0
    AND position(E'\\' in "original_filename") = 0
    AND position(E'\\x00' in "original_filename") = 0
  );

-- Lifecycle invariant (DEC-06): deleted_at IS NOT NULL ⇔ status = 'DELETED'.
-- Soft-delete tombstone shape, no transition or hard delete in this slice.
ALTER TABLE "evidence_records"
  ADD CONSTRAINT "evidence_records_deleted_at_invariant"
  CHECK (
    ("deleted_at" IS NULL     AND "status" <> 'DELETED')
    OR
    ("deleted_at" IS NOT NULL AND "status"  = 'DELETED')
  );

-- ───────────────────────────────────────────────────────────────────────────
-- (3) ROW LEVEL SECURITY — fail-closed
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE "evidence_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "evidence_records" FORCE  ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────────────────────
-- (4) EXPLICIT REVOKE — no privilege, no policy (ER003-DEC-07 / §4.2)
-- ───────────────────────────────────────────────────────────────────────────

REVOKE ALL ON "evidence_records" FROM PUBLIC;
REVOKE ALL ON "evidence_records" FROM app_user;
REVOKE ALL ON "evidence_records" FROM app_user_writer;

-- (deliberately NO `CREATE POLICY ... TO app_user_writer, app_user` here.
--  A separately reviewed runtime slice — ER-005 / ER-006 — must introduce
--  authorization, grants, and policies together with canonical
--  authorization. ER003-DEC-09 defers them as DEFERRED_NOT_A_BLOCKER.)
