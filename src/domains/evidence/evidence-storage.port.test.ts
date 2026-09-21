import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  EvidenceStorageError,
  asStorageKey,
} from './evidence-storage.port';

/**
 * evidence-storage.port.test.ts — Unit + type-contract + boundary tests for the
 * P0-A02 / ER-001 EvidenceStorage port.
 *
 * Boundary check (no provider imports) intentionally reads the port source
 * file as text — this is a *port-level* invariant: the port MUST NOT
 * accidentally pull in a provider runtime, since that would couple the
 * security boundary to Vercel Blob / node:fs / env reads.
 */

const PORT_PATH = join(__dirname, 'evidence-storage.port.ts');
const portSource = readFileSync(PORT_PATH, 'utf8');

/** Strip JSDoc block comments and `//` line comments from a TypeScript source string. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('EvidenceStorage port — type contract', () => {
  it('exposes the full capability surface (write/read/delete/exists/stat)', () => {
    // Structural assertion: the port must declare the exact capability names
    // by string — this protects against silent surface shrinkage during
    // refactors.
    expect(portSource).toContain('write(');
    expect(portSource).toContain('read(');
    expect(portSource).toContain('delete(');
    expect(portSource).toContain('exists(');
    expect(portSource).toContain('stat(');
  });

  it('declares streaming read contract (AsyncIterable<Uint8Array>)', () => {
    expect(portSource).toContain('AsyncIterable<Uint8Array>');
    // Reads must NOT return Buffer / NodeJS.ReadableStream / string.
    expect(portSource).not.toMatch(/read\([^)]*\)\s*:\s*Promise<Buffer/);
    expect(portSource).not.toMatch(/read\([^)]*\)\s*:\s*Promise<string>/);
  });

  it('does not declare gateway/adapter concerns (no EvidenceRecord, audit, RBAC, signed URL)', () => {
    // These intentionally live in higher slices (ER-003, ER-005+).
    // Strip comments before scanning so doc-only mentions don't trigger.
    const codeOnly = stripComments(portSource);
    expect(codeOnly).not.toMatch(/class\s+EvidenceRecord\b/);
    expect(codeOnly).not.toMatch(/interface\s+EvidenceRecord\b/);
    expect(codeOnly).not.toMatch(/signedUrl|signed_url/i);
    expect(codeOnly).not.toMatch(/quarantine/i);
    expect(codeOnly).not.toMatch(/retention/i);
    expect(codeOnly).not.toMatch(/encrypt/i);
    expect(codeOnly).not.toMatch(/versioning/i);
  });
});

describe('EvidenceStorage port — boundary (no provider/runtime coupling)', () => {
  it('does not import node:fs, node:path, or @vercel/blob', () => {
    // Strip JSDoc/comments by removing `/* ... */` and `// ...` lines.
    const codeOnly = portSource
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    expect(codeOnly).not.toMatch(/from\s+['"]node:fs['"]/);
    expect(codeOnly).not.toMatch(/from\s+['"]node:path['"]/);
    expect(codeOnly).not.toMatch(/from\s+['"]@vercel\/blob['"]/);
    expect(codeOnly).not.toMatch(/require\(['"]node:fs['"]\)/);
    expect(codeOnly).not.toMatch(/require\(['"]node:path['"]\)/);
    expect(codeOnly).not.toMatch(/require\(['"]@vercel\/blob['"]\)/);
  });

  it('does not read process.env anywhere in the port surface', () => {
    const codeOnly = portSource
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    expect(codeOnly).not.toMatch(/\bprocess\.env\b/);
  });

  it('does not name Buffer as a runtime type (Uint8Array is the wire type)', () => {
    const codeOnly = portSource
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    // Buffer must not appear as a type or runtime value in the port code.
    expect(codeOnly).not.toMatch(/:\s*Buffer\b/);
    expect(codeOnly).not.toMatch(/<Buffer>/);
    expect(codeOnly).not.toMatch(/new\s+Buffer\(/);
  });
});

describe('asStorageKey — port boundary guard', () => {
  it('accepts opaque logical keys', () => {
    expect(asStorageKey('labor-profile/abc123/evidence-1')).toBe(
      'labor-profile/abc123/evidence-1',
    );
    expect(asStorageKey('tenant-7/2026-09-21/xyz')).toBe(
      'tenant-7/2026-09-21/xyz',
    );
  });

  it('rejects empty / whitespace-only keys', () => {
    expect(() => asStorageKey('')).toThrow(EvidenceStorageError);
    expect(() => asStorageKey('   ')).toThrow(EvidenceStorageError);
    expect(() => asStorageKey(' leading')).toThrow(EvidenceStorageError);
    expect(() => asStorageKey('trailing ')).toThrow(EvidenceStorageError);
  });

  it('rejects absolute POSIX paths', () => {
    expect(() => asStorageKey('/etc/passwd')).toThrow(/absolute filesystem path/);
    expect(() => asStorageKey('/srv/hrp/evidence/file')).toThrow(/absolute filesystem path/);
  });

  it('rejects absolute Windows paths', () => {
    expect(() => asStorageKey('C:\\Windows\\System32')).toThrow(/absolute filesystem path/);
    expect(() => asStorageKey('D:/sensitive/file')).toThrow(/absolute filesystem path/);
    expect(() => asStorageKey('\\\\server\\share')).toThrow(/absolute filesystem path/);
  });
  it('rejects URL-shaped values (no public URL leakage at the port boundary)', () => {
    expect(() => asStorageKey('https://example.com/file.png')).toThrow(/URL/);
    expect(() => asStorageKey('http://internal/evidence/x')).toThrow(/URL/);
    expect(() => asStorageKey('file:///etc/passwd')).toThrow(/URL/);
    expect(() => asStorageKey('blob:abc-123')).toThrow(/URL/);
    expect(() => asStorageKey('ftp://server/x')).toThrow(/URL/);
  });

  it('rejects with INVALID_KEY reason on the thrown EvidenceStorageError', () => {
    try {
      asStorageKey('/abs/path');
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(EvidenceStorageError);
      expect((err as EvidenceStorageError).reason).toBe('INVALID_KEY');
      expect((err as EvidenceStorageError).storageKey).toBeNull();
    }
  });
});

describe('EvidenceStorageError — typed error surface', () => {
  it('exposes a typed reason enum that callers can switch on', () => {
    const cases: Array<{
      reason: 'NOT_FOUND' | 'ALREADY_EXISTS' | 'INVALID_KEY' | 'PERMISSION_DENIED' | 'STORAGE_UNAVAILABLE' | 'STREAM_FAILURE' | 'INVALID_REQUEST';
    }> = [
      { reason: 'NOT_FOUND' },
      { reason: 'ALREADY_EXISTS' },
      { reason: 'INVALID_KEY' },
      { reason: 'PERMISSION_DENIED' },
      { reason: 'STORAGE_UNAVAILABLE' },
      { reason: 'STREAM_FAILURE' },
      { reason: 'INVALID_REQUEST' },
    ];
    for (const { reason } of cases) {
      const err = new EvidenceStorageError(reason, `synthetic ${reason}`);
      expect(err).toBeInstanceOf(Error);
      expect(err.reason).toBe(reason);
      expect(err.storageKey).toBeNull();
    }
  });

  it('echoes the offending storageKey on construction when provided', () => {
    const key = asStorageKey('synthetic/key-1');
    const err = new EvidenceStorageError('NOT_FOUND', 'missing', key);
    expect(err.storageKey).toBe(key);
  });
});

describe('EvidenceStorage port — synthetic test double contract', () => {
  /**
   * This block intentionally does NOT add a production in-memory fallback.
   * Per TASK §Contract tối thiểu, a test double is allowed ONLY in test
   * code. The double below lives in this test file and is consumed by
   * other tests (none required at P0-A02, but the contract is asserted
   * statically so future tests know what shape to use).
   *
   * What we DO assert here:
   *   - A double that implements `EvidenceStorage` can satisfy the contract
   *     using ONLY the public interface + `Uint8Array` + `AsyncIterable`.
   *   - No real provider, no Buffer, no env, no FS access.
   */

  function syntheticDouble(): import('./evidence-storage.port').EvidenceStorage {
    const store = new Map<string, { contentType: string; chunks: Uint8Array[] }>();

    async function collect(source: AsyncIterable<Uint8Array>): Promise<Uint8Array[]> {
      const chunks: Uint8Array[] = [];
      for await (const chunk of source) chunks.push(chunk);
      return chunks;
    }

    return {
      async write(request) {
        const chunks = await collect(request.body);
        if (store.has(request.storageKey)) {
          throw new EvidenceStorageError(
            'ALREADY_EXISTS',
            `key ${request.storageKey} already exists`,
            request.storageKey,
          );
        }
        store.set(request.storageKey, { contentType: request.contentType, chunks });
        const size = chunks.reduce((acc, c) => acc + c.byteLength, 0);
        return { storageKey: request.storageKey, sizeBytes: size, etag: 'synthetic-1' };
      },
      async read(storageKey) {
        const row = store.get(storageKey);
        if (!row) {
          throw new EvidenceStorageError('NOT_FOUND', `missing ${storageKey}`, storageKey);
        }
        // Defensive copy so the caller draining the iterable cannot mutate
        // the store. The chunks are already Uint8Array.
        return (async function* () {
          for (const chunk of row.chunks) yield chunk;
        })();
      },
      async delete(storageKey) {
        if (!store.has(storageKey)) {
          throw new EvidenceStorageError('NOT_FOUND', `missing ${storageKey}`, storageKey);
        }
        store.delete(storageKey);
      },
      async exists(storageKey) {
        return store.has(storageKey);
      },
      async stat(storageKey) {
        const row = store.get(storageKey);
        if (!row) {
          throw new EvidenceStorageError('NOT_FOUND', `missing ${storageKey}`, storageKey);
        }
        const size = row.chunks.reduce((acc, c) => acc + c.byteLength, 0);
        return {
          storageKey,
          contentType: row.contentType,
          sizeBytes: size,
          etag: 'synthetic-1',
          lastModified: null,
        };
      },
    };
  }

  it('a synthetic Uint8Array/AsyncIterable double satisfies the port surface', async () => {
    const storage = syntheticDouble();
    const key = asStorageKey('synthetic/evidence-1');

    // Synthetic bytes only — no PII, no real CCCD content.
    const payload = new TextEncoder().encode('synthetic-bytes-1234');
    const written = await storage.write({
      storageKey: key,
      contentType: 'application/octet-stream',
      body: (async function* () {
        yield payload;
      })(),
    });
    expect(written.storageKey).toBe(key);
    expect(written.sizeBytes).toBe(payload.byteLength);

    expect(await storage.exists(key)).toBe(true);

    const stat = await storage.stat(key);
    expect(stat.sizeBytes).toBe(payload.byteLength);
    expect(stat.contentType).toBe('application/octet-stream');

    const drained: number[] = [];
    for await (const chunk of await storage.read(key)) {
      for (const b of chunk) drained.push(b);
    }
    expect(new TextDecoder().decode(new Uint8Array(drained))).toBe('synthetic-bytes-1234');

    await storage.delete(key);
    expect(await storage.exists(key)).toBe(false);
  });

  it('write refuses duplicate key (no silent overwrite)', async () => {
    const storage = syntheticDouble();
    const key = asStorageKey('synthetic/dup');
    const mkBody = () =>
      (async function* () {
        yield new Uint8Array([1, 2, 3]);
      })();

    await storage.write({ storageKey: key, contentType: 'application/octet-stream', body: mkBody() });
    await expect(
      storage.write({ storageKey: key, contentType: 'application/octet-stream', body: mkBody() }),
    ).rejects.toMatchObject({ reason: 'ALREADY_EXISTS' });
  });

  it('read/stat/delete throw NOT_FOUND for missing keys', async () => {
    const storage = syntheticDouble();
    const key = asStorageKey('synthetic/missing');

    const existsSpy = vi.fn().mockImplementation(() => storage.exists(key));
    expect(await existsSpy()).toBe(false);

    await expect(storage.read(key)).rejects.toMatchObject({ reason: 'NOT_FOUND' });
    await expect(storage.stat(key)).rejects.toMatchObject({ reason: 'NOT_FOUND' });
    await expect(storage.delete(key)).rejects.toMatchObject({ reason: 'NOT_FOUND' });
  });
});
