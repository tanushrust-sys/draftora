'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Clock3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Flame,
  Loader2,
  Plus,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import { authFetchJson } from '@/app/lib/auth-fetch';
import {
  HOMEWORK_DAY_KEYS,
  WRITING_TYPE_OPTIONS,
  createDefaultVocabConfig,
  createDefaultWeeklyPlan,
  createDefaultWritingConfig,
  formatHomeworkDate,
  getHomeworkDayKey,
  normalizeWeeklyPlan,
  type HomeworkDayKey,
  type HomeworkPayload,
  type HomeworkTaskItem,
  type WeeklyHomeworkPlan,
  type WritingHomeworkConfig,
} from '@/app/lib/homework';

type ParentStudent = {
  studentId: string;
  studentCode: string;
  profile: {
    username: string;
    level: number;
    streak: number;
    title: string;
    age_group: string;
  } | null;
};

type ParentHomeworkResponse = {
  student: {
    id: string;
    username: string;
    level: number;
    streak: number;
    title: string;
    age_group: string;
  };
  timetable: WeeklyHomeworkPlan;
  recentAssignments: Array<{
    id: string;
    assignedDate: string;
    dueDate: string;
    dueLabel: string;
    title: string;
    payload: HomeworkPayload;
  }>;
  todayTasks: HomeworkTaskItem[];
  upcoming: HomeworkTaskItem[];
  performance: {
    days: Array<{
      date: string;
      weekday: string;
      completionRate: number;
      writingCompleted: number;
      writingRequired: number;
      vocabCompleted: number;
      vocabRequired: number;
      assigned: HomeworkTaskItem[];
    }>;
    summary: {
      twoWeekCompletionRate: number;
      writingCompletionRate: number;
      vocabCompletionRate: number;
      strongestArea: string;
      improvementArea: string;
      consistencyStreak: number;
      insights: string[];
      nextSteps: string[];
    };
  };
};

type ParentHomeworkPanelProps = {
  authToken: string;
  links: ParentStudent[];
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
  mode: 'dark' | 'light';
};

type HomeworkAction = 'assign' | 'timetable' | 'currentFuture' | 'performance';
type AssignStep = 1 | 2 | 3 | 4;
type TimetableStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const dayLabelMap: Record<HomeworkDayKey, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const calendarWeekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toYmd(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromYmd(value: string) {
  const [y, m, d] = value.split('-').map((part) => Number(part));
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function capitalizeFirst(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function cloneDayPlan(plan: WeeklyHomeworkPlan[HomeworkDayKey]): WeeklyHomeworkPlan[HomeworkDayKey] {
  return {
    writing: plan.writing
      ? {
          ...plan.writing,
          piecesByType: { ...(plan.writing.piecesByType ?? {}) },
          minWordsByType: { ...(plan.writing.minWordsByType ?? {}) },
        }
      : null,
    vocab: plan.vocab ? { ...plan.vocab } : null,
    notes: plan.notes ?? '',
  };
}

function groupTasksByDueDate(tasks: HomeworkTaskItem[]) {
  const grouped = new Map<string, HomeworkTaskItem[]>();
  for (const task of tasks) {
    const key = task.dueDate || '';
    const list = grouped.get(key);
    if (list) {
      list.push(task);
    } else {
      grouped.set(key, [task]);
    }
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => {
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b);
    })
    .map(([dueDate, items]) => ({ dueDate, items }));
}

function formatPerformanceDay(date: string) {
  return fromYmd(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function CounterField({
  label,
  value,
  onChange,
  min = 0,
  max = 12,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div style={{ borderRadius: 16, border: '1px solid var(--workspace-border)', padding: 12, background: 'var(--workspace-surface2)', display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--workspace-text3)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1, min, max))}
          style={{ width: 30, height: 30, borderRadius: 10, border: '1px solid var(--workspace-border)', background: 'transparent', color: 'var(--workspace-text)', cursor: 'pointer' }}
        >
          -
        </button>
        <div style={{ minWidth: 34, textAlign: 'center', fontSize: 20, fontWeight: 900 }}>{value}</div>
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1, min, max))}
          style={{ width: 30, height: 30, borderRadius: 10, border: '1px solid var(--workspace-border)', background: 'transparent', color: 'var(--workspace-text)', cursor: 'pointer' }}
        >
          +
        </button>
      </div>
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 999,
        border: active ? '1px solid rgba(77,212,168,0.38)' : '1px solid var(--workspace-border)',
        background: active ? 'linear-gradient(135deg, rgba(77,212,168,0.32), rgba(103,232,249,0.2))' : 'rgba(255,255,255,0.02)',
        color: 'var(--workspace-text)',
        padding: '10px 14px',
        fontSize: 13,
        fontWeight: 800,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function ActionButton({
  icon,
  title,
  active,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 18,
        border: active ? '1px solid rgba(77,212,168,0.5)' : '1px solid var(--workspace-border)',
        background: active
          ? 'linear-gradient(138deg, rgba(77,212,168,0.38) 0%, rgba(103,232,249,0.25) 100%)'
          : 'linear-gradient(145deg, color-mix(in srgb, var(--workspace-surface2) 82%, transparent), var(--workspace-surface))',
        color: 'var(--workspace-text)',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 13.5,
        fontWeight: 850,
        cursor: 'pointer',
        boxShadow: active ? '0 16px 34px rgba(77,212,168,0.2)' : '0 10px 24px rgba(2,6,23,0.08)',
        transform: active ? 'translateY(-1px)' : 'none',
      }}
    >
      {icon}
      {title}
    </button>
  );
}

export function ParentHomeworkPanel({
  authToken,
  links,
  selectedStudentId,
  onSelectStudent,
  mode,
}: ParentHomeworkPanelProps) {
  const [activeAction, setActiveAction] = useState<HomeworkAction>('assign');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [data, setData] = useState<ParentHomeworkResponse | null>(null);

  const [selectedDates, setSelectedDates] = useState<string[]>(() => [toYmd(new Date())]);
  const [writingOn, setWritingOn] = useState(false);
  const [vocabOn, setVocabOn] = useState(false);
  const [writingCfg, setWritingCfg] = useState<WritingHomeworkConfig>(() => createDefaultWritingConfig());
  const [vocabCfg, setVocabCfg] = useState(() => createDefaultVocabConfig());
  const [parentNotes, setParentNotes] = useState('');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [timetableModalOpen, setTimetableModalOpen] = useState(false);
  const [timetableStep, setTimetableStep] = useState<TimetableStep>(1);
  const [assignStep, setAssignStep] = useState<AssignStep>(1);
  const [timelineWindowDays, setTimelineWindowDays] = useState<7 | 14 | 30>(14);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => startOfMonth(new Date()));

  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyHomeworkPlan>(() => createDefaultWeeklyPlan());

  const selectedDatesSorted = useMemo(() => [...selectedDates].sort(), [selectedDates]);
  const selectedDatesText = useMemo(() => selectedDatesSorted.map((date) => formatHomeworkDate(date)).join(', '), [selectedDatesSorted]);
  const todayKey = toYmd(new Date());

  const selectedStudent = useMemo(() => links.find((l) => l.studentId === selectedStudentId) ?? null, [links, selectedStudentId]);
  const selectedWritingTypes = useMemo(
    () => WRITING_TYPE_OPTIONS.filter((typeLabel) => (writingCfg.piecesByType[typeLabel] ?? 0) > 0),
    [writingCfg.piecesByType],
  );

  const fetchHomeworkData = useCallback(async () => {
    if (!authToken || !selectedStudentId) return;
    setLoading(true);
    setError('');
    try {
      const today = toYmd(new Date());
      const res = await authFetchJson<ParentHomeworkResponse>(`/api/homework?studentId=${encodeURIComponent(selectedStudentId)}&today=${encodeURIComponent(today)}`, { token: authToken });
      setData(res);
      setWeeklyPlan(normalizeWeeklyPlan(res.timetable));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load homework workspace.');
    } finally {
      setLoading(false);
    }
  }, [authToken, selectedStudentId]);

  useEffect(() => {
    void fetchHomeworkData();
  }, [fetchHomeworkData]);

  const assignHomework = async () => {
    if (!selectedStudentId) return;
    if (!writingOn && !vocabOn) {
      setError('Turn on Writing, Vocab, or both before assigning.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const payload: HomeworkPayload = {
      writing: writingOn && selectedWritingTypes.length > 0
        ? { ...writingCfg, totalPieces: Object.values(writingCfg.piecesByType ?? {}).reduce((sum, count) => sum + count, 0) }
        : null,
      vocab: vocabOn ? vocabCfg : null,
      parentNotes,
    };

    try {
      await authFetchJson('/api/homework', {
        token: authToken,
        method: 'POST',
        body: {
          studentId: selectedStudentId,
          assignedDates: selectedDatesSorted,
          payload,
        },
      });
      setSuccess('Homework assigned and pushed to the student view.');
      setAssignModalOpen(false);
      setAssignStep(1);
      void fetchHomeworkData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not assign homework.');
    } finally {
      setSaving(false);
    }
  };

  const saveTimetable = async (closeAfterSave = false, planOverride?: WeeklyHomeworkPlan) => {
    if (!selectedStudentId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    const planToSave = planOverride ?? weeklyPlan;
    try {
      await authFetchJson('/api/homework', {
        token: authToken,
        method: 'PUT',
        body: {
          studentId: selectedStudentId,
          weeklyPlan: planToSave,
        },
      });
      setSuccess('Weekly timetable saved for the student homepage.');
      if (closeAfterSave) {
        setTimetableModalOpen(false);
      }
      void fetchHomeworkData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save weekly timetable.');
    } finally {
      setSaving(false);
    }
  };

  const deleteHomeworkAssignment = async (assignmentId: string, splitKind?: 'writing' | 'vocab') => {
    if (!selectedStudentId || !assignmentId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await authFetchJson('/api/homework', {
        token: authToken,
        method: 'DELETE',
        body: {
          studentId: selectedStudentId,
          assignmentId,
          splitKind,
        },
      });
      setSuccess(splitKind ? `${capitalizeFirst(splitKind)} task deleted.` : 'Homework deleted.');
      void fetchHomeworkData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete homework.');
    } finally {
      setSaving(false);
    }
  };

  const deleteHomeworkTask = async (task: HomeworkTaskItem) => {
    const splitKindRaw = task.id.includes('::') ? task.id.split('::')[1] : '';
    const splitKind = splitKindRaw === 'writing' || splitKindRaw === 'vocab' ? splitKindRaw : null;

    if (task.source === 'one_time') {
      await deleteHomeworkAssignment(task.id.split('::')[0] ?? task.id, splitKind ?? undefined);
      return;
    }

    const due = task.dueDate ? new Date(`${task.dueDate}T00:00:00`) : new Date();
    const dayKey = getHomeworkDayKey(due);
    const nextPlan: WeeklyHomeworkPlan = {
      ...weeklyPlan,
      [dayKey]: {
        ...weeklyPlan[dayKey],
        writing: splitKind === 'vocab' ? weeklyPlan[dayKey].writing : null,
        vocab: splitKind === 'writing' ? weeklyPlan[dayKey].vocab : null,
      },
    };
    setWeeklyPlan(nextPlan);
    await saveTimetable(false, nextPlan);
    if (splitKind) {
      setSuccess(`${capitalizeFirst(splitKind)} recurring task removed from ${dayLabelMap[dayKey]}.`);
    } else {
      setSuccess(`${dayLabelMap[dayKey]} recurring homework removed.`);
    }
  };

  const setDayPlan = (day: HomeworkDayKey, updater: (current: WeeklyHomeworkPlan[HomeworkDayKey]) => WeeklyHomeworkPlan[HomeworkDayKey]) => {
    setWeeklyPlan((prev) => ({
      ...prev,
      [day]: updater(prev[day]),
    }));
  };

  const openAssignModal = () => {
    const today = toYmd(new Date());
    setActiveAction('assign');
    setAssignStep(1);
    setTimetableModalOpen(false);
    setWritingOn(false);
    setVocabOn(false);
    setWritingCfg(createDefaultWritingConfig());
    setVocabCfg(createDefaultVocabConfig());
    setParentNotes('');
    setSelectedDates([today]);
    setAssignModalOpen(true);
    setCalendarMonth(startOfMonth(fromYmd(today)));
    setError('');
    setSuccess('');
  };

  const closeAssignModal = () => {
    setAssignModalOpen(false);
    setAssignStep(1);
  };

  const openTimetableModal = () => {
    setAssignModalOpen(false);
    setActiveAction('timetable');
    setTimetableModalOpen(true);
    setTimetableStep(1);
    setError('');
    setSuccess('');
  };

  const selectCalendarDay = (date: Date) => {
    const value = toYmd(date);
    if (value < todayKey) return;
    setSelectedDates((current) => {
      if (current.includes(value)) {
        return current.length > 1 ? current.filter((d) => d !== value) : current;
      }
      return [...current, value];
    });
  };

  const calendarDays = useMemo(() => {
    const first = startOfMonth(calendarMonth);
    const startOffset = (first.getDay() + 6) % 7;
    const startDate = new Date(first);
    startDate.setDate(first.getDate() - startOffset);
    return Array.from({ length: 42 }, (_, idx) => {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + idx);
      return day;
    });
  }, [calendarMonth]);
  const recentAssignmentsPreview = (data?.recentAssignments ?? []).slice(0, 6);
  const currentTasks = data?.todayTasks ?? [];
  const futureTasks = data?.upcoming ?? [];
  const currentTaskGroups = useMemo(() => groupTasksByDueDate(currentTasks), [currentTasks]);
  const futureTaskGroups = useMemo(() => groupTasksByDueDate(futureTasks), [futureTasks]);
  const performanceDays = data?.performance.days ?? [];
  const timelineOptions: Array<7 | 14 | 30> = performanceDays.length > 14 ? [7, 14, 30] : [7, 14];
  const visiblePerformanceDays = performanceDays.slice(0, Math.min(timelineWindowDays, performanceDays.length));

  return (
    <section style={{ borderRadius: 30, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface)', boxShadow: mode === 'dark' ? '0 24px 72px rgba(0,0,0,0.3)' : '0 18px 46px rgba(15,23,42,0.13)', padding: 22, display: 'grid', gap: 18 }}>
      <div
        style={{
          display: 'grid',
          gap: 10,
          borderRadius: 22,
          border: '1px solid color-mix(in srgb, var(--workspace-border) 88%, transparent)',
          background: mode === 'dark'
            ? 'linear-gradient(135deg, rgba(14,22,36,0.98) 0%, rgba(9,31,39,0.96) 56%, rgba(20,78,69,0.42) 100%)'
            : 'linear-gradient(135deg, rgba(236,253,245,0.92) 0%, rgba(204,251,241,0.78) 60%, rgba(165,243,252,0.56) 100%)',
          padding: 18,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#34d399' }}>Homework</div>
        <div style={{ fontSize: 33, fontWeight: 950, letterSpacing: '-0.05em', lineHeight: 1.05 }}>Plan, assign, and track with clarity</div>
        <div style={{ fontSize: 14, color: 'var(--workspace-text2)', lineHeight: 1.7 }}>
          Start by selecting a child, then assign one-time homework, build a recurring weekly timetable, and review meaningful progress from the last two weeks.
        </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ borderRadius: 999, padding: '7px 12px', fontSize: 12, fontWeight: 800, background: 'rgba(16,185,129,0.16)', border: '1px solid rgba(16,185,129,0.35)' }}>
            {links.length} linked student{links.length === 1 ? '' : 's'}
          </div>
          <div style={{ borderRadius: 999, padding: '7px 12px', fontSize: 12, fontWeight: 800, background: 'rgba(56,189,248,0.16)', border: '1px solid rgba(56,189,248,0.34)' }}>
            {activeAction === 'assign'
              ? 'Assign mode'
              : activeAction === 'timetable'
                ? 'Timetable mode'
                : activeAction === 'currentFuture'
                  ? 'Current/future mode'
                  : 'Performance mode'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {links.map((link) => {
          const active = link.studentId === selectedStudentId;
          return (
            <button
              key={link.studentId}
              type="button"
              onClick={() => onSelectStudent(link.studentId)}
              style={{
                borderRadius: 20,
                border: active ? '1px solid rgba(77,212,168,0.45)' : '1px solid var(--workspace-border)',
                background: active ? 'linear-gradient(145deg, rgba(77,212,168,0.16), rgba(103,232,249,0.12))' : 'var(--workspace-surface2)',
                padding: 14,
                textAlign: 'left',
                display: 'grid',
                gap: 10,
                cursor: 'pointer',
                color: 'var(--workspace-text)',
                boxShadow: active ? '0 14px 28px rgba(77,212,168,0.16)' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' }}>
                <div style={{ fontSize: 17, fontWeight: 900 }}>{capitalizeFirst(link.profile?.username || 'Student')}</div>
                <ChevronRight style={{ width: 16, height: 16, color: active ? '#4dd4a8' : 'var(--workspace-text3)' }} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--workspace-text2)' }}>Lv {link.profile?.level ?? 1} · {link.profile?.title || 'Writer'} · {link.profile?.streak ?? 0}d streak</div>
              <div style={{ fontSize: 12, color: 'var(--workspace-text3)' }}>Code {link.studentCode}</div>
            </button>
          );
        })}
      </div>

      {!selectedStudent ? (
        <div style={{ borderRadius: 18, border: '1px dashed var(--workspace-border)', padding: 18, color: 'var(--workspace-text2)' }}>Select a student card to open the homework controls.</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <ActionButton icon={<ClipboardCheck style={{ width: 16, height: 16 }} />} title="Assign Homework" active={activeAction === 'assign'} onClick={() => { setAssignModalOpen(false); setTimetableModalOpen(false); setActiveAction('assign'); }} />
            <ActionButton icon={<CalendarDays style={{ width: 16, height: 16 }} />} title="Timetable" active={activeAction === 'timetable'} onClick={() => { setAssignModalOpen(false); setTimetableModalOpen(false); setActiveAction('timetable'); }} />
            <ActionButton icon={<Clock3 style={{ width: 16, height: 16 }} />} title="Current/Future" active={activeAction === 'currentFuture'} onClick={() => { setAssignModalOpen(false); setTimetableModalOpen(false); setActiveAction('currentFuture'); }} />
            <ActionButton icon={<BarChart3 style={{ width: 16, height: 16 }} />} title="View Performance" active={activeAction === 'performance'} onClick={() => { setAssignModalOpen(false); setTimetableModalOpen(false); setActiveAction('performance'); }} />
          </div>

          {loading ? (
            <div style={{ borderRadius: 18, border: '1px solid var(--workspace-border)', padding: 18, background: 'var(--workspace-surface2)', color: 'var(--workspace-text2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />
              Loading homework workspace...
            </div>
          ) : null}

          {activeAction === 'assign' && !loading ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ borderRadius: 24, border: '1px solid rgba(16,185,129,0.4)', background: 'linear-gradient(135deg, color-mix(in srgb, var(--workspace-surface2) 78%, rgba(16,185,129,0.24)) 0%, color-mix(in srgb, var(--workspace-surface2) 90%, rgba(56,189,248,0.2)) 55%, color-mix(in srgb, var(--workspace-surface2) 96%, rgba(14,165,233,0.12)) 100%)', padding: 20, display: 'grid', gap: 16, boxShadow: '0 20px 40px rgba(16,185,129,0.16)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start' }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 20, fontWeight: 950, letterSpacing: '-0.02em' }}>
                      <ClipboardCheck style={{ width: 18, height: 18, color: '#22c55e' }} />
                      Guided assignment flow
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--workspace-text2)', lineHeight: 1.75, maxWidth: 760 }}>
                      Build one assignment in minutes with a focused step-by-step wizard. Pick dates, set writing + vocab goals, review, and publish confidently.
                    </div>
                  </div>
                  <div style={{ borderRadius: 999, border: '1px solid rgba(16,185,129,0.42)', background: 'rgba(16,185,129,0.14)', padding: '7px 12px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 900, color: 'var(--workspace-text)', whiteSpace: 'nowrap' }}>
                    4-step wizard
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ borderRadius: 999, border: '1px solid rgba(34,197,94,0.35)', background: 'rgba(34,197,94,0.1)', padding: '5px 10px', fontSize: 12, fontWeight: 800 }}>Date selection</div>
                  <div style={{ borderRadius: 999, border: '1px solid rgba(56,189,248,0.35)', background: 'rgba(56,189,248,0.1)', padding: '5px 10px', fontSize: 12, fontWeight: 800 }}>Writing + vocab setup</div>
                  <div style={{ borderRadius: 999, border: '1px solid rgba(99,102,241,0.35)', background: 'rgba(99,102,241,0.1)', padding: '5px 10px', fontSize: 12, fontWeight: 800 }}>Final review</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={openAssignModal}
                    style={{
                      border: 'none',
                      borderRadius: 16,
                      padding: '14px 20px',
                      background: 'linear-gradient(135deg, #34d399 0%, #67e8f9 55%, #22d3ee 100%)',
                      color: '#00201a',
                      fontSize: 15,
                      fontWeight: 950,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      boxShadow: '0 18px 30px rgba(52,211,153,0.3)',
                      width: 'fit-content',
                    }}
                  >
                    <ClipboardCheck style={{ width: 15, height: 15 }} />
                    Open Assign Homework
                  </button>
                  <div style={{ fontSize: 12, color: 'var(--workspace-text3)', fontWeight: 700 }}>
                    Recommended when setting new weekly goals
                  </div>
                </div>
              </div>

            </div>
          ) : null}

          {assignModalOpen ? (
            <div
              role="dialog"
              aria-modal="true"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 80,
                background: 'rgba(2,6,23,0.56)',
                backdropFilter: 'blur(8px)',
                display: 'grid',
                placeItems: 'center',
                padding: 16,
              }}
            >
              <div
                style={{
                  width: 'min(920px, 100%)',
                  maxHeight: '92vh',
                  overflow: 'auto',
                  borderRadius: 24,
                  border: '1px solid var(--workspace-border)',
                  background: 'var(--workspace-surface)',
                  boxShadow: '0 30px 90px rgba(0,0,0,0.38)',
                  padding: 18,
                  display: 'grid',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4dd4a8' }}>Assign homework</div>
                    <div style={{ fontSize: 20, fontWeight: 950, letterSpacing: '-0.03em' }}>
                      {capitalizeFirst(selectedStudent?.profile?.username || 'Student')} · Step {assignStep} of 4
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeAssignModal}
                    style={{ borderRadius: 12, width: 34, height: 34, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface2)', color: 'var(--workspace-text)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                  >
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      style={{
                        borderRadius: 999,
                        border: `1px solid ${assignStep >= n ? 'rgba(77,212,168,0.45)' : 'var(--workspace-border)'}`,
                        background: assignStep >= n ? 'linear-gradient(135deg, rgba(77,212,168,0.24), rgba(103,232,249,0.16))' : 'var(--workspace-surface2)',
                        padding: '8px 10px',
                        textAlign: 'center',
                        fontSize: 12,
                        fontWeight: 800,
                        color: assignStep >= n ? 'var(--workspace-text)' : 'var(--workspace-text3)',
                      }}
                    >
                      {n === 1 ? 'Date' : n === 2 ? 'Writing' : n === 3 ? 'Vocab' : 'Review'}
                    </div>
                  ))}
                </div>

                {assignStep === 1 ? (
                  <div style={{ borderRadius: 18, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface2)', padding: 14, display: 'grid', gap: 12 }}>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <div style={{ fontSize: 15, fontWeight: 900 }}>Step 1: Date and schedule</div>
                      <div style={{ fontSize: 13, color: 'var(--workspace-text3)', lineHeight: 1.4 }}>You can pick one or more days for this assignment.</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
                      <div
                        style={{
                          borderRadius: 14,
                          border: '1px solid rgba(77,212,168,0.48)',
                          background: 'linear-gradient(135deg, rgba(77,212,168,0.2), rgba(103,232,249,0.14))',
                          color: 'var(--workspace-text)',
                          padding: '12px 14px',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--workspace-text3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{selectedDates.length > 1 ? 'Assigned dates' : 'Assigned date'}</div>
                        <div style={{ marginTop: 4, fontSize: 15, fontWeight: 900 }}>{selectedDatesText}</div>
                      </div>
                    </div>

                    <div style={{ borderRadius: 14, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface)', padding: 12, display: 'grid', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setCalendarMonth((m) => addMonths(m, -1))}
                          style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface2)', color: 'var(--workspace-text)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                        >
                          <ChevronLeft style={{ width: 14, height: 14 }} />
                        </button>
                        <div style={{ fontSize: 14, fontWeight: 900 }}>
                          {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </div>
                        <button
                          type="button"
                          onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                          style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface2)', color: 'var(--workspace-text)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                        >
                          <ChevronRight style={{ width: 14, height: 14 }} />
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
                        {calendarWeekdays.map((wd) => (
                          <div key={wd} style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: 'var(--workspace-text3)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 0' }}>
                            {wd}
                          </div>
                        ))}
                        {calendarDays.map((day) => {
                          const value = toYmd(day);
                          const inCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                          const isAssigned = selectedDates.includes(value);
                          const isDisabled = value < todayKey;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => selectCalendarDay(day)}
                              disabled={isDisabled}
                              style={{
                                borderRadius: 10,
                                border: isAssigned ? '1px solid rgba(77,212,168,0.54)' : '1px solid var(--workspace-border)',
                                background: isAssigned
                                  ? 'linear-gradient(135deg, rgba(77,212,168,0.24), rgba(103,232,249,0.16))'
                                  : isDisabled
                                    ? 'rgba(226,232,240,0.8)'
                                    : 'var(--workspace-surface2)',
                                color: isDisabled
                                    ? 'var(--workspace-text3)'
                                    : inCurrentMonth
                                      ? 'var(--workspace-text)'
                                      : 'var(--workspace-text3)',
                                fontSize: 13,
                                fontWeight: isAssigned ? 900 : 700,
                                height: 36,
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                              }}
                              title={formatHomeworkDate(value)}
                            >
                              {day.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}

                {assignStep === 2 ? (
                  <div style={{ borderRadius: 18, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface2)', padding: 14, display: 'grid', gap: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 900 }}>Step 2: Writing</div>
                    {!writingOn ? (
                      <div style={{ borderRadius: 14, border: '1px dashed var(--workspace-border)', padding: 14, color: 'var(--workspace-text2)', background: 'var(--workspace-surface)', display: 'grid', gap: 10 }}>
                        <div>Writing is currently not included.</div>
                        <button
                          type="button"
                          onClick={() => {
                            setWritingOn(true);
                            setWritingCfg((prev) => ({
                              ...prev,
                              totalPieces: Object.values(prev.piecesByType ?? {}).reduce((sum, count) => sum + count, 0),
                            }));
                          }}
                          style={{ borderRadius: 10, border: '1px solid rgba(77,212,168,0.35)', background: 'linear-gradient(135deg, rgba(77,212,168,0.2), rgba(103,232,249,0.14))', color: 'var(--workspace-text)', padding: '8px 10px', fontSize: 12, fontWeight: 700, width: 'fit-content', cursor: 'pointer' }}
                        >
                          Add writing to homework
                        </button>
                      </div>
                    ) : (
                      <div style={{ borderRadius: 16, border: '1px solid rgba(77,212,168,0.28)', padding: 14, background: 'rgba(77,212,168,0.08)', display: 'grid', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 850, flexWrap: 'wrap' }}>
                          <FileText style={{ width: 15, height: 15, color: '#4dd4a8' }} />
                          Writing options
                          <span style={{ fontSize: 12, color: 'var(--workspace-text2)', fontWeight: 600 }}>
                            You can pick as many writing pieces as you want.
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {WRITING_TYPE_OPTIONS.map((typeLabel) => {
                            const selected = (writingCfg.piecesByType[typeLabel] ?? 0) > 0;
                            return (
                              <ToggleChip
                                key={typeLabel}
                                active={selected}
                                onClick={() => setWritingCfg((prev) => {
                                  const nextPieces = { ...(prev.piecesByType ?? {}) };
                                  const nextMins = { ...(prev.minWordsByType ?? {}) };
                                  if (nextPieces[typeLabel]) {
                                    delete nextPieces[typeLabel];
                                    delete nextMins[typeLabel];
                                  } else {
                                    nextPieces[typeLabel] = 1;
                                  }
                                  const totalPieces = Object.values(nextPieces).reduce((sum, count) => sum + count, 0);
                                  return {
                                    ...prev,
                                    piecesByType: nextPieces,
                                    minWordsByType: nextMins,
                                    totalPieces,
                                  };
                                })}
                                label={typeLabel}
                              />
                            );
                          })}
                        </div>
                        {selectedWritingTypes.length === 0 ? (
                          <div style={{ borderRadius: 12, border: '1px dashed var(--workspace-border)', padding: '10px 12px', fontSize: 12, color: 'var(--workspace-text2)', background: 'var(--workspace-surface)' }}>
                            Choose at least one writing type above.
                          </div>
                        ) : null}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                          {selectedWritingTypes.map((typeLabel) => (
                            <CounterField
                              key={`pieces-${typeLabel}`}
                              label={typeLabel}
                              value={writingCfg.piecesByType[typeLabel] ?? 0}
                              onChange={(n) => setWritingCfg((prev) => {
                                const nextPieces = { ...(prev.piecesByType ?? {}) };
                                if (n <= 0) {
                                  delete nextPieces[typeLabel];
                                } else {
                                  nextPieces[typeLabel] = n;
                                }
                                const totalPieces = Object.values(nextPieces).reduce((sum, count) => sum + count, 0);
                                return { ...prev, piecesByType: nextPieces, totalPieces };
                              })}
                              min={0}
                            />
                          ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                          {selectedWritingTypes.map((typeLabel) => (
                            <label key={`min-${typeLabel}`} style={{ display: 'grid', gap: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--workspace-text3)' }}>Min words ({typeLabel.toLowerCase()})</span>
                              <input
                                type="number"
                                min={0}
                                value={writingCfg.minWordsByType[typeLabel] ?? ''}
                                onChange={(e) => setWritingCfg((prev) => {
                                  const nextMins = { ...(prev.minWordsByType ?? {}) };
                                  const nextValue = e.target.value ? Number(e.target.value) : 0;
                                  if (nextValue <= 0) {
                                    delete nextMins[typeLabel];
                                  } else {
                                    nextMins[typeLabel] = nextValue;
                                  }
                                  return { ...prev, minWordsByType: nextMins };
                                })}
                                style={{ borderRadius: 12, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface)', color: 'var(--workspace-text)', padding: '10px 12px' }}
                              />
                            </label>
                          ))}
                        </div>
                        <textarea value={writingCfg.notes} onChange={(e) => setWritingCfg((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Optional writing instructions" rows={2} style={{ borderRadius: 12, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface)', color: 'var(--workspace-text)', padding: '10px 12px', resize: 'vertical' }} />
                        <button
                          type="button"
                          onClick={() => {
                            setWritingOn(false);
                            setWritingCfg(createDefaultWritingConfig());
                          }}
                          style={{ borderRadius: 10, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface)', color: 'var(--workspace-text2)', padding: '8px 10px', fontSize: 12, fontWeight: 700, width: 'fit-content', cursor: 'pointer' }}
                        >
                          Remove writing from this assignment
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}

                {assignStep === 3 ? (
                  <div style={{ borderRadius: 18, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface2)', padding: 14, display: 'grid', gap: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 900 }}>Step 3: Vocab</div>
                    {!vocabOn ? (
                      <div style={{ borderRadius: 14, border: '1px dashed var(--workspace-border)', padding: 14, color: 'var(--workspace-text2)', background: 'var(--workspace-surface)', display: 'grid', gap: 10 }}>
                        <div>Vocab is currently not included.</div>
                        <button
                          type="button"
                          onClick={() => setVocabOn(true)}
                          style={{ borderRadius: 10, border: '1px solid rgba(125,211,252,0.35)', background: 'linear-gradient(135deg, rgba(125,211,252,0.2), rgba(125,211,252,0.1))', color: 'var(--workspace-text)', padding: '8px 10px', fontSize: 12, fontWeight: 700, width: 'fit-content', cursor: 'pointer' }}
                        >
                          Add vocab to homework
                        </button>
                      </div>
                    ) : (
                      <div style={{ borderRadius: 16, border: '1px solid rgba(125,211,252,0.28)', padding: 14, background: 'rgba(125,211,252,0.08)', display: 'grid', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 850 }}>
                          <BookOpen style={{ width: 15, height: 15, color: '#7dd3fc' }} />
                          Vocab options
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                          <CounterField label="Words to learn" value={vocabCfg.wordsToLearn} onChange={(n) => setVocabCfg((prev) => ({ ...prev, wordsToLearn: n }))} max={80} />
                          <div style={{ borderRadius: 16, border: '1px solid var(--workspace-border)', padding: 12, background: 'var(--workspace-surface)', display: 'grid', alignContent: 'center' }}>
                            <div style={{ fontSize: 12, color: 'var(--workspace-text2)', marginBottom: 8 }}>
                              A drill is extra practice of vocabulary.
                            </div>
                            <ToggleChip active={vocabCfg.requireDrill} onClick={() => setVocabCfg((prev) => ({ ...prev, requireDrill: !prev.requireDrill }))} label={vocabCfg.requireDrill ? 'Drill required' : 'Drill optional'} />
                          </div>
                        </div>
                        <textarea value={vocabCfg.notes} onChange={(e) => setVocabCfg((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Optional vocab instructions" rows={2} style={{ borderRadius: 12, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface)', color: 'var(--workspace-text)', padding: '10px 12px', resize: 'vertical' }} />
                        <button
                          type="button"
                          onClick={() => setVocabOn(false)}
                          style={{ borderRadius: 10, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface)', color: 'var(--workspace-text2)', padding: '8px 10px', fontSize: 12, fontWeight: 700, width: 'fit-content', cursor: 'pointer' }}
                        >
                          Remove vocab from this assignment
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}

                {assignStep === 4 ? (
                  <div style={{ borderRadius: 18, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface2)', padding: 14, display: 'grid', gap: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 900 }}>Step 4: Review and assign</div>
                    <div style={{ borderRadius: 14, border: '1px solid var(--workspace-border)', padding: 12, background: 'var(--workspace-surface)', display: 'grid', gap: 8 }}>
                      <div style={{ fontSize: 13, color: 'var(--workspace-text2)' }}><strong>{selectedDates.length > 1 ? 'Assigned dates' : 'Assigned' }:</strong> {selectedDatesText}</div>
                      <div style={{ fontSize: 13, color: 'var(--workspace-text2)' }}><strong>Categories:</strong> {[writingOn ? 'Writing' : null, vocabOn ? 'Vocab' : null].filter(Boolean).join(' + ') || 'None'}</div>
                    </div>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--workspace-text3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Parent notes</span>
                      <textarea value={parentNotes} onChange={(e) => setParentNotes(e.target.value)} rows={3} placeholder="Optional note shown to your child" style={{ borderRadius: 12, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface)', color: 'var(--workspace-text)', padding: '10px 12px', resize: 'vertical' }} />
                    </label>
                  </div>
                ) : null}

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => (assignStep === 1 ? closeAssignModal() : setAssignStep((assignStep - 1) as AssignStep))}
                    style={{ borderRadius: 12, border: '1px solid var(--workspace-border)', padding: '10px 14px', background: 'var(--workspace-surface2)', color: 'var(--workspace-text)', fontWeight: 800, cursor: 'pointer' }}
                  >
                    {assignStep === 1 ? 'Cancel' : 'Back'}
                  </button>

                  {assignStep < 4 ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (assignStep === 3 && !writingOn && !vocabOn) {
                          setError('Turn on Writing, Vocab, or both before continuing.');
                          return;
                        }
                        setError('');
                        setAssignStep((assignStep + 1) as AssignStep);
                      }}
                      style={{ border: 'none', borderRadius: 12, padding: '10px 14px', background: 'linear-gradient(135deg, #4dd4a8 0%, #67e8f9 100%)', color: '#00201a', fontWeight: 900, cursor: 'pointer' }}
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void assignHomework()}
                      disabled={saving}
                      style={{ border: 'none', borderRadius: 12, padding: '10px 14px', background: 'linear-gradient(135deg, #4dd4a8 0%, #67e8f9 100%)', color: '#00201a', fontWeight: 900, cursor: saving ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    >
                      {saving ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Plus style={{ width: 14, height: 14 }} />}
                      {saving ? 'Assigning...' : 'Assign Homework'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {timetableModalOpen ? (
            <div
              role="dialog"
              aria-modal="true"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 80,
                background: 'rgba(2,6,23,0.56)',
                backdropFilter: 'blur(8px)',
                display: 'grid',
                placeItems: 'center',
                padding: 16,
              }}
            >
              <div
                style={{
                  width: 'min(1100px, 100%)',
                  maxHeight: '92vh',
                  overflow: 'auto',
                  borderRadius: 24,
                  border: '1px solid var(--workspace-border)',
                  background: 'var(--workspace-surface)',
                  boxShadow: '0 30px 90px rgba(0,0,0,0.38)',
                  padding: 18,
                  display: 'grid',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4dd4a8' }}>Weekly timetable</span>
                      <span style={{ fontSize: 20, fontWeight: 950, letterSpacing: '-0.03em' }}>
                      {capitalizeFirst(selectedStudent?.profile?.username || 'Student')} · Step {timetableStep} of 8
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--workspace-text2)', marginTop: 4 }}>
                      One step per day. Tuesday onward can repeat the previous day. Step 8 is review.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setTimetableModalOpen(false); setTimetableStep(1); }}
                    style={{ borderRadius: 12, width: 34, height: 34, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface2)', color: 'var(--workspace-text)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                  >
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))', gap: 8 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setTimetableStep(step as TimetableStep)}
                      style={{
                        borderRadius: 999,
                        border: `1px solid ${timetableStep === step ? 'rgba(77,212,168,0.55)' : 'var(--workspace-border)'}`,
                        background: timetableStep === step ? 'linear-gradient(135deg, rgba(77,212,168,0.24), rgba(103,232,249,0.16))' : 'var(--workspace-surface2)',
                        padding: '9px 10px',
                        textAlign: 'center',
                        fontSize: 12,
                        fontWeight: 800,
                        color: timetableStep === step ? 'var(--workspace-text)' : 'var(--workspace-text3)',
                        cursor: 'pointer',
                      }}
                    >
                      {step === 8 ? 'Review' : dayLabelMap[HOMEWORK_DAY_KEYS[step - 1]].slice(0, 3)}
                    </button>
                  ))}
                </div>

                {timetableStep < 8 ? (() => {
                  const day = HOMEWORK_DAY_KEYS[timetableStep - 1];
                  const plan = weeklyPlan[day];
                  const previousDay = timetableStep > 1 ? HOMEWORK_DAY_KEYS[timetableStep - 2] : null;
                  const previousPlan = previousDay ? weeklyPlan[previousDay] : null;
                  const previousHasData = Boolean(
                    previousPlan &&
                    (previousPlan.writing || previousPlan.vocab || previousPlan.notes.trim().length > 0),
                  );
                  const modeKey = plan.writing && plan.vocab
                    ? 'both'
                    : plan.writing
                      ? 'writing'
                      : plan.vocab
                        ? 'vocab'
                        : 'none';
                  const modeOptions: Array<{ key: 'none' | 'writing' | 'vocab' | 'both'; label: string }> = [
                    { key: 'none', label: 'Nothing' },
                    { key: 'writing', label: 'Writing' },
                    { key: 'vocab', label: 'Vocab' },
                    { key: 'both', label: 'Both' },
                  ];
                  const selectedDayWritingTypes = WRITING_TYPE_OPTIONS.filter(
                    (typeLabel) => (plan.writing?.piecesByType?.[typeLabel] ?? 0) > 0,
                  );

                  return (
                    <div style={{ borderRadius: 22, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface2)', padding: 18, display: 'grid', gap: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.1 }}>{dayLabelMap[day]}</div>
                          <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.1, color: modeKey === 'none' ? 'var(--workspace-text3)' : '#4dd4a8' }}>
                            {modeKey === 'none' ? 'Nothing' : modeKey === 'both' ? 'Both' : capitalizeFirst(modeKey)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {previousDay ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (!previousDay || !previousPlan) return;
                                setDayPlan(day, () => cloneDayPlan(previousPlan));
                                setSuccess(`Copied ${dayLabelMap[previousDay]} settings to ${dayLabelMap[day]}.`);
                              }}
                              disabled={!previousHasData}
                              style={{
                                borderRadius: 999,
                                border: previousHasData ? '1px solid rgba(56,189,248,0.45)' : '1px solid var(--workspace-border)',
                                background: previousHasData ? 'linear-gradient(135deg, rgba(56,189,248,0.22), rgba(99,102,241,0.16))' : 'var(--workspace-surface)',
                                color: previousHasData ? 'var(--workspace-text)' : 'var(--workspace-text3)',
                                fontSize: 12,
                                fontWeight: 800,
                                padding: '8px 12px',
                                cursor: previousHasData ? 'pointer' : 'not-allowed',
                              }}
                            >
                              Repeat {dayLabelMap[previousDay]}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setDayPlan(day, () => ({ writing: null, vocab: null, notes: '' }))}
                            style={{
                              borderRadius: 999,
                              border: '1px solid var(--workspace-border)',
                              background: 'var(--workspace-surface)',
                              color: 'var(--workspace-text2)',
                              fontSize: 12,
                              fontWeight: 800,
                              padding: '8px 12px',
                              cursor: 'pointer',
                            }}
                          >
                            Clear day
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--workspace-text2)' }}>
                        Choose what your child does on {dayLabelMap[day]}.
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
                        {modeOptions.map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setDayPlan(day, (current) => {
                              if (option.key === 'none') return { ...current, writing: null, vocab: null };
                              if (option.key === 'writing') return { ...current, writing: current.writing ?? createDefaultWritingConfig(), vocab: null };
                              if (option.key === 'vocab') return { ...current, writing: null, vocab: current.vocab ?? createDefaultVocabConfig() };
                              return { ...current, writing: current.writing ?? createDefaultWritingConfig(), vocab: current.vocab ?? createDefaultVocabConfig() };
                            })}
                            style={{
                              borderRadius: 16,
                              border: modeKey === option.key ? '1px solid rgba(77,212,168,0.55)' : '1px solid var(--workspace-border)',
                              background: modeKey === option.key ? 'linear-gradient(135deg, rgba(77,212,168,0.24), rgba(103,232,249,0.16))' : 'var(--workspace-surface)',
                              color: 'var(--workspace-text)',
                              fontSize: 13,
                              fontWeight: 800,
                              padding: '12px 14px',
                              cursor: 'pointer',
                            }}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>

                      {plan.writing ? (
                        <div style={{ borderRadius: 14, border: '1px solid rgba(77,212,168,0.28)', background: 'rgba(77,212,168,0.08)', padding: 12, display: 'grid', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 850 }}>
                            <FileText style={{ width: 14, height: 14, color: '#4dd4a8' }} />
                            Writing options
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {WRITING_TYPE_OPTIONS.map((typeLabel) => (
                              <ToggleChip
                                key={`${day}-type-${typeLabel}`}
                                active={(plan.writing?.piecesByType?.[typeLabel] ?? 0) > 0}
                                onClick={() => setDayPlan(day, (current) => {
                                  const writing = (current.writing ?? createDefaultWritingConfig()) as WritingHomeworkConfig;
                                  const nextPieces = { ...(writing.piecesByType ?? {}) };
                                  const nextMins = { ...(writing.minWordsByType ?? {}) };
                                  if (nextPieces[typeLabel]) {
                                    delete nextPieces[typeLabel];
                                    delete nextMins[typeLabel];
                                  } else {
                                    nextPieces[typeLabel] = 1;
                                  }
                                  const totalPieces = Object.values(nextPieces).reduce((sum, count) => sum + count, 0);
                                  return {
                                    ...current,
                                    writing: {
                                      ...writing,
                                      piecesByType: nextPieces,
                                      minWordsByType: nextMins,
                                      totalPieces,
                                    },
                                  };
                                })}
                                label={typeLabel}
                              />
                            ))}
                          </div>
                          {selectedDayWritingTypes.length === 0 ? (
                            <div style={{ borderRadius: 10, border: '1px dashed var(--workspace-border)', padding: '8px 10px', fontSize: 12, color: 'var(--workspace-text2)', background: 'var(--workspace-surface)' }}>
                              Choose at least one writing type above.
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                              {selectedDayWritingTypes.map((typeLabel) => (
                                <div key={`${day}-count-${typeLabel}`} style={{ borderRadius: 12, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface)', padding: 10, display: 'grid', gap: 8 }}>
                                  <CounterField
                                    label={typeLabel}
                                    value={plan.writing?.piecesByType?.[typeLabel] ?? 0}
                                    onChange={(n) => setDayPlan(day, (current) => {
                                      const writing = (current.writing ?? createDefaultWritingConfig()) as WritingHomeworkConfig;
                                      const nextPieces = { ...(writing.piecesByType ?? {}) };
                                      if (n <= 0) {
                                        delete nextPieces[typeLabel];
                                      } else {
                                        nextPieces[typeLabel] = n;
                                      }
                                      const totalPieces = Object.values(nextPieces).reduce((sum, count) => sum + count, 0);
                                      return { ...current, writing: { ...writing, piecesByType: nextPieces, totalPieces } };
                                    })}
                                    min={0}
                                  />
                                  <label style={{ display: 'grid', gap: 6 }}>
                                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--workspace-text3)' }}>Amount of words</span>
                                    <input
                                      type="number"
                                      min={0}
                                      value={plan.writing?.minWordsByType?.[typeLabel] ?? ''}
                                      onChange={(e) => setDayPlan(day, (current) => {
                                        const writing = (current.writing ?? createDefaultWritingConfig()) as WritingHomeworkConfig;
                                        const nextMins = { ...(writing.minWordsByType ?? {}) };
                                        const nextValue = e.target.value ? Number(e.target.value) : 0;
                                        if (nextValue <= 0) {
                                          delete nextMins[typeLabel];
                                        } else {
                                          nextMins[typeLabel] = nextValue;
                                        }
                                        return { ...current, writing: { ...writing, minWordsByType: nextMins } };
                                      })}
                                      style={{ borderRadius: 10, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface2)', color: 'var(--workspace-text)', padding: '8px 10px', fontSize: 13 }}
                                    />
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                          <textarea
                            value={plan.writing.notes}
                            onChange={(e) => setDayPlan(day, (current) => ({
                              ...current,
                              writing: { ...((current.writing ?? createDefaultWritingConfig()) as WritingHomeworkConfig), notes: e.target.value },
                            }))}
                            rows={2}
                            placeholder={`Optional writing instructions for ${dayLabelMap[day]}`}
                            style={{ borderRadius: 10, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface)', color: 'var(--workspace-text)', padding: '10px 12px', resize: 'vertical', fontSize: 13 }}
                          />
                        </div>
                      ) : null}

                      {plan.vocab ? (
                        <div style={{ borderRadius: 14, border: '1px solid rgba(125,211,252,0.3)', background: 'rgba(125,211,252,0.08)', padding: 12, display: 'grid', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 850 }}>
                            <BookOpen style={{ width: 14, height: 14, color: '#7dd3fc' }} />
                            Vocab options
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <CounterField
                              label="Words to learn"
                              value={plan.vocab.wordsToLearn}
                              onChange={(n) => setDayPlan(day, (current) => ({
                                ...current,
                                vocab: { ...((current.vocab ?? createDefaultVocabConfig()) as NonNullable<typeof current.vocab>), wordsToLearn: n },
                              }))}
                              max={80}
                            />
                            <div style={{ borderRadius: 12, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface)', padding: 10, display: 'grid', alignContent: 'center', gap: 6 }}>
                              <div style={{ fontSize: 12, color: 'var(--workspace-text2)' }}>A drill is extra practice of vocabulary.</div>
                              <ToggleChip
                                active={plan.vocab.requireDrill}
                                onClick={() => setDayPlan(day, (current) => ({
                                  ...current,
                                  vocab: { ...((current.vocab ?? createDefaultVocabConfig()) as NonNullable<typeof current.vocab>), requireDrill: !(current.vocab ?? createDefaultVocabConfig()).requireDrill },
                                }))}
                                label={plan.vocab.requireDrill ? 'Drill required' : 'Drill optional'}
                              />
                            </div>
                          </div>
                          <textarea
                            value={plan.vocab.notes}
                            onChange={(e) => setDayPlan(day, (current) => ({
                              ...current,
                              vocab: { ...((current.vocab ?? createDefaultVocabConfig()) as NonNullable<typeof current.vocab>), notes: e.target.value },
                            }))}
                            rows={2}
                            placeholder={`Optional vocab instructions for ${dayLabelMap[day]}`}
                            style={{ borderRadius: 10, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface)', color: 'var(--workspace-text)', padding: '10px 12px', resize: 'vertical', fontSize: 13 }}
                          />
                        </div>
                      ) : null}

                      <textarea
                        value={plan.notes}
                        onChange={(e) => setDayPlan(day, (current) => ({ ...current, notes: e.target.value }))}
                        rows={3}
                        placeholder={`Optional note for ${dayLabelMap[day]}`}
                        style={{ borderRadius: 14, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface)', color: 'var(--workspace-text)', padding: '12px 12px', resize: 'vertical', fontSize: 13 }}
                      />
                    </div>
                  );
                })() : (
                  <div style={{ borderRadius: 18, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface2)', padding: 14, display: 'grid', gap: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 900 }}>Step 8: Review weekly plan</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                      {HOMEWORK_DAY_KEYS.map((day) => {
                        const plan = weeklyPlan[day];
                        const label = plan.writing && plan.vocab ? 'Both' : plan.writing ? 'Writing' : plan.vocab ? 'Vocab' : 'Nothing';
                        return (
                          <div key={day} style={{ borderRadius: 12, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface)', padding: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--workspace-text3)', marginBottom: 4 }}>{dayLabelMap[day]}</div>
                            <div style={{ fontSize: 14, fontWeight: 900 }}>{label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (timetableStep === 1) {
                        setTimetableModalOpen(false);
                        setTimetableStep(1);
                        return;
                      }
                      setTimetableStep((timetableStep - 1) as TimetableStep);
                    }}
                    style={{ borderRadius: 12, border: '1px solid var(--workspace-border)', padding: '10px 14px', background: 'var(--workspace-surface2)', color: 'var(--workspace-text)', fontWeight: 800, cursor: 'pointer' }}
                  >
                    {timetableStep === 1 ? 'Close' : 'Back'}
                  </button>
                  {timetableStep < 8 ? (
                    <button
                      type="button"
                      onClick={() => setTimetableStep((timetableStep + 1) as TimetableStep)}
                      style={{ border: 'none', borderRadius: 12, padding: '10px 14px', background: 'linear-gradient(135deg, #4dd4a8 0%, #67e8f9 100%)', color: '#00201a', fontWeight: 900, cursor: 'pointer' }}
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void saveTimetable(true)}
                      disabled={saving}
                      style={{ border: 'none', borderRadius: 12, padding: '10px 14px', background: 'linear-gradient(135deg, #4dd4a8 0%, #67e8f9 100%)', color: '#00201a', fontWeight: 900, cursor: saving ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    >
                      {saving ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Save style={{ width: 14, height: 14 }} />}
                      {saving ? 'Saving...' : 'Save Weekly Timetable'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {activeAction === 'timetable' && !loading ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ borderRadius: 24, border: '1px solid rgba(56,189,248,0.4)', background: 'linear-gradient(135deg, color-mix(in srgb, var(--workspace-surface2) 80%, rgba(56,189,248,0.24)) 0%, color-mix(in srgb, var(--workspace-surface2) 92%, rgba(59,130,246,0.16)) 60%, color-mix(in srgb, var(--workspace-surface2) 96%, rgba(14,116,144,0.16)) 100%)', padding: 20, display: 'grid', gap: 16, boxShadow: '0 20px 38px rgba(56,189,248,0.16)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start' }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 20, fontWeight: 950, letterSpacing: '-0.02em' }}>
                      <CalendarDays style={{ width: 18, height: 18, color: '#38bdf8' }} />
                      Weekly timetable builder
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--workspace-text2)', lineHeight: 1.75, maxWidth: 760 }}>
                      Plan your child’s entire week in one guided flow. Configure Monday to Sunday, then do a final review before saving.
                    </div>
                  </div>
                  <div style={{ borderRadius: 999, border: '1px solid rgba(56,189,248,0.42)', background: 'rgba(56,189,248,0.14)', padding: '7px 12px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 900, color: 'var(--workspace-text)', whiteSpace: 'nowrap' }}>
                    8-step planner
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ borderRadius: 999, border: '1px solid rgba(56,189,248,0.35)', background: 'rgba(56,189,248,0.1)', padding: '5px 10px', fontSize: 12, fontWeight: 800 }}>Mon-Sun coverage</div>
                  <div style={{ borderRadius: 999, border: '1px solid rgba(99,102,241,0.35)', background: 'rgba(99,102,241,0.1)', padding: '5px 10px', fontSize: 12, fontWeight: 800 }}>Recurring homework</div>
                  <div style={{ borderRadius: 999, border: '1px solid rgba(14,165,233,0.35)', background: 'rgba(14,165,233,0.1)', padding: '5px 10px', fontSize: 12, fontWeight: 800 }}>Final review</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={openTimetableModal}
                    style={{
                      border: 'none',
                      borderRadius: 16,
                      padding: '14px 20px',
                      background: 'linear-gradient(135deg, #22d3ee 0%, #60a5fa 55%, #38bdf8 100%)',
                      color: '#041826',
                      fontSize: 15,
                      fontWeight: 950,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      boxShadow: '0 18px 30px rgba(56,189,248,0.28)',
                      width: 'fit-content',
                    }}
                  >
                    <CalendarDays style={{ width: 15, height: 15 }} />
                    Open Weekly Timetable
                  </button>
                  <div style={{ fontSize: 12, color: 'var(--workspace-text3)', fontWeight: 700 }}>
                    Best for building a repeatable weekly rhythm
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeAction === 'performance' && !loading ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ borderRadius: 22, border: '1px solid rgba(56,189,248,0.36)', background: 'linear-gradient(135deg, color-mix(in srgb, var(--workspace-surface2) 80%, rgba(56,189,248,0.2)) 0%, color-mix(in srgb, var(--workspace-surface2) 90%, rgba(14,165,233,0.16)) 58%, var(--workspace-surface2) 100%)', padding: 16, display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7dd3fc' }}>Performance Intelligence</div>
                <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: '-0.03em' }}>Progress dashboard for the last 14 days</div>
                <div style={{ fontSize: 13, color: 'var(--workspace-text2)', lineHeight: 1.65 }}>
                  See completion trends, identify bottlenecks quickly, and turn insights into next-step actions.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                <div style={{ borderRadius: 18, border: '1px solid rgba(16,185,129,0.32)', padding: 14, background: 'linear-gradient(145deg, color-mix(in srgb, var(--workspace-surface2) 84%, rgba(16,185,129,0.16)) 0%, var(--workspace-surface2) 100%)', boxShadow: '0 14px 24px rgba(16,185,129,0.11)' }}>
                  <div style={{ fontSize: 12, color: 'var(--workspace-text3)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>2-week completion</div>
                  <div style={{ fontSize: 30, fontWeight: 950, color: '#34d399', marginTop: 4 }}>{data?.performance.summary.twoWeekCompletionRate ?? 0}%</div>
                </div>
                <div style={{ borderRadius: 18, border: '1px solid rgba(59,130,246,0.3)', padding: 14, background: 'linear-gradient(145deg, color-mix(in srgb, var(--workspace-surface2) 84%, rgba(59,130,246,0.16)) 0%, var(--workspace-surface2) 100%)', boxShadow: '0 14px 24px rgba(59,130,246,0.11)' }}>
                  <div style={{ fontSize: 12, color: 'var(--workspace-text3)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Writing completion</div>
                  <div style={{ fontSize: 30, fontWeight: 950, marginTop: 4 }}>{data?.performance.summary.writingCompletionRate ?? 0}%</div>
                </div>
                <div style={{ borderRadius: 18, border: '1px solid rgba(239,68,68,0.3)', padding: 14, background: 'linear-gradient(145deg, color-mix(in srgb, var(--workspace-surface2) 84%, rgba(239,68,68,0.14)) 0%, var(--workspace-surface2) 100%)', boxShadow: '0 14px 24px rgba(239,68,68,0.1)' }}>
                  <div style={{ fontSize: 12, color: 'var(--workspace-text3)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Vocab completion</div>
                  <div style={{ fontSize: 30, fontWeight: 950, marginTop: 4 }}>{data?.performance.summary.vocabCompletionRate ?? 0}%</div>
                </div>
                <div style={{ borderRadius: 18, border: '1px solid rgba(249,115,22,0.32)', padding: 14, background: 'linear-gradient(145deg, color-mix(in srgb, var(--workspace-surface2) 84%, rgba(249,115,22,0.14)) 0%, var(--workspace-surface2) 100%)', boxShadow: '0 14px 24px rgba(249,115,22,0.1)' }}>
                  <div style={{ fontSize: 12, color: 'var(--workspace-text3)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Consistency streak</div>
                  <div style={{ fontSize: 30, fontWeight: 950, display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Flame style={{ width: 20, height: 20, color: '#fb923c' }} />
                    {data?.performance.summary.consistencyStreak ?? 0}
                  </div>
                </div>
              </div>

              <div style={{ borderRadius: 18, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface2)', padding: 14, display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 16, fontWeight: 900 }}>Past {visiblePerformanceDays.length || Math.min(timelineWindowDays, 14)} days</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {timelineOptions.map((option) => {
                      const active = timelineWindowDays === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setTimelineWindowDays(option)}
                          style={{
                            borderRadius: 999,
                            border: active ? '1px solid rgba(56,189,248,0.5)' : '1px solid var(--workspace-border)',
                            background: active ? 'linear-gradient(135deg, rgba(56,189,248,0.24), rgba(99,102,241,0.16))' : 'var(--workspace-surface)',
                            padding: '5px 10px',
                            fontSize: 11,
                            fontWeight: 900,
                            color: active ? 'var(--workspace-text)' : 'var(--workspace-text2)',
                            letterSpacing: '0.06em',
                            cursor: 'pointer',
                          }}
                        >
                          {option}D
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 10, maxHeight: 360, overflow: 'auto', paddingRight: 3 }}>
                  {visiblePerformanceDays.map((day) => {
                    const writingRatio = day.writingRequired > 0 ? Math.round((day.writingCompleted / day.writingRequired) * 100) : 0;
                    const vocabRatio = day.vocabRequired > 0 ? Math.round((day.vocabCompleted / day.vocabRequired) * 100) : 0;
                    return (
                      <div key={day.date} style={{ borderRadius: 14, border: '1px solid var(--workspace-border)', padding: 12, background: 'var(--workspace-surface)', display: 'grid', gap: 9 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: 13, fontWeight: 900 }}>{formatPerformanceDay(day.date)}</div>
                          <div style={{ fontSize: 12, fontWeight: 900, color: day.completionRate >= 80 ? '#34d399' : day.completionRate > 0 ? '#fbbf24' : 'var(--workspace-text3)', borderRadius: 999, border: '1px solid var(--workspace-border)', padding: '4px 8px', background: 'var(--workspace-surface2)' }}>
                            {day.completionRate}% complete
                          </div>
                        </div>

                        <div style={{ display: 'grid', gap: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                            <span style={{ color: '#60a5fa', fontWeight: 800 }}>Writing {day.writingCompleted}/{day.writingRequired}</span>
                            <span style={{ color: 'var(--workspace-text3)', fontWeight: 700 }}>{writingRatio}%</span>
                          </div>
                          <div style={{ height: 8, borderRadius: 999, background: 'var(--workspace-border)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${writingRatio}%`, background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)' }} />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gap: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                            <span style={{ color: '#f87171', fontWeight: 800 }}>Vocab {day.vocabCompleted}/{day.vocabRequired}</span>
                            <span style={{ color: 'var(--workspace-text3)', fontWeight: 700 }}>{vocabRatio}%</span>
                          </div>
                          <div style={{ height: 8, borderRadius: 999, background: 'var(--workspace-border)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${vocabRatio}%`, background: 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)' }} />
                          </div>
                        </div>

                        <div style={{ fontSize: 12, color: 'var(--workspace-text2)', fontWeight: 700 }}>
                          {day.assigned.length} task{day.assigned.length === 1 ? '' : 's'} scheduled
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                <div style={{ borderRadius: 18, border: '1px solid rgba(16,185,129,0.3)', background: 'linear-gradient(145deg, color-mix(in srgb, var(--workspace-surface2) 88%, rgba(16,185,129,0.12)) 0%, var(--workspace-surface2) 100%)', padding: 14, display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 900 }}><Sparkles style={{ width: 16, height: 16, color: '#34d399' }} /> What is going well</div>
                  {(data?.performance.summary.insights ?? []).map((item, idx) => (
                    <div key={idx} style={{ fontSize: 13, color: 'var(--workspace-text2)', lineHeight: 1.65, borderRadius: 10, border: '1px solid color-mix(in srgb, var(--workspace-border) 90%, transparent)', background: 'var(--workspace-surface)', padding: '10px 11px' }}>
                      {item}
                    </div>
                  ))}
                </div>

                <div style={{ borderRadius: 18, border: '1px solid rgba(56,189,248,0.3)', background: 'linear-gradient(145deg, color-mix(in srgb, var(--workspace-surface2) 88%, rgba(56,189,248,0.12)) 0%, var(--workspace-surface2) 100%)', padding: 14, display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 900 }}><CheckCircle2 style={{ width: 16, height: 16, color: '#7dd3fc' }} /> Suggested next steps</div>
                  {(data?.performance.summary.nextSteps ?? []).map((item, idx) => (
                    <div key={idx} style={{ fontSize: 13, color: 'var(--workspace-text2)', lineHeight: 1.65, borderRadius: 10, border: '1px solid color-mix(in srgb, var(--workspace-border) 90%, transparent)', background: 'var(--workspace-surface)', padding: '10px 11px' }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {activeAction === 'currentFuture' && !loading ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ borderRadius: 16, border: '1px solid rgba(99,102,241,0.28)', background: 'linear-gradient(145deg, color-mix(in srgb, var(--workspace-surface2) 88%, rgba(99,102,241,0.14)) 0%, color-mix(in srgb, var(--workspace-surface2) 94%, rgba(56,189,248,0.08)) 100%)', padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 900 }}>
                  <Clock3 style={{ width: 15, height: 15, color: '#a5b4fc' }} />
                  Current & Future Homework (7-day view)
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <div style={{ borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 800, border: '1px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.1)' }}>
                    Current {currentTasks.length}
                  </div>
                  <div style={{ borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 800, border: '1px solid rgba(59,130,246,0.35)', background: 'rgba(59,130,246,0.1)' }}>
                    Future {futureTasks.length}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
                <div style={{ borderRadius: 16, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface2)', padding: 12, display: 'grid', gap: 8, maxHeight: 520, overflow: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 900 }}>Current homework</div>
                    <div style={{ borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 800, border: '1px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.12)' }}>
                      {currentTasks.length}
                    </div>
                  </div>
                  {currentTaskGroups.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--workspace-text2)' }}>No current homework due today.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {currentTaskGroups.map((group) => (
                        <div key={`current-${group.dueDate || 'none'}`} style={{ borderRadius: 12, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface)', padding: 9, display: 'grid', gap: 7 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--workspace-text2)' }}>
                              {group.dueDate ? formatHomeworkDate(group.dueDate) : 'No due date'}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--workspace-text3)' }}>{group.items.length} task{group.items.length === 1 ? '' : 's'}</div>
                          </div>
                          {group.items.map((task) => (
                            <div key={task.id} style={{ borderRadius: 10, border: '1px solid color-mix(in srgb, var(--workspace-border) 90%, transparent)', background: 'var(--workspace-surface2)', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>{task.title}</div>
                              <button
                                type="button"
                                onClick={() => void deleteHomeworkTask(task)}
                                title={task.source === 'one_time' ? 'Delete homework' : 'Remove recurring homework for this weekday'}
                                style={{ width: 24, height: 24, borderRadius: 8, border: '1px solid rgba(239,68,68,0.32)', background: 'rgba(239,68,68,0.08)', color: '#fca5a5', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}
                              >
                                <X style={{ width: 12, height: 12 }} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ borderRadius: 16, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface2)', padding: 12, display: 'grid', gap: 8, maxHeight: 520, overflow: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 900 }}>Future homework</div>
                    <div style={{ borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 800, border: '1px solid rgba(59,130,246,0.35)', background: 'rgba(59,130,246,0.1)' }}>
                      {futureTasks.length}
                    </div>
                  </div>
                  {futureTaskGroups.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--workspace-text2)' }}>No upcoming homework yet.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {futureTaskGroups.map((group) => (
                        <div key={`future-${group.dueDate || 'none'}`} style={{ borderRadius: 12, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface)', padding: 9, display: 'grid', gap: 7 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--workspace-text2)' }}>
                              {group.dueDate ? formatHomeworkDate(group.dueDate) : 'No due date'}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--workspace-text3)' }}>{group.items.length} task{group.items.length === 1 ? '' : 's'}</div>
                          </div>
                          {group.items.map((task) => (
                            <div key={task.id} style={{ borderRadius: 10, border: '1px solid color-mix(in srgb, var(--workspace-border) 90%, transparent)', background: 'var(--workspace-surface2)', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>{task.title}</div>
                              <button
                                type="button"
                                onClick={() => void deleteHomeworkTask(task)}
                                title={task.source === 'one_time' ? 'Delete homework' : 'Remove recurring homework for this weekday'}
                                style={{ width: 24, height: 24, borderRadius: 8, border: '1px solid rgba(239,68,68,0.32)', background: 'rgba(239,68,68,0.08)', color: '#fca5a5', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}
                              >
                                <X style={{ width: 12, height: 12 }} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ borderRadius: 16, border: '1px solid var(--workspace-border)', padding: 12, background: 'var(--workspace-surface2)', display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 14, fontWeight: 900 }}>Recently assigned</div>
                  <div style={{ borderRadius: 999, border: '1px solid var(--workspace-border)', background: 'var(--workspace-surface)', padding: '3px 8px', fontSize: 11, fontWeight: 800, color: 'var(--workspace-text2)' }}>
                    {recentAssignmentsPreview.length} assignments
                  </div>
                </div>
                {recentAssignmentsPreview.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--workspace-text2)' }}>No homework has been assigned yet.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 7 }}>
                    {recentAssignmentsPreview.map((item, idx) => (
                      <div key={item.id} style={{ borderRadius: 10, border: '1px solid var(--workspace-border)', padding: '8px 10px', background: 'var(--workspace-surface)', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.35 }}>{item.title}</div>
                          <div style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', borderRadius: 999, border: '1px solid rgba(59,130,246,0.35)', padding: '2px 7px', fontSize: 10.5, fontWeight: 800, color: '#60a5fa', background: 'rgba(59,130,246,0.08)' }}>
                            Assignment {idx + 1}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <div style={{ fontSize: 11.5, color: 'var(--workspace-text3)', borderRadius: 999, border: '1px solid var(--workspace-border)', padding: '4px 7px', background: 'var(--workspace-surface2)' }}>{item.dueLabel}</div>
                          <button
                            type="button"
                            onClick={() => void deleteHomeworkAssignment(item.id)}
                            title="Delete homework"
                            style={{ width: 24, height: 24, borderRadius: 8, border: '1px solid rgba(239,68,68,0.32)', background: 'rgba(239,68,68,0.08)', color: '#fca5a5', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                          >
                            <X style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </>
      )}

      {error ? <div style={{ color: '#f87171', fontSize: 13, fontWeight: 800 }}>{error}</div> : null}
      {success ? <div style={{ color: '#4dd4a8', fontSize: 13, fontWeight: 800 }}>{success}</div> : null}
    </section>
  );
}
