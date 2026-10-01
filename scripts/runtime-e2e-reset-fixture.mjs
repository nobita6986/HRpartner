// scripts/runtime-e2e-reset-fixture.mjs — LOCAL reset for synthetic runtime E2E.
// NOT COMMITTED. Idempotent: re-running is a no-op if state is already reset.
//
// What this script MUST do (idempotent reset for re-run):
//   - Set JobOpening back to DRAFT, clear serviceModel, openedAt, closedAt
//   - Delete run-scoped JobPosting (PUBLISHED or DRAFT) for that JobOpening
//   - Delete run-scoped CandidateSubmission (and cascade LaborProfile/PlacementCase)
//   - Delete run-scoped Placement
//   - Delete run-scoped LaborProfileHandlingAssignment
//   - Delete run-scoped idempotency_keys entries for this run
//
// What this script MUST NOT touch:
//   - Seeded Project/ClientCompany/Slot/Order/Users

import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const adminUrl = (process.env.DATABASE_URL_ADMIN ?? process.env.DATABASE_URL)?.replace(/^"|"$/g, '');
if (!adminUrl) { console.error('[reset] No DATABASE_URL[_ADMIN]'); process.exit(1); }
const prismaUrl = new URL(adminUrl);
prismaUrl.searchParams.set('connection_limit', '1');
const prisma = new PrismaClient({ datasources: { db: { url: prismaUrl.toString() } } });

const RUN_ID = process.env.RUN_ID ?? 'run-unknown';
const OPENING_ID = process.env.E2E_OPENING_ID ?? `seed-opening-runtime-${RUN_ID}`;

async function main() {
  // 1. Find run-scoped submission for this candidate phone (from env). Also
  //    delete any prior-run E2E submission whose phone prefix matches the
  //    synthetic 0901* range so re-runs don't trip DUPLICATE_APPLICATION.
  const candidatePhone = process.env.E2E_CANDIDATE_PHONE;
  const phoneFilters = [];
  if (candidatePhone) phoneFilters.push(candidatePhone);
  // Synthetic local E2E uses the 0901* prefix (see scripts/runtime-ui-e2e.mjs).
  phoneFilters.push({ startsWith: '0901' });
  const submissions = await prisma.candidateSubmission.findMany({ where: { OR: phoneFilters.map((p) => (typeof p === 'string' ? { phone: p } : { phone: { startsWith: p.startsWith } })) } });
  for (const s of submissions) {
    await prisma.placement.deleteMany({ where: { sourceCandidateSubmissionId: s.id } });
    await prisma.applicationStatusHistory.deleteMany({ where: { submissionId: s.id } }).catch(() => {});
    await prisma.laborProfileHandlingAssignment.deleteMany({ where: { laborProfileId: s.laborProfileId ?? undefined } });
    if (s.placementCaseId) await prisma.placementCase.delete({ where: { id: s.placementCaseId } }).catch(() => {});
    if (s.laborProfileId) await prisma.laborProfile.delete({ where: { id: s.laborProfileId } }).catch(() => {});
    await prisma.candidateSubmission.delete({ where: { id: s.id } }).catch(() => {});
    console.log(`[reset] deleted submission ${s.id}`);
  }

  // 2. Delete run-scoped JobPosting (PUBLISHED or DRAFT)
  const postings = await prisma.jobPosting.findMany({ where: { jobOpeningId: OPENING_ID } });
  for (const jp of postings) {
    await prisma.jobPosting.delete({ where: { id: jp.id } }).catch((e) => console.warn(`[reset] jobPosting ${jp.id} delete: ${e.message.slice(0,100)}`));
    console.log(`[reset] deleted JobPosting ${jp.id}`);
  }

  // 3. Reset JobOpening back to DRAFT
  const opening = await prisma.jobOpening.findUnique({ where: { id: OPENING_ID } });
  if (opening) {
    await prisma.jobOpening.update({
      where: { id: OPENING_ID },
      data: { status: 'DRAFT', serviceModel: null, openedAt: null, closedAt: null },
    });
    console.log(`[reset] JobOpening ${OPENING_ID} reset to DRAFT`);
  }

  // 4. Clear idempotency_keys for run-scoped actor
  // Note: route-key scoped (e.g. POST:/api/admin/staffing/job-openings/[id]/classify).
  // We can't distinguish per-run vs per-key from table alone; we only clear entries that
  // match route keys touched in this run.
  const routeKeys = [
    'POST:/api/admin/staffing/job-openings/[id]/classify',
    'POST:/api/admin/staffing/job-openings/[id]/open',
    'POST:/api/admin/jobs/job-postings',
    'POST:/api/admin/jobs/job-postings/[id]/publish',
    'POST:/api/public/jobs/[slug]/applications',
    'POST:/api/admin/applications/[submissionId]/claim',
    'POST:/api/admin/recruiter/placements',
    'POST:/api/admin/recruiter/placements/[id]/actions/confirm',
    'POST:/api/admin/recruiter/placements/[id]/actions/effective',
    'POST:/api/admin/recruiter/placements/[id]/actions/cancel',
  ];
  await prisma.idempotencyKey.deleteMany({ where: { route: { in: routeKeys } } });
  console.log(`[reset] idempotency_keys cleared for ${routeKeys.length} route keys`);

  console.log(`[reset] done runId=${RUN_ID}`);
}

main().catch((e) => { console.error('[reset] FATAL', e); process.exit(1); }).finally(() => prisma.$disconnect());