# Quy tắc Chung Toàn Hệ Thống

Áp dụng cho Tier 0, Tier 1 và Tier 3. Policy đặc thù của dự án đặt trong tài liệu dự án mà TASK dẫn trực tiếp.

## 1. Ngôn ngữ

- Tên biến, hàm, class, schema và API contract: tiếng Anh.
- Tài liệu pipeline và giải trình: tiếng Việt rõ ràng; giữ nguyên thuật ngữ kỹ thuật cần thiết.
- Comment/docstring: theo convention hiện hữu của repo; không trộn ngôn ngữ tùy tiện trong cùng module.

## 2. Evidence và chống ảo giác

- Mọi khẳng định “đã chạy”, “đã pass”, “đã sửa” phải có command/output hoặc bằng chứng tương ứng.
- Không bịa file, symbol, dependency, test result, performance number hoặc CodeGraph output.
- Khi tool không khả dụng, ghi limitation và dùng công cụ read-only tương đương nếu có; không tuyên bố đã dùng tool.
- Phân biệt rõ kết quả quan sát được, suy luận và đề xuất.

## 3. Bảo mật và dữ liệu

- Không hardcode secret, token, password hoặc production credential.
- Không đưa PII thật vào fixture, screenshot, log hoặc tài liệu demo.
- Không log token, password, giấy tờ định danh hoặc payload nhạy cảm.
- Không bỏ qua authorization/data scope chỉ vì authentication đã tồn tại.
- Không swallow error bằng catch rỗng hoặc `except: pass`.

## 4. Tiêu chuẩn theo tech stack

Agent phải đọc manifest/config của repo trước khi chọn tool:

- JavaScript/TypeScript: dùng script trong `package.json`, TypeScript config, ESLint/formatter và test framework hiện hữu.
- Prisma/PostgreSQL: kiểm tra schema validation, migration status, generated client compatibility và transaction/data integrity khi áp dụng.
- Python: chỉ dùng Black/Ruff/isort/pytest nếu repo thực sự cấu hình các tool này.
- Stack khác: tuân theo toolchain đã được khai báo trong repo và TASK contract.

Không tự cài tool/dependency chỉ để thỏa checklist nếu Tier 1 chưa xác định là cần cho delivery.

## 5. Git và worktree

- Luôn kiểm tra worktree trước khi sửa hoặc audit.
- Không revert, overwrite hoặc đưa thay đổi ngoài task vào phạm vi bàn giao.
- Không commit/push/merge nếu sếp hoặc TASK contract không yêu cầu rõ.
- Nếu được yêu cầu commit, tuân thủ convention hiện hữu của repo; không áp đặt convention mới ngoài task.

## 6. Windows và file format

- Dùng đường dẫn/lệnh tương thích PowerShell khi chạy trên Windows.
- Giữ encoding và line ending hiện hữu của file; không tạo churn toàn file chỉ vì CRLF/LF hoặc BOM.
- Không giả định đường dẫn Linux tồn tại.

## 7. Phân tách trách nhiệm

- Tầng 0 không code, không lập TASK/plan chi tiết và không audit thường nhật.
- Tầng 1 sở hữu cả plan và implementation, nhưng không tự phát hành verdict Tier 3.
- Tầng 3 không sửa source và không ra quyết định thay Planner.
- Tầng 1 nghiệm thu task; Tier 0/Owner quyết định release, go-live và chấp nhận rủi ro cấp dự án.
- `.ai-pipeline/` là portable kit dùng chung nhiều repository: không đưa tên sản phẩm, roadmap, phase hoặc prompt của một dự án cụ thể vào đây; đặt chúng trong tài liệu dự án và dẫn từ TASK/quyết sách.

## 8. Bảo đảm theo rủi ro

- `FAST`, `STANDARD`, `CRITICAL` điều chỉnh độ chặt contract/gate. Audit là quyết định độc lập `NONE | LIGHT` ghi trong TASK.
- Task cũ không khai lane mặc định `CRITICAL`; không tự động hạ chuẩn lịch sử.
- Có thể nâng lane khi phát hiện blast radius mới; chỉ Tier 1/Owner được đổi lane.
- Không chạy lại phép đo còn hiệu lực chỉ để đủ checklist. Audit dùng carry-forward khi có source evidence và impact proof.
- Tier 1 được điều phối sub-agent song song trong boundary đã giao. Mutating agents chỉ song song khi allowlist không giao nhau; một coordinator quản lý integration và Git index.
