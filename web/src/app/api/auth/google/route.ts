export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSessionToken } from '@/lib/auth_helpers';

// Cryptographically verify Google ID Token signature and claims
async function verifyGoogleIdToken(token: string, clientId: string): Promise<any> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('رمز الدخول من Google غير صالح أو غير مكتمل البنية');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Helper: Decode Base64URL string
  const base64UrlDecode = (str: string) => {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    return Buffer.from(base64, 'base64');
  };

  let header: any;
  let payload: any;
  try {
    header = JSON.parse(base64UrlDecode(headerB64).toString('utf-8'));
    payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf-8'));
  } catch (err) {
    throw new Error('فشل فك تشفير وتفسير محتويات رمز الدخول');
  }

  // 1. Verify claims
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('رمز الدخول من Google منتهي الصلاحية');
  }
  if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
    throw new Error('جهة إصدار رمز الدخول غير موثوقة');
  }
  if (payload.aud !== clientId) {
    throw new Error('رمز الدخول غير مخصص لهذا التطبيق (Client ID mismatch)');
  }

  // 2. Cryptographic signature verification
  const kid = header.kid;
  if (!kid) {
    throw new Error('لم يتم العثور على معرف المفتاح (kid) في رأس الرمز');
  }

  // Fetch Google's public JWK certs
  const jwksRes = await fetch('https://www.googleapis.com/oauth2/v3/certs', {
    next: { revalidate: 3600 } // cache public certs for 1 hour
  });
  if (!jwksRes.ok) {
    throw new Error('فشل الحصول على مفاتيح Google العامة للتحقق');
  }
  const { keys } = await jwksRes.json();
  const jwk = keys.find((k: any) => k.kid === kid);
  if (!jwk) {
    throw new Error('مفتاح التحقق المطابق لمعرف الرمز غير متوفر');
  }

  // Import public key
  const algorithm = {
    name: 'RSASSA-PKCS1-v1_5',
    hash: { name: 'SHA-256' },
  };

  const publicKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    algorithm,
    false,
    ['verify']
  );

  // Reconstruct signing data and verify signature
  const encoder = new TextEncoder();
  const signingData = encoder.encode(`${headerB64}.${payloadB64}`);
  const signatureBytes = base64UrlDecode(signatureB64);

  const isValid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    signatureBytes,
    signingData
  );

  if (!isValid) {
    throw new Error('فشل التحقق الرقمي من صحة توقيع Google (Signature invalid)');
  }

  return payload;
}

export async function POST(req: NextRequest) {
  try {
    const { credential, grade_level } = await req.json();

    if (!credential) {
      return NextResponse.json({ error: 'رمز الدخول (Credential) من Google مطلوب' }, { status: 400 });
    }

    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '868945795931-v00sqknb9qsgcq7hid3t2rkps2vu1348.apps.googleusercontent.com';

    // Verify token cryptographically
    let payload: any;
    try {
      payload = await verifyGoogleIdToken(credential, googleClientId);
    } catch (verifyErr: any) {
      return NextResponse.json({ error: verifyErr.message }, { status: 400 });
    }

    const { email: jwtEmail, name: jwtName, sub } = payload;

    if (!jwtEmail) {
      return NextResponse.json({ error: 'لم يتم العثور على بريد إلكتروني في حساب Google' }, { status: 400 });
    }

    const email = jwtEmail.toLowerCase().trim();
    const name = jwtName || 'Google User';
    const googleId = sub;

    // Find profile by email
    let profile = await db.getProfileByEmail(email);

    if (!profile) {
      // If profile does not exist, they need to sign up.
      // If no grade level is provided in the request, prompt the frontend to request it.
      if (!grade_level) {
        return NextResponse.json({
          requires_grade_level: true,
          email,
          name,
          google_id: googleId
        });
      }

      // Create new user profile
      const userId = crypto.randomUUID();
      profile = await db.createProfile({
        id: userId,
        email,
        name,
        grade_level,
        plan_type: 'free',
        role: 'student',
        password_hash: '', // Google login does not use a password
        coins: 50.0,
        terms_accepted_at: new Date().toISOString()
      });
    }

    // Generate Session Token
    const token = generateSessionToken(profile.id);

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        grade_level: profile.grade_level,
        plan_type: profile.plan_type,
        role: profile.role,
        coins: profile.coins === undefined ? 50.0 : profile.coins
      }
    });

  } catch (error: any) {
    console.error('Google Login API Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تسجيل الدخول بواسطة Google.' },
      { status: 500 }
    );
  }
}
