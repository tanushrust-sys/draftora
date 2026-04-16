import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireRouteAuth } from '@/app/lib/server-auth';

export async function POST(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['teacher']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const classId = String(body.classId ?? '').trim();
  const studentId = String(body.studentId ?? '').trim();

  if (!classId || !studentId) {
    return NextResponse.json({ error: 'Missing classId or studentId.' }, { status: 400 });
  }

  const { data: klass, error: classError } = await adminSupabase
    .from('teacher_classes')
    .select('id')
    .eq('id', classId)
    .eq('teacher_id', auth.auth.userId)
    .maybeSingle();

  if (classError || !klass) {
    return NextResponse.json({ error: 'Class not found.' }, { status: 404 });
  }

  const { error } = await adminSupabase
    .from('teacher_class_students')
    .upsert({ class_id: classId, student_id: studentId }, { onConflict: 'class_id,student_id' });

  if (error) {
    return NextResponse.json({ error: error.message || 'Could not add student to class.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['teacher']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const classId = String(body.classId ?? '').trim();
  const studentId = String(body.studentId ?? '').trim();

  if (!classId || !studentId) {
    return NextResponse.json({ error: 'Missing classId or studentId.' }, { status: 400 });
  }

  const { error } = await adminSupabase
    .from('teacher_class_students')
    .delete()
    .eq('class_id', classId)
    .eq('student_id', studentId);

  if (error) {
    return NextResponse.json({ error: error.message || 'Could not remove student from class.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
