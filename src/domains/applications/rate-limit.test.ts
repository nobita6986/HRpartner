/**
 * rate-limit unit tests — MP-2 STEP-03 (RQ-04 / RISK-03). Pure, injected clock.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkTrackingRateLimit,
  __resetTrackingRateLimit,
  clientKeyFromHeaders,
} from './rate-limit';

describe('checkTrackingRateLimit', () => {
  beforeEach(() => __resetTrackingRateLimit());

  it('allows up to max within a window then blocks', () => {
    let t = 1_000_000;
    const now = () => t;
    const opts = { max: 3, windowMs: 60_000, now };

    expect(checkTrackingRateLimit('ip-1', opts)).toMatchObject({ allowed: true, remaining: 2 });
    expect(checkTrackingRateLimit('ip-1', opts)).toMatchObject({ allowed: true, remaining: 1 });
    expect(checkTrackingRateLimit('ip-1', opts)).toMatchObject({ allowed: true, remaining: 0 });

    const blocked = checkTrackingRateLimit('ip-1', opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1);
  });

  it('resets after the window elapses', () => {
    let t = 2_000_000;
    const now = () => t;
    const opts = { max: 1, windowMs: 60_000, now };

    expect(checkTrackingRateLimit('ip-2', opts).allowed).toBe(true);
    expect(checkTrackingRateLimit('ip-2', opts).allowed).toBe(false);

    t += 60_001; // window elapsed
    expect(checkTrackingRateLimit('ip-2', opts).allowed).toBe(true);
  });

  it('tracks keys independently', () => {
    const now = () => 3_000_000;
    const opts = { max: 1, windowMs: 60_000, now };
    expect(checkTrackingRateLimit('a', opts).allowed).toBe(true);
    expect(checkTrackingRateLimit('b', opts).allowed).toBe(true);
    expect(checkTrackingRateLimit('a', opts).allowed).toBe(false);
  });
});

describe('clientKeyFromHeaders', () => {
  it('prefers the first x-forwarded-for hop', () => {
    const h = new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' });
    expect(clientKeyFromHeaders(h)).toBe('203.0.113.9');
  });
  it('falls back to x-real-ip then unknown', () => {
    expect(clientKeyFromHeaders(new Headers({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7');
    expect(clientKeyFromHeaders(new Headers())).toBe('unknown');
  });
});
