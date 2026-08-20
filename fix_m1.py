import re

def fix_m1(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix M1 Metro timeline
    content = re.sub(
        r'<div class="stop current">\s*<div class="stop-dot">M1<div class="you-are-here">ĐANG LÀM</div></div>\s*<div class="stop-name">Public Layout</div>\s*<div class="stop-week fn">Design System</div>\s*<div class="stop-tag">WIP</div>\s*</div>',
        '<div class="stop done">\n<div class="stop-dot">M1</div>\n<div class="stop-name">Public Layout</div>\n<div class="stop-week fn">Design System</div>\n<div class="stop-tag">DONE</div>\n</div>',
        content
    )
    
    # Fix M1 details if it says WIP
    content = re.sub(
        r'<span class="pd-badge badge-current">M1</span>\s*<span class="pd-title">Nền tảng Design System & Public Layout</span>\s*<span class="pd-tag st-dang">WIP</span>',
        '<span class="pd-badge badge-done">M1</span>\n<span class="pd-title">Nền tảng Design System & Public Layout</span>\n<span class="pd-tag st-xong">DONE</span>',
        content
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_m1('docs/roadmap-portals.html')
fix_m1('public/roadmap-portals.html')
