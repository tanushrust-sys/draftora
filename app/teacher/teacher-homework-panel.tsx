'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Plus,
  Users,
  X,
} from 'lucide-react';
import { SectionTitle } from '@/app/components/workspace-controls';
import { authFetchJson } from '@/app/lib/auth-fetch';
import {
  HOMEWORK_DAY_KEYS,
  WRITING_TYPE_OPTIONS,
  createDefaultVocabConfig,
  createDefaultWeeklyPlan,
  createDefaultWritingConfig,
  type HomeworkDayKey,
  type WeeklyHomeworkPlan,
} from '@/app/lib/homework';
import type { WorkspaceMode } from '@/app/lib/workspace-mode';
import type { WorkspacePalette } from '@/app/lib/workspace-palette';

type TeacherStudent = {
  id: string;
  username: string;
  title: string;
  level: number;
  xp: number;
  streak: number;
  age_group: string;
  student_id: string | null;
};

type TeacherClass = {
  id: string;
  name: string;
  description: string;
  studentCount: number;
  students: Array<{
    studentId: string;
    profile: Pick<TeacherStudent, 'id' | 'username' | 'title' | 'level' | 'xp' | 'streak' | 'age_group' | 'student_id'> | null;
  }>;
};

type TargetMode = 'class' | 'students';
type HomeworkTab = 'assign' | 'timetable' | 'currentFuture' | 'review';
type WizardStep = 1 | 2 | 3 | 4 | 5;
type TimetableStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

type HomeworkAssignment = {
  id: string;
  dueDates: string[];
  classId: string;
  className: string;
  studentIds: string[];
  targetLabel: string;
  writing: {
    piecesByType: Record<string, number>;
    minWordsByType: Record<string, number>;
    notes: string;
  } | null;
  vocab: {
    wordsToLearn: number;
    requireDrill: boolean;
    notes: string;
  } | null;
  note: string;
  createdAt: string;
  recurrence?: {
    type: 'weekly';
    startDate: string;
    active: boolean;
  };
};

type ReviewClassCard = {
  classId: string;
  className: string;
  studentCount: number;
};

type ReviewStudentCard = {
  studentId: string;
  name: string;
  writingSubmitted: number;
  avgWordsPerWriting: number;
  vocabAdded: number;
  lastActiveAt: string | null;
  overall: number;
};

const MOCK_CLASSES = [
  { id: 'class_6a', name: 'Class 6A', studentIds: ['s1', 's2', 's3', 's4'] },
  { id: 'class_6b', name: 'Class 6B', studentIds: ['s5', 's6', 's7', 's8'] },
  { id: 'class_7w', name: 'Class 7 Writing Group', studentIds: ['s9', 's10', 's11', 's12'] },
];

const MOCK_STUDENTS = [
  { id: 's1', username: 'Ava Patel' },
  { id: 's2', username: 'Noah Wilson' },
  { id: 's3', username: 'Mia Chen' },
  { id: 's4', username: 'Leo Smith' },
  { id: 's5', username: 'Sophie Brown' },
  { id: 's6', username: 'Ethan Nguyen' },
  { id: 's7', username: 'Grace Kim' },
  { id: 's8', username: 'Olivia Martin' },
  { id: 's9', username: 'Lucas White' },
  { id: 's10', username: 'Emma Taylor' },
  { id: 's11', username: 'James Lee' },
  { id: 's12', username: 'Ella Scott' },
];

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2, 10)}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function ymd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseYmd(v: string) {
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function fmtDate(v: string) {
  return parseYmd(v).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtMonth(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function startMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonth(date: Date, diff: number) {
  return new Date(date.getFullYear(), date.getMonth() + diff, 1);
}

function addDays(baseYmd: string, diff: number) {
  const base = parseYmd(baseYmd);
  base.setDate(base.getDate() + diff);
  return ymd(base);
}

function makeCalendarCells(month: Date) {
  const first = startMonth(month);
  const firstDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: Array<{ key: string; day: number; inMonth: boolean }> = [];
  for (let i = 0; i < firstDay; i += 1) {
    const d = new Date(first.getFullYear(), first.getMonth(), 1 - (firstDay - i));
    cells.push({ key: ymd(d), day: d.getDate(), inMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i += 1) {
    const d = new Date(first.getFullYear(), first.getMonth(), i);
    cells.push({ key: ymd(d), day: i, inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const d = new Date(first.getFullYear(), first.getMonth(), daysInMonth + (cells.length - (firstDay + daysInMonth)) + 1);
    cells.push({ key: ymd(d), day: d.getDate(), inMonth: false });
  }
  return cells;
}

function cloneDay(day: WeeklyHomeworkPlan[HomeworkDayKey]): WeeklyHomeworkPlan[HomeworkDayKey] {
  return {
    writing: day.writing
      ? {
          ...day.writing,
          piecesByType: { ...(day.writing.piecesByType ?? {}) },
          minWordsByType: { ...(day.writing.minWordsByType ?? {}) },
        }
      : null,
    vocab: day.vocab ? { ...day.vocab } : null,
    notes: day.notes ?? '',
  };
}

function scoreStatus(overall: number) {
  if (overall >= 88) return { label: 'Excellent', tone: '#34d399' };
  if (overall >= 72) return { label: 'On track', tone: '#67e8f9' };
  return { label: 'Needs support', tone: '#f59e0b' };
}

function rankEstimate(studentOverall: number, classOverall: number[]) {
  const sorted = [...classOverall].sort((a, b) => b - a);
  const idx = sorted.findIndex((v) => studentOverall >= v);
  const pct = idx === -1 ? 0 : ((sorted.length - idx) / Math.max(1, sorted.length)) * 100;
  if (pct >= 99) return 'Top 1% of class';
  if (pct >= 90) return 'Top 10% of class';
  const avg = sorted.reduce((s, v) => s + v, 0) / Math.max(1, sorted.length);
  if (studentOverall >= avg + 6) return 'Above class average';
  if (studentOverall >= avg - 6) return 'Around class average';
  return 'Needs support compared with class average';
}

function aiReviewText(data: ReviewStudentCard, classOverall: number[]) {
  const writingPct = clamp(Math.round((data.writingSubmitted / 3) * 100), 0, 100);
  const vocabPct = clamp(Math.round((data.vocabAdded / 14) * 100), 0, 100);
  const rank = rankEstimate(data.overall, classOverall);

  const good: string[] = [];
  const next: string[] = [];

  if (writingPct >= 80) good.push('Writing submissions are consistent this week.');
  else next.push('Aim for shorter, more frequent writing submissions across the week.');

  if (vocabPct >= 80) good.push('Vocabulary practice is consistent.');
  else next.push('Reduce vocab load slightly and focus on consistent recall practice.');

  if (data.avgWordsPerWriting >= 350) good.push('Maintains solid writing length on submitted pieces.');
  else next.push('Increase writing length gradually with small word-count goals.');

  if (next.length < 3) next.push('Increase challenge by adding one longer writing task next week.');
  if (good.length < 3) good.push('Maintains steady task completion across the week.');

  return {
    rank,
    good: good.slice(0, 3),
    next: next.slice(0, 3),
    writingPct,
    vocabPct,
  };
}

function PillTab({
  active,
  label,
  onClick,
  accent,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 999,
        border: active ? `1px solid color-mix(in srgb, ${accent} 36%, var(--workspace-border))` : '1px solid var(--workspace-border)',
        background: active ? `linear-gradient(135deg, color-mix(in srgb, ${accent} 24%, transparent), color-mix(in srgb, ${accent} 10%, transparent))` : 'transparent',
        padding: '10px 14px',
        color: 'var(--workspace-text)',
        fontSize: 13,
        fontWeight: 900,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function HomeworkMainTab({
  active,
  label,
  onClick,
  accent,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'relative',
        zIndex: active ? 2 : 1,
        minWidth: 230,
        minHeight: 66,
        borderRadius: 20,
        border: active ? `1px solid color-mix(in srgb, ${accent} 40%, var(--workspace-border))` : '1px solid var(--workspace-border)',
        background: active
          ? `linear-gradient(135deg, color-mix(in srgb, ${accent} 30%, transparent), color-mix(in srgb, ${accent} 14%, transparent))`
          : 'color-mix(in srgb, var(--workspace-surface2) 72%, transparent)',
        padding: '16px 20px',
        color: 'var(--workspace-text)',
        fontSize: 25,
        lineHeight: 1,
        fontWeight: 950,
        letterSpacing: '-0.03em',
        cursor: 'pointer',
        boxShadow: active ? `0 14px 36px color-mix(in srgb, ${accent} 16%, transparent)` : 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {label}
    </button>
  );
}

export function TeacherHomeworkPanel({
  mode,
  palette,
  paletteStyle,
  classes,
  students,
  authToken,
}: {
  mode: WorkspaceMode;
  palette: WorkspacePalette;
  paletteStyle: CSSProperties;
  classes: TeacherClass[];
  students: TeacherStudent[];
  authToken: string;
}) {
  const accent = '#67e8f9';
  const mint = '#34d399';
  const ctaText = mode === 'dark' ? '#03201a' : '#052018';
  const panelFx = {
    borderRadius: 30,
    border: `1px solid color-mix(in srgb, ${accent} 18%, ${palette.border})`,
    background: `radial-gradient(circle at 100% -20%, color-mix(in srgb, ${accent} 12%, transparent) 0%, transparent 42%), linear-gradient(180deg, color-mix(in srgb, ${palette.surface} 92%, white 8%) 0%, ${palette.surface} 100%)`,
    boxShadow: `0 26px 64px color-mix(in srgb, ${accent} 12%, rgba(0,0,0,0.2))`,
  } as const;

  const classOptions = useMemo(() => {
    if (classes.length) {
      return classes.map((k) => ({ id: k.id, name: k.name, studentIds: k.students.map((s) => s.studentId) }));
    }
    return MOCK_CLASSES;
  }, [classes]);

  const studentNameMap = useMemo(() => {
    if (students.length) return new Map(students.map((s) => [s.id, s.username]));
    return new Map(MOCK_STUDENTS.map((s) => [s.id, s.username]));
  }, [students]);

  const [activeTab, setActiveTab] = useState<HomeworkTab>('assign');
  const [selectedClassId, setSelectedClassId] = useState(classOptions[0]?.id ?? '');
  const [targetMode, setTargetMode] = useState<TargetMode>('class');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [timetableOpen, setTimetableOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [timetableStep, setTimetableStep] = useState<TimetableStep>(1);
  const [timetableCopiedStep, setTimetableCopiedStep] = useState<TimetableStep | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(startMonth(new Date()));
  const [assignDates, setAssignDates] = useState<string[]>([]);
  const [assignWriting, setAssignWriting] = useState<HomeworkAssignment['writing']>(null);
  const [assignVocab, setAssignVocab] = useState<HomeworkAssignment['vocab']>(null);
  const [assignNote, setAssignNote] = useState('');
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [timetableSaving, setTimetableSaving] = useState(false);
  const [timetableError, setTimetableError] = useState<string | null>(null);
  const todayKey = ymd(new Date());

  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyHomeworkPlan>(createDefaultWeeklyPlan());
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>(() => {
    const today = new Date();
    const d1 = ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
    const d2 = ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9));
    return [
      {
        id: uid('hw'),
        dueDates: [d1],
        classId: classOptions[0]?.id ?? 'class_6a',
        className: classOptions[0]?.name ?? 'Class 6A',
        studentIds: [],
        targetLabel: classOptions[0]?.name ?? 'Class 6A',
        writing: { piecesByType: { 'Creative Story': 1 }, minWordsByType: { 'Creative Story': 350 }, notes: '' },
        vocab: { wordsToLearn: 0, requireDrill: true, notes: '' },
        note: '',
        createdAt: ymd(today),
      },
      {
        id: uid('hw'),
        dueDates: [d2],
        classId: classOptions[1]?.id ?? 'class_6b',
        className: classOptions[1]?.name ?? 'Class 6B',
        studentIds: [],
        targetLabel: classOptions[1]?.name ?? 'Class 6B',
        writing: null,
        vocab: { wordsToLearn: 14, requireDrill: true, notes: '' },
        note: '',
        createdAt: ymd(today),
      },
    ];
  });

  useEffect(() => {
    if (!classOptions.length) return;
    setSelectedClassId((current) => (classOptions.some((klass) => klass.id === current) ? current : classOptions[0]?.id ?? ''));
  }, [classOptions]);

  const selectedClass = classOptions.find((c) => c.id === selectedClassId) ?? null;
  const selectedClassStudents = useMemo(
    () => (selectedClass?.studentIds ?? []).map((id) => ({ id, name: studentNameMap.get(id) ?? 'Student' })),
    [selectedClass, studentNameMap],
  );

  useEffect(() => {
    setSelectedStudentIds((current) => current.filter((id) => selectedClassStudents.some((student) => student.id === id)));
  }, [selectedClassId, selectedClassStudents]);

  const currentFuture = useMemo(() => {
    const now = ymd(new Date());
    const horizonDate = new Date();
    horizonDate.setMonth(horizonDate.getMonth() + 12);
    const horizon = ymd(horizonDate);
    const rows = assignments.flatMap((assignment) => {
      if (assignment.recurrence?.type === 'weekly' && assignment.recurrence.active) {
        const startDate = parseYmd(assignment.recurrence.startDate || assignment.createdAt);
        const endDate = parseYmd(horizon);
        const occurrences: Array<{ assignment: HomeworkAssignment; dueDate: string }> = [];
        const totalDays = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
        for (let offset = 0; offset <= totalDays; offset += 7) {
          occurrences.push({
            assignment,
            dueDate: ymd(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + offset)),
          });
        }
        return occurrences;
      }
      return assignment.dueDates.map((due) => ({ assignment, dueDate: due }));
    });
    const current = rows.filter((row) => row.dueDate <= now);
    const future = rows.filter((row) => row.dueDate > now);
    const group = (input: typeof rows) => {
      const map = new Map<string, typeof rows>();
      input.forEach((item) => {
        const list = map.get(item.dueDate);
        if (list) list.push(item);
        else map.set(item.dueDate, [item]);
      });
      return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    };
    return { current: group(current), future: group(future), currentCount: current.length, futureCount: future.length };
  }, [assignments]);

  const overviewStats = useMemo(() => {
    const classesAssigned = new Set(assignments.map((a) => a.classId)).size;
    return {
      current: currentFuture.currentCount,
      future: currentFuture.futureCount,
      classesAssigned,
      completionWeek: 81,
    };
  }, [assignments, currentFuture]);

  const reviewClassCards: ReviewClassCard[] = useMemo(() => {
    return classOptions.map((c) => ({
      classId: c.id,
      className: c.name,
      studentCount: c.studentIds.length,
    }));
  }, [classOptions]);

  const [reviewClassId, setReviewClassId] = useState(classOptions[0]?.id ?? '');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewRangeDays, setReviewRangeDays] = useState(7);
  const [reviewStudents, setReviewStudents] = useState<ReviewStudentCard[]>([]);
  const [reviewSummary, setReviewSummary] = useState<{
    studentCount: number;
    activeStudents: number;
    avgWritingSubmitted: number;
    avgVocabAdded: number;
    avgWordsPerWriting: number;
    overall: number;
  } | null>(null);

  useEffect(() => {
    if (activeTab !== 'review') return;
    if (!reviewClassId) return;
    if (!authToken) {
      setReviewError('Sign in again to load homework review.');
      setReviewStudents([]);
      setReviewSummary(null);
      return;
    }
    const load = async () => {
      setReviewLoading(true);
      setReviewError(null);
      try {
        const json = await authFetchJson<{
          students: ReviewStudentCard[];
          summary: {
            studentCount: number;
            activeStudents: number;
            avgWritingSubmitted: number;
            avgVocabAdded: number;
            avgWordsPerWriting: number;
            overall: number;
          } | null;
        }>(`/api/teacher/homework-review?classId=${encodeURIComponent(reviewClassId)}&days=${reviewRangeDays}`, {
          token: authToken,
          headers: { 'Cache-Control': 'no-store' },
          timeoutMs: 15000,
        });
        setReviewStudents(Array.isArray(json.students) ? json.students : []);
        setReviewSummary(json.summary ?? null);
      } catch (err) {
        if ((err as any)?.name === 'AbortError') return;
        setReviewError((err as Error)?.message || 'Could not load class review.');
        setReviewStudents([]);
        setReviewSummary(null);
      } finally {
        setReviewLoading(false);
      }
    };
    void load();
  }, [activeTab, authToken, reviewClassId, reviewRangeDays]);

  const [reviewStudentId, setReviewStudentId] = useState('');
  const selectedReviewStudent = reviewStudents.find((s) => s.studentId === reviewStudentId) ?? reviewStudents[0] ?? null;
  const selectedReviewClass = reviewClassCards.find((c) => c.classId === reviewClassId) ?? null;

  const reviewInsights = useMemo(() => {
    if (!selectedReviewStudent) return null;
    return aiReviewText(selectedReviewStudent, reviewStudents.map((s) => s.overall));
  }, [reviewStudents, selectedReviewStudent]);

  const selectedTargetLabel =
    !selectedClass
      ? 'Select class'
      : targetMode === 'class'
        ? selectedClass.name
        : selectedStudentIds.length
          ? `${selectedClass.name} · ${selectedStudentIds.length} students`
          : `${selectedClass.name} · Select students`;

  const openWizard = () => {
    if (!selectedClass && classOptions[0]) {
      setSelectedClassId(classOptions[0].id);
    }
    setAssignmentError(null);
    setActiveTab('assign');
    setWizardStep(1);
    setAssignDates([]);
    setAssignWriting(null);
    setAssignVocab(null);
    setAssignNote('');
    setWizardOpen(true);
  };

  const closeTimetable = () => {
    setTimetableOpen(false);
    setTimetableStep(1);
    setTimetableCopiedStep(null);
    setTimetableError(null);
  };

  const openTimetable = () => {
    setWeeklyPlan(createDefaultWeeklyPlan());
    setTimetableStep(1);
    setTimetableCopiedStep(null);
    setTimetableError(null);
    setTimetableOpen(true);
  };

  const toggleDate = (d: string) => {
    setAssignDates((current) => {
      const has = current.includes(d);
      const next = has ? current.filter((x) => x !== d) : [...current, d];
      return next.sort((a, b) => a.localeCompare(b));
    });
  };

  const assignFromWizard = async () => {
    const targetClass = selectedClass ?? classOptions[0] ?? null;
    if (!targetClass) {
      setAssignmentError('Select a class before assigning homework.');
      return;
    }
    if (!assignDates.length) {
      setAssignmentError('Pick at least one date before assigning homework.');
      return;
    }
    if (targetMode === 'students' && !selectedStudentIds.length) {
      setAssignmentError('Select at least one student or switch to Whole class.');
      return;
    }
    if (!authToken) {
      setAssignmentError('Sign in again to assign homework.');
      return;
    }

    setAssignmentSaving(true);
    setAssignmentError(null);

    const item: HomeworkAssignment = {
      id: uid('hw'),
      dueDates: assignDates,
      classId: targetClass.id,
      className: targetClass.name,
      studentIds: targetMode === 'students' ? selectedStudentIds : [],
      targetLabel: targetMode === 'class' ? targetClass.name : `${targetClass.name} · ${selectedStudentIds.length} students`,
      writing: assignWriting,
      vocab: assignVocab,
      note: assignNote,
      createdAt: ymd(new Date()),
    };
    try {
      await authFetchJson<{ ok: true }>(`/api/teacher/homework`, {
        token: authToken,
        method: 'POST',
        body: {
          classId: targetClass.id,
          targetMode,
          studentIds: targetMode === 'students' ? selectedStudentIds : [],
          assignedDates: assignDates,
          payload: {
            writing: assignWriting,
            vocab: assignVocab,
            parentNotes: assignNote,
          },
        },
      });
      setAssignmentError(null);
      setAssignments((current) => [item, ...current]);
      setWizardOpen(false);
      setActiveTab('currentFuture');
    } catch (error) {
      setAssignmentError((error as Error)?.message || 'Could not assign homework.');
    } finally {
      setAssignmentSaving(false);
    }
  };

  const saveWeeklyTimetable = async () => {
    const targetClass = selectedClass ?? classOptions[0] ?? null;
    if (!targetClass) {
      setTimetableError('Select a class before saving the timetable.');
      return;
    }
    if (targetMode === 'students' && !selectedStudentIds.length) {
      setTimetableError('Select at least one student or switch to Whole class.');
      return;
    }
    if (!authToken) {
      setTimetableError('Sign in again to save the timetable.');
      return;
    }
    setTimetableSaving(true);
    setTimetableError(null);
    const today = new Date();
    const rows: HomeworkAssignment[] = HOMEWORK_DAY_KEYS.map((dayKey, idx) => {
      const date = ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + idx + 1));
      const day = weeklyPlan[dayKey];
      return {
        id: uid('week'),
        dueDates: [date],
        classId: targetClass.id,
        className: targetClass.name,
        studentIds: targetMode === 'students' ? selectedStudentIds : [],
        targetLabel: targetMode === 'class' ? targetClass.name : `${targetClass.name} · ${selectedStudentIds.length} students`,
        writing: day.writing
          ? {
              piecesByType: { ...(day.writing.piecesByType ?? {}) },
              minWordsByType: { ...(day.writing.minWordsByType ?? {}) },
              notes: day.writing.notes ?? '',
            }
          : null,
        vocab: day.vocab
          ? {
              wordsToLearn: day.vocab.wordsToLearn ?? 0,
              requireDrill: Boolean(day.vocab.requireDrill),
              notes: day.vocab.notes ?? '',
            }
          : null,
        note: day.notes ?? '',
        createdAt: ymd(today),
        recurrence: {
          type: 'weekly',
          startDate: date,
          active: true,
        },
      };
    });
    try {
      await authFetchJson<{ ok: true }>(`/api/teacher/homework`, {
        token: authToken,
        method: 'PUT',
        body: {
          classId: targetClass.id,
          targetMode,
          studentIds: targetMode === 'students' ? selectedStudentIds : [],
        weeklyPlan,
      },
      });
      setTimetableError(null);
      setAssignments((current) => [...rows, ...current]);
      setActiveTab('currentFuture');
      closeTimetable();
    } catch (error) {
      setTimetableError((error as Error)?.message || 'Could not save timetable.');
    } finally {
      setTimetableSaving(false);
    }
  };

  const clearWeek = () => setWeeklyPlan(createDefaultWeeklyPlan());

  const calendarCells = makeCalendarCells(calendarMonth);
  const wizardStepTitles = ['Students', 'Date', 'Writing', 'Vocab', 'Review'] as const;
  const timetableDayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
  const timetableStepTitles = [...timetableDayLabels, 'Review'] as const;
  const timetableDayHelp: Record<HomeworkDayKey, string> = {
    monday: 'Start here. Build the first day from scratch.',
    tuesday: 'Repeat Monday if needed, then change it.',
    wednesday: 'Adjust for midweek work.',
    thursday: 'Keep the load balanced.',
    friday: 'Wrap the week cleanly.',
    saturday: 'Optional weekend work.',
    sunday: 'Final day before review.',
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={{ ...paletteStyle, ...panelFx, padding: 18, position: 'relative', zIndex: 5 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 5 }}>
          <HomeworkMainTab active={activeTab === 'assign'} label="Assign Homework" onClick={openWizard} accent={accent} />
          <HomeworkMainTab active={activeTab === 'timetable'} label="Timetable" onClick={() => setActiveTab('timetable')} accent={accent} />
          <HomeworkMainTab active={activeTab === 'currentFuture'} label="Current/Future" onClick={() => setActiveTab('currentFuture')} accent={accent} />
          <HomeworkMainTab active={activeTab === 'review'} label="Review" onClick={() => setActiveTab('review')} accent={accent} />
        </div>
      </section>

      {activeTab === 'assign' ? (
        <section style={{ display: 'grid', gap: 16 }}>
          <section style={{ ...paletteStyle, ...panelFx, padding: 22 }}>
            <SectionTitle eyebrow="Homework" title="Homework" copy="Assign weekly writing and vocabulary homework to classes or individual students." accent={accent} />
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              {[
                { label: 'Current homework', value: overviewStats.current, icon: <ClipboardCheck style={{ width: 16, height: 16 }} />, tone: accent },
                { label: 'Future homework', value: overviewStats.future, icon: <CalendarDays style={{ width: 16, height: 16 }} />, tone: mint },
                { label: 'Classes assigned', value: overviewStats.classesAssigned, icon: <Users style={{ width: 16, height: 16 }} />, tone: '#60a5fa' },
                { label: 'Completion this week', value: `${overviewStats.completionWeek}%`, icon: <Check style={{ width: 16, height: 16 }} />, tone: '#a78bfa' },
              ].map((card) => (
                <div key={card.label} style={{ borderRadius: 18, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface2)', padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: card.tone, fontWeight: 800, fontSize: 12 }}>{card.icon}{card.label}</div>
                  <div style={{ marginTop: 8, fontSize: 24, fontWeight: 950, color: 'var(--workspace-text)' }}>{card.value}</div>
                </div>
              ))}
            </div>
            <button
              type="button"
              aria-label="Open Assign Homework wizard"
              onClick={openWizard}
              style={{ marginTop: 14, position: 'relative', zIndex: 2, borderRadius: 16, border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`, background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 70%, white))`, color: ctaText, padding: '12px 14px', fontWeight: 900, cursor: 'pointer', display: 'inline-flex', gap: 8, alignItems: 'center', pointerEvents: 'auto' }}
            >
              <Plus style={{ width: 15, height: 15 }} />
              Create homework
            </button>
          </section>

          <section style={{ ...paletteStyle, ...panelFx, padding: 20 }}>
          <SectionTitle eyebrow="Assign Homework" title="Guided assignment flow" copy="Use the wizard to assign a one-off homework set with date, writing, vocab and review." accent={accent} />
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Date selection', 'Writing + vocab setup', 'Final review'].map((chip) => (
              <span key={chip} style={{ borderRadius: 999, border: `1px solid ${palette.border}`, padding: '7px 10px', fontSize: 12, fontWeight: 800, color: palette.text }}>{chip}</span>
            ))}
          </div>
          <button
            type="button"
            aria-label="Open Assign Homework wizard"
            onClick={openWizard}
            style={{ marginTop: 14, position: 'relative', zIndex: 2, borderRadius: 16, border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`, background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 70%, white))`, color: ctaText, padding: '12px 14px', fontWeight: 900, cursor: 'pointer', pointerEvents: 'auto' }}
          >
            Open Assign Homework
          </button>
          </section>
        </section>
      ) : null}

      {activeTab === 'timetable' ? (
        <section style={{ ...paletteStyle, ...panelFx, padding: 20 }}>
          <SectionTitle eyebrow="Timetable" title="Weekly timetable planner" accent={accent} />
          <div style={{ marginTop: 14, borderRadius: 20, border: `1px solid color-mix(in srgb, ${accent} 24%, ${palette.border})`, background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 8%, ${palette.surface2}), ${palette.surface2} 55%, color-mix(in srgb, ${accent} 4%, ${palette.surface}) 100%)`, padding: 16, display: 'grid', gap: 14, boxShadow: '0 18px 44px rgba(0,0,0,0.14)' }}>
            <div style={{ display: 'grid', gap: 6, maxWidth: 760 }}>
                <div style={{ fontSize: 18, fontWeight: 950, color: palette.text, letterSpacing: '-0.02em' }}>
                  Open the weekly builder
                </div>
              <div style={{ fontSize: 14, color: palette.text2, lineHeight: 1.55 }}>
                Build Monday to Sunday one step at a time. Saved timetables repeat every week until you remove them.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={openTimetable}
                style={{ borderRadius: 16, border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`, background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 70%, white))`, color: ctaText, padding: '13px 16px', fontWeight: 950, cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.18)' }}
              >
                Open Weekly Timetable
              </button>
              <button
                type="button"
                onClick={clearWeek}
                style={{ borderRadius: 16, border: `1px solid ${palette.border}`, background: 'transparent', color: palette.text, padding: '13px 16px', fontWeight: 900, cursor: 'pointer' }}
              >
                Clear week
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'currentFuture' ? (
        <section style={{ ...paletteStyle, ...panelFx, padding: 20 }}>
          <SectionTitle eyebrow="Current/Future" title="Assigned homework" copy="Track current and future homework grouped by date." accent={accent} />
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
            <div style={{ borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.surface2, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 950, color: palette.text }}>Current homework</div>
                <span style={{ borderRadius: 999, border: `1px solid ${palette.border}`, padding: '6px 10px', fontSize: 12, fontWeight: 900 }}>{currentFuture.currentCount}</span>
              </div>
              <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                {currentFuture.current.map(([date, rows]) => (
                  <div key={date} style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.surface, padding: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: palette.text3 }}>{fmtDate(date)} · {rows.length} tasks</div>
                    <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                      {rows.map((row) => (
                        <div key={`${row.assignment.id}_${date}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                          <div style={{ fontSize: 12.5, color: palette.text }}>
                            {row.assignment.writing ? `${Object.values(row.assignment.writing.piecesByType).reduce((s, v) => s + v, 0)} writing` : ''}
                            {row.assignment.writing && row.assignment.vocab ? ' + ' : ''}
                            {row.assignment.vocab ? `${row.assignment.vocab.wordsToLearn} vocab words${row.assignment.vocab.requireDrill ? ' + drill' : ''}` : ''}
                            <div style={{ color: palette.text3, fontSize: 11.5 }}>{row.assignment.targetLabel}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            {row.assignment.recurrence?.active ? (
                              <span style={{ borderRadius: 999, border: `1px solid color-mix(in srgb, ${accent} 30%, ${palette.border})`, padding: '5px 8px', fontSize: 10.5, fontWeight: 900, color: palette.text3, whiteSpace: 'nowrap' }}>
                                Repeats weekly
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => setAssignments((current) => current.filter((a) => a.id !== row.assignment.id))}
                              style={{ width: 30, height: 30, borderRadius: 10, border: `1px solid ${palette.border}`, background: 'transparent', color: palette.text3, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                            >
                              <X style={{ width: 14, height: 14 }} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.surface2, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 950, color: palette.text }}>Future homework</div>
                <span style={{ borderRadius: 999, border: `1px solid ${palette.border}`, padding: '6px 10px', fontSize: 12, fontWeight: 900 }}>{currentFuture.futureCount}</span>
              </div>
              <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                {currentFuture.future.map(([date, rows]) => (
                  <div key={date} style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.surface, padding: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: palette.text3 }}>{fmtDate(date)} · {rows.length} tasks</div>
                    <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                      {rows.map((row) => (
                        <div key={`${row.assignment.id}_${date}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                          <div style={{ fontSize: 12.5, color: palette.text }}>
                            {row.assignment.writing ? `${Object.values(row.assignment.writing.piecesByType).reduce((s, v) => s + v, 0)} writing` : ''}
                            {row.assignment.writing && row.assignment.vocab ? ' + ' : ''}
                            {row.assignment.vocab ? `${row.assignment.vocab.wordsToLearn} vocab words${row.assignment.vocab.requireDrill ? ' + drill' : ''}` : ''}
                            <div style={{ color: palette.text3, fontSize: 11.5 }}>{row.assignment.targetLabel}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            {row.assignment.recurrence?.active ? (
                              <span style={{ borderRadius: 999, border: `1px solid color-mix(in srgb, ${accent} 30%, ${palette.border})`, padding: '5px 8px', fontSize: 10.5, fontWeight: 900, color: palette.text3, whiteSpace: 'nowrap' }}>
                                Repeats weekly
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => setAssignments((current) => current.filter((a) => a.id !== row.assignment.id))}
                              style={{ width: 30, height: 30, borderRadius: 10, border: `1px solid ${palette.border}`, background: 'transparent', color: palette.text3, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                            >
                              <X style={{ width: 14, height: 14 }} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'review' ? (
        <section style={{ ...paletteStyle, ...panelFx, padding: 20 }}>
          <SectionTitle eyebrow="Review" title="Class performance review" copy="Review class and student homework completion with teacher-focused insights." accent={accent} />

          <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {reviewClassCards.map((c) => {
                const active = c.classId === reviewClassId;
                return (
                  <button
                    key={c.classId}
                    type="button"
                    onClick={() => {
                      setReviewClassId(c.classId);
                      setReviewStudentId('');
                    }}
                    style={{
                      borderRadius: 999,
                      border: active ? `1px solid color-mix(in srgb, ${accent} 36%, ${palette.border})` : `1px solid ${palette.border}`,
                      background: active ? `linear-gradient(135deg, color-mix(in srgb, ${accent} 16%, transparent), transparent)` : palette.surface2,
                      color: palette.text,
                      textAlign: 'left',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      minWidth: 160,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 13.5, fontWeight: 950 }}>{c.className}</span>
                    <span style={{ borderRadius: 999, border: `1px solid ${palette.border}`, padding: '4px 8px', fontSize: 11.5, fontWeight: 900, color: palette.text2 }}>{c.studentCount}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontSize: 12.5, color: palette.text2, fontWeight: 800 }}>Range</div>
              {[7, 14].map((d) => {
                const active = d === reviewRangeDays;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setReviewRangeDays(d)}
                    style={{
                      borderRadius: 999,
                      border: active ? `1px solid color-mix(in srgb, ${accent} 36%, ${palette.border})` : `1px solid ${palette.border}`,
                      background: active ? `color-mix(in srgb, ${accent} 10%, transparent)` : 'transparent',
                      color: palette.text,
                      padding: '8px 10px',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    {d} days
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 12 }}>
            <div style={{ borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.surface2, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: palette.text3 }}>Students</div>
                {reviewLoading ? <div style={{ fontSize: 12, color: palette.text2, fontWeight: 800 }}>Loading…</div> : null}
              </div>
              {reviewError ? (
                <div style={{ marginTop: 10, borderRadius: 14, border: `1px solid color-mix(in srgb, ${palette.dangerBorder} 70%, ${palette.border})`, background: `color-mix(in srgb, ${palette.dangerBg} 60%, ${palette.surface2})`, padding: 10, color: '#fca5a5', fontSize: 12.5, fontWeight: 850 }}>
                  {reviewError}
                </div>
              ) : null}
              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                {reviewStudents.map((s) => {
                  const active = selectedReviewStudent?.studentId === s.studentId;
                  const status = scoreStatus(s.overall);
                  const lastActive = s.lastActiveAt ? new Date(s.lastActiveAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
                  return (
                    <button
                      key={s.studentId}
                      type="button"
                      onClick={() => setReviewStudentId(s.studentId)}
                      style={{ borderRadius: 14, border: active ? `1px solid color-mix(in srgb, ${accent} 36%, ${palette.border})` : `1px solid ${palette.border}`, background: active ? `color-mix(in srgb, ${accent} 12%, transparent)` : palette.surface, color: palette.text, textAlign: 'left', padding: 12, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 14.5, fontWeight: 950 }}>{s.name}</div>
                          <div style={{ marginTop: 4, fontSize: 12.5, color: palette.text2 }}>
                            Writing {s.writingSubmitted} · Vocab +{s.vocabAdded} · Avg {s.avgWordsPerWriting} words · Active {lastActive}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 900 }}>{s.overall}%</div>
                          <span style={{ borderRadius: 999, border: `1px solid color-mix(in srgb, ${status.tone} 34%, ${palette.border})`, padding: '4px 7px', fontSize: 11.5, fontWeight: 900 }}>{status.label}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.surface2, padding: 12 }}>
              {reviewSummary && !reviewStudents.length && !reviewLoading ? (
                <div style={{ borderRadius: 12, border: `1px dashed ${palette.border}`, padding: 12, color: palette.text2, fontSize: 13 }}>No students found in this class yet.</div>
              ) : selectedReviewStudent && reviewInsights ? (
                <>
                  <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: palette.text3 }}>Overview</div>
                  <div style={{ marginTop: 8, fontSize: 16, fontWeight: 950, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                    <span>{selectedReviewClass?.className ?? 'Class'}</span>
                    {reviewSummary ? <span style={{ fontSize: 13, color: palette.text2, fontWeight: 900 }}>{reviewSummary.activeStudents}/{reviewSummary.studentCount} active</span> : null}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12.5, color: palette.text2 }}>Last {reviewRangeDays} days · Based on writing submissions + new vocab added</div>

                  <div style={{ marginTop: 10, borderRadius: 16, border: `1px solid ${palette.border}`, background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 14%, ${palette.surface}), ${palette.surface})`, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                      <div style={{ fontSize: 12, color: palette.text2, fontWeight: 900 }}>Class score</div>
                      <div style={{ fontSize: 22, fontWeight: 950, color: palette.text }}>{reviewSummary?.overall ?? 0}%</div>
                    </div>
                    <div style={{ marginTop: 10, height: 10, borderRadius: 999, border: `1px solid ${palette.border}`, background: palette.surface, overflow: 'hidden' }}>
                      <div style={{ width: `${clamp(reviewSummary?.overall ?? 0, 0, 100)}%`, height: '100%', background: `linear-gradient(90deg, ${mint}, ${accent})` }} />
                    </div>
                    <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                      <div style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.surface, padding: 10 }}>
                        <div style={{ fontSize: 11.5, color: palette.text3, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Avg writing</div>
                        <div style={{ marginTop: 4, fontSize: 16, fontWeight: 950 }}>{reviewSummary?.avgWritingSubmitted ?? 0}</div>
                        <div style={{ marginTop: 2, fontSize: 12, color: palette.text2 }}>submissions</div>
                      </div>
                      <div style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.surface, padding: 10 }}>
                        <div style={{ fontSize: 11.5, color: palette.text3, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Avg vocab</div>
                        <div style={{ marginTop: 4, fontSize: 16, fontWeight: 950 }}>+{reviewSummary?.avgVocabAdded ?? 0}</div>
                        <div style={{ marginTop: 2, fontSize: 12, color: palette.text2 }}>new words</div>
                      </div>
                      <div style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.surface, padding: 10 }}>
                        <div style={{ fontSize: 11.5, color: palette.text3, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Avg length</div>
                        <div style={{ marginTop: 4, fontSize: 16, fontWeight: 950 }}>{reviewSummary?.avgWordsPerWriting ?? 0}</div>
                        <div style={{ marginTop: 2, fontSize: 12, color: palette.text2 }}>words / piece</div>
                      </div>
                      <div style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.surface, padding: 10 }}>
                        <div style={{ fontSize: 11.5, color: palette.text3, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Selected</div>
                        <div style={{ marginTop: 4, fontSize: 16, fontWeight: 950 }}>{selectedReviewStudent.name}</div>
                        <div style={{ marginTop: 2, fontSize: 12, color: palette.text2 }}>{reviewInsights.rank}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: palette.text3 }}>What is going well</div>
                  <div style={{ marginTop: 8, display: 'grid', gap: 7 }}>
                    {reviewInsights.good.map((text) => (
                      <div key={text} style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: `color-mix(in srgb, ${mint} 10%, ${palette.surface})`, padding: 9, fontSize: 12.5, fontWeight: 800 }}>{text}</div>
                    ))}
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: palette.text3 }}>Suggested next steps</div>
                  <div style={{ marginTop: 8, display: 'grid', gap: 7 }}>
                    {reviewInsights.next.map((text) => (
                      <div key={text} style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: `color-mix(in srgb, ${accent} 10%, ${palette.surface})`, padding: 9, fontSize: 12.5, fontWeight: 800 }}>{text}</div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ borderRadius: 12, border: `1px dashed ${palette.border}`, padding: 12, color: palette.text2, fontSize: 13 }}>
                  {reviewLoading ? 'Loading class overview…' : 'Select a student to open the overview panel.'}
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {timetableOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: 'rgba(4, 8, 20, 0.62)',
            backdropFilter: 'blur(8px)',
            padding: 16,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <div style={{ width: 'min(1080px, 100%)', maxHeight: '92vh', overflowY: 'auto', borderRadius: 24, border: `1px solid color-mix(in srgb, ${accent} 26%, ${palette.border})`, background: palette.surface, boxShadow: '0 36px 96px rgba(0,0,0,0.5)', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: palette.text3 }}>Weekly Timetable</div>
                <div style={{ marginTop: 6, fontSize: 18, fontWeight: 950, color: palette.text }}>{selectedTargetLabel} · Step {timetableStep} of 8</div>
                <div style={{ marginTop: 6, fontSize: 13, color: palette.text2, lineHeight: 1.5 }}>
                  One day per step. Repeat previous day copies the last day. Review checks the week before save.
                </div>
              </div>
              <button type="button" onClick={closeTimetable} style={{ width: 34, height: 34, borderRadius: 12, border: `1px solid ${palette.border}`, background: 'transparent', color: palette.text, cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X style={{ width: 16, height: 16 }} /></button>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: 8 }}>
              {timetableStepTitles.map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setTimetableStep((idx + 1) as TimetableStep)}
                  style={{
                    borderRadius: 999,
                    border: `1px solid ${timetableStep === idx + 1 ? 'color-mix(in srgb, ${accent} 42%, ${palette.border})' : palette.border}`,
                    background: timetableStep === idx + 1 ? `linear-gradient(135deg, color-mix(in srgb, ${accent} 22%, transparent), color-mix(in srgb, ${accent} 10%, transparent))` : palette.surface2,
                    padding: '9px 10px',
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: 900,
                    color: timetableStep === idx + 1 ? palette.text : palette.text3,
                    cursor: 'pointer',
                  }}
                  >
                  {idx < 7 ? label.slice(0, 3) : label}
                </button>
              ))}
            </div>

            {timetableStep < 8 ? (() => {
              const dayKey = HOMEWORK_DAY_KEYS[timetableStep - 1]!;
              const day = weeklyPlan[dayKey];
              const prevDayKey = timetableStep > 1 ? HOMEWORK_DAY_KEYS[timetableStep - 2] : null;
              const writingKeys = Object.entries(day.writing?.piecesByType ?? {}).filter(([, c]) => (c ?? 0) > 0).map(([k]) => k);
              const dayLabel = timetableDayLabels[timetableStep - 1];

              return (
                <div style={{ borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.surface2, padding: 14, display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'grid', gap: 3 }}>
                      <div style={{ fontSize: 18, fontWeight: 950, color: palette.text }}>{dayLabel}</div>
                      <div style={{ fontSize: 12.5, color: palette.text2 }}>{timetableDayHelp[dayKey]}</div>
                    </div>
                    {prevDayKey ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!prevDayKey) return;
                          setWeeklyPlan((current) => {
                            const source = current[prevDayKey];
                            if (!source) return current;
                            return { ...current, [dayKey]: cloneDay(source) };
                          });
                          setTimetableCopiedStep(timetableStep);
                        }}
                        style={{ borderRadius: 999, border: `1px solid ${palette.border}`, background: 'transparent', color: palette.text, padding: '8px 11px', fontSize: 12, fontWeight: 850, cursor: 'pointer' }}
                      >
                        Repeat previous day
                      </button>
                    ) : null}
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    {timetableCopiedStep === timetableStep ? (
                      <div style={{ borderRadius: 12, border: `1px solid color-mix(in srgb, ${accent} 28%, ${palette.border})`, background: `color-mix(in srgb, ${accent} 10%, transparent)`, padding: '8px 10px', fontSize: 12, fontWeight: 800, color: palette.text }}>
                        Previous day copied into {dayLabel.toLowerCase()}.
                      </div>
                    ) : null}
                    <div style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.surface, padding: 9 }}>
                      <div style={{ fontSize: 12, fontWeight: 850, letterSpacing: '0.12em', textTransform: 'uppercase', color: palette.text3 }}>Writing</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: palette.text2 }}>Tap a chip to add or remove it.</div>
                      <div style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {WRITING_TYPE_OPTIONS.map((type) => {
                          const active = (day.writing?.piecesByType?.[type] ?? 0) > 0;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => {
                                setWeeklyPlan((current) => {
                                  const next = { ...current };
                                  const d = cloneDay(next[dayKey]);
                                  const writing = d.writing ? { ...d.writing } : createDefaultWritingConfig();
                                  const pieces = { ...(writing.piecesByType ?? {}) };
                                  if (active) delete pieces[type];
                                  else pieces[type] = 1;
                                  writing.piecesByType = pieces;
                                  writing.minWordsByType = { ...(writing.minWordsByType ?? {}), [type]: writing.minWordsByType?.[type] ?? 400 };
                                  d.writing = writing;
                                  next[dayKey] = d;
                                  return next;
                                });
                              }}
                              style={{ borderRadius: 999, border: active ? `1px solid color-mix(in srgb, ${accent} 34%, ${palette.border})` : `1px solid ${palette.border}`, background: active ? `color-mix(in srgb, ${accent} 14%, transparent)` : 'transparent', color: palette.text, padding: '7px 9px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}
                            >
                              {type}
                            </button>
                          );
                        })}
                      </div>
                      {writingKeys.map((type) => (
                        <div key={type} style={{ marginTop: 8, borderRadius: 10, border: `1px solid ${palette.border}`, padding: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: palette.text }}>{type}</div>
                          <div style={{ marginTop: 5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <input
                              type="number"
                              value={day.writing?.piecesByType?.[type] ?? 1}
                              min={1}
                              onChange={(e) => {
                                const v = clamp(Number(e.target.value) || 1, 1, 8);
                                setWeeklyPlan((current) => {
                                  const next = { ...current };
                                  const d = cloneDay(next[dayKey]);
                                  if (!d.writing) d.writing = createDefaultWritingConfig();
                                  d.writing.piecesByType = { ...(d.writing.piecesByType ?? {}), [type]: v };
                                  next[dayKey] = d;
                                  return next;
                                });
                              }}
                              style={{ borderRadius: 9, border: `1px solid ${palette.border}`, background: palette.surface2, color: palette.text, padding: '7px 8px', fontSize: 12 }}
                            />
                            <input
                              type="number"
                              value={day.writing?.minWordsByType?.[type] ?? 400}
                              min={50}
                              onChange={(e) => {
                                const v = clamp(Number(e.target.value) || 400, 50, 2000);
                                setWeeklyPlan((current) => {
                                  const next = { ...current };
                                  const d = cloneDay(next[dayKey]);
                                  if (!d.writing) d.writing = createDefaultWritingConfig();
                                  d.writing.minWordsByType = { ...(d.writing.minWordsByType ?? {}), [type]: v };
                                  next[dayKey] = d;
                                  return next;
                                });
                              }}
                              style={{ borderRadius: 9, border: `1px solid ${palette.border}`, background: palette.surface2, color: palette.text, padding: '7px 8px', fontSize: 12 }}
                            />
                          </div>
                        </div>
                      ))}
                      <textarea
                        value={day.writing?.notes ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setWeeklyPlan((current) => {
                            const next = { ...current };
                            const d = cloneDay(next[dayKey]);
                            if (!d.writing) d.writing = createDefaultWritingConfig();
                            d.writing.notes = v;
                            next[dayKey] = d;
                            return next;
                          });
                        }}
                        placeholder="Optional writing instructions"
                        rows={2}
                        style={{ marginTop: 7, width: '100%', borderRadius: 9, border: `1px solid ${palette.border}`, background: palette.surface2, color: palette.text, padding: 8, fontSize: 12 }}
                      />
                    </div>

                    <div style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.surface, padding: 9 }}>
                      <div style={{ fontSize: 12, fontWeight: 850, letterSpacing: '0.12em', textTransform: 'uppercase', color: palette.text3 }}>Vocab</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: palette.text2 }}>Start at 0. Increase only if this day needs vocab.</div>
                      <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setWeeklyPlan((current) => {
                              const next = { ...current };
                              const d = cloneDay(next[dayKey]);
                              const vocab = d.vocab ? { ...d.vocab } : createDefaultVocabConfig();
                              vocab.wordsToLearn = clamp((vocab.wordsToLearn ?? 0) - 1, 0, 80);
                              d.vocab = vocab;
                              next[dayKey] = d;
                              return next;
                            });
                          }}
                          style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${palette.border}`, background: palette.surface2, color: palette.text, fontSize: 16, fontWeight: 900, cursor: 'pointer' }}
                        >
                          -
                        </button>
                        <div style={{ minWidth: 56, textAlign: 'center', fontSize: 18, fontWeight: 950, color: palette.text }}>
                          {day.vocab?.wordsToLearn ?? 0}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setWeeklyPlan((current) => {
                              const next = { ...current };
                              const d = cloneDay(next[dayKey]);
                              const vocab = d.vocab ? { ...d.vocab } : createDefaultVocabConfig();
                              vocab.wordsToLearn = clamp((vocab.wordsToLearn ?? 0) + 1, 0, 80);
                              d.vocab = vocab;
                              next[dayKey] = d;
                              return next;
                            });
                          }}
                          style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${palette.border}`, background: palette.surface2, color: palette.text, fontSize: 16, fontWeight: 900, cursor: 'pointer' }}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setWeeklyPlan((current) => {
                              const next = { ...current };
                              const d = cloneDay(next[dayKey]);
                              const vocab = d.vocab ? { ...d.vocab } : createDefaultVocabConfig();
                              vocab.requireDrill = !vocab.requireDrill;
                              d.vocab = vocab;
                              next[dayKey] = d;
                              return next;
                            });
                          }}
                          style={{ borderRadius: 9, border: `1px solid ${palette.border}`, background: day.vocab?.requireDrill ? `color-mix(in srgb, ${mint} 18%, transparent)` : 'transparent', color: palette.text, padding: '8px 10px', fontWeight: 850, cursor: 'pointer', fontSize: 12 }}
                        >
                          {day.vocab?.requireDrill ? 'Drill required' : 'Drill optional'}
                        </button>
                        <textarea
                          value={day.vocab?.notes ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setWeeklyPlan((current) => {
                              const next = { ...current };
                              const d = cloneDay(next[dayKey]);
                              const vocab = d.vocab ? { ...d.vocab } : createDefaultVocabConfig();
                              vocab.notes = v;
                              d.vocab = vocab;
                              next[dayKey] = d;
                              return next;
                            });
                          }}
                          placeholder="Optional vocab instructions"
                          rows={2}
                          style={{ width: '100%', borderRadius: 9, border: `1px solid ${palette.border}`, background: palette.surface2, color: palette.text, padding: 8, fontSize: 12 }}
                        />
                      </div>
                    </div>

                    <textarea
                      value={day.notes ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setWeeklyPlan((current) => ({ ...current, [dayKey]: { ...current[dayKey], notes: v } }));
                      }}
                      placeholder="Optional daily note"
                      rows={2}
                      style={{ width: '100%', borderRadius: 9, border: `1px solid ${palette.border}`, background: palette.surface, color: palette.text, padding: 8, fontSize: 12 }}
                    />
                  </div>
                </div>
              );
            })() : (
                <div style={{ borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.surface2, padding: 14, display: 'grid', gap: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 950, color: palette.text }}>Review weekly plan</div>
                <div style={{ fontSize: 12.5, color: palette.text2, lineHeight: 1.5 }}>
                  Check each day here before saving. Click a step above to fix anything.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                  {HOMEWORK_DAY_KEYS.map((dayKey) => {
                    const day = weeklyPlan[dayKey];
                    const label = day.writing && day.vocab ? 'Writing + vocab' : day.writing ? 'Writing only' : day.vocab ? 'Vocab only' : 'Nothing set';
                    return (
                      <div key={dayKey} style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.surface, padding: 12, display: 'grid', gap: 5 }}>
                        <div style={{ fontSize: 12, fontWeight: 900, color: palette.text3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{timetableDayLabels[HOMEWORK_DAY_KEYS.indexOf(dayKey)]}</div>
                        <div style={{ fontSize: 15, fontWeight: 950, color: palette.text }}>{label}</div>
                        <div style={{ fontSize: 12, color: palette.text2 }}>Vocab words: {day.vocab?.wordsToLearn ?? 0}</div>
                        <div style={{ fontSize: 12, color: palette.text2 }}>Writing types: {Object.entries(day.writing?.piecesByType ?? {}).filter(([, count]) => (count ?? 0) > 0).map(([type]) => type).join(', ') || 'None'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  if (timetableStep === 1) {
                    closeTimetable();
                    return;
                  }
                  setTimetableStep((current) => (current - 1) as TimetableStep);
                }}
                style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: 'transparent', color: palette.text, padding: '10px 12px', fontWeight: 850, cursor: 'pointer' }}
              >
                {timetableStep === 1 ? 'Close' : 'Back'}
              </button>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={clearWeek} style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: 'transparent', color: palette.text, padding: '10px 12px', fontWeight: 850, cursor: 'pointer' }}>Clear week</button>
                {timetableStep < 8 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTimetableCopiedStep(null);
                      setTimetableStep((current) => (current + 1) as TimetableStep);
                    }}
                    style={{ borderRadius: 12, border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`, background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 70%, white))`, color: ctaText, padding: '10px 12px', fontWeight: 900, cursor: 'pointer' }}
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { void saveWeeklyTimetable(); }}
                    disabled={timetableSaving}
                    style={{ borderRadius: 12, border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`, background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 70%, white))`, color: ctaText, padding: '10px 12px', fontWeight: 900, cursor: timetableSaving ? 'wait' : 'pointer', opacity: timetableSaving ? 0.8 : 1 }}
                  >
                    {timetableSaving ? 'Saving…' : 'Save weekly timetable'}
                  </button>
                )}
              </div>
            </div>
            {timetableError ? (
              <div style={{ marginTop: 10, borderRadius: 12, border: `1px solid color-mix(in srgb, ${palette.dangerBorder} 70%, ${palette.border})`, background: `color-mix(in srgb, ${palette.dangerBg} 55%, ${palette.surface2})`, color: '#fecaca', padding: 10, fontSize: 12.5, fontWeight: 850 }}>
                {timetableError}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {wizardOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(4, 8, 20, 0.62)',
            backdropFilter: 'blur(8px)',
            padding: 16,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <div style={{ width: 'min(1040px, 100%)', maxHeight: '92vh', overflow: 'hidden', borderRadius: 26, border: `1px solid color-mix(in srgb, ${accent} 26%, ${palette.border})`, background: `linear-gradient(150deg, color-mix(in srgb, ${accent} 10%, ${palette.surface}), ${palette.surface} 45%, color-mix(in srgb, ${mint} 8%, ${palette.surface}))`, boxShadow: '0 36px 96px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: 18, borderBottom: `1px solid ${palette.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: palette.text3 }}>Assign Homework</div>
                  <div style={{ marginTop: 6, fontSize: 23, fontWeight: 950, color: palette.text }}>{selectedTargetLabel} · Step {wizardStep} of 5</div>
                  <div style={{ marginTop: 6, fontSize: 12.5, color: palette.text2 }}>Follow each step from left to right. You can always go back and edit before assigning.</div>
                </div>
                <button type="button" onClick={() => setWizardOpen(false)} style={{ width: 38, height: 38, borderRadius: 14, border: `1px solid ${palette.border}`, background: 'transparent', color: palette.text, cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X style={{ width: 16, height: 16 }} /></button>
              </div>
              <div style={{ marginTop: 12, borderRadius: 999, height: 6, background: palette.surface2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${wizardStep * 20}%`, background: `linear-gradient(90deg, ${accent}, ${mint})`, transition: 'width 180ms ease' }} />
              </div>
            </div>

            <div style={{ padding: '14px 18px 10px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {wizardStepTitles.map((label, idx) => (
                <span key={label} style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: wizardStep === idx + 1 ? `linear-gradient(135deg, color-mix(in srgb, ${accent} 34%, transparent), color-mix(in srgb, ${accent} 18%, transparent))` : palette.surface2, padding: '11px 16px', minWidth: 108, textAlign: 'center', fontSize: 13, fontWeight: 900 }}>{idx + 1}. {label}</span>
              ))}
            </div>

            <div style={{ padding: '0 18px 16px', maxHeight: '54vh', overflowY: 'auto' }}>
            {wizardStep === 1 ? (
              <div style={{ marginTop: 6, display: 'grid', gap: 12 }}>
                <div style={{ fontSize: 19, fontWeight: 950, color: palette.text }}>Step 1: Select students</div>
                <div style={{ fontSize: 13.5, color: palette.text2 }}>Choose whole class or specific students for this assignment.</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <PillTab active={targetMode === 'class'} label="Whole class" onClick={() => setTargetMode('class')} accent={accent} />
                  <PillTab active={targetMode === 'students'} label="Selected students" onClick={() => setTargetMode('students')} accent={accent} />
                </div>
                {targetMode === 'students' ? (
                  <div style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.surface2, padding: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 900, color: palette.text }}>Selected: {selectedStudentIds.length} students</div>
                      <button
                        type="button"
                        onClick={() => {
                          const ids = selectedClassStudents.map((s) => s.id);
                          setSelectedStudentIds((current) => (current.length === ids.length ? [] : ids));
                        }}
                        style={{ borderRadius: 10, border: `1px solid ${palette.border}`, background: 'transparent', color: palette.text, padding: '7px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                      >
                        {selectedStudentIds.length === selectedClassStudents.length ? 'Clear all' : 'Select all'}
                      </button>
                    </div>
                    <div style={{ marginTop: 10, maxHeight: 300, overflowY: 'auto', paddingRight: 2 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
                        {selectedClassStudents.map((student) => {
                          const active = selectedStudentIds.includes(student.id);
                          return (
                            <button
                              key={student.id}
                              type="button"
                              onClick={() =>
                                setSelectedStudentIds((current) =>
                                  current.includes(student.id) ? current.filter((id) => id !== student.id) : [...current, student.id],
                                )
                              }
                              style={{ borderRadius: 12, border: active ? `1px solid color-mix(in srgb, ${accent} 36%, ${palette.border})` : `1px solid ${palette.border}`, background: active ? `color-mix(in srgb, ${accent} 14%, transparent)` : palette.surface, color: palette.text, padding: '10px 12px', textAlign: 'left', fontWeight: 800, cursor: 'pointer' }}
                            >
                              {student.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.surface2, padding: 10, fontSize: 12.5, color: palette.text }}>
                    This assignment will be sent to every student in {selectedClass?.name ?? 'the selected class'}.
                  </div>
                )}
              </div>
            ) : null}

            {wizardStep === 2 ? (
              <div style={{ marginTop: 6, display: 'grid', gap: 12 }}>
                <div style={{ fontSize: 19, fontWeight: 950, color: palette.text }}>Step 2: Date and schedule</div>
                <div style={{ fontSize: 13.5, color: palette.text2 }}>You can pick one or more days for this assignment.</div>
                <div style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.surface2, padding: 10, fontSize: 12.5, color: palette.text }}>
                  Selected dates: {assignDates.length ? assignDates.map(fmtDate).join(', ') : 'None'}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setAssignDates([todayKey])} style={{ borderRadius: 999, border: `1px solid ${palette.border}`, background: palette.surface2, color: palette.text, padding: '7px 12px', fontSize: 12, fontWeight: 850, cursor: 'pointer' }}>Today</button>
                  <button type="button" onClick={() => setAssignDates([addDays(todayKey, 1)])} style={{ borderRadius: 999, border: `1px solid ${palette.border}`, background: palette.surface2, color: palette.text, padding: '7px 12px', fontSize: 12, fontWeight: 850, cursor: 'pointer' }}>Tomorrow</button>
                  <button type="button" onClick={() => setAssignDates([0, 1, 2, 3, 4].map((offset) => addDays(todayKey, offset)))} style={{ borderRadius: 999, border: `1px solid ${palette.border}`, background: palette.surface2, color: palette.text, padding: '7px 12px', fontSize: 12, fontWeight: 850, cursor: 'pointer' }}>Next 5 days</button>
                  <button type="button" onClick={() => setAssignDates([])} style={{ borderRadius: 999, border: `1px solid ${palette.border}`, background: 'transparent', color: palette.text, padding: '7px 12px', fontSize: 12, fontWeight: 850, cursor: 'pointer' }}>Clear dates</button>
                </div>
                <div style={{ borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.surface2, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <button type="button" onClick={() => setCalendarMonth((m) => addMonth(m, -1))} style={{ borderRadius: 10, border: `1px solid ${palette.border}`, background: palette.surface, color: palette.text, width: 34, height: 34, cursor: 'pointer', display: 'grid', placeItems: 'center' }}><ChevronLeft style={{ width: 16, height: 16 }} /></button>
                    <div style={{ fontSize: 14, fontWeight: 900 }}>{fmtMonth(calendarMonth)}</div>
                    <button type="button" onClick={() => setCalendarMonth((m) => addMonth(m, 1))} style={{ borderRadius: 10, border: `1px solid ${palette.border}`, background: palette.surface, color: palette.text, width: 34, height: 34, cursor: 'pointer', display: 'grid', placeItems: 'center' }}><ChevronRight style={{ width: 16, height: 16 }} /></button>
                  </div>
                  <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 900, color: palette.text3 }}>{d}</div>)}
                    {calendarCells.map((cell) => {
                      const selected = assignDates.includes(cell.key);
                      return (
                        <button
                          key={cell.key}
                          type="button"
                          onClick={() => toggleDate(cell.key)}
                          style={{ borderRadius: 10, border: selected ? `1px solid color-mix(in srgb, ${accent} 36%, ${palette.border})` : `1px solid ${palette.border}`, background: selected ? `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 70%, white))` : palette.surface, color: selected ? ctaText : palette.text, height: 34, fontWeight: 900, cursor: 'pointer', opacity: cell.inMonth ? 1 : 0.65 }}
                        >
                          {cell.day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {wizardStep === 3 ? (
              <div style={{ marginTop: 6, display: 'grid', gap: 12 }}>
                <div style={{ fontSize: 19, fontWeight: 950 }}>Step 3: Writing</div>
                <div style={{ borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.surface2, padding: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 900 }}>Writing options</div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {WRITING_TYPE_OPTIONS.map((type) => {
                      const active = (assignWriting?.piecesByType?.[type] ?? 0) > 0;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setAssignWriting((current) => {
                              const next = current ? { ...current } : { piecesByType: {}, minWordsByType: {}, notes: '' };
                              const pieces = { ...(next.piecesByType ?? {}) };
                              if (active) delete pieces[type];
                              else pieces[type] = 1;
                              next.piecesByType = pieces;
                              next.minWordsByType = { ...(next.minWordsByType ?? {}), [type]: next.minWordsByType?.[type] ?? 400 };
                              return next;
                            });
                          }}
                          style={{ borderRadius: 999, border: active ? `1px solid color-mix(in srgb, ${accent} 34%, ${palette.border})` : `1px solid ${palette.border}`, background: active ? `color-mix(in srgb, ${accent} 14%, transparent)` : 'transparent', color: palette.text, padding: '8px 10px', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>

                  {Object.entries(assignWriting?.piecesByType ?? {}).filter(([, v]) => (v ?? 0) > 0).map(([type, count]) => (
                    <div key={type} style={{ marginTop: 10, borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.surface, padding: 10 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 900 }}>{type.toUpperCase()}</div>
                      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'auto 56px auto 1fr', alignItems: 'center', gap: 8 }}>
                        <button type="button" onClick={() => setAssignWriting((current) => current ? { ...current, piecesByType: { ...(current.piecesByType ?? {}), [type]: clamp((current.piecesByType?.[type] ?? 1) - 1, 1, 8) } } : current)} style={{ borderRadius: 9, border: `1px solid ${palette.border}`, background: 'transparent', color: palette.text, width: 30, height: 30, cursor: 'pointer' }}>-</button>
                        <div style={{ textAlign: 'center', fontWeight: 900 }}>{count}</div>
                        <button type="button" onClick={() => setAssignWriting((current) => current ? { ...current, piecesByType: { ...(current.piecesByType ?? {}), [type]: clamp((current.piecesByType?.[type] ?? 1) + 1, 1, 8) } } : current)} style={{ borderRadius: 9, border: `1px solid ${palette.border}`, background: 'transparent', color: palette.text, width: 30, height: 30, cursor: 'pointer' }}>+</button>
                        <input type="number" value={assignWriting?.minWordsByType?.[type] ?? 400} onChange={(e) => setAssignWriting((current) => current ? { ...current, minWordsByType: { ...(current.minWordsByType ?? {}), [type]: clamp(Number(e.target.value) || 400, 50, 2000) } } : current)} style={{ borderRadius: 10, border: `1px solid ${palette.border}`, background: palette.surface2, color: palette.text, padding: '8px 10px', fontSize: 12.5 }} />
                      </div>
                    </div>
                  ))}

                  <textarea value={assignWriting?.notes ?? ''} onChange={(e) => setAssignWriting((current) => current ? { ...current, notes: e.target.value } : { piecesByType: {}, minWordsByType: {}, notes: e.target.value })} placeholder="Optional writing instructions" rows={3} style={{ marginTop: 10, width: '100%', borderRadius: 10, border: `1px solid ${palette.border}`, background: palette.surface, color: palette.text, padding: 9 }} />
                  <button type="button" onClick={() => setAssignWriting(null)} style={{ marginTop: 8, borderRadius: 10, border: `1px solid ${palette.border}`, background: 'transparent', color: palette.text, padding: '8px 10px', fontWeight: 800, cursor: 'pointer' }}>Remove writing from this assignment</button>
                </div>
              </div>
            ) : null}

            {wizardStep === 4 ? (
              <div style={{ marginTop: 6, display: 'grid', gap: 12 }}>
                <div style={{ fontSize: 19, fontWeight: 950 }}>Step 4: Vocab</div>
                <div style={{ borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.surface2, padding: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 900 }}>Vocab options</div>
                  <div style={{ marginTop: 8, borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.surface, padding: 10 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 900 }}>Words to learn</div>
                    <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'auto 56px auto', alignItems: 'center', gap: 8, width: 150 }}>
                      <button type="button" onClick={() => setAssignVocab((v) => ({ wordsToLearn: clamp((v?.wordsToLearn ?? 0) - 1, 0, 80), requireDrill: v?.requireDrill ?? false, notes: v?.notes ?? '' }))} style={{ borderRadius: 9, border: `1px solid ${palette.border}`, background: 'transparent', color: palette.text, width: 30, height: 30, cursor: 'pointer' }}>-</button>
                      <div style={{ textAlign: 'center', fontWeight: 900 }}>{assignVocab?.wordsToLearn ?? 0}</div>
                      <button type="button" onClick={() => setAssignVocab((v) => ({ wordsToLearn: clamp((v?.wordsToLearn ?? 0) + 1, 0, 80), requireDrill: v?.requireDrill ?? false, notes: v?.notes ?? '' }))} style={{ borderRadius: 9, border: `1px solid ${palette.border}`, background: 'transparent', color: palette.text, width: 30, height: 30, cursor: 'pointer' }}>+</button>
                    </div>
                    <button type="button" onClick={() => setAssignVocab((v) => ({ wordsToLearn: v?.wordsToLearn ?? 0, requireDrill: !(v?.requireDrill ?? false), notes: v?.notes ?? '' }))} style={{ marginTop: 9, borderRadius: 10, border: `1px solid ${palette.border}`, background: assignVocab?.requireDrill ? `color-mix(in srgb, ${mint} 16%, transparent)` : 'transparent', color: palette.text, padding: '8px 10px', fontWeight: 850, cursor: 'pointer' }}>Drill required</button>
                    <textarea value={assignVocab?.notes ?? ''} onChange={(e) => setAssignVocab((v) => ({ wordsToLearn: v?.wordsToLearn ?? 0, requireDrill: v?.requireDrill ?? false, notes: e.target.value }))} placeholder="Optional vocab instructions" rows={3} style={{ marginTop: 9, width: '100%', borderRadius: 10, border: `1px solid ${palette.border}`, background: palette.surface2, color: palette.text, padding: 9 }} />
                    <button type="button" onClick={() => setAssignVocab(null)} style={{ marginTop: 8, borderRadius: 10, border: `1px solid ${palette.border}`, background: 'transparent', color: palette.text, padding: '8px 10px', fontWeight: 800, cursor: 'pointer' }}>Remove vocab from this assignment</button>
                  </div>
                </div>
              </div>
            ) : null}

            {wizardStep === 5 ? (
              <div style={{ marginTop: 6, display: 'grid', gap: 12 }}>
                <div style={{ fontSize: 19, fontWeight: 950 }}>Step 5: Review and assign</div>
                <div style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.surface2, padding: 12, display: 'grid', gap: 7, fontSize: 13 }}>
                  <div>Assigned dates: {assignDates.length ? assignDates.map(fmtDate).join(', ') : 'None'}</div>
                  <div>Assigned to: {selectedTargetLabel}</div>
                  <div>Class: {selectedClass?.name ?? 'N/A'}</div>
                  {targetMode === 'students' ? <div>Selected students: {selectedStudentIds.map((id) => studentNameMap.get(id) ?? 'Student').join(', ') || 'None'}</div> : null}
                  <div>Categories: {assignWriting ? 'Writing' : ''}{assignWriting && assignVocab ? ' + ' : ''}{assignVocab ? 'Vocab' : ''}</div>
                  <div>Writing summary: {assignWriting ? `${Object.entries(assignWriting.piecesByType).filter(([, c]) => (c ?? 0) > 0).length} writing type(s)` : 'None'}</div>
                  <div>Vocab summary: {assignVocab ? `${assignVocab.wordsToLearn} words${assignVocab.requireDrill ? ' + drill' : ''}` : 'None'}</div>
                </div>
                <textarea value={assignNote} onChange={(e) => setAssignNote(e.target.value)} placeholder="Optional note shown to your students" rows={4} style={{ width: '100%', borderRadius: 10, border: `1px solid ${palette.border}`, background: palette.surface2, color: palette.text, padding: 10 }} />
                {assignmentError ? (
                  <div style={{ borderRadius: 12, border: `1px solid color-mix(in srgb, ${palette.dangerBorder} 70%, ${palette.border})`, background: `color-mix(in srgb, ${palette.dangerBg} 55%, ${palette.surface2})`, color: '#fecaca', padding: 10, fontSize: 12.5, fontWeight: 850 }}>
                    {assignmentError}
                  </div>
                ) : null}
              </div>
            ) : null}
            </div>

            <div style={{ borderTop: `1px solid ${palette.border}`, padding: 16, display: 'flex', justifyContent: 'space-between', gap: 10, background: `linear-gradient(180deg, transparent, color-mix(in srgb, ${accent} 6%, transparent))` }}>
              <button
                type="button"
                onClick={() => {
                  if (wizardStep === 1) setWizardOpen(false);
                  else setWizardStep((s) => clamp((s - 1) as WizardStep, 1, 5) as WizardStep);
                }}
                style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: 'transparent', color: palette.text, padding: '12px 16px', fontWeight: 900, cursor: 'pointer', minWidth: 112 }}
              >
                {wizardStep === 1 ? 'Cancel' : 'Back'}
              </button>
              {wizardStep < 5 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep((s) => clamp((s + 1) as WizardStep, 1, 5) as WizardStep)}
                  style={{ borderRadius: 14, border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`, background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 70%, white))`, color: ctaText, padding: '12px 18px', fontWeight: 900, cursor: 'pointer', minWidth: 132 }}
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { void assignFromWizard(); }}
                  disabled={assignmentSaving}
                  style={{ borderRadius: 14, border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`, background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 70%, white))`, color: ctaText, padding: '12px 18px', fontWeight: 900, cursor: assignmentSaving ? 'wait' : 'pointer', minWidth: 168, opacity: assignmentSaving ? 0.8 : 1 }}
                >
                  {assignmentSaving ? 'Assigning…' : 'Assign Homework'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
