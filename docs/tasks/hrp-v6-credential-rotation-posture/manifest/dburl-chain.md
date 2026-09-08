# DATABASE_URL_ADMIN Chain Update Plan
# Task: hrp-v6-credential-rotation-posture
# RQ-02: DATABASE_URL_ADMIN chain update plan — all callers must be updated before rotation
# WARNING: This file contains NO credential values. All URLs are [REDACTED].

---

## 0. Purpose

`DATABASE_URL_ADMIN` is the master connection string that embeds the `neondb_owner` (or `cloud_admin`) 
password. Before rotating any DB role password, ALL callers must be updated to use the new 
`DATABASE_URL_ADMIN` value. This ensures zero-downtime rotation — no caller holds stale credentials.

---

## 1. Where DATABASE_URL_ADMIN is defined

| File | Environment | Pattern |
|------|-------------|---------|
| `.env` | dev/local | `DATABASE_URL_ADMIN=postgres://[REDACTED]@[REDACTED]/[REDACTED]` |
| `.env.local` | dev/local override | `DATABASE_URL_ADMIN=postgres://[REDACTED]@[REDACTED]/[REDACTED]` |
| `.env.production` | production | `DATABASE_URL_ADMIN=postgres://[REDACTED]@[REDACTED]/[REDACTED]` |
| `.env.production.local` | production override | `DATABASE_URL_ADMIN=postgres://[REDACTED]@[REDACTED]/[REDACTED]` |
| Vercel project settings | production | `DATABASE_URL_ADMIN=postgres://[REDACTED]@[REDACTED]/[REDACTED]` |
| Vercel project settings | preview | `DATABASE_URL_ADMIN=postgres://[REDACTED]@[REDACTED]/[REDACTED]` |
| Neon console | per-branch | `DATABASE_URL_ADMIN=postgres://[REDACTED]@[REDACTED]/[REDACTED]` |

**Note:** The actual value is [REDACTED] in this manifest. Owner stores the real value in secret manager.

---

## 2. Callers of DATABASE_URL_ADMIN

All code paths that read `DATABASE_URL_ADMIN` must be updated before the password rotation.

### 2a. Prisma / ORM

| File | Usage | Env |
|------|-------|-----|
| `prisma/schema.prisma` | `datasource db { url = env("DATABASE_URL_ADMIN") }` | all |
| `prisma/seed.mjs` | `process.env.DATABASE_URL_ADMIN` | all |
| `src/lib/db.ts` | `env.DATABASE_URL_ADMIN` | all |

### 2b. Scripts and tools

| File | Usage | Env |
|------|-------|-----|
| `scratch/migrate_test.ps1` | `process.env.DATABASE_URL_ADMIN` | dev |
| `scratch/run_integration.ps1` | `process.env.DATABASE_URL_ADMIN` | dev |
| `scratch/golive06-migrstate.mjs` | `process.env.DATABASE_URL_ADMIN` | dev |
| `scratch/golive06-rls-probe.mjs` | `process.env.DATABASE_URL_ADMIN` | dev |
| `scratch/marketplace-profile-probe.mjs` | `process.env.DATABASE_URL_ADMIN` | dev |

### 2c. API routes (runtime — reads from env)

| File | Usage | Env |
|------|-------|-----|
| `app/api/**/route.ts` | `process.env.DATABASE_URL_ADMIN` via lib/db | all |

### 2d. Cron / background jobs

| Job | Env var used | Trigger |
|-----|-------------|---------|
| `app/api/cron/disputes/route.ts` | `DATABASE_URL_ADMIN` | cron |
| `app/api/cron/outbox/route.ts` | `DATABASE_URL_ADMIN` | cron |

### 2e. CI/CD

| Platform | Variable | Action |
|----------|----------|--------|
| Vercel | `DATABASE_URL_ADMIN` in project env | Update in Vercel dashboard before rotation |
| GitHub Actions | `DATABASE_URL_ADMIN` in secrets | Update in GitHub repo settings before rotation |
| Local dev | `.env`, `.env.local` | Update before rotation |

---

## 3. Update Sequence

```
STEP 1: Owner generates new DB password(s) in Neon console
STEP 2: Owner stores new password(s) in secret manager (NOT in repo)
STEP 3: Owner updates DATABASE_URL_ADMIN in all environments:
        a. .env        (local dev)
        b. .env.local  (local dev override)
        c. .env.production (if tracked — currently ignored)
        d. Vercel production env
        e. Vercel preview env
        f. Neon console per-branch (for each dev branch)
STEP 4: Verify all callers pick up new DATABASE_URL_ADMIN:
        a. Dev: npm run dev -> verify connects
        b. Staging: deploy -> verify connects
        c. Production: health check -> verify connects
STEP 5: Owner rotates neondb_owner password (Phase 3 of rotation-plan.md)
STEP 6: Verify: old password MUST FAIL
STEP 7: Repeat for cloud_admin, app_user_writer
```

---

## 4. Fail-Closed Verification

After rotation, the following MUST fail:

```
# Old neondb_owner password -> MUST FAIL
psql "postgres://neondb_owner@[OLD_HOST]/[DB]?password=[OLD_PASSWORD]"
-> ERROR: password authentication failed

# Old DATABASE_URL_ADMIN (if not updated) -> MUST FAIL  
Any process using old DATABASE_URL_ADMIN -> connection error
```

---

## 5. Verification Commands (for Owner/OP)

```bash
# Verify DATABASE_URL_ADMIN is set
echo $DATABASE_URL_ADMIN

# Verify Prisma can connect
npx prisma db execute --stdin <<< "SELECT 1"

# Verify old credential is revoked (Owner only)
psql "postgres://neondb_owner@HOST/DB?password=OLD_PASSWORD"
# Expected: authentication failed
```

---

## 6. Rollback if chain update fails

```
If any caller fails after DATABASE_URL_ADMIN update:
  1. DO NOT rotate password yet
  2. Revert DATABASE_URL_ADMIN to previous known-good value
  3. Debug caller: which process is using stale env?
  4. Fix caller, re-test
  5. Re-attempt rotation only after all callers green
```

---

## 7. Sign-off

| Role | Action | Date |
|------|--------|------|
| Owner | Authorize chain update | TBD |
| OP | Execute chain update | TBD |
| Tier 2 | Document callers | 2026-09-08 |
