import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { decryptEtrustCredential } from '@/src/shared/auth/etrust-credential-vault';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { getEtrustOtpTemplates } from '@/src/shared/auth/phone-otp';
import { SYSTEM_PHONE_OTP, withSystemDb } from '@/src/shared/auth/with-system-db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'no-store' };

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status, headers: noStore });
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (ctx.role !== 'ADMIN') return fail(403, 'FORBIDDEN', 'Chỉ quản trị viên được tra cứu template OTP.');
  } catch {
    return fail(403, 'FORBIDDEN', 'Chỉ quản trị viên được tra cứu template OTP.');
  }

  try {
    const credentials = await withSystemDb(getPrisma(), SYSTEM_PHONE_OTP, (tx) => tx.etrustOtpCredential.findUnique({ where: { id: 'primary' } }));
    if (!credentials?.oaid) return fail(400, 'CONFIGURATION_REQUIRED', 'Hãy lưu API key, secret key và Zalo OA ID trước.');
    if (!/^[0-9a-f]{64}$/i.test(process.env.ETRUST_CREDENTIALS_ENCRYPTION_KEY ?? '')) return fail(503, 'SETTINGS_UNAVAILABLE', 'Máy chủ chưa cấu hình khóa giải mã credentials.');
    const templates = await getEtrustOtpTemplates(decryptEtrustCredential(credentials.apiKeyCiphertext), decryptEtrustCredential(credentials.secretKeyCiphertext), credentials.oaid);
    return NextResponse.json({ ok: true, data: templates }, { headers: noStore });
  } catch {
    return fail(502, 'ETRUST_TEMPLATE_LOOKUP_FAILED', 'Không đọc được danh sách template ETrust. Kiểm tra API key, secret key và OA ID đã lưu.');
  }
}
