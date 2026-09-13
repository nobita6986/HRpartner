# hrp-live DDL fingerprint — READ-ONLY đối chiếu

> **Mục đích:** hỗ trợ Tier 0 verify `hrp-live` đã có đủ 7 DDL NGOÀI N1 **trước khi** Tier 0 re-clone `hrp_mp2_test` (theo Tier 0 chốt Q-02 ngày 13/09/2026 12:28).
>
> **Tier 1 KHÔNG kết nối `hrp-live`.** Chỉ đọc `prisma/migrations/<ts>*/migration.sql` trong HEAD `b31581a` để sinh fingerprint (tên bảng/enum/cột/constraint/index/policy). Tier 0 chạy script verify (đã chuẩn bị trong §B) đối chiếu.

## A. Tier 1 — fingerprint từ repo HEAD `b31581a`

Tier 1 đã grep đặc trưng DDL của 7 migration NGOÀI N1. Tier 0 dùng §B để đối chiếu.

### A.1. `20260831160000_public_rpc_residual_grant_revoke`

**File**: `prisma/migrations/20260831160000_public_rpc_residual_grant_revoke/migration.sql` (190 dòng)

**Đặc trưng DDL** (không phải DDL bảng — là role/grant):
- REVOKE chéo `EXECUTE` ON FUNCTION `public.X` FROM `PUBLIC` cho **7 RPC function** (tên đầy đủ trong file):
  - public.match_jobs_for_candidate
  - public.submit_candidate_for_opening
  - public.list_published_jobs
  - public.get_job_detail
  - public.get_client_company_jobs
  - public.get_homepage_settings
  - public.update_homepage_settings (nếu có)
- REVOKE `USAGE` ON SCHEMA public FROM PUBLIC (chỉ trong phạm vi revoke liên quan)
- (KHÔNG tạo bảng, KHÔNG tạo enum)

**Tier 0 check**: `SELECT has_function_privilege(...)` cho từng function trên `hrp-live`. Nếu cả 7 RPC đều trả `EXECUTE` đã revoke từ PUBLIC → DDL đã apply.

### A.2. `20260908001_job_opening_posting_split`

**File**: `prisma/migrations/20260908001_job_opening_posting_split/migration.sql` (87 dòng)

**DDL đặc trưng**:
- Bảng `job_openings` (id TEXT PK, staffing_order_id TEXT NOT NULL FK → staffing_orders, status TEXT DEFAULT 'DRAFT', opened_at, closed_at, timestamps)
- Bảng `job_postings` (id TEXT PK, job_opening_id TEXT NOT NULL FK, slug TEXT NOT NULL, revision INT DEFAULT 1, status TEXT DEFAULT 'DRAFT', published_at, archived_at, timestamps)
- ALTER TABLE `staffing_order_slots` ADD COLUMN `job_opening_id` TEXT (nullable)
- FK constraints: `job_openings_staffing_order_id_fkey`, `job_openings_staffing_order_slot_id_fkey`, `job_postings_job_opening_id_fkey`
- Composite unique index `job_postings_job_opening_id_slug_revision_key` (slug unique per opening+revision)
- Composite index `job_postings_job_opening_id_status_idx` (added in fix `5562719`)
- Index `staffing_order_slots_job_opening_id_idx`

**Tier 0 check**: `to_regclass('public.job_openings')` + `to_regclass('public.job_postings')` ≠ NULL + có cột `job_opening_id` trên `staffing_order_slots`.

### A.3. `20260908150000_v6_phase1a_labor_profile_schema`

**File**: `prisma/migrations/20260908150000_v6_phase1a_labor_profile_schema/migration.sql` (37 dòng)

**DDL đặc trưng**:
- ALTER TABLE `candidate_submissions` ADD COLUMN `labor_profile_id` TEXT (nullable)
- Bảng `labor_profiles` (id TEXT PK, full_name TEXT nullable, normalized_phone TEXT nullable, phone TEXT nullable, cccd_number TEXT nullable, identity_verification TEXT NOT NULL DEFAULT 'UNVERIFIED', completeness TEXT NOT NULL DEFAULT 'MINIMAL', consent_at TIMESTAMP(3), created_at, updated_at, worker_id TEXT nullable)
- Bảng `labor_profile_intakes` (id TEXT PK, labor_profile_id TEXT NOT NULL FK, channel TEXT NOT NULL, source_submission_id TEXT, captured_by_user_id TEXT, captured_at, payload JSONB, created_at, updated_at, CHECK constraint)
- Bảng `labor_profile_episodes` (id TEXT PK, labor_profile_id TEXT NOT NULL FK, episode_type TEXT, started_at, ended_at, employer_id TEXT, role TEXT, notes TEXT, created_at, updated_at)

**Tier 0 check**: 3 bảng `labor_profiles`, `labor_profile_intakes`, `labor_profile_episodes` đều ≠ NULL + có cột `labor_profile_id` trên `candidate_submissions`.

### A.4. `20260908150001_v6_phase1a_labor_profile_rls`

**File**: `prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls/migration.sql` (134 dòng)

**DDL đặc trưng**:
- ENABLE + FORCE ROW LEVEL SECURITY trên 3 bảng Phase 1A: `labor_profiles`, `labor_profile_intakes`, `labor_profile_episodes`
- Policies `hrp_labor_profile_scope` (1 PERMISSIVE ALL, USING role IN ('ADMIN','HR_MANAGER','DIRECTOR') OR (HR_STAFF AND worker_id IS NULL) OR (HR_STAFF AND worker_id IS NOT NULL AND same worker))
- Policies `hrp_labor_profile_intake_scope`, `hrp_labor_profile_episode_scope` (tương tự)
- **0 DROP POLICY** (forward-only)
- GRANT SELECT/INSERT/UPDATE cho `app_user`, `app_user_writer` trên 3 bảng

**Tier 0 check**: 3 bảng có `relrowsesecurity = true` AND `relforcerowsecurity = true` + `pg_policies` view có đúng policy names.

### A.5. `20260911001_project_company_name_denorm`

**File**: `prisma/migrations/20260911001_project_company_name_denorm/migration.sql` (12 dòng)

**DDL/DML đặc trưng**:
- ALTER TABLE `outsourcing_projects` ADD COLUMN IF NOT EXISTS `client_company_name` TEXT (nullable)
- UPDATE backfill: `UPDATE outsourcing_projects p SET client_company_name = cc.name FROM client_companies cc WHERE p.client_company_id = cc.id AND p.client_company_name IS NULL;`

**Tier 0 check**: cột `client_company_name` tồn tại trên `outsourcing_projects` + backfill đã chạy (giá trị trên rows có `client_company_id` non-null ≠ NULL).

### A.6. `20260911002_av1_homepage_settings`

**File**: `prisma/migrations/20260911002_av1_homepage_settings/migration.sql` (43 dòng)

**DDL/DML đặc trưng**:
- CREATE TABLE IF NOT EXISTS `homepage_settings` (id TEXT PRIMARY KEY DEFAULT 'default', best_jobs_page_size INT NOT NULL DEFAULT 9 CHECK (IN 3,6,9,12), listing_page_size INT NOT NULL DEFAULT 12 CHECK BETWEEN 6 AND 50, created_at, updated_at, updated_by_id TEXT FK → users.id)
- INDEX `homepage_settings_best_jobs_page_size_idx`
- INSERT seed: `INSERT INTO homepage_settings (id, ...) VALUES ('default', ...) ON CONFLICT (id) DO NOTHING;`

**Tier 0 check**: `to_regclass('public.homepage_settings')` ≠ NULL + `SELECT count(*) FROM homepage_settings` ≥ 1.

### A.7. `20260912001_av4_media_library`

**File**: `prisma/migrations/20260912001_av4_media_library/migration.sql` (95 dòng)

**DDL đặc trưng**:
- CREATE TYPE `MediaStatus` AS ENUM ('PUBLIC', 'INTERNAL')
- CREATE TABLE IF NOT EXISTS `media` (id TEXT PK, storage_provider TEXT NOT NULL, storage_key TEXT NOT NULL, mime_type TEXT NOT NULL, byte_size BIGINT NOT NULL, original_filename TEXT, alt_text TEXT, status MediaStatus NOT NULL DEFAULT 'PUBLIC', uploaded_by_id TEXT FK → users.id, created_at, updated_at, CHECK constraint)
- INDEX `media_status_created_at_idx`, `media_uploaded_by_id_idx`
- GRANT SELECT/INSERT/UPDATE/DELETE cho `app_user`, `app_user_writer`

**Tier 0 check**: `to_regclass('public.media')` ≠ NULL + enum `MediaStatus` tồn tại trong `pg_type`.

## B. Tier 0 — verify-pre-reclone.sql (READ-ONLY đối chiếu trên `hrp-live`)

> Tier 0 chạy qua URL hrp-live admin (neondb_owner) và gửi output về Tier 1.
> KHÔNG chạm bất kỳ thứ gì ngoài SELECT.

```sql
-- B.1. job_opening_posting_split (#2)
SELECT 'job_openings' AS t, to_regclass('public.job_openings') AS exists
UNION ALL SELECT 'job_postings', to_regclass('public.job_postings')
UNION ALL SELECT 'staffing_order_slots.job_opening_id', (
    SELECT column_name FROM information_schema.columns
     WHERE table_name='staffing_order_slots' AND column_name='job_opening_id'
);

-- B.2. labor_profile schema (#3)
SELECT 'labor_profiles' AS t, to_regclass('public.labor_profiles') AS exists
UNION ALL SELECT 'labor_profile_intakes', to_regclass('public.labor_profile_intakes')
UNION ALL SELECT 'labor_profile_episodes', to_regclass('public.labor_profile_episodes')
UNION ALL SELECT 'candidate_submissions.labor_profile_id', (
    SELECT column_name FROM information_schema.columns
     WHERE table_name='candidate_submissions' AND column_name='labor_profile_id'
);

-- B.3. labor_profile RLS (#4) — verify ENABLE + FORCE
SELECT relname, relrowsecurity AS rls_en, relforcerowsecurity AS rls_force
  FROM pg_class
 WHERE relname IN ('labor_profiles','labor_profile_intakes','labor_profile_episodes')
 ORDER BY relname;

-- B.4. project_company_name_denorm (#5) — verify column + backfill count
SELECT column_name FROM information_schema.columns
 WHERE table_name='outsourcing_projects' AND column_name='client_company_name';
SELECT count(*) AS projects_with_name
  FROM outsourcing_projects WHERE client_company_id IS NOT NULL AND client_company_name IS NOT NULL;
SELECT count(*) AS projects_missing_name
  FROM outsourcing_projects WHERE client_company_id IS NOT NULL AND client_company_name IS NULL;

-- B.5. av1 homepage_settings (#6)
SELECT to_regclass('public.homepage_settings') AS av1_table
     , (SELECT count(*) FROM homepage_settings) AS av1_rows;

-- B.6. av4 media + MediaStatus (#7)
SELECT to_regclass('public.media') AS media_table
     , (SELECT typname FROM pg_type WHERE typname = 'MediaStatus') AS media_enum;

-- B.7. public_rpc_residual_grant_revoke (#1) — verify EXECUTE on 7 RPCs revoked from PUBLIC
SELECT proname,
       has_function_privilege('PUBLIC', p.oid, 'EXECUTE') AS public_execute
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname='public' AND proname IN (
     'match_jobs_for_candidate','submit_candidate_for_opening',
     'list_published_jobs','get_job_detail','get_client_company_jobs',
     'get_homepage_settings','update_homepage_settings'
   )
 ORDER BY proname;
```

**Kỳ vọng PASS** cho tất cả DDL ngoài N1 trên `hrp-live`:
- B.1 — 3 rows non-null
- B.2 — 4 rows non-null
- B.3 — 3 rows, `rls_en=t`, `rls_force=t`
- B.4 — 1 row có cột `client_company_name`; backfill count tùy data sống
- B.5 — `av1_table` non-null; `av1_rows ≥ 1`
- B.6 — `media_table` non-null; `media_enum = MediaStatus`
- B.7 — Tất cả 7 RPC có `public_execute = false`

## C. Tier 0 — verify-pre-reclone-hrp_mp2_test.sql (READ-ONLY đối chiếu **sau khi** re-clone)

Sau khi Tier 0 reset + re-clone `hrp_mp2_test` từ `hrp-live` (Neon Console / Neon API), Tier 0 chạy script dưới để Tier 1 xác nhận baseline đúng trước khi Tier 1 chạy STEP 3.

```sql
-- C.1. Schema phải có đủ 7 bảng/enum NGOÀI N1 + (chưa) có placement_case
SELECT 'job_openings' AS t, to_regclass('public.job_openings') AS exists
UNION ALL SELECT 'job_postings', to_regclass('public.job_postings')
UNION ALL SELECT 'labor_profiles', to_regclass('public.labor_profiles')
UNION ALL SELECT 'labor_profile_intakes', to_regclass('public.labor_profile_intakes')
UNION ALL SELECT 'labor_profile_episodes', to_regclass('public.labor_profile_episodes')
UNION ALL SELECT 'homepage_settings', to_regclass('public.homepage_settings')
UNION ALL SELECT 'media', to_regclass('public.media')
UNION ALL SELECT 'placement_case (expect NULL — chưa apply N1)', to_regclass('public.placement_case')
UNION ALL SELECT 'candidate_submissions.placement_case_id (expect NULL)', (
    SELECT column_name FROM information_schema.columns
     WHERE table_name='candidate_submissions' AND column_name='placement_case_id'
);

-- C.2. Migration tracking phải có 28 rows (N1 chưa có)
SELECT count(*) AS completed_migrations
  FROM _prisma_migrations WHERE finished_at IS NOT NULL;
-- Kỳ vọng: 28 (Tất cả NGOÀI N1) + 0 cho N1.

SELECT migration_name FROM _prisma_migrations
 WHERE migration_name LIKE '%n1%';
-- Kỳ vọng: 0 rows (chưa apply N1).

-- C.3. Policy/RPC check (tương tự B.3, B.7)
SELECT relname, relrowsecurity AS rls_en
  FROM pg_class
 WHERE relname IN ('labor_profiles','homepage_settings','media');
```

## D. Sau khi C verify PASS

- Tier 1 chạy **STEP 1 → 5** theo runbook `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-hrp-mp2-test-runbook.md`:
  - STEP 1 — URL/DB fingerprint (chỉ trên `hrp_mp2_test` URLs).
  - STEP 1.5 — `neon_branch_gate.ps1` (qua NEON_API_KEY + NEON_PROJECT_ID).
  - STEP 2 — `prisma migrate status` (kỳ vọng 28 completed + 2 N1 pending + 0 stuck).
  - STEP 3 — `npx prisma migrate deploy` (chỉ apply 2 N1 migrations).
  - STEP 4 — `node probe.mjs` (28/28 + stage3_real_pass=true + cleanup-needed n_ids=0).
  - STEP 5a — gate summary 28/28 + stage3_real_pass=true (strict [bool]).
  - STEP 5b — sanitise + commit evidence (NDJSON + stderr trace, raw bytes).

## E. Điều kiện Stage 3 PASS

Theo Tier 0 chốt Q-04:
- ✅ Chỉ 2 migration N1 pending; không row unfinished/stuck.
- ✅ STEP 1.5 xác nhận đúng branch `hrp_mp2_test`.
- ✅ STEP 3 deploy 2 N1 migrations ADD-only.
- ✅ STEP 4 probe thực trả 28/28, cleanup-needed n_ids=0, `stage3_real_pass=true`, exit 0.
- ✅ STEP 5 sanitize evidence + commit.

## F. KHÔNG chạm

- ❌ `hrp-live` (DEC-N1-06).
- ❌ Reset `hrp_mp2_test` (do Tier 0 thực hiện).
- ❌ Chạy STEP 1 → 5 cho đến khi Tier 0 xác nhận §C PASS.
- ❌ Mở AV6.

## G. Revision log

| Version | Ngày | Thay đổi |
|---|---|---|
| 1.0 | 13/09/2026 12:30 | READ-ONLY support cho Tier 0 re-clone verification. Fingerprint từ HEAD `b31581a`; verify scripts B/C/D cho Tier 0 chạy trên `hrp-live` (B) + `hrp_mp2_test` post-reclone (C). Tier 1 KHÔNG kết nối DB; chỉ đọc repo. |
