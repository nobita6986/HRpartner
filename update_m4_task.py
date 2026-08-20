import re

def update_file():
    filepath = 'docs/tasks/hrp-portal-m4-ui-fixes/TASK.md'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    res = '| 1 | AUD-001 | REJECT |'
    content = re.sub(r'(\| 1 \| AUD-001 \| REJECT \| .*? \|\n)', r'\g<1>| 2 | AUD-002 | ACCEPT | Tier 2 đã fix dứt điểm logo ở Admin Panel. Build xanh, test pass. | None | Tier 1 |\n', content)
    
    content = content + '\n|  1.1 | 2026-08-20 | Đóng task thành công (ACCEPTED). | Lỗi logo đã được fix hoàn toàn ở R2. |\n'
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

update_file()

