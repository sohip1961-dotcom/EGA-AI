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

// PBKDF2-HMAC-SHA256. 100k iterations (Cloudflare Workers WebCrypto cap),
// 16-byte random salt. Stored as: pbkdf2$<iterations>$<saltB64>$<hashB64>
// Legacy unsalted sha256 hashes are still verified (and upgraded) in verifyPassword.
const PBKDF2_ITERATIONS = 100000;

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key, 256
  );
  return new Uint8Array(bits);
}

export async function hashPasswordSecure(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${Buffer.from(salt).toString('base64')}$${Buffer.from(hash).toString('base64')}`;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Verifies against both formats. Returns needsRehash=true for valid legacy hashes
// so callers can transparently upgrade the stored hash.
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!storedHash) return { valid: false, needsRehash: false };

  if (storedHash.startsWith('pbkdf2$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 4) return { valid: false, needsRehash: false };
    const iterations = parseInt(parts[1], 10);
    if (!Number.isFinite(iterations) || iterations < 1 || iterations > 1000000) {
      return { valid: false, needsRehash: false };
    }
    const salt = new Uint8Array(Buffer.from(parts[2], 'base64'));
    const hash = await pbkdf2(password, salt, iterations);
    const valid = timingSafeEqualStr(Buffer.from(hash).toString('base64'), parts[3]);
    return { valid, needsRehash: valid && iterations !== PBKDF2_ITERATIONS };
  }

  const valid = timingSafeEqualStr(sha256(password), storedHash);
  return { valid, needsRehash: valid };
}

export function generateOtp(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (100000 + (buf[0] % 900000)).toString();
}

export const OTP_TTL_MS = 10 * 60 * 1000;

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

