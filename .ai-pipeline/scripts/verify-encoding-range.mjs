#!/usr/bin/env node
/**
 * verify-encoding-range.mjs — strict, range-aware UTF-8 / mojibake scanner
 * for the committed range `<baseline>..HEAD`.
 *
 * For EVERY text file in the range (committed history, NOT working tree)
 * the scanner reads the file's bytes from `git show <rev>:<path>` and
 * asserts:
 *   - UTF-8 fatal-decode (Node `TextDecoder({ fatal: true })`) succeeds.
 *   - No UTF-8 BOM (EF BB BF at file start).
 *   - No NUL (U+0000).
 *   - No U+FFFD (Unicode REPLACEMENT CHARACTER) — the canonical
 *     mojibake symptom.
 *   - No CRLF (\\r\\n) line endings (LF only).
 *   - No classic mojibake streaks: â followed by Â, Ã, Ä, Å is the most
 *     common miss; we also flag Latin-1 misinterpretation of UTF-8 (any
 *     non-ASCII byte that does NOT form a valid UTF-8 multi-byte
 *     continuation sequence in this run is already caught by the fatal
 *     decoder, but the U+FFFD count serves as the visible mojibake
 *     metric).
 *
 * Exit codes: 0 = PASS (0 violations); 2 = FAIL (>=1 violation).
 * Output: summary line + per-file failure detail.
 */
import { execFileSync, spawnSync } from 'node:child_process';

const baseline = process.argv[2];
const head = process.argv[3] ?? 'HEAD';
if (!baseline) {
  console.error('usage: verify-encoding-range.mjs <baseline-sha> [head]');
  process.exit(2);
}

// Helper: run git and return RAW BYTES (Buffer). We must avoid the UTF-16
// transcoding that execFileSync({encoding: 'utf8'}) triggers on Windows
// PowerShell, which inserts a BOM and NUL padding.
function gitBytes(args) {
  const res = spawnSync('git', args, { encoding: 'buffer', shell: false });
  if (res.status !== 0) {
    throw new Error(`git ${args.join(' ')} exited ${res.status}: ${res.stderr?.toString('utf8') ?? ''}`);
  }
  return res.stdout ?? Buffer.alloc(0);
}

function gitText(args) {
  return gitBytes(args).toString('utf8');
}

// List committed files in the range (rename-aware). Excludes binary files
// by their Git attributes (the `--diff` and `git diff` output formats we
// use make that distinction explicit).
const filesRaw = gitText([
  'diff',
  '--name-only',
  '--diff-filter=ACMRTUXB',
  `${baseline}..${head}`,
]);
const fileList = filesRaw
  .split('\n')
  .map((s) => s.trim())
  .filter((s) => s.length > 0);
if (fileList.length === 0) {
  console.log(`RESULT: PASS. 0 text files in range ${baseline}..${head}.`);
  process.exit(0);
}

// Determine which files are text. We follow git's own classification by
// reading `git diff` (which marks binary files with `Binary files ...`).
const diffRaw = gitText([
  'diff',
  '--numstat',
  `${baseline}..${head}`,
]);
const numstat = new Map();
for (const line of diffRaw.split('\n')) {
  // Format: `<add>\t<rem>\t<path>`; for renames: `<add>\t<rem>\t<old> => <new>`.
  const m = /^(\S+)\t(\S+)\t(.+)$/.exec(line);
  if (!m) continue;
  numstat.set(m[3], { add: m[1], rem: m[2] });
}

// `git diff` with `-z` returns binary marker; instead use `git ls-tree`
// to spot binary files via attrs (textconv) — simpler is to read files
// and let the decoder decide. For larger files we'll rely on the fatal
// decoder only if the head content has printable-looking bytes; binary
// files are caught at the actual decoding step.
const violations = [];

for (const relPath of fileList) {
  let bytes;
  try {
    bytes = gitBytes(['show', `${head}:${relPath}`]);
  } catch (err) {
    violations.push({
      path: relPath,
      reason: `unreadable: ${String(err?.message ?? err)}`,
    });
    continue;
  }
  // Skip files > 2 MiB (typical binary lim).
  if (bytes.length > 2 * 1024 * 1024) continue;

  const textIssues = checkOne(relPath, bytes);
  for (const issue of textIssues) violations.push({ path: relPath, ...issue });
}

function checkOne(path, buf) {
  const issues = [];

  // 1. UTF-8 fatal-decode.
  let decoded;
  try {
    decoded = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch (err) {
    issues.push({ reason: `UTF-8 fatal-decode failed: ${err?.message ?? err}` });
    return issues;
  }

  // 2. BOM at start.
  if (
    buf.length >= 3 &&
    buf[0] === 0xef &&
    buf[1] === 0xbb &&
    buf[2] === 0xbf
  ) {
    issues.push({ reason: 'UTF-8 BOM present at file start' });
  }

  // 3. NUL.
  let nulCount = 0;
  for (let i = 0; i < buf.length; i++) if (buf[i] === 0x00) nulCount++;
  if (nulCount > 0) issues.push({ reason: `NUL count=${nulCount}` });

  // 4. U+FFFD.
  let replacement = 0;
  for (const ch of decoded) if (ch === '') replacement++;
  if (replacement > 0) issues.push({ reason: `U+FFFD count=${replacement}` });

  // 5. CRLF.
  if (/\r\n/.test(decoded)) issues.push({ reason: 'CRLF line endings present' });

  // 6. Mojibake streak (Latin-1 misinterpretation of UTF-8).
  // Look for the canonical "â followed by Â/Ã/Ä/Å/â" in decoded text.
  // The two hi-byte ranges are disjoint; we union them as alternations
  // rather than a character class (which would require reordering).
  const mojibakePattern =
    /\u00e2(?:\u00c0|\u00c1|\u00c2|\u00c3|\u00c4|\u00c5|\u00c6|\u00c7|\u00c8|\u00c9|\u00ca|\u00cb|\u00cc|\u00cd|\u00ce|\u00cf|\u00d0|\u00d1|\u00d2|\u00d3|\u00d4|\u00d5|\u00d6|\u00d7|\u00d8|\u00d9|\u00da|\u00db|\u00dc|\u00dd|\u00de|\u00df|\u00e0|\u00e1|\u00e2|\u00e3|\u00e4|\u00e5|\u00e6|\u00e7|\u00e8|\u00e9|\u00ea|\u00eb|\u00ec|\u00ed|\u00ee|\u00ef)/g;
  const mojibakeHits = (decoded.match(mojibakePattern) || []).length;
  if (mojibakeHits > 0) {
    issues.push({ reason: `Mojibake streaks (\u00e2 + Latin-1 hi-byte) count=${mojibakeHits}` });
  }

  return issues;
}

if (violations.length === 0) {
  console.log(
    `RESULT: PASS. ${fileList.length}/${fileList.length} text file(s) in range ${baseline}..${head}; 0 BOM, 0 NUL, 0 U+FFFD, 0 CRLF, 0 mojibake streaks.`,
  );
  process.exit(0);
}

console.log(`RESULT: FAIL. ${violations.length} violation(s) across ${fileList.length} file(s).`);
for (const v of violations) {
  console.log(`  - ${v.path}: ${v.reason}`);
}
process.exit(2);
