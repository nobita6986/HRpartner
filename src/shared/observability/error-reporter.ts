/**
 * Provider-neutral error reporter — V5-OPS-04a STEP-04 (RQ-05, DEC-06).
 *
 * Provider-neutral interface with injectable implementation.
 * Returns truthful status: 'reported' | 'not_configured' | 'failed'.
 * Never throws; never makes the request fail.
 * Never receives raw error message/stack — only safe envelope + requestId.
 *
 * DEC-06: No DSN/account/provider SDK required; missing provider = safe no-op.
 * DEC-04: Safe envelope = { errorCode, phase, safeMessage, requestId, timestamp }.
 * PLN-02: meta field (if present) is run through sanitizeObject so the adapter
 *          never receives raw PII/secret values, even when callers pass unsafe meta.
 */

import { sanitizeObject } from './logger';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ReportStatus = 'reported' | 'not_configured' | 'failed';

/** Safe envelope — no raw Error.message, cause or stack in default sink. */
export interface SafeErrorEnvelope {
  errorCode: string;   // machine-readable code, not user message
  phase: string;       // e.g. 'middleware' | 'auth' | 'db' | 'handler' | 'unknown'
  safeMessage: string; // sanitized, e.g. "Unexpected error" — never raw user data
  requestId: string | null;
  timestamp: string;   // ISO-8601
  // meta is sanitized by sanitizeObject before reaching the adapter so the
  // adapter never receives raw PII/secret values regardless of caller input.
  meta?: Record<string, unknown>;
}

export type ReporterAdapter = (envelope: SafeErrorEnvelope) => Promise<void>;

let _adapter: ReporterAdapter | null = null;
let _configured = false;

/**
 * Configure the error reporter with a provider-specific adapter.
 * OPS-04b will call this with a Sentry/Dataadog/etc. adapter.
 */
export function configure(adapter: ReporterAdapter): void {
  _adapter = adapter;
  _configured = true;
}

/**
 * Check whether a reporter is configured.
 */
export function isConfigured(): boolean {
  return _configured;
}

/**
 * Report a safe error envelope.
 *
 * Returns truthful status without making the request fail:
 *   - 'not_configured' if no adapter is set
 *   - 'reported' if adapter resolved without error
 *   - 'failed' if adapter threw
 *
 * Never throws; never exposes provider errors to HTTP response.
 */
export async function report(envelope: SafeErrorEnvelope): Promise<ReportStatus> {
  if (!_adapter) {
    return 'not_configured';
  }
  try {
    // PLN-02: sanitize meta so the adapter never receives raw PII/secret values
    const safeEnvelope: SafeErrorEnvelope = envelope.meta !== undefined
      ? { ...envelope, meta: sanitizeObject(envelope.meta) as Record<string, unknown> }
      : envelope;
    await _adapter(safeEnvelope);
    return 'reported';
  } catch {
    return 'failed';
  }
}

/**
 * Convenience: build a safe envelope from a raw error and report it.
 * The raw error message/stack is NOT included; only the safe envelope is sent.
 */
export async function reportSafe(
  errorCode: string,
  phase: string,
  requestId: string | null,
  meta?: Record<string, unknown>,
): Promise<ReportStatus> {
  const envelope: SafeErrorEnvelope = {
    errorCode,
    phase,
    safeMessage: 'Unexpected error',
    requestId,
    timestamp: new Date().toISOString(),
    meta,
  };
  return report(envelope);
}

// ─── No-op reporter for tests ─────────────────────────────────────────────────

/** Built-in no-op adapter used when nothing is configured. */
export async function noopAdapter(_envelope: SafeErrorEnvelope): Promise<void> {
  // nothing
}
