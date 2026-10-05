import { describe, expect, it } from 'vitest';
import type { HomepageSettingsDto } from '@/src/domains/job-board/public-types';
import type { HomepageSettingsDraft } from './homepage-settings-patch';
import { buildHomepageSettingsPatch } from './homepage-settings-patch';

const saved: HomepageSettingsDto = {
  id: 'default',
  bestJobsPageSize: 9,
  listingPageSize: 12,
  zaloChatUrl: null,
  messengerChatUrl: null,
  phoneCallNumber: null,
  newsSectionEnabled: true,
  stickyAnnouncement: {
    enabled: true,
    message: 'Thông báo cũ',
    ctaLabel: 'Xem thêm',
    ctaUrl: '/viec-lam',
    dismissible: true,
    backgroundOpacity: 100,
    marqueeDurationSeconds: 18,
    textColor: 'on-primary',
    font: 'SANS',
    emphasis: 'BOLD',
    animation: 'NONE',
    contentRevision: 'rev-1',
  },
  updatedAt: '2026-10-04T00:00:00.000Z',
};

function draft(overrides: Partial<HomepageSettingsDraft> = {}): HomepageSettingsDraft {
  return {
    bestJobsPageSize: saved.bestJobsPageSize,
    listingPageSize: saved.listingPageSize,
    zaloChatUrl: saved.zaloChatUrl ?? '',
    messengerChatUrl: saved.messengerChatUrl ?? '',
    phoneCallNumber: saved.phoneCallNumber ?? '',
    newsSectionEnabled: saved.newsSectionEnabled,
    stickyAnnouncement: saved.stickyAnnouncement,
    ...overrides,
  };
}

describe('buildHomepageSettingsPatch', () => {
  it('returns an empty object when nothing changed', () => {
    expect(buildHomepageSettingsPatch(draft(), saved)).toEqual({});
  });

  it('sends only the changed news toggle', () => {
    expect(
      buildHomepageSettingsPatch(draft({ newsSectionEnabled: false }), saved),
    ).toEqual({ newsSectionEnabled: false });
  });

  it('sends only one changed legacy setting', () => {
    expect(buildHomepageSettingsPatch(draft({ listingPageSize: 24 }), saved)).toEqual({
      listingPageSize: 24,
    });
  });

  it('sends the complete sticky object when one sticky field changed', () => {
    const stickyAnnouncement = {
      ...saved.stickyAnnouncement,
      message: 'Thông báo mới',
      contentRevision: 'rev-2',
    };

    expect(buildHomepageSettingsPatch(draft({ stickyAnnouncement }), saved)).toEqual({
      stickyAnnouncement,
    });
  });

  it('sends the complete sticky object when background opacity changes', () => {
    const stickyAnnouncement = {
      ...saved.stickyAnnouncement,
      backgroundOpacity: 60,
    };

    expect(buildHomepageSettingsPatch(draft({ stickyAnnouncement }), saved)).toEqual({
      stickyAnnouncement,
    });
  });

  it('sends the complete sticky object when marquee duration changes', () => {
    const stickyAnnouncement = {
      ...saved.stickyAnnouncement,
      marqueeDurationSeconds: 12,
    };

    expect(buildHomepageSettingsPatch(draft({ stickyAnnouncement }), saved)).toEqual({
      stickyAnnouncement,
    });
  });

  it('sends null when an enabled sticky announcement is disabled', () => {
    expect(buildHomepageSettingsPatch(draft({ stickyAnnouncement: null }), saved)).toEqual({
      stickyAnnouncement: null,
    });
  });

  it('does not resend null for an already disabled announcement', () => {
    const disabledSaved: HomepageSettingsDto = {
      ...saved,
      stickyAnnouncement: { ...saved.stickyAnnouncement, enabled: false },
    };

    expect(buildHomepageSettingsPatch(draft({ stickyAnnouncement: null }), disabledSaved)).toEqual({});
  });
});
