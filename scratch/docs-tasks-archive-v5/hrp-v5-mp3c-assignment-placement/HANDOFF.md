# HANDOFF: hrp-v5-mp3c-assignment-placement

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-mp3c-assignment-placement` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Current audit round | `0 (chưa audit)` |
| Executor | `Tier 2` |
| Baseline | `42edc43` — working tree trên baseline; toàn bộ thay đổi MP-3C là uncommitted (chưa commit/push). |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-08-25 Asia/Bangkok` |

## 1. Outcome Summary

Đã hoàn tất cả 10 STEP của contract MP-3C (assignment placement Marketplace) dưới dạng thay đổi uncommitted round 1:

- **Schema/migration (STEP-01):** thêm `submission_id` + `staffing_order_slot_id` (đều nullable, backfill-safe) vào `project_assignments`, kèm unique `submission_id`, FK tới `candidate_submissions`/`staffing_order_slots`, index `(slot, status)`. Index `one_active_assignment` cũ giữ nguyên làm backstop 1-ACTIVE.
- **Referral Guard (STEP-02):** R1 đọc canonical `candidate_submissions.worker_id`, bitmask `0..7`, PUBLIC/CTV không giả lập vendor rules, override cần permission + S1/S2/S3 + reason/evidence + audit đúng một lần.
- **Placement service + routes (STEP-03..05):** `previewPlacement` read-only; `activatePlacement` khóa Worker → khóa slot → re-check invariant → tạo 1 ACTIVE + tăng 2 counter đúng một lần trong transaction; audit/outbox exactly-once; idempotency replay no-op, payload đổi → conflict. Hai route `POST /api/admin/assignments/preview` và `POST /api/admin/assignments`.
- **Detail DTO (STEP-06):** mở rộng projection MP-3 an toàn, không nới role/PII của queue reader.
- **Drawer UI (STEP-07):** `page.tsx` + `placement-panel.tsx` + `placement-ui.ts` cho flow screen/qualify/reject/dedup-convert/preview/override/activate; gate double-submit, loading/error/success.
- **Bằng chứng LIVE (STEP-08):** `live-integration.mp3c.test.ts` (7 kịch bản race/IDOR/backstop/counter), đã đăng ký vào single-source `vitest.integration-files.ts` và bật cờ `MP3C_LIVE_PLACEMENT_CHECK` trong integration config.
- **Regression + quality gates (STEP-09..10):** unit lane 688/688 xanh, typecheck/lint/build/prisma-validate/verify-task đều exit 0.

**Giới hạn quan trọng:** môi trường Tier 2 không có test DB chuyên dụng nên integration lane trả `ENV_BLOCKED` (fail-closed, exit 0 — KHÔNG phải PASS giả). Các AC phụ thuộc LIVE (AC-04, AC-09, AC-10 và phần LIVE của AC-01/03/05/06) chưa chạy được ở đây; chi tiết ở §5 để Tier 3 chạy trên test DB thật. Tôi không tự ghi verdict audit.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-01` | `prisma/schema.prisma`; `prisma/migrations/20260825090000_mp3c_assignment_placement_links/migration.sql` | `DONE` | None |
| `STEP-02` | `RQ-06` | `src/domains/staffing/referral-guard.service.ts` (checkR1 canonical `worker_id`, bitmask `0..7`, applyOverride audit ×1) | `DONE` | None |
| `STEP-03` | `RQ-02`, `RQ-04` | `src/domains/staffing/assignment-placement.service.ts` `previewPlacement`; `app/api/admin/assignments/preview/route.ts` | `DONE` | None |
| `STEP-04` | `RQ-03`, `RQ-05` | `assignment-placement.service.ts` `activatePlacement` (Worker advisory lock → slot FOR UPDATE → re-check → create → counter ×1); `app/api/admin/assignments/route.ts` | `DONE` | None |
| `STEP-05` | `RQ-07` | `activatePlacement` transaction — AuditLog + outbox exactly-once; `withIdempotency` replay no-op / `IdempotencyConflictError` | `DONE` | None |
| `STEP-06` | `RQ-08` | `src/domains/applications/application-queue.service.ts` (detail DTO MP-3 facts); `application-detail-mp3.test.ts` | `DONE` | None |
| `STEP-07` | `RQ-09` | `app/admin/applications/page.tsx`; `src/domains/applications/placement-panel.tsx`; `placement-ui.ts` | `DONE` | None |
| `STEP-08` | `RQ-10` | `src/domains/applications/live-integration.mp3c.test.ts`; `vitest.integration-files.ts`; `vitest.integration.config.ts` | `DONE` (authored + registered; LIVE run = `ENV_BLOCKED`, xem §5) | None |
| `STEP-09` | `RQ-10`, `RQ-11` | unit regressions (referral-guard, staffing/transfer, MP-2/MP-3B unit) trong lane 688; LIVE regression suites | `DONE` (unit xanh; phần LIVE = `ENV_BLOCKED`, xem §5) | None |
| `STEP-10` | `RQ-11` | full gates + `git diff --check` review | `DONE` | None |

## 3. Acceptance Evidence

Tất cả lệnh chạy tại repo root `c:\CodeApp\HrP` ngày 2026-08-25. Không có secret/URL/password trong evidence. Integration lane `ENV_BLOCKED` là trạng thái fail-closed (exit 0), KHÔNG phải PASS giả (DEC-14 / DEC-04-05).

| AC | Command/check | Exit/result | Evidence summary | Limitation |
|---|---|---|---|---|
| — | `& ".\.ai-pipeline\scripts\verify-task.ps1" -TaskPath "docs\tasks\hrp-v5-mp3c-assignment-placement\TASK.md"` | exit `0` — `RESULT: PASS` | `TASK contract is ready for execution.` | None |
| `AC-01` | `npx prisma validate` + review `migration.sql` | exit `0` — `The schema at prisma\schema.prisma is valid 🚀` | Migration additive/backfill-safe: `submission_id`+`staffing_order_slot_id` nullable, unique `project_assignments_submission_id_key`, 2 FK (ON DELETE SET NULL), index `(slot,status)`; rollback ghi trong SQL; index `one_active_assignment` giữ nguyên. | **LIVE:** deploy-on-safe-clone + DB introspection index/FK rows chưa chạy (không có clone DB) → Tier 3. |
| `AC-02` | `npm run test:unit` (assignment-placement.service.test.ts, assignment-placement.routes.test.ts) | exit `0` — 688/688 | Preview read-only + ma trận conflict (intact/broken conversion, closed/expired/full slot, quota, employee-code, active assignment) khẳng định zero-write. | Phần đối chiếu before/after DB counts LIVE → Tier 3 (xem AC-10). |
| `AC-03` | `npm run test:unit` (unit happy-path) + `live-integration.mp3c.test.ts` (LIVE happy path) | unit exit `0`; LIVE `ENV_BLOCKED` | Unit khẳng định tạo 1 ACTIVE gắn submission/slot + tăng counter ×1 trong transaction. | **LIVE:** happy-path trên DB thật → Tier 3. |
| `AC-04` | `live-integration.mp3c.test.ts` (two-worker last-slot race; same-worker race; loser residue) | `ENV_BLOCKED` | Kịch bản đã viết + typecheck/lint sạch, đã đăng ký lane; chờ DB thật. | **LIVE-only** — không chạy được ở Tier 2 env → Tier 3. |
| `AC-05` | `npm run test:unit` (referral-guard.canonical.test.ts, referral-guard.service.test.ts) + LIVE guard cases | unit exit `0`; LIVE `ENV_BLOCKED` | R1 canonical `worker_id`; block codes 3/5/6/7 giữ nguyên; PUBLIC/CTV không giả lập vendor; override trái phép fail, override hợp lệ audit ×1. | **LIVE:** guard cases trên DB thật → Tier 3. |
| `AC-06` | `npm run test:unit` (routes/service replay + idempotency) + LIVE replay | unit exit `0`; LIVE `ENV_BLOCKED` | Same key+payload → cùng kết quả; payload đổi → `IDEMPOTENCY_CONFLICT`; replay không đổi counter/audit/outbox (unit). | **LIVE:** replay before/after counts trên DB thật → Tier 3. |
| `AC-07` | `npm run test:unit` (application-detail-mp3.test.ts, assignment-placement.routes.test.ts, placement-panel.test.ts) | exit `0` — 688/688 | Detail DTO chỉ lộ MP-3 facts an toàn, giữ boundary read ADMIN/HR_MANAGER/DIRECTOR/SALE; route mutation deny DIRECTOR/SALE/HR_STAFF/anonymous (403). | None (IDOR/role phủ ở unit; LIVE IDOR bổ sung trong mp3c test → Tier 3). |
| `AC-08` | `npm run test:unit` (placement-panel.test.ts — `react-dom/server` renderToStaticMarkup) | exit `0` — 688/688 | Action đúng theo state/role, dedup picker, preview counters/conflicts, override form, activate confirm; double-submit disabled; error/success. | Browser demo trên fixture ẩn danh (screenshots) = bước OP/manual → Tier 3/OP. |
| `AC-09` | `npm run test:integration` (guarded lane: MP-2 LIVE, MP-3B race, staffing/transfer) | exit `0` — `ENV_BLOCKED` | Preflight fail-closed: `DATABASE_URL_TEST is not set … NOT run — BLOCKED state, not a PASS`. Không fallback prod/dev. | **LIVE-only** — cần test DB thật để có real PASS (MP-2 23/23 …) → Tier 3. |
| `AC-10` | `live-integration.mp3c.test.ts` (counter == ACTIVE count sau success/conflict/replay) | `ENV_BLOCKED` | Assertion đối chiếu `slotsFilled`/`Project.filled` với số ACTIVE assignment đã viết; chờ DB thật. | **LIVE-only** → Tier 3. |
| `AC-11` | `npm run typecheck`; `npx eslint <16 scoped files>`; `npm run test:unit`; `npm run test:integration`; `npm run build`; verify-task.ps1; `git diff --check -- <scoped>` | typecheck `0`; eslint `0`; unit `0` (688/688); integration `0` (`ENV_BLOCKED`); build `0`; verify-task `0` (PASS); diff-check `0` | Toàn bộ gate exit 0; scoped diff chỉ có cảnh báo LF→CRLF vô hại, không blank-line-EOF, không secret/file lạc. | Phần "integration real PASS" của AC-09 vẫn `ENV_BLOCKED` → Tier 3. |

## 4. Changed Deliverables

- **Source/artifact changed (modified):**
  - `prisma/schema.prisma` — thêm 2 relation nullable + backstops.
  - `app/admin/applications/page.tsx` — drawer MP-3 flow.
  - `src/domains/applications/application-queue.service.ts` — detail DTO MP-3.
  - `src/domains/staffing/referral-guard.service.ts` — canonical R1 + bitmask `0..7` + override audit.
  - `vitest.integration-files.ts` — đăng ký `live-integration.mp3c.test.ts` (single source lane).
  - `vitest.integration.config.ts` — thêm cờ `MP3C_LIVE_PLACEMENT_CHECK`.
- **Source/artifact changed (new):**
  - `app/api/admin/assignments/route.ts`, `app/api/admin/assignments/preview/route.ts`.
  - `src/domains/staffing/assignment-placement.service.ts` (+ `.service.test.ts`, `.routes.test.ts`).
  - `src/domains/staffing/referral-guard.canonical.test.ts`.
  - `src/domains/applications/placement-panel.tsx`, `placement-ui.ts` (+ `placement-panel.test.ts`).
  - `src/domains/applications/application-detail-mp3.test.ts`, `live-integration.mp3c.test.ts`.
- **Schema/migration:** `prisma/migrations/20260825090000_mp3c_assignment_placement_links/migration.sql` (additive, backfill-safe, rollback trong file). Chưa deploy — CẤM deploy prod/dev; Tier 3 deploy trên safe clone.
- **Dependency:** None (không thêm package).
- **Environment/config:** chỉ `vitest.integration.config.ts` (cờ test); không đụng `.env`.
- **Git diff/commit:** Not created — Tier 2 không commit/push. Toàn bộ là uncommitted working-tree trên baseline `42edc43`.

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `LIM-01` | Limitation | `npm run test:integration` → `ENV_BLOCKED` (exit 0); `DATABASE_URL_TEST`/`DATABASE_URL_ADMIN_TEST` không set trong Tier 2 env. | AC-04, AC-09, AC-10 và phần LIVE của AC-01/03/05/06 chưa chạy. Test file `live-integration.mp3c.test.ts` đã viết đủ 7 kịch bản, typecheck/lint sạch, đăng ký lane + cờ `MP3C_LIVE_PLACEMENT_CHECK` — sẵn sàng chạy khi có test DB. | Tier 3 chạy guarded integration lane trên **test DB chuyên dụng thật** để đóng các AC LIVE. Không mock, không fallback prod/dev. |
| `LIM-02` | Limitation | `npx prisma validate` exit 0 (static). Migration additive/backfill-safe, rollback trong SQL. | AC-01 phần deploy-on-safe-clone + introspection index/FK rows chưa chạy (không có clone DB ở Tier 2). | Tier 3 `migrate deploy`/`migrate status` + introspect trên **safe clone**. CẤM deploy prod/dev DB. |
| `LIM-03` | Limitation | `placement-panel.test.ts` phủ ma trận render/state qua `renderToStaticMarkup`. | AC-08 phần browser demo trực quan (screenshots) trên fixture ẩn danh là bước OP/manual, chưa thực hiện ở Tier 2. | Tier 3/OP thực hiện walkthrough trực quan nếu cần bằng chứng ảnh. |

Không có Deviation code so với TASK. Không có Blocker chặn Tier 3 audit — mọi artifact tĩnh đã sẵn sàng để kiểm tra và chạy lại.

## 6. Evidence Index

Output ngắn đã đặt trực tiếp ở §3. Không tạo artifact evidence file lớn ngoài repo (không có secret/PII để lưu).

| Evidence | Path | Proves |
|---|---|---|
| `E-01` | `prisma/migrations/20260825090000_mp3c_assignment_placement_links/migration.sql` | AC-01 backstops + rollback |
| `E-02` | `src/domains/applications/live-integration.mp3c.test.ts` | AC-04/06/10 kịch bản LIVE (chờ DB) |
| `E-03` | `vitest.integration-files.ts` + `vitest.integration.config.ts` | Lane registration + cờ LIVE gate |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `READY_FOR_AUDIT` | STEP-01..10 hoàn tất; gates tĩnh (typecheck/lint/build/unit 688/prisma-validate/verify-task) exit 0; AC LIVE `ENV_BLOCKED` chuyển Tier 3 chạy trên test DB thật. |

> Handoff status: READY_FOR_AUDIT
