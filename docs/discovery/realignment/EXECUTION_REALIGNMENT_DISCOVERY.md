# EXECUTION REALIGNMENT DISCOVERY

**Baseline SHA:** `1059f6669482efac5b7956ef25d43996ca59d515`

## 1. Trạng thái các phase P0 (Safety Foundations)
- **P0-A Evidence Gateway:** Chưa code. Chỉ mới có khảo sát tài liệu.
- **P0-B VPS boundary:** Chưa code. Còn dùng Vercel.json, chưa có boundary hạ tầng thật (nginx/compose).
- **P0-C CRM contract:** Chưa code. Mới dừng ở mức tài liệu.
- **P0-D S2S/idempotency/outbox:** Đã code một phần (idempotency nội bộ cho AFF-03) nhưng chưa có S2S contract thực thụ.
- **P0-E CI simplification:** Đã xử lý (CI xanh, loại bỏ các bước thừa cục bộ).

## 2. Trạng thái P1 đến P5
- **P1 Thin Recruitment Slice:** Đang code. Đã hoàn thành một phần public apply (AFF-03), đang fix RLS (AFF-03B). Hạng mục W5 handling assignment đã code xong.
- **P2 Early V8 Experience:** Chưa bắt đầu.
- **P3 Recruiter Growth Slice:** Chưa bắt đầu.
- **P4 Domain-driven Expansion:** Chưa bắt đầu.
- **P5 Evidence-triggered V9:** Chưa bắt đầu.

## 3. Đánh giá Code vs. Tài liệu & Trình tự
- **Đã code:** Các module V6 Admin (W5), UI04, Public apply (AFF-03).
- **Chỉ có tài liệu:** V8, V9, HRP↔CRM contract, Evidence Gateway, VPS boundary.
- **Làm sai thứ tự:** P1 (các feature như AFF-03, W5) đang chạy trước khi P0 an toàn (Evidence Gateway, VPS Boundary, S2S auth) hoàn tất. Việc public tính năng nhận dữ liệu nhạy cảm mà chưa có storage an toàn là rủi ro.

## 4. Dependencies & Next Safe Action
- **Dependency:** P1 phụ thuộc P0-A (Evidence Gateway) và P0-B (VPS Boundary) để lưu CCCD an toàn.
- **Next safe action:** Sau khi AFF-03B fix xong RLS, phải dừng việc mở các feature mới trong P1/V8/V9 và tập trung triển khai P0-A (Evidence Storage Adapter) và P0-B.

## 5. Artifact Liên kết
- [EVIDENCE_STORAGE_AUDIT.md](./EVIDENCE_STORAGE_AUDIT.md)
- [CRM_CONTRACT_GAP_REPORT.md](./CRM_CONTRACT_GAP_REPORT.md)
- [THIN_SLICE_CAPABILITY_MATRIX.md](./THIN_SLICE_CAPABILITY_MATRIX.md)
- [CURRENT_CI_COST_REPORT.md](./CURRENT_CI_COST_REPORT.md)
- [BLOCKER_REGISTER.md](./BLOCKER_REGISTER.md)
