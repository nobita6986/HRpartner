# EVIDENCE STORAGE AUDIT

Dựa trên nguyên tắc quy định tại §50 của `HRP_EXECUTION_REALIGNMENT_PLAN.md`, sau đây là báo cáo khảo sát hiện trạng lưu trữ các tệp/dữ liệu nhạy cảm (như CCCD):

## 1. Vị trí lưu trữ Upload & Media
- **Upload hiện lưu ở đâu?** Hệ thống `src/domains/media/media.service.ts` đang sử dụng Vercel Blob (`@vercel/blob` thông qua `put`) để xử lý các tài nguyên truyền thông (AV4 Media Library).
- **Vercel hiện có nhận evidence không?** Có, các upload qua Media Service (Vercel Blob) đang đi thẳng vào storage do Vercel quản lý. Điều này vi phạm nguyên tắc "VPS Evidence Storage" nếu dùng cho CCCD thật.
- **Có lưu file/base64 trong DB không?** Không. Cấu trúc DB (Prisma Schema) chỉ lưu URL của file. Ví dụ: `cccdImageUrl` trong bảng `LaborProfile` và `Worker`. Các dữ liệu chữ như `cccdNumber` và metadata `cccdChipData` (JSON) được lưu trực tiếp trong Neon Database.
- **CRM/Chatwoot có giữ bản sao không?** Có, tài liệu đính kèm qua Chatwoot hiện đang nằm trên storage riêng của Chatwoot (third-party), chưa đồng bộ về HRP Evidence Storage.

## 2. Thông tin nhạy cảm trong Database
- **CCCD nằm trong DB field?** Có. Các bảng `Worker`, `LaborProfile`, và `CandidateSubmission` đều có chứa các trường: `cccdNumber` và `cccdImageUrl`. `cccdNumber` được dùng làm index mềm để dedup.

## 3. Public Route & Khả năng truy cập
- **Route nào có thể public file?** Các file upload vào Vercel Blob sẽ sinh ra URL, mặc định Vercel Blob có public presigned URL nếu cấu hình `public`. Hệ thống `Media` hiện tại có tính năng `safe-render.ts` nhưng chưa có hàng rào RLS cho chính file vật lý (URL bị rò rỉ có thể truy cập được).
- **File path có persist không?** Có. URL hoặc đường dẫn được lưu cố định (persist) vào cột `cccdImageUrl` (và bảng `Media`).

## 4. Quản trị vòng đời (Lifecycle)
- **Có delete/quarantine không?** `Media` service có hàm xoá, tuy nhiên **chưa có tính năng quarantine** (cách ly) tệp nhạy cảm. Các cột `cccdImageUrl` trên `LaborProfile` chỉ bị ghi đè/xóa mềm chứ chưa gọi hàm xóa vật lý.
- **Có audit access không?** Không. Không có bảng `EvidenceRecord` hay log audit (truy cập, xem, tải) đối với các file ảnh CCCD.
- **Có backup/restore không?** Không. Hiện tại chưa có chính sách hay script backup/restore riêng cho Vercel Blob hay VPS Filesystem (dự kiến).

## Kết luận
Hệ thống xử lý tệp hiện đang phụ thuộc vào Vercel Blob và hoàn toàn thiếu bộ chuyển đổi **Evidence Gateway** cho dữ liệu nhạy cảm (chưa có VPS filesystem). Cần thiết lập Storage Adapter theo chuẩn P0-A trước khi chấp nhận dữ liệu CCCD thật từ người dùng.
