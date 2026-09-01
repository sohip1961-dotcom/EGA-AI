'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, 
  Trash2, 
  Mail, 
  KeyRound, 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert, 
  RefreshCw,
  Info
} from 'lucide-react';

export default function DeleteAccountPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'request' | 'verify' | 'success'>('request');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // Step 1: Send OTP to email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني الخاص بالحساب.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setStatusMsg('');

    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-otp',
          email: email.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'تعذر إرسال رمز التحقق.');
      }

      setStatusMsg(data.message || 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.');
      setStep('verify');
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and delete account
  const handleVerifyAndDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setErrorMsg('يرجى إدخال رمز التحقق المكون من 6 أرقام.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setStatusMsg('');

    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify-otp',
          email: email.trim(),
          otp: otp.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل حذف الحساب. يرجى التأكد من رمز التحقق.');
      }

      // If user was logged in with this account in this browser, clean localStorage
      try {
        const storedUser = localStorage.getItem('egs_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed.email && parsed.email.toLowerCase() === email.trim().toLowerCase()) {
            localStorage.removeItem('egs_token');
            localStorage.removeItem('egs_user');
            localStorage.removeItem('egs_chat_sessions');
            localStorage.removeItem('egs_active_exam_id');
            localStorage.removeItem('egs_active_exam_time');
          }
        }
      } catch {
        // Safe ignore
      }

      setStep('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء تأكيد الحذف.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setOtp('');
    setErrorMsg('');
    setStatusMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-otp',
          email: email.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'تعذر إعادة إرسال رمز التحقق.');
      }

      setStatusMsg('تمت إعادة إرسال رمز التحقق إلى بريدك الإلكتروني.');
    } catch (err: any) {
      setErrorMsg(err.message || 'تعذر إعادة إرسال الرمز.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="standalone-page-scroll" style={{ background: 'var(--bg-color)', color: 'var(--text-main)', direction: 'rtl' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '48px 20px 80px' }}>
        
        {/* Back Link */}
        <Link 
          href="/" 
          style={{ 
            color: 'var(--primary-color)', 
            fontWeight: 700, 
            fontSize: '0.88rem', 
            textDecoration: 'none', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            marginBottom: '28px' 
          }}
        >
          <ArrowRight size={16} />
          <span>العودة إلى EGS AI</span>
        </Link>

        {/* Page Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '12px', 
              background: 'var(--primary-light)', 
              color: 'var(--primary-color)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Trash2 size={24} />
            </div>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
              طلب حذف الحساب نهائياً
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.6', margin: 0 }}>
            يمكنك من خلال هذه الصفحة تأكيد طلب الحذف الكامل والنهائي لحسابك وجميع البيانات المرتبطة به عبر التحقق من بريدك الإلكتروني دون الحاجة لتسجيل الدخول.
          </p>
        </div>

        {/* Warning Banner */}
        <div 
          className="glass" 
          style={{ 
            padding: '20px', 
            borderRadius: 'var(--radius-lg)', 
            background: 'var(--danger-bg)', 
            border: '1.5px solid rgba(248, 113, 113, 0.3)', 
            marginBottom: '28px',
            color: 'var(--text-main)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <ShieldAlert size={26} style={{ color: 'var(--danger-color)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--danger-color)', margin: '0 0 8px 0' }}>
                تنبيه هام جداً: الحذف فوري ونهائي ولا يمكن التراجع عنه
              </h2>
              <ul style={{ margin: 0, paddingRight: '18px', fontSize: '0.88rem', lineHeight: '1.8', color: 'var(--text-main)' }}>
                <li><strong>إلغاء الاشتراكات:</strong> سيتم إلغاء أي باقات أو اشتراكات مدفوعة جارية فوراً.</li>
                <li><strong>حذف البيانات الفوري:</strong> سيتم حذف كافة السجلات والرسائل والامتحانات والبطاقات التعليمية والتقييمات الخاصة بالحساب بصورة نهائية وفورية.</li>
                <li><strong>عدم إمكانية الاسترجاع:</strong> بمجرد تأكيد الحذف، لا يمكن استرجاع الحساب أو أي من محتوياته بأي شكل.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div 
            style={{ 
              padding: '14px 16px', 
              borderRadius: 'var(--radius-md)', 
              background: 'rgba(230, 57, 70, 0.12)', 
              border: '1px solid var(--danger-color)', 
              color: 'var(--danger-color)', 
              fontSize: '0.9rem', 
              fontWeight: 600, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              marginBottom: '20px' 
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {statusMsg && (
          <div 
            style={{ 
              padding: '14px 16px', 
              borderRadius: 'var(--radius-md)', 
              background: 'var(--primary-light)', 
              border: '1px solid var(--border-primary)', 
              color: 'var(--primary-color)', 
              fontSize: '0.9rem', 
              fontWeight: 600, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              marginBottom: '20px' 
            }}
          >
            <Info size={18} style={{ flexShrink: 0 }} />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 'request' && (
          <form 
            onSubmit={handleSendOtp} 
            className="glass" 
            style={{ 
              padding: '28px', 
              borderRadius: 'var(--radius-lg)', 
              background: 'var(--card-bg)', 
              border: '1px solid var(--border-color)', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '20px' 
            }}
          >
            <div>
              <label 
                htmlFor="delete-email-input"
                style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}
              >
                البريد الإلكتروني المسجل بالحساب:
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="delete-email-input"
                  type="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--sidebar-bg)',
                    color: 'var(--text-main)',
                    fontSize: '1rem',
                    outline: 'none',
                    textAlign: 'left',
                    boxSizing: 'border-box',
                    transition: 'var(--transition)'
                  }}
                />
                <Mail 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '14px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: 'var(--text-muted)', 
                    pointerEvents: 'none' 
                  }} 
                />
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                سنرسل رمز تحقق مكون من 6 أرقام إلى هذا البريد لتأكيد ملكيتك للحساب.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--primary-color)',
                color: 'var(--text-on-primary)',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: loading || !email.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !email.trim() ? 0.65 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'var(--transition)'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>جاري إرسال رمز التحقق...</span>
                </>
              ) : (
                <>
                  <Mail size={18} />
                  <span>إرسال رمز التحقق (OTP)</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Enter OTP & Confirm Deletion */}
        {step === 'verify' && (
          <form 
            onSubmit={handleVerifyAndDelete} 
            className="glass" 
            style={{ 
              padding: '28px', 
              borderRadius: 'var(--radius-lg)', 
              background: 'var(--card-bg)', 
              border: '1px solid var(--border-color)', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '22px' 
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label 
                  htmlFor="delete-otp-input"
                  style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}
                >
                  رمز التحقق (OTP):
                </label>
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-color)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  تغيير البريد الإلكتروني
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  id="delete-otp-input"
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  dir="ltr"
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--sidebar-bg)',
                    color: 'var(--primary-color)',
                    fontSize: '1.6rem',
                    fontWeight: 800,
                    letterSpacing: '8px',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'var(--transition)'
                  }}
                />
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px', textAlign: 'center' }}>
                الرمز صالح لمدة 10 دقائق فقط تم إرساله إلى: <strong style={{ color: 'var(--text-main)', direction: 'ltr', display: 'inline-block' }}>{email}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="submit"
                disabled={loading || otp.length < 6}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'var(--primary-color)',
                  color: 'var(--text-on-primary)',
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: loading || otp.length < 6 ? 'not-allowed' : 'pointer',
                  opacity: loading || otp.length < 6 ? 0.65 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'var(--transition)'
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>جاري تنفيذ الحذف الدائم...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    <span>تأكيد حذف الحساب وجميع البيانات نهائياً</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <KeyRound size={14} />
                <span>لم يصلك الرمز؟ إعادة الإرسال</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Success Confirmation */}
        {step === 'success' && (
          <div 
            className="glass" 
            style={{ 
              padding: '36px 24px', 
              borderRadius: 'var(--radius-lg)', 
              background: 'var(--card-bg)', 
              border: '1.5px solid var(--success-color)', 
              textAlign: 'center', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '16px' 
            }}
          >
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              background: 'rgba(34, 197, 94, 0.15)', 
              color: 'var(--success-color)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              تم حذف حسابك وجميع بياناتك بنجاح
            </h2>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.7', maxWidth: '480px', margin: 0 }}>
              تم إلغاء كافة الاشتراكات ومسح جميع سجلات المحادثات والامتحانات والبطاقات والبيانات المرتبطة بالحساب نهائياً من خوادم المنصة. نتمنى لك التوفيق دائماً.
            </p>

            <Link
              href="/"
              style={{
                marginTop: '12px',
                padding: '12px 28px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--primary-color)',
                color: 'var(--text-on-primary)',
                fontWeight: 700,
                fontSize: '0.95rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'var(--transition)'
              }}
            >
              <span>العودة إلى الصفحة الرئيسية</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
