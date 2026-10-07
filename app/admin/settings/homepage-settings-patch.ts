import type {
  HeroSlideInput,
  HomepageSettingsDto,
} from '@/src/domains/job-board/public-types';
import type { StickyAnnouncementDto } from '@/src/domains/job-board/public-content-controls/types';

export interface HomepageSettingsDraft {
  bestJobsPageSize: number;
  listingPageSize: number;
  zaloChatUrl: string;
  messengerChatUrl: string;
  phoneCallNumber: string;
  newsSectionEnabled: boolean;
  stickyAnnouncement: StickyAnnouncementDto | null;
  /** hrp-t2-public-site-hotfix (T2 / STEP-07): media id của ảnh Hero. null = clear. */
  heroImageMediaId: string | null;
  /**
   * hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-05):
   * mảng 5 slide cho Hero carousel bên phải trang chủ. Mỗi slot mang
   * `mediaId` nullable + title + desc. Patch emit toàn bộ mảng khi có
   * thay đổi (atomic save).
   */
  heroSlides: HeroSlideInput[];
  /**
   * hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-05):
   * true khi admin bấm "Khôi phục mặc định" — patch sẽ emit
   * `heroSlides: null` để server xoá cột JSONB và fallback hardcoded.
   */
  heroSlidesReset: boolean;
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
> & {
  stickyAnnouncement?: StickyAnnouncementDto | null;
  /** hrp-t2-public-site-hotfix (T2 / STEP-07): Hero image FK. */
  heroImageMediaId?: string | null;
  /**
   * hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-05):
   * 5 slide JSONB payload cho cột `homepage_settings.hero_slides`.
   * `null` xoá override → fallback hardcoded.
   */
  heroSlides?: HeroSlideInput[] | null;
};

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

  // hrp-t2-public-site-hotfix (T2 / STEP-07): Hero image — track media id,
  // không track URL (mô tả cho media.url đến từ media row sau khi join).
  const savedHeroId = saved.heroImage?.mediaId ?? null;
  if (draft.heroImageMediaId !== savedHeroId) {
    patch.heroImageMediaId = draft.heroImageMediaId;
  }

  // hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-05):
  // so sánh element-wise (5 slot). Bất kỳ khác biệt nào → patch emit nguyên
  // mảng (atomic JSONB save). saved.heroSlides rỗng = fallback hardcoded;
  // patch rỗng → bỏ qua (server giữ nguyên cột hiện tại).
  const savedSlides = saved.heroSlides ?? [];
  if (draft.heroSlidesReset) {
    // hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-05):
    // admin chọn "Khôi phục mặc định" → patch null để server xoá cột JSONB,
    // public surface render hardcoded array.
    if (savedSlides.length > 0) patch.heroSlides = null;
  } else if (!heroSlidesEqual(draft.heroSlides, savedSlides)) {
    patch.heroSlides = draft.heroSlides.map((s) => ({
      mediaId: s.mediaId,
      title: s.title,
      desc: s.desc,
    }));
  }

  return patch;
}

/**
 * hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-05):
 * So sánh 2 mảng slide (cùng length). Khi case let saved rỗng và draft cũng
 * rỗng → equal (không patch). Length khác → khác.
 */
function heroSlidesEqual(
  draft: HeroSlideInput[],
  saved: ReadonlyArray<{ mediaId: string | null; title: string; desc: string }>,
): boolean {
  if (draft.length !== saved.length) return false;
  for (let i = 0; i < draft.length; i += 1) {
    const a = draft[i]!;
    const b = saved[i]!;
    if (a.mediaId !== b.mediaId) return false;
    if (a.title !== b.title) return false;
    if (a.desc !== b.desc) return false;
  }
  return true;
}