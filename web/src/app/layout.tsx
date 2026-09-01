import type { Metadata, Viewport } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://egsaiedu.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'EGS AI | مساعدك الذكي في المنهج الدراسي المصري',
    template: '%s | EGS AI'
  },
  description: 'منصة EGS AI هي وكيل ومساعد ذكي مدعوم بالذكاء الاصطناعي مخصص لطلاب المدارس الإعدادية والثانوية في مصر، مرتبط بالمنهج الدراسي لمساعدتك في المذاكرة وحل الأسئلة فوراً وبدقة.',
  keywords: [
    'EGS AI',
    'المنهج الدراسي المصري',
    'مساعد ذكي',
    'ذكاء اصطناعي للتعليم',
    'الثانوية العامة',
    'الشهادة الإعدادية',
    'تعليم مصر',
    'مذاكرة ذكية',
    'حل أسئلة الامتحانات'
  ],
  authors: [{ name: 'EGS AI Team' }],
  creator: 'EGS AI',
  publisher: 'EGS AI',
  alternates: {
    canonical: '/',
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EGS AI',
  },
  openGraph: {
    title: 'EGS AI | مساعدك الذكي في المنهج الدراسي المصري',
    description: 'منصة EGS AI هي وكيل ومساعد ذكي مدعوم بالذكاء الاصطناعي مخصص لطلاب المدارس الإعدادية والثانوية في مصر، مرتبط بالمنهج الدراسي لمساعدتك في المذاكرة وحل الأسئلة فوراً وبدقة.',
    url: siteUrl,
    siteName: 'EGS AI',
    locale: 'ar_EG',
    type: 'website',
    images: [
      {
        url: '/icon.png',
        width: 512,
        height: 512,
        alt: 'EGS AI Logo',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EGS AI | مساعدك الذكي في المنهج الدراسي المصري',
    description: 'منصة EGS AI هي وكيل ومساعد ذكي مدعوم بالذكاء الاصطناعي مخصص لطلاب المدارس الإعدادية والثانوية في مصر، مرتبط بالمنهج الدراسي لمساعدتك في المذاكرة وحل الأسئلة فوراً وبدقة.',
    images: ['/icon.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  // Extend under the iOS notch/home-indicator so the fixed bottom nav & composer
  // can pad themselves with env(safe-area-inset-*). Verified against the bundled
  // Next 16 Viewport type (viewportFit / interactiveWidget are supported fields).
  viewportFit: 'cover',
  interactiveWidget: 'resizes-visual',
  themeColor: '#0D1B2A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    'name': 'EGS AI',
    'alternateName': 'EGS AI',
    'description': 'منصة EGS AI هي وكيل ومساعد ذكي مدعوم بالذكاء الاصطناعي مخصص لطلاب المدارس الإعدادية والثانوية في مصر، مرتبط بالمنهج الدراسي لمساعدتك في المذاكرة وحل الأسئلة فوراً وبدقة.',
    'url': siteUrl,
    'applicationCategory': 'EducationalApplication',
    'operatingSystem': 'All',
    'browserRequirements': 'Requires HTML5',
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'EGP'
    }
  };

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script src="https://accounts.google.com/gsi/client" async defer></script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Suppress and isolate third-party browser extension errors from triggering Next.js dev overlay
                if (typeof window !== 'undefined') {
                  const isExtensionError = (filename, error, reason) => {
                    const src = (filename || '') + ' ' + ((error && error.stack) || '') + ' ' + ((reason && reason.stack) || '');
                    return src.includes('chrome-extension://') || 
                           src.includes('moz-extension://') || 
                           src.includes('safari-extension://') || 
                           src.includes('extension://') ||
                           src.includes('almalgbpmcfpdaopimbdchdliminoign');
                  };

                  window.addEventListener('error', function(event) {
                    if (isExtensionError(event.filename, event.error, null)) {
                      event.stopImmediatePropagation();
                      event.preventDefault();
                      return true;
                    }
                  }, true);

                  window.addEventListener('unhandledrejection', function(event) {
                    if (isExtensionError(null, null, event.reason)) {
                      event.stopImmediatePropagation();
                      event.preventDefault();
                    }
                  }, true);
                }

                const attrs = ['bis_skin_checked', 'cz-shortcut-listen'];
                const removeAttrs = (el) => {
                  if (!el || !el.removeAttribute) return;
                  attrs.forEach(attr => {
                    if (el.hasAttribute && el.hasAttribute(attr)) el.removeAttribute(attr);
                  });
                };
                
                // Watch for mutations to remove injected attributes before React notices them
                const observer = new MutationObserver((mutations) => {
                  for (const mutation of mutations) {
                    if (mutation.type === 'attributes' && attrs.includes(mutation.attributeName)) {
                      removeAttrs(mutation.target);
                    }
                    if (mutation.addedNodes) {
                      mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                          removeAttrs(node);
                          node.querySelectorAll('*').forEach(removeAttrs);
                        }
                      });
                    }
                  }
                });
                
                observer.observe(document.documentElement, {
                  attributes: true,
                  childList: true,
                  subtree: true,
                  attributeFilter: attrs
                });

                // Register PWA Service Worker
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').catch(function() {
                      // Non-critical background registration fallback
                    });
                  });
                }

                // Capture early PWA beforeinstallprompt event before React hydration
                window.__egsPwaPrompt = null;
                window.addEventListener('beforeinstallprompt', function(e) {
                  e.preventDefault();
                  window.__egsPwaPrompt = e;
                  if (typeof window.__onPwaPromptReady === 'function') {
                    window.__onPwaPromptReady(e);
                  }
                });
              })();
            `
          }}
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
