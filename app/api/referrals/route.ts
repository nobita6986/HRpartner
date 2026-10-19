import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { IdempotencyConflictError, withIdempotency } from '@/src/shared/integrity/idempotency';
import { decryptReferralValue, encryptReferralValue, referralPhoneLookupHash } from '@/src/domains/worker-mobile/referral-pii';

const schema = z.object({
  referredName: z.string().trim().min(2).max(120),
  referredPhone: z.string().trim().regex(/^(?:\+84|0)\d{9,10}$/),
  jobInterest: z.string().trim().max(240).optional(),
  consentToContact: z.literal(true),
}).strict();
const error = (code: string, message: string, status: number) => NextResponse.json({ ok: false, error: { code, message, details: {} } }, { status });
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  let ctx;
  try { ctx = await getAuthContext(req); } catch { return error('UNAUTHORIZED', 'Vui lòng đăng nhập.', 401); }
  if (ctx.role !== 'WORKER' || !ctx.workerId) return error('FORBIDDEN_NOT_VERIFIED', 'Chỉ tài khoản người lao động được giới thiệu.', 403);
  const key = req.headers.get('idempotency-key');
  if (!key || !UUID_V4.test(key)) return error('IDEMPOTENCY_REQUIRED', 'Thiếu Idempotency-Key UUID v4.', 400);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error('VALIDATION_ERROR', 'Thông tin giới thiệu không hợp lệ.', 400);
  const input = parsed.data;
  const phone = input.referredPhone.startsWith('+84') ? `0${input.referredPhone.slice(3)}` : input.referredPhone;
  const prisma = getPrisma();
  try {
    const result = await withDbContext(prisma, ctx, async (tx) => withIdempotency({
      prisma: tx, route: 'POST:/api/referrals', actorId: ctx.userId, key, requestBody: input,
      handler: async () => {
        const [user, assignment, policy] = await Promise.all([
          tx.user.findUnique({ where: { id: ctx.userId }, select: { role: true } }),
          tx.projectAssignment.findFirst({ where: { workerId: ctx.workerId, status: 'ACTIVE' }, select: { id: true } }),
          tx.referralProgramPolicy.findFirst({
            where: { isEnabled: true, publishedAt: { not: null }, effectiveFrom: { lte: new Date() }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }] },
            orderBy: { publishedAt: 'desc' }, select: { id: true, policyVersion: true },
          }),
        ]);
        if (!user || user.role !== 'WORKER' || !assignment) return { body: { kind: 'NOT_ELIGIBLE' }, statusCode: 200 };
        if (!policy) return { body: { kind: 'DISABLED' }, statusCode: 200 };
        const row = await tx.workerReferral.create({ data: {
          referrerUserId: ctx.userId,
          referredNameCiphertext: encryptReferralValue(input.referredName),
          referredPhoneCiphertext: encryptReferralValue(phone),
          referredPhoneLookupHash: referralPhoneLookupHash(phone),
          jobInterest: input.jobInterest,
          consentToContact: true,
          consentedAt: new Date(),
          policyVersionId: policy.id,
        }, select: { id: true, status: true, createdAt: true } });
        return { body: { kind: 'CREATED', referral: row }, statusCode: 201 };
      },
    }));
    const body = result.body as { kind: string; referral?: { id: string; status: string; createdAt: Date | string } };
    if (body.kind === 'NOT_ELIGIBLE') return error('FORBIDDEN_NOT_VERIFIED', 'Tài khoản chưa đủ điều kiện giới thiệu.', 403);
    if (body.kind === 'DISABLED') return error('REFERRAL_PROGRAM_DISABLED', 'Chương trình giới thiệu hiện chưa mở.', 409);
    return NextResponse.json({ ok: true, data: { referral: { id: body.referral!.id, status: body.referral!.status, submittedAt: new Date(body.referral!.createdAt).toISOString() } } }, { status: result.statusCode });
  } catch (e) {
    if (e instanceof IdempotencyConflictError) return error('IDEMPOTENCY_CONFLICT', 'Idempotency-Key đã được dùng cho dữ liệu khác.', 409);
    console.error('[referrals] create failed', { error: e instanceof Error ? e.name : 'unknown' });
    return error('INTERNAL_ERROR', 'Không thể gửi giới thiệu lúc này.', 500);
  }
}

export async function GET(req: NextRequest) {
  let ctx;
  try { ctx = await getAuthContext(req); } catch { return error('UNAUTHORIZED', 'Vui lòng đăng nhập.', 401); }
  if (ctx.role !== 'WORKER') return error('FORBIDDEN', 'Chỉ tài khoản người lao động được xem giới thiệu.', 403);
  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? 1) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get('limit') ?? 20) || 20));
  try {
    if (!ctx.workerId) return error('FORBIDDEN_NOT_VERIFIED', 'Tài khoản chưa được Admin liên kết hồ sơ người lao động.', 403);
    const rows = await withDbContext(getPrisma(), ctx, async (tx) => {
      const assignment = await tx.projectAssignment.findFirst({ where: { workerId: ctx.workerId, status: 'ACTIVE' }, select: { id: true } });
      if (!assignment) return null;
      return tx.workerReferral.findMany({
        where: { referrerUserId: ctx.userId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
        select: { id: true, referredNameCiphertext: true, referredPhoneCiphertext: true, status: true, benefitStatus: true, benefitAmountVnd: true, createdAt: true, updatedAt: true },
      });
    });
    if (!rows) return error('FORBIDDEN_NOT_VERIFIED', 'Cần có phân công đang hoạt động để xem giới thiệu.', 403);
    const items = rows.map((row) => {
      const name = decryptReferralValue(row.referredNameCiphertext).trim().split(/\s+/);
      const phone = decryptReferralValue(row.referredPhoneCiphertext);
      return {
        id: row.id,
        maskedReferredName: name.length > 1 ? `${name[0]} ${name.at(-1)?.[0] ?? ''}***` : `${name[0]?.[0] ?? ''}***`,
        maskedReferredPhone: `******${phone.slice(-4)}`,
        status: row.status,
        benefitStatus: row.benefitStatus,
        ...(row.benefitStatus === 'APPROVED' || row.benefitStatus === 'PAID' ? { benefitAmountVnd: row.benefitAmountVnd?.toString() ?? null } : {}),
        submittedAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    });
    return NextResponse.json({ ok: true, data: { items, page, limit } });
  } catch (e) {
    console.error('[referrals/mine] read failed', { error: e instanceof Error ? e.name : 'unknown' });
    return error('INTERNAL_ERROR', 'Không thể tải danh sách giới thiệu.', 500);
  }
}
