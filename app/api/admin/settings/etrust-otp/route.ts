import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { encryptEtrustCredential } from '@/src/shared/auth/etrust-credential-vault';
import { readEtrustOtpConfig } from '@/src/shared/auth/phone-otp';
import { SYSTEM_PHONE_OTP, withSystemDb } from '@/src/shared/auth/with-system-db';
import { readCappedJson } from '@/src/shared/security/request-body';
import { writeAuditLog } from '@/src/shared/integrity/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'no-store' };
const schema = z.object({ apiKey: z.string().trim().min(1).max(500), secretKey: z.string().trim().min(1).max(500) }).strict();

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status, headers: noStore });
}

async function requireAdmin(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    return ctx.role === 'ADMIN' ? ctx : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) return fail(403, 'FORBIDDEN', 'Chỉ quản trị viên được cấu hình OTP.');
  try {
    const credentials = await withSystemDb(getPrisma(), SYSTEM_PHONE_OTP, (tx) => tx.etrustOtpCredential.findUnique({ where: { id: 'primary' }, select: { updatedAt: true } }));
    const encryptionKeyConfigured = /^[0-9a-f]{64}$/i.test(process.env.ETRUST_CREDENTIALS_ENCRYPTION_KEY ?? '');
    const templateConfigured = Boolean(readEtrustOtpConfig('configured', 'configured'));
    return NextResponse.json({ ok: true, data: { configured: Boolean(credentials), encryptionKeyConfigured, templateConfigured, updatedAt: credentials?.updatedAt.toISOString() ?? null } }, { headers: noStore });
  } catch {
    return fail(503, 'SETTINGS_UNAVAILABLE', 'Không thể đọc trạng thái cấu hình OTP.');
  }
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return fail(403, 'FORBIDDEN', 'Chỉ quản trị viên được cấu hình OTP.');
  const read = await readCappedJson<Record<string, unknown>>(req);
  if (!read.ok) return fail(read.response.status, 'VALIDATION_ERROR', 'Dữ liệu cấu hình không hợp lệ.');
  const parsed = schema.safeParse(read.value);
  if (!parsed.success) return fail(400, 'VALIDATION_ERROR', 'Cần nhập cả API key và secret key.');
  if (!/^[0-9a-f]{64}$/i.test(process.env.ETRUST_CREDENTIALS_ENCRYPTION_KEY ?? '')) return fail(503, 'SETTINGS_UNAVAILABLE', 'Máy chủ chưa cấu hình khóa mã hóa credentials.');
  try {
    const saved = await withSystemDb(getPrisma(), SYSTEM_PHONE_OTP, async (tx) => {
      const existed = await tx.etrustOtpCredential.findUnique({ where: { id: 'primary' }, select: { id: true } });
      const row = await tx.etrustOtpCredential.upsert({
        where: { id: 'primary' },
        create: { id: 'primary', apiKeyCiphertext: encryptEtrustCredential(parsed.data.apiKey), secretKeyCiphertext: encryptEtrustCredential(parsed.data.secretKey), updatedByUserId: ctx.userId },
        update: { apiKeyCiphertext: encryptEtrustCredential(parsed.data.apiKey), secretKeyCiphertext: encryptEtrustCredential(parsed.data.secretKey), updatedByUserId: ctx.userId },
        select: { updatedAt: true },
      });
      await writeAuditLog({
        prisma: tx,
        actor: { id: ctx.userId, role: ctx.role },
        entityType: 'IntegrationCredential',
        entityId: 'etrust-otp',
        action: existed ? 'CREDENTIALS_ROTATED' : 'CREDENTIALS_CONFIGURED',
        diff: { before: { configured: Boolean(existed) }, after: { configured: true } },
        reason: 'ETrust OTP credentials changed in Admin settings.',
      });
      return row;
    });
    return NextResponse.json({ ok: true, data: { configured: true, updatedAt: saved.updatedAt.toISOString() } }, { headers: noStore });
  } catch {
    return fail(503, 'SETTINGS_UNAVAILABLE', 'Không thể lưu cấu hình OTP.');
  }
}
