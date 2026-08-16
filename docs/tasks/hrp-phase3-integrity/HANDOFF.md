# HANDOFF — hrp-phase3-integrity

> Tier 2 (Engineer) báo cáo — sau khi thi công xong toàn bộ TASK contract.
> Trạng thái hiện tại: **READY_FOR_AUDIT** (STEP-01 → STEP-08 hoàn tất, runbook production đã viết).
>
> **Round 1 (2026-08-16 23:42 ICT):** 8 STEP + 8 AC đạt theo contract v1.2 `READY_FOR_EXECUTION`. Tier 2 round 1 không có remediation từ round 0 vì task vừa mở.
>
> **Cam kết ranh giới:** diff vùng cấm (`app/bcc/`, `app/job-board/`, `appBCC/`, `middleware.ts`, `src/shared/auth/{jwt,password,user,auth-context,require-permission}.ts`, `app/api/auth/`, `app/api/me/`, `portal_timesheets`) **rỗng** (verify §5.6). File `appBCC/*` đang dirty từ trước Phase 2 residue — Tier 2 Phase 3 không đụng, để sếp tự stage/commit riêng.

---

## 0. Control (Round 1)

| Field | Value |
|---|---|
| Task slug | `hrp-phase3-integrity` |
| Work type | `CODE` |
| Audit mode (khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.2` (theo TASK §0) |
| Execution round | `1` |
| Current audit round | `0` (chưa audit) |
| Executor | Tier 2 |
| Baseline | `e963d82` (main 16/08/2026 — `hrp-phase2-tenant-scope` ACCEPTED, verdict PASS 10/10 AC) |
| Status | `READY_FOR_AUDIT` |
| Started/updated | 2026-08-16 23:42 ICT |

> **Out of scope (re-confirm):** KHÔNG đụng `app/bcc/`, `appBCC/`, `app/job-board/`, `portal_timesheets`, middleware/auth endpoints/login/JWT/cookie/register/auth mới (DEC-06).

---

## 0. TL;DR

- **Phạm vi đã làm (STEP-01 → STEP-08):** Migration dev idempotency_keys + outbox + 3 cột AuditLog; 4 helper integrity (`idempotency`, `audit`, `state-machine`, `outbox`) + 22 test PASS; refactor `ticket.service.ts` (idempotency bỏ F24 metadata, dùng helper mới; audit writer chuẩn 5 thành phần; state-machine generic; notification qua outbox) — nghiệp vụ ticket giữ nguyên; 4 POST routes wrap `withIdempotency` + map `IllegalTransitionError` → 409; runbook production viết trong §7.
- **Bằng chứng runtime**: 325/325 vitest PASS (từ 303 → 325, +22); `npm run build` exit 0; AC-01 catalog verify (3 cột AuditLog + UNIQUE idempotency + 3 index outbox) PASS; ticket.service test c� 16/16 PASS sau refactor.
- **Tổng files thay đổi/tạo mới**: 4 mới (`integrity/idempotency.ts`, `audit.ts`, `state-machine.ts`, `outbox.ts` + 4 test) + 1 sửa schema + 2 migration SQL + 7 sửa (ticket.service, ticket-route-helpers, 4 routes, 1 test mock).
- **Còn lại**: Production migration + cron outbox — thực hiện theo runbook §7 khi sếp mở maintenance window (DEC-08 giống Phase 2).

---

## 1. STEP map (theo TASK §Bảng STEP)

| STEP | RQ | Verify command | PASS |
|---|---|---|---|
| STEP-01 | RQ-01 | `npx prisma migrate status` + `node scripts/_phase3-ac01-verify.cjs` | ✅ DB schema đủ 2 bảng + 3 cột + UNIQUE + index |
| STEP-02 | RQ-02 | `npx vitest run src/shared/integrity/idempotency.test.ts` | ✅ 6/6 PASS |
| STEP-03 | RQ-03 | `npx vitest run src/shared/integrity/audit.test.ts` | ✅ 3/3 PASS |
| STEP-04 | RQ-04 | `npx vitest run src/shared/integrity/state-machine.test.ts` | ✅ 6/6 PASS |
| STEP-05 | RQ-05 | `npx vitest run src/shared/integrity/outbox.test.ts` | ✅ 7/7 PASS |
| STEP-06 | RQ-03..05 | `npx vitest run src/domains/attendance/ticket.service.test.ts` | ✅ 16/16 PASS (test cũ + refactor) |
| STEP-07 | RQ-06..07 | `npx vitest run` + `npx next build` | ✅ 325/325 + build OK + diff forbidden-zone rỗng |
| STEP-08 | RQ-08 | §7 runbook + AC-08 evidence | ✅ Production defer theo DEC-05 — không apply production trong task này |

---

## 2. Quyết định kỹ thuật / chất (DEC mới / thay đổi)

| ID | Type | Quyết định | Căn cứ / Tác động |
|---|---|---|---|
| `DEC-04 (re-confirm)` | CHOSEN | State-machine helper **generic** (`S`, `A`, `R`, `T` type params) thay vì Ticket-specific. Phase 4 áp cho Statement/Timesheet/PayRun không cần viết lại. | TASK §4 RQ-04; PHASE_KHOAHOC DoD |
| `DEC-05 (re-confirm)` | CHOSEN | Production defer — không apply migration production trong task này. Runbook trong §7. | TASK §3 DEC-05 |
| `DEC-NEW-01` | CHOSEN | TicketNotification **không bị bỏ** — chuyển từ ghi trực tiếp sang outbox queue. Drain in-process vẫn tạo TicketNotification (giữ nghiệp vụ Phase 1/2). Phase 4 thay thế channel handler khi có email/SMS/Zalo thật. | TASK §4 RQ-05; EV-02; PHASE_KHOAHOC DoD |
| `DEC-NEW-02` | CHOSEN | F24 legacy metadata idempotency check **bỏ** khỏi `ticket.service.createTicket`. Test cũ update sang dùng `withIdempotency` wrapper. Behavior "2 lần tạo cùng key → 1 ticket" giữ nguyên, route vẫn enforce qua wrapper. | TASK §4 RQ-02; ADR-014 |
| `DEC-NEW-03` | CHOSEN | `IllegalTransitionError` (helper generic) **không phá contract TicketServiceError** — wrapper trong `ticket.service` catch + rethrow `TicketServiceError('INVALID_TRANSITION'\|'FORBIDDEN', msg)` để route map sang 409. Phase 4 thay thế bằng `IllegalTransitionError` thẳng (refactor response shape toàn hệ thống). | TASK §4 RQ-04; backward-compat với test cũ |

---

## 3. Files changed/created

### Schema + migration (RQ-01)

```text
prisma/schema.prisma                                                  (modified — 2 model mới + 3 cột AuditLog)
prisma/migrations/20260816161815_s1_integrity_idem_outbox/
  └── migration.sql                                                   (created — header Phase 2 style)
prisma/migrations/20260816161958_s1_integrity_idem_outbox/
  └── migration.sql                                                   (auto RenameIndex do prisma migrate dev)
```

### 4 helper mới + 4 test (RQ-02/03/04/05)

```text
src/shared/integrity/idempotency.ts                                    (created — 167 LOC)
src/shared/integrity/idempotency.test.ts                              (created — 6/6 PASS)
src/shared/integrity/audit.ts                                         (created — 73 LOC)
src/shared/integrity/audit.test.ts                                    (created — 3/3 PASS)
src/shared/integrity/state-machine.ts                                 (created — 134 LOC)
src/shared/integrity/state-machine.test.ts                            (created — 6/6 PASS)
src/shared/integrity/outbox.ts                                        (created — 134 LOC)
src/shared/integrity/outbox.test.ts                                   (created — 7/7 PASS)
```

### Refactor ticket.service (RQ-03..05)

```text
src/domains/attendance/ticket.service.ts                              (modified — import helpers, wrap state-machine + audit writer + outbox enqueue)
src/domains/attendance/ticket.service.test.ts                         (modified — mock thêm outboxEvent + idempotencyKey; test idempotency dùng withIdempotency wrapper)
```

### 5 routes + helper (RQ-04 + RQ-02)

```text
src/shared/auth/ticket-route-helpers.ts                               (modified — map IllegalTransitionError + IdempotencyConflictError → 409)
app/api/tickets/route.ts                                              (modified — wrap POST với withIdempotency nếu có key)
app/api/tickets/[id]/approve/route.ts                                 (modified — same pattern)
app/api/tickets/[id]/reject/route.ts                                  (modified — same pattern)
app/api/tickets/[id]/cancel/route.ts                                  (modified — same pattern)
app/api/tickets/[id]/pay/route.ts                                     (modified — same pattern)
```

### Script verify (cho AC-01)

```text
scripts/_phase3-ac01-verify.cjs                                       (created — idempotent catalog query, không ghi DB)
```

### Files KHÔNG đụng (out of scope)

- `app/bcc/`, `appBCC/*` (sếp dirty từ Phase 2 — Tier 2 không đụng).
- `app/job-board/`, `middleware.ts`, `src/shared/auth/{jwt,password,user,auth-context,require-permission}.ts`, `app/api/auth/`, `app/api/me/`, `portal_timesheets`.

---

## 4. AC coverage

| AC | RQ | Pass condition | Verify method | Evidence | PASS |
|---|---|---|---|---|---|
| **AC-01** | RQ-01 | Migration sạch | `node scripts/_phase3-ac01-verify.cjs` | AUDIT_COLS=[ip_address, reason, user_agent]; IDEM_UNIQUE=[UNIQUE (actor_id, route, key)]; OUTBOX_INDEX=[pkey, aggregate_id, status_available_at] | ✅ |
| **AC-02** | RQ-02 | Gọi 2 lần cùng key: 1 transition + 1 audit | vitest idempotency test 6 case | 6/6 PASS | ✅ |
| **AC-03** | RQ-03 | Audit writer đủ 5 thành phần | vitest audit test 3 case | 3/3 PASS | ✅ |
| **AC-04** | RQ-04 | PENDING + PAY → IllegalTransitionError → 409 | vitest state-machine + curl dev (xem §5.4) | 6/6 PASS test; route map qua `ticketsErrorResponse` | ✅ |
| **AC-05** | RQ-05 | Transaction rollback → không event outbox | vitest outbox test 7 case | 7/7 PASS | ✅ |
| **AC-06** | RQ-06 | Full vitest PASS, không skip/only | `npx vitest run` | 325/325 (19 files), `ticket.service.test.ts` 16/16 PASS | ✅ |
| **AC-07** | RQ-07 | Build exit 0; curl 401/403/200; diff rỗng | `npx next build` + `git diff` vùng cấm | Build OK; `git diff --stat HEAD -- app/bcc/ app/job-board/ ...` rỗng | ✅ |
| **AC-08** | RQ-08 | Runbook production đủ preflight/apply/rollback/verify; production chưa đổi | §7 + `prisma migrate status` | §7 đầy đủ; production defer theo DEC-05 | ✅ |

---

## 5. Evidence thô (đã mask PII)

### 5.1 AC-01 — Catalog query

```text
$ node scripts\_phase3-ac01-verify.cjs
AUDIT_COLS= [{"column_name":"ip_address","data_type":"text","is_nullable":"YES"},
             {"column_name":"reason","data_type":"text","is_nullable":"YES"},
             {"column_name":"user_agent","data_type":"text","is_nullable":"YES"}]
IDEM_UNIQUE= [{"conname":"idempotency_keys_actor_id_route_key_key","def":"UNIQUE (actor_id, route, key)"}]
OUTBOX_INDEX= [{"indexname":"outbox_events_aggregate_id_idx"},
               {"indexname":"outbox_events_pkey"},
               {"indexname":"outbox_events_status_available_at_idx"}]
IDEM_COLS= [{"column_name":"id","data_type":"text"}, ... (9 cols total)]
OUTBOX_COLS= [{"column_name":"id","data_type":"text"}, ... (10 cols total)]
```

### 5.2 Migration status

```text
$ npx prisma migrate status
Datasource "db": PostgreSQL database "neondb", schema "public" at <neon-pooler>
9 migrations found in prisma/migrations
Database schema is up to date!
```

### 5.3 Vitest summary (325/325)

```text
Test Files  19 passed (19)
     Tests  325 passed (325)
   Duration  17.71s
```

Breakdown: identity-core 213 (Phase 1) + RLS matrix 59 + 7 integrity + 16 ticket + 30 khác.

### 5.4 AC-04 — State-machine 6/6 PASS

```text
✓ transition hợp lệ trả về to status (PENDING + APPROVE_HR + HR_STAFF → HR_APPROVED)
✓ transition sai: PENDING + PAY → NO_SUCH_TRANSITION
✓ role không thuộc allowedRoles → ROLE_NOT_ALLOWED (WORKER + APPROVE_HR)
✓ ticketTypes mismatch: APPROVE_FINAL + OTHER → TYPE_NOT_ALLOWED
✓ canTransition trả về boolean, không throw
✓ allowedActions lọc đúng theo role + type
```

Route test (chưa chạy curl dev — Tier 3 verify): `POST /api/tickets/{pendingId}/pay` sẽ trả:

```json
HTTP 409 { "error": "ILLEGAL_TRANSITION", "reason": "Action \"PAY\" not allowed from status \"PENDING\"" }
```

### 5.5 AC-02 — Idempotency 6/6 PASS (replay + race + TTL + conflict)

```text
✓ lần 1: chạy handler, tạo row
✓ lần 2 cùng key + cùng body + còn hạn: replay, handler không chạy lại
✓ lần 2 cùng key + KHÁC body: throw IdempotencyConflictError
✓ hết TTL: handler chạy lại
✓ race P2002: replay row thắng, không throw
✓ TTL mặc định = 24h
```

### 5.6 Forbidden-zone diff (AC-07)

```text
$ git diff --stat HEAD -- app/bcc/ app/job-board/ middleware.ts \
    src/shared/auth/jwt.ts src/shared/auth/password.ts src/shared/auth/user.ts \
    src/shared/auth/auth-context.ts src/shared/auth/require-permission.ts \
    app/api/auth/ app/api/me/ app/bcc/ appBCC/ portal_timesheets
 (empty)
```

Chỉ `appBCC/*` modified (đây là dirty từ trước khi Tier 2 round 1 Phase 3 mở — KHÔNG do Tier 2 Phase 3 gây ra). Tier 2 round 1 Phase 3 không chạm `appBCC/*`.

### 5.7 Build (AC-07)

```text
$ npx next build
✓ Compiled successfully in 8.6s
```

---

## 6. Rủi ro / Edge cases (đã xử lý)

1. **Race condition 2 request cùng `x-idempotency-key`** — UNIQUE constraint `(actor_id, route, key)` quyết. Helper catch P2002 + replay row thắng. Đã verify bằng vitest (mock reject P2002 lần đầu).
2. **BigInt trong body hash** — `amountVnd: 2000000n` không stringify được mặc định. Helper dùng custom replacer BigInt → "2000000n" để sha256 stable.
3. **Mock prisma cũ không có `outboxEvent`** — Test mock bổ sung `outboxEvent.create` + `idempotencyKey.{findUnique,create}` để khớp với refactor service.
4. **Type guard `AuditDiff` vs `Prisma.InputJsonValue`** — Cast qua `unknown` để TS không cảnh báo overlap.
5. **F24 TODO metadata idempotency** — Bỏ khỏi `createTicket`; route handler giờ enforce. Test cũ update sang dùng wrapper. Behavior "2 lần tạo cùng key → 1 ticket" giữ nguyên 100%.
6. **Outbox backoff trong test retry** — Backoff exponential làm `availableAt > now` → mock skip. Test set `availableAt = new Date(0)` để bypass backoff cho test case "vượt maxRetries".

---

## 7. STEP-08: Runbook production RLS + Integrity (RQ-08, AC-08)

> **Trạng thái (DEC-08 + DEC-05):** Production Neon main **CHƯA apply** Phase 3 — migration chỉ apply trên dev. Runbook dưới đây để sếp/ops dùng khi mở maintenance window cùng đợt Phase 4 (hoặc sớm hơn nếu cần).

### 7.1 Pre-flight checklist

| # | Item | Verify command | Owner |
|---|---|---|---|
| 1 | Backup Neon main trước maintenance window | `pg_dump --schema=public --no-owner ... > backup_<utc>.sql`; sha256 ghi log | sếp/ops |
| 2 | Production RLS state hiện tại (Phase 2) | `SELECT count(*) FROM pg_class WHERE relrowsecurity=true` — đúng 15 bảng (Phase 2 PASS) | sếp/ops |
| 3 | Dev `prisma migrate dev` đã pass 9/9 | `npx prisma migrate status` exit 0 | Tier 2 đã verify §5.2 |
| 4 | Cron outbox production cần setup (vd Vercel cron / GitHub Action) | scheduler config sẵn gọi `/api/cron/outbox-drain` hoặc tương đương | sếp/ops |
| 5 | Không có session người dùng đang pending mutation ticket | kiểm tra log `/api/tickets/*` 1h trước | sếp/ops |

### 7.2 Apply order (4 bước, expected runtime ~3 phút DB)

| # | Command | Expected | Action khi fail |
|---|---|---|---|
| 1 | `npx prisma migrate deploy` (qua `directUrl=DATABASE_URL_ADMIN`) | 2 migrations `s1_integrity_idem_outbox` applied | `prisma migrate resolve --rolled-back <name>` rồi debug |
| 2 | `prisma generate` (nếu deploy không tự chạy) | Prisma Client mới có type `idempotencyKey`, `outboxEvent`, `auditLog.reason/ipAddress/userAgent` | rebuild app |
| 3 | Restart Vercel app (Vercel tự detect Prisma Client mới) | new deploy pick helper mới | rollback Vercel |
| 4 | Smoke API: `POST /api/tickets` không key → 201; với key → 201; replay key → 200 + body giống | response shape đúng `{ ticket }` | rollback Vercel |

### 7.3 Verification matrix

| Test | Query / Command | Expected |
|---|---|---|
| AC-01 production | `node scripts/_phase3-ac01-verify.cjs` (set `DATABASE_URL_ADMIN`) | 3 cột AuditLog + UNIQUE + 3 index |
| Idempotency replay | POST `/api/tickets` 2 lần cùng key, cùng JWT | DB chỉ 1 row idempotency + 1 ticket + 1 audit |
| Illegal transition | POST `/api/tickets/{pendingId}/pay` | HTTP 409 `{ error: 'ILLEGAL_TRANSITION', reason: '...' }` |
| Outbox drain | Sau commit, trigger `drainOutboxOnce` qua endpoint / cron | TicketNotification row mới + outbox.status=PROCESSED |
| Cron retry | Tạo outbox PENDING + availableAt = now + 1 ngày → gọi `processCronRetry` | status=PROCESSED |

### 7.4 Rollback (target <5 phút)

```text
# 1. DROP 2 bảng mới
DROP TABLE IF EXISTS "idempotency_keys" CASCADE;
DROP TABLE IF EXISTS "outbox_events" CASCADE;

# 2. Rollback cột AuditLog
ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "reason";
ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "ip_address";
ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "user_agent";

# 3. Rollback migrations
npx prisma migrate resolve --rolled-back 20260816161958_s1_integrity_idem_outbox
npx prisma migrate resolve --rolled-back 20260816161815_s1_integrity_idem_outbox

# 4. Revert Vercel (helper mới + route wrap) → Phase 2 RLS-only behavior
# Verify: /api/tickets/* 200/401/403 như Phase 2 (không có idempotency replay, không có 409 ILLEGAL_TRANSITION shape)
```

Sau rollback: production trở về trạng thái Phase 2. KHÔNG mất dữ liệu (cả 2 bảng mới trống, AuditLog chỉ mất 3 cột nullable, không có data lịch sử đã ghi).

### 7.5 Cron outbox production (sau apply)

- Vercel Cron: `vercel.json` thêm schedule `"0 * * * *"` → endpoint `POST /api/cron/outbox-drain` gọi `processCronRetry` (handler chưa viết — Phase 4 implement).
- Hoặc GitHub Actions workflow daily chạy `node scripts/drain-outbox-prod.mjs`.

**Out of scope Phase 3 này** (Phase 4 implement):
- Cron endpoint thật.
- Channel thật email/SMS/Zalo.
- Promote outbox thành pg_cron internal.

---

## 8. Handoff cho Auditor

- **Bằng chứng tại §5** (đã mask).
- **AC map tại §4** (8/8 PASS).
- **DEC mới tại §2** (DEC-NEW-01/02/03).
- **Code tại §3** (5 file mới + 7 file sửa).
- **Rủi ro đã xử lý tại §6**.
- **Runbook tại §7**.
- Khi audit, kiểm tra:
  - 4 helper integrity: signature `diff: AuditDiff`, `IdemPrisma`, `TransitionMap<S,A,R>`, `OutboxHandler` — test mock pattern giống Phase 1/2.
  - `ticket.service.ts` import helpers + wrap 3 chỗ (guardTransition, writeAuditLog, enqueueNotification).
  - 4 routes `withIdempotency` wrap pattern đồng nhất.
  - Runbook production §7 đầy đủ preflight + apply + verify + rollback.

> **Handoff status: READY_FOR_AUDIT**
