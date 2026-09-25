/**
 * P1-B canonical slug-bound public apply — synthetic DB integration proof.
 *
 * This suite never sets app.role. Runtime calls use DATABASE_URL_TEST exactly
 * like the public route; fixture/catalog operations use DATABASE_URL_ADMIN_TEST.
 * Missing inputs are a hard ENV_BLOCKED failure, never a skip/fake PASS.
 */
import { randomUUID } from 'node:crypto';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  ApplicationServiceError,
  submitPublicApplication,
  type PublicApplyInput,
} from '@/src/domains/applications/application.service';

const writerUrl = process.env.DATABASE_URL_TEST ?? '';
const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const HAS_TEST_DB =
  writerUrl.length > 0 &&
  adminUrl.length > 0 &&
  !writerUrl.includes('placeholder') &&
  !adminUrl.includes('placeholder');

if (!HAS_TEST_DB) {
  throw new Error(
    '[P1-B integration] ENV_BLOCKED: DATABASE_URL_TEST and DATABASE_URL_ADMIN_TEST are required; no test was skipped.',
  );
}

function makeClient(url: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url } },
    transactionOptions: { timeout: 20_000 },
  });
}

const runToken = randomUUID().replaceAll('-', '').slice(0, 12);
const runId = `p1b-${runToken}`;
const admin = makeClient(adminUrl);
const writer = makeClient(writerUrl);

interface Chain {
  suffix: string;
  slotId: string;
  openingId: string;
  postingId: string;
  slug: string;
}

const chains = new Map<string, Chain>();
let clientCompanyId = '';
let projectId = '';
let staffingOrderId = '';

function phone(n: number): string {
  const digits = `${runToken.replace(/[^0-9]/g, '')}0000000000`.slice(0, 7);
  return `09${digits}${String(n % 10)}`.slice(0, 10);
}

async function createChain(
  suffix: string,
  postingStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' = 'PUBLISHED',
  openingStatus: 'DRAFT' | 'OPEN' | 'FILLED' | 'CANCELLED' = 'OPEN',
): Promise<Chain> {
  const slotId = `${runId}-slot-${suffix}`;
  const openingId = `${runId}-opening-${suffix}`;
  const postingId = `${runId}-posting-${suffix}`;
  const slug = `${runId}-job-${suffix}`;
  await admin.staffingOrderSlot.create({
    data: {
      id: slotId,
      staffingOrderId,
      positionCode: `P1B-${suffix}`.slice(0, 30),
      positionTitle: `P1-B ${suffix}`,
      slotsNeeded: 20,
      slotsFilled: 0,
      validFrom: new Date(),
    },
  });
  await admin.jobOpening.create({
    data: {
      id: openingId,
      staffingOrderId,
      staffingOrderSlotId: slotId,
      status: openingStatus,
      openedAt: new Date(),
    },
  });
  await admin.staffingOrderSlot.update({ where: { id: slotId }, data: { jobOpeningId: openingId } });
  await admin.jobPosting.create({
    data: {
      id: postingId,
      jobOpeningId: openingId,
      slug,
      revision: 1,
      status: postingStatus,
      publishedAt: postingStatus === 'PUBLISHED' || postingStatus === 'ARCHIVED' ? new Date() : null,
      archivedAt: postingStatus === 'ARCHIVED' ? new Date() : null,
    },
  });
  const chain = { suffix, slotId, openingId, postingId, slug };
  chains.set(suffix, chain);
  return chain;
}

function input(
  chain: Chain,
  suffix: number,
  overrides: Partial<PublicApplyInput> = {},
): PublicApplyInput {
  return {
    slug: chain.slug,
    fullName: `${runId} Applicant ${suffix}`,
    phone: phone(suffix),
    cccdNumber: `0CCCD-TEST-${runToken}-${suffix}`,
    consentAt: new Date().toISOString(),
    idempotencyKey: randomUUID(),
    cv: null,
    ...overrides,
  };
}

async function apply(payload: PublicApplyInput) {
  return writer.$transaction((tx) => submitPublicApplication(tx, payload));
}

async function expectServiceCode(promise: Promise<unknown>, code: string): Promise<void> {
  // C-02: capture the rejection FIRST, before any assertion.
  // Throwing inside the try block would cause `expectServiceCode` itself to
  // throw the sentinel — Vitest's catch would then see the sentinel as the
  // caught error, not the actual ApplicationServiceError.
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  expect(caught, `Expected rejection with code ${code} but the promise resolved`).toBeTruthy();
  expect(caught as object).toBeInstanceOf(ApplicationServiceError);
  expect((caught as ApplicationServiceError).code).toBe(code);
}

async function submissionFor(name: string) {
  return admin.candidateSubmission.findFirstOrThrow({
    where: { fullName: name },
    include: { statusHistory: true },
  });
}

async function lifecycleCounts(name: string) {
  const submissions = await admin.candidateSubmission.findMany({
    where: { fullName: name },
    select: { id: true, laborProfileId: true, placementCaseId: true },
  });
  const lpIds = submissions.flatMap((row) => (row.laborProfileId ? [row.laborProfileId] : []));
  return {
    submissions: submissions.length,
    histories: await admin.applicationStatusHistory.count({
      where: { submissionId: { in: submissions.map((row) => row.id) } },
    }),
    laborProfiles: await admin.laborProfile.count({ where: { id: { in: lpIds } } }),
    placementCases: await admin.placementCase.count({ where: { laborProfileId: { in: lpIds } } }),
  };
}

beforeAll(async () => {
  const ledger = await admin.$queryRawUnsafe<Array<{ ok: boolean }>>(
    `SELECT EXISTS (
       SELECT 1 FROM "_prisma_migrations"
        WHERE migration_name = '20260925120000_p1b_public_apply_lifecycle'
          AND finished_at IS NOT NULL AND rolled_back_at IS NULL
     ) AS ok`,
  );
  if (!ledger[0]?.ok) {
    throw new Error('[P1-B integration] migration 20260925120000_p1b_public_apply_lifecycle is not applied');
  }

  clientCompanyId = `${runId}-company`;
  projectId = `${runId}-project`;
  staffingOrderId = `${runId}-order`;
  await admin.clientCompany.create({
    data: { id: clientCompanyId, code: `${runId}-CC`, name: `Company ${runId}` },
  });
  await admin.project.create({
    data: {
      id: projectId,
      code: `PRJ-${runId}`,
      name: `Project ${runId}`,
      clientCompanyId,
      status: 'ACTIVE',
      isPublic: true,
      startDate: new Date(),
    },
  });
  await admin.staffingOrder.create({
    data: {
      id: staffingOrderId,
      projectId,
      code: `${runId}-SO`,
      title: `Order ${runId}`,
      status: 'OPEN',
    },
  });

  for (const suffix of ['happy', 'exact', 'possible', 'idem', 'race', 'duplicate', 'rollback', 'atomic']) {
    await createChain(suffix);
  }
  await createChain('draft', 'DRAFT', 'OPEN');
  await createChain('archived', 'ARCHIVED', 'OPEN');
  await createChain('filled', 'PUBLISHED', 'FILLED');
}, 120_000);

afterAll(async () => {
  try {
    const submissions = await admin.candidateSubmission.findMany({
      where: { fullName: { startsWith: runId } },
      select: { id: true, laborProfileId: true },
    });
    const submissionIds = submissions.map((row) => row.id);
    const lpIds = Array.from(new Set(submissions.flatMap((row) => (row.laborProfileId ? [row.laborProfileId] : []))));
    await admin.applicationStatusHistory.deleteMany({ where: { submissionId: { in: submissionIds } } });
    await admin.candidateSubmission.deleteMany({ where: { id: { in: submissionIds } } });
    await admin.placementCase.deleteMany({ where: { laborProfileId: { in: lpIds } } });
    await admin.laborProfile.deleteMany({ where: { id: { in: lpIds } } });
    await admin.jobPosting.deleteMany({ where: { id: { startsWith: runId } } });
    await admin.staffingOrderSlot.updateMany({
      where: { id: { startsWith: runId } },
      data: { jobOpeningId: null },
    });
    await admin.jobOpening.deleteMany({ where: { id: { startsWith: runId } } });
    await admin.staffingOrderSlot.deleteMany({ where: { id: { startsWith: runId } } });
    await admin.staffingOrder.deleteMany({ where: { id: staffingOrderId } });
    await admin.project.deleteMany({ where: { id: projectId } });
    await admin.clientCompany.deleteMany({ where: { id: clientCompanyId } });
  } finally {
    await Promise.all([writer.$disconnect(), admin.$disconnect()]);
  }
}, 120_000);

describe.sequential('P1-B canonical slug-bound lifecycle', () => {
  it('AC-01/03 happy NEW_PROFILE links submission, case, profile and initial history', async () => {
    const payload = input(chains.get('happy')!, 1);
    const result = await apply(payload);
    expect(Object.keys(result).sort()).toEqual(['status', 'trackingCode']);
    expect(result.status).toBe('NEW');
    const row = await submissionFor(payload.fullName);
    expect(row.laborProfileId).toBeTruthy();
    expect(row.placementCaseId).toBeTruthy();
    expect(row.cccdNumber).toBe(payload.cccdNumber);
    expect(row.statusHistory).toHaveLength(1);
    expect(row.statusHistory[0]).toMatchObject({ fromStatus: null, toStatus: 'NEW', reason: 'PUBLIC_APPLY' });
  });

  it('AC-02 EXACT_MATCH reuses LaborProfile and active PlacementCase', async () => {
    const chain = chains.get('exact')!;
    // C-01: the canonical scorer uses the DB-side hrp_normalize_phone(p_phone)
    // to derive its `v_norm_phone`. Seed the seeded profile so the scorer finds
    // an exact match — i.e. lp.normalized_phone MUST equal what
    // hrp_normalize_phone(seeded.phone) returns. The application-side
    // normalizePhone() preserves a leading '0'; the canonical DB normalizer
    // strips both '84' and '0' prefix digits. Calling hrp_normalize_phone()
    // through the SAME connection that runs the scorer makes this the single
    // source of truth for fixture alignment.
    const seededDbNorm = await writer.$queryRawUnsafe<Array<{ v: string }>>(
      `SELECT hrp_normalize_phone($1) AS v`,
      phone(2),
    );
    const seededPhone = seededDbNorm[0]?.v ?? '';
    const seeded = await admin.laborProfile.create({
      data: {
        fullName: `${runId} Exact`,
        // Store BOTH the application-side AND canonical forms so the seeded
        // profile survives both the P1-B duplicate-guard check
        // (`cs.normalized_phone = p_normalized_phone`) and the scorer.
        normalizedPhone: seededPhone,
        phone: phone(2),
        cccdNumber: `0CCCD-TEST-${runToken}-2`,
        consentAt: new Date(),
      },
    });
    const active = await admin.placementCase.create({ data: { laborProfileId: seeded.id, status: 'OPEN' } });
    // C-01: prove the scorer returns EXACT_MATCH before invocation. The scorer
    // uses hrp_normalize_phone on the input phone; we feed it the SAME input
    // shape the route sends. If the canonical helper ever regresses to a
    // POSSIBLE_MATCH verdict, this test fails loudly here instead of silently
    // rolling back inside the RPC.
    const seededVerdict = await writer.$queryRawUnsafe<Array<{ verdict: string }>>(
      'SELECT verdict FROM hrp_score_labor_profile($1, $2, $3)',
      `${runId} Exact`, // names must match the seeded full_name
      phone(2),          // raw phone (scorer normalizes internally)
      seeded.cccdNumber,
    );
    expect(seededVerdict[0]?.verdict).toBe('EXACT_MATCH');

    const payload = input(chain, 2, {
      fullName: `${runId} Exact`,
      phone: phone(2),
      cccdNumber: seeded.cccdNumber,
    });
    await apply(payload);
    const row = await submissionFor(payload.fullName);
    expect(row.laborProfileId).toBe(seeded.id);
    expect(row.placementCaseId).toBe(active.id);
    expect(await admin.laborProfile.count({ where: { normalizedPhone: seededPhone } })).toBe(1);
  });

  it('AC-04 POSSIBLE_MATCH maps generic 409 and creates zero lifecycle rows', async () => {
    // C-01: seed the shared identity with normalized_phone in the canonical
    // (DB-side) form so the candidate-set OR-of-signals filter finds the row
    // when the caller passes the raw phone. The application-side
    // normalizePhone() preserves the leading '0'; the scorer's
    // hrp_normalize_phone() strips it. To bypass that asymmetry in fixture
    // alignment we derive the canonical form from hrp_normalize_phone().
    const sharedDbNorm = await writer.$queryRawUnsafe<Array<{ v: string }>>(
      `SELECT hrp_normalize_phone($1) AS v`,
      phone(3),
    );
    const sharedPhone = sharedDbNorm[0]?.v ?? '';
    await admin.laborProfile.create({
      data: {
        fullName: `${runId} Existing Identity`,
        normalizedPhone: sharedPhone,
        phone: phone(3),
      },
    });
    // C-01: prove the scorer returns POSSIBLE_MATCH for a phone that matches
    // but a full-name that differs from the seeded identity. This is the exact
    // branch the RPC must fail-closed on with P0014.
    const verdictRow = await writer.$queryRawUnsafe<Array<{ verdict: string }>>(
      'SELECT verdict FROM hrp_score_labor_profile($1, $2, $3)',
      `${runId} Different Identity`,
      phone(3),
      null,
    );
    expect(verdictRow[0]?.verdict).toBe('POSSIBLE_MATCH');

    const payload = input(chains.get('possible')!, 3, {
      fullName: `${runId} Different Identity`,
      phone: phone(3),
      cccdNumber: null,
    });
    const before = await lifecycleCounts(payload.fullName);
    await expectServiceCode(apply(payload), 'POSSIBLE_MATCH_NOT_RESOLVED');
    expect(await lifecycleCounts(payload.fullName)).toEqual(before);
  });

  it('AC-05 duplicate application remains P0012/409', async () => {
    const first = input(chains.get('duplicate')!, 4);
    await apply(first);
    await expectServiceCode(apply({ ...first, idempotencyKey: randomUUID() }), 'DUPLICATE_APPLICATION');
  });

  it('AC-06/07 DB idempotency replays same payload and rejects different payload', async () => {
    const payload = input(chains.get('idem')!, 5);
    const first = await apply(payload);
    const replay = await apply(payload);
    expect(replay).toEqual(first);
    expect((await lifecycleCounts(payload.fullName)).submissions).toBe(1);
    await expectServiceCode(apply({ ...payload, fullName: `${payload.fullName} changed` }), 'IDEMPOTENCY_PAYLOAD_MISMATCH');
  });

  it('AC-08 concurrent same-key yields one mutation and one replay result', async () => {
    const payload = input(chains.get('race')!, 6);
    const [a, b] = await Promise.all([apply(payload), apply(payload)]);
    expect(a).toEqual(b);
    expect(await lifecycleCounts(payload.fullName)).toMatchObject({ submissions: 1, histories: 1 });
  });

  it('AC-09 A1 DRAFT/ARCHIVED/FILLED guards create zero lifecycle rows', async () => {
    for (const [suffix, n] of [['draft', 7], ['archived', 8], ['filled', 9]] as const) {
      const payload = input(chains.get(suffix)!, n);
      await expectServiceCode(apply(payload), 'JOB_NOT_AVAILABLE');
      expect(await lifecycleCounts(payload.fullName)).toMatchObject({ submissions: 0, histories: 0 });
    }
  });

  it('AC-10 RPC revalidates an unpublish that happens before invocation', async () => {
    const chain = chains.get('atomic')!;
    await admin.jobPosting.update({ where: { id: chain.postingId }, data: { status: 'ARCHIVED', archivedAt: new Date() } });
    const payload = input(chain, 0);
    await expectServiceCode(apply(payload), 'JOB_NOT_AVAILABLE');
    expect(await lifecycleCounts(payload.fullName)).toMatchObject({ submissions: 0, histories: 0 });
  });

  it('AC-11 history failure rolls back profile, case and submission atomically', async () => {
    // C-03: prisma.$executeRawUnsafe runs through a SINGLE prepared statement
    // per call — PostgreSQL rejects `cannot insert multiple commands into a
    // prepared statement` (SQLSTATE 42601) when CREATE FUNCTION + CREATE TRIGGER
    // are concatenated. Split them into separate, deterministic, fail-closed
    // operations:
    //   1. Create the trigger function.
    //   2. Create the trigger that uses it.
    // The identifier is constrained to `p1b_fail_` + a hex token so DROP TRIGGER /
    // DROP FUNCTION can use the SAME qualified name deterministically. Cleanup is
    // fail-closed: any attempt that throws aborts the test BEFORE the finally
    // removes the trigger artefacts (which is exactly what we want — we never
    // leave a sentinel trigger behind on the shared synthetic DB).
    const triggerToken = `p1b_fail_${runToken}`;
    if (!/^p1b_fail_[a-f0-9]+$/.test(triggerToken)) {
      throw new Error(`[P1-B AC-11] unsafe trigger identifier: ${triggerToken}`);
    }
    try {
      // (1) CREATE FUNCTION — single statement, single prepare.
      await admin.$executeRawUnsafe(
        `CREATE FUNCTION public.${triggerToken}() RETURNS trigger
         LANGUAGE plpgsql AS $$
         BEGIN
           RAISE EXCEPTION 'P1B_SYNTHETIC_HISTORY_FAILURE';
         END $$`,
      );
      // (2) CREATE TRIGGER — single statement, single prepare. Uses the
      // function we just created. Filter is the same as the original sentinel
      // (PUBLIC_APPLY history inserts only) so it cannot intercept other writes.
      await admin.$executeRawUnsafe(
        `CREATE TRIGGER ${triggerToken}
         BEFORE INSERT ON application_status_history
         FOR EACH ROW
         WHEN (NEW.reason = 'PUBLIC_APPLY')
         EXECUTE FUNCTION public.${triggerToken}()`,
      );

      const payload = input(chains.get('rollback')!, 1, { fullName: `${runId} Rollback Canary` });
      let caught: unknown;
      try {
        await apply(payload);
      } catch (error) {
        caught = error;
      }
      expect(caught, 'history-trigger injection must reject the apply').toBeTruthy();
      expect(await lifecycleCounts(payload.fullName)).toEqual({
        submissions: 0,
        histories: 0,
        laborProfiles: 0,
        placementCases: 0,
      });
    } finally {
      // Fail-closed cleanup: DROP statements are also single prepared
      // statements, so we split them too. An error during cleanup is
      // surfaced (we don't .catch(() => {}) silently) so the next run can
      // see and remove a leftover sentinel.
      try {
        await admin.$executeRawUnsafe(
          `DROP TRIGGER IF EXISTS ${triggerToken} ON application_status_history`,
        );
      } finally {
        await admin.$executeRawUnsafe(
          `DROP FUNCTION IF EXISTS public.${triggerToken}()`,
        );
      }
    }
  });

  it('AC-12/15 catalog pins authority and helper-based classifier without explicit SAVEPOINT', async () => {
    const rows = await admin.$queryRawUnsafe<Array<{
      owner: string;
      prosecdef: boolean;
      config: string;
      definition: string;
    }>>(`
      SELECT p.proowner::regrole::text AS owner,
             p.prosecdef,
             array_to_string(p.proconfig, ', ') AS config,
             pg_get_functiondef(p.oid) AS definition
        FROM pg_proc p
       WHERE p.oid = to_regprocedure(
         'public.hrp_public_apply_submission(text,text,text,text,text,text,date,text,text,timestamp with time zone,text,text,integer,text,text,text,text)'
       )
    `);
    const fn = rows[0];
    expect(fn).toMatchObject({ owner: 'hrp_public_rpc', prosecdef: true });
    expect(fn.config).toContain('search_path=public, pg_temp');
    expect(fn.definition).toContain('hrp_score_labor_profile');
    expect(fn.definition).not.toContain('v_signals_provided');
    expect(fn.definition).not.toMatch(/^\s*SAVEPOINT\s/im);

    const uniqueName = `${runId} Helper New`;
    const uniquePhone = phone(8).replace(/.$/, '7');
    const newVerdict = await writer.$queryRawUnsafe<Array<{ verdict: string }>>(
      'SELECT verdict FROM hrp_score_labor_profile($1,$2,$3)',
      uniqueName,
      uniquePhone,
      null,
    );
    expect(newVerdict[0]?.verdict).toBe('NEW_PROFILE');
  });
});
