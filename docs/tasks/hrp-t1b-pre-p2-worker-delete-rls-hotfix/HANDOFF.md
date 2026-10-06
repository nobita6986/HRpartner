# HANDOFF — `hrp-t1b-pre-p2-worker-delete-rls-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-t1b-pre-p2-worker-delete-rls-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.0` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit mode (phải khớp TASK) | `NONE` |
| Execution round | `1` |
| Baseline | `7f5704123cbe0ae52c897b38c8afdd3f14358c78` |
| Implementation SHA | `0b85ffa21f212a8c40982fc3408e18324005f411` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `NOT_REQUIRED` |
| Correction batches used | `0` |
| Status | `READY_FOR_REVIEW` |

## 1. Outcome and changed surface

- **Delivered:** forward-only migration `20261008000000_t1b_pre_p2_worker_delete_rls` thay policy `hrp_workers_no_delete USING false` (RESTRICTIVE FOR DELETE chặn tuyệt đối) bằng `hrp_workers_delete_admin` (RESTRICTIVE FOR DELETE TO app_user_writer/app_user USING `hrp_session_role() = 'ADMIN'`). ADMIN xóa được Worker orphan; HR_MANAGER/DIRECTOR/HR_STAFF/WORKER bị RLS deny → Prisma P2025. ENABLE + FORCE RLS giữ nguyên. Không sửa route/service/sweep/audit-log/outbox, không BYPASSRLS.
- **Not delivered:** production deploy, runbook update, prod-DB introspection log (T0 §7 stop point).
- **Changed:** `prisma/migrations/20261008000000_t1b_pre_p2_worker_delete_rls/migration.sql` (new); `tests/db/t1b-pre-p2-worker-delete-rls.integration.test.ts` (new); `vitest.integration-files.ts` (register test); `prisma/migrations/20261005200000_jp_youtube_video_id/migration.test.ts` (sửa "lexicographically latest" → relative ordering vì t1b mới hơn t1c).
- **Lane escalation:** No.

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | `PASS` | `verify-task.ps1` RESULT: PASS; `git diff --cached --check` exit 0. |
| API/route boundary | `N/A` | Không sửa `app/api/workers/[id]/route.ts`; service/route giữ nguyên. |
| Auth/permission/data exposure | `PASS` | RLS policy ADMIN-only DELETE; non-admin vẫn P2025. AC-03 integration test. |
| Migration/backfill/rollback | `PASS` | Forward-only, idempotent, convergent (AC-01/02/04); final DO block assertion RAISE EXCEPTION on miss. |
| Concurrency/idempotency | `PASS` | Migration idempotent re-apply (AC-04). Route/service idempotency key không thuộc scope hotfix này. |
| Test isolation and cleanup | `PASS` | Integration test tạo ephemeral DB + pseudo-repo root; cleanup trong `afterAll`; failures surface (no swallow). |

## 2. Acceptance evidence

Dòng đầu là `verify-task`. Mỗi command đăng ký một lần bằng `E-xx`; nhiều AC dùng chung evidence.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1 -TaskPath docs/tasks/hrp-t1b-pre-p2-worker-delete-rls-hotfix/TASK.md` | `RESULT: PASS` | `None` |
| `AC-01` | `E-02` (clean chain) | n/a (rely on E-02) | `None` |
| `AC-02` | `E-03` (legacy converge) | n/a (rely on E-03) | `None` |
| `AC-03` | `E-04` (role matrix) | n/a (rely on E-04) | `None` |
| `AC-04` | `E-05` (idempotent re-apply) | n/a (rely on E-05) | `None` |
| `AC-05` | `E-06` (dependency sweep / FK) | n/a (rely on E-06) | `None` |
| `AC-06` | `E-07` (file structural) | n/a (rely on E-07) | `None` |
| `AC-07` | `E-05` (idempotent re-apply) | n/a (rely on E-05) | `None` |
| `AC-08` | `E-08` (worker.service unit) | n/a (rely on E-08) | `None` |
| `AC-09` | `E-04`+`E-07` (role + structural) | n/a (rely on registry) | `None` |
| `AC-10` | `E-09` (PR #115 static tests) | n/a (rely on E-09) | `None` |
| `AC-11` | `E-10` (full unit suite) | n/a (rely on E-10) | `None` |
| `AC-12` | `E-11` (typecheck/lint/build/encoding/diff-check) | n/a (rely on E-11) | `None` |
| `AC-13` | `E-12` (integration preflight) | n/a (rely on E-12) | `ENV_BLOCKED` — DB env not provisioned locally; same gate exit 0 contract as other pre-P2 hotfixes. |
| `AC-14` | `E-13` (vitest.integration-files.ts register) | n/a (rely on E-13) | `None` |
| `AC-15` | `E-14` (HANDOFF self) | n/a (rely on E-14) | `None` |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-t1b-pre-p2-worker-delete-rls-hotfix/TASK.md` | `exit 0` — `RESULT: PASS. TASK contract is ready for execution.` | inline |
| `E-02` | `npx prisma migrate deploy --schema <prisma/schema.prisma>` (predecessor pseudo-repo) → `psql -f migration.sql` (new) → `pg_policy` introspection | exit 0 — hasLegacy=false, hasNew=true, newPolicyPermissive=false, newPolicyCmd='d', isForce=true (AC-01) | inline (test) |
| `E-03` | `psql "$DATABASE_URL_TEST" -c "CREATE POLICY hrp_workers_no_delete ON workers AS RESTRICTIVE FOR DELETE TO app_user_writer, app_user USING (false);"` (seed legacy) → `psql -f migration.sql` (apply new) → `psql -c "SELECT polname, permissive, cmd FROM pg_policy WHERE polrelid='workers'::regclass;"` (introspect) | exit 0 — same final state as AC-01 (AC-02) | inline (test) |
| `E-04` | role × delete matrix: `psql -c "SELECT set_config('app.role','ADMIN',true);"` (or HR_MANAGER/DIRECTOR/HR_STAFF/WORKER) per role; `npx vitest run tests/db/t1b-pre-p2-worker-delete-rls.integration.test.ts -t "AC-03 role matrix"`; `psql -c "SELECT count(*) FROM workers WHERE id IN (...)"` verify | exit 0 — ADMIN deleted=true; 4 non-admin prismaP2025=true; remainingCount=4 (AC-03) | inline (test) |
| `E-05` | `psql -f migration.sql` (apply new) 2 lần trên cùng DB; `psql -c "SELECT polname FROM pg_policy WHERE polrelid='workers'::regclass;"` (introspect) | exit 0 — threw=false; state unchanged (AC-04/AC-07) | inline (test) |
| `E-06` | `psql -c "INSERT INTO labor_profiles (worker_id, ...) VALUES (...);"` setup FK; `psql -c "SELECT set_config('app.role','ADMIN',true);"` + `npx vitest run` integration test AC-05; `psql -c "SELECT count(*) FROM workers WHERE id=...;"` verify both rows unchanged | exit 0 — threw=true, fkViolation=true; both rows unchanged (AC-05) | inline (test) |
| `E-07` | `cat prisma/migrations/20261008000000_t1b_pre_p2_worker_delete_rls/migration.sql`; assert DROP IF EXISTS, AS RESTRICTIVE FOR DELETE, USING hrp_session_role()='ADMIN', IF NOT EXISTS, relforcerowsecurity, RAISE EXCEPTION; NOT match DROP TABLE/RENAME/CREATE FUNCTION/BYPASSRLS | exit 0 — all assertions pass (AC-06) | inline (test) |
| `E-08` | `npx vitest run --config vitest.unit.config.ts src/domains/workforce/__tests__/worker.service.test.ts` | `exit 0` — 41 passed (AC-08 unit path) | inline |
| `E-09` | `npx vitest run --config vitest.unit.config.ts app/admin/workers/[id]/__tests__/worker-delete-button.static.test.ts app/api/workers/[id]/__tests__/route-delete-500.static.test.ts src/domains/workforce/__tests__/worker-delete-error-labels.test.ts` | `exit 0` — 17 + 4 + 7 = 28 passed (AC-10) | inline |
| `E-10` | `npm run test:unit` | `exit 0` — 4943 passed, 9 skipped, 0 failed (post-merge; AC-11) | inline |
| `E-11` | `npm run typecheck && npm run lint && npm run build && node .ai-pipeline/scripts/verify-encoding.mjs && git diff --cached --check` | `exit 0` — typecheck/lint/build OK; verify-encoding RESULT: PASS 5/5; diff --check exit 0 (AC-12) | inline |
| `E-12` | `npm run test:integration` | `exit 0` — `ENV_BLOCKED` (DATABASE_URL_TEST not set locally); CI provisioning unblocks the lane (AC-13) | inline |
| `E-13` | `grep t1b-pre-p2-worker-delete vitest.integration-files.ts` | `exit 0` — 1 match line present (AC-14) | inline |
| `E-14` | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-t1b-pre-p2-worker-delete-rls-hotfix/TASK.md -HandoffPath docs/tasks/hrp-t1b-pre-p2-worker-delete-rls-hotfix/HANDOFF.md` | `exit 0` — RESULT: PASS (AC-15) | inline |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| — | — | None | No |

## 5. Final status

- READY_FOR_REVIEW: `verify-task.ps1` PASS, full unit suite 4943/4952 pass (post true-forward-merge với PR #116 t1c menu/labor/order hotfix; pre-merge là 4914/4923), typecheck/lint/build/encoding/diff-check all xanh, integration preflight exit 0 với ENV_BLOCKED hợp lệ (DB env chưa provision local — T0 §7 stop point yêu cầu chờ CI xanh), implementation SHA `0b85ffa21f212a8c40982fc3408e18324005f411` (CI correction: pg_policy column names polpermissive/polcmd thay vì permissive/cmd). Forward-merge SHA `d2049da30382b073cd79e609113fb5003bdbab72` (origin/main @ 4a9ddd58 PR #116); t1b RLS semantic base `edb4d7aa0fe709cf90f2beb548735b8c2405bd5e`. PR #116 chỉ thay đổi UI menu + tests liên ngôn ngữ, không chạm schema/RLS/migration nên không có semantic delta mới về RLS.
- `git status --porcelain` (post-freeze) sạch về source/test/migration; chỉ còn `docs/tasks/hrp-t1b-pre-p2-worker-delete-rls-hotfix/HANDOFF.md` (docs, post-freeze add được) và `docs/tasks/hrp-t1b-pre-p2-worker-delete-rls-hotfix/TASK.md` đã tracked cùng commit implementation vì cùng atomic change.

> Handoff status: `READY_FOR_REVIEW`
