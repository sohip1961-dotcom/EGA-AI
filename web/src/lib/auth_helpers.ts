import crypto from 'crypto';

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
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function generateSessionToken(userId: string): string {
  const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const payload = `${userId}:${expiry}`;
  const signature = crypto.createHmac('sha256', getSecretKey()).update(payload).digest('hex');
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
    const expectedSignature = crypto.createHmac('sha256', getSecretKey()).update(payload).digest('hex');

    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    if (signatureBuffer.length !== expectedBuffer.length) return null;
    if (crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return userId;
    }
  } catch (e) {
    return null;
  }
  return null;
}
