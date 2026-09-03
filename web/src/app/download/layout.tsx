import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'تحميل تطبيق EGS AI | تطبيق الذكاء الاصطناعي للمناهج المصرية',
  description: 'قم بتثبيت وتحميل تطبيق EGS AI على هاتفك الأندرويد، الآيفون، أو الكمبيوتر برابط مباشر وتقنية PWA الحديثة للمذاكرة وحل مسائل المنهج المصري.',
  keywords: [
    'تحميل تطبيق EGS AI',
    'تنزيل تطبيق EGS AI',
    'تطبيق ذكاء اصطناعي مصري',
    'تطبيق المناهج المصرية',
    'EGS AI app download',
    'EGS AI apk',
    'تطبيق الثانوية العامة بالذكاء الاصطناعي'
  ],
  alternates: {
    canonical: '/download',
  },
  openGraph: {
    title: 'تحميل تطبيق EGS AI | تطبيق الذكاء الاصطناعي للمناهج المصرية',
    description: 'تثبيت تطبيق EGS AI على الأندرويد، الآيفون، والكمبيوتر للوصول الفوري للمساعد الذكي للمناهج المصرية.',
    url: 'https://egsaiedu.com/download',
  }
};

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
