import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from 'node:crypto';

function encryptionKey(): Buffer {
  // shortcut: one active master key; rotate by re-encrypting stored referrals before replacing it.
  const value = process.env.HRP_PII_ENCRYPTION_KEY;
  if (!value || !/^[0-9a-f]{64}$/i.test(value)) {
    throw new Error('HRP_PII_ENCRYPTION_KEY must be configured as 32-byte hex');
  }
  return Buffer.from(value, 'hex');
}

function deriveKey(purpose: string): Buffer {
  return Buffer.from(hkdfSync('sha256', encryptionKey(), Buffer.alloc(0), `hrp-referral:${purpose}:v1`, 32));
}

export function encryptReferralValue(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey('encryption'), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
}

export function referralPhoneLookupHash(phone: string): string {
  return createHmac('sha256', deriveKey('lookup')).update(phone).digest('hex');
}

export function decryptReferralValue(value: string): string {
  const [ivText, tagText, ciphertextText] = value.split('.');
  if (!ivText || !tagText || !ciphertextText) throw new Error('Invalid encrypted referral value');
  const decipher = createDecipheriv('aes-256-gcm', deriveKey('encryption'), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
