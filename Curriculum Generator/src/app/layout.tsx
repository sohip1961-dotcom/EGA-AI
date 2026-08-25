import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "منظّم واستخراج المناهج الدراسية - EGS AI",
  description: "أداة استخراج المناهج وتجهيزها للذكاء الاصطناعي بنظام RAG",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                const observer = new MutationObserver((mutations) => {
                  mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes') {
                      const attrName = mutation.attributeName;
                      if (attrName && (attrName.startsWith('bis_') || attrName.startsWith('cz-shortcode'))) {
                        (mutation.target as HTMLElement).removeAttribute(attrName);
                      }
                    }
                  });
                });
                observer.observe(document.documentElement, {
                  attributes: true,
                  subtree: true,
                  attributeFilter: ['bis_skin_checked', 'bis_register', 'cz-shortcut-listen']
                });
              }
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
