# HANDOFF — hrp-p1-b-public-apply

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-b-public-apply` |
| Spec version | `v1.3` |
| Audit mode (phải khớp TASK) | `LIGHT` |
| Assurance lane | `CRITICAL` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Baseline | `8c8e0446b0f6d8750de2e9d42a1a25b4fb431e7b` |
| Implementation SHA | `08e16508283d7334a0b0cac16b73836ede8f38f0` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `NOT_REQUIRED` (DB-touching AC `ENV_BLOCKED`; tier1.md §audit selection: CRITICAL → LIGHT, but DB lane is fail-closed per DEC-12/RQ-12; no live DB run by T1B) |
| Correction batches used | `0` |
| Execution round | `1` |
| Current audit round | `0` |
| Status | `BLOCKED` |
| Executor | `Tier 1B` (independent takeover from in-progress dirty surface at branch `codex/t1b-p1b-public-apply`) |
| Worktree | `C:\CodeApp\HrP-worktrees\t1b-p1b-public-apply` |
| Branch | `codex/t1b-p1b-public-apply` |
| Next gate | `T0_PROVISION_SYNTHETIC_DB` (resolve BLK-01, then `TIER3_LIGHT_AUDIT`) |

## 1. Outcome and changed surface

`hrp-p1-b-public-apply` tiếp quản canonical slug-bound public apply write chain từ P1-A1 baseline (đã ACCEPTED, production-verified) và mở rộng `hrp_public_apply_submission` thành một SECURITY DEFINER mutation authority duy nhất cho toàn chain: PUBLISHED+OPEN+bound-slot guard (giữ A1 RQ) → `hrp_score_labor_profile(text,text,text)` (KHÔNG copy classifier) → INSERT/reuse `LaborProfile` → INSERT/reuse `PlacementCase` qua PL/pgSQL exception-block subtransaction (KHÔNG explicit SAVEPOINT) → INSERT `CandidateSubmission` (vendor_id=ctv_id=NULL cho anon) → INSERT initial `application_status_history` (NULL→'NEW' PUBLIC_APPLY). Toàn chain rollback atomic khi bất kỳ bước nào fail. POSSIBLE_MATCH fail closed (`P0014 POSSIBLE_MATCH_NOT_RESOLVED`), zero `LaborProfile`/`PlacementCase`/`CandidateSubmission`/`application_status_history` rows trên nhánh fail.

Node runtime không gọi `createOrMatchLaborProfile`/`openPlacementCase`/tác vụ write nào khác — chỉ validate, normalize, hash, mint tracking code, gọi RPC, map `{trackingCode, status}`. KHÔNG `withIdempotency`/`idempotency_keys` cho slug-bound apply (DB-level idempotency trong RPC là authority duy nhất). Slug-bound apply KHÔNG đọc `hrp_aff` cookie. CV upload vẫn 422 `CV_UPLOAD_DISABLED`. n8n KHÔNG nằm trong canonical write path.

### Changed surface (5 modified + 2 new)

| Path | Change |
|---|---|
| `app/api/public/jobs/[slug]/applications/route.ts` | Modified (modify-only trên A1 baseline). Bỏ `idempotencyKey` body field + `x-idempotency-key` header fallback; `extractIdempotencyKey` chỉ đọc canonical `idempotency-key` header; thêm `isUuidLike` UUID format gate → 400 `IDEMPOTENCY_KEY_REQUIRED` khi thiếu/sai/malformed. Rate-limit IP/phone, shape gate, CV non-null 422, `submitPublicApplication` call site — không đổi. |
| `src/domains/applications/apply-helpers.ts` | Modified narrow delta: thêm `case 'P0014'` mapping `{ status: 409, error: 'POSSIBLE_MATCH_NOT_RESOLVED' }` trong `mapApplySqlState`. Semantics `P0010`/`P0011`/`P0012` không đổi. |
| `src/domains/applications/apply-helpers.test.ts` | Modified narrow: thêm 1 assertion cho `P0014` mapping. Tất cả assertion cũ còn nguyên. |
| `src/domains/applications/marketplace-apply.routes.test.ts` | Modified (mở rộng file hiện có — KHÔNG tạo file mới). Existing `idem-key-001` literal → canonical UUID. Thêm `it()` cho "chỉ nhận canonical Idempotency-Key header UUID; body fallback và x-header đều bị từ chối". Thêm `it()` cho `P0014 → 409 POSSIBLE_MATCH_NOT_RESOLVED` generic không leak. Thêm `describe.('P1-B static boundary')` với AST guards: route không dùng `withIdempotency`/`idempotency_keys`/`hrp_aff`/`createOrMatchLaborProfile`/`openPlacementCase`/raw-PII `console.log`; service chỉ gọi `hrp_public_apply_submission` và trả `{trackingCode, status}`; migration gọi `hrp_score_labor_profile(p_full_name, p_phone, p_cccd)`, chứa defensive guard `position('v_signals_provided' IN v_apply_def) > 0` (chống classifier copy ở pg_get_functiondef), KHÔNG match `^\s*SAVEPOINT\s/im`, và raise `P0014 POSSIBLE_MATCH_NOT_RESOLVED`. |
| `vitest.integration-files.ts` | Modified: thêm 1 entry cho `tests/db/p1b-public-apply-slug-bound.integration.test.ts` vào canonical integration lane. |
| `prisma/migrations/20260925120000_p1b_public_apply_lifecycle/migration.sql` | NEW forward-only migration. `CREATE OR REPLACE FUNCTION hrp_public_apply_submission(text,text,text,text,text,text,date,text,text,timestamptz,text,text,integer,text,text,text,text) RETURNS TABLE(tracking_code text, status text)` — exact signature unchanged. `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp`. Preflight assertions: `hrp_public_rpc` owner + `SECURITY DEFINER`, `hrp_score_labor_profile(text,text,text)` exists with owner/SECURITY DEFINER/`search_path=public, pg_temp`, partial unique index `placement_case_labor_profile_id_active_unique` exists, owner có SELECT/INSERT privileges trên `labor_profiles`/`placement_case`/`candidate_submissions`/`application_status_history`. Function body: idempotency replay/conflict → PUBLISHED+OPEN+bound-slot guard (preserved A1) → duplicate guard `P0012` → `BEGIN ... EXCEPTION WHEN unique_violation` block gọi `hrp_score_labor_profile(p_full_name, p_phone, p_cccd)`; `POSSIBLE_MATCH → P0014` fail closed trước khi INSERT; `EXACT_MATCH` reuse `LaborProfile`; `NEW_PROFILE` INSERT; nested `BEGIN ... EXCEPTION WHEN unique_violation` cho `placement_case` INSERT-or-reuse; INSERT `candidate_submissions` (vendor_id=ctv_id NULL, reason 'PUBLIC_APPLY'); INSERT `application_status_history` NULL→'NEW' PUBLIC_APPLY. Postflight: owner/SECURITY DEFINER/search_path preserved, EXECUTE ACL không có PUBLIC, EXECUTE granted to `app_user_writer`/`app_user`, `pg_get_functiondef` chứa `hrp_score_labor_profile` và KHÔNG chứa `v_signals_provided` và không match `\n\s*SAVEPOINT\s`; owner KHÔNG có INSERT/UPDATE/DELETE trên `job_postings`/`job_openings`; temporary role-grant/schema-create cleanup verified. |
| `tests/db/p1b-public-apply-slug-bound.integration.test.ts` | NEW synthetic-DB integration suite. ENV_BLOCKED (throw) khi `DATABASE_URL_TEST`/`DATABASE_URL_ADMIN_TEST` absent — KHÔNG fake PASS. Verifies migration applied via `_prisma_migrations`. Chains: `happy` (NEW_PROFILE), `exact` (seeded LaborProfile+active PlacementCase), `possible` (POSSIBLE_MATCH), `idem` (replay + payload mismatch), `race` (concurrent same-key), `duplicate` (P0012), `rollback` (synthetic trigger raises on history insert → assert zero new rows across all tables), `atomic` (unpublish race → JOB_NOT_AVAILABLE), plus DRAFT/ARCHIVED/FILLED guards. AC-12/15 catalog proof: pg_proc owner/SECURITY DEFINER/search_path + helper callable conformance `NEW_PROFILE`. Runtime role lane không set `app.role` GUC (mirror `aff03-public-intake.integration.test.ts`). |

## 2. Acceptance evidence

| AC | Evidence | Limitation |
|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath "docs/tasks/hrp-p1-b-public-apply/TASK.md"` exit 0 — `RESULT: PASS. TASK contract is ready for execution.` | E-09 |
| `AC-01` | Unit: `src/domains/applications/marketplace-apply.routes.test.ts` describe `RQ-05/RQ-09 — happy path giữ nguyên hợp đồng MP-2` → `201 chỉ trả trackingCode + status (không submissionId/PII)` PASS; `đi qua đúng SECURITY DEFINER function, một transaction duy nhất` PASS. Static AST guard: `service chỉ gọi canonical apply RPC và public result chỉ có trackingCode/status` PASS. Integration target: `tests/db/p1b-public-apply-slug-bound.integration.test.ts` `AC-01/03 happy NEW_PROFILE links submission, case, profile and initial history` — design verified, **NOT EXECUTED in this round** (BLK-01). | DB AC `ENV_BLOCKED` — see §4 BLK-01; integration test code is in place and statically validated. |
| `AC-02` | Unit: AST guard verifies service does NOT call `createOrMatchLaborProfile`/`openPlacementCase`; route does NOT call either; migration calls `hrp_score_labor_profile` canonical helper. Static guard `migration gọi helper canonical, defensive guard chống copy classifier, không phát explicit SAVEPOINT` PASS. Integration target: `AC-02 EXACT_MATCH reuses LaborProfile and active PlacementCase` — design verified, **NOT EXECUTED in this round** (BLK-01). | same as AC-01 |
| `AC-03` | Same as AC-01 (NEW_PROFILE first-time applicant covered by the same happy-path test). | same as AC-01 |
| `AC-04` | Unit: `src/domains/applications/marketplace-apply.routes.test.ts` `POSSIBLE_MATCH fail closed thành generic 409, không leak candidates/ID/PII` PASS; `apply-helpers.test.ts` `mapApplySqlState('P0014')` → `{status: 409, error: 'POSSIBLE_MATCH_NOT_RESOLVED'}` PASS. Static guard: migration contains `RAISE EXCEPTION 'POSSIBLE_MATCH_NOT_RESOLVED' USING ERRCODE = 'P0014'` PASS. Integration target: `AC-04 POSSIBLE_MATCH maps generic 409 and creates zero lifecycle rows` — design verified, **NOT EXECUTED in this round** (BLK-01). | same as AC-01 |
| `AC-05` | Unit: `SQLSTATE của definer vẫn map đúng mã lỗi MP-2 (duplicate ⇒ 409)` PASS (`P0012` → `DUPLICATE_APPLICATION`). Integration target: `AC-05 duplicate application remains P0012/409` — design verified, **NOT EXECUTED in this round** (BLK-01). | same as AC-01 |
| `AC-06` | Unit: AST guard verifies route only accepts canonical Idempotency-Key header UUID. Static guard verifies DB-level idempotency replay logic in migration. Integration target: `AC-06/07 DB idempotency replays same payload and rejects different payload` — design verified, **NOT EXECUTED in this round** (BLK-01). | same as AC-01 |
| `AC-07` | Same as AC-06. | same as AC-01 |
| `AC-08` | Static guard: migration exception-block subtransaction `EXCEPTION WHEN unique_violation` + unique-violation re-check on `candidate_submissions.idempotency_key_hash` PASS. Integration target: `AC-08 concurrent same-key yields one mutation and one replay result` — design verified, **NOT EXECUTED in this round** (BLK-01). | same as AC-01 |
| `AC-09` | Unit: existing A1 production-verified guard is preserved byte-for-byte (PUBLISHED JobPosting + OPEN JobOpening + bound slot + `(slots_needed - slots_filled) > 0`). Static guard verifies migration contains the guard. Integration target: `AC-09 A1 DRAFT/ARCHIVED/FILLED guards create zero lifecycle rows` — design verified, **NOT EXECUTED in this round** (BLK-01). | same as AC-01 |
| `AC-10` | Same as AC-09 (atomic revalidation in RPC). | same as AC-01 |
| `AC-11` | Static guard: outer `BEGIN ... EXCEPTION WHEN unique_violation` wraps the entire mutating lifecycle. Integration target: `AC-11 history failure rolls back profile, case and submission atomically` — synthetic trigger raises on `application_status_history` insert; assertion `{submissions: 0, histories: 0, laborProfiles: 0, placementCases: 0}` — design verified, **NOT EXECUTED in this round** (BLK-01). | same as AC-01 |
| `AC-12` | Static guard: migration preflight asserts `hrp_public_apply_submission` exists with owner/SECURITY DEFINER; postflight re-asserts owner/SECURITY DEFINER/search_path, EXECUTE ACL, `pg_get_functiondef` contains `hrp_score_labor_profile` and rejects `v_signals_provided` (classifier copy sentinel) and rejects explicit `SAVEPOINT`. Integration target: `AC-12/15 catalog pins authority and helper-based classifier without explicit SAVEPOINT` — design verified, **NOT EXECUTED in this round** (BLK-01). | same as AC-01 |
| `AC-13` | Unit: `src/domains/applications/marketplace-apply.routes.test.ts` describe `RQ-05/RQ-09 — happy path giữ nguyên hợp đồng MP-2` → `201 chỉ trả trackingCode + status (không submissionId/PII)` PASS; AST guard `service chỉ gọi canonical apply RPC và public result chỉ có trackingCode/status` PASS. Static guard: route does NOT import `withIdempotency`/`idempotency_keys`/`hrp_aff`/`createOrMatchLaborProfile`/`openPlacementCase`/raw-PII console. Runnable: `npm run test:unit -- src/domains/applications/marketplace-apply.routes.test.ts` (E-04) → 36 tests passed. | none |
| `AC-14` | Same as AC-13 (static guard covers `route không dùng withIdempotency/hrp_aff và không gọi Node lifecycle writers` + `service chỉ gọi canonical apply RPC`). | none |
| `AC-15` | Static guard: `migration gọi helper canonical, defensive guard chống copy classifier, không phát explicit SAVEPOINT` PASS — asserts `position('v_signals_provided' IN v_apply_def) > 0` defensive guard IS in migration AND `FROM hrp_score_labor_profile(p_full_name, p_phone, p_cccd)` IS in migration AND no `SAVEPOINT` statement. Integration target: AC-15 conformance via `hrp_score_labor_profile` NEW_PROFILE call PASS-by-design, **NOT EXECUTED in this round** (BLK-01). | same as AC-01 |
| `AC-16` | `git status --porcelain` lists only the 5 modified + 2 new files exactly matching §1 (E-08 scope proof). `git diff --check` exit 0. UTF-8 no-BOM verified on all 7 files (E-08). Lint exit 0 with 0 new warnings on modified/new files (E-03). Static guard verifies route does NOT touch `hrp_aff` cookie, NOT touch shared rich-text profile, NOT touch forbidden paths. `prisma/schema.prisma`/`package.json`/`package-lock.json` untouched. | none |

## 3. Evidence registry

| ID | Runnable command | Exit / measurement |
|---|---|---|
| `E-01` | `npx prisma validate` (with `DATABASE_URL` + `DATABASE_URL_ADMIN` placeholders) | exit `0` — `The schema at prisma/schema.prisma is valid 🚀` |
| `E-02` | `npm run typecheck` | exit `0` — `tsc --noEmit` PASS, 0 errors |
| `E-03` | `npm run lint` | exit `0` — repo-wide 707 warnings, 0 errors; 0 new warnings introduced on the 5 modified + 2 new files. Sole pre-existing warning in `apply-helpers.ts:22` (no-useless-escape) is on the phone-normalization regex, NOT on the new `case 'P0014'` delta. |
| `E-04` | `npm run test:unit -- src/domains/applications/apply-helpers.test.ts src/domains/applications/marketplace-apply.routes.test.ts` (targeted) | exit `0` — `Test Files 2 passed (2)` / `Tests 48 passed (48)`. Includes the new `POSSIBLE_MATCH fail closed thành generic 409, không leak candidates/ID/PII` test, the `chỉ nhận canonical Idempotency-Key header UUID` test, and the `P1-B static boundary` AST guard suite. |
| `E-05` | `npm run test:unit` (full) | exit `0` — `Test Files 169 passed (169)` / `Tests 2635 passed | 9 skipped (2644)`. |
| `E-06` | `npm run test:integration` (no `DATABASE_URL_TEST`/`DATABASE_URL_ADMIN_TEST`) | exit `0` — preflight prints `ENV_BLOCKED` then `Integration lane NOT run — this is a BLOCKED state, not a PASS.` No fake PASS. |
| `E-07` | `git diff --check` | exit `0` — no whitespace errors across the 5 modified files. |
| `E-08` | `git status --porcelain` + UTF-8 no-BOM check + LF-only check on the 7 changed/new files | `git status` lists exactly: `M app/api/public/jobs/[slug]/applications/route.ts`, `M src/domains/applications/apply-helpers.test.ts`, `M src/domains/applications/apply-helpers.ts`, `M src/domains/applications/marketplace-apply.routes.test.ts`, `M vitest.integration-files.ts`, `?? prisma/migrations/20260925120000_p1b_public_apply_lifecycle/`, `?? tests/db/p1b-public-apply-slug-bound.integration.test.ts`. UTF-8 no-BOM PASS on all 7. LF-only PASS on all 7. Forbidden paths (per TASK §0 Forbidden paths list, 18 paths checked) — all `untouched: <path>`. |
| `E-09` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath "docs/tasks/hrp-p1-b-public-apply/TASK.md"` | exit `0` — `RESULT: PASS. TASK contract is ready for execution.` |
| `E-10` | DB provenance + secret scan | `C:\cre_hrp.txt` exists (772 bytes), NEVER read by any P1-B path. `C:\CodeApp\HrP-worktrees\t1b-p1b-public-apply\.env` does NOT exist. `DATABASE_URL_TEST` / `DATABASE_URL_ADMIN_TEST` unset → integration preflight `ENV_BLOCKED`. No secret inlined, logged, or echoed anywhere in changed surface. |
| `E-11` | Catalog proof for `hrp_score_labor_profile(text,text,text)` + apply RPC | `prisma/migrations/20260919100000_aff03b_public_intake_rpc/migration.sql` lines 140, 526–528: `CREATE OR REPLACE FUNCTION hrp_score_labor_profile(text, text, text)` + `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE ... TO PUBLIC` + `ALTER FUNCTION ... OWNER TO hrp_public_rpc`. Migration `20260925120000_p1b_public_apply_lifecycle` preflight asserts `to_regprocedure('public.hrp_score_labor_profile(text,text,text)')` exists with owner `hrp_public_rpc` + `SECURITY DEFINER` + `search_path=public, pg_temp`. Catalog proof is in the migration's preflight DO block (lines 10–61) — runtime verification needs a live DB (BLK-01). |
| `E-12` | `git rev-parse --verify 08e16508283d7334a0b0cac16b73836ede8f38f0^{commit}` | exit `0` — Implementation SHA resolves to commit `feat(p1-b): canonical slug-bound apply lifecycle via SECURITY DEFINER RPC` on branch `codex/t1b-p1b-public-apply`. Commit touches 7 files: 851 insertions, 13 deletions. |
| `E-13` | `git diff --name-only 8c8e0446b0f6d8750de2e9d42a1a25b4fb431e7b..HEAD` (post-docs-freeze) | Lists only `docs/tasks/hrp-p1-b-public-apply/HANDOFF.md` (this file). No semantic delta after Implementation SHA freeze. |

## 4. Deviations and blockers

| ID | Item | Mitigation / owner |
|---|---|---|
| `BLK-01` | **ENV_BLOCKED** for DB-touching integration AC (AC-01..AC-12, AC-15). Local sandbox has no `DATABASE_URL_TEST` / `DATABASE_URL_ADMIN_TEST`; integration preflight (`scripts/ci/integration-preflight.mjs`) correctly emits `ENV_BLOCKED` (E-06) — NOT a fake PASS. The new `tests/db/p1b-public-apply-slug-bound.integration.test.ts` self-throws on missing env (mirror `aff03-public-intake.integration.test.ts` pattern). All DB-touching AC are **PASS-by-design**: integration test code is in place, statically validated by `verify-task.ps1` + `verify-handoff.ps1`, lint+typecheck clean, and unit tests pass. Runtime evidence pending T0 synthetic-DB provision. | Tier 0/Owner — provision `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST` against a dedicated test DB (NOT dev/prod, no production credential). Then re-run `CI_INTEGRATION_STRICT=1 npm run test:integration tests/db/p1b-public-apply-slug-bound.integration.test.ts` for the 12 it() cases. |
| `DEV-01` | Implementation SHA `08e16508283d7334a0b0cac16b73836ede8f38f0` is pinned at HANDOFF freeze (E-12). Post-freeze, only `HANDOFF.md` is added (E-13); no source/test/migration change. | Tier 1. |
| `DEV-02` | The 5 modified files contain only the narrow deltas needed for P1-B: route idempotency-key header transport (RQ-06/DEC-11), `mapApplySqlState` P0014 (DEC-06), marketplace test additions (RQ-15/C-04), and integration lane registration. No diff on `application.service.ts` body because the existing A1 service already maps `{tracking_code, status}` → `{trackingCode, status}` and never calls `createOrMatchLaborProfile`/`openPlacementCase` — verified by static AST guard. | Tier 1. |
| `DEV-03` | Integration test uses `$executeRawUnsafe` for the synthetic rollback trigger (AC-11). This is internal to the test surface (mirrors A1 pattern in `p1a1-migration-chain-proof.integration.test.ts`); no runtime code path is affected. | accepted. |
| `DEV-04` | The static guard in `marketplace-apply.routes.test.ts` asserts the **migration source file** contains the defensive guard `position('v_signals_provided' IN v_apply_def) > 0` — NOT that it doesn't contain the token. This is the correct interpretation: the token is a sentinel used by the migration's own postflight to REJECT classifier copy if it ever happens. The runtime check (deployed function's `pg_get_functiondef` does NOT contain the token) is performed by integration test AC-12/15 once DB is provisioned. | Tier 1. |
| `BLK-02` | (RESOLVED) `pwsh .ai-pipeline/scripts/verify-task.ps1` was PASSING before takeover handoff; no Tier 1 correction to TASK.md. | Tier 1. |

## 5. Final status

P1-B v1.3 implementation is FROZEN at `08e16508283d7334a0b0cac16b73836ede8f38f0` (Implementation SHA pinned in §0). All non-DB gates pass:

- `npx prisma validate` → exit 0 (E-01)
- `npm run typecheck` → exit 0 (E-02)
- `npm run lint` → exit 0 with 0 new warnings on changed surface (E-03)
- Targeted unit tests (`apply-helpers.test.ts` + `marketplace-apply.routes.test.ts`) → 48 passed (E-04)
- Full unit suite → 2635 passed, 9 skipped, 0 failed (E-05)
- Integration preflight → `ENV_BLOCKED` correctly (no fake PASS) (E-06)
- `git diff --check` → exit 0 (E-07)
- UTF-8 no-BOM + LF-only on all 7 changed/new files (E-08)
- `pwsh .ai-pipeline/scripts/verify-task.ps1` → `RESULT: PASS` (E-09)
- DB provenance: no secret read/logged/inlined; `cre_hrp.txt` untouched; no `.env` in worktree (E-10)
- Catalog proof for `hrp_score_labor_profile(text,text,text)` + apply RPC ownership/security/search_path via preflight + postflight assertions in the migration (E-11)
- Scope/forbidden-path proof: only 5 modified + 2 new files; 18 forbidden paths all untouched (E-08)
- Implementation SHA `08e16508283d7334a0b0cac16b73836ede8f38f0` resolves to commit; post-freeze docs-only delta (E-12, E-13)

DB-touching AC (AC-01..AC-12, AC-15) are **PASS-by-design** with **ENV_BLOCKED** runtime status (BLK-01). Tier 1 did not provision or use any production/Neon-staging credentials. The `tests/db/p1b-public-apply-slug-bound.integration.test.ts` suite is ready to run against T0's synthetic dedicated DB once `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST` are exported.

**Status: BLOCKED.** T0 must either:
1. Provision a synthetic dedicated DB (NOT Neon staging, NOT production) + run `CI_INTEGRATION_STRICT=1 npm run test:integration tests/db/p1b-public-apply-slug-bound.integration.test.ts`, OR
2. Promote BLOCKED → ACCEPTED on the basis of the PASS-by-design static + unit evidence (Tier 3 LIGHT/DELTA verdict required before any production migration is rolled out).

No production migration was applied. No PR was opened. No push was performed. Tier 3 was not called.

`Handoff status: BLOCKED`
