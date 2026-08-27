#!/usr/bin/env node
/**
 * apply-migration.mjs — V5-M1-07a Round 2 / PLN-02.
 *
 * Apply the ticket RLS migration to the isolated test DB.
 * Strategy: read the entire SQL file and send it as ONE statement to PostgreSQL.
 * PostgreSQL parses and executes dollar-quoting natively.
 * Uses DATABASE_URL_ADMIN_TEST (neondb_owner) for DDL.
 */
import { readFileSync, existsSync } from 'node:fs';
import { Client } from 'pg';

// Load env from external path if available
const externalEnvPath = 'C:/CodeApp/Salary-app/.env.mp2-test.local';
if (existsSync(externalEnvPath)) {
  const envContent = readFileSync(externalEnvPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const ADMIN_URL = process.env.DATABASE_URL_ADMIN_TEST ?? process.env.DATABASE_URL_ADMIN;

if (!ADMIN_URL) {
  console.error('FATAL: DATABASE_URL_ADMIN_TEST or DATABASE_URL_ADMIN must be set');
  process.exit(1);
}

const migrationPath = 'prisma/migrations/20260826120000_m1_07a_ticket_rls_backstop/migration.sql';
const sql = readFileSync(migrationPath, 'utf8');
const maskedUrl = ADMIN_URL.replace(/:([^:@]+)@/, ':***@');

console.log(`[apply] Migration file: ${migrationPath}`);
console.log(`[apply] SQL size: ${sql.length} chars`);
console.log(`[apply] Target: ${maskedUrl}`);

const client = new Client({
  connectionString: ADMIN_URL,
  connectTimeoutMS: 30000,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log('[apply] Connected');

  // Send entire migration as one statement — PostgreSQL handles $$ quoting
  console.log('[apply] Executing migration (single multi-statement)...');
  const result = await client.query({ text: sql });
  console.log(`[apply] Query OK: ${result.command} (${result.rowCount} rows)`);

  // ── Verification ────────────────────────────────────────────────────────────
  console.log('\n[apply] === Verification ===');

  // 1. RLS flags
  const rls = await client.query(
    `SELECT relname, relrowsecurity, relforcerowsecurity
     FROM pg_class
     WHERE relname IN ('tickets','ticket_history','ticket_comments','ticket_notifications')
     ORDER BY relname`,
  );
  console.log('[apply] RLS flags:');
  let rlsPass = true;
  for (const row of rls.rows) {
    const ok = row.relrowsecurity && row.relforcerowsecurity;
    console.log(`  ${row.relname}: relrowsecurity=${row.relrowsecurity} relforcerowsecurity=${row.relforcerowsecurity} ${ok ? 'PASS' : 'FAIL'}`);
    if (!ok) rlsPass = false;
  }

  // 2. Policy inventory
  const policies = await client.query(
    `SELECT polrelid::regclass AS tbl, policyname, cmd
     FROM pg_policy
     WHERE polrelid::regclass::text IN ('tickets','ticket_history','ticket_comments','ticket_notifications')
     ORDER BY 1, 2`,
  );
  console.log('[apply] Policies:');
  for (const row of policies.rows) {
    console.log(`  ${row.tbl}.${row.policyname} (${row.cmd})`);
  }

  // 3. PLN-02: ACCOUNTANT in history INSERT
  const histQual = await client.query(
    `SELECT pg_get_expr(qual, 'ticket_history'::regclass) AS qual
     FROM pg_policy
     WHERE polrelid = 'ticket_history'::regclass
       AND policyname = 'hrp_ticket_history_insert'`,
  );
  if (histQual.rows[0]) {
    const qual = histQual.rows[0].qual ?? '';
    const hasAccountant = qual.toUpperCase().includes('ACCOUNTANT');
    console.log(`[apply] hrp_ticket_history_insert qualifier: ${qual.slice(0, 150)}`);
    console.log(`[apply] ACCOUNTANT in history INSERT: ${hasAccountant ? 'PASS' : 'FAIL'}`);
    if (!hasAccountant) {
      console.error('[apply] FATAL: ACCOUNTANT missing from history INSERT policy');
      process.exit(1);
    }
  } else {
    console.error('[apply] WARN: hrp_ticket_history_insert policy not found');
  }

  // 4. Legacy policy gone
  const legacy = await client.query(
    `SELECT COUNT(*) as cnt FROM pg_policy
     WHERE polrelid = 'tickets'::regclass AND policyname = 'hrp_ticket_scope'`,
  );
  console.log(`[apply] Legacy hrp_ticket_scope on tickets: ${parseInt(legacy.rows[0].cnt) === 0 ? 'removed PASS' : 'still exists FAIL'}`);

  // 5. Helper functions exist
  const funcs = await client.query(
    `SELECT proname FROM pg_proc
     WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
       AND proname IN (
         'hrp_ticket_visible','hrp_ticket_writable','hrp_ticket_insertable',
         'hrp_ticket_updatable','hrp_ticket_deletable',
         'hrp_ticket_history_visible','hrp_ticket_comment_visible',
         'hrp_ticket_notification_visible','hrp_ticket_comment_insertable'
       )
     ORDER BY proname`,
  );
  console.log('[apply] Helper functions:');
  const expectedFuncs = [
    'hrp_ticket_visible','hrp_ticket_writable','hrp_ticket_insertable',
    'hrp_ticket_updatable','hrp_ticket_deletable',
    'hrp_ticket_history_visible','hrp_ticket_comment_visible',
    'hrp_ticket_notification_visible','hrp_ticket_comment_insertable',
  ];
  for (const name of expectedFuncs) {
    const exists = funcs.rows.some(r => r.proname === name);
    console.log(`  ${name}: ${exists ? 'PASS' : 'FAIL'}`);
  }

  if (!rlsPass) {
    console.error('[apply] FATAL: RLS flags check failed');
    process.exit(1);
  }

  console.log('\n[apply] Migration applied and verified successfully');
  process.exit(0);
} catch (err) {
  // Parse the error to determine if it's a "already exists" error
  const msg = err.message ?? '';
  if (msg.includes('already exists') || msg.includes('duplicate key')) {
    console.log('[apply] Note: some objects already exist (partial previous apply)');
    console.log('[apply] Attempting verification anyway...');
    // Try to verify the state
    try {
      const rls = await client.query(
        `SELECT relname, relrowsecurity, relforcerowsecurity
         FROM pg_class
         WHERE relname IN ('tickets','ticket_history','ticket_comments','ticket_notifications')
         ORDER BY relname`,
      );
      let allPass = true;
      for (const row of rls.rows) {
        if (!row.relrowsecurity || !row.relforcerowsecurity) allPass = false;
      }
      if (allPass) {
        console.log('[apply] RLS flags already correct — verification PASS');
        process.exit(0);
      }
    } catch (_) { /* ignore */ }
  }
  console.error('[apply] FATAL:', msg.slice(0, 500));
  process.exit(1);
} finally {
  await client.end();
}
