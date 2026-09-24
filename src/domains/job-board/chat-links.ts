export type ChatChannel = 'zalo' | 'messenger';

export const CHAT_URL_MAX_LENGTH = 2048;
export const PHONE_INPUT_MAX_LENGTH = 32;

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

export class InvalidPhoneNumberError extends Error {
  constructor() {
    super('Số điện thoại không hợp lệ.');
    this.name = 'InvalidPhoneNumberError';
  }
}

/** Store a compact phone number suitable for a tel: link. */
export function normalizePhoneNumber(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined || raw.trim() === '') return null;

  const trimmed = raw.trim();
  if (trimmed.length > PHONE_INPUT_MAX_LENGTH || !/^[+\d\s().-]+$/.test(trimmed)) {
    throw new InvalidPhoneNumberError();
  }

  const canonical = trimmed.replace(/[\s().-]/g, '');
  if (!/^\+?[0-9]{7,15}$/.test(canonical)) throw new InvalidPhoneNumberError();
  return canonical;
}

/** Defense-in-depth projection for public rendering of a stored phone number. */
export function resolvePhoneNumber(raw: string | null | undefined): string | null {
  try {
    return normalizePhoneNumber(raw);
  } catch {
    return null;
  }
}

export function resolvePhoneHref(raw: string | null | undefined): string | null {
  const phoneNumber = resolvePhoneNumber(raw);
  return phoneNumber ? `tel:${phoneNumber}` : null;
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
