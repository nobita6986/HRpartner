import type { HomepageSettingsDto } from '@/src/domains/job-board/public-types';
import type { StickyAnnouncementDto } from '@/src/domains/job-board/public-content-controls/types';

export interface HomepageSettingsDraft {
  bestJobsPageSize: number;
  listingPageSize: number;
  zaloChatUrl: string;
  messengerChatUrl: string;
  phoneCallNumber: string;
  newsSectionEnabled: boolean;
  stickyAnnouncement: StickyAnnouncementDto | null;
}

export type HomepageSettingsPatch = Partial<
  Pick<
    HomepageSettingsDto,
    | 'bestJobsPageSize'
    | 'listingPageSize'
    | 'zaloChatUrl'
    | 'messengerChatUrl'
    | 'phoneCallNumber'
    | 'newsSectionEnabled'
  >
> & { stickyAnnouncement?: StickyAnnouncementDto | null };

function stickyAnnouncementsEqual(
  left: StickyAnnouncementDto,
  right: StickyAnnouncementDto,
): boolean {
  return (
    left.enabled === right.enabled &&
    left.message === right.message &&
    left.ctaLabel === right.ctaLabel &&
    left.ctaUrl === right.ctaUrl &&
    left.dismissible === right.dismissible &&
    left.backgroundOpacity === right.backgroundOpacity &&
    left.marqueeDurationSeconds === right.marqueeDurationSeconds &&
    left.textColor === right.textColor &&
    left.font === right.font &&
    left.emphasis === right.emphasis &&
    left.animation === right.animation &&
    left.contentRevision === right.contentRevision
  );
}

/** Build the partial admin write body without overwriting unrelated settings. */
export function buildHomepageSettingsPatch(
  draft: HomepageSettingsDraft,
  saved: HomepageSettingsDto,
): HomepageSettingsPatch {
  const patch: HomepageSettingsPatch = {};

  if (draft.bestJobsPageSize !== saved.bestJobsPageSize) {
    patch.bestJobsPageSize = draft.bestJobsPageSize as HomepageSettingsDto['bestJobsPageSize'];
  }
  if (draft.listingPageSize !== saved.listingPageSize) {
    patch.listingPageSize = draft.listingPageSize;
  }
  if (draft.zaloChatUrl !== (saved.zaloChatUrl ?? '')) {
    patch.zaloChatUrl = draft.zaloChatUrl;
  }
  if (draft.messengerChatUrl !== (saved.messengerChatUrl ?? '')) {
    patch.messengerChatUrl = draft.messengerChatUrl;
  }
  if (draft.phoneCallNumber !== (saved.phoneCallNumber ?? '')) {
    patch.phoneCallNumber = draft.phoneCallNumber;
  }
  if (draft.newsSectionEnabled !== saved.newsSectionEnabled) {
    patch.newsSectionEnabled = draft.newsSectionEnabled;
  }

  if (draft.stickyAnnouncement === null) {
    if (saved.stickyAnnouncement.enabled) patch.stickyAnnouncement = null;
  } else if (!stickyAnnouncementsEqual(draft.stickyAnnouncement, saved.stickyAnnouncement)) {
    patch.stickyAnnouncement = draft.stickyAnnouncement;
  }

  return patch;
}
