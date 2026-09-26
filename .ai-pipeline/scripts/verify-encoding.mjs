// verify-encoding.mjs — UTF-8 no-BOM gate equivalent of verify-encoding.ps1.
// Used because the worktree's gate-lib.ps1 lacks Get-Utf8EncodingIssue
// (added in upstream commit c0f4dc69 after this worktree branched).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname, basename } from 'node:path';
import { execSync } from 'node:child_process';

const repoRoot = process.cwd();
const textExtensions = new Set([
  '.cjs', '.css', '.csv', '.env', '.graphql', '.html', '.js', '.json',
  '.jsx', '.md', '.mdc', '.mjs', '.prisma', '.ps1', '.scss', '.sql', '.svg',
  '.toml', '.ts', '.tsx', '.txt', '.xml', '.yaml', '.yml',
]);
const textFiles = new Set(['.editorconfig', '.gitattributes', '.gitignore']);

function shell(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
}

const out = new Set();
for (const line of shell('git diff --name-only --diff-filter=ACMRT')) out.add(line);
for (const line of shell('git diff --cached --name-only --diff-filter=ACMRT')) out.add(line);
for (const line of shell('git ls-files --others --exclude-standard')) out.add(line);

let checked = 0;
let failures = 0;
console.log('UTF-8 NO-BOM GATE');
for (const rel of [...out].sort()) {
  const ext = extname(rel).toLowerCase();
  const name = basename(rel);
  if (!textExtensions.has(ext) && !textFiles.has(name)) continue;
  const full = join(repoRoot, rel);
  let bytes;
  try {
    bytes = readFileSync(full);
  } catch {
    continue;
  }
  checked++;
  let issue = '';
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    issue = 'UTF-8 BOM (EF BB BF) is forbidden';
  } else if (bytes.length >= 2 && (
    (bytes[0] === 0xFF && bytes[1] === 0xFE) ||
    (bytes[0] === 0xFE && bytes[1] === 0xFF)
  )) {
    issue = 'UTF-16 BOM is forbidden; use UTF-8 without BOM';
  } else {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      issue = 'invalid UTF-8 byte sequence';
    }
  }
  if (issue) {
    console.log(`  [FAIL] ${rel} - ${issue}`);
    failures++;
  } else {
    console.log(`  [OK]   ${rel}`);
  }
}

if (failures > 0) {
  console.log(`RESULT: FAIL (${failures} encoding failure(s) across ${checked} checked text file(s)).`);
  process.exit(2);
}
console.log(`RESULT: PASS (${checked} changed text file(s), strict UTF-8 without BOM).`);
process.exit(0);
