/**
 * golive06-migrstate.mjs — task hrp-v5-go-live-06 / STEP-01 / RQ-05 / DEC-11 + RISK-06.
 *
 * READ-ONLY. Đọc `_prisma_migrations` cho 6 slug ở EV-04 và tính danh sách migration
 * PENDING (thư mục trong repo trừ row đã applied) trên branch đang trỏ tới.
 *
 * In: migration_name, finished_at IS NULL, rolled_back_at IS NULL, applied_steps_count.
 * KHÔNG in checksum (STEP-01), KHÔNG in connection string, KHÔNG in dữ liệu nghiệp vụ (AC-14).
 *
 * Dùng:
 *   node scratch/golive06-migrstate.mjs --label live --env-key DATABASE_URL_ADMIN
 *   node scratch/golive06-migrstate.mjs --label test --url-from-process
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d = null) => {
  const i = argv.indexOf(k);
  return i === -1 ? d : argv[i + 1];
};
const LABEL = arg('--label', 'unknown');
const FROM_PROCESS = argv.includes('--url-from-process');
const ENV_KEY = arg('--env-key', 'DATABASE_URL');

/** EV-04 — 6 migration sở hữu 15 policy thiếu. */
const EV04 = [
  '20260816210000_s1_rls_worker',
  '20260816211000_s1_rls_project',
  '20260816212000_s1_rls_vendor',
  '20260817160000_s1_rls_attendance_timesheet',
  '20260818100000_s1_rls_client_statements',
  '20260819104700_p2_commission_rls',
];

function urlFromDotEnv(key) {
  for (const raw of readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    if (line.slice(0, eq).trim() !== key) continue;
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    return v;
  }
  return '';
}

const url = FROM_PROCESS ? (process.env.DATABASE_URL ?? '') : urlFromDotEnv(ENV_KEY);
if (!url) {
  console.log(`[migrstate:${LABEL}] FATAL no connection url (source=${FROM_PROCESS ? 'process' : ENV_KEY})`);
  process.exit(2);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
const who = await client.query('SELECT current_user AS u, current_database() AS d');
console.log(`[migrstate:${LABEL}] current_user=${who.rows[0].u} current_database=${who.rows[0].d}`);

const applied = await client.query(
  `SELECT migration_name,
          (finished_at IS NULL)      AS finished_at_is_null,
          (rolled_back_at IS NULL)   AS rolled_back_at_is_null,
          applied_steps_count
     FROM _prisma_migrations ORDER BY migration_name`,
);
const byName = new Map(applied.rows.map((r) => [r.migration_name, r]));

console.log(`[migrstate:${LABEL}] --- EV-04 six slugs ---`);
for (const slug of EV04) {
  const r = byName.get(slug);
  console.log(
    r
      ? `  ${slug} | row=YES | finished_at_is_null=${r.finished_at_is_null} | rolled_back_at_is_null=${r.rolled_back_at_is_null} | applied_steps_count=${r.applied_steps_count}`
      : `  ${slug} | row=NO  | finished_at_is_null=n/a | rolled_back_at_is_null=n/a | applied_steps_count=n/a`,
  );
}

const repoDirs = readdirSync(path.join(ROOT, 'prisma', 'migrations'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
const pending = repoDirs.filter((d) => !byName.has(d));
const extra = applied.rows.map((r) => r.migration_name).filter((n) => !repoDirs.includes(n));

console.log(`[migrstate:${LABEL}] repo_migration_dirs=${repoDirs.length} applied_rows=${applied.rows.length}`);
console.log(`[migrstate:${LABEL}] PENDING_COUNT=${pending.length}`);
for (const p of pending) console.log(`  PENDING ${p}`);
console.log(`[migrstate:${LABEL}] ROWS_NOT_IN_REPO=${extra.length}`);
for (const e of extra) console.log(`  EXTRA_ROW ${e}`);
const unfinished = applied.rows.filter((r) => r.finished_at_is_null);
console.log(`[migrstate:${LABEL}] UNFINISHED_ROWS=${unfinished.length}`);
for (const u of unfinished) {
  console.log(
    `  UNFINISHED ${u.migration_name} | rolled_back_at_is_null=${u.rolled_back_at_is_null} | applied_steps_count=${u.applied_steps_count}`,
  );
}

await client.end();
