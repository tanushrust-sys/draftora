import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireRouteAuth } from '@/app/lib/server-auth';
import {
  normalizeHomeworkPayload,
  normalizeWeeklyPlan,
  type HomeworkPayload,
  type WeeklyHomeworkPlan,
} from '@/app/lib/homework';

type TargetMode = 'class' | 'students';

type TeacherClassStudentRow = {
  class_id: string;
  student_id: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function parseString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry) => parseString(entry))
        .filter((entry) => entry.length > 0),
    ),
  );
}

function parseTargetMode(value: unknown): TargetMode | null {
  return value === 'class' || value === 'students' ? value : null;
}

async function resolveTeacherClassStudents(teacherId: string, classId: string) {
  const { data: klass, error: classError } = await (adminSupabase as any)
    .from('teacher_classes')
    .select('id, teacher_id, name')
    .eq('id', classId)
    .eq('teacher_id', teacherId)
    .maybeSingle();

  if (classError) {
    throw new Error(classError.message || 'Could not load class.');
  }

  if (!klass) {
    return { className: null as string | null, studentIds: [] as string[] };
  }

  const { data: links, error: linkError } = await (adminSupabase as any)
    .from('teacher_class_students')
    .select('class_id, student_id')
    .eq('class_id', classId);

  if (linkError) {
    throw new Error(linkError.message || 'Could not load class members.');
  }

  const studentIds = (links ?? []).map((row: TeacherClassStudentRow) => row.student_id);
  return { className: String(klass.name ?? ''), studentIds };
}

function normalizeTargetStudentIds(
  targetMode: TargetMode,
  classStudentIds: string[],
  requestedStudentIds: string[],
) {
  if (targetMode === 'class') return classStudentIds;
  return requestedStudentIds.filter((id) => classStudentIds.includes(id));
}

function buildHomeworkPayload(input: unknown, fallbackNote?: string): HomeworkPayload {
  const payload = normalizeHomeworkPayload(input);
  if (fallbackNote && !payload.parentNotes) {
    return { ...payload, parentNotes: fallbackNote };
  }
  return payload;
}

export async function POST(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['teacher']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const classId = parseString(body.classId);
  const targetMode = parseTargetMode(body.targetMode);
  const requestedStudentIds = parseStringArray(body.studentIds);
  const assignedDates = parseStringArray(body.assignedDates);
  const payload = buildHomeworkPayload(body.payload, parseString(body.note));

  if (!classId) return jsonError('Missing classId.', 400);
  if (!targetMode) return jsonError('Missing targetMode.', 400);
  if (!payload.writing && !payload.vocab) {
    return jsonError('Add at least one homework category.', 400);
  }
  if (!assignedDates.length) {
    return jsonError('Missing assignedDates.', 400);
  }

  const { className, studentIds } = await resolveTeacherClassStudents(auth.auth.userId, classId);
  if (!className || !studentIds.length) {
    return jsonError('That class has no students yet.', 400);
  }

  const resolvedStudentIds = normalizeTargetStudentIds(targetMode, studentIds, requestedStudentIds);
  if (!resolvedStudentIds.length) {
    return jsonError('Select at least one student.', 400);
  }

  const rows = resolvedStudentIds.flatMap((studentId) =>
    assignedDates.map((date) => ({
      parent_id: auth.auth.userId,
      student_id: studentId,
      assigned_date: date,
      due_date: date,
      homework_payload: payload,
    })),
  );

  const { error } = await (adminSupabase as any)
    .from('parent_homework_assignments')
    .insert(rows);

  if (error) {
    return jsonError(error.message || 'Could not save homework assignment.', 500);
  }

  return NextResponse.json({
    ok: true,
    insertedAssignments: rows.length,
    classId,
    className,
    studentIds: resolvedStudentIds,
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['teacher']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const classId = parseString(body.classId);
  const targetMode = parseTargetMode(body.targetMode);
  const requestedStudentIds = parseStringArray(body.studentIds);
  const weeklyPlan = normalizeWeeklyPlan(body.weeklyPlan);

  if (!classId) return jsonError('Missing classId.', 400);
  if (!targetMode) return jsonError('Missing targetMode.', 400);

  const { className, studentIds } = await resolveTeacherClassStudents(auth.auth.userId, classId);
  if (!className || !studentIds.length) {
    return jsonError('That class has no students yet.', 400);
  }

  const resolvedStudentIds = normalizeTargetStudentIds(targetMode, studentIds, requestedStudentIds);
  if (!resolvedStudentIds.length) {
    return jsonError('Select at least one student.', 400);
  }

  const rows = resolvedStudentIds.map((studentId) => ({
    parent_id: auth.auth.userId,
    student_id: studentId,
    weekly_plan: weeklyPlan,
  }));

  const { error } = await (adminSupabase as any)
    .from('parent_homework_timetables')
    .upsert(rows, { onConflict: 'parent_id,student_id' });

  if (error) {
    return jsonError(error.message || 'Could not save timetable.', 500);
  }

  return NextResponse.json({
    ok: true,
    updatedTimetables: rows.length,
    classId,
    className,
    studentIds: resolvedStudentIds,
    weeklyPlan: weeklyPlan as WeeklyHomeworkPlan,
  });
}
