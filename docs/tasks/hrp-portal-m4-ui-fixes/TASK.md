# TASK: hrp-portal-m4-ui-fixes

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-portal-m4-ui-fixes |
| Work type | CODE |
| Audit mode (Tier 3 đọc) | CODE_AUDIT |
| Spec version | v1.0 |
| Status | READY_FOR_EXECUTION |
| Planner | Tier 1 (Antigravity) |
| Executor | Tier 2 |
| Auditor | Tier 3 |
| Baseline | HEAD of main |
| Modules | M4-Hotfixes |
| ADR references | None |
| Current execution round | 1 |
| Current audit round | 0 |
| Next gate | /code hrp-portal-m4-ui-fixes |
| Updated | 2026-08-20 12:16 +07:00 |

## 1. Outcome

### User-visible outcome

- **Sửa lỗi hiển thị Icon**: Toàn bộ icon (Material Symbols) trên trang web hiển thị đúng hình ảnh thay vì hiện chữ (alt text). 
- **Tối ưu UX cuộn (Infinite Scroll)**: Tại danh sách việc làm, dòng chữ "Đang tải thêm việc làm..." CHỈ xuất hiện khi người dùng cuộn đến cuối trang để gọi thêm dữ liệu. Nếu hết việc (API trả về mảng rỗng hoặc hết tổng số), sẽ đổi text thành "Đã xem toàn bộ danh sách".
- **Cấu hình Navigation**: Xóa bỏ các menu "Dịch vụ Tuyển dụng" và "Giải pháp Nhân sự" khỏi GlobalNavbar.
- **Trang "Về chúng tôi"**: Thay thế toàn bộ nội dung của trang /ve-chung-toi bằng cấu trúc HTML có sẵn trong file index.html tại thư mục gốc.

### Non-goals

- Không xây dựng thêm Backend API mới.
- Tạm thời chưa làm trang Job Detail (/jobs/[id]) trong task này để tập trung fix triệt để UX/UI trước.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| EV-01 | Bug Report | Icon hiển thị dạng text/alter. | Cần tìm cách load chuẩn Material Symbols trong Next.js 15+ App Router. |
| EV-02 | Bug Report | Text "Đang tải..." hiện sai logic. | Bổ sung logic IntersectionObserver và state hasMore. |
| EV-03 | Feature Request | Bỏ 2 menu thừa, thay thế trang /ve-chung-toi. | Sửa mảng 
avLinks và tạo mới component cho route /ve-chung-toi. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Tích hợp Material Symbols qua `next/font/google` (nếu có thể hỗ trợ) HOẶC sử dụng đúng cách chèn thẻ link ở layout mà không ghi đè thẻ head mặc định của Next.js (có thể đưa link ra ngoài thẻ head). | Planner | Valid |
| DEC-02 | CHOSEN | Trang /ve-chung-toi sẽ được build thành Server Component ( pp/(portal)/ve-chung-toi/page.tsx), đọc và parse file index.html hoặc chuyển markup HTML sang JSX. Khuyến nghị chuyển sang JSX để an toàn và chuẩn hóa. | Planner | Valid |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| RQ-01 | Sửa triệt để lỗi hiển thị Icon (Material Symbols). | Must | EV-01 | Icon vẫn hiện thành chữ. |
| RQ-02 | Cập nhật logic Infinite Scroll ở pp/(portal)/page.tsx: Hiện "Đang tải thêm..." khi cuộn xuống đáy. Hiện "Đã xem toàn bộ danh sách" khi hết data. | Must | EV-02 | Dòng chữ hiện tĩnh gây nhầm lẫn. |
| RQ-03 | Xóa 2 menu "Dịch vụ Tuyển dụng", "Giải pháp Nhân sự" khỏi GlobalNavbar. | Must | EV-03 | Menu thừa. |
| RQ-04 | Cập nhật nội dung route /ve-chung-toi bằng JSX từ file index.html (thư mục gốc). | Must | EV-03 | Trang cũ / Lỗi 404. |
| RQ-05 | Pass toàn bộ test suite hiện có. | Must | Baseline | CI fail. |

### 4.2 Scope boundaries

**In scope:**
- pp/globals.css / pp/layout.tsx (cho icon)
- pp/(portal)/page.tsx (logic infinite scroll)
- pp/components/GlobalNavbar.tsx (xóa menu)
- pp/(portal)/ve-chung-toi/page.tsx (tạo/sửa trang)

**Out of scope:**
- Thay đổi Database schema.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| STEP-01 | RQ-01 | pp/layout.tsx / CSS | Tìm và fix cách import Material Symbols hợp lệ để render được icon. | N/A | Check UI thấy icon | Hydration lỗi |
| STEP-02 | RQ-02 | pp/(portal)/page.tsx | Bổ sung thư viện/hook như eact-intersection-observer để bắt sự kiện cuộn đáy. Quản lý state hasMore. Cập nhật giao diện text. | STEP-01 | Cuộn UI | Lỗi logic tải data |
| STEP-03 | RQ-03 | GlobalNavbar.tsx | Xóa 2 object trong mảng 
avLinks. | N/A | Check header | Break Navbar |
| STEP-04 | RQ-04 | pp/(portal)/ve-chung-toi/page.tsx | Chuyển đổi mã HTML từ root index.html sang dạng React Component và render tại route này. | N/A | Check /ve-chung-toi | Vỡ layout trang |
| STEP-05 | RQ-05 | Toàn bộ | Chạy itest. | STEP-04 | Exit 0 | Lỗi test |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| AC-01 | RQ-01..04 | Các tính năng UX (Icon, Scroll, Navbar, Trang About) hoạt động chuẩn. | Đọc code / Test UI | Screenshot / Network | Yes |
| AC-02 | RQ-05 | itest báo pass. | Lệnh test | Exit 0 | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| RQ-01 | STEP-01 | AC-01 |
| RQ-02 | STEP-02 | AC-01 |
| RQ-03 | STEP-03 | AC-01 |
| RQ-04 | STEP-04 | AC-01 |
| RQ-05 | STEP-05 | AC-02 |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| RISK-01 | Convert index.html sang JSX thủ công bị sót thẻ tự đóng (như thẻ img, thẻ br, thẻ input). | Build fail. | Chú ý chuẩn hóa (validate) JSX trước khi lưu. | Không áp dụng |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| - | - | - | - | - |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| - | - | - | - | - | - |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| 1.0 | 2026-08-20 | Tạo task hrp-portal-m4-ui-fixes. | Sếp yêu cầu fix gấp các lỗi UI và đổi nội dung trang Về chúng tôi. |
