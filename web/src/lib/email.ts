const TEMPLATES = {
  register: {
    subject: 'رمز التحقق الخاص بك - EGS AI',
    heading: 'مرحباً بك في EGS AI',
    intro: 'عزيزنا الطالب، شكراً لتسجيلك في منصة EGS AI لمساعدتك الذكي في المذاكرة.',
    label: 'رمز التحقق (OTP) الخاص بك هو:'
  },
  reset: {
    subject: 'رمز تغيير كلمة المرور - EGS AI',
    heading: 'تغيير كلمة المرور',
    intro: 'استلمنا طلباً لتغيير كلمة المرور الخاصة بحسابك. إذا لم تكن أنت من طلب ذلك، تجاهل هذه الرسالة.',
    label: 'رمز التحقق لتغيير كلمة المرور هو:'
  },
  delete_account: {
    subject: 'رمز تأكيد حذف الحساب نهائياً - EGS AI',
    heading: 'تأكيد حذف الحساب نهائياً',
    intro: 'استلمنا طلباً لحذف حسابك وكافة بياناتك من منصة EGS AI. تنبيه: عملية حذف الحساب نهائية وفورية ولا يمكن التراجع عنها، وسيتم إلغاء أي اشتراكات سارية وحذف كافة سجلاتك فوراً.',
    label: 'رمز التحقق (OTP) لتأكيد الحذف النهائي هو:'
  }
} as const;

export async function sendOtpEmail(
  to: string,
  otp: string,
  purpose: keyof typeof TEMPLATES
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'خدمة البريد الإلكتروني غير مهيأة' };
  }
  const from = process.env.RESEND_FROM_EMAIL || 'no-reply@egsaiedu.com';
  const t = TEMPLATES[purpose];

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: `EGS AI <${from}>`,
        to: to.trim(),
        subject: t.subject,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; text-align: right;">
            <h2 style="color: #C1272D; text-align: center;">${t.heading}</h2>
            <p>${t.intro}</p>
            <p style="font-size: 1.1rem; font-weight: bold;">${t.label}</p>
            <div style="background: #FAF5F5; padding: 15px; text-align: center; font-size: 2rem; font-weight: bold; letter-spacing: 5px; color: #C1272D; border-radius: 6px; margin: 20px 0; border: 1px solid #F3E0E0;">
              ${otp}
            </div>
            <p style="font-size: 0.9rem; color: #666;">ملاحظة: هذا الرمز صالح لمدة 10 دقائق ولاستخدام واحد فقط.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 0.8rem; color: #999; text-align: center;">تم الإرسال بواسطة منصة EGS AI التعليمية</p>
          </div>
        `
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('Resend API response error:', errData);
      return { ok: false, error: errData.message || 'فشل في إرسال البريد الإلكتروني' };
    }
    return { ok: true };
  } catch (err: any) {
    console.error('Fetch error while sending email:', err);
    return { ok: false, error: err.message };
  }
}
