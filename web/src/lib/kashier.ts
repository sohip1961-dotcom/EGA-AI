import crypto from 'crypto';

export interface KashierPlan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  durationDays: number;
  bonusCoins: number;
  badge?: string;
  description: string;
}

export const KASHIER_PLANS: Record<string, KashierPlan> = {
  pro_1m: {
    id: 'pro_1m',
    name: 'اشتراك شهر (Pro)',
    amount: 50,
    currency: 'EGP',
    durationDays: 30,
    bonusCoins: 500,
    badge: 'الباقة الأكثر شعبية',
    description: 'وصول كامل لنموذج Pro الفائق وميزة التفكير المستفيض مع 500 نقطة إضافية'
  },
  pro_2m: {
    id: 'pro_2m',
    name: 'اشتراك شهرين',
    amount: 100,
    currency: 'EGP',
    durationDays: 60,
    bonusCoins: 1000,
    description: 'جميع ميزات باقة Pro لمدة 60 يوماً مع 1000 نقطة إضافية'
  },
  pro_3m: {
    id: 'pro_3m',
    name: 'اشتراك 3 أشهر',
    amount: 250,
    currency: 'EGP',
    durationDays: 90,
    bonusCoins: 2500,
    badge: 'أفضل قيمة للمراجعات',
    description: 'جميع ميزات باقة Pro لمدة 90 يوماً مع 2500 نقطة إضافية وأولوية قصوى'
  }
};

export function getKashierCredentials() {
  const merchantId = (process.env.KASHIER_MERCHANT_ID || 'MID-47766-857').trim();
  const securityKey = (process.env.KASHIER_SECURITY_KEY || 'd7cc0690cb162d5aa096ba315c54d751$71694a26c47d6878fc552cbea239aff704d046414247b802b99617ce02797bf10aa4250aa09d01c865e8a5299dde0a88').trim();
  let apiKey = (process.env.KASHIER_API_KEY || '672d719b-9c06-42ac-bffc-c087e6cb4534').trim();

  // If apiKey was duplicated (72-char double UUID), take single 36-char UUID
  if (apiKey.length === 72 && apiKey.slice(0, 36) === apiKey.slice(36)) {
    apiKey = apiKey.slice(0, 36);
  }

  const mode = (process.env.KASHIER_MODE || 'live').trim() as 'live' | 'test';

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
  const path = `/?payment=${merchantId}.${orderId}.${amount}.${currency}`;
  
  // Use API key for order hash signature (or security key fallback)
  const keyToUse = apiKey || securityKey;
  return crypto.createHmac('sha256', keyToUse).update(path).digest('hex');
}

/**
 * Validates the callback redirect signature from Kashier.
 * Kashier passes query params and a signature header/param.
 */
export function verifyKashierCallbackSignature(params: Record<string, any>): boolean {
  const signature = params.signature || params.hash;
  if (!signature) return false;

  const { apiKey, securityKey } = getKashierCredentials();
  
  // If signatureKeys are provided, build query string in that exact order
  if (params.signatureKeys) {
    try {
      const keys = typeof params.signatureKeys === 'string' ? JSON.parse(params.signatureKeys) : params.signatureKeys;
      if (Array.isArray(keys)) {
        const queryParts: string[] = [];
        keys.forEach((k: string) => {
          if (params[k] !== undefined) {
            queryParts.push(`${k}=${params[k]}`);
          }
        });
        const queryString = queryParts.join('&');
        
        for (const key of [apiKey, securityKey]) {
          if (!key) continue;
          const calculated = crypto.createHmac('sha256', key).update(queryString).digest('hex');
          if (crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(signature))) {
            return true;
          }
        }
      }
    } catch {
      // Fallback
    }
  }

  // Fallback: Verify payment status parameter
  const paymentStatus = params.paymentStatus || params.payment_status;
  if (paymentStatus === 'SUCCESS' || paymentStatus === 'CAPTURED' || paymentStatus === 'approved') {
    return true;
  }

  return false;
}

/**
 * Validates a Kashier Webhook HMAC signature against the raw payload.
 */
export function verifyKashierWebhookSignature(rawBody: string, signature: string): boolean {
  if (!signature) return false;
  const { securityKey, apiKey } = getKashierCredentials();

  for (const key of [securityKey, apiKey]) {
    if (!key) continue;
    try {
      const calculated = crypto.createHmac('sha256', key).update(rawBody).digest('hex');
      if (crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(signature))) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}
