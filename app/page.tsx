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

  return <MarketingHome />;
}
