import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'شروط الاستخدام | EGS AI',
  description: 'شروط استخدام منصة EGS AI للمساعدة الدراسية بالذكاء الاصطناعي.',
};

export default function TermsOfUsePage() {
  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: 'var(--bg-color)', color: 'var(--text-main)', direction: 'rtl' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '48px 24px 80px' }}>
        <Link href="/" style={{ color: 'var(--primary-color)', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
          ← العودة إلى EGS AI
        </Link>

        <h1 style={{ fontSize: '1.9rem', fontWeight: 900, color: 'var(--primary-color)', marginBottom: '6px' }}>
          شروط الاستخدام
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '32px' }}>
          آخر تحديث: يوليو 2026 — يسري هذا الإصدار على النسخة التجريبية (Beta) من منصة وتطبيق EGS AI.
        </p>

        <div className="glass" style={{ padding: '28px', borderRadius: 'var(--radius-lg)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', lineHeight: '1.9', fontSize: '0.95rem' }}>

          <p style={{ marginBottom: '20px' }}>
            تحكم شروط الاستخدام هذه استخدامك لمنصة وتطبيق <strong>EGS AI</strong> ("المنصة"). بإنشائك لحساب أو استخدامك للمنصة، فإنك تقر بموافقتك على هذه الشروط، وعلى{' '}
            <Link href="/privacy" style={{ color: 'var(--primary-color)', fontWeight: 700 }}>سياسة الخصوصية</Link>{' '}
            المرتبطة بها.
          </p>

          <Section title="1. طبيعة الخدمة">
            <p>
              EGS AI هي منصة تعليمية مساعدة تعتمد على الذكاء الاصطناعي، تهدف إلى مساعدة طلاب المرحلتين الإعدادية والثانوية في مصر على فهم المنهج الدراسي وحل الأسئلة والاستعداد للامتحانات. المنصة حالياً في <strong>مرحلة تجريبية (Beta)</strong>، وقد تتغير ميزاتها أو يُعاد تشكيلها قبل إطلاق النسخة النهائية.
            </p>
          </Section>

          <Section title="2. الحساب والتسجيل">
            <ul style={listStyle}>
              <li>يجب تقديم بيانات صحيحة (رقم هاتف، اسم، صف دراسي) عند إنشاء الحساب.</li>
              <li>أنت مسؤول عن الحفاظ على سرية كلمة المرور الخاصة بك وعن أي نشاط يتم من خلال حسابك.</li>
              <li>يُمنع إنشاء أكثر من حساب بغرض التحايل على حدود الاستخدام المجاني.</li>
            </ul>
          </Section>

          <Section title="3. الاستخدام المقبول">
            <ul style={listStyle}>
              <li>يُستخدم المساعد الذكي لأغراض تعليمية مساعدة (الشرح، حل الأسئلة، توليد امتحانات تدريبية) — وليس بديلاً عن الفهم الحقيقي أو المذاكرة الجادة.</li>
              <li>يُمنع استخدام المنصة في أي غرض غير قانوني أو مسيء أو لإرسال محتوى مخالف للآداب العامة.</li>
              <li>يُمنع محاولة استغلال أي ثغرة تقنية أو الوصول غير المصرح به لبيانات مستخدمين آخرين أو للوحة التحكم الإدارية.</li>
            </ul>
          </Section>

          <Section title="4. نظام النقاط والباقات">
            <p>
              يتم تنظيم الاستخدام حالياً عبر نظام نقاط (Points) يُحتسب تلقائياً حسب حجم كل رسالة وإجابة. خلال فترة البيتا، <strong>خاصية الاشتراكات المدفوعة غير مُفعّلة</strong>، وسيتم الإعلان عن تفاصيل الباقات المدفوعة عند إطلاقها رسمياً (المستهدف قبل أغسطس 2026)، مع تحديث هذه الشروط وقتها لتشمل سياسات الدفع والاسترجاع.
            </p>
          </Section>

          <Section title="5. إخلاء المسؤولية بخصوص إجابات الذكاء الاصطناعي">
            <p>
              الإجابات المُولَّدة عبر المساعد الذكي تعتمد على نماذج ذكاء اصطناعي من جهات خارجية غير تابعة لنا، وقد تحتوي على أخطاء. <strong>لا تتحمل المنصة أي مسؤولية</strong> عن أي قرار دراسي أو غيره يُتخذ بناءً على إجابة غير مُتحقق منها. يمكنك الإبلاغ عن أي رد غير دقيق عبر زر "الإبلاغ" المتاح أسفل كل إجابة.
            </p>
          </Section>

          <Section title="6. الملكية الفكرية">
            <p>
              جميع الحقوق الخاصة بتصميم المنصة، شعارها، وأكوادها البرمجية محفوظة. المحتوى الدراسي المرجعي (المناهج) يخضع لملكية جهاته الأصلية ويُستخدم في المنصة لأغراض تعليمية مساعدة فقط.
            </p>
          </Section>

          <Section title="7. التعليق أو إنهاء الحساب">
            <p>
              نحتفظ بالحق في تعليق أو إنهاء أي حساب يخالف هذه الشروط، خاصة في حالات إساءة الاستخدام أو محاولات الاختراق أو التلاعب بنظام النقاط.
            </p>
          </Section>

          <Section title="8. التعديلات على الخدمة والشروط">
            <p>
              بما أن المنصة في مرحلة تجريبية، قد تُضاف أو تُعدَّل أو تُزال ميزات دون إشعار مسبق. سنعمل على إخطارك بأي تغييرات جوهرية عبر إشعار داخل التطبيق أو الموقع.
            </p>
          </Section>

          <Section title="9. القانون الحاكم">
            <p>
              تخضع هذه الشروط وتُفسَّر وفقاً للقوانين المعمول بها في جمهورية مصر العربية.
            </p>
          </Section>

        </div>
      </div>
    </div>
  );
}

const listStyle: React.CSSProperties = { paddingRight: '20px', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '22px' }}>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '10px' }}>{title}</h2>
      {children}
    </section>
  );
}
