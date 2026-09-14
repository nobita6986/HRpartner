/**
 * placement.resolution.test.ts — DEC-06 clientCompanyId resolve.
 *
 * Mock Prisma transaction client; verify:
 *   - Happy path: chain nguyên vẹn → trả { clientCompanyId, projectId, serviceModel, managementMode }.
 *   - Chain broken (thiếu staffingOrder) → PlacementValidationError.
 *   - Chain broken (thiếu project) → PlacementValidationError.
 *   - Chain broken (thiếu clientCompany) → PlacementValidationError.
 *   - assertClassifiedJobOpening REJECT khi serviceModel NULL (DEC-10).
 *   - assertClassifiedJobOpening REJECT khi staffingOrderId NULL.
 */

import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { PlacementValidationError } from '@/src/domains/talent/placement.errors';
import {
  assertClassifiedJobOpening,
  resolveClientCompanyIdForJobOpening,
} from '@/src/domains/talent/placement.resolution';

function makeTx(opts: {
  staffingOrder?: { id: string; projectId: string } | null;
  project?: { id: string; clientCompanyId: string } | null;
  clientCompany?: { id: string } | null;
}): Prisma.TransactionClient {
  const tx: any = {
    staffingOrder: {
      findUnique: async (args: any) => {
        if (!opts.staffingOrder) return null;
        if (args.where.id !== opts.staffingOrder.id) return null;
        return opts.staffingOrder;
      },
    },
    project: {
      findUnique: async (args: any) => {
        if (!opts.project) return null;
        if (args.where.id !== opts.project.id) return null;
        return opts.project;
      },
    },
    clientCompany: {
      findUnique: async (args: any) => {
        if (!opts.clientCompany) return null;
        if (args.where.id !== opts.clientCompany.id) return null;
        return opts.clientCompany;
      },
    },
  };
  return tx as Prisma.TransactionClient;
}

const JOB_OPENING = {
  id: 'jo-1',
  staffingOrderId: 'so-1',
  serviceModel: 'STAFFING_SUPPLY' as const,
};

describe('placement.resolution — assertClassifiedJobOpening', () => {
  it('returns void khi opening đã classified', () => {
    expect(() => assertClassifiedJobOpening(JOB_OPENING)).not.toThrow();
  });

  it('throws PlacementValidationError khi serviceModel = NULL (DEC-10)', () => {
    expect(() =>
      assertClassifiedJobOpening({ ...JOB_OPENING, serviceModel: null }),
    ).toThrow(PlacementValidationError);
  });

  it('throws PlacementValidationError khi staffingOrderId = NULL', () => {
    expect(() =>
      assertClassifiedJobOpening({ ...JOB_OPENING, staffingOrderId: null }),
    ).toThrow(PlacementValidationError);
  });
});

describe('placement.resolution — resolveClientCompanyIdForJobOpening (DEC-06)', () => {
  it('happy path: chain nguyên vẹn → trả resolved', async () => {
    const tx = makeTx({
      staffingOrder: { id: 'so-1', projectId: 'prj-1' },
      project: { id: 'prj-1', clientCompanyId: 'cc-1' },
      clientCompany: { id: 'cc-1' },
    });
    const result = await resolveClientCompanyIdForJobOpening(tx, JOB_OPENING);
    expect(result).toEqual({
      clientCompanyId: 'cc-1',
      projectId: 'prj-1',
      serviceModel: 'STAFFING_SUPPLY',
      managementMode: 'HRP_MANAGED',
    });
  });

  it('happy path: RECRUITMENT_SERVICE → CLIENT_MANAGED', async () => {
    const tx = makeTx({
      staffingOrder: { id: 'so-1', projectId: 'prj-1' },
      project: { id: 'prj-1', clientCompanyId: 'cc-1' },
      clientCompany: { id: 'cc-1' },
    });
    const result = await resolveClientCompanyIdForJobOpening(tx, {
      ...JOB_OPENING,
      serviceModel: 'RECRUITMENT_SERVICE',
    });
    expect(result.managementMode).toBe('CLIENT_MANAGED');
  });

  it('chain broken: staffingOrder NULL → reject', async () => {
    const tx = makeTx({ staffingOrder: null });
    await expect(resolveClientCompanyIdForJobOpening(tx, JOB_OPENING)).rejects.toThrow(
      PlacementValidationError,
    );
  });

  it('chain broken: staffingOrder.projectId NULL → reject', async () => {
    const tx = makeTx({
      staffingOrder: { id: 'so-1', projectId: null as unknown as string },
    });
    await expect(resolveClientCompanyIdForJobOpening(tx, JOB_OPENING)).rejects.toThrow(
      PlacementValidationError,
    );
  });

  it('chain broken: project NULL → reject', async () => {
    const tx = makeTx({
      staffingOrder: { id: 'so-1', projectId: 'prj-1' },
      project: null,
    });
    await expect(resolveClientCompanyIdForJobOpening(tx, JOB_OPENING)).rejects.toThrow(
      PlacementValidationError,
    );
  });

  it('chain broken: project.clientCompanyId NULL → reject', async () => {
    const tx = makeTx({
      staffingOrder: { id: 'so-1', projectId: 'prj-1' },
      project: { id: 'prj-1', clientCompanyId: null as unknown as string },
    });
    await expect(resolveClientCompanyIdForJobOpening(tx, JOB_OPENING)).rejects.toThrow(
      PlacementValidationError,
    );
  });

  it('chain broken: clientCompany NULL → reject', async () => {
    const tx = makeTx({
      staffingOrder: { id: 'so-1', projectId: 'prj-1' },
      project: { id: 'prj-1', clientCompanyId: 'cc-1' },
      clientCompany: null,
    });
    await expect(resolveClientCompanyIdForJobOpening(tx, JOB_OPENING)).rejects.toThrow(
      PlacementValidationError,
    );
  });
});
