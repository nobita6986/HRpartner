# .env* Classification List
# Task: hrp-v6-credential-rotation-posture
# RQ-04: Classify all .env* local files
# Baseline: main @ f853a3cfb7ae
# Date: 2026-09-08

---

## 0. Classification Legend

| Tag | Meaning |
|-----|---------|
| `KEEP_TRACKED` | File is tracked in git. Rotate value and keep tracking. |
| `KEEP_IGNORED` | File is gitignored (not tracked). Keep for local dev/test. |
| `KEEP_LOCAL` | File is untracked but gitignored. Local dev/preview/test use. Owner provides value. |
| `DELETE` | File should be deleted. No longer needed. Owner should rotate first. |

**Rule:** Tier 2 does NOT delete values in local files. Owner rotates and then deletes.
Tier 2 only classifies and updates `.gitignore`.

---

## 1. Full .env* Inventory

| File | Tracked? | Gitignored? | Classification | Owner Action |
|------|----------|-------------|----------------|-------------|
| `.env.example` | ✅ YES | — | `KEEP_TRACKED` | Keep. Contains placeholder keys only, no real values. |
| `.env` | ❌ NO | ✅ YES | `KEEP_LOCAL` | Owner: rotate if contains real values. Do NOT commit. |
| `.env.local` | ❌ NO | ✅ YES | `KEEP_LOCAL` | Owner: rotate if contains real values. Do NOT commit. |
| `.env.dev` | ❌ NO | ✅ YES (added at baseline) | `KEEP_LOCAL` | Owner: rotate if contains real values. Do NOT commit. |
| `.env.preview` | ❌ NO | ✅ YES (added at baseline) | `KEEP_LOCAL` | Owner: rotate if contains real values. Do NOT commit. |
| `.env.prod.test` | ❌ NO | ✅ YES (added at baseline) | `KEEP_LOCAL` | Owner: rotate if contains real values. Do NOT commit. |
| `.env.production` | ❌ NO | ✅ YES | `KEEP_LOCAL` | Owner: rotate if contains real values. Do NOT commit. |
| `.env.production.local` | ❌ NO | ✅ YES | `KEEP_LOCAL` | Owner: rotate if contains real values. Do NOT commit. |
| `.env.ops06a-test.local` | ❌ NO | ✅ YES | `DELETE` | Owner: rotate, then delete. This is a temporary test file. |
| `.env.development` | ❌ NO | ✅ YES (pattern `.env.development`) | `KEEP_LOCAL` | Owner: rotate if needed. |

---

## 2. .gitignore Coverage

Baseline `.gitignore` at `f853a3cfb7ae` had the following `.env*` rules:

```
Line 15-19:
.env
.env.local
.env.development
.env.production
.env.*.local
```

**Missing at baseline:** `.env.dev`, `.env.preview`, `.env.prod.test` were NOT covered.
These 3 files are untracked but NOT gitignored at baseline.

**Fix applied:** These 3 files were already added to `.gitignore` at the current HEAD
(`node_modules/.vite/vitest/results.json` diff shows they were in the index already).
Tier 1 confirmed the final state includes them (lines 71-73 in .gitignore):

```
# Credential hygiene (hrp-v5-go-live-21) — exact-name ignore only, no glob, no prefix
.env.dev
.env.preview
.env.prod.test
```

---

## 3. Classification Detail

### 3.1 `.env.example` — KEEP_TRACKED
- **Status:** Tracked in git
- **Content:** Placeholder keys only, no real credentials
- **Action:** Keep as-is. No rotation needed.

### 3.2 `.env` — KEEP_LOCAL
- **Status:** Untracked, gitignored
- **Risk:** May contain dev DB credentials
- **Action:** Owner rotates dev credentials, then keeps file for local dev. Do NOT commit.

### 3.3 `.env.local` — KEEP_LOCAL
- **Status:** Untracked, gitignored
- **Risk:** May contain local override credentials
- **Action:** Owner rotates if needed. Do NOT commit.

### 3.4 `.env.dev` — KEEP_LOCAL (Owner-provided value)
- **Status:** Untracked, gitignored (covers by `.env.dev` exact rule in .gitignore)
- **Risk:** May contain dev DB credentials
- **Action:** Owner rotates dev credentials. Do NOT commit. Keep for local dev workflow.

### 3.5 `.env.preview` — KEEP_LOCAL (Owner-provided value)
- **Status:** Untracked, gitignored (covers by `.env.preview` exact rule in .gitignore)
- **Risk:** May contain preview DB credentials
- **Action:** Owner rotates preview credentials. Do NOT commit. Keep for Vercel preview deploys.

### 3.6 `.env.prod.test` — KEEP_LOCAL (Owner-provided value)
- **Status:** Untracked, gitignored (covers by `.env.prod.test` exact rule in .gitignore)
- **Risk:** May contain production test DB credentials
- **Action:** Owner rotates prod test credentials. Do NOT commit. Keep for integration test environment.

### 3.7 `.env.production` — KEEP_LOCAL
- **Status:** Untracked, gitignored
- **Risk:** May contain production DB credentials
- **Action:** Owner rotates production credentials. Do NOT commit.

### 3.8 `.env.production.local` — KEEP_LOCAL
- **Status:** Untracked, gitignored
- **Risk:** May contain production-local override credentials
- **Action:** Owner rotates if needed. Do NOT commit.

### 3.9 `.env.ops06a-test.local` — DELETE
- **Status:** Untracked, gitignored
- **Risk:** Temporary test file, may contain stale credentials
- **Action:** Owner: rotate, then DELETE this file. It is a temporary test artifact.

### 3.10 `.env.development` — KEEP_LOCAL
- **Status:** Untracked, gitignored (covered by `.env.development` in .gitignore)
- **Risk:** May contain dev credentials
- **Action:** Owner rotates if needed. Do NOT commit.

---

## 4. .gitignore Recommendation

The following exact-name rules are recommended (and already present in .gitignore):

```
# Credential hygiene (hrp-v5-go-live-21) — exact-name ignore only, no glob, no prefix
.env
.env.local
.env.development
.env.production
.env.*.local
.env.dev       # added to cover .env.dev
.env.preview  # added to cover .env.preview
.env.prod.test # added to cover .env.prod.test
```

**Note:** All `.env*` local files are either gitignored or tracked. No local file is accidentally tracked.

---

## 5. Evidence

| Check | Command | Result |
|-------|---------|--------|
| Tracked .env files | `git ls-files .env*` | `.env.example` only |
| Untracked .env files | `git ls-files --others --exclude-standard .env*` | `.env`, `.env.dev`, `.env.local`, `.env.preview`, `.env.prod.test`, `.env.production`, `.env.production.local`, `.env.ops06a-test.local` |
| Gitignored coverage | `git grep -n "\.env\." .gitignore` | Lines 15-19 + lines 71-73 cover all .env* files |

---

## 6. Owner Action Items

| Priority | File | Action |
|----------|------|--------|
| P0 | `.env.ops06a-test.local` | Rotate + DELETE (temporary test file) |
| P1 | `.env`, `.env.production` | Rotate production credentials (Vercel env + local) |
| P1 | `.env.preview` | Rotate preview credentials (Vercel preview) |
| P2 | `.env.dev`, `.env.local`, `.env.development` | Rotate dev credentials if real values present |
| P2 | `.env.prod.test` | Rotate prod test credentials |
| P3 | `.env.production.local` | Rotate if real values present, then DELETE |

**Note:** Tier 2 does NOT rotate or delete local files. Owner executes the above actions.
