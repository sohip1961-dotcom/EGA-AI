'use client';

import React, { useState } from 'react';
import { Send, CheckCircle, User, Phone, MessageSquare, AlertCircle } from 'lucide-react';

interface ContactFormProps {
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export default function ContactForm({
  title = 'نموذج التواصل والدعم الفني',
  subtitle = 'أرسل لنا استفسارك أو طلبك وسيقوم فريق الدعم بالرد عليك في أقرب وقت.',
  compact = false,
}: ContactFormProps) {
  const [name, setName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [category, setCategory] = useState('اشتراكات واسترجاع');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contactInfo.trim() || !message.trim()) {
      setErrorMsg('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reported_content: message.trim(),
          user_query: `الاسم: ${name.trim()} | بيانات الاتصال: ${contactInfo.trim()}`,
          reason: `نموذج تواصل موقع [${category}]`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
        setName('');
        setContactInfo('');
        setMessage('');
      } else {
        setErrorMsg(data.error || 'حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة لاحقاً.');
      }
    } catch (err) {
      setErrorMsg('تعذر الاتصال بالخادم. يرجى التحقق من الاتصال بالإنترنت.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="glass"
      style={{
        padding: compact ? '20px' : '28px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        direction: 'rtl',
        color: 'var(--text-main)',
      }}
    >
      <h3 style={{ fontSize: compact ? '1.1rem' : '1.3rem', fontWeight: 800, color: 'var(--primary-color)', marginBottom: '6px' }}>
        {title}
      </h3>
      {subtitle && (
        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: compact ? '16px' : '24px', lineHeight: '1.6' }}>
          {subtitle}
        </p>
      )}

      {submitted ? (
        <div
          style={{
            padding: '24px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--primary-light)',
            border: '1px solid rgba(125,161,70,0.3)',
            color: 'var(--primary-color)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <CheckCircle size={36} />
          <div>
            <h4 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '4px' }}>تم إرسال رسالتك بنجاح!</h4>
            <p style={{ fontSize: '0.88rem', margin: 0, opacity: 0.9 }}>
              شكراً لتواصلك معنا. قام فريق الدعم بتسلم رسالتك وسيتواصل معك عبر بيانات الاتصال المزودة في أقرب وقت.
            </p>
          </div>
          <button
            onClick={() => setSubmitted(false)}
            style={{
              marginTop: '8px',
              background: 'var(--primary-color)',
              color: 'var(--text-on-primary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 18px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            إرسال استفسار آخر
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(248, 113, 113, 0.12)',
                border: '1px solid rgba(248, 113, 113, 0.3)',
                color: 'var(--danger-color)',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {/* Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                الاسم الكامل *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أحمد محمد"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
                <User size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                رقم الهاتف أو البريد الإلكتروني *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="010xxxxxxx أو name@example.com"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
                <Phone size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              الموضوع / نوع الاستفسار
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                fontSize: '0.88rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="اشتراكات واسترجاع">استفسار عن الاشتراكات وباقات Pro أو طلب استرجاع</option>
              <option value="مشكلة تقنية">بلاغ عن مشكلة تقنية أو خطأ في المنصة</option>
              <option value="اقتراح أو ملاحظة">اقتراح لتطوير الخدمة والذكاء الاصطناعي</option>
              <option value="استفسار عام">استفسار عام</option>
            </select>
          </div>

          {/* Message */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              تفاصيل الرسالة أو الاستفسار *
            </label>
            <div style={{ position: 'relative' }}>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب استفسارك بالتفصيل هنا..."
                required
                style={{
                  width: '100%',
                  padding: '10px 38px 10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  resize: 'vertical',
                  lineHeight: '1.6',
                }}
              />
              <MessageSquare size={16} style={{ position: 'absolute', right: '12px', top: '14px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '0.92rem',
              fontWeight: 800,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: '4px',
            }}
          >
            <Send size={18} />
            <span>{loading ? 'جاري إرسال الرسالة...' : 'إرسال الرسالة إلى فريق الدعم'}</span>
          </button>
        </form>
      )}
    </div>
  );
}
