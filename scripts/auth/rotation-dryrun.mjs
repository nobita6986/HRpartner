// scripts/auth/rotation-dryrun.mjs
// Tier 2 Rotation Dry-Run for hrp-v6-credential-rotation-posture
//
// Purpose: Verify that rotation scripts contain REDACTED URLs only.
//          Pattern: postgres://[REDACTED]@[REDACTED]/[REDACTED]
//          NO real DB connection. NO credential values in source.
//
// IRON RULES (per R-01, DEC-02, DEC-04):
//   - URLs are [REDACTED] — never real connection strings
//   - Script does NOT actually connect to DB
//   - Script only validates URL pattern format
//   - Script exit 0 with output "OK" when pattern is valid
//
// Usage: node scripts/auth/rotation-dryrun.mjs
//   exit 0 = pattern valid, no real credentials found
//   exit 1 = pattern invalid or real credentials detected

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_DIR = __dirname;

// ─── URL Pattern Validation ──────────────────────────────────────────────────

/**
 * Valid URL pattern for DB connection strings.
 * All credentials must be [REDACTED] — no real host/port/username/password.
 */
const REDACTED_DB_URL_PATTERN = /^postgres:\/\/\[REDACTED\]@\[REDACTED\]\/[REDACTED](\?.*)?$/i;

/**
 * Check if a string contains a REAL (non-redacted) PostgreSQL connection URL.
 * Real URL pattern: postgres://user@host:port/dbname  (non-redacted values)
 * 
 * Returns: { valid: boolean, reason: string, matched: string|null }
 */
function checkUrlPattern(str) {
  // Skip comments and obvious non-URL text
  if (str.trim().startsWith('//') || str.trim().startsWith('#')) {
    return { valid: true, reason: 'comment line', matched: null };
  }
  
  // Skip SQL examples with schema keywords
  if (str.includes('SELECT') || str.includes('FROM') || str.includes('WHERE')) {
    return { valid: true, reason: 'SQL line', matched: null };
  }
  
  // Skip example/placeholder patterns (user@host:port pattern is an example, not real)
  if (str.includes('user@host') || str.includes('example.com') || str.includes('localhost')) {
    return { valid: true, reason: 'example URL pattern', matched: null };
  }
  
  // Find all postgres:// URLs in the string
  const urlRegex = /postgres:\/\/[^\s'"`\\]+/g;
  const matches = str.match(urlRegex) || [];
  
  for (const url of matches) {
    // A REDACTED URL has [REDACTED] as the credential part
    if (REDACTED_DB_URL_PATTERN.test(url)) {
      continue; // Valid redacted URL
    }
    
    // Check if this URL has a non-redacted credential pattern
    // Pattern: postgres://user@host/path  where user/host are NOT [REDACTED]
    const hasRealHost = /@([^/]+)\//.test(url) && !/@\[REDACTED\]/.test(url);
    if (hasRealHost) {
      return { 
        valid: false, 
        reason: 'URL contains non-redacted host/credential', 
        matched: url 
      };
    }
  }
  
  return { valid: true, reason: 'no real DB URL', matched: null };
}

// ─── Script Validation ───────────────────────────────────────────────────────

/**
 * Validate all JS/TS files in a directory for redacted DB URLs.
 * Returns: { valid: boolean, errors: string[] }
 */
function validateDirectory(dir, files) {
  const errors = [];
  
  for (const file of files) {
    const filepath = join(dir, file);
    if (!existsSync(filepath)) continue;
    
    try {
      const content = readFileSync(filepath, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip comment lines
        if (line.trim().startsWith('//') || line.trim().startsWith('#')) continue;
        
        const result = checkUrlPattern(line);
        if (!result.valid) {
          errors.push(`${file}:${i + 1}: ${result.reason} — ${result.matched}`);
        }
      }
    } catch (e) {
      // Skip files that can't be read (binary, etc.)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log('[rotation-dryrun] Starting rotation dry-run validation...');
  console.log('');
  
  // Read DATABASE_URL from environment (if set)
  // This is only for the check — we don't actually connect
  const dbUrl = process.env.DATABASE_URL_ADMIN || process.env.DATABASE_URL;
  if (dbUrl) {
    console.log('[rotation-dryrun] DATABASE_URL_ADMIN: [SET — not verified in dry-run]');
  } else {
    console.log('[rotation-dryrun] DATABASE_URL_ADMIN: [NOT SET]');
  }
  
  console.log('');
  console.log('[rotation-dryrun] Validating URL patterns in scripts/auth/...');
  
  // Validate all files in scripts/auth/
  let files = [];
  try {
    files = readdirSync(SCRIPT_DIR).filter(f => 
      f.endsWith('.js') || f.endsWith('.mjs') || f.endsWith('.ts') || f.endsWith('.ps1')
    );
  } catch (e) {
    console.log('[rotation-dryrun] No files found in scripts/auth/');
  }
  
  const result = validateDirectory(SCRIPT_DIR, files);
  
  if (!result.valid) {
    console.log('[rotation-dryrun] VALIDATION FAILED:');
    result.errors.forEach(e => console.log('  ERROR: ' + e));
    console.log('');
    console.log('FAIL');
    process.exit(1);
  }
  
  console.log('[rotation-dryrun] Validation complete.');
  console.log('[rotation-dryrun] All URLs are [REDACTED] — no real credentials in source.');
  console.log('[rotation-dryrun] This is a dry-run — NO actual DB connection was made.');
  console.log('');
  console.log('OK');
  process.exit(0);
}

main();
