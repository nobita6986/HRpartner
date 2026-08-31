# AUDIT: hrp-v5-go-live-10-admin-ui-repair

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-10-admin-ui-repair` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `2` |
| Audit round | `2` |
| Round opened by | `USER` |
| Round closes when | `verdict PASS` |
| Auditor/context | `Tier 3 Independent Auditor` |
| Baseline/diff/artifacts | `708506f` (HEAD `1af4eff`) |
| Independence | `Confirmed` |
| Audit time | `2026-09-01` |

## 1. Findings

### Execution Round 1
- Nguyên nhân gốc của popup trong suốt và viền kẻ bị mất đã được xác định chính xác: 905 lượt gọi biến CSS không có định nghĩa do thiếu tiền tố `color-`.
- Lớp tương thích `:root` gồm 22 alias đặt ngay sau khối `@theme` trong `app/globals.css` đã giải quyết toàn bộ 905 tham chiếu vô hiệu, đồng thời tuân thủ quy tắc chỉ có MỘT nguồn mã màu gốc. Tuy nhiên, khối này bị chèn nhầm vào bên trong một đoạn comment CSS dẫn đến việc không có tác dụng trên thực tế (phát hiện trong Round 2).

### Execution Round 2
- R2-01: Khối `:root` alias đã được đưa ra khỏi comment và có thêm phần tài liệu giải thích.
- R2-02: Quy tắc reset transform (`transform: none !important`) đã được áp dụng riêng cho `.nav-item-lift:hover` thay vì `*` trong khối prefers-reduced-motion.
- R2-03 & R2-07: Tier 2 đã giữ nguyên `role-guard-layout.tsx` (ngoài allowlist) và để utility class của Tailwind xử lý cú nhấc, bảo toàn giới hạn chỉnh sửa ở `globals.css`.
- R2-04: Test case tĩnh được cập nhật (12 case), bắt buộc phải chặn trường hợp comment bao trùm khối alias.
- Mọi điều kiện test tĩnh và rule đều xanh.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | Kiểm tra vị trí khối :root alias | PASS | Khối `:root` với 22 alias nằm ngay trước đoạn khai báo Material Symbols và sau `@theme`. | `None` |
| AC-02 | Test thiết kế 1 bảng màu duy nhất | PASS | Cú pháp `var(--color-*)` được bảo toàn nguyên vẹn. | `None` |
| AC-03 | Quét RED/GREEN của design-tokens test | PASS | `npx vitest run src/shared/ui/design-tokens.static.test.ts`. RED: exit `1`, (3 failed / 9 passed) test bắt lỗi comment trùm. GREEN: exit `0`, `12 passed (12)`. | Bắt đúng lỗi comment của R1. |
| AC-04 | Hàm findUnresolvedVarRefs hoạt động | PASS | Nằm trong bài test tĩnh, ném RED khi cấu trúc hỏng. | `None` |
| AC-05 | Thay thế var fallback cũ | PASS | Các file tsx không bị chạm tới trong R2. | Đã hoàn tất ở R1. |
| AC-06 | Focus-visible toàn cục | PASS | Trong `app/globals.css` chứa khối `:focus-visible` offset 2px. | `None` |
| AC-07 | Giảm chuyển động (prefers-reduced-motion) | PASS | Khối `@media (prefers-reduced-motion: reduce)` nằm cuối CSS. | R2-02 sửa đổi chọn đúng element. |
| AC-08 | Sidebar Admin hover state | PASS | Xác nhận `role-guard-layout.tsx` không bị chỉnh sửa (giữ nguyên quy tắc từ R1). | `None` |
| AC-09 | Mở rộng vùng chạm nút đăng xuất | PASS | Giữ nguyên từ R1. | `None` |
| AC-10 | Hover bảng `applications`, `jobs` | PASS | Giữ nguyên từ R1. | `None` |
| AC-11 | Xóa hiệu ứng transform hàng | PASS | Giữ nguyên từ R1. | `None` |
| AC-12 | Panel shadow và nút đóng | PASS | Giữ nguyên từ R1. | `None` |
| AC-13 | Gate: typecheck | PASS | `npm run typecheck`, exit `0`, không output. | `None` |
| AC-14 | Gate: test unit | PASS | `npm run test:unit`, exit `0`, `1480 passed (1480)`. | Thoả ngưỡng 1476. |
| AC-15 | Gate test: ngưỡng tổng số lượng | PASS | Đoạn test có 1480 > 1476 theo ngưỡng. | Tự đo `npm run test:unit`. |
| AC-16 | Build Next.js app | PASS | `npm run build` ra file tĩnh với kích thước lớn hơn rõ rệt (89512 bytes). | `None` |
| AC-17 | Scope modifications check | PASS | Thay đổi nằm gọn trong allowlist: `app/globals.css` và `design-tokens.static.test.ts`. | Tuân thủ tuyệt đối R2-07. |
| AC-18 | Không leak data / auth permission | PASS | Tác động thuần túy CSS và test tĩnh, auth layer nguyên vẹn. | `None` |
| AC-19 | Cấm tự ý commit/push | PASS | Cấu trúc local repo hiện giữ nguyên trạng thái theo yêu cầu của Owner ở đầu audit. | Không commit, Không push trong lúc audit. |

## 2.5 Round 2 Verification

| AC / Yêu cầu | Phương pháp đo | Kết quả | Bằng chứng |
|---|---|---|---|
| R2-01 (Documentation) | Đọc `globals.css` | PASS | Đoạn comment 18 dòng đã nằm ngay trước `:root { --primary... }` |
| R2-02 (Reduced motion target) | Đọc `globals.css` | PASS | `transform: none !important` chỉ nhắm vào `.nav-item-lift:hover` trong `@media` |
| R2-03 & R2-07 (Allowlist) | `git status --short` | PASS | Chỉ 2 file thay đổi: `app/globals.css` và `src/shared/ui/design-tokens.static.test.ts`. `role-guard-layout.tsx` không bị chạm. |
| R2-04 (Static Test Cases) | Chạy `vitest` | PASS | Exit code `0` (12 passed). Test đã bắt lỗi comment thành công ở nhánh RED. |
| R2-05 (Gate checks) | `tsc` và `test:unit` | PASS | `npm run typecheck` exit `0`. `npm run test:unit` exit `0` (1480 passed). |
| R2-06 (No commit/push/deploy) | Kiểm tra CLI | PASS | Tier 3 hoàn toàn không commit hay push trong round 2. Lịch sử git hiện tại là kết quả của Tier 1 và Tier 2. |
| R2-08 (Numstat diff) | `git diff --numstat` | PASS | `app/globals.css` có 27 dòng thêm, 1 dòng xoá. |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | `npm run test:unit` exit `0`, output `Tests 1480 passed (1480)` |
| C-02 | DONE | `npm run typecheck` exit `0`, Stdout rỗng, stderr rỗng |
| C-03 | SKIP | Task sửa CSS, không đụng Redis. |
| C-04 | SKIP | Không đụng rate limit. |
| C-05 | SKIP | Không sửa Schema. |
| C-06 | SKIP | Không sửa RLS. |
| C-07 | SKIP | Không migration. |
| C-08 | DONE | Tự đo `npx vitest run src/shared/ui/design-tokens.static.test.ts` trên nhánh hỏng của commit trước ra RED, và fix hiện tại ra GREEN. |
| C-09 | DONE | Verifier script exit 0 sau khi lưu. |
| C-10 | DONE | Báo cáo thay đổi giao diện theo hợp đồng đã được lưu ý trong HANDOFF (ảnh hưởng tới bod/vendor/ctv/worker/login/placement-panel). |

## 3. Scope và Impact
Chỉnh sửa hệ thống biến CSS toàn cục nhằm phục hồi khả năng hiển thị cho toàn bộ phân hệ Admin và các view dùng chung. Ở Round 2, lỗi đưa khối `:root` vào trong comment đã được sửa, trả lại trạng thái render đúng trên môi trường production tương lai. Hiệu ứng `reduced-motion` được tối ưu hóa chỉ nhắm vào thành phần cần thiết. Bài test tĩnh được củng cố với 4 case mới để chặn triệt để lỗi parse comment sai.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `npx vitest run src/shared/ui/design-tokens.static.test.ts` (RED của R2-04) | `1` | Tests fail (3 failed, 9 passed) | Output: `expected [] to have a length of 1 but got +0` |
| `npx vitest run src/shared/ui/design-tokens.static.test.ts` (GREEN) | `0` | Tests passed | `Tests  12 passed (12)` |
| `npm run typecheck` | `0` | Không có lỗi TypeScript | Stdout rỗng, stderr rỗng |
| `npm run test:unit` | `0` | Tests pass hoàn toàn | `Tests 1480 passed (1480)` |
| `git diff --numstat -- app/globals.css` | `0` | 27 thêm, 1 xoá | `27 1 app/globals.css` |

## 5. Coverage Gaps
Không đòi hỏi duyệt trình duyệt vì repository không có bộ cài cypress/playwright/puppeteer và testing UI tự động không nằm trong Spec. Việc kiểm chứng UI phụ thuộc vào Owner OP (Eyeball check).

## 6. Verdict và Planner Questions
- **Verdict:** PASS
- **Reason:** Đạt toàn bộ các AC của spec v1.0 và tuân thủ chặt chẽ các giới hạn, yêu cầu mới sinh ra trong Execution round 2 (R2-01 đến R2-08). Test tĩnh thiết kế xuất sắc bắt được lỗi "block trốn trong comment" và code hiện tại đã hoàn toàn GREEN.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `None` | `N/A` | `FAIL` | Phát hiện lỗi CSS comment bao trùm toàn bộ khối alias sau khi Tier 1 đánh giá lại (F-07). Tier 2 tạo Round 2. |
| `2` | `None` | `FAIL` | `PASS` | Đã đưa khối `:root` ra khỏi comment và thêm test case kiểm soát độ dài hợp lệ. 1480 tests passed. `app/globals.css` diff hợp lệ (27 1). |

Để bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
