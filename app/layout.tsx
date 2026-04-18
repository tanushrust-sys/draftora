import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/app/providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://draftora.com.au'),
  title: 'Draftora | AI Writing App for Students, Parents, and Teachers',
  description: 'Draftora is an AI writing app for students that helps improve writing skills with instant feedback, clearer revision steps, and shared progress for parents and teachers.',
  manifest: '/manifest.webmanifest',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    title: 'Draftora | AI Writing App for Students, Parents, and Teachers',
    description: 'Help students improve writing skills with AI feedback, clear revision guidance, and progress visibility for parents and teachers.',
    siteName: 'Draftora',
    type: 'website',
    url: 'https://draftora.com.au',
    images: [
      {
        url: '/logo.svg',
        alt: 'Draftora logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Draftora | AI Writing App for Students, Parents, and Teachers',
    description: 'An AI writing app for students to improve writing skills with clear feedback and shared progress for parents and teachers.',
    images: ['/logo.svg'],
  },
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
