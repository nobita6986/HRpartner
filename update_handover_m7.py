import re

def update_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        content = content.replace(
            'M4 ACCEPTED, M5 ACCEPTED, M6 ACCEPTED',
            'M5 ACCEPTED, M6 ACCEPTED, M7 READY'
        )
        content = content.replace(
            '-> M6 (Payroll & Tickets) ✅ [ACCEPTED]',
            '-> M6 (Payroll & Tickets) ✅ [ACCEPTED]\n-> M7 (Admin Expansion) ⏳ [READY_FOR_EXECUTION]'
        )
        
        content = content.replace(
            '**M6 - Payroll & Tickets (hrp-portal-m6-payroll-tickets):**\n- **Trạng thái:** Đã đóng (ACCEPTED). Hoàn thiện Admin Panel.\n- **Chờ sếp:** Tiến vào P2 (Commission).',
            '**M6 - Payroll & Tickets (hrp-portal-m6-payroll-tickets):**\n- **Trạng thái:** Đã đóng (ACCEPTED).\n\n**M7 - Admin Expansion (hrp-portal-m7-admin-expansion):**\n- **Nguồn gốc:** Sếp yêu cầu khảo sát, phát hiện Admin thiếu CRUD form và thiếu trang vendors, users, settings.\n- **Tiến độ:** Planner đã tạo hợp đồng (READY_FOR_EXECUTION), yêu cầu bổ sung toàn bộ form và page bị thiếu.\n- **Chờ sếp:** Gọi lệnh /code hrp-portal-m7-admin-expansion.'
        )

        content = content.replace(
            '3. Tiến vào P2 Commission (Hoa hồng).',
            '3. **Sếp gõ lệnh /code hrp-portal-m7-admin-expansion** để Tier 2 bắt đầu thực thi bổ sung CRUD cho Admin.\n4. Tier 3 kiểm định và Planner /resolve M7.\n5. Sau đó mới tiến vào P3 Payroll Engine.'
        )

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {filepath}')
    except Exception as e:
        print(f'Error updating {filepath}: {e}')

update_file('docs/PLANNER_HANDOVER.md')

