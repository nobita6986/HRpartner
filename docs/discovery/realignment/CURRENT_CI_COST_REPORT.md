# CURRENT CI COST REPORT

Dựa trên nguyên tắc quy định tại §51 của `HRP_EXECUTION_REALIGNMENT_PLAN.md`, sau đây là báo cáo về chi phí và cấu trúc CI pipeline hiện tại.

## 1. Cấu trúc Workflow & Trigger
- **Workflow:** `.github/workflows/ci.yml` gồm 2 luồng chính chạy song song:
  1. `Quality`: Kiểm tra tĩnh và logic (`schema validate`, `typecheck`, `lint`, `test:unit`, `next build`).
  2. `Integration`: Kiểm tra với DB thật (ephemeral PostgreSQL service container), cấp RLS role và chạy `test:integration`.
- **Trigger:** Kích hoạt trên mọi `pull_request` và `push` vào `main`.
- **Path Filter (Short-circuit):** Job Integration có bước lọc `path-filter` sẽ tự động SKIP (báo thành công ngay) nếu thay đổi chỉ giới hạn trong `docs/*`, `*.md`, `scratch/*`, v.v. Điều này giúp giảm lãng phí tài nguyên CI cho các PR tài liệu.

## 2. Thời lượng và Chi phí (Cost)
Từ log của hệ thống (lần chạy gần nhất cho luồng W5 handling assignment UI PR #21):
- **Job Integration:** Hoàn thành trong **47s** (Rất nhanh nhờ ephemeral docker `postgres:16-alpine` trên máy ảo GitHub thay vì chờ kết nối DB Neon ở xa).
- **Job Quality:** Hoàn thành trong **2m 12s**.
- Cả hai job chạy song song, tổng thời gian chờ (Wall time) chỉ mất khoảng **~2.5 phút** cho một lần kiểm tra toàn diện. Đây là một con số rất tối ưu.

## 3. Các điểm tối ưu & Trùng lặp
- **Bước trùng lặp:** Cả 2 job đều chạy `npm ci` và `prisma generate`. Tuy nhiên do tính chất container độc lập của GitHub Actions, đây là sự trùng lặp bắt buộc (by design) để luồng chạy song song.
- **Bước đắt nhưng ít giá trị trong một số trường hợp:** Lệnh `next build` luôn được chạy trong luồng Quality. Với các PR thuần API hoặc thay đổi Service layer, việc build toàn bộ app Next.js có thể là dư thừa, nhưng hiện tại với thời gian 2m12s thì chưa phải là cổ chai đáng lo ngại.

## 4. Các bước bắt buộc (Không được cắt bỏ)
- **RLS/Database Boundary:** Job Integration hiện cấp quyền RLS (8 role, bao gồm `app_user_writer`) rồi chạy `prisma migrate deploy` và `test:integration`. Đây là **chốt chặn duy nhất** (Gate) để phát hiện các lỗi bảo mật RLS (như lỗi `42501` của AFF-03) trước khi merge.
- Việc hạ cấp xuống chỉ mock test (unit test) không thể đảm bảo tính an toàn cho hạ tầng V7/V8. Phải giữ luồng Integration Fail-Closed (không cho phép skip trừ khi 100% đổi docs).

## 5. Đề xuất rút gọn
Hiện tại CI đang tiêu tốn chi phí rất thấp (dưới 3 phút). Không khuyến nghị thay đổi hay rút gọn thêm gì vào thời điểm này để tránh vô ý phá vỡ an toàn RLS/Integration Gates.
