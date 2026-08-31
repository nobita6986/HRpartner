/**
 * Safe LIVE/test probe for hrp_public_tracking_profile.
 * Reads connection strings only from process env and never prints them or PII.
 */
import pg from 'pg';
import { randomUUID } from 'node:crypto';

const { Client } = pg;
const ownerUrl = process.env.PROFILE_PROBE_OWNER_URL;
const writerUrl = process.env.PROFILE_PROBE_WRITER_URL;
if (!ownerUrl || !writerUrl) {
  console.error('ENV_BLOCKED: PROFILE_PROBE_OWNER_URL and PROFILE_PROBE_WRITER_URL are required');
  process.exit(2);
}

const owner = new Client({ connectionString: ownerUrl });
const writer = new Client({ connectionString: writerUrl });

try {
  await owner.connect();
  await writer.connect();

  const functionState = await owner.query(`
    SELECT p.prosecdef,
           r.rolname AS owner,
           has_function_privilege('app_user_writer', 'hrp_public_tracking_profile(text)', 'EXECUTE') AS writer_execute,
           has_function_privilege('public', 'hrp_public_tracking_profile(text)', 'EXECUTE') AS public_execute
      FROM pg_proc p
      JOIN pg_roles r ON r.oid = p.proowner
     WHERE p.oid = 'hrp_public_tracking_profile(text)'::regprocedure
  `);

  const fixture = await owner.query(`
    SELECT public_tracking_code
      FROM candidate_submissions
     WHERE public_tracking_code IS NOT NULL
     LIMIT 1
  `);

  let profileShape = { fixture: false };
  if (fixture.rows[0]) {
    const result = await writer.query(
      'SELECT * FROM hrp_public_tracking_profile($1)',
      [fixture.rows[0].public_tracking_code],
    );
    profileShape = {
      fixture: true,
      rows: result.rowCount,
      columns: result.fields.map((field) => field.name),
      namePresent: Boolean(result.rows[0]?.full_name),
      phonePresent: Boolean(result.rows[0]?.phone),
      cccdColumnPresent: Object.prototype.hasOwnProperty.call(result.rows[0] ?? {}, 'cccd_number'),
    };
  } else {
    const trackingCode = `APP-PROBE-${randomUUID()}`;
    await writer.query('BEGIN');
    try {
      await writer.query(`SELECT set_config('app.user_id', $1, true), set_config('app.role', 'ADMIN', true)`, [randomUUID()]);
      await writer.query(
        `INSERT INTO candidate_submissions
           (id, full_name, phone, cccd_number, status, public_tracking_code, created_at)
         VALUES ($1, $2, $3, $4, 'NEW', $5, now())`,
        [randomUUID(), 'Synthetic Probe', '0900000000', '000000000000', trackingCode],
      );
      const result = await writer.query('SELECT * FROM hrp_public_tracking_profile($1)', [trackingCode]);
      profileShape = {
        fixture: 'rollback-only',
        rows: result.rowCount,
        columns: result.fields.map((field) => field.name),
        namePresent: Boolean(result.rows[0]?.full_name),
        phonePresent: Boolean(result.rows[0]?.phone),
        cccdColumnPresent: Object.prototype.hasOwnProperty.call(result.rows[0] ?? {}, 'cccd_number'),
      };
    } finally {
      await writer.query('ROLLBACK');
    }
  }

  console.log(`FUNCTION=${JSON.stringify(functionState.rows[0] ?? null)}`);
  console.log(`PROFILE_SHAPE=${JSON.stringify(profileShape)}`);
} finally {
  await Promise.allSettled([writer.end(), owner.end()]);
}
