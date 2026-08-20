import re

with open('docs/roadmap-portals.html', 'r', encoding='utf-8') as f:
    content = f.read()

# M3 Details
content = re.sub(
    r'<span class="pd-badge badge-idle">M3</span>\s*<span class="pd-title">Affiliate / CTV Workspace</span>\s*<span class="pd-tag st-cho">TODO</span>',
    '<span class="pd-badge badge-current">M3</span>\n<span class="pd-title">Tích hợp API Job Search / Auth Portal</span>\n<span class="pd-tag st-dang">WIP</span>',
    content
)

with open('docs/roadmap-portals.html', 'w', encoding='utf-8') as f:
    f.write(content)
