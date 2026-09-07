# OP prep — execution round scaffolding index (Tier 2)

> **Audience:** Owner/OP executing STEP-04/05/06 trong window **2026-09-08 09:00-09:30 Asia/Bangkok**.
> Tier 2 đã prep sẵn 3 evidence templates + runbook. Owner chỉ cần copy → fill → save với tên evidence file tương ứng.

## 0. Status

| Item | Status | Note |
|---|---|---|
| TASK.md spec | v1.1 READY_FOR_EXECUTION | Owner Q-01..Q-03 RESOLVED |
| Tier 2 prep | COMPLETED | STEP-01..03 done; runbook + 3 templates + HANDOFF |
| Tier 3 audit round 0 | n/a | chưa có execution round |
| `check_rls.cjs` untrack + sanitize | DONE | commit `4a56122` |
| Sanitized `check_rls.cjs` (worktree) | 18 lines, fail-closed, no default fallback | per TASK DEC-07 |
| 4 file canary `BLOCKED_DB_URL` | KHÔNG sửa (whitelist) | per TASK RQ-04 |
| Window | 2026-09-08 09:00-09:30 Asia/Bangkok | cùng slot với task 21 OP |

## 1. Evidence templates (Tier 2 prepped)

| STEP | Template path | Target evidence file (after fill) | AC |
|---|---|---|---|
| `STEP-04` | `evidence/op-prep-step04-template.md` | `evidence/sec-s04-rotate.txt` | AC-06 partial |
| `STEP-05` | `evidence/op-prep-step05-template.md` | `evidence/sec-s05-dsn-update.txt` | AC-06 partial |
| `STEP-06` | `evidence/op-prep-step06-template.md` | `evidence/sec-s06-revoke.txt` | AC-06 (full) |

## 2. Tier 2 verify (this round)

| AC | Verify | Exit | Result | Evidence |
|---|---|---|---|---|
| AC-01 | `git ls-files check_rls.cjs` | 0 | empty (untracked) | `evidence/sec-s02-sanitize.txt` §(7) |
| AC-02 | `git check-ignore -v check_rls.cjs` | 0 | `.gitignore:82:check_rls.cjs check_rls.cjs` | `evidence/sec-s02-sanitize.txt` §(8) |
| AC-03 | `rg 'postgresql://\|postgres://' check_rls.cjs` | non-zero | 0 hit | `evidence/sec-s02-sanitize.txt` §(1) |
| AC-04 | `rg 'process.env.DATABASE_URL' check_rls.cjs`; `rg 'throw' check_rls.cjs` | 0 | 2 hit + 1 hit | `evidence/sec-s02-sanitize.txt` §(2)(3) |
| AC-05 | `git diff d61ebac HEAD --name-only` | 0 | 2 files: `.gitignore`, `check_rls.cjs` (delete) | `evidence/sec-s02-sanitize.txt` §(10) |
| AC-09 | 4 file canary `BLOCKED_DB_URL` | 0 | ≥ 1 hit mỗi file | `evidence/sec-s03-gitignore.txt` (this file) |
| AC-11 | `rg 'npg_E0eqUu7aHtpI' evidence/` | non-zero | 0 hit (only fingerprint in this index) | `evidence/sec-s06-redaction.txt` |

## 3. Owner execution chain

```
2026-09-07 14:55 Asia/Bangkok
  ↓ Tier 2 STEP-01..03 done (HEAD 4a56122)
2026-09-08 09:00-09:30 Asia/Bangkok
  ↓ Owner runs STEP-04/05/06 per templates + runbook
2026-09-08 09:30+
  ↓ Owner saves evidence/sec-s{04..06}-*.txt
2026-09-08 ??:??
  ↓ Tier 3 re-audit round 1 (verifies AC-06/07/08/10/12/13)
2026-09-08 ??:??
  ↓ Tier 1 Resolution → task security ACCEPTED | BLOCKED
```

## 4. STOP conditions Tier 2 không vượt

- Tier 2 KHÔNG touch Neon roles, secret store, Vercel env, local `.env.local`
- Tier 2 KHÔNG mutate production dưới mọi hình thức
- Tier 2 KHÔNG chạy `node check_rls.cjs` với `DATABASE_URL` thật (cần DB safe-read target mà Tier 2 không có)
- Tier 2 KHÔNG commit code thay đổi `check_rls.cjs` đã sanitize (file untracked)
- Tier 2 KHÔNG sửa 4 file canary (whitelist per TASK RQ-04)

## 5. References

- TASK: `docs/tasks/hrp-v6-security-credential-rotation/TASK.md` v1.1
- Runbook: `docs/runbooks/credential-rotation-incident.md`
- Sanitized `check_rls.cjs` (worktree, untracked at HEAD `4a56122`)
- Baseline HEAD: `d61ebac` (raw credential still present)
- New HEAD: `4a56122` (sanitized + untracked; single scoped commit)
- Audit carry over: AUD-001 from `hrp-v5-go-live-21-credential-hygiene-closure` round 1 (RESOLVED post Tier 2 STEP-02)
- Task 21 OP execution (parallel window 09:00-09:30): `hrp-v5-go-live-21-credential-hygiene-closure` STEP-07..11
