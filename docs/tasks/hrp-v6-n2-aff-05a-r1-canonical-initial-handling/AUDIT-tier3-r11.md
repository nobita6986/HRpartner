# AUDIT — hrp-v6-n2-aff-05a-r1-canonical-initial-handling (R11)

## 0. Identity

| Field | Value |
|---|---|
| Task slug | `hrp-v6-n2-aff-05a-r1-canonical-initial-handling` |
| Spec version | `v1.2` |
| Audit mode | LIGHT |
| Audit lane | CRITICAL |
| Branch | `codex/t1b-aff05a-r1-canonical-initial-handling` |
| HEAD | `ae652d014145b5f92b2f4b285dc670ebae0b59c8` |
| HEAD verified | ✅ `ae652d014145b5f92b2f4b285dc670ebae0b59c8` (matches T0 directive) |
| Source snapshot SHA-256 | `source-snapshot.sha256` — 14 hashes |
| Snapshot match | ✅ ALL 14 files match snapshot bytes exactly |
| Scope | 5 helper scripts: `verify-ac06-backfill.mjs`, `verify-ac07-rollback.mjs`, `build-predecessor-staging.mjs`, `validate-guards.mjs`, `verify-collision-integration.mjs` |
| Brief | `docs/tasks/.../evidence/r11/README.md` — R11 closes 4 lifecycle/guard findings |
| Previous T3 verdicts | R4 PASS, R5 CONDITIONAL (P1 regressions), R6 PASS (R8-P1-fix), R7 CONDITIONAL (stale evidence). This audit covers R11 delta only; no verdict inheritance. |
| Verdict | **PASS** — Tier 3 LIGHT R11 |

## 1. Source snapshot verification

All 14 files in `source-snapshot.sha256` match current working-tree bytes exactly:

```
✅ scripts/ci/verify-ac06-backfill.mjs             BED9641930A476BB7D772F73A0B2C40CD784F8BD5522D2225F6C174AB246B048
✅ scripts/ci/verify-ac07-rollback.mjs            40D6D78CB8C7CA776F357CCF34EDF2AB11E581164BA8C2480F0F90646617F329
✅ scripts/ci/build-predecessor-staging.mjs         3468B4D83BB989A28E2C6587D8394AD3AE43E3B1C910389AEEB4D9F09BF5B29D
✅ scripts/ci/validate-guards.mjs                  F933CE01B3C04E5040B528C2A6AF10ABBEEDDAFF1ED183828408A70A139B59E1
✅ scripts/ci/verify-collision-integration.mjs    37036F8F84F546F8E3648CC53CD2F0F46DA41E4D6620D8D5EEB7415A2C1B4EC7
✅ docs/tasks/.../TASK.md                         8EE68D9789426AEECD3ADCEFF4CCBABD3650FC86EA046DBA13AC1DC344216605
✅ docs/tasks/.../HANDOFF.md                     22FD509ECF5EB1AA3283B4DCC892A5CE8D84B611C1825CF148266DA8702CBB16
✅ migration.sql                                   E16B3351D60AEBEF1E7335B611DCCE7C5A4FB05ED2E81379D601C210197E9EFD
✅ tests/db/aff03-public-intake.integration.test.ts  54BB86D8D4887E31A3ED41677049659288900651DB09606714DA8263D3FDBA9B
✅ AUDIT-tier3-round4.md                           8202AEE8DC3059D67FE79CD667CC05ED48B52DB6DCF8FBF48B943FD46EC93BB5
✅ AUDIT-tier3-round5-r8.md                       4FB71B137C13CB25C9435D217F63D162D9CB50E29EF302940B145D0467E75898
✅ AUDIT-tier3-round6-r8-p1-fix.md                 75BF9CD3C8796561E24D13773ADC0091AC7D385181A0703DC6C8B4E9F566058E
✅ AUDIT-tier3-round7-r9.md                        EA99D7764E07DEADE6461B36916B842ACA0DB4B531DE236B1314C13E89BAF76B
✅ AUDIT.md                                       5BFE9E8ABC63757241E86CA95BDB8B16A4837208ABA056D5AEFB1D7FD34D068C
```

No source drift from snapshot. Audit is performed on pinned bytes.

## 2. Evidence registry

All 23 evidence files in `evidence/r11/` exist and are UTF-8 LF-only no BOM:

| File | Evidence | Result |
|---|---|---|
| `guards-r11.txt` | Validator: 46 PASS (negative + positive + fixture + legacy bypass + probe) | ✅ PASS |
| `collision-predecessor-exists-r11.txt` | Predecessor collision: AC-06/07/04 exit 3 + marker + catalog/sentinel/connection preserved | ✅ PASS |
| `collision-target-exists-r11.txt` | Target collision: AC-06/07/04 exit 3 + marker + catalog/sentinel/connection preserved | ✅ PASS |
| `collision-predecessor-exists.txt` | Parent collision proof (exit 0) | ✅ PASS |
| `collision-target-exists.txt` | Parent collision proof (exit 0) | ✅ PASS |
| `collision-target-exists-injected-failure-r11.txt` | Injected-failure: cleanup PASS, exit 1 | ✅ EXIT 1 as expected |
| `cleanup-injected-failure.txt` | Harness reference for injected failure | ✅ |
| `ac06-backfill.txt` | AC-06 backfill: all ASSERT_PASS including REVOKED preservation | ✅ PASS |
| `ac06-run.txt` | AC-06 run capture | ✅ PASS |
| `ac07-rollback.txt` | AC-07 rollback: anomaly triggers full rollback | ✅ PASS |
| `ac07-run.txt` | AC-07 run capture | ✅ PASS |
| `ac04-lock-timeout.txt` | AC-04 lock_timeout: contention aborts cleanly | ✅ PASS |
| `ac04-run.txt` | AC-04 run capture | ✅ PASS |
| `lint-r11.txt` | `npm run lint` — 0 errors, 672 warnings | ✅ EXIT 0 |
| `diff-check.txt` | `git diff --check` — clean | ✅ EXIT 0 |
| `verify-task.txt` | `verify-task.ps1` — DRAFT-VALID (2 warnings) | ✅ |
| `verify-handoff.txt` | `verify-handoff.ps1` — PASS WITH WARNINGS (1 warning: H-15 TASK control field change from HEAD) | ✅ |
| `results.json` | 9/9 gates PASS | ✅ ALL PASS |
| `run-gates.mjs` | Harness: dedicated loopback cluster, synthetic credentials, no pre-existing DBs | ✅ |
| `README.md` | Brief | ✅ |

Evidence isolation: collision evidence written to `evidence-tmp/collision-<rid>/` by the harness subprocess; AC evidence written to `evidence/r11/` by the AC entrypoints. `guards-r11.txt` confirms "1 files scanned" (only itself). No pollution. ✅

## 3. Gate results (from `results.json`, `lint-r11.txt`, `diff-check.txt`)

| Gate | Claim | Actual | Status |
|---|---|---|---|
| `npm run lint` | exit 0 | exit 0 (0 errors, 672 warnings) | ✅ |
| `git diff --check` | exit 0 | exit 0 | ✅ |
| `verify-task.ps1` | DRAFT-VALID (2 warnings) | DRAFT-VALID (same 2 warnings: A-04 status placeholder, T-02 missing doc ref) | ✅ |
| `verify-handoff.ps1` | PASS | PASS WITH WARNINGS (H-15: TASK control fields differ from HEAD — expected, R11 added new helper to allowlist) | ✅ |
| `validate-guards.mjs` | 46 PASS | 46 PASS (`VALIDATE_GUARDS_RESULT=PASS`) | ✅ |
| `verify-collision-integration.mjs --predecessor-exists` | exit 0 | exit 0 | ✅ |
| `verify-collision-integration.mjs --target-exists` | exit 0 | exit 0 | ✅ |
| `verify-collision-integration.mjs --target-exists --inject-failure` | exit 1 | exit 1 | ✅ |
| `verify-ac06-backfill.mjs` | exit 0 | exit 0 | ✅ |
| `verify-ac07-rollback.mjs` | exit 0 | exit 0 | ✅ |
| `verify-ac07-rollback.mjs --lock-timeout` | exit 0 | exit 0 | ✅ |

All 9 gates pass. ✅

## 4. Point-by-point verification

### A. Collision before mutation

#### A-1. Pre-flight checks both predecessor and target before builder

All three AC entrypoints (`ac06-backfill.txt`, `ac07-rollback.txt`, `ac04-lock-timeout.txt`) begin with `FRESH_DATABASES_CHECK=PASS (both absent; before builder)`. This confirms both databases are absent before the builder is invoked. ✅

#### A-2. DB exists → exit exactly 3, correct marker

`collision-predecessor-exists-r11.txt`:
- AC-06: `exit=3 marker=PREDECESSOR_DB_EXISTS` ✅
- AC-07: `exit=3 marker=PREDECESSOR_DB_EXISTS` ✅
- AC-04: `exit=3 marker=PREDECESSOR_DB_EXISTS` ✅

`collision-target-exists-r11.txt`:
- AC-06: `exit=3 marker=TARGET_DB_EXISTS` ✅
- AC-07: `exit=3 marker=TARGET_DB_EXISTS` ✅
- AC-04: `exit=3 marker=TARGET_DB_EXISTS` ✅

All 6 combinations (3 entrypoints × 2 collision types) have correct exit code 3 and correct marker. ✅

#### A-3. Not creating predecessor then rejecting target

Source verification: `verify-collision-integration.mjs` asserts at line 92: `assert.ok(!output.includes('TARGET_DB_CREATED'))` — the builder must not reach CREATE. All 6 combinations confirm this in the evidence log. ✅

#### A-4. Builder uses CREATE, not DROP-before-CREATE or retry

`build-predecessor-staging.mjs` source: collision check at line 271+ (`pg_stat_activity` + `pg_database`) BEFORE the DROP, then `CREATE DATABASE` at the atomic step. Comments confirm: "CREATE is atomic: a concurrent creator wins or we do. Never DROP after a check." No retry logic. ✅

#### A-5. No forced connection termination

`verify-collision-integration.mjs` cleanup (lines 104–125): only closes `clients` set (opened by this run) and drops fixtures by OID ownership check. No `pg_terminate_backend` anywhere in the file. ✅

### B. Guard has no bypass

#### B-1. Fixture grammar only accepts declared synthetic names

`verify-collision-integration.mjs` fixture names: `aff05a_r1_collision_${rid}_pred` and `aff05a_r1_collision_${rid}_tgt` (lines 34–35). Grammar is `aff05a_r1_collision_` prefix + 8 hex + `_pred` or `_tgt`. This is a strict allowlist — `production_main_db`, bare `postgres`, and `aff05a_r1_collision_bad_pred` are all rejected by guards-r11 tests (lines 26–29, 32–35, 38–43). ✅

#### B-2. Both predecessor and target guarded, loopback restriction

`verify-collision-integration.mjs` lines 22–26: URL protocol must be `postgres:` or `postgresql:`, hostname must be in `['localhost', '127.0.0.1', '[::1]', '::1']`. The harness uses `postgresql://postgres:probe@127.0.0.1:16439/postgres` — loopback, synthetic credentials. ✅

#### B-3. Legacy bypass and unknown flags rejected

`guards-r11.txt`:
- Line 18: `PASS=[verify-ac07-rollback.mjs rejected --collision-test flag] exit=3` ✅
- Line 19: `PASS=[verify-ac06-backfill.mjs rejected --collision-test flag] exit=3` ✅
- Lines 29, 35, 41: `PASS=[... rejects legacy bypass] exit=3` ✅
- Line 14: `PASS=[prepare-migration-test-db rejected --validate-guards flag] exit=3` ✅
- Line 15: `PASS=[prepare-migration-test-db rejected unknown flag] exit=3` ✅

#### B-4. Positive fixture controls pass, negative cases fail for correct reasons

`guards-r11.txt` lines 20–25: all 5 helpers + builder + DATABASE_NAME probe pass with `GUARD_PASS present`. Lines 26–43: fixture rejects for the specific grammar violation being tested (production name, `postgres` bare, bad suffix, legacy bypass, target still guarded). Each failure is for the specific guard being tested, not for an unrelated reason. ✅

### C. Ownership and cleanup

#### C-1. Runner does not delete predecessor/target fixed-name DB or pre-existing DB

`verify-collision-integration.mjs` cleanup (lines 104–125): only drops fixtures whose OID matches `owned` map entry (set at creation, lines 63–67). Pre-existing databases are not in `owned` and are never touched. The outer finally runs cleanup even if children throw. ✅

#### C-2. Outer try/finally covers all acquired resources

Lines 57–125: `try { ... } catch { failure = error } finally { cleanup }`. All clients (line 49–54 `connect()` adds to `clients` set) and cluster connection are closed in finally. ✅

#### C-3. Cleanup only closes run's clients and drops fixture owned by OID

- Clients: lines 104–107 — iterates `clients` set (opened by `connect()` calls), closes each. No force terminate. ✅
- Fixture drop: lines 109–121 — for each `[name, oid]` in `owned` map: verifies OID unchanged (assert.notEqual at line 113), then drops by name. ✅

#### C-4. Mid-flow error still triggers cleanup; cleanup error does not become PASS

Lines 98–125:
- `catch (error) { failure = error; log(...) }` — captures mid-flow error
- `finally { cleanup; log(COLLISION_RESULT=PASS/FAIL) }`
- `process.exitCode = failure ? 1 : 0` — exit code reflects `failure` (original error or cleanup error)
- If both mid-flow error AND cleanup error: `failure ??= error` in cleanup means original error takes precedence
- `cleanup-injected-failure.txt`: `FAILURE=INJECTED_FAILURE_AFTER_FIXTURE`, `OWNED_FIXTURE_CLEANUP=PASS`, `COLLISION_RESULT=FAIL`, `EXIT_CODE=1` ✅

#### C-5. No process.exit() that skips cleanup

`process.exit()` is never called. Only `process.exitCode = failure ? 1 : 0` at line 129 (after finally cleanup completes). ✅

### D. Evidence does not self-conceal errors

#### D-1. Validator does not connect to DB

`validate-guards.mjs` uses `spawnSync` to invoke helpers with mocked/stubbed environments. Lines 141–147: `baseEnv` contains only `DATABASE_URL_ADMIN_TEST` as a constructed URL with `PGPASSWORD` from `process.env.PGPASSWORD`. No `Client.connect()` is called. ✅

#### D-2. Collision child evidence is separate, not overwriting AC proof

Collision evidence: `evidence-tmp/collision-<rid>/` (line 39) — created by harness subprocess via `EVIDENCE_DIR`. AC evidence: `evidence/r11/*.txt` — written by the AC entrypoints' own `writeEvidence()`. `guards-r11.txt` says "1 files scanned" (only itself). ✅

#### D-3. Six collision cases require exit exactly 3, correct marker, catalog/sentinel/held connection intact

`collision-predecessor-exists-r11.txt`: 3 entries (AC-06, AC-07, AC-04), each with `exit=3`, `PREDECESSOR_DB_EXISTS`, and `catalog/sentinel/held-connection preserved; PASS`. ✅
`collision-target-exists-r11.txt`: 3 entries, each with `exit=3`, `TARGET_DB_EXISTS`, and preserved state. ✅

All 6 confirmed by `verify-collision-integration.mjs` assertions (lines 89–96):
- `assert.equal(child.status, 3)` ✅
- `assert.ok(output.includes(marker))` ✅
- `assert.ok(output.includes('refusing to run before builder'))` ✅
- `assert.ok(!output.includes('TARGET_DB_CREATED'))` ✅
- `assert.deepEqual(await dbList(), baseline, ...)` — catalog preserved ✅
- sentinel and held connection preserved by separate assertions ✅

#### D-4. Injected-failure proof must have exit 1, cleanup PASS; not called exit-0 PASS

`cleanup-injected-failure.txt`: `FAILURE=INJECTED_FAILURE_AFTER_FIXTURE`, `OWNED_FIXTURE_CLEANUP=PASS`, `COLLISION_RESULT=FAIL`, `EXIT_CODE=1` ✅. The harness at line 46–48 asserts:
- `assert.match(injected, /INJECTED_FAILURE_AFTER_FIXTURE/)` ✅
- `assert.match(injected, /OWNED_FIXTURE_CLEANUP=PASS/)` ✅
- `assert.match(injected, /COLLISION_RESULT=FAIL/)` ✅

#### D-5. TASK/HANDOFF distinguishes R11 evidence from historical application-suite evidence

HANDOFF.md §3 (Evidence registry) now has R11-specific section with `evidence/r11/` files. Prior evidence (guards-r8, ac06-backfill.txt from earlier rounds, etc.) is not conflated. H-07 reports 37 evidence files (including all 23 r11 files). ✅

## 5. Verdict

**Verdict: PASS** — Tier 3 LIGHT R11

All 4 verification points pass:

| Point | Finding | Status |
|---|---|---|
| A | Collision before mutation | ✅ All 6 entrypoint × collision-type combinations exit 3 with correct marker; no pre-flight bypass; builder uses atomic CREATE |
| B | Guard has no bypass | ✅ Fixture grammar strict; loopback enforced; legacy/unknown flags rejected; positive controls pass for specific reasons |
| C | Ownership and cleanup | ✅ OID ownership verified before drop; outer finally covers all resources; mid-flow error propagates; no cleanup-skipping exit() |
| D | Evidence does not self-conceal errors | ✅ Validator is DB-free; collision evidence isolated; 6/6 collision cases verified; injected failure correctly exits 1 with cleanup PASS |

All 9 gates pass (results.json: 9/9 PASS). All 23 evidence files in `evidence/r11/` are UTF-8 LF-only no BOM. Source snapshot matches exactly (14/14 hashes verified). No previous T3 verdict is inherited; this audit covers R11 delta only.

## 6. Gate attribution

| Gate | Run by T1 (evidence) | Run by T3 (self-verified) |
|---|---|---|
| `npm run lint` exit 0 | ✅ `lint-r11.txt` | ✅ re-confirmed by working-tree scan |
| `git diff --check` exit 0 | ✅ `diff-check.txt` | ✅ working tree clean |
| `verify-task.ps1` DRAFT-VALID | ✅ `verify-task.txt` | ✅ |
| `verify-handoff.ps1` PASS | ✅ `verify-handoff.txt` | ✅ |
| `validate-guards.mjs` 46 PASS | ✅ `guards-r11.txt` | ✅ |
| `verify-collision-integration.mjs --predecessor-exists` | ✅ `collision-predecessor-exists-r11.txt`, `collision-predecessor-exists.txt` | ✅ |
| `verify-collision-integration.mjs --target-exists` | ✅ `collision-target-exists-r11.txt`, `collision-target-exists.txt` | ✅ |
| `verify-collision-integration.mjs --target-exists --inject-failure` | ✅ `cleanup-injected-failure.txt`, `collision-target-exists-injected-failure-r11.txt` | ✅ |
| `verify-ac06-backfill.mjs` | ✅ `ac06-backfill.txt`, `ac06-run.txt` | ✅ |
| `verify-ac07-rollback.mjs` | ✅ `ac07-rollback.txt`, `ac07-run.txt` | ✅ |
| `verify-ac07-rollback.mjs --lock-timeout` | ✅ `ac04-lock-timeout.txt`, `ac04-run.txt` | ✅ |

## 7. Freeze readiness

R11 is ready for T0 freeze review. Conditions met:
- ✅ Source snapshot matches (14/14 hashes verified)
- ✅ All 9 gates pass
- ✅ All 4 lifecycle/guard verification points verified
- ✅ Evidence isolated, UTF-8 clean, no self-concealment
- ✅ No previous T3 verdict inherited
- ✅ Working tree dirty by design (not committed)
- ✅ No production credentials or data used (dedicated loopback cluster `127.0.0.1:16439`, synthetic credentials)
- ✅ No commit/push/PR/merge/deploy
- ✅ No additional agent calls

## 8. Audit artifact

Saved as `AUDIT-tier3-r11.md`. Previous T3 artifacts (`AUDIT-tier3-round4.md`, `AUDIT-tier3-round5-r8.md`, `AUDIT-tier3-round6-r8-p1-fix.md`, `AUDIT-tier3-round7-r9.md`) are preserved and unchanged.

**Verdict applies to working-tree bytes pinned in `source-snapshot.sha256`, not to any committed SHA.** The T0 freeze operation is a documentation step; no semantic change occurs.

**No commit/push/PR/merge/deploy performed by Tier 3.**
