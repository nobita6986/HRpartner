# RUNBOOK: Phase 5 UAT/Cutover — Production Deployment

## 0. Prerequisites

| Component | Version |
|---|---|
| Node.js | ≥ 20.x |
| pnpm | ≥ 9.x |
| Prisma | 5.x |
| k6 | ≥ 0.55 |
| Neon branch | `main` |
| Vercel project | `hrp-erp` |

### Required Environment Variables

```bash
# ── Auth (Phase 1) ──────────────────────────────────────────────────────────
ADMIN_PHONE=09xxxxxxxx
ADMIN_PASSWORD=<strong-password>
HR_PHONE=09xxxxxxxx
HR_PASSWORD=<strong-password>

# ── Database ───────────────────────────────────────────────────────────────
# Standard (app runtime)
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/hrp?sslmode=require

# Admin (seed + migrate — DIRECT Postgres, NOT Neon pooler)
DATABASE_URL_ADMIN=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/hrp?sslmode=require

# ── App ───────────────────────────────────────────────────────────────────
JWT_SECRET=<random-64-char-hex>
NEXT_PUBLIC_APP_URL=https://hrp-erp.vercel.app
CRON_SECRET=<random-32-char-hex>          # Optional: verify cron calls
```

## 1. Pre-deployment Checklist

```bash
# 1. Verify tests pass
npm run test      # ≥ 548 tests

# 2. Build
npm run build     # exit 0

# 3. Verify no forbidden files changed
git diff --name-only | grep -E "appBCC|consolidation_plan|defectfix"
# Must return empty

# 4. Check migration status
npx prisma migrate status
# All migrations must be applied
```

## 2. Database Setup

### 2.1 Apply Pending Migrations (if any)

```bash
# OPTION A: Standard (uses DATABASE_URL)
npx prisma migrate deploy

# OPTION B: Direct Postgres via DATABASE_URL_ADMIN (bypasses RLS)
DATABASE_URL_ADMIN="postgresql://user:pass@host/db" npx prisma migrate deploy
```

### 2.2 Apply RLS Migration STEP-02 (RQ-04)

The migration `20260817160000_s1_rls_attendance_timesheet` was applied in Phase 4. Verify:

```bash
# Verify RLS policies (7 tables × 1 policy = 7 checks)
node scripts/verify-rls-phase5.cjs
# Expected: "RESULT: 21 passed, 0 failed"
```

### 2.3 Run Seed

```bash
# IMPORTANT: Use DATABASE_URL_ADMIN (direct Postgres, NOT Neon pooler)
DATABASE_URL_ADMIN="postgresql://user:pass@host/db?sslmode=require" \
  node prisma/seed.mjs

# Expected output:
# [seed.mjs] Upserted: 12 users, 4 projects, 5 workers, 2 vendors
# [seed.mjs] Phase 5: 1 timesheet period (LOCKED), 1 vendor statement (SENT)
# [seed.mjs] F00A demo ready: 5 workers, 3 projects, 2 vendors, 1 period LOCKED, 1 statement SENT
```

> **Note:** If seed fails with `new row violates row-level security policy`, ensure `DATABASE_URL_ADMIN` is a direct Postgres connection (not Neon connection pooler URL).

## 3. Deploy to Vercel

### 3.1 Production

```bash
# Deploy main branch
vercel --prod

# Or via GitHub integration (automatic on push to main)
git push origin main
```

### 3.2 Cron Configuration (vercel.json)

Cron jobs are configured in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/outbox",    "schedule": "*/5 * * * *" },
    { "path": "/api/cron/disputes", "schedule": "*/5 * * * *" }
  ]
}
```

Vercel Cron Jobs invoke these routes every 5 minutes. The routes are idempotent.

### 3.3 Environment Variables on Vercel

Set in Vercel dashboard → Settings → Environment Variables:

| Name | Value | Environments |
|---|---|---|
| `DATABASE_URL` | Neon URL | Production |
| `JWT_SECRET` | Random 64-char | Production |
| `NEXT_PUBLIC_APP_URL` | `https://hrp-erp.vercel.app` | Production |
| `CRON_SECRET` | Random 32-char | Production |

## 4. Health Checks

```bash
# Check app responds
curl https://hrp-erp.vercel.app/api/me

# Check cron routes respond (requires CRON_SECRET)
curl -H "x-cron-secret: $CRON_SECRET" \
  https://hrp-erp.vercel.app/api/cron/outbox

curl -H "x-cron-secret: $CRON_SECRET" \
  https://hrp-erp.vercel.app/api/cron/disputes

# Check public jobs API
curl https://hrp-erp.vercel.app/api/jobs
```

## 5. UAT Test Cases (F00A Narrative)

| # | Step | Time | Verify |
|---|---|---|---|
| 1 | Login as HR_MANAGER | 06:00 | Session cookie set |
| 2 | /admin/attendance → Import CSV | 06:20 | Batch created, matched/unmatched rows |
| 3 | /admin/attendance → Resolve unmatched | 07:00 | Row resolved, anomaly cleared |
| 4 | /admin/attendance → Approve period | 07:30 | Period APPROVED |
| 5 | /admin/attendance → Lock period | 08:30 | Period LOCKED, statement auto-created |
| 6 | /admin/reconciliation → Generate | 09:30 | VendorStatement + ClientStatement created |
| 7 | /admin/reconciliation → View margin | 10:30 | Margin breakdown shown |
| 8 | /admin/reconciliation → Dispute | 11:30 | Dispute filed (status → DISPUTED) |
| 9 | Cron runs (after 3 days) | 14:30+ | Statement auto-CONFIRMED |
| 10 | /job-board → Apply for job | Any | Submission + SourceClaim created |
| 11 | /admin/jobs → View submissions | Any | Submission visible in list |
| 12 | /admin/jobs → Accept claim | Any | Submission → SCREENING |

## 6. Rollback Plan

### 6.1 Code Rollback (Vercel)

```bash
# List recent deployments
vercel list

# Rollback to previous deployment
vercel --prod --restore-from=<deployment-id>
```

### 6.2 Database Rollback

```bash
# Rollback last migration (DANGEROUS — requires manual SQL)
# DO NOT run in production without sếp approval
# Instead: restore from Neon point-in-time backup
```

### 6.3 Feature Flags

If critical bug found post-deploy:
1. Vercel dashboard → Settings → Environment → add `MAINTENANCE_MODE=true`
2. App shows "under maintenance" banner
3. Rollback code ASAP

## 7. Incident Response

| Severity | Criteria | Response |
|---|---|---|
| P1 | App down / data loss | Rollback immediately + notify sếp |
| P2 | RLS broken / security bypass | Rollback immediately + notify sếp |
| P3 | API error < 5% | Log + fix in next deploy |
| P4 | UI glitch | Fix in next deploy |

### Contacts

| Role | Name | Phone |
|---|---|---|
| Tech lead | Sếp | <sếp-phone> |
| DBA | Sếp | <sếp-phone> |

## 8. Load Test (STEP-07)

See `scripts/load-test/README.md` for k6 scripts and thresholds.

```bash
cd scripts/load-test
k6 run k6-checkin.js      # p95 < 2s
k6 run k6-transfer.js      # p95 < 2s
k6 run k6-statement.js    # p95 < 2s
```

---

**Approved by:** __________________ **Date:** __________________
