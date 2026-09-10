# V5 READINESS ASSESSMENT — HRP

> **Ngày khảo sát:** 2026-08-22 · **Phạm vi:** toàn hệ thống (schema, migrations, `src/domains`, `src/shared`, `app/api`, testing, CI) đối chiếu `docs/UNIFIED_PLAN_v5.md` (V5.2) và `docs/V5_3_TIER_EXECUTION_GUIDE.md` (1.0).
> **Phương pháp:** đọc plan + schema + code; chạy thực tế `npx vitest run` (**610/610 PASS**, 36 file, 100s), `npm run build` (**PASS**, exit 0), `npx prisma validate` (**PASS**); grep kiểm chứng chéo từng finding quan trọng.
> **Ràng buộc:** khảo sát only — không thay đổi source code.

---

## TỔNG KẾT ĐIỀU HÀNH

| Track | Verdict | Ghi chú |
|---|---|---|
| **Marketplace MP-2 → MP-3** | 🟡 **READY WITH CONDITIONS** | Contract §7.9 đủ chi tiết; MP-2 đang giữa vòng Tier 2; cần đốt nợ Wave 0–1 trước khi đóng MP-3 |
| **G0 Baseline** | 🔴 **IN DEBT** | Không CI, không `tests/fixtures/`, seed chưa đạt AC G0-02 — §4.13.1 ("G0 trước portal") **đã bị vi phạm trên thực tế** vì MP-1 đã ACCEPTED |
| **M1 Identity/RLS** | 🟡 **PARTIAL** | L2 (RLS + GUC) bài bản, có test matrix thật; L1 (`withAuthScope`) **chết — 0/58 route dùng**; auth (refresh/OTP/rate-limit) chưa có |
| **M7 / M8 / PAY** | 🟢 **PLAN-READY, SCHEMA-GAP** | Plan chi tiết tốt; schema còn thiếu model (Payment, PayRun family, CommissionGroup/Override...) — chấp nhận được vì plan đã định nghĩa artifact |
| **Quy trình 3-Tier** | 🟢 **ĐANG VẬN HÀNH TỐT** | 32 task folder, TASK/HANDOFF/AUDIT + verify scripts có thật; handover mp1/mp2 rõ ràng |

> [!WARNING]
> **3 rủi ro nghiêm trọng nhất cần xử lý trước khi tiếp tục mở endpoint mới:**
> 1. **`app/api/debug/route.ts` không auth** — dump Worker PII theo SĐT hardcode + cấu hình DB (mặc dù URL đã mask). Endpoint production công khai.
> 2. **Sai tiền trong statement generation** — `src/domains/reconciliation/statement.service.ts:183,308`: `BigInt(Math.round(item.totalHours)) * rate` làm tròn giờ **thành số nguyên trước khi nhân rate** → công 7.5h bị tính 8h. Vi phạm trực tiếp chuẩn §6.7 và AC V5-M8-04.
> 3. **`app/api/workers/route.ts:53-63` trả nguyên row Worker** (CCCD, SĐT, địa chỉ, bank) không projection cho 7 role gồm SALE/DIRECTOR — vi phạm V5-M1-09 đang chạy trước khi M1-06..09 hoàn tất.

---

## PHẦN 1 — TECHNICAL DEBT AUDIT

### 1.1. Định lượng hiện trạng

| Chỉ số | Giá trị | Đối chiếu V5 |
|---|---|---|
| Route API (`app/api/**/route.ts`) | 58 file | — |
| Route dùng `withDbContext` (L2/RLS GUC) | 20/58 | §6.3.1 |
| Route dùng `withAuthScope` (L1) | **0/58** | §6.3.1 — **L1 hoàn toàn không wire** |
| Route import Prisma trực tiếp, không wrapper | 38/58 | V5-M1-06 |
| Test | 36 file / 610 test, **all pass**, ~10 file integration DB thật | §8.1 |
| Build / `prisma validate` | PASS / PASS | — |
| Migrations | 17 đã commit + 1 WIP (`20260822030000_mp2_apply_tracking`); 8 migration RLS chuyên biệt + 1 restore matrix | — |
| CI | **Không có `.github/workflows/`**; `package.json` không có script `typecheck`/`lint` | V5-G0-04 **chưa bắt đầu** |
| Fixtures nghiệp vụ | **Không có `tests/fixtures/`** | V5-G0-05 **chưa bắt đầu** |

### 1.2. Kiến trúc & Code Smells

| ID | Mức | Finding | Evidence |
|---|---|---|---|
| A-01 | **P0** | Debug endpoint không auth, trả PII worker + thông tin môi trường | `app/api/debug/route.ts:12-16` |
| A-02 | **P0** | `withAuthScope` được định nghĩa + test nhưng không route nào dùng; 38 route truy cập Prisma không qua scope wrapper | `src/shared/auth/with-auth-scope.ts:49` (định nghĩa), grep app/api = 0 usage |
| A-03 | **P0** | GET workers không `select` — trả toàn bộ PII (CCCD, bank, địa chỉ) cho mọi role đọc được | `app/api/workers/route.ts:53-63` |
| A-04 | **P0** | Làm tròn giờ thành integer trước khi nhân rate → sai số tiền (7.5h → 8h) | `src/domains/reconciliation/statement.service.ts:183,308` |
| A-05 | **P1** | Auth chưa production-ready: JWT 8h chết cứng, không refresh rotation, không revoke session, login không rate-limit, không OTP | `src/shared/auth/jwt.ts:8-13`, `app/api/auth/login/route.ts` (V5-M1-01..03 open) |
| A-06 | **P1** | Commission hardcode `counts.accepted * 500_000` — **đúng literally** biểu thức mà V5-M6-04 cấm | `app/api/ctv/summary/route.ts:44` |
| A-07 | **P1** | File khổng lồ, khó audit: `ticket.service.ts` 941 dòng, `app/(portal)/page.tsx` 750, `ledger.service.ts` 625 | wc -l |
| A-08 | **P2** | `BigInt(Number(amountVnd))` — mất precision >2^53 khi client gửi number | `app/api/ctv/withdrawals/route.ts:39` |
| A-09 | **P2** | 4 script dev ở repo root tự tạo `PrismaClient` (check.js, check_user.js, seed_payroll.js, seed_portal.js) — không có trong src/app (G0-03 gần đạt) | root scripts |
| A-10 | **P2** | BoD dashboard dùng placeholder `filled * 100_000_000` thay số liệu thật | `src/lib/services/bod.service.ts:348` |
| A-11 | **INFO** | `$queryRawUnsafe/$executeRawUnsafe` tập trung đúng tầng domain/repository (không nằm trong route) — điểm tốt | staffing, reconciliation, rls-context |

### 1.3. Database & Queries

| ID | Mức | Finding | Evidence |
|---|---|---|---|
| D-01 | **P0** | Drift migration đang treo: migration MP-2 thêm `slot_id`, `public_tracking_code`, `idempotency_*`, `application_status_history` nhưng `schema.prisma` **chưa có** các model/cột này (Tier 2 đang giữa vòng) | `prisma/migrations/20260822030000_mp2_apply_tracking/migration.sql` vs schema |
| D-02 | **P1** | `prisma migrate dev` hỏng (shadow DB + `portal_timesheets` raw của appBCC) → áp SQL tay + `migrate resolve --applied` (DEC-NEW-04/05); grant SQL nằm ngoài migration (`prisma/grants-hrp-m12.1.1.sql`) → rủi ro drift tiếp | migrations, scripts/apply-grants |
| D-03 | **P1** | Toàn bộ state machine dùng **string tự do** (Project.status, Worker.*, CandidateSubmission.status, statements...) — vi phạm §6.4.2 "status dùng Prisma enum/check constraint". Chỉ Ticket dùng enum | `prisma/schema.prisma` (rải rác) |
| D-04 | **P1** | Thiếu model theo contract V5: `AuthIdentity` (vẫn là TODO comment dòng 203), session/refresh token, `Payment`/`PaymentAllocation` (M8-06), PayRun family (PAY-01), `CommissionGroup`/`CommissionOverride` (M6-01/02), `Project.publicSlug`, `StaffingOrder.openAt/closeAt`, status `CONVERTED`/`NEEDS_INFO` cho submission | schema vs §7.9.3, §4.3, §4.6–4.8 |
| D-05 | **P1** | FK mồ côi + index thiếu: `VendorStatementLine.statementId`, `ClientStatementLine.statementId`, `ProjectAssignment.staffingOrderId`, `SourceClaim.submissionId`, `TimesheetLine.periodId/projectId`, `AttendanceEvent.projectId/assignmentId`, `CommissionLedger.ctvId`... đều là cột thường, không @relation, không @@index (Postgres không tự index FK) → seq scan + mất toàn vẹn tham chiếu khi dữ liệu lớn | schema.prisma |
| D-06 | **P2** | Trường song song gây nhiễu: `Worker.userId` (string "USR-001", không FK) vs `Worker.accountUserId` (FK); `Project.filled` vs `StaffingOrderSlot.slotsFilled` (hai nguồn denormalized); `PortalTimesheet` là bảng legacy song song với `TimesheetLine` và dùng `Decimal(12,2)` cho `totalIncome` — vi phạm ADR-010 BigInt VND | schema.prisma |
| D-07 | **INFO** | **Điểm mạnh:** RLS thiết kế bài bản — 8 migration RLS + restore matrix, `FORCE ROW LEVEL SECURITY`, deny-by-default, GUC transaction-local (`set_config(..., true)`), helper SECURITY DEFINER, test matrix thật 13 role × 4 bảng chạy trong CI-suite vitest | migrations `s1_rls_*`, `src/shared/auth/rls-context.ts:56-71` |
| D-08 | **INFO** | Runtime role `app_user_writer` không BYPASSRLS — test RLS enforce thật, không hình thức | `vitest.config.ts` |

### 1.4. Testing

| ID | Mức | Finding |
|---|---|---|
| T-01 | **P0** | Không CI — mọi verify (test/build/validate) chạy tay; guide C-01..C-02 phụ thuộc kỷ luật Tier 3. V5-G0-04 chưa có dấu hiệu bắt đầu dù MP-1 đã ACCEPTED |
| T-02 | **P1** | Không `tests/fixtures/operations` (G0-05) — golden case "đủ tháng, chuyển project giữa kỳ, ca đêm, OT" chưa đóng gói dùng chung |
| T-03 | **P1** | Integration test đọc `DATABASE_URL` từ `.env` (DB Neon dev chung), `fileParallelism: false`, toàn suite 100s — cần test DB riêng + đánh dấu `ENV_BLOCKED` theo §8.3 khi đưa lên CI |
| T-04 | **INFO** | Chất lượng test tốt bất thường cho giai đoạn này: security matrix 13 role × 4 bảng, RLS leak-check (count/aggregate scoped), IDOR update ngoài scope = 0 rows, idempotency/outbox/state-machine có unit test |
| T-05 | **P1** | `prisma/seed.mjs` (562 dòng) seed được admin/HR/vendor/worker demo nhưng chưa đạt AC G0-02 (thiếu permission chuẩn theo Permission Pool, chưa đủ bộ 2 client/20 worker/2 kỳ công chuẩn hóa) |

> [!IMPORTANT]
> **Vi phạm thứ tự thực thi đã xảy ra:** §4.13.1 yêu cầu `V5-G0-*` hoàn tất trước mọi task portal, nhưng MP-1 đã `ACCEPTED` (commit `ead9869`) trong khi G0-04 (CI) và G0-05 (fixture) = 0%. Không phá hủy gì, nhưng mọi evidence hiện tại là "chạy tay" — cần đóng nợ G0 **trước khi đóng MP-3** để launch gate §7.9.7 có nền cơ khí.

---

## PHẦN 2 — REFACTORING PLAN

Nguyên tắc: **mapping vào task ID V5 hiện có trước tiên** (Section 4 là canonical); chỉ đề xuất ID mới khi plan chưa phủ. Mỗi task ≤ 1–3 ngày công, ≤ 1 boundary chính (§6.1) — sẵn sàng cho Tier 1 dựng `TASK.md`.

### Wave 0 — Hotfix an toàn & đúng tiền (P0 · ~2 ngày · chạy song song MP-2, không đụng file Tier 2 đang sửa)

| ID (map V5) | Việc | Acceptance tối thiểu | Rollback |
|---|---|---|---|
| RF-01 (OPS-06 rút gọn) | Xóa hoặc khoá `app/api/debug` sau auth ADMIN, không trả PII/DB info | GET không auth → 404/401; không còn findFirst theo phone hardcode | Revert 1 commit, không phụ thuộc |
| RF-02 (M1-09 rút gọn) | `app/api/workers` + `workers/[id]` đổi sang projection DTO theo role (tái dùng `worker-projection.ts`) | Contract test: SALE/MKT không nhận CCCD/bank; HR nhận theo scope | Revert commit; projection thuần read |
| RF-03 (M8-04 rút gọn) | Sửa `Math.round(totalHours)`: nhân Decimal hours × BigInt rate bằng helper money, làm tròn **sau khi nhân** theo quy ước rounding (ghi ADR interim; Decision Register §10 "rate rounding" vẫn chờ kế toán) | Golden test: 7.5h × rate cho kết quả định trước; statement cũ không đổi | Revert + golden test cũ giữ nguyên |
| RF-04 (M6-04 rút gọn) | `ctv/summary` đọc từ `CommissionLedger` thật thay `accepted * 500_000`; nếu chưa có ledger thì trả `null` + note, không trả số giả (đúng §7.6/PAY nguyên tắc fail-closed) | Không còn literal 500_000 trong route; API response có trường nguồn số liệu | Revert 1 commit |

### Wave 1 — Đốt nợ G0 (P0 · trước khi đóng MP-3)

| ID (map V5) | Việc | Acceptance tối thiểu | Rollback |
|---|---|---|---|
| RF-05 (= G0-04) | Dựng CI: thêm script `typecheck`, `lint`, `test:unit`, `test:integration` vào package.json; GitHub Actions chạy validate + unit + build; integration đánh `ENV_BLOCKED` đến khi có secret test DB | PR thử nghiệm fail khi test đỏ; workflow file trong repo | Tắt workflow (workflow_dispatch off) — không ảnh hưởng runtime |
| RF-06 (= G0-02) | Nâng cấp `seed.mjs` lên chuẩn G0-02: seed permission pool (RolePermission), 2 client/2 project/2 vendor/20 worker/2 kỳ công, upsert business key | Reset + seed lặp lại không duplicate; smoke query pass | Seed là idempotent upsert — rollback tự nhiên |
| RF-07 (= G0-05) | Tạo `tests/fixtures/operations/*` từ seed (đủ tháng, chuyển project giữa kỳ, ca đêm, OT, correction, dispute) dùng chung unit/integration | Fixture được ≥ 2 suite import; không phụ thuộc .env tay | Thư mục mới — xóa là xong |
| RF-08 (= G0-01 phần còn lại) | Đưa `grants-hrp-m12.1.1.sql` vào migration; runbook hóa luồng "apply tay + migrate resolve" (DEC-NEW-04) thành script một nút; thêm bước `prisma migrate diff` vào CI để phát hiện drift schema↔DB | CI bắt được drift (thử bỏ 1 cột ở DB dev → job đỏ) | Additive-only; không đụng migration cũ |
| RF-09 (mới, đề xuất G0-06) | Repo hygiene: commit/xác nhận 107 file xóa `appBCC/*` (sếp chủ trì — khu vực của sếp); chuyển `check.js`/`seed_*.js` từ root vào `scripts/dev/` | `git status` sạch với sếp; root không còn script PrismaClient rời | Chuyển file thuần — revert dễ |

### Wave 2 — M1-min & L1 wiring (P0/P1 · trước public launch, khớp Hardening-1 guide §3.1)

| ID (map V5) | Việc | Acceptance tối thiểu | Rollback |
|---|---|---|---|
| RF-10 (= M1-06) | Wire `withAuthScope` vào 38 route thiếu — chia 3 task theo domain: (a) admin/ctv, (b) worker/vendor/cron, (c) còn lại. Ưu tiên route trả PII/tiền | Grep gate: không còn route nghiệp vụ import Prisma ngoài wrapper; behavior test các route chính không đổi | Wrapper là lớp ngoài — tắt từng domain bằng flag nếu regress |
| RF-11 (= M1-02 tối thiểu) | Session version trong JWT + bảng session để revoke one/all device; **mở rộng identity-core hiện có theo DEC-11, không viết lại auth** | Logout vô hiệu token cũ; revoke all có audit; test độc lập | Bảng + claim additive; giữ đường verify cũ song song 1 release |
| RF-12 (= M1-05) | Bổ sung visibility matrix đầy đủ **13 role** (plan đang chỉ định nghĩa 8 — xem C-02 bên dưới); fixture expected cho SALE/HR_STAFF/VENDOR_ADMIN/VENDOR_STAFF/CTV/EMPLOYEE | Matrix test mở rộng pass; response theo projection | Chỉ thêm test — không rollback cần |
| RF-13 (= M1-08) | Bộ test IDOR vendor A↔B cho orders/submissions/statements/dispute | Cản dùng test từ matrix sẵn có, chuẩn hoá thành suite riêng | Test-only |

### Wave 3 — Schema chuẩn hóa (P1 · trước khi mở M7/M8)

| ID (map V5) | Việc | Acceptance tối thiểu | Rollback |
|---|---|---|---|
| RF-14 (= M35-02 phần schema) | Enum hóa status theo expand→migrate→contract: thêm cột enum mới + backfill + check constraint, giữ cột string 1 release rồi swap; đồng thời thống nhất vocab (statement: `ISSUED`/`REVISED`; submission: thêm `CONVERTED`/`NEEDS_INFO`) | Migration chạy trên DB sạch + DB nâng cấp; không còn string tự do cho state machine | Expand/contract cho phép rollback ở từng pha |
| RF-15 (mới) | Bổ sung @relation + @@index cho FK mồ côi (D-05); kèm EXPLAIN trước/sau trên fixture 20k worker (§6.4.8) | EXPLAIN dùng index scan; FK violation bị chặn | Additive (tạo FK sau khi validate data) — từng bảng |
| RF-16 (ADR mới) | Hợp nhất `Worker.userId` vs `accountUserId`; quyết định nguồn sự thật `Project.filled` vs `slotsFilled` (giữ 1, view/projection cho cái còn lại) | ADR ghi rõ; migration expand→migrate→contract; không còn 2 nguồn ghi | Tự nhiên theo expand→contract |
| RF-17 (ADR mới, phối sếp) | Nghỉ hưu `portal_timesheets` (legacy appBCC, Decimal tiền vi phạm ADR-010): migrate sang `TimesheetLine` hoặc đóng băng read-only có ghi chú | Không ghi mới vào portal_timesheets từ app chính; dữ liệu cũ truy vấn được | Read-only fence — đảo flag là xong |

### Wave 4 — Dọn tiền & chuẩn bị M6 (P1/P2)

| ID | Việc | Rollback |
|---|---|---|
| RF-18 | `ctv/withdrawals` chỉ nhận BigInt-as-string (từ chối number) — chuẩn §6.7 | Revert 1 commit |
| RF-19 | Thay placeholder BoD `filled * 100_000_000` bằng projection từ VendorStatement/Project thật (đóng lỗi DEV-01 của S01) | Revert; không ảnh hưởng dữ liệu |

**Guardrails chung cho mọi wave:** (1) không migration destructive trong cùng release code chưa tương thích (§6.4.6); (2) LOCKED record chỉ sửa bằng revision/adjustment; (3) mỗi task có HANDOFF + AUDIT theo guide — "build pass" không phải hoàn tất (§1.2 guide).

---

## PHẦN 3 — V5 PLAN EVALUATION

### 3.1. Độ chín thực thi

| Tiêu chí | Đánh giá | Ghi chú |
|---|---|---|
| API contract | 🟢 Sẵn | §6.3 + bảng endpoint §7.9.4 đủ chi tiết cho MP-2/MP-3 (đã chứng minh: MP-1 ACCEPTED, MP-2 đang code theo đúng contract) |
| Schema/migration chuẩn | 🟢 Sẵn | §6.4 quy ước rõ (BigInt VND, half-open interval, expand→migrate→contract) |
| Permission definition | 🟡 Gần xong | Matrix §7.2 chỉ 8 role, hệ thống có 13 — thiếu fixture expected cho 6 role (C-02) |
| State machine | 🟢 Sẵn | §6.5 có type contract + sequence; §7.9.5 đủ cho submission |
| Test strategy | 🟢 Sẵn | §8.2 matrix theo domain cụ thể, đo được |
| Rollback/runbook | 🟢 Sẵn | §9 + decision register §10 nêu rõ "chưa chốt thì không làm gì" |
| **Điểm mơ hồ dễ scope-creep** | 🟡 | Xem danh sách dưới |

**Điểm mơ hồ cần chốt trước khi giao Tier 2 (nguy cơ lạc trôi):**
1. **MP-2 đang có 2 đường apply song song**: canonical `POST /api/public/jobs/:slug/applications` (TASK mp2) và legacy `POST /api/jobs/apply` (projectId-based, `submitLegacyPublicApplication`). Plan không có task nàoexplicit retire route legacy → dễ để tồn dư 2 entry point public.
2. **"ISR 300s" (V5-PORTAL-01)** chưa quy định cơ chế invalidation khi HR publish/unpublish — Tier 2 dễ tự chế (revalidate vs cron).
3. **Upload CV ở MP-2** (migration đã có `cv_storage_key`) nhưng plan chỉ định nghĩa "upload hồ sơ tùy chọn" — thiếu contract storage (R2 presign? size/mime whitelist?) → cần chốt trước audit MP-2, hoặc ghi rõ out-of-scope.
4. **Rounding quy ước** (§10 Decision Register) chưa chốt mà statement generation đã chạy — RF-03 cần ADR interim ngay.
5. **Queue role MP-2** ("ADMIN, HR_MANAGER, DIRECTOR, SALE theo scope hiện hành") — "scope hiện hành" là ngầm định theo RLS hiện có; cần bảng role×action tường minh trong TASK để Tier 3 không tranh cãi.

### 3.2. Tính đồng nhất (plan ↔ guide ↔ codebase)

| ID | Mâu thuẫn | Vị trí | Mức |
|---|---|---|---|
| C-01 | **Thứ tự thực thi bị vi phạm:** §4.13.1 "G0 trước portal" vs MP-1 ACCEPTED khi chưa có CI/fixture | plan §4.13 vs git log | P1 |
| C-02 | **Vai trò 8 vs 13:** matrix M1 và UAT dùng "8 role"; `SystemRole` có 13 (thêm HR_STAFF, SALE, VENDOR_ADMIN, VENDOR_STAFF, CTV, EMPLOYEE); test thật đang chạy 13×4 | plan §7.2/§4.12 vs schema dòng 106-120 | P1 |
| C-03 | **Từ vựng trạng thái statement:** schema `DRAFT→SENT→DISPUTED→CONFIRMED→LOCKED→PAID` vs M8-05 `DRAFT→ISSUED→CONFIRMED/DISPUTED→REVISED→LOCKED` + payment state tách riêng (M8-06). `PAID` đang vừa là trạng thái statement vừa mâu thuẫn "tách LOCKED khỏi PAID" | schema §8 vs plan §4.6 | P1 |
| C-04 | **Submission status:** schema có `MERGED` (dedup) nhưng không có `CONVERTED`/`NEEDS_INFO` theo state machine §7.9.5 — MP-3 sẽ phải thêm; `MERGED` và `CONVERTED` là 2 khái niệm khác nhau đang risking bị dùng lẫn | schema dòng 461 vs plan §7.9.5 | P1 |
| C-05 | **`publicSlug`:** §7.9.3 yêu cầu trường riêng, invariant rõ; MP-1 (đã ACCEPTED) implement `slug = Project.code` — dùng mã nội bộ làm URL công khai, không đổi được độc lập | `src/domains/job-board/public.service.ts:52` | P2 |
| C-06 | **Hai hình thái TASK.md:** plan §6.2 (Objective/Scope/Contract/Acceptance matrix...) vs `.ai-pipeline` template 11-section (RQ/STEP/AC + §0 Control + §9 Resolution). Nội dung tương đương nhưng hình thức khác — Tier mới dễ nhầm format nào canonical | plan §6.2 vs handover §8.1 | P2 |
| C-07 | **§6.4.2 quy định enum** nhưng codebase vi phạm 100% và **không có task ID nào** chịu trách nhiệm enum hóa (G0-01 nói "schema canonical" chung chung) | plan §6.4 vs schema | P1 |
| C-08 | **DEC-14 (test mock, không DB thật)** đã lạc hậu: hiện có ~10 file integration dùng Neon dev thật — nên cập nhật decision, tránh Tier mới đọc handover cũ mà bỏ integration test | handover §4 vs vitest.config.ts | P2 |
| C-09 | **DEC-11 (cấm tạo lại auth)** vs V5-M1-02 (refresh rotation/session): cần ghi chú rõ M1-02 là *mở rộng* identity-core (thêm bảng session, đổi issuance), không phải viết lại — nếu không Tier 2 sẽ FROM-scratch vi phạm DEC-11 | handover §4 vs plan §4.3 | P2 |
| C-10 | **Guide nói "Open Questions phải rỗng"** nhưng các quyết định §10 (rounding, maker-checker...) là open-question hệ thống — nên đánh dấu chúng là "decision gate theo phase" để không bị hiểu là block mọi task | guide §4.1 vs plan §10 | P3 |

### 3.3. Bổ sung & Khuyến nghị (proposed amendments trước kick-off tiếp)

| ID | Đề xuất sửa plan | Lý do |
|---|---|---|
| AM-01 | Thêm rule vào §7.9.6/MP-2: **legacy `POST /api/jobs/apply` bị deprecate trong chính task MP-2** (redirect hoặc 410), không cho tồn tại 2 đường apply public | C-01/§3.1.1 |
| AM-02 | Sửa "8 role" → **"13 role (8 role chính + 5 role mở rộng có fixture riêng)"** trong §7.2, §4.12; bổ sung hàng SALE/HR_STAFF/VENDOR_ADMIN/VENDOR_STAFF/CTV/EMPLOYEE vào security matrix | C-02 |
| AM-03 | Thêm task **V5-G0-06: Enum hóa state machine** (hoặc gán rõ vào M35-02) với lộ trình expand→migrate→contract | C-07 |
| AM-04 | Bổ sung §4.6 vocab migration: `SENT→ISSUED`, thêm `REVISED`, tách payment state (đã có M8-06 nhưng cần ghi rõ statement enum cũ bị thay thế) | C-03 |
| AM-05 | Ghi rõ §7.9.3: `publicSlug` là trường riêng (MP-1 đã dùng `code` — cần task nhỏ migrate hoặc ADR chấp nhận lệch) | C-05 |
| AM-06 | Thêm vào §4.13 điều kiện dừng: **"MP-3 không được ACCEPTED khi G0-04/G0-05 chưa PASS"** — chốt lại kỷ luật thứ tự đã bị vi phạm | C-01 |
| AM-07 | §8 bổ sung: integration test dùng **test DB riêng (DATABASE_URL_TEST)** + đánh `ENV_BLOCKED` trong CI; cập nhật DEC-14 thành "hybrid: unit mock + integration DB thật theo §8.1" | T-03/C-08 |
| AM-08 | Trong TASK mp2: chốt **contract upload CV** (metadata-only hay R2 presign; whitelist mime/size) hoặc ghi out-of-scope đích danh | §3.1.3 |
| AM-09 | Thêm ghi chú M1-02: "mở rộng identity-core hiện có (DEC-11), cấm viết mới bộ auth" | C-09 |
| AM-10 | Thêm task nhỏ vào backlog M8/PAY: **nghỉ hưu `portal_timesheets`** (bảng legacy Decimal-tiền, song song sự thật với TimesheetLine) — hiện plan chưa có task nào xử lý nó | D-06 |

---

## VERDICT & HÀNH ĐỘNG TIẾP THEO

> [!IMPORTANT]
> **Kết luận:** V5 plan **đủ chín để tiếp tục thực thi Marketplace track ngay** (MP-2 đang chạy đúng contract), nhưng **không được mở MP-3** trước khi: (1) xong Wave 0 (4 hotfix P0), (2) đốt nợ G0-04/G0-05 (CI + fixture), (3) Tier 1 áp các amendment AM-01..AM-06 vào plan. M7/M8/PAY giữ nguyên thứ tự — chỉ cần bổ sung model qua đúng quy trình §6.4.

**Checklist cho Tier 1 (theo thứ tự):**
- [ ] Chốt ADR interim cho rounding (RF-03) — chặn sai tiền đang chạy thật
- [ ] Tạo TASK.md Wave 0 (RF-01..04) — mỗi task 1 commit revert được
- [ ] TASK G0-04 (CI) + G0-05 (fixture) — điều kiện đóng MP-3
- [ ] Cập nhật UNIFIED_PLAN_v5 theo AM-01..AM-10 (tăng phiên bản V5.3, ghi Revision Log)
- [ ] Xác nhận với sếp về appBCC deletion + RF-09/RF-17 (khu vực của sếp)
- [ ] Sau MP-2 audit: đối chiếu schema.prisma ↔ migration mp2 đã đồng bộ (D-01) trước khi ACCEPTED

*Nguồn evidence: vitest 610/610 pass (100.25s), npm run build exit 0, npx prisma validate pass, grep kiểm chứng tại các file:dòng đã dẫn; chi tiết task hiện hành theo `docs/PLANNER_HANDOVER.md` §0 (snapshot 21/08).*
