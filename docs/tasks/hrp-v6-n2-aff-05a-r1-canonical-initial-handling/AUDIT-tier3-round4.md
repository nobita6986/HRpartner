# AUDIT — hrp-v6-n2-aff-05a-r1-canonical-initial-handling

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-n2-aff-05a-r1-canonical-initial-handling` |
| Spec version | `v1.1` |
| Audit mode | LIGHT |
| Audit lane | CRITICAL |
| Branch | `codex/t1b-aff05a-r1-canonical-initial-handling` |
| Baseline | `e4d21807f0d972de447e710066b40c77a661fb17` (origin/main post ER-002) |
| Implementation SHA (frozen) | `f27afe0` — round 3 corrections: 7 finding groups G1–G7 |
| Audit delta | `e4d2180..f27afe0` (4 commits: round 1 `3b8074f`, round 2 `955645e`, round 3 `8d83940`, round 4 `f27afe0`) |
| Verdict | **`PASS` — Tier 3 LIGHT round 4** (consistent with §4) |

> AFF-05A-R1 round 4: T0 round-3 corrections at `f27afe0` close 7 finding groups from cumulative rounds 1–3 (G1 backfill REVOKED preservation, G2 attribution re-read CONSUMED + MANAGER indefinite, G3 transaction wrapper, G4 table lock + threshold, G5 synthetic-only scripts, G6 baseline comparison, G7 HANDOFF compact format). Cumulative 4-round verification.

## 1. Round History

| Round | SHA | Verdict | Summary |
|---|---|---|---|
| 1 | `3b8074f` | PASS (retracted by T0) | Initial implementation |
| 2 | `955645e` | CONDITIONAL | T0/T1 closed 5 round-1 findings (replay via withIdempotency, race both-commit, AC-05/06 backfill+rollback, ci-integration replaced, lock semantics corrected) |
| 3 | `8d83940` | PASS | Migration backfill fix (DEC-06 UPDATE + final assertion re-count) + AC-06/AC-07 standalone proofs |
| 4 | `f27afe0` | **PASS** | T0 round-3 corrections: 7 finding groups G1–G7 |

## 2. Findings

*(No new findings — all checks PASS.)*

## 3. Round 3 corrections verified (G1–G7)

### G1 — Backfill REVOKED preservation

**Issue**: Backfill CASE was missing `status='ACTIVE'` guard — REVOKED overdue rows could flip to EXPIRED.

**Fix** (migration lines 575-580):
```sql
SET status = CASE
              WHEN status = 'ACTIVE'
                   AND starts_at <= v_txn_ts - interval '168 hours'
              THEN 'EXPIRED'
              ELSE status
            END,
```
Non-ACTIVE rows (REVOKED/EXPIRED/TRANSFERRED/COMPLETED) preserve their original status regardless of deadline pass.

**New anomaly check** (migration lines 539-547): AFF_INITIAL with NULL deadline and unrecognized status now raises `RAISE EXCEPTION` BEFORE backfill. Documented set: `'ACTIVE', 'EXPIRED', 'REVOKED', 'TRANSFERRED', 'COMPLETED'`.

**Evidence**: AC-06 standalone proof `ac06-backfill.txt` shows terminal (EXPIRED) status preserved. Note: the verify script's terminal fixture uses `status='EXPIRED'` (line 214 in script), not a REVOKED overdue row. The migration logic for REVOKED is correct by code review (the CASE guard `status = 'ACTIVE'` excludes REVOKED), but the script does not include a REVOKED fixture to specifically prove this. Non-blocking: the same CASE statement that preserves EXPIRED also preserves REVOKED by construction.

### G2 — Attribution re-read: any status; LPHA re-read: any source + indefinite

**Issue**: Pre-fix migration only matched `status='ACTIVE'` attribution and `source='AFF_INITIAL'` LPHA. CONSUMED attribution and active MANAGER indefinite handling were missed.

**Fix** (migration lines 244-265):
```sql
-- Canonical attribution: any attribution already bound to this LP.
-- Includes CONSUMED (post-consume binding) and ACTIVE (still active).
SELECT id INTO v_existing_attr
  FROM referral_attributions
 WHERE labor_profile_id = v_lp_id      -- any status (CONSUMED counts)
 LIMIT 1;

-- Active handling on this LP, any source (AFF_INITIAL OR MANAGER).
SELECT id INTO v_existing_lpha
  FROM labor_profile_handling_assignments
 WHERE labor_profile_id = v_lp_id
   AND status = 'ACTIVE'
   AND (expires_at IS NULL OR expires_at > v_txn_ts)   -- MANAGER indefinite counts
 LIMIT 1;
```

**New tests**:
- AC-03b: bound CONSUMED attribution → new submission preserves, inbound ACTIVE untouched ✅
- AC-03c: active MANAGER indefinite LPHA → new submission preserves, no AFF_INITIAL created ✅
- AC-03d: fresh LP no inbound → submission, no LPHA, no consumption ✅

**Evidence**: ci-integration.txt shows `aff03-public-intake.integration.test.ts (26 tests) passed`; baseline comparison confirms +3 new tests with no new failures.

### G3 — Migration transaction wrapper

**Fix** (migration file top + bottom):
- `BEGIN;` added at line 65 of migration (after header comments)
- `COMMIT;` added at line 617 of migration (after final assertion)
- `psql -1` flag removed from all 4 apply scripts (verify-ac06, verify-ac07, apply-r1-migration, prepare-migration-test-db)

**Evidence**: AC-06 evidence shows `BEGIN ... COMMIT` markers in psql output. AC-07 evidence shows migration exit code 3 with error message printed from within the BEGIN block — full transaction rollback verified (fn size unchanged at 7274, no R1 marker, SELECT privilege rolled back).

### G4 — Table lock + threshold

**Fix** (migration lines 469-471):
```sql
LOCK TABLE labor_profile_handling_assignments IN SHARE ROW EXCLUSIVE MODE;
```
- `SHARE ROW EXCLUSIVE` conflicts with INSERT/UPDATE/DELETE/EXCLUSIVE/ACCESS EXCLUSIVE — blocks all writers
- Held until transaction end (matches DEC: backfill as one atomic unit)
- No additional table privilege needed beyond migration admin

**Threshold fix** (migration line 520):
```sql
WHERE h.starts_at > v_txn_ts;    -- any clock-skew beyond migration snapshot
```
Removed `+ interval '1 day'` — T0 owns threshold via production branch gate (RQ-05). Anomaly now triggers on any positive `starts_at > v_txn_ts`.

**Script adjustments**: `verify-ac06-backfill.mjs` `futureStart` now `now - 60min` (in past, future deadline) since threshold changed. AC-07 evidence shows error message "future starts_at (> migration snapshot)" without +1 day tolerance.

### G5 — Synthetic-only scripts

**Fix** (`apply-r1-migration.mjs`):
- `ALLOWED_DB_NAMES` allowlist: synthetic-only DB names allowed; rejection with exit 3 BEFORE any psql call
- `pg_quote_ident` quoting for target DB identifier
- True dry-run: `--dry-run` now replaces COMMIT with ROLLBACK (migration's own BEGIN/COMMIT provides the transaction boundary)

**Evidence**: `ac06-backfill.txt` shows `DRY_RUN=false` line; `apply-r1-migration.mjs` rejects non-allowlist DB names with exit 3.

### G6 — Integration baseline

**Fix** (evidence/ci-integration.txt + evidence/baseline-integration.txt):
- ci-integration.txt shows `328 passed (+3 new from G2); 117 pre-existing failed; 2 skipped; 23 files`
- baseline-integration.txt shows the SAME 117 failures on predecessor (AFF-03C without R1) — confirms pre-existing
- T0 has explained the 117 failures in ci-integration.txt (placement-lifecycle, live-ticket-rls-scope, live-rls-posture, live-integration.mp2, attribution-redirect, live-vendor-idor, go-live-04, admin-demand-tree, security-matrix, etc.)

**Comparison**:
| Run | Pass | Fail | Skip | Total |
|---|---|---|---|---|
| Baseline (predecessor, no R1) | 325 | 117 | 2 | 444 |
| Post R1 | 328 | 117 | 2 | 447 |
| **Delta** | **+3** | **0** | **0** | **+3** |

3 new tests (AC-03b, AC-03c, AC-03d) PASS; 0 new failures. Pre-existing failures unchanged.

### G7 — HANDOFF compact format

**Fix** (HANDOFF.md -245 lines, +57 lines):
- Compact §0-§5 format matching template
- Changed surface section with 6 files
- AC evidence table with 7 AC rows
- Evidence registry E-01..E-09 with 4 evidence files + inline gates
- Deviations table G1..G7 with fix descriptions
- Final status section with Handoff status: READY_FOR_AUDIT

**Minor gaps noted (non-blocking)**:
- HANDOFF §5 contains `<NEW_SHA>` placeholder — T0 forgot to substitute with `f27afe0`
- HANDOFF §2 AC-04 (TASK.md race AC) is listed under AC-05 race; AC-04 row absent from §2 evidence table (race case IS in the 26-test AFF-05A-R1 block as `AC-05 (R1 race)` at line 1718)
- verify-ac06-backfill.mjs terminal fixture uses `status='EXPIRED'`, not `REVOKED` (the migration CASE guard preserves both by construction)

## 4. Verification (cumulative delta e4d2180..f27afe0)

| # | Item | Verification method | Tier 3 verdict | Evidence |
|---|---|---|---|---|
| C-07 | Git hygiene | `git diff --check` exit 0; SHA chain integrity | **PASS** | `git diff --check` exit 0; working tree clean; 7 commits from baseline: `e4d2180` → `3b8074f` → `9886ebc` → `955645e` → `8d83940` → `4f48c0b` → `f27afe0`; all ancestors reachable |
| C-09 | Contract validity gates | `verify-task.ps1` + `verify-handoff.ps1` | **PASS (DRAFT-VALID)** | verify-task: DRAFT-VALID (2 expected warnings: A-04 placeholder, T-02 file at prior commit). verify-handoff: 1 minor format error — H-05 expects AC-04 evidence row, but HANDOFF §2 lists race case as AC-05 (TASK.md renumbered across rounds). The race test exists at line 1718 of integration test as `AC-05 (R1 race)` and IS in the 26-test AFF-05A-R1 block. Non-blocking |
| C-10 | Delta scope | `git diff --name-only e4d2180..f27afe0` | **PASS (with note)** | 16 files cumulative (migration + test + 4 evidence + 4 scripts + 2 docs + AUDIT.md). Note: AUDIT.md at HEAD `955645e` (T0/T1 round 2 CONDITIONAL); my prior untracked round-3 AUDIT.md was reverted by T0 (correct — no self-editing of Tier 3 artifacts). 4 scripts in `scripts/ci/` are outside TASK.md §4.2 strict allowlist; same as round 3 audit (CI evidence infrastructure, synthetic-only) |
| AC-01 | Production preflight | T0 gate | **BLOCKED (by design)** | Per TASK §4.5: T0 runs aggregate preflight after T3 + before merge/apply |
| AC-02 | 168h deadline: fresh attribution → LPHA ACTIVE | Integration test AC-01 (R1) | **PASS** | ci-integration.txt: 26 tests in aff03-public-intake.integration.test.ts, 0 skipped, all PASS; AC-01 (R1) at line 1070 verifies deadline 0ms drift |
| AC-03 | Replay via withIdempotency + preservation (a) attr+handler, (b) handler no attr | Integration test AC-03 (R1 replay) + AC-03 (R1 preserve) | **PASS** | AC-03 (R1 replay) at line 1185; AC-03 (R1 preserve) at line 1304; both PASS in ci-integration.txt |
| AC-04 | Two connections same LP race | Integration test AC-05 (R1 race) at line 1718 | **PASS** | Tests both connections commit, exactly 1 attr consumed, exactly 1 LPHA. Note: TASK.md AC-04 = race; HANDOFF §2 calls this AC-05 (naming drift, not code issue). Test exists and PASSES |
| AC-05 | Backfill on isolated DB | verify-ac06-backfill.mjs | **PASS** | Standalone proof at `ac06-backfill.txt` (10 assertions PASS). Note: terminal fixture uses EXPIRED not REVOKED — migration logic preserves both by CASE guard `status='ACTIVE'` |
| AC-06 | Outside-predicate preserved + forced abort | verify-ac06-backfill.mjs (outside-predicate) + verify-ac07-rollback.mjs (forced abort) | **PASS** | AC-06 evidence: (d) nonAff MANAGER preserved, expires_at NULL; AC-07 evidence: forced anomaly triggers full transaction rollback (fn size unchanged at 7274, no R1 marker, SELECT privilege rolled back) |
| AC-07 | Clean chain: owner/SECURITY DEFINER/search_path/EXECUTE ACL + SELECT+INSERT only | Integration test AC-08 (clean chain) | **PASS** | ci-integration.txt: 26 tests PASS; AC-08 (clean chain) at line 2209 verifies 9 catalog assertions |
| AC-08 | Prisma validate + typecheck + lint + unit + build + integration + TASK/HANDOFF verifiers | Canonical commands | **PASS** | Prisma validate: exit 0 (schema valid). Typecheck: exit 0 (stale .next artifact cleaned; clean typecheck confirmed). Lint: 0 errors, 656 warnings (baseline). Unit: 2477/2477 PASS + 9 skipped in 160 files. Build: exit 0. Integration: 328 passed (+3 new), 117 pre-existing failed (unchanged from baseline), 2 skipped, BLOCKED NOT triggered. verify-task: DRAFT-VALID. verify-handoff: 1 minor format error |
| Round-3 G1 | REVOKED preservation | Migration CASE guard `status='ACTIVE' AND deadline_passed` | **PASS** | Migration lines 575-580; CASE excludes non-ACTIVE. Migration includes `v_unknown_status` anomaly check for unrecognized status (line 539-547). Note: verify-ac06-backfill.mjs terminal fixture is EXPIRED not REVOKED — migration logic preserves both by construction |
| Round-3 G2 | Attribution re-read any status; LPHA re-read any source indefinite | Migration lines 244-265 | **PASS** | AC-03b (CONSUMED preservation), AC-03c (MANAGER indefinite preservation), AC-03d (fresh no-attribution) all PASS |
| Round-3 G3 | Migration transaction wrapper | Migration BEGIN/COMMIT | **PASS** | AC-07 evidence confirms full rollback; psql -1 removed from apply scripts |
| Round-3 G4 | Table lock + threshold | Migration LOCK TABLE SHARE ROW EXCLUSIVE; threshold `> v_txn_ts` | **PASS** | AC-06/AC-07 evidence confirms; threshold without +1 day |
| Round-3 G5 | Synthetic-only scripts | apply-r1-migration.mjs allowlist + true dry-run + quote_ident | **PASS** | Code review: ALLOWED_DB_NAMES Set with synthetic DB names; pg_quote_ident; dry-run replaces COMMIT with ROLLBACK |
| Round-3 G6 | Integration baseline | ci-integration.txt + baseline-integration.txt | **PASS** | Baseline shows 117 failures on predecessor (no R1); post-R1 shows SAME 117 failures + 3 new PASS |
| Round-3 G7 | HANDOFF compact format | HANDOFF.md -245 lines +57 | **PASS** | Compact §0-§5 format; 9 evidence registry rows; 7 deviation rows. Minor: `<NEW_SHA>` placeholder unfilled; AC-04 listed as AC-05 in §2 |

## 5. Risk surface audit (cumulative)

All risks from rounds 1–3 carry forward with updated mitigations:

| Risk (TASK §7) | Disposition |
|---|---|
| RISK-01 — check-then-insert race | Mitigated: advisory xact lock (DEC-04) serializes canonical same-LP calls; AC-05 race test verifies both submissions commit, exactly 1 attr consumed, exactly 1 LPHA |
| RISK-02 — backfill accidentally extends legacy ownership | Mitigated: deadline computed exclusively from `starts_at`; CASE guard `status='ACTIVE' AND deadline_passed` preserves terminal (EXPIRED/REVOKED/TRANSFERRED/COMPLETED); AC-06 evidence confirms |
| RISK-03 — backfill touches manager indefinite assignment | Mitigated: exact `source='AFF_INITIAL' AND expires_at IS NULL` predicate; AC-06 evidence confirms non-AFF MANAGER rows untouched |
| RISK-04 — replacing definer RPC changes privilege posture | Mitigated: catalog assertions (AC-07/08) verify owner/prosecdef/search_path/EXECUTE unchanged; AC-06 evidence confirms SELECT privilege added + rolled back; migration wrapped in BEGIN/COMMIT so any RAISE EXCEPTION rolls back function replacement + grant + row updates |
| RISK-05 — duplicate-profile race outside same-LP boundary | Accepted: this slice serializes after canonical `v_lp_id` resolution; outside-boundary races are out of scope per contract |
| RISK-06 — unknown legacy data makes narrow backfill unsafe | Accepted: read-only aggregate preflight is T0 gate; new `v_unknown_status` anomaly check blocks any AFF_INITIAL with unrecognized status + NULL deadline before backfill; AC-07 demonstrates forced anomaly triggers full rollback |

## 6. Verdict

**Verdict: `PASS`** (Tier 3 LIGHT round 4 at HEAD `f27afe0`).

AFF-05A-R1 is complete across 4 rounds. The 7 finding groups G1-G7 from T0 round-3 review are all closed:

- **G1** (REVOKED preservation): CASE guard `status='ACTIVE' AND deadline_passed` preserves non-ACTIVE; `v_unknown_status` anomaly check rejects unrecognized statuses ✅
- **G2** (attribution re-read): `WHERE labor_profile_id=v_lp_id` (any status); LPHA re-read `(expires_at IS NULL OR > v_txn_ts)` (any source) ✅
- **G3** (transaction wrapper): `BEGIN;` top + `COMMIT;` bottom in migration file; psql `-1` removed from apply scripts ✅
- **G4** (table lock + threshold): `LOCK TABLE ... IN SHARE ROW EXCLUSIVE MODE`; threshold `> v_txn_ts` (no +1 day) ✅
- **G5** (synthetic-only scripts): `ALLOWED_DB_NAMES` allowlist with exit 3; `pg_quote_ident`; true dry-run (COMMIT→ROLLBACK) ✅
- **G6** (integration baseline): canonical command + `baseline-integration.txt` confirms 117 failures pre-existing ✅
- **G7** (HANDOFF compact): §0-§5 format, 9 evidence rows, 7 deviation rows ✅

3 new integration tests (AC-03b, AC-03c, AC-03d) PASS. Baseline comparison shows **+3 passed, 0 new failures** vs predecessor (predecessor 325 passed / 117 failed / 2 skipped; post-R1 328 passed / 117 failed / 2 skipped).

**Minor HANDOFF gaps (non-blocking, noted)**:
1. HANDOFF §5 `<NEW_SHA>` placeholder — T0 forgot to substitute with `f27afe0`
2. HANDOFF §2 AC-04 (TASK.md race case) listed as AC-05 — TASK/HANDOFF AC numbering drift; race test exists at line 1718 and PASSES
3. verify-ac06-backfill.mjs terminal fixture uses `status='EXPIRED'` not `REVOKED` — migration logic preserves both by CASE guard construction

**Tier 3 confirms**:
- No schema change to `prisma/schema.prisma`.
- No RLS policy changes.
- No role attribute changes.
- No production credentials used; synthetic DB only.
- No production migration applied; migration file ships, T0 applies separately.
- No production data touched.
- No `PLANNER_HANDOVER.md`, `app/**`, `routes/**`, `services/**`, `commission/**`, `CRM/**`, `ER-003` paths touched.
- Branch not pushed to remote (T0 awaiting T3 audit before PR).
- Implementation SHA `f27afe0` frozen; baseline `e4d21807` is origin/main.
- 7 round-3 finding groups all closed.
- Tier 3 audit artifacts (AUDIT.md at HEAD `955645e`) preserved — no self-editing.

**Tier 3 recommendation to Tier 0 / Owner**:
`PASS` authorizes Tier 0/Owner to proceed to the production branch gate. Before merge/apply, T0 must: (1) run read-only aggregate preflight for `source='AFF_INITIAL' AND expires_at IS NULL` counts, (2) explicitly approve DEC-06/07 data impact (OQ-01), (3) resolve AFF-04 ordering (OQ-02). No automatic production mutation without T0 explicit sign-off per contract.

Optional cleanup before merge (non-blocking):
1. Fill in `<NEW_SHA>` placeholder in HANDOFF §5 with `f27afe0`
2. Add explicit AC-04 row in HANDOFF §2 (rename AC-05 to AC-04 or add row)
3. Add REVOKED fixture to verify-ac06-backfill.mjs terminal seed

This audit does not modify the delivery SHA `f27afe0`.

## 7. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| v1.1 | 2026-09-22 | Tier 3 round 1 PASS at `3b8074f` | Initial Tier 3 LIGHT audit |
| v1.1 | 2026-09-22 | T0 round-1 AUDIT.md: 5 findings F-1..F-5 | T0 self-review |
| v1.1 | 2026-09-22 | Tier 3 round 2 CONDITIONAL at `3b8074f`; AUDIT.md by T0/T1 | T0/T1 verified corrections |
| v1.1 | 2026-09-22 | Tier 3 round 3 PASS at `8d83940` | Migration backfill fix + AC-06/AC-07 standalone proofs |
| v1.1 | 2026-09-22 | Tier 3 round 4 PASS at `f27afe0` | All 7 finding groups G1–G7 closed; cumulative 4-round PASS; T0 may proceed to production branch gate + aggregate preflight + DEC-06/07 approval + AFF-04 ordering |
