# AFF-05A Residual Reconciliation

## 0. Control

| Field | Value |
|---|---|
| Status | `PROPOSED_ONLY` |
| Owner | `T1A` |
| Work type | Documentation-only reconciliation; chưa tạo TASK implementation |
| Pinned baseline | `origin/main@0fdc616b61de731ded8b9fa7337002dc0bb00721` |
| Baseline fetched | 2026-09-22; worktree `scratch/HrP-aff05a-reconciliation` |
| Branch | `codex/t1a-aff05a-reconciliation` |
| Ordering gate | Khảo sát ngay; implementation chỉ sau AFF-04 hoàn tất và T0 mở gate |
| Forbidden scope | AFF-05B commission, CRM, ER-003, `PLANNER_HANDOVER.md`, runtime/schema/migration trong round này |

Artifact cùng tên đã tồn tại trên branch docs và được cập nhật tại chỗ thay vì tạo bản trùng. CodeGraph được dùng trước khi đọc source: index tại repository root có 557 files, 6.327 nodes, 17.934 edges và báo up-to-date. Root index ở `f3f0a23f2fa6d590f188403687d317da64f4d91e`; `git diff origin/main..f3f0a23 -- src app prisma tests` rỗng, nên source graph có parity với baseline đã pin.

## 1. Authority và cách đọc evidence

Authority chính:

- `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md:557-568`: AFF-05A/W5 đã có foundation và safety repair; W5 không chứng minh toàn bộ Company Pool/dispute.
- `docs/V6/aff_plan.md:759-769`: scope và exit gate AFF-05A.
- `docs/tasks/hrp-v6-n2-aff-policy-contract-discovery/DISCOVERY.md:750-772`: permission/data-scope design cho assign, transfer, release và Company Pool.
- Ba delivery package: `hrp-v6-n2-aff-05a-handling-assignment`, `hrp-v6-w5-handling-assignment-safety`, `hrp-v6-w5-handling-assignment-ui`.

| Level | Ý nghĩa |
|---|---|
| `D` | Design/contract/discovery; chưa phải implementation |
| `S` | Source hiện hữu trên pinned baseline |
| `T` | Test hiện hữu; không đồng nghĩa test đã chạy ở round này |
| `E` | Có execution evidence lịch sử trong TASK/HANDOFF/AUDIT |
| `P` | Có production evidence được ghi nhận |

Round này không chạy lại application test suite. Các số PASS là evidence lịch sử được dẫn nguồn, không phải phép đo mới.

## 2. Kết luận ngắn

Đã có foundation thật: model + partial unique backstop, initial assignment service, server-clock expiry, manager assign/reassign/release service, history read, forced RLS, Company Pool filter/UI và admin actions. W5 safety là slice `ACCEPTED`, Tier 3 PASS và có production migration/lifecycle smoke tại `docs/tasks/hrp-v6-w5-handling-assignment-safety/HANDOFF.md:126-136`.

Chưa thể gọi toàn bộ AFF-05A `ACCEPTED` vì:

1. canonical public-intake RPC tạo `AFF_INITIAL` nhưng không ghi `expires_at`, trái policy 7 ngày;
2. intake lặp với source mới trên LaborProfile đã có attribution/handling chưa có canonical preservation proof;
3. manager deadline chưa có server-side bounds, concurrent manager assignment chưa có DB race test;
4. route chỉ có role gate, chưa chứng minh permission/team scope bằng route test;
5. W5 UI mới `READY_FOR_AUDIT`, không có `AUDIT.md` hay production evidence riêng;
6. Dispute Ticket/Case, resolver command và immutable resolution history chưa được implement;
7. beneficiary snapshot của AFF-04 mới là design, không phải source trên pinned main.

## 3. Coverage matrix

| Requirement | Hiện trạng | Repository-relative path / symbol / line | Evidence | Gap | Owner / dependency |
|---|---|---|---|---|---|
| Auto-assignment 7 ngày và bảo toàn attribution khi intake lặp | **PARTIAL**. TypeScript writer tạo 7 ngày và bỏ qua bind mới khi profile đã có attribution. Public RPC là canonical anonymous path nhưng INSERT assignment không có `expires_at`. AFF-03B đã ghi preservation test còn deferred. | `src/domains/talent/handling-assignment.service.ts:createInitialAffiliateAssignment:30-60`; `src/domains/talent/intake-writer.service.ts:createCandidateSubmissionFromIntake:122-142`; `prisma/migrations/20260921140000_aff03c_cs_labor_profile_backfill/migration.sql:299-348`; `docs/tasks/hrp-v6-n2-aff-03b-rls-runtime-fix/HANDOFF.md:145,160-166` | `S,T,E`; AFF-03 runtime evidence có, nhưng không chứng minh expiry 7 ngày hay preservation ca intake lặp | Canonical RPC tạo assignment không thời hạn; chưa có integration assertion bảo toàn attribution + active handler khi profile match lặp. AFF-04 v1.4 không allowlist intake RPC/test này. | T1 sau AFF-04; thin slice đề xuất ở §4 |
| Expiry theo server clock; Company Pool | **IMPLEMENTED_WITH_RESIDUALS**. Service coi `expiresAt <= asOf` là expired và materialize `EXPIRED` trước write. Company Pool list dùng query-time clock, không chờ scheduler. | `src/domains/talent/handling-assignment.service.ts:expireElapsedHandlingAssignments:81-97`, `getActiveHandlingAssignment:148-173`; `src/domains/talent/labor-profile.read-service.ts:getLaborProfilesList:93-102`; `src/domains/talent/labor-profile.read-service.test.ts:146-169` | `S,T,E,P`; W5 safety AUDIT PASS và production lifecycle smoke: `HANDOFF.md:128-136` | Company Pool query dùng `expiresAt < now` trong khi service boundary là `<=`; UI slice chưa audit. Query chưa có DB integration proof cho operational pool semantics. | T1 residual follow-up; không chặn slice §4 |
| Manager assign/reassign/release, giới hạn thời hạn và history | **PARTIAL**. Assign, transfer predecessor, release `REVOKED` và history rows đã có. | `src/domains/talent/handling-assignment.service.ts:managerAssign:99-146`, `releaseHandlingAssignment:181-208`, `getHandlingAssignmentHistory:210-222`; `app/api/admin/labor-profiles/[id]/handling-assignments/route.ts:32-55` | `S,T,E,P` cho lifecycle safety; `S,T,E` cho UI delivery claim | `days` nhận `number|null` không có min/max server-side; `null` tạo assignment vô thời hạn, trái yêu cầu manager assignment có thời hạn. History là row chain, chưa phải dispute resolution history. | T1 residual task sau §4; Owner chỉ tham gia nếu đổi policy duration |
| Concurrent manager assignment | **BACKSTOP_ONLY**. Partial unique index ngăn hơn một persisted `ACTIVE`; route map P2002 thành 409. | `prisma/migrations/20260918000000_aff05a_labor_profile_handling_assignment/migration.sql:28`; `app/api/admin/labor-profiles/[id]/handling-assignments/route.ts:60-63` | `S,T` cho index/service; không có test concurrent manager assignment | Không có two-connection race test chứng minh đúng một winner, loser typed conflict và history không corrupt. W5 DB test chỉ phủ elapsed reassignment/release/RLS. | T1 residual; cần PostgreSQL test DB, không phụ thuộc AFF-05B |
| Route authorization và client không tự gán assignee | **PARTIAL**. Admin route chặn ngoài `ADMIN/HR_MANAGER`; RLS chỉ cho manager write. Public intake lấy assignee từ server-side attribution. | `app/api/admin/labor-profiles/[id]/handling-assignments/route.ts:7-23,32-55`; `prisma/migrations/20260922100000_w5_handling_assignment_safety/migration.sql:17-42`; `20260921140000_aff03c_cs_labor_profile_backfill/migration.sql:299-348` | `S,T,E,P` cho RLS; `S` cho route. Search không thấy route test cho ba handling endpoints | Route dùng role set thay vì permission code/team scope; không có 401/403/unknown-key/days validation test. `newAssigneeUserId` từ admin client là command input hợp lệ nhưng phải scope/validate server-side; public client không có path tương tự. | T1 residual auth hardening; giữ discovery permission contract |
| Company Pool UI và hành động phân phối | **SOURCE_PRESENT_NOT_ACCEPTED**. List có COMPANY_POOL filter; detail có handling block, remaining time, history, assign/reassign/release form. | `src/domains/talent/labor-profile.read-service.ts:7-15,73-103,168-175`; `app/admin/labor-profiles/[id]/handling-assignment-manager.tsx:30-32,109-149,151-176,179-232`; `docs/tasks/hrp-v6-w5-handling-assignment-ui/HANDOFF.md:13,34-47` | `S,T,E`; handoff ghi typecheck/lint/unit/build exit 0 | TASK/HANDOFF vẫn `READY_FOR_AUDIT`; không có `AUDIT.md`, browser evidence hay production proof. Không được suy ra ACCEPTED từ W5 safety. | T1/T3 closeout riêng; phụ thuộc audit gate |
| Dispute Ticket/Case, quyền resolver, resolution/history | **MISSING**. Chỉ có vocabulary `CASE_RESOLUTION` và design permission; không có ticket model/service/route/test. | `src/domains/talent/handling-assignment.service.ts:19-23`; `prisma/schema.prisma:1714-1738`; `docs/V6/aff_plan.md:608-617,759-769`; `docs/tasks/hrp-v6-n2-aff-policy-contract-discovery/DISCOVERY.md:750-772` | `D,S` (vocabulary only) | Thiếu claimant/current/proposed assignee, reason/evidence, authorized resolver, immutable resolution và append-only history. Không dùng string constant làm bằng chứng capability. | T0/T1 cần task riêng; không kéo AFF-05B ledger vào cùng slice |
| Giao nhau với beneficiary snapshot AFF-04 | **DESIGN_APPROVED_ONLY**. AFF-04 định nghĩa placement đọc active handling assignment và ghi snapshot IDs/mode; chưa có implementation trên pinned main. | `codex/t1a-aff04-contract-docs@f3f0a23f2fa6d590f188403687d317da64f4d91e:docs/tasks/hrp-v6-n2-aff-04-conversion-propagation/TASK.md:89-95,101-104,141-160` | `D` | Không có `beneficiaryCandidateUserId`/`handlingAssignmentId` implementation trên `origin/main@0fdc616`. Không coi design approval là delivered. | T1B AFF-04 + T0 gate; residual consume kết quả sau merge, không duplicate snapshot |

## 4. Đề xuất đúng một thin slice tiếp theo

### AFF-05A-R1 — Canonical initial handling window and repeat-intake preservation

**Outcome**

Canonical public intake tạo `AFF_INITIAL` có thời hạn đúng 7 x 24 giờ theo server clock. Khi intake lặp match cùng LaborProfile đã có attribution/handling, request không consume source thứ hai, không thay attribution, không revoke/replace handler hiện hữu và vẫn hoàn tất theo duplicate/idempotency semantics hiện hành.

**Exact file scope dự kiến**

1. Một forward-only migration mới: `prisma/migrations/<timestamp>_aff05a_initial_handling_window/migration.sql`, thay latest body của `hrp_public_intake_submission(jsonb)` bằng `CREATE OR REPLACE FUNCTION`.
2. `tests/db/aff03-public-intake.integration.test.ts`.
3. Task-local `docs/tasks/<future-slug>/{TASK,HANDOFF,AUDIT,evidence}/**` khi T0 mở gate.

Không dự kiến sửa `prisma/schema.prisma`, TypeScript service, UI, commission, CRM hay ER-003. Tên migration/future task slug chốt khi author TASK.

**Tái sử dụng**

- Latest RPC body và role/grant posture từ `20260921140000_aff03c_cs_labor_profile_backfill`.
- Existing `labor_profile_handling_active_idx` backstop.
- Existing AFF-03 integration fixture, runtime role và synthetic applicant data.
- Existing TypeScript semantic `now + 7 * 24h` làm parity target.
- W5 server-clock boundary và RLS production posture; không thay policy.

**Acceptance và verification**

| AC | Pass condition | Verification |
|---|---|---|
| AC-01 | Fresh valid attribution qua public RPC tạo đúng một `AFF_INITIAL ACTIVE`; `expires_at - starts_at = interval '7 days'` theo một server timestamp snapshot. | Targeted PostgreSQL integration test. |
| AC-02 | Intake lặp match cùng LaborProfile với attribution mới không đổi original attribution, không consume attribution mới và không đổi/revoke/duplicate active handling assignment. | Two-request integration scenario; assert row IDs/status/count trước-sau bằng synthetic data. |
| AC-03 | No-cookie/direct intake không tạo assignment; existing AFF-03 privacy/RLS behavior không regress. | Existing targeted cases + new negative assertion. |
| AC-04 | Migration clean-chain và grants/owner/search_path posture giữ nguyên. | CI ephemeral PostgreSQL `prisma migrate deploy`, static checks và integration lane. |
| AC-05 | Diff đúng allowlist; UTF-8 và whitespace sạch. | `git diff --check`, scope command, pipeline task/handoff verifiers. |

**Dependencies thật**

- Scheduling: AFF-04 hoàn tất, merge main và T0 mở gate.
- Technical: PostgreSQL test DB có `hrp_public_rpc` và full migration chain; không cần production data.
- Không phụ thuộc AFF-05B, CRM, ER-003, CCCD thật hay Evidence Gateway readiness.
- Trước author TASK phải rebase/pin baseline mới sau AFF-04 và kiểm tra migration mới nhất có thay RPC hay không.

**Lựa chọn kỹ thuật T1 đề xuất**

- Dùng một DB `now()` snapshot cho `starts_at`; `expires_at = snapshot + interval '7 days'`; không nhận clock từ client.
- Preserve-first khi LaborProfile đã có canonical attribution hoặc active handling; incoming attribution không được steal source.
- Không thêm model mới; giữ partial unique index làm backstop, branch logic trả deterministic outcome thay vì dựa vào P2002.
- Chỉ dùng synthetic data trong test.

**Câu hỏi nghiệp vụ cần Owner quyết**

Không có cho slice này. Policy 7 ngày, server trust và attribution immutability đã FINAL. Nếu đổi từ elapsed 168 giờ sang “7 ngày lịch theo timezone”, đó là business rule mới; proposal giữ semantic TypeScript hiện hữu.

## 5. Residual queue ngoài thin slice

Không nhập các gap sau vào AFF-05A-R1: manager duration bounds; two-manager race proof; permission/team-scope route hardening; W5 UI audit/production closeout; Company Pool boundary parity; Dispute Ticket/Case. T1 chỉ author task tương ứng khi T0 ưu tiên.

## 6. Final state

`PROPOSED_ONLY` — reconciliation hoàn tất trên pinned baseline. Chưa có source/schema/migration/runtime change, chưa tạo implementation TASK, chưa mở PR. Implementation chờ AFF-04 hoàn tất và T0 mở gate.
