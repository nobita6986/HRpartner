/**
 * POST /api/admin/media/upload-url — Upload media file → Vercel Blob.
 *
 * Auth: ADMIN hoặc `CAN_MANAGE_MEDIA`.
 *
 * Quy trình:
 *  1. Validate input (filename, size ≤ 5MB, mime allowlist, sanitized name)
 *  2. Nhận multipart file qua FormData (`file` field)
 *  3. Upload lên Vercel Blob qua `@vercel/blob` `put()`
 *  4. Trả blobUrl + pathname cho client confirm qua /api/admin/media/confirm
 *
 * Nếu BLOB_READ_WRITE_TOKEN chưa cấu hình → trả 503 SERVICE_UNAVAILABLE
 * với message rõ ràng. KHÔNG hardcode fallback token.
 */
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { hasPermission } from '@/src/shared/auth/permission-resolver';
import { MAX_UPLOAD_BYTES, MEDIA_ALLOWED_MIME_TYPES } from '@/src/domains/media/media.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: 'INVALID_INPUT', message }, { status: 400 });
}

function validateFilename(filename: string): string | null {
  if (typeof filename !== 'string') return 'filename phải là chuỗi.';
  if (filename.length === 0 || filename.length > 200) return 'filename dài 1..200 ký tự.';
  // alphanumeric + dash/underscore/dot (no path traversal)
  if (!/^[a-zA-Z0-9._\-\u00C0-\u017F() ]+$/.test(filename)) {
    return 'filename chỉ chứa chữ cái, số, ., _, -, ( ), space, không chứa path traversal.';
  }
  return null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  const allowed = await hasPermission({ userId: ctx.userId, role: ctx.role }, 'CAN_MANAGE_MEDIA');
  if (!allowed) {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Thiếu CAN_MANAGE_MEDIA để upload media.' },
      { status: 403 },
    );
  }

  // 2. Check token FIRST — fail fast nếu deployment chưa cấu hình
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error: 'BLOB_TOKEN_MISSING',
        message:
          'BLOB_READ_WRITE_TOKEN chưa cấu hình. Set env var trên Vercel dashboard. Upload runtime sẽ fail đến khi token được thêm.',
      },
      { status: 503 },
    );
  }

  // 3. Parse FormData
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return badRequest('Body không phải FormData hợp lệ.');
  }

  const file = formData.get('file');
  const folder = formData.get('folder');
  if (!(file instanceof File)) {
    return badRequest('Field `file` (multipart) là bắt buộc.');
  }

  // 4. Validate
  const filenameErr = validateFilename(file.name);
  if (filenameErr) return badRequest(filenameErr);

  const mimeType = file.type;
  if (!mimeType || !(MEDIA_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return badRequest(`mimeType phải là một trong: ${MEDIA_ALLOWED_MIME_TYPES.join(', ')}.`);
  }

  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return badRequest(`size phải nằm trong (0, ${MAX_UPLOAD_BYTES}] bytes.`);
  }

  const folderStr = typeof folder === 'string' && folder.length > 0 ? folder : 'uncategorized';
  const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const pathname = `${folderStr}/${Date.now()}-${safeFilename}`;

  // 5. Upload lên Blob
  try {
    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false,
      token,
    });
    return NextResponse.json(
      {
        blobUrl: blob.url,
        pathname,
        size: file.size,
        mimeType,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    console.error('[admin/media/upload-url POST] error:', e);
    return NextResponse.json(
      { error: 'BLOB_PUT_FAILED', message: 'Upload lên Vercel Blob thất bại.' },
      { status: 502 },
    );
  }
}
