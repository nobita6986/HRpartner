
with open('docs/tasks/hrp-portal-m8-worker-concurrency/TASK.md', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('## 2. Evidence và Baseline', '## 2. Evidence and Baseline')
text = text.replace('## 3. Decisions và Assumptions', '## 3. Decisions and Assumptions')
text = text.replace('## 7. Risk và Rollback', '## 7. Risk and Rollback')

# Wait, the script expects EXACTLY '## 2. Evidence' etc. Let's make it just '## 2. Evidence'.
text = text.replace('## 2. Evidence and Baseline', '## 2. Evidence')
text = text.replace('## 3. Decisions and Assumptions', '## 3. Decisions')
text = text.replace('## 7. Risk and Rollback', '## 7. Risk')

# Fix traceability
text = text.replace('RQ-01..02', 'RQ-01, RQ-02')
text = text.replace('RQ-03..04', 'RQ-03, RQ-04')

with open('docs/tasks/hrp-portal-m8-worker-concurrency/TASK.md', 'w', encoding='utf-8') as f:
    f.write(text)

