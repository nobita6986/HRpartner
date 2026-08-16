/**
 * Job-board filter unit tests — STEP-10/AC-12 (DEC-32)
 *
 * Test pure function `matchesFilters()` + so lieu canonical 3 project
 * (khong phu thuoc Prisma/React - chi data + predicate).
 *
 * AC-12 checks:
 *   - chon "Bac Giang" (province BAC_GIANG) -> chi Sao Viet
 *   - chon "Ca lam = N1" (shift N1) -> chi An Phat
 *   - chon "Loai hinh = Kho van" (type KHO_VAN) -> chi Yen Phong
 *   - khong loc ("Tat ca") -> ca 3 card
 *   - so lieu canonical giu nguyen (50/47, 80/80, 35/32)
 */

import { describe, it, expect } from 'vitest';
import { listPublicJobs, matchesFilters, type PublicJobFilters } from './index';

describe('job-board filters (STEP-10/AC-12)', () => {
  const jobs = listPublicJobs();

  it('3 project canonical giu nguyen (ma + so lieu 50/47/3, 80/80/0, 35/32/3)', () => {
    expect(jobs.map((j) => j.projectCode)).toEqual(['DA-2026-018', 'DA-2026-022', 'PRJ-SV-014']);
    expect(jobs.map((j) => `${j.totalNeeded}/${j.totalFilled}`)).toEqual(['50/47', '80/80', '35/32']);
  });

  it('khong bo loc ("Tat ca") -> ca 3 card', () => {
    const filtered = jobs.filter((j) => matchesFilters(j, {}));
    expect(filtered).toHaveLength(3);
  });

  it('province = BAC_GIANG ("Bac Giang") -> chi Sao Viet (PRJ-SV-014)', () => {
    const filtered = jobs.filter((j) => matchesFilters(j, { province: 'BAC_GIANG' }));
    expect(filtered.map((j) => j.projectCode)).toEqual(['PRJ-SV-014']);
  });

  it('province = BAC_NINH ("Bac Ninh") -> An Phat + Yen Phong (2)', () => {
    const filtered = jobs.filter((j) => matchesFilters(j, { province: 'BAC_NINH' }));
    expect(filtered.map((j) => j.projectCode)).toEqual(['DA-2026-018', 'DA-2026-022']);
  });

  it('shift = N1 ("Ca lam = N1") -> chi An Phat (DA-2026-018)', () => {
    const filtered = jobs.filter((j) => matchesFilters(j, { shift: 'N1' }));
    expect(filtered.map((j) => j.projectCode)).toEqual(['DA-2026-018']);
  });

  it('shift = D1 -> An Phat + Sao Viet (2)', () => {
    const filtered = jobs.filter((j) => matchesFilters(j, { shift: 'D1' }));
    expect(filtered.map((j) => j.projectCode)).toEqual(['DA-2026-018', 'PRJ-SV-014']);
  });

  it('type = KHO_VAN ("Kho van") -> chi Yen Phong (DA-2026-022)', () => {
    const filtered = jobs.filter((j) => matchesFilters(j, { type: 'KHO_VAN' }));
    expect(filtered.map((j) => j.projectCode)).toEqual(['DA-2026-022']);
  });

  it('status = DA_NHAN_DU ("Da nhan du") -> chi Yen Phong (DA-2026-022)', () => {
    const filtered = jobs.filter((j) => matchesFilters(j, { status: 'DA_NHAN_DU' }));
    expect(filtered.map((j) => j.projectCode)).toEqual(['DA-2026-022']);
  });

  it('so dem that tinh tu data: Bac Ninh 2 / Bac Giang 1, Nha may 2 / Kho van 1, HC 1 / D1 2 / D2 1 / N1 1 / T1 1', () => {
    const count = (f: PublicJobFilters) => jobs.filter((j) => matchesFilters(j, f)).length;
    expect(count({ province: 'BAC_NINH' })).toBe(2);
    expect(count({ province: 'BAC_GIANG' })).toBe(1);
    expect(count({ type: 'NHA_MAY' })).toBe(2);
    expect(count({ type: 'KHO_VAN' })).toBe(1);
    for (const code of ['HC', 'D1', 'D2', 'N1', 'T1']) {
      expect(count({ shift: code })).toBeGreaterThanOrEqual(1);
    }
    expect(count({ shift: 'HC' })).toBe(1);
    expect(count({ shift: 'D1' })).toBe(2);
    expect(count({ shift: 'D2' })).toBe(1);
    expect(count({ shift: 'N1' })).toBe(1);
    expect(count({ shift: 'T1' })).toBe(1);
  });
});
