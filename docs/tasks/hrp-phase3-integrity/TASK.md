# TASK: hrp-phase3-integrity

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-phase3-integrity` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `DRAFT` — chờ `hrp-phase2-tenant-scope` ACCEPTED để cập nhật Baseline trước khi chuyển `READY_FOR_EXECUTION` |
| Planner | Tier 1 — Planner / Product & Architecture Decision Owner |
| Executor | Tier 2 — bên ngoài, do sếp giao (Cursor/agent khác — Tier 1 KHÔNG spawn Tier 2/3) |
| Auditor | Tier 3 — bên ngoài, do sếp giao (độc lập với Tier 2) |
| Baseline | TBD — commit ACCEPTED của `hrp-phase2-tenant-scope` (cập nhật trước khi giao) |
| Modules | Phase 3 Integrity — chạm: `prisma/migrations/*` (bảng `idempotency_keys`, `outbox`, cột AuditLog); `src/shared/integrity/{idempotency,audit,outbox,state-machine}.ts` (mới) + tests; `src/domains/attendance/ticket.service.ts` (refactor); `app/api/tickets/*` (nối middleware/helper); runbook production trong HANDOFF |
| ADR references | **PHASE_KHOAHOC_V1.md §4 Phase 3** (DoD + exit criteria); **ADR-014** (UNIFIED_PLAN_v4:451 — audit mọi ghi nhạy cảm + idempotency scope (actorId, route, key) + request hash); **UNIFIED_PLAN_v4:180 (F24)** (bỏ idempotency metadata → bảng riêng); **D16** (outbox in-process drain + cron daily lưới an toàn — khuyến nghị Planner (b), sếp chốt 16/08) |
| Current execution round | 1 |
| Current audit round | 0 (chưa audit) |
| Next gate | tenant-scope ACCEPTED → cập nhật Baseline → `/code hrp-phase3-integrity` → `/audit` → `/resolve` → ACCEPTED |
| Updated | 2026-08-16 20:40 ICT |

## 1. Outcome

### User-visible outcome

- Mọi POST/mutation nhạy cảm có `x-idempotency-key` **thật sự chống trùng ở DB**: client retry (mạng chập chờn) → hệ thống trả đúng kết quả lần đầu, không tạo bản sao, không chuyển state 2 lần.
- Mọi thay đổi state đều có **audit log chuẩn** (ai làm, lý do, IP, thiết bị, trước/sau) — trả lời được câu hỏi kiểm toán "ai đã duyệt, vì sao, khi nào".
- Transition sai luồng trả **409 kèm lý do rõ ràng** (vd `PENDING → PAID`) thay vì lỗi mơ hồ hoặc im lặng.
- Side-effect (thông báo) ghi **outbox cùng transaction** với state change — state đổi thì thông báo chắc chắn có; process chết giữa chừng không làm mất thông báo, cron lưới an toàn đẩy lại.
- Người dùng không thấy UI mới; hành vi API/ticket giữ nguyên như trước (chỉ chặt hơn ở tầng integrity).

### Non-goals

- KHÔNG đổi nghiệp vụ ticket: bộ `TRANSITIONS`, role, hành vi approve/reject/cancel/pay/list/get giữ nguyên — chỉ thay lớp idempotency/audit/state-machine bên dưới.
- KHÔNG tạo lại login/JWT/cookie/endpoint auth — tái sử dụng identity-core + Phase 2 (DEC-11 của tenant-scope áp dụng tương tự).
- KHÔNG viết state machine riêng cho từng entity khác ngoài Ticket trong task này — helper tổng quát sẵn sàng cho Statement/Timesheet/PayRun/WorkerAssignment/SourceClaim ở Phase 4; task này chỉ dùng cho Ticket.
- KHÔNG migrate/đổi production Neon main trong task này (nhất quán DEC-08): chỉ dev + runbook production trong HANDOFF (đợt Phase 4).
- KHÔNG QStash/Redis/cơ sở hạ tầng mới (D16 chốt (b) — Hobby).
- KHÔNG outbox cho email/SMS/Zalo thật — chỉ cơ chế queue + drain; channel thật thuộc Phase 4.
- KHÔNG đụng `app/bcc/*`, `appBCC/*`, `app/job-board/*`, `portal_timesheets`.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `prisma/schema.prisma:1012-1023` | `AuditLog` đã có: actorId/actorRole/entityType/entityId/action/diff/metadata — **thiếu cột reason/ip/ua riêng** (hiện nhét metadata) | Thêm 3 cột nullable; không đổi dữ liệu cũ |
| `EV-02` | `prisma/schema.prisma:981-1006` | `TicketNotification` đã là DB queue (status PENDING/SENT/FAILED/READ, retryCount) nhưng **không có worker drain/cron** | Outbox drain phải đẩy được sang notification; D16 (b) |
| `EV-03` | `src/domains/attendance/ticket.service.ts:347-364` | Idempotency đang **metadata-based** (query `metadata.path: ['idempotencyKey']`), có TODO(V4 F24) chuyển bảng `idempotency_keys` ADR-014 | RQ-01/02 — bỏ query metadata, dùng bảng + unique |
| `EV-04` | `src/domains/attendance/ticket.service.ts:133-207, 291-321` | State machine đã tồn tại inline (`TRANSITIONS` map + `guardTransition`) — compile-time safe, đúng nghiệp vụ | Không đổi nghiệp vụ; chỉ tổng quát hóa thành helper + 409 |
| `EV-05` | `ticket.service.ts:434-442, 526-537, 622-633, 756-767` | Audit log đã ghi mỗi transition vào `AuditLog` (diff before/after) nhưng **không có reason/ip/ua chuẩn** trong cột riêng | Writer chuẩn hóa theo DoD: actor + reason + ip + ua + before/after JSON |
| `EV-06` | `PHASE_KHOAHOC_V1.md:138-161` | DoD Phase 3: migration outbox + idempotency_keys; 4 helper integrity; refactor ticket; test 2 lần cùng key → 1 transition + 1 audit; transition sai → 409 | Khóa toàn bộ RQ/AC theo DoD này |
| `EV-07` | `DECISION_LOG.md (mockup):39` | D16 chốt: outbox **in-process drain + cron daily lưới an toàn** (khuyến nghị (b), sếp duyệt 16/08) | DEC-01 — không QStash |
| `EV-08` | `docs/tasks/hrp-phase1-identity-core/TASK.md` (ACCEPTED `dc3e772`) | Route tickets đã dùng auth-context + require-permission; 213 tests PASS | Phase 3 chỉ nối thêm lớp integrity — không đổi 401/403 |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | **Outbox theo D16 (b):** enqueue event trong cùng transaction với state change; drain **in-process** sau commit + **cron daily** quét lại event PENDING (lưới an toàn khi pod chết). KHÔNG QStash/Redis/worker ngoài | D16 (sếp chốt 16/08); PHASE_KHOAHOC §4 | CHỐT |
| `DEC-02` | CHOSEN | **Idempotency theo ADR-014:** bảng `idempotency_keys`, scope UNIQUE `(actorId, route, key)` + cột request hash; gọi lại trùng key trong TTL → **trả kết quả lần đầu** (không 409, không ghi thêm gì); TTL 24h (giữ hành vi hiện tại của ticket service "trong vòng 24h") | ADR-014; ticket.service.ts:339 | CHỐT |
| `DEC-03` | CHOSEN | `AuditLog` thêm 3 cột nullable: `reason` (Text), `ip_address`, `user_agent` — đạt DoD "actor + reason + ip + ua + before/after JSON"; dữ liệu cũ giữ nguyên | PHASE_KHOAHOC DoD; EV-01 | CHỐT |
| `DEC-04` | CHOSEN | `state-machine.ts` helper tổng quát (generic: `S`, `A` — compile-time safe) ký hiệu sẵn cho Ticket, Statement, Timesheet, PayRun, WorkerAssignment, SourceClaim; transition không hợp lệ → `IllegalTransitionError` → **HTTP 409 kèm reason** (KHÔNG silent fail). Ticket refactor sang helper này, giữ nguyên bộ `TRANSITIONS` hiện tại | PHASE_KHOAHOC DoD; EV-04 | CHỐT |
| `DEC-05` | CHOSEN | **Production defer:** task này chỉ áp migration/code trên dev; migration production + bật cron outbox production nằm trong runbook bàn giao ở HANDOFF, thực hiện cùng đợt Phase 4 (nhất quán DEC-08 tenant-scope) | Planner; DEC-08 | CHỐT |
| `DEC-06` | CHOSEN | 🚫 **KHÔNG tạo lại bộ đăng nhập/JWT/cookie/register/endpoint auth mới** — tái sử dụng identity-core (`jwt.ts`, `auth-context.ts`, `require-permission.ts`, `with-auth-scope.ts`, `app/api/auth/*`, `app/api/me`, `middleware.ts`, cookie `hrp_token`); chỉ ĐỌC và gọi | Sếp lưu ý 16/08 | CHỐT — vi phạm = audit BLOCK |
| `DEC-07` | ASSUMPTION | `hrp-phase2-tenant-scope` ACCEPTED trước khi task này chạy (route tickets chạy qua withDbContext + RLS dev khi exit criteria kiểm "đúng RLS từ Phase 2") | Planner | Hết hiệu lực khi tenant-scope ACCEPTED |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Migration dev: bảng `idempotency_keys` (UNIQUE (actorId, route, key) + request hash + response body + expiresAt 24h), bảng `outbox` (eventType, payload, status PENDING/PROCESSED/FAILED, retryCount, availableAt), `AuditLog` thêm 3 cột nullable (reason/ip_address/user_agent). Không đổi model khác; không chạm `portal_timesheets`; duplicate-check trước nếu liên quan | Must | DEC-01/02/03; EV-01 | Migration fail → dừng, rollback dev |
| `RQ-02` | `integrity/idempotency.ts`: check-or-create theo DEC-02; key trùng còn hạn → trả kết quả cũ, KHÔNG chạy handler, KHÔNG ghi thêm row nào; hết TTL → tạo mới bình thường. KHÔNG dùng query metadata như F24 cũ | Must | DEC-02; EV-03 | Trùng mà vẫn chạy handler = fail |
| `RQ-03` | `integrity/audit.ts`: writer chuẩn — actorId, actorRole, entityType, entityId, action, `reason`, `ipAddress`, `userAgent`, diff `{before, after}` JSON; ticket.service chuyển sang writer này; mọi mutation ticket (create/approve/reject/cancel/pay) ghi đủ | Must | DEC-03; PHASE_KHOAHOC DoD; EV-05 | Thiếu 1 trong 5 thành phần (actor/reason/ip/ua/before-after) = fail |
| `RQ-04` | `integrity/state-machine.ts`: helper generic (compile-time safe) theo DEC-04; `IllegalTransitionError` → 409 `{ error: 'ILLEGAL_TRANSITION', reason: '...' }`; refactor `ticket.service.ts` dùng helper — bộ `TRANSITIONS`, role guard, ticketTypes, optimistic lock (version), SLA giữ nguyên hành vi | Must | DEC-04; EV-04 | Nghiệp vụ ticket đổi = fail; transition sai không 409 = fail |
| `RQ-05` | `integrity/outbox.ts`: enqueue event trong cùng `$transaction` với state change; drain in-process sau commit + cron daily retry event PENDING (lưới an toàn); ticket notification tạo qua outbox; transaction rollback → không còn event | Must | DEC-01; EV-02 | Event mất khi rollback thành công = fail; pod chết mất event vĩnh viễn = fail |
| `RQ-06` | Tests: (a) gọi 1 mutation 2 lần cùng `Idempotency-Key` → đúng 1 transition + 1 history + 1 audit row, lần 2 nhận kết quả lần 1; (b) transition sai (`PENDING` → `PAY`) → 409 reason; (c) outbox rollback/no-duplicate/drain; (d) toàn bộ test cũ PASS (213+ tests, không skip/only sót) | Must | PHASE_KHOAHOC DoD; EV-08 | Case fail = chặn bàn giao |
| `RQ-07` | `npm run build` exit 0; route tickets giữ 401/403/200 như trước; không tạo auth mới; diff `app/bcc/`, `appBCC/`, `app/job-board/` rỗng; không credential/PII thật trong source/evidence; chỉ stage file task | Must | DEC-06; global rules | Audit block |
| `RQ-08` | Runbook production trong HANDOFF (không file phụ): migration production + bật cron outbox — preflight, apply order, rollback <5 phút, verify; production KHÔNG thay đổi trong task này (DEC-05) | Must | DEC-05 | Runbook thiếu hoặc production bị đổi = fail |

### 4.2 Scope boundaries

**In scope:**

- `prisma/migrations/*` dev (idempotency_keys + outbox + 3 cột AuditLog).
- `src/shared/integrity/{idempotency,audit,outbox,state-machine}.ts` + tests.
- `src/domains/attendance/ticket.service.ts` (refactor lớp integrity — không đổi nghiệp vụ).
- `app/api/tickets/*` (nối middleware/helper idempotency + ánh xạ lỗi 409).
- Unit/integration tests; runbook production là section trong `HANDOFF.md`.

**Out of scope:**

- Login/JWT/cookie/auth endpoints/middleware/JWT helper — identity-core.
- RLS/scope builders — Phase 2 (task này chỉ chạy trên nền của nó).
- `app/bcc/*`, `appBCC/*`, `app/job-board/*`, `portal_timesheets`.
- Channel thật email/SMS/Zalo, QStash/Redis, worker ngoài (D16).
- State machine cho entity khác ngoài Ticket (helper sẵn sàng, áp ở Phase 4).

### 4.3 Data, State, Permission và Interface Rules

- **Data:** bảng mới + 3 cột nullable — không đổi cột/kiểu hiện có, không destructive; `response` của idempotency_keys lưu JSON kết quả lần đầu (để trả lại chính xác khi retry).
- **State:** bộ `TRANSITIONS` ticket giữ nguyên từng transition; terminal state không có action; optimistic lock `version` giữ nguyên.
- **Permission/data scope:** giữ nguyên require-permission + withAuthScope (Phase 1/2); helper integrity không tự quyết scope — chỉ nhận actor từ AuthContext.
- **Interface:** `x-idempotency-key` header giữ tên cũ; 409 mới thêm `{ error: 'ILLEGAL_TRANSITION', reason }`; response API ticket không đổi shape cho trường hợp hợp lệ.
- **Failure/idempotency/concurrency:** trùng key → replay kết quả cũ; race 2 request cùng key → UNIQUE constraint DB quyết, bên thua nhận kết quả bên thắng (không 500); outbox drain idempotent (đánh PROCESSED đúng 1 lần).

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | RQ-01 | `prisma/migrations/*` | Khảo sát + migration dev: `idempotency_keys`, `outbox`, 3 cột AuditLog | tenant-scope ACCEPTED | `prisma migrate dev` exit 0 + catalog query | Migration fail/drift |
| `STEP-02` | RQ-02 | `integrity/idempotency.ts` | Helper check-or-create + replay + TTL + tests (race qua UNIQUE) | STEP-01 | vitest phần này PASS | Trùng key chạy handler 2 lần |
| `STEP-03` | RQ-03 | `integrity/audit.ts` | Writer chuẩn 5 thành phần + tests | STEP-01 | vitest PASS | Thiếu thành phần |
| `STEP-04` | RQ-04 | `integrity/state-machine.ts` | Helper generic + IllegalTransitionError + tests | — | vitest PASS + typecheck | Transition sai không throw |
| `STEP-05` | RQ-05 | `integrity/outbox.ts` | Enqueue trong transaction + drain + cron daily + tests (rollback, no-dup) | STEP-01 | vitest PASS | Event mất khi rollback |
| `STEP-06` | RQ-03..05 | `ticket.service.ts` | Refactor: idempotency bảng, audit writer, state-machine helper, notification qua outbox — nghiệp vụ giữ nguyên | STEP-02..05 | vitest cũ (ticket 16 tests) vẫn PASS | Test cũ fail |
| `STEP-07` | RQ-06..07 | `app/api/tickets/*` + toàn bộ | Nối middleware idempotency + map 409; full vitest + build + curl matrix (2 lần cùng key; transition sai 409; 401/403 giữ nguyên) | STEP-06 | Tất cả PASS, build exit 0 | Bất kỳ fail |
| `STEP-08` | RQ-08 | `HANDOFF.md` (section runbook) | Runbook production: migration + cron outbox (preflight, apply order, rollback <5 phút, verify); evidence masked; production không đổi | DEC-05 | runbook review | Runbook thiếu/nguy hiểm hoặc production đổi |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | RQ-01 | Migration dev sạch: đủ 2 bảng + 3 cột; UNIQUE `(actorId, route, key)` tồn tại; không đổi model khác; không chạm production | Prisma migrate + catalog query | Command, exit code, migration status | Yes |
| `AC-02` | RQ-02 | Gọi mutation 2 lần cùng key (trong 24h): lần 2 nhận đúng kết quả lần 1; DB chỉ có 1 row idempotency + 1 transition + 1 audit | vitest + query | Test output + row count | Yes |
| `AC-03` | RQ-03 | Mọi mutation ticket có audit row đủ actor/reason/ip/ua/before-after | vitest + đọc code | Test output | Yes |
| `AC-04` | RQ-04 | `PENDING` → `PAY` trả 409 `ILLEGAL_TRANSITION` kèm reason; không silent fail; bộ TRANSITIONS ticket giữ nguyên hành vi | vitest + curl dev | Test output + curl masked | Yes |
| `AC-05` | RQ-05 | Transaction rollback → không event outbox; drain thành công → PROCESSED đúng 1 lần; cron retry event PENDING | vitest | Test output | Yes |
| `AC-06` | RQ-06 | Toàn bộ vitest PASS (không skip/only sót); test ticket service cũ vẫn PASS sau refactor | Command | Log + exit code | Yes |
| `AC-07` | RQ-07 | `npm run build` exit 0; curl tickets: không JWT 401, đủ quyền 200, thiếu quyền 403 — giữ nguyên; diff vùng cấm rỗng; không PII/credential thật | Build + curl + git diff/grep | Command + output masked | Yes |
| `AC-08` | RQ-08 | Runbook production trong HANDOFF đủ preflight/apply/rollback <5 phút/verify; `migrate status` Neon main không đổi | Review + commands | Runbook + status | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-03, STEP-06` | `AC-03` |
| `RQ-04` | `STEP-04, STEP-06` | `AC-04` |
| `RQ-05` | `STEP-05, STEP-06` | `AC-05` |
| `RQ-06` | `STEP-07` | `AC-02, AC-04, AC-05, AC-06` |
| `RQ-07` | `STEP-07` | `AC-07` |
| `RQ-08` | `STEP-08` | `AC-08` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Refactor ticket.service làm vỡ nghiệp vụ | Test domain cũ fail | AC-06 chặn; chỉ đổi lớp integrity, cấm đổi TRANSITIONS | Revert thay đổi route/service — nghiệp vụ không đổi |
| `RISK-02` | Race 2 request cùng key → 500 thay vì replay | Load test phát hiện | UNIQUE constraint DB làm trọng tài; bên thua đọc lại row và trả kết quả | Fix idempotency helper; không cần rollback DB |
| `RISK-03` | Pod chết giữa drain → event PENDING treo | In-process drain không chạy hết | Cron daily retry (lưới an toàn DEC-01) | Cron quét lại PENDING; không mất event |
| `RISK-04` | Migration production chạy sớm (DEC-05 vi phạm) | Neon main đổi | AC-08 + runbook; Tier 2 chỉ dùng URL dev | Dừng, báo Planner ngay; không destructive |
| `RISK-05` | Tier 2 tạo lại bộ auth mới | Diff thấy endpoint/auth file mới | DEC-06 + RQ-07 khóa cứng | Audit BLOCK → xóa phần thừa |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | Xác nhận `hrp-phase2-tenant-scope` ACCEPTED (đóng cửa DEC-07) | Sếp/Tier 3 | Trước khi `READY_FOR_EXECUTION` | Yes |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | 2026-08-16 | Initial contract — Phase 3 Integrity: migration idempotency_keys + outbox + cột AuditLog; 4 helper integrity; refactor ticket.service (giữ nghiệp vụ); 409 illegal transition; test 2-lần-cùng-key; runbook production (production defer theo DEC-08). 🚫 không tạo lại auth | Sếp yêu cầu "viết task phase 3 luôn để chờ đó"; căn cứ PHASE_KHOAHOC §4 Phase 3 DoD + ADR-014 + D16 |
