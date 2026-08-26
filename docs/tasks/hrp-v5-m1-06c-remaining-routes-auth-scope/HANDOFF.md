# HANDOFF: hrp-v5-m1-06c-remaining-routes-auth-scope

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-m1-06c-remaining-routes-auth-scope` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `2` (round 1 = BLOCKED tại gate contract; Tier 1 đã sửa numbering → verify-task PASS → re-issue `/code`) |
| Current audit round | `0` (chưa audit) |
| Executor | `Tier 2` |
| Baseline | HEAD thực tế `15ca9d9` (merge origin/main). Xem `BLK-SYNC` §5: 06c dựng trên diff M1-06b hiện `READY_FOR_AUDIT` (CHƯA ACCEPTED) — Tier 1 đã cho phép chạy song song khi re-issue. |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-08-26 Asia/Bangkok` |

## 1. Outcome Summary

Toàn bộ **15 route còn lại** trong `app/api` (ngoài admin/ctv/worker/workers/vendor/vendors/cron đã đóng ở M1-06a/06b) đã được phân loại và đưa qua boundary chuẩn hoặc xác nhận giữ intent NO_DB / SECURITY DEFINER. Không route nào chạy business model op trên raw PrismaClient ở route level.

- **STEP-01** (RQ-01/RQ-08): static gate `api-boundary.static.test.ts` mở rộng SCOPE_DIRS 7 → 15 dir (thêm `auth, statements, projects, clients, payroll, jobs, public, push`); thêm 5 NEGATIVE + 2 POSITIVE fixtures cho các pattern bypass mới. 17 test PASS.
- **STEP-02** (RQ-02): `statements/margin` bọc qua boundary (`withDbContext` — xem `DEV-01`), role gate {ADMIN,ACCOUNTANT,DIRECTOR}.
- **STEP-03** (RQ-03): `projects` route + `[id]` — GET qua `withAuthorizedDbReadOnly` (L1 scope + L2), create/update-by-id qua `withDbContext` (L2, DEC-03). SALE/MKT deny (`DEV-02`).
- **STEP-04** (RQ-04): `clients` route + `[id]` — GET qua `withAuthorizedDbReadOnly`, create/update qua `withDbContext`. Root-only (`DEV-03`).
- **STEP-05** (RQ-05): `payroll` GET qua `withAuthorizedDbReadOnly`, role gate {ADMIN,DIRECTOR} (`DEV-04`, OQ-03).
- **STEP-06** (RQ-06): `push/subscribe` upsert qua `withDbContext`, user-scoped theo `ctx.userId`.
- **STEP-07** (RQ-07): audit `jobs/**` + `public/**` + `auth/logout` — **không cần sửa code**, tất cả đã giữ intent đúng (chi tiết §2 phân loại). `auth/login` bọc read qua `$transaction` + GUC (`DEV-05`, pre-auth).
- **STEP-08** (RQ-09): full quality gate PASS — verify-task exit 0, tsc 0, lint 0 error, unit 831 pass, build exit 0.

5 deviation (DEV-01..05) đều là hệ quả trực tiếp của ràng buộc OQ-01 (cấm tạo builder mới) + bản chất pre-auth của login + role matrix §7.2 — mô tả đầy đủ ở §5 để Tier 3 thẩm định.

KHÔNG commit, KHÔNG push, KHÔNG stage. KHÔNG chạm TASK.md/AUDIT.md. KHÔNG chạm admin/ctv/worker/workers/vendor/vendors/cron/appBCC/scratch.

## 2. Execution Trace

| STEP | RQ | File/artifact | Result | Deviation |
|---|---|---|---|---|
| (gate) | — | `verify-task.ps1 -TaskPath ...\TASK.md` | PASS (exit 0) | — |
| `STEP-01` | RQ-01, RQ-08 | `src/shared/auth/api-boundary.static.test.ts` | DONE — SCOPE_DIRS 7→15; +5 NEG +2 POS fixtures; 17 test PASS | — |
| `STEP-02` | RQ-02 | `app/api/statements/margin/route.ts` | DONE — `withDbContext` + role gate {ADMIN,ACCOUNTANT,DIRECTOR}; gỡ import `AuthScopeError` thừa | `DEV-01` |
| `STEP-03` | RQ-03 | `app/api/projects/route.ts`, `projects/[id]/route.ts` | DONE — GET `withAuthorizedDbReadOnly`(L1+L2); POST/PUT `withDbContext`(L2); P2025→404 | `DEV-02` |
| `STEP-04` | RQ-04 | `app/api/clients/route.ts`, `clients/[id]/route.ts` | DONE — GET `withAuthorizedDbReadOnly`; POST/PUT `withDbContext`; P2025→404 | `DEV-03` |
| `STEP-05` | RQ-05 | `app/api/payroll/route.ts` | DONE — GET `withAuthorizedDbReadOnly`; gate {ADMIN,DIRECTOR} | `DEV-04` |
| `STEP-06` | RQ-06 | `app/api/push/subscribe/route.ts` | DONE — upsert `withDbContext`; scope `ctx.userId` | — |
| `STEP-07` | RQ-07 | `jobs/**`, `public/**`, `auth/login`, `auth/logout` | DONE (audit) — không sửa code (phân loại dưới); `auth/login` `$transaction`+GUC | `DEV-05` |
| `STEP-08` | RQ-09 | tsc/lint/build/unit + HANDOFF | DONE — mọi gate exit 0 | — |

### Phân loại 15 route (RQ-01 — allowlist tường minh, không wildcard)

| # | Route | Classification | Cơ chế |
|---|---|---|---|
| 1 | `auth/login` POST | PRE-AUTH TXN | `prisma.$transaction` + `set_config('app.role','ADMIN',true)` transaction-local; `tx.user.findFirst` (DEV-05) |
| 2 | `auth/logout` POST | NO_DB | Chỉ clear cookie `hrp_token` (maxAge 0) |
| 3 | `statements/margin` GET | USER_SCOPED_DB (L2) | `withDbContext` → `calculateMargin(tx,...)` (DEV-01) |
| 4 | `projects` GET | USER_SCOPED_DB (L1+L2) | `withAuthorizedDbReadOnly` |
| 5 | `projects` POST | USER_SCOPED_DB (L2) | `withDbContext` create |
| 6 | `projects/[id]` PUT | USER_SCOPED_DB (L2) | `withDbContext` update; P2025→404 |
| 7 | `clients` GET | USER_SCOPED_DB (L1+L2) | `withAuthorizedDbReadOnly` |
| 8 | `clients` POST | USER_SCOPED_DB (L2) | `withDbContext` create |
| 9 | `clients/[id]` PUT | USER_SCOPED_DB (L2) | `withDbContext` update; P2025→404 |
| 10 | `payroll` GET | USER_SCOPED_DB (L1+L2) | `withAuthorizedDbReadOnly` |
| 11 | `push/subscribe` POST | USER_SCOPED_DB (L2) | `withDbContext` upsert |
| 12 | `jobs` GET/POST | NO_DB (public svc) | `prisma.$transaction((tx)=>listPublicJobProjection/applyForJob(tx,...))` |
| 13 | `jobs/[slug]` GET | NO_DB (public svc) | `prisma.$transaction((tx)=>getPublicJobProjection(tx,...))` |
| 14 | `jobs/apply` POST | NO_DB (public svc) | `prisma.$transaction((tx)=>applyForJob(tx,...))` |
| 15a | `jobs/submissions` GET | USER_SCOPED_DB (L2) | `withDbContext`→`listClaims/listSubmissions(tx,ctx,...)` |
| 15b | `public/jobs/[slug]/applications` POST | SYSTEM (SECURITY DEFINER) | `prisma.$transaction((tx)=>submitPublicApplication(tx,...))` |
| 15c | `public/applications/[trackingCode]` GET | SYSTEM (SECURITY DEFINER) | `prisma.$transaction((tx)=>getPublicTracking(tx,...))` + rate-limit |

> Ghi chú: `jobs/submissions` + 2 route `public/**` là 3 route bổ sung khiến tổng đếm được là 16 file `route.ts`; TASK ước tính "15 route" — chênh lệch do cách gộp `public/**`. Tất cả đều nằm trong SCOPE_DIRS và qua static gate.

## 3. Acceptance Evidence

Mọi lệnh chạy THẬT trên máy (Windows, PowerShell + Bash). Không mock evidence.

| AC | Command | Exit/result | Evidence summary |
|---|---|---|---|
| (gate) | `verify-task.ps1 -TaskPath ...\TASK.md` | **exit 0** | `RESULT: PASS. TASK contract is ready for execution.` |
| `AC-01` | `vitest run api-boundary.static.test.ts` | **PASS** | 17 test; test "phủ đủ route root M1-06c" assert 6 path có mặt; sanity `files.length ≥ 15` |
| `AC-02` | `vitest run statements-margin.route.test.ts` | **PASS** | 12 test: {ADMIN,ACCOUNTANT,DIRECTOR}→200 (Decimal string hoá); 7 role khác→403 không tính; thiếu month/year→400; MarginPermissionError→403 |
| `AC-03` | `vitest run projects-master.route.test.ts` | **PASS** | 22 test: viewer {ADMIN,HR_MANAGER,HR_STAFF,PM,ACCOUNTANT,DIRECTOR}→200; SALE/MKT/CTV/WORKER/VENDOR_ADMIN→403 không query; POST {ADMIN,PM,HR_MANAGER}→201; cross-project P2025→404 |
| `AC-04` | `vitest run clients-master.route.test.ts` | **PASS** | 16 test: {ADMIN,HR_MANAGER,DIRECTOR}→200/201/200; SALE/PM/ACCOUNTANT/HR_STAFF/MKT/WORKER→403; cross-client P2025→404 |
| `AC-05` | `vitest run payroll.route.test.ts` | **PASS** | 11 test: {ADMIN,DIRECTOR}→200; HR_MANAGER/ACCOUNTANT/HR_STAFF/PM/SALE/MKT/WORKER/VENDOR_ADMIN→403 không query; boundary AuthScopeError→403 |
| `AC-06` | `vitest run push-subscribe.route.test.ts` | **PASS** | 4 test: push off→200 enabled:false không auth/DB; unauth→401; body sai→400; hợp lệ→200 upsert scoped `ctx.userId` |
| `AC-07` | `vitest run api-boundary.static.test.ts` + audit §2 | **PASS** | Gate quét jobs/public → 0 offender; audit xác nhận `$transaction`/SECURITY DEFINER giữ nguyên |
| `AC-08` | `vitest run api-boundary.static.test.ts` (NEG fixtures) | **PASS** | 5 NEG (clientCompany.findMany, payrollConfig.findMany, pushSubscription.upsert, user.findFirst, getPrisma().project.create) đều bị bắt |
| `AC-09` | `tsc --noEmit` / `npm run lint` / `npm run build` / `vitest run` | **exit 0 ×4** | tsc 0; lint 0 error (471 warn baseline); build 0; unit 64 file/831 test |

### Lệnh + kết quả nguyên văn (evidence thật)

```
$ powershell verify-task.ps1 -TaskPath ...\TASK.md
RESULT: PASS. TASK contract is ready for execution.   → VERIFY_EXIT=0

$ npx tsc --noEmit
(no output)                                            → TSC_EXIT=0

$ npm run lint  (eslint .)
✖ 471 problems (0 errors, 471 warnings)                → LINT_EXIT=0

$ npx vitest run --config vitest.unit.config.ts
Test Files  64 passed (64)
     Tests  831 passed (831)                            → UNIT_EXIT=0

$ npm run build  (next build)
✓ Compiled successfully ... /api/statements/margin, /api/projects,
  /api/clients, /api/payroll all listed as ƒ (Dynamic) → BUILD_EXIT=0

$ npx vitest run <6 route+gate files>
Test Files  6 passed (6)   Tests  82 passed (82)        (subset, informational)
```

### Integration lane

`test:integration` = `ENV_BLOCKED` — không có test-DB secret trong môi trường Tier 2 (DEC-14/DEC-04-05: KHÔNG fallback prod/dev URL, KHÔNG mock fake pass). Role matrix live (13 role × bảng) thuộc lane integration → để Tier 3 chạy với DB thật. Unit role-matrix ở trên chứng minh logic gate/boundary ở tầng route (HTTP status + call assertions).

## 4. Changed Deliverables

**Route (7 file — đưa qua boundary):**
- `app/api/auth/login/route.ts` — read User qua `$transaction`+GUC (DEV-05); password verify + JWT + cookie GIỮ NGUYÊN (DEC-11).
- `app/api/statements/margin/route.ts` — `withDbContext`+`calculateMargin(tx)`; gỡ import `AuthScopeError` thừa.
- `app/api/projects/route.ts`, `app/api/projects/[id]/route.ts` — L1 read / L2 write.
- `app/api/clients/route.ts`, `app/api/clients/[id]/route.ts` — L1 read / L2 write.
- `app/api/payroll/route.ts` — L1 read + role gate.
- `app/api/push/subscribe/route.ts` — L2 upsert.

**Test (mở rộng + mới — 6 file):**
- `src/shared/auth/api-boundary.static.test.ts` (MODIFIED) — SCOPE_DIRS 7→15, +fixtures.
- `src/shared/auth/projects-master.route.test.ts` (NEW).
- `src/shared/auth/clients-master.route.test.ts` (NEW).
- `src/shared/auth/payroll.route.test.ts` (NEW).
- `src/shared/auth/statements-margin.route.test.ts` (NEW).
- `src/shared/auth/push-subscribe.route.test.ts` (NEW).

**Audit-only (không sửa):** `auth/logout`, `jobs/route`, `jobs/[slug]`, `jobs/apply`, `jobs/submissions`, `public/jobs/[slug]/applications`, `public/applications/[trackingCode]`.

- **Dependency:** None. **Schema/migration:** None. **Env/config:** None.
- **TASK.md/AUDIT.md:** KHÔNG sửa.
- **Git:** KHÔNG commit/stage/push. HEAD = `15ca9d9`.

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Cần Planner/Auditor xác nhận |
|---|---|---|---|---|
| `DEV-01` | Deviation (cơ chế) | RQ-02/DEC-04 ghi dùng `withAuthorizedDbReadOnly` (L1) cho margin. Thực tế dùng `withDbContext` (L2-only). Lý do: `ClientStatement`/margin aggregate KHÔNG có L1 scope builder; OQ-01 cấm tạo builder mới ở 06c → L1 sẽ `DENY_BY_DEFAULT` cho ACCOUNTANT (non-root), MÂU THUẪN trực tiếp AC-02 ("ACCOUNTANT nhận dữ liệu"). | Boundary VẪN kín (không raw Prisma ở route); role gate {ADMIN,ACCOUNTANT,DIRECTOR} tại route (defense-in-depth) + `calculateMargin` tự kiểm `CAN_VIEW_STATEMENT_MARGIN`. Cùng pattern đã kiểm chứng với `statements/route.ts`. | Xác nhận thay L1→L2 cho model không builder là hợp lệ (ưu tiên OUTCOME AC-02 hơn cơ chế RQ-02). |
| `DEV-02` | Deviation (role) | AC-03 yêu cầu "SALE/MKT deny". `buildProjectScope` trả SALE=`{}` (=full) → phải chặn tại route TRƯỚC boundary. VIEWER_ROLES bỏ SALE+MKT. | SALE/MKT→403 đúng AC-03; PM chỉ thấy dự án phụ trách qua L1. | Xác nhận gate-tại-route cho SALE/MKT (không dựa L1 cho deny). |
| `DEV-03` | Deviation (role, thu hẹp) | `ClientCompany` không có builder → chỉ ROOT {ADMIN,HR_MANAGER,DIRECTOR} view+create+update. So legacy: SALE (và HR_STAFF/PM/ACCOUNTANT ở view) trước có quyền, nay →403. AC-04 nêu "ADMIN/DIRECTOR passthrough"; tôi gộp thêm HR_MANAGER (cũng ROOT_ROLE). | Thắt chặt hơn — fail-closed, đúng tinh thần no-builder. Có thể ảnh hưởng UI SALE cũ. | Xác nhận thu hẹp quyền client về ROOT-only + gộp HR_MANAGER hợp lệ. |
| `DEV-04` | Deviation (role, thu hẹp) | OQ-03 resolve {ADMIN,DIRECTOR}. Legacy `payroll` cho {ADMIN,HR_MANAGER,ACCOUNTANT,DIRECTOR} → bỏ HR_MANAGER+ACCOUNTANT. | HR_MANAGER/ACCOUNTANT→403 đọc config lương. | Đã có OQ-03; nêu lại để Tier 3 thấy thay đổi so legacy. |
| `DEV-05` | Deviation (cơ chế) | DEC-02 gợi ý login dùng `withDbContext`. Bất khả thi: login là PRE-AUTH, chưa có `AuthContext` (getAuthContext cần token hợp lệ). Thay bằng `prisma.$transaction` + `set_config('app.role','ADMIN',true)` transaction-local (mirror getAuthContext bootstrap), `tx.user.findFirst`. | password verify + `signJwt` + cookie GIỮ NGUYÊN (DEC-11/RISK-02). Static gate không bắt `$transaction`/`tx.*`. GUC `is_local=true` reset sau commit. | Xác nhận `$transaction`+GUC là cách bọc hợp lệ cho pre-auth read (thay withDbContext). |
| `BLK-SYNC` | Limitation (sequencing) | TASK §0 Baseline giả định M1-06b ACCEPTED; thực tế M1-06b mới `READY_FOR_AUDIT`. HEAD=`15ca9d9`. Round 1 đã nêu; Tier 1 re-issue `/code` = chấp nhận chạy 06c song song trên nền 06b chưa nghiệm thu. | Nếu audit M1-06b buộc sửa boundary/scope, nền 06c có thể đổi theo. | Tier 3 lưu ý audit 06c trên giả định 06b sẽ ACCEPTED; nếu 06b đổi, re-check giao diện boundary. |

**Không có blocker chặn READY_FOR_AUDIT.** 5 DEV là quyết định trong quyền hạn Tier 2 (implementation cục bộ theo OQ/DEC/AC), nêu minh bạch để Tier 3 thẩm định — không phải scope-creep, không đụng architecture/security ngoài contract.

## 6. Evidence Index

| Evidence | Path | Proves |
|---|---|---|
| `E-01` | `src/shared/auth/api-boundary.static.test.ts` | Static gate 15 dir + fixtures có răng (AC-01/07/08) |
| `E-02` | `src/shared/auth/{projects-master,clients-master,payroll,statements-margin,push-subscribe}.route.test.ts` | Role matrix AC-02..06 (82 test tổng nhóm) |
| `E-03` | `app/api/{statements/margin,projects,projects/[id],clients,clients/[id],payroll,push/subscribe,auth/login}/route.ts` | Route qua boundary / pre-auth txn |
| `E-04` | verify-task PASS · tsc 0 · lint 0 error · build 0 · unit 831 pass | Full quality gate AC-09 |

## 7. Execution Round History

| Round | Spec | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `BLOCKED` | Gate `verify-task.ps1` FAIL exit 2 (numbering §7/§8/§9). Tier 2 không sửa TASK → trả Tier 1. Không chạm code. |
| `2` | `v1.0` | `READY_FOR_AUDIT` | Tier 1 đã sửa numbering (verify-task PASS exit 0). Thực thi STEP-01..08: 7 route qua boundary + 1 pre-auth txn, 3+ route public giữ NO_DB/SECURITY DEFINER, static gate 15 dir, 6 file test (82 test). Full gate exit 0. 5 deviation (DEV-01..05) + BLK-SYNC nêu minh bạch. Không commit/stage. |

> Handoff status: READY_FOR_AUDIT
