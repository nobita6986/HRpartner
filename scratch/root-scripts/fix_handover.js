const fs = require('fs');
let content = fs.readFileSync('docs/PLANNER_HANDOVER.md', 'utf8');

// The marker where section 10 starts
const sec10Regex = /## 10\. Checklist ngy d\?u[\s\S]*/;

const newSec10 = `## 10. Checklist ngày d?u

- [ ] Ð?c \`.ai-pipeline/tier1.md\` + \`rules/01-planner-rules.md\` + \`templates/TASK.template.md\`
- [ ] Ð?c \`docs/tasks/hrp-portal-m9-affiliate-vendor/TASK.md\` (contract v1.0 READY_FOR_EXECUTION)
- [ ] Ð?c \`docs/portal_audit_report.md\` d? n?m du?c K? ho?ch t?ng th? (Master Plan) g?m 4 giai do?n mà chúng ta dang th?c hi?n.
- [ ] M? \`docs/roadmap-portals.html\` b?ng trình duy?t d? xem ti?n d? (hi?n M4, M5, M6, M7, M8 dã DONE, dang làm M9).
- [ ] Xác nh?n l?i v?i s?p: Tier 2/3 hi?n là ai? Ðã gõ \`/code hrp-portal-m9-affiliate-vendor\` chua?
- [ ] Sau m?i round/task, luôn nh? c?p nh?t d?ng b? các file theo m?c s? 8 và push.

---

*Tài li?u do Tier 1 Planner (Antigravity) c?p nh?t ngày 20/08/2026 ~17:15 ICT.*

**TÌNH TR?NG HI?N T?I (Master Plan - Portal Refactor):**
- **M7 (Admin Expansion):** ? Ðã dóng (ACCEPTED). Hoàn thi?n CRUD Admin và 3 trang Settings, Users, Vendors.
- **M8 (Worker Concurrency - M3 g?c):** ? Ðã dóng (ACCEPTED). H? th?ng ch?u t?i (Rate Limit / Waiting Room) và UI Worker d?c t? Cache dã hoàn thi?n.
- **M9 (Affiliate Hub & Vendor Portal - M2 & M6 g?c):** ? [READY_FOR_EXECUTION]. Planner dã t?o h?p d?ng (yêu c?u d?p UI m?i, v? chart cho CTV, và làm Statements cho Vendor).
- **Ch? s?p:** G?i l?nh \`/code hrp-portal-m9-affiliate-vendor\` d? phái Tier 2 di làm M9.
`;

content = content.replace(sec10Regex, newSec10);
fs.writeFileSync('docs/PLANNER_HANDOVER.md', content, 'utf8');
