import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { setEncryptionKey } from './set-production-env-key.mjs';

test('updates only the encryption key and replaces duplicate entries', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hrp-env-'));
  const file = join(dir, 'production.env');
  try {
    writeFileSync(file, 'DATABASE_URL=keep\nETRUST_CREDENTIALS_ENCRYPTION_KEY=old\nETRUST_CREDENTIALS_ENCRYPTION_KEY=duplicate\n');
    setEncryptionKey(file, 'a'.repeat(64));
    assert.equal(readFileSync(file, 'utf8'), `DATABASE_URL=keep\nETRUST_CREDENTIALS_ENCRYPTION_KEY=${'a'.repeat(64)}\n`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('rejects a key that is not 32 bytes in hex', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hrp-env-'));
  const file = join(dir, 'production.env');
  try {
    writeFileSync(file, 'DATABASE_URL=keep\n');
    assert.throws(() => setEncryptionKey(file, 'not-a-key'), /64 hex characters/);
    assert.equal(readFileSync(file, 'utf8'), 'DATABASE_URL=keep\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
