import { NextRequest, NextResponse } from 'next/server';
import { normalizeStudentCode } from '@/app/lib/student-code';
import { adminSupabase, requireRouteAuth } from '@/app/lib/server-auth';

type LinkedStudentRow = {
  student_id: string;
  linked_student_code: string;
  created_at: string;
};

export async function GET(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['parent']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: links, error } = await adminSupabase
    .from('parent_student_links')
    .select('student_id, linked_student_code, created_at')
    .eq('parent_id', auth.auth.userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message || 'Could not load linked students.' }, { status: 500 });
  }

  const studentIds = (links ?? []).map((link) => link.student_id);
  const studentProfiles = studentIds.length
    ? await adminSupabase.from('profiles').select('id, username, title, level, xp, streak, age_group, student_id, account_type').in('id', studentIds)
    : { data: [], error: null };

  if (studentProfiles.error) {
    return NextResponse.json({ error: studentProfiles.error.message || 'Could not load linked students.' }, { status: 500 });
  }

  const profileMap = new Map((studentProfiles.data ?? []).map((profile) => [profile.id, profile]));

  const result = (links ?? []).map((link: LinkedStudentRow) => {
    const profile = profileMap.get(link.student_id);
    return {
      studentId: link.student_id,
      studentCode: link.linked_student_code,
      linkedAt: link.created_at,
      profile: profile ? {
        id: profile.id,
        username: profile.username,
        title: profile.title,
        level: profile.level,
        xp: profile.xp,
        streak: profile.streak,
        age_group: profile.age_group,
        student_id: profile.student_id,
        account_type: profile.account_type,
      } : null,
    };
  });

  return NextResponse.json({ links: result });
}

export async function POST(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['parent']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const studentCode = normalizeStudentCode(body.studentCode);

  if (!studentCode) {
    return NextResponse.json({ error: 'Missing student code.' }, { status: 400 });
  }

  const { data: student, error: studentError } = await adminSupabase
    .from('profiles')
    .select('id, username, title, level, xp, streak, age_group, student_id, account_type')
    .eq('student_id', studentCode)
    .maybeSingle();

  if (studentError || !student) {
    return NextResponse.json({ error: 'No student found with that code.' }, { status: 404 });
  }

  const { data: existing } = await adminSupabase
    .from('parent_student_links')
    .select('id, student_id, linked_student_code')
    .eq('parent_id', auth.auth.userId)
    .eq('student_id', student.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      link: {
        studentId: existing.student_id,
        studentCode: existing.linked_student_code,
        profile: student,
      },
    });
  }

  const { error: insertError } = await adminSupabase.from('parent_student_links').insert({
    parent_id: auth.auth.userId,
    student_id: student.id,
    linked_student_code: studentCode,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message || 'Could not link that student.' }, { status: 500 });
  }

  return NextResponse.json({
    link: {
      studentId: student.id,
      studentCode,
      profile: student,
    },
  });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['parent']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const studentId = String(body.studentId || '').trim();
  if (!studentId) {
    return NextResponse.json({ error: 'Missing studentId.' }, { status: 400 });
  }

  const { error } = await adminSupabase
    .from('parent_student_links')
    .delete()
    .eq('parent_id', auth.auth.userId)
    .eq('student_id', studentId);

  if (error) {
    return NextResponse.json({ error: error.message || 'Could not unlink student.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
