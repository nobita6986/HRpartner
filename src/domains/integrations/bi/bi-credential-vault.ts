import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
  randomInt,
} from 'node:crypto';

const BI_SYNC_HKDF_INFO = 'hrp:bi-sync-credentials:v1';
const INITIAL_PASSWORD_HKDF_INFO = 'hrp:bi-initial-credentials:v1';
const UNAMBIGUOUS_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function deriveDomainKey(
  hkdfInfo: string,
  env: Record<string, string | undefined> = process.env,
): Buffer {
  const rawSecret =
    env.BI_CREDENTIALS_ENCRYPTION_KEY?.trim() ||
    env.ETRUST_CREDENTIALS_ENCRYPTION_KEY?.trim() ||
    env.JWT_SECRET?.trim();

  if (!rawSecret) {
    throw new Error('BI_CREDENTIALS_ENCRYPTION_KEY is not configured');
  }

  const ikm = /^[0-9a-f]{64}$/i.test(rawSecret)
    ? Buffer.from(rawSecret, 'hex')
    : createHash('sha256').update(rawSecret, 'utf8').digest();

  return Buffer.from(hkdfSync('sha256', ikm, Buffer.alloc(0), hkdfInfo, 32));
}

function encryptWithInfo(
  plaintext: string,
  hkdfInfo: string,
  env?: Record<string, string | undefined>,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveDomainKey(hkdfInfo, env), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

function decryptWithInfo(
  ciphertext: string,
  hkdfInfo: string,
  env?: Record<string, string | undefined>,
): string {
  const [ivText, tagText, encryptedText] = ciphertext.split('.');
  if (!ivText || !tagText || !encryptedText) {
    throw new Error('Invalid encrypted BI credential payload');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    deriveDomainKey(hkdfInfo, env),
    Buffer.from(ivText, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function encryptBiSyncSecret(
  value: string,
  env?: Record<string, string | undefined>,
): string {
  return encryptWithInfo(value, BI_SYNC_HKDF_INFO, env);
}

export function decryptBiSyncSecret(
  value: string,
  env?: Record<string, string | undefined>,
): string {
  return decryptWithInfo(value, BI_SYNC_HKDF_INFO, env);
}

export function encryptWorkerInitialPassword(
  password: string,
  env?: Record<string, string | undefined>,
): string {
  return encryptWithInfo(password, INITIAL_PASSWORD_HKDF_INFO, env);
}

export function decryptWorkerInitialPassword(
  ciphertext: string,
  env?: Record<string, string | undefined>,
): string {
  return decryptWithInfo(ciphertext, INITIAL_PASSWORD_HKDF_INFO, env);
}

/**
 * Sinh mật khẩu ban đầu 10 ký tự rõ ràng (loại bỏ 0/O/1/l/I dễ nhầm lẫn khi gửi Zalo/tin nhắn).
 */
export function generateWorkerInitialPassword(length = 10): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += UNAMBIGUOUS_ALPHABET[randomInt(0, UNAMBIGUOUS_ALPHABET.length)];
  }
  return out;
}
