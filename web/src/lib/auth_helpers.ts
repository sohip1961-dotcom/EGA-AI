import { sha256 } from 'js-sha256';

// JWT_SECRET must be set in the environment — no hardcoded fallback.
// A shared default would let anyone forge admin session tokens.
// Checked lazily (not at module load) so `next build` can evaluate this
// module for page-data collection without the runtime env being present yet.
function getSecretKey(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable must be set in production.');
    }
    return 'dev_only_insecure_secret_do_not_use_in_production';
  }
  return secret;
}

export function hashPassword(password: string): string {
  return sha256(password);
}

export function generateSessionToken(userId: string): string {
  const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const payload = `${userId}:${expiry}`;
  const signature = sha256.hmac(getSecretKey(), payload);
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

export function verifySessionToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;

    const [userId, expiryStr, signature] = parts;
    const expiry = parseInt(expiryStr, 10);

    if (Date.now() > expiry) return null; // Expired

    const payload = `${userId}:${expiry}`;
    const expectedSignature = sha256.hmac(getSecretKey(), payload);

    if (signature.length !== expectedSignature.length) return null;
    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    if (result === 0) {
      return userId;
    }
  } catch (e) {
    return null;
  }
  return null;
}

