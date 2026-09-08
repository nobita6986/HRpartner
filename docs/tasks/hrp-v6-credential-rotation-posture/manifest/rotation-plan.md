# Rotation Plan — Neon DB Credentials
# Task: hrp-v6-credential-rotation-posture
# Scope: neondb_owner / cloud_admin / app_user_writer rotation
# Owner: OP / Owner (Tier 2 does NOT rotate — this is repo hygiene + manifest only)
# Baseline: main @ f853a3cfb7ae
# WARNING: This file contains NO credential values. All values are [REDACTED].

---

## 0. Credentials in scope

| Role | Description | Rotation state |
|------|-------------|----------------|
| `neondb_owner` | Neon project owner role — full schema DDL | PENDING (2x rotate per DEC-04) |
| `cloud_admin` | Neon cloud_admin role — billing + project admin | PENDING |
| `app_user_writer` | Application DB user — runtime CRUD | PENDING |

---

## 1. Rotation Sequence (per v5-go-live-21 state order)

```
Phase 1: Prepare
  - Owner generates new credentials via Neon console
  - Owner stores new values in secret manager (NOT in repo)
  - Owner documents new values in Owner-only secret ledger

Phase 2: DATABASE_URL_ADMIN chain update
  - Before any rotation, update DATABASE_URL_ADMIN in all environments
    (dev / staging / production)
  - Verify all callers use DATABASE_URL_ADMIN (not hardcoded)
  - See dburl-chain.md for caller inventory

Phase 3: Rotate neondb_owner (1st rotation)
  - Owner runs: psql "ALTER ROLE neondb_owner WITH PASSWORD '[NEW_VALUE]'"
  - Verify: SELECT 1 from neonatal connection using new password
  - Update DATABASE_URL_ADMIN immediately after

Phase 4: Rotate neondb_owner (2nd rotation)
  - Owner runs: psql "ALTER ROLE neondb_owner WITH PASSWORD '[NEW_VALUE_2]'"
  - Verify: SELECT 1 from neonatal connection using new password
  - Update DATABASE_URL_ADMIN immediately after
  - Old credential is now 2x rotated — effectively revoked

Phase 5: Rotate cloud_admin
  - Owner runs: Neon console / SQL "ALTER ROLE cloud_admin WITH PASSWORD '[NEW_VALUE]'"
  - Verify: SELECT 1 from cloud_admin connection
  - Update DATABASE_URL_ADMIN immediately after

Phase 6: Rotate app_user_writer
  - Owner runs: Neon console / SQL "ALTER ROLE app_user_writer WITH PASSWORD '[NEW_VALUE]'"
  - Verify: SELECT 1 from app_user_writer connection
  - Update DATABASE_URL_ADMIN immediately after

Phase 7: Verify old credentials fail
  - Try connecting with old neondb_owner password -> MUST FAIL
  - Try connecting with old cloud_admin password -> MUST FAIL
  - Try connecting with old app_user_writer password -> MUST FAIL
  - Owner documents: old credentials confirmed revoked
```

---

## 2. Rollback Plan (if rotation breaks app)

```
If Phase 3-6 breaks app:
  1. Revert DATABASE_URL_ADMIN to previous value (stored in Owner secret ledger)
  2. If neondb_owner rotated: re-grant safe_admin=1 from cloud_admin
  3. Verify app connects: SELECT version();
  4. DO NOT retry rotation until root cause found
  5. Incident opened per v5-go-live-21 flow
```

---

## 3. Risk Controls

| Risk | Mitigation |
|------|------------|
| RLS matrix breaks after neondb_owner rotation | DEC-04: dry-run before; GO-LIVE-11 measured safe_admin=1; Owner confirms |
| Concurrent rotation of two roles | Allowed — separate roles, separate sessions |
| Tier 2 / script accidentally commits value | R-01 iron rule: manifest has NO value; AC-01 gate grep must return empty |
| Rollback fails | Owner has point-in-time recovery from Neon; app goes read-only until fixed |

---

## 4. Non-Goals (explicit)

- Tier 2 does NOT rotate production credentials
- Tier 2 does NOT have access to production env values
- Tier 2 does NOT connect to production DB
- This manifest is repo hygiene only — rotation is OP/Owner task per v5-go-live-21

---

## 5. Sign-off

| Role | Action | Date |
|------|--------|------|
| Owner | Authorize rotation window | TBD |
| OP | Execute rotation | TBD |
| Tier 1 | Verify manifest is value-free | 2026-09-08 |
| Tier 2 | Repo hygiene + manifest | 2026-09-08 |
