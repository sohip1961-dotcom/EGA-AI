import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'رعاية اشتراك طالب | منصة EGS AI التعليمية',
  description: 'ساهم في دعم ورعاية اشتراك طالب مصري في منصة EGS AI للذكاء الاصطناعي للمناهج الدراسية لمساعدته في التفوق الدراسي.',
  keywords: [
    'رعاية طالب علم',
    'اشتراك EGS AI',
    'دعم طلاب الثانوية العامة',
    'EGS AI sponsorship'
  ],
  alternates: {
    canonical: '/sponsor',
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function SponsorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
