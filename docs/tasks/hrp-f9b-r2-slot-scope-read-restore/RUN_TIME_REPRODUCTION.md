# RUN_TIME_REPRODUCTION — `hrp-f9b-r2-slot-scope-read-restore` (F9-B correction round 2)

**Pipeline V2 — Runtime reproduction PASS at exact audit-target HEAD. CRITICAL / LIGHT DELTA.**

## 0. Control

| Field | Value |
| --- | --- |
| Task slug | `hrp-f9b-r2-slot-scope-read-restore` |
| Audit-target HEAD | `c3fa409a` |
| Runtime reproduction SHA | `c3fa409a` (HEAD = audit-target = no docs-only commits after the R2 forward-only commit yet) |
| Test environment | `READY` (synthetic Neon `ep-empty-forest-azlhfyo9-*` writer / admin pair) |
| Production DB / migration | `NOT_RUN` (production `ep-shy-tree-*` host prefix never dialed) |
| Reproduction status | `PASS_AT_AUDIT_TARGET_HEAD` |

## 1. Reproduction Commands (at HEAD `c3fa409a`)

### 1.1 Synthetic DB preflight (writer non-super non-bypassrls; admin bypassrls; same host+db)

```
$ pwsh -NoProfile -ExecutionPolicy Bypass -File C:\Users\Admin\AppData\Local\Temp\rhp-r2-cred.ps1
CRED_OK host=ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech db=neondb writer=app_user_writer admin=neondb_owner pairs_selected=1 pairs_rejected=1

$ node scripts/ci/assert-test-db-posture.mjs
[Deprecation] libpq sslmode=require compatibility
WRITER_POSTURE user=app_user_writer session=app_user_writer super=false bypassrls=false
ADMIN_POSTURE  user=neondb_owner  session=neondb_owner  super=false  bypassrls=true
POSTURE_OK writer_is_writer admin_is_admin same_target
```

### 1.2 Apply R2 migration (admin URL)

```
$ DATABASE_URL=$DATABASE_URL_ADMIN_TEST npx --no-install prisma migrate deploy
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "neondb", schema "public" at "ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech"
62 migrations found in prisma/migrations
Applying migration `20261004000000_f9b_r2_slot_scope_read_restore`
The following migration(s) have been applied:
migrations/
  └─ 20261004000000_f9b_r2_slot_scope_read_restore/
    └─ migration.sql
All migrations have been successfully applied.
```

In-migration static guard PASSED (otherwise the migration would have RAISED and aborted).

### 1.3 R2 role matrix ×3

```
$ for i in 1 2 3; do
>   echo "===== R2 run $i/3 ====="
>   npx vitest run --config vitest.integration.config.ts tests/db/p1a07-f9b-r2-role-scope.integration.test.ts 2>&1 | tail -5
> done
===== R2 run 1/3 =====
 Test Files  1 passed (1)
      Tests  31 passed (31)
   Duration  23.41s
===== R2 run 2/3 =====
 Test Files  1 passed (1)
      Tests  31 passed (31)
   Duration  25.42s
===== R2 run 3/3 =====
 Test Files  1 passed (1)
      Tests  31 passed (31)
   Duration  26.37s
```

### 1.4 Previously failing CI suites (5/5 green, one-shot bundle)

```
$ npx vitest run --config vitest.integration.config.ts \
    src/shared/auth/live-public-read-rls.go-live-04.test.ts \
    tests/db/p1a1-jobposting-public-apply.integration.test.ts \
    tests/db/job-posting-stamps.integration.test.ts \
    src/domains/job-board/public-card-truth.integration.test.ts \
    src/domains/admin-demand-tree.integration.test.ts \
  | tail -5
 Test Files  5 passed (5)
      Tests  62 passed (62)
   Duration  91.75s
```

### 1.5 F9-B R1 ×3 (write boundary hardening preserved)

```
$ for i in 1 2 3; do
>   echo "===== F9-B run $i/3 ====="
>   npx vitest run --config vitest.integration.config.ts tests/db/p1a06-f9b-jobposting-write-boundary.integration.test.ts 2>&1 | tail -5
> done
===== F9-B run 1/3 =====
 Test Files  1 passed (1)
      Tests  18 passed (18)
   Duration  25.95s
===== F9-B run 2/3 =====
 Test Files  1 passed (1)
      Tests  18 passed (18)
   Duration  24.41s
===== F9-B run 3/3 =====
 Test Files  1 passed (1)
      Tests  18 passed (18)
   Duration  24.53s
```

### 1.6 F9 ×3 (HR_STAFF JobPosting assignment scoping preserved)

```
$ for i in 1 2 3; do
>   echo "===== F9 run $i/3 ====="
>   npx vitest run --config vitest.integration.config.ts tests/db/p1a05-f9-hr-staff-jobposting-scope.integration.test.ts 2>&1 | tail -5
> done
===== F9 run 1/3 =====
 Test Files  1 passed (1)
      Tests  12 passed (12)
   Duration  22.61s
===== F9 run 2/3 =====
 Test Files  1 passed (1)
      Tests  12 passed (12)
   Duration  21.53s
===== F9 run 3/3 =====
 Test Files  1 passed (1)
      Tests  12 passed (12)
   Duration  22.99s
```

### 1.7 Full integration lane (one shot)

```
$ npx vitest run --config vitest.integration.config.ts | tail -5
 Test Files  1 failed | 42 passed (43)
      Tests  1 failed | 730 passed | 2 skipped (733)
   Duration  1242.94s
```

The 1 failure is `aff03-public-intake.integration.test.ts > AFF-05A-R1 > AC-06 (backfill R1)`. **Out of R2 scope** — see HANDOFF §3.4.

### 1.8 Unit / typecheck / lint / build / Prisma / static / encoding

```
$ npm run typecheck          # tsc --noEmit                          → PASS (clean)
$ npm run lint               # eslint                                 → 0 errors, 918 pre-existing warnings
$ npm run build              # next build                             → PASS
$ npm run test:unit          # vitest unit                            → 3622 passed | 9 skipped (3631 total, 219 files)
$ npx --no-install prisma validate                                      → schema valid
$ npx vitest run src/shared/security/f9b-slot-opening-binding-primitive.static.test.ts \
                 src/shared/security/required-relation-sweep.static.test.ts  → 32 passed (32)
$ pwsh -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-encoding.ps1 → clean (no BOM, no invalid UTF-8)
```

### 1.9 Zero-residue check

```
$ node scratch-residue.mjs
aff03b-* LPHAs still in DB: 0
f9b-r2 LPHAs in DB: 0
p1a07 f9b-r2 LPHAs in DB: 0
F9-B R2 slot residue: 0
F9-B R2 project residue: 0
```

### 1.10 Working tree status (after R2 forward-only commit, before docs-freeze)

```
$ git status --short
 M docs/tasks/hrp-f9b-r2-slot-scope-read-restore/HANDOFF.md     [this commit]
 M docs/tasks/hrp-f9b-r2-slot-scope-read-restore/AUDIT.md        [this commit]
?? .ai-pipeline/scripts/verify-encoding.ps1                     [intentionally NOT tracked in R2 surface]
?? docs/tasks/hrp-f9b-r2-slot-scope-read-restore/RUN_TIME_REPRODUCTION.md   [this commit]
?? docs/tasks/hrp-f9b-r2-slot-scope-read-restore/T0_RECONCILIATION_REPORT.md [this commit]
```

## 2. Reproduction Summary

| Gate | Result |
| --- | --- |
| Posture gate (writer non-super non-bypassrls; admin bypassrls; same host+db) | PASS |
| `prisma migrate deploy` of R2 migration (in-migration static guard) | PASS |
| R2 role matrix ×3 | 31/31 ×3 PASS |
| Targeted bundle of 5 previously failing CI suites (one shot) | 62/62 PASS |
| F9-B R1 ×3 | 18/18 ×3 PASS |
| F9 ×3 | 12/12 ×3 PASS |
| Full integration lane | 730 passed / 1 failed (out-of-scope) / 2 skipped |
| Unit / typecheck / lint / build / Prisma / static / encoding | PASS (lint warnings pre-existing; not R2-introduced) |
| Zero-residue | 0 R2 rows left in synthetic DB |
| Working tree | clean except docs/ and workspace-internal infrastructure |

---

*RUN_TIME_REPRODUCTION authored 2026-10-04 ICT by Tier 1A (T1A). The R1 RUN_TIME_REPRODUCTION is preserved byte-equivalent at `docs/tasks/hrp-f9b-jobposting-write-boundary-hardening/RUN_TIME_REPRODUCTION.md`.*
