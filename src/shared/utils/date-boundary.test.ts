import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getExpirationBoundaryBkk, isExpired } from './date-boundary';

describe('date-boundary utils', () => {
  describe('getExpirationBoundaryBkk', () => {
    it('exact vector: 2026-09-10T07:00:00Z + 7 calendar days = 2026-09-16T17:00:00Z', () => {
      const boundary = getExpirationBoundaryBkk('2026-09-10T07:00:00Z', 7);
      expect(boundary.toISOString()).toBe('2026-09-16T17:00:00.000Z');
    });

    it('nCalendarDays = 0 behavior: returns start of current day in BKK', () => {
      // 2026-09-10T07:00:00Z is 2026-09-10 14:00 BKK. Start of that day is 2026-09-09T17:00:00Z.
      const boundary = getExpirationBoundaryBkk('2026-09-10T07:00:00Z', 0);
      expect(boundary.toISOString()).toBe('2026-09-09T17:00:00.000Z');
    });

    it('rejects negative nCalendarDays', () => {
      expect(() => getExpirationBoundaryBkk('2026-09-10T07:00:00Z', -1)).toThrow('nCalendarDays must be a non-negative integer');
    });

    it('rejects non-integer nCalendarDays', () => {
      expect(() => getExpirationBoundaryBkk('2026-09-10T07:00:00Z', 1.5)).toThrow('nCalendarDays must be a non-negative integer');
    });

    it('rejects invalid date string', () => {
      expect(() => getExpirationBoundaryBkk('invalid-date', 7)).toThrow('Invalid date anchor');
    });

    it('rejects invalid Date object', () => {
      expect(() => getExpirationBoundaryBkk(new Date('invalid'), 7)).toThrow('Invalid date anchor');
    });

    it('handles month/year rollover correctly', () => {
      // Dec 31 14:00 BKK -> Jan 1 00:00 BKK next day
      const boundary = getExpirationBoundaryBkk('2026-12-31T07:00:00Z', 1);
      expect(boundary.toISOString()).toBe('2026-12-31T17:00:00.000Z'); // 2027-01-01 00:00 BKK
    });

    describe('machine-timezone independence', () => {
      const originalTz = process.env.TZ;

      afterEach(() => {
        process.env.TZ = originalTz;
      });

      it('works identically in UTC timezone', () => {
        process.env.TZ = 'UTC';
        const boundary = getExpirationBoundaryBkk('2026-09-10T07:00:00Z', 7);
        expect(boundary.toISOString()).toBe('2026-09-16T17:00:00.000Z');
      });

      it('works identically in America/New_York timezone', () => {
        process.env.TZ = 'America/New_York';
        const boundary = getExpirationBoundaryBkk('2026-09-10T07:00:00Z', 7);
        expect(boundary.toISOString()).toBe('2026-09-16T17:00:00.000Z');
      });
    });
  });

  describe('isExpired', () => {
    it('now < expiresAt -> false', () => {
      expect(isExpired('2026-09-16T16:59:59.999Z', '2026-09-16T17:00:00Z')).toBe(false);
    });

    it('now === expiresAt -> true', () => {
      expect(isExpired('2026-09-16T17:00:00.000Z', '2026-09-16T17:00:00Z')).toBe(true);
    });

    it('now > expiresAt -> true', () => {
      expect(isExpired('2026-09-16T17:00:00.001Z', '2026-09-16T17:00:00Z')).toBe(true);
    });
  });
});
