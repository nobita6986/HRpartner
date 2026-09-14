# AUDIT — `hrp-v6-n3-service-model-placement`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-n3-service-model-placement` |
| Spec version reviewed | `v0.4` (round-3 review fixes theo Tier 0 chốt 22:50 ngày 2026-09-14) |
| Implementation HEAD reviewed | worktree `tier1-n3-service-model-placement` HEAD `b98e470` (`tier1/n3-service-model-placement`; pushed to origin) |
| Audit mode | `LIGHT` |
| Audit round | `5` |
| Auditor | `Tier 3` |
| Status | `COMPLETE` |

## 1. Tier 3 LIGHT Audit Verdict

### Verdict: ✅ `PASS`

**All 3 round-4 review fixes verified against actual code. Zero new bugs introduced. No regressions. Diff scope clean. Ready for Tier 0/Owner merge decision.**

**Round-4 fixes verified against actual code:**

| ID | Bug | Fix | Evidence |
|---|---|---|---|
| F-07 | `ALTER DEFAULT PRIVILEGES IN SCHEMA "public"` ảnh hưởng mọi bảng TƯƠNG LAI trong `public` schema | Bỏ `ALTER DEFAULT PRIVILEGES`; chỉ `REVOKE DELETE ON "placements" FROM app_user_writer` trên đúng bảng | `migration.sql:201-210` — chỉ 2 dòng GRANT + REVOKE; không còn ALTER |
| F-08 | `closePlacementCaseSuccess` bỏ qua `updateMany.count` — nếu case đã CLOSED đồng thời, Placement vẫn EFFECTIVE mà case không đóng (AC-07 violation) | Check `result.count === 0` → throw `PlacementIdempotencyConflictError` → Prisma transaction rollback toàn bộ (Placement KHÔNG EFFECTIVE) | `placement.service.ts:431-440` + test case (xv) |
| F-09 | `runTransition` loser trả `replayed=false` bất kể current state vs target | Phân biệt: current = target → `replayed=true`; current ≠ target → throw `PlacementIdempotencyConflictError` | `placement.service.ts:383-399` + tests (xiv) + unit tests |

**Slice-by-slice gate:**

| Gate | Result | Evidence |
|---|---|---|
| Slice A (Schema + Migration) | ✅ PASS | `prisma validate` ✅, F-07: `ALTER DEFAULT PRIVILEGES` đã bỏ ✅ |
| Slice B (Service + Resolution) | ✅ PASS | 19 unit tests PASS ✅, F-08 + F-09 implemented ✅ |
| **Slice C (DB Integration)** | ✅ **PASS — 16/16** | **`hrp_n3_v5` branch (`br-bold-term-az0ej1zd`), endpoint `ep-weathered-art-az1c0gzh`, 16/16 PASS (carry-forward 14/14 round-4 + 2 new (xiv, xv))** |
| Migration correctness | ✅ PASS | F-07: scope chỉ trên bảng `placements` ✅, RLS/GRANT/REVOKE đúng ✅ |
| Forbidden paths | ✅ PASS | No `intake-writer.service.ts`, `staffing/`, `Worker`, `EmploymentEpisode`, `app/(jobs)/`, `app/admin/` |
| Typecheck | ✅ PASS | 0 new errors (9 pre-existing baseline errors) |
| Diff scope | ✅ PASS | 4 files changed (migration.sql, placement.service.ts, 2 test files); no forbidden paths touched |
| Git hygiene | ✅ PASS | Branch `tier1/n3-service-model-placement` pushed to origin (`b98e470`) ✅, no direct main merge ✅, no prod migration apply ✅ |

**Recommendation:** Tier 0/Owner may merge `tier1/n3-service-model-placement` → `main` and apply migration to `hrp-live` **after** reviewing the 16/16 DB integration PASS on the **new branch from baseline** (`hrp_n3_v5`).

**Conditions (for Tier 0/Owner to verify before prod migration):**
1. Neon branch `hrp_n3_v3` (`br-billowing-meadow-azqpi3oo`) was created from `hrp-live` baseline — verify via Neon dashboard.
2. Migration shows 39 applied on `hrp_n3_v3` — verify via `prisma migrate status`.
3. 14/14 DB integration tests PASS on `hrp_n3_v3` (verified: `ep-aged-mode-azhomkea`).
4. N1 production rebuild + admin intake smoke still open independently.

**N3 ready for Tier 0/Owner decision.**

## 2. Verdict (round 5)

✅ **`PASS` — Tier 3 LIGHT audit round 5 complete.**

All 3 round-4 review fixes verified against actual code. Zero new bugs introduced. No regressions. Diff scope clean. Ready for Tier 0/Owner merge decision.

---

## 3. Detailed verification: Round-4 fixes against actual code

### F-07: `ALTER DEFAULT PRIVILEGES` scope too broad — ✅ VERIFIED

**File:** `prisma/migrations/20260914212136_n3_service_model_placement/migration.sql:195-210`

**Bug:** `ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE DELETE ON TABLES FROM app_user_writer` ảnh hưởng mọi bảng TƯƠNG LAI trong `public` schema — không thuộc phạm vi N3.

**Actual code (after fix):**
```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- 7) GRANT cho runtime write role — bỏ DELETE (Placement lịch sử phải giữ).
--    Scope giới hạn: chỉ thu hồi DELETE trên bảng `placements` này.
--    KHÔNG dùng ALTER DEFAULT PRIVILEGES (round-4 fix: tránh ảnh hưởng
--    mọi bảng TƯƠNG LAI trong schema public — N3 chỉ thuộc phạm vi placements).
-- ═══════════════════════════════════════════════════════════════════════════
GRANT SELECT, INSERT, UPDATE ON "placements" TO app_user_writer;
-- REVOKE DELETE (audit-safe: Placement lịch sử không thể xóa qua runtime role).
REVOKE DELETE ON "placements" FROM app_user_writer;
```
- `ALTER DEFAULT PRIVILEGES` **đã bỏ hoàn toàn** — không còn dòng nào trong migration.
- Chỉ 2 dòng GRANT + REVOKE trên đúng bảng `placements`.
- Comment ghi rõ lý do round-4 fix.

**Diff:** `git diff 8444cdc..b98e470 -- prisma/.../migration.sql` — 3 dòng `ALTER DEFAULT PRIVILEGES` đã xóa; 4 dòng comment mới.

### F-08: `closePlacementCaseSuccess` bỏ qua `updateMany.count` — ✅ VERIFIED

**File:** `src/domains/talent/placement.service.ts:420-440`

**Bug:** `closePlacementCaseSuccess` gọi `updateMany` nhưng bỏ qua `result.count`. Nếu case đã CLOSED đồng thời, `WHERE status IN ACTIVE` không match → `count=0` nhưng không throw → Placement vẫn EFFECTIVE mà case không đóng → AC-07 violation.

**Actual code (after fix):**
```typescript
async function closePlacementCaseSuccess(...) {
  const result = await tx.placementCase.updateMany({
    where: { id: placementCaseId, status: { in: ACTIVE_CASE_STATUSES } },
    data: { status: 'CLOSED', closedAt, closeReason: `PLACEMENT_EFFECTIVE by ${actorId}...` },
  });
  if (result.count === 0) {
    // Case đã không còn ACTIVE (đã đóng trước đó hoặc concurrent closure).
    // Theo AC-07, Placement EFFECTIVE atomic-close case → nếu không đóng được
    // thì rollback toàn bộ transaction (bao gồm cả Placement EFFECTIVE update).
    throw new PlacementIdempotencyConflictError(
      `PlacementCase ${placementCaseId} không ở trạng thái ACTIVE khi đóng. Concurrent closure hoặc case đã CLOSED sẵn → rollback transaction.`,
      placementCaseId,
    );
  }
}
```

**Unit tests (`placement.service.test.ts:526-595`):**
- `(F-08) Client-managed EFFECTIVE: case đã CLOSED đồng thời → throw PlacementIdempotencyConflictError` — mock `updateMany` returns `count=0`, verify error type + message.
- `(F-08) closePlacementCaseSuccess: case.status CLOSED → count=0 → throw` — direct `rejects.toThrow(PlacementIdempotencyConflictError)`.

**DB integration test (`placement-lifecycle-integration.test.ts:1110-1185`):**
- Case **(xv)**: Client-managed EFFECTIVE khi case đã CLOSED đồng thời → `PlacementIdempotencyConflictError` + Placement vẫn `CONFIRMED` (rollback) + evidence KHÔNG persisted + case vẫn `CLOSED` (closeReason cũ giữ nguyên). **AC-07 guarantee: Placement KHÔNG thể EFFECTIVE mà case KHÔNG đóng.**

### F-09: `runTransition` loser trả `replayed=false` bất kể current state — ✅ VERIFIED

**File:** `src/domains/talent/placement.service.ts:383-399`

**Bug:** Khi `updateMany` trả `count=0` (concurrent change), `runTransition` luôn trả `{ ..., replayed: false }` bất kể current state vs target. Gây silent no-op sai khi current=target (idempotent thật sự).

**Actual code (after fix):**
```typescript
if (result.count === 0) {
  // Status changed by concurrent command. Round-4 fix (F-09): phân biệt rõ
  // replay vs conflict:
  //   - current state = target caller yêu cầu → IDEMPOTENT no-op (replay=true).
  //   - current state ≠ target caller yêu cầu → CONFLICT (throw); caller phải
  //     xử lý theo state thực tế (không phải silent no-op).
  const refreshed = await findPlacementForTransition(args.tx, row.id);
  if (refreshed.status === args.to) {
    return { placementId: refreshed.id, status: refreshed.status, replayed: true };
  }
  throw new PlacementIdempotencyConflictError(
    `Transition thua race: yêu cầu ${row.status} → ${args.to}, nhưng placement hiện ở ${refreshed.status}. Cần xử lý theo state thực tế.`,
    refreshed.id,
  );
}
```

**Logic:**
- `current === target` → idempotent no-op → `replayed=true` ✅
- `current !== target` → real conflict → throw `PlacementIdempotencyConflictError` ✅
- **Không còn silent `replayed=false` cho mọi race** ✅

**Unit tests (`placement.service.test.ts:774-875`):**
- `(F-09) race-loser: current=CANCELLED, target=CONFIRMED → throw PlacementIdempotencyConflictError` — mock `updateMany` returns `count=0`, state becomes `CANCELLED`, verify throw.
- `(F-09) race-loser: current=target (CONFIRMED) → replay=true` — mock `updateMany` returns `count=0`, state becomes `CONFIRMED`, verify `replayed=true`.

**DB integration test (`placement-lifecycle-integration.test.ts:1060-1107`):**
- Case **(xiv)**: race-loser transition — caller confirm, concurrent cancel → `InvalidStateTransitionError` (canTransition reject sớm, terminal state). Note: round-4 F-09 chỉ trigger khi `canTransition` pass + `updateMany` count=0. Nhánh canTransition reject giữ nguyên behavior cũ.

**No regressions on F-05 (round-3 race-loser fix):** `findActivePlacement` path (`placement.service.ts:200-220`) vẫn giữ `replayed = winner.status === 'SELECTED'` — không bị ảnh hưởng bởi F-09 fix (F-09 chỉ sửa nhánh `updateMany` count=0 trong `runTransition`).

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

1. ✅ **Round-4 fixes verified** — all 3 bugs properly fixed in actual code (line-level verification).
2. ✅ **No new bugs introduced** — diff reviewed end-to-end (4 files, 328 insertions / 13 deletions).
3. ✅ **No regressions on round-3 fixes** — F-05 (race-loser `replayed` logic), F-03 (evidence persistence), F-04 (atomic case closure) all intact.
4. ✅ **DB integration 16/16 PASS** on `hrp_n3_v5` (carry-forward: 14/14 round-4 + 2 new (xiv, xv)).
5. ✅ **Gates all PASS** — `prisma validate`, typecheck 0 new errors (9 pre-existing), diff scope clean.
6. ✅ **Ready for Tier 0/Owner decision** — merge `tier1/n3-service-model-placement` → `main` + apply migration to `hrp-live`.

**Conditions for Tier 0/Owner before prod migration:**
1. Neon branch `hrp_n3_v5` (`br-bold-term-az0ej1zd`) was created from `hrp-live` baseline — verify via Neon dashboard.
2. Migration shows correct state on `hrp_n3_v5` — verify via `prisma migrate status`.
3. 16/16 DB integration PASS on `hrp_n3_v5`.
4. N1 production rebuild + admin intake smoke still open independently (not blocked by N3).

---

## 6. Audit round history

| Round | Date | Verdict | Note |
|---|---|---|---|
| 1 | `2026-09-14 21:35` | `PENDING_FINAL_DIFF` | Slice A + B PASS; Slice C DB integration ENV_BLOCKED. |
| 2 | `2026-09-14 22:09` | `DB_GATE_PASSED_AWAITING_FINAL_AUDIT` | DB integration 9/9 PASS on `hrp_n3_test`. Migration fix (reorder + RLS predicate). |
| 3 | `2026-09-14 22:15` | `CONDITIONAL — RECOMMENDED FOR MERGE` | Final diff reviewed. Commit pushed (86385bc). |
| 4 | `2026-09-14 23:15` | `✅ PASS` | Round-3 review fixes verified against actual code (F-01..F-06 all confirmed). 14/14 DB integration PASS on `hrp_n3_v3`. 0 new TS errors. No forbidden paths. Ready for Tier 0/Owner merge. |
| **5** | **`2026-09-14 23:45`** | **`✅ PASS`** | **Round-4 review fixes verified against actual code (F-07..F-09 all confirmed). F-07: `ALTER DEFAULT PRIVILEGES` bỏ hoàn toàn. F-08: `closePlacementCaseSuccess` throw on count=0 → atomic AC-07 guarantee. F-09: `runTransition` phân biệt replay vs conflict. 2 new DB integration tests (xiv, xv). 4 files changed, no regressions. Prisma validate ✅, typecheck 9 errors (baseline). Ready for Tier 0/Owner merge.** |

