import { unstable_cache } from 'next/cache';
import { Phone } from 'lucide-react';
import { getPrisma } from '@/src/lib/db';
import { getHomepageSettings } from '@/src/domains/job-board/public-settings.service';
import { resolveChatHref, resolvePhoneHref } from '@/src/domains/job-board/chat-links';

const getCachedChatSettings = unstable_cache(
  async () => getHomepageSettings(getPrisma()),
  ['floating-chat-settings-v1'],
  { revalidate: 60, tags: ['homepage-settings'] },
);

function ZaloIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="white" />
      <path d="M9 13h21.5c5.25 0 9.5 4.25 9.5 9.5v3c0 5.25-4.25 9.5-9.5 9.5H23l-6.5 5v-5H9V13Z" fill="#0A68FE" />
      <text x="12" y="28.5" fill="white" fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">Zalo</text>
    </svg>
  );
}

function MessengerIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden="true">
      <path
        fill="white"
        d="M24 7C14.06 7 6 14.46 6 23.67c0 5.25 2.62 9.93 6.72 12.99V43l6.15-3.38c1.64.45 3.36.71 5.13.71 9.94 0 18-7.46 18-16.66S33.94 7 24 7Zm1.79 22.44-4.58-4.89-8.94 4.89 9.83-10.43 4.69 4.89 8.83-4.89-9.83 10.43Z"
      />
    </svg>
  );
}

export async function FloatingChatActions() {
  let zaloHref: string | null = null;
  let messengerHref: string | null = null;
  let phoneHref: string | null = null;

  try {
    const settings = await getCachedChatSettings();
    zaloHref = resolveChatHref(settings.zaloChatUrl, 'zalo');
    messengerHref = resolveChatHref(settings.messengerChatUrl, 'messenger');
    phoneHref = resolvePhoneHref(settings.phoneCallNumber);
  } catch (error) {
    console.error('[FloatingChatActions] failed to read homepage settings:', error);
  }

  if (!phoneHref && !zaloHref && !messengerHref) return null;

  return (
    <aside
      aria-label="Kênh hỗ trợ trực tuyến"
      className="fixed right-4 z-50 flex flex-col items-end gap-3 sm:right-6"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      data-testid="floating-chat-actions"
    >
      {phoneHref && (
        <a
          href={phoneHref}
          aria-label="Gọi điện cho HRPartner"
          title="Gọi điện"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2DBE3F] shadow-lg ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:bg-[#27AA37] hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2DBE3F] sm:h-14 sm:w-14"
          data-testid="phone-call-action"
        >
          <Phone className="h-7 w-7 fill-white text-white" aria-hidden="true" />
          <span className="sr-only">Gọi điện</span>
        </a>
      )}

      {zaloHref && (
        <a
          href={zaloHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat với HRPartner qua Zalo"
          title="Chat qua Zalo"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0A68FE] shadow-lg ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A68FE] sm:h-14 sm:w-14"
        >
          <ZaloIcon />
          <span className="sr-only">Zalo</span>
        </a>
      )}

      {messengerHref && (
        <a
          href={messengerHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat với HRPartner qua Messenger"
          title="Chat qua Messenger"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#00B2FF] via-[#168AFF] to-[#A033FF] shadow-lg ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168AFF] sm:h-14 sm:w-14"
        >
          <MessengerIcon />
          <span className="sr-only">Messenger</span>
        </a>
      )}
    </aside>
  );
}
