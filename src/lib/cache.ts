/**
 * Cache service — mimics Redis API for development.
 * Production: swap this for @upstash/redis or ioredis.
 *
 * M8: RQ-01 — provides Get/Set/Delete/DelPattern for:
 * - Payslip cache (JSON mock from Python app)
 * - Rate limiting state
 */

export interface CacheOptions {
  ttlMs?: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

// Cleanup expired entries periodically
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;
function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setTimeout(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt <= now) store.delete(key);
    }
    cleanupTimer = null;
    ensureCleanup();
  }, 30_000);
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const entry = store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      store.delete(key);
      return null;
    }
    return entry.value;
  },

  async set<T>(key: string, value: T, opts: CacheOptions = {}): Promise<void> {
    const ttlMs = opts.ttlMs ?? 300_000; // 5 min default
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
    ensureCleanup();
  },

  async del(key: string): Promise<void> {
    store.delete(key);
  },

  async delPattern(pattern: string): Promise<void> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of store.keys()) {
      if (regex.test(key)) store.delete(key);
    }
  },

  async exists(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val !== null;
  },

  async ttl(key: string): Promise<number> {
    const entry = store.get(key);
    if (!entry) return -1;
    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : -1;
  },

  /** Rate limit helper: increment counter, return count + reset if needed */
  async incrWithWindow(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    const entry = store.get(key) as CacheEntry<{ count: number; resetAt: number }> | undefined;
    const now = Date.now();

    if (!entry || entry.expiresAt <= now) {
      const resetAt = now + windowMs;
      await this.set(key, { count: 1, resetAt }, { ttlMs: windowMs });
      return { count: 1, resetAt };
    }

    const updated = { count: entry.value.count + 1, resetAt: entry.value.resetAt };
    store.set(key, { value: updated, expiresAt: entry.expiresAt });
    return updated;
  },
};
