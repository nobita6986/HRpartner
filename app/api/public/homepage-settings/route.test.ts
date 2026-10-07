import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPrisma: vi.fn(),
  getHomepageSettings: vi.fn(),
}));

vi.mock('next/cache', () => ({
  unstable_cache: (read: () => Promise<unknown>) => read,
}));

vi.mock('@/src/lib/db', () => ({ getPrisma: mocks.getPrisma }));
vi.mock('@/src/domains/job-board/public-settings.service', () => ({
  getHomepageSettings: mocks.getHomepageSettings,
}));

const settings = {
  id: 'default' as const,
  bestJobsPageSize: 9 as const,
  listingPageSize: 12,
  zaloChatUrl: null,
  messengerChatUrl: null,
  phoneCallNumber: null,
  newsSectionEnabled: false,
  stickyAnnouncement: {
    enabled: true,
    message: 'Thông báo tuyển dụng',
    ctaLabel: 'Xem việc làm',
    ctaUrl: '/viec-lam',
    dismissible: true,
    backgroundOpacity: 100,
    marqueeDurationSeconds: 18,
    textColor: 'on-primary' as const,
    font: 'SANS' as const,
    emphasis: 'BOLD' as const,
    animation: 'NONE' as const,
    contentRevision: 'rev-2',
  },
  updatedAt: '2026-10-04T00:00:00.000Z',
};

describe('GET /api/public/homepage-settings', () => {
  beforeEach(() => {
    mocks.getPrisma.mockReset();
    mocks.getHomepageSettings.mockReset();
    mocks.getPrisma.mockReturnValue({ __prisma: true });
    mocks.getHomepageSettings.mockResolvedValue(settings);
  });

  it('returns the UI2 public settings projection', async () => {
    const { GET } = await import('./route');
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      newsSectionEnabled: false,
      stickyAnnouncement: settings.stickyAnnouncement,
    });
    expect(mocks.getHomepageSettings).toHaveBeenCalledWith({ __prisma: true });
  });
});
