import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  getPrisma: vi.fn(),
  updateHomepageSettings: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock('@/src/lib/db', () => ({ getPrisma: mocks.getPrisma }));
vi.mock('@/src/shared/auth/auth-context', () => ({
  AuthSessionError: class AuthSessionError extends Error {
    constructor(public readonly code: string, message: string) {
      super(message);
      this.name = 'AuthSessionError';
    }
  },
  getAuthContext: mocks.getAuthContext,
}));
vi.mock('@/src/domains/job-board/public-settings.service', () => ({
  SettingsRowMissingError: class SettingsRowMissingError extends Error {
    constructor() {
      super('SETTINGS_ROW_MISSING');
      this.name = 'SettingsRowMissingError';
    }
  },
  updateHomepageSettings: mocks.updateHomepageSettings,
}));

const stickyAnnouncement = {
  enabled: true,
  message: 'Thông báo tuyển dụng',
  ctaLabel: 'Mở',
  ctaUrl: 'https://hrpartner.vn/about',
  dismissible: true,
  backgroundOpacity: 100,
  marqueeDurationSeconds: 18,
  textColor: 'on-primary',
  font: 'SANS',
  emphasis: 'BOLD',
  animation: 'NONE',
  contentRevision: 'rev-1',
};

const returnedSettings = {
  id: 'default',
  bestJobsPageSize: 9,
  listingPageSize: 12,
  zaloChatUrl: null,
  messengerChatUrl: null,
  phoneCallNumber: null,
  newsSectionEnabled: false,
  stickyAnnouncement,
  updatedAt: '2026-10-04T00:00:00.000Z',
};

function request(body: Record<string, unknown>): NextRequest {
  return new NextRequest('https://example.com/api/admin/homepage-settings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/homepage-settings — UI2 contract', () => {
  beforeEach(() => {
    mocks.getAuthContext.mockReset();
    mocks.getPrisma.mockReset();
    mocks.updateHomepageSettings.mockReset();
    mocks.revalidateTag.mockReset();
    mocks.getAuthContext.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' });
    mocks.getPrisma.mockReturnValue({ __prisma: true });
    mocks.updateHomepageSettings.mockResolvedValue({
      settings: returnedSettings,
      actorId: 'admin-1',
    });
  });

  it('persists a valid UI2 payload and revalidates the public cache', async () => {
    const { POST } = await import('./route');
    const response = await POST(request({ newsSectionEnabled: false, stickyAnnouncement }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ settings: returnedSettings });
    expect(mocks.updateHomepageSettings).toHaveBeenCalledWith(
      { __prisma: true },
      expect.objectContaining({ newsSectionEnabled: false, stickyAnnouncement }),
      'admin-1',
    );
    expect(mocks.revalidateTag).toHaveBeenCalledWith('homepage-settings');
  });

  it('returns 400 for a message over 280 characters without writing', async () => {
    const { POST } = await import('./route');
    const response = await POST(
      request({ stickyAnnouncement: { ...stickyAnnouncement, message: 'X'.repeat(281) } }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'INVALID_INPUT' });
    expect(mocks.updateHomepageSettings).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it('returns 400 for an unsafe CTA URL without writing', async () => {
    const { POST } = await import('./route');
    const response = await POST(
      request({ stickyAnnouncement: { ...stickyAnnouncement, ctaUrl: 'javascript:alert(1)' } }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'INVALID_INPUT' });
    expect(mocks.updateHomepageSettings).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it('returns 400 for opacity outside the supported range without writing', async () => {
    const { POST } = await import('./route');
    const response = await POST(
      request({ stickyAnnouncement: { ...stickyAnnouncement, backgroundOpacity: 101 } }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'INVALID_INPUT' });
    expect(mocks.updateHomepageSettings).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it('returns 400 for marquee duration outside the supported range without writing', async () => {
    const { POST } = await import('./route');
    const response = await POST(
      request({
        stickyAnnouncement: { ...stickyAnnouncement, animation: 'MARQUEE', marqueeDurationSeconds: 61 },
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'INVALID_INPUT' });
    expect(mocks.updateHomepageSettings).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });
});
