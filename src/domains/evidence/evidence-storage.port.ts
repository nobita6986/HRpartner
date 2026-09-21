/**
 * evidence-storage.port.ts — P0-A02 / ER-001.
 *
 * Provider-neutral `EvidenceStorage` port. THIS FILE IS AN INTERFACE ONLY.
 *
 * Why an interface (not a class, not a Vercel Blob wrapper):
 *   - Production evidence (CCCD, sensitive PII) must live on a VPS-controlled
 *     filesystem per HRP_EXECUTION_REALIGNMENT_PLAN.md §4 and §6.
 *   - Test/preview must NEVER touch real CCCD paths; they use synthetic bytes
 *     routed through an adapter that may differ per environment.
 *   - The contract must therefore depend on no provider, no runtime, no env.
 *
 * Contract pillars (per TASK §Contract tối thiểu):
 *   - Async, all methods return Promises.
 *   - `storageKey` is an opaque logical identifier. Implementations MUST NEVER
 *     accept or return a raw filesystem path or a public URL.
 *   - `read` returns an AsyncIterable<Uint8Array> stream; callers must NOT be
 *     forced to load the entire blob into memory.
 *   - Metadata is storage-only: `storageKey`, `contentType`, `sizeBytes`,
 *     and the small set of provider-neutral fields declared below.
 *
 * Explicit non-goals (NOT in this port — open decisions for ER-002/ER-003+):
 *   - No EvidenceRecord, audit DB, retention, quarantine.
 *   - No signed URLs, encryption policy, multipart upload.
 *   - No versioning.
 *   - No business authorization (RBAC/RLS live one layer up in EvidenceGateway).
 *
 * Forbidden imports inside this file:
 *   - node:fs, node:path
 *   - Buffer (use Uint8Array instead)
 *   - @vercel/blob
 *   - process.env
 *
 * Reference: docs/HRP_EXECUTION_REALIGNMENT_PLAN.md §17 (P0-A02) and
 *            docs/discovery/realignment/EVIDENCE_STORAGE_AUDIT.md.
 */

/**
 * Opaque logical storage key. Carries NO filesystem or URL semantics.
 * Format is an implementation choice (e.g. `owner/{ownerId}/{evidenceId}`
 * is the recommended convention from §5 of the realignment plan), but the
 * port treats the value as an opaque string.
 *
 * MUST NOT be a raw filesystem path.
 * MUST NOT be a public URL.
 */
export type StorageKey = string & { readonly __brand: 'EvidenceStorageKey' };

/**
 * Producer side for streaming bytes into the storage adapter.
 * Providers must drain the iterable exactly once, and tolerate partial
 * reads (chunks may be small). Empty iterable means "no bytes".
 */
export type EvidenceByteSource = AsyncIterable<Uint8Array>;

/**
 * Consumer side for streaming bytes out of the storage adapter.
 * Callers must drain the iterable exactly once. Iterating twice is
 * undefined behaviour and MAY throw on subsequent iterations.
 */
export type EvidenceByteStream = AsyncIterable<Uint8Array>;

/**
 * Minimum storage-level metadata returned by `stat`. The port intentionally
 * does NOT include business fields (owner, evidenceType, retention, etc.).
 * Those belong in EvidenceRecord (ER-003) and live in Neon, not here.
 */
export interface EvidenceStat {
  /** The key the stat was requested for. Echoed back for caller convenience. */
  storageKey: StorageKey;
  /** MIME content type as declared at write time, when available. */
  contentType: string | null;
  /** Total size in bytes (sum of all streamed chunks). */
  sizeBytes: number;
  /**
   * Storage-level integrity token, opaque to the port. May be a checksum,
   * ETag, version, etc. depending on the underlying provider. Port treats
   * it as an opaque string and never inspects it.
   */
  etag: string | null;
  /**
   * Storage-level last-modified timestamp at the provider. May be `null`
   * if the provider does not expose this.
   */
  lastModified: Date | null;
}

/**
 * Input for `write`. The byte source MUST be drained exactly once by the
 * implementation. Implementations MUST fail cleanly (rejection with an
 * `EvidenceStorageError`) if the source errors mid-stream and MUST NOT
 * leave a half-written object behind on failure.
 */
export interface EvidenceWriteRequest {
  /** The opaque logical key. Provider enforces uniqueness. */
  storageKey: StorageKey;
  /** MIME content type; required so the provider can later serve it back. */
  contentType: string;
  /** The byte source. May be empty only if `sizeBytes === 0`. */
  body: EvidenceByteSource;
}

/**
 * Result of a successful `write`. Includes the ETag (provider-native) and
 * the final size so callers can record it without re-streaming.
 */
export interface EvidenceWriteResult {
  storageKey: StorageKey;
  sizeBytes: number;
  etag: string | null;
}

/**
 * Canonical reasons a storage operation can fail. The port never throws
 * a bare Error; it always throws an `EvidenceStorageError` with one of
 * these reasons so callers can map them to domain decisions uniformly.
 */
export type EvidenceStorageErrorReason =
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'INVALID_KEY'
  | 'PERMISSION_DENIED'
  | 'STORAGE_UNAVAILABLE'
  | 'STREAM_FAILURE'
  | 'INVALID_REQUEST';

export class EvidenceStorageError extends Error {
  readonly reason: EvidenceStorageErrorReason;
  readonly storageKey: StorageKey | null;

  constructor(
    reason: EvidenceStorageErrorReason,
    message: string,
    storageKey: StorageKey | null = null,
  ) {
    super(message);
    this.name = 'EvidenceStorageError';
    this.reason = reason;
    this.storageKey = storageKey;
  }
}

/**
 * Provider-neutral evidence storage port.
 *
 * Implementations are environment-specific:
 *   - VPS filesystem adapter (ER-002, future slice)
 *   - In-memory test double (test code only; never production)
 *
 * Implementations MUST NOT accept or expose raw filesystem paths or
 * public URLs. All addressability flows through `StorageKey`.
 *
 * Implementations MUST support streaming `read` so callers do not have
 * to materialize an entire evidence blob in memory.
 */
export interface EvidenceStorage {
  /**
   * Persist a new evidence blob under `storageKey`. Fails with
   * `ALREADY_EXISTS` if the key already exists. To replace, callers must
   * `delete` first — there is no implicit overwrite.
   */
  write(request: EvidenceWriteRequest): Promise<EvidenceWriteResult>;

  /**
   * Stream the evidence blob back. Fails with `NOT_FOUND` if missing.
   * The returned iterable must be drained exactly once.
   */
  read(storageKey: StorageKey): Promise<EvidenceByteStream>;

  /**
   * Remove the evidence blob. Fails with `NOT_FOUND` if missing.
   */
  delete(storageKey: StorageKey): Promise<void>;

  /**
   * Cheap existence probe. Returns `true` if `read` would succeed.
   * MUST NOT stream the body.
   */
  exists(storageKey: StorageKey): Promise<boolean>;

  /**
   * Cheap metadata probe. Returns the storage-level stat or fails with
   * `NOT_FOUND`. MUST NOT stream the body.
   */
  stat(storageKey: StorageKey): Promise<EvidenceStat>;
}

/**
 * Type-level guard for keys. The `StorageKey` brand exists to keep raw
 * filesystem paths and arbitrary strings out of the port surface; this
 * factory is the only blessed way to mint one.
 *
 * Port contract rules enforced here:
 *   - Reject absolute paths (anything starting with `/`, `\`, or a drive
 *     letter) — raw filesystem paths are forbidden at the port boundary.
 *   - Reject anything that looks like a URL scheme (`http:`, `https:`,
 *     `file:`) — public URLs are forbidden at the port boundary.
 *   - Reject empty strings and pure whitespace.
 *
 * Normalisation policy (segment separator, traversal, length caps) is
 * the implementation's responsibility; the port only refuses obviously
 * dangerous shapes.
 */
export function asStorageKey(candidate: string): StorageKey {
  if (typeof candidate !== 'string' || candidate.length === 0) {
    throw new EvidenceStorageError(
      'INVALID_KEY',
      'storageKey must be a non-empty string',
      null,
    );
  }
  if (/^\s|\s$/.test(candidate)) {
    throw new EvidenceStorageError(
      'INVALID_KEY',
      'storageKey must not have leading or trailing whitespace',
      null,
    );
  }
  // Reject URL-shaped values: any well-known scheme followed by `:`.
  // Limited to URL schemes (http, https, ftp, file, blob, data); drive
  // letters (e.g. `C:`) are handled by the absolute-path check below.
  if (/^(https?|ftp|file|blob|data):/i.test(candidate)) {
    throw new EvidenceStorageError(
      'INVALID_KEY',
      'storageKey must not be a URL (raw public URLs are forbidden at the port boundary)',
      null,
    );
  }
  // Reject absolute paths: POSIX (`/...`), Windows drive (`C:\\...`,
  // `C:/...`), Windows UNC (`\\...`). Done AFTER the URL check so a
  // drive-letter candidate like `C:\foo` is correctly classified as a
  // path and not a `c:` URL scheme.
  if (
    candidate.startsWith('/') ||
    candidate.startsWith('\\') ||
    /^[a-z]:[\\/]/i.test(candidate)
  ) {
    throw new EvidenceStorageError(
      'INVALID_KEY',
      'storageKey must not be an absolute filesystem path',
      null,
    );
  }
  return candidate as StorageKey;
}
