# OP prep — execution round scaffolding index (Tier 2)

> **Audience:** Owner/OP executing STEP-07..11 trong window **2026-09-08 09:00-09:30 Asia/Bangkok**.
>
> Tier 2 đã prep sẵn 5 evidence templates. Owner chỉ cần copy → fill → save với tên evidence file tương ứng.

## 0. Status

| Item | Status | Note |
|---|---|---|
| TASK.md spec | v1.3 READY_FOR_EXECUTION | audit round 2 PASS WITH FINDINGS, Q-01..Q-04 RESOLVED |
| Tier 2 prep | COMPLETED | STEP-00..06 done; HANDOFF committed |
| Tier 3 audit round 2 | PASS WITH FINDINGS | AUD-001 ESCALATE_NEW_TASK to `hrp-v6-security-credential-rotation`; AUD-002/003 RESOLVED |
| CLEANUP-PLAN exists | YES | `docs/cleanup/CLEANUP-PLAN.md` Tier 1 authored; Tier 2 owns C-14..C-31 + C-49 |
| Owner Q-01..Q-04 | RESOLVED | `docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/TASK.md` §8 |
| Window | 2026-09-08 09:00-09:30 Asia/Bangkok | cùng slot với Neon rotate |

## 1. Evidence templates (Tier 2 prepped)

| STEP | Template path | Target evidence file (after fill) | AC |
|---|---|---|---|
| `STEP-07` | `evidence/op-prep-step07-template.md` | `evidence/go21-s07-rotation.txt` | AC-04 |
| `STEP-08` | `evidence/op-prep-step08-template.md` | `evidence/go21-s08-deploy.txt` | AC-05 |
| `STEP-09` | `evidence/op-prep-step09-template.md` | `evidence/go21-s09-revoke.txt` | AC-04, AC-05 |
| `STEP-10` | `evidence/op-prep-step10-template.md` | `evidence/go21-s10-cleanup.txt` | AC-06, AC-07, AC-08 |
| `STEP-11` | `evidence/op-prep-step11-template.md` | `evidence/go21-s11-demo.txt` | AC-09 |

## 2. Tier 2 read-only scaffolding (verified at HEAD `2f7baf0`)

### 2.1 Runbook ready

`docs/runbooks/credential-hygiene-cutover.md` đã có đầy đủ:
- §1 Preflight
- §2 STEP-07 rotate 3 Neon role (masked)
- §3 STEP-08 Vercel env update + redeploy + smoke (6 routes)
- §4 STEP-09 revoke old credentials
- §5 STEP-10 cleanup (local + branch + scratch)
- §6 STEP-11 DEMO rows
- §7 Rollback / Recovery matrix
- §8 Evidence Owner cần xuất
- §9 References

### 2.2 Manifest pinned

`evidence/go21-s05-demo-manifest.json`:
- manifest hash `3fb0d3cc0f6fcb85dc3f3b978a71819f05bc011f8a5d4cad141222a14cfde47e`
- allowlist: 4 vendor (`VND-001`, `DA-DEMO-001`, `DA-DEMO-002`, `DA-DEMO-003`) + 3 user (`0910000001`, `0910000002`, `0910000003`)
- FK order: children (worker/vendorId) → parents
- post-check invariants: allowlist_count_after_zero, non_demo_sentinel_unchanged, manifest_hash_unchanged

### 2.3 Ops script ready

`scripts/ops/demo-cleanup.mjs`:
- dry-run idempotent (verified Tier 3 audit round 2 + Tier 2 re-confirm at HEAD `2f7baf0`)
- apply fail-closed khi DB gate fail (non-local + no DEMO_CLEANUP_FORCE_LIVE)
- apply stub exit 0 khi localhost (DEV-21-02; Owner chạy thật với Neon safe-read target)

### 2.4 Disposition manifest ready

`evidence/go21-s04-disposition.md` — KEEP/DELETE/UNKNOWN cho 3 local `.env*.local` + 5 root one-shot + 8 scratch subdir. Owner Q-02 RESOLVED trong TASK §8.

## 3. Tier 2 verify (this round)

| Verify | Command | Exit | Result |
|---|---|---|---|
| AC-02 (env untrack persisted) | `git ls-files '.env*'` | 0 | `.env.example` only |
| AC-03 (seed static test) | `npx vitest run prisma/seed-portal-demo-password.static.test.ts` | 0 | 5/5 GREEN |
| AC-09 (dry-run idempotency) | `node scripts/ops/demo-cleanup.mjs dry-run` (localhost) × 2 | 0, 0 | hash `3fb0d3cc...` (both) |
| AC-09 (apply fail-closed) | `node scripts/ops/demo-cleanup.mjs apply` (Neon non-local) | 2 | "DB gate FAIL" |
| AC-09 (apply localhost) | `node scripts/ops/demo-cleanup.mjs apply` (localhost) | 0 | stub |
| Runbook §2 probe template | `rg -n 'STEP-07' docs/runbooks/credential-hygiene-cutover.md` | 0 | matches present |
| Runbook §3 smoke matrix | `rg -n 'Smoke matrix' docs/runbooks/credential-hygiene-cutover.md` | 0 | matches present |
| Runbook §5 branch names | `rg -n 'pre-mp2-remediation' docs/runbooks/credential-hygiene-cutover.md` | 0 | matches present |

Evidence: `evidence/go21-op-prep-ac09-localhost.txt` (this round).

## 4. STOP conditions Tier 2 không vượt

- Tier 2 KHÔNG touch Neon roles, Vercel project, local `.env*.local`, Neon branch, DEMO rows
- Tier 2 KHÔNG mutate production dưới mọi hình thức
- Tier 2 KHÔNG chạy CLEANUP-PLAN C-14..C-31 (Tier 2 owns per §4, nhưng Owner phải start window trước — `2026-09-08 09:00`)
- Tier 2 KHÔNG commit code, không push, không deploy

## 5. Hand-off chain

```
2026-09-07 14:05 Asia/Bangkok
  ↓ Tier 2 OP prep completed
2026-09-08 09:00-09:30 Asia/Bangkok
  ↓ Owner runs STEP-07..11 per templates
2026-09-08 09:30+
  ↓ Owner saves evidence/go21-s{07..11}-*.txt
2026-09-08 ??:??
  ↓ Tier 3 re-audit round 3 (verifies AC-04/05/06/07/08)
2026-09-08 ??:??
  ↓ Tier 1 Resolution → task 21 ACCEPTED | BLOCKED
```

## 6. References

- TASK: `docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/TASK.md` v1.3
- AUDIT: `docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/AUDIT.md` round 2
- CLEANUP-PLAN: `docs/cleanup/CLEANUP-PLAN.md`
- Runbook: `docs/runbooks/credential-hygiene-cutover.md`
- Manifest: `docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/evidence/go21-s05-demo-manifest.json`
- Ops script: `scripts/ops/demo-cleanup.mjs`
- Disposition: `docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/evidence/go21-s04-disposition.md`
- Templates (this file index): `docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/evidence/op-prep-step{07..11}-template.md`
