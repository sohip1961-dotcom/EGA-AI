'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function PayRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const paramsString = searchParams.toString();
    const destination = paramsString ? `/sponsor?${paramsString}` : '/sponsor';
    router.replace(destination);
  }, [router, searchParams]);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl' }}>
      <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>جاري التحويل لبوابة رعاية واشتراك ولي الأمر...</p>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={null}>
      <PayRedirectContent />
    </Suspense>
  );
}
