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
              (function() {
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

                const attrs = ['bis_skin_checked', 'bis_register', 'bis_status', 'cz-shortcut-listen'];
                const removeAttrs = function(el) {
                  if (!el || !el.removeAttribute) return;
                  for (var i = 0; i < attrs.length; i++) {
                    if (el.hasAttribute && el.hasAttribute(attrs[i])) el.removeAttribute(attrs[i]);
                  }
                };

                if (typeof document !== 'undefined') {
                  removeAttrs(document.documentElement);
                  removeAttrs(document.body);
                }

                var observer = new MutationObserver(function(mutations) {
                  for (var i = 0; i < mutations.length; i++) {
                    var mutation = mutations[i];
                    if (mutation.type === 'attributes' && attrs.indexOf(mutation.attributeName) !== -1) {
                      removeAttrs(mutation.target);
                    }
                    if (mutation.addedNodes) {
                      for (var j = 0; j < mutation.addedNodes.length; j++) {
                        var node = mutation.addedNodes[j];
                        if (node.nodeType === 1) {
                          removeAttrs(node);
                          if (node.querySelectorAll) {
                            var children = node.querySelectorAll('*');
                            for (var k = 0; k < children.length; k++) {
                              removeAttrs(children[k]);
                            }
                          }
                        }
                      }
                    }
                  }
                });

                if (typeof document !== 'undefined' && document.documentElement) {
                  observer.observe(document.documentElement, {
                    attributes: true,
                    childList: true,
                    subtree: true,
                    attributeFilter: attrs
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
