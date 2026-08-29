/**
 * request-body.ts — V5-OPS-06A / RQ-06 / STEP-01 (DEC-09, RISK-07).
 *
 * Đọc JSON body có TRẦN cứng cho public apply:
 *   - `Content-Type` không phải `application/json` (kể cả multipart/octet-stream,
 *     hoặc thiếu hẳn) ⇒ `415 UNSUPPORTED_MEDIA_TYPE`, không đọc body.
 *   - `Content-Length` > 16 KiB ⇒ `413 PAYLOAD_TOO_LARGE` ngay, không đọc body.
 *   - Body chunked/không khai báo length (RISK-07) ⇒ đếm byte trong lúc stream và
 *     CẮT khi vượt trần, không bao giờ buffer trọn payload lớn vào RAM.
 *   - JSON sai cú pháp / không phải object ⇒ `400 INVALID_JSON`.
 *
 * DEC-12: không log body, không đưa nội dung body vào message lỗi.
 */
import { NextResponse } from 'next/server';

/** DEC-09: apply chỉ nhận JSON ≤ 16 KiB. */
export const APPLY_MAX_BODY_BYTES = 16 * 1024;

export type CappedJsonResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly response: NextResponse };

export interface CappedJsonOptions {
  readonly maxBytes?: number;
}

interface RequestLike {
  headers: Headers;
  body?: ReadableStream<Uint8Array> | null;
  text(): Promise<string>;
}

function errorResponse(status: number, error: string, message: string): NextResponse {
  return NextResponse.json({ error, message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

const TOO_LARGE_MESSAGE = 'Dữ liệu gửi lên vượt giới hạn cho phép.';
const UNSUPPORTED_MEDIA_MESSAGE = 'Chỉ chấp nhận Content-Type: application/json.';

/** `application/json` (cho phép tham số như `; charset=utf-8`, và `+json` suffix). */
export function isJsonContentType(raw: string | null): boolean {
  if (!raw) return false;
  const essence = raw.split(';')[0]?.trim().toLowerCase() ?? '';
  return essence === 'application/json' || essence.endsWith('+json');
}

/** Content-Length hợp lệ và vượt trần ⇒ true (chặn trước khi đọc byte nào). */
function declaredLengthExceeds(headers: Headers, maxBytes: number): boolean {
  const raw = headers.get('content-length');
  if (!raw) return false;
  const declared = Number(raw);
  return Number.isFinite(declared) && declared > maxBytes;
}

/** Đọc tối đa `maxBytes`+1 byte; trả null khi vượt trần (đã cancel stream). */
async function readCappedText(req: RequestLike, maxBytes: number): Promise<string | null> {
  const stream = req.body ?? null;
  if (!stream || typeof stream.getReader !== 'function') {
    // Runtime/mock không expose stream: đọc rồi đo (đã có chặn Content-Length ở trên).
    const text = await req.text();
    return Buffer.byteLength(text, 'utf8') > maxBytes ? null : text;
  }

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock?.();
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
}

/**
 * Gate media-type + trần byte rồi parse JSON. Mọi nhánh lỗi trả response sẵn sàng
 * (415/413/400) và KHÔNG chạm DB.
 */
export async function readCappedJson<T = Record<string, unknown>>(
  req: RequestLike,
  opts: CappedJsonOptions = {},
): Promise<CappedJsonResult<T>> {
  const maxBytes = opts.maxBytes ?? APPLY_MAX_BODY_BYTES;

  if (!isJsonContentType(req.headers.get('content-type'))) {
    return { ok: false, response: errorResponse(415, 'UNSUPPORTED_MEDIA_TYPE', UNSUPPORTED_MEDIA_MESSAGE) };
  }
  if (declaredLengthExceeds(req.headers, maxBytes)) {
    return { ok: false, response: errorResponse(413, 'PAYLOAD_TOO_LARGE', TOO_LARGE_MESSAGE) };
  }

  let text: string | null;
  try {
    text = await readCappedText(req, maxBytes);
  } catch {
    return { ok: false, response: errorResponse(400, 'INVALID_JSON', 'Body không đọc được.') };
  }
  if (text === null) {
    return { ok: false, response: errorResponse(413, 'PAYLOAD_TOO_LARGE', TOO_LARGE_MESSAGE) };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, response: errorResponse(400, 'INVALID_JSON', 'Body phải là JSON hợp lệ.') };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, response: errorResponse(400, 'INVALID_JSON', 'Body phải là JSON object.') };
  }
  return { ok: true, value: parsed as T };
}
