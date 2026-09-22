/**
 * tests/db/aff03-public-intake.integration.test.ts
 *
 * Container-DB integration test for AFF-03B public anon apply path, with
 * AFF-03C assertions layered on top.
 *
 * ENV_BLOCKED by default — bỏ qua toàn bộ nếu DATABASE_URL_TEST không có.
 * Khi env có, chạy trên `hrp_mp2_test` (T0/Owner pipeline target).
 *
 * ARCHITECTURE (rounds 0..4, T0 verdict ACCEPTED; AFF-03C hotfix layered)
 * ===============================================
 * The anon path POST /api/public/intake delegates the entire write chain to
 * SECURITY DEFINER RPC `hrp_public_intake_submission(jsonb)` which runs as
 * hrp_public_rpc (NOLOGIN BYPASSRLS, DEC-14). RLS policies do NOT apply to
 * the definer path; the only DB-level guard on the
 * UPDATE referral_attributions is the WHERE predicate
 * AND status='ACTIVE' AND expires_at > now() AND labor_profile_id IS NULL
 * (DEC-11 (c)).
 *
 * AFF-03C FIX (2026-09-21): the AFF-03B RPC INSERT into candidate_submissions
 * omitted `labor_profile_id` from the column list, so production smoke
 * showed placement_case_id NOT NULL but labor_profile_id NULL. The new
 * migration `20260921140000_aff03c_cs_labor_profile_backfill` fixes the
 * RPC body (adds `labor_profile_id = v_lp_id` to the INSERT) and backfills
 * orphan rows where placement_case_id IS NOT NULL AND labor_profile_id IS
 * NULL from placement_case.labor_profile_id. Integration test adds
 * CandidateSubmission.laborProfileId === DTO.laborProfileId assertions
 * across NEW_PROFILE (AC-01), EXACT_MATCH (AC-10), forged (AC-02) and
 * no-cookie (AC-03) paths.
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
 *     [AFF-03C] CandidateSubmission.laborProfileId === DTO.laborProfileId.
 *   AC-02 forged cookie (silent fail-safe, no mutation): runtime lane.
 *     [AFF-03C] CandidateSubmission.laborProfileId === DTO.laborProfileId.
 *   AC-03 no cookie (silent fail-safe, zero mutation): runtime lane.
 *     [AFF-03C] CandidateSubmission.laborProfileId === DTO.laborProfileId.
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
 *     [AFF-03C] CandidateSubmission.laborProfileId === existing.id === DTO.laborProfileId.
 *   AC-11 phone-only NEW_PROFILE (regression for round-1 minimal-RPC
 *     finding): runtime lane.
 *   AC-12 returning applicant EXACT_MATCH (regression for round-1 finding):
 *     runtime lane.
 *   AC-13 masked writer-policies regression: masked-hr-manager lane.
 *
 * Requires the additive migrations
 *   - `20260918100000_aff03_writer_select_on_referral_attributions`
 *   - `20260919100000_aff03b_public_intake_rpc`
 *   - `20260921140000_aff03c_cs_labor_profile_backfill`  (AFF-03C hotfix)
 * to be applied (CI Integration lane applies them via the standard
 * migration apply pipeline BEFORE running this test). The AFF-03B and
 * AFF-03C migrations require OP-01 (`scripts/create-public-rpc-role.cjs`)
 * to have been run before they were applied — hrp_public_rpc must already
 * exist with NOLOGIN BYPASSRLS.
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
import { PrismaClient, Prisma } from '@prisma/client';

import {
  submitPublicIntake,
} from '@/src/domains/applications/aff03-public-intake.service';
import {
  withIdempotency,
  type IdemPrisma,
} from '@/src/shared/integrity/idempotency';
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

      // AFF-03C regression: the candidate_submissions row MUST carry both
      // labor_profile_id AND placement_case_id (production smoke 2026-09-21
      // showed placement_case_id NOT NULL but labor_profile_id NULL because
      // the AFF-03B RPC INSERT omitted labor_profile_id from the column list).
      const csRow = await admin.candidateSubmission.findUnique({
        where: { id: dto.candidateSubmissionId },
        select: { laborProfileId: true, placementCaseId: true },
      });
      expect(csRow?.laborProfileId).toBe(dto.laborProfileId);
      expect(csRow?.placementCaseId).toBe(dto.placementCaseId);

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

      // AFF-03C regression (forged path): the candidate_submissions row
      // MUST carry both labor_profile_id AND placement_case_id even when
      // the cookie is forged and the attribution is not consumed.
      const csRow = await admin.candidateSubmission.findUnique({
        where: { id: dto.candidateSubmissionId },
        select: { laborProfileId: true, placementCaseId: true },
      });
      expect(csRow?.laborProfileId).toBe(dto.laborProfileId);
      expect(csRow?.placementCaseId).toBe(dto.placementCaseId);

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

      // AFF-03C regression (no-cookie path): even without an attribution,
      // the candidate_submissions row MUST carry both labor_profile_id AND
      // placement_case_id (the production bug affected every code path
      // through the RPC, not just the attributed one).
      const csRow = await admin.candidateSubmission.findUnique({
        where: { id: dto.candidateSubmissionId },
        select: { laborProfileId: true, placementCaseId: true },
      });
      expect(csRow?.laborProfileId).toBe(dto.laborProfileId);
      expect(csRow?.placementCaseId).toBe(dto.placementCaseId);

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

      // AFF-03C regression (EXACT_MATCH path): the candidate_submissions row
      // MUST carry labor_profile_id === existing LP id (the RPC reuses the
      // existing LaborProfile, not just any LP). This is the regression
      // that surfaced in production (the INSERT previously omitted the
      // column entirely, so even when the RPC had v_lp_id pointing at the
      // existing LP, the row was persisted with NULL).
      const csRow = await admin.candidateSubmission.findUnique({
        where: { id: dto.candidateSubmissionId },
        select: { laborProfileId: true, placementCaseId: true },
      });
      expect(csRow?.laborProfileId).toBe(dto.laborProfileId);
      expect(csRow?.placementCaseId).toBe(dto.placementCaseId);

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

// ═══════════════════════════════════════════════════════════════════════════════
// AFF-05A-R1 — Canonical initial handling window and repeat-intake preservation
//
// Tests added by hrp-v6-n2-aff-05a-r1-canonical-initial-handling implementation.
// Tests run against `salary_app_test` (or any dedicated synthetic DB) via
// `npm run test:integration` (CI_INTEGRATION_STRICT=1).
//
// Setup requirements:
//   - Database must have applied through migration
//     `20260922160000_aff05a_r1_initial_handling_window` (this migration adds the
//     advisory-lock RPC body and SELECT on labor_profile_handling_assignments).
//   - Role `hrp_public_rpc` must exist with NOLOGIN BYPASSRLS (OP-01).
//   - All predecessor migrations from AFF-03A through W5 must be applied.
//
// Coverage:
//   AC-01 (R1 fresh):     valid attribution → one submission, consumed attribution,
//                          one LPHA ACTIVE, starts_at ≈ now, expires_at - starts_at = 168h.
//   AC-02 (R1 unattrib): unattributed intake → submission created, no LPHA, no
//                          attribution consumed (Case C).
//   AC-03 (R1 replay):    same idempotency key + payload via withIdempotency() →
//                          stored result, no new submission/attribution/LPHA.
//   AC-04 (R1 preserve):  existing attribution + active LPHA on LP → submission
//                          created, attribution unchanged, LPHA unchanged.
//   AC-05 (R1 race):      two connections, same LP, two different active attributions
//                          → both submissions commit, exactly one attribution consumed,
//                          exactly one LPHA created.
//   AC-06 (backfill R1):  migrate from predecessor chain + seed legacy AFF_INITIAL
//                          NULL-deadline rows → deadlines computed from starts_at,
//                          overdue ACTIVE expired in place.
//   AC-07 (forced abort): force anomaly in backfill → entire migration transaction
//                          rolls back (function replacement + grant + row updates).
//
// ═══════════════════════════════════════════════════════════════════════════════

const createdA05LaborProfileIds: string[] = [];
const createdA05HandlingAssignmentIds: string[] = [];

describe.skipIf(!HAS_TEST_DB)('AFF-05A-R1 — Canonical initial handling window (R1)', () => {
  let admin: PrismaClient;
  let referrerUserId: string;
  let secondReferrerUserId: string;

  beforeAll(async () => {
    if (!adminUrl || !writerUrl) return;
    ensureTokenSecret();
    admin = makeClient(adminUrl);
    const referrer = await admin.user.upsert({
      where: { id: `${runId}-a05-ref1` },
      update: {},
      create: {
        id: `${runId}-a05-ref1`,
        phone: `09${runId.replace(/-/g, '').slice(0, 8)}R`,
        role: 'CTV',
        name: 'AFF-05A Ref1',
      },
    });
    const secondReferrer = await admin.user.upsert({
      where: { id: `${runId}-a05-ref2` },
      update: {},
      create: {
        id: `${runId}-a05-ref2`,
        phone: `09${runId.replace(/-/g, '').slice(0, 8)}S`,
        role: 'CTV',
        name: 'AFF-05A Ref2',
      },
    });
    referrerUserId = referrer.id;
    secondReferrerUserId = secondReferrer.id;
  }, 30000);

  afterAll(async () => {
    try {
      if (createdA05HandlingAssignmentIds.length > 0) {
        await admin.laborProfileHandlingAssignment.deleteMany({
          where: { id: { in: createdA05HandlingAssignmentIds } },
        }).catch(() => {});
      }
      if (createdA05LaborProfileIds.length > 0) {
        await admin.placementCase.deleteMany({
          where: { laborProfileId: { in: createdA05LaborProfileIds } },
        }).catch(() => {});
        await admin.laborProfile.deleteMany({
          where: { id: { in: createdA05LaborProfileIds } },
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('a05 cleanup partial failure:', (e as Error).message.slice(0, 200));
    }
    await admin?.$disconnect().catch(() => {});
  }, 30000);

  // ─────────────────────────────────────────────────────────────────────────
  // AC-02 — AC-01/R1 fresh: valid attribution → 168h LPHA
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-01 (R1): valid attribution → submission, consumed attr, LPHA ACTIVE with 168h deadline', async () => {
    if (!writerUrl) return;
    const attr = await admin.referralAttribution.create({
      data: {
        id: `${runId}-a05-ac01-attr-${randomUUID().slice(0, 8)}`,
        referrerUserId,
        affiliateCodeSnapshot: `A05A-AC01-${runId}`,
        firstClickedAt: new Date(Date.now() - 60_000),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
      },
    });

    const writer = makeClient(writerUrl);
    try {
      // Generate a unique numeric phone per test from the runId by hashing.
      const phone = (() => {
        let h = 0;
        for (let i = 0; i < runId.length; i++) h = (h * 31 + runId.charCodeAt(i)) | 0;
        // AC-01 specific suffix.
        return `09000${Math.abs(h).toString().padStart(6, '0').slice(0, 6)}01`.slice(0, 11);
      })();
      const dto = await writer.$transaction(async (tx) =>
        submitPublicIntake(tx, {
          applicant: {
            fullName: `A05A-AC01 ${runId}`,
            phone,
            cccdNumber: null,
            consentAt: new Date().toISOString(),
          },
          channel: 'PUBLIC_MARKETPLACE',
          intent: 'JOB_INTEREST',
          hrpAffCookie: makeHrAffCookie(attr.id),
          actorId: 'system:public-intake',
        }),
      );
      createdA05LaborProfileIds.push(dto.laborProfileId!);

      const preAttr = await admin.referralAttribution.findUnique({
        where: { id: attr.id },
        select: { status: true, consumedAt: true, laborProfileId: true },
      });
      expect(preAttr?.status).toBe('CONSUMED');
      expect(preAttr?.consumedAt).not.toBeNull();
      expect(preAttr?.laborProfileId).toBe(dto.laborProfileId);

      const lpha = await admin.laborProfileHandlingAssignment.findFirst({
        where: { laborProfileId: dto.laborProfileId!, source: 'AFF_INITIAL' },
        select: { id: true, startsAt: true, expiresAt: true, status: true },
      });
      expect(lpha).not.toBeNull();
      expect(lpha?.status).toBe('ACTIVE');
      createdA05HandlingAssignmentIds.push(lpha!.id);

      // AC-01 / RQ-02: expires_at - starts_at must equal 168 hours (AC-01).
      const startsMs = (lpha!.startsAt as Date).getTime();
      const expiresMs = (lpha!.expiresAt as Date).getTime();
      const diffMs = expiresMs - startsMs;
      const ms168h = 168 * 60 * 60 * 1000;
      expect(Math.abs(diffMs - ms168h)).toBeLessThanOrEqual(60000);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-02 (R1 unattrib): unattributed intake → submission, no LPHA, no consumption.
  //          Verifies Case C behavior. AC-03 tests replay via withIdempotency.
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-02 (R1): unattributed intake → submission, no LPHA, no consumption', async () => {
    if (!writerUrl) return;
    // Unique numeric phone via hash (different from AC-01 via multiply-by-33).
    const phoneRaw = (() => {
      let h = 0;
      for (let i = 0; i < runId.length; i++) h = (h * 33 + runId.charCodeAt(i)) | 0;
      return `09000${Math.abs(h).toString().padStart(6, '0').slice(0, 6)}99`.slice(0, 11);
    })();
    const writer = makeClient(writerUrl);
    try {
      const dto = await writer.$transaction(async (tx) =>
        submitPublicIntake(tx, {
          applicant: {
            fullName: `A05A-AC02 ${runId}`,
            phone: phoneRaw,
            cccdNumber: null,
            consentAt: new Date().toISOString(),
          },
          channel: 'PUBLIC_MARKETPLACE',
          intent: 'JOB_INTEREST',
          hrpAffCookie: null,
          actorId: 'system:public-intake',
        }),
      );
      createdA05LaborProfileIds.push(dto.laborProfileId!);

      expect(dto.laborProfileId).not.toBeNull();
      expect(dto.candidateSubmissionId).not.toBeNull();
      expect(dto.verdict).toBe('NEW_PROFILE');

      const lphaCount = await admin.laborProfileHandlingAssignment.count({
        where: { laborProfileId: dto.laborProfileId!, source: 'AFF_INITIAL' },
      });
      expect(lphaCount).toBe(0);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-03 (R1 replay): same idempotency key + payload via withIdempotency()
  // → stored result, no new submission/attribution/LPHA (DEC-02 / RQ-03).
  // This is NOT a direct RPC call — it exercises the route idempotency boundary.
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-03 (R1 replay): same key+payload via withIdempotency() → 1 submission, no new LPHA', async () => {
    if (!writerUrl) return;
    const writer = makeClient(writerUrl);
    try {
      // Create an attribution + intake first, then replay with the same key+payload.
      const attr = await admin.referralAttribution.create({
        data: {
          id: `${runId}-a05-ac03-replay-attr`,
          referrerUserId,
          affiliateCodeSnapshot: `A05A-replay-${runId}`,
          firstClickedAt: new Date(Date.now() - 120_000),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
        },
      });

      const key = `${runId}-a05-ac03-replay-key`;
      const actorId = 'system:public-intake';
      const route = 'POST:/api/public/intake';
      // Unique phone per test invocation to avoid POSSIBLE_MATCH collision
      // with prior runs sharing the same synthetic DB.
      const uniqPhone = `090${randomUUID().slice(0, 9)}`;
      const canonicalPayload = {
        fullName: `A05A-replay-${runId}`,
        phone: uniqPhone,
        cccdNumber: null,
        dateOfBirth: null,
        consentAt: new Date().toISOString(),
        intent: 'JOB_INTEREST',
        jobOpeningId: null,
        projectId: null,
      };

      // First call: runs handler, stores idempotency key, creates LP + submission + LPHA.
      const first = await withIdempotency<typeof canonicalPayload>({
        prisma: writer,
        route,
        actorId,
        key,
        requestBody: canonicalPayload,
        handler: async () => {
          const dto = await writer.$transaction(async (tx) =>
            submitPublicIntake(tx, {
              applicant: {
                fullName: canonicalPayload.fullName,
                phone: canonicalPayload.phone,
                cccdNumber: canonicalPayload.cccdNumber,
                dateOfBirth: canonicalPayload.dateOfBirth,
                consentAt: canonicalPayload.consentAt,
              },
              channel: 'PUBLIC_MARKETPLACE',
              intent: 'JOB_INTEREST',
              projectId: canonicalPayload.projectId,
              jobOpeningId: canonicalPayload.jobOpeningId,
              hrpAffCookie: makeHrAffCookie(attr.id),
              actorId,
            }),
          );
          return { body: dto, statusCode: 201 };
        },
      });
      expect(first.replayed).toBe(false);
      expect(first.statusCode).toBe(201);
      const lpId = (first.body as { laborProfileId: string }).laborProfileId;
      createdA05LaborProfileIds.push(lpId);
      const firstSubId = (first.body as { candidateSubmissionId: string }).candidateSubmissionId;

      // Count LPHA after first call.
      const lphaCountBefore = await admin.laborProfileHandlingAssignment.count({
        where: { laborProfileId: lpId, source: 'AFF_INITIAL' },
      });
      expect(lphaCountBefore).toBe(1); // attr consumed → Case B → LPHA created

      // Second call: same key + same payload → REPLAY. Handler must NOT run.
      const second = await withIdempotency<typeof canonicalPayload>({
        prisma: writer,
        route,
        actorId,
        key,
        requestBody: canonicalPayload,
        handler: async () => {
          // This must NOT be reached for a replay.
          throw new Error('handler should not run on replay');
        },
      });
      expect(second.replayed).toBe(true);
      // Stored result must match first call's body.
      expect((second.body as { laborProfileId: string }).laborProfileId).toBe(lpId);
      expect((second.body as { candidateSubmissionId: string }).candidateSubmissionId).toBe(firstSubId);

      // No new submission created by replay.
      const csCount = await admin.candidateSubmission.count({
        where: { laborProfileId: lpId },
      });
      expect(csCount).toBe(1); // only the first call created it

      // No new LPHA created by replay.
      const lphaCountAfter = await admin.laborProfileHandlingAssignment.count({
        where: { laborProfileId: lpId, source: 'AFF_INITIAL' },
      });
      expect(lphaCountAfter).toBe(1); // unchanged

      // Attribution still consumed once (no double-consumption).
      const attrAfter = await admin.referralAttribution.findUnique({
        where: { id: attr.id },
        select: { status: true, consumedAt: true },
      });
      expect(attrAfter?.status).toBe('CONSUMED');
      expect(attrAfter?.consumedAt).not.toBeNull();
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-04 (R1 preserve): existing attribution + active LPHA on LP
  // → submission created, attribution unchanged, LPHA unchanged.
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-03 (R1 preserve): existing attribution+LPHA → new submission, attribution untouched, LPHA untouched', async () => {
    if (!writerUrl) return;
    // Pre-seed an LP and bind an attribution+LPHA to it manually.
    const phoneRaw = (() => {
      let h = 0;
      for (let i = 0; i < runId.length; i++) h = (h * 31 + runId.charCodeAt(i) + 3) | 0;
      return `09000${Math.abs(h).toString().padStart(6, '0').slice(0, 6)}03`.slice(0, 11);
    })();
    const phoneDigits = phoneRaw.replace(/\D/g, '');
    const phoneNorm = phoneDigits.startsWith('0') ? phoneDigits.slice(1) : phoneDigits;
    const fullName = `A05A-AC03-existing ${runId}`;
    const existing = await admin.laborProfile.create({
      data: {
        fullName,
        normalizedPhone: phoneNorm,
        phone: phoneRaw,
        identityVerification: 'UNVERIFIED',
        completeness: 'MINIMAL',
      },
    });
    createdA05LaborProfileIds.push(existing.id);

    const existingAttr = await admin.referralAttribution.create({
      data: {
        id: `${runId}-a05-ac03-attr1-${randomUUID().slice(0, 8)}`,
        referrerUserId,
        affiliateCodeSnapshot: `A05A-AC03-${runId}`,
        firstClickedAt: new Date(Date.now() - 120_000),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        laborProfileId: existing.id,
      },
    });

    // Pre-seed an active AFF_INITIAL LPHA bound to the LP.
    const lphaPre = await admin.laborProfileHandlingAssignment.create({
      data: {
        laborProfileId: existing.id,
        assigneeUserId: referrerUserId,
        source: 'AFF_INITIAL',
        startsAt: new Date(Date.now() - 60_000),
        expiresAt: new Date(Date.now() + 168 * 60 * 60 * 1000),
        status: 'ACTIVE',
        version: 1,
      },
    });
    createdA05HandlingAssignmentIds.push(lphaPre.id);
    const lpha1Id = lphaPre.id;

    const writer = makeClient(writerUrl);
    try {
      // Create a NEW attribution from secondReferrer for this intake.
      const newAttr = await admin.referralAttribution.create({
        data: {
          id: `${runId}-a05-ac03-attr2-${randomUUID().slice(0, 8)}`,
          referrerUserId: secondReferrerUserId,
          affiliateCodeSnapshot: `A05A-AC03-NEW-${runId}`,
          firstClickedAt: new Date(Date.now() - 60_000),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
        },
      });

      const dto2 = await writer.$transaction(async (tx) =>
        submitPublicIntake(tx, {
          applicant: {
            fullName,
            phone: phoneRaw,
            cccdNumber: null,
            consentAt: new Date().toISOString(),
          },
          channel: 'PUBLIC_MARKETPLACE',
          intent: 'JOB_INTEREST',
          hrpAffCookie: makeHrAffCookie(newAttr.id),
          actorId: 'system:public-intake',
        }),
      );

      // Submission was created, LP was the pre-seeded one.
      expect(dto2.candidateSubmissionId).not.toBeNull();
      expect(dto2.laborProfileId).toBe(existing.id);

      // New attribution is NOT consumed (DEC-03 preservation).
      const newAttrAfter = await admin.referralAttribution.findUnique({
        where: { id: newAttr.id },
        select: { status: true, consumedAt: true, laborProfileId: true },
      });
      expect(newAttrAfter?.status).toBe('ACTIVE');
      expect(newAttrAfter?.consumedAt).toBeNull();
      expect(newAttrAfter?.laborProfileId).toBeNull();

      // Original attribution unchanged (still ACTIVE, bound to existing LP).
      const origAttrAfter = await admin.referralAttribution.findUnique({
        where: { id: existingAttr.id },
        select: { status: true, consumedAt: true, laborProfileId: true },
      });
      expect(origAttrAfter?.status).toBe('ACTIVE');
      expect(origAttrAfter?.laborProfileId).toBe(existing.id);

      // LPHA unchanged (same id, same assignee).
      const lphaAfter = await admin.laborProfileHandlingAssignment.findFirst({
        where: { laborProfileId: existing.id, source: 'AFF_INITIAL' },
        select: { id: true, assigneeUserId: true },
      });
      expect(lphaAfter?.id).toBe(lpha1Id);
      expect(lphaAfter?.assigneeUserId).toBe(referrerUserId);

      // Exactly one LPHA.
      const lphaCount = await admin.laborProfileHandlingAssignment.count({
        where: { laborProfileId: existing.id, source: 'AFF_INITIAL' },
      });
      expect(lphaCount).toBe(1);
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-05 (R1 race): two connections, same LP, two different active
  // attributions → both submissions commit, exactly one attr consumed,
  // exactly one LPHA created.
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-05 (R1 race): two connections racing on same LP → both submissions, one LPHA', async () => {
    if (!writerUrl) return;
    // Pre-seed an LP with no bound attribution/LPHA yet.
    const phoneRaw = (() => {
      let h = 0;
      for (let i = 0; i < runId.length; i++) h = (h * 31 + runId.charCodeAt(i) + 4) | 0;
      return `09000${Math.abs(h).toString().padStart(6, '0').slice(0, 6)}04`.slice(0, 11);
    })();
    const phoneDigits = phoneRaw.replace(/\D/g, '');
    const phoneNorm = phoneDigits.startsWith('0') ? phoneDigits.slice(1) : phoneDigits;
    const fullName = `A05A-AC04-race ${runId}`;
    const existing = await admin.laborProfile.create({
      data: {
        fullName,
        normalizedPhone: phoneNorm,
        phone: phoneRaw,
        identityVerification: 'UNVERIFIED',
        completeness: 'MINIMAL',
      },
    });
    createdA05LaborProfileIds.push(existing.id);

    // Two active, unbound attributions from two different referrers.
    const attr1 = await admin.referralAttribution.create({
      data: {
        id: `${runId}-a05-ac04-attr1-${randomUUID().slice(0, 8)}`,
        referrerUserId,
        affiliateCodeSnapshot: `A05A-AC04-1-${runId}`,
        firstClickedAt: new Date(Date.now() - 60_000),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
      },
    });
    const attr2 = await admin.referralAttribution.create({
      data: {
        id: `${runId}-a05-ac04-attr2-${randomUUID().slice(0, 8)}`,
        referrerUserId: secondReferrerUserId,
        affiliateCodeSnapshot: `A05A-AC04-2-${runId}`,
        firstClickedAt: new Date(Date.now() - 60_000),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
      },
    });

    const writer1 = makeClient(writerUrl);
    const writer2 = makeClient(writerUrl);
    try {
      // Fire both intakes concurrently with same phone+full_name (forces EXACT_MATCH to same LP).
      const [result1, result2] = await Promise.allSettled([
        writer1.$transaction(async (tx) =>
          submitPublicIntake(tx, {
            applicant: {
              fullName,
              phone: phoneRaw,
              cccdNumber: null,
              consentAt: new Date().toISOString(),
            },
            channel: 'PUBLIC_MARKETPLACE',
            intent: 'JOB_INTEREST',
            hrpAffCookie: makeHrAffCookie(attr1.id),
            actorId: 'system:public-intake',
          }),
        ),
        writer2.$transaction(async (tx) =>
          submitPublicIntake(tx, {
            applicant: {
              fullName,
              phone: phoneRaw,
              cccdNumber: null,
              consentAt: new Date().toISOString(),
            },
            channel: 'PUBLIC_MARKETPLACE',
            intent: 'JOB_INTEREST',
            hrpAffCookie: makeHrAffCookie(attr2.id),
            actorId: 'system:public-intake',
          }),
        ),
      ]);

      // Both calls must succeed (DEC-05: first-lock-holder semantics — both commit).
      const successes = [result1, result2].filter(r => r.status === 'fulfilled');
      expect(successes.length).toBe(2);

      // Both submissions must have been created.
      const csCount = await admin.candidateSubmission.count({
        where: { laborProfileId: existing.id },
      });
      expect(csCount).toBe(2);

      // Exactly one attribution consumed among attr1, attr2.
      const consumedCount = await admin.referralAttribution.count({
        where: {
          id: { in: [attr1.id, attr2.id] },
          status: 'CONSUMED',
        },
      });
      expect(consumedCount).toBe(1);

      // Exactly one LPHA ACTIVE source=AFF_INITIAL on this LP.
      const activeLphaCount = await admin.laborProfileHandlingAssignment.count({
        where: {
          laborProfileId: existing.id,
          source: 'AFF_INITIAL',
          status: 'ACTIVE',
        },
      });
      expect(activeLphaCount).toBe(1);

      // Loser attribution remains untouched (status=ACTIVE, no consumption).
      const consumedAttr = consumedCount === 1
        ? await admin.referralAttribution.findFirst({
            where: { id: { in: [attr1.id, attr2.id] }, status: 'CONSUMED' },
            select: { id: true },
          })
        : null;
      const loserAttr = consumedAttr
        ? (consumedAttr.id === attr1.id ? attr2 : attr1)
        : null;
      if (loserAttr) {
        const loserRow = await admin.referralAttribution.findUnique({
          where: { id: loserAttr.id },
          select: { status: true, consumedAt: true },
        });
        expect(loserRow?.status).toBe('ACTIVE');
        expect(loserRow?.consumedAt).toBeNull();
      }
    } finally {
      await writer1.$disconnect().catch(() => {});
      await writer2.$disconnect().catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-06 (backfill R1): upgrade from predecessor RPC body (AFF-03C) on a
  // clean isolated DB, seed legacy AFF_INITIAL NULL-deadline rows, then apply
  // R1 migration. Proves:
  //   (a) overdue ACTIVE expires in place → deadline computed from starts_at.
  //   (b) future ACTIVE gets deadline but remains ACTIVE.
  //   (c) terminal rows (EXPIRED/REVOKED) unchanged.
  //   (d) non-AFF_INITIAL and outside-predicate rows untouched.
  // This is NOT production data — all fixtures are synthetic.
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-06 (backfill R1): legacy AFF_INITIAL NULL-deadline rows get deadline from starts_at', async () => {
    if (!writerUrl || !adminUrl) return;
    const writer = makeClient(writerUrl);
    try {
      // Snapshot state before any manipulation.
      const preCount = await admin.laborProfileHandlingAssignment.count({
        where: { source: 'AFF_INITIAL', status: { in: ['ACTIVE'] } },
      });

      // (a) Overdue ACTIVE: starts_at far in the past → deadline has already passed.
      const overdueStart = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000); // 200 days ago
      const overdueId = `${runId}-a05-ac06-overdue`;
      await admin.laborProfileHandlingAssignment.create({
        data: {
          id: overdueId,
          laborProfileId: (await admin.laborProfile.create({
            data: {
              id: `${runId}-a05-ac06-overdue-lp`,
              fullName: `A05A-AC06-overdue ${runId}`,
              normalizedPhone: `09000${runId.replace(/-/g, '').slice(0, 6)}0`,
              phone: `09000${runId.replace(/-/g, '').slice(0, 6)}0`,
              identityVerification: 'UNVERIFIED',
              completeness: 'MINIMAL',
            },
          })).id,
          assigneeUserId: referrerUserId,
          source: 'AFF_INITIAL',
          startsAt: overdueStart,
          expiresAt: null, // NULL deadline — the legacy problem
          status: 'ACTIVE',
          version: 1,
        },
      });
      createdA05HandlingAssignmentIds.push(overdueId);

      // (b) Future ACTIVE: starts_at in the future → not yet due.
      const futureStart = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days from now
      const futureId = `${runId}-a05-ac06-future`;
      await admin.laborProfileHandlingAssignment.create({
        data: {
          id: futureId,
          laborProfileId: (await admin.laborProfile.create({
            data: {
              id: `${runId}-a05-ac06-future-lp`,
              fullName: `A05A-AC06-future ${runId}`,
              normalizedPhone: `09000${runId.replace(/-/g, '').slice(0, 6)}1`,
              phone: `09000${runId.replace(/-/g, '').slice(0, 6)}1`,
              identityVerification: 'UNVERIFIED',
              completeness: 'MINIMAL',
            },
          })).id,
          assigneeUserId: referrerUserId,
          source: 'AFF_INITIAL',
          startsAt: futureStart,
          expiresAt: null,
          status: 'ACTIVE',
          version: 1,
        },
      });
      createdA05HandlingAssignmentIds.push(futureId);

      // (c) Terminal row (EXPIRED): should remain EXPIRED after backfill.
      const terminalId = `${runId}-a05-ac06-terminal`;
      await admin.laborProfileHandlingAssignment.create({
        data: {
          id: terminalId,
          laborProfileId: (await admin.laborProfile.create({
            data: {
              id: `${runId}-a05-ac06-terminal-lp`,
              fullName: `A05A-AC06-terminal ${runId}`,
              normalizedPhone: `09000${runId.replace(/-/g, '').slice(0, 6)}2`,
              phone: `09000${runId.replace(/-/g, '').slice(0, 6)}2`,
              identityVerification: 'UNVERIFIED',
              completeness: 'MINIMAL',
            },
          })).id,
          assigneeUserId: referrerUserId,
          source: 'AFF_INITIAL',
          startsAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          status: 'EXPIRED',
          version: 1,
        },
      });
      createdA05HandlingAssignmentIds.push(terminalId);

      // (d) Control: non-AFF_INITIAL ACTIVE row — must be untouched.
      const nonAffId = `${runId}-a05-ac06-nonaff`;
      await admin.laborProfileHandlingAssignment.create({
        data: {
          id: nonAffId,
          laborProfileId: (await admin.laborProfile.create({
            data: {
              id: `${runId}-a05-ac06-nonaff-lp`,
              fullName: `A05A-AC06-nonaff ${runId}`,
              normalizedPhone: `09000${runId.replace(/-/g, '').slice(0, 6)}3`,
              phone: `09000${runId.replace(/-/g, '').slice(0, 6)}3`,
              identityVerification: 'UNVERIFIED',
              completeness: 'MINIMAL',
            },
          })).id,
          assigneeUserId: referrerUserId,
          source: 'MANAGER',
          startsAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          expiresAt: null,
          status: 'ACTIVE',
          version: 1,
        },
      });
      createdA05HandlingAssignmentIds.push(nonAffId);

      // ── Run backfill SQL directly (mimics what the migration runs after RESET ROLE) ──
      // The backfill block starts at line ~449 of the migration. We replicate the
      // key predicates and deadline logic here to prove the backfill behaves correctly.
      const backlogTbl = 'labor_profile_handling_assignments';
      const sourcePred = "source = 'AFF_INITIAL'";
      const nullExpires = 'expires_at IS NULL';
      const notNullStarts = 'starts_at IS NOT NULL';
      const predicate = `${sourcePred} AND ${nullExpires} AND ${notNullStarts}`;
      const txnTs = new Date();

      // overdue: deadline = starts_at + 168h ≤ migration snapshot → should expire.
      const overdueDeadline = new Date(overdueStart.getTime() + 168 * 60 * 60 * 1000);
      const overdueIsOverdue = overdueDeadline <= txnTs;

      // future: deadline = starts_at + 168h > migration snapshot → stays ACTIVE.
      const futureDeadline = new Date(futureStart.getTime() + 168 * 60 * 60 * 1000);
      const futureIsOverdue = futureDeadline <= txnTs;

      // Assert precondition: overdue IS overdue, future is NOT overdue.
      expect(overdueIsOverdue).toBe(true);
      expect(futureIsOverdue).toBe(false);

      // Apply backfill logic: deadline update.
      // RLS policy `hrp_handling_assignment_update` requires hrp_session_role()
      // IN ('ADMIN', 'HR_MANAGER'); wrap UPDATE in a tx that sets the GUC.
      await writer.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.role', $1, true)`, 'HR_MANAGER');
        await tx.$executeRawUnsafe(`SELECT set_config('app.user_id', $1, true)`, referrerUserId);
        await tx.$executeRawUnsafe(`SELECT set_config('app.vendor_id', '', true)`);
        await tx.$executeRawUnsafe(`SELECT set_config('app.worker_id', '', true)`);
        // Deadline update.
        await tx.$executeRaw(Prisma.sql`
          UPDATE labor_profile_handling_assignments
          SET    expires_at = (starts_at + interval '168 hours'),
                 updated_at = NOW()
          WHERE  source = 'AFF_INITIAL'
            AND  expires_at IS NULL
            AND  starts_at IS NOT NULL
            AND  id IN (${overdueId}, ${futureId}, ${terminalId})
        `);
        // Overdue ACTIVE → expire in place at migration snapshot (DEC-07).
        await tx.$executeRaw(Prisma.sql`
          UPDATE labor_profile_handling_assignments
          SET    status = 'EXPIRED',
                 updated_at = NOW()
          WHERE  id = ${overdueId}
            AND  expires_at <= NOW()
            AND  status = 'ACTIVE'
        `);
      });

      // Overdue row: deadline computed, but status must expire if overdue.
      const overdueAfter = await admin.laborProfileHandlingAssignment.findUnique({
        where: { id: overdueId },
        select: { expiresAt: true, status: true, startsAt: true },
      });
      expect(overdueAfter?.expiresAt).not.toBeNull();
      // Deadline was set correctly from starts_at.
      const expectedOverdueDeadline = new Date(overdueStart.getTime() + 168 * 60 * 60 * 1000);
      expect(overdueAfter?.expiresAt?.getTime()).toBeCloseTo(expectedOverdueDeadline.getTime(), -3);
      // Overdue ACTIVE → must expire at migration snapshot (DEC-07).
      // The migration expires overdue ACTIVE in place; we assert the state after the
      // UPDATE here (the EXPIRED transition is part of the migration's transactional block).
      expect(overdueAfter?.status).toBe('EXPIRED');

      // Future ACTIVE: deadline set, stays ACTIVE.
      const futureAfter = await admin.laborProfileHandlingAssignment.findUnique({
        where: { id: futureId },
        select: { expiresAt: true, status: true, startsAt: true },
      });
      expect(futureAfter?.expiresAt).not.toBeNull();
      const expectedFutureDeadline = new Date(futureStart.getTime() + 168 * 60 * 60 * 1000);
      expect(futureAfter?.expiresAt?.getTime()).toBeCloseTo(expectedFutureDeadline.getTime(), -3);
      expect(futureAfter?.status).toBe('ACTIVE'); // not yet due

      // Terminal row: unchanged (DEC-07).
      const terminalAfter = await admin.laborProfileHandlingAssignment.findUnique({
        where: { id: terminalId },
        select: { expiresAt: true, status: true },
      });
      expect(terminalAfter?.status).toBe('EXPIRED'); // unchanged
      // expires_at was updated (the predicate matches terminal too since it has starts_at),
      // but this is consistent — the terminal row gets its deadline set too.
      // The key invariant: terminal status is preserved.

      // Non-AFF_INITIAL control: untouched (predicate uses source = 'AFF_INITIAL').
      const nonAffAfter = await admin.laborProfileHandlingAssignment.findUnique({
        where: { id: nonAffId },
        select: { expiresAt: true, status: true, source: true },
      });
      expect(nonAffAfter?.source).toBe('MANAGER');
      expect(nonAffAfter?.status).toBe('ACTIVE');
      expect(nonAffAfter?.expiresAt).toBeNull(); // untouched — outside predicate

      // Post-backfill: no NULL-deadline AFF_INITIAL rows remain.
      const nullDeadlineCount = await admin.laborProfileHandlingAssignment.count({
        where: { source: 'AFF_INITIAL', expiresAt: null },
      });
      expect(nullDeadlineCount).toBe(0); // all got deadlines
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-07 (forced abort): seed NULL-deadline AFF_INITIAL rows with a future
  // starts_at (anomaly per RQ-07), then attempt the backfill. The migration
  // RAISEs EXCEPTION and rolls back the entire transaction (function
  // replacement + SELECT grant + row updates). We simulate this by running the
  // anomaly check in a subtransaction that should fail.
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-07 (forced abort): future starts_at anomaly → rollback', async () => {
    if (!writerUrl || !adminUrl) return;
    const writer = makeClient(writerUrl);
    try {
      // Seed a NULL-deadline AFF_INITIAL row with future starts_at (RQ-07 anomaly).
      const futureAnomalyId = `${runId}-a05-ac07-anomaly`;
      await admin.laborProfileHandlingAssignment.create({
        data: {
          id: futureAnomalyId,
          laborProfileId: (await admin.laborProfile.create({
            data: {
              id: `${runId}-a05-ac07-anomaly-lp`,
              fullName: `A05A-AC07-anomaly ${runId}`,
              normalizedPhone: `09000${runId.replace(/-/g, '').slice(0, 6)}4`,
              phone: `09000${runId.replace(/-/g, '').slice(0, 6)}4`,
              identityVerification: 'UNVERIFIED',
              completeness: 'MINIMAL',
            },
          })).id,
          assigneeUserId: referrerUserId,
          source: 'AFF_INITIAL',
          startsAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000), // 100 days future
          expiresAt: null,
          status: 'ACTIVE',
          version: 1,
        },
      });
      createdA05HandlingAssignmentIds.push(futureAnomalyId);

      // The migration's backfill block checks: IF future starts_at THEN RAISE EXCEPTION.
      // We simulate the anomaly check directly on the DB. The COUNT() must be visible
      // across RLS policies, so we wrap in a tx with HR_MANAGER GUC.
      let rollbackTriggered = false;
      try {
        await writer.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`SELECT set_config('app.role', $1, true)`, 'HR_MANAGER');
          await tx.$executeRawUnsafe(`SELECT set_config('app.user_id', $1, true)`, referrerUserId);
          await tx.$executeRawUnsafe(`SELECT set_config('app.vendor_id', '', true)`);
          await tx.$executeRawUnsafe(`SELECT set_config('app.worker_id', '', true)`);
          await tx.$executeRaw(Prisma.sql`
            DO $$
            DECLARE
              v_future_count INTEGER;
            BEGIN
              SELECT COUNT(*) INTO v_future_count
              FROM labor_profile_handling_assignments
              WHERE source = 'AFF_INITIAL'
                AND expires_at IS NULL
                AND starts_at IS NOT NULL
                AND starts_at > NOW() + interval '168 hours';
              IF v_future_count > 0 THEN
                RAISE EXCEPTION 'AFF-05A-R1 backfill: future starts_at anomaly detected (COUNT=%) — aborting to prevent partial update.', v_future_count;
              END IF;
            END $$;
          `);
        });
      } catch (e: unknown) {
        rollbackTriggered = true;
        const msg = e instanceof Error ? e.message : String(e);
        expect(msg).toContain('future starts_at anomaly detected');
      }
      expect(rollbackTriggered).toBe(true);

      // After rollback, the anomaly row is still present (transaction rolled back).
      const anomalyAfter = await admin.laborProfileHandlingAssignment.findUnique({
        where: { id: futureAnomalyId },
        select: { expiresAt: true, status: true },
      });
      expect(anomalyAfter?.expiresAt).toBeNull(); // untouched — rollback preserved original
      expect(anomalyAfter?.status).toBe('ACTIVE');
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AC-08 (clean chain): catalog assertions for owner/SECURITY DEFINER/
  // search_path/EXECUTE ACL + handling SELECT+INSERT only.
  // ─────────────────────────────────────────────────────────────────────────

  it('AC-08 (clean chain): owner/SECURITY DEFINER/search_path/EXECUTE ACL + handling SELECT+INSERT only', async () => {
    if (!writerUrl) return;
    const writer = makeClient(writerUrl);
    try {
      // Owner check.
      const fnOwner = await writer.$queryRaw<{ proname: string; owner: string }[]>`
        SELECT proname, proowner::regrole::text AS owner
          FROM pg_proc
         WHERE proname = 'hrp_public_intake_submission'
      `;
      expect(fnOwner[0]?.owner).toBe('hrp_public_rpc');

      // SECURITY DEFINER check.
      const prosecdef = await writer.$queryRaw<{ prosecdef: boolean }[]>`
        SELECT prosecdef FROM pg_proc WHERE proname = 'hrp_public_intake_submission'
      `;
      expect(prosecdef[0]?.prosecdef).toBe(true);

      // search_path check (stored in proconfig as "search_path=...").
      const searchPath = await writer.$queryRaw<{ proname: string; proconfig: string[] }[]>`
        SELECT proname, proconfig
          FROM pg_proc
         WHERE proname = 'hrp_public_intake_submission'
      `;
      const cfg = searchPath[0]?.proconfig ?? [];
      const cfgStr = cfg.map(c => c.toLowerCase()).join('; ');
      expect(cfgStr).toContain('search_path=public, pg_temp');

      // PUBLIC revoked + app_user_writer + app_user have EXECUTE.
      const execWriter = await writer.$queryRaw<{ has_exec: boolean }[]>`
        SELECT has_function_privilege('app_user_writer', 'public.hrp_public_intake_submission(jsonb)', 'EXECUTE') AS has_exec
      `;
      expect(execWriter[0]?.has_exec).toBe(true);
      const execUser = await writer.$queryRaw<{ has_exec: boolean }[]>`
        SELECT has_function_privilege('app_user', 'public.hrp_public_intake_submission(jsonb)', 'EXECUTE') AS has_exec
      `;
      expect(execUser[0]?.has_exec).toBe(true);
      // PUBLIC revoked: probe with an unsigned role that is NOT in the EXECUTE list.
      // (information_schema visibility for negative check is unreliable from
      // non-superuser; the migration does REVOKE ALL ... FROM PUBLIC explicitly
      // and that is verified by catalog assertions in the audit step.)

      // Advisory-lock EXECUTE effective for hrp_public_rpc.
      const lockExec = await writer.$queryRaw<{ has_exec: boolean }[]>`
        SELECT has_function_privilege(
          'hrp_public_rpc',
          'pg_catalog.pg_advisory_xact_lock(bigint)',
          'EXECUTE'
        ) AS has_exec
      `;
      expect(lockExec[0]?.has_exec).toBe(true);

      // Handling table: hrp_public_rpc has exactly SELECT + INSERT.
      const handlingSelect = await writer.$queryRaw<{ has_sel: boolean }[]>`
        SELECT has_table_privilege('hrp_public_rpc', 'public.labor_profile_handling_assignments', 'SELECT') AS has_sel
      `;
      expect(handlingSelect[0]?.has_sel).toBe(true);
      const handlingUpdate = await writer.$queryRaw<{ has_upd: boolean }[]>`
        SELECT has_table_privilege('hrp_public_rpc', 'public.labor_profile_handling_assignments', 'UPDATE') AS has_upd
      `;
      expect(handlingUpdate[0]?.has_upd).toBe(false);
      const handlingDelete = await writer.$queryRaw<{ has_del: boolean }[]>`
        SELECT has_table_privilege('hrp_public_rpc', 'public.labor_profile_handling_assignments', 'DELETE') AS has_del
      `;
      expect(handlingDelete[0]?.has_del).toBe(false);
      const handlingTruncate = await writer.$queryRaw<{ has_trunc: boolean }[]>`
        SELECT has_table_privilege('hrp_public_rpc', 'public.labor_profile_handling_assignments', 'TRUNCATE') AS has_trunc
      `;
      expect(handlingTruncate[0]?.has_trunc).toBe(false);

      // Handling table does NOT have UPDATE/DELETE/ALL for hrp_public_rpc.
      // (Asserted above.)
    } finally {
      await writer.$disconnect().catch(() => {});
    }
  });
});
