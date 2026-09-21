/**
 * local-vps-evidence-storage.adapter.ts — P0-A03 / ER-002.
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
 *   - Symlink enforcement via `fs.realpathSync` for every key resolution.
 *     TOCTOU residual risk between `exists`/`stat` and `read`/`delete`
 *     is documented in HANDOFF §5 and TASK §3.3.
 *   - `'wx'` flag for atomic no-overwrite — concurrent writers get exactly
 *     one success, the rest receive `ALREADY_EXISTS`.
 *   - Streaming reads via node:fs file handle createReadStream — no full
 *     body load into RAM.
 *   - Error mapping collapses `ENOENT`/`EEXIST`/`EACCES`/etc. into the
 *     port's typed reason enum. No raw Node error, stack trace, absolute
 *     path, or secret ever reaches the public error surface.
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
 * containment under canonicalRoot. The path that does not yet exist
 * (e.g. before write) is built by canonicalising the deepest existing
 * ancestor plus the remaining segments and verifying containment from
 * each existing ancestor. Rejects traversal, symlinks, broken symlinks.
 */
async function resolveKey(candidate: string, canonicalRoot: string): Promise<string> {
  // Port-layer boundary check.
  const key: StorageKey = asStorageKey(candidate);
  validateKeyStructure(candidate);

  const segments = candidate.split('/');
  let current = canonicalRoot;
  for (const seg of segments) {
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
      // Append remaining segments unverified by realpath; validation in
      // validateKeyStructure already ensured no traversal/no control chars.
      const remainingIdx = segments.indexOf(seg);
      const remaining = segments.slice(remainingIdx);
      current = path.join(current, ...remaining);
      // Path-equality or containment under canonicalRoot is required.
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
  // Loop completed without early ENOENT return — full path existed.
  return current;
}

/**
 * Drain an AsyncIterable<Uint8Array> via the provided writer callback.
 * Returns total bytes written.
 */
async function drainSource(
  source: EvidenceByteSource,
  write: (bytes: Uint8Array) => Promise<void>,
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
    await write(chunk);
    total += chunk.byteLength;
  }
  return total;
}

/**
 * Wrap an open file handle as an async iterable byte stream. The caller
 * is responsible for draining (or causing auto-close via the stream's
 * EOF). The returned stream is single-use.
 */
function fileHandleToStream(
  handle: Awaited<ReturnType<typeof fsPromises.open>>,
): EvidenceByteStream {
  const readable = handle.createReadStream();
  // Node.js FileHandle.createReadStream returns a Readable stream that
  // is async-iterable over Uint8Array chunks.
  return readable as unknown as EvidenceByteStream;
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
  // Lazy avoids constructing an unhandled-rejection promise when an
  // obviously-bad root is passed at construction.
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
        // Drop the inflight ref so the next call can retry (matches
        // the test expectation of "throws" rather than permanently stuck).
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
      try {
        const totalBytes = await drainSource(request.body, async (chunk) => {
          await handle.write(chunk);
        });
        return {
          storageKey: request.storageKey,
          sizeBytes: totalBytes,
          etag: null,
        };
      } catch (err) {
        // Cleanup partial file before rethrowing.
        try {
          await fsPromises.unlink(targetPath);
        } catch {
          // ignore cleanup errors
        }
        if (err instanceof EvidenceStorageError) throw err;
        throw new EvidenceStorageError(
          'STREAM_FAILURE',
          'stream write failed',
          request.storageKey,
        );
      } finally {
        await handle.close().catch(() => {
          // ignore close errors
        });
      }
    },

    async read(storageKey: StorageKey): Promise<EvidenceByteStream> {
      const canonicalRoot = await getCanonicalRoot();
      const targetPath = await resolveKey(storageKey, canonicalRoot);
      try {
        const handle = await fsPromises.open(targetPath, 'r');
        return fileHandleToStream(handle);
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        throw new EvidenceStorageError(
          reasonFromErrno(code),
          'cannot open target for read',
          storageKey,
        );
      }
    },

    async delete(storageKey: StorageKey): Promise<void> {
      const canonicalRoot = await getCanonicalRoot();
      const targetPath = await resolveKey(storageKey, canonicalRoot);
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
        await fsPromises.access(targetPath, fsPromises.constants.F_OK);
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
      try {
        const s = await fsPromises.stat(targetPath);
        return {
          storageKey,
          contentType: null,
          sizeBytes: s.size,
          etag: null,
          lastModified: s.mtime,
        };
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        throw new EvidenceStorageError(
          reasonFromErrno(code),
          'cannot stat target',
          storageKey,
        );
      }
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
