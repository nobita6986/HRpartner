// yaml-check.mjs — verifies ci.yml structure post-edit for hrp-v7-ci-container-db.
// Pure Node.js, no external deps. Parses YAML minimally via regex.
//
// Strategy:
//  - Baseline invariants from PR #12 + PR #13 (path-filter): Quality job unchanged,
//    Integration job name preserved, concurrency group, fork guard, CI_INTEGRATION_STRICT.
//  - v7 container addition: services.postgres block + 4 new steps + 2 inline URL envs
//    (NOT secrets), PG_BASELINE_PASSWORD env, secrets.DATABASE_URL absent.
//  - Path-filter logic preserved end-to-end.
//
// Anything this script declares as PASS becomes a Tier 3 grep target in AUDIT.md.

import fs from 'node:fs';

const text = fs.readFileSync('.github/workflows/ci.yml', 'utf8');

// Slice of integration job text only (between `integration:` and end-of-file).
const integrationSlice = text.split(/^  integration:/m)[1] ?? '';
// Slice of quality job text (between `quality:` and `integration:`).
const qualitySlice = text.split(/^  quality:/m)[1]?.split(/^  integration:/m)[0] ?? '';

const assertions = {
  'YAML has 2 jobs (quality, integration)': () =>
    /^  quality:/m.test(text) && /^  integration:/m.test(text),

  // Baseline invariants — PR #12 merged.
  'Quality job has all 7 expected steps': () =>
    ['npm ci', 'prisma:generate', 'npx prisma validate', 'npm run typecheck',
     'npm run lint', 'npm run test:unit', 'npm run build']
      .every(s => qualitySlice.includes(s)),
  'job name "Quality (...)" present': () =>
    /name: Quality \(schema · typecheck · lint · unit · build\)/.test(text),
  'job name "Integration (DB tests · fail-closed)" present': () =>
    /name: Integration \(DB tests · fail-closed\)/.test(text),

  // Path-filter (PR #13) preservation.
  'Path-filter step present (id=path-filter)': () =>
    /id: path-filter/.test(text) && /shell: bash/.test(text),
  'Short-circuit success step present': () =>
    /Short-circuit success \(docs\/config-only PRs\)/.test(text),

  // Concurrency + fork guard + ENV_BLOCKED semantics.
  'Integration concurrency group preserved (hrpartner + cancel=false)': () =>
    /group: hrpartner-dedicated-integration-db/.test(integrationSlice) &&
    /cancel-in-progress: false/.test(integrationSlice),
  'Integration fork guard preserved': () =>
    /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/.test(integrationSlice),
  'Integration CI_INTEGRATION_STRICT=1 preserved': () =>
    /CI_INTEGRATION_STRICT: '1'/.test(integrationSlice),

  // v7: container addition. Path-filter is preserved AND container is appended.
  'v7: services.postgres block present with postgres:16-alpine image': () =>
    /services:/m.test(integrationSlice) &&
    /postgres:16-alpine/.test(integrationSlice),
  'v7: services.postgres env has POSTGRES_USER/PASSWORD/DB': () =>
    /POSTGRES_USER: postgres/.test(integrationSlice) &&
    /POSTGRES_PASSWORD: postgres/.test(integrationSlice) &&
    /POSTGRES_DB: ci_test/.test(integrationSlice),
  'v7: services.postgres has healthcheck options': () =>
    /health-cmd "pg_isready/.test(integrationSlice) &&
    /health-interval 5s/.test(integrationSlice) &&
    /health-retries 10/.test(integrationSlice),
  'v7: services.postgres exposes 5432:5432': () =>
    /- 5432:5432/.test(integrationSlice),

  // v7: steps inserted in correct order.
  'v7: step order is wait -> pre-bootstrap -> migrate deploy -> migrate status -> post-bootstrap -> integration tests': () => {
    const waitIdx = integrationSlice.indexOf('Wait for postgres');
    const preBootIdx = integrationSlice.indexOf('Bootstrap roles + pre-migrate grants');
    const migrateIdx = integrationSlice.indexOf('Prisma migrate deploy');
    const migrateStatusIdx = integrationSlice.indexOf('Prisma migrate status');
    const postBootIdx = integrationSlice.indexOf('Bootstrap post-migrate grants');
    const integrateIdx = integrationSlice.indexOf('Integration tests');
    return waitIdx > -1
      && preBootIdx > waitIdx
      && migrateIdx > preBootIdx
      && migrateStatusIdx > migrateIdx
      && postBootIdx > migrateStatusIdx
      && integrateIdx > postBootIdx;
  },
  'v7: "Bootstrap roles + pre-migrate grants" step runs scripts/ci/container-test-db.mjs --phase=pre': () =>
    /node scripts\/ci\/container-test-db\.mjs --phase=pre/.test(integrationSlice),
  'v7: "Bootstrap post-migrate grants" step runs scripts/ci/container-test-db.mjs --phase=post': () =>
    /node scripts\/ci\/container-test-db\.mjs --phase=post/.test(integrationSlice),
  'v7: "Prisma migrate deploy" step runs npx prisma migrate deploy': () =>
    /npx prisma migrate deploy/.test(integrationSlice),
  'v7: "Prisma migrate status" step runs npx prisma migrate status': () =>
    /npx prisma migrate status/.test(integrationSlice),

  // v7: env uses container URLs (NOT secrets).
  'v7: DATABASE_URL_TEST points to container app_user_writer:ci@localhost': () =>
    /DATABASE_URL_TEST: postgresql:\/\/app_user_writer:postgres@localhost:5432\/ci_test/.test(integrationSlice),
  'v7: DATABASE_URL_ADMIN_TEST points to container postgres@localhost': () =>
    /DATABASE_URL_ADMIN_TEST: postgresql:\/\/postgres:postgres@localhost:5432\/ci_test/.test(integrationSlice),
  'v7: PG_BASELINE_PASSWORD env present (script baseline)': () =>
    /PG_BASELINE_PASSWORD: postgres/.test(integrationSlice),
  'v7: secrets.DATABASE_URL_TEST NOT referenced': () =>
    !/secrets\.DATABASE_URL_TEST/.test(integrationSlice),
  'v7: secrets.DATABASE_URL_ADMIN_TEST NOT referenced': () =>
    !/secrets\.DATABASE_URL_ADMIN_TEST/.test(integrationSlice),

  // Supply chain security — same as path-filter baseline.
  'No third-party action added (no dorny/, no tj-actions/)': () =>
    !/uses: (dorny\/|tj-actions\/)/.test(text),
  'No action version bump (no @v5)': () =>
    !/uses: actions\/checkout@v5/.test(text) && !/uses: actions\/setup-node@v5/.test(text),
};

let pass = 0, fail = 0;
for (const [label, fn] of Object.entries(assertions)) {
  try {
    if (fn()) {
      console.log(`  PASS: ${label}`);
      pass++;
    } else {
      console.log(`  FAIL: ${label}`);
      fail++;
    }
  } catch (e) {
    console.log(`  ERROR: ${label} — ${e.message}`);
    fail++;
  }
}
console.log(`Results: PASS=${pass} FAIL=${fail}`);
if (fail > 0) process.exit(1);
console.log('OK — ci.yml structure preserved + container wired correctly.');
