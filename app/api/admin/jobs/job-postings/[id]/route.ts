/**
 * /api/admin/jobs/job-postings/[id] — P1-A0 admin detail + draft update.
 *
 *   - GET: read job_postings row through RLS. Mutation roles see full detail.
 *     Returns JobPostingDto (P1-A0 fields: title, salaryDisplay, *Json,
 *     contentSchemaVersion).
 *   - PATCH: update draft content. Body:
 *       - expectedRevision: number (required)
 *       - title: string (required)
 *       - salaryDisplay?: string | null
 *       - descriptionJson: object (required; Tiptap/ProseMirror JSON)
 *       - requirementsJson?: object | null
 *       - benefitsJson?: object | null
 *       - applicationInstructionsJson?: object | null
 *       - contentSchemaVersion: number (currently must be 1)
 *     Rich content is validated server-side via the shared profile.
 *     Idempotency-Key required (UUID).
 *
 *   - DELETE: not exposed. ARCHIVED goes through the archive endpoint.
 *
 * Auth (DEC-09): mutation roles = ADMIN/HR_MANAGER/HR_STAFF; forbidden roles
 * get 403.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { IdempotencyConflictError, withIdempotency } from '@/src/shared/integrity/idempotency';
import {
  ALLOWED_MUTATION_ROLES,
  AuthoringError,
  getJobPostingForAuthoring,
  updateDraftContent,
  type UpdateDraftContentInput,
} from '@/src/domains/staffing/job-posting-authoring.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE_KEY = 'PATCH:/api/admin/jobs/job-postings/[id]';

interface PatchBody {
  expectedRevision?: unknown;
  title?: unknown;
  salaryDisplay?: unknown;
  descriptionJson?: unknown;
  requirementsJson?: unknown;
  benefitsJson?: unknown;
  applicationInstructionsJson?: unknown;
  contentSchemaVersion?: unknown;
  // P1-A0.1 / C-01: stamp boolean flags. `undefined` = bị bỏ qua (giữ nguyên giá trị hiện tại
  // trên row). Bất kỳ giá trị nào không phải `boolean` (kể cả `null`, string, number, object)
  // bị reject với 400 INVALID_INPUT — service `assertBoolean` đã đứng cửa sau. Cả hai field
  // đều được include vào `requestBody` array dưới đây để key-order-sensitive idempotency hash
  // phát hiện payload khác cho cùng key.
  isHot?: unknown;
  isUrgent?: unknown;
}

const PATCH_BODY_ALLOWED_KEYS = new Set<string>([
  'expectedRevision',
  'title',
  'salaryDisplay',
  'descriptionJson',
  'requirementsJson',
  'benefitsJson',
  'applicationInstructionsJson',
  'contentSchemaVersion',
  'isHot',
  'isUrgent',
]);

function badRequest(message: string, code = 'INVALID_INPUT'): NextResponse {
  return NextResponse.json({ error: code, message }, { status: 400 });
}

/** C-01: `boolean` literal hoặc `undefined` (bị bỏ qua). Mọi giá trị khác → reject 400. */
function assertStrictBoolean(value: unknown): value is boolean | undefined {
  if (value === undefined) return true;
  if (typeof value === 'boolean') return true;
  return false;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  let authCtx;
  try {
    authCtx = await getAuthContext(req);
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }
  if (!ALLOWED_MUTATION_ROLES.has(authCtx.role)) {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: `Role ${authCtx.role} không có quyền đọc JobPosting.` },
      { status: 403 },
    );
  }
  const { id } = await ctx.params;
  try {
    const prisma = getPrisma();
    const posting = await withDbContext(prisma, authCtx, async (tx) =>
      getJobPostingForAuthoring(tx, id),
    );
    if (!posting) {
      return NextResponse.json({ error: 'NOT_FOUND', message: `JobPosting ${id} không tồn tại.` }, { status: 404 });
    }
    return NextResponse.json({ jobPosting: posting });
  } catch (error) {
    console.error('[api/admin/jobs/job-postings GET] error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to load JobPosting' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  let authCtx;
  try {
    authCtx = await getAuthContext(req);
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  const idempotencyKey = (
    req.headers.get('idempotency-key') ?? req.headers.get('x-idempotency-key') ?? ''
  ).trim();
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: 'IDEMPOTENCY_REQUIRED', message: 'Header Idempotency-Key is required to update a JobPosting draft' },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return badRequest('Body không phải JSON hợp lệ.');
  }

  // C-01: reject unknown keys consistently with the existing route — stamp fields are
  // an explicit allow-list extension, anything else is a 400.
  for (const key of Object.keys(body)) {
    if (!PATCH_BODY_ALLOWED_KEYS.has(key)) {
      return badRequest(`Trường không cho phép: ${key}.`);
    }
  }

  if (typeof body.expectedRevision !== 'number' || !Number.isInteger(body.expectedRevision) || body.expectedRevision < 1) {
    return badRequest('expectedRevision phải là số nguyên dương.');
  }
  if (typeof body.title !== 'string') {
    return badRequest('title là bắt buộc (chuỗi).');
  }
  if (typeof body.descriptionJson !== 'object' || body.descriptionJson === null) {
    return badRequest('descriptionJson là bắt buộc (JSON object).');
  }
  if (typeof body.contentSchemaVersion !== 'number') {
    return badRequest('contentSchemaVersion là bắt buộc (số).');
  }
  if (body.salaryDisplay !== undefined && body.salaryDisplay !== null && typeof body.salaryDisplay !== 'string') {
    return badRequest('salaryDisplay phải là chuỗi hoặc null.');
  }
  for (const field of ['requirementsJson', 'benefitsJson', 'applicationInstructionsJson'] as const) {
    const v = body[field];
    if (v !== undefined && v !== null && typeof v !== 'object') {
      return badRequest(`${field} phải là object hoặc null.`);
    }
  }

  // C-01: stamp flag validation happens BEFORE the service layer, so a non-boolean flag
  // never reaches `updateDraftContent` or the idempotency hash. `null`/`string`/`number`/
  // `object`/`array` → reject 400 with the exact field name. `undefined` is allowed and
  // preserves omitted-field semantics ("không đổi").
  if (!assertStrictBoolean(body.isHot)) {
    return badRequest('isHot phải là boolean (true/false) hoặc bị bỏ qua.');
  }
  if (!assertStrictBoolean(body.isUrgent)) {
    return badRequest('isUrgent phải là boolean (true/false) hoặc bị bỏ qua.');
  }

  const input: UpdateDraftContentInput = {
    jobPostingId: id,
    expectedRevision: body.expectedRevision,
    title: body.title,
    salaryDisplay:
      body.salaryDisplay === undefined || body.salaryDisplay === null
        ? null
        : (body.salaryDisplay as string),
    descriptionJson: body.descriptionJson,
    requirementsJson:
      body.requirementsJson === undefined ? null : body.requirementsJson ?? null,
    benefitsJson: body.benefitsJson === undefined ? null : body.benefitsJson ?? null,
    applicationInstructionsJson:
      body.applicationInstructionsJson === undefined ? null : body.applicationInstructionsJson ?? null,
    contentSchemaVersion: body.contentSchemaVersion,
    // C-01: pass boolean flags through; service keeps `undefined` semantics via assertBoolean.
    isHot: body.isHot as boolean | undefined,
    isUrgent: body.isUrgent as boolean | undefined,
  };

  // C-01: idempotency hash MUST include both stamp booleans — otherwise client could send
  // the same Idempotency-Key with `isHot: true` after a successful `isHot: false` POST and
  // get a silent replay. Storing literal `null` (not the JSON `undefined`) for omitted fields
  // keeps the array shape key-order-stable across all clients.
  const requestBody = [
    input.jobPostingId,
    input.expectedRevision,
    input.title,
    input.salaryDisplay ?? null,
    JSON.stringify(input.descriptionJson),
    JSON.stringify(input.requirementsJson ?? null),
    JSON.stringify(input.benefitsJson ?? null),
    JSON.stringify(input.applicationInstructionsJson ?? null),
    input.contentSchemaVersion,
    input.isHot ?? null,
    input.isUrgent ?? null,
  ];

  try {
    const outcome = await withDbContext(getPrisma(), authCtx, async (tx) =>
      withIdempotency({
        prisma: tx,
        route: ROUTE_KEY,
        actorId: authCtx.userId,
        key: idempotencyKey,
        requestBody,
        handler: async () => {
          const posting = await updateDraftContent(tx, authCtx, input);
          return { body: { jobPosting: posting } };
        },
      }),
    );
    return NextResponse.json(
      { ...(outcome.body as Record<string, unknown>), replayed: outcome.replayed },
      { status: outcome.statusCode },
    );
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return NextResponse.json({ error: 'IDEMPOTENCY_CONFLICT', message: error.message }, { status: 409 });
    }
    if (error instanceof AuthoringError) {
      return NextResponse.json(
        { error: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
        { status: error.httpStatus },
      );
    }
    console.error('[api/admin/jobs/job-postings PATCH] error:', error);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to update JobPosting draft' }, { status: 500 });
  }
}
