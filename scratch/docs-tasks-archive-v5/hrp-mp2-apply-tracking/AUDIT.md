# AUDIT: hrp-mp2-apply-tracking

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-mp2-apply-tracking` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.2` |
| Execution round | `3` |
| Audit round | `2` |
| Round opened by | `HANDOFF round 3` |
| Round closes when | `verdict PASS + Planner Resolution ACCEPTED` |
| Auditor/context | `Tier 3 independent context` |
| Baseline/diff/artifacts | `5d75011` |
| Independence | `Confirmed` |
| Audit time | `2026-08-24 10:10 +07:00` |

## 1. Findings

### AUD-001 — C-05 Không sử dụng withIdempotency + enqueueOutbox
- **Severity:** `P3`
- **Status:** `CLOSED`
- **RQ/AC:** `RQ-03 / AC-03`
- **Evidence:** `app/api/public/jobs/[slug]/applications/route.ts`, Planner Resolution `v1.2`.
- **Impact:** Technical.
- **Closure:** Đã được Planner giải quyết (ACCEPTED ngoại lệ do SQL RPC đảm bảo idempotency).

### AUD-002 — LIVE DB Security Check FAILED (Missing Role & Migration)
- **Severity:** `P1`
- **Status:** `CLOSED`
- **RQ/AC:** `RQ-09 / AC-09`
- **Evidence:** `vitest` logs cho `security-boundary.mp2.test.ts` và `live-integration.mp2.test.ts` (LIVE block).
- **Impact:** Security.
- **Closure:** OP/Sếp đã cung cấp DB Test an toàn (Neon branch `ep-empty-forest-azlhfyo9`) với cấu hình migration và role đầy đủ. Tier 2 đã mapping env và Audit Tier 3 đã trực tiếp verify lệnh `vitest run` lại một lần nữa. Kết quả: Toàn bộ 23 bài test (gồm 15 LIVE tests về DB behavior, RLS, idempotency và security boundary) đều PASS sạch sẽ. Lỗi đã được gỡ bỏ (đúng mong đợi của spec). Đóng finding.
- **Decision needed from Planner:** Ghi nhận OBS-01 của Tier 2 về cấu hình RLS trên PROD chưa được kiểm chứng, cần xử lý trong Phase-5 STEP-02.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | Chạy `npx prisma validate`, kiểm tra file `migration.sql`. | PASS | `The schema at prisma\schema.prisma is valid 🚀`. Migration additive đúng chuẩn. Test LIVE chứng minh object tồn tại. | None |
| `AC-02` | Kiểm tra source file, test case `application.service.test.ts`, chạy `vitest`. | PASS | `vitest` pass, delegate query đúng hàm definer, không tạo Worker/SourceClaim. Đã kiểm chứng LIVE. | None |
| `AC-03` | Kiểm tra logic idempotency trong hàm SQL, chạy `vitest`. | PASS | Hàm SQL chặn hash/payload khác. Đã kiểm chứng LIVE (n=5 race). | None |
| `AC-04` | Kiểm tra logic API `getPublicTracking`, chạy `vitest`. | PASS | Chỉ trả về projection allow-list. Đã kiểm chứng LIVE. | None |
| `AC-05` | Kiểm tra logic API `app/api/admin/applications`, chạy `vitest`. | PASS | Có `withDbContext`, check array role. Đã kiểm chứng LIVE read-scope. | None |
| `AC-06` | Kiểm tra logic `status-machine.ts`, chạy `vitest`. | PASS | Chỉ cho phép qua lại NEW ↔ NEEDS_INFO có yêu cầu reason. | None |
| `AC-07` | Chạy `next build`, kiểm tra routes sinh ra. | PASS | `next build` pass, các trang sinh ra đủ. Không check browser tự động được, chấp nhận LIM-02. | None |
| `AC-08` | Chạy `vitest`, `tsc --noEmit`. | PASS | Test pass. `tsc` 0 lỗi ở file MP-2. | None |
| `AC-09` | Kiểm tra schema SQL, script phân quyền `create-public-rpc-role.cjs`, chạy test LIVE boundary. | PASS | Test LIVE (`MP2_LIVE_SECURITY_CHECK=1`) thành công 4/4. Role và security functions cấp đúng quyền. | None |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| `C-01` | DONE | `vitest run` exit 0 (15 LIVE test thành công trên DB Test an toàn). |
| `C-02` | DONE | `next build` exit 0. `tsc --noEmit` 0 lỗi ở file MP-2. |
| `C-03` | DONE | `route.ts` public apply, public track, admin queue, admin status logic chuẩn. |
| `C-04` | DONE | `prisma validate` exit 0. `The schema at prisma\schema.prisma is valid 🚀`. |
| `C-05` | SKIP | Dùng logic SQL cho idempotency. (Đã được Planner ACCEPTED ngoại lệ). |
| `C-06` | DONE | SQL dùng `SECURITY DEFINER`, revoke/grant đúng, policy có trong file. RLS test LIVE pass. |
| `C-07` | DONE | `git status` có thay đổi, file mới nằm gọn vùng MP-2. |
| `C-08` | DONE | File logic core MP-2 đều có unit test. |
| `C-09` | DONE | `verify-task.ps1` exit 0. `RESULT: PASS. TASK contract is ready for execution.` |
| `C-10` | DONE | `git diff --name-only 5d75011..HEAD` file thay đổi phù hợp mục tiêu MP-2. |

## 3. Scope và Impact

- **Deliverables in scope:** Chức năng Tracking, API public Apply job bằng form (dùng SQL hàm bảo mật để INSERT tránh hổng RLS), admin queue list.
- **Out-of-scope changes:** Không.
- **Blast radius/callers/affected flows:** Các file cũ liên quan apply bằng tool nội bộ MP-1 và STAFFING (legacy path).
- **Data/security/migration/operations:** Toàn bộ flow security bị chặn bởi việc Database chưa chạy migration và provisioning (OP-01).

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `set MP2_LIVE_SECURITY_CHECK=1 && npx vitest ...` | 0 | Passed 23/23 tests (15 LIVE tests) | `security-boundary.mp2.test.ts` & `live-integration.mp2.test.ts`. |

## 5. Coverage Gaps

- **Không còn ENV_BLOCKED**: Mọi AC yêu cầu test LIVE đều đã được xác nhận (bởi file env cấu hình test DB an toàn của sếp cấp).
- Rủi ro duy nhất còn lại là Observation `OBS-01`: môi trường PROD `.env` có config sai sót của RLS mà Tier 2 phát hiện qua route nhầm. Cần follow-up ở Phase 5 Step 02.

## 6. Verdict và Planner Questions

- **Verdict:** `PASS`
- **Reason:** Tier 2 đã xuất sắc thu thập đầy đủ evidence LIVE (15 LIVE test XANH với RLS, concurrency idempotency, boundary introspection) trên Test DB. RLS đã được bảo vệ chính xác (Direct INSERT dưới `app.role='WORKER'` bị từ chối, `hrp_public_rpc` bypass, etc). Không có lỗ hổng bảo mật nào trong mã nguồn. C-05 cũng đã được miễn theo giải trình ở AUD-001. Tất cả `P1` blocker đều được giải quyết sạch sẽ.
- **Planner decisions required:** Task đã hoàn thành xuất sắc và đúng chuẩn, sẵn sàng MERGE Phase MP-2. Lưu ý team/OP ghi nhớ OBS-01 cho Phase 5 (apply RLS cho PROD DB).

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `AUD-001` | `OPEN` | `CLOSED` | Planner resolved (v1.2) |
| `2` | `AUD-002` | `OPEN` | `CLOSED` | LIVE test verify thành công (AC-09, AC-02..05). Đóng. |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
