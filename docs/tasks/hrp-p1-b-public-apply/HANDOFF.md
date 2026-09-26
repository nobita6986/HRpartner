# HANDOFF — hrp-p1-b-public-apply

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-b-public-apply` |
| Spec version | `v1.5` |
| Audit mode (phải khớp TASK) | `LIGHT` |
| Assurance lane | `CRITICAL` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Baseline | `8c8e0446b0f6d8750de2e9d42a1a25b4fb431e7b` |
| Implementation SHA | `0a403ef837656b89f6e87cfbbc87c515a3c7e318` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `ELIGIBLE` |
| Audit eligibility rationale | Tier 3 LIGHT PASS adopted; canonical integration 31/31 files with 541 passed, 0 failed and 2 pre-existing Redis skips; production migration, catalog postflight, writer-role smoke, main CI and Vercel production deployment all PASS. |
| Correction batches used | `1` |
| Execution round | `1` (round 1) / `2` (round 2 — T0 correction on C-01..C-05) / `3` (round 3 — T0 final correction: test-maintenance scope exception on `tests/db/p1a1-jobposting-public-apply.integration.test.ts` only) |
| Current audit round | `1` |
| Status | `ACCEPTED` |
| Executor | `Tier 1B` (independent takeover from in-progress dirty surface at branch `codex/t1b-p1b-public-apply`) |
| Worktree | `C:\CodeApp\HrP-worktrees\t1b-p1b-public-apply` |
| Branch | `codex/t1b-p1b-public-apply` |
| Next gate | `NONE — MERGED_AND_PRODUCTION_VERIFIED` |

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
| `E-12` | `git rev-parse --verify 08e16508283d7334a0b0cac16b73836ede8f38f0^{commit}` | exit `0` — Round 1 Implementation SHA resolves to commit `feat(p1-b): canonical slug-bound apply lifecycle via SECURITY DEFINER RPC` on branch `codex/t1b-p1b-public-apply`. Commit touches 7 files: 851 insertions, 13 deletions. |
| `E-13` | `git diff --name-only 8c8e0446b0f6d8750de2e9d42a1a25b4fb431e7b..HEAD` (post-docs-freeze) | Lists only `docs/tasks/hrp-p1-b-public-apply/HANDOFF.md` (this file). No semantic delta after Implementation SHA freeze. |
| `E-R2-01` | `CI_INTEGRATION_STRICT=1 npm run test:integration` (round 2; synthetic PostgreSQL 18; `DATABASE_URL_TEST`+`DATABASE_URL_ADMIN_TEST`+`MP2_LIVE_SECURITY_CHECK` set per `.env.t1b-synth.local`) | exit `1` — `Test Files 1 failed | 30 passed (31)`, `Tests 1 failed | 535 passed | 5 skipped (541)`. Single fail: `tests/db/p1a1-jobposting-public-apply.integration.test.ts` (out-of-scope, BLK-R2-01). See `docs/tasks/hrp-p1-b-public-apply/evidence/r2-correction/post-canonical-full.log`. |
| `E-R2-02` | `npx vitest run --config vitest.integration.config.ts tests/db/p1b-public-apply-slug-bound.integration.test.ts` (round 2 targeted P1-B) | exit `0` — `Tests 10 passed (10)` (`post-c01-p1b-final.log`). |
| `E-R2-03` | `npx vitest run --config vitest.integration.config.ts src/domains/applications/live-integration.mp2.test.ts` (round 2 targeted MP2) | exit `0` — `Tests 11 passed (11)` (`post-c04-mp2-v4.log`). |
| `E-R2-04` | `npx vitest run --config vitest.integration.config.ts src/domains/applications/live-integration.ops06a.test.ts` (round 2 targeted OPS06A DB lane; Redis lane requires env) | exit `0` — `Tests 4 passed | 2 skipped (6)` (`post-c04-ops06a-v2.log`). 2 skipped: Redis token EVAL preflight. |
| `E-R2-05` | `npx vitest run --config vitest.integration.config.ts tests/db/p1a1-migration-chain-proof.integration.test.ts` (round 2 targeted A1 chain proof) | exit `0` — `Tests 11 passed (11)` (`post-c05-a1chain.log`). |
| `E-R2-06` | `npx prisma validate` (round 2) | exit `0` (`gate-prisma-validate.log`). |
| `E-R2-07` | `npx tsc --noEmit` (round 2 typecheck) | exit `0` (`gate-typecheck.log`). |
| `E-R2-08` | `npm run lint` (round 2 lint) | exit `0` (`gate-lint.log`). |
| `E-R2-09` | `npm run test:unit` (round 2 full unit suite) | exit `0` (`gate-test-unit.log`). |
| `E-R2-10` | `git diff --check` (round 2) | exit `0` (`gate-diff-check.log`). |
| `E-R2-11` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-b-public-apply/TASK.md` (round 2) | exit `0` — `RESULT: PASS` (`gate-verify-task.log`). |
| `E-R2-12` | `git rev-parse --verify 927e32057d59655a6f0775b81ba628ef72f13baf^{commit}` (round 2 Implementation SHA) | exit `0` — Implementation SHA resolves to commit `test(p1-b): canonical integration correction round (C-01..C-05)` on branch `codex/t1b-p1b-public-apply`. Commit touches exactly 4 in-scope test files (239 insertions, 58 deletions); no migration change, no schema change, no package/lockfile change. |
| `E-R2-13` | `git status --porcelain` (round 2 post-implementation-freeze) | Lists exactly 4 `M` test files + 2 `M` doc files (`docs/tasks/hrp-p1-b-public-apply/{TASK.md,HANDOFF.md}`). UTF-8 no-BOM PASS on all 6. LF-only PASS on all 6. Forbidden paths (per TASK §0 list) all untouched. `prisma/schema.prisma` / `package.json` / `package-lock.json` 0-hit diff. |
| `E-R2-14` | Synthetic PostgreSQL 18 evidence (T0 provisioned) | T0 confirmed: bootstrap pre/post PASS, `prisma migrate deploy` 53/53 PASS, `prisma migrate status` schema up to date, `app_user_writer` rolsuper=false rolbypassrls=false, admin + writer same synthetic DB. Production DB NOT used. This inline result is the retained round-2 record; no external log path is claimed. |
| `E-R3-01` | `CI_INTEGRATION_STRICT=1 npm run test:integration` (round 3 final; synthetic DB; full canonical suite) | exit `0` — `Test Files 31 passed (31)`, `Tests 541 passed | 0 failed | 2 skipped (543)`. 0 failed. 2 skipped: Redis EVAL preflight (pre-existing, identified). Evidence: `docs/tasks/hrp-p1-b-public-apply/evidence/r3-correction/canonical-full.log`. |
| `E-R3-02` | `npx vitest run --config vitest.integration.config.ts tests/db/p1a1-jobposting-public-apply.integration.test.ts` (3 consecutive runs on synthetic DB) | Run 1: `Tests 18 passed (18)`. Run 2: `Tests 18 passed (18)`. Run 3: `Tests 18 passed (18)`. All 3 PASS with 0 residue collision. Evidence: `docs/tasks/hrp-p1-b-public-apply/evidence/r3-correction/a1-targeted-run-1.log`, `a1-targeted-run-2.log`, `a1-targeted-run-3.log`. |
| `E-R3-03` | `npx vitest run --config vitest.integration.config.ts tests/db/p1b-public-apply-slug-bound.integration.test.ts` (round 3 targeted P1-B) | exit `0` — `Tests 10 passed (10)`. Evidence: `docs/tasks/hrp-p1-b-public-apply/evidence/r3-correction/p1b-targeted.log`. |
| `E-R3-04` | `npx vitest run --config vitest.integration.config.ts src/domains/applications/live-integration.mp2.test.ts` (round 3 targeted MP2) | exit `0` — `Tests 11 passed (11)`. Evidence: `docs/tasks/hrp-p1-b-public-apply/evidence/r3-correction/mp2-targeted.log`. |
| `E-R3-05` | `npx vitest run --config vitest.integration.config.ts src/domains/applications/live-integration.ops06a.test.ts` (round 3 targeted OPS06A) | exit `0` — `Tests 4 passed | 2 skipped (6)`. 2 skipped: Redis EVAL preflight (pre-existing). Evidence: `docs/tasks/hrp-p1-b-public-apply/evidence/r3-correction/ops06a-targeted.log`. |
| `E-R3-06` | `npx vitest run --config vitest.integration.config.ts tests/db/p1a1-migration-chain-proof.integration.test.ts` (round 3 targeted A1 chain proof) | exit `0` — `Tests 11 passed (11)`. Evidence: `docs/tasks/hrp-p1-b-public-apply/evidence/r3-correction/a1chain-targeted.log`. |
| `E-R3-07` | `npx prisma validate` (round 3) | exit `0` |
| `E-R3-08` | `npx tsc --noEmit` (round 3 typecheck) | exit `0` |
| `E-R3-09` | `npm run lint` (round 3 lint) | exit `0` |
| `E-R3-10` | `npm run test:unit` (round 3 full unit suite) | exit `0` |
| `E-R3-11` | `git diff --check` (round 3) | exit `0` |
| `E-R3-12` | `pwsh .ai-pipeline/scripts/verify-task.ps1` (round 3) | exit `0` |
| `E-R3-13` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1` (round 3) | exit `0` |
| `E-R3-14` | `git rev-parse --verify 0a403ef837656b89f6e87cfbbc87c515a3c7e318^{commit}` (round 3 final Implementation SHA — `runPhone v2`) | exit `0` — Resolves to `test(p1-b): runPhone v2 — 2-digit scenario suffix + run-scoped prefix + unique invariant test` on branch `codex/t1b-p1b-public-apply`. `git show --numstat` reports `91\t10\ttests/db/p1a1-jobposting-public-apply.integration.test.ts`. Only the in-scope test file modified. No migration/schema/package/lockfile change. |
| `E-R3-15` | `git status --porcelain` (round 3 final pre-docs-freeze) | Lists exactly: `M tests/db/p1a1-jobposting-public-apply.integration.test.ts`, `M docs/tasks/hrp-p1-b-public-apply/TASK.md`, `M docs/tasks/hrp-p1-b-public-apply/HANDOFF.md`, plus regenerated `docs/tasks/hrp-p1-b-public-apply/evidence/r3-correction/*.log` and `.log.exit`. UTF-8 no-BOM PASS on all. LF-only PASS on all (no `git diff --check` violation). `prisma/schema.prisma` / `package.json` / `package-lock.json` 0-hit diff. |

## 4. Deviations and blockers

### 4.1 Pre-correction baseline (T0 evidence)

| Metric | Pre-correction |
|---|---|
| Synthetic PostgreSQL 18 provision | T0 confirmed: bootstrap pre/post PASS, `prisma migrate deploy` 53/53 PASS, `prisma migrate status` up-to-date, `app_user_writer` rolsuper=false rolbypassrls=false, admin+writer same synthetic DB. Production DB NOT used. |
| Canonical integration files | 31 files: 27 pass, 4 fail |
| Canonical integration tests | 541 tests: 517 pass, 11 fail, 13 skip |
| P1-B targeted | 7/10 pass, 3 fail |

### 4.2 Directives C-01..C-05 (test-only scope exception — 5 paths only)

| ID | Directive | File(s) modified | Result |
|---|---|---|---|
| `C-01` | Seed `normalizedPhone` qua `hrp_normalize_phone()` DB helper; assert scorer verdict EXACT_MATCH trước AC-02 / POSSIBLE_MATCH trước AC-04; không hạ P0014. | `tests/db/p1b-public-apply-slug-bound.integration.test.ts` | PASS — AC-02 EXACT_MATCH proven + AC-04 POSSIBLE_MATCH proven trước apply. |
| `C-02` | `expectServiceCode` capture rejection riêng, không swallow sentinel `Expected <code>`. | `tests/db/p1b-public-apply-slug-bound.integration.test.ts` | PASS — `expectServiceCode` tách try/finally capture, không throw sentinel bên trong try block. |
| `C-03` | AC-11 split `CREATE FUNCTION` + `CREATE TRIGGER` thành 2 `executeRawUnsafe` calls; cleanup fail-closed. | `tests/db/p1b-public-apply-slug-bound.integration.test.ts` | PASS — 2 lần `$executeRawUnsafe`, mỗi lần try/finally riêng, drop FUNCTION + TRIGGER nếu còn. Tránh SQLSTATE 42601 multi-statement. |
| `C-04` | MP2/OPS06A canonical JobOpening + PUBLISHED JobPosting fixture; run-scoped unique identity; giữ security/rate-limit/idempotency; không ép POSSIBLE_MATCH → success. | `src/domains/applications/live-integration.mp2.test.ts` (RUN_PHONE/RUN_NORM_PHONE anchored to RUN_ID + AC-04 explicit unique fullName); `src/domains/applications/live-integration.ops06a.test.ts` (idempotency-key UUID + unique fullName). | PASS — MP2 11/11; OPS06A 4 passed + 2 skipped (Redis). |
| `C-05` | `buildPredecessorStaging` chỉ copy migrations lexicographically strictly before `20260925000000_p1a1_canonical_apply_jobpostings`. | `tests/db/p1a1-migration-chain-proof.integration.test.ts` | PASS — A1 chain proof 11/11; proof tiếp tục xác nhận predecessor không chứa `job_postings`. |

### 4.3 Post-correction results

#### Round 3 (T0 final correction — test-maintenance scope exception)

| Suite | Result | Evidence |
|---|---|---|
| A1 targeted 3× consecutive (`tests/db/p1a1-jobposting-public-apply.integration.test.ts`) | **18/18 PASS** × 3 — 0 residue collision | `docs/tasks/hrp-p1-b-public-apply/evidence/r3-correction/a1-targeted-run-{1,2,3}.log` |
| P1-B targeted (`tests/db/p1b-public-apply-slug-bound.integration.test.ts`) | **10/10 PASS** | `docs/tasks/hrp-p1-b-public-apply/evidence/r3-correction/p1b-targeted.log` |
| MP2 (`src/domains/applications/live-integration.mp2.test.ts`) | **11/11 PASS** | `docs/tasks/hrp-p1-b-public-apply/evidence/r3-correction/mp2-targeted.log` |
| OPS06A (`src/domains/applications/live-integration.ops06a.test.ts`) | **4 passed, 2 skipped** (Redis pre-existing skip) | `docs/tasks/hrp-p1-b-public-apply/evidence/r3-correction/ops06a-targeted.log` |
| P1-A1 predecessor chain proof (`tests/db/p1a1-migration-chain-proof.integration.test.ts`) | **11/11 PASS** | `docs/tasks/hrp-p1-b-public-apply/evidence/r3-correction/a1chain-targeted.log` |
| Canonical integration (`CI_INTEGRATION_STRICT=1 npm run test:integration`) | **31/31 files PASS, 541 pass, 0 failed, 2 skipped** (Redis pre-existing skips) | `docs/tasks/hrp-p1-b-public-apply/evidence/r3-correction/canonical-full.log` |
| `npx prisma validate` | PASS exit 0 | gate logs |
| `npm run typecheck` | PASS exit 0 | gate logs |
| `npm run lint` | PASS exit 0 | gate logs |
| `npm run test:unit` (full) | PASS exit 0 | gate logs |
| `git diff --check` | PASS exit 0 | gate logs |
| `pwsh verify-task.ps1` | PASS exit 0 | gate logs |
| `pwsh verify-handoff.ps1` | PASS exit 0 | gate logs |

#### Round 2 (T0 correction C-01..C-05)

| Suite | Result | Evidence |
|---|---|---|
| P1-B targeted (`tests/db/p1b-public-apply-slug-bound.integration.test.ts`) | **10/10 PASS** | `docs/tasks/hrp-p1-b-public-apply/evidence/r2-correction/post-c01-p1b-final.log` |
| MP2 (`src/domains/applications/live-integration.mp2.test.ts`) | **11/11 PASS** | `docs/tasks/hrp-p1-b-public-apply/evidence/r2-correction/post-c04-mp2-v4.log` |
| OPS06A (`src/domains/applications/live-integration.ops06a.test.ts`) | **4 passed, 2 skipped** (Redis pre-existing skip) | `docs/tasks/hrp-p1-b-public-apply/evidence/r2-correction/post-c04-ops06a-v2.log` |
| P1-A1 predecessor chain proof (`tests/db/p1a1-migration-chain-proof.integration.test.ts`) | **11/11 PASS** | `docs/tasks/hrp-p1-b-public-apply/evidence/r2-correction/post-c05-a1chain.log` |
| Canonical integration (`CI_INTEGRATION_STRICT=1 npm run test:integration`) | **30/31 files pass, 1 fail** (out-of-scope `tests/db/p1a1-jobposting-public-apply.integration.test.ts` — see BLK-R2-01); 535 pass, 1 fail, 5 skip (vs 517/11/13 pre-correction). | `docs/tasks/hrp-p1-b-public-apply/evidence/r2-correction/post-canonical-full.log` |
| `npx prisma validate` | PASS exit 0 | `docs/tasks/hrp-p1-b-public-apply/evidence/r2-correction/gate-prisma-validate.log` |
| `npm run typecheck` | PASS exit 0 | `docs/tasks/hrp-p1-b-public-apply/evidence/r2-correction/gate-typecheck.log` |
| `npm run lint` | PASS exit 0 | `docs/tasks/hrp-p1-b-public-apply/evidence/r2-correction/gate-lint.log` |
| `npm run test:unit` (full) | PASS exit 0 | `docs/tasks/hrp-p1-b-public-apply/evidence/r2-correction/gate-test-unit.log` |
| `git diff --check` | PASS exit 0 | `docs/tasks/hrp-p1-b-public-apply/evidence/r2-correction/gate-diff-check.log` |
| `pwsh .ai-pipeline/scripts/verify-task.ps1` | PASS exit 0 | `docs/tasks/hrp-p1-b-public-apply/evidence/r2-correction/gate-verify-task.log` |

### 4.4 Changed surface (round 2 — only 4 files in scope exception)

| Path | Change |
|---|---|
| `tests/db/p1b-public-apply-slug-bound.integration.test.ts` | C-01/C-02/C-03 — derive `normalizedPhone` qua `hrp_normalize_phone(...)`, prove `EXACT_MATCH` verdict trước AC-02 + `POSSIBLE_MATCH` trước AC-04; `expectServiceCode` capture rejection riêng; AC-11 split `CREATE FUNCTION` + `CREATE TRIGGER` thành 2 `$executeRawUnsafe` calls với fail-closed cleanup. |
| `src/domains/applications/live-integration.mp2.test.ts` | C-04 — RUN_ID anchored RUN_PHONE / RUN_NORM_PHONE / RUN_FULL_NAME; AC-04 explicit unique fullName (anchored to RUN_ID) để tránh collision với leftover LaborProfile từ race test committed writes. |
| `src/domains/applications/live-integration.ops06a.test.ts` | C-04 — idempotency-key headers dùng `randomUUID()` (route `isUuidLike` gate); `getValidBody().fullName` anchored to RUN_ID để không collide với leftover LaborProfile rows trên shared synthetic DB. |
| `tests/db/p1a1-migration-chain-proof.integration.test.ts` | C-05 — `buildPredecessorStaging` chỉ copy migrations `entry.name < path.basename(A1_MIGRATION_DIR)` (lexicographically strictly before `20260925000000_p1a1_canonical_apply_jobpostings`); P1-B và các migration sau A1 KHÔNG lọt vào predecessor staging. |

### 4.5 Round-3 changed surface (T0 pre-audit freeze integrity correction — 1 file)

| Path | Change |
|---|---|
| `tests/db/p1a1-jobposting-public-apply.integration.test.ts` | T0 pre-audit directive §A: `runPhone` collision fix (v1 used 1-digit `scenarioIdx % 10`, scenarios 1 and 11 collided); v2 uses 2-digit zero-padded suffix + 6 run-scoped decimal digits → 13 unique 10-digit phones guaranteed for scenarios 1..13. Validation fail-closed (`Number.isInteger` → TypeError; `Number.isFinite` → RangeError; `[1, 99]` range → RangeError; output `/^09\d{8}$/` → Error). Two pure-invariant `it()` blocks added (no DB): uniqueness for 1..13 + validation rejects. No production runtime / migration / schema / package / lockfile / auth / RLS / P0014 changes. `git show --numstat 0a403ef` → `91	10	tests/db/p1a1-jobposting-public-apply.integration.test.ts`. |

### 4.6 Out-of-scope (NOT modified, per T0 directive)

| Path | Reason |
|---|---|
| `prisma/schema.prisma`, `package.json`, `package-lock.json` | Forbidden. |
| `prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/**`, `prisma/migrations/20260925120000_p1b_public_apply_lifecycle/**` | Forbidden — không sửa A1 runtime/migration/P1-B migration để fix test. |

### 4.7 BLK / DEV registry

| ID | Item | Mitigation / owner |
|---|---|---|
| `BLK-01` | (Round 1 — RESOLVED) **ENV_BLOCKED** for DB-touching integration AC (AC-01..AC-12, AC-15). Local sandbox had no `DATABASE_URL_TEST` / `DATABASE_URL_ADMIN_TEST`. T0 provisioned synthetic PostgreSQL 18 in round 2; `prisma migrate deploy` 53/53 PASS, `prisma migrate status` up to date. | Tier 0 — RESOLVED in round 2 via T0 synthetic-DB provision. |
| `DEV-01` | Round 1 Implementation SHA `08e16508283d7334a0b0cac16b73836ede8f38f0` pinned at HANDOFF freeze (E-12). Post-freeze, only `HANDOFF.md` was added. | Tier 1. |
| `DEV-02` | Round 1 modified 5 files only: route idempotency-key header transport (RQ-06/DEC-11), `mapApplySqlState` P0014 (DEC-06), marketplace test additions (RQ-15/C-04), integration lane registration. No diff on `application.service.ts` body because the existing A1 service already maps `{tracking_code, status}` → `{trackingCode, status}` and never calls `createOrMatchLaborProfile`/`openPlacementCase` — verified by static AST guard. | Tier 1. |
| `DEV-03` | Integration test uses `$executeRawUnsafe` for the synthetic rollback trigger (AC-11). This is internal to the test surface (mirrors A1 pattern in `p1a1-migration-chain-proof.integration.test.ts`); no runtime code path is affected. | accepted. |
| `DEV-04` | The static guard in `marketplace-apply.routes.test.ts` asserts the **migration source file** contains the defensive guard `position('v_signals_provided' IN v_apply_def) > 0` — NOT that it doesn't contain the token. This is the correct interpretation: the token is a sentinel used by the migration's own postflight to REJECT classifier copy if it ever happens. The runtime check (deployed function's `pg_get_functiondef` does NOT contain the token) is performed by integration test AC-12/15 once DB is provisioned. | Tier 1. |
| `BLK-02` | (RESOLVED) `pwsh .ai-pipeline/scripts/verify-task.ps1` was PASSING before takeover handoff; no Tier 1 correction to TASK.md. | Tier 1. |
| `BLK-R2-01` | **RESOLVED_BY_ROUND_3 — SUPERSEDED**. Round 2 pre-correction root cause (hard-coded `phone = "0900000020"` + `fullName = "Nguyen Van Replay"` colliding with leftover `labor_profiles` rows on T0's shared synthetic PostgreSQL 18) was eliminated in round 3 by switching every applicant identity in `tests/db/p1a1-jobposting-public-apply.integration.test.ts` to run-scoped deterministic generators (`runPhone` / `runFullName` / `runCccd` anchored to `runId = p1a1-${random12}`). In round 3 final (`runPhone v2`, semantic SHA `0a403ef8`), the phone format was tightened to a deterministic `09` + 6 run-scoped decimal digits + 2 zero-padded scenario-index digits — guaranteeing unique phones for scenarios 1..13 within a single run and across runs. Canonical integration now reports 0 failed (31/31 files PASS, 541/543 tests PASS, 0 failed, 2 Redis-skip pre-identified). FK-safe tracked teardown (`createdLaborProfileIds` / `createdPlacementCaseIds` / `createdSubmissionIds`) replaces any blanket delete. No production runtime / migration / schema / P0014 / P0012 / idempotency semantics changed. **Status of this blocker is RESOLVED; do not resurrect.** | Tier 1. |
| `DEV-R2-01` | T1B modified exactly 4 test files in scope exception: `tests/db/p1b-public-apply-slug-bound.integration.test.ts` (C-01/C-02/C-03), `src/domains/applications/live-integration.mp2.test.ts` (C-04), `src/domains/applications/live-integration.ops06a.test.ts` (C-04), `tests/db/p1a1-migration-chain-proof.integration.test.ts` (C-05). NO migration change, NO schema change, NO package/lockfile change, NO A1 runtime change. | Tier 1. |
| `DEV-R2-02` | Round-2 implementation freeze SHA = `927e32057d59655a6f0775b81ba628ef72f13baf` (see §0 `Implementation SHA (round 2 — T0 correction; new)`). Post-freeze docs-only delta follows in next commit (TASK.md + HANDOFF.md). | Tier 1. |


## 5. Pre-closeout status (round 3 final — T0 pre-audit freeze integrity correction)

Round 3 final (T0 pre-audit directive) applied test-maintenance scope exception to `tests/db/p1a1-jobposting-public-apply.integration.test.ts` only. The `runPhone` v1 (1-digit suffix) was tightened to `runPhone v2` (6 run-scoped decimal digits + 2 zero-padded scenario-index digits → 10 digits starting with `09`). This guarantees 13 unique phones for scenarios 1..13 within a single run, and no collision across runs. Validation now fails closed on non-integer / non-finite / out-of-range inputs. Two new pure-invariant tests (no DB) prove uniqueness and fail-closed behavior. Canonical integration: **31/31 files PASS, 541 tests PASS, 0 failed, 2 Redis-skip pre-identified**. No A1/P1-B migration change, no schema change, no package/lockfile change. No production migration applied. NO push, NO PR, NO merge, NO deploy. Tier 3 NOT called.

| Metric | Pre-correction (round 2) | Post-correction (round 3 final) |
|---|---|---|
| Canonical integration files | 30/31 files pass, 1 fail | **31/31 PASS** |
| Canonical integration tests | 535 pass, 1 fail, 5 skip | **541 pass, 0 failed, 2 skip** |
| A1 targeted | 0/18 PASS (P0014 collision) | **20/20 PASS × 3 consecutive** (includes 2 new pure-invariant tests) |
| P1-B targeted | 10/10 PASS | **10/10 PASS** |
| MP2 | 11/11 PASS | **11/11 PASS** |
| OPS06A (DB tests) | 4 passed, 2 skipped (Redis) | **4 passed, 2 skipped** (Redis) |
| P1-A1 chain proof | 11/11 PASS | **11/11 PASS** |

| Gate | Result |
|---|---|
| `npx prisma validate` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm run test:unit` | exit 0 |
| `git diff --check` | exit 0 |
| `pwsh .ai-pipeline/scripts/verify-task.ps1` | exit 0 |
| `pwsh .ai-pipeline/scripts/verify-handoff.ps1` | exit 0 |

`git show --numstat 0a403ef837656b89f6e87cfbbc87c515a3c7e318` → `91	10	tests/db/p1a1-jobposting-public-apply.integration.test.ts`. T1B modified only `tests/db/p1a1-jobposting-public-apply.integration.test.ts` in round 3 final scope exception. NO migration change. NO schema change. NO package/lockfile change. NO production migration applied. NO PR opened. NO push performed. Tier 3 NOT called. T1B stopped for T0 review.

**Historical freeze status: READY_FOR_AUDIT** (round 3 final; superseded by the `ACCEPTED` production closeout in §6).

`Handoff status: ACCEPTED` (Tier 3 LIGHT PASS adopted; merged, migrated and production-verified by T0; no further P1-B gate).

## 6. Production closeout

| Evidence | Result |
|---|---|
| Tier 3 audit adoption | Commit `14e95c31a7fbc9b52b59a34d74d65fadc5a4b442`; verdict PASS; P3 documentation/evidence debt remains non-blocking. |
| Merge | PR #51 squash-merged to `main` at `b59cd1d629d4e2e914d7a023d9ba4edb7ef4e569` on 2026-09-26. |
| Main CI | GitHub Actions run `36211911476` completed `success` for merge SHA `b59cd1d…`. |
| Production migration | `prisma migrate deploy` applied `20260925120000_p1b_public_apply_lifecycle`; production now records 53 completed migrations, exactly one completed P1-B record and zero incomplete migrations. |
| Catalog postflight | Apply function owner=`hrp_public_rpc`, `SECURITY DEFINER=true`, `search_path=public, pg_temp`; PUBLIC EXECUTE revoked; `app_user` and `app_user_writer` EXECUTE present; helper call retained; classifier not copied; no explicit SAVEPOINT; temporary schema CREATE and SET-role membership cleaned; no JobPosting/JobOpening mutation privilege gained. |
| Data preservation | `candidate_submissions` remained 10 and `job_postings` remained 0 across deploy/postflight. |
| Runtime smoke | Synthetic nonexistent slug invoked as `app_user_writer` inside rollback transaction; returned expected SQLSTATE `P0011` / `JOB_NOT_AVAILABLE`; no record was written. |
| Production deployment | Vercel deployment `6673675223` for merge SHA `b59cd1d…` completed `success`. |

P1-B is `ACCEPTED`. This closeout authorizes downstream planning to release the `WAIT_P1_B_ACCEPTED` dependency; it does not broaden P1-B scope or reopen runtime semantics.
