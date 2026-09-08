// scripts/auth/session-bootstrap.mjs
// Tier 2 Session Bootstrap for hrp-v6-credential-rotation-posture
// 
// Purpose: Authenticated session bootstrap for Tier 2 execution.
//          Reads HR+negative-role bearer tokens from .env.runtime (chmod 600).
//          Session state: pending -> active -> revoked
//          Auto-expire after 8 hours.
//
// IRON RULES (per R-01, DEC-03, DEC-04):
//   - Token values are NEVER printed, logged, or committed to repo
//   - Only session metadata (state, expiry, role) is written to output
//   - Bootstrap reads from .env.runtime ONLY (not SaaS CLI, not chat, not evidence ledger)
//
// Usage: node scripts/auth/session-bootstrap.mjs [--dry-run] [--revoke] [--status]
//   --dry-run  : Initialize session in PENDING state (no real auth)
//   --revoke   : Revoke active session
//   --status   : Show current session state

import { readFileSync, writeFileSync, existsSync, statSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = join(__dirname, '.session-state.json');
const ENV_RUNTIME = join(__dirname, '.env.runtime');
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours auto-expire

// ─── Session State Machine ──────────────────────────────────────────────────

const STATE = {
  PENDING: 'pending',
  ACTIVE: 'active',
  REVOKED: 'revoked',
};

/**
 * Read bearer tokens from .env.runtime (chmod 600).
 * Keys expected: HRP_HR_BEARER, HRP_NEG_BEARER
 * Returns: { hr_bearer: string|null, neg_bearer: string|null }
 */
function readRuntimeEnv() {
  if (!existsSync(ENV_RUNTIME)) {
    return { hr_bearer: null, neg_bearer: null };
  }
  const stat = statSync(ENV_RUNTIME);
  const mode = stat.mode & 0o777;
  // Warn if not chmod 600 — but still read (Tier 2 owns the file)
  if ((mode & 0o077) !== 0) {
    console.warn('[session-bootstrap] WARNING: .env.runtime is not chmod 600. Fix: chmod 600 .env.runtime');
  }
  const content = readFileSync(ENV_RUNTIME, 'utf-8');
  const lines = content.split('\n');
  let hr_bearer = null;
  let neg_bearer = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key === 'HRP_HR_BEARER') hr_bearer = value;
    if (key === 'HRP_NEG_BEARER') neg_bearer = value;
  }
  return { hr_bearer, neg_bearer };
}

/**
 * Create a session state object.
 * NOTE: Tokens are NOT stored in the state file — only metadata.
 */
function createSession(tokens, state) {
  return {
    state,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    roles: {
      hr_positive: tokens.hr_bearer ? 'configured' : 'missing',
      neg_role: tokens.neg_bearer ? 'configured' : 'missing',
    },
    // NEVER store token values in session file
    note: 'Token values are read from .env.runtime at bootstrap time only. State file contains no secrets.',
  };
}

/**
 * Load existing session state.
 */
function loadSession() {
  if (!existsSync(SESSION_FILE)) return null;
  try {
    return JSON.parse(readFileSync(SESSION_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Save session state.
 */
function saveSession(session) {
  writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), 'utf-8');
}

/**
 * Clear session state (on revoke).
 */
function clearSession() {
  if (existsSync(SESSION_FILE)) {
    unlinkSync(SESSION_FILE);
  }
}

/**
 * Mask a string for safe display (first 4 + last 4 chars).
 * Returns: e.g. "abcd****efgh"
 */
function mask(s) {
  if (!s || s.length < 8) return '[REDACTED]';
  return s.slice(0, 4) + '****' + s.slice(-4);
}

// ─── Commands ───────────────────────────────────────────────────────────────

function cmdDryRun() {
  console.log('[session-bootstrap] Dry-run mode: PENDING state');
  const tokens = readRuntimeEnv();
  const session = createSession(tokens, STATE.PENDING);
  session.note += ' [DRY-RUN]';
  saveSession(session);
  console.log('State   : pending (dry-run)');
  console.log('Created : ' + session.created_at);
  console.log('Expires : ' + session.expires_at);
  console.log('Roles   :');
  console.log('  hr_positive : ' + session.roles.hr_positive);
  console.log('  neg_role    : ' + session.roles.neg_role);
  console.log('Token metadata: [REDACTED — never printed]');
  console.log('OK');
}

function cmdActivate() {
  const tokens = readRuntimeEnv();
  if (!tokens.hr_bearer || !tokens.neg_bearer) {
    console.error('ERROR: Missing HRP_HR_BEARER or HRP_NEG_BEARER in .env.runtime');
    console.error('Configure .env.runtime with both tokens before activating.');
    process.exit(1);
  }
  // Verify token format (should be JWT-like, 32+ chars)
  if (tokens.hr_bearer.length < 16 || tokens.neg_bearer.length < 16) {
    console.error('ERROR: Token value too short — check .env.runtime');
    process.exit(1);
  }
  const session = createSession(tokens, STATE.ACTIVE);
  saveSession(session);
  console.log('[session-bootstrap] Session ACTIVE');
  console.log('State   : active');
  console.log('Created : ' + session.created_at);
  console.log('Expires : ' + session.expires_at);
  console.log('Roles   :');
  console.log('  hr_positive : configured');
  console.log('  neg_role    : configured');
  console.log('Token metadata: [REDACTED — never printed]');
  console.log('OK');
}

function cmdRevoke() {
  const existing = loadSession();
  if (existing) {
    console.log('[session-bootstrap] Revoking session...');
    console.log('Previous state: ' + existing.state);
  }
  clearSession();
  // Write a revoked state record (for audit trail, no token)
  const revoked = {
    state: STATE.REVOKED,
    revoked_at: new Date().toISOString(),
    note: 'Session revoked. Token revocation must be done in the identity provider.',
  };
  writeFileSync(SESSION_FILE, JSON.stringify(revoked, null, 2), 'utf-8');
  console.log('State   : revoked');
  console.log('Revoked : ' + revoked.revoked_at);
  console.log('Token metadata: [REDACTED — never printed]');
  console.log('OK');
}

function cmdStatus() {
  const existing = loadSession();
  if (!existing) {
    console.log('State   : none (no session file)');
    console.log('OK');
    return;
  }
  // Check expiry
  if (existing.expires_at) {
    const expires = new Date(existing.expires_at);
    const now = new Date();
    if (now > expires) {
      console.log('State   : expired');
      console.log('Expired : ' + existing.expires_at);
      console.log('OK');
      return;
    }
  }
  console.log('State   : ' + existing.state);
  if (existing.created_at) console.log('Created : ' + existing.created_at);
  if (existing.expires_at) console.log('Expires : ' + existing.expires_at);
  if (existing.roles) {
    console.log('Roles   :');
    console.log('  hr_positive : ' + existing.roles.hr_positive);
    console.log('  neg_role    : ' + existing.roles.neg_role);
  }
  console.log('Token metadata: [REDACTED — never printed]');
  console.log('OK');
}

// ─── CLI Router ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes('--dry-run')) {
  cmdDryRun();
} else if (args.includes('--revoke')) {
  cmdRevoke();
} else if (args.includes('--status')) {
  cmdStatus();
} else if (args.includes('--activate')) {
  cmdActivate();
} else {
  console.log('Usage: node scripts/auth/session-bootstrap.mjs [--dry-run|--activate|--revoke|--status]');
  console.log('  --dry-run  : Initialize in PENDING state (no real auth)');
  console.log('  --activate : Activate session (requires .env.runtime with tokens)');
  console.log('  --revoke   : Revoke current session');
  console.log('  --status   : Show current session state');
  console.log('');
  console.log('Session state file: ' + SESSION_FILE);
  console.log('Runtime env file : ' + ENV_RUNTIME);
  console.log('Token policy     : NEVER print, log, or commit token values');
  process.exit(0);
}
