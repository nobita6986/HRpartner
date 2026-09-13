# verify-pre-step2.sql — READ-ONLY verification for hrp_mp2_test baseline
#
# Tier 0 runs this via $env:TEST_DATABASE_URL_ADMIN (neondb_owner role).
# NO mutation; only SELECT + to_regclass + has_*_privilege.
#
# Output is plain text. Pipe to verify-pre-step2.txt.
#
# EXPECTED (after Tier 0 chốt §9 of INVESTIGATION.md):
#   - _prisma_migrations có rows cho 7/9 migration NGOÀI N1 (nếu B) HOẶC
#     rỗng sau khi re-clone (nếu A) HOẶC mix.
#   - to_regclass của 7 bảng NGOÀI N1 (job_openings, job_postings,
#     labor_profiles, homepage_settings, media, outsourcing_projects đã có
#     cột client_company_name) đều KHÁC NULL.
#   - placement_case chưa tồn tại (chưa apply N1).
#
# Lưu ý: KHÔNG echo URL/user — dùng biến env.

-- 1. List _prisma_migrations
SELECT migration_name
     , finished_at IS NOT NULL AS completed
     , rolled_back_at IS NOT NULL AS rolled_back
     , substring(coalesce(logs,'') from 1 for 80) AS log_head
  FROM _prisma_migrations
 ORDER BY started_at NULLS FIRST, migration_name;

-- 2. Schema existence check
SELECT 'job_openings' AS obj, to_regclass('public.job_openings') AS exists
UNION ALL SELECT 'job_postings', to_regclass('public.job_postings')
UNION ALL SELECT 'labor_profiles', to_regclass('public.labor_profiles')
UNION ALL SELECT 'labor_profile_intakes', to_regclass('public.labor_profile_intakes')
UNION ALL SELECT 'labor_profile_episodes', to_regclass('public.labor_profile_episodes')
UNION ALL SELECT 'homepage_settings', to_regclass('public.homepage_settings')
UNION ALL SELECT 'media', to_regclass('public.media')
UNION ALL SELECT 'placement_case (expect NULL — chưa apply N1)', to_regclass('public.placement_case');

-- 3. RLS status
SELECT relname AS table_name
     , relrowsecurity AS rls_enabled
     , relforcerowsecurity AS rls_forced
  FROM pg_class
 WHERE relname IN ('labor_profiles','labor_profile_intakes','labor_profile_episodes')
 ORDER BY relname;

-- 4. Column check for denorm #5
SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_name='outsourcing_projects' AND column_name='client_company_name';

-- 5. AV1 seed check
SELECT id, best_jobs_page_size, listing_page_size, created_at
  FROM homepage_settings;

-- 6. AV4 enum check
SELECT typname FROM pg_type WHERE typname IN ('MediaStatus');

-- 7. Forward-compat: privilege on placement_case (expect FALSE for both — chưa apply N1)
SELECT has_table_privilege('app_user_writer', 'placement_case', 'SELECT') AS sel
     , has_table_privilege('app_user_writer', 'placement_case', 'INSERT') AS ins
     , has_table_privilege('app_user_writer', 'placement_case', 'UPDATE') AS upd
     , has_table_privilege('app_user_writer', 'candidate_submissions', 'SELECT') AS cs_sel;

-- 8. Pending migration fingerprint (Prisma compute)
SELECT current_database() || '|' || coalesce(host(inet_server_addr()),'?') AS db_identity;
