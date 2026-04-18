import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Draftora',
    short_name: 'Draftora',
    description:
      'Draftora helps students write stronger drafts, gives parents clear progress visibility, and helps teachers deliver faster feedback at scale.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4f8bff',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
