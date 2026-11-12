# HANDOFF — `hrp-bi-worker-sync-v1`

## 1. Summary of Changes
- **Additive Schema & RLS Migration (`prisma/schema.prisma`, `prisma/migrations/20261112110000_bi_worker_sync_v1/migration.sql`):**
  - Added 5 tables with `ENABLE` + `FORCE ROW LEVEL SECURITY` and `GRANT` for `app_user_writer, app_user`: `external_entity_links`, `bi_sync_runs`, `bi_sync_exceptions`, `bi_sync_credentials`, `worker_initial_credentials`.
  - Added additive columns on `users.must_change_password`, `workers.self_edited_fields`, `sites.{source_system, external_ref}`, and `project_assignments.{source_system, external_ref, recruiter_external_id, recruiter_name, recruiter_code}`.
- **CCCD Login, Rate-Limiter & First-Login Password Change (`src/shared/auth/**`, `app/api/auth/**`, `app/login/**`):**
  - Added `SYSTEM_BI_SYNC` principal in `src/shared/auth/with-system-db.ts`.
  - Extended `src/shared/auth/preauth-db.ts` with `findUserForLoginByCccd` and `mustChangePassword`.
  - Updated `POST /api/auth/login` to accept 9/12-digit CCCD or phone in `body.phone`, apply SHA-256 bucketed rate-limiting (`429 TOO_MANY_ATTEMPTS`), and return `mustChangePassword`.
  - Added `POST /api/auth/change-password` to verify current password, set new password (`>= 8` chars), clear `mustChangePassword = false`, and purge `worker_initial_credentials` in the same transaction.
  - Updated `/login` UI to accept CCCD or phone and prompt for immediate password rotation when `mustChangePassword = true`.
- **BI Sync Vault, Client & Service (`src/domains/integrations/bi/**`):**
  - Implemented `bi-credential-vault.ts` (AES-256-GCM + domain-separated HKDF for BI API key and initial worker passwords).
  - Implemented `bi-sync-client.ts` (`fetchBiCatalog`, `fetchBiWorkerEpisodesPage`) and `bi-worker-sync.service.ts` enforcing all 4 BI ↔ HRP integration rules:
    1. Monotonic `sync_version` comparison (`incoming.syncVersion <= stored.lastSyncVersion` skip).
    2. Opaque `pageCursor` & `checkpoint` (never decoded, never rewound 10 minutes; `checkpoint` committed ONLY after `hasMore === false`).
    3. Idempotent history-preserving `tombstone` handling (`ENDED` if attendance exists, `CANCELLED` otherwise; never hard-deleting `Worker`/`AttendanceEvent`/`TimesheetLine`).
    4. Fail-closed `Catalog.location` (`geoConfirmedAt = null` + `PROJECT_LOCATION_MISSING` when `location === null` or `confirmedAt === null`).
- **Initial Credentials Scoped View/Export & Admin UI (`app/api/admin/integrations/bi/**`, `app/admin/integrations/bi/page.tsx`):**
  - Added `GET/POST /api/admin/integrations/bi/credentials` and `GET /api/admin/integrations/bi/credentials/export` (`.xlsx` export scoped to managed projects for `PM` and global for `HR_MANAGER`/`ADMIN`, with `AuditLog` on every view/export).
  - Added `/admin/integrations/bi` management dashboard and `POST /api/cron/bi-sync`.
- **Worker Self-Edit Profile & Check-in Gate Hardening (`app/api/workers/me/route.ts`, `app/api/worker/checkins/route.ts`):**
  - Added `PATCH /api/workers/me` with strict personal-field allowlist, rejecting `cccdNumber`/status/assignment edits and recording edited fields in `workers.self_edited_fields`.
  - Hardened `POST /api/worker/checkins` to enforce `mustChangePassword`, `profileStatus === 'VERIFIED'`, `employmentStatus === 'ACTIVE'`, and assignment `[validFrom, validTo)` validity.
- **4-Hour Systemd Timer & Android Handoff (`deploy/vps-production/hrp-bi-sync.{service,timer}`, `docs/integrations/bi/ANDROID-CCCD-LOGIN-PROMPT.md`):**
  - Configured 4x/day schedule at `06:00, 10:00, 14:00, 18:00` (`Asia/Ho_Chi_Minh`).

## 2. Verification
- `npx tsc --noEmit`: 0 errors.
- `npx vitest run`: All unit, route, and static tests pass (`AC-01`..`AC-11`).
