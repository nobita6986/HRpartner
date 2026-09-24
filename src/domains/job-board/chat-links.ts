export type ChatChannel = 'zalo' | 'messenger';

export const CHAT_URL_MAX_LENGTH = 2048;

const CHAT_HOSTS: Record<ChatChannel, ReadonlySet<string>> = {
  zalo: new Set(['zalo.me', 'oa.zalo.me', 'chat.zalo.me']),
  messenger: new Set(['m.me', 'messenger.com', 'www.messenger.com']),
};

export class InvalidChatUrlError extends Error {
  readonly channel: ChatChannel;

  constructor(channel: ChatChannel) {
    super(channel === 'zalo' ? 'URL Zalo không hợp lệ.' : 'URL Messenger không hợp lệ.');
    this.name = 'InvalidChatUrlError';
    this.channel = channel;
  }
}

/**
 * Normalize an optional admin-managed chat destination.
 * Empty values disable the channel; non-empty values must be HTTPS URLs on
 * the platform allow-list and must not contain embedded credentials.
 */
export function normalizeChatUrl(
  raw: string | null | undefined,
  channel: ChatChannel,
): string | null {
  if (raw === null || raw === undefined || raw.trim() === '') return null;

  const trimmed = raw.trim();
  if (trimmed.length > CHAT_URL_MAX_LENGTH) throw new InvalidChatUrlError(channel);

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' || url.username || url.password) {
      throw new InvalidChatUrlError(channel);
    }
    if (!CHAT_HOSTS[channel].has(url.hostname.toLowerCase())) {
      throw new InvalidChatUrlError(channel);
    }
    return url.toString();
  } catch (error) {
    if (error instanceof InvalidChatUrlError) throw error;
    throw new InvalidChatUrlError(channel);
  }
}

/** Defense-in-depth projection for public rendering of stored values. */
export function resolveChatHref(
  raw: string | null | undefined,
  channel: ChatChannel,
): string | null {
  try {
    return normalizeChatUrl(raw, channel);
  } catch {
    return null;
  }
}
