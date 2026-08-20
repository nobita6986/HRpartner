import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('docs/roadmap-portals.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'badge-idle">M3' in line:
        for j in range(i-1, i+3):
            print(lines[j].strip())
