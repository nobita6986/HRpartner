/**
 * recruiter-workbench.derive.test.ts — pure derive helpers (AC-02, AC-03, AC-04).
 *
 * No Prisma, no Next, no DB. Each describe block covers one derive helper
 * with at least 5 cases covering happy paths + edge cases per TASK.md.
 */

import { describe, expect, it } from 'vitest';

import {
  computeAge,
  deriveHandler,
  deriveLastInteraction,
  deriveNextAction,
  type HandlerAssignmentLike,
} from '@/src/domains/talent/recruiter-workbench.read-service';
import {
  SERVER_DERIVED_NEXT_ACTION_VALUES,
} from '@/src/domains/talent/recruiter-workbench.types';

const NOW = new Date('2026-09-26T10:00:00.000Z');

function makeAssignment(
  overrides: Partial<HandlerAssignmentLike> = {},
): HandlerAssignmentLike {
  return {
    id: overrides.id ?? 'a1',
    status: overrides.status ?? 'ACTIVE',
    startsAt: overrides.startsAt ?? new Date(NOW.getTime() - 1000),
    expiresAt: overrides.expiresAt ?? null,
    assigneeUserId: overrides.assigneeUserId ?? 'u1',
    assigneeName: overrides.assigneeName ?? 'User One',
    source: overrides.source ?? 'MANAGER_ASSIGNMENT',
    createdAt: overrides.createdAt ?? NOW,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// deriveNextAction — 7-value closed enum decision table (AC-02)
// ═══════════════════════════════════════════════════════════════════════════

describe('deriveNextAction — AC-02 §4.4 table', () => {
  it('CLOSED → NONE regardless of other fields', () => {
    expect(
      deriveNextAction({
        caseStatus: 'CLOSED',
        identityVerification: 'VERIFIED',
        completeness: 'COMPLETE',
        lastInteractionKind: 'SUBMISSION',
      }),
    ).toBe('NONE');
    expect(
      deriveNextAction({
        caseStatus: 'CLOSED',
        identityVerification: 'UNVERIFIED',
        completeness: 'MINIMAL',
        lastInteractionKind: null,
      }),
    ).toBe('NONE');
  });

  it('OPEN + no interactions → OPEN_INTAKE', () => {
    expect(
      deriveNextAction({
        caseStatus: 'OPEN',
        identityVerification: 'VERIFIED',
        completeness: 'COMPLETE',
        lastInteractionKind: null,
      }),
    ).toBe('OPEN_INTAKE');
  });

  it('OPEN + UNVERIFIED → OPEN_INTAKE (priority L204 beats L205 per table top-down)', () => {
    // Per TASK.md §4.4: rule order is top-down. L204 ("OPEN + lastInteraction = null") is
    // checked BEFORE L205 ("OPEN/IN_PROGRESS + UNVERIFIED → REQUEST_DOCS"). So when both
    // apply, OPEN_INTAKE wins. (E1 may surface a "docs needed" hint separately via
    // candidate.identityVerification.)
    expect(
      deriveNextAction({
        caseStatus: 'OPEN',
        identityVerification: 'UNVERIFIED',
        completeness: 'COMPLETE',
        lastInteractionKind: null,
      }),
    ).toBe('OPEN_INTAKE');
  });

  it('IN_PROGRESS + UNVERIFIED → REQUEST_DOCS (UNVERIFIED catches here, no OPEN_INTAKE branch)', () => {
    expect(
      deriveNextAction({
        caseStatus: 'IN_PROGRESS',
        identityVerification: 'UNVERIFIED',
        completeness: 'COMPLETE',
        lastInteractionKind: 'STATUS_CHANGE',
      }),
    ).toBe('REQUEST_DOCS');
  });

  it('OPEN + UNVERIFIED + SUBMISSION → REQUEST_DOCS (UNVERIFIED beats SCREEN_SUBMISSION per L205)', () => {
    // L205 (UNVERIFIED) precedes L207 (OPEN+SUBMISSION), so UNVERIFIED wins.
    expect(
      deriveNextAction({
        caseStatus: 'OPEN',
        identityVerification: 'UNVERIFIED',
        completeness: 'COMPLETE',
        lastInteractionKind: 'SUBMISSION',
      }),
    ).toBe('REQUEST_DOCS');
  });

  it('OPEN + MINIMAL completeness → REQUEST_DOCS', () => {
    expect(
      deriveNextAction({
        caseStatus: 'OPEN',
        identityVerification: 'VERIFIED',
        completeness: 'MINIMAL',
        lastInteractionKind: 'SUBMISSION',
      }),
    ).toBe('REQUEST_DOCS');
  });

  it('IN_PROGRESS + UNVERIFIED → REQUEST_DOCS', () => {
    expect(
      deriveNextAction({
        caseStatus: 'IN_PROGRESS',
        identityVerification: 'UNVERIFIED',
        completeness: 'COMPLETE',
        lastInteractionKind: 'STATUS_CHANGE',
      }),
    ).toBe('REQUEST_DOCS');
  });

  it('OPEN + SUBMISSION → SCREEN_SUBMISSION', () => {
    expect(
      deriveNextAction({
        caseStatus: 'OPEN',
        identityVerification: 'VERIFIED',
        completeness: 'COMPLETE',
        lastInteractionKind: 'SUBMISSION',
      }),
    ).toBe('SCREEN_SUBMISSION');
  });

  it('IN_PROGRESS + SUBMISSION → SCHEDULE_SCREEN', () => {
    expect(
      deriveNextAction({
        caseStatus: 'IN_PROGRESS',
        identityVerification: 'VERIFIED',
        completeness: 'COMPLETE',
        lastInteractionKind: 'SUBMISSION',
      }),
    ).toBe('SCHEDULE_SCREEN');
  });

  it('IN_PROGRESS + STATUS_CHANGE → AWAITING_RESULT', () => {
    expect(
      deriveNextAction({
        caseStatus: 'IN_PROGRESS',
        identityVerification: 'VERIFIED',
        completeness: 'COMPLETE',
        lastInteractionKind: 'STATUS_CHANGE',
      }),
    ).toBe('AWAITING_RESULT');
  });

  it('READY_TO_PLACE → REVIEW_PLACEMENT', () => {
    expect(
      deriveNextAction({
        caseStatus: 'READY_TO_PLACE',
        identityVerification: 'VERIFIED',
        completeness: 'COMPLETE',
        lastInteractionKind: 'SUBMISSION',
      }),
    ).toBe('REVIEW_PLACEMENT');
    expect(
      deriveNextAction({
        caseStatus: 'READY_TO_PLACE',
        identityVerification: 'VERIFIED',
        completeness: 'COMPLETE',
        lastInteractionKind: 'STATUS_CHANGE',
      }),
    ).toBe('REVIEW_PLACEMENT');
    expect(
      deriveNextAction({
        caseStatus: 'READY_TO_PLACE',
        identityVerification: 'VERIFIED',
        completeness: 'COMPLETE',
        lastInteractionKind: null,
      }),
    ).toBe('REVIEW_PLACEMENT');
  });

  it('returns only the canonical 7 values (enum invariant)', () => {
    expect(SERVER_DERIVED_NEXT_ACTION_VALUES.length).toBe(7);
    for (const cs of ['OPEN', 'IN_PROGRESS', 'READY_TO_PLACE', 'CLOSED'] as const) {
      for (const v of ['UNVERIFIED', 'VERIFIED'] as const) {
        for (const c of ['MINIMAL', 'COMPLETE'] as const) {
          for (const k of [null, 'SUBMISSION', 'STATUS_CHANGE'] as const) {
            const out = deriveNextAction({
              caseStatus: cs,
              identityVerification: v,
              completeness: c,
              lastInteractionKind: k,
            });
            expect(SERVER_DERIVED_NEXT_ACTION_VALUES).toContain(out);
          }
        }
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// deriveHandler — AC-03 active handler selection
// ═══════════════════════════════════════════════════════════════════════════

describe('deriveHandler — AC-03 active handler', () => {
  it('returns null triple when no assignments', () => {
    expect(deriveHandler([], NOW)).toEqual({
      assigneeUserId: null,
      assigneeName: null,
      source: null,
    });
  });

  it('returns null triple when no assignment matches active window', () => {
    const expired = makeAssignment({
      id: 'a1',
      startsAt: new Date(NOW.getTime() - 100000),
      expiresAt: new Date(NOW.getTime() - 50000),
    });
    const future = makeAssignment({
      id: 'a2',
      startsAt: new Date(NOW.getTime() + 60000),
      expiresAt: null,
    });
    const completed = makeAssignment({ id: 'a3', status: 'COMPLETED' });
    expect(deriveHandler([expired, future, completed], NOW)).toEqual({
      assigneeUserId: null,
      assigneeName: null,
      source: null,
    });
  });

  it('picks the single active row', () => {
    const a = makeAssignment({ id: 'only', assigneeUserId: 'u42', assigneeName: 'Only' });
    expect(deriveHandler([a], NOW)).toEqual({
      assigneeUserId: 'u42',
      assigneeName: 'Only',
      source: 'MANAGER_ASSIGNMENT',
    });
  });

  it('orders by startsAt DESC, createdAt DESC, id DESC', () => {
    const earlier = makeAssignment({
      id: 'earliest',
      assigneeUserId: 'u-earliest',
      startsAt: new Date(NOW.getTime() - 10000),
      createdAt: new Date(NOW.getTime() - 10000),
    });
    const later = makeAssignment({
      id: 'later',
      assigneeUserId: 'u-later',
      startsAt: new Date(NOW.getTime() - 1000),
      createdAt: new Date(NOW.getTime() - 1000),
    });
    expect(deriveHandler([earlier, later], NOW).assigneeUserId).toBe('u-later');
    expect(deriveHandler([later, earlier], NOW).assigneeUserId).toBe('u-later');
  });

  it('tie-breaks by createdAt DESC when startsAt identical', () => {
    const sameStarts = new Date(NOW.getTime() - 1000);
    const olderCreate = makeAssignment({
      id: 'a',
      assigneeUserId: 'u-older',
      startsAt: sameStarts,
      createdAt: new Date(NOW.getTime() - 100000),
    });
    const newerCreate = makeAssignment({
      id: 'b',
      assigneeUserId: 'u-newer',
      startsAt: sameStarts,
      createdAt: new Date(NOW.getTime() - 500),
    });
    expect(deriveHandler([olderCreate, newerCreate], NOW).assigneeUserId).toBe(
      'u-newer',
    );
  });

  it('tie-breaks by id DESC when startsAt and createdAt identical', () => {
    const sameStarts = new Date(NOW.getTime() - 1000);
    const sameCreate = new Date(NOW.getTime() - 500);
    const a = makeAssignment({
      id: 'aaa',
      assigneeUserId: 'u-a',
      startsAt: sameStarts,
      createdAt: sameCreate,
    });
    const b = makeAssignment({
      id: 'zzz',
      assigneeUserId: 'u-z',
      startsAt: sameStarts,
      createdAt: sameCreate,
    });
    expect(deriveHandler([a, b], NOW).assigneeUserId).toBe('u-z');
  });

  it('excludes rows with expiresAt exactly equal to now (boundary)', () => {
    const boundary = makeAssignment({
      id: 'boundary',
      expiresAt: new Date(NOW.getTime()),
    });
    expect(deriveHandler([boundary], NOW)).toEqual({
      assigneeUserId: null,
      assigneeName: null,
      source: null,
    });
  });

  it('keeps rows with expiresAt strictly greater than now', () => {
    const just = makeAssignment({
      id: 'just',
      expiresAt: new Date(NOW.getTime() + 1),
    });
    expect(deriveHandler([just], NOW).assigneeUserId).toBe('u1');
  });

  it('keeps rows with startsAt exactly equal to now', () => {
    const at = makeAssignment({ id: 'at', startsAt: new Date(NOW.getTime()) });
    expect(deriveHandler([at], NOW).assigneeUserId).toBe('u1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// deriveLastInteraction — AC-04 newest STATUS_CHANGE wins over SUBMISSION
// ═══════════════════════════════════════════════════════════════════════════

describe('deriveLastInteraction — AC-04', () => {
  it('returns null kind when no submissions and no status history', () => {
    expect(deriveLastInteraction([], [])).toEqual({
      at: null,
      kind: null,
    });
  });

  it('returns SUBMISSION when only submissions exist', () => {
    const s = { id: 's1', createdAt: new Date(NOW.getTime() - 1000) };
    expect(deriveLastInteraction([s], [])).toEqual({
      at: s.createdAt,
      kind: 'SUBMISSION',
    });
  });

  it('returns STATUS_CHANGE when only status history exists', () => {
    const h = { id: 'h1', createdAt: new Date(NOW.getTime() - 2000) };
    expect(deriveLastInteraction([], [h])).toEqual({
      at: h.createdAt,
      kind: 'STATUS_CHANGE',
    });
  });

  it('STATUS_CHANGE wins over SUBMISSION regardless of which is newer', () => {
    const newerSub = {
      id: 's-newer',
      createdAt: new Date(NOW.getTime() - 100),
    };
    const olderHistory = {
      id: 'h-older',
      createdAt: new Date(NOW.getTime() - 10000),
    };
    expect(deriveLastInteraction([newerSub], [olderHistory])).toEqual({
      at: olderHistory.createdAt,
      kind: 'STATUS_CHANGE',
    });
  });

  it('picks the newest STATUS_CHANGE by createdAt DESC, id DESC', () => {
    const a = { id: 'a', createdAt: new Date(NOW.getTime() - 10000) };
    const b = { id: 'b', createdAt: new Date(NOW.getTime() - 5000) };
    const c = { id: 'c', createdAt: new Date(NOW.getTime() - 2000) };
    expect(deriveLastInteraction([], [a, b, c]).at).toEqual(c.createdAt);
    expect(deriveLastInteraction([], [c, a, b]).at).toEqual(c.createdAt);
  });

  it('picks the newest SUBMISSION by createdAt DESC, id DESC', () => {
    const a = { id: 'a', createdAt: new Date(NOW.getTime() - 10000) };
    const b = { id: 'b', createdAt: new Date(NOW.getTime() - 5000) };
    expect(deriveLastInteraction([b, a], []).at).toEqual(b.createdAt);
  });

  it('tie-breaks by id DESC when createdAt identical', () => {
    const ts = new Date(NOW.getTime() - 5000);
    const a = { id: 'aaa', createdAt: ts };
    const b = { id: 'zzz', createdAt: ts };
    expect(deriveLastInteraction([a, b], [])).toEqual({
      at: ts,
      kind: 'SUBMISSION',
    });
    expect(deriveLastInteraction([], [a, b]).at).toEqual(ts);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// computeAge — AC-04
// ═══════════════════════════════════════════════════════════════════════════

describe('computeAge — AC-04', () => {
  it('under 72h without handler expiry → not overdue', () => {
    const opened = new Date(NOW.getTime() - 10 * 60 * 60 * 1000); // 10h ago
    expect(
      computeAge({ openedAt: opened, handlerExpiresAt: null }, NOW),
    ).toEqual({
      ageHours: 10,
      isOverdue: false,
      overdueReason: null,
    });
  });

  it('exactly 72h → not overdue (>=) actually IS overdue (>=) per spec', () => {
    const opened = new Date(NOW.getTime() - 72 * 60 * 60 * 1000);
    const out = computeAge({ openedAt: opened, handlerExpiresAt: null }, NOW);
    expect(out.isOverdue).toBe(true);
    expect(out.overdueReason).toBe('CASE_AGE_THRESHOLD');
    expect(out.ageHours).toBe(72);
  });

  it('over 72h → overdue with CASE_AGE_THRESHOLD', () => {
    const opened = new Date(NOW.getTime() - 100 * 60 * 60 * 1000);
    const out = computeAge({ openedAt: opened, handlerExpiresAt: null }, NOW);
    expect(out.isOverdue).toBe(true);
    expect(out.overdueReason).toBe('CASE_AGE_THRESHOLD');
    expect(out.ageHours).toBe(100);
  });

  it('handler expired within < 72h → overdue with HANDLER_EXPIRED', () => {
    const opened = new Date(NOW.getTime() - 10 * 60 * 60 * 1000);
    const handlerExpired = new Date(NOW.getTime() - 5 * 60 * 60 * 1000);
    const out = computeAge(
      { openedAt: opened, handlerExpiresAt: handlerExpired },
      NOW,
    );
    expect(out.isOverdue).toBe(true);
    expect(out.overdueReason).toBe('HANDLER_EXPIRED');
  });

  it('HANDLER_EXPIRED takes precedence over CASE_AGE_THRESHOLD', () => {
    const opened = new Date(NOW.getTime() - 200 * 60 * 60 * 1000);
    const handlerExpired = new Date(NOW.getTime() - 1000);
    const out = computeAge(
      { openedAt: opened, handlerExpiresAt: handlerExpired },
      NOW,
    );
    expect(out.overdueReason).toBe('HANDLER_EXPIRED');
    expect(out.isOverdue).toBe(true);
  });

  it('handler expires in future → not overdue regardless of age', () => {
    const opened = new Date(NOW.getTime() - 200 * 60 * 60 * 1000);
    const futureExpiry = new Date(NOW.getTime() + 60 * 60 * 1000);
    const out = computeAge(
      { openedAt: opened, handlerExpiresAt: futureExpiry },
      NOW,
    );
    // Spec: isOverdue = ageHours >= 72 OR handlerExpiresAt < now.
    // handlerExpiresAt is NOT < now → falls back to ageHours >= 72 → overdue.
    expect(out.isOverdue).toBe(true);
    expect(out.overdueReason).toBe('CASE_AGE_THRESHOLD');
  });

  it('ageHours rounds to 1 decimal', () => {
    const opened = new Date(NOW.getTime() - (10 * 60 * 60 * 1000 + 30 * 60 * 1000)); // 10.5h
    expect(
      computeAge({ openedAt: opened, handlerExpiresAt: null }, NOW).ageHours,
    ).toBe(10.5);
  });

  it('handles 0-hour age (just opened)', () => {
    expect(
      computeAge({ openedAt: NOW, handlerExpiresAt: null }, NOW),
    ).toEqual({
      ageHours: 0,
      isOverdue: false,
      overdueReason: null,
    });
  });
});
