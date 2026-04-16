import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/app/providers';

export const metadata: Metadata = {
  title: 'Draftora - Student, Parent, and Teacher Writing Apps',
  description: 'A multi-app AI writing and vocabulary platform for students, parents, and teachers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      style={{
        ['--font-playfair' as string]: '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
        ['--font-dm-sans' as string]: '"Aptos", "Segoe UI Variable", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
      }}
      >
      <head>
        {/* Suppress Supabase WebSocket [object Event] unhandled rejections before
            Next.js dev overlay can intercept them. Registered synchronously so
            this handler runs first and can call stopImmediatePropagation(). */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            function isRefreshTokenFailure(reason) {
              var message = '';
              if (typeof reason === 'string') {
                message = reason;
              } else if (reason && typeof reason === 'object' && typeof reason.message === 'string') {
                message = reason.message;
              }
              message = String(message).toLowerCase();
              return message.includes('invalid refresh token') ||
                message.includes('refresh token not found') ||
                message.includes('refresh token') ||
                message.includes('auth session missing') ||
                message.includes('session not found');
            }

            function clearSupabaseStorage() {
              try {
                [window.localStorage, window.sessionStorage].forEach(function(storage) {
                  var keys = [];
                  for (var i = 0; i < storage.length; i += 1) {
                    var key = storage.key(i);
                    if (key) keys.push(key);
                  }
                  keys.forEach(function(key) {
                    var lower = key.toLowerCase();
                    if (
                      lower.indexOf('sb-') === 0 ||
                      lower.indexOf('supabase') === 0 ||
                      lower.indexOf('auth-token') !== -1 ||
                      lower.indexOf('sb:') !== -1
                    ) {
                      storage.removeItem(key);
                    }
                  });
                });
              } catch (_) {}
            }

            function suppress(e) {
              var r = e.reason;
              if (!r) return;
              // Bare Event objects (Supabase WebSocket drop)
              if (typeof Event !== 'undefined' && r instanceof Event) {
                e.preventDefault(); e.stopImmediatePropagation(); return;
              }
              // Plain objects with no message/stack
              if (typeof r === 'object' && !r.message && !r.stack) {
                e.preventDefault(); e.stopImmediatePropagation(); return;
              }
              if (isRefreshTokenFailure(r)) {
                clearSupabaseStorage();
                e.preventDefault(); e.stopImmediatePropagation(); return;
              }
            }
            window.addEventListener('unhandledrejection', suppress, true);
          })();
        `}} />
      </head>
      <body style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
