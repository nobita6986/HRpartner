const fs = require('fs');
let content = fs.readFileSync('docs/PLANNER_HANDOVER.md', 'utf8');

const target = '**M8 - Worker Concurrency (hrp-portal-m8-worker-concurrency):**\n- **Ngu?n g?c:** Giai do?n 2 c?a K? ho?ch t?ng th? (M3: Ch?u t?i & Worker Waiting Room).\n- **Ti?n d?:** Planner dã t?o h?p d?ng (READY_FOR_EXECUTION). Yêu c?u setup Redis, Rate Limiting, và mock data t? Python.\n- **Ch? s?p:** G?i l?nh `/code hrp-portal-m8-worker-concurrency` (sau khi M7 dã x du?c x? lý lu?ng).';
const replacement = '**M8 - Worker Concurrency (hrp-portal-m8-worker-concurrency):**\n- **Tr?ng thái:** Ðã dóng (ACCEPTED). H? th?ng ch?u t?i (Rate Limit / Waiting Room) và UI Worker d?c t? Cache dã hoàn thi?n.\n- **Ch? s?p:** Ti?n vào Giai do?n 3 (M2/M6 g?c) - Affiliate Hub & Vendor Portal.';

// Just replace everything from M8 header to the end (since it's at the end)
content = content.replace(/\*\*M8 - Worker Concurrency \(hrp-portal-m8-worker-concurrency\):\*\*[\s\S]*/, replacement);

fs.writeFileSync('docs/PLANNER_HANDOVER.md', content, 'utf8');
