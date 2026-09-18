import { expect, test, vi, describe, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { createCandidateSubmissionFromIntake, PossibleMatchNotResolvedError } from '@/src/domains/talent/intake-writer.service';

vi.mock('@/src/lib/db', () => ({
  getPrisma: vi.fn(),
}));
vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: vi.fn(),
}));
vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: vi.fn(),
}));
vi.mock('@/src/domains/talent/intake-writer.service', () => {
  return {
    createCandidateSubmissionFromIntake: vi.fn(),
    PossibleMatchNotResolvedError: class extends Error {
      match: any;
      constructor(match: any) {
        super('POSSIBLE_MATCH');
        this.name = 'PossibleMatchNotResolvedError';
        this.match = match;
      }
    }
  };
});

describe('POST /api/admin/labor-profiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthContext).mockResolvedValue({ userId: 'admin1', role: 'ADMIN' } as any);
  });

  const createRequest = (body: any) => {
    return new NextRequest('http://localhost/api/admin/labor-profiles', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  test('successfully creates a profile via canonical intake writer', async () => {
    vi.mocked(withDbContext).mockImplementation(async (prisma, ctx, fn) => {
      return fn({} as any);
    });

    vi.mocked(createCandidateSubmissionFromIntake).mockResolvedValue({
      match: { verdict: 'NEW_PROFILE' },
      candidateSubmission: { laborProfileId: 'lp-1' },
    } as any);

    const req = createRequest({
      fullName: 'John Doe',
      phone: '0912345678',
      source: 'FACEBOOK',
      consent: true,
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    
    // Verifies canonical logic is called
    expect(createCandidateSubmissionFromIntake).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        applicant: { fullName: 'John Doe', phone: '0912345678', cccdNumber: undefined },
        channel: 'ADMIN_INTAKE', // Canonical channel used
        intent: 'GENERAL_INTEREST',
        actorId: 'admin1',
        consentAt: expect.any(Date), // Consent mapped
      })
    );
  });

  test('handles POSSIBLE_MATCH properly by returning 409', async () => {
    vi.mocked(withDbContext).mockImplementation(async (prisma, ctx, fn) => {
      return fn({} as any);
    });

    const mockError = new PossibleMatchNotResolvedError({ 
      verdict: 'POSSIBLE_MATCH',
      candidates: [{ laborProfileId: 'lp-2', signalsMatched: [], conflictingEvidence: [] }] 
    });
    vi.mocked(createCandidateSubmissionFromIntake).mockRejectedValue(mockError);

    const req = createRequest({
      fullName: 'John Doe',
      phone: '0912345678',
      consent: true,
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe('POSSIBLE_MATCH');
    expect(data.candidates[0].laborProfileId).toBe('lp-2');
  });

  test('forceNew bypasses intake writer and creates profile directly', async () => {
    const mockTx = {
      laborProfile: {
        create: vi.fn().mockResolvedValue({ id: 'lp-forced' }),
      },
    };
    vi.mocked(withDbContext).mockImplementation(async (prisma, ctx, fn) => {
      return fn(mockTx as any);
    });

    const req = createRequest({
      fullName: 'John Doe',
      phone: '0912345678',
      consent: true,
      forceNew: true, // User chose to bypass
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    
    // Intake writer NOT called
    expect(createCandidateSubmissionFromIntake).not.toHaveBeenCalled();
    // Manual creation triggered
    expect(mockTx.laborProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fullName: 'John Doe',
        phone: '0912345678',
      })
    });
  });
});
