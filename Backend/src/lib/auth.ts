import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function hashPassword(password: string): Promise<string> {
  // Try native Bun.password if available, fallback to bcryptjs
  try {
    if (typeof Bun !== 'undefined' && Bun.password) {
      return await Bun.password.hash(password, {
        algorithm: 'bcrypt',
        cost: 10,
      });
    }
  } catch {
    // fallback
  }
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    if (typeof Bun !== 'undefined' && Bun.password) {
      return await Bun.password.verify(password, hash);
    }
  } catch {
    // fallback
  }
  return bcrypt.compare(password, hash);
}

export function generateResetToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

