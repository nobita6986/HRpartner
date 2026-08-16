/**
 * Password helpers — bcryptjs (pure JS, DEC-06 — tránh native build Windows/Vercel).
 * Khớp ADR-007 (argon2/bcrypt) + schema User.passwordHash (prisma/schema.prisma:128).
 */
import bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 10;

/** Hash mật khẩu (dùng lúc seed tạo tài khoản). */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/** So sánh mật khẩu người dùng nhập với hash lưu DB. */
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
