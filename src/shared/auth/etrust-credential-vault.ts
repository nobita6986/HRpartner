import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

function keyFromEnv(env: Record<string, string | undefined> = process.env): Buffer {
  // shortcut: one active master key; re-encrypt the stored pair before rotating it.
  const hex = env.ETRUST_CREDENTIALS_ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-f]{64}$/i.test(hex)) throw new Error('ETRUST_CREDENTIALS_ENCRYPTION_KEY is not configured');
  return Buffer.from(hkdfSync('sha256', Buffer.from(hex, 'hex'), Buffer.alloc(0), 'hrp:etrust-credentials:v1', 32));
}

export function encryptEtrustCredential(value: string, env?: Record<string, string | undefined>): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFromEnv(env), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptEtrustCredential(value: string, env?: Record<string, string | undefined>): string {
  const [ivText, tagText, ciphertextText] = value.split('.');
  if (!ivText || !tagText || !ciphertextText) throw new Error('Invalid encrypted ETrust credential');
  const decipher = createDecipheriv('aes-256-gcm', keyFromEnv(env), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, 'base64url')), decipher.final()]).toString('utf8');
}
