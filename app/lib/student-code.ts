const STUDENT_CODE_PREFIX = 'DRA';
const STUDENT_CODE_BODY_LENGTH = 6;
const STUDENT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeStudentCode(value?: string | null) {
  return (value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function generateStudentCode() {
  const bytes = new Uint8Array(STUDENT_CODE_BODY_LENGTH);

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  const body = Array.from(bytes, (byte) => STUDENT_CODE_ALPHABET[byte % STUDENT_CODE_ALPHABET.length]).join('');
  return `${STUDENT_CODE_PREFIX}${body}`;
}

