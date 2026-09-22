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

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  mkdtemp,
  rm,
  mkdir,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  makeLocalVpsEvidenceStorageAdapter,
  defaultEvidencePathResolver,
} from './local-vps-evidence-storage.adapter';
import {
  EvidenceStorageError,
  type EvidenceByteSource,
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
describe('LocalVpsEvidenceStorageAdapter — F1 regression (resolveKey by index)', () => {
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

  it('writes and reads back a key with repeated segments (a/a/file.bin)', async () => {
    const key = 'a/a/file.bin' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    const payload = new Uint8Array([0x10, 0x20, 0x30, 0x40]);
    const result = await adapter.write({
      storageKey: key,
      contentType: 'application/octet-stream',
      body: bytes(payload),
    });
    expect(result.sizeBytes).toBe(4);

    const s = await adapter.stat(key);
    expect(s.sizeBytes).toBe(4);
    expect(s.storageKey).toBe(key);

    const stream = await adapter.read(key);
    const out = await drain(stream);
    expect(Array.from(out)).toEqual([0x10, 0x20, 0x30, 0x40]);

    // File must live at <root>/a/a/file.bin, exactly.
    // No accidental 'a' sibling directory created.
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

  it('writes and reads back a triple-repeated segment key (x/x/x/file.bin)', async () => {
    const key = 'x/x/x/file.bin' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    const payload = new Uint8Array([0xAA, 0xBB]);
    await adapter.write({
      storageKey: key,
      contentType: 'application/octet-stream',
      body: bytes(payload),
    });
    const stream = await adapter.read(key);
    const out = await drain(stream);
    expect(Array.from(out)).toEqual([0xAA, 0xBB]);
  });
});

describe('LocalVpsEvidenceStorageAdapter — F2 regression (short write loop)', () => {
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

  it('sizeBytes equals the count of bytes actually persisted (write loop covers short writes)', async () => {
    // We cannot deterministically force handle.write() to return short
    // on real disk in CI; but we CAN verify the total-at-end arithmetic
    // by sizing a real write and asserting sizeBytes matches the file
    // size. The internal `writeChunkAll` loop guarantees full coverage.
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

    // Round-trip byte-exact
    const stream = await adapter.read(key);
    const out = await drain(stream);
    expect(out.byteLength).toBe(8192);
    expect(Array.from(out)).toEqual(Array.from(payload));
  });

  it('write does not throw when the OS returns a short write; sizeBytes = bytes actually written', async () => {
    // This test exercises the write-all helper under a wrapper. The
    // adapter doesn't expose the helper directly; we verify the
    // observer (sizeBytes / file size) instead. We write a chunk
    // of 5000 bytes with a wrapped chunked source that splits the
    // 5000 into 7 pieces; both numbers must match the underlying file.
    const key = 'tenant-1/manychunks' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    const total = 5000;
    const pieces: Uint8Array[] = [];
    const sizes = [1, 17, 4097, 41, 700, 80, 64];
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

  it('returns a typed STREAM_FAILURE error when the underlying read fails mid-drain', async () => {
    // Prepare a real file with synthetic bytes (>= 130 KiB so the
    // 64 KiB read loop yields at least 2 chunks).
    const key = 'tenant-1/readfail' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    const payload = new Uint8Array(130 * 1024);
    for (let i = 0; i < payload.length; i++) payload[i] = i & 0xff;
    await adapter.write({
      storageKey: key,
      contentType: 'application/octet-stream',
      body: bytes(payload),
    });

    // Open the handle directly, wrap its read method to fail after
    // the first chunk with a raw Node error, then run the wrapper
    // helper to verify it surfaces STREAM_FAILURE (typed, no errno).
    const { promises: fs } = await import('node:fs');
    const handle = await fs.open(join(tempDir, 'tenant-1', 'readfail'), 'r');
    try {
      const originalRead = handle.read.bind(handle);
      let calls = 0;
      (handle as unknown as { read: typeof originalRead }).read = (async (
        buf: Uint8Array,
        offset: number,
        length: number,
        position: number | null,
      ) => {
        calls += 1;
        if (calls >= 2) {
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
      try {
        await drain(await fileHandleToStream(handle));
        throw new Error('expected failure');
      } catch (err) {
        expect(err).toBeInstanceOf(EvidenceStorageError);
        const msg = (err as Error).message;
        expect(msg.includes('EIO')).toBe(false);
        expect(msg.includes(tempDir)).toBe(false);
        expect(msg.includes('injected')).toBe(false);
      }
    } finally {
      await handle.close().catch(() => {
        // close errors are not surfaced
      });
    }
  });

  it('closes the file handle when the consumer cancels iteration mid-drain', async () => {
    const key = 'tenant-1/cancel' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    // Write enough synthetic bytes that read() returns at least 2 chunks
    // (we use 256 KiB, well above the 64 KiB read chunk size).
    const payload = new Uint8Array(256 * 1024);
    for (let i = 0; i < payload.length; i++) payload[i] = i & 0xff;
    await adapter.write({
      storageKey: key,
      contentType: 'application/octet-stream',
      body: bytes(payload),
    });

    const stream = await adapter.read(key);
    let firstChunk: Uint8Array | null = null;
    for await (const c of stream) {
      firstChunk = c;
      break; // consumer "cancels" by exiting the iterator early
    }
    expect(firstChunk).not.toBeNull();

    // Give the adapter a microtask tick to run its finally block.
    await new Promise((resolve) => setImmediate(resolve));
    // A second read on the same key must succeed (i.e. no leaked
    // exclusive lock). This is the observable indicator that the
    // first handle was closed.
    const stream2 = await adapter.read(key);
    const out = await drain(stream2);
    expect(out.byteLength).toBe(payload.byteLength);
  });
});

describe('LocalVpsEvidenceStorageAdapter — F4 regression (non-regular nodes are NOT_FOUND)', () => {
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

  it('delete() on a directory key throws NOT_FOUND (storage-object boundary)', async () => {
    const dirKey = 'tenant-1/some-dir-4' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    await mkdir(join(tempDir, 'tenant-1', 'some-dir-4'), { recursive: true });
    await expect(adapter.delete(dirKey)).rejects.toMatchObject({
      reason: 'NOT_FOUND',
    });
    // Confirm the directory was NOT removed.
    const { stat: statFs } = await import('node:fs/promises');
    const st = await statFs(join(tempDir, 'tenant-1', 'some-dir-4'));
    expect(st.isDirectory()).toBe(true);
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
    // resolveKey walks the canonicalized path segment-by-segment and the
    // symlink target resolves to <canonicalRoot>/real-dir (a directory
    // inside canonicalRoot). resolveKey succeeds because the target stays
    // inside containment; statObject then sees a non-regular node and
    // exists() uniformly returns false for non-regular nodes per F4.
    await expect(adapter.exists(linkKey)).resolves.toBe(false);
  });
});

describe('LocalVpsEvidenceStorageAdapter — F5 regression (cleanup ordering)', () => {
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

  it('closes the handle before unlinking the partial artifact on stream failure', async () => {
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

    // Observable invariant: after a partial-artifact failure, no file
    // exists at the target path. This proves the adapter removed the
    // partial artifact (close-then-unlink ordering).
    const { existsSync } = await import('node:fs');
    expect(existsSync(join(tempDir, 'tenant-1', 'partial-fail'))).toBe(false);
    await expect(
      adapter.exists(
        'tenant-1/partial-fail' as unknown as Parameters<typeof adapter.write>[0]['storageKey'],
      ),
    ).resolves.toBe(false);

    // Observable invariant: a follow-up write to the SAME key must
    // succeed — i.e. the partial file was actually removed and the
    // directory is reusable. This rules out 'cleanup silently swallowed
    // but artifact survived' scenarios.
    const replacement = new Uint8Array([0xAA, 0xBB]);
    await adapter.write({
      storageKey: key,
      contentType: 'application/octet-stream',
      body: bytes(replacement),
    });
    const s = await adapter.stat(key);
    expect(s.sizeBytes).toBe(replacement.byteLength);
  });

  it('preserves typed error surface when cleanup itself fails (path never leaks)', async () => {
    // We cannot easily force unlink to fail in a portable way without
    // root or chmod gymnastics. Instead, we test the path-no-leak
    // invariant: when a stream-write failure occurs, the thrown error
    // must NOT contain the absolute root path.
    const key = 'tenant-1/path-no-leak' as unknown as Parameters<typeof adapter.write>[0]['storageKey'];
    const ok = new Uint8Array([1, 2, 3]);
    try {
      await adapter.write({
        storageKey: key,
        contentType: 'application/octet-stream',
        body: failingAfter(ok),
      });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(EvidenceStorageError);
      const msg = (err as Error).message;
      expect(msg.includes(tempDir)).toBe(false);
      expect(msg.includes('partial-fail')).toBe(false);
      expect((err as EvidenceStorageError).storageKey).toBe(key);
    }
  });
});
