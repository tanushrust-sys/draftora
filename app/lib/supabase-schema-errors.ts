type MissingColumnTarget = {
  table: string;
  column: string;
};

export function isMissingColumnError(
  message: string | null | undefined,
  target: MissingColumnTarget,
) {
  const normalized = (message || '').toLowerCase();
  if (!normalized) return false;

  const table = target.table.toLowerCase();
  const column = target.column.toLowerCase();
  const quotedTable = `'${table}'`;
  const quotedColumn = `'${column}'`;

  return (
    normalized.includes(`${table}.${column}`) ||
    (normalized.includes('schema cache') &&
      normalized.includes(quotedTable) &&
      normalized.includes(quotedColumn)) ||
    (normalized.includes('could not find') &&
      normalized.includes(quotedTable) &&
      normalized.includes(quotedColumn)) ||
    (normalized.includes(table) &&
      normalized.includes(column) &&
      normalized.includes('does not exist'))
  );
}

export function isMissingAgeGroupColumnError(message?: string | null) {
  return isMissingColumnError(message, { table: 'profiles', column: 'age_group' });
}

export function isMissingWritingExperienceColumnError(message?: string | null) {
  return isMissingColumnError(message, { table: 'profiles', column: 'writing_experience_score' });
}

export function isMissingAccountTypeColumnError(message?: string | null) {
  return isMissingColumnError(message, { table: 'profiles', column: 'account_type' });
}

export function isMissingVocabSentenceColumnError(message?: string | null) {
  return (
    isMissingColumnError(message, { table: 'vocab_words', column: 'user_sentence' }) ||
    isMissingColumnError(message, { table: 'vocab_words', column: 'sentence_feedback' })
  );
}
