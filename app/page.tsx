import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import MarketingHome from '@/app/components/marketing-home';

export default async function RootPage() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const hasSession = allCookies.some(
    (c) => c.name.includes('sb-') && c.name.includes('-auth-token')
  );

  if (hasSession) {
    redirect('/dashboard');
  }

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Draftora',
    url: 'https://draftora.com.au',
    logo: 'https://draftora.com.au/logo.svg',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <MarketingHome />
    </>
  );
}
