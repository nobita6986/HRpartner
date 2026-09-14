# Stage 3 — Slice C (DB Integration + HANDOFF + AUDIT)

**Status**: **COMPLETE — 14/14 DB integration tests PASS** trên nhánh thử nghiệm mới `hrp_n3_v3` (Neon branch `br-billowing-meadow-azqpi3oo` tạo từ baseline `hrp-live`).

## Step C-01: DB integration test file

| File | Description |
|---|---|
| `tests/db/placement-lifecycle-integration.test.ts` | **14 case** (8 nguyên bản + 5 fix round-3 + 1 ENV_BLOCKED report) với `describeIf(HAS_TEST_DB)` + `describe('ENV_BLOCKED honest report', ...)`. Verify row, status, RLS, privilege, evidence persistence, PlacementCase closure. |
| `vitest.integration-files.ts` (M) | Whitelist entry: `'tests/db/placement-lifecycle-integration.test.ts'` |

## Step C-02: chạy DB integration trên nhánh thử nghiệm **mới tạo từ baseline**

`npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts`

**Kết quả: 14/14 PASS** — Round-3 review fixes verified:
- (i) `createPlacement → SELECTED; confirmPlacement → CONFIRMED` ✅
- (ii) `client-managed: SELECTED → CONFIRMED → EFFECTIVE with evidence` ✅ (evidence persisted + case CLOSED)
- (iii) `HRP-managed markPlacementEffective REJECT — N4 owns EFFECTIVE` ✅
- (iv) `retry cùng (case, opening) khi SELECTED → trả placement hiện tại (idempotent)` ✅
- (v) `sau FAILED: retry tạo Placement mới (index slot giải phóng)` ✅
- (vi) `FK chain broken → PlacementValidationError` ✅
- (vii) `RLS: HR_MANAGER GUC thấy rows; PUBLIC (no GUC) thấy 0 — FORCE RLS enforced` ✅
- (viii) `UNIQUE partial index race: concurrent INSERT cùng (case,opening) → both fulfilled, one winner one replayed` ✅
- **(ix) NEW: case-ownership mismatch → PlacementValidationError (N1 invariant)** ✅
- **(x) NEW: case CLOSED → PlacementValidationError** ✅
- **(xi) NEW: client-managed EFFECTIVE → evidence persisted to DB columns + PlacementCase closed SUCCESS** ✅
- **(xii) NEW: HRP-managed EFFECTIVE reject → case vẫn OPEN (atomic N4 boundary)** ✅
- **(xiii) NEW: app_user_writer DELETE bị REVOKE → placement lịch sử bất khả xóa** ✅
- ENV_BLOCKED honest report (tự bỏ qua khi `DATABASE_URL_TEST` có — đã pass)

**Test chạy trên nhánh mới `hrp_n3_v3`** (Neon branch `br-billowing-meadow-azqpi3oo`, endpoint `ep-aged-mode-azhomkea`, **tạo từ baseline `hrp-live`** theo yêu cầu review round-3).

## Step C-03: typecheck + full unit suite

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | 0 new errors (9 pre-existing errors trong `tests/db/intake-writer-integration.test.ts` baseline `40cd9d4`). |
| Full unit suite | `npx vitest run --config vitest.unit.config.ts` | **135 files, 2225/2225 PASS** (19 tests trong placement.service.test.ts bao gồm 5 fix round-3 mới). |

## Step C-04: HANDOFF

`docs/tasks/hrp-v6-n3-service-model-placement/HANDOFF.md` (UPDATED v0.3) — viết theo template N1: Control, Outcome, Acceptance evidence (20 AC), Open verification (N1 prod + admin intake vẫn MỞ), N4 boundary rõ, Deploy conditions cho Tier 0/Owner. Bao gồm **5 fix round-3 + 14 cases DB integration**.

## Step C-05: AUDIT (Tier 3 LIGHT)

`docs/tasks/hrp-v6-n3-service-model-placement/AUDIT.md` (UPDATED round 4) — verdict `CONDITIONAL — RECOMMENDED FOR MERGE`. Slice A + Slice B + Slice C review PASS đầy đủ. **Round-3 fixes**: (1) RLS row-level predicate luôn chạy, (2) case-ownership check trong createPlacement, (3) evidence persistence trong EFFECTIVE, (4) atomic PlacementCase closure, (5) DELETE privilege revoke.

## Step C-06: evidence

`evidence/stage0-contract/README.md` + `evidence/stage1-slice-a-schema/README.md` + `evidence/stage2-slice-b-service/README.md` + `evidence/stage3-slice-c-integration/README.md` (bản này).

## Step C-07: commit + push branch

Sau khi full unit suite PASS + DB integration 14/14 PASS, Tier 1 push branch `tier1/n3-service-model-placement` lên origin để Tier 0/Owner review.

- Tier 1 KHÔNG tự merge main.
- Tier 1 KHÔNG tự apply migration lên `hrp-live`.

## Round-3 review fixes verified

| Fix # | Issue | Fix | DB test |
|---|---|---|---|
| 1 | RLS role-based short-circuit bypass labor_profile_id match | HR roles cũng phải qua predicate `placement.placement_case_id → placement_case.labor_profile_id` | (vii) + (xiii) |
| 2 | `createPlacement` không verify case thuộc đúng LaborProfile | `findUnique(placementCase)` check laborProfileId match + ACTIVE status | (ix) + (x) |
| 3 | `markPlacementEffective` chỉ kiểm tra evidence, không lưu | 3 cột evidence persisted vào placement row (`evidence_acknowledged_at`, `by_user_id`, `ref`) | (xi) + (xii) |
| 4 | EFFECTIVE không đóng PlacementCase `SUCCESS` (AC-07) | `closePlacementCaseSuccess()` chạy atomic trong transaction sau EFFECTIVE | (xi) + (xii) |
| 5 | Race-loser trả `replayed:true` cho dù state khác | `replayed = winner.status === 'SELECTED'` (caller intent match) | (viii) |
| 6 | Migration cấp DELETE cho app_user_writer | `GRANT SELECT,INSERT,UPDATE` + `REVOKE DELETE` + `ALTER DEFAULT PRIVILEGES REVOKE DELETE` | (xiii) |
