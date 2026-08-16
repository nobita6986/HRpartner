/**
 * @hrp/job-board - Public job board (HRP A-04)
 *
 * Phase 0 deviation: returns 3 hardcoded canonical mock projects (An Phat /
 * Yen Phong / Sao Viet) because DB production may be empty and seed is
 * scheduled for STEP-06. Will switch to Prisma findMany on Project where
 * isPublic=true in Phase 4.
 *
 * STEP-10/AC-12 (DEC-32): bo sung field `province`/`type` + pure function
 * `matchesFilters()` cho filter client-side 4 nhom (Dia diem / Ca lam /
 * Loai hinh / Trang thai tuyen) - additive, KHONG doi so lieu canonical.
 *
 * Source: docs/tasks/hrp-v4-bod-mockup/mockup/S05_JobBoard_Public_1440.html
 */

export type ProvinceCode = 'BAC_NINH' | 'BAC_GIANG';
export type ProjectType = 'NHA_MAY' | 'KHO_VAN';
export type RecruitStatus = 'TUYEN_GAP' | 'DA_NHAN_DU' | 'DANG_TUYEN';

export interface PublicJobCard {
  projectCode: string;
  name: string;
  location: string;
  /** STEP-10/AC-12 (DEC-32): filter "Dia diem" - additive, khong doi so lieu canonical. */
  province: ProvinceCode;
  /** STEP-10/AC-12 (DEC-32): filter "Loai hinh" - additive, khong doi so lieu canonical. */
  type: ProjectType;
  shifts: ReadonlyArray<{ code: string; hours: string }>;
  totalNeeded: number;
  totalFilled: number;
  badge: RecruitStatus;
}

/** Bo loc client-side (STEP-10/AC-12). Field undefined = nhom do dang chon "Tat ca". */
export interface PublicJobFilters {
  province?: ProvinceCode;
  shift?: string;
  type?: ProjectType;
  status?: RecruitStatus;
}

/** Kiem tra 1 project co khop bo loc hay khong - pure function, khong cham DB. */
export function matchesFilters(job: PublicJobCard, filters: PublicJobFilters): boolean {
  if (filters.province !== undefined && job.province !== filters.province) return false;
  if (filters.shift !== undefined && !job.shifts.some((s) => s.code === filters.shift)) return false;
  if (filters.type !== undefined && job.type !== filters.type) return false;
  if (filters.status !== undefined && job.badge !== filters.status) return false;
  return true;
}

const MOCK_PROJECTS: ReadonlyArray<PublicJobCard> = [
  {
    projectCode: 'DA-2026-018',
    name: 'Nha may Dien tu An Phat',
    location: 'Bac Ninh',
    province: 'BAC_NINH',
    type: 'NHA_MAY',
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
    province: 'BAC_NINH',
    type: 'KHO_VAN',
    shifts: [{ code: 'T1', hours: '07:30-16:30' }],
    totalNeeded: 80,
    totalFilled: 80,
    badge: 'DA_NHAN_DU',
  },
  {
    projectCode: 'PRJ-SV-014',
    name: 'Nha may Sao Viet',
    location: 'KCN Quang Chau, Bac Giang',
    province: 'BAC_GIANG',
    type: 'NHA_MAY',
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
