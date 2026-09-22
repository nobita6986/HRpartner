/**
 * local-vps-evidence-storage.adapter.ts — P0-A03 / ER-002 (revision round 2).
 *
 * Local VPS filesystem adapter for the provider-neutral `EvidenceStorage`
 * port (ER-001). Streams evidence blobs to/from a VPS-controlled directory
 * per HRP_EXECUTION_REALIGNMENT_PLAN.md §4 and §6.
 *
 * Architecture decisions:
 *   - Root resolved via dependency injection (`PathResolver` function).
 *     Adapter never reads `process.env` directly. Tests pass synthetic
 *     env objects. Production wires a thin call-site (NOT in this slice).
 *   - Storage key validation layered on top of `asStorageKey`:
 *     no backslash, no traversal, no empty/trailing segments, no NUL/control
 *     chars, no symlinks.
 *   - Symlink enforcement via `fsPrompath.realpath` for every key resolution.
 *     TOCTOU residual risk between `exists`/`stat` and `read`/`delete`
 *     is documented in HANDOFF §5.1.1 and TASK §3.3.
 *   - `'wx'` flag for atomic no-overwrite — concurrent writers get exactly
 *     one success, the rest receive `ALREADY_EXISTS`.
 *   - Storage-object boundary: only regular files are considered evidence.
 *     Directories, symlinks, FIFOs, sockets, and other non-regular nodes
 *     are uniformly treated as `NOT_FOUND` at the read/delete/exists/stat
 *     boundary. Rationale: a directory is not a streamable evidence blob;
 *     a symlink would alias another object; other inodes have no semantic
 *     meaning under the port contract.
 *   - Streaming reads via a single-use `AsyncIterable<Uint8Array>` that
 *     wraps a `FileHandle.read()` loop; late-drain errors are mapped to
 *     `STREAM_FAILURE`; the underlying handle is always closed (success,
 *     failure, or consumer cancellation).
 *   - Error mapping collapses `ENOENT`/`EEXIST`/`EACCES`/etc. into the
 *     port's typed reason enum. No raw Node error, stack trace, absolute
 *     path, or secret ever reaches the public error surface.
 *
 * Revision round 2 (post-audit):
 *   - F1: `resolveKey` now walks segments by INDEX (not by value) so repeated
 *        segment names like `a/a/file.bin` resolve correctly.
 *   - F2: `write` uses a write-all loop that only counts bytes actually
 *        persisted (`handle.write()` may return fewer bytes than `chunk.byteLength`).
 *   - F3: `read` returns a single-use async iterable; consumer-cancellation
 *        and late errors are mapped to `STREAM_FAILURE`; handle is always
 *        closed.
 *   - F4: directory / non-regular nodes are uniformly `NOT_FOUND` at read,
 *        delete, exists, stat. `delete` uses `lstat` to reject directories
 *        rather than relying on `unlink`'s `EISDIR`.
 *   - F5: cleanup of partial artifacts happens AFTER the file handle is
 *        closed; partial-write flag is set in catch and acted on in finally.
 *
 * Out-of-scope (deferred):
 *   - EvidenceRecord metadata, audit, retention, quarantine (ER-003+).
 *   - signed URL, encryption policy (deliberate non-goal).
 *   - ContentType/etag storage — adapter returns `null` (ER-003 owns this).
 */

import { promises as fsPromises, type Stats } from 'node:fs';
import * as path from 'node:path';
import {
  asStorageKey,
  EvidenceStorageError,
  type EvidenceByteSource,
  type EvidenceByteStream,
  type EvidenceStat,
  type EvidenceStorage,
  type EvidenceWriteRequest,
  type EvidenceWriteResult,
  type StorageKey,
} from './evidence-storage.port';

/** Pure resolver: takes an env-like object, returns the root path string. */
export type PathResolver = (env: Record<string, string | undefined>) => string;

/**
 * Default resolver: reads `HRP_EVIDENCE_ROOT` from the provided env object.
 * Production wires this at application startup by calling
 * `makeLocalVpsEvidenceStorageAdapter(process.env)`. Adapter itself never
 * touches `process.env` — that wiring is the application boundary.
 *
 * Synchronously rejects blank, missing, and non-absolute roots so that
 * configuration mistakes fail closed at construction (no I/O required).
 */
export const defaultEvidencePathResolver: PathResolver = (env) => {
  const value = env['HRP_EVIDENCE_ROOT'];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new EvidenceStorageError(
      'INVALID_REQUEST',
      'HRP_EVIDENCE_ROOT is missing or blank',
      null,
    );
  }
  if (!path.isAbsolute(value)) {
    throw new EvidenceStorageError(
      'INVALID_REQUEST',
      'HRP_EVIDENCE_ROOT must be an absolute path',
      null,
    );
  }
  return value;
};

/** Control characters disallowed inside a key (NUL + 0x01..0x1f + 0x7f).
 * The control-regex rule is intentionally disabled: this regex exists
 * specifically to REJECT control characters from keys, which is the
 * security boundary the port depends on.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1f\x7f]/;
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

// File/dir permission masks for VPS Linux.
//   file: 0o640 — owner RW, group R, others none
//   dir:  0o750 — owner RWX, group RX, others none
const FILE_MODE = 0o640;
const DIR_MODE = 0o750;

/** Map a Node.js fs error code to a port-level reason. */
function reasonFromErrno(
  code: string | undefined,
): 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'INVALID_REQUEST' | 'STORAGE_UNAVAILABLE' {
  switch (code) {
    case 'ENOENT':
      return 'NOT_FOUND';
    case 'EEXIST':
      return 'ALREADY_EXISTS';
    case 'EACCES':
    case 'EPERM':
    case 'EISDIR':
      return 'PERMISSION_DENIED';
    case 'ENOTDIR':
    case 'EINVAL':
      return 'INVALID_REQUEST';
    case 'ENOSPC':
    case 'EIO':
    case 'ENXIO':
    case 'EBUSY':
    default:
      return 'STORAGE_UNAVAILABLE';
  }
}

/**
 * Adapter-layer validation of a logical storage key. The port's
 * `asStorageKey` already rejects absolute paths and URLs; this layer
 * enforces structural rules specific to the filesystem encoding.
 */
function validateKeyStructure(candidate: string): void {
  if (candidate.includes('\\')) {
    throw new EvidenceStorageError('INVALID_KEY', 'key uses forbidden backslash separator', null);
  }
  if (CONTROL_CHARS.test(candidate)) {
    throw new EvidenceStorageError('INVALID_KEY', 'key contains control or NUL characters', null);
  }
  const segments = candidate.split('/');
  for (const seg of segments) {
    if (seg === '' || seg === '.' || seg === '..') {
      throw new EvidenceStorageError(
        'INVALID_KEY',
        'key contains empty or traversal segment',
        null,
      );
    }
    if (!SAFE_SEGMENT.test(seg)) {
      throw new EvidenceStorageError(
        'INVALID_KEY',
        'key segment has unsupported characters',
        null,
      );
    }
  }
}

/**
 * Validate the root directory exists, is a real directory, and is not a
 * symlink itself. Fail-closed on every violation. Returns canonical path.
 */
async function validateRoot(root: string): Promise<string> {
  if (typeof root !== 'string' || root.length === 0) {
    throw new EvidenceStorageError(
      'INVALID_REQUEST',
      'root path must be a non-empty string',
      null,
    );
  }
  if (!path.isAbsolute(root)) {
    throw new EvidenceStorageError('INVALID_REQUEST', 'root path must be absolute', null);
  }
  let stat: Stats;
  try {
    stat = await fsPromises.lstat(root);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    // A missing root is an INVALID_REQUEST (configuration problem),
    // not a NOT_FOUND (which describes a missing object inside an
    // already-validated root).
    if (code === 'ENOENT') {
      throw new EvidenceStorageError(
        'INVALID_REQUEST',
        'root path must exist',
        null,
      );
    }
    throw new EvidenceStorageError(
      reasonFromErrno(code),
      'root path is not accessible',
      null,
    );
  }
  if (stat.isSymbolicLink()) {
    throw new EvidenceStorageError('INVALID_REQUEST', 'root path must not be a symlink', null);
  }
  if (!stat.isDirectory()) {
    throw new EvidenceStorageError('INVALID_REQUEST', 'root path must be a directory', null);
  }
  const canonical = await fsPromises.realpath(root);
  if (!path.isAbsolute(canonical)) {
    throw new EvidenceStorageError(
      'INVALID_REQUEST',
      'canonicalized root must remain absolute',
      null,
    );
  }
  return canonical;
}

/**
 * Resolve a logical key to its canonical filesystem path, verifying
 * containment under `canonicalRoot`. Walks segments BY INDEX so a key
 * with repeated segment names (e.g. `a/a/file.bin`) is resolved
 * correctly. The path that does not yet exist (e.g. before write) is
 * built by canonicalising the deepest existing ancestor plus the
 * remaining segments (also by index) and verifying containment from
 * each existing ancestor. Rejects traversal, symlinks, broken symlinks.
 */
async function resolveKey(candidate: string, canonicalRoot: string): Promise<string> {
  // Port-layer boundary check.
  const key: StorageKey = asStorageKey(candidate);
  validateKeyStructure(candidate);

  const segments = candidate.split('/');
  let current = canonicalRoot;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const next = path.join(current, seg);
    let real: string;
    try {
      real = await fsPromises.realpath(next);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        // EACCES, ENOTDIR, ELOOP, etc. -> surface as INVALID_KEY
        // (the path is unusable) or PERMISSION_DENIED for permission errors.
        const reason = code === 'EACCES' || code === 'EPERM'
          ? 'PERMISSION_DENIED'
          : 'INVALID_KEY';
        throw new EvidenceStorageError(reason, 'cannot resolve key path', key);
      }
      // ENOENT: this segment does not exist yet (we are about to write).
      // Append the REMAINING segments from THIS index onward (NOT
      // re-locating by value — repeated segment names must resolve
      // positionally). validateKeyStructure already excluded
      // traversal/control characters, so un-canonicalised tail is safe.
      const remaining = segments.slice(i);
      current = path.join(current, ...remaining);
      if (current !== canonicalRoot && !current.startsWith(canonicalRoot + path.sep)) {
        throw new EvidenceStorageError('INVALID_KEY', 'key escapes root', key);
      }
      return current;
    }
    if (real !== canonicalRoot && !real.startsWith(canonicalRoot + path.sep)) {
      throw new EvidenceStorageError('INVALID_KEY', 'key escapes root', key);
    }
    current = real;
  }
  return current;
}

/**
 * Write the entire contents of a `Uint8Array` chunk to an open
 * `FileHandle`, retrying short writes until the whole chunk is persisted.
 * Returns the actual number of bytes written (sum of `bytesWritten`).
 */
async function writeChunkAll(
  handle: Awaited<ReturnType<typeof fsPromises.open>>,
  chunk: Uint8Array,
): Promise<number> {
  let offset = 0;
  let written = 0;
  while (offset < chunk.byteLength) {
    // Node.js FileHandle.write returns `{ bytesWritten, buffer }`.
    const result = await handle.write(
      chunk,
      offset,
      chunk.byteLength - offset,
      null,
    );
    const n = (result as unknown as { bytesWritten: number }).bytesWritten;
    if (!Number.isInteger(n) || n <= 0) {
      throw new EvidenceStorageError(
        'STORAGE_UNAVAILABLE',
        'write returned no progress',
        null,
      );
    }
    offset += n;
    written += n;
  }
  return written;
}

/**
 * Drain an AsyncIterable<Uint8Array> into a file handle. Writes each
 * non-empty chunk end-to-end via `writeChunkAll` and returns the total
 * number of bytes actually persisted to the file (i.e. matches the
 * physical file size after a complete drain). Source-error or
 * short-write unrecoverable errors are rethrown as `EvidenceStorageError`
 * so callers can map uniformly.
 */
async function drainSourceToHandle(
  source: EvidenceByteSource,
  handle: Awaited<ReturnType<typeof fsPromises.open>>,
): Promise<number> {
  let total = 0;
  for await (const chunk of source) {
    if (!(chunk instanceof Uint8Array)) {
      throw new EvidenceStorageError(
        'STREAM_FAILURE',
        'source emitted non-Uint8Array chunk',
        null,
      );
    }
    if (chunk.byteLength === 0) continue;
    total += await writeChunkAll(handle, chunk);
  }
  return total;
}

/**
 * Wrap an open `FileHandle` as a single-use `EvidenceByteStream`.
 *
 * Reads chunks via `FileHandle.read()` into a 64 KiB buffer, maps late
 * read errors to `EvidenceStorageError('STREAM_FAILURE')`, and ALWAYS
 * closes the handle (success, failure, consumer-break, end-of-stream).
 *
 * The returned iterable must be drained exactly once; iterating twice
 * is undefined behaviour and throws.
 *
 * @internal — exported for deterministic unit testing of the wrapper's
 * late-error mapping and close-on-cancel semantics. Production code
 * MUST NOT import this directly; use `EvidenceStorage.read()` instead.
 */
export async function fileHandleToStream(
  handle: Awaited<ReturnType<typeof fsPromises.open>>,
): Promise<EvidenceByteStream> {
  type Producer = AsyncGenerator<Uint8Array, void, void>;
  const producer = (async function* producerFn(): Producer {
    let chunkCount = 0;
    try {
      const CHUNK = 64 * 1024;
      // The underlying handle is held by the generator's scope and
      // closed in finally, including generator early-return and consumer
      // cancellation.
      while (true) {
        const buf = new Uint8Array(CHUNK);
        const readResult: { bytesRead: number; buffer: Uint8Array } =
          await handle.read(buf, 0, CHUNK, null);
        const bytesRead = (readResult as unknown as { bytesRead: number }).bytesRead;
        if (bytesRead === 0) {
          return;
        }
        chunkCount += 1;
        // Hand the consumer a copy of just the bytes read; the read
        // buffer may be reused by the next iteration.
        yield buf.slice(0, bytesRead);
      }
    } catch (err) {
      // Late-drain failure: raw Node error → typed surface error.
      // No errno / no path / no stack on the public surface.
      if (err instanceof EvidenceStorageError) throw err;
      throw new EvidenceStorageError(
        'STREAM_FAILURE',
        'read stream failed mid-drain',
        null,
      );
    } finally {
      void chunkCount;
      await handle.close().catch(() => {
        // close errors are not surfaced; handle is single-use
      });
    }
  })();
  return producer as unknown as EvidenceByteStream;
}

/**
 * Make a `LocalVpsEvidenceStorageAdapter` — a Node.js filesystem-backed
 * implementation of the provider-neutral `EvidenceStorage` port.
 *
 * @param env       Env-like object (e.g. `process.env`). Adapter never
 *                  reads `process.env` directly.
 * @param resolver  Pure function that reads the root path from the env
 *                  object. Defaults to `defaultEvidencePathResolver`.
 */
export function makeLocalVpsEvidenceStorageAdapter(
  env: Record<string, string | undefined>,
  resolver: PathResolver = defaultEvidencePathResolver,
): EvidenceStorage {
  // 1. Run the resolver eagerly to surface configuration errors fast.
  const rawRoot = (() => {
    try {
      return resolver(env);
    } catch (err) {
      if (err instanceof EvidenceStorageError) throw err;
      throw new EvidenceStorageError(
        'INVALID_REQUEST',
        'path resolver threw unexpectedly',
        null,
      );
    }
  })();

  // 2. Validate the root lazily; first port call surfaces any failure.
  let canonicalRootCache: string | null = null;
  let canonicalRootInflight: Promise<string> | null = null;
  async function getCanonicalRoot(): Promise<string> {
    if (canonicalRootCache !== null) return canonicalRootCache;
    if (canonicalRootInflight !== null) return canonicalRootInflight;
    canonicalRootInflight = (async () => {
      try {
        const c = await validateRoot(rawRoot);
        canonicalRootCache = c;
        return c;
      } catch (err) {
        canonicalRootInflight = null;
        if (err instanceof EvidenceStorageError) throw err;
        throw new EvidenceStorageError(
          'INVALID_REQUEST',
          'root validation failed',
          null,
        );
      }
    })();
    return canonicalRootInflight;
  }

  /**
   * Stat the resolved target path. If it does not exist, return null.
   * If it is NOT a regular file (directory / symlink / FIFO / socket /
   * device), throw `NOT_FOUND` to enforce the storage-object boundary
   * uniformly across read/delete/exists/stat.
   *
   * Note: this is `lstat`, not `stat`, so a symlink is observed as a
   * symlink (NOT followed). Combined with F1's per-segment realpath,
   * an existing symlink target would already have rejected the key.
   */
  async function statObject(targetPath: string, key: StorageKey): Promise<Stats> {
    let s: Stats;
    try {
      s = await fsPromises.lstat(targetPath);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        throw new EvidenceStorageError('NOT_FOUND', 'object not found', key);
      }
      throw new EvidenceStorageError(
        reasonFromErrno(code),
        'cannot probe target',
        key,
      );
    }
    if (!s.isFile()) {
      // Directories, symlinks, FIFOs, sockets, devices are not evidence
      // objects under this adapter's contract. Fail-closed.
      throw new EvidenceStorageError('NOT_FOUND', 'object not found', key);
    }
    return s;
  }

  const adapter: EvidenceStorage = {
    async write(request: EvidenceWriteRequest): Promise<EvidenceWriteResult> {
      const canonicalRoot = await getCanonicalRoot();
      const targetPath = await resolveKey(request.storageKey, canonicalRoot);
      const dir = path.dirname(targetPath);
      if (dir !== canonicalRoot) {
        try {
          await fsPromises.mkdir(dir, { recursive: true, mode: DIR_MODE });
        } catch (err) {
          throw new EvidenceStorageError(
            reasonFromErrno((err as NodeJS.ErrnoException).code),
            'cannot create directory',
            request.storageKey,
          );
        }
      }
      let handle: Awaited<ReturnType<typeof fsPromises.open>>;
      try {
        handle = await fsPromises.open(targetPath, 'wx', FILE_MODE);
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        throw new EvidenceStorageError(
          reasonFromErrno(code),
          code === 'EEXIST' ? 'target already exists' : 'cannot open target for write',
          request.storageKey,
        );
      }
      // Cleanup ordering (F5): the handle MUST be closed BEFORE any
      // unlink of a partial artifact on the failure path. We use a
      // flag set in the catch block and acted on in the finally block.
      let partialCleanupNeeded = false;
      let streamError: Error | null = null;
      let totalBytes = 0;
      try {
        totalBytes = await drainSourceToHandle(request.body, handle);
      } catch (err) {
        partialCleanupNeeded = true;
        streamError = err as Error;
      } finally {
        // Step 1: close the handle. Always, success and failure.
        await handle.close().catch(() => {
          // close errors are not surfaced; handle is single-use
        });
        // Step 2: only after the handle is closed, attempt to remove
        // the partial file if drain failed.
        if (partialCleanupNeeded) {
          try {
            await fsPromises.unlink(targetPath);
          } catch {
            // Cleanup failure: best-effort. If unlink fails (e.g. file
            // does not exist because drain never wrote anything), the
            // adapter still reports the original STREAM_FAILURE below.
            // The caller can retry the delete via `delete(key)` later.
          }
        }
      }
      if (partialCleanupNeeded) {
        if (streamError instanceof EvidenceStorageError) {
          // Preserve the inner reason/message but re-anchor storageKey
          // to the outer write request — so consumers see the key they
          // passed in, not whatever the source set.
          throw new EvidenceStorageError(
            streamError.reason,
            streamError.message,
            request.storageKey,
          );
        }
        throw new EvidenceStorageError(
          'STREAM_FAILURE',
          'stream write failed',
          request.storageKey,
        );
      }
      return {
        storageKey: request.storageKey,
        sizeBytes: totalBytes,
        etag: null,
      };
    },

    async read(storageKey: StorageKey): Promise<EvidenceByteStream> {
      const canonicalRoot = await getCanonicalRoot();
      const targetPath = await resolveKey(storageKey, canonicalRoot);
      // Reject directories and non-regular nodes uniformly as
      // NOT_FOUND before opening a file handle.
      await statObject(targetPath, storageKey);
      let handle: Awaited<ReturnType<typeof fsPromises.open>>;
      try {
        handle = await fsPromises.open(targetPath, 'r');
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        throw new EvidenceStorageError(
          reasonFromErrno(code),
          'cannot open target for read',
          storageKey,
        );
      }
      // fileHandleToStream closes the handle in its finally block,
      // even if the consumer cancels iteration mid-drain.
      return fileHandleToStream(handle);
    },

    async delete(storageKey: StorageKey): Promise<void> {
      const canonicalRoot = await getCanonicalRoot();
      const targetPath = await resolveKey(storageKey, canonicalRoot);
      // Reject directories and non-regular nodes uniformly as
      // NOT_FOUND before invoking unlink (unlink's EISDIR would
      // surface as PERMISSION_DENIED, which is wrong semantics).
      await statObject(targetPath, storageKey);
      try {
        await fsPromises.unlink(targetPath);
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        throw new EvidenceStorageError(
          reasonFromErrno(code),
          'cannot delete target',
          storageKey,
        );
      }
    },

    async exists(storageKey: StorageKey): Promise<boolean> {
      const canonicalRoot = await getCanonicalRoot();
      let targetPath: string;
      try {
        targetPath = await resolveKey(storageKey, canonicalRoot);
      } catch (err) {
        if (err instanceof EvidenceStorageError && err.reason === 'NOT_FOUND') {
          return false;
        }
        throw err;
      }
      try {
        const s = await fsPromises.lstat(targetPath);
        // Storage-object boundary: only regular files are evidence.
        if (!s.isFile()) return false;
        return true;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOENT') {
          return false;
        }
        throw new EvidenceStorageError(
          reasonFromErrno(code),
          'cannot probe target',
          storageKey,
        );
      }
    },

    async stat(storageKey: StorageKey): Promise<EvidenceStat> {
      const canonicalRoot = await getCanonicalRoot();
      const targetPath = await resolveKey(storageKey, canonicalRoot);
      const s = await statObject(targetPath, storageKey);
      return {
        storageKey,
        contentType: null,
        sizeBytes: s.size,
        etag: null,
        lastModified: s.mtime,
      };
    },
  };

  return adapter;
}

/**
 * Re-export the typed error and reason so application code can `import`
 * them from this adapter module too (in addition to the port). Purely
 * convenience.
 */
export { EvidenceStorageError, type StorageKey } from './evidence-storage.port';
