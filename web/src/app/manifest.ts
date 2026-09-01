import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EGS AI | مساعد المنهج الدراسي المصري',
    short_name: 'EGS AI',
    description: 'منصة EGS AI هي وكيل ومساعد ذكي مدعوم بالذكاء الاصطناعي مخصص لطلاب المدارس الإعدادية والثانوية في مصر لمساعدتك في المذاكرة وحل الأسئلة فوراً وبدقة.',
    start_url: '/',
    id: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0D1B2A',
    theme_color: '#FFB703',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}

