import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireRouteAuth } from '@/app/lib/server-auth';

type TeacherClassRow = {
  id: string;
  teacher_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export async function GET(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['teacher']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: classes, error: classError } = await adminSupabase
    .from('teacher_classes')
    .select('id, teacher_id, name, description, created_at, updated_at')
    .eq('teacher_id', auth.auth.userId)
    .order('created_at', { ascending: false });

  if (classError) {
    return NextResponse.json({ error: classError.message || 'Could not load classes.' }, { status: 500 });
  }

  const classIds = (classes ?? []).map((klass) => klass.id);
  const studentLinks = classIds.length
    ? await adminSupabase
        .from('teacher_class_students')
        .select('class_id, student_id, created_at')
        .in('class_id', classIds)
    : { data: [], error: null };

  if (studentLinks.error) {
    return NextResponse.json({ error: studentLinks.error.message || 'Could not load class members.' }, { status: 500 });
  }

  const studentIds = (studentLinks.data ?? []).map((link) => link.student_id);
  const studentProfiles = studentIds.length
    ? await adminSupabase.from('profiles').select('id, username, title, level, xp, streak, age_group, student_id, account_type').in('id', studentIds)
    : { data: [], error: null };

  if (studentProfiles.error) {
    return NextResponse.json({ error: studentProfiles.error.message || 'Could not load class members.' }, { status: 500 });
  }

  const profileMap = new Map((studentProfiles.data ?? []).map((profile) => [profile.id, profile]));
  const linksByClass = new Map<string, Array<{ studentId: string; profile: ReturnType<typeof profileMap.get> }>>();

  for (const link of studentLinks.data ?? []) {
    const existing = linksByClass.get(link.class_id) ?? [];
    existing.push({ studentId: link.student_id, profile: profileMap.get(link.student_id) });
    linksByClass.set(link.class_id, existing);
  }

  const result = (classes ?? []).map((klass: TeacherClassRow) => ({
    ...klass,
    students: (linksByClass.get(klass.id) ?? []).map((entry) => ({
      studentId: entry.studentId,
      profile: entry.profile ? {
        id: entry.profile.id,
        username: entry.profile.username,
        title: entry.profile.title,
        level: entry.profile.level,
        xp: entry.profile.xp,
        streak: entry.profile.streak,
        age_group: entry.profile.age_group,
        student_id: entry.profile.student_id,
        account_type: entry.profile.account_type,
      } : null,
    })),
    studentCount: linksByClass.get(klass.id)?.length ?? 0,
  }));

  return NextResponse.json({ classes: result });
}

export async function POST(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['teacher']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  const description = String(body.description ?? '').trim();

  if (!name) {
    return NextResponse.json({ error: 'Missing class name.' }, { status: 400 });
  }

  const { data, error } = await adminSupabase
    .from('teacher_classes')
    .insert({
      teacher_id: auth.auth.userId,
      name,
      description,
    })
    .select('id, teacher_id, name, description, created_at, updated_at')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Could not create class.' }, { status: 500 });
  }

  return NextResponse.json({ class: { ...data, students: [], studentCount: 0 } });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['teacher']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const classId = String(body.classId ?? '').trim();
  if (!classId) {
    return NextResponse.json({ error: 'Missing classId.' }, { status: 400 });
  }

  const { error } = await adminSupabase
    .from('teacher_classes')
    .delete()
    .eq('id', classId)
    .eq('teacher_id', auth.auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message || 'Could not delete class.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
