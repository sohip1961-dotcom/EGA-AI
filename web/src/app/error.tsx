'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App runtime error caught by boundary:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg-main, #0D0E0B)',
        color: 'var(--text-main, #F1F1F1)',
        direction: 'rtl'
      }}
    >
      <div
        className="glass animate-scale-in"
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: '36px 28px',
          borderRadius: '16px',
          background: 'var(--card-bg, #161814)',
          border: '1px solid var(--border-color, #272A23)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)'
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <AlertTriangle size={32} strokeWidth={2.2} />
        </div>

        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 8px', color: 'var(--text-main, #F1F1F1)' }}>
            تعذر تحميل هذه الصفحة
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted, #94A3B8)', margin: 0, lineHeight: 1.6 }}>
            حدث خطأ غير متوقع أثناء معالجة طلبك. يمكنك إعادة المحاولة أو الرجوع إلى الشاشة الرئيسية.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
          <button
            type="button"
            onClick={() => reset()}
            className="btn-primary"
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              border: 'none'
            }}
          >
            <RotateCcw size={16} />
            <span>إعادة المحاولة</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            }}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              background: 'transparent',
              border: '1.5px solid var(--border-color, #272A23)',
              color: 'var(--text-main, #F1F1F1)'
            }}
          >
            <Home size={16} />
            <span>الرئيسية</span>
          </button>
        </div>
      </div>
    </div>
  );
}
