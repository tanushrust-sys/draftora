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
      <body style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
