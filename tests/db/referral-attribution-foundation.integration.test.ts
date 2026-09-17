import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID as uuidv4 } from 'crypto';

describe('N2-1 Foundation Integration (E-01..E-17)', () => {
  let adminDb: PrismaClient;
  let engineDb: PrismaClient;
  let ephemeralPassword = '';
  const engineRole = 'app_engine_writer';

  beforeAll(async () => {
    if (!process.env.DATABASE_URL_TEST || process.env.DATABASE_URL_TEST.includes('placeholder')) {
      throw new Error('ENV_BLOCKED: DATABASE_URL_TEST required');
    }
    if (!process.env.DATABASE_URL_ADMIN_TEST || process.env.DATABASE_URL_ADMIN_TEST.includes('placeholder')) {
      throw new Error('ENV_BLOCKED: DATABASE_URL_ADMIN_TEST required');
    }

    adminDb = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL_ADMIN_TEST } } });

    if (!process.env.HRPARTNER_ENGINE_URL) {
      ephemeralPassword = uuidv4();
      await adminDb.$executeRawUnsafe(`ALTER ROLE ${engineRole} WITH PASSWORD '${ephemeralPassword}';`);
      
      const adminUrl = new URL(process.env.DATABASE_URL_ADMIN_TEST);
      adminUrl.username = engineRole;
      adminUrl.password = ephemeralPassword;
      process.env.HRPARTNER_ENGINE_URL = adminUrl.toString();
    }

    engineDb = new PrismaClient({ datasources: { db: { url: process.env.HRPARTNER_ENGINE_URL } } });

    // Ensure dummy users exist for tests
    await adminDb.$executeRaw`INSERT INTO users(id, role, is_active, updated_at) VALUES ('n2-1-public-id', 'WORKER', true, NOW()) ON CONFLICT DO NOTHING`;
    await adminDb.$executeRaw`INSERT INTO users(id, role, is_active, updated_at) VALUES ('n2-1-worker-id', 'WORKER', true, NOW()) ON CONFLICT DO NOTHING`;
    await adminDb.$executeRaw`INSERT INTO labor_profiles(id, identity_verification, completeness, updated_at) VALUES ('n2-1-worker-id', 'UNVERIFIED', 'MINIMAL', NOW()) ON CONFLICT DO NOTHING`;
    await adminDb.$executeRaw`INSERT INTO users(id, role, is_active, updated_at) VALUES ('n2-1-ctv-id', 'CTV', true, NOW()) ON CONFLICT DO NOTHING`;
    await adminDb.$executeRaw`INSERT INTO users(id, role, is_active, updated_at) VALUES ('n2-1-hr-id', 'HR_STAFF', true, NOW()) ON CONFLICT DO NOTHING`;
    await adminDb.$executeRaw`INSERT INTO users(id, role, is_active, updated_at) VALUES ('n2_admin', 'ADMIN', true, NOW()) ON CONFLICT DO NOTHING`;
    await adminDb.$executeRaw`INSERT INTO labor_profiles(id, identity_verification, completeness, updated_at) VALUES ('n2_lp1', 'UNVERIFIED', 'MINIMAL', NOW()) ON CONFLICT DO NOTHING`;
    await adminDb.$executeRaw`INSERT INTO labor_profiles(id, identity_verification, completeness, updated_at) VALUES ('n2_lp2', 'UNVERIFIED', 'MINIMAL', NOW()) ON CONFLICT DO NOTHING`;
  });

  afterAll(async () => {
    if (engineDb) await engineDb.$disconnect();
    if (ephemeralPassword && adminDb) {
      await adminDb.$executeRawUnsafe(`ALTER ROLE ${engineRole} WITH PASSWORD NULL;`);
    }
    if (adminDb) await adminDb.$disconnect();
  });

  it('E-01: app_engine_writer role posture', async () => {
    const res = await adminDb.$queryRaw<any[]>`SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'app_engine_writer'`;
    expect(res[0].rolsuper).toBe(false);
    expect(res[0].rolbypassrls).toBe(false);
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
    // Engine must be able to execute something to show up, wait a bit
    await engineDb.$queryRaw`SELECT 1`;
    const res = await adminDb.$queryRaw<any[]>`SELECT usename FROM pg_stat_activity WHERE usename = 'app_engine_writer'`;
    expect(res.length).toBeGreaterThan(0);
  });

  it('E-09, E-13: INSERT without context or unset GUC denied', async () => {
    await expect(
      engineDb.$executeRaw`INSERT INTO referral_attributions(id, referrer_user_id, affiliate_code_snapshot, first_clicked_at, expires_at, status, updated_at) VALUES (${uuidv4()}, 'n2-1-worker-id', 'snap', NOW(), NOW(), 'ACTIVE', NOW())`
    ).rejects.toThrow();
  });

  it('E-10: INSERT with invalid context denied', async () => {
    await engineDb.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('hrp.engine_context', 'false', true)`;
      await expect(
        tx.$executeRaw`INSERT INTO referral_attributions(id, referrer_user_id, affiliate_code_snapshot, first_clicked_at, expires_at, status, updated_at) VALUES (${uuidv4()}, 'n2-1-worker-id', 'snap', NOW(), NOW(), 'ACTIVE', NOW())`
      ).rejects.toThrow();
    });
  });

  it('E-17: INSERT ... RETURNING allowed (with valid context)', async () => {
    await engineDb.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('hrp.engine_context', 'link-capture', true)`;
      const res = await tx.$queryRaw<any[]>`
        INSERT INTO referral_attributions(id, referrer_user_id, affiliate_code_snapshot, first_clicked_at, expires_at, status, updated_at) 
        VALUES (${uuidv4()}, 'n2-1-worker-id', 'snap', NOW(), NOW(), 'ACTIVE', NOW())
        RETURNING status
      `;
      expect(res[0].status).toBe('ACTIVE');
    });
  });

  it('E-06: Context cleared at COMMIT & E-12 pooled leak denied', async () => {
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
      await tx.$executeRaw`INSERT INTO referral_attributions(id, referrer_user_id, affiliate_code_snapshot, first_clicked_at, expires_at, status, updated_at) VALUES (${id}, 'n2-1-worker-id', 'snap', NOW(), NOW(), 'ACTIVE', NOW())`;
      
      // Attempting to UPDATE but keep status ACTIVE is denied by RLS
      const affected = await tx.$executeRaw`UPDATE referral_attributions SET consumed_at = NOW() WHERE id = ${id} AND status = 'ACTIVE'`;
      expect(affected).toBe(0);
      
      // Updating to CONSUMED is allowed by RLS (with consume context)
      await tx.$executeRaw`SELECT set_config('hrp.engine_context', 'consume', true)`;
      const affected2 = await tx.$executeRaw`UPDATE referral_attributions SET status = 'CONSUMED', consumed_at = NOW() WHERE id = ${id}`;
      expect(affected2).toBe(1);
      const check = await tx.$queryRaw<any[]>`SELECT status FROM referral_attributions WHERE id = ${id}`;
      expect(check[0].status).toBe('CONSUMED');
    });
  });

  it('AC-02: Layer 1 immutable update', async () => {
    const id = uuidv4();
    await adminDb.$executeRaw`INSERT INTO referral_attributions(id, referrer_user_id, affiliate_code_snapshot, first_clicked_at, expires_at, status, updated_at) VALUES (${id}, 'n2-1-worker-id', 'snap', NOW(), NOW(), 'ACTIVE', NOW())`;
    
    // Admin trying to change immutable field
    await expect(
      adminDb.$executeRaw`UPDATE referral_attributions SET affiliate_code_snapshot = 'changed' WHERE id = ${id}`
    ).rejects.toThrow(/Immutable fields cannot be updated/);
  });

  it('AC-03: Layer 1b laborProfileId write-once', async () => {
    const id = uuidv4();
    await adminDb.$executeRaw`INSERT INTO referral_attributions(id, referrer_user_id, affiliate_code_snapshot, first_clicked_at, expires_at, status, updated_at) VALUES (${id}, 'n2-1-worker-id', 'snap', NOW(), NOW(), 'ACTIVE', NOW())`;
    
    // First update is allowed (NULL -> value)
    await adminDb.$executeRaw`UPDATE referral_attributions SET labor_profile_id = 'n2_lp1' WHERE id = ${id}`;
    
    // Second update is rejected (value -> value)
    await expect(
      adminDb.$executeRaw`UPDATE referral_attributions SET labor_profile_id = 'n2_lp2' WHERE id = ${id}`
    ).rejects.toThrow(/labor_profile_id is write-once/);
  });

  it('AC-04: Layer 1c lifecycle matrix (ACTIVE -> terminal)', async () => {
    const id = uuidv4();
    await adminDb.$executeRaw`INSERT INTO referral_attributions(id, referrer_user_id, affiliate_code_snapshot, first_clicked_at, expires_at, status, updated_at) VALUES (${id}, 'n2-1-worker-id', 'snap', NOW(), NOW(), 'ACTIVE', NOW())`;
    
    // Transition to EXPIRED
    await adminDb.$executeRaw`UPDATE referral_attributions SET status = 'EXPIRED' WHERE id = ${id}`;
    
    // Terminal to another terminal is rejected
    await expect(
      adminDb.$executeRaw`UPDATE referral_attributions SET status = 'REVOKED' WHERE id = ${id}`
    ).rejects.toThrow(/Cannot transition from terminal state/);
  });
});
