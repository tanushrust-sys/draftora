import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const { username } = await req.json();
  if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 });

  const { data } = await adminSupabase
    .from('profiles')
    .select('email')
    .ilike('username', username.trim())
    .single();

  if (!data?.email) {
    return NextResponse.json({ error: 'No account found with that username.' }, { status: 404 });
  }

  return NextResponse.json({ email: data.email });
}
