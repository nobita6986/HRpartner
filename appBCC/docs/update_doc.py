import re
import codecs
import os

path = r'C:\CodeApp\HrP\appBCC\docs\SYNC_ETL_TO_NEON_REQUIREMENTS.md'
with codecs.open(path, 'r', 'utf-8') as f:
    content = f.read()

# 1. Update list of 8 tables to 6 tables
content = re.sub(r'Cần tạo \*\*8 bảng\*\* theo `SYNC_ORDER`: `workers`, `vendors`, `project_assignments`, `source_claims`, `vendor_aliases`, `timesheet_periods`, `timesheet_lines`, `manual_allowances`\.',
                 r'🚨 **CRITICAL UPDATE:** Prisma Schema V4 KHÔNG CÓ bảng `vendor_aliases` và `manual_allowances`. Bạn chỉ được phép sync **6 bảng**: `workers`, `vendors`, `project_assignments`, `source_claims`, `timesheet_periods`, `timesheet_lines`. Phụ cấp thủ công (`manual_allowances`) phải được map vào cột JSON `allowance` của bảng `timesheet_lines`.', content)

content = re.sub(r'đủ 8 bảng V4 \(workers, vendors, project_assignments, source_claims, vendor_aliases, timesheet_periods, timesheet_lines, manual_allowances\)',
                 r'đủ 6 bảng V4 (đã bỏ vendor_aliases, manual_allowances)', content)

# 2. Fix generate_user_id logic to not return None
old_code = '''def generate_user_id(cccd: str) -> str:
    if not cccd:
        return None  # worker chưa có CCCD sẽ không có user_id
    hash_int = int(hashlib.sha256(cccd.encode()).hexdigest()[:8], 16)
    return f"USR-{hash_int % 1000000:06d}"'''

new_code = '''def generate_user_id(cccd: str, phone: str = None) -> str:
    if not cccd:
        # 🚨 Prisma schema V4 định nghĩa userId là NOT NULL (@unique)
        # Bắt buộc phải có fallback nếu không Postgres sẽ reject
        fallback = phone if phone else str(uuid.uuid4())
        hash_int = int(hashlib.sha256(fallback.encode()).hexdigest()[:8], 16)
        return f"USR-PH-{hash_int % 100000:05d}"
    hash_int = int(hashlib.sha256(cccd.encode()).hexdigest()[:8], 16)
    return f"USR-{hash_int % 1000000:06d}"'''
content = content.replace(old_code, new_code)

old_code_2 = '''def generate_user_id(cccd: str) -> str:
    hash_int = int(hashlib.sha256(cccd.encode()).hexdigest()[:8], 16)
    return f"USR-{hash_int % 1000000:06d}"'''
content = content.replace(old_code_2, new_code)

# 3. Add Pull-down section
pull_down_text = '''### 2.6 ❌ Xung đột Unique ID khi thiếu Pull-Down (Bidirectional Data)
**Hiện trạng:**
- Kế hoạch hiện tại không làm Bidirectional sync (chỉ đẩy từ SQLite -> Neon).
- Nếu Web Admin (SOT) tạo 1 worker trên Neon (Prisma tự sinh UUID 1).
- Nếu ETL tải Excel về, đọc thấy worker đó (match bằng số điện thoại, không có CCCD) -> ETL tự sinh UUID 2 ở local.
- Khi đẩy lên, Neon sẽ reject vì UUID khác nhau nhưng đụng độ `phone` UNIQUE constraint.

**Nguy cơ:**
- Hỏng toàn bộ quá trình sync. Local ETL sinh rác.

**Required:**
- [ ] Bắt buộc phải có bước **PRE-SYNC (Pull-down)** cho nhóm bảng Web SOT (`workers`, `vendors`).
- [ ] SQLite local phải kéo các records mới nhất từ Neon về trước khi chạy ETL xử lý.

---

'''
content = content.replace('### 2.5 ❌', pull_down_text + '### 2.5 ❌')

# 4. Update Hybrid SOT
content = content.replace('Đọc & Ghi', 'Đọc & Ghi (BẮT BUỘC PULL-DOWN TRƯỚC ETL)')
content = content.replace('manual_allowances, ', '')

# 5. Add Web Portal fixes at the end
web_portal_fixes = '''## 11. YÊU CẦU NÂNG CẤP PLAN V4 CHO APP BCC (WEB PORTAL)

Quá trình phân tích `app/bcc/actions.ts` phát hiện 2 lỗ hổng nghiêm trọng ở phía Web (Next.js) và Prisma Schema, cần nâng cấp ngay:

### 11.1 🚨 Lỗi cộng dồn Khấu trừ vĩnh viễn
**Vấn đề:** Bảng `WorkerDeduction` trong `schema.prisma` hiện KHÔNG CÓ cột lưu kỳ lương (`periodMonth`, `periodYear`). Trong khi đó, `app/bcc/actions.ts` đang fetch bằng `where: { workerId, status: 'APPLIED' }`. Hậu quả: Khấu trừ của tháng 1 sẽ tiếp tục bị trừ vào lương tháng 2, tháng 3... mãi mãi.
**Required Fix:**
- Thêm `periodMonth Int?` và `periodYear Int?` vào model `WorkerDeduction` trong `prisma/schema.prisma`.
- Cập nhật truy vấn trong `app/bcc/actions.ts` để filter theo tháng năm của kỳ lương đang xem.

### 11.2 ⚠️ Lỗi tính lương khối Văn phòng (MONTHLY)
**Vấn đề:** Thiết kế V4.9 hỗ trợ khối văn phòng với `salaryType = 'MONTHLY'` và lưu số tiền ở `salaryMonthVnd`. Tuy nhiên, `app/bcc/actions.ts` (dòng 176) đang hardcode tính lương dựa trên `salaryPerDayVnd`. Khối văn phòng sẽ bị hiển thị lương = 0.
**Required Fix:**
- Sửa logic trong `actions.ts`: Kiểm tra `assignment.salaryType`. Nếu là `MONTHLY`, tính `hourlyRate` bằng cách chia `salaryMonthVnd` cho số ngày công chuẩn của tháng (hoặc dùng 1 tham số cấu hình chung).

---

'''
content = content.replace('## 10. TÓM TẮT THAY ĐỔI', web_portal_fixes + '## 10. TÓM TẮT THAY ĐỔI')

with codecs.open(path, 'w', 'utf-8') as f:
    f.write(content)

print("Markdown updated successfully.")
