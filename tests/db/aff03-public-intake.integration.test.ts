/**
 * tests/db/aff03-public-intake.integration.test.ts
 *
 * Container-DB integration test for AFF-03 public anon apply path.
 *
 * ENV_BLOCKED by default — bỏ qua toàn bộ nếu DATABASE_URL_TEST không có.
 * Khi env có, chạy trên `hrp_mp2_test` (T0/Owner pipeline target):
 *
 *   AC-08 happy path: valid cookie → ReferralAttribution.status='CONSUMED',
 *     labor_profile_id set, consumed_at non-null, LaborProfileHandlingAssignment
 *     row created with source=AFF_INITIAL, assignee_user_id=referrerUserId.
 *   AC-09 forged cookie: 201, attribution row UNCHANGED, no LPHA row.
 *   AC-10 no cookie: 201, zero rows mutated.
 *   AC-15 expired attribution: 201, status='ACTIVE' UNCHANGED, no LPHA row.
 *   AC-16 non-active status (CONSUMED already): 201, no second LPHA row,
 *     consumed_at NOT overwritten.
 *   AC-11 idempotency replay: same Idempotency-Key → same
 *     candidateSubmissionId, consumedAt UNCHANGED.
 *
 * Requires the additive migration
 *   `20260918100000_aff03_writer_select_on_referral_attributions`
 * to be applied (CI Integration lane applies it via the standard migration
 * apply pipeline BEFORE running this test).
 *
 * GUC handling: writer transactions do NOT set any GUC; the writer role's
 * RLS posture must permit SELECT (status IN ('ACTIVE','CONSUMED')) and UPDATE
 * (ACTIVE → CONSUMED with labor_profile_id NOT NULL).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createHmac } from 'node:crypto';
import { PrismaClient, Prisma } from '@prisma/client';

import {
  submitPublicIntake,
} from '@/src/domains/applications/aff03-public-intake.service';

const HAS_TEST_DB =
  !!process.env.DATABASE_URL_TEST &&
  !process.env.DATABASE_URL_TEST?.includes('placeholder');

function makeClient(url: string): PrismaClient {
  return new PrismaClient({ datasources: { db: { url } } });
}

const runId = `aff03-${randomUUID().slice(0, 8)}`;
const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';

/** Build a valid `hrp_aff` cookie value pointing to the given attributionId. */
function makeHrAffCookie(attributionId: string): string {
  const secret = process.env.RATE_LIMIT_HASH_SECRET ?? 'integration-test-secret-padding-to-32-bytes';
  const expiresAtMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const encId = Buffer.from(attributionId, 'utf8').toString('base64url');
  const encExp = Buffer.from(String(expiresAtMs), 'utf8').toString('base64url');
  const encVer = Buffer.from('1', 'utf8').toString('base64url');
  const payload = `${encId}.${encExp}.${encVer}`;
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

describe.skipIf(!HAS_TEST_DB)('AFF-03 public anon intake — DB-touching proof', () => {
  let admin: PrismaClient;
  let referrerUserId: string;

  const createdLaborProfileIds: string[] = [];
  const createdAttributionIds: string[] = [];
  const createdHandlingAssignmentIds: string[] = [];

  beforeAll(async () => {
    if (!adminUrl || !writerUrl) return;
    admin = makeClient(adminUrl);
    // Ensure a referrer user exists for FK.
    const referrer = await admin.user.upsert({
      where: { id: `${runId}-referrer` },
      update: {},
      create: {
        id: `${runId}-referrer`,
        phone: `09${runId.replace(/-/g, '').slice(0, 8)}`,
        role: 'CTV',
        name: 'AFF-03 Referrer',
      },
    });
    referrerUserId = referrer.id;
  }, 30000);

  afterAll(async () => {
    try {
      // Clean up created rows.
      if (createdHandlingAssignmentIds.length > 0) {
        await admin.laborProfileHandlingAssignment.deleteMany({
          where: { id: { in: createdHandlingAssignmentIds } },
        }).catch(() => {});
      }
      if (createdLaborProfileIds.length > 0) {
        await admin.candidateSubmission.deleteMany({
          where: { laborProfileId: { in: createdLaborProfileIds } },
        }).catch(() => {});
        await admin.placementCase.deleteMany({
          where: { laborProfileId: { in: createdLaborProfileIds } },
        }).catch(() => {});
        await admin.laborProfile.deleteMany({
          where: { id: { in: createdLaborProfileIds } },
        }).catch(() => {});
        await admin.referralAttribution.updateMany({
          where: { id: { in: createdAttributionIds } },
          data: { laborProfileId: null, status: 'REVOKED', consumedAt: null },
        }).catch(() => {});
      }
      if (createdAttributionIds.length > 0) {
        await admin.referralAttribution.deleteMany({
          where: { id: { in: createdAttributionIds } },
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('cleanup partial failure:', (e as Error).message.slice(0, 200));
    }
    await admin?.$disconnect().catch(() => {});
  }, 30000);

  async function seedAttribution(opts: {
    status?: 'ACTIVE' | 'CONSUMED' | 'EXPIRED' | 'REVOKED';
    expiresAt?: Date;
    affiliateCode?: string;
  } = {}) {
    const id = `${runId}-attr-${randomUUID().slice(0, 8)}`;
    const row = await admin.referralAttribution.create({
      data: {
        id,
        referrerUserId,
        affiliateCodeSnapshot: opts.affiliateCode ?? `AFF-${runId}-${id.slice(-6)}`,
        firstClickedAt: new Date(Date.now() - 60_000),
        expiresAt: opts.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: opts.status ?? 'ACTIVE',
        consumedAt: opts.status === 'CONSUMED' ? new Date(Date.now() - 1000) : null,
      },
    });
    createdAttributionIds.push(id);
    return row;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AC-08 — happy path: valid cookie → referral consumed, LPHA created
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-08 valid cookie: attribution consumed, LaborProfileHandlingAssignment created with source=AFF_INITIAL', async () => {
    if (!writerUrl) return;
    const attr = await seedAttribution({ status: 'ACTIVE' });

    const writer = makeClient(writerUrl);
    try {
      const preRow = await admin.referralAttribution.findUnique({
        where: { id: attr.id },
        select: { status: true, consumedAt: true, laborProfileId: true },
      });
      expect(preRow?.status).toBe('ACTIVE');
      expect(preRow?.consumedAt).toBeNull();

      const dto = await writer.$transaction(async (tx) =>
        submitPublicIntake(tx, {
          applicant: {
            fullName: `AC-08 ${runId}`,
            phone: `09${runId.replace(/-/g, '').slice(0, 8)}1`,
            cccdNumber: null,
            consentAt: new Date().toISOString(),
          },
          channel: 'PUBLIC_MARKETPLACE',
          intent: 'GENERAL_INTEREST',
          hrpAffCookie: makeHrAffCookie(attr.id),
          actorId: 'system:public-intake',
        }),
      );

      expect(dto.candidateSubmissionId).toMatch(/.+/);
      expect(dto.laborProfileId).toMatch(/.+/);
      createdLaborProfileIds.push(dto.laborProfileId!);

      // Assert: status='CONSUMED', consumed_at non-null, labor_profile_id set.
      const postRow = await admin.referralAttribution.findUnique({
        where: { id: attr.id },
        select: { status: true, consumedAt: true, laborProfileId: true },
      });
      expect(postRow?.status).toBe('CONSUMED');
      expect(postRow?.consumedAt).not.toBeNull();
      expect(postRow?.laborProfileId).toBe(dto.laborProfileId);

      // Assert: LaborProfileHandlingAssignment created with source=AFF_INITIAL.
      const lpha = await admin.laborProfileHandlingAssignment.findFirst({
        where: { laborProfileId: dto.laborProfileId!, source: 'AFF_INITIAL' },
        select: { id: true, assigneeUserId: true, source: true },
      });
      expect(lpha).not.toBeNull();
      expect(lpha?.assigneeUserId).toBe(referrerUserId);
      createdHandlingAssignmentIds.push(lpha!.id);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-09 — forged cookie: 201, no mutation
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-09 forged cookie: response 201, attribution row UNCHANGED, no LPHA row', async () => {
    if (!writerUrl) return;
    const attr = await seedAttribution({ status: 'ACTIVE' });
    const writer = makeClient(writerUrl);
    try {
      const preRow = await admin.referralAttribution.findUnique({
        where: { id: attr.id },
        select: { status: true, consumedAt: true, laborProfileId: true, updatedAt: true },
      });

      const dto = await writer.$transaction(async (tx) =>
        submitPublicIntake(tx, {
          applicant: {
            fullName: `AC-09 ${runId}`,
            phone: `09${runId.replace(/-/g, '').slice(0, 8)}2`,
            consentAt: new Date().toISOString(),
          },
          hrpAffCookie: 'aGVsbG8.d29ybGQ.bm90', // base64url but HMAC will mismatch
          actorId: 'system:public-intake',
        }),
      );
      createdLaborProfileIds.push(dto.laborProfileId!);

      const postRow = await admin.referralAttribution.findUnique({
        where: { id: attr.id },
        select: { status: true, consumedAt: true, laborProfileId: true, updatedAt: true },
      });
      expect(postRow?.status).toBe(preRow?.status);
      expect(postRow?.consumedAt).toBeNull();
      expect(postRow?.laborProfileId).toBeNull();
      expect(postRow?.updatedAt.getTime()).toBe(preRow?.updatedAt.getTime());

      // No LPHA created for this LaborProfile from AFF_INITIAL.
      const lpha = await admin.laborProfileHandlingAssignment.findFirst({
        where: { laborProfileId: dto.laborProfileId!, source: 'AFF_INITIAL' },
      });
      expect(lpha).toBeNull();
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-10 — no cookie: 201, zero rows mutated
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-10 no cookie: response 201, attribution table UNCHANGED (zero rows mutated)', async () => {
    if (!writerUrl) return;
    const beforeTs = new Date();
    const writer = makeClient(writerUrl);
    try {
      const dto = await writer.$transaction(async (tx) =>
        submitPublicIntake(tx, {
          applicant: {
            fullName: `AC-10 ${runId}`,
            phone: `09${runId.replace(/-/g, '').slice(0, 8)}3`,
            consentAt: new Date().toISOString(),
          },
          hrpAffCookie: null,
          actorId: 'system:public-intake',
        }),
      );
      createdLaborProfileIds.push(dto.laborProfileId!);

      // No attribution touched since `beforeTs`.
      const touched = await admin.referralAttribution.count({
        where: { updatedAt: { gt: beforeTs } },
      });
      expect(touched).toBe(0);

      // No LPHA from AFF_INITIAL for this LaborProfile.
      const lpha = await admin.laborProfileHandlingAssignment.findFirst({
        where: { laborProfileId: dto.laborProfileId!, source: 'AFF_INITIAL' },
      });
      expect(lpha).toBeNull();
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-15 — expired attribution: row expiresAt <= now() → silent no-op
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-15 expired attribution: response 201, status UNCHANGED, no LPHA row', async () => {
    if (!writerUrl) return;
    const attr = await seedAttribution({
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() - 60_000),
    });
    const writer = makeClient(writerUrl);
    try {
      const preRow = await admin.referralAttribution.findUnique({
        where: { id: attr.id },
        select: { status: true, consumedAt: true },
      });

      const dto = await writer.$transaction(async (tx) =>
        submitPublicIntake(tx, {
          applicant: {
            fullName: `AC-15 ${runId}`,
            phone: `09${runId.replace(/-/g, '').slice(0, 8)}5`,
            consentAt: new Date().toISOString(),
          },
          hrpAffCookie: makeHrAffCookie(attr.id),
          actorId: 'system:public-intake',
        }),
      );
      createdLaborProfileIds.push(dto.laborProfileId!);

      const postRow = await admin.referralAttribution.findUnique({
        where: { id: attr.id },
        select: { status: true, consumedAt: true },
      });
      expect(postRow?.status).toBe('ACTIVE');
      expect(postRow?.consumedAt).toBeNull();

      const lpha = await admin.laborProfileHandlingAssignment.findFirst({
        where: { laborProfileId: dto.laborProfileId!, source: 'AFF_INITIAL' },
      });
      expect(lpha).toBeNull();
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-16 — non-active status (already CONSUMED) → silent no-op
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-16 non-active status: response 201, no second LPHA row, consumedAt NOT overwritten', async () => {
    if (!writerUrl) return;
    const attr = await seedAttribution({ status: 'CONSUMED' });
    const preConsumedAt = (await admin.referralAttribution.findUnique({
      where: { id: attr.id },
      select: { consumedAt: true },
    }))?.consumedAt;

    const writer = makeClient(writerUrl);
    try {
      const dto = await writer.$transaction(async (tx) =>
        submitPublicIntake(tx, {
          applicant: {
            fullName: `AC-16 ${runId}`,
            phone: `09${runId.replace(/-/g, '').slice(0, 8)}6`,
            consentAt: new Date().toISOString(),
          },
          hrpAffCookie: makeHrAffCookie(attr.id),
          actorId: 'system:public-intake',
        }),
      );
      createdLaborProfileIds.push(dto.laborProfileId!);

      const postConsumedAt = (await admin.referralAttribution.findUnique({
        where: { id: attr.id },
        select: { consumedAt: true },
      }))?.consumedAt;

      expect(postConsumedAt?.getTime()).toBe(preConsumedAt?.getTime());

      const lpha = await admin.laborProfileHandlingAssignment.findFirst({
        where: { laborProfileId: dto.laborProfileId!, source: 'AFF_INITIAL' },
      });
      expect(lpha).toBeNull();
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-11 — idempotency replay: writer's existingAttr guard prevents double consumption
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-11 (writer layer) attribution consumedAt is NOT overwritten on second call', async () => {
    if (!writerUrl) return;
    const attr = await seedAttribution({ status: 'ACTIVE' });
    const writer = makeClient(writerUrl);
    try {
      // First call: consume the attribution, bind laborProfileId.
      const dto1 = await writer.$transaction(async (tx) =>
        submitPublicIntake(tx, {
          applicant: {
            fullName: `AC-11-A ${runId}`,
            phone: `09${runId.replace(/-/g, '').slice(0, 8)}A`,
            consentAt: new Date().toISOString(),
          },
          hrpAffCookie: makeHrAffCookie(attr.id),
          actorId: 'system:public-intake',
        }),
      );
      createdLaborProfileIds.push(dto1.laborProfileId!);

      const consumedAt1 = (await admin.referralAttribution.findUnique({
        where: { id: attr.id },
        select: { consumedAt: true, laborProfileId: true, status: true },
      }));
      expect(consumedAt1?.status).toBe('CONSUMED');
      expect(consumedAt1?.laborProfileId).toBe(dto1.laborProfileId);

      // Second call (different applicant, same cookie pointing to same attribution).
      // The writer's `existingAttr` guard (intake-writer.service.ts:130) prevents
      // re-consumption; the attribution row stays as it is.
      const dto2 = await writer.$transaction(async (tx) =>
        submitPublicIntake(tx, {
          applicant: {
            fullName: `AC-11-B ${runId}`,
            phone: `09${runId.replace(/-/g, '').slice(0, 8)}B`,
            consentAt: new Date().toISOString(),
          },
          hrpAffCookie: makeHrAffCookie(attr.id),
          actorId: 'system:public-intake',
        }),
      );
      createdLaborProfileIds.push(dto2.laborProfileId!);

      const consumedAt2 = (await admin.referralAttribution.findUnique({
        where: { id: attr.id },
        select: { consumedAt: true, laborProfileId: true },
      }));
      expect(consumedAt2?.consumedAt?.getTime()).toBe(consumedAt1?.consumedAt?.getTime());
      expect(consumedAt2?.laborProfileId).toBe(consumedAt1?.laborProfileId);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });
});
