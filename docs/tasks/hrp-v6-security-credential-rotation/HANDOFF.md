# HANDOFF: hrp-v6-security-credential-rotation

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-security-credential-rotation` |
| Work type | `INFRA` |
| Assurance lane | `CRITICAL` |
| Audit mode (Tier 3 đọc) | `INFRA_AUDIT` |
| Spec version | `v1.2` |
| Execution round | `1` |
| Current audit round | `0` — chưa có canonical `AUDIT.md` trên current HEAD |
| Executor | Tier 2 cho repo hygiene/runbook/HANDOFF; Owner/OP cho production rotation; Tier 3 independent cho fingerprint/history audit |
| Baseline | `main @ d3ca054`; implementation commits `4a56122` và `121e796` đều thuộc ancestry hiện tại |
| Status | `BLOCKED` — STEP-04 static verify xong; thiếu Owner/OP AC-06 và canonical Tier 3 audit; AC-09/10 contract/tree mismatch |
| Updated | `2026-09-08` |

## 1. Outcome Summary

Tier 2 không lặp STEP-01..03 vì implementation và artifact commits đã có trong ancestry. Retry này:

- re-run TASK gate v1.2: PASS;
- static-verify helper script: syntax PASS, untracked + ignored, 0 embedded database URL scheme, canonical `DATABASE_URL`, fail-closed throw;
- verify và redact runbook STEP-04: đủ incident timeline, state machine, smoke matrix, rollback và masked evidence format; 0 sensitive-pattern match;
- không chạy DB/Neon/Vercel/secret store, không đọc `.env*`, không commit/push/merge/deploy;
- chuyển STEP-07 sang Tier 3 context độc lập; Tier 2 không viết `AUDIT.md` và không phát hành verdict;
- redact các legacy evidence/template đã lưu credential/endpoint hoặc phép đo hỏng; các bản thay thế chỉ giữ safe summary và blocker thực tế;
- giữ closure ở `BLOCKED` vì Owner/OP evidence chưa có trên current HEAD và bốn-canary premise của AC-09/10 không đúng cây hiện tại.

## 2. Execution Trace

| STEP | Action | Result | Evidence |
|---|---|---|---|
| `STEP-01` | Xác nhận `check_rls.cjs` không tracked và được ignore | CARRY FORWARD PASS | `4a56122`; phép đo retry trong §4 |
| `STEP-02` | Xác nhận script không chứa embedded DB URL, dùng `process.env.DATABASE_URL`, có fail-closed throw, syntax hợp lệ | CARRY FORWARD PASS | `4a56122`; phép đo retry trong §4 |
| `STEP-03` | Xác nhận implementation/artifact commits thuộc ancestry current HEAD; không tạo commit mới | CARRY FORWARD PASS | `4a56122`, `121e796` |
| `STEP-04` | Tabletop/static verify và redact runbook | PASS WITH BLOCKERS | `evidence/ac08-runbook.txt` |
| `STEP-05` | Owner/OP rotate, deploy, smoke | BLOCKED — không có canonical Owner evidence | Expected masked Owner artifact per TASK v1.2; path chưa tồn tại |
| `STEP-06` | Owner/OP revoke và negative/positive probes | BLOCKED — không có canonical Owner evidence | Expected masked Owner artifact per TASK v1.2; path chưa tồn tại |
| `STEP-07` | Tier 3 fingerprint/history audit độc lập | FAIL + BLOCKED — audit report xác nhận canonical HEAD còn secret-bearing artifacts, thiếu safe exact-fingerprint input và canonical `AUDIT.md` | Independent read-only report; `AE-01..AE-10` |
| `STEP-08` | Canonical HANDOFF closure | BLOCKED | tài liệu này |

## 3. Acceptance Evidence

| AC | Evidence | Result | Limitation |
|---|---|---|
| — | `powershell -NoProfile -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath <TASK> -RepoRoot <root>` | RESULT: PASS (exit 0) | `E-01` |
| `AC-01` | `E-03` | PASS — `git ls-files -- check_rls.cjs` rỗng | None |
| `AC-02` | `E-03` | BLOCKED CONTRACT MISMATCH — ignore check pass nhưng rule là exact-name, không phải root-only | `BLK-04` |
| `AC-03` | `E-03` | PASS — embedded postgres scheme count = 0 | None |
| `AC-04` | `E-03` | PASS — env refs = 2; throw token = 1; syntax exit 0 | None |
| `AC-05` | `E-02`; `git log -1 --format=%B -- .gitignore` | PASS CARRY FORWARD — exit 0; message traces task; scoped implementation commit belongs to ancestry | None |
| `AC-06` | `E-06`; `AE-03` | BLOCKED OWNER — không có canonical rotation/smoke/revoke evidence path | `BLK-01` |
| `AC-07` | `AE-02`, `AE-03`, `AE-06` | BLOCKED — thiếu safe exact-fingerprint input; canonical HEAD vẫn có secret-bearing artifacts | `BLK-02`, `BLK-05` |
| `AC-08` | `E-04`, `AE-02` | PASS trong redacted worktree; FAIL trên canonical HEAD chưa land redaction | `BLK-05` |
| `AC-09` | `E-05`; `AE-07` | FAIL CONTRACT/TREE — counts `2,0,2,missing` | `BLK-03` |
| `AC-10` | `E-05`; `AE-07` | BLOCKED — named canary/config premise is stale | `BLK-03` |
| `AC-11` | `AE-02` | FAIL trên canonical HEAD — Tier 3 count-only scan thấy 40 credential-token occurrences trong 10 tracked artifacts | `BLK-05` |
| `AC-12` | `AE-06` | PARTIAL — generic predecessor scan có 0 candidates; exact fingerprint chưa đo an toàn và contract method không hợp lệ | `BLK-02` |
| `AC-13` | not run because prerequisites are blocked | BLOCKED / NOT RUN | `BLK-01..05` |

## 4. Changed Deliverables

### Evidence Registry

| ID | Command/check | Exit | Sanitized output | Maps |
|---|---|---:|---|---|
| `E-01` | `powershell -NoProfile -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath <TASK> -RepoRoot <root>` | 0 | TASK gate PASS; CRITICAL lane; 10 RQ traceable; no plaintext secret flagged | preflight |
| `E-02` | ancestry checks for `4a56122`, `121e796`, `314ecef` | 0/0/1 | implementation + artifacts canonical; side-branch closure not ancestor | STEP-01..03, STEP-08 |
| `E-03` | `node --check check_rls.cjs`; path-only/static counts | 0 | syntax 0; tracked=false; ignored=true; embedded scheme=0; env refs=2; throw=1 | AC-01,03,04 |
| `E-04` | Runbook required-token checks + sensitive-pattern scan | 0 | all five required areas present; 0 sensitive-pattern matches | AC-08 |
| `E-05` | Four canary path/count probe | 0 | counts `2,0,2,missing` in TASK order | AC-09,10 |
| `E-06` | Owner evidence path lookup | 0 | no canonical Owner evidence paths returned | AC-06 |
| `E-07` | canonical target lookup | 0 | current HEAD has TASK/HANDOFF/runbook but no `AUDIT.md` | AC-07,12 |
| `AE-01` | Independent Tier 3 HEAD/status/index probe | 0 | target `main@d3ca054`; task index empty; redactions remain worktree-only | STEP-07 |
| `AE-02` | Independent count-only scan of canonical HEAD artifacts | 0 | 40 credential-token occurrences across 10 tracked artifacts; no matched values emitted | AC-07,08,11 |
| `AE-03` | Required closure artifact lookup | 0 | `ac06-rotation.txt`, `ac07-fingerprint.txt`, `ac12-history.txt`, and canonical `AUDIT.md` absent | AC-06,07,12 |
| `AE-06` | Safe generic predecessor-blob scan | 0 | five predecessors returned zero generic candidates; not exact-fingerprint proof | AC-12 |
| `AE-07` | Independent path-only canary probe | 0 | counts `2,0,2,missing` | AC-09,10 |
| `AE-08` | Independent `verify-task` rerun | 0 | mechanical RESULT PASS; semantic contract defects remain | preflight |
| `AE-09` | Independent `verify-handoff` rerun | 0 | worktree PASS WITH WARNINGS; not proof canonical HEAD is remediated | STEP-08 |
| `AE-10` | `verify-audit` | NOT RUN | canonical `AUDIT.md` absent; no Tier 2 or report-only substitute | STEP-07 |

### Changed paths

| Path | Change | Purpose |
|---|---|---|
| `docs/runbooks/credential-rotation-incident.md` | Updated | Remove reusable credential/endpoint literals and stale expired-window instructions; preserve safe operational sequence |
| `docs/tasks/hrp-v6-security-credential-rotation/evidence/ac08-runbook.txt` | Added | STEP-04 static/tabletop evidence |
| `docs/tasks/hrp-v6-security-credential-rotation/evidence/sec-s01-baseline.txt` | Redacted | Remove credential-bearing historical source while retaining safe provenance |
| `docs/tasks/hrp-v6-security-credential-rotation/evidence/sec-s02-sanitize.txt` | Redacted | Replace source-body transcript with current safe measurements |
| `docs/tasks/hrp-v6-security-credential-rotation/evidence/sec-s03-gitignore.txt` | Corrected | Replace legacy AC-02 PASS claim with current contract mismatch |
| `docs/tasks/hrp-v6-security-credential-rotation/evidence/sec-s06-post-verify.txt` | Redacted | Remove sensitive references and unsupported history conclusions |
| `docs/tasks/hrp-v6-security-credential-rotation/evidence/sec-ac09-canary.txt` | Corrected | Record current `2,0,2,missing` canary outcome |
| `docs/tasks/hrp-v6-security-credential-rotation/evidence/sec-gate-task.txt` | Refreshed | Record current TASK v1.2 gate PASS safely |
| `docs/tasks/hrp-v6-security-credential-rotation/evidence/sec-gate-audit.txt` | Refreshed | Record canonical AUDIT absence without a Tier 2 verdict |
| `docs/tasks/hrp-v6-security-credential-rotation/evidence/op-prep-*.md` | Redacted/updated | Remove stale identifiers/windows and retain masked Owner-only templates |
| `docs/tasks/hrp-v6-security-credential-rotation/HANDOFF.md` | Updated | Canonical v1.2 retry status and blocker closure |

## 5. Deviations

| ID | Type | Detail | Required owner |
|---|---|---|---|
| `BLK-01` | OWNER/OP | AC-06 lacks masked production rotation/deploy/smoke/revoke evidence | Owner/OP |
| `BLK-02` | CONTRACT/TIER 3 | RQ-06/AC-07 lacks safe exact-fingerprint input; AC-12 method is not a valid Git-blob scan; canonical `AUDIT.md` absent | Tier 1 contract bump + independent Tier 3 |
| `BLK-03` | CONTRACT/TREE | AC-09/10 names four canary paths, but current tree only has sentinel in two paths and one named config is absent | Tier 1 |
| `BLK-04` | CONTRACT/IMPLEMENTATION | AC-02 requires root-only `/check_rls.cjs`; landed ignore rule is `check_rls.cjs` | Tier 1 decision; Tier 2 must not silently reinterpret completed STEP-01 |
| `BLK-05` | CANONICAL SECURITY | Independent Tier 3 count-only scan found 40 credential-token occurrences in 10 artifacts on current HEAD; worktree redaction is not canonical until safely reviewed and landed by an authorized tier | Tier 1 + authorized canonical commit; Owner containment if any exposed credential may remain active |
| `LIM-01` | ROLE BOUNDARY | Tier 2 cannot validate the credential against Neon or derive a known-secret fingerprint | Owner/OP + Tier 3 |

## 6. Evidence Index

| Evidence | Artifact / summary |
|---|---|
| `E-01` | TASK gate | `powershell -NoProfile -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath <TASK> -RepoRoot <root>` exit 0, RESULT PASS |
| `E-02` | Git ancestry | `git merge-base --is-ancestor <sha> HEAD` results `0,0,1` for implementation, artifacts, side closure |
| `E-03` | Helper script | `node --check check_rls.cjs` exit 0; path/token probe measured `tracked=0`, `ignored=1`, `scheme=0`, `env=2`, `throw=1` |
| `E-04` | Runbook | `Select-String` required-token/sensitive-pattern probe exit 0; artifact `evidence/ac08-runbook.txt` |
| `E-05` | Canary | `Select-String BLOCKED_DB_URL` path probe exit 0, counts `2,0,2,missing` |
| `E-06` | Owner evidence | `git ls-files -- <owner-evidence-paths>` exit 0, output empty |
| `E-07` | Audit artifact | `Test-Path <task>/AUDIT.md` measured false |
| `AE-01..10` | Independent Tier 3 report | Read-only deep audit anchored at `main@d3ca054`; verdict FAIL, closure BLOCKED; count/path-only output preserved in §4 without sensitive values |

## 7. Execution Round History

| Round | Spec | Outcome | Evidence / next input |
|---:|---|---|---|
| 1 | `v1.2` | `BLOCKED` | STEP-04 worktree redaction verified; independent STEP-07 verdict FAIL because canonical HEAD remains unsafe and Owner/contract inputs are absent |

### Inputs required for continuation

1. Owner/OP publishes masked `AC-06` evidence only: state transitions, role/target fingerprints, posture, UTC timestamps, smoke result, old-credential negative probe and new-credential positive probe. No secret, DSN, endpoint, cookie, token or environment value. Owner must treat any credential exposed in canonical history as compromised if it may remain active.
2. Tier 1 bumps/reconciles AC-02 and AC-09/10 against the current tree; replaces AC-11 with a real credential-token/URI scanner; replaces AC-12 with a valid Git-blob scan; and provides Tier 3 a non-reversible matcher for RQ-06/AC-07.
3. An authorized tier safely lands the reviewed redactions on canonical `main`; zero-candidate count-only scans must pass on HEAD/index/worktree. Tier 2 does not commit or push this work.
4. Independent Tier 3 reruns STEP-07 under the reconciled contract, writes canonical `AUDIT.md`, and runs `verify-audit`; the report-only FAIL from this round is not a canonical audit artifact.
5. A later Tier 2 round may finish STEP-08 only after Owner evidence, contract reconciliation, canonical redaction, AC-13 validation, and canonical Tier 3 audit all exist.

## 8. Final State

`BLOCKED` — STEP-04 is redacted and statically verified only in the current worktree. Independent STEP-07 returned `FAIL`: canonical HEAD still has secret-bearing artifacts, Owner evidence is absent, and the fingerprint/history plus canary contract is not safely executable as written. STEP-08 cannot close.

Không commit, push, merge, deploy, DB/Neon connection hoặc `.env*` read được thực hiện trong retry này.

Handoff status: BLOCKED
