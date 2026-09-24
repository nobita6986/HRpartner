import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveChatHref } from '@/app/components/FloatingChatActions';

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

describe('public layout wiring', () => {
  it('mounts the launcher on portal and public job surfaces only', () => {
    const portal = readFileSync(join(process.cwd(), 'app/(portal)/layout.tsx'), 'utf8');
    const jobs = readFileSync(join(process.cwd(), 'app/(jobs)/viec-lam/layout.tsx'), 'utf8');
    const root = readFileSync(join(process.cwd(), 'app/layout.tsx'), 'utf8');

    expect(portal).toContain('<FloatingChatActions />');
    expect(jobs).toContain('<FloatingChatActions />');
    expect(root).not.toContain('FloatingChatActions');
  });
});
