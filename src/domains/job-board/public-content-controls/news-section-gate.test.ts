/**
 * public-content-controls/news-section-gate.test.ts — News toggle gate resolver.
 */

import { describe, expect, it } from 'vitest';
import { resolveNewsSectionGate } from './news-section-gate';

describe('resolveNewsSectionGate', () => {
  it('returns enabled=true, source=REAL when toggle is true', () => {
    expect(resolveNewsSectionGate({ newsSectionEnabled: true })).toEqual({
      enabled: true,
      source: 'REAL',
    });
  });

  it('returns enabled=false, source=REAL when toggle is false', () => {
    expect(resolveNewsSectionGate({ newsSectionEnabled: false })).toEqual({
      enabled: false,
      source: 'REAL',
    });
  });

  it('returns default ON (enabled=true) when toggle is null', () => {
    // Default ON preserves the current public state when the row is missing.
    expect(resolveNewsSectionGate(null)).toEqual({
      enabled: true,
      source: 'INTEGRATION_PENDING',
    });
  });

  it('returns default ON (enabled=true) when toggle is undefined', () => {
    expect(resolveNewsSectionGate(undefined)).toEqual({
      enabled: true,
      source: 'INTEGRATION_PENDING',
    });
  });
});
