import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireRouteAuth } from '@/app/lib/server-auth';
import {
  createDefaultWeeklyPlan,
  formatHomeworkDate,
  getHomeworkDayKey,
  normalizeHomeworkPayload,
  normalizeWeeklyPlan,
  type DayHomeworkPlan,
  type HomeworkPayload,
  type HomeworkPerformanceDay,
  type HomeworkPerformanceSummary,
  type HomeworkProgressBreakdown,
  type HomeworkTaskItem,
  type WeeklyHomeworkPlan,
  type WritingHomeworkConfig,
} from '@/app/lib/homework';

type DailyStatsRow = {
  date: string;
  words_written: number;
  vocab_words_learned: number;
  custom_goal_completed: boolean;
};

type WritingRow = {
  id: string;
  category: string;
  word_count: number;
  created_at: string;
};

type AssignmentRow = {
  id: string;
  parent_id: string;
  student_id: string;
  assigned_date: string;
  due_date: string;
  homework_payload: HomeworkPayload;
  created_at: string;
};

type TimetableRow = {
  weekly_plan: WeeklyHomeworkPlan;
  updated_at: string;
};

type TimetablePayload = {
  weeklyPlan: WeeklyHomeworkPlan;
  startDate: string | null;
};

type SplitKind = 'writing' | 'vocab';

function jsonNoStore(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      ...(init?.headers ?? {}),
    },
  });
}

function getLocalDateKey(date = new Date()) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');
}

function getTodayKey() {
  return getLocalDateKey();
}

function getDateRange(days: number, anchorDate?: string) {
  const anchor = anchorDate ? new Date(`${anchorDate}T00:00:00`) : new Date();
  return Array.from({ length: days }, (_, idx) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - (days - 1 - idx));
    return getLocalDateKey(d);
  });
}

function getFutureDates(days: number, startOffset = 1, anchorDate?: string) {
  const anchor = anchorDate ? new Date(`${anchorDate}T00:00:00`) : new Date();
  return Array.from({ length: days }, (_, idx) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + startOffset + idx);
    return getLocalDateKey(d);
  });
}

function addDaysToDateKey(dateKey: string, offset: number) {
  const base = new Date(`${dateKey}T00:00:00`);
  base.setDate(base.getDate() + offset);
  return getLocalDateKey(base);
}

function weekdayLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
}

function normalizeWritingCategory(category: string) {
  const raw = category.trim();
  const lower = raw.toLowerCase();
  if (lower.includes('creative') || lower.includes('narrative') || lower.includes('story')) return 'Creative Story';
  if (lower.includes('persuasive') || lower.includes('argument') || lower.includes('opinion')) return 'Persuasive Essay';
  if (lower.includes('blog')) return 'Blog Entry';
  if (lower.includes('email')) return 'Email';
  if (lower.includes('feature')) return 'Feature Article';
  if (lower.includes('poetry') || lower.includes('poem')) return 'Poetry';
  if (lower.includes('free writing')) return 'Free Writing';
  if (lower.includes('personal') || lower.includes('diary') || lower.includes('reflect')) return 'Personal';
  if (lower.includes('review')) return 'Other';
  if (lower.includes('speech')) return 'Other';
  if (lower.includes('descriptive')) return 'Other';
  if (lower.includes('informational')) return 'Other';
  if (lower.includes('expository')) return 'Other';
  if (lower.includes('literary')) return 'Other';
  return raw || 'Other';
}

function getWritingRequiredPieces(cfg: WritingHomeworkConfig | null) {
  if (!cfg) return 0;
  const byType = cfg.piecesByType ?? {};
  const byTypeTotal = Object.values(byType).reduce((sum, count) => sum + Math.max(0, count), 0);
  const legacyTotal = Math.max(0, (cfg.creativePieces ?? 0) + (cfg.persuasivePieces ?? 0));
  return Math.max(0, cfg.totalPieces || byTypeTotal || legacyTotal);
}

function getRequiredPiecesByType(cfg: WritingHomeworkConfig | null) {
  if (!cfg) return {} as Record<string, number>;
  const out: Record<string, number> = { ...(cfg.piecesByType ?? {}) };
  if ((cfg.creativePieces ?? 0) > 0 && !out['Creative Story']) out['Creative Story'] = cfg.creativePieces ?? 0;
  if ((cfg.persuasivePieces ?? 0) > 0 && !out['Persuasive Essay']) out['Persuasive Essay'] = cfg.persuasivePieces ?? 0;
  return out;
}

function getCompletedWritingPieces(writings: WritingRow[], cfg: WritingHomeworkConfig | null) {
  if (!cfg) return { total: 0, byType: {} as Record<string, number> };

  const requiredByType = getRequiredPiecesByType(cfg);
  const requiredTotal = getWritingRequiredPieces(cfg);
  const requiredByTypeTotal = Object.values(requiredByType).reduce((sum, count) => sum + count, 0);
  const extraAnyTypeAllowance = Math.max(0, requiredTotal - requiredByTypeTotal);
  const minWordsByType = cfg.minWordsByType ?? {};
  let total = 0;
  let extraUsed = 0;
  const byType: Record<string, number> = {};

  for (const writing of writings) {
    const normalizedCategory = normalizeWritingCategory(writing.category);
    const minNeeded = (minWordsByType[normalizedCategory]
      ?? (normalizedCategory === 'Creative Story' ? cfg.minWordsCreative : null)
      ?? (normalizedCategory === 'Persuasive Essay' ? cfg.minWordsPersuasive : null)
      ?? cfg.minWordsGeneral
      ?? 0);
    if (minNeeded > 0 && writing.word_count < minNeeded) continue;

    if (requiredByType[normalizedCategory]) {
      if ((byType[normalizedCategory] ?? 0) >= requiredByType[normalizedCategory]) continue;
    } else if (requiredByTypeTotal > 0) {
      if (extraUsed >= extraAnyTypeAllowance) continue;
      extraUsed += 1;
    }

    if (total >= requiredTotal) {
      continue;
    }

    total += 1;
    byType[normalizedCategory] = (byType[normalizedCategory] ?? 0) + 1;
  }

  return { total, byType };
}

function evaluateTaskProgress(task: { writing: WritingHomeworkConfig | null; vocab: HomeworkPayload['vocab'] | null }, stats: DailyStatsRow | null, writings: WritingRow[]): HomeworkProgressBreakdown {
  const writingRequired = getWritingRequiredPieces(task.writing);
  const writingDoneParts = getCompletedWritingPieces(writings, task.writing);
  const writingCompleted = Math.min(writingRequired, writingDoneParts.total);

  const vocabRequired = task.vocab?.wordsToLearn ?? 0;
  const vocabCompleted = Math.min(vocabRequired, stats?.vocab_words_learned ?? 0);

  const drillRequired = Boolean(task.vocab?.requireDrill);
  const drillCompleted = drillRequired ? Boolean(stats?.custom_goal_completed) : false;

  return {
    writingCompleted,
    writingRequired,
    vocabCompleted,
    vocabRequired,
    drillRequired,
    drillCompleted,
  };
}

function completionPctForBreakdown(breakdown: HomeworkProgressBreakdown) {
  const total = breakdown.writingRequired + breakdown.vocabRequired + (breakdown.drillRequired ? 1 : 0);
  const completed = breakdown.writingCompleted + breakdown.vocabCompleted + (breakdown.drillRequired && breakdown.drillCompleted ? 1 : 0);
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}

function buildTaskTitle(payload: HomeworkPayload) {
  const parts: string[] = [];
  if (payload.writing) {
    const w = payload.writing;
    const byType = getRequiredPiecesByType(w);
    const entries = Object.entries(byType)
      .filter(([, count]) => count > 0)
      .sort(([a], [b]) => a.localeCompare(b));
    if (entries.length > 0) {
      const styleLabel = entries
        .map(([type, count]) => {
          const normalizedType = type.trim().toLowerCase();
          const writingWord = count === 1 ? 'writing' : 'writings';
          return `${count} ${normalizedType} ${writingWord}`;
        })
        .join(' + ');
      parts.push(styleLabel);
    } else {
      const pieces = getWritingRequiredPieces(w);
      if (pieces > 0) parts.push(`${pieces} writing ${pieces === 1 ? 'piece' : 'pieces'}`);
    }
  }
  if (payload.vocab) {
    const words = payload.vocab.wordsToLearn;
    if (words > 0) parts.push(`${words} vocab words`);
    if (payload.vocab.requireDrill) parts.push('drill');
  }
  if (parts.length === 0) return 'Homework task';
  return parts.join(' + ');
}

function splitHomeworkPayload(payload: HomeworkPayload): Array<{ kind: SplitKind; payload: HomeworkPayload }> {
  const parts: Array<{ kind: SplitKind; payload: HomeworkPayload }> = [];
  if (payload.writing) {
    parts.push({
      kind: 'writing',
      payload: { writing: payload.writing, vocab: null, parentNotes: payload.parentNotes },
    });
  }
  if (payload.vocab) {
    parts.push({
      kind: 'vocab',
      payload: { writing: null, vocab: payload.vocab, parentNotes: payload.parentNotes },
    });
  }
  return parts;
}

async function canParentAccessStudent(parentId: string, studentId: string) {
  const { data } = await adminSupabase
    .from('parent_student_links')
    .select('id')
    .eq('parent_id', parentId)
    .eq('student_id', studentId)
    .maybeSingle();
  return Boolean(data);
}

async function loadTimetable(parentId: string, studentId: string): Promise<TimetablePayload> {
  const { data } = await (adminSupabase as any)
    .from('parent_homework_timetables')
    .select('weekly_plan, updated_at')
    .eq('parent_id', parentId)
    .eq('student_id', studentId)
    .maybeSingle();

  const row = (data ?? null) as TimetableRow | null;
  return {
    weeklyPlan: normalizeWeeklyPlan(row?.weekly_plan ?? createDefaultWeeklyPlan()),
    startDate: row?.updated_at ? row.updated_at.slice(0, 10) : null,
  };
}

function buildTimetableTasks(date: string, dayPlan: DayHomeworkPlan): HomeworkTaskItem[] {
  const payload: HomeworkPayload = {
    writing: dayPlan.writing,
    vocab: dayPlan.vocab,
    parentNotes: dayPlan.notes,
  };

  if (!payload.writing && !payload.vocab && !payload.parentNotes) return [];

  return splitHomeworkPayload(payload).map(({ kind, payload: splitPayload }) => ({
    id: `tt-${date}::${kind}`,
    title: buildTaskTitle(splitPayload),
    source: 'timetable',
    dueDate: date,
    writing: splitPayload.writing,
    vocab: splitPayload.vocab,
    notes: splitPayload.parentNotes,
    completionPct: 0,
    breakdown: {
      writingCompleted: 0,
      writingRequired: getWritingRequiredPieces(splitPayload.writing),
      vocabCompleted: 0,
      vocabRequired: splitPayload.vocab?.wordsToLearn ?? 0,
      drillCompleted: false,
      drillRequired: Boolean(splitPayload.vocab?.requireDrill),
    },
  }));
}

async function buildStudentHomeworkSnapshot(studentId: string, todayOverride?: string) {
  const today = todayOverride ?? getTodayKey();
  const start14 = getDateRange(14, today)[0];
  const windowEnd = addDaysToDateKey(today, 6);

  const [statsRes, writingsRes, assignmentsRes, timetableRes] = await Promise.all([
    adminSupabase.from('daily_stats').select('date, words_written, vocab_words_learned, custom_goal_completed').eq('user_id', studentId).gte('date', start14),
    adminSupabase.from('writings').select('id, category, word_count, created_at').eq('user_id', studentId).gte('created_at', `${start14}T00:00:00`).order('created_at', { ascending: false }),
    (adminSupabase as any)
      .from('parent_homework_assignments')
      .select('id, parent_id, student_id, assigned_date, due_date, homework_payload, created_at')
      .eq('student_id', studentId)
      .gte('due_date', start14)
      .order('created_at', { ascending: false }),
    (adminSupabase as any)
      .from('parent_homework_timetables')
      .select('weekly_plan, parent_id, updated_at')
      .eq('student_id', studentId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (statsRes.error || writingsRes.error || assignmentsRes.error) {
    throw new Error('Could not load homework data.');
  }

  const stats = (statsRes.data ?? []) as DailyStatsRow[];
  const writings = (writingsRes.data ?? []) as WritingRow[];
  const assignments = ((assignmentsRes.data ?? []) as AssignmentRow[])
    .map((row) => ({
      ...row,
      homework_payload: normalizeHomeworkPayload(row.homework_payload),
    }));

  const weeklyPlan = normalizeWeeklyPlan((timetableRes.data as { weekly_plan?: unknown } | null)?.weekly_plan ?? createDefaultWeeklyPlan());

  const statsByDate = new Map(stats.map((row) => [row.date, row]));
  const writingsByDate = new Map<string, WritingRow[]>();
  for (const writing of writings) {
    const key = writing.created_at.slice(0, 10);
    const arr = writingsByDate.get(key) ?? [];
    arr.push(writing);
    writingsByDate.set(key, arr);
  }

  const todayDate = new Date(`${today}T00:00:00`);
  const todayKey = getHomeworkDayKey(todayDate);
  const todayPlanTasks = buildTimetableTasks(today, weeklyPlan[todayKey]);

  const currentAssignments = assignments.filter((a) => a.due_date === today);
  const upcomingAssignments = assignments
    .filter((a) => a.due_date > today && a.due_date <= windowEnd)
    .slice(0, 8);

  const todayStats = statsByDate.get(today) ?? null;
  const todayWritings = writingsByDate.get(today) ?? [];

  const todayTasks: HomeworkTaskItem[] = [];

  for (const row of currentAssignments) {
    for (const { kind, payload } of splitHomeworkPayload(row.homework_payload)) {
      const breakdown = evaluateTaskProgress({ writing: payload.writing, vocab: payload.vocab }, todayStats, todayWritings);
      todayTasks.push({
        id: `${row.id}::${kind}`,
        title: buildTaskTitle(payload),
        source: 'one_time',
        dueDate: row.due_date,
        assignedDate: row.assigned_date,
        writing: payload.writing,
        vocab: payload.vocab,
        notes: payload.parentNotes,
        breakdown,
        completionPct: completionPctForBreakdown(breakdown),
      });
    }
  }

  for (const todayPlanTask of todayPlanTasks) {
    const breakdown = evaluateTaskProgress({ writing: todayPlanTask.writing, vocab: todayPlanTask.vocab }, todayStats, todayWritings);
    todayTasks.push({ ...todayPlanTask, breakdown, completionPct: completionPctForBreakdown(breakdown) });
  }

  const upcomingFromAssignments = upcomingAssignments.flatMap((row) =>
    splitHomeworkPayload(row.homework_payload).map(({ kind, payload }) => ({
      id: `${row.id}::${kind}`,
      title: buildTaskTitle(payload),
      source: 'one_time' as const,
      dueDate: row.due_date,
      assignedDate: row.assigned_date,
      writing: payload.writing,
      vocab: payload.vocab,
      notes: payload.parentNotes,
      breakdown: {
        writingCompleted: 0,
        writingRequired: getWritingRequiredPieces(payload.writing),
        vocabCompleted: 0,
        vocabRequired: payload.vocab?.wordsToLearn ?? 0,
        drillRequired: Boolean(payload.vocab?.requireDrill),
        drillCompleted: false,
      },
      completionPct: 0,
    })),
  );

  const upcomingFromTimetable = getFutureDates(6, 1, today)
    .flatMap((date) => {
      const dayKey = getHomeworkDayKey(new Date(`${date}T00:00:00`));
      const timetableTasks = buildTimetableTasks(date, weeklyPlan[dayKey]);
      return timetableTasks.map((timetableTask) => ({
        ...timetableTask,
        breakdown: {
          writingCompleted: 0,
          writingRequired: timetableTask.breakdown.writingRequired,
          vocabCompleted: 0,
          vocabRequired: timetableTask.breakdown.vocabRequired,
          drillCompleted: false,
          drillRequired: timetableTask.breakdown.drillRequired,
        },
        completionPct: 0,
      } as HomeworkTaskItem));
    })
    .filter((task): task is HomeworkTaskItem => Boolean(task));

  const upcoming = [...upcomingFromAssignments, ...upcomingFromTimetable]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 20);

  return {
    today,
    weeklyPlan,
    todayTasks,
    upcoming,
    todayStats,
    writingsByDate,
    statsByDate,
    assignments,
  };
}

function buildPerformance(days: string[], weeklyPlan: WeeklyHomeworkPlan, assignments: AssignmentRow[], statsByDate: Map<string, DailyStatsRow>, writingsByDate: Map<string, WritingRow[]>, timetableStartDate: string | null) {
  const dayRows: HomeworkPerformanceDay[] = [];

  let totalRate = 0;
  let daysWithAssigned = 0;
  let totalWritingCompleted = 0;
  let totalWritingRequired = 0;
  let totalVocabCompleted = 0;
  let totalVocabRequired = 0;

  let runningStreak = 0;
  let bestStreak = 0;

  for (const date of days) {
    const dow = getHomeworkDayKey(new Date(`${date}T00:00:00`));
    const dayPlan = weeklyPlan[dow];
    const dayTasks: HomeworkTaskItem[] = [];

    if (!timetableStartDate || date >= timetableStartDate) {
      const timetableTasks = buildTimetableTasks(date, dayPlan);
      for (const timetableTask of timetableTasks) {
        const breakdown = evaluateTaskProgress({ writing: timetableTask.writing, vocab: timetableTask.vocab }, statsByDate.get(date) ?? null, writingsByDate.get(date) ?? []);
        dayTasks.push({ ...timetableTask, breakdown, completionPct: completionPctForBreakdown(breakdown) });
      }
    }

    const oneTimeTasks = assignments.filter((a) => a.due_date === date);
    for (const row of oneTimeTasks) {
      const payload = normalizeHomeworkPayload(row.homework_payload);
      for (const { kind, payload: splitPayload } of splitHomeworkPayload(payload)) {
        const breakdown = evaluateTaskProgress({ writing: splitPayload.writing, vocab: splitPayload.vocab }, statsByDate.get(date) ?? null, writingsByDate.get(date) ?? []);
        dayTasks.push({
          id: `${row.id}::${kind}`,
          title: buildTaskTitle(splitPayload),
          source: 'one_time',
          dueDate: row.due_date,
          assignedDate: row.assigned_date,
          writing: splitPayload.writing,
          vocab: splitPayload.vocab,
          notes: splitPayload.parentNotes,
          breakdown,
          completionPct: completionPctForBreakdown(breakdown),
        });
      }
    }

    const assignedTotals = dayTasks.reduce(
      (acc, task) => {
        acc.writingRequired += task.breakdown.writingRequired;
        acc.writingCompleted += task.breakdown.writingCompleted;
        acc.vocabRequired += task.breakdown.vocabRequired + (task.breakdown.drillRequired ? 1 : 0);
        acc.vocabCompleted += task.breakdown.vocabCompleted + (task.breakdown.drillRequired && task.breakdown.drillCompleted ? 1 : 0);
        return acc;
      },
      { writingRequired: 0, writingCompleted: 0, vocabRequired: 0, vocabCompleted: 0 },
    );

    const completionRate = (() => {
      const writingRate = assignedTotals.writingRequired > 0
        ? assignedTotals.writingCompleted / assignedTotals.writingRequired
        : null;
      const vocabRate = assignedTotals.vocabRequired > 0
        ? assignedTotals.vocabCompleted / assignedTotals.vocabRequired
        : null;

      if (writingRate === null && vocabRate === null) return 0;
      if (writingRate === null) return Math.round((vocabRate ?? 0) * 100);
      if (vocabRate === null) return Math.round((writingRate ?? 0) * 100);
      return Math.round((writingRate * 0.5 + vocabRate * 0.5) * 100);
    })();

    if (dayTasks.length === 0) {
      continue;
    }

    daysWithAssigned += 1;
    totalRate += completionRate;
    totalWritingRequired += assignedTotals.writingRequired;
    totalWritingCompleted += assignedTotals.writingCompleted;
    totalVocabRequired += assignedTotals.vocabRequired;
    totalVocabCompleted += assignedTotals.vocabCompleted;

    if (completionRate >= 80) {
      runningStreak += 1;
      bestStreak = Math.max(bestStreak, runningStreak);
    } else {
      runningStreak = 0;
    }

    dayRows.push({
      date,
      weekday: weekdayLabel(date),
      assigned: dayTasks,
      completionRate,
      writingCompleted: assignedTotals.writingCompleted,
      writingRequired: assignedTotals.writingRequired,
      vocabCompleted: assignedTotals.vocabCompleted,
      vocabRequired: assignedTotals.vocabRequired,
    });
  }

  const writingRate = totalWritingRequired > 0 ? Math.round((totalWritingCompleted / totalWritingRequired) * 100) : 0;
  const vocabRate = totalVocabRequired > 0 ? Math.round((totalVocabCompleted / totalVocabRequired) * 100) : 0;

  const strongestArea = writingRate >= vocabRate ? 'Writing consistency' : 'Vocabulary follow-through';
  const improvementArea = writingRate < vocabRate
    ? 'Writing volume on assigned days'
    : 'Vocabulary target completion';

  const summary: HomeworkPerformanceSummary = {
    twoWeekCompletionRate: daysWithAssigned > 0 ? Math.round(totalRate / daysWithAssigned) : 0,
    writingCompletionRate: writingRate,
    vocabCompletionRate: vocabRate,
    strongestArea,
    improvementArea,
    consistencyStreak: bestStreak,
    insights: [
      daysWithAssigned > 0
        ? `Homework was scheduled on ${daysWithAssigned} of the last 14 days, with an average completion of ${Math.round(totalRate / daysWithAssigned)}%.`
        : 'No homework was scheduled in the last 14 days, so trend analysis is not yet available.',
      writingRate >= 70
        ? `Writing tasks are being completed reliably (${writingRate}%), which shows strong momentum in written practice.`
        : `Writing completion is ${writingRate}%, suggesting piece targets may be too high or not yet habit-forming.`,
      vocabRate >= 70
        ? `Vocabulary commitments are translating into solid execution (${vocabRate}%), including drill expectations where assigned.`
        : `Vocabulary completion is ${vocabRate}%, and drill completion appears to be the main bottleneck.`,
      bestStreak >= 3
        ? `There is a positive consistency trend with a ${bestStreak}-day high-completion run in the last two weeks.`
        : 'Consistency is currently fragmented, with fewer than three consecutive high-completion days.',
    ],
    nextSteps: [
      writingRate < 70
        ? 'Reduce writing piece count on weekday nights and keep minimum word targets steady to improve completion confidence.'
        : 'Maintain current writing volume and raise one minimum word target by 10-15% for gradual growth.',
      vocabRate < 70
        ? 'Pair vocab targets with shorter daily counts and keep drills on only 2-3 days this week.'
        : 'Introduce one advanced vocab day with drill required to build retrieval endurance.',
      'Review due-date clustering and spread larger assignments so no single day carries both heavy writing and high vocab load.',
    ],
  };

  return { dayRows, summary };
}

async function handleParentGet(request: NextRequest, userId: string) {
  const studentId = new URL(request.url).searchParams.get('studentId')?.trim() || '';
  if (!studentId) {
    return NextResponse.json({ error: 'Missing studentId.' }, { status: 400 });
  }

  const allowed = await canParentAccessStudent(userId, studentId);
  if (!allowed) {
    return NextResponse.json({ error: 'You cannot view that student.' }, { status: 403 });
  }

  const todayOverride = (() => {
    const value = new URL(request.url).searchParams.get('today');
    return typeof value === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) ? value : undefined;
  })();

  const [studentRes, assignmentsRes, timetablePayload, snapshot] = await Promise.all([
    adminSupabase.from('profiles').select('id, username, level, streak, title, age_group').eq('id', studentId).maybeSingle(),
    (adminSupabase as any)
      .from('parent_homework_assignments')
      .select('id, parent_id, student_id, assigned_date, due_date, homework_payload, created_at')
      .eq('parent_id', userId)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false }),
    loadTimetable(userId, studentId),
    buildStudentHomeworkSnapshot(studentId, todayOverride),
  ]);

  if (studentRes.error || !studentRes.data || assignmentsRes.error) {
    return NextResponse.json({ error: 'Could not load homework workspace.' }, { status: 500 });
  }

  const assignments = ((assignmentsRes.data ?? []) as AssignmentRow[]).map((row) => ({
    ...row,
    homework_payload: normalizeHomeworkPayload(row.homework_payload),
  }));

  const twoWeekDates = getDateRange(14, todayOverride);
  const performance = buildPerformance(twoWeekDates, timetablePayload.weeklyPlan, assignments, snapshot.statsByDate, snapshot.writingsByDate, timetablePayload.startDate);

  const currentDate = todayOverride ?? getTodayKey();
  const recentAssignments = assignments
    .filter((row) => row.due_date >= currentDate)
    .slice(0, 8)
    .map((row) => ({
      id: row.id,
      assignedDate: row.assigned_date,
      dueDate: row.due_date,
      title: buildTaskTitle(row.homework_payload),
      payload: row.homework_payload,
      dueLabel: formatHomeworkDate(row.due_date),
    }));

  return jsonNoStore({
    student: studentRes.data,
    timetable: timetablePayload.weeklyPlan,
    recentAssignments,
    todayTasks: snapshot.todayTasks,
    upcoming: snapshot.upcoming,
    performance: {
      days: performance.dayRows,
      summary: performance.summary,
    },
  });
}

async function handleStudentGet(userId: string, todayOverride?: string) {
  const snapshot = await buildStudentHomeworkSnapshot(userId, todayOverride);
  const overallPct = snapshot.todayTasks.length > 0
    ? Math.round(snapshot.todayTasks.reduce((sum, task) => sum + task.completionPct, 0) / snapshot.todayTasks.length)
    : 0;

  return jsonNoStore({
    today: snapshot.today,
    overallPct,
    todayTasks: snapshot.todayTasks,
    upcoming: snapshot.upcoming,
  });
}

export async function GET(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['parent', 'student']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const todayOverride = (() => {
      const value = new URL(request.url).searchParams.get('today');
      return typeof value === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) ? value : undefined;
    })();

    if (auth.auth.profile.account_type === 'parent') {
      return await handleParentGet(request, auth.auth.userId);
    }

    return await handleStudentGet(auth.auth.userId, todayOverride);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load homework.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['parent']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  const rawAssignedDates = Array.isArray(body.assignedDates) ? body.assignedDates : [];
  const assignedDates = Array.from(new Set(rawAssignedDates
    .map((value: unknown) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value: string) => value.length > 0)));
  const assignedDate = typeof body.assignedDate === 'string' ? body.assignedDate : getTodayKey();
  const payload = normalizeHomeworkPayload(body.payload);

  if (!studentId) {
    return NextResponse.json({ error: 'Missing studentId.' }, { status: 400 });
  }

  if (!payload.writing && !payload.vocab) {
    return NextResponse.json({ error: 'Add at least one homework category.' }, { status: 400 });
  }

  const datesToInsert = assignedDates.length > 0 ? assignedDates : [assignedDate];
  const rowsToInsert = datesToInsert.map((date) => ({
    parent_id: auth.auth.userId,
    student_id: studentId,
    assigned_date: date,
    due_date: date,
    homework_payload: payload,
  }));

  const allowed = await canParentAccessStudent(auth.auth.userId, studentId);
  if (!allowed) {
    return NextResponse.json({ error: 'You cannot assign homework to that student.' }, { status: 403 });
  }

  const { error } = await (adminSupabase as any)
    .from('parent_homework_assignments')
    .insert(rowsToInsert);

  if (error) {
    return NextResponse.json({ error: error.message || 'Could not save homework assignment.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['parent']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  const weeklyPlan = normalizeWeeklyPlan(body.weeklyPlan);

  if (!studentId) {
    return NextResponse.json({ error: 'Missing studentId.' }, { status: 400 });
  }

  const allowed = await canParentAccessStudent(auth.auth.userId, studentId);
  if (!allowed) {
    return NextResponse.json({ error: 'You cannot edit timetable for that student.' }, { status: 403 });
  }

  const { error } = await (adminSupabase as any)
    .from('parent_homework_timetables')
    .upsert(
      {
        parent_id: auth.auth.userId,
        student_id: studentId,
        weekly_plan: weeklyPlan,
      },
      { onConflict: 'parent_id,student_id' },
    );

  if (error) {
    return NextResponse.json({ error: error.message || 'Could not save timetable.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, weeklyPlan });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['parent']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const query = new URL(request.url).searchParams;
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const studentId = (typeof body.studentId === 'string' ? body.studentId : query.get('studentId') || '').trim();
  const assignmentId = (typeof body.assignmentId === 'string' ? body.assignmentId : query.get('assignmentId') || '').trim();
  const splitKindRaw = typeof body.splitKind === 'string' ? body.splitKind : query.get('splitKind') || '';
  const splitKind = splitKindRaw === 'writing' || splitKindRaw === 'vocab' ? splitKindRaw : null;

  if (!studentId || !assignmentId) {
    return NextResponse.json({ error: 'Missing studentId or assignmentId.' }, { status: 400 });
  }

  const allowed = await canParentAccessStudent(auth.auth.userId, studentId);
  if (!allowed) {
    return NextResponse.json({ error: 'You cannot delete homework for that student.' }, { status: 403 });
  }

  if (splitKind) {
    const { data: existingRow, error: existingError } = await (adminSupabase as any)
      .from('parent_homework_assignments')
      .select('id, homework_payload')
      .eq('id', assignmentId)
      .eq('student_id', studentId)
      .eq('parent_id', auth.auth.userId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message || 'Could not find homework assignment.' }, { status: 500 });
    }

    if (!existingRow) {
      return NextResponse.json({ error: 'Homework assignment not found.' }, { status: 404 });
    }

    const payload = normalizeHomeworkPayload(existingRow.homework_payload);
    if (splitKind === 'writing') {
      payload.writing = null;
    } else {
      payload.vocab = null;
    }

    if (!payload.writing && !payload.vocab) {
      const { error, data } = await (adminSupabase as any)
        .from('parent_homework_assignments')
        .delete()
        .eq('id', assignmentId)
        .eq('student_id', studentId)
        .eq('parent_id', auth.auth.userId)
        .select('id');

      if (error) {
        return NextResponse.json({ error: error.message || 'Could not delete homework assignment.' }, { status: 500 });
      }

      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Homework assignment not found.' }, { status: 404 });
      }

      return NextResponse.json({ ok: true, mode: 'deleted_assignment' });
    }

    const { error: updateError } = await (adminSupabase as any)
      .from('parent_homework_assignments')
      .update({ homework_payload: payload })
      .eq('id', assignmentId)
      .eq('student_id', studentId)
      .eq('parent_id', auth.auth.userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message || 'Could not update homework assignment.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mode: 'updated_assignment', splitKind });
  }

  const { error, data } = await (adminSupabase as any)
    .from('parent_homework_assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('student_id', studentId)
    .eq('parent_id', auth.auth.userId)
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message || 'Could not delete homework assignment.' }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Homework assignment not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
