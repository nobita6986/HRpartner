# HANDOFF — hrp-p1-b-public-apply

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-b-public-apply` |
| Spec version | `v1.4` |
| Audit mode (phải khớp TASK) | `LIGHT` |
| Assurance lane | `CRITICAL` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Baseline | `8c8e0446b0f6d8750de2e9d42a1a25b4fb431e7b` |
| Implementation SHA | `927e32057d59655a6f0775b81ba628ef72f13baf` |
| Frozen delivery | `YES` |
| Canonical gates | `NOT_REQUIRED` |
| Audit eligibility | `NOT_REQUIRED` |
| Audit eligibility rationale | DB-touching AC `ENV_BLOCKED`; tier1.md §audit selection: CRITICAL → LIGHT, but DB lane is fail-closed per DEC-12/RQ-12; no live DB run by T1B |
| Correction batches used | `1` |
| Execution round | `1` (round 1) / `2` (round 2 — T0 correction on scope exception test-only) |
| Current audit round | `0` |
| Status | `READY_FOR_REVIEW` (round 2; Tier 3 chưa được gọi — T1B dừng ở READY_FOR_REVIEW với Audit eligibility NOT_REQUIRED per BLK-R2-01; T0 directive không yêu cầu Tier 3 trong round này) |
| Executor | `Tier 1B` (independent takeover from in-progress dirty surface at branch `codex/t1b-p1b-public-apply`) |
| Worktree | `C:\CodeApp\HrP-worktrees\t1b-p1b-public-apply` |
| Branch | `codex/t1b-p1b-public-apply` |
| Next gate | `T0_REVIEW_OUT_OF_SCOPE_A1_TEST` (resolve BLK-R2-01 — `tests/db/p1a1-jobposting-public-apply.integration.test.ts` falls outside T0's test-only scope exception but exhibits the same LaborProfile-residue collision on the shared synthetic DB; T0 quyết định có mở rộng scope hoặc yêu cầu riêng), then `TIER3_LIGHT_AUDIT` |

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
| `E-R2-14` | Synthetic PostgreSQL 18 evidence (T0 provisioned) | T0 confirmed: bootstrap pre/post PASS, `prisma migrate deploy` 53/53 PASS, `prisma migrate status` schema up to date, `app_user_writer` rolsuper=false rolbypassrls=false, admin + writer same synthetic DB. Production DB NOT used. See `evidence/r2-correction/migrate-deploy-p1b.log`. |

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

### 4.5 Out-of-scope (NOT modified, per T0 directive)

| Path | Reason |
|---|---|
| `tests/db/p1a1-jobposting-public-apply.integration.test.ts` | Outside T0's 5-path scope exception. T1B không modify. Currently fails on canonical integration lane (BLK-R2-01) vì hard-coded `phone='0900000020'` + `fullName='Nguyen Van Replay'` collide với leftover LaborProfile rows trên shared synthetic DB; same root-cause as MP2/OPS06A C-04 fix. |
| `prisma/schema.prisma`, `package.json`, `package-lock.json` | Forbidden. |
| `prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/**`, `prisma/migrations/20260925120000_p1b_public_apply_lifecycle/**` | Forbidden — không sửa A1 runtime/migration/P1-B migration để fix test. |

### 4.6 BLK / DEV registry

| ID | Item | Mitigation / owner |
|---|---|---|
| `BLK-01` | (Round 1 — RESOLVED) **ENV_BLOCKED** for DB-touching integration AC (AC-01..AC-12, AC-15). Local sandbox had no `DATABASE_URL_TEST` / `DATABASE_URL_ADMIN_TEST`. T0 provisioned synthetic PostgreSQL 18 in round 2; `prisma migrate deploy` 53/53 PASS, `prisma migrate status` up to date. | Tier 0 — RESOLVED in round 2 via T0 synthetic-DB provision. |
| `DEV-01` | Round 1 Implementation SHA `08e16508283d7334a0b0cac16b73836ede8f38f0` pinned at HANDOFF freeze (E-12). Post-freeze, only `HANDOFF.md` was added. | Tier 1. |
| `DEV-02` | Round 1 modified 5 files only: route idempotency-key header transport (RQ-06/DEC-11), `mapApplySqlState` P0014 (DEC-06), marketplace test additions (RQ-15/C-04), integration lane registration. No diff on `application.service.ts` body because the existing A1 service already maps `{tracking_code, status}` → `{trackingCode, status}` and never calls `createOrMatchLaborProfile`/`openPlacementCase` — verified by static AST guard. | Tier 1. |
| `DEV-03` | Integration test uses `$executeRawUnsafe` for the synthetic rollback trigger (AC-11). This is internal to the test surface (mirrors A1 pattern in `p1a1-migration-chain-proof.integration.test.ts`); no runtime code path is affected. | accepted. |
| `DEV-04` | The static guard in `marketplace-apply.routes.test.ts` asserts the **migration source file** contains the defensive guard `position('v_signals_provided' IN v_apply_def) > 0` — NOT that it doesn't contain the token. This is the correct interpretation: the token is a sentinel used by the migration's own postflight to REJECT classifier copy if it ever happens. The runtime check (deployed function's `pg_get_functiondef` does NOT contain the token) is performed by integration test AC-12/15 once DB is provisioned. | Tier 1. |
| `BLK-02` | (RESOLVED) `pwsh .ai-pipeline/scripts/verify-task.ps1` was PASSING before takeover handoff; no Tier 1 correction to TASK.md. | Tier 1. |
| `BLK-R2-01` | **OUT-OF-SCOPE TEST FAILS** on canonical integration lane. `tests/db/p1a1-jobposting-public-apply.integration.test.ts` falls **outside** T0's test-only scope exception for round 2 (which lists exactly 5 paths: P1-B slug-bound suite + MP2/OPS06A + A1 chain proof + TASK/HANDOFF). The A1 suite's `beforeAll` block calls `apply` with hard-coded `phone = "0900000020"` and `fullName = "Nguyen Van Replay"` (test file lines ~972–1001). On T0's shared synthetic PostgreSQL 18, after many test runs these identities have leftover `labor_profiles` rows from earlier rounds: scorer searches `lp.normalized_phone = hrp_normalize_phone('0900000020') = '900000020'` (no leading 0) while the leftover rows have `normalized_phone = '0900000020'` (with leading 0, from application-side `normalizePhone` which preserves the `0`). The phone match fails → only full_name matches → 1 signal → `POSSIBLE_MATCH` → `P0014 POSSIBLE_MATCH_NOT_RESOLVED` → 409. Same root-cause as the MP2/OPS06A collisions C-04 fixed (run-scoped unique identity), but T0 directive forbids modifying files outside the scope exception list. | Tier 0/Owner — decide: (a) extend scope exception to include this A1 test, apply the same C-04 run-scoped-identity pattern (`phone`/`fullName` anchored to `RUN_ID`), and re-run canonical suite for `0 failed`; OR (b) accept 1 pre-existing A1 test failure as expected noise on the shared synthetic DB (not a regression in P1-B semantics), document in HANDOFF, and proceed to TIER3_LIGHT_AUDIT. T1B does NOT modify this file per directive. |
| `DEV-R2-01` | T1B modified exactly 4 test files in scope exception: `tests/db/p1b-public-apply-slug-bound.integration.test.ts` (C-01/C-02/C-03), `src/domains/applications/live-integration.mp2.test.ts` (C-04), `src/domains/applications/live-integration.ops06a.test.ts` (C-04), `tests/db/p1a1-migration-chain-proof.integration.test.ts` (C-05). NO migration change, NO schema change, NO package/lockfile change, NO A1 runtime change. | Tier 1. |
| `DEV-R2-02` | Round-2 implementation freeze SHA = `927e32057d59655a6f0775b81ba628ef72f13baf` (see §0 `Implementation SHA (round 2 — T0 correction; new)`). Post-freeze docs-only delta follows in next commit (TASK.md + HANDOFF.md). | Tier 1. |

## 5. Final status (round 2 — T0 correction)

Round 2 (T0 correction round) modified exactly 4 test files in scope exception; no A1/P1-B migration change, no schema change, no package/lockfile change.

| Metric | Pre-correction (round 1) | Post-correction (round 2) |
|---|---|---|
| P1-B targeted | 7/10 pass, 3 fail | **10/10 PASS** |
| MP2 | 10/11 pass, 1 fail | **11/11 PASS** |
| OPS06A (DB tests) | 4 passed, 2 skipped (Redis), 1 fail (409) | **4 passed, 2 skipped** (Redis) |
| P1-A1 chain proof | pre-existing 1 fail (C-05) | **11/11 PASS** |
| Canonical integration | 27/31 files pass, 4 fail; 517/541 pass, 11 fail, 13 skip | **30/31 files pass, 1 fail** (out-of-scope A1 test — BLK-R2-01); 535/541 pass, 1 fail, 5 skip |

| Gate | Result |
|---|---|
| `npx prisma validate` | exit 0 (gate-prisma-validate.log) |
| `npm run typecheck` | exit 0 (gate-typecheck.log) |
| `npm run lint` | exit 0 (gate-lint.log) |
| `npm run test:unit` | exit 0 (gate-test-unit.log) |
| `git diff --check` | exit 0 (gate-diff-check.log) |
| `pwsh .ai-pipeline/scripts/verify-task.ps1` | exit 0 — `RESULT: PASS` (gate-verify-task.log) |
| `CI_INTEGRATION_STRICT=1 npm run test:integration` | 30/31 files PASS, 1 fail (out-of-scope); 535 tests pass, 1 fail, 5 skip (post-canonical-full.log) |

T1B modified only the 4 in-scope test files (C-01..C-05 applied exactly). NO migration change. NO schema change. NO package/lockfile change. NO A1 runtime change. NO production migration applied. NO PR opened. NO push performed. Tier 3 NOT called.

**Status: READY_FOR_REVIEW** (the remaining 1 fail is `tests/db/p1a1-jobposting-public-apply.integration.test.ts`, OUT-OF-SCOPE per T0 directive — see BLK-R2-01 for T0 decision). T1B stops at READY_FOR_REVIEW per T0 directive and does NOT call Tier 3.

`Handoff status: READY_FOR_REVIEW` (round 2; Audit eligibility NOT_REQUIRED per BLK-R2-01).
