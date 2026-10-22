import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { getAuthContext } from '@/src/shared/auth/auth-context';
import { decryptEtrustCredential } from '@/src/shared/auth/etrust-credential-vault';
import {
  DEFAULT_ETRUST_TEMPLATE_ID,
  newPhoneOtp,
  readEtrustOtpConfig,
  sendEtrustOtpWithDetails,
} from '@/src/shared/auth/phone-otp';
import { SYSTEM_PHONE_OTP, withSystemDb } from '@/src/shared/auth/with-system-db';
import { readCappedJson } from '@/src/shared/security/request-body';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'no-store' };
const schema = z.object({
  phone: z.string().trim().regex(/^0\d{9}$/),
}).strict();

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status, headers: noStore });
}

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch {
    return fail(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập lại.');
  }
  if (ctx.role !== 'ADMIN') {
    return fail(403, 'FORBIDDEN', 'Chỉ quản trị viên được gửi thử OTP.');
  }

  const read = await readCappedJson<Record<string, unknown>>(req);
  if (!read.ok) return fail(read.response.status, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ.');
  const parsed = schema.safeParse(read.value);
  if (!parsed.success) {
    return fail(400, 'VALIDATION_ERROR', 'Số điện thoại nhận thử phải gồm 10 chữ số và bắt đầu bằng 0.');
  }

  try {
    const credentials = await withSystemDb(getPrisma(), SYSTEM_PHONE_OTP, (tx) =>
      tx.etrustOtpCredential.findUnique({ where: { id: 'primary' } }),
    );
    if (!credentials?.oaid) {
      return fail(400, 'NOT_CONFIGURED', 'Cần lưu API key, secret key và Zalo OA ID trước khi gửi thử OTP.');
    }

    const config = readEtrustOtpConfig(
      decryptEtrustCredential(credentials.apiKeyCiphertext),
      decryptEtrustCredential(credentials.secretKeyCiphertext),
      credentials.oaid,
      process.env,
      { templateId: DEFAULT_ETRUST_TEMPLATE_ID, brandname: '' },
    );
    if (!config) {
      return fail(400, 'NOT_CONFIGURED', 'Cấu hình ETrust OTP chưa đầy đủ.');
    }

    const testCode = newPhoneOtp();
    const result = await sendEtrustOtpWithDetails(config, parsed.data.phone, testCode);

    return NextResponse.json(
      {
        ok: result.ok,
        data: {
          sent: result.ok,
          codeResult: result.codeResult,
          errorMessage: result.errorMessage,
          endpoint: result.endpoint,
          templateId: config.templateId,
          oaid: config.oaid,
        },
        ...(result.ok
          ? {}
          : {
              error: {
                code: 'ETRUST_REJECTED',
                message: `ETrust trả về CodeResult=${result.codeResult}: ${result.errorMessage || 'Không gửi được tin ZNS'}`,
              },
            }),
      },
      { status: result.ok ? 200 : 502, headers: noStore },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Không thể gửi thử OTP.';
    return fail(502, 'ETRUST_UNAVAILABLE', msg);
  }
}
