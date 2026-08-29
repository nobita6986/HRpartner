/**
 * request-body.test.ts — V5-OPS-06A / RQ-06 / STEP-01/03 / AC-05 (DEC-09, DEC-12, RISK-07).
 *
 * Trần body cho public apply:
 *   - media-type gate 415 (multipart/octet-stream/thiếu Content-Type) và KHÔNG đọc byte nào;
 *   - Content-Length khai vượt trần ⇒ 413 trước khi đọc body;
 *   - body chunked KHÔNG khai length (RISK-07) ⇒ đếm khi stream, cắt ở trần ⇒ 413;
 *   - JSON sai cú pháp / không phải object ⇒ 400 INVALID_JSON;
 *   - message lỗi KHÔNG echo nội dung body (DEC-12).
 */
import { describe, it, expect, vi } from 'vitest';

import {
  APPLY_MAX_BODY_BYTES,
  isJsonContentType,
  readCappedJson,
} from '@/src/shared/security/request-body';

const CANARY = 'BODY-CANARY-DO-NOT-ECHO';

/** Request giả: text() được spy để chứng minh "không đọc body" ở nhánh 415/413. */
function fakeRequest(opts: {
  contentType?: string | null;
  contentLength?: string;
  text?: string;
  stream?: boolean;
  chunkBytes?: number;
  chunkCount?: number;
}) {
  const headers = new Headers();
  if (opts.contentType !== null && opts.contentType !== undefined) headers.set('content-type', opts.contentType);
  if (opts.contentLength) headers.set('content-length', opts.contentLength);

  const text = vi.fn(async () => opts.text ?? '');
  let body: ReadableStream<Uint8Array> | null = null;
  if (opts.stream) {
    if (opts.chunkBytes) {
      let emitted = 0;
      const total = opts.chunkCount ?? 1;
      body = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (emitted >= total) {
            controller.close();
            return;
          }
          emitted += 1;
          controller.enqueue(new Uint8Array(opts.chunkBytes!).fill(0x61));
        },
      });
    } else {
      const encoded = new TextEncoder().encode(opts.text ?? '');
      body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoded);
          controller.close();
        },
      });
    }
  }
  return { headers, body, text };
}

async function bodyOf(res: Response): Promise<{ error?: string; message?: string }> {
  return (await res.json()) as { error?: string; message?: string };
}

describe('DEC-09 — trần 16 KiB', () => {
  it('hằng số đúng 16 KiB', () => {
    expect(APPLY_MAX_BODY_BYTES).toBe(16 * 1024);
  });

  it('Content-Length khai vượt trần ⇒ 413 và KHÔNG đọc body', async () => {
    const req = fakeRequest({ contentType: 'application/json', contentLength: String(APPLY_MAX_BODY_BYTES + 1), text: CANARY });
    const result = await readCappedJson(req);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(413);
    expect(await bodyOf(result.response)).toEqual({
      error: 'PAYLOAD_TOO_LARGE',
      message: 'Dữ liệu gửi lên vượt giới hạn cho phép.',
    });
    expect(result.response.headers.get('cache-control')).toBe('no-store');
    expect(req.text).not.toHaveBeenCalled();
  });

  it('body chunked không khai length ⇒ vẫn 413 khi stream vượt trần (RISK-07)', async () => {
    // 17 chunk × 1 KiB = 17 KiB > 16 KiB, không có Content-Length.
    const req = fakeRequest({ contentType: 'application/json', stream: true, chunkBytes: 1024, chunkCount: 17 });
    const result = await readCappedJson(req);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(413);
  });

  it('body sát trần vẫn được nhận (không off-by-one)', async () => {
    const filler = 'x'.repeat(APPLY_MAX_BODY_BYTES - 20);
    const payload = JSON.stringify({ fullName: filler });
    expect(Buffer.byteLength(payload, 'utf8')).toBeLessThanOrEqual(APPLY_MAX_BODY_BYTES);
    const req = fakeRequest({ contentType: 'application/json', stream: true, text: payload });
    const result = await readCappedJson<{ fullName: string }>(req);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.fullName).toHaveLength(filler.length);
  });

  it('trần có thể siết xuống qua option (dùng cho route khác)', async () => {
    const req = fakeRequest({ contentType: 'application/json', stream: true, text: JSON.stringify({ a: 'bbbbbbbbbb' }) });
    const result = await readCappedJson(req, { maxBytes: 8 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(413);
  });
});

describe('DEC-09 — media-type gate', () => {
  it('multipart/form-data ⇒ 415 và KHÔNG đọc body (CV upload không vào được RAM)', async () => {
    const req = fakeRequest({ contentType: 'multipart/form-data; boundary=----x', text: CANARY });
    const result = await readCappedJson(req);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(415);
    expect((await bodyOf(result.response)).error).toBe('UNSUPPORTED_MEDIA_TYPE');
    expect(req.text).not.toHaveBeenCalled();
  });

  it('octet-stream / text/plain / thiếu Content-Type ⇒ 415', async () => {
    for (const contentType of ['application/octet-stream', 'text/plain', null]) {
      const req = fakeRequest({ contentType, text: '{}' });
      const result = await readCappedJson(req);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.response.status).toBe(415);
      expect(req.text).not.toHaveBeenCalled();
    }
  });

  it('application/json với charset và +json suffix được chấp nhận', () => {
    expect(isJsonContentType('application/json')).toBe(true);
    expect(isJsonContentType('application/json; charset=utf-8')).toBe(true);
    expect(isJsonContentType('APPLICATION/JSON')).toBe(true);
    expect(isJsonContentType('application/merge-patch+json')).toBe(true);
    expect(isJsonContentType('multipart/form-data')).toBe(false);
    expect(isJsonContentType(null)).toBe(false);
  });
});

describe('DEC-09/12 — parse và im lặng về nội dung', () => {
  it('JSON sai cú pháp ⇒ 400 INVALID_JSON, message KHÔNG chứa body', async () => {
    const req = fakeRequest({ contentType: 'application/json', stream: true, text: `{ bad json ${CANARY}` });
    const result = await readCappedJson(req);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(400);
    const json = await bodyOf(result.response);
    expect(json.error).toBe('INVALID_JSON');
    expect(JSON.stringify(json)).not.toContain(CANARY);
  });

  it('array / string / null ⇒ 400 (chỉ nhận JSON object)', async () => {
    for (const raw of ['[]', '"just-a-string"', 'null', '42']) {
      const req = fakeRequest({ contentType: 'application/json', stream: true, text: raw });
      const result = await readCappedJson(req);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.response.status).toBe(400);
      expect((await bodyOf(result.response)).error).toBe('INVALID_JSON');
    }
  });

  it('JSON object hợp lệ ⇒ ok với đúng giá trị', async () => {
    const req = fakeRequest({
      contentType: 'application/json; charset=utf-8',
      stream: true,
      text: JSON.stringify({ fullName: 'Nguyễn Văn A', consent: true }),
    });
    const result = await readCappedJson<{ fullName: string; consent: boolean }>(req);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ fullName: 'Nguyễn Văn A', consent: true });
  });

  it('runtime không expose stream ⇒ fallback text() vẫn đo byte và chặn 413', async () => {
    const oversize = JSON.stringify({ pad: 'y'.repeat(APPLY_MAX_BODY_BYTES) });
    const req = fakeRequest({ contentType: 'application/json', text: oversize });
    const result = await readCappedJson(req);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(413);
    expect(req.text).toHaveBeenCalledTimes(1);
  });

  it('text() throw ⇒ 400 chứ không 500', async () => {
    const headers = new Headers({ 'content-type': 'application/json' });
    const req = { headers, body: null, text: async () => { throw new Error('stream broken'); } };
    const result = await readCappedJson(req);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(400);
  });
});
