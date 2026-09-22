/**
 * local-vps-evidence-storage.adapter.test.ts — P0-A03 / ER-002.
 *
 * Targeted tests for the local VPS filesystem adapter for the
 * provider-neutral EvidenceStorage port (ER-001).
 *
 * Tests use synthetic bytes and temporary directories created via
 * `fs.mkdtemp`. No test touches /srv/hrp/evidence or any real evidence
 * path. POSIX symlink tests skip on non-POSIX platforms; the suite still
 * runs deterministically and Linux CI exercises them for real.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mkdtemp,
  rm,
  mkdir,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { promises as fsPromises } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  makeLocalVpsEvidenceStorageAdapter,
  defaultEvidencePathResolver,
} from './local-vps-evidence-storage.adapter';
import {
  EvidenceStorageError,
} from './evidence-storage.port';

// POSIX symlink support detection: 'win32' skips symlink tests.
const IS_POSIX = process.platform !== 'win32';

/** Lazy source that throws after yielding the first chunk. */
async function* failingAfter(
  ok: Uint8Array,
): AsyncIterable<Uint8Array> {
  yield ok;
  throw new EvidenceStorageError('STREAM_FAILURE', 'simulated source failure', null);
}

/** Drain an async iterable into one Uint8Array (for read-back). */
async function drain(iter: AsyncIterable<Uint8Array>): Promise<Uint8Array> {
  const out: Uint8Array[] = [];
  let total = 0;
  for await (const c of iter) {
    out.push(c);
    total += c.byteLength;
  }
  const merged = new Uint8Array(total);
  let off = 0;
  for (const c of out) {
    merged.set(c, off);
    off += c.byteLength;
  }
  return merged;
}

/** A test helper: yield the given chunks in order. */
async function* bytes(...chunks: Uint8Array[]): AsyncIterable<Uint8Array> {
  for (const c of chunks) yield c;
}

describe('LocalVpsEvidenceStorageAdapter — root validation', () => {
  let rootDir: string;
  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'er002-root-'));
  });
  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('throws INVALID_REQUEST when env variable is missing (sync)', () => {
    expect(() =>
      makeLocalVpsEvidenceStorageAdapter({}, defaultEvidencePathResolver),
    ).toThrow(EvidenceStorageError);
  });

  it('throws INVALID_REQUEST for blank/relative root (sync)', () => {
    expect(() =>
      makeLocalVpsEvidenceStorageAdapter(
        { HRP_EVIDENCE_ROOT: '' },
        defaultEvidencePathResolver,
      ),
    ).toThrow(EvidenceStorageError);

    expect(() =>
      makeLocalVpsEvidenceStorageAdapter(
        { HRP_EVIDENCE_ROOT: 'relative/path' },
        defaultEvidencePathResolver,
      ),
    ).toThrow(EvidenceStorageError);

    expect(() =>
      makeLocalVpsEvidenceStorageAdapter(
        { HRP_EVIDENCE_ROOT: './also-relative' },
        defaultEvidencePathResolver,
      ),
    ).toThrow(EvidenceStorageError);
  });

  it('throws INVALID_REQUEST when root does not exist (lazy on first call)', async () => {
    const missing = join(rootDir, 'no-such-subdir');
    const a = makeLocalVpsEvidenceStorageAdapter(
      { HRP_EVIDENCE_ROOT: missing },
      defaultEvidencePathResolver,
    );
    await expect(
      a.write({
        storageKey: 'test/file' as unknown as ReturnType<typeof import('./evidence-storage.port').asStorageKey>,
        contentType: 'application/octet-stream',
        body: bytes(new Uint8Array([1])),
      }),
    ).rejects.toMatchObject({
      reason: 'INVALID_REQUEST',
    });
  });

  it('throws INVALID_REQUEST when root exists but is a file (lazy on first call)', async () => {
    const filePath = join(rootDir, 'a-file');
    await writeFile(filePath, 'x', 'utf8');
    const a = makeLocalVpsEvidenceStorageAdapter(
      { HRP_EVIDENCE_ROOT: filePath },
      defaultEvidencePathResolver,
    );
    await expect(
      a.write({
        storageKey: 'test/file' as unknown as ReturnType<typeof import('./evidence-storage.port').asStorageKey>,
        contentType: 'application/octet-stream',
        body: bytes(new Uint8Array([1])),
      }),
    ).rejects.toMatchObject({
      reason: 'INVALID_REQUEST',
    });
  });

  it.skipIf(!IS_POSIX)('throws INVALID_REQUEST when root is a symlink', async () => {
    const target = join(rootDir, 'real');
    await mkdir(target, { recursive: true });
    const link = join(rootDir, 'link');
    await symlink(target, link, 'dir');
    const a = makeLocalVpsEvidenceStorageAdapter(
      { HRP_EVIDENCE_ROOT: link },
      defaultEvidencePathResolver,
    );
    await expect(
      a.write({
        storageKey: 'test/file' as unknown as ReturnType<typeof import('./evidence-storage.port').asStorageKey>,
        contentType: 'application/octet-stream',
        body: bytes(new Uint8Array([1])),
      }),
    ).rejects.toThrow(EvidenceStorageError);
  });

  it('accepts a valid absolute directory root', () => {
    expect(() =>
      makeLocalVpsEvidenceStorageAdapter(
        { HRP_EVIDENCE_ROOT: rootDir },
        defaultEvidencePathResolver,
      ),
    ).not.toThrow();
  });
});

describe('LocalVpsEvidenceStorageAdapter — storage key validation', () => {
  let tempDir: string;
  let adapter: ReturnType<typeof makeLocalVpsEvidenceStorageAdapter>;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'er002-keys-'));
    adapter = makeLocalVpsEvidenceStorageAdapter(
      { HRP_EVIDENCE_ROOT: tempDir },
      defaultEvidencePathResolver,
    );
  });
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('rejects backslash in keys', async () => {
    await expect(
      adapter.write({
        storageKey: 'tenant\\with\\backslash' as unknown as Parameters<typeof adapter.write>[0]['storageKey'],
        contentType: 'application/octet-stream',
        body: bytes(new Uint8Array([1, 2, 3])),
      }),
    ).rejects.toMatchObject({
      reason: 'INVALID_KEY',
    });
  });

  it('rejects dot segment "../"', async () => {
    await expect(
      adapter.write({
        storageKey: 'foo/../bar' as unknown as Parameters<typeof adapter.write>[0]['storageKey'],
        contentType: 'application/octet-stream',
        body: bytes(new Uint8Array([1])),
      }),
    ).rejects.toMatchObject({
      reason: 'INVALID_KEY',
    });
  });

  it('rejects empty segment "//"', async () => {
    await expect(
      adapter.write({
        storageKey: 'foo//bar' as unknown as Parameters<typeof adapter.write>[0]['storageKey'],
        contentType: 'application/octet-stream',
        body: bytes(new Uint8Array([1])),
      }),
    ).rejects.toMatchObject({
      reason: 'INVALID_KEY',
    });
  });

  it('rejects trailing slash', async () => {
    await expect(
      adapter.write({
        storageKey: 'foo/bar/' as unknown as Parameters<typeof adapter.write>[0]['storageKey'],
        contentType: 'application/octet-stream',
        body: bytes(new Uint8Array([1])),
      }),
    ).rejects.toBeInstanceOf(EvidenceStorageError);
  });

  it('rejects NUL byte', async () => {
    await expect(
      adapter.write({
        storageKey: 'foo\u0000bar' as unknown as Parameters<typeof adapter.write>[0]['storageKey'],
        contentType: 'application/octet-stream',
        body: bytes(new Uint8Array([1])),
      }),
    ).rejects.toMatchObject({
      reason: 'INVALID_KEY',
    });
  });

  it('rejects control character (\\x01)', async () => {
    await expect(
      adapter.write({
        storageKey: 'foo\x01bar' as unknown as Parameters<typeof adapter.write>[0]['storageKey'],
        contentType: 'application/octet-stream',
        body: bytes(new Uint8Array([1])),
      }),
    ).rejects.toMatchObject({
      reason: 'INVALID_KEY',
    });
  });

  it('rejects absolute POSIX paths', async () => {
    await expect(
      adapter.write({
        storageKey: '/etc/passwd' as unknown as Parameters<typeof adapter.write>[0]['storageKey'],
        contentType: 'application/octet-stream',
        body: bytes(new Uint8Array([1])),
      }),
    ).rejects.toMatchObject({
      reason: 'INVALID_KEY',
    });
  });

  it('rejects URL-shaped keys', async () => {
    await expect(
      adapter.write({
        storageKey: 'https://example.com/x' as unknown as Parameters<typeof adapter.write>[0]['storageKey'],
        contentType: 'application/octet-stream',
        body: bytes(new Uint8Array([1])),
      }),
    ).rejects.toMatchObject({
      reason: 'INVALID_KEY',
    });
  });

  it.skipIf(!IS_POSIX)('rejects target symlink that escapes root', async () => {
    const outsideDir = await mkdtemp(join(tmpdir(), 'er002-outside-'));
    try {
      const outsideFile = join(outsideDir, 'secret.bin');
      await writeFile(outsideFile, new Uint8Array([0xff, 0xfa, 0xfb]));
      const linkPath = join(tempDir, 'escape');
      await symlink(outsideFile, linkPath, 'file');
      await expect(
        adapter.write({
          storageKey: 'escape' as unknown as Parameters<typeof adapter.write>[0]['storageKey'],
          contentType: 'application/octet-stream',
          body: bytes(new Uint8Array([1, 2, 3])),
        }),
      ).rejects.toMatchObject({
        reason: 'INVALID_KEY',
      });
    } finally {
      await rm(outsideDir, { recursive: true, force: true });
    }
  });

  it.skipIf(!IS_POSIX)('rejects parent symlink that escapes root', async () => {
    const outsideDir = await mkdtemp(join(tmpdir(), 'er002-out-'));
    try {
      const linkDir = join(tempDir, 'linked');
      await symlink(outsideDir, linkDir, 'dir');
      await expect(
        adapter.write({
          storageKey: 'linked/secret.bin' as unknown as Parameters<typeof adapter.write>[0]['storageKey'],
          contentType: 'application/octet-stream',
          body: bytes(new Uint8Array([1, 2, 3])),
        }),
      ).rejects.toMatchObject({
        reason: 'INVALID_KEY',
      });
    } finally {
      await rm(outsideDir, { recursive: true, force: true });
    }
  });
});

describe('LocalVpsEvidenceStorageAdapter — write / read / delete / stat / exists', () => {
  let tempDir: string;
  let adapter: ReturnType<typeof makeLocalVpsEvidenceStorageAdapter>;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'er002-ops-'));
    adapter = makeLocalVpsEvidenceStorageAdapter(
      { HRP_EVIDENCE_ROOT: tempDir },
      defaultEvidencePathResolver,
    );
  });
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('round-trips multi-chunk synthetic bytes', async () => {
    const key = 'tenant-1/evidence-abc' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    const chunkA = new Uint8Array([0x01, 0x02, 0x03]);
    const chunkB = new Uint8Array([0x04, 0x05]);
    const chunkC = new Uint8Array([0x06, 0x07, 0x08, 0x09]);
    const result = await adapter.write({
      storageKey: key,
      contentType: 'application/octet-stream',
      body: bytes(chunkA, chunkB, chunkC),
    });
    expect(result.sizeBytes).toBe(9);
    expect(result.etag).toBeNull();

    const stream = await adapter.read(key);
    const out = await drain(stream);
    expect(Array.from(out)).toEqual([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09]);
  });

  it('writes empty object (zero bytes)', async () => {
    const key = 'tenant-1/empty' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    const result = await adapter.write({
      storageKey: key,
      contentType: 'application/octet-stream',
      body: bytes(),
    });
    expect(result.sizeBytes).toBe(0);
    const s = await adapter.stat(key);
    expect(s.sizeBytes).toBe(0);
    const stream = await adapter.read(key);
    const out = await drain(stream);
    expect(out.byteLength).toBe(0);
  });

  it('rejects duplicate writes with ALREADY_EXISTS', async () => {
    const key = 'tenant-1/dup' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    await adapter.write({
      storageKey: key,
      contentType: 'application/octet-stream',
      body: bytes(new Uint8Array([1])),
    });
    await expect(
      adapter.write({
        storageKey: key,
        contentType: 'application/octet-stream',
        body: bytes(new Uint8Array([2])),
      }),
    ).rejects.toMatchObject({
      reason: 'ALREADY_EXISTS',
    });
  });

  it('rapid sequential writes of same key: at least one rejected as ALREADY_EXISTS', async () => {
    const key = 'tenant-1/concurrent' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    const results = await Promise.allSettled([
      adapter.write({
        storageKey: key,
        contentType: 'application/octet-stream',
        body: bytes(new Uint8Array([1])),
      }),
      adapter.write({
        storageKey: key,
        contentType: 'application/octet-stream',
        body: bytes(new Uint8Array([2])),
      }),
      adapter.write({
        storageKey: key,
        contentType: 'application/octet-stream',
        body: bytes(new Uint8Array([3])),
      }),
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    expect(rejected.length).toBeGreaterThanOrEqual(1);
    for (const r of rejected) {
      const reason = (r as PromiseRejectedResult).reason as unknown;
      expect(reason).toBeInstanceOf(EvidenceStorageError);
      expect((reason as EvidenceStorageError).reason).toBe('ALREADY_EXISTS');
    }
  });

  it('cleans up partial artifact when source fails mid-stream', async () => {
    const key = 'tenant-1/failing' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    const ok = new Uint8Array([1, 2, 3, 4, 5]);
    await expect(
      adapter.write({
        storageKey: key,
        contentType: 'application/octet-stream',
        body: failingAfter(ok),
      }),
    ).rejects.toMatchObject({
      reason: 'STREAM_FAILURE',
    });
    await expect(adapter.read(key)).rejects.toMatchObject({ reason: 'NOT_FOUND' });
    await expect(adapter.exists(key)).resolves.toBe(false);
  });

  it('stat returns contentType=null, etag=null, lastModified non-null', async () => {
    const key = 'tenant-1/statmeta' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    await adapter.write({
      storageKey: key,
      contentType: 'application/octet-stream',
      body: bytes(new Uint8Array([1, 2, 3])),
    });
    const s = await adapter.stat(key);
    expect(s.storageKey).toBe(key);
    expect(s.contentType).toBeNull();
    expect(s.etag).toBeNull();
    expect(s.sizeBytes).toBe(3);
    expect(s.lastModified).toBeInstanceOf(Date);
  });

  it('exists returns true after write, false on missing', async () => {
    const present = 'tenant-1/present' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    const absent = 'tenant-1/absent' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    await adapter.write({
      storageKey: present,
      contentType: 'application/octet-stream',
      body: bytes(new Uint8Array([1])),
    });
    await expect(adapter.exists(present)).resolves.toBe(true);
    await expect(adapter.exists(absent)).resolves.toBe(false);
  });

  it('delete on missing throws NOT_FOUND', async () => {
    const key = 'tenant-1/missing-del' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    await expect(adapter.delete(key)).rejects.toMatchObject({
      reason: 'NOT_FOUND',
    });
  });

  it('delete after write succeeds; subsequent delete throws NOT_FOUND', async () => {
    const key = 'tenant-1/del-twice' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    await adapter.write({
      storageKey: key,
      contentType: 'application/octet-stream',
      body: bytes(new Uint8Array([1])),
    });
    await adapter.delete(key);
    await expect(adapter.delete(key)).rejects.toMatchObject({
      reason: 'NOT_FOUND',
    });
  });

  it('read on missing throws NOT_FOUND', async () => {
    const key = 'tenant-1/nope' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    await expect(adapter.read(key)).rejects.toMatchObject({
      reason: 'NOT_FOUND',
    });
  });

  it('stat on missing throws NOT_FOUND', async () => {
    const key = 'tenant-1/no-stat' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    await expect(adapter.stat(key)).rejects.toMatchObject({
      reason: 'NOT_FOUND',
    });
  });

  it('creates nested directory on write', async () => {
    const key = 'tenant-1/deep/nested/path/evidence.bin' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    await adapter.write({
      storageKey: key,
      contentType: 'application/octet-stream',
      body: bytes(new Uint8Array([1, 2, 3, 4])),
    });
    await expect(adapter.exists(key)).resolves.toBe(true);
  });
});

describe('LocalVpsEvidenceStorageAdapter — error surface safety', () => {
  let tempDir: string;
  let adapter: ReturnType<typeof makeLocalVpsEvidenceStorageAdapter>;
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'er002-safety-'));
    adapter = makeLocalVpsEvidenceStorageAdapter(
      { HRP_EVIDENCE_ROOT: tempDir },
      defaultEvidencePathResolver,
    );
  });
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('error messages never include the absolute root path', async () => {
    const key = 'trigger/notfound' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    let captured: Error | null = null;
    try {
      await adapter.read(key);
    } catch (err) {
      captured = err as Error;
    }
    expect(captured).toBeInstanceOf(EvidenceStorageError);
    const msg = (captured as Error).message;
    expect(msg.includes(tempDir)).toBe(false);
  });

  it('error retains the storageKey that triggered it', async () => {
    const key = 'trigger/retained' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    let captured: EvidenceStorageError | null = null;
    try {
      await adapter.read(key);
    } catch (err) {
      captured = err as EvidenceStorageError;
    }
    expect(captured).toBeInstanceOf(EvidenceStorageError);
    expect(captured!.storageKey).toBe(key);
  });

  it('error carries typed reason for known failures', async () => {
    const key = 'trigger/specific' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    let captured: EvidenceStorageError | null = null;
    try {
      await adapter.read(key);
    } catch (err) {
      captured = err as EvidenceStorageError;
    }
    expect(captured).toBeInstanceOf(EvidenceStorageError);
    expect(captured!.reason).toBe('NOT_FOUND');
  });
});

/**
 * Revision round 2 regression tests (T0 source-review findings).
 *
 * F1: resolveKey walks by index, not by value (key with repeated segment).
 * F2: write loop short writes; sizeBytes reflects bytes actually persisted.
 * F3: read stream maps late errors to STREAM_FAILURE; handle closes after
 *     consumer cancellation.
 * F4: directories / non-regular nodes are NOT_FOUND uniformly at the
 *     read/delete/exists/stat boundary.
 * F5: partial-artifact cleanup happens AFTER handle close.
 */
describe('LocalVpsEvidenceStorageAdapter — F1 regression (resolveKey by index, pre-existing parent)', () => {
  let tempDir: string;
  let adapter: ReturnType<typeof makeLocalVpsEvidenceStorageAdapter>;
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'er002-f1-'));
    adapter = makeLocalVpsEvidenceStorageAdapter(
      { HRP_EVIDENCE_ROOT: tempDir },
      defaultEvidencePathResolver,
    );
  });
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // The T0 round-3 directive specifies that the F1 regression test MUST
  // pre-create <root>/a, leave <root>/a/a absent, then write a/a/file.bin.
  // This is the exact configuration that triggers an indexOf-based resolveKey
  // to misroute the second 'a' segment. The previous test happened to work
  // because write() lazily mkdir'd the parent chain via its own recursive
  // mkdir, hiding the indexOf bug.

  it('resolves a/a/file.bin when <root>/a exists and <root>/a/a is missing', async () => {
    // Pre-create root/a only; root/a/a deliberately absent.
    await mkdir(join(tempDir, 'a'), { recursive: true });
    const aEntriesBefore = await (await import('node:fs/promises')).readdir(join(tempDir, 'a'));
    expect(aEntriesBefore).toEqual([]);

    const key = 'a/a/file.bin' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    const payload = new Uint8Array([0x10, 0x20, 0x30, 0x40]);
    const result = await adapter.write({
      storageKey: key,
      contentType: 'application/octet-stream',
      body: bytes(payload),
    });
    expect(result.sizeBytes).toBe(4);

    // Round-trip via read.
    const stream = await adapter.read(key);
    const out = await drain(stream);
    expect(Array.from(out)).toEqual([0x10, 0x20, 0x30, 0x40]);

    // The file MUST land at <root>/a/a/file.bin exactly — the second 'a'
    // is the INNER directory, not a sibling of root/a. If the adapter
    // had used indexOf to locate the missing-segment start, the second
    // 'a' would have been treated as a re-use of the first 'a' and the
    // write would have landed at <root>/a/file.bin instead.
    const { readdir: readdirFs, stat: statFs } = await import('node:fs/promises');
    const rootEntries = await readdirFs(tempDir);
    expect(rootEntries.sort()).toEqual(['a']);
    const aEntries = await readdirFs(join(tempDir, 'a'));
    expect(aEntries.sort()).toEqual(['a']);
    const inner = await readdirFs(join(tempDir, 'a', 'a'));
    expect(inner.sort()).toEqual(['file.bin']);
    const st = await statFs(join(tempDir, 'a', 'a', 'file.bin'));
    expect(st.isFile()).toBe(true);
    expect(st.size).toBe(4);
  });

  it('resolves x/x/x/file.bin when <root>/x exists and x/x, x/x/x are missing', async () => {
    // Pre-create root/x only.
    await mkdir(join(tempDir, 'x'), { recursive: true });
    const key = 'x/x/x/file.bin' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    const payload = new Uint8Array([0xAA, 0xBB]);
    const result = await adapter.write({
      storageKey: key,
      contentType: 'application/octet-stream',
      body: bytes(payload),
    });
    expect(result.sizeBytes).toBe(2);
    const stream = await adapter.read(key);
    const out = await drain(stream);
    expect(Array.from(out)).toEqual([0xAA, 0xBB]);

    // Confirm file lives at the correct depth (3 levels of x).
    const { readdir: readdirFs, stat: statFs } = await import('node:fs/promises');
    expect((await readdirFs(tempDir)).sort()).toEqual(['x']);
    expect((await readdirFs(join(tempDir, 'x'))).sort()).toEqual(['x']);
    expect((await readdirFs(join(tempDir, 'x', 'x'))).sort()).toEqual(['x']);
    expect((await readdirFs(join(tempDir, 'x', 'x', 'x'))).sort()).toEqual(['file.bin']);
    const st = await statFs(join(tempDir, 'x', 'x', 'x', 'file.bin'));
    expect(st.isFile()).toBe(true);
    expect(st.size).toBe(2);
  });
});

describe('LocalVpsEvidenceStorageAdapter — F2 regression (write-all loop, zero-progress, sizeBytes)', () => {
  let tempDir: string;
  let adapter: ReturnType<typeof makeLocalVpsEvidenceStorageAdapter>;
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'er002-f2-'));
    adapter = makeLocalVpsEvidenceStorageAdapter(
      { HRP_EVIDENCE_ROOT: tempDir },
      defaultEvidencePathResolver,
    );
  });
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // T0 round-3 directive: F2 regression MUST inject a FileHandle.write
  // that returns bytesWritten smaller than requested length, verify
  // offsets / byte-exact / sizeBytes, AND include a zero-progress case
  // that proves the loop refuses to spin forever.

  it('writeChunkAll covers short writes by looping until the chunk is fully drained', async () => {
    // Use the exported helper directly with a fake handle that returns
    // short writes: 1 byte on the first call, then 2 bytes on the
    // second call, then 0 to drive the next-iteration logic. We then
    // verify the helper returns the sum of all bytesWritten values
    // (not the input chunk.byteLength) and that the offset advances
    // exactly as expected.
    const { writeChunkAll } = await import('./local-vps-evidence-storage.adapter');
    const chunk = new Uint8Array([1, 2, 3, 4, 5, 6, 7]);
    let offsetSeen = -1;
    let calls = 0;
    const fakeHandle = {
      write: async (
        _buf: Uint8Array,
        offset: number,
        length: number,
        _pos: number | null,
      ): Promise<{ bytesWritten: number; buffer: Uint8Array }> => {
        calls += 1;
        offsetSeen = offset;
        // First call: write 3 of the requested 7.
        // Second call: write 4 (offset advances to 3).
        // Third call: would write 0 — but the loop should be done by
        // then, because chunk.byteLength - offset = 4 and we return 4.
        // We return 3 for the first call, 4 for the second, and never
        // a third call. The helper should return 7.
        if (calls === 1) {
          expect(length).toBe(7);
          expect(offset).toBe(0);
          return { bytesWritten: 3, buffer: _buf };
        }
        if (calls === 2) {
          expect(length).toBe(4);
          expect(offset).toBe(3);
          return { bytesWritten: 4, buffer: _buf };
        }
        throw new Error('unexpected third call — short-write loop did not converge');
      },
    };
    const total = await writeChunkAll(
      fakeHandle as unknown as Awaited<ReturnType<typeof fsPromises.open>>,
      chunk,
    );
    expect(total).toBe(7);
    expect(calls).toBe(2);
    expect(offsetSeen).toBe(3);
  });

  it('writeChunkAll throws STORAGE_UNAVAILABLE on zero-progress (no infinite loop)', async () => {
    const { writeChunkAll } = await import('./local-vps-evidence-storage.adapter');
    const chunk = new Uint8Array([1, 2, 3]);
    let calls = 0;
    const fakeHandle = {
      write: async (): Promise<{ bytesWritten: number; buffer: Uint8Array }> => {
        calls += 1;
        // Backend bug: returns 0 bytesWritten. The helper MUST exit
        // with STORAGE_UNAVAILABLE after the FIRST call rather than
        // spinning forever.
        return { bytesWritten: 0, buffer: new Uint8Array(0) };
      },
    };
    await expect(
      writeChunkAll(
        fakeHandle as unknown as Awaited<ReturnType<typeof fsPromises.open>>,
        chunk,
      ),
    ).rejects.toMatchObject({ reason: 'STORAGE_UNAVAILABLE' });
    // The loop guard MUST fire after exactly one iteration.
    expect(calls).toBe(1);
  });

  it('writeChunkAll throws STORAGE_UNAVAILABLE when bytesWritten is non-integer / negative', async () => {
    const { writeChunkAll } = await import('./local-vps-evidence-storage.adapter');
    const chunk = new Uint8Array([1, 2, 3]);
    for (const bad of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const fakeHandle = {
        write: async (): Promise<{ bytesWritten: number; buffer: Uint8Array }> => ({
          bytesWritten: bad,
          buffer: new Uint8Array(0),
        }),
      };
      await expect(
        writeChunkAll(
          fakeHandle as unknown as Awaited<ReturnType<typeof fsPromises.open>>,
          chunk,
        ),
      ).rejects.toMatchObject({ reason: 'STORAGE_UNAVAILABLE' });
    }
  });

  it('sizeBytes equals the count of bytes actually persisted for a real write', async () => {
    // Sanity: the loop's contract is `result.sizeBytes === on-disk size`
    // under realistic conditions. We can't force short writes on real
    // disk in CI, so this is the observable end-to-end check.
    const key = 'tenant-1/sizebin' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    const payload = new Uint8Array(8192);
    for (let i = 0; i < payload.length; i++) payload[i] = i & 0xff;
    const result = await adapter.write({
      storageKey: key,
      contentType: 'application/octet-stream',
      body: bytes(payload),
    });
    expect(result.sizeBytes).toBe(8192);
    const { stat: statFs } = await import('node:fs/promises');
    const st = await statFs(join(tempDir, 'tenant-1', 'sizebin'));
    expect(st.size).toBe(result.sizeBytes);
  });

  it('sizeBytes matches a chunked (7-piece) source end-to-end', async () => {
    const key = 'tenant-1/manychunks' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    const total = 5000;
    const sizes = [1, 17, 4097, 41, 700, 80, 64];
    const pieces: Uint8Array[] = [];
    let written = 0;
    for (const s of sizes) {
      const b = new Uint8Array(s);
      for (let i = 0; i < s; i++) b[i] = (written + i) & 0xff;
      written += s;
      pieces.push(b);
    }
    expect(written).toBe(total);
    const result = await adapter.write({
      storageKey: key,
      contentType: 'application/octet-stream',
      body: (async function* () {
        for (const p of pieces) yield p;
      })(),
    });
    expect(result.sizeBytes).toBe(total);
    const { stat: statFs } = await import('node:fs/promises');
    const st = await statFs(join(tempDir, 'tenant-1', 'manychunks'));
    expect(st.size).toBe(total);
  });

  it('adapter.write uses short-write-aware loop end-to-end (injected via fsPromises.open spy)', async () => {
    // Spy fsPromises.open so the adapter receives a wrapped handle whose
    // .write() returns 3 bytesWritten on the first call (after actually
    // persisting 3 bytes via the underlying fsPromises.open), then
    // delegates to the real write. The on-disk file MUST end up with
    // all 7 bytes (proves the loop ran to completion) and the adapter
    // MUST report sizeBytes === 7.
    const realOpen = fsPromises.open;
    const spy = vi
      .spyOn(fsPromises, 'open')
      .mockImplementation((async (...args: unknown[]) => {
        const handle = await (realOpen as unknown as (...a: unknown[]) => Promise<{
          write: (...a: unknown[]) => Promise<{ bytesWritten: number; buffer: Uint8Array }>;
          close: () => Promise<void>;
          read: (...a: unknown[]) => Promise<{ bytesRead: number; buffer: Uint8Array }>;
        }>)(...args);
        const originalWrite = handle.write.bind(handle);
        let writes = 0;
        (handle as unknown as { write: typeof originalWrite }).write = (async (
          buf: Uint8Array,
          offset: number,
          length: number,
          position: number | null,
        ) => {
          writes += 1;
          if (writes === 1) {
            // First call: actually persist 3 bytes via the real write
            // (length = 3), then lie and claim bytesWritten = 3.
            // The adapter will see "3 of 7 written" and loop again.
            const real = await originalWrite(
              buf as unknown as Buffer,
              offset,
              3,
              position,
            );
            // Force bytesWritten to match the bytes we actually wrote.
            return { bytesWritten: 3, buffer: real.buffer as unknown as Uint8Array };
          }
          // Subsequent calls: delegate to the real write so the
          // remaining bytes land on disk.
          return await originalWrite(
            buf as unknown as Buffer,
            offset,
            length,
            position,
          );
        }) as unknown as typeof originalWrite;
        return handle;
      }) as typeof realOpen);

    try {
      const key = 'tenant-1/short-injected' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
      const payload = new Uint8Array([0xa1, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7]);
      const result = await adapter.write({
        storageKey: key,
        contentType: 'application/octet-stream',
        body: bytes(payload),
      });
      expect(result.sizeBytes).toBe(7);
      const { stat: statFs } = await import('node:fs/promises');
      const st = await statFs(join(tempDir, 'tenant-1', 'short-injected'));
      expect(st.size).toBe(7);
      // The on-disk bytes must match the source byte-exact.
      const { readFile: readFileFs } = await import('node:fs/promises');
      const onDisk = await readFileFs(join(tempDir, 'tenant-1', 'short-injected'));
      expect(Array.from(new Uint8Array(onDisk))).toEqual([0xa1, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7]);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('LocalVpsEvidenceStorageAdapter — F3 regression (read stream handles close + late errors)', () => {
  let tempDir: string;
  let adapter: ReturnType<typeof makeLocalVpsEvidenceStorageAdapter>;
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'er002-f3-'));
    adapter = makeLocalVpsEvidenceStorageAdapter(
      { HRP_EVIDENCE_ROOT: tempDir },
      defaultEvidencePathResolver,
    );
  });
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // T0 round-3 directive: the F3 regression MUST spy on handle.close
  // directly and assert it is called on EOF, late error, AND consumer
  // break. The previous "second read on the same key succeeds" check
  // was insufficient because it only proved the FILE was no longer
  // exclusively locked, not that THIS handle was closed.

  it('fileHandleToStream calls handle.close() exactly once on EOF', async () => {
    // Prepare a small file.
    const key = 'tenant-1/eof' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    const payload = new Uint8Array([1, 2, 3, 4, 5]);
    await adapter.write({
      storageKey: key,
      contentType: 'application/octet-stream',
      body: bytes(payload),
    });

    // Open the file and wrap its close() with a counter so we can
    // assert it was called exactly once.
    const { promises: fs } = await import('node:fs');
    const handle = await fs.open(join(tempDir, 'tenant-1', 'eof'), 'r');
    let closeCalls = 0;
    const originalClose = handle.close.bind(handle);
    (handle as unknown as { close: typeof originalClose }).close = (async () => {
      closeCalls += 1;
      await originalClose();
    }) as unknown as typeof originalClose;

    const { fileHandleToStream } = await import('./local-vps-evidence-storage.adapter');
    const stream = await fileHandleToStream(handle);
    const out = await drain(stream);
    expect(Array.from(out)).toEqual([1, 2, 3, 4, 5]);
    // Yield a microtask to allow the producer's `finally` to complete.
    await new Promise((resolve) => setImmediate(resolve));
    expect(closeCalls).toBe(1);
  });

  it('fileHandleToStream calls handle.close() exactly once on late mid-drain error', async () => {
    // Prepare a real file with >= 130 KiB so the 64 KiB read loop yields
    // at least 2 chunks.
    const key = 'tenant-1/readfail' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    const payload = new Uint8Array(130 * 1024);
    for (let i = 0; i < payload.length; i++) payload[i] = i & 0xff;
    await adapter.write({
      storageKey: key,
      contentType: 'application/octet-stream',
      body: bytes(payload),
    });

    const { promises: fs } = await import('node:fs');
    const handle = await fs.open(join(tempDir, 'tenant-1', 'readfail'), 'r');
    let closeCalls = 0;
    const originalClose = handle.close.bind(handle);
    (handle as unknown as { close: typeof originalClose }).close = (async () => {
      closeCalls += 1;
      await originalClose();
    }) as unknown as typeof originalClose;

    const originalRead = handle.read.bind(handle);
    let readCalls = 0;
    (handle as unknown as { read: typeof originalRead }).read = (async (
      buf: Uint8Array,
      offset: number,
      length: number,
      position: number | null,
    ) => {
      readCalls += 1;
      if (readCalls >= 2) {
        const e = new Error('injected late read failure') as NodeJS.ErrnoException;
        e.code = 'EIO';
        throw e;
      }
      return await originalRead(
        buf as Buffer,
        offset,
        length,
        position,
      );
    }) as unknown as typeof originalRead;

    const { fileHandleToStream } = await import('./local-vps-evidence-storage.adapter');
    const stream = await fileHandleToStream(handle);
    await expect(drain(stream)).rejects.toMatchObject({
      name: 'EvidenceStorageError',
      reason: 'STREAM_FAILURE',
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(closeCalls).toBe(1);
  });

  it('fileHandleToStream calls handle.close() when the consumer cancels iteration mid-drain', async () => {
    // Prepare a 256 KiB payload so the read loop yields many chunks.
    const key = 'tenant-1/cancel' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    const payload = new Uint8Array(256 * 1024);
    for (let i = 0; i < payload.length; i++) payload[i] = i & 0xff;
    await adapter.write({
      storageKey: key,
      contentType: 'application/octet-stream',
      body: bytes(payload),
    });

    const { promises: fs } = await import('node:fs');
    const handle = await fs.open(join(tempDir, 'tenant-1', 'cancel'), 'r');
    let closeCalls = 0;
    const originalClose = handle.close.bind(handle);
    (handle as unknown as { close: typeof originalClose }).close = (async () => {
      closeCalls += 1;
      await originalClose();
    }) as unknown as typeof originalClose;

    const { fileHandleToStream } = await import('./local-vps-evidence-storage.adapter');
    const stream = await fileHandleToStream(handle);
    let firstChunk: Uint8Array | null = null;
    for await (const c of stream) {
      firstChunk = c;
      break; // consumer cancels after the first chunk
    }
    expect(firstChunk).not.toBeNull();
    // Yield to allow generator finally to run.
    await new Promise((resolve) => setImmediate(resolve));
    expect(closeCalls).toBe(1);
  });

  it('late mid-drain error is surfaced as STREAM_FAILURE with safe message and storageKey', async () => {
    const key = 'tenant-1/keysurf' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    const payload = new Uint8Array(130 * 1024);
    for (let i = 0; i < payload.length; i++) payload[i] = i & 0xff;
    await adapter.write({
      storageKey: key,
      contentType: 'application/octet-stream',
      body: bytes(payload),
    });

    const { promises: fs } = await import('node:fs');
    const handle = await fs.open(join(tempDir, 'tenant-1', 'keysurf'), 'r');
    try {
      const originalRead = handle.read.bind(handle);
      let readCalls = 0;
      (handle as unknown as { read: typeof originalRead }).read = (async (
        buf: Uint8Array,
        offset: number,
        length: number,
        position: number | null,
      ) => {
        readCalls += 1;
        if (readCalls >= 2) {
          // Throw a raw Node error with a sentinel substring that must
          // NOT appear in the surfaced error message.
          const e = new Error('injected sentinel /sentinel/absolute/PII_leaked') as NodeJS.ErrnoException;
          e.code = 'EIO';
          throw e;
        }
        return await originalRead(
          buf as Buffer,
          offset,
          length,
          position,
        );
      }) as unknown as typeof originalRead;

      const { fileHandleToStream } = await import('./local-vps-evidence-storage.adapter');
      const stream = await fileHandleToStream(handle, key);
      let captured: EvidenceStorageError | null = null;
      try {
        await drain(stream);
      } catch (err) {
        captured = err as EvidenceStorageError;
      }
      expect(captured).toBeInstanceOf(EvidenceStorageError);
      expect(captured!.reason).toBe('STREAM_FAILURE');
      expect(captured!.storageKey).toBe(key);
      const msg = captured!.message;
      expect(msg.includes('sentinel')).toBe(false);
      expect(msg.includes('PII_leaked')).toBe(false);
      expect(msg.includes('EIO')).toBe(false);
      expect(msg.includes('injected')).toBe(false);
    } finally {
      await handle.close().catch(() => {
        // close errors are not surfaced
      });
    }
  });
});

describe('LocalVpsEvidenceStorageAdapter — F4 regression (non-regular nodes are NOT_FOUND + symlink rejection)', () => {
  let tempDir: string;
  let adapter: ReturnType<typeof makeLocalVpsEvidenceStorageAdapter>;
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'er002-f4-'));
    adapter = makeLocalVpsEvidenceStorageAdapter(
      { HRP_EVIDENCE_ROOT: tempDir },
      defaultEvidencePathResolver,
    );
  });
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('exists() returns false for a directory (storage-object boundary)', async () => {
    const dirKey = 'tenant-1/some-dir' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    await mkdir(join(tempDir, 'tenant-1', 'some-dir'), { recursive: true });
    await expect(adapter.exists(dirKey)).resolves.toBe(false);
  });

  it('read() on a directory key throws NOT_FOUND (storage-object boundary)', async () => {
    const dirKey = 'tenant-1/some-dir-2' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    await mkdir(join(tempDir, 'tenant-1', 'some-dir-2'), { recursive: true });
    await expect(adapter.read(dirKey)).rejects.toMatchObject({
      reason: 'NOT_FOUND',
    });
  });

  it('stat() on a directory key throws NOT_FOUND (storage-object boundary)', async () => {
    const dirKey = 'tenant-1/some-dir-3' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    await mkdir(join(tempDir, 'tenant-1', 'some-dir-3'), { recursive: true });
    await expect(adapter.stat(dirKey)).rejects.toMatchObject({
      reason: 'NOT_FOUND',
    });
  });

  it('delete() on a directory key throws NOT_FOUND and does not remove the directory', async () => {
    const dirKey = 'tenant-1/some-dir-4' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    await mkdir(join(tempDir, 'tenant-1', 'some-dir-4'), { recursive: true });
    await expect(adapter.delete(dirKey)).rejects.toMatchObject({
      reason: 'NOT_FOUND',
    });
    const { stat: statFs } = await import('node:fs/promises');
    const st = await statFs(join(tempDir, 'tenant-1', 'some-dir-4'));
    expect(st.isDirectory()).toBe(true);
  });

  // The T0 round-3 directive specifies NEW tests for symlink-to-regular-
  // file inside the root (both leaf and intermediate directory), proving
  // that read/stat/exists/delete do NOT follow aliases and that
  // delete(alias) does not delete the target.

  it.skipIf(!IS_POSIX)('write rejects a leaf alias that points to a regular file inside root', async () => {
    // Create a real regular file at <root>/real.bin, then place a symlink
    // at <root>/tenant-1/alias.bin pointing at it. write/alias.bin must
    // be rejected with INVALID_KEY, and the underlying real.bin MUST
    // remain intact.
    await mkdir(join(tempDir, 'tenant-1'), { recursive: true });
    const realPath = join(tempDir, 'real.bin');
    await writeFile(realPath, new Uint8Array([0xAB, 0xCD]));
    await symlink(realPath, join(tempDir, 'tenant-1', 'alias.bin'), 'file');
    const aliasKey = 'tenant-1/alias.bin' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    await expect(
      adapter.write({
        storageKey: aliasKey,
        contentType: 'application/octet-stream',
        body: bytes(new Uint8Array([0xEE])),
      }),
    ).rejects.toMatchObject({ reason: 'INVALID_KEY' });
    // Real file untouched.
    const onDisk = await (await import('node:fs/promises')).readFile(realPath);
    expect(Array.from(new Uint8Array(onDisk))).toEqual([0xAB, 0xCD]);
  });

  it.skipIf(!IS_POSIX)('read / stat / exists / delete on a leaf alias do NOT follow the alias', async () => {
    // Create a real regular file at <root>/real.bin and an alias at
    // <root>/tenant-1/alias.bin. Every port operation on the alias key
    // must observe the SYMLINK, not the underlying file: invalid_key on
    // write, not_found on read/stat/delete, false on exists.
    await mkdir(join(tempDir, 'tenant-1'), { recursive: true });
    const realPath = join(tempDir, 'real.bin');
    await writeFile(realPath, new Uint8Array([0xAB, 0xCD]));
    const aliasPath = join(tempDir, 'tenant-1', 'alias.bin');
    await symlink(realPath, aliasPath, 'file');

    const aliasKey = 'tenant-1/alias.bin' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];

    await expect(adapter.exists(aliasKey)).resolves.toBe(false);
    await expect(adapter.read(aliasKey)).rejects.toMatchObject({ reason: 'NOT_FOUND' });
    await expect(adapter.stat(aliasKey)).rejects.toMatchObject({ reason: 'NOT_FOUND' });
    await expect(adapter.delete(aliasKey)).rejects.toMatchObject({ reason: 'NOT_FOUND' });

    // CRITICAL invariant: delete(alias) MUST NOT have removed real.bin.
    const onDisk = await (await import('node:fs/promises')).readFile(realPath);
    expect(Array.from(new Uint8Array(onDisk))).toEqual([0xAB, 0xCD]);
  });

  it.skipIf(!IS_POSIX)('read / stat / exists / delete on an intermediate-directory alias do NOT follow the alias', async () => {
    // Place a symlink at <root>/tenant-1/aliased-dir pointing at a real
    // directory <root>/real-dir/evidence.bin. resolveKey must reject the
    // alias at the FIRST non-canonical segment, so the inner regular file
    // is never reachable through tenant-1/aliased-dir/evidence.bin.
    await mkdir(join(tempDir, 'tenant-1'), { recursive: true });
    const realDir = join(tempDir, 'real-dir');
    await mkdir(realDir, { recursive: true });
    const innerPath = join(realDir, 'evidence.bin');
    await writeFile(innerPath, new Uint8Array([0x11, 0x22, 0x33]));
    await symlink(realDir, join(tempDir, 'tenant-1', 'aliased-dir'), 'dir');

    const aliasKey = 'tenant-1/aliased-dir/evidence.bin' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];

    await expect(adapter.exists(aliasKey)).resolves.toBe(false);
    await expect(adapter.read(aliasKey)).rejects.toMatchObject({ reason: 'NOT_FOUND' });
    await expect(adapter.stat(aliasKey)).rejects.toMatchObject({ reason: 'NOT_FOUND' });
    await expect(adapter.delete(aliasKey)).rejects.toMatchObject({ reason: 'NOT_FOUND' });

    // Inner file untouched.
    const onDisk = await (await import('node:fs/promises')).readFile(innerPath);
    expect(Array.from(new Uint8Array(onDisk))).toEqual([0x11, 0x22, 0x33]);
  });

  it.skipIf(!IS_POSIX)('write through an intermediate-directory alias is rejected before the leaf is opened', async () => {
    await mkdir(join(tempDir, 'tenant-1'), { recursive: true });
    const realDir = join(tempDir, 'real-dir');
    await mkdir(realDir, { recursive: true });
    const innerPath = join(realDir, 'evidence.bin');
    await writeFile(innerPath, new Uint8Array([0x11, 0x22, 0x33]));
    await symlink(realDir, join(tempDir, 'tenant-1', 'aliased-dir'), 'dir');

    const aliasKey = 'tenant-1/aliased-dir/evidence.bin' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    await expect(
      adapter.write({
        storageKey: aliasKey,
        contentType: 'application/octet-stream',
        body: bytes(new Uint8Array([0xEE])),
      }),
    ).rejects.toMatchObject({ reason: 'INVALID_KEY' });

    const onDisk = await (await import('node:fs/promises')).readFile(innerPath);
    expect(Array.from(new Uint8Array(onDisk))).toEqual([0x11, 0x22, 0x33]);
  });

  it.skipIf(!IS_POSIX)('exists() returns false for a dangling symlink in the resolved path', async () => {
    const linkKey = 'tenant-1/dangling' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    await mkdir(join(tempDir, 'tenant-1'), { recursive: true });
    await symlink(join(tempDir, 'no-such-target'), join(tempDir, 'tenant-1', 'dangling'), 'file');
    await expect(adapter.exists(linkKey)).resolves.toBe(false);
  });

  it.skipIf(!IS_POSIX)('exists() returns false for a symlink whose target is a non-regular node', async () => {
    const linkKey = 'tenant-1/dir-via-symlink' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    await mkdir(join(tempDir, 'tenant-1'), { recursive: true });
    const realDir = join(tempDir, 'real-dir');
    await mkdir(realDir, { recursive: true });
    await symlink(realDir, join(tempDir, 'tenant-1', 'dir-via-symlink'), 'dir');
    // resolveKey walks each ORIGINAL path component with `lstat`. The
    // 'dir-via-symlink' segment IS a symlink, so it is rejected before
    // any follow-through can happen, regardless of whether the target
    // resolves inside containment.
    await expect(adapter.exists(linkKey)).resolves.toBe(false);
  });
});

describe('LocalVpsEvidenceStorageAdapter — F5 regression (cleanup ordering + failure surfacing)', () => {
  let tempDir: string;
  let adapter: ReturnType<typeof makeLocalVpsEvidenceStorageAdapter>;
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'er002-f5-'));
    adapter = makeLocalVpsEvidenceStorageAdapter(
      { HRP_EVIDENCE_ROOT: tempDir },
      defaultEvidencePathResolver,
    );
  });
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // T0 round-3 directive: F5 MUST inject a REAL unlink failure via a
  // test double (not just assert happy-path cleanup). The cleanup must
  // surface a typed EvidenceStorageError with safe message + the
  // request's storageKey so callers can tell cleanup was incomplete.

  it('on stream failure + injected unlink EACCES: surfaces typed error with safe message + request storageKey', async () => {
    // Spy fsPromises.unlink so the cleanup attempt fails with EACCES
    // (non-ENOENT). The adapter MUST surface STORAGE_UNAVAILABLE with
    // a safe message and the request storageKey, NOT swallow the
    // failure silently.
    const unlinkSpy = vi
      .spyOn(fsPromises, 'unlink')
      .mockImplementation((async () => {
        // Deliberately do NOT call the real unlink — the partial file
        // will remain on disk, which we then assert below.
        const e = new Error('injected sentinel /tmp/EACCES_leaked') as NodeJS.ErrnoException;
        e.code = 'EACCES';
        throw e;
      }) as typeof fsPromises.unlink);

    let captured: EvidenceStorageError | null = null;
    try {
      const key = 'tenant-1/cleanup-injected' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
      const ok = new Uint8Array([1, 2, 3, 4, 5]);
      try {
        await adapter.write({
          storageKey: key,
          contentType: 'application/octet-stream',
          body: failingAfter(ok),
        });
        throw new Error('expected throw');
      } catch (err) {
        captured = err as EvidenceStorageError;
      }
    } finally {
      unlinkSpy.mockRestore();
    }

    expect(captured).toBeInstanceOf(EvidenceStorageError);
    expect(captured!.reason).toBe('STORAGE_UNAVAILABLE');
    // The surfaced message must come from the safe whitelist and must
    // NOT echo the injected sentinel text or the absolute root path.
    expect(captured!.message.includes('sentinel')).toBe(false);
    expect(captured!.message.includes('EACCES_leaked')).toBe(false);
    expect(captured!.message.includes(tempDir)).toBe(false);
    // The storageKey reported to the caller is the REQUEST's key,
    // re-anchored at the boundary.
    expect(captured!.storageKey).toBe('tenant-1/cleanup-injected');
  });

  it('close failure with successful drain is surfaced as STORAGE_UNAVAILABLE (no silent success)', async () => {
    // Spy fsPromises.open so the adapter receives a real handle whose
    // close() throws EBADF. Drain succeeds (real write completes);
    // close then rejects with EBADF. The adapter MUST NOT report
    // success; it must surface STORAGE_UNAVAILABLE so the caller knows
    // the handle state is inconsistent.
    const realOpen = fsPromises.open;
    const spy = vi
      .spyOn(fsPromises, 'open')
      .mockImplementation((async (...args: unknown[]) => {
        const handle = await (realOpen as unknown as (...a: unknown[]) => Promise<{
          write: (...a: unknown[]) => Promise<{ bytesWritten: number; buffer: Uint8Array }>;
          close: () => Promise<void>;
          read: (...a: unknown[]) => Promise<{ bytesRead: number; buffer: Uint8Array }>;
        }>)(...args);
        (handle as unknown as { close: () => Promise<void> }).close = (async () => {
          const e = new Error('injected sentinel /tmp/EBADF_leaked') as NodeJS.ErrnoException;
          e.code = 'EBADF';
          throw e;
        });
        return handle;
      }) as typeof realOpen);

    let captured: EvidenceStorageError | null = null;
    try {
      const key = 'tenant-1/close-fail' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
      const payload = new Uint8Array([0xAA, 0xBB, 0xCC]);
      try {
        await adapter.write({
          storageKey: key,
          contentType: 'application/octet-stream',
          body: bytes(payload),
        });
        throw new Error('expected throw');
      } catch (err) {
        captured = err as EvidenceStorageError;
      }
    } finally {
      spy.mockRestore();
    }

    expect(captured).toBeInstanceOf(EvidenceStorageError);
    expect(captured!.reason).toBe('STORAGE_UNAVAILABLE');
    expect(captured!.message.includes('sentinel')).toBe(false);
    expect(captured!.message.includes('EBADF_leaked')).toBe(false);
    expect(captured!.message.includes(tempDir)).toBe(false);
    expect(captured!.storageKey).toBe('tenant-1/close-fail');
  });

  it('partial file remains on disk when unlink fails (cleanup is incomplete, NOT silently successful)', async () => {
    const unlinkSpy = vi
      .spyOn(fsPromises, 'unlink')
      .mockImplementation((async () => {
        const e = new Error('EBUSY') as NodeJS.ErrnoException;
        e.code = 'EBUSY';
        throw e;
      }) as typeof fsPromises.unlink);

    try {
      const key = 'tenant-1/cleanup-incomplete' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
      const ok = new Uint8Array([1, 2, 3, 4, 5]);
      await expect(
        adapter.write({
          storageKey: key,
          contentType: 'application/octet-stream',
          body: failingAfter(ok),
        }),
      ).rejects.toMatchObject({ reason: 'STORAGE_UNAVAILABLE' });
      // The partial file MUST still exist on disk; the adapter does
      // not pretend cleanup succeeded when the filesystem rejected it.
      const { existsSync } = await import('node:fs');
      expect(existsSync(join(tempDir, 'tenant-1', 'cleanup-incomplete'))).toBe(true);
    } finally {
      unlinkSpy.mockRestore();
    }
  });

  it('close failure leaves the file on disk (the adapter never claims success)', async () => {
    const realOpen = fsPromises.open;
    const spy = vi
      .spyOn(fsPromises, 'open')
      .mockImplementation((async (...args: unknown[]) => {
        const handle = await (realOpen as unknown as (...a: unknown[]) => Promise<{
          write: (...a: unknown[]) => Promise<{ bytesWritten: number; buffer: Uint8Array }>;
          close: () => Promise<void>;
          read: (...a: unknown[]) => Promise<{ bytesRead: number; buffer: Uint8Array }>;
        }>)(...args);
        (handle as unknown as { close: () => Promise<void> }).close = (async () => {
          const e = new Error('EBADF') as NodeJS.ErrnoException;
          e.code = 'EBADF';
          throw e;
        });
        return handle;
      }) as typeof realOpen);

    try {
      const key = 'tenant-1/close-fail-disk' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
      const payload = new Uint8Array([0xAA, 0xBB, 0xCC]);
      await expect(
        adapter.write({
          storageKey: key,
          contentType: 'application/octet-stream',
          body: bytes(payload),
        }),
      ).rejects.toMatchObject({ reason: 'STORAGE_UNAVAILABLE' });
      const { existsSync } = await import('node:fs');
      expect(existsSync(join(tempDir, 'tenant-1', 'close-fail-disk'))).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  it('happy-path cleanup: closes the handle before unlinking on stream failure', async () => {
    const key = 'tenant-1/partial-fail' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    const ok = new Uint8Array([1, 2, 3, 4, 5]);
    await expect(
      adapter.write({
        storageKey: key,
        contentType: 'application/octet-stream',
        body: failingAfter(ok),
      }),
    ).rejects.toMatchObject({
      reason: 'STREAM_FAILURE',
    });

    const { existsSync } = await import('node:fs');
    expect(existsSync(join(tempDir, 'tenant-1', 'partial-fail'))).toBe(false);
    await expect(
      adapter.exists(
        'tenant-1/partial-fail' as unknown as Parameters<typeof adapter.write>[0]['storageKey'],
      ),
    ).resolves.toBe(false);

    const replacement = new Uint8Array([0xAA, 0xBB]);
    await adapter.write({
      storageKey: key,
      contentType: 'application/octet-stream',
      body: bytes(replacement),
    });
    const s = await adapter.stat(key);
    expect(s.sizeBytes).toBe(replacement.byteLength);
  });
});

describe('LocalVpsEvidenceStorageAdapter — error surface safety (round 3 sanitization)', () => {
  let tempDir: string;
  let adapter: ReturnType<typeof makeLocalVpsEvidenceStorageAdapter>;
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'er002-sanitize-'));
    adapter = makeLocalVpsEvidenceStorageAdapter(
      { HRP_EVIDENCE_ROOT: tempDir },
      defaultEvidencePathResolver,
    );
  });
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // T0 round-3 directive: the adapter MUST NOT copy message/cause from
  // the byte source's errors — including typed EvidenceStorageError
  // instances — into the surfaced error. Standard safe messages only.

  it('byte source throws EvidenceStorageError with sentinel payload; surfaced error omits sentinel', async () => {
    const sentinel = '/SENTINEL/ABS/PATH/LEAKED-via-message';
    const key = 'tenant-1/sanitize-1' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    let captured: EvidenceStorageError | null = null;
    try {
      await adapter.write({
        storageKey: key,
        contentType: 'application/octet-stream',
        body: (async function* (): AsyncIterable<Uint8Array> {
          yield new Uint8Array([1]);
          // Throwing an EvidenceStorageError from the source MUST NOT
          // propagate the source's message verbatim into the surfaced
          // error. Only the reason (mapped to a narrow whitelist) and
          // the request's storageKey are surfaced; the message is
          // replaced with a fixed safe constant.
          throw new EvidenceStorageError('STREAM_FAILURE', sentinel, null);
        })(),
      });
      throw new Error('expected throw');
    } catch (err) {
      captured = err as EvidenceStorageError;
    }
    expect(captured).toBeInstanceOf(EvidenceStorageError);
    expect(captured!.reason).toBe('STREAM_FAILURE');
    expect(captured!.storageKey).toBe(key);
    expect(captured!.message.includes('SENTINEL')).toBe(false);
    expect(captured!.message.includes('LEAKED')).toBe(false);
    expect(captured!.message.includes('ABS')).toBe(false);
  });

  it('byte source throws plain Error with sentinel PII; surfaced error omits sentinel', async () => {
    const sentinel = 'SECRET-PII-123-456-789';
    const key = 'tenant-1/sanitize-2' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    let captured: EvidenceStorageError | null = null;
    try {
      await adapter.write({
        storageKey: key,
        contentType: 'application/octet-stream',
        body: (async function* (): AsyncIterable<Uint8Array> {
          yield new Uint8Array([1]);
          throw new Error(`source failure with ${sentinel} embedded`);
        })(),
      });
      throw new Error('expected throw');
    } catch (err) {
      captured = err as EvidenceStorageError;
    }
    expect(captured).toBeInstanceOf(EvidenceStorageError);
    expect(captured!.reason).toBe('STREAM_FAILURE');
    expect(captured!.storageKey).toBe(key);
    expect(captured!.message.includes(sentinel)).toBe(false);
    expect(captured!.message.includes('SECRET-PII')).toBe(false);
    expect(captured!.message.includes(tempDir)).toBe(false);
  });

  it('byte source throws raw Node errno; surfaced error uses safe-message whitelist', async () => {
    const key = 'tenant-1/sanitize-3' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    let captured: EvidenceStorageError | null = null;
    try {
      await adapter.write({
        storageKey: key,
        contentType: 'application/octet-stream',
        body: (async function* (): AsyncIterable<Uint8Array> {
          yield new Uint8Array([1]);
          const e = new Error('ENOSPC raw message /sensitive/blob') as NodeJS.ErrnoException;
          e.code = 'ENOSPC';
          throw e;
        })(),
      });
      throw new Error('expected throw');
    } catch (err) {
      captured = err as EvidenceStorageError;
    }
    expect(captured).toBeInstanceOf(EvidenceStorageError);
    // ENOSPC is a known storage errno so it maps to STORAGE_UNAVAILABLE
    // via the reason whitelist.
    expect(captured!.reason).toBe('STORAGE_UNAVAILABLE');
    expect(captured!.storageKey).toBe(key);
    expect(captured!.message.includes('ENOSPC')).toBe(false);
    expect(captured!.message.includes('sensitive')).toBe(false);
    expect(captured!.message.includes('raw message')).toBe(false);
    expect(captured!.message.includes(tempDir)).toBe(false);
  });

  it('error messages never include the absolute root path on missing-object reads', async () => {
    const key = 'trigger/notfound' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    let captured: Error | null = null;
    try {
      await adapter.read(key);
    } catch (err) {
      captured = err as Error;
    }
    expect(captured).toBeInstanceOf(EvidenceStorageError);
    expect((captured as Error).message.includes(tempDir)).toBe(false);
  });
});
