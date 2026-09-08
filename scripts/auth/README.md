# scripts/auth/

## Purpose
Authenticated session bootstrap for Tier 2 execution in credential hygiene tasks.
This directory contains scripts that help Tier 2 obtain authenticated sessions
for production environment access WITHOUT passing tokens/cookies through chat or evidence ledger.

## Files

| File | Purpose |
|------|---------|
| `session-bootstrap.mjs` | CLI bootstrap: reads `HRP_HR_BEARER` + `HRP_NEG_BEARER` from `.env.runtime`, creates session with state `pending/active/revoked`, auto-expires after 8h |
| `rotation-dryrun.mjs` | Dry-run rotation script: verifies URL pattern `postgres://[REDACTED]@[REDACTED]/[REDACTED]`, NO real DB connection |
| `README.md` | This file |

## Security Rules (Iron Rules)

1. **NEVER commit token/cookie/password values** — use `[REDACTED]` placeholders
2. **Never print bearer tokens in output** — only session metadata (state, expiry, role)
3. **Never pass tokens through chat/evidence** — read from `.env.runtime` at runtime
4. **Session auto-expires after 8 hours** — MUST revoke when round closes
5. **State file `.session-state.json` does NOT contain tokens** — only metadata

## Session State Machine

```
[none] --bootstrap dry-run--> [pending]
[pending] --activate--> [active]
[active] --revoke--> [revoked]
[any] --auto-expire(8h)--> [expired]
```

## Setup

```bash
# 1. Create .env.runtime with bearer tokens (chmod 600)
# HRP_HR_BEARER=<hr-positive-bearer-token>
# HRP_NEG_BEARER=<neg-role-bearer-token>

# 2. Bootstrap session
node scripts/auth/session-bootstrap.mjs --dry-run    # pending state
node scripts/auth/session-bootstrap.mjs --activate   # active (requires tokens)
node scripts/auth/session-bootstrap.mjs --status     # check state
node scripts/auth/session-bootstrap.mjs --revoke     # revoke when done
```

## .env.runtime format

```bash
# HRP session bootstrap — DO NOT COMMIT THIS FILE
HRP_HR_BEARER=<hr-bearer-token>
HRP_NEG_BEARER=<neg-bearer-token>
```

## Tier 2 Usage

Tier 2 reads tokens from `.env.runtime` at execution time. Tokens are NOT stored
in the session state file — only role status (`configured`/`missing`) is stored.

Tier 2 MUST revoke session when round closes:
```bash
node scripts/auth/session-bootstrap.mjs --revoke
```

## Compliance

- DEC-03: Session bootstrap does NOT go through chat/evidence ledger
- DEC-04: Secret manager is `.env.runtime` chmod 600 in worktree, not SaaS CLI
- R-01: Tokens are NEVER in source, log, or evidence
