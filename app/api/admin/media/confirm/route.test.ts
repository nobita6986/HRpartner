/**
 * confirm.route.test.ts — hrp-t1c-media-global-pool-bulk-upload-hotfix (RQ-08).
 *
 * Regression test cho /api/admin/media/confirm route: server phải là authority
 * cho alt khi client gửi alt rỗng/whitespace; helper `deriveMediaAlt` được áp
 * dụng từ `headResult.pathname.split('/').pop()`.
 *
 * Coverage:
 *  - alt rỗng → record có alt tự sinh không rỗng
 *  - alt whitespace → record có alt tự sinh không rỗng
 *  - alt client cung cấp → giữ nguyên client alt (không derive)
 *  - 401 khi thiếu session
 *  - 403 khi thiếu CAN_MANAGE_MEDIA
 *  - 503 khi BLOB_READ_WRITE_TOKEN missing
 *  - 404 khi blob URL không tồn tại trên Vercel Blob
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  hasPermission: vi.fn(),
  getPrisma: vi.fn(),
  createMedia: vi.fn(),
  revalidateTag: vi.fn(),
  head: vi.fn(),
}));

vi.mock('@/src/shared/auth/auth-context', () => ({
  getAuthContext: mocks.getAuthContext,
  AuthSessionError: class AuthSessionError extends Error {
    constructor(public readonly code: string, message: string) {
      super(message);
      this.name = 'AuthSessionError';
    }
  },
}));
vi.mock('@/src/shared/auth/permission-resolver', () => ({
  hasPermission: (...args: unknown[]) => mocks.hasPermission(...args),
}));
vi.mock('@/src/lib/db', () => ({
  getPrisma: mocks.getPrisma,
}));
vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => mocks.revalidateTag(...args),
}));
vi.mock('@vercel/blob', () => ({
  head: (...args: unknown[]) => mocks.head(...args),
}));
vi.mock('@/src/domains/media/media.service', () => ({
  createMedia: (...args: unknown[]) => mocks.createMedia(...args),
  MediaValidationError: class MediaValidationError extends Error {
    constructor(message: string, public readonly field?: string) {
      super(message);
      this.name = 'MediaValidationError';
    }
  },
}));

import { POST } from './route';

const FAKE_CTX = { userId: 'u-admin-1' };
const FAKE_BLOB = {
  pathname: 'media/1715000000-banh_mi.jpg',
  size: 12345,
};

function buildRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/media/confirm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeCreatedItem(overrides: Partial<{ id: string; alt: string; url: string }> = {}) {
  return {
    id: 'm1',
    url: 'https://blob.example/media/1715000000-banh_mi.jpg',
    alt: 'banh mi',
    caption: null,
    folder: 'uncategorized',
    tags: [],
    status: 'PUBLIC',
    cover: false,
    filename: '1715000000-banh_mi.jpg',
    size: 12345,
    mimeType: 'image/jpeg',
    order: 0,
    createdAt: '2026-10-07T00:00:00.000Z',
    createdBy: null,
    assignmentCount: 0,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAuthContext.mockResolvedValue(FAKE_CTX);
  mocks.hasPermission.mockResolvedValue(true);
  mocks.getPrisma.mockReturnValue({ __prisma: true });
  mocks.head.mockResolvedValue(FAKE_BLOB);
  mocks.createMedia.mockImplementation(async (_prisma: unknown, input: { alt: string }) =>
    makeCreatedItem({ alt: input.alt }),
  );
  process.env.BLOB_READ_WRITE_TOKEN = 'fake-token-for-test';
});

describe('POST /api/admin/media/confirm — server authority for alt', () => {
  it('derives alt from filename when body.alt is empty string', async () => {
    const res = await POST(
      buildRequest({
        blobUrl: 'https://blob.example/media/1715000000-banh_mi.jpg',
        alt: '',
        status: 'PUBLIC',
        mimeType: 'image/jpeg',
        size: 12345,
      }),
    );
    expect(res.status).toBe(201);
    expect(mocks.createMedia).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        alt: 'banh mi',
        filename: '1715000000-banh_mi.jpg',
      }),
    );
    const body = await res.json();
    expect(body.alt).toBe('banh mi');
  });

  it('derives alt from filename when body.alt is whitespace-only', async () => {
    const res = await POST(
      buildRequest({
        blobUrl: 'https://blob.example/media/1715000000-banh_mi.jpg',
        alt: '   \t\n  ',
        status: 'PUBLIC',
        mimeType: 'image/jpeg',
        size: 12345,
      }),
    );
    expect(res.status).toBe(201);
    expect(mocks.createMedia).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        alt: 'banh mi',
      }),
    );
  });

  it('keeps client-provided alt when non-empty', async () => {
    const res = await POST(
      buildRequest({
        blobUrl: 'https://blob.example/media/1715000000-banh_mi.jpg',
        alt: 'Ảnh bánh mì Hà Nội',
        status: 'PUBLIC',
        mimeType: 'image/jpeg',
        size: 12345,
      }),
    );
    expect(res.status).toBe(201);
    expect(mocks.createMedia).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        alt: 'Ảnh bánh mì Hà Nội',
      }),
    );
  });

  it('derives alt from UUID-prefixed filename (no client alt)', async () => {
    mocks.head.mockResolvedValueOnce({
      pathname: 'media/8d8c6099-9f57-4e2e-9c7c-1ba051156a66-hero.png',
      size: 100,
    });
    const res = await POST(
      buildRequest({
        blobUrl: 'https://blob.example/media/8d8c6099-9f57-4e2e-9c7c-1ba051156a66-hero.png',
        alt: '',
        status: 'PUBLIC',
        mimeType: 'image/png',
        size: 100,
      }),
    );
    expect(res.status).toBe(201);
    expect(mocks.createMedia).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        alt: 'hero',
      }),
    );
  });

  it('returns 401 when session is missing', async () => {
    const { AuthSessionError } = await import('@/src/shared/auth/auth-context');
    mocks.getAuthContext.mockRejectedValueOnce(
      new AuthSessionError('NO_TOKEN', 'Session không hợp lệ.'),
    );
    const res = await POST(buildRequest({ blobUrl: 'x', alt: '' }));
    expect(res.status).toBe(401);
    expect(mocks.createMedia).not.toHaveBeenCalled();
  });

  it('returns 403 when CAN_MANAGE_MEDIA is missing', async () => {
    mocks.hasPermission.mockResolvedValueOnce(false);
    const res = await POST(buildRequest({ blobUrl: 'x', alt: '' }));
    expect(res.status).toBe(403);
    expect(mocks.createMedia).not.toHaveBeenCalled();
  });

  it('returns 503 when BLOB_READ_WRITE_TOKEN is not configured', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const res = await POST(
      buildRequest({
        blobUrl: 'https://blob.example/media/x.jpg',
        alt: '',
      }),
    );
    expect(res.status).toBe(503);
    expect(mocks.createMedia).not.toHaveBeenCalled();
  });

  it('returns 404 when blob does not exist on Vercel Blob', async () => {
    mocks.head.mockRejectedValueOnce(new Error('not found'));
    const res = await POST(
      buildRequest({
        blobUrl: 'https://blob.example/media/missing.jpg',
        alt: '',
      }),
    );
    expect(res.status).toBe(404);
    expect(mocks.createMedia).not.toHaveBeenCalled();
  });

  it('returns 400 when blobUrl is missing', async () => {
    const res = await POST(buildRequest({ alt: '' }));
    expect(res.status).toBe(400);
    expect(mocks.createMedia).not.toHaveBeenCalled();
  });
});