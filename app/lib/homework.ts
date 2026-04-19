export type HomeworkDayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type WritingHomeworkConfig = {
  piecesByType: Record<string, number>;
  minWordsByType: Record<string, number>;
  totalPieces: number;
  minWordsGeneral: number | null;
  notes: string;
  // Legacy compatibility fields.
  creativePieces?: number;
  persuasivePieces?: number;
  minWordsCreative?: number | null;
  minWordsPersuasive?: number | null;
};

export type VocabHomeworkConfig = {
  wordsToLearn: number;
  requireDrill: boolean;
  notes: string;
};

export type HomeworkPayload = {
  writing: WritingHomeworkConfig | null;
  vocab: VocabHomeworkConfig | null;
  parentNotes: string;
};

export type DayHomeworkPlan = {
  writing: WritingHomeworkConfig | null;
  vocab: VocabHomeworkConfig | null;
  notes: string;
};

export type WeeklyHomeworkPlan = Record<HomeworkDayKey, DayHomeworkPlan>;

export type HomeworkAssignment = {
  id: string;
  studentId: string;
  parentId: string;
  assignedDate: string;
  dueDate: string;
  payload: HomeworkPayload;
  createdAt: string;
};

export type HomeworkProgressBreakdown = {
  writingCompleted: number;
  writingRequired: number;
  vocabCompleted: number;
  vocabRequired: number;
  drillCompleted: boolean;
  drillRequired: boolean;
};

export type HomeworkTaskItem = {
  id: string;
  title: string;
  source: 'one_time' | 'timetable';
  dueDate: string;
  assignedDate?: string;
  notes?: string;
  writing: WritingHomeworkConfig | null;
  vocab: VocabHomeworkConfig | null;
  completionPct: number;
  breakdown: HomeworkProgressBreakdown;
};

export type HomeworkPerformanceDay = {
  date: string;
  weekday: string;
  assigned: HomeworkTaskItem[];
  completionRate: number;
  writingCompleted: number;
  writingRequired: number;
  vocabCompleted: number;
  vocabRequired: number;
};

export type HomeworkPerformanceSummary = {
  twoWeekCompletionRate: number;
  writingCompletionRate: number;
  vocabCompletionRate: number;
  strongestArea: string;
  improvementArea: string;
  consistencyStreak: number;
  insights: string[];
  nextSteps: string[];
};

export const HOMEWORK_DAY_KEYS: HomeworkDayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const WRITING_TYPE_OPTIONS = [
  'Persuasive Essay',
  'Creative Story',
  'Blog Entry',
  'Email',
  'Feature Article',
  'Personal',
  'Poetry',
  'Other',
  'Free Writing',
] as const;

const LEGACY_CREATIVE_KEY = 'Creative Story';
const LEGACY_PERSUASIVE_KEY = 'Persuasive Essay';

export function createDefaultWritingConfig(): WritingHomeworkConfig {
  return {
    piecesByType: {},
    minWordsByType: {},
    totalPieces: 1,
    minWordsGeneral: null,
    notes: '',
    creativePieces: 0,
    persuasivePieces: 0,
    minWordsCreative: null,
    minWordsPersuasive: null,
  };
}

export function createDefaultVocabConfig(): VocabHomeworkConfig {
  return {
    wordsToLearn: 10,
    requireDrill: false,
    notes: '',
  };
}

export function createDefaultDayPlan(): DayHomeworkPlan {
  return {
    writing: null,
    vocab: null,
    notes: '',
  };
}

export function createDefaultWeeklyPlan(): WeeklyHomeworkPlan {
  return {
    monday: createDefaultDayPlan(),
    tuesday: createDefaultDayPlan(),
    wednesday: createDefaultDayPlan(),
    thursday: createDefaultDayPlan(),
    friday: createDefaultDayPlan(),
    saturday: createDefaultDayPlan(),
    sunday: createDefaultDayPlan(),
  };
}

export function normalizeWritingConfig(input: unknown): WritingHomeworkConfig | null {
  if (!input || typeof input !== 'object') return null;
  const record = input as Record<string, unknown>;
  const piecesByType = normalizeIntRecord(record.piecesByType, 0, 10);
  const legacyCreative = clampInt(record.creativePieces, 0, 10, 0);
  const legacyPersuasive = clampInt(record.persuasivePieces, 0, 10, 0);
  if (legacyCreative > 0 && !(LEGACY_CREATIVE_KEY in piecesByType)) {
    piecesByType[LEGACY_CREATIVE_KEY] = legacyCreative;
  }
  if (legacyPersuasive > 0 && !(LEGACY_PERSUASIVE_KEY in piecesByType)) {
    piecesByType[LEGACY_PERSUASIVE_KEY] = legacyPersuasive;
  }

  const sumPieces = Object.values(piecesByType).reduce((sum, count) => sum + count, 0);
  const totalPieces = clampInt(record.totalPieces, 0, 12, Math.max(sumPieces, 1));

  if (sumPieces === 0 && totalPieces === 0) {
    return null;
  }

  const minWordsByType = normalizeOptionalIntRecord(record.minWordsByType, 1, 5000);
  const legacyMinCreative = normalizeOptionalNumber(record.minWordsCreative);
  const legacyMinPersuasive = normalizeOptionalNumber(record.minWordsPersuasive);
  if (legacyMinCreative && !(LEGACY_CREATIVE_KEY in minWordsByType)) {
    minWordsByType[LEGACY_CREATIVE_KEY] = legacyMinCreative;
  }
  if (legacyMinPersuasive && !(LEGACY_PERSUASIVE_KEY in minWordsByType)) {
    minWordsByType[LEGACY_PERSUASIVE_KEY] = legacyMinPersuasive;
  }

  return {
    piecesByType,
    minWordsByType,
    totalPieces,
    minWordsGeneral: normalizeOptionalNumber(record.minWordsGeneral),
    notes: normalizeString(record.notes, 500),
    creativePieces: piecesByType[LEGACY_CREATIVE_KEY] ?? 0,
    persuasivePieces: piecesByType[LEGACY_PERSUASIVE_KEY] ?? 0,
    minWordsCreative: minWordsByType[LEGACY_CREATIVE_KEY] ?? null,
    minWordsPersuasive: minWordsByType[LEGACY_PERSUASIVE_KEY] ?? null,
  };
}

export function normalizeVocabConfig(input: unknown): VocabHomeworkConfig | null {
  if (!input || typeof input !== 'object') return null;
  const record = input as Record<string, unknown>;
  const wordsToLearn = clampInt(record.wordsToLearn, 0, 80, 0);
  const requireDrill = Boolean(record.requireDrill);
  if (wordsToLearn === 0 && !requireDrill) return null;

  return {
    wordsToLearn,
    requireDrill,
    notes: normalizeString(record.notes, 500),
  };
}

export function normalizeHomeworkPayload(input: unknown): HomeworkPayload {
  const record = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  return {
    writing: normalizeWritingConfig(record.writing),
    vocab: normalizeVocabConfig(record.vocab),
    parentNotes: normalizeString(record.parentNotes, 800),
  };
}

export function normalizeWeeklyPlan(input: unknown): WeeklyHomeworkPlan {
  const source = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  const base = createDefaultWeeklyPlan();

  for (const day of HOMEWORK_DAY_KEYS) {
    const dayRaw = source[day];
    if (!dayRaw || typeof dayRaw !== 'object') continue;
    const dayRecord = dayRaw as Record<string, unknown>;
    base[day] = {
      writing: normalizeWritingConfig(dayRecord.writing),
      vocab: normalizeVocabConfig(dayRecord.vocab),
      notes: normalizeString(dayRecord.notes, 400),
    };
  }

  return base;
}

export function getHomeworkDayKey(date: Date): HomeworkDayKey {
  const day = date.getDay();
  const index = day === 0 ? 6 : day - 1;
  return HOMEWORK_DAY_KEYS[index];
}

export function formatHomeworkDate(date: string) {
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
  } catch {
    return date;
  }
}

function normalizeOptionalNumber(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.max(1, Math.min(5000, Math.round(num)));
}

function normalizeIntRecord(value: unknown, min: number, max: number): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  const record = value as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const [rawKey, rawValue] of Object.entries(record)) {
    const key = normalizeKey(rawKey);
    if (!key) continue;
    const normalized = clampInt(rawValue, min, max, 0);
    if (normalized > 0) out[key] = normalized;
  }
  return out;
}

function normalizeOptionalIntRecord(value: unknown, min: number, max: number): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  const record = value as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const [rawKey, rawValue] of Object.entries(record)) {
    const key = normalizeKey(rawKey);
    if (!key) continue;
    const normalized = clampInt(rawValue, min, max, 0);
    if (normalized > 0) out[key] = normalized;
  }
  return out;
}

function normalizeKey(value: string) {
  return value.trim().slice(0, 80);
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function normalizeString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}
