import re

with open('docs/roadmap-portals.html', 'r', encoding='utf-8') as f:
    content = f.read()

# M2 Metro
content = re.sub(
    r'<div class="stop pending">\s*<div class="stop-dot">M2</div>\s*<div class="stop-name">Job Market</div>\s*<div class="stop-week fn">Landing Page</div>\s*<div class="stop-tag">TODO</div>\s*</div>',
    '<div class="stop done">\n<div class="stop-dot">M2</div>\n<div class="stop-name">Job Market</div>\n<div class="stop-week fn">Landing Page</div>\n<div class="stop-tag">DONE</div>\n</div>',
    content
)

# M3 Metro
content = re.sub(
    r'<div class="stop pending">\s*<div class="stop-dot">M3</div>\s*<div class="stop-name">Affiliate Hub</div>\s*<div class="stop-week fn">CTV Workspace</div>\s*<div class="stop-tag">TODO</div>\s*</div>',
    '<div class="stop current">\n<div class="stop-dot">M3<div class="you-are-here">ĐANG LÀM</div></div>\n<div class="stop-name">Job Search API</div>\n<div class="stop-week fn">Auth Portal</div>\n<div class="stop-tag">WIP</div>\n</div>',
    content
)

# M2 Details
content = re.sub(
    r'<span class="pd-badge badge-idle">M2</span>\s*<span class="pd-title">Job Board & Chợ Việc Làm</span>\s*<span class="pd-tag st-cho">TODO</span>',
    '<span class="pd-badge badge-done">M2</span>\n<span class="pd-title">Job Board & Chợ Việc Làm</span>\n<span class="pd-tag st-xong">DONE</span>',
    content
)

# M3 Details
content = re.sub(
    r'<span class="pd-badge badge-idle">M3</span>\s*<span class="pd-title">CTV Dashboard & Affiliate</span>\s*<span class="pd-tag st-cho">TODO</span>',
    '<span class="pd-badge badge-current">M3</span>\n<span class="pd-title">Tích hợp API Job Search / Auth Portal</span>\n<span class="pd-tag st-dang">WIP</span>',
    content
)

with open('docs/roadmap-portals.html', 'w', encoding='utf-8') as f:
    f.write(content)
