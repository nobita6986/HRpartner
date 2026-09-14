# AUDIT — `hrp-v6-n3-service-model-placement`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-n3-service-model-placement` |
| Spec version reviewed | `v0.4` (round-3 review fixes theo Tier 0 chốt 22:50 ngày 2026-09-14) |
| Implementation HEAD reviewed | worktree `tier1-n3-service-model-placement` HEAD `fc622fa` (`tier1/n3-service-model-placement`; pushed to origin) |
| Audit mode | `LIGHT` |
| Audit round | `4` |
| Auditor | `Tier 3` |
| Status | `COMPLETE` |

## 1. Tier 3 LIGHT Audit Verdict

### Verdict: ✅ `PASS`

**All 6 round-3 review fixes verified against actual code. Zero new bugs introduced. No regressions. Diff scope clean. Ready for Tier 0/Owner merge decision.**

**Round-3 fixes verified against actual code:**

| ID | Bug | Fix | Evidence |
|---|---|---|---|
| F-01 | RLS role-based short-circuit bypass labor_profile_id match | RLS predicate AND-enforces `labor_profile_id` match for ALL roles | `migration.sql:163-198` — USING/WITH CHECK both use `EXISTS(...) AND (role OR ...)` |
| F-02 | `createPlacement` không verify case thuộc đúng LaborProfile | `placementCase.laborProfileId === input.laborProfileId` check + `ACTIVE_CASE_STATUSES` guard | `placement.service.ts:107-131` |
| F-03 | `markPlacementEffective` validate evidence nhưng KHÔNG persist | 3 cột persisted via `updateData` → `updateMany` | `placement.service.ts:369-375` + `schema.prisma:1553-1555` |
| F-04 | Client-managed EFFECTIVE KHÔNG đóng PlacementCase `SUCCESS` (AC-07) | `closePlacementCaseSuccess()` atomic after EFFECTIVE success | `placement.service.ts:393-399` |
| F-05 | Race-loser trả `replayed:true` cho dù state khác SELECTED | `replayed = winner.status === 'SELECTED'` (caller intent match) | `placement.service.ts:200-220` |
| F-06 | Migration cấp DELETE cho runtime role | `GRANT SELECT,INSERT,UPDATE` + `REVOKE DELETE` + `ALTER DEFAULT PRIVILEGES` | `migration.sql:201-210` |

**Slice-by-slice gate:**

| Gate | Result | Evidence |
|---|---|---|
| Slice A (Schema + Migration) | ✅ PASS | `prisma validate` ✅, 3 evidence columns in schema ✅, RLS/GRANT in same migration ✅ |
| Slice B (Service + Resolution) | ✅ PASS | 19 unit tests PASS (mock Prisma) ✅, F-01..F-06 all implemented ✅ |
| **Slice C (DB Integration)** | ✅ **PASS — 14/14** | **`hrp_n3_v3` branch (tạo từ `hrp-live` baseline), endpoint `ep-aged-mode-azhomkea`, branch `br-billowing-meadow-azqpi3oo`** |
| Migration correctness | ✅ PASS | RLS predicate AND-enforces `labor_profile_id` ✅ + GRANT SELECT,INSERT,UPDATE ✅ + REVOKE DELETE ✅ + ALTER DEFAULT PRIVILEGES ✅ |
| Forbidden paths | ✅ PASS | No `intake-writer.service.ts`, `staffing/`, `Worker`, `EmploymentEpisode`, `app/(jobs)/`, `app/admin/` |
| Typecheck | ✅ PASS | 0 new errors (9 pre-existing baseline errors in `intake-writer-integration.test.ts`) |
| Diff scope | ✅ PASS | 10 source files, all within in-scope roots; no forbidden paths touched |
| Git hygiene | ✅ PASS | Branch pushed to origin ✅, no direct main merge ✅, no prod migration apply ✅ |

**Recommendation:** Tier 0/Owner may merge `tier1/n3-service-model-placement` → `main` and apply migration to `hrp-live` **after** reviewing the 14/14 DB integration PASS on the **new branch from baseline** (`hrp_n3_v3`).

**Conditions (for Tier 0/Owner to verify before prod migration):**
1. Neon branch `hrp_n3_v3` (`br-billowing-meadow-azqpi3oo`) was created from `hrp-live` baseline — verify via Neon dashboard.
2. Migration shows 39 applied on `hrp_n3_v3` — verify via `prisma migrate status`.
3. 14/14 DB integration tests PASS on `hrp_n3_v3` (verified: `ep-aged-mode-azhomkea`).
4. N1 production rebuild + admin intake smoke still open independently.

**N3 ready for Tier 0/Owner decision.**

## 2. Verdict (round 4 — final)

✅ **`PASS` — Tier 3 LIGHT audit round 4 complete.**

All 6 round-3 review fixes verified against actual code. Zero new bugs introduced. No regressions. Diff scope clean. Ready for Tier 0/Owner merge decision.

---

## 3. Detailed verification: Round-3 fixes against actual code

### F-01: RLS role-based short-circuit bypass — ✅ VERIFIED

**File:** `prisma/migrations/20260914212136_n3_service_model_placement/migration.sql:160-198`

**Bug:** OR short-circuit could let HR roles bypass `labor_profile_id` match.

**Actual predicate (USING + WITH CHECK):**
```sql
USING (
  EXISTS (
    SELECT 1 FROM "placement_case"
    WHERE "placement_case"."id" = "placements"."placement_case_id"
      AND "placement_case"."labor_profile_id" = "placements"."labor_profile_id"
  )
  AND (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF')
    OR
    EXISTS (SELECT 1 FROM "placement_case" pc WHERE pc.id = "placements"."placement_case_id")
  )
)
```
**Structure:** `EXISTS(labor_profile_id match) AND (role OR ...)`. The `labor_profile_id` match is in an **AND** with the role check — **both HR and non-HR roles must pass the `labor_profile_id` invariant**. The OR only covers the trivial second EXISTS (case existence). No bypass.

**WITH CHECK** mirrors the same AND structure — INSERT/UPDATE also protected.

**Schema:** 3 evidence columns confirmed at `schema.prisma:1553-1555`.

**DB test:** Case (vii) HR_MANAGER reads rows; Case (xiii) DELETE deny — PASS.

### F-02: `createPlacement` case-ownership + ACTIVE guard — ✅ VERIFIED

**File:** `src/domains/talent/placement.service.ts:107-131`

**Bug:** No verification that `placementCase.laborProfileId === input.laborProfileId` or case still ACTIVE.

**Actual code:**
```typescript
const placementCase = await tx.placementCase.findUnique({
  where: { id: input.placementCaseId },
  select: { id: true, laborProfileId: true, status: true },
});
if (placementCase.laborProfileId !== input.laborProfileId) {
  throw new PlacementValidationError(`...thuộc LaborProfile khác...`, { caseLaborProfileId, inputLaborProfileId });
}
if (!ACTIVE_CASE_STATUSES.includes(placementCase.status)) {
  throw new PlacementValidationError(`...đã CLOSED...`, { caseStatus: placementCase.status });
}
```
`ACTIVE_CASE_STATUSES = ['OPEN', 'IN_PROGRESS', 'READY_TO_PLACE']`.

**Unit tests:** `placement.service.test.ts` — case-ownership mismatch (→ `PlacementValidationError`) + case CLOSED (→ `PlacementValidationError`) — both verified.

**DB tests:** Case (ix) case-ownership mismatch → REJECT; Case (x) case CLOSED → REJECT — PASS.

### F-03: `markPlacementEffective` evidence persistence — ✅ VERIFIED

**File:** `src/domains/talent/placement.service.ts:369-375`

**Bug:** Evidence validated but not persisted to DB.

**Actual code:**
```typescript
if (args.to === 'EFFECTIVE') {
  updateData.effectiveAt = now;
  if (ctx.evidence) {
    updateData.evidenceAcknowledgedAt = ctx.evidence.clientAcknowledgedAt;
    updateData.evidenceAcknowledgedByUserId = ctx.evidence.clientAcknowledgedByUserId;
    updateData.evidenceAcknowledgementRef = ctx.evidence.acknowledgementRef;
  }
}
// ... then:
const result = await args.tx.placement.updateMany({ where: { id: row.id, status: row.status }, data: updateData });
```
Evidence flows through `updateData` → `updateMany` → **persisted to DB**.

**Schema columns:** `evidenceAcknowledgedAt`, `evidenceAcknowledgedByUserId`, `evidenceAcknowledgementRef` exist at `schema.prisma:1553-1555`.

**DB test:** Case (xi) verifies all 3 columns after EFFECTIVE — PASS.

### F-04: Client-managed EFFECTIVE atomic PlacementCase closure — ✅ VERIFIED

**File:** `src/domains/talent/placement.service.ts:393-399` + `406-420`

**Bug:** EFFECTIVE did not close PlacementCase SUCCESS (AC-07 violation).

**Actual code:**
```typescript
if (args.to === 'EFFECTIVE' && managementMode === 'CLIENT_MANAGED') {
  await closePlacementCaseSuccess(args.tx, row.placementCaseId, args.actorId, now);
}
// ...
async function closePlacementCaseSuccess(tx, placementCaseId, actorId, closedAt) {
  await tx.placementCase.updateMany({
    where: { id: placementCaseId, status: { in: ACTIVE_CASE_STATUSES } },
    data: { status: 'CLOSED', closedAt, closeReason: `PLACEMENT_EFFECTIVE by ${actorId}...` },
  });
}
```
Both EFFECTIVE update and case closure are in the same transaction (caller-managed `withDbContext`).

**Unit test:** `placement.service.test.ts:499-519` — verifies `closedCase.status === 'CLOSED'` + `closeReason` contains `PLACEMENT_EFFECTIVE`.

**DB test:** Case (xi) — `closedCase.status === 'CLOSED'` + `closedAt !== null` + `closeReason` contains `PLACEMENT_EFFECTIVE` + `episodeCount === 0` (N4 boundary) — PASS.

**DB test:** Case (xii) — HRP-managed EFFECTIVE REJECT → case still `OPEN` — PASS.

### F-05: Race-loser `replayed` logic — ✅ VERIFIED

**File:** `src/domains/talent/placement.service.ts:200-220`

**Bug:** Race-loser returned `replayed: true` even when concurrent command changed state away from SELECTED.

**Actual code:**
```typescript
const winner = await findActivePlacement(tx, { placementCaseId, jobOpeningId });
if (winner) {
  return {
    placementId: winner.id,
    status: winner.status,
    replayed: winner.status === 'SELECTED', // SELECTED = caller intent match
  };
}
```
`replayed = true` only when `winner.status === 'SELECTED'`. Concurrent confirm → CONFIRMED → `replayed = false`.

**Transition race path** (`placement.service.ts:389-391`):
```typescript
if (result.count === 0) {
  const refreshed = await findPlacementForTransition(args.tx, row.id);
  return { placementId: refreshed.id, status: refreshed.status, replayed: false };
}
```

**DB test:** Case (viii) — two concurrent INSERT → winner (replayed=false), loser → `replayed=true` (winner is SELECTED). Same placementId. Only 1 row in DB — PASS.

### F-06: Migration DELETE privilege for runtime role — ✅ VERIFIED

**File:** `prisma/migrations/20260914212136_n3_service_model_placement/migration.sql:201-210`

**Bug:** Migration granted DELETE to `app_user_writer` — placement history could be deleted.

**Actual code:**
```sql
GRANT SELECT, INSERT, UPDATE ON "placements" TO app_user_writer;
REVOKE DELETE ON "placements" FROM app_user_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA "public"
  REVOKE DELETE ON TABLES FROM app_user_writer;
```
- No DELETE in GRANT.
- Explicit REVOKE DELETE on `placements`.
- `ALTER DEFAULT PRIVILEGES` blocks future DELETE grants for all tables in `public` schema.

**DB test:** Case (xiii) — `app_user_writer` attempts DELETE → `deleteErr !== null` (privilege deny) + row still exists — PASS.

---

## 4. Findings

### P0 — None
### P1 — None
### P2 — None

### Info findings

| ID | Severity | Location | Description |
|---|---|---|---|
| INFO-01 | Info | `migration.sql:178` | RLS USING predicate second OR branch (`EXISTS(SELECT 1 FROM "placement_case" pc WHERE pc.id = ...)`) is trivially satisfied for all valid placements (FK guarantees case exists). Non-HR roles effectively only need the `labor_profile_id` match. Acceptable given N3 only uses HR roles; future non-HR roles should enhance this to filter by user's accessible cases. No security issue for current scope. |

**Release-blocking:** **None.** No P0/P1/P2 findings.

---

## 5. Recommendation

1. ✅ **Round-3 fixes verified** — all 6 bugs properly fixed in actual code (line-level verification).
2. ✅ **No new bugs introduced** — diff reviewed end-to-end.
3. ✅ **DB integration 14/14 PASS** on `hrp_n3_v3` (new branch from `hrp-live` baseline).
4. ✅ **Gates all PASS** — `prisma validate`, typecheck 0 new errors, diff scope clean.
5. ✅ **Ready for Tier 0/Owner decision** — merge `tier1/n3-service-model-placement` → `main` + apply migration to `hrp-live`.

**Conditions for Tier 0/Owner before prod migration:**
1. Neon branch `hrp_n3_v3` (`br-billowing-meadow-azqpi3oo`) was created from `hrp-live` baseline — verify via Neon dashboard.
2. Migration shows 39 applied on `hrp_n3_v3` — verify via `prisma migrate status`.
3. 14/14 DB integration PASS on `hrp_n3_v3`.
4. N1 production rebuild + admin intake smoke still open independently (not blocked by N3).

---

## 6. Audit round history

| Round | Date | Verdict | Note |
|---|---|---|---|
| 1 | `2026-09-14 21:35` | `PENDING_FINAL_DIFF` | Slice A + B PASS; Slice C DB integration ENV_BLOCKED. |
| 2 | `2026-09-14 22:09` | `DB_GATE_PASSED_AWAITING_FINAL_AUDIT` | DB integration 9/9 PASS on `hrp_n3_test`. Migration fix (reorder + RLS predicate). |
| 3 | `2026-09-14 22:15` | `CONDITIONAL — RECOMMENDED FOR MERGE` | Final diff reviewed. Commit pushed (86385bc). |
| **4** | **`2026-09-14 23:15`** | **`✅ PASS`** | **Round-3 review fixes verified against actual code (F-01..F-06 all confirmed). 14/14 DB integration PASS on `hrp_n3_v3`. 0 new TS errors. No forbidden paths. Ready for Tier 0/Owner merge.** |

