
const fs = require('fs');

try {
  let filepath = 'docs/PLANNER_HANDOVER.md';
  let content = fs.readFileSync(filepath, 'utf8');

  content = content.replace('M5 ACCEPTED, M6 ACCEPTED, M7 READY', 'M5 ACCEPTED, M6 ACCEPTED, M7 ACCEPTED');
  content = content.replace('-> M7 (Admin Expansion) ? [READY_FOR_EXECUTION]', '-> M7 (Admin Expansion) ? [ACCEPTED]');
  
  content = content.replace(
    '**M7 - Admin Expansion (hrp-portal-m7-admin-expansion):**\n- **Ngu?n g?c:** S?p yêu c?u kh?o sát, phát hi?n Admin thi?u CRUD form và thi?u trang vendors, users, settings.\n- **Ti?n d?:** Planner dã t?o h?p d?ng (READY_FOR_EXECUTION), yêu c?u b? sung toàn b? form và page b? thi?u.\n- **Ch? s?p:** G?i l?nh /code hrp-portal-m7-admin-expansion.',
    '**M7 - Admin Expansion (hrp-portal-m7-admin-expansion):**\n- **Tr?ng thái:** Ðã dóng (ACCEPTED). Toàn b? form CRUD và các trang Admin dã du?c hoàn thi?n.'
  );

  fs.writeFileSync(filepath, content, 'utf8');
  console.log('Updated PLANNER_HANDOVER');
} catch(e) {
  console.error(e);
}

