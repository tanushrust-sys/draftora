export type SupportKnowledgeDoc = {
  topic: string;
  content: string;
  keywords: string[];
};

export const SUPPORT_KNOWLEDGE_BASE: SupportKnowledgeDoc[] = [
  {
    topic: 'core purpose',
    keywords: ['what is draftora', 'about draftora', 'what does draftora do', 'purpose'],
    content:
      'Draftora is an AI writing platform built around students, with connected parent and teacher workspaces. The core loop is draft, receive guidance, revise, and track growth.',
  },
  {
    topic: 'roles and routing',
    keywords: ['account', 'roles', 'student', 'parent', 'teacher', 'route', 'dashboard'],
    content:
      'Draftora supports student, parent, and teacher account types. After authentication, users are routed to role-specific homes: student dashboard, parent workspace, or teacher workspace.',
  },
  {
    topic: 'student writing flow',
    keywords: ['writing', 'draft', 'editor', 'submission', 'reviewed', 'improvements', 'strengths'],
    content:
      'Students write in a focused editor, save drafts, submit for AI feedback, review strengths and improvements, and iterate through revision cycles.',
  },
  {
    topic: 'ai features',
    keywords: ['ai', 'coach', 'feedback', 'rewrite', 'report', 'assistant'],
    content:
      'AI features include coach chat, structured writing feedback, progress summaries, and guided revision support. The product is designed to coach student writing rather than replace it.',
  },
  {
    topic: 'vocabulary system',
    keywords: ['vocab', 'vocabulary', 'word bank', 'sentence feedback', 'mastery'],
    content:
      'Vocabulary tools include saving words, practicing sentence usage, receiving AI sentence checks, and tracking mastery progression over time.',
  },
  {
    topic: 'rewards and progression',
    keywords: ['xp', 'level', 'streak', 'rewards', 'themes', 'cosmetics'],
    content:
      'Students earn XP from actions, progress through levels, maintain streaks, and unlock themes/cosmetics to reinforce consistent writing habits.',
  },
  {
    topic: 'parent workspace',
    keywords: ['parent', 'parents', 'linked student', 'home support', 'progress visibility'],
    content:
      'Parents can link to student accounts with student codes, view writing progress signals, and use clear feedback trends to support practice at home.',
  },
  {
    topic: 'teacher workspace',
    keywords: ['teacher', 'teachers', 'classes', 'classroom', 'student management'],
    content:
      'Teachers can manage classes, monitor student writing patterns, and apply consistent AI-supported signals for faster instructional feedback.',
  },
  {
    topic: 'security and privacy',
    keywords: ['safe', 'safety', 'secure', 'security', 'privacy', 'data protection', 'kids'],
    content:
      'Draftora uses authenticated sessions, role-based access controls, and protected API patterns so users only access data they are authorized to view.',
  },
  {
    topic: 'plans and access',
    keywords: ['free', 'trial', 'plan', 'pricing', 'cost', 'practice mode'],
    content:
      'Draftora includes free/trial access with feature limits and a practice mode entry path from the homepage for quick exploration.',
  },
];

function normalizeTokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function scoreDoc(query: string, doc: SupportKnowledgeDoc) {
  const tokens = normalizeTokens(query);
  if (!tokens.length) return 0;

  const keywordHits = doc.keywords.reduce((sum, keyword) => sum + (query.includes(keyword.toLowerCase()) ? 3 : 0), 0);
  const contentTokens = normalizeTokens(doc.content);
  const overlap = tokens.reduce((sum, token) => sum + (contentTokens.includes(token) ? 1 : 0), 0);
  return keywordHits + overlap;
}

export function findRelevantSupportDocs(userText: string, maxDocs = 4): SupportKnowledgeDoc[] {
  const query = userText.trim().toLowerCase();
  if (!query) return SUPPORT_KNOWLEDGE_BASE.slice(0, Math.max(1, Math.min(maxDocs, 2)));

  return SUPPORT_KNOWLEDGE_BASE
    .map((doc) => ({ doc, score: scoreDoc(query, doc) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxDocs)
    .map((item) => item.doc);
}

export function localSupportReply(userText: string): string {
  const relevant = findRelevantSupportDocs(userText, 2);
  if (!relevant.length) {
    return 'I can help with writing editor, AI feedback, coach, vocabulary, rewards, parent/teacher workspaces, account roles, and safety.';
  }
  if (relevant.length === 1) return relevant[0].content;
  return `${relevant[0].content} Also: ${relevant[1].content}`;
}

export function buildSupportContext(userText: string): string {
  const docs = findRelevantSupportDocs(userText, 5);
  const sourceDocs = docs.length ? docs : SUPPORT_KNOWLEDGE_BASE.slice(0, 5);
  return sourceDocs.map((doc) => `- ${doc.topic}: ${doc.content}`).join('\n');
}
