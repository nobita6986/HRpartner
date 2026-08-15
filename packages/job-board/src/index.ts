/**
 * @hrp/job-board - Public job board (HRP A-04)
 *
 * Phase 0 deviation: returns 3 hardcoded canonical mock projects (An Phat /
 * Yen Phong / Sao Viet) because DB production may be empty and seed is
 * scheduled for STEP-06. Will switch to Prisma findMany on Project where
 * isPublic=true in Phase 4.
 *
 * Source: docs/tasks/hrp-v4-bod-mockup/mockup/S05_JobBoard_Public_1440.html
 */

export interface PublicJobCard {
  projectCode: string;
  name: string;
  location: string;
  shifts: ReadonlyArray<{ code: string; hours: string }>;
  totalNeeded: number;
  totalFilled: number;
  badge: 'TUYEN_GAP' | 'DA_NHAN_DU' | 'DANG_TUYEN';
}

const MOCK_PROJECTS: ReadonlyArray<PublicJobCard> = [
  {
    projectCode: 'DA-2026-018',
    name: 'Nha may Dien tu An Phat',
    location: 'Bac Ninh',
    shifts: [
      { code: 'D1', hours: '06:00-14:00' },
      { code: 'D2', hours: '14:00-22:00' },
      { code: 'N1', hours: '22:00-06:00' },
    ],
    totalNeeded: 50,
    totalFilled: 47,
    badge: 'TUYEN_GAP',
  },
  {
    projectCode: 'DA-2026-022',
    name: 'Kho van Yen Phong',
    location: 'KCN Yen Phong, Bac Ninh',
    shifts: [{ code: 'T1', hours: '07:30-16:30' }],
    totalNeeded: 80,
    totalFilled: 80,
    badge: 'DA_NHAN_DU',
  },
  {
    projectCode: 'PRJ-SV-014',
    name: 'Nha may Sao Viet',
    location: 'KCN Quang Chau, Bac Giang',
    shifts: [
      { code: 'HC', hours: '08:00-17:00' },
      { code: 'D1', hours: '06:00-14:00' },
    ],
    totalNeeded: 35,
    totalFilled: 32,
    badge: 'DANG_TUYEN',
  },
] as const;

export function listPublicJobs(): ReadonlyArray<PublicJobCard> {
  return MOCK_PROJECTS;
}
