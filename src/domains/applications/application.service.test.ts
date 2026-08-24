/**
 * application.service unit tests — MP-2 STEP-02/03.
 *
 * The definer functions live in the DB (ENV_BLOCKED to run here), so these
 * tests mock `$queryRawUnsafe` to assert the service contract: input guards,
 * param assembly (tracking code + hashes computed in Node), SQLSTATE→HTTP
 * mapping, and the allow-list tracking projection. No Worker/SourceClaim path
 * exists in this service by construction.
 */
import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  submitPublicApplication,
  getPublicTracking,
  ApplicationServiceError,
} from './application.service';
import { CvValidationError } from './apply-helpers';

function makeDb(impl: (sql: string, params: unknown[]) => unknown) {
  return {
    $queryRawUnsafe: vi.fn(async (sql: string, ...params: unknown[]) => impl(sql, params)),
  };
}

const validInput = {
  slug: 'acme',
  fullName: 'Nguyen Van A',
  phone: '0909 123 456',
  consentAt: '2026-08-23T00:00:00.000Z',
  idempotencyKey: 'idem-key-1',
};

describe('submitPublicApplication', () => {
  it('calls the definer apply function and returns the stored tracking result', async () => {
    const db = makeDb(() => [{ tracking_code: 'APP-XXXX-YYYY', status: 'NEW' }]);
    const res = await submitPublicApplication(db as never, validInput);
    expect(res).toEqual({ trackingCode: 'APP-XXXX-YYYY', status: 'NEW' });
    // SQL targets the definer function; a fresh tracking code + hashes are passed.
    const [sql, ...params] = db.$queryRawUnsafe.mock.calls[0];
    expect(sql).toContain('hrp_public_apply_submission');
    expect(params[4]).toBe('0909123456'); // normalized phone (5th param)
    expect(params[16]).toMatch(/^APP-/); // p_tracking_code (17th param)
    expect(params[14]).toMatch(/^[0-9a-f]{64}$/); // idempotency key hash
    expect(params[15]).toMatch(/^[0-9a-f]{64}$/); // payload hash
  });

  it('requires an idempotency key', async () => {
    const db = makeDb(() => []);
    await expect(submitPublicApplication(db as never, { ...validInput, idempotencyKey: '' }))
      .rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REQUIRED', httpStatus: 400 });
    expect(db.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('requires slug, name and a valid phone', async () => {
    const db = makeDb(() => []);
    await expect(submitPublicApplication(db as never, { ...validInput, phone: 'abc' }))
      .rejects.toBeInstanceOf(ApplicationServiceError);
    await expect(submitPublicApplication(db as never, { ...validInput, fullName: '' }))
      .rejects.toBeInstanceOf(ApplicationServiceError);
  });

  it('requires consent', async () => {
    const db = makeDb(() => []);
    await expect(submitPublicApplication(db as never, { ...validInput, consentAt: null }))
      .rejects.toMatchObject({ code: 'CONSENT_REQUIRED', httpStatus: 422 });
  });

  it('rejects unsafe CV metadata before hitting the DB', async () => {
    const db = makeDb(() => []);
    await expect(
      submitPublicApplication(db as never, {
        ...validInput,
        cv: { fileName: 'x.exe', mimeType: 'application/x-msdownload', sizeBytes: 10 },
      }),
    ).rejects.toBeInstanceOf(CvValidationError);
    expect(db.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('maps a raised SQLSTATE to the right HTTP error', async () => {
    const mkErr = (code: string) =>
      new Prisma.PrismaClientKnownRequestError('raw failed', {
        code: 'P2010',
        clientVersion: 'test',
        meta: { code },
      });
    const cases: Array<[string, number, string]> = [
      ['P0011', 404, 'JOB_NOT_AVAILABLE'],
      ['P0012', 409, 'DUPLICATE_APPLICATION'],
      ['P0010', 409, 'IDEMPOTENCY_PAYLOAD_MISMATCH'],
      ['P0002', 400, 'INVALID_INPUT'],
    ];
    for (const [sqlstate, status, error] of cases) {
      const db = makeDb(() => { throw mkErr(sqlstate); });
      await expect(submitPublicApplication(db as never, validInput))
        .rejects.toMatchObject({ code: error, httpStatus: status });
    }
  });

  it('rethrows unknown DB errors untouched', async () => {
    const boom = new Error('connection reset');
    const db = makeDb(() => { throw boom; });
    await expect(submitPublicApplication(db as never, validInput)).rejects.toBe(boom);
  });
});

describe('getPublicTracking', () => {
  it('projects only allow-listed fields and derives labels', async () => {
    const db = makeDb(() => [{
      tracking_code: 'APP-ABC', status: 'NEW',
      submitted_at: new Date('2026-08-23T10:00:00Z'),
      job_title: 'Cong ty A', job_code: 'ACME', position_title: 'Cong nhan',
    }]);
    const dto = await getPublicTracking(db as never, 'APP-ABC');
    expect(dto).not.toBeNull();
    expect(dto!.trackingCode).toBe('APP-ABC');
    expect(dto!.statusLabel).toBeTruthy();
    expect(dto!.nextStep).toBeTruthy();
    // Forbidden fields must not appear on the DTO.
    for (const forbidden of ['phone', 'cccdNumber', 'cvStorageKey', 'reviewNote', 'vendorId', 'ctvId']) {
      expect(Object.prototype.hasOwnProperty.call(dto, forbidden)).toBe(false);
    }
  });

  it('returns null for unknown code (route → generic 404)', async () => {
    const db = makeDb(() => []);
    expect(await getPublicTracking(db as never, 'APP-UNKNOWN')).toBeNull();
    expect(await getPublicTracking(db as never, '   ')).toBeNull();
  });
});
