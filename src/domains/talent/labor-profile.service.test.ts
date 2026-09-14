/**
 * labor-profile.service.test.ts — N1 intake writer (STEP-03 unit, STEP-04 async).
 *
 * Test pure scoring (`scoreAndClassify`) + async wrapper (`createOrMatchLaborProfile`)
 * với in-memory Prisma mock.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractApplicantSignals,
  compareSignals,
  scoreAndClassify,
  createOrMatchLaborProfile,
} from './labor-profile.service';
import type { ExistingLaborProfile } from './labor-profile.types';

// ═══════════════════════════════════════════════════════════════════════════
// In-memory Prisma mock
// ═══════════════════════════════════════════════════════════════════════════

interface MockRow { id: string; [key: string]: unknown; }

function makeMockTx() {
  const tables = new Map<string, Map<string, MockRow>>();
  let nextId = 1;
  function table(name: string) {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name)!;
  }
  function insert(name: string, data: Record<string, unknown>): MockRow {
    const t = table(name);
    const row: MockRow = { id: String(nextId++), ...data };
    t.set(row.id, row);
    return row;
  }
  function findMany(name: string, where?: { OR?: Array<Record<string, unknown>> }): MockRow[] {
    const t = table(name);
    const out: MockRow[] = [];
    for (const row of t.values()) {
      if (!where?.OR) {
        out.push(row);
        continue;
      }
      const match = where.OR.some((clause) => {
        for (const [k, v] of Object.entries(clause)) {
          if (row[k] !== v) return false;
        }
        return true;
      });
      if (match) out.push(row);
    }
    return out;
  }
  const tx: any = {
    laborProfile: {
      findMany: vi.fn(async (args: { where?: { OR?: Array<Record<string, unknown>> }; select?: Record<string, boolean>; take?: number }) =>
        findMany('laborProfile', args?.where).slice(0, args?.take ?? 100).map((r) => {
          if (!args?.select) return r;
          const out: Record<string, unknown> = { id: r.id };
          for (const [k, v] of Object.entries(args.select)) if (v) out[k] = r[k];
          return out;
        }),
      ),
      create: vi.fn(async (args: { data: Record<string, unknown>; select?: Record<string, boolean> }) => {
        const row = insert('laborProfile', args.data);
        if (!args.select) return row;
        const out: Record<string, unknown> = { id: row.id };
        for (const [k, v] of Object.entries(args.select)) if (v) out[k] = row[k];
        return out;
      }),
    },
  };
  return { tx, insert };
}

// ═══════════════════════════════════════════════════════════════════════════
// Pure scoring tests
// ═══════════════════════════════════════════════════════════════════════════

describe('extractApplicantSignals (DEC-02)', () => {
  it('extracts phone + cccd + name + dob khi cung cấp đủ', () => {
    const s = extractApplicantSignals({
      phone: '0987654321',
      cccdNumber: '012345678901',
      fullName: '  Nguyễn   Văn   A ',
      dateOfBirth: '1990-01-15',
    });
    expect(s.normalizedPhone).toBe('987654321');
    expect(s.cccdNumber).toBe('012345678901');
    expect(s.fullName).toBe('nguyễn văn a');
    expect(s.dateOfBirth).toBe('1990-01-15');
  });

  it('bỏ tín hiệu rỗng', () => {
    const s = extractApplicantSignals({ phone: '', cccdNumber: null, fullName: '  ', dateOfBirth: null });
    expect(s).toEqual({});
  });
});

describe('compareSignals (DEC-02/03)', () => {
  it('trả matched khi giá trị bằng nhau', () => {
    const r = compareSignals(
      { normalizedPhone: '987654321' },
      { normalizedPhone: '987654321' },
    );
    expect(r.signalsMatched).toEqual(['normalizedPhone']);
    expect(r.conflictingEvidence).toEqual([]);
  });

  it('trả conflict khi cùng key nhưng giá trị khác', () => {
    const r = compareSignals(
      { normalizedPhone: '111111111' },
      { normalizedPhone: '987654321' },
    );
    expect(r.signalsMatched).toEqual([]);
    expect(r.conflictingEvidence).toEqual(['normalizedPhone']);
  });

  it('bỏ qua dateOfBirth khi existing profile thiếu (LaborProfile schema)', () => {
    const r = compareSignals(
      { normalizedPhone: '987654321', dateOfBirth: '1990-01-15' },
      { normalizedPhone: '987654321' },
    );
    expect(r.signalsMatched).toEqual(['normalizedPhone']);
    expect(r.conflictingEvidence).toEqual([]);
  });
});

describe('scoreAndClassify (DEC-01/02/03, RQ-01..04)', () => {
  // LaborProfile schema không có dateOfBirth — chỉ test phone+cccd+fullName.
  const profileAB: ExistingLaborProfile = {
    id: 'lp-A',
    fullName: 'nguyễn văn a',
    normalizedPhone: '987654321',
    cccdNumber: '012345678901',
  };

  it('(i) phone + cccd khớp → EXACT_MATCH', () => {
    const r = scoreAndClassify(
      { phone: '0987654321', cccdNumber: '012345678901' },
      [profileAB],
    );
    expect(r.verdict).toBe('EXACT_MATCH');
    expect(r.candidate?.laborProfileId).toBe('lp-A');
    expect(r.candidate?.signalsMatched.sort()).toEqual(['cccdNumber', 'normalizedPhone']);
  });

  it('(ii) chỉ phone khớp → POSSIBLE_MATCH, không conflict', () => {
    const r = scoreAndClassify(
      { phone: '0987654321' },
      [profileAB],
    );
    expect(r.verdict).toBe('POSSIBLE_MATCH');
    expect(r.hasConflict).toBe(false);
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0]!.signalsMatched).toEqual(['normalizedPhone']);
  });

  it('(iii) phone khớp, fullName khác → POSSIBLE_MATCH + conflictingEvidence', () => {
    const r = scoreAndClassify(
      { phone: '0987654321', fullName: 'trần thị b' },
      [profileAB],
    );
    expect(r.verdict).toBe('POSSIBLE_MATCH');
    expect(r.hasConflict).toBe(true);
    expect(r.candidates[0]!.conflictingEvidence).toContain('fullName');
  });

  it('(iv) phone + name khớp → EXACT_MATCH (DOB bỏ qua vì LaborProfile không có)', () => {
    const r = scoreAndClassify(
      {
        phone: '0987654321',
        fullName: 'Nguyễn Văn A',
      },
      [profileAB],
    );
    expect(r.verdict).toBe('EXACT_MATCH');
    expect(r.candidate?.signalsMatched.length).toBeGreaterThanOrEqual(2);
  });

  it('(v) cccd khớp, fullName khác → POSSIBLE_MATCH + conflictingEvidence', () => {
    const r = scoreAndClassify(
      {
        cccdNumber: '012345678901',
        fullName: 'Trần Thị B',
      },
      [profileAB],
    );
    expect(r.verdict).toBe('POSSIBLE_MATCH');
    expect(r.hasConflict).toBe(true);
  });

  it('(vi) không có signal khớp → NEW_PROFILE', () => {
    const r = scoreAndClassify(
      { phone: '111111111', cccdNumber: '999999999999' },
      [profileAB],
    );
    expect(r.verdict).toBe('NEW_PROFILE');
  });

  it('(vii) existing rỗng → NEW_PROFILE', () => {
    const r = scoreAndClassify({ phone: '0987654321' }, []);
    expect(r.verdict).toBe('NEW_PROFILE');
  });

  it('(viii) empty applicant input → NEW_PROFILE', () => {
    const r = scoreAndClassify({}, [profileAB]);
    expect(r.verdict).toBe('NEW_PROFILE');
  });

  it('RQ-03: phone một mình KHÔNG bao giờ EXACT_MATCH', () => {
    const r = scoreAndClassify({ phone: '0987654321' }, [profileAB]);
    expect(r.verdict).not.toBe('EXACT_MATCH');
    expect(r.verdict).toBe('POSSIBLE_MATCH');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Async wrapper — createOrMatchLaborProfile (mocked Prisma)
// ═══════════════════════════════════════════════════════════════════════════

describe('createOrMatchLaborProfile (async wrapper, STEP-04)', () => {
  let mock: ReturnType<typeof makeMockTx>;
  beforeEach(() => {
    mock = makeMockTx();
  });

  it('EXACT_MATCH: trả existing laborProfileId, KHÔNG create mới', async () => {
    mock.insert('laborProfile', {
      fullName: 'nguyễn văn a',
      normalizedPhone: '987654321',
      cccdNumber: '012345678901',
    });
    const r = await createOrMatchLaborProfile(mock.tx, {
      phone: '0987654321',
      cccdNumber: '012345678901',
    }, { actorId: null });
    expect(r.verdict).toBe('EXACT_MATCH');
    expect(r.laborProfileId).toMatch(/^\d+$/);
    expect(mock.tx.laborProfile.create).not.toHaveBeenCalled();
  });

  it('POSSIBLE_MATCH: KHÔNG create, KHÔNG merge (DEC-04)', async () => {
    mock.insert('laborProfile', {
      fullName: 'nguyễn văn a',
      normalizedPhone: '987654321',
      cccdNumber: '012345678901',
    });
    const r = await createOrMatchLaborProfile(mock.tx, {
      phone: '0987654321',
    }, { actorId: null });
    expect(r.verdict).toBe('POSSIBLE_MATCH');
    expect(r.laborProfileId).toBeNull();
    expect(mock.tx.laborProfile.create).not.toHaveBeenCalled();
  });

  it('NEW_PROFILE: create LaborProfile mới với normalized fields', async () => {
    const r = await createOrMatchLaborProfile(mock.tx, {
      fullName: 'Nguyễn Văn A',
      phone: '+84 987 654 321',
      cccdNumber: '012345678901',
    }, { actorId: null, consentAt: new Date('2026-09-14T08:00:00Z') });
    expect(r.verdict).toBe('NEW_PROFILE');
    expect(r.laborProfileId).toMatch(/^\d+$/);
    expect(mock.tx.laborProfile.create).toHaveBeenCalledTimes(1);
    const call = (mock.tx.laborProfile.create as ReturnType<typeof vi.fn>).mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(call.data.normalizedPhone).toBe('987654321');
    expect(call.data.fullName).toBe('Nguyễn Văn A');
    expect(call.data.cccdNumber).toBe('012345678901');
    expect(call.data.consentAt).toBeInstanceOf(Date);
  });
});
