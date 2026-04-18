import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/app/providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://draftora.com.au'),
  title: 'Draftora - AI Writing Coach for Students',
  description: 'Draftora is an AI writing coach for students that helps improve writing, vocabulary, feedback, and daily practice through XP, rewards, and guided learning.',
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
    title: 'Draftora - AI Writing Coach for Students',
    description: 'Improve writing, learn vocabulary, get AI feedback, track XP, and build better daily writing habits with Draftora.',
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
    title: 'Draftora - AI Writing Coach for Students',
    description: 'Improve writing, learn vocabulary, get AI feedback, track XP, and build better daily writing habits with Draftora.',
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
