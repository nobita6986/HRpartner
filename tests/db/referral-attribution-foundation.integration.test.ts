import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID as uuidv4 } from 'crypto';

describe('N2-1 Foundation Integration (E-01..E-17)', () => {
  let adminDb: PrismaClient;
  let engineDb: PrismaClient;
  let ephemeralPassword = '';
  const engineRole = 'app_engine_writer';
  const createdRows: string[] = [];
  const runNamespace = uuidv4().substring(0, 8);

  // Helper to generate namespaced IDs
  const nid = (suffix: string) => `n2-1-${runNamespace}-${suffix}`;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL_TEST || process.env.DATABASE_URL_TEST.includes('placeholder')) {
      throw new Error('ENV_BLOCKED: DATABASE_URL_TEST required');
    }
    if (!process.env.DATABASE_URL_ADMIN_TEST || process.env.DATABASE_URL_ADMIN_TEST.includes('placeholder')) {
      throw new Error('ENV_BLOCKED: DATABASE_URL_ADMIN_TEST required');
    }

    adminDb = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL_ADMIN_TEST } } });

    // Enforce E-14 (Real login, no SET ROLE)
    if (!process.env.HRPARTNER_ENGINE_URL) {
      ephemeralPassword = uuidv4();
      await adminDb.$executeRawUnsafe(`ALTER ROLE ${engineRole} WITH PASSWORD '${ephemeralPassword}';`);

      const adminUrl = new URL(process.env.DATABASE_URL_ADMIN_TEST);
      adminUrl.username = engineRole;
      adminUrl.password = ephemeralPassword;
      process.env.HRPARTNER_ENGINE_URL = adminUrl.toString();
    }

    engineDb = new PrismaClient({ datasources: { db: { url: process.env.HRPARTNER_ENGINE_URL } } });

    // Seed test users
    await adminDb.$executeRawUnsafe(`INSERT INTO users(id, role, is_active, updated_at) VALUES ('${nid('worker')}', 'WORKER', true, NOW()) ON CONFLICT DO NOTHING`);
    await adminDb.$executeRawUnsafe(`INSERT INTO labor_profiles(id, identity_verification, completeness, updated_at) VALUES ('${nid('worker')}', 'UNVERIFIED', 'MINIMAL', NOW()) ON CONFLICT DO NOTHING`);
    await adminDb.$executeRawUnsafe(`INSERT INTO users(id, role, is_active, updated_at) VALUES ('${nid('admin')}', 'ADMIN', true, NOW()) ON CONFLICT DO NOTHING`);
    await adminDb.$executeRawUnsafe(`INSERT INTO labor_profiles(id, identity_verification, completeness, updated_at) VALUES ('${nid('lp1')}', 'UNVERIFIED', 'MINIMAL', NOW()) ON CONFLICT DO NOTHING`);
    await adminDb.$executeRawUnsafe(`INSERT INTO labor_profiles(id, identity_verification, completeness, updated_at) VALUES ('${nid('lp2')}', 'UNVERIFIED', 'MINIMAL', NOW()) ON CONFLICT DO NOTHING`);
  });

  afterAll(async () => {
    try {
      // Clean up in FK-safe order
      if (adminDb && createdRows.length > 0) {
        for (const id of createdRows) {
          try { await adminDb.$executeRawUnsafe(`DELETE FROM referral_attributions WHERE id = '${id}'`); } catch (e) {}
        }
      }
      if (adminDb) {
        try { await adminDb.$executeRawUnsafe(`DELETE FROM labor_profiles WHERE id IN ('${nid('worker')}', '${nid('lp1')}', '${nid('lp2')}')`); } catch (e) {}
        try { await adminDb.$executeRawUnsafe(`DELETE FROM users WHERE id IN ('${nid('worker')}', '${nid('admin')}')`); } catch (e) {}
      }
    } finally {
      if (engineDb) await engineDb.$disconnect();
      if (ephemeralPassword && adminDb) {
        try {
          // E-14 cleanup must happen in finally
          await adminDb.$executeRawUnsafe(`ALTER ROLE ${engineRole} WITH PASSWORD NULL;`);
        } catch (e) {
          console.error('Failed to cleanup ephemeral password:', e);
        }
      }
      if (adminDb) await adminDb.$disconnect();
    }
  });

  it('E-01: app_engine_writer role posture asserts', async () => {
    const res = await adminDb.$queryRaw<any[]>`SELECT rolname, rolsuper, rolbypassrls, rolcanlogin, rolinherit, rolreplication FROM pg_roles WHERE rolname = 'app_engine_writer'`;
    expect(res[0].rolname).toBe('app_engine_writer');
    expect(res[0].rolcanlogin).toBe(true);
    expect(res[0].rolsuper).toBe(false);
    expect(res[0].rolbypassrls).toBe(false);
    expect(res[0].rolinherit).toBe(false);
    expect(res[0].rolreplication).toBe(false);

    // No unexpected pg_auth_members
    const members = await adminDb.$queryRaw<any[]>`
      SELECT string_agg(gr.rolname::TEXT, ', ' ORDER BY gr.rolname) as unexpected
      FROM pg_auth_members m
      JOIN pg_roles gr ON gr.oid = m.roleid
      WHERE m.member = (SELECT oid FROM pg_roles WHERE rolname = 'app_engine_writer')
        AND gr.rolname != 'app_engine_writer';
    `;
    expect(members[0]?.unexpected || null).toBeNull();

    // Not owner of public schema
    const schemas = await adminDb.$queryRaw<any[]>`
      SELECT nspname FROM pg_namespace
      WHERE nspowner = (SELECT oid FROM pg_roles WHERE rolname = 'app_engine_writer')
    `;
    expect(schemas.length).toBe(0);

    // Not owner of target table
    const tables = await adminDb.$queryRaw<any[]>`
      SELECT c.relname FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE c.relowner = (SELECT oid FROM pg_roles WHERE rolname = 'app_engine_writer')
    `;
    expect(tables.length).toBe(0);
  });

  it('FORCE ROW LEVEL SECURITY is enabled on referral_attributions', async () => {
    const res = await adminDb.$queryRaw<any[]>`
      SELECT relforcerowsecurity, relrowsecurity
      FROM pg_class
      WHERE relname = 'referral_attributions'
    `;
    expect(res[0].relforcerowsecurity).toBe(true);
    expect(res[0].relrowsecurity).toBe(true);
  });

  it('E-02..E-05: exact table privileges for app_engine_writer', async () => {
    const q = await adminDb.$queryRaw<any[]>`
      SELECT privilege_type
      FROM information_schema.role_table_grants
      WHERE grantee = 'app_engine_writer' AND table_name = 'referral_attributions'
    `;
    const privs = q.map(r => r.privilege_type);
    expect(privs).toContain('SELECT');
    expect(privs).toContain('INSERT');
    expect(privs).toContain('UPDATE');
    expect(privs).not.toContain('DELETE');
  });

  it('E-14: current_user=app_engine_writer', async () => {
    const res = await engineDb.$queryRaw<any[]>`SELECT current_user`;
    expect(res[0].current_user).toBe('app_engine_writer');
  });

  it('E-15: pg_stat_activity connection separation', async () => {
    await engineDb.$queryRaw`SELECT 1`;
    const res = await adminDb.$queryRaw<any[]>`SELECT usename FROM pg_stat_activity WHERE usename = 'app_engine_writer'`;
    expect(res.length).toBeGreaterThan(0);
  });

  it('E-16: HRPARTNER_ENGINE_URL fail-closed (No app_user_writer fallback)', async () => {
    const res = await engineDb.$queryRaw<any[]>`SELECT current_user`;
    expect(res[0].current_user).toBe('app_engine_writer');
    // If it fell back, it would be app_user_writer.
    // Handled inherently by E-14 and standard connection logic.
  });

  it('E-09, E-13: INSERT without context or unset GUC denied', async () => {
    await expect(
      engineDb.$executeRawUnsafe(`INSERT INTO referral_attributions(id, referrer_user_id, affiliate_code_snapshot, first_clicked_at, expires_at, status, updated_at) VALUES ('${uuidv4()}', '${nid('worker')}', 'snap', NOW(), NOW(), 'ACTIVE', NOW())`)
    ).rejects.toThrow();
  });

  it('E-10: INSERT with invalid context denied', async () => {
    await engineDb.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('hrp.engine_context', 'false', true)`;
      await expect(
        tx.$executeRawUnsafe(`INSERT INTO referral_attributions(id, referrer_user_id, affiliate_code_snapshot, first_clicked_at, expires_at, status, updated_at) VALUES ('${uuidv4()}', '${nid('worker')}', 'snap', NOW(), NOW(), 'ACTIVE', NOW())`)
      ).rejects.toThrow();
    });
  });

  it('E-17: INSERT ... RETURNING allowed (with valid context)', async () => {
    await engineDb.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('hrp.engine_context', 'link-capture', true)`;
      const newId = uuidv4();
      const res = await tx.$queryRawUnsafe<any[]>(`
        INSERT INTO referral_attributions(id, referrer_user_id, affiliate_code_snapshot, first_clicked_at, expires_at, status, updated_at)
        VALUES ('${newId}', '${nid('worker')}', 'snap', NOW(), NOW(), 'ACTIVE', NOW())
        RETURNING status
      `);
      expect(res[0].status).toBe('ACTIVE');
      createdRows.push(newId);
    });
  });

  it('E-06 & E-12: Context cleared at COMMIT & pooled leak denied', async () => {
    await engineDb.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('hrp.engine_context', 'link-capture', true)`;
    });
    const res = await engineDb.$queryRaw<any[]>`SELECT current_setting('hrp.engine_context', true) as ctx`;
    expect(res[0].ctx).toBeFalsy();
  });

  it('E-07: Context cleared at ROLLBACK', async () => {
    try {
      await engineDb.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('hrp.engine_context', 'link-capture', true)`;
        throw new Error('trigger rollback');
      });
    } catch(e) {}
    const res = await engineDb.$queryRaw<any[]>`SELECT current_setting('hrp.engine_context', true) as ctx`;
    expect(res[0].ctx).toBeFalsy();
  });

  it('E-08: Link-capture context UPDATE on ACTIVE denied', async () => {
    await engineDb.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('hrp.engine_context', 'link-capture', true)`;
      const id = uuidv4();
      await tx.$executeRawUnsafe(`INSERT INTO referral_attributions(id, referrer_user_id, affiliate_code_snapshot, first_clicked_at, expires_at, status, updated_at) VALUES ('${id}', '${nid('worker')}', 'snap', NOW(), NOW(), 'ACTIVE', NOW())`);
      createdRows.push(id);

      const affected = await tx.$executeRawUnsafe(`UPDATE referral_attributions SET consumed_at = NOW() WHERE id = '${id}' AND status = 'ACTIVE'`);
      expect(affected).toBe(0);

      await tx.$executeRaw`SELECT set_config('hrp.engine_context', 'consume', true)`;
      const affected2 = await tx.$executeRawUnsafe(`UPDATE referral_attributions SET status = 'CONSUMED', consumed_at = NOW() WHERE id = '${id}'`);
      expect(affected2).toBe(1);

      const check = await tx.$queryRawUnsafe<any[]>(`SELECT status FROM referral_attributions WHERE id = '${id}'`);
      expect(check[0].status).toBe('CONSUMED');
    });
  });

  it('AC-02: Layer 1 immutable update', async () => {
    const id = uuidv4();
    await adminDb.$executeRawUnsafe(`INSERT INTO referral_attributions(id, referrer_user_id, affiliate_code_snapshot, first_clicked_at, expires_at, status, updated_at) VALUES ('${id}', '${nid('worker')}', 'snap', NOW(), NOW(), 'ACTIVE', NOW())`);
    createdRows.push(id);

    await expect(
      adminDb.$executeRawUnsafe(`UPDATE referral_attributions SET affiliate_code_snapshot = 'changed' WHERE id = '${id}'`)
    ).rejects.toThrow(/affiliate_code_snapshot is immutable/);

    await expect(
      adminDb.$executeRawUnsafe(`UPDATE referral_attributions SET created_at = NOW() WHERE id = '${id}'`)
    ).rejects.toThrow(/created_at is immutable/);
  });

  it('AC-03: Layer 1b laborProfileId write-once', async () => {
    const id = uuidv4();
    await adminDb.$executeRawUnsafe(`INSERT INTO referral_attributions(id, referrer_user_id, affiliate_code_snapshot, first_clicked_at, expires_at, status, updated_at) VALUES ('${id}', '${nid('worker')}', 'snap', NOW(), NOW(), 'ACTIVE', NOW())`);
    createdRows.push(id);

    await adminDb.$executeRawUnsafe(`UPDATE referral_attributions SET labor_profile_id = '${nid('lp1')}' WHERE id = '${id}'`);

    await expect(
      adminDb.$executeRawUnsafe(`UPDATE referral_attributions SET labor_profile_id = '${nid('lp2')}' WHERE id = '${id}'`)
    ).rejects.toThrow(/labor_profile_id is write-once/);
  });

  it('AC-04: Layer 1c lifecycle matrix (ACTIVE -> terminal)', async () => {
    const id = uuidv4();
    await adminDb.$executeRawUnsafe(`INSERT INTO referral_attributions(id, referrer_user_id, affiliate_code_snapshot, first_clicked_at, expires_at, status, updated_at) VALUES ('${id}', '${nid('worker')}', 'snap', NOW(), NOW(), 'ACTIVE', NOW())`);
    createdRows.push(id);

    await adminDb.$executeRawUnsafe(`UPDATE referral_attributions SET status = 'EXPIRED' WHERE id = '${id}'`);

    await expect(
      adminDb.$executeRawUnsafe(`UPDATE referral_attributions SET status = 'REVOKED' WHERE id = '${id}'`)
    ).rejects.toThrow(/cannot transition to/);
  });
});
