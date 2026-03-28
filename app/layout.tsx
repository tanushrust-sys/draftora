import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/app/context/AuthContext';
import { ThemeProvider } from '@/app/context/ThemeContext';

export const metadata: Metadata = {
  title: 'Draftly - Write More. Learn Deeper. Grow Further.',
  description: 'A gamified AI writing and vocabulary app for students.',
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
      <body style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
