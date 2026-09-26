/**
 * vitest.integration-files.ts — SINGLE SOURCE OF TRUTH for the DB-touching lane (G0-04 / RQ-05).
 *
 * These are the ONLY test files that open a real database connection. The list was derived
 * EMPIRICALLY, not by filename suffix: the full suite was run once with an unreachable sentinel
 * DATABASE_URL (`postgresql://blocked:blocked@127.0.0.1:1/blocked`) and the files that errored
 * with "Can't reach database server" were recorded. The `.integration` suffix is NOT a reliable
 * signal here — several `*.integration.test.ts` files are fully mocked and make no connection,
 * while `4role-staffing.integration.test.ts` connects transitively via
 * requireTalentPoolAccess → resolveEffectivePermissions → getPrisma().
 *
 *   - 4 files connect via getPrisma() → process.env.DATABASE_URL (RLS-enforcing writer).
 *   - 2 `*.mp2.test.ts` files are LIVE harnesses gated by describe.skipIf(!MP2_LIVE_SECURITY_CHECK);
 *     they self-skip unless that flag is set, so they are safe in this lane and skip otherwise.
 *   - `live-integration.ops06a.test.ts` (V5-OPS-06A) is gated by describe.skipIf on
 *     OPS06A_LIVE_CHECK=1 plus TEST-only Upstash/DB inputs; registered here so the unit lane
 *     never picks it up.
 *
 * Consumers:
 *   - vitest.unit.config.ts       → EXCLUDES these (unit lane must touch NO DB; fail-closed sentinel).
 *   - vitest.integration.config.ts → INCLUDES only these (DATABASE_URL from DATABASE_URL_TEST only).
 *
 * Re-derive after adding DB tests: run the sentinel classification again (see HANDOFF ops notes).
 */
export const INTEGRATION_TEST_FILES: string[] = [
  'src/shared/auth/rls-context.test.ts',
  'src/shared/auth/matrix-scope.test.ts',
  'src/domains/security/security-matrix.integration.test.ts',
  'src/domains/staffing/4role-staffing.integration.test.ts',
  'src/domains/applications/live-integration.mp2.test.ts',
  'src/domains/applications/security-boundary.mp2.test.ts',
  'src/domains/applications/live-integration.mp3b.test.ts',
  'src/domains/applications/live-integration.mp3c.test.ts',
  'src/domains/applications/live-integration.ops06a.test.ts',
  'src/shared/auth/live-auth-scope.m1-06a.test.ts',
  'src/shared/auth/live-vendor-worker-scope.m1-06b.test.ts',
  'src/shared/auth/live-ticket-rls-scope.m1-07a.test.ts',
  'src/shared/auth/live-rls-posture.m1-07b.test.ts',
  'src/shared/auth/live-ticket-route-boundary.m1-06d.test.ts',
  'src/shared/auth/live-vendor-idor.m1-08.test.ts',
  'src/shared/auth/live-public-read-rls.go-live-04.test.ts',
  // go-live-05 / RQ-13 / STEP-08: LIVE evidence cho projection card (seed thật + cleanup thật).
  'src/domains/job-board/public-card-truth.integration.test.ts',
  // hrp-v6-n3-service-model-placement: DB-touching proof for ServiceModel taxonomy +
  // Placement lifecycle + RLS/GRANT + unique partial index anti-race + FK chain resolve.
  // Self-skips when DATABASE_URL_TEST absent (ENV_BLOCKED — Tier 0/Owner cung cấp DB trước khi xét merge).
  'tests/db/placement-lifecycle-integration.test.ts',
  // hrp-p0-a04-er003-evidence-record-metadata: forward-only metadata-only boundary for
  // `evidence_records` (LABOR_PROFILE owner, FK + CHECK + forced RLS, deny-by-default
  // posture for PUBLIC/app_user/app_user_writer). Covers AC-01..AC-06: synthetic valid
  // insert, structural CHECKs reject duplicate storage_key, bad owner_type, bad evidence_type,
  // bad status, bad checksum, negative size, basename-only filename, URL/path-shaped key,
  // invariant deleted_at ↔ status, FK orphan rejection, BigInt round-trip, RLS posture
  // (relrowsecurity=true, no policy for any role, no grant for PUBLIC/app_user/app_user_writer).
  // Self-skips when DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST absent (ENV_BLOCKED).
  'tests/db/er003-evidence-record-metadata.integration.test.ts',
  'src/domains/admin-demand-tree.integration.test.ts',
  'tests/db/referral-attribution-foundation.integration.test.ts',
  // hrp-v6-n2-aff-02-link-capture (Decision A): GET /r/[code] canonical redirect.
  // Validates affCode + job allowlist + hrp_aff cookie + engine context.
  // RUNs (not SKIPs) against live container DB; fails explicitly if DB unavailable.
  'tests/db/attribution-redirect.integration.test.ts',
  // hrp-v6-n2-aff-03-apply-attribution: POST /api/public/intake. Validates cookie
  // → ReferralAttribution lookup, server-clock + status guards, consumption,
  // and LaborProfileHandlingAssignment creation. Requires the additive
  // migration `20260918100000_aff03_writer_select_on_referral_attributions`
  // to be applied (CI Integration lane applies via the standard pipeline).
  'tests/db/aff03-public-intake.integration.test.ts',
  // W5 HandlingAssignment: forced RLS scope plus expiry/release lifecycle.
  'tests/db/handling-assignment.integration.test.ts',
  // hrp-v6-n2-aff-04-conversion-propagation: forward-only AFF-04 schema + invariant
  // integration test. Covers backfill predicate matrix (CTV_REFERRAL with/without ctvId,
  // HRP_DIRECT, VENDOR_SUPPLIED), idempotency of the migration backfill UPDATE,
  // partial unique indexes preservation, FK ON DELETE RESTRICT for both new FKs,
  // and no-source-steal guard via one_accepted_source. Self-skips when
  // DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST absent (ENV_BLOCKED).
  'tests/db/aff04-conversion-propagation.integration.test.ts',
  // hrp-v6-n2-aff-04-conversion-propagation upgrade-path (T0 directive F-P4-2):
  // dựng predecessor state từ baseline 9e527a13 (drop AFF-04 artifacts), seed
  // accepted CTV_REFERRAL + legacy non-CTV rows, apply chính file migration thật,
  // verify backfill matrix + partial unique indexes + FK ON DELETE RESTRICT +
  // zero non-CTV drift. Heavy test (tạo ephemeral DB, prisma migrate deploy,
  // apply byte-identical migration file) — chạy sau integration lane chính.
  'tests/db/aff04-conversion-propagation-upgrade-path.integration.test.ts',
  // hrp-p1-a0-jobposting-authoring-publish: DB-touching proof for create-or-reuse
  // JobOpening + DRAFT JobPosting from a StaffingOrderSlot, 2-transaction race,
  // optimistic revision (STALE_VERSION), state machine, RLS positive/negative,
  // canonical slug uniqueness + immutability, JobOpening lifecycle invariant.
  // Self-skips when DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST absent (ENV_BLOCKED).
  'tests/db/job-posting-authoring.integration.test.ts',
  // hrp-v6-n2-aff-05a-r2-bounded-manager-assignment: clean chain + upgrade path
  // evidence for the forward-only 20260924170000 migration. Covers AC-02/AC-03/AC-04/AC-05:
  // narrow predicate backfill, fail-closed anomaly guards, conditional CHECK
  // enforcement on MANAGER_ASSIGNMENT, post-migration state assertions, bounded
  // lock_timeout behavior, and terminal-history preservation. Self-skips when
  // DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST absent (ENV_BLOCKED).
  'tests/db/aff05a-r2-bounded-manager-assignment.integration.test.ts',
  // hrp-p1-a1-canonical-public-job-detail (correction batch 1/1, C-04 / C-05):
  // DB-touching proof cho canonical public JobPosting + apply RPC. Covers 12 behavior
  // cases (publish/open chain, draft/archived posting reject, draft/filled/cancelled
  // opening reject, old PRJ-only slug reject, sibling/wrong/expired/full slot reject,
  // idempotency replay + payload mismatch P0010 + duplicate P0012, exact-row-count
  // submission+history, PUBLIC projection visibility/canonical slot).
  // Self-skips when DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST absent (ENV_BLOCKED).
  'tests/db/p1a1-jobposting-public-apply.integration.test.ts',
  // hrp-p1-a1-canonical-public-job-detail (correction batch 1/1, C-05): predecessor
  // upgrade-path proof for the forward-only A1 migration. Dựng ephemeral DB,
  // apply all migrations, rollback A1 artifacts (function body + grants), seed
  // canonical chain, apply byte-identical A1 migration file, verify catalog +
  // behavior + negative rollback proof. Self-skips when DB env absent (ENV_BLOCKED).
  'tests/db/p1a1-migration-chain-proof.integration.test.ts',
  // hrp-p1-b-public-apply: canonical slug-bound lifecycle extension. Proves
  // helper-based classification, LaborProfile/PlacementCase linkage, privacy,
  // DB idempotency/concurrency and atomic rollback. Fails closed when either
  // synthetic writer/admin URL is absent.
  'tests/db/p1b-public-apply-slug-bound.integration.test.ts',
  // hrp-p1-f0-placement-command-api: 5 named canonical admin commands
  // (placement.{create,confirm,effective,fail,cancel}) wrapping the frozen
  // `placement.service.ts`. Mocks only `getAuthContext`; the rest flows
  // through real `withDbContext`, real `withIdempotency`, real Prisma tx.
  // Covers AC-01..AC-13 (role gate, strict body, replay, source-CS
  // integrity, Client-managed EFFECTIVE atomic close, HRP-managed
  // REJECT, EFFECTIVE terminal, fail/cancel concurrency, RLS GUC).
  // Self-skips when DATABASE_URL_TEST + DATABASE_URL_ADMIN_TEST absent
  // (ENV_BLOCKED — Tier 0/Owner cung cấp DB trước khi xét merge).
  'tests/db/p1f0-placement-command-api.integration.test.ts',
];
