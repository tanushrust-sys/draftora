// TypeScript types for all our Supabase database tables

export type AccountType = 'teacher' | 'student' | 'parent';

export type CoachMessage = { role: 'user' | 'assistant'; content: string; timestamp: string };

export type Database = {
  public: {
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          email: string;
          title: string;
          level: number;
          xp: number;
          streak: number;
          longest_streak: number;
          last_writing_date: string | null;
          daily_word_goal: number;
          daily_vocab_goal: number;
          custom_daily_goal: string;
          active_theme: string;
          unlocked_themes: string[];
          plan: 'free' | 'plus' | 'pro';
          student_id: string | null;
          teacher_id: string | null;
          account_type: AccountType;
          age_group: string;
          writing_goal: string;
          writing_experience_score: number;
          /** Running count of coach messages sent (free trial gate) */
          coach_messages_used: number;
          /** Running count of new writings created (free trial gate) */
          writings_created: number;
          /** Running count of vocab words added to the word bank (free trial gate) */
          vocab_words_saved: number;
          free_started_at: string;
          usage_period_started_at: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          stripe_subscription_status: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          title?: string;
          level?: number;
          xp?: number;
          streak?: number;
          longest_streak?: number;
          last_writing_date?: string | null;
          daily_word_goal?: number;
          daily_vocab_goal?: number;
          custom_daily_goal?: string;
          active_theme?: string;
          unlocked_themes?: string[];
          plan?: 'free' | 'plus' | 'pro';
          student_id?: string | null;
          teacher_id?: string | null;
          account_type?: AccountType;
          age_group?: string;
          writing_goal?: string;
          writing_experience_score?: number;
          coach_messages_used?: number;
          writings_created?: number;
          vocab_words_saved?: number;
          free_started_at?: string;
          usage_period_started_at?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_subscription_status?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          title?: string;
          level?: number;
          xp?: number;
          streak?: number;
          longest_streak?: number;
          last_writing_date?: string | null;
          daily_word_goal?: number;
          daily_vocab_goal?: number;
          custom_daily_goal?: string;
          active_theme?: string;
          unlocked_themes?: string[];
          plan?: 'free' | 'plus' | 'pro';
          student_id?: string | null;
          teacher_id?: string | null;
          account_type?: AccountType;
          age_group?: string;
          writing_goal?: string;
          writing_experience_score?: number;
          coach_messages_used?: number;
          writings_created?: number;
          vocab_words_saved?: number;
          free_started_at?: string;
          usage_period_started_at?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_subscription_status?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      deleted_accounts: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          username: string;
          account_type: AccountType;
          deleted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          username: string;
          account_type: AccountType;
          deleted_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          username?: string;
          account_type?: AccountType;
          deleted_at?: string;
        };
        Relationships: [];
      };
      teacher_classes: {
        Row: {
          id: string;
          teacher_id: string;
          name: string;
          description: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          name: string;
          description?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          name?: string;
          description?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      teacher_class_students: {
        Row: {
          class_id: string;
          student_id: string;
          created_at: string;
        };
        Insert: {
          class_id: string;
          student_id: string;
          created_at?: string;
        };
        Update: {
          class_id?: string;
          student_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      parent_student_links: {
        Row: {
          id: string;
          parent_id: string;
          student_id: string;
          linked_student_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          parent_id: string;
          student_id: string;
          linked_student_code: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          parent_id?: string;
          student_id?: string;
          linked_student_code?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      writings: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          prompt: string | null;
          category: string;
          status: 'in_progress' | 'submitted' | 'reviewed';
          word_count: number;
          xp_earned: number;
          is_favorite: boolean;
          feedback: string | null;
          strengths: string | null;
          improvements: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          content: string;
          prompt?: string | null;
          category: string;
          status: 'in_progress' | 'submitted' | 'reviewed';
          word_count: number;
          xp_earned?: number;
          is_favorite?: boolean;
          feedback?: string | null;
          strengths?: string | null;
          improvements?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content?: string;
          prompt?: string | null;
          category?: string;
          status?: 'in_progress' | 'submitted' | 'reviewed';
          word_count?: number;
          xp_earned?: number;
          is_favorite?: boolean;
          feedback?: string | null;
          strengths?: string | null;
          improvements?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vocab_words: {
        Row: {
          id: string;
          user_id: string;
          word: string;
          meaning: string;
          example_sentence: string;
          times_used: number;
          times_to_master: number;
          mastered: boolean;
          source_writing_id: string | null;
          /** The sentence the user wrote when practising this word */
          user_sentence: string | null;
          /** AI feedback stored as JSON after sentence check */
          sentence_feedback: {
            correct: boolean;
            strengths: string;
            improvements: string;
            summary: string;
            suggestion: string;
          } | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          word: string;
          meaning: string;
          example_sentence: string;
          times_used?: number;
          times_to_master?: number;
          mastered?: boolean;
          source_writing_id?: string | null;
          user_sentence?: string | null;
          sentence_feedback?: object | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          word?: string;
          meaning?: string;
          example_sentence?: string;
          times_used?: number;
          times_to_master?: number;
          mastered?: boolean;
          source_writing_id?: string | null;
          user_sentence?: string | null;
          sentence_feedback?: object | null;
          created_at?: string;
        };
        Relationships: [];
      };
      vocab_tests: {
        Row: {
          id: string;
          user_id: string;
          score: number;
          total_questions: number;
          xp_earned: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          score: number;
          total_questions: number;
          xp_earned?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          score?: number;
          total_questions?: number;
          xp_earned?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      daily_stats: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          words_written: number;
          vocab_words_used: number;
          vocab_words_learned: number;
          writings_completed: number;
          xp_earned: number;
          custom_goal_completed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          words_written?: number;
          vocab_words_used?: number;
          vocab_words_learned?: number;
          writings_completed?: number;
          xp_earned?: number;
          custom_goal_completed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          words_written?: number;
          vocab_words_used?: number;
          vocab_words_learned?: number;
          writings_completed?: number;
          xp_earned?: number;
          custom_goal_completed?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      xp_log: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          reason?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      writing_prompts: {
        Row: {
          id: string;
          prompt_text: string;
          category: string;
          difficulty: 'beginner' | 'intermediate' | 'advanced';
          created_at: string;
        };
        Insert: {
          id?: string;
          prompt_text: string;
          category: string;
          difficulty: 'beginner' | 'intermediate' | 'advanced';
          created_at?: string;
        };
        Update: {
          id?: string;
          prompt_text?: string;
          category?: string;
          difficulty?: 'beginner' | 'intermediate' | 'advanced';
          created_at?: string;
        };
        Relationships: [];
      };
      coach_conversations: {
        Row: {
          id: string;
          user_id: string;
          mode: 'thinking' | 'creative';
          trainer_type: string;
          messages: CoachMessage[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mode: 'thinking' | 'creative';
          trainer_type: string;
          messages: CoachMessage[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mode?: 'thinking' | 'creative';
          trainer_type?: string;
          messages?: CoachMessage[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
  };
};

export type Profile       = Database['public']['Tables']['profiles']['Row'];
export type Writing       = Database['public']['Tables']['writings']['Row'];
export type VocabWord     = Database['public']['Tables']['vocab_words']['Row'];
export type VocabTest     = Database['public']['Tables']['vocab_tests']['Row'];
export type DailyStats    = Database['public']['Tables']['daily_stats']['Row'];
export type WritingPrompt = Database['public']['Tables']['writing_prompts']['Row'];

// --- Level / XP helpers ---
// Max level 30. Starts at 50 XP per level, increases by 25 XP each level.
// Level 1→2: 50, Level 2→3: 75, Level 3→4: 100, ... Level 29→30: 775
// Cumulative thresholds:
const LEVEL_XP = [
  0,      // Level 1
  50,     // Level 2   (+50)
  125,    // Level 3   (+75)
  225,    // Level 4   (+100)
  350,    // Level 5   (+125)
  500,    // Level 6   (+150)
  675,    // Level 7   (+175)
  875,    // Level 8   (+200)
  1100,   // Level 9   (+225)
  1350,   // Level 10  (+250)
  1625,   // Level 11  (+275)
  1925,   // Level 12  (+300)
  2250,   // Level 13  (+325)
  2600,   // Level 14  (+350)
  2975,   // Level 15  (+375)
  3375,   // Level 16  (+400)
  3800,   // Level 17  (+425)
  4250,   // Level 18  (+450)
  4725,   // Level 19  (+475)
  5225,   // Level 20  (+500)
  5750,   // Level 21  (+525)
  6300,   // Level 22  (+550)
  6875,   // Level 23  (+575)
  7475,   // Level 24  (+600)
  8100,   // Level 25  (+625)
  8750,   // Level 26  (+650)
  9425,   // Level 27  (+675)
  10125,  // Level 28  (+700)
  10850,  // Level 29  (+725)
  11600,  // Level 30  (+750)
];

const MAX_LEVEL = 30;

export function getLevelFromXP(xp: number): number {
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP[i]) return Math.min(i + 1, MAX_LEVEL);
  }
  return 1;
}

export function getXPProgress(xp: number) {
  const level = getLevelFromXP(xp);
  const current  = LEVEL_XP[level - 1] ?? 0;
  const next     = level >= MAX_LEVEL ? LEVEL_XP[MAX_LEVEL - 1] : (LEVEL_XP[level] ?? current + 50);
  const isMax    = level >= MAX_LEVEL;
  return {
    current:  isMax ? 1 : xp - current,
    needed:   isMax ? 1 : next - current,
    percent:  isMax ? 100 : Math.min(((xp - current) / (next - current)) * 100, 100),
    level,
  };
}

// 15 titles, unlocked every 2 levels (2, 4, 6, … 30). Default title at level 1.
const TITLES: [number, string][] = [
  [30, 'Legendary Penman'],
  [28, 'Grand Narrator'],
  [26, 'Wordsmith Elite'],
  [24, 'Literary Artisan'],
  [22, 'Master Storyteller'],
  [20, 'Seasoned Author'],
  [18, 'Voice Finder'],
  [16, 'Chapter Architect'],
  [14, 'Prose Sculptor'],
  [12, 'Narrative Builder'],
  [10, 'Paragraph Crafter'],
  [8,  'Word Weaver'],
  [6,  'Story Seeker'],
  [4,  'Budding Scribe'],
  [2,  'Keen Observer'],
];

export function getTitleForLevel(level: number): string {
  for (const [minLevel, title] of TITLES) {
    if (level >= minLevel) return title;
  }
  return 'Novice Writer';
}

export { LEVEL_XP, TITLES, MAX_LEVEL };
