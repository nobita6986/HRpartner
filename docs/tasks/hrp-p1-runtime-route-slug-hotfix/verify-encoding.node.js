// Verify UTF-8 no-BOM on changed surface
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = 'C:/CodeApp/HrP-t1c-p1-route-slug-hotfix';

const textExt = new Set(['.cjs','.css','.csv','.env','.graphql','.html','.js','.json','.jsx','.md','.mdc','.mjs','.prisma','.ps1','.scss','.sql','.svg','.toml','.ts','.tsx','.txt','.xml','.yaml','.yml']);
const textNames = new Set(['.editorconfig','.gitattributes','.gitignore']);

function sh(cmd) {
  try { return execSync(cmd, { cwd: root, encoding: 'utf8' }); } catch (e) { return e.stdout?.toString() || ''; }
}

const diffOut = sh('git diff --name-only --diff-filter=ACMRT');
const cachedOut = sh('git diff --cached --name-only --diff-filter=ACMRT');
const untrackedOut = sh('git ls-files --others --exclude-standard');
const paths = [...new Set([...diffOut.split('\n'), ...cachedOut.split('\n'), ...untrackedOut.split('\n')].filter(Boolean))];

let pass = 0, fail = 0;
for (const p of paths) {
  if (p === '') continue;
  const full = path.join(root, p);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
  const ext = path.extname(full).toLowerCase();
  const name = path.basename(full);
  if (!textExt.has(ext) && !textNames.has(name)) continue;
  const buf = fs.readFileSync(full);
  let issue = '';
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) issue = 'BOM';
  else {
    // decode and check for replacement / invalid sequences
    let decoded;
    try { decoded = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { issue = 'INVALID_UTF8'; }
    if (!decoded) {
      // no error yet
    }
  }
  if (issue) { console.log(`[FAIL] ${p} - ${issue}`); fail++; }
  else { console.log(`[OK]   ${p}`); pass++; }
}
console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} (${pass} checked, ${fail} failed)`);
process.exit(fail === 0 ? 0 : 2);