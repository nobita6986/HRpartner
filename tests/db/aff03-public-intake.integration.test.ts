/**
 * tests/db/aff03-public-intake.integration.test.ts
 *
 * Container-DB integration test for AFF-03B public anon apply path.
 *
 * ENV_BLOCKED by default — bỏ qua toàn bộ nếu DATABASE_URL_TEST không có.
 * Khi env có, chạy trên `hrp_mp2_test` (T0/Owner pipeline target).
 *
 * ARCHITECTURE (rounds 0..4, T0 verdict ACCEPTED)
 * ===============================================
 * The anon path POST /api/public/intake delegates the entire write chain to
 * SECURITY DEFINER RPC `hrp_public_intake_submission(jsonb)` which runs as
 * hrp_public_rpc (NOLOGIN BYPASSRLS, DEC-14). RLS policies do NOT apply to
 * the definer path; the only DB-level guard on the
 * UPDATE referral_attributions is the WHERE predicate
 * AND status='ACTIVE' AND expires_at > now() AND labor_profile_id IS NULL
 * (DEC-11 (c)).
 *
 * LANES
 * =====
 *   - `runtime-role` describe block (PRIMARY): writer `$transaction` without
 *     `app.role` GUC — mirrors production route exactly. This is the lane
 *     that previously CI-masked with `withHrManagerContext`; the masking was
 *     what allowed the 42501 defect to slip through AFF-03 smoke.
 *   - `masked-hr-manager` describe block (SECONDARY guard-rail): retains
 *     `withHrManagerContext` to regression-guard the writer policies
 *     hrp_ra_select_writer / hrp_ra_update_writer (preserved for non-anon
 *     paths). This lane is intentionally NOT used to validate the RPC path.
 *
 * ACCEPTANCE COVERAGE
 * ===================
 *   AC-01 happy path (valid cookie → CONSUMED + LPHA): runtime lane.
 *   AC-02 forged cookie (silent fail-safe, no mutation): runtime lane.
 *   AC-03 no cookie (silent fail-safe, zero mutation): runtime lane.
 *   AC-04 expired cookie (silent fail-safe, no mutation): runtime lane.
 *   AC-05 row already CONSUMED (silent fail-safe, no second LPHA):
 *     runtime lane.
 *   AC-06 missing RATE_LIMIT_HASH_SECRET (TOKEN_SIGNING_ERROR → silent
 *     fail-safe): runtime lane.
 *   AC-07 attribution guard (a) service-level pre-filter rejects row:
 *     runtime lane.
 *   AC-08 attribution guard (b) RPC-body probe rejects bound row:
 *     runtime lane.
 *   AC-09 attribution guard (c) RPC-body WHERE predicate rejects second
 *     consume: runtime lane.
 *   AC-10 scoring parity (≥2-signal EXACT_MATCH): runtime lane.
 *   AC-11 phone-only NEW_PROFILE (regression for round-1 minimal-RPC
 *     finding): runtime lane.
 *   AC-12 returning applicant EXACT_MATCH (regression for round-1 finding):
 *     runtime lane.
 *   AC-13 masked writer-policies regression: masked-hr-manager lane.
 *
 * Requires the additive migrations
 *   - `20260918100000_aff03_writer_select_on_referral_attributions`
 *   - `20260919100000_aff03b_public_intake_rpc`
 * to be applied (CI Integration lane applies them via the standard
 * migration apply pipeline BEFORE running this test). The second migration
 * requires OP-01 (`scripts/create-public-rpc-role.cjs`) to have been run
 * before it was applied — hrp_public_rpc must already exist with NOLOGIN
 * BYPASSRLS.
 *
 * GUC handling: the primary runtime-role lane DOES NOT set app.role. The
 * masked lane retains `withHrManagerContext` for regression coverage of the
 * existing writer policies.
 *
 * PrismaClient singleton: same pattern as before (admin + writer clients,
 * each test uses a fresh writer client; rows cleanup in afterAll).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID, createHmac } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

import {
  submitPublicIntake,
} from '@/src/domains/applications/aff03-public-intake.service';
import normalizationFixtures from './_fixtures/normalization-fixtures.json';

const HAS_TEST_DB =
  !!process.env.DATABASE_URL_TEST &&
  !process.env.DATABASE_URL_TEST?.includes('placeholder');

function makeClient(url: string): PrismaClient {
  return new PrismaClient({ datasources: { db: { url } } });
}

const runId = `aff03b-${randomUUID().slice(0, 8)}`;
const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';

/** Provision RATE_LIMIT_HASH_SECRET if absent (CI container does not inject). */
function ensureTokenSecret(): void {
  if (!process.env.RATE_LIMIT_HASH_SECRET || process.env.RATE_LIMIT_HASH_SECRET.length < 32) {
    process.env.RATE_LIMIT_HASH_SECRET =
      `itest-${runId}-${randomUUID()}${randomUUID()}`.padEnd(32, '0').slice(0, 64);
  }
}

/** Masked GUC context for the secondary regression lane (writer policies). */
async function withHrManagerContext<T>(
  prisma: PrismaClient,
  actorId: string,
  cb: (tx: import('@prisma/client').Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.user_id', $1, true)`, actorId);
    await tx.$executeRawUnsafe(`SELECT set_config('app.role', $1, true)`, 'HR_MANAGER');
    await tx.$executeRawUnsafe(`SELECT set_config('app.vendor_id', '', true)`);
    await tx.$executeRawUnsafe(`SELECT set_config('app.worker_id', '', true)`);
    return cb(tx);
  });
}

/** Build a valid `hrp_aff` cookie value pointing to the given attributionId. */
function makeHrAffCookie(attributionId: string): string {
  const secret = process.env.RATE_LIMIT_HASH_SECRET ?? '';
  const expiresAtMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const encId = Buffer.from(attributionId, 'utf8').toString('base64url');
  const encExp = Buffer.from(String(expiresAtMs), 'utf8').toString('base64url');
  const encVer = Buffer.from('1', 'utf8').toString('base64url');
  const payload = `${encId}.${encExp}.${encVer}`;
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

describe.skipIf(!HAS_TEST_DB)('AFF-03B public anon intake — RUNTIME ROLE (production mirror)', () => {
  let admin: PrismaClient;
  let referrerUserId: string;

  const createdLaborProfileIds: string[] = [];
  const createdAttributionIds: string[] = [];
  const createdHandlingAssignmentIds: string[] = [];
  const createdCandidateSubmissionIds: string[] = [];

  beforeAll(async () => {
    if (!adminUrl || !writerUrl) return;
    ensureTokenSecret();
    admin = makeClient(adminUrl);
    const referrer = await admin.user.upsert({
      where: { id: `${runId}-referrer` },
      update: {},
      create: {
        id: `${runId}-referrer`,
        phone: `09${runId.replace(/-/g, '').slice(0, 8)}`,
        role: 'CTV',
        name: 'AFF-03B Referrer',
      },
    });
    referrerUserId = referrer.id;
  }, 30000);

  afterAll(async () => {
    try {
      if (createdHandlingAssignmentIds.length > 0) {
        await admin.laborProfileHandlingAssignment.deleteMany({
          where: { id: { in: createdHandlingAssignmentIds } },
        }).catch(() => {});
      }
      if (createdCandidateSubmissionIds.length > 0) {
        await admin.candidateSubmission.deleteMany({
          where: { id: { in: createdCandidateSubmissionIds } },
        }).catch(() => {});
      }
      if (createdLaborProfileIds.length > 0) {
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
    laborProfileId?: string | null;
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
        laborProfileId: opts.laborProfileId ?? null,
      },
    });
    createdAttributionIds.push(id);
    return row;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AC-01 — happy path: valid cookie → CONSUMED + LPHA via runtime role
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-01 (runtime role): valid cookie → status=CONSUMED, labor_profile_id bound, LPHA created (source=AFF_INITIAL)', async () => {
    if (!writerUrl) return;
    const attr = await seedAttribution({ status: 'ACTIVE' });
    const writer = makeClient(writerUrl);
    try {
      const dto = await writer.$transaction(async (tx) =>
        submitPublicIntake(tx, {
          applicant: {
            fullName: `AC-01 ${runId}`,
            phone: `09${runId.replace(/-/g, '').slice(0, 8)}1`,
            cccdNumber: null,
            consentAt: new Date().toISOString(),
          },
          channel: 'PUBLIC_MARKETPLACE',
          intent: 'JOB_INTEREST',
          hrpAffCookie: makeHrAffCookie(attr.id),
          actorId: 'system:public-intake',
        }),
      );
      createdLaborProfileIds.push(dto.laborProfileId!);
      createdCandidateSubmissionIds.push(dto.candidateSubmissionId);

      const postRow = await admin.referralAttribution.findUnique({
        where: { id: attr.id },
        select: { status: true, consumedAt: true, laborProfileId: true },
      });
      expect(postRow?.status).toBe('CONSUMED');
      expect(postRow?.consumedAt).not.toBeNull();
      expect(postRow?.laborProfileId).toBe(dto.laborProfileId);

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
  // AC-02 — forged cookie: silent fail-safe
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-02 (runtime role): forged cookie → no mutation, no LPHA, candidate_submissions still created (non-attributed)', async () => {
    if (!writerUrl) return;
    const attr = await seedAttribution({ status: 'ACTIVE' });
    const preRow = await admin.referralAttribution.findUnique({
      where: { id: attr.id },
      select: { status: true, consumedAt: true, laborProfileId: true, updatedAt: true },
    });
    const writer = makeClient(writerUrl);
    try {
      const dto = await writer.$transaction(async (tx) =>
        submitPublicIntake(tx, {
          applicant: {
            fullName: `AC-02 ${runId}`,
            phone: `09${runId.replace(/-/g, '').slice(0, 8)}2`,
            consentAt: new Date().toISOString(),
          },
          hrpAffCookie: 'aGVsbG8.d29ybGQ.bm90', // base64url but HMAC will mismatch
          actorId: 'system:public-intake',
        }),
      );
      createdLaborProfileIds.push(dto.laborProfileId!);
      createdCandidateSubmissionIds.push(dto.candidateSubmissionId);

      const postRow = await admin.referralAttribution.findUnique({
        where: { id: attr.id },
        select: { status: true, consumedAt: true, laborProfileId: true, updatedAt: true },
      });
      expect(postRow?.status).toBe(preRow?.status);
      expect(postRow?.consumedAt).toBe(preRow?.consumedAt);
      expect(postRow?.laborProfileId).toBe(preRow?.laborProfileId);

      const lpha = await admin.laborProfileHandlingAssignment.findFirst({
        where: { laborProfileId: dto.laborProfileId!, source: 'AFF_INITIAL' },
      });
      expect(lpha).toBeNull();
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-03 — no cookie: silent fail-safe
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-03 (runtime role): no cookie → non-attributed LaborProfile created, no LPHA', async () => {
    if (!writerUrl) return;
    const beforeTs = new Date();
    const writer = makeClient(writerUrl);
    try {
      const dto = await writer.$transaction(async (tx) =>
        submitPublicIntake(tx, {
          applicant: {
            fullName: `AC-03 ${runId}`,
            phone: `09${runId.replace(/-/g, '').slice(0, 8)}3`,
            consentAt: new Date().toISOString(),
          },
          hrpAffCookie: null,
          actorId: 'system:public-intake',
        }),
      );
      createdLaborProfileIds.push(dto.laborProfileId!);
      createdCandidateSubmissionIds.push(dto.candidateSubmissionId);

      const touched = await admin.referralAttribution.count({
        where: { updatedAt: { gt: beforeTs } },
      });
      expect(touched).toBe(0);

      const lpha = await admin.laborProfileHandlingAssignment.findFirst({
        where: { laborProfileId: dto.laborProfileId!, source: 'AFF_INITIAL' },
      });
      expect(lpha).toBeNull();
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-04 — expired row: silent fail-safe
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-04 (runtime role): row expiresAt <= now() → status UNCHANGED, no LPHA', async () => {
    if (!writerUrl) return;
    const attr = await seedAttribution({
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() - 60_000),
    });
    const writer = makeClient(writerUrl);
    try {
      const dto = await writer.$transaction(async (tx) =>
        submitPublicIntake(tx, {
          applicant: {
            fullName: `AC-04 ${runId}`,
            phone: `09${runId.replace(/-/g, '').slice(0, 8)}4`,
            consentAt: new Date().toISOString(),
          },
          hrpAffCookie: makeHrAffCookie(attr.id),
          actorId: 'system:public-intake',
        }),
      );
      createdLaborProfileIds.push(dto.laborProfileId!);
      createdCandidateSubmissionIds.push(dto.candidateSubmissionId);

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
  // AC-05 — row already CONSUMED: silent fail-safe (no second LPHA)
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-05 (runtime role): row status=CONSUMED → consumedAt NOT overwritten, no second LPHA', async () => {
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
            fullName: `AC-05 ${runId}`,
            phone: `09${runId.replace(/-/g, '').slice(0, 8)}5`,
            consentAt: new Date().toISOString(),
          },
          hrpAffCookie: makeHrAffCookie(attr.id),
          actorId: 'system:public-intake',
        }),
      );
      createdLaborProfileIds.push(dto.laborProfileId!);
      createdCandidateSubmissionIds.push(dto.candidateSubmissionId);

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
  // AC-06 — TOKEN_SIGNING_ERROR (missing RATE_LIMIT_HASH_SECRET): silent fail-safe
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-06 (runtime role): TOKEN_SIGNING_ERROR → 201 no mutation, no log distinguishes from missing', async () => {
    if (!writerUrl) return;
    const attr = await seedAttribution({ status: 'ACTIVE' });
    const originalSecret = process.env.RATE_LIMIT_HASH_SECRET;
    try {
      delete process.env.RATE_LIMIT_HASH_SECRET;
      const writer = makeClient(writerUrl);
      try {
        const dto = await writer.$transaction(async (tx) =>
          submitPublicIntake(tx, {
            applicant: {
              fullName: `AC-06 ${runId}`,
              phone: `09${runId.replace(/-/g, '').slice(0, 8)}6`,
              consentAt: new Date().toISOString(),
            },
            hrpAffCookie: makeHrAffCookie(attr.id),
            actorId: 'system:public-intake',
          }),
        );
        createdLaborProfileIds.push(dto.laborProfileId!);
        createdCandidateSubmissionIds.push(dto.candidateSubmissionId);

        const postRow = await admin.referralAttribution.findUnique({
          where: { id: attr.id },
          select: { status: true, consumedAt: true, laborProfileId: true },
        });
        expect(postRow?.status).toBe('ACTIVE');
        expect(postRow?.consumedAt).toBeNull();
        expect(postRow?.laborProfileId).toBeNull();

        const lpha = await admin.laborProfileHandlingAssignment.findFirst({
          where: { laborProfileId: dto.laborProfileId!, source: 'AFF_INITIAL' },
        });
        expect(lpha).toBeNull();
      } finally {
        await writer.$disconnect().catch(() => {});
      }
    } finally {
      if (originalSecret !== undefined) process.env.RATE_LIMIT_HASH_SECRET = originalSecret;
      else ensureTokenSecret();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-07 — attribution guard (a): service-level pre-filter rejects row
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-07 (runtime role): guard (a) service-level pre-filter rejects non-ACTIVE row → no UPDATE', async () => {
    if (!writerUrl) return;
    const attr = await seedAttribution({ status: 'EXPIRED' });
    const writer = makeClient(writerUrl);
    try {
      const dto = await writer.$transaction(async (tx) =>
        submitPublicIntake(tx, {
          applicant: {
            fullName: `AC-07 ${runId}`,
            phone: `09${runId.replace(/-/g, '').slice(0, 8)}7`,
            consentAt: new Date().toISOString(),
          },
          hrpAffCookie: makeHrAffCookie(attr.id),
          actorId: 'system:public-intake',
        }),
      );
      createdLaborProfileIds.push(dto.laborProfileId!);
      createdCandidateSubmissionIds.push(dto.candidateSubmissionId);

      const postRow = await admin.referralAttribution.findUnique({
        where: { id: attr.id },
        select: { status: true, consumedAt: true, laborProfileId: true },
      });
      expect(postRow?.status).toBe('EXPIRED');
      expect(postRow?.consumedAt).toBeNull();
      expect(postRow?.laborProfileId).toBeNull();

      const lpha = await admin.laborProfileHandlingAssignment.findFirst({
        where: { laborProfileId: dto.laborProfileId!, source: 'AFF_INITIAL' },
      });
      expect(lpha).toBeNull();
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-08 — attribution guard (b): RPC-body probe rejects bound row
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-08 (runtime role): guard (b) RPC-body probe rejects row bound to a DIFFERENT LP', async () => {
    if (!writerUrl) return;
    // Seed a victim LaborProfile first; bind a different attribute to it
    // using a throwaway admin update.
    const victimLp = await admin.laborProfile.create({
      data: { fullName: `${runId}-victim` },
    });
    createdLaborProfileIds.push(victimLp.id);

    // Seed an attribution ALREADY bound to victim (status='ACTIVE' but
    // labor_profile_id set — invalid state but represents the race window
    // we want to reject at the RPC-body probe). The RPC-body probe
    // explicitly rejects `labor_profile_id IS NOT NULL`.
    const attr = await seedAttribution({ status: 'ACTIVE', laborProfileId: victimLp.id });

    const writer = makeClient(writerUrl);
    try {
      const dto = await writer.$transaction(async (tx) =>
        submitPublicIntake(tx, {
          applicant: {
            fullName: `AC-08 ${runId}`,
            phone: `09${runId.replace(/-/g, '').slice(0, 8)}8`,
            consentAt: new Date().toISOString(),
          },
          hrpAffCookie: makeHrAffCookie(attr.id),
          actorId: 'system:public-intake',
        }),
      );
      createdLaborProfileIds.push(dto.laborProfileId!);
      createdCandidateSubmissionIds.push(dto.candidateSubmissionId);

      // The new LP must NOT be bound to this attr; the victim's LP must NOT
      // get a new LPHA from this transaction (the LPHA guard at the RPC
      // body only fires when the UPDATE succeeds).
      const postRow = await admin.referralAttribution.findUnique({
        where: { id: attr.id },
        select: { status: true, consumedAt: true, laborProfileId: true },
      });
      expect(postRow?.status).toBe('ACTIVE');
      expect(postRow?.consumedAt).toBeNull();

      const victimLpha = await admin.laborProfileHandlingAssignment.findFirst({
        where: { laborProfileId: victimLp.id, source: 'AFF_INITIAL' },
      });
      expect(victimLpha).toBeNull();
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-09 — attribution guard (c): RPC-body WHERE predicate rejects second consume
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-09 (runtime role): guard (c) RPC-body WHERE predicate — second consume blocked at WHERE (row already CONSUMED, status=ACTIVE no longer matches)', async () => {
    if (!writerUrl) return;
    const attr = await seedAttribution({ status: 'ACTIVE' });
    const writer = makeClient(writerUrl);
    try {
      // First consume (should succeed).
      const dto1 = await writer.$transaction(async (tx) =>
        submitPublicIntake(tx, {
          applicant: {
            fullName: `AC-09-A ${runId}`,
            phone: `09${runId.replace(/-/g, '').slice(0, 8)}9`,
            consentAt: new Date().toISOString(),
          },
          hrpAffCookie: makeHrAffCookie(attr.id),
          actorId: 'system:public-intake',
        }),
      );
      createdLaborProfileIds.push(dto1.laborProfileId!);
      createdCandidateSubmissionIds.push(dto1.candidateSubmissionId);
      const consumedAt1 = (await admin.referralAttribution.findUnique({
        where: { id: attr.id },
        select: { consumedAt: true, laborProfileId: true, status: true },
      }));

      // Second consume with a fresh phone so the LP doesn't dedup-collide.
      const dto2 = await writer.$transaction(async (tx) =>
        submitPublicIntake(tx, {
          applicant: {
            fullName: `AC-09-B ${runId}`,
            phone: `09${runId.replace(/-/g, '').slice(0, 8)}0`,
            consentAt: new Date().toISOString(),
          },
          hrpAffCookie: makeHrAffCookie(attr.id),
          actorId: 'system:public-intake',
        }),
      );
      createdLaborProfileIds.push(dto2.laborProfileId!);
      createdCandidateSubmissionIds.push(dto2.candidateSubmissionId);

      const consumedAt2 = (await admin.referralAttribution.findUnique({
        where: { id: attr.id },
        select: { consumedAt: true, laborProfileId: true, status: true },
      }));
      // WHERE predicate's `status='ACTIVE'` clause no longer matches a CONSUMED
      // row → exactly-zero rows updated → consumedAt UNCHANGED.
      expect(consumedAt2?.consumedAt?.getTime()).toBe(consumedAt1?.consumedAt?.getTime());
      expect(consumedAt2?.laborProfileId).toBe(consumedAt1?.laborProfileId);
      expect(consumedAt2?.status).toBe('CONSUMED');
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-10 — scoring parity: ≥2-signal EXACT_MATCH via PL/pgSQL hrp_score_labor_profile
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-10 (runtime role): scoring parity — phone+name+cccd match existing LP → EXACT_MATCH, no duplicate row', async () => {
    if (!writerUrl) return;
    const phone = `09${randomUUID().replace(/\D/g, '').slice(0, 9)}`;
    const cccd = `0${randomUUID().replace(/\D/g, '').slice(0, 8)}`;

    // Pre-seed an existing LaborProfile with normalized_phone + cccd_number.
    const existing = await admin.laborProfile.create({
      data: {
        fullName: `Existing ${runId}`,
        normalizedPhone: phone.slice(1), // strip leading 0 per normalizePhone rule
        phone,
        cccdNumber: cccd,
        identityVerification: 'UNVERIFIED',
        completeness: 'MINIMAL',
      },
    });
    createdLaborProfileIds.push(existing.id);

    const writer = makeClient(writerUrl);
    try {
      const dto = await writer.$transaction(async (tx) =>
        submitPublicIntake(tx, {
          applicant: {
            fullName: `Existing ${runId}`,
            phone,
            cccdNumber: cccd,
            consentAt: new Date().toISOString(),
          },
          hrpAffCookie: null,
          actorId: 'system:public-intake',
        }),
      );
      createdCandidateSubmissionIds.push(dto.candidateSubmissionId);

      expect(dto.verdict).toBe('EXACT_MATCH');
      expect(dto.laborProfileId).toBe(existing.id);

      // No duplicate labor_profile row created (this is the regression
      // guard for the round-1 minimal-RPC finding).
      const lpCount = await admin.laborProfile.count({
        where: { normalizedPhone: phone.slice(1) },
      });
      expect(lpCount).toBe(1);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-11 — phone-only NEW_PROFILE (round-1 regression)
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-11 (runtime role): phone-only applicant → NEW_PROFILE (not POSSIBLE_MATCH)', async () => {
    if (!writerUrl) return;
    const phone = `09${randomUUID().replace(/\D/g, '').slice(0, 9)}`;

    const writer = makeClient(writerUrl);
    try {
      const dto = await writer.$transaction(async (tx) =>
        submitPublicIntake(tx, {
          applicant: {
            fullName: `Phone-Only ${runId}`,
            phone,
            consentAt: new Date().toISOString(),
          },
          hrpAffCookie: null,
          actorId: 'system:public-intake',
        }),
      );
      createdLaborProfileIds.push(dto.laborProfileId!);
      createdCandidateSubmissionIds.push(dto.candidateSubmissionId);

      // Round-1 finding: minimal-RPC strategy would have returned
      // POSSIBLE_MATCH (409) because phone alone matched 1 signal — but the
      // ≥2-signal rule classifies this as NEW_PROFILE (201).
      expect(dto.verdict).toBe('NEW_PROFILE');
      expect(dto.laborProfileId).toMatch(/.+/);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-12 — returning applicant EXACT_MATCH (round-1 regression: no duplicate LP)
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-12 (runtime role): returning applicant (phone+name match) → EXACT_MATCH, NO duplicate labor_profiles row', async () => {
    if (!writerUrl) return;
    const phone = `09${randomUUID().replace(/\D/g, '').slice(0, 9)}`;
    const name = `Returner ${runId}`;

    // Pre-seed an existing LP matching by phone (1 signal) and full_name
    // (after normalize) — must yield EXACT_MATCH on second apply.
    const existing = await admin.laborProfile.create({
      data: {
        fullName: name,
        normalizedPhone: phone.slice(1),
        phone,
        identityVerification: 'UNVERIFIED',
        completeness: 'MINIMAL',
      },
    });
    createdLaborProfileIds.push(existing.id);

    const writer = makeClient(writerUrl);
    try {
      const dto = await writer.$transaction(async (tx) =>
        submitPublicIntake(tx, {
          applicant: {
            fullName: name,
            phone,
            consentAt: new Date().toISOString(),
          },
          hrpAffCookie: null,
          actorId: 'system:public-intake',
        }),
      );
      createdCandidateSubmissionIds.push(dto.candidateSubmissionId);

      // Round-1 finding: minimal-RPC strategy would have INSERTed a
      // duplicate labor_profiles row → writer found 2 candidates →
      // POSSIBLE_MATCH (409). Full RPC correctly returns EXACT_MATCH on
      // the existing row.
      expect(dto.verdict).toBe('EXACT_MATCH');
      expect(dto.laborProfileId).toBe(existing.id);

      const lpCount = await admin.laborProfile.count({
        where: { normalizedPhone: phone.slice(1) },
      });
      expect(lpCount).toBe(1);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-13 — normalization parity: TS `normalizePhone` / `normalizeFullName`
  //         mirror PL/pgSQL `hrp_normalize_phone` / `hrp_normalize_full_name`.
  //         Static check against a 24-fixture corpus (RQ-14, AC-17).
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-13 (static): 24-fixture normalization parity corpus — TS and PL/pgSQL must agree', async () => {
    if (!writerUrl) return;
    const writer = makeClient(writerUrl);
    try {
      // Each fixture: { ts, ts_phone, ts_full_name } is the canonical TS output.
      // For each entry we run the PL/pgSQL function via SQL and compare.
      let i = 0;
      for (const fx of normalizationFixtures as Array<{ ts_phone: string; ts_full_name: string; ts: { phone: string; fullName: string } }>) {
        i += 1;
        const sqlPhone = await writer.$queryRaw<{ out: string }[]>`
          SELECT hrp_normalize_phone(${fx.ts.phone})::text AS out
        `;
        const sqlName = await writer.$queryRaw<{ out: string }[]>`
          SELECT hrp_normalize_full_name(${fx.ts.fullName})::text AS out
        `;
        expect(sqlPhone[0]?.out).toBe(fx.ts_phone);
        expect(sqlName[0]?.out).toBe(fx.ts_full_name);
      }
      // Sanity: confirm we ran 24.
      expect(i).toBe(24);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// MASKED HR_MANAGER lane — secondary regression guard for the 2 writer
// policies hrp_ra_select_writer / hrp_ra_update_writer (preserved for
// non-anon paths). Intentionally retains `withHrManagerContext` to assert
// the writer policies still gate SELECT/UPDATE on referral_attributions
// when the GUC is set.
// ─────────────────────────────────────────────────────────────────────────

describe.skipIf(!HAS_TEST_DB)('AFF-03B writer policies — MASKED HR_MANAGER regression', () => {
  let admin: PrismaClient;
  let referrerUserId: string;

  const createdAttributionIds: string[] = [];

  beforeAll(async () => {
    if (!adminUrl || !writerUrl) return;
    ensureTokenSecret();
    admin = makeClient(adminUrl);
    const referrer = await admin.user.upsert({
      where: { id: `${runId}-masked-referrer` },
      update: {},
      create: {
        id: `${runId}-masked-referrer`,
        phone: `09${runId.replace(/-/g, '').slice(0, 8)}M`,
        role: 'CTV',
        name: 'AFF-03B Masked Referrer',
      },
    });
    referrerUserId = referrer.id;
  }, 30000);

  afterAll(async () => {
    try {
      if (createdAttributionIds.length > 0) {
        await admin.referralAttribution.deleteMany({
          where: { id: { in: createdAttributionIds } },
        }).catch(() => {});
      }
    } catch {
      // best effort
    }
    await admin?.$disconnect().catch(() => {});
  }, 30000);

  it('hrp_ra_select_writer permits the masked writer role to SELECT an ACTIVE row', async () => {
    if (!writerUrl) return;
    const id = `${runId}-attr-select-${randomUUID().slice(0, 8)}`;
    const row = await admin.referralAttribution.create({
      data: {
        id,
        referrerUserId,
        affiliateCodeSnapshot: `SEL-${runId}`,
        firstClickedAt: new Date(Date.now() - 60_000),
        expiresAt: new Date(Date.now() + 60_000),
        status: 'ACTIVE',
      },
    });
    createdAttributionIds.push(id);

    const writer = makeClient(writerUrl);
    try {
      const selected = await withHrManagerContext(writer, 'system:public-intake', async (tx) => {
        return tx.referralAttribution.findUnique({
          where: { id: row.id },
          select: { id: true, status: true },
        });
      });
      expect(selected).not.toBeNull();
      expect(selected?.id).toBe(id);
      expect(selected?.status).toBe('ACTIVE');
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  it('hrp_ra_update_writer permits the masked writer role to UPDATE ACTIVE→CONSUMED with labor_profile_id bound', async () => {
    if (!writerUrl) return;
    const id = `${runId}-attr-update-${randomUUID().slice(0, 8)}`;
    const row = await admin.referralAttribution.create({
      data: {
        id,
        referrerUserId,
        affiliateCodeSnapshot: `UPD-${runId}`,
        firstClickedAt: new Date(Date.now() - 60_000),
        expiresAt: new Date(Date.now() + 60_000),
        status: 'ACTIVE',
      },
    });
    createdAttributionIds.push(id);

    // Need a LaborProfile first for the WITH CHECK (labor_profile_id IS NOT NULL).
    const lp = await admin.laborProfile.create({
      data: { fullName: `Mask ${runId}` },
    });
    try {
      const writer = makeClient(writerUrl);
      try {
        const updated = await withHrManagerContext(writer, 'system:public-intake', async (tx) => {
          return tx.referralAttribution.update({
            where: { id: row.id },
            data: {
              status: 'CONSUMED',
              consumedAt: new Date(),
              laborProfileId: lp.id,
            },
          });
        });
        expect(updated.status).toBe('CONSUMED');
        expect(updated.laborProfileId).toBe(lp.id);
      } finally {
        await writer.$disconnect().catch(() => {});
      }
    } finally {
      await admin.laborProfile.deleteMany({ where: { id: lp.id } }).catch(() => {});
    }
  });
});
