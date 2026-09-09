# OP preparation index — TASK v1.2

## Current state

| Item | Status |
|---|---|
| Tier 2 STEP-01..03 | carry-forward complete in canonical ancestry |
| Tier 2 STEP-04 runbook verify | complete; see `evidence/ac08-runbook.txt` |
| Owner/OP STEP-05 rotate/deploy/smoke | blocked; no canonical evidence |
| Owner/OP STEP-06 revoke/probes | blocked; no canonical evidence |
| Tier 3 STEP-07 | pending independent audit |
| Tier 2 STEP-08 | BLOCKED pending Owner, Tier 1, and Tier 3 inputs |

## Templates

- `op-prep-step04-template.md`: Tier 2 runbook verification pointer.
- `op-prep-step05-template.md`: masked Owner rotate/deploy/smoke evidence.
- `op-prep-step06-template.md`: masked Owner revoke/probe evidence.

## Safety boundary

Tier 2 does not read `.env*`, connect to DB/Neon, mutate a secret store, rotate/revoke credentials, deploy, self-audit, commit, push, or merge. Owner evidence may contain only non-reversible fingerprints, posture, timestamps, state labels, and pass/fail.
