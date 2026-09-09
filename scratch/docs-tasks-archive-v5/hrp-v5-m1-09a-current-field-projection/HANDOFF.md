# HANDOFF — V5-M1-09A Current Field Projection

| | |
|---|---|
| Task | `docs/tasks/hrp-v5-m1-09a-current-field-projection/TASK.md` (Spec v1.0) |
| Tier | 2 (Engineer) — execute contract → HANDOFF; KHÔNG self-audit |
| Execution round | 1 |
| Baseline | `70f642f7ebff81d76172851ee727faba6820d8d9` |
| Ngày | 2026-08-28 |
| Working tree | **SHARED** — có stream song song (single-domain, login/auth, observability, portal routing). Partition đầy đủ tại §7. KHÔNG chạm file not-mine, KHÔNG commit/push. |

Tôi (Tier 2) báo cáo sếp: đã hoàn tất STEP-00..STEP-10. Mọi gate §6 xanh với evidence THẬT (command + exit + output) ở trạng thái cuối. Dưới đây là claim; Tier 3 verify độc lập.

---

## 1. Phạm vi thực thi (STEP-01..STEP-08)

Định tuyến MỌI response mang dữ liệu Worker/statement/payslip/withdrawal/payroll-config qua **allowlist DTO** (DEC-01: build object mới từ field tường minh, KHÔNG spread raw `{...row}`), khóa theo **role + action + effective permission**. Row-auth trước, field-projection sau (DEC-02); resolver lỗi ⇒ FAIL-CLOSED.

**Source-of-truth mới:** `src/shared/projection/manifest.ts` (untracked) — `SYSTEM_ROLES` (13, EV-14), 11 field-group, 11 `PROJECTION_SURFACES`, `INTERNAL_VIEWERS`, `PAYMENT_PROJECTION = SCHEMA_NOT_AVAILABLE`.

**Impl projection Worker:** `src/shared/auth/worker-projection.ts` — action `LIST|DETAIL|SELF_PROFILE`; 6 field masked theo `hasSensitivePermission || action==='SELF_PROFILE'`; 3 field issued gate cùng điều kiện; `cccdChipData` LUÔN omit (DEC-05, không bao giờ là key).

**11 route surface** đã khai báo & phủ (9 route tôi sửa code + 2 route đã sạch sẵn — xem §2).

---

## 2. Surface matrix — before → after (11 surface)

| # | Surface | Route | Gate role | Trước | Sau (DTO allowlist) |
|---|---|---|---|---|---|
| 1 | WORKER_LIST | `app/api/workers` GET | 7 internal viewer | raw rows | `projectWorker(action:'LIST')`; masked 6 nếu thiếu `CAN_VIEW_WORKER_SENSITIVE` |
| 2 | WORKER_MUTATE | `app/api/workers/[id]` PUT | ADMIN/HR_MANAGER | raw row | `projectWorker(action:'DETAIL')` |
| 3 | WORKER_SELF | `app/api/workers/me` GET | WORKER | raw row | `SELF_PROFILE`: self thấy CCCD/bank; `cccdChipData` omit |
| 4 | STATEMENT_LIST | `app/api/statements` GET | 4 internal | raw rows | vendor `totalAmount` luôn; client `totalAmount` CHỈ khi `CAN_VIEW_STATEMENT_MARGIN` (else OMIT) |
| 5 | STATEMENT_MARGIN | `app/api/statements/margin` GET | ADMIN/ACCOUNTANT/DIRECTOR | **đã sạch** (không sửa) | DTO `{margin:{…, .toString()}}` — phủ static + manifest |
| 6 | STATEMENT_GENERATE | `app/api/statements/generate` POST | 4 internal | raw statement | command-result DTO (kind/created/id/status/period/version) |
| 7 | VENDOR_STATEMENT_LIST | `app/api/vendor/statements` GET | vendor own-scope | **đã sạch** (không sửa) | Prisma `select` + `.map()` DTO — phủ static |
| 8 | VENDOR_STATEMENT_EXPORT | `app/api/vendor/statements/[id]/export` GET | vendor own-scope | raw lines | CSV: `...stmt.lines.map()` (mảng đã map), BigInt→string, chống CSV-injection |
| 9 | PAYSLIP_SELF | `app/api/webhook/payslip` GET/POST | WORKER self / system | cache raw | strict 8-field DTO; POST allowlist trước cache |
| 10 | CTV_WITHDRAWAL_SELF | `app/api/ctv/withdrawals` GET/POST | CTV | raw record | DTO omit `ctvId`; amount→string, createdAt→ISO |
| 11 | PAYROLL_CONFIG_LIST | `app/api/payroll` GET | 4 internal | raw rows | `select` 12 field (omit `createdBy`) + `.map()` ISO DTO |

---

## 3. Field inventory + counts (verify bởi `manifest.test.ts` 8 tests + `worker-projection.test.ts` 15 tests)

| Field group | Count | Ghi chú |
|---|---|---|
| WORKER_CORE | 13 | non-sensitive |
| WORKER_CONTACT | 11 | non-sensitive |
| WORKER_SENSITIVE_MASKED | 6 | cccdNumber/cccdImageUrl/selfieImageUrl/bankAccount/bankName/bankBranch — mask `***`/null nếu thiếu quyền |
| WORKER_SENSITIVE_ISSUED | 3 | cccdIssuedDate/cccdIssuedPlace/cccdExpiryDate — null nếu thiếu quyền |
| WORKER_CHIP_RAW | 1 | `cccdChipData` — **always-omit** (DEC-05), KHÔNG là key trong `ProjectedWorker` (33 key) |
| STATEMENT_CORE | 13 | |
| VENDOR_FINANCIAL | 1 | `totalAmount` (vendor payable) — internal luôn thấy |
| CLIENT_COMMERCIAL | 1 | `totalAmount` (client receivable) — gate `CAN_VIEW_STATEMENT_MARGIN` |
| PAYSLIP_SELF_FINANCIAL | 8 | |
| WITHDRAWAL_SELF_BANK | 6 | id/amountVnd/bankAccount/bankName/status/createdAt (omit ctvId) |
| PAYROLL_CONFIG_OPERATIONAL | 12 | omit `createdBy` |

Cross-check impl: `WORKER_MASKED_FIELD_COUNT === 6`, `WORKER_ISSUED_FIELD_COUNT === 3` (helper == manifest length).

---

## 4. DEC coverage

- **DEC-01** allowlist (không raw spread): xác nhận bằng `response-projection.static.test.ts` (20 tests, detector có răng) + leak grep §5.9 "No matches".
- **DEC-02** row-auth → field-projection; resolver fail-closed: `statements-list` FAIL-CLOSED test (resolver throw → client `totalAmount` omit, không 500).
- **DEC-04/05** worker sensitive mask + `cccdChipData` always-omit kể cả self/privileged: `worker-projection.test.ts` + `workers-me.projection.route.test.ts`.
- **DEC-06** `/api/statements` generic internal-only, vendor 403 zero-call; client-commercial gate: `statements-list.projection.route.test.ts`.
- **DEC-09** CTV self omit `ctvId`, owner = session: `ctv-withdrawals.projection.route.test.ts`.
- **DEC-13** BigInt/Decimal→string, Date→ISO: assert `.toBe('500000')`/`'777777'`/ISO trong các route test.
- **DEC-14** blocking gate = `npm run test:unit`.

---

## 5. §6 mandatory gate evidence (THẬT — trạng thái cuối)

| # | Command | Exit | Output (trích) |
|---|---|---|---|
| 5.1 | `verify-task.ps1 -TaskPath …/TASK.md` | **0** | `RESULT: PASS. TASK contract is ready for execution.` |
| 5.2 | `npx tsc --noEmit` | **0** | (no output) |
| 5.3 | `npx eslint <§6 paths>` | **0** | `2 problems (0 errors, 2 warnings)` — pre-existing `any` §8 |
| 5.4a | `npx vitest run <5 baseline §6 files>` | **0** | `Test Files 5 passed / Tests 72 passed` |
| 5.4b | `npx vitest run <6 M1-09A files, targeted UPDATED>` | **0** | `Test Files 6 passed / Tests 105 passed` |
| 5.5 | `npm run test:unit` (blocking) | **0** | `Test Files 85 passed / Tests 1293 passed` |
| 5.6 | `npm run build` | **0** | build hoàn tất, route list in đầy đủ |
| 5.7 | `git diff --check` | **0** | chỉ warning CRLF (informational, §8) |
| 5.8 | `git status --short` | — | partition §7 |
| 5.9 | `rg "NextResponse.json((row\|…))\|...(row\|…)" <6 dir>` | — | **No matches** (không rò raw response) |
| 5.10 | `rg "model (Payment\|PaymentAllocation)" prisma/schema.prisma` | — | **No matches** → `SCHEMA_NOT_AVAILABLE` (§9) |

File test mới `statements-list.projection.route.test.ts` chạy riêng: **17 tests passed, exit 0**.
Note §6-241: đã cập nhật targeted command (5.4b) vì có file test mới; KHÔNG bỏ full unit (5.5)/build (5.6).

Delta test count: baseline full-unit 84 files/1276 tests → **85 files/1293 tests** (+1 file, +17 tests = `statements-list`).

## 6. AC self-mapping (CLAIM — Tier 3 verify độc lập)

| AC | Claim | Evidence chính |
|---|---|---|
| AC-01 | 11 surface khai báo route/allowedRoles⊆roles/fieldGroups hợp lệ | `manifest.test.ts` |
| AC-02 | WORKER_LIST masked khi thiếu `CAN_VIEW_WORKER_SENSITIVE` | `worker-projection.test.ts` |
| AC-03 | WORKER_SELF self thấy own CCCD/bank; chip omit; identity=ctx.workerId | `workers-me.projection.route.test.ts` (17) |
| **AC-04** | STATEMENT_LIST client `totalAmount` gate `CAN_VIEW_STATEMENT_MARGIN`; vendor luôn; fail-closed; role×perm sentinel + DB-mock zero-call | **`statements-list.projection.route.test.ts` (17)** — bổ sung round này |
| AC-05 | STATEMENT_GENERATE command-result DTO, không lộ line/rate/amount/BigInt | `statements-generate.projection.route.test.ts` (16) |
| AC-06 | (worker-me & internal surfaces role gate) | route tests |
| AC-07 | margin gate internal + `CAN_VIEW_STATEMENT_MARGIN` | `statements-margin.route.test.ts` (17) |
| AC-08 | CTV self omit `ctvId`, owner=session | `ctv-withdrawals.projection.route.test.ts` (27) |
| AC-10 | SYSTEM_ROLES = 13 canonical, mọi role phân loại | `manifest.test.ts` |
| AC-11 | static gate rò-rỉ response có răng (neg+pos fixtures) | `response-projection.static.test.ts` (20) |
| AC-12 | PAYMENT = SCHEMA_NOT_AVAILABLE, defer M8-06, không mock-pass | `manifest.test.ts` + grep 5.10 |
| AC-13 | verify/tsc/lint/targeted/full-unit/build/diff exit 0 | §5 |
| AC-14 | (traceability RQ↔STEP↔AC) | contract §Traceability |

**Đóng gap AC-04 round này:** trước đó nhánh conditional-spread client `totalAmount` của STATEMENT_LIST chỉ phủ static (structural), CHƯA có test behavioral sentinel. AC-04 BLOCKING yêu cầu "Role × permission tests" + "DB mock zero-call + sentinel assertions". Tôi đã tạo `src/domains/security/statements-list.projection.route.test.ts`:
- internal reader THIẾU perm → 200, vendor `totalAmount='500000'` CÓ, client `totalAmount` OMIT, JSON không chứa canary/`777777`/BigInt.
- CÓ perm → client `totalAmount='777777'` (string, DEC-13).
- resolver THROW → fail-closed (client omit, không 500).
- `it.each` 4 allowed → 200 (resolver+withDbContext gọi); 9 denied → 403 TRƯỚC DB/resolver (zero-call).
- enumerate 13 role (enum drift → fail).

---

## 7. Git-diff partition (SHARED tree — chỉ MINE thuộc M1-09A)

**MINE — modified (11 file, +413 / −138):**
`app/api/statements/route.ts` (104), `app/api/statements/generate/route.ts` (39), `app/api/vendor/statements/[id]/export/route.ts` (19), `app/api/webhook/payslip/route.ts` (43), `app/api/ctv/withdrawals/route.ts` (14), `app/api/payroll/route.ts` (34), `app/api/workers/route.ts` (4), `app/api/workers/[id]/route.ts` (2), `app/api/workers/me/route.ts` (12), `src/shared/auth/worker-projection.ts` (192), `src/shared/auth/worker-projection.test.ts` (88).

**MINE — untracked (7 file):**
`src/shared/projection/manifest.ts`, `src/shared/projection/manifest.test.ts`, `src/domains/security/{workers-me, statements-generate, statements-list, ctv-withdrawals, response-projection.static}.…test.ts`.

**NOT-MINE — modified (19 file, stream song song — KHÔNG chạm):**
`app/(portal)/ve-chung-toi/page.tsx`, `app/admin/layout.tsx`, `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, `app/api/me/route.ts`, `app/ctv/layout.tsx`, `app/layout.tsx`, `app/login/login-form.tsx`, `app/login/page.tsx`, `app/vendor/layout.tsx`, `app/worker/layout.tsx`, `middleware.ts`, `src/domains/security/portal-domains.integration.test.ts`, `src/domains/security/single-domain-consolidation.test.ts`, `src/shared/auth/auth-context.ts`, `src/shared/auth/jwt.ts`, `src/shared/auth/user.test.ts`, `src/shared/observability/middleware.test.ts`, `src/shared/routing/portal-landing.ts`.

**NOT-MINE / FORBIDDEN — untracked (8, §4.2 forbidden — KHÔNG động):**
`docs/HRP_REMAINING_ROADMAP.md`, `docs/aff_plan.md`, `docs/aff_plan - Copy.md`, `scripts/debug-parser.mjs`, `scratch/{db-state-check, seed-mkt-probe}.mjs`, `scratch/{run_m1_06b, run_m1_06c}_audit.ps1`.

## 8. Deviations & notes (minh bạch — không giấu)

1. **eslint 2 warnings (0 errors)** — `@typescript-eslint/no-explicit-any` tại `app/api/workers/[id]/route.ts:69:17` và `app/api/workers/route.ts:142:17`, đều trên block `catch (err: any)` xử lý lỗi Prisma (`err.code === 'P2025'`/`'P2002'`) **có TRƯỚC M1-09A** (diffstat 2 file này chỉ đổi 2/4 dòng — là dòng projection, KHÔNG phải catch). Warning ⇒ eslint exit 0 ⇒ gate PASS. Không sửa: chuyển `unknown` cần narrow `err.code` = scope creep vào nhánh lỗi ngoài phạm vi test.
2. **STATEMENT_MARGIN (#5) & VENDOR_STATEMENT_LIST (#7) đã sạch sẵn** — không thuộc set tôi sửa; đọc xác nhận đã DTO-clean (margin: `{...margin}` = aggregate tính toán, KHÔNG phải raw Prisma row; vendor-list: `select`+`.map()`). Phủ bằng static gate + manifest declaration, không cần đổi code.
3. **`git diff --check` chỉ có warning CRLF** ("LF will be replaced by CRLF") — informational eol trên Windows, KHÔNG phải whitespace error; exit code 0.
4. **Working tree SHARED** — 19 file modified + 8 untracked là của stream song song / forbidden (§7). Tôi KHÔNG stash/reset/commit/sửa chúng. KHÔNG commit/push/merge (chờ Tier 3 → Tier 1).

---

## 9. M1-09B / M8-06 — Payment projection (SCHEMA_NOT_AVAILABLE)

`rg "model (Payment|PaymentAllocation)" prisma/schema.prisma` → **No matches**. Model canonical `Payment`/`PaymentAllocation` CHƯA tồn tại trong schema ngày 2026-08-28. `manifest.ts::PAYMENT_PROJECTION = { status:'SCHEMA_NOT_AVAILABLE', models:['Payment','PaymentAllocation'], deferredTo:'M8-06 (M1-09B)' }`, verify bởi `manifest.test.ts`. **KHÔNG mock-pass, KHÔNG diễn giải thành PASS của Payment** (AC-12/RQ-13). Kích hoạt khi M8-06 tạo schema.

---

## 10. Không làm (ranh giới Tier 2)

KHÔNG self-audit; KHÔNG viết/sửa AUDIT.md; KHÔNG sửa TASK.md/CLAUDE.md/vitest*.config/package.json/prisma/**; KHÔNG commit/push/deploy. Sentinel toàn synthetic (không PII/secret thật).

---

Handoff status: READY_FOR_AUDIT
