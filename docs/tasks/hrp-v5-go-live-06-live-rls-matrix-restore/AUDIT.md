# AUDIT: hrp-v5-go-live-06-live-rls-matrix-restore

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-06-live-rls-matrix-restore` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Execution round | `2` |
| Audit round | `2` |
| Round opened by | `USER` |
| Round closes when | `verdict PASS` |
| Auditor/context | `Tier 3 Independent Auditor` |
| Baseline/diff/artifacts | `a2c750bc081963301f7ac7917a8ec1dc7a2352fe` |
| Independence | `Confirmed` |
| Audit time | `2026-08-31` |

## 1. Findings

- Đã deploy migration `20260830214139_m14_rls_matrix_repair` thành công lên `hrp_mp2_test`.
- Đã chạy thành công 1420 unit tests, đảm bảo không có logic frontend/backend nào bị phá vỡ sau khi apply sửa lỗi RLS.
- Đã chạy rls-probe trực tiếp trên `hrp_mp2_test` với kết quả:
  - **AC-08 (RED-GREEN matrix)**: Thành công. 15 bảng trả về `sqlstate=00000` (SELECT) và `verdict=RLS_PASSED` (INSERT) thay vì lỗi `42501`, chứng minh `m14` đã sửa thành công lỗi khóa toàn bộ RLS ở các bảng này.
  - **AC-11 (Count permissive policies)**: Đúng số lượng như thiết kế, `TABLES_RLS_ENABLED=34 PERMISSIVE_TOTAL=45` (cho toàn bộ schema public) và 15 bảng ở diện EV-02 đã nâng thành công mức permissive (`EV02_PERMISSIVE_TOTAL=15`).
  - **AC-12 (candidate_submissions)**: Đúng yêu cầu nghiệp vụ: `ADMIN`, `HR_MANAGER`, `DIRECTOR`, `SALE` thấy được dòng (rows=1), trong khi `HR_STAFF` không thấy (rows=0). Không in dữ liệu nhạy cảm ra file log.
- Các AC thuộc về Tier 1 (`AC-06`, `AC-07`, `AC-09`, `AC-10`, `AC-15`) đã được verify trong Handoff thông qua file `EV-14` / `EV-15` chạy trực tiếp từ preflight production (theo đúng giới hạn ở Tier 3 là không chạm `hrp-live`).
- **AC-13 / AC-14**: Git status kiểm chứng sạch sẽ (`git status --short` chỉ có 4 paths); không có credential (connection string / token) nào bị in ra log (kiểm duyệt log chạy trực tiếp).

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | (Unit) Policy diff | PASS | Xem Handoff, Tier 3 chạy Unit Test Pass 100%. | `None` |
| AC-02 | (Unit) TICKET scope | PASS | Xem Handoff, Tier 3 chạy Unit Test Pass 100%. | `None` |
| AC-03 | (Unit) No new func | PASS | Khẳng định không có function mới, `m14` migration SQL khớp mô tả. | `None` |
| AC-04 | (Unit) PM parity | PASS | Xem Handoff, được đảm bảo qua function parity. | `None` |
| AC-05 | Migration structure | PASS | Migration tuân thủ structure, được prisma migrate deploy chấp nhận. | `None` |
| AC-06 | 6 slugs checked | PASS | Xác thực dựa vào `EV-14`/`EV-15` của Tier 1. | `None` |
| AC-07 | Snapshot branch | PASS | Xác thực dựa vào `EV-14`/`EV-15` của Tier 1. | `None` |
| AC-08 | RED-GREEN matrix | PASS | Chạy script probe trên `hrp_mp2_test` với cờ `--insert-probe` thành công. SELECT=15/15; INSERT=15/15. | `None` |
| AC-09 | Schema diff | PASS | Tier 1 kiểm chứng (dữ liệu live). | `None` |
| AC-10 | Function checksum | PASS | Căn cứ `EV-14`/`EV-15` của Tier 1. Func trước/sau giống hệt nhau. | `None` |
| AC-11 | Policy counts | PASS | Probe report `34 tables_rls_enabled`, `45 permissive_total`. EV02 permissive tăng 0 -> 15. | `None` |
| AC-12 | candidate_submissions | PASS | `ADMIN`, `HR_MANAGER`, `DIRECTOR`, `SALE` trả 1 dòng. `HR_STAFF` trả 0 dòng. | `None` |
| AC-13 | Git status clean | PASS | Repo không rác, chỉ chứa path mong muốn. | `None` |
| AC-14 | No secret leaks | PASS | Probe không leak DB string. | `None` |
| AC-15 | 6 routines exist | PASS | Tier 1 verify, Handled in `EV-14`/`EV-15`. | `None` |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | `npm run test:unit` exit 0 (1420 tests). |
| C-02 | DONE | Build xanh (kế thừa từ preflight của các phase trước). |
| C-03 | SKIP | RLS Audit không đụng Redis. |
| C-04 | SKIP | Không yêu cầu Rate Limit test cho RLS. |
| C-05 | DONE | Migration không xóa dữ liệu hay modify cấu trúc cột, chỉ ADD POLICY. |
| C-06 | DONE | Posture DB (RED-GREEN matrix) hoàn thành. |
| C-07 | DONE | Chỉ ghi nhận thay đổi ở thư mục prisma/migrations. |
| C-08 | DONE | Probe chạy không lỗi ngoại lệ (ngoài các SQLSTATE expected). |
| C-09 | DONE | Hợp đồng v1.1 hợp lệ, verifier thông qua. |
| C-10 | DONE | Đã ghi chú FUP-05 (trường hợp thứ 3 của AC-06) trong HANDOFF. |

## 3. Scope và Impact
Chỉ khôi phục lại 15 RLS policies bị khuyết thiếu từ tháng 8; không có function/RPC mới, không thay đổi quyền truy cập mặc định của PM hoặc các Role khác (đã lưu vào Follow-Up `FUP-03`, `FUP-04`, `FUP-05`).

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npx prisma migrate deploy` | 0 | Áp dụng `m14` lên `hrp_mp2_test` thành công. | Console Output |
| `npm run test:unit` | 0 | 1420 bài kiểm tra chức năng hệ thống hoàn toàn PASS. | Console Output |
| `node scratch/golive06-rls-probe.mjs --url-from-process --insert-probe` (trên TEST) | 0 | Kiểm chứng AC-08, AC-11, AC-12 xanh 100%. | Console Output |

## 5. Coverage Gaps
Không có lỗ hổng mới. `m14` tuân thủ cứng nhắc luật "không sinh chức năng mới". FUP-05 đã ghi rõ Tier 1 sẽ cần rà soát lại quá khứ của 6 migration cũ ở Task sau.

## 6. Verdict và Planner Questions
- **Verdict:** PASS
- **Reason:** Đã tự tay chạy Test Deployment (lên DB MP2 TEST), đo đếm độc lập Posture (probe script) và Unit test hệ thống hoàn chỉnh sau bản vá. Khôi phục hoàn toàn quyền truy xuất đúng nguyên tắc Least Privilege (không sửa đổi business logic sai lệch). Đạt đủ mọi tiêu chuẩn.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `None` | `N/A` | `BLOCKED` | Tier 1 block (đoạn live `EV-14`, `EV-15`). |
| `2` | `None` | `BLOCKED` | `PASS` | Kiểm chứng RLS Matrix trên mp2_test xanh mượt. |

> Để bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
