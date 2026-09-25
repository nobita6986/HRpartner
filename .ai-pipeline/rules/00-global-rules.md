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

### 4.1 Library-first / BUILD_VS_ADOPT

- Với capability kỹ thuật phổ thông (editor, form, table, upload UI, date/time, chart, queue, email renderer, document export, accessibility primitive), ưu tiên đánh giá thư viện trưởng thành trước khi tự xây.
- Không copy source ngẫu nhiên từ repository bên ngoài. Candidate phải có nguồn chính thức, license tương thích, maintenance/security posture có thể kiểm tra và tương thích với runtime/framework của repo.
- `ADOPT`: pin package/version qua manifest + lockfile, bọc bằng component/adapter do repo sở hữu và thêm contract/regression test tại boundary đó; không để import vendor lan khắp domain.
- `CUSTOM`: chỉ dùng khi không có candidate phù hợp hoặc wrapper còn rủi ro/chi phí hơn; TASK phải ghi `CUSTOM_BUILD_JUSTIFICATION` bằng evidence cụ thể.
- Thư viện không bao giờ là authority cho authorization, domain transition, idempotency, audit, data ownership hoặc policy sản phẩm.
- Package/version cụ thể thuộc TASK và lockfile, không đóng cứng trong pipeline portable hoặc roadmap dài hạn.

### 4.2 Orchestration-first / BUILD_VS_AUTOMATE

- Với connector, scheduler, notification, retry/fan-out, approval wait-loop hoặc multi-system workflow, phải đánh giá orchestration platform trước khi tự viết worker/framework.
- `ORCHESTRATE`: platform chỉ điều phối versioned event/API, có scoped credential, bounded retry, idempotency, safe logging, recovery và reviewable promotion path.
- `CUSTOM`: chỉ khi có `CUSTOM_AUTOMATION_JUSTIFICATION` bằng evidence về transaction locality, latency/throughput, compatibility, security hoặc operational cost.
- Automation platform không được nắm auth/RLS, domain transition, mutation idempotency authority, durable audit, money calculation, PII/evidence custody hoặc direct domain-storage writes.
- Vendor/platform cụ thể, data residency và production policy thuộc tài liệu dự án/TASK; pipeline portable chỉ giữ decision gate.

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

## 9. Delivery protocol V2_FAST_FREEZE

- Artifact V2 phải qua `READY_TO_CODE` trước implementation và pin exact baseline.
- Task chỉ được giao audit sau khi implementation đã commit, canonical gates hoàn tất và HANDOFF pin exact frozen SHA.
- Tier 0/Tier 3 phải gom finding thành một lượt review đầy đủ; không gửi micro-correction nhỏ giọt.
- Sau audit chỉ có một consolidated correction batch. Vượt budget phải chuyển Tier 0 hoặc tách task mới.
- DELTA audit không mở lại unchanged surface nếu không có evidence mới.
- P3 và documentation drift mặc định là non-blocking debt; muốn chặn phải được Tier 0 nâng mức bằng quyết định có lý do.
- WIP mặc định trên một delivery stream: tối đa một contract planning, một implementation và một frozen audit. Các stream chỉ chạy song song khi file ownership không giao nhau.
