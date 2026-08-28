# AUDIT: hrp-v5-go-live-01-single-domain-consolidation

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-01-single-domain-consolidation` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Execution round | `2` |
| Audit round | `1` |
| Round opened by | `Tier 2-A HANDOFF` |
| Round closes when | `verdict PASS` |
| Auditor/context | `Tier 3 Independent Auditor` |
| Baseline/diff/artifacts | Checked against HANDOFF |
| Independence | `Confirmed (Tests run independently)` |
| Audit time | `2026-08-28` |

## 1. Findings

- Khảo sát mã nguồn (bằng `grep/rg`) trên các thư mục `app`, `src`, `middleware.ts` không phát hiện subdomain cứng `vendor.hrpartner.vn`, `worker.hrpartner.vn`, hay `ctv.hrpartner.vn` được sử dụng vào mục đích runtime navigation hay role-mapping.
- Mandatory verification commands chạy qua toàn bộ test suite. Suite `npm run test:unit` pass 1187/1187 tests. Targeted vitest run pass 94/94 tests. Build nextjs (static pages 28/28) hoàn tất mà không gặp lỗi.
- Cấu trúc `middleware.ts` và API cookies đáp ứng chính xác việc loại bỏ cơ chế subdomain và tích hợp trên canonical domain `hrpartner.vn`.
- G0 test-runner safety debt (`npx vitest run`) đã được ghi chú lại theo DEC-11 của Tier 1.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | Canonical domain & legacy redirect | PASS | Code kiểm tra (`middleware.ts`) và targeted unit tests verify đúng hành vi. | `None` |
| AC-02 | Role landing/fallback | PASS | Kiểm tra `login/logout route.ts`, `portal-domains.integration.test.ts` pass. | `None` |
| AC-03 | Cookie domain host-only | PASS | `logout/login` xóa/set cookie không có Domain attribute. | `None` |
| AC-04 | Legacy cookie cleanup | PASS | Cờ xóa cookie trên Production được kiểm định. | `None` |
| AC-05 | Vendor/worker fence | PASS | `security-matrix-portals.test.ts` xác thực 403. | `None` |
| AC-06 | Internal APIs allowlist | PASS | Không tìm thấy regex matching legacy domain ngoài scope cho phép. | `None` |
| AC-07 | Domain/Matrix test suites | PASS | `portal-domains.integration.test.ts` pass 49/49. | `None` |
| AC-08 | Grep/Rg inventory | PASS | Lệnh `grep` trả về empty cho các source code dirs. | `None` |
| AC-09 | Runbook OP honesty | PASS | Runbook OP ở HANDOFF tuân thủ đúng yêu cầu, không chứa secret. | `None` |
| AC-10 | Auth invariants | PASS | Các test authentication `auth-context.test.ts` (pass) không bị gãy. | `None` |
| AC-11 | Quality Gates (Build/Test/Lint) | PASS | `verify-task` DRAFT-VALID, `test:unit` exit 0, `tsc` exit 0, `build` exit 0. | `None` |
| AC-12 | Scope limits | PASS | Diff/status chỉ bao gồm các files cấu hình bảo mật liên quan trực tiếp đến auth và routing. | `None` |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | `npm run test:unit` exit 0 (1187 passed). |
| C-02 | DONE | `npm run build` exit 0 (28/28 static pages). |
| C-03 | DONE | Mọi query RLS / DB được chứng minh không bị thay đổi / phá vỡ. |
| C-04 | DONE | (Không yêu cầu LIVE lane cho task này do chỉ modify routing, nhưng full unit run Pass). |
| C-05 | DONE | Lỗi predicate/domain check trong middleware đã xử lý. |
| C-06 | DONE | Behavior API internal admin/HR không ảnh hưởng. |
| C-07 | DONE | Lệnh `git diff --check` và `git status` exit 0 không có artifact rác. |
| C-08 | DONE | Các logic fallback callback URL an toàn. |
| C-09 | DONE | `verify-task.ps1` exit 0 (DRAFT-VALID). |
| C-10 | DONE | HANDOFF trung thực, báo cáo đúng debt (BLK-01). |

## 3. Scope và Impact

- Loại bỏ kiến trúc multi-subdomain phức tạp, chuyển sang single-domain canonical `hrpartner.vn` để giảm rủi ro về open redirect, cookie domain issues, và gánh nặng DNS quản lý.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npx vitest run src/domains/security/portal-domains...` | 0 | 3 Test Files, 94 tests passed. Không regression middleware. | Console Output |
| `npm run test:unit` | 0 | 1187 unit tests passed. Gate chốt an toàn. | Console Output |
| `grep_search (rg equivalent)` | 0 results | Không còn hardcode subdomain trong `app`, `src`, `middleware.ts`. | Console Output |

## 5. Coverage Gaps

- Không có. Canonical behavior đã được bao phủ toàn bộ 13 role matrix test. (Lưu ý: M1-09 UI changes không nằm trong task này theo spec).

## 6. Verdict và Planner Questions

- **Verdict:** `PASS`
- **Reason:** Tier 2 đã xử lý rất tốt và chính xác những yêu cầu của single domain consolidation. Code changes hẹp, không lan man. Các test targeted và full unit lane test (1187 cases) đều pass. Sự cố về `npx vitest run` là G0 Debt không thuộc trách nhiệm sửa của task này và đã được Tier 1 phân loại (BLK-01/DEC-11). Tất cả mandatory command gates exit 0.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `NONE` | `N/A` | `FIXED` | (First pass successful). |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.

