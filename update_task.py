import re

with open('docs/tasks/hrp-portal-m4-ui-fixes/TASK.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Add RQ-06
content = content.replace(
'''| RQ-04 | Cập nhật nội dung route /ve-chung-toi bằng JSX từ file index.html (thư mục gốc). | Must | EV-03 | Trang cũ / Lỗi 404. |
| RQ-05 | Pass toàn bộ test suite hiện có. | Must | Baseline | CI fail. |''',
'''| RQ-04 | Cập nhật nội dung route /ve-chung-toi bằng JSX từ file index.html (thư mục gốc). | Must | EV-03 | Trang cũ / Lỗi 404. |
| RQ-05 | Thay thế các logo chữ HRP trên web (ở Header, Footer, v.v...) bằng hình ảnh từ file logo.png (sử dụng thẻ img src="/logo.png"). Cần điều chỉnh CSS/Kích thước cho phù hợp layout. | Must | Sếp giao | Vẫn hiện logo chữ. |
| RQ-06 | Pass toàn bộ test suite hiện có. | Must | Baseline | CI fail. |'''
)

# Update Step
content = content.replace(
'''| STEP-04 | RQ-04 | pp/(portal)/ve-chung-toi/page.tsx | Chuyển đổi mã HTML từ root index.html sang dạng React Component và render tại route này. | N/A | Check /ve-chung-toi | Vỡ layout trang |
| STEP-05 | RQ-05 | Toàn bộ | Chạy itest. | STEP-04 | Exit 0 | Lỗi test |''',
'''| STEP-04 | RQ-04 | pp/(portal)/ve-chung-toi/page.tsx | Chuyển đổi mã HTML từ root index.html sang dạng React Component và render tại route này. | N/A | Check /ve-chung-toi | Vỡ layout trang |
| STEP-05 | RQ-05 | GlobalNavbar.tsx, GlobalFooter.tsx | Thay component logo dạng text thành thẻ Image hoặc img trỏ đến /logo.png. Căn chỉnh kích thước (ví dụ: height 40px) để không làm vỡ Header. | N/A | Check logo | Logo quá to/nhỏ |
| STEP-06 | RQ-06 | Toàn bộ | Chạy itest. | STEP-05 | Exit 0 | Lỗi test |'''
)

# Update Traceability
content = content.replace(
'''| RQ-04 | STEP-04 | AC-01 |
| RQ-05 | STEP-05 | AC-02 |''',
'''| RQ-04 | STEP-04 | AC-01 |
| RQ-05 | STEP-05 | AC-01 |
| RQ-06 | STEP-06 | AC-02 |'''
)

# Fix AC-02
content = content.replace(
'''| AC-02 | RQ-05 | itest báo pass. | Lệnh test | Exit 0 | Yes |''',
'''| AC-02 | RQ-06 | itest báo pass. | Lệnh test | Exit 0 | Yes |'''
)

with open('docs/tasks/hrp-portal-m4-ui-fixes/TASK.md', 'w', encoding='utf-8') as f:
    f.write(content)
