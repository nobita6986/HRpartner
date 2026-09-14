/**
 * intake-writer.service.test.ts — N1 intake writer (STEP-06).
 *
 * Test composite writer (mocked Prisma): NEW_PROFILE, EXACT_MATCH, General Interest,
 * actor không auto-referrer, POSSIBLE_MATCH throw.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createCandidateSubmissionFromIntake,
  PossibleMatchNotResolvedError,
} from './intake-writer.service';

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
    placementCase: {
      create: vi.fn(async (args: { data: Record<string, unknown>; select?: Record<string, boolean> }) => {
        const row: MockRow = { id: `pc-${nextId++}`, ...args.data };
        table('placementCase').set(row.id, row);
        if (!args.select) return row;
        const out: Record<string, unknown> = { id: row.id };
        for (const [k, v] of Object.entries(args.select)) if (v) out[k] = row[k];
        return out;
      }),
      findFirst: vi.fn(async () => null),
    },
    candidateSubmission: {
      create: vi.fn(async (args: { data: Record<string, unknown>; select?: Record<string, boolean> }) => {
        const row: MockRow = { id: `cs-${nextId++}`, ...args.data };
        table('candidateSubmission').set(row.id, row);
        if (!args.select) return row;
        const out: Record<string, unknown> = { id: row.id };
        for (const [k, v] of Object.entries(args.select)) if (v) out[k] = row[k];
        return out;
      }),
    },
  };
  return tx;
}

describe('createCandidateSubmissionFromIntake (STEP-06)', () => {
  let mock: ReturnType<typeof makeMockTx>;
  beforeEach(() => {
    mock = makeMockTx();
  });

  it('NEW_PROFILE: tạo LaborProfile + PlacementCase + Submission', async () => {
    const r = await createCandidateSubmissionFromIntake(mock, {
      applicant: { fullName: 'Nguyễn Văn A', phone: '0987654321' },
      channel: 'PUBLIC_MARKETPLACE',
      intent: 'JOB_INTEREST',
      actorId: 'u-public-001',
    });
    expect(r.match.verdict).toBe('NEW_PROFILE');
    expect(r.placementCase.placementCaseId).toBeDefined();
    expect(r.candidateSubmission.placementCaseId).toBe(r.placementCase.placementCaseId);
    expect(r.candidateSubmission.projectId).toBeNull();
    expect(r.candidateSubmission.status).toBe('NEW');
    expect(mock.candidateSubmission.create).toHaveBeenCalledTimes(1);
  });

  it('General Interest: projectId NULL → vẫn OK', async () => {
    const r = await createCandidateSubmissionFromIntake(mock, {
      applicant: { fullName: 'Trần Thị B', phone: '0987111222' },
      channel: 'PUBLIC_MARKETPLACE',
      intent: 'GENERAL_INTEREST',
      projectId: null,
      actorId: 'u-public-002',
    });
    expect(r.candidateSubmission.projectId).toBeNull();
    expect(r.candidateSubmission.placementCaseId).toBeDefined();
  });

  it('actor không auto-referrer: ctvId/vendorId NULL khi không có partnerRef', async () => {
    await createCandidateSubmissionFromIntake(mock, {
      applicant: { fullName: 'Test', phone: '0987000001' },
      channel: 'STAFF_INTAKE',
      intent: 'JOB_INTEREST',
      actorId: 'u-staff-001',
    });
    const call = (mock.candidateSubmission.create as ReturnType<typeof vi.fn>).mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(call.data['ctvId']).toBeNull();
    expect(call.data['vendorId']).toBeNull();
  });

  it('partnerRef CTV hợp lệ → ctvId set', async () => {
    await createCandidateSubmissionFromIntake(mock, {
      applicant: { fullName: 'Test', phone: '0987000002' },
      channel: 'PARTNER_INTAKE',
      intent: 'JOB_INTEREST',
      actorId: 'u-staff-002',
      partnerRef: { kind: 'CTV', userId: 'u-ctv-001' },
    });
    const call = (mock.candidateSubmission.create as ReturnType<typeof vi.fn>).mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(call.data['ctvId']).toBe('u-ctv-001');
    expect(call.data['vendorId']).toBeNull();
  });

  it('POSSIBLE_MATCH chưa resolve → throw PossibleMatchNotResolvedError', async () => {
    // Seed existing profile để tạo POSSIBLE_MATCH (chỉ phone khớp).
    mock.laborProfile.findMany.mockResolvedValueOnce([
      {
        id: 'lp-existing',
        fullName: 'nguyễn văn existing',
        normalizedPhone: '987654321',
        cccdNumber: null,
        dateOfBirth: null,
      },
    ]);
    await expect(
      createCandidateSubmissionFromIntake(mock, {
        applicant: { phone: '0987654321' }, // chỉ phone
        channel: 'PUBLIC_MARKETPLACE',
        intent: 'JOB_INTEREST',
        actorId: 'u-public-003',
      }),
    ).rejects.toBeInstanceOf(PossibleMatchNotResolvedError);
    expect(mock.candidateSubmission.create).not.toHaveBeenCalled();
  });
});
