import re

with open('docs/tasks/hrp-portal-m4-ui-fixes/TASK.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Change status to REJECTED
content = re.sub(
    r'\| Status \| READY_FOR_EXECUTION \|',
    '| Status | REJECTED |',
    content
)

# Update Next gate
content = re.sub(
    r'\| Next gate \| /code hrp-portal-m4-ui-fixes \|',
    '| Next gate | /code hrp-portal-m4-ui-fixes (Sửa lại logo Admin) |',
    content
)

# Add Planner Resolution
content = re.sub(
    r'\| - \| - \| - \| - \| - \| - \|',
    '| 1 | AUD-001 | REJECT | Mặc dù Tier 3 đã tự sửa logo trên Navbar/Footer Public, nhưng trong Admin Panel (src/shared/ui/role-guard/role-guard-layout.tsx) vẫn còn sót logo chữ "H". Yêu cầu Tier 2 làm triệt để. | Cập nhật RQ-05 để rõ ràng hơn. | Tier 1 |',
    content
)

# Update RQ-05 to be explicit about Admin
content = content.replace(
    'Thay thế các logo chữ HRP trên web (ở Header, Footer, v.v...) bằng hình ảnh từ file logo.png',
    'Thay thế các logo chữ HRP trên web (ở Header, Footer Public và cả SidebarHeader trong Admin Panel src/shared/ui/role-guard/role-guard-layout.tsx) bằng hình ảnh từ file logo.png'
)

# Update Revision Log
content = content.replace(
    '| 1.0 | 2026-08-20 | Tạo task hrp-portal-m4-ui-fixes. | Sếp yêu cầu fix gấp các lỗi UI và đổi nội dung trang Về chúng tôi. |',
    '| 1.0 | 2026-08-20 | Tạo task hrp-portal-m4-ui-fixes. | Sếp yêu cầu fix gấp các lỗi UI và đổi nội dung trang Về chúng tôi. |\n| 1.1 | 2026-08-20 | Cập nhật trạng thái REJECTED. | Tier 2 và 3 bỏ sót logo trong Admin Panel. Yêu cầu làm lại. |'
)

with open('docs/tasks/hrp-portal-m4-ui-fixes/TASK.md', 'w', encoding='utf-8') as f:
    f.write(content)
