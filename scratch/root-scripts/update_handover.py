import re

with open('docs/PLANNER_HANDOVER.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Section 5 and 6 entirely
new_section = """## 5. Lịch sử & trạng thái task (20/08/2026)

### Vị trí lộ trình hiện tại

HRP V4 (Phân hệ Portals - Front-end):
M1 (Design System) ✅ -> M2 (Landing Page) ✅ -> M2.5 (Job Dashboard) ✅ -> M3 (API Integration Jobs/Auth) ✅
-> M4 (UI Fixes - Icon, Logo, NavBar, Scroll) ❌ [REJECTED vòng 1 do sót logo Admin]
-> M5 (Admin Master Data) ⏳ [READY_FOR_EXECUTION]

### 5.1 TRẠNG THÁI CHI TIẾT

**M4 - UI Fixes (hrp-portal-m4-ui-fixes):**
- **Sự cố:** Tier 3 phát hiện Tier 2 quên đổi logo sang logo.png (RQ-05) nên đã tự động sửa chui, nhưng LẠI SÓT khu vực Admin Panel (src/shared/ui/role-guard/role-guard-layout.tsx).
- **Quyết định Planner:** Từ chối nghiệm thu (REJECTED vòng 1) để đảm bảo Tier 2 làm triệt để (Không vi phạm quyền Planner sửa code).
- **Chờ sếp:** Gọi lệnh /code hrp-portal-m4-ui-fixes để Tier 2 tiến hành sửa lại logo Admin.

**M5 - Admin Master Data (hrp-portal-m5-admin-master-data):**
- **Nguồn gốc:** Khảo sát cho thấy Admin Panel hiện tại có Navbar nhưng click vào các trang quản lý nhân sự, dự án, khách hàng đều báo 404.
- **Tiến độ:** Planner đã tạo hợp đồng (READY_FOR_EXECUTION), yêu cầu xây dựng 3 page /admin/workers, /admin/projects, /admin/clients dạng CRUD cơ bản.
- **Chờ sếp:** Gọi lệnh /code hrp-portal-m5-admin-master-data (có thể làm sau M4).

### 5.2 Sự kiện quan trọng vừa giải quyết
- Hệ thống bị mất <body> / Hydration do chèn <head> thủ công vào layout.tsx -> Đã hotfix thành công bằng @import trong globals.css (M4).
- Database trống không gây lỗi đăng nhập (Sai tài khoản 0931699166/Admin123) -> Đã chạy 
px prisma db seed và phục hồi 2 tài khoản từ .env.

---

## 6. Hàng đợi việc tiếp theo (làm theo đúng thứ tự)

1. **Sếp gõ lệnh /code hrp-portal-m4-ui-fixes** để Tier 2 sửa dứt điểm Logo trong Admin Panel (Round 2).
2. Khi Tier 3 kiểm định xong M4, Planner tiến hành /resolve hrp-portal-m4-ui-fixes để đóng task.
3. **Sếp gõ lệnh /code hrp-portal-m5-admin-master-data** để khởi tạo phân hệ Master Data cho Admin.
4. Tương tự, Tier 3 audit và Planner /resolve hrp-portal-m5-admin-master-data.
5. Tiếp tục khảo sát M6 (Tính lương & Phản ánh) hoặc cập nhật roadmap.
6. LUÔN LUÔN cập nhật docs/roadmap-portals.html, public/roadmap-portals.html và file này sau mỗi lần resolve.
"""

start_idx = content.find('## 5. Lịch sử & trạng thái task')
end_idx = content.find('## 7. Vòng lặp vận hành chuẩn của Planner')

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_section + "\n" + content[end_idx:]

# Update the sign-off at the end
content = re.sub(
    r'\*Tài liệu do Tier 1 Planner \(agent tiền nhiệm\) viết ngày .*?\*',
    '*Tài liệu do Tier 1 Planner (Antigravity) viết cập nhật ngày 20/08/2026 ~13:20 ICT — trạng thái chuẩn: M3 ACCEPTED, M4 REJECTED (chờ fix logo), M5 READY. CSDL đã được seed lại.*',
    content
)

with open('docs/PLANNER_HANDOVER.md', 'w', encoding='utf-8') as f:
    f.write(content)

