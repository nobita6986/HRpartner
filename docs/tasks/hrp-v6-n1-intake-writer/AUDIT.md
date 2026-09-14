# AUDIT — `hrp-v6-n1-intake-writer` — Tier 3 LIGHT Round 5

**Auditor**: Tier 3
**Date**: 2026-09-14 15:52 UTC+7
**Mode**: LIGHT — delta from Round 4 (identity + concurrency)
**Task**: `hrp-v6-n1-intake-writer`
**Worktree**: `C:\CodeApp\HrP-worktrees\tier1-n1-intake-writer-r2\`
**Delta scope**: Round-4 HEAD → Round-5 HEAD (uncommitted, worktree-only)

---

## Verdict

### 🟢 PASS

Round-5 delta resolves the AC-05 concurrent retry test issue raised by Tier 0. The test now uses the real intake handler (`createCandidateSubmissionFromIntake`), verifies all three required conditions (submission count, case/profile existence, replay response), and correctly handles the PrismaClient singleton pattern used by the application.

---

## Delta summary

Tier 0 (Owner) identified that Round-4's AC-05 concurrent retry test was insufficient:
- Handler used `admin.laborProfile.create` (simple profile creation only), not the full intake flow
- Verification only counted `IdempotencyKey` rows, not submission/case/profile counts
- Claimed "each HTTP request has its own PrismaClient" — app uses **singleton** PrismaClient

**Round-5 fix:**
- Handler changed to `createCandidateSubmissionFromIntake(tx, {...})` via `withHrManagerContext` — real intake flow (profile match → open placement case → create submission)
- Verification now checks: (a) submission count, (b) placement case + labor profile existence in DB, (c) replay response (`replayed=true/false`)
- Pre-creates LaborProfile with deterministic phone number to ensure EXACT_MATCH (not POSSIBLE_MATCH)
- Removes claim about "separate PrismaClient per HTTP request" — app uses singleton, and each `withIdempotency()` wraps its handler in `$transaction()` which handles concurrent calls correctly
- Imports `normalizePhone` from `labor-profile/normalize` for deterministic phone normalization

---

## Code review

### AC-05 concurrent retry test (`tests/db/intake-writer-integration.test.ts`)

**Pattern: correct**

```typescript
// Pre-create LaborProfile with deterministic phone → EXACT_MATCH
const lpSeed = `r5c${runId.replace(/-/g, '').slice(0, 8)}`;
const lpPhone = `09${lpSeed}`;
await admin.laborProfile.create({
  data: {
    fullName: `AC-05 Concurrent ${runId}`,
    phone: lpPhone,
    normalizedPhone: normalizePhone(lpPhone), // explicit, deterministic
    cccdNumber: `CCCD${lpSeed}`,
  },
});

// Handler uses REAL intake flow
const handler = async () => {
  const sub = await withHrManagerContext(writer, actorId, async (tx) => {
    return createCandidateSubmissionFromIntake(tx, {
      applicant: payload.applicant,
      channel: 'STAFF_INTAKE',
      intent: 'GENERAL_INTEREST',
      actorId,
    });
  });
  return { body: sub, statusCode: 201 };
};

// 2 concurrent calls with SAME writer client (singleton pattern)
const [r1, r2] = await Promise.allSettled([
  withIdempotency({ prisma: writer, route, actorId, key, requestBody: payload, handler }),
  withIdempotency({ prisma: writer, route, actorId, key, requestBody: payload, handler }),
]);

// Verify 3 conditions:
// (a) 1 replayed=true, 1 replayed=false
expect(fulfilled.length).toBe(2);
expect(replayedTrue).toBe(1);
expect(replayedFalse).toBe(1);

// (b) Both point to same submission + case + profile
expect(firstSubId).toBe(secondSubId);
expect(firstPcId).toBe(secondPcId);
expect(firstLpid).toBe(preLp.id);

// (c) DB: 1 CandidateSubmission + 1 PlacementCase ACTIVE + 1 LaborProfile
expect(await admin.candidateSubmission.count({ where: { id: firstSubId } })).toBe(1);
expect(await admin.placementCase.count({ where: { id: firstPcId, status: { in: ['OPEN', 'IN_PROGRESS', 'READY_TO_PLACE'] } })).toBe(1);
expect(await admin.laborProfile.count({ where: { id: firstLpid } })).toBe(1);
```

**PrismaClient singleton: correct**

The application uses a singleton PrismaClient. Each `withIdempotency()` call wraps its handler in `prisma.$transaction()`, which opens a separate transaction. Two concurrent calls on the same PrismaClient will serialize through the connection pool but execute as two separate transactions — this is exactly how the application handles concurrent HTTP requests in production. The Round-4 claim of "separate PrismaClient per HTTP request" was inaccurate.

**Test result**: 9/9 PASS on `hrp_mp2_test` (`evidence/intake-writer-r5c.log`, 15:51:22, 17.17s).

---

## Per-AC verification

| AC | Evidence | Result |
|---|---|---|
| `AC-01` SELECT path | `intake-writer-r5c.log` | PASS — SELECT existing LaborProfile by normalizedPhone + cccdNumber |
| `AC-04` race | `intake-writer-r5c.log` | PASS — `Promise.all([openCase(txA), openCase(txB)])` → 2 fulfilled, 1 created + 1 replayed, no 500 |
| `AC-05` idempotency replay | `intake-writer-r5c.log` | PASS — same key + same payload → 1 submission, 1 IdempotencyKey row |
| `AC-05` idempotency conflict | `intake-writer-r5c.log` | PASS — same key + different payload → `IdempotencyConflictError` (409) |
| `AC-05` concurrent retry | `intake-writer-r5c.log` | PASS — 2 concurrent calls → 2 fulfilled (1 replayed), 1 submission + 1 case + 1 profile in DB |
| `AC-06` general interest | `intake-writer-r5c.log` | PASS — projectId NULL, placementCaseId SET |
| `AC-14` RLS × 3 | `intake-writer-r5c.log` | PASS — PUBLIC denied SELECT + INSERT; HR_STAFF allowed INSERT placement_case |

**Full integration lane** (`evidence/integration-r5.log`): 18 files | 361 passed | 2 skipped (OPS06A — rate-limit distributed, not N1) | 0 failed | 249.39s. **Unit suite** (round-4, no production code changes): 132 files | 2173/2173 PASS. **Typecheck**: 0 error in-scope. Pre-existing BLK-02 still open (Tier 2 task).

---

## Round-4 findings status

| ID | Round-4 finding | Round-5 resolution |
|---|---|---|
| Concurrent retry handler | Used simple `admin.laborProfile.create` | Now uses `createCandidateSubmissionFromIntake` via `withHrManagerContext` |
| Verification only IdempotencyKey | Did not check submission/case/profile counts | Now checks all 3: submission count + case/profile existence + replay response |
| PrismaClient singleton claim | Claimed "separate PrismaClient per HTTP request" | Removed — app uses singleton; `$transaction()` handles concurrency |

---

## Secret hygiene

- `evidence/intake-writer-r5c.log` contains no `postgres://`, `password=`, `bearer`, JWT, or email patterns.
- `evidence/` folder contains only: `intake-writer-r5c.log` (integration test), `integration-r5.log` (full lane), `unit-r5-final.log` (unit suite), `neon_branch_gate.r4.stdout.txt` (branch gate).
- Credentials loaded from `C:\cre_hrp.txt` via process env vars only.

---

## Scope

- `tests/db/intake-writer-integration.test.ts` — updated (handler fix + verify 3 conditions + remove singleton claim + import normalizePhone)
- `docs/tasks/hrp-v6-n1-intake-writer/AUDIT.md` — REWRITTEN (round-5)
- `docs/tasks/hrp-v6-n1-intake-writer/HANDOFF.md` — updated (round-5 summary + evidence registry)
- `docs/tasks/hrp-v6-n1-intake-writer/TASK.md` — updated (Spec version `v0.5 ROUND_5_DELIVERED`, Status `READY_FOR_AUDIT_ROUND_5`, Revision Log row 5, AC-05 row updated)
- No changes to production code, schema, or migrations.

---

## Recommendation

**APPROVE for merge.** Tier 1 may commit Round-5 HEAD and fast-forward merge to main. Next gate: Tier 0 deploy gate.

> Tier 1 declares `N1 ACCEPTED` only after this PASS verdict is recorded.
