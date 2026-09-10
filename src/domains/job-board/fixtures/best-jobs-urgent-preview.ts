/**
 * DEC-06 / RQ-03 / RQ-04 — BestJobs "Tuyển gấp" preview fixture.
 *
 * Source: NEW file per OBR-02 §11.
 * Purpose: Tab URGENT renders from this fixture with INTEGRATION_PENDING marker.
 *         NOT fetched from server — backend does not yet support urgency filter.
 * Intent: 3-6 hardcoded items, id prefix `preview-urgent-...`, badgeType: 'urgent',
 *         source: 'INTEGRATION_PENDING'. Data does NOT come from `overview.newest`.
 *
 * AV1 (hrp-v6-admin-v6-av1-settings-editor) will flip source → 'REAL' once
 * /api/jobs?urgency=URGENT is implemented and HomepageSettings schema is live.
 */

import type { EnrichedJob } from '@/app/(portal)/page';

// DEC-06: id prefix `preview-urgent-...` ensures no collision with live job IDs.
export const BEST_JOBS_URGENT_PREVIEW: Array<EnrichedJob & { source: 'INTEGRATION_PENDING' }> = [
  {
    id: 'preview-urgent-001',
    slug: 'preview-urgent-001',
    title: 'Công nhân lắp ráp linh kiện điện tử — Tuyển gấp',
    locations: ['Bắc Ninh', 'KCN VSIP 1'],
    badgeType: 'urgent',
    salaryMinVnd: 28000,
    salaryMaxVnd: 38000,
    availableSlots: 12,
    source: 'INTEGRATION_PENDING',
  },
  {
    id: 'preview-urgent-002',
    slug: 'preview-urgent-002',
    title: 'Thợ hàn CO2 — Ca đêm ưu tiên',
    locations: ['Hải Dương', 'KCN Phố Nối'],
    badgeType: 'urgent',
    salaryMinVnd: 35000,
    salaryMaxVnd: 48000,
    availableSlots: 8,
    source: 'INTEGRATION_PENDING',
  },
  {
    id: 'preview-urgent-003',
    slug: 'preview-urgent-003',
    title: 'Nhân viên QC kiểm tra chất lượng — Đào tạo ngay',
    locations: ['Bắc Giang', 'KCN Yên Phong 2'],
    badgeType: 'urgent',
    salaryMinVnd: 30000,
    salaryMaxVnd: 42000,
    availableSlots: 6,
    source: 'INTEGRATION_PENDING',
  },
  {
    id: 'preview-urgent-004',
    slug: 'preview-urgent-004',
    title: 'Công nhân đóng gói sản phẩm — Lương cứng + phụ cấp',
    locations: ['Vĩnh Phúc', 'KCN Bình Xuyên'],
    badgeType: 'urgent',
    salaryMinVnd: 26000,
    salaryMaxVnd: 35000,
    availableSlots: 15,
    source: 'INTEGRATION_PENDING',
  },
];

// Re-export EnrichedJob so callers can import the type from this module.
// NOTE: This fixture is a standalone data file. Callers import EnrichedJob from app/(portal)/page.tsx.
