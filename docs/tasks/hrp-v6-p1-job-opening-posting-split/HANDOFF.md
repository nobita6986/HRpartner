# HANDOFF: hrp-v6-p1-job-opening-posting-split — Round 2

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-p1-job-opening-posting-split` |
| Work type | `SCHEMA` |
| Spec version | `v1.2` |
| Execution round | `2` |
| Current audit round | `1` |
| Executor | `Tier 2 + Tier 1 (Planner Resolution)` |
| Baseline | `main @ 4758809` |
| Status | `RESOLVING_R2` — Tier 1 Planner Resolution đã thực hiện |

## 1. Outcome Summary

### Tier 2 R1 (đã hoàn thành)
- Schema: `JobOpening`, `JobPosting`, `StaffingOrderSlot.jobOpeningId`
- Migration: `prisma/migrations/20260908001_job_opening_posting_split/migration.sql`

### Tier 1 Planner Resolution (R1 Audit — AUD-001..AUD-006)

| Finding | Resolution | Status |
|---|---|---|
| AUD-001 | TASK.md v1.1: thêm sections 3-10 | ✅ Done |
| AUD-002 | Stage lại schema + migration | ✅ Done |
| AUD-003 | Schema: `staffingOrderSlotId String?` + `posting JobPosting?` (one-to-zero-or-one) | ✅ Done |
| AUD-004 | Migration: `staffing_order_slot_id` column + `CREATE UNIQUE INDEX job_postings_job_opening_id_key` | ✅ Done |
| AUD-005 | Migration: RLS/policy cho `job_openings` + `job_postings` scope theo `staffing_orders.project_id` | ✅ Done |
| AUD-006 | Backfill = NGOÀI PHẠM VI — §8 ghi rõ | ✅ Done |

## 2. Changed Deliverables (R2)

| File | Change |
|---|---|
| `prisma/schema.prisma` | R2: `staffingOrderSlotId String?`, `staffingOrderSlot StaffingOrderSlot?`, `posting JobPosting? @relation("OpeningPosting")` |
| `prisma/migrations/20260908001_job_opening_posting_split/migration.sql` | R2: `staffing_order_slot_id` column + FK + UNIQUE INDEX + RLS/policy |
| `docs/tasks/hrp-v6-p1-job-opening-posting-split/TASK.md` | R2: §4.3, §4.4, §7, §8, §9 cập nhật; spec v1.2, status RESOLVING_R2 |
| `docs/tasks/hrp-v6-p1-job-opening-posting-split/HANDOFF.md` | R2: overwrite với round history đầy đủ |

## 3. Staged Files (READY_FOR_TIER3_AUDIT)

```
prisma/schema.prisma                                           staged (M)
prisma/migrations/20260908001_job_opening_posting_split/       staged (A)
docs/tasks/hrp-v6-p1-job-opening-posting-split/AUDIT.md       staged (A)
docs/tasks/hrp-v6-p1-job-opening-posting-split/TASK.md       staged (M)
docs/tasks/hrp-v6-p1-job-opening-posting-split/HANDOFF.md    staged (A)
docs/tasks/hrp-v6-p1-job-opening-posting-split/evidence/      staged (A)
```

## 4. Execution Round History

| Round | Executor | Timestamp | Status |
|---|---|---|---|
| 1 | Tier 2 | 2026-09-08 | READY_FOR_TIER3_AUDIT |
| 1 | Tier 1 (AUD-001) | 2026-09-08 | TASK.md sections 3-10 fixed → v1.1 |
| 2 | Tier 2 + Tier 1 | 2026-09-08 | RESOLVING_R2 — AUD-002..AUD-006 resolved |
| 2 | Tier 1 (build fix) | 2026-09-08 11:04 | Fix ambiguous relation giữa `JobOpening.staffingOrderSlot` và `slots` đều trỏ về `StaffingOrderSlot`. Thêm `@relation("OpeningSlotNeo")`, `@relation("OpeningSlots")`, `@relation("OpeningOnOrder")` cho back-refs. Schema valid, fence 23/23 PASS. |

---

Handoff status: RESOLVING_R2 — chờ Tier 3 audit round 2
