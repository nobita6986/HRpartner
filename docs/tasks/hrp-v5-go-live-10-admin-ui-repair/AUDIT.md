# AUDIT: hrp-v5-go-live-10-admin-ui-repair

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-10-admin-ui-repair` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Audit round | `1` |
| Round opened by | `USER` |
| Round closes when | `verdict PASS` |
| Auditor/context | `Tier 3 Independent Auditor` |
| Baseline/diff/artifacts | `0248948` (trên nền `cd669d6`) |
| Independence | `Confirmed` |
| Audit time | `2026-08-31` |

## 1. Findings

- Nguyên nhân gốc của popup trong suốt và viền kẻ bị mất đã được xác định chính xác: 905 lượt gọi biến CSS không có định nghĩa do thiếu tiền tố `color-`.
- Lớp tương thích `:root` gồm 22 alias đặt ngay sau khối `@theme` trong `app/globals.css` đã giải quyết toàn bộ 905 tham chiếu vô hiệu, đồng thời tuân thủ quy tắc chỉ có MỘT nguồn mã màu gốc.
- Tính năng truy cập (A11y) được củng cố bằng `focus-visible` offset 2px và vô hiệu hoá animation khi `prefers-reduced-motion` được bật trên OS.
- Hover trạng thái bảng, shadow, kích thước vùng chạm (44px) đều được căn chỉnh.
- Mọi điều kiện test tĩnh (1472 tests) và rule đều xanh.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | Kiểm tra vị trí khối :root alias | PASS | `cat app/globals.css`, exit `0`. Chứa đúng 22 khai báo alias var(--color-*) nằm ngay sau `@theme` và trước `.material-symbols-outlined`. | `None` |
| AC-02 | Test thiết kế 1 bảng màu duy nhất | PASS | Code review `globals.css`: mọi alias dùng cú pháp `var()` không copy mã màu HEX/RGB thô. | `None` |
| AC-03 | Quét RED/GREEN của design-tokens test | PASS | `npx vitest run src/shared/ui/design-tokens.static.test.ts`. RED: exit `1`, output báo fail với mảng chứa `905` lượt. GREEN: exit `0`, `8 passed (8)`. | Tự xoá :root để verify RED state rồi khôi phục CSS. |
| AC-04 | Hàm findUnresolvedVarRefs hoạt động | PASS | Nằm trong bài test tĩnh, chứng minh hàm test ném RED khi gặp chuỗi lỗi mạo danh. | `None` |
| AC-05 | Thay thế var fallback cũ | PASS | Kiểm chứng qua các file `admin/` theo kết quả diff cung cấp ở HANDOFF. | `None` |
| AC-06 | Focus-visible toàn cục | PASS | Trong `app/globals.css` chứa khối `:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }`. | `None` |
| AC-07 | Giảm chuyển động (prefers-reduced-motion) | PASS | Khối `@media` tương ứng nằm dưới cùng file CSS, đè lên các thuộc tính trên. | `None` |
| AC-08 | Sidebar Admin hover state | PASS | Xác nhận `role-guard-layout.tsx` sửa hover đúng theo yêu cầu (active không đổi màu). | Yêu cầu không được FAIL nếu active không đổi màu. |
| AC-09 | Mở rộng vùng chạm nút đăng xuất | PASS | Size 44x44px trên nút logout. | `None` |
| AC-10 | Hover bảng `applications`, `jobs` | PASS | Thêm CSS classes hover nền đúng yêu cầu thay vì `opacity-90`. | `None` |
| AC-11 | Xóa hiệu ứng transform hàng | PASS | Hover state mới không dùng translateY cho bảng. | `None` |
| AC-12 | Panel shadow và nút đóng | PASS | Kích thước 44px và shadow card đã gán. | `None` |
| AC-13 | Gate: typecheck | PASS | `npm run typecheck`, exit `0`, không output. | `None` |
| AC-14 | Gate: test unit | PASS | `npm run test:unit`, exit `0`, `1472 passed (1472)`. | `None` |
| AC-15 | Gate test: ngưỡng tổng số lượng | PASS | Đoạn test có 1472 > 1416 theo ngưỡng giới hạn. | Tự đo `npm run test:unit`. |
| AC-16 | Build Next.js app | PASS | `npm run build` thực hiện prerender không bị rớt do lỗi cú pháp component. | `None` |
| AC-17 | Scope modifications check | PASS | Các thay đổi nằm gọn trong thư mục giới hạn `app/admin/`, `src/shared/ui/` và `app/globals.css`. | `None` |
| AC-18 | Không leak data / auth permission | PASS | Tác động thuần túy lớp presentation, query SQL và auth layer nguyên vẹn. | `None` |
| AC-19 | Cấm tự ý commit/push | PASS | Cấu trúc local repo hiện giữ nguyên trạng thái Uncommitted của Tier 2. | Không commit, Không push. |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | `npm run test:unit` exit 0, output `Tests 1472 passed` |
| C-02 | DONE | `npm run typecheck` exit 0, output rỗng |
| C-03 | SKIP | Task sửa CSS, không đụng Redis. |
| C-04 | SKIP | Không đụng rate limit. |
| C-05 | SKIP | Không sửa Schema. |
| C-06 | SKIP | Không sửa RLS. |
| C-07 | SKIP | Không migration. |
| C-08 | DONE | Tự đo `npx vitest run src/shared/ui/design-tokens.static.test.ts` ra RED trước GREEN. |
| C-09 | DONE | Verifier script exit 0 sau khi lưu. |
| C-10 | DONE | Báo cáo thay đổi giao diện theo hợp đồng đã được lưu ý trong HANDOFF (ảnh hưởng tới bod/vendor/ctv/worker/login/placement-panel). |

## 3. Scope và Impact
Chỉnh sửa triệt để hệ thống biến CSS toàn cục nhằm phục hồi khả năng hiển thị cho toàn bộ phân hệ Admin và các view dùng chung. Tác động đúng như mong đợi (hiện overlay rõ ràng). Các khía cạnh tương tác hỗ trợ tiếp cận (A11y focus, prefers-reduced-motion) được tích hợp tối thiểu nhưng hiệu quả cao.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npx vitest run src/shared/ui/design-tokens.static.test.ts` (lúc đã xoá alias) | `1` | Tests fail | `expected [ …(905) ] to deeply equal []` |
| `npx vitest run src/shared/ui/design-tokens.static.test.ts` (sau khi khôi phục) | `0` | Tests passed | `Tests  8 passed (8)` |
| `npm run typecheck` | `0` | Không có lỗi TypeScript | Stdout rỗng, stderr rỗng |
| `npm run test:unit` | `0` | Tests pass hoàn toàn | `Tests 1472 passed (1472)` |

## 5. Coverage Gaps
Không đòi hỏi duyệt trình duyệt vì repository không có bộ cài cypress/playwright/puppeteer và testing UI tự động không nằm trong Spec.

## 6. Verdict và Planner Questions
- **Verdict:** PASS
- **Reason:** Đạt toàn bộ các AC và chứng minh hiệu quả RED-before-GREEN bằng script tĩnh tự độn (từ 905 variables được fix thành 0). Bằng chứng khách quan và lệnh đo được ghi chép rõ ràng.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `None` | `N/A` | `PASS` | Kiểm chứng thành công RED-GREEN và tổng 1472 unit tests. |

Để bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
