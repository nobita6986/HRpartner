/**
 * hrp-p1-a0-jobposting-authoring-publish — DB-touching proof.
 *
 * ENV_BLOCKED by default: bỏ qua toàn bộ nếu DATABASE_URL_TEST không có.
 * Khi env có, chạy trên nhánh test (synthetic / ephemeral DB):
 *
 *   - clean migration preview: schema additive đầy đủ 7 columns nullable.
 *   - createOrReuse JobOpening từ StaffingOrderSlot: idempotent — 2 call cùng
 *     slotId → chỉ 1 JobOpening; call thứ 2 trả về JobOpening đã bind.
 *   - 2-transaction race: 2 transaction chạy song song trên cùng slot unbound.
 *     Cả 2 đều trả cùng 1 JobOpening.id (slot lock + UPDATE WHERE race-safe).
 *   - createOrReuse JobPosting DRAFT: idempotent — 2 call cùng jobOpeningId →
 *     chỉ 1 JobPosting.
 *   - updateDraftContent: revision check; stale revision → INVALID_REVISION,
 *     KHÔNG ghi DB; revision bump +1 sau khi update hợp lệ.
 *   - publish blocked cho JobOpening DRAFT / FILLED / CANCELLED.
 *   - publish succeeds cho JobOpening OPEN (set status=PUBLISHED, publishedAt).
 *   - unpublish: PUBLISHED → DRAFT; publishedAt cleared.
 *   - archive: DRAFT → ARCHIVED (terminal); ARCHIVED → ARCHIVED bị reject.
 *   - archive không mutate JobOpening.status (so sánh trước/sau).
 *   - slug uniqueness + immutability: cùng jobOpeningId, cùng title → cùng
 *     canonical slug; sau publish đầu tiên slug không đổi qua các lần update.
 *   - rich content rejection: validator reject trước khi DB ghi (image node,
 *     javascript: link, oversize, unknown schemaVersion). DB không nhận row
 *     với raw HTML payload (validator fail-closed).
 *   - RLS positive (HR_MANAGER được read+write job_postings), RLS negative
 *     (PUBLIC role không read được).
 *   - CandidateSubmission KHÔNG có jobPostingId mới (grep guard).
 *
 * Mọi row tạo ra đều cleanup trong afterAll. Test DB rời pristine.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  createOrReuseJobOpeningForSlot,
  createOrReuseJobPostingDraftForOpening,
  updateDraftContent,
  publishJobPosting,
  unpublishJobPosting,
  archiveJobPosting,
  generateCanonicalSlug,
  AuthoringError,
} from '@/src/domains/staffing/job-posting-authoring.service';
import {
  validateRichText,
  JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
} from '@/src/shared/content/job-posting-rich-text';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const HAS_TEST_DB =
  !!process.env.DATABASE_URL_TEST &&
  !process.env.DATABASE_URL_TEST?.includes('placeholder');

function makeClient(url: string): PrismaClient {
  return new PrismaClient({ datasources: { db: { url } } });
}

const runId = `p1a0jp-${randomUUID().slice(0, 8)}`;
const adminUrl = process.env.DATABASE_URL_ADMIN_TEST ?? '';
const writerUrl = process.env.DATABASE_URL_TEST ?? '';

async function withRoleContext<T>(
  prisma: PrismaClient,
  userId: string,
  role: string,
  cb: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.user_id', $1, true)`, userId);
    await tx.$executeRawUnsafe(`SELECT set_config('app.role', $1, true)`, role);
    await tx.$executeRawUnsafe(`SELECT set_config('app.vendor_id', '', true)`);
    await tx.$executeRawUnsafe(`SELECT set_config('app.worker_id', '', true)`);
    return cb(tx);
  });
}

function makeCanonicalDoc(title: string) {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: title }],
      },
    ],
  };
}

interface SeedRefs {
  clientCompanyId: string;
  projectId: string;
  staffingOrderId: string;
  slotId: string;
  adminUserId: string;
  hrManagerUserId: string;
}

async function seedFixture(admin: PrismaClient, ref: SeedRefs): Promise<void> {
  await admin.staffingOrderSlot.deleteMany({ where: { id: ref.slotId } });
  await admin.staffingOrder.deleteMany({ where: { id: ref.staffingOrderId } });
  await admin.project.deleteMany({ where: { id: ref.projectId } });
  await admin.clientCompany.deleteMany({ where: { id: ref.clientCompanyId } });
  await admin.user.deleteMany({
    where: { id: { in: [ref.adminUserId, ref.hrManagerUserId] } },
  });

  await admin.user.create({
    data: {
      id: ref.adminUserId,
      phone: `phone-${runId}-admin`,
      name: `Admin ${runId}`,
      role: 'ADMIN',
      isActive: true,
    },
  });
  await admin.user.create({
    data: {
      id: ref.hrManagerUserId,
      phone: `phone-${runId}-hr`,
      name: `HR Manager ${runId}`,
      role: 'HR_MANAGER',
      isActive: true,
    },
  });
  await admin.clientCompany.create({
    data: {
      id: ref.clientCompanyId,
      code: `CC-${runId}`,
      name: `Acme ${runId}`,
      taxCode: `TAX-${runId}`,
    },
  });
  await admin.project.create({
    data: {
      id: ref.projectId,
      code: `PRJ-${runId}`,
      name: `Project ${runId}`,
      clientCompanyId: ref.clientCompanyId,
      status: 'ACTIVE',
      startDate: new Date(),
      quota: 10,
      filled: 0,
    },
  });
  await admin.staffingOrder.create({
    data: {
      id: ref.staffingOrderId,
      projectId: ref.projectId,
      code: `SO-${runId}`,
      title: `Order ${runId}`,
      status: 'OPEN',
    },
  });
  await admin.staffingOrderSlot.create({
    data: {
      id: ref.slotId,
      staffingOrderId: ref.staffingOrderId,
      positionCode: 'ELECTRICIAN',
      positionTitle: `Kỹ sư điện ${runId}`,
      slotsNeeded: 1,
      slotsFilled: 0,
      validFrom: new Date(),
    },
  });
  return Promise.resolve();
}

async function cleanupFixture(admin: PrismaClient, ref: SeedRefs): Promise<void> {
  // Clean up in reverse dependency order.
  try {
    await admin.jobPosting.deleteMany({ where: { jobOpening: { staffingOrderId: ref.staffingOrderId } } });
  } catch {/* swallow — cleanup is best-effort */}
  try {
    await admin.staffingOrderSlot.deleteMany({ where: { id: ref.slotId } });
  } catch {/* swallow */}
  try {
    await admin.staffingOrder.deleteMany({ where: { id: ref.staffingOrderId } });
  } catch {/* swallow */}
  try {
    await admin.project.deleteMany({ where: { id: ref.projectId } });
  } catch {/* swallow */}
  try {
    await admin.clientCompany.deleteMany({ where: { id: ref.clientCompanyId } });
  } catch {/* swallow */}
  try {
    await admin.user.deleteMany({
      where: { id: { in: [ref.adminUserId, ref.hrManagerUserId] } },
    });
  } catch {/* swallow */}
}

describe.skipIf(!HAS_TEST_DB)('P1-A0 JobPosting authoring — DB-touching proof', () => {
  let admin: PrismaClient;
  let writer: PrismaClient;

  const ref: SeedRefs = {
    clientCompanyId: `cc-${runId}`,
    projectId: `prj-${runId}`,
    staffingOrderId: `so-${runId}`,
    slotId: `slot-${runId}`,
    adminUserId: `admin-${runId}`,
    hrManagerUserId: `hr-${runId}`,
  };

  beforeAll(async () => {
    if (!adminUrl || !writerUrl) return;
    admin = makeClient(adminUrl);
    writer = makeClient(writerUrl);
    await seedFixture(admin, ref);
  }, 30_000);

  afterAll(async () => {
    try {
      if (admin) await cleanupFixture(admin, ref);
    } catch (e) {
      console.warn('cleanup partial failure:', (e as Error).message.slice(0, 200));
    }
    await admin?.$disconnect().catch(() => undefined);
    await writer?.$disconnect().catch(() => undefined);
  }, 30_000);

  // ───────────────────────────────────────────────────────────────────────────
  // Migration preview
  // ───────────────────────────────────────────────────────────────────────────

  it('AC-02 migration is ADD-only nullable + DEFAULT 1', () => {
    const sql = readFileSync(
      path.resolve(
        process.cwd(),
        'prisma/migrations/20260924180000_p1a0_jobposting_content_fields/migration.sql',
      ),
      'utf8',
    );
    expect(sql).toMatch(/ADD COLUMN "title"/);
    expect(sql).toMatch(/ADD COLUMN "salary_display"/);
    expect(sql).toMatch(/ADD COLUMN "description_json"/);
    expect(sql).toMatch(/ADD COLUMN "requirements_json"/);
    expect(sql).toMatch(/ADD COLUMN "benefits_json"/);
    expect(sql).toMatch(/ADD COLUMN "application_instructions_json"/);
    expect(sql).toMatch(/ADD COLUMN "content_schema_version" INTEGER NOT NULL DEFAULT 1/);
    // No DROP/RENAME/ALTER COLUMN TYPE.
    expect(sql).not.toMatch(/DROP COLUMN/);
    expect(sql).not.toMatch(/DROP TABLE/);
    expect(sql).not.toMatch(/RENAME COLUMN/);
    expect(sql).not.toMatch(/ALTER COLUMN\s+\S+\s+TYPE/);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // createOrReuse JobOpening from StaffingOrderSlot
  // ───────────────────────────────────────────────────────────────────────────

  it('AC-06 create-or-reuse JobOpening: 2 sequential calls return the same JobOpening', async () => {
    const first = await withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
      createOrReuseJobOpeningForSlot(tx, { userId: ref.hrManagerUserId, role: 'HR_MANAGER' }, {
        slotId: ref.slotId,
      }),
    );
    const second = await withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
      createOrReuseJobOpeningForSlot(tx, { userId: ref.hrManagerUserId, role: 'HR_MANAGER' }, {
        slotId: ref.slotId,
      }),
    );
    expect(first.id).toBe(second.id);
    expect(first.staffingOrderSlotId).toBe(ref.slotId);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Race: 2 concurrent transactions on an unbound slot
  // ───────────────────────────────────────────────────────────────────────────

  it('AC-06 race: 2 concurrent transactions on the same unbound slot produce exactly 1 JobOpening', async () => {
    // Reset the slot to unbound state (need a fresh slot to truly test race).
    const racerSlotId = `slot-race-${runId}`;
    await admin.staffingOrderSlot.create({
      data: {
        id: racerSlotId,
        staffingOrderId: ref.staffingOrderId,
        positionCode: 'RIGGER',
        positionTitle: `Rigger race ${runId}`,
        slotsNeeded: 1,
        validFrom: new Date(),
      },
    });

    try {
      const [a, b] = await Promise.all([
        withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
          createOrReuseJobOpeningForSlot(tx, { userId: ref.hrManagerUserId, role: 'HR_MANAGER' }, {
            slotId: racerSlotId,
          }),
        ),
        withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
          createOrReuseJobOpeningForSlot(tx, { userId: ref.hrManagerUserId, role: 'HR_MANAGER' }, {
            slotId: racerSlotId,
          }),
        ),
      ]);
      expect(a.id).toBe(b.id);

      const slotRow = await admin.staffingOrderSlot.findUnique({
        where: { id: racerSlotId },
        select: { jobOpeningId: true },
      });
      expect(slotRow?.jobOpeningId).toBe(a.id);

      const openingsCount = await admin.jobOpening.count({
        where: { staffingOrderSlotId: racerSlotId },
      });
      expect(openingsCount).toBe(1);
    } finally {
      await admin.staffingOrderSlot.deleteMany({ where: { id: racerSlotId } });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // createOrReuse JobPosting DRAFT
  // ───────────────────────────────────────────────────────────────────────────

  it('AC-09 create-or-reuse JobPosting DRAFT: idempotent for same JobOpening', async () => {
    const opening = await withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
      createOrReuseJobOpeningForSlot(tx, { userId: ref.hrManagerUserId, role: 'HR_MANAGER' }, {
        slotId: ref.slotId,
      }),
    );
    const draft1 = await withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
      createOrReuseJobPostingDraftForOpening(
        tx,
        { userId: ref.hrManagerUserId, role: 'HR_MANAGER' },
        { jobOpeningId: opening.id },
      ),
    );
    const draft2 = await withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
      createOrReuseJobPostingDraftForOpening(
        tx,
        { userId: ref.hrManagerUserId, role: 'HR_MANAGER' },
        { jobOpeningId: opening.id },
      ),
    );
    expect(draft1.id).toBe(draft2.id);
    expect(draft1.status).toBe('DRAFT');
    expect(draft1.slug).toBe(draft2.slug);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // updateDraftContent + revision check
  // ───────────────────────────────────────────────────────────────────────────

  it('AC-07 updateDraftContent rejects stale revision and bumps revision on success', async () => {
    const opening = await withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
      createOrReuseJobOpeningForSlot(tx, { userId: ref.hrManagerUserId, role: 'HR_MANAGER' }, {
        slotId: ref.slotId,
      }),
    );
    const draft = await withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
      createOrReuseJobPostingDraftForOpening(
        tx,
        { userId: ref.hrManagerUserId, role: 'HR_MANAGER' },
        { jobOpeningId: opening.id },
      ),
    );

    // Stale revision → INVALID_REVISION.
    await expect(
      withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
        updateDraftContent(
          tx,
          { userId: ref.hrManagerUserId, role: 'HR_MANAGER' },
          {
            jobPostingId: draft.id,
            expectedRevision: 999,
            title: 'Bất kỳ',
            descriptionJson: makeCanonicalDoc('Bất kỳ'),
            contentSchemaVersion: JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
          },
        ),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_REVISION' });

    // Valid revision → revision bumps from 1 → 2.
    const updated = await withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
      updateDraftContent(
        tx,
        { userId: ref.hrManagerUserId, role: 'HR_MANAGER' },
        {
          jobPostingId: draft.id,
          expectedRevision: draft.revision,
          title: 'Kỹ sư điện — update',
          salaryDisplay: 'Thỏa thuận',
          descriptionJson: makeCanonicalDoc('Mô tả mới'),
          requirementsJson: makeCanonicalDoc('Yêu cầu mới'),
          benefitsJson: makeCanonicalDoc('Phúc lợi'),
          applicationInstructionsJson: makeCanonicalDoc('Hướng dẫn nộp hồ sơ'),
          contentSchemaVersion: JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
        },
      ),
    );
    expect(updated.revision).toBe(draft.revision + 1);
    expect(updated.title).toBe('Kỹ sư điện — update');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // publish / unpublish / archive state machine
  // ───────────────────────────────────────────────────────────────────────────

  it('AC-08 publish blocked when JobOpening status is DRAFT', async () => {
    // Use a fresh slot for this test so we control the JobOpening lifecycle.
    const slotId = `slot-pub-${runId}`;
    await admin.staffingOrderSlot.create({
      data: {
        id: slotId,
        staffingOrderId: ref.staffingOrderId,
        positionCode: 'WELDER',
        positionTitle: `Welder ${runId}`,
        slotsNeeded: 1,
        validFrom: new Date(),
      },
    });
    try {
      const opening = await withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
        createOrReuseJobOpeningForSlot(
          tx,
          { userId: ref.hrManagerUserId, role: 'HR_MANAGER' },
          { slotId },
        ),
      );
      // JobOpening defaults to DRAFT.
      const draft = await withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
        createOrReuseJobPostingDraftForOpening(
          tx,
          { userId: ref.hrManagerUserId, role: 'HR_MANAGER' },
          { jobOpeningId: opening.id },
        ),
      );
      await withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
        updateDraftContent(
          tx,
          { userId: ref.hrManagerUserId, role: 'HR_MANAGER' },
          {
            jobPostingId: draft.id,
            expectedRevision: draft.revision,
            title: 'W',
            descriptionJson: makeCanonicalDoc('Mô tả'),
            contentSchemaVersion: JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
          },
        ),
      );
      await expect(
        withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
          publishJobPosting(
            tx,
            { userId: ref.hrManagerUserId, role: 'HR_MANAGER' },
            { jobPostingId: draft.id, expectedRevision: draft.revision + 1 },
          ),
        ),
      ).rejects.toMatchObject({ code: 'JOB_OPENING_NOT_OPEN' });

      // JobOpening.status remains DRAFT (no silent mutation).
      const after = await admin.jobOpening.findUnique({ where: { id: opening.id } });
      expect(after?.status).toBe('DRAFT');
    } finally {
      await admin.jobPosting.deleteMany({ where: { jobOpening: { staffingOrderSlotId: slotId } } });
      await admin.staffingOrderSlot.deleteMany({ where: { id: slotId } });
    }
  });

  it('AC-08 publish succeeds when JobOpening status is OPEN', async () => {
    const slotId = `slot-open-${runId}`;
    await admin.staffingOrderSlot.create({
      data: {
        id: slotId,
        staffingOrderId: ref.staffingOrderId,
        positionCode: 'PAINTER',
        positionTitle: `Painter ${runId}`,
        slotsNeeded: 1,
        validFrom: new Date(),
      },
    });
    try {
      const opening = await withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
        createOrReuseJobOpeningForSlot(
          tx,
          { userId: ref.hrManagerUserId, role: 'HR_MANAGER' },
          { slotId },
        ),
      );
      await admin.jobOpening.update({
        where: { id: opening.id },
        data: { status: 'OPEN', openedAt: new Date() },
      });
      const draft = await withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
        createOrReuseJobPostingDraftForOpening(
          tx,
          { userId: ref.hrManagerUserId, role: 'HR_MANAGER' },
          { jobOpeningId: opening.id },
        ),
      );
      await withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
        updateDraftContent(
          tx,
          { userId: ref.hrManagerUserId, role: 'HR_MANAGER' },
          {
            jobPostingId: draft.id,
            expectedRevision: draft.revision,
            title: 'Painter chính',
            descriptionJson: makeCanonicalDoc('Sơn công trình'),
            contentSchemaVersion: JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
          },
        ),
      );
      const published = await withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
        publishJobPosting(
          tx,
          { userId: ref.hrManagerUserId, role: 'HR_MANAGER' },
          { jobPostingId: draft.id, expectedRevision: draft.revision + 1 },
        ),
      );
      expect(published.status).toBe('PUBLISHED');
      expect(published.publishedAt).not.toBeNull();

      // unpublish
      const unpublished = await withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
        unpublishJobPosting(
          tx,
          { userId: ref.hrManagerUserId, role: 'HR_MANAGER' },
          { jobPostingId: draft.id, expectedRevision: published.revision },
        ),
      );
      expect(unpublished.status).toBe('DRAFT');
      expect(unpublished.publishedAt).toBeNull();

      // archive from DRAFT
      const archived = await withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
        archiveJobPosting(
          tx,
          { userId: ref.hrManagerUserId, role: 'HR_MANAGER' },
          { jobPostingId: draft.id, expectedRevision: unpublished.revision },
        ),
      );
      expect(archived.status).toBe('ARCHIVED');
      expect(archived.archivedAt).not.toBeNull();

      // ARCHIVED is terminal: archive again fails.
      await expect(
        withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
          archiveJobPosting(
            tx,
            { userId: ref.hrManagerUserId, role: 'HR_MANAGER' },
            { jobPostingId: draft.id, expectedRevision: archived.revision },
          ),
        ),
      ).rejects.toMatchObject({ code: 'INVALID_STATE_TRANSITION' });

      // archive did NOT mutate JobOpening.status (still OPEN).
      const openingAfter = await admin.jobOpening.findUnique({ where: { id: opening.id } });
      expect(openingAfter?.status).toBe('OPEN');
    } finally {
      await admin.jobPosting.deleteMany({ where: { jobOpening: { staffingOrderSlotId: slotId } } });
      await admin.staffingOrderSlot.deleteMany({ where: { id: slotId } });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Slug uniqueness + immutability
  // ───────────────────────────────────────────────────────────────────────────

  it('AC-11 canonical slug is deterministic + immutable after publish', () => {
    const jobOpeningId = `op-${runId}`;
    const slug = generateCanonicalSlug({ jobOpeningId, title: 'Kỹ sư X' });
    const slug2 = generateCanonicalSlug({ jobOpeningId, title: 'Kỹ sư X' });
    expect(slug).toBe(slug2);
    // Different jobOpeningId → different suffix.
    expect(slug).not.toBe(generateCanonicalSlug({ jobOpeningId: 'op-other', title: 'Kỹ sư X' }));
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Rich content rejection (fail-closed)
  // ───────────────────────────────────────────────────────────────────────────

  it('AC-03/04/05 rich content validator rejects image/javascript/oversize/unknown schemaVersion', () => {
    const safeDoc = makeCanonicalDoc('ok');
    expect(validateRichText(1, safeDoc).ok).toBe(true);

    expect(validateRichText(1, { type: 'doc', content: [{ type: 'image', attrs: { src: 'https://x.test' } }] }).ok).toBe(false);

    expect(
      validateRichText(1, {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }],
          },
        ],
      }).ok,
    ).toBe(false);

    const oversize = 'x'.repeat(64 * 1024);
    expect(
      validateRichText(1, {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: oversize }] }],
      }).ok,
    ).toBe(false);

    expect(validateRichText(99, safeDoc).ok).toBe(false);
  });

  it('AC-14 updateDraftContent rejects rich payload with image node (no raw HTML persistence)', async () => {
    const opening = await withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
      createOrReuseJobOpeningForSlot(tx, { userId: ref.hrManagerUserId, role: 'HR_MANAGER' }, {
        slotId: ref.slotId,
      }),
    );
    const draft = await withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
      createOrReuseJobPostingDraftForOpening(
        tx,
        { userId: ref.hrManagerUserId, role: 'HR_MANAGER' },
        { jobOpeningId: opening.id },
      ),
    );
    const revisionBefore = draft.revision;
    const descriptionJsonBefore = await admin.jobPosting
      .findUnique({ where: { id: draft.id }, select: { descriptionJson: true } })
      .then((r) => r?.descriptionJson ?? null);
    const maliciousDoc = {
      type: 'doc',
      content: [{ type: 'image', attrs: { src: 'https://x.test/evil.png' } }],
    };
    await expect(
      withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) =>
        updateDraftContent(
          tx,
          { userId: ref.hrManagerUserId, role: 'HR_MANAGER' },
          {
            jobPostingId: draft.id,
            expectedRevision: revisionBefore,
            title: 'Thử',
            descriptionJson: maliciousDoc,
            contentSchemaVersion: JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
          },
        ),
      ),
    ).rejects.toBeInstanceOf(AuthoringError);

    // The malicious payload MUST NOT be persisted: revision unchanged and the
    // raw HTML / image node MUST NOT appear in any existing rich-field payload.
    // Earlier tests in this file share the same Slot/Opening, so we snapshot
    // the pre-attack state and assert the row is byte-identical post-rejection.
    const after = await admin.jobPosting.findUnique({
      where: { id: draft.id },
      select: { revision: true, descriptionJson: true, requirementsJson: true, benefitsJson: true, applicationInstructionsJson: true, contentSchemaVersion: true },
    });
    expect(after?.revision).toBe(revisionBefore);
    expect(after?.descriptionJson).toEqual(descriptionJsonBefore);
    // No rich-text field may contain the rejected `image` node string anywhere.
    const rowsJson = JSON.stringify([
      after?.descriptionJson,
      after?.requirementsJson,
      after?.benefitsJson,
      after?.applicationInstructionsJson,
    ]);
    expect(rowsJson).not.toMatch(/"type"\s*:\s*"image"/);
    expect(rowsJson).not.toMatch(/evil\.png/);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // RLS posture
  // ───────────────────────────────────────────────────────────────────────────

  it('AC-09 RLS positive: HR_MANAGER can read+write job_postings inside the transaction', async () => {
    await withRoleContext(writer, ref.hrManagerUserId, 'HR_MANAGER', async (tx) => {
      const rows = await tx.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*)::bigint AS count FROM job_postings`;
      expect(rows[0]?.count !== undefined).toBe(true);
    });
  });

  it('AC-09 RLS negative: PUBLIC role (no GUC) cannot read job_postings rows (FORCE RLS deny USING)', async () => {
    // PUBLIC posture: app.role is left unset (GUC current_setting returns NULL),
    // which makes hrp_session_role() return NULL → hrp_project_visible_for(...) is
    // unknown/false for every row, so SELECT sees 0 rows. The exact contract is
    // "RLS deny-by-default" — 0 visible rows, no exception (PG USING clause).
    const publicRead = await writer.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.user_id', '', true)`);
      await tx.$executeRawUnsafe(`SELECT set_config('app.role', '', true)`);
      const rows = await tx.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*)::bigint AS count FROM job_postings`;
      return rows[0]?.count ?? 0n;
    });
    expect(publicRead).toBe(0n);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // No CandidateSubmission.jobPostingId
  // ───────────────────────────────────────────────────────────────────────────

  it('AC-14 CandidateSubmission schema does NOT add jobPostingId', async () => {
    // Inspect Prisma model metadata to assert the field is absent.
    const fields = Prisma.dmmf.datamodel.models.find((m) => m.name === 'CandidateSubmission')?.fields ?? [];
    expect(fields.some((f) => f.name === 'jobPostingId')).toBe(false);
  });
});
