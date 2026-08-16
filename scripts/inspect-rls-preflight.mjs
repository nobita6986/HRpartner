/**
 * scripts/inspect-rls-preflight.mjs (TEMPORARY — STEP-01)
 * Khảo sát roles + grants + RLS state của Neon DB dev.
 * Read-only — không thay đổi gì.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const out = (k, v) => console.log(`${k}=${v}`);

try {
  // 1. Current role/user
  const sessionRaw = await prisma.$queryRawUnsafe(`
    SELECT current_user AS user, current_database() AS db, session_user AS session_user,
           inet_client_addr() AS client_addr, version() AS pg_version
  `);
  out('CURRENT_USER', sessionRaw[0].user);
  out('CURRENT_DB', sessionRaw[0].db);
  out('SESSION_USER', sessionRaw[0].session_user);
  out('PG_VERSION', String(sessionRaw[0].pg_version || '').substring(0, 60));

  // 2. Memberships của current role
  const members = await prisma.$queryRawUnsafe(`
    SELECT rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole
    FROM pg_roles WHERE rolname = current_user
  `);
  out('ROLE_SUPER', members[0]?.rolsuper ?? 'unknown');
  out('ROLE_BYPASSRLS', members[0]?.rolbypassrls ?? 'unknown');
  out('ROLE_CREATEDB', members[0]?.rolcreatedb ?? 'unknown');

  // 3. ACL of current role (có quyền gì)
  const acl = await prisma.$queryRawUnsafe(`
    SELECT grantee, privilege_type, table_schema
    FROM information_schema.role_table_grants
    WHERE grantee = current_user
    ORDER BY table_schema, table_name
    LIMIT 20
  `);
  out('ACL_COUNT', acl.length);
  out('ACL_SAMPLE', acl.slice(0, 5).map(r => `${r.table_schema}.${r.privilege_type}`).join(','));

  // 4. RLS state trên các bảng chính Phase 2
  const rlsTables = await prisma.$queryRawUnsafe(`
    SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname IN ('workers', 'dependents', 'outsourcing_projects', 'project_assignments',
                        'vendors', 'candidate_submissions', 'vendor_statements',
                        'vendor_statement_lines', 'source_claims', 'tickets', 'ticket_comments')
    ORDER BY c.relname
  `);
  out('RLS_CHECKED_TABLES', rlsTables.length);
  for (const t of rlsTables) {
    out(`RLS_${t.relname}`, `rowsecurity=${t.relrowsecurity} force=${t.relforcerowsecurity}`);
  }

  // 5. Count rows in some scope tables (để biết có data để test)
  const counts = await prisma.$queryRawUnsafe(`
    SELECT
      (SELECT COUNT(*) FROM workers) AS workers,
      (SELECT COUNT(*) FROM outsourcing_projects) AS projects,
      (SELECT COUNT(*) FROM vendors) AS vendors,
      (SELECT COUNT(*) FROM tickets) AS tickets,
      (SELECT COUNT(*) FROM vendor_statements) AS vendor_statements,
      (SELECT COUNT(*) FROM project_assignments) AS project_assignments,
      (SELECT COUNT(*) FROM source_claims) AS source_claims
  `);
  for (const [k, v] of Object.entries(counts[0])) {
    out(`COUNT_${k}`, v);
  }

  // 6. Existing policies
  const policies = await prisma.$queryRawUnsafe(`
    SELECT schemaname, tablename, policyname, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  `);
  out('POLICIES_COUNT', policies.length);
  for (const p of policies.slice(0, 10)) {
    out(`POLICY`, `${p.tablename}.${p.policyname}`);
  }

  // 7. Existing roles (kiểm tra đã có role nào tách sẵn chưa)
  const roles = await prisma.$queryRawUnsafe(`
    SELECT rolname FROM pg_roles
    WHERE rolname IN ('app_user', 'app_user_writer', 'hrp_etl', 'app_static_role')
    ORDER BY rolname
  `);
  out('EXISTING_SEPARATED_ROLES', roles.length);
  for (const r of roles) out('ROLE_NAME', r.rolname);
} catch (e) {
  console.error('PREFLIGHT_ERR', String(e.message || e).split('\n')[0]);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
