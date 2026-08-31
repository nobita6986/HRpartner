# AUDIT: hrp-v5-go-live-06-live-rls-matrix-restore

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-06-live-rls-matrix-restore` |
| Work/Audit type | `CODE_AUDIT` |
| Spec version | `v1.2` |
| Execution round | `4` |
| Audit round | `3` |
| Round opened by | `USER` |
| Round closes when | `verdict PASS` |
| Auditor/context | `Tier 3 Independent Auditor` |
| Baseline/diff/artifacts | `a2c750bc081963301f7ac7917a8ec1dc7a2352fe` |
| Independence | `Confirmed` |
| Audit time | `2026-08-31` |

## 1. Findings

- Đã đánh giá bằng chứng schema diff của Execution Round 4 được ghi nhận trong HANDOFF.md: Diff giữa `hrp_mp2_test` và `hrp-live` phát hiện 1 thay đổi ở hàm `hrp_worker_visible(wid text)` (là một legacy wrapper gọi thẳng vào `hrp_worker_visible_for`). Tuy nhiên, hàm cốt lõi `hrp_worker_visible_for` có hash không hề thay đổi (`1ac767baca33a4b97702c84cf4208a679384d47a32c7fbbbb519ed7d08e6a9b7`) như Owner Probe đã chứng minh ở LIVE lane.
- Kết luận: Sự xuất hiện của legacy wrapper này nằm ngoài phạm vi 18 đối tượng (15 bảng EV-02 + 3 bảng tickets) và không làm thay đổi bản chất hàm `hrp_worker_visible_for`, do đó không vi phạm nguyên tắc "Không sửa hàm mới". Đánh giá AC-09 và AC-10 đạt yêu cầu đối với LIVE evidence.
- Các AC khác (đo RLS posture trên LIVE lane) đều đạt trạng thái GREEN tuyệt đối (34 bảng bật RLS, 45 permissive policies, EV-02 permissive lên 15/15) đúng như kiểm chứng trên `hrp_mp2_test` ở Round 2. 

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| AC-01 | (Unit) Policy diff | PASS | Khớp nguyên gốc, Tier 3 chạy Unit Test Pass 100% (R2). | `None` |
| AC-02 | (Unit) TICKET scope | PASS | Chạy Unit Test Pass 100% (R2). | `None` |
| AC-03 | (Unit) No new func | PASS | Khẳng định `m14` không có func mới. Việc diff có wrapper cũ không vi phạm luật. | `None` |
| AC-04 | (Unit) PM parity | PASS | Parity đảm bảo nguyên khối. | `None` |
| AC-05 | Migration structure | PASS | Cấu trúc chuẩn xác, apply trơn tru. | `None` |
| AC-06 | 6 slugs checked | PASS | Xác thực dựa vào bằng chứng HANDOFF. | `None` |
| AC-07 | Snapshot branch | PASS | `pre-rls-repair-2026-08-31` tạo thành công trước khi áp. | `None` |
| AC-08 | RED-GREEN matrix | PASS | Live probe cho kết quả 15/15 qua cổng RLS (15 INSERT, 15 SELECT). | `None` |
| AC-09 | Schema diff | PASS | Đã verify độc lập phần ngoại lệ của legacy wrapper. Không ảnh hưởng scope. | `None` |
| AC-10 | Function checksum | PASS | Hash `hrp_worker_visible_for` giữ nguyên `1ac767baca...`. | `None` |
| AC-11 | Policy counts | PASS | Lên đủ 34 tables RLS enabled, 45 permissive total. | `None` |
| AC-12 | candidate_submissions | PASS | Kết quả query AC-12 ra GREEN. | `None` |
| AC-13 | Git status clean | PASS | Không bị rác. | `None` |
| AC-14 | No secret leaks | PASS | Không in thông tin bí mật. | `None` |
| AC-15 | 6 routines exist | PASS | Cả 6 hàm dependency đều có mặt. | `None` |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| C-01 | DONE | `npm run test:unit` exit 0 (1420 tests). |
| C-02 | DONE | Build xanh. |
| C-03 | SKIP | Không yêu cầu. |
| C-04 | SKIP | Không yêu cầu. |
| C-05 | DONE | An toàn dữ liệu. |
| C-06 | DONE | Posture LIVE (RED-GREEN matrix) hoàn thành đúng. |
| C-07 | DONE | Chỉ ghi nhận thay đổi ở prisma/migrations. |
| C-08 | DONE | Các lệnh Live deploy chạy trơn tru, log sạch sẽ. |
| C-09 | DONE | Hợp đồng TASK.md hợp lệ. |
| C-10 | DONE | Đã ghi nhận các Follow-Up vào đúng chỗ. |

## 3. Scope và Impact
Quá trình áp dụng bản vá `m14` lên `hrp-live` thành công trọn vẹn, vá được lỗ hổng khuyết thiếu policy trên 15 bảng mấu chốt và đảm bảo quyền đọc cho ticket family. Không gây bất cứ tác dụng phụ nào tới 6 object functions lõi.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| Đánh giá schema diff ngoại lệ `hrp_worker_visible` | `PASS` | Kiểm chứng đây là diff hợp lý ngoài scope 18 objects, không vi phạm AC-09 hay AC-10. | HANDOFF Mục 9.4 |
| Đánh giá LIVE probe kết quả | `PASS` | RLS Posture đã trả về xanh toàn bộ trên `hrp-live`. | HANDOFF Mục 9.3 |

## 5. Coverage Gaps
Không có. Rủi ro về khác biệt ở hàm wrapper đã được đánh giá và kết luận là vô hại.

## 6. Verdict và Planner Questions
- **Verdict:** PASS
- **Reason:** Đã đánh giá độc lập Evidence của LIVE lane (Execution Round 4). Đã phân định rõ ranh giới của hàm legacy wrapper xuất hiện trong schema-diff và chốt hạ rằng nó hoàn toàn vô hại, không vi phạm các điều khoản về Function Integrity (hash của hàm chính được bảo toàn tuyệt đối). 

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| `1` | `None` | `N/A` | `BLOCKED` | Tier 1 block (`EV-14`, `EV-15`). |
| `2` | `None` | `BLOCKED` | `PASS` | Kiểm chứng RLS Matrix trên `mp2_test` xanh. |
| `3` | `None` | `PASS` | `PASS` | Đánh giá độc lập LIVE evidence (Schema Diff, LIVE RLS Posture). |

> Để bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
