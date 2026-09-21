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
