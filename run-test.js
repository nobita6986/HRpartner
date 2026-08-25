const fs = require('node:fs');
const cp = require('node:child_process');

const testEnv = fs.readFileSync('C:\\CodeApp\\Salary-app\\.env.mp2-test.local', 'utf8');
const testVars = {};
for (const line of testEnv.split('\n')) {
  const match = line.match(/^\s*([^#=]+?)="?([^"]+)"?/);
  if (match) testVars[match[1]] = match[2];
}

process.env.DATABASE_URL_ADMIN = testVars['DATABASE_URL_ADMIN_TEST'];
process.env.DATABASE_URL = testVars['DATABASE_URL_TEST'];
process.env.DATABASE_URL_WRITER = testVars['DATABASE_URL_TEST'];
process.env.MP2_LIVE_SECURITY_CHECK = '1';

cp.execSync('npx vitest run src/domains/applications/live-integration.mp2.test.ts src/domains/applications/security-boundary.mp2.test.ts --silent=false', { stdio: 'inherit' });
