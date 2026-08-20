import re

# 1. Update TASK.md
with open('docs/tasks/hrp-portal-m3-api-integration/TASK.md', 'r', encoding='utf-8') as f:
    task_content = f.read()

task_content = task_content.replace(
'''| Status | READY_FOR_EXECUTION |''',
'''| Status | ACCEPTED |'''
)
task_content = task_content.replace(
'''| Current execution round | 1 |
| Current audit round | 0 |
| Next gate | /code hrp-portal-m3-api-integration |''',
'''| Current execution round | 1 |
| Current audit round | 1 |
| Next gate | Tiến hành M4 - Server-side Filtering & Job Detail |'''
)
task_content = task_content.replace(
'''| Updated | 2026-08-20 11:08 +07:00 |''',
'''| Updated | 2026-08-20 12:05 +07:00 |'''
)
task_content = task_content.replace(
'''| - | - | - | - | - | - |''',
'''| 1 | - | ACCEPT_FIX | Audit PASS 100%. verify-audit.ps1 exit 0. Không có finding mới. | Không | Tier 1 |'''
)
task_content = task_content.replace(
'''| 1.0 | 2026-08-20 | Tạo task hrp-portal-m3-api-integration. | Bắt đầu M3 (Job Search API / Auth Portal). |''',
'''| 1.0 | 2026-08-20 | Tạo task hrp-portal-m3-api-integration. | Bắt đầu M3 (Job Search API / Auth Portal). |
| 1.0 | 2026-08-20 | Đóng task, chuyển trạng thái thành ACCEPTED. | Audit round 1 PASS. Handoff sang M4. |'''
)

with open('docs/tasks/hrp-portal-m3-api-integration/TASK.md', 'w', encoding='utf-8') as f:
    f.write(task_content)

# 2. Update roadmap-portals.html
with open('docs/roadmap-portals.html', 'r', encoding='utf-8') as f:
    rm_content = f.read()

# M3 Metro timeline updates
rm_content = re.sub(
    r'<div class="stop current">\s*<div class="stop-dot">M3<div class="you-are-here">ĐANG LÀM</div></div>\s*<div class="stop-name">Job Search API</div>\s*<div class="stop-week fn">Auth Portal</div>\s*<div class="stop-tag">WIP</div>\s*</div>',
    '<div class="stop done">\n<div class="stop-dot">M3</div>\n<div class="stop-name">Job Search API</div>\n<div class="stop-week fn">Auth Portal</div>\n<div class="stop-tag">DONE</div>\n</div>',
    rm_content
)

# M4 Metro timeline updates
rm_content = re.sub(
    r'<div class="stop pending">\s*<div class="stop-dot">M4</div>\s*<div class="stop-name">Worker App</div>\s*<div class="stop-week fn">Chịu tải cao</div>\s*<div class="stop-tag">TODO</div>\s*</div>',
    '<div class="stop current">\n<div class="stop-dot">M4<div class="you-are-here">ĐANG LÀM</div></div>\n<div class="stop-name">Job Details</div>\n<div class="stop-week fn">Advanced Filtering</div>\n<div class="stop-tag">WIP</div>\n</div>',
    rm_content
)

# M3 Details updates
rm_content = re.sub(
    r'<span class="pd-badge badge-current">M3</span>\s*<span class="pd-title">Tích hợp API Job Search / Auth Portal</span>\s*<span class="pd-tag st-dang">WIP</span>',
    '<span class="pd-badge badge-done">M3</span>\n<span class="pd-title">Tích hợp API Job Search / Auth Portal</span>\n<span class="pd-tag st-xong">DONE</span>',
    rm_content
)

# M4 Details updates
rm_content = re.sub(
    r'<span class="pd-badge badge-idle">M4</span>\s*<span class="pd-title">Worker App & Attendance \(High Concurrency\)</span>\s*<span class="pd-tag st-cho">TODO</span>',
    '<span class="pd-badge badge-current">M4</span>\n<span class="pd-title">Server-side Filtering & Job Detail</span>\n<span class="pd-tag st-dang">WIP</span>',
    rm_content
)

# Adjust progress bar
rm_content = rm_content.replace('<div class="done-part" style="width: 50%;"></div>', '<div class="done-part" style="width: 70%;"></div>')

with open('docs/roadmap-portals.html', 'w', encoding='utf-8') as f:
    f.write(rm_content)

