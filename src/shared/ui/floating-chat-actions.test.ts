import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveChatHref, resolvePhoneHref } from '@/src/domains/job-board/chat-links';

describe('resolveChatHref', () => {
  it('accepts canonical Zalo and Messenger HTTPS URLs', () => {
    expect(resolveChatHref('https://zalo.me/123456', 'zalo')).toBe('https://zalo.me/123456');
    expect(resolveChatHref('https://m.me/hrpartner?ref=jobs', 'messenger')).toBe(
      'https://m.me/hrpartner?ref=jobs',
    );
  });

  it('rejects insecure, credentialed, cross-platform and arbitrary links', () => {
    expect(resolveChatHref('http://zalo.me/123456', 'zalo')).toBeNull();
    expect(resolveChatHref('https://user:pass@zalo.me/123456', 'zalo')).toBeNull();
    expect(resolveChatHref('https://m.me/hrpartner', 'zalo')).toBeNull();
    expect(resolveChatHref('https://example.com/chat', 'messenger')).toBeNull();
    expect(resolveChatHref('javascript:alert(1)', 'messenger')).toBeNull();
  });

  it('does not render a destination for missing or malformed configuration', () => {
    expect(resolveChatHref(undefined, 'zalo')).toBeNull();
    expect(resolveChatHref('  ', 'messenger')).toBeNull();
    expect(resolveChatHref('not a url', 'zalo')).toBeNull();
  });
});

describe('resolvePhoneHref', () => {
  it('accepts local and international phone numbers', () => {
    expect(resolvePhoneHref('0901234567')).toBe('tel:0901234567');
    expect(resolvePhoneHref('(+84) 901-234-567')).toBe('tel:+84901234567');
  });

  it('rejects missing, short and URI-shaped values', () => {
    expect(resolvePhoneHref(undefined)).toBeNull();
    expect(resolvePhoneHref('123')).toBeNull();
    expect(resolvePhoneHref('tel:+84901234567')).toBeNull();
    expect(resolvePhoneHref('javascript:alert(1)')).toBeNull();
  });
});

describe('public layout wiring', () => {
  it('mounts the launcher on portal and public job surfaces only', () => {
    const portal = readFileSync(join(process.cwd(), 'app/(portal)/layout.tsx'), 'utf8');
    const jobs = readFileSync(join(process.cwd(), 'app/(jobs)/viec-lam/layout.tsx'), 'utf8');
    const root = readFileSync(join(process.cwd(), 'app/layout.tsx'), 'utf8');

    expect(portal).toContain('<FloatingChatActions />');
    expect(jobs).toContain('<FloatingChatActions />');
    expect(root).not.toContain('FloatingChatActions');
  });

  it('reads destinations from HomepageSettings instead of environment variables', () => {
    const component = readFileSync(
      join(process.cwd(), 'app/components/FloatingChatActions.tsx'),
      'utf8',
    );
    const adminForm = readFileSync(
      join(process.cwd(), 'app/admin/settings/admin-settings-form.tsx'),
      'utf8',
    );

    expect(component).toContain('getHomepageSettings');
    expect(component).toContain("tags: ['homepage-settings']");
    expect(component).not.toContain('process.env.ZALO_CHAT_URL');
    expect(component).not.toContain('process.env.MESSENGER_CHAT_URL');
    expect(adminForm).toContain('zaloChatUrl-input');
    expect(adminForm).toContain('messengerChatUrl-input');
    expect(adminForm).toContain('phoneCallNumber-input');
    expect(component).toContain('data-testid="phone-call-action"');
    expect(component.indexOf('data-testid="phone-call-action"')).toBeLessThan(
      component.indexOf('Chat với HRPartner qua Zalo'),
    );
    expect(component.indexOf('Chat với HRPartner qua Zalo')).toBeLessThan(
      component.indexOf('Chat với HRPartner qua Messenger'),
    );
  });
});
