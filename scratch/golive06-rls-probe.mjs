/**
 * golive06-rls-probe.mjs — task hrp-v5-go-live-06 / STEP-02 (RED) và STEP-08 (GREEN).
 * Phục vụ RQ-07/AC-08, RQ-09/AC-10, RQ-10/AC-11, RQ-11/AC-12, RQ-13/AC-15.
 *
 * CHỈ ĐO TRẠNG THÁI. Không in dữ liệu nghiệp vụ, không in PII, không in connection
 * string, không in mật khẩu (AC-14). Mọi INSERT thử nằm trong BEGIN cộng ROLLBACK,
 * không bao giờ COMMIT (RISK-07).
 *
 * Cùng một câu lệnh chạy cho cả hai pha (DEC-12): pha RED trên `hrp-live` trước khi áp,
 * pha GREEN sau khi áp. Khác biệt duy nhất là `--label`, không phải nội dung phép đo.
 *
 * Dùng:
 *   node scratch/golive06-rls-probe.mjs --label test-before --url-from-process --insert-probe
 *   node scratch/golive06-rls-probe.mjs --label live-red   --env-key DATABASE_URL_ADMIN --insert-probe
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
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
const DO_INSERT = argv.includes('--insert-probe');
const P = (...s) => console.log(`[probe:${LABEL}]`, ...s);

/** EV-02 — 15 bảng DENY-ALL trên `hrp-live`. Thứ tự cố định để so hai lần đo. */
const EV02 = [
  'attendance_import_batches', 'attendance_import_rows', 'candidate_submissions',
  'client_statement_lines', 'commission_debts', 'commission_ledger', 'commission_policies',
  'contracts', 'dependents', 'project_assignments', 'sites', 'source_claims',
  'timesheet_adjustments', 'timesheet_lines', 'vendor_statement_lines',
];
/** RQ-02 — ticket family: có policy nhưng chưa bật cờ RLS trên `hrp-live`. */
const TICKETS = ['tickets', 'ticket_comments', 'ticket_notifications'];
/** EV-12 — 6 hàm mà 15 policy tham chiếu. Thiếu một cái là BLOCKED (DEC-14). */
const EV12 = [
  'hrp_project_visible_for', 'hrp_project_writable', 'hrp_session_role',
  'hrp_session_user_id', 'hrp_session_vendor_id', 'hrp_worker_visible_for',
];
/** EV-07 — hai hàm có bẫy hạ cấp. AC-10 so hash trước/sau. */
const M13 = ['hrp_project_visible_for', 'hrp_worker_visible_for'];
/** Hai app role mà policy nhắm tới. `neondb_owner` không khớp policy nào. */
const APP_ROLES = ['app_user', 'app_user_writer'];
/** 5 role nghiệp vụ của AC-12. 4 đầu phải thấy dòng, `HR_STAFF` phải thấy 0. */
const AC12_ROLES = ['ADMIN', 'HR_MANAGER', 'DIRECTOR', 'SALE', 'HR_STAFF'];
/**
 * 3 bảng mà WITH CHECK là `EXISTS (SELECT 1 FROM <cha> WHERE id = <fk>)`. Nếu FK là uuid
 * bịa thì EXISTS sai và Postgres trả `42501` — TRÙNG chữ ký của "RLS chặn", nên phép đo
 * mất khả năng phân biệt. Vì vậy chèn một dòng cha THẬT trong cùng transaction (vẫn
 * ROLLBACK) rồi mới chèn con. Trên branch RED không có policy permissive nào thì WITH
 * CHECK sai vô điều kiện và `42501` bật trước cả FK, nên dòng cha không thể che RED.
 */
const PARENT_OF = {
  attendance_import_rows: { col: 'batch_id', tbl: 'attendance_import_batches' },
  client_statement_lines: { col: 'statement_id', tbl: 'client_statements' },
  timesheet_lines: { col: 'period_id', tbl: 'timesheet_periods' },
};

function urlFromDotEnv(key) {
  for (const raw of readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1 || line.slice(0, eq).trim() !== key) continue;
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    return v;
  }
  return '';
}
/** Chỉ dùng cho identifier lấy từ catalog, không phải input người dùng. */
const qi = (s) => `"${String(s).replace(/"/g, '""')}"`;
const st = (e) => e?.code ?? 'NO_SQLSTATE';

const url = FROM_PROCESS ? (process.env.DATABASE_URL ?? '') : urlFromDotEnv(ENV_KEY);
if (!url) {
  P(`FATAL no connection url (source=${FROM_PROCESS ? 'process' : ENV_KEY})`);
  process.exit(2);
}
const client = new pg.Client({ connectionString: url });
await client.connect();

// ── A. Identity. Không in host, không in URL — chỉ vân tay đối tượng (AC-14, DEC-12).
const who = await client.query('SELECT current_user AS u, current_database() AS d, version() AS v');
P(`current_user=${who.rows[0].u} current_database=${who.rows[0].d}`);
P(`server=${String(who.rows[0].v).split(' ').slice(0, 2).join(' ')}`);

// ── B. RQ-13 / AC-15 / DEC-14 — 6 hàm dependency phải tồn tại TRƯỚC câu lệnh ghi.
const funcs = await client.query(
  `SELECT p.proname, p.pronargs
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = ANY($1::text[])
    ORDER BY p.proname, p.pronargs`,
  [EV12],
);
P('--- B. EV-12 dependency routines (RQ-13 / AC-15) ---');
for (const r of funcs.rows) P(`  ${r.proname} nargs=${r.pronargs}`);
const missing = EV12.filter((f) => !funcs.rows.some((r) => r.proname === f));
P(`  EV12_PRESENT=${new Set(funcs.rows.map((r) => r.proname)).size}/6 MISSING=${missing.length ? missing.join(',') : 'none'}`);

// ── C. RQ-09 / AC-10 — bẫy EV-07. So hash `pg_get_functiondef` trước và sau; bản đúng
//    là bản m13 có `sub_pm_user_id_1` cộng `sub_pm_user_id_2`. In hash, không in thân hàm.
const defs = await client.query(
  `SELECT p.proname, p.pronargs, pg_get_functiondef(p.oid) AS def
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = ANY($1::text[])
    ORDER BY p.proname, p.pronargs`,
  [M13],
);
P('--- C. m13 routine fingerprint (RQ-09 / AC-10) ---');
for (const r of defs.rows) {
  const d = String(r.def);
  P(
    `  ${r.proname}(nargs=${r.pronargs}) sha256=${createHash('sha256').update(d).digest('hex')}` +
      ` len=${d.length} sub_pm_1=${d.includes('sub_pm_user_id_1')} sub_pm_2=${d.includes('sub_pm_user_id_2')}`,
  );
}

// ── D. RQ-10 / AC-11 — đếm policy permissive theo bảng, cộng cờ RLS. Toàn bộ bảng đã
//    bật RLS, để chứng minh 19 bảng cũ không đổi và đúng 15 bảng mới tăng 0 lên 1.
const pol = await client.query(
  `SELECT c.relname,
          c.relrowsecurity      AS rls_enabled,
          c.relforcerowsecurity AS rls_forced,
          count(p.polname) FILTER (WHERE p.polpermissive)       AS permissive,
          count(p.polname) FILTER (WHERE NOT p.polpermissive)   AS restrictive
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     LEFT JOIN pg_policy p ON p.polrelid = c.oid
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
    GROUP BY 1, 2, 3 ORDER BY 1`,
);
P('--- D. RLS posture per table (RQ-10 / AC-11) ---');
for (const r of pol.rows) {
  const tag = EV02.includes(r.relname) ? 'EV02' : TICKETS.includes(r.relname) ? 'TICKET' : 'other';
  P(`  ${r.relname} | ${tag} | enabled=${r.rls_enabled} forced=${r.rls_forced} permissive=${r.permissive} restrictive=${r.restrictive}`);
}
const sum = (rows) => rows.reduce((a, r) => a + Number(r.permissive), 0);
const ev02rows = pol.rows.filter((r) => EV02.includes(r.relname));
P(`  TABLES_RLS_ENABLED=${pol.rows.length} PERMISSIVE_TOTAL=${sum(pol.rows)}`);

// Cùng phép đếm nhưng KHÔNG lọc `relrowsecurity`. Cần thiết vì trên `hrp-live` 3 bảng ticket
// CÓ policy mà chưa bật RLS, nên `PERMISSIVE_TOTAL` ở trên bỏ qua 8 policy permissive của
// chúng và sẽ in 22, trong khi AC-11 ghi "trước = 30". Hai số không mâu thuẫn — chúng là hai
// cơ sở đếm khác nhau, lệch đúng 8. In cả hai để không ai đọc 22 thành FAIL. Sau khi áp
// migration thì hai số trùng nhau (đo trên `hrp_mp2_test`: 45 và 45).
const polAll = await client.query(
  `SELECT count(*) FILTER (WHERE p.polpermissive)     AS permissive,
          count(*) FILTER (WHERE NOT p.polpermissive) AS restrictive,
          count(*) FILTER (WHERE p.polpermissive AND c.relname = ANY($1::text[])) AS ticket_permissive,
          count(DISTINCT c.relname) FILTER (WHERE NOT c.relrowsecurity)           AS tables_policy_but_rls_off
     FROM pg_policy p
     JOIN pg_class c ON c.oid = p.polrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'`,
  [TICKETS],
);
const pa = polAll.rows[0];
P(
  `  PERMISSIVE_TOTAL_ALL_PUBLIC=${pa.permissive} RESTRICTIVE_TOTAL_ALL_PUBLIC=${pa.restrictive}` +
    ` TICKET_PERMISSIVE=${pa.ticket_permissive} TABLES_WITH_POLICY_BUT_RLS_OFF=${pa.tables_policy_but_rls_off}`,
);
P(`  EV02_TABLES_SEEN=${ev02rows.length}/15 EV02_PERMISSIVE_TOTAL=${sum(ev02rows)}`);
P(`  EV02_ZERO_PERMISSIVE=${ev02rows.filter((r) => Number(r.permissive) === 0).map((r) => r.relname).join(',') || 'none'}`);
for (const t of TICKETS) {
  const r = pol.rows.find((x) => x.relname === t);
  P(`  TICKET ${t} | rls_enabled=${r ? r.rls_enabled : false} forced=${r ? r.rls_forced : false}`);
}

// ── D2. EV-05 — ticket family: policy tồn tại nhưng có thể đang trơ vì chưa bật cờ.
const tick = await client.query(
  `SELECT c.relname, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced,
          count(p.polname) AS policies
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     LEFT JOIN pg_policy p ON p.polrelid = c.oid
    WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
    GROUP BY 1, 2, 3 ORDER BY 1`,
  [TICKETS],
);
P('--- D2. ticket family (RQ-02 / EV-05) ---');
for (const r of tick.rows) {
  P(`  ${r.relname} | enabled=${r.rls_enabled} forced=${r.rls_forced} policies=${r.policies}`);
}

// ── H. GRANT bảng. `42501` trên một câu SELECT KHÔNG BAO GIỜ do RLS: RLS chặn đọc bằng
//    cách trả 0 dòng, nó không phát lỗi. Trên SELECT thì `42501` chỉ có một nghĩa là
//    thiếu GRANT ở tầng bảng. Cột này tách hai nguyên nhân trùng mã, để E và G đọc đúng.
const priv = await client.query(
  `SELECT t AS tbl,
          has_table_privilege('app_user', 'public.' || quote_ident(t), 'SELECT')        AS r_sel,
          has_table_privilege('app_user_writer', 'public.' || quote_ident(t), 'SELECT') AS w_sel,
          has_table_privilege('app_user_writer', 'public.' || quote_ident(t), 'INSERT') AS w_ins
     FROM unnest($1::text[]) AS t ORDER BY t`,
  [EV02],
);
P('--- H. table GRANT matrix (tách 42501 do GRANT khỏi 42501 do RLS) ---');
for (const r of priv.rows) {
  P(`  ${r.tbl} | app_user.SELECT=${r.r_sel} | app_user_writer.SELECT=${r.w_sel} | app_user_writer.INSERT=${r.w_ins}`);
}
P(
  `  APP_USER_SELECT_TRUE=${priv.rows.filter((r) => r.r_sel).length}/15` +
    ` WRITER_SELECT_TRUE=${priv.rows.filter((r) => r.w_sel).length}/15` +
    ` WRITER_INSERT_TRUE=${priv.rows.filter((r) => r.w_ins).length}/15`,
);

// ── E. RQ-07 / AC-08 — SELECT dưới 2 app role. `n_live_tup` là số dòng vật lý theo thống
//    kê, đọc không qua RLS: nó phân biệt "RLS chặn" với "bảng rỗng" (tiền lệ task 03).
const stats = await client.query(
  `SELECT relname, n_live_tup FROM pg_stat_all_tables
    WHERE schemaname = 'public' AND relname = ANY($1::text[]) ORDER BY relname`,
  [EV02],
);
const nlive = new Map(stats.rows.map((r) => [r.relname, r.n_live_tup]));

/** 4 GUC transaction-local đúng như `src/shared/auth/rls-context.ts`. */
async function setGucs(c, role) {
  await c.query(`SELECT set_config('app.user_id', $1, true)`, [randomUUID()]);
  await c.query(`SELECT set_config('app.role', $1, true)`, [role]);
  await c.query(`SELECT set_config('app.vendor_id', $1, true)`, [randomUUID()]);
  await c.query(`SELECT set_config('app.worker_id', $1, true)`, [randomUUID()]);
}

/**
 * Nhận role đo. `neondb_owner` KHÔNG được `SET ROLE` sang app role trên project này
 * (đo được: sqlstate 42501), nên mỗi app role phải đo bằng một connection riêng của
 * chính role đó — `--url-from-process` cộng `neon connection-string --role-name <role>`.
 * Trả 'already' khi connection đã đúng role, 'set' khi `SET LOCAL ROLE` thành công,
 * 'cannot:<sqlstate>' khi không được phép. Bọc savepoint để lỗi không huỷ transaction.
 */
async function assumeRole(c, role) {
  const cur = (await c.query('SELECT current_user AS u')).rows[0].u;
  if (cur === role) return 'already';
  await c.query('SAVEPOINT ar');
  try {
    await c.query(`SET LOCAL ROLE ${qi(role)}`);
    await c.query('RELEASE SAVEPOINT ar');
    return 'set';
  } catch (e) {
    await c.query('ROLLBACK TO SAVEPOINT ar');
    return `cannot:${st(e)}`;
  }
}

P('--- E. SELECT probe, GUC role=ADMIN (RQ-07 / AC-08) ---');
for (const role of APP_ROLES) {
  await client.query('BEGIN');
  try {
    await setGucs(client, 'ADMIN');
    const how = await assumeRole(client, role);
    if (how.startsWith('cannot')) {
      P(`  role=${role} SKIPPED assume_role=${how}`);
      await client.query('ROLLBACK');
      continue;
    }
    const cur = await client.query('SELECT current_user AS u');
    P(`  role=${role} assume=${how} effective_current_user=${cur.rows[0].u}`);
    for (const t of EV02) {
      await client.query('SAVEPOINT sp');
      try {
        const r = await client.query(`SELECT count(*)::int AS n FROM public.${qi(t)}`);
        P(`  SELECT ${role} ${t} rows=${r.rows[0].n} n_live_tup=${nlive.get(t) ?? 'n/a'} sqlstate=00000`);
        await client.query('RELEASE SAVEPOINT sp');
      } catch (e) {
        P(`  SELECT ${role} ${t} rows=n/a n_live_tup=${nlive.get(t) ?? 'n/a'} sqlstate=${st(e)}`);
        await client.query('ROLLBACK TO SAVEPOINT sp');
      }
    }
  } catch (e) {
    P(`  role=${role} SETUP_FAILED sqlstate=${st(e)}`);
  }
  await client.query('ROLLBACK');
}

// ── F. RQ-07 / AC-08 — INSERT thử. Sinh giá trị cho MỌI cột NOT NULL không default để
//    `23502` không che mất `42501` (thứ tự: WITH CHECK của RLS trước ExecConstraints,
//    còn FK là after-row trigger nên chạy sau cả hai). Toàn bộ trong BEGIN cộng ROLLBACK.
//    Phân loại: `42501` = RLS chặn (dấu hiệu RED); mã khác = đã qua cổng RLS (dấu hiệu GREEN).
if (DO_INSERT) {
  /** EV-02 cộng 3 bảng cha của `PARENT_OF` — cần metadata cột của cả hai nhóm. */
  const INSERT_TABLES = [...EV02, ...Object.values(PARENT_OF).map((p) => p.tbl)];
  const cols = await client.query(
    `SELECT c.relname AS tbl, a.attname AS col, format_type(a.atttypid, a.atttypmod) AS typ, t.typtype
       FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_type t ON t.oid = a.atttypid
       LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
        AND a.attnum > 0 AND NOT a.attisdropped AND a.attnotnull
        AND d.adbin IS NULL AND a.attidentity = '' AND a.attgenerated = ''
      ORDER BY c.relname, a.attnum`,
    [INSERT_TABLES],
  );
  const byTable = new Map(INSERT_TABLES.map((t) => [t, []]));
  for (const r of cols.rows) byTable.get(r.tbl)?.push(r);

  const litFor = (r) => {
    const typ = r.typ;
    if (r.typtype === 'e') {
      return `(SELECT e.enumlabel FROM pg_enum e WHERE e.enumtypid = '${typ}'::regtype ORDER BY e.enumsortorder LIMIT 1)::${typ}`;
    }
    if (typ.endsWith('[]')) return `'{}'::${typ}`;
    if (typ === 'uuid') return `'${randomUUID()}'::uuid`;
    if (typ === 'boolean') return 'false';
    if (typ === 'bytea') return `'\\x'::bytea`;
    if (typ === 'json' || typ === 'jsonb') return `'{}'::${typ}`;
    if (/^(smallint|integer|bigint|numeric|decimal|real|double precision|money)/.test(typ)) return `1::${typ}`;
    if (/^(timestamp|date|time)/.test(typ)) return `now()::${typ}`;
    if (/^(text|character|citext|name)/.test(typ)) return `'GOLIVE06_PROBE'::${typ}`;
    return `NULL::${typ}`;
  };

  /** `overrides` map cột → literal SQL đã escape, dùng để cắm id dòng cha thật vào FK. */
  const buildInsert = (t, overrides = {}) => {
    const list = byTable.get(t) ?? [];
    if (!list.length) return `INSERT INTO public.${qi(t)} DEFAULT VALUES`;
    const vals = list.map((c) => (c.col in overrides ? overrides[c.col] : litFor(c)));
    return `INSERT INTO public.${qi(t)} (${list.map((c) => qi(c.col)).join(', ')}) VALUES (${vals.join(', ')})`;
  };

  P('--- F. INSERT probe, role=app_user_writer, GUC role=ADMIN (RQ-07 / AC-08) ---');
  await client.query('BEGIN');
  try {
    await setGucs(client, 'ADMIN');
    const how = await assumeRole(client, 'app_user_writer');
    if (how.startsWith('cannot')) {
      P(`  SKIPPED assume_role=${how} — cần connection của chính app_user_writer`);
      await client.query('ROLLBACK');
    } else {
      P(`  assume=${how}`);
      for (const t of EV02) {
        const list = byTable.get(t) ?? [];
        const parent = PARENT_OF[t];
        const overrides = {};
        let note = '';
        if (parent) {
          await client.query('SAVEPOINT pp');
          try {
            const pr = await client.query(`${buildInsert(parent.tbl)} RETURNING id`);
            const pid = pr.rows[0]?.id ?? null;
            if (pid === null) {
              await client.query('ROLLBACK TO SAVEPOINT pp');
              note = ` parent=${parent.tbl}:NO_ID`;
            } else {
              overrides[parent.col] = `'${String(pid).replace(/'/g, "''")}'`;
              await client.query('RELEASE SAVEPOINT pp');
              note = ` parent=${parent.tbl}:OK`;
            }
          } catch (e) {
            await client.query('ROLLBACK TO SAVEPOINT pp');
            note = ` parent=${parent.tbl}:${st(e)}`;
          }
        }
        const sql = buildInsert(t, overrides);
        await client.query('SAVEPOINT sp');
        try {
          await client.query(sql);
          P(`  INSERT ${t} sqlstate=00000 verdict=RLS_PASSED notnull_cols=${list.length}${note}`);
          await client.query('ROLLBACK TO SAVEPOINT sp');
        } catch (e) {
          const code = st(e);
          P(`  INSERT ${t} sqlstate=${code} verdict=${code === '42501' ? 'RLS_DENY' : 'RLS_PASSED'} notnull_cols=${list.length}${note}`);
          await client.query('ROLLBACK TO SAVEPOINT sp');
        }
      }
      await client.query('ROLLBACK');
    }
  } catch (e) {
    P(`  INSERT_PROBE SETUP_FAILED sqlstate=${st(e)}`);
    await client.query('ROLLBACK');
  }
}

// ── G. RQ-11 / AC-12 — queue HR. Cùng một câu SELECT, đổi đúng một biến: GUC `app.role`.
//    4 role đầu phải thấy dòng, `HR_STAFF` phải thấy 0 (posture MP-2 không đổi).
//    In số dòng, KHÔNG in nội dung đơn (AC-14).
P('--- G. candidate_submissions theo 5 role nghiệp vụ (RQ-11 / AC-12) ---');
P(`  n_live_tup=${nlive.get('candidate_submissions') ?? 'n/a'} (số dòng vật lý, đọc ngoài RLS)`);
await client.query('BEGIN');
try {
  // Đo bằng chính app role của connection nếu có, vì `neondb_owner` không được SET ROLE
  // sang app role. Cả hai app role đều nằm trong danh sách TO của policy nên cùng một
  // policy áp dụng; biến duy nhất của AC-12 là GUC `app.role`, không phải DB role.
  const cur0 = (await client.query('SELECT current_user AS u')).rows[0].u;
  const gRole = APP_ROLES.includes(cur0) ? cur0 : 'app_user';
  const how = await assumeRole(client, gRole);
  if (how.startsWith('cannot')) {
    P(`  SKIPPED assume_role=${how} — cần connection của chính app_user`);
  } else {
    P(`  assume=${how}`);
    for (const role of AC12_ROLES) {
      await client.query('SAVEPOINT sp');
      try {
        await setGucs(client, role);
        const r = await client.query('SELECT count(*)::int AS n FROM public.candidate_submissions');
        P(`  db_role=${gRole} app.role=${role} rows=${r.rows[0].n} sqlstate=00000`);
        await client.query('RELEASE SAVEPOINT sp');
      } catch (e) {
        P(`  db_role=${gRole} app.role=${role} rows=n/a sqlstate=${st(e)}`);
        await client.query('ROLLBACK TO SAVEPOINT sp');
      }
    }
  }
} catch (e) {
  P(`  AC12 SETUP_FAILED sqlstate=${st(e)}`);
}
await client.query('ROLLBACK');

await client.end();
if (missing.length) {
  P(`EXIT=3 BLOCKED — thiếu hàm dependency: ${missing.join(',')} (DEC-14)`);
  process.exit(3);
}
P('EXIT=0');
