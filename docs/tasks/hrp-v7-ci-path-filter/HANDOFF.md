# HANDOFF — hrp-v7-ci-path-filter

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v7-ci-path-filter` |
| Spec version | `v1.0` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Execution round | `1` |
| Baseline | `d646b1e566616e3c40b7967413ce0ada150705b4` |
| Status | `READY_FOR_AUDIT` |

---

## 1. Outcome and changed surface

- **Delivered:**
  1. `.github/workflows/ci.yml` Integration job got a **short-circuit success path** for docs/config-only PRs: a new `Detect changed paths` step classifies changed files against a conservative allowlist (`docs/**`, `**/*.md`, `scratch/**`, `.gitignore`, `README*`, `.env.example`); if ALL files qualify → subsequent steps (`Install`, `Prisma generate`, `Integration tests`) are skipped via `if: steps.path-filter.outputs.should_run != 'false'`, and a final `Short-circuit success` step (gated `== 'false'`) prints the banner and exits 0. Job still reports `success` — branch protection satisfied.
  2. Fail-safe default = **RUN**: any file outside the SKIP allowlist flips `should_run=true` and the existing Integration test runs unchanged (preflight + `npm run test:integration` + ENV_BLOCKED semantics preserved).
  3. Quality job: untouched. Names, concurrency, fork guard, secrets block — all preserved.
- **Not delivered:** None.
- **Changed:** `.github/workflows/ci.yml` (+69/-0; pure addition to Integration job, no removal). Plus task artifacts under `docs/tasks/hrp-v7-ci-path-filter/**`.
- **Lane escalation:** None (brief mandated CRITICAL/LIGHT from the start).

---

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1 -TaskPath docs/tasks/hrp-v7-ci-path-filter/TASK.md` | `RESULT: PASS` | `None` |
| — | `verify-handoff.ps1 -TaskPath docs/tasks/hrp-v7-ci-path-filter/TASK.md` | `RESULT: PASS` | `None` |
| `AC-01` | `E-01` | ci.yml Integration job has new `Detect changed paths` step with `id: path-filter`, `shell: bash`, full case-statement allowlist + `should_run` output | `None` |
| `AC-02` | `E-02` | Quality job unchanged: all 7 steps (`Install`, `Prisma generate`, `Prisma schema validate`, `Typecheck`, `Lint`, `Unit tests`, `Build`) present and identical to baseline | `None` |
| `AC-03` | `E-03` | Job names `Quality (schema · typecheck · lint · unit · build)` and `Integration (DB tests · fail-closed)` unchanged (match exactly what branch protection pins) | `None` |
| `AC-04` | `E-04` | Concurrency group `hrpartner-dedicated-integration-db` + `cancel-in-progress: false` present | `None` |
| `AC-05` | `E-05` | Fork guard `if:` condition unchanged | `None` |
| `AC-06` | `E-06` | Path-classifier self-test: 4 fixtures (docs-only, *.md at root, .gitignore only, mixed docs+package.json) → 3 SKIP + 1 RUN, exit 0 | `None` |
| `AC-07` | `E-07` | Allowlist SKIP set and RUN set disjoint (table review in TASK Section 4 RQ-07); SKIP is a strict subset of safe surfaces, RUN is the conservative default | `None` |
| `AC-08` | `E-08` | Zero third-party action added — yaml-check confirms no `dorny/`, `tj-actions/`, no new `uses:` lines other than the existing `actions/checkout@v4` + `actions/setup-node@v4` | `None` |
| `AC-09` | `E-09` | `git diff --check HEAD` empty | `None` |
| `AC-10` | `AC-10 row above` | `verify-task.ps1` PASS | `None` |
| `AC-11` | `AC-11 row above` | `verify-handoff.ps1` PASS | `None` |
| `AC-12` | `E-12` | Diff confined to `.github/workflows/ci.yml` + `docs/tasks/hrp-v7-ci-path-filter/**`; no untracked files outside task folder | `None` |
| `AC-13` | `E-13` | Classifier self-test reproduces the docs-only PR scenario expected decision = SKIP, exit 0 | `None` |
| `AC-14` | `E-14` | **Live CI smoke test** (PR #14 against PR #13 head): Quality pass 1m51s; Integration pass 12s with `Install`/`Prisma generate`/`Integration tests` all skipped, `Short-circuit success` step ran. Branch protection's `Integration (DB tests · fail-closed)` required check reports `success` — merge unblocked for docs-only PRs. | `None` |

---

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `git diff origin/main..HEAD -- .github/workflows/ci.yml` (capture full diff) | 1 file changed, +69 lines, 0 deletions; new `Detect changed paths` step + `Short-circuit success` step inserted into Integration job; existing steps gated with `if: should_run != 'false'` | `evidence/diff-ci.yml.txt` |
| `E-02` | `node docs/tasks/hrp-v7-ci-path-filter/evidence/yaml-check.mjs` (assertion: "Quality has all expected steps") | exit 0; `PASS=12 FAIL=0`; assertion "Quality has all expected steps" PASS | `evidence/yaml-check-output.txt` |
| `E-03` | `node docs/tasks/hrp-v7-ci-path-filter/evidence/yaml-check.mjs` (assertion: both job-name strings present) | exit 0; both assertions PASS — job names match exactly the strings pinned in branch protection `required_status_checks.contexts` | `evidence/yaml-check-output.txt` |
| `E-04` | `node docs/tasks/hrp-v7-ci-path-filter/evidence/yaml-check.mjs` (assertion: Integration concurrency group + cancel-in-progress preserved) | exit 0; PASS — `group: hrpartner-dedicated-integration-db` and `cancel-in-progress: false` both present | `evidence/yaml-check-output.txt` |
| `E-05` | `node docs/tasks/hrp-v7-ci-path-filter/evidence/yaml-check.mjs` (assertion: fork guard intact) | exit 0; PASS — `github.event.pull_request.head.repo.full_name == github.repository` present | `evidence/yaml-check-output.txt` |
| `E-06` | `powershell -NoProfile -ExecutionPolicy Bypass -File docs/tasks/hrp-v7-ci-path-filter/evidence/path-classifier-selftest.ps1` (mirrors bash `case` classifier) | exit 0; `PASS=4 FAIL=0` (A: docs-only → SKIP, B: *.md → SKIP, C: .gitignore → SKIP, D: mixed docs+package.json → RUN) | `evidence/path-classifier-selftest-output.txt` + `evidence/path-classifier-selftest.ps1` |
| `E-07` | `git grep -nE 'docs/\*\|\*\.md\|scratch/\*\|\.gitignore\|README\*\|\.env\.example' .github/workflows/ci.yml` (verify SKIP set is exactly what's in the YAML) + `git grep -nE 'prisma/\*\|src/\*\|app/\*\|tests/\*\|package(-lock)?\.json\|vitest\.\*\.ts\|\.github/workflows/\*\*' .github/workflows/ci.yml` (verify RUN set is NOT in YAML — fail-safe default) | SKIP set found in YAML line ~108; RUN set grep returns no matches (default case = RUN, fail-safe) | `inline` |
| `E-08` | `node docs/tasks/hrp-v7-ci-path-filter/evidence/yaml-check.mjs` (assertion: no third-party action added, no version bump) | exit 0; PASS — 0 matches for `dorny/`, `tj-actions/`, `actions/checkout@v5`, `actions/setup-node@v5` | `evidence/yaml-check-output.txt` |
| `E-09` | `git diff --check origin/main..HEAD` (from worktree root) | exit 0; empty output | `inline` |
| `E-12` | `git status --porcelain --untracked-files=normal` | Modified: `.github/workflows/ci.yml`; untracked (task folder): TASK.md / HANDOFF.md / evidence/* | `inline` |
| `E-13` | `powershell -NoProfile -ExecutionPolicy Bypass -File docs/tasks/hrp-v7-ci-path-filter/evidence/path-classifier-selftest.ps1` (fixture A — docs-only → SKIP) | exit 0; PASS — expected=SKIP actual=SKIP | `evidence/path-classifier-selftest-output.txt` |
| `E-14` | **Live CI smoke test**: smoke PR #14 (`bf57633`, branch `smoke/docs-only-path-filter` off PR #13 head `d6d587c`) added 1 file in `docs/tasks/smoke/` → Quality (`105310363101`, run `35253217629`): ✅ pass 1m51s; Integration (`105310363447`): ✅ pass **12s** with steps `Install`/`Prisma generate`/`Integration tests` **all skipped**, `Short-circuit success` step ran and exited 0. PR closed after verification. | Live proof: path-filter correctly short-circuits docs-only PRs while keeping required check `success` (not skipped) for branch protection. | `evidence/smoke-pr14-jobs.json` (raw GitHub Actions API response with all step conclusions) |

### Self-test outputs (inline summary)

```
Path-classifier self-test (4 fixtures)
=======================================
  PASS: A. docs-only (docs/**)  expected=SKIP actual=SKIP
  PASS: B. *.md at root  expected=SKIP actual=SKIP
  PASS: C. .gitignore only  expected=SKIP actual=SKIP
  PASS: D. mixed docs + package.json (fail-safe RUN)  expected=RUN actual=RUN
Results: PASS=4 FAIL=0
OK — classifier matches expected behavior.
```

```
yaml-check (12 structural assertions)
=====================================
  PASS: YAML has 2 jobs (quality, integration)
  PASS: job name "Quality (...)" present
  PASS: job name "Integration (DB tests · fail-closed)" present
  PASS: Quality has all expected steps
  PASS: Integration concurrency group preserved
  PASS: Integration fork guard preserved
  PASS: Integration env block preserved (CI_INTEGRATION_STRICT=1)
  PASS: Path-filter step present (id=path-filter)
  PASS: Short-circuit success step present
  PASS: No third-party action added (no dorny/, no tj-actions/)
  PASS: No action version bump (no @v5)
  PASS: All Integration steps gated on should_run
Results: PASS=12 FAIL=0
OK — ci.yml structure preserved + path-filter wired correctly.
```

---

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| — | — | None | No |

No deviations. No blockers. Brief-prescribed OPTIONAL bump of `actions/checkout@v5` + `actions/setup-node@v4` deferred to a separate task per DEC-06 to keep blast radius minimal on the CI gate contract itself.

---

## 5. Final status

- Path-filter implemented as inline bash (DEC-01/DEC-02) with fail-safe default RUN. All structural and functional self-tests pass (12/12 yaml-check + 4/4 path-classifier). Quality job + Integration semantics for code/schema PRs fully preserved. Live smoke PR (#14) confirmed docs-only PRs reach Integration `success` in 12s vs ~17m baseline, while branch protection's `Integration (DB tests · fail-closed)` required check still reports `success` and merge is unblocked. PR is config-only (1 ci.yml file + task artifacts).

> Handoff status: `READY_FOR_AUDIT`

### Bonus: live smoke proof

Beyond the structural and self-test gates, the docs-only behavior was validated end-to-end against the live GitHub Actions runner via a transient smoke PR (#14, closed after verification):

| Scenario | Quality | Integration | Integration steps observed |
|---|---|---|---|
| Smoke PR #14 (1 file in `docs/tasks/smoke/`, base = PR #13 head `d6d587c`) | ✅ pass 1m51s | ✅ pass **12s** (was ~17m baseline) | `Install`/`Prisma generate`/`Integration tests` all `skipped`; `Short-circuit success (docs/config-only PRs)` ran and exited 0 |

This is the same path-filter YAML that PR #13 ships. Tier 3 can re-run the same experiment (or rely on `evidence/smoke-pr14-jobs.json` for the raw API response) when independently auditing.
