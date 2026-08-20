# AUDIT: hrp-portal-m12-bod-api-integration

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | hrp-portal-m12-bod-api-integration |
| Work/Audit type | CODE_AUDIT |
| Spec version | v1.0 |
| Execution round | 1 |
| Audit round | 1 |
| Round opened by | Tier 1 (Antigravity) |
| Round closes when | verdict PASS + Planner Resolution ACCEPTED |
| Auditor/context | Tier 3 Independent Auditor |
| Baseline/diff/artifacts | HEAD of main |
| Independence | Confirmed |
| Audit time | 2026-08-20 22:50 TZ |

## 1. Findings

- **AUD-001 (Traceability & Verify Task):** `verify-task.ps1` báo lỗi vì sử dụng range `->` trong bảng Traceability (BLK-03). Đã được Planner sửa lại thành 3 dòng rời.
- **AUD-002 (DB Permission Drift):** Giống hệt M11 (BLK-01), lỗi `42501 permission denied` ngăn cản runtime test. 
- **AUD-003 (Semantic Deviation):** Component "Priority Projects" trên giao diện lại được hiển thị từ model `VendorStatement` thay vì các Project thật (DEV-01). Mặc dù thoả mãn mockup tĩnh (vì lúc đó chưa có API), nhưng xét về mặt nghiệp vụ BoD là không đúng (họ muốn xem các dự án nổi bật, không phải các bill tính tiền).

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | Sửa DB & Test. | BLOCKED | Lỗi Permission Denied từ môi trường DB Neon chung. | Chặn bởi BLK-01. |
| `AC-02` | Check code `app/bod/page.tsx` xem mock array còn không. | PASS | 100% mock data array bị xoá, thay bằng `getBodSnapshot()`. | N/A |
| `AC-03` | npm run build | PASS | Exit 0. RSC Route được build thành công. | N/A |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| `C-01` | DONE | Lỗi Security Matrix cũ. |
| `C-02` | DONE | npm run build exit 0. |
| `C-03` | SKIP | |
| `C-04` | SKIP | |
| `C-05` | SKIP | Không trả về JSON API, mà là Server Component rendering. |
| `C-06` | DONE | Layout đã bảo vệ bằng context. |
| `C-07` | DONE | Giao diện đã có empty state để tránh vỡ UI khi DB rỗng. |
| `C-08` | DONE | Code logic Service sạch, tối ưu với `Promise.all()`. |
| `C-09` | DONE | Không sập server khi build. |
| `C-10` | DONE | Traceability được fix chuẩn. |

## 3. Scope và Impact

- **Deliverables in scope:** `src/lib/services/bod.service.ts`, `app/bod/page.tsx`.
- **Out-of-scope changes:** Không.
- **Blast radius:** Lỗi DB làm trang `/bod` crash tại runtime, không ảnh hưởng module khác.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| npm run build | 0 | Compiled successfully | stdout |

## 5. Coverage Gaps

- Việc "vay mượn" bảng VendorStatement cho danh sách Priority Projects là điểm trừ lớn về mặt Product Design.

## 6. Verdict và Planner Questions

- **Verdict:** READY_WITH_BLOCKER
- **Reason:** Tier 2 đã chuyển đổi toàn bộ mock-data sang Database queries (Prisma) và code rất chất lượng. Tuy nhiên, runtime test bị block bởi môi trường (BLK-01), và UI cần điều chỉnh nghiệp vụ.
- **Planner decisions required:**
  - Sửa lỗi Traceability: Xong.
  - Chờ M11.1 xử lý DB baseline.
  - Tạo thêm M12.1 để làm query `Project` thật.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| 1 | N/A | N/A | N/A | N/A |

> Đã bàn giao AUDIT.md cho Tier 1; Planner Resolution đã hoàn tất.
