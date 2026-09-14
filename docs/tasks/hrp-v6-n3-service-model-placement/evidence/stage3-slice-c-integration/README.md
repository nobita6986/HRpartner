# Stage 3 — Slice C (DB Integration + HANDOFF + AUDIT)

**Status**: **PENDING** — DB integration ENV_BLOCKED (DEC-13).

## Step C-01: DB integration test file

| File | Description |
|---|---|
| `tests/db/placement-lifecycle-integration.test.ts` | 8 case scaffold (i-viii) với `describe.skipIf(!HAS_TEST_DB)` + ENV_BLOCKED honest report. |
| `vitest.integration-files.ts` (M) | Whitelist entry: `'tests/db/placement-lifecycle-integration.test.ts'` |

## Step C-02: chạy DB integration

`npx vitest run --config vitest.integration.config.ts tests/db/placement-lifecycle-integration.test.ts`

**Expected result**: **ENV_BLOCKED** — `DATABASE_URL_TEST` không có trong môi trường Tier 1. Theo DEC-13: ENV_BLOCKED là báo cáo trung thực, KHÔNG đủ điều kiện merge/deploy. Tier 0/Owner cung cấp DB test (`hrp_mp2_test` branch hoặc tương đương) trước khi xét merge.

## Step C-03: typecheck + full unit suite

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | 2 errors pre-existing (taxonomy-unit + reconciliation-unit thiếu `@/tests/fixtures/operations` — baseline `40cd9d4`). 0 new errors. |
| Full unit suite | `npx vitest run --config vitest.unit.config.ts` | Tier 1 chạy trước push (hiện tại Talent lane 9 files / 103 tests PASS; full suite 132 files sẽ chạy lúc final commit). |

## Step C-04: HANDOFF

`docs/tasks/hrp-v6-n3-service-model-placement/HANDOFF.md` (NEW) — viết theo template N1: Control, Outcome, Acceptance evidence (22 AC), Open verification (N1 prod + admin intake vẫn MỞ), N4 boundary, Deploy conditions cho Tier 0/Owner.

## Step C-05: AUDIT (Tier 3 LIGHT)

`docs/tasks/hrp-v6-n3-service-model-placement/AUDIT.md` (NEW) — verdict `PENDING_FINAL_DIFF`. Slice A + Slice B review PASS đầy đủ. Slice C DB integration chưa chạy được → chờ Tier 0/Owner cung cấp `DATABASE_URL_TEST` để Tier 1 chạy 8 cases → Tier 3 chốt final verdict (PASS / CONDITIONAL / BLOCKED).

## Step C-06: evidence

`evidence/stage0-contract/README.md` + `evidence/stage1-slice-a-schema/README.md` + `evidence/stage2-slice-b-service/README.md` + `evidence/stage3-slice-c-integration/README.md` (bản này).

## Step C-07: commit + push branch

Sau khi full unit suite PASS ở final commit, Tier 1 push branch `tier1/n3-service-model-placement` lên origin để Tier 0/Owner review.

- Tier 1 KHÔNG tự merge main.
- Tier 1 KHÔNG tự apply migration lên `hrp-live`.

## Outstanding for verdict

- **I-03**: 8 DB integration cases chạy PASS trên nhánh thử nghiệm (chờ `DATABASE_URL_TEST`).
- **T-03**: Full unit suite 132 files PASS (Tier 1 chạy trước final push).
