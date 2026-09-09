import re

def update_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        content = content.replace(
            'M4 ACCEPTED, M5 ACCEPTED, M6 READY',
            'M4 ACCEPTED, M5 ACCEPTED, M6 ACCEPTED'
        )
        content = content.replace(
            '-> M6 (Payroll & Tickets) ⏳ [READY_FOR_EXECUTION]',
            '-> M6 (Payroll & Tickets) ✅ [ACCEPTED]'
        )
        
        content = content.replace(
            '**M6 - Payroll & Tickets (hrp-portal-m6-payroll-tickets):**\n- **Nguồn gốc:** Nối tiếp M5, hoàn thiện 2 phân hệ cuối cùng của Admin Panel là Tính lương và Phản ánh.\n- **Tiến độ:** Planner đã tạo hợp đồng (READY_FOR_EXECUTION), yêu cầu xây dựng 2 page /admin/payroll và /admin/tickets dạng CRUD cơ bản.\n- **Chờ sếp:** Gọi lệnh /code hrp-portal-m6-payroll-tickets.',
            '**M6 - Payroll & Tickets (hrp-portal-m6-payroll-tickets):**\n- **Trạng thái:** Đã đóng (ACCEPTED). Hoàn thiện Admin Panel.\n- **Chờ sếp:** Tiến vào P2 (Commission).'
        )

        content = content.replace(
            '3. **Sếp gõ lệnh /code hrp-portal-m6-payroll-tickets** để Tier 2 bắt đầu thực thi phân hệ Tính lương & Phản ánh.\n4. Tier 3 kiểm định và Planner /resolve M6.',
            '3. Tiến vào P2 Commission (Hoa hồng).'
        )

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {filepath}')
    except Exception as e:
        print(f'Error updating {filepath}: {e}')

update_file('docs/PLANNER_HANDOVER.md')

