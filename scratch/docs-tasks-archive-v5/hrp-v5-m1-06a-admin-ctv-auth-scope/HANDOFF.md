# HANDOFF: hrp-v5-m1-06a-admin-ctv-auth-scope

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-m1-06a-admin-ctv-auth-scope` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Current audit round | `0` (chưa audit) |
| Executor | `Tier 2 — Coding agent` |
| Baseline | `299614a` (MP-3C accepted); worktree bắt đầu sạch trong scope src/app, chỉ có thay đổi ngoài scope (`appBCC/**`, docs khác) do sếp. |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-08-25 Asia/Bangkok` |

## 1. Outcome Summary

Đã đóng toàn bộ business DB path dưới `app/api/admin/**` và `app/api/ctv/**` vào một boundary canonical duy nhất theo DEC-02/03/04.

- **Boundary canonical** `withAuthorizedDb(prisma, ctx, cb)` (`src/shared/auth/with-authorized-db.ts`, MỚI): `prisma.$extends(withAuthScope(ctx))` → `$transaction(tx ⇒ { applyRlsContext(tx, ctx); cb(tx); })`. Một request → L1 (scope extension) + L2 (4 GUC transaction-local) trong CÙNG transaction; callback throw ⇒ rollback.
- **L1 scope** cho 4 model mà hai route tree dùng: `User` (self `{id}`), `CtvWithdrawalRequest`/`CommissionLedger`/`CommissionDebt` (self `{ctvId: ctx.userId}`). ROOT_ROLES passthrough; non-root ngoài registry ⇒ `DENY_BY_DEFAULT` (fail-closed, gồm cả ACCOUNTANT).
- **3 handler P0 (EV-07)** đã đóng: `admin/users` (ADMIN-only qua boundary), `ctv/claims`, `ctv/withdrawals`. CTV read đi qua `withAuthorizedDb`; withdrawal CREATE đi qua `withDbContext` (L2-only) với ownership server-derived `ctvId: ctx.userId` (KHÔNG nhận từ body — DEC-06; create không đi L1 vì extension inject `where` sẽ vỡ `create` — RISK-01).
- **Static gate** `api-boundary.static.test.ts` quét 18 route.ts, chứng minh không handler nào chạy model op trên raw client; có negative fixture chứng minh gate CÓ RĂNG (AC-08).
- **LIVE security suite** `live-auth-scope.m1-06a.test.ts` (đăng ký integration lane): chứng minh L1 self-scope + L2 GUC + no-leak hai-CTV. Ở môi trường Tier 2 KHÔNG có test DB ⇒ `ENV_BLOCKED` (self-skip), KHÔNG ghi PASS giả (DEC-14/AC-09) — phần row-isolation LIVE để Tier 3 chạy trên test DB thật.

Chưa commit/push (không được TASK/sếp yêu cầu). Không đổi schema/migration/dependency/response contract.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-01`, `RQ-09` | Inventory: 14 `app/api/admin/**/route.ts` + 4 `app/api/ctv/**/route.ts` = 18 (khớp EV-04). `git status` scope sạch. | DONE | None |
| `STEP-02` | `RQ-02`, `RQ-04` | `src/shared/auth/with-authorized-db.ts` (MỚI); `scopes/ctv.scope.ts` +4 builder; `scopes/index.ts` đăng ký 4 model vào `SCOPE_REGISTRY`. | DONE | None |
| `STEP-03` | `RQ-03`, `RQ-04`, `RQ-05` | `app/api/ctv/{claims,withdrawals,summary,commission/summary}/route.ts` wire self-scope; withdrawal CREATE server-derived ownership; `summary` dùng `findFirst` (không `findUnique`). | DONE | Read qua L1+L2; CREATE qua L2-only (DEC-03, `create` không nhận `where`) — có ghi rõ, không phải scope-creep. |
| `STEP-04` | `RQ-03`, `RQ-05` | `app/api/admin/users/route.ts` wire `withAuthorizedDb` (ADMIN-only, giữ nguyên projection). Marketplace admin routes đã dùng L2 từ MP-2/MP-3, static gate xác nhận không raw op. | DONE | None — không đổi nghiệp vụ/role MP-3. |
| `STEP-05` | `RQ-06` | Log redaction trong route đã sửa; `amountVnd` giữ decimal-string; error chuẩn hóa (AuthScopeError ⇒ 403 generic, không lộ SQL/predicate). | DONE | None |
| `STEP-06` | `RQ-01`, `RQ-07` | `src/shared/auth/api-boundary.static.test.ts` (MỚI): gate 18 route + 2 negative + 2 positive fixture. | DONE | None |
| `STEP-07` | `RQ-08` | `src/shared/auth/live-auth-scope.m1-06a.test.ts` (MỚI); đăng ký `vitest.integration-files.ts` + flag `M1_06A_LIVE_AUTH_SCOPE` trong `vitest.integration.config.ts`, blank trong `vitest.unit.config.ts`. | DONE (ENV_BLOCKED tại Tier 2) | Không có test DB an toàn ⇒ self-skip; KHÔNG ghi PASS (AC-09). Tier 3 chạy trên test DB. |
| `STEP-08` | `RQ-08`, `RQ-09` | Chạy full gates + focused; ghi HANDOFF. | DONE | None |

## 3. Acceptance Evidence

**Mọi lệnh dưới đây đã chạy THẬT trên baseline hiện tại; Tier 3 chạy lại từng lệnh.** Output DB/secret không phát sinh (không kết nối DB thật ở lane này).

| AC | Command/check | Exit/result | Evidence summary | Limitation |
|---|---|---|---|---|
| — | `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-v5-m1-06a-admin-ctv-auth-scope\TASK.md` | `RESULT: PASS` (exit 0) | Contract 11 section + traceability hợp lệ (C-09). | None |
| `AC-01` | `find app/api/{admin,ctv} -name route.ts \| wc -l` + `npx vitest run ... api-boundary.static.test.ts` | 18 files (14 admin + 4 ctv); static 6/6 PASS (exit 0) | Sanity "≥10 route" PASS; 100% route qua boundary, `offenders = {}`. | None |
| `AC-02` | `npx vitest run --config vitest.unit.config.ts src/shared/auth/with-authorized-db.test.ts` | 4/4 PASS (exit 0) | Chứng minh `$extends`→`$transaction`→4 GUC (is_local, đúng key/value/thứ tự raw×4 trước model op), L1 AND-injection, throw⇒rollback nhưng GUC vẫn set, SALE⇒AuthScopeError. | None |
| `AC-03` | `npx vitest run ... api-boundary.static.test.ts` + source review 3 P0 handler | PASS (exit 0) | `expect(offenders).toEqual({})` trên 18 route; `admin/users`, `ctv/claims`, `ctv/withdrawals` không còn raw business op. | None |
| `AC-04` | `npx vitest run --config vitest.unit.config.ts src/shared/auth/scopes/ctv-account-scope.test.ts` | 13/13 PASS (exit 0) | CTV⇒self-scope; ROOT⇒`{}`; SALE/ACCOUNTANT/PM/MKT/HR_STAFF/WORKER/VENDOR_ADMIN/VENDOR_STAFF⇒`DENY_BY_DEFAULT`; User isolation `{id}`. | None |
| `AC-05` | Route-layer 401/403: `npm run test:unit` (gồm `ctv-summary.route.test.ts` SALE→403). Row-isolation CTV A/B + cross-scope: `live-auth-scope.m1-06a.test.ts`. | Unit PASS (exit 0); LIVE `ENV_BLOCKED` | 401/403 gate tầng HTTP đã test-covered. Row-isolation/cross-scope là LIVE. | **LIVE row-isolation chưa chạy tại Tier 2 (no test DB) — Tier 3 verify trên test DB thật.** |
| `AC-06` | `npm run test:unit` (54 files) + `npm run build` | 711/711 PASS (exit 0); build exit 0 | ADMIN + Marketplace queue/read/mutate + MP-3 assignment suites giữ nguyên behavior. | None |
| `AC-07` | `npm run test:unit` (gồm `ctv-summary.route.test.ts`, `money.test.ts`) | PASS (exit 0) | Log redacted (không token/phone/bank/SQL); `amountVnd` decimal-string; AuthScopeError⇒403 generic. | None |
| `AC-08` | `npx vitest run ... api-boundary.static.test.ts` (2 negative fixture) | PASS (exit 0) | `prisma.commissionLedger.findMany` và `getPrisma().ctvWithdrawalRequest.create` ⇒ detector trả non-empty (gate có răng); allowlist không wildcard. | None |
| `AC-09` | `npm run test:integration` (`scripts/ci/integration-preflight.mjs`) | `ENV_BLOCKED` (exit 0) | Preflight: "DATABASE_URL_TEST is not set... NOT run — this is a BLOCKED state, not a PASS." LIVE file đăng ký trong `vitest.integration-files.ts`, self-skip khi thiếu flag. | **Đúng thiết kế DEC-14: không có test DB ⇒ ENV_BLOCKED, KHÔNG masquerade PASS. Tier 3 chạy LIVE.** |
| `AC-10` | `npm run typecheck` / `test:unit` / `lint` / `build` / `test:integration` + `git diff --stat` | typecheck 0; unit 711 PASS 0; lint 473 warn / **0 error** 0; build 0; integration ENV_BLOCKED 0 | Diff: 11 modified + 5 new, KHÔNG schema/migration/dependency/secret/appBCC/unrelated. | Lint warnings theo policy `warn` hiện hữu (không `--max-warnings 0`); 0 error. |

## 4. Changed Deliverables

- **Source/artifact changed (11 modified):**
  - `app/api/admin/users/route.ts`, `app/api/ctv/claims/route.ts`, `app/api/ctv/commission/summary/route.ts`, `app/api/ctv/summary/route.ts`, `app/api/ctv/withdrawals/route.ts`
  - `src/domains/commission/ctv-summary.route.test.ts` (mock chuyển sang `withAuthorizedDb`, `findFirst`)
  - `src/shared/auth/scopes/ctv.scope.ts` (+4 builder), `src/shared/auth/scopes/index.ts` (đăng ký 4 model)
  - `vitest.integration-files.ts`, `vitest.integration.config.ts`, `vitest.unit.config.ts` (đăng ký + gate LIVE flag)
- **Source/artifact added (5 new):**
  - `src/shared/auth/with-authorized-db.ts` (boundary canonical)
  - `src/shared/auth/with-authorized-db.test.ts`, `src/shared/auth/scopes/ctv-account-scope.test.ts`, `src/shared/auth/api-boundary.static.test.ts`, `src/shared/auth/live-auth-scope.m1-06a.test.ts`
- **Dependency:** None (package.json không đổi).
- **Schema/migration:** None.
- **Environment/config:** Chỉ 3 file vitest (đăng ký test file + LIVE flag); không secret, không .env.
- **Git diff/commit:** 220 insertions / 73 deletions (scoped). **Chưa commit / chưa push** (không được yêu cầu).

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `LIM-01` | Limitation | `npm run test:integration` ⇒ `ENV_BLOCKED` exit 0; Tier 2 không có `DATABASE_URL_TEST` an toàn. | Phần LIVE của AC-05/AC-09 (row-isolation CTV A/B, L2/RLS backstop trên DB thật) chưa chạy tại Tier 2. Static + unit đã phủ L1/L2 wiring và route-layer 401/403. | Không cần quyết định. Tier 3 chạy LIVE trên test DB (DEC-14/AC-09 cho phép ENV_BLOCKED, cấm PASS giả). |
| `LIM-02` | Limitation | `npm run lint` ⇒ 473 warnings / 0 error. | Không chặn gate (policy `warn`, không `--max-warnings 0`). | None. |
| `DEV-01` | Deviation (có tài liệu) | Withdrawal CREATE đi `withDbContext` (L2-only) + `ctxId` server-derived, KHÔNG đi L1. | Theo DEC-03/RISK-01: L1 extension inject `where` sẽ vỡ Prisma `create`. Ownership vẫn khóa bằng `ctx.userId`, không nhận từ client (DEC-06). | None. |

Không có Blocker. Đủ điều kiện READY_FOR_AUDIT.

## 6. Evidence Index

Output ngắn đã đặt trực tiếp ở §3; không phát sinh artifact lớn/binary.

| Evidence | Path | Proves |
|---|---|---|
| `E-01` | `src/shared/auth/with-authorized-db.ts` + `.test.ts` | AC-02 boundary L1+L2 cùng tx, rollback |
| `E-02` | `src/shared/auth/api-boundary.static.test.ts` | AC-01/AC-03/AC-08 static gate có răng |
| `E-03` | `src/shared/auth/scopes/ctv-account-scope.test.ts` | AC-04 scope matrix + deny-by-default |
| `E-04` | `src/shared/auth/live-auth-scope.m1-06a.test.ts` | AC-05/AC-09 LIVE (Tier 3 chạy trên test DB) |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `READY_FOR_AUDIT` | Boundary canonical + 4 scope builder + đóng 3 P0 handler + static gate + LIVE suite. Full gates exit 0; LIVE lane ENV_BLOCKED (không có test DB, không masquerade PASS). |

> Handoff status: READY_FOR_AUDIT
