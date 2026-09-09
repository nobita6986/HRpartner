# HANDOFF: hrp-v5-m1-08-vendor-object-scope

## Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-m1-08-vendor-object-scope` |
| Work type | `CODE` (Tier 2 execution — single stream) |
| Spec version audited | `v1.0` (`READY_FOR_EXECUTION`) |
| Baseline (TASK) | `713d77bd21e1e7b491390fc43eea04332148a167` |
| HEAD tại execution | `a4642815965d9d5d34dd5e61835651e2a26b1936` (branch `main`) |
| Baseline ↔ HEAD | `git merge-base --is-ancestor 713d77bd… HEAD` → exit `0` (baseline là ancestor của HEAD; HEAD tiến lên do các commit OPS/observability đã ACCEPTED song song, KHÔNG phải M1-08) |
| Execution round | `1` |
| Commit/push | KHÔNG (đúng Iron Rule; toàn bộ delta M1-08 nằm ở working tree chưa commit) |
| Updated | `2026-08-28 Asia/Bangkok` |

> **Handoff status ở cuối file.** Tier 2 chỉ trình evidence; quyết định accept là của Tier 3/Tier 1.

## 0. Tóm tắt điều hành

- Đã thực thi STEP-00..STEP-10. Toàn bộ CODE (STEP-02/03/04/05/06), test unit (STEP-01) và LIVE suite (STEP-07) + đăng ký integration (STEP-08) hoàn tất.
- **Gates tĩnh + build đều exit 0**: verify-task, `prisma validate`, typecheck, eslint (0 error), unit (1149 pass), build (28/28 static), `git diff --check` sạch.
- **AC-08 LIVE = `ENV_BLOCKED`** (không có `DATABASE_URL_TEST` trong môi trường Tier 2). LIVE suite đã được viết + đăng ký + preflight báo BLOCKED trung thực (KHÔNG PASS giả, KHÔNG fallback dev/prod). Bằng chứng runtime L1/L2 phải do **Tier 3 chạy trên TEST DB thật** — đúng tiền lệ M1-06b/M1-07b/MP-3C và DEC-12.
- KHÔNG đụng schema/migration/dependency/RLS policy. KHÔNG secret/PII. KHÔNG tuyên bố M1-09 hoàn tất.

## 1. Các STEP đã thực thi

| STEP | RQ | Deliverable | Evidence |
|---|---|---|---|
| STEP-00 | RQ-09 | Xác nhận baseline + biên diff | Baseline là ancestor của HEAD (exit 0); `git status`/`diff --stat` bên §6 |
| STEP-01 | RQ-01 | Route×method×role×context inventory + pre-DB gate | `vendor-object-scope.m1-08.route.test.ts` (36 test, unit) — xem §2 |
| STEP-02 | RQ-02 | Bỏ predicate `ACTIVE` sai → canonical `OPEN_ORDER_STATUSES` | `src/domains/staffing/types.ts`; `app/api/vendor/orders/route.ts`; §3 |
| STEP-03 | RQ-03 | Submission owner server-derived, re-check visible+open, dedup opaque | `app/api/vendor/submissions/route.ts` |
| STEP-04 | RQ-04/05 | Dedicated statement routes: own parent/child scope, staff read-only, 403/404/409 ổn định | `app/api/vendor/statements/**` |
| STEP-05 | RQ-05/07 | Guarded/optimistic transition (owner+state+count tại write) + audit cùng tx | `confirm/route.ts`, `dispute/route.ts`, `dispute.service.ts` |
| STEP-06 | RQ-06 | Đóng generic alias: vendor role 403 trước DB; giữ FORCE_LOCK permission gate | `app/api/statements/route.ts`, `app/api/disputes/route.ts`, `dispute.service.ts` |
| STEP-07 | RQ-08 | LIVE suite hai-vendor (A-admin/A-staff/B-admin/empty) L1+L2 | `src/shared/auth/live-vendor-idor.m1-08.test.ts` — xem §5 |
| STEP-08 | RQ-08/09 | Đăng ký LIVE vào lane fail-closed + forward flag | `vitest.integration-files.ts`, `vitest.integration.config.ts` |
| STEP-09 | RQ-09 | Chạy toàn bộ gate | §4 |
| STEP-10 | RQ-10 | HANDOFF trung thực | File này |

## 2. Route × method × role × context matrix (AC-01/05/06)

Nguồn evidence: `src/shared/auth/vendor-object-scope.m1-08.route.test.ts` (36 test unit, mock toàn bộ dep; `@/src/domains/staffing/types` để REAL để kiểm AC-02). "Zero-call" = mock `withDbContext`/`withAuthorizedDbReadOnly`/service KHÔNG được gọi khi bị chặn.

| # | Route | Method | Allowed | Denied (mã, trước DB) | Ghi chú |
|---|---|---|---|---|---|
| 1 | `/api/vendor/orders` | GET | VENDOR_ADMIN, VENDOR_STAFF (có vendorId) → 200 scoped | 401 no-session; 403 role≠vendor; 403 NO_VENDOR_CONTEXT | L1 `withAuthorizedDbReadOnly`; status = `OPEN_ORDER_STATUSES` |
| 2 | `/api/vendor/submissions` | GET/POST | vendor own-scope; create owner=`ctx.vendorId` | 401; 403 no-vendor; 404 order vô hình (cross/private); 409 closed/dedup | Dedup opaque, không lộ PII |
| 3 | `/api/vendor/statements` | GET | vendor own parent scope | 401; 403 no-vendor | Cross → không xuất hiện |
| 4 | `/api/vendor/statements/[id]/export` | GET | own statement | 404 cross/absent (bất khả phân biệt) | Zero CSV cross-vendor |
| 5 | `/api/vendor/statements/[id]/confirm` | POST | VENDOR_ADMIN own SENT → CONFIRMED | 403 VENDOR_STAFF (zero-call); 404 cross; 409 invalid-state | Guarded `updateMany`; count=0 → classify |
| 6 | `/api/vendor/statements/[id]/dispute` | POST | VENDOR_ADMIN own SENT/DISPUTED, ≤2 vòng | 403 VENDOR_STAFF (zero-call); 400 reason rỗng (zero DB); 404 cross; 409 MAX_DISPUTES/INVALID_STATE | Guarded write + audit cùng tx; race → 1 winner |
| 7 | `/api/statements` (generic) | GET | ADMIN, HR_MANAGER, ACCOUNTANT, DIRECTOR | 403 mọi vendor role (zero-call `withDbContext`) | Surface nội bộ, KHÔNG còn là vendor alias |
| 8 | `/api/disputes` (generic) | POST | ADMIN/HR_MANAGER/ACCOUNTANT (SEND/DISPUTE/CONFIRM/LOCK/FORCE_LOCK) | 403 vendor roles + 403 DIRECTOR (zero-delegate) | `FORCE_LOCK` vẫn qua `CAN_FORCE_LOCK_STATEMENT` |

Kết quả unit: **36/36 PASS** (nằm trong tổng 1149 ở §4). Các case race/loser/winner của dispute mock `findFirst` theo đúng thứ tự gọi (precheck + readback/classify) và `updateMany` `[{count:1},{count:0}]` → `[200,409]`, `auditCreate` đúng 1 lần.

## 3. Order visibility & canonical status (AC-02)

Model: `StaffingOrder` KHÔNG có `vendorId` trực tiếp (DEC-03). Scope = `buildStaffingOrderScope` → `{ project: { OR: [{ isPublic: true }, { submissions: { some: { vendorId: ctx.vendorId } } }] } }`. Canonical open = `OPEN_ORDER_STATUSES = ['OPEN','CLOSING_SOON'] as const` (`src/domains/staffing/types.ts`); predicate `'ACTIVE'` đã bị loại (fix EV-04).

Ma trận visibility fixture (sẽ được LIVE chứng minh bằng ID chính xác — §5):

| Order | Project | Status | A-admin | A-staff | B-admin | empty-scope |
|---|---|---|---|---|---|---|
| pub-open | public | OPEN | ✅ | ✅ | ✅ | ✅ |
| pub-closed | public | CLOSED | ❌ (status) | ❌ | ❌ | ❌ |
| priv-sub (A) | private, có submission A | OPEN | ✅ (own sub) | ✅ | ❌ IDOR | ❌ |
| priv-nosub (B) | private, có submission B | OPEN | ❌ IDOR | ❌ | ✅ (own sub) | ❌ |

- Search nguồn: KHÔNG còn literal `'ACTIVE'` trong order route; list assert `rows.every(status ∈ OPEN/CLOSING_SOON)`.
- `where` thủ công trỏ order vô hình vẫn rỗng (AND self-scope, chống enumeration).

## 4. Quality gates STEP-09 (AC-09) — lệnh + exit code thật

| Gate | Lệnh | Exit | Kết quả |
|---|---|---|---|
| Task verifier | `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath docs\tasks\hrp-v5-m1-08-vendor-object-scope\TASK.md` | `0` | `RESULT: PASS. TASK contract is ready for execution.` |
| Prisma validate | `npx prisma validate` | `0` | `The schema at prisma\schema.prisma is valid 🚀` (chỉ có banner update notice trên stderr) |
| Typecheck | `npm run typecheck` (`tsc --noEmit`) | `0` | Không lỗi (xem deviation §7 — đã sửa 2 lỗi TS2322 do shape `select` trong LIVE test) |
| Lint (scoped) | `npx eslint` trên 13 file đổi | `0` | **0 error**, 40 warning (đều là `no-explicit-any`/unused pre-existing ở `reconciliation-unit.test.ts`, `dispute.service.ts`, `disputes/route.ts`; 2 file test mới M1-08 sạch, 0 warning) |
| Unit | `npm run test:unit` (`vitest run --config vitest.unit.config.ts`) | `0` | **78 files / 1149 tests passed**, gồm `vendor-object-scope.m1-08.route.test.ts (36)` |
| Integration | `npm run test:integration` (`node scripts/ci/integration-preflight.mjs`) | `0` | **`ENV_BLOCKED`** — `DATABASE_URL_TEST is not set … Integration lane NOT run — this is a BLOCKED state, not a PASS.` |
| Build | `npm run build` (`next build`) | `0` | `✓ Compiled successfully in 10.9s`; `✓ Generating static pages (28/28)`; route table in đầy đủ |
| Diff check | `git diff --check` | `0` | Sạch (chỉ cảnh báo LF→CRLF, không có whitespace/conflict-marker error) |

Forbidden-path scan (`git diff --name-only | schema.prisma\|migrations\|package.json\|lock`) → **không match** → không có schema/migration/dependency change.

## 5. LIVE suite AC-08 — `ENV_BLOCKED` (runtime evidence chờ Tier 3)

File: `src/shared/auth/live-vendor-idor.m1-08.test.ts` — `describe.skipIf(!enabled)`, `enabled = M1_08_LIVE_VENDOR_IDOR && DATABASE_URL_ADMIN && DATABASE_URL`. Hai `PrismaClient`: **admin** (`DATABASE_URL_ADMIN`, chỉ seed/teardown/read-back + đo L1 để loại nhiễu RLS) và **writer** (`DATABASE_URL`, principal RLS-enforcing cho L2). Fixture RUN-prefixed, cleanup FK-safe trong `finally`.

**13 case (7 L1 + 6 L2)** — bao phủ đúng A-admin / A-staff / B-admin / empty-scope trên cả 4 resource family:

- L1 (admin principal, đo where-injection của scope extension):
  1. A-admin: order thấy pub-open + priv-sub; KHÔNG thấy priv-nosub (IDOR) / pub-closed (status); mọi status ∈ OPEN/CLOSING_SOON.
  2. A-admin: `where` thủ công trỏ priv-nosub → rỗng.
  3. A-admin: CandidateSubmission chỉ của mình; `where vendorId=B` → rỗng.
  4. A-admin: VendorStatement chỉ của mình; `where id=vsB` → rỗng.
  5. **A-staff**: đọc own-scope y hệt A-admin (scope key = `vendorId` server-derived, không theo role).
  6. **B-admin**: đối xứng — thấy order/submission/statement của B, KHÔNG thấy của A (cách ly hai chiều).
  7. **empty-scope**: chỉ thấy order public; submission/statement rỗng.
- L2 (writer principal, RLS thật):
  8. GUC transaction-local đúng danh tính A (`vendor_id`,`role`,`worker_id=''`,`user_id`).
  9. RLS backstop: plain `findMany` dưới GUC A chỉ trả row A.
  10. **RLS backstop (DEC-09)**: `updateMany` BỎ `where.vendorId` dưới GUC A nhắm statement B → `count=0`, row B nguyên `SENT` (chứng minh L2 chặn kể cả khi L1/where app lỡ rơi).
  11. Guarded confirm `{id,vendorId,status:'SENT'}` → `count=1`, flip CONFIRMED.
  12. Race (AC-07): hai transaction confirm cùng statement → `[0,1]` (đúng một winner).
  13. Guarded dispute + max-2 (G17): disputeCount 0→1→2, vòng 3 bị guard `{lt:2}` chặn tại DB (`count=0`).

**Trạng thái chạy:** `ENV_BLOCKED`. Môi trường Tier 2 KHÔNG có `DATABASE_URL_TEST`/`DATABASE_URL_ADMIN_TEST` nên preflight fail-closed và suite tự-skip. **Đây KHÔNG phải PASS.** Không có DB nào được kết nối → masked DB identity = **N/A (không mở kết nối)**; không có số liệu cũ nào được tái sử dụng.

**Tier 3 phải làm:** cấp `DATABASE_URL_TEST` + `DATABASE_URL_ADMIN_TEST` (TEST DB thật, không phải dev/prod) rồi chạy lane integration để lấy exit 0 + per-suite count + fixture cleanup evidence cho AC-08 và phần LIVE của AC-02/03/04/05/07.

## 6. Diff inventory (AC-09)

### 6.1 In-scope M1-08 (do execution này tạo — 13 file + HANDOFF)

Tracked-modified (`git diff --stat`):

```
app/api/disputes/route.ts                          |  21 +++-
app/api/statements/route.ts                        |  16 +--
app/api/vendor/orders/route.ts                     |  17 +--
app/api/vendor/statements/[id]/confirm/route.ts    |  47 ++++----
app/api/vendor/statements/[id]/dispute/route.ts    |  51 +++++++--
app/api/vendor/submissions/route.ts                |  11 +-
src/domains/reconciliation/dispute.service.ts      | 122 ++++++++++++++++-----
src/domains/reconciliation/reconciliation-unit.test.ts | 51 +++++++++
src/domains/staffing/types.ts                      |  16 +++
vitest.integration-files.ts                        |   1 +
vitest.integration.config.ts                       |   1 +
```

Untracked (file mới):

```
src/shared/auth/vendor-object-scope.m1-08.route.test.ts   (437 dòng, 36 test)
src/shared/auth/live-vendor-idor.m1-08.test.ts            (LIVE, 13 case)
docs/tasks/hrp-v5-m1-08-vendor-object-scope/HANDOFF.md    (file này)
```

Không có schema/migration/dependency/RLS-policy/secret trong tập trên.

### 6.2 Ngoài scope — CÓ trong working tree nhưng KHÔNG do M1-08 tạo

Execution này chỉ sửa đúng 13 file ở §6.1. Các mục dưới đã tồn tại sẵn / thuộc lane khác; tôi **không chạm** và **không revert** (một số là protected). Tier 3 nên loại chúng khỏi logical diff M1-08:

- `.gitignore` (M) — thay đổi local pre-existing.
- `docs/PLANNER_HANDOVER.md` (M) — Tier 1 cập nhật ROADMAP_CURSOR (`updated_at`→2026-08-28, sequencing go-live-01). Thuộc Tier 1.
- `docs/HRP_REMAINING_ROADMAP.md` (??) — untracked, lane khác.
- `docs/tasks/hrp-v5-go-live-01-single-domain-consolidation/` (??) — TASK do Tier 1 prewrite.
- `docs/aff_plan.md`, `docs/aff_plan - Copy.md`, `scratch/*.ps1`, `scripts/debug-parser.mjs` (??) — **protected**, cấm chạm theo TASK §4.2.

HEAD (`a464…`) đã vượt baseline (`713d77bd…`) bằng các commit OPS/observability đã ACCEPTED — không thuộc M1-08 và không nằm trong working-tree delta của tôi.

## 7. Per-AC self-assessment (Tier 2 trình evidence — Tier 3 quyết)

| AC | Evidence hiện có | Trạng thái Tier 2 |
|---|---|---|
| AC-01 | Route matrix 36/36 unit, zero-call denial | ✅ có evidence tĩnh |
| AC-02 | `types.ts` canonical + route test (no `ACTIVE`); ID-set A/B chờ LIVE | ⚠️ unit ✅, LIVE `ENV_BLOCKED` |
| AC-03 | Submission route test (owner/404/409/opaque); rows before/after chờ LIVE | ⚠️ unit ✅, LIVE `ENV_BLOCKED` |
| AC-04 | Statement IDOR route test; CSV/counts chờ LIVE | ⚠️ unit ✅, LIVE `ENV_BLOCKED` |
| AC-05 | confirm/dispute role-state matrix unit; before/after chờ LIVE | ⚠️ unit ✅, LIVE `ENV_BLOCKED` |
| AC-06 | Generic surface 403 zero-call + internal allowed + FORCE_LOCK (unit) | ✅ có evidence (không cần LIVE) |
| AC-07 | Deterministic race unit ([200,409], audit 1×); concurrency thật chờ LIVE | ⚠️ unit ✅, LIVE `ENV_BLOCKED` |
| AC-08 | LIVE suite viết + đăng ký; preflight `ENV_BLOCKED` | ⛔ `ENV_BLOCKED` — chờ Tier 3 TEST DB |
| AC-09 | §4 tất cả exit 0; §6 diff scoped, no forbidden | ✅ có evidence |
| AC-10 | File HANDOFF này | ✅ |

## 8. Deviations, residual gaps, secrets/PII

- **Deviation (tự sửa trong STEP-09):** typecheck lần đầu báo 2 lỗi `TS2322` tại `live-vendor-idor.m1-08.test.ts` (biến `row` bị suy kiểu `{status,disputeCount}` rồi gán lại `findUnique` chỉ `select {disputeCount}`). Đã đồng nhất `select: { status: true, disputeCount: true }` cả 3 lần → typecheck exit 0. Không đổi ngữ nghĩa test.
- **Residual gap (không phải lỗi):** toàn bộ evidence runtime L1/L2 (AC-08 và phần LIVE của AC-02/03/04/05/07) là `ENV_BLOCKED` — bắt buộc Tier 3 chạy trên TEST DB thật. Unit lane KHÔNG thay thế được bằng chứng DB-boundary/RLS.
- **Lint warnings:** 40 warning `no-explicit-any`/unused (pre-existing style ở test helper + service), 0 error — không nâng thành error theo config repo.
- **Secrets/PII:** LIVE test chỉ đọc connection string qua env (`DATABASE_URL`, `DATABASE_URL_ADMIN`), KHÔNG hardcode/in/log. Fixture là dữ liệu tổng hợp RUN-prefixed (tên "Cand A/B", phone sinh từ timestamp), KHÔNG có PII thật. HANDOFF này không chứa secret/connection string.
- **Không tuyên bố M1-09**; field-level projection nằm ngoài M1-08 (DEC-13).

---

**Handoff status: READY_FOR_AUDIT**




