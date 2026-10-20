import { describe, expect, it } from 'vitest';
import { decryptEtrustCredential, encryptEtrustCredential } from './etrust-credential-vault';

const env = { ETRUST_CREDENTIALS_ENCRYPTION_KEY: 'ab'.repeat(32) };

describe('ETrust credential vault', () => {
  it('encrypts credentials at rest and decrypts them only with the configured key', () => {
    const ciphertext = encryptEtrustCredential('synthetic-credential', env);
    expect(ciphertext).not.toContain('synthetic-credential');
    expect(decryptEtrustCredential(ciphertext, env)).toBe('synthetic-credential');
    expect(() => decryptEtrustCredential(ciphertext, { ETRUST_CREDENTIALS_ENCRYPTION_KEY: 'cd'.repeat(32) })).toThrow();
  });
});
