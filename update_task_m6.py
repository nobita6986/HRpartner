import re

def update_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Update control
        content = content.replace(
            '| Status | READY_FOR_EXECUTION |',
            '| Status | ACCEPTED |'
        )
        content = content.replace(
            '| Current audit round | 0 |',
            '| Current audit round | 1 |'
        )
        content = content.replace(
            '| Next gate | /code hrp-portal-m6-payroll-tickets |',
            '| Next gate | None (Closed) |'
        )

        # Update Resolution
        res_old = '| - | - | - | - | - | - |'
        res_new = '| 1 | N/A | ACCEPT | Tier 3 kiểm định PASS (C-01..C-10 đạt). Không có finding lớn. Build xanh. | None | Tier 1 |'
        content = content.replace(res_old, res_new)

        # Update Revision Log
        content = content.replace(
            '| 1.0 | 2026-08-20 | Tạo task hrp-portal-m6-payroll-tickets. | Khởi tạo phân hệ Payroll và Tickets tiếp nối M5. |',
            '| 1.0 | 2026-08-20 | Tạo task hrp-portal-m6-payroll-tickets. | Khởi tạo phân hệ Payroll và Tickets tiếp nối M5. |\n| 1.0 | 2026-08-20 | Đóng task thành công (ACCEPTED). | Đạt đầy đủ tiêu chí M6. |'
        )

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {filepath}')
    except Exception as e:
        print(f'Error updating {filepath}: {e}')

update_file('docs/tasks/hrp-portal-m6-payroll-tickets/TASK.md')

