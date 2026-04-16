'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BarChart3, ChevronRight, Copy, LayoutGrid, MoonStar, Plus, RefreshCcw, School, Settings, SunMedium, Trash2, Users, UserCircle2 } from 'lucide-react';
import { RoleAppShell } from '@/app/components/role-app-shell';
import { StudentReportPanel, type StudentReportData } from '@/app/components/student-report-panel';
import { SectionTitle, PillButton, ToggleRow } from '@/app/components/workspace-controls';
import { useAuth } from '@/app/context/AuthContext';
import { hardSignOut } from '@/app/lib/supabase';
import { authFetchJson } from '@/app/lib/auth-fetch';
import { getWorkspacePalette } from '@/app/lib/workspace-palette';
import { readWorkspaceMode, writeWorkspaceMode, type WorkspaceMode } from '@/app/lib/workspace-mode';

type TeacherTab = 'overview' | 'bulk' | 'classes' | 'settings';
type TeacherStudent = { id: string; username: string; email: string | null; password: string | null; title: string; level: number; xp: number; streak: number; age_group: string; student_id: string | null; };
type TeacherClass = { id: string; name: string; description: string; studentCount: number; students: Array<{ studentId: string; profile: Pick<TeacherStudent, 'id' | 'username' | 'title' | 'level' | 'xp' | 'streak' | 'age_group' | 'student_id'> | null; }>; };
type TeacherWorkspace = { students: TeacherStudent[]; classes: TeacherClass[]; };
type NotificationPrefs = { newStudentAlerts: boolean; classSummary: boolean; weeklySummary: boolean; };

const TAB_KEY = 'draftora-teacher-tab-v1';
const SELECTED_STUDENT_KEY = 'draftora-teacher-selected-student-v1';
const SELECTED_CLASS_KEY = 'draftora-teacher-selected-class-v1';
const NOTIFICATION_KEY = 'draftora-teacher-notifications-v1';

function readStoredTab(): TeacherTab {
  if (typeof window === 'undefined') return 'overview';
  const value = localStorage.getItem(TAB_KEY);
  return value === 'bulk' || value === 'classes' || value === 'settings' ? value : 'overview';
}

function stored(key: string) {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(key) || '';
}

function persist(key: string, value: string) {
  try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); } catch {}
}

function readPrefs(): NotificationPrefs {
  if (typeof window === 'undefined') return { newStudentAlerts: true, classSummary: true, weeklySummary: false };
  try {
    const raw = localStorage.getItem(NOTIFICATION_KEY);
    if (!raw) return { newStudentAlerts: true, classSummary: true, weeklySummary: false };
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { newStudentAlerts: parsed.newStudentAlerts ?? true, classSummary: parsed.classSummary ?? true, weeklySummary: parsed.weeklySummary ?? false };
  } catch {
    return { newStudentAlerts: true, classSummary: true, weeklySummary: false };
  }
}

function savePrefs(prefs: NotificationPrefs) {
  try { localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(prefs)); } catch {}
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export default function TeacherPage() {
  const { profile, session } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<WorkspaceMode>('dark');
  const [activeTab, setActiveTab] = useState<TeacherTab>(() => readStoredTab());
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(() => stored(SELECTED_STUDENT_KEY));
  const [selectedClassId, setSelectedClassId] = useState('');
  const [studentDetailMode, setStudentDetailMode] = useState<'report' | 'code'>('report');
  const [expandedStudentId, setExpandedStudentId] = useState<string>('');
  const [reports, setReports] = useState<Record<string, StudentReportData>>({});
  const [reportLoadingId, setReportLoadingId] = useState('');
  const [bulkRows, setBulkRows] = useState<Array<{ firstName: string; lastName: string }>>(() => Array.from({ length: 9 }, () => ({ firstName: '', lastName: '' })));
  const [bulkClassMode, setBulkClassMode] = useState<'existing' | 'new'>('existing');
  const [bulkClassId, setBulkClassId] = useState('');
  const [bulkClassName, setBulkClassName] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkResult, setBulkResult] = useState<Array<{ name: string; username: string; email: string; password: string; studentCode: string }>>([]);
  const [copiedDetailsKey, setCopiedDetailsKey] = useState('');
  const copiedDetailsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'class'; classId: string; name: string } | { type: 'student'; classId: string; studentId: string; name: string } | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => readPrefs());
  const palette = useMemo(() => getWorkspacePalette(mode), [mode]);
  const paletteStyle = {
    borderRadius: 26,
    padding: 20,
    background: palette.surface,
    border: `1px solid ${palette.border}`,
    boxShadow: palette.softShadow,
  } as const;
  const authToken = session?.access_token ?? '';

  const handleCopyDetails = useCallback((key: string, text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedDetailsKey(key);
      if (copiedDetailsTimerRef.current) clearTimeout(copiedDetailsTimerRef.current);
      copiedDetailsTimerRef.current = setTimeout(() => {
        setCopiedDetailsKey((current) => (current === key ? '' : current));
      }, 1800);
    });
  }, []);

  useEffect(() => { const stored = readWorkspaceMode('teacher'); if (stored) setMode(stored); }, []);
  useEffect(() => { writeWorkspaceMode('teacher', mode); }, [mode]);
  useEffect(() => { localStorage.setItem(TAB_KEY, activeTab); }, [activeTab]);
  useEffect(() => { persist(SELECTED_STUDENT_KEY, selectedStudentId); }, [selectedStudentId]);
  useEffect(() => { setStudentDetailMode('report'); }, [selectedStudentId]);
  useEffect(() => { setExpandedStudentId(''); }, [students]);
  useEffect(() => { savePrefs(prefs); }, [prefs]);
  useEffect(() => () => {
    if (copiedDetailsTimerRef.current) clearTimeout(copiedDetailsTimerRef.current);
  }, []);

  useEffect(() => {
    if (!authToken) return;
    setLoadingWorkspace(true);
    setWorkspaceError('');
    Promise.allSettled([
      authFetchJson<TeacherWorkspace>('/api/teacher/students', { token: authToken }),
      authFetchJson<{ classes: TeacherClass[] }>('/api/teacher/classes', { token: authToken }),
    ])
      .then(([studentsResult, classesResult]) => {
        const loadedStudents = studentsResult.status === 'fulfilled' ? studentsResult.value.students : [];
        const loadedClasses = classesResult.status === 'fulfilled' ? classesResult.value.classes : [];

        if (studentsResult.status === 'fulfilled') {
          setStudents(loadedStudents);
          setSelectedStudentId((current) => current && loadedStudents.some((s) => s.id === current) ? current : loadedStudents[0]?.id ?? '');
        } else {
          setStudents([]);
        }

        if (classesResult.status === 'fulfilled') {
          setClasses(loadedClasses);
          setSelectedClassId((current) => current && loadedClasses.some((c) => c.id === current) ? current : loadedClasses[0]?.id ?? '');
        } else {
          setClasses([]);
        }

        if (studentsResult.status === 'rejected' || classesResult.status === 'rejected') {
          const studentMessage = studentsResult.status === 'rejected' ? studentsResult.reason instanceof Error ? studentsResult.reason.message : 'Could not load students.' : '';
          const classMessage = classesResult.status === 'rejected' ? classesResult.reason instanceof Error ? classesResult.reason.message : 'Could not load classes.' : '';
          setWorkspaceError(studentMessage || classMessage || 'Could not load the teacher workspace.');
        }
      })
      .finally(() => setLoadingWorkspace(false));
  }, [authToken]);

  const loadReport = useCallback(async (studentId: string) => {
    if (!authToken || !studentId || reports[studentId]) return;
    setReportLoadingId(studentId);
    try {
      const report = await authFetchJson<StudentReportData>(`/api/student-report?studentId=${encodeURIComponent(studentId)}`, { token: authToken });
      setReports((current) => ({ ...current, [studentId]: report }));
    } finally {
      setReportLoadingId('');
    }
  }, [authToken, reports]);
  useEffect(() => { void loadReport(selectedStudentId); }, [loadReport, selectedStudentId]);

  const tabs = [
    { key: 'overview', label: 'Student Overview', description: 'All students', icon: LayoutGrid },
    { key: 'bulk', label: 'Bulk Generation', description: 'Create batches', icon: School },
    { key: 'classes', label: 'Class Management', description: 'Groups and rosters', icon: Users },
    { key: 'settings', label: 'Settings', description: 'Account and prefs', icon: Settings },
  ] as const;

  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? null;
  const selectedClass = classes.find((klass) => klass.id === selectedClassId) ?? null;
  const currentReport = selectedStudentId ? reports[selectedStudentId] ?? null : null;
  const reportBusy = Boolean(selectedStudentId && reportLoadingId === selectedStudentId && !currentReport);
  const currentStudentCount = students.length;
  const resetBulkRows = () => setBulkRows(Array.from({ length: 9 }, () => ({ firstName: '', lastName: '' })));
  const selectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setStudentDetailMode('report');
  };
  const toggleStudentCard = (studentId: string) => {
    setSelectedStudentId(studentId);
    setStudentDetailMode('report');
    setExpandedStudentId((current) => (current === studentId ? '' : studentId));
  };

  const handleGenerate = async () => {
    if (!authToken) return;
    const rows = bulkRows
      .map((row) => ({ firstName: row.firstName.trim(), lastName: row.lastName.trim() }))
      .filter((row) => row.firstName && row.lastName);

    if (!rows.length) {
      setBulkError('Add at least one student row.');
      return;
    }
    if (bulkClassMode === 'new' && !bulkClassName.trim()) {
      setBulkError('Enter a class name or choose an existing class.');
      return;
    }
    if (bulkClassMode === 'existing' && !bulkClassId.trim()) {
      setBulkError('Choose an existing class before generating students.');
      return;
    }

    setBulkSubmitting(true);
    setBulkError('');
    try {
      const result = await authFetchJson<{ students: Array<{ name: string; username: string; email: string; password: string; studentCode: string }> }>('/api/teacher/students', {
        token: authToken,
        method: 'POST',
        body: {
          students: rows,
          className: bulkClassMode === 'new' ? bulkClassName.trim() : '',
          classId: bulkClassMode === 'existing' ? bulkClassId.trim() : '',
        },
      });
      setBulkResult(result.students);
      setBulkRows(Array.from({ length: 9 }, () => ({ firstName: '', lastName: '' })));
      setBulkClassName('');
      setBulkClassMode('existing');
      const [studentResult, classResult] = await Promise.allSettled([
        authFetchJson<TeacherWorkspace>('/api/teacher/students', { token: authToken }),
        authFetchJson<{ classes: TeacherClass[] }>('/api/teacher/classes', { token: authToken }),
      ]);
      if (studentResult.status === 'fulfilled') {
        setStudents(studentResult.value.students);
      }
      if (classResult.status === 'fulfilled') {
        setClasses(classResult.value.classes);
        const nextClassId = bulkClassMode === 'new'
          ? classResult.value.classes.find((klass) => klass.name === bulkClassName.trim())?.id ?? bulkClassId.trim()
          : bulkClassId.trim();
        if (nextClassId) {
          setSelectedClassId(nextClassId);
          setActiveTab('classes');
        }
      }
      if (studentResult.status === 'rejected' || classResult.status === 'rejected') {
        const studentMessage = studentResult.status === 'rejected' ? studentResult.reason instanceof Error ? studentResult.reason.message : 'Could not refresh students.' : '';
        const classMessage = classResult.status === 'rejected' ? classResult.reason instanceof Error ? classResult.reason.message : 'Could not refresh classes.' : '';
        setWorkspaceError(studentMessage || classMessage || 'Could not refresh the teacher workspace.');
      }
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : 'Could not generate the student batch.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleCreateClass = async () => {
    if (!authToken || !bulkClassName.trim()) return;
    try {
      const data = await authFetchJson<{ class: TeacherClass }>('/api/teacher/classes', {
        token: authToken,
        method: 'POST',
        body: { name: bulkClassName.trim(), description: '' },
      });
      setBulkClassId(data.class.id);
      setSelectedClassId(data.class.id);
      setBulkClassName('');
      setBulkClassMode('existing');
      const classesData = await authFetchJson<{ classes: TeacherClass[] }>('/api/teacher/classes', { token: authToken });
      setClasses(classesData.classes);
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : 'Could not create the class.');
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!authToken) return;
    try {
      await authFetchJson('/api/teacher/classes', { token: authToken, method: 'DELETE', body: { classId } });
      setClasses((current) => current.filter((klass) => klass.id !== classId));
      if (selectedClassId === classId) setSelectedClassId('');
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Could not delete the class.');
    }
  };

  const handleRemoveStudent = async (classId: string, studentId: string) => {
    if (!authToken) return;
    try {
      await authFetchJson('/api/teacher/class-students', { token: authToken, method: 'DELETE', body: { classId, studentId } });
      const data = await authFetchJson<{ classes: TeacherClass[] }>('/api/teacher/classes', { token: authToken });
      setClasses(data.classes);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Could not remove the student from the class.');
    }
  };


  const deleteAccount = async () => {
    if (!session?.access_token) return;
    try {
      await authFetchJson('/api/delete-account', { token: session.access_token, method: 'POST' });
      router.replace('/login');
      window.location.replace('/login');
      void hardSignOut();
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Could not delete the account.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'class') {
      await handleDeleteClass(deleteConfirm.classId);
    } else {
      await handleRemoveStudent(deleteConfirm.classId, deleteConfirm.studentId);
    }
    setDeleteConfirm(null);
  };

  const renderDeleteConfirmModal = () => {
    if (!deleteConfirm) return null;
    const label = deleteConfirm.type === 'class'
      ? `Delete the class "${deleteConfirm.name}"? This cannot be undone.`
      : `Remove "${deleteConfirm.name}" from this class?`;
    return (
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={() => setDeleteConfirm(null)}
      >
        <div
          style={{ borderRadius: 24, padding: '28px 30px', background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: '0 32px 80px rgba(0,0,0,0.45)', maxWidth: 400, width: 'calc(100vw - 2rem)', display: 'grid', gap: 18 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f87171', marginBottom: 8 }}>
              {deleteConfirm.type === 'class' ? 'Delete class' : 'Remove student'}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: palette.text, lineHeight: 1.5 }}>{label}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setDeleteConfirm(null)}
              style={{ borderRadius: 12, padding: '10px 20px', border: `1px solid ${palette.border}`, background: palette.surface2, color: palette.text2, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              style={{ borderRadius: 12, padding: '10px 20px', border: '1px solid rgba(248,113,113,0.35)', background: 'rgba(248,113,113,0.12)', color: '#f87171', cursor: 'pointer', fontSize: 13, fontWeight: 800 }}
            >
              {deleteConfirm.type === 'class' ? 'Delete class' : 'Remove student'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderThinStudentRow = (student: TeacherStudent, classId?: string) => {
    const isExpanded = expandedStudentId === student.id;
    const isSelected = selectedStudentId === student.id;
    return (
      <div key={student.id}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => toggleStudentCard(student.id)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleStudentCard(student.id); } }}
          style={{
            borderRadius: 12,
            padding: '10px 14px',
            border: `1px solid ${isExpanded ? 'rgba(103,232,249,0.28)' : palette.border}`,
            background: isExpanded ? `color-mix(in srgb, #67e8f9 5%, ${palette.surface2})` : palette.surface2,
            color: palette.text,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            outline: 'none',
          }}
        >
          <div style={{ width: 26, height: 26, borderRadius: 8, background: isExpanded ? 'rgba(103,232,249,0.14)' : 'rgba(255,255,255,0.04)', border: `1px solid ${palette.border}`, display: 'grid', placeItems: 'center', color: isExpanded ? '#67e8f9' : palette.text3, fontSize: 11, fontWeight: 900, flexShrink: 0 }}>
            {student.username[0].toUpperCase()}
          </div>
          <div style={{ fontWeight: 900, fontSize: 14, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.username}</div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: palette.text3, flexShrink: 0 }}>
            <span>Lv.{student.level}</span>
            <span>{student.xp.toLocaleString()} XP</span>
            <span>{student.streak} 🔥</span>
          </div>
          <div style={{ fontSize: 11, color: palette.text3, flexShrink: 0, display: 'none' }} className="student-code">{student.student_id || ''}</div>
          {classId && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'student', classId, studentId: student.id, name: student.username }); }}
              style={{ flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#f87171', opacity: 0.6, display: 'flex', alignItems: 'center' }}
              title="Remove from class"
            >
              <Trash2 style={{ width: 14, height: 14 }} />
            </button>
          )}
          <ChevronRight style={{ width: 14, height: 14, color: isExpanded ? '#67e8f9' : palette.text3, flexShrink: 0, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 160ms' }} />
        </div>

        {isExpanded ? (
          <div style={{ margin: '4px 0 4px 0', borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.surface, overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${palette.border}` }}>
              {(['report', 'code'] as const).map((mode_) => (
                <button
                  key={mode_}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setStudentDetailMode(mode_); setSelectedStudentId(student.id); }}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    border: 'none',
                    borderBottom: `2px solid ${isSelected && studentDetailMode === mode_ ? '#67e8f9' : 'transparent'}`,
                    background: 'transparent',
                    color: isSelected && studentDetailMode === mode_ ? '#67e8f9' : palette.text2,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 850,
                  }}
                >
                  {mode_ === 'report' ? 'Report' : 'Credentials'}
                </button>
              ))}
            </div>
            <div style={{ padding: 16 }} onClick={(e) => e.stopPropagation()}>
              {isSelected && studentDetailMode === 'report' ? (
                reportBusy ? (
                  <div style={{ color: palette.text2 }}>Loading report...</div>
                ) : (
                  <StudentReportPanel
                    report={currentReport}
                    accent="#67e8f9"
                    mode={mode}
                    emptyTitle={`Open the report for ${student.username}.`}
                    emptyCopy="The detailed report loads here once a student is selected."
                  />
                )
              ) : isSelected && studentDetailMode === 'code' ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  {[
                    { label: 'Username', value: student.username },
                    { label: 'Email', value: student.email || `${student.username}@draftora.school` },
                    { label: 'Password', value: student.password || 'No password' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: palette.text3, fontWeight: 800 }}>{label}</div>
                      <div style={{ marginTop: 3, fontSize: 16, fontWeight: 900, wordBreak: 'break-word' }}>{value}</div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleCopyDetails(
                      `student-${student.id}`,
                      `Username: ${student.username}\nEmail: ${student.email || `${student.username}@draftora.school`}\nPassword: ${student.password || ''}`,
                    )}
                    style={{ border: `1px solid ${palette.border}`, borderRadius: 12, padding: '8px 14px', background: palette.surface2, color: palette.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 850, width: 'fit-content' }}
                  >
                    <Copy style={{ width: 13, height: 13 }} />
                    {copiedDetailsKey === `student-${student.id}` ? 'Details copied' : 'Copy details'}
                  </button>
                </div>
              ) : (
                <div style={{ color: palette.text2, fontSize: 13 }}>Select Report or Credentials above.</div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const renderClassGrid = () => {
    const activeClass = classes.find((c) => c.id === selectedClassId) ?? null;
    const classStudents = activeClass
      ? activeClass.students.map((s) => students.find((st) => st.id === s.studentId)).filter((s): s is TeacherStudent => Boolean(s))
      : [];

    return (
      <div style={{ display: 'grid', gap: 10 }}>
        {loadingWorkspace ? (
          <div style={{ color: palette.text2 }}>Loading classes...</div>
        ) : classes.length === 0 ? (
          <div style={{ color: palette.text2, fontSize: 14 }}>No classes yet. Use Bulk Generation to create your first class and students.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            {classes.map((klass) => {
              const isActive = klass.id === selectedClassId;
              return (
                <div
                  key={klass.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedClassId(isActive ? '' : klass.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedClassId(isActive ? '' : klass.id);
                    }
                  }}
                  style={{
                    borderRadius: 18,
                    padding: '14px 18px',
                    border: `1px solid ${isActive ? 'rgba(103,232,249,0.38)' : palette.border}`,
                    background: isActive
                      ? `linear-gradient(135deg, color-mix(in srgb, #67e8f9 10%, ${palette.surface}) 0%, ${palette.surface2} 100%)`
                      : palette.surface2,
                    color: palette.text,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 900 }}>{klass.name}</div>
                    <div style={{ marginTop: 3, fontSize: 13, color: palette.text2 }}>{klass.studentCount} student{klass.studentCount !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'class', classId: klass.id, name: klass.name }); }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#f87171', opacity: 0.7, display: 'flex', alignItems: 'center' }}
                      title="Delete class"
                    >
                      <Trash2 style={{ width: 15, height: 15 }} />
                    </button>
                    <ChevronRight style={{ width: 16, height: 16, color: isActive ? '#67e8f9' : palette.text3, transform: isActive ? 'rotate(90deg)' : 'none', transition: 'transform 160ms' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeClass ? (
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 2px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: palette.text3 }}>
                {activeClass.name} — {classStudents.length} student{classStudents.length !== 1 ? 's' : ''}
              </div>
            </div>
            {classStudents.length === 0 ? (
              <div style={{ color: palette.text2, fontSize: 13 }}>No students in this class yet.</div>
            ) : (
              classStudents.map((student) => renderThinStudentRow(student, activeClass.id))
            )}
          </div>
        ) : null}
      </div>
    );
  };

  const renderOverview = () => (
    <section style={{ ...paletteStyle, display: 'grid', gap: 16 }}>
      <div
        style={{
          borderRadius: 28,
          padding: '28px 30px',
          background: mode === 'dark'
            ? 'linear-gradient(130deg, rgba(6, 10, 22, 0.98) 0%, rgba(9, 17, 34, 0.96) 42%, rgba(11, 28, 49, 0.98) 100%)'
            : 'linear-gradient(130deg, #f0fdf9 0%, #d1fae5 35%, #a7f3d0 70%, #6ee7b7 100%)',
          border: `1px solid ${palette.border}`,
          boxShadow: mode === 'dark' ? '0 30px 96px rgba(0,0,0,0.36)' : '0 22px 70px rgba(15,23,42,0.12)',
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(18px)',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: -50, right: -40, width: 220, height: 220, borderRadius: '50%', background: mode === 'dark' ? 'radial-gradient(circle, rgba(56,189,248,0.22) 0%, transparent 68%)' : 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 68%)' }} />
          <div style={{ position: 'absolute', bottom: -30, left: '35%', width: 180, height: 180, borderRadius: '50%', background: mode === 'dark' ? 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)' }} />
        </div>
        <div style={{ position: 'relative', display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: mode === 'dark' ? 'rgba(125,211,252,0.84)' : 'rgba(5,150,105,0.82)' }}>
            Teacher dashboard
          </div>
          <div
            style={{
              fontSize: 'clamp(2.4rem, 5vw, 4.4rem)',
              lineHeight: 0.95,
              fontWeight: 950,
              letterSpacing: '-0.06em',
              color: mode === 'dark' ? '#f2fbff' : '#064e3b',
              textShadow: mode === 'dark' ? '0 12px 30px rgba(56,189,248,0.10)' : '0 1px 0 rgba(255,255,255,0.24)',
            }}
          >
            Welcome back, {profile?.username || 'Teacher'}
          </div>
          <div style={{ maxWidth: 760, fontSize: 15, lineHeight: 1.7, color: palette.text2 }}>
            Manage students, review progress, and generate accounts from one place.
          </div>
        </div>
      </div>

      {renderClassGrid()}
    </section>
  );
  const renderBulk = () => (
    <section style={{ ...paletteStyle, display: 'grid', gap: 16 }}>
      <SectionTitle
        eyebrow="Bulk generation"
        title="Create student accounts in a simple flow"
        copy="Add names, choose where the students belong, and generate complete accounts in one pass."
        accent="#67e8f9"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <div style={{ borderRadius: 20, padding: 16, background: palette.surface2, border: `1px solid ${palette.border}`, display: 'grid', gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: palette.text3 }}>Step 1</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: palette.text }}>Choose the class destination</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <PillButton active={bulkClassMode === 'existing'} accent="#67e8f9" onClick={() => setBulkClassMode('existing')}>Use existing class</PillButton>
            <PillButton active={bulkClassMode === 'new'} accent="#67e8f9" onClick={() => setBulkClassMode('new')}>Create new class</PillButton>
          </div>
        </div>

        <div style={{ borderRadius: 20, padding: 16, background: palette.surface2, border: `1px solid ${palette.border}`, display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: palette.text3 }}>Step 2</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: palette.text }}>Fill in student names</div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: palette.text2 }}>
            Each row creates one account. Keep it simple: first name, last name, then generate.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        <div style={{ borderRadius: 22, padding: 18, background: palette.surface2, border: `1px solid ${palette.border}`, display: 'grid', gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: palette.text3 }}>Step 3</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: palette.text }}>
            {bulkClassMode === 'existing' ? 'Select an existing class' : 'Create a new class'}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: palette.text2 }}>
            {bulkClassMode === 'existing'
              ? 'Pick the class where these students should be added.'
              : 'Give the class a name first, then the generated students will be linked to it automatically.'}
          </div>
          {bulkClassMode === 'existing' ? (
            <select
              value={bulkClassId}
              onChange={(event) => setBulkClassId(event.target.value)}
              style={{
                borderRadius: 18,
                padding: '14px 16px',
                border: `1px solid ${palette.inputBorder}`,
                background: palette.inputBg,
                color: palette.text,
                fontSize: 15,
              }}
            >
              <option value="">No class selected</option>
              {classes.map((klass) => <option key={klass.id} value={klass.id}>{klass.name}</option>)}
            </select>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
              <input
                value={bulkClassName}
                onChange={(event) => setBulkClassName(event.target.value)}
                placeholder="New class name"
                style={{
                  borderRadius: 18,
                  padding: '14px 16px',
                  border: `1px solid ${palette.inputBorder}`,
                  background: palette.inputBg,
                  color: palette.text,
                  fontSize: 15,
                  minWidth: 0,
                }}
              />
              <button
                type="button"
                onClick={() => void handleCreateClass()}
                style={{
                  border: 'none',
                  borderRadius: 18,
                  padding: '0 18px',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #67e8f9 0%, color-mix(in srgb, #67e8f9 70%, white) 100%)',
                  color: '#06111b',
                  fontSize: 14,
                  fontWeight: 850,
                }}
              >
                Create
              </button>
            </div>
          )}
        </div>

        <div style={{ borderRadius: 22, padding: 18, background: palette.surface2, border: `1px solid ${palette.border}`, display: 'grid', gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: palette.text3 }}>At a glance</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: palette.text2 }}>
              <span>Rows filled</span>
              <strong style={{ color: palette.text }}>{bulkRows.filter((row) => row.firstName.trim() && row.lastName.trim()).length} / {bulkRows.length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: palette.text2 }}>
              <span>Class target</span>
              <strong style={{ color: palette.text }}>
                {bulkClassMode === 'existing'
                  ? (classes.find((klass) => klass.id === bulkClassId)?.name || 'No class selected')
                  : (bulkClassName.trim() || 'New class')}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: palette.text2 }}>
              <span>Account type</span>
              <strong style={{ color: palette.text }}>Student</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: palette.text2 }}>
              <span>Students in workspace</span>
              <strong style={{ color: palette.text }}>{currentStudentCount}</strong>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 10 }}>
        {bulkRows.map((row, index) => {
          const isFilled = Boolean(row.firstName.trim() || row.lastName.trim());
          return (
            <div
              key={index}
              style={{
                borderRadius: 18,
                padding: 12,
                background: isFilled ? `linear-gradient(135deg, color-mix(in srgb, #67e8f9 6%, ${palette.surface2}) 0%, ${palette.surface2} 100%)` : palette.surface2,
                border: `1px solid ${isFilled ? 'rgba(103,232,249,0.18)' : palette.border}`,
                display: 'grid',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(103,232,249,0.12)', border: `1px solid ${palette.border}`, color: '#67e8f9', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
                    {index + 1}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: palette.text }}>Student {index + 1}</div>
                    <div style={{ fontSize: 11, color: palette.text3, lineHeight: 1.45 }}>Enter the first and last name exactly as you want them shown.</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${palette.dangerBorder}`,
                    background: palette.dangerBg,
                    color: '#f87171',
                    width: 34,
                    height: 34,
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  aria-label={`Remove row ${index + 1}`}
                >
                  <Trash2 style={{ width: 15, height: 15 }} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                <input
                  value={row.firstName}
                  onChange={(event) => setBulkRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, firstName: event.target.value } : item))}
                  placeholder="First name"
                  style={{ borderRadius: 14, padding: '11px 12px', border: `1px solid ${palette.inputBorder}`, background: palette.inputBg, color: palette.text, fontSize: 13, minWidth: 0 }}
                />
                <input
                  value={row.lastName}
                  onChange={(event) => setBulkRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, lastName: event.target.value } : item))}
                  placeholder="Last name"
                  style={{ borderRadius: 14, padding: '11px 12px', border: `1px solid ${palette.inputBorder}`, background: palette.inputBg, color: palette.text, fontSize: 13, minWidth: 0 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <PillButton accent="#67e8f9" onClick={() => setBulkRows((current) => [...current, { firstName: '', lastName: '' }])}>
          <Plus style={{ width: 14, height: 14, marginRight: 6, verticalAlign: 'middle' }} />
          Add row
        </PillButton>
        <PillButton accent="#67e8f9" onClick={resetBulkRows}>
          Reset grid
        </PillButton>
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={bulkSubmitting}
          style={{
            border: 'none',
            borderRadius: 18,
            padding: '14px 20px',
            cursor: bulkSubmitting ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg, #67e8f9 0%, color-mix(in srgb, #67e8f9 70%, white) 100%)',
            color: '#06111b',
            fontSize: 14,
            fontWeight: 900,
            boxShadow: '0 16px 30px rgba(103,232,249,0.18)',
            opacity: bulkSubmitting ? 0.55 : 1,
          }}
        >
          {bulkSubmitting ? 'Generating...' : 'Generate students'}
        </button>
        <button
          type="button"
          onClick={() => void authFetchJson<TeacherWorkspace>('/api/teacher/students', { token: authToken }).then((data) => setStudents(data.students))}
          style={{ border: `1px solid ${palette.border}`, borderRadius: 18, padding: '14px 18px', background: palette.surface2, color: palette.text, cursor: 'pointer', fontSize: 14, fontWeight: 850, display: 'inline-flex', alignItems: 'center', gap: 10 }}
        >
          <RefreshCcw style={{ width: 16, height: 16 }} />
          Refresh
        </button>
      </div>

      {bulkError ? <div style={{ color: '#f87171', fontSize: 13, fontWeight: 700 }}>{bulkError}</div> : null}

    </section>
  );
  const renderClasses = () => (
    <section style={{ ...paletteStyle, display: 'grid', gap: 16 }}>
      <SectionTitle
        eyebrow="Class management"
        title="Your classes"
        copy="Select a class to view its students. Click a student row to see their report or credentials."
        accent="#67e8f9"
      />

      {renderClassGrid()}

      {bulkResult.length > 0 ? (
        <div style={{ borderRadius: 24, padding: 18, background: palette.surface2, border: `1px solid ${palette.border}`, display: 'grid', gap: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 950, color: palette.text }}>Generated accounts</div>
            <div style={{ marginTop: 4, fontSize: 13, color: palette.text2 }}>These are the latest student accounts created from Bulk Generation.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {bulkResult.map((student) => (
              <div key={student.username} style={{ borderRadius: 18, padding: 16, background: palette.surface, border: `1px solid ${palette.border}`, display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 15, fontWeight: 950, color: palette.text }}>Name: {student.name}</div>
                  <button
                    type="button"
                    onClick={() => handleCopyDetails(
                      `bulk-${student.username}`,
                      `Username: ${student.username}\nEmail: ${student.email}\nPassword: ${student.password}`,
                    )}
                    style={{ border: `1px solid ${palette.border}`, borderRadius: 14, padding: '9px 12px', background: 'transparent', color: palette.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    <Copy style={{ width: 14, height: 14 }} />
                    {copiedDetailsKey === `bulk-${student.username}` ? 'Details copied' : 'Copy details'}
                  </button>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {[
                    { label: 'Username', value: student.username },
                    { label: 'Email', value: student.email },
                    { label: 'Password', value: student.password },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ fontSize: 15, color: palette.text, lineHeight: 1.5 }}>
                      <strong style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: palette.text3 }}>{label}</strong>
                      <div style={{ fontSize: 16, fontWeight: 900, marginTop: 2, wordBreak: 'break-word' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

    </section>
  );
  const renderSettings = () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' }}>
        <section style={paletteStyle}>
          <SectionTitle eyebrow="Profile" title="Teacher account" copy="Your teacher username is fixed and cannot be changed." accent="#67e8f9" />
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            <div style={{ borderRadius: 22, padding: 18, background: palette.surface2, border: `1px solid ${palette.border}`, display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 54, height: 54, borderRadius: 18, background: 'linear-gradient(135deg, #67e8f9 0%, #60a5fa 100%)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 20, fontWeight: 900 }}>{profile?.username?.[0]?.toUpperCase() || 'T'}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: palette.text }}>{profile?.username || 'Teacher account'}</div>
                <div style={{ marginTop: 4, fontSize: 13, color: palette.text2 }}>{profile?.email || 'Email not set'}</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        <section style={paletteStyle}>
          <SectionTitle eyebrow="Notifications" title="Alert preferences" copy="Control teacher-specific notification cues stored in this browser." accent="#67e8f9" />
          <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
            <ToggleRow label="New student alerts" description="Show a cue when a new student account is generated." checked={prefs.newStudentAlerts} onChange={(value) => setPrefs((current) => ({ ...current, newStudentAlerts: value }))} />
            <ToggleRow label="Class summary" description="Keep class summary reminders turned on." checked={prefs.classSummary} onChange={(value) => setPrefs((current) => ({ ...current, classSummary: value }))} />
            <ToggleRow label="Weekly summary" description="Receive a weekly teaching summary digest." checked={prefs.weeklySummary} onChange={(value) => setPrefs((current) => ({ ...current, weeklySummary: value }))} />
          </div>
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <section style={paletteStyle}>
          <SectionTitle eyebrow="Session" title="Sign out" copy="Leave the teacher workspace on this device." accent="#67e8f9" />
          <button
            type="button"
            onClick={() => { router.replace('/login'); window.location.replace('/login'); void hardSignOut(); }}
            style={{ marginTop: 16, border: `1px solid ${palette.border}`, borderRadius: 18, padding: '14px 18px', background: palette.surface2, color: palette.text, cursor: 'pointer', fontSize: 14, fontWeight: 850, display: 'inline-flex', alignItems: 'center', gap: 10 }}
          >
            <ArrowRight style={{ width: 16, height: 16 }} />
            Sign out
          </button>
        </section>

        <section style={{ ...paletteStyle, border: `1px solid ${palette.dangerBorder}` }}>
          <SectionTitle eyebrow="Danger zone" title="Delete account" copy="This removes the teacher account, classes, and connected workspace data." accent="#f87171" />
          <button
            type="button"
            onClick={() => void deleteAccount()}
            style={{ marginTop: 16, border: `1px solid ${palette.dangerBorder}`, borderRadius: 18, padding: '14px 18px', background: palette.dangerBg, color: '#f87171', cursor: 'pointer', fontSize: 14, fontWeight: 850, display: 'inline-flex', alignItems: 'center', gap: 10 }}
          >
            <Trash2 style={{ width: 16, height: 16 }} />
            Delete account
          </button>
        </section>
      </div>
    </div>
  );

  const modeToggle = (
    <div style={{ display: 'flex', gap: 8 }}>
      <PillButton active={mode === 'dark'} accent="#67e8f9" onClick={() => setMode('dark')}><MoonStar style={{ width: 14, height: 14, marginRight: 6, verticalAlign: 'middle' }} />Dark</PillButton>
      <PillButton active={mode === 'light'} accent="#67e8f9" onClick={() => setMode('light')}><SunMedium style={{ width: 14, height: 14, marginRight: 6, verticalAlign: 'middle' }} />Light</PillButton>
    </div>
  );

  return (
    <>
    <RoleAppShell
      roleLabel="Teacher app"
      eyebrow="Teacher workspace"
      title="Manage classes and students"
      description="Run your teacher workspace, review progress, and generate student accounts."
      accent="#67e8f9"
      expectedRole="teacher"
      mode={mode}
      showHero={false}
      tabs={tabs as unknown as Array<{ key: string; label: string; description: string; icon: any }>}
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as TeacherTab)}
      topRightSlot={modeToggle}
    >
      <div style={{ display: 'grid', gap: 16 }}>
        {workspaceError ? <div style={{ borderRadius: 18, padding: 16, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.16)', color: '#fca5a5', fontSize: 13, fontWeight: 700 }}>{workspaceError}</div> : null}
        {activeTab === 'overview' ? renderOverview() : null}
        {activeTab === 'bulk' ? renderBulk() : null}
        {activeTab === 'classes' ? renderClasses() : null}
        {activeTab === 'settings' ? renderSettings() : null}
      </div>

    </RoleAppShell>
    {renderDeleteConfirmModal()}
    </>
  );
}
