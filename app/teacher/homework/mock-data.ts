export type MockTeacherClass = { id: string; name: string; studentIds: string[] };
export type MockTeacherStudent = { id: string; username: string };

export const MOCK_TEACHER_CLASSES: MockTeacherClass[] = [
  { id: 'mock_6a', name: 'Class 6A', studentIds: ['mock_s1', 'mock_s2', 'mock_s3', 'mock_s4', 'mock_s5', 'mock_s6'] },
  { id: 'mock_6b', name: 'Class 6B', studentIds: ['mock_s7', 'mock_s8', 'mock_s9', 'mock_s10', 'mock_s11'] },
  { id: 'mock_7wg', name: 'Class 7 Writing Group', studentIds: ['mock_s12', 'mock_s13', 'mock_s14', 'mock_s15'] },
];

export const MOCK_TEACHER_STUDENTS: MockTeacherStudent[] = [
  { id: 'mock_s1', username: 'Ava Nguyen' },
  { id: 'mock_s2', username: 'Leo Patel' },
  { id: 'mock_s3', username: 'Mia Chen' },
  { id: 'mock_s4', username: 'Noah Williams' },
  { id: 'mock_s5', username: 'Sofia Garcia' },
  { id: 'mock_s6', username: 'Ethan Brown' },
  { id: 'mock_s7', username: 'Isla Martin' },
  { id: 'mock_s8', username: 'Jack Taylor' },
  { id: 'mock_s9', username: 'Chloe Wilson' },
  { id: 'mock_s10', username: 'Oliver Singh' },
  { id: 'mock_s11', username: 'Grace Lee' },
  { id: 'mock_s12', username: 'Amelia Scott' },
  { id: 'mock_s13', username: 'Henry Adams' },
  { id: 'mock_s14', username: 'Lily Baker' },
  { id: 'mock_s15', username: 'Lucas Evans' },
];

