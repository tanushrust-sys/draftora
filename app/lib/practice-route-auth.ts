import { adminSupabase } from '@/app/lib/server-auth';
import { isPracticeEmail, isPracticeUserMetadata } from '@/app/lib/practice-mode';

function extractBearerToken(headerValue: string | null) {
  if (!headerValue) return '';
  const normalized = headerValue.trim();
  if (!normalized.toLowerCase().startsWith('bearer ')) return '';
  return normalized.slice(7).trim();
}

export function getTokenFromRequest(request: Request) {
  return extractBearerToken(request.headers.get('authorization'));
}

export type PracticeRouteIdentity = {
  userId: string;
  email: string;
  isPractice: boolean;
};

export async function resolvePracticeIdentity(token?: string | null): Promise<PracticeRouteIdentity | null> {
  if (!token) return null;

  const { data, error } = await adminSupabase.auth.getUser(token);
  const user = data.user ?? null;

  if (error || !user) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email ?? '',
    isPractice: isPracticeUserMetadata(user.user_metadata as Record<string, unknown> | null) || isPracticeEmail(user.email),
  };
}
