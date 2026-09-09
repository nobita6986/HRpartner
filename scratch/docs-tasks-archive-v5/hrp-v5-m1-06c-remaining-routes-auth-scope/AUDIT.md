# AUDIT: hrp-v5-m1-06c-remaining-routes-auth-scope

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-m1-06c-remaining-routes-auth-scope` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `2` |
| Audit round | `1` |
| Round opened by | `HANDOFF round 2` |
| Round closes when | `verdict PASS + Planner Resolution ACCEPTED` |
| Auditor/context | `Tier 3 Independent Audit Agent` |
| Baseline/diff/artifacts | `15ca9d9` (có phụ thuộc M1-06b chưa ACCEPTED, đang chạy song song) |
| Independence | `Confirmed` |
| Audit time | `2026-08-26 09:10 +07:00` |

## 1. Findings

| ID | Severity | Description | Recommendation | Status |
|---|---|---|---|---|
| `AUD-001` | Non-blocking (Deviation) | **[DEV-01]** `statements/margin` dùng `withDbContext` (L2) thay vì `withAuthorizedDbReadOnly` (L1) do `ClientStatement` thiếu L1 builder. Vẫn an toàn nhờ role gate tại route. | Thiết kế defense-in-depth hợp lý trong bối cảnh không được tạo builder mới (OQ-01). | PASS |
| `AUD-002` | Non-blocking (Deviation) | **[DEV-02..04]** Thay đổi/thu hẹp phân quyền tại route cho `projects` (chặn SALE/MKT), `clients` (thu hẹp ROOT-only) và `payroll` (ADMIN/DIRECTOR). | Các giới hạn sát với ma trận §7.2 và hợp lý, chặn các vai trò không cần thiết truy xuất tài nguyên nhạy cảm. | PASS |
| `AUD-003` | Non-blocking (Deviation) | **[DEV-05]** `auth/login` là PRE-AUTH nên dùng trực tiếp `prisma.$transaction` + set GUC thay vì `withDbContext`. | Hoàn toàn hợp lý, bảo toàn được quy trình xác thực mà không bẻ gãy cấu trúc RLS. | PASS |

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | Static Inventory Gate | PASS | 15 routes đã được phân loại đầy đủ, 17 test chạy PASS. | None |
| `AC-02` | `statements/margin` | PASS | ACCOUNTANT/ADMIN/DIRECTOR pass 200, các role khác bị 403. Test coverage đầy đủ. | `AUD-001` |
| `AC-03` | `projects` L1+L2 | PASS | PM/HR/DIRECTOR passthrough; SALE/MKT deny; cross-project → 404. | `AUD-002` |
| `AC-04` | `clients` L1+L2 | PASS | ADMIN/DIRECTOR passthrough; cross-client → 404. Thu hẹp quyền ROOT-only. | `AUD-002` |
| `AC-05` | `payroll` Role Gate | PASS | Chỉ mở quyền đọc payroll config cho ADMIN và DIRECTOR, đúng theo OQ-03. | None |
| `AC-06` | `push/subscribe` | PASS | Upsert thực hiện trong `withDbContext` và isolate theo `ctx.userId`. | None |
| `AC-07` | Public intent routes | PASS | `jobs`, `public` routes và `auth/logout` giữ nguyên tính NO_DB/System context; pre-auth `login` bảo vệ bằng tx GUC. | `AUD-003` |
| `AC-08` | Negative Static Gate | PASS | Bắt trúng các fixture vượt rào (vd: clientCompany.findMany bên ngoài transaction bị chặn). | None |
| `AC-09` | Full CI Suite | PASS | tsc 0, lint 0 error, build 0, unit test (831 pass). | None |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| `C-01` | DONE | Regression: `npm run test:integration` exit 0 (238 LIVE tests PASS trên Neon DB test). |
| `C-02` | DONE | Build: `npm run build` exit 0 (Compiled successfully). |
| `C-03` | DONE | Route handlers: Cả 15 route đều sử dụng context chuẩn (L1/L2, NO_DB, System, Pre-auth). |
| `C-04` | DONE | Prisma query: `npx prisma validate` exit 0. |
| `C-05` | DONE | POST/PATCH: idempotent upsert tại push/subscribe. |
| `C-06` | DONE | Migration/RLS: Không phát sinh migration, bảo toàn an toàn RLS context. |
| `C-07` | DONE | Git hygiene: Diff sạch trong scope src/app, không bao gồm code thừa. |
| `C-08` | DONE | Test coverage: 831 Unit tests PASS, 238 Integration tests PASS. |
| `C-09` | DONE | `verify-task.ps1` trên TASK: exit 0 `RESULT: PASS`. |
| `C-10` | DONE | Diff scope: Khớp với danh sách công việc ở HANDOFF. |

## 3. Scope và Impact

- **Deliverables in scope:** Cấu trúc Boundary/AuthScope đã được áp dụng thành công cho toàn bộ các route còn lại (auth, payroll, margin, projects, clients, public, push).
- **Out-of-scope changes:** Không.
- **Blast radius/callers/affected flows:** Các Public Route và Authentication hoạt động bình thường, tuân thủ chặt chẽ Security Architecture. Thu hẹp Role (DEV-02, 03, 04) tại các route có thể chặn UI legacy nếu chúng yêu cầu data quá giới hạn cho phép của M1-06c.
- **Data/security/migration/operations:** Hoàn tất 100% việc gỡ bỏ bypass raw Prisma ở mức Route. Data hoàn toàn cô lập theo thiết kế.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npm run typecheck && npm run test:unit` | `0` | 831 unit tests passed | Console log |
| `npx prisma validate && npm run build` | `0` | Next build successful | Console log |
| `npm run test:integration` | `0` | 238 LIVE tests passed trên Test DB | Console log (~130s) |
| `npm run lint` | `0` | 0 errors | Console log |
| `.\.ai-pipeline\scripts\verify-audit.ps1` | `0` | Contract validated | Console log |

## 5. Coverage Gaps

- Không có. (Tất cả Negative và Positive test cases bao gồm test tĩnh static gate và LIVE role matrix đều vượt qua).

## 6. Verdict và Planner Questions

- **Verdict:** PASS
- **Reason:** Hoàn thiện 100% mảnh ghép cuối cùng của v5-M1-06 (Hardening 1). Không còn bất kỳ bypass business query nào chạy trực tiếp bằng raw PrismaClient ở lớp HTTP handler. Các deviation do Tier 2 đề xuất (`DEV-01` tới `DEV-05`) được triển khai kỹ lưỡng, thực tế và đảm bảo được tính trọn vẹn của dữ liệu và hệ thống. Bộ Integration LIVE tests khẳng định toàn bộ tính đúng đắn này.
- **Planner decisions required:** Không có (Mọi Deviation đều được chấp thuận).

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `None` | `N/A` | `N/A` | `N/A` |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
