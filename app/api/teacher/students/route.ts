import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireRouteAuth } from '@/app/lib/server-auth';
import { generateStudentCode } from '@/app/lib/student-code';

type BulkStudentRow = {
  firstName: string;
  lastName: string;
};

function normalizeNamePart(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

async function generateUniqueStudentCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateStudentCode();
    const { data } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('student_id', code)
      .maybeSingle();

    if (!data) return code;
  }

  return generateStudentCode();
}

async function isUsernameTaken(username: string) {
  const profilesResult = await adminSupabase.from('profiles').select('id, deleted_at').ilike('username', username);
  if (profilesResult.error) {
    console.warn('profiles username lookup failed during bulk student generation:', profilesResult.error.message);
    return false;
  }

  const deletedAccountsResult = await adminSupabase.from('deleted_accounts').select('id').ilike('username', username).limit(1);
  if (deletedAccountsResult.error) {
    // Some environments may not have a fully migrated deleted_accounts table.
    // Username reuse is better than failing the whole batch on that lookup.
    console.warn('deleted_accounts username lookup failed during bulk student generation:', deletedAccountsResult.error.message);
  }

  const activeProfiles = (profilesResult.data ?? []).some((row) => !row.deleted_at);
  return activeProfiles || Boolean((deletedAccountsResult.data ?? []).length > 0);
}

async function buildUsername(firstName: string, usedUsernames: Set<string>) {
  const base = normalizeNamePart(firstName) || 'student';
  let candidate = base;
  let suffix = 2;

  while (usedUsernames.has(candidate) || (await isUsernameTaken(candidate))) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  usedUsernames.add(candidate);
  return candidate;
}

function buildEmail(code: string) {
  return `student.${code.toLowerCase()}@draftora.school`;
}

function buildPassword(code: string) {
  // Deterministic from the student code so it can always be recovered from stored data.
  // e.g. DRAABC123 → StudentABC123!
  return `Student${code.slice(3)}!`;
}

function isDuplicateAuthError(message?: string | null) {
  const normalized = (message ?? '').toLowerCase();
  return (
    normalized.includes('already registered') ||
    normalized.includes('duplicate key') ||
    normalized.includes('unique constraint') ||
    normalized.includes('email exists') ||
    normalized.includes('user already exists')
  );
}

function isDuplicateConstraintError(message?: string | null) {
  const normalized = (message ?? '').toLowerCase();
  return (
    normalized.includes('duplicate key') ||
    normalized.includes('unique constraint') ||
    normalized.includes('already exists') ||
    normalized.includes('duplicate')
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['teacher']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // teacher_id on profiles may not exist in all DB versions; fall through gracefully if it errors
  const teacherOwnedStudents = await adminSupabase
    .from('profiles')
    .select('id, username, email, title, level, xp, streak, age_group, student_id, account_type, writing_experience_score, daily_word_goal, daily_vocab_goal, custom_daily_goal')
    .eq('teacher_id', auth.auth.userId)
    .eq('account_type', 'student');

  const { data: classes, error: classError } = await adminSupabase
    .from('teacher_classes')
    .select('id, name')
    .eq('teacher_id', auth.auth.userId);

  if (classError) {
    return NextResponse.json({ error: classError.message || 'Could not load students.' }, { status: 500 });
  }

  const classIds = (classes ?? []).map((klass) => klass.id);
  const classLinks = classIds.length
    ? await adminSupabase.from('teacher_class_students').select('class_id, student_id').in('class_id', classIds)
    : { data: [], error: null };

  if (classLinks.error) {
    return NextResponse.json({ error: classLinks.error.message || 'Could not load students.' }, { status: 500 });
  }

  const studentIds = new Set([
    ...(teacherOwnedStudents.data ?? []).map((student) => student.id),
    ...(classLinks.data ?? []).map((link) => link.student_id),
  ]);
  const studentsQuery = studentIds.size
    ? await adminSupabase.from('profiles').select('id, username, email, title, level, xp, streak, age_group, student_id, account_type, writing_experience_score, daily_word_goal, daily_vocab_goal, custom_daily_goal').in('id', Array.from(studentIds))
    : { data: [], error: null };

  if (studentsQuery.error) {
    return NextResponse.json({ error: studentsQuery.error.message || 'Could not load students.' }, { status: 500 });
  }

  const profileMap = new Map((studentsQuery.data ?? []).map((student) => [student.id, student]));
  const classNameMap = new Map((classes ?? []).map((klass) => [klass.id, klass.name]));
  const linkedByStudent = new Map<string, string[]>();

  for (const link of classLinks.data ?? []) {
    const current = linkedByStudent.get(link.student_id) ?? [];
    current.push(classNameMap.get(link.class_id) ?? 'Class');
    linkedByStudent.set(link.student_id, current);
  }

  // Fetch auth metadata for all students to get stored passwords
  const profiles = Array.from(profileMap.values());
  const authResults = await Promise.all(
    profiles.map((p) => adminSupabase.auth.admin.getUserById(p.id)),
  );

  // For students without a stored teacher_password, reset their auth password to
  // the formula-derived value so what we display always matches what Supabase has.
  await Promise.all(
    authResults.map(async ({ data }, i) => {
      const user = data.user;
      if (!user) return;
      const profile = profiles[i];
      if (!profile.student_id) return;
      if (user.user_metadata?.teacher_password) return; // already stored, nothing to do
      const formulaPassword = buildPassword(profile.student_id);
      await adminSupabase.auth.admin.updateUserById(user.id, {
        password: formulaPassword,
        user_metadata: { ...user.user_metadata, teacher_password: formulaPassword },
      });
    }),
  );

  const students = profiles.map((profile, i) => {
    const user = authResults[i].data.user;
    const storedPassword = user?.user_metadata?.teacher_password ?? null;
    const password = storedPassword ?? (profile.student_id ? buildPassword(profile.student_id) : null);
    return {
      id: profile.id,
      username: profile.username,
      email: `${profile.username}@draftora.school`,
      password,
      title: profile.title,
      level: profile.level,
      xp: profile.xp,
      streak: profile.streak,
      age_group: profile.age_group,
      student_id: profile.student_id,
      account_type: profile.account_type,
      writing_experience_score: profile.writing_experience_score,
      daily_word_goal: profile.daily_word_goal,
      daily_vocab_goal: profile.daily_vocab_goal,
      custom_daily_goal: profile.custom_daily_goal,
      classes: linkedByStudent.get(profile.id) ?? [],
    };
  });

  return NextResponse.json({ students, classes });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRouteAuth(request, ['teacher']);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const rows = Array.isArray(body.students) ? (body.students as BulkStudentRow[]) : [];
    const className = String(body.className ?? '').trim();
    const classId = String(body.classId ?? '').trim();
    const validRows = rows
      .map((row) => ({
        firstName: String(row.firstName ?? '').trim(),
        lastName: String(row.lastName ?? '').trim(),
      }))
      .filter((row) => row.firstName && row.lastName);

    if (validRows.length === 0) {
      return NextResponse.json({ error: 'Add at least one student.' }, { status: 400 });
    }

    let resolvedClassId = classId;

    if (className && !resolvedClassId) {
      const { data: createdClass, error: classError } = await adminSupabase
        .from('teacher_classes')
        .insert({ teacher_id: auth.auth.userId, name: className, description: '' })
        .select('id')
        .maybeSingle();

      if (classError || !createdClass) {
        return NextResponse.json({ error: classError?.message || 'Could not create class.' }, { status: 500 });
      }

      resolvedClassId = createdClass.id;
    }

    if (resolvedClassId) {
      const { data: klass, error: classError } = await adminSupabase
        .from('teacher_classes')
        .select('id')
        .eq('id', resolvedClassId)
        .eq('teacher_id', auth.auth.userId)
        .maybeSingle();

      if (classError || !klass) {
        return NextResponse.json({ error: 'Class not found.' }, { status: 404 });
      }
    }

    const created: Array<{
      id: string;
      name: string;
      username: string;
      email: string;
      password: string;
      studentCode: string;
    }> = [];
    const usedUsernames = new Set<string>();

    for (const row of validRows) {
      const firstName = row.firstName;
      const lastName = row.lastName;
      const username = await buildUsername(firstName, usedUsernames);

      let createdStudent = false;
      let lastError: string | null = null;

      for (let attempt = 0; attempt < 5 && !createdStudent; attempt += 1) {
        const studentCode = await generateUniqueStudentCode();
        const email = buildEmail(studentCode);
        const password = buildPassword(studentCode);

        const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { username, account_type: 'student', teacher_password: password },
        });

        if (authError || !authUser.user) {
          lastError = authError?.message || 'Could not create student account.';
          if (!isDuplicateAuthError(lastError)) {
            break;
          }
          continue;
        }

        const authUserId = authUser.user.id;
        const { error: profileError } = await adminSupabase.from('profiles').upsert({
          id: authUserId,
          username,
          email,
          account_type: 'student',
          student_id: studentCode,
        }, { onConflict: 'id' });

        if (profileError) {
          lastError = profileError.message || 'Could not create student profile.';
          await adminSupabase.auth.admin.deleteUser(authUserId);
          if (isDuplicateConstraintError(lastError)) {
            continue;
          }
          break;
        }

        if (resolvedClassId) {
          const { error: linkError } = await adminSupabase.from('teacher_class_students').insert({
            class_id: resolvedClassId,
            student_id: authUserId,
          });

          if (linkError && !isDuplicateConstraintError(linkError.message)) {
            lastError = linkError.message || 'Could not link student to class.';
            await adminSupabase.auth.admin.deleteUser(authUserId);
            await adminSupabase.from('profiles').delete().eq('id', authUserId);
            break;
          }
        }

        createdStudent = true;
        created.push({
          id: authUserId,
          name: `${firstName} ${lastName}`.trim(),
          username,
          email,
          password,
          studentCode,
        });
      }

      if (!createdStudent) {
        return NextResponse.json({ error: lastError || 'Could not create student account.' }, { status: 500 });
      }
    }

    return NextResponse.json({ students: created, classId: resolvedClassId || null });
  } catch (error) {
    console.error('teacher students bulk generation error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not generate student accounts.' }, { status: 500 });
  }
}
