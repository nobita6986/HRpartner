/**
 * live-integration.mp2 — MP-2 round 3 LIVE evidence (directive step 5).
 *
 * Exercises the REAL SECURITY DEFINER boundary + RLS against the sếp-provided,
 * SAFE test DB (Neon branch, separate host from prod). ENV_BLOCKED by default
 * (DEC-14): the whole suite is skipped unless MP2_LIVE_SECURITY_CHECK=1 is set
 * against a DB that has the migration applied + hrp_public_rpc provisioned.
 *
 * Covers the AC left PARTIAL/ENV_BLOCKED after audit round 1:
 *   • AC-02 — valid apply creates exactly ONE candidate_submissions + ONE
 *     initial history via hrp_public_apply_submission, no Worker/SourceClaim;
 *     closed/private/expired/full jobs are rejected (JOB_NOT_AVAILABLE).
 *   • AC-03 — idempotency replay (same key+payload → same tracking, no 2nd row),
 *     payload mismatch → P0010, duplicate slot+phone → P0012; concurrency is
 *     enforced at the storage layer (unique indexes) + a REAL N-way race.
 *   • AC-04 — hrp_public_tracking_projection returns ONLY the DEC-02 allow-list;
 *     unknown code → 0 rows (generic 404); no PII columns exist in the result.
 *   • AC-05 — candidate_submissions RLS read-scope floor: ADMIN/HR_MANAGER/
 *     DIRECTOR/SALE/ACCOUNTANT see an unscoped row; WORKER/VENDOR/CTV/PM/etc do
 *     not. (The app-layer DEC-06 queue gate — 4 roles, no ACCOUNTANT — is the
 *     unit-tested application-queue.service layer on top of this floor.)
 *
 * Every DB effect is inside BEGIN…ROLLBACK (row assertions) or explicitly
 * cleaned up in a finally (the committed concurrency race) — the test DB is
 * left pristine. The definer functions are the REAL migration objects; nothing
 * is mocked. Faithfulness note: AC-09 (security-boundary.mp2.test.ts) proves
 * app_user_writer holds the EXECUTE grant and that a direct anonymous INSERT is
 * RLS-denied; this file proves the function BEHAVIOUR/rows. neondb_owner cannot
 * EXECUTE the functions (verified), so the app_user_writer connection is used —
 * i.e. the real application principal.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Gap-fill repo .env WITHOUT overriding injected vars (same rule as the harness
// fix in security-boundary.mp2.test.ts): a LIVE runner injects the mapped test
// URLs; this loop must never clobber them with the repo .env (prod) values.
const ROOT = process.cwd();
if (existsSync(join(ROOT, '.env'))) {
  for (const line of readFileSync(join(ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([^#=]+?)="?([^"]+)"?/);
    if (m && process.env[m[1].trim()] === undefined) process.env[m[1].trim()] = m[2];
  }
}

const strip = (u?: string) => (u ? u.replace('&channel_binding=require', '') : u);
const ADMIN_URL = strip(process.env.DATABASE_URL_ADMIN);
const WRITER_URL = strip(process.env.DATABASE_URL_WRITER ?? process.env.DATABASE_URL);

// 17 positional args in the exact order of hrp_public_apply_submission(...).
type ApplyOpts = {
  slug: string; slotId?: string | null; fullName?: string; phone?: string;
  normPhone?: string; keyHash: string; payloadHash: string; tracking: string;
  consentAt?: string;
};
function applyArgs(o: ApplyOpts): any[] {
  return [
    o.slug, o.slotId ?? null, o.fullName ?? 'Nguyen Van A',
    o.phone ?? '0900000001', o.normPhone ?? '84900000001',
    null /*cccd*/, null /*dob*/, null /*gender*/, null /*experience*/,
    o.consentAt ?? new Date().toISOString(), null /*cv_file*/, null /*cv_mime*/,
    null /*cv_size*/, null /*cv_key*/, o.keyHash, o.payloadHash, o.tracking,
  ];
}
const APPLY_CALL =
  'SELECT * FROM hrp_public_apply_submission($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)';

// Seed a job fixture (client_company → project → order → slot). Project/order
// tables use FORCE RLS, so every fixture transaction first establishes an
// explicit ADMIN GUC context; public RPC calls clear app.role afterwards.
type SeedOpts = {
  isPublic?: boolean; projStatus?: string; orderStatus?: string;
  slotsNeeded?: number; slotsFilled?: number; deadlineDate?: string | null;
};
async function seedJob(c: any, prefix: string, o: SeedOpts = {}) {
  const sfx = prefix + '-' + Math.random().toString(36).slice(2, 10);
  const ccId = `mp2live-cc-${sfx}`, projId = `mp2live-pr-${sfx}`;
  const orderId = `mp2live-so-${sfx}`, slotId = `mp2live-sl-${sfx}`;
  const code = `MP2LIVE-${sfx}`;
  await c.query(
    `INSERT INTO client_companies (id, code, name, status, created_at) VALUES ($1,$2,'MP2 Live CC','ACTIVE', now())`,
    [ccId, `CC-${sfx}`],
  );
  await c.query(
    `INSERT INTO outsourcing_projects (id, code, client_company_id, name, start_date, status, is_public, quota, filled, version, created_at)
       VALUES ($1,$2,$3,'MP2 Live Project', now()::date, $4, $5, 0, 0, 1, now())`,
    [projId, code, ccId, o.projStatus ?? 'ACTIVE', o.isPublic ?? true],
  );
  await c.query(
    `INSERT INTO staffing_orders (id, project_id, code, title, status, deadline_date, created_at)
       VALUES ($1,$2,$3,'MP2 Live Order', $4, $5, now())`,
    [orderId, projId, `SO-${sfx}`, o.orderStatus ?? 'OPEN', o.deadlineDate ?? null],
  );
  await c.query(
    `INSERT INTO staffing_order_slots (id, staffing_order_id, position_code, position_title, slots_needed, slots_filled, valid_from, created_at)
       VALUES ($1,$2,'WORKER','MP2 Live Position', $3, $4, now()::date, now())`,
    [slotId, orderId, o.slotsNeeded ?? 5, o.slotsFilled ?? 0],
  );
  return { code, slotId, projId, orderId, ccId };
}

// PG error code carried on the thrown pg error (err.code).
async function expectSqlState(promise: Promise<any>, code: string) {
  try {
    await promise;
    throw new Error(`expected SQLSTATE ${code} but the call succeeded`);
  } catch (e: any) {
    expect(e.code, `got: ${e.message}`).toBe(code);
  }
}
// PLACEHOLDER_SUITE_REMOVED

describe.skipIf(!process.env.MP2_LIVE_SECURITY_CHECK)('MP-2 LIVE integration (AC-02/03/04/05)', () => {
  let Client: any;
  let writer: any; // app_user_writer — the real application principal (RLS-enforced)
  let admin: any;  // neondb_owner — explicit ADMIN GUC, used for committed race setup/cleanup

  beforeAll(async () => {
    // @ts-expect-error -- 'pg' ships no types; @types/pg not installed. LIVE block is ENV_BLOCKED (DEC-14).
    ({ Client } = await import('pg'));
    writer = new Client({ connectionString: WRITER_URL });
    await writer.connect();
    admin = new Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query(
      "SELECT set_config('app.user_id', 'mp2-live-admin', false), set_config('app.role', 'ADMIN', false)",
    );
  }, 30000);
  afterAll(async () => {
    await writer?.end().catch(() => {});
    await admin?.end().catch(() => {});
  });

  // Run body inside a transaction on `writer`, always ROLLBACK — zero residue.
  async function inRollback(fn: () => Promise<void>) {
    await writer.query('BEGIN');
    try {
      await writer.query(
        "SELECT set_config('app.user_id', 'mp2-live-fixture', true), set_config('app.role', 'ADMIN', true)",
      );
      await fn();
    } finally {
      await writer.query('ROLLBACK').catch(() => {});
    }
  }
  const anon = () => writer.query(`SELECT set_config('app.role', '', true)`);        // public path
  const asRole = (r: string) => writer.query(`SELECT set_config('app.role', $1, true)`, [r]);

  // ── AC-02 — valid apply: exactly one submission + one history, no Worker/SourceClaim ──
  it('AC-02 valid apply creates exactly one submission + initial history (no Worker/SourceClaim)', async () => {
    await inRollback(async () => {
      const key = `mp2live-k-${Math.random().toString(36).slice(2)}`;
      const job = await seedJob(writer, 'ac02');
      const tracking = `mp2live-t-${Math.random().toString(36).slice(2)}`;
      await anon(); // the public path never sets app.role
      const r = await writer.query(APPLY_CALL, applyArgs({ slug: job.code, slotId: job.slotId, keyHash: key, payloadHash: 'p1', tracking }));
      expect(r.rows.length).toBe(1);
      expect(r.rows[0].tracking_code).toBe(tracking);
      expect(r.rows[0].status).toBe('NEW');

      await asRole('ADMIN'); // read-back as an authenticated reader
      const sub = await writer.query(
        `SELECT id, status, vendor_id, ctv_id, slot_id, project_id, merged_worker_id, dedup_worker_id
           FROM candidate_submissions WHERE public_tracking_code = $1`, [tracking]);
      expect(sub.rows.length).toBe(1);
      expect(sub.rows[0].status).toBe('NEW');
      expect(sub.rows[0].vendor_id).toBeNull();
      expect(sub.rows[0].ctv_id).toBeNull();
      expect(sub.rows[0].merged_worker_id).toBeNull();
      expect(sub.rows[0].dedup_worker_id).toBeNull();
      expect(sub.rows[0].slot_id).toBe(job.slotId);
      expect(sub.rows[0].project_id).toBe(job.projId);

      const subId = sub.rows[0].id;
      const hist = await writer.query(
        `SELECT from_status, to_status, actor_user_id, reason FROM application_status_history WHERE submission_id = $1`, [subId]);
      expect(hist.rows.length).toBe(1);
      expect(hist.rows[0].from_status).toBeNull();
      expect(hist.rows[0].to_status).toBe('NEW');
      expect(hist.rows[0].actor_user_id).toBeNull();
      expect(hist.rows[0].reason).toBe('PUBLIC_APPLY');

      const sc = await writer.query(`SELECT count(*)::int AS n FROM source_claims WHERE submission_id = $1`, [subId]);
      expect(sc.rows[0].n).toBe(0); // NEVER a SourceClaim for an anonymous applicant
    });
  });

  // ── AC-02 — rejection: closed/private/expired/full jobs → JOB_NOT_AVAILABLE (P0011) ──
  it('AC-02 rejects private / non-active / closed / expired / full jobs (P0011)', async () => {
    const cases: [string, SeedOpts][] = [
      ['private',   { isPublic: false }],
      ['draft',     { projStatus: 'DRAFT' }],
      ['closed',    { orderStatus: 'CLOSED' }],
      ['expired',   { deadlineDate: '2000-01-01' }],
      ['full',      { slotsNeeded: 3, slotsFilled: 3 }],
    ];
    for (const [label, opts] of cases) {
      await inRollback(async () => {
        const job = await seedJob(writer, `ac02-${label}`, opts);
        await anon();
        await expectSqlState(
          writer.query(APPLY_CALL, applyArgs({
            slug: job.code, slotId: job.slotId,
            keyHash: `k-${label}-${Math.random()}`, payloadHash: 'p', tracking: `t-${label}-${Math.random()}`,
          })),
          'P0011', // JOB_NOT_AVAILABLE
        );
      });
    }
  }, 20000);

  // ── AC-03 — idempotency replay / payload mismatch / duplicate guard ──
  it('AC-03 same key+payload replays the same tracking with no second row', async () => {
    await inRollback(async () => {
      const job = await seedJob(writer, 'ac03-replay');
      const key = `k-${Math.random()}`, tracking = `t-${Math.random()}`;
      await anon();
      const r1 = await writer.query(APPLY_CALL, applyArgs({ slug: job.code, slotId: job.slotId, keyHash: key, payloadHash: 'same', tracking }));
      const r2 = await writer.query(APPLY_CALL, applyArgs({ slug: job.code, slotId: job.slotId, keyHash: key, payloadHash: 'same', tracking: 'DIFFERENT-IGNORED' }));
      expect(r1.rows[0].tracking_code).toBe(tracking);
      expect(r2.rows[0].tracking_code).toBe(tracking); // replay returns the ORIGINAL code
      await asRole('ADMIN');
      const n = await writer.query(`SELECT count(*)::int AS n FROM candidate_submissions WHERE idempotency_key_hash = $1`, [key]);
      expect(n.rows[0].n).toBe(1); // exactly one row despite two calls
    });
  });

  it('AC-03 same key + DIFFERENT payload → IDEMPOTENCY_PAYLOAD_MISMATCH (P0010)', async () => {
    await inRollback(async () => {
      const job = await seedJob(writer, 'ac03-mismatch');
      const key = `k-${Math.random()}`;
      await anon();
      await writer.query(APPLY_CALL, applyArgs({ slug: job.code, slotId: job.slotId, keyHash: key, payloadHash: 'payload-A', tracking: `t-${Math.random()}` }));
      await expectSqlState(
        writer.query(APPLY_CALL, applyArgs({ slug: job.code, slotId: job.slotId, keyHash: key, payloadHash: 'payload-B', tracking: `t-${Math.random()}` })),
        'P0010',
      );
    });
  });

  it('AC-03 duplicate active slot+phone (different key) → DUPLICATE_APPLICATION (P0012)', async () => {
    await inRollback(async () => {
      const job = await seedJob(writer, 'ac03-dup');
      await anon();
      await writer.query(APPLY_CALL, applyArgs({ slug: job.code, slotId: job.slotId, normPhone: '84999888777', keyHash: `k1-${Math.random()}`, payloadHash: 'p', tracking: `t1-${Math.random()}` }));
      await expectSqlState(
        writer.query(APPLY_CALL, applyArgs({ slug: job.code, slotId: job.slotId, normPhone: '84999888777', keyHash: `k2-${Math.random()}`, payloadHash: 'p', tracking: `t2-${Math.random()}` })),
        'P0012',
      );
    });
  });

  // ── AC-03 — concurrency safety is enforced at the STORAGE layer, not just app logic ──
  it('AC-03 the duplicate-blocking unique indexes exist (idempotency key + active slot/phone)', async () => {
    const idx = await admin.query(
      `SELECT indexname, indexdef FROM pg_indexes
        WHERE tablename = 'candidate_submissions'
          AND indexname IN ('candidate_submissions_idempotency_key_hash_key','uq_candidate_active_slot_phone')`);
    const byName = Object.fromEntries(idx.rows.map((r: any) => [r.indexname, r.indexdef]));
    expect(byName['candidate_submissions_idempotency_key_hash_key']).toMatch(/CREATE UNIQUE INDEX/);
    expect(byName['uq_candidate_active_slot_phone']).toMatch(/CREATE UNIQUE INDEX/);
    expect(byName['uq_candidate_active_slot_phone']).toMatch(/WHERE .*status/i); // partial guard
  });

  it('AC-03 a second row with the same idempotency key hash is rejected by the DB (23505)', async () => {
    await inRollback(async () => {
      await asRole('ADMIN');
      const key = `k-uv-${Math.random()}`;
      const ins = (id: string) => writer.query(
        `INSERT INTO candidate_submissions (id, full_name, phone, idempotency_key_hash, status, created_at)
           VALUES ($1,'Dup Guard','0900000000',$2,'NEW', now())`, [id, key]);
      await ins(`mp2live-uv-${Math.random().toString(36).slice(2)}`);
      await expectSqlState(ins(`mp2live-uv-${Math.random().toString(36).slice(2)}`), '23505');
    });
  });

  it('AC-03 REAL concurrent race: N simultaneous same-key applies create exactly ONE row', async () => {
    const N = 5;
    const key = `mp2live-race-${Math.random().toString(36).slice(2)}`;
    const tracking = `mp2live-racet-${Math.random().toString(36).slice(2)}`;
    const norm = '84900race01';
    let job: any;
    const racers: any[] = [];
    try {
      // Fixture must be COMMITTED so the independent racer connections can see it.
      job = await seedJob(admin, 'race'); // admin GUC context, autocommit
      for (let i = 0; i < N; i++) { const cl = new Client({ connectionString: WRITER_URL }); await cl.connect(); racers.push(cl); }
      const fire = racers.map(async (cl) => {
        await cl.query('BEGIN');
        await cl.query(`SELECT set_config('app.role', '', true)`);
        try {
          const r = await cl.query(APPLY_CALL, applyArgs({ slug: job.code, slotId: job.slotId, normPhone: norm, keyHash: key, payloadHash: 'same', tracking }));
          await cl.query('COMMIT');
          return r.rows[0]?.tracking_code;
        } catch (e) { await cl.query('ROLLBACK').catch(() => {}); throw e; }
      });
      const settled = await Promise.allSettled(fire);
      const okCodes = settled.filter((s) => s.status === 'fulfilled').map((s: any) => s.value);
      expect(okCodes.length).toBeGreaterThan(0);
      for (const c of okCodes) expect(c).toBe(tracking); // every winner replays the SAME code
      const n = await admin.query(`SELECT count(*)::int AS n FROM candidate_submissions WHERE idempotency_key_hash = $1`, [key]);
      expect(n.rows[0].n).toBe(1); // exactly one row despite N concurrent applies
    } finally {
      for (const cl of racers) await cl.end().catch(() => {});
      // Cleanup committed fixture + any created submission (FK-safe order).
      await admin.query(`DELETE FROM application_status_history WHERE submission_id IN (SELECT id FROM candidate_submissions WHERE idempotency_key_hash = $1)`, [key]).catch(() => {});
      await admin.query(`DELETE FROM candidate_submissions WHERE idempotency_key_hash = $1`, [key]).catch(() => {});
      if (job) {
        await admin.query(`DELETE FROM staffing_order_slots WHERE id = $1`, [job.slotId]).catch(() => {});
        await admin.query(`DELETE FROM staffing_orders WHERE id = $1`, [job.orderId]).catch(() => {});
        await admin.query(`DELETE FROM outsourcing_projects WHERE id = $1`, [job.projId]).catch(() => {});
        await admin.query(`DELETE FROM client_companies WHERE id = $1`, [job.ccId]).catch(() => {});
      }
    }
  }, 30000);

  // ── AC-04 — tracking projection returns ONLY the safe allow-list; unknown → 0 rows ──
  it('AC-04 tracking projection exposes only DEC-02 allow-list columns and no PII', async () => {
    await inRollback(async () => {
      const job = await seedJob(writer, 'ac04');
      const tracking = `mp2live-t4-${Math.random().toString(36).slice(2)}`;
      await anon();
      await writer.query(APPLY_CALL, applyArgs({ slug: job.code, slotId: job.slotId, keyHash: `k4-${Math.random()}`, payloadHash: 'p', tracking }));

      const r = await writer.query(`SELECT * FROM hrp_public_tracking_projection($1)`, [tracking]);
      expect(r.rows.length).toBe(1);
      const cols = r.fields.map((f: any) => f.name).sort();
      expect(cols).toEqual(['job_code', 'job_title', 'position_title', 'status', 'submitted_at', 'tracking_code']);
      const forbidden = ['phone', 'normalized_phone', 'cccd_number', 'cccd_image_url', 'cv_storage_key', 'review_note', 'vendor_id', 'ctv_id', 'merged_worker_id', 'dedup_worker_id', 'block_code', 'reviewed_by', 'actor_user_id'];
      for (const f of forbidden) expect(cols).not.toContain(f);
      expect(r.rows[0].tracking_code).toBe(tracking);
      expect(r.rows[0].status).toBe('NEW');
      expect(r.rows[0].job_code).toBe(job.code);
      expect(r.rows[0].position_title).toBe('MP2 Live Position');
    });
  });

  it('AC-04 unknown tracking code → 0 rows (generic not-found, no existence signal)', async () => {
    const r = await writer.query(`SELECT * FROM hrp_public_tracking_projection($1)`, [`does-not-exist-${Math.random()}`]);
    expect(r.rows.length).toBe(0);
  });

  // ── AC-05 — candidate_submissions RLS read-scope floor (DEC-06 + canonical matrix) ──
  it('AC-05 RLS read scope: privileged roles see an unscoped row; others do not', async () => {
    await inRollback(async () => {
      await asRole('ADMIN'); // ADMIN passes WITH CHECK → can seed the fixture row
      const id = `mp2live-role-${Math.random().toString(36).slice(2)}`;
      const tracking = `mp2live-tr-${Math.random().toString(36).slice(2)}`;
      await writer.query(
        `INSERT INTO candidate_submissions (id, full_name, phone, status, public_tracking_code, created_at)
           VALUES ($1,'RoleScope Test','0900000009','NEW',$2, now())`, [id, tracking]);

      const visible = async (role: string) => {
        await asRole(role);
        const r = await writer.query(`SELECT count(*)::int AS n FROM candidate_submissions WHERE id = $1`, [id]);
        return r.rows[0].n;
      };
      // Read floor (USING): these roles see the unscoped (vendor/ctv/pm-null) row.
      for (const role of ['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'SALE', 'ACCOUNTANT']) {
        expect(await visible(role), `${role} should see the row`).toBe(1);
      }
      // Out of scope: no vendor/ctv/pm match and not a privileged reader → 0 rows.
      for (const role of ['WORKER', 'VENDOR_ADMIN', 'VENDOR_STAFF', 'CTV', 'PM', 'MKT', 'HR_STAFF', '']) {
        expect(await visible(role), `${role} must NOT see the row`).toBe(0);
      }
    });
  }, 20000);
});





