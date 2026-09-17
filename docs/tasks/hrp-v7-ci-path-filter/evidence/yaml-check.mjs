// yaml-check.mjs — verifies ci.yml structure post-edit.
// Pure Node.js, no external deps. Parses YAML minimally via a tiny scanner.
import fs from 'node:fs';

const text = fs.readFileSync('.github/workflows/ci.yml', 'utf8');

// Light structural assertions (the YAML is already validated by GitHub Actions
// itself; this is a sanity check before commit).
const assertions = {
  'YAML has 2 jobs (quality, integration)': () =>
    /^  quality:/m.test(text) && /^  integration:/m.test(text),
  'job name "Quality (...)" present': () =>
    /name: Quality \(schema · typecheck · lint · unit · build\)/.test(text),
  'job name "Integration (DB tests · fail-closed)" present': () =>
    /name: Integration \(DB tests · fail-closed\)/.test(text),
  'Quality has all expected steps': () => {
    const q = text.split(/^  quality:/m)[1].split(/^  integration:/m)[0];
    return ['npm ci', 'prisma:generate', 'npx prisma validate', 'npm run typecheck', 'npm run lint', 'npm run test:unit', 'npm run build']
      .every(s => q.includes(s));
  },
  'Integration concurrency group preserved': () =>
    /group: hrpartner-dedicated-integration-db/.test(text) && /cancel-in-progress: false/.test(text),
  'Integration fork guard preserved': () =>
    /github.event.pull_request.head.repo.full_name == github.repository/.test(text),
  'Integration env block preserved (CI_INTEGRATION_STRICT=1)': () =>
    /CI_INTEGRATION_STRICT: '1'/.test(text) &&
    /DATABASE_URL_TEST: \${{ secrets.DATABASE_URL_TEST }}/.test(text) &&
    /DATABASE_URL_ADMIN_TEST: \${{ secrets.DATABASE_URL_ADMIN_TEST }}/.test(text),
  'Path-filter step present (id=path-filter)': () =>
    /id: path-filter/.test(text) && /shell: bash/.test(text),
  'Short-circuit success step present': () =>
    /Short-circuit success \(docs\/config-only PRs\)/.test(text),
  'No third-party action added (no dorny/, no tj-actions/)': () =>
    !/uses: (dorny\/|tj-actions\/)/.test(text),
  'No action version bump (no @v5):': () =>
    !/uses: actions\/checkout@v5/.test(text) && !/uses: actions\/setup-node@v5/.test(text),
  'All Integration steps gated on should_run': () => {
    const i = text.split(/^  integration:/m)[1];
    const installBlock = i.match(/Install \(clean, from lockfile\)[\s\S]{0,200}/)[0];
    const prismaBlock = i.match(/Prisma generate[\s\S]{0,200}/)[0];
    const testBlock = i.match(/Integration tests[\s\S]{0,400}/)[0];
    return /should_run != 'false'/.test(installBlock) &&
      /should_run != 'false'/.test(prismaBlock) &&
      /should_run != 'false'/.test(testBlock);
  },
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
console.log('OK — ci.yml structure preserved + path-filter wired correctly.');
