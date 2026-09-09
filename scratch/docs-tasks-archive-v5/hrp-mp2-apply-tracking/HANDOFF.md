# HANDOFF: hrp-mp2-apply-tracking

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-mp2-apply-tracking` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.2` |
| Execution round | `3` |
| Current audit round | `1` |
| Executor | `Tier 2` |
| Baseline | `5d75011` (docs-only delta từ `ead9869`; code baseline không đổi). Worktree khi bắt đầu đã dirty với MP-1/M13 + Phase-5 WIP + `appBCC` deletions — tất cả GIỮ NGUYÊN, không thuộc MP-2. |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-08-24 12:40 +07:00` |

## 1. Outcome Summary

**Round 3 (evidence-only) — ĐÃ THU ĐỦ EVIDENCE LIVE → `READY_FOR_AUDIT`.** Sếp cung cấp DB test AN TOÀN (`C:\CodeApp\Salary-app\.env.mp2-test.local`, Neon branch host `ep-empty-forest-azlhfyo9`, KHÁC host prod) đã apply migration MP-2 + provision role `hrp_public_rpc`. Theo directive round 3: (1) nạp file env test; (2) map `DATABASE_URL_ADMIN=DATABASE_URL_ADMIN_TEST`, `DATABASE_URL=DATABASE_URL_TEST`; (3) sửa harness để `.env` KHÔNG ghi đè biến đã truyền (chỉ set khi chưa tồn tại); (4) bật `MP2_LIVE_SECURITY_CHECK=1`; (5) chạy role-scope + idempotency/concurrency + DB row assertions. Toàn bộ AC còn PARTIAL/ENV_BLOCKED sau audit round 1 (AC-01/02/03/04/05/09) NAY XANH bằng evidence LIVE trên ranh giới SECURITY DEFINER RPC + RLS thật (không mock). `BLK-02` được GỠ (tiền đề round 3 đã có).

**LIVE closure (2 file, DB test):** `23 passed (23)` — `security-boundary.mp2.test.ts` 12/12 (8 STATIC + 4 LIVE AC-09: pg_roles/pg_proc introspection, EXECUTE-grant listing, negative direct-INSERT) + `live-integration.mp2.test.ts` 11/11 (AC-02/03/04/05 behaviour/row/concurrency/scope). Mọi tác động DB nằm trong `BEGIN…ROLLBACK` hoặc dọn sạch trong `finally` (race commit) → DB test để lại pristine. Chi tiết + lệnh tái lập ở §3.

**Faithfulness — LIVE chạy trên DB TEST, KHÔNG phải prod.** Cấp DB an toàn + apply migration + OP-01 provisioning trên DB test do sếp làm (đúng DEC-09/DEC-14, owner=sếp). Prod apply/provision vẫn là OP owner=sếp tại cutover (Phase-5 STEP-02) — ngoài phạm vi round này. Không sửa kiến trúc/source round 2 (đúng chỉ thị Planner v1.2 — không LIVE test nào phát hiện lỗi source). Thay đổi round 3 CHỈ ở tầng test-harness (được directive step 3 ủy quyền đích danh) + 1 file evidence LIVE mới.

**Round 2 (giữ nguyên — record):** triển khai đầy đủ MP-2 Apply + Tracking + HR Queue trên ranh giới SECURITY DEFINER RPC (DEC-08), đóng blocker round-1 `BLK-01`. Không tự ghi audit verdict.

- **STEP-01 (RQ-01/09):** migration additive `20260823101500_mp2_apply_tracking` — thêm cột slot/tracking/idempotency/consent/CV-metadata vào `candidate_submissions`; bảng mới `application_status_history`; index (unique tracking code, unique idempotency key, partial-unique duplicate-guard slot+phone). CÙNG migration tạo 2 hàm `SECURITY DEFINER` `hrp_public_apply_submission` / `hrp_public_tracking_projection`, `OWNER TO hrp_public_rpc`, `REVOKE EXECUTE FROM PUBLIC`, `GRANT EXECUTE` chỉ cho `app_user_writer`/`app_user`, pinned `SET search_path = public, pg_temp`. KHÔNG `CREATE ROLE` trong migration. Ship script OP-01 `scripts/create-public-rpc-role.cjs`.
- **STEP-02 (RQ-02/03/09):** `application.service.ts` gọi hàm definer qua `$queryRawUnsafe`, map SQLSTATE→409; idempotency hash + duplicate-guard trong hàm/transaction; GỠ side-effect tạo `SourceClaim`/`Worker` khỏi path anonymous.
- **STEP-03 (RQ-04/06):** tracking DTO allow-list qua `hrp_public_tracking_projection` (`getPublicTracking`), generic 404, rate-limit hook; status-machine NEW↔NEEDS_INFO; history append-only.
- **STEP-04 (RQ-05):** route `app/api/admin/applications` (+`/[id]`, `/[id]/status`) dùng `withDbContext` + scope; roles DEC-06 (ADMIN/HR_MANAGER/DIRECTOR/SALE); 403 role ngoài scope.
- **STEP-05 (RQ-07):** UI mới tiêu thụ API MP-2 — `app/(jobs)/jobs/page.tsx`, `app/(jobs)/track/page.tsx`, `app/admin/applications/page.tsx`. KHÔNG đụng file Phase-5.
- **STEP-07 (RQ-09):** `security-boundary.mp2.test.ts` — STATIC + LIVE introspection (nay LIVE XANH).
- **OP-01 (owner: sếp):** Tier 2 ship script; role provisioning trên dev + DB test do sếp làm.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `OP-01` | `RQ-09` | `scripts/create-public-rpc-role.cjs` (owner: sếp) | `DONE (LIVE verified)` | Role `hrp_public_rpc` NOLOGIN+BYPASSRLS xác nhận LIVE trên DB test (AC-09). |
| `STEP-01` | `RQ-01/09` | `prisma/schema.prisma`, `.../20260823101500_mp2_apply_tracking/migration.sql` | `DONE (LIVE verified)` | Migration applied trên DB test; cột/bảng/hàm/index tồn tại & hoạt động (LIVE seed + apply). |
| `STEP-02` | `RQ-02/03/09` | `application.service.ts`, `apply-helpers.ts`, `staffing/submission.service.ts`, `app/api/public/jobs/[slug]/applications/route.ts` | `DONE (LIVE verified)` | Anonymous path: 1 submission + 1 history, KHÔNG Worker/SourceClaim (AC-02 LIVE). |
| `STEP-03` | `RQ-04/06` | `application.service.ts` (`getPublicTracking`), `status-machine.ts`, `rate-limit.ts`, `app/api/public/applications/[trackingCode]/route.ts` | `DONE (LIVE verified)` | Projection allow-list 6 cột, no PII; unknown → 0 rows (AC-04 LIVE). |
| `STEP-04` | `RQ-05` | `application-queue.service.ts`, `app/api/admin/applications/route.ts` (+`/[id]`, `/[id]/status`) | `DONE` | `withDbContext` + scope, roles DEC-06 (unit 22 tests); RLS floor LIVE AC-05. |
| `STEP-05` | `RQ-07` | `app/(jobs)/jobs/page.tsx`, `app/(jobs)/track/page.tsx`, `app/admin/applications/page.tsx` | `DONE` | UI MP-2; file Phase-5 giữ nguyên. |
| `STEP-07` | `RQ-09` | `src/domains/applications/security-boundary.mp2.test.ts` | `DONE (STATIC + LIVE)` | LIVE introspection + negative direct-INSERT nay XANH (AC-09). |
| `STEP-06` | `RQ-08` | regression suite + HANDOFF | `DONE` | MP-1 contract xanh; legacy apply không tạo Worker/SourceClaim. |

**Round 3 (evidence-only) — trace:**

| STEP round 3 | Mục tiêu | Result | Ghi chú |
|---|---|---|---|
| `R3-HARNESS` | Directive 1–3: nạp env test, map var, sửa harness không cho `.env` ghi đè biến đã truyền | `DONE` | `vitest.config.ts` (`test.env.DATABASE_URL` = `process.env.DATABASE_URL ?? <repo .env fallback>`) + gap-fill loop trong 2 test file (`if undefined`) — chỉ FILL GAP, không clobber. Chi tiết §4. |
| `R3-LIVE-SEC` | AC-09 LIVE: `MP2_LIVE_SECURITY_CHECK=1` → pg_roles/pg_proc + grant + negative INSERT | `DONE (4/4)` | Trên DB test đã apply+provision. §3. |
| `R3-LIVE-DB` | AC-02/03 LIVE: DB row assertions + idempotency/concurrency thật | `DONE (9/9)` | Bao gồm REAL N=5 race → đúng 1 row. §3. |
| `R3-LIVE-SCOPE` | AC-05 LIVE: RLS read-scope floor (privileged vs out-of-scope) | `DONE (1/1)` | 13 role. §3. |
| `R3-LIVE-PROJ` | AC-04 LIVE: tracking projection allow-list + unknown→0 | `DONE (2/2)` | §3. |
| `R3-SRC` | Sửa source nếu LIVE phát hiện lỗi | `N/A (không phát hiện lỗi)` | Source round 2 giữ nguyên (đúng chỉ thị Planner v1.2). |

## 3. Acceptance Evidence

**Round 3 LIVE (2026-08-24) — chạy THẬT trên DB test AN TOÀN. Masked: chỉ in `protocol//host/db`, KHÔNG user/pass/query-string.**

Fingerprint DB test (runner in ra, không có credential): `postgresql://ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech/neondb` — KHÁC host prod trong repo `.env`. Env inject: `DATABASE_URL_ADMIN` ← `DATABASE_URL_ADMIN_TEST`, `DATABASE_URL`/`DATABASE_URL_WRITER` ← `DATABASE_URL_TEST`, `MP2_LIVE_SECURITY_CHECK=1`.

| AC | Command (LIVE) | Exit/result | Evidence LIVE (masked) |
|---|---|---|---|
| `AC-09` | LIVE `security-boundary.mp2.test.ts` (4 LIVE tests) | `PASS 4/4` | `hrp_public_rpc` = `rolcanlogin=false` + `rolbypassrls=true`; 2 hàm `prosecdef=true` owner `hrp_public_rpc`; EXECUTE: `public=false`, `app_user_writer=true`, `app_user=true`; NEGATIVE — `app_user_writer` dưới `app.role='WORKER'` direct-INSERT `candidate_submissions` bị RLS từ chối (`rejects.toThrow`). |
| `AC-02` | LIVE `live-integration.mp2.test.ts` — apply hợp lệ + rejection loop | `PASS` | Apply anonymous (app.role='') qua `hrp_public_apply_submission` → đúng 1 `candidate_submissions` (vendor_id/ctv_id/merged/dedup = NULL) + đúng 1 `application_status_history` (from=NULL→NEW, actor=NULL, reason=`PUBLIC_APPLY`) + 0 `source_claims`. Reject private/draft/closed/expired/full → `P0011` (5/5 case). |
| `AC-03` | LIVE idempotency/concurrency (6 tests) | `PASS` | Replay cùng key+payload → cùng tracking, 1 row; key + payload khác → `P0010`; slot+phone trùng (key khác) → `P0012`; unique index `candidate_submissions_idempotency_key_hash_key` + partial `uq_candidate_active_slot_phone` tồn tại; direct dup-insert cùng key → `23505`; **REAL N=5 concurrent same-key applies → đúng 1 row** (mọi winner replay cùng tracking). |
| `AC-04` | LIVE tracking projection (2 tests) | `PASS` | `hrp_public_tracking_projection` trả ĐÚNG allow-list 6 cột `[job_code, job_title, position_title, status, submitted_at, tracking_code]`; 0 cột PII (phone/cccd/cv_key/note/vendor/ctv/actor…); unknown code → 0 rows (generic not-found, không lộ tồn tại). |
| `AC-05` | LIVE RLS read-scope (1 test, 13 role) | `PASS` | Floor USING: `ADMIN/HR_MANAGER/DIRECTOR/SALE/ACCOUNTANT` thấy row unscoped (n=1); `WORKER/VENDOR_ADMIN/VENDOR_STAFF/CTV/PM/MKT/HR_STAFF/''` KHÔNG thấy (n=0). App-layer queue gate DEC-06 (4 role, không ACCOUNTANT) = `application-queue.service.test.ts` 22 tests (mode mặc định). |
| `AC-01` | (hệ quả LIVE) migration applied trên DB test | `PASS (implied)` | LIVE seed dùng đúng cột mới + gọi được 2 hàm definer → migration additive `20260823101500` đã apply sạch trên DB thật, object tồn tại & hành xử đúng. Bổ trợ round 2: `npx prisma validate` exit `0`. |

**Lệnh LIVE tổng (fresh, 2026-08-24 12:36):**

```
DATABASE_URL_ADMIN=<TEST_ADMIN> DATABASE_URL=<TEST> DATABASE_URL_WRITER=<TEST> MP2_LIVE_SECURITY_CHECK=1 \
  npx vitest run src/domains/applications/live-integration.mp2.test.ts src/domains/applications/security-boundary.mp2.test.ts
→ Test Files  2 passed (2)
       Tests  23 passed (23)      # 11 live-integration + 12 security-boundary (4 LIVE + 8 STATIC)
```

**Tái lập cho Tier 3 (KHÔNG cần script temp — đã xoá):** đặt 3 biến từ file env test của sếp rồi chạy đúng lệnh trên. Mapping: `DATABASE_URL_ADMIN`=`DATABASE_URL_ADMIN_TEST`, `DATABASE_URL`=`DATABASE_URL`_`WRITER`=`DATABASE_URL_TEST`, `MP2_LIVE_SECURITY_CHECK=1`. (Runner tạm `_mp2_live_runner.cjs` chỉ tự động hoá bước map này; đã xoá vì hardcode đường dẫn env cục bộ.)

**Regression / không rò rỉ prod (default mode, KHÔNG có env LIVE):**

| Check | Command | Result | Chứng minh |
|---|---|---|---|
| Applications domain | `npx vitest run src/domains/applications/` | `60 passed / 15 skipped` (2.3s) | LIVE blocks skip SẠCH (11 live-integration + 4 security-boundary LIVE) → không kết nối DB/prod ngoài ý muốn; không regression. |
| Full round-2 scope | `npx vitest run src/domains/applications src/domains/job-board src/domains/staffing src/domains/security` | `18 files, 289 passed / 15 skipped` (79.6s) | Passing KHÔNG đổi so với round 2 (289); +11 skipped = file LIVE mới skip ở default. `vitest.config.ts` fix là no-op khi không truyền `DATABASE_URL`. |

> **Kết luận §3:** tiền đề round 3 (DB an toàn đã apply migration MP-2 + provision `hrp_public_rpc`) NAY TỒN TẠI (sếp cấp). Toàn bộ AC LIVE closure (AC-01 apply-on-real-DB, AC-02/03 DB row + idempotency + REAL concurrency, AC-04 projection, AC-05 RLS floor, AC-09 boundary introspection + negative INSERT) XANH. `BLK-02` GỠ. Default mode vẫn 289 passed (không regression) và LIVE skip sạch (không chạm prod).

**Round 2 evidence (giữ nguyên — tầng logic + STATIC; nay được LIVE bổ chứng):**

| AC | Command/check | Exit/result | Evidence summary |
|---|---|---|---|
| `AC-01` | `npx prisma validate` | Exit `0` — "schema is valid 🚀" | Migration additive: `ADD COLUMN` + `CREATE TABLE application_status_history` + unique/partial index; không destructive. |
| `AC-02` | `npx vitest run src/domains/applications src/domains/staffing/4role-jobboard.integration.test.ts` | `PASS` — application.service (9), 4role-jobboard (9) | Apply delegate qua `$queryRawUnsafe('...hrp_public_apply_submission...')`; `sourceClaim.create`/`candidateSubmission.create` KHÔNG gọi. |
| `AC-03` | `npx vitest run .../apply-helpers.test.ts .../application.service.test.ts` | `PASS` — apply-helpers (12), application.service (9) | Idempotency key/payload hash; replay; mismatch → 409; duplicate → 409. |
| `AC-04` | `npx vitest run .../application.service.test.ts .../rate-limit.test.ts` | `PASS` — (9) + rate-limit (5) | `getPublicTracking` allow-list DTO; unknown → generic 404; forbidden fields vắng. |
| `AC-05` | `npx vitest run .../application-queue.service.test.ts` | `PASS` — 22 tests | Queue chỉ ADMIN/HR_MANAGER/DIRECTOR/SALE (DEC-06); ngoài scope → 403; filter + bounded pagination. |
| `AC-06` | `npx vitest run .../status-machine.test.ts .../application-queue.service.test.ts` | `PASS` — status-machine (4) + queue (22) | `transitionApplicationStatus` chỉ NEW↔NEEDS_INFO (reason bắt buộc); history append-only; MP-3 transitions chặn. |
| `AC-07` | `npx next build` ; `npx tsc --noEmit` (scoped 3 trang) | Build exit `0` — 28/28 pages; routes MP-2 present; tsc `0` lỗi 3 trang | Loading/empty/validation/error states có; không còn mock disclaimer. |
| `AC-08` | `npx vitest run src/domains/job-board src/domains/staffing src/domains/security` | `PASS` — mp1.contract (4), 4role-jobboard (9), submission.service, security-matrix (104-case) + portals | MP-1 contract xanh; legacy apply delegate không tạo Worker/SourceClaim; RLS matrix intact. |
| `AC-09` | `npx vitest run .../security-boundary.mp2.test.ts` ; grep `app.role` public path | `PASS` — 8 STATIC (+4 LIVE nay xanh); grep = `0` ref `set_config('app.role'`/`SET app.role`/`applyRlsContext`/`withDbContext` | STATIC: 2× SECURITY DEFINER + pinned search_path; owner `hrp_public_rpc`; REVOKE FROM PUBLIC + GRANT app roles; no `CREATE/ALTER ROLE`/`BYPASSRLS` trong migration; provisioning NOLOGIN BYPASSRLS. |

**Tổng hợp tsc:** `npx tsc --noEmit` = 24 lỗi, TẤT CẢ trong test file có sẵn (không MP-2); 0 lỗi trong file MP-2 (EV-10/LIM-03 — full-repo tsc không phải gate).

## 4. Changed Deliverables

**MP-2 (round 2) — thuộc task này:**

- **Schema/migration:** `prisma/schema.prisma` (additive); `prisma/migrations/20260823101500_mp2_apply_tracking/migration.sql` (cột + `application_status_history` + index + 2 hàm SECURITY DEFINER + REVOKE/GRANT).
- **Provisioning script (OP-01, ship-only):** `scripts/create-public-rpc-role.cjs`.
- **Domain:** `src/domains/applications/` — `application.service.ts`, `application-queue.service.ts`, `apply-helpers.ts`, `rate-limit.ts`, `status-machine.ts` + tests.
- **Routes:** `app/api/public/jobs/[slug]/applications/route.ts`, `app/api/public/applications/[trackingCode]/route.ts`, `app/api/admin/applications/route.ts` (+`/[id]/route.ts`, `/[id]/status/route.ts`), `app/api/jobs/[slug]/route.ts`.
- **Legacy delegation / strip side-effect:** `src/domains/staffing/submission.service.ts` (+ tests), `app/api/jobs/apply/route.ts`.
- **UI (STEP-05):** `app/(jobs)/jobs/page.tsx` (M), `app/(jobs)/track/page.tsx` (new), `app/admin/applications/page.tsx` (new).

**Round 3 — test-harness + evidence (được directive step 3 ủy quyền; KHÔNG phải app source/kiến trúc):**

- **`vitest.config.ts` (M):** `test.env.DATABASE_URL` đổi từ IIFE inject vô điều kiện repo `.env` (prod) → `process.env.DATABASE_URL ?? (<đọc repo .env fallback>)`. Ngăn `.env` prod ghi đè URL test đã truyền vào (đây là nguồn gốc thật khiến negative test round trước bị route nhầm). No-op khi không truyền `DATABASE_URL` (default run giữ nguyên hành vi). Giữ `poolOptions maxThreads/forks=1`, `fileParallelism:false`.
- **`src/domains/applications/security-boundary.mp2.test.ts` (round 2, sửa harness round 3):** gap-fill `.env` loader chỉ set khi `process.env[key] === undefined` (không clobber var đã truyền). 8 STATIC + 4 LIVE (gate `MP2_LIVE_SECURITY_CHECK`). `@ts-expect-error` cho `await import('pg')` (pg không có type).
- **`src/domains/applications/live-integration.mp2.test.ts` (NEW — deliverable evidence round 3):** 11 test LIVE (gate `MP2_LIVE_SECURITY_CHECK`) cho AC-02/03/04/05. Chạy qua connection `app_user_writer` (principal app thật, RLS-enforced); fixture seed trên bảng RLS-off; apply với `app.role=''` (anonymous); read-back với `app.role='ADMIN'`; mọi thứ trong `BEGIN…ROLLBACK` trừ race commit (dọn `finally`).
- **Temp scripts (ĐÃ XOÁ trước handoff):** `scripts/_mp2_live_runner.cjs`, `_mp2_execcheck.cjs`, `_mp2_live_probe.cjs`, `_mp2_rls_introspect.cjs`, `_mp2_rls_diag.cjs`, `_mp2_writer_check.cjs` — công cụ chẩn đoán/chạy tạm, không vào repo. Recipe tái lập ở §3.
- **Dependency:** None. **Git diff/commit:** KHÔNG tạo commit (sếp/TASK không yêu cầu).

**NGOÀI phạm vi MP-2 — pre-existing dirty, GIỮ NGUYÊN:** `app/admin/jobs/page.tsx`, `app/job-board/page.tsx` (Phase-5 WIP); `app/api/jobs/route.ts`, `app/api/staffing/orders/*`, `src/domains/staffing/order.service.ts`, `prisma/seed.mjs`; untracked MP-1/M13; `appBCC/*` deletions (việc sếp).

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `LIM-01` | `Limitation (RESOLVED round 3)` | LIVE closure chạy trên DB TEST của sếp (host `ep-empty-forest-azlhfyo9`, khác prod), đã apply migration + provision `hrp_public_rpc`. | AC-01/02/03/04/05/09 nay có evidence LIVE thật (không còn ENV_BLOCKED). | None cho round này. Prod apply/provision vẫn OP owner=sếp tại cutover (Phase-5 STEP-02) — không thuộc MP-2. |
| `LIM-02` | `Limitation` | Không có browser trong env (AC-07 "browser/manual smoke"). | Visual smoke UI không tự động hoá. | Đã thay bằng `next build` xanh (28/28) + tsc 0 lỗi 3 trang; sếp/QA smoke tay khi UAT. |
| `LIM-03` | `Limitation` | `npx tsc --noEmit` = 24 lỗi, toàn bộ trong test file có sẵn (không MP-2). | Full-repo tsc không dùng làm gate (EV-10). | None — accepted baseline. |
| `DEV-01` | `Deviation` | STEP-05 xây UI MỚI (`track`, `admin/applications`, rewrite `(jobs)/jobs`) tiêu thụ endpoint MP-2, KHÔNG sửa file Phase-5. | RQ-07/AC-07 thoả bằng UI MP-2-owned; tránh scope-bleed. | Xác nhận ranh giới UI Phase-5 vs MP-2 nếu hợp nhất sau. |
| `OBS-01` | `Observation (non-blocking, cho OP/Phase-5 STEP-02)` | Trong lúc CHẨN ĐOÁN harness round 3 (TRƯỚC khi fix `vitest.config.ts`), negative test bị config cũ route NHẦM sang endpoint pooled của repo `.env` (prod) và KHÔNG throw; instrument tạm cho thấy `row_security_active('candidate_submissions')=false` trên endpoint đó. Nguyên nhân route nhầm = bug config (ĐÃ fix). | KHÔNG ảnh hưởng MP-2: ranh giới trên DB test đã chứng minh đúng (RLS enforced, negative INSERT bị chặn). Nhưng tư thế RLS của `candidate_submissions` trên endpoint prod pooled là **CHƯA kiểm chứng** (tôi KHÔNG được phép probe prod). | **Sếp/OP kiểm tra tại Phase-5 STEP-02 (production RLS apply):** xác nhận prod `candidate_submissions` = RLS ENABLE+FORCE và không role login nào có BYPASSRLS ngoài dự kiến. Không thuộc phạm vi MP-2; nêu ở đây để không bỏ sót. |

**`BLK-02` (round 3 preflight) — GỠ:** tiền đề "DB an toàn đã apply migration + provision `hrp_public_rpc`" nay tồn tại (sếp cấp DB test). Round 3 LIVE closure hoàn tất (§3). Không giữ lại blocker (đúng directive step 6). Round 1 `BLK-01` đã đóng ở round 2.

## 6. Evidence Index

| Evidence | Path | Proves |
|---|---|---|
| `E-01` | `prisma/migrations/20260823101500_mp2_apply_tracking/migration.sql` | AC-01/AC-09: additive DDL + 2 hàm SECURITY DEFINER, owner `hrp_public_rpc`, REVOKE/GRANT, no CREATE ROLE. |
| `E-02` | `scripts/create-public-rpc-role.cjs` | AC-09/OP-01: script idempotent `hrp_public_rpc` NOLOGIN BYPASSRLS. |
| `E-03` | `src/domains/applications/security-boundary.mp2.test.ts` | AC-09: 8 STATIC + 4 LIVE (pg_roles/pg_proc, EXECUTE grant, negative direct-INSERT) — LIVE 4/4 PASS. |
| `E-04` | `src/domains/applications/live-integration.mp2.test.ts` | AC-02/03/04/05 LIVE: apply-row/history/no-SourceClaim, idempotency P0010/P0012 + 23505 + REAL N=5 race, projection allow-list, RLS read-scope floor — 11/11 PASS. |
| `E-05` | `src/domains/applications/*.test.ts`, `staffing/4role-jobboard.integration.test.ts` | AC-02..06/08 tầng logic: apply delegate, idempotency, tracking allow-list, queue roles, status machine, MP-1 regression. |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `BLOCKED` | Dừng trước STEP-01 (`BLK-01`): FORCE RLS không có principal cho anonymous public write; contract cấm bypass/public broad grant. |
| `2` | `v1.1` | `READY_FOR_AUDIT` | STEP-01..07 trên ranh giới SECURITY DEFINER RPC (DEC-08) + script OP-01 (DEC-09); anonymous path không tạo Worker/SourceClaim, không set `app.role`; RLS giữ nguyên. Regression 289 passed; tsc 0 lỗi MP-2; `next build` xanh. DB-live ACs = ENV_BLOCKED (DEC-14). |
| `3` | `v1.2` | `READY_FOR_AUDIT` | Evidence-only (Planner Resolution v1.2 — `AUD-001` ACCEPTED, KHÔNG đổi source). Sếp cấp DB test AN TOÀN (khác host prod) đã apply migration + provision `hrp_public_rpc`. Harness fix (directive step 3): `.env` không ghi đè var đã truyền. `MP2_LIVE_SECURITY_CHECK=1` → LIVE closure `23 passed` (security-boundary 12/12 gồm 4 LIVE AC-09; live-integration 11/11 AC-02/03/04/05, có REAL N=5 concurrency). Default mode 289 passed/15 skipped (không regression, LIVE skip sạch, không chạm prod). `BLK-02` gỡ. Source round 2 giữ nguyên (không LIVE test nào phát hiện lỗi). `OBS-01` (prod RLS posture chưa kiểm chứng) chuyển OP/Phase-5 STEP-02. |

> Handoff status: `READY_FOR_AUDIT`
