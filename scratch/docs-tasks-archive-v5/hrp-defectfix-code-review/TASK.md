# TASK: hrp-defectfix-code-review

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-defectfix-code-review` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `ACCEPTED` |
| Planner | Tier 1 — Planner (Product & Architecture Decision Owner) |
| Executor | Tier 2 (agent ngoài — sếp giao qua Cursor) |
| Auditor | Tier 3 (independent context) |
| Baseline | `0be9f1c` (HEAD 18/08 — sau khi 4B ACCEPTED; các file trong scope KHÔNG đổi từ khi phân tích) |
| Modules | M3 (Staffing — referral-guard, order code), M7 (Attendance/Ticket — ticket identity, import preview, import commit, session stub) + repo hygiene |
| ADR references | ADR-007 (auth identity — workerId ≠ userId), ADR-014 (Ticket SM + audit), G22 (permission pool — không đổi) |
| Current execution round | 1 (đã đóng — REVISION: F1-01) → 2 (đã đóng — F1-01 fixed, `fbd96ec`) → TASK CLOSED |
| Current audit round | 1 (Tier 3 PASS + Planner phát hiện F1-01 CRITICAL → REVISION) → 2 (sếp nghiệm thu ACCEPTED 18/08 12:16) |
| Next gate | — (TASK ACCEPTED — defectfix hoàn tất, 8/8 defect ĐẠT) |
| Updated | 2026-08-18 14:40 ICT |

## 1. Outcome

### User-visible outcome

Sửa 8 defect phát hiện từ đợt rà soát code (sếp đã nghiệm thu danh sách 18/08), ưu tiên dứt điểm 4 bug CRITICAL/HIGH trước release:

1. **CRITICAL 🔴** — Worker tự tạo/xem/cancel ticket của mình dùng đúng danh tính `Worker.id` (hiện đang lẫn `User.id` → tạo ticket lỗi P2003, xem/cancel lỗi 403 sai).
2. **HIGH 🟠** — `applyOverride` Referral Guard hoạt động đúng khi worker bị block (hiện điều kiện đảo → override bị vô hiệu đúng lúc cần nhất).
3. **HIGH 🟠** — `generateOrderCode` không race (2 request đồng thời không sinh trùng mã `SO-xxxxx`).
4. **MEDIUM 🟡** — `getBatchPreview` trả đúng thống kê `anomalyBreakdown` (hiện hardcode toàn 0).
5. **LOW 🟢** — `import-commit.service.ts` có marker `TODO(capturedAt)` rõ nguồn `capturedAt` (comment-only).
6. **LOW 🟢** — Xóa stub auth `getSessionUser` (đọc role từ header client tự khai) + relocate `getIdempotencyKey`.
7. **INFO 🔵** — Đính chính comment `bulkTransferWorker` (không phải savepoint, là 1 transaction/worker).
8. **INFO 🔵** — Xác minh repo không track build artifact `appBCC/build|dist|venv` (evidence hiện đã sạch).

### Non-goals

- Không đổi FK `Ticket.workerId` sang `User` (giữ canonical `Worker.id` — DEC-01).
- Không migrate sang PostgreSQL Sequence cho mã SO (defer P2 — DEC-02).
- Không consolidate các bản `getIdempotencyKey` inline ở route staffing/attendance (chỉ relocate bản ở `session.ts` dùng cho ticket — RQ-06).
- Không đụng working tree đang dirty của round khác (`resolve-adjustment.service.ts`, `app/api/attendance/adjustments/route.ts`, `app/admin/attendance/page.tsx`) — xem RISK-01.
- Không sửa vùng cấm auth: `src/shared/auth/{jwt,password,user,auth-context,require-permission}.ts` — CẤM (auth-context.ts ĐÃ tính đúng `ctx.workerId`, chỉ reuse).
- Không đụng `appBCC/*` (khu vực sếp), `.env`, dữ liệu thật.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `prisma/schema.prisma:891-892` + `:244` | `Ticket.workerId` FK → `Worker.id`; liên kết `Worker.accountUserId` (unique) nối Worker↔User | `Ticket.workerId` PHẢI là `Worker.id`, không phải `User.id` |
| `EV-02` | `src/shared/auth/auth-context.ts:80-86` | `getAuthContext` ĐÃ tính `ctx.workerId` = `Worker.id` cho role WORKER | Không cần sửa auth-context — chỉ cần truyền `ctx.workerId` xuống service |
| `EV-03` | `src/shared/auth/session-adapter.ts:54-65` | `toSessionUser` chỉ gán `id: ctx.userId` (User.id), **bỏ rơi** `ctx.workerId` | Gốc lỗi identity — `SessionUser` thiếu trường `workerId` |
| `EV-04` | `app/api/tickets/route.ts:26-27` + `src/domains/attendance/ticket.service.ts:632,767,821` | Route ghi `body.workerId = sessionUser.id`; service so sánh `ticket.workerId !== actor.id` (cùng là User.id) | Create → P2003 (500); read/cancel worker luôn 403 |
| `EV-05` | `src/domains/staffing/referral-guard.service.ts:191-196` | `applyOverride` throw khi `!guardResult.allowed` (tức khi worker ĐANG bị block), message "worker not blocked" mâu thuẫn | Override bị chặn đúng lúc cần; đảo điều kiện |
| `EV-06` | `src/domains/staffing/order.service.ts:56-62` | `generateOrderCode` = `SELECT MAX(SUBSTRING(code…)) + 1`, không lock | 2 request đồng thời → trùng mã → P2002 (500) |
| `EV-07` | `src/domains/attendance/import.service.ts:410-418` | `getBatchPreview` trả `anomalyBreakdown` = `Object.fromEntries(...→0)` hardcode | UI preview mất thống kê phân loại lỗi |
| `EV-08` | `src/domains/attendance/import-commit.service.ts:199` | `const capturedAt = now` → `diffMs` luôn 0, nhánh risk-flag 15' chết | Ghi marker `TODO(capturedAt)`, không đổi logic |
| `EV-09` | `src/domains/attendance/session.ts:31-56` + grep 18/08 | `getSessionUser` đọc role từ header `Authorization` (client tự khai); **0 importer** (dead code); `getIdempotencyKey` được 5 route `app/api/tickets/*` import | Xóa an toàn `getSessionUser`; relocate `getIdempotencyKey` trước khi xóa file |
| `EV-10` | `src/domains/staffing/transfer.service.ts:242-245` | Doc comment `bulkTransferWorker` ghi "savepoint per worker" nhưng code là `$transaction` độc lập mỗi worker | Đính chính comment (không sửa logic) |
| `EV-11` | `git ls-files appBCC` (18/08) + `.gitignore:9-10,42-47` | Chỉ **15 file source** appBCC được track; `build/`, `dist/`, `venv/`, `__pycache__/`, `*.pyc` đã bị ignore, KHÔNG nằm index | #8 là verify-only, không cần `git rm --cached` (đính chính nhận định ban đầu) |
| `EV-12` | `src/domains/staffing/transfer.service.ts:78-83` | Pattern advisory lock đã có sẵn `pg_advisory_xact_lock(hashtext($1::text))` | DEC-02: tái dùng pattern này cho mã SO (không cần migration) |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | `Ticket.workerId` giữ canonical `Worker.id` (KHÔNG đổi FK sang User). Fix xuyên suốt: thêm `workerId?` vào `SessionUser` (từ `ctx.workerId`, chỉ role WORKER), route create dùng `sessionUser.workerId`, service list/get/cancel so sánh `actor.workerId`. `createdByActorId` GIỮ NGUYÊN = `User.id` (schema đúng: "user tạo"). Role WORKER thiếu `workerId` → fail-closed 403 | EV-01..04 / Planner + khuyến nghị sếp | Hiệu lực cả task |
| `DEC-02` | CHOSEN | Chống race mã SO bằng `pg_advisory_xact_lock(hashtext('staffing_order_code'))` (khóa transaction-scoped, hằng key) ngay đầu `generateOrderCode` — TRONG transaction hiện có. PostgreSQL Sequence defer P2 (tránh migration + seed sequence cho dữ liệu cũ khi chưa cần) | EV-06, EV-12 / Planner | Hiệu lực cả task |
| `DEC-03` | CHOSEN | `applyOverride` chỉ được phép khi `guardResult.allowed === false` (worker ĐANG bị block). Đổi error code `BLOCKED` → `NOT_BLOCKED` + message rõ "không bị block, không có gì để override". Thứ tự: check block trước → check `CAN_OVERRIDE_REFERRAL_GUARD` → ghi audit | EV-05 / Planner | Hiệu lực cả task |
| `DEC-04` | CHOSEN | `getIdempotencyKey` relocate sang `src/shared/auth/ticket-route-helpers.ts` (pure header read, không auth); xóa hẳn `src/domains/attendance/session.ts` sau khi cập nhật 5 import ở `app/api/tickets/*` | EV-09 / Planner | Hiệu lực cả task |
| `DEC-05` | CHOSEN | #8 = verify-only: chạy `git ls-files appBCC/build appBCC/dist appBCC/venv` → kỳ vọng rỗng (đã sạch). Chỉ `git rm -r --cached` nếu phát hiện file vi phạm. Ghi kết quả vào HANDOFF | EV-11 / Planner | Hiệu lực cả task |
| `DEC-06` | ASSUMPTION | Test hiện có (`ticket.service.test.ts`, `session-adapter.test.ts`, `auth-context.test.ts`) dùng mock in-memory; thay đổi identity ở DEC-01 có thể làm test cũ đỏ → Tier 2 PHẢI cập nhật test cho khớp contract mới (giữ nguyên số test hoặc tăng, không giảm) | EV-12 pattern / Planner | Xác nhận tại demo |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Danh tính ticket: role WORKER tạo/xem/cancel ticket dùng `Worker.id` (`actor.workerId` từ `ctx.workerId`), không dùng `User.id`; `createdByActorId` vẫn = `User.id` | Must | EV-01..04 / DEC-01 | Create không còn P2003; xem/cancel ticket người khác → 403, ticket của mình → pass |
| `RQ-02` | `applyOverride` cho phép override khi worker bị block (`allowed === false`); ném `NOT_BLOCKED` khi không bị block | Must | EV-05 / DEC-03 | Override hoạt động khi bị block; khi không bị block → lỗi rõ ràng |
| `RQ-03` | `generateOrderCode` không race: dùng `pg_advisory_xact_lock(hằng)` trong tx trước `MAX+1` | Must | EV-06, EV-12 / DEC-02 | 2 create đồng thời → 2 mã SO khác nhau, không P2002 |
| `RQ-04` | `getBatchPreview` trả `anomalyBreakdown` thật (đếm theo `anomalyType` từ các row của batch) | Should | EV-07 | UI hiển thị đúng phân loại lỗi (không toàn 0) |
| `RQ-05` | Ghi marker `TODO(capturedAt)` rõ nguồn `capturedAt` (đọc timestamp thiết bị từ CSV ở Phase sau); KHÔNG đổi logic | Should | EV-08 | Comment tồn tại, grep thấy được |
| `RQ-06` | Xóa stub `getSessionUser` (auth từ header client tự khai); relocate `getIdempotencyKey` sang `ticket-route-helpers.ts`; cập nhật 5 import `app/api/tickets/*`; xóa `session.ts` | Must | EV-09 / DEC-04 | `grep getSessionUser` = 0; build xanh; không còn import `domains/attendance/session` |
| `RQ-07` | Đính chính comment `bulkTransferWorker`: "savepoint per worker" → "1 transaction độc lập mỗi worker (1 người fail không ảnh hưởng lô)" | Should | EV-10 | Comment đúng bản chất code |
| `RQ-08` | Xác minh không có build artifact appBCC (build/dist/venv/__pycache__) bị track; nếu có → `git rm -r --cached`; ghi kết quả HANDOFF | Should | EV-11 / DEC-05 | `git ls-files appBCC/build appBCC/dist appBCC/venv` → rỗng |
| `RQ-09` | Regression: vitest toàn bộ exit 0 (số test không giảm), `npm run build` exit 0, vùng cấm sạch, chỉ stage đúng file scope | Must | EV-12 / Iron Rule 4 | Bất kỳ test đỏ hoặc vùng cấm bẩn → BLOCKED |

### 4.2 Scope boundaries

**In scope:**

- `src/shared/auth/session-adapter.ts` — thêm `workerId` vào `SessionUser` (KHÔNG sửa auth-context.ts).
- `src/domains/attendance/ticket.service.ts` — sửa list/get/cancel + interface `SessionUser`.
- `app/api/tickets/route.ts` — sửa nhánh WORKER dùng `workerId`.
- `src/domains/staffing/referral-guard.service.ts` — sửa `applyOverride` + error code.
- `src/domains/staffing/order.service.ts` — thêm advisory lock `generateOrderCode`.
- `src/domains/attendance/import.service.ts` — tính `anomalyBreakdown` thật ở `getBatchPreview`.
- `src/domains/attendance/import-commit.service.ts` — thêm marker `TODO(capturedAt)` (comment-only).
- `src/domains/attendance/session.ts` — XÓA; `src/shared/auth/ticket-route-helpers.ts` — thêm `getIdempotencyKey`; 5 file `app/api/tickets/*` — cập nhật import.
- `src/domains/staffing/transfer.service.ts` — đính chính comment (comment-only).
- Test liên quan (mock in-memory) cập nhật khớp contract mới.

**Out of scope:**

- Vùng cấm auth: `src/shared/auth/{jwt,password,user,auth-context,require-permission}.ts` — CẤM sửa.
- `appBCC/*` (khu vực sếp) — CẤM đụng (chỉ `git ls-files` read-only cho RQ-08).
- 3 file đang dirty của round khác: `src/domains/attendance/resolve-adjustment.service.ts`, `app/api/attendance/adjustments/route.ts`, `app/admin/attendance/page.tsx` — CẤM stage/sửa.
- Migration schema mới (Sequence, đổi FK) — CẤM.
- Consolidate `getIdempotencyKey` inline ở route staffing/attendance — defer.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** `Ticket.workerId` = `Worker.id` (FK canonical); `Ticket.createdByActorId` = `User.id`; không đổi kiểu dữ liệu/tiền tệ (BigInt VND ADR-010).
- **State:** Không thay đổi state machine Ticket/StaffingOrder. Chỉ sửa guard/identity; transition giữ nguyên qua `state-machine.ts`.
- **Permission/data scope:** `applyOverride` vẫn cần `CAN_OVERRIDE_REFERRAL_GUARD` (qua `resolveEffectivePermissions`); role WORKER fail-closed khi thiếu `workerId`. Không đổi permission catalog/scopes.
- **Interface:** `SessionUser` thêm field optional `workerId?` (backward-compatible); `getIdempotencyKey(req)` giữ nguyên chữ ký và hành vi (đọc header `x-idempotency-key`).
- **Failure/idempotency/concurrency:** advisory lock phải gọi TRONG transaction hiện có (cấm await DB ngoài tx); `getIdempotencyKey` giữ nguyên (idempotency route không đổi).

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | RQ-01 | `session-adapter.ts`, `ticket.service.ts`, `app/api/tickets/route.ts` | Thread `workerId` (Worker.id) qua `SessionUser`; route create + service list/get/cancel dùng `actor.workerId`; cập nhật test identity | EV-01..04 / DEC-01 | `npx vitest run src/domains/attendance src/shared/auth` exit 0 | Worker tự tạo ticket vẫn lỗi P2003 hoặc 403 |
| `STEP-02` | RQ-02 | `referral-guard.service.ts` | Đảo điều kiện `applyOverride` + đổi code `NOT_BLOCKED` + message | EV-05 / DEC-03 | `npx vitest run src/domains/staffing` exit 0 | Override vẫn bị chặn khi bị block |
| `STEP-03` | RQ-03 | `order.service.ts` | `pg_advisory_xact_lock(hashtext('staffing_order_code'))` đầu `generateOrderCode` (trong tx) | EV-06, EV-12 / DEC-02 | vitest + test 2 lệnh song song sinh 2 mã khác nhau | Trùng mã SO |
| `STEP-04` | RQ-04 | `import.service.ts` | `getBatchPreview` tính `anomalyBreakdown` thật từ `batch.rawRows` | EV-07 | vitest từng loại anomaly đếm đúng | Breakdown vẫn toàn 0 |
| `STEP-05` | RQ-05 | `import-commit.service.ts` | Thêm marker `TODO(capturedAt)` nguồn `capturedAt` (comment-only) | EV-08 | grep `TODO(capturedAt)` | — |
| `STEP-06` | RQ-06 | `session.ts`, `ticket-route-helpers.ts`, `app/api/tickets/*` | Relocate `getIdempotencyKey`, xóa `session.ts`, cập nhật 5 import | EV-09 / DEC-04 | `npm run build` exit 0 + grep `getSessionUser` = 0 | Còn import session.ts |
| `STEP-07` | RQ-07 | `transfer.service.ts` | Đính chính comment bulk (comment-only) | EV-10 | grep comment mới | — |
| `STEP-08` | RQ-08 | repo index | `git ls-files appBCC/build dist venv` → rỗng; chỉ `git rm --cached` nếu có vi phạm | EV-11 / DEC-05 | command output | Phát hiện file vi phạm không xử lý |
| `STEP-09` | RQ-09 | toàn repo | Regression + HANDOFF.md (diff, test count, vùng cấm, kết quả RQ-08) | Iron Rule 4 | `npx vitest run` exit 0; `npm run build` exit 0; `git diff --name-only` sạch vùng cấm + 3 file dirty | Bất kỳ đỏ → BLOCKED |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | RQ-01 | Worker tạo ticket → 201 (không P2003); list/get/cancel ticket của mình → pass; ticket worker khác → 403 | `npx vitest run` + test mô tả identity | Output exit 0 + test names | Yes |
| `AC-02` | RQ-02 | `applyOverride` cho phép khi bị block; ném `NOT_BLOCKED` khi không bị block; permission vẫn được check | vitest | Output exit 0 | Yes |
| `AC-03` | RQ-03 | 2 lệnh tạo order đồng thời → 2 mã SO khác nhau, không P2002 | vitest (mock concurrency/advisory lock) | Output exit 0 | Yes |
| `AC-04` | RQ-04 | `getBatchPreview` trả breakdown đúng theo anomalyType (không toàn 0) | vitest | Output exit 0 | Yes |
| `AC-05` | RQ-05 | Marker `TODO(capturedAt)` tồn tại ở `import-commit.service.ts` | grep | Output chứa `TODO(capturedAt)` | No |
| `AC-06` | RQ-06 | `session.ts` bị xóa; `getSessionUser` 0 match; 5 import cập nhật; build xanh | `npm run build` + grep | Output + diff | Yes |
| `AC-07` | RQ-07 | Comment bulk đã đính chính, không còn gây hiểu lầm "savepoint" | grep | Output | No |
| `AC-08` | RQ-08 | `git ls-files appBCC/build appBCC/dist appBCC/venv` → rỗng (hoặc đã rm) | command | Output | No |
| `AC-09` | RQ-09 | `npx vitest run` exit 0 (số test không giảm so với trước sửa); `npm run build` exit 0; vùng cấm + 3 file dirty sạch | Chạy lại lệnh + git diff | Output + exit code | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-02` |
| `RQ-03` | `STEP-03` | `AC-03` |
| `RQ-04` | `STEP-04` | `AC-04` |
| `RQ-05` | `STEP-05` | `AC-05` |
| `RQ-06` | `STEP-06` | `AC-06` |
| `RQ-07` | `STEP-07` | `AC-07` |
| `RQ-08` | `STEP-08` | `AC-08` |
| `RQ-09` | `STEP-09` | `AC-09` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Working tree còn untracked stray (`apply-changes.mjs`, `write_script.py`, `scripts/verify-rls-policies.sql`) → Tier 2 stage nhầm | `git add -A` / `git add .` | CẤM `git add -A`/`git add .`; chỉ `git add` đúng file trong §4.2; báo Planner nếu lệch | `git restore --staged` file nhầm; commit chỉ chứa file scope |
| `RISK-02` | Thay đổi identity (DEC-01) làm test mock in-memory cũ đỏ | Chạy vitest sau STEP-01 | Cập nhật test khớp contract (số test không giảm); DEC-06 | Revert STEP-01, quay HEAD baseline |
| `RISK-03` | Advisory lock gây deadlock nếu gọi ngoài transaction | Lock ngoài tx | Cấm await DB ngoài tx; lock đặt đầu `generateOrderCode` (đã trong tx) | Timeout tự rollback, retry idempotent |
| `RISK-04` | Xóa `session.ts` làm sót import → build đỏ | Thiếu cập nhật 1 route | Grep `domains/attendance/session` = 0 trước khi xóa (AC-06) | Khôi phục file từ git, cập nhật đủ import |
| `RISK-05` | `git rm --cached` nhầm file source appBCC (khu vực sếp) | Lệnh rm quá rộng | RQ-08 chỉ `git rm` đúng build/dist/venv nếu có; evidence hiện đã sạch → khả năng không cần rm | `git reset HEAD` đúng path đã rm nhầm |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| — | Không có câu hỏi mở làm đổi implementation (DEC-01..06 đã chốt) | — | — | Không |

## 9. Planner Resolution

Tier 1 append quyết định sau audit; không sửa lịch sử finding.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| 1 | F1-01 (Planner tự phát hiện) | **Verdict REVISION_REQUIRED — chưa ACCEPT.** Tier 3 verdict PASS nhưng Planner tự đọc code (Iron Rule 4) phát hiện 1 regression CRITICAL: **F1-01** — `app/api/tickets/route.ts:28` so sánh `body.workerId !== sessionUser.id` (Worker.id vs User.id) → worker tự tạo ticket LUÔN 403 (dòng 27 đã gán đúng `sessionUser.workerId` nhưng dòng 28 so sai field). Vitest 412/412 + build exit 0 KHÔNG bắt được vì route handler không được unit-test (bài học F5-04 mock không bắt lỗi runtime). **7/8 fix còn lại ĐẠT:** RQ-02 referral-guard `if (guardResult.allowed) throw NOT_BLOCKED` đúng (AUDIT.md mô tả nhầm thành `=== 'NOT_BLOCKED'` — code thật đúng); RQ-03 advisory lock `pg_advisory_xact_lock(hashtext('staffing_order_code'))` đúng; RQ-04 anomalyBreakdown đếm từ rawRows; RQ-05 marker TODO(capturedAt); RQ-06 xóa session.ts + relocate getIdempotencyKey sang ticket-route-helpers.ts (grep `getSessionUser` = 0); RQ-07 comment bulk đúng; RQ-08 repo sạch. **Fix F1-01:** sửa dòng 28 thành `if (body.workerId !== sessionUser.workerId)` (so Worker.id với chính nó — chặn worker tạo hộ worker khác). **Round 2 giao Tier 2:** sửa đúng 1 dòng + bổ sung test chứng minh worker tự tạo ticket trả 201 (không 403) | v1.0 (không đổi RQ/STEP/AC — lỗi thực thi) | Tier 2 — round 2 (sếp giao /code) |
| 2 | F2-01 (Planner phát hiện) | **Verdict ACCEPTED — TASK CLOSED (8/8 defect ĐẠT).** F1-01 fix `fbd96ec` ĐÚNG: `body.workerId !== sessionUser.workerId` + fail-closed `!sessionUser.workerId` (khớp DEC-01). Planner tự verify (Iron Rule 4) 18/08 14:35: `npx vitest run` **437/437 exit 0** (31 files); `npm run build` **exit 0** trên worktree sạch `14d7485` (working tree chính đang dirty do Tier 2 Phase 5 round 1 — xem note); `fbd96ec` chỉ đụng đúng `app/api/tickets/route.ts` (scope sạch). **F2-01 (LOW, follow-up — KHÔNG block):** round-2 directive "bổ sung test route handler chứng minh worker tự tạo ticket → 201" chưa có — route handler vẫn không unit-test (hạn chế hệ thống đã ghi nhận round 1). Chấp nhận theo chốt sếp "DefectFix ACCEPTED": fix fail-closed, rủi ro thấp. Follow-up: bổ sung route test `POST /api/tickets` (WORKER tự tạo → 201, tạo hộ → 403) vào đợt sau. **Note riêng cho Phase 5:** build ở working tree ĐỎ vì Tier 2 Phase 5 round 1 đang làm dở — `app/api/statements/route.ts:57` include `vendor` nhưng schema `VendorStatement` KHÔNG có relation `vendor` (file untracked) | v1.0 (r3) — không đổi RQ/STEP/AC | Tier 2 Phase 5 — sửa lỗi type trước khi bàn giao |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | 2026-08-18 | Initial contract — 8 defect từ đợt rà soát code (sếp nghiệm thu 18/08): 4 bug CRITICAL/HIGH (ticket identity, referral-guard đảo điều kiện, order code race, preview breakdown) + 4 quick win (marker `TODO(capturedAt)`, xóa stub auth, đính chính comment, verify repo hygiene). 9 RQ, 9 STEP, 9 AC, 6 DEC | Sếp giao "chuyển bug 1–4 thành sub-task cho Tier 2"; sources: đợt rà soát code + đọc schema/service + `git ls-files` |
| `v1.0` (r2) | 2026-08-18 | Planner Resolution round 1 — verdict **REVISION_REQUIRED**: 7/8 defect ĐẠT, phát hiện F1-01 (CRITICAL) route self-check `body.workerId !== sessionUser.id` so Worker.id vs User.id → worker tự tạo ticket luôn 403. Không đổi contract (lỗi thực thi) — mở round 2 | AUDIT.md round 1 (Tier 3 PASS) + Planner tự đọc code 18/08 11:00 |
| `v1.0` (r3) | 2026-08-18 | Planner Resolution round 2 — verdict **ACCEPTED** (sếp chốt 18/08 12:16 "DefectFix ACCEPTED"). F1-01 dứt điểm (`fbd96ec`); 8/8 defect ĐẠT; TASK CLOSED. Ghi nhận F2-01 LOW follow-up: test route handler `POST /api/tickets` chưa có (không block) | Planner tự verify 18/08 14:35-14:40: vitest 437/437 exit 0 + build exit 0 (worktree `14d7485`) + diff scope sạch |
