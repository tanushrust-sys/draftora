export type WorkspaceMode = 'dark' | 'light';
export type WorkspaceName = 'parent' | 'teacher';

const STORAGE_KEYS: Record<WorkspaceName, string> = {
  parent: 'draftora-parent-mode-v1',
  teacher: 'draftora-teacher-mode-v1',
};

export function readWorkspaceMode(workspace: WorkspaceName): WorkspaceMode | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEYS[workspace]);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}

export function writeWorkspaceMode(workspace: WorkspaceName, mode: WorkspaceMode) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEYS[workspace], mode);
  } catch {
    // ignore storage failures
  }
}
