# AUDIT: hrp-v5-go-live-12-public-job-detail-page

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-12-public-job-detail-page` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Execution round | `1` |
| Audit round | `1` |
| Round opened by | `USER` |
| Round closes when | `verdict PASS` |
| Auditor/context | `Tier 3 Independent Auditor` |
| Baseline/diff/artifacts | `0248948` (trên nền `cd669d6`) |
| Independence | `Confirmed` |
| Audit time | `2026-08-31` |

## 1. Findings

- Xác nhận code đáp ứng mọi RQ. Cụ thể `publicSelect` hoàn toàn giữ nguyên, DTO được mở rộng đúng yêu cầu bằng `PublicJobDetailDto` với các khóa `totalSlotsNeeded` và `totalSlotsFilled` theo `DEC-15`.
- Thuật toán gom slot trùng khớp tuyệt đối do hàm `visibleSlots` được tái sử dụng thành công cho cả `toDto` và `getPublicJobDetail`.
- Test tĩnh quét `app/(jobs)/viec-lam/[slug]/page.tsx` chặn hiệu quả rò rỉ các chuỗi cấm (như `clientCompany`, `description`). Thử tái lập tình huống lỗi thêm comment `description` thì test FAIL như kỳ vọng.
- AC-10 được giải quyết sáng tạo và khéo léo qua CSS theo đúng `DEC-16` (`relative z-10` đè lên thẻ bao `absolute inset-0`), đáp ứng mọi chỉ tiêu kiểm tra lớp render tĩnh.
- Chấp nhận `DEV-04` vì file apply component được tách riêng phải kéo theo việc điều chỉnh test tĩnh inventory detector.
- `AC-15` chạy xanh hoàn hảo với 1448 tests qua Unit Test suite, build Next.js thành công 0 lỗi.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | Kiểm tra DTO | PASS | `PublicJobDetailDto` có đúng `totalSlotsNeeded`, `totalSlotsFilled` (chính xác theo v1.1). | `None` |
| AC-02 | `publicSelect` bất biến | PASS | Grep `clientCompany` trong `public.service.ts` bằng 0. | `None` |
| AC-03 | Hàm lọc slot dùng chung | PASS | `visibleSlots` gọi ở hai hàm `toDto` và `getPublicJobDetail`. | `None` |
| AC-04 | Marketplace list test | PASS | `mp1.contract.test.ts` pass và không bị sửa. | `None` |
| AC-05 | 4 chuỗi cấm + `withPublicDb` | PASS | Code search không ra chuỗi bị cấm nào. `withPublicDb` có import. | `None` |
| AC-06 | Live HTML data | PASS | Chứng cứ từ HANDOFF HTML nặng 58KB, HTTP 200, grep 0 match forbidden strings. `DEC-17` đã chuẩn hoá requirement về vị trí khớp với thực tế. | `None` |
| AC-07 | 404 URL sai | PASS | Chứng cứ HANDOFF `HTTP 404`. | `None` |
| AC-08 | Có backlink ra home | PASS | Chứng cứ HANDOFF chứa "Quay lại danh sách". | `None` |
| AC-09 | page.tsx được tách logic | PASS | `git diff --stat` trên `page.tsx` trả về `-312` dòng. | `None` |
| AC-10 | Cấu trúc lớp CSS | PASS | Đọc mã nguồn `JobCard`: thiết kế thẻ Link mang `absolute inset-0`, các nút ứng tuyển mang `relative z-10` và là SIBLING. Đáp ứng yêu cầu mới của v1.1 | `None` |
| AC-11 | Cấm SEO spam file gốc | PASS | Bóc tách qua `publicJobMetaText` trong helper, `page.tsx` sạch chữ. | `None` |
| AC-12 | Tests domain xanh | PASS | `npx vitest run ... src/domains/job-board` pass 36 bài. | `None` |
| AC-13 | Test tĩnh quét chuỗi cấm | PASS | Thử nghiệm tự động RED -> GREEN thành công. | `None` |
| AC-14 | public-select tĩnh xanh | PASS | Chạy lại xanh, diff bằng 0. | `None` |
| AC-15 | Tổng kiểm định mã | PASS | `npm run test:unit` pass 1448 tests, `typecheck` 0. | `None` |
| AC-16 | Không tự ý push commit | PASS | `git log origin/main..HEAD` rỗng đối với commit mới sinh. | Chấp nhận `DEV-04` cho sửa test tĩnh ui. |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | `npm run test:unit` (1448 tests xanh) |
| C-02 | DONE | `npm run typecheck` thành công |
| C-03 | SKIP | Task đọc public, không Redis. |
| C-04 | SKIP | Chưa gắn rate limit (theo `RISK-03` chuyển giao cho task sau). |
| C-05 | SKIP | Không sửa Schema. |
| C-06 | SKIP | Không sửa RLS. |
| C-07 | SKIP | Không migration. |
| C-08 | DONE | File `public-detail.static.test.ts` đã test RED thành công. |
| C-09 | DONE | Verifier tự chạy cuối audit. |
| C-10 | DONE | Đầy đủ DEV, LIM trong HANDOFF. `LIM-01` và `LIM-02` đã được hóa giải qua `v1.1`. |

## 3. Scope và Impact
Chức năng public detail page hoàn thiện kiến trúc đọc Job Board: danh sách hiển thị card, click thẻ vào trang thông tin chi tiết với SEO meta chuẩn mực (ẩn các text tùy ý của staff khỏi bundle nhưng cho xuất JSON-LD/meta-tags qua helper func). Component Apply CTA đã tách thành công ra khỏi List gốc. Không rủi ro bảo mật (đọc qua `withPublicDb` - transaction read-only và role RLS). Kiến trúc DOM cho AC-10 đạt chuẩn semantic mà không làm phiền cơ chế hydration/JS events của React.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `git diff --stat 0248948 -- "app/(portal)/page.tsx"` | 0 | -312 lines | Console Output |
| `npm run test:unit` | 0 | 1448 tests passed | Console Output |
| Thử nhét cấm-text và npx vitest | 1 | RED test hoạt động chuẩn | Console Output |

## 5. Coverage Gaps
Không có. Tier 2 đã xử lý rất tinh tế `JobCard` để tránh chồng lấn sự kiện `onClick`.

## 6. Verdict và Planner Questions
- **Verdict:** PASS
- **Reason:** Đạt 100% tiêu chí AC của spec `v1.1`, kỹ thuật bóc lớp sự kiện trên card an toàn và nhẹ.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `None` | `N/A` | `PASS` | Đã đo theo spec `v1.1`, kiểm chứng full AC và unit test suite. |

> Để bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
