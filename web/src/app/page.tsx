'use client';

import dynamic from 'next/dynamic';

const ClientPage = dynamic(() => import('./client-page'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-color, #0f172a)',
      color: 'var(--text-main, #f8fafc)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      direction: 'rtl'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(125,161,70,0.1)',
          borderTopColor: 'var(--primary-color, #7da146)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}} />
        <span style={{ fontSize: '1rem', fontWeight: 500, opacity: 0.8 }}>جاري تحميل المنصة...</span>
      </div>
    </div>
  )
});

export default function Page() {
  return <ClientPage />;
}
