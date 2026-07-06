import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EGS AI | مساعد المنهج الدراسي المصري',
    short_name: 'EGS AI',
    description: 'منصة EGS AI هي وكيل ومساعد ذكي مدعوم بالذكاء الاصطناعي مخصص لطلاب المدارس الإعدادية والثانوية في مصر لمساعدتك في المذاكرة وحل الأسئلة فوراً وبدقة.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0D0E0B',
    theme_color: '#7DA146',
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
