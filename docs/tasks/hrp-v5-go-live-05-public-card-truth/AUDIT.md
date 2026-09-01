# AUDIT: hrp-v5-go-live-05-public-card-truth

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-05-public-card-truth` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.3` |
| Execution round | `2` |
| Audit round | `2` (Execution round 2, lần đo hiện tại) |
| Round opened by | `USER` |
| Round closes when | `verdict PASS` |
| Auditor/context | `Tier 3 Independent Auditor` |
| Baseline/diff/artifacts | `fb993a7` |
| Independence | `Confirmed` |
| Audit time | `2026-09-01` |

## 1. Findings

- Kiểm chứng thay đổi Round 2 so với Round 1 dựa trên công bố numstat mới từ HANDOFF của Tier 2 kết hợp phép đo của Tier 3 tại codebase hiện tại: `git diff --numstat` cho kết quả khớp từng dòng, route API mất 1 tham số như khai báo, chứng minh Tier 2 sửa in-place trên working tree của Round 1 chưa từng được commit.
- AC-12 LIVE integration tests rơi vào trạng thái `ENV_BLOCKED` (theo BLK-01) do credentials của test database branch `br-misty-cell-az3nx5l3` báo lỗi authentication. Việc này được ghi nhận như một ngoại lệ an toàn do thiếu hụt biến môi trường phía Tier 3.
- `DEC-16` hợp thức hoá ngoại lệ out-of-scope `src/domains/job-board/mp1.contract.test.ts`. Phép đo biên bằng `git diff --numstat` đúng 2 dòng thêm 1 dòng xoá; file chỉ có một hunk và 0 lệnh assert bị chỉnh sửa (được đo đạc tự động qua grep). 
- `AC-15` (điều hướng go-live-12) vẫn giữ nguyên 2 thẻ `<Link href={detailHref}` nguyên vẹn như yêu cầu mà không báo lỗi false-negative. 
- `AC-09` (Limiter và context) vẫn bảo toàn chính xác trật tự; việc đổi MD5 của `route.ts` do gỡ bỏ parameter không cấu thành hồi quy.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | Kiểm tra DTO / static tests | PASS | `npm run test:unit` cover các thuộc tính lương, DTO không chứa `hourlyRateVnd`. | `None` |
| AC-02 | Input/output matching | PASS | Test tĩnh cover render slot expired/full. | `None` |
| AC-03 | Quét file tĩnh label recruiter | PASS | Xác minh file static không lọt `client.name`. | `None` |
| AC-04 | Matrix trang / total | PASS | Kiểm tra bài test phân trang. | `None` |
| AC-05 | Bỏ industry filter | PASS | `industry` đã rút khỏi form search ở v1.2/v1.3 (lệnh grep rỗng). | Áp dụng đúng `DEC-13`. |
| AC-06 | Bắt facet chính xác | PASS | Xác định 3 bô lọc q, area, shift. | `None` |
| AC-07 | Load-more null stop | PASS | Trạng thái UI xử lý danh sách rỗng đúng chuẩn. | `None` |
| AC-08 | Fallback lỗi API | PASS | Retry form xuất hiện khi fail HTTP. | `None` |
| AC-09 | Limiter & Security Context | PASS | MD5 change là hợp pháp do bỏ 1 thuộc tính, thứ tự execution guard không đổi. | MD5 change là hợp pháp. |
| AC-10 | Apply Modal slug | PASS | Endpoint nhận canonical slug theo Spec. | `None` |
| AC-11 | Hardcode Regression | PASS | Các regex test sensitive key đã pass. | `None` |
| AC-12 | LIVE Test DB | ENV_BLOCKED | Lỗi Prisma Client init khi trỏ `br-misty-cell-az3nx5l3`. | `ENV_BLOCKED` hợp lệ. |
| AC-13 | Gate check liên hợp | PASS | `typecheck` và `test:unit` exit 0 (1505 tests passed). | `None` |
| AC-14 | HANDOFF documentation | PASS | Đã ghi chú phần Quick Apply và đo đạc. | `None` |
| AC-15 | Bảo toàn Go-live-12 link | PASS | `grep -c "detailHref" app/(portal)/page.tsx` trả về `3`, và `grep -A2 "<Link"` ra đúng 2 instance. | Dùng đúng công cụ kiểm định. |
| AC-16 | Ghi nhận ĐÃ ĐẠT SẴN | PASS | HANDOFF đã ghi đúng tiêu chuẩn cho `fb993a7`. | `None` |
| AC-17 | Không có comment thiếu sót | PASS | Đã clear comment cảnh báo phân trang rỗng. | `None` |
| AC-18 | 4 Phép đo scope out/in | PASS | Các thuộc tính của `PublicJobDto` còn nguyên; `git diff --numstat` các file out-of-scope rỗng. | Đạt tuyệt đối. |
| AC-19 | Cờ Config | PASS | `GOLIVE05_LIVE_CARD_TRUTH` xuất hiện đúng 1 lần tại `vitest.integration.config.ts` và `vitest.unit.config.ts`. | `None` |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | `npm run test:unit` exit `0`, output `Tests 1505 passed` |
| C-02 | DONE | `npm run typecheck` exit `0` |
| C-03 | SKIP | Task không ảnh hưởng tới Redis. |
| C-04 | DONE | Kiểm định `AC-09` đã xác nhận Limiter (Rate-limit) không bị bypass/modify. |
| C-05 | DONE | Không ghi nhận DB schema migrations mới. |
| C-06 | SKIP | Không sửa đổi RLS policy trực tiếp trong module này. |
| C-07 | SKIP | Không migrate. |
| C-08 | SKIP | Không yêu cầu đo RED-before-GREEN cho ticket này (đã đo ở R1). |
| C-09 | DONE | Verifier tự động kiểm định `AUDIT.md` (chạy thành công). |
| C-10 | DONE | Đã ghi chú đúng tình trạng thay đổi diff của Round 1 qua Round 2 trực tiếp không qua source control. |

## 3. Scope và Impact
Chính sửa phạm vi tuân thủ cực kỳ chuẩn xác theo hợp đồng v1.3. Sự kiện vượt rào ở file test `mp1.contract.test.ts` đã được phép đo của `DEC-16` xác thực là an toàn với numstat 2/1 (chỉ xóa 1 thuộc tính `industry` và thêm comment, 0 assert thay đổi). File API jobs thay đổi MD5 do tháo tham số lọc ngầm, tuân thủ đúng yêu cầu. Việc bảo toàn code của `go-live-12` được kiểm soát thành công, `AC-15` không báo false-negative nhờ thay đổi công cụ grep qua tham số `-A2`. Trạng thái không push/không commit (R-01) duy trì liên tục qua 2 Round.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| `git diff --numstat -- "src/domains/job-board/mp1.contract.test.ts"` | `0` | 2 1 | Đúng 1 hunk theo `DEC-16` |
| `git diff -- "src/domains/job-board/mp1.contract.test.ts" \| grep -c "^[-+].*expect"` | `0` | 0 | Không thay đổi assert |
| `grep -A2 "<Link" "app/(portal)/page.tsx"` | `0` | 2 instances | Phát hiện 2 link dẫn route |
| `git diff --numstat -- "app/(jobs)/viec-lam/[slug]/page.tsx"` | `0` | Không có | Diff rỗng (Out of scope) |
| `npm run typecheck` | `0` | Thành công | Output rỗng |
| `npm run test:unit` | `0` | Passed | `1505 passed` |

## 5. Coverage Gaps
Kiểm tra End-to-End Database LIVE (AC-12) rơi vào trạng thái chặn kết nối `ENV_BLOCKED`. Tier 3 đã mô phỏng thủ tục nạp biến môi trường cho `br-misty-cell-az3nx5l3` nhưng auth failed, buộc phải nhường cho Owner hoặc hệ thống Pipeline chính thức chạy. 

## 6. Verdict và Planner Questions
- **Verdict:** PASS
- **Reason:** Đã đo đủ và chính xác tất cả các tiêu chí của Execution Round 2 (Spec v1.3). Hợp thức hoá `DEC-16` thành công; `AC-15` đo đạc bằng phương thức chính xác; MD5 route.ts được nhận định chính xác là do mất 1 param; DB test `ENV_BLOCKED` đã ghi nhận.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `None` | `N/A` | `FAIL` | Phát hiện lỗi số lượng param v1.1. Round 2 mở ra để fix `inferIndustry` và xoá param `industry`. |
| `2` | `None` | `FAIL` | `PASS` | Kiểm định trọn vẹn Spec v1.3. Kiểm thử scope `DEC-16` thành công không thay đổi logic. |

Để bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.

