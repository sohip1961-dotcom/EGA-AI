import crypto from 'crypto';

export interface KashierPlan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  durationDays: number;
  dailyCoins: number;
  bonusCoins: number;
  badge?: string;
  description: string;
}

export const KASHIER_PLANS: Record<string, KashierPlan> = {
  pro_1m: {
    id: 'pro_1m',
    name: 'باقة شهر (1 Month)',
    amount: 60,
    currency: 'EGP',
    durationDays: 30,
    dailyCoins: 80,
    bonusCoins: 80,
    badge: 'الباقة الأكثر طلباً',
    description: 'تمنحك 80 نقطة يومياً تتجدد كل 24 ساعة طوال 30 يوماً مع وصول لنموذج Pro وميزة التفكير'
  },
  pro_2m: {
    id: 'pro_2m',
    name: 'باقة شهرين (2 Months)',
    amount: 100,
    currency: 'EGP',
    durationDays: 60,
    dailyCoins: 90,
    bonusCoins: 90,
    badge: 'الباقة الأكثر شعبية',
    description: 'تمنحك 90 نقطة يومياً تتجدد كل 24 ساعة طوال 60 يوماً مع وصول لنموذج Pro وميزة التفكير'
  },
  pro_3m: {
    id: 'pro_3m',
    name: 'باقة 3 أشهر (3 Months)',
    amount: 140,
    currency: 'EGP',
    durationDays: 90,
    dailyCoins: 120,
    bonusCoins: 120,
    badge: 'أفضل قيمة وأعلى توفير',
    description: 'تمنحك 120 نقطة يومياً تتجدد كل 24 ساعة طوال 90 يوماً مع وصول لنموذج Pro وميزة التفكير'
  }
};

export function getKashierCredentials() {
  const merchantId = (process.env.KASHIER_MERCHANT_ID || process.env.NEXT_PUBLIC_KASHIER_MERCHANT_ID || '').trim();
  const securityKey = (process.env.KASHIER_SECURITY_KEY || '').trim();
  let apiKey = (process.env.KASHIER_API_KEY || '').trim();

  // If apiKey was duplicated (72-char double UUID), sanitize to single 36-char UUID
  if (apiKey.length === 72 && apiKey.slice(0, 36) === apiKey.slice(36)) {
    apiKey = apiKey.slice(0, 36);
  }

  const mode = (process.env.KASHIER_MODE || process.env.NEXT_PUBLIC_KASHIER_MODE || 'live').trim() as 'live' | 'test';

  return { merchantId, securityKey, apiKey, mode };
}

/**
 * Generates the Kashier order hash for checkout.
 * Path string format: /?payment={mid}.{orderId}.{amount}.{currency}
 */
export function generateKashierOrderHash(
  orderId: string,
  amount: number | string,
  currency: string = 'EGP'
): string {
  const { merchantId, apiKey, securityKey } = getKashierCredentials();
  const keyToUse = apiKey || securityKey;
  if (!keyToUse) {
    throw new Error('Kashier API key or security key is not configured.');
  }

  const path = `/?payment=${merchantId}.${orderId}.${amount}.${currency}`;
  return crypto.createHmac('sha256', keyToUse).update(path).digest('hex');
}

function safeTimingCompare(calculatedHex: string, providedHex: string): boolean {
  try {
    const calcBuf = Buffer.from(calculatedHex.toLowerCase(), 'hex');
    const provBuf = Buffer.from(providedHex.toLowerCase(), 'hex');
    if (calcBuf.length !== provBuf.length || calcBuf.length === 0) return false;
    return crypto.timingSafeEqual(calcBuf, provBuf);
  } catch {
    return false;
  }
}

/**
 * Validates the callback redirect signature from Kashier strictly.
 * Kashier passes query params and a signature header/param.
 */
export function verifyKashierCallbackSignature(params: Record<string, any>): boolean {
  const signature = params.signature || params.hash;
  if (!signature || typeof signature !== 'string') return false;

  const { apiKey, securityKey } = getKashierCredentials();
  const validKeys = [apiKey, securityKey].filter(Boolean);
  if (validKeys.length === 0) {
    console.error('Cannot verify Kashier signature: No Kashier keys configured.');
    return false;
  }

  // 1. If signatureKeys array is provided by Kashier gateway
  if (params.signatureKeys) {
    try {
      const keys = typeof params.signatureKeys === 'string' ? JSON.parse(params.signatureKeys) : params.signatureKeys;
      if (Array.isArray(keys) && keys.length > 0) {
        const queryParts: string[] = [];
        keys.forEach((k: string) => {
          if (params[k] !== undefined) {
            queryParts.push(`${k}=${params[k]}`);
          }
        });
        const queryString = queryParts.join('&');

        for (const key of validKeys) {
          const calculated = crypto.createHmac('sha256', key).update(queryString).digest('hex');
          if (safeTimingCompare(calculated, signature)) {
            return true;
          }
        }
      }
    } catch (e) {
      console.warn('Error parsing Kashier signatureKeys:', e);
    }
  }

  // 2. Direct query string reconstruction without signature & mode
  const ignoredKeys = new Set(['signature', 'hash', 'mode']);
  const sortedKeys = Object.keys(params).filter(k => !ignoredKeys.has(k)).sort();
  if (sortedKeys.length > 0) {
    const queryString = sortedKeys.map(k => `${k}=${params[k]}`).join('&');
    for (const key of validKeys) {
      const calculated = crypto.createHmac('sha256', key).update(queryString).digest('hex');
      if (safeTimingCompare(calculated, signature)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validates a Kashier Webhook HMAC signature against the raw payload strictly.
 */
export function verifyKashierWebhookSignature(rawBody: string, signature: string): boolean {
  if (!signature || typeof signature !== 'string' || !rawBody) return false;
  const { securityKey, apiKey } = getKashierCredentials();
  const validKeys = [securityKey, apiKey].filter(Boolean);
  if (validKeys.length === 0) {
    console.error('Cannot verify Kashier webhook: No Kashier keys configured.');
    return false;
  }

  for (const key of validKeys) {
    try {
      const calculated = crypto.createHmac('sha256', key).update(rawBody).digest('hex');
      if (safeTimingCompare(calculated, signature)) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}
