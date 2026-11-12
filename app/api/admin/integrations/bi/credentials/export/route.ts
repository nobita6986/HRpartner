import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { buildXlsxBuffer } from '@/src/shared/utils/xlsx';
import {
  CredentialAccessError,
  listWorkerInitialCredentials,
} from '@/src/domains/integrations/bi/bi-initial-credentials.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (err) {
    if (err instanceof AuthSessionError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const projectId = req.nextUrl.searchParams.get('projectId')?.trim() || null;
  const prisma = getPrisma();

  try {
    const items = await listWorkerInitialCredentials(prisma, ctx, {
      projectId,
      auditAction: 'EXPORT_INITIAL_CREDENTIALS',
    });

    const rows = items.map((item, idx) => ({
      stt: idx + 1,
      projectCode: item.projectCode ?? '',
      projectName: item.projectName ?? '',
      employeeCode: item.employeeCode,
      fullName: item.fullName,
      cccdNumber: item.cccdNumber,
      initialPassword: item.initialPassword,
      phone: item.phone ?? '',
      recruiterName: item.recruiterName ?? '',
      recruiterCode: item.recruiterCode ?? '',
      validFrom: item.validFrom ?? '',
    }));

    const buffer = buildXlsxBuffer([
      {
        name: 'MatKhauBanDau',
        columns: [
          { header: 'STT', key: 'stt', width: 6 },
          { header: 'Mã dự án', key: 'projectCode', width: 16 },
          { header: 'Tên dự án', key: 'projectName', width: 28 },
          { header: 'Mã NV', key: 'employeeCode', width: 18 },
          { header: 'Họ và tên', key: 'fullName', width: 24 },
          { header: 'Số CCCD (Tài khoản đăng nhập)', key: 'cccdNumber', width: 22 },
          { header: 'Mật khẩu ban đầu', key: 'initialPassword', width: 18 },
          { header: 'Số điện thoại', key: 'phone', width: 15 },
          { header: 'Người tuyển', key: 'recruiterName', width: 22 },
          { header: 'Mã người tuyển', key: 'recruiterCode', width: 16 },
          { header: 'Ngày vào làm', key: 'validFrom', width: 14 },
        ],
        rows,
      },
    ]);

    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `mat-khau-ban-dau-nld-${dateStamp}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    if (err instanceof CredentialAccessError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.statusCode },
      );
    }
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Không thể xuất file Excel mật khẩu ban đầu.' },
      { status: 500 },
    );
  }
}
