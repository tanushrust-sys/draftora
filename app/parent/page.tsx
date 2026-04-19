'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BadgePlus,
  ClipboardCheck,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Link2,
  MoonStar,
  Plus,
  Settings,
  Sparkles,
  SunMedium,
  Trash2,
  Users,
  BarChart3,
  UserCircle2,
  PencilLine,
} from 'lucide-react';
import { RoleAppShell } from '@/app/components/role-app-shell';
import { StudentReportPanel, type StudentReportData } from '@/app/components/student-report-panel';
import { ParentHomeworkPanel } from '@/app/components/parent-homework-panel';
import { useAuth } from '@/app/context/AuthContext';
import { hardSignOut, supabase } from '@/app/lib/supabase';
import { authFetchJson } from '@/app/lib/auth-fetch';
import { normalizeStudentCode } from '@/app/lib/student-code';
import { getWorkspacePalette } from '@/app/lib/workspace-palette';
import { readWorkspaceMode, writeWorkspaceMode, type WorkspaceMode } from '@/app/lib/workspace-mode';

type ParentTab = 'report' | 'students' | 'homework' | 'settings';

type ParentLink = {
  studentId: string;
  studentCode: string;
  linkedAt: string;
  profile: {
    id: string;
    username: string;
    title: string;
    level: number;
    xp: number;
    streak: number;
    age_group: string;
    student_id: string | null;
    account_type: string;
  } | null;
};

type ParentLinksResponse = {
  links: ParentLink[];
};

type DeleteState = {
  confirmText: string;
  busy: boolean;
  error: string;
};

const TAB_STORAGE_KEY = 'draftora-parent-tab-v1';
const SELECTED_STORAGE_KEY = 'draftora-parent-selected-student-v1';

function readStoredTab(): ParentTab {
  if (typeof window === 'undefined') return 'report';
  try {
    const stored = localStorage.getItem(TAB_STORAGE_KEY);
    return stored === 'students' || stored === 'settings' || stored === 'homework' ? stored : 'report';
  } catch {
    return 'report';
  }
}

function writeStoredTab(tab: ParentTab) {
  try {
    localStorage.setItem(TAB_STORAGE_KEY, tab);
  } catch {
    // ignore storage failures
  }
}

function readStoredSelectedStudent() {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(SELECTED_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function writeStoredSelectedStudent(studentId: string) {
  try {
    if (studentId) {
      localStorage.setItem(SELECTED_STORAGE_KEY, studentId);
    } else {
      localStorage.removeItem(SELECTED_STORAGE_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

function SectionTitle({
  eyebrow,
  title,
  copy,
  accent,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  accent: string;
}) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: accent }}>
        {eyebrow}
      </div>
      <div style={{ fontSize: 20, fontWeight: 950, letterSpacing: '-0.04em' }}>{title}</div>
      {copy ? <div style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--workspace-text2)' }}>{copy}</div> : null}
    </div>
  );
}

function PillButton({
  active,
  children,
  onClick,
  accent,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        borderRadius: 999,
        padding: '10px 14px',
        background: active
          ? `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 70%, white))`
          : 'rgba(255,255,255,0.04)',
        color: active ? '#fff' : 'var(--workspace-text)',
        fontSize: 13,
        fontWeight: 800,
        boxShadow: active ? `0 12px 26px color-mix(in srgb, ${accent} 18%, transparent)` : 'none',
        border: active ? `1px solid color-mix(in srgb, ${accent} 22%, transparent)` : '1px solid var(--workspace-border)',
      }}
    >
      {children}
    </button>
  );
}

function SurfaceCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section
      style={{
        borderRadius: 28,
        background: 'var(--workspace-surface)',
        border: '1px solid var(--workspace-border)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.16)',
        backdropFilter: 'blur(14px)',
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function TinyStat({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        borderRadius: 20,
        padding: '16px 18px',
        background: 'color-mix(in srgb, var(--workspace-surface) 82%, transparent)',
        border: '1px solid color-mix(in srgb, var(--workspace-border) 88%, transparent)',
        display: 'grid',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 14,
          background: `color-mix(in srgb, ${accent} 16%, transparent)`,
          color: accent,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--workspace-text3)' }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: '-0.05em', color: 'var(--workspace-text)' }}>{value}</div>
    </div>
  );
}

export default function ParentPage() {
  const { profile, session } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<WorkspaceMode>('dark');
  const [activeTab, setActiveTab] = useState<ParentTab>(() => readStoredTab());
  const [links, setLinks] = useState<ParentLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(() => readStoredSelectedStudent());
  const [reports, setReports] = useState<Record<string, StudentReportData>>({});
  const [reportLoadingId, setReportLoadingId] = useState('');
  const [reportError, setReportError] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [displayNameSaving, setDisplayNameSaving] = useState(false);
  const [displayNameError, setDisplayNameError] = useState('');
  const [deleteState, setDeleteState] = useState<DeleteState>({ confirmText: '', busy: false, error: '' });
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const palette = useMemo(() => getWorkspacePalette(mode), [mode]);
  const savedDisplayName = useMemo(() => {
    const raw = session?.user?.user_metadata?.display_name;
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    return profile?.username || '';
  }, [profile?.username, session?.user?.user_metadata?.display_name]);

  useEffect(() => {
    const stored = readWorkspaceMode('parent');
    if (stored) setMode(stored);
  }, []);

  useEffect(() => {
    writeWorkspaceMode('parent', mode);
  }, [mode]);

  useEffect(() => {
    writeStoredTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(savedDisplayName);
  }, [profile, savedDisplayName]);

  useEffect(() => {
    writeStoredSelectedStudent(selectedStudentId);
  }, [selectedStudentId]);

  const authToken = session?.access_token ?? '';

  const loadLinks = useCallback(async () => {
    if (!authToken) return;
    setLinksLoading(true);
    setLinksError('');
    try {
      const data = await authFetchJson<ParentLinksResponse>('/api/parent/links', { token: authToken });
      if (!mountedRef.current) return;
      setLinks(data.links);
      setSelectedStudentId((current) => {
        const currentValid = current && data.links.some((link) => link.studentId === current);
        if (currentValid) return current;
        return data.links[0]?.studentId ?? '';
      });
    } catch (error) {
      if (mountedRef.current) {
        setLinksError(error instanceof Error ? error.message : 'Could not load linked students.');
      }
    } finally {
      if (mountedRef.current) {
        setLinksLoading(false);
      }
    }
  }, [authToken]);

  const loadReport = useCallback(async (studentId: string) => {
    if (!authToken || !studentId) return;
    if (reports[studentId]) return;

    setReportLoadingId(studentId);
    setReportError('');
    try {
      const data = await authFetchJson<StudentReportData>(`/api/student-report?studentId=${encodeURIComponent(studentId)}`, {
        token: authToken,
      });
      if (!mountedRef.current) return;
      setReports((current) => ({ ...current, [studentId]: data }));
    } catch (error) {
      if (mountedRef.current) {
        setReportError(error instanceof Error ? error.message : 'Could not load the report.');
      }
    } finally {
      if (mountedRef.current) {
        setReportLoadingId((current) => (current === studentId ? '' : current));
      }
    }
  }, [authToken, reports]);

  useEffect(() => {
    if (!authToken) return;
    void loadLinks();
  }, [authToken, loadLinks]);

  useEffect(() => {
    if (!authToken || !selectedStudentId) return;
    void loadReport(selectedStudentId);
  }, [authToken, loadReport, selectedStudentId]);

  const selectedLink = links.find((link) => link.studentId === selectedStudentId) ?? null;
  const currentReport = selectedStudentId ? reports[selectedStudentId] ?? null : null;
  const reportBusy = Boolean(selectedStudentId && reportLoadingId === selectedStudentId && !currentReport);
  const linkedCount = links.length;
  const selectedName = selectedLink?.profile?.username || currentReport?.profile.username || 'No child selected';
  const weeklyWords = currentReport?.summary.weekWords ?? 0;
  const masteredWords = currentReport?.summary.masteredCount ?? 0;
  const parentLabel = savedDisplayName || 'Parent';

  const tabs = [
    { key: 'report', label: 'Report', description: '', icon: BarChart3 },
    { key: 'students', label: 'Students', description: '', icon: Users },
    { key: 'homework', label: 'Homework', description: '', icon: ClipboardCheck },
    { key: 'settings', label: 'Settings', description: '', icon: Settings },
  ] as const;

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setActiveTab('report');
  };

  const handleLinkStudent = async () => {
    const code = normalizeStudentCode(studentCode);
    if (!code) {
      setLinkError('Enter a valid student code.');
      return;
    }

    if (!authToken) return;

    setLinking(true);
    setLinkError('');
    setLinkSuccess('');

    try {
      const result = await authFetchJson<{ link: { studentId: string; studentCode: string } }>('/api/parent/links', {
        token: authToken,
        method: 'POST',
        body: { studentCode: code },
      });
      setStudentCode('');
      setLinkSuccess('Student linked successfully.');
      await loadLinks();
      handleSelectStudent(result.link.studentId);
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : 'Could not link that student.');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkStudent = async (studentId: string) => {
    if (!authToken) return;

    try {
      await authFetchJson('/api/parent/links', {
        token: authToken,
        method: 'DELETE',
        body: { studentId },
      });
      const nextLinks = links.filter((link) => link.studentId !== studentId);
      setLinks(nextLinks);
      setReports((current) => {
        const next = { ...current };
        delete next[studentId];
        return next;
      });
      const nextSelected = nextLinks[0]?.studentId ?? '';
      setSelectedStudentId(nextSelected);
      if (nextSelected) {
        void loadReport(nextSelected);
      }
    } catch (error) {
      setLinksError(error instanceof Error ? error.message : 'Could not unlink that student.');
    }
  };

  const saveDisplayName = async () => {
    const nextName = displayName.trim();
    if (!nextName) {
      setDisplayNameError('Display name cannot be empty.');
      return;
    }

    setDisplayNameSaving(true);
    setDisplayNameError('');

    try {
      const { error } = await supabase.auth.updateUser({ data: { display_name: nextName } });
      if (error) throw error;
    } catch (error) {
      setDisplayNameError(error instanceof Error ? error.message : 'Could not save the display name.');
    } finally {
      setDisplayNameSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!session?.access_token) return;
    if (deleteStep < 1) {
      setDeleteStep(1);
      return;
    }
    if (deleteState.confirmText.trim().toLowerCase() !== 'delete') {
      setDeleteState((current) => ({ ...current, error: 'Type DELETE to confirm.' }));
      return;
    }

    setDeleteState({ confirmText: 'delete', busy: true, error: '' });
    try {
      await authFetchJson('/api/delete-account', {
        token: session.access_token,
        method: 'POST',
      });
    } catch (error) {
      setDeleteState({
        confirmText: 'delete',
        busy: false,
        error: error instanceof Error ? error.message : 'Could not delete the account.',
      });
      return;
    }

    router.replace('/login');
    window.location.replace('/login');
    void hardSignOut();
  };

  const resetDeleteFlow = () => {
    setDeleteStep(0);
    setDeleteState({ confirmText: '', busy: false, error: '' });
  };

  const modeToggle = (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <PillButton active={mode === 'dark'} accent={palette.mode === 'dark' ? '#67e8f9' : '#0f172a'} onClick={() => setMode('dark')}>
        <MoonStar style={{ width: 14, height: 14, marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }} />
        Dark
      </PillButton>
      <PillButton active={mode === 'light'} accent="#67e8f9" onClick={() => setMode('light')}>
        <SunMedium style={{ width: 14, height: 14, marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }} />
        Light
      </PillButton>
    </div>
  );

  const renderWorkspaceTop = () => (
    <SurfaceCard
      style={{
        padding: '30px 34px',
        background:
          palette.mode === 'light'
            ? 'linear-gradient(130deg, #f0fdf9 0%, #d1fae5 35%, #a7f3d0 70%, #6ee7b7 100%)'
            : 'linear-gradient(130deg, rgba(6, 10, 22, 0.98) 0%, rgba(9, 18, 34, 0.96) 44%, rgba(7, 31, 42, 0.98) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 132,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: palette.mode === 'dark' ? '0 30px 96px rgba(0,0,0,0.38)' : '0 24px 80px rgba(15,23,42,0.12)',
        border: `1px solid ${palette.border}`,
        backdropFilter: 'blur(18px)',
      }}
    >
      {/* Decorative glow orbs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 260, height: 260, borderRadius: '50%', background: palette.mode === 'dark' ? 'radial-gradient(circle, rgba(77,212,168,0.24) 0%, transparent 68%)' : 'radial-gradient(circle, rgba(16,185,129,0.22) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: '30%', width: 180, height: 180, borderRadius: '50%', background: palette.mode === 'dark' ? 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(52,211,153,0.14) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: palette.mode === 'dark' ? 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 28%)' : 'none' }} />
      </div>

      <div style={{ position: 'relative', width: '100%' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: palette.mode === 'dark' ? 'rgba(110,231,183,0.84)' : 'rgba(5,150,105,0.75)', marginBottom: 8 }}>
          Parent dashboard
        </div>
        <div
          style={{
            fontSize: 'clamp(2.8rem, 6vw, 5rem)',
            lineHeight: 0.95,
            fontWeight: 950,
            letterSpacing: '-0.06em',
            color: palette.mode === 'light' ? '#065f46' : '#f0fff8',
            textShadow: palette.mode === 'light' ? '0 1px 0 rgba(255,255,255,0.22)' : '0 12px 30px rgba(77,212,168,0.10)',
          }}
        >
          Welcome back, {parentLabel}
        </div>
      </div>
    </SurfaceCard>
  );

  const renderReportTab = () => (
    <div style={{ display: 'grid', gap: 16 }}>
      {renderWorkspaceTop()}
      {reportBusy ? (
        <div
          style={{
            borderRadius: 26,
            padding: 24,
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            color: palette.text2,
            boxShadow: palette.softShadow,
          }}
        >
          Loading report...
        </div>
      ) : (
        <StudentReportPanel
          report={currentReport}
          accent="#4dd4a8"
          mode={mode}
          emptyTitle={links.length === 0 ? 'Link a child' : 'Choose a child'}
          emptyCopy={links.length === 0 ? 'Add a student code to view their report.' : 'Select a child to load the report.'}
          authToken={authToken}
          studentId={selectedStudentId ?? undefined}
        />
      )}

      {reportError ? (
        <div style={{ color: '#f87171', fontSize: 13, fontWeight: 700 }}>{reportError}</div>
      ) : null}
    </div>
  );

  const renderStudentsTab = () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 16 }}>
        <section
          style={{
            borderRadius: 26,
            padding: 20,
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            boxShadow: palette.softShadow,
          }}
        >
          <SectionTitle
            eyebrow="Link student"
            title="Add child"
            accent="#4dd4a8"
          />

          <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: palette.text3 }}>
                Student code
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  value={studentCode}
                  onChange={(event) => setStudentCode(event.target.value.toUpperCase())}
                  placeholder="DRAA1B2C3"
                  style={{
                    flex: 1,
                    borderRadius: 18,
                    padding: '14px 16px',
                    border: `1px solid ${palette.inputBorder}`,
                    background: palette.inputBg,
                    color: palette.text,
                    fontSize: 15,
                    outline: 'none',
                    boxShadow: `inset 0 1px 0 ${palette.mode === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.03)'}`,
                  }}
                />
                <button
                  type="button"
                  onClick={handleLinkStudent}
                  disabled={linking}
                  style={{
                    border: 'none',
                    borderRadius: 18,
                    padding: '0 18px',
                    minWidth: 130,
                    cursor: linking ? 'default' : 'pointer',
                    color: '#fff',
                    background: `linear-gradient(135deg, #4dd4a8 0%, color-mix(in srgb, #4dd4a8 70%, white) 100%)`,
                    boxShadow: '0 16px 30px rgba(77,212,168,0.22)',
                    fontSize: 14,
                    fontWeight: 850,
                  }}
                >
                  {linking ? 'Linking...' : 'Link student'}
                </button>
              </div>
            </label>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <PillButton accent="#4dd4a8" onClick={() => setStudentCode(studentCode.replace(/\s+/g, ''))}>
                <Sparkles style={{ width: 14, height: 14, marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }} />
                Normalize code
              </PillButton>
              <PillButton accent="#4dd4a8" onClick={() => setStudentCode('')}>
                Clear
              </PillButton>
            </div>

            {linkError ? <div style={{ color: '#f87171', fontSize: 13, fontWeight: 700 }}>{linkError}</div> : null}
            {linkSuccess ? <div style={{ color: '#4dd4a8', fontSize: 13, fontWeight: 700 }}>{linkSuccess}</div> : null}
          </div>
        </section>

        <section
          style={{
            borderRadius: 26,
            padding: 20,
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            boxShadow: palette.softShadow,
          }}
        >
          <SectionTitle
            eyebrow="Linked students"
            title="Connected children"
            accent="#4dd4a8"
          />

          <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
            {linksLoading ? (
              <div style={{ color: palette.text2, fontSize: 14 }}>Loading linked students...</div>
            ) : links.length === 0 ? (
              <div style={{ borderRadius: 18, padding: 18, background: palette.surface2, border: `1px solid ${palette.border}`, color: palette.text2, fontSize: 14, lineHeight: 1.7 }}>
                No students are linked yet. Ask for the student code from the child account and add it here.
              </div>
            ) : (
              links.map((link) => {
                const student = link.profile;
                const active = link.studentId === selectedStudentId;
                return (
                  <div
                    key={link.studentId}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectStudent(link.studentId)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleSelectStudent(link.studentId);
                      }
                    }}
                    style={{
                      border: `1px solid ${active ? 'rgba(77,212,168,0.35)' : palette.border}`,
                      borderRadius: 20,
                      padding: 16,
                      background: active
                        ? `linear-gradient(135deg, color-mix(in srgb, #4dd4a8 10%, ${palette.surface}) 0%, ${palette.surface2} 100%)`
                        : palette.surface2,
                      color: palette.text,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 900 }}>{student?.username || 'Student'}</div>
                        <div style={{ marginTop: 4, fontSize: 13, color: palette.text2 }}>
                          {student?.title || 'Writer'} · Lv {student?.level ?? 1} · {student?.streak ?? 0}d
                        </div>
                        <div style={{ marginTop: 8, fontSize: 12, color: palette.text3 }}>
                          Code {link.studentCode}
                        </div>
                      </div>
                      <ChevronRight style={{ width: 16, height: 16, color: active ? '#4dd4a8' : palette.text3, flexShrink: 0 }} />
                    </div>
                    <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <div
                          style={{
                            borderRadius: 999,
                            padding: '10px 14px',
                            background: active
                              ? 'linear-gradient(135deg, #4dd4a8, color-mix(in srgb, #4dd4a8 70%, white))'
                              : 'rgba(255,255,255,0.04)',
                            color: active ? '#fff' : 'var(--workspace-text)',
                            fontSize: 13,
                            fontWeight: 800,
                            boxShadow: active ? '0 12px 26px color-mix(in srgb, #4dd4a8 18%, transparent)' : 'none',
                            border: active ? '1px solid color-mix(in srgb, #4dd4a8 22%, transparent)' : '1px solid var(--workspace-border)',
                          }}
                        >
                          <BarChart3 style={{ width: 14, height: 14, marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }} />
                          View report
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleUnlinkStudent(link.studentId);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          border: `1px solid ${palette.dangerBorder}`,
                          borderRadius: 14,
                          padding: '9px 12px',
                          background: palette.dangerBg,
                          color: '#f87171',
                          fontSize: 13,
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                        Unlink
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {linksError ? <div style={{ color: '#f87171', fontSize: 13, fontWeight: 700 }}>{linksError}</div> : null}
    </div>
  );

  const renderSettingsTab = () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <section
          style={{
            borderRadius: 26,
            padding: 20,
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            boxShadow: palette.softShadow,
          }}
        >
          <SectionTitle
            eyebrow="Profile"
            title="Profile"
            accent="#4dd4a8"
          />

          <div style={{ marginTop: 18, display: 'grid', gap: 16 }}>
            <div
              style={{
                borderRadius: 18,
                padding: '14px 16px',
                background: palette.surface2,
                border: `1px solid ${palette.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 14,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    background: `linear-gradient(135deg, #4dd4a8 0%, #67e8f9 100%)`,
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    fontSize: 18,
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  {parentLabel[0]?.toUpperCase() || 'P'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: palette.text }}>
                    {parentLabel || 'Parent account'}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12.5, color: palette.text2 }}>
                    {profile?.email || 'Email not set'}
                  </div>
                </div>
              </div>
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: `1px solid ${palette.border}`,
                  background: palette.inputBg,
                  color: '#4dd4a8',
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                Parent
              </div>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: palette.text3 }}>
                Display name
              </span>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Parent name"
                  style={{
                    flex: '1 1 280px',
                    borderRadius: 16,
                    padding: '13px 14px',
                    border: `1px solid ${palette.inputBorder}`,
                    background: palette.inputBg,
                    color: palette.text,
                    fontSize: 15,
                    outline: 'none',
                    minWidth: 0,
                  }}
                />
                <PillButton accent="#4dd4a8" onClick={() => void saveDisplayName()}>
                  <PencilLine style={{ width: 14, height: 14, marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }} />
                  {displayNameSaving ? 'Saving...' : 'Save'}
                </PillButton>
              </div>
            </div>

            {displayNameError ? <div style={{ color: '#f87171', fontSize: 13, fontWeight: 700 }}>{displayNameError}</div> : null}
          </div>
        </section>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <section
          style={{
            borderRadius: 26,
            padding: 20,
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            boxShadow: palette.softShadow,
          }}
        >
          <SectionTitle
            eyebrow="Session"
            title="Sign out"
            accent="#4dd4a8"
          />
          <button
            type="button"
            onClick={() => {
              router.replace('/login');
              window.location.replace('/login');
              void hardSignOut();
            }}
            style={{
              marginTop: 16,
              border: `1px solid ${palette.border}`,
              borderRadius: 18,
              padding: '14px 18px',
              background: palette.surface2,
              color: palette.text,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 850,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <ArrowRight style={{ width: 16, height: 16 }} />
            Sign out
          </button>
        </section>

        <section
          style={{
            borderRadius: 26,
            padding: 20,
            background: palette.surface,
            border: `1px solid ${palette.dangerBorder}`,
            boxShadow: palette.softShadow,
          }}
        >
          <SectionTitle
            eyebrow="Danger zone"
            title="Delete account"
            accent="#f87171"
          />

          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            <div style={{ borderRadius: 18, padding: 16, background: palette.surface2, border: `1px solid ${palette.border}`, color: palette.text2, lineHeight: 1.6, fontSize: 14 }}>
              This removes the parent account and linked access.
            </div>
            {deleteStep === 0 ? (
              <button
                type="button"
                onClick={() => setDeleteStep(1)}
                style={{
                  border: `1px solid ${palette.dangerBorder}`,
                  borderRadius: 18,
                  padding: '14px 18px',
                  background: palette.dangerBg,
                  color: '#f87171',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 850,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  width: 'fit-content',
                }}
              >
                <Trash2 style={{ width: 16, height: 16 }} />
                Continue delete
              </button>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={resetDeleteFlow}
                    style={{
                      border: `1px solid ${palette.border}`,
                      borderRadius: 18,
                      padding: '14px 18px',
                      background: palette.surface2,
                      color: palette.text,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 850,
                    }}
                  >
                    Back
                  </button>
                </div>
                <input
                  value={deleteState.confirmText}
                  onChange={(event) => setDeleteState((current) => ({ ...current, confirmText: event.target.value, error: '' }))}
                  placeholder="Type DELETE"
                  style={{
                    borderRadius: 18,
                    padding: '14px 16px',
                    border: `1px solid ${palette.dangerBorder}`,
                    background: palette.inputBg,
                    color: palette.text,
                    fontSize: 15,
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => void deleteAccount()}
                  disabled={deleteState.busy}
                  style={{
                    border: `1px solid ${palette.dangerBorder}`,
                    borderRadius: 18,
                    padding: '14px 18px',
                    background: palette.dangerBg,
                    color: '#f87171',
                    cursor: deleteState.busy ? 'default' : 'pointer',
                    fontSize: 14,
                    fontWeight: 850,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    width: 'fit-content',
                  }}
                >
                  <Trash2 style={{ width: 16, height: 16 }} />
                  {deleteState.busy ? 'Deleting...' : 'Delete account'}
                </button>
              </div>
            )}
            {deleteState.error ? <div style={{ color: '#f87171', fontSize: 13, fontWeight: 700 }}>{deleteState.error}</div> : null}
          </div>
        </section>
      </div>
    </div>
  );

  const renderHomeworkTab = () => (
    <ParentHomeworkPanel
      authToken={authToken}
      links={links}
      selectedStudentId={selectedStudentId}
      onSelectStudent={(studentId) => setSelectedStudentId(studentId)}
      mode={mode}
    />
  );

  return (
    <RoleAppShell
      roleLabel="Parent app"
      eyebrow=""
      title=""
      description={undefined}
      accent="#4dd4a8"
      expectedRole="parent"
      mode={mode}
      showHero={false}
      tabs={tabs as unknown as Array<{ key: string; label: string; description: string; icon: any }>}
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as ParentTab)}
      topRightSlot={modeToggle}
    >
      <div style={{ display: 'grid', gap: 16 }}>
        {activeTab === 'report' ? renderReportTab() : null}
        {activeTab === 'students' ? renderStudentsTab() : null}
        {activeTab === 'homework' ? renderHomeworkTab() : null}
        {activeTab === 'settings' ? renderSettingsTab() : null}
      </div>
    </RoleAppShell>
  );
}
