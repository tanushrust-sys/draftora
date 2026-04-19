'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarClock, CheckCircle2, FileText, Loader2, Sparkles } from 'lucide-react';
import { authFetchJson } from '@/app/lib/auth-fetch';
import { formatHomeworkDate, type HomeworkTaskItem } from '@/app/lib/homework';

type StudentHomeworkResponse = {
  today: string;
  overallPct: number;
  todayTasks: HomeworkTaskItem[];
  upcoming: HomeworkTaskItem[];
};

export function StudentHomeworkWidget({ authToken }: { authToken: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<StudentHomeworkResponse | null>(null);

  useEffect(() => {
    if (!authToken) {
      setLoading(false);
      return;
    }
    let active = true;

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await authFetchJson<StudentHomeworkResponse>('/api/homework', { token: authToken });
        if (!active) return;
        setData(res);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Could not load homework.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [authToken]);

  const totalToday = data?.todayTasks.length ?? 0;
  const progressColor = useMemo(() => {
    const pct = data?.overallPct ?? 0;
    if (pct >= 80) return '#22c55e';
    if (pct >= 40) return '#f59e0b';
    return '#7dd3fc';
  }, [data?.overallPct]);

  if (loading) {
    return (
      <div style={{ borderRadius: 26, padding: '1.8rem 1.85rem', border: '1px solid var(--t-brd)', background: 'var(--t-card)', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--t-tx2)' }}>
        <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />
        Loading daily homework...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ borderRadius: 26, padding: '1.8rem 1.85rem', border: '1px solid color-mix(in srgb, var(--t-danger) 50%, var(--t-brd))', background: 'var(--t-card)', color: '#f87171', fontSize: 13, fontWeight: 700 }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ borderRadius: 22, padding: '1.25rem', border: '1px solid color-mix(in srgb, var(--t-acc) 22%, var(--t-brd))', background: 'linear-gradient(180deg, color-mix(in srgb, var(--t-card) 92%, var(--t-acc) 8%) 0%, color-mix(in srgb, var(--t-card) 86%, var(--t-acc) 14%) 100%)', boxShadow: '0 10px 24px color-mix(in srgb, var(--t-shadow) 16%, transparent)', display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: 'var(--t-acc)', fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 3 }}>Current homework</p>
          <h3 style={{ color: 'var(--t-tx)', fontSize: 34, fontWeight: 850, lineHeight: 1 }}>
            {totalToday > 0 ? `${totalToday} task${totalToday === 1 ? '' : 's'} today` : 'No required task today'}
          </h3>
        </div>
        <div style={{ borderRadius: 12, padding: '9px 12px', background: 'color-mix(in srgb, var(--t-card2) 88%, transparent)', border: '1px solid color-mix(in srgb, var(--t-brd) 72%, transparent)', fontSize: 26, fontWeight: 800, color: 'var(--t-tx2)', lineHeight: 1 }}>
          {data?.overallPct ?? 0}% done
        </div>
      </div>

      <div style={{ borderRadius: 14, border: '1px solid color-mix(in srgb, var(--t-brd) 70%, transparent)', background: 'color-mix(in srgb, var(--t-card2) 84%, transparent)', padding: '10px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-tx2)' }}>Daily progress</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: progressColor }}>{data?.overallPct ?? 0}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 99, background: 'var(--t-xp-track)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${data?.overallPct ?? 0}%`, background: progressColor, borderRadius: 99, transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {(data?.todayTasks ?? []).length > 0 ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {(data?.todayTasks ?? []).slice(0, 3).map((task) => (
            <div key={task.id} style={{ borderRadius: 14, border: '1px solid color-mix(in srgb, var(--t-brd) 76%, transparent)', background: 'color-mix(in srgb, var(--t-card2) 92%, white 8%)', padding: '10px 12px', display: 'grid', gap: 7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--t-tx)' }}>{task.title}</div>
                <div style={{ fontSize: 12, color: 'var(--t-tx3)', whiteSpace: 'nowrap' }}>{formatHomeworkDate(task.dueDate)}</div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--t-tx2)' }}>
                {task.writing ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><FileText style={{ width: 12, height: 12 }} /> Writing {task.breakdown.writingCompleted}/{task.breakdown.writingRequired}</span> : null}
                {task.vocab ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><BookOpen style={{ width: 12, height: 12 }} /> Vocab {task.breakdown.vocabCompleted}/{task.breakdown.vocabRequired}</span> : null}
                {task.breakdown.drillRequired ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{task.breakdown.drillCompleted ? <CheckCircle2 style={{ width: 12, height: 12, color: '#22c55e' }} /> : <Sparkles style={{ width: 12, height: 12, color: '#f59e0b' }} />} Drill</span> : null}
              </div>
              <div style={{ height: 6, borderRadius: 99, background: 'var(--t-xp-track)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${task.completionPct}%`, background: task.completionPct >= 80 ? '#22c55e' : task.completionPct >= 40 ? '#f59e0b' : '#7dd3fc', borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ borderRadius: 14, border: '1px solid color-mix(in srgb, var(--t-brd) 76%, transparent)', background: 'color-mix(in srgb, var(--t-card2) 88%, transparent)', padding: '11px 12px', fontSize: 13, color: 'var(--t-tx2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 style={{ width: 14, height: 14, color: '#22c55e' }} />
          No assigned homework for today. Keep your writing streak alive.
        </div>
      )}

      {(data?.upcoming ?? []).length > 0 ? (
        <div style={{ borderRadius: 14, border: '1px solid color-mix(in srgb, var(--t-brd) 76%, transparent)', background: 'color-mix(in srgb, var(--t-card2) 88%, transparent)', padding: '10px 12px', display: 'grid', gap: 6 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: 'var(--t-tx2)' }}><CalendarClock style={{ width: 12, height: 12 }} /> Coming up</div>
          {(data?.upcoming ?? []).slice(0, 2).map((item) => (
            <div key={item.id} style={{ fontSize: 12.5, color: 'var(--t-tx3)' }}>{item.title} · due {formatHomeworkDate(item.dueDate)}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
